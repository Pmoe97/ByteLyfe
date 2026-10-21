/* =====================================================================
 * 1015-ui-romance.js — romance on screen: chips on a person's page for an
 * open relationship, a secret affair and its risk, or a one-night stand.
 * The engine is 47-romance.js.
 * ===================================================================== */

function romanceFacts(p) {
  if (!p.alive) return '';
  const r = relOf(G, p.id), chips = [];
  const chip = (e, t) => chips.push(`<span class="chip">${emo(e, 18)}${esc(t)}</span>`);
  if (openWith(G, p.id)) chip('🔓', `Open relationship since ${M(G).open.since}`);
  if (r.kind === 'lover') {
    if (r.known) chip('🔓', `${nm(G, romanticId(G))} knows`);
    else if (romanticId(G)) chip('🤫', riskWord(G, p.id));
  }
  if (r.kind === 'fling') chip('🌙', `One night in ${r.met}${r.cheat && r.cheat === romanticId(G) ? `, while you were with ${nm(G, r.cheat)}` : ''}`);
  return chips.length ? `<div class="chips" style="justify-content:center;margin-top:10px">${chips.join('')}</div>` : '';
}
