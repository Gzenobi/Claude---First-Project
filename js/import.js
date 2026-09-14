/* ==========================================================================
   import.js — Import datasets from XLSX / CSV / JSON with automatic merge,
   update-by-ID and basic duplicate detection. Soporta importar varios
   archivos a la vez (consolidación de equipo). Exposes window.CRM.Import.
   ========================================================================== */
(function (global) {
  'use strict';

  var CRM = global.CRM = global.CRM || {};

  var NATURAL_KEY = {
    clients: function (r) { return ((r.email || r.nombre || '') + '').toLowerCase().trim(); },
    projects: function (r) { return ((r.clienteId || '') + '::' + (r.nombreProyecto || '')).toLowerCase().trim(); },
    activities: function (r) { return ((r.titulo || '') + '::' + (r.fecha || '')).toLowerCase().trim(); },
    materials: function (r) { return ((r.codigo || r.nombre || '') + '').toLowerCase().trim(); }
  };

  var NUMERIC_FIELDS = {
    clients: ['potencialAnual'],
    projects: ['valor', 'volumenLitros', 'probabilidad'],
    activities: [],
    materials: ['precioUnitario', 'stock']
  };

  function labelFromFilename(filename) {
    return (filename || 'archivo').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Archivo importado';
  }

  function coerceRecord(storeName, raw, fallbackOwner) {
    var record = Object.assign({}, raw);
    (NUMERIC_FIELDS[storeName] || []).forEach(function (f) {
      if (record[f] !== undefined && record[f] !== '') record[f] = Number(record[f]);
    });
    if (!record.id) record.id = CRM.UI.generateId();
    if (!record.origenUsuario && fallbackOwner) record.origenUsuario = fallbackOwner;
    return record;
  }

  /**
   * Merge incoming rows into existing dataset.
   * Returns { toPut: [...], added, updated, skipped }
   */
  function mergeRecords(storeName, existing, incoming, fallbackOwner) {
    var byId = {};
    var byKey = {};
    var keyFn = NATURAL_KEY[storeName];
    existing.forEach(function (r) {
      byId[r.id] = r;
      var k = keyFn(r);
      if (k) byKey[k] = r;
    });

    var toPut = [];
    var added = 0, updated = 0, skipped = 0;
    var now = new Date().toISOString();

    incoming.forEach(function (rawRow) {
      if (!rawRow || Object.keys(rawRow).length === 0) { skipped++; return; }
      var row = coerceRecord(storeName, rawRow, fallbackOwner);
      var target = row.id && byId[row.id] ? byId[row.id] : null;
      if (!target) {
        var key = keyFn(row);
        if (key && byKey[key]) target = byKey[key];
      }
      if (target) {
        var merged = Object.assign({}, target, row, { id: target.id, createdAt: target.createdAt || now, updatedAt: now });
        toPut.push(merged);
        byId[merged.id] = merged;
        updated++;
      } else {
        var fresh = Object.assign({}, row, { createdAt: row.createdAt || now, updatedAt: now });
        toPut.push(fresh);
        byId[fresh.id] = fresh;
        var k2 = keyFn(fresh);
        if (k2) byKey[k2] = fresh;
        added++;
      }
    });

    return { toPut: toPut, added: added, updated: updated, skipped: skipped };
  }

  function applyMergeToStore(storeName, incomingRows, fallbackOwner) {
    return CRM.Storage.getAll(storeName).then(function (existing) {
      var result = mergeRecords(storeName, existing, incomingRows, fallbackOwner);
      return CRM.Storage.bulkPut(storeName, result.toPut).then(function () { return result; });
    });
  }

  function readFileAsText(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  function readFileAsArrayBuffer(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  function importJSONFile(file) {
    return readFileAsText(file).then(function (text) {
      var snapshot = JSON.parse(text);
      var fallbackOwner = snapshot.exportedBy || labelFromFilename(file.name);
      var stores = CRM.Storage.STORES;
      return stores.reduce(function (chain, storeName) {
        return chain.then(function (acc) {
          var rows = snapshot[storeName] || (snapshot.data ? snapshot.data[storeName] : null) || [];
          return applyMergeToStore(storeName, rows, fallbackOwner).then(function (result) {
            acc[storeName] = result;
            return acc;
          });
        });
      }, Promise.resolve({}));
    });
  }

  var SHEET_TO_STORE = {
    'Clientes': 'clients', 'Proyectos': 'projects', 'Actividades': 'activities', 'Materiales': 'materials',
    'clients': 'clients', 'projects': 'projects', 'activities': 'activities', 'materials': 'materials'
  };

  function importXLSXFile(file) {
    return readFileAsArrayBuffer(file).then(function (buffer) {
      var wb = XLSX.read(buffer, { type: 'array' });
      var fallbackOwner = labelFromFilename(file.name);
      var summary = {};
      var chain = Promise.resolve();
      wb.SheetNames.forEach(function (sheetName) {
        var storeName = SHEET_TO_STORE[sheetName];
        if (!storeName) return;
        var rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
        chain = chain.then(function () {
          return applyMergeToStore(storeName, rows, fallbackOwner).then(function (result) { summary[storeName] = result; });
        });
      });
      return chain.then(function () { return summary; });
    });
  }

  function importCSVFile(file, storeName) {
    return readFileAsText(file).then(function (text) {
      var wb = XLSX.read(text, { type: 'string' });
      var firstSheet = wb.SheetNames[0];
      var rows = XLSX.utils.sheet_to_json(wb.Sheets[firstSheet], { defval: '' });
      var fallbackOwner = labelFromFilename(file.name);
      return applyMergeToStore(storeName, rows, fallbackOwner).then(function (result) {
        var summary = {};
        summary[storeName] = result;
        return summary;
      });
    });
  }

  function importOneFile(file) {
    var ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'json') return importJSONFile(file);
    if (ext === 'csv') return importCSVFile(file, 'clients');
    return importXLSXFile(file);
  }

  /**
   * Importa varios archivos en secuencia (uno o más vendedores a la vez) y
   * devuelve tanto el resumen combinado por store como el detalle por
   * archivo, útil para la vista de Equipo del administrador.
   */
  function importFiles(fileList) {
    var files = Array.prototype.slice.call(fileList);
    var combined = {};
    CRM.Storage.STORES.forEach(function (name) { combined[name] = { added: 0, updated: 0, skipped: 0 }; });
    var perFile = [];

    return files.reduce(function (chain, file) {
      return chain.then(function () {
        return importOneFile(file).then(function (summary) {
          perFile.push({ filename: file.name, summary: summary, ok: true });
          Object.keys(summary).forEach(function (storeName) {
            if (!combined[storeName]) combined[storeName] = { added: 0, updated: 0, skipped: 0 };
            combined[storeName].added += summary[storeName].added;
            combined[storeName].updated += summary[storeName].updated;
            combined[storeName].skipped += summary[storeName].skipped;
          });
        }).catch(function (err) {
          perFile.push({ filename: file.name, error: err.message || String(err), ok: false });
        });
      });
    }, Promise.resolve()).then(function () {
      return { combined: combined, perFile: perFile };
    });
  }

  /**
   * Importa un archivo hacia un único store, sin depender del nombre de la
   * hoja/columna (usado por el catálogo de Materiales): JSON (array plano,
   * {materials:[...]} o snapshot completo), CSV, o XLSX (toma la primera hoja).
   */
  function importSingleStoreFile(file, storeName) {
    var ext = file.name.split('.').pop().toLowerCase();
    var fallbackOwner = labelFromFilename(file.name);
    if (ext === 'json') {
      return readFileAsText(file).then(function (text) {
        var parsed = JSON.parse(text);
        var rows = Array.isArray(parsed) ? parsed : (parsed[storeName] || (parsed.data ? parsed.data[storeName] : null) || []);
        return applyMergeToStore(storeName, rows, parsed.exportedBy || fallbackOwner);
      });
    }
    if (ext === 'csv') {
      return readFileAsText(file).then(function (text) {
        var wb = XLSX.read(text, { type: 'string' });
        var rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
        return applyMergeToStore(storeName, rows, fallbackOwner);
      });
    }
    return readFileAsArrayBuffer(file).then(function (buffer) {
      var wb = XLSX.read(buffer, { type: 'array' });
      var rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
      return applyMergeToStore(storeName, rows, fallbackOwner);
    });
  }

  CRM.Import = {
    importJSONFile: importJSONFile,
    importXLSXFile: importXLSXFile,
    importCSVFile: importCSVFile,
    importFiles: importFiles,
    importSingleStoreFile: importSingleStoreFile,
    mergeRecords: mergeRecords
  };

})(window);
