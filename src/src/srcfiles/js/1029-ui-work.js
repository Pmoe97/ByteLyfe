/* =====================================================================
 * 1029-ui-work.js — your desk on screen: the career's meter and the cards
 * waiting on the Work sheet. The engine is 65-work.js, the decks 66-work-decks.js.
 * ===================================================================== */

function wkSection() {
  const c = M(G).career, def = c && WORKDECK[c.id];
  if (!def) return '';
  const st = wkState(G, c.id);
  const rows = st.hand.map((h) => {
    const k = wkCard(c.id, h.cid);
    return itemRow({ a: 'play', ds: { hid: h.hid }, ico: k.emoji, t: esc(k.name), s: esc(`${k.stages.length > 1 ? nOf(k.stages.length, 'decision') : 'One decision'}${h.c.who ? ' · ' + h.c.who : ''}`), chev: true });
  });
  const done = st.ok + st.meh + st.bad;
  return `<div class="section-title">${esc(def.desk || 'Your desk')}</div><div class="card">
    <div class="muted">${emo(def.meter.emoji, 16)} ${esc(def.meter.name)} · ${esc(wkWord(def, st.m))} (${Math.round(st.m)}%)</div>${bar(st.m)}
    ${done ? kvRow('Your record here', `${st.ok} good · ${st.meh} so-so · ${st.bad} bad`) : ''}
  </div>${rows.length ? `<div class="list" style="margin-top:8px">${rows.join('')}</div>` : '<div class="note">Nothing waiting on your desk. A new batch comes with the new year.</div>'}`;
}
CLICK.play = (el, ds) => uiRun(() => wkStart(G, ds.hid), { emoji: '📋', title: 'Your desk' });
