/* =====================================================================
 * 1014-ui-parenting.js — parenting on screen: a child's school, stage career
 * and heir status as chips on their page, and the named heir on the
 * end-of-life screen. The engine is 46-parenting.js.
 * ===================================================================== */

// Chips for the person sheet: what you've set up for one of your children.
function kidFacts(p) {
  if (!p.alive || relKind(G, p.id) !== 'child') return '';
  const age = ageOf(G, p), chips = [];
  const chip = (e, t) => chips.push(`<span class="chip">${emo(e, 18)}${esc(t)}</span>`);
  if (age < 18 && (age >= 5 || p.school)) {
    const k = kidSchool(p), K = KID_SCHOOLS[k];
    chip(K.emoji, k === 'public' || k === 'home' ? K.name : `${p.school.name}${p.school.free ? ' (scholarship)' : ''}`);
  }
  if (p.stage) {
    const S = STAGE_KINDS[p.stage.kind];
    chip(S.emoji, p.stage.done ? `Former ${S.name.toLowerCase()}` : `${S.name} · fame ${Math.round(p.stage.fame)}`);
    if (p.stage.trust) chip('🏦', `Trust fund ${fmtMoneyShort(p.stage.trust)}`);
  }
  if (M(G).heir === p.id) chip('🗝️', 'Your heir');
  if (p.groom) chip('💼', `${nOf(p.groom, 'year')} in the business`);
  if (p.mobGroom) chip('🕴️', `${nOf(p.mobGroom, 'year')} in the family`);
  if (p.arranged && p.married) chip('💑', 'Arranged marriage');
  return chips.length ? `<div class="chips" style="justify-content:center;margin-top:10px">${chips.join('')}</div>` : '';
}
// On the end-of-life screen: who takes over the family business and the crime family.
function heirNote() {
  const h = namedHeir(G), duty = h ? heirDuty(G) : [];
  if (!h || !duty.length) return '';
  return `<div class="note">🗝️ Your heir, ${esc(h.first)}, takes over ${esc(listJoin(duty))}, whichever child you go on as.</div>`;
}
function heirBadge(h) { return namedHeir(G) && namedHeir(G).id === h.id ? ' · 🗝️ Heir' : ''; }
