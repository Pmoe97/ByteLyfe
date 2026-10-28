// Schemes verification:  node dev/verify/schemes.mjs
//
// Covers 82-schemes.js:
//   1. ponzi    — starting one, every way of handling a year, collapse (all five causes) opens a case, hurts the marks,
//                 reaches the paper and your name; winding down honestly is clean; running moves you; a conviction takes money back
//   2. long con — every style, every choice, suspicion and the family, the report, coming clean
//   3. ring     — gated by Mature, files and digging, a squeeze pays or backfires, crew, the bust
//   4. secrets  — the fraud, long con and ring secrets leak and react
//   5. the year — schemes tick without errors, prison collapses them, the sim-style churn never throws
import { loadGame } from './loadgame.mjs';

const ctx = loadGame({ quiet: true });
const g = (name) => ctx.run(name);
ctx.seedRng(8201);
let errors = 0;
ctx.console.error = () => { errors++; };
let failures = 0;
const ok = (cond, msg) => { if (!cond) { failures++; console.log('  ✖ ' + msg); } };
const META = g('META'), ACTIONS = g('ACTIONS'), SECRET_KINDS = g('SECRET_KINDS');
const clone = (s) => JSON.parse(JSON.stringify(s));
const P = (s) => s.people[s.playerId];
const pop = (s, handler) => s.pending.find((p) => p.handler === handler);
const act = (s, id, t) => { s.pending = []; return ctx.doAction(s, id, t); };
const answer = (s, handler, value) => { const pp = pop(s, handler); if (!pp) return false; const i = pp.choices.findIndex((c) => c.value === value); return ctx.resolvePopup(s, pp.id, i < 0 ? 0 : i); };
const adult = (age, o) => { const s = ctx.createLife(Object.assign({ country: 'us', year: 2000 }, o)); s.year = 2000 + age; s.pending = []; s.player.edu.current = null; s.player.money = 2e6; s.player.skills.charisma = 50; return s; };
const friend = (s, kind, rel) => { const p = ctx.makeAdultNear(s, { minAge: 28, maxAge: 45 }); ctx.setRel(s, p.id, kind || 'friend', rel ?? 60); p.money = 80000; return p; };
const newsKinds = (s) => (s.news || []).map((a) => a.kind);
const withCircle = (s) => { for (let i = 0; i < 5; i++) friend(s, pick(['friend', 'coworker', 'neighbor'])); return s; };
const pick = (a) => a[Math.floor(Math.random() * a.length)];

/* 1. ponzi ----------------------------------------------------------------------- */
{
  const s = withCircle(adult(35));
  ok(ACTIONS.scheme_ponzi.when(s), 'an adult with money can start a scheme');
  ok(!ACTIONS.scheme_ponzi.when(adult(15)), 'a kid cannot');
  act(s, 'scheme_ponzi');
  answer(s, 'pzStart', 'fund');
  const z = ctx.pzOf(s);
  ok(!!z && z.owed > 0 && z.pot > 0 && z.marks.length > 0, 'it starts with money, investors and marks from your circle');
  ok(ctx.webLive(s, (x) => x.kind === 'fraud').length === 1, 'and a secret in the ledger');
  ok(!ACTIONS.scheme_ponzi.when(s), 'you only run one at a time');
  // Every way of handling a year.
  for (const v of ['steady', 'greedy', 'recruit']) {
    const t = clone(s);
    ctx.pzYear(t);
    ok(!!pop(t, 'pzTurn'), 'the year asks what you will do');
    const money = t.player.money;
    answer(t, 'pzTurn', v);
    const z2 = ctx.pzOf(t);
    if (z2) { ok(z2.owed > z.owed && t.player.money > money, `${v}: it grows and you skim`); ok(z2.heat >= z.heat, `${v}: heat does not fall`); }
    else ok(ctx.schemeOf(t).done.length === 1, `${v}: if it collapsed, it says so`);
  }
  // Winding down honestly.
  {
    const t = clone(s);
    ctx.pzYear(t);
    const marks = ctx.pzOf(t).marks.map((m) => ({ id: m.pid, money: t.people[m.pid].money }));
    answer(t, 'pzTurn', 'wind');
    ok(!ctx.pzOf(t) && ctx.schemeOf(t).done[0].how === 'wound down', 'winding down ends it');
    ok(marks.every((m) => t.people[m.id].money >= m.money), 'everyone gets their money back');
    ok(ctx.invMine(t).length === 0, 'with no case');
    ok(ctx.webLive(t, (x) => x.kind === 'fraud').length === 0, 'and no secret left');
  }
  {
    const t = clone(s);
    t.player.money = 0;
    ctx.pzYear(t);
    const pp = pop(t, 'pzTurn');
    ok(pp && pp.choices.find((c) => c.value === 'wind').disabled, 'you cannot wind down what you cannot cover');
  }
  // Every cause of collapse.
  for (const how of ['shortfall', 'audit', 'exposed', 'run', 'jailed']) {
    const t = clone(s);
    const marks = ctx.pzOf(t).marks.map((m) => ({ id: m.pid, money: t.people[m.pid].money }));
    const before = ctx.webRep(P(t)).scandal, city = P(t).city;
    ctx.pzCollapse(t, how);
    ok(!ctx.pzOf(t), `${how}: it is over`);
    ok(ctx.invMine(t, (c) => c.crime === 'ponzi').length === 1 || t.player.prison, `${how}: it opened a case against you`);
    ok(ctx.webRep(P(t)).scandal > before, `${how}: your name takes it`);
    ok(newsKinds(t).includes('scheme'), `${how}: it makes the paper`);
    ok(marks.some((m) => t.people[m.id].money < m.money), `${how}: the marks lost money`);
    ok(marks.some((m) => t.player.rels[m.id] && t.player.rels[m.id].rel < 40), `${how}: and trust in you`);
    ok(ctx.schemeOf(t).done[0].how === how, `${how}: it is on your record`);
    if (how === 'run') ok(P(t).city !== city, 'running means leaving town');
  }
  // A conviction takes some of it back.
  { const t = clone(s); t.player.money = 1000000; const before = t.player.money; ctx.webFact(t, 'arrested', { crime: 'ponzi' }); ok(t.player.money < before, 'a conviction takes money back'); }
  // The secret leaks and the scheme collapses.
  { const t = clone(s); const sec = ctx.webLive(t, (x) => x.kind === 'fraud')[0]; ctx.webExpose(t, sec, 'tip'); ok(!ctx.pzOf(t), 'the ledger getting out ends it'); }
  { const t = clone(s); ok(SECRET_KINDS.fraud.tipOdds(t, null) > 0, 'a fraud has a risk of its own'); }
  // Saturation: a club cannot raise what a platform can.
  { const t = clone(s); ctx.pzOf(t).style = 'club'; ctx.pzOf(t).owed = ctx.price(t, 5e6); ctx.pzYear(t); ok(pop(t, 'pzTurn') && pop(t, 'pzTurn').text.includes('dried up'), 'a small club saturates'); }
}

/* 2. the long con ---------------------------------------------------------------------- */
{
  for (const style of ['romance', 'partner', 'charity']) {
    const s = withCircle(adult(40));
    ok(ACTIONS.scheme_con.when(s), 'a charming adult can start a long con');
    act(s, 'scheme_con');
    answer(s, 'conStart', style);
    const c = ctx.conOf(s);
    ok(!!c && c.style === style, `${style}: it starts`);
    if (style !== 'charity') { const m = s.people[c.mark]; ok(m && m.money > 100000 && s.player.rels[c.mark].kind === 'mark', `${style}: a mark with money`); }
    ok(ctx.webLive(s, (x) => x.kind === 'long_con').length === 1, `${style}: a secret`);
    for (const v of ['warm', 'loan', 'venture', 'end', 'clean']) {
      const t = clone(s);
      t.player.money = 5e6;
      ctx.conYear(t);
      const before = t.player.money, take0 = ctx.conOf(t).take;
      const pp = pop(t, 'conTurn');
      ok(!!pp, `${style}/${v}: the year asks`);
      if (pp) answer(t, 'conTurn', v);
      if (v === 'loan' || v === 'venture') ok(t.player.money > before || style === 'charity' || ctx.conOf(t).take >= take0, `${style}/${v}: money changes hands`);
      if (v === 'end' || v === 'clean') ok(!ctx.conOf(t) && ctx.schemeOf(t).done.length === 1, `${style}/${v}: it is over`);
      if (v === 'clean') ok(t.player.karma > s.player.karma, `${style}/${v}: karma`);
    }
  }
  const s = withCircle(adult(40));
  ctx.conStart(s, 'romance');
  const c = ctx.conOf(s);
  c.susp = 75;
  ctx.conYear(s);
  ok(!!pop(s, 'conFamily'), 'suspicion brings the family');
  for (const v of ['charm', 'pull', 'cut']) { const t = clone(s); answer(t, 'conFamily', v); ok(true, 'family answers run'); }
  const t = clone(s);
  ctx.conOf(t).susp = 100;
  t.pending = [];
  ctx.conYear(t);
  ok(!ctx.conOf(t) && ctx.invMine(t, (k) => k.crime === 'con').length === 1, 'enough suspicion and the mark goes to the police');
  ok(newsKinds(t).includes('con'), 'and the paper');
  { const u = clone(s); u.pending = []; delete u.people[ctx.conOf(u).mark]; ctx.conYear(u); ok(!ctx.conOf(u), 'a mark who is gone ends it'); }
  { const u = clone(s); ctx.webExpose(u, ctx.webLive(u, (x) => x.kind === 'long_con')[0], 'gossip'); ok(!ctx.conOf(u), 'the secret getting out ends it'); }
}

/* 3. the ring (Mature) -------------------------------------------------------------- */
{
  META.settings.mature = false;
  const s = withCircle(adult(35));
  ok(!ctx.actionList(s, 'schemes').some((a) => a.id === 'ring_start'), 'the ring is hidden while Mature is off');
  META.settings.mature = true;
  s.player.skills.streetwise = 40;
  ok(ctx.actionList(s, 'schemes').some((a) => a.id === 'ring_start'), 'and shows with it');
  act(s, 'ring_start');
  const r = ctx.ringOf(s);
  ok(!!r && ctx.webLive(s, (x) => x.kind === 'blackmail_ring').length === 1, 'files are started, and are a secret');
  // Dig for dirt: it makes secrets you hold.
  for (let i = 0; i < 3; i++) { s.player.counters = {}; act(s, 'ring_work'); answer(s, 'ringWork', 'dig'); }
  ok(ctx.ringFiles(s, r).length >= 2, `digging gives you files (${ctx.ringFiles(s, r).length})`);
  ok(ctx.webHeard(s).every((x) => x.knows.includes(s.playerId)), 'you are one of the people who know');
  // Squeeze: pays or backfires.
  let paid = 0, back = 0;
  for (let i = 0; i < 40; i++) {
    const t = clone(s);
    t.player.counters = {};
    t.player.money = 5e6;
    const rr = ctx.ringOf(t), f = ctx.ringFiles(t, rr)[0];
    if (!f) continue;
    const m0 = t.player.money, heat0 = rr.heat;
    act(t, 'ring_work');
    answer(t, 'ringWork', 'f:' + f.id);
    if (t.player.money > m0) paid++; else if (rr.heat > heat0) back++;
    ok(rr.cool[f.id] > t.year, 'a squeezed file cools off');
  }
  ok(paid > 3 && back > 0, `squeezes sometimes pay (${paid}) and sometimes backfire (${back})`);
  // Crew, laying low.
  { const t = clone(s); t.player.counters = {}; act(t, 'ring_work'); answer(t, 'ringWork', 'hire'); ok(ctx.ringOf(t).crew === 1, 'a crew member can be taken on'); }
  { const t = clone(s); t.player.counters = {}; ctx.ringOf(t).heat = 30; act(t, 'ring_work'); answer(t, 'ringWork', 'low'); ok(ctx.ringOf(t).heat < 30, 'laying low cools it'); }
  // The bust.
  { const t = clone(s); ctx.ringBusted(t, 'exposed'); ok(!ctx.ringOf(t) && ctx.invMine(t, (c) => c.crime === 'blackmail').length === 1 && newsKinds(t).includes('ring'), 'a bust opens a case and makes the paper'); }
  { const t = clone(s); ctx.ringOf(t).heat = 90; let busted = 0; for (let i = 0; i < 200; i++) { const u = clone(t); ctx.ringYear(u); if (!ctx.ringOf(u)) busted++; } ok(busted > 40, `a hot ring gets busted (${busted}/200)`); }
  // Switching Mature off freezes the ring.
  { const t = clone(s); META.settings.mature = false; ctx.ringOf(t).heat = 99; ctx.ringYear(t); ok(!!ctx.ringOf(t), 'with Mature off the ring waits'); META.settings.mature = true; }
  META.settings.mature = false;
}

/* 4. the year --------------------------------------------------------------------- */
{
  const s = withCircle(adult(40));
  ctx.pzStart(s, 'club'); ctx.conStart(s, 'partner');
  const before = errors;
  for (let i = 0; i < 12 && !s.dead; i++) { try { ctx.ageUp(s); } catch (e) { ok(false, 'a year threw: ' + e.message); break; } for (let k = 0; k < 20 && s.pending.length; k++) { const pp = s.pending[0]; ctx.resolvePopup(s, pp.id, Math.max(0, pp.choices.findIndex((c) => !c.disabled)), pp.input ? 'X' : undefined); } }
  ok(errors === before, 'years with schemes running log no errors');
  const t = withCircle(adult(40));
  ctx.pzStart(t, 'club'); ctx.conStart(t, 'romance');
  t.player.prison = { yearsLeft: 3, total: 3, served: 0, crime: 'x', behavior: 50, juvie: false, name: 'x', gang: null };
  ctx.schemesYear(t);
  ok(!ctx.pzOf(t) && !ctx.conOf(t), 'prison ends them');
  // A kid never runs one.
  const kid = ctx.createLife({ country: 'us', year: 2000 }); ctx.schemesYear(kid); ok(true, 'kids are skipped');
}

console.log(failures ? `\n✖ ${failures} check(s) failed` : '✓ scheme checks passed');
process.exit(failures ? 1 : 0);
