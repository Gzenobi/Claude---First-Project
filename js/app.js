/* ==========================================================================
   app.js — Application bootstrap: shell (sidebar/topbar), seeding, route
   registration and global wiring. Exposes window.CRM.App.
   ========================================================================== */
(function (global) {
  'use strict';

  var CRM = global.CRM = global.CRM || {};
  var UI = CRM.UI;

  var NAV_ITEMS = [
    { route: 'dashboard', label: 'Dashboard', subtitle: 'Resumen ejecutivo comercial', icon: 'layout-dashboard' },
    { route: 'clientes', label: 'Clientes', subtitle: 'Cuentas industriales', icon: 'building-2' },
    { route: 'proyectos', label: 'Proyectos', subtitle: 'Pipeline comercial', icon: 'briefcase' },
    { route: 'actividades', label: 'Actividades', subtitle: 'Tracking comercial', icon: 'calendar-clock' },
    { route: 'configuracion', label: 'Datos y backup', subtitle: 'Exportar, importar y respaldar', icon: 'database' }
  ];

  var CURRENT_USER = { name: 'Gabriel Zenobi', role: 'Ejecutivo comercial · Cono Sur', initials: 'GZ' };

  function buildShell() {
    var root = document.getElementById('app-root');
    var collapsed = CRM.Storage.getConfig('sidebarCollapsed', false);

    root.innerHTML =
      '<div class="app-shell' + (collapsed ? ' sidebar-collapsed' : '') + '">' +
        '<div class="sidebar-scrim"></div>' +
        '<aside class="sidebar">' +
          '<div class="sidebar-brand">' +
            '<img src="assets/akzonobel-white.svg" alt="AkzoNobel">' +
            '<div class="brand-text">Industrial Coatings<small>CRM comercial</small></div>' +
          '</div>' +
          '<nav class="sidebar-nav" id="sidebar-nav"></nav>' +
          '<div class="sidebar-footer">AkzoNobel CRM v1.0<br>100% local · sin servidor</div>' +
        '</aside>' +
        '<div class="main-col">' +
          '<header class="topbar">' +
            '<button class="topbar-toggle" id="btn-toggle-sidebar" aria-label="Menú">' + UI.icon('menu') + '</button>' +
            '<div><div class="topbar-title">AkzoNobel CRM</div><div class="topbar-subtitle"></div></div>' +
            '<div class="topbar-search"><input type="search" id="global-search" placeholder="Buscar cliente y presionar Enter...">' + UI.icon('search') + '</div>' +
            '<div class="topbar-actions">' +
              '<button class="icon-btn" id="btn-export-quick" title="Exportar datos">' + UI.icon('download') + '</button>' +
              '<div class="topbar-user"><div class="avatar">' + CURRENT_USER.initials + '</div><div class="user-meta"><strong>' + CURRENT_USER.name + '</strong><span>' + CURRENT_USER.role + '</span></div></div>' +
            '</div>' +
          '</header>' +
          '<main class="content" id="app-content"></main>' +
        '</div>' +
      '</div>';

    var navEl = document.getElementById('sidebar-nav');
    navEl.innerHTML = NAV_ITEMS.map(function (item) {
      return '<a href="#/' + item.route + '" class="nav-item" data-route="' + item.route + '" data-label="' + item.label + '" data-subtitle="' + item.subtitle + '">' +
        UI.icon(item.icon) + '<span>' + item.label + '</span></a>';
    }).join('');

    UI.refreshIcons();
    wireShellEvents();
  }

  function wireShellEvents() {
    var shell = document.querySelector('.app-shell');
    document.getElementById('btn-toggle-sidebar').addEventListener('click', function () {
      if (global.innerWidth <= 980) {
        shell.classList.toggle('sidebar-mobile-open');
      } else {
        var collapsed = shell.classList.toggle('sidebar-collapsed');
        CRM.Storage.setConfig('sidebarCollapsed', collapsed);
      }
    });
    var scrim = document.querySelector('.sidebar-scrim');
    if (scrim) scrim.addEventListener('click', function () { shell.classList.remove('sidebar-mobile-open'); });

    document.getElementById('btn-export-quick').addEventListener('click', function () {
      CRM.Export.exportAllToXLSX().then(function () { UI.toast('Exportación XLSX generada', 'success'); })
        .catch(function () { UI.toast('No se pudo exportar', 'error'); });
    });

    document.getElementById('global-search').addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var term = e.target.value.trim();
      CRM.Clients.state.search = term;
      CRM.Clients.state.page = 1;
      CRM.Router.navigate('clientes');
    });
  }

  /* ---------------- Configuración / Datos y backup view ---------------- */
  function renderSettingsView(container) {
    var backupInfo = CRM.Storage.getBackupInfo();
    container.innerHTML =
      '<div class="view-header"><div><h1>Datos y backup</h1><p>Exporta, importa y respalda la información comercial almacenada localmente</p></div></div>' +
      '<div class="charts-grid">' +
        '<div class="panel"><div class="panel-header"><h3>' + UI.icon('download') + ' Exportar datos</h3></div><div class="panel-body">' +
          '<p class="text-muted mb-16">Descarga toda la información del CRM en el formato que necesites.</p>' +
          '<div class="flex gap-12" style="flex-wrap:wrap">' +
            '<button class="btn btn-primary" id="btn-export-xlsx">' + UI.icon('file-spreadsheet') + 'Exportar XLSX</button>' +
            '<button class="btn btn-secondary" id="btn-export-json">' + UI.icon('file-json') + 'Exportar JSON</button>' +
          '</div>' +
          '<p class="text-muted mt-16" style="font-size:12px">Exportar CSV por módulo:</p>' +
          '<div class="flex gap-12" style="flex-wrap:wrap">' +
            '<button class="btn btn-outline btn-sm" data-csv="clients">Clientes.csv</button>' +
            '<button class="btn btn-outline btn-sm" data-csv="projects">Proyectos.csv</button>' +
            '<button class="btn btn-outline btn-sm" data-csv="activities">Actividades.csv</button>' +
          '</div>' +
        '</div></div>' +
        '<div class="panel"><div class="panel-header"><h3>' + UI.icon('upload') + ' Importar datos</h3></div><div class="panel-body">' +
          '<p class="text-muted mb-16">Importa un archivo XLSX o JSON exportado previamente. Los registros se combinan automáticamente por ID; si no existe, se detectan duplicados por nombre/email y se actualizan.</p>' +
          '<input type="file" id="import-file" accept=".xlsx,.json,.csv" class="hidden">' +
          '<button class="btn btn-primary" id="btn-import-trigger">' + UI.icon('upload') + 'Seleccionar archivo</button>' +
          '<div id="import-summary" class="mt-16"></div>' +
        '</div></div>' +
      '</div>' +
      '<div class="panel"><div class="panel-header"><h3>' + UI.icon('shield-check') + ' Backup automático</h3></div><div class="panel-body">' +
        '<p class="text-muted">Cada cambio se respalda automáticamente en el almacenamiento local del navegador.</p>' +
        '<p><strong>Último backup:</strong> ' + (backupInfo ? UI.formatDateTime(backupInfo.savedAt) + ' (versión de esquema ' + backupInfo.version + ')' : 'Aún no se ha generado un backup') + '</p>' +
        '<button class="btn btn-outline btn-sm" id="btn-restore-backup">' + UI.icon('rotate-ccw') + 'Restaurar último backup</button>' +
      '</div></div>';

    UI.refreshIcons();

    document.getElementById('btn-export-xlsx').addEventListener('click', function () {
      CRM.Export.exportAllToXLSX().then(function () { UI.toast('Archivo XLSX descargado', 'success'); });
    });
    document.getElementById('btn-export-json').addEventListener('click', function () {
      CRM.Export.exportAllToJSON().then(function () { UI.toast('Archivo JSON descargado', 'success'); });
    });
    container.querySelectorAll('[data-csv]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        CRM.Export.exportStoreToCSV(btn.getAttribute('data-csv')).then(function () { UI.toast('CSV descargado', 'success'); });
      });
    });

    var fileInput = document.getElementById('import-file');
    document.getElementById('btn-import-trigger').addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      var file = fileInput.files[0];
      if (!file) return;
      var summaryEl = document.getElementById('import-summary');
      summaryEl.innerHTML = UI.loadingStateHTML('Importando datos...');
      var ext = file.name.split('.').pop().toLowerCase();
      var task = ext === 'json' ? CRM.Import.importJSONFile(file) : CRM.Import.importXLSXFile(file);
      task.then(function (summary) {
        var html = '<div class="panel" style="border-color:var(--akzo-sky)"><div class="panel-body">';
        Object.keys(summary).forEach(function (storeName) {
          var r = summary[storeName];
          html += '<p><strong>' + storeName + ':</strong> ' + r.added + ' agregados, ' + r.updated + ' actualizados' + (r.skipped ? (', ' + r.skipped + ' omitidos') : '') + '</p>';
        });
        html += '</div></div>';
        summaryEl.innerHTML = html;
        UI.toast('Importación completada correctamente', 'success');
        fileInput.value = '';
      }).catch(function (err) {
        console.error(err);
        summaryEl.innerHTML = '<p style="color:var(--akzo-fuchsia)">No se pudo importar el archivo. Verifica el formato.</p>';
        UI.toast('Error al importar el archivo', 'error');
      });
    });

    document.getElementById('btn-restore-backup').addEventListener('click', function () {
      UI.confirmDialog({ title: 'Restaurar backup', message: 'Esto reemplazará los datos actuales por el último backup guardado localmente. ¿Continuar?', confirmText: 'Restaurar', danger: true })
        .then(function (ok) {
          if (!ok) return;
          CRM.Storage.restoreFromLocalStorage().then(function () {
            UI.toast('Backup restaurado correctamente', 'success');
            CRM.Router.refresh();
          }).catch(function () { UI.toast('No hay backup disponible para restaurar', 'error'); });
        });
    });
  }

  /* ---------------- Seeding ---------------- */
  function seedIfEmpty() {
    return CRM.Storage.count('clients').then(function (n) {
      if (n > 0) return false;
      var data = CRM.MockData.generateAll();
      return Promise.all([
        CRM.Storage.bulkPut('clients', data.clients),
        CRM.Storage.bulkPut('projects', data.projects),
        CRM.Storage.bulkPut('activities', data.activities)
      ]).then(function () { return true; });
    });
  }

  /* ---------------- Bootstrap ---------------- */
  function init() {
    buildShell();
    CRM.Router.register('dashboard', CRM.Dashboard.render);
    CRM.Router.register('clientes', CRM.Clients.render);
    CRM.Router.register('proyectos', CRM.Projects.render);
    CRM.Router.register('actividades', CRM.Activities.render);
    CRM.Router.register('configuracion', renderSettingsView);

    CRM.Storage.init()
      .then(seedIfEmpty)
      .then(function (seeded) {
        if (seeded) UI.toast('Datos de ejemplo cargados', 'info');
        CRM.Router.init(document.getElementById('app-content'));
      })
      .catch(function (err) {
        console.error(err);
        document.getElementById('app-content').innerHTML =
          '<div class="panel panel-body"><h3>No se pudo inicializar el almacenamiento local</h3><p class="text-muted">Verifica que tu navegador soporte IndexedDB y que no estés en modo de navegación privada restrictivo.</p></div>';
      });
  }

  CRM.App = { init: init };
  document.addEventListener('DOMContentLoaded', init);

})(window);
