// Gambling verification:  node dev/verify/gambling.mjs
//
// Covers 53-gambling.js:
//   1. venues — every city gets a bookie; Silver Mesa is a casino city; venues persist;
//      back rooms belong to crime families and resorts to hotel companies; one app
//   2. standing — wagering climbs the tiers; Whales fly free to Silver Mesa
//   3. credit — bookies and back rooms lend, the app doesn't, and lines have limits
//   4. horse racing — odds are sane, every horse finishes, positions never go backwards,
//      the payout waits for the finish, and a race left running settles on the next action
//   5. season bets — they pay out when the season is played
//   6. debts — unpaid debts escalate; beatings break bones far more often than they kill;
//      family is only threatened with Mature on; unpaid casino markers end up in court
//   7. limits — the self-exclusion list shuts casinos, tracks and the app (not bookies);
//      counting cards gets you banned across the chain; the main event is in Silver Mesa
import { loadGame } from './loadgame.mjs';

const ctx = loadGame({ quiet: true });
const g = (name) => ctx.run(name);
ctx.seedRng(808);
let failures = 0;
const ok = (cond, msg) => { if (!cond) { failures++; console.log('  ✖ ' + msg); } };
const META = g('META');
const adult = (country, city, money) => { const s = ctx.createLife({ country, city, year: 1990 }); s.year = 2030; s.pending = []; s.player.money = money ?? 1e6; s.player.edu.current = null; ctx.useCurrency(s); return s; };
// Answers the first popup that asks something (achievement notices queue up behind it).
const asking = (s) => s.pending.find((p) => p.handler);
const answer = (s, value) => { const pp = asking(s); const i = pp.choices.findIndex((c) => c.value === value); return ctx.resolvePopup(s, pp.id, i); };

/* 1. venues ------------------------------------------------------------------- */
{
  const s = adult('us', 'Chicago');
  for (const cc of Object.keys(g('COUNTRIES'))) for (const city of g('COUNTRIES')[cc].cities) ok(ctx.venuesIn(s, cc, city).some((v) => v.kind === 'bookie'), `${city} has no bookie`);
  const mesa = ctx.venuesIn(s, 'us', 'Silver Mesa');
  ok(mesa.filter((v) => v.kind === 'casino').length === 4 && mesa.filter((v) => v.kind === 'resort').length === 4, 'Silver Mesa has four casinos and four resorts');
  const again = ctx.venuesIn(s, 'us', 'Silver Mesa');
  ok(mesa.map((v) => v.id).join() === again.map((v) => v.id).join(), 'venues persist between looks');
  const back = mesa.find((v) => v.kind === 'backroom'), resort = mesa.find((v) => v.kind === 'resort');
  ok(back.owner.fam && g('underworldOf')(s).families[back.owner.fam], 'a back room belongs to a crime family');
  ok(resort.owner.firm && ctx.firmById(s, resort.owner.firm).ind === 'hotel', 'a resort belongs to a hotel company');
  ok(ctx.appVenue(s) === ctx.appVenue(s) && ctx.venuesReach(s).filter((v) => v.kind === 'app').length === 1, 'there is one betting app');
}

/* 2. standing ------------------------------------------------------------------- */
{
  const s = adult('us', 'Silver Mesa', 1e9);
  const v = ctx.venuesIn(s, 'us', 'Silver Mesa').find((x) => x.kind === 'resort');
  for (let i = 0; i < 25; i++) ctx.wagered(s, v, ctx.price(s, 100000));
  ok(ctx.vStand(s, v.id).tier === 4 && s.player.life.whale === 1, `big spending makes you a Whale (${ctx.tierName(s, v.id)})`);
  const t = adult('uk', 'Leeds', 1e6);
  const tv = ctx.venuesIn(t, 'us', 'Silver Mesa').find((x) => x.kind === 'resort');
  ctx.vStand(t, tv.id).tier = 4;
  ok(ctx.casinoPerk(t), 'a Whale gets the free jet');
  const before = t.player.money;
  ctx.doAction(t, 'g_trip');
  ok(t.player.money === before && ctx.tripKey(t) === 'us:Silver Mesa', 'and the trip costs nothing');
}

/* 3. credit ---------------------------------------------------------------------- */
{
  const s = adult('us', 'Denver', 0);
  const bookie = ctx.venuesIn(s, 'us', 'Denver').find((v) => v.kind === 'bookie');
  ok(ctx.creditLine(s, bookie) > 0 && ctx.creditLine(s, ctx.appVenue(s)) === 0, 'bookies lend, the app does not');
  ok(ctx.stake(s, bookie, ctx.price(s, 1000), true), 'a bet on credit goes through');
  const d = s.player.gamb.debts[0];
  ok(d && d.amt === ctx.price(s, 1000) && d.rate === 0.3 && s.player.rels[d.pid].kind === 'bookie', 'and becomes a debt to a bookie you now know');
  ok(!ctx.stake(s, bookie, ctx.creditLine(s, bookie), true), 'credit has a limit');
}

/* 4. horse racing -------------------------------------------------------------- */
{
  const s = adult('us', 'New York', 1e6);
  const track = ctx.venuesIn(s, 'us', 'New York').find((v) => v.kind === 'track');
  ok(!!track, 'New York has a racetrack');
  const field = ctx.raceField(s, track);
  const book = field.reduce((n, f) => n + 1 / f.dec, 0);
  ok(field.length === 8 && book > 1 && book < 1.4, `the odds carry a track take (book ${book.toFixed(2)})`);
  for (let k = 0; k < 20; k++) {
    const r = ctx.runRace(s, track, ctx.raceField(s, track));
    const sorted = r.order.slice().sort().join();
    ok(sorted === [0, 1, 2, 3, 4, 5, 6, 7].join(), 'every horse finishes, once');
    let back = false;
    for (let f = 1; f < r.frames.length; f++) for (let i = 0; i < 8; i++) if (r.frames[f][i] < r.frames[f - 1][i]) back = true;
    ok(!back, 'no horse ever runs backwards');
    ok(r.frames[r.frames.length - 1][r.order[0]] === 100, 'the winner crosses the line');
  }
  // Place a real bet through the popups.
  s.pending = [];
  ctx.visitVenue(s, track);
  answer(s, 'horses');
  const pick = asking(s).choices[0].value;
  answer(s, pick);
  const bet = asking(s).choices.find((c) => String(c.value).startsWith('win:') && !c.disabled).value;
  const cash = s.player.money;
  answer(s, bet);
  const race = s.player.gamb.race;
  ok(race && s.player.money === cash - Number(bet.split(':')[1]), 'the stake is paid and the race waits for its finish');
  const expect = race.payout;
  s.pending = [];
  ctx.doAction(s, 'g_scratch');
  ok(!s.player.gamb.race, 'taking another action settles the race');
  ok(s.log[s.log.length - 1].lines.some((l) => l.t.startsWith('🏇')), 'and the result goes in the log');
  ok(s.player.money >= cash - Number(bet.split(':')[1]) - ctx.price(s, 20) + expect - 1, 'with the payout, if any');
}

/* 5. season bets -------------------------------------------------------------------- */
{
  const s = adult('us', 'Atlanta', 1e6);
  const v = ctx.appVenue(s);
  const odds = ctx.teamOdds(s, 'soccer');
  s.pending = [];
  ctx.resolvePopup(s, ctx.popup(s, { title: 'x', handler: 'gSportBet', ctx: { v: v.id, sport: 'soccer', team: odds[0].name, dec: odds[0].dec }, choices: [{ label: 'bet', value: ctx.price(s, 1000) }] }).id, 0);
  ok(s.player.gamb.bets.length === 1, 'a season bet is riding');
  s.pending = [];
  ctx.ageUp(s);
  ok(s.player.gamb.bets.length === 0, 'it settles when the season is played');
  ok(s.log[s.log.length - 1].lines.some((l) => l.t.includes('won the')), 'and the champion is announced');
}

/* 6. debts -------------------------------------------------------------------------------- */
{
  let deaths = 0, bones = 0, hospital = 0;
  for (let k = 0; k < 400; k++) {
    const s = adult('us', 'Phoenix', 0);
    const d = { who: 'A bookie' };
    const t = ctx.beating(s, d);
    if (s.dead) deaths++; else if (/broke/.test(t)) bones++; else hospital++;
  }
  ok(bones > 280 && deaths >= 1 && deaths <= 30, `beatings mostly break bones (${bones} bones, ${hospital} hospital, ${deaths} deaths of 400)`);
  const s = adult('us', 'Phoenix', 0);
  const bookie = ctx.venuesIn(s, 'us', 'Phoenix').find((v) => v.kind === 'bookie');
  ctx.addDebt(s, bookie, ctx.price(s, 5000));
  const debt = s.player.gamb.debts[0];
  debt.paid = s.year - 5;
  for (let y = 0; y < 3; y++) { s.pending = []; ctx.debtYear(s, debt, { n: 0 }); }
  ok(debt.stage === 3 && debt.amt > ctx.price(s, 5000), `an unpaid debt escalates and grows (stage ${debt.stage})`);
  // Refusing a favor with Mature off never touches family.
  META.settings.mature = false;
  const sib = ctx.relPeople(s, ['sibling', 'parent'])[0];
  const hp = sib ? sib.stats.health : 0;
  debt.stage = 4;
  s.pending = [];
  ctx.resolvePopup(s, ctx.popup(s, { title: 'x', handler: 'gFavor', ctx: { id: debt.id }, choices: [{ label: 'no', value: 'refuse' }] }).id, 0);
  ok(!sib || sib.stats.health === hp, 'with Mature off, your family is never hurt');
  // Casino markers go to court.
  const c = adult('us', 'Silver Mesa', 0);
  const casino = ctx.venuesIn(c, 'us', 'Silver Mesa').find((v) => v.kind === 'resort');
  ctx.addDebt(c, casino, ctx.price(c, 50000));
  const m = c.player.gamb.debts[0];
  m.since = c.year - 2; m.paid = c.year - 2;
  c.pending = [];
  ctx.debtYear(c, m, { n: 1 });
  ok(!c.player.gamb.debts.length && c.pending.some((p) => p.handler === 'ctCounsel'), 'an unpaid marker becomes a lawsuit');
}

/* 7. limits -------------------------------------------------------------------------------- */
{
  const s = adult('us', 'Chicago', 1e6);
  s.player.life.gambled = 1;
  ctx.doAction(s, 'g_exclude');
  ok(ctx.excluded(s), 'you can put yourself on the self-exclusion list');
  const vs = ctx.venuesIn(s, 'us', 'Chicago');
  const casino = vs.find((v) => v.kind === 'casino'), bookie = vs.find((v) => v.kind === 'bookie');
  s.pending = [];
  ok(/self-exclusion/.test(ctx.visitVenue(s, casino).text), 'casinos turn you away');
  s.pending = [];
  ctx.visitVenue(s, bookie);
  ok(s.pending.some((p) => p.handler === 'gVenue'), 'the bookie does not');
  const t = adult('us', 'Silver Mesa', 1e7);
  t.people[t.playerId].stats.smarts = 90; t.player.skills.cards = 60;
  const r = ctx.venuesIn(t, 'us', 'Silver Mesa').find((v) => v.kind === 'resort');
  let banned = false;
  for (let k = 0; k < 10 && !banned; k++) { t.player.counters = {}; ctx.playGame(t, r, 'count', ctx.price(t, 1000), false); banned = ctx.vStand(t, r.id).banned > t.year; }
  ok(banned, 'counting cards gets you backed off');
  const chain = Object.values(t.venues).filter((x) => x.owner && x.owner.firm === r.owner.firm);
  ok(chain.every((x) => ctx.vStand(t, x.id).banned > t.year), `the ban covers every casino the owner runs (${chain.length})`);
  const chicago = adult('us', 'Chicago', 1e7);
  const cr = ctx.venuesIn(chicago, 'us', 'Chicago').find((v) => v.kind === 'resort' || v.kind === 'casino');
  chicago.pending = [];
  ctx.pokerMenu(chicago, cr);
  ok(!chicago.pending[0].choices.some((c) => c.value === 'main'), 'the main event is only in Silver Mesa');
}

if (failures) { console.log(`\n❌ ${failures} gambling check failures.`); process.exit(1); }
console.log('✅ Gambling checks passed.');
