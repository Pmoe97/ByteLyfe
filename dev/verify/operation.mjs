// The operation verification:  node dev/verify/operation.mjs
//
// Covers 83-operation.js:
//   1. gating    — nothing shows without Mature + Substances, adults only, one operation at a time
//   2. building  — crew by role (capped by size), supply and sites, products by stage, getting out
//   3. the year  — the books, the decision, heat, every kind of trouble and every answer to it
//   4. the people— crew get loyal or resentful, picked up, talk; the secret leaks and reacts
//   5. violence  — a rival's fight and a prison gang's orders, wars, jumpings and way out are gated and every choice runs
//   6. churn     — years with an operation running log no errors
import { loadGame } from './loadgame.mjs';

const ctx = loadGame({ quiet: true });
const g = (name) => ctx.run(name);
ctx.seedRng(8301);
let errors = 0;
ctx.console.error = () => { errors++; };
let failures = 0;
const ok = (cond, msg) => { if (!cond) { failures++; console.log('  ✖ ' + msg); } };
const META = g('META'), ACTIONS = g('ACTIONS'), EVENTS = g('EVENTS'), SECRET_KINDS = g('SECRET_KINDS');
const clone = (s) => JSON.parse(JSON.stringify(s));
const P = (s) => s.people[s.playerId];
const pop = (s, handler) => s.pending.find((p) => p.handler === handler);
const act = (s, id, t) => { s.pending = []; s.player.counters = s.player.counters || {}; return ctx.doAction(s, id, t); };
const answer = (s, handler, value) => { const pp = pop(s, handler); if (!pp) return false; const i = pp.choices.findIndex((c) => c.value === value); return ctx.resolvePopup(s, pp.id, i < 0 ? 0 : i); };
const setTags = (on) => { META.settings.mature = on; META.settings.mature_substances = on; };
const setViolence = (on) => { META.settings.mature_violence = on; };
const adult = (age) => { const s = ctx.createLife({ country: 'us', year: 2000 }); s.year = 2000 + age; s.pending = []; s.player.edu.current = null; s.player.money = 3e6; s.player.skills.streetwise = 40; return s; };
const started = (age) => { const s = adult(age || 30); act(s, 'op_start'); answer(s, 'opStart', 'weed'); return s; };

/* 1. gating ---------------------------------------------------------------------- */
setTags(false); setViolence(false);
{
  const s = adult(30);
  ok(!ctx.actionList(s, 'mob').some((a) => a.id === 'op_start'), 'hidden while the switches are off');
  setTags(true);
  ok(ctx.actionList(s, 'mob').some((a) => a.id === 'op_start'), 'shows with Mature and Substances');
  ok(!ACTIONS.op_start.when(adult(15)), 'a kid never sees it');
  const t = adult(30); t.player.skills.streetwise = 0;
  ok(!ACTIONS.op_start.when(t), 'it takes some streetwise, a felony or a start on the dealer ladder');
  t.player.uw = null; ctx.uw(t).dealer = { rank: 0, rep: 0, cartel: '' };
  ok(ACTIONS.op_start.when(t), 'a dealer can build one');
  const o = started();
  ok(!!ctx.opOf(o) && ctx.opOf(o).turf === 1 && ctx.opOf(o).product === 'weed', 'it starts small');
  ok(!ACTIONS.op_start.when(o), 'one at a time');
  ok(ctx.webLive(o, (x) => x.kind === 'operation').length === 1, 'it is a secret');
  ok(o.player.uw.dealer && o.player.uw.dealer.rank === 0, 'and the dealer ladder has you on it');
  ok(!ctx.actionList(o, 'mob').some((a) => a.id === 'op_start') && ctx.actionList(o, 'mob').some((a) => a.id === 'op_hire'), 'the menu moves on to running it');
  setTags(false);
  ok(!ctx.actionList(o, 'mob').some((a) => a.id === 'op_hire'), 'turning the switch off hides it again');
  { const t2 = clone(o); const before = JSON.stringify(ctx.opOf(t2)); ctx.opYear(t2); ok(JSON.stringify(ctx.opOf(t2)) === before, 'and the business waits'); }
  setTags(true);
}

/* 2. building ----------------------------------------------------------------------- */
{
  const s = started();
  for (const role of ['runner', 'bookkeeper', 'lookout', 'muscle']) {
    const t = clone(s);
    act(t, 'op_hire'); ok(!!pop(t, 'opHire'), 'hiring asks who');
    answer(t, 'opHire', role);
    const o = ctx.opOf(t);
    ok(o.crew.length === 1 && o.crew[0].role === role, `${role}: hired`);
    const p = t.people[o.crew[0].pid];
    ok(p && t.player.rels[p.id].kind === 'crew', `${role}: a real person, in your life as crew`);
    ok(!ACTIONS.op_hire.when(t), `${role}: once a year`);
  }
  { const t = clone(s); act(t, 'op_hire'); ok(!pop(t, 'opHire').choices.some((c) => c.value === 'producer'), 'no producer without a site'); }
  // Capped by size.
  { const t = clone(s); const o = ctx.opOf(t); for (let i = 0; i < 2; i++) { t.player.counters = {}; act(t, 'op_hire'); answer(t, 'opHire', 'runner'); } t.player.counters = {}; ok(o.crew.length === 2 && !ACTIONS.op_hire.when(t), 'a corner crew tops out at two'); o.rep = 45; ok(ACTIONS.op_hire.when(t), 'a bigger business has room'); }
  // Products by stage.
  { const t = clone(s); act(t, 'op_product'); const pp = pop(t, 'opProduct'); ok(pp.choices.find((c) => c.value === 'cocaine').disabled && pp.choices.find((c) => c.value === 'weed').disabled && !pp.choices.find((c) => c.value === 'weed') .value === false, 'only what you are big enough for'); ctx.opOf(t).rep = 70; t.player.counters = {}; act(t, 'op_product'); answer(t, 'opProduct', 'opioids'); ok(ctx.opOf(t).product === 'opioids', 'a distribution empire can move the hardest product'); }
  // Supply and sites.
  { const t = clone(s); act(t, 'op_supply'); answer(t, 'opSupply', 'build'); ok(ctx.opOf(t).site && ctx.opOf(t).supply === 'make' && ctx.opMakes(ctx.opOf(t)), 'a grow room makes cannabis');
    t.player.counters = {}; act(t, 'op_supply'); answer(t, 'opSupply', 'toggle'); ok(!ctx.opMakes(ctx.opOf(t)), 'you can go back to buying');
    t.player.counters = {}; act(t, 'op_supply'); answer(t, 'opSupply', 'close'); ok(!ctx.opOf(t).site, 'and shut the site');
    t.player.counters = {}; ctx.opOf(t).rep = 70; act(t, 'op_product'); answer(t, 'opProduct', 'cocaine'); t.player.counters = {}; act(t, 'op_supply'); const pp = pop(t, 'opSupply'); ok(pp && pp.choices.find((c) => c.value === 'build') && !pp.choices.find((c) => c.value === 'build').disabled, 'a big operation can set up a production site');
    answer(t, 'opSupply', 'build'); ok(ctx.opOf(t).site.kind === 'superlab', 'cocaine needs the big one'); }
  // Booking: making it pays better than buying it.
  { const a = clone(s), b = clone(s); ctx.opOf(a).turf = 3; ctx.opOf(b).turf = 3; ctx.opOf(b).site = { kind: 'grow', name: 'x' }; ctx.opOf(b).supply = 'make'; let ga = 0, gb = 0; for (let i = 0; i < 60; i++) { ga += ctx.opBooks(a, ctx.opOf(a)).net; gb += ctx.opBooks(b, ctx.opOf(b)).net; } ok(gb > ga, 'making it beats buying it, on average'); }
  // Getting out.
  { const t = clone(s); act(t, 'op_hire'); answer(t, 'opHire', 'runner'); const crew = ctx.opOf(t).crew[0].pid; act(t, 'op_out'); answer(t, 'opOut', 'pay'); ok(!ctx.opOf(t) && t.player.rels[crew].kind === 'friend', 'closing it and paying everyone off ends it kindly');
    ok(ctx.webLive(t, (x) => x.kind === 'operation').length === 0 && ctx.schemeOf(t).done.some((d) => d.kind === 'operation'), 'and it is on your record'); }
  { const t = clone(s); act(t, 'op_out'); answer(t, 'opOut', 'walk'); ok(!ctx.opOf(t), 'walking away ends it too'); }
}

/* 3. the year ------------------------------------------------------------------------- */
{
  const s = started();
  const o = ctx.opOf(s); o.turf = 2; o.rep = 20;
  ok(ctx.opBooks(s, o).gross > 0, 'there are books');
  // The decision.
  for (const v of ['expand', 'hold', 'bribe', 'quality']) {
    let did = false;
    for (let i = 0; i < 40 && !did; i++) {
      const t = clone(s); t.pending = [];
      ctx.opOf(t).heat = 0; ctx.opOf(t).rival = null;
      ctx.opYear(t);
      if (!pop(t, 'opTurn')) continue;
      did = true;
      ctx.opOf(t).heat = 50;
      const before = JSON.stringify(ctx.opOf(t));
      answer(t, 'opTurn', v);
      const o2 = ctx.opOf(t);
      ok(!!o2 && JSON.stringify(o2) !== before, `${v}: it changes something`);
      if (v === 'expand') ok(o2.turf === 3, 'expand: a block more');
      if (v === 'hold' || v === 'bribe') ok(o2.heat < 50, `${v}: heat down`);
      if (v === 'bribe') ok(ctx.webLive(t, (x) => x.kind === 'crime' && x.crime === 'bribery').length === 1, 'bribe: and someone has something on you');
    }
    ok(did, `the year offers ${v}`);
  }
  // Every kind of trouble, every answer.
  const trouble = (name, make, handler, values, check) => {
    for (const v of values) {
      for (let i = 0; i < 5; i++) {
        const t = clone(s); t.pending = []; t.player.money = 5e6; ctx.opOf(t).rep = 90; ctx.opOf(t).rival = { name: 'the Pale Hand', str: 50 }; ctx.opOf(t).turf = 4;
        ctx.opCrewYear(t, ctx.opOf(t)); // sets nothing, makes sure it never throws on its own
        make(t, ctx.opOf(t));
        if (!pop(t, handler)) { ok(false, `${name}: no popup`); break; }
        const e0 = errors;
        try { answer(t, handler, v); } catch (e) { ok(false, `${name}/${v} threw ${e.message}`); }
        ok(errors === e0, `${name}/${v} logged an error`);
        if (check) check(t, v);
      }
    }
  };
  setViolence(true);
  trouble('raid', (t) => ctx.opRaid(t, 'police'), 'opRaid', ['open', 'lawyer', 'hide', 'run']);
  trouble('warrant', (t) => ctx.opRaid(t, 'tip'), 'opRaid', ['open']);
  trouble('site', (t, o) => { o.site = { kind: 'grow', name: 'a shed' }; o.supply = 'make'; ctx.opSiteTrouble(t, o); }, 'opSite', ['move', 'close', 'go']);
  trouble('rival', (t, o) => ctx.opRivalMove(t, o), 'opRival', ['pay', 'talk', 'fight', 'cede']);
  trouble('death', (t, o) => ctx.opDeath(t, o), 'opDeath', ['fix', 'funeral', 'on', 'out']);
  trouble('cartel', (t, o) => ctx.opCartelTrouble(t, o), 'opCartel', ['lawyer', 'quiet', 'pay']);
  { const t = clone(s); ctx.opRivalMove(t, ctx.opOf(t)); ok(!!pop(t, 'opRival').choices.find((c) => c.value === 'fight'), 'a fight is offered with Violence on'); setViolence(false); const u = clone(s); ctx.opRivalMove(u, ctx.opOf(u)); ok(!pop(u, 'opRival').choices.find((c) => c.value === 'fight'), 'and not without it'); setViolence(true); }
  // A raid ends it, sometimes with an arrest.
  { let ended = 0, arrested = 0; for (let i = 0; i < 80; i++) { const t = clone(s); t.pending = []; ctx.opRaid(t, 'police'); answer(t, 'opRaid', 'open'); if (!ctx.opOf(t)) ended++; if (t.pending.some((p) => p.handler === 'trial') || t.player.prison) arrested++; } ok(ended > 5 && arrested > 5, `raids end it (${ended}/80) and put you in court (${arrested}/80)`); }
  // A death is a secret nobody else wants, and a victim.
  { const t = clone(s); const d0 = (t.web && t.web.victims || []).length; ctx.opDeath(t, ctx.opOf(t)); ok((t.web.victims || []).length === d0 + 1 && ctx.opOf(t).deaths === 1, 'a death is a victim and a number'); }
  // A conviction takes money.
  { const t = clone(s); t.player.money = 1e6; ctx.webFact(t, 'arrested', { crime: 'trafficking' }); ok(t.player.money < 1e6, 'a conviction seizes the proceeds'); }
  // The ladder.
  { const t = clone(s); const o2 = ctx.opOf(t); o2.rep = 0; ok(ctx.opStage(o2) === 0, 'stage 0'); o2.rep = 40; ok(ctx.opStage(o2) === 2, 'stage 2 at 40'); o2.rep = 85; ok(ctx.opStage(o2) === 4, 'a cartel at 85'); }
  // Prison ends it.
  { const t = clone(s); t.player.prison = { yearsLeft: 3, total: 3, served: 0, crime: 'x', behavior: 50, juvie: false, name: 'x', gang: null }; ctx.opYear(t); ok(!ctx.opOf(t), 'prison ends it'); }
}

/* 4. the people ---------------------------------------------------------------------------- */
{
  const s = started();
  const o = ctx.opOf(s); o.rep = 45;
  for (const r of ['runner', 'bookkeeper', 'lookout']) { s.player.counters = {}; act(s, 'op_hire'); answer(s, 'opHire', r); }
  ok(ctx.opCrewOf(s).length === 3, 'a crew of three');
  const pay0 = ctx.opPayroll(s, o);
  ok(pay0 > 0, 'they are on the payroll');
  // Loyalty drifts, and a resentful one talks.
  let talked = 0;
  for (let i = 0; i < 60; i++) {
    const t = clone(s); const o2 = ctx.opOf(t);
    for (const m of o2.crew) m.loyalty = 5;
    ctx.opCrewYear(t, o2);
    if (t.inv && Object.values(t.inv.list).some((c) => c.crime === 'trafficking')) talked++;
  }
  ok(talked > 10, `a crew with nothing left to lose talks (${talked}/60)`);
  let cold = 0;
  for (let i = 0; i < 60; i++) { const t = clone(s); const o2 = ctx.opOf(t); for (const m of o2.crew) m.loyalty = 95; ctx.opCrewYear(t, o2); if (t.inv && Object.values(t.inv.list).some((c) => c.crime === 'trafficking')) cold++; }
  ok(cold < talked, 'a loyal one talks far less');
  // Picked up: sometimes silence, sometimes your name.
  { let said = 0, quiet = 0; for (let i = 0; i < 80; i++) { const t = clone(s); const o2 = ctx.opOf(t); const m = o2.crew[0]; m.loyalty = 50; ctx.opCrewBusted(t, o2, m); if (t.player.rels[m.pid] && t.player.rels[m.pid].kind === 'enemy') said++; else quiet++; } ok(said > 5 && quiet > 5, `picked-up crew sometimes talk (${said}) and sometimes do not (${quiet})`); }
  // The secret.
  { const t = clone(s); ok(SECRET_KINDS.operation.tipOdds(t) > 0, 'the secret has a risk of its own'); ctx.webExpose(t, ctx.webLive(t, (x) => x.kind === 'operation')[0], 'tip'); ok(!!pop(t, 'opRaid'), 'when it gets out there is a warrant'); }
  // Dead crew are dropped.
  { const t = clone(s); t.people[ctx.opOf(t).crew[0].pid].alive = false; ctx.opCrewYear(t, ctx.opOf(t)); ok(ctx.opOf(t).crew.length === 2, 'the dead leave the crew'); }
}

/* 5. behind bars ------------------------------------------------------------------------------ */
{
  const inside = (gang) => { const s = adult(25); s.player.prison = { yearsLeft: 8, total: 8, served: 1, crime: 'x', behavior: 50, juvie: false, name: 'Ironwood', gang: gang === undefined ? 'the Iron Saints' : gang }; return s; };
  setTags(true); setViolence(false);
  const evs = ['op_gang_order', 'op_gang_war', 'op_gang_jumped', 'op_gang_out'];
  for (const id of evs) ok(!ctx.eventEligible(inside(), EVENTS[id]), `${id} needs Violence`);
  setViolence(true);
  for (const id of evs) {
    const ev = EVENTS[id];
    ok(!!ev && ctx.eventEligible(Object.assign(inside(), {}), ev) || id === 'op_gang_out', `${id} fires for a gang member`);
    const base = inside(); base.player.prison.rank = 1;
    for (let i = 0; i < 12; i++) {
      const s = clone(base);
      if (!ctx.fireEvent(s, ev)) continue;
      const pp = s.pending.find((p) => p.handler === 'event');
      for (let k = 0; k < pp.choices.length; k++) {
        const t = clone(s); const q = t.pending.find((p) => p.handler === 'event'); const e0 = errors;
        try { ctx.resolvePopup(t, q.id, k); } catch (e) { ok(false, `${id} choice ${k} threw ${e.message}`); }
        ok(errors === e0, `${id} choice ${k} logged an error`);
        const pr0 = t.player.prison;
        ok(!pr0 || (pr0.behavior >= 0 && pr0.behavior <= 100 && pr0.yearsLeft >= 0), `${id}: prison state stays sane`);
      }
    }
  }
  ok(!ctx.eventEligible(inside(null), EVENTS.op_gang_order), 'no gang, no orders');
  { const j = adult(16); j.player.prison = { yearsLeft: 2, total: 2, served: 0, crime: 'x', behavior: 50, juvie: true, name: 'x', gang: 'the Iron Saints' }; ok(!ctx.eventEligible(j, EVENTS.op_gang_order), 'never for a juvenile'); }
  // Rank climbs.
  { let up = 0; for (let i = 0; i < 100; i++) { const s = inside(); s.player.prison.behavior = 30; ctx.gangYear(s); if (s.player.prison.rank > 0) up++; } ok(up > 3 && up < 40, `rank climbs now and then (${up}/100)`); }
  setViolence(false);
}

/* 6. churn ----------------------------------------------------------------------------------- */
setTags(true); setViolence(true);
{
  const before = errors;
  for (let n = 0; n < 6; n++) {
    const s = started(30 + n);
    s.player.money = 8e6;
    for (let i = 0; i < 14 && !s.dead; i++) {
      try { ctx.ageUp(s); } catch (e) { ok(false, 'a year threw: ' + e.message); break; }
      for (let k = 0; k < 30 && s.pending.length; k++) { const pp = s.pending[0]; ctx.resolvePopup(s, pp.id, Math.max(0, pp.choices.findIndex((c) => !c.disabled)), pp.input ? 'X' : undefined); }
      if (ctx.opOf(s) && i % 2 === 0) { s.player.counters = {}; try { ctx.doAction(s, 'op_hire'); for (let k = 0; k < 5 && s.pending.length; k++) { const pp = s.pending[0]; ctx.resolvePopup(s, pp.id, 0); } } catch (e) { ok(false, 'hiring threw ' + e.message); } }
    }
  }
  ok(errors === before, 'years with an operation running log no errors');
}
setTags(false); setViolence(false);
console.log(failures ? `\n✖ ${failures} check(s) failed` : '✓ operation checks passed');
process.exit(failures ? 1 : 0);
