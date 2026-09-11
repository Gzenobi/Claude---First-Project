/* ==========================================================================
   export.js — Export datasets to XLSX / CSV / JSON using SheetJS.
   Exposes window.CRM.Export.
   ========================================================================== */
(function (global) {
  'use strict';

  var CRM = global.CRM = global.CRM || {};

  var EXPORT_COLUMNS = {
    clients: ['id', 'nombre', 'segmento', 'planta', 'ciudad', 'pais', 'contacto', 'email', 'telefono', 'competidor', 'potencialAnual', 'observaciones', 'origenUsuario', 'createdAt', 'updatedAt'],
    projects: ['id', 'clienteId', 'nombreProyecto', 'segmento', 'coatingSystem', 'estado', 'valor', 'probabilidad', 'fechaCierre', 'responsable', 'competidor', 'notasTecnicas', 'origenUsuario', 'createdAt', 'updatedAt'],
    activities: ['id', 'tipo', 'clienteId', 'proyectoId', 'titulo', 'descripcion', 'fecha', 'responsable', 'estado', 'origenUsuario', 'createdAt', 'updatedAt']
  };

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function ownerFallback(record) {
    if (record.origenUsuario) return record.origenUsuario;
    var user = CRM.Users.getCurrentUser();
    return (user && user.name) || 'Sin asignar';
  }

  function toRows(storeName, records) {
    var cols = EXPORT_COLUMNS[storeName];
    return records.map(function (r) {
      var row = {};
      cols.forEach(function (c) {
        row[c] = c === 'origenUsuario' ? ownerFallback(r) : (r[c] !== undefined && r[c] !== null ? r[c] : '');
      });
      return row;
    });
  }

  function filterMine(storeName, records) {
    var user = CRM.Users.getCurrentUser();
    var name = user && user.name;
    if (!name) return records;
    return records.filter(function (r) { return ownerFallback(r) === name; });
  }

  function exportAllToXLSX(opts) {
    opts = opts || {};
    return Promise.all(CRM.Storage.STORES.map(CRM.Storage.getAll)).then(function (results) {
      var wb = XLSX.utils.book_new();
      var sheetNames = { clients: 'Clientes', projects: 'Proyectos', activities: 'Actividades' };
      CRM.Storage.STORES.forEach(function (storeName, idx) {
        var records = opts.onlyMine ? filterMine(storeName, results[idx]) : results[idx];
        var ws = XLSX.utils.json_to_sheet(toRows(storeName, records));
        XLSX.utils.book_append_sheet(wb, ws, sheetNames[storeName]);
      });
      var user = CRM.Users.getCurrentUser();
      var suffix = opts.onlyMine && user ? ('_' + user.name.replace(/\s+/g, '_').toLowerCase()) : '';
      var filename = 'akzonobel_crm_export' + suffix + '_' + new Date().toISOString().slice(0, 10) + '.xlsx';
      XLSX.writeFile(wb, filename);
      return filename;
    });
  }

  function exportStoreToCSV(storeName) {
    return CRM.Storage.getAll(storeName).then(function (records) {
      var ws = XLSX.utils.json_to_sheet(toRows(storeName, records));
      var csv = XLSX.utils.sheet_to_csv(ws);
      var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      var filename = storeName + '_' + new Date().toISOString().slice(0, 10) + '.csv';
      downloadBlob(blob, filename);
      return filename;
    });
  }

  function exportAllToJSON(opts) {
    opts = opts || {};
    return CRM.Storage.exportFullSnapshot().then(function (snapshot) {
      var user = CRM.Users.getCurrentUser();
      CRM.Storage.STORES.forEach(function (storeName) {
        snapshot[storeName].forEach(function (r) { r.origenUsuario = ownerFallback(r); });
        if (opts.onlyMine) snapshot[storeName] = filterMine(storeName, snapshot[storeName]);
      });
      snapshot.exportedBy = user ? user.name : null;
      snapshot.exportedByRole = user ? user.role : null;
      var blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
      var suffix = opts.onlyMine && user ? ('_' + user.name.replace(/\s+/g, '_').toLowerCase()) : '';
      var filename = 'akzonobel_crm_backup' + suffix + '_' + new Date().toISOString().slice(0, 10) + '.json';
      downloadBlob(blob, filename);
      return filename;
    });
  }

  CRM.Export = {
    exportAllToXLSX: exportAllToXLSX,
    exportStoreToCSV: exportStoreToCSV,
    exportAllToJSON: exportAllToJSON,
    EXPORT_COLUMNS: EXPORT_COLUMNS
  };

})(window);
