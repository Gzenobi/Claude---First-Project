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
    { route: 'equipo', label: 'Equipo', subtitle: 'Consolidado de todos los vendedores', icon: 'users', adminOnly: true },
    { route: 'configuracion', label: 'Datos y backup', subtitle: 'Exportar, importar y respaldar', icon: 'database' }
  ];

  function initials(name) {
    return (name || '?').trim().split(/\s+/).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase();
  }

  function buildShell() {
    var root = document.getElementById('app-root');
    var collapsed = CRM.Storage.getConfig('sidebarCollapsed', false);
    var user = CRM.Users.getCurrentUser() || { name: 'Invitado', role: 'Vendedor' };
    var isAdmin = CRM.Users.isAdmin();

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
              (isAdmin ? '<div id="scope-chip"></div>' : '') +
              '<button class="icon-btn" id="btn-export-quick" title="Exportar datos">' + UI.icon('download') + '</button>' +
              '<div class="topbar-user" id="topbar-user-menu" title="Cambiar de usuario">' +
                '<div class="avatar">' + initials(user.name) + '</div>' +
                '<div class="user-meta"><strong>' + UI.escapeHtml(user.name) + '</strong><span>' + UI.escapeHtml(user.role) + (user.role === 'Administrador' ? '' : ' · Cono Sur') + '</span></div>' +
                '<button class="icon-btn btn-logout" id="btn-switch-user" title="Cambiar de usuario">' + UI.icon('log-out') + '</button>' +
              '</div>' +
            '</div>' +
          '</header>' +
          '<main class="content" id="app-content"></main>' +
        '</div>' +
      '</div>';

    var navEl = document.getElementById('sidebar-nav');
    navEl.innerHTML = NAV_ITEMS.filter(function (item) { return !item.adminOnly || isAdmin; }).map(function (item) {
      return '<a href="#/' + item.route + '" class="nav-item" data-route="' + item.route + '" data-label="' + item.label + '" data-subtitle="' + item.subtitle + '">' +
        UI.icon(item.icon) + '<span>' + item.label + '</span></a>';
    }).join('');

    UI.refreshIcons();
    wireShellEvents();
    if (isAdmin) renderScopeChip();
  }

  function renderScopeChip() {
    var el = document.getElementById('scope-chip');
    if (!el) return;
    var filter = CRM.Users.getActiveFilter();
    if (!filter) { el.innerHTML = ''; return; }
    el.innerHTML = '<span class="scope-chip">' + UI.icon('filter') + 'Viendo solo: <strong>' + UI.escapeHtml(filter) + '</strong>' +
      '<button type="button" id="btn-clear-scope" title="Ver todo el equipo">' + UI.icon('x') + '</button></span>';
    UI.refreshIcons();
    document.getElementById('btn-clear-scope').addEventListener('click', function () {
      CRM.Users.setActiveFilter(null);
      renderScopeChip();
      CRM.Router.refresh();
    });
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

    document.getElementById('btn-switch-user').addEventListener('click', function (e) {
      e.stopPropagation();
      UI.confirmDialog({
        title: 'Cambiar de usuario',
        message: 'Vas a cerrar la sesión de este perfil local. La próxima persona que use este computador deberá identificarse de nuevo. Los datos guardados no se borran.',
        confirmText: 'Cambiar de usuario'
      }).then(function (ok) {
        if (!ok) return;
        CRM.Users.clearCurrentUser();
        global.location.hash = '';
        global.location.reload();
      });
    });
  }

  /* ---------------- Configuración / Datos y backup view ---------------- */
  function renderSettingsView(container) {
    var backupInfo = CRM.Storage.getBackupInfo();
    var user = CRM.Users.getCurrentUser();
    var isAdmin = CRM.Users.isAdmin();
    container.innerHTML =
      '<div class="view-header"><div><h1>Datos y backup</h1><p>Exporta tu trabajo para enviarlo al administrador, o respalda tu información local</p></div></div>' +
      '<div class="panel mb-16"><div class="panel-header"><h3>' + UI.icon('send') + ' Enviar mi trabajo al administrador</h3></div><div class="panel-body">' +
        '<p class="text-muted mb-16">Genera un archivo con <strong>solo tus clientes, proyectos y actividades</strong> (usuario: ' + UI.escapeHtml(user ? user.name : '—') + ') y envíaselo por email al administrador. Él lo sube en la sección "Equipo" para consolidar los datos de todo el equipo.</p>' +
        '<div class="flex gap-12" style="flex-wrap:wrap">' +
          '<button class="btn btn-primary" id="btn-export-mine-xlsx">' + UI.icon('file-spreadsheet') + 'Exportar mi trabajo (XLSX)</button>' +
          '<button class="btn btn-secondary" id="btn-export-mine-json">' + UI.icon('file-json') + 'Exportar mi trabajo (JSON)</button>' +
        '</div>' +
      '</div></div>' +
      '<div class="charts-grid">' +
        '<div class="panel"><div class="panel-header"><h3>' + UI.icon('download') + ' Exportar todo</h3></div><div class="panel-body">' +
          '<p class="text-muted mb-16">Descarga toda la información visible en este computador (incluye datos de ejemplo y, si eres administrador, de todo el equipo consolidado).</p>' +
          '<div class="flex gap-12" style="flex-wrap:wrap">' +
            '<button class="btn btn-secondary" id="btn-export-xlsx">' + UI.icon('file-spreadsheet') + 'Exportar XLSX</button>' +
            '<button class="btn btn-secondary" id="btn-export-json">' + UI.icon('file-json') + 'Exportar JSON</button>' +
          '</div>' +
          '<p class="text-muted mt-16" style="font-size:12px">Exportar CSV por módulo:</p>' +
          '<div class="flex gap-12" style="flex-wrap:wrap">' +
            '<button class="btn btn-outline btn-sm" data-csv="clients">Clientes.csv</button>' +
            '<button class="btn btn-outline btn-sm" data-csv="projects">Proyectos.csv</button>' +
            '<button class="btn btn-outline btn-sm" data-csv="activities">Actividades.csv</button>' +
          '</div>' +
        '</div></div>' +
        '<div class="panel"><div class="panel-header"><h3>' + UI.icon('upload') + ' Importar / restaurar</h3></div><div class="panel-body">' +
          '<p class="text-muted mb-16">Importa uno o varios archivos XLSX/JSON exportados previamente. Los registros se combinan por ID; si no existe, se detectan duplicados por nombre/email y se actualizan — nunca se duplican.' +
          (isAdmin ? ' Para consolidar el trabajo de todo el equipo con estadísticas por vendedor, usa la sección <a href="#/equipo">Equipo</a>.' : '') + '</p>' +
          '<input type="file" id="import-file" accept=".xlsx,.json,.csv" class="hidden" multiple>' +
          '<button class="btn btn-primary" id="btn-import-trigger">' + UI.icon('upload') + 'Seleccionar archivo(s)</button>' +
          '<div id="import-summary" class="mt-16"></div>' +
        '</div></div>' +
      '</div>' +
      '<div class="panel"><div class="panel-header"><h3>' + UI.icon('shield-check') + ' Backup automático</h3></div><div class="panel-body">' +
        '<p class="text-muted">Cada cambio se respalda automáticamente en el almacenamiento local del navegador.</p>' +
        '<p><strong>Último backup:</strong> ' + (backupInfo ? UI.formatDateTime(backupInfo.savedAt) + ' (versión de esquema ' + backupInfo.version + ')' : 'Aún no se ha generado un backup') + '</p>' +
        '<button class="btn btn-outline btn-sm" id="btn-restore-backup">' + UI.icon('rotate-ccw') + 'Restaurar último backup</button>' +
      '</div></div>';

    UI.refreshIcons();

    document.getElementById('btn-export-mine-xlsx').addEventListener('click', function () {
      CRM.Export.exportAllToXLSX({ onlyMine: true }).then(function () { UI.toast('Tu archivo XLSX fue descargado — ya puedes enviarlo por email', 'success'); });
    });
    document.getElementById('btn-export-mine-json').addEventListener('click', function () {
      CRM.Export.exportAllToJSON({ onlyMine: true }).then(function () { UI.toast('Tu archivo JSON fue descargado — ya puedes enviarlo por email', 'success'); });
    });
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
      if (!fileInput.files.length) return;
      var summaryEl = document.getElementById('import-summary');
      summaryEl.innerHTML = UI.loadingStateHTML('Importando datos...');
      CRM.Import.importFiles(fileInput.files).then(function (result) {
        summaryEl.innerHTML = UI.renderImportSummaryHTML(result);
        UI.refreshIcons();
        var failed = result.perFile.filter(function (f) { return !f.ok; }).length;
        UI.toast(failed ? ('Importación completada con ' + failed + ' archivo(s) con error') : 'Importación completada correctamente', failed ? 'warning' : 'success');
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
      [data.clients, data.projects, data.activities].forEach(function (list) {
        list.forEach(function (r) { r.origenUsuario = CRM.Users.SEED_LABEL; });
      });
      return Promise.all([
        CRM.Storage.bulkPut('clients', data.clients),
        CRM.Storage.bulkPut('projects', data.projects),
        CRM.Storage.bulkPut('activities', data.activities)
      ]).then(function () { return true; });
    });
  }

  /* ---------------- Bootstrap ---------------- */
  function startApp() {
    buildShell();
    CRM.Router.register('dashboard', CRM.Dashboard.render);
    CRM.Router.register('clientes', CRM.Clients.render);
    CRM.Router.register('proyectos', CRM.Projects.render);
    CRM.Router.register('actividades', CRM.Activities.render);
    CRM.Router.register('equipo', CRM.Team.render);
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

  function init() {
    var root = document.getElementById('app-root');
    var user = CRM.Users.getCurrentUser();
    if (!user) {
      CRM.Users.renderLoginScreen(root, function () { startApp(); });
      return;
    }
    startApp();
  }

  CRM.App = { init: init, renderScopeChip: renderScopeChip };
  document.addEventListener('DOMContentLoaded', init);

})(window);
