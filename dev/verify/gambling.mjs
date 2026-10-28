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
//   8. the lottery — one visible jackpot a year from 20 million to 1.6 billion (and a new one when it is won), no ticket
//      limit, packs of tickets, and the odds of each prize
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

/* 8. the lottery -------------------------------------------------------------- */
{
  const LOTTO = g('LOTTO');
  const life = (id, year) => { const s = adult('us', 'Chicago', 1e12); s.id = id; s.year = year; s.people[s.playerId].birthYear = year - 40; return s; };
  // The jackpot: seen before you buy, fixed for the year, a new one each year, always between 20 million and 1.6 billion (2026 dollars).
  const s = life('life_a', 2026);
  ok(ctx.lottoJackpot(s) === ctx.lottoJackpot(s) && /Jackpot/.test(g('ACTIONS').lottery.sub(s)), 'the jackpot is the same every time you look, and the menu shows it');
  const seen = [];
  for (let k = 0; k < 4000; k++) { const x = life('life_' + (k % 40), 2026 + Math.floor(k / 40)); seen.push(ctx.lottoJackpot(x)); }
  seen.sort((a, b) => a - b);
  ok(seen[0] >= 19.5e6 && seen[seen.length - 1] <= 1.61e9, `jackpots run from ${(seen[0] / 1e6).toFixed(0)} million to ${(seen[seen.length - 1] / 1e9).toFixed(2)} billion`);
  const share = (lo) => seen.filter((x) => x >= lo).length / seen.length;
  ok(seen[2000] > 55e6 && seen[2000] < 110e6, `the usual jackpot is modest (median ${(seen[2000] / 1e6).toFixed(0)} million)`);
  ok(share(1e9) > 0.03 && share(1e9) < 0.1 && share(1.4e9) > 0.002, `but a billion is not out of reach (${(share(1e9) * 100).toFixed(1)}% of years reach it, ${(share(1.4e9) * 100).toFixed(2)}% 1.4 billion)`);
  ok(Array.from({ length: 29 }, (_, k) => ctx.lottoJackpot(life('life_a', 2026 + k)) !== ctx.lottoJackpot(life('life_a', 2027 + k))).filter(Boolean).length >= 27, 'it is a different number almost every year');
  ok(ctx.lottoJackpot(life('life_a', 2026)) !== ctx.lottoJackpot(life('life_b', 2026)), 'and another family line has its own');
  // No limit, and packs: the old cap was fifteen a year.
  const t = life('life_c', 2026);
  for (let k = 0; k < 40; k++) { t.pending = []; ctx.doAction(t, 'lottery'); const pp = asking(t); ctx.resolvePopup(t, pp.id, pp.choices.findIndex((c) => c.value === 10)); }
  ok(!t.log.some((e) => e.lines.some((l) => /refuses to sell/.test(l.t))), 'the clerk never refuses');
  ok(t.player.counters.lottery === undefined, 'there is no yearly count to run out');
  const menu = life('life_d', 2026); menu.player.money = 120; menu.pending = []; ctx.doAction(menu, 'lottery');
  const mp = asking(menu);
  ok(mp.choices.map((c) => c.value).join() === '1,10,100,1000,10000,0' && mp.choices.find((c) => c.value === 10).disabled === false && mp.choices.find((c) => c.value === 100).disabled === true, 'packs of 1 to 10,000 tickets, the ones you can not pay for greyed out');
  ok(/1 in 250,000/.test(mp.text) && mp.text.includes(ctx.fmtMoney(ctx.lottoJackpot(menu))), 'and the popup says the jackpot and its odds');
  // One ticket at a time: a prize about one time in ten.
  const v = life('life_f', 2026); v.player.money = 1e12; ctx.seedRng(321);
  let n1 = 0, wonAny = 0;
  for (let k = 0; k < 20000; k++) { const before = v.player.money; v.pending = []; ctx.doAction(v, 'lottery'); const pq = asking(v); ctx.resolvePopup(v, pq.id, pq.choices.findIndex((c) => c.value === 1)); n1++; if (v.player.money > before - ctx.price(v, 5)) wonAny++; }
  ok(Math.abs(wonAny / n1 - 0.1) < 0.012, `about one ticket in ten wins something (${(100 * wonAny / n1).toFixed(1)}%)`);
  // A win draws a new jackpot, and pays the one you saw.
  const w = life('life_g', 2026); w.player.money = 1e13; const first = ctx.lottoJackpot(w); let hit = 0, paid = false;
  for (let k = 0; k < 4000 && !hit; k++) { const m0 = w.player.money; w.pending = []; ctx.doAction(w, 'lottery'); const pp = asking(w); ctx.resolvePopup(w, pp.id, pp.choices.findIndex((c) => c.value === 1000)); if (w.lotto && w.lotto.wins > 0) { hit = k + 1; paid = w.player.money - m0 > first * 0.9; } }
  ok(hit > 0 && paid, `a win pays the jackpot you saw (${hit} packs of a thousand)`);
  ok(w.lotto.wins === 1 && ctx.lottoJackpot(w) !== first, `and the jackpot is drawn again straight away (${w.lotto.wins} wins, ${first} then ${ctx.lottoJackpot(w)})`);
  ok(ctx.lottoJackpot(life('life_g', 2027)) !== ctx.lottoJackpot(w), 'while next year starts over');
  ok(w.player.life.jackpots >= 1, 'the win is counted for the Jackpot! achievement');
  // History: no state lottery before 1964 (with history on).
  g('META').settings.history = true;
  ok(!ctx.actionAvailable(g('ACTIONS').lottery, life('life_h', 1950)) && ctx.actionAvailable(g('ACTIONS').lottery, life('life_h', 1970)), 'there is no lottery before 1964');
  g('META').settings.history = false;
}

if (failures) { console.log(`\n❌ ${failures} gambling check failures.`); process.exit(1); }
console.log('✅ Gambling checks passed.');
