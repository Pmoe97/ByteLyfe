/* =====================================================================
 * 1031-ui-news.js — the paper, on screen. The engine is 79-news.js; the way in is the Case files card
 * (1028-ui-cases.js).
 * ===================================================================== */

SHEETS.news = () => {
  const list = (G.news || []).slice().reverse();
  let html = '';
  if (!list.length) html = '<div class="empty">Nothing has happened yet that anybody thought to write down.</div>';
  let year = null;
  for (const a of list) {
    if (a.y !== year) { year = a.y; html += `<div class="section-title">${esc(String(year))}</div>`; }
    html += `<div class="card" style="margin-bottom:8px"><div class="muted" style="font-size:.8em">${a.you ? 'About you, or yours' : a.kind === 'world' ? 'In the world' : 'Local news'}</div><div style="font-weight:700;margin:2px 0 4px">${esc(a.head)}</div><div class="muted">${esc(a.body)}</div></div>`;
  }
  return { title: '📰 The paper', html };
};
