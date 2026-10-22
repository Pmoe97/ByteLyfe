/* =====================================================================
 * 1019-ui-chaos.js — Chaos mode on screen: the status card at the top of
 * the Supernatural menu (powers, your cape career, your life as a vampire,
 * an ascended ancestor) and chips on people's pages. The engine is
 * 51-chaos.js; nothing here shows while the Chaos switch is off.
 * ===================================================================== */

function chaosCard() {
  if (!chaosOn()) return '';
  const p = P(G), u = M(G).sup, b = M(G).blood;
  let html = '';
  if (hasPowers(p)) {
    html += `<div class="card" style="margin-bottom:12px">
      <div class="chips">${myPowers(G).map((k) => `<span class="chip on">${emo(POWERS[k].emoji, 18)}${esc(POWERS[k].name)}</span>`).join('')}</div>
      <div class="muted" style="margin-top:8px">Control · ${sup(G).control}%</div>${bar(sup(G).control, 'accent')}
      ${kvRow('Secret identity', sup(G).outed ? '<span class="bad">Blown: the world knows</span>' : 'Safe')}
      ${u && u.side ? `${kvRow(u.side === 'hero' ? 'Hero name' : 'Villain name', esc(u.alias))}${kvRow('Rank', esc(capeRank(G)))}<div class="muted" style="margin-top:6px">Reputation · ${u.rep}%</div>${bar(u.rep, u.side === 'hero' ? '' : 'low')}` : ''}
      ${u && u.side && nemesisOf(G) ? kvRow('Nemesis', `${esc(nemesisOf(G).alias)}${u.wins ? ` · beaten ${nOf(u.wins, 'time')}` : ''}`) : ''}
      ${u && u.henchmen ? kvRow('Henchmen', u.henchmen) : ''}
      ${u && u.team ? kvRow('Team', u.side === 'hero' ? 'The Paragon League' : 'The Syndicate of Ruin') : ''}
    </div>`;
  }
  if (isVamp(p)) {
    html += `<div class="card" style="margin-bottom:12px">
      <div class="row"><div class="ico">${emo('🦇', 28)}</div><div class="grow"><b>Vampire</b><div class="muted">Turned in ${p.vamp.year} · looks ${p.frozenAge} · really ${A(G)}</div></div></div>
      <div class="muted" style="margin-top:8px">Hunger · ${b ? b.hunger : 0}%</div>${bar(b ? b.hunger : 0, b && b.hunger >= 70 ? 'low' : b && b.hunger >= 40 ? 'mid' : '')}
      <div class="muted" style="margin-top:6px">Hunters on your trail · ${b ? b.hunt : 0}%</div>${bar(b ? b.hunt : 0, b && b.hunt >= 50 ? 'low' : 'mid')}
      ${b && b.sired ? kvRow('Turned', nOf(b.sired, 'person', 'people')) : ''}
    </div>`;
  }
  if (G.ancestor) html += `<div class="note">${G.ancestor.kind === 'angel' ? '😇' : '🔥'} ${esc(G.ancestor.name)} ${G.ancestor.kind === 'angel' ? 'ascended as an archangel' : 'became a demon lord'} in ${G.ancestor.year}. Your family hasn't been the same since.</div>`;
  return html ? html + '<div class="section-title">What will you do?</div>' : '';
}

// Chips on someone's page: their powers, their cape name, fangs.
function chaosFacts(p) {
  if (!chaosOn() || !p.alive) return '';
  const chips = [];
  if (isVamp(p)) chips.push(`<span class="chip">${emo('🦇', 18)}Vampire since ${p.vamp.year}</span>`);
  if (p.alias) chips.push(`<span class="chip">${emo(p.capeSide === 'villain' ? '🦹' : '🦸', 18)}${esc(p.alias)}</span>`);
  if (hasPowers(p)) chips.push(...p.powers.map((k) => `<span class="chip">${emo(POWERS[k].emoji, 18)}${esc(POWERS[k].name)}</span>`));
  return chips.length ? `<div class="chips" style="justify-content:center;margin-top:10px">${chips.join('')}</div>` : '';
}
