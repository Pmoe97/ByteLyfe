// Chaos mode verification:  node dev/verify/chaos.mjs
//
// Covers 51-chaos.js:
//   1. gating — every Chaos event and action carries the chaos tag; with Chaos off the
//      Supernatural menu is empty and the yearly tick changes nothing
//   2. powers — no duplicates, kids don't see the casino uses, going public blows the secret
//   3. capes — picking a side names you, makes a nemesis with powers, and reputation
//      climbs the ranks; outed heroes earn sponsorships
//   4. vampires — aging stops (health, looks and events follow the age you look), no
//      children, only adults can be turned, and a cure resumes aging from the age you looked
//   5. ascension — becoming an archangel ends the life with the right title and leaves the
//      family an ancestor whose events reach the next generation
import { loadGame } from './loadgame.mjs';

const ctx = loadGame({ quiet: true });
const g = (name) => ctx.run(name);
ctx.seedRng(2024);
let failures = 0;
const ok = (cond, msg) => { if (!cond) { failures++; console.log('  ✖ ' + msg); } };
const META = g('META'), EVENTS = g('EVENTS'), ACTIONS = g('ACTIONS'), POWERS = g('POWERS');
// Answers every popup with its first choice, except the ones that would end the test early.
const SAFE = { vp_cure: 1, vp_hunter: 1, asc_choir: 1, asc_throne: 1 };
const drain = (s) => { let n = 0; while (s.pending.length && n++ < 60) { const pp = s.pending[0]; const safe = pp.handler === 'event' && SAFE[pp.ctx.ev]; const i = safe !== undefined && safe !== false ? safe : pp.choices.findIndex((c) => !c.disabled); ctx.resolvePopup(s, pp.id, Math.max(0, i)); } s.pending = []; };
const act = (s, id, t) => { s.pending = []; return ctx.doAction(s, id, t); };
const answer = (s, value, input) => { const pp = s.pending[0]; const i = pp.choices.findIndex((c) => c.value === value); return ctx.resolvePopup(s, pp.id, i < 0 ? 0 : i, input); };
const adult = (age, o) => { const s = ctx.createLife(Object.assign({ country: 'us', year: 2000 }, o)); s.year = 2000 + age; s.pending = []; s.player.edu.current = null; return s; };

/* 1. gating ---------------------------------------------------------------- */
for (const id in EVENTS) if (/^(ch_|cape_|vp_|asc_|anc_)/.test(id)) ok((EVENTS[id].tags || []).includes('chaos'), `event ${id} is missing the chaos tag`);
for (const id in ACTIONS) if (ACTIONS[id].cat === 'super' || id === 'vp_turn') ok((ACTIONS[id].tags || []).includes('chaos'), `action ${id} is missing the chaos tag`);
{
  META.settings.chaos = false;
  const s = adult(30);
  ctx.grantPower(s);
  ok(ctx.actionList(s, 'super').length === 0, 'with Chaos off the Supernatural menu is empty');
  const before = JSON.stringify(s.player);
  ctx.chaosTick(s);
  ok(JSON.stringify(s.player) === before, 'with Chaos off the yearly tick changes nothing');
  META.settings.chaos = true;
}

/* 2. powers ---------------------------------------------------------------- */
{
  const kid = adult(10);
  for (let i = 0; i < 20; i++) ctx.grantPower(kid);
  const mine = kid.people[kid.playerId].powers;
  ok(mine.length === Object.keys(POWERS).length && new Set(mine).size === mine.length, `powers never repeat (${mine.length})`);
  act(kid, 'pw_use');
  const labels = kid.pending[0].choices.map((c) => c.label).join('|');
  ok(!/poker|slot machine|club/.test(labels), 'a 10-year-old doesn’t see the poker, slot-machine or club uses');
  const s = adult(25);
  ctx.grantPower(s, 'flight');
  act(s, 'pw_reveal');
  ok(s.player.sup.outed && s.player.fame >= 25, 'revealing your powers makes you famous');
}

/* 3. capes ------------------------------------------------------------------- */
{
  const s = adult(25);
  ctx.grantPower(s, 'strength');
  act(s, 'cape_start');
  answer(s, 'hero');
  ok(s.pending[0] && s.pending[0].handler === 'capeName', 'picking a side asks for a name');
  answer(s, undefined, 'Captain Test');
  const u = s.player.sup;
  ok(u.side === 'hero' && u.alias === 'Captain Test', `you're a hero called ${u.alias}`);
  const n = s.people[u.nemesis];
  ok(n && n.powers && n.powers.length && n.alias && s.player.rels[n.id].kind === 'enemy', 'a nemesis with powers and a villain name appears');
  for (let i = 0; i < 30 && u.rank < 4; i++) ctx.addRep(s, 5);
  ok(u.rank === 4 && ctx.capeRank(s) === 'World guardian', `reputation climbs the ranks (${ctx.capeRank(s)})`);
  u.outed = true;
  s.player.lastFinance = { year: s.year, inc: [], exp: [], invest: 0 };
  const cash = s.player.money;
  ctx.capeYear(s);
  ok(s.player.money > cash, 'an outed hero earns sponsorships');
  const v = adult(25);
  ctx.grantPower(v, 'invisible');
  act(v, 'cape_start'); answer(v, 'villain'); answer(v, undefined, '');
  ok(v.player.sup.side === 'villain' && v.player.sup.alias.length > 0, 'an empty name gets a generated villain name');
}

/* 4. vampires ---------------------------------------------------------------- */
{
  const s = adult(30);
  const me = s.people[s.playerId];
  ctx.makeVampire(s, me);
  ok(me.frozenAge === 30 && me.vamp, 'turned at 30');
  for (let i = 0; i < 120 && !s.dead; i++) { s.player.blood.hunger = 0; s.player.blood.hunt = 0; drain(s); ctx.ageUp(s); }
  drain(s);
  ok(!s.dead || /hunter|sunrise|starv/.test(me.cause || ''), `a well-fed vampire doesn’t die of old age (cause: ${me.cause})`);
  ok(ctx.bodyAge(s, me) === 30 && ctx.ageOf(s, me) >= 140, `a 150-year-old vampire still has a 30-year-old body (${ctx.bodyAge(s, me)})`);
  const mate = ctx.makeAdultNear(s, {});
  ok(!ctx.canConceive(me, mate) && !ctx.canConceive(mate, me), 'vampires can’t have children');
  const teen = ctx.makePerson(s, { age: 16, country: 'us' });
  ctx.setRel(s, teen.id, 'friend', 90);
  ok(!ctx.actionList(s, 'person', teen.id).some((a) => a.id === 'vp_turn'), 'nobody under 18 can be turned');
  ctx.cureVampire(s, me);
  ok(!me.vamp && ctx.ageOf(s, me) === 30, 'the cure picks aging back up from the age you looked');
}

/* 5. ascension ----------------------------------------------------------------- */
{
  const s = adult(50);
  const me = s.people[s.playerId];
  const mate = ctx.makeAdultNear(s, {}); ctx.setRel(s, mate.id, 'spouse', 80); me.partner = mate.id; mate.partner = me.id;
  const kid = ctx.bornChild(s, mate.id, 'Ana', 'f'); kid.birthYear = s.year - 22;
  s.player.karma = 96;
  ok(ctx.eventEligible(s, EVENTS.asc_choir), 'a saint over 40 can be offered ascension');
  ctx.fireEvent(s, EVENTS.asc_choir);
  ctx.resolvePopup(s, s.pending[0].id, 0);
  ok(s.dead && s.ancestor && s.ancestor.kind === 'angel', 'ascending ends the life and leaves an ancestor');
  ok(/ascending/.test(me.cause) && s.lineage[s.lineage.length - 1].title === 'Archangel', `the legacy title is Archangel (${s.lineage[s.lineage.length - 1].title})`);
  s.pending = [];
  ctx.continueAs(s, kid.id);
  ok(ctx.eventEligible(s, EVENTS.anc_angel), 'the next generation hears from the archangel');
}

if (failures) { console.log(`\n❌ ${failures} chaos check failures.`); process.exit(1); }
console.log('✅ Chaos checks passed.');
