/* ==========================================================================
   clients.js — Clientes module: CRUD + búsqueda + filtros + orden + paginación.
   Exposes window.CRM.Clients.
   ========================================================================== */
(function (global) {
  'use strict';

  var CRM = global.CRM = global.CRM || {};
  var UI = CRM.UI;

  var state = {
    search: '',
    segmento: '',
    sort: { key: 'nombre', dir: 'asc' },
    page: 1,
    pageSize: 8
  };

  function buildColumns() {
    var cols = [
      { key: 'nombre', label: 'Cliente', sortable: true, render: function (r) { return '<div class="cell-primary">' + UI.escapeHtml(r.nombre) + '</div><div class="cell-secondary">' + UI.escapeHtml(r.planta) + '</div>'; } },
      { key: 'segmento', label: 'Segmento', sortable: true, render: function (r) { return UI.badge(r.segmento, segmentBadgeClass(r.segmento)); } },
      { key: 'ciudad', label: 'Ubicación', sortable: true, render: function (r) { return UI.escapeHtml(r.ciudad) + ', ' + UI.escapeHtml(r.pais); } },
      { key: 'contacto', label: 'Contacto', sortable: true, render: function (r) { return '<div class="cell-primary">' + UI.escapeHtml(r.contacto) + '</div><div class="cell-secondary">' + UI.escapeHtml(r.email) + '</div>'; } },
      { key: 'potencialAnual', label: 'Potencial anual', sortable: true, align: 'right', render: function (r) { return UI.formatCurrency(r.potencialAnual); } },
      { key: 'competidor', label: 'Competidor', sortable: true, render: function (r) { return UI.escapeHtml(r.competidor || '—'); } }
    ];
    if (CRM.Users.isAdmin()) {
      cols.push({ key: 'origenUsuario', label: 'Vendedor', sortable: true, render: function (r) { return UI.badge(r.origenUsuario || 'Sin asignar', r.origenUsuario === CRM.Users.SEED_LABEL ? 'badge-gray' : 'badge-navy'); } });
    }
    return cols;
  }

  function segmentBadgeClass(seg) {
    var map = { 'Minería': 'badge-navy', 'Oil & Gas': 'badge-ultramarine', 'Energía': 'badge-sky', 'Infraestructura': 'badge-purple', 'Manufactura': 'badge-violet' };
    return map[seg] || 'badge-gray';
  }

  function applyFiltersSort(clients) {
    var result = clients.filter(function (c) {
      var matchesSearch = !state.search || (c.nombre + ' ' + c.contacto + ' ' + c.ciudad + ' ' + c.planta).toLowerCase().indexOf(state.search.toLowerCase()) !== -1;
      var matchesSegmento = !state.segmento || c.segmento === state.segmento;
      return matchesSearch && matchesSegmento;
    });
    result.sort(function (a, b) {
      var va = a[state.sort.key], vb = b[state.sort.key];
      if (typeof va === 'number') return state.sort.dir === 'asc' ? va - vb : vb - va;
      va = String(va || '').toLowerCase(); vb = String(vb || '').toLowerCase();
      if (va < vb) return state.sort.dir === 'asc' ? -1 : 1;
      if (va > vb) return state.sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }

  function validateClient(data) {
    var errors = {};
    if (!data.nombre || !data.nombre.trim()) errors.nombre = 'El nombre es obligatorio';
    if (!data.segmento) errors.segmento = 'Selecciona un segmento';
    if (!data.email || !/^\S+@\S+\.\S+$/.test(data.email)) errors.email = 'Email inválido';
    if (data.potencialAnual !== '' && isNaN(Number(data.potencialAnual))) errors.potencialAnual = 'Debe ser un número';
    return errors;
  }

  function clientFormHTML(client) {
    client = client || {};
    return '<form id="client-form" novalidate>' +
      '<div class="form-grid">' +
        field('nombre', 'Nombre de la empresa', 'text', client.nombre, true) +
        selectField('segmento', 'Segmento', CRM.Constants.SEGMENTS, client.segmento, true) +
        field('planta', 'Planta / instalación', 'text', client.planta) +
        field('ciudad', 'Ciudad', 'text', client.ciudad) +
        field('pais', 'País', 'text', client.pais) +
        field('contacto', 'Contacto principal', 'text', client.contacto) +
        field('email', 'Email', 'email', client.email, true) +
        field('telefono', 'Teléfono', 'text', client.telefono) +
        field('competidor', 'Competidor incumbente', 'text', client.competidor) +
        field('potencialAnual', 'Potencial anual (USD)', 'number', client.potencialAnual) +
        textareaField('observaciones', 'Observaciones', client.observaciones) +
      '</div>' +
    '</form>';
  }

  function field(name, label, type, value, required) {
    return '<div class="form-field" data-field="' + name + '">' +
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
    var fd = new FormData(form);
    var data = {};
    fd.forEach(function (val, key) { data[key] = val; });
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

  function openClientForm(existing, onSaved) {
    var modal = UI.openModal({
      title: existing ? 'Editar cliente' : 'Nuevo cliente',
      bodyHTML: clientFormHTML(existing),
      size: 'lg',
      buttons: [
        { label: 'Cancelar', className: 'btn-outline', onClick: function (close) { close(); } },
        {
          label: existing ? 'Guardar cambios' : 'Crear cliente',
          className: 'btn-primary',
          onClick: function (close) {
            var form = document.getElementById('client-form');
            var data = readForm(form);
            var errors = validateClient(data);
            showErrors(form, errors);
            if (Object.keys(errors).length) return;
            var now = new Date().toISOString();
            var record = Object.assign({}, existing, data, {
              id: existing ? existing.id : UI.generateId(),
              potencialAnual: Number(data.potencialAnual) || 0,
              createdAt: existing ? existing.createdAt : now,
              updatedAt: now
            });
            if (!existing) CRM.Users.stampOwner(record);
            CRM.Storage.put('clients', record).then(function () {
              UI.toast(existing ? 'Cliente actualizado correctamente' : 'Cliente creado correctamente', 'success');
              close();
              if (onSaved) onSaved();
            }).catch(function () { UI.toast('No se pudo guardar el cliente', 'error'); });
          }
        }
      ]
    });
    return modal;
  }

  function render(container) {
    return CRM.Storage.getAll('clients').then(function (clients) {
      renderView(container, CRM.Users.applyScope(clients));
    });
  }

  function renderView(container, clients) {
    if (CRM.Router.getCurrentRoute() !== 'clientes') return;
    var filtered = applyFiltersSort(clients);
    var page = UI.paginate(filtered, state.page, state.pageSize);
    state.page = page.page;

    container.innerHTML =
      '<div class="view-header">' +
        '<div><h1>Clientes</h1><p>Cuentas industriales gestionadas por el equipo comercial</p></div>' +
        '<div class="view-actions"><button class="btn btn-primary" id="btn-new-client">' + UI.icon('plus') + 'Nuevo cliente</button></div>' +
      '</div>' +
      '<div class="panel">' +
        '<div class="panel-body">' +
          '<div class="filter-bar">' +
            '<div class="search-input">' + UI.icon('search') + '<input type="search" id="client-search" placeholder="Buscar por nombre, contacto, ciudad o planta..." value="' + UI.escapeHtml(state.search) + '"></div>' +
            '<select id="client-filter-segmento"><option value="">Todos los segmentos</option>' + UI.renderSelectOptions(CRM.Constants.SEGMENTS, state.segmento) + '</select>' +
            '<span class="filter-chip-count">' + filtered.length + ' resultado(s)</span>' +
          '</div>' +
          UI.renderTable({
            columns: buildColumns(),
            rows: page.items,
            sortState: state.sort,
            emptyState: { icon: 'building-2', title: 'Sin clientes', message: 'Aún no hay clientes que coincidan con la búsqueda.', actionLabel: 'Nuevo cliente', actionId: 'empty-new-client' },
            actions: function (row) {
              return '<button class="icon-btn btn-edit" data-id="' + row.id + '" title="Editar">' + UI.icon('pencil') + '</button>' +
                '<button class="icon-btn btn-delete" data-id="' + row.id + '" title="Eliminar">' + UI.icon('trash-2') + '</button>';
            }
          }) +
        '</div>' +
        '<div id="client-pagination"></div>' +
      '</div>';

    UI.refreshIcons();
    UI.renderPagination(document.getElementById('client-pagination'), Object.assign({ pageSize: state.pageSize }, page), function (p) {
      state.page = p; renderView(container, clients);
    });

    document.getElementById('btn-new-client').addEventListener('click', function () {
      openClientForm(null, function () { render(container); });
    });
    var emptyBtn = document.getElementById('empty-new-client');
    if (emptyBtn) emptyBtn.addEventListener('click', function () { openClientForm(null, function () { render(container); }); });

    document.getElementById('client-search').addEventListener('input', UI.debounce(function (e) {
      state.search = e.target.value; state.page = 1; renderView(container, clients);
    }, 250));
    document.getElementById('client-filter-segmento').addEventListener('change', function (e) {
      state.segmento = e.target.value; state.page = 1; renderView(container, clients);
    });

    container.querySelectorAll('th[data-sort-key]').forEach(function (th) {
      var key = th.getAttribute('data-sort-key');
      if (!key) return;
      th.addEventListener('click', function () {
        if (state.sort.key === key) state.sort.dir = state.sort.dir === 'asc' ? 'desc' : 'asc';
        else state.sort = { key: key, dir: 'asc' };
        renderView(container, clients);
      });
    });

    container.querySelectorAll('.btn-edit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var client = clients.filter(function (c) { return c.id === btn.getAttribute('data-id'); })[0];
        openClientForm(client, function () { render(container); });
      });
    });
    container.querySelectorAll('.btn-delete').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-id');
        var client = clients.filter(function (c) { return c.id === id; })[0];
        UI.confirmDialog({
          title: 'Eliminar cliente',
          message: '¿Deseas eliminar a "' + (client ? client.nombre : '') + '"? Esta acción no se puede deshacer.',
          confirmText: 'Eliminar',
          danger: true
        }).then(function (ok) {
          if (!ok) return;
          CRM.Storage.remove('clients', id).then(function () {
            UI.toast('Cliente eliminado', 'success');
            render(container);
          });
        });
      });
    });
  }

  function getClientById(clients, id) {
    return clients.filter(function (c) { return c.id === id; })[0] || null;
  }

  CRM.Clients = { render: render, openClientForm: openClientForm, getClientById: getClientById, state: state };

})(window);
