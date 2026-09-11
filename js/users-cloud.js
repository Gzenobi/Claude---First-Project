/* ==========================================================================
   users-cloud.js — Reemplaza la sesión local de CRM.Users por autenticación
   real de Firebase (email + contraseña), pero SOLO si CRM.Cloud.isConfigured()
   es true. Si no hay configuración real, este archivo no hace nada y users.js
   (perfil local) sigue siendo la implementación activa.

   applyScope/stampOwner/getResponsableOptions de users.js llaman a
   CRM.Users.getCurrentUser()/isAdmin()/getActiveFilter() a través del objeto
   público (no por referencia directa a función), así que al sobreescribir
   esas piezas acá, el resto de la lógica de alcance de datos se adapta sola.
   ========================================================================== */
(function (global) {
  'use strict';

  var CRM = global.CRM = global.CRM || {};
  if (!(CRM.Cloud && CRM.Cloud.isConfigured())) return;

  var UI;
  var auth = CRM.Cloud.getAuth();
  var db = CRM.Cloud.getDb();

  var _profile = null;       // { uid, name, role, email }
  var _authReady = false;
  var _waiters = [];

  function flush() {
    var cbs = _waiters; _waiters = [];
    cbs.forEach(function (cb) { cb(_profile); });
  }

  // Resuelve (o refresca) el perfil para un usuario de Firebase Auth dado.
  // Se usa tanto desde onAuthStateChanged (carga de página / restauración de
  // sesión) como directamente tras un login/signup exitoso: no alcanza con
  // esperar el flag _authReady ahí, porque ese flag puede haber quedado en
  // true desde un estado anterior (p.ej. "sin sesión" al cargar la página)
  // mientras el perfil del usuario recién autenticado todavía se está
  // buscando en Firestore — esperar solo el flag causaría una carrera donde
  // se lee el perfil viejo/null en vez del nuevo.
  function refreshProfile(fbUser) {
    if (!fbUser) {
      _profile = null;
      _authReady = true;
      flush();
      return Promise.resolve(null);
    }
    return db.collection('users').doc(fbUser.uid).get().then(function (doc) {
      var data = doc.exists ? doc.data() : { name: fbUser.email, role: CRM.Users.ROLES[0] };
      _profile = { uid: fbUser.uid, name: data.name, role: data.role, email: fbUser.email };
      return _profile;
    }).catch(function () {
      _profile = { uid: fbUser.uid, name: fbUser.email, role: CRM.Users.ROLES[0], email: fbUser.email };
      return _profile;
    }).then(function (profile) {
      _authReady = true;
      flush();
      return profile;
    });
  }

  auth.onAuthStateChanged(function (fbUser) { refreshProfile(fbUser); });

  function toUser(p) { return { name: p.name, role: p.role, email: p.email, uid: p.uid }; }

  function ensureSession(callback) {
    if (_authReady) { callback(_profile ? toUser(_profile) : null); return; }
    _waiters.push(function (p) { callback(p ? toUser(p) : null); });
  }

  function getCurrentUser() { return _profile ? toUser(_profile) : null; }
  function setCurrentUser() { /* no-op: la sesión la maneja Firebase Auth */ }
  function clearCurrentUser() { return auth.signOut(); }
  function isAdmin() { return !!_profile && _profile.role === 'Administrador'; }
  function getActiveFilter() { return isAdmin() ? CRM.Storage.getConfig('teamActiveFilter', null) : null; }
  function setActiveFilter(name) { CRM.Storage.setConfig('teamActiveFilter', name || null); }

  var AUTH_ERROR_MESSAGES = {
    'auth/wrong-password': 'Contraseña incorrecta.',
    'auth/user-not-found': 'No existe una cuenta con ese email.',
    'auth/invalid-credential': 'Email o contraseña incorrectos.',
    'auth/email-already-in-use': 'Ya existe una cuenta con ese email. Ingresa en vez de crear una cuenta nueva.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/invalid-email': 'El email no es válido.',
    'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos e intenta de nuevo.'
  };

  function authErrorMessage(err) {
    return AUTH_ERROR_MESSAGES[err && err.code] || ('No se pudo completar la operación (' + ((err && err.message) || 'error desconocido') + ').');
  }

  function renderLoginScreen(root, onDone) {
    UI = CRM.UI;
    var mode = 'login';

    function draw() {
      root.innerHTML =
        '<div class="login-screen">' +
          '<div class="login-card">' +
            '<img src="assets/akzonobel-white.svg" alt="AkzoNobel" class="login-logo">' +
            '<h1>Marine &amp; Protective Coatings CRM</h1>' +
            '<p>' + (mode === 'login'
              ? 'Ingresa con tu email y contraseña. Tus datos se sincronizan entre tus dispositivos.'
              : 'Crea tu cuenta para sincronizar tu trabajo entre el celular y la computadora.') + '</p>' +
            '<form id="login-form" novalidate>' +
              '<div class="form-field" data-field="email">' +
                '<label>Email <span class="req">*</span></label>' +
                '<input type="email" name="email" autocomplete="email" required>' +
                '<span class="field-error"></span>' +
              '</div>' +
              '<div class="form-field" data-field="password">' +
                '<label>Contraseña <span class="req">*</span></label>' +
                '<input type="password" name="password" autocomplete="' + (mode === 'login' ? 'current-password' : 'new-password') + '" required minlength="6">' +
                '<span class="field-error"></span>' +
              '</div>' +
              (mode === 'signup' ?
                '<div class="form-field" data-field="name">' +
                  '<label>Tu nombre <span class="req">*</span></label>' +
                  '<input type="text" name="name" placeholder="Ej: Javier Muñoz" required>' +
                  '<span class="field-error"></span>' +
                '</div>' +
                '<div class="form-field" data-field="role">' +
                  '<label>Tu rol <span class="req">*</span></label>' +
                  '<select name="role">' + UI.renderSelectOptions(CRM.Users.ROLES, CRM.Users.ROLES[0]) + '</select>' +
                '</div>'
                : '') +
              '<p class="login-hint" id="login-general-error" style="display:none;color:var(--akzo-fuchsia)"></p>' +
              (mode === 'login' ? '<p class="login-hint">' + UI.icon('info') + 'Administrador: podrás consolidar y ver todo el equipo.</p>' : '') +
              '<button type="submit" class="btn btn-primary login-submit">' + UI.icon('log-in') + (mode === 'login' ? 'Entrar al CRM' : 'Crear cuenta') + '</button>' +
            '</form>' +
            '<p class="login-hint"><a href="#" id="toggle-auth-mode">' + (mode === 'login' ? '¿No tienes cuenta? Crear una' : '¿Ya tienes cuenta? Ingresar') + '</a></p>' +
          '</div>' +
        '</div>';

      UI.refreshIcons();

      document.getElementById('toggle-auth-mode').addEventListener('click', function (e) {
        e.preventDefault();
        mode = mode === 'login' ? 'signup' : 'login';
        draw();
      });

      document.getElementById('login-form').addEventListener('submit', function (e) {
        e.preventDefault();
        var form = e.target;
        var email = form.email.value.trim();
        var password = form.password.value;
        var errBox = document.getElementById('login-general-error');
        errBox.style.display = 'none';
        errBox.textContent = '';

        if (mode === 'signup' && !form.name.value.trim()) {
          var nameField = form.querySelector('[data-field="name"]');
          nameField.classList.add('invalid');
          nameField.querySelector('.field-error').textContent = 'Ingresa tu nombre';
          return;
        }

        var submitBtn = form.querySelector('.login-submit');
        submitBtn.disabled = true;

        var action = mode === 'login'
          ? auth.signInWithEmailAndPassword(email, password)
          : auth.createUserWithEmailAndPassword(email, password).then(function (cred) {
              return db.collection('users').doc(cred.user.uid).set({
                name: form.name.value.trim(),
                role: form.role.value
              });
            });

        action.then(function () {
          return refreshProfile(auth.currentUser);
        }).then(function (profile) {
          onDone(profile ? toUser(profile) : null);
        }).catch(function (err) {
          submitBtn.disabled = false;
          errBox.textContent = authErrorMessage(err);
          errBox.style.display = '';
        });
      });
    }

    draw();
  }

  CRM.Users.ensureSession = ensureSession;
  CRM.Users.getCurrentUser = getCurrentUser;
  CRM.Users.setCurrentUser = setCurrentUser;
  CRM.Users.clearCurrentUser = clearCurrentUser;
  CRM.Users.isAdmin = isAdmin;
  CRM.Users.getActiveFilter = getActiveFilter;
  CRM.Users.setActiveFilter = setActiveFilter;
  CRM.Users.renderLoginScreen = renderLoginScreen;

})(window);
