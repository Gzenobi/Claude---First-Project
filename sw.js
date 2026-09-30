/* ==========================================================================
   sw.js — Service worker para instalar el CRM como app (PWA) y que siga
   funcionando sin conexión tras la primera carga.

   Estrategia: cache-first solo para los archivos propios del proyecto
   (precacheados en install). Cualquier otra petición (por ejemplo, las que
   hace el SDK de Firebase hacia Auth/Firestore cuando la sincronización en
   la nube está activa) NO se intercepta — sigue de largo a la red, tal cual
   el navegador la haría sin este service worker.

   Al modificar cualquier archivo listado en PRECACHE_URLS hay que subir
   CACHE_VERSION para que los navegadores ya instalados bajen la versión
   nueva (si no, seguirían sirviendo los archivos viejos desde caché).
   ========================================================================== */
'use strict';

var CACHE_VERSION = 'v1';
var CACHE_NAME = 'akzonobel-crm-' + CACHE_VERSION;

var PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/firebase-config.js',
  './js/cloud.js',
  './js/storage.js',
  './js/storage-cloud.js',
  './js/ui.js',
  './js/users.js',
  './js/users-cloud.js',
  './js/mockData.js',
  './js/charts.js',
  './js/kanban.js',
  './js/dashboard.js',
  './js/clients.js',
  './js/projects.js',
  './js/activities.js',
  './js/materials.js',
  './js/team.js',
  './js/export.js',
  './js/import.js',
  './js/router.js',
  './js/app.js',
  './vendor/chart.umd.js',
  './vendor/xlsx.full.min.js',
  './vendor/Sortable.min.js',
  './vendor/lucide.min.js',
  './vendor/firebase-app-compat.js',
  './vendor/firebase-auth-compat.js',
  './vendor/firebase-firestore-compat.js',
  './assets/akzonobel-white.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-192.png',
  './assets/icons/icon-maskable-512.png',
  './assets/icons/apple-touch-icon.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(PRECACHE_URLS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (key) { return key !== CACHE_NAME; }).map(function (key) { return caches.delete(key); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // no tocar Firebase/otros orígenes

  event.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        // Cachear también archivos propios no listados explícitamente
        // (p.ej. si se agrega uno nuevo y todavía no se subió CACHE_VERSION).
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      }).catch(function () {
        if (req.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
