/* =====================================================================
 * 1012-ui-courts.js — the courts: your open lawsuits and record at the top
 * of the Courts menu, the bench (docket, rulings, reversals) or your law
 * practice on the Work sheet, and every finished case (sheet 'cases').
 * The engine is 42-courts.js.
 * ===================================================================== */

const CASE_RESULTS = { won: 'Won', lost: 'Lost', settled: 'Settled', dropped: 'Dropped' };
function pastLine(x) {
  const money = x.amt ? ` · ${x.amt > 0 ? '+' : '−'}${fmtMoney(Math.abs(x.amt))}` : '';
  return `${x.y} · ${x.side === 'plaintiff' ? 'You sued' : 'You were sued'} · ${CASE_RESULTS[x.result] || esc(x.result)}${money}`;
}
function caseRow(k) {
  const T = CASE_TYPES[k.type];
  const when = k.stage === 'appeal' ? 'On appeal' : `Trial in ${k.trial} · chances look ${oddsWord(caseOdds(G, k))}`;
  return itemRow({ ico: T.emoji, t: esc(caseName(G, k)), s: `${esc(T.name)} · ${fmtMoney(k.claim)} · ${when}` });
}
// The Courts menu opens with your open cases and your record (42-courts.js).
function courtCard() {
  const st = M(G).court, open = st ? st.cases : [], past = st ? st.past : [];
  const n = (r) => past.filter((x) => x.result === r).length;
  const record = past.length ? `<div class="card" style="margin-bottom:12px">${kvRow('Won', n('won'))}${kvRow('Lost', n('lost'))}${kvRow('Settled', n('settled'))}</div>` : '';
  const hist = past.length ? `<div class="list" style="margin-bottom:12px">${itemRow({ a: 'sheet', ds: { k: 'cases' }, ico: '📚', t: 'Past cases', s: nOf(past.length, 'case'), chev: true })}</div>` : '';
  return `${open.length ? `<div class="section-title">Open cases</div>${listOf(open.map(caseRow).join(''))}` : '<div class="note">No lawsuits right now. To sue someone you know, open their page in People.</div>'}
    ${record}${hist}<div class="section-title">Go to court</div>`;
}
// The bench or your law practice, under the career card on the Work sheet.
function courtSection() {
  const c = M(G).career;
  if (!c || !['judge', 'lawyer'].includes(c.id)) return '';
  const st = M(G).court, rows = [];
  if (c.id === 'judge') {
    const b = st ? st.bench : { heard: 0, overturned: 0, landmark: 0 };
    rows.push(kvRow('Court', esc(['Magistrate court', 'District court', 'Court of appeals', 'Supreme Court'][c.level] || 'Court')), kvRow('Docket', docketLeft(G) ? `${nOf(docketLeft(G), 'case')} waiting` : 'Clear for the year'), kvRow('Cases heard', b.heard));
    if (b.overturned) rows.push(kvRow('Overturned on appeal', b.overturned));
    if (b.landmark) rows.push(kvRow('Landmark rulings', b.landmark));
  } else {
    const pr = st ? st.practice : { won: 0, lost: 0 };
    rows.push(kvRow('Trial record', `${pr.won}-${pr.lost}`), kvRow('Clients this year', `${count(G, 'client')} of 2`));
  }
  const docket = c.id === 'judge' ? docketOf(G).cases.map((x) => itemRow({ ico: x.done ? '✅' : '📂', t: esc(x.name), s: x.done ? 'Decided' : 'Waiting for your ruling', cls: x.done ? 'disabled' : '' })).join('') : '';
  return `<div class="section-title">${c.id === 'judge' ? 'The bench' : 'Your practice'}</div><div class="card">${rows.join('')}</div>${docket ? `<div class="list" style="margin-top:8px">${docket}</div>` : ''}`;
}
SHEETS.cases = () => {
  const st = M(G).court, list = st ? st.past.slice().reverse() : [];
  return { title: 'Past cases', html: listOf(list.map((x) => itemRow({ ico: CASE_TYPES[x.type] ? CASE_TYPES[x.type].emoji : '⚖️', t: esc(x.name || x.vs), s: pastLine(x) })).join(''), 'No cases yet.') };
};
