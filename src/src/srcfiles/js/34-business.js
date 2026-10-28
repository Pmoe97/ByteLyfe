/* =====================================================================
 * 34-business.js — owning companies: founding, the yearly P&L, staff,
 * products, pricing, budgets, locations, investors, loans, dividends,
 * going public, selling, shutting down, bankruptcy and boardroom coups.
 *
 * M(s).companies = [ Company ]   (up to 3 at a time)
 * Company = {
 *   id, name, ind, founded, years, cash, debt, guaranteed,
 *   equity (your share 0..1), investors [{ name, stake }], float (public share),
 *   public, shares, price, sent (market mood), ticker,
 *   ceo: 'you' | 'hired' | 'trustee', ceoName, auto (autopilot hiring),
 *   locations, team { ops|sales|marketing|rnd|manager: { n, skill, pay, morale } },
 *   products [{ id, name, q, year }], tier, mkt, rnd, draw,
 *   rep, val, last (last year's P&L), hist [{ y, r, p, v }], lossYears, lastRev, growth, closed,
 *   franchise: { outlets, fee, since } once you franchise (FRANCHISE_FEES), bought: year (37-market.js),
 *   casino: the house edge, high-limit room, surveillance and skim of a casino (54-house.js)
 * }
 * Staff are pools per role (headcount + average skill/pay/morale), so a
 * company can grow from one food truck to an airline without bloating saves.
 * ===================================================================== */

const MAX_COMPANIES = 3;
function companies(s) { return M(s).companies || (M(s).companies = []); }
function company(s, id) { return companies(s).find((c) => c.id === id) || null; }
function indOf(co) { return INDUSTRIES[co.ind]; }
function runsCompany(s) { return companies(s).some((c) => c.ceo === 'you'); }
function headcount(co) { return sum(BIZ_ROLE_IDS, (r) => co.team[r].n); }
function capacity(co) { return co.locations * indOf(co).perLoc; }
function pluralize(w) {
  if (/(Staff|Crew)$/.test(w)) return w;
  if (/[^aeiou]y$/i.test(w)) return w.slice(0, -1) + 'ies';
  if (/(s|sh|ch|x)$/i.test(w)) return w + 'es';
  return w + 's';
}
function roleTitle(co, role, n) { const t = indOf(co).roles[role]; return n === 1 ? t : pluralize(t); }
function rolePay(s, co, role, level) { return nicePrice(BIZ_ROLES[role].pay * indOf(co).wage * econ(s) * PAY_LEVELS[level || 'market'].mult); }
function bizCost(s, co, usd) { return nicePrice(usd * indOf(co).scale * econ(s)); }
function marketCap(co) { return Math.round(co.price * co.shares); }
function coWorth(co) { return co.public ? marketCap(co) : co.val; }
function coStakeValue(s, co) { return Math.max(0, Math.round(coWorth(co) * co.equity)); }
function companiesValue(s) { return sum(companies(s), (c) => coStakeValue(s, c)); }
function canManage(s, co) { return !!co && !co.closed && co.ceo === 'you' && free(s) && A(s) >= 18; }
function avgMorale(co) {
  const n = headcount(co);
  return n ? sum(BIZ_ROLE_IDS, (r) => co.team[r].n * co.team[r].morale) / n : 70;
}
function emptyTeam() {
  const t = {};
  for (const r of BIZ_ROLE_IDS) t[r] = { n: 0, skill: 0, pay: 0, morale: 65 };
  return t;
}
function dilute(co, frac) {
  co.equity *= 1 - frac;
  for (const inv of co.investors) inv.stake *= 1 - frac;
  co.float = (co.float || 0) * (1 - frac);
}
function industryMissing(s, id) {
  const r = INDUSTRIES[id].req;
  const out = [];
  if (r && r.degree && !hasDegree(s, r.degree)) out.push(DEGREE_NAMES[r.degree]);
  if (r && r.anyDegree && !r.anyDegree.some((d) => hasDegree(s, d))) out.push(r.anyDegree.map((d) => DEGREE_NAMES[d]).join(' or '));
  if (r && r.clean && hasFelony(s)) out.push('a clean record');
  return out;
}
function cleanCompanyName(v) { return String(v || '').replace(/[<>{}\[\]]/g, '').trim().slice(0, 32); }
function bizNameFor(s, id) {
  const I = INDUSTRIES[id];
  if (chance(0.25)) return P(s).last + "'s " + pick(I.names[1]).replace(/^& /, '');
  return pick(I.names[0]) + ' ' + pick(I.names[1]);
}
function productName(co) {
  const I = indOf(co);
  return co.ind === 'pharma' ? pick(I.prodA) + pick(I.prodB) : pick(I.prodA) + ' ' + pick(I.prodB);
}
function freshness(s, co, p) { return clamp(1 - (s.year - p.year) / (indOf(co).life * 2), 0.25, 1); }
function effQuality(s, co) {
  let wq = 0, wf = 0;
  for (const p of co.products) { const f = freshness(s, co, p); wq += p.q * f; wf += f; }
  if (!wf) return 20;
  return (wq / wf) * (0.6 + 0.4 * Math.min(1, wf));
}
function makeProduct(s, co, budgetIdx, name) {
  const I = indOf(co), rnd = co.team.rnd;
  const rndPower = rnd.n ? rnd.skill * 0.35 * Math.min(1, rnd.n / 3) : 0;
  const founder = co.ceo === 'you' && I.skill ? skill(s, I.skill) * 0.25 : 0;
  const q = clamp100(gauss(35 + rndPower + founder + PRODUCT_BUDGETS[budgetIdx][2], 10));
  return { id: uid(s, 'pr'), name: name || productName(co), q, year: s.year };
}
function revShare(co, amt) {
  const rev = co.last ? co.last.revenue : 0;
  return rev > 0 ? ` · ${Math.round((amt / rev) * 100)}% of last year's revenue` : '';
}
function newestProduct(co) { return co.products.slice().sort((a, b) => b.year - a.year)[0] || null; }
function qualityWord(q) { return q >= 85 ? 'a masterpiece' : q >= 70 ? 'a hit' : q >= 50 ? 'solid' : q >= 30 ? 'forgettable' : 'a flop'; }

/* ---- founding -------------------------------------------------------- */
function foundCompany(s, indId, name, deal) {
  const I = INDUSTRIES[indId], cost = price(s, I.start);
  const co = {
    id: uid(s, 'co'), name, ind: indId, founded: s.year, years: 0,
    cash: Math.round(cost * 0.35), debt: deal.debt || 0, guaranteed: deal.debt || 0,
    equity: deal.equity ?? 1, investors: deal.investor ? [deal.investor] : [], float: 0,
    public: false, shares: 0, price: 0, sent: 1, ticker: '',
    ceo: 'you', ceoName: '', auto: false, locations: 1, team: emptyTeam(), products: [],
    tier: 'standard', mkt: 1, rnd: 0, draw: 0,
    rep: clamp100(10 + skill(s, 'charisma') / 8 + M(s).fame / 5 + randInt(0, 8)),
    val: cost, last: null, hist: [], lossYears: 0, lastRev: 0, growth: 0, closed: false,
  };
  co.products.push(makeProduct(s, co, 0));
  companies(s).push(co);
  tally(s, 'companiesFounded');
  log(s, `🚀 You founded ${name}, ${aAn(I.name.toLowerCase())}.`, 'good');
  return co;
}

defAction({
  id: 'biz_found', cat: 'business', label: 'Start a business', emoji: '🚀', desc: 'Be your own boss.',
  when: (s) => free(s) && A(s) >= 18 && companies(s).length < MAX_COMPANIES,
  run: (s) => {
    popup(s, {
      emoji: '🚀', title: 'Start a business', text: 'What kind of business will you start?', handler: 'bizIndustry',
      choices: INDUSTRY_IDS.map((id) => {
        const I = INDUSTRIES[id], miss = industryMissing(s, id);
        return { label: I.emoji + ' ' + I.name, value: id, sub: miss.length ? 'Needs: ' + miss.join(', ') : 'Costs ' + fmtMoney(price(s, I.start)) + ' to open', disabled: miss.length > 0 };
      }).concat([{ label: 'Never mind', value: null }]),
    });
  },
});
onChoice('bizIndustry', (s, ctx, id) => { if (id) openBizFunding(s, id, {}); });
function openBizFunding(s, id, no) {
  const I = INDUSTRIES[id], cost = price(s, I.start);
  const choices = [{ label: '💵 Use my savings', value: 'savings', sub: fmtMoney(cost) + ' · you keep 100%', disabled: M(s).money < cost }];
  if (!no.loan && canBorrow(s)) choices.push({ label: '🏦 Business loan', value: 'loan', sub: `${fmtMoney(cost)} at 9% · you guarantee it personally` });
  if (!no.angel) choices.push({ label: '👼 Pitch an angel investor', value: 'angel', sub: 'They pay for it in exchange for 20–40% of the company' });
  if (!no.family && relPeople(s, ['parent', 'grandparent', 'spouse']).some((p) => p.money >= cost)) choices.push({ label: '👪 Ask family to invest', value: 'family', sub: 'Keeps it in the family' });
  choices.push({ label: 'Never mind', value: null });
  popup(s, { emoji: I.emoji, title: I.name, text: `Opening costs ${fmtMoney(cost)}. How will you fund it?`, handler: 'bizFunding', ctx: { id, no }, choices });
}
onChoice('bizFunding', (s, ctx, how) => {
  if (!how) return;
  const I = INDUSTRIES[ctx.id], cost = price(s, I.start);
  const deal = { id: ctx.id, how, equity: 1, debt: 0, investor: null, family: null };
  const retry = (key, line) => { popup(s, { emoji: '📭', title: 'No luck', text: line, choices: [{ label: 'OK' }] }); openBizFunding(s, ctx.id, Object.assign({}, ctx.no, { [key]: true })); };
  if (how === 'savings') {
    if (M(s).money < cost) return cantAfford(cost);
  } else if (how === 'loan') {
    const income = (M(s).career ? M(s).career.salary : 0) + (M(s).ptJob ? M(s).ptJob.pay : 0);
    const odds = clamp(0.2 + Math.max(0, netWorth(s)) / (cost * 2) + income / (cost * 1.5) + skill(s, 'business') / 250 - (hasFelony(s) ? 0.2 : 0), 0.03, 0.9);
    if (!chance(odds)) return retry('loan', 'The bank turned down your business loan.');
    deal.debt = cost;
  } else if (how === 'angel') {
    const odds = clamp(0.25 + skill(s, 'business') / 200 + skill(s, 'charisma') / 300 + M(s).fame / 300 + (I.hype ? 0.12 : 0), 0.05, 0.9);
    if (!chance(odds)) return retry('angel', `The angel investors passed on your ${I.name.toLowerCase()}.`);
    const stake = Math.round(randFloat(0.2, 0.4) * 100) / 100;
    deal.equity = 1 - stake;
    deal.investor = { name: pick(INVESTOR_NAMES), stake };
  } else if (how === 'family') {
    const fam = relPeople(s, ['parent', 'grandparent', 'spouse']).filter((p) => p.money >= cost).sort((a, b) => relOf(s, b.id).rel - relOf(s, a.id).rel);
    const p = fam[0];
    if (!p || !chance(relOf(s, p.id).rel / 110)) return retry('family', p ? `${p.first} said they can't risk that kind of money.` : 'Nobody in the family can afford it.');
    deal.family = p.id;
  }
  popup(s, {
    emoji: I.emoji, title: 'Name your ' + I.name.toLowerCase(), text: deal.investor ? `${deal.investor.name} will own ${Math.round(deal.investor.stake * 100)}% of the company.` : deal.family ? `${nm(s, deal.family)} will put up the money.` : '',
    handler: 'bizName', ctx: deal, input: { label: 'Company name', value: bizNameFor(s, ctx.id), max: 32 }, choices: [{ label: 'Open for business!' }],
  });
});
onChoice('bizName', (s, deal, v, input) => {
  const I = INDUSTRIES[deal.id], cost = price(s, I.start);
  if (companies(s).length >= MAX_COMPANIES) return { text: `You can run at most ${MAX_COMPANIES} businesses at once.`, nolog: true };
  if (deal.how === 'savings' && !pay(s, cost)) return cantAfford(cost);
  if (deal.family) { const p = s.people[deal.family]; if (p) { p.money = Math.max(0, p.money - cost); addRel(s, p.id, 2); } }
  const co = foundCompany(s, deal.id, cleanCompanyName(input) || bizNameFor(s, deal.id), deal);
  return { text: `${co.name} is open for business! ${I.emoji} Hire some staff to grow it.`, title: 'You started a business', emoji: '🚀', tone: 'good' };
});

/* ---- the yearly numbers -------------------------------------------- */
function ownerUnit(s, co) {
  if (co.ceo !== 'you' || inPrison(s) || A(s) < 18 || s.dead) return 0;
  const I = indOf(co);
  const base = 0.5 + (I.skill ? skill(s, I.skill) : 30) / 100;
  const busy = M(s).career || inSchool(s) || companies(s).filter((c) => c.ceo === 'you').length > 1;
  return busy ? base * 0.4 : base;
}
function ownerFactor(s, co) {
  if (co.ceo !== 'you') return 1;
  if (inPrison(s)) return 0.8;
  if (M(s).career || inSchool(s)) return 0.92;
  return 1.05 + skill(s, 'business') / 1000;
}
// Customers: reputation and product quality, shaped by pricing. ~0.5 for a new
// business, ~1 for a well-liked one, up to 1.8 for a beloved brand.
function bizDemand(co, q, tier, boost) {
  const I = indOf(co);
  let tierDemand = 1;
  if (tier === 'budget') tierDemand = 1.35;
  else if (tier === 'premium') tierDemand = clamp((q - 35) / 45, 0.25, 1.1);
  else if (tier === 'luxury') tierDemand = clamp((q - 55) / 40, 0.1, 0.95);
  // Each extra location competes with your others for the same customers.
  const saturation = 1 / (1 + Math.max(0, co.locations - 1) * 0.035);
  return clamp((0.55 + co.rep / 150) * Math.pow(0.6 + q / 150, I.qpow || 1) * tierDemand * boost * saturation, 0.03, 1.8);
}
// Up-front cash to hire: recruiting fees (10% of a year's pay, 20% for stars).
function hireCost(s, co, role, n, level) {
  const pay = level === 'star' ? rolePay(s, co, role, 'market') * 1.6 : rolePay(s, co, role, level);
  return Math.round(pay * n * (level === 'star' ? 0.2 : 0.1));
}
// What this year looks like with the current setup (no randomness).
function bizForecast(s, co) {
  const I = indOf(co), t = co.team;
  const cap = capacity(co);
  const opsN = Math.min(t.ops.n, cap);
  const salesN = Math.min(t.sales.n, Math.max(0, cap - opsN));
  const units = opsN * (0.5 + t.ops.skill / 100) + ownerUnit(s, co);
  const salesPower = salesN * (0.5 + t.sales.skill / 100);
  const boost = 1 + 0.5 * Math.min(1, salesPower / Math.max(0.5, units * (I.salesShare || 0.25)));
  const staff = opsN + salesN;
  const needMgr = Math.max(1, Math.ceil(staff / 12));
  const founderManages = co.ceo === 'you' && ownerUnit(s, co) > 0;
  const mgrCov = Math.min(1, (t.manager.n + (founderManages ? 1 : 0)) / needMgr);
  const mgrSkill = t.manager.n ? t.manager.skill : (founderManages ? skill(s, 'business') : 30);
  const eff = (0.8 + 0.2 * mgrCov * (0.5 + mgrSkill / 100)) * (0.8 + avgMorale(co) / 300) * ownerFactor(s, co);
  const q = effQuality(s, co);
  const demand = bizDemand(co, q, co.tier, boost);
  const mods = industryMods(s, co);
  const revenue = Math.round(units * price(s, I.unit) * demand * PRICE_TIERS[co.tier].price * eff * mods.rev);
  const salaries = Math.round(sum(BIZ_ROLE_IDS, (r) => t[r].n * t[r].pay));
  const rent = co.locations * price(s, I.rent);
  const mkt = co.mkt ? bizCost(s, co, MKT_SPEND[co.mkt]) : 0;
  const rnd = co.rnd ? bizCost(s, co, RND_SPEND[co.rnd]) : 0;
  const cogs = Math.round(revenue * I.cogs);
  const draw = co.ceo === 'you' ? co.draw : 0;
  const interest = Math.round(Math.max(0, co.debt) * 0.09 + Math.max(0, -co.cash) * 0.12);
  const fees = franchiseFees(s, co), support = Math.round(fees * 0.15), extra = mods.cost;
  return { revenue, fees, cogs, salaries, rent, mkt, rnd, draw, interest, support, extra, profit: revenue + fees - cogs - salaries - rent - mkt - rnd - draw - interest - support - extra, units, demand, q, eff, cap, staff, idle: Math.max(0, t.ops.n + t.sales.n - cap), rep: mods.rep };
}
// What an industry with its own layer adds to the forecast: a revenue multiplier, a
// reputation pull and running costs. (casinoMods: 54-house.js, zooMods: 58-zoo.js).
function industryMods(s, co) {
  const world = 1 + clamp(worldBiz(s, co.ind), -0.7, 1); // a real boom or bust in the industry (88-world.js)
  if (co.ind === 'casino') { const m = casinoMods(s, co); return Object.assign({}, m, { rev: m.rev * world }); }
  if (co.ind === 'zoo' && typeof zooMods === 'function') { const m = zooMods(s, co); return Object.assign({}, m, { rev: m.rev * world }); }
  return { rev: world, rep: 0, cost: 0 };
}

/* ---- franchising ----------------------------------------------------
 * Franchisees open outlets under your brand and pay a royalty on their sales.
 * Outlets grow with your reputation (and each other: a known brand attracts
 * more franchisees), close faster when the royalty is high or the brand slips. */
function franchiseReady(s, co) { return !!indOf(co).franchise && co.locations >= 3 && co.rep >= 55 && !!co.last && co.last.profit > 0; }
function franchiseOutletRevenue(s, co) { const I = indOf(co); return price(s, I.unit) * I.perLoc * 0.75 * PRICE_TIERS[co.tier].price * (0.6 + effQuality(s, co) / 150); }
function franchiseFees(s, co) { return co.franchise ? Math.round(co.franchise.outlets * franchiseOutletRevenue(s, co) * co.franchise.fee) : 0; }
function feeRow(fee) { return FRANCHISE_FEES.find((x) => x[0] === fee) || FRANCHISE_FEES[1]; }
function startFranchise(s, co, fee) { co.franchise = { outlets: 0, fee, since: s.year }; tally(s, 'franchisesStarted'); }
function franchiseYear(s, co) {
  const fr = co.franchise;
  if (!fr) return;
  const want = randFloat(0.6, 1.4) * (1 + fr.outlets * 0.12) * clamp((co.rep - 40) / 30, 0, 1.6) * feeRow(fr.fee)[2];
  const opened = Math.min(Math.round(want), 3 + Math.round(fr.outlets * 0.2));
  const rate = 0.03 + (fr.fee >= 0.09 ? 0.04 : 0) + (co.rep < 50 ? 0.06 : 0);
  let closed = 0;
  if (fr.outlets <= 30) { for (let i = 0; i < fr.outlets; i++) if (chance(rate)) closed++; } else closed = Math.round(fr.outlets * rate * randFloat(0.7, 1.3));
  fr.outlets = Math.max(0, fr.outlets + opened - closed);
  if (opened >= 5) log(s, `🏪 ${nOf(opened, 'new franchised ' + indOf(co).place, 'new franchised ' + pluralize(indOf(co).place))} opened under the ${co.name} name.`, 'good');
  if (closed >= 5) log(s, `🏚️ ${nOf(closed, 'franchisee')} gave up on ${co.name}.`, 'bad');
}

function businessTick(s) {
  const m = M(s);
  m.bizIncome = [];
  marketTick(s);
  if (!companies(s).length) return;
  for (const co of companies(s).slice()) {
    if (co.closed) continue;
    companyYear(s, co);
    if (s.dead) break;
  }
  m.companies = companies(s).filter((c) => !c.closed);
}

function companyYear(s, co) {
  const I = indOf(co);
  co.years++;
  if (co.ceo === 'trustee' && A(s) >= 18) {
    popup(s, {
      emoji: '🗝️', title: co.name, text: `You're 18 now. ${co.ceoName || 'The trustee'} has been running ${co.name} for you. Take over as CEO?`, handler: 'bizTakeover', ctx: { co: co.id },
      choices: [{ label: 'Take the reins', value: true }, { label: 'Leave it to the professionals', value: false }],
    });
  }
  if (co.ceo !== 'you' || co.auto) autoStaff(s, co);
  if (co.ceo !== 'you') aiDecisions(s, co);

  // Products age; R&D keeps the newest one sharp.
  const newest = co.products.slice().sort((a, b) => b.year - a.year)[0];
  for (const p of co.products) p.q = clamp100(p.q - (p === newest && co.rnd ? 0 : randFloat(0.3, 1.5)));
  if (newest) newest.q = clamp100(newest.q + RND_QUALITY[co.rnd] + Math.min(6, co.team.rnd.n * (co.team.rnd.skill / 100) * 0.6));
  const retired = co.products.filter((p) => p !== newest && s.year - p.year > I.life * 2);
  if (retired.length) co.products = co.products.filter((p) => !retired.includes(p));

  franchiseYear(s, co);
  const f = bizForecast(s, co);
  // Small shops swing wildly from year to year; big companies are steadier.
  const noise = Math.max(0.3, gauss(1, (I.vol || 0.12) / (1 + headcount(co) / 150) + 0.04));
  const revenue = Math.max(0, Math.round(f.revenue * noise));
  const cogs = Math.round(revenue * I.cogs);
  let profit = revenue + f.fees - cogs - f.salaries - f.rent - f.mkt - f.rnd - f.draw - f.interest - f.support - f.extra;
  // A casino or zoo brings what no forecast sees: whales/cheats (54-house.js) or grants/incidents (58-zoo.js).
  let ev = null;
  if (co.ind === 'casino') ev = casinoYear(s, co, revenue);
  else if (co.ind === 'zoo' && typeof zooYear === 'function') ev = zooYear(s, co, revenue);
  if (ev) profit += (ev.whales || ev.extraRev || 0) - ev.cost;
  if (co.closed || s.dead) return;
  const principal = co.debt > 0 ? Math.min(co.debt, Math.round(co.debt * 0.2)) : 0;
  co.debt -= principal;
  if (co.guaranteed) co.guaranteed = Math.min(co.guaranteed, co.debt);
  const tax = profit > 0 ? Math.round(profit * 0.2) : 0;
  profit -= tax;
  co.cash += profit - principal;
  if (f.draw > 0) M(s).bizIncome.push(['Salary from ' + co.name, f.draw]);
  co.last = { year: s.year, revenue, fees: f.fees, cogs, salaries: f.salaries, rent: f.rent, mkt: f.mkt, rnd: f.rnd, draw: f.draw, interest: f.interest, support: f.support, extra: f.extra, whales: ev ? (ev.whales || ev.extraRev || 0) : 0, special: ev ? ev.cost : 0, tax, profit, principal };
  if (profit > 0) tally(s, 'profitableYears');

  // Reputation settles toward what your products and marketing earn. A big franchise
  // network is harder to keep consistent.
  const mktRep = MKT_REP[co.mkt] + Math.min(8, co.team.marketing.n * (co.team.marketing.skill / 100) * 0.8);
  const repTarget = clamp(f.q * 0.75 + mktRep * 2.5 + Math.min(5, co.years) + f.rep - (co.franchise ? Math.min(6, co.franchise.outlets / 25) : 0), 0, 100);
  co.rep = clamp100(co.rep + (repTarget - co.rep) * 0.3 + gauss(0, 3));
  teamYear(s, co, profit > 0);

  // Growth counts franchise royalties; so does the valuation, three times over,
  // because royalties are nearly pure profit.
  const sales = revenue + f.fees;
  const growth = co.lastRev > 0 ? (sales - co.lastRev) / co.lastRev : sales > 0 ? 0.5 : 0;
  co.lastRev = sales;
  co.growth = growth;
  // Valuations follow the trend, not one lucky or unlucky year.
  co.trend = co.trend == null ? growth : co.trend * 0.6 + clamp(growth, -0.5, 1.5) * 0.4;
  const mult = I.mult * clamp(1 + co.trend * 1.5, 0.4, 3) * (0.6 + co.rep / 125);
  const hype = I.hype ? f.q * 5000 * I.hype * Math.min(1, (headcount(co) + 1) / 10) * econ(s) : 0;
  const luck = ev ? Math.round((ev.whales || ev.extraRev || 0) * 0.8) : 0;
  co.val = Math.max(0, Math.round(Math.max(0, co.cash - co.debt) + co.locations * price(s, I.locBuild) * 0.5 + Math.max((revenue + f.fees * 3) * mult, (profit - luck) * 8, hype)));
  let stockLine = '';
  if (co.public) {
    const before = co.price;
    co.sent = clamp(co.sent * gauss(1, 0.1) * (growth > 0.02 ? 1.04 : 0.96), 0.4, 2.5);
    co.price = Math.max(0.01, Math.round((co.val * co.sent / co.shares) * 100) / 100);
    const pct = before ? Math.round(((co.price - before) / before) * 100) : 0;
    stockLine = ` ${co.ticker} ${pct >= 0 ? '▲' : '▼'}${Math.abs(pct)}% to ${sharePrice(co.price)}.`;
  }
  co.hist.push({ y: s.year, r: revenue, p: profit, v: coWorth(co) });
  if (co.hist.length > 40) co.hist.shift();
  co.lossYears = profit < 0 ? co.lossYears + 1 : 0;
  if (co.ceo === 'you' && free(s)) {
    addSkill(s, 'business', randFloat(1, 3));
    if (I.skill) addSkill(s, I.skill, randFloat(0.5, 1.5));
    tally(s, 'bizYears');
  }
  log(s, `${I.emoji} ${co.name}: revenue ${fmtMoneyShort(revenue)}${f.fees ? ` plus ${fmtMoneyShort(f.fees)} in franchise fees` : ''}, ${profit >= 0 ? 'profit' : 'loss'} ${fmtMoneyShort(Math.abs(profit))}.${stockLine}`, profit >= 0 ? '' : 'bad');

  if (co.cash < -Math.max(price(s, I.start) * 0.5, revenue * 0.35)) {
    const text = liquidate(s, co);
    tally(s, 'bizFails');
    add(s, { happy: -15 });
    announce(s, { emoji: '📉', title: co.name + ' went bankrupt', text: `${co.name} ran out of money and collapsed.${text}`, tone: 'bad' });
    return;
  }
  if (co.ceo === 'you' && co.equity < 0.5 && co.lossYears >= 2 && chance(0.35)) {
    co.ceo = 'hired';
    co.ceoName = randomFirst(P(s).country, chance(0.5) ? 'm' : 'f') + ' ' + randomLast(P(s).country);
    co.draw = 0;
    add(s, { happy: -12 });
    announce(s, { emoji: '🪑', title: 'Ousted', text: `After two years of losses, ${co.name}'s board voted you out as CEO and hired ${co.ceoName}. You still own ${pctStr(co.equity)}.`, tone: 'bad' });
  }
  if (chance(0.5)) rollBizEvent(s, co);
}
function pctStr(x) { const p = x * 100; return (p >= 10 || p === Math.round(p) ? Math.round(p) : p.toFixed(1)) + '%'; }
onChoice('bizTakeover', (s, ctx, yes) => {
  const co = company(s, ctx.co);
  if (!co) return;
  co.ceo = yes ? 'you' : 'hired';
  return yes ? { text: `You took over as CEO of ${co.name}.`, tone: 'good' } : `${co.ceoName || 'A professional CEO'} will keep running ${co.name}.`;
});

function teamYear(s, co, profitable) {
  const t = co.team;
  const staff = t.ops.n + t.sales.n;
  const cov = Math.min(1, (t.manager.n + (co.ceo === 'you' && ownerUnit(s, co) > 0 ? 1 : 0)) / Math.max(1, Math.ceil(staff / 12)));
  for (const r of BIZ_ROLE_IDS) {
    const g = t[r];
    if (!g.n) continue;
    const market = rolePay(s, co, r, 'market');
    const target = 55 + (g.pay / market - 1) * 80 + (profitable ? 5 : -8) + (co.rep - 50) / 10 + (cov - 0.5) * 20;
    g.morale = clamp(g.morale + (target - g.morale) * 0.35 + gauss(0, 4), 0, 100);
    g.skill = clamp(g.skill + randFloat(0.3, 1.8), 5, 95);
    const rate = clamp(0.05 + (50 - g.morale) / 120, 0.02, 0.45);
    let leave = 0;
    if (g.n <= 20) { for (let i = 0; i < g.n; i++) if (chance(rate)) leave++; } else leave = Math.round(g.n * rate * randFloat(0.7, 1.3));
    if (leave) {
      g.n -= leave;
      if (leave >= Math.max(3, g.n * 0.2)) log(s, `🚪 ${nOf(leave, roleTitle(co, r, 1).toLowerCase(), roleTitle(co, r, 2).toLowerCase())} quit ${co.name}.`, 'bad');
    }
  }
}

function hireStaff(s, co, role, n, level, quiet) {
  const g = co.team[role];
  const L = PAY_LEVELS[level === 'star' ? 'high' : level];
  const pay = level === 'star' ? Math.round(rolePay(s, co, role, 'market') * 1.6) : rolePay(s, co, role, level);
  const skillNew = level === 'star' ? clamp(72 + gauss(0, 7), 55, 97) : clamp(35 + co.rep / 4 + L.skill + gauss(0, 6), 8, 92);
  const moraleNew = clamp(65 + L.morale, 10, 95);
  const tot = g.n + n;
  g.skill = g.n ? (g.skill * g.n + skillNew * n) / tot : skillNew;
  g.pay = Math.round(g.n ? (g.pay * g.n + pay * n) / tot : pay);
  g.morale = g.n ? (g.morale * g.n + moraleNew * n) / tot : moraleNew;
  g.n = tot;
  if (!quiet) tally(s, 'hires', n);
}
// How much one more hire in this role changes this year's projected profit.
function marginalProfit(s, co, role) {
  const keep = Object.assign({}, co.team[role]);
  const before = bizForecast(s, co).profit;
  hireStaff(s, co, role, 1, 'market', true);
  const after = bizForecast(s, co).profit;
  co.team[role] = keep;
  return after - before;
}
function layOff(s, co, role, n) {
  const g = co.team[role];
  n = Math.min(n, g.n);
  if (n <= 0) return 0;
  co.cash -= Math.round(g.pay * 0.15 * n);
  g.n -= n;
  for (const r of BIZ_ROLE_IDS) if (co.team[r].n) co.team[r].morale = clamp(co.team[r].morale - Math.min(15, 3 + n / 4), 0, 100);
  return n;
}
// Autopilot / hired CEO: grow the floor staff in chunks as long as the forecast says each
// chunk pays for itself, then add support staff once the business is making money.
function autoStaff(s, co) {
  const I = indOf(co), t = co.team, cap = capacity(co);
  const lastProfit = co.last ? co.last.profit : 0;
  if (co.lossYears >= 2 && co.cash < 0) {
    for (const r of ['ops', 'sales', 'marketing', 'rnd']) layOff(s, co, r, Math.ceil(t[r].n * 0.1));
    return;
  }
  const salesTarget = Math.floor(cap * (I.salesShare || 0.25));
  const targets = { ops: cap - salesTarget, sales: salesTarget };
  for (const r of ['ops', 'sales', 'manager']) {
    for (let guard = 0; guard < 30; guard++) {
      const room = r === 'manager'
        ? Math.ceil((t.ops.n + t.sales.n) / 12) - t.manager.n
        : Math.min(targets[r] - t[r].n, cap - t.ops.n - t.sales.n);
      if (room <= 0) break;
      // Only hire what the company can fund: recruiting fees plus a quarter-year payroll cushion.
      const per = rolePay(s, co, r, 'market');
      const chunk = Math.min(Math.max(1, Math.ceil(room / 3)), Math.floor(co.cash / (per * 0.2)));
      if (chunk <= 0) break;
      const keep = Object.assign({}, t[r]);
      const before = bizForecast(s, co).profit;
      hireStaff(s, co, r, chunk, 'market', true);
      if (bizForecast(s, co).profit <= before) { co.team[r] = keep; break; }
      co.cash -= hireCost(s, co, r, chunk, 'market');
      tally(s, 'hires', chunk);
    }
  }
  if (lastProfit <= 0 || co.cash <= 0) return;
  const staff = t.ops.n + t.sales.n;
  for (const [r, want] of [['rnd', Math.max(staff >= 6 ? 1 : 0, Math.floor(staff / 15))], ['marketing', Math.floor(staff / 20)]]) {
    const n = Math.min(want - t[r].n, Math.floor((lastProfit * 0.5) / rolePay(s, co, r, 'market')), Math.floor(co.cash / (rolePay(s, co, r, 'market') * 0.2)));
    if (n > 0) { co.cash -= hireCost(s, co, r, n, 'market'); hireStaff(s, co, r, n, 'market'); }
  }
}
// A hired CEO keeps marketing near 8% of revenue and R&D near 5%.
function affordableTier(s, co, table, share) {
  const rev = co.last ? co.last.revenue : 0;
  let tier = 0;
  for (let i = 1; i < table.length; i++) if (bizCost(s, co, table[i]) <= rev * share) tier = i;
  return tier;
}
function aiDecisions(s, co) {
  co.mkt = Math.max(1, affordableTier(s, co, MKT_SPEND, 0.08));
  co.rnd = affordableTier(s, co, RND_SPEND, 0.05);
  const setup = nicePrice(price(s, indOf(co).start) * 0.5);
  if (!co.franchise && franchiseReady(s, co) && co.cash > setup * 3 && chance(0.3)) {
    co.cash -= setup;
    startFranchise(s, co, 0.06);
    log(s, `🏪 ${co.ceoName || 'Management'} started franchising ${co.name}.`);
  }
  const newest = co.products.slice().sort((a, b) => b.year - a.year)[0];
  if ((!newest || freshness(s, co, newest) < 0.5) && co.cash > bizCost(s, co, 50000)) {
    co.cash -= bizCost(s, co, 50000);
    co.products.push(makeProduct(s, co, 1));
    if (co.products.length > 6) co.products.shift();
  }
}

/* ---- company actions (target: company id) --------------------------- */
const manageable = (s, id) => canManage(s, company(s, id));
const cosub = (fn) => (s, id) => { const co = company(s, id); return co ? fn(s, co) : ''; };
defAction({
  id: 'biz_hire', cat: 'company', target: 'company', label: 'Hire staff', emoji: '👔',
  sub: cosub((s, co) => `${headcount(co)} on staff · room for ${capacity(co)} in ${nOf(co.locations, indOf(co).place)}`),
  when: manageable,
  run: (s, id) => {
    const co = company(s, id);
    popup(s, {
      emoji: '👔', title: 'Hire for ' + co.name, text: 'Which team?', handler: 'bizHireRole', ctx: { co: id },
      choices: BIZ_ROLE_IDS.map((r) => ({ label: `${BIZ_ROLES[r].emoji} ${roleTitle(co, r, 2)} (${co.team[r].n})`, value: r, sub: `${BIZ_ROLES[r].desc} ${fmtMoneyShort(rolePay(s, co, r, 'market'))}/yr each.` })).concat([{ label: 'Never mind', value: null }]),
    });
  },
});
onChoice('bizHireRole', (s, ctx, role) => {
  const co = company(s, ctx.co);
  if (!role || !co) return;
  const room = ['ops', 'sales'].includes(role) ? capacity(co) - co.team.ops.n - co.team.sales.n : 500;
  if (room <= 0) return { text: `There's no room for more ${roleTitle(co, role, 2).toLowerCase()}. Open another ${indOf(co).place} first.`, nolog: true };
  const counts = [1, 5, 20, 100, 500].filter((n) => n <= room);
  if (room < 500 && !counts.includes(room) && room > 1) counts.push(room);
  const pay = rolePay(s, co, role, 'market');
  const fee = (n, level) => hireCost(s, co, role, n, level);
  const opt = (label, n, level, sub) => ({ label, value: `${n}:${level}`, sub: `${sub} · ${fmtMoney(fee(n, level))} recruiting fee`, disabled: co.cash < fee(n, level) });
  const choices = counts.map((n) => opt(`Hire ${nOf(n, roleTitle(co, role, 1).toLowerCase(), roleTitle(co, role, 2).toLowerCase())}`, n, 'market', `${fmtMoney(pay * n)}/yr at market pay`));
  choices.push(opt(`Hire 1 star ${roleTitle(co, role, 1).toLowerCase()}`, 1, 'star', `${fmtMoney(Math.round(pay * 1.6))}/yr · highly skilled`));
  if (room >= 5) choices.push(opt('Hire 5 on bargain pay', 5, 'low', `${fmtMoney(rolePay(s, co, role, 'low') * 5)}/yr · cheaper, less skilled, less happy`));
  choices.push({ label: 'Never mind', value: null });
  let tip = '';
  if (['ops', 'sales', 'manager'].includes(role)) {
    const mp = marginalProfit(s, co, role);
    tip = mp >= 0 ? ` Right now, one more adds about ${fmtMoney(mp)} a year to profit.` : ` Right now, one more would cost about ${fmtMoney(-mp)} a year more than they bring in.`;
  } else tip = role === 'rnd' ? ' They make your products better every year.' : ' They build your reputation every year.';
  popup(s, { emoji: BIZ_ROLES[role].emoji, title: roleTitle(co, role, 2), text: `${co.name} has ${co.team[role].n} now.${['ops', 'sales'].includes(role) ? ` Room for ${room} more.` : ''}${tip}`, handler: 'bizHire', ctx: { co: ctx.co, role }, choices });
});
onChoice('bizHire', (s, ctx, v) => {
  const co = company(s, ctx.co);
  if (!v || !co) return;
  const [n, level] = v.split(':');
  const fee = hireCost(s, co, ctx.role, Number(n), level);
  if (co.cash < fee) return { text: `${co.name} can't cover the ${fmtMoney(fee)} recruiting fee. Put in some of your own money first.`, nolog: true };
  co.cash -= fee;
  hireStaff(s, co, ctx.role, Number(n), level);
  return `${co.name} hired ${level === 'star' ? 'a star ' + roleTitle(co, ctx.role, 1).toLowerCase() : nOf(Number(n), roleTitle(co, ctx.role, 1).toLowerCase(), roleTitle(co, ctx.role, 2).toLowerCase())}.`;
});
defAction({
  id: 'biz_team', cat: 'company', target: 'company', label: 'Manage your team', emoji: '👥', desc: 'Raises, training, perks, layoffs.',
  when: (s, id) => manageable(s, id) && headcount(company(s, id)) > 0,
  run: (s, id) => {
    const co = company(s, id);
    popup(s, {
      emoji: '👥', title: co.name + ' team', text: 'Which team?', handler: 'bizTeamRole', ctx: { co: id },
      choices: BIZ_ROLE_IDS.filter((r) => co.team[r].n).map((r) => { const g = co.team[r]; return { label: `${BIZ_ROLES[r].emoji} ${roleTitle(co, r, 2)} (${g.n})`, value: r, sub: `Skill ${Math.round(g.skill)} · morale ${Math.round(g.morale)}% · ${fmtMoneyShort(g.pay)}/yr each` }; }).concat([{ label: 'Never mind', value: null }]),
    });
  },
});
onChoice('bizTeamRole', (s, ctx, role) => {
  const co = company(s, ctx.co);
  if (!role || !co) return;
  const g = co.team[role];
  const train = bizCost(s, co, 1500) * g.n;
  const perks = nicePrice(price(s, 600) * g.n);
  popup(s, {
    emoji: BIZ_ROLES[role].emoji, title: roleTitle(co, role, 2), text: `${g.n} people · skill ${Math.round(g.skill)} · morale ${Math.round(g.morale)}% · ${fmtMoney(g.pay)}/yr each (market is ${fmtMoney(rolePay(s, co, role, 'market'))}).`, handler: 'bizTeamDo', ctx: { co: ctx.co, role },
    choices: [
      { label: '💸 Give everyone a 10% raise', value: 'raise', sub: `+${fmtMoney(Math.round(g.pay * 0.1 * g.n))}/yr` },
      { label: '📚 Send them to training', value: 'train', sub: fmtMoney(train) + ' from company cash', disabled: co.cash < train },
      { label: '🍕 Perks and a team outing', value: 'perks', sub: fmtMoney(perks) + ' from company cash', disabled: co.cash < perks },
      { label: '✂️ Lay off one person', value: 'cut1', tone: 'bad' },
      ...(g.n >= 4 ? [{ label: '✂️ Lay off a quarter of them', value: 'cut25', tone: 'bad' }] : []),
      { label: '✂️ Lay off the whole team', value: 'cutall', tone: 'bad' },
      { label: 'Never mind', value: null },
    ],
  });
});
onChoice('bizTeamDo', (s, ctx, v) => {
  const co = company(s, ctx.co);
  if (!v || !co) return;
  const g = co.team[ctx.role], title = roleTitle(co, ctx.role, 2).toLowerCase();
  if (v === 'raise') { g.pay = Math.round(g.pay * 1.1); g.morale = clamp(g.morale + 10, 0, 100); return `Your ${title} got a raise. Morale is up.`; }
  if (v === 'train') { const c = bizCost(s, co, 1500) * g.n; if (co.cash < c) return { text: `${co.name} can't afford it.`, nolog: true }; co.cash -= c; g.skill = clamp(g.skill + randFloat(4, 8), 5, 95); g.morale = clamp(g.morale + 3, 0, 100); return `Your ${title} came back from training sharper.`; }
  if (v === 'perks') { const c = nicePrice(price(s, 600) * g.n); if (co.cash < c) return { text: `${co.name} can't afford it.`, nolog: true }; co.cash -= c; g.morale = clamp(g.morale + randFloat(5, 9), 0, 100); return `You took the ${title} out ${pick(['bowling', 'for a fancy dinner', 'to an escape room', 'to a karaoke bar', 'on a boat'])}.`; }
  const n = v === 'cut1' ? 1 : v === 'cut25' ? Math.ceil(g.n / 4) : g.n;
  const cut = layOff(s, co, ctx.role, n);
  if (cut >= 10) add(s, { karma: -2 });
  return { text: `You laid off ${nOf(cut, roleTitle(co, ctx.role, 1).toLowerCase(), title)}. The rest of the staff is nervous.`, tone: 'bad' };
});
defAction({
  id: 'biz_autopilot', cat: 'company', target: 'company', emoji: '🤖',
  label: (s, id) => (company(s, id).auto ? 'Turn off autopilot hiring' : 'Turn on autopilot hiring'),
  sub: () => 'Automatically keeps every location staffed each year',
  when: manageable,
  run: (s, id) => { const co = company(s, id); co.auto = !co.auto; return { text: `Autopilot hiring is ${co.auto ? 'on' : 'off'} for ${co.name}.`, quiet: true }; },
});
defAction({
  id: 'biz_product', cat: 'company', target: 'company', emoji: '💡',
  label: (s, id) => 'Launch a new ' + indOf(company(s, id)).product,
  sub: cosub((s, co) => `Quality ${Math.round(effQuality(s, co))} · ${nOf(co.products.length, indOf(co).product)}`),
  when: manageable,
  run: (s, id) => {
    const co = company(s, id);
    if (count(s, 'prod_' + id) >= 2) return { text: 'Your team is already working on two launches this year.', nolog: true };
    popup(s, {
      emoji: '💡', title: 'New ' + indOf(co).product, text: `How much will you put into it? Your R&D team and your own ${indOf(co).skill ? SKILLS[indOf(co).skill].name.toLowerCase() : ''} skill matter too.`, handler: 'bizProductBudget', ctx: { co: id },
      choices: PRODUCT_BUDGETS.map(([n, usd], i) => ({ label: n, value: i, sub: fmtMoney(bizCost(s, co, usd)) + ' from company cash', disabled: co.cash < bizCost(s, co, usd) })).concat([{ label: 'Never mind', value: -1 }]),
    });
  },
});
onChoice('bizProductBudget', (s, ctx, i) => {
  const co = company(s, ctx.co);
  if (i < 0 || !co) return;
  popup(s, { emoji: '💡', title: 'Name it', text: `What will you call your new ${indOf(co).product}?`, handler: 'bizProductName', ctx: { co: ctx.co, i }, input: { label: 'Name', value: productName(co), max: 32 }, choices: [{ label: 'Launch!' }] });
});
onChoice('bizProductName', (s, ctx, v, input) => {
  const co = company(s, ctx.co);
  if (!co) return;
  const cost = bizCost(s, co, PRODUCT_BUDGETS[ctx.i][1]);
  if (co.cash < cost) return { text: `${co.name} can't afford that budget.`, nolog: true };
  bump(s, 'prod_' + ctx.co);
  co.cash -= cost;
  const p = makeProduct(s, co, ctx.i, cleanCompanyName(input) || productName(co));
  co.products.push(p);
  if (co.products.length > 6) co.products.shift();
  co.rep = clamp100(co.rep + (p.q - 50) / 6);
  tally(s, 'productsLaunched');
  if (p.q >= 70) tally(s, 'hits');
  return { text: `${co.name} launched “${p.name}”. Reviews say it's ${qualityWord(p.q)} (quality ${p.q}).`, tone: p.q >= 60 ? 'good' : p.q < 35 ? 'bad' : '', emoji: '💡' };
});
onChoice('bizProductAct', (s, ctx, v) => {
  const co = company(s, ctx.co);
  const p = co && co.products.find((x) => x.id === ctx.p);
  if (!v || !p) return;
  if (v === 'drop') { if (co.products.length <= 1) return { text: "You can't drop your only product.", nolog: true }; co.products = co.products.filter((x) => x !== p); return `${co.name} discontinued “${p.name}”.`; }
  const cost = bizCost(s, co, 50000);
  if (co.cash < cost) return { text: `${co.name} can't afford a refresh.`, nolog: true };
  co.cash -= cost;
  p.q = clamp100(p.q + randInt(4, 10));
  p.year = Math.min(s.year, p.year + Math.ceil((s.year - p.year) / 2));
  return `You refreshed “${p.name}”. Quality is now ${p.q}.`;
});
defAction({
  id: 'biz_pricing', cat: 'company', target: 'company', label: 'Pricing', emoji: '🏷️',
  sub: cosub((s, co) => PRICE_TIERS[co.tier].name),
  when: (s, id) => manageable(s, id) && company(s, id).ind !== 'zoo', // a zoo prices through its tickets (58-zoo.js)
  run: (s, id) => {
    const co = company(s, id);
    popup(s, { emoji: '🏷️', title: 'Pricing', text: `Your products average quality ${Math.round(effQuality(s, co))}.`, handler: 'bizPricing', ctx: { co: id }, choices: PRICE_TIER_IDS.map((k) => ({ label: PRICE_TIERS[k].emoji + ' ' + PRICE_TIERS[k].name, value: k, sub: PRICE_TIERS[k].desc + (co.tier === k ? ' (current)' : '') })) });
  },
});
onChoice('bizPricing', (s, ctx, k) => { const co = company(s, ctx.co); if (!co) return; co.tier = k; return { text: `${co.name} switched to ${PRICE_TIERS[k].name.toLowerCase()} pricing.`, quiet: true }; });
defAction({
  id: 'biz_marketing', cat: 'company', target: 'company', label: 'Marketing budget', emoji: '📣',
  sub: cosub((s, co) => SPEND_NAMES[co.mkt] + (co.mkt ? ' · ' + fmtMoneyShort(bizCost(s, co, MKT_SPEND[co.mkt])) + '/yr' : '')),
  when: manageable,
  run: (s, id) => {
    const co = company(s, id);
    popup(s, { emoji: '📣', title: 'Marketing budget', text: 'Marketing builds your reputation, which brings in customers. Most businesses spend 3–10% of revenue.', handler: 'bizSpend', ctx: { co: id, k: 'mkt' }, choices: SPEND_NAMES.map((n, i) => ({ label: n, value: i, sub: (i ? fmtMoney(bizCost(s, co, MKT_SPEND[i])) + '/yr' + revShare(co, bizCost(s, co, MKT_SPEND[i])) : 'Free') + (co.mkt === i ? ' (current)' : '') })) });
  },
});
defAction({
  id: 'biz_rnd', cat: 'company', target: 'company', label: 'R&D budget', emoji: '🔬',
  sub: cosub((s, co) => SPEND_NAMES[co.rnd] + (co.rnd ? ' · ' + fmtMoneyShort(bizCost(s, co, RND_SPEND[co.rnd])) + '/yr' : '')),
  when: manageable,
  run: (s, id) => {
    const co = company(s, id);
    popup(s, { emoji: '🔬', title: 'R&D budget', text: 'R&D keeps your newest product improving every year instead of slowly going stale.', handler: 'bizSpend', ctx: { co: id, k: 'rnd' }, choices: SPEND_NAMES.map((n, i) => ({ label: n, value: i, sub: (i ? fmtMoney(bizCost(s, co, RND_SPEND[i])) + '/yr' + revShare(co, bizCost(s, co, RND_SPEND[i])) : 'Free') + (co.rnd === i ? ' (current)' : '') })) });
  },
});
onChoice('bizSpend', (s, ctx, i) => { const co = company(s, ctx.co); if (!co) return; co[ctx.k] = i; return { text: `${co.name}'s ${ctx.k === 'mkt' ? 'marketing' : 'R&D'} budget is now ${SPEND_NAMES[i].toLowerCase()}.`, quiet: true }; });
defAction({
  id: 'biz_open', cat: 'company', target: 'company', emoji: '📍',
  label: (s, id) => 'Open another ' + indOf(company(s, id)).place,
  sub: cosub((s, co) => fmtMoney(price(s, indOf(co).locBuild)) + ' · +' + indOf(co).perLoc + ' staff room · ' + fmtMoney(price(s, indOf(co).rent)) + '/yr overhead'),
  when: manageable,
  run: (s, id) => {
    const co = company(s, id), cost = price(s, indOf(co).locBuild);
    popup(s, {
      emoji: '📍', title: 'New ' + indOf(co).place, text: `Opening another ${indOf(co).place} costs ${fmtMoney(cost)}.`, handler: 'bizOpen', ctx: { co: id },
      choices: [{ label: 'Pay from company cash', value: 'co', sub: 'Company has ' + fmtMoney(co.cash), disabled: co.cash < cost }, { label: 'Pay with my own money', value: 'me', sub: 'You have ' + fmtMoney(M(s).money), disabled: M(s).money < cost }, { label: 'Never mind', value: null }],
    });
  },
});
onChoice('bizOpen', (s, ctx, v) => {
  const co = company(s, ctx.co);
  if (!v || !co) return;
  const cost = price(s, indOf(co).locBuild);
  if (v === 'co') { if (co.cash < cost) return { text: `${co.name} can't afford it.`, nolog: true }; co.cash -= cost; } else if (!pay(s, cost)) return cantAfford(cost);
  co.locations++;
  tally(s, 'locationsOpened');
  return { text: `${co.name} opened ${co.locations === 2 ? 'a second' : 'another'} ${indOf(co).place} (${co.locations} total). Hire staff to fill it.`, tone: 'good', emoji: '📍' };
});
defAction({
  id: 'biz_closeloc', cat: 'company', target: 'company', emoji: '🏚️',
  label: (s, id) => 'Close a ' + indOf(company(s, id)).place,
  when: (s, id) => manageable(s, id) && company(s, id).locations > 1,
  run: (s, id) => {
    const co = company(s, id), I = indOf(co);
    co.locations--;
    co.cash += Math.round(price(s, I.locBuild) * 0.25);
    let excess = co.team.ops.n + co.team.sales.n - capacity(co);
    for (const r of ['sales', 'ops']) { if (excess <= 0) break; excess -= layOff(s, co, r, excess); }
    return `${co.name} closed a ${I.place}. ${co.locations} left.`;
  },
});
defAction({
  id: 'biz_franchise', cat: 'company', target: 'company', emoji: '🏪',
  label: (s, id) => (company(s, id).franchise ? 'Franchise terms' : 'Start franchising'),
  sub: cosub((s, co) => {
    if (co.franchise) return `${nOf(co.franchise.outlets, 'franchised ' + indOf(co).place, 'franchised ' + pluralize(indOf(co).place))} · ${Math.round(co.franchise.fee * 100)}% royalty`;
    return franchiseReady(s, co) ? `Setup ${fmtMoney(nicePrice(price(s, indOf(co).start) * 0.5))} · others open outlets, you collect royalties` : 'Needs 3+ locations, reputation 55+ and a profitable year';
  }),
  when: (s, id) => manageable(s, id) && !!indOf(company(s, id)).franchise,
  run: (s, id) => {
    const co = company(s, id), I = indOf(co), setup = nicePrice(price(s, I.start) * 0.5);
    if (!co.franchise && !franchiseReady(s, co)) return { text: `Franchisees want a proven brand: at least 3 ${pluralize(I.place)}, a reputation of 55 or more, and a profitable year. ${co.name} has ${co.locations}, reputation ${Math.round(co.rep)}${co.last && co.last.profit > 0 ? '' : ', and no profitable year yet'}.`, nolog: true, emoji: '🏪' };
    const per = franchiseOutletRevenue(s, co);
    popup(s, {
      emoji: '🏪', title: co.franchise ? 'Franchise terms' : 'Start franchising', handler: 'bizFranchise', ctx: { co: id },
      text: co.franchise
        ? `${nOf(co.franchise.outlets, 'franchised ' + I.place, 'franchised ' + pluralize(I.place))} pay you ${Math.round(co.franchise.fee * 100)}% of their sales. A lower royalty attracts more franchisees; a higher one earns more per outlet but drives some away.`
        : `Setting up franchising (legal work, manuals, training) costs ${fmtMoney(setup)} from company cash. Each outlet sells about ${fmtMoney(per)} a year, and you take a royalty. Outlets open faster when your reputation is high.`,
      choices: FRANCHISE_FEES.map(([fee, name]) => ({ label: `${name} royalty: ${Math.round(fee * 100)}%`, value: fee, sub: `about ${fmtMoney(per * fee)} per outlet a year${co.franchise && co.franchise.fee === fee ? ' (current)' : ''}`, disabled: !co.franchise && co.cash < setup })).concat([{ label: 'Never mind', value: 0 }]),
    });
  },
});
onChoice('bizFranchise', (s, ctx, fee) => {
  const co = company(s, ctx.co);
  if (!fee || !co) return;
  if (co.franchise) { co.franchise.fee = fee; return { text: `${co.name}'s franchise royalty is now ${Math.round(fee * 100)}%.`, quiet: true }; }
  const setup = nicePrice(price(s, indOf(co).start) * 0.5);
  if (co.cash < setup) return { text: `${co.name} can't cover the ${fmtMoney(setup)} setup.`, nolog: true };
  co.cash -= setup;
  startFranchise(s, co, fee);
  return { text: `${co.name} is now a franchise. The first franchisees should sign on within the year.`, tone: 'good', emoji: '🏪' };
});
defAction({
  id: 'biz_salary', cat: 'company', target: 'company', label: 'Pay yourself', emoji: '💼',
  sub: cosub((s, co) => (co.draw ? fmtMoney(co.draw) + '/yr' : 'Nothing yet')),
  when: manageable,
  run: (s, id) => {
    const co = company(s, id);
    popup(s, { emoji: '💼', title: 'Your salary', text: `Paid from ${co.name}'s cash each year (and taxed like any salary).`, handler: 'bizSalary', ctx: { co: id }, choices: OWNER_SALARIES.map((v) => ({ label: v ? fmtMoney(price(s, v)) + '/yr' : 'Nothing', value: v ? price(s, v) : 0, sub: co.draw === (v ? price(s, v) : 0) ? 'Current' : '' })) });
  },
});
onChoice('bizSalary', (s, ctx, v) => { const co = company(s, ctx.co); if (!co) return; co.draw = v; return { text: v ? `You'll pay yourself ${fmtMoney(v)} a year from ${co.name}.` : `You'll stop paying yourself from ${co.name}.`, quiet: true }; });
defAction({
  id: 'biz_invest', cat: 'company', target: 'company', label: 'Put in your own money', emoji: '💰',
  sub: cosub((s, co) => 'Company cash: ' + fmtMoney(co.cash)),
  when: (s, id) => manageable(s, id) && M(s).money > 0,
  run: (s, id) => {
    const co = company(s, id);
    const tiers = [10000, 100000, 1000000, 10000000].map((v) => price(s, v)).filter((v) => v <= M(s).money);
    if (M(s).money > 0) tiers.push(Math.floor(M(s).money));
    popup(s, { emoji: '💰', title: 'Invest in ' + co.name, text: `You have ${fmtMoney(M(s).money)}.`, handler: 'bizInvest', ctx: { co: id }, choices: tiers.map((v, i) => ({ label: i === tiers.length - 1 ? `Everything (${fmtMoney(v)})` : fmtMoney(v), value: v })).concat([{ label: 'Never mind', value: 0 }]) });
  },
});
onChoice('bizInvest', (s, ctx, v) => {
  const co = company(s, ctx.co);
  if (!v || !co) return;
  if (!pay(s, v)) return cantAfford(v);
  co.cash += v;
  return `You put ${fmtMoney(v)} of your own money into ${co.name}.`;
});
defAction({
  id: 'biz_raise', cat: 'company', target: 'company', label: 'Raise money from investors', emoji: '🤝', desc: 'Sell part of the company for cash.',
  when: (s, id) => manageable(s, id) && !company(s, id).public,
  run: (s, id) => {
    const co = company(s, id);
    if (bump(s, 'raise_' + id) > 1) return { text: 'You already pitched investors this year.', nolog: true };
    const I = indOf(co);
    const odds = clamp(0.2 + (co.growth > 0.2 ? 0.2 : co.growth > 0 ? 0.1 : -0.1) + co.rep / 250 + skill(s, 'business') / 250 + skill(s, 'charisma') / 400 + (I.hype ? 0.15 : 0), 0.05, 0.9);
    addSkill(s, 'charisma', 1);
    if (!chance(odds)) return { text: `You pitched ${co.name} to a dozen investors. Nobody bit.`, tone: 'bad', emoji: '🤝' };
    const offers = [0, 1].map(() => {
      const amount = nicePrice(Math.max(price(s, 25000), co.val * randFloat(0.12, 0.35)));
      const stake = clamp((amount / (co.val + amount)) * randFloat(0.9, 1.3), 0.03, 0.6);
      return { name: pick(INVESTOR_NAMES), amount, stake: Math.round(stake * 1000) / 1000 };
    });
    popup(s, {
      emoji: '🤝', title: 'Term sheets', text: `Investors value ${co.name} at about ${fmtMoney(co.val)}. You own ${pctStr(co.equity)} now.`, handler: 'bizRaise', ctx: { co: id, offers },
      choices: offers.map((o, i) => ({ label: `${o.name}: ${fmtMoney(o.amount)}`, value: i, sub: `for ${pctStr(o.stake)} of the company` })).concat([{ label: 'Walk away', value: -1 }]),
    });
  },
});
onChoice('bizRaise', (s, ctx, i) => {
  const co = company(s, ctx.co);
  if (i < 0 || !co) return;
  const o = ctx.offers[i];
  dilute(co, o.stake);
  co.investors.push({ name: o.name, stake: o.stake });
  co.cash += o.amount;
  tally(s, 'raised', o.amount);
  return { text: `${o.name} invested ${fmtMoney(o.amount)} in ${co.name}. You now own ${pctStr(co.equity)}.${co.equity < 0.5 ? ' Careful: investors now control the board.' : ''}`, tone: 'good', emoji: '🤝' };
});
defAction({
  id: 'biz_loan', cat: 'company', target: 'company', label: 'Business loan', emoji: '🏦',
  sub: cosub((s, co) => (co.debt ? 'Owes ' + fmtMoney(co.debt) : 'No debt')),
  when: manageable,
  run: (s, id) => {
    const co = company(s, id);
    const amts = [50000, 250000, 1000000, 10000000].map((v) => price(s, v));
    popup(s, { emoji: '🏦', title: 'Business loan', text: `9% interest, repaid over about 5 years from company cash.${co.val < price(s, 2000000) ? ' At this size, the bank wants your personal guarantee.' : ''}`, handler: 'bizLoan', ctx: { co: id }, choices: amts.map((a) => ({ label: fmtMoney(a), value: a })).concat([{ label: 'Never mind', value: 0 }]) });
  },
});
onChoice('bizLoan', (s, ctx, amt) => {
  const co = company(s, ctx.co);
  if (!amt || !co) return;
  if (bump(s, 'bizloan_' + ctx.co) > 2) return { text: 'The bank wants to see a year of results first.', nolog: true };
  const rev = co.last ? co.last.revenue : 0;
  const odds = clamp(0.15 + (rev + co.val * 0.3) / (amt * 2.5) - co.debt / (amt * 4) + (co.lossYears ? -0.15 : 0.1), 0.02, 0.92);
  if (!chance(odds)) return { text: `The bank declined ${co.name}'s ${fmtMoney(amt)} loan.`, tone: 'bad', emoji: '🏦' };
  co.debt += amt;
  co.cash += amt;
  if (co.val < price(s, 2000000)) co.guaranteed = (co.guaranteed || 0) + amt;
  return { text: `${co.name} borrowed ${fmtMoney(amt)}.`, emoji: '🏦' };
});
defAction({
  id: 'biz_dividend', cat: 'company', target: 'company', emoji: '💸',
  label: (s, id) => (company(s, id).public ? 'Pay a dividend' : 'Take money out of the company'),
  sub: cosub((s, co) => `Company cash: ${fmtMoney(co.cash)} · you own ${pctStr(co.equity)}`),
  when: (s, id) => manageable(s, id) && company(s, id).cash > 0,
  run: (s, id) => {
    const co = company(s, id);
    popup(s, {
      emoji: '💸', title: co.public ? 'Dividend' : 'Owner distribution', text: `Owners are paid in proportion to their stake. You get ${pctStr(co.equity)}, taxed at 15%.`, handler: 'bizDividend', ctx: { co: id },
      choices: [0.1, 0.25, 0.5].map((f) => ({ label: `${Math.round(f * 100)}% of company cash`, value: f, sub: `${fmtMoney(co.cash * f)} total · ${fmtMoney(co.cash * f * co.equity * 0.85)} to you` })).concat([{ label: 'Never mind', value: 0 }]),
    });
  },
});
onChoice('bizDividend', (s, ctx, f) => {
  const co = company(s, ctx.co);
  if (!f || !co || co.cash <= 0) return;
  const total = Math.round(co.cash * f);
  const mine = Math.round(total * co.equity * 0.85);
  co.cash -= total;
  M(s).money += mine;
  if (co.public) co.sent = clamp(co.sent * 1.02, 0.3, 3);
  tally(s, 'dividends', mine);
  return { text: `${co.name} paid out ${fmtMoney(total)}. Your share after tax: ${fmtMoney(mine)}.`, tone: 'good', emoji: '💸' };
});
// "Quantum Pixel Labs" -> QPL, "Bytewise" -> BYTE.
function makeTicker(name) {
  const words = name.replace(/[^A-Za-z ]/g, ' ').split(/\s+/).filter((w) => w && !/^(the|and|of|co|inc)$/i.test(w));
  const initials = words.map((w) => w[0]).join('');
  const t = initials.length >= 3 ? initials.slice(0, 4) : (words[0] || 'CO').slice(0, 4 - Math.max(0, initials.length - 1)) + initials.slice(1);
  return t.toUpperCase().padEnd(3, 'X');
}
function ipoReady(s, co) {
  return !co.public && co.years >= 3 && ((co.last && co.last.revenue >= price(s, 20e6)) || co.val >= price(s, 500e6));
}
defAction({
  id: 'biz_ipo', cat: 'company', target: 'company', label: 'Go public (IPO)', emoji: '🔔',
  sub: cosub((s, co) => (ipoReady(s, co) ? 'Ready to list on the stock exchange!' : `Needs 3+ years and ${fmtMoneyShort(price(s, 20e6))} revenue (or a ${fmtMoneyShort(price(s, 500e6))} valuation)`)),
  when: (s, id) => manageable(s, id) && !company(s, id).public,
  run: (s, id) => {
    const co = company(s, id);
    if (!ipoReady(s, co)) return { text: `The bankers say ${co.name} isn't big enough to go public yet. They want 3+ years in business and ${fmtMoney(price(s, 20e6))} in yearly revenue, or a ${fmtMoney(price(s, 500e6))} valuation.`, nolog: true };
    popup(s, {
      emoji: '🔔', title: 'Go public?', text: `Investment bankers value ${co.name} at about ${fmtMoney(co.val)}. You'd sell 25% of the company to the public, raising roughly ${fmtMoney(co.val * 0.25 * 0.93)}. Your stake drops from ${pctStr(co.equity)} to ${pctStr(co.equity * 0.75)}, but it becomes shares you can sell.`, handler: 'bizIPO', ctx: { co: id },
      choices: [{ label: '🔔 Ring the opening bell', value: true }, { label: 'Not yet', value: false }],
    });
  },
});
onChoice('bizIPO', (s, ctx, yes) => {
  const co = company(s, ctx.co);
  if (!yes || !co || co.public) return;
  const pop = clamp(gauss(1.1, 0.25), 0.6, 2);
  const mcap = co.val * pop;
  const raised = Math.round(mcap * 0.25 * 0.93);
  dilute(co, 0.25);
  co.float += 0.25;
  co.cash += raised;
  co.public = true;
  co.shares = 100e6;
  co.sent = pop;
  co.price = Math.max(0.01, Math.round((co.val * co.sent / co.shares) * 100) / 100);
  co.ticker = makeTicker(co.name);
  tally(s, 'ipos');
  add(s, { happy: 15, fame: 6 });
  const move = Math.round(Math.abs(pop - 1) * 100);
  return { text: `${co.name} is now public as ${co.ticker}! Shares opened at ${sharePrice(co.price)}, ${move === 0 ? 'right at' : move + '% ' + (pop >= 1 ? 'above' : 'below')} the bankers' price. The company raised ${fmtMoney(raised)}. Your stake is worth ${fmtMoney(coStakeValue(s, co))}.`, tone: 'good', emoji: '🔔', title: 'IPO day' };
});
defAction({
  id: 'biz_sellshares', cat: 'company', target: 'company', label: 'Sell some of your shares', emoji: '📤',
  sub: cosub((s, co) => `Your ${pctStr(co.equity)} is worth ${fmtMoneyShort(coStakeValue(s, co))}`),
  when: (s, id) => { const co = company(s, id); return !!co && co.public && co.equity > 0 && free(s) && A(s) >= 18; },
  run: (s, id) => {
    const co = company(s, id);
    popup(s, {
      emoji: '📤', title: 'Sell ' + co.ticker + ' shares', text: `Shares trade at ${sharePrice(co.price)}. Capital gains are taxed at 15%.`, handler: 'bizSellShares', ctx: { co: id },
      choices: [0.1, 0.25, 0.5, 1].map((f) => ({ label: f === 1 ? 'Sell my entire stake' : `Sell ${Math.round(f * 100)}% of my shares`, value: f, sub: fmtMoney(coStakeValue(s, co) * f * 0.97 * 0.85) + ' after tax', tone: f === 1 ? 'bad' : '' })).concat([{ label: 'Never mind', value: 0 }]),
    });
  },
});
onChoice('bizSellShares', (s, ctx, f) => {
  const co = company(s, ctx.co);
  if (!f || !co) return;
  const proceeds = Math.round(coStakeValue(s, co) * f * 0.97 * 0.85);
  const sold = co.equity * f;
  co.equity -= sold;
  co.float += sold;
  co.sent = clamp(co.sent * (1 - 0.06 * f), 0.3, 3);
  M(s).money += proceeds;
  tally(s, 'sharesSold', proceeds);
  if (co.equity < 0.0005) {
    co.closed = true;
    tally(s, 'exits');
    tally(s, 'exitValue', proceeds);
    return { text: `You sold all of your ${co.ticker} shares for ${fmtMoney(proceeds)} after tax and walked away from ${co.name}.`, tone: 'good', emoji: '📤' };
  }
  return { text: `You sold ${pctStr(sold)} of ${co.name} for ${fmtMoney(proceeds)} after tax. You still own ${pctStr(co.equity)}.`, emoji: '📤' };
});
defAction({
  id: 'biz_sell', cat: 'company', target: 'company', label: 'Find a buyer', emoji: '🤑', desc: 'Sell the whole company.',
  when: (s, id) => { const co = company(s, id); return manageable(s, id) && (co.equity >= 0.5 || co.public); },
  run: (s, id) => {
    const co = company(s, id);
    if (bump(s, 'sell_' + id) > 1) return { text: 'No new buyers this year.', nolog: true };
    if (!chance(0.35 + co.rep / 200 + (co.lossYears ? -0.15 : 0.1))) return { text: `Nobody wants to buy ${co.name} right now.`, emoji: '🤑' };
    sellOffer(s, co, co.public ? marketCap(co) * randFloat(1.15, 1.5) : co.val * randFloat(0.75, 1.4));
  },
});
// The buyer is a bigger rival in your industry when there is one (37-market.js).
function sellOffer(s, co, offer) {
  offer = nicePrice(offer);
  const rival = industryRivals(s, co.ind).find((f) => firmWorth(f) > offer * 1.5);
  const buyer = rival ? rival.name : pick(BUYER_NAMES);
  popup(s, {
    emoji: '🤑', title: 'Buyout offer', text: `${buyer}${rival ? ', your rival,' : ''} offers ${fmtMoney(offer)} for ${co.name}. Your ${pctStr(co.equity)} would come to about ${fmtMoney(offer * co.equity * 0.85)} after tax.`, handler: 'bizSale', ctx: { co: co.id, offer, buyer, firm: rival ? rival.id : null },
    choices: [{ label: 'Accept', value: 'yes' }, { label: 'Hold out for more', value: 'counter' }, { label: 'Decline', value: 'no' }],
  });
}
onChoice('bizSale', (s, ctx, v) => {
  const co = company(s, ctx.co);
  if (!co || v === 'no') return v === 'no' && co ? `You turned down ${ctx.buyer}.` : undefined;
  let offer = ctx.offer;
  if (v === 'counter') {
    if (!chance(0.45 + skill(s, 'business') / 400)) return { text: `${ctx.buyer} walked away from the deal.`, tone: 'bad' };
    offer = nicePrice(offer * randFloat(1.1, 1.25));
  }
  const mine = Math.round(offer * co.equity * 0.85);
  M(s).money += mine;
  co.closed = true;
  const rival = firmById(s, ctx.firm);
  if (rival) rival.rev += co.last ? co.last.revenue : 0;
  tally(s, 'exits');
  tally(s, 'exitValue', mine);
  add(s, { happy: 12 });
  return { text: `You sold ${co.name} to ${ctx.buyer} for ${fmtMoney(offer)}. Your share after tax: ${fmtMoney(mine)}. 🥂`, tone: 'good', emoji: '🤑', title: 'Sold!' };
});
function liquidate(s, co) {
  const salvage = Math.round(co.locations * price(s, indOf(co).locBuild) * 0.25);
  const net = co.cash - co.debt + salvage;
  let text = '';
  if (net > 0) {
    const mine = Math.round(net * co.equity);
    M(s).money += mine;
    text = ` After paying its debts, your share came to ${fmtMoney(mine)}.`;
  } else {
    const owed = Math.min(-net, co.guaranteed || 0);
    if (owed > 0) {
      addLoan(s, { kind: 'personal', name: 'Debt from ' + co.name, amount: owed, rate: 0.1, years: 7 });
      text = ` You personally guaranteed ${fmtMoney(owed)} of its debts, and now you owe it.`;
    }
  }
  co.closed = true;
  webFact(s, 'biz_failed', { co: co.id, you: co.ceo === 'you', owed: net < 0 ? Math.min(-net, co.guaranteed || 0) : 0 });
  return text;
}
defAction({
  id: 'biz_close', cat: 'company', target: 'company', label: 'Shut it down', emoji: '🚫',
  when: (s, id) => { const co = company(s, id); return manageable(s, id) && (co.equity >= 0.5 || co.years < 2); },
  run: (s, id) => {
    const co = company(s, id);
    popup(s, { emoji: '🚫', title: 'Close ' + co.name + '?', text: 'Everyone is let go and anything left after debts goes to the owners.', handler: 'bizClose', ctx: { co: id }, choices: [{ label: 'Close it for good', value: true, tone: 'bad' }, { label: 'Keep going', value: false }] });
  },
});
onChoice('bizClose', (s, ctx, yes) => {
  const co = company(s, ctx.co);
  if (!yes || !co) return;
  const staff = headcount(co);
  const text = liquidate(s, co);
  if (staff >= 10) add(s, { karma: -2 });
  add(s, { happy: -6 });
  return { text: `You closed ${co.name}.${text}`, emoji: '🚫' };
});
// With a majority stake (a company you bought, or one you handed to a pro) you just take over.
defAction({
  id: 'biz_reclaim', cat: 'company', target: 'company', emoji: '🥊',
  label: (s, id) => (company(s, id).equity >= 0.5 ? 'Take over as CEO' : 'Fight to get your CEO job back'),
  when: (s, id) => { const co = company(s, id); return !!co && co.ceo === 'hired' && co.equity >= 0.3 && free(s) && A(s) >= 18; },
  run: (s, id) => {
    const co = company(s, id);
    if (co.equity >= 0.5) { co.ceo = 'you'; return { text: `You own most of ${co.name}, so you took over as CEO. ${co.ceoName} cleared out their desk.`, tone: 'good' }; }
    if (bump(s, 'reclaim_' + id) > 1) return { text: 'The board meets once a year.', nolog: true };
    if (chance(clamp(co.equity * 0.8 + skill(s, 'business') / 300 + skill(s, 'charisma') / 400, 0.05, 0.9))) {
      co.ceo = 'you';
      add(s, { happy: 10 });
      return { text: `You won over the board. You're CEO of ${co.name} again.`, tone: 'good' };
    }
    return { text: `The board sided with ${co.ceoName}.`, tone: 'bad' };
  },
});
