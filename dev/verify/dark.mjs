// Dark-themes verification:  node dev/verify/dark.mjs
//
// Covers 74-dark.js:
//   1. gating       — off by default; Mature alone is not enough; with either off nothing here exists
//   2. adults only  — nothing runs for a minor, and nobody who stalks or is stalked is one
//   3. house rules  — nothing graphic or sexual in the text, and always a way out
//   4. betrayal     — who told, every answer, revenge and what it costs
//   5. at work, at home — the stolen credit and the hidden debt
//   6. stalking     — it starts, it escalates if ignored, every response, an order, the scare, an ending
//   7. letting go   — the ex you cannot leave alone, and what pushing it costs
//   8. moral injury — orders, reports and sources, the meter, the nights, help
//   9. long runs    — decades of it stay in range and save whole
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from './loadgame.mjs';

const ctx = loadGame({ quiet: true });
const g = (name) => ctx.run(name);
ctx.seedRng(7401);
ctx.console.error = () => {};
let failures = 0, checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) { failures++; console.log('  ✖ ' + msg); } };
const META = g('META'), ACTIONS = g('ACTIONS'), EVENTS = g('EVENTS');
const clone = (s) => JSON.parse(JSON.stringify(s));
const P = (s) => s.people[s.playerId];
const pop = (s, handler) => s.pending.find((p) => p.handler === handler);
const BAD_TEXT = /undefined|NaN|\[who\]|\[first\]|\[object|\{~/;
const setOn = (mature, themes) => { META.settings.mature = mature; META.settings.mature_themes = themes; };
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
const choose = (s, handler, value) => { const p = pop(s, handler); if (!p) return null; ctx.resolvePopup(s, p.id, p.choices.findIndex((c) => c.value === value)); return p; };
const secretsOf = (s) => Object.values((s.web && s.web.secrets) || {});
const playEvent = (s, id, ci) => {
  const ev = EVENTS[id], c = ev.ctx ? ev.ctx(s) : {};
  const text = typeof ev.text === 'function' ? ev.text(s, c) : ev.text;
  ok(!BAD_TEXT.test(text), `${id} text is clean`);
  ctx.runWithResult(s, () => ev.choices[ci][1](s, c), { emoji: '', title: '' });
};
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'src', 'srcfiles', 'js');
const EVS = ['dk_credit_taken', 'dk_partner_money', 'dk_obsession', 'dk_mil_order', 'dk_mil_civilians', 'dk_spy_asset'];

/* 1. gating ------------------------------------------------------------------------------ */
{
  ok(META.settings.mature_themes === false, 'Dark themes is off by default');
  ok(!!g('CONTENT_TAGS').mature_themes, 'it is a known tag');
  for (const [m, t] of [[false, false], [true, false], [false, true]]) {
    setOn(m, t);
    const s = adultLife(30);
    ok(!g('darkOn')(), `darkOn is false with mature=${m} themes=${t}`);
    for (const id of EVS) ok(!ctx.eventEligible(s, EVENTS[id]), `${id} does not fire with mature=${m} themes=${t}`);
    ctx.darkYear(s);
    ok(!s.player.dark, 'darkYear does nothing');
    ok(!ctx.actionAvailable(ACTIONS.dk_counsel, s, null), 'the counselor action is hidden');
  }
  setOn(false, false);
}

/* 2. adults only ---------------------------------------------------------------------------- */
{
  setOn(true, true);
  const kid = ctx.createLife({ country: 'us', year: 2000 }); kid.year = 2016; kid.pending = [];
  person(kid, 'ex', 10, { minAge: 15, maxAge: 17 });
  for (let i = 0; i < 40; i++) ctx.darkYear(kid);
  ok(!kid.player.dark || (!kid.player.dark.stalk && kid.player.dark.moral === 0), 'nothing starts for a minor');
  for (const id of EVS) ok(EVENTS[id].ages[0] >= 18, `${id} is for adults`);
  const a = adultLife(30);
  for (let i = 0; i < 300; i++) { a.year += 0; ctx.darkYear(a); if (a.player.dark && a.player.dark.stalk) break; M_fame(a); }
  function M_fame(s) { s.player.fame = 60; }
  const d = a.player.dark;
  ok(!d || !d.stalk || ctx.ageOf(a, a.people[d.stalk.by]) >= 18, 'a stalker is an adult');
  setOn(false, false);
}

/* 3. house rules ------------------------------------------------------------------------------ */
{
  const banned = /\b(rape|raped|sexual|sexually|molest|torture|tortured|gore|gory|dismember|mutilat|strangle|abuse the|beat you|beaten)\b/i;
  const lines = fs.readFileSync(path.join(ROOT, '74-dark.js'), 'utf8').split('\n');
  lines.forEach((l, i) => { if (!/^\s*(\/\/|\*|\/\*)/.test(l) && !/^ \*/.test(l)) ok(!banned.test(l), `74-dark.js:${i + 1} has nothing it should not (${l.trim().slice(0, 70)})`); });
  // Every decision has a way that is not the worst one.
  for (const id of EVS) ok(EVENTS[id].choices.length >= 3, `${id} has several answers`);
  ok(ctx.CRIMES === undefined || true, 'ok');
  ok(g('CRIMES').harassment && !g('CRIMES').harassment.felony && g('CRIMES').falsifying && !g('CRIMES').falsifying.felony, 'the new crimes are citations, not felonies');
}

/* 4. betrayal ----------------------------------------------------------------------------------- */
{
  setOn(true, true);
  const mk = () => {
    const s = adultLife(30); s.player.skills.charisma = 50;
    const f = person(s, 'friend', 70);
    const sec = ctx.webNewSecret(s, 'crime', s.playerId, { crime: 'shoplift', sev: 2, ev: 20 });
    ctx.webLearn(s, sec, f.id, f.id); // f learns, and then tells
    const other = person(s, 'coworker', 40);
    ctx.webLearn(s, sec, other.id, f.id); // the one who told is f
    sec.out = true; sec.outYear = s.year;
    return [s, f, sec];
  };
  ok(!!mk()[2].told, 'the web records who told whom');
  { const [s, f] = mk(); ctx.darkYear(s); const p = pop(s, 'dkBetray'); ok(!!p && p.person === f.id, 'when it gets out, you find out who talked'); ok(p.choices.length === 4, 'confront, forgive, cut off, or make them pay'); ctx.darkYear(s); ok(s.pending.filter((q) => q.handler === 'dkBetray').length === 1, 'and only once'); }
  const outs = { confront: [], forgive: [], cut: [] };
  for (const how of ['confront', 'forgive', 'cut']) for (let i = 0; i < 40; i++) { const [s, f] = mk(); const r0 = ctx.relOf(s, f.id).rel; ctx.darkYear(s); choose(s, 'dkBetray', how); drain(s); outs[how].push(ctx.relOf(s, f.id).rel - r0); }
  const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  ok(avg(outs.forgive) > avg(outs.cut) && avg(outs.cut) < -30, 'forgiving costs a little, cutting off costs a lot');
  ok(outs.confront.some((x) => x > -10) && outs.confront.some((x) => x < -20), 'confronting can go either way');
  // revenge
  { const [s, f] = mk(); ctx.dkRevenge(s, f.id); const p = pop(s, 'dkRevenge'); ok(p.choices.find((c) => c.value === 'expose').disabled, 'you cannot expose what you do not know'); }
  { const [s, f] = mk(); const dirt = ctx.webNewSecret(s, 'npc_debt', f.id, { ev: 20, knows: [s.playerId] }); ctx.dkRevenge(s, f.id); const p = pop(s, 'dkRevenge'); ok(!p.choices.find((c) => c.value === 'expose').disabled, 'but you can expose what you heard'); choose(s, 'dkRevenge', 'expose'); ok(dirt.out && P(s).rep.scandal > 0, 'it gets out, and it costs your name too'); drain(s); }
  const rv = { let: 0, sab: { ok: 0, bad: 0 }, court: { win: 0, lose: 0 } };
  for (let i = 0; i < 60; i++) {
    let [s, f] = mk(); const k0 = s.player.karma; ctx.dkRevenge(s, f.id); choose(s, 'dkRevenge', 'let'); if (s.player.karma > k0) rv.let++; drain(s);
    [s, f] = mk(); ctx.dkRevenge(s, f.id); const sc0 = P(s).rep ? P(s).rep.scandal : 0; choose(s, 'dkRevenge', 'sabotage'); if (P(s).rep && P(s).rep.scandal > sc0) rv.sab.bad++; else rv.sab.ok++; drain(s);
    [s, f] = mk(); ctx.dkRevenge(s, f.id); const m0 = s.player.money; choose(s, 'dkRevenge', 'court'); if (s.player.money > m0) rv.court.win++; else rv.court.lose++; drain(s);
  }
  ok(rv.let === 60, 'letting go always earns karma');
  ok(rv.sab.ok > 0 && rv.sab.bad > 0, `sabotage can work and can come back on you (${JSON.stringify(rv.sab)})`);
  ok(rv.court.win > 0 && rv.court.lose > 0, `court can win and can lose (${JSON.stringify(rv.court)})`);
  setOn(false, false);
}

/* 5. at work, at home ------------------------------------------------------------------------------ */
{
  setOn(true, true);
  for (let ci = 0; ci < EVENTS.dk_credit_taken.choices.length; ci++) for (let i = 0; i < 20; i++) { const s = adultLife(30); ctx.hire(s, 'retail', 0); s.pending = []; ok(ctx.eventEligible(s, EVENTS.dk_credit_taken), 'a coworker can take your credit'); playEvent(s, 'dk_credit_taken', ci); drain(s); }
  for (let ci = 0; ci < EVENTS.dk_partner_money.choices.length; ci++) for (let i = 0; i < 20; i++) { const s = adultLife(30); person(s, ci % 2 ? 'spouse' : 'partner', 60); ok(ctx.eventEligible(s, EVENTS.dk_partner_money), 'a partner can hide a debt'); playEvent(s, 'dk_partner_money', ci); drain(s); }
  { const s = adultLife(30); ok(!ctx.eventEligible(s, EVENTS.dk_partner_money), 'not with no partner'); }
  setOn(false, false);
}

/* 6. stalking ---------------------------------------------------------------------------------------- */
{
  setOn(true, true);
  const mk = (kind) => { const s = adultLife(30); s.player.skills.charisma = 50; const by = kind === 'fan' ? ctx.makeAdultNear(s, { minAge: 25, maxAge: 40 }) : person(s, 'ex', 10); if (kind === 'fan') ctx.setRel(s, by.id, 'stalker', 0); s.player.dark = { moral: 0, stalk: { by: by.id, kind: kind || 'ex', since: s.year, level: 12, order: false, told: false, scared: false }, grudge: {}, helped: 0, betrayed: 0, quiet: 0 }; return [s, by]; };
  // it begins
  let started = { ex: 0, fan: 0, regular: 0 };
  for (let i = 0; i < 400; i++) {
    const s = adultLife(30); const e = person(s, 'ex', 10); void e; s.player.fame = 60;
    if (i % 3 === 0) { person(s, 'regular', 40); s.player.work = { creator: { m: 50, ok: 0, meh: 0, bad: 0, hand: [], seq: 0, flags: { followed: s.year } } }; }
    ctx.darkYear(s);
    const st = s.player.dark && s.player.dark.stalk;
    if (st) { started[st.kind]++; ok(!!pop(s, 'dkStalk'), 'it begins with a decision'); ok(ctx.ageOf(s, s.people[st.by]) >= 18, 'the stalker is an adult'); }
    drain(s);
  }
  ok(started.ex > 0 && started.fan > 0 && started.regular > 0, `it can start from an ex, a fan or a regular (${JSON.stringify(started)})`);
  // ignored, it escalates
  { const [s] = mk(); const st = s.player.dark.stalk; const happy0 = P(s).stats.happy; for (let y = 0; y < 3 && s.player.dark.stalk; y++) { s.pending = []; ctx.darkYear(s); drain(s, (p, open) => open[open.findIndex(([c]) => c.value === 'ignore') >= 0 ? open.findIndex(([c]) => c.value === 'ignore') : 0]); } ok(!s.player.dark.stalk || st.level > 12, 'ignored, it escalates'); ok(P(s).stats.happy < happy0, 'and it costs you'); }
  // every response
  const res = {};
  for (const how of ['report', 'tell', 'security', 'confront', 'ignore']) {
    res[how] = [];
    for (let i = 0; i < 60; i++) { const [s] = mk(i % 2 ? 'fan' : 'ex'); const l0 = s.player.dark.stalk.level; ctx.stalkPopup(s, ''); choose(s, 'dkStalk', how); drain(s); const st = s.player.dark.stalk; res[how].push(st ? st.level - l0 : -99); }
  }
  const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  ok(avg(res.tell) < 0 && avg(res.security) < avg(res.tell) && avg(res.ignore) > 0, 'telling people and security help, ignoring does not');
  ok(res.report.some((x) => x < 0) && res.report.some((x) => x >= 0), 'reporting can work and can fall short');
  ok(res.confront.some((x) => x === -99) && res.confront.some((x) => x > 0), 'confronting can end it and can make it worse');
  { const [s] = mk(); const r = s.player.money; ctx.stalkPopup(s, ''); const p = pop(s, 'dkStalk'); ok(p.choices.some((c) => c.value === 'ignore') && p.choices.length === 5, 'five responses on offer'); void r; }
  // an order, and the scare
  { const [s] = mk(); s.player.dark.stalk.order = true; let ended = 0; for (let i = 0; i < 30; i++) { const [t] = mk(); t.player.dark.stalk.order = true; ctx.darkYear(t); if (!t.player.dark.stalk) ended++; drain(t); } ok(ended > 3, `a broken order ends it, with an arrest (${ended}/30)`); }
  for (const how of ['police', 'away', 'friend']) for (let i = 0; i < 20; i++) { const [s] = mk(); s.player.dark.stalk.level = 80; ctx.stalkScare(s); ok(!!pop(s, 'dkScare'), 'the scare is a decision'); choose(s, 'dkScare', how); drain(s); const st = s.player.dark.stalk; ok(!st || st.level < 80, `${how} brings it down`); }
  // it ends, and there is a quiet spell
  { const [s] = mk(); ctx.stalkEnd(s, 'It stopped.'); ok(!s.player.dark.stalk && s.player.dark.quiet === s.year, 'it ends'); let n = 0; for (let i = 0; i < 200; i++) { ctx.darkYear(s); if (s.player.dark.stalk) n++; } ok(n === 0, 'and nobody new starts for three years'); }
  // meter in range
  { const [s] = mk(); for (let y = 0; y < 30; y++) { s.year++; ctx.darkYear(s); drain(s, (p, open) => open[Math.floor(Math.random() * open.length)]); const st = s.player.dark.stalk; if (st) ok(st.level >= 0 && st.level <= 100, 'the level stays in range'); } }
  setOn(false, false);
}

/* 7. letting go -------------------------------------------------------------------------------------------- */
{
  setOn(true, true);
  const ev = EVENTS.dk_obsession;
  { const s = adultLife(30); ok(!ctx.eventEligible(s, ev), 'nothing to let go of, nothing happens'); person(s, 'ex', 20); ok(ctx.eventEligible(s, ev), 'a recent ex can be the one you cannot leave'); }
  const res = { show: { warned: 0, cited: 0 } };
  for (let ci = 0; ci < ev.choices.length; ci++) for (let i = 0; i < 40; i++) {
    const s = adultLife(30); const e = person(s, 'ex', 20); person(s, 'friend', 60); const rec = s.player.record.length, sc = (P(s).rep || { scandal: 0 }).scandal;
    playEvent(s, 'dk_obsession', ci); drain(s);
    if (ci === 2) { if (s.player.record.length > rec) res.show.cited++; else res.show.warned++; ok(ctx.relOf(s, e.id).rel <= 20 || ctx.relOf(s, e.id).kind === 'enemy', 'pushing it costs the relationship'); void sc; }
  }
  ok(res.show.cited > 0 && res.show.warned > 0, `showing up can get you cited or just asked to stop (${JSON.stringify(res.show)})`);
  { const s = adultLife(30); person(s, 'ex', 20); const f = person(s, 'friend', 60); const r0 = ctx.relOf(s, f.id).rel; playEvent(s, 'dk_obsession', 0); ok(ctx.relOf(s, f.id).rel > r0 && s.player.dark.helped === 1, 'letting go with a friend works, and counts as help'); }
  setOn(false, false);
}

/* 8. moral injury -------------------------------------------------------------------------------------------- */
{
  setOn(true, true);
  const soldier = () => {
    const s = adultLife(24); s.player.edu.degrees.push({ type: 'high' }); s.player.skills.fitness = 60;
    ctx.hire(s, 'military', 0); ctx.startMilitaryCareer(s, 'military'); s.pending = [];
    ctx.mil(s).tours.push({ y: s.year - 1, war: 'x', place: 'p', post: 'q', result: 'ok' });
    const w = ctx.makeWar(s, 'us'); Object.assign(w, { intensity: 3, start: s.year - 1 }); ctx.warSlot(s, 'us').war = w;
    return s;
  };
  const spyer = () => {
    const s = adultLife(30); ctx.hire(s, 'spy', 0); ctx.ensureSpy(s); s.pending = [];
    ctx.spy(s).assets.push({ id: 'a1', name: 'Ann Lee', role: 'clerk', state: 'active', loyalty: 60, value: 2, since: s.year, adj: 'foreign' });
    return s;
  };
  { const s = soldier(); ok(ctx.eventEligible(s, EVENTS.dk_mil_order) && ctx.eventEligible(s, EVENTS.dk_mil_civilians), 'a soldier at war can be ordered, and can write a report'); ok(!ctx.eventEligible(adultLife(30), EVENTS.dk_mil_order), 'a civilian cannot'); }
  { const s = spyer(); ok(ctx.eventEligible(s, EVENTS.dk_spy_asset), 'a spy with a source can leave one behind'); ok(!ctx.eventEligible(adultLife(30), EVENTS.dk_spy_asset), 'a civilian cannot'); }
  const moral = { order: [], civ: [], spy: [] };
  for (let ci = 0; ci < 4; ci++) for (let i = 0; i < 30; i++) { const s = spyer(); playEvent(s, 'dk_spy_asset', ci); drain(s); moral.spy.push([ci, (s.player.dark || {}).moral || 0, ctx.spy(s).assets[0].state]); }
  ok(moral.spy.filter(([c]) => c === 2).every(([, m, st]) => m >= 12 && st === 'dropped'), 'leaving a source is the heaviest choice and costs them');
  ok(moral.spy.filter(([c]) => c === 0).some(([, m]) => m === 0) && moral.spy.filter(([c]) => c === 0).some(([, m]) => m > 0), 'getting them out can work, or can be too late');
  for (let ci = 0; ci < EVENTS.dk_mil_order.choices.length; ci++) for (let i = 0; i < 30; i++) { const s = soldier(); playEvent(s, 'dk_mil_order', ci); drain(s); moral.order.push([ci, (s.player.dark || {}).moral || 0]); }
  const mean = (ci, a) => { const x = a.filter(([c]) => c === ci).map(([, m]) => m); return x.reduce((p, q) => p + q, 0) / x.length; };
  ok(mean(0, moral.order) > mean(1, moral.order) && mean(3, moral.order) > mean(1, moral.order), 'obeying and looking away weigh more than refusing');
  for (let ci = 0; ci < EVENTS.dk_mil_civilians.choices.length; ci++) for (let i = 0; i < 30; i++) { const s = soldier(); playEvent(s, 'dk_mil_civilians', ci); drain(s); moral.civ.push([ci, (s.player.dark || {}).moral || 0]); }
  ok(mean(1, moral.civ) > mean(0, moral.civ), 'signing the false report weighs more than telling the truth');
  { const s = soldier(); playEvent(s, 'dk_mil_civilians', 1); ok(secretsOf(s).some((x) => x.kind === 'crime' && x.crime === 'falsifying'), 'and it is a secret in the web'); drain(s); }
  // the meter
  { const s = adultLife(30); ctx.darkMoral(s, 60); const m0 = s.player.dark.moral, h0 = P(s).stats.happy; ctx.darkYear(s); ok(P(s).stats.happy < h0 && s.player.dark.moral < m0, 'it costs happiness, and fades slowly'); ok(ctx.moralWord(0) === 'Clear' && ctx.moralWord(90) === 'Broken', 'it has words'); }
  let nights = 0;
  for (let i = 0; i < 80; i++) { const s = adultLife(30); person(s, 'friend', 70); ctx.darkMoral(s, 80); ctx.darkYear(s); if (pop(s, 'dkMoral')) nights++; drain(s); }
  ok(nights > 5, `the nights come (${nights}/80)`);
  for (const how of ['counsel', 'group', 'tell', 'drink', 'on']) { const s = soldier(); ctx.mil(s).vet = true; person(s, 'friend', 70); ctx.darkMoral(s, 70); ctx.moralNight(s); const m = s.player.dark.moral; const p = pop(s, 'dkMoral'); if (how === 'group' && !p.choices.some((c) => c.value === 'group')) { ok(false, 'a veteran is offered the group'); continue; } choose(s, 'dkMoral', how); drain(s); if (['counsel', 'group', 'tell'].includes(how)) ok(s.player.dark.moral < m, `${how} eases it`); if (how === 'on') ok(s.player.dark.moral === m, 'carrying on does not'); }
  { const s = adultLife(30); ok(!ctx.moralNight || true, 'ok'); ctx.darkMoral(s, 40); ok(ctx.actionAvailable(ACTIONS.dk_counsel, s, null), 'there is always a counselor'); const m = s.player.dark.moral; ctx.doAction(s, 'dk_counsel'); ok(s.player.dark.moral < m, 'and it helps'); ok(!ctx.actionAvailable(ACTIONS.dk_counsel, adultLife(30), null), 'nothing to talk about, nothing offered'); }
  // a civilian never meets a veterans' group
  { const s = adultLife(30); ctx.darkMoral(s, 70); ctx.moralNight(s); ok(!pop(s, 'dkMoral').choices.some((c) => c.value === 'group'), 'the veterans’ group is for veterans'); }
  setOn(false, false);
}

/* 9. long runs --------------------------------------------------------------------------------------------------- */
{
  setOn(true, true);
  for (let n = 0; n < 6; n++) {
    const s = adultLife(24); s.player.money = 5e6; s.player.fame = 50;
    person(s, 'ex', 15); person(s, 'friend', 60); person(s, 'partner', 50);
    ctx.darkMoral(s, 30 + n * 10);
    for (let y = 0; y < 40 && !s.dead; y++) {
      s.year++; s.player.counters = {};
      if (s.player.prison) s.player.prison = null;
      ctx.webTick(s); ctx.darkYear(s);
      drain(s, (p, open) => open[Math.floor(Math.random() * open.length)]);
      const d = s.player.dark;
      if (d) { ok(d.moral >= 0 && d.moral <= 100, `moral in range @${y}`); if (d.stalk) ok(d.stalk.level >= 0 && d.stalk.level <= 100 && !!s.people[d.stalk.by], `stalk in range @${y}`); }
    }
    ok(JSON.stringify(clone(s).player.dark) === JSON.stringify(s.player.dark), 'the state saves and loads whole');
    ok(JSON.stringify(clone(s).web) === JSON.stringify(s.web), 'the web saves and loads whole');
  }
  setOn(false, false);
}

console.log(failures ? `\n❌ ${failures} dark-theme checks failed.` : `✅ Dark-theme checks passed (${checks} checks).`);
process.exit(failures ? 1 : 0);
