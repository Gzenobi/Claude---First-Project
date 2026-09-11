/* ==========================================================================
   export.js — Export datasets to XLSX / CSV / JSON using SheetJS.
   Exposes window.CRM.Export.
   ========================================================================== */
(function (global) {
  'use strict';

  var CRM = global.CRM = global.CRM || {};

  var EXPORT_COLUMNS = {
    clients: ['id', 'nombre', 'segmento', 'planta', 'ciudad', 'pais', 'contacto', 'email', 'telefono', 'competidor', 'potencialAnual', 'observaciones', 'createdAt', 'updatedAt'],
    projects: ['id', 'clienteId', 'nombreProyecto', 'segmento', 'coatingSystem', 'estado', 'valor', 'probabilidad', 'fechaCierre', 'responsable', 'competidor', 'notasTecnicas', 'createdAt', 'updatedAt'],
    activities: ['id', 'tipo', 'clienteId', 'proyectoId', 'titulo', 'descripcion', 'fecha', 'responsable', 'estado', 'createdAt', 'updatedAt']
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

  function toRows(storeName, records) {
    var cols = EXPORT_COLUMNS[storeName];
    return records.map(function (r) {
      var row = {};
      cols.forEach(function (c) { row[c] = r[c] !== undefined && r[c] !== null ? r[c] : ''; });
      return row;
    });
  }

  function exportAllToXLSX() {
    return Promise.all(CRM.Storage.STORES.map(CRM.Storage.getAll)).then(function (results) {
      var wb = XLSX.utils.book_new();
      var sheetNames = { clients: 'Clientes', projects: 'Proyectos', activities: 'Actividades' };
      CRM.Storage.STORES.forEach(function (storeName, idx) {
        var ws = XLSX.utils.json_to_sheet(toRows(storeName, results[idx]));
        XLSX.utils.book_append_sheet(wb, ws, sheetNames[storeName]);
      });
      var filename = 'akzonobel_crm_export_' + new Date().toISOString().slice(0, 10) + '.xlsx';
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

  function exportAllToJSON() {
    return CRM.Storage.exportFullSnapshot().then(function (snapshot) {
      var blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
      var filename = 'akzonobel_crm_backup_' + new Date().toISOString().slice(0, 10) + '.json';
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
