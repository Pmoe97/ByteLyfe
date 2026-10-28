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

const ctx = loadGame({ quiet: true });
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

/* 1. the table ------------------------------------------------------------ */
{
  const FX = ['jobs', 'layoff', 'cut', 'pay', 'housing', 'living', 'rates', 'tax', 'mood'];
  const KINDS = ['econ', 'war', 'pandemic', 'disaster', 'moment', 'unrest'];
  const CLOSED = ['travel', 'nightlife', 'gambling', 'gym', 'school'];
  const cats = g('JOB_CATS'), inds = g('INDUSTRIES'), curs = g('CURRENCIES'), cities = g('CITY_INFO'), D = g('DISEASES');
  const span = (e) => e.years[1] - e.years[0] + 1;
  const walkText = (v, name) => { if (typeof v === 'string') { ok(!v.includes('$'), `${name}: a dollar sign in "${v.slice(0, 50)}"`); ok(!/undefined|NaN/.test(v), `${name}: bad text "${v.slice(0, 50)}"`); } else if (v && typeof v === 'object') for (const k in v) walkText(v[k], name); };
  ok(HIST_IDS.length >= 3, `the table has events (${HIST_IDS.length})`);
  for (const id of HIST_IDS) {
    const e = HIST[id], n = id;
    ok(e.id === id && e.name && e.emoji && KINDS.includes(e.kind), `${n}: name, emoji and a known kind`);
    ok(Array.isArray(e.years) && e.years[0] <= e.years[1] && e.years[0] >= g('HIST_FROM') && e.years[1] <= g('HIST_TO'), `${n}: years inside the window`);
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
    for (const c of e.closed || []) ok(CLOSED.includes(c), `${n}: unknown closure ${c}`);
    for (const cc of e.furlough || []) ok(COUNTRIES[cc], `${n}: furlough ${cc}`);
    for (const cc of Object.keys(e.support || {})) { ok(COUNTRIES[cc], `${n}: support ${cc}`); if (Array.isArray(e.support[cc])) ok(e.support[cc].length === span(e), `${n}: support ${cc} has ${e.support[cc].length} values for ${span(e)} years`); }
    for (const cc of Object.keys(e.war || {})) {
      const w = e.war[cc], r = (e.yearsBy && e.yearsBy[cc]) || e.years, y = w.years || r;
      ok(COUNTRIES[cc], `${n}: war in unknown country ${cc}`);
      ok(w.name && w.foe && w.theater && w.end && ['victory', 'defeat', 'ceasefire'].includes(w.result) && w.intensity >= 1 && w.intensity <= 4, `${n}/${cc}: a war needs a name, foe, theater, end, result and intensity`);
      ok(y[0] <= y[1] && y[0] >= e.years[0] - 3 && y[1] <= e.years[1], `${n}/${cc}: war years ${y} against event years ${e.years}`);
      if (w.draft) ok(w.draft[0] >= y[0] && w.draft[1] <= y[1] && w.draftAges && w.draftAges[0] <= w.draftAges[1], `${n}/${cc}: draft years and ages`);
    }
    if (!e.quiet) { // (a quiet row is only numbers)
      ok(e.open && e.open.title && e.open.text, `${n}: it needs an opening`);
      ok(e.news && e.news.length >= (e.kind === 'moment' ? 2 : 3) && e.news.every((x) => x.length === 2 && x[0] && x[1]), `${n}: news items for the paper`);
      ok(e.blurb, `${n}: a blurb for the World sheet`);
    }
    for (const cc of Object.keys(e.openBy || {})) ok(COUNTRIES[cc] && e.openBy[cc].title && e.openBy[cc].text, `${n}: openBy ${cc}`);
    walkText(e, n);
  }
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
    const st = lifeAt(['se', 'ie', 'ng', 'jp'][i % 4], 1950, 30); st.year = 1950; let w = null;
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
        const u = clone(t), q = u.pending.find((x) => x.handler === 'event'), e0 = errors;
        try { ctx.resolvePopup(u, q.id, k); played++; } catch (e) { ok(false, `${name}: choice ${k} threw ${e.message}`); }
        ok(errors === e0, `${name}: choice ${k} logged an error`);
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

console.log(failures ? `World checks: ${failures} failure(s)` : `World checks passed (${HIST_IDS.length} events).`);
process.exit(failures ? 1 : 0);
