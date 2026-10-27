/* =====================================================================
 * 1027-ui-web.js — the web on screen: chips on a person's page (they know
 * your secret, you know theirs, how many people you share), the
 * Reputation & secrets sheet, and its entry on your profile. The engine
 * is 62-web.js.
 * ===================================================================== */

function webFacts(p) {
  if (!p.alive || p.id === G.playerId) return '';
  const chips = [];
  const chip = (e, t, cls) => chips.push(`<span class="chip ${cls || ''}">${emo(e, 18)}${esc(t)}</span>`);
  const knows = webTheyKnow(G, p.id);
  if (knows.length) chip('🤫', `Knows ${nOf(knows.length, 'secret')} of yours`, 'bad');
  const about = webAbout(G, p.id);
  if (about.length) chip('🗣️', 'You know something about them');
  const shared = [...webTies(G, p).keys()].filter((id) => id !== G.playerId && relOf(G, id)).length;
  if (shared) chip('🕸️', `Talks to ${nOf(shared, 'person', 'people')} you know`);
  return chips.length ? `<div class="chips" style="justify-content:center;margin-top:10px">${chips.join('')}</div>` : '';
}

function webSecretRow(sec, mine) {
  const names = webKnowers(G, sec).map((id) => webName(G, id));
  const who = names.length ? `${nOf(names.length, 'person', 'people')} know${names.length === 1 ? 's' : ''}: ${names.slice(0, 4).join(', ')}${names.length > 4 ? '…' : ''}` : 'Only you know';
  const risk = sec.ev >= 65 ? 'High' : sec.ev >= 35 ? 'Medium' : 'Low';
  return itemRow({
    ico: SECRET_KINDS[sec.kind].icon,
    t: esc(cap(mine ? webLabel(G, sec) : webRumor(G, sec))),
    s: esc(mine ? `${who} · ${risk} risk of it getting out` : `${sec.year} · ${who}`),
  });
}

// The profile's entry: how the world sees you, in one line.
function webCard() {
  const r = webRep(P(G)), mine = webMine(G);
  const sub = `${webRepWord(r)}${mine.length ? ` · ${nOf(mine.length, 'secret')} kept` : ''}`;
  return `<div class="section-title">Reputation</div><div class="list">${itemRow({ a: 'sheet', ds: { k: 'web' }, ico: '🕸️', t: 'Reputation & secrets', s: esc(sub), chev: true })}</div>`;
}

SHEETS.web = () => {
  const p = P(G), r = webRep(p), w = webOf(G);
  let html = `<div class="card">
    <div class="muted">Good name · ${r.name}%</div>${bar(r.name)}
    <div class="muted" style="margin-top:8px">Scandal · ${r.scandal}%</div>${bar(r.scandal, r.scandal >= 60 ? 'low' : r.scandal >= 30 ? 'mid' : 'accent')}
    ${kvRow('Standing', esc(webRepWord(r)))}
    ${webUneaseHere(G) >= 1 ? kvRow('Your neighborhood', '<span class="bad">Uneasy</span>') : ''}
  </div>`;
  const mine = webMine(G).sort((a, b) => b.sev - a.sev);
  html += `<div class="section-title">What you are keeping</div>${listOf(mine.map((x) => webSecretRow(x, true)).join(''), 'You have nothing to hide.')}`;
  if (mine.length) html += '<div class="note">Secrets leak along the people who know them. Open a person’s page to ask them to keep quiet, or destroy evidence in the Crime menu.</div>';
  const heard = webHeard(G);
  if (heard.length) html += `<div class="section-title">What you have heard</div>${listOf(heard.map((x) => webSecretRow(x, false)).join(''))}`;
  const open = Object.values(w.secrets).filter((x) => x.out && x.subj === G.playerId).sort((a, b) => (b.outYear || 0) - (a.outYear || 0)).slice(0, 8);
  if (open.length) html += `<div class="section-title">In the open</div>${listOf(open.map((x) => itemRow({ ico: SECRET_KINDS[x.kind].icon, t: esc(cap(webLabel(G, x))), s: `Out since ${x.outYear || x.year}` })).join(''))}`;
  return { title: 'Reputation & secrets', html };
};
