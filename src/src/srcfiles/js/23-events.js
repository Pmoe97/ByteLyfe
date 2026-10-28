/* =====================================================================
 * 23-events.js — the random-event engine. Content lives in 30-3x files.
 *
 * EV(id, {
 *   ages: [min, max],             player age range
 *   w: 2 | (s) => number,         weight when eligible (default 1)
 *   when: (s) => bool,            extra condition
 *   ctx: (s) => ({ pid }) | null, pick who/what is involved (null = skip); must be JSON
 *   emoji, title,
 *   text: 'string with {a|b}' | (s, c) => string,
 *   choices: [ ['Label', (s, c) => outcome], { label, sub, when, tags, fx } ],
 *   auto: (s, c) => extra text,   no choices: just happens (logged)
 *   popup: true,                  show an auto event as a popup too
 *   tags: ['chaos'],              content tags (see CONTENT_TAGS in 12-flow.js);
 *                                 on a choice, hides just that choice
 *   once: true, cooldown: years (default 3), prison: true (only in prison)
 *   sure: true,                   fires the year it is eligible, before the random draws (history's dated events)
 *   w: history events (id wd_) default to 10, everything else to 1
 * })
 * ===================================================================== */

const EVENTS = {};
const EVENT_IDS = [];
function EV(id, def) {
  def.id = id;
  EVENTS[id] = def;
  EVENT_IDS.push(id);
}

function eventEligible(s, ev) {
  const a = bodyAge(s, P(s)); // a vampire's events follow the age they look
  if (ev.ages && (a < ev.ages[0] || a > ev.ages[1])) return false;
  if (!!ev.prison !== inPrison(s)) return false;
  if (!tagsOn(ev.tags)) return false;
  if (ev.lang && langLevel() < ev.lang) return false; // only at this setting of the language dial or above
  const hist = M(s).evHist || (M(s).evHist = {});
  if (ev.once && hist[ev.id]) return false;
  if (hist[ev.id] && s.year - hist[ev.id] < (ev.cooldown ?? 3)) return false;
  try {
    if (ev.when && !ev.when(s)) return false;
  } catch (e) {
    console.error('[ByteLyfe] event when() failed:', ev.id, e);
    return false;
  }
  return true;
}
// The events of history (wd_, 89-world-events*.js) weigh more than the everyday ones, or a life would seldom meet them.
function eventWeight(s, ev) { return typeof ev.w === 'function' ? ev.w(s) : (ev.w ?? (ev.id.startsWith('wd_') ? 10 : 1)); }

function rollYearEvents(s) {
  const a = A(s);
  const n = a < 3 ? (chance(0.6) ? 1 : 0) : 1 + (chance(0.6) ? 1 : 0) + (chance(0.25) ? 1 : 0);
  const pool = EVENT_IDS.map((id) => EVENTS[id]).filter((ev) => eventEligible(s, ev));
  const used = new Set();
  // A `sure` event (a date in history) comes the year it can, ahead of the draws. At most two, so a crowded year stays readable.
  let sure = 0;
  for (const ev of pool) {
    if (!ev.sure || sure >= 2 || s.dead) continue;
    if (fireEvent(s, ev)) { used.add(ev.id); sure++; }
  }
  for (let i = 0; i < n - sure; i++) {
    const avail = pool.filter((e) => !used.has(e.id));
    if (!avail.length) break;
    const ev = weighted(avail, (e) => eventWeight(s, e));
    if (!ev) break;
    used.add(ev.id);
    fireEvent(s, ev);
    if (s.dead) break;
  }
}

function fireEvent(s, ev) {
  let c = {};
  if (ev.ctx) {
    c = ev.ctx(s);
    if (!c) return false;
  }
  if (!M(s).evHist) M(s).evHist = {};
  M(s).evHist[ev.id] = s.year;
  const text = vary(typeof ev.text === 'function' ? ev.text(s, c) : ev.text);
  if (ev.auto) {
    const before = snapStats(s);
    const r = ev.auto(s, c);
    const extra = typeof r === 'string' ? r : (r && r.text) || '';
    const full = vary((text + (extra ? ' ' + extra : '')).trim());
    const deltas = diffStats(before, snapStats(s));
    if (!s.dead || full) log(s, (ev.emoji ? ev.emoji + ' ' : '') + full, (r && r.tone === 'bad') ? 'bad' : (r && r.tone === 'good') ? 'good' : '', deltas);
    if ((ev.popup || META.settings.autoPopups) && !s.dead) popup(s, { emoji: ev.emoji, title: ev.title || '', text: full, deltas, tone: r && r.tone });
    return true;
  }
  const map = [];
  const choices = [];
  ev.choices.forEach((raw, i) => {
    const o = Array.isArray(raw) ? { label: raw[0], fx: raw[1] } : raw;
    if (!tagsOn(o.tags)) return;
    if (o.lang && langLevel() < o.lang) return;
    if (o.when && !o.when(s, c)) return;
    map.push(i);
    choices.push({
      label: typeof o.label === 'function' ? o.label(s, c) : o.label,
      sub: o.sub ? (typeof o.sub === 'function' ? o.sub(s, c) : o.sub) : '',
      value: map.length - 1,
      tone: o.tone || '',
    });
  });
  if (!choices.length) return false;
  popup(s, { emoji: ev.emoji || '', title: ev.title || '', text, handler: 'event', ctx: { ev: ev.id, c, map }, choices, person: c && c.pid ? c.pid : null });
  return true;
}

onChoice('event', (s, ctx, idx) => {
  const ev = EVENTS[ctx.ev];
  if (!ev) return;
  const raw = ev.choices[ctx.map[idx]];
  const o = Array.isArray(raw) ? { label: raw[0], fx: raw[1] } : raw;
  if (!o || !o.fx) return;
  // Things may have changed since the event fired (a firing, a breakup, prison...).
  if (ctx.c && ctx.c.pid && (!s.people[ctx.c.pid] || !s.people[ctx.c.pid].alive)) return { text: 'The moment passed.', quiet: true, nolog: true };
  if (!!ev.prison !== inPrison(s) || !tagsOn(ev.tags) || !tagsOn(o.tags) || (ev.lang && langLevel() < ev.lang) || (o.lang && langLevel() < o.lang) || (ev.when && !ev.when(s))) return { text: 'The moment passed.', quiet: true, nolog: true };
  const r = o.fx(s, ctx.c || {});
  if (typeof r === 'string') return vary(r);
  if (r && r.text) r.text = vary(r.text);
  return r;
});

// Helpers for event content.
function someone(s, kinds, filter) { const pid = pickRel(s, kinds, filter); return pid ? { pid } : null; }
function costChoice(usd) { return { sub: (s) => fmtMoney(price(s, usd)) }; }
