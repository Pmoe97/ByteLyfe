/* =====================================================================
 * 16-money.js — the yearly budget, loans, investments, lifestyle,
 * inheritance, bankruptcy.
 *
 * Adults who live on their own pay living costs set by their lifestyle and
 * their city's cost of living, plus rent / upkeep / loan payments. Kids and anyone living with their
 * parents pay nothing. M(s).lastFinance keeps last year's breakdown.
 * ===================================================================== */

const LIFESTYLES = {
  frugal: { name: 'Frugal', emoji: '🥫', cost: 11000, happy: -3, desc: 'Rice, beans and coupons.' },
  normal: { name: 'Comfortable', emoji: '🛋️', cost: 22000, happy: 0, desc: 'A normal, comfortable life.' },
  lavish: { name: 'Lavish', emoji: '🥂', cost: 65000, happy: 5, desc: 'Nice dinners, nicer clothes.' },
  luxury: { name: 'Over the top', emoji: '💎', cost: 250000, happy: 9, desc: 'Champagne for breakfast.' },
};

function amortize(principal, rate, years) {
  if (principal <= 0) return 0;
  if (!rate) return principal / years;
  return (principal * rate) / (1 - Math.pow(1 + rate, -years));
}
function addLoan(s, o) {
  const l = { id: uid(s, 'l'), kind: o.kind, name: o.name, balance: Math.round(o.amount), rate: o.rate, years: o.years, payment: Math.round(amortize(o.amount, o.rate, o.years)), assetId: o.assetId || null, missed: 0 };
  M(s).loans.push(l);
  return l;
}
function addStudentLoan(s, amt) {
  let l = M(s).loans.find((x) => x.kind === 'student');
  if (!l) l = addLoan(s, { kind: 'student', name: 'Student loans', amount: 0, rate: 0.055, years: 10 });
  l.balance += Math.round(amt);
  l.payment = Math.round(amortize(l.balance, l.rate, 10));
}
function debtTotal(s) { return sum(M(s).loans, (l) => l.balance); }
function investTotal(s) { return sum(INVEST_IDS, (k) => M(s).invest[k] || 0); }
function assetsValue(s) { return sum(M(s).assets, (a) => a.value || 0); }
function netWorth(s) { return M(s).money + M(s).trust + investTotal(s) + stocksValue(s) + fxSaved(s) + assetsValue(s) + collectionValue(s) + (M(s).uw ? M(s).uw.book : 0) + companiesValue(s) - debtTotal(s); }
function livesAlone(s) { return A(s) >= 18 && M(s).housing.type !== 'parents' && !inPrison(s); }
function dependents(s) { return myChildren(s).filter((c) => ageOf(s, c) < 18 && !flagOf(c, 'awayFromYou')); }
function flagOf(p, k) { return p.flags && p.flags[k]; }

function financeTick(s) {
  const m = M(s), age = A(s);
  const inc = [], exp = [];
  const tax = country(s).tax;
  if (!inPrison(s)) {
    if (m.career) inc.push(['Salary (after tax)', Math.round(m.career.salary * (1 - tax))]);
    if (m.ptJob) inc.push(['Part-time pay', Math.round(m.ptJob.pay * (1 - tax * 0.5))]);
  }
  for (const [label, amt] of m.bizIncome || []) inc.push([label + ' (after tax)', Math.round(amt * (1 - tax))]);
  m.bizIncome = [];
  if (m.retired && m.retired.pension) inc.push(['Pension', m.retired.pension]);
  if (age >= 65) inc.push(['State pension', price(s, 14000)]);
  if (m.socials && m.socials.followers >= 50000) {
    const deal = price(s, Math.round(Math.pow(m.socials.followers, 0.92) * 0.12));
    inc.push(['Sponsorships', deal]);
  }
  // Rent from your tenants (49-cities.js): late payers, managers' fees and all.
  for (const a of m.assets) if (a.kind === 'house') { const r = rentRoll(s, a); if (r) inc.push(r); }

  if (livesAlone(s) && m.housing.type !== 'homeless') {
    if (m.money < 0 && m.lifestyle !== 'frugal') { m.lifestyle = 'frugal'; log(s, '🥫 Money is tight. You cut back to a frugal lifestyle.', 'bad'); }
    const ls = LIFESTYLES[m.lifestyle] || LIFESTYLES.normal;
    exp.push([ls.name + ' living costs', Math.round(livingCost(s, ls.cost) * (trait(s, 'frugal') ? 0.8 : 1))]);
  }
  const rent = rentToPay(s);
  if (rent) exp.push(['Rent', rent]);
  for (const a of m.assets) {
    const up = assetUpkeep(s, a);
    if (up) exp.push(['Upkeep: ' + a.name, up]);
  }
  const petCost = sum(Object.values(s.pets).filter((p) => p.alive), (p) => price(s, PET_SPECIES[p.species].upkeep));
  if (petCost && age >= 18) exp.push(['Pet care', petCost]);
  const deps = dependents(s);
  if (deps.length && !inPrison(s)) exp.push([`Raising ${nOf(deps.length, 'kid')}`, price(s, 7000) * deps.length]);
  for (const id in m.addictions) {
    const sev = m.addictions[id];
    if (sev >= 20 && ADDICTIONS[id].money) exp.push([ADDICTIONS[id].name + ' habit', Math.round(price(s, ADDICTIONS[id].money) * sev / 100)]);
  }
  // Loans: interest accrues; student loans wait until you leave school.
  for (const l of m.loans.slice()) {
    const interest = Math.round(l.balance * l.rate);
    if (l.kind === 'student' && inSchool(s)) { l.balance += interest; continue; }
    const due = Math.min(l.balance + interest, Math.max(l.payment, 1));
    l.balance = l.balance + interest - due;
    exp.push([l.name, due]);
    if (l.balance <= 0) {
      m.loans = m.loans.filter((x) => x !== l);
      log(s, `🎉 You paid off your ${l.name.toLowerCase()}.`, 'good');
    }
  }
  if (m.money < 0) exp.push(['Interest on debt', Math.round(-m.money * 0.12)]);

  // Investments move with the market. The index fund tracks this year's market
  // return (37-market.js), and hand-picked stocks ride it with extra risk.
  let invDelta = 0;
  for (const k of INVEST_IDS) {
    const v = m.invest[k] || 0;
    if (!v) continue;
    const I = INVESTMENTS[k];
    let r = Math.max(-0.9, k === 'index' ? marketReturn(s) + gauss(0, 0.02) : k === 'stocks' ? marketReturn(s) * 1.1 + gauss(0.01, 0.22) : gauss(I.mean, I.sd));
    if (k === 'crypto' && chance(0.06)) r = -randFloat(0.6, 0.95);
    const nv = Math.round(v * (1 + r));
    invDelta += nv - v;
    m.invest[k] = nv;
  }

  const totalIn = sum(inc, (x) => x[1]);
  const totalOut = sum(exp, (x) => x[1]);
  m.money = Math.round(m.money + totalIn - totalOut);
  m.lastFinance = { year: s.year, inc, exp, invest: invDelta };
  if (totalIn || totalOut) {
    log(s, `💰 Income ${fmtMoney(totalIn)}, expenses ${fmtMoney(totalOut)}.`, totalIn >= totalOut ? '' : 'bad');
  }
  if (Math.abs(invDelta) >= 1000) log(s, `${invDelta >= 0 ? '📈' : '📉'} Your investments ${invDelta >= 0 ? 'gained' : 'lost'} ${fmtMoney(Math.abs(invDelta))}.`, invDelta >= 0 ? 'good' : 'bad');

  // Can't make rent: eviction.
  if (m.housing.type === 'rent' && m.money < -m.housing.rent) {
    m.housing = { type: 'homeless', assetId: null, rent: 0, name: '' };
    announce(s, { emoji: '📦', title: 'Evicted', tone: 'bad', text: "You fell too far behind on rent and were evicted. You're homeless." });
    add(s, { happy: -15 });
  }
  // Hopeless debt: the creditors force you into bankruptcy.
  const income = totalIn || 1;
  if (m.money < -Math.max(price(s, 60000), income * 3)) {
    forcedBankruptcy(s);
  }
}

function forcedBankruptcy(s) {
  const m = M(s);
  for (const a of m.assets.slice()) removeAsset(s, a.id);
  m.loans = m.loans.filter((l) => l.kind === 'student');
  m.money = 0;
  for (const k of INVEST_IDS) m.invest[k] = 0;
  m.stocks = {};
  m.fxSave = {};
  if (m.housing.type === 'own') m.housing = { type: 'homeless', assetId: null, rent: 0, name: '' };
  flag(s, 'bankruptYear', s.year);
  tally(s, 'bankruptcies');
  add(s, { happy: -12 });
  announce(s, { emoji: '🧾', title: 'Bankrupt', tone: 'bad', text: 'Your debts got so far out of hand that your creditors forced you into bankruptcy. Your property was seized and sold.' });
}

/* ---- money actions ------------------------------------------------- */
function canBorrow(s) { return !(flag(s, 'bankruptYear') && s.year - flag(s, 'bankruptYear') < 7); }
defAction({
  id: 'bank_loan', cat: 'money', label: 'Take out a loan', emoji: '🏦', desc: 'Borrow money from the bank.',
  when: (s) => free(s) && A(s) >= 18,
  run: (s) => {
    if (!canBorrow(s)) return { text: 'No bank will lend to you after your bankruptcy.', nolog: true };
    const amts = [5000, 20000, 50000, 200000, 1000000].map((a) => price(s, a));
    popup(s, {
      emoji: '🏦', title: 'Personal loan', text: 'Loans are repaid over 5 years at about 11% interest.', handler: 'loan',
      choices: amts.map((a) => ({ label: fmtMoney(a), value: a })).concat([{ label: 'Never mind', value: 0 }]),
    });
  },
});
onChoice('loan', (s, ctx, amt) => {
  if (!amt) return;
  const income = (M(s).career ? M(s).career.salary : 0) + (M(s).ptJob ? M(s).ptJob.pay : 0);
  const payment = amortize(amt, 0.11, 5);
  const odds = clamp(0.2 + (income - payment * 3) / (payment * 6) + Math.max(0, netWorth(s)) / (amt * 2) - debtTotal(s) / (amt * 10), 0.02, 0.95);
  if (!chance(odds)) return { text: `The bank turned down your request for ${fmtMoney(amt)}.`, tone: 'bad' };
  addLoan(s, { kind: 'personal', name: 'Personal loan', amount: amt, rate: 0.11, years: 5 });
  add(s, { money: amt });
  return { text: `The bank approved your ${fmtMoney(amt)} loan.`, tone: 'good' };
});
function payOffLoan(s, loanId) {
  const l = M(s).loans.find((x) => x.id === loanId);
  if (!l) return;
  if (M(s).money < l.balance) return cantAfford(l.balance);
  M(s).money -= l.balance;
  M(s).loans = M(s).loans.filter((x) => x !== l);
  if (l.assetId) { const a = M(s).assets.find((x) => x.id === l.assetId); if (a) a.loanId = null; }
  add(s, { happy: 4 });
  return { text: `You paid off your ${l.name.toLowerCase()}.`, tone: 'good', emoji: '🎉' };
}
function investMoney(s, k, amt) {
  amt = Math.round(amt);
  if (amt <= 0) return;
  if (!pay(s, amt)) return cantAfford(amt);
  M(s).invest[k] = (M(s).invest[k] || 0) + amt;
  return { text: `You put ${fmtMoney(amt)} into ${INVESTMENTS[k].name.toLowerCase()}.`, emoji: INVESTMENTS[k].emoji };
}
function withdrawMoney(s, k, amt) {
  const have = M(s).invest[k] || 0;
  amt = Math.min(Math.round(amt), have);
  if (amt <= 0) return;
  M(s).invest[k] = have - amt;
  add(s, { money: amt });
  return { text: `You withdrew ${fmtMoney(amt)} from ${INVESTMENTS[k].name.toLowerCase()}.`, emoji: INVESTMENTS[k].emoji };
}
defAction({
  id: 'lifestyle', cat: 'money', label: 'Lifestyle', emoji: '🛋️', desc: 'How much you spend to live.',
  when: (s) => free(s) && livesAlone(s),
  sub: (s) => LIFESTYLES[M(s).lifestyle].name + ' · ' + fmtMoney(livingCost(s, LIFESTYLES[M(s).lifestyle].cost)) + '/yr',
  run: (s) => {
    popup(s, {
      emoji: '🛋️', title: 'Lifestyle', text: 'Your yearly living costs (rent and loans are extra).', handler: 'lifestyle',
      choices: Object.keys(LIFESTYLES).map((k) => ({ label: LIFESTYLES[k].emoji + ' ' + LIFESTYLES[k].name, value: k, sub: fmtMoney(livingCost(s, LIFESTYLES[k].cost)) + '/yr · ' + LIFESTYLES[k].desc })),
    });
  },
});
onChoice('lifestyle', (s, ctx, k) => { M(s).lifestyle = k; return { text: `You switched to a ${LIFESTYLES[k].name.toLowerCase()} lifestyle.`, quiet: true }; });
defAction({
  id: 'bankruptcy', cat: 'money', label: 'Declare bankruptcy', emoji: '🧾', desc: 'Wipe your debts. Lose your stuff.',
  when: (s) => free(s) && A(s) >= 18 && (debtTotal(s) - Math.min(0, M(s).money) > 0) && netWorth(s) < 0,
  run: (s) => {
    popup(s, {
      emoji: '🧾', title: 'Declare bankruptcy?', text: 'Your debts will be wiped, but your property will be sold and no one will lend to you for 7 years.', handler: 'bankrupt',
      choices: [{ label: 'Declare bankruptcy', value: true, tone: 'bad' }, { label: 'Never mind', value: false }],
    });
  },
});
onChoice('bankrupt', (s, ctx, yes) => {
  if (!yes) return;
  const m = M(s);
  for (const a of m.assets.slice()) removeAsset(s, a.id);
  m.loans = [];
  m.money = 0;
  for (const k of INVEST_IDS) m.invest[k] = 0;
  m.stocks = {};
  m.fxSave = {};
  if (m.housing.type === 'own') m.housing = { type: 'homeless', assetId: null, rent: 0, name: '' };
  flag(s, 'bankruptYear', s.year);
  tally(s, 'bankruptcies');
  add(s, { happy: -10 });
  return { text: 'You declared bankruptcy. A fresh start, of sorts.', tone: 'bad' };
});

// Money from a death in the family. Minors get it in trust until 18.
function inherit(s, amount, fromName) {
  amount = Math.round(amount);
  if (amount <= 0) return;
  if (A(s) < 18) {
    M(s).trust += amount;
    log(s, `💼 You inherited ${fmtMoney(amount)} from ${fromName}. It's held in trust until you turn 18.`, 'good');
  } else {
    M(s).money += amount;
    log(s, `💼 You inherited ${fmtMoney(amount)} from ${fromName}.`, 'good');
  }
  tally(s, 'inherited', amount);
}
