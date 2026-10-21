/* =====================================================================
 * 1010-ui-fame.js — show business on the Work sheet ("Your work": agent,
 * deal, awards, what's trending, latest releases) and the full list of
 * everything you've made (sheet 'works'). The engine is 40-fame.js.
 * ===================================================================== */

function workLine(w) {
  const chart = w.kind === 'campaign' ? '' : w.kind === 'film' || w.kind === 'role' ? ` · ${fmtMoneyShort(w.rev * 6)} box office` : ` · peaked at #${w.peak}`;
  return `${w.year}${w.genre ? ' · ' + esc(w.genre) : ''} · ${w.score}/100${chart}${w.awards ? ` · 🏆 ×${w.awards}` : ''}`;
}
function showbizSection() {
  if (!fameJob(G)) return '';
  const st = M(G).sb, K = WORK_KINDS[workKind(G)], works = st ? st.works : [];
  const rows = [];
  if (st && st.agent) rows.push(kvRow('Agent', `${esc(st.agency)} · ${Math.round(AGENTS[st.agent].cut * 100)}% cut`));
  if (K.deal) rows.push(kvRow(cap(DEAL_NAMES[K.deal].who), st && st.deal && st.deal.type === K.deal ? `${esc(st.deal.name)} · ${nOf(st.deal.left, 'release')} left` : 'Independent'));
  if (st && st.awards) rows.push(kvRow('Awards', `🏆 ${st.awards}`));
  if (K.genres) { const tr = trendsFor(G)[K.genres]; rows.push(kvRow('Hot right now', esc(Object.keys(tr).sort((a, b) => tr[b] - tr[a])[0]))); }
  const latest = works.slice(-4).reverse().map((w) => itemRow({ ico: WORK_KINDS[w.kind].emoji, t: `“${esc(w.title)}”`, s: workLine(w) })).join('');
  const all = works.length > 4 ? itemRow({ a: 'sheet', ds: { k: 'works' }, ico: '📚', t: 'Everything you’ve made', s: nOf(works.length, 'release'), chev: true }) : '';
  return `<div class="section-title">Your work</div>${rows.length ? `<div class="card">${rows.join('')}</div>` : ''}${latest ? `<div class="list" style="margin-top:8px">${latest}${all}</div>` : '<div class="note">Nothing released yet.</div>'}`;
}
SHEETS.works = () => {
  const st = M(G).sb, works = st ? st.works.slice().reverse() : [];
  const earned = sum(works, (w) => Math.round(w.rev * w.share));
  return {
    title: 'Your work',
    html: `<div class="card">${kvRow('Releases', works.length)}${kvRow('Number ones', works.filter((w) => w.peak === 1).length)}${kvRow('Awards', st ? st.awards : 0)}${kvRow('Earned at release', fmtMoney(earned))}</div>
      ${listOf(works.map((w) => itemRow({ ico: WORK_KINDS[w.kind].emoji, t: `“${esc(w.title)}”`, s: workLine(w) + (w.via ? ' · ' + esc(w.via) : '') })).join(''), 'Nothing yet.')}`,
  };
};
