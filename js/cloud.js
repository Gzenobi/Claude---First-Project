// CRM.Cloud — gate + bootstrap para el modo de sincronización en la nube (Firebase).
// Todo el resto del CRM sigue funcionando en modo 100% local si este módulo
// determina que no hay una configuración real (isConfigured() === false).
(function () {
  var app = null;
  var auth = null;
  var db = null;
  var initialized = false;

  var PLACEHOLDER_VALUES = [
    'TU_API_KEY', 'TU_PROYECTO', 'TU_PROYECTO.firebaseapp.com',
    'TU_PROYECTO.appspot.com', 'TU_SENDER_ID', 'TU_APP_ID', ''
  ];

  function isConfigured() {
    var cfg = window.CRM_FIREBASE_CONFIG;
    if (!cfg) return false;
    if (typeof window.firebase === 'undefined') return false;
    var required = ['apiKey', 'authDomain', 'projectId', 'appId'];
    for (var i = 0; i < required.length; i++) {
      var val = cfg[required[i]];
      if (!val || PLACEHOLDER_VALUES.indexOf(val) !== -1) return false;
    }
    return true;
  }

  function init() {
    if (initialized) return true;
    if (!isConfigured()) return false;

    app = firebase.initializeApp(window.CRM_FIREBASE_CONFIG);
    auth = firebase.auth();
    db = firebase.firestore();

    // Hook de pruebas: si se define window.CRM_FIREBASE_EMULATOR, conectar
    // a los emuladores locales en vez de proyectos reales. No se activa en
    // uso normal (el archivo de configuración de producción no lo define).
    var em = window.CRM_FIREBASE_EMULATOR;
    if (em) {
      auth.useEmulator('http://' + (em.host || 'localhost') + ':' + (em.authPort || 9099), { disableWarnings: true });
      db.useEmulator(em.host || 'localhost', em.firestorePort || 8080);
    }

    initialized = true;
    return true;
  }

  function getAuth() {
    if (!initialized) init();
    return auth;
  }

  function getDb() {
    if (!initialized) init();
    return db;
  }

  window.CRM = window.CRM || {};
  window.CRM.Cloud = {
    isConfigured: isConfigured,
    init: init,
    getAuth: getAuth,
    getDb: getDb
  };
})();
