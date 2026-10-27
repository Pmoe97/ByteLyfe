/* =====================================================================
 * 29-save.js — storage. Saves go to the Perchance kv-plugin (root.kv)
 * when present, else localStorage, else memory (the Node harness).
 *
 *   kv folder 'saves'  : life id -> JSON string of the state
 *   kv folder 'rewind' : life id -> JSON array of snapshots
 *   kv folder 'meta'   : 'index' (save list), 'achievements', 'graveyard', 'settings', 'challenges'
 *
 * META is the in-memory copy of everything in 'meta' except the index.
 * ===================================================================== */

const META = {
  settings: { theme: 'auto', textSize: 'medium', showHidden: true, autoPopups: false, confirmAge: false, reduceMotion: false, currency: 'local', godMode: true, language: 'clean', chaos: false, mature: false, mature_intimacy: false, mature_substances: false, mature_adultwork: false, taboo: false, taboo_parent: false, taboo_step: false, taboo_sibling: false, taboo_child: false, taboo_grand: false, taboo_extended: false, taboo_inlaw: false },
  achievements: {}, // id -> first unlock time
  graveyard: [], // past lives, newest first
  challenges: { done: {}, daily: { last: null, streak: 0, best: 0 }, history: [] }, // 52-challenges.js
};

const Store = (() => {
  const mem = {};
  function kv() {
    try {
      if (typeof window === 'undefined') return null;
      return (window.root && window.root.kv) || window.kv || null;
    } catch (e) { return null; }
  }
  function local() {
    try {
      if (typeof localStorage === 'undefined') return null;
      localStorage.setItem('bytelyfe:probe', '1');
      localStorage.removeItem('bytelyfe:probe');
      return localStorage;
    } catch (e) { return null; }
  }
  const lsKey = (f, k) => 'bytelyfe:' + f + ':' + k;
  return {
    kind() { return kv() ? 'kv' : local() ? 'local' : 'memory'; },
    async get(f, k) {
      const K = kv();
      if (K) { try { const v = await K[f].get(k); return v === undefined ? null : v; } catch (e) { console.warn('[ByteLyfe] kv get failed', e); } }
      const ls = local();
      if (ls) return ls.getItem(lsKey(f, k));
      return mem[lsKey(f, k)] ?? null;
    },
    async set(f, k, v) {
      const K = kv();
      if (K) { try { await K[f].set(k, v); return true; } catch (e) { console.warn('[ByteLyfe] kv set failed', e); } }
      const ls = local();
      if (ls) { try { ls.setItem(lsKey(f, k), v); return true; } catch (e) { console.warn('[ByteLyfe] localStorage full?', e); return false; } }
      mem[lsKey(f, k)] = v;
      return true;
    },
    async del(f, k) {
      const K = kv();
      if (K) { try { await K[f].delete(k); return true; } catch (e) { console.warn('[ByteLyfe] kv delete failed', e); } }
      const ls = local();
      if (ls) { ls.removeItem(lsKey(f, k)); return true; }
      delete mem[lsKey(f, k)];
      return true;
    },
  };
})();

async function getJSON(f, k, fallback) {
  try {
    const v = await Store.get(f, k);
    if (v == null) return fallback;
    return typeof v === 'string' ? JSON.parse(v) : v;
  } catch (e) {
    console.warn('[ByteLyfe] bad saved data at', f, k, e);
    return fallback;
  }
}
function setJSON(f, k, v) { return Store.set(f, k, JSON.stringify(v)); }

async function loadMeta() {
  const [settings, ach, grave, chal] = await Promise.all([getJSON('meta', 'settings', null), getJSON('meta', 'achievements', null), getJSON('meta', 'graveyard', null), getJSON('meta', 'challenges', null)]);
  if (settings) Object.assign(META.settings, settings);
  if (ach) META.achievements = ach;
  if (Array.isArray(grave)) META.graveyard = grave;
  if (chal && chal.daily) META.challenges = Object.assign(META.challenges, chal);
}
let _metaTimer = null;
function saveMetaSoon() {
  if (_metaTimer) clearTimeout(_metaTimer);
  _metaTimer = setTimeout(() => {
    _metaTimer = null;
    setJSON('meta', 'settings', META.settings);
    setJSON('meta', 'achievements', META.achievements);
    setJSON('meta', 'graveyard', META.graveyard.slice(0, 200));
    setJSON('meta', 'challenges', META.challenges);
  }, 400);
}
// Engine hooks. Return true when an achievement is new across all lives.
function onAchievement(id) {
  if (META.achievements[id]) return false;
  META.achievements[id] = Date.now();
  saveMetaSoon();
  return true;
}
function onLifeEnded(s, rec) {
  META.graveyard.unshift(Object.assign({ lifeId: s.id, when: Date.now() }, rec));
  saveMetaSoon();
}

/* ---- life saves ---------------------------------------------------- */
function saveSummary(s) {
  const p = P(s);
  return { id: s.id, name: fullName(p), age: A(s), year: s.year, gen: s.gen, dead: s.dead, flag: country(s).flag, job: jobTitle(s), money: M(s).money, updated: Date.now(), gender: p.gender, look: p.look };
}
async function listLives() {
  const idx = await getJSON('meta', 'index', []);
  return (Array.isArray(idx) ? idx : []).sort((a, b) => b.updated - a.updated);
}
async function saveLife(s) {
  if (!s || !s.player) return false;
  s.updated = Date.now();
  const ok = await setJSON('saves', s.id, s);
  const idx = (await listLives()).filter((x) => x.id !== s.id);
  idx.unshift(saveSummary(s));
  await setJSON('meta', 'index', idx.slice(0, 50));
  if (REWIND[s.id]) await setJSON('rewind', s.id, REWIND[s.id].slice(-5));
  return ok;
}
async function loadLife(id) {
  const s = await getJSON('saves', id, null);
  if (!s || !s.player) return null;
  migrate(s);
  const rw = await getJSON('rewind', id, null);
  if (Array.isArray(rw)) REWIND[id] = rw;
  return s;
}
async function deleteLife(id) {
  await Store.del('saves', id);
  await Store.del('rewind', id);
  delete REWIND[id];
  const idx = (await listLives()).filter((x) => x.id !== id);
  await setJSON('meta', 'index', idx);
}
// Fill in fields added after a save was written.
function migrate(s) {
  const fresh = newPlayerBlock();
  for (const k in fresh) if (s.player[k] === undefined) s.player[k] = fresh[k];
  if (!s.listings) s.listings = {};
  if (!s.pets) s.pets = {};
  if (!s.lineage) s.lineage = [];
  ensureAllLooks(s);
  s.v = SAVE_VERSION;
  return s;
}

/* ---- export / import (copy-paste text) ------------------------------ */
function b64enc(str) {
  if (typeof Buffer !== 'undefined' && typeof window === 'undefined') return Buffer.from(str, 'utf8').toString('base64');
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
function b64dec(b64) {
  if (typeof Buffer !== 'undefined' && typeof window === 'undefined') return Buffer.from(b64, 'base64').toString('utf8');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}
function exportLife(s) { return 'BYTELYFE1:' + b64enc(JSON.stringify(s)); }
function importLife(text) {
  const t = String(text || '').trim();
  const body = t.startsWith('BYTELYFE1:') ? t.slice(10) : t;
  let s;
  try { s = JSON.parse(t.startsWith('{') ? t : b64dec(body)); } catch (e) { return null; }
  if (!s || !s.player || !s.people || !s.playerId) return null;
  s.id = 'life_' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  return migrate(s);
}
