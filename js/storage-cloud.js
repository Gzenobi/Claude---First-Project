/* ==========================================================================
   storage-cloud.js — Reemplaza CRM.Storage por una implementación respaldada
   en Firestore, pero SOLO si CRM.Cloud.isConfigured() es true (un proyecto
   Firebase real fue configurado en js/firebase-config.js). Si no hay
   configuración real, este archivo no hace nada y storage.js (IndexedDB)
   sigue siendo la implementación activa.

   Mantiene exactamente la misma API pública que storage.js para que el
   resto de la app (dashboard.js, clients.js, export.js, etc.) no necesite
   cambios: getAll, getOne, put, bulkPut, remove, clearStore, count, wipeAll,
   exportFullSnapshot, getConfig/setConfig (se dejan locales, son solo
   preferencias de UI), backupToLocalStorage/getBackupInfo/restoreFromLocalStorage
   (no aplican en modo nube — Firestore ya es la fuente de verdad compartida).
   ========================================================================== */
(function (global) {
  'use strict';

  var CRM = global.CRM = global.CRM || {};
  var BATCH_LIMIT = 400;

  function ready() { return !!(CRM.Cloud && CRM.Cloud.isConfigured()); }
  function db() { return CRM.Cloud.getDb(); }
  function auth() { return CRM.Cloud.getAuth(); }
  function currentUid() { var u = auth().currentUser; return u ? u.uid : null; }
  function isSharedStore(storeName) { return storeName === 'materials'; }
  function colRef(storeName) { return db().collection(storeName); }

  function docToItem(doc) {
    var data = doc.data() || {};
    data.id = doc.id;
    return data;
  }

  function getAll(storeName) {
    var ref = colRef(storeName);
    if (!isSharedStore(storeName) && !CRM.Users.isAdmin()) {
      var uid = currentUid();
      ref = ref.where('ownerId', 'in', [uid, 'seed']);
    }
    return ref.get().then(function (snap) {
      var out = [];
      snap.forEach(function (doc) { out.push(docToItem(doc)); });
      return out;
    });
  }

  function getOne(storeName, id) {
    return colRef(storeName).doc(id).get().then(function (doc) {
      return doc.exists ? docToItem(doc) : null;
    });
  }

  function stripId(item) {
    var copy = {};
    Object.keys(item).forEach(function (k) { if (k !== 'id') copy[k] = item[k]; });
    return copy;
  }

  function ownerIdFor(item) {
    if (item.ownerId) return item.ownerId;
    if (item.origenUsuario === CRM.Users.SEED_LABEL) return 'seed';
    return currentUid();
  }

  function put(storeName, item) {
    var toSave = stripId(item);
    if (!isSharedStore(storeName)) toSave.ownerId = ownerIdFor(item);
    return colRef(storeName).doc(item.id).set(toSave).then(function () {
      return item;
    });
  }

  function bulkPut(storeName, items) {
    var chunks = [];
    for (var i = 0; i < items.length; i += BATCH_LIMIT) chunks.push(items.slice(i, i + BATCH_LIMIT));
    return chunks.reduce(function (chain, chunk) {
      return chain.then(function () {
        var batch = db().batch();
        chunk.forEach(function (item) {
          var toSave = stripId(item);
          if (!isSharedStore(storeName)) toSave.ownerId = ownerIdFor(item);
          batch.set(colRef(storeName).doc(item.id), toSave);
        });
        return batch.commit();
      });
    }, Promise.resolve()).then(function () { return items; });
  }

  function remove(storeName, id) {
    return colRef(storeName).doc(id).delete().then(function () { return true; });
  }

  function clearStore(storeName) {
    return colRef(storeName).get().then(function (snap) {
      var batch = db().batch();
      snap.forEach(function (doc) { batch.delete(doc.ref); });
      return batch.commit();
    }).then(function () { return true; });
  }

  function count(storeName) {
    return getAll(storeName).then(function (list) { return list.length; });
  }

  function wipeAll() {
    return Promise.all(CRM.Storage.STORES.map(clearStore));
  }

  function exportFullSnapshot() {
    return Promise.all(CRM.Storage.STORES.map(getAll)).then(function (results) {
      var snapshot = { version: 1, exportedAt: new Date().toISOString() };
      CRM.Storage.STORES.forEach(function (name, i) { snapshot[name] = results[i]; });
      return snapshot;
    });
  }

  function noopBackup() { return Promise.resolve(null); }
  function noBackupInfo() { return null; }
  function restoreNotSupported() {
    return Promise.reject(new Error('El backup local no aplica en modo nube: tus datos ya están sincronizados en Firestore.'));
  }

  function install() {
    if (!ready()) return;
    CRM.Storage.init = function () { return Promise.resolve(); };
    CRM.Storage.getAll = getAll;
    CRM.Storage.getOne = getOne;
    CRM.Storage.put = put;
    CRM.Storage.bulkPut = bulkPut;
    CRM.Storage.remove = remove;
    CRM.Storage.clearStore = clearStore;
    CRM.Storage.wipeAll = wipeAll;
    CRM.Storage.count = count;
    CRM.Storage.exportFullSnapshot = exportFullSnapshot;
    CRM.Storage.backupToLocalStorage = noopBackup;
    CRM.Storage.getBackupInfo = noBackupInfo;
    CRM.Storage.restoreFromLocalStorage = restoreNotSupported;
  }

  install();

})(window);
