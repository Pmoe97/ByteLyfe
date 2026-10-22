// Currency verification:  node dev/verify/currency.mjs
//
// Covers 50-currency.js:
//   1. data — every country has a currency; formats look local (₹8,30,000, 5,000 kr, -£250)
//   2. display — a life shows its own currency, the US-dollar setting switches it off,
//      and a Japanese life never shows a plain "$" in forty years of text
//   3. strength — fxTick keeps every currency inside its bounds and nudges it back to normal
//   4. emigrating — cash converts at strength(old) / strength(new) less 2%; inside the
//      eurozone nothing changes; savings in the new currency become cash, free
//   5. foreign savings — buying costs 1.5%, the value rides the two currencies, selling pays out
//   6. trips abroad — cost more when your money is weak, the same at home
import { loadGame } from './loadgame.mjs';

const ctx = loadGame({ quiet: true });
const g = (name) => ctx.run(name);
ctx.seedRng(777);
let failures = 0;
const ok = (cond, msg) => { if (!cond) { failures++; console.log('  ✖ ' + msg); } };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

const COUNTRIES = g('COUNTRIES'), CURRENCIES = g('CURRENCIES'), META = g('META');
const adult = (country, money) => {
  const s = ctx.createLife({ country, year: 2000 });
  s.year = 2030;
  s.pending = [];
  s.player.money = money;
  ctx.useCurrency(s);
  return s;
};
const drain = (s) => { let n = 0; while (s.pending.length && n++ < 60) { const pp = s.pending[0]; const i = pp.choices.findIndex((c) => !c.disabled); ctx.resolvePopup(s, pp.id, Math.max(0, i)); } s.pending = []; };
const act = (s, id, t) => { s.pending = []; return ctx.doAction(s, id, t); };
const answer = (s, value) => { const pp = s.pending[0]; const i = pp.choices.findIndex((c) => c.value === value); return ctx.resolvePopup(s, pp.id, i); };

/* 1. data and formats ------------------------------------------------------- */
for (const cc in COUNTRIES) ok(!!CURRENCIES[ctx.curOf(cc)], `${cc} has no currency`);
const f = (code, local) => ctx.fmtMoney(local / CURRENCIES[code].rate, ctx.curFmt(code));
const fs = (code, local) => ctx.fmtMoneyShort(local / CURRENCIES[code].rate, ctx.curFmt(code));
ok(f('INR', 830000) === '₹8,30,000', `Indian grouping: ${f('INR', 830000)}`);
ok(fs('INR', 830000) === '₹8.3L' && fs('INR', 12345678) === '₹1.2 Cr', `lakh and crore: ${fs('INR', 830000)} ${fs('INR', 12345678)}`);
ok(f('SEK', 5000) === '5,000 kr', `kronor go after the number: ${f('SEK', 5000)}`);
ok(f('GBP', -250) === '-£250', `negative pounds: ${f('GBP', -250)}`);
ok(fs('JPY', 7500000) === '¥7.5M', `short yen: ${fs('JPY', 7500000)}`);

/* 2. display --------------------------------------------------------------- */
{
  const s = adult('jp', 10000);
  ok(ctx.fmtMoney(10000) === '¥1,500,000', `a Japanese life shows yen: ${ctx.fmtMoney(10000)}`);
  META.settings.currency = 'usd';
  ctx.useCurrency(s);
  ok(ctx.fmtMoney(10000) === '$10,000', 'the US-dollar setting shows dollars');
  META.settings.currency = 'local';
  const life = ctx.createLife({ country: 'jp' });
  for (let i = 0; i < 40 && !life.dead; i++) { drain(life); ctx.ageUp(life); }
  drain(life);
  const lines = life.log.flatMap((e) => e.lines.map((l) => l.t));
  const leak = lines.find((t) => /(^|[^A-Za-z])\$\d/.test(t));
  ok(!leak, `a Japanese life leaked dollars: "${leak}"`);
  ok(lines.some((t) => t.includes('¥')), 'a Japanese life mentions yen somewhere');
}

/* 3. strength ---------------------------------------------------------------- */
{
  const s = adult('br', 0);
  const fx = ctx.fxState(s);
  fx.BRL.str = 1.5;
  for (let i = 0; i < 200; i++) ctx.fxTick(s);
  for (const k in fx) ok(fx[k].str >= 0.5 && fx[k].str <= 1.6, `${k} strength ${fx[k].str} out of bounds`);
  let total = 0;
  for (let i = 0; i < 400; i++) { ctx.fxTick(s); total += fx.EUR.str; }
  ok(near(total / 400, 1, 0.12), `the euro averages about 1 over time (${(total / 400).toFixed(2)})`);
}

/* 4. emigrating ---------------------------------------------------------------- */
{
  const s = adult('mx', 100000);
  const fx = ctx.fxState(s);
  fx.MXN.str = 1.2; fx.USD.str = 1;
  const text = ctx.exchangeOnEmigrate(s, 'mx', 'us');
  ok(near(s.player.money, 100000 * 1.2 * 0.98, 2), `strong pesos buy more dollars (${s.player.money})`);
  ok(/MX\$/.test(text) && /\$\d/.test(text), `the exchange message names both currencies: ${text}`);
  ok(text.includes('Great timing'), 'a strong currency is called good timing');
  const e = adult('fr', 50000);
  ctx.exchangeOnEmigrate(e, 'fr', 'de');
  ok(e.player.money === 50000, 'moving inside the eurozone changes nothing');
  // The real flow: savings in the new currency come along free, the rest pays the fee.
  const t = adult('uk', 200000);
  t.player.edu.current = null;
  ctx.fxState(t).GBP.str = 1; ctx.fxState(t).JPY.str = 1;
  t.player.fxSave = { JPY: 30000 };
  t.player.career = null;
  ctx.seedRng(5);
  let tries = 0;
  while (t.people[t.playerId].country !== 'jp' && tries++ < 40) { t.player.counters = {}; act(t, 'emigrate'); answer(t, 'jp'); t.pending = []; }
  ok(t.people[t.playerId].country === 'jp', 'the visa came through');
  ok(!t.player.fxSave.JPY, 'yen savings became cash in Japan');
  const visa = ctx.price(t, 3000);
  ok(t.player.money > 0 && t.player.money < 200000 + 30000, `cash after the move (${t.player.money}, visa ${visa})`);
}

/* 5. foreign savings --------------------------------------------------------- */
{
  const s = adult('us', 100000);
  act(s, 'fx_trade');
  answer(s, 'EUR');
  ok(s.pending[0] && s.pending[0].handler === 'fxDo', 'picking the euro offers buy and sell');
  answer(s, 'in:50000');
  ok(s.player.money === 50000 && s.player.fxSave.EUR === 49250, `buying costs 1.5% (${s.player.fxSave.EUR})`);
  ok(near(ctx.netWorth(s), 99250, 1), 'foreign savings count toward net worth');
  const fx = ctx.fxState(s);
  fx.EUR.prev = 1; fx.EUR.str = 1.1; fx.USD.prev = 1; fx.USD.str = 1;
  // One year of moves, applied the way fxTick does it.
  s.player.fxSave.EUR = Math.round(s.player.fxSave.EUR * (fx.EUR.str / fx.EUR.prev) / (fx.USD.str / fx.USD.prev));
  ok(near(s.player.fxSave.EUR, 54175, 1), `a 10% stronger euro is worth 10% more (${s.player.fxSave.EUR})`);
  ok(near(ctx.fxUnits(s, 'EUR', s.player.fxSave.EUR), 49250, 1), 'the number of euros you hold stays the same');
  act(s, 'fx_trade');
  answer(s, 'EUR');
  answer(s, 'out:' + s.player.fxSave.EUR);
  ok(!s.player.fxSave.EUR && near(s.player.money, 50000 + 54175 * 0.985, 2), `selling pays out less 1.5% (${s.player.money})`);
}

/* 6. trips abroad ---------------------------------------------------------- */
{
  const s = adult('za', 1e6);
  const V = g('VACATIONS'), safari = V.find((v) => v.id === 'safari'), camping = V.find((v) => v.id === 'camping');
  ctx.fxState(s).ZAR.str = 1;
  const even = ctx.vacationCost(s, safari);
  ctx.fxState(s).ZAR.str = 0.7;
  ok(ctx.vacationCost(s, safari) > even * 1.3, 'a weak rand makes a safari abroad pricier');
  ok(ctx.vacationCost(s, camping) === ctx.price(s, camping.cost), 'camping at home costs the same');
}

if (failures) { console.log(`\n❌ ${failures} currency check failures.`); process.exit(1); }
console.log(`Currency checks: pass (${Object.keys(CURRENCIES).length} currencies)`);
console.log('✅ Currency checks passed.');
