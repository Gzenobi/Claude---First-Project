/* ==========================================================================
   projects.js — Proyectos module: vista tabla + kanban, CRUD, drag & drop,
   filtros y búsqueda. Exposes window.CRM.Projects.
   ========================================================================== */
(function (global) {
  'use strict';

  var CRM = global.CRM = global.CRM || {};
  var UI = CRM.UI;
  var STAGE_BADGE = { gray: 'badge-gray', navy: 'badge-navy', sky: 'badge-sky', ultramarine: 'badge-ultramarine', violet: 'badge-violet', purple: 'badge-purple', fuchsia: 'badge-fuchsia' };
  var STAGE_CSS_VAR = { gray: 'var(--akzo-gray-dark)', navy: 'var(--akzo-navy)', sky: 'var(--akzo-sky)', ultramarine: 'var(--akzo-ultramarine)', violet: 'var(--akzo-violet)', purple: 'var(--akzo-purple)', fuchsia: 'var(--akzo-fuchsia)' };

  var state = {
    view: 'table',
    search: '',
    segmento: '',
    estado: '',
    responsable: '',
    sort: { key: 'fechaCierre', dir: 'asc' },
    page: 1,
    pageSize: 8
  };

  function stageColor(key) {
    var stage = CRM.Constants.PROJECT_STAGES.filter(function (s) { return s.key === key; })[0];
    return stage ? stage.color : 'gray';
  }

  function clientName(clients, clienteId) {
    var c = clients.filter(function (cl) { return cl.id === clienteId; })[0];
    return c ? c.nombre : 'Cliente no encontrado';
  }

  function buildColumns(clients) {
    var cols = [
      { key: 'nombreProyecto', label: 'Proyecto', sortable: true, render: function (r) { return '<div class="cell-primary">' + UI.escapeHtml(r.nombreProyecto) + '</div><div class="cell-secondary">' + UI.escapeHtml(clientName(clients, r.clienteId)) + '</div>'; } },
      { key: 'segmento', label: 'Segmento', sortable: true, render: function (r) { return UI.escapeHtml(r.segmento); } },
      { key: 'estado', label: 'Etapa', sortable: true, render: function (r) { return UI.badge(r.estado, STAGE_BADGE[stageColor(r.estado)]); } },
      { key: 'valor', label: 'Valor', sortable: true, align: 'right', render: function (r) { return UI.formatCurrency(r.valor); } },
      { key: 'volumenLitros', label: 'Litros', sortable: true, align: 'right', render: function (r) { return UI.formatNumber(r.volumenLitros || 0) + ' L'; } },
      { key: 'probabilidad', label: 'Prob.', sortable: true, align: 'right', render: function (r) { return r.probabilidad + '%'; } },
      { key: 'fechaCierre', label: 'Cierre estimado', sortable: true, render: function (r) { return UI.formatDate(r.fechaCierre); } },
      { key: 'responsable', label: 'Responsable', sortable: true, render: function (r) { return UI.escapeHtml(r.responsable); } }
    ];
    if (CRM.Users.isAdmin()) {
      cols.push({ key: 'origenUsuario', label: 'Cargado por', sortable: true, render: function (r) { return UI.badge(r.origenUsuario || 'Sin asignar', r.origenUsuario === CRM.Users.SEED_LABEL ? 'badge-gray' : 'badge-navy'); } });
    }
    return cols;
  }

  function applyFiltersSort(projects) {
    var result = projects.filter(function (p) {
      var matchesSearch = !state.search || (p.nombreProyecto + ' ' + p.coatingSystem + ' ' + p.responsable).toLowerCase().indexOf(state.search.toLowerCase()) !== -1;
      var matchesSegmento = !state.segmento || p.segmento === state.segmento;
      var matchesEstado = !state.estado || p.estado === state.estado;
      var matchesResponsable = !state.responsable || p.responsable === state.responsable;
      return matchesSearch && matchesSegmento && matchesEstado && matchesResponsable;
    });
    result.sort(function (a, b) {
      var va = a[state.sort.key], vb = b[state.sort.key];
      if (state.sort.key === 'fechaCierre') { va = new Date(va).getTime(); vb = new Date(vb).getTime(); }
      if (typeof va === 'number') return state.sort.dir === 'asc' ? va - vb : vb - va;
      va = String(va || '').toLowerCase(); vb = String(vb || '').toLowerCase();
      if (va < vb) return state.sort.dir === 'asc' ? -1 : 1;
      if (va > vb) return state.sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }

  function validateProject(data) {
    var errors = {};
    if (!data.clienteId) errors.clienteId = 'Selecciona un cliente';
    if (!data.nombreProyecto || !data.nombreProyecto.trim()) errors.nombreProyecto = 'El nombre del proyecto es obligatorio';
    if (!data.estado) errors.estado = 'Selecciona una etapa';
    if (data.valor === '' || isNaN(Number(data.valor)) || Number(data.valor) < 0) errors.valor = 'Ingresa un valor válido';
    if (!data.fechaCierre) errors.fechaCierre = 'Selecciona una fecha de cierre';
    return errors;
  }

  function projectFormHTML(project, clients) {
    project = project || {};
    var clientOptions = clients.map(function (c) { return { value: c.id, label: c.nombre }; });
    return '<form id="project-form" novalidate>' +
      '<div class="form-grid">' +
        selectField('clienteId', 'Cliente', clientOptions, project.clienteId, true) +
        field('nombreProyecto', 'Nombre del proyecto', 'text', project.nombreProyecto, true, 'span-2') +
        selectField('segmento', 'Segmento', CRM.Constants.SEGMENTS, project.segmento, false) +
        selectField('coatingSystem', 'Coating system', CRM.Constants.COATING_SYSTEMS, project.coatingSystem, false) +
        selectField('estado', 'Etapa', CRM.Constants.PROJECT_STAGE_KEYS, project.estado, true) +
        field('probabilidad', 'Probabilidad (%)', 'number', project.probabilidad != null ? project.probabilidad : '', false) +
        field('valor', 'Valor estimado (USD)', 'number', project.valor, true) +
        field('volumenLitros', 'Volumen estimado (litros)', 'number', project.volumenLitros, false) +
        field('fechaCierre', 'Fecha de cierre estimada', 'date', project.fechaCierre ? project.fechaCierre.slice(0, 10) : '', true) +
        selectField('responsable', 'Responsable comercial', CRM.Users.getResponsableOptions(CRM.Constants.SALES_REPS), project.responsable || (CRM.Users.getCurrentUser() || {}).name, false) +
        field('competidor', 'Competidor', 'text', project.competidor, false) +
        textareaField('notasTecnicas', 'Notas técnicas', project.notasTecnicas) +
      '</div>' +
    '</form>';
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

  function openProjectForm(existing, clients, onSaved) {
    if (clients.length === 0) {
      UI.toast('Primero debes crear al menos un cliente', 'warning');
      return;
    }
    var modal = UI.openModal({
      title: existing ? 'Editar proyecto' : 'Nuevo proyecto',
      bodyHTML: projectFormHTML(existing, clients),
      size: 'lg',
      buttons: [
        { label: 'Cancelar', className: 'btn-outline', onClick: function (close) { close(); } },
        {
          label: existing ? 'Guardar cambios' : 'Crear proyecto',
          className: 'btn-primary',
          onClick: function (close) {
            var form = document.getElementById('project-form');
            var data = readForm(form);
            var errors = validateProject(data);
            showErrors(form, errors);
            if (Object.keys(errors).length) return;
            var now = new Date().toISOString();
            var stageDefault = CRM.Constants.PROJECT_STAGES.filter(function (s) { return s.key === data.estado; })[0];
            var record = Object.assign({}, existing, data, {
              id: existing ? existing.id : UI.generateId(),
              valor: Number(data.valor) || 0,
              volumenLitros: Number(data.volumenLitros) || 0,
              probabilidad: data.probabilidad !== '' ? Number(data.probabilidad) : (stageDefault ? stageDefault.probability : 0),
              fechaCierre: new Date(data.fechaCierre).toISOString(),
              createdAt: existing ? existing.createdAt : now,
              updatedAt: now
            });
            if (!existing) CRM.Users.stampOwner(record);
            CRM.Storage.put('projects', record).then(function () {
              UI.toast(existing ? 'Proyecto actualizado' : 'Proyecto creado', 'success');
              close();
              if (onSaved) onSaved();
            }).catch(function () { UI.toast('No se pudo guardar el proyecto', 'error'); });
          }
        }
      ]
    });
    return modal;
  }

  function render(container) {
    return Promise.all([CRM.Storage.getAll('projects'), CRM.Storage.getAll('clients')]).then(function (results) {
      renderView(container, CRM.Users.applyScope(results[0]), results[1]);
    });
  }

  function renderView(container, projects, clients) {
    if (CRM.Router.getCurrentRoute() !== 'proyectos') return;
    var filtered = applyFiltersSort(projects);

    container.innerHTML =
      '<div class="view-header">' +
        '<div><h1>Proyectos</h1><p>Pipeline comercial de sistemas de recubrimiento industrial</p></div>' +
        '<div class="view-actions">' +
          '<div class="view-tabs"><button class="view-tab" data-view="table">Tabla</button><button class="view-tab" data-view="kanban">Kanban</button></div>' +
          '<button class="btn btn-primary" id="btn-new-project">' + UI.icon('plus') + 'Nuevo proyecto</button>' +
        '</div>' +
      '</div>' +
      '<div class="filter-bar">' +
        '<div class="search-input">' + UI.icon('search') + '<input type="search" id="project-search" placeholder="Buscar por proyecto, sistema o responsable..." value="' + UI.escapeHtml(state.search) + '"></div>' +
        '<select id="project-filter-segmento"><option value="">Todos los segmentos</option>' + UI.renderSelectOptions(CRM.Constants.SEGMENTS, state.segmento) + '</select>' +
        '<select id="project-filter-estado"><option value="">Todas las etapas</option>' + UI.renderSelectOptions(CRM.Constants.PROJECT_STAGE_KEYS, state.estado) + '</select>' +
        '<select id="project-filter-responsable"><option value="">Todos los responsables</option>' + UI.renderSelectOptions(CRM.Users.getResponsableOptions(CRM.Constants.SALES_REPS), state.responsable) + '</select>' +
        '<span class="filter-chip-count">' + filtered.length + ' resultado(s)</span>' +
      '</div>' +
      '<div id="project-view-body"></div>';

    UI.refreshIcons();
    container.querySelectorAll('.view-tab').forEach(function (tab) {
      tab.classList.toggle('active', tab.getAttribute('data-view') === state.view);
      tab.addEventListener('click', function () { state.view = tab.getAttribute('data-view'); renderView(container, projects, clients); });
    });

    document.getElementById('btn-new-project').addEventListener('click', function () {
      openProjectForm(null, clients, function () { render(container); });
    });
    document.getElementById('project-search').addEventListener('input', UI.debounce(function (e) {
      state.search = e.target.value; state.page = 1; renderView(container, projects, clients);
    }, 250));
    document.getElementById('project-filter-segmento').addEventListener('change', function (e) { state.segmento = e.target.value; renderView(container, projects, clients); });
    document.getElementById('project-filter-estado').addEventListener('change', function (e) { state.estado = e.target.value; renderView(container, projects, clients); });
    document.getElementById('project-filter-responsable').addEventListener('change', function (e) { state.responsable = e.target.value; renderView(container, projects, clients); });

    var body = document.getElementById('project-view-body');
    if (state.view === 'kanban') renderKanbanView(body, filtered, clients, projects);
    else renderTableView(body, filtered, clients, projects);
  }

  function renderTableView(body, filtered, clients, allProjects) {
    var page = UI.paginate(filtered, state.page, state.pageSize);
    state.page = page.page;
    body.innerHTML =
      '<div class="panel">' +
        '<div class="panel-body">' +
          UI.renderTable({
            columns: buildColumns(clients),
            rows: page.items,
            sortState: state.sort,
            emptyState: { icon: 'briefcase', title: 'Sin proyectos', message: 'No hay proyectos que coincidan con los filtros aplicados.', actionLabel: 'Nuevo proyecto', actionId: 'empty-new-project' },
            actions: function (row) {
              return '<button class="icon-btn btn-edit" data-id="' + row.id + '" title="Editar">' + UI.icon('pencil') + '</button>' +
                '<button class="icon-btn btn-delete" data-id="' + row.id + '" title="Eliminar">' + UI.icon('trash-2') + '</button>';
            }
          }) +
        '</div><div id="project-pagination"></div>' +
      '</div>';
    UI.refreshIcons();
    UI.renderPagination(document.getElementById('project-pagination'), Object.assign({ pageSize: state.pageSize }, page), function (p) {
      state.page = p; renderTableView(body, filtered, clients, allProjects);
    });
    body.querySelectorAll('th[data-sort-key]').forEach(function (th) {
      var key = th.getAttribute('data-sort-key');
      if (!key) return;
      th.addEventListener('click', function () {
        if (state.sort.key === key) state.sort.dir = state.sort.dir === 'asc' ? 'desc' : 'asc';
        else state.sort = { key: key, dir: 'asc' };
        renderTableView(body, filtered, clients, allProjects);
      });
    });
    body.querySelectorAll('.btn-edit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var project = allProjects.filter(function (p) { return p.id === btn.getAttribute('data-id'); })[0];
        openProjectForm(project, clients, function () { CRM.Router.refresh(); });
      });
    });
    body.querySelectorAll('.btn-delete').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-id');
        UI.confirmDialog({ title: 'Eliminar proyecto', message: '¿Deseas eliminar este proyecto? Esta acción no se puede deshacer.', confirmText: 'Eliminar', danger: true })
          .then(function (ok) {
            if (!ok) return;
            CRM.Storage.remove('projects', id).then(function () { UI.toast('Proyecto eliminado', 'success'); CRM.Router.refresh(); });
          });
      });
    });
  }

  function renderKanbanView(body, filtered, clients, allProjects) {
    body.innerHTML = '<div class="kanban-container"></div>';
    var kanbanEl = body.querySelector('.kanban-container');
    CRM.Kanban.render(kanbanEl, {
      columns: CRM.Constants.PROJECT_STAGES.map(function (s) { return { key: s.key, label: s.key, colorVar: STAGE_CSS_VAR[s.color] }; }),
      items: filtered,
      getColumnKey: function (p) { return p.estado; },
      getItemId: function (p) { return p.id; },
      getValue: function (p) { return Number(p.valor || 0); },
      renderCard: function (p) {
        return '<div class="kc-title">' + UI.escapeHtml(p.nombreProyecto) + '</div>' +
          '<div class="kc-client">' + UI.escapeHtml(clientName(clients, p.clienteId)) + '</div>' +
          '<div class="kc-footer"><span class="kc-value">' + UI.formatCurrency(p.valor) + '</span><span class="text-muted">' + UI.formatDate(p.fechaCierre) + '</span></div>';
      },
      onMove: function (itemId, newStageKey) {
        var project = allProjects.filter(function (p) { return p.id === itemId; })[0];
        if (!project) return;
        var stage = CRM.Constants.PROJECT_STAGES.filter(function (s) { return s.key === newStageKey; })[0];
        project.estado = newStageKey;
        project.probabilidad = stage ? stage.probability : project.probabilidad;
        project.updatedAt = new Date().toISOString();
        CRM.Storage.put('projects', project).then(function () {
          UI.toast('Proyecto movido a "' + newStageKey + '"', 'success');
        });
      }
    });
  }

  CRM.Projects = { render: render };

})(window);
