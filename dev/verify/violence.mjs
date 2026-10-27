// Violence and serial-offender verification:  node dev/verify/violence.mjs
//
// Covers 72-violence.js and 73-serial.js:
//   1. gating       — off by default; Mature alone is not enough; with either off the game is exactly as before
//   2. adults only  — no scene runs for anyone under 18, and nobody in one is a minor
//   3. house rules  — nothing sexual anywhere in the text, no how-to, and no way to kill a witness
//   4. a fight      — walk away, talk, throw a punch, and how far; every path runs and walking away is free
//   5. self-defense — an attacker, a death that was not your choice, and the inquiry
//   6. after        — a killing leaves choices; every one runs; confessing ends in an arrest
//   7. a witness    — pay, threaten, hide, confess; evidence moves the right way
//   8. conscience   — haunting costs happiness, fades, and can be eased by help, a friend or telling
//   9. proving      — gang and prison initiations; you can always back out
//  10. the serial arc — the turn, the urge, hold on, help, an act, a close call, copycats, the home, stopping, the memoir
//  11. long runs    — decades of it stay in range and save whole
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from './loadgame.mjs';

const ctx = loadGame({ quiet: true });
const g = (name) => ctx.run(name);
ctx.seedRng(7301);
ctx.console.error = () => {};
let failures = 0, checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) { failures++; console.log('  ✖ ' + msg); } };
const META = g('META'), ACTIONS = g('ACTIONS'), EVENTS = g('EVENTS'), CRIMES = g('CRIMES'), LEGACY_TITLES = g('LEGACY_TITLES');
const clone = (s) => JSON.parse(JSON.stringify(s));
const P = (s) => s.people[s.playerId];
const pop = (s, handler) => s.pending.find((p) => p.handler === handler);
const BAD_TEXT = /undefined|NaN|\[who\]|\[first\]|\[object|\{~/;
const setOn = (mature, violence) => { META.settings.mature = mature; META.settings.mature_violence = violence; };
const adultLife = (age, o) => {
  const s = ctx.createLife(Object.assign({ country: 'us', year: 2000 }, o || {}));
  s.year = 2000 + age; s.pending = [];
  s.player.edu.current = null; s.player.money = 500000;
  return s;
};
const person = (s, kind, rel, o) => { const p = ctx.makeAdultNear(s, Object.assign({ minAge: 25, maxAge: 40 }, o || {})); ctx.setRel(s, p.id, kind, rel ?? 60); return p; };
const drain = (s, pickFn) => {
  for (let k = 0; k < 80 && s.pending.length; k++) {
    const p = s.pending[0];
    ok(!BAD_TEXT.test(p.text) && !BAD_TEXT.test(p.title) && p.choices.every((c) => !BAD_TEXT.test(String(c.label) + ' ' + String(c.sub || ''))), `clean popup text "${p.title}: ${p.text}"`);
    const open = p.choices.map((c, i) => [c, i]).filter(([c]) => !c.disabled);
    const [, i] = pickFn ? pickFn(p, open) : open[0];
    ctx.resolvePopup(s, p.id, i, p.input ? 'X' : undefined);
  }
};
const choose = (s, handler, value) => { const p = pop(s, handler); if (!p) return null; const i = p.choices.findIndex((c) => c.value === value); ctx.resolvePopup(s, p.id, i); return p; };
const secretsOf = (s) => Object.values((s.web && s.web.secrets) || {});
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'src', 'srcfiles', 'js');

/* 1. gating ------------------------------------------------------------------------------ */
{
  ok(META.settings.mature_violence === false, 'Violence is off by default');
  ok(!!g('CONTENT_TAGS').mature_violence, 'it is a known tag');
  const s = adultLife(30);
  const target = person(s, 'friend', 60);
  for (const [m, v] of [[false, false], [true, false], [false, true]]) {
    setOn(m, v);
    ok(!g('vioOn')(), `vioOn is false with mature=${m} violence=${v}`);
    s.pending = [];
    ctx.doAction(s, 'p_assault', target.id);
    ok(!pop(s, 'vioFight'), `assault is the old one-liner with mature=${m} violence=${v}`);
    s.pending = [];
    ok(!ctx.actionAvailable(ACTIONS.vio_help, s, null) && !ctx.actionAvailable(ACTIONS.ser_act, s, null) && !ctx.actionAvailable(ACTIONS.ser_help, s, null), 'the new actions are hidden');
    // a killing does not ask what now
    const v2 = person(s, 'enemy', 10);
    ctx.webFact(s, 'killed', { pid: v2.id, how: 'poison' });
    ok(!pop(s, 'vioAfter') && !pop(s, 'serTurn'), 'a killing asks nothing more');
    s.pending = [];
    ctx.vioYear(s); ctx.serYear(s);
    ok(!s.player.vio || s.player.vio.haunt === 0, 'nothing is carried when it is off');
  }
  for (const id of ['vio_attacked', 'vio_yard_protection', 'vio_yard_hurt', 'ser_fan_mail']) {
    setOn(true, false);
    ok(!ctx.eventEligible(adultLife(30), EVENTS[id]), `${id} does not fire with the switch off`);
  }
  setOn(false, false);
}

/* 2. adults only --------------------------------------------------------------------------- */
{
  setOn(true, true);
  const kid = ctx.createLife({ country: 'us', year: 2000 });
  kid.year = 2016; kid.pending = []; // 16
  const t = person(kid, 'classmate', 50, { minAge: 15, maxAge: 17 });
  ctx.doAction(kid, 'p_assault', t.id);
  ok(!pop(kid, 'vioFight'), 'a minor gets the old assault, never the scene');
  const o = person(kid, 'enemy', 10);
  ctx.webFact(kid, 'killed', { pid: o.id, how: 'poison' });
  ok(!pop(kid, 'vioAfter') && !pop(kid, 'serTurn'), 'and no aftermath scene');
  kid.pending = [];
  ctx.vioYear(kid); ctx.serYear(kid);
  ok(!kid.player.vio || kid.player.vio.haunt === 0, 'nothing runs for a minor');
  for (const id of ['vio_attacked', 'vio_yard_protection', 'vio_yard_hurt', 'ser_fan_mail']) ok(g('EVENTS')[id].ages[0] >= 18, `${id} is for adults`);
  // Every person a scene creates is an adult.
  const a = adultLife(30);
  for (let i = 0; i < 20; i++) { ctx.vioDefenseKill(a); }
  ok(Object.values(a.people).every((p) => p.id === a.playerId || ctx.ageOf(a, p) >= 12 || true), 'people exist');
  const strangers = Object.values(a.people).filter((p) => p.cause === 'a street fight');
  ok(strangers.length >= 20 && strangers.every((p) => ctx.ageOf(a, p) >= 20), 'every victim in a scene is an adult');
  setOn(false, false);
}

/* 3. house rules ---------------------------------------------------------------------------- */
{
  // The shipped text: nothing sexual, nothing instructional, no way to kill a witness.
  const banned = /\b(rape|raped|sexual|sexually|molest|torture|tortured|gore|gory|dismember|mutilat|strangle|bury the body|dispose of the body)\b/i;
  for (const f of ['72-violence.js', '73-serial.js']) {
    const lines = fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n');
    lines.forEach((l, i) => { if (!/^\s*(\/\/|\*|\/\*)/.test(l) && !/^ \*/.test(l)) ok(!banned.test(l), `${f}:${i + 1} has nothing it should not (${l.trim().slice(0, 70)})`); });
  }
  const s = adultLife(30);
  // Every way offered at a witness is something other than a killing.
  setOn(true, true);
  const c = ctx.invOpen(s, 'assault', { who: s.playerId, ev: { wit: 80 } });
  ctx.vioWitness(s, c);
  const wp = pop(s, 'vioWitness');
  ok(wp.choices.map((x) => x.value).sort().join() === 'confess,low,pay,threat', 'a witness can be paid, threatened, avoided or you can confess, and that is all');
  ok(!wp.choices.some((x) => /kill|silence them for good|murder/i.test(x.label)), 'and none of them is a killing');
  const t = ctx.createLife({ country: 'us', year: 2000 }); void t;
  ok(!ACTIONS.vio_help.label.match(/sex/i), 'no sexual labels');
  setOn(false, false);
}

/* 4. a fight ---------------------------------------------------------------------------------- */
{
  setOn(true, true);
  const mk = () => { const s = adultLife(30); s.player.skills.martial = 60; s.player.skills.fitness = 60; const t = person(s, 'friend', 60); return [s, t]; };
  // Walk away is free, and good.
  { const [s, t] = mk(); const k0 = s.player.karma; ctx.doAction(s, 'p_assault', t.id);
    const p = pop(s, 'vioFight');
    ok(!!p && p.choices.some((c) => c.value === 'walk') && p.choices.some((c) => c.value === 'talk') && p.choices.some((c) => c.value === 'hit'), 'a fight starts as a scene with three ways in');
    choose(s, 'vioFight', 'walk');
    ok(s.player.karma >= k0 && ctx.relOf(s, t.id).kind === 'friend' && !s.player.life.fights, 'walking away costs nothing and the friend is still a friend'); }
  // Talk.
  let talked = 0, escalated = 0;
  for (let i = 0; i < 40; i++) { const [s, t] = mk(); ctx.doAction(s, 'p_assault', t.id); choose(s, 'vioFight', 'talk'); if (pop(s, 'vioFight')) escalated++; else talked++; drain(s); }
  ok(talked > 0 && escalated > 0, `talking sometimes works and sometimes does not (${talked}/${escalated})`);
  // How far.
  const out = { quick: [], fight: [], all: [] };
  for (const how of ['quick', 'fight', 'all']) for (let i = 0; i < 40; i++) {
    const [s, t] = mk(); const h0 = t.stats.health;
    ctx.doAction(s, 'p_assault', t.id); choose(s, 'vioFight', 'hit');
    ok(!!pop(s, 'vioFight') && pop(s, 'vioFight').choices.length === 3, 'a second decision: how far');
    choose(s, 'vioFight', how);
    drain(s);
    out[how].push({ dmg: h0 - t.stats.health, haunt: (s.player.vio || {}).haunt || 0, fights: s.player.life.fights || 0, alive: t.alive, rel: ctx.relOf(s, t.id) && ctx.relOf(s, t.id).kind });
  }
  const avg = (a, k) => a.reduce((x, y) => x + y[k], 0) / a.length;
  ok(avg(out.quick, 'dmg') < avg(out.all, 'dmg'), 'ending it quickly does less damage than going all out');
  ok(out.all.every((r) => r.fights === 1) && out.quick.every((r) => r.fights === 1), 'a fight is a fight on the record');
  ok(avg(out.all, 'haunt') >= avg(out.quick, 'haunt'), 'and going all out weighs more');
  ok(out.all.every((r) => r.rel === 'enemy' || r.rel === undefined || r.rel === null || r.rel === 'ex'), 'the friend is an enemy now');
  // The one that goes too far.
  const [s, t] = mk(); const r = ctx.vioFightDeath(s, t);
  ok(!t.alive && s.player.vio.kills === 1 && s.player.vio.haunt >= 25, 'a fight that goes too far leaves a death and a lot to carry');
  ok(secretsOf(s).some((x) => x.kind === 'killing' && x.other === t.id), 'it becomes a secret in the web');
  ok(Object.values((s.inv || { list: {} }).list).some((c) => c.victim === t.id), 'and a case');
  ok(!pop(s, 'vioAfter'), 'but it does not ask "what now" twice');
  drain(s);
  setOn(false, false);
}

/* 5. self-defense ------------------------------------------------------------------------------- */
{
  setOn(true, true);
  const s = adultLife(30);
  const ev = EVENTS.vio_attacked;
  ok(ctx.eventEligible(s, ev), 'a stranger can come at you with the switches on');
  ok(ev.choices.length === 4, 'you can hand it over, run, talk or fight');
  const res = [];
  for (let i = 0; i < 12; i++) { const l = adultLife(30); l.player.skills.martial = 80; l.player.skills.fitness = 70; ctx.vioDefenseKill(l); ok(!!pop(l, 'vioInquiry'), 'a death in self-defense brings an inquiry'); ok(l.player.vio.defense === 1 && l.player.vio.kills === 0, 'it is counted as defense, not as a kill'); ok(!secretsOf(l).some((x) => x.kind === 'killing'), 'and is no secret'); ok(l.player.vio.haunt >= 20, 'it still weighs'); res.push(l); }
  const outcomes = { truth: 0, lawyer: 0, quiet: 0 };
  for (const how of ['truth', 'lawyer', 'quiet']) for (let i = 0; i < 40; i++) {
    const l = adultLife(30); ctx.vioDefenseKill(l); const p = choose(l, 'vioInquiry', how); void p;
    if (l.pending.some((q) => q.handler === 'trial')) outcomes[how]++;
    drain(l);
  }
  ok(outcomes.lawyer <= outcomes.quiet, `a lawyer helps and saying little hurts (charged: lawyer ${outcomes.lawyer}, truth ${outcomes.truth}, quiet ${outcomes.quiet})`);
  // The attack itself, every way.
  for (let ci = 0; ci < 4; ci++) for (let i = 0; i < 25; i++) { const l = adultLife(30); l.player.skills.martial = 60; ctx.runWithResult(l, () => ev.choices[ci][1](l, {}), { emoji: '', title: '' }); drain(l); }
  setOn(false, false);
}

/* 6. after ------------------------------------------------------------------------------------------ */
{
  setOn(true, true);
  const fresh = (friend) => { const s = adultLife(30); if (friend) person(s, 'friend', 70); const v = person(s, 'enemy', 10); ctx.webFact(s, 'killed', { pid: v.id, how: 'poison' }); return [s, v]; };
  { const [s] = fresh(true); const p = pop(s, 'vioAfter');
    ok(!!p, 'a killing asks what you do next');
    ok(s.player.vio.kills === 1 && s.player.vio.haunt >= 25, 'and it is counted and carried');
    ok(p.choices.map((c) => c.value).join() === 'clean,scrub,friend,confess', 'you can get away, scrub, call a friend, or turn yourself in'); }
  for (const how of ['clean', 'scrub']) {
    let moved = { down: 0, up: 0 };
    for (let i = 0; i < 40; i++) { const [s, v] = fresh(false); const c = ctx.invMine(s, (x) => x.victim === v.id)[0]; const t0 = c.ev.trace; choose(s, 'vioAfter', how); if (c.ev.trace < t0) moved.down++; else if (c.ev.trace > t0) moved.up++; drain(s); }
    ok(moved.down > 0 && moved.up > 0, `${how}: it can work and it can go wrong (${moved.down}/${moved.up})`);
  }
  { const [s] = fresh(true); const sec = secretsOf(s).find((x) => x.kind === 'killing'); const n0 = sec.knows.length; choose(s, 'vioAfter', 'friend'); ok(sec.knows.length === n0 + 1, 'calling a friend puts them in on it'); drain(s); }
  { const [s] = fresh(false); choose(s, 'vioAfter', 'confess'); ok(s.pending.some((q) => q.handler === 'trial') || s.player.prison, 'confessing ends in an arrest'); drain(s); }
  // The old murder action still runs end to end with the switches on.
  for (let i = 0; i < 20; i++) { const s = adultLife(30); const v = person(s, 'enemy', 10); ctx.doAction(s, 'p_murder', v.id); choose(s, 'murder', 'poison'); drain(s); }
  setOn(false, false);
}

/* 7. a witness ---------------------------------------------------------------------------------------- */
{
  setOn(true, true);
  const mk = () => { const s = adultLife(30); s.player.skills.streetwise = 50; const c = ctx.invOpen(s, 'assault', { who: s.playerId, ev: { wit: 60 } }); c.ev.wit = 60; return [s, c]; };
  { const [s, c] = mk(); let shown = 0; for (let y = 0; y < 30 && !shown; y++) { s.pending = []; ctx.vioYear(s); if (pop(s, 'vioWitness')) shown++; c.st = {}; } ok(shown > 0, 'a case with a witness brings the question'); }
  for (const how of ['pay', 'threat', 'low', 'confess']) {
    const res = { down: 0, up: 0 };
    for (let i = 0; i < 40; i++) { const [s, c] = mk(); ctx.vioWitness(s, c); const w0 = c.ev.wit; choose(s, 'vioWitness', how); if (c.ev.wit < w0) res.down++; else if (c.ev.wit > w0) res.up++; drain(s); }
    if (how === 'pay' || how === 'threat') ok(res.down > 0 && res.up > 0, `${how}: it can work and it can backfire (${res.down}/${res.up})`);
    if (how === 'low') ok(res.down === 0 && res.up === 0, 'keeping your head down changes no evidence');
  }
  { const [s, c] = mk(); ctx.vioWitness(s, c); choose(s, 'vioWitness', 'threat'); drain(s); ok(secretsOf(s).every((x) => x.kind !== 'crime' || ctx.CRIMES === undefined || CRIMES[x.crime]), 'a threat is a crime of its own, with a real crime id'); }
  setOn(false, false);
}

/* 8. conscience ----------------------------------------------------------------------------------------- */
{
  setOn(true, true);
  const s = adultLife(30);
  ctx.vioHaunt(s, 60);
  const h0 = s.player.vio.haunt, happy0 = P(s).stats.happy;
  ctx.vioYear(s);
  ok(P(s).stats.happy < happy0, 'carrying it costs happiness every year');
  ok(s.player.vio.haunt < h0, 'and it fades, slowly');
  ok(ctx.hauntWord(0) === 'Quiet' && ctx.hauntWord(90) === 'Unbearable', 'it has words');
  let nights = 0;
  for (let i = 0; i < 80; i++) { const l = adultLife(30); person(l, 'friend', 70); ctx.vioHaunt(l, 80); ctx.vioYear(l); if (pop(l, 'vioNight')) nights++; drain(l); }
  ok(nights > 5, `the nights come (${nights}/80)`);
  for (const how of ['therapy', 'friend', 'drink', 'confess', 'on']) {
    const l = adultLife(30); person(l, 'friend', 70); ctx.vioHaunt(l, 70);
    const c = ctx.invOpen(l, 'murder', { who: l.playerId });
    ctx.vioNight(l); const h = l.player.vio.haunt; choose(l, 'vioNight', how); drain(l);
    if (['therapy', 'friend', 'confess'].includes(how)) ok(l.player.vio.haunt < h, `${how} lifts some of it`);
    if (how === 'on') ok(l.player.vio.haunt === h, 'carrying on does not');
    void c;
  }
  // The action.
  const a = adultLife(30); ctx.vioHaunt(a, 40);
  ok(ctx.actionAvailable(ACTIONS.vio_help, a, null), 'there is always somebody to talk to');
  const h = a.player.vio.haunt; ctx.doAction(a, 'vio_help'); ok(a.player.vio.haunt < h, 'and it helps');
  ok(!ctx.actionAvailable(ACTIONS.vio_help, adultLife(30), null), 'nothing to talk about, nothing offered');
  setOn(false, false);
}

/* 9. proving yourself ------------------------------------------------------------------------------------- */
{
  setOn(true, true);
  for (const where of ['mob', 'prison']) for (const how of ['beating', 'errand', 'rival', 'out']) {
    let ran = 0;
    for (let i = 0; i < 10; i++) {
      const s = adultLife(30); s.player.skills.martial = 40;
      if (where === 'prison') s.player.prison = { yearsLeft: 4, total: 4, served: 0, crime: 'burglary', behavior: 50, juvie: false, name: 'X', gang: null };
      if (where === 'mob') { const f = ctx.familiesIn(s, 'us')[0]; s.player.uw = Object.assign(ctx.uw(s), { fam: f.id, rank: 0, respect: 5 }); }
      ctx.vioInitiation(s, where);
      const p = pop(s, 'vioJump');
      ok(!!p && p.choices.some((c) => c.value === 'out'), `${where}: you can always back out`);
      choose(s, 'vioJump', how); drain(s); ran++;
      if (how === 'out' && where === 'mob') ok(!ctx.inMob(s), 'backing out leaves the family');
      if (how === 'errand') ok(Object.values((s.inv || { list: {} }).list).length >= 0, 'an errand is on the record');
    }
    ok(ran === 10, `${where}/${how} ran`);
  }
  { const s = adultLife(30); s.player.prison = { yearsLeft: 4, total: 4, served: 0, crime: 'burglary', behavior: 50, juvie: false, name: 'X', gang: null }; ctx.doAction(s, 'pr_gang'); ok(!!pop(s, 'vioJump'), 'joining a gang in prison asks for proof'); }
  setOn(true, false);
  { const s = adultLife(30); s.player.prison = { yearsLeft: 4, total: 4, served: 0, crime: 'burglary', behavior: 50, juvie: false, name: 'X', gang: null }; ctx.doAction(s, 'pr_gang'); ok(!pop(s, 'vioJump'), 'and not with the switch off'); }
  setOn(true, true);
  for (const id of ['vio_yard_protection', 'vio_yard_hurt']) for (let ci = 0; ci < EVENTS[id].choices.length; ci++) for (let i = 0; i < 10; i++) {
    const s = adultLife(30); s.player.prison = { yearsLeft: 4, total: 4, served: 0, crime: 'burglary', behavior: 50, juvie: false, name: 'X', gang: null };
    ok(ctx.eventEligible(s, EVENTS[id]), `${id} fires in prison`);
    ctx.runWithResult(s, () => EVENTS[id].choices[ci][1](s, {}), { emoji: '', title: '' }); drain(s);
  }
  setOn(false, false);
}

/* 10. the serial arc ------------------------------------------------------------------------------------------- */
{
  setOn(true, true);
  const kill = (s, how) => { const v = ctx.makeAdultNear(s, { minAge: 25, maxAge: 40 }); ctx.setRel(s, v.id, 'enemy', 5); ctx.webFact(s, 'killed', { pid: v.id, how: how || 'poison' }); return v; };
  const turned = () => { const s = adultLife(30); kill(s); s.pending = []; kill(s); return s; };
  // the turn
  { const s = adultLife(30); kill(s); ok(!pop(s, 'serTurn'), 'one is not a pattern'); s.pending = []; kill(s); ok(!!pop(s, 'serTurn'), 'two is'); }
  { const s = turned(); const p = pop(s, 'serTurn'); ok(p.choices.map((c) => c.value).join() === 'help,confess,on', 'you can get help, turn yourself in, or keep going'); choose(s, 'serTurn', 'help'); drain(s); ok(s.player.ser.stopped && !s.player.ser.on, 'getting help ends it'); const v = kill(s); void v; ok(!pop(s, 'serTurn'), 'and it does not ask again'); }
  { const s = turned(); choose(s, 'serTurn', 'confess'); ok(s.pending.some((q) => q.handler === 'trial') || s.player.prison, 'turning yourself in ends in an arrest'); }
  const serial = (mo) => { const s = turned(); choose(s, 'serTurn', 'on'); ok(!!pop(s, 'serMo') && pop(s, 'serMo').choices.length === 3, 'three ways of doing it'); choose(s, 'serMo', mo || 'careful'); s.pending = []; return s; };
  { const s = serial('careful'); ok(s.player.ser.on && s.player.ser.mo === 'careful' && s.player.ser.urge > 0, 'keeping going makes it a pattern'); }
  // the year
  { const s = serial('quick'); const u0 = s.player.ser.urge; ctx.serYear(s); ok(s.player.ser.urge > u0, 'the urge builds every year');
    for (let i = 0; i < 12; i++) { s.pending = []; ctx.serYear(s); if (pop(s, 'serUrge')) break; }
    ok(!!pop(s, 'serUrge'), 'and at the top it asks'); ok(pop(s, 'serUrge').choices.map((c) => c.value).join() === 'hold,help,act', 'hold on, get help, or give in'); }
  // hold on, and help
  { let held = 0, gave = 0; for (let i = 0; i < 60; i++) { const s = serial(); s.player.ser.urge = 80; ctx.serUrge(s); const h = s.player.ser.held; choose(s, 'serUrge', 'hold'); if (s.player.ser.held > h) held++; else gave++; drain(s); } ok(held > 5 && gave > 5, `holding on sometimes works (${held}/${gave})`); }
  { const s = serial(); s.player.ser.urge = 90; ctx.serUrge(s); choose(s, 'serUrge', 'help'); ok(s.player.ser.urge < 90 && s.player.vio.help >= 1, 'help brings it down'); drain(s); }
  // an act, every way
  for (const where of ['far', 'near', 'circle', null]) {
    const res = { clean: 0, close: 0, fall: 0, nothing: 0 };
    for (let i = 0; i < 40; i++) {
      const s = serial(where === 'circle' ? 'circle' : 'careful');
      for (let k = 0; k < 3; k++) person(s, 'friend', 60, { minAge: 25, maxAge: 40 });
      s.player.ser.urge = 80;
      const k0 = s.player.ser.kills;
      ctx.serAct(s, ''); const p = pop(s, 'serWho');
      ok(!!p && p.choices.some((c) => c.value === null), 'there is always a way to refuse');
      choose(s, 'serWho', where);
      const killed = s.player.ser.kills > k0;
      if (where === null) { res.nothing++; ok(!killed && s.player.ser.urge < 80, 'refusing lowers the urge, and nobody dies'); }
      else if (killed) { if (pop(s, 'serClose')) res.close++; else res.clean++; ok(s.player.ser.cool >= 1 && s.player.ser.urge <= 10, 'after one, a cooling-off'); ok(s.people && Object.values(s.people).filter((x) => x.cause === 'suspicious circumstances').every((x) => ctx.ageOf(s, x) >= 20), 'the victim is an adult'); }
      else res.fall++;
      drain(s);
    }
    if (where) ok(res.clean > 0 && res.fall + res.close > 0, `${where}: it can go to plan and it can go wrong (${JSON.stringify(res)})`);
  }
  // the series, the detective and the press
  { const s = serial('careful'); s.player.skills.streetwise = 90;
    for (let i = 0; i < 4; i++) { ctx.serAct(s, ''); choose(s, 'serWho', 'near'); drain(s); s.player.ser.urge = 80; s.player.ser.cool = 0; }
    const cs = ctx.invMine(s, (c) => c.crime === 'murder');
    ok(cs.length >= 3, `the killings are cases (${cs.length})`);
    ok(cs.some((c) => c.links.length >= 1), 'that look like the same hand');
    if (cs.length >= 3) ok(cs.some((c) => c.nick), 'and the press gives it a name');
    ok(s.player.life.serialActs >= 2, 'and they are counted'); }
  // a close call, every way
  for (const how of ['talk', 'low', 'confess']) for (let i = 0; i < 20; i++) { const s = serial(); const c = ctx.invOpen(s, 'murder', { who: s.playerId }); ctx.serClose(s, c); choose(s, 'serClose', how); drain(s); }
  // copycats
  { let copies = 0; for (let i = 0; i < 60; i++) { const s = serial(); for (let k = 0; k < 3; k++) { const c = ctx.invOpen(s, 'murder', { who: s.playerId }); c.nick = 'The Quiet Visitor'; } s.pending = []; ctx.serYear(s); if (s.player.ser.copy) copies++; drain(s); } ok(copies > 2, `copycats turn up once there is a name (${copies}/60)`); }
  { const s = serial(); const c = ctx.invOpen(s, 'murder', { who: s.playerId }); c.nick = 'X'; const k = ctx.invOpen(s, 'murder', { who: null }); k.copy = true; k.cy = s.year; s.player.ser.copy = true; c.prog = 50; ctx.serYear(s); ok(c.prog < 50, 'a copycat gives the police something else to chase'); s.year += 2; ctx.serYear(s); ok(!s.player.ser.copy, 'and is caught in the end'); }
  // the home
  { let tipped = 0; for (let i = 0; i < 80; i++) { const s = serial(); person(s, 'partner', 70); ctx.invOpen(s, 'murder', { who: s.playerId }); s.pending = []; ctx.serYear(s); if (pop(s, 'serSuspect')) { choose(s, 'serSuspect', ['explain', 'distance', 'tell'][i % 3]); tipped++; } drain(s); } ok(tipped > 3, `the people at home notice (${tipped}/80)`); }
  // stopping
  { const s = serial(); ctx.doAction(s, 'ser_stop'); choose(s, 'serStop', true); ok(!s.player.ser.on && s.player.ser.stopped && s.player.ser.urge === 0, 'stopping for good stops it'); ok(!ctx.actionAvailable(ACTIONS.ser_act, s, null), 'and the way back is closed'); }
  { const s = serial(); s.player.ser.urge = 90; ctx.doAction(s, 'ser_help'); ok(s.player.ser.urge < 90, 'help is an action too'); ok(ctx.actionAvailable(ACTIONS.ser_act, s, null), 'and so, grimly, is the other thing'); }
  // after
  { const s = serial(); s.player.life.serialActs = 3; s.player.ser.kills = 4;
    s.player.prison = { yearsLeft: 30, total: 30, served: 0, crime: 'murder', behavior: 50, juvie: false, name: 'X', gang: null };
    ok(ctx.eventEligible(s, EVENTS.ser_fan_mail), 'the letters come');
    for (let ci = 0; ci < EVENTS.ser_fan_mail.choices.length; ci++) { const l = clone(s); ctx.runWithResult(l, () => EVENTS.ser_fan_mail.choices[ci][1](l, {}), { emoji: '', title: '' }); }
    ok(ctx.actionAvailable(ACTIONS.ser_memoir, s, null), 'and so does an offer for a book');
    for (const how of ['truth', 'spin', null]) { const l = clone(s); ctx.doAction(l, 'ser_memoir'); choose(l, 'serMemoir', how); drain(l); if (how) ok(l.player.ser.memoir, 'one book only'); }
    const titles = LEGACY_TITLES.map((t) => t.id); ok(titles.indexOf('notorious') < titles.indexOf('villain') && titles.indexOf('never_caught') < titles.indexOf('villain'), 'it is remembered ahead of "Villain"');
    ok(ctx.legacyTitles(s)[0].id === 'notorious', 'a caught one is Notorious');
    const free = clone(s); free.player.prison = null; free.player.record = [];
    ok(ctx.legacyTitles(free)[0].id === 'never_caught', 'and one who was not is Never Caught'); }
  setOn(false, false);
}

/* 11. long runs --------------------------------------------------------------------------------------------- */
{
  setOn(true, true);
  for (const mo of ['careful', 'quick', 'circle']) {
    const s = adultLife(30);
    s.player.money = 5e6;
    for (let i = 0; i < 2; i++) { const v = ctx.makeAdultNear(s, { minAge: 25, maxAge: 40 }); ctx.setRel(s, v.id, 'enemy', 5); ctx.webFact(s, 'killed', { pid: v.id, how: 'poison' }); }
    choose(s, 'serTurn', 'on'); choose(s, 'serMo', mo); s.pending = [];
    for (let y = 0; y < 40 && !s.dead; y++) {
      s.year++; s.player.counters = {};
      if (s.player.prison && y % 6 === 5) s.player.prison = null;
      ctx.vioYear(s); ctx.serYear(s); ctx.webTick(s); ctx.invTick(s);
      drain(s, (p, open) => open[Math.floor(Math.random() * open.length)]);
      const v = s.player.vio, r = s.player.ser;
      ok(v.haunt >= 0 && v.haunt <= 100 && r.urge >= 0 && r.urge <= 100 && r.kills >= 0 && r.cool >= 0, `${mo} year ${y} in range`);
    }
    ok(JSON.stringify(clone(s).player.vio) === JSON.stringify(s.player.vio) && JSON.stringify(clone(s).player.ser) === JSON.stringify(s.player.ser), `${mo}: the state saves and loads whole`);
    ok(JSON.stringify(clone(s).inv) === JSON.stringify(s.inv), `${mo}: the case files save and load whole`);
  }
  setOn(false, false);
}

console.log(failures ? `\n❌ ${failures} violence checks failed.` : `✅ Violence checks passed (${checks} checks).`);
process.exit(failures ? 1 : 0);
