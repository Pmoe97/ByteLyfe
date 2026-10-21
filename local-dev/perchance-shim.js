// Perchance shim for local development — injected by local-dev/server.mjs, never part of
// index.html. On Perchance the page shell provides `window.root`, and `root.kv` is the
// kv-plugin imported in main.pjs. Locally neither exists, so this defines an IndexedDB-backed
// stand-in with the same surface the game uses: root.kv.<folder>.get/set/delete/keys.
(function () {
  'use strict';
  if (window.root && window.root.kv) return;

  var DB = 'bytelyfe_local_kv', STORE = 'kv', SEP = '\u0000';
  var dbp = null;
  function open() {
    if (!dbp) {
      dbp = new Promise(function (resolve, reject) {
        var r = indexedDB.open(DB, 1);
        r.onupgradeneeded = function () { r.result.createObjectStore(STORE); };
        r.onsuccess = function () { resolve(r.result); };
        r.onerror = function () { reject(r.error); };
      });
    }
    return dbp;
  }
  function run(mode, fn) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var req = fn(db.transaction(STORE, mode).objectStore(STORE));
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }
  function folder(name) {
    var prefix = name + SEP;
    return {
      get: function (k) { return run('readonly', function (s) { return s.get(prefix + k); }).then(function (v) { return v === undefined ? null : v; }); },
      set: function (k, v) { return run('readwrite', function (s) { return s.put(v, prefix + k); }).then(function () { return v; }); },
      delete: function (k) { return run('readwrite', function (s) { return s.delete(prefix + k); }).then(function () { return true; }); },
      keys: function () {
        return run('readonly', function (s) { return s.getAllKeys(); }).then(function (all) {
          return (all || []).filter(function (k) { return String(k).indexOf(prefix) === 0; }).map(function (k) { return String(k).slice(prefix.length); });
        });
      },
    };
  }
  var folders = {};
  var kv = new Proxy({}, {
    get: function (_, name) {
      if (typeof name !== 'string') return undefined;
      return folders[name] || (folders[name] = folder(name));
    },
  });
  window.root = window.root || {};
  window.root.kv = kv;
  console.log('[local-dev] kv shim active: saves persist to IndexedDB (' + DB + ').');
})();
