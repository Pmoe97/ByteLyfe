// Looks verification:  node dev/verify/looks.mjs
//
// Covers the face drawing in 1007-ui-art.js (loaded here without a DOM) and the editor's data:
//   1. adjustments — look.adj is clamped on every draw, junk falls back to the defaults, and a
//      look with default adjustments draws exactly like one with none
//   2. every option, at every stage and with random adjustments, draws without NaN/undefined,
//      as a portrait and as a full figure
//   3. glasses follow the eyes and earrings follow the ears
//   4. the curls cap and the curls are separate layers (as one path they cancelled out)
//   5. custom colours: a custom skin colour is drawn, and children don't inherit a custom hair colour
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from './loadgame.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ctx = loadGame({ quiet: true });
ctx.run(fs.readFileSync(path.join(ROOT, 'src/src/srcfiles/js/1007-ui-art.js'), 'utf8'));
ctx.run('var esc = (s) => String(s);');
const g = (name) => ctx.run(name);
ctx.seedRng(77);
let failures = 0;
const ok = (cond, msg) => { if (!cond) { failures++; console.log('  ✖ ' + msg); } };
const AV = g('AVLIB'), OPTS = g('LOOK_OPTS'), avatarSVG = g('avatarSVG'), figureSVG = g('figureSVG');
const base = { skin: 3, face: 'oval', hair: 'crop', hairColor: 'brown', eyes: 'almond', eyeColor: 'green', brows: 'natural', nose: 'soft', mouth: 'smile', facial: 'none', glasses: 'none', headwear: 'none', earrings: 'none', outfit: 'tee', outfitColor: '#3F6FD8' };
const body = { height: 170, fat: 30, muscle: 30, chest: 40, hips: 45, glutes: 40 };
const strip = (svg) => svg.replace(/(av|fg)\d+/g, 'ID');

/* 1. adjustments ----------------------------------------------------------- */
{
  const a = AV.adjOf({ adj: { eyes: { y: 99, s: 0.1, r: 'x' }, mouth: { w: null }, nose: 'junk' } });
  ok(a.eyes.y === AV.ADJ.eyes.y[1] && a.eyes.s === AV.ADJ.eyes.s[0], 'out-of-range adjustments are clamped');
  ok(a.eyes.r === 0 && a.mouth.w === 1 && a.nose.s === 1, 'junk adjustments fall back to the defaults');
  const defaults = {};
  for (const f in AV.ADJ) { defaults[f] = {}; for (const k in AV.ADJ[f]) defaults[f][k] = AV.ADJ[f][k][2]; }
  for (const stage of ['baby', 'child', 'adult', 'senior']) {
    ok(strip(avatarSVG(base, { stage, size: 100 })) === strip(avatarSVG(Object.assign({}, base, { adj: defaults }), { stage, size: 100 })), `default adjustments draw like none (${stage})`);
  }
}

/* 2. every option, every stage, random adjustments -------------------------- */
{
  let drawn = 0, bad = [];
  const rnd = () => { const adj = {}; for (const f in AV.ADJ) { adj[f] = {}; for (const k in AV.ADJ[f]) { const [lo, hi] = AV.ADJ[f][k]; adj[f][k] = lo + Math.random() * (hi - lo); } } return adj; };
  for (const key of ['hair', 'face', 'eyes', 'brows', 'nose', 'mouth', 'facial', 'glasses', 'headwear', 'earrings', 'outfit']) {
    for (const v of OPTS[key]) {
      for (const stage of ['baby', 'child', 'teen', 'adult', 'senior']) {
        const look = Object.assign({}, base, { [key]: v, adj: rnd(), hairFlip: Math.random() < 0.5 });
        const svg = avatarSVG(look, { stage, size: 100 });
        drawn++;
        if (/NaN|undefined/.test(svg)) bad.push(`${key}=${v} ${stage}`);
      }
      const fig = figureSVG(Object.assign({}, base, { [key]: v, adj: rnd() }), body, { age: 30, size: 300 });
      drawn++;
      if (/NaN|undefined/.test(fig)) bad.push(`figure ${key}=${v}`);
    }
  }
  ok(!bad.length, `${drawn} drawings without NaN/undefined (${bad.slice(0, 5).join(', ')})`);
}

/* 3. glasses follow the eyes, earrings the ears ----------------------------- */
{
  const built = AV.build(Object.assign({}, base, { glasses: 'round', earrings: 'studs', adj: { eyes: { y: 5, g: 4 }, ears: { y: -3 } } }), 'adult', '', { eyes: 'e', face: 'c' });
  const extras = built.layers.filter((l) => l.g === 'extras');
  ok(extras.some((l) => /translate\(0 -5\)/.test(l.t) && /scale\(1\.25 1\)/.test(l.t)), 'glasses move up and spread with the eyes');
  ok(extras.some((l) => /translate\(0 3\)/.test(l.t)), 'earrings move with the ears');
}

/* 4. curls ------------------------------------------------------------------ */
{
  const built = AV.build(Object.assign({}, base, { hair: 'curls' }), 'adult', '', { eyes: 'e', face: 'c' });
  const fills = built.layers.filter((l) => l.g === 'hair' && l.f && l.f !== 'none');
  ok(!fills.some((l) => l.d.includes('M58.5 92') && / A/.test(l.d)), 'the curls cap and the curls are separate layers');
}

/* 5. custom colours ---------------------------------------------------------- */
{
  ok(avatarSVG(Object.assign({}, base, { skinHex: '#3366aa' }), { stage: 'adult', size: 100 }).includes('#3366aa'), 'a custom skin colour is drawn');
  ok(!avatarSVG(Object.assign({}, base, { skinHex: 'not a colour' }), { stage: 'adult', size: 100 }).includes('not a colour'), 'a malformed skin colour is ignored');
  const kidLooks = Array.from({ length: 40 }, () => ctx.inheritLook({ gender: 'f' }, { look: Object.assign({}, base, { hairColor: '#3fa7d6' }) }, { look: Object.assign({}, base, { hairColor: '#3fa7d6' }) }, 5));
  ok(kidLooks.every((L) => !String(L.hairColor).startsWith('#')), 'children do not inherit a custom hair colour');
}

console.log(failures ? `✖ looks: ${failures} failure(s)` : '✓ looks checks passed');
process.exit(failures ? 1 : 0);
