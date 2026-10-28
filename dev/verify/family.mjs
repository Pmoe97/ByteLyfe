// Family romance fixes:  node dev/verify/family.mjs
//
//   1. a relative you dated and left stays family: kind restored, Family group, "Sister · Ex", original `since`
//   2. the same after a marriage and a divorce ("Ex-wife")
//   3. an in-law comes back only while the person they are an in-law through is still your partner
//   4. old saves: an "ex" with wasFam is restored by migrate
//   5. asking out or rekindling with a relative asks "are you sure?" first; backing out costs nothing
//   6. ordinary people are never asked
//   7. dating a restored relative again works and clears the ex mark
import { loadGame } from './loadgame.mjs';

const ctx = loadGame({ quiet: true });
const g = (name) => ctx.run(name);
ctx.seedRng(4417);
let errors = 0;
ctx.console.error = () => { errors++; };
let failures = 0;
const ok = (cond, msg) => { if (!cond) { failures++; console.log('  ✖ ' + msg); } };
const META = g('META');
const P = (s) => s.people[s.playerId];
const clone = (s) => JSON.parse(JSON.stringify(s));
const setTaboo = (on) => { for (const t of ['taboo', 'taboo_parent', 'taboo_step', 'taboo_sibling', 'taboo_child', 'taboo_grand', 'taboo_extended', 'taboo_inlaw']) META.settings[t] = on; };
const groupOf = (s, pid) => g('REL_GROUPS').find((x) => x.kinds.includes(ctx.relKind(s, pid))).name;

// An adult life with an adult sibling the player is attracted to.
function lifeWithSibling() {
  for (let i = 0; i < 400; i++) {
    const s = ctx.createLife({ country: 'us', year: 1990 });
    const sib = ctx.relPeople(s, ['sibling'])[0];
    if (!sib) continue;
    s.year += 34; s.player.edu.current = null; s.player.money = 1e6;
    P(s).orient = 'bi'; sib.orient = 'bi'; sib.partner = null;
    ctx.afterChange(s); s.pending = []; // the jump in years unlocks the age achievements: clear them
    if (ctx.ageOf(s, sib) < 18) continue;
    return { s, sib };
  }
  throw new Error('no life with an adult sibling');
}

setTaboo(true);

/* 1. a sibling you dated and left ----------------------------------- */
{
  const { s, sib } = lifeWithSibling();
  const since = ctx.relOf(s, sib.id).since;
  ctx.startRomance(s, sib.id);
  ok(ctx.relKind(s, sib.id) === 'partner', 'dating a sibling makes them a partner');
  ctx.endRomance(s, sib.id, 'ex');
  const r = ctx.relOf(s, sib.id);
  ok(r.kind === 'sibling', `after the breakup they are a sibling again, got ${r.kind}`);
  ok(groupOf(s, sib.id) === 'Family', `they are listed under Family, got ${groupOf(s, sib.id)}`);
  ok(r.since === since, `the tie keeps its original year (${since}), got ${r.since}`);
  ok(r.exRom === 'ex', 'the breakup is remembered');
  ok(/^(Brother|Sister|Sibling) · Ex$/.test(ctx.kinTitle(s, sib.id)), `title reads "Sister · Ex", got "${ctx.kinTitle(s, sib.id)}"`);
  ok(ctx.relPeople(s, ['sibling']).some((p) => p.id === sib.id), 'sibling lookups find them again');
  ok(!sib.partner && !P(s).partner, 'nobody is marked as a partner');

  /* 7. and again --------------------------------------------------- */
  ctx.startRomance(s, sib.id);
  const r2 = ctx.relOf(s, sib.id);
  ok(r2.kind === 'partner' && !r2.exRom, 'dating again clears the ex mark');
  ok(r2.famSince === since, 'the family year survives a second romance');
  ctx.endRomance(s, sib.id, 'ex');
  ok(ctx.relKind(s, sib.id) === 'sibling' && ctx.relOf(s, sib.id).since === since, 'and back to family a second time');
}

/* 2. marriage and divorce ------------------------------------------- */
{
  const { s, sib } = lifeWithSibling();
  ctx.startRomance(s, sib.id);
  ctx.marry(s, sib.id);
  ok(ctx.relKind(s, sib.id) === 'spouse', 'married');
  ctx.divorce(s, sib.id, true);
  const r = ctx.relOf(s, sib.id);
  ok(r.kind === 'sibling' && r.exRom === 'exspouse', `a divorced sibling is a sibling with exRom exspouse, got ${r.kind}/${r.exRom}`);
  ok(/Ex-(husband|wife|spouse)$/.test(ctx.kinTitle(s, sib.id)), `title ends in Ex-wife/Ex-husband, got "${ctx.kinTitle(s, sib.id)}"`);
  ok(groupOf(s, sib.id) === 'Family', 'divorced sibling is under Family');
  ok(!P(s).married && !sib.married, 'neither is married any more');
}

/* 3. in-laws -------------------------------------------------------- */
{
  let done = false;
  for (let i = 0; i < 60 && !done; i++) {
    const s = ctx.createLife({ country: 'us', year: 1990 });
    s.year += 34; s.player.edu.current = null; s.player.money = 1e6;
    P(s).orient = 'bi';
    ctx.afterChange(s); s.pending = [];
    const mate = ctx.makeAdultNear(s, { minAge: 28, maxAge: 40 });
    ctx.setRel(s, mate.id, 'partner', 70); mate.partner = s.playerId; P(s).partner = mate.id;
    ctx.marry(s, mate.id);
    const inlaw = ctx.relPeople(s, ['inlaw']).find((p) => ctx.ageOf(s, p) >= 18 && mate.parents.some((x) => p.parents.includes(x)) && !mate.parents.includes(p.id));
    if (!inlaw) continue;
    done = true;
    inlaw.orient = 'bi'; inlaw.partner = null;
    ctx.startRomance(s, inlaw.id); // an affair with your spouse's sibling
    ok(ctx.relKind(s, inlaw.id) === 'lover', 'an affair with an in-law makes them a lover');
    const t = clone(s);
    ctx.endRomance(s, inlaw.id, 'ex');
    ok(ctx.relKind(s, inlaw.id) === 'inlaw', `with the spouse still there, the in-law is an in-law again, got ${ctx.relKind(s, inlaw.id)}`);
    // No spouse any more: the tie is gone with them.
    ctx.setRel(t, mate.id, 'exspouse', 20);
    ctx.endRomance(t, inlaw.id, 'ex');
    ok(ctx.relKind(t, inlaw.id) === 'ex', `without the spouse the in-law is just an ex, got ${ctx.relKind(t, inlaw.id)}`);
  }
  ok(done, 'built a life with a spouse and an adult sibling-in-law');
}

/* 4. old saves ------------------------------------------------------- */
{
  const { s, sib } = lifeWithSibling();
  // Exactly what the old code left behind.
  s.player.rels[sib.id] = { kind: 'ex', rel: 30, since: s.year - 3, taboo: 'taboo_sibling', wasFam: 'sibling' };
  ok(groupOf(s, sib.id) === 'Others', 'the old record is under Others');
  const back = ctx.migrate(JSON.parse(JSON.stringify(s)));
  ok(back.player.rels[sib.id].kind === 'sibling', `migrate restores the sibling, got ${back.player.rels[sib.id].kind}`);
  ok(back.player.rels[sib.id].exRom === 'ex', 'and remembers the breakup');
  ok(ctx.migrate(back).player.rels[sib.id].kind === 'sibling', 'migrate is repeatable');
  // An ordinary ex is left alone.
  const f = ctx.makeAdultNear(s, { minAge: 25, maxAge: 35 });
  s.player.rels[f.id] = { kind: 'ex', rel: 30, since: s.year - 3 };
  ok(ctx.migrate(JSON.parse(JSON.stringify(s))).player.rels[f.id].kind === 'ex', 'an ordinary ex stays an ex');
}

/* 5. "are you sure?" ------------------------------------------------- */
{
  const { s, sib } = lifeWithSibling();
  const confirmOf = (st) => st.pending.find((q) => q.handler === 'confirmAction');
  ok(ctx.doAction(s, 'p_askout', sib.id) === true, 'asking out a sibling is offered');
  const pp = confirmOf(s);
  ok(!!pp, 'a confirmation popup comes first');
  ok(ctx.relKind(s, sib.id) === 'sibling', 'nothing has happened yet');
  ok(ctx.count(s, 'askout_' + sib.id) === 0, 'nothing has been counted yet');
  ok(pp && pp.choices.length === 2 && /^Yes/.test(pp.choices[0].label), 'two choices, yes first');
  ok(pp && pp.text.includes(sib.first) && !/undefined|NaN/.test(pp.text + pp.title), `the text names them: "${pp && pp.text}"`);
  // No.
  ctx.resolvePopup(s, pp.id, 1);
  ok(!confirmOf(s) && ctx.relKind(s, sib.id) === 'sibling', 'saying no leaves everything as it was');
  ok(ctx.count(s, 'askout_' + sib.id) === 0, 'and costs nothing: you can still ask this year');
  ok(s.pending.length === 0, 'and no popup is left behind');
  // Yes (a fresh clone, so the odds do not matter for the assertions).
  const y = clone(s);
  ctx.doAction(y, 'p_askout', sib.id);
  ctx.resolvePopup(y, confirmOf(y).id, 0);
  ok(ctx.count(y, 'askout_' + sib.id) === 1, 'yes runs the ask-out');
  ok(y.pending.length >= 1 && !confirmOf(y), 'and shows its result');
  ok(errors === 0, 'no errors logged');

  // Rekindle: a legacy ex who cannot be restored is still family.
  const t = clone(s);
  t.player.rels[sib.id] = { kind: 'ex', rel: 60, since: t.year - 2, taboo: 'taboo_sibling', wasFam: 'inlaw' };
  ok(ctx.doAction(t, 'p_rekindle', sib.id) === true, 'rekindling with a family ex is offered');
  ok(!!confirmOf(t), 'and asks first');

  // Off: with taboo off, the ask-out is not even offered, so there is nothing to confirm.
  setTaboo(false);
  const u = clone(s);
  ok(ctx.doAction(u, 'p_askout', sib.id) === false && !confirmOf(u), 'with taboo off a sibling cannot be asked out at all');
  setTaboo(true);
}

/* 6. ordinary people ------------------------------------------------- */
{
  const s = ctx.createLife({ country: 'us', year: 1990 });
  s.year += 30; s.player.edu.current = null;
  P(s).orient = 'bi';
  ctx.afterChange(s); s.pending = [];
  const f = ctx.makeAdultNear(s, { minAge: 25, maxAge: 35 });
  f.orient = 'bi'; f.partner = null;
  ctx.setRel(s, f.id, 'friend', 60);
  ok(ctx.doAction(s, 'p_askout', f.id) === true, 'a friend can be asked out');
  ok(!s.pending.some((q) => q.handler === 'confirmAction'), 'and nobody asks "are you sure?"');
  ok(ctx.count(s, 'askout_' + f.id) === 1, 'the ask-out ran straight away');
}

console.log(failures ? `Family checks: ${failures} failure(s)` : 'Family checks passed.');
process.exit(failures ? 1 : 0);
