/* ==========================================================================
   dashboard.js — Executive dashboard: KPI cards + charts.
   Exposes window.CRM.Dashboard.
   ========================================================================== */
(function (global) {
  'use strict';

  var CRM = global.CRM = global.CRM || {};
  var UI = CRM.UI;

  function kpiCard(opts) {
    return '<div class="kpi-card" style="--kpi-accent:' + opts.accent + '">' +
      '<div class="kpi-icon">' + UI.icon(opts.icon) + '</div>' +
      '<div class="kpi-value">' + opts.value + '</div>' +
      '<div class="kpi-label">' + opts.label + '</div>' +
      '</div>';
  }

  function render(container) {
    return Promise.all([
      CRM.Storage.getAll('clients'),
      CRM.Storage.getAll('projects'),
      CRM.Storage.getAll('activities')
    ]).then(function (results) {
      if (CRM.Router.getCurrentRoute() !== 'dashboard') return;
      var clients = CRM.Users.applyScope(results[0]);
      var projects = CRM.Users.applyScope(results[1]);
      var activities = CRM.Users.applyScope(results[2]);
      var stages = CRM.Constants.PROJECT_STAGES;
      var isAdmin = CRM.Users.isAdmin();
      var activeFilter = CRM.Users.getActiveFilter();
      var contributors = isAdmin ? CRM.Users.computeContributors(results[0], results[1], results[2]) : [];

      var openProjects = projects.filter(function (p) { return p.estado !== 'Ganado' && p.estado !== 'Perdido'; });
      var pipelineTotal = openProjects.reduce(function (s, p) { return s + Number(p.valor || 0); }, 0);
      var forecastTotal = openProjects.reduce(function (s, p) { return s + Number(p.valor || 0) * (Number(p.probabilidad || 0) / 100); }, 0);
      var won = projects.filter(function (p) { return p.estado === 'Ganado'; });
      var lost = projects.filter(function (p) { return p.estado === 'Perdido'; });
      var pendingActivities = activities.filter(function (a) { return a.estado === 'Pendiente'; });
      var overdueActivities = activities.filter(function (a) { return a.estado === 'Vencida'; });

      container.innerHTML =
        '<div class="view-header">' +
          '<div><h1>Dashboard ejecutivo</h1><p>Resumen comercial de cuentas industriales AkzoNobel</p></div>' +
          '<div class="view-actions"><button class="btn btn-secondary" id="dash-refresh">' + UI.icon('refresh-cw') + 'Actualizar</button></div>' +
        '</div>' +
        (isAdmin ? (
          '<div class="scope-banner">' + UI.icon('users') +
          (activeFilter
            ? ('Mostrando solo los datos de <strong>' + UI.escapeHtml(activeFilter) + '</strong>.')
            : ('Vista de <strong>administrador</strong>: mostrando los datos consolidados de ' + contributors.length + ' vendedor(es).')) +
          ' <a href="#/equipo">Ver equipo</a></div>'
        ) : '') +
        '<div class="kpi-grid">' +
          kpiCard({ icon: 'building-2', accent: 'var(--akzo-navy)', value: UI.formatNumber(clients.length), label: 'Clientes activos' }) +
          kpiCard({ icon: 'briefcase', accent: 'var(--akzo-sky)', value: UI.formatNumber(projects.length), label: 'Proyectos totales' }) +
          kpiCard({ icon: 'trending-up', accent: 'var(--akzo-purple)', value: UI.formatCurrency(pipelineTotal), label: 'Pipeline abierto (USD)' }) +
          kpiCard({ icon: 'target', accent: 'var(--akzo-ultramarine)', value: UI.formatCurrency(forecastTotal), label: 'Forecast ponderado (USD)' }) +
          kpiCard({ icon: 'clock', accent: 'var(--akzo-violet)', value: UI.formatNumber(pendingActivities.length), label: 'Actividades pendientes' }) +
          kpiCard({ icon: 'alert-triangle', accent: 'var(--akzo-fuchsia)', value: UI.formatNumber(overdueActivities.length), label: 'Actividades vencidas' }) +
          kpiCard({ icon: 'check-circle-2', accent: 'var(--akzo-navy)', value: UI.formatNumber(won.length), label: 'Oportunidades ganadas' }) +
          kpiCard({ icon: 'x-circle', accent: 'var(--akzo-fuchsia)', value: UI.formatNumber(lost.length), label: 'Oportunidades perdidas' }) +
        '</div>' +
        '<div class="charts-grid">' +
          '<div class="panel"><div class="panel-header"><h3>Pipeline por etapa</h3></div><div class="panel-body"><div class="chart-wrap"><canvas id="chart-pipeline-stage"></canvas></div></div></div>' +
          '<div class="panel"><div class="panel-header"><h3>Forecast mensual (6 meses)</h3></div><div class="panel-body"><div class="chart-wrap"><canvas id="chart-forecast"></canvas></div></div></div>' +
          '<div class="panel"><div class="panel-header"><h3>Proyectos por segmento</h3></div><div class="panel-body"><div class="chart-wrap"><canvas id="chart-segment"></canvas></div></div></div>' +
          '<div class="panel"><div class="panel-header"><h3>Actividades por responsable</h3></div><div class="panel-body"><div class="chart-wrap"><canvas id="chart-activities-user"></canvas></div></div></div>' +
        '</div>';

      UI.refreshIcons();
      CRM.Charts.renderPipelineByStage('chart-pipeline-stage', projects, stages);
      CRM.Charts.renderForecastMonthly('chart-forecast', projects);
      CRM.Charts.renderProjectsBySegment('chart-segment', projects, CRM.Constants.SEGMENTS);
      CRM.Charts.renderActivitiesByUser('chart-activities-user', activities, CRM.Constants.SALES_REPS);

      document.getElementById('dash-refresh').addEventListener('click', function () { render(container); });
    });
  }

  CRM.Dashboard = { render: render };

})(window);
