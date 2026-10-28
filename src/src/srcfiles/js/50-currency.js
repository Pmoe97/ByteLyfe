/* =====================================================================
 * 50-currency.js — real currencies. Money is stored in US dollars
 * everywhere; each country shows it in its own currency at a fixed rate
 * (useCurrency sets MONEY_FMT in 00-util.js), so local prices never jitter.
 *
 * What moves is each currency's strength: s.fx[code] = { str, prev }, around
 * 1, shared by the family line. Strength matters when money crosses a border:
 *   - emigrating converts your cash at strength(old) / strength(new), less 2%
 *   - trips abroad cost more when your currency is weak (vacationCost)
 *   - foreign savings, M(s).fxSave[code] = their value in your money, ride
 *     their currency against yours each year (fxTick) and cost 1.5% to buy
 *     or sell. Savings in the new country's currency become cash, free, when
 *     you move there.
 * Settings → "Money shown in" can switch everything back to US dollars.
 * fxTick runs first in the year, so the year's log uses the new strengths.
 * ===================================================================== */

const CURRENCIES = {
  USD: { name: 'US dollar', plural: 'US dollars', sym: '$', rate: 1, vol: 0.03 },
  CAD: { name: 'Canadian dollar', plural: 'Canadian dollars', sym: 'C$', rate: 1.37, vol: 0.04 },
  GBP: { name: 'British pound', plural: 'pounds', sym: '£', rate: 0.78, vol: 0.05 },
  EUR: { name: 'euro', plural: 'euros', sym: '€', rate: 0.92, vol: 0.04 },
  AUD: { name: 'Australian dollar', plural: 'Australian dollars', sym: 'A$', rate: 1.52, vol: 0.06 },
  MXN: { name: 'Mexican peso', plural: 'pesos', sym: 'MX$', rate: 18, vol: 0.08 },
  BRL: { name: 'Brazilian real', plural: 'reais', sym: 'R$', rate: 5.4, vol: 0.1 },
  SEK: { name: 'Swedish krona', plural: 'kronor', sym: 'kr', rate: 10.6, vol: 0.06, post: true },
  JPY: { name: 'Japanese yen', plural: 'yen', sym: '¥', rate: 150, vol: 0.06 },
  KRW: { name: 'South Korean won', plural: 'won', sym: '₩', rate: 1380, vol: 0.06 },
  INR: { name: 'Indian rupee', plural: 'rupees', sym: '₹', rate: 85, vol: 0.05, indian: true },
  NGN: { name: 'Nigerian naira', plural: 'naira', sym: '₦', rate: 1550, vol: 0.14 },
  PHP: { name: 'Philippine peso', plural: 'pesos', sym: '₱', rate: 57, vol: 0.05 },
  ZAR: { name: 'South African rand', plural: 'rand', sym: 'R', rate: 18.2, vol: 0.1 },
};
const COUNTRY_CURRENCY = { us: 'USD', ca: 'CAD', uk: 'GBP', ie: 'EUR', fr: 'EUR', de: 'EUR', it: 'EUR', es: 'EUR', au: 'AUD', mx: 'MXN', br: 'BRL', se: 'SEK', jp: 'JPY', kr: 'KRW', in: 'INR', ng: 'NGN', ph: 'PHP', za: 'ZAR' };
const FX_FEE = 0.015; // buying or selling foreign savings
const MOVE_FEE = 0.02; // the bank's cut when you emigrate with your cash

function curOf(cc) { return COUNTRY_CURRENCY[cc] || 'USD'; }
function homeCur(s) { return curOf(P(s).country); }
function curFmt(code) { const C = CURRENCIES[code] || CURRENCIES.USD; return { sym: C.sym, rate: C.rate, post: !!C.post, indian: !!C.indian }; }
// Show this life's money in its country's currency (or dollars, if the player prefers).
function useCurrency(s) {
  MONEY_FMT = s && s.player && s.people && s.people[s.playerId] && META.settings.currency !== 'usd' ? curFmt(homeCur(s)) : null;
}
// A sum in a particular currency, whatever the player's own is (exchange messages).
// The dollar reads "US$" when it's foreign to you.
function foreignFmt(code) { const c = curFmt(code); if (code === 'USD' && MONEY_FMT && MONEY_FMT.sym !== '$') c.sym = 'US$'; return c; }
function fmtIn(code, n) { return fmtMoney(n, foreignFmt(code)); }
function fmtInShort(code, n) { return fmtMoneyShort(n, foreignFmt(code)); }
// What one of theirs is worth in yours today: "€1 = ¥163", "¥1,000 = $6.67".
function pairText(s, code, home) {
  const a = CURRENCIES[code], b = CURRENCIES[home], mkt = (b.rate / a.rate) * (strength(s, code) / strength(s, home));
  let unit = 1;
  while (unit * mkt < 1) unit *= 10;
  const v = unit * mkt;
  return `${moneyText(foreignFmt(code), groupDigits(unit), false)} = ${moneyText(curFmt(home), v >= 100 ? groupDigits(v) : v.toFixed(2), false)}`;
}
// Today's market rate, "US$1 = ₹105": the fixed rate, moved by both currencies' strength.
function rateText(s, code) {
  const C = CURRENCIES[code], v = C.rate * strength(s, 'USD') / strength(s, code), n = v >= 100 ? groupDigits(v) : v.toFixed(2);
  return `US$1 = ${C.post ? n + ' ' + C.sym : C.sym + n}`;
}

function fxState(s) {
  const fx = s.fx || (s.fx = {});
  for (const k in CURRENCIES) if (!fx[k]) fx[k] = { str: 1, prev: 1 };
  return fx;
}
function strength(s, code) { return fxState(s)[code].str; }
function strengthPct(s, code) { return Math.round((strength(s, code) - 1) * 100); }
function strengthWord(s, code) { const p = strengthPct(s, code); return Math.abs(p) < 3 ? 'About its usual value' : `${Math.abs(p)}% ${p > 0 ? 'stronger' : 'weaker'} than usual`; }
function yearMove(s, code) { const f = fxState(s)[code]; return f.str / f.prev - 1; }

// The year's currency moves: a pull back toward normal, noise, and the odd crisis.
function fxTick(s) {
  const fx = fxState(s), home = homeCur(s), m = M(s);
  for (const k in CURRENCIES) {
    const f = fx[k], C = CURRENCIES[k];
    f.prev = f.str;
    let g = 0.25 * (1 - f.str) + gauss(0, C.vol);
    if (C.vol >= 0.08 && chance(0.03)) g -= randFloat(0.15, 0.3);
    g += worldFxShock(s, k); // a real crisis (88-world.js)
    f.str = clamp(Math.round(f.str * (1 + g) * 1000) / 1000, 0.5, 1.6);
  }
  // Foreign savings ride their currency against yours.
  for (const k in m.fxSave || {}) m.fxSave[k] = Math.round(m.fxSave[k] * (fx[k].str / fx[k].prev) / (fx[home].str / fx[home].prev));
  useCurrency(s);
}

/* ---- crossing borders ------------------------------------------------------ */
// Emigrating: cash changes into the new currency at today's rate, less the bank's 2%.
// Foreign savings are re-valued in the new money, and those in the new currency become cash.
function exchangeOnEmigrate(s, fromCC, toCC) {
  const a = curOf(fromCC), b = curOf(toCC), m = M(s);
  if (a === b) return `No exchange needed: it's ${CURRENCIES[a].plural} there too.`;
  const k = strength(s, a) / strength(s, b), before = m.money;
  for (const c in m.fxSave || {}) m.fxSave[c] = Math.round(m.fxSave[c] * k);
  const held = (m.fxSave || {})[b] || 0;
  if (m.fxSave) delete m.fxSave[b];
  m.money = Math.round(m.money * k * (m.money > 0 ? 1 - MOVE_FEE : 1)) + held;
  if (k >= 1.15) tally(s, 'fxTiming');
  const timing = k >= 1.1 ? ' Great timing: your money was strong.' : k <= 0.9 ? ' Bad timing: your money was weak.' : '';
  const saved = held ? ` Your ${CURRENCIES[b].plural} in savings came with you: ${fmtIn(b, held)}.` : '';
  return before > 0 ? `You changed ${fmtIn(a, before)} into ${fmtIn(b, Math.round(before * k * (1 - MOVE_FEE)))}.${timing}${saved}` : saved.trim();
}
// What your cash would become in another country right now.
function cashAbroad(s, toCC) {
  const a = homeCur(s), b = curOf(toCC), cash = M(s).money;
  if (a === b) return cash;
  return Math.round(cash * strength(s, a) / strength(s, b) * (cash > 0 ? 1 - MOVE_FEE : 1));
}
// Trips abroad cost more when your money is weak.
function vacationCost(s, v) {
  const base = price(s, v.cost);
  return v.abroad ? nicePrice(base * clamp(1 / strength(s, homeCur(s)), 0.7, 1.5)) : base;
}

/* ---- foreign savings ---------------------------------------------------------- */
function fxSaved(s) { return sum(Object.values(M(s).fxSave || {})); }
// Savings are kept as their value in your money; this is how much foreign cash that is
// today (in the same dollar units fmtIn shows), which stays put while the value moves.
function fxUnits(s, code, value) { return value * strength(s, homeCur(s)) / strength(s, code); }
function fxHeld(s) { return Object.keys(M(s).fxSave || {}).filter((k) => M(s).fxSave[k] > 0); }
// One row per currency other than yours (the euro once, for five countries).
function foreignCurrencies(s) { return Object.keys(CURRENCIES).filter((k) => k !== homeCur(s)); }
defAction({
  id: 'fx_trade', cat: 'money', label: 'Foreign currency', emoji: '💱',
  desc: 'Save in another currency.',
  when: (s) => free(s) && A(s) >= 18,
  sub: (s) => (fxSaved(s) ? `Holding ${fmtMoney(fxSaved(s))} in ${nOf(fxHeld(s).length, 'currency', 'currencies')}` : 'Bet on another currency, or save for a move abroad'),
  run: (s) => {
    const home = homeCur(s), m = M(s);
    popup(s, {
      emoji: '💱', title: 'Foreign currency', handler: 'fxPick',
      text: `Your money is the ${CURRENCIES[home].name}: ${strengthWord(s, home).toLowerCase()}. Savings in another currency gain when it strengthens against yours, and lose when it weakens. Buying or selling costs ${FX_FEE * 100}%.`,
      choices: foreignCurrencies(s).map((k) => ({ label: `${CURRENCIES[k].sym} ${cap(CURRENCIES[k].name)}`, value: k, sub: `${strengthWord(s, k)}${(m.fxSave || {})[k] ? ' · you hold ' + fmtMoney(m.fxSave[k]) : ''}` })).concat([{ label: 'Done', value: null }]),
    });
  },
});
onChoice('fxPick', (s, ctx, k) => {
  if (!k || !CURRENCIES[k]) return;
  const cash = Math.max(0, M(s).money), bal = (M(s).fxSave || {})[k] || 0, C = CURRENCIES[k];
  const choices = [0.1, 0.25, 0.5].map((f) => ({ label: `Buy ${C.plural} with ${Math.round(f * 100)}% of my cash`, value: 'in:' + Math.floor(cash * f), sub: fmtMoney(Math.floor(cash * f)), disabled: cash * f < 1 }))
    .concat([0.5, 1].map((f) => ({ label: `Sell ${f === 1 ? 'them all' : 'half'}`, value: 'out:' + Math.floor(bal * f), sub: fmtMoney(Math.floor(bal * f)), disabled: bal * f < 1 })))
    .concat([{ label: 'Back', value: null }]);
  popup(s, { emoji: '💱', title: cap(C.plural), text: `${pairText(s, k, homeCur(s))}. ${strengthWord(s, k)}${bal ? `. You hold ${fmtIn(k, fxUnits(s, k, bal))}, worth ${fmtMoney(bal)}` : ''}.`, handler: 'fxDo', ctx: { k }, choices });
});
onChoice('fxDo', (s, ctx, v) => {
  if (!v) return;
  const [dir, n] = v.split(':'), amt = Math.floor(Number(n)), m = M(s), C = CURRENCIES[ctx.k];
  if (!C || !(amt > 0)) return;
  m.fxSave = m.fxSave || {};
  if (dir === 'in') {
    if (!pay(s, amt)) return cantAfford(amt);
    const got = Math.round(amt * (1 - FX_FEE));
    m.fxSave[ctx.k] = (m.fxSave[ctx.k] || 0) + got;
    tally(s, 'fxTrades');
    return { text: `You bought ${fmtIn(ctx.k, fxUnits(s, ctx.k, got))} for ${fmtMoney(amt)}.`, emoji: '💱' };
  }
  const have = m.fxSave[ctx.k] || 0, sell = Math.min(amt, have);
  if (sell <= 0) return;
  m.fxSave[ctx.k] = have - sell;
  if (m.fxSave[ctx.k] <= 0) delete m.fxSave[ctx.k];
  const back = Math.round(sell * (1 - FX_FEE));
  add(s, { money: back });
  tally(s, 'fxTrades');
  return { text: `You sold ${fmtIn(ctx.k, fxUnits(s, ctx.k, sell))} for ${fmtMoney(back)}.`, emoji: '💱' };
});

/* ---- events ----------------------------------------------------------------------- */
const myCurName = (s) => CURRENCIES[homeCur(s)].name;
EV('fx_slide', {
  ages: [16, 100], emoji: '📉', when: (s) => yearMove(s, homeCur(s)) <= -0.1, text: (s) => `The ${myCurName(s)} fell ${Math.round(-yearMove(s, homeCur(s)) * 100)}% against other currencies this year.`,
  auto: (s) => (fxSaved(s) ? 'Your foreign savings jumped in value. Trips abroad just got expensive.' : `Imported ${pick(['coffee', 'phones', 'cars', 'sneakers'])} cost more, and trips abroad just got expensive.`),
});
EV('fx_surge', {
  ages: [16, 100], emoji: '📈', when: (s) => yearMove(s, homeCur(s)) >= 0.1, text: (s) => `The ${myCurName(s)} had its best year in a decade, up ${Math.round(yearMove(s, homeCur(s)) * 100)}%.`,
  auto: () => 'Holidays abroad are a bargain right now, and so is moving overseas.',
});
EV('fx_jar', {
  ages: [8, 90], emoji: '💰', w: 0.5, once: true, text: 'You found a jar of old foreign coins and bills at the back of a drawer.',
  choices: [
    ['Change them at the bank', (s) => { const amt = price(s, randInt(20, 300)); add(s, { money: amt }); return `The teller sighed, counted everything twice, and handed you ${fmtMoney(amt)}.`; }],
    ['Keep them as souvenirs', (s) => { add(s, { happy: 2 }); return pick(['They remind you of a trip you barely remember.', 'You arranged them by color. It looks great.', 'One coin has a hole in the middle. You love it.']); }],
  ],
});
EV('fx_booth', {
  ages: [18, 90], emoji: '💱', when: (s) => free(s) && lifeCount(s, 'vacations') >= 1, text: 'The airport currency booth offered you a truly terrible exchange rate.',
  choices: [
    ['Change your money there anyway', (s) => { const c = price(s, randInt(40, 150)); M(s).money -= c; return `Convenience cost you ${fmtMoney(c)}. The booth worker did not make eye contact.`; }],
    ['Find an ATM when you land', (s) => (chance(0.8) ? 'The ATM gave you a fair rate and a tiny fee. Smart traveler.' : 'The ATM ate your card. You spent the first day of your trip at a bank.')],
  ],
});

/* ---- achievements --------------------------------------------------------------- */
ACHIEVEMENTS.push(
  { id: 'citizen_world', name: 'Citizen of the World', emoji: '🌍', desc: 'Live in four countries in one life.', check: (s) => LC(s, 'countries') >= 3 },
  { id: 'perfect_timing', name: 'Perfect Timing', emoji: '⏱️', desc: 'Emigrate while your money is at least 15% stronger than the new country’s.', check: (s) => LC(s, 'fxTiming') >= 1 },
  { id: 'forex_fan', name: 'Forex Fanatic', emoji: '💱', desc: 'Hold savings in five foreign currencies at once.', check: (s) => fxHeld(s).length >= 5 },
);
