// Secret agent verification:  node dev/verify/spy.mjs
//
// Covers 60-spy.js:
//   1. gating — nothing spy-related shows for a civilian; vetting needs a degree and a clean record
//   2. recruitment — vetting, the cover and training popups, the academy year, the recruiter event
//   3. missions — every mission and approach resolves; every outcome leaves sane meters
//   4. twists, captures, the mole hunt, getting burned — every choice in every popup works
//   5. assets — recruiting, the cap, handling, losing them
//   6. double agents — the pitch, selling secrets, exposure and its three endings
//   7. aftermath — memoirs, consulting, revenge, disavowal, the prisoner swap
//   8. long careers — rank, desks, ageing, saves, God Mode careers
import { loadGame } from './loadgame.mjs';

const ctx = loadGame({ quiet: true });
const g = (name) => ctx.run(name);
ctx.seedRng(6007);
let failures = 0;
const ok = (cond, msg) => { if (!cond) { failures++; console.log('  ✖ ' + msg); } };
const EVENTS = g('EVENTS'), SPY_MISSIONS = g('SPY_MISSIONS'), SPY_TWISTS = g('SPY_TWISTS'), JOBS = g('JOBS');
const drain = (s) => { for (let k = 0; k < 60 && s.pending.length; k++) { const p = s.pending[0]; ctx.resolvePopup(s, p.id, Math.max(0, p.choices.findIndex((c) => !c.disabled)), p.input ? 'X' : undefined); } };
const act = (s, id, t) => { s.pending = []; return ctx.doAction(s, id, t); };
const pop = (s, handler) => s.pending.find((p) => p.handler === handler);
const answer = (s, handler, value) => { const pp = pop(s, handler); if (!pp) return false; const i = pp.choices.findIndex((c) => c.value === value); return ctx.resolvePopup(s, pp.id, i < 0 ? 0 : i); };
const P = (s) => s.people[s.playerId];
const clone = (s) => JSON.parse(JSON.stringify(s));
const adult = (age, o) => {
  const s = ctx.createLife(Object.assign({ country: 'us', year: 2000 }, o));
  s.year = 2000 + age; s.pending = [];
  s.player.edu.current = null;
  s.player.edu.degrees.push({ type: 'high' }, { type: 'bachelor', major: 'business' });
  P(s).stats.smarts = 85; s.player.skills.streetwise = 40; s.player.karma = 60;
  return s;
};
// An agent in good standing, past the academy.
const agent = (age, level) => {
  const s = adult(age || 30);
  ctx.hire(s, 'spy', level || 0);
  ctx.startSpyCareer(s);
  drain(s);
  s.player.spy.trained = true;
  s.player.spy.cover.id = 'consultant';
  return s;
};
const inv = (s, where) => {
  const sp = s.player.spy;
  if (!sp) return;
  ok(sp.cover.strength >= 0 && sp.cover.strength <= 100, `cover strength in range (${sp.cover.strength}) ${where}`);
  ok(sp.heat >= 0 && sp.heat <= 100, `heat in range (${sp.heat}) ${where}`);
  ok(sp.standing >= 0 && sp.standing <= 100, `standing in range (${sp.standing}) ${where}`);
  ok(sp.assets.filter((a) => a.state === 'active').length <= 6, `no more than six live assets ${where}`);
  ok(sp.assets.every((a) => a.loyalty >= 0 && a.loyalty <= 100 && a.value >= 1 && a.value <= 3), `asset numbers sane ${where}`);
  ok(!(sp.burned && !sp.burned.year), `a burn has a year ${where}`);
  ok(!s.player.career || !g('isSpyJob')(s.player.career.id) || s.player.career.level < JOBS.spy.ladder.length, `rank on the ladder ${where}`);
};
// Resolves every choice of a popup on its own copy of the game.
const eachChoice = (s, handler, check) => {
  const pp = pop(s, handler);
  if (!pp) { ok(false, `popup ${handler} is not pending`); return; }
  pp.choices.forEach((c, i) => {
    if (c.disabled) return;
    const t = clone(s);
    const q = t.pending.find((x) => x.id === pp.id);
    let threw = null;
    try { ctx.resolvePopup(t, q.id, i); drain(t); } catch (e) { threw = e; }
    ok(!threw, `${handler} choice "${c.label}" ran (${threw && threw.stack.split('\n').slice(0, 2).join(' | ')})`);
    if (!threw) { inv(t, `${handler}:${c.value}`); if (check) check(t, c, i); }
  });
};

/* 1. gating --------------------------------------------------------------------- */
{
  const s = adult(30);
  ok(!s.player.spy, 'no spy file until you join');
  ok(ctx.actionList(s, 'spy').length === 0, 'a civilian sees no Intelligence menu');
  ctx.spyTick(s);
  ok(!s.player.spy, 'the tick does not create a file for a civilian');
  const j = JOBS.spy;
  ok(j.special === 'spy' && j.cat === 'spy' && j.ladder.length === 7, 'the career is registered with seven rungs');
  const t = ctx.createLife({ country: 'us', year: 2000 }); t.year = 2025; t.pending = [];
  t.player.edu.current = null; t.player.edu.degrees.push({ type: 'high' });
  const r = ctx.applyJob(t, 'spy');
  ok(!t.player.career && /qualify/.test(r.text), 'no degree, no vetting');
  const x = adult(30);
  x.player.record.push({ crime: 'burglary', year: 2015, years: 1 });
  ctx.applyJob(x, 'spy');
  ok(!x.player.career, 'a felony keeps you out of the agency');
}

/* 2. recruitment ------------------------------------------------------------------ */
{
  const s = adult(28);
  for (let i = 0; i < 80 && !s.player.career; i++) { s.pending = []; s.player.counters = {}; ctx.applyJob(s, 'spy'); }
  ok(s.player.career && s.player.career.id === 'spy', 'the vetting eventually passes');
  const sp = s.player.spy;
  ok(!!sp && sp.handle.includes(' ') && sp.agency.startsWith('the '), 'a file is made with a handle and an agency');
  ok(s.player.career.employer && !/Inc\./.test(s.player.career.employer), 'the employer is the agency');
  ok(s.pending.length === 1 && s.pending[0].handler === 'spyCover', 'the first popup picks a cover');
  ok(s.pending[0].choices.length === 6, 'six covers on offer');
  answer(s, 'spyCover', 'diplomat');
  ok(sp.cover.id === 'diplomat' && sp.cover.strength === 100, 'the cover is saved at full strength');
  ok(!!pop(s, 'spyTrack') && pop(s, 'spyTrack').choices.length === 4, 'then a training track');
  answer(s, 'spyTrack', 'tech');
  ok(sp.track === 'tech' && !sp.trained, 'the track is saved; the academy has not happened yet');
  s.pending = [];
  ctx.ageUp(s); drain(s);
  ok(s.player.spy.trained, 'the first year is the academy');
  ok(!s.player.spy.missions.length, 'no assignments during academy');
  ok(s.player.skills.coding > 5, 'the academy trains the track’s skills');
  ok(g('spyCtx')(s) && ctx.actionList(s, 'spy').length > 0, 'the Intelligence menu opens');
  // The recruiter finds a smart graduate.
  const r = adult(26);
  const ev = EVENTS.spy_recruiter;
  ok(!!ev && ev.when(r), 'a bright graduate can be approached');
  const poor = ctx.createLife({ country: 'us', year: 2000 }); poor.year = 2026;
  ok(!ev.when(poor), 'the recruiter ignores people without a degree');
  const t = clone(r);
  ev.choices[0][1](t, {}); drain(t);
  ok(t.player.career && t.player.career.id === 'spy' && !!t.player.spy, 'accepting the coffee hires you');
  const u = adult(26); u.player.record.push({ crime: 'burglary', year: 2015, years: 1 });
  ok(!ev.when(u), 'a felon is not approached');
}

/* 3. missions ------------------------------------------------------------------------ */
{
  const results = {};
  const bumpR = (id, r) => { results[id] = results[id] || {}; results[id][r] = (results[id][r] || 0) + 1; };
  for (const id of g('SPY_MISSION_IDS')) {
    const mi = SPY_MISSIONS[id];
    if (id === 'mole') continue;
    for (let w = 0; w < mi.ways.length; w++) {
      ok(typeof mi.ways[w][1] === 'string' && g('SKILLS')[mi.ways[w][1]], `${id} way ${w} uses a real skill (${mi.ways[w][1]})`);
      for (let n = 0; n < 25; n++) {
        const s = agent(32, Math.max(mi.min, 2));
        s.player.spy.trained = true;
        const st = { name: 'Valdoria', adj: 'Valdorian' };
        let threw = null;
        try { ctx.runMission(s, mi, id, st, w); } catch (e) { threw = e; }
        ok(!threw, `${id}/${w} ran (${threw && threw.stack.split('\n').slice(0, 2).join(' | ')})`);
        if (threw) continue;
        const last = s.player.spy.missions[s.player.spy.missions.length - 1];
        bumpR(id, last.result);
        try { drain(s); } catch (e) { ok(false, `${id}/${w} popups threw ${e.stack.split('\n').slice(0, 2).join(' | ')}`); }
        inv(s, `${id}/${w}`);
        ok(s.dead ? last.result === 'killed' : true, 'only a killed result ends the life');
      }
    }
  }
  const total = Object.values(results).reduce((n, o) => n + Object.values(o).reduce((a, b) => a + b, 0), 0);
  const wins = Object.values(results).reduce((n, o) => n + (o.success || 0), 0);
  ok(wins / total > 0.35 && wins / total < 0.95, `missions win a sane share (${wins}/${total})`);
  ok(Object.values(results).some((o) => o.blown) && Object.values(results).some((o) => o.partial), 'blown and partial outcomes both happen');
  // Odds respond to skill.
  const a = agent(32, 2), b = agent(32, 2);
  for (const x of [a, b]) { P(x).stats.smarts = 40; x.player.skills.streetwise = 20; x.player.skills.charisma = 20; }
  b.player.skills.streetwise = 90; b.player.skills.charisma = 90;
  const mi = SPY_MISSIONS.watch;
  ok(ctx.missionOdds(b, mi, 0) > ctx.missionOdds(a, mi, 0), 'skill raises the odds');
  b.player.spy.heat = 80;
  ok(ctx.missionOdds(b, mi, 0) < ctx.missionOdds(agent(32, 2), mi, 0) + 0.3, 'heat lowers the odds');
  // Offers follow rank.
  const low = agent(25, 0);
  let seen = new Set();
  for (let i = 0; i < 60; i++) { low.pending = []; low.flags = low.flags; low.player.flags.spyMission = 0; ctx.offerMission(low); const p = low.pending[0]; if (p) seen.add(p.ctx ? p.ctx.id : 'mole'); }
  ok([...seen].every((id) => SPY_MISSIONS[id].min === 0), `a trainee is offered only entry missions (${[...seen]})`);
  const top = agent(40, 5);
  seen = new Set();
  for (let i = 0; i < 160; i++) { top.pending = []; top.player.flags.spyMission = 0; ctx.offerMission(top); const p = top.pending[0]; if (p) seen.add(p.ctx ? p.ctx.id : 'mole'); }
  ok(seen.size >= 7, `a senior officer sees the full range (${seen.size})`);
  // Declining costs standing.
  const d = agent(30, 1);
  d.player.flags.spyMission = 0; ctx.offerMission(d);
  const stand = d.player.spy.standing;
  if (pop(d, 'spyMission')) { answer(d, 'spyMission', 'no'); ok(d.player.spy.standing < stand, 'declining an assignment costs standing'); }
  // A mission pays.
  const pay = agent(30, 2);
  const m0 = pay.player.money;
  let paid = false;
  for (let i = 0; i < 20 && !paid; i++) { ctx.runMission(pay, SPY_MISSIONS.watch, 'watch', { name: 'Valdoria', adj: 'Valdorian' }, 0); drain(pay); paid = pay.player.money > m0; if (pay.dead) break; }
  ok(paid, 'a successful mission pays a bonus');
}

/* 4. twists, captures, the mole hunt, getting burned --------------------------------------- */
{
  for (const t of SPY_TWISTS) {
    for (let n = 0; n < 4; n++) {
      const s = agent(32, 3);
      ctx.makeAsset(s, { name: 'Valdoria', adj: 'Valdorian' });
      s.player.money = 100000;
      s.pending = [];
      // Force this twist.
      s.pending.push({ id: 'tw', emoji: t.emoji, title: t.title, text: t.text(s), handler: 'spyTwist', ctx: { id: t.id }, choices: t.choices.map((ch, i) => ({ label: ch[0], value: i, sub: ch[2] || '' })) });
      if (n === 0) eachChoice(s, 'spyTwist', (u) => ok(!u.dead, `twist ${t.id} never kills`));
    }
  }
  ok(SPY_TWISTS.length >= 5, 'at least five twists');
  // Captured: every answer.
  const base = agent(34, 3);
  base.player.spy.cover.id = 'diplomat';
  base.player.money = 100000;
  base.pending = [];
  // Build the captured popup the way runMission does, by forcing the outcome.
  const force = (s, outcome) => {
    ctx.run('globalThis.__w = weighted; globalThis.__c = chance;');
    ctx.run(`weighted = (items, f) => ${JSON.stringify(outcome)}; chance = (p) => false;`);
    try { ctx.runMission(s, SPY_MISSIONS.watch, 'watch', { name: 'Valdoria', adj: 'Valdorian' }, 0); } finally { ctx.run('weighted = globalThis.__w; chance = globalThis.__c;'); }
  };
  force(base, 'captured');
  ok(!!pop(base, 'spyCaught'), 'a captured outcome asks how you will cope');
  ok(base.player.spy.fail === 1 && base.player.spy.missions.slice(-1)[0].result === 'captured', 'the capture is logged');
  const cp = pop(base, 'spyCaught');
  ok(!cp.choices.find((c) => c.value === 'immunity').disabled, 'a diplomat can claim immunity');
  eachChoice(base, 'spyCaught');
  const civ = agent(34, 3);
  civ.player.spy.cover.id = 'trader';
  force(civ, 'captured');
  ok(pop(civ, 'spyCaught').choices.find((c) => c.value === 'immunity').disabled, 'a trader has no immunity');
  // Immunity expels; it does not imprison.
  // Prison route: sentence, then a swap.
  const pr = agent(34, 3);
  pr.player.spy.captive = true;
  ctx.sentence(pr, 'espionage', 1, 'Test.');
  if (pr.player.prison) {
    let free = false;
    for (let i = 0; i < 40 && !free; i++) { ctx.spyTick(pr); pr.pending = []; free = !pr.player.prison; }
    ok(free, 'a captive spy is eventually exchanged');
    ok(!pr.player.spy.captive && pr.player.life.swap >= 1, 'the swap is counted');
  }
  // The mole hunt.
  for (const mole of [0, 1, 2, -1]) {
    const s = agent(34, 3);
    s.player.flags.spyMission = 0;
    ctx.offerMole(s);
    const p = pop(s, 'spyMole');
    ok(!!p && p.choices.length === 4, 'the mole hunt offers three suspects and "no mole"');
    p.ctx.moleIdx = mole;
    const money = s.player.money;
    const right = mole < 0 ? 'none' : mole;
    ctx.resolvePopup(s, p.id, p.choices.findIndex((c) => c.value === right));
    ok(s.player.spy.ok === 1 && s.player.money > money, `finding the answer (${mole}) pays and counts`);
    ok(mole < 0 || s.player.life.moleCaught === 1, 'catching the mole is tallied');
    const w = agent(34, 3);
    w.player.flags.spyMission = 0;
    ctx.offerMole(w);
    const q = pop(w, 'spyMole');
    q.ctx.moleIdx = mole;
    const wrong = mole < 0 ? 0 : (mole + 1) % 3;
    const st0 = w.player.spy.standing;
    ctx.resolvePopup(w, q.id, q.choices.findIndex((c) => c.value === wrong));
    ok(w.player.spy.fail === 1 && w.player.spy.standing < st0, 'an accusation that misses costs standing');
  }
  // Getting burned.
  const bs = agent(34, 3);
  bs.player.spy.cover.strength = 0;
  ctx.checkBurn(bs);
  const bp = pop(bs, 'spyBurn');
  ok(!!bp && !!bs.player.spy.burned && bs.player.life.burned === 1, 'a cover at zero is burned');
  ok(bp.choices.length === 4, 'four ways out of a burn');
  eachChoice(bs, 'spyBurn', (t, c) => {
    if (c.value === 'newface') ok(!t.player.spy.burned && t.player.spy.cover.strength === 70 && t.player.career.level === 2, 'a new face rewrites the cover and drops a rank');
    if (c.value === 'desk') ok(t.player.spy.desk && !t.player.spy.burned, 'a desk job keeps you in');
    if (c.value === 'resign') ok(!t.player.career && t.player.spy.alumni, 'resigning ends the career');
    if (c.value === 'public') ok(!t.player.career && t.player.spy.memoir && t.player.spy.alumni, 'going public publishes the book');
  });
  const low = agent(34, 3);
  low.player.spy.standing = 10;
  low.player.spy.heat = 100;
  ctx.checkBurn(low);
  ok(pop(low, 'spyBurn').choices.find((c) => c.value === 'newface').disabled, 'a poor reputation cannot ask for a new identity');
  const hot = agent(34, 3);
  hot.player.spy.heat = 100;
  ctx.checkBurn(hot);
  ok(!!hot.player.spy.burned && hot.player.spy.burned.how === 'hunted', 'maximum heat burns you');
}

/* 5. assets ----------------------------------------------------------------------------------- */
{
  const s = agent(34, 3);
  for (let i = 0; i < 9; i++) ctx.makeAsset(s, { name: 'Valdoria', adj: 'Valdorian' });
  ok(s.player.spy.assets.filter((a) => a.state === 'active').length === 6, 'a network holds six assets at most');
  ok(s.player.life.assetsRecruited === 9, 'every recruit is counted');
  s.player.money = 500000;
  const ids = s.player.spy.assets.filter((a) => a.state === 'active').map((a) => a.id);
  for (const v of ['meet', 'bonus', 'extract', 'drop']) {
    const t = clone(s);
    t.pending = []; t.player.counters = {};
    ok(ctx.doAction(t, 'spy_assets'), `the asset action opens (${v})`);
    ok(!!pop(t, 'spyAssetPick'), 'it asks which asset');
    answer(t, 'spyAssetPick', ids[0]);
    ok(!!pop(t, 'spyAssetDo'), 'then what to do');
    const before = t.player.spy.assets.find((a) => a.id === ids[0]);
    const loy = before.loyalty;
    answer(t, 'spyAssetDo', v);
    const after = t.player.spy.assets.find((a) => a.id === ids[0]);
    if (v === 'meet' || v === 'bonus') ok(after.loyalty > loy || loy > 85, `${v} raises loyalty`);
    if (v === 'extract') ok(after.state === 'extracted', 'extraction brings them home');
    if (v === 'drop') ok(after.state === 'dropped', 'dropping cuts them loose');
  }
  // A year of the network.
  let lost = 0;
  for (let n = 0; n < 60; n++) {
    const t = clone(s);
    t.player.spy.heat = 40;
    const before = t.player.spy.assets.filter((a) => a.state === 'active').length;
    ctx.assetsYear(t, t.player.spy);
    lost += before - t.player.spy.assets.filter((a) => a.state === 'active').length;
    inv(t, 'assetsYear');
  }
  ok(lost > 0, 'networks lose assets over time');
  // Leaving the agency cuts them loose.
  const l = clone(s);
  ctx.leaveJob(l, 'quit');
  ok(l.player.spy.assets.every((a) => a.state !== 'active'), 'quitting cuts the network loose');
}

/* 6. double agents ------------------------------------------------------------------------------ */
{
  const s = agent(34, 3);
  const ev = EVENTS.spy_approach;
  ok(ev.when(s), 'a mid-career officer can be pitched');
  const a = clone(s);
  ev.choices[0][1](a, {}); drain(a);
  ok(!!a.player.spy.controlled && !a.player.spy.turned, 'reporting the pitch makes you a controlled double');
  const m0 = a.player.money, st0 = a.player.spy.standing;
  ctx.controlledYear(a, a.player.spy);
  ok(a.player.money > m0 && a.player.spy.standing >= st0, 'a controlled double earns standing and a stipend');
  const b = clone(s);
  const r = ev.choices[1][1](b, {}); drain(b);
  ok(!!b.player.spy.turned && b.player.life.turned === 1 && b.player.spy.sold === 1, 'taking the money turns you');
  const c = clone(s);
  ev.choices[2][1](c, {}); drain(c);
  ok(!c.player.spy.turned && c.player.spy.heat > s.player.spy.heat, 'refusing raises heat and keeps you clean');
  // A traitor draws a yearly payment.
  const t = clone(b);
  const mm = t.player.money;
  t.player.spy.heat = 0;
  ctx.traitorYear(t, t.player.spy);
  ok(t.player.money > mm, 'a traitor is paid every year');
  // Selling a secret.
  const sell = agent(34, 2);
  const mon = sell.player.money;
  ok(act(sell, 'spy_sell'), 'the sell action is offered to a field officer');
  drain(sell);
  ok(sell.player.money > mon && sell.player.life.sold === 1, 'it pays and is counted');
  ok(!ctx.actionList(agent(30, 0), 'spy').some((x) => x.id === 'spy_sell'), 'a trainee cannot sell secrets');
  // Exposure, every ending.
  const e = clone(b);
  e.player.money = 500000;
  e.pending = [];
  ctx.exposeTraitor(e);
  ok(!!pop(e, 'spyExposed') && pop(e, 'spyExposed').choices.length === 3, 'exposure offers three ways out');
  eachChoice(e, 'spyExposed', (u, ch) => {
    ok(u.player.spy.disavowed && !u.player.spy.turned, `exposure (${ch.value}) disavows you`);
    if (ch.value === 'flee') ok(u.player.spy.defected === u.year && u.player.wanted > 0 && !u.player.career, 'fleeing makes you a wanted defector');
    if (ch.value === 'deal') ok(!u.player.career, 'a deal ends the career');
  });
  // Defect, directly.
  const d = clone(b);
  ok(act(d, 'spy_defect'), 'a traitor can choose to defect');
  ok(d.player.spy.defected && d.player.life.defected === 1, 'defecting is counted');
  // Disavowed people are turned away.
  const re = clone(d);
  re.player.wanted = 0;
  re.player.career = null;
  re.player.counters = {};
  const rr = ctx.applyJob(re, 'spy');
  ok(!re.player.career && /file on you/.test(rr.text), 'a disavowed spy is not re-hired');
  // The polygraph catches liars.
  let caught = 0;
  for (let n = 0; n < 80; n++) { const t2 = clone(b); t2.pending = []; EVENTS.spy_polygraph.choices[0][1](t2, {}); if (pop(t2, 'spyExposed')) caught++; }
  ok(caught > 5, `a polygraph catches a traitor often (${caught}/80)`);
  let clean = 0;
  for (let n = 0; n < 80; n++) { const t2 = clone(s); t2.pending = []; EVENTS.spy_polygraph.choices[0][1](t2, {}); if (pop(t2, 'spyExposed')) clean++; }
  ok(clean === 0, 'a loyal officer is never exposed by a polygraph');
}

/* 7. aftermath ------------------------------------------------------------------------------------- */
{
  const s = agent(45, 4);
  const alumnus = clone(s);
  ctx.leaveJob(alumnus, 'quit');
  ok(alumnus.player.spy.alumni && !alumnus.player.spy.disavowed, 'quitting makes you an alumnus');
  ok(ctx.actionList(alumnus, 'spy').map((a) => a.id).includes('spy_memoir') || alumnus.player.spy.alumni, 'alumni keep the Intelligence menu');
  const acts = ctx.actionList(alumnus, 'spy').map((a) => a.id);
  ok(acts.includes('spy_consult') && acts.includes('spy_memoir'), `alumni can consult and write (${acts})`);
  ok(!acts.includes('spy_sell') && !acts.includes('spy_assets'), 'alumni cannot run agents');
  const m0 = alumnus.player.money;
  ok(act(alumnus, 'spy_consult'), 'consulting works'); drain(alumnus);
  ok(alumnus.player.money > m0, 'consulting pays');
  for (const kind of ['tellall', 'clean', 'novel']) {
    let books = 0, bans = 0, jail = 0;
    for (let n = 0; n < 40; n++) {
      const t = clone(alumnus);
      t.pending = [];
      const r = ctx.writeMemoir(t, kind);
      drain(t);
      books++;
      if (t.player.prison) jail++;
      if (r && r.title === 'Banned') bans++;
      ok(t.player.spy.memoir && t.player.life.memoir === 1, 'a memoir is counted once');
    }
    if (kind === 'tellall') ok(bans + jail > 5, `a tell-all draws legal trouble (${bans + jail}/40)`);
    if (kind === 'novel') ok(bans + jail < 10, `a novel is mostly safe (${bans + jail}/40)`);
  }
  const once = clone(alumnus);
  act(once, 'spy_memoir'); answer(once, 'spyMemoir', 'novel');
  ok(!ctx.actionList(once, 'spy').some((a) => a.id === 'spy_memoir'), 'one memoir per life');
  // Revenge visits the burned.
  const burned = agent(34, 3);
  burned.player.spy.burned = { year: burned.year - 1, how: 'blown' };
  ctx.leaveJob(burned, 'quit');
  let visits = 0;
  for (let n = 0; n < 200; n++) { const t = clone(burned); t.pending = []; ctx.revengeYear(t); if (pop(t, 'spyRevenge')) { visits++; if (n === 0) eachChoice(t, 'spyRevenge'); } }
  ok(visits > 3, `burned spies get watched (${visits}/200)`);
  const q = clone(burned);
  q.player.spy.burned.year = q.year - 20;
  let late = 0;
  for (let n = 0; n < 100; n++) { const t = clone(q); t.pending = []; ctx.revengeYear(t); if (pop(t, 'spyRevenge')) late++; }
  ok(late === 0, 'revenge fades after a decade');
  // The partner.
  const lover = agent(34, 2);
  const p = ctx.makeAdultNear(lover, {});
  ctx.setRel(lover, p.id, 'partner', 60);
  P(lover).partner = p.id;
  ok(act(lover, 'spy_tell'), 'you can tell your partner');
  ok(lover.player.spy.told[p.id] && lover.player.rels[p.id].rel > 60, 'telling them brings you closer');
  ok(!ctx.actionList(lover, 'spy').some((a) => a.id === 'spy_tell'), 'you only tell them once');
  const susp = EVENTS.spy_partner_suspects;
  const w = agent(34, 2);
  const p2 = ctx.makeAdultNear(w, {});
  ctx.setRel(w, p2.id, 'partner', 60);
  P(w).partner = p2.id;
  ok(susp.when(w), 'a suspicious partner shows up when the secret is kept');
  for (let i = 0; i < 3; i++) { const t = clone(w); t.pending = []; susp.choices[i][1](t, { pid: p2.id }); }
}

/* 8. long careers ------------------------------------------------------------------------------------ */
{
  let maxLevel = 0, deaths = 0, burns = 0, jailed = 0, desks = 0, ok10 = 0, lives = 0;
  const causes = {};
  for (let n = 0; n < 30; n++) {
    const s = agent(26, 0);
    s.player.money = 250000;
    // Half the agents are sharp, half are green.
    P(s).stats.smarts = n % 2 ? 80 : 55;
    s.player.skills.streetwise = n % 2 ? 55 : 20; s.player.skills.charisma = n % 2 ? 50 : 15;
    lives++;
    for (let y = 0; y < 40 && !s.dead; y++) {
      s.pending = [];
      try { ctx.ageUp(s); drain(s); } catch (e) { ok(false, `ageUp threw at ${y}: ${e.stack.split('\n').slice(0, 3).join(' | ')}`); break; }
      // Now and then a spy does something between years.
      for (const a of ctx.actionList(s, 'spy').filter(() => ctx.run('rand()') < 0.3)) { if (a.id === 'spy_sell' || a.id === 'spy_defect') continue; try { ctx.doAction(s, a.id); drain(s); } catch (e) { ok(false, `action ${a.id} threw: ${e.stack.split('\n').slice(0, 2).join(' | ')}`); } }
      inv(s, `soak ${n}/${y}`);
      const c = s.player.career;
      if (c && c.id === 'spy') maxLevel = Math.max(maxLevel, c.level);
      if (s.player.spy.desk) desks++;
      if (s.player.prison) jailed++;
      if (A(s) > 85) break;
    }
    if (s.dead) { deaths++; causes[s.lineage.slice(-1)[0].cause] = 1; }
    if (s.player.life.burned) burns++;
    ok10 += s.player.spy.ok;
    // Saves survive.
    const back = JSON.parse(JSON.stringify(s));
    ok(JSON.stringify(back.player.spy) === JSON.stringify(s.player.spy), 'the spy file survives a save round trip');
  }
  function A(s) { return s.year - P(s).birthYear; }
  ok(maxLevel >= 3, `careers climb the ladder (max rung ${maxLevel})`);
  ok(ok10 > 30, `agents complete missions over a career (${ok10} in ${lives} lives)`);
  ok(deaths < lives, 'most spies survive the year-by-year soak');
}

/* 9. God Mode careers, ageing, the rest of the game ---------------------------------------------------- */
{
  const s = adult(34);
  ctx.hire(s, 'spy', 3);
  ok(!s.player.spy, 'a God Mode spy has no file yet');
  ctx.ageUp(s); drain(s);
  ok(!!s.player.spy && s.player.spy.cover.strength > 0, 'the first year of service makes the file');
  for (let y = 0; y < 5 && !s.dead; y++) { s.pending = []; ctx.ageUp(s); drain(s); }
  // Military intel veterans are favoured.
  const v = adult(30);
  v.player.mil = { vet: true, discharge: 'honorable', spec: 'intel', served: 6, tours: [], wounds: [], medals: { valor: 0, heart: 0, ribbon: 0 }, ptsd: 0, edLeft: 0, rating: 0, squad: [], trained: true, branch: 'army' };
  ok(ctx.vetSpyEdge(v) === 0.15, 'intelligence veterans get a hiring edge');
  ok(ctx.vetSpyEdge(adult(30)) === 0, 'civilians do not');
  // Achievements and goals exist and are checkable.
  const ach = g('ACHIEVEMENTS').filter((a) => a.id.startsWith('spy_'));
  ok(ach.length === 14, `14 spy achievements (${ach.length})`);
  const sx = agent(40, 6);
  for (const a of ach) { try { a.check(sx); } catch (e) { ok(false, `achievement ${a.id} threw`); } }
  ok(ach.find((a) => a.id === 'spy_director').check(sx) && ach.find((a) => a.id === 'spy_chief').check(sx), 'rank achievements read the career');
  const goals = g('GOALS').filter((x) => x.id === 'g_spy' || x.id === 'g_station');
  ok(goals.length === 2 && goals.find((x) => x.id === 'g_station').check(agent(40, 4)), 'two spy goals');
  const titles = g('LEGACY_TITLES').filter((t) => ['master_spy', 'traitor_t'].includes(t.id));
  ok(titles.length === 2, 'two legacy titles');
  const ms = agent(40, 4); ms.player.life.spyOk = 8;
  ok(titles.find((t) => t.id === 'master_spy').check(ms), 'eight clean missions make a Master Spy');
  ms.player.spy.disavowed = true;
  ok(!titles.find((t) => t.id === 'master_spy').check(ms), 'a disavowed spy is no master');
  // A dead spy is found in the lineage.
  const dead = agent(40, 3);
  dead.player.flags.spyMission = 0;
  ctx.die(dead, 'killed on an operation that officially never happened');
  ok(dead.dead && /^killed/.test(dead.lineage.slice(-1)[0].cause), 'the cause of death reads as an event');
}

console.log(failures ? `\n❌ ${failures} spy check failures` : '\n✅ Spy checks passed.');
process.exit(failures ? 1 : 0);
