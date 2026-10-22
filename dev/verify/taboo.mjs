// Taboo romance verification:  node dev/verify/taboo.mjs
//
// Covers the opt-in adult-only family-romance system (48-taboo.js):
//   1. registry — master + 7 subtypes exist in CONTENT_TAGS, all default OFF,
//      engine file is loaded, taboo events are all tagged, helpers exist
//   2. gate matrix — every rel kind: off/master-only/subtype-only/wrong-subtype
//      stay closed; master+correct-subtype opens only when BOTH are 18+
//   3. tree persistence — a sibling rekindled as 'partner' is still recognised
//      via the blood tree (tabooTagFor), so kind-changing can't dodge the gate
//   4. pedigree F — full sibs 0.25, cousins 0.0625, second-gen (sib x own sib-child) 0.375
//   5. birth — inbred F + tabooDepth stored, tallies bump, unrelated pairs clean
//   6. events — all four taboo events need their tag AND a real taboo partner
//   7. labels — kinTitle keeps the blood label ("Sister · Girlfriend")
//   8. no-leak — a generated family with every tag off allows nothing
//
// Works from a local checkout in EITHER layout:
//   repo/index.html + repo/dev/verify/*.mjs          (local dev clone)
//   workspace /index.html + /src/dev/verify/*.mjs    (this editor's layout)
// Run from anywhere inside the checkout.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

// ---- locate the checkout root (the dir that holds index.html) ----
function locateRoot() {
  const cands = [
    path.resolve(HERE, '..', '..'),       // local clone: dev/verify -> repo root
    path.resolve(HERE, '..', '..', '..'), // editor workspace: src/dev/verify -> /
    process.cwd(),
  ];
  for (const r of cands) {
    if (fs.existsSync(path.join(r, 'index.html')) &&
        fs.existsSync(path.join(r, 'src', 'src', 'srcfiles', 'js', '48-taboo.js'))) return r;
  }
  // Fall back: walk up from HERE looking for index.html.
  let d = HERE;
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(d, 'index.html'))) return d;
    d = path.dirname(d);
  }
  return cands[0];
}
const ROOT = locateRoot();

function engineFiles() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const out = [];
  const re = /<script src="(src\/src\/srcfiles\/js\/(\d+)-[^"?]+\.js)(?:\?v=\d+)?"><\/script>/g;
  let m;
  while ((m = re.exec(html))) if (Number(m[2]) < 1000) out.push(m[1]);
  return out;
}

function loadGame(opts = {}) {
  const sandbox = {
    console: opts.quiet ? { log() {}, warn() {}, error: console.error, info() {} } : console,
    setTimeout: (fn) => 0,
    clearTimeout() {},
    Date, Math, JSON, Promise, TextEncoder, TextDecoder, btoa, atob,
  };
  const ctx = vm.createContext(sandbox);
  for (const rel of engineFiles()) {
    const file = path.join(ROOT, rel);
    vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: rel });
  }
  ctx.run = (code) => vm.runInContext(code, ctx);
  return ctx;
}

// ---- harness ----
const ctx = loadGame({ quiet: true });
const g = (name) => ctx.run(name);
ctx.run('seedRng(7)');
const fails = [];
const fail = (msg) => fails.push(msg);
const ok = (cond, msg) => { if (!cond) fail(msg); };
const approx = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
const setTags = (on) => {
  const TAGS = g('CONTENT_TAGS');
  for (const k in TAGS) g(`META.settings[${JSON.stringify(k)}] = ${JSON.stringify(on.includes(k))}`);
};
const SUBTYPES = ['taboo_parent', 'taboo_step', 'taboo_sibling', 'taboo_child', 'taboo_grand', 'taboo_extended', 'taboo_inlaw'];
const KIND_TO_TAG = {
  parent: 'taboo_parent', stepparent: 'taboo_step',
  sibling: 'taboo_sibling', halfsibling: 'taboo_sibling',
  child: 'taboo_child', grandparent: 'taboo_grand', grandchild: 'taboo_grand',
  aunt: 'taboo_extended', cousin: 'taboo_extended', nibling: 'taboo_extended',
  inlaw: 'taboo_inlaw',
};

// Minimal adult life: player 25, one relative of chosen age + rel kind.
function freshPair(kind, playerAge = 25, relAge = 30) {
  const s = ctx.newState(2026);
  s.player = ctx.newPlayerBlock();
  s.dead = false;
  const me = ctx.makePerson(s, { first: 'Alex', last: 'Test', gender: 'm', country: 'us', birthYear: 2026 - playerAge });
  s.playerId = me.id;
  const rel = ctx.makePerson(s, { first: 'Robin', last: 'Test', gender: 'f', country: 'us', birthYear: 2026 - relAge });
  ctx.setRel(s, rel.id, kind, 60);
  s.pending = [];
  return { s, me, rel };
}

/* 1. registry ----------------------------------------------------- */
{
  const TAGS = g('CONTENT_TAGS'), META = g('META'), EVENTS = g('EVENTS');
  ok(TAGS && TAGS.taboo, 'CONTENT_TAGS is missing master tag "taboo"');
  for (const t of SUBTYPES) ok(TAGS && TAGS[t], `CONTENT_TAGS is missing subtype "${t}"`);
  for (const k in TAGS) {
    if (k.startsWith('taboo') && typeof META.settings[k] !== 'boolean') fail(`tag "${k}" has no boolean default in META.settings`);
  }
  const off = SUBTYPES.filter((t) => META.settings[t] !== false);
  ok(META.settings.taboo === false, 'master default must be OFF (game exactly as now until opt-in)');
  ok(!off.length, `subtype defaults must be OFF, these are on: ${off.join(',')}`);
  for (const fn of ['tabooRomanceAllowed', 'tabooTagFor', 'isTabooFamily', 'tabooInbreeding', 'tabooBirthAdjust', 'tabooMiscarriageOdds', 'tabooTagForKind', 'bloodKinshipInfo', 'tabooPartners']) {
    ok(typeof ctx[fn] === 'function', `engine helper ${fn}() is missing (48-taboo.js not loaded?)`);
  }
  for (const id of ['taboo_whispers', 'taboo_holiday', 'taboo_talk', 'taboo_pregnancy_news']) {
    ok(EVENTS[id], `event ${id} is missing`);
    ok(EVENTS[id] && Array.isArray(EVENTS[id].tags) && EVENTS[id].tags.includes('taboo'), `event ${id} must carry the 'taboo' tag`);
  }
  const files = engineFiles();
  ok(files.some((f) => f.includes('48-taboo.js')), 'index.html does not load 48-taboo.js (check <script src> order: after 47, before UI)');
}

/* 2. gate matrix -------------------------------------------------- */
{
  for (const [kind, tag] of Object.entries(KIND_TO_TAG)) {
    const mk = (pAge = 25, rAge = 30) => freshPair(kind, pAge, rAge);
    let s0 = mk(); setTags([]);
    ok(ctx.tabooRomanceAllowed(s0.s, s0.rel.id) === false, `${kind}: allowed with everything OFF`);
    let s1 = mk(); setTags(['taboo']);
    ok(ctx.tabooRomanceAllowed(s1.s, s1.rel.id) === false, `${kind}: master-only must stay closed (needs subtype)`);
    let s2 = mk(); setTags([tag]);
    ok(ctx.tabooRomanceAllowed(s2.s, s2.rel.id) === false, `${kind}: subtype-only must stay closed (needs master)`);
    const wrong = SUBTYPES.find((t) => t !== tag);
    let s3 = mk(); setTags(['taboo', wrong]);
    ok(ctx.tabooRomanceAllowed(s3.s, s3.rel.id) === false, `${kind}: wrong subtype (${wrong}) must stay closed`);
    let s4 = mk(); setTags(['taboo', tag]);
    ok(ctx.tabooRomanceAllowed(s4.s, s4.rel.id) === true, `${kind}: master+${tag} (both adults) must OPEN`);
    let s5 = mk(16, 30); setTags(['taboo', tag]);
    ok(ctx.tabooRomanceAllowed(s5.s, s5.rel.id) === false, `${kind}: teen player (16) must NEVER open, even opted in`);
    let s6 = mk(25, 16); setTags(['taboo', tag]);
    ok(ctx.tabooRomanceAllowed(s6.s, s6.rel.id) === false, `${kind}: teen partner (16) must NEVER open, even opted in`);
  }
  // Unrelated people are never governed by the taboo gate, even fully opted in.
  {
    const { s, rel } = freshPair('friend', 25, 30);
    setTags(['taboo', ...SUBTYPES]);
    ok(ctx.tabooTagFor(s, rel.id) === null, 'unrelated friend must have no taboo tag');
    ok(ctx.tabooRomanceAllowed(s, rel.id) === false, 'unrelated friend must not go through the taboo gate');
  }
}

/* 3. tree persistence (kind changed to partner, blood still recognised) */
{
  const s = ctx.newState(2026);
  s.player = ctx.newPlayerBlock(); s.dead = false;
  const me = ctx.makePerson(s, { first: 'Alex', last: 'T', gender: 'm', country: 'us', birthYear: 1998 });
  s.playerId = me.id;
  const f = ctx.makePerson(s, { first: 'Pa', last: 'T', gender: 'm', country: 'us', birthYear: 1970 });
  const m = ctx.makePerson(s, { first: 'Ma', last: 'T', gender: 'f', country: 'us', birthYear: 1972 });
  const sib = ctx.makePerson(s, { first: 'Sis', last: 'T', gender: 'f', country: 'us', birthYear: 2000, parents: [f.id, m.id] });
  me.parents = [f.id, m.id]; f.children.push(me.id, sib.id); m.children.push(me.id, sib.id);
  // Sibling rekindled as a partner: stored taboo tag wins, tree backs it up.
  ctx.setRel(s, sib.id, 'sibling', 70);
  setTags(['taboo', 'taboo_sibling']);
  ok(ctx.tabooTagFor(s, sib.id) === 'taboo_sibling', 'sibling kind must map to taboo_sibling');
  ctx.setRel(s, sib.id, 'partner', 80);
  s.player.rels[sib.id].taboo = 'taboo_sibling'; s.player.rels[sib.id].wasFam = 'sibling';
  ok(ctx.tabooTagFor(s, sib.id) === 'taboo_sibling', 'partner-formerly-sibling must keep its tag');
  ok(ctx.isTabooFamily(s, sib.id) === true, 'partner-formerly-sibling must still be family');
  // Same without the stored tag: the tree alone must still find the sibling bond.
  delete s.player.rels[sib.id].taboo;
  ok(ctx.tabooTagFor(s, sib.id) === 'taboo_sibling', 'blood tree alone must recover taboo_sibling');
}

/* 4. pedigree F --------------------------------------------------- */
{
  const s = ctx.newState(2026);
  s.player = ctx.newPlayerBlock(); s.dead = false;
  const me = ctx.makePerson(s, { first: 'Alex', last: 'T', gender: 'm', country: 'us', birthYear: 2001 });
  s.playerId = me.id;
  const F1a = ctx.makePerson(s, { first: 'A', last: 'F', gender: 'm', country: 'us', birthYear: 1970 });
  const F1b = ctx.makePerson(s, { first: 'B', last: 'F', gender: 'f', country: 'us', birthYear: 1970 });
  const kidOf = (a, b, by) => {
    const k = ctx.makePerson(s, { first: 'K', last: 'F', gender: ctx.chance(0.5) ? 'm' : 'f', country: 'us', birthYear: by, parents: [a.id, b.id] });
    a.children.push(k.id); b.children.push(k.id);
    return k;
  };
  const S1 = kidOf(F1a, F1b, 1995), S2 = kidOf(F1a, F1b, 1996);
  const U1 = ctx.makePerson(s, { first: 'U1', last: 'X', gender: 'f', country: 'us', birthYear: 1996 });
  const U2 = ctx.makePerson(s, { first: 'U2', last: 'X', gender: 'm', country: 'us', birthYear: 1994 });
  const C1 = kidOf(S1, U1, 2020), C2 = kidOf(S2, U2, 2021);
  const fSib = ctx.tabooInbreeding(s, S1.id, S2.id);
  ok(approx(fSib, 0.25, 1e-6), `full-sib mating F must be 0.25, got ${fSib}`);
  const fCous = ctx.tabooInbreeding(s, C1.id, C2.id);
  ok(approx(fCous, 0.0625, 1e-6), `cousin mating F must be 0.0625, got ${fCous}`);
  const K = kidOf(S1, S2, 2020); // first-gen inbred child
  const f2 = ctx.tabooInbreeding(s, S1.id, K.id);
  ok(approx(f2, 0.375, 1e-6), `second-gen (sib x own sib-child) F must be 0.375, got ${f2}`);
  const fUn = ctx.tabooInbreeding(s, U1.id, U2.id);
  ok(fUn === 0, `unrelated pair F must be 0, got ${fUn}`);
}

/* 5. birth effects ------------------------------------------------ */
{
  const s = ctx.newState(2026);
  s.player = ctx.newPlayerBlock(); s.dead = false;
  const me = ctx.makePerson(s, { first: 'Alex', last: 'T', gender: 'm', country: 'us', birthYear: 1998 });
  s.playerId = me.id;
  const F1a = ctx.makePerson(s, { first: 'A', last: 'F', gender: 'm', country: 'us', birthYear: 1970 });
  const F1b = ctx.makePerson(s, { first: 'B', last: 'F', gender: 'f', country: 'us', birthYear: 1970 });
  const kidOf = (a, b, by) => {
    const k = ctx.makePerson(s, { first: 'K', last: 'F', gender: 'f', country: 'us', birthYear: by, parents: [a.id, b.id] });
    a.children.push(k.id); b.children.push(k.id);
    return k;
  };
  const S1 = kidOf(F1a, F1b, 1995), S2 = kidOf(F1a, F1b, 1996);
  const before = s.player.life.tabooKids || 0;
  const K1 = ctx.makePerson(s, { first: 'K1', last: 'F', gender: 'f', country: 'us', birthYear: 2026, parents: [S1.id, S2.id] });
  S1.children.push(K1.id); S2.children.push(K1.id);
  const r1 = ctx.tabooBirthAdjust(s, K1, S1, S2);
  ok(approx(r1.F, 0.25, 1e-6) && approx(K1.inbred, 0.25, 1e-6), `sib-child inbred must be 0.25, got ${K1.inbred}`);
  ok(K1.tabooDepth === 1, `first-gen tabooDepth must be 1, got ${K1.tabooDepth}`);
  ok((s.player.life.tabooKids || 0) === before + 1, 'tabooKids tally must bump on a taboo birth');
  const U = ctx.makePerson(s, { first: 'U', last: 'X', gender: 'f', country: 'us', birthYear: 1998 });
  const K2 = ctx.makePerson(s, { first: 'K2', last: 'X', gender: 'm', country: 'us', birthYear: 2026 });
  const r2 = ctx.tabooBirthAdjust(s, K2, S1, U);
  ok(r2.F === 0 && K2.inbred === 0 && K2.tabooDepth === 0, 'unrelated birth must stay clean (F 0, depth 0)');
  const K3 = ctx.makePerson(s, { first: 'K3', last: 'F', gender: 'f', country: 'us', birthYear: 2026 });
  const r3 = ctx.tabooBirthAdjust(s, K3, S1, K1);
  ok(approx(r3.F, 0.375, 1e-6) && K3.tabooDepth === 2, `second-gen birth must be F 0.375 depth 2, got F=${r3.F} depth=${K3.tabooDepth}`);
}

/* 6. events need tag AND partner ---------------------------------- */
{
  const EVENTS = g('EVENTS');
  const withLover = () => {
    const s = ctx.newState(2026);
    s.player = ctx.newPlayerBlock(); s.dead = false;
    const me = ctx.makePerson(s, { first: 'Alex', last: 'T', gender: 'm', country: 'us', birthYear: 1998 });
    s.playerId = me.id;
    const f = ctx.makePerson(s, { first: 'Pa', last: 'T', gender: 'm', country: 'us', birthYear: 1970 });
    const m = ctx.makePerson(s, { first: 'Ma', last: 'T', gender: 'f', country: 'us', birthYear: 1972 });
    me.parents = [f.id, m.id]; f.children.push(me.id); m.children.push(me.id);
    const sib = ctx.makePerson(s, { first: 'Sis', last: 'T', gender: 'f', country: 'us', birthYear: 2000, parents: [f.id, m.id] });
    f.children.push(sib.id); m.children.push(sib.id);
    ctx.setRel(s, sib.id, 'lover', 75);
    s.player.rels[sib.id].taboo = 'taboo_sibling'; s.player.rels[sib.id].wasFam = 'sibling';
    ctx.setRel(s, f.id, 'parent', 60); // non-partner adult relative, so taboo_talk can confront
    s.pending = [];
    return { s, sib };
  };
  for (const id of ['taboo_whispers', 'taboo_holiday', 'taboo_talk']) {
    const ev = EVENTS[id];
    const lonely = freshPair('friend', 25, 30);
    lonely.s.dead = false;
    setTags(['taboo', ...SUBTYPES]);
    ok(ctx.eventEligible(lonely.s, ev) === false, `${id}: must not fire with no taboo partner`);
    const { s } = withLover();
    setTags([]);
    ok(ctx.eventEligible(s, ev) === false, `${id}: must not fire with tag OFF even with a partner present`);
    setTags(['taboo', 'taboo_sibling']);
    s.player.evHist = {};
    ok(ctx.eventEligible(s, ev) === true, `${id}: must fire with tag ON + taboo partner`);
  }
  // pregnancy news needs a real taboo pregnancy, not just any pregnancy.
  {
    const { s, sib } = withLover();
    s.player.pregnancy = { partnerId: sib.id, carrier: 'me', year: 2026 };
    setTags(['taboo', 'taboo_sibling']);
    s.player.evHist = {};
    ok(ctx.eventEligible(s, EVENTS.taboo_pregnancy_news) === true, 'pregnancy_news must fire for a taboo pregnancy with tag on');
    setTags([]);
    ok(ctx.eventEligible(s, EVENTS.taboo_pregnancy_news) === false, 'pregnancy_news must not fire with tag off');
    const outsider = ctx.makePerson(s, { first: 'Out', last: 'S', gender: 'f', country: 'us', birthYear: 1998 });
    ctx.setRel(s, outsider.id, 'lover', 70);
    s.player.pregnancy = { partnerId: outsider.id, carrier: 'me', year: 2026 };
    setTags(['taboo', ...SUBTYPES]);
    s.player.evHist = {};
    ok(ctx.eventEligible(s, EVENTS.taboo_pregnancy_news) === false, 'pregnancy_news must not fire for a non-taboo pregnancy');
  }
}

/* 7. dual label ---------------------------------------------------- */
{
  const { s, rel } = freshPair('lover', 25, 30);
  s.player.rels[rel.id].taboo = 'taboo_sibling';
  s.player.rels[rel.id].wasFam = 'sibling';
  const t = ctx.kinTitle(s, rel.id);
  ok(t.includes('·'), `kinTitle must keep both roles ("Sister · Girlfriend"), got "${t}"`);
}

/* 8. no-leak on a generated family --------------------------------- */
{
  ctx.run('seedRng(99)');
  const s = ctx.createLife({ country: 'us' });
  s.year += 25; s.people[s.playerId].birthYear = s.year - 25; // force player adult
  s.pending = [];
  setTags([]);
  const famKinds = Object.keys(KIND_TO_TAG);
  let checked = 0;
  for (const p of ctx.relPeople(s, famKinds)) {
    checked++;
    ok(ctx.tabooRomanceAllowed(s, p.id) === false, `default-off life must allow nothing (${p.id})`);
  }
  ok(checked > 0, 'generated life had no family to check the no-leak rule against');
}

console.log(`Taboo checks: ${fails.length ? 'FAIL' : 'pass'} (${engineFiles().length} engine files from ${path.relative(process.cwd(), ROOT) || '.'})`);
if (fails.length) {
  console.log(`\n❌ ${fails.length} taboo check failures:`);
  for (const f of fails) console.log('  - ' + f);
  process.exit(1);
}
console.log('✅ Taboo checks passed.');
