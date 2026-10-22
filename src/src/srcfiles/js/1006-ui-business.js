/* =====================================================================
 * 1006-ui-business.js — your businesses: the section on the Work sheet and
 * the full company sheet (numbers, team, products, owners, history).
 * ===================================================================== */

function bizSection() {
  const list = companies(G).filter((c) => !c.closed);
  const start = actionRows('business');
  if (!list.length && !start) return '';
  const rows = list.map((co) => {
    const I = indOf(co);
    const sub = `${I.name} · ${co.public ? `${co.ticker} ${sharePrice(co.price)}` : 'worth ' + fmtMoneyShort(co.val)} · ${co.last ? (co.last.profit >= 0 ? 'profit ' : 'loss ') + fmtMoneyShort(Math.abs(co.last.profit)) : 'just opened'}`;
    return itemRow({ a: 'sheet', ds: { k: 'company', arg: co.id }, ico: I.emoji, t: esc(co.name) + (co.ceo !== 'you' ? ` <span class="faint">· ${co.ceo === 'trustee' ? 'in trust' : 'run by ' + esc(co.ceoName)}</span>` : ''), s: esc(sub), chev: true });
  }).join('');
  return `<div class="section-title">Your businesses</div><div class="list">${rows}${start}</div>`;
}

SHEETS.company = (id) => {
  const co = company(G, id);
  if (!co) return null;
  const I = indOf(co);
  const f = bizForecast(G, co);
  const last = co.last;
  const t = co.team;
  const ceoLine = co.ceo === 'you' ? 'CEO: you' : co.ceo === 'trustee' ? `Trustee: ${esc(co.ceoName)} (until you're 18)` : `CEO: ${esc(co.ceoName)}`;
  const warnings = [];
  if (f.idle) warnings.push(`⚠️ ${f.idle} staff have no room to work. Open another ${I.place} or lay some off.`);
  if (f.staff >= 12 && !t.manager.n) warnings.push('⚠️ No managers. Efficiency and morale are suffering.');
  if (co.cash < 0) warnings.push('⚠️ The company is overdrawn and paying 12% interest. If it sinks too far, it goes bankrupt.');
  if (co.ceo === 'you' && !free(G)) warnings.push('⚠️ You can’t manage the company from where you are right now.');
  if (co.equity < 0.5 && co.ceo === 'you') warnings.push('⚠️ Investors own most of the company. Two straight years of losses and the board may replace you.');
  const np = newestProduct(co);
  if (np && freshness(G, co, np) < 0.65) warnings.push(`⚠️ Your newest ${I.product} is ${G.year - np.year} years old and customers are losing interest. Launch a new one.`);
  const rev = last ? last.revenue : f.revenue;
  if (rev > 0 && f.mkt + f.rnd > rev * 0.15) warnings.push(`⚠️ Marketing and R&D cost ${Math.round(((f.mkt + f.rnd) / rev) * 100)}% of revenue. Most businesses spend under 15%.`);
  if (f.profit < 0 && co.ceo === 'you') warnings.push(`⚠️ On track to lose about ${fmtMoney(-f.profit)} this year.${f.idle ? '' : headcount(co) < capacity(co) ? ' Hiring more staff (if each one pays for itself), better products or lower costs can turn it around.' : ' Better products, a stronger reputation or lower costs can turn it around.'}`);

  let html = `<div class="card p-card">
    <div class="avatar">${emo(I.emoji, 56)}</div>
    <div class="p-name">${esc(co.name)}</div>
    <div class="p-meta">${esc(I.name)} · founded ${co.founded} · ${nOf(co.locations, I.place)}</div>
    <div class="p-meta">${ceoLine}${co.auto ? ' · 🤖 autopilot hiring' : ''}</div>
    ${co.public ? `<div class="chips" style="justify-content:center;margin-top:6px"><span class="chip on">📈 ${esc(co.ticker)} ${sharePrice(co.price)}</span><span class="chip">Market cap ${fmtMoneyShort(marketCap(co))}</span></div>` : ''}
    <div class="mini-stats">${statLine('🌟', co.rep, 'accent')}${statLine('💡', effQuality(G, co), 'accent')}${statLine('🙂', avgMorale(co))}${statLine('⚙️', clamp(f.eff * 80, 0, 100), 'accent')}</div>
    <div class="note" style="text-align:center">🌟 reputation · 💡 product quality · 🙂 morale · ⚙️ efficiency</div>
  </div>`;
  if (warnings.length) html += `<div class="note bad">${warnings.join('<br>')}</div>`;
  html += `<div class="section-title">Numbers</div><div class="card">
    ${kvRow('Company cash', `<span class="${co.cash < 0 ? 'bad' : 'good'}">${fmtMoney(co.cash)}</span>`)}
    ${co.debt ? kvRow('Debt', `<span class="bad">${fmtMoney(co.debt)}</span>${co.guaranteed ? ' (you guaranteed ' + fmtMoneyShort(co.guaranteed) + ')' : ''}`) : ''}
    ${kvRow(co.public ? 'Market cap' : 'Valuation', fmtMoney(coWorth(co)))}
    ${kvRow('Your stake', `${pctStr(co.equity)} · ${fmtMoney(coStakeValue(G, co))}`)}
    ${kvRow('Staff', `${headcount(co)} · room for ${capacity(co)} on the floor`)}
    ${co.franchise ? kvRow('Franchising', `${nOf(co.franchise.outlets, 'franchised ' + I.place, 'franchised ' + pluralize(I.place))} · ${Math.round(co.franchise.fee * 100)}% royalty`) : ''}
    ${last ? kvRow(`Revenue (${last.year})`, fmtMoney(last.revenue)) : ''}
    ${last ? kvRow(`Profit (${last.year})`, `<span class="${last.profit >= 0 ? 'good' : 'bad'}">${fmtMoney(last.profit)}</span>`) : ''}
    ${kvRow('This year, projected', `${fmtMoneyShort(f.revenue)} revenue · <span class="${f.profit >= 0 ? 'good' : 'bad'}">${fmtMoneyShort(f.profit)}</span> before tax`)}
  </div>`;
  html += casinoSection(co); // 1022-ui-house.js
  const acts = actionRows('company', id);
  html += `<div class="section-title">Run the company</div>${acts ? listOf(acts) : '<div class="note">You have no say in day-to-day decisions right now.</div>'}`;
  if (godOn()) html += `<div class="section-title">God Mode</div><div class="chips">${[100000, 1000000, 100000000].map((v) => `<button class="chip" data-a="sbCoCash" data-id="${co.id}" data-v="${v}">+${fmtMoneyShort(v)} company cash</button>`).join('')}<button class="chip" data-a="sbCoRep" data-id="${co.id}">Max reputation</button></div>`;
  html += `<div class="section-title">Team</div>${listOf(BIZ_ROLE_IDS.map((r) => {
    const g = t[r];
    return itemRow({ ico: BIZ_ROLES[r].emoji, t: `${esc(roleTitle(co, r, 2))} <span class="faint">× ${g.n}</span>`, s: g.n ? `Skill ${Math.round(g.skill)} · morale ${Math.round(g.morale)}% · ${fmtMoneyShort(g.pay)}/yr each` : esc(BIZ_ROLES[r].desc), cls: g.n ? '' : 'disabled' });
  }).join(''))}`;
  html += `<div class="section-title">${esc(pluralize(cap(I.product)))}</div>${listOf(co.products.slice().sort((a, b) => b.year - a.year).map((p) => itemRow({
    a: canManage(G, co) ? 'bizProduct' : null, ds: { co: co.id, p: p.id }, ico: p.q >= 70 ? '🔥' : p.q >= 45 ? '💡' : '🧊',
    t: '“' + esc(p.name) + '”', s: `Quality ${p.q} · launched ${p.year} · ${Math.round(freshness(G, co, p) * 100)}% fresh`, chev: canManage(G, co),
  })).join(''), 'No products.')}`;
  html += competitionSection(co);
  html += `<div class="section-title">Owners</div><div class="card">${kvRow('You', pctStr(co.equity))}${co.investors.filter((i) => i.stake > 0.0005).map((i) => kvRow(esc(i.name), pctStr(i.stake))).join('')}${co.float ? kvRow('Public shareholders', pctStr(co.float)) : ''}</div>`;
  if (last) {
    html += `<div class="section-title">Last year (${last.year})</div><div class="card">
      ${kvRow('Revenue', `<span class="good">+${fmtMoney(last.revenue)}</span>`)}
      ${last.fees ? kvRow('Franchise royalties', `<span class="good">+${fmtMoney(last.fees)}</span>`) : ''}
      ${last.whales ? kvRow('High-limit room', `<span class="${last.whales > 0 ? 'good' : 'bad'}">${last.whales > 0 ? '+' : '-'}${fmtMoney(Math.abs(last.whales))}</span>`) : ''}
      ${[['Goods & operating costs', last.cogs], ['Salaries', last.salaries], ['Rent & overhead', last.rent], ['Marketing', last.mkt], ['R&D', last.rnd], ['Franchise support', last.support], ['Surveillance & VIP room', last.extra], ['Cheats, fines & the skim', last.special], ['Your salary', last.draw], ['Interest', last.interest], ['Taxes', last.tax], ['Loan repayment', last.principal]].filter(([, v]) => v).map(([k, v]) => kvRow(k, `<span class="bad">-${fmtMoney(v)}</span>`)).join('')}
      ${kvRow('<b>Net profit</b>', `<span class="${last.profit >= 0 ? 'good' : 'bad'}">${fmtMoney(last.profit)}</span>`)}
    </div>`;
  }
  if (co.hist.length > 1) {
    html += `<div class="section-title">History</div><div class="card">${co.hist.slice(-10).reverse().map((h) => kvRow(String(h.y), `${fmtMoneyShort(h.r)} rev · <span class="${h.p >= 0 ? 'good' : 'bad'}">${fmtMoneyShort(h.p)}</span> · worth ${fmtMoneyShort(h.v)}`)).join('')}</div>`;
  }
  return { title: co.name, html };
};

// You and your named rivals (37-market.js), ranked by revenue.
function competitionSection(co) {
  const rivals = industryRivals(G, co.ind);
  if (!rivals.length) return '';
  const mine = co.last ? co.last.revenue : 0;
  const rows = rivals.map((f) => ({ f, rev: f.rev })).concat([{ f: null, rev: mine }]).sort((a, b) => b.rev - a.rev);
  const total = sum(rows, (r) => r.rev);
  const canTrade = free(G) && A(G) >= 18;
  const list = rows.map((r, i) => {
    const medal = ['🥇', '🥈', '🥉'][i] || '🏅';
    if (!r.f) return itemRow({ ico: medal, t: `<b>${esc(co.name)}</b> <span class="faint">· you</span>`, s: `Revenue ${fmtMoneyShort(mine)} · reputation ${Math.round(co.rep)} · ${total ? Math.round((mine / total) * 100) : 0}% of the market`, cls: 'good' });
    const f = r.f;
    return itemRow({
      a: f.ticker && canTrade ? 'rivalStock' : null, ds: { id: f.id }, ico: medal, chev: !!(f.ticker && canTrade),
      t: esc(f.name) + (f.ticker ? ` <span class="faint">· ${esc(f.ticker)} ${sharePrice(f.price)}</span>` : ''),
      s: `Revenue ${fmtMoneyShort(f.rev)} · reputation ${f.rep} · ${total ? Math.round((f.rev / total) * 100) : 0}% of the market`,
    });
  }).join('');
  return `<div class="section-title">Competition</div>${listOf(list)}${co.last ? '' : '<div class="note">Your share shows up after your first year.</div>'}`;
}
CLICK.rivalStock = (el, ds) => uiRun(() => stockTicket(G, ds.id), { emoji: '💹', title: '' });
CLICK.bizProduct = (el, ds) => uiRun(() => {
  const co = company(G, ds.co);
  const p = co && co.products.find((x) => x.id === ds.p);
  if (!p) return;
  popup(G, {
    emoji: '💡', title: '“' + p.name + '”', text: `Quality ${p.q}, launched ${p.year}.`, handler: 'bizProductAct', ctx: { co: co.id, p: p.id },
    choices: [{ label: 'Refresh it', value: 'refresh', sub: fmtMoney(bizCost(G, co, 50000)) + ' · quality up, looks newer', disabled: co.cash < bizCost(G, co, 50000) }, { label: 'Discontinue it', value: 'drop', tone: 'bad' }, { label: 'Never mind', value: null }],
  });
}, { emoji: '💡', title: '' });
CLICK.sbCoCash = (el, ds) => { const co = company(G, ds.id); if (co) co.cash += Number(ds.v); refresh(); toast('Company cash added.'); };
CLICK.sbCoRep = (el, ds) => { const co = company(G, ds.id); if (co) co.rep = 100; refresh(); toast('Reputation maxed.'); };
