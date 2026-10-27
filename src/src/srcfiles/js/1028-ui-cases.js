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
  const carry = [];
  if (vioOn() && A(G) >= 18) {
    const v = vioOf(G), r = serOf(G);
    if (v.haunt > 0 || r.on) carry.push(kvRow('Your conscience', esc(hauntWord(v.haunt))) + bar(v.haunt, v.haunt >= 60 ? 'low' : v.haunt >= 35 ? 'mid' : ''));
    if (r.on) carry.push(kvRow('The urge', esc(serWord(r.urge))) + bar(r.urge, r.urge >= 70 ? 'low' : r.urge >= 40 ? 'mid' : ''));
    if (v.help) carry.push(kvRow('Times you asked for help', String(v.help)));
  }
  if (darkOn() && A(G) >= 18) {
    const dk = darkOf(G);
    if (dk.moral > 0) carry.push(kvRow('Moral weight', esc(moralWord(dk.moral))) + bar(dk.moral, dk.moral >= 60 ? 'low' : dk.moral >= 35 ? 'mid' : ''));
    if (dk.stalk) carry.push(kvRow('Someone will not let go', esc(stalkWord(dk.stalk.level))) + bar(dk.stalk.level, dk.stalk.level >= 70 ? 'low' : dk.stalk.level >= 40 ? 'mid' : '') + (dk.stalk.order ? kvRow('A court order', 'In place') : ''));
  }
  if (carry.length) html += `<div class="section-title">What you carry</div><div class="card">${carry.join('')}</div>`;
  return html || '<div class="note">Nobody is looking for you, and you are not looking for anyone.</div>';
}
