/* =====================================================================
 * 1005-ui-system.js — the ☰ menu: family line, time machine, God Mode
 * sandbox, settings, export/import.
 * ===================================================================== */

SHEETS.menu = () => ({
  title: 'Menu',
  html: `<div class="list">
    ${itemRow({ a: 'sheet', ds: { k: 'profile' }, ico: avatarOf(P(G), 44), t: 'Profile', s: 'Look, traits, skills, health, record', chev: true })}
    ${itemRow({ a: 'sheet', ds: { k: 'goals' }, ico: icon('trophy', 30), t: 'Goals & achievements', s: `${M(G).goals.filter((g) => g.done).length}/${M(G).goals.length} life goals done`, chev: true })}
    ${itemRow({ a: 'sheet', ds: { k: 'lineage' }, ico: icon('tree', 30), t: 'Family line', s: `Generation ${G.gen}`, chev: true })}
    ${itemRow({ a: 'sheet', ds: { k: 'timemachine' }, ico: icon('hourglass', 30), t: 'Time machine', s: rewindDepth(G) ? `Go back up to ${nOf(rewindDepth(G), 'year')}` : 'Age up to build history', chev: true })}
    ${itemRow({ a: 'sheet', ds: { k: 'sandbox' }, ico: icon('crown', 30), t: 'God Mode', s: 'Edit stats, money, skills, looks and more', chev: true })}
    ${itemRow({ a: 'sheet', ds: { k: 'settings' }, ico: icon('gear', 30), t: 'Settings', s: 'Theme, text size, content, saves', chev: true })}
    ${itemRow({ a: 'toTitle', ico: icon('assets', 30), t: 'Save & exit to main menu' })}
  </div>`,
});

SHEETS.goals = () => {
  const mine = M(G).achievements.map((id) => ACHIEVEMENTS.find((a) => a.id === id)).filter(Boolean);
  return {
    title: 'Goals & achievements',
    html: `<div class="section-title">This life's goals</div>${goalsList()}
      <div class="section-title">Earned this life (${mine.length})</div>${mine.length ? `<div class="chips">${mine.map((a) => `<span class="chip">${emo(a.emoji, 18)}${esc(a.name)}</span>`).join('')}</div>` : '<div class="note">None yet.</div>'}
      <div class="section-title">All achievements</div><button class="btn block" data-a="sheet" data-k="achievements">🏅 ${Object.keys(META.achievements).length}/${ACHIEVEMENTS.length} unlocked</button>`,
  };
};

SHEETS.lineage = () => {
  const rows = G.lineage.map((r) => itemRow({ ico: r.titleEmoji || '⚰️', t: `<span class="gen-badge">Gen ${r.gen}</span> ${esc(r.name)}`, s: `${r.born}–${r.died} · ${esc(r.title)} · ${fmtMoneyShort(r.worth)}` })).join('');
  const p = P(G);
  const me = itemRow({ ico: avatarOf(p), t: `<span class="gen-badge">Gen ${G.gen}</span> ${esc(fullName(p))}`, s: `Born ${p.birthYear} · now ${A(G)} · you`, cls: 'good' });
  const kids = myChildren(G, { dead: true });
  return {
    title: 'Family line',
    html: `<div class="list">${rows}${me}</div>
      ${kids.length ? `<div class="section-title">Your children</div><div class="list">${kids.map((k) => itemRow({ a: 'sheet', ds: { k: 'person', arg: k.id }, ico: avatarOf(k), round: true, t: esc(fullName(k)), s: k.alive ? `age ${ageOf(G, k)}${npcJobTitle(k) ? ' · ' + esc(npcJobTitle(k)) : ''}` : 'deceased', chev: true })).join('')}</div>` : ''}
      <div class="note">When you die, you can continue the story as one of your children. Their inheritance follows your will (Activities → Identity & Legal).</div>`,
  };
};

SHEETS.timemachine = () => {
  const n = rewindDepth(G);
  if (!n) return { title: 'Time machine', html: '<div class="empty">No history yet. Every age-up saves a checkpoint (up to 10 years back).</div>' };
  const rows = [];
  for (let i = 1; i <= n; i++) rows.push(itemRow({ a: 'rewind', ds: { n: i }, ico: '⏪', t: `Go back ${nOf(i, 'year')}`, s: `Return to age ${A(G) - i}`, chev: true }));
  return { title: 'Time machine', html: `<div class="note">Rewinding undoes everything that happened since. Free, as many times as you like.</div><div class="list">${rows.join('')}</div>` };
};

/* ---- God Mode -------------------------------------------------------- */
SHEETS.sandbox = () => {
  const p = P(G), m = M(G);
  const slider = (k, v, name, emoji) => `<div class="slider-row"><span>${emoji} ${name}</span><input type="range" min="0" max="100" value="${Math.round(v)}" data-in="sbStat" data-k="${k}"><b id="sb-${k}">${Math.round(v)}</b></div>`;
  const jobOpts = JOB_IDS.map((id) => `<option value="${id}">${esc(JOBS[id].emoji + ' ' + JOBS[id].name)}</option>`).join('');
  const degOpts = Object.keys(DEGREE_NAMES).map((d) => `<option value="${d}">${esc(DEGREE_NAMES[d])}</option>`).join('');
  return {
    title: 'God Mode',
    html: `<div class="card"><div class="row"><span class="grow"><b>Edit relationships too</b><div class="muted">Shows a relationship slider on each person.</div></span><button class="switch ${META.settings.sandbox ? 'on' : ''}" data-a="setToggle" data-k="sandbox" aria-label="Relationship editing"></button></div></div>
      <div class="section-title">Stats</div><div class="card">
        ${['happy', 'health', 'smarts', 'looks'].map((k) => slider(k, p.stats[k], STAT_INFO[k].name, icon(STAT_ICONS[k], 18))).join('')}
        ${slider('karma', m.karma, 'Karma', icon('karma', 18))}${slider('fame', m.fame, 'Fame', icon('fame', 18))}
      </div>
      <div class="section-title">Money</div><div class="card"><div class="field-row"><input type="number" id="sb-money" value="${Math.round(m.money)}"><button class="btn primary" data-a="sbMoney">Set</button></div>
        <div class="chips" style="margin-top:10px">${[1000, 100000, 1000000, 1e9].map((v) => `<button class="chip" data-a="sbAddMoney" data-v="${v}">+${fmtMoneyShort(v)}</button>`).join('')}</div></div>
      <div class="section-title">Skills</div><div class="card">${SKILL_IDS.map((k) => `<div class="slider-row"><span>${emo(SKILLS[k].emoji, 18)} ${SKILLS[k].name}</span><input type="range" min="0" max="100" value="${Math.round(m.skills[k] || 0)}" data-in="sbSkill" data-k="${k}"><b id="sbs-${k}">${Math.round(m.skills[k] || 0)}</b></div>`).join('')}</div>
      <div class="section-title">Personality</div><div class="chips">${TRAIT_IDS.map((t) => `<button class="chip ${p.traits.includes(t) ? 'on' : ''}" data-a="sbTrait" data-t="${t}">${emo(TRAITS[t].emoji, 18)}${esc(TRAITS[t].name)}</button>`).join('')}</div>
      <div class="section-title">Appearance</div><div class="list">${itemRow({ a: 'sheet', ds: { k: 'look', arg: 'god' }, ico: avatarOf(p, 44), t: 'Edit appearance' + (A(G) >= ADULT_AGE ? ' and body' : ''), s: 'Every feature, unlocked', chev: true })}</div>
      <div class="section-title">Instant fixes</div><div class="list">
        ${itemRow({ a: 'sbDo', ds: { f: 'cureAll' }, ico: '💊', t: 'Cure every illness and habit' })}
        ${itemRow({ a: 'sbDo', ds: { f: 'freeMe' }, ico: '🔓', t: 'Get out of jail free', s: 'Also clears fugitive status' })}
        ${itemRow({ a: 'sbDo', ds: { f: 'clearRecord' }, ico: '🧼', t: 'Clear criminal record' })}
        ${itemRow({ a: 'sbDo', ds: { f: 'giveLicense' }, ico: '🚗', t: "Give me a driver's license" })}
        ${itemRow({ a: 'sbDo', ds: { f: 'rerollGoals' }, ico: '🎯', t: 'Reroll life goals' })}
      </div>
      <div class="section-title">Instant career</div><div class="card"><div class="field"><select id="sb-job">${jobOpts}</select></div><div class="field-row"><input type="number" id="sb-level" value="0" min="0" max="6" placeholder="Level"><button class="btn primary" data-a="sbHire">Hire me</button></div><div class="note">Level 0 is the bottom rung. Skips requirements and school.</div></div>
      <div class="section-title">Instant degree</div><div class="card"><div class="field"><select id="sb-deg">${degOpts}</select></div><div class="field"><select id="sb-major"><option value="">(no major)</option>${MAJOR_IDS.map((k) => `<option value="${k}">${esc(MAJORS[k].name)}</option>`).join('')}${TRADE_IDS.map((k) => `<option value="${k}">${esc(TRADES[k].name)} (trade)</option>`).join('')}</select></div><button class="btn primary block" data-a="sbDegree">Grant degree</button></div>`,
  };
};
INPUT.sbStat = (el, ds) => { Sandbox.setStat(G, ds.k, Number(el.value)); const v = $('#sb-' + ds.k); if (v) v.textContent = el.value; renderScreen(); scheduleSave(); };
INPUT.sbSkill = (el, ds) => { Sandbox.setSkill(G, ds.k, Number(el.value)); const v = $('#sbs-' + ds.k); if (v) v.textContent = el.value; scheduleSave(); };
CLICK.sbMoney = () => { Sandbox.setMoney(G, Number($('#sb-money').value)); refresh(); toast('Money set.'); };
CLICK.sbAddMoney = (el, ds) => { Sandbox.setMoney(G, M(G).money + Number(ds.v)); refresh(); toast('+' + fmtMoneyShort(Number(ds.v))); };
CLICK.sbTrait = (el, ds) => { Sandbox.toggleTrait(G, ds.t); refresh(); };
CLICK.sbDo = (el, ds) => { Sandbox[ds.f](G); afterChange(G); refresh(); toast('Done.'); };
CLICK.sbHire = () => {
  const id = $('#sb-job').value, lvl = Number($('#sb-level').value) || 0;
  if (inPrison(G)) Sandbox.freeMe(G);
  Sandbox.hireAt(G, id, lvl);
  afterChange(G);
  refresh();
  toast('You are now a ' + careerTitle(G) + '.');
};
CLICK.sbDegree = () => { Sandbox.grantDegree(G, $('#sb-deg').value, $('#sb-major').value || null); afterChange(G); refresh(); toast('Degree granted.'); };

/* ---- settings -------------------------------------------------------- */
SHEETS.settings = () => {
  const st = META.settings;
  const seg = (k, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${st[k] === v ? 'on' : ''}" data-a="setSeg" data-k="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const toggle = (k, name, sub) => `<div class="kv" style="align-items:center"><span><b>${name}</b>${sub ? `<br><span class="muted" style="font-size:.85em">${sub}</span>` : ''}</span><button class="switch ${st[k] ? 'on' : ''}" data-a="setToggle" data-k="${k}" aria-label="${esc(name)}"></button></div>`;
  return {
    title: 'Settings',
    html: `<div class="section-title">Look</div><div class="card">
        <div class="field"><label>Theme</label>${seg('theme', [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']])}</div>
        <div class="field"><label>Text size</label>${seg('textSize', [['small', 'Small'], ['medium', 'Medium'], ['large', 'Large']])}</div>
      </div>
      <div class="section-title">Gameplay</div><div class="card">
        ${toggle('showHidden', 'Show karma & fame', 'Karma is hidden in some life sims. Not here.')}
        ${toggle('autoPopups', 'Pop up every event', 'Off: small happenings only appear in your life log.')}
        ${toggle('confirmAge', 'Confirm before aging up')}
        ${toggle('reduceMotion', 'Reduce motion')}
      </div>
      <div class="section-title">Content</div><div class="card">
        ${Object.keys(CONTENT_TAGS).map((k) => toggle(k, `${emo(CONTENT_TAGS[k].emoji, 18)} ${CONTENT_TAGS[k].name}`, CONTENT_TAGS[k].desc)).join('')}
      </div>
      <div class="note">Off by default. These apply to every life and kick in from the next thing that happens.</div>
      <div class="section-title">Your data</div><div class="list">
        ${G ? itemRow({ a: 'exportLife', ico: '📤', t: 'Export this life', s: 'Copy a backup code you can paste anywhere' }) : ''}
        ${itemRow({ a: 'sheet', ds: { k: 'import' }, ico: '📥', t: 'Import a life', s: 'Paste a backup code', chev: true })}
        ${itemRow({ a: 'wipeAll', ico: '🧨', t: 'Delete all ByteLyfe data', s: 'Saves, achievements, Hall of Lives', cls: 'bad' })}
      </div>
      <div class="note">Storage: ${esc(Store.kind() === 'kv' ? 'Perchance kv storage (this browser)' : Store.kind() === 'local' ? 'browser local storage' : 'memory only (nothing will be saved!)')}.</div>
      <div id="export-box"></div>`,
  };
};
CLICK.setSeg = (el, ds) => { META.settings[ds.k] = ds.v; applySettings(); saveMetaSoon(); refresh(); };
CLICK.setToggle = (el, ds) => { META.settings[ds.k] = !META.settings[ds.k]; applySettings(); saveMetaSoon(); refresh(); };
CLICK.exportLife = () => {
  const code = exportLife(G);
  const box = $('#export-box');
  if (box) box.innerHTML = `<div class="section-title">Backup code</div><textarea id="export-code" rows="5" readonly>${esc(code)}</textarea><button class="btn block" data-a="copyExport" style="margin-top:8px">📋 Copy</button>`;
  const ta = $('#export-code');
  if (ta) { ta.focus(); ta.select(); }
};
CLICK.copyExport = async () => {
  const ta = $('#export-code');
  if (!ta) return;
  try { await navigator.clipboard.writeText(ta.value); toast('Copied!'); } catch (e) { ta.select(); document.execCommand && document.execCommand('copy'); toast('Copied (or select and copy manually).'); }
};
SHEETS.import = () => ({
  title: 'Import a life',
  html: `<div class="field"><label>Backup code</label><textarea id="import-code" rows="7" placeholder="BYTELYFE1:..."></textarea></div><button class="btn primary block" data-a="doImport">📥 Import</button><div class="note">Imports as a new saved life. Your current lives are untouched.</div>`,
});
CLICK.doImport = async () => {
  const s = importLife($('#import-code').value);
  if (!s) return toast("That code didn't work.");
  await saveNow();
  G = s;
  await saveLife(G);
  await refreshSaveIndex();
  UI.screen = G.dead ? 'death' : 'game';
  closeSheets();
  UI.scrollLog = true;
  refresh();
  toast('Life imported!');
};
CLICK.wipeAll = async () => {
  if (!confirm('Delete ALL ByteLyfe saves, achievements and history? This cannot be undone.')) return;
  for (const x of await listLives()) await deleteLife(x.id);
  META.achievements = {};
  META.graveyard = [];
  await Promise.all([setJSON('meta', 'achievements', {}), setJSON('meta', 'graveyard', []), setJSON('meta', 'index', [])]);
  G = null;
  SAVE_INDEX = [];
  UI.screen = 'title';
  closeSheets();
  refresh();
  toast('Everything was deleted.');
};
