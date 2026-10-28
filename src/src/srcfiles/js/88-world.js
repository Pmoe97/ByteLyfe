/* =====================================================================
 * 88-world.js — the world outside: the real events of 09-data-history.js, and what they do to a life.
 *
 * An event is active for a character when the year is in its years (or the country's own yearsBy) and the
 * character lives where it applies (everywhere, certain countries, or certain cities). worldAt(year, cc, city)
 * lists them, each with its strength (sev x curve); wfx(s, knob) adds up one number across everything active.
 * The knobs are read where the game already decides things:
 *   jobOpenOdds (49-cities.js)   jobs        careerTick (15-career.js)   layoff, cut, pay
 *   cityMarketYear (49-cities.js) housing    livingCost (49-cities.js)   living
 *   financeTick/addLoan (16-money.js) rates, tax, crypto   fxTick (50-currency.js)   fxShock
 *   marketYear (37-market.js)    market      industryMods/firmYear (34, 37) biz
 *   warYear/draftYear (59-military.js) war   bodyTick (19-health.js) ageMult   canGamble and a few actions: closed
 * worldYear runs first in every year (onYearStart, 25-ageup.js): it tells you about an event the first time you live
 * through it, and does what happens once a year (mood, payments, illness, a disaster, people you know losing work or
 * dying, the paper). All of it is behind META.settings.history (on by default), and nothing in it runs outside
 * HIST_FROM..HIST_TO; the years after that (to HIST_END) are generated for each family line by 92-world-future.js.
 *
 * s.world = { seen: { id: year first lived through } }   one per family line
 * M(s).worldLived = [id]   what this character lived through (the Hall of Lives and the World sheet read it)
 * ===================================================================== */

const WORLD_MEMO = {};
function worldReset() { for (const k in WORLD_MEMO) delete WORLD_MEMO[k]; } // tests that add events call this
function histOn() { return typeof META === 'undefined' || META.settings.history !== false; }
function worldOf(s) { return s.world || (s.world = { seen: {} }); }

/* ---- what is going on ---------------------------------------------------------------- */
function evApplies(ev, cc, city) {
  if (ev.cities) return ev.cities.includes(cityKey(cc, city));
  return !ev.where || ev.where === 'all' || ev.where.includes(cc);
}
function evSev(ev, cc) { const t = ev.sev; if (!t) return 1; const v = t[cc] !== undefined ? t[cc] : t._; return v === undefined ? 1 : v; }
function evRange(ev, cc) { return (ev.yearsBy && ev.yearsBy[cc]) || ev.years; }
function evCurve(ev, i) { const c = ev.curve; return c && c.length ? c[Math.min(Math.max(i, 0), c.length - 1)] : 1; }
// A knob in the i-th year of an event: a number follows the curve, an array is one value for each year.
function evKnob(ev, v, i) {
  if (v === undefined || v === null) return 0;
  if (Array.isArray(v)) return v[Math.min(Math.max(i, 0), v.length - 1)] || 0;
  return typeof v === 'number' ? v * evCurve(ev, i) : 0;
}
// Everything active in a place in a year: [{ id, ev, i (year of the event), sev, k (strength) }].
function worldAt(year, cc, city, s) {
  if (!histOn() || year > HIST_END) return [];
  const fut = year > HIST_TO && s ? worldFutureUse(s) : null; // the years after the table are generated for this family line (92-world-future.js)
  const key = year + ':' + cc + ':' + city + (fut ? ':' + fut.seed : '');
  let l = WORLD_MEMO[key];
  if (l) return l;
  l = [];
  for (const id of fut ? fut.ids : year > HIST_TO ? [] : HIST_IDS) {
    const ev = HIST[id], r = evRange(ev, cc);
    if (year < r[0] || year > r[1] || !evApplies(ev, cc, city)) continue;
    const sev = evSev(ev, cc) * (ev.citySev ? (ev.citySev[cityKey(cc, city)] !== undefined ? ev.citySev[cityKey(cc, city)] : 1) : 1);
    if (sev <= 0) continue;
    const i = Math.max(0, year - ev.years[0]);
    l.push({ id, ev, i, sev, k: sev * evCurve(ev, i) });
  }
  return (WORLD_MEMO[key] = l);
}
function worldActive(s) { return s.player && s.playerId && P(s) ? worldAt(s.year, P(s).country, P(s).city, s) : []; }
function worldHas(s, id) { return worldActive(s).some((a) => a.id === id); }
// One number added up over everything active (for a place other than yours, pass cc and city).
function wfx(s, knob, cc, city) {
  let t = 0;
  for (const a of worldAt(s.year, cc || P(s).country, city || P(s).city, s)) t += evKnob(a.ev, a.ev.fx && a.ev.fx[knob], a.i) * a.sev;
  return t;
}
// How much of a knob one kind of job takes: its own number in the row's cats, else the row's `_`, else all of it.
function evCat(ev, knob, cat) {
  const c = ev.cats && ev.cats[knob];
  if (!c) return 1;
  return c[cat] !== undefined ? c[cat] : c._ !== undefined ? c._ : 1;
}
// The same, for one kind of job (04-data-careers.js JOB_CATS): an event can hit some of them harder.
function wfxCat(s, knob, cat, cc, city) {
  let t = 0;
  for (const a of worldAt(s.year, cc || P(s).country, city || P(s).city, s)) t += evKnob(a.ev, a.ev.fx && a.ev.fx[knob], a.i) * a.sev * evCat(a.ev, knob, cat);
  return t;
}
// The event doing most of one knob (for naming it in a sentence).
function worldCause(s, knob, cat) {
  let best = null, bv = 0;
  for (const a of worldActive(s)) {
    const v = Math.abs(evKnob(a.ev, a.ev.fx && a.ev.fx[knob], a.i) * a.sev * (cat ? evCat(a.ev, knob, cat) : 1));
    if (v > bv) { bv = v; best = a; }
  }
  return best;
}
function worldBiz(s, ind) {
  let t = 0;
  for (const a of worldActive(s)) t += evKnob(a.ev, a.ev.biz && a.ev.biz[ind], a.i) * a.sev;
  return t;
}
// A currency's shock this year: everywhere, whoever lives where (the money moves whether you do or not).
function worldFxShock(s, cur) {
  if (!histOn()) return 0;
  let t = 0;
  for (const id of HIST_IDS) { const ev = HIST[id]; if (ev.fxShock && s.year >= ev.years[0] && s.year <= ev.years[1]) t += evKnob(ev, ev.fxShock[cur], s.year - ev.years[0]); }
  return t;
}
// The stock market: null when history does not govern this year; { ret, ev } when it does (ret null when nothing in it moved the market).
function worldMarket(s) {
  if (!histOn() || s.year < HIST_FROM || s.year > HIST_END) return null;
  const cc = P(s).country, list = worldAt(s.year, cc, P(s).city, s);
  for (const a of list) { const m = a.ev.marketCc && a.ev.marketCc[cc]; if (m && m[s.year] !== undefined) return { ret: m[s.year], ev: a.ev }; }
  for (const a of list) { const m = a.ev.market; if (m && m[s.year] !== undefined) return { ret: m[s.year], ev: a.ev }; }
  return { ret: null, ev: null };
}
function worldCrypto(s) {
  if (!histOn()) return null;
  for (const a of worldActive(s)) { const m = a.ev.crypto; if (m && m[s.year] !== undefined) return m[s.year]; }
  return null;
}
// Things that shut while an event is at full strength.
// A job the law has shut for now (Prohibition and the bartender): not on the board, and the ones who held it lose it.
function worldJobBanned(s, id) { return worldActive(s).some((a) => a.ev.jobBan && a.ev.jobBan.includes(id)); }
function worldClosed(s, what) { return worldActive(s).some((a) => a.ev.closed && a.ev.closed.includes(what) && a.k >= 0.5); }
const WORLD_CLOSED = { travel: ['vacation', 'emigrate'], nightlife: ['nightlife'], gym: ['gym'] };
for (const what in WORLD_CLOSED) for (const id of WORLD_CLOSED[what]) { const a = ACTIONS[id]; if (!a) continue; const w = a.when; a.when = (s, t) => !worldClosed(s, what) && (!w || w(s, t)); }

/* ---- work ----------------------------------------------------------------------------- */
function worldLayOff(s, ev) {
  const title = careerTitle(s);
  leaveJob(s, 'laidoff');
  tally(s, 'layoffs');
  add(s, { happy: -8 });
  announce(s, { emoji: '📦', title: 'Laid off', tone: 'bad', text: ev ? `With ${ev.name} going on, the business had to let people go, and you were one of them. You were a ${title}. It was nothing you did.` : `You were laid off from your job as ${aAn(title)}. It was nothing you did.` });
}
// Called by careerTick for an ordinary career, after the year's performance. true: the job is gone.
function worldCareerYear(s, c, j) {
  if (!histOn()) return false;
  if (c.furlough && c.furlough.year < s.year) { c.salary = c.furlough.was; delete c.furlough; }
  if (worldJobBanned(s, c.id)) { worldLayOff(s, (worldActive(s).find((a) => a.ev.jobBan && a.ev.jobBan.includes(c.id)) || {}).ev); return true; }
  const ceo = (M(s).companies || []).some((co) => co.ceo === 'you' && !co.closed);
  const odds = ceo || (c.safe && c.safe >= s.year) ? 0 : wfxCat(s, 'layoff', j.cat); // c.safe: kept on, for a pay cut, until a year (wd_gen_layoffs)
  if (odds > 0 && chance(clamp(odds * (1.4 - c.perf / 100), 0, 0.6))) {
    const a = worldCause(s, 'layoff', j.cat);
    if (a && a.ev.furlough && a.ev.furlough.includes(P(s).country)) {
      if (!c.furlough) { c.furlough = { year: s.year, was: c.salary }; c.salary = Math.round(c.salary * 0.8); log(s, `📦 You were furloughed on 80% pay while ${a.ev.name} lasts. The job is waiting for you.`, 'bad'); add(s, { happy: -3 }); }
    } else { worldLayOff(s, a && a.ev); return true; }
  }
  const cut = wfxCat(s, 'cut', j.cat);
  if (cut > 0) {
    const a = worldCause(s, 'cut', j.cat);
    c.cuts = c.cuts || {};
    if (a && !c.cuts[a.id] && chance(0.5)) { c.cuts[a.id] = s.year; c.salary = Math.max(1000, Math.round(c.salary * (1 - clamp(cut, 0, 0.5)))); log(s, `📉 Everyone took a pay cut at work, ${nOf(Math.round(clamp(cut, 0, 0.5) * 100), 'percent', 'percent')}, with ${a.ev.name} going on.`, 'bad'); }
  }
  return false;
}

/* ---- the year ------------------------------------------------------------------------- */
const WORLD_POPUP = ['econ', 'war', 'pandemic', 'unrest'];
function worldOpening(ev, cc) { return (ev.openBy && ev.openBy[cc]) || ev.open || null; }
function worldPost(s, ev) {
  if (!ev.news || !ev.news.length) return;
  const [head, body] = pick(ev.news), list = newsOf(s);
  list.push({ y: s.year, kind: 'world', head, body, you: false });
  if (list.length > NEWS_MAX) list.splice(0, list.length - NEWS_MAX);
}
function worldYear(s) {
  if (s.dead || !histOn() || !s.player) return;
  const w = worldOf(s), m = M(s), p = P(s), cc = p.country, a = A(s), act = worldActive(s);
  m.worldLived = m.worldLived || [];
  for (const x of act) {
    const ev = x.ev;
    if (ev.quiet) { if (chance(0.5)) worldPost(s, ev); continue; } // a background row: its numbers apply, and it is never announced
    if (x.k <= 0 && !w.seen[x.id]) continue; // the aftermath years of a one-year event (a disaster): moving in after it is not living through it
    if (!m.worldLived.includes(x.id)) m.worldLived.push(x.id);
    if (!w.seen[x.id]) {
      w.seen[x.id] = s.year;
      const o = worldOpening(ev, cc);
      if (o && a >= 4) {
        const text = a < 13 && o.kid ? o.kid : o.text;
        const pop = ev.popup !== undefined ? ev.popup : WORLD_POPUP.includes(ev.kind) || (ev.kind === 'disaster' && ev.cities);
        if (pop) announce(s, { emoji: ev.emoji, title: o.title, text, tone: ev.tone || (ev.kind === 'moment' ? 'good' : 'bad'), log: `${ev.emoji} ${text}` });
        else log(s, `${ev.emoji} ${text}`);
      }
    } else if (ev.yearly && ev.yearly.length && chance(0.4) && a >= 6) log(s, `${ev.emoji} ${vary(pick(ev.yearly))}`);
    if (chance(0.5)) worldPost(s, ev);
  }
  // The year after, the line that closes it.
  for (const id of m.worldLived) {
    const ev = HIST[id];
    if (!ev || !ev.close || m.flags['wclose_' + id] || evRange(ev, cc)[1] >= s.year || s.year - evRange(ev, cc)[1] > 3) continue;
    m.flags['wclose_' + id] = s.year;
    if (a >= 6) log(s, `${ev.emoji} ${ev.close}`);
  }
  if (a < 6) { worldPeople(s, act); return; }

  const mood = wfx(s, 'mood');
  if (mood) add(s, { happy: Math.trunc(mood) + (chance(Math.abs(mood % 1)) ? Math.sign(mood) : 0) });
  for (const x of act) worldOneOff(s, x);
  worldPeople(s, act);
}
onYearStart('world', worldYear);

// What an event does once a year to you, beyond the knobs the game reads on its own.
function worldOneOff(s, x) {
  const ev = x.ev, m = M(s), p = P(s), a = A(s), cc = p.country;
  // A payment to every adult.
  const pay = ev.support && ev.support[cc];
  if (pay !== undefined && a >= 18) {
    const usd = Array.isArray(pay) ? (pay[Math.min(x.i, pay.length - 1)] || 0) : pay;
    if (usd > 0) { const v = price(s, usd); m.money += v; log(s, `💵 A relief payment of ${fmtMoney(v)} arrived from the government.`, 'good'); }
  }
  // Money lost to a collapse (a share of cash and savings).
  const share = ev.cash && ev.cash[s.year];
  if (share && a >= 12) {
    const safe = ev.cashBuffer ? price(s, ev.cashBuffer) : 0, keep = !!ev.cashKeep; // a small float is safe, and in some countries savings were indexed
    const lost = Math.round(Math.max(0, m.money - safe) * share), sv = keep ? 0 : Math.round(((m.invest.savings || 0) + (m.invest.bonds || 0)) * share);
    m.money -= lost;
    if (!keep) { m.invest.savings = Math.round((m.invest.savings || 0) * (1 - share)); m.invest.bonds = Math.round((m.invest.bonds || 0) * (1 - share)); }
    if (lost + sv > 0) announce(s, { emoji: '💸', title: 'Your savings', tone: 'bad', text: `With ${ev.name}, money lost most of its value. Your savings are worth a fraction of what they were: ${fmtMoney(lost + sv)} gone.` });
  }
  if (ev.disease) worldIllness(s, x);
  if (ev.blast) worldBlast(s, x);
  // Schools shut: a year of worse lessons.
  if (ev.closed && ev.closed.includes('school') && x.k >= 0.5 && a >= 5 && a <= 17 && inSchool(s) && chance(0.6)) { add(s, { smarts: -1 }); log(s, '🏫 School was closed for months, and lessons happened on a screen at the kitchen table, or not at all.'); }
}
function worldIllness(s, x) {
  const ev = x.ev, d = ev.disease, D = DISEASES[d.id], m = M(s);
  if (!D) return;
  const age = bodyAge(s, P(s));
  let odds = evKnob(ev, d.odds, x.i) * x.sev;
  for (const gd of d.guards || []) if (m.flags[gd.flag]) odds *= gd.mult; // a vaccine, a mask, staying in
  if ((!d.ages || (age >= d.ages[0] && age <= d.ages[1])) && !hasDisease(s, d.id) && chance(clamp(odds, 0, 0.9)) && getSick(s, d.id)) log(s, `${D.emoji} You came down with ${diseaseNoun(d.id)}.`, 'bad');
  // People you know: the old, and the unlucky.
  if (d.npc) {
    for (const q of relPeople(s, [...FAMILY_KINDS, 'aunt', 'cousin', 'nibling', 'inlaw', 'friend', 'bestie', 'lover', 'partner'])) {
      if (!q.alive || q.id === s.playerId) continue;
      const row = d.npc.find(([lo, hi]) => ageOf(s, q) >= lo && ageOf(s, q) <= hi);
      if (row && chance(clamp(row[2] * x.k, 0, 0.5))) npcDies(s, q, D.cause || D.name.toLowerCase());
    }
  }
}
// A disaster in your city (or a war on your doorstep): your home, you, the people you know there.
function worldBlast(s, x) {
  const ev = x.ev, b = ev.blast, m = M(s), p = P(s), cause = ev.cause || 'a disaster';
  if (b.home && chance(clamp(b.home * x.k, 0, 0.9))) {
    const own = m.assets.filter((q) => q.kind === 'house' && (q.city || p.city) === p.city && (q.cc || p.country) === p.country);
    if (own.length) {
      const h = own[0], loss = Math.round((h.value || 0) * randFloat(0.1, 0.35));
      h.value = Math.max(0, (h.value || 0) - loss); h.cond = clamp((h.cond ?? 100) - randInt(15, 40), 5, 100);
      announce(s, { emoji: '🏚️', title: 'Your home', tone: 'bad', text: `${cap(cause)} damaged your home in ${p.city}. It lost ${fmtMoney(loss)} of its value, and it needs work.` });
    } else if (m.housing.type === 'rent') {
      leaveRental(s, 'damaged');
      m.housing = { type: 'homeless', assetId: null, rent: 0, name: '' };
      announce(s, { emoji: '🏚️', title: 'Your home', tone: 'bad', text: `${cap(cause)} destroyed the building you rented a place in. You have nowhere to live.` });
    }
  }
  if (b.hurt && chance(clamp(b.hurt * x.k, 0, 0.6))) { add(s, { health: -randInt(10, 30), happy: -6 }); log(s, `🩹 You were hurt in ${cause}, and spent weeks recovering.`, 'bad'); }
  if (b.dead && chance(clamp(b.dead * x.k, 0, 0.3))) { die(s, cause); return; }
  if (b.npc) {
    for (const q of relPeople(s, null)) {
      if (!q.alive || q.id === s.playerId || q.city !== p.city || q.country !== p.country) continue;
      if (chance(clamp(b.npc * x.k, 0, 0.3))) npcDies(s, q, cause);
    }
  }
}
// The people around you in a bad year: parents, a spouse and grown siblings lose jobs, and some find new ones.
function worldPeople(s, act) {
  const quiet = wfx(s, 'layoff') < 0.03;
  for (const q of relPeople(s, ['parent', 'stepparent', 'spouse', 'partner', 'fiance', 'sibling', 'halfsibling'])) {
    if (!q.alive) continue;
    const qa = ageOf(s, q), j = q.job && q.job.id && JOBS[q.job.id];
    if (j && qa >= 18) {
      const odds = wfxCat(s, 'layoff', j.cat) * 0.8;
      if (odds > 0 && chance(clamp(odds, 0, 0.5))) {
        q.job = null; q.laidOff = s.year;
        const kind = relKind(s, q.id);
        if (['parent', 'stepparent', 'spouse'].includes(kind)) log(s, `📦 Your ${kinTitle(s, q.id).toLowerCase()} ${q.first} lost ${genderWord(q, 'his', 'her', 'their')} job in ${j.name.toLowerCase()}.`, 'bad');
        if (A(s) < 18 && ['parent', 'stepparent'].includes(kind)) add(s, { happy: -3 });
      }
    } else if (!q.job && q.laidOff && quiet && qa < 63 && !q.retired && chance(0.35)) {
      assignNpcLife(s, q, { keepMoney: true });
      delete q.laidOff;
    }
  }
}

/* ---- historical wars (59-military.js asks first, every year) ------------------------------- */
// The authored war a country is fighting this year: { ev, entry, years }, or null. Two at once (Afghanistan and Iraq):
// the bigger one is the one you live through, and the other picks up when it ends.
function histWarFor(s, cc) {
  let best = null;
  for (const id of HIST_IDS) {
    const ev = HIST[id], e = ev.war && ev.war[cc];
    if (!e) continue;
    const y = e.years || evRange(ev, cc);
    if (s.year < y[0] || s.year > y[1]) continue;
    // The bigger war, and of two the same size the newer: the front the country's attention has moved to.
    if (!best || (e.intensity || 3) > (best.entry.intensity || 3) || ((e.intensity || 3) === (best.entry.intensity || 3) && y[0] > best.years[0])) best = { ev, entry: e, years: y };
  }
  return best;
}
function makeHistWar(s, cc, def) {
  const e = def.entry;
  return {
    id: uid(s, 'w'), cc, name: e.name, foe: e.foe, foeAdj: e.foeAdj || e.foe, theater: e.theater || 'the front', start: def.years[0], intensity: e.intensity || 3, momentum: 0, draft: false,
    dead: randInt(20, 120) * (e.intensity || 3), hid: def.ev.id, endYear: def.years[1], draftYears: e.draft || null, draftAges: e.draftAges || null, draftWomen: e.draftWomen || null,
    result: e.result || 'ceasefire', endText: e.end || null, civil: !!e.civil, lottery: e.lottery || null, peace: !!e.peace,
  };
}
// true: history governs wars here this year, so the random ones stay out of it.
function historyWarYear(s) {
  if (!histOn() || s.year < HIST_FROM || s.year > HIST_TO) return false;
  const cc = P(s).country, st = warSlot(s, cc);
  let w = st.war;
  if (w && !w.hid) return false; // a made-up war already under way (a life from before history) runs its course
  const def = histWarFor(s, cc);
  // A bigger war breaks out while a smaller one is on (the smaller one goes quiet until it ends).
  if (w && def && def.ev.id !== w.hid && ((def.entry.intensity || 3) > w.intensity || ((def.entry.intensity || 3) === w.intensity && def.years[0] > w.start))) { st.war = null; w = null; }
  if (!w) {
    if (!def) { st.quiet++; return true; }
    w = st.war = makeHistWar(s, cc, def);
    log(s, w.peace ? `📜 ${cap(w.name)} began: ${w.draftAges ? `men aged ${w.draftAges[0]} to ${w.draftAges[1]}` : 'men'} are called up.` : def.years[0] < s.year ? `🚨 ${warLine(w)} is still going on.` : `🚨 ${warLine(w)} began.`, 'bad');
  } else {
    w.dead += randInt(40, 260) * w.intensity;
  }
  const drafting = !!w.draftYears && s.year >= w.draftYears[0] && s.year <= w.draftYears[1];
  if (drafting && !w.draft) { w.draft = true; log(s, `📜 ${country(s).name} began calling up ${w.civil ? 'men from the places it holds' : 'men'} aged ${(w.draftAges || [18, 30])[0]} to ${(w.draftAges || [18, 30])[1]} for ${w.name}.`, 'bad'); }
  else if (!drafting && w.draft) { w.draft = false; log(s, `📜 The draft for ${w.name} came to an end.`); }
  if (!inService(s) && w.intensity >= 2 && chance(0.4)) add(s, { happy: -1 });
  if (s.year >= w.endYear) { w.momentum = w.result === 'victory' ? 3 : w.result === 'defeat' ? -3 : 0; endWar(s, st, w); }
  return true;
}
// A draft by lottery: on the year you reach the age, your birthday draws a number; at or under the year's cut-off, the notice comes.
function lotteryYear(s, w) {
  const m = M(s), L = w.lottery, key = 'lot_' + w.id + '_' + s.year;
  if (A(s) !== L.age || m.flags[key] || isMonarch(s, P(s))) return;
  m.flags[key] = 1;
  const cut = typeof L.cutoff === 'number' ? L.cutoff : (L.cutoff[s.year] !== undefined ? L.cutoff[s.year] : (L.cutoff._ || 120));
  const [mo, d] = P(s).bday, n = ((mo * 31 + d * 17 + s.year * 7) % 366) + 1;
  if (n > cut) { log(s, `🎲 The draft lottery drew your birthday: number ${n}. Numbers up to ${cut} were called this year. Not yours.`, 'good'); return; }
  m.flags['draft_' + w.id] = s.year;
  draftNotice(s, w, `The draft lottery drew your birthday: number ${n}, and numbers up to ${cut} are being called. `);
}
// The sibling count of a baby boom: how much likelier a bigger family is for a child born in one (a share, from the rows' `siblings`).
function worldSiblingBonus(s) {
  if (!histOn()) return 0;
  const me = s.playerId && s.people[s.playerId];
  let t = 0;
  for (const a of worldAt(s.year, me ? me.country : 'us', me ? me.city : '', s)) t += (a.ev.siblings || 0) * a.sev;
  return clamp(t, 0, 0.6);
}
// Whether the call-up reaches you: men in the age band, and (when a war says so) unmarried women of 20 to 30.
function histDraftsMe(s, w) {
  const g = P(s).gender, a = A(s);
  if (!w.hid) return true;
  if (g === 'm') return true;
  const y = w.draftWomen;
  return g === 'f' && !!y && s.year >= y[0] && s.year <= y[1] && a >= 20 && a <= 30 && !P(s).married;
}

/* ---- what the World sheet says ------------------------------------------------------------- */
function worldEffects(s) {
  const out = [], seen = new Set();
  const add1 = (t) => { if (!seen.has(t)) { seen.add(t); out.push(t); } };
  const jobs = wfx(s, 'jobs'), lay = wfx(s, 'layoff'), pay = wfx(s, 'pay'), house = wfx(s, 'housing'), live = wfx(s, 'living'), rates = wfx(s, 'rates'), mood = wfx(s, 'mood');
  if (jobs <= -0.1) add1('Jobs are scarce.'); else if (jobs >= 0.1) add1('There are plenty of jobs.');
  if (lay >= 0.04) add1('Layoffs are likely.');
  if (pay <= -0.01) add1('Pay is falling.'); else if (pay >= 0.02) add1('Pay is rising.');
  if (house <= -0.025) add1('Rents and home prices are falling.'); else if (house >= 0.03) add1('Home prices are rising fast.');
  if (live >= 0.05) add1('Everything costs more.'); else if (live <= -0.04) add1('Prices are falling.');
  if (rates >= 0.02) add1('Interest rates are high.'); else if (rates <= -0.02) add1('Interest rates are very low.');
  if (mood <= -1) add1('People are anxious.'); else if (mood >= 1) add1('The mood is high.');
  for (const a of worldActive(s)) {
    if (a.ev.disease && a.k >= 0.2) add1('A dangerous illness is spreading, hardest on the old.');
    if (a.ev.closed && a.k >= 0.5) add1(`Closed: ${listJoin(a.ev.closed.map((c) => ({ travel: 'travel', nightlife: 'nightlife', gambling: 'gambling', gym: 'gyms', school: 'schools' }[c] || c)))}.`);
    if (a.ev.blast) add1('There is danger close to home.');
  }
  const w = activeWar(s);
  if (w && w.draft) add1('The draft is on.');
  return out;
}
// The events a life lived through, the biggest first.
const WORLD_KIND_RANK = { war: 0, econ: 1, pandemic: 2, unrest: 3, disaster: 4, moment: 5 };
function worldLivedList(s, max) {
  const ids = (M(s).worldLived || []).filter((id) => HIST[id] && !HIST[id].quiet).slice().sort((a, b) => WORLD_KIND_RANK[HIST[a].kind] - WORLD_KIND_RANK[HIST[b].kind]);
  return max ? ids.slice(0, max) : ids;
}
// The one event worth a chip in the header: the biggest thing going on right now (strength times how much it is on people's minds:
// a row's `salience`, 1 unless it says otherwise, so a long war far away does not push a pandemic off the screen).
function worldHeadline(s) {
  const l = worldActive(s).filter((a) => !a.ev.quiet && a.ev.kind !== 'moment' && a.k >= 0.3).sort((a, b) => b.k * (b.ev.salience ?? 1) - a.k * (a.ev.salience ?? 1));
  return l[0] ? l[0].ev : null;
}
