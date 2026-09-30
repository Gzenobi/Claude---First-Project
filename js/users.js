/* ==========================================================================
   users.js — Perfil local (nombre + rol) y alcance de datos multi-usuario.
   No es autenticación real (no hay servidor ni contraseñas): es un perfil
   local que identifica quién usa esta copia del CRM y qué ve. Exposes
   window.CRM.Users.
   ========================================================================== */
(function (global) {
  'use strict';

  var CRM = global.CRM = global.CRM || {};
  var UI;

  var ROLES = ['Representante Comercial', 'Sales Representative', 'Administrador'];
  var CONFIG_KEY = 'currentUser';
  var FILTER_KEY = 'teamActiveFilter';
  var SEED_LABEL = 'Datos de ejemplo';

  function getCurrentUser() {
    return CRM.Storage.getConfig(CONFIG_KEY, null);
  }

  function setCurrentUser(user) {
    CRM.Storage.setConfig(CONFIG_KEY, user);
  }

  function clearCurrentUser() {
    CRM.Storage.setConfig(CONFIG_KEY, null);
    CRM.Storage.setConfig(FILTER_KEY, null);
  }

  function isAdmin() {
    var u = getCurrentUser();
    return !!u && u.role === 'Administrador';
  }

  function getActiveFilter() {
    return isAdmin() ? CRM.Storage.getConfig(FILTER_KEY, null) : null;
  }

  function setActiveFilter(name) {
    CRM.Storage.setConfig(FILTER_KEY, name || null);
  }

  function stampOwner(record) {
    var u = CRM.Users.getCurrentUser();
    record.origenUsuario = (u && u.name) || 'Sin asignar';
    return record;
  }

  /**
   * Gate de sesión, asíncrono por compatibilidad con el login en la nube
   * (Firebase Auth resuelve la sesión de forma asíncrona). En modo local
   * responde de inmediato con el perfil guardado (o null).
   */
  function ensureSession(callback) {
    callback(CRM.Users.getCurrentUser());
  }

  /**
   * Aplica el alcance de datos según el rol de la sesión actual.
   * - Administrador: ve todo, salvo que haya elegido un filtro activo en
   *   Equipo (entonces ve solo a ese representante).
   * - Representante (cualquier rol no-admin): ve únicamente sus propios
   *   registros, más los datos de ejemplo compartidos (si los hay). Nunca
   *   ve los registros de otros representantes.
   */
  function applyScope(records) {
    if (CRM.Users.isAdmin()) {
      var filter = CRM.Users.getActiveFilter();
      if (!filter) return records;
      return records.filter(function (r) { return r.origenUsuario === filter; });
    }
    var user = CRM.Users.getCurrentUser();
    var myName = user && user.name;
    return records.filter(function (r) {
      return r.origenUsuario === myName || r.origenUsuario === SEED_LABEL;
    });
  }

  /**
   * Calcula la lista de vendedores/orígenes presentes en los datos junto
   * con estadísticas agregadas, para la vista de Equipo.
   */
  function computeContributors(clients, projects, activities) {
    var names = {};
    function track(list) {
      list.forEach(function (r) {
        var name = r.origenUsuario || 'Sin asignar';
        names[name] = true;
      });
    }
    track(clients); track(projects); track(activities);

    return Object.keys(names).sort(function (a, b) {
      if (a === SEED_LABEL) return 1;
      if (b === SEED_LABEL) return -1;
      return a.localeCompare(b);
    }).map(function (name) {
      var myClients = clients.filter(function (c) { return (c.origenUsuario || 'Sin asignar') === name; });
      var myProjects = projects.filter(function (p) { return (p.origenUsuario || 'Sin asignar') === name; });
      var myActivities = activities.filter(function (a) { return (a.origenUsuario || 'Sin asignar') === name; });
      var openProjects = myProjects.filter(function (p) { return p.estado !== 'Ganado' && p.estado !== 'Perdido'; });
      var pipelineValue = openProjects.reduce(function (s, p) { return s + Number(p.valor || 0); }, 0);
      var pendingActivities = myActivities.filter(function (a) { return a.estado === 'Pendiente'; }).length;
      var lastActivityDate = myActivities.reduce(function (max, a) {
        var t = new Date(a.updatedAt || a.fecha).getTime();
        return t > max ? t : max;
      }, 0);
      return {
        name: name,
        isSeed: name === SEED_LABEL,
        clientCount: myClients.length,
        projectCount: myProjects.length,
        pipelineValue: pipelineValue,
        wonCount: myProjects.filter(function (p) { return p.estado === 'Ganado'; }).length,
        pendingActivities: pendingActivities,
        lastActivityAt: lastActivityDate ? new Date(lastActivityDate).toISOString() : null
      };
    });
  }

  /**
   * Opciones para selects de "responsable": lista base + nombre del
   * usuario actual + cualquier origen encontrado en los datos, sin duplicar.
   */
  function getResponsableOptions(baseList, extraNames) {
    var set = {};
    var out = [];
    function add(name) {
      if (!name || set[name]) return;
      set[name] = true; out.push(name);
    }
    (baseList || []).forEach(add);
    var current = CRM.Users.getCurrentUser();
    if (current) add(current.name);
    (extraNames || []).forEach(add);
    return out;
  }

  /* ---------------- Login screen ---------------- */
  function renderLoginScreen(root, onDone) {
    UI = CRM.UI;
    root.innerHTML =
      '<div class="login-screen">' +
        '<div class="login-card">' +
          '<img src="assets/akzonobel-white.svg" alt="AkzoNobel" class="login-logo">' +
          '<h1>Marine &amp; Protective Coatings CRM</h1>' +
          '<p>Identifícate para continuar. Esto es un perfil local de esta copia del CRM, no una contraseña.</p>' +
          '<form id="login-form" novalidate>' +
            '<div class="form-field" data-field="name">' +
              '<label>Tu nombre <span class="req">*</span></label>' +
              '<input type="text" name="name" autocomplete="name" placeholder="Ej: Javier Muñoz" required>' +
              '<span class="field-error"></span>' +
            '</div>' +
            '<div class="form-field" data-field="role">' +
              '<label>Tu rol <span class="req">*</span></label>' +
              '<select name="role">' + UI.renderSelectOptions(ROLES, 'Representante Comercial') + '</select>' +
            '</div>' +
            '<p class="login-hint">' + UI.icon('info') + 'Administrador: podrás consolidar e importar los archivos que te envíen los representantes y ver todo el equipo.</p>' +
            '<button type="submit" class="btn btn-primary login-submit">' + UI.icon('log-in') + 'Entrar al CRM</button>' +
          '</form>' +
        '</div>' +
      '</div>';

    UI.refreshIcons();
    document.getElementById('login-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var form = e.target;
      var name = form.name.value.trim();
      var fieldEl = form.querySelector('[data-field="name"]');
      if (!name) {
        fieldEl.classList.add('invalid');
        fieldEl.querySelector('.field-error').textContent = 'Ingresa tu nombre';
        return;
      }
      fieldEl.classList.remove('invalid');
      var user = { name: name, role: form.role.value, loggedInAt: new Date().toISOString() };
      setCurrentUser(user);
      onDone(user);
    });
  }

  CRM.Users = {
    ROLES: ROLES,
    SEED_LABEL: SEED_LABEL,
    getCurrentUser: getCurrentUser,
    setCurrentUser: setCurrentUser,
    clearCurrentUser: clearCurrentUser,
    ensureSession: ensureSession,
    isAdmin: isAdmin,
    getActiveFilter: getActiveFilter,
    setActiveFilter: setActiveFilter,
    stampOwner: stampOwner,
    applyScope: applyScope,
    computeContributors: computeContributors,
    getResponsableOptions: getResponsableOptions,
    renderLoginScreen: renderLoginScreen
  };

})(window);
