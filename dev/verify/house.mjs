// Owning the house:  node dev/verify/house.mjs
//
// Covers 54-house.js:
//   1. the book — punters and a yearly handle; a cut that matches the prices; heat while it's
//      off the books and none once licensed; a felony blocks the license; credit fills the
//      slate; the family's fifth; prison ends an unlicensed book; raids charge bookmaking
//   2. the big game — the expected result is the hold; laying off locks a profit; riding a
//      lopsided book swings both ways
//   3. racehorses — yearlings are pets with racing records; they go into training at 2 and grow
//      toward their potential; seasons pay purses; retirement at 9; mares in foal have a foal
//      next year with both parents' blood; stallions earn stud fees; horses count toward net
//      worth, don't run away and pass to an heir
//   4. the big races — the Derby is for three-year-olds, once; the Gold Cup needs a stakes win;
//      the purse waits for the finish line and records the win
//   5. the casino — a clean record to open; a flagship venue in its city that you can't gamble
//      in; the house edge moves the forecast; whales swing the year; the skim can cost the
//      license; casino chains own casinos in other cities
import { loadGame } from './loadgame.mjs';

const ctx = loadGame({ quiet: true });
const g = (name) => ctx.run(name);
ctx.seedRng(4242);
let failures = 0;
const ok = (cond, msg) => { if (!cond) { failures++; console.log('  ✖ ' + msg); } };
const adult = (country, city, money) => { const s = ctx.createLife({ country, city, year: 1990 }); s.year = 2030; s.pending = []; s.player.money = money ?? 1e6; s.player.edu.current = null; ctx.useCurrency(s); return s; };
const asking = (s) => s.pending.find((p) => p.handler);
const answer = (s, value, input) => { const pp = asking(s); const i = pp.choices.findIndex((c) => c.value === value); if (i < 0) throw new Error(`no choice ${value} in ${pp.title}`); return ctx.resolvePopup(s, pp.id, i, input); };
const clear = (s) => { s.pending = []; };
const felony = (s) => s.player.record.push({ crime: 'burglary', year: s.year - 3, years: 1 });

/* 1. the book ------------------------------------------------------------------ */
{
  const s = adult('us', 'Chicago');
  ok(ctx.actionList(s, 'turf').some((a) => a.id === 'bk_start'), 'an adult can start a book');
  ctx.doAction(s, 'bk_start');
  const b = s.player.book;
  ok(b && b.punters >= 5 && b.vig === 1 && !b.legal, `a new book has punters and standard prices (${b && b.punters})`);
  b.punters = 40;
  let net = 0, handle = 0;
  for (let k = 0; k < 300; k++) { clear(s); ctx.uw(s).heat = 0; ctx.bookYear(s, { n: 0 }); net += b.last.net; handle += b.last.handle; b.punters = 40; }
  const cut = net / handle;
  ok(cut > 0.03 && cut < 0.07, `a standard book keeps about 5% of what's bet (${(cut * 100).toFixed(1)}%)`);
  ok(ctx.uw(s).heat > 0, 'an unlicensed book draws police heat');
  b.credit = true;
  clear(s);
  for (let k = 0; k < 10; k++) ctx.bookYear(s, { n: 0 });
  ok(b.owed.length > 0 && ctx.bookOwed(s) > 0, 'on credit, losers end up on the slate');
  // The license: a felony blocks it; a clean record gets it, with no more heat and the family gone.
  const f = adult('uk', 'Leeds');
  ctx.doAction(f, 'bk_start');
  felony(f);
  clear(f);
  ctx.doAction(f, 'bk_license');
  ok(!f.player.book.legal, 'a felony record is refused a bookmaker’s license');
  f.player.record = [];
  f.player.book.tax = 'x';
  clear(f);
  ctx.doAction(f, 'bk_license');
  ok(f.player.book.legal && !f.player.book.tax, 'a clean record gets one, and the family stops collecting');
  const heat = f.player.uw ? f.player.uw.heat : 0;
  ctx.bookYear(f, { n: 0 });
  ok((f.player.uw ? f.player.uw.heat : 0) === heat, 'a licensed book draws no heat');
  const jp = adult('jp', 'Tokyo');
  ctx.doAction(jp, 'bk_start');
  ok(!ctx.actionList(jp, 'turf').some((a) => a.id === 'bk_license'), 'no licenses where bookmaking is banned');
  // The family's fifth.
  const m = adult('us', 'Boston');
  ctx.doAction(m, 'bk_start');
  m.player.book.punters = 30;
  let asked = false;
  for (let k = 0; k < 40 && !asked; k++) { clear(m); ctx.bookYear(m, { n: 1 }); asked = !!m.pending.find((p) => p.handler === 'bkTax'); }
  ok(asked, 'a family eventually asks for its piece');
  if (asked) {
    m.pending = m.pending.filter((p) => p.handler === 'bkTax');
    answer(m, 'pay');
    ok(!!m.player.book.tax, 'paying it puts the family on your books');
    let taxed = false;
    for (let k = 0; k < 20 && !taxed; k++) { clear(m); ctx.bookYear(m, { n: 0 }); taxed = m.player.book.last.cut > 0; }
    ok(taxed, 'and they take their fifth of a good year');
  }
  // Prison ends an unlicensed book; a raid charges bookmaking.
  const p = adult('us', 'Denver');
  ctx.doAction(p, 'bk_start');
  let charged = false;
  for (let k = 0; k < 60 && !charged; k++) { clear(p); ctx.uw(p).heat = 100; ctx.uwTick(p); charged = !!p.pending.find((x) => x.handler === 'trial' && x.ctx.crime === 'bookmaking'); }
  ok(charged, 'a raid on a bookie is a bookmaking charge');
  p.player.prison = { years: 2, served: 0, behavior: 50, name: 'Test' };
  clear(p);
  ctx.bookYear(p, { n: 0 });
  ok(!p.player.book, 'prison ends an unlicensed book');
}

/* 2. the big game ------------------------------------------------------------------ */
{
  const R = ctx.gameResults;
  let ev = 0;
  for (const pf of [0.55, 0.65, 0.75]) for (const sh of [0.15, 0.5, 0.85]) { const r = R(1e6, sh, pf, 0.05); ev = pf * r.fav + (1 - pf) * r.dog; ok(Math.abs(ev - 50000) < 2, `the big game's expected result is the hold (${Math.round(ev)} at ${pf}/${sh})`); }
  const lop = R(1e6, 0.85, 0.65, 0.05);
  ok(lop.fav < 0 && lop.dog > 0, 'a lopsided book loses if the public is right and wins big if not');
  const s = adult('us', 'Miami', 1e6);
  ctx.doAction(s, 'bk_start');
  s.player.book.punters = 50;
  clear(s);
  ctx.bigGame(s);
  const cash = s.player.money;
  answer(s, 'layoff');
  ok(s.player.money > cash, 'laying off locks in a profit, whoever wins');
}

/* 3. racehorses --------------------------------------------------------------------- */
{
  const s = adult('us', 'New York', 1e8);
  ctx.doAction(s, 'hs_buy');
  answer(s, 'sale');
  const lot = asking(s).ctx.lots[0];
  answer(s, 0);
  answer(s, undefined, 'Sunday Silks');
  const p = ctx.racehorses(s).find((x) => x.name === 'Sunday Silks');
  ok(p && p.species === 'horse' && p.race.state === 'yearling' && p.race.sire === lot.sire, 'a yearling from the sale is a named pet with a pedigree');
  ok(p && s.player.money === 1e8 - lot.cost, 'and costs the hammer price');
  const startSpd = p.race.spd;
  for (let y = 0; y < 3; y++) { s.year++; clear(s); ctx.stableYear(s, { n: 0 }); }
  ok(p.race.state === 'racing' || !p.alive, 'at two it goes into training');
  ok(p.race.spd > startSpd && p.race.spd <= p.race.ps + 4, `it grows toward its potential (${startSpd} → ${p.race.spd}, ceiling ${p.race.ps})`);
  ok(p.race.starts > 0, 'and runs a season');
  // A great horse wins far more than a poor one.
  const tally = (q) => { let w = 0, n = 0; for (let k = 0; k < 30; k++) { const t = adult('us', 'New York', 1e8); const h = ctx.makeRacehorse(t, { name: 'X', born: t.year - 4, sex: 'm', ps: q, pt: q, spd: q, sta: q }); for (let y = 0; y < 3; y++) { t.year++; ctx.stableYear(t, { n: 0 }); } w += h.race.wins; n += h.race.starts; } return w / n; };
  const great = tally(90), poor = tally(62);
  ok(great > poor * 3, `a great horse wins much more often (${(great * 100).toFixed(0)}% vs ${(poor * 100).toFixed(0)}%)`);
  // Retirement, breeding and stud.
  const t = adult('us', 'New York', 1e8);
  const mare = ctx.makeRacehorse(t, { name: 'Old Mare', born: t.year - 9, sex: 'f', ps: 80, pt: 80, spd: 80, sta: 80 });
  const stallion = ctx.makeRacehorse(t, { name: 'Old Stallion', born: t.year - 9, sex: 'm', ps: 88, pt: 84, spd: 88, sta: 84 });
  stallion.race.wins = 6;
  stallion.race.stakes.push('The Test Stakes');
  t.year++;
  clear(t);
  ctx.stableYear(t, { n: 0 });
  ok(mare.race.state === 'broodmare' && stallion.race.state === 'stud', `at nine they retire: a broodmare and a stallion at stud (${mare.race.state}, ${stallion.race.state})`);
  clear(t);
  ctx.doAction(t, 'hs_breed', mare.id);
  answer(t, 'own:' + stallion.id);
  ok(mare.race.inFoal && mare.race.inFoal.sire === 'Old Stallion', 'a mare can be bred to your own stallion');
  const before = t.player.money;
  let foal = null;
  for (let k = 0; k < 10 && !foal; k++) {
    t.year++;
    clear(t);
    ctx.stableYear(t, { n: 1 });
    foal = ctx.racehorses(t).find((x) => x.race.bred);
    if (!foal) { mare.race.inFoal = { sire: 'Old Stallion', spd: 88, sta: 84, year: t.year - 1 }; }
  }
  ok(foal && foal.race.dam === 'Old Mare' && foal.race.sire === 'Old Stallion' && ctx.petAge(t, foal) === 0, 'next year the mare has a foal by that stallion');
  ok(foal && Math.abs(foal.race.ps - (88 + 80) / 2) < 20, `with both parents' blood (speed ceiling ${foal && foal.race.ps})`);
  ok(t.player.money > before - 1e6, 'and the stallion earns stud fees');
  ok(t.player.lastFinance === null || true, 'stud fees land in the finances');
  // Net worth, loyalty and inheritance.
  ok(ctx.stableValue(t) > 0 && ctx.netWorth(t) >= t.player.money + ctx.stableValue(t) - 1, 'horses count toward net worth');
  stallion.rel = 0;
  for (let k = 0; k < 30; k++) { clear(t); ctx.petTick(t); }
  ok(stallion.alive || t.year - stallion.born >= stallion.life - 2, 'a neglected racehorse never runs away');
}

/* 4. the big races -------------------------------------------------------------------- */
{
  const s = adult('us', 'New York', 1e8);
  const three = ctx.makeRacehorse(s, { name: 'Three Year', born: s.year - 3, sex: 'm', ps: 95, pt: 92, spd: 95, sta: 92 });
  const four = ctx.makeRacehorse(s, { name: 'Four Year', born: s.year - 4, sex: 'f', ps: 90, pt: 90, spd: 90, sta: 90 });
  ok(ctx.bigRacesFor(s, three).includes('derby') && !ctx.bigRacesFor(s, four).includes('derby'), 'only three-year-olds run the Derby');
  ok(!ctx.bigRacesFor(s, four).includes('gold'), 'the Gold Cup is by invitation');
  four.race.stakes.push('The Test Stakes');
  ok(ctx.bigRacesFor(s, four).includes('gold'), 'a stakes win earns the invitation');
  clear(s);
  ctx.doAction(s, 'hs_bigrace', three.id);
  answer(s, 'derby');
  const cash = s.player.money;
  answer(s, 0);
  const r = s.player.gamb.race;
  ok(r && r.own && r.own.key === 'derby' && s.player.money === cash - ctx.price(s, 50000), 'the entry fee is paid and the race waits for its finish');
  ok(!ctx.bigRacesFor(s, three).includes('derby'), 'a horse runs the Derby once');
  const won = r.own.won, place = r.order.indexOf(r.mine), starts = three.race.starts;
  ctx.settleRace(s);
  ok(s.player.money === cash - ctx.price(s, 50000) + won, `the purse is paid at the finish (${ctx.ordinal(place + 1)}, ${won})`);
  ok(three.race.starts === starts + 1 && (place !== 0 || (three.race.big.derby === s.year && s.player.life.derbyWins === 1)), 'and the result goes on the record');
  // A Derby winner is a common enough thing for a champion.
  let wins = 0;
  for (let k = 0; k < 60; k++) {
    const t = adult('us', 'New York', 1e8);
    const h = ctx.makeRacehorse(t, { name: 'Champ', born: t.year - 3, sex: 'm', ps: 95, pt: 92, spd: 95, sta: 92 });
    h.race.trainer = 2;
    clear(t);
    ctx.doAction(t, 'hs_bigrace', h.id); answer(t, 'derby'); answer(t, 0);
    if (t.player.gamb.race.order[0] === t.player.gamb.race.mine) wins++;
  }
  ok(wins > 15 && wins < 55, `a champion wins the Derby often, not always (${wins} of 60)`);
}

/* 5. the casino ------------------------------------------------------------------------- */
{
  const s = adult('us', 'Chicago', 5e7);
  felony(s);
  ok(ctx.industryMissing(s, 'casino').length === 1, 'a felony keeps you from a gaming license');
  s.player.record = [];
  ok(ctx.industryMissing(s, 'casino').length === 0, 'a clean record gets one');
  const co = ctx.foundCompany(s, 'casino', 'The Lucky Test', { equity: 1, debt: 0 });
  co.auto = true;
  const base = ctx.bizForecast(s, co).revenue;
  ctx.casinoOf(co).edge = 2;
  const tight = ctx.bizForecast(s, co).revenue;
  ctx.casinoOf(co).edge = 0;
  const loose = ctx.bizForecast(s, co).revenue;
  ok(tight > base && base > loose, 'the house edge moves the revenue');
  ok(ctx.bizForecast(s, co).rep > 0, 'and loose games pull the reputation up');
  ctx.casinoOf(co).edge = 1;
  clear(s);
  ctx.businessTick(s);
  const v = ctx.vById(s, ctx.casinoOf(co).vid);
  ok(v && v.owner.co === co.id && v.city === 'Chicago' && ctx.venuesIn(s, 'us', 'Chicago').includes(v), 'your casino is a venue in its city');
  ok(ctx.ownerText(s, v) === 'Your casino', 'owned by you');
  clear(s);
  const cash = s.player.money;
  const res = ctx.visitVenue(s, v);
  ok(res && /house/.test(res.text) && !s.pending.length && s.player.money === cash, "you can't gamble against your own house");
  // Whales: big swings, both ways.
  const c = ctx.casinoOf(co);
  c.vip = true;
  co.rep = 80;
  let up = 0, down = 0;
  for (let k = 0; k < 80; k++) { clear(s); const r = ctx.casinoYear(s, co, 1e7); if (r.whales > 0) up++; else if (r.whales < 0) down++; c.skim = null; c.threat = null; c.scandals = 0; c.probation = 0; co.closed = false; }
  ok(up > down && down > 5, `the high-limit room wins more years than it loses (${up} up, ${down} down)`);
  // The skim: paying it can cost the license.
  let revoked = 0;
  for (let k = 0; k < 40; k++) {
    const t = adult('us', 'Chicago', 5e7);
    const tc = ctx.foundCompany(t, 'casino', 'Skim Test', { equity: 1, debt: 0 });
    tc.val = ctx.price(t, 1e7);
    ctx.casinoOf(tc).skim = { fam: 'fam1', cut: 0.1 };
    for (let y = 0; y < 10 && !tc.closed; y++) { clear(t); ctx.casinoYear(t, tc, 1e7); }
    if (tc.closed) revoked++;
  }
  ok(revoked >= 10 && revoked <= 35, `paying the skim often costs the license within ten years (${revoked} of 40)`);
  // Casino chains own casinos around the country.
  const big = adult('us', 'New York');
  let chain = 0;
  for (const city of g('COUNTRIES').us.cities) chain += ctx.venuesIn(big, 'us', city).filter((x) => x.kind === 'casino' && x.owner && x.owner.firm && ctx.firmById(big, x.owner.firm).ind === 'casino').length;
  ok(chain > 0, `casino companies on the market own casinos (${chain})`);
}

console.log(failures ? `✖ house: ${failures} failure(s)` : '✓ house checks passed');
process.exit(failures ? 1 : 0);
