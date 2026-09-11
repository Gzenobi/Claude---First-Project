/* ==========================================================================
   storage.js — Persistence layer (IndexedDB for datasets, LocalStorage for
   UI config). Exposes window.CRM.Storage.
   ========================================================================== */
(function (global) {
  'use strict';

  var CRM = global.CRM = global.CRM || {};

  var DB_NAME = 'akzonobel_crm_db';
  var DB_VERSION = 1;
  var STORES = ['clients', 'projects', 'activities'];
  var LS_CONFIG_KEY = 'akzo_crm_config';
  var LS_BACKUP_KEY = 'akzo_crm_backup';
  var LS_SCHEMA_KEY = 'akzo_crm_schema_version';
  var SCHEMA_VERSION = 1;

  var _db = null;
  var _backupTimer = null;

  /* ---------------- IndexedDB core ---------------- */

  function openDb() {
    return new Promise(function (resolve, reject) {
      if (_db) return resolve(_db);
      if (!global.indexedDB) return reject(new Error('IndexedDB no disponible en este navegador'));

      var req = global.indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        STORES.forEach(function (name) {
          if (!db.objectStoreNames.contains(name)) {
            var store = db.createObjectStore(name, { keyPath: 'id' });
            store.createIndex('updatedAt', 'updatedAt', { unique: false });
          }
        });
      };

      req.onsuccess = function (e) {
        _db = e.target.result;
        resolve(_db);
      };

      req.onerror = function (e) {
        reject(e.target.error || new Error('No se pudo abrir la base de datos local'));
      };
    });
  }

  function tx(storeName, mode) {
    return openDb().then(function (db) {
      return db.transaction(storeName, mode).objectStore(storeName);
    });
  }

  function getAll(storeName) {
    return tx(storeName, 'readonly').then(function (store) {
      return new Promise(function (resolve, reject) {
        var req = store.getAll();
        req.onsuccess = function () { resolve(req.result || []); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function getOne(storeName, id) {
    return tx(storeName, 'readonly').then(function (store) {
      return new Promise(function (resolve, reject) {
        var req = store.get(id);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function put(storeName, item) {
    return tx(storeName, 'readwrite').then(function (store) {
      return new Promise(function (resolve, reject) {
        var req = store.put(item);
        req.onsuccess = function () { resolve(item); };
        req.onerror = function () { reject(req.error); };
      });
    }).then(function (item) {
      scheduleBackup();
      return item;
    });
  }

  function bulkPut(storeName, items) {
    return tx(storeName, 'readwrite').then(function (store) {
      return new Promise(function (resolve, reject) {
        var tr = store.transaction;
        items.forEach(function (item) { store.put(item); });
        tr.oncomplete = function () { resolve(items); };
        tr.onerror = function () { reject(tr.error); };
      });
    }).then(function (items) {
      scheduleBackup();
      return items;
    });
  }

  function remove(storeName, id) {
    return tx(storeName, 'readwrite').then(function (store) {
      return new Promise(function (resolve, reject) {
        var req = store.delete(id);
        req.onsuccess = function () { resolve(true); };
        req.onerror = function () { reject(req.error); };
      });
    }).then(function (r) {
      scheduleBackup();
      return r;
    });
  }

  function clearStore(storeName) {
    return tx(storeName, 'readwrite').then(function (store) {
      return new Promise(function (resolve, reject) {
        var req = store.clear();
        req.onsuccess = function () { resolve(true); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function count(storeName) {
    return tx(storeName, 'readonly').then(function (store) {
      return new Promise(function (resolve, reject) {
        var req = store.count();
        req.onsuccess = function () { resolve(req.result || 0); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  /* ---------------- LocalStorage config ---------------- */

  function readConfigBlob() {
    try {
      return JSON.parse(global.localStorage.getItem(LS_CONFIG_KEY) || '{}');
    } catch (e) { return {}; }
  }

  function getConfig(key, defaultValue) {
    var blob = readConfigBlob();
    return Object.prototype.hasOwnProperty.call(blob, key) ? blob[key] : defaultValue;
  }

  function setConfig(key, value) {
    var blob = readConfigBlob();
    blob[key] = value;
    try {
      global.localStorage.setItem(LS_CONFIG_KEY, JSON.stringify(blob));
    } catch (e) { /* storage full or blocked — ignore, UI state is non-critical */ }
  }

  /* ---------------- Backup / restore / versioning ---------------- */

  function scheduleBackup() {
    clearTimeout(_backupTimer);
    _backupTimer = setTimeout(backupToLocalStorage, 600);
  }

  function backupToLocalStorage() {
    return Promise.all(STORES.map(getAll)).then(function (results) {
      var snapshot = {
        version: SCHEMA_VERSION,
        savedAt: new Date().toISOString(),
        data: {
          clients: results[0],
          projects: results[1],
          activities: results[2]
        }
      };
      try {
        global.localStorage.setItem(LS_BACKUP_KEY, JSON.stringify(snapshot));
        global.localStorage.setItem(LS_SCHEMA_KEY, String(SCHEMA_VERSION));
      } catch (e) { /* quota exceeded — skip silently, IndexedDB is source of truth */ }
      return snapshot;
    });
  }

  function getBackupInfo() {
    try {
      var raw = global.localStorage.getItem(LS_BACKUP_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return { version: parsed.version, savedAt: parsed.savedAt };
    } catch (e) { return null; }
  }

  function restoreFromLocalStorage() {
    try {
      var raw = global.localStorage.getItem(LS_BACKUP_KEY);
      if (!raw) return Promise.reject(new Error('No hay backup disponible'));
      var parsed = JSON.parse(raw);
      return Promise.all([
        clearStore('clients').then(function () { return bulkPut('clients', parsed.data.clients || []); }),
        clearStore('projects').then(function () { return bulkPut('projects', parsed.data.projects || []); }),
        clearStore('activities').then(function () { return bulkPut('activities', parsed.data.activities || []); })
      ]);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  function exportFullSnapshot() {
    return Promise.all(STORES.map(getAll)).then(function (results) {
      return {
        version: SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        clients: results[0],
        projects: results[1],
        activities: results[2]
      };
    });
  }

  /* ---------------- Public API ---------------- */

  CRM.Storage = {
    init: openDb,
    getAll: getAll,
    getOne: getOne,
    put: put,
    bulkPut: bulkPut,
    remove: remove,
    clearStore: clearStore,
    count: count,
    getConfig: getConfig,
    setConfig: setConfig,
    backupToLocalStorage: backupToLocalStorage,
    restoreFromLocalStorage: restoreFromLocalStorage,
    getBackupInfo: getBackupInfo,
    exportFullSnapshot: exportFullSnapshot,
    STORES: STORES
  };

})(window);
