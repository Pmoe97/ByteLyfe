/* =====================================================================
 * 90-head-start.js — start at any age. The years before are lived for you.
 *
 * createLifeWithHeadStart(opts, age) is createLife(opts) followed by headStart(s, age): the
 * character is aged up year by year, every popup is answered by a policy, and once a year a
 * small "life director" takes a few ordinary, sensible actions (apply for a job, rent a
 * place, use a dating app, propose, marry, try for a baby, save). The player does not choose
 * what happens in those years, only that they happened.
 *
 * Answering popups alone is not enough: a life played that way is, at 25, almost always
 * unemployed, single and living with its parents. The director is what moves it forward.
 * It never commits a crime, gambles, uses substances, cheats, quits, emigrates, and while it runs
 * nothing tagged chaos, mature or taboo exists at all (tagsOn is false), whatever is switched on. The world (random events) still happens to the
 * character, so a head start can end badly; a character who dies or is in prison when it
 * ends is re-rolled with the same choices (up to HEAD_START_TRIES times).
 *
 * s.headStart is true while it runs (pushRewind and achievement popups read it).
 * It ends with REWIND cleared (the chosen age is the earliest point you can go back to),
 * a free restyle for an adult, and a "Your story so far" popup.
 * ===================================================================== */

const HEAD_START_MAX = 60;
const HEAD_START_TRIES = 10;

/* ---- answering popups ------------------------------------------------------------------ */
// The first enabled choice whose value passes pred(value, choice, index), or -1.
function hsIdx(pp, pred) {
  for (let i = 0; i < pp.choices.length; i++) {
    const c = pp.choices[i];
    if (!c.disabled && pred(c.value === undefined ? i : c.value, c, i)) return i;
  }
  return -1;
}
const HS_BACKOUT = (v) => v === null || v === -1 || v === 'cancel' || v === 'never';
// Anything without a policy: a random enabled choice, leaving "never mind" rows alone and
// leaning away from the ones marked bad.
function hsDefault(pp) {
  const en = pp.choices.map((c, i) => [c, i]).filter(([c]) => !c.disabled);
  if (!en.length) return 0;
  const real = en.filter(([c]) => !HS_BACKOUT(c.value));
  const pool = real.length ? real : en;
  const one = weighted(pool, ([c]) => (c.tone === 'bad' ? 0.2 : 1));
  return one ? one[1] : pool[0][1];
}
// What an event choice does is in its code: a choice that commits a crime, joins the mob, builds a habit,
// gambles or cheats is never the one a head start picks while another is on the table.
const HS_RISKY = /emigrateNow|wdResettle|bootleg|commitCrime|\buw\(s\)|mobJoin|habit\(|affairBegins|makeFling|arrest\(|gamble|bookie|assault|murder/;
function hsSafeEvent(s, pp) {
  const ev = EVENTS[pp.ctx && pp.ctx.ev];
  if (!ev || !ev.choices || !pp.ctx.map) return -1;
  const live = [], safe = [];
  pp.choices.forEach((c, i) => {
    if (c.disabled) return;
    live.push(i);
    const raw = ev.choices[pp.ctx.map[c.value]], fx = raw && (Array.isArray(raw) ? raw[1] : raw.fx);
    if (!(fx && HS_RISKY.test(String(fx)))) safe.push(i);
  });
  return safe.length && safe.length < live.length ? pick(safe) : -1;
}
const HS_POLICY = {
  event: hsSafeEvent,
  comingOfAge: (s, pp) => hsIdx(pp, (v) => v === false), // the restyle is offered when the head start ends
  dropout: (s, pp) => hsIdx(pp, (v) => v === false),
  quitJob: (s, pp) => hsIdx(pp, (v) => v === false),
  retireAsk: (s, pp) => { const yes = A(s) >= 68 || chance(0.3); return hsIdx(pp, (v) => v === yes); },
  milDraft: (s, pp) => { const want = chance(0.7) ? 'report' : 'defer'; return hsIdx(pp, (v) => v === want); },
  afterHigh: (s, pp) => {
    const smarts = P(s).stats.smarts, wealthy = ['comfortable', 'rich'].includes(M(s).wealthTier);
    const offers = hsIdx(pp, (v) => v === 'offers');
    if (offers >= 0) return offers;
    let want;
    if (smarts >= 70 || (wealthy && smarts >= 55)) want = 'university';
    else if (smarts >= 45) want = weighted(['community', 'trade', 'work', 'gap'], (v) => ({ community: 35, trade: 25, work: 35, gap: 5 }[v]));
    else want = weighted(['work', 'trade'], (v) => (v === 'work' ? 7 : 3));
    return hsIdx(pp, (v) => v === want);
  },
  pickMajor: (s, pp) => {
    const all = pp.choices.map((c, i) => [c, i]).filter(([c]) => c.value && !c.disabled);
    const fits = all.filter(([c]) => c.sub !== 'Competitive');
    const pool = fits.length ? fits : all;
    return pool.length ? pick(pool)[1] : -1;
  },
  funding: (s, pp) => {
    const cost = (pp.ctx && pp.ctx.cost) || 0;
    const order = [];
    if (M(s).money >= cost * 3) order.push('cash');
    if (chance(0.7)) order.push('parents');
    order.push('scholarship', 'loan', 'parents');
    for (const w of order) { const i = hsIdx(pp, (v) => v === w); if (i >= 0) return i; }
    return -1;
  },
  // College applications (55-school-life.js): a reach, a real shot and a safe one, then the essay.
  cpPick: (s, pp) => {
    const picks = (pp.ctx && pp.ctx.picks) || [];
    const send = hsIdx(pp, (v) => v === 'send');
    if (picks.length >= 3 && send >= 0) return send;
    const rank = (c) => (/Likely/.test(c.sub || '') ? 0 : /real shot/.test(c.sub || '') ? 1 : /reach/.test(c.sub || '') ? 2 : 3);
    const want = [1, 1, 0][picks.length] ?? 0;
    const opts = pp.choices.map((c, i) => [c, i]).filter(([c]) => typeof c.value === 'number' && !c.disabled);
    if (!opts.length) return send >= 0 ? send : -1;
    const best = Math.min(...opts.map(([c]) => Math.abs(rank(c) - want)));
    return pick(opts.filter(([c]) => Math.abs(rank(c) - want) === best))[1];
  },
  cpEssay: (s, pp) => { const want = chance(0.5) ? 'change' : 'passion'; return hsIdx(pp, (v) => v === want); },
  cpChoose: (s, pp) => {
    const offers = (eduRec(s).offers || []);
    let best = -1, bs = -1e9;
    pp.choices.forEach((c, i) => { const o = offers[c.value]; if (o && !c.disabled) { const sc = COLLEGE_TIERS[o.tier].bar + (o.sch || 0) * 30; if (sc > bs) { bs = sc; best = i; } } });
    return best;
  },
  // The best answer in the interview (04-data-careers.js: each answer carries its odds modifier).
  interview: (s, pp) => {
    const j = JOBS[pp.ctx.id], Q = (j.interview || INTERVIEW_QS)[pp.ctx.qi];
    let best = -1, bm = -9;
    pp.choices.forEach((c, i) => { const m = Q.a[c.value][1]; if (m > bm) { bm = m; best = i; } });
    return best;
  },
  pickDate: (s, pp) => {
    const cands = (pp.ctx && pp.ctx.cands) || [], me = A(s);
    let best = -1, bs = -1;
    cands.forEach((c, i) => { if (Math.abs(c.age - me) > 10) return; const sc = c.looks + c.smarts + randInt(0, 40); if (sc > bs) { bs = sc; best = i; } });
    return best >= 0 ? hsIdx(pp, (v) => v === best) : hsIdx(pp, (v) => v === -1);
  },
  propose: (s, pp) => hsIdx(pp, (v) => typeof v === 'number' && v >= 0), // the cheapest ring they can afford
  wedding: (s, pp) => {
    const royal = hsIdx(pp, (v) => v === 'royal');
    if (royal >= 0) return royal;
    const small = hsIdx(pp, (v) => v === 1);
    if (small >= 0 && M(s).money > price(s, 8000) * 3) return small;
    return hsIdx(pp, (v) => typeof v === 'number' && v >= 0);
  },
};
function hsPick(s, pp) {
  const f = pp.handler && HS_POLICY[pp.handler];
  const i = f ? f(s, pp) : -1;
  return i >= 0 ? i : hsDefault(pp);
}
function hsAnswerAll(s) {
  let guard = 0;
  while (s.pending.length && !s.dead) {
    if (guard++ > 250) { s.pending = []; break; }
    const pp = s.pending[0];
    let idx;
    try { idx = hsPick(s, pp); } catch (e) { console.error('[ByteLyfe] head start policy failed:', pp.handler, e); idx = hsDefault(pp); }
    const input = pp.input ? (pp.input.value !== undefined ? pp.input.value : '') : undefined;
    try { if (!resolvePopup(s, pp.id, idx, input)) s.pending.shift(); } catch (e) { console.error('[ByteLyfe] head start popup failed:', pp.handler, e); s.pending.shift(); }
  }
  if (s.dead) s.pending = [];
}

/* ---- the life director --------------------------------------------------------------------- */
// Runs an action the way the menu would, then answers whatever it asks.
function hsAct(s, id, t) {
  const ok = doAction(s, id, t);
  if (ok) hsAnswerAll(s);
  return ok;
}
// Pay counts for a lot, and so does a job the character studied for (a degree-only job is on the board only if they qualify).
function hsJobWeight(s, id) {
  const req = JOBS[id].req || {};
  const trained = (req.edu && req.edu !== 'high') || req.degree || req.trade;
  return Math.pow(salaryFor(s, id, 0), 2) * (trained ? 4 : 1);
}
function hsJob(s) {
  for (let tries = 0; tries < 3 && !M(s).career && !s.dead; tries++) {
    const open = jobBoard(s).filter((j) => j.open && !j.missing.length && !JOBS[j.id].special && !JOBS[j.id].adult);
    const job = weighted(open, (j) => hsJobWeight(s, j.id));
    if (!job) return;
    runWithResult(s, () => applyJob(s, job.id), { emoji: JOBS[job.id].emoji, title: 'Job application' });
    hsAnswerAll(s);
  }
}
// Out of the parents' house, or back under a roof after losing one: the cheapest place that fits.
function hsHome(s) {
  const m = M(s), kind = m.housing.type;
  if (kind !== 'parents' && kind !== 'homeless') return;
  if (kind === 'parents' && (A(s) < 20 || !chance(0.45))) return;
  if (kind === 'homeless' && !chance(0.8)) return;
  const budget = m.career ? m.career.salary * 0.35 : price(s, 8000);
  const homes = listing(s, 'rentals').filter((r) => r.rent <= budget && m.money >= r.rent / 6).sort((a, b) => a.rent - b.rent);
  if (!homes.length) return;
  runWithResult(s, () => HANDLERS.rent(s, {}, homes[0].id), { emoji: '🏢', title: 'A place of your own' });
  hsAnswerAll(s);
}
function hsLove(s, hs) {
  const me = romanticId(s);
  if (!me) {
    if (chance(0.3)) hsAct(s, 'dating_app');
    return;
  }
  const r = relOf(s, me), a = A(s);
  if (!r || s.dead) return;
  if (r.kind === 'partner' && a >= 23 && s.year - r.since >= 1 && r.rel >= 50 && chance(0.4)) hsAct(s, 'p_propose', me);
  else if (r.kind === 'fiance' && chance(0.7)) hsAct(s, 'p_wedding', me);
  else if (['spouse', 'partner'].includes(r.kind) && a >= 24 && a <= 40 && myChildren(s).length + (M(s).pregnancy ? 1 : 0) < hs.kids && M(s).money > 0 && M(s).career && chance(0.3)) hsAct(s, 'p_baby', me);
}
function hsSave(s) {
  const m = M(s), spend = m.lastFinance ? sum(m.lastFinance.exp, (x) => x[1]) : 0;
  const keep = Math.max(price(s, 20000), spend);
  if (m.money > keep * 2 && A(s) >= 21 && !m.loans.length) {
    const put = Math.round((m.money - keep * 2) * 0.3);
    if (put > 0) { m.money -= put; m.invest.index = (m.invest.index || 0) + put; }
  }
}
function hsDirector(s, hs) {
  if (s.dead || inPrison(s) || s.pending.length) return;
  const a = A(s), m = M(s);
  if (a >= 16 && !m.career && !m.retired && a < 65 && canWorkFullTime(s)) hsJob(s);
  if (a >= 16 && ACTIONS.cp_apply && P(s).stats.smarts >= 62 && chance(0.7) && actionAvailable(ACTIONS.cp_apply, s)) hsAct(s, 'cp_apply');
  if (a >= 18 && !s.dead) hsHome(s);
  if (a >= 18 && free(s) && !s.dead) hsLove(s, hs);
  if (!s.dead) hsSave(s);
}

/* ---- the whole thing ----------------------------------------------------------------------- */
function headStart(s, age) {
  s.headStart = true;
  HEAD_START_RUN = true; // tagsOn (12-flow.js) hides everything behind a content switch
  const hs = { kids: weighted([0, 1, 2, 3], (n) => [3, 3, 4, 2][n]) };
  try {
    hsAnswerAll(s);
    while (!s.dead && A(s) < age) {
      ageUp(s);
      hsAnswerAll(s);
      if (s.dead) break;
      hsDirector(s, hs);
      hsAnswerAll(s);
    }
  } finally {
    delete s.headStart;
    HEAD_START_RUN = false;
  }
  delete REWIND[s.id]; // the age you chose is as far back as time goes
  return s;
}

// The paragraph that opens a life that did not start at birth.
function hsSummary(s) {
  useCurrency(s);
  const p = P(s), m = M(s), C = country(s), a = A(s), lines = [];
  lines.push(`You are ${a}, living in ${p.city}, ${C.name}.`);
  const best = bestDegree(s);
  if (inSchool(s)) lines.push(`You are in school: ${eduTitle(s)}.`);
  else if (best) lines.push(`You have ${aAn(degreeLabel(best))}.`);
  else if (a >= 18) lines.push('You never finished school.');
  if (m.career) lines.push(`You work as ${aAn(careerTitle(s))}.`);
  else if (m.retired) lines.push('You are retired.');
  else if (a >= 18 && !inSchool(s)) lines.push('You are between jobs.');
  const mate = romanticId(s);
  if (mate) { const k = relKind(s, mate), who = nm(s, mate); lines.push(k === 'spouse' ? `You are married to ${who}.` : k === 'fiance' ? `You are engaged to ${who}.` : `You are seeing ${who}.`); }
  else if (a >= 18) lines.push('You are single.');
  const kids = myChildren(s).length;
  if (kids) lines.push(`You have ${nOf(kids, 'child', 'children')}.`);
  lines.push({ parents: 'You live with your parents.', rent: 'You rent your own place.', own: 'You own your home.', homeless: 'You have nowhere to live.' }[m.housing.type] || '');
  lines.push(`You have ${fmtMoney(m.money)} in the bank.`);
  const gone = relPeople(s, ['parent', 'spouse', 'child', 'sibling', 'grandparent'], { dead: true }).filter((q) => !q.alive).slice(0, 3);
  if (gone.length) lines.push(listJoin(gone.map((q) => `${q.first} (${kinTitle(s, q.id).toLowerCase()}, ${q.deathYear})`)) + (gone.length === 1 ? ' died.' : ' have died.'));
  lines.push('The details are in your life log.');
  return lines.filter(Boolean).join(' ');
}
function hsFinish(s) {
  if (A(s) >= ADULT_AGE) M(s).freeRestyle = true; // the body was never theirs to choose: one free redesign, like turning 18
  popup(s, { emoji: '📖', title: 'Your story so far', text: hsSummary(s), tone: 'good' });
}

// createLife, then the years before `age`. A character who dies or ends up in prison is re-rolled.
function createLifeWithHeadStart(opts, age) {
  opts = Object.assign({}, opts || {});
  age = clamp(Math.round(Number(age) || 0), 0, HEAD_START_MAX);
  if (!age) return createLife(opts);
  if (!opts.year) opts.year = new Date().getFullYear() - age;
  let keep = null;
  for (let i = 0; i < HEAD_START_TRIES; i++) {
    const s = createLife(opts);
    headStart(s, age);
    if (!s.dead) { keep = s; if (!inPrison(s)) break; }
  }
  if (!keep) { keep = createLife(opts); log(keep, '⏩ The years you skipped did not take. You start from the beginning.'); return keep; }
  hsFinish(keep);
  return keep;
}
