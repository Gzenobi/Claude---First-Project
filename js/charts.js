/* ==========================================================================
   charts.js — Chart.js wrappers using the official AkzoNobel palette.
   Exposes window.CRM.Charts.
   ========================================================================== */
(function (global) {
  'use strict';

  var CRM = global.CRM = global.CRM || {};

  var PALETTE = ['#005192', '#008BC5', '#542C97', '#000394', '#E0457A', '#A8269A'];
  var PALETTE_LIGHT = ['#8CB6D9', '#A3DDF5', '#A290C2', '#999AD4', '#FFB3D4', '#D292CC'];

  // Color por nombre semántico (mismos nombres que CRM.Constants.PROJECT_STAGES[].color
  // y projects.js STAGE_CSS_VAR) — así una etapa tiene el mismo color en el Kanban y
  // en los gráficos del Dashboard. El orden gray→navy→sky→ultramarine→violet evita
  // adyacencias difíciles de distinguir para daltonismo (validado con dataviz skill).
  var STAGE_COLOR_HEX = { gray: '#868688', navy: '#005192', sky: '#008BC5', ultramarine: '#000394', violet: '#A8269A', purple: '#542C97', fuchsia: '#E0457A' };

  // Color fijo por segmento (no posicional): mismo criterio que clients.js
  // segmentBadgeClass, elegido para que ningún par adyacente en el donut sea
  // difícil de distinguir para daltonismo (validado con dataviz skill).
  var SEGMENT_COLOR_HEX = { 'Minería': '#005192', 'Oil & Gas': '#008BC5', 'Energía': '#000394', 'Infraestructura': '#E0457A', 'Manufactura': '#542C97' };

  var instances = {};

  function destroy(canvasId) {
    if (instances[canvasId]) {
      instances[canvasId].destroy();
      delete instances[canvasId];
    }
  }

  function baseOptions(overrides) {
    var opts = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, font: { family: 'Arial', size: 11.5 }, color: '#868688' } },
        tooltip: { backgroundColor: '#005192', titleFont: { family: 'Arial' }, bodyFont: { family: 'Arial' } }
      },
      scales: {}
    };
    return Object.assign(opts, overrides || {});
  }

  function monthLabel(dateStr) {
    var d = new Date(dateStr);
    return d.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' });
  }

  function renderPipelineByStage(canvasId, projects, stages, onBarClick) {
    destroy(canvasId);
    var ctx = document.getElementById(canvasId);
    if (!ctx) return;
    var openStages = stages.filter(function (s) { return s.key !== 'Ganado' && s.key !== 'Perdido'; });
    var labels = openStages.map(function (s) { return s.key; });
    var data = openStages.map(function (s) {
      return projects.filter(function (p) { return p.estado === s.key; })
        .reduce(function (sum, p) { return sum + Number(p.valor || 0); }, 0);
    });
    instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{ label: 'Pipeline (USD)', data: data, backgroundColor: openStages.map(function (s) { return STAGE_COLOR_HEX[s.color] || PALETTE[0]; }), borderRadius: 6, maxBarThickness: 46 }]
      },
      options: baseOptions({
        plugins: { legend: { display: false }, tooltip: baseOptions().plugins.tooltip },
        scales: {
          y: { beginAtZero: true, ticks: { callback: function (v) { return '$' + (v / 1000) + 'k'; }, color: '#868688' }, grid: { color: '#B7B9BA33' } },
          x: { ticks: { color: '#868688' }, grid: { display: false } }
        },
        onHover: onBarClick ? function (evt, elements) { evt.native.target.style.cursor = elements.length ? 'pointer' : 'default'; } : undefined,
        onClick: onBarClick ? function (evt, elements) {
          if (!elements.length) return;
          onBarClick(openStages[elements[0].index]);
        } : undefined
      })
    });
  }

  /**
   * Construye los 6 baldes mensuales (revenue + litros ponderados) una sola vez,
   * reutilizados por los dos gráficos de forecast (uno por métrica — ver
   * renderForecastRevenue/renderForecastVolume). Un solo gráfico con dos ejes Y
   * fue reemplazado por dos gráficos de un eje cada uno: dos medidas de escalas
   * distintas (USD vs. litros) en el mismo eje sugieren una relación que no existe.
   */
  function buildForecastBuckets(projects) {
    var now = new Date();
    var buckets = [];
    for (var i = 0; i < 6; i++) {
      var d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      buckets.push({ key: d.getFullYear() + '-' + d.getMonth(), label: d.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' }), revenue: 0, litros: 0, projectIds: [] });
    }
    projects.forEach(function (p) {
      if (p.estado === 'Perdido') return;
      var d = new Date(p.fechaCierre);
      var key = d.getFullYear() + '-' + d.getMonth();
      var bucket = buckets.filter(function (b) { return b.key === key; })[0];
      if (!bucket) return;
      var weight = Number(p.probabilidad || 0) / 100;
      bucket.revenue += Number(p.valor || 0) * weight;
      bucket.litros += Number(p.volumenLitros || 0) * weight;
      bucket.projectIds.push(p.id);
    });
    return buckets;
  }

  function renderForecastLine(canvasId, buckets, opts) {
    destroy(canvasId);
    var ctx = document.getElementById(canvasId);
    if (!ctx) return;
    instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: buckets.map(function (b) { return b.label; }),
        datasets: [{
          label: opts.datasetLabel,
          data: buckets.map(function (b) { return Math.round(opts.valueOf(b)); }),
          borderColor: opts.lineColor,
          backgroundColor: opts.fillColor,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: opts.lineColor,
          pointRadius: 4
        }]
      },
      options: baseOptions({
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: '#005192', callbacks: { label: function (item) { return opts.tooltipLabel(item.parsed.y); } } }
        },
        scales: {
          y: { beginAtZero: true, ticks: { callback: opts.tickFormat, color: '#868688' }, grid: { color: '#B7B9BA33' } },
          x: { ticks: { color: '#868688' }, grid: { display: false } }
        },
        onHover: opts.onBarClick ? function (evt, elements) { evt.native.target.style.cursor = elements.length ? 'pointer' : 'default'; } : undefined,
        onClick: opts.onBarClick ? function (evt, elements) {
          if (!elements.length) return;
          opts.onBarClick(buckets[elements[0].index]);
        } : undefined
      })
    });
  }

  function renderForecastRevenue(canvasId, projects, onBarClick) {
    renderForecastLine(canvasId, buildForecastBuckets(projects), {
      datasetLabel: 'Forecast ponderado (USD)',
      lineColor: '#005192',
      fillColor: '#8CB6D944',
      valueOf: function (b) { return b.revenue; },
      tickFormat: function (v) { return '$' + (v / 1000) + 'k'; },
      tooltipLabel: function (v) { return 'Revenue: $' + v.toLocaleString('es-CL'); },
      onBarClick: onBarClick
    });
  }

  function renderForecastVolume(canvasId, projects, onBarClick) {
    renderForecastLine(canvasId, buildForecastBuckets(projects), {
      datasetLabel: 'Forecast ponderado (litros)',
      lineColor: '#542C97',
      fillColor: '#A290C244',
      valueOf: function (b) { return b.litros; },
      tickFormat: function (v) { return (v / 1000) + 'k L'; },
      tooltipLabel: function (v) { return 'Volumen: ' + v.toLocaleString('es-CL') + ' L'; },
      onBarClick: onBarClick
    });
  }

  function renderProjectsBySegment(canvasId, projects, segments, onSliceClick) {
    destroy(canvasId);
    var ctx = document.getElementById(canvasId);
    if (!ctx) return;
    var data = segments.map(function (seg) {
      return projects.filter(function (p) { return p.segmento === seg; }).length;
    });
    instances[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: { labels: segments, datasets: [{ data: data, backgroundColor: segments.map(function (seg, i) { return SEGMENT_COLOR_HEX[seg] || PALETTE[i % PALETTE.length]; }), borderWidth: 2, borderColor: '#fff' }] },
      options: baseOptions({
        cutout: '62%',
        onHover: onSliceClick ? function (evt, elements) { evt.native.target.style.cursor = elements.length ? 'pointer' : 'default'; } : undefined,
        onClick: onSliceClick ? function (evt, elements) {
          if (!elements.length) return;
          onSliceClick(segments[elements[0].index]);
        } : undefined
      })
    });
  }

  function renderActivitiesByUser(canvasId, activities, users, onBarClick) {
    destroy(canvasId);
    var ctx = document.getElementById(canvasId);
    if (!ctx) return;
    var data = users.map(function (u) {
      return activities.filter(function (a) { return a.responsable === u; }).length;
    });
    instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: users,
        datasets: [{ label: 'Actividades', data: data, backgroundColor: '#542C97', borderRadius: 6, maxBarThickness: 40 }]
      },
      options: baseOptions({
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, ticks: { color: '#868688' }, grid: { color: '#B7B9BA33' } },
          y: { ticks: { color: '#868688' }, grid: { display: false } }
        },
        onHover: onBarClick ? function (evt, elements) { evt.native.target.style.cursor = elements.length ? 'pointer' : 'default'; } : undefined,
        onClick: onBarClick ? function (evt, elements) {
          if (!elements.length) return;
          onBarClick(users[elements[0].index]);
        } : undefined
      })
    });
  }

  CRM.Charts = {
    PALETTE: PALETTE,
    PALETTE_LIGHT: PALETTE_LIGHT,
    destroy: destroy,
    renderPipelineByStage: renderPipelineByStage,
    renderForecastRevenue: renderForecastRevenue,
    renderForecastVolume: renderForecastVolume,
    renderProjectsBySegment: renderProjectsBySegment,
    renderActivitiesByUser: renderActivitiesByUser
  };

})(window);
