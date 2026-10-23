/* =====================================================================
 * 1002-ui-menus.js — Activities, Work/School, the job board, education,
 * Assets, Finances and single-asset sheets (the city, landlord and tenant
 * parts come from 1016-ui-cities.js).
 * ===================================================================== */

/* ---- activities ---------------------------------------------------- */
SHEETS.activities = () => {
  if (inPrison(G)) {
    return { title: 'Prison Life', html: `${prisonCard()}<div class="section-title">What will you do?</div>${listOf(actionRows('prison'))}<div class="section-title">Also available</div>${listOf(actionRows('health', undefined, (a) => a.id === 'doctor') + actionRows('mind', undefined, (a) => ['meditate', 'read'].includes(a.id)))}` };
  }
  const cats = ACT_CATS.filter((c) => c.id !== 'prison' && actionList(G, c.id).length);
  const tiles = cats.map((c, i) => {
    const n = actionList(G, c.id).length;
    const wide = i === cats.length - 1 && cats.length % 2 === 1;
    return `<button class="tile${wide ? ' wide' : ''}" data-a="sheet" data-k="actcat" data-arg="${c.id}"><span class="e" style="background:color-mix(in srgb, ${CAT_HUES[c.id] || 'var(--accent)'} 20%, var(--surface-2))">${CAT_ICONS[c.id] ? icon(CAT_ICONS[c.id], 30) : c.emoji}</span><span><span class="n">${esc(c.name)}</span><span class="c" style="display:block">${n} ${plural(n, 'option')}</span></span></button>`;
  }).join('');
  return { title: 'Activities', html: tiles ? `<p class="note" style="margin-top:-6px">What will ${esc(P(G).first)} do this year?</p><div class="tiles">${tiles}</div>` : `<div class="empty">You're too young for activities. Try aging up!</div>` };
};
SHEETS.actcat = (cat) => {
  const c = ACT_CATS.find((x) => x.id === cat);
  // Health & Looks opens with your look (and, for adults, your body).
  const look = cat === 'health' ? `<div class="list" style="margin-bottom:12px">${itemRow({ a: 'sheet', ds: { k: 'look' }, ico: avatarOf(P(G), 52), round: true, t: 'Your look', s: A(G) >= ADULT_AGE ? 'Style, body and what shapes it' : 'Hair, glasses and clothes', chev: true })}</div>` : '';
  const royal = cat === 'royal' && crown(G) ? royalCard() : '';
  const mob = cat === 'mob' ? underworldCard() : '';
  const courts = cat === 'court' ? courtCard() : '';
  const chaos = cat === 'super' ? chaosCard() : ''; // 1019-ui-chaos.js
  const gambling = cat === 'gamble' ? gambleCard() : ''; // 1021-ui-gambling.js
  const house = cat === 'turf' ? houseCard() : ''; // 1022-ui-house.js
  const home = cat === 'parents' ? homeCard() : cat === 'learn' ? lessonsCard() : ''; // 1023-ui-youth.js
  return { title: c ? c.name : 'Activities', html: look + royal + mob + courts + chaos + gambling + house + home + listOf(actionRows(cat), 'Nothing available right now.') };
};
// The Underworld opens with your standing: family, rank, heat and everything you run (39-underworld.js).
function underworldCard() {
  const u = M(G).uw;
  if (!u) return '<div class="note">Nobody in the underworld knows your name yet.</div>';
  const fam = myFamily(G), d = u.dealer, rows = [];
  if (fam) {
    rows.push(kvRow('Family', `${esc(cap(fam.name))}${fam.mine ? ' · yours' : ' · boss ' + esc(fam.boss)}`), kvRow('Rank', `${mobRank(G)}${u.made ? ' · made' : ''}${u.rat ? ' · 🐀 informant' : ''}`));
    rows.push(kvRow('Crew', nOf(u.crew, 'soldier')), kvRow('Turf', `${fam.mine ? u.turf : fam.turf}% of the city`));
  }
  if (u.rackets.length) rows.push(kvRow('Rackets', u.rackets.map((r) => `${esc(RACKETS[r.type].name)}${r.lvl > 1 ? ' ×' + r.lvl : ''}`).join(', ')));
  if (d) rows.push(kvRow('Drug game', `${DEALER_RANKS[d.rank].name}${d.cartel ? ' of ' + esc(d.cartel) : ''} · rep ${d.rep}`));
  if (u.hits) rows.push(kvRow('Contracts done', u.hits));
  if (u.book) rows.push(kvRow('Loan book', fmtMoney(u.book)));
  if (u.collection.length) rows.push(kvRow(u.museum ? esc(u.museum.name) : 'Collection', `${nOf(u.collection.length, 'piece')} · ${fmtMoney(collectionValue(G))}`));
  if (u.races) rows.push(kvRow('Street races won', u.races));
  const enemy = u.enemy && underworldOf(G).families[u.enemy];
  if (enemy) rows.push(kvRow('Wants you dead', esc(cap(enemy.name))));
  const rivals = familiesIn(G, P(G).country).filter((f) => !fam || f.id !== fam.id);
  return `<div class="card" style="margin-bottom:12px">
      ${fam ? `<div class="muted">Respect · ${u.respect}%</div>${bar(u.respect, 'accent')}` : ''}
      <div class="muted" style="margin-top:6px">Heat · ${u.heat}%${u.heat >= 30 ? ' · the police are watching' : ''}</div>${bar(u.heat, u.heat >= 60 ? 'low' : u.heat >= 30 ? 'mid' : '')}
      ${rows.join('')}
    </div>
    ${fam ? `<div class="section-title">Families in town</div><div class="card">${rivals.map((f) => kvRow(esc(cap(f.name)), `strength ${f.strength} · ${f.turf}% turf`)).join('')}</div>` : ''}
    <div class="section-title">What will you do?</div>`;
}
// Royal Life opens with your standing, the line of succession and the crown's history (38-royalty.js).
function royalCard() {
  const cr = crown(G), me = P(G), mon = G.people[cr.monarch], st = royalState(G);
  const reign = cr.reigns[cr.reigns.length - 1], pos = linePos(G);
  const line = successionLine(G).slice(0, 6);
  const past = cr.reigns.slice(0, -1).slice(-5).reverse();
  const styleOf = (r) => { const t = ROYAL_STYLES[cr.country].monarch; return `${r.g === 'm' ? t[0] : r.g === 'f' ? t[1] : 'Sovereign'} ${r.first}${r.num > 1 ? ' ' + roman(r.num) : ''}`; };
  return `<div class="card" style="margin-bottom:12px">
      <div class="row"><div class="ico">${emo('👑', 28)}</div><div class="grow"><b>${esc(royalName(G, me))}</b><div class="muted">${esc(houseName(G))} · ${esc(palaceName(G))}</div></div></div>
      ${isMonarch(G, me) ? kvRow('Reigning since', reign.from) : kvRow('Reigning', `${mon ? esc(royalName(G, mon)) : 'Nobody'} · since ${reign.from}`)}
      ${isMonarch(G, me) ? '' : kvRow('Your place in line', pos ? ordinal(pos) : 'Not in line')}
      <div class="muted" style="margin-top:6px">Public approval · ${st.approval}%</div>${bar(st.approval)}
    </div>
    <div class="section-title">Line of succession</div>${listOf(line.map((p, i) => itemRow({ ico: avatarOf(p, 40), round: true, t: `${i + 1}. ${esc(royalName(G, p))}${p.id === me.id ? ' <span class="faint">· you</span>' : ''}`, s: `${ageOf(G, p)} years old` })).join(''), 'Nobody is in line.')}
    ${past.length ? `<div class="section-title">Earlier monarchs</div><div class="card">${past.map((r) => kvRow(esc(styleOf(r)), `${r.from}–${r.to}`)).join('')}</div>` : ''}
    <div class="section-title">Royal life</div>`;
}

/* ---- work / school -------------------------------------------------- */
function prisonCard() {
  const pr = M(G).prison;
  return `<div class="card">
    <div class="row"><div class="ico">${icon('prison', 28)}</div><div class="grow"><b>${esc(pr.name)}</b><div class="muted">${pr.juvie ? 'Juvenile detention' : 'Prison'} · ${esc(CRIMES[pr.crime] ? CRIMES[pr.crime].verb : 'crime')}</div></div></div>
    ${kvRow('Time left', pr.total >= 99 ? 'Life' : nOf(pr.yearsLeft, 'year'))}
    ${kvRow('Time served', nOf(pr.served, 'year'))}
    ${pr.gang ? kvRow('Gang', esc(pr.gang)) : ''}
    <div class="muted" style="margin-top:6px">Behavior</div>${bar(pr.behavior)}
  </div>`;
}
SHEETS.work = () => {
  const m = M(G), a = A(G);
  let html = '';
  if (inPrison(G)) html += prisonCard() + `<div class="section-title">Prison life</div>` + listOf(actionRows('prison'));
  const cur = eduCur(G);
  if (cur) {
    const name = cur.kind === 'school' ? SCHOOL_STAGES[cur.stage].name : cur.kind === 'college' ? COLLEGES[cur.type].name : GRAD_PROGRAMS[cur.prog].name;
    const subject = cur.major ? (MAJORS[cur.major] ? MAJORS[cur.major].name : TRADES[cur.major] ? TRADES[cur.major].name : '') : '';
    html += `<div class="section-title">School</div><div class="card">
      <div class="row"><div class="ico">${icon(cur.kind === 'school' ? 'school' : 'gradcap', 28)}</div><div class="grow"><b>${esc(cur.name)}</b><div class="muted">${esc(name)}${subject ? ' · ' + esc(subject) : ''} · Year ${Math.min(cur.year, cur.years)} of ${cur.years}</div></div></div>
      <div class="muted" style="margin-top:8px">Grades</div>${bar(cur.grades)}
      ${cur.clique ? kvRow('Clique', emo(CLIQUES[cur.clique].emoji, 18) + ' ' + esc(CLIQUES[cur.clique].name)) : ''}
      ${cur.clubs && cur.clubs.length ? kvRow('Activities', cur.clubs.map((c) => emo(SCHOOL_CLUBS[c].emoji, 18) + ' ' + esc(SCHOOL_CLUBS[c].name)).join(', ')) : ''}
      ${cur.funding && cur.cost ? kvRow('Tuition', fmtMoney(cur.cost) + '/yr · ' + ({ parents: 'parents', scholarship: 'scholarship', loan: 'student loans', cash: 'you', free: 'free' }[cur.funding] || '')) : ''}
      ${cur.probation ? '<div class="note bad">⚠️ Academic probation</div>' : ''}
    </div>${schoolLifeHtml(cur)}<div class="section-title">What will you do?</div>${listOf(actionRows('school'))}`;
  }
  if (m.career) {
    const c = m.career, j = JOBS[c.id];
    html += `<div class="section-title">Career</div><div class="card">
      <div class="row"><div class="ico">${emo(j.emoji, 28)}</div><div class="grow"><b>${esc(careerTitle(G))}</b><div class="muted">${esc(c.employer || j.name)}</div></div></div>
      ${kvRow('Salary', fmtMoney(c.salary) + '/yr')}
      ${kvRow('Years here', c.years)}
      ${kvRow('Next rung', c.level < j.ladder.length - 1 ? esc(j.ladder[c.level + 1][0]) : 'Top of the ladder')}
      <div class="muted" style="margin-top:6px">${j.special === 'politics' ? 'Approval rating' : c.id === 'judge' ? 'Reputation on the bench' : 'Performance'}</div>${bar(c.perf)}
    </div>${listOf(actionRows('job'))}${showbizSection()}${sportsSection()}${courtSection()}`;
  }
  if (m.retired) html +=`<div class="section-title">Retirement</div><div class="card">${kvRow('Status', 'Retired')}${m.retired.pension ? kvRow('Pension', fmtMoney(m.retired.pension) + '/yr') : ''}</div>`;
  html += bizSection();
  if (!inPrison(G) && a >= 5) {
    html += `<div class="section-title">Find work</div><div class="list">`;
    if (canWorkFullTime(G)) {
      html += itemRow({ a: 'sheet', ds: { k: 'jobboard' }, ico: '📋', t: 'Job board', s: 'Full-time careers, plus fame, sports, military and politics', chev: true });
    } else if (a >= 16 && inSchool(G)) {
      html += itemRow({ ico: '📋', t: 'Job board', s: 'Full-time jobs open up when you finish school.', cls: 'disabled' });
    }
    html += actionRows('jobs') + `</div>`;
    if (a < 14) html += '<div class="note">Part-time jobs open up at 14 and full-time jobs at 16.</div>';
  }
  if (!inPrison(G) && !cur && a >= 16) {
    const canEnroll = hasHighSchool(G) && !m.career;
    const why = !hasHighSchool(G) ? 'Needs a high school diploma or GED' : m.career ? 'Quit your job to go back to school' : '';
    html += `<div class="section-title">Education</div><div class="list">
      ${['university', 'community', 'trade'].map((t) => itemRow({ a: canEnroll ? 'enroll' : null, ds: { t }, ico: COLLEGES[t].emoji, t: COLLEGES[t].name, s: why || `${COLLEGES[t].years} years · ${fmtMoney(tuition(G, COLLEGES[t].cost))}/yr`, cls: canEnroll ? '' : 'disabled', chev: canEnroll })).join('')}
      ${eduRank(G) >= 3 ? itemRow({ a: 'sheet', ds: { k: 'grad' }, ico: '🎓', t: 'Graduate school', s: 'Law, medicine, business, PhD...', chev: true }) : ''}
      ${actionRows('school')}
    </div>`;
  }
  const degrees = M(G).edu.degrees;
  if (degrees.length) html += `<div class="section-title">Your education</div><div class="list">${degrees.map((d) => itemRow({ ico: '📜', t: esc(degreeLabel(d)), s: `${d.year}${d.honors ? ' · with honors' : ''}` })).join('')}</div>`;
  if (m.jobHistory.length) html += `<div class="section-title">Past jobs</div><div class="list">${m.jobHistory.slice(-8).reverse().map((h) => itemRow({ ico: JOBS[h.id].emoji, t: esc(JOBS[h.id].ladder[h.level][0]), s: `${nOf(h.years, 'year')} · ended ${h.end} (${esc(h.reason)})` })).join('')}</div>`;
  if (!html) html = '<div class="empty">Nothing to do here yet. You are a little young for a career.</div>';
  return { title: inPrison(G) ? 'Prison' : cur ? 'School & Work' : 'Work', html };
};
CLICK.enroll = (el, ds) => uiRun(() => { if (!hasHighSchool(G) || M(G).career || inSchool(G)) return; openMajorPicker(G, ds.t); }, { emoji: COLLEGES[ds.t].emoji, title: COLLEGES[ds.t].name });

function salaryRange(id) {
  const lad = JOBS[id].ladder;
  const k = econ(G) * wageOf(G);
  return fmtMoneyShort(nicePrice(lad[0][1] * k)) + (lad.length > 1 ? '–' + fmtMoneyShort(nicePrice(lad[lad.length - 1][1] * k)) : '');
}
SHEETS.jobboard = () => {
  const board = jobBoard(G);
  const showAll = !UI.jbQualified;
  let html = `<div class="seg" style="margin-bottom:12px"><button class="${!showAll ? 'on' : ''}" data-a="jbFilter" data-v="1">I qualify</button><button class="${showAll ? 'on' : ''}" data-a="jbFilter" data-v="0">All careers</button></div>`;
  let any = false;
  for (const cat of Object.keys(JOB_CATS)) {
    const rows = board.filter((b) => JOBS[b.id].cat === cat && (showAll || !b.missing.length)).map((b) => {
      const j = JOBS[b.id];
      const ok = !b.missing.length;
      const status = !ok ? 'Needs: ' + b.missing.join(', ') : b.open ? (j.special ? { fame: 'Audition / submit work', sports: 'Try out', military: 'Enlist', politics: 'Run for office' }[j.special] : 'Hiring now') : 'Not hiring this year';
      return itemRow({ a: ok && b.open ? 'apply' : null, ds: { id: b.id }, ico: j.emoji, t: esc(j.ladder[0][0]) + ` <span class="faint">· ${esc(j.name)}</span>`, s: `${salaryRange(b.id)} · ${esc(status)}`, cls: ok && b.open ? '' : 'disabled', chev: ok && b.open });
    }).join('');
    if (!rows) continue;
    any = true;
    html += `<div class="section-title">${esc(JOB_CATS[cat])}</div><div class="list">${rows}</div>`;
  }
  if (!any) html += '<div class="empty">You don’t qualify for anything yet. Finish school, get a degree, or build up a skill. Tap “All careers” to see requirements.</div>';
  return { title: 'Job board', html };
};
CLICK.jbFilter = (el, ds) => { UI.jbQualified = ds.v === '1'; renderSheet(); };
CLICK.apply = (el, ds) => uiRun(() => applyJob(G, ds.id), { emoji: JOBS[ds.id].emoji, title: JOBS[ds.id].name });

SHEETS.grad = () => {
  const rows = Object.keys(GRAD_PROGRAMS).map((k) => {
    const g = GRAD_PROGRAMS[k], el = gradEligible(G, k);
    const ok = el.ok && !M(G).career && free(G) && !inSchool(G);
    const why = !el.ok ? el.why : M(G).career ? 'Quit your job first' : `${g.years} years · ${g.cost ? fmtMoney(tuition(G, g.cost)) + '/yr' : 'Paid stipend'} · Smarts ${g.smarts}+ recommended`;
    return itemRow({ a: ok ? 'gradApply' : null, ds: { k }, ico: g.emoji, t: esc(g.name), s: esc(why), cls: ok ? '' : 'disabled', chev: ok });
  }).join('');
  return { title: 'Graduate school', html: `<div class="list">${rows}</div><div class="note">Master's and PhD programs are in the field of your bachelor's degree.</div>` };
};
CLICK.gradApply = (el, ds) => uiRun(() => applyGrad(G, ds.k), { emoji: GRAD_PROGRAMS[ds.k].emoji, title: GRAD_PROGRAMS[ds.k].name });

/* ---- assets ---------------------------------------------------------- */
const ASSET_GROUPS = [['house', 'Real estate'], ['car', 'Vehicles'], ['boat', 'Boats'], ['aircraft', 'Aircraft'], ['jewelry', 'Jewelry'], ['instrument', 'Instruments'], ['art', 'Art']];
SHEETS.assets = () => {
  const m = M(G);
  const h = m.housing;
  let html = `<div class="section-title">Home</div><div class="card">
    <div class="row"><div class="ico">${icon('assets', 28)}</div><div class="grow"><b>${esc(housingLabel(G))}</b><div class="muted">${h.type === 'rent' ? 'Rent ' + fmtMoney(h.rent) + '/yr' : h.type === 'own' ? 'You own this home' : h.type === 'homeless' ? (A(G) >= 18 ? 'You have nowhere to live' : '') : 'Living with family'}</div></div></div>
    ${homeFacts()}
  </div>${listOf(cityRow() + actionRows('home'))}`;
  html += `<div class="section-title">Money</div><div class="list">
    ${itemRow({ a: 'sheet', ds: { k: 'finance' }, ico: '💵', t: fmtMoney(m.money), s: `Net worth ${fmtMoneyShort(netWorth(G))}${m.trust ? ' · Trust fund ' + fmtMoneyShort(m.trust) : ''}`, chev: true })}
    ${actionRows('money', undefined, (a) => ['investments', 'stocks', 'fx_trade', 'bank_loan', 'lifestyle', 'bankruptcy'].includes(a.id))}
  </div>`;
  for (const [kind, name] of ASSET_GROUPS) {
    const list = m.assets.filter((a) => a.kind === kind);
    if (!list.length) continue;
    html += `<div class="section-title">${name}</div><div class="list">${list.map((a) => itemRow({ a: 'sheet', ds: { k: 'asset', arg: a.id }, ico: a.emoji, t: esc(a.name), s: `Worth ${fmtMoney(a.value)}${a.kind === 'house' || a.kind === 'car' || a.kind === 'boat' ? ' · condition ' + a.cond + '%' : ''}${a.kind === 'house' ? houseRowNote(a) : ''}${h.assetId === a.id ? ' · you live here' : ''}`, chev: true })).join('')}</div>`;
  }
  const shop = actionRows('shop');
  if (shop) html += `<div class="section-title">Shopping</div>${listOf(shop)}`;
  return { title: 'Assets', html };
};
SHEETS.asset = (id) => {
  const a = myAsset(G, id);
  if (!a) return null;
  const loan = a.loanId ? M(G).loans.find((l) => l.id === a.loanId) : null;
  return {
    title: a.name,
    html: `<div class="card p-card"><div class="avatar">${emo(a.emoji, 56)}</div><div class="p-name">${esc(a.name)}</div>
      <div class="mini-stats">${kvRow('Value', fmtMoney(a.value))}${kvRow('Paid', fmtMoney(a.paid || a.value))}${a.beds !== undefined ? kvRow('Bedrooms', a.beds) : ''}${a.since ? kvRow('Owned since', a.since) : ''}${loan ? kvRow('Loan left', fmtMoney(loan.balance)) : ''}${a.rentedOut ? kvRow('Rent income', fmtMoney(a.rentIncome) + '/yr') : ''}${assetUpkeep(G, a) ? kvRow('Upkeep', fmtMoney(assetUpkeep(G, a)) + '/yr') : ''}</div>
      ${['house', 'car', 'boat', 'aircraft'].includes(a.kind) ? `<div class="rel-bar"><div class="muted" style="text-align:left">Condition</div>${bar(a.cond)}</div>` : ''}
    </div>
    ${tenantSection(a)}
    <div class="section-title">Actions</div>${listOf(actionRows('asset', id))}`,
  };
};

/* ---- finances ------------------------------------------------------ */
SHEETS.finance = () => {
  const m = M(G), f = m.lastFinance;
  let html = `<div class="card">
    ${kvRow('Cash', `<span class="${m.money < 0 ? 'bad' : 'good'}">${fmtMoney(m.money)}</span>`)}
    ${m.trust ? kvRow('Trust fund (at 18)', fmtMoney(m.trust)) : ''}
    ${kvRow('Investments', fmtMoney(investTotal(G)))}
    ${stocksValue(G) ? kvRow('Stocks', fmtMoney(stocksValue(G))) : ''}
    ${fxSaved(G) ? kvRow('Foreign currency', fmtMoney(fxSaved(G))) : ''}
    ${kvRow('Property & things', fmtMoney(assetsValue(G)))}
    ${kvRow('Debt', `<span class="${debtTotal(G) ? 'bad' : ''}">${fmtMoney(debtTotal(G))}</span>`)}
    ${kvRow('<b>Net worth</b>', fmtMoney(netWorth(G)))}
    ${livesAlone(G) ? kvRow('Lifestyle', emo(LIFESTYLES[m.lifestyle].emoji, 18) + ' ' + LIFESTYLES[m.lifestyle].name) : ''}
    ${m.career ? kvRow('Salary', fmtMoney(m.career.salary) + '/yr') : ''}
    ${kvRow('Income tax', Math.round(country(G).tax * 100) + '%')}
  </div>${currencyCard()}`;
  if (m.loans.length) {
    html += `<div class="section-title">Loans</div><div class="list">${m.loans.map((l) => itemRow({ a: 'payLoan', ds: { id: l.id }, ico: '🏦', t: esc(l.name), s: `${fmtMoney(l.balance)} left · ${Math.round(l.rate * 1000) / 10}% · ${fmtMoney(l.payment)}/yr`, end: m.money >= l.balance ? 'Pay off' : 'Pay', chev: true })).join('')}</div>`;
  }
  const inv = INVEST_IDS.filter((k) => m.invest[k]);
  if (inv.length) html += `<div class="section-title">Investments</div><div class="list">${inv.map((k) => itemRow({ a: 'act', ds: { id: 'investments', t: '' }, ico: INVESTMENTS[k].emoji, t: esc(INVESTMENTS[k].name), s: fmtMoney(m.invest[k]) })).join('')}</div>`;
  const held = Object.keys(m.stocks || {}).map((id) => firmById(G, id)).filter(Boolean);
  if (held.length) {
    html += `<div class="section-title">Stocks</div><div class="list">${held.map((f) => {
      const h = m.stocks[f.id], v = holdingValue(G, f.id);
      return itemRow({ a: free(G) ? 'rivalStock' : null, ds: { id: f.id }, ico: INDUSTRIES[f.ind].emoji, t: `${esc(f.ticker)} · ${esc(f.name)}`, s: `${fmtShares(h.sh)} shares · ${fmtMoney(v)} · ${v >= h.cost ? 'up' : 'down'} ${fmtMoney(Math.abs(v - h.cost))}`, chev: free(G) });
    }).join('')}</div>`;
  }
  if (f) {
    html += `<div class="section-title">Last year (${f.year})</div><div class="card">
      ${f.inc.length ? f.inc.map(([k, v]) => kvRow(esc(k), `<span class="good">+${fmtMoney(v)}</span>`)).join('') : '<div class="muted">No income.</div>'}
      ${f.exp.map(([k, v]) => kvRow(esc(k), `<span class="bad">-${fmtMoney(v)}</span>`)).join('')}
      ${f.invest ? kvRow('Investment returns', `<span class="${f.invest >= 0 ? 'good' : 'bad'}">${f.invest >= 0 ? '+' : ''}${fmtMoney(f.invest)}</span>`) : ''}
    </div>`;
  } else html += '<div class="note">Your yearly income and expenses show up here after you age up.</div>';
  return { title: 'Finances', html };
};
CLICK.payLoan = (el, ds) => uiRun(() => payOffLoan(G, ds.id), { emoji: '🏦', title: 'Loan' });
