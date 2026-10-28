// Start at any age:  node dev/verify/headstart.mjs
//
//   1. every starting age plays out cleanly: the right age and year, nobody dead, only the summary left to read, the head
//      start flag and the rewind buffer cleared, no errors, no "undefined"/"NaN"/stray dollar signs in the story
//   2. the autopilot does what it is for: adults have jobs and homes, most have had a partner, and nothing it does is
//      criminal, taboo, or behind a content switch
//   3. a character who dies or ends up in prison is re-rolled with the same choices; if every try fails the life starts from birth
//   4. the choices the player made (name, gender, country, birth year) are kept, and the default birth year puts the start in the present
//   5. the life carries on afterwards: ten more years, answered at random, leave a state with nothing broken in it
import { loadGame } from './loadgame.mjs';

const ctx = loadGame({ quiet: true });
const g = (name) => ctx.run(name);
ctx.seedRng(9051);
let errors = 0;
ctx.console.error = () => { errors++; };
let failures = 0;
const ok = (cond, msg) => { if (!cond) { failures++; console.log('  ✖ ' + msg); } };
const META = g('META');
const P = (s) => s.people[s.playerId];
const TAGS = ['chaos', 'mature', 'mature_intimacy', 'mature_substances', 'mature_adultwork', 'mature_violence', 'mature_themes', 'taboo', 'taboo_parent', 'taboo_step', 'taboo_sibling', 'taboo_child', 'taboo_grand', 'taboo_extended', 'taboo_inlaw'];
const BAD = /undefined|NaN|\[object|=>/;
const DOLLAR = /(^|[^A-Za-z])\$\d/; // a bare dollar sign (R$ and US$ are other currencies' own symbols)

// Anything wrong anywhere in a state: undefined or NaN where a value should be.
function walk(o, path, out) {
  if (out.length > 5) return;
  if (o === undefined) { out.push(path + ' is undefined'); return; }
  if (typeof o === 'number' && !Number.isFinite(o)) { out.push(path + ' is ' + o); return; }
  if (typeof o === 'string' && BAD.test(o)) { out.push(path + ' reads "' + o.slice(0, 60) + '"'); return; }
  if (o && typeof o === 'object') for (const k in o) walk(o[k], path + '.' + k, out);
}
function resolveAll(s) {
  let n = 0;
  while (s.pending.length && n++ < 80) {
    const pp = s.pending[0], en = pp.choices.map((c, i) => [c, i]).filter(([c]) => !c.disabled);
    const idx = en.length ? en[Math.floor(ctx.run('rand()') * en.length)][1] : 0;
    if (!ctx.resolvePopup(s, pp.id, idx, pp.input ? 'Sam' : undefined)) s.pending.shift();
  }
}

/* 1 and 2. every age, several countries ------------------------------ */
const AGES = [0, 5, 12, 18, 25, 40, 60], COUNTRIES = ['us', 'uk', 'jp', 'br', 'de', 'ng'];
const SEEDS = 30;
const tally = {};
for (const age of AGES) tally[age] = { n: 0, dead: 0, work: 0, school: 0, home: 0, partner: 0, record: 0, taboo: 0, kids: 0 };
let slowest = 0;
for (let i = 0; i < SEEDS; i++) {
  const mature = i % 3 === 0;
  for (const t of TAGS) META.settings[t] = mature; // some lives with every switch on: the director must stay out of all of it
  for (const age of AGES) {
    const cc = COUNTRIES[(i + age) % COUNTRIES.length], T = tally[age];
    const e0 = errors, t0 = Date.now();
    let s;
    try { s = ctx.createLifeWithHeadStart({ country: cc }, age); } catch (e) { ok(false, `age ${age} ${cc}: threw ${e.stack.split('\n').slice(0, 3).join(' | ')}`); continue; }
    slowest = Math.max(slowest, Date.now() - t0);
    T.n++;
    ok(errors === e0, `age ${age} ${cc}: logged an error`);
    ok(ctx.A(s) === age, `age ${age} ${cc}: started at ${ctx.A(s)}`);
    ok(s.year - P(s).birthYear === age, `age ${age} ${cc}: the year does not match the age`);
    if (s.dead) { T.dead++; ok(false, `age ${age} ${cc}: started dead`); continue; }
    ok(!s.headStart, `age ${age}: the head start flag is still on`);
    ok(!(g('REWIND')[s.id] || []).length, `age ${age}: the rewind buffer was not cleared`);
    if (age > 0) {
      ok(s.pending.length === 1 && s.pending[0].title === 'Your story so far', `age ${age} ${cc}: pending is ${JSON.stringify(s.pending.map((p) => p.title))}`);
      const txt = s.pending[0] ? s.pending[0].text : '';
      ok(!BAD.test(txt), `age ${age}: the story reads "${txt}"`);
      ok(cc === 'us' || !DOLLAR.test(txt), `age ${age} ${cc}: a dollar sign in "${txt}"`);
      ok(txt.includes(`You are ${age}`), `age ${age}: the story does not say the age`);
      ok(s.log.length >= age, `age ${age}: the life log holds ${s.log.length} years`);
    }
    const m = s.player;
    if (m.career || m.edu.current) T.work++;
    if (m.edu.current) T.school++;
    if (m.housing.type !== 'parents') T.home++;
    if (ctx.romanticId(s)) T.partner++;
    if (ctx.myChildren(s).length) T.kids++;
    if (m.record.length) T.record++;
    if (Object.values(m.rels).some((r) => r.taboo || r.wasFam)) T.taboo++;
    if (age >= 18) ok(m.freeRestyle === true, `age ${age}: no free restyle for an adult`);
    // Nothing behind a switch was touched, even with every switch on.
    // (A call-up in a war is the world's doing, not the director's, so a drafted record is fine.)
    const wandered = [];
    if (m.mil && !m.mil.drafted) wandered.push(`military (${m.mil.branch}, jobs ${m.jobHistory.map((h) => h.id).join(',')})`);
    if (m.uw) wandered.push('the underworld');
    if (m.op) wandered.push('an operation');
    if (m.scheme) wandered.push('a scheme');
    if (m.gamb && (m.gamb.bets.length || m.gamb.debts.length)) wandered.push('gambling');
    ok(!wandered.length, `age ${age} ${cc}: the director wandered into ${wandered.join(', ')}`);
    ok(!Object.keys(m.evHist || {}).some((id) => g('EVENTS')[id] && (g('EVENTS')[id].tags || []).length), `age ${age}: an event behind a content switch fired during the head start`);
    const bad = [];
    walk(s, 's', bad);
    ok(!bad.length, `age ${age} ${cc}: ${bad.join('; ')}`);
  }
}
for (const t of TAGS) META.settings[t] = false;
const T25 = tally[25], T40 = tally[40], T60 = tally[60];
ok(T25.work >= T25.n * 0.5, `at 25 at least half work or study (${T25.work}/${T25.n})`);
ok(T40.work >= T40.n * 0.7, `at 40 most are employed (${T40.work}/${T40.n})`);
ok(T40.home >= T40.n * 0.6, `at 40 most have left their parents' home (${T40.home}/${T40.n})`);
ok(T40.partner >= T40.n * 0.5, `at 40 at least half have a partner (${T40.partner}/${T40.n})`);
ok(T60.work >= T60.n * 0.5, `at 60 at least half still work (${T60.work}/${T60.n})`);
for (const age of AGES) {
  ok(tally[age].taboo === 0, `age ${age}: ${tally[age].taboo} lives dated a relative`);
  ok(tally[age].record <= tally[age].n * 0.1, `age ${age}: too many criminal records (${tally[age].record}/${tally[age].n})`);
}
ok(slowest < 4000, `slowest head start took ${slowest}ms`);

/* 3. re-rolls ------------------------------------------------------------ */
{
  const orig = g('headStart');
  let calls = 0;
  ctx.run('var __hsOrig = headStart');
  ctx.headStart = undefined; // (the next line replaces the global the engine calls)
  ctx.run(`headStart = function (s, age) { globalThis.__hsCalls = (globalThis.__hsCalls || 0) + 1; if (globalThis.__hsCalls <= 3) { s.dead = true; return s; } return __hsOrig(s, age); }`);
  ctx.__hsCalls = 0;
  const s = ctx.createLifeWithHeadStart({ country: 'us', first: 'Test', last: 'Person' }, 30);
  ok(!s.dead && ctx.A(s) === 30, 'a head start that died three times is tried again until it takes');
  ok(ctx.__hsCalls === 4, `it took four tries, took ${ctx.__hsCalls}`);
  ok(P(s).first === 'Test', 'the same choices every time');

  ctx.__hsCalls = 0;
  ctx.run(`headStart = function (s, age) { globalThis.__hsCalls = (globalThis.__hsCalls || 0) + 1; s.dead = true; return s; }`);
  const t = ctx.createLifeWithHeadStart({ country: 'us' }, 30);
  ok(ctx.__hsCalls === g('HEAD_START_TRIES'), `it gives up after ${g('HEAD_START_TRIES')} tries (${ctx.__hsCalls})`);
  ok(!t.dead && ctx.A(t) === 0, 'and starts from birth instead');
  ok(JSON.stringify(t.log).includes('did not take'), 'and says so in the log');

  ctx.__hsCalls = 0;
  ctx.run(`headStart = function (s, age) { globalThis.__hsCalls = (globalThis.__hsCalls || 0) + 1; const r = __hsOrig(s, age); if (globalThis.__hsCalls <= 2) { s.player.prison = { years: 5, yearsLeft: 5, juvie: false }; } return r; }`);
  const u = ctx.createLifeWithHeadStart({ country: 'us' }, 30);
  ok(!ctx.inPrison(u) && ctx.__hsCalls === 3, `a character in prison is re-rolled (${ctx.__hsCalls} tries)`);
  ctx.run('headStart = __hsOrig');
  ok(g('headStart') === orig, 'the real head start is back');
}

/* 4. the player's choices ------------------------------------------------ */
{
  const s = ctx.createLifeWithHeadStart({ first: 'Mara', last: 'Quill', gender: 'x', country: 'jp', city: 'Kyoto', year: 1980 }, 22);
  const p = P(s);
  ok(p.first === 'Mara' && p.last === 'Quill' && p.gender === 'x' && p.country === 'jp', 'name, gender and country are kept');
  ok(p.birthYear === 1980 && s.year === 2002, `a chosen birth year is the birth year (born ${p.birthYear}, now ${s.year})`);
  const now = new Date().getFullYear();
  const d = ctx.createLifeWithHeadStart({ country: 'us' }, 30);
  ok(d.year === now && P(d).birthYear === now - 30, `without a birth year the life starts in the present (${d.year})`);
  const z = ctx.createLifeWithHeadStart({ country: 'us' }, 0);
  ok(ctx.A(z) === 0 && !z.pending.length, 'age 0 is an ordinary birth');
  const big = ctx.createLifeWithHeadStart({ country: 'us' }, 999);
  ok(ctx.A(big) === g('HEAD_START_MAX'), 'the age is capped');
  const neg = ctx.createLifeWithHeadStart({ country: 'us' }, -4);
  ok(ctx.A(neg) === 0, 'and never below zero');
}

/* 5. it carries on ------------------------------------------------------- */
{
  let carried = 0;
  for (let i = 0; i < 24; i++) {
    const s = ctx.createLifeWithHeadStart({ country: COUNTRIES[i % COUNTRIES.length] }, [8, 17, 30, 45][i % 4]);
    resolveAll(s);
    const e0 = errors;
    let years = 0;
    while (years < 10 && !s.dead) { if (!ctx.ageUp(s)) break; resolveAll(s); years++; }
    ok(errors === e0, `a head-started life carried on with errors (life ${i})`);
    const bad = [];
    walk(s, 's', bad);
    ok(!bad.length, `life ${i} after ten more years: ${bad.join('; ')}`);
    if (!s.dead) { carried++; ok(ctx.rewindDepth(s) > 0, 'rewind works again once the life is under way'); }
  }
  ok(carried >= 18, `most lives carried on for ten years (${carried}/24)`);
}

console.log(failures ? `Head start checks: ${failures} failure(s)` : `Head start checks passed (${Object.values(tally).reduce((a, t) => a + t.n, 0)} lives, slowest ${slowest}ms).`);
process.exit(failures ? 1 : 0);
