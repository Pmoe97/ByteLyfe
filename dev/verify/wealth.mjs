// Big money:  node dev/verify/wealth.mjs
//
// Covers the top of the wealth ladder, so that a hundred-billion or trillion-dollar life is possible and not a wall:
//   1. a company's best-case sales keep climbing with every hundred locations, instead of flattening near thirty
//   2. a few locations behave as they always did
//   3. opening locations in packs (1, 5, 25, 100), paid from the company or from you, in two steps
//   4. the numbers show as billions and trillions
import { loadGame } from './loadgame.mjs';

const ctx = loadGame({ quiet: true });
const g = (name) => ctx.run(name);
ctx.seedRng(1337);
let failures = 0;
const ok = (cond, msg) => { if (!cond) { failures++; console.log('  ✖ ' + msg); } };
const IND = g('INDUSTRIES');
const asking = (s) => s.pending.find((p) => p.handler);
const answer = (s, value) => { const pp = asking(s); const i = pp.choices.findIndex((c) => c.value === value); if (i < 0) throw new Error('no choice ' + value + ' in ' + pp.title); return ctx.resolvePopup(s, pp.id, i); };

const owner = () => { const s = ctx.createLife({ country: 'us', year: 1990 }); s.year = 2026; s.pending = []; s.people[s.playerId].birthYear = 1986; s.player.money = 1e13; s.player.edu.current = null; return s; };
// A company at its best (reputation, quality and morale all high), at a given number of locations: its yearly sales.
function bestSales(s, ind, L) {
  const co = ctx.foundCompany(s, ind, 'Best ' + ind, {});
  co.rep = 100; co.products.forEach((p) => { p.q = 100; });
  co.locations = L;
  for (const r of Object.keys(co.team)) co.team[r].n = 0;
  ctx.staffLocations(s, co, L);
  for (const r of Object.keys(co.team)) { co.team[r].skill = 90; co.team[r].morale = 90; }
  return ctx.bizForecast(s, co).revenue;
}

/* 1. no wall --------------------------------------------------------------------- */
{
  const s = owner();
  for (const ind of ['restaurant', 'tech', 'pharma']) {
    const r = [1, 10, 100, 1000, 10000].map((L) => bestSales(s, ind, L));
    ok(r[1] > r[0] * 6 && r[2] > r[1] * 5 && r[3] > r[2] * 3 && r[4] > r[3] * 2.5, `${ind}: sales keep climbing with locations (${r.map((x) => ctx.fmtMoneyShort(x)).join(', ')})`);
  }
  // Worth, at its best, is sales times the industry's multiple, times 3 for a booming trend, times 1.4 for a perfect reputation (34-business.js companyYear).
  const best = (ind, L) => bestSales(s, ind, L) * IND[ind].mult * 3 * 1.4;
  ok(best('tech', 1000) > 2e11, `a thousand tech locations can be worth hundreds of billions (${ctx.fmtMoneyShort(best('tech', 1000))})`);
  ok(best('pharma', 10000) > 1e12, `and ten thousand pharma sites a trillion (${ctx.fmtMoneyShort(best('pharma', 10000))})`);
}

/* 2. small shops are about what they were ----------------------------------------- */
{
  const s = owner();
  const one = bestSales(s, 'cafe', 1), three = bestSales(s, 'cafe', 3);
  ok(three / one > 2.5 && three / one < 3.6, `three cafes sell about three times one (${(three / one).toFixed(2)}x)`);
}

/* 3. opening in packs -------------------------------------------------------------- */
{
  const s = owner(), co = ctx.foundCompany(s, 'cafe', 'Packs', {}), I = IND.cafe, cost = ctx.price(s, I.locBuild);
  co.cash = cost * 40; s.player.money = cost * 200;
  const n0 = co.locations;
  ctx.doAction(s, 'biz_open', co.id); answer(s, 5); answer(s, 'co');
  ok(co.locations === n0 + 5 && Math.abs(co.cash - cost * 35) < 1, `five at once, paid from the company (${co.locations} locations, cash ${co.cash})`);
  const m0 = s.player.money;
  s.pending = []; ctx.doAction(s, 'biz_open', co.id); answer(s, 100); answer(s, 'me');
  ok(co.locations === n0 + 105 && Math.abs(m0 - s.player.money - cost * 100) < 1, `a hundred at once, paid by you (${co.locations} locations)`);
  s.pending = []; ctx.doAction(s, 'biz_open', co.id);
  const pp = asking(s);
  ok(pp.choices.find((c) => c.value === 100).disabled === false && pp.choices.find((c) => c.value === 25).disabled === false, 'the packs you can pay for are open');
  s.player.money = cost * 2; co.cash = cost * 2; s.pending = []; ctx.doAction(s, 'biz_open', co.id);
  const poor = asking(s);
  ok(poor.choices.find((c) => c.value === 1).disabled === false && poor.choices.find((c) => c.value === 5).disabled === true, 'and the ones you can not are greyed out');
  const tally0 = s.player.life.locationsOpened;
  ok(tally0 === 105, `the locations opened are counted (${tally0})`);
  s.pending = []; s.player.money = cost * 200; ctx.doAction(s, 'biz_open', co.id); answer(s, 1); answer(s, 'me');
  ok(co.locations === n0 + 106, 'a single one still works');
}

/* 4. the way big numbers read -------------------------------------------------------- */
{
  ok(ctx.fmtMoneyShort(1.6e9) === '$1.6B' && ctx.fmtMoneyShort(2.5e11) === '$250B' && /T$/.test(ctx.fmtMoneyShort(1.2e12)), `billions and trillions read well (${ctx.fmtMoneyShort(1.6e9)}, ${ctx.fmtMoneyShort(2.5e11)}, ${ctx.fmtMoneyShort(1.2e12)})`);
}

if (failures) { console.log(`\n❌ ${failures} wealth check failures.`); process.exit(1); }
console.log('✅ Wealth checks passed.');
