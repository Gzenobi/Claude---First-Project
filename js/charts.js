/* ==========================================================================
   charts.js — Chart.js wrappers using the official AkzoNobel palette.
   Exposes window.CRM.Charts.
   ========================================================================== */
(function (global) {
  'use strict';

  var CRM = global.CRM = global.CRM || {};

  var PALETTE = ['#005192', '#008BC5', '#542C97', '#000394', '#E0457A', '#A8269A'];
  var PALETTE_LIGHT = ['#8CB6D9', '#A3DDF5', '#A290C2', '#999AD4', '#FFB3D4', '#D292CC'];

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
        datasets: [{ label: 'Pipeline (USD)', data: data, backgroundColor: PALETTE, borderRadius: 6, maxBarThickness: 46 }]
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

  function renderForecastMonthly(canvasId, projects, onBarClick) {
    destroy(canvasId);
    var ctx = document.getElementById(canvasId);
    if (!ctx) return;
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
    instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: buckets.map(function (b) { return b.label; }),
        datasets: [
          {
            label: 'Forecast ponderado (USD)',
            data: buckets.map(function (b) { return Math.round(b.revenue); }),
            borderColor: '#008BC5',
            backgroundColor: '#A3DDF544',
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#005192',
            pointRadius: 4,
            yAxisID: 'y'
          },
          {
            label: 'Forecast ponderado (litros)',
            data: buckets.map(function (b) { return Math.round(b.litros); }),
            borderColor: '#542C97',
            backgroundColor: '#A290C2',
            borderDash: [5, 4],
            fill: false,
            tension: 0.35,
            pointBackgroundColor: '#542C97',
            pointRadius: 4,
            yAxisID: 'y1'
          }
        ]
      },
      options: baseOptions({
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { family: 'Arial', size: 11.5 }, color: '#868688' } },
          tooltip: {
            backgroundColor: '#005192',
            callbacks: {
              label: function (item) {
                if (item.datasetIndex === 0) return 'Revenue: $' + item.parsed.y.toLocaleString('es-CL');
                return 'Volumen: ' + item.parsed.y.toLocaleString('es-CL') + ' L';
              }
            }
          }
        },
        scales: {
          y: { beginAtZero: true, position: 'left', ticks: { callback: function (v) { return '$' + (v / 1000) + 'k'; }, color: '#868688' }, grid: { color: '#B7B9BA33' } },
          y1: { beginAtZero: true, position: 'right', ticks: { callback: function (v) { return (v / 1000) + 'k L'; }, color: '#868688' }, grid: { display: false } },
          x: { ticks: { color: '#868688' }, grid: { display: false } }
        },
        onHover: onBarClick ? function (evt, elements) { evt.native.target.style.cursor = elements.length ? 'pointer' : 'default'; } : undefined,
        onClick: onBarClick ? function (evt, elements) {
          if (!elements.length) return;
          var bucket = buckets[elements[0].index];
          onBarClick(bucket);
        } : undefined
      })
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
      data: { labels: segments, datasets: [{ data: data, backgroundColor: PALETTE, borderWidth: 2, borderColor: '#fff' }] },
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
    renderForecastMonthly: renderForecastMonthly,
    renderProjectsBySegment: renderProjectsBySegment,
    renderActivitiesByUser: renderActivitiesByUser
  };

})(window);
