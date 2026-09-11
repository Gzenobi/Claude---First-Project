// Configuración de Firebase (OPCIONAL) — sincronización en la nube entre dispositivos.
//
// Por defecto el CRM funciona 100% local (IndexedDB) sin tocar este archivo.
// Para activar la sincronización en la nube (varios dispositivos, login real
// por email/contraseña), reemplaza los valores de abajo por los de tu propio
// proyecto Firebase — ver "Sincronización en la nube" en README.md.
//
// Mientras los valores sean los de ejemplo (o falten), el CRM detecta que no
// hay configuración real y sigue funcionando en modo local sin errores.
window.CRM_FIREBASE_CONFIG = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};
