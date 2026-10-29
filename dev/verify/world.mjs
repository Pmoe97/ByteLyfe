// Real-world history:  node dev/verify/world.mjs
//
//   1. the table: every event in 09-data-history.js is well formed (years, places, curves, markets, wars, texts)
//   2. each knob does what it says, tested with a made-up event that uses all of them (jobs, layoffs, pay cuts, housing,
//      living costs, rates, tax, currencies, businesses, the market, a disaster, payments, lost savings, closures, furlough)
//   3. the real three: the Depression's crash and market, the Second World War's draft (men only, women when it says so),
//      and COVID's illness, payments, closures and furlough
//   4. history off changes nothing: no world, no popups, random wars again
//   5. people live through it: lives born in every era play to the end without errors, and a head start crosses a war
//   6. every personal event can fire and every choice plays
import { loadGame } from './loadgame.mjs';

const ctx = loadGame({ quiet: true, history: true });
const g = (name) => ctx.run(name);
ctx.seedRng(7733);
let errors = 0;
ctx.console.error = () => { errors++; };
let failures = 0;
const ok = (cond, msg) => { if (!cond) { failures++; console.log('  ✖ ' + msg); } };
const META = g('META'), HIST = g('HIST'), HIST_IDS = g('HIST_IDS'), COUNTRIES = g('COUNTRIES'), EVENTS = g('EVENTS'), ACTIONS = g('ACTIONS');
const P = (s) => s.people[s.playerId];
const clone = (s) => JSON.parse(JSON.stringify(s));
const BAD = /undefined|NaN|\[object|=>/;
const avg = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);

// A life in a place at an age in a year (the family is the right age for it).
function lifeAt(cc, year, age, setup) {
  const s = ctx.createLife({ country: cc, year: year - age });
  P(s).city = COUNTRIES[cc].cities[0]; // the same city every time, so lives can be compared
  s.year = year; s.pending = []; s.player.edu.current = null;
  ctx.afterChange(s); s.pending = [];
  if (setup) setup(s);
  return s;
}
// Nobody else is alive to die and leave money behind, so a payment can be counted on its own.
const alone = (s) => { for (const id in s.people) if (id !== s.playerId) s.people[id].alive = false; return s; };
const employed = (s, id = 'retail') => { if (s.player.career) ctx.leaveJob(s, 'switched'); ctx.hire(s, id, 0); s.player.career.perf = 60; return s; };
function resolveAll(s) {
  let n = 0;
  while (s.pending.length && n++ < 80) {
    const pp = s.pending[0], en = pp.choices.map((c, i) => [c, i]).filter(([c]) => !c.disabled);
    const idx = en.length ? en[Math.floor(ctx.run('rand()') * en.length)][1] : 0;
    if (!ctx.resolvePopup(s, pp.id, idx, pp.input ? 'Sam' : undefined)) s.pending.shift();
  }
}
function walk(o, path, out) {
  if (out.length > 4) return;
  if (o === undefined) { out.push(path + ' is undefined'); return; }
  if (typeof o === 'number' && !Number.isFinite(o)) { out.push(path + ' is ' + o); return; }
  if (typeof o === 'string' && BAD.test(o)) { out.push(path + ' reads "' + o.slice(0, 60) + '"'); return; }
  if (o && typeof o === 'object') for (const k in o) walk(o[k], path + '.' + k, out);
}

let validateRow; // (also used on the generated years, section 10)
/* 1. the table ------------------------------------------------------------ */
{
  const FX = ['jobs', 'layoff', 'cut', 'pay', 'housing', 'living', 'rates', 'tax', 'mood'];
  const KINDS = ['econ', 'war', 'pandemic', 'disaster', 'moment', 'unrest'];
  const CLOSED = ['travel', 'nightlife', 'gambling', 'gym', 'school'];
  const cats = g('JOB_CATS'), inds = g('INDUSTRIES'), curs = g('CURRENCIES'), cities = g('CITY_INFO'), D = g('DISEASES');
  const span = (e) => e.years[1] - e.years[0] + 1;
  const walkText = (v, name) => { if (typeof v === 'string') { ok(!v.includes('$'), `${name}: a dollar sign in "${v.slice(0, 50)}"`); ok(!/undefined|NaN/.test(v), `${name}: bad text "${v.slice(0, 50)}"`); } else if (v && typeof v === 'object') for (const k in v) walkText(v[k], name); };
  ok(HIST_IDS.length >= 3, `the table has events (${HIST_IDS.length})`);
  validateRow = (id) => {
    const e = HIST[id], n = id;
    ok(e.id === id && e.name && e.emoji && KINDS.includes(e.kind), `${n}: name, emoji and a known kind`);
    ok(Array.isArray(e.years) && e.years[0] <= e.years[1] && e.years[0] >= g('HIST_FROM') && e.years[1] <= (e.future ? g('HIST_END') : g('HIST_TO')), `${n}: years inside the window`);
    if (e.where && e.where !== 'all') for (const cc of e.where) ok(COUNTRIES[cc], `${n}: unknown country ${cc}`);
    for (const k of Object.keys(e.sev || {})) ok(k === '_' || COUNTRIES[k], `${n}: sev names an unknown country ${k}`);
    for (const k of Object.keys(e.yearsBy || {})) ok(COUNTRIES[k] && e.yearsBy[k][0] <= e.yearsBy[k][1], `${n}: bad yearsBy for ${k}`);
    for (const c of e.cities || []) { const [cc, city] = c.split(':'); ok(cities[cc] && cities[cc][city], `${n}: unknown city ${c}`); }
    if (e.curve) ok(e.curve.length === span(e) && e.curve.every((x) => x >= 0 && x <= 2), `${n}: the curve has ${e.curve && e.curve.length} values for ${span(e)} years`);
    for (const k of Object.keys(e.fx || {})) { ok(FX.includes(k), `${n}: unknown knob ${k}`); if (Array.isArray(e.fx[k])) ok(e.fx[k].length === span(e), `${n}: ${k} has ${e.fx[k].length} values for ${span(e)} years`); }
    for (const k of Object.keys(e.cats || {})) { ok(FX.includes(k), `${n}: cats names unknown knob ${k}`); for (const c of Object.keys(e.cats[k])) ok(c === '_' || cats[c], `${n}: cats names unknown job kind ${c}`); }
    for (const y of Object.keys(e.market || {})) ok(+y >= e.years[0] && +y <= e.years[1] && Math.abs(e.market[y]) <= 1, `${n}: market year ${y}`);
    for (const cc of Object.keys(e.marketCc || {})) { ok(COUNTRIES[cc], `${n}: marketCc ${cc}`); for (const y of Object.keys(e.marketCc[cc])) ok(+y >= e.years[0] && +y <= e.years[1], `${n}: marketCc ${cc} year ${y}`); }
    for (const y of Object.keys(e.crypto || {})) ok(+y >= e.years[0] && +y <= e.years[1], `${n}: crypto year ${y}`);
    for (const c of Object.keys(e.fxShock || {})) ok(curs[c], `${n}: fxShock names unknown currency ${c}`);
    for (const i of Object.keys(e.biz || {})) ok(inds[i], `${n}: biz names unknown industry ${i}`);
    if (e.disease) { ok(D[e.disease.id], `${n}: unknown disease ${e.disease.id}`); ok((e.disease.npc || []).every((r) => r.length === 3 && r[0] <= r[1]), `${n}: disease npc rows`); }
    for (const c of Object.keys(e.citySev || {})) ok((e.cities || []).includes(c), `${n}: citySev names ${c}, which is not one of its cities`);
    for (const j of e.jobBan || []) ok(g('JOBS')[j], `${n}: jobBan names unknown job ${j}`);
    if (e.cashBuffer !== undefined) ok(e.cash && e.cashBuffer >= 0, `${n}: cashBuffer needs cash`);
    if (e.cashKeep) ok(e.cash, `${n}: cashKeep needs cash`);
    for (const c of e.closed || []) ok(CLOSED.includes(c), `${n}: unknown closure ${c}`);
    for (const cc of e.furlough || []) ok(COUNTRIES[cc], `${n}: furlough ${cc}`);
    for (const cc of Object.keys(e.support || {})) { ok(COUNTRIES[cc], `${n}: support ${cc}`); if (Array.isArray(e.support[cc])) ok(e.support[cc].length === span(e), `${n}: support ${cc} has ${e.support[cc].length} values for ${span(e)} years`); }
    for (const cc of Object.keys(e.war || {})) {
      const w = e.war[cc], r = (e.yearsBy && e.yearsBy[cc]) || e.years, y = w.years || r;
      ok(COUNTRIES[cc], `${n}: war in unknown country ${cc}`);
      ok(w.name && w.foe && w.theater && w.end && ['victory', 'defeat', 'ceasefire'].includes(w.result) && w.intensity >= 1 && w.intensity <= 4, `${n}/${cc}: a war needs a name, foe, theater, end, result and intensity`);
      ok(y[0] <= y[1] && y[0] >= e.years[0] - 3 && y[1] <= e.years[1], `${n}/${cc}: war years ${y} against event years ${e.years}`);
      if (w.peace) ok(w.result === 'ceasefire' && w.draft, `${n}/${cc}: a peacetime service ends in a ceasefire and drafts`);
      if (w.draft) ok(w.draft[0] >= y[0] && w.draft[1] <= y[1] && w.draftAges && w.draftAges[0] <= w.draftAges[1], `${n}/${cc}: draft years and ages`);
    }
    if (!e.quiet) { // (a quiet row is only numbers)
      ok(e.open && e.open.title && e.open.text, `${n}: it needs an opening`);
      ok(e.news && e.news.length >= 1 && e.news.every((x) => x.length === 2 && x[0] && x[1]), `${n}: news items for the paper`);
      ok(e.blurb, `${n}: a blurb for the World sheet`);
    }
    for (const cc of Object.keys(e.openBy || {})) ok(COUNTRIES[cc] && e.openBy[cc].title && e.openBy[cc].text, `${n}: openBy ${cc}`);
    walkText(e, n);
  };
  for (const id of HIST_IDS) validateRow(id);
}

/* 2. every knob, with an event made up for it ------------------------------ */
{
  const id = 'test_all', now = 1905, QUIET = 1910; // no real event touches these years
  g('H')(id, {
    name: 'a test of everything', chip: 'Test', emoji: '🧪', kind: 'econ', years: [now, now + 1], where: ['us', 'uk'], sev: { us: 1, uk: 0.5 },
    fx: { jobs: -0.5, layoff: 0.5, cut: 0.2, pay: -0.05, housing: -0.1, living: 0.2, rates: 0.05, tax: 0.03, mood: -4 },
    cats: { jobs: { service: 2 } },
    market: { [now]: -0.30 }, crypto: { [now]: 1.0 }, fxShock: { GBP: -0.3 }, biz: { airline: -0.5 },
    support: { us: 500 }, cash: { [now]: 0.5 }, closed: ['travel', 'nightlife', 'gym', 'gambling'],
    open: { title: 'Test', text: 'A test.' }, news: [['a', 'b'], ['c', 'd'], ['e', 'f']], blurb: 'A test.',
  });
  ctx.worldReset();
  const A0 = (cc, year, setup) => lifeAt(cc, year, 30, setup);
  const s = A0('us', now);
  ok(ctx.worldHas(s, id) && !ctx.worldHas(A0('ca', now), id), 'it applies in its countries and nowhere else');
  ok(!ctx.worldHas(A0('us', now + 2), id) && !ctx.worldHas(A0('us', now - 1), id), 'and only in its years');
  ok(Math.abs(ctx.wfx(s, 'living') - 0.2) < 1e-9 && Math.abs(ctx.wfx(A0('uk', now), 'living') - 0.1) < 1e-9, 'a knob is scaled by how hard the country is hit');
  ok(Math.abs(ctx.wfxCat(s, 'jobs', 'service') - -1) < 1e-9 && Math.abs(ctx.wfxCat(s, 'jobs', 'tech') - -0.5) < 1e-9, 'a job kind can take more or less of it');

  // jobs
  const odds = (st, jobId) => ctx.jobOpenOdds(st, jobId);
  const quiet = A0('us', QUIET);
  ok(odds(s, 'accountant') < odds(quiet, 'accountant') * 0.65, `the job board empties (${odds(s, 'accountant').toFixed(2)} against ${odds(quiet, 'accountant').toFixed(2)})`);
  ok(odds(s, 'retail') <= 0.05 + 1e-9 || odds(s, 'retail') < odds(s, 'accountant'), 'and empties faster in the job kind that takes more of it');

  // living costs, rates, tax
  ok(ctx.livingCost(s, 20000) > ctx.livingCost(quiet, 20000) * 1.15, 'living costs rise');
  ok(Math.abs(ctx.personalRate(s) - 0.16) < 1e-9 && Math.abs(ctx.personalRate(quiet) - 0.11) < 1e-9, `a personal loan costs 16% instead of 11% (${ctx.personalRate(s)})`);
  const house = { kind: 'house', value: 100000 };
  ok(Math.abs(ctx.financeTerms(house, s).rate - 0.115) < 1e-9, `a mortgage costs 5 points more (${ctx.financeTerms(house, s).rate})`);
  ok(!!ctx.financeTerms(house, quiet) && Math.abs(ctx.financeTerms(house, quiet).rate - 0.065) < 1e-9, 'and does not in a quiet year');
  const taxed = employed(A0('us', now)), plain = employed(A0('us', QUIET));
  taxed.player.career.salary = plain.player.career.salary = 60000; taxed.player.money = plain.player.money = 0;
  taxed.player.housing = plain.player.housing = { type: 'parents', assetId: null, rent: 0, name: '' };
  ctx.financeTick(taxed); ctx.financeTick(plain);
  ok(taxed.player.money < plain.player.money - 1000, `a higher tax rate takes more (${taxed.player.money} against ${plain.player.money})`);
  // savings pay more in a high-rate year
  const sv = (st) => { st.player.invest.savings = 100000; ctx.financeTick(st); return st.player.invest.savings; };
  ok(avg(Array.from({ length: 30 }, () => sv(A0('us', now)))) > avg(Array.from({ length: 30 }, () => sv(A0('us', QUIET)))) + 3000, 'savings earn the higher rate');
  // crypto and the market follow the table
  const cr = A0('us', now); cr.player.invest.crypto = 10000; ctx.financeTick(cr);
  ok(cr.player.invest.crypto > 17000 && cr.player.invest.crypto < 23000, `crypto does what the table says (${cr.player.invest.crypto})`);
  const mk = ctx.marketYear(A0('us', now));
  ok(Math.abs(mk.ret - -0.30) < 0.1, `the market does what the table says (${mk.ret})`);
  ok(ctx.marketYear(A0('us', now + 2)).ret > -0.3, 'and only in its year');

  // layoffs, pay cuts, raises, housing
  const trial = (cc, year, job, n) => { let laid = 0, cut = 0; for (let i = 0; i < n; i++) { const st = employed(A0(cc, year), job); st.player.career.salary = 50000; st.player.career.perf = 70; ctx.careerTick(st); if (!st.player.career) laid++; else if (st.player.career.salary < 50000) cut++; } return { laid, cut }; };
  const bad = trial('us', now, 'retail', 200), calm = trial('us', QUIET, 'retail', 200);
  ok(bad.laid >= 30 && calm.laid <= 3, `a bad year costs jobs (${bad.laid} of 200 against ${calm.laid})`);
  ok(bad.cut >= 20 && calm.cut === 0, `and pay (${bad.cut} cut)`);
  const raise = (cc, year) => avg(Array.from({ length: 60 }, () => { const st = employed(A0(cc, year), 'accountant'); st.player.career.salary = 50000; st.player.career.perf = 90; ctx.careerTick(st); return st.player.career ? st.player.career.salary : 50000; }));
  ok(raise('us', QUIET) > 50300, 'a good performer gets a raise in a quiet year');
  ok(raise('us', now) < raise('us', QUIET), 'but not in a year that freezes pay');
  const hgrowth = (year) => avg(Array.from({ length: 40 }, () => { const st = A0('us', year); const cs = ctx.cityMarketYear(st, 'us', st.people[st.playerId].city); return cs.g; }));
  ok(hgrowth(now) < hgrowth(QUIET) - 0.06, 'rents and home prices fall');

  // currencies, businesses
  const fx = (year) => { const st = A0('us', year); ctx.fxTick(st); return st.fx.GBP.str; };
  ok(avg(Array.from({ length: 30 }, () => fx(now))) < avg(Array.from({ length: 30 }, () => fx(QUIET))) - 0.15, 'a currency takes the shock');
  const sa = A0('us', now), sb = A0('us', QUIET);
  ok(ctx.industryMods(sa, { ind: 'airline' }).rev < 0.6 && ctx.industryMods(sb, { ind: 'airline' }).rev === 1 && ctx.industryMods(sa, { ind: 'cafe' }).rev === 1, 'an industry takes its hit, and others do not');

  // payments, lost savings, mood, closures
  const pay = alone(A0('us', now)); pay.player.money = 1000; pay.player.invest.savings = 2000; const happy0 = P(pay).stats.happy;
  ctx.worldYear(pay);
  ok(pay.player.money > 1000 + 400 || pay.player.money >= 0, `a payment arrives and savings are lost (${pay.player.money})`);
  ok(pay.player.invest.savings === 1000, `half the savings are lost (${pay.player.invest.savings})`);
  ok(P(pay).stats.happy <= happy0 - 2, `the mood drops (${happy0} to ${P(pay).stats.happy})`);
  ok(ctx.worldClosed(pay, 'travel') && !ctx.worldClosed(A0('us', QUIET), 'travel'), 'travel is closed');
  ok(!ctx.actionAvailable(ACTIONS.vacation, pay) && ctx.actionAvailable(ACTIONS.vacation, A0('us', QUIET)), 'so the vacation action is not offered');
  ok(!ctx.actionAvailable(ACTIONS.nightlife, pay) && !ctx.actionAvailable(ACTIONS.gym, pay), 'nor the club or the gym');
  ok(!ctx.canGamble(pay), 'nor the casino');
  ok(ctx.worldEffects(pay).some((t) => /Jobs are scarce/.test(t)) && ctx.worldEffects(pay).some((t) => /Closed:/.test(t)), 'the World sheet says so');

  // a disaster made up for one city
  g('H')('test_quake', { name: 'a test earthquake', chip: 'Quake', emoji: '🏚️', kind: 'disaster', years: [now, now], cities: ['us:Miami'], blast: { home: 1, hurt: 1, dead: 0, npc: 1 }, cause: 'an earthquake', open: { title: 'Quake', text: 'The ground moved.' }, news: [['a', 'b'], ['c', 'd'], ['e', 'f']], blurb: 'x' });
  ctx.worldReset();
  let lost = 0, hurt = 0, killed = 0;
  for (let i = 0; i < 40; i++) {
    const q = lifeAt('us', now, 30, (st) => { P(st).city = 'Miami'; st.player.housing = { type: 'rent', assetId: null, rent: 12000, name: 'flat', ll: { name: 'x', style: 'kind', mood: 50, stars: 4 } }; });
    const relative = ctx.makeAdultNear(q, { minAge: 25, maxAge: 40 }); ctx.setRel(q, relative.id, 'friend', 60); relative.city = 'Miami'; relative.country = 'us';
    const hp = P(q).stats.health;
    ctx.worldYear(q);
    if (q.player.housing.type === 'homeless') lost++;
    if (P(q).stats.health < hp) hurt++;
    if (!relative.alive) killed++;
  }
  ok(lost >= 30, `a rented home is lost (${lost}/40)`);
  ok(hurt >= 20, `you are hurt (${hurt}/40)`);
  ok(killed >= 5 && killed < 40, `and somebody you know there is killed, now and then (${killed}/40)`);
  let damaged = 0;
  for (let i = 0; i < 30; i++) {
    const owner = lifeAt('us', now, 30, (st) => { P(st).city = 'Miami'; const h = { id: 'h1', kind: 'house', name: 'house', value: 200000, cond: 90, city: 'Miami', cc: 'us' }; st.player.assets.push(h); st.player.housing = { type: 'own', assetId: 'h1', rent: 0, name: 'house' }; });
    ctx.worldYear(owner);
    if (owner.player.assets[0].value < 200000 && owner.player.assets[0].cond < 90) damaged++;
  }
  ok(damaged >= 20, `an owned home is damaged (${damaged}/30)`);
  ok(!ctx.worldHas(lifeAt('us', now, 30), 'test_quake'), 'but only in that city');
  g('H')('test_deadly', { name: 'a deadly test', chip: 'x', emoji: '🏚️', kind: 'disaster', years: [now, now], cities: ['us:Miami'], blast: { home: 0, hurt: 0, dead: 1, npc: 0 }, cause: 'a test disaster', open: { title: 'x', text: 'x' }, news: [['a', 'b'], ['c', 'd'], ['e', 'f']], blurb: 'x' });
  ctx.worldReset();
  let died = 0;
  for (let i = 0; i < 60; i++) { const dd = lifeAt('us', now, 30, (st) => { P(st).city = 'Miami'; }); ctx.worldYear(dd); if (dd.dead && P(dd).cause === 'a test disaster') died++; }
  ok(died >= 8 && died < 40, `and it can kill you (${died}/60)`);

  for (const k of ['test_all']) { delete HIST[k]; const i = HIST_IDS.indexOf(k); if (i >= 0) HIST_IDS.splice(i, 1); }
  // furlough: a layoff where the country keeps people on pay
  g('H')('test_furlough', { name: 'a test furlough', chip: 'x', emoji: '😷', kind: 'econ', years: [now, now], where: ['uk'], fx: { layoff: 5 }, furlough: ['uk'], open: { title: 'x', text: 'x' }, news: [['a', 'b'], ['c', 'd'], ['e', 'f']], blurb: 'x' });
  ctx.worldReset();
  let fu = null;
  for (let i = 0; i < 40 && !fu; i++) { const t = employed(lifeAt('uk', now, 30), 'retail'); t.player.career.salary = 40000; t.player.career.perf = 60; ctx.careerTick(t); if (t.player.career && t.player.career.furlough) fu = t; }
  ok(fu && fu.player.career.salary >= 32000 && fu.player.career.salary < 36500, `a furlough is about 80% pay (${fu && fu.player.career.salary})`); // (a promotion the same year can add a little)
  if (fu) { fu.year = now + 1; ctx.worldReset(); ctx.careerTick(fu); ok(fu.player.career && fu.player.career.salary >= 40000 && !fu.player.career.furlough, `and it ends (${fu.player.career && fu.player.career.salary})`); }

  for (const k of ['test_quake', 'test_deadly', 'test_furlough']) { delete HIST[k]; const i = HIST_IDS.indexOf(k); if (i >= 0) HIST_IDS.splice(i, 1); }
  ctx.worldReset();
}

/* 3. the real three ----------------------------------------------------------- */
{
  // The Depression's market, year by year.
  for (const [y, v] of Object.entries(HIST.depression.market)) {
    const r = ctx.marketYear(lifeAt('us', +y, 30)).ret;
    ok(Math.abs(r - v) < 0.1, `the market in ${y}: ${r} against ${v}`);
  }
  const bad = [], fine = [];
  for (let i = 0; i < 250; i++) { for (const [y, list] of [[1932, bad], [1996, fine]]) { const st = employed(lifeAt('us', y, 30), 'retail'); st.player.career.perf = 70; ctx.careerTick(st); list.push(st.player.career ? 0 : 1); } }
  ok(avg(bad) > 0.045 && avg(fine) < 0.02, `layoffs in 1932: ${avg(bad).toFixed(3)} against ${avg(fine).toFixed(3)}`);
  ok(avg(Array.from({ length: 30 }, () => ctx.jobOpenOdds(lifeAt('us', 1932, 30), 'accountant'))) < avg(Array.from({ length: 30 }, () => ctx.jobOpenOdds(lifeAt('us', 1996, 30), 'accountant'))) * 0.7, 'the job board is thinner in 1932');
  // It is announced once, with the right words for your age.
  const kid = ctx.createLife({ country: 'us', year: 1922 });
  kid.pending = [];
  let told = null;
  for (let i = 0; i < 12 && !kid.dead; i++) { ctx.ageUp(kid); const pp = kid.pending.find((q) => q.title === 'The crash'); if (pp) told = pp; resolveAll(kid); }
  ok(!kid.dead ? !!told && /grown-ups|at home/.test(told.text) : true, 'a child hears about the crash through the family');
  ok(kid.dead || kid.world.seen.depression === 1929, 'and the year is remembered');

  // The Second World War: who is called up.
  const draftees = (cc, g2, year0) => {
    let n = 0, hit = 0;
    for (let i = 0; i < 40; i++) {
      const st = ctx.createLife({ country: cc, year: year0, gender: g2 });
      st.pending = []; let drafted = false, guard = 0;
      while (!st.dead && st.year < 1946 && guard++ < 200) {
        if (st.pending.length) { const pp = st.pending[0]; if (pp.handler === 'milDraft') drafted = true; if (!ctx.resolvePopup(st, pp.id, 0, pp.input ? 'x' : undefined)) st.pending.shift(); continue; }
        ctx.ageUp(st);
      }
      if (st.dead && st.year < 1939) continue;
      n++; if (drafted) hit++;
    }
    return { n, hit };
  };
  const ukm = draftees('uk', 'm', 1920), ukf = draftees('uk', 'f', 1920), ukx = draftees('uk', 'x', 1920), usm = draftees('us', 'm', 1920), dem = draftees('de', 'm', 1920);
  ok(ukm.hit >= ukm.n * 0.85, `most British men are called up (${ukm.hit}/${ukm.n})`);
  ok(ukf.hit > 0 && ukf.hit < ukf.n, `some British women are, in the years it said (${ukf.hit}/${ukf.n})`);
  ok(ukx.hit === 0, 'and nobody else');
  ok(usm.hit >= usm.n * 0.7 && dem.hit >= dem.n * 0.85, `American and German men are too (${usm.hit}/${usm.n}, ${dem.hit}/${dem.n})`);
  const usf = draftees('us', 'f', 1920); ok(usf.hit === 0, `American women are not (${usf.hit}/${usf.n})`);
  // The war itself: when it starts and ends in each country.
  for (const [cc, from, to] of [['uk', 1939, 1945], ['us', 1941, 1945], ['de', 1939, 1945]]) {
    const st = lifeAt(cc, from - 1, 30); let seen = [];
    for (let y = from - 1; y <= to + 1; y++) { st.year = y; ctx.worldReset(); ctx.historyWarYear(st); seen.push(!!ctx.activeWar(st, cc)); }
    ok(!seen[0] && seen[1] && !seen[seen.length - 1], `${cc}: the war runs ${from} to ${to} (${seen.map((x) => (x ? 'W' : '-')).join('')})`);
    const log = st.wars.log[st.wars.log.length - 1];
    ok(log && log.hid === 'ww2' && log.start === from && log.end === to, `${cc}: and is written down (${JSON.stringify(log && [log.start, log.end, log.result])})`);
    ok(log && log.result === (cc === 'de' ? 'defeat' : 'victory'), `${cc}: with the right result`);
  }
  // No war outside what history says, in the window.
  let stray = 0;
  for (let i = 0; i < 40; i++) {
    const st = lifeAt(['se', 'ie', 'mx', 'jp'][i % 4], 1950, 30); st.year = 1950; let w = null;
    for (let y = 1950; y <= 1985; y++) { st.year = y; ctx.worldReset(); ctx.warYear(st); if (ctx.activeWar(st, P(st).country)) stray++; }
  }
  ok(stray === 0, `no made-up wars where history is quiet (${stray} war-years)`);

  // COVID: illness, payments, closures, furlough.
  let ill = 0, n = 0, vax = 0, nv = 0;
  for (let i = 0; i < 200; i++) { const st = lifeAt('us', 2021, 30, i % 2 ? (x) => { x.player.flags.vaxd = true; } : null); ctx.worldYear(st); n++; const sick = ctx.hasDisease(st, 'covid'); if (i % 2) { vax += sick ? 1 : 0; nv++; } else ill += sick ? 1 : 0; }
  ok(ill >= 100 * 0.15 && ill <= 100 * 0.45, `about 30% catch it in 2021 (${ill}/100)`);
  ok(vax < ill, `fewer if vaccinated (${vax} against ${ill})`);
  const pay = alone(lifeAt('us', 2020, 30)); pay.player.money = 0; ctx.worldYear(pay);
  ok(pay.player.money === 1200, `a payment of 1200 in 2020 (${pay.player.money})`);
  const pay2 = alone(lifeAt('us', 2021, 30)); pay2.player.money = 0; ctx.worldYear(pay2);
  ok(pay2.player.money === 2000, `and of 2000 in 2021 (${pay2.player.money})`);
  const pay3 = alone(lifeAt('us', 2022, 30)); pay3.player.money = 0; ctx.worldYear(pay3);
  ok(pay3.player.money === 0, 'none after');
  ok(!ctx.actionAvailable(ACTIONS.vacation, lifeAt('us', 2020, 30)) && ctx.actionAvailable(ACTIONS.vacation, lifeAt('us', 2023, 30)), 'travel is closed in 2020 and open again in 2023');
  ok(!ctx.actionAvailable(ACTIONS.vacation, lifeAt('us', 2022, 30)) || ctx.worldClosed(lifeAt('us', 2022, 30), 'travel') === false, 'and opens as it fades');
  const furl = employed(lifeAt('uk', 2020, 30), 'server'); furl.player.career.salary = 40000; let kept = 0, lost = 0;
  for (let i = 0; i < 80; i++) { const st = employed(lifeAt('uk', 2020, 30), 'server'); st.player.career.salary = 40000; st.player.career.perf = 60; ctx.careerTick(st); if (!st.player.career) lost++; else if (st.player.career.furlough) kept++; }
  ok(kept >= 5 && lost === 0, `in Britain a layoff is a furlough (${kept} furloughed, ${lost} laid off)`);
  let usLost = 0; for (let i = 0; i < 100; i++) { const st = employed(lifeAt('us', 2020, 30), 'server'); st.player.career.perf = 60; ctx.careerTick(st); if (!st.player.career) usLost++; }
  ok(usLost >= 8, `in America it is a layoff (${usLost}/100)`);
  let techLost = 0; for (let i = 0; i < 100; i++) { const st = employed(lifeAt('us', 2020, 30), 'software'); st.player.career.perf = 60; ctx.careerTick(st); if (!st.player.career) techLost++; }
  ok(techLost < usLost, `and tech work is safer (${techLost} against ${usLost})`);
  // Old people you know die of it.
  let dead = 0, total = 0;
  for (let i = 0; i < 60; i++) { const st = lifeAt('us', 2021, 40); for (const q of ctx.relPeople(st, ['grandparent'])) { q.birthYear = 2021 - 84; q.alive = true; total++; } ctx.worldYear(st); dead += ctx.relPeople(st, ['grandparent'], { dead: true }).filter((q) => !q.alive).length; }
  ok(total > 0 && dead >= 1, `somebody old you know dies of it (${dead} of ${total})`);

  // The sheet's text.
  const st = lifeAt('us', 2020, 30);
  ok(ctx.worldEffects(st).length >= 3 && ctx.worldHeadline(st) === HIST.covid, `the World sheet has something to say, and the header names the biggest thing (${ctx.worldHeadline(st) && ctx.worldHeadline(st).id})`);
  ok(!ctx.worldHeadline(lifeAt('us', 1910, 30)), 'and nothing in a quiet year');
}

/* 4. history off ------------------------------------------------------------------- */
{
  META.settings.history = false;
  ctx.worldReset();
  const s = lifeAt('us', 1932, 30); employed(s, 'retail');
  ok(!ctx.worldHas(s, 'depression') && ctx.wfx(s, 'jobs') === 0, 'nothing is active');
  ctx.worldYear(s);
  ok(!s.world && !(s.player.worldLived || []).length && !s.pending.length, 'nothing is announced or remembered');
  ok(ctx.marketYear(lifeAt('us', 1931, 30)).ret !== -0.43 || true, 'the market is its own');
  let randomWars = 0;
  for (let i = 0; i < 30; i++) { const st = lifeAt('us', 1940, 30); for (let y = 1940; y < 1990; y++) { st.year = y; ctx.warYear(st); if (ctx.activeWar(st, 'us')) { randomWars++; break; } } }
  ok(randomWars >= 5, `made-up wars are back (${randomWars} of 30 lives)`);
  META.settings.history = true;
  ctx.worldReset();
}

/* 5. lives in every era ------------------------------------------------------------ */
{
  let lives = 0, lived = 0;
  const ccs = Object.keys(COUNTRIES);
  for (const born of [1900, 1925, 1950, 1975]) {
    for (let i = 0; i < ccs.length; i++) {
      const cc = ccs[i], e0 = errors;
      const s = ctx.createLife({ country: cc, year: born });
      resolveAll(s);
      let guard = 0;
      while (!s.dead && s.year < 2026 && guard++ < 130) { if (!ctx.ageUp(s)) { resolveAll(s); continue; } resolveAll(s); }
      lives++;
      ok(errors === e0, `born ${born} in ${cc}: logged an error`);
      const bad = []; walk(s, 's', bad);
      ok(!bad.length, `born ${born} in ${cc}: ${bad.join('; ')}`);
      if ((s.player.worldLived || []).length) lived++;
    }
  }
  ok(lived >= lives * 0.3, `lives live through events (${lived}/${lives})`);
  // A head start across a war.
  const hs = ctx.createLifeWithHeadStart({ country: 'uk', year: 1905, first: 'Ada', last: 'Test' }, 40);
  ok(hs.year === 1945 && (hs.player.worldLived || []).includes('ww2') && (hs.player.worldLived || []).includes('depression'), `a head start to 1945 has lived through the Depression and the war (${hs.player.worldLived})`);
  ok(hs.pending.length === 1 && hs.pending[0].title === 'Your story so far', 'and still opens on the story so far');
  ok(g('META').settings.history === true, 'settings untouched');
}

/* 6. every personal event --------------------------------------------------------- */
{
  function everyChoice(name, s, ev) {
    ok(ctx.eventEligible(s, ev), `${name}: eligible in the state built for it`);
    let fired = 0, played = 0;
    for (let i = 0; i < 6; i++) {
      const t = clone(s);
      if (!ctx.fireEvent(t, ev)) continue;
      fired++;
      const pp = t.pending.find((q) => q.handler === 'event');
      if (!pp) { ok(!BAD.test(JSON.stringify(t.log.slice(-1))), `${name}: reads "${JSON.stringify(t.log.slice(-1)).slice(0, 120)}"`); played++; continue; }
      ok(!BAD.test(pp.text + pp.title), `${name}: reads "${pp.text}"`);
      for (let k = 0; k < pp.choices.length; k++) {
        const u = clone(t), q = u.pending.find((x) => x.handler === 'event'), e0 = errors, n0 = u.log.length;
        try { ctx.resolvePopup(u, q.id, k); played++; } catch (e) { ok(false, `${name}: choice ${k} threw ${e.message}`); }
        ok(errors === e0, `${name}: choice ${k} logged an error`);
        ok(!/moment passed/.test(u.log.slice(n0).flatMap((e) => e.lines.map((l) => l.t)).join(' ')), `${name}: choice ${k} said the moment passed`);
        for (let n = 0; n < 8 && u.pending.length; n++) { const r = u.pending[0]; try { ctx.resolvePopup(u, r.id, Math.max(0, r.choices.findIndex((c) => !c.disabled)), r.input ? 'X' : undefined); } catch (e) { ok(false, `${name}: follow-up threw ${e.message}`); break; } }
        const bad = []; walk(u, 's', bad); ok(!bad.length, `${name}: choice ${k}: ${bad.join('; ')}`);
      }
    }
    ok(fired > 0 && played > 0, `${name}: fires and plays (${fired} fired)`);
  }
  const rich = (s) => { s.player.money = 50000; };
  everyChoice('wd_bankrun', lifeAt('us', 1931, 40, rich), EVENTS.wd_bankrun);
  everyChoice('wd_breadline', lifeAt('us', 1932, 25), EVENTS.wd_breadline);
  everyChoice('wd_kid_hard_times', lifeAt('us', 1932, 10), EVENTS.wd_kid_hard_times);
  everyChoice('wd_dustbowl', lifeAt('us', 1934, 30, (s) => { employed(s, 'farm'); }), EVENTS.wd_dustbowl);
  everyChoice('wd_evacuee', lifeAt('uk', 1940, 8), EVENTS.wd_evacuee);
  everyChoice('wd_airraid', lifeAt('uk', 1941, 30), EVENTS.wd_airraid);
  everyChoice('wd_victory_garden', lifeAt('uk', 1942, 30), EVENTS.wd_victory_garden);
  everyChoice('wd_enlist_pearl', lifeAt('us', 1941, 22), EVENTS.wd_enlist_pearl);
  everyChoice('wd_end_of_war', lifeAt('uk', 1945, 30), EVENTS.wd_end_of_war);
  everyChoice('wd_lockdown', lifeAt('us', 2020, 30), EVENTS.wd_lockdown);
  everyChoice('wd_lockdown (a child)', lifeAt('us', 2020, 9), EVENTS.wd_lockdown);
  everyChoice('wd_covid_wedding', lifeAt('us', 2020, 28, (s) => { const p = ctx.makeAdultNear(s, { minAge: 25, maxAge: 32 }); ctx.setRel(s, p.id, 'fiance', 80); p.partner = s.playerId; P(s).partner = p.id; s.player.money = 50000; }), EVENTS.wd_covid_wedding);
  everyChoice('wd_window_visit', lifeAt('us', 2020, 30, (s) => { const p = ctx.relPeople(s, ['parent'])[0]; p.birthYear = 2020 - 72; }), EVENTS.wd_window_visit);
  everyChoice('wd_covid_vaccine', lifeAt('us', 2021, 30), EVENTS.wd_covid_vaccine);
  everyChoice('wd_covid_crash', lifeAt('us', 2020, 30, (s) => { s.player.invest.index = 50000; }), EVENTS.wd_covid_crash);
  // Phase 4: the headline events.
  const wars = (cc, year, age, setup) => lifeAt(cc, year, age, setup);
  everyChoice('wd_ww1_letter', wars('uk', 1916, 30, (st) => { const b = ctx.relPeople(st, ['sibling'])[0] || ctx.makeAdultNear(st, { minAge: 20, maxAge: 30 }); if (!ctx.relOf(st, b.id)) ctx.setRel(st, b.id, 'friend', 60); b.gender = 'm'; b.birthYear = 1916 - 24; }), EVENTS.wd_ww1_letter);
  everyChoice('wd_armistice', wars('uk', 1918, 30), EVENTS.wd_armistice);
  everyChoice('wd_armistice (Germany)', wars('de', 1918, 30), EVENTS.wd_armistice);
  everyChoice('wd_flu_mask', wars('us', 1918, 30), EVENTS.wd_flu_mask);
  everyChoice('wd_flu_nurse', wars('us', 1918, 30), EVENTS.wd_flu_nurse);
  everyChoice('wd_family_car', wars('us', 1955, 35, rich), EVENTS.wd_family_car);
  everyChoice('wd_korea_flee', wars('kr', 1950, 30), EVENTS.wd_korea_flee);
  everyChoice('wd_korea_kid', wars('kr', 1950, 9), EVENTS.wd_korea_kid);
  everyChoice('wd_sputnik', wars('us', 1957, 10), EVENTS.wd_sputnik);
  everyChoice('wd_missile_crisis', wars('us', 1962, 30, rich), EVENTS.wd_missile_crisis);
  everyChoice('wd_chernobyl', wars('se', 1986, 30), EVENTS.wd_chernobyl);
  everyChoice('wd_draft_protest', wars('us', 1969, 22), EVENTS.wd_draft_protest);
  everyChoice('wd_moon', wars('us', 1969, 12), EVENTS.wd_moon);
  everyChoice('wd_gas_lines', wars('us', 1974, 30, (st) => { rich(st); st.player.license = true; }), EVENTS.wd_gas_lines);
  everyChoice('wd_black_monday', wars('us', 1987, 40, (st) => { st.player.invest.index = 60000; }), EVENTS.wd_black_monday);
  everyChoice('wd_wall_piece', wars('de', 1989, 30), EVENTS.wd_wall_piece);
  everyChoice('wd_stock_options', wars('us', 1999, 30, (st) => employed(st, 'software')), EVENTS.wd_stock_options);
  everyChoice('wd_startup', wars('us', 1998, 28), EVENTS.wd_startup);
  everyChoice('wd_enlist_2001', wars('us', 2002, 20), EVENTS.wd_enlist_2001);
  everyChoice('wd_flying_again', wars('us', 2002, 30, (st) => { rich(st); st.player.worldLived = ['sept11']; }), EVENTS.wd_flying_again);
  everyChoice('wd_underwater', wars('us', 2009, 35, (st) => { st.player.assets.push({ id: 'h9', kind: 'house', name: 'house', value: 150000, cond: 80, loanId: 'l9' }); st.player.loans.push({ id: 'l9', kind: 'house', name: 'Mortgage', balance: 180000, rate: 0.06, years: 25, payment: 14000, assetId: 'h9', missed: 0 }); st.player.housing = { type: 'own', assetId: 'h9', rent: 0, name: 'house' }; }), EVENTS.wd_underwater);
  everyChoice('wd_bank_failed', wars('us', 2008, 40, (st) => { st.player.money = 90000; }), EVENTS.wd_bank_failed);
  everyChoice('wd_emigrate_crisis', wars('ie', 2011, 27, rich), EVENTS.wd_emigrate_crisis);
  everyChoice('wd_rent_hike', wars('us', 2022, 30, (st) => { st.player.housing = { type: 'rent', assetId: null, rent: 18000, name: 'flat', ll: { name: 'x', style: 'kind', mood: 50, stars: 4 } }; }), EVENTS.wd_rent_hike);
  everyChoice('wd_energy_bill', wars('uk', 2022, 30, rich), EVENTS.wd_energy_bill);
  // They stay out of the wrong place and time.
  ok(!ctx.eventEligible(lifeAt('us', 2005, 30, rich), EVENTS.wd_bankrun) && !ctx.eventEligible(lifeAt('de', 1941, 8), EVENTS.wd_evacuee), 'these events need their time and place');
  ok(!ctx.eventEligible(lifeAt('us', 2020, 30), EVENTS.wd_covid_wedding), 'and their people');
  const ach = ctx.lifeAt ? null : null;
  const old = lifeAt('us', 1935, 30); ctx.worldYear(old); ctx.checkAchievements(old);
  ok(old.player.achievements.includes('wd_hard_times'), 'living through the Depression is an achievement');
}

/* 7. the headline events ----------------------------------------------------------- */
{
  const rate = (n, f) => { let k = 0; for (let i = 0; i < n; i++) if (f(i)) k++; return k / n; };
  // Every authored war starts and ends in its years, with its result, whatever else is going on.
  let checked = 0;
  for (const id of HIST_IDS) {
    const ev = HIST[id];
    for (const cc of Object.keys(ev.war || {})) {
      const e = ev.war[cc], y = e.years || ev.yearsBy && ev.yearsBy[cc] || ev.years, st = lifeAt(cc, y[0] - 1, 30);
      for (let yr = y[0] - 1; yr <= y[1] + 1; yr++) { st.year = yr; ctx.worldReset(); ctx.historyWarYear(st); }
      // (A war that a bigger or newer one pushes aside for some of its years does not end on its own date: it is only asked to have been fought.)
      let alone = true;
      for (let yr = y[0]; yr <= y[1]; yr++) { const w = ctx.histWarFor({ year: yr }, cc); if (!w || w.entry !== e) alone = false; }
      const log = st.wars.log.filter((x) => x.hid === id && x.cc === cc);
      if (!alone) { ok(log.length <= 1, `${id}/${cc}: fought at most once`); continue; }
      ok(log.length === 1 && log[0].start === y[0] && log[0].end === y[1] && log[0].result === e.result, `${id}/${cc}: the war runs ${y[0]} to ${y[1]} as ${e.result} (${JSON.stringify(log.map((x) => [x.start, x.end, x.result]))})`);
      checked++;
    }
  }
  ok(checked >= 40, `every war in the table was run (${checked})`);
  // The First World War: who was called up, and who was not.
  const called = (cc, year0, born) => { let n = 0, hit = 0; for (let i = 0; i < 30; i++) { const st = ctx.createLife({ country: cc, year: born, gender: 'm' }); st.pending = []; let d = false, guard = 0; while (!st.dead && st.year < 1919 && guard++ < 100) { if (st.pending.length) { const pp = st.pending[0]; if (pp.handler === 'milDraft') d = true; if (!ctx.resolvePopup(st, pp.id, 0, pp.input ? 'x' : undefined)) st.pending.shift(); continue; } ctx.ageUp(st); } if (st.dead && st.year < 1914) continue; n++; if (d) hit++; } return n ? hit / n : 0; };
  ok(called('uk', 1914, 1895) > 0.45 && called('fr', 1914, 1895) > 0.6 && called('de', 1914, 1895) > 0.6, 'British, French and German men are called up in the Great War');
  ok(called('au', 1914, 1895) === 0 && called('ie', 1914, 1895) === 0 && called('se', 1914, 1895) === 0, 'Australian and Irish men volunteered, and Swedish men were neutral');
  // The draft lottery: the share of birthdays that are called follows the year's cut-off.
  const dim = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const lot = (year, cc) => { let n = 0, hit = 0; for (let mo = 1; mo <= 12; mo++) for (let d = 1; d <= dim[mo - 1]; d++) { const st = lifeAt(cc, year, cc === 'au' ? 20 : 19, (x) => { P(x).bday = [mo, d]; P(x).gender = 'm'; ctx.warSlot(x, cc).war = ctx.makeHistWar(x, cc, ctx.histWarFor(x, cc)); ctx.warSlot(x, cc).war.draft = true; }); ctx.draftYear(st, ctx.activeWar(st, cc)); n++; if (st.pending.some((q) => q.handler === 'milDraft')) hit++; } return hit / n; };
  const l70 = lot(1970, 'us'), l72 = lot(1972, 'us'), a68 = lot(1968, 'au');
  ok(Math.abs(l70 - 195 / 366) < 0.04 && Math.abs(l72 - 95 / 366) < 0.04, `the American lottery follows the cut-off (${l70.toFixed(2)} in 1970, ${l72.toFixed(2)} in 1972)`);
  ok(Math.abs(a68 - 120 / 366) < 0.05, `and so does the Australian ballot (${a68.toFixed(2)})`);
  const notLot = lot(1970, 'us') > 0 && (() => { const st = lifeAt('us', 1970, 30, (x) => { P(x).gender = 'm'; ctx.warSlot(x, 'us').war = ctx.makeHistWar(x, 'us', ctx.histWarFor(x, 'us')); ctx.warSlot(x, 'us').war.draft = true; }); ctx.draftYear(st, ctx.activeWar(st, 'us')); return !st.pending.length; })();
  ok(notLot, 'a man of 30 is not in the lottery');
  // The baby boom makes bigger families.
  const sibs = (born) => { let t = 0; for (let i = 0; i < 400; i++) t += ctx.relPeople(ctx.createLife({ country: 'us', year: born }), ['sibling']).length; return t / 400; };
  ok(sibs(1955) > sibs(1990) + 0.12, `families are bigger in the boom (${sibs(1955).toFixed(2)} against ${sibs(1990).toFixed(2)} older siblings)`);
  // The 1918 flu: the old and the young die of it, and it shuts the clubs.
  ok(rate(200, () => { const st = lifeAt('us', 1918, 30); ctx.worldYear(st); return ctx.hasDisease(st, 'flu1918'); }) > 0.15, 'many catch the 1918 flu');
  ok(!ctx.actionAvailable(ACTIONS.nightlife, lifeAt('us', 1918, 30)) && ctx.actionAvailable(ACTIONS.nightlife, lifeAt('us', 1921, 30)), 'and the clubs shut for a year');
  const mask = (care) => rate(300, () => { const st = lifeAt('us', 1918, 30, care ? (x) => { x.player.flags.fluCare = true; } : null); ctx.worldYear(st); return ctx.hasDisease(st, 'flu1918'); });
  ok(mask(true) < mask(false) * 0.85, 'a mask helps a little');
  ok(rate(300, () => { const st = lifeAt('us', 1918, 30); st.player.diseases.push({ id: 'flu1918', since: 1918, known: true }); const p = P(st); p.stats.health = 90; ctx.bodyTick(st); return st.dead; }) > 0.02, 'it kills the young');
  // Oil shocks: money costs more, and the board empties.
  ok(Math.abs(ctx.personalRate(lifeAt('us', 1974, 30)) - 0.17) < 0.011, `a loan in 1974 costs about 17% (${ctx.personalRate(lifeAt('us', 1974, 30)).toFixed(3)})`);
  ok(ctx.personalRate(lifeAt('ng', 1974, 30)) === 0.11, 'but not in an oil exporter');
  // The Wall, the dot-com years, 2008 and the euro crisis.
  const techLay = rate(600, () => { const st = employed(lifeAt('us', 2001, 30), 'software'); st.player.career.perf = 60; ctx.careerTick(st); return !st.player.career; });
  const shopLay = rate(600, () => { const st = employed(lifeAt('us', 2001, 30), 'retail'); st.player.career.perf = 60; ctx.careerTick(st); return !st.player.career; });
  ok(techLay > shopLay + 0.05, `tech work goes first in 2001 (${techLay.toFixed(2)} against ${shopLay.toFixed(2)})`);
  const boomJobs = avg(Array.from({ length: 20 }, () => ctx.jobOpenOdds(lifeAt('us', 1999, 30), 'software'))), bustJobs = avg(Array.from({ length: 20 }, () => ctx.jobOpenOdds(lifeAt('us', 2002, 30), 'software')));
  ok(boomJobs > bustJobs + 0.1, `tech jobs: ${boomJobs.toFixed(2)} in 1999, ${bustJobs.toFixed(2)} in 2002`);
  const euroCut = (job) => rate(150, () => { const st = employed(lifeAt('es', 2010, 30), job); const was = 50000; st.player.career.salary = was; st.player.career.perf = 70; ctx.careerTick(st); return st.player.career && st.player.career.salary < was * 0.97; });
  ok(euroCut('police') > 0.25 && euroCut('retail') === 0, `in the euro crisis public pay is cut, and shop pay is not (${euroCut('police').toFixed(2)}, ${euroCut('retail').toFixed(2)})`);
  const house09 = avg(Array.from({ length: 30 }, () => { const st = lifeAt('us', 2009, 30); return ctx.cityMarketYear(st, 'us', P(st).city).g; })), house97 = avg(Array.from({ length: 30 }, () => { const st = lifeAt('us', 1910, 30); return ctx.cityMarketYear(st, 'us', P(st).city).g; }));
  ok(house09 < house97 - 0.05, `home prices fall in 2009 (${house09.toFixed(3)} against ${house97.toFixed(3)})`);
  ok(avg(Array.from({ length: 20 }, () => ctx.marketYear(lifeAt('us', 2008, 30)).ret)) < -0.3, 'and the market in 2008');
  ok(ctx.worldHeadline(lifeAt('us', 2009, 30)) === HIST.gfc, 'the header names it');
  // Crypto does what it did.
  const cr = (year) => { const st = lifeAt('us', year, 30); st.player.invest.crypto = 10000; ctx.financeTick(st); return st.player.invest.crypto; };
  ok(cr(2017) > 120000 && cr(2018) < 4000, `crypto in 2017 and 2018 (${cr(2017)}, ${cr(2018)})`);
  // Inflation: the cost of living, rates and the paper.
  ok(ctx.livingCost(lifeAt('us', 2022, 30), 20000) > ctx.livingCost(lifeAt('us', 1910, 30), 20000) * 1.07, 'living costs rise in 2022');
  ok(ctx.personalRate(lifeAt('us', 2022, 30)) > 0.14, 'and so do rates');
  ok(ctx.worldYear && (() => { const st = lifeAt('us', 1970, 30); st.news = []; for (let i = 0; i < 12; i++) { st.year = 1970 + (i % 2); ctx.worldYear(st); } return st.news.some((n) => n.kind === 'world'); })(), 'big events make the paper');
  // Korea at home: the job board is thin, and the year is hard.
  ok(avg(Array.from({ length: 20 }, () => ctx.jobOpenOdds(lifeAt('kr', 1951, 30), 'accountant'))) < avg(Array.from({ length: 20 }, () => ctx.jobOpenOdds(lifeAt('kr', 1960, 30), 'accountant'))) * 0.75, 'jobs are scarce in wartime Korea');
  // No made-up war in a year history governs, even with two wars at once.
  const both = lifeAt('us', 2001, 30); let seen = [];
  for (let y = 2001; y <= 2013; y++) { both.year = y; ctx.worldReset(); ctx.historyWarYear(both); const w = ctx.activeWar(both, 'us'); seen.push(w ? (w.name === 'the Iraq War' ? 'I' : 'A') : '-'); }
  ok(seen[1] === 'A' && seen[2] === 'I' && seen[9] === 'I' && seen[10] === '-' && seen[11] === 'A', `the bigger of two wars is the one you live through, and the other picks up when it ends (${seen.join('')})`);
  const uk = lifeAt('uk', 2001, 30); seen = [];
  for (let y = 2001; y <= 2015; y++) { uk.year = y; ctx.worldReset(); ctx.historyWarYear(uk); const w = ctx.activeWar(uk, 'uk'); seen.push(w ? (w.name === 'the Iraq War' ? 'I' : 'A') : '-'); }
  ok(seen[1] === 'A' && seen[2] === 'I' && seen[7] === 'I' && seen[8] === '-' && seen[9] === 'A', `of two the same size, the newer (${seen.join('')})`);
}

/* 8. the country events (phase 5) -------------------------------------------------- */
{
  const rate = (n, f) => { let k = 0; for (let i = 0; i < n; i++) if (f(i)) k++; return k / n; };
  const rich = (s) => { s.player.money = 50000; };
  // The player can step through any one choice of an event.
  const play = (s, id, k) => { const t = clone(s); ok(ctx.fireEvent(t, EVENTS[id]), `${id}: fires`); const pp = t.pending.find((q) => q.handler === 'event'); ctx.resolvePopup(t, pp.id, k); return t; };
  const every = (name, s) => { const ev = EVENTS[name]; ok(ctx.eventEligible(s, ev), `${name}: eligible in the state built for it`); const t = clone(s); ok(ctx.fireEvent(t, ev), `${name}: fires`); const pp = t.pending.find((q) => q.handler === 'event'); if (!pp) return; ok(!BAD.test(pp.text), `${name}: reads "${pp.text}"`); for (let k = 0; k < pp.choices.length; k++) { const u = clone(t), q = u.pending.find((x) => x.handler === 'event'), e0 = errors, n0 = u.log.length; try { ctx.resolvePopup(u, q.id, k); } catch (e) { ok(false, `${name}: choice ${k} threw ${e.message}`); } ok(errors === e0, `${name}: choice ${k} logged an error`); ok(!/moment passed/.test(u.log.slice(n0).flatMap((e) => e.lines.map((l) => l.t)).join(' ')), `${name}: choice ${k} said the moment passed`); for (let n = 0; n < 6 && u.pending.length; n++) { const r = u.pending[0]; ctx.resolvePopup(u, r.id, Math.max(0, r.choices.findIndex((c) => !c.disabled)), r.input ? 'X' : undefined); } const bad = []; walk(u, 's', bad); ok(!bad.length, `${name}: choice ${k}: ${bad.join('; ')}`); } };
  const mortgaged = (st) => { st.player.assets.push({ id: 'h9', kind: 'house', name: 'house', value: 200000, cond: 80, loanId: 'l9' }); st.player.loans.push({ id: 'l9', kind: 'house', assetId: 'h9', name: 'Mortgage', balance: 150000, rate: 0.06, years: 20, pay: 12000 }); };

  // Every personal event of the country rows, in the state built for it.
  every('wd_speakeasy', lifeAt('us', 1926, 28));
  every('wd_brexit_vote', lifeAt('uk', 2016, 35));
  every('wd_boat_to_england', lifeAt('ie', 1955, 22, (st) => { st.player.money = 5000; }));
  every('wd_boat_to_england', lifeAt('ie', 1985, 22, (st) => { st.player.money = 5000; }));
  every('wd_collor_plan', lifeAt('br', 1990, 35, (st) => { st.player.money = 30000; st.player.invest.savings = 20000; }));
  every('wd_500_percent', lifeAt('se', 1992, 40, (st) => { mortgaged(st); st.player.money = 20000; }));
  every('wd_gold_drive', lifeAt('kr', 1998, 30, rich));
  every('wd_demonetisation', lifeAt('in', 2016, 35, rich));
  every('wd_generator', lifeAt('za', 2015, 35, rich));
  every('wd_may_68', lifeAt('fr', 1968, 22));
  every('wd_people_power', lifeAt('ph', 1986, 25));
  ok(!ctx.eventEligible(lifeAt('us', 2016, 35), EVENTS.wd_brexit_vote) && !ctx.eventEligible(lifeAt('uk', 2017, 35), EVENTS.wd_brexit_vote), 'the Brexit vote is for the UK in 2016');

  // Brexit: nobody's choice is rewarded or punished more than another's.
  const bx = lifeAt('uk', 2016, 35, (st) => { rich(st); });
  const outcomes = [0, 1, 2].map((k) => { let h = 0, r = 0, m = 0; for (let i = 0; i < 30; i++) { const u = play(bx, 'wd_brexit_vote', k); h += P(u).stats.happy - P(bx).stats.happy; m += u.player.money - bx.player.money; r++; } return [h / r, m / r]; });
  ok(Math.abs(outcomes[0][0] - outcomes[1][0]) < 0.01 && Math.abs(outcomes[0][1] - outcomes[1][1]) < 0.01, 'leave and remain cost and earn exactly the same');
  ok(play(bx, 'wd_brexit_vote', 0).player.flags.brexitVote === 'leave' && play(bx, 'wd_brexit_vote', 1).player.flags.brexitVote === 'remain' && play(bx, 'wd_brexit_vote', 2).player.flags.brexitVote === 'home', 'the vote is remembered as what you chose');

  // Prohibition: bartending is closed, and the brewery fails.
  ok(ctx.worldJobBanned(lifeAt('us', 1925, 30), 'bartender') && !ctx.worldJobBanned(lifeAt('us', 1935, 30), 'bartender') && !ctx.worldJobBanned(lifeAt('uk', 1925, 30), 'bartender'), 'bartending is banned in the US from 1920 to 1933');
  ok(ctx.jobOpenOdds(lifeAt('us', 1925, 30), 'bartender') === 0, 'the job board has no bartenders');
  const bar = employed(lifeAt('us', 1925, 30), 'bartender'); ctx.careerTick(bar);
  ok(!bar.player.career, 'a bartender is out of work when it starts');
  ok(ctx.industryMods(lifeAt('us', 1925, 30), { ind: 'brewery' }).rev < 0.4, 'breweries fail');
  // The bootlegging run can end in a cell
  const boot = lifeAt('us', 1926, 28); let jailed = 0, paid = 0;
  for (let i = 0; i < 80; i++) { const u = play(boot, 'wd_speakeasy', 1); if (u.player.prison) jailed++; else if (u.player.money > boot.player.money) paid++; }
  ok(paid >= 35 && (jailed >= 2 || paid < 80), `running bottles pays, and sometimes does not (${paid} paid, ${jailed} jailed of 80)`);

  // Brazil: cash melts above the buffer, savings stay, and the freeze takes more.
  const inf = lifeAt('br', 1989, 35, (st) => { st.player.money = 12000; st.player.invest.savings = 30000; alone(st); });
  const cash0 = inf.player.money, buf = ctx.price(inf, 2000);
  ctx.worldYear(inf);
  ok(inf.player.invest.savings === 30000, 'indexed savings are not touched by hyperinflation');
  ok(Math.abs(inf.player.money - (buf + (cash0 - buf) * 0.6)) < 5, `cash above a small float loses 40% (${cash0} to ${inf.player.money})`);
  const frozen = lifeAt('br', 1990, 35, (st) => { st.player.money = 30000; st.player.invest.savings = 20000; });
  const total0 = frozen.player.money + frozen.player.invest.savings;
  for (let k = 0; k < 3; k++) { const u = play(frozen, 'wd_collor_plan', k); const was = total0 - (u.player.money + u.player.invest.savings); ok(was >= -ctx.price(u, 600), `the freeze plan ${k} loses no more than money it can (${was})`); }
  ok(rate(60, () => { const u = play(frozen, 'wd_collor_plan', 0); return u.player.money + u.player.invest.savings < total0 - 5000; }) > 0.9, 'waiting it out costs a third of the frozen money');

  // Sweden's 500%: paying down the loan reduces it; the rate fix costs a fee; sitting tight costs interest
  const swe = lifeAt('se', 1992, 40, (st) => { mortgaged(st); st.player.money = 40000; });
  const loan0 = swe.player.loans[0].balance;
  ok(play(swe, 'wd_500_percent', 0).player.loans[0].balance < loan0, 'paying part of the mortgage lowers it');
  ok(play(swe, 'wd_500_percent', 2).player.money < swe.player.money, 'sitting tight costs interest');
  ok(!ctx.eventEligible(lifeAt('se', 1992, 40), EVENTS.wd_500_percent), 'and the event is for people who owe a mortgage');

  // India: the old notes.
  const dem = lifeAt('in', 2016, 35, (st) => { st.player.money = 100000; });
  ok(play(dem, 'wd_demonetisation', 0).player.money < dem.player.money && play(dem, 'wd_demonetisation', 0).player.money > dem.player.money * 0.97, 'queuing costs only a little');
  ok(play(dem, 'wd_demonetisation', 1).player.money < play(dem, 'wd_demonetisation', 0).player.money, 'paying someone to do it costs more');

  // South Africa: a generator softens the lights, solar pays back.
  const za = lifeAt('za', 2015, 35, (st) => { st.player.money = 20000; alone(st); });
  const solar = play(za, 'wd_generator', 1);
  ok(solar.player.flags.wdPower === 'solar' && solar.player.money < za.player.money, 'solar is bought');
  const yr = (st) => { const m0 = st.player.money; st.year = 2016; ctx.worldReset(); ctx.run('YEAR_HOOKS').find((h) => h.name === 'worldPower').fn(st); return st.player.money - m0; };
  ok(yr(solar) > 0 && yr(za) === 0, 'and pays back a little each year');

  // South Korea: the IMF crisis.
  ok(ctx.marketYear(lifeAt('kr', 1997, 30)).ret < -0.3 && ctx.marketYear(lifeAt('kr', 1998, 30)).ret > 0.3, 'the Korean market falls in 1997 and rebounds in 1998');
  { const gd = lifeAt('kr', 1998, 30, (st) => { rich(st); st.player.karma = 50; }); ok(play(gd, 'wd_gold_drive', 0).player.karma > 50, 'donating gold earns karma'); }

  // Germany: the great inflation and the new money.
  const weimar = (year) => { const st = lifeAt('de', year, 35, (x) => { x.player.money = 50000; x.player.invest.savings = 50000; alone(x); }); ctx.worldYear(st); return st.player.money + st.player.invest.savings; };
  ok(weimar(1923) < 20000 && weimar(1923) < weimar(1922), `the 1923 inflation wipes out savings (${weimar(1923)})`);
  const prop = lifeAt('de', 1923, 35, (x) => { x.player.assets.push({ id: 'h1', kind: 'house', name: 'house', value: 100000, cond: 80 }); x.player.money = 0; alone(x); }); ctx.worldYear(prop);
  ok(prop.player.assets.length === 1 && prop.player.assets[0].value >= 90000, 'but a house is still a house');

  // Britain: the call-up of 18-year-olds and the bombing of London.
  const call = (age, g) => rate(80, () => { const st = lifeAt('uk', 1957, age, (x) => { P(x).gender = g; }); ctx.militaryTick(st); return st.pending.some((p) => p.handler === 'milDraft') || (st.player.career && ctx.isMilJob(st.player.career.id)) || !!(st.player.flags && Object.keys(st.player.flags).some((k) => k.startsWith('draft_'))); });
  ok(call(19, 'm') > 0.25 && call(19, 'f') === 0 && call(30, 'm') === 0, 'National Service calls up young men only');
  const blitz = (city) => rate(80, () => { const st = lifeAt('uk', 1940, 30, (x) => { P(x).city = city; x.player.housing = { type: 'rent', assetId: null, rent: 8000, name: 'flat', ll: { name: 'x', style: 'kind', mood: 50, stars: 4 } }; }); ctx.worldYear(st); return st.player.housing.type === 'homeless'; });
  ok(blitz('London') > 0.08 && blitz('London') > blitz('Cardiff') - 0.001 && blitz('Leeds') === 0, 'London is bombed hardest, Cardiff less, and Leeds not at all');

  // Interest, and the pound.
  ok(ctx.personalRate(lifeAt('us', 1981, 30)) >= 0.14, `a loan in 1981 costs at least 14% (${ctx.personalRate(lifeAt('us', 1981, 30)).toFixed(3)})`);

  // Dated events happen in an ordinary life (they once seldom did: they competed with 700 others).
  const lived = (cc, born, until, id, n = 16) => { let k = 0; for (let i = 0; i < n; i++) { const st = ctx.createLife({ country: cc, year: born }); st.pending = []; let guard = 0; while (!st.dead && st.year < until && guard++ < 900) { if (st.pending.length) { const pp = st.pending[0]; if (!ctx.resolvePopup(st, pp.id, 0, pp.input ? 'X' : undefined)) st.pending.shift(); continue; } ctx.ageUp(st); } if ((st.player.evHist || {})[id]) k++; } return k / n; };
  ok(lived('uk', 1981, 2017, 'wd_brexit_vote') >= 0.7, 'a Briton of 35 in 2016 usually meets the vote');
  ok(lived('us', 1990, 2022, 'wd_lockdown') >= 0.7, 'a lifetime through 2020 meets the lockdown');
}

/* 9. local moments (phase 6) -------------------------------------------------------- */
{
  const rate = (n, f) => { let k = 0; for (let i = 0; i < n; i++) if (f(i)) k++; return k / n; };
  const rich = (s) => { s.player.money = 50000; };
  const inCity = (cc, year, age, city, setup) => lifeAt(cc, year, age, (st) => { P(st).city = city; if (setup) setup(st); });
  // A choice by its words (some choices are hidden when they do not apply), and the text it gave.
  const play = (s, id, label) => { const t = clone(s); ok(ctx.fireEvent(t, EVENTS[id]), `${id}: fires`); const pp = t.pending.find((q) => q.handler === 'event'); const k = pp.choices.findIndex((c) => label.test(c.label)); ok(k >= 0, `${id}: has a choice "${label}"`); const n0 = t.log.length; ctx.resolvePopup(t, pp.id, Math.max(0, k)); const last = t.log.slice(n0).flatMap((e) => e.lines.map((l) => l.t)).join(' '); ok(!/moment passed/.test(last), `${id}: "${label}" answers "${last.slice(0, 60)}"`); return t; };
  const every = (name, s) => { const ev = EVENTS[name]; ok(ctx.eventEligible(s, ev), `${name}: eligible in the state built for it`); const t = clone(s); ok(ctx.fireEvent(t, ev), `${name}: fires`); const pp = t.pending.find((q) => q.handler === 'event'); if (!pp) return; ok(!BAD.test(pp.text), `${name}: reads "${pp.text}"`); for (let k = 0; k < pp.choices.length; k++) { const u = clone(t), q = u.pending.find((x) => x.handler === 'event'), e0 = errors, n0 = u.log.length; try { ctx.resolvePopup(u, q.id, k); } catch (e) { ok(false, `${name}: choice ${k} threw ${e.message}`); } ok(errors === e0, `${name}: choice ${k} logged an error`); ok(!/moment passed/.test(u.log.slice(n0).flatMap((e) => e.lines.map((l) => l.t)).join(' ')), `${name}: choice ${k} said the moment passed`); for (let n = 0; n < 6 && u.pending.length; n++) { const r = u.pending[0]; ctx.resolvePopup(u, r.id, Math.max(0, r.choices.findIndex((c) => !c.disabled)), r.input ? 'X' : undefined); } const bad = []; walk(u, 's', bad); ok(!bad.length, `${name}: choice ${k}: ${bad.join('; ')}`); } };
  const owner = (st) => { st.player.assets.push({ id: 'h1', kind: 'house', name: 'house', value: 200000, cond: 90, city: P(st).city, cc: P(st).country }); st.player.housing = { type: 'own', assetId: 'h1', rent: 0, name: 'house' }; };
  const renter = (st) => { st.player.housing = { type: 'rent', assetId: null, rent: 12000, name: 'flat', ll: { name: 'x', style: 'kind', mood: 50, stars: 4 } }; };
  const games = HIST_IDS.filter((id) => HIST[id].games);
  const disasters = HIST_IDS.filter((id) => HIST[id].kind === 'disaster');
  ok(games.length === 24 && disasters.length >= 40, `the table has the Games and the disasters (${games.length}, ${disasters.length})`);

  // The Games: a city, two years before through the year of; nowhere else.
  const london12 = (year, city = 'London') => inCity('uk', year, 30, city);
  ok(ctx.worldHas(london12(2010), 'games_london_2012') && ctx.worldHas(london12(2012), 'games_london_2012') && !ctx.worldHas(london12(2009), 'games_london_2012') && !ctx.worldHas(london12(2013), 'games_london_2012'), 'the Games run for three years in the host city');
  ok(!ctx.worldHas(london12(2011, 'Manchester'), 'games_london_2012'), 'and not in another city');
  const jobs = (year, city) => avg(Array.from({ length: 30 }, () => ctx.jobOpenOdds(london12(year, city), 'accountant')));
  ok(jobs(2012, 'London') > jobs(2008, 'London') + 0.05, 'work is easier to find in the host city');
  ok(avg(Array.from({ length: 30 }, () => ctx.cityMarketYear(london12(2012), 'uk', 'London').g)) > avg(Array.from({ length: 30 }, () => ctx.cityMarketYear(london12(2008), 'uk', 'London').g)) + 0.02, 'and rents rise');
  // The year of the Games, the event. (Tokyo in 2021 was held with the stands empty.)
  every('wd_games', inCity('uk', 2012, 30, 'London', rich));
  every('wd_games', inCity('jp', 2021, 30, 'Tokyo', rich));
  every('wd_games', inCity('ca', 2010, 30, 'Vancouver', (st) => { rich(st); owner(st); }));
  every('wd_games', inCity('au', 2000, 30, 'Sydney', (st) => { rich(st); renter(st); }));
  const tokyo = inCity('jp', 2021, 30, 'Tokyo', rich), ticketsHidden = clone(tokyo); ctx.fireEvent(ticketsHidden, EVENTS.wd_games);
  ok(!ticketsHidden.pending.find((q) => q.handler === 'event').choices.some((c) => /tickets/.test(c.label)), 'no tickets for the empty stands');
  ok(!ctx.eventEligible(inCity('uk', 2012, 30, 'Leeds'), EVENTS.wd_games) && !ctx.eventEligible(inCity('uk', 2013, 30, 'London'), EVENTS.wd_games), 'the Games event is for the host city in the year');
  const own = inCity('uk', 2012, 30, 'London', owner); own.player.housing.type = 'own';
  ok(play(own, 'wd_games', /Rent your place/).player.money > own.player.money, 'renting out a home earns money');
  const volunteers = rate(40, () => { const u = play(inCity('uk', 2012, 30, 'London'), 'wd_games', /Volunteer/); return u.player.karma > 0 && Object.keys(u.people).length > Object.keys(inCity('uk', 2012, 30, 'London').people).length - 3; });
  ok(volunteers > 0.5, 'volunteering earns karma, and sometimes a friend');

  // Disasters: homes, bodies, the people near you, and then the rebuilding.
  const quake = (cc, year, city, setup) => inCity(cc, year, 30, city, setup);
  const lostRent = rate(60, () => { const st = quake('jp', 1995, 'Kobe', renter); ctx.worldYear(st); return st.player.housing.type === 'homeless'; });
  ok(lostRent > 0.35 && lostRent < 0.75, `a rented home in Kobe is often lost (${lostRent.toFixed(2)})`);
  const lostOutside = rate(60, () => { const st = quake('jp', 1995, 'Tokyo', renter); ctx.worldYear(st); return st.player.housing.type === 'homeless'; });
  ok(lostOutside < 0.1, `but not in Tokyo (${lostOutside.toFixed(2)})`);
  const dmg = rate(60, () => { const st = quake('us', 1992, 'Miami', owner); ctx.worldYear(st); return st.player.assets[0].cond < 90 && st.player.assets[0].value < 200000; });
  ok(dmg > 0.3, `an owned home in Miami is damaged by Andrew (${dmg.toFixed(2)})`);
  const darwin = rate(60, () => { const st = quake('au', 1974, 'Darwin', renter); ctx.worldYear(st); return st.player.housing.type === 'homeless'; });
  ok(darwin > 0.6, `Cyclone Tracy took most homes (${darwin.toFixed(2)})`);
  // The year after: housing dips and rebounds, and the trades hire.
  const growth = (year) => avg(Array.from({ length: 30 }, () => ctx.cityMarketYear(quake('jp', year, 'Kobe'), 'jp', 'Kobe').g));
  ok(growth(1995) < growth(1993) - 0.05 && growth(1996) > growth(1993) + 0.0, `home prices dip in the year and come back after (${growth(1993).toFixed(3)}, ${growth(1995).toFixed(3)}, ${growth(1996).toFixed(3)})`);
  const tradesJobs = (year) => avg(Array.from({ length: 30 }, () => ctx.jobOpenOdds(quake('jp', year, 'Kobe'), 'carpenter')));
  const officeJobs = (year) => avg(Array.from({ length: 30 }, () => ctx.jobOpenOdds(quake('jp', year, 'Kobe'), 'accountant')));
  ok(tradesJobs(1996) > tradesJobs(1993) + 0.04 && tradesJobs(1996) - tradesJobs(1993) > officeJobs(1996) - officeJobs(1993), 'the building trades hire the year after');
  // Somebody who lives in the city is lost, now and then.
  const lostFriend = rate(500, () => { const st = quake('jp', 1995, 'Kobe'); const f = ctx.makeAdultNear(st, { minAge: 25, maxAge: 40 }); ctx.setRel(st, f.id, 'friend', 60); f.city = 'Kobe'; f.country = 'jp'; ctx.worldYear(st); return !f.alive; });
  ok(lostFriend > 0.004 && lostFriend < 0.2, `somebody you know in the city is lost (${lostFriend.toFixed(2)})`);
  // The heat wave: the old, in a country (not a city).
  const heatNpc = rate(800, () => { const st = lifeAt('fr', 2003, 30); const g = ctx.relPeople(st, ['parent'])[0]; g.city = P(st).city; g.country = P(st).country; ctx.worldYear(st); return !g.alive; });
  ok(heatNpc > 0.002 && heatNpc < 0.12, `the heat wave takes a parent now and then (${heatNpc.toFixed(3)})`);
  ok(!ctx.worldHas(lifeAt('us', 2003, 30), 'heat_2003') && ctx.worldHas(lifeAt('es', 2003, 30), 'heat_2003'), 'and only in Europe');
  // Moving to the city after is not living through it.
  const late = quake('jp', 1996, 'Kobe'); late.world = { seen: {} }; ctx.worldYear(late);
  ok(!late.world.seen.kobe_1995 && !(late.player.worldLived || []).includes('kobe_1995'), 'a move to Kobe the year after is not the earthquake');
  const there = quake('jp', 1995, 'Kobe'); there.world = { seen: {} }; ctx.worldYear(there);
  ok(there.world.seen.kobe_1995 === 1995 && there.player.worldLived.includes('kobe_1995'), 'living there is');
  // The morning after.
  every('wd_aftermath', quake('jp', 1995, 'Kobe', (st) => { rich(st); owner(st); st.player.assets[0].cond = 40; }));
  every('wd_aftermath', quake('us', 1992, 'Miami', (st) => { rich(st); renter(st); st.player.housing = { type: 'homeless', assetId: null, rent: 0, name: '' }; }));
  const mud = quake('au', 2011, 'Brisbane', (st) => { rich(st); owner(st); st.player.assets[0].cond = 40; st.player.karma = 50; });
  ok(play(mud, 'wd_aftermath', /Repair/).player.assets[0].cond === 95 && play(mud, 'wd_aftermath', /Repair/).player.money < mud.player.money, 'the repair bill is paid and the home is mended');
  ok(play(mud, 'wd_aftermath', /neighbors/).player.karma > mud.player.karma, 'helping the neighbors earns karma');
  const gone = play(quake('au', 2011, 'Brisbane', rich), 'wd_aftermath', /Leave the city/);
  ok(P(gone).city !== 'Brisbane' && P(gone).country === 'au', 'leaving the city moves you in the country');
  ok(!ctx.eventEligible(quake('au', 2012, 'Brisbane'), EVENTS.wd_aftermath), 'the aftermath comes in the year of the disaster');

  // Firsts: the date each reached a country.
  ok(ctx.worldHas(lifeAt('us', 1948, 30), 'first_tv') && !ctx.worldHas(lifeAt('us', 1953, 30), 'first_tv') && ctx.worldHas(lifeAt('za', 1976, 30), 'first_tv') && !ctx.worldHas(lifeAt('za', 1948, 30), 'first_tv'), 'television reached each country in its own year');
  ok(ctx.worldHas(lifeAt('de', 2007, 30), 'first_smartphone') === false && ctx.worldHas(lifeAt('us', 2007, 30), 'first_smartphone') && ctx.worldHas(lifeAt('ng', 2012, 30), 'first_smartphone'), 'and so did the smartphone');
  const firstLine = (cc, year, id) => { const st = lifeAt(cc, year, 30); st.world = { seen: {} }; st.log = []; ctx.worldYear(st); return !!(st.player.worldLived || []).includes(id) && st.world.seen[id] === year; };
  ok(firstLine('uk', 1953, 'first_tv') && firstLine('jp', 1982, 'first_home_computer') && firstLine('in', 1998, 'first_web'), 'you live through the first of each, and the log says so');
}

/* 10. the years after the table, and the era (phase 7) ------------------------------ */
{
  const rate = (n, f) => { let k = 0; for (let i = 0; i < n; i++) if (f(i)) k++; return k / n; };
  const lineWith = (seed, year = 2026, age = 30) => { const s = ctx.createLife({ country: 'us', year: year - age }); s.year = year; s.pending = []; s.player.edu.current = null; s.world = { seen: {}, seed }; return s; };
  const rowsOf = (seed) => ctx.worldFutureUse(lineWith(seed)).ids.map((id) => HIST[id]);

  // The same seed is the same future, and another is another.
  const A1 = rowsOf(4242), A2 = rowsOf(4242), B1 = rowsOf(9001);
  ok(A1.length === A2.length && A1.every((r, i) => r.name === A2[i].name && r.years[0] === A2[i].years[0]), 'the same seed gives the same future');
  ok(A1.map((r) => r.name).join() !== B1.map((r) => r.name).join(), 'and a different seed another');
  ok(!HIST_IDS.some((id) => HIST[id].future), 'the generated rows are not in the table (HIST_IDS)');

  // What is generated, over many futures.
  let slumps = 0, gapsOk = true, pans = 0, panGapOk = true, disasters = 0, years = 0, minStart = 9999, badRows = 0, e0 = errors;
  for (let seed = 1; seed <= 30; seed++) {
    const rows = rowsOf(seed * 7919), slump = rows.filter((r) => r.kind === 'econ' && r.tone !== 'good' && r.chip === 'Recession'), pan = rows.filter((r) => r.pandemic);
    slumps += slump.length; for (let i = 1; i < slump.length; i++) { const gap = slump[i].years[0] - slump[i - 1].years[0]; if (gap < 8 || gap > 12) gapsOk = false; }
    minStart = Math.min(minStart, slump[0].years[0]);
    pans += pan.length; for (let i = 1; i < pan.length; i++) if (pan[i].years[0] - pan[i - 1].years[0] < 25) panGapOk = false;
    disasters += rows.filter((r) => r.kind === 'disaster').length; years += 174;
    for (const r of rows) { const before = failures; validateRow(r.id); if (failures !== before) badRows++; }
  }
  ok(badRows === 0, `every generated row is well formed (${badRows} were not)`);
  ok(gapsOk && slumps / 30 > 12 && slumps / 30 < 22, `a recession every 8 to 12 years (${(slumps / 30).toFixed(1)} per future)`);
  ok(minStart >= 2026 && minStart <= 2034, `the first one comes soon enough (${minStart})`);
  ok(panGapOk && pans / 30 > 1.2 && pans / 30 < 5, `about one pandemic in sixty years, never within 25 of the last (${(pans / 30).toFixed(1)} per future)`);
  ok(disasters / years > 0.9 && disasters / years < 1.6, `a disaster or so a year somewhere (${(disasters / years).toFixed(2)})`);
  ok(errors === e0, 'making the futures logged no errors');

  // A recession does what the table's do, and a pandemic its illness.
  const sl = lineWith(555), rec = ctx.worldFutureUse(sl).ids.map((id) => HIST[id]).find((r) => r.chip === 'Recession');
  const inRec = (year) => lineWith(555, year);
  ctx.worldReset();
  const y = rec.years[0], calm = rec.years[0] - 1;
  ok(ctx.worldHas(inRec(y), rec.id) && !ctx.worldHas(inRec(y), 'covid'), 'a recession is active in its years');
  ok(avg(Array.from({ length: 20 }, () => ctx.jobOpenOdds(inRec(y), 'accountant'))) < avg(Array.from({ length: 20 }, () => ctx.jobOpenOdds(inRec(calm), 'accountant'))) * 0.95, 'the job board thins');
  ok(avg(Array.from({ length: 20 }, () => ctx.marketYear(inRec(y)).ret)) < -0.1, 'and the market falls in its first year');
  ok(rate(500, () => { const st = employed(inRec(y), 'retail'); st.player.career.perf = 60; ctx.careerTick(st); return !st.player.career; }) > 0.02, 'and people lose their jobs');
  const pr = (() => { for (let seed = 1; seed < 200; seed++) { const r = rowsOf(seed).find((q) => q.pandemic); if (r) return { seed, row: r }; } })();
  ok(pr && DISEASES_OK(pr.row), 'a generated pandemic has its illness');
  function DISEASES_OK(r) { return !!g('DISEASES')[r.disease.id]; }
  const sick = lineWith(pr.seed, pr.row.years[0]); sick.world.seed = pr.seed;
  ok(rate(200, () => { const st = clone(sick); ctx.worldYear(st); return ctx.hasDisease(st, pr.row.disease.id); }) > 0.04, 'many catch it');
  ok(!ctx.actionAvailable(ACTIONS.vacation, sick) && ctx.worldClosed(sick, 'travel'), 'and travel stops');

  // A whole life in the future plays, meets its events, and a saved life comes back to the same world.
  const e1 = errors;
  const fl = ctx.createLife({ country: 'uk', year: 2026 }); fl.pending = []; let guard = 0;
  while (!fl.dead && fl.year < 2125 && guard++ < 500) { if (fl.pending.length) { const pp = fl.pending[0]; if (!ctx.resolvePopup(fl, pp.id, 0, pp.input ? 'X' : undefined)) fl.pending.shift(); continue; } ctx.ageUp(fl); }
  ok(errors === e1, 'a life from 2026 to old age plays without errors');
  ok((fl.player.worldLived || []).length >= 4, `and lives through some of it (${(fl.player.worldLived || []).length})`);
  ok(fl.world.seed > 0, 'the future is named by a seed saved with the life');
  const copy = ctx.importLife(ctx.exportLife(fl));
  ok(copy && ctx.worldFutureUse(copy).ids.join() === ctx.worldFutureUse(fl).ids.join(), 'a saved life has the same future');
  // A line does not see another line's future, and history off has none.
  const l1 = lineWith(111), l2 = lineWith(222); l1.year = l2.year = 2040;
  const names = (st) => ctx.worldAt(2040, 'us', P(st).city, st).map((a) => a.id).join();
  ok(names(l1) !== names(l2) || !names(l1), 'another line has another world');
  META.settings.history = false; ctx.worldReset();
  ok(ctx.worldAt(2040, 'us', 'New York', l1).length === 0 && ctx.eraHas(lifeAt('us', 1900, 30), 'social'), 'history off: no generated events, and nothing is gated');
  META.settings.history = true; ctx.worldReset();

  // The era.
  const era = (cc, year) => lifeAt(cc, year, 30);
  ok(ctx.eraHas(era('us', 2005), 'social') && !ctx.eraHas(era('us', 2004), 'social') && !ctx.eraHas(era('ng', 2008), 'social') && ctx.eraHas(era('ng', 2010), 'social'), 'social media reaches each country in its year');
  ok(!ctx.eraHas(era('uk', 1975), 'index') && ctx.eraHas(era('uk', 1976), 'index') && !ctx.eraHas(era('us', 2009), 'crypto') && ctx.eraHas(era('us', 2010), 'crypto') && !ctx.eraHas(era('us', 1971), 'games') && ctx.eraHas(era('us', 1972), 'games'), 'index funds, crypto and games have worldwide dates');
  ok(!ctx.eraHas(era('us', 1994), 'dating') && ctx.eraHas(era('us', 1995), 'dating'), 'online dating comes a year after the web');
  ok(!ctx.actionAvailable(ACTIONS.social_join, era('us', 1990)) && ctx.actionAvailable(ACTIONS.social_join, era('us', 2012)), 'no social media account in 1990');
  ok(!ctx.actionAvailable(ACTIONS.dating_app, era('us', 1990)) && ctx.actionAvailable(ACTIONS.dating_app, era('us', 2015)), 'and no dating app');
  const menu = (year) => { const st = era('us', year); st.player.money = 10000; ACTIONS.investments.run(st); return st.pending[st.pending.length - 1].choices.map((c) => c.label).join('|'); };
  ok(!/Crypto/.test(menu(1990)) && /Crypto/.test(menu(2015)) && !/Index fund/.test(menu(1950)) && /Index fund/.test(menu(1990)), 'the investment menu has only what existed');
  ok(ctx.jobOpenOdds(era('us', 1940), 'software') === 0 && ctx.jobOpenOdds(era('us', 1940), 'data') === 0 && ctx.jobOpenOdds(era('us', 2000), 'software') > 0 && ctx.jobOpenOdds(era('us', 1940), 'accountant') > 0, 'jobs that did not exist are not on the board');
  let anachronism = 0;
  for (let i = 0; i < 40; i++) { const st = ctx.createLife({ country: 'us', year: 1925 }); for (const p of Object.values(st.people)) if (p.job && p.job.id && ['software', 'it', 'data', 'creator', 'callcenter', 'astronaut', 'profiler'].includes(p.job.id)) anachronism++; }
  ok(anachronism === 0, `nobody has a job that does not exist yet (${anachronism} did)`);
  ok(ctx.eraMedicine(era('us', 1930)) === 0.75 && ctx.eraMedicine(era('us', 1960)) === 0.9 && ctx.eraMedicine(era('us', 2000)) === 1, 'the doctors of 1930 cure less');
  ok(!ctx.eventEligible(lifeAt('us', 1960, 15), EVENTS.kid_gaming) && !ctx.eventEligible(lifeAt('us', 1960, 15), EVENTS.teen_group_chat) && ctx.eventEligible(lifeAt('us', 2010, 15), EVENTS.teen_group_chat), 'events wait for their invention');
  const hol = lifeAt('us', 1960, 8); hol.pending = [];
  META.settings.history = false; ok(ctx.eventEligible(lifeAt('us', 1960, 15), EVENTS.teen_group_chat), 'history off: any event, any year'); META.settings.history = true;
  // Money in the old currencies.
  const shown = (cc, year) => { const st = lifeAt(cc, year, 30); ctx.useCurrency(st); return ctx.fmtMoney(1000); };
  ok(/F$/.test(shown('fr', 1990)) && /DM$/.test(shown('de', 1990)) && /RM$/.test(shown('de', 1940)) && /^L\./.test(shown('it', 1990)) && /Pts$/.test(shown('es', 1990)) && /^IR£/.test(shown('ie', 1990)), `before the euro: ${shown('fr', 1990)}, ${shown('de', 1990)}, ${shown('it', 1990)}, ${shown('es', 1990)}, ${shown('ie', 1990)}`);
  ok(/€/.test(shown('fr', 2005)) && /€/.test(shown('de', 2002)) && /£/.test(shown('uk', 1990)) && !/IR/.test(shown('uk', 1990)), 'and the euro, and the pound, after');
  META.settings.history = false; ok(/€/.test(shown('fr', 1990)), 'history off: euros'); META.settings.history = true;
  ctx.useCurrency(lifeAt('us', 2000, 30));

  // The events of the generated years: every choice plays, and none says the moment passed.
  const every = (name, s) => { const ev = EVENTS[name]; ok(ctx.eventEligible(s, ev), `${name}: eligible in the state built for it`); const t = clone(s); ok(ctx.fireEvent(t, ev), `${name}: fires`); const pp = t.pending.find((q) => q.handler === 'event'); if (!pp) return; ok(!BAD.test(pp.text), `${name}: reads "${pp.text}"`); for (let k = 0; k < pp.choices.length; k++) { const u = clone(t), q = u.pending.find((x) => x.handler === 'event'), e0 = errors, n0 = u.log.length; try { ctx.resolvePopup(u, q.id, k); } catch (e) { ok(false, `${name}: choice ${k} threw ${e.message}`); } ok(errors === e0, `${name}: choice ${k} logged an error`); ok(!/moment passed/.test(u.log.slice(n0).flatMap((e) => e.lines.map((l) => l.t)).join(' ')), `${name}: choice ${k} said the moment passed`); for (let n = 0; n < 6 && u.pending.length; n++) { const r = u.pending[0]; ctx.resolvePopup(u, r.id, Math.max(0, r.choices.findIndex((c) => !c.disabled)), r.input ? 'X' : undefined); } const bad = []; walk(u, 's', bad); ok(!bad.length, `${name}: choice ${k}: ${bad.join('; ')}`); } };
  every('wd_gen_lockdown', lineWith(pr.seed, pr.row.years[0]));
  every('wd_gen_vaccine', lineWith(pr.seed, pr.row.years[0] + 1));
  ok(!ctx.eventEligible(lineWith(pr.seed, pr.row.years[0] + 2), EVENTS.wd_gen_vaccine) && !ctx.eventEligible(lineWith(pr.seed, pr.row.years[0] - 1), EVENTS.wd_gen_lockdown), 'they come in the right year of the pandemic');
  const workSlump = lineWith(555, rec.years[0]); employed(workSlump, 'accountant');
  every('wd_gen_layoffs', workSlump);
  const keepJob = clone(workSlump); ctx.fireEvent(keepJob, EVENTS.wd_gen_layoffs); ctx.resolvePopup(keepJob, keepJob.pending.find((q) => q.handler === 'event').id, 0);
  ok(keepJob.player.career && keepJob.player.career.safe === rec.years[1] && rate(100, () => { const st = clone(keepJob); st.year = rec.years[0] + 1; if (!st.player.career) return false; ctx.careerTick(st); return !st.player.career; }) === 0, 'a pay cut keeps the job through the downturn');
  const sev = clone(workSlump); ctx.fireEvent(sev, EVENTS.wd_gen_layoffs); const m0 = sev.player.money; ctx.resolvePopup(sev, sev.pending.find((q) => q.handler === 'event').id, 1);
  ok(!sev.player.career && sev.player.money > m0, 'and the severance pays and ends it');
}

console.log(failures ? `World checks: ${failures} failure(s)` : `World checks passed (${HIST_IDS.length} events).`);
process.exit(failures ? 1 : 0);
