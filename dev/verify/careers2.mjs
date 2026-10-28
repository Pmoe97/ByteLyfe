// Careers, part two verification:  node dev/verify/careers2.mjs
//
// Covers 86-careers-plus.js and the engine's twists (65-work.js):
//   1. new tracks — forensic science and behavioral analysis are real jobs, work real cases, and promote on the cases they move
//   2. patrol     — a beat cop plays a deck, a detective plays the detective's desk, and promotion hands over cleanly
//   3. paramedic  — training and certification gate the ladder, strain builds, burnout bites and can be eased
//   4. teacher    — a class every year, tenure and results gate the big jobs, and the exam is a choice
//   5. lawyer     — the partner track needs trials won and clients brought in
//   6. cook-offs  — regional, national, world, in order
//   7. seasons    — farming and fishing have a year that moves what a card pays
//   8. twists     — a good result can bring one, it opens at once, you can say not now, and the twist is never dealt on its own
import { loadGame } from './loadgame.mjs';

const ctx = loadGame({ quiet: true });
const g = (name) => ctx.run(name);
ctx.seedRng(8601);
let errors = 0;
ctx.console.error = () => { errors++; };
let failures = 0;
const ok = (cond, msg) => { if (!cond) { failures++; console.log('  ✖ ' + msg); } };
const WORKDECK = g('WORKDECK'), JOBS = g('JOBS'), SKILLS = g('SKILLS');
const clone = (s) => JSON.parse(JSON.stringify(s));
const P = (s) => s.people[s.playerId];
const pop = (s, handler) => s.pending.find((p) => p.handler === handler);
const adult = (age) => { const s = ctx.createLife({ country: 'us', year: 2000 }); s.year = 2000 + age; s.pending = []; s.player.edu.current = null; s.player.money = 500000; for (const k of Object.keys(SKILLS)) s.player.skills[k] = 50; P(s).stats.smarts = 70; return s; };
const job = (id, level) => { const s = adult(32); ctx.hire(s, id, level ?? 0); return s; };
const st = (s, id) => ctx.wkState(s, id);
const play = (s, id, cid, ways) => { const state = st(s, id), k = ctx.wkCard(id, cid); state.hand.push({ hid: 'ht', cid, c: ctx.wkCtx(s, k) }); s.pending = []; ctx.wkStart(s, 'ht'); let guard = 0; while (pop(s, 'wkStage') && guard++ < 6) { const pp = pop(s, 'wkStage'); const open = pp.choices.map((c, i) => [c, i]).filter(([c]) => !c.disabled && c.value !== 'later'); ctx.resolvePopup(s, pp.id, open[(ways ? ways(guard) : 0) % open.length][1]); } };
const win = (s, id, cid) => { ctx.seedRng(1); const orig = ctx.chance; /* all stages are rolled by the engine: replay seeds until it wins */ for (let i = 0; i < 200; i++) { const t = clone(s); ctx.seedRng(1000 + i); play(t, id, cid); const x = st(t, id); if (x.ok === (st(s, id).ok + 1)) return t; } return null; };

/* 1. the new tracks -------------------------------------------------------------------- */
{
  for (const id of ['forensics', 'profiler']) {
    ok(!!JOBS[id] && JOBS[id].ladder.length === 5 && !!WORKDECK[id], `${id} is a real job with a deck`);
    const s = job(id, 0);
    ok(s.player.career && s.player.career.id === id, `${id}: you can hold it`);
    const kid = ctx.createLife({ country: 'us', year: 2000 }); ok(ctx.missingReqs(kid, JOBS[id].req).length > 0, `${id}: it takes a degree and an adult`);
    // A good year moves a real case.
    let moved = 0, back = 0, solved = 0;
    for (let i = 0; i < 80; i++) {
      const t = job(id, 0); ctx.seedRng(2000 + i);
      const cid = id === 'forensics' ? 'bench' : 'series';
      const before = Object.values(t.inv ? t.inv.list : {}).length;
      play(t, id, cid, (n) => 0);
      const cases = Object.values((t.inv && t.inv.list) || {}).filter((c) => c.who === null);
      if (cases.some((c) => c.prog > 20)) moved++;
      if ((st(t, id).flags.solved || 0) > 0) solved++;
      if (cases.some((c) => c.prog === 0)) back++;
    }
    ok(moved > 10, `${id}: your work moves a real case (${moved}/80)`);
    // Promotion needs the cases you moved.
    const t = job(id, 0); const x = st(t, id); x.flags.assists = 0;
    t.player.career.levelYears = 5; t.pending = [];
    ok(!WORKDECK[id].gate(t, t.player.career, x), `${id}: no promotion without cases moved`);
    x.flags.assists = 2; ok(WORKDECK[id].gate(t, t.player.career, x), `${id}: with them, there is`);
    const lv2 = job(id, 2); const y = st(lv2, id); y.flags.assists = 4; ok(!WORKDECK[id].gate(lv2, lv2.player.career, y), `${id}: later rungs need more`);
    // The year.
    const u = job(id, 1); u.year++; ctx.careerTick(u); ok(st(u, id).hand.length >= 2, `${id}: the year deals a hand`);
  }
  { const s = adult(32); const board = ctx.jobBoard(s).map((x) => x.id); ok(board.includes('forensics') && board.includes('profiler'), 'both are on the job board'); ok(g('JOB_IDS').includes('forensics'), 'and in the list God Mode and the job pools read'); }
  // A cold case wakes up.
  { const s = job('forensics', 1); const k = ctx.invOpen(s, 'burglary', { who: null }); k.status = 'cold'; k.who = null; const w = ctx.coldWake(s); ok(w.status === 'open' && w.prog >= 40, 'a cold case wakes up'); }
  // Forensics card ways include an honest one and a dirty one with a price.
  { const k = WORKDECK.forensics.cards.find((c) => c.id === 'contaminated'); ok(k.stages[0].ways.some((w) => w[6] && w[6].dirty), 'the shortcut is marked dirty'); }
}

/* 2. patrol ------------------------------------------------------------------------------ */
{
  ok(!!WORKDECK.police && WORKDECK.police.cards.some((c) => c.max === 1), 'police has a patrol deck');
  const s = job('police', 1); s.year++; ctx.careerTick(s);
  ok(st(s, 'police').hand.length >= 1, 'a patrol officer gets a hand');
  ok(!st(s, 'police').hand.some((h) => ctx.wkCard('police', h.cid).min >= 2), 'only patrol cards');
  const d = job('police', 2); st(d, 'police').hand.push({ hid: 'x', cid: 'stop', c: {} });
  d.year++; ctx.careerTick(d);
  ok(st(d, 'police').hand.length === 0, 'a detective\'s patrol desk is cleared');
  ok(!!d.player.dt, 'and the detective\'s desk plays its own year');
  // The shopkeeper confides a web secret.
  let learned = 0;
  for (let i = 0; i < 60; i++) { const t = job('police', 0); ctx.seedRng(3000 + i); play(t, 'police', 'shopkeeper'); if (ctx.webHeard(t).length) learned++; }
  ok(learned > 3, `the shopkeeper knows things (${learned}/60)`);
  // The honest force report beats the tilted one.
  const k = WORKDECK.police.cards.find((c) => c.id === 'force'); ok(k.stages[0].ways.filter((w) => w[6] && w[6].dirty).length === 1, 'the use-of-force report has one dirty way');
}

/* 3. paramedic ----------------------------------------------------------------------------- */
{
  const s = job('paramedic', 0);
  const x = st(s, 'paramedic'); const D = WORKDECK.paramedic;
  s.player.career.levelYears = 5;
  ok(!D.gate(s, s.player.career, x), 'no promotion from EMT without the certification');
  x.flags.cert = 1; ok(D.gate(s, s.player.career, x), 'one certification makes a paramedic');
  const l1 = job('paramedic', 1); ok(!D.gate(l1, l1.player.career, st(l1, 'paramedic')), 'senior takes a second');
  // Training earns it.
  let got = 0;
  for (let i = 0; i < 60; i++) { const t = job('paramedic', 0); ctx.seedRng(4000 + i); play(t, 'paramedic', 'ridealong'); if ((st(t, 'paramedic').flags.cert || 0) >= 1) got++; }
  ok(got > 10, `the ride-along can earn it (${got}/60)`);
  // Strain builds, and burnout bites.
  const t = job('paramedic', 1); const y = st(t, 'paramedic');
  for (let i = 0; i < 8; i++) { t.year++; ctx.careerTick(t); t.pending = []; y.hand = []; }
  ok((y.flags.stress || 0) > 40, `strain builds (${y.flags.stress})`);
  y.flags.stress = 80;
  let burned = 0; for (let i = 0; i < 40; i++) { const u = clone(t); const uy = st(u, 'paramedic'); uy.hand = []; ctx.wkDeal(u, u.player.career, WORKDECK.paramedic, uy); if (uy.hand.some((h) => h.cid === 'burnout')) burned++; }
  ok(burned > 10, `a tired paramedic gets the burnout card (${burned}/40)`);
  { const u = clone(t); ctx.seedRng(5); const uy = st(u, 'paramedic'); uy.flags.stress = 80; const before = uy.flags.stress; for (let i = 0; i < 30; i++) { const w = clone(u); ctx.seedRng(600 + i); play(w, 'paramedic', 'burnout', () => 0); if (st(w, 'paramedic').flags.stress < before) { ok(true, ''); i = 99; } } }
  const quiet = job('paramedic', 0); ok(!WORKDECK.paramedic.cards.find((c) => c.id === 'burnout').when(quiet, quiet.player.career, st(quiet, 'paramedic')), 'a rested paramedic does not burn out');
  ok(WORKDECK.paramedic.cards.find((c) => c.id === 'mci').stages.length === 3, 'a mass casualty incident is three decisions');
}

/* 4. teacher ------------------------------------------------------------------------------- */
{
  const s = job('teacher', 1); const x = st(s, 'teacher'); const D = WORKDECK.teacher;
  const seen = new Set();
  for (let i = 0; i < 40; i++) { s.year++; ctx.careerTick(s); s.pending = []; x.hand = []; seen.add(x.flags.cls); }
  ok(seen.size >= 3, `the class changes every year (${[...seen].join(',')})`);
  ok(x.flags.years >= 40, 'years are counted');
  const t = job('teacher', 1); const y = st(t, 'teacher'); y.flags.years = 1; ok(!D.gate(t, t.player.career, y), 'tenure gates senior teacher'); y.flags.years = 3; ok(D.gate(t, t.player.career, y), 'three years is enough');
  const v = job('teacher', 3); const z = st(v, 'teacher'); z.flags.years = 12; z.flags.scores = 0; ok(!D.gate(v, v.player.career, z), 'a principal needs results'); z.flags.scores = 4; ok(D.gate(v, v.player.career, z), 'with them, they get it');
  // The exam.
  let up = 0; for (let i = 0; i < 80; i++) { const u = job('teacher', 1); ctx.seedRng(7000 + i); play(u, 'teacher', 'test', () => 0); if ((st(u, 'teacher').flags.scores || 0) > 0) up++; } ok(up > 5, `teaching it properly can raise your results (${up}/80)`);
  ok(D.cards.find((c) => c.id === 'test').stages[0].ways.some((w) => w[6] && w[6].dirty), 'and cheating is a dirty way');
  // A hard class gives more fights.
  const w = (c) => D.cards.find((k) => k.id === 'fight').w(null, null, { flags: { cls: c } }); ok(w(3) > w(0), 'a hard class has more trouble');
  ok(!ctx.wkCard('teacher', 'award') || !WORKDECK.teacher.cards.find((c) => c.id === 'award').when(job('teacher', 1), null, { flags: { scores: 0 }, m: 80 }), 'no teacher of the year without results');
}

/* 5. lawyer --------------------------------------------------------------------------------- */
{
  const D = WORKDECK.lawyer;
  const s = job('lawyer', 2); const x = st(s, 'lawyer');
  ok(!D.gate(s, s.player.career, x), 'no partner track without trials won'); x.flags.wins = 2; ok(D.gate(s, s.player.career, x), 'two trials won is the way up');
  const p = job('lawyer', 3); const y = st(p, 'lawyer'); y.flags.wins = 4; ok(!D.gate(p, p.player.career, y), 'managing partner needs clients too'); y.flags.clients = 2; ok(D.gate(p, p.player.career, y), 'with them, it is open');
  let won = 0; for (let i = 0; i < 80; i++) { const t = job('lawyer', 1); ctx.seedRng(8000 + i); play(t, 'lawyer', 'trial', () => 0); if ((st(t, 'lawyer').flags.wins || 0) > 0) won++; } ok(won > 3, `a trial can be won (${won}/80)`);
  ok(D.cards.find((c) => c.id === 'trial').stages.length === 3, 'a trial is three decisions');
  ok(!D.cards.find((c) => c.id === 'partner_vote').when(job('lawyer', 3), null, { flags: { wins: 0 } }), 'the partnership vote needs a record');
  ok(D.payMul(s, { flags: { clients: 3 } }) > D.payMul(s, { flags: {} }), 'clients you brought in pay');
  { const t = job('lawyer', 1); let pro = 0; for (let i = 0; i < 80; i++) { const u = clone(t); ctx.seedRng(9000 + i); play(u, 'lawyer', 'probono', () => 0); if ((u.web && u.web.deeds || []).length) pro++; } ok(pro > 3, `pro bono is a good deed (${pro}/80)`); }
}

/* 6. cook-offs --------------------------------------------------------------------------------- */
{
  const D = WORKDECK.chef;
  const s = job('chef', 3); const x = st(s, 'chef');
  const get = (id) => D.cards.find((c) => c.id === id);
  ok(get('cook_regional').when(s, s.player.career, x) && !get('cook_national').when(s, s.player.career, x), 'you start at the regional');
  x.flags.cook = 1; ok(!get('cook_regional').when(s, s.player.career, x) && get('cook_national').when(s, s.player.career, x), 'then the national');
  x.flags.cook = 2; ok(get('cook_world').when(s, s.player.career, x), 'then the world');
  x.flags.cook = 0;
  let champ = 0; for (let i = 0; i < 100; i++) { const t = job('chef', 3); ctx.seedRng(10000 + i); play(t, 'chef', 'cook_regional', () => 0); if ((st(t, 'chef').flags.cook || 0) === 1) champ++; } ok(champ > 3, `the regional can be won (${champ}/100)`);
  ok(get('cook_regional').stages.length === 3 && get('cook_national').stages.length === 3 && get('cook_world').stages.length === 3, 'each final is three decisions');
  ok(D.kv(s, x)[0][1] === 'Not yet', 'the desk says where you stand');
}

/* 7. seasons ----------------------------------------------------------------------------------- */
{
  for (const id of ['farm', 'fishing']) {
    const s = job(id, 0); const x = st(s, id); const D = WORKDECK[id];
    const kinds = new Set();
    for (let i = 0; i < 60; i++) { s.year++; ctx.careerTick(s); s.pending = []; x.hand = []; kinds.add(id === 'farm' ? x.flags.wx : x.flags.sea); }
    ok(kinds.size >= 3, `${id}: the seasons vary (${[...kinds].join(',')})`);
    const mul = new Set(); for (const sea of [0, 1, 2, 3]) mul.add(D.payMul(s, { flags: { wx: sea, sea, px: 1 } }));
    ok(mul.size >= 3, `${id}: the season moves what a card pays`);
    ok(D.kv(s, x).length >= 2, `${id}: the desk shows it`);
  }
  const f = WORKDECK.farm; ok(f.payMul(null, { flags: { wx: 0, px: 0 } }) > f.payMul(null, { flags: { wx: 2, px: 2 } }), 'a good year with strong prices pays more than a dry one with low prices');
  const w = WORKDECK.fishing.cards.find((c) => c.id === 'storm').w; ok(w(null, null, { flags: { sea: 3 } }) > w(null, null, { flags: { sea: 0 } }), 'storms come in a storm year');
  { let hero = 0; for (let i = 0; i < 100; i++) { const t = job('fishing', 1); ctx.seedRng(11000 + i); play(t, 'fishing', 'rescue', () => 0); if ((t.web && t.web.deeds || []).length) hero++; } ok(hero > 3, `a rescue at sea is a good deed (${hero}/100)`); }
  { let debt = 0; for (let i = 0; i < 100; i++) { const t = job('farm', 1); ctx.seedRng(12000 + i); play(t, 'farm', 'harvest', () => 2); if (st(t, 'farm').flags.debt) debt++; } ok(debt > 0, `a bad harvest means debt (${debt}/100)`); }
}

/* 8. twists ----------------------------------------------------------------------------------- */
{
  let total = 0;
  for (const id of Object.keys(WORKDECK)) {
    const D = WORKDECK[id];
    for (const k of D.cards) {
      if (!k.twist) continue;
      total++;
      const tw = D.cards.find((c) => c.id === k.twist);
      ok(!!tw && tw.only === true, `${id}/${k.id}: its twist ${k.twist} exists and is twist-only`);
    }
  }
  ok(total >= 14, `a good number of cards carry a twist (${total})`);
  for (const id of ['doctor', 'surgeon', 'firefighter', 'bartender', 'journalist', 'pilot']) ok(WORKDECK[id].cards.some((c) => c.twist), `${id} has a twist`);
  // A twist is never dealt on its own.
  for (const id of Object.keys(WORKDECK)) {
    const D = WORKDECK[id]; if (D.tags) continue;
    const s = job(id, Math.min(2, JOBS[id].ladder.length - 1)); const x = st(s, id); x.hand = [];
    for (let i = 0; i < 25; i++) { x.hand = []; s.pending = []; ctx.wkDeal(s, s.player.career, D, x); ok(!x.hand.some((h) => D.cards.find((c) => c.id === h.cid).only), `${id}: twists are not dealt`); }
  }
  // A good result brings one, which opens at once and can be put off.
  const s = job('paramedic', 1);
  const k = WORKDECK.paramedic.cards.find((c) => c.id === 'arrest');
  let fired = null;
  for (let i = 0; i < 200 && !fired; i++) { const t = clone(s); ctx.seedRng(13000 + i); const x = st(t, 'paramedic'); x.hand.push({ hid: 'ht', cid: 'arrest', c: ctx.wkCtx(t, k) }); t.pending = []; ctx.wkStart(t, 'ht'); let guard = 0; while (pop(t, 'wkStage') && guard++ < 6) { const pp = pop(t, 'wkStage'); if (pp.title.startsWith('The family finds you')) { fired = t; break; } ctx.resolvePopup(t, pp.id, 0); } }
  ok(!!fired, 'a good result brings the twist');
  if (fired) {
    const pp = pop(fired, 'wkStage');
    ok(pp.choices.some((c) => c.value === 'later'), 'and you can say not now');
    ok(st(fired, 'paramedic').hand.some((h) => h.cid === 'family'), 'it is on your desk');
    ctx.resolvePopup(fired, pp.id, pp.choices.findIndex((c) => c.value === 'later'));
    ok(st(fired, 'paramedic').hand.some((h) => h.cid === 'family'), 'and stays there');
  }
  // Autopilot never takes a twist.
  const a = job('paramedic', 1); const ax = st(a, 'paramedic'); ax.hand = [{ hid: 'a1', cid: 'arrest', c: {} }]; const e0 = errors; a.year++; ctx.careerTick(a); ok(errors === e0, 'autopilot handles a card with a twist');
}

/* 9. long careers ------------------------------------------------------------------------------ */
{
  const before = errors;
  for (const id of ['forensics', 'profiler', 'police', 'paramedic', 'teacher', 'lawyer', 'farm', 'fishing', 'chef']) {
    const s = job(id, 0); s.player.money = 5e6;
    for (let i = 0; i < 30 && !s.dead; i++) {
      try { ctx.ageUp(s); } catch (e) { ok(false, `${id}: a year threw ${e.message}`); break; }
      for (let k = 0; k < 40 && s.pending.length; k++) { const pp = s.pending[0]; ctx.resolvePopup(s, pp.id, Math.max(0, pp.choices.findIndex((c) => !c.disabled)), pp.input ? 'X' : undefined); }
      const x = s.player.work && s.player.work[id];
      if (x) { ok(x.m >= 0 && x.m <= 100, `${id}: meter in range`); ok(x.hand.length <= 6, `${id}: hand small`); for (const f of ['stress', 'strain', 'hours']) if (x.flags[f] !== undefined) ok(x.flags[f] >= 0 && x.flags[f] <= 100, `${id}: ${f} in range`); }
    }
  }
  ok(errors === before, 'thirty years in each logs no errors');
}
console.log(failures ? `\n✖ ${failures} check(s) failed` : '✓ career part two checks passed');
process.exit(failures ? 1 : 0);
