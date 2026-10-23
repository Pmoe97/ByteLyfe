/* =====================================================================
 * 36-looks.js — how people look: a face for everyone, a body for adults.
 *
 * p.look = { skin (0-7), face, hair, hairColor, eyes, eyeColor, brows, nose,
 *            mouth, facial, glasses, headwear, headwearColor, earrings,
 *            outfit, outfitColor, bottom, bottomColor, shoeColor, build,
 *            freckles, blush, lashes, balding, bg, smoothUntil }
 * p.body = { height (cm), fat, muscle, chest, hips, glutes, fatBase, muscleBase }
 *          (0-100 except height). Adults only.
 *
 * Bodies exist only from ADULT_AGE. ensureBody() returns null for anyone
 * younger, and the full-body drawing (1007-ui-art.js) checks the age again,
 * so no child ever has a body shape. Everything here is plain data: no DOM.
 * ===================================================================== */

const ADULT_AGE = 18;

const LOOK_OPTS = {
  face: ['oval', 'round', 'square', 'heart', 'long'],
  hair: ['crop', 'sidepart', 'fade', 'curtains', 'slick', 'buzz', 'curls', 'afro', 'locs', 'pixie', 'bob', 'shoulder', 'wolf', 'long', 'wavy', 'ponytail', 'twintails', 'bun', 'spacebuns', 'braids', 'receding', 'bald'],
  hairColor: ['black', 'espresso', 'brown', 'chestnut', 'auburn', 'ginger', 'honey', 'blonde', 'platinum', 'grey', 'white', 'rose', 'teal', 'violet'],
  eyes: ['almond', 'round', 'upturned', 'downturned', 'hooded', 'monolid'],
  eyeColor: ['brown', 'dark', 'hazel', 'green', 'blue', 'grey', 'amber'],
  brows: ['natural', 'straight', 'arched', 'thick', 'thin', 'angled'],
  nose: ['soft', 'button', 'straight', 'wide', 'pointed', 'round'],
  mouth: ['smile', 'grin', 'neutral', 'smirk', 'laugh', 'full'],
  facial: ['none', 'stubble', 'mustache', 'goatee', 'beard', 'full'],
  glasses: ['none', 'round', 'square', 'aviator', 'cateye', 'sunglasses'],
  headwear: ['none', 'beanie', 'cap', 'beret', 'headband', 'hijab'],
  earrings: ['none', 'studs', 'hoops', 'drops', 'pearls'],
  outfit: ['tee', 'vneck', 'hoodie', 'collar', 'polo', 'sweater', 'cardigan', 'scoop', 'tank', 'crop', 'jacket', 'blazer', 'suit', 'dress', 'track'],
  bottom: ['jeans', 'trousers', 'cargo', 'joggers', 'skirt', 'pleated', 'shorts', 'leggings'],
  build: ['slim', 'regular', 'broad'],
};
const LOOK_COLORS = {
  outfit: ['#6C8CFF', '#3F6FD8', '#2D3A5C', '#2BB3A3', '#34D399', '#E8A33D', '#FF7A59', '#F07A8C', '#C77DFF', '#7A2E3A', '#556070', '#23202E', '#F4F1EA'],
  bottom: ['#3F5A8A', '#2D3A5C', '#23202E', '#6B5A4A', '#8E96BC', '#C2A27A', '#2BB3A3', '#7A2E3A', '#4A5D4E', '#D8D2C5'],
  shoe: ['#F4F1EA', '#23202E', '#6B4A32', '#E35D7A', '#3F6FD8', '#C8924A', '#8E2A38'],
  headwear: ['#2BB3A3', '#9B6BE0', '#E35D7A', '#FFB547', '#3F6FD8', '#2D3A5C', '#23202E', '#F4F1EA'],
  bg: ['#FFD9C2', '#CFE0FF', '#D6F2E3', '#EADCFF', '#FFE7A8', '#FFE0EC', '#DCD6F7', '#CFE6FF'],
};

// Skin-tone mix per country (eight tones, light to deep) and how often fair hair,
// light eyes and monolids turn up. Rough, so cities feel varied rather than uniform.
const LOOK_REGIONS = {
  us: { skin: [8, 12, 13, 11, 9, 8, 6, 4], fair: 0.35, light: 0.3, mono: 0.06 },
  ca: { skin: [10, 14, 14, 10, 7, 5, 4, 2], fair: 0.35, light: 0.35, mono: 0.07 },
  uk: { skin: [12, 16, 14, 8, 5, 4, 3, 2], fair: 0.4, light: 0.4, mono: 0.04 },
  ie: { skin: [24, 24, 14, 5, 2, 1, 1, 0], fair: 0.45, light: 0.5, mono: 0.02 },
  au: { skin: [12, 16, 14, 9, 5, 3, 2, 2], fair: 0.4, light: 0.4, mono: 0.08 },
  mx: { skin: [2, 6, 14, 22, 22, 12, 4, 1], fair: 0.08, light: 0.08, mono: 0.03 },
  br: { skin: [4, 8, 12, 16, 18, 14, 9, 5], fair: 0.12, light: 0.12, mono: 0.04 },
  fr: { skin: [10, 14, 14, 10, 7, 5, 4, 3], fair: 0.3, light: 0.3, mono: 0.03 },
  de: { skin: [16, 20, 14, 8, 4, 2, 1, 1], fair: 0.45, light: 0.45, mono: 0.03 },
  it: { skin: [6, 14, 20, 16, 8, 3, 1, 1], fair: 0.15, light: 0.18, mono: 0.02 },
  es: { skin: [6, 14, 20, 16, 8, 3, 1, 1], fair: 0.15, light: 0.18, mono: 0.02 },
  se: { skin: [24, 22, 12, 6, 3, 2, 1, 1], fair: 0.55, light: 0.55, mono: 0.03 },
  jp: { skin: [16, 26, 22, 10, 3, 1, 0, 0], fair: 0, light: 0, mono: 0.55 },
  kr: { skin: [18, 28, 20, 8, 2, 1, 0, 0], fair: 0, light: 0, mono: 0.6 },
  in: { skin: [0, 2, 6, 14, 22, 24, 16, 6], fair: 0, light: 0.04, mono: 0.03 },
  ng: { skin: [0, 0, 0, 1, 4, 14, 36, 40], fair: 0, light: 0, mono: 0.01 },
  ph: { skin: [2, 6, 14, 24, 26, 14, 4, 1], fair: 0, light: 0.02, mono: 0.2 },
  za: { skin: [3, 5, 7, 8, 10, 14, 26, 27], fair: 0.12, light: 0.12, mono: 0.02 },
};
const DARK_HAIR = ['black', 'espresso'];
const LIGHT_EYES = ['green', 'blue', 'grey'];

// Persistent diets: how many points they push body fat up or down each year.
const DIETS = {
  normal: { name: 'Balanced', fat: 0 },
  clean: { name: 'Eating clean', fat: -7 },
  keto: { name: 'Low-carb', fat: -9 },
  vegan: { name: 'Plant-based', fat: -5 },
  fast: { name: 'Intermittent fasting', fat: -8 },
  junk: { name: 'Eating whatever', fat: 14 },
};

function pickIdx(weights) { return weighted(weights.map((w, i) => ({ i, w })), (x) => x.w).i; }

function randomLook(p, o) {
  o = o || {};
  const R = LOOK_REGIONS[p.country] || LOOK_REGIONS.us;
  const skin = o.skin ?? pickIdx(R.skin);
  const fem = p.gender === 'f' || (p.gender !== 'm' && chance(0.5));
  let hairColor;
  if (skin >= 4 || !chance(R.fair)) hairColor = weighted(['black', 'espresso', 'brown', 'chestnut', 'auburn'], (c) => (skin >= 4 ? [60, 30, 8, 2, 0] : [26, 30, 26, 12, 6])[['black', 'espresso', 'brown', 'chestnut', 'auburn'].indexOf(c)]);
  else hairColor = pick(['blonde', 'honey', 'brown', 'chestnut', 'ginger', 'auburn', 'platinum', 'blonde']);
  const eyeColor = skin <= 3 && chance(R.light) ? pick(LIGHT_EYES) : pick(['brown', 'brown', 'dark', 'hazel', 'amber']);
  const coily = chance(skin >= 6 ? 0.7 : skin >= 5 ? 0.45 : skin >= 4 ? 0.2 : 0.06);
  const hair = fem
    ? pick(coily ? ['afro', 'braids', 'locs', 'curls', 'bun', 'spacebuns', 'ponytail', 'bob'] : ['long', 'wavy', 'shoulder', 'wolf', 'bob', 'ponytail', 'twintails', 'bun', 'spacebuns', 'pixie', 'long', 'wavy', 'curls'])
    : pick(coily ? ['buzz', 'fade', 'curls', 'afro', 'locs', 'braids', 'crop'] : ['crop', 'sidepart', 'fade', 'curtains', 'slick', 'buzz', 'curls', 'wolf', 'crop', 'sidepart', 'pixie']);
  const adult = (o.age ?? 30) >= ADULT_AGE;
  return {
    skin, hair, hairColor, eyeColor,
    face: pick(LOOK_OPTS.face),
    eyes: chance(R.mono) ? 'monolid' : pick(['almond', 'almond', 'round', 'upturned', 'downturned', 'hooded']),
    brows: pick(LOOK_OPTS.brows),
    nose: pick(LOOK_OPTS.nose),
    mouth: pick(['smile', 'smile', 'grin', 'neutral', 'smirk', 'full']),
    facial: !fem && adult && chance(0.45) ? pick(['stubble', 'stubble', 'mustache', 'goatee', 'beard', 'full']) : 'none',
    glasses: chance(adult ? 0.22 : 0.08) ? pick(fem ? ['round', 'square', 'cateye', 'aviator'] : ['round', 'square', 'aviator']) : 'none',
    headwear: fem && adult && chance(0.03) ? 'hijab' : 'none',
    headwearColor: pick(LOOK_COLORS.headwear),
    earrings: fem ? (chance(0.6) ? pick(['studs', 'hoops', 'drops', 'pearls']) : 'none') : chance(0.08) ? 'studs' : 'none',
    outfit: adult ? pick(fem ? ['tee', 'vneck', 'collar', 'sweater', 'cardigan', 'scoop', 'crop', 'blazer', 'tank', 'dress', 'jacket'] : ['tee', 'hoodie', 'collar', 'polo', 'sweater', 'jacket', 'blazer', 'suit', 'track', 'tee']) : pick(['tee', 'tee', 'hoodie', 'vneck', 'track']),
    outfitColor: pick(LOOK_COLORS.outfit),
    bottom: fem && chance(0.32) ? pick(['skirt', 'pleated', 'leggings']) : pick(['jeans', 'jeans', 'trousers', 'cargo', 'joggers']),
    bottomColor: pick(LOOK_COLORS.bottom),
    shoeColor: pick(LOOK_COLORS.shoe),
    build: fem ? (chance(0.6) ? 'slim' : 'regular') : pick(['regular', 'regular', 'broad', 'slim']),
    freckles: skin <= 1 && chance(0.25),
    blush: fem && chance(0.4),
    lashes: fem && chance(0.7),
    balding: !fem && chance(0.4),
    bg: pick(LOOK_COLORS.bg),
  };
}
// A child takes skin from both parents and features from one or the other.
function inheritLook(kid, a, b, age) {
  const A = a && a.look, B = b && b.look;
  const L = randomLook(kid, { age });
  if (!A && !B) return L;
  const either = () => (A && B ? (chance(0.5) ? A : B) : A || B);
  const skins = [A, B].filter(Boolean).map((x) => x.skin);
  L.skin = clamp(Math.round(sum(skins) / skins.length + randFloat(-0.6, 0.6)), 0, 7);
  const dark = [A, B].filter(Boolean).find((x) => DARK_HAIR.includes(x.hairColor));
  L.hairColor = dark && chance(0.65) ? dark.hairColor : either().hairColor;
  if (['grey', 'white', 'rose', 'teal', 'violet', 'platinum'].includes(L.hairColor)) L.hairColor = pick(['brown', 'espresso', 'blonde']);
  const brown = [A, B].filter(Boolean).find((x) => !LIGHT_EYES.includes(x.eyeColor));
  L.eyeColor = brown && chance(0.7) ? brown.eyeColor : either().eyeColor;
  for (const k of ['face', 'eyes', 'nose', 'brows']) L[k] = either()[k];
  L.freckles = (A && A.freckles) || (B && B.freckles) ? chance(0.6) : L.freckles && chance(0.3);
  L.balding = kid.gender === 'm' && ((A && A.balding) || (B && B.balding) ? chance(0.6) : chance(0.2));
  return L;
}

// Every person gets a look the first time anyone asks. Parents already in the
// save are used, so families resemble each other even in old saves. `fresh`
// skips inheritance (adopted children).
function ensureLook(s, p, fresh) {
  if (p.look) return p.look;
  const age = s.year - p.birthYear;
  const par = fresh ? [] : (p.parents || []).map((id) => s.people[id]).filter((x) => x && x.look);
  p.look = par.length ? inheritLook(p, par[0], par[1], age) : randomLook(p, { age });
  return p.look;
}
// Fill in looks for a whole save, oldest first so children can inherit.
function ensureAllLooks(s) {
  Object.values(s.people).sort((a, b) => a.birthYear - b.birthYear).forEach((p) => ensureLook(s, p));
}

function newBody(s, p) {
  const fem = p.gender === 'f', masc = p.gender === 'm';
  const par = (p.parents || []).map((id) => s.people[id]).filter((x) => x && x.body);
  const sexAdj = (q) => (q.gender === 'f' ? -6.5 : q.gender === 'm' ? 6.5 : 0);
  const parentH = par.length ? sum(par, (q) => q.body.height - sexAdj(q)) / par.length : null;
  const g = (m, sd, lo, hi) => clamp(Math.round(gauss(m, sd)), lo, hi);
  const height = parentH ? clamp(Math.round(parentH + sexAdj(p) + gauss(0, 4)), 140, 210) : g(fem ? 163 : masc ? 176 : 169, 7, 140, 210);
  const fatBase = g(fem ? 33 : 26, 9, 8, 70);
  const muscleBase = g(fem ? 26 : 38, 10, 5, 80);
  const b = {
    height, fatBase, muscleBase,
    fat: fatBase,
    muscle: muscleBase,
    chest: g(fem ? 48 : masc ? 16 : 30, fem ? 15 : 8, 4, 90),
    hips: g(fem ? 52 : masc ? 28 : 40, 11, 8, 90),
    glutes: g(fem ? 46 : 34, 12, 8, 90),
  };
  const age = bodyAge(s, p);
  if (age > ADULT_AGE) {
    b.fat = clamp(Math.round(fatBase + Math.max(0, age - 30) * 0.35 + gauss(0, 6)), 3, 95);
    b.muscle = clamp(Math.round(muscleBase - Math.max(0, age - 40) * 0.4 + gauss(0, 5)), 3, 95);
  }
  return b;
}
// Adults only. Anyone younger than ADULT_AGE gets null, never a body.
function ensureBody(s, p) {
  if (ageOf(s, p) < ADULT_AGE) return null;
  if (!p.body) p.body = newBody(s, p);
  return p.body;
}
function bodyNudge(s, d) {
  const b = ensureBody(s, P(s));
  if (!b) return;
  for (const k in d) b[k] = clamp(Math.round(b[k] + d[k]), k === 'fat' ? 2 : 3, 100);
}

// Yearly: body fat and muscle drift toward what your genes, age, diet and
// activity support. Called from bodyTick.
function bodyShapeTick(s) {
  const b = ensureBody(s, P(s));
  if (!b) return;
  const m = M(s), age = bodyAge(s, P(s)), fit = skill(s, 'fitness');
  let fatT = b.fatBase + Math.max(0, age - 30) * 0.3 + (DIETS[m.diet] || DIETS.normal).fat - fit * 0.28;
  if (trait(s, 'lazy')) fatT += 5;
  if (trait(s, 'athletic')) fatT -= 5;
  if ((m.addictions.alcohol || 0) >= 50) fatT += 5;
  if (m.lifestyle === 'lavish' || m.lifestyle === 'luxury') fatT += 3;
  if (m.lifestyle === 'frugal') fatT -= 2;
  fatT = clamp(fatT, 4, 95);
  const musT = clamp(b.muscleBase * 0.6 + fit * 0.55 - Math.max(0, age - 45) * 0.5 + (trait(s, 'athletic') ? 5 : 0), 3, 95);
  b.fat = clamp(Math.round(b.fat + (fatT - b.fat) * 0.3 + randFloat(-2, 2)), 2, 100);
  b.muscle = clamp(Math.round(b.muscle + (musT - b.muscle) * 0.3 + randFloat(-1.5, 1.5)), 3, 100);
}
// NPC bodies change slowly with age; nothing else tracks their habits.
function npcBodyTick(s, p) {
  const b = ensureBody(s, p);
  if (!b) return;
  const age = bodyAge(s, p);
  b.fat = clamp(Math.round(b.fat + (b.fatBase + Math.max(0, age - 30) * 0.3 - b.fat) * 0.2 + randFloat(-1.5, 1.5)), 2, 100);
  if (age > 45) b.muscle = clamp(Math.round(b.muscle - randFloat(0, 1)), 3, 100);
}

const BODY_WORDS = {
  fat: [[12, 'Very lean'], [22, 'Lean'], [34, 'Average'], [48, 'Soft'], [64, 'Heavy'], [101, 'Very heavy']],
  muscle: [[20, 'Untoned'], [40, 'Average'], [58, 'Toned'], [76, 'Athletic'], [101, 'Muscular']],
  chest: [[25, 'Flat'], [45, 'Small'], [62, 'Medium'], [80, 'Full'], [101, 'Very full']],
  hips: [[30, 'Narrow'], [55, 'Average'], [75, 'Wide'], [101, 'Very wide']],
  glutes: [[30, 'Flat'], [55, 'Average'], [75, 'Full'], [101, 'Very full']],
};
function bodyWord(k, v) { return BODY_WORDS[k].find(([lim]) => v < lim)[1]; }
function heightText(cm) {
  const inches = Math.round(cm / 2.54);
  return `${Math.floor(inches / 12)}′${inches % 12}″ · ${cm} cm`;
}

/* ---- surgery effects on the look and body ---------------------------- */
// Called by the plastic surgery handler once a procedure succeeds. `pickVal`
// is the option chosen in a follow-up popup (nose shape, implant size).
function applySurgeryLook(s, id, pickVal) {
  const p = P(s), L = ensureLook(s, p), b = ensureBody(s, p);
  switch (id) {
    case 'nose': if (LOOK_OPTS.nose.includes(pickVal)) L.nose = pickVal; break;
    case 'eyes': if (['hooded', 'downturned'].includes(L.eyes)) L.eyes = 'almond'; break;
    case 'botox': L.smoothUntil = Math.max(L.smoothUntil || 0, s.year + 1); break;
    case 'facelift': L.smoothUntil = Math.max(L.smoothUntil || 0, s.year + 8); break;
    case 'hair': L.balding = false; if (['receding', 'bald'].includes(L.hair)) L.hair = 'crop'; break;
    case 'lipo': if (b) b.fat = clamp(b.fat - randInt(12, 20), 2, 100); break;
    case 'tummy': if (b) b.fat = clamp(b.fat - randInt(6, 10), 2, 100); break;
    case 'implants': if (b) b.chest = clamp(b.chest + (Number(pickVal) || 15), 4, 100); break;
    case 'reduction': if (b) b.chest = clamp(b.chest - randInt(20, 30), 4, 100); break;
    case 'bbl': if (b) { b.glutes = clamp(b.glutes + randInt(22, 32), 8, 100); b.fat = clamp(b.fat - 4, 2, 100); } break;
    case 'full': L.smoothUntil = Math.max(L.smoothUntil || 0, s.year + 6); if (b) b.fat = clamp(b.fat - 10, 2, 100); break;
  }
}
