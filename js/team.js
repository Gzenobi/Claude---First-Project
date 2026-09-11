/* ==========================================================================
   team.js — Vista "Equipo" (solo Administrador): consolidación de archivos
   enviados por los vendedores + estadísticas por vendedor + filtro global.
   Exposes window.CRM.Team.
   ========================================================================== */
(function (global) {
  'use strict';

  var CRM = global.CRM = global.CRM || {};
  var UI = CRM.UI;
  var lastImportSummaryHTML = '';

  function render(container) {
    if (!CRM.Users.isAdmin()) {
      container.innerHTML = UI.emptyStateHTML({ icon: 'shield-alert', title: 'Solo para administradores', message: 'Esta sección consolida el trabajo de todo el equipo y está disponible únicamente para el rol Administrador.' });
      return Promise.resolve();
    }
    return Promise.all([CRM.Storage.getAll('clients'), CRM.Storage.getAll('projects'), CRM.Storage.getAll('activities')])
      .then(function (results) { renderView(container, results[0], results[1], results[2]); });
  }

  function renderView(container, clients, projects, activities) {
    if (CRM.Router.getCurrentRoute() !== 'equipo') return;
    var contributors = CRM.Users.computeContributors(clients, projects, activities);
    var activeFilter = CRM.Users.getActiveFilter();
    var totalPipeline = contributors.reduce(function (s, c) { return s + c.pipelineValue; }, 0);
    var realContributors = contributors.filter(function (c) { return !c.isSeed; });

    container.innerHTML =
      '<div class="view-header">' +
        '<div><h1>Equipo</h1><p>Consolidado de clientes, proyectos y actividades de todos los vendedores</p></div>' +
      '</div>' +
      '<div class="kpi-grid">' +
        '<div class="kpi-card" style="--kpi-accent:var(--akzo-navy)"><div class="kpi-icon">' + UI.icon('users') + '</div><div class="kpi-value">' + realContributors.length + '</div><div class="kpi-label">Vendedores con datos cargados</div></div>' +
        '<div class="kpi-card" style="--kpi-accent:var(--akzo-sky)"><div class="kpi-icon">' + UI.icon('building-2') + '</div><div class="kpi-value">' + clients.length + '</div><div class="kpi-label">Clientes totales</div></div>' +
        '<div class="kpi-card" style="--kpi-accent:var(--akzo-purple)"><div class="kpi-icon">' + UI.icon('trending-up') + '</div><div class="kpi-value">' + UI.formatCurrency(totalPipeline) + '</div><div class="kpi-label">Pipeline abierto consolidado</div></div>' +
        '<div class="kpi-card" style="--kpi-accent:var(--akzo-violet)"><div class="kpi-icon">' + UI.icon('clock') + '</div><div class="kpi-value">' + activities.filter(function (a) { return a.estado === 'Pendiente'; }).length + '</div><div class="kpi-label">Actividades pendientes (todos)</div></div>' +
      '</div>' +
      '<div class="panel mb-16"><div class="panel-header"><h3>' + UI.icon('upload-cloud') + ' Consolidar archivos del equipo</h3></div><div class="panel-body">' +
        '<p class="text-muted mb-16">Selecciona a la vez los archivos XLSX o JSON que te enviaron los vendedores por email. Cada archivo queda identificado por quién lo generó, y los registros se combinan sin duplicar.</p>' +
        '<input type="file" id="team-import-file" accept=".xlsx,.json,.csv" class="hidden" multiple>' +
        '<button class="btn btn-primary" id="btn-team-import-trigger">' + UI.icon('upload') + 'Seleccionar archivos de vendedores</button>' +
        '<div id="team-import-summary" class="mt-16">' + lastImportSummaryHTML + '</div>' +
      '</div></div>' +
      '<div class="panel">' +
        '<div class="panel-header"><h3>Vendedores</h3>' + (activeFilter ? '<button class="btn btn-sm btn-outline" id="btn-view-all">' + UI.icon('x') + 'Quitar filtro (' + UI.escapeHtml(activeFilter) + ')</button>' : '') + '</div>' +
        '<div class="table-scroll"><table class="data-table"><thead><tr>' +
          '<th>Vendedor</th><th>Clientes</th><th>Proyectos</th><th style="text-align:right">Pipeline abierto</th><th style="text-align:right">Ganados</th><th style="text-align:right">Act. pendientes</th><th>Última actividad</th><th style="text-align:right">Ver</th>' +
        '</tr></thead><tbody>' +
        (contributors.length === 0
          ? '<tr><td colspan="8">' + UI.emptyStateHTML({ icon: 'users', title: 'Sin vendedores todavía', message: 'Importa el primer archivo enviado por un vendedor para verlo aquí.' }) + '</td></tr>'
          : contributors.map(function (c) {
              var isActive = activeFilter === c.name;
              return '<tr' + (isActive ? ' style="background:var(--surface-hover)"' : '') + '>' +
                '<td class="cell-primary">' + (c.isSeed ? UI.badge(c.name, 'badge-gray') : UI.escapeHtml(c.name)) + '</td>' +
                '<td>' + c.clientCount + '</td>' +
                '<td>' + c.projectCount + '</td>' +
                '<td style="text-align:right">' + UI.formatCurrency(c.pipelineValue) + '</td>' +
                '<td style="text-align:right">' + c.wonCount + '</td>' +
                '<td style="text-align:right">' + c.pendingActivities + '</td>' +
                '<td>' + (c.lastActivityAt ? UI.formatDate(c.lastActivityAt) : '—') + '</td>' +
                '<td class="actions-cell">' + (isActive
                  ? '<button class="btn btn-sm btn-secondary" data-view-all>' + UI.icon('eye') + 'Ver todos</button>'
                  : '<button class="btn btn-sm btn-outline" data-view="' + UI.escapeHtml(c.name) + '">' + UI.icon('filter') + 'Ver solo</button>') +
                '</td></tr>';
            }).join('')) +
        '</tbody></table></div>' +
      '</div>';

    UI.refreshIcons();

    var fileInput = document.getElementById('team-import-file');
    document.getElementById('btn-team-import-trigger').addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      if (!fileInput.files.length) return;
      var summaryEl = document.getElementById('team-import-summary');
      lastImportSummaryHTML = UI.loadingStateHTML('Consolidando archivos del equipo...');
      summaryEl.innerHTML = lastImportSummaryHTML;
      CRM.Import.importFiles(fileInput.files).then(function (result) {
        lastImportSummaryHTML = UI.renderImportSummaryHTML(result);
        var failed = result.perFile.filter(function (f) { return !f.ok; }).length;
        UI.toast(failed ? ('Consolidado con ' + failed + ' archivo(s) con error') : 'Datos del equipo consolidados correctamente', failed ? 'warning' : 'success');
        fileInput.value = '';
        CRM.Router.refresh();
      }).catch(function (err) {
        console.error(err);
        lastImportSummaryHTML = '<p style="color:var(--akzo-fuchsia)">No se pudo importar. Verifica el formato de los archivos.</p>';
        summaryEl.innerHTML = lastImportSummaryHTML;
        UI.toast('Error al consolidar los archivos', 'error');
      });
    });

    container.querySelectorAll('[data-view]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        CRM.Users.setActiveFilter(btn.getAttribute('data-view'));
        if (CRM.App && CRM.App.renderScopeChip) CRM.App.renderScopeChip();
        UI.toast('Ahora estás viendo solo los datos de ' + btn.getAttribute('data-view'), 'info');
        CRM.Router.navigate('dashboard');
      });
    });
    var viewAllBtns = container.querySelectorAll('[data-view-all], #btn-view-all');
    viewAllBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        CRM.Users.setActiveFilter(null);
        if (CRM.App && CRM.App.renderScopeChip) CRM.App.renderScopeChip();
        UI.toast('Mostrando datos de todo el equipo', 'info');
        CRM.Router.refresh();
      });
    });
  }

  CRM.Team = { render: render };

})(window);
