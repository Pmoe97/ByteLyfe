// The web, part two verification:  node dev/verify/web2.mjs
//
// Covers 81-web2.js and the hooks it added to the older systems:
//   1. good name   — charity, volunteering, medals and organizing raise it, with diminishing returns; a pillar of the
//                    community needs name and deeds; a good name softens a scandal and helps at the ballot box
//   2. the bus     — business events and failures, verdicts, a burned spy and a memoir reach your name and the paper
//   3. secrets     — a deserter's, an informant's and a spy's double life are secrets; leaking each one fires its system
//   4. places      — visits make a place with regulars who talk, trouble sours it, a bad year closes it
//   5. events      — every choice of every new event runs, on a clone, without an error
//   6. the year    — the yearly hook runs, a throwing hook never stops the year
import { loadGame } from './loadgame.mjs';

const ctx = loadGame({ quiet: true });
const g = (name) => ctx.run(name);
ctx.seedRng(8101);
let errors = 0;
ctx.console.error = () => { errors++; };
let failures = 0;
const ok = (cond, msg) => { if (!cond) { failures++; console.log('  ✖ ' + msg); } };
const META = g('META'), EVENTS = g('EVENTS'), ACTIONS = g('ACTIONS'), SECRET_KINDS = g('SECRET_KINDS');
const clone = (s) => JSON.parse(JSON.stringify(s));
const P = (s) => s.people[s.playerId];
const pop = (s, handler) => s.pending.find((p) => p.handler === handler);
const act = (s, id, t) => { s.pending = []; return ctx.doAction(s, id, t); };
const answer = (s, handler, value) => { const pp = pop(s, handler); if (!pp) return false; const i = pp.choices.findIndex((c) => c.value === value); return ctx.resolvePopup(s, pp.id, i < 0 ? 0 : i); };
const adult = (age, o) => { const s = ctx.createLife(Object.assign({ country: 'us', year: 2000 }, o)); s.year = 2000 + age; s.pending = []; s.player.edu.current = null; return s; };
const friend = (s, kind, rel) => { const p = ctx.makeAdultNear(s, { minAge: 25, maxAge: 40 }); ctx.setRel(s, p.id, kind || 'friend', rel ?? 60); return p; };
const newsKinds = (s) => (s.news || []).map((a) => a.kind);

/* 1. good name ---------------------------------------------------------------------- */
{
  const s = adult(30);
  const n0 = ctx.webRep(P(s)).name;
  ctx.webFact(s, 'good_deed', { kind: 'organize', name: 4 });
  const n1 = ctx.webRep(P(s)).name;
  ok(n1 > n0, `a good deed raises your name (${n0} -> ${n1})`);
  const t = adult(30);
  for (let i = 0; i < 8; i++) ctx.webFact(t, 'good_deed', { kind: 'volunteer' });
  ok(ctx.webRep(P(t)).name <= 50 + 6, `a tenth volunteer shift is not a first: eight shifts added ${ctx.webRep(P(t)).name - 50}`);
  // Charity and volunteering announce deeds (21-activities.js).
  const u = adult(30);
  u.player.money = 5e6;
  act(u, 'volunteer');
  ok((u.web && u.web.deeds || []).length === 1, 'volunteering records a deed');
  act(u, 'charity');
  const cp = pop(u, 'donate');
  ok(!!cp, 'donating opens a popup');
  if (cp) ctx.resolvePopup(u, cp.id, cp.choices.findIndex((c) => c.value && !c.disabled && c.value > 1000));
  ok(u.web.deeds.length === 2, 'a donation records a deed');
  // Pillar of the community.
  const v = adult(40);
  for (let i = 0; i < 3; i++) ctx.webFact(v, 'good_deed', { kind: 'charity', name: 6 });
  ctx.webRep(P(v)).name = 60;
  ok(!ctx.webPillar(v), 'good deeds are not enough without a name');
  ctx.webRep(P(v)).name = 75;
  ok(ctx.webPillar(v), 'a good name and three deeds make a pillar');
  ctx.webGoodYear(v);
  ok(ctx.webRep(P(v)).pillar === true, 'the year records it');
  // A good name softens a scandal and shows at the ballot box.
  const fall = (name) => { const w = adult(30); const lover = friend(w, 'friend', 60); const mate = friend(w, 'partner', 70); mate.partner = w.playerId; P(w).partner = mate.id; ctx.webRep(P(w)).name = name; const sec = ctx.webNewSecret(w, 'cheated', w.playerId, { other: lover.id, rom: mate.id }); sec.sev = 4; ctx.webExpose(w, sec, 'gossip'); return ctx.webRep(P(w)).scandal; };
  const bad = fall(30), good = fall(95);
  ok(good < bad, `a good name softens the fall (scandal ${good} vs ${bad})`);
  const x = adult(30), y = adult(30);
  ctx.webRep(P(x)).name = 90; ctx.webRep(P(y)).name = 20; ctx.webRep(P(y)).scandal = 40;
  ok(ctx.webVoteEdge(x) > 0 && ctx.webVoteEdge(y) < 0, 'a good name helps at the ballot box, a scandal hurts');
  // Organizing something.
  const o = adult(30);
  o.player.money = 1e6;
  for (let i = 0; i < 4; i++) friend(o, 'friend', 60);
  ok(ACTIONS.web_organize.when(o), 'a free adult can organize something');
  ctx.webUneaseAdd(o, 5);
  const before = ctx.webUneaseHere(o);
  let won = false;
  for (let i = 0; i < 30 && !won; i++) { const t2 = clone(o); act(t2, 'web_organize'); answer(t2, 'webOrganize', 'block'); if ((t2.web.deeds || []).length) { won = true; ok(ctx.webUneaseHere(t2) < before, 'a block party eases an uneasy neighborhood'); ok(!ACTIONS.web_organize.when(t2), 'once a year'); } }
  ok(won, 'organizing can succeed');
}

/* 2. the bus -------------------------------------------------------------------------- */
{
  const s = adult(35);
  s.player.money = 1e7; s.player.skills.business = 60;
  const co = ctx.foundCompany(s, 'cafe', 'Corner Cafe', { equity: 1, debt: 0 });
  s.pending = [];
  const r0 = ctx.webRep(P(s)).scandal;
  ctx.webFact(s, 'biz_event', { id: 'breach', co: co.id, you: true });
  ok(ctx.webRep(P(s)).scandal > r0, 'a data breach at your company is a scandal for you');
  const r1 = ctx.webRep(P(s)).scandal;
  ctx.webFact(s, 'biz_event', { id: 'breach', co: co.id, you: false });
  ok(ctx.webRep(P(s)).scandal === r1, 'a hired CEO\'s scandal is not yours');
  const n0 = ctx.webRep(P(s)).name;
  ctx.webFact(s, 'biz_event', { id: 'award', co: co.id, you: true });
  ok(ctx.webRep(P(s)).name > n0 && newsKinds(s).includes('biz_good'), 'an award is good for your name and makes the paper');
  ctx.webFact(s, 'biz_failed', { co: co.id, you: true, owed: 10000 });
  ok(newsKinds(s).includes('biz_failed'), 'a failed company makes the paper');
  // A real shutdown announces itself.
  const t = adult(35);
  t.player.money = 1e7; t.player.skills.business = 60;
  const c2 = ctx.foundCompany(t, 'cafe', 'Doomed Cafe', { equity: 1, debt: 0 });
  t.pending = [];
  const sc = ctx.webRep(P(t)).scandal;
  ctx.liquidate(t, c2);
  ok(ctx.webRep(P(t)).scandal > sc, 'liquidating a company reaches your name through the bus');
  // Business events announce.
  let seen = 0;
  ctx.onWebFact('biz_event', () => { seen++; });
  for (let i = 0; i < 40; i++) { try { ctx.rollBizEvent(s, co); } catch (e) { ok(false, 'rollBizEvent threw ' + e.message); break; } s.pending = []; }
  ok(seen > 0, 'rolling business events announces them');
  // Verdicts.
  const v = adult(40);
  const sc2 = ctx.webRep(P(v)).scandal;
  ctx.webFact(v, 'court_verdict', { id: 'k1', won: false, side: 'defendant', type: 'slipfall', claim: 500000, co: false, name: 'Doe v. You' });
  ok(ctx.webRep(P(v)).scandal > sc2 && newsKinds(v).includes('court_lost'), 'losing a big suit is public');
  const n2 = ctx.webRep(P(v)).name;
  ctx.webFact(v, 'court_verdict', { id: 'k2', won: true, side: 'plaintiff', type: 'slipfall', claim: 900000, co: false, name: 'You v. Them' });
  ok(ctx.webRep(P(v)).name >= n2, 'winning a big suit never hurts your name');
  ctx.webFact(v, 'court_verdict', { id: 'k3', won: false, side: 'defendant', type: 'slipfall', claim: 5000, co: false, name: 'tiny' });
  // A real verdict announces.
  let seenV = 0;
  ctx.onWebFact('court_verdict', () => { seenV++; });
  const w = adult(40); w.player.money = 1e6;
  ctx.getSued(w, 'slipfall', ctx.randomParty(w), { claim: ctx.price(w, 200000) });
  const k = ctx.openCases(w)[0];
  if (k) { try { ctx.verdict(w, k, true); } catch (e) { ok(false, 'verdict threw ' + e.message); } ok(seenV === 1, 'a verdict announces itself'); }
  // Spies and memoirs.
  const sp = adult(40);
  ctx.webFact(sp, 'spy_burned', { how: 'expelled' });
  ok(newsKinds(sp).includes('expelled'), 'an expelled diplomat makes the paper');
  ctx.webFact(sp, 'memoir_out', { kind: 'tellall' });
  ok(newsKinds(sp).includes('memoir'), 'a tell-all makes the paper');
  // A secret that gets out about you makes the paper, sometimes.
  let papered = 0;
  for (let i = 0; i < 25; i++) { const z = adult(30); const sec = ctx.webNewSecret(z, 'killing', z.playerId, { other: friend(z, 'friend', 50).id }); ctx.webExpose(z, sec, 'gossip'); if (newsKinds(z).includes('scandal')) papered++; }
  ok(papered > 5, `a public killing often makes the paper (${papered}/25)`);
}

/* 3. secrets that belong to other systems ----------------------------------------------- */
{
  // A deserter in hiding.
  const s = adult(25);
  const m = ctx.ensureMil(s);
  m.deserter = { year: s.year, hide: 'family', caught: false };
  ctx.webSyncSecrets(s);
  const sec = ctx.webLive(s, (x) => x.kind === 'deserter')[0];
  ok(!!sec, 'a deserter in hiding is a secret');
  ok(sec && sec.knows.length > 1 && sec.knows.slice(1).every((id) => ['parent', 'sibling', 'spouse', 'partner'].includes(s.player.rels[id].kind)), 'the family that hides them knows');
  ok(ctx.webLabel(s, sec) === 'that you deserted' && ctx.webRumor(s, sec).includes('army'), 'it reads right from both sides');
  ok(ctx.webKindPressure(s, 'deserter') > 0, 'the people who know raise the odds of being found');
  ctx.webExpose(s, sec, 'gossip');
  ok(!!pop(s, 'milCourt') && m.deserter.caught, 'when it gets out the military police find you');
  const t = adult(25);
  const mt = ctx.ensureMil(t);
  mt.deserter = { year: t.year, hide: 'border', caught: false };
  ctx.webSyncSecrets(t);
  ok(ctx.webLive(t, (x) => x.kind === 'deserter').length === 1, 'a second sync does not make a second secret');
  mt.deserter = null;
  ctx.webSyncSecrets(t);
  ok(ctx.webLive(t, (x) => x.kind === 'deserter').length === 0, 'it ends when the running does');
  // An informant.
  const u = adult(30);
  ctx.uw(u).rat = true;
  ctx.webSyncSecrets(u);
  const rs = ctx.webLive(u, (x) => x.kind === 'informant')[0];
  ok(!!rs, 'an informant carries a secret');
  ok(SECRET_KINDS.informant.tipOdds(u, rs) > 0, 'with a risk of its own');
  ctx.webExpose(u, rs, 'tip');
  ok(!!pop(u, 'uwRatFound'), 'when it gets out the family comes asking');
  const v = adult(30);
  ctx.uw(v).rat = true;
  let found = 0;
  for (let i = 0; i < 400; i++) { const w = clone(v); ctx.webSyncSecrets(w); ctx.webLeak(w); if (w.pending.some((p) => p.handler === 'uwRatFound')) found++; }
  ok(found > 0, `informants do get found out over the years (${found}/400)`);
  ctx.uw(v).rat = false;
  ctx.webSyncSecrets(v);
  ok(ctx.webLive(v, (x) => x.kind === 'informant').length === 0, 'it ends when the deal does');
  // A spy who told somebody.
  const w = adult(35);
  const sp = ctx.ensureSpy(w);
  sp.cover = { id: 'diplomat', strength: 80 };
  sp.heat = 10;
  const lover = friend(w, 'partner', 80);
  sp.told = { [lover.id]: true };
  ctx.webSyncSecrets(w);
  const ss = ctx.webLive(w, (x) => x.kind === 'spy_life')[0];
  ok(ss && ss.knows.includes(lover.id), 'telling your partner the truth is a secret they now hold');
  ctx.webExpose(w, ss, 'gossip');
  ok(sp.cover.strength < 80 && sp.heat > 10, 'when it gets out your cover takes the hit');
  const x = adult(35);
  ctx.ensureSpy(x).told = {};
  ctx.webSyncSecrets(x);
  ok(ctx.webLive(x, (y) => y.kind === 'spy_life').length === 0, 'a spy who told no one has nothing to leak');
  // Medals are good deeds.
  const y = adult(30);
  const my = ctx.ensureMil(y);
  ctx.webSenseMedals(y);
  const before = ctx.webRep(P(y)).name;
  my.medals.valor++;
  ctx.webSenseMedals(y);
  ok(ctx.webRep(P(y)).name > before, 'a medal for valor raises your name');
  ctx.webSenseMedals(y);
  ok(ctx.webRep(P(y)).name === ctx.webRep(P(y)).name && y.web.medals === 1, 'it counts once');
}

/* 4. places ------------------------------------------------------------------------------- */
{
  const s = adult(30);
  const a = friend(s, 'coworker', 50), b = friend(s, 'coworker', 50), c = friend(s, 'coworker', 50);
  ctx.placeVisit(s, 'work:x:the break room', { kind: 'work', name: 'The break room', emoji: '☕' }, [a.id, b.id]);
  ctx.placeVisit(s, 'work:x:the break room', { kind: 'work', name: 'The break room', emoji: '☕' }, [c.id]);
  const p = ctx.placeGet(s, 'work:x:the break room');
  ok(p && p.visits === 2 && p.reg.length === 3, 'a place counts visits and remembers regulars');
  ok([a, b, c].some((x) => (x.ties || []).some((t) => t.k === 'work')), 'regulars of one place talk to each other (coworkers stay coworkers)');
  { const q = adult(30); const x = friend(q, 'friend', 50), y = friend(q, 'friend', 50); ctx.placeVisit(q, 'night:us:' + P(q).city + ':bar', { kind: 'night', name: 'Tin Roof' }, [x.id, y.id]); ok((x.ties || []).some((t) => t.k === 'place'), 'regulars of a bar are tied as a place'); }
  ok(ctx.placeWord(p) === 'Lively', 'an ordinary place is lively');
  ctx.placeIncident(s, p.key, 'fight');
  ok(p.mood < 55, 'trouble sours a place');
  ctx.placeIncident(s, p.key, 'nope');
  ok(ctx.placeVibe(s, p.key) < 0, 'a sour place has a worse vibe');
  // A renamed venue is a fresh start.
  ctx.placeVisit(s, p.key, { kind: 'work', name: 'Another name' }, []);
  ok(ctx.placeGet(s, p.key).visits === 1 && ctx.placeGet(s, p.key).mood === 55, 'a place that changed hands starts over');
  // Mood drifts back, and an uneasy city keeps it down.
  const q = adult(30);
  const here = P(q);
  const pl = ctx.placeVisit(q, 'night:us:' + here.city + ':bar', { kind: 'night', name: 'The Rusty Anchor', emoji: '🍺' }, []);
  pl.mood = 20;
  ctx.webPlacesYear(q);
  ok(pl.mood > 20, 'a quiet place drifts back toward ordinary');
  const r = adult(30);
  const pl2 = ctx.placeVisit(r, 'night:us:' + P(r).city + ':bar', { kind: 'night', name: 'Tin Roof', emoji: '🍺' }, []);
  ctx.webUneaseAdd(r, 10);
  ctx.webPlacesYear(r);
  ok(pl2.mood < 55, 'an uneasy city keeps a place down');
  // A bad year closes a venue and a new one opens in its place.
  const t = adult(30);
  const v = ctx.nightVenues(t)[0];
  const key = ctx.nightPlaceKey(t, v);
  const pt = ctx.placeVisit(t, key, { kind: 'night', name: v.name, emoji: '🍺' }, []);
  const old = v.name;
  pt.mood = 5;
  ctx.webPlacesYear(t);
  ok(ctx.nightVenues(t)[0].name !== old && !ctx.placeGet(t, key), 'a place in a bad year closes and is replaced');
  // The places you know are your city's and your work's.
  const u = adult(30);
  const home = P(u).city;
  ctx.placeVisit(u, 'night:us:' + home + ':bar', { kind: 'night', name: 'Home bar' }, []);
  P(u).city = 'Elsewhere';
  ctx.placeVisit(u, 'night:us:Elsewhere:bar', { kind: 'night', name: 'Far bar' }, []);
  P(u).city = home;
  ok(ctx.placesYours(u).map((x) => x.name).join() === 'Home bar', 'only the places in your city are yours');
  // The nightlife actually visits.
  META.settings.mature = true; META.settings.mature_substances = true;
  const n = adult(30);
  n.player.money = 1e6;
  ok(act(n, 'nightlife') !== undefined, 'a night out opens');
  const np = pop(n, 'nightGo');
  if (np) {
    ctx.resolvePopup(n, np.id, 0);
    ok(Object.keys(n.web.places || {}).some((k) => k.startsWith('night:')), 'going out makes the place remembered');
  }
  META.settings.mature = false; META.settings.mature_substances = false;
}

/* 5. events ------------------------------------------------------------------------------------ */
{
  const setup = (id) => {
    const s = adult(45);
    s.player.money = 2000;
    P(s).stats.health = 30;
    ctx.webRep(P(s)).name = 80;
    for (let i = 0; i < 4; i++) ctx.webFact(s, 'good_deed', { kind: 'organize', name: 4 });
    ctx.webRep(P(s)).name = 80;
    ctx.hire(s, 'teacher', 1);
    for (let i = 0; i < 3; i++) friend(s, 'coworker', 50);
    const crew = [friend(s, 'friend', 50), friend(s, 'friend', 50)];
    ctx.placeVisit(s, 'night:us:' + P(s).city + ':bar', { kind: 'night', name: 'The Rusty Anchor', emoji: '🍺' }, crew.map((x) => x.id));
    for (let i = 0; i < 3; i++) ctx.placeVisit(s, 'night:us:' + P(s).city + ':bar', { kind: 'night', name: 'The Rusty Anchor', emoji: '🍺' }, crew.map((x) => x.id));
    s.pending = [];
    return s;
  };
  for (const id of ['web_neighbors', 'web_plaque', 'web_vouch', 'web_place_regular', 'web_place_trouble']) {
    const ev = EVENTS[id];
    ok(!!ev, `${id} exists`);
    if (!ev) continue;
    const s0 = setup(id);
    ok(ctx.eventEligible(s0, ev), `${id} can fire for the right person`);
    let n = 0;
    for (let i = 0; i < 6; i++) {
      const s = clone(s0);
      if (!ctx.fireEvent(s, ev)) continue;
      const pp = s.pending.find((p) => p.handler === 'event');
      if (!pp) continue;
      n = Math.max(n, pp.choices.length);
      for (let k = 0; k < pp.choices.length; k++) {
        const t = clone(s);
        const q = t.pending.find((p) => p.handler === 'event');
        const e0 = errors;
        try { ctx.resolvePopup(t, q.id, k); } catch (e) { ok(false, `${id} choice ${k} threw: ${e.message}`); }
        ok(errors === e0, `${id} choice ${k} logged an error`);
      }
    }
    ok(n >= 2, `${id} has choices`);
  }
}

/* 6. the year -------------------------------------------------------------------------------- */
{
  const s = adult(30);
  ok(g('YEAR_HOOKS').some((h) => h.name === 'web2'), 'web2 registers a yearly hook');
  const before = errors;
  g('YEAR_HOOKS').push({ name: 'boom', fn: () => { throw new Error('boom'); } });
  let alive = true;
  try { ctx.ageUp(s); } catch (e) { alive = false; }
  ok(alive && s.year === 2031, 'a throwing yearly hook never stops the year');
  ok(errors > before, 'it is logged');
  g('YEAR_HOOKS').pop();
  // A kid has none of it.
  const kid = ctx.createLife({ country: 'us', year: 2000 });
  kid.pending = [];
  for (let i = 0; i < 4; i++) { try { ctx.ageUp(kid); kid.pending = []; } catch (e) { ok(false, 'a child\'s year threw ' + e.message); } }
  ok(!(kid.web && Object.keys(kid.web.places || {}).length), 'children have no places yet');
}

console.log(failures ? `\n✖ ${failures} check(s) failed` : '✓ web part two checks passed');
process.exit(failures ? 1 : 0);
