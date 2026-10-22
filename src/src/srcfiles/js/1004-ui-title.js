/* =====================================================================
 * 1004-ui-title.js — the title screen, starting a life (random or custom),
 * saved lives, the Hall of Lives, and achievements.
 * ===================================================================== */

let SAVE_INDEX = []; // cached list of saves for the title screen

// The title screen's family portrait: one fixed cast, so the first screen looks the same every time.
const TITLE_CAST = [
  { left: 38, size: 160, z: 1, age: 34, look: { skin: 6, face: 'square', hair: 'braids', hairColor: 'black', eyes: 'almond', eyeColor: 'dark', brows: 'thick', nose: 'wide', mouth: 'grin', facial: 'goatee', outfit: 'hoodie', outfitColor: '#3F6FD8', build: 'broad' } },
  { left: 176, size: 156, z: 1, age: 31, look: { skin: 3, face: 'oval', headwear: 'hijab', headwearColor: '#2BB3A3', eyes: 'almond', eyeColor: 'brown', brows: 'arched', nose: 'straight', mouth: 'smile', lashes: true, outfit: 'blazer', outfitColor: '#F2B33D' } },
  { left: -31, size: 150, z: 2, age: 78, look: { skin: 1, face: 'round', hair: 'bun', hairColor: 'white', eyes: 'downturned', eyeColor: 'blue', brows: 'thin', nose: 'round', mouth: 'smile', glasses: 'round', glassesColor: '#B07A3A', earrings: 'studs', outfit: 'collar', outfitColor: '#B58BD9', blush: true } },
  { left: 244, size: 156, z: 2, age: 16, look: { skin: 4, face: 'oval', hair: 'curls', hairColor: 'espresso', eyes: 'round', eyeColor: 'hazel', brows: 'natural', nose: 'soft', mouth: 'smirk', headwear: 'beanie', headwearColor: '#4FA8FF', outfit: 'tee', outfitColor: '#FF7A59', freckles: true } },
  { left: 126, size: 120, z: 3, age: 7, bottom: -4, look: { skin: 0, face: 'round', hair: 'ponytail', hairColor: 'black', eyes: 'monolid', eyeColor: 'dark', brows: 'natural', nose: 'soft', mouth: 'laugh', outfit: 'tee', outfitColor: '#34D399' } },
];
let TITLE_HERO = '';
SCREENS.title = () => {
  const last = SAVE_INDEX.find((x) => !x.dead);
  const unlocked = Object.keys(META.achievements).length;
  if (!TITLE_HERO) {
    TITLE_HERO = TITLE_CAST.map((c) => `<div class="who" style="left:${c.left}px;bottom:${c.bottom || 0}px;z-index:${c.z}">${avatarSVG(c.look, { age: c.age, frame: 'none', size: c.size, label: '' })}</div>`).join('')
      + [['health', 22, 22, -10, 28], ['coin', 96, 14, 6, 24], ['gradcap', null, 12, -7, 24, 100], ['fame', null, 30, 9, 28, 26]].map(([n, l, t, r, s, right]) => `<span class="sticker" style="${l !== null ? `left:${l}px` : `right:${right}px`};top:${t}px;transform:rotate(${r}deg)">${icon(n, s)}</span>`).join('');
  }
  const tiles = [
    SAVE_INDEX.length ? ['saves', 'scroll', 'Saved lives', SAVE_INDEX.length] : null,
    ['graveyard', 'laurel', 'Hall of Lives', META.graveyard.length || ''],
    ['achievements', 'trophy', 'Achievements', `${unlocked}/${ACHIEVEMENTS.length}`],
    ['settings', 'gear', 'Settings', ''],
  ].filter(Boolean);
  return `<div class="title-screen scroll">
    <section class="title-hero" aria-label="A family of ByteLyfe characters"><div class="halo a"></div><div class="halo b"></div>${TITLE_HERO}</section>
    <div class="title-brand">
      <div class="logo-row">${icon('logo', 50)}<h1 class="logo" style="margin:0">Byte<span>Lyfe</span></h1></div>
      <div class="tagline">Every life. Every choice. No paywalls.</div>
    </div>
    <div class="title-actions">
      ${last ? `<button class="continue-card" data-a="loadLife" data-id="${esc(last.id)}">${last.look ? avatarSVG(last.look, { age: last.age, frame: 'squircle', size: 52, label: last.name }) : icon('logo', 52)}<span class="grow"><span class="k">Continue</span><div class="nm">${esc(last.name)}</div><div class="sb">Age ${last.age}${last.job ? ' · ' + esc(last.job) : ''} · Gen ${last.gen}</div></span><span class="faint">${icon('ui-chev', 22)}</span></button>` : ''}
      <button class="btn primary block" data-a="newRandom">${icon('dice', 28)}Start a new life</button>
      <button class="btn block" data-a="sheet" data-k="custom">${icon('wand', 28)}Design a custom life</button>
      <div class="title-tiles" style="grid-template-columns:repeat(${tiles.length}, minmax(0, 1fr))">${tiles.map(([k, ic, l, n]) => `<button data-a="sheet" data-k="${k}">${icon(ic, 32)}<span>${l}${n !== '' ? ` <span class="faint">${n}</span>` : ''}</span></button>`).join('')}</div>
    </div>
    <div class="title-foot">Everything is free and unlocked, including God Mode and the Time Machine. Saved in your browser · ${esc(Store.kind() === 'kv' ? 'Perchance storage' : Store.kind() === 'local' ? 'local storage' : 'memory only')}</div>
  </div>`;
};

async function refreshSaveIndex() { SAVE_INDEX = await listLives(); }
function startLife(s) {
  G = s;
  UI.screen = 'game';
  UI.logAll = false;
  closeSheets();
  UI.scrollLog = true;
  refresh();
  saveNow();
}
CLICK.newRandom = async () => {
  await saveNow();
  startLife(createLife({}));
};
CLICK.loadLife = async (el, ds) => {
  const s = await loadLife(ds.id);
  if (!s) return toast('That save could not be loaded.');
  G = s;
  UI.screen = G.dead ? 'death' : 'game';
  UI.logAll = false;
  closeSheets();
  UI.scrollLog = true;
  refresh();
};

/* ---- custom life ---------------------------------------------------- */
// look: the creator's draft (1008-ui-look.js); lookSaved once the player pressed "Use this look".
const CUSTOM = { first: '', last: '', gender: 'f', orient: 'straight', country: 'us', city: '', year: 0, wealth: 'random', traits: [], stats: null, look: null, lookSaved: false };
function customPreviewLook() {
  if (!CUSTOM.look) CUSTOM.look = randomLook({ gender: CUSTOM.gender, country: CUSTOM.country }, { age: 0 });
  return CUSTOM.look;
}
// A new gender or country rerolls the look, unless the player designed one.
function customLookChanged() { if (!CUSTOM.lookSaved) CUSTOM.look = null; }
SHEETS.custom = () => {
  const C = COUNTRIES[CUSTOM.country];
  if (!CUSTOM.year) CUSTOM.year = new Date().getFullYear();
  if (!CUSTOM.first) CUSTOM.first = randomFirst(CUSTOM.country, CUSTOM.gender);
  if (!CUSTOM.last) CUSTOM.last = randomLast(CUSTOM.country);
  const sel = (id, opts, val) => `<select data-in="cust" data-k="${id}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  const st = CUSTOM.stats;
  return {
    title: 'Custom life',
    html: `<div class="card" style="display:flex;align-items:center;gap:14px;margin-bottom:14px">${avatarSVG(customPreviewLook(), { age: 30, frame: 'squircle', size: 72, label: 'Your character, grown up' })}<div class="grow"><b>Appearance</b><div class="muted" style="font-size:0.86em">${CUSTOM.lookSaved ? 'Designed by you. Shown grown up.' : 'Rolled at random. Shown grown up.'}</div></div><button class="btn sm" data-a="sheet" data-k="look" data-arg="custom">${icon('ui-edit', 18)}Edit</button></div>
      <div class="field"><label>Name</label><div class="field-row"><input data-in="cust" data-k="first" value="${esc(CUSTOM.first)}" maxlength="24" placeholder="First"><input data-in="cust" data-k="last" value="${esc(CUSTOM.last)}" maxlength="24" placeholder="Last"><button class="icon-btn" data-a="custRoll" aria-label="Random name">${icon('dice', 26)}</button></div></div>
      <div class="field"><label>Gender</label><div class="seg">${[['f', 'Female'], ['m', 'Male'], ['x', 'Nonbinary']].map(([v, l]) => `<button class="${CUSTOM.gender === v ? 'on' : ''}" data-a="custSet" data-k="gender" data-v="${v}">${l}</button>`).join('')}</div></div>
      <div class="field"><label>Attracted to</label>${sel('orient', Object.keys(ORIENTATIONS).map((k) => [k, ORIENTATIONS[k].name]), CUSTOM.orient)}</div>
      <div class="field"><label>Country</label>${sel('country', COUNTRY_IDS.map((k) => [k, COUNTRIES[k].flag + ' ' + COUNTRIES[k].name]), CUSTOM.country)}</div>
      <div class="field"><label>City</label>${sel('city', [['', 'Random']].concat(C.cities.map((c) => [c, c])), CUSTOM.city)}</div>
      <div class="field-row"><div class="field grow"><label>Birth year</label><input type="number" data-in="cust" data-k="year" value="${CUSTOM.year}" min="1900" max="2200"></div>
      <div class="field grow"><label>Family</label>${sel('wealth', [['random', 'Random']].concat(WEALTH_IDS.map((k) => [k, WEALTH[k].name]), C.monarchy ? [['royal', '👑 Royal family']] : []), CUSTOM.wealth)}</div></div>
      ${C.monarchy ? '' : '<div class="note" style="margin-top:-6px">Royal families: pick the United Kingdom, Spain, Sweden or Japan.</div>'}
      <div class="field"><label>Personality (up to 3)</label><div class="chips">${TRAIT_IDS.map((t) => `<button class="chip ${CUSTOM.traits.includes(t) ? 'on' : ''}" data-a="custTrait" data-t="${t}" title="${esc(TRAITS[t].desc)}">${emo(TRAITS[t].emoji, 18)}${esc(TRAITS[t].name)}</button>`).join('')}</div><div class="note">Leave empty to inherit traits from your parents.</div></div>
      ${godOn() ? `<div class="field"><label class="row"><span class="grow">Set starting stats (God Mode)</span><button class="switch ${st ? 'on' : ''}" data-a="custStats" aria-label="Set starting stats"></button></label>
      ${st ? ['happy', 'health', 'smarts', 'looks'].map((k) => `<div class="slider-row"><span>${icon(STAT_ICONS[k], 20)} ${STAT_INFO[k].name}</span><input type="range" min="0" max="100" value="${st[k]}" data-in="custStat" data-k="${k}"><b id="cs-${k}">${st[k]}</b></div>`).join('') : '<div class="note">Off: your stats are rolled from your parents.</div>'}</div>` : ''}
      <button class="btn primary block" data-a="custStart">${icon('rattle', 26)}Be born</button>`,
  };
};
INPUT.cust = (el, ds) => {
  const k = ds.k;
  CUSTOM[k] = k === 'year' ? clamp(Number(el.value) || new Date().getFullYear(), 1900, 2200) : el.value;
  if (k === 'country') { CUSTOM.city = ''; CUSTOM.first = randomFirst(CUSTOM.country, CUSTOM.gender); CUSTOM.last = randomLast(CUSTOM.country); if (CUSTOM.wealth === 'royal' && !COUNTRIES[CUSTOM.country].monarchy) CUSTOM.wealth = 'random'; customLookChanged(); renderSheet(); }
};
CLICK.custSet = (el, ds) => { CUSTOM[ds.k] = ds.v; if (ds.k === 'gender') { CUSTOM.first = randomFirst(CUSTOM.country, ds.v); customLookChanged(); } renderSheet(); };
CLICK.custRoll = () => { CUSTOM.first = randomFirst(CUSTOM.country, CUSTOM.gender); CUSTOM.last = randomLast(CUSTOM.country); renderSheet(); };
CLICK.custTrait = (el, ds) => {
  const t = ds.t;
  if (CUSTOM.traits.includes(t)) CUSTOM.traits = CUSTOM.traits.filter((x) => x !== t);
  else if (CUSTOM.traits.length >= 3) return toast('Pick up to three traits.');
  else if (traitsConflict(CUSTOM.traits, t)) return toast("That trait clashes with one you've picked.");
  else CUSTOM.traits.push(t);
  renderSheet();
};
CLICK.custStats = () => { CUSTOM.stats = CUSTOM.stats ? null : { happy: 80, health: 90, smarts: 60, looks: 60 }; renderSheet(); };
INPUT.custStat = (el, ds) => { CUSTOM.stats[ds.k] = Number(el.value); const v = $('#cs-' + ds.k); if (v) v.textContent = el.value; };
CLICK.custStart = async () => {
  await saveNow();
  const o = { first: cleanName(CUSTOM.first), last: cleanName(CUSTOM.last), gender: CUSTOM.gender, orient: CUSTOM.orient, country: CUSTOM.country, city: CUSTOM.city || undefined, year: CUSTOM.year, wealth: ['random', 'royal'].includes(CUSTOM.wealth) ? undefined : CUSTOM.wealth, royal: CUSTOM.wealth === 'royal', traits: CUSTOM.traits.slice() };
  if (CUSTOM.stats && godOn()) Object.assign(o, CUSTOM.stats);
  if (CUSTOM.lookSaved && CUSTOM.look) o.look = Object.assign({}, CUSTOM.look);
  CUSTOM.first = '';
  CUSTOM.last = '';
  CUSTOM.look = null;
  CUSTOM.lookSaved = false;
  startLife(createLife(o));
};

/* ---- saved lives ---------------------------------------------------- */
SHEETS.saves = () => {
  if (!SAVE_INDEX.length) return { title: 'Saved lives', html: '<div class="empty">No saved lives yet.</div>' };
  return {
    title: 'Saved lives',
    html: `<div class="list">${SAVE_INDEX.map((x) => `<div class="item"><button class="row grow" data-a="loadLife" data-id="${esc(x.id)}" style="text-align:left"><span class="ico">${x.dead ? icon('dove', 28) : emo(x.flag || '🙂', 26)}</span><span class="main"><span class="t">${esc(x.name)}</span><span class="s" style="display:block">${x.dead ? 'Ended' : 'Age ' + x.age} · ${esc(x.job || '')} · Gen ${x.gen} · ${fmtMoneyShort(x.money || 0)}</span></span></button><button class="icon-btn" data-a="delLife" data-id="${esc(x.id)}" aria-label="Delete">🗑️</button></div>`).join('')}</div>`,
  };
};
CLICK.delLife = async (el, ds) => {
  if (!confirm('Delete this saved life? This cannot be undone.')) return;
  await deleteLife(ds.id);
  await refreshSaveIndex();
  if (G && G.id === ds.id) G = null;
  refresh();
};

/* ---- hall of lives & achievements ------------------------------------ */
SHEETS.graveyard = () => {
  const g = META.graveyard;
  if (!g.length) return { title: 'Hall of lives', html: '<div class="empty">Lives you finish will be remembered here.</div>' };
  return {
    title: 'Hall of lives',
    html: `<div class="note">${g.length} ${plural(g.length, 'life', 'lives')} lived. Average age ${Math.round(sum(g, (x) => x.age) / g.length)}.</div><div class="list">${g.slice(0, 150).map((r) => itemRow({ ico: r.titleEmoji || '⚰️', t: `${esc(r.name)} <span class="faint">${r.born}–${r.died}</span>`, s: `${esc(r.title)} · died ${esc(deathPhrase(r.cause))} at ${r.age} · ${fmtMoneyShort(r.worth, META.settings.currency === 'usd' ? null : curFmt(curOf(r.country)))}${r.gen > 1 ? ' · gen ' + r.gen : ''}` })).join('')}</div>`,
  };
};
SHEETS.achievements = () => {
  const got = META.achievements;
  const n = Object.keys(got).length;
  return {
    title: `Achievements ${n}/${ACHIEVEMENTS.length}`,
    html: `<div class="list">${ACHIEVEMENTS.map((a) => itemRow({ ico: got[a.id] ? a.emoji : '🔒', t: esc(a.name), s: esc(achDesc(a, G)), cls: got[a.id] ? '' : 'disabled', end: got[a.id] ? '✓' : '' })).join('')}</div>`,
  };
};
