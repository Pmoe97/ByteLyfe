/* =====================================================================
 * 1000-ui-kit.js — the UI's plumbing: render loop, sheets (stacked panels),
 * the popup dialog, toasts, click delegation, and shared HTML builders.
 *
 * SCREENS[name]() -> html   the main screen (title | game | death)
 * SHEETS[kind](arg) -> { title, html }   panels that slide up over the game
 * CLICK[name](el, dataset)  handlers for [data-a="name"] buttons
 * INPUT[name](el, dataset)  handlers for [data-in="name"] inputs/sliders
 * ===================================================================== */

const $ = (sel, el) => (el || document).querySelector(sel);
const UI = { screen: 'title', sheets: [], logAll: false, scrollLog: false, jbQualified: true };
const SCREENS = {};
const SHEETS = {};
const CLICK = {};
const INPUT = {};

function refresh() {
  useCurrency(G);
  if (G && G.dead && !G.pending.length && UI.screen === 'game') UI.screen = 'death';
  if (G && !G.dead && UI.screen === 'death') UI.screen = 'game';
  // Just turned 18 and chose to redesign: open the editor once the popups are done.
  if (G && UI.screen === 'game' && M(G).freeRestyle && !G.pending.length && !UI.sheets.length && UI.restyleShown !== G.id + ':' + G.year) {
    UI.restyleShown = G.id + ':' + G.year;
    UI.sheets.push({ kind: 'look', arg: undefined, scroll: 0 });
    UI.sheetAnim = 'open';
  }
  raceHook(); // a race to watch (1021-ui-gambling.js)
  renderScreen();
  renderSheet();
  renderModal();
  scheduleSave();
}
function renderScreen() {
  const app = $('#app');
  const fn = SCREENS[UI.screen] || SCREENS.title;
  app.innerHTML = fn();
  if (UI.screen === 'game' && UI.scrollLog) {
    const log = $('#log');
    if (log) log.scrollTop = log.scrollHeight;
    UI.scrollLog = false;
  }
}

/* ---- sheets -------------------------------------------------------- */
function openSheet(kind, arg) {
  saveSheetScroll();
  UI.sheets.push({ kind, arg, scroll: 0 });
  UI.sheetAnim = UI.sheets.length === 1 ? 'open' : 'push';
  renderSheet();
}
function replaceSheet(kind, arg) { UI.sheets.pop(); openSheet(kind, arg); }
function backSheet() { UI.sheets.pop(); renderSheet(); }
function closeSheets() { UI.sheets = []; renderSheet(); }
function saveSheetScroll() {
  const top = UI.sheets[UI.sheets.length - 1];
  const body = $('#sheet-root .sheet-body');
  if (top && body) top.scroll = body.scrollTop;
}
function renderSheet() {
  const root = $('#sheet-root');
  const top = UI.sheets[UI.sheets.length - 1];
  if (!top) { root.innerHTML = ''; return; }
  const body = $('#sheet-root .sheet-body');
  const keep = body && root.dataset.kind === top.kind + ':' + (top.arg ?? '') ? body.scrollTop : top.scroll;
  let view;
  try { view = SHEETS[top.kind](top.arg); } catch (e) { console.error('[ByteLyfe] sheet failed', top.kind, e); view = { title: 'Oops', html: '<div class="empty">Something went wrong here.</div>' }; }
  if (!view) { UI.sheets.pop(); renderSheet(); return; }
  root.dataset.kind = top.kind + ':' + (top.arg ?? '');
  const anim = UI.sheetAnim || '';
  UI.sheetAnim = '';
  root.innerHTML = `<div class="sheet-wrap"><div class="sheet-scrim ${anim === 'open' ? 'anim' : ''}" data-a="sheetClose"></div><div class="sheet ${anim ? 'anim-' + anim : ''}" role="dialog" aria-label="${esc(view.title)}">
    <div class="sheet-head">
      ${UI.sheets.length > 1 ? `<button class="icon-btn" data-a="sheetBack" aria-label="Back">${icon('ui-back', 22)}</button>` : ''}
      <h2>${esc(view.title)}</h2>
      <button class="icon-btn" data-a="sheetClose" aria-label="Close">${icon('ui-close', 20)}</button>
    </div>
    <div class="sheet-body scroll">${view.html}</div>
  </div></div>`;
  const nb = $('#sheet-root .sheet-body');
  if (nb) nb.scrollTop = keep || 0;
}
CLICK.sheet = (el, ds) => openSheet(ds.k, ds.arg);
CLICK.sheetBack = () => backSheet();
CLICK.sheetClose = () => closeSheets();

/* ---- the popup dialog --------------------------------------------- */
function renderModal() {
  const root = $('#modal-root');
  if (!G || !G.pending.length) { root.innerHTML = ''; return; }
  const pp = G.pending[0];
  const single = pp.choices.length === 1;
  const who = pp.person && G.people[pp.person] ? G.people[pp.person] : null;
  // The art: the person involved (with the event's icon as a badge), or the
  // event's drawn icon, or its emoji when there is no drawing for it.
  const emIcon = pp.emoji ? emojiIcon(pp.emoji, 52) : '';
  const art = who
    ? `${personAvatar(who, 88, { frame: 'squircle' })}${pp.emoji ? `<span class="badge">${emojiIcon(pp.emoji, 24) || pp.emoji}</span>` : ''}`
    : emIcon || pp.emoji || icon('logo', 52);
  const r = who ? relOf(G, who.id) : null;
  root.innerHTML = `<div class="modal-wrap"><div class="modal ${esc(pp.tone)}" role="dialog" aria-modal="true"${pp.title ? ` aria-label="${esc(pp.title)}"` : ''}>
    <div class="modal-band"><div class="modal-art">${art}</div></div>
    <div class="modal-scroll">
      <div class="modal-top">
        ${pp.title ? `<h3 class="modal-title">${esc(pp.title)}</h3>` : ''}
        <p class="modal-text">${esc(pp.text)}</p>
        ${who ? `<div class="modal-person">${icon('health', 16)}<span>${esc(fullName(who))}${r ? ' · ' + esc(kinTitle(G, who.id)) : ''} · ${personAge(who)}</span>${r && who.alive ? `${bar(r.rel)}<span class="muted">${Math.round(r.rel)}%</span>` : ''}</div>` : ''}
        ${pp.deltas && pp.deltas.length ? `<div class="chips modal-deltas">${deltaChips(pp.deltas)}</div>` : ''}
      </div>
      ${pp.input ? `<div class="modal-input"><input id="pp-input" maxlength="${pp.input.max || 30}" value="${esc(pp.input.value || '')}" placeholder="${esc(pp.input.label || '')}" autocomplete="off"></div>` : ''}
      <div class="modal-choices">${pp.choices.map((c, i) => `<button class="choice ${single ? 'single' : ''} ${esc(c.tone || '')}" data-a="choose" data-id="${pp.id}" data-i="${i}" ${c.disabled ? 'disabled' : ''}>${emoLabel(c.label, 22)}${c.sub ? `<span class="cs">${esc(c.sub)}</span>` : ''}</button>`).join('')}</div>
    </div>
  </div></div>`;
  const inp = $('#pp-input');
  if (inp) { inp.focus(); inp.select(); }
}
CLICK.choose = (el, ds) => {
  const inp = $('#pp-input');
  resolvePopup(G, ds.id, Number(ds.i), inp ? inp.value : undefined);
  UI.scrollLog = true;
  refresh();
};

/* ---- toasts -------------------------------------------------------- */
function toast(msg) {
  const root = $('#toast-root');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  root.appendChild(el);
  setTimeout(() => el.remove(), 2400);
}

/* ---- delegation ---------------------------------------------------- */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-a]');
  if (!el || el.disabled) return;
  const fn = CLICK[el.dataset.a];
  if (!fn) return;
  e.preventDefault();
  try { fn(el, el.dataset, e); } catch (err) { console.error('[ByteLyfe]', err); toast('Something went wrong: ' + err.message); }
});
document.addEventListener('input', (e) => {
  const el = e.target.closest('[data-in]');
  if (!el) return;
  const fn = INPUT[el.dataset.in];
  if (fn) fn(el, el.dataset, e);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target && e.target.id === 'pp-input') {
    const b = document.querySelector('#modal-root .choice:not([disabled])');
    if (b) b.click();
  }
  if (e.key === 'Escape' && UI.sheets.length && !(G && G.pending.length)) backSheet();
});

/* ---- builders ------------------------------------------------------ */
function dataAttrs(ds) { return Object.entries(ds || {}).map(([k, v]) => ` data-${k}="${esc(v)}"`).join(''); }
function itemRow(o) {
  const tag = o.a ? 'button' : 'div';
  return `<${tag} class="item ${o.cls || ''}"${o.a ? ` data-a="${o.a}"` : ''}${dataAttrs(o.ds)}${o.disabled ? ' disabled' : ''}>
    ${o.ico !== undefined ? `<div class="ico ${o.round ? 'round' : ''}">${isEmoji(o.ico) ? emo(o.ico, 28) : o.ico}</div>` : ''}
    <div class="main"><div class="t">${o.t}</div>${o.s ? `<div class="s">${o.s}</div>` : ''}${o.extra || ''}</div>
    ${o.end ? `<div class="end">${o.end}</div>` : ''}${o.chev ? `<div class="chev">${icon('ui-chev', 20)}</div>` : ''}
  </${tag}>`;
}
function barLevel(v) { return v >= 66 ? '' : v >= 33 ? 'mid' : 'low'; }
function bar(v, cls) { return `<div class="bar ${cls ?? barLevel(v)}"><i style="width:${clamp(Math.round(v), 0, 100)}%"></i></div>`; }
// statLine takes a stat key ('happy') or, for older callers, an emoji.
const STAT_BY_EMOJI = { '😊': 'happy', '❤️': 'health', '🧠': 'smarts', '✨': 'looks', '☯️': 'karma', '⭐': 'fame' };
function statLine(key, v, cls) {
  const k = STAT_ICONS[key] ? key : STAT_BY_EMOJI[key];
  return `<div class="statline">${k ? icon(STAT_ICONS[k], 26) : emo(key, 24)}${bar(v, cls)}<span class="val">${Math.round(v)}%</span></div>`;
}
// The labelled stat used in the game's stats dock and on profiles.
function statCell(key, v, cls) {
  return `<div class="stat">${icon(STAT_ICONS[key], 28)}<div class="sw"><div class="sh"><span>${esc(STAT_INFO[key].name)}</span><b>${Math.round(v)}%</b></div>${bar(v, cls)}</div></div>`;
}
function kvRow(k, v) { return `<div class="kv"><span class="muted">${k}</span><b>${v}</b></div>`; }
function deltaChips(deltas) {
  return deltas.map(([k, d]) => {
    const good = k === 'money' ? d > 0 : d > 0;
    const val = k === 'money' ? (d > 0 ? '+' : '−') + fmtMoneyShort(Math.abs(d)).replace('-', '') : (d > 0 ? '+' : '−') + Math.abs(d);
    if ((k === 'karma' || k === 'fame') && !META.settings.showHidden) return '';
    return `<span class="chip ${good ? 'good' : 'bad'}" title="${esc(STAT_INFO[k].name)}">${icon(STAT_ICONS[k], 16)}${val}</span>`;
  }).join('');
}
// A person's portrait (SVG). Squircle by default, which is how rows and cards frame it.
function avatarOf(p, size, o) { return personAvatar(p, size || 44, Object.assign({ frame: 'squircle' }, o || {})); }
function actionRows(cat, target, filter) {
  const acts = actionList(G, cat, target).filter((a) => !filter || filter(a));
  return acts.map((a) => itemRow({ a: 'act', ds: { id: a.id, t: target ?? '' }, ico: a.emoji, t: esc(actionLabel(a, G, target)), s: esc(actionSub(a, G, target)) })).join('');
}
function listOf(rows, empty) { return rows ? `<div class="list">${rows}</div>` : `<div class="empty">${empty || 'Nothing here yet.'}</div>`; }
CLICK.act = (el, ds) => {
  if (!G || G.pending.length) return;
  doAction(G, ds.id, ds.t === '' || ds.t === undefined ? undefined : ds.t);
  UI.scrollLog = true;
  refresh();
};
// Run an engine function through the same result pipeline actions use.
function uiRun(fn, src) {
  if (!G || G.pending.length) return;
  runWithResult(G, fn, src || { emoji: '', title: '' });
  UI.scrollLog = true;
  refresh();
}

/* ---- settings ------------------------------------------------------ */
function applySettings() {
  const st = META.settings, root = document.documentElement;
  if (st.theme === 'light' || st.theme === 'dark') root.setAttribute('data-theme', st.theme);
  else root.removeAttribute('data-theme');
  try { localStorage.setItem('bytelyfe:theme', st.theme); } catch (e) { /* storage blocked */ }
  root.setAttribute('data-text', st.textSize || 'medium');
  if (st.reduceMotion) root.setAttribute('data-motion', 'reduce'); else root.removeAttribute('data-motion');
}

/* ---- saving -------------------------------------------------------- */
let _saveTimer = null;
function scheduleSave() {
  if (!G) return;
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => { _saveTimer = null; saveLife(G).catch((e) => console.warn('[ByteLyfe] save failed', e)); }, 700);
}
function saveNow() {
  if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null; }
  return G ? saveLife(G).catch((e) => console.warn('[ByteLyfe] save failed', e)) : Promise.resolve();
}
