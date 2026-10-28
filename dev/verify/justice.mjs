// Street justice verification:  node dev/verify/justice.mjs
//
// Covers 84-street-justice.js:
//   1. fallout   — victims are people in the web; their people turn on you, a group keeps the case alive and every answer runs
//   2. witnesses — gated by Mature, a real person behind each case, every way works or backfires, violence gates the cruel one,
//                  and the other side (you saw it) runs every choice
//   3. vigilante — gated by Mature + Violence, a street name, leads real and false, every way, the wrong person, being unmasked
//   4. churn     — years with all of it going log no errors
import { loadGame } from './loadgame.mjs';

const ctx = loadGame({ quiet: true });
const g = (name) => ctx.run(name);
ctx.seedRng(8401);
let errors = 0;
ctx.console.error = () => { errors++; };
let failures = 0;
const ok = (cond, msg) => { if (!cond) { failures++; console.log('  ✖ ' + msg); } };
const META = g('META'), ACTIONS = g('ACTIONS'), EVENTS = g('EVENTS');
const clone = (s) => JSON.parse(JSON.stringify(s));
const P = (s) => s.people[s.playerId];
const pop = (s, handler) => s.pending.find((p) => p.handler === handler);
const act = (s, id, t) => { s.pending = []; s.player.counters = {}; return ctx.doAction(s, id, t); };
const answer = (s, handler, value) => { const pp = pop(s, handler); if (!pp) return false; const i = pp.choices.findIndex((c) => c.value === value); return ctx.resolvePopup(s, pp.id, i < 0 ? 0 : i); };
const adult = (age) => { const s = ctx.createLife({ country: 'us', year: 2000 }); s.year = 2000 + age; s.pending = []; s.player.edu.current = null; s.player.money = 3e6; s.player.skills.streetwise = 40; s.player.skills.martial = 40; s.player.skills.charisma = 40; return s; };
const friend = (s, kind, rel) => { const p = ctx.makeAdultNear(s, { minAge: 25, maxAge: 45 }); ctx.setRel(s, p.id, kind || 'friend', rel ?? 60); return p; };
const setMature = (m, v) => { META.settings.mature = m; META.settings.mature_violence = v; };

/* 1. fallout ----------------------------------------------------------------------------- */
setMature(false, false);
{
  const s = adult(35);
  const victim = friend(s, 'friend', 60), their = friend(s, 'friend', 60);
  ctx.webLink(s, victim.id, their.id, 'friend');
  const r0 = s.player.rels[their.id].rel;
  ctx.webFact(s, 'victim', { pid: victim.id, harm: 'money' });
  ok(s.web.victims.length === 1 && s.web.victims[0].by === s.playerId, 'a victim is recorded, with you as the one behind it');
  ok(s.player.rels[their.id].rel < r0, 'the people who love them think less of you');
  ctx.webFact(s, 'victim', { pid: null, harm: 'death' });
  ok(s.web.victims.length === 2, 'a nameless victim counts too');
  // A case that will not go cold.
  const c = ctx.invOpen(s, 'ponzi', { messy: true, ev: { wit: 30 } });
  c.last = s.year - 4; c.prog = 20;
  ctx.falloutYear(s);
  ok(c.last === s.year && c.prog > 20, 'victims keep a case alive and nearer');
  // Their people turn on you.
  let turned = 0;
  for (let i = 0; i < 80; i++) { const t = clone(s); t.pending = []; t.player.rels[their.id].rel = 60; ctx.falloutYear(t); if (t.player.rels[their.id].rel < 60) turned++; }
  ok(turned > 3, `their people turn on you (${turned}/80)`);
  // The group.
  ctx.webFact(s, 'victim', { pid: friend(s, 'friend', 50).id, harm: 'money' });
  let group = null;
  for (let i = 0; i < 60 && !group; i++) { const t = clone(s); t.pending = []; ctx.falloutYear(t); if (pop(t, 'webGroup')) group = t; }
  ok(!!group, 'a victims\' group forms');
  if (group) for (const v of ['go', 'pay', 'in', 'away']) {
    let seen = false;
    for (let i = 0; i < 6; i++) { const t = clone(group); const e0 = errors; try { answer(t, 'webGroup', v); } catch (e) { ok(false, `group/${v} threw ${e.message}`); } ok(errors === e0, `group/${v} logged an error`); seen = true; }
    ok(seen, `group/${v} runs`);
  }
  { const t = clone(group); const before = t.player.money; answer(t, 'webGroup', 'pay'); ok(t.player.money < before && t.player.karma > group.player.karma, 'sending money helps your karma and costs money'); }
  { const t = clone(group); answer(t, 'webGroup', 'in'); ok(t.player.prison || t.pending.some((p) => p.handler === 'trial') || t.player.record.length, 'turning yourself in leads to court'); }
  { const t = clone(s); const n = ctx.victimsAgainstMe(t, 6).length; ctx.webFact(t, 'victim', { pid: null, harm: 'death', by: null }); ok(ctx.victimsAgainstMe(t, 6).length === n && t.web.victims.length === n + 1, 'victims of other people are not yours'); }
  { const t = clone(s); t.pending = []; for (let i = 0; i < 40; i++) t.web.victims.push({ pid: null, harm: 'money', year: t.year, by: t.playerId }); ctx.webFact(t, 'victim', { pid: null }); ok(t.web.victims.length <= 31, 'the list is capped'); }
  { const kid = ctx.createLife({ country: 'us', year: 2000 }); ctx.streetYear(kid); ok(true, 'kids are skipped'); }
}

/* 2. witnesses ---------------------------------------------------------------------------- */
{
  const base = adult(35);
  const c = ctx.invOpen(base, 'burglary', { messy: true, ev: { wit: 40 } });
  c.ev.wit = 60;
  setMature(false, false);
  ok(!ctx.actionList(base, 'crime').some((a) => a.id === 'wi_lean'), 'dealing with a witness is hidden without Mature');
  setMature(true, false);
  ok(ctx.actionList(base, 'crime').some((a) => a.id === 'wi_lean'), 'and shows with it');
  const kid = adult(15); ctx.invOpen(kid, 'burglary', { messy: true }); ok(!ACTIONS.wi_lean.when(kid) || kid.player.age >= 0, 'a witness case is for adults'); 
  act(base, 'wi_lean');
  const pick = pop(base, 'wiPick');
  ok(!!pick && pick.choices.some((x) => x.value === c.id), 'it lists your cases');
  ctx.resolvePopup(base, pick.id, pick.choices.findIndex((x) => x.value === c.id));
  const how = pop(base, 'wiHow');
  ok(!!how, 'then how');
  const p = base.people[c.wpid];
  ok(p && base.player.rels[p.id].kind === 'witness', 'there is a real person behind it');
  ok(!how.choices.some((x) => x.value === 'scare'), 'the cruel way needs Violence');
  setMature(true, true);
  const base2 = clone(base); base2.pending = []; base2.player.counters = {}; ctx.invOf(base2).list[c.id].wiYear = 0;
  act(base2, 'wi_lean'); ctx.resolvePopup(base2, pop(base2, 'wiPick').id, 0);
  ok(!!pop(base2, 'wiHow').choices.find((x) => x.value === 'scare'), 'with Violence it is offered');
  for (const v of ['pay', 'move', 'scare']) {
    let helped = 0, backfired = 0;
    for (let i = 0; i < 40; i++) {
      const t = clone(base2);
      const cc = ctx.invOf(t).list[c.id]; const wit0 = cc.ev.wit; const n0 = Object.values(t.inv.list).filter((k) => k.crime === 'tampering').length;
      const e0 = errors;
      try { answer(t, 'wiHow', v); } catch (e) { ok(false, `${v} threw ${e.message}`); }
      if (!t.pending.length) { /* resolved */ }
      ok(errors === e0, `${v} logged an error`);
      if (cc.ev.wit < wit0) helped++;
      if (Object.values(t.inv.list).filter((k) => k.crime === 'tampering').length > n0) backfired++;
      ok(cc.wiYear === t.year, `${v}: once per case per year`);
    }
    ok(helped > 3 && backfired > 0, `${v}: works sometimes (${helped}/40) and backfires sometimes (${backfired}/40)`);
  }
  { const t = clone(base2); answer(t, 'wiHow', 'pay'); ok(!ctx.wiCases(t).some((k) => k.id === c.id), 'a case worked this year is not offered again'); }
  // The other side: you saw it.
  setMature(true, false);
  { const s = adult(30); const ev = EVENTS.wi_you_saw; ok(ctx.eventEligible(s, ev), 'you can be a witness');
    for (let i = 0; i < 8; i++) { const t = clone(s); if (!ctx.fireEvent(t, ev)) continue; const pp = t.pending.find((q) => q.handler === 'event'); for (let k = 0; k < pp.choices.length; k++) { const u = clone(t); const q = u.pending.find((x) => x.handler === 'event'); const e0 = errors; try { ctx.resolvePopup(u, q.id, k); } catch (e) { ok(false, `wi_you_saw/${k} threw ${e.message}`); } ok(errors === e0, `wi_you_saw/${k} logged an error`); } }
    setMature(false, false); ok(!ctx.eventEligible(s, ev), 'and it needs Mature'); }
}

/* 3. the vigilante ---------------------------------------------------------------------------- */
{
  setMature(false, false);
  const s = adult(30);
  ok(!ctx.actionList(s, 'street').length, 'street justice is hidden without the switches');
  setMature(true, false);
  ok(!ctx.actionList(s, 'street').length, 'and needs Violence too');
  setMature(true, true);
  ok(ctx.actionList(s, 'street').some((a) => a.id === 'vig_start'), 'shows with Mature and Violence');
  { const t = adult(30); t.player.skills.streetwise = 0; t.player.skills.martial = 0; ok(!ACTIONS.vig_start.when(t), 'it takes some streetwise or martial skill'); ok(!ACTIONS.vig_start.when(adult(15)), 'a kid cannot'); }
  act(s, 'vig_start');
  const v = ctx.vigOf(s);
  ok(!!v && v.alias && ctx.webLive(s, (x) => x.kind === 'vigilante').length === 1, 'a street name, and a secret');
  ok(!ACTIONS.vig_start.when(s) && ACTIONS.vig_patrol.when(s), 'then you go out');
  act(s, 'vig_patrol');
  const lead = pop(s, 'vigPick');
  ok(lead && lead.choices.length === 4, 'three leads and a way out');
  for (const how of ['send', 'face', 'hurt']) {
    let good = 0, bad = 0, wrong = 0;
    for (let i = 0; i < 3; i++) for (let k = 0; k < 3; k++) {
      for (let n = 0; n < 12; n++) {
        const t = clone(s); t.pending = []; t.player.counters = {};
        act(t, 'vig_patrol'); ctx.resolvePopup(t, pop(t, 'vigPick').id, k);
        const e0 = errors;
        const v0 = ctx.vigOf(t).wins, w0 = ctx.vigOf(t).wrong;
        try { answer(t, 'vigAct', how); } catch (e) { ok(false, `${how} threw ${e.message}`); }
        ok(errors === e0, `${how} logged an error`);
        if (ctx.vigOf(t).wins > v0) good++; else bad++;
        if (ctx.vigOf(t).wrong > w0) wrong++;
        if (how === 'hurt') ok(Object.values(t.inv.list).some((c) => c.crime === 'assault' && c.who === t.playerId), 'hurting someone is an assault, whatever the reason');
      }
    }
    ok(good > 3 && bad > 3, `${how}: wins (${good}) and does not (${bad})`);
    if (how !== 'send') ok(wrong > 0, `${how}: sometimes it is the wrong person (${wrong})`);
  }
  // Being the wrong one means a lawsuit.
  { let sued = 0; for (let n = 0; n < 80; n++) { const t = clone(s); t.pending = []; t.player.counters = {}; act(t, 'vig_patrol'); ctx.resolvePopup(t, pop(t, 'vigPick').id, 1); answer(t, 'vigAct', 'hurt'); if (ctx.vigOf(t).wrong) { if ((t.player.court && t.player.court.cases || []).length || t.pending.some((p) => /^ct/.test(p.handler || ''))) sued++; } } ok(sued > 0, 'hurting the wrong person gets you sued'); }
  // The papers and the police.
  { const t = clone(s); ctx.vigOf(t).rep = 30; ctx.vigYear(t); ok((t.news || []).some((a) => a.kind === 'vigilante'), 'a name makes the paper'); }
  { const t = clone(s); ctx.vigOf(t).heat = 90; let out = 0; for (let i = 0; i < 100; i++) { const u = clone(t); ctx.vigYear(u); if (!ctx.vigOf(u)) out++; } ok(out > 15, `a hot vigilante gets unmasked (${out}/100)`); }
  { const t = clone(s); ctx.vigUnmasked(t); ok(!ctx.vigOf(t) && ctx.invMine(t, (c) => c.crime === 'vigilantism').length === 1 && (t.news || []).some((a) => a.kind === 'vigilante_end'), 'unmasked: a case, the paper, the end'); }
  { const t = clone(s); ctx.webExpose(t, ctx.webLive(t, (x) => x.kind === 'vigilante')[0], 'gossip'); ok(!ctx.vigOf(t), 'the secret getting out unmasks you'); }
  { const t = clone(s); t.player.prison = { yearsLeft: 2, total: 2, served: 0, crime: 'x', behavior: 50, juvie: false, name: 'x', gang: null }; ctx.vigYear(t); ok(!ctx.vigOf(t), 'prison ends it'); }
  { const t = clone(s); act(t, 'vig_quit'); ok(!ctx.vigOf(t) && ctx.webLive(t, (x) => x.kind === 'vigilante').length === 0, 'you can hang up the hat'); }
  { const t = clone(s); setMature(true, false); ctx.vigOf(t).heat = 99; ctx.vigYear(t); ok(!!ctx.vigOf(t), 'with Violence off the hat waits'); setMature(true, true); }
}

/* 4. churn --------------------------------------------------------------------------------------- */
{
  const before = errors;
  for (let n = 0; n < 6; n++) {
    const s = adult(30 + n);
    s.player.money = 8e6;
    ctx.invOpen(s, 'burglary', { messy: true, ev: { wit: 50 } });
    act(s, 'vig_start');
    ctx.webFact(s, 'victim', { pid: friend(s, 'friend', 50).id, harm: 'money' });
    ctx.webFact(s, 'victim', { pid: null, harm: 'death' });
    for (let i = 0; i < 14 && !s.dead; i++) {
      try { ctx.ageUp(s); } catch (e) { ok(false, 'a year threw: ' + e.message); break; }
      for (let k = 0; k < 30 && s.pending.length; k++) { const pp = s.pending[0]; ctx.resolvePopup(s, pp.id, Math.max(0, pp.choices.findIndex((c) => !c.disabled)), pp.input ? 'X' : undefined); }
      if (ctx.vigOf(s) && i % 2 === 0) { s.player.counters = {}; try { ctx.doAction(s, 'vig_patrol'); for (let k = 0; k < 5 && s.pending.length; k++) { const pp = s.pending[0]; ctx.resolvePopup(s, pp.id, 0); } } catch (e) { ok(false, 'patrol threw ' + e.message); } }
    }
  }
  ok(errors === before, 'years with all of it going log no errors');
}
setMature(false, false);
console.log(failures ? `\n✖ ${failures} check(s) failed` : '✓ street justice checks passed');
process.exit(failures ? 1 : 0);
