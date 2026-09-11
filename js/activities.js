/* ==========================================================================
   activities.js — Actividades module: timeline, CRUD, próximas acciones y
   vencidas. Exposes window.CRM.Activities.
   ========================================================================== */
(function (global) {
  'use strict';

  var CRM = global.CRM = global.CRM || {};
  var UI = CRM.UI;

  var state = {
    search: '',
    tipo: '',
    estado: '',
    responsable: '',
    order: 'desc'
  };

  var TYPE_ICON = {
    'Visita': 'map-pin', 'Llamada': 'phone', 'Email': 'mail', 'Reunión': 'users',
    'Inspección Técnica': 'clipboard-check', 'Demo': 'presentation', 'Seguimiento': 'repeat'
  };
  var STATE_ACCENT = { 'Pendiente': 'var(--akzo-navy)', 'Completada': 'var(--akzo-sky)', 'Vencida': 'var(--akzo-fuchsia)' };
  var STATE_BADGE = { 'Pendiente': 'badge-navy', 'Completada': 'badge-sky', 'Vencida': 'badge-fuchsia' };

  function recomputeOverdue(activities) {
    var now = Date.now();
    var changed = [];
    activities.forEach(function (a) {
      if (a.estado === 'Pendiente' && new Date(a.fecha).getTime() < now) {
        a.estado = 'Vencida';
        changed.push(a);
      }
    });
    if (changed.length) return CRM.Storage.bulkPut('activities', changed).then(function () { return activities; });
    return Promise.resolve(activities);
  }

  function applyFilters(activities) {
    return activities.filter(function (a) {
      var matchesSearch = !state.search || (a.titulo + ' ' + a.descripcion).toLowerCase().indexOf(state.search.toLowerCase()) !== -1;
      var matchesTipo = !state.tipo || a.tipo === state.tipo;
      var matchesEstado = !state.estado || a.estado === state.estado;
      var matchesResponsable = !state.responsable || a.responsable === state.responsable;
      return matchesSearch && matchesTipo && matchesEstado && matchesResponsable;
    }).sort(function (a, b) {
      var diff = new Date(a.fecha) - new Date(b.fecha);
      return state.order === 'asc' ? diff : -diff;
    });
  }

  function validateActivity(data) {
    var errors = {};
    if (!data.tipo) errors.tipo = 'Selecciona un tipo';
    if (!data.clienteId) errors.clienteId = 'Selecciona un cliente';
    if (!data.titulo || !data.titulo.trim()) errors.titulo = 'El título es obligatorio';
    if (!data.fecha) errors.fecha = 'Selecciona fecha y hora';
    return errors;
  }

  function activityFormHTML(activity, clients, projects) {
    activity = activity || {};
    var clientOptions = clients.map(function (c) { return { value: c.id, label: c.nombre }; });
    var relatedProjects = activity.clienteId ? projects.filter(function (p) { return p.clienteId === activity.clienteId; }) : projects;
    var projectOptions = [{ value: '', label: 'Sin proyecto asociado' }].concat(relatedProjects.map(function (p) { return { value: p.id, label: p.nombreProyecto }; }));
    return '<form id="activity-form" novalidate>' +
      '<div class="form-grid">' +
        selectField('tipo', 'Tipo de actividad', CRM.Constants.ACTIVITY_TYPES, activity.tipo, true) +
        selectField('estado', 'Estado', CRM.Constants.ACTIVITY_STATES, activity.estado || 'Pendiente', true) +
        selectField('clienteId', 'Cliente', clientOptions, activity.clienteId, true) +
        selectField('proyectoId', 'Proyecto relacionado', projectOptions, activity.proyectoId, false) +
        field('titulo', 'Título', 'text', activity.titulo, true, 'span-2') +
        field('fecha', 'Fecha y hora', 'datetime-local', activity.fecha ? toLocalInputValue(activity.fecha) : '', true) +
        selectField('responsable', 'Responsable', CRM.Users.getResponsableOptions(CRM.Constants.SALES_REPS), activity.responsable || (CRM.Users.getCurrentUser() || {}).name, false) +
        textareaField('descripcion', 'Descripción', activity.descripcion) +
      '</div>' +
    '</form>';
  }

  function toLocalInputValue(iso) {
    var d = new Date(iso);
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function field(name, label, type, value, required, extraClass) {
    return '<div class="form-field ' + (extraClass || '') + '" data-field="' + name + '">' +
      '<label>' + label + (required ? ' <span class="req">*</span>' : '') + '</label>' +
      '<input type="' + type + '" name="' + name + '" value="' + UI.escapeHtml(value || '') + '">' +
      '<span class="field-error"></span></div>';
  }
  function selectField(name, label, options, value, required) {
    return '<div class="form-field" data-field="' + name + '">' +
      '<label>' + label + (required ? ' <span class="req">*</span>' : '') + '</label>' +
      '<select name="' + name + '"><option value="">Seleccionar…</option>' + UI.renderSelectOptions(options, value) + '</select>' +
      '<span class="field-error"></span></div>';
  }
  function textareaField(name, label, value) {
    return '<div class="form-field span-2" data-field="' + name + '">' +
      '<label>' + label + '</label><textarea name="' + name + '">' + UI.escapeHtml(value || '') + '</textarea>' +
      '<span class="field-error"></span></div>';
  }
  function readForm(form) {
    var fd = new FormData(form), data = {};
    fd.forEach(function (v, k) { data[k] = v; });
    return data;
  }
  function showErrors(form, errors) {
    form.querySelectorAll('.form-field').forEach(function (fieldEl) {
      var name = fieldEl.getAttribute('data-field');
      var isInvalid = !!errors[name];
      fieldEl.classList.toggle('invalid', isInvalid);
      var errEl = fieldEl.querySelector('.field-error');
      if (errEl) errEl.textContent = errors[name] || '';
    });
  }

  function openActivityForm(existing, clients, projects, onSaved) {
    if (clients.length === 0) {
      UI.toast('Primero debes crear al menos un cliente', 'warning');
      return;
    }
    var modal = UI.openModal({
      title: existing ? 'Editar actividad' : 'Nueva actividad',
      bodyHTML: activityFormHTML(existing, clients, projects),
      size: 'lg',
      buttons: [
        { label: 'Cancelar', className: 'btn-outline', onClick: function (close) { close(); } },
        {
          label: existing ? 'Guardar cambios' : 'Crear actividad',
          className: 'btn-primary',
          onClick: function (close) {
            var form = document.getElementById('activity-form');
            var data = readForm(form);
            var errors = validateActivity(data);
            showErrors(form, errors);
            if (Object.keys(errors).length) return;
            var now = new Date().toISOString();
            var record = Object.assign({}, existing, data, {
              id: existing ? existing.id : UI.generateId(),
              proyectoId: data.proyectoId || null,
              fecha: new Date(data.fecha).toISOString(),
              createdAt: existing ? existing.createdAt : now,
              updatedAt: now
            });
            if (!existing) CRM.Users.stampOwner(record);
            CRM.Storage.put('activities', record).then(function () {
              UI.toast(existing ? 'Actividad actualizada' : 'Actividad creada', 'success');
              close();
              if (onSaved) onSaved();
            }).catch(function () { UI.toast('No se pudo guardar la actividad', 'error'); });
          }
        }
      ]
    });
    var clienteSelect = modal.body.querySelector('select[name="clienteId"]');
    var proyectoSelect = modal.body.querySelector('select[name="proyectoId"]');
    if (clienteSelect && proyectoSelect) {
      clienteSelect.addEventListener('change', function () {
        var related = projects.filter(function (p) { return p.clienteId === clienteSelect.value; });
        proyectoSelect.innerHTML = '<option value="">Sin proyecto asociado</option>' + UI.renderSelectOptions(related.map(function (p) { return { value: p.id, label: p.nombreProyecto }; }), '');
      });
    }
    return modal;
  }

  function render(container) {
    return Promise.all([CRM.Storage.getAll('activities'), CRM.Storage.getAll('clients'), CRM.Storage.getAll('projects')])
      .then(function (results) { return recomputeOverdue(results[0]).then(function (acts) { return [acts, results[1], results[2]]; }); })
      .then(function (results) { renderView(container, CRM.Users.applyScope(results[0]), results[1], results[2]); });
  }

  function clientName(clients, id) {
    var c = clients.filter(function (cl) { return cl.id === id; })[0];
    return c ? c.nombre : 'Cliente no encontrado';
  }

  function renderView(container, activities, clients, projects) {
    if (CRM.Router.getCurrentRoute() !== 'actividades') return;
    var filtered = applyFilters(activities);
    var pending = activities.filter(function (a) { return a.estado === 'Pendiente'; }).length;
    var overdue = activities.filter(function (a) { return a.estado === 'Vencida'; }).length;
    var completed = activities.filter(function (a) { return a.estado === 'Completada'; }).length;

    container.innerHTML =
      '<div class="view-header">' +
        '<div><h1>Actividades comerciales</h1><p>Tracking de visitas, llamadas, reuniones e inspecciones técnicas</p></div>' +
        '<div class="view-actions"><button class="btn btn-primary" id="btn-new-activity">' + UI.icon('plus') + 'Nueva actividad</button></div>' +
      '</div>' +
      '<div class="kpi-grid">' +
        '<div class="kpi-card" style="--kpi-accent:var(--akzo-navy)"><div class="kpi-icon">' + UI.icon('clock') + '</div><div class="kpi-value">' + pending + '</div><div class="kpi-label">Pendientes</div></div>' +
        '<div class="kpi-card" style="--kpi-accent:var(--akzo-fuchsia)"><div class="kpi-icon">' + UI.icon('alert-triangle') + '</div><div class="kpi-value">' + overdue + '</div><div class="kpi-label">Vencidas</div></div>' +
        '<div class="kpi-card" style="--kpi-accent:var(--akzo-sky)"><div class="kpi-icon">' + UI.icon('check-circle-2') + '</div><div class="kpi-value">' + completed + '</div><div class="kpi-label">Completadas</div></div>' +
      '</div>' +
      '<div class="filter-bar">' +
        '<div class="search-input">' + UI.icon('search') + '<input type="search" id="activity-search" placeholder="Buscar actividad..." value="' + UI.escapeHtml(state.search) + '"></div>' +
        '<select id="activity-filter-tipo"><option value="">Todos los tipos</option>' + UI.renderSelectOptions(CRM.Constants.ACTIVITY_TYPES, state.tipo) + '</select>' +
        '<select id="activity-filter-estado"><option value="">Todos los estados</option>' + UI.renderSelectOptions(CRM.Constants.ACTIVITY_STATES, state.estado) + '</select>' +
        '<select id="activity-filter-responsable"><option value="">Todos los responsables</option>' + UI.renderSelectOptions(CRM.Users.getResponsableOptions(CRM.Constants.SALES_REPS), state.responsable) + '</select>' +
        '<button class="btn btn-outline btn-sm" id="activity-toggle-order">' + UI.icon('arrow-up-down') + (state.order === 'desc' ? 'Más recientes' : 'Más antiguas') + '</button>' +
        '<span class="filter-chip-count">' + filtered.length + ' resultado(s)</span>' +
      '</div>' +
      '<div class="panel"><div class="panel-body" id="activity-timeline"></div></div>';

    UI.refreshIcons();

    var timelineEl = document.getElementById('activity-timeline');
    if (filtered.length === 0) {
      timelineEl.innerHTML = UI.emptyStateHTML({ icon: 'calendar', title: 'Sin actividades', message: 'No hay actividades que coincidan con los filtros aplicados.', actionLabel: 'Nueva actividad', actionId: 'empty-new-activity' });
    } else {
      var html = '<div class="timeline">';
      filtered.forEach(function (a) {
        html += '<div class="timeline-item' + (a.estado === 'Vencida' ? ' overdue' : '') + '" style="--tl-accent:' + STATE_ACCENT[a.estado] + '">' +
          '<div class="tl-header">' + UI.icon(TYPE_ICON[a.tipo] || 'calendar') + '<span class="tl-title">' + UI.escapeHtml(a.titulo) + '</span>' +
          UI.badge(a.estado, STATE_BADGE[a.estado]) +
          (CRM.Users.isAdmin() ? UI.badge(a.origenUsuario || 'Sin asignar', a.origenUsuario === CRM.Users.SEED_LABEL ? 'badge-gray' : 'badge-navy') : '') +
          '<span class="tl-date">' + UI.formatDateTime(a.fecha) + '</span></div>' +
          '<div class="tl-body">' + UI.escapeHtml(clientName(clients, a.clienteId)) + ' · Responsable: ' + UI.escapeHtml(a.responsable || '—') + '<br>' + UI.escapeHtml(a.descripcion || '') + '</div>' +
          '<div class="flex gap-8 mt-8">' +
            (a.estado !== 'Completada' ? '<button class="btn btn-sm btn-secondary btn-complete" data-id="' + a.id + '">' + UI.icon('check') + 'Marcar completada</button>' : '') +
            '<button class="btn btn-sm btn-outline btn-edit" data-id="' + a.id + '">' + UI.icon('pencil') + 'Editar</button>' +
            '<button class="btn btn-sm btn-outline btn-delete" data-id="' + a.id + '">' + UI.icon('trash-2') + 'Eliminar</button>' +
          '</div>' +
        '</div>';
      });
      html += '</div>';
      timelineEl.innerHTML = html;
    }
    UI.refreshIcons();

    document.getElementById('btn-new-activity').addEventListener('click', function () {
      openActivityForm(null, clients, projects, function () { CRM.Router.refresh(); });
    });
    var emptyBtn = document.getElementById('empty-new-activity');
    if (emptyBtn) emptyBtn.addEventListener('click', function () { openActivityForm(null, clients, projects, function () { CRM.Router.refresh(); }); });

    document.getElementById('activity-search').addEventListener('input', UI.debounce(function (e) { state.search = e.target.value; renderView(container, activities, clients, projects); }, 250));
    document.getElementById('activity-filter-tipo').addEventListener('change', function (e) { state.tipo = e.target.value; renderView(container, activities, clients, projects); });
    document.getElementById('activity-filter-estado').addEventListener('change', function (e) { state.estado = e.target.value; renderView(container, activities, clients, projects); });
    document.getElementById('activity-filter-responsable').addEventListener('change', function (e) { state.responsable = e.target.value; renderView(container, activities, clients, projects); });
    document.getElementById('activity-toggle-order').addEventListener('click', function () { state.order = state.order === 'desc' ? 'asc' : 'desc'; renderView(container, activities, clients, projects); });

    container.querySelectorAll('.btn-complete').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var activity = activities.filter(function (a) { return a.id === btn.getAttribute('data-id'); })[0];
        activity.estado = 'Completada';
        activity.updatedAt = new Date().toISOString();
        CRM.Storage.put('activities', activity).then(function () { UI.toast('Actividad marcada como completada', 'success'); CRM.Router.refresh(); });
      });
    });
    container.querySelectorAll('.btn-edit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var activity = activities.filter(function (a) { return a.id === btn.getAttribute('data-id'); })[0];
        openActivityForm(activity, clients, projects, function () { CRM.Router.refresh(); });
      });
    });
    container.querySelectorAll('.btn-delete').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-id');
        UI.confirmDialog({ title: 'Eliminar actividad', message: '¿Deseas eliminar esta actividad?', confirmText: 'Eliminar', danger: true }).then(function (ok) {
          if (!ok) return;
          CRM.Storage.remove('activities', id).then(function () { UI.toast('Actividad eliminada', 'success'); CRM.Router.refresh(); });
        });
      });
    });
  }

  CRM.Activities = { render: render };

})(window);
