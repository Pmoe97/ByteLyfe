/* =====================================================================
 * 1033-ui-world.js — the world on screen: a chip in the header while something big is going on, a line in the
 * menu, and the World sheet (what is going on and what it means for you, then what you have lived through).
 * The engine is 88-world.js; the events are 09-data-history.js.
 * ===================================================================== */

function worldChip() {
  if (!G || G.dead || !histOn()) return '';
  const ev = worldHeadline(G);
  if (!ev) return '';
  return `<button class="g-chip" data-a="sheet" data-k="world" aria-label="${esc(ev.name)}: what it means for you">${emo(ev.emoji, 22)}<span>${esc(ev.chip || ev.name)}</span></button>`;
}
function worldMenuLine() {
  const act = worldActive(G).filter((a) => !a.ev.quiet && a.ev.kind !== 'moment');
  if (act.length) return listJoin(act.slice(0, 2).map((a) => a.ev.chip || a.ev.name));
  const lived = (M(G).worldLived || []).length;
  return lived ? `${nOf(lived, 'event')} lived through` : 'Nothing remarkable right now';
}
SHEETS.world = () => {
  const cc = P(G).country, act = worldActive(G).filter((a) => !a.ev.quiet).sort((a, b) => WORLD_KIND_RANK[a.ev.kind] - WORLD_KIND_RANK[b.ev.kind] || b.k - a.k);
  let html = '';
  if (!histOn()) return { title: 'The world', html: '<div class="empty">Real-world history is off in Settings.</div>' };
  html += `<div class="section-title">Right now · ${G.year}</div>`;
  if (act.length) {
    html += act.map((a) => {
      const r = evRange(a.ev, cc);
      return `<div class="card" style="margin-bottom:8px"><div style="font-weight:700">${emo(a.ev.emoji, 22)} ${esc(cap(a.ev.name))} <span class="faint">${r[0]}${r[1] !== r[0] ? '–' + r[1] : ''}</span></div>${a.ev.blurb ? `<div class="muted" style="margin-top:4px">${esc(a.ev.blurb)}</div>` : ''}</div>`;
    }).join('');
    const fx = worldEffects(G);
    html += fx.length ? `<div class="section-title">What it means for you</div><div class="card">${fx.map((t) => `<div style="padding:3px 0">${esc(t)}</div>`).join('')}</div>` : '';
  } else html += '<div class="note">Nothing remarkable is going on. The news is mostly weather and local sport.</div>';
  const lived = worldLivedList(G);
  if (lived.length) {
    html += `<div class="section-title">In your lifetime</div><div class="list">${lived.map((id) => {
      const ev = HIST[id], r = evRange(ev, cc);
      return itemRow({ ico: emo(ev.emoji, 28), t: esc(cap(ev.name)), s: `${r[0]}${r[1] !== r[0] ? '–' + r[1] : ''}${ev.blurb ? ' · ' + esc(ev.blurb) : ''}` });
    }).join('')}</div>`;
  }
  html += '<div class="note">These are real events. They change the economy, jobs, prices and who is called to war, and bring things to your door. You can turn them off in Settings (Real-world history).</div>';
  return { title: '🌍 The world', html };
};
