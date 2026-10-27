// Abduction, captivity, the paper and the ransom note:  node dev/verify/kidnap.mjs
//
// Covers 78-secret-space.js, 79-news.js and 80-ransom.js:
//   1. gating       — off by default; Mature alone is not enough; with either off nothing here exists
//   2. adults only  — nobody under 18 is ever offered, taken, held or ransomed, and the player is 18+
//   3. house rules  — nothing sexual or graphic in the text; every step has a way out
//   4. the spaces   — the six rooms are renovation projects: catalog, cost, value, integrity, contractor tips
//   5. taking       — the list of strangers, "someone you know", every approach, success, failure, the case
//   6. holding      — care (limits, costs), the meters, neglect, despair, abandonment, natural death
//   7. getting out  — escape odds by room, letting them go, surrendering, knocks, a partner, a search
//   8. a death      — the "what now" after a captive dies, including paying someone
//   9. the paper    — articles, detective hints by progress, nicknames, the sheet, filler, the cap
//  10. ransom notes — who, from whom, every choice, every kind of ending, never a child, never a captive
//  11. long runs    — decades of it stay in range and save whole
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from './loadgame.mjs';

const ctx = loadGame({ quiet: true });
const g = (name) => ctx.run(name);
ctx.seedRng(7601);
ctx.console.error = () => {};
let failures = 0, checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) { failures++; console.log('  ✖ ' + msg); } };
const META = g('META'), ACTIONS = g('ACTIONS'), EVENTS = g('EVENTS'), CRIMES = g('CRIMES'), SPACES = g('SPACES'), RPROJ = g('RENOVATION_PROJECTS');
const clone = (s) => JSON.parse(JSON.stringify(s));
const P = (s) => s.people[s.playerId];
const pop = (s, handler) => s.pending.find((p) => p.handler === handler);
const BAD_TEXT = /undefined|NaN|\[who\]|\[first\]|\[object|\{\{|\{~/;
const setOn = (mature, violence) => { META.settings.mature = mature; META.settings.mature_violence = violence; };
const adultLife = (age, o) => {
  const s = ctx.createLife(Object.assign({ country: 'us', year: 2000 }, o || {}));
  s.year = 2000 + age; s.pending = [];
  s.player.edu.current = null; s.player.money = 5e6;
  return s;
};
// A home you live in, with the spaces you name already built.
const homeWith = (s, ...ids) => {
  const a = { id: 'h1', kind: 'house', name: 'Maple House', type: 'house', value: 400000, cond: 80, units: 1, tenants: [], renovations: ids.map((id) => ({ id, unit: 0, quality: 'great', year: s.year })) };
  s.player.assets.push(a);
  s.player.housing = { type: 'own', assetId: 'h1', rent: 0, name: a.name };
  return a;
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
const act = (s, id, t) => { s.pending = []; return ctx.doAction(s, id, t); };
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'src', 'srcfiles', 'js');
// Put someone in a space directly, with the state of a few minutes after.
const hold = (s, space, o) => {
  const p = (o && o.p) || ctx.makeAdultNear(s, { minAge: 25, maxAge: 40 });
  const key = 'h1:' + space;
  ctx.capTake(s, p, key);
  s.pending = [];
  return p;
};

/* 1. gating ------------------------------------------------------------------------------ */
{
  for (const [m, v] of [[false, false], [true, false], [false, true]]) {
    setOn(m, v);
    const s = adultLife(30); homeWith(s, 'ss_basement');
    ok(!ctx.actionAvailable(ACTIONS.kn_kidnap, s, null), `no kidnap action with mature=${m} violence=${v}`);
    const q = person(s, 'friend', 60);
    ok(!ctx.actionAvailable(ACTIONS.kn_kidnap_person, s, q.id), 'and none on a person');
    ok(!ctx.eventEligible(s, EVENTS.kn_ransom), 'no ransom notes');
    ctx.capYear(s); ctx.newsYear(s);
    ok(!s.player.kn || !s.player.kn.cap, 'nothing is held');
    s.pending = []; act(s, 'asset_project', 'h1');
    const proj = pop(s, 'renovPickProject');
    ok(!proj || !proj.choices.some((c) => SPACES[c.value]), 'and the rooms are not in the renovation catalog');
  }
  setOn(true, true);
  const s = adultLife(30); homeWith(s);
  act(s, 'asset_project', 'h1');
  const proj = pop(s, 'renovPickProject');
  ok(!!proj && Object.keys(SPACES).every((id) => proj.choices.some((c) => c.value === id)), 'with the switches on, all six rooms are in the catalog');
  setOn(false, false);
}

/* 2. adults only ---------------------------------------------------------------------------- */
{
  setOn(true, true);
  const kid = ctx.createLife({ country: 'us', year: 2000 }); kid.year = 2016; kid.pending = []; kid.player.money = 5e6;
  homeWith(kid, 'ss_basement');
  ok(!ctx.actionAvailable(ACTIONS.kn_kidnap, kid, null), 'a minor cannot take anyone');
  const s = adultLife(30); homeWith(s, 'ss_basement');
  for (let i = 0; i < 40; i++) for (const p of ctx.knProfiles(s, 3)) ok(ctx.ageOf(s, p) >= 18, 'every profile on offer is an adult');
  // a minor you know cannot be taken
  const teen = ctx.makeAdultNear(s, { minAge: 18, maxAge: 18 }); teen.birthYear = s.year - 15; ctx.setRel(s, teen.id, 'friend', 60);
  ok(!ctx.actionAvailable(ACTIONS.kn_kidnap_person, s, teen.id), 'a child you know cannot be taken');
  const t2 = s.people[teen.id]; ctx.knStart(s, t2.id); ok(!pop(s, 'knHow') && !pop(s, 'knWhere'), 'and the flow refuses to start for one');
  // ransom targets are adults
  for (let i = 0; i < 60; i++) { const l = adultLife(40); const c = person(l, 'child', 70); c.birthYear = l.year - 10; person(l, 'friend', 60); const b = ctx.ransomBuild(l); ok(!b || ctx.ageOf(l, l.people[b.pid]) >= 18, 'a ransom note is never about a child'); }
  setOn(false, false);
}

/* 3. house rules -------------------------------------------------------------------------------- */
{
  const banned = /\b(rape|raped|sexual|sexually|molest|torture|tortured|gore|gory|dismember|mutilat|strangle|bury the body|dispose of the body|chain(ed)? to|whip|beat(en)? (them|her|him))\b/i;
  for (const f of ['78-secret-space.js', '79-news.js', '80-ransom.js']) {
    const lines = fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n');
    lines.forEach((l, i) => { if (!/^\s*(\/\/|\*|\/\*)/.test(l) && !/^ \*/.test(l)) ok(!banned.test(l), `${f}:${i + 1} has nothing it should not (${l.trim().slice(0, 70)})`); });
  }
  setOn(true, true);
  // every popup in the flow has a way out
  const s = adultLife(30); homeWith(s, 'ss_basement');
  act(s, 'kn_kidnap');
  const p = pop(s, 'knPick');
  ok(!!p && p.choices.length === 4 && p.choices.some((c) => c.value === null), 'three strangers and "Not tonight"');
  const t = p.choices[0].value; choose(s, 'knPick', t);
  const h = pop(s, 'knHow');
  ok(!!h && h.choices.some((c) => c.value === null), 'the approach has "Not tonight" too');
  choose(s, 'knHow', null);
  ok(!(s.player.kn && s.player.kn.cap), 'and walking away takes no one');
  ok(!s.player.life.kidnaps, 'and is not counted');
  setOn(false, false);
}

/* 4. the spaces -------------------------------------------------------------------------------- */
{
  setOn(true, true);
  const ids = Object.keys(SPACES);
  ok(ids.length === 6 && ['ss_attic', 'ss_garage', 'ss_shed', 'ss_basement', 'ss_secret_room', 'ss_dungeon'].every((i) => ids.includes(i)), 'attic, garage, shed, basement, hidden room and dungeon');
  ok(ids.every((id) => RPROJ[id] && RPROJ[id].secret && RPROJ[id].tags.includes('mature_violence') && !RPROJ[id].shared), 'each is an unshared renovation behind the switches');
  const by = (k) => ids.slice().sort((a, b) => SPACES[b][k] - SPACES[a][k]);
  ok(by('integ')[0] === 'ss_dungeon' && by('conceal')[0] === 'ss_secret_room' && by('risk')[0] === 'ss_dungeon' && by('comfort')[0] === 'ss_dungeon' || by('comfort')[0] === 'ss_dungeon', 'the dungeon is the strongest, and the most likely to be reported');
  ok(SPACES.ss_dungeon.valBoost < 0 && SPACES.ss_basement.valBoost > SPACES.ss_attic.valBoost, 'a dungeon costs value, a finished basement adds it');
  ok(SPACES.ss_shed.integ < SPACES.ss_attic.integ && SPACES.ss_attic.integ < SPACES.ss_basement.integ && SPACES.ss_basement.integ < SPACES.ss_dungeon.integ, 'the rooms are ranked');
  ok(SPACES.ss_dungeon.base > SPACES.ss_secret_room.base && SPACES.ss_secret_room.base > SPACES.ss_basement.base && SPACES.ss_shed.base < SPACES.ss_garage.base, 'and priced');
  // building them
  for (const id of ids) for (const tier of ['budget', 'reputable', 'luxury']) for (const quality of ['botched', 'great', 'flawless']) {
    const s = adultLife(30); const a = homeWith(s); const v0 = a.value;
    const r = ctx.ssBuilt(s, a, RPROJ[id], 0, quality, tier);
    ok(a.renovations.some((x) => x.id === id && x.quality === quality), `${id}/${tier}/${quality}: it is built`);
    ok(typeof r.text === 'string' && !BAD_TEXT.test(r.text), 'with a clean ending');
    if (SPACES[id].valBoost > 0) ok(a.value > v0, `${id} adds value`); else ok(a.value < v0, `${id} costs value`);
    drain(s);
    const sp = ctx.ssSpaces(s).find((x) => x.id === id);
    ok(!!sp && sp.integ === Math.round(SPACES[id].integ * ({ flawless: 1.1, great: 1, botched: 0.75 }[quality])), 'and its integrity follows the work');
  }
  // contractors talk: the dungeon more than the shed
  const tipped = {};
  for (const id of ['ss_shed', 'ss_dungeon']) { tipped[id] = 0; for (let i = 0; i < 150; i++) { const s = adultLife(30); const a = homeWith(s); ctx.ssBuilt(s, a, RPROJ[id], 0, 'great', 'reputable'); if (pop(s, 'ssTip')) tipped[id]++; drain(s); } }
  ok(tipped.ss_dungeon > tipped.ss_shed * 3 && tipped.ss_dungeon > 40, `contractors report a dungeon far more than a shed (${tipped.ss_dungeon} vs ${tipped.ss_shed} in 150)`);
  for (const how of ['smile', 'lawyer', 'pay', 'ignore']) for (let i = 0; i < 15; i++) { const s = adultLife(30); const a = homeWith(s); for (let k = 0; k < 30 && !pop(s, 'ssTip'); k++) ctx.ssBuilt(s, a, RPROJ.ss_dungeon, 0, 'great', 'reputable'); ok(!!pop(s, 'ssTip'), 'a tip arrives eventually'); const h0 = ctx.knOf(s).heat; choose(s, 'ssTip', how); ok(ctx.knOf(s).heat >= h0, `${how}: it leaves some attention on the house`); drain(s); }
  // only the home you live in counts
  { const s = adultLife(30); homeWith(s, 'ss_basement'); s.player.housing = { type: 'rent', assetId: null, rent: 0, name: '' }; ok(ctx.ssSpaces(s).length === 0, 'a room in a house you do not live in is not a room you can use'); }
  setOn(false, false);
}

/* 5. taking --------------------------------------------------------------------------------------- */
{
  setOn(true, true);
  const mk = (space, o) => { const s = adultLife(30); homeWith(s, space || 'ss_basement'); s.player.skills.streetwise = 50; s.player.skills.charisma = 50; s.player.skills.fitness = 50; return s; };
  ok(!ctx.actionAvailable(ACTIONS.kn_kidnap, adultLife(30), null), 'without a room, nobody is taken');
  // each way, many seeds
  const res = { lure: { ok: 0, no: 0 }, ambush: { ok: 0, no: 0 }, plan: { ok: 0, no: 0 } };
  for (const how of ['lure', 'ambush', 'plan']) for (let i = 0; i < 80; i++) {
    const s = mk(); const k0 = s.player.karma; act(s, 'kn_kidnap'); const target = pop(s, 'knPick').choices[0].value; choose(s, 'knPick', target);
    choose(s, 'knHow', how === 'plan' ? 'plan' : how);
    if (how === 'plan') { ok(!!pop(s, 'knHow2'), 'watching first leads to a second decision'); choose(s, 'knHow2', 'lure'); }
    const took = s.player.kn && s.player.kn.cap;
    (took ? res[how].ok++ : res[how].no++);
    if (took) {
      const c = s.player.kn.cap, p = s.people[c.pid];
      ok(ctx.relKind(s, c.pid) === 'captive' && ctx.ageOf(s, p) >= 18, 'they are held, as a captive, and an adult');
      ok(c.supplies === 100 && c.health > 0 && c.integ > 0, 'with full supplies and a room that holds');
      ok(!ctx.relPeople(s).some((q) => q.id === c.pid), 'they are not in anybody’s list of people you know');
      ok(!ctx.reachable(s, c.pid), 'and you cannot "spend time" with them');
      ok(Object.values(s.inv.list).some((x) => x.crime === 'kidnapping' && x.victim === c.pid), 'a missing-person case opens');
      ok(secretsOf(s).some((x) => x.kind === 'crime' && x.crime === 'kidnapping' && x.other === c.pid), 'and a secret in the web');
      ok((s.news || []).some((a) => a.kind === 'missing' && a.you), 'and it is in the paper');
      ok(s.player.vio.haunt >= 20 && s.player.karma <= k0 - 25, 'and it weighs');
    } else {
      ok(!Object.values(s.web && s.web.secrets || {}).some((x) => x.crime === 'kidnapping'), 'a failure holds no one');
    }
    drain(s);
  }
  for (const how of ['lure', 'ambush']) ok(res[how].ok > 5 && res[how].no > 5, `${how}: it can work and it can fail (${res[how].ok}/${res[how].no})`);
  // failures are attempts: a case, a paper, sometimes an arrest
  { let cases = 0, arrests = 0; for (let i = 0; i < 80; i++) { const s = mk(); const p = ctx.makeAdultNear(s, { minAge: 25, maxAge: 40 }); s.player.skills.streetwise = 0; ctx.knStart(s, p.id); choose(s, 'knHow', 'ambush'); if (!s.player.kn || !s.player.kn.cap) { if (Object.values(s.inv.list).some((x) => x.crime === 'attempted_kidnapping')) cases++; if (s.pending.some((q) => q.handler === 'trial')) arrests++; } drain(s); } ok(cases > 5, `a failed attempt is a case (${cases})`); ok(arrests >= 1, `and sometimes an arrest (${arrests})`); }
  // someone you know
  { const s = mk(); const p = person(s, 'partner', 70); ok(ctx.actionAvailable(ACTIONS.kn_kidnap_person, s, p.id), 'you can take someone you know'); for (let i = 0; i < 60 && !(s.player.kn && s.player.kn.cap); i++) { ctx.knResolve(s, p.id, 'h1:ss_basement', 'lure', 0.3); s.pending = []; } if (s.player.kn.cap) { ok(ctx.relKind(s, p.id) === 'captive' && !ctx.romanticId(s), 'a partner who is taken is no longer your partner'); ok(s.player.kn.cap.was === 'partner', 'and the game remembers what they were'); } }
  // more than one room asks which
  { const s = adultLife(30); homeWith(s, 'ss_basement', 'ss_attic'); const p = ctx.makeAdultNear(s, { minAge: 25, maxAge: 40 }); ctx.knStart(s, p.id); const w = pop(s, 'knWhere'); ok(!!w && w.choices.length === 3 && w.choices.some((c) => c.value === null), 'with two rooms, you choose'); }
  // one at a time
  { const s = mk(); const p = hold(s, 'ss_basement'); void p; ok(!ctx.actionAvailable(ACTIONS.kn_kidnap, s, null), 'only one at a time'); }
  setOn(false, false);
}

/* 6. holding ---------------------------------------------------------------------------------------- */
{
  setOn(true, true);
  const mk = (space) => { const s = adultLife(30); homeWith(s, space || 'ss_basement'); s.player.skills.streetwise = 50; return s; };
  { const s = mk(); hold(s, 'ss_basement'); const c = s.player.kn.cap;
    for (const id of ['feed', 'med', 'comf', 'rein']) ok(ctx.actionAvailable(ACTIONS['cap_' + id], s, null), `care is on the menu: ${id}`);
    ok(!ctx.actionAvailable(ACTIONS.cap_feed, mk(), null), 'and only when you are holding someone');
    const m0 = s.player.money; c.supplies = 20; c.health = 40; c.spirit = 40; c.integ = 30;
    act(s, 'cap_feed'); ok(c.supplies === 100 && s.player.money < m0, 'feeding fills the supplies, and costs');
    act(s, 'cap_feed'); ok(!ctx.actionAvailable(ACTIONS.cap_feed, s, null), 'twice a year at most');
    act(s, 'cap_med'); ok(c.health > 40, 'medicine helps'); ok(!ctx.actionAvailable(ACTIONS.cap_med, s, null), 'once a year');
    act(s, 'cap_comf'); ok(c.spirit > 40, 'comfort lifts the spirit');
    act(s, 'cap_rein'); ok(c.integ > 30 && c.integ <= ctx.ssSpaces(s)[0].integ, 'reinforcing helps, up to what the room can hold');
    ok(s.player.kn.heat > 0, 'every visit leaves a little attention'); drain(s);
    // poor
    const poor = mk(); hold(poor, 'ss_basement'); poor.player.money = 0; poor.pending = []; act(poor, 'cap_feed'); ok(poor.player.kn.cap.yr.fed === 0, 'if you cannot pay, nothing happens'); }
  // neglect: a captive left alone does not last
  { let died = 0, years = []; for (let i = 0; i < 40; i++) { const s = mk(); hold(s, 'ss_basement'); let y = 0; for (; y < 8 && s.player.kn.cap; y++) { s.year++; s.player.counters = {}; ctx.capYear(s); drain(s, (p, open) => open[open.length - 1]); } if (!s.player.kn.cap) { died++; years.push(y); } } ok(died > 25, `a captive left alone does not survive (${died}/40 within 8 years)`); ok(Math.min(...years) >= 1, 'but not on the first day'); }
  // cared for, they last
  { let alive = 0, runs = 40; for (let i = 0; i < runs; i++) { const s = mk('ss_dungeon'); s.player.money = 1e8; hold(s, 'ss_dungeon'); let y = 0; for (; y < 6 && s.player.kn.cap; y++) { s.year++; s.player.counters = {}; for (const id of ['cap_feed', 'cap_feed', 'cap_med', 'cap_comf', 'cap_rein']) if (s.player.kn.cap && ctx.actionAvailable(ACTIONS[id], s, null)) act(s, id); ctx.capYear(s); drain(s); } if (s.player.kn.cap) alive++; } ok(alive > runs * 0.25, `with care and a strong room, many are still held after six years (${alive}/${runs})`); }
  // the room matters
  const outs = {};
  for (const sp of ['ss_shed', 'ss_garage', 'ss_attic', 'ss_basement', 'ss_secret_room', 'ss_dungeon']) { outs[sp] = 0; for (let i = 0; i < 120; i++) { const s = mk(sp); s.player.money = 1e8; hold(s, sp); for (let y = 0; y < 3 && s.player.kn.cap; y++) { s.year++; s.player.counters = {}; for (const id of ['cap_feed', 'cap_med', 'cap_comf']) if (ctx.actionAvailable(ACTIONS[id], s, null)) act(s, id); const k0 = s.player.kn.freed; ctx.capYear(s); if (s.player.kn.freed > k0 && s.pending.some((q) => q.handler === 'capEscape')) outs[sp]++; drain(s, (p, open) => open[open.length - 1]); } } }
  ok(outs.ss_shed > outs.ss_basement && outs.ss_basement > outs.ss_dungeon, `weaker rooms lose people more (${JSON.stringify(outs)})`);
  // abandoned in prison
  { let dead = 0; for (let i = 0; i < 30; i++) { const s = mk(); hold(s, 'ss_basement'); s.player.prison = { yearsLeft: 4, total: 4, served: 0, crime: 'burglary', behavior: 50, juvie: false, name: 'X', gang: null }; s.year++; ctx.capYear(s); drain(s); if (!s.player.kn.cap) dead++; } ok(dead > 15, `while you are in prison, nobody comes (${dead}/30)`); }
  // natural death, or the person being gone
  { const s = mk(); const p = hold(s, 'ss_basement'); p.alive = false; s.year++; ctx.capYear(s); ok(!s.player.kn.cap && s.player.kn.lost === 1, 'a captive who dies of something else is still your doing'); drain(s); }
  { const s = mk(); hold(s, 'ss_basement'); s.player.assets.length = 0; s.year++; ctx.capYear(s); ok(!s.player.kn.cap, 'if the house is gone, so is the secret'); drain(s); }
  setOn(false, false);
}

/* 7. getting out ------------------------------------------------------------------------------------------ */
{
  setOn(true, true);
  const mk = (sp) => { const s = adultLife(30); homeWith(s, sp || 'ss_basement'); s.player.skills.streetwise = 50; return s; };
  // let them go
  for (const how of ['run', 'surrender']) for (let i = 0; i < 12; i++) { const s = mk(); const p = hold(s, 'ss_basement'); const h0 = s.player.vio.haunt; act(s, 'kn_release'); const rp = pop(s, 'capRelease'); ok(rp.choices.some((c) => c.value === null), 'you can change your mind'); choose(s, 'capRelease', how); ok(!s.player.kn.cap && s.player.kn.freed === 1, `${how}: they are free`); ok(s.player.vio.haunt <= h0, 'and it eases a little'); ok(ctx.relKind(s, p.id) === 'enemy', 'they are no longer held'); ok((s.news || []).some((a) => a.kind === 'found'), 'the paper reports it'); if (how === 'surrender') ok(s.pending.some((q) => q.handler === 'trial') || s.player.prison, 'surrendering ends in an arrest'); drain(s); }
  { const s = mk(); hold(s, 'ss_basement'); act(s, 'kn_release'); choose(s, 'capRelease', null); ok(!!s.player.kn.cap, 'cancelling leaves things as they were'); }
  // escape
  for (const how of ['run', 'scrub', 'wait']) for (let i = 0; i < 15; i++) { const s = mk(); const p = hold(s, 'ss_basement'); ctx.capEscape(s, s.player.kn.cap, p); ok(!s.player.kn.cap, 'an escaped captive is not held'); choose(s, 'capEscape', how); drain(s); }
  // a knock
  for (const how of ['warm', 'door', 'free']) for (let i = 0; i < 15; i++) { const s = mk(); hold(s, 'ss_basement'); ctx.capKnock(s, s.player.kn.cap, ctx.ssSpaces(s)[0]); const h0 = s.player.kn.heat; choose(s, 'capKnock', how); if (how === 'free') ok(!s.player.kn.cap, 'letting them go ends it'); else ok(s.player.kn.heat >= h0, 'a knock leaves attention'); drain(s); }
  // a partner
  for (const how of ['explain', 'tell', 'free']) for (let i = 0; i < 15; i++) { const s = mk(); hold(s, 'ss_basement'); const rom = person(s, 'partner', 70); ctx.capHome(s, s.player.kn.cap); ok(!!pop(s, 'capHome'), 'a partner can notice'); choose(s, 'capHome', how); if (how === 'free') ok(!s.player.kn.cap, 'and you can end it in front of them'); drain(s); void rom; }
  // a search
  for (const how of ['open', 'lawyer', 'free']) for (let i = 0; i < 15; i++) { const s = mk(); hold(s, 'ss_basement'); const cs = ctx.invMine(s, (x) => x.crime === 'kidnapping')[0]; ctx.capSearch(s, s.player.kn.cap, cs); ok(pop(s, 'capSearch').choices.some((c) => c.value === 'free'), 'there is a way to end it'); choose(s, 'capSearch', how); drain(s); }
  { let found = 0, hidden = 0; for (let i = 0; i < 60; i++) { const s = mk(); hold(s, 'ss_basement'); const cs = ctx.invMine(s, (x) => x.crime === 'kidnapping')[0]; ctx.capSearch(s, s.player.kn.cap, cs); choose(s, 'capSearch', 'open'); if (!s.player.kn.cap) found++; else hidden++; drain(s); } ok(found > 3 && hidden > 3, `a search can find them and can miss (${found}/${hidden})`); }
  { const a = (sp) => { let f = 0; for (let i = 0; i < 80; i++) { const s = adultLife(30); homeWith(s, sp); hold(s, sp); const cs = ctx.invMine(s, (x) => x.crime === 'kidnapping')[0]; ctx.capSearch(s, s.player.kn.cap, cs); choose(s, 'capSearch', 'open'); if (!s.player.kn.cap) f++; drain(s); } return f; }; ok(a('ss_secret_room') < a('ss_garage'), 'a hidden room survives a search better than a garage'); }
  // the year can bring any of it
  { let seen = new Set(); for (let i = 0; i < 400; i++) { const s = mk('ss_shed'); s.player.money = 1e8; person(s, 'partner', 70); hold(s, 'ss_shed'); s.player.kn.heat = 60; const cs = ctx.invMine(s, (x) => x.crime === 'kidnapping')[0]; cs.prog = 75; s.year++; s.player.counters = {}; ctx.capYear(s); for (const p of s.pending) seen.add(p.handler); drain(s); } ok(['capKnock', 'capEscape', 'capHome', 'capSearch'].every((h) => seen.has(h)), `every kind of trouble turns up (${[...seen].join(',')})`); }
  setOn(false, false);
}

/* 8. a death ------------------------------------------------------------------------------------------------ */
{
  setOn(true, true);
  const mk = () => { const s = adultLife(30); homeWith(s, 'ss_basement'); s.player.skills.streetwise = 50; person(s, 'friend', 70); return s; };
  { const s = mk(); const p = hold(s, 'ss_basement'); const c = s.player.kn.cap; ctx.capDie(s, c, 'neglect');
    ok(!p.alive && !s.player.kn.cap && s.player.kn.lost === 1, 'they die, and are not held any more');
    ok(secretsOf(s).some((x) => x.kind === 'killing' && x.other === p.id), 'and it is a killing in the web');
    ok(Object.values(s.inv.list).some((x) => x.crime === 'murder' && x.victim === p.id), 'and a murder case');
    const ap = pop(s, 'vioAfter'); ok(!!ap && ap.choices.map((c2) => c2.value).join() === 'hire,clean,scrub,friend,confess', 'what now: pay someone, handle it, a friend, or give yourself up');
    ok(/neglect|despair/.test(ap.text), 'with words that fit');
    ok((s.news || []).some((a) => a.kind === 'body'), 'and the paper reports it'); }
  for (const how of ['hire', 'clean', 'scrub', 'friend', 'confess']) for (let i = 0; i < 20; i++) { const s = mk(); hold(s, 'ss_basement'); ctx.capDie(s, s.player.kn.cap, 'neglect'); const sec0 = secretsOf(s).length; choose(s, 'vioAfter', how); if (how === 'hire') ok(secretsOf(s).length > sec0, 'paying someone means someone knows'); drain(s); }
  { let down = 0, up = 0; for (let i = 0; i < 60; i++) { const s = mk(); hold(s, 'ss_basement'); ctx.capDie(s, s.player.kn.cap, 'neglect'); const c = ctx.invMine(s, (x) => x.crime === 'murder')[0]; const t0 = c.ev.trace; choose(s, 'vioAfter', 'hire'); if (c.ev.trace < t0) down++; else if (c.ev.trace > t0) up++; drain(s); } ok(down > 20 && up > 3, `paying someone mostly works, and sometimes does not (${down}/${up})`); }
  { const s = mk(); hold(s, 'ss_basement'); ctx.capDie(s, s.player.kn.cap, 'neglect'); ok(!pop(s, 'serTurn'), 'a death in care is not "the turn" of a serial arc'); }
  setOn(false, false);
}

/* 9. the paper ------------------------------------------------------------------------------------------------ */
{
  setOn(true, true);
  const T = g('NEWS_T');
  for (const k of Object.keys(T)) for (const [h, b] of T[k]) ok(h && b && !/undefined/.test(h + b), `${k}: an article with a headline and a story`);
  { const s = adultLife(30); homeWith(s, 'ss_basement'); ctx.newsYear(s); ok(s.news.length === 2 && s.news.every((a) => a.kind === 'filler' && !a.you), 'a quiet year gets two ordinary stories'); ctx.newsYear(s); ok(s.news.length === 2, 'and only two a year'); }
  { const s = adultLife(30); homeWith(s, 'ss_basement'); hold(s, 'ss_basement'); const a = s.news.find((x) => x.kind === 'missing'); ok(a && a.you && /\w/.test(a.head) && !BAD_TEXT.test(a.head + a.body), 'a missing person is the news'); }
  // detective hints by progress
  { const s = adultLife(30); homeWith(s, 'ss_basement'); hold(s, 'ss_basement'); const c = ctx.invMine(s, (x) => x.crime === 'kidnapping')[0]; const kinds = () => s.news.map((a) => a.kind);
    c.prog = 20; ctx.newsYear(s); ok(kinds().includes('hint1') && !kinds().includes('hint2'), 'first, detectives are canvassing');
    c.prog = 45; ctx.newsYear(s); ok(kinds().includes('hint2'), 'then there is a person of interest');
    c.prog = 80; ctx.newsYear(s); ok(kinds().includes('hint3'), 'then an arrest is days away');
    ok(JSON.stringify(s.log || []).includes('gray sedan'), 'and a car is parked across the street');
    ctx.newsYear(s); ok(kinds().filter((k) => k === 'hint1').length === 1, 'each step is written once'); }
  { const s = adultLife(30); homeWith(s, 'ss_basement'); hold(s, 'ss_basement'); const c = ctx.invMine(s, (x) => x.crime === 'kidnapping')[0]; c.nick = 'The Quiet Visitor'; ctx.newsYear(s); ok(s.news.some((a) => a.kind === 'nickname' && /Quiet Visitor/.test(a.head + a.body)), 'a press nickname is a headline'); }
  { const s = adultLife(30); homeWith(s, 'ss_basement'); hold(s, 'ss_basement'); s.year += 2; ctx.newsYear(s); ok(s.news.some((a) => a.kind === 'search'), 'the search goes on in the paper'); }
  { const s = adultLife(30); ctx.webFact(s, 'arrested', { crime: 'burglary' }); ok(s.news.some((a) => a.kind === 'arrest'), 'a conviction makes the paper'); }
  { const s = adultLife(30); for (let i = 0; i < 200; i++) ctx.newsPost(s, 'filler', {}, false); ok(s.news.length === 80, 'the paper is capped at eighty'); }
  { const s = adultLife(30); homeWith(s, 'ss_basement'); ctx.newsPost(s, 'reno', {}); ok(s.news.at(-1).kind === 'reno', 'a strange renovation is noticed'); }
  { const s = adultLife(5); ctx.newsPost(s, 'missing', { name: 'X', full: 'X Y', age: 30, ties: 2 }); ok((s.news || []).length === 0, 'a young child does not make the news'); }
  setOn(false, false);
}

/* 10. ransom notes ----------------------------------------------------------------------------------------------- */
{
  setOn(true, true);
  const RT = g('RANSOM_TYPES'), RREV = g('RANSOM_REVEALS');
  const mk = () => { const s = adultLife(40); person(s, 'ex', 20); person(s, 'friend', 60); person(s, 'sibling', 80); return s; };
  ok(Object.keys(RREV).every((k) => RREV[k].length >= 4) && RREV.self.length >= 10, 'plenty of ways for a hoax to come apart');
  { const s = adultLife(40); s.player.rels = {}; ok(!ctx.eventEligible(s, EVENTS.kn_ransom), 'nobody to ransom, no note'); }
  { const s = mk(); ok(ctx.eventEligible(s, EVENTS.kn_ransom), 'with people you know, a note can arrive'); }
  // what the note says
  const types = new Set(), truths = new Set(), objs = new Set();
  for (let i = 0; i < 400; i++) {
    const s = mk(); const c = ctx.ransomBuild(s);
    types.add(c.type); truths.add(c.truth); objs.add(c.obj);
    ok(RT[c.type] && (c.truth === 'real' || c.truth === 'hoax') && c.amt > 0, 'a well-formed note');
    if (RT[c.type].real === 0) ok(c.truth === 'hoax', `${c.type} is always a hoax`);
    if (RT[c.type].real === 1) ok(c.truth === 'real', `${c.type} is always real`);
    const text = EVENTS.kn_ransom.text(s, c);
    ok(/^A ransom note is attached to your door with .+\. It reads: "We have kidnapped .+ \(.+\)\. Send us .+, or else we will .+\."$/.test(text) && !BAD_TEXT.test(text), `the note reads like a note: ${text.slice(0, 80)}`);
    ok(c.rel && c.full, 'it names them and what they are to you');
  }
  ok(types.size >= 6 && truths.size === 2 && objs.size >= 8, `variety: ${types.size} kinds of kidnapper, ${objs.size} kinds of object`);
  ok([...objs].some((o) => /bloody knife/.test(o)), 'the bloody knife is in there');
  // Money in a note is in the local currency: no plain "$123" in a life that never lived in the US.
  { let leaks = 0; for (let i = 0; i < 300; i++) { const s = adultLife(40, { country: 'ie' }); ctx.useCurrency(s); person(s, 'ex', 20); person(s, 'friend', 60); const c = ctx.ransomBuild(s); if (/\$\s?\d/.test(EVENTS.kn_ransom.text(s, c))) leaks++; for (const ci of [0, 1, 2, 3, 4, 5]) { const r = EVENTS.kn_ransom.choices[ci][1](adultLife(40, { country: 'ie' }), c); void r; } } ok(leaks === 0, `no dollar signs in a note outside the US (${leaks})`); }
  // rich players get the serious crews, poor ones do not
  { let rich = 0, poor = 0; for (let i = 0; i < 200; i++) { const a = mk(); a.player.money = 5e7; if (ctx.ransomBuild(a).type === 'syndicate') rich++; const b = mk(); b.player.money = 10; b.player.assets.length = 0; if (ctx.ransomBuild(b).type === 'syndicate') poor++; } ok(rich > 3 && poor === 0, `serious crews go after the rich (${rich} vs ${poor})`); }
  // every choice, every kind
  const how = ['pay', 'haggle', 'police', 'look', 'ignore', 'counter'];
  const endings = { good: 0, bad: 0, '': 0 }; const tragic = { n: 0 };
  for (let ci = 0; ci < 6; ci++) for (let i = 0; i < 80; i++) {
    const s = mk(); const c = ctx.ransomBuild(s);
    const r = EVENTS.kn_ransom.choices[ci][1](s, c);
    const res = typeof r === 'string' ? { text: r } : r;
    ok(res && res.text && !BAD_TEXT.test(res.text), `${how[ci]}/${c.truth}/${c.type}: a clean ending`);
    endings[res.tone || '']++;
    if (/did not come home/.test(res.text)) { tragic.n++; ok(c.truth === 'real' && RT[c.type].serious, 'a death only ever comes from a serious, real kidnapper'); ok(!s.people[c.pid].alive, 'and the person is dead'); }
    ok((s.news || []).some((a) => a.kind === 'ransom') && (s.news || []).some((a) => a.kind === 'ransom_end'), 'and it makes the paper twice');
    drain(s);
  }
  ok(endings.good > 20 && endings.bad > 20, `some good endings, some bad (${JSON.stringify(endings)})`);
  ok(tragic.n >= 0 && tragic.n < 40, `and a tragedy is rare (${tragic.n} in 480)`);
  // ignoring is funny, and often right, when it was a hoax
  { let funny = 0, n = 0; for (let i = 0; i < 300; i++) { const s = mk(); const c = ctx.ransomBuild(s); if (c.truth !== 'hoax') continue; n++; const r = EVENTS.kn_ransom.choices[4][1](s, c); if (r.tone === 'good') funny++; drain(s); } ok(n > 40 && funny === n, `doing nothing about a hoax is always the right call (${funny}/${n})`); }
  { let paid = 0, n = 0; for (let i = 0; i < 300; i++) { const s = mk(); const c = ctx.ransomBuild(s); if (c.truth !== 'hoax') continue; n++; const m0 = s.player.money; EVENTS.kn_ransom.choices[0][1](s, c); if (s.player.money < m0) paid++; drain(s); } ok(paid === n, 'but paying a hoax costs real money'); }
  // the person is never a captive
  { const s = adultLife(40); s.player.rels = {}; homeWith(s, 'ss_basement'); const only = person(s, 'friend', 60); hold(s, 'ss_basement', { p: only }); for (let i = 0; i < 30; i++) { const pk = ctx.ransomPick(s); ok(!pk || pk.id !== only.id, 'someone you are holding is not the one in the note'); } }
  setOn(false, false);
}

/* 11. long runs ---------------------------------------------------------------------------------------------------- */
{
  setOn(true, true);
  for (let n = 0; n < 8; n++) {
    const s = adultLife(30); homeWith(s, ['ss_shed', 'ss_attic', 'ss_basement', 'ss_secret_room', 'ss_dungeon', 'ss_garage'][n % 6]);
    s.player.money = 5e7; s.player.skills.streetwise = 40;
    for (let k = 0; k < 4; k++) person(s, ['friend', 'partner', 'coworker', 'sibling'][k], 60);
    for (let y = 0; y < 30 && !s.dead; y++) {
      s.year++; s.player.counters = {};
      if (s.player.prison && y % 5 === 4) s.player.prison = null;
      if (!(s.player.kn && s.player.kn.cap) && ctx.actionAvailable(ACTIONS.kn_kidnap, s, null) && y % 3 === 0) { const p = ctx.makeAdultNear(s, { minAge: 25, maxAge: 40 }); ctx.knResolve(s, p.id, ctx.ssSpaces(s)[0].key, 'lure', 0.3); }
      if (s.player.kn && s.player.kn.cap && y % 2 === 0) for (const id of ['cap_feed', 'cap_med', 'cap_comf']) if (ctx.actionAvailable(ACTIONS[id], s, null)) act(s, id);
      ctx.webTick(s); ctx.invTick(s); ctx.capYear(s); ctx.newsYear(s); ctx.vioYear(s);
      drain(s, (p, open) => open[Math.floor(Math.random() * open.length)]);
      const k = s.player.kn;
      if (k) {
        ok(k.heat >= 0 && k.heat <= 100, `heat in range @${y}`);
        if (k.cap) { const c = k.cap; ok([c.supplies, c.health, c.spirit, c.integ].every((v) => v >= 0 && v <= 100) && !!s.people[c.pid] && s.people[c.pid].alive && ctx.relKind(s, c.pid) === 'captive' && ctx.ageOf(s, s.people[c.pid]) >= 18, `the captive is whole, alive, an adult and a captive @${y}`); }
      }
      ok((s.news || []).length <= 80, 'the paper stays short');
    }
    ok(JSON.stringify(clone(s).player.kn) === JSON.stringify(s.player.kn) && JSON.stringify(clone(s).news) === JSON.stringify(s.news), 'the state and the paper save whole');
  }
  setOn(false, false);
}

console.log(failures ? `\n❌ ${failures} kidnapping checks failed.` : `✅ Kidnapping checks passed (${checks} checks).`);
process.exit(failures ? 1 : 0);
