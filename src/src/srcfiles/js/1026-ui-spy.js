/* =====================================================================
 * 1026-ui-spy.js — the spy's file on screen: the status card at the top of
 * the Intelligence menu (agency, handle, cover, standing and heat, your
 * network), a section on the Work sheet, the mission dossier (sheet
 * 'dossier') and the list of assets (sheet 'assets'). The engine is
 * 60-spy.js.
 * ===================================================================== */

function spyCard() {
  const sp = spy(G), c = M(G).career;
  if (!sp) return '';
  const agent = inAgency(G), live = liveAssets(G);
  const T = SPY_TRACKS[sp.track], C = coverOf(G);
  let html = `<div class="card" style="margin-bottom:12px">
    <div class="row"><div class="ico">${emo('🕵️', 28)}</div><div class="grow"><b>${agent ? esc(careerTitle(G)) : sp.alumni ? 'Former officer' : 'Spy'}</b><div class="muted">${esc(cap(sp.agency))} · handle ${esc(sp.handle)}</div></div></div>
    ${kvRow('Training', `${emo(T.emoji, 16)} ${esc(T.name)}`)}
    ${agent ? kvRow('Cover', `${emo(C.emoji, 16)} ${esc(C.name)}${sp.desk ? ' · at a desk' : ''}`) : ''}
    ${agent ? `<div class="muted" style="margin-top:6px">Cover strength · ${sp.cover.strength}%</div>${bar(sp.cover.strength)}` : ''}
    ${agent ? `<div class="muted" style="margin-top:6px">Standing with your agency · ${sp.standing}%</div>${bar(sp.standing)}` : ''}
    ${agent ? `<div class="muted" style="margin-top:6px">Foreign attention · ${sp.heat}%</div>${bar(sp.heat, sp.heat >= 60 ? 'low' : sp.heat >= 30 ? 'mid' : '')}` : ''}
    ${kvRow('Missions', `${sp.ok} done${sp.fail ? ` · ${sp.fail} went wrong` : ''}`)}
    ${live.length ? kvRow('Network', nOf(live.length, 'asset')) : ''}
    ${sp.controlled ? `<div class="note">🎭 You are running a double game against ${esc(sp.controlled.state)}.</div>` : ''}
    ${sp.turned ? `<div class="note bad">🕶️ You are selling secrets to ${esc(sp.turned.state)}.</div>` : ''}
    ${sp.burned ? `<div class="note bad">🔥 Your cover was burned in ${sp.burned.year}.</div>` : ''}
    ${sp.captive ? `<div class="note bad">⛓️ You are being held abroad.</div>` : ''}
    ${sp.disavowed ? `<div class="note bad">📁 Your agency has disavowed you.</div>` : ''}
    ${sp.defected ? `<div class="note bad">🛫 You defected in ${sp.defected}.</div>` : ''}
  </div>`;
  const rows = [];
  if (sp.missions.length) rows.push(itemRow({ a: 'sheet', ds: { k: 'dossier' }, ico: '📓', t: 'Mission dossier', s: `${nOf(sp.missions.length, 'mission')} on file`, chev: true }));
  if (sp.assets.length) rows.push(itemRow({ a: 'sheet', ds: { k: 'assets' }, ico: '🗝️', t: 'Your network', s: `${nOf(live.length, 'active asset')} · ${sp.assets.length} in all`, chev: true }));
  if (rows.length) html += `<div class="list" style="margin-bottom:12px">${rows.join('')}</div>`;
  return html + '<div class="section-title">What will you do?</div>';
}

// The Work sheet's list of what you do for the agency.
function spySection() {
  const c = M(G).career, sp = spy(G);
  if (!c || !sp || !isSpyJob(c.id)) return '';
  const C = coverOf(G);
  const rows = [kvRow('Agency', esc(cap(sp.agency))), kvRow('Cover story', `${emo(C.emoji, 16)} ${esc(C.name)}`), kvRow('Missions', `${sp.ok} done`)];
  return `<div class="section-title">Your service</div><div class="card">${rows.join('')}</div><div class="list" style="margin-top:8px">${itemRow({ a: 'sheet', ds: { k: 'actcat', arg: 'spy' }, ico: '🕵️', t: 'Intelligence', s: 'Missions, cover and your network', chev: true })}</div>`;
}

SHEETS.dossier = () => {
  const sp = spy(G);
  if (!sp) return { title: 'Mission dossier', html: '<div class="empty">You have no file.</div>' };
  const icons = { success: '✅', partial: '🟡', blown: '🔥', captured: '⛓️', killed: '⚰️' };
  const rows = sp.missions.slice().reverse().map((m) => itemRow({ ico: icons[m.result] || '📓', t: `${m.y} · ${esc(m.name)}`, s: `${m.state ? esc(m.state) + ' · ' : ''}${esc(m.result === 'success' ? 'clean' : m.result)}` }));
  return { title: 'Mission dossier', html: listOf(rows.join(''), 'No missions yet.') };
};
SHEETS.assets = () => {
  const sp = spy(G);
  if (!sp) return { title: 'Your network', html: '<div class="empty">You run no assets.</div>' };
  const words = { active: '', burned: ' · arrested', dead: ' · dead', turned: ' · double-crossed you', extracted: ' · brought home', dropped: ' · cut loose' };
  const rows = sp.assets.slice().reverse().map((a) => itemRow({ ico: a.state === 'active' ? '🗝️' : a.state === 'dead' ? '🕯️' : '📁', t: esc(a.name), s: `${esc(cap(a.role))} · since ${a.since} · ${'★'.repeat(a.value)}${a.state === 'active' ? ` · loyalty ${a.loyalty}%` : words[a.state] || ''}` }));
  return { title: 'Your network', html: listOf(rows.join(''), 'No assets yet.') };
};
