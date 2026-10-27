// The connected world verification:  node dev/verify/web.mjs
//
// Covers 62-web.js:
//   1. secrets  — an affair becomes a secret; the partner learning it fires the old "caught" popup
//   2. ties     — a circle weaves itself, ties are symmetric, capped, and never dangle
//   3. hearsay  — a rumor about someone you know reaches you as a popup; every choice runs
//   4. mature   — squeezing, leaning on people and the hush-money call stay hidden while Mature is off
//   5. killing  — a killing is a secret, grieves the victim's ties and makes the city uneasy
//   6. unease   — an uneasy city's prices sag
//   7. name     — scandal costs hiring odds and juries' goodwill; heirs inherit half
//   8. silence  — asking, paying and leaning on a knower lowers how likely they are to talk
//   9. bus      — a handler that throws never breaks the game; kids get no gossip
import { loadGame } from './loadgame.mjs';

const ctx = loadGame({ quiet: true });
const g = (name) => ctx.run(name);
ctx.seedRng(6201);
ctx.console.error = () => {};
let failures = 0;
const ok = (cond, msg) => { if (!cond) { failures++; console.log('  ✖ ' + msg); } };
const META = g('META'), EVENTS = g('EVENTS'), SECRET_KINDS = g('SECRET_KINDS');
const clone = (s) => JSON.parse(JSON.stringify(s));
const P = (s) => s.people[s.playerId];
const pop = (s, handler) => s.pending.find((p) => p.handler === handler);
const act = (s, id, t) => { s.pending = []; return ctx.doAction(s, id, t); };
const adult = (age) => {
  const s = ctx.createLife({ country: 'us', year: 2000 });
  s.year = 2000 + age; s.pending = [];
  s.player.edu.current = null;
  return s;
};
const friend = (s, kind, rel) => {
  const p = ctx.makeAdultNear(s, { minAge: 25, maxAge: 40 });
  ctx.setRel(s, p.id, kind || 'friend', rel ?? 60);
  return p;
};
const setMature = (on) => { META.settings.mature = on; };

/* 1. secrets -------------------------------------------------------------------- */
setMature(false);
{
  const s = adult(30);
  const partner = friend(s, 'partner', 70);
  partner.partner = s.playerId; P(s).partner = partner.id;
  const lover = friend(s, 'friend', 60);
  ctx.affairBegins(s, lover.id, partner.id);
  const mine = ctx.webMine(s);
  ok(mine.length === 1 && mine[0].kind === 'affair', `an affair is a secret (got ${mine.map((x) => x.kind)})`);
  ok(mine[0].knows.includes(lover.id) && mine[0].knows.includes(s.playerId), 'the lover and you know it');
  const sec = mine[0];
  ctx.webLearn(s, sec, partner.id, lover.id);
  ok(!!pop(s, 'affairCaught'), 'the partner learning it fires the caught popup');
  ok(sec.out === true, 'a secret your partner has found is out');
  ok(ctx.webRep(P(s)).scandal > 0, 'getting caught costs your name');
  ok(ctx.webMine(s).length === 0, 'it is no longer a kept secret');
  // A one-night stand behind a partner's back.
  const t = adult(30);
  const mate = friend(t, 'partner', 70);
  mate.partner = t.playerId; P(t).partner = mate.id;
  const before = ctx.webMine(t).length;
  ctx.webFact(t, 'fling_cheat', { pid: friend(t, 'fling', 40).id, rom: mate.id });
  ok(ctx.webMine(t).length === before + 1 && ctx.webMine(t)[0].kind === 'cheated', 'cheating on a night out is a secret');
}

/* 2. ties ------------------------------------------------------------------------ */
{
  const s = adult(30);
  const crew = Array.from({ length: 6 }, () => friend(s, 'coworker', 50));
  for (let i = 0; i < 8; i++) ctx.webWeave(s);
  const linked = crew.filter((p) => (p.ties || []).length > 0).length;
  ok(linked >= 4, `a circle of six coworkers weaves together (${linked} linked)`);
  for (const p of crew) {
    ok((p.ties || []).length <= 6, 'ties are capped at six');
    for (const t of p.ties || []) {
      const q = s.people[t.id];
      ok(q && (q.ties || []).some((x) => x.id === p.id), 'ties are symmetric');
    }
  }
  // Someone vanishes (a person is cleaned up): no tie may keep pointing at them.
  delete s.people[crew[0].id];
  ctx.webPrune(s);
  for (const p of crew.slice(1)) ok(!(p.ties || []).some((t) => t.id === crew[0].id), 'ties never dangle after a prune');
  // They tell each other: the player is reachable from anyone who knows them.
  const ties = ctx.webTies(s, crew[1]);
  ok(ties.has(s.playerId), 'people who know you can tell you things');
}

/* 3. hearsay --------------------------------------------------------------------- */
{
  const s = adult(34);
  const pal = friend(s, 'friend', 60);
  const sec = ctx.webNewSecret(s, 'npc_debt', pal.id, { ev: 20 });
  ctx.webLearn(s, sec, s.playerId, friend(s, 'coworker', 40).id);
  const pp = pop(s, 'webHear');
  ok(!!pp, 'a rumor about a friend reaches you as a popup');
  ok(pp && !pp.choices.some((c) => c.value === 'squeeze'), 'no squeezing with Mature off');
  ok(pp && pp.choices.some((c) => c.value === 'help'), 'a friend in debt can be helped');
  s.player.money = 100000;
  pp.choices.forEach((c, i) => {
    const t = clone(s);
    let threw = null;
    try { ctx.resolvePopup(t, pp.id, i); } catch (e) { threw = e; }
    ok(!threw, `hearsay choice "${c.label}" ran (${threw && threw.message})`);
  });
  // With Mature on there is a squeeze, and it works or backfires.
  setMature(true);
  const t = adult(34);
  const rich = friend(t, 'friend', 60); rich.money = 90000;
  const sec2 = ctx.webNewSecret(t, 'npc_habit', rich.id, { note: 'drinking' });
  ctx.webLearn(t, sec2, t.playerId, friend(t, 'coworker', 40).id);
  const q = pop(t, 'webHear');
  const idx = q.choices.findIndex((c) => c.value === 'squeeze');
  ok(idx >= 0, 'the squeeze appears with Mature on');
  const rep0 = ctx.webRep(P(t)).scandal, cash0 = t.player.money;
  ctx.resolvePopup(t, q.id, idx);
  ok(t.player.money > cash0 || ctx.webRep(P(t)).scandal > rep0, 'a squeeze pays or backfires');
  setMature(false);
}

/* 4. mature gating ---------------------------------------------------------------- */
{
  ok((EVENTS.web_hush_money.tags || []).includes('mature'), 'the hush-money call is a Mature event');
  const s = adult(30);
  const knower = friend(s, 'coworker', 30);
  ctx.webNewSecret(s, 'affair', s.playerId, { other: knower.id, knows: [knower.id], sev: 3 });
  s.player.money = 50000;
  setMature(false);
  const r = act(s, 'web_silence', knower.id);
  const pp = pop(s, 'webSilence');
  ok(!!pp, 'web_silence opens a popup for a knower');
  ok(pp && !pp.choices.some((c) => c.value === 'lean'), 'no leaning on people with Mature off');
  setMature(true);
  const t = adult(30);
  const k2 = friend(t, 'coworker', 30);
  ctx.webNewSecret(t, 'affair', t.playerId, { other: k2.id, knows: [k2.id], sev: 3 });
  act(t, 'web_silence', k2.id);
  ok(pop(t, 'webSilence') && pop(t, 'webSilence').choices.some((c) => c.value === 'lean'), 'leaning appears with Mature on');
  setMature(false);
}

/* 5. killing ---------------------------------------------------------------------- */
{
  const s = adult(30);
  const victim = friend(s, 'friend', 60);
  const mourner = friend(s, 'friend', 70);
  ctx.webLink(s, victim.id, mourner.id, 'friend');
  const rel0 = ctx.relOf(s, mourner.id).rel;
  ctx.webFact(s, 'killed', { pid: victim.id, how: 'poison' });
  const sec = ctx.webMine(s).find((x) => x.kind === 'killing');
  ok(!!sec && sec.other === victim.id, 'a killing is a secret about its victim');
  ok(ctx.webUneaseHere(s) >= 5, `a killing makes the city uneasy (${ctx.webUneaseHere(s)})`);
  ok(ctx.relOf(s, mourner.id).rel < rel0, 'the victim’s friends turn cold');
  ctx.webFact(s, 'assault', { pid: mourner.id });
  ok(ctx.webUneaseHere(s) > 5, 'a fight adds to the unease');
  // A conviction makes it a matter of record.
  ctx.webFact(s, 'arrested', { crime: 'murder' });
  ok(!ctx.webMine(s).some((x) => x.kind === 'killing'), 'a murder conviction ends the secret');
}

/* 6. unease ----------------------------------------------------------------------- */
{
  const growth = (un) => {
    const s = adult(30);
    if (un) ctx.webUneaseAdd(s, un);
    ctx.seedRng(77);
    const p = P(s);
    return ctx.cityMarketYear(s, p.country, p.city).g;
  };
  const calm = growth(0), uneasy = growth(10);
  ok(uneasy < calm - 0.03, `an uneasy city grows slower (${uneasy.toFixed(3)} vs ${calm.toFixed(3)})`);
  const s = adult(30);
  ctx.webUneaseAdd(s, 4);
  ctx.webDecay(s);
  ok(ctx.webUneaseHere(s) < 4, 'unease fades with time');
  ok(ctx.webUneaseHere(s) > 0, 'but not at once');
}

/* 7. a name ----------------------------------------------------------------------- */
{
  const s = adult(30);
  const hire0 = ctx.webHireEdge(s), jury0 = ctx.webJuryEdge(s);
  ctx.webRepAdd(P(s), { scandal: 60, name: -20 });
  ok(ctx.webHireEdge(s) < hire0 - 0.15, 'a scandal costs job offers');
  ok(ctx.webJuryEdge(s) > jury0 + 0.1, 'a scandal costs the jury’s goodwill');
  ok(ctx.webRepWord(ctx.webRep(P(s))) === 'Infamous', 'a big scandal reads as infamous');
  const kid = ctx.makePerson(s, { age: 0, parents: [P(s).id] });
  ctx.webHeir(s, P(s), kid);
  ok(ctx.webRep(kid).scandal === 30, `heirs inherit half the scandal (${ctx.webRep(kid).scandal})`);
  for (let i = 0; i < 25; i++) ctx.webDecay(s);
  ok(ctx.webRep(P(s)).scandal < 12, 'scandal fades over the years');
}

/* 8. silence ---------------------------------------------------------------------- */
{
  const s = adult(30);
  const k = friend(s, 'coworker', 40);
  const sec = ctx.webNewSecret(s, 'crime', s.playerId, { crime: 'burglary', knows: [k.id], sev: 2 });
  const base = ctx.webLeakOdds(s, sec, k.id);
  s.player.money = 100000;
  act(s, 'web_silence', k.id);
  const pp = pop(s, 'webSilence');
  const payIdx = pp.choices.findIndex((c) => c.value === 'pay');
  const cash = s.player.money;
  ctx.resolvePopup(s, pp.id, payIdx);
  ok(s.player.money < cash, 'paying for silence costs money');
  ok(ctx.webLeakOdds(s, sec, k.id) < base * 0.3, 'a bought silence makes them far less likely to talk');
  ok(!g('ACTIONS').web_silence.when(s, k.id), 'you can only ask once a year');
  // Destroying evidence.
  const t = adult(30);
  const x = ctx.webNewSecret(t, 'killing', t.playerId, { other: null, ev: 60 });
  t.player.money = 5000;
  act(t, 'web_coverup');
  ok(x.ev < 60, 'destroying evidence lowers the proof');
}

/* 9. the bus, and kids ------------------------------------------------------------- */
{
  ctx.onWebFact('test_boom', () => { throw new Error('boom'); });
  const s = adult(30);
  let threw = false;
  try { ctx.webFact(s, 'test_boom', {}); ctx.webFact(s, 'nobody_listens', {}); } catch (e) { threw = true; }
  ok(!threw, 'a handler that throws never breaks the game');
  const kid = adult(15);
  for (let i = 0; i < 40; i++) ctx.webCircleDrama(kid);
  ok(Object.keys(ctx.webOf(kid).secrets).length === 0, 'no gossip drama for a teenager');
  const adultS = adult(30);
  const pal = friend(adultS, 'friend', 60);
  const sec = ctx.webNewSecret(adultS, 'npc_affair', pal.id, { other: friend(adultS, 'friend', 50).id });
  kid.pending = [];
  ctx.webHearsay(kid, sec, pal.id);
  ok(kid.pending.length === 0, 'no sexual gossip reaches a teenager');
  // Everything survives a save round trip.
  const t = adult(40);
  ctx.webFact(t, 'crime_clean', { crime: 'burglary' });
  ctx.webNewSecret(t, 'npc_debt', friend(t, 'friend', 50).id);
  const copy = clone(t);
  ok(JSON.stringify(copy.web) === JSON.stringify(t.web), 'the ledger saves and loads whole');
  for (let i = 0; i < 30; i++) { ctx.webTick(copy); copy.year++; copy.pending = []; }
  ok(Object.values(copy.web.secrets).every((x) => SECRET_KINDS[x.kind] && x.ev >= 0 && x.ev <= 100 && x.sev >= 1 && x.sev <= 5), 'thirty years of ticks keep secrets sane');
}

/* 10. every event, every choice ---------------------------------------------------- */
{
  setMature(true);
  const eachChoice = (s, evId) => {
    s.pending = [];
    const fired = ctx.fireEvent(s, EVENTS[evId]);
    ok(fired !== false && s.pending.length === 1, `${evId} fires`);
    const pp = s.pending[0];
    if (!pp) return;
    pp.choices.forEach((c, i) => {
      const t = clone(s);
      s.player.money = Math.max(s.player.money, 100000);
      let threw = null;
      try { ctx.resolvePopup(t, pp.id, i); } catch (e) { threw = e; }
      ok(!threw, `${evId} choice "${c.label}" ran (${threw && threw.stack.split('\n').slice(0, 2).join(' | ')})`);
    });
  };
  const base = () => {
    const s = adult(32);
    s.player.money = 100000;
    const f = friend(s, 'friend', 60), k = friend(s, 'coworker', 30);
    ctx.webLink(s, f.id, k.id, 'friend');
    return { s, f, k };
  };
  { const { s, k } = base(); ctx.webNewSecret(s, 'killing', s.playerId, { other: null, knows: [k.id], ev: 50 }); ok(EVENTS.web_canvass.when(s), 'a killing brings the canvass'); eachChoice(s, 'web_canvass'); }
  { const { s } = base(); ctx.webUneaseAdd(s, 6); ok(EVENTS.web_vigil.when(s), 'an uneasy block holds a vigil'); eachChoice(s, 'web_vigil'); }
  { const { s } = base(); ctx.webRepAdd(P(s), { scandal: 50 }); ok(EVENTS.web_shunned.when(s), 'a scandal gets you talked about'); eachChoice(s, 'web_shunned'); }
  { const { s, k } = base(); ctx.webNewSecret(s, 'affair', s.playerId, { other: k.id, knows: [k.id], sev: 4 }); ok(EVENTS.web_hush_money.when(s), 'a knower may call for money'); eachChoice(s, 'web_hush_money'); }
  setMature(false);
  { const { s, k } = base(); ctx.webNewSecret(s, 'affair', s.playerId, { other: k.id, knows: [k.id], sev: 4 }); ok(!ctx.eventEligible(s, EVENTS.web_hush_money), 'no hush-money call with Mature off'); }
}

console.log(failures ? `\n❌ ${failures} web checks failed.` : '✅ Web checks passed.');
process.exit(failures ? 1 : 0);
