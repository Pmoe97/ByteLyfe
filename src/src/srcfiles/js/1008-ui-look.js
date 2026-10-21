/* =====================================================================
 * 1008-ui-look.js — the appearance editor (sheet 'look').
 *
 *   SHEETS.look()          your look in normal play: hair, clothes and
 *                          extras any time; adults see their body and what
 *                          changes it (diet, exercise, surgery)
 *   SHEETS.look('god')     God Mode: everything, body sliders included
 *   SHEETS.look('custom')  a custom life's baby, before birth (no body)
 * While M(G).freeRestyle is set (just turned 18) normal play also unlocks
 * the face and the body once. Bodies only exist for adults (36-looks.js).
 * The draft lives on the sheet's stack entry, so reopening starts fresh.
 * ===================================================================== */

const LOOK_TABS = [
  { id: 'hair', label: 'Hair', icon: 'part-hair', crop: 'hair', key: 'hair', colors: 'hairColor' },
  { id: 'facial', label: 'Beard', icon: 'part-beard', crop: 'head', key: 'facial', minAge: 16 },
  { id: 'extras', label: 'Extras', icon: 'part-glasses', crop: 'head', extras: true },
  { id: 'outfit', label: 'Top', icon: 'part-shirt', crop: 'bust', key: 'outfit', colors: 'outfitColor' },
  { id: 'bottom', label: 'Bottoms', icon: 'part-pants', bottoms: true, adultOnly: true },
  { id: 'body', label: 'Body', icon: 'part-body', body: true, adultOnly: true },
  { id: 'skin', label: 'Skin', icon: 'part-skin', crop: 'head', key: 'skin', locked: true, toggles: [['freckles', 'Freckles'], ['blush', 'Rosy cheeks']] },
  { id: 'face', label: 'Face', icon: 'part-face', crop: 'head', key: 'face', locked: true },
  { id: 'eyes', label: 'Eyes', icon: 'part-eye', crop: 'eyes', key: 'eyes', colors: 'eyeColor', locked: true, toggles: [['lashes', 'Lashes']] },
  { id: 'brows', label: 'Brows', icon: 'part-brow', crop: 'brows', key: 'brows', locked: true },
  { id: 'nose', label: 'Nose', icon: 'part-nose', crop: 'nose', key: 'nose', locked: true },
  { id: 'mouth', label: 'Mouth', icon: 'part-mouth', crop: 'mouth', key: 'mouth', locked: true },
];
const LOOK_NAMES = {
  crop: 'Short crop', sidepart: 'Side part', buzz: 'Buzz cut', curls: 'Curls', afro: 'Afro', pixie: 'Pixie', bob: 'Bob', long: 'Long', wavy: 'Wavy', ponytail: 'Ponytail', bun: 'Top bun', braids: 'Braids', receding: 'Receding', bald: 'Bald',
  oval: 'Oval', round: 'Round', square: 'Square', heart: 'Heart', almond: 'Almond', upturned: 'Upturned', downturned: 'Downturned', hooded: 'Hooded', monolid: 'Monolid',
  natural: 'Natural', straight: 'Straight', arched: 'Arched', thick: 'Thick', thin: 'Thin', angled: 'Angled', soft: 'Soft', button: 'Button', wide: 'Wide', pointed: 'Pointed',
  smile: 'Smile', grin: 'Grin', neutral: 'Calm', smirk: 'Smirk', laugh: 'Laugh', full: 'Full',
  none: 'None', stubble: 'Stubble', mustache: 'Mustache', goatee: 'Goatee', beard: 'Short beard',
  tee: 'T-shirt', vneck: 'V-neck', hoodie: 'Hoodie', collar: 'Button-up', sweater: 'Turtleneck', scoop: 'Scoop neck', tank: 'Tank top', blazer: 'Blazer', suit: 'Suit and tie',
  jeans: 'Jeans', trousers: 'Trousers', skirt: 'Skirt', shorts: 'Shorts',
};
function lookName(key, v) {
  if (key === 'skin') return 'Tone ' + (Number(v) + 1);
  if (key === 'facial' && v === 'none') return 'Clean-shaven';
  if (key === 'facial' && v === 'full') return 'Full beard';
  if (key === 'glasses') return v === 'none' ? 'No glasses' : cap(v) + ' glasses';
  if (key === 'headwear') return v === 'none' ? 'No headwear' : cap(v);
  if (key === 'earrings') return v === 'none' ? 'No earrings' : cap(v);
  return LOOK_NAMES[v] || cap(String(v));
}
const HAIR_HEX = { black: '#1F1B1E', espresso: '#3B2519', brown: '#6A4129', chestnut: '#8A4A2B', auburn: '#9E3E22', ginger: '#CF6D33', honey: '#C8924A', blonde: '#E4C077', platinum: '#EFE4CB', grey: '#A9A6A4', white: '#ECEAE6', rose: '#E58FB2', teal: '#38ABA4', violet: '#7A5BD8' };
const EYE_HEX = { brown: '#5B3920', dark: '#2E1E14', hazel: '#87662D', green: '#4B8A4D', blue: '#3B78C2', grey: '#7B8B98', amber: '#A9692A' };
const SKIN_HEX = ['#FCE5D5', '#F5D0B5', '#E9BB94', '#D7A072', '#BD8253', '#9A6340', '#734629', '#4F2F1C'];
const BODY_SLIDERS = [['height', 'Height', 140, 210], ['fat', 'Body fat', 2, 100], ['muscle', 'Muscle', 3, 100], ['chest', 'Chest', 4, 100], ['hips', 'Hips', 8, 100], ['glutes', 'Glutes', 8, 100]];

function lookDraft(arg) {
  const top = UI.sheets[UI.sheets.length - 1];
  if (top && top.draft) return top.draft;
  let d;
  if (arg === 'custom') {
    if (!CUSTOM.look) CUSTOM.look = randomLook({ gender: CUSTOM.gender, country: CUSTOM.country }, { age: 0 });
    d = { target: 'custom', free: true, adult: false, age: null, look: Object.assign({}, CUSTOM.look), body: null, tab: 'hair', view: 'portrait', stage: 'adult' };
  } else {
    const p = P(G), age = A(G), adult = age >= ADULT_AGE;
    d = { target: 'player', god: arg === 'god', free: arg === 'god' || !!M(G).freeRestyle, adult, age, look: Object.assign({}, ensureLook(G, p)), body: adult ? Object.assign({}, ensureBody(G, p)) : null, tab: 'hair', view: adult ? 'figure' : 'portrait', stage: null };
  }
  if (top) top.draft = d;
  return d;
}
function lookTabs(d) {
  return LOOK_TABS.filter((t) => (!t.locked || d.free) && (!t.adultOnly || d.adult) && (!t.minAge || d.target === 'custom' || d.age >= t.minAge) && !(t.body && !d.body));
}
function lookPreview(d) {
  if (d.adult && d.view === 'figure') return figureSVG(d.look, d.body, { age: d.age, size: 360, label: 'Your full figure' });
  return d.target === 'custom'
    ? avatarSVG(d.look, { stage: d.stage, frame: 'none', size: 232, label: 'Your character' })
    : avatarSVG(d.look, { age: d.age, frame: 'none', size: 232, label: 'Your portrait' });
}
function lookOptions(d, tab) {
  if (tab.extras) return [['glasses', 'none'], ['glasses', 'round'], ['glasses', 'square'], ['headwear', 'beanie'], ['headwear', 'hijab'], ['earrings', 'studs'], ['earrings', 'hoops']];
  if (tab.key === 'skin') return SKIN_HEX.map((_, i) => ['skin', i]);
  return (LOOK_OPTS[tab.key] || []).map((v) => [tab.key, v]);
}

SHEETS.look = (arg) => {
  const d = lookDraft(arg);
  const tabs = lookTabs(d);
  const tab = tabs.find((t) => t.id === d.tab) || tabs[0];
  d.tab = tab.id;
  const L = d.look;
  let html = `<div class="lk-stage ${d.adult && d.view === 'figure' ? 'full' : ''}"><div class="halo"></div><div class="who" id="lk-preview">${lookPreview(d)}</div></div>`;
  if (d.adult) html += `<div class="seg" style="margin-top:10px">${[['portrait', 'Portrait'], ['figure', 'Full body']].map(([v, l]) => `<button class="${d.view === v ? 'on' : ''}" data-a="lkView" data-v="${v}">${l}</button>`).join('')}</div>`;
  if (d.target === 'custom') html += `<div class="seg" style="margin-top:10px">${[['baby', 'Baby'], ['child', 'Kid'], ['teen', 'Teen'], ['adult', 'Adult'], ['senior', 'Senior']].map(([v, l]) => `<button class="${d.stage === v ? 'on' : ''}" data-a="lkStage" data-v="${v}">${l}</button>`).join('')}</div>`;
  html += `<div class="lk-tabs" role="tablist">${tabs.map((t) => `<button class="lk-tab ${t.id === tab.id ? 'on' : ''}" role="tab" aria-selected="${t.id === tab.id}" data-a="lkTab" data-t="${t.id}">${icon(t.icon, 24)}<span>${t.label}</span></button>`).join('')}</div>`;

  if (tab.body) {
    html += lookBodyPanel(d);
  } else if (tab.bottoms) {
    html += `<div class="lk-head"><h3>Bottoms and shoes</h3><span>${esc(lookName('bottom', L.bottom || 'jeans'))}</span></div>`;
    html += `<div class="lk-grid">${LOOK_OPTS.bottom.map((v) => `<button class="lk-opt ${L.bottom === v ? 'on' : ''}" data-a="lkSet" data-k="bottom" data-v="${v}" aria-pressed="${L.bottom === v}"><span class="lbl">${esc(lookName('bottom', v))}</span></button>`).join('')}</div>`;
    html += `<div class="lk-head"><h3>Colour</h3></div>${swatches('bottomColor', LOOK_COLORS.bottom.map((c) => [c, c]), L.bottomColor)}`;
    html += `<div class="lk-head"><h3>Shoes</h3></div>${swatches('shoeColor', LOOK_COLORS.shoe.map((c) => [c, c]), L.shoeColor)}`;
  } else {
    const opts = lookOptions(d, tab);
    const sel = opts.find(([k, v]) => L[k] === v);
    html += `<div class="lk-head"><h3>${esc(tab.label)}</h3><span>${sel ? esc(lookName(sel[0], sel[1])) : ''}</span></div>`;
    if (tab.colors) {
      const map = tab.colors === 'hairColor' ? Object.entries(HAIR_HEX) : tab.colors === 'eyeColor' ? Object.entries(EYE_HEX) : LOOK_COLORS.outfit.map((c) => [c, c]);
      html += swatches(tab.colors, map, L[tab.colors]);
    }
    if (tab.toggles) html += `<div class="chips" style="margin-bottom:10px">${tab.toggles.map(([k, l]) => `<button class="chip ${L[k] ? 'on' : ''}" data-a="lkToggle" data-k="${k}" aria-pressed="${!!L[k]}">${l}</button>`).join('')}</div>`;
    if (tab.extras && L.headwear !== 'none') html += swatches('headwearColor', LOOK_COLORS.headwear.map((c) => [c, c]), L.headwearColor);
    html += `<div class="lk-grid">${opts.map(([k, v]) => {
      const on = L[k] === v;
      const prev = Object.assign({}, L, { [k]: v });
      return `<button class="lk-opt ${on ? 'on' : ''}" data-a="lkSet" data-k="${k}" data-v="${v}" aria-pressed="${on}" title="${esc(lookName(k, v))}">${avatarSVG(prev, { stage: 'adult', crop: tab.crop, frame: 'none', bg: 'transparent', size: 64, label: lookName(k, v) })}${on ? `<span class="ck">${icon('ui-check', 14)}</span>` : ''}</button>`;
    }).join('')}</div>`;
  }
  if (!d.free && d.target === 'player') html += `<div class="lk-note">${icon('looks', 22)}<span>Face and skin are yours for life. Plastic surgery can change some of it (Activities → Health & Looks).</span></div>`;
  html += `<div class="lk-done"><div class="field-row">${d.free ? `<button class="btn" data-a="lkShuffle" aria-label="Shuffle look">${icon('dice', 26)}</button>` : ''}<button class="btn primary grow" data-a="lkSave">${icon('ui-check', 20)}${d.target === 'custom' ? 'Use this look' : 'Save look'}</button></div></div>`;
  const title = d.target === 'custom' ? 'Appearance' : d.god ? 'Edit appearance' : d.free ? 'Your adult look' : 'Your look';
  return { title, html };
};
function swatches(key, entries, cur) {
  return `<div class="lk-sw">${entries.map(([name, hex]) => `<button class="${cur === name ? 'on' : ''}" style="background:${hex}" data-a="lkSet" data-k="${key}" data-v="${esc(name)}" aria-label="${esc(key.endsWith('Color') && name.startsWith('#') ? 'Colour ' + name : cap(name))}" aria-pressed="${cur === name}"></button>`).join('')}</div>`;
}
function lookBodyPanel(d) {
  const b = d.body;
  if (d.free) {
    return `<div class="lk-head"><h3>Body</h3><span>${d.god ? 'God Mode' : 'Free this once'}</span></div>
      <div class="card" style="padding:8px 14px">${BODY_SLIDERS.map(([k, l, lo, hi]) => `<div class="lk-slider"><span>${l}</span><input type="range" min="${lo}" max="${hi}" value="${Math.round(b[k])}" data-in="lkBody" data-k="${k}" aria-label="${l}"><b id="lkv-${k}">${bodySliderText(k, b[k])}</b></div>`).join('')}</div>
      <div class="note">After this, your body drifts with your diet, exercise and age. Surgery can change it too.</div>`;
  }
  const rows = actionRows('mind', undefined, (a) => ['gym', 'jog'].includes(a.id)) + actionRows('health', undefined, (a) => ['diet', 'surgery'].includes(a.id));
  return `<div class="lk-head"><h3>Body</h3><span>${esc(bodyWord('fat', b.fat))} · ${esc(bodyWord('muscle', b.muscle))}</span></div>
    <div class="card">${kvRow('Height', heightText(b.height))}${kvRow('Diet', esc((DIETS[M(G).diet] || DIETS.normal).name))}${kvRow('Fitness', Math.round(skill(G, 'fitness')))}</div>
    <div class="note">Your body shifts a little every year toward what your genes, age, diet and activity support.</div>
    ${rows ? `<div class="list">${rows}</div>` : ''}`;
}
function bodySliderText(k, v) { return k === 'height' ? `${Math.round(v)} cm` : bodyWord(k, v); }

function curDraft() { const top = UI.sheets[UI.sheets.length - 1]; return top && top.kind === 'look' ? top.draft : null; }
CLICK.lkTab = (el, ds) => { const d = curDraft(); if (d) { d.tab = ds.t; renderSheet(); } };
CLICK.lkView = (el, ds) => { const d = curDraft(); if (d) { d.view = ds.v; renderSheet(); } };
CLICK.lkStage = (el, ds) => { const d = curDraft(); if (d) { d.stage = ds.v; renderSheet(); } };
CLICK.lkSet = (el, ds) => {
  const d = curDraft();
  if (!d) return;
  const v = ds.k === 'skin' ? Number(ds.v) : ds.v;
  // Headwear and earrings toggle off when tapped again.
  d.look[ds.k] = (ds.k === 'headwear' || ds.k === 'earrings') && d.look[ds.k] === v ? 'none' : v;
  if (ds.k === 'headwear' && v === 'beanie' && d.look.hair === 'bald') d.look.hair = 'crop';
  renderSheet();
};
CLICK.lkToggle = (el, ds) => { const d = curDraft(); if (d) { d.look[ds.k] = !d.look[ds.k]; renderSheet(); } };
CLICK.lkShuffle = () => {
  const d = curDraft();
  if (!d || !d.free) return;
  const who = d.target === 'custom' ? { gender: CUSTOM.gender, country: CUSTOM.country } : P(G);
  d.look = Object.assign(randomLook(who, { age: d.age ?? 0 }), { bg: d.look.bg });
  renderSheet();
};
INPUT.lkBody = (el, ds) => {
  const d = curDraft();
  if (!d || !d.free || !d.body) return;
  d.body[ds.k] = Number(el.value);
  const v = $('#lkv-' + ds.k);
  if (v) v.textContent = bodySliderText(ds.k, d.body[ds.k]);
  const pv = $('#lk-preview');
  if (pv) pv.innerHTML = lookPreview(d);
};
CLICK.lkSave = () => {
  const d = curDraft();
  if (!d) return;
  if (d.target === 'custom') { CUSTOM.look = Object.assign({}, d.look); CUSTOM.lookSaved = true; backSheet(); return; }
  const p = P(G);
  p.look = Object.assign({}, d.look);
  if (d.free && d.body && p.body) {
    for (const [k] of BODY_SLIDERS) p.body[k] = Math.round(d.body[k]);
    // A designed body becomes your baseline, so the yearly drift doesn't undo it.
    p.body.fatBase = clamp(p.body.fat, 8, 70);
    p.body.muscleBase = clamp(p.body.muscle, 5, 80);
  }
  if (!d.god) M(G).freeRestyle = false;
  backSheet();
  refresh();
  toast('Look saved.');
};
