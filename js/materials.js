/* ==========================================================================
   materials.js — Catálogo de materiales: CRUD + carga de planilla (XLSX/CSV/
   JSON) + búsqueda/filtro/orden/paginación. Exposes window.CRM.Materials.
   ========================================================================== */
(function (global) {
  'use strict';

  var CRM = global.CRM = global.CRM || {};
  var UI = CRM.UI;

  var state = {
    search: '',
    categoria: '',
    sort: { key: 'nombre', dir: 'asc' },
    page: 1,
    pageSize: 10
  };

  var CATEGORY_BADGE = {
    'Imprimante (Primer)': 'badge-navy',
    'Intermedio': 'badge-sky',
    'Acabado (Topcoat)': 'badge-purple',
    'Diluyente / Thinner': 'badge-ultramarine',
    'Protección pasiva contra fuego': 'badge-fuchsia',
    'Accesorios': 'badge-violet',
    'Otro': 'badge-gray'
  };

  function buildColumns() {
    var cols = [
      { key: 'nombre', label: 'Material', sortable: true, render: function (r) { return '<div class="cell-primary">' + UI.escapeHtml(r.nombre) + '</div><div class="cell-secondary">' + UI.escapeHtml(r.codigo || '—') + '</div>'; } },
      { key: 'categoria', label: 'Categoría', sortable: true, render: function (r) { return UI.badge(r.categoria || 'Otro', CATEGORY_BADGE[r.categoria] || 'badge-gray'); } },
      { key: 'unidad', label: 'Unidad', sortable: true, render: function (r) { return UI.escapeHtml(r.unidad || '—'); } },
      { key: 'precioUnitario', label: 'Precio unitario', sortable: true, align: 'right', render: function (r) { return UI.formatCurrency(r.precioUnitario); } },
      { key: 'stock', label: 'Stock', sortable: true, align: 'right', render: function (r) { return UI.formatNumber(r.stock || 0); } },
      { key: 'proveedor', label: 'Proveedor', sortable: true, render: function (r) { return UI.escapeHtml(r.proveedor || '—'); } }
    ];
    if (CRM.Users.isAdmin()) {
      cols.push({ key: 'origenUsuario', label: 'Cargado por', sortable: true, render: function (r) { return UI.badge(r.origenUsuario || 'Sin asignar', r.origenUsuario === CRM.Users.SEED_LABEL ? 'badge-gray' : 'badge-navy'); } });
    }
    return cols;
  }

  function applyFiltersSort(materials) {
    var result = materials.filter(function (m) {
      var matchesSearch = !state.search || (m.nombre + ' ' + (m.codigo || '') + ' ' + (m.proveedor || '')).toLowerCase().indexOf(state.search.toLowerCase()) !== -1;
      var matchesCategoria = !state.categoria || m.categoria === state.categoria;
      return matchesSearch && matchesCategoria;
    });
    result.sort(function (a, b) {
      var va = a[state.sort.key], vb = b[state.sort.key];
      if (typeof va === 'number' || typeof vb === 'number') return state.sort.dir === 'asc' ? (Number(va) || 0) - (Number(vb) || 0) : (Number(vb) || 0) - (Number(va) || 0);
      va = String(va || '').toLowerCase(); vb = String(vb || '').toLowerCase();
      if (va < vb) return state.sort.dir === 'asc' ? -1 : 1;
      if (va > vb) return state.sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }

  function validateMaterial(data) {
    var errors = {};
    if (!data.nombre || !data.nombre.trim()) errors.nombre = 'El nombre es obligatorio';
    if (data.precioUnitario !== '' && isNaN(Number(data.precioUnitario))) errors.precioUnitario = 'Debe ser un número';
    if (data.stock !== '' && isNaN(Number(data.stock))) errors.stock = 'Debe ser un número';
    return errors;
  }

  function field(name, label, type, value, required) {
    return '<div class="form-field" data-field="' + name + '">' +
      '<label>' + label + (required ? ' <span class="req">*</span>' : '') + '</label>' +
      '<input type="' + type + '" name="' + name + '" value="' + UI.escapeHtml(value || '') + '">' +
      '<span class="field-error"></span></div>';
  }
  function selectField(name, label, options, value) {
    return '<div class="form-field" data-field="' + name + '">' +
      '<label>' + label + '</label>' +
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

  function materialFormHTML(material) {
    material = material || {};
    return '<form id="material-form" novalidate>' +
      '<div class="form-grid">' +
        field('nombre', 'Nombre del material', 'text', material.nombre, true) +
        field('codigo', 'Código', 'text', material.codigo) +
        selectField('categoria', 'Categoría', CRM.Constants.MATERIAL_CATEGORIES, material.categoria) +
        selectField('unidad', 'Unidad', CRM.Constants.MATERIAL_UNITS, material.unidad) +
        field('precioUnitario', 'Precio unitario (USD)', 'number', material.precioUnitario) +
        field('stock', 'Stock disponible', 'number', material.stock) +
        field('proveedor', 'Proveedor', 'text', material.proveedor) +
        textareaField('notas', 'Notas', material.notas) +
      '</div>' +
    '</form>';
  }

  function openMaterialForm(existing, onSaved) {
    UI.openModal({
      title: existing ? 'Editar material' : 'Nuevo material',
      bodyHTML: materialFormHTML(existing),
      size: 'lg',
      buttons: [
        { label: 'Cancelar', className: 'btn-outline', onClick: function (close) { close(); } },
        {
          label: existing ? 'Guardar cambios' : 'Crear material',
          className: 'btn-primary',
          onClick: function (close) {
            var form = document.getElementById('material-form');
            var data = readForm(form);
            var errors = validateMaterial(data);
            showErrors(form, errors);
            if (Object.keys(errors).length) return;
            var now = new Date().toISOString();
            var record = Object.assign({}, existing, data, {
              id: existing ? existing.id : UI.generateId(),
              precioUnitario: Number(data.precioUnitario) || 0,
              stock: Number(data.stock) || 0,
              createdAt: existing ? existing.createdAt : now,
              updatedAt: now
            });
            if (!existing) CRM.Users.stampOwner(record);
            CRM.Storage.put('materials', record).then(function () {
              UI.toast(existing ? 'Material actualizado' : 'Material creado', 'success');
              close();
              if (onSaved) onSaved();
            }).catch(function () { UI.toast('No se pudo guardar el material', 'error'); });
          }
        }
      ]
    });
  }

  function render(container) {
    // El catálogo de materiales es compartido: todos los roles lo ven completo
    // (no se filtra por CRM.Users.applyScope, a diferencia de clientes/proyectos/actividades).
    return CRM.Storage.getAll('materials').then(function (materials) {
      renderView(container, materials);
    });
  }

  function renderView(container, materials) {
    if (CRM.Router.getCurrentRoute() !== 'materiales') return;
    var filtered = applyFiltersSort(materials);
    var page = UI.paginate(filtered, state.page, state.pageSize);
    state.page = page.page;

    container.innerHTML =
      '<div class="view-header">' +
        '<div><h1>Materiales</h1><p>Catálogo de productos y materiales AkzoNobel disponibles para cotización</p></div>' +
        '<div class="view-actions">' +
          '<input type="file" id="materials-upload-input" accept=".xlsx,.csv,.json" class="hidden">' +
          '<button class="btn btn-secondary" id="btn-upload-materials">' + UI.icon('upload') + 'Subir planilla</button>' +
          '<button class="btn btn-primary" id="btn-new-material">' + UI.icon('plus') + 'Nuevo material</button>' +
        '</div>' +
      '</div>' +
      '<div id="materials-upload-summary"></div>' +
      '<div class="panel">' +
        '<div class="panel-body">' +
          '<div class="filter-bar">' +
            '<div class="search-input">' + UI.icon('search') + '<input type="search" id="material-search" placeholder="Buscar por nombre, código o proveedor..." value="' + UI.escapeHtml(state.search) + '"></div>' +
            '<select id="material-filter-categoria"><option value="">Todas las categorías</option>' + UI.renderSelectOptions(CRM.Constants.MATERIAL_CATEGORIES, state.categoria) + '</select>' +
            '<span class="filter-chip-count">' + filtered.length + ' material(es)</span>' +
          '</div>' +
          UI.renderTable({
            columns: buildColumns(),
            rows: page.items,
            sortState: state.sort,
            emptyState: {
              icon: 'package', title: 'Sin materiales todavía',
              message: 'Sube una planilla XLSX/CSV con tu catálogo o agrega materiales manualmente.',
              actionLabel: 'Nuevo material', actionId: 'empty-new-material'
            },
            actions: function (row) {
              return '<button class="icon-btn btn-edit" data-id="' + row.id + '" title="Editar">' + UI.icon('pencil') + '</button>' +
                '<button class="icon-btn btn-delete" data-id="' + row.id + '" title="Eliminar">' + UI.icon('trash-2') + '</button>';
            }
          }) +
        '</div>' +
        '<div id="material-pagination"></div>' +
      '</div>';

    UI.refreshIcons();
    UI.renderPagination(document.getElementById('material-pagination'), Object.assign({ pageSize: state.pageSize }, page), function (p) {
      state.page = p; renderView(container, materials);
    });

    document.getElementById('btn-new-material').addEventListener('click', function () {
      openMaterialForm(null, function () { render(container); });
    });
    var emptyBtn = document.getElementById('empty-new-material');
    if (emptyBtn) emptyBtn.addEventListener('click', function () { openMaterialForm(null, function () { render(container); }); });

    document.getElementById('material-search').addEventListener('input', UI.debounce(function (e) {
      state.search = e.target.value; state.page = 1; renderView(container, materials);
    }, 250));
    document.getElementById('material-filter-categoria').addEventListener('change', function (e) {
      state.categoria = e.target.value; state.page = 1; renderView(container, materials);
    });

    container.querySelectorAll('th[data-sort-key]').forEach(function (th) {
      var key = th.getAttribute('data-sort-key');
      if (!key) return;
      th.addEventListener('click', function () {
        if (state.sort.key === key) state.sort.dir = state.sort.dir === 'asc' ? 'desc' : 'asc';
        else state.sort = { key: key, dir: 'asc' };
        renderView(container, materials);
      });
    });

    container.querySelectorAll('.btn-edit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var material = materials.filter(function (m) { return m.id === btn.getAttribute('data-id'); })[0];
        openMaterialForm(material, function () { render(container); });
      });
    });
    container.querySelectorAll('.btn-delete').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-id');
        var material = materials.filter(function (m) { return m.id === id; })[0];
        UI.confirmDialog({
          title: 'Eliminar material',
          message: '¿Deseas eliminar "' + (material ? material.nombre : '') + '" del catálogo?',
          confirmText: 'Eliminar',
          danger: true
        }).then(function (ok) {
          if (!ok) return;
          CRM.Storage.remove('materials', id).then(function () { UI.toast('Material eliminado', 'success'); render(container); });
        });
      });
    });

    var uploadInput = document.getElementById('materials-upload-input');
    document.getElementById('btn-upload-materials').addEventListener('click', function () { uploadInput.click(); });
    uploadInput.addEventListener('change', function () {
      var file = uploadInput.files[0];
      if (!file) return;
      var summaryEl = document.getElementById('materials-upload-summary');
      summaryEl.innerHTML = UI.loadingStateHTML('Procesando planilla de materiales...');
      CRM.Import.importSingleStoreFile(file, 'materials').then(function (result) {
        summaryEl.innerHTML = '<div class="panel mb-16" style="border-color:var(--akzo-sky)"><div class="panel-body">' +
          UI.badge(result.added + ' nuevos', 'badge-sky') + ' ' + UI.badge(result.updated + ' actualizados', 'badge-navy') +
          (result.skipped ? ' ' + UI.badge(result.skipped + ' omitidos', 'badge-gray') : '') +
          '</div></div>';
        UI.toast('Planilla de materiales importada correctamente', 'success');
        uploadInput.value = '';
        render(container);
      }).catch(function (err) {
        console.error(err);
        summaryEl.innerHTML = '<p style="color:var(--akzo-fuchsia)">No se pudo procesar la planilla. Verifica el formato (XLSX, CSV o JSON).</p>';
        UI.toast('Error al subir la planilla', 'error');
      });
    });
  }

  CRM.Materials = { render: render };

})(window);
