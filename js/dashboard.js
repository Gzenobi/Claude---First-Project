/* ==========================================================================
   dashboard.js — Executive dashboard: KPI cards + charts.
   Exposes window.CRM.Dashboard.
   ========================================================================== */
(function (global) {
  'use strict';

  var CRM = global.CRM = global.CRM || {};
  var UI = CRM.UI;

  function kpiCard(opts) {
    return '<div class="kpi-card kpi-card-clickable" id="kpi-' + opts.id + '" role="button" tabindex="0" style="--kpi-accent:' + opts.accent + '">' +
      '<span class="kpi-click-hint">' + UI.icon('chevron-right') + '</span>' +
      '<div class="kpi-icon">' + UI.icon(opts.icon) + '</div>' +
      '<div class="kpi-value">' + opts.value + '</div>' +
      '<div class="kpi-label">' + opts.label + '</div>' +
      '</div>';
  }

  function wireKpiClick(id, handler) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', handler);
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); }
    });
  }

  function clientName(clients, clienteId) {
    var c = clients.filter(function (cl) { return cl.id === clienteId; })[0];
    return c ? c.nombre : 'Cliente no encontrado';
  }

  function openProjectListModal(title, projectList, clients) {
    var body = projectList.length === 0
      ? UI.emptyStateHTML({ icon: 'briefcase', title: 'Sin proyectos', message: 'No hay proyectos que coincidan con esta selección.' })
      : UI.renderTable({
          columns: [
            { key: 'nombreProyecto', label: 'Proyecto', render: function (r) { return '<div class="cell-primary">' + UI.escapeHtml(r.nombreProyecto) + '</div><div class="cell-secondary">' + UI.escapeHtml(clientName(clients, r.clienteId)) + '</div>'; } },
            { key: 'estado', label: 'Etapa', render: function (r) { return UI.escapeHtml(r.estado); } },
            { key: 'valor', label: 'Valor', align: 'right', render: function (r) { return UI.formatCurrency(r.valor); } },
            { key: 'volumenLitros', label: 'Litros', align: 'right', render: function (r) { return UI.formatNumber(r.volumenLitros || 0) + ' L'; } },
            { key: 'probabilidad', label: 'Prob.', align: 'right', render: function (r) { return (r.probabilidad || 0) + '%'; } },
            { key: 'fechaCierre', label: 'Cierre', render: function (r) { return UI.formatDate(r.fechaCierre); } },
            { key: 'responsable', label: 'Responsable', render: function (r) { return UI.escapeHtml(r.responsable || '—'); } }
          ],
          rows: projectList
        });
    var totalValor = projectList.reduce(function (s, p) { return s + Number(p.valor || 0); }, 0);
    var totalLitros = projectList.reduce(function (s, p) { return s + Number(p.volumenLitros || 0); }, 0);
    var summary = '<div class="flex gap-8 mb-16" style="flex-wrap:wrap">' +
      UI.badge(projectList.length + ' proyecto(s)', 'badge-navy') +
      UI.badge(UI.formatCurrency(totalValor), 'badge-sky') +
      UI.badge(UI.formatNumber(totalLitros) + ' L', 'badge-purple') +
      '</div>';
    UI.openModal({ title: title, size: 'lg', bodyHTML: summary + body });
  }

  function openClientListModal(title, clientList) {
    var body = clientList.length === 0
      ? UI.emptyStateHTML({ icon: 'building-2', title: 'Sin clientes', message: 'No hay clientes que coincidan con esta selección.' })
      : UI.renderTable({
          columns: [
            { key: 'nombre', label: 'Cliente', render: function (r) { return '<div class="cell-primary">' + UI.escapeHtml(r.nombre) + '</div><div class="cell-secondary">' + UI.escapeHtml(r.planta || '') + '</div>'; } },
            { key: 'segmento', label: 'Segmento', render: function (r) { return UI.escapeHtml(r.segmento || '—'); } },
            { key: 'ciudad', label: 'Ubicación', render: function (r) { return UI.escapeHtml(r.ciudad || '') + (r.pais ? (', ' + UI.escapeHtml(r.pais)) : ''); } },
            { key: 'contacto', label: 'Contacto', render: function (r) { return '<div class="cell-primary">' + UI.escapeHtml(r.contacto || '—') + '</div><div class="cell-secondary">' + UI.escapeHtml(r.email || '') + '</div>'; } },
            { key: 'potencialAnual', label: 'Potencial anual', align: 'right', render: function (r) { return UI.formatCurrency(r.potencialAnual); } }
          ],
          rows: clientList
        });
    var totalPotencial = clientList.reduce(function (s, c) { return s + Number(c.potencialAnual || 0); }, 0);
    var summary = '<div class="flex gap-8 mb-16" style="flex-wrap:wrap">' +
      UI.badge(clientList.length + ' cliente(s)', 'badge-navy') +
      UI.badge(UI.formatCurrency(totalPotencial) + ' potencial anual', 'badge-sky') +
      '</div>';
    UI.openModal({ title: title, size: 'lg', bodyHTML: summary + body });
  }

  function openActivityListModal(title, activityList, clients) {
    var body = activityList.length === 0
      ? UI.emptyStateHTML({ icon: 'calendar', title: 'Sin actividades', message: 'No hay actividades que coincidan con esta selección.' })
      : UI.renderTable({
          columns: [
            { key: 'titulo', label: 'Actividad', render: function (r) { return '<div class="cell-primary">' + UI.escapeHtml(r.titulo) + '</div><div class="cell-secondary">' + UI.escapeHtml(clientName(clients, r.clienteId)) + '</div>'; } },
            { key: 'tipo', label: 'Tipo', render: function (r) { return UI.escapeHtml(r.tipo); } },
            { key: 'estado', label: 'Estado', render: function (r) { return UI.badge(r.estado, r.estado === 'Vencida' ? 'badge-fuchsia' : (r.estado === 'Completada' ? 'badge-sky' : 'badge-navy')); } },
            { key: 'fecha', label: 'Fecha', render: function (r) { return UI.formatDateTime(r.fecha); } }
          ],
          rows: activityList
        });
    var summary = '<div class="flex gap-8 mb-16">' + UI.badge(activityList.length + ' actividad(es)', 'badge-violet') + '</div>';
    UI.openModal({ title: title, size: 'lg', bodyHTML: summary + body });
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
            : ('Vista de <strong>administrador</strong>: mostrando los datos consolidados de ' + contributors.length + ' representante(s).')) +
          ' <a href="#/equipo">Ver equipo</a></div>'
        ) : (
          '<div class="scope-banner">' + UI.icon('lock') +
          'Estás viendo solo tus propios datos (' + UI.escapeHtml((CRM.Users.getCurrentUser() || {}).name || '') + '). No ves los de otros representantes.' +
          '</div>'
        )) +
        '<div class="kpi-grid">' +
          kpiCard({ id: 'clients', icon: 'building-2', accent: 'var(--akzo-navy)', value: UI.formatNumber(clients.length), label: 'Clientes activos' }) +
          kpiCard({ id: 'projects', icon: 'briefcase', accent: 'var(--akzo-sky)', value: UI.formatNumber(projects.length), label: 'Proyectos totales' }) +
          kpiCard({ id: 'pipeline', icon: 'trending-up', accent: 'var(--akzo-purple)', value: UI.formatCurrency(pipelineTotal), label: 'Pipeline abierto (USD)' }) +
          kpiCard({ id: 'forecast', icon: 'target', accent: 'var(--akzo-ultramarine)', value: UI.formatCurrency(forecastTotal), label: 'Forecast ponderado (USD)' }) +
          kpiCard({ id: 'pending', icon: 'clock', accent: 'var(--akzo-violet)', value: UI.formatNumber(pendingActivities.length), label: 'Actividades pendientes' }) +
          kpiCard({ id: 'overdue', icon: 'alert-triangle', accent: 'var(--akzo-fuchsia)', value: UI.formatNumber(overdueActivities.length), label: 'Actividades vencidas' }) +
          kpiCard({ id: 'won', icon: 'check-circle-2', accent: 'var(--akzo-navy)', value: UI.formatNumber(won.length), label: 'Oportunidades ganadas' }) +
          kpiCard({ id: 'lost', icon: 'x-circle', accent: 'var(--akzo-fuchsia)', value: UI.formatNumber(lost.length), label: 'Oportunidades perdidas' }) +
        '</div>' +
        '<div class="charts-grid">' +
          '<div class="panel"><div class="panel-header"><h3>Pipeline por etapa</h3><span class="chart-hint">' + UI.icon('mouse-pointer-click') + 'Click en una barra para ver el detalle</span></div><div class="panel-body"><div class="chart-wrap"><canvas id="chart-pipeline-stage"></canvas></div></div></div>' +
          '<div class="panel"><div class="panel-header"><h3>Forecast mensual (6 meses)</h3><span class="chart-hint">' + UI.icon('mouse-pointer-click') + 'Revenue y litros</span></div><div class="panel-body"><div class="chart-wrap"><canvas id="chart-forecast"></canvas></div></div></div>' +
          '<div class="panel"><div class="panel-header"><h3>Proyectos por segmento</h3><span class="chart-hint">' + UI.icon('mouse-pointer-click') + 'Click para ver el detalle</span></div><div class="panel-body"><div class="chart-wrap"><canvas id="chart-segment"></canvas></div></div></div>' +
          '<div class="panel"><div class="panel-header"><h3>Actividades por responsable</h3><span class="chart-hint">' + UI.icon('mouse-pointer-click') + 'Click para ver el detalle</span></div><div class="panel-body"><div class="chart-wrap"><canvas id="chart-activities-user"></canvas></div></div></div>' +
        '</div>';

      UI.refreshIcons();

      var responsableSet = {};
      CRM.Constants.SALES_REPS.forEach(function (r) { responsableSet[r] = true; });
      activities.forEach(function (a) { if (a.responsable) responsableSet[a.responsable] = true; });
      var responsables = Object.keys(responsableSet);

      CRM.Charts.renderPipelineByStage('chart-pipeline-stage', projects, stages, function (stage) {
        var matching = projects.filter(function (p) { return p.estado === stage.key; });
        openProjectListModal('Pipeline — ' + stage.key, matching, clients);
      });
      CRM.Charts.renderForecastMonthly('chart-forecast', projects, function (bucket) {
        var matching = projects.filter(function (p) { return bucket.projectIds.indexOf(p.id) !== -1; });
        openProjectListModal('Forecast — ' + bucket.label, matching, clients);
      });
      CRM.Charts.renderProjectsBySegment('chart-segment', projects, CRM.Constants.SEGMENTS, function (segment) {
        var matching = projects.filter(function (p) { return p.segmento === segment; });
        openProjectListModal('Proyectos — ' + segment, matching, clients);
      });
      CRM.Charts.renderActivitiesByUser('chart-activities-user', activities, responsables, function (responsable) {
        var matching = activities.filter(function (a) { return a.responsable === responsable; });
        openActivityListModal('Actividades — ' + responsable, matching, clients);
      });

      wireKpiClick('kpi-clients', function () { openClientListModal('Clientes activos', clients); });
      wireKpiClick('kpi-projects', function () { openProjectListModal('Proyectos totales', projects, clients); });
      wireKpiClick('kpi-pipeline', function () { openProjectListModal('Pipeline abierto (USD)', openProjects, clients); });
      wireKpiClick('kpi-forecast', function () { openProjectListModal('Forecast ponderado (USD) — proyectos abiertos', openProjects, clients); });
      wireKpiClick('kpi-pending', function () { openActivityListModal('Actividades pendientes', pendingActivities, clients); });
      wireKpiClick('kpi-overdue', function () { openActivityListModal('Actividades vencidas', overdueActivities, clients); });
      wireKpiClick('kpi-won', function () { openProjectListModal('Oportunidades ganadas', won, clients); });
      wireKpiClick('kpi-lost', function () { openProjectListModal('Oportunidades perdidas', lost, clients); });

      document.getElementById('dash-refresh').addEventListener('click', function () { render(container); });
    });
  }

  CRM.Dashboard = { render: render };

})(window);
