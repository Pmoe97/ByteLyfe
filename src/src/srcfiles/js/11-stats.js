/* =====================================================================
 * 11-stats.js — changing stats, skills, karma, fame; traits; snapshots.
 *
 * add(s, { happy: 5, money: -200, karma: 2, coding: 3 }) is the one way
 * event content changes the player. Keys: the four stats, money, karma,
 * fame, or any skill id.
 * ===================================================================== */

const STAT_KEYS = ['happy', 'health', 'smarts', 'looks'];
const STAT_INFO = {
  happy: { name: 'Happiness', emoji: '😊' },
  health: { name: 'Health', emoji: '❤️' },
  smarts: { name: 'Smarts', emoji: '🧠' },
  looks: { name: 'Looks', emoji: '✨' },
  karma: { name: 'Karma', emoji: '☯️' },
  fame: { name: 'Fame', emoji: '⭐' },
  money: { name: 'Money', emoji: '💵' },
};

function add(s, d) {
  const p = P(s), m = M(s);
  for (const k in d) {
    const v = d[k];
    if (!v || typeof v !== 'number' || !isFinite(v)) continue;
    if (STAT_KEYS.includes(k)) {
      let delta = v;
      if (k === 'smarts' && v > 0 && hasTrait(p, 'bookworm')) delta *= 1.4;
      if (k === 'happy' && v > 0 && hasTrait(p, 'anxious')) delta *= 0.85;
      p.stats[k] = clamp100(p.stats[k] + delta);
    } else if (k === 'money') {
      m.money = Math.round(m.money + v);
    } else if (k === 'karma') {
      m.karma = clamp100(m.karma + (v > 0 && hasTrait(p, 'kind') ? v * 1.4 : v));
    } else if (k === 'fame') {
      m.fame = clamp100(m.fame + v);
    } else if (SKILLS[k]) {
      addSkill(s, k, v);
    }
  }
}

function hasTrait(p, t) { return !!(p && p.traits && p.traits.includes(t)); }
function trait(s, t) { return hasTrait(P(s), t); }

function skill(s, k) { return M(s).skills[k] || 0; }
function addSkill(s, k, v) {
  const m = M(s), p = P(s);
  const cur = m.skills[k] || 0;
  let gain = v;
  if (v > 0) {
    if (hasTrait(p, 'creative') && CREATIVE_SKILLS.includes(k)) gain *= 1.4;
    if (hasTrait(p, 'athletic') && (k === 'fitness' || k === 'athletics' || k === 'martial')) gain *= 1.4;
    if (hasTrait(p, 'bookworm') && (k === 'writing' || k === 'coding')) gain *= 1.2;
    if (hasTrait(p, 'charming') && k === 'charisma') gain *= 1.3;
    if (hasTrait(p, 'cunning') && k === 'streetwise') gain *= 1.3;
    gain *= Math.max(0.15, 1 - cur / 125); // diminishing returns near the top
  }
  m.skills[k] = clamp(Math.round((cur + gain) * 10) / 10, 0, 100);
}

/* ---- snapshots: show the player what an action changed ------------- */
function snapStats(s) {
  const p = P(s), m = M(s);
  return { happy: p.stats.happy, health: p.stats.health, smarts: p.stats.smarts, looks: p.stats.looks, money: m.money, karma: m.karma, fame: m.fame };
}
function diffStats(a, b) {
  const out = [];
  for (const k of ['happy', 'health', 'smarts', 'looks', 'karma', 'fame', 'money']) {
    const d = Math.round(b[k] - a[k]);
    if (d) out.push([k, d]);
  }
  return out;
}

/* ---- traits -------------------------------------------------------- */
function traitsConflict(list, t) {
  return TRAIT_CONFLICTS.some(([a, b]) => (t === a && list.includes(b)) || (t === b && list.includes(a)));
}
function randomTraits(n) {
  const out = [];
  let guard = 0;
  while (out.length < n && guard++ < 50) {
    const t = pick(TRAIT_IDS);
    if (!out.includes(t) && !traitsConflict(out, t)) out.push(t);
  }
  return out;
}
// Children inherit a trait from a parent half the time.
function inheritTraits(a, b) {
  const pool = [...(a ? a.traits : []), ...(b ? b.traits : [])];
  const out = [];
  if (pool.length && chance(0.55)) out.push(pick(pool));
  const extra = randomTraits(3);
  for (const t of extra) {
    if (out.length >= randInt(1, 3)) break;
    if (!out.includes(t) && !traitsConflict(out, t)) out.push(t);
  }
  return out.length ? out : randomTraits(1);
}

function statRoll(mean) { return clamp100(gauss(mean ?? 55, 20)); }
