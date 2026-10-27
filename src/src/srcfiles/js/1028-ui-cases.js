/* =====================================================================
 * 1028-ui-cases.js — the Case files menu opens with where you stand: the
 * cases against you and the detective on each, and, for a detective, the
 * files on your desk. The engines are 63-cases.js and 64-detective.js.
 * ===================================================================== */

function invCaseRow(c) {
  const d = invDet(G, c), vic = c.vname ? ` · ${esc(c.vname)}` : '';
  const heat = invHeat(c);
  return itemRow({
    ico: invEmoji(c),
    t: `${esc(cap(invVerb(c)))}${vic}${c.nick ? ` · “${esc(c.nick)}”` : ''}`,
    s: `${c.year} · ${esc(c.city)} · ${esc(heat)}${d ? ` · Detective ${esc(d.last)}` : ''}${c.links.length ? ` · ${nOf(c.links.length + 1, 'case')} in a series` : ''}`,
    extra: c.status === 'open' ? `<div class="meter">${bar(c.prog, c.prog >= 70 ? 'low' : c.prog >= 40 ? 'mid' : '')}</div>` : '',
  });
}
function invCard() {
  const mine = invMine(G), desk = isDetective(G) ? dtCases(G) : [];
  let html = '';
  if (mine.length) {
    const open = mine.filter((c) => c.status === 'open'), cold = mine.length - open.length;
    html += `<div class="section-title">Cases against you</div><div class="card">${kvRow('Open', nOf(open.length, 'case'))}${cold ? kvRow('Gone cold', nOf(cold, 'case')) : ''}</div>`;
    html += `<div class="list" style="margin-top:8px">${mine.sort((a, b) => b.prog - a.prog).map(invCaseRow).join('')}</div>`;
    html += '<div class="note">The bar is how close they are. It moves on evidence, on how hard your detective is trying, and on how well you cover your tracks.</div>';
  }
  if (isDetective(G)) {
    const dt = dtOf(G);
    html += `<div class="section-title">Your desk</div><div class="card">${kvRow('Solved', String(dt.solved))}${kvRow('Gone cold', String(dt.cold))}${dt.wrong ? kvRow('Wrong arrests', `<span class="bad">${dt.wrong}</span>`) : ''}${kvRow('Open files', String(desk.length))}</div>`;
    if (desk.length) html += `<div class="list" style="margin-top:8px">${desk.map(invCaseRow).join('')}</div>`;
  }
  return html || '<div class="note">Nobody is looking for you, and you are not looking for anyone.</div>';
}
