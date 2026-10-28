// Toxic and abusive relationships verification:  node dev/verify/abuse.mjs
//
// Covers 85-abuse.js:
//   1. gating   — nothing without Mature + Dark themes, adults only, a partner is needed
//   2. victim   — it starts small, every stage offers a way out and every answer runs, a night in hospital, leaving with
//                 and without a plan, reports and orders, the secret that is not a scandal, the scar and healing
//   3. abuser   — it starts with a choice, help works over years, releasing them ends it, blaming makes it worse,
//                 a partner who leaves and reports, a person who changes
//   4. toxic    — the friend and the parent events run every choice
//   5. rules    — nobody dies, no sexual content, every popup has a way out, state stays sane over years
import { loadGame } from './loadgame.mjs';

const ctx = loadGame({ quiet: true });
const g = (name) => ctx.run(name);
ctx.seedRng(8501);
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
const tags = (on) => { META.settings.mature = on; META.settings.mature_themes = on; };
const adult = (age) => { const s = ctx.createLife({ country: 'us', year: 2000 }); s.year = 2000 + age; s.pending = []; s.player.edu.current = null; s.player.money = 1e6; return s; };
const withPartner = (s, rel) => { const p = ctx.makeAdultNear(s, { minAge: 28, maxAge: 40 }); ctx.setRel(s, p.id, 'partner', rel ?? 70); p.partner = s.playerId; P(s).partner = p.id; return p; };
const friends = (s) => { for (let i = 0; i < 3; i++) { const f = ctx.makeAdultNear(s, { minAge: 25, maxAge: 45 }); ctx.setRel(s, f.id, 'friend', 60); } };
const victimState = (level) => { const s = adult(32); friends(s); const p = withPartner(s); const a = ctx.abStart(s, p.id, 'victim', level ?? 30); return { s, p, a }; };

/* 1. gating ---------------------------------------------------------------------- */
tags(false);
{
  const { s, p } = (() => { const s = adult(32); const p = withPartner(s); return { s, p }; })();
  let started = 0;
  for (let i = 0; i < 400; i++) { const t = clone(s); t.pending = []; ctx.abYear(t); if (t.player.abuse || t.pending.length) started++; }
  ok(started === 0, 'nothing starts while the switches are off');
  tags(true);
  for (let i = 0; i < 1500; i++) { const t = clone(s); t.pending = []; ctx.abYear(t); if (pop(t, 'abBegin')) started++; }
  ok(started > 5 && started < 300, `with them on, it very rarely starts (${started}/1500)`);
  const kid = ctx.createLife({ country: 'us', year: 2000 }); kid.year = 2010; for (let i = 0; i < 50; i++) ctx.abYear(kid);
  ok(!kid.player.abuse, 'never for a child');
  const single = adult(32); for (let i = 0; i < 400; i++) ctx.abYear(single);
  ok(!single.player.abuse && !single.pending.length, 'it needs a partner');
  // A hot-headed partner makes it likelier.
  const hot = clone(s), cold = clone(s);
  hot.people[P(hot).partner].traits = ['hotheaded']; cold.people[P(cold).partner].traits = ['kind'];
  ok(ctx.abPartnerOdds(hot, hot.people[P(hot).partner]) > ctx.abPartnerOdds(cold, cold.people[P(cold).partner]), 'a hot-headed partner is likelier');
  tags(false);
  const t = adult(32); const pp = withPartner(t); ok(!ctx.eventEligible(t, EVENTS.ab_you_lose_it), 'the abuser events need the switches');
  ok(!ctx.actionList(t, 'love').some((a) => a.id === 'ab_reach_out'), 'the help action is hidden too');
}

/* 2. the victim ------------------------------------------------------------------------ */
tags(true);
{
  // It starts small.
  const s = adult(32); friends(s); const p = withPartner(s);
  ctx.abBegin(s, p);
  for (const v of ['talk', 'friend', 'ignore']) {
    let began = 0;
    for (let i = 0; i < 20; i++) { const t = clone(s); answer(t, 'abBegin', v); if (t.player.abuse) began++; }
    ok(v === 'talk' ? true : began === 20, `abBegin/${v} runs${v === 'talk' ? ' (a good talk can end it there)' : ''}`);
  }
  { const t = clone(s); answer(t, 'abBegin', 'friend'); ok(t.player.abuse.told && ctx.abSecret(t).knows.length > 1, 'telling a friend means somebody knows'); }
  // Every stage, every way out.
  for (const level of [10, 30, 55, 80]) {
    const { s: v, a } = victimState(level);
    v.pending = []; ctx.abStage(v, a, ctx.abPartner(v));
    const pp = pop(v, 'abStage');
    ok(!!pp, `level ${level}: it asks what you will do`);
    const vals = pp.choices.map((c) => c.value);
    ok(['tell', 'help', 'report', 'boundary', 'leave', 'stay'].every((x) => vals.includes(x)), `level ${level}: every way out is on the table`);
    ok(pp.text.includes('not your fault'), `level ${level}: it says it is not your fault`);
    for (const val of vals) for (let i = 0; i < 6; i++) {
      const t = clone(v); const e0 = errors;
      try { answer(t, 'abStage', val); } catch (e) { ok(false, `stage ${level}/${val} threw ${e.message}`); }
      ok(errors === e0, `stage ${level}/${val} logged an error`);
      const aa = t.player.abuse;
      ok(!aa || (aa.level >= 0 && aa.level <= 100 && aa.control >= 0 && aa.control <= 100), `stage ${level}/${val}: state sane`);
      ok(P(t).stats.health > 0 && !t.dead, `stage ${level}/${val}: nobody dies`);
    }
  }
  // Telling, help, report, boundary, leave: what each does.
  { const { s: v, a } = victimState(40); v.pending = []; ctx.abStage(v, a, ctx.abPartner(v)); const t = clone(v); const l0 = t.player.abuse.level; answer(t, 'abStage', 'tell'); ok(t.player.abuse.told && t.player.abuse.level < l0, 'telling someone lowers it'); }
  { const { s: v, a } = victimState(40); v.pending = []; ctx.abStage(v, a, ctx.abPartner(v)); const t = clone(v); answer(t, 'abStage', 'help'); ok(t.player.abuse.plan && t.player.money < v.player.money, 'a call makes a safety plan'); }
  { const { s: v, a } = victimState(40); v.pending = []; ctx.abStage(v, a, ctx.abPartner(v)); let order = 0; for (let i = 0; i < 60; i++) { const t = clone(v); answer(t, 'abStage', 'report'); if (t.player.abuse && t.player.abuse.order || !t.player.abuse) order++; } ok(order > 10, `reporting often brings an order (${order}/60)`); }
  { const { s: v, a } = victimState(40); v.pending = []; ctx.abStage(v, a, ctx.abPartner(v)); let better = 0, worse = 0; for (let i = 0; i < 60; i++) { const t = clone(v); answer(t, 'abStage', 'boundary'); if (t.player.abuse.level < 40) better++; else worse++; } ok(better > 3 && worse > 3, `a boundary can work (${better}) or backfire (${worse})`); }
  { const { s: v, a } = victimState(75); v.pending = []; ctx.abStage(v, a, ctx.abPartner(v)); let hurt = 0, hurtPlan = 0; for (let i = 0; i < 120; i++) { const t = clone(v); const h0 = P(t).stats.health; answer(t, 'abStage', 'leave'); if (P(t).stats.health < h0) hurt++; const u = clone(v); u.player.abuse.plan = true; u.player.abuse.told = true; u.player.abuse.order = true; const h1 = P(u).stats.health; answer(u, 'abStage', 'leave'); if (P(u).stats.health < h1) hurtPlan++; if (i === 0) { ok(!u.player.abuse && !!u.player.scar, 'leaving ends it, and leaves a scar'); ok(P(u).partner === null || u.player.rels[ctx.abPartner(v).id].kind !== 'partner', 'and the relationship'); } } ok(hurt > hurtPlan, `leaving is safer with a plan (${hurtPlan} vs ${hurt} of 120)`); }
  // The night.
  { const { s: v, a } = victimState(75); ctx.abNight(v, a, ctx.abPartner(v)); const pp = pop(v, 'abNight'); ok(!!pp && pp.choices.length === 4, 'a night asks four ways'); for (const val of pp.choices.map((c) => c.value)) { const t = clone(v); const e0 = errors; answer(t, 'abNight', val); ok(errors === e0 && !t.dead, `night/${val} runs and nobody dies`); } { const t = clone(v); answer(t, 'abNight', 'hospital'); ok(t.player.abuse.plan && t.player.abuse.told, 'the hospital believes you'); } { const t = clone(v); answer(t, 'abNight', 'police'); ok(!t.player.abuse && t.player.record.length === 0, 'the police take it seriously'); } }
  // The secret is not a scandal, and a perpetrator's would be.
  { const { s: v } = victimState(40); const sec = ctx.abSecret(v); ok(!!sec, 'a victim has a secret'); const sc0 = ctx.webRep(P(v)).scandal; ctx.webExpose(v, sec, 'gossip'); ok(ctx.webRep(P(v)).scandal === sc0, 'its getting out is no scandal for them'); ok(v.player.abuse.told, 'and the people who love them know'); }
  { const { s: v } = victimState(40); v.player.abuse.role = 'abuser'; const sec = ctx.abSecret(v); const sc0 = ctx.webRep(P(v)).scandal; ctx.webExpose(v, sec, 'gossip'); ok(ctx.webRep(P(v)).scandal > sc0, 'but an abuser\'s getting out is'); }
  // The year.
  { const { s: v } = victimState(40); const h0 = P(v).stats.happy; v.pending = []; ctx.abYear(v); ok(!!pop(v, 'abStage') || !!pop(v, 'abNight'), 'every year asks'); ok(P(v).stats.happy < h0, 'staying costs'); }
  { const { s: v } = victimState(50); v.player.abuse.control = 60; let lost = 0; for (let i = 0; i < 40; i++) { const t = clone(v); const f = Object.values(t.player.rels).filter((r) => r.kind === 'friend').map((r) => r.rel); t.pending = []; ctx.abYear(t); if (Object.values(t.player.rels).filter((r) => r.kind === 'friend').some((r, k) => r.rel < f[k])) lost++; } ok(lost > 20, 'control isolates you from your friends'); }
  { const { s: v } = victimState(40); v.player.rels[v.player.abuse.pid].kind = 'ex'; v.pending = []; ctx.abYear(v); ok(!v.player.abuse, 'if the relationship ends some other way, so does it'); }
  // The scar and healing.
  { const s2 = adult(32); s2.player.scar = 60; const h = P(s2).stats.happy; ctx.abYear(s2); ok(P(s2).stats.happy < h && s2.player.scar < 60, 'a scar costs, and fades'); ok(ACTIONS.ab_heal.when(s2), 'you can talk to someone'); const t = clone(s2); act(t, 'ab_heal'); ok(t.player.scar < 60 - 3, 'talking helps'); const u = clone(s2); u.player.scar = 5; ok(!ACTIONS.ab_heal.when(u), 'and it is only offered when there is something to heal'); }
  { const { s: v } = victimState(40); ok(ACTIONS.ab_reach_out.when(v), 'reaching out is always an action'); act(v, 'ab_reach_out'); ok(v.player.abuse.plan, 'it makes a plan'); ok(!ACTIONS.ab_reach_out.when(v), 'once'); }
}

/* 3. the abuser ------------------------------------------------------------------------- */
{
  const s = adult(32); friends(s); const p = withPartner(s);
  P(s).traits = ['hotheaded'];
  const ev = EVENTS.ab_you_lose_it;
  ok(ctx.eventEligible(s, ev), 'a hot-headed adult with a partner can have the moment');
  let began = 0, helped = 0;
  for (let i = 0; i < 8; i++) { const t = clone(s); if (!ctx.fireEvent(t, ev)) continue; const pp = t.pending.find((q) => q.handler === 'event'); for (let k = 0; k < pp.choices.length; k++) { const u = clone(t); const q = u.pending.find((x) => x.handler === 'event'); const e0 = errors; try { ctx.resolvePopup(u, q.id, k); } catch (e) { ok(false, `lose_it/${k} threw ${e.message}`); } ok(errors === e0, `lose_it/${k} logged an error`); if (u.player.abuse && u.player.abuse.role === 'abuser') began++; else helped++; } }
  ok(began > 0 && helped > 0, 'owning up, or blaming them');
  const { s: t } = (() => { const x = adult(32); friends(x); const q = withPartner(x); ctx.abStart(x, q.id, 'abuser', 30); return { s: x, q }; })();
  const a = t.player.abuse;
  t.pending = []; ctx.abSelfPopup(t, a, ctx.abPartner(t));
  const vals = pop(t, 'abSelf').choices.map((c) => c.value);
  ok(['help', 'release', 'promise', 'blame'].every((x) => vals.includes(x)), 'you always have the way to stop');
  // Help works over the years.
  { const u = clone(t); for (let i = 0; i < 4; i++) { u.pending = []; ctx.abSelfPopup(u, u.player.abuse, ctx.abPartner(u)); answer(u, 'abSelf', 'help'); } ok(u.player.abuse.change >= 70 || !u.player.abuse, 'years of help change a person'); u.pending = []; ctx.abYear(u); ok(!u.player.abuse && u.player.karma >= t.player.karma, 'and it ends with a person who has changed'); }
  { const u = clone(t); answer(u, 'abSelf', 'release'); ok(!u.player.abuse && u.player.rels[ctx.abPartner(t).id].kind !== 'partner', 'letting them go ends it'); ok(u.player.karma > t.player.karma, 'and counts for something'); }
  { const u = clone(t); const l0 = u.player.abuse.level; answer(u, 'abSelf', 'blame'); ok(u.player.abuse.level > l0, 'blaming makes it worse'); }
  { const u = clone(t); const l0 = u.player.abuse.level; answer(u, 'abSelf', 'promise'); ok(u.player.abuse.level < l0 + 1, 'a promise buys a little time'); }
  // Left unchecked, they leave and report.
  { let reported = 0; for (let i = 0; i < 60; i++) { const u = clone(t); u.player.abuse.level = 85; u.pending = []; ctx.abYear(u); if (!u.player.abuse && Object.values(u.inv.list).some((c) => c.crime === 'domestic' && c.who === u.playerId)) reported++; } ok(reported > 10, `left alone it ends in a report (${reported}/60)`); }
  { const u = clone(t); u.player.abuse.level = 85; ctx.abPartnerLeaves(u, u.player.abuse, ctx.abPartner(u)); ok(ctx.webRep(P(u)).scandal > 10, 'and everyone knows'); }
}

/* 4. toxic ----------------------------------------------------------------------------- */
{
  const s = adult(35); friends(s);
  for (const id of ['ab_toxic_friend', 'ab_toxic_parent']) {
    const ev = EVENTS[id];
    ok(ctx.eventEligible(s, ev), `${id} can fire`);
    for (let i = 0; i < 6; i++) { const t = clone(s); if (!ctx.fireEvent(t, ev)) continue; const pp = t.pending.find((q) => q.handler === 'event'); for (let k = 0; k < pp.choices.length; k++) { const u = clone(t); const q = u.pending.find((x) => x.handler === 'event'); const e0 = errors; try { ctx.resolvePopup(u, q.id, k); } catch (e) { ok(false, `${id}/${k} threw ${e.message}`); } ok(errors === e0, `${id}/${k} logged an error`); } }
  }
  tags(false); ok(!ctx.eventEligible(s, EVENTS.ab_toxic_friend), 'and need the switches'); tags(true);
}

/* 5. the rules, over the years ------------------------------------------------------------ */
{
  const before = errors;
  for (let n = 0; n < 12; n++) {
    const s = adult(26 + n); friends(s); const p = withPartner(s);
    ctx.abStart(s, p.id, n % 2 ? 'victim' : 'abuser', 20 + n * 4);
    for (let i = 0; i < 16 && !s.dead; i++) {
      try { ctx.ageUp(s); } catch (e) { ok(false, 'a year threw: ' + e.message); break; }
      for (let k = 0; k < 30 && s.pending.length; k++) {
        const pp = s.pending[0];
        ok(pp.choices.length >= 2 || !pp.handler || !/^ab/.test(pp.handler), 'every abuse popup has more than one answer');
        ctx.resolvePopup(s, pp.id, Math.max(0, pp.choices.findIndex((c) => !c.disabled)), pp.input ? 'X' : undefined);
      }
      const a = s.player.abuse;
      ok(!a || (a.level >= 0 && a.level <= 100 && a.control >= 0 && a.control <= 100 && a.change >= 0 && a.change <= 100), 'state stays in range');
      ok((s.player.scar || 0) >= 0 && (s.player.scar || 0) <= 100, 'the scar stays in range');
    }
  }
  ok(errors === before, 'years with it going log no errors');
  // No sexual content, anywhere in the file.
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('../../src/src/srcfiles/js/85-abuse.js', import.meta.url), 'utf8');
  ok(!/\b(sex|rape|nude|naked|erotic|assault(ed)? her|molest)\w*/i.test(src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/Domestic assault|domestic assault/g, '')), 'nothing sexual in the system');
}
tags(false);
console.log(failures ? `\n✖ ${failures} check(s) failed` : '✓ abuse checks passed');
process.exit(failures ? 1 : 0);
