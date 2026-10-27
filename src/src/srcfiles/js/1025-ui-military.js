/* =====================================================================
 * 1025-ui-military.js — military life on screen: the status card at the top
 * of the Military & Veterans menu (war news, your service record, your
 * benefits), a section on the Work sheet, the history of wars (sheet
 * 'wars'), the service record (sheet 'servicerec') and chips on the pages of
 * relatives in uniform. The engine is 59-military.js.
 * ===================================================================== */

function warCard() {
  const w = activeWar(G);
  if (!w) {
    const last = warBook(G).log.filter((l) => l.cc === P(G).country).slice(-1)[0];
    return last ? `<div class="note">🕊️ ${esc(cap(last.name))} ended in ${last.result} in ${last.end}.</div>` : '';
  }
  return `<div class="card" style="margin-bottom:12px">
    <div class="row"><div class="ico">${emo('🚨', 28)}</div><div class="grow"><b>${esc(cap(w.name))}</b><div class="muted">${esc(country(G).name)} against ${esc(w.foe)} · ${esc(w.theater)}</div></div></div>
    ${kvRow('Intensity', esc(INTENSITY[w.intensity]))}
    ${kvRow('Year', `${G.year - w.start + 1} · began ${w.start}`)}
    ${kvRow('Casualties', n0(w.dead))}
    ${w.draft ? `<div class="note bad">📜 The draft is on for adults up to 30.</div>` : ''}
  </div>`;
}

function benefitRows(m) {
  const rows = [];
  const yes = (t) => `<span class="good">${t}</span>`, no = (t) => `<span class="faint">${t}</span>`;
  rows.push(kvRow('Discharge', `${DISCHARGES[m.discharge || 'honorable'].emoji} ${esc(DISCHARGES[m.discharge || 'honorable'].name)}${m.dischargeYear ? ' · ' + m.dischargeYear : ''}`));
  rows.push(kvRow('Health care', vetHas(G, 'care') ? yes(mil(G).rating >= 50 ? 'Free' : 'A third of the price') : no('Not covered')));
  rows.push(kvRow('Home loan', vetHas(G, 'loan') ? yes('No down payment, lower rate') : no(m.loanUsed ? 'Used' : 'Not covered')));
  rows.push(kvRow('Schooling aid', vetHas(G, 'edu') ? yes(nOf(m.edLeft, 'year') + ' left') : no(FULL_VET.includes(m.discharge) ? 'Used up' : 'Not covered')));
  rows.push(kvRow('Disability', m.claim ? (m.claim.approved ? yes(`${m.rating}% · ${fmtMoney(price(G, m.rating * 420))}/yr`) : no('Claim denied')) : no('No claim filed')));
  return rows.join('');
}

function militaryCard() {
  const m = mil(G), c = M(G).career, serving = inService(G) && m;
  let html = warCard();
  if (m && (serving || m.vet || m.deserter)) {
    const B = BRANCHES[m.branch], S = SPECIALTIES[m.spec];
    html += `<div class="card" style="margin-bottom:12px">
      <div class="row"><div class="ico">${emo(B.emoji, 28)}</div><div class="grow"><b>${serving ? esc(careerTitle(G)) : m.deserter ? 'Deserter' : 'Veteran'}</b><div class="muted">${esc(B.name)} · ${emo(S.emoji, 16)} ${esc(S.name)}${m.elite ? ' · special forces' : ''}</div></div></div>
      ${kvRow('Years served', m.served)}
      ${serving ? kvRow('Term ends', m.termEnd + (m.drafted ? ' · draftee' : '')) : ''}
      ${m.tours.length ? kvRow('Tours', nOf(m.tours.length, 'tour') + (m.tours.filter((t) => t.war).length ? ` · ${m.tours.filter((t) => t.war).length} in war` : '')) : ''}
      ${medalCount(G) || m.medals.ribbon ? kvRow('Decorations', [m.medals.valor ? `🎖️ valor ×${m.medals.valor}` : '', m.medals.heart ? `💜 Purple Heart ×${m.medals.heart}` : '', m.medals.ribbon ? `campaign ×${m.medals.ribbon}` : ''].filter(Boolean).join(' · ')) : ''}
      ${m.ptsd > 0 ? `<div class="muted" style="margin-top:6px">Combat stress · ${m.ptsd}%</div>${bar(m.ptsd, m.ptsd >= 60 ? 'low' : m.ptsd >= 30 ? 'mid' : '')}` : ''}
      ${serving && c ? `<div class="muted" style="margin-top:6px">Performance</div>${bar(c.perf)}` : ''}
      ${m.deserter ? `<div class="note bad">🏃 You are wanted for desertion.</div>` : ''}
      ${m.vet ? benefitRows(m) : ''}
    </div>
    ${m.tours.length ? `<div class="list" style="margin-bottom:12px">${itemRow({ a: 'sheet', ds: { k: 'servicerec' }, ico: '📓', t: 'Service record', s: nOf(m.tours.length, 'tour') + (m.wounds.length ? ' · ' + nOf(m.wounds.length, 'wound') : ''), chev: true })}</div>` : ''}`;
  }
  if (warBook(G).log.length) html += `<div class="list" style="margin-bottom:12px">${itemRow({ a: 'sheet', ds: { k: 'wars' }, ico: '📜', t: 'History of wars', s: nOf(warBook(G).log.length, 'war') + ' in this family line', chev: true })}</div>`;
  return html ? html + '<div class="section-title">What will you do?</div>' : '';
}

// The Work sheet's list of what you do in uniform.
function militarySection() {
  const c = M(G).career, m = mil(G);
  if (!c || !m || !isMilJob(c.id)) return '';
  const B = BRANCHES[m.branch], rows = [kvRow('Branch', `${emo(B.emoji, 16)} ${esc(B.name)}`), kvRow('Specialty', esc(SPECIALTIES[m.spec].name)), kvRow('Term ends', m.termEnd)];
  const w = activeWar(G);
  if (w) rows.push(kvRow('At war', esc(cap(w.name))));
  if (m.ptsd) rows.push(kvRow('Combat stress', m.ptsd + '%'));
  return `<div class="section-title">Your service</div><div class="card">${rows.join('')}</div><div class="list" style="margin-top:8px">${itemRow({ a: 'sheet', ds: { k: 'actcat', arg: 'mil' }, ico: '🎖️', t: 'Military & Veterans', s: 'Orders, discharge and benefits', chev: true })}</div>`;
}

SHEETS.wars = () => {
  const list = warBook(G).log.slice().reverse();
  const act = activeWar(G);
  const rows = (act ? [itemRow({ ico: '🚨', t: esc(cap(act.name)), s: `${esc(country(G).name)} against ${esc(act.foe)} · since ${act.start} · ongoing` })] : []).concat(list.map((l) => itemRow({
    ico: l.result === 'victory' ? '🏆' : l.result === 'defeat' ? '🏳️' : '🕊️', t: esc(cap(l.name)),
    s: `${esc(COUNTRIES[l.cc] ? COUNTRIES[l.cc].name : l.cc)} against ${esc(l.foe)} · ${l.start}–${l.end} · ${l.result} · ${n0(l.dead)} dead`,
  })));
  return { title: 'History of wars', html: listOf(rows.join(''), 'No wars yet.') };
};
SHEETS.servicerec = () => {
  const m = mil(G);
  if (!m) return { title: 'Service record', html: '<div class="empty">You have not served.</div>' };
  const rows = m.tours.slice().reverse().map((t) => itemRow({ ico: t.war ? '🎖️' : '🚢', t: `${t.y} · ${esc(t.war ? cap(t.war) : 'Peacetime posting')}`, s: `${esc(cap(t.place))}${t.post === 'front' ? ' · front line' : t.post === 'rear' ? ' · rear assignment' : ''}${t.result === 'wounded' ? ' · wounded' : t.result === 'captured' ? ' · captured' : ''}` }));
  return { title: 'Service record', html: listOf(rows.join(''), 'No tours yet.') };
};

// A relative in uniform.
function militaryFacts(p) {
  if (!p.mil || !p.alive) return '';
  return `<div class="chips" style="justify-content:center;margin-top:10px"><span class="chip">${emo('🥾', 18)}${p.mil.vet ? 'Veteran' : 'In uniform since ' + p.mil.since}</span></div>`;
}
