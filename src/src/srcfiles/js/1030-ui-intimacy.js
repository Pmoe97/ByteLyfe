/* =====================================================================
 * 1030-ui-intimacy.js — what intimacy shows on a person's page: how warm the
 * spark is in a relationship, and a reputation if you have one. Only with
 * the Mature and Intimacy switches on. The engine is 68-intimacy.js.
 * ===================================================================== */

function intimFacts(p) {
  if (!intimOn() || !p.alive || p.id === G.playerId || A(G) < 18 || ageOf(G, p) < 18) return '';
  const r = relOf(G, p.id);
  if (!r || !['partner', 'spouse', 'fiance', 'fwb', 'fling'].includes(r.kind)) return '';
  const chips = [`<span class="chip">${emo('🔥', 18)}Spark: ${esc(sparkWord(intimSpark(G, p.id)))}</span>`];
  const rep = intimRep(G);
  if (rep && ['partner', 'spouse', 'fiance'].includes(r.kind)) chips.push(`<span class="chip">${emo('🌙', 18)}You are known as: ${esc(rep.toLowerCase())}</span>`);
  return `<div class="chips" style="justify-content:center;margin-top:10px">${chips.join('')}</div>`;
}
