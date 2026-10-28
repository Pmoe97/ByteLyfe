/* =====================================================================
 * 37-market.js — the wider business world: named rival companies, the
 * stock market, and buying companies outright or merging them into yours.
 *
 * s.market = { year, ret, idx, ticked, seq, firms: { id: Firm } }
 *   One market per family line, so rivals outlive you. ret is this year's
 *   market return (also drives the index fund in financeTick), idx the index.
 * Firm = { id, name, ind, founded, rev, margin, rep, q, trend, val,
 *          ticker ('' while private), sh (shares), price, chg (last year's %),
 *          beta (how hard the market moves it), div (dividend yield) }
 * M(s).stocks = { firmId: { sh, cost } }   shares you hold and what you paid.
 * Rivals are priced with price(s, usd) like everything else. marketTick runs
 * from businessTick, before financeTick, every year of every life.
 * ===================================================================== */

const RIVALS_PER_IND = 3;
const SIZE_NAMES = ['a local business', 'a regional chain', 'an industry giant'];

// What one fully staffed location brings in: the yardstick for a rival's size.
function locRevenue(s, ind) { const I = INDUSTRIES[ind]; return price(s, I.unit) * I.perLoc * 0.8; }
function firmFair(f) { const I = INDUSTRIES[f.ind]; return Math.max(0, f.rev * I.mult * (0.6 + f.rep / 125) * clamp(1 + (f.trend || 0) * 1.5, 0.4, 3)); }
function firmWorth(f) { return f.ticker ? Math.round(f.price * f.sh) : f.val; }
function firmProfit(f) { return Math.round(f.rev * f.margin); }
function firms(s) { return Object.values(ensureMarket(s).firms); }
function firmById(s, id) { return (id && ensureMarket(s).firms[id]) || null; }
function industryRivals(s, ind) { return firms(s).filter((f) => f.ind === ind).sort((a, b) => b.rev - a.rev); }
function listedFirms(s) { return firms(s).filter((f) => f.ticker); }
function sharePrice(p) { return fmtPrice(p); }
function pctMove(x) { return (x >= 0 ? '▲' : '▼') + Math.abs(Math.round(x * 10) / 10) + '%'; }

/* ---- making the market ----------------------------------------------- */
function ensureMarket(s) {
  if (s.market && s.market.firms) {
    // Industries added after the market was made get their rivals now.
    const mk = s.market;
    if (!mk.inds || mk.inds < INDUSTRY_IDS.length) {
      for (const ind of INDUSTRY_IDS) if (!Object.values(mk.firms).some((f) => f.ind === ind)) for (let size = 0; size < RIVALS_PER_IND; size++) newFirm(s, mk, ind, size);
      mk.inds = INDUSTRY_IDS.length;
    }
    return mk;
  }
  const mk = (s.market = { year: 0, ret: 0.07, idx: 1000, ticked: 0, seq: 0, inds: INDUSTRY_IDS.length, firms: {} });
  for (const ind of INDUSTRY_IDS) for (let size = 0; size < RIVALS_PER_IND; size++) newFirm(s, mk, ind, size);
  return mk;
}
function takenNames(s, mk) { return new Set(Object.values(mk.firms).map((f) => f.name).concat(companies(s).map((c) => c.name))); }
function rivalName(s, mk, ind) {
  const I = INDUSTRIES[ind], taken = takenNames(s, mk);
  for (let i = 0; i < 25; i++) { const n = pick(I.names[0]) + ' ' + pick(I.names[1]); if (!taken.has(n)) return n; }
  return pick(I.names[0]) + ' ' + pick(I.names[1]) + ' ' + pick(['Group', 'Holdings', 'International', 'Brands']);
}
function uniqueTicker(s, mk, name) {
  const taken = new Set(Object.values(mk.firms).map((f) => f.ticker).concat(companies(s).map((c) => c.ticker)).filter(Boolean));
  let t = makeTicker(name);
  for (let i = 0; taken.has(t) && i < 40; i++) t = makeTicker(name).slice(0, 3) + 'ABCDEFGHJKLMNPRSTWXYZ'[randInt(0, 20)];
  return t;
}
// size 0 = a local outfit, 1 = a regional chain, 2 = an industry giant.
function newFirm(s, mk, ind, size) {
  const L = locRevenue(s, ind);
  const sz = (INDUSTRIES[ind].rivalSizes || [[1, 4], [8, 30], [60, 300]])[size];
  const rev = Math.round(L * randFloat(sz[0], sz[1]));
  const f = {
    id: 'f' + ++mk.seq, name: rivalName(s, mk, ind), ind, rev,
    founded: s.year - (size === 0 ? randInt(1, 10) : size === 1 ? randInt(5, 30) : randInt(20, 90)),
    margin: Math.round(clamp(gauss(0.08, 0.05), -0.08, 0.3) * 1000) / 1000,
    rep: Math.round(clamp100(gauss(45 + size * 8, 10))), q: Math.round(clamp100(gauss(45 + size * 6, 10))),
    trend: 0, val: 0, ticker: '', sh: 0, price: 0, chg: 0, beta: Math.round(randFloat(0.7, 1.4) * 100) / 100, div: 0,
  };
  f.val = Math.round(firmFair(f));
  mk.firms[f.id] = f;
  if (size === 2 || (size === 1 && chance(0.4))) listFirm(s, mk, f);
  return f;
}
function listFirm(s, mk, f) {
  f.ticker = uniqueTicker(s, mk, f.name);
  f.price = Math.round(randFloat(12, 240) * 100) / 100;
  f.sh = Math.max(1000, Math.round(f.val / f.price));
  f.price = Math.max(0.05, Math.round((f.val / f.sh) * 100) / 100);
  f.div = INDUSTRIES[f.ind].hype ? 0 : Math.round(randFloat(0.005, 0.04) * 1000) / 1000;
}

/* ---- the year on the market ------------------------------------------ */
// This year's market return, rolled once and shared by stocks and the index fund.
function marketYear(s) {
  const mk = ensureMarket(s);
  if (mk.year !== s.year) {
    let r = gauss(0.07, 0.13);
    const roll = rand();
    if (roll < 0.06) r = -randFloat(0.18, 0.4);
    else if (roll < 0.11) r = randFloat(0.22, 0.38);
    // Real years are real: the history table sets what the market did (and when it says nothing, no random crash or boom).
    const wm = worldMarket(s);
    mk.cause = null;
    if (wm) { r = wm.ret !== null ? wm.ret + gauss(0, 0.02) : gauss(0.08, 0.11); mk.cause = wm.ev ? wm.ev.name : null; }
    mk.year = s.year;
    mk.ret = Math.round(r * 1000) / 1000;
    mk.idx = Math.max(50, Math.round(mk.idx * (1 + mk.ret)));
  }
  return mk;
}
function marketReturn(s) { return marketYear(s).ret; }

function marketTick(s) {
  const mk = marketYear(s);
  if (mk.ticked === s.year) return;
  mk.ticked = s.year;
  const pct = Math.round(mk.ret * 100);
  if (A(s) >= 16 && (mk.ret <= -0.18 || mk.ret >= 0.22)) log(s, mk.ret < 0 ? `📉 The stock market crashed: down ${-pct}% this year${mk.cause ? `, during ${mk.cause}` : ''}.` : `📈 Stocks boomed: the market rose ${pct}% this year${mk.cause ? `, during ${mk.cause}` : ''}.`, mk.ret < 0 ? 'bad' : 'good');
  for (const f of Object.values(mk.firms)) firmYear(s, mk, f);
  // Dividends on what you hold.
  let div = 0;
  for (const id in holdings(s)) { const f = mk.firms[id]; if (f && f.div && f.margin > 0) div += holdings(s)[id].sh * f.price * f.div; }
  if (div >= 1) { M(s).bizIncome = M(s).bizIncome || []; M(s).bizIncome.push(['Stock dividends', Math.round(div)]); tally(s, 'dividendIncome', Math.round(div)); }
}

function firmYear(s, mk, f) {
  const I = INDUSTRIES[f.ind];
  const g = clamp(gauss(0.03 + (mk.ret - 0.07) * 0.6 + (f.rep - 50) / 500 + worldBiz(s, f.ind), (I.vol || 0.1) + 0.04), -0.5, 1); // worldBiz: a real boom or bust in the industry (88-world.js)
  f.rev = Math.max(1, Math.round(f.rev * (1 + g)));
  // Decades of compounding can't push a firm past three times the biggest rival size.
  const top = (INDUSTRIES[f.ind].rivalSizes || [[1, 4], [8, 30], [60, 300]])[2][1] * 3 * locRevenue(s, f.ind);
  if (f.rev > top) f.rev = Math.round(top * randFloat(0.9, 1));
  f.trend = Math.round((f.trend * 0.6 + clamp(g, -0.5, 1.5) * 0.4) * 1000) / 1000;
  f.margin = Math.round(clamp(f.margin + gauss(0, 0.02) + (g > 0 ? 0.003 : -0.005), -0.25, 0.4) * 1000) / 1000;
  f.rep = Math.round(clamp100(f.rep + (55 - f.rep) * 0.05 + gauss(0, 3)));
  f.q = Math.round(clamp100(f.q + (52 - f.q) * 0.05 + gauss(0, 3)));
  const fair = firmFair(f);
  if (f.ticker) {
    const before = f.price;
    // The market, the company's own growth, and a pull back toward what it's really worth.
    const r = f.beta * mk.ret + (g - 0.03) * 0.8 + 0.25 * Math.log(Math.max(1, fair) / Math.max(1, f.price * f.sh)) + gauss(0, 0.06 + (I.vol || 0.1) * 0.4);
    f.price = Math.max(0.05, Math.round(f.price * Math.exp(clamp(r, -2, 1.5)) * 100) / 100);
    f.val = Math.round(f.price * f.sh);
    f.chg = Math.round((f.price / before - 1) * 1000) / 10;
  } else {
    f.val = Math.round(fair);
    f.chg = 0;
  }
  const L = locRevenue(s, f.ind);
  if ((f.margin < -0.12 && chance(0.3)) || (f.rev < L * 0.5 && chance(0.25))) return firmBust(s, mk, f);
  if (!f.ticker && f.val >= price(s, 250e6) && chance(0.25)) {
    listFirm(s, mk, f);
    if (mineIn(s, f.ind)) log(s, `🔔 Your rival ${f.name} went public as ${f.ticker}.`);
  }
}
function mineIn(s, ind) { return companies(s).some((c) => !c.closed && c.ind === ind); }
// A firm leaves the market. Someone new opens up in its place.
function removeFirm(s, mk, f) {
  delete mk.firms[f.id];
  newFirm(s, mk, f.ind, chance(0.7) ? 0 : 1);
}
function firmBust(s, mk, f) {
  const h = holdings(s)[f.id];
  if (h) {
    delete holdings(s)[f.id];
    tally(s, 'stockBusts');
    log(s, `📉 ${f.name} went bankrupt. Your ${f.ticker} shares are worthless now.`, 'bad');
  } else if (mineIn(s, f.ind)) log(s, `🏚️ Your rival ${f.name} went out of business.`, 'good');
  removeFirm(s, mk, f);
}

/* ---- your portfolio ---------------------------------------------------- */
function holdings(s) { return M(s).stocks || (M(s).stocks = {}); }
function holdingValue(s, id) { const h = holdings(s)[id], f = s.market && s.market.firms[id]; return h && f ? Math.round(h.sh * f.price) : 0; }
function stocksValue(s) { if (!s.market || !M(s).stocks) return 0; let t = 0; for (const id in M(s).stocks) t += holdingValue(s, id); return t; }
function stocksCost(s) { return sum(Object.values(holdings(s)), (h) => h.cost); }
function fmtShares(n) { return n >= 100 ? Math.round(n).toLocaleString('en-US') : String(Math.round(n * 100) / 100); }
function buyStock(s, id, amt) {
  const f = firmById(s, id);
  amt = Math.round(amt);
  if (!f || !f.ticker || amt <= 0) return;
  if (!pay(s, amt)) return cantAfford(amt);
  const h = holdings(s)[id] || (holdings(s)[id] = { sh: 0, cost: 0 });
  const sh = amt / f.price;
  h.sh = Math.round((h.sh + sh) * 10000) / 10000;
  h.cost += amt;
  tally(s, 'stockBuys');
  return { text: `You bought ${fmtShares(sh)} shares of ${f.name} (${f.ticker}) at ${sharePrice(f.price)} each.`, emoji: '💹' };
}
// Gains are taxed at 15% when you sell, like the shares of your own companies.
function sellStock(s, id, frac) {
  const f = firmById(s, id), h = holdings(s)[id];
  if (!f || !h) return;
  const all = frac >= 1;
  const sh = all ? h.sh : h.sh * frac;
  const gross = Math.round(sh * f.price);
  const basis = Math.round(h.cost * (sh / h.sh));
  const gain = gross - basis;
  const tax = gain > 0 ? Math.round(gain * 0.15) : 0;
  add(s, { money: gross - tax });
  if (all) delete holdings(s)[id];
  else { h.sh = Math.round((h.sh - sh) * 10000) / 10000; h.cost -= basis; }
  if (gain > 0) tally(s, 'stockGains', gain);
  return {
    text: `You sold ${fmtShares(sh)} ${f.ticker} shares for ${fmtMoney(gross)}: a ${fmtMoney(Math.abs(gain))} ${gain >= 0 ? 'gain' : 'loss'}${tax ? ` (${fmtMoney(tax)} tax)` : ''}.`,
    tone: gain >= 0 ? 'good' : 'bad', emoji: gain >= 0 ? '📈' : '📉',
  };
}

/* ---- the stock market screens (popups) --------------------------------- */
defAction({
  id: 'stocks', cat: 'money', label: 'Stock market', emoji: '💹', desc: 'Buy shares in listed companies.',
  when: (s) => free(s) && A(s) >= 18,
  sub: (s) => { const v = stocksValue(s); return v ? 'Your stocks: ' + fmtMoney(v) : `Market ${pctMove(ensureMarket(s).ret * 100)} last year`; },
  run: (s) => stockMenu(s),
});
function stockMenu(s) {
  const mk = marketYear(s), mine = Object.keys(holdings(s)).filter((id) => mk.firms[id]);
  const value = stocksValue(s), gain = value - stocksCost(s);
  const choices = [];
  if (mine.length) choices.push({ label: '💼 Your portfolio', value: 'mine', sub: `${nOf(mine.length, 'stock')} · ${fmtMoney(value)} · ${gain >= 0 ? 'up' : 'down'} ${fmtMoney(Math.abs(gain))}` });
  choices.push({ label: '🔥 Biggest movers last year', value: 'movers' }, { label: '🏆 Biggest companies', value: 'big' }, { label: '🏭 Browse by industry', value: 'inds' }, { label: 'Done', value: null });
  popup(s, {
    emoji: '💹', title: 'Stock market', handler: 'stockMenu', choices,
    text: `The market index is at ${mk.idx.toLocaleString('en-US')} (${pctMove(mk.ret * 100)} last year). You have ${fmtMoney(Math.max(0, M(s).money))} in cash${value ? ` and ${fmtMoney(value)} in stocks` : ''}.`,
  });
}
onChoice('stockMenu', (s, ctx, v) => {
  if (!v) return;
  if (v === 'inds') {
    const inds = INDUSTRY_IDS.filter((ind) => listedFirms(s).some((f) => f.ind === ind));
    popup(s, {
      emoji: '🏭', title: 'Browse by industry', handler: 'stockMenu', text: 'Which industry?',
      choices: inds.map((ind) => ({ label: INDUSTRIES[ind].emoji + ' ' + INDUSTRIES[ind].name, value: 'ind:' + ind, sub: nOf(listedFirms(s).filter((f) => f.ind === ind).length, 'listed company', 'listed companies') })).concat([{ label: 'Back', value: 'back' }]),
    });
    return;
  }
  if (v === 'back') return stockMenu(s);
  let list, title;
  if (v === 'mine') { list = Object.keys(holdings(s)).map((id) => firmById(s, id)).filter(Boolean).sort((a, b) => holdingValue(s, b.id) - holdingValue(s, a.id)); title = 'Your portfolio'; }
  else if (v === 'movers') { list = listedFirms(s).sort((a, b) => Math.abs(b.chg) - Math.abs(a.chg)).slice(0, 10); title = 'Biggest movers'; }
  else if (v === 'big') { list = listedFirms(s).sort((a, b) => firmWorth(b) - firmWorth(a)).slice(0, 10); title = 'Biggest companies'; }
  else { const ind = v.slice(4); list = listedFirms(s).filter((f) => f.ind === ind).sort((a, b) => firmWorth(b) - firmWorth(a)); title = INDUSTRIES[ind] ? INDUSTRIES[ind].name : 'Stocks'; }
  popup(s, {
    emoji: '💹', title, handler: 'stockList', text: list.length ? 'Pick a stock.' : 'Nothing here right now.',
    choices: list.map((f) => ({ label: `${f.ticker} · ${f.name}`, value: f.id, sub: `${sharePrice(f.price)} · ${pctMove(f.chg)} last year${holdings(s)[f.id] ? ' · you own ' + fmtMoney(holdingValue(s, f.id)) : ''}` })).concat([{ label: 'Back', value: 'back' }]),
  });
});
onChoice('stockList', (s, ctx, v) => {
  if (!v) return;
  if (v === 'back') return stockMenu(s);
  stockTicket(s, v);
});
function stockTicket(s, id) {
  const f = firmById(s, id);
  if (!f || !f.ticker) return;
  const I = INDUSTRIES[f.ind], h = holdings(s)[id], cash = Math.max(0, M(s).money);
  const buys = [1000, 10000, 100000, 1000000, 10000000].map((v) => price(s, v)).filter((v) => v <= cash);
  if (cash >= 1 && !buys.includes(Math.floor(cash))) buys.push(Math.floor(cash));
  const choices = buys.map((v, i) => ({ label: i === buys.length - 1 && v === Math.floor(cash) ? `Invest all my cash (${fmtMoney(v)})` : `Buy ${fmtMoney(v)}`, value: 'buy:' + v }));
  if (h) choices.push({ label: 'Sell half my shares', value: 'sell:0.5', sub: fmtMoney(holdingValue(s, id) / 2) }, { label: 'Sell all my shares', value: 'sell:1', sub: fmtMoney(holdingValue(s, id)) });
  choices.push({ label: 'Back', value: 'back' });
  const profit = firmProfit(f);
  popup(s, {
    emoji: I.emoji, title: `${f.ticker} · ${f.name}`, handler: 'stockTrade', ctx: { id }, choices,
    text: `${cap(SIZE_NAMES[f.rev >= locRevenue(s, f.ind) * 40 ? 2 : 1])} among ${pluralize(I.name.toLowerCase())}. Revenue ${fmtMoneyShort(f.rev)}, ${profit >= 0 ? 'profit' : 'loss'} ${fmtMoneyShort(Math.abs(profit))}, worth ${fmtMoneyShort(firmWorth(f))}. ${f.div ? `Pays a ${Math.round(f.div * 1000) / 10}% dividend.` : 'No dividend.'} Shares are ${sharePrice(f.price)} (${pctMove(f.chg)} last year).${h ? ` You own ${fmtShares(h.sh)} shares worth ${fmtMoney(holdingValue(s, id))}; you paid ${fmtMoney(h.cost)}.` : ''}`,
  });
}
onChoice('stockTrade', (s, ctx, v) => {
  if (!v) return;
  if (v === 'back') return stockMenu(s);
  const [dir, n] = v.split(':');
  return dir === 'buy' ? buyStock(s, ctx.id, Number(n)) : sellStock(s, ctx.id, Number(n));
});

/* ---- buying companies ---------------------------------------------------
 * Buy a rival outright (it becomes one of your companies), or merge one into
 * your company in the same industry. Public companies cost a 30% premium over
 * their market value, private ones 25% over their valuation. */
function takeoverPrice(s, f) { return nicePrice((f.ticker ? f.price * f.sh * 1.3 : f.val * 1.25)); }
function firmLocations(s, f) { return clamp(Math.round(f.rev / locRevenue(s, f.ind)), 1, 5000); }
// Staff the floor of `locs` locations the way a going concern would be.
function staffLocations(s, co, locs) {
  const I = indOf(co), cap = locs * I.perLoc;
  const sales = Math.round(cap * (I.salesShare || 0.25) * 0.9), ops = Math.round(cap * 0.9) - sales;
  const add = { ops, sales, manager: Math.ceil((ops + sales) / 12), rnd: Math.floor((ops + sales) / 15), marketing: Math.floor((ops + sales) / 20) };
  for (const r of BIZ_ROLE_IDS) if (add[r] > 0) hireStaff(s, co, r, add[r], 'market', true);
}
// If you held shares in a company being bought, you're paid the takeover price for them.
function cashOutHolding(s, f, pricePaid) {
  const h = holdings(s)[f.id];
  if (!h || !f.ticker) return '';
  const payout = Math.round(h.sh * (pricePaid / f.sh));
  delete holdings(s)[f.id];
  add(s, { money: payout });
  return ` Your own ${f.ticker} shares were bought out for ${fmtMoney(payout)}.`;
}
function firmToCompany(s, f, runIt) {
  const co = {
    id: uid(s, 'co'), name: f.name, ind: f.ind, founded: f.founded, years: Math.max(1, s.year - f.founded),
    cash: Math.round(f.rev * 0.08), debt: 0, guaranteed: 0, equity: 1, investors: [], float: 0,
    public: false, shares: 0, price: 0, sent: 1, ticker: '',
    ceo: runIt ? 'you' : 'hired', ceoName: runIt ? '' : randomFirst(P(s).country, chance(0.5) ? 'm' : 'f') + ' ' + randomLast(P(s).country),
    auto: true, locations: firmLocations(s, f), team: emptyTeam(), products: [],
    tier: 'standard', mkt: 0, rnd: 0, draw: 0, rep: f.rep, val: f.val, last: null, hist: [], lossYears: 0, lastRev: f.rev, growth: 0, trend: 0, closed: false, bought: s.year,
  };
  staffLocations(s, co, co.locations);
  co.products.push({ id: uid(s, 'pr'), name: productName(co), q: f.q, year: s.year - 1 });
  for (let i = 1; i < MKT_SPEND.length; i++) if (bizCost(s, co, MKT_SPEND[i]) <= f.rev * 0.06) co.mkt = i;
  for (let i = 1; i < RND_SPEND.length; i++) if (bizCost(s, co, RND_SPEND[i]) <= f.rev * 0.04) co.rnd = i;
  return co;
}
function mergeFirm(s, co, f) {
  const locs = firmLocations(s, f), myRev = co.last ? co.last.revenue : 0;
  co.locations += locs;
  staffLocations(s, co, locs);
  co.rep = clamp100((co.rep * myRev + f.rep * f.rev) / Math.max(1, myRev + f.rev));
  co.products.push({ id: uid(s, 'pr'), name: productName(co), q: f.q, year: s.year - 1 });
  while (co.products.length > 6) co.products.shift();
  // Merger jitters.
  for (const r of BIZ_ROLE_IDS) if (co.team[r].n) co.team[r].morale = clamp(co.team[r].morale - 5, 0, 100);
  return locs;
}

defAction({
  id: 'biz_buy', cat: 'business', label: 'Buy a company', emoji: '🦈', desc: 'Take over an existing business.',
  when: (s) => free(s) && A(s) >= 18 && companies(s).length < MAX_COMPANIES,
  run: (s) => {
    const all = firms(s).map((f) => ({ f, cost: takeoverPrice(s, f) })).sort((a, b) => a.cost - b.cost);
    const can = all.filter((x) => x.cost <= M(s).money).slice(-8).reverse();
    if (!can.length) return { text: `You can't afford any company yet. The cheapest one for sale, ${all[0].f.name}, costs ${fmtMoney(all[0].cost)}.`, nolog: true, emoji: '🦈' };
    popup(s, {
      emoji: '🦈', title: 'Buy a company', text: `You have ${fmtMoney(M(s).money)}. These are the biggest companies you can afford.`, handler: 'bizBuyPick',
      choices: can.map(({ f, cost }) => ({ label: `${INDUSTRIES[f.ind].emoji} ${f.name}`, value: f.id, sub: `${fmtMoney(cost)} · revenue ${fmtMoneyShort(f.rev)} · ${firmProfit(f) >= 0 ? 'profit' : 'loss'} ${fmtMoneyShort(Math.abs(firmProfit(f)))}` })).concat([{ label: 'Never mind', value: null }]),
    });
  },
});
onChoice('bizBuyPick', (s, ctx, id) => {
  const f = firmById(s, id);
  if (!f) return;
  const I = INDUSTRIES[f.ind], cost = takeoverPrice(s, f), locs = firmLocations(s, f);
  popup(s, {
    emoji: I.emoji, title: f.name, handler: 'bizBuy', ctx: { id },
    text: `It has ${nOf(locs, I.place)}, about ${nOf(Math.round(locs * I.perLoc * 0.9 * 1.15), 'employee')}, revenue ${fmtMoneyShort(f.rev)} and reputation ${f.rep}. ${f.ticker ? `It's listed as ${f.ticker}; buying it takes it private.` : 'It is privately owned.'} The owners want ${fmtMoney(cost)}.`,
    choices: [
      { label: 'Buy it and run it yourself', value: 'you', sub: fmtMoney(cost), disabled: M(s).money < cost },
      { label: 'Buy it and keep its CEO', value: 'hired', sub: 'Hands-off. You can take over later.', disabled: M(s).money < cost },
      { label: 'Never mind', value: null },
    ],
  });
});
onChoice('bizBuy', (s, ctx, how) => {
  const f = firmById(s, ctx.id);
  if (!how || !f) return;
  if (companies(s).length >= MAX_COMPANIES) return { text: `You can own at most ${MAX_COMPANIES} businesses at once.`, nolog: true };
  const cost = takeoverPrice(s, f);
  if (!pay(s, cost)) return cantAfford(cost);
  const extra = cashOutHolding(s, f, cost);
  const co = firmToCompany(s, f, how === 'you');
  companies(s).push(co);
  removeFirm(s, ensureMarket(s), f);
  tally(s, 'acquisitions');
  add(s, { happy: 8 });
  return { text: `You bought ${co.name} for ${fmtMoney(cost)}. ${how === 'you' ? "You're the CEO now." : `${co.ceoName} will keep running it.`}${extra}`, tone: 'good', emoji: '🦈', title: 'Deal done' };
});
defAction({
  id: 'biz_acquire', cat: 'company', target: 'company', label: 'Acquire a rival', emoji: '🦈',
  sub: cosub((s, co) => { const r = industryRivals(s, co.ind); return r.length ? `${nOf(r.length, 'rival')} · cheapest ${fmtMoneyShort(Math.min(...r.map((f) => takeoverPrice(s, f))))}` : 'No rivals left'; }),
  when: (s, id) => manageable(s, id) && industryRivals(s, company(s, id).ind).length > 0,
  run: (s, id) => {
    const co = company(s, id);
    if (bump(s, 'acquire_' + id) > 1) return { text: 'Your lawyers are still digesting the last deal.', nolog: true };
    const list = industryRivals(s, co.ind);
    popup(s, {
      emoji: '🦈', title: 'Acquire a rival', text: `Buying a rival adds its ${pluralize(indOf(co).place)}, staff and customers to ${co.name}.`, handler: 'bizAcquirePick', ctx: { co: id },
      choices: list.map((f) => ({ label: f.name + (f.ticker ? ` (${f.ticker})` : ''), value: f.id, sub: `${fmtMoney(takeoverPrice(s, f))} · ${nOf(firmLocations(s, f), indOf(co).place)} · revenue ${fmtMoneyShort(f.rev)}` })).concat([{ label: 'Never mind', value: null }]),
    });
  },
});
onChoice('bizAcquirePick', (s, ctx, id) => {
  const co = company(s, ctx.co), f = firmById(s, id);
  if (!co || !f) return;
  const cost = takeoverPrice(s, f);
  popup(s, {
    emoji: '🦈', title: 'Acquire ' + f.name, text: `${f.name} costs ${fmtMoney(cost)}. How will you pay?`, handler: 'bizAcquire', ctx: { co: co.id, id },
    choices: [
      { label: 'From company cash', value: 'co', sub: `${co.name} has ${fmtMoney(co.cash)}`, disabled: co.cash < cost },
      { label: 'With my own money', value: 'me', sub: `You have ${fmtMoney(M(s).money)}`, disabled: M(s).money < cost },
      { label: 'Borrow it', value: 'loan', sub: '9% company debt, if the bank agrees' },
      { label: 'Never mind', value: null },
    ],
  });
});
onChoice('bizAcquire', (s, ctx, how) => {
  const co = company(s, ctx.co), f = firmById(s, ctx.id);
  if (!how || !co || !f) return;
  const cost = takeoverPrice(s, f);
  if (how === 'co') { if (co.cash < cost) return { text: `${co.name} can't afford it.`, nolog: true }; co.cash -= cost; }
  else if (how === 'me') { if (!pay(s, cost)) return cantAfford(cost); }
  else {
    const rev = co.last ? co.last.revenue : 0;
    if (!chance(clamp(0.15 + (rev + f.rev + co.val * 0.3) / (cost * 2.5) - co.debt / (cost * 4), 0.03, 0.85))) return { text: `The bank wouldn't lend ${co.name} ${fmtMoney(cost)} for the deal.`, tone: 'bad', emoji: '🏦' };
    co.debt += cost;
    if (co.val < price(s, 2000000)) co.guaranteed = (co.guaranteed || 0) + cost;
  }
  const extra = cashOutHolding(s, f, cost);
  const locs = mergeFirm(s, co, f);
  removeFirm(s, ensureMarket(s), f);
  tally(s, 'acquisitions');
  return { text: `${co.name} acquired ${f.name} for ${fmtMoney(cost)}, adding ${nOf(locs, indOf(co).place)} and their staff.${extra}`, tone: 'good', emoji: '🦈', title: 'Merger complete' };
});
