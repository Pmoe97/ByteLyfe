/* =====================================================================
 * 00-util.js — shared helpers: randomness, numbers, money, text.
 * Pure (no DOM). Every later file may use these.
 * ===================================================================== */

/* ---- randomness ----------------------------------------------------
 * Everything random goes through rand() so the verify harness can seed it. */
let _rng = Math.random;
function seedRng(seed) {
  let a = (seed >>> 0) || 1;
  _rng = function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function unseedRng() { _rng = Math.random; }
function rand() { return _rng(); }
function randInt(lo, hi) { return lo + Math.floor(rand() * (hi - lo + 1)); }
function randFloat(lo, hi) { return lo + rand() * (hi - lo); }
function chance(p) { return rand() < p; }
function pick(arr) { return arr && arr.length ? arr[Math.floor(rand() * arr.length)] : undefined; }
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}
function pickN(arr, n) { return shuffle(arr.slice()).slice(0, n); }
// weighted(items, item => weight). Returns null when nothing has weight.
function weighted(items, weightOf) {
  let total = 0;
  const ws = items.map((it) => {
    const w = Math.max(0, Number(weightOf ? weightOf(it) : (it.w ?? 1)) || 0);
    total += w;
    return w;
  });
  if (total <= 0) return null;
  let r = rand() * total;
  for (let i = 0; i < items.length; i++) {
    r -= ws[i];
    if (r < 0) return items[i];
  }
  return items[items.length - 1];
}
function gauss(mean, sd) {
  let u = 0, v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* ---- numbers ------------------------------------------------------- */
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function clamp100(v) { return clamp(Math.round(v), 0, 100); }
function sum(arr, f) { let t = 0; for (const x of arr) t += f ? f(x) : x; return t; }
// Round a price to something a shop would actually charge.
function nicePrice(n) {
  const a = Math.abs(n);
  const step = a < 50 ? 1 : a < 500 ? 5 : a < 5000 ? 10 : a < 50000 ? 100 : a < 500000 ? 1000 : a < 5e6 ? 10000 : 100000;
  return Math.round(n / step) * step;
}

/* ---- money --------------------------------------------------------- */
function fmtMoney(n) {
  const neg = n < 0;
  return (neg ? '-$' : '$') + Math.round(Math.abs(n)).toLocaleString('en-US');
}
function fmtMoneyShort(n) {
  const neg = n < 0;
  const a = Math.abs(n);
  let out;
  const f = (v, sfx) => (v >= 100 ? Math.round(v) : Math.round(v * 10) / 10) + sfx;
  if (a >= 1e12) out = f(a / 1e12, 'T');
  else if (a >= 1e9) out = f(a / 1e9, 'B');
  else if (a >= 1e6) out = f(a / 1e6, 'M');
  else if (a >= 1e5) out = f(a / 1e3, 'K');
  else out = Math.round(a).toLocaleString('en-US');
  return (neg ? '-$' : '$') + out;
}
function fmtNum(n) {
  const a = Math.abs(n);
  if (a >= 1e9) return (Math.round(n / 1e8) / 10) + 'B';
  if (a >= 1e6) return (Math.round(n / 1e5) / 10) + 'M';
  if (a >= 1e4) return (Math.round(n / 100) / 10) + 'K';
  return Math.round(n).toLocaleString('en-US');
}

/* ---- text ---------------------------------------------------------- */
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function cap(s) { s = String(s ?? ''); return s.charAt(0).toUpperCase() + s.slice(1); }
// vary('You {walked|strolled} home.') picks one option per {a|b|c} group, innermost first.
function vary(str) {
  let out = String(str ?? '');
  const re = /\{([^{}]*)\}/;
  let guard = 0;
  while (re.test(out) && guard++ < 60) out = out.replace(re, (m, body) => pick(body.split('|')));
  return out;
}
function aAn(word) { return (/^[aeiou]/i.test(String(word)) ? 'an ' : 'a ') + word; }
function plural(n, one, many) { return n === 1 ? one : (many || one + 's'); }
function nOf(n, one, many) { return n + ' ' + plural(n, one, many); }
function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
function listJoin(arr) {
  if (arr.length <= 1) return arr.join('');
  return arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1];
}
function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const ZODIAC = [
  ['Capricorn', 1, 19], ['Aquarius', 2, 18], ['Pisces', 3, 20], ['Aries', 4, 19], ['Taurus', 5, 20], ['Gemini', 6, 20],
  ['Cancer', 7, 22], ['Leo', 8, 22], ['Virgo', 9, 22], ['Libra', 10, 22], ['Scorpio', 11, 21], ['Sagittarius', 12, 21],
];
function zodiacOf(month, day) {
  // month 1..12. Each row is the sign that runs up to (month, day).
  for (let i = 0; i < ZODIAC.length; i++) {
    const [name, m, d] = ZODIAC[i];
    if (month === m) return day <= d ? name : ZODIAC[(i + 1) % 12][0];
  }
  return 'Capricorn';
}
