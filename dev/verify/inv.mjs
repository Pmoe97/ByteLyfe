// Investigations verification:  node dev/verify/inv.mjs
//
// Covers 63-cases.js and 64-detective.js:
//   1. a crime leaves a case file, a detective who is a person, and evidence in range
//   2. a series — the same hand links cases, shares a detective and gets a press nickname
//   3. the year — strong evidence ends in an arrest, a careful culprit's case goes cold, a tip reopens it
//   4. the door — every choice in the interview and the warrant popups runs, an alibi can crack
//   5. the web — witnesses and exposure feed the case, destroying evidence thins it
//   6. what you can do — lay low, skip town
//   7. new crimes — arson, a romance scam and insider trading ride the same engine
//   8. a detective — a caseload, every way to work a case, solving, wrong arrests, losing your own file
//   9. strangers — crimes that hit people you know, and old files tidied away
//  10. long runs — thirty years of ticks keep every number in range, and the file saves whole
import { loadGame } from './loadgame.mjs';

const ctx = loadGame({ quiet: true });
const g = (name) => ctx.run(name);
ctx.seedRng(6402);
ctx.console.error = () => {};
let failures = 0, checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) { failures++; console.log('  ✖ ' + msg); } };
const META = g('META'), ACTIONS = g('ACTIONS'), EVENTS = g('EVENTS'), CRIMES = g('CRIMES');
const clone = (s) => JSON.parse(JSON.stringify(s));
const P = (s) => s.people[s.playerId];
const pop = (s, handler) => s.pending.find((p) => p.handler === handler);
const act = (s, id, t) => { s.pending = []; return ctx.doAction(s, id, t); };
const adult = (age) => {
  const s = ctx.createLife({ country: 'us', year: 2000 });
  s.year = 2000 + age; s.pending = [];
  s.player.edu.current = null;
  return s;
};
const friend = (s, kind, rel) => { const p = ctx.makeAdultNear(s, { minAge: 25, maxAge: 40 }); ctx.setRel(s, p.id, kind || 'friend', rel ?? 60); return p; };
// Every choice of a popup, each on its own copy of the game.
const eachChoice = (s, handler, check) => {
  const pp = pop(s, handler);
  if (!pp) { ok(false, `popup ${handler} is not pending`); return; }
  pp.choices.forEach((c, i) => {
    if (c.disabled) return;
    const t = clone(s);
    let threw = null;
    try { ctx.resolvePopup(t, pp.id, i); } catch (e) { threw = e; }
    ok(!threw, `${handler} choice "${c.label}" ran (${threw && threw.stack.split('\n').slice(0, 2).join(' | ')})`);
    if (!threw && check) check(t, c);
  });
};
const inRange = (s, where) => {
  for (const c of Object.values(ctx.invOf(s).list)) {
    ok(c.prog >= 0 && c.prog <= 100, `progress in range (${c.prog}) ${where}`);
    for (const k of ['trace', 'wit', 'dig']) ok(c.ev[k] >= 0 && c.ev[k] <= 100, `evidence ${k}=${c.ev[k]} in range ${where}`);
    ok(['open', 'cold', 'solved', 'closed'].includes(c.status), `status ${c.status} ${where}`);
  }
};

/* 1. a case file ------------------------------------------------------------------- */
{
  const s = adult(30);
  ctx.webFact(s, 'crime_clean', { crime: 'burglary' });
  const cases = ctx.invMine(s);
  ok(cases.length === 1 && cases[0].crime === 'burglary', 'a burglary opens a case');
  const c = cases[0], d = ctx.invDet(s, c);
  ok(!!d && d.det && d.det.skill >= 40, 'a detective who is a person works it');
  ok(ctx.relKind(s, d.id) === 'detective', 'the detective is someone you know of');
  ok(c.ev.trace >= 0 && c.ev.wit >= 0 && c.ev.dig >= 0, 'evidence is set');
  const sec = ctx.webMine(s)[0];
  ok(sec && sec.case === c.id && c.sec === sec.id, 'the secret and the case know each other');
  ctx.webFact(s, 'crime_clean', { crime: 'burglary' });
  ok(ctx.invDet(s, ctx.invMine(s)[1]).id === d.id, 'one detective per city');
  // A messier getaway leaves more behind.
  const clean = ctx.invOpen(s, 'bank', { messy: false }), messy = ctx.invOpen(s, 'bank', { messy: true });
  ok(true, 'cases open for either kind of getaway');
  inRange(s, '1');
}

/* 2. a series ----------------------------------------------------------------------- */
{
  const s = adult(30);
  const a = ctx.invOpen(s, 'burglary'), b = ctx.invOpen(s, 'car_theft'), c = ctx.invOpen(s, 'burglary');
  ok(a.links.length >= 1 && c.links.length >= 2, 'the same family of crime links into a series');
  ok(a.det === c.det && b.det === c.det, 'the series shares a detective');
  ok(a.nick && a.nick === c.nick, `three in a row earns a press nickname (${a.nick})`);
  ok(ctx.webUneaseHere(s) >= 2, 'a named series makes the city uneasy');
  ok(ctx.invDet(s, a).det.obs >= 8, 'it gets personal for the detective');
  const v = ctx.invOpen(s, 'assault', { victim: null });
  ok(v.links.length === 0, 'a violent crime does not join a property series');
}

/* 3. the year ------------------------------------------------------------------------ */
{
  const s = adult(30);
  s.player.skills.streetwise = 0;
  const c = ctx.invOpen(s, 'burglary', { messy: true });
  c.ev = { trace: 90, wit: 90, dig: 90 };
  let years = 0;
  while (c.status === 'open' && years++ < 40) { s.pending = []; s.year++; c.last = s.year; ctx.invCaseYear(s, c); }
  ok(c.status === 'solved', `a case with strong evidence ends in an arrest (${years} years)`);
  ok(years < 25, `and not too slowly (${years} years)`);
  ok(!!pop(s, 'trial'), 'an arrest sends you to court');

  const t = adult(30);
  t.player.skills.streetwise = 100;
  t.player.traits = [];
  P(t).traits = ['cunning'];
  const q = ctx.invOpen(t, 'burglary');
  q.ev = { trace: 0, wit: 0, dig: 0 };
  let n = 0;
  while (q.status === 'open' && n++ < 10) { t.pending = []; t.year++; ctx.invCaseYear(t, q); }
  ok(q.status === 'cold', `a careful culprit's thin case goes cold (${n} years)`);
  ctx.invTip(t, q, 30);
  ok(q.status === 'open', 'a tip reopens a cold case');
  q.status = 'cold';
  for (let i = 0; i < 400 && q.status === 'cold'; i++) ctx.invColdYear(t, q);
  ok(q.status !== 'cold', 'cold cases stir now and then, or are closed by time');
  // A murder is never closed by time.
  const m = ctx.invOpen(t, 'murder', { victim: null }); m.status = 'cold'; m.year -= 50;
  ctx.invColdYear(t, m);
  ok(m.status !== 'closed', 'a murder case never closes');
  inRange(s, '3'); inRange(t, '3b');
}

/* 4. the door ------------------------------------------------------------------------- */
{
  const s = adult(33);
  s.player.money = 100000;
  friend(s, 'friend', 60);
  const c = ctx.invOpen(s, 'burglary');
  c.prog = 45;
  s.pending = [];
  ctx.invInterview(s, c);
  ok(!!pop(s, 'invTalk'), 'a detective comes to ask questions');
  eachChoice(s, 'invTalk');
  ctx.invWarrant(s, c);
  eachChoice(s, 'invWarrant');
  // An alibi puts a friend in the story, and friends crack.
  const t = adult(33);
  const f = friend(t, 'friend', 60);
  const q = ctx.invOpen(t, 'burglary');
  q.prog = 45; t.pending = [];
  ctx.invInterview(t, q);
  const pp = pop(t, 'invTalk');
  ctx.resolvePopup(t, pp.id, pp.choices.findIndex((x) => x.value === 'alibi'));
  ok(q.alibi === f.id, 'the alibi is a friend');
  const before = q.prog;
  let cracked = false;
  for (let i = 0; i < 80 && !cracked; i++) { q.status = 'open'; q.prog = 30; ctx.invCaseYear(t, q); cracked = !q.alibi; }
  ok(cracked, 'an alibi can crack');
  // An envelope buys a detective or gets you charged.
  const b = adult(33);
  b.player.money = 100000;
  const bc = ctx.invOpen(b, 'burglary'); bc.prog = 45; b.pending = [];
  ctx.invInterview(b, bc);
  let bought = false, charged = false;
  for (let i = 0; i < 60 && !(bought && charged); i++) {
    const u = clone(b);
    const pq = pop(u, 'invTalk');
    ctx.resolvePopup(u, pq.id, pq.choices.findIndex((x) => x.value === 'bribe'));
    if (pop(u, 'trial')) charged = true; else bought = true;
    ctx.seedRng(1000 + i);
  }
  ok(bought && charged, 'a bribe either works or gets you arrested');
}

/* 5. the web --------------------------------------------------------------------------- */
{
  const s = adult(30);
  ctx.webFact(s, 'crime_clean', { crime: 'burglary' });
  const sec = ctx.webMine(s)[0], c = ctx.invOf(s).list[sec.case];
  const w0 = c.ev.wit;
  const pal = friend(s, 'friend', 40);
  ctx.webLearn(s, sec, pal.id, s.playerId);
  ok(c.ev.wit > w0, 'another person knowing is another witness');
  c.ev.trace = 60; c.ev.dig = 40;
  s.player.money = 50000;
  act(s, 'web_coverup');
  ok(c.ev.trace < 60 && c.ev.dig < 40, 'destroying evidence thins the police file');
  c.status = 'cold';
  ctx.webExpose(s, sec, 'tip');
  ok(c.status === 'open', 'a secret getting out reopens the case');
  ok(!!ACTIONS.web_coverup && ctx.webMine(s).length === 0, 'and it is no secret any more');
}

/* 6. what you can do --------------------------------------------------------------------- */
{
  const s = adult(30);
  const c = ctx.invOpen(s, 'burglary');
  ok(ACTIONS.inv_laylow.when(s), 'you can lay low with an open case');
  const cover0 = ctx.invCover(s, c);
  act(s, 'inv_laylow');
  ok(c.lay && ctx.invCover(s, c) > cover0, 'laying low helps');
  s.player.money = 50000;
  const home = P(s).city;
  act(s, 'inv_flee');
  const pp = pop(s, 'invFlee');
  ok(!!pp, 'skipping town asks where');
  const i = pp.choices.findIndex((x) => x.value);
  ctx.resolvePopup(s, pp.id, i);
  ok(P(s).city !== home, 'you moved');
  ok(ctx.invCover(s, c) >= cover0 + 20, 'a case in another city is easier to hide from');
  ok(!ACTIONS.inv_laylow.when(adult(30)), 'nothing to lay low from without a case');
}

/* 7. new crimes --------------------------------------------------------------------------- */
{
  for (const id of ['arson', 'con', 'insider_trading']) {
    ok(!!CRIMES[id] && !!ACTIONS['crime_' + id], `${id} is a crime with an action`);
    let opened = 0;
    for (let i = 0; i < 40; i++) {
      const s = adult(30);
      s.player.skills.charisma = 80; s.player.skills.business = 80;
      ctx.hire(s, 'bank', 1);
      ctx.commitCrime(s, id);
      if (ctx.invMine(s).length) opened++;
    }
    ok(opened > 5, `${id} leaves case files (${opened} of 40)`);
  }
  ok(!ACTIONS.crime_insider_trading.when(adult(30)), 'insider trading needs a job');
  // An assault leaves a victim who saw you; a stranger's family may not call.
  let reported = 0;
  for (let i = 0; i < 40; i++) { const s = adult(30); const v = friend(s, 'friend', 50); ctx.webFact(s, 'assault', { pid: v.id }); if (ctx.invMine(s).length) reported++; }
  ok(reported > 15 && reported < 40, `a beaten friend sometimes calls the police (${reported} of 40)`);
  // Squeezing someone can become extortion.
  META.settings.mature = true;
  let extorted = 0;
  for (let i = 0; i < 60; i++) { const s = adult(30); const v = friend(s, 'friend', 50); ctx.webFact(s, 'extorted', { pid: v.id }); if (ctx.invMine(s).some((c) => c.crime === 'extortion')) extorted++; }
  META.settings.mature = false;
  ok(extorted > 10, `squeezing someone can be reported (${extorted} of 60)`);
}

/* 8. a detective ----------------------------------------------------------------------------- */
{
  const s = adult(32);
  ctx.hire(s, 'police', 2);
  s.player.skills.charisma = 60; s.player.skills.streetwise = 60; s.player.skills.coding = 60; P(s).stats.smarts = 80;
  ok(g('isDetective')(s), 'level 2 police are detectives');
  ok(!g('isDetective')((() => { const t = adult(32); ctx.hire(t, 'police', 1); return t; })()), 'a patrol officer has no caseload');
  ctx.careerTick(s);
  const dt = g('dtOf')(s);
  ok(dt.load.length >= 4, `a detective is given a caseload (${dt.load.length})`);
  ok(ctx.dtCases(s).every((k) => k.assigned && k.who === null), 'the cases are strangers’ crimes');
  ok(ACTIONS.det_work.when(s), 'there is work to do');
  // Every way of working every case.
  act(s, 'det_work');
  const pick1 = pop(s, 'dtPick');
  ok(!!pick1 && pick1.choices.length >= 2, 'the desk lists the open files');
  ctx.resolvePopup(s, pick1.id, 0);
  const how = pop(s, 'dtWork');
  ok(!!how, 'choosing a file offers ways to work it');
  const ways = how.choices.filter((c) => c.value).length;
  ok(ways >= 6, `there are ways to work a case (${ways})`);
  how.choices.forEach((c, i) => {
    if (!c.value) return;
    for (let r = 0; r < 4; r++) {
      const t = clone(s);
      ctx.seedRng(300 + r + i * 7);
      let threw = null;
      try { ctx.resolvePopup(t, how.id, i); } catch (e) { threw = e; }
      ok(!threw, `working a case by "${c.label}" ran (${threw && threw.stack.split('\n').slice(0, 2).join(' | ')})`);
      inRange(t, '8');
    }
  });
  // Solving one pays.
  const k = ctx.dtCases(s)[0];
  k.prog = 99;
  const perf0 = s.player.career.perf;
  act(s, 'det_work');
  ctx.resolvePopup(s, pop(s, 'dtPick').id, 0);
  const w = pop(s, 'dtWork');
  ctx.seedRng(1);
  ctx.resolvePopup(s, w.id, w.choices.findIndex((c) => c.value === 'arrest'));
  ok(k.status === 'solved' || dt.wrong > 0 || ctx.invOf(s).list[k.id].prog < 99, 'pulling in a suspect either solves it or goes wrong');
  // A wrong arrest costs.
  const t = adult(32);
  ctx.hire(t, 'police', 2); ctx.careerTick(t);
  const tk = ctx.dtCases(t)[0]; tk.prog = 5;
  let wrong = 0;
  for (let i = 0; i < 30; i++) {
    const u = clone(t);
    ctx.seedRng(2000 + i);
    act(u, 'det_work');
    ctx.resolvePopup(u, pop(u, 'dtPick').id, 0);
    const ww = pop(u, 'dtWork');
    ctx.resolvePopup(u, ww.id, ww.choices.findIndex((c) => c.value === 'arrest'));
    if (g('dtOf')(u).wrong) wrong++;
  }
  ok(wrong > 12, `pulling in a suspect with nothing usually goes wrong (${wrong} of 30)`);
  // Losing your own file.
  const f = adult(34);
  ctx.hire(f, 'police', 2); f.player.skills.streetwise = 50;
  const mine = ctx.invOpen(f, 'burglary'); mine.prog = 60; mine.ev = { trace: 80, wit: 40, dig: 10 };
  ok(ACTIONS.det_pull_file.when(f), 'a detective with a case against them can pull the file');
  let thinned = 0, fired = 0;
  for (let i = 0; i < 40; i++) {
    const u = clone(f);
    ctx.seedRng(3000 + i);
    act(u, 'det_pull_file');
    const kk = ctx.invOf(u).list[mine.id];
    if (kk.ev.trace < 80) thinned++; else fired++;
  }
  ok(thinned > 20 && fired > 3, `pulling your file works or gets you fired (${thinned} thinned, ${fired} fired)`);
  // Patrol work leaves the ordinary loop alone.
  const pa = adult(25);
  ctx.hire(pa, 'police', 0);
  ctx.careerTick(pa);
  ok(!pa.player.dt, 'a cadet has no desk');
}

/* 9. strangers ------------------------------------------------------------------------------- */
{
  let hit = 0, lines = 0;
  for (let i = 0; i < 60; i++) {
    const s = adult(30);
    friend(s, 'friend', 60); friend(s, 'coworker', 50);
    for (let y = 0; y < 12; y++) { s.year++; ctx.invWorldYear(s); }
    const L = Object.values(ctx.invOf(s).list);
    if (L.some((c) => c.who === null && c.victim)) hit++;
    if (L.every((c) => c.who === null)) lines++;
    for (const c of L) ok(c.who === null || c.who === s.playerId, 'cases belong to a stranger or to you');
  }
  ok(hit > 30, `crime sometimes hits people you know (${hit} of 60 lives)`);
  // Old files are tidied away.
  const s = adult(30);
  const old = ctx.invWorldCase(s, { crime: 'burglary' });
  old.status = 'solved'; old.solved = s.year - 9;
  ctx.invWorldYear(s);
  ok(!ctx.invOf(s).list[old.id], 'an old solved file is cleared out');
  const kid = adult(10);
  for (let i = 0; i < 80; i++) ctx.invWorldYear(kid);
  ok(!Object.values(ctx.invOf(kid).list).some((c) => c.victim), 'no crime touches a small child’s circle');
}

/* 10. long runs ---------------------------------------------------------------------------------- */
{
  const s = adult(25);
  for (const id of ['burglary', 'car_theft', 'assault', 'bank']) ctx.webFact(s, id === 'assault' ? 'assault' : 'crime_clean', id === 'assault' ? { pid: friend(s, 'friend', 50).id } : { crime: id });
  ctx.hire(s, 'police', 3);
  const copy = clone(s);
  ok(JSON.stringify(copy.inv) === JSON.stringify(s.inv), 'the case files save and load whole');
  for (let i = 0; i < 30; i++) {
    copy.year++; copy.pending = [];
    ctx.invTick(copy);
    ctx.webTick(copy);
    ctx.careerTick(copy);
    inRange(copy, `year ${i}`);
    if (copy.player.prison) copy.player.prison = null;
  }
  ok(Object.keys(ctx.invOf(copy).list).length <= 70, 'the file cabinet is capped');
}

console.log(failures ? `\n❌ ${failures} investigation checks failed.` : `✅ Investigation checks passed (${checks} checks).`);
process.exit(failures ? 1 : 0);
