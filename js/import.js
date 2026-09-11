/* ==========================================================================
   import.js — Import datasets from XLSX / CSV / JSON with automatic merge,
   update-by-ID and basic duplicate detection. Exposes window.CRM.Import.
   ========================================================================== */
(function (global) {
  'use strict';

  var CRM = global.CRM = global.CRM || {};

  var NATURAL_KEY = {
    clients: function (r) { return ((r.email || r.nombre || '') + '').toLowerCase().trim(); },
    projects: function (r) { return ((r.clienteId || '') + '::' + (r.nombreProyecto || '')).toLowerCase().trim(); },
    activities: function (r) { return ((r.titulo || '') + '::' + (r.fecha || '')).toLowerCase().trim(); }
  };

  var NUMERIC_FIELDS = {
    clients: ['potencialAnual'],
    projects: ['valor', 'probabilidad'],
    activities: []
  };

  function coerceRecord(storeName, raw) {
    var record = Object.assign({}, raw);
    (NUMERIC_FIELDS[storeName] || []).forEach(function (f) {
      if (record[f] !== undefined && record[f] !== '') record[f] = Number(record[f]);
    });
    if (!record.id) record.id = CRM.UI.generateId();
    return record;
  }

  /**
   * Merge incoming rows into existing dataset.
   * Returns { toPut: [...], added, updated, skipped }
   */
  function mergeRecords(storeName, existing, incoming) {
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
      var row = coerceRecord(storeName, rawRow);
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

  function applyMergeToStore(storeName, incomingRows) {
    return CRM.Storage.getAll(storeName).then(function (existing) {
      var result = mergeRecords(storeName, existing, incomingRows);
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
      var stores = ['clients', 'projects', 'activities'];
      return stores.reduce(function (chain, storeName) {
        return chain.then(function (acc) {
          var rows = snapshot[storeName] || (snapshot.data ? snapshot.data[storeName] : null) || [];
          return applyMergeToStore(storeName, rows).then(function (result) {
            acc[storeName] = result;
            return acc;
          });
        });
      }, Promise.resolve({}));
    });
  }

  var SHEET_TO_STORE = { 'Clientes': 'clients', 'Proyectos': 'projects', 'Actividades': 'activities', 'clients': 'clients', 'projects': 'projects', 'activities': 'activities' };

  function importXLSXFile(file) {
    return readFileAsArrayBuffer(file).then(function (buffer) {
      var wb = XLSX.read(buffer, { type: 'array' });
      var stores = Object.keys(SHEET_TO_STORE);
      var summary = {};
      var chain = Promise.resolve();
      wb.SheetNames.forEach(function (sheetName) {
        var storeName = SHEET_TO_STORE[sheetName];
        if (!storeName) return;
        var rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
        chain = chain.then(function () {
          return applyMergeToStore(storeName, rows).then(function (result) { summary[storeName] = result; });
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
      return applyMergeToStore(storeName, rows).then(function (result) {
        var summary = {};
        summary[storeName] = result;
        return summary;
      });
    });
  }

  CRM.Import = {
    importJSONFile: importJSONFile,
    importXLSXFile: importXLSXFile,
    importCSVFile: importCSVFile,
    mergeRecords: mergeRecords
  };

})(window);
