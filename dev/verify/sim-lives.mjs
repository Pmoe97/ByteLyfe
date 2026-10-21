// Fuzz harness: plays many random lives with a random-choice bot and checks invariants
// after every step. Prints a balance summary at the end.
//
//   node dev/verify/sim-lives.mjs            (200 lives, seed 1)
//   node dev/verify/sim-lives.mjs 1000 42    (1000 lives, seed 42)
import { loadGame } from './loadgame.mjs';

const N = Number(process.argv[2]) || 200;
const SEED = Number(process.argv[3]) || 1;
const ctx = loadGame({ quiet: true });
const g = (name) => ctx.run(name);
ctx.seedRng(SEED);
const rand = ctx.rand, pick = ctx.pick, chance = ctx.chance, randInt = ctx.randInt;
const ACTIONS = g('ACTIONS'), ACTION_ORDER = g('ACTION_ORDER'), HANDLERS = g('HANDLERS'), JOBS = g('JOBS'), JOB_IDS = g('JOB_IDS');
const EVENTS = g('EVENTS'), META = g('META'), TAG_IDS = Object.keys(g('CONTENT_TAGS'));
// Each life flips every content tag on or off, so tagged content gets played and the
// filters get checked: nothing tagged may show up while one of its tags is off.
const tagOff = (tags) => (tags || []).find((t) => !META.settings[t]);
const CATS = g('ACT_CATS').map((c) => c.id).concat(['school', 'job', 'jobs', 'home', 'shop', 'business']);
const RARE = new Set(['mob_coup', 'uw_flip', 'mob_leave', 'mob_found', 'royal_abdicate', 'royal_renounce', 'p_murder', 'p_assault', 'crime_bank', 'crime_heist', 'p_disown', 'pr_escape', 'pr_riot', 'p_divorce', 'p_breakup', 'bankruptcy', 'dropout', 'quit_job', 'emigrate', 'social_delete', 'pet_rehome', 'surgery', 'p_unfriend', 'gender_identity', 'orientation', 'name_change', 'biz_close', 'biz_sell', 'biz_sellshares']);

let failures = 0;
const fails = [];
function fail(msg, s) {
  failures++;
  if (fails.length < 25) fails.push(msg + (s ? ` [life ${s.id}, year ${s.year}, age ${s.playerId && s.people[s.playerId] ? s.year - s.people[s.playerId].birthYear : '?'}]` : ''));
}

const BAD_TEXT = /undefined|NaN|\[object|function \(|=>/;
function walk(o, path, s) {
  if (typeof o === 'number' && !Number.isFinite(o)) fail('non-finite number at ' + path, s);
  else if (o && typeof o === 'object') for (const k in o) walk(o[k], path + '.' + k, s);
}
function check(s, where) {
  const p = s.people[s.playerId];
  if (!p) return fail('player person missing @' + where, s);
  for (const k of ['happy', 'health', 'smarts', 'looks']) {
    const v = p.stats[k];
    if (!Number.isInteger(v) || v < 0 || v > 100) fail(`stat ${k}=${v} @${where}`, s);
  }
  const m = s.player;
  if (!Number.isFinite(m.money)) fail('money not finite @' + where, s);
  if (m.karma < 0 || m.karma > 100 || m.fame < 0 || m.fame > 100) fail(`karma/fame out of range @${where}`, s);
  for (const pid in m.rels) if (!s.people[pid]) fail(`rel to missing person ${pid} @${where}`, s);
  for (const pp of s.pending) {
    if (!pp.choices || !pp.choices.length) fail('popup without choices @' + where, s);
    if (pp.handler && !HANDLERS[pp.handler]) fail('unknown handler ' + pp.handler, s);
    if (pp.handler === 'event') {
      const ev = EVENTS[pp.ctx.ev];
      if (tagOff(ev.tags)) fail(`event ${ev.id} shown with tag "${tagOff(ev.tags)}" off`, s);
      for (const i of pp.ctx.map) { const o = ev.choices[i]; if (!Array.isArray(o) && tagOff(o.tags)) fail(`event ${ev.id} choice ${i} shown with tag "${tagOff(o.tags)}" off`, s); }
    }
    if (BAD_TEXT.test(pp.text) || BAD_TEXT.test(pp.title)) fail(`bad popup text "${pp.title}: ${pp.text}" @${where}`, s);
    for (const c of pp.choices) if (BAD_TEXT.test(String(c.label)) || BAD_TEXT.test(String(c.sub || ''))) fail(`bad choice "${c.label}" / "${c.sub}" @${where}`, s);
  }
  const last = s.log[s.log.length - 1];
  if (last) for (const l of last.lines) if (BAD_TEXT.test(l.t)) fail(`bad log line "${l.t}" @${where}`, s);
  // Looks and bodies (36-looks.js): everyone has a look; only adults ever have a body.
  for (const id in s.people) {
    const q = s.people[id];
    if (!q.look) fail(`person ${id} has no look @${where}`, s);
    if (!q.body) continue;
    if (s.year - q.birthYear < 18) fail(`person ${id} under 18 has a body @${where}`, s);
    for (const k of ['fat', 'muscle', 'chest', 'hips', 'glutes']) {
      const v = q.body[k];
      if (!Number.isInteger(v) || v < 0 || v > 100) fail(`body ${k}=${v} on ${id} @${where}`, s);
    }
  }
  walk(s, 's', s);
}

function resolveAll(s, where) {
  let guard = 0;
  while (s.pending.length) {
    if (guard++ > 80) { fail('popup loop @' + where + ' last=' + s.pending[0].title, s); s.pending = []; return; }
    const pp = s.pending[0];
    const enabled = pp.choices.map((c, i) => [c, i]).filter(([c]) => !c.disabled);
    const [, idx] = enabled.length ? pick(enabled) : [null, 0];
    const input = pp.input ? (chance(0.1) ? '' : pick(['Alex', 'Sam', 'Jordan', 'Riley', 'Max Power', 'Zed'])) : undefined;
    try {
      const ok = ctx.resolvePopup(s, pp.id, idx, input);
      if (!ok) { s.pending.shift(); }
    } catch (e) {
      fail(`handler ${pp.handler} threw: ${e.stack.split('\n').slice(0, 3).join(' | ')} @${where}`, s);
      s.pending.shift();
    }
    check(s, where + '/popup:' + (pp.handler || 'info'));
  }
}

function available(s) {
  const out = [];
  for (const cat of CATS) for (const a of ctx.actionList(s, cat)) out.push([a.id, undefined]);
  for (const pid in s.player.rels) for (const a of ctx.actionList(s, 'person', pid)) out.push([a.id, pid]);
  for (const pid in s.people) if (!s.people[pid].alive && s.player.rels[pid]) for (const a of ctx.actionList(s, 'person', pid)) out.push([a.id, pid]);
  for (const id in s.pets) for (const a of ctx.actionList(s, 'pet', id)) out.push([a.id, id]);
  for (const a0 of s.player.assets) for (const a of ctx.actionList(s, 'asset', a0.id)) out.push([a.id, a0.id]);
  for (const co of s.player.companies || []) for (const a of ctx.actionList(s, 'company', co.id)) { out.push([a.id, co.id]); if (['biz_hire', 'biz_product', 'biz_open'].includes(a.id)) out.push([a.id, co.id], [a.id, co.id]); }
  return out;
}

const biz = { founded: 0, ipos: 0, exits: 0, fails: 0, maxVal: 0, maxStaff: 0, profitable: 0, coYears: 0, byInd: {} };
const stats = { lives: 0, deaths: [], worth: [], gens: [], titles: {}, causes: {}, careers: {}, actionsRun: {}, prison: 0, degrees: {}, maxAge: 0, events: {}, tagLives: {} };
const t0 = Date.now();
for (let i = 0; i < N; i++) {
  for (const t of TAG_IDS) { META.settings[t] = chance(0.5); if (META.settings[t]) stats.tagLives[t] = (stats.tagLives[t] || 0) + 1; }
  let s;
  // One life in ten is born royal, so royal life gets played (random births rarely are).
  try { s = ctx.createLife(i % 10 === 0 ? { country: pick(['uk', 'es', 'se', 'jp']), royal: true } : {}); } catch (e) { fail('createLife threw: ' + e.stack); continue; }
  check(s, 'birth');
  stats.lives++;
  let steps = 0;
  while (steps++ < 3000) {
    resolveAll(s, 'start');
    if (s.dead) {
      const rec = s.lineage[s.lineage.length - 1];
      stats.deaths.push(rec.age); stats.worth.push(rec.worth);
      stats.titles[rec.title] = (stats.titles[rec.title] || 0) + 1;
      stats.causes[rec.cause] = (stats.causes[rec.cause] || 0) + 1;
      stats.maxAge = Math.max(stats.maxAge, rec.age);
      const heirs = ctx.heirOptions(s);
      if (heirs.length && s.gen < 3 && chance(0.7)) {
        try { ctx.continueAs(s, pick(heirs).id); } catch (e) { fail('continueAs threw: ' + e.stack.split('\n').slice(0, 3).join(' | '), s); break; }
        check(s, 'heir');
        continue;
      }
      stats.gens.push(s.gen);
      break;
    }
    // Persona lives steer the first generation into careers random play rarely reaches, so
    // their actions and events get tested: sports (i % 10 = 3), fame (5), the underworld (7).
    const age = s.year - s.people[s.playerId].birthYear;
    if (s.gen === 1 && !s.player.prison) {
      try {
        if (i % 10 === 3 && age === 19) { const job = ['athlete', 'fighter', 'racer', 'coach', 'gm'][Math.floor(i / 10) % 5]; if (s.player.career) ctx.leaveJob(s, 'switched'); Object.assign(s.player.skills, { athletics: 60, fitness: 55, martial: 55, driving: 55, business: 40, charisma: 30 }); ctx.hire(s, job, 0); ctx.startSportsCareer(s, job); resolveAll(s, 'persona'); }
        if (i % 10 === 5 && age === 20) { const job = ['musician', 'author', 'comedian', 'director', 'producer', 'actor', 'model'][Math.floor(i / 10) % 7]; if (s.player.career) ctx.leaveJob(s, 'switched'); Object.assign(s.player.skills, { music: 50, writing: 50, acting: 50, art: 50, charisma: 40 }); s.people[s.playerId].stats.looks = Math.max(75, s.people[s.playerId].stats.looks); ctx.hire(s, job, 0); }
      } catch (e) { fail('persona setup threw: ' + e.stack.split('\n').slice(0, 3).join(' | '), s); }
    }
    if (s.gen === 1 && i % 10 === 7 && age === 18) s.player.skills.streetwise = Math.max(50, s.player.skills.streetwise || 0);
    const n = randInt(0, 5);
    for (let k = 0; k < n && !s.dead; k++) {
      const av = available(s).filter(([id]) => !RARE.has(id) || chance(0.04));
      if (!av.length) break;
      const [id, t] = pick(av);
      if (tagOff(ACTIONS[id].tags)) fail(`action ${id} offered with tag "${tagOff(ACTIONS[id].tags)}" off`, s);
      try { ctx.doAction(s, id, t); } catch (e) { fail(`action ${id} threw: ${e.stack.split('\n').slice(0, 3).join(' | ')}`, s); }
      stats.actionsRun[id] = (stats.actionsRun[id] || 0) + 1;
      check(s, 'action:' + id);
      resolveAll(s, 'after:' + id);
    }
    // Founding a company is one action among ~150, so the bot gets a nudge to actually try it.
    if (!s.dead && s.year - s.people[s.playerId].birthYear >= 20 && !(s.player.companies || []).length && chance(0.06)) {
      try { ctx.doAction(s, 'biz_found'); } catch (e) { fail('biz_found threw: ' + e.stack.split('\n').slice(0, 3).join(' | '), s); }
      resolveAll(s, 'found');
    }
    // Job hunting and grad school, which the UI reaches through screens rather than actions.
    if (!s.dead && ctx.canWorkFullTime(s) && !s.player.career && chance(0.5)) {
      const board = ctx.jobBoard(s).filter((j) => j.open && !j.missing.length);
      if (board.length) { const j = pick(board); try { ctx.runWithResult(s, () => ctx.applyJob(s, j.id), { emoji: '', title: '' }); } catch (e) { fail('applyJob threw: ' + e.stack.split('\n').slice(0, 3).join(' | '), s); } resolveAll(s, 'apply'); }
    }
    if (!s.dead && !ctx.inSchool(s) && s.year - s.people[s.playerId].birthYear >= 21 && !s.player.career && chance(0.15)) {
      const progs = Object.keys(g('GRAD_PROGRAMS')).filter((k) => ctx.gradEligible(s, k).ok);
      if (progs.length) { try { ctx.runWithResult(s, () => ctx.applyGrad(s, pick(progs)), { emoji: '', title: '' }); } catch (e) { fail('applyGrad threw: ' + e.stack.split('\n').slice(0, 3).join(' | '), s); } resolveAll(s, 'grad'); }
    }
    if (!s.dead && chance(0.02)) {
      const txt = ctx.exportLife(s);
      const back = ctx.importLife(txt);
      if (!back || back.playerId !== s.playerId) fail('export/import round trip failed', s);
    }
    if (s.dead) continue;
    const yr = s.year;
    try { ctx.ageUp(s); } catch (e) { fail('ageUp threw: ' + e.stack.split('\n').slice(0, 4).join(' | '), s); break; }
    if (s.year !== yr + 1) fail('year did not advance', s);
    check(s, 'ageUp');
    if (s.player.career) stats.careers[s.player.career.id] = Math.max(stats.careers[s.player.career.id] || 0, s.player.career.level);
    if (s.player.prison) stats.prison++;
    for (const co of s.player.companies || []) { biz.coYears++; if (co.last && co.last.profit > 0) biz.profitable++; biz.maxVal = Math.max(biz.maxVal, co.public ? co.price * co.shares : co.val); biz.maxStaff = Math.max(biz.maxStaff, ctx.headcount(co)); biz.byInd[co.ind] = (biz.byInd[co.ind] || 0) + 1; }
    for (const id in s.player.evHist) {
      if (s.player.evHist[id] !== s.year) continue;
      stats.events[id] = (stats.events[id] || 0) + 1;
      if (tagOff(EVENTS[id].tags)) fail(`event ${id} fired with tag "${tagOff(EVENTS[id].tags)}" off`, s);
    }
  }
  for (const d of s.player.edu.degrees) stats.degrees[d.type] = (stats.degrees[d.type] || 0) + 1;
  const lf = s.player.life; biz.founded += lf.companiesFounded || 0; biz.ipos += lf.ipos || 0; biz.exits += lf.exits || 0; biz.fails += lf.bizFails || 0;
}

const avg = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0);
const median = (a) => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : 0; };
const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k}:${v}`).join(', ');
const evIds = g('EVENT_IDS');
const neverFired = evIds.filter((id) => !stats.events[id]);
const neverRun = ACTION_ORDER.filter((id) => !stats.actionsRun[id]);
console.log(`\nByteLyfe sim: ${stats.lives} lives, seed ${SEED}, ${((Date.now() - t0) / 1000).toFixed(1)}s`);
console.log(`Deaths: ${stats.deaths.length} · avg age ${avg(stats.deaths)} · median ${median(stats.deaths)} · max ${stats.maxAge}`);
console.log(`Net worth at death: median ${median(stats.worth)} · avg ${avg(stats.worth)}`);
console.log(`Causes: ${top(stats.causes, 10)}`);
console.log(`Titles: ${top(stats.titles, 10)}`);
console.log(`Degrees held at end: ${top(stats.degrees, 12)}`);
console.log(`Careers reached (max level): ${Object.keys(stats.careers).length} of ${JOB_IDS.length}`);
console.log(`Prison-years observed: ${stats.prison}`);
console.log(`Business: ${biz.founded} founded (last gen per life) · ${biz.coYears} company-years, ${Math.round((biz.profitable / Math.max(1, biz.coYears)) * 100)}% profitable · ${biz.ipos} IPOs · ${biz.exits} exits · ${biz.fails} bankruptcies · max worth ${Math.round(biz.maxVal).toLocaleString()} · max staff ${biz.maxStaff}`);
console.log(`Company-years by industry: ${top(biz.byInd, 22)}`);
console.log(`Content tags on: ${TAG_IDS.map((t) => `${t} in ${stats.tagLives[t] || 0} lives`).join(', ')}`);
console.log(`Events never fired (${neverFired.length}/${evIds.length}): ${neverFired.join(', ') || 'none'}`);
console.log(`Actions never run (${neverRun.length}/${ACTION_ORDER.length}): ${neverRun.join(', ') || 'none'}`);
if (failures) {
  console.log(`\n❌ ${failures} invariant failures. First ${fails.length}:`);
  for (const f of fails) console.log('  - ' + f);
  process.exit(1);
}
console.log('\n✅ No invariant failures.');
