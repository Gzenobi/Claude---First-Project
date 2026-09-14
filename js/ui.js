/* ==========================================================================
   ui.js — Reusable UI primitives: toasts, modal system, tables, pagination,
   filter bars, forms, badges, empty/loading states, formatters.
   Exposes window.CRM.UI.
   ========================================================================== */
(function (global) {
  'use strict';

  var CRM = global.CRM = global.CRM || {};
  var UI = {};

  /* ---------------- Icons ---------------- */
  function refreshIcons() {
    if (global.lucide && typeof global.lucide.createIcons === 'function') {
      global.lucide.createIcons();
    }
  }
  function icon(name, cls) {
    return '<i data-lucide="' + name + '"' + (cls ? ' class="' + cls + '"' : '') + '></i>';
  }

  /* ---------------- Formatters ---------------- */
  function formatCurrency(value) {
    var n = Number(value) || 0;
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  }
  function formatNumber(value) {
    return new Intl.NumberFormat('es-CL').format(Number(value) || 0);
  }
  function formatDate(value) {
    if (!value) return '—';
    var d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es-CL', { year: 'numeric', month: 'short', day: '2-digit' });
  }
  function formatDateTime(value) {
    if (!value) return '—';
    var d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('es-CL', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }
  function timeAgo(value) {
    if (!value) return '—';
    var d = new Date(value);
    var diffMs = Date.now() - d.getTime();
    var mins = Math.round(diffMs / 60000);
    if (mins < 1) return 'ahora mismo';
    if (mins < 60) return 'hace ' + mins + ' min';
    var hrs = Math.round(mins / 60);
    if (hrs < 24) return 'hace ' + hrs + ' h';
    var days = Math.round(hrs / 24);
    return 'hace ' + days + ' d';
  }
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function generateId() {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID();
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }
  function debounce(fn, wait) {
    var t;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait || 250);
    };
  }

  /* ---------------- Toasts ---------------- */
  var TOAST_ICONS = { success: 'check-circle', error: 'alert-circle', warning: 'alert-triangle', info: 'info' };
  function ensureToastStack() {
    var stack = document.querySelector('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }
    return stack;
  }
  function toast(message, type) {
    type = type || 'info';
    var stack = ensureToastStack();
    var el = document.createElement('div');
    el.className = 'toast ' + type;
    el.innerHTML = icon(TOAST_ICONS[type] || 'info') + '<span>' + escapeHtml(message) + '</span>';
    stack.appendChild(el);
    refreshIcons();
    setTimeout(function () {
      el.style.transition = 'opacity .25s ease, transform .25s ease';
      el.style.opacity = '0';
      el.style.transform = 'translateX(20px)';
      setTimeout(function () { el.remove(); }, 260);
    }, 3400);
  }

  /* ---------------- Modal system ---------------- */
  var _modalStack = [];
  function openModal(opts) {
    opts = opts || {};
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    var box = document.createElement('div');
    box.className = 'modal-box' + (opts.size === 'lg' ? ' modal-lg' : '');
    box.innerHTML =
      '<div class="modal-header"><h3>' + escapeHtml(opts.title || '') + '</h3>' +
      '<button type="button" class="icon-btn modal-close" aria-label="Cerrar">' + icon('x') + '</button></div>' +
      '<div class="modal-body"></div>' +
      '<div class="modal-footer"></div>';
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    var body = box.querySelector('.modal-body');
    if (opts.bodyEl) body.appendChild(opts.bodyEl);
    else body.innerHTML = opts.bodyHTML || '';

    var footer = box.querySelector('.modal-footer');
    (opts.buttons || []).forEach(function (btn) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn ' + (btn.className || 'btn-secondary');
      b.innerHTML = btn.label;
      b.addEventListener('click', function () {
        if (btn.onClick) btn.onClick(closeModal);
        else closeModal();
      });
      footer.appendChild(b);
    });
    if (!opts.buttons) footer.style.display = 'none';

    function closeModal() {
      overlay.classList.remove('open');
      setTimeout(function () {
        overlay.remove();
        _modalStack.pop();
        if (opts.onClose) opts.onClose();
      }, 150);
    }

    box.querySelector('.modal-close').addEventListener('click', closeModal);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', escHandler); }
    });

    requestAnimationFrame(function () { overlay.classList.add('open'); });
    refreshIcons();
    _modalStack.push(closeModal);
    return { close: closeModal, body: body, box: box };
  }

  function confirmDialog(opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var modal = openModal({
        title: opts.title || 'Confirmar acción',
        bodyHTML: '<p>' + escapeHtml(opts.message || '¿Deseas continuar?') + '</p>',
        buttons: [
          { label: 'Cancelar', className: 'btn-outline', onClick: function (close) { close(); resolve(false); } },
          { label: opts.confirmText || 'Confirmar', className: opts.danger ? 'btn-danger' : 'btn-primary', onClick: function (close) { close(); resolve(true); } }
        ],
        onClose: function () { resolve(false); }
      });
      return modal;
    });
  }

  /* ---------------- Empty / loading states ---------------- */
  function emptyStateHTML(opts) {
    opts = opts || {};
    return '<div class="empty-state">' +
      icon(opts.icon || 'inbox') +
      '<h4>' + escapeHtml(opts.title || 'Sin resultados') + '</h4>' +
      '<p>' + escapeHtml(opts.message || 'No hay datos para mostrar todavía.') + '</p>' +
      (opts.actionLabel ? '<button type="button" class="btn btn-primary" id="' + (opts.actionId || 'empty-action') + '">' + icon('plus') + escapeHtml(opts.actionLabel) + '</button>' : '') +
      '</div>';
  }
  function loadingStateHTML(message) {
    return '<div class="loading-state"><div class="spinner"></div><span>' + escapeHtml(message || 'Cargando...') + '</span></div>';
  }

  /* ---------------- Badges ---------------- */
  function badge(text, colorClass) {
    return '<span class="badge ' + (colorClass || 'badge-navy') + '">' + escapeHtml(text) + '</span>';
  }

  /* ---------------- Pagination ---------------- */
  function paginate(items, page, pageSize) {
    var total = items.length;
    var totalPages = Math.max(1, Math.ceil(total / pageSize));
    page = Math.min(Math.max(1, page), totalPages);
    var start = (page - 1) * pageSize;
    return { items: items.slice(start, start + pageSize), page: page, totalPages: totalPages, total: total };
  }

  function renderPagination(container, state, onPageChange) {
    var wrap = document.createElement('div');
    wrap.className = 'pagination';
    var from = state.total === 0 ? 0 : (state.page - 1) * state.pageSize + 1;
    var to = Math.min(state.page * state.pageSize, state.total);
    var info = document.createElement('span');
    info.textContent = state.total === 0 ? 'Sin registros' : ('Mostrando ' + from + '–' + to + ' de ' + state.total);
    var controls = document.createElement('div');
    controls.className = 'pager-controls';

    function makeBtn(label, page, opts) {
      opts = opts || {};
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      if (opts.active) b.classList.add('active');
      if (opts.disabled) b.disabled = true;
      b.addEventListener('click', function () { onPageChange(page); });
      return b;
    }

    controls.appendChild(makeBtn('«', 1, { disabled: state.page === 1 }));
    controls.appendChild(makeBtn('‹', state.page - 1, { disabled: state.page === 1 }));
    var start = Math.max(1, state.page - 1);
    var end = Math.min(state.totalPages, start + 2);
    for (var p = start; p <= end; p++) {
      controls.appendChild(makeBtn(String(p), p, { active: p === state.page }));
    }
    controls.appendChild(makeBtn('›', state.page + 1, { disabled: state.page === state.totalPages }));
    controls.appendChild(makeBtn('»', state.totalPages, { disabled: state.page === state.totalPages }));

    wrap.appendChild(info);
    wrap.appendChild(controls);
    container.innerHTML = '';
    container.appendChild(wrap);
  }

  /* ---------------- Table renderer ---------------- */
  /**
   * columns: [{ key, label, sortable, render(row), align }]
   * rows: array of data objects (already paginated)
   * actions(row) -> html string for action buttons
   */
  function renderTable(opts) {
    var columns = opts.columns || [];
    var rows = opts.rows || [];
    var sortState = opts.sortState || {};
    var selectable = !!opts.selectable;
    var selectedIds = opts.selectedIds || {};
    var extraCols = (opts.actions ? 1 : 0) + (selectable ? 1 : 0);
    var html = '<div class="table-scroll"><table class="data-table"><thead><tr>';
    if (selectable) {
      var allSelected = rows.length > 0 && rows.every(function (r) { return selectedIds[r.id]; });
      html += '<th class="select-col"><input type="checkbox" class="row-select-all"' + (allSelected ? ' checked' : '') + '></th>';
    }
    columns.forEach(function (col) {
      var arrow = '';
      if (sortState.key === col.key) arrow = '<span class="sort-arrow">' + (sortState.dir === 'asc' ? '▲' : '▼') + '</span>';
      html += '<th data-sort-key="' + (col.sortable ? col.key : '') + '"' + (col.align ? ' style="text-align:' + col.align + '"' : '') + '>' + escapeHtml(col.label) + arrow + '</th>';
    });
    if (opts.actions) html += '<th style="text-align:right">Acciones</th>';
    html += '</tr></thead><tbody>';

    if (rows.length === 0) {
      html += '<tr><td colspan="' + (columns.length + extraCols) + '">' + emptyStateHTML(opts.emptyState || {}) + '</td></tr>';
    } else {
      rows.forEach(function (row) {
        html += '<tr data-id="' + escapeHtml(row.id) + '">';
        if (selectable) html += '<td class="select-col"><input type="checkbox" class="row-select" data-id="' + escapeHtml(row.id) + '"' + (selectedIds[row.id] ? ' checked' : '') + '></td>';
        columns.forEach(function (col) {
          var content = col.render ? col.render(row) : escapeHtml(row[col.key]);
          html += '<td' + (col.align ? ' style="text-align:' + col.align + '"' : '') + (col.className ? ' class="' + col.className + '"' : '') + '>' + content + '</td>';
        });
        if (opts.actions) html += '<td class="actions-cell">' + opts.actions(row) + '</td>';
        html += '</tr>';
      });
    }
    html += '</tbody></table></div>';
    return html;
  }

  /* Barra de acciones masivas (estilo "related list"/list view de Salesforce),
     aparece arriba de una tabla seleccionable cuando hay filas marcadas. */
  function bulkActionBarHTML(count, actionLabel, actionId) {
    if (!count) return '';
    return '<div class="bulk-action-bar">' +
      '<span>' + count + ' seleccionado' + (count === 1 ? '' : 's') + '</span>' +
      '<button type="button" class="btn btn-danger btn-sm" id="' + actionId + '">' + icon('trash-2') + escapeHtml(actionLabel) + '</button>' +
      '<button type="button" class="btn btn-outline btn-sm" id="' + actionId + '-clear">Cancelar</button>' +
      '</div>';
  }

  /* ---------------- Import summary (shared by Configuración y Equipo) ---------------- */
  var STORE_LABELS = { clients: 'Clientes', projects: 'Proyectos', activities: 'Actividades', materials: 'Materiales' };
  function renderImportSummaryHTML(result) {
    var html = '<div class="panel" style="border-color:var(--akzo-sky)"><div class="panel-body">';
    html += '<div class="flex gap-12 mb-16" style="flex-wrap:wrap">';
    Object.keys(result.combined).forEach(function (storeName) {
      var r = result.combined[storeName];
      html += '<span class="badge badge-sky">' + (STORE_LABELS[storeName] || storeName) + ': ' + r.added + ' nuevos · ' + r.updated + ' actualizados' + (r.skipped ? (' · ' + r.skipped + ' omitidos') : '') + '</span>';
    });
    html += '</div>';
    html += '<table class="data-table"><thead><tr><th>Archivo</th><th>Resultado</th></tr></thead><tbody>';
    result.perFile.forEach(function (f) {
      if (f.ok) {
        var parts = Object.keys(f.summary).map(function (s) { return (STORE_LABELS[s] || s) + ' +' + f.summary[s].added + '/~' + f.summary[s].updated; }).join(' · ');
        html += '<tr><td class="cell-primary">' + escapeHtml(f.filename) + '</td><td>' + icon('check-circle', 'text-muted') + ' ' + parts + '</td></tr>';
      } else {
        html += '<tr><td class="cell-primary">' + escapeHtml(f.filename) + '</td><td style="color:var(--akzo-fuchsia)">' + icon('alert-circle') + ' ' + escapeHtml(f.error || 'No se pudo importar') + '</td></tr>';
      }
    });
    html += '</tbody></table></div></div>';
    return html;
  }

  /* ---------------- Filter bar ---------------- */
  function renderSelectOptions(options, selected) {
    return options.map(function (opt) {
      var value = typeof opt === 'string' ? opt : opt.value;
      var label = typeof opt === 'string' ? opt : opt.label;
      return '<option value="' + escapeHtml(value) + '"' + (value === selected ? ' selected' : '') + '>' + escapeHtml(label) + '</option>';
    }).join('');
  }

  UI = {
    refreshIcons: refreshIcons,
    icon: icon,
    formatCurrency: formatCurrency,
    formatNumber: formatNumber,
    formatDate: formatDate,
    formatDateTime: formatDateTime,
    timeAgo: timeAgo,
    escapeHtml: escapeHtml,
    generateId: generateId,
    debounce: debounce,
    toast: toast,
    openModal: openModal,
    confirmDialog: confirmDialog,
    emptyStateHTML: emptyStateHTML,
    loadingStateHTML: loadingStateHTML,
    badge: badge,
    paginate: paginate,
    renderPagination: renderPagination,
    renderTable: renderTable,
    bulkActionBarHTML: bulkActionBarHTML,
    renderSelectOptions: renderSelectOptions,
    renderImportSummaryHTML: renderImportSummaryHTML
  };

  CRM.UI = UI;

})(window);
