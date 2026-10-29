// Fuzz harness: plays many random lives with a random-choice bot and checks invariants
// after every step. Prints a balance summary at the end.
//
//   node dev/verify/sim-lives.mjs            (200 lives, seed 1)
//   node dev/verify/sim-lives.mjs 1000 42    (1000 lives, seed 42)
//
// npm run verify splits the run across cores (dev/verify/run-all.mjs):
//   --shard k/n       play only lives k, k+n, k+2n... (personas are picked by life number,
//                     so every shard still gets every persona)
//   --json <file>     write the raw numbers instead of the summary
//   --merge <files>   add shards up and print one summary (exits 1 on any failure)
import fs from 'node:fs';
import { loadGame } from './loadgame.mjs';

const opts = { shard: [0, 1], json: null, merge: null, pos: [] };
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a === '--shard') opts.shard = process.argv[++i].split('/').map(Number);
  else if (a === '--json') opts.json = process.argv[++i];
  else if (a === '--merge') { opts.merge = process.argv.slice(i + 1); break; }
  else opts.pos.push(a);
}
const N = Number(opts.pos[0]) || 200;
const SEED = Number(opts.pos[1]) || 1;
const ctx = loadGame({ quiet: true, history: true });
const g = (name) => ctx.run(name);
ctx.seedRng(SEED + opts.shard[0] * 7919);
const rand = ctx.rand, pick = ctx.pick, chance = ctx.chance, randInt = ctx.randInt;
const ACTIONS = g('ACTIONS'), ACTION_ORDER = g('ACTION_ORDER'), HANDLERS = g('HANDLERS'), JOBS = g('JOBS'), JOB_IDS = g('JOB_IDS');
const CRIMES_ALL = g('CRIMES');
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
const DOLLAR = /(^|[^A-Za-z])\$\d/;
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
      if (ev.lang && ctx.langLevel() < ev.lang) fail(`event ${ev.id} shown with the language dial below ${ev.lang}`, s);
      for (const i of pp.ctx.map) { const o = ev.choices[i]; if (!Array.isArray(o) && tagOff(o.tags)) fail(`event ${ev.id} choice ${i} shown with tag "${tagOff(o.tags)}" off`, s); if (!Array.isArray(o) && o.lang && ctx.langLevel() < o.lang) fail(`event ${ev.id} choice ${i} shown with the language dial below ${o.lang}`, s); }
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
  // Cities (49-cities.js): no building holds more tenants than it has units, and rents are real numbers.
  for (const a of m.assets) {
    if (a.kind !== 'house' || !a.tenants) continue;
    const units = a.units || 1, mine = m.housing.type === 'own' && m.housing.assetId === a.id ? 1 : 0;
    if (a.tenants.length + mine > units) fail(`${a.tenants.length} tenants + ${mine} owner in ${units} units @${where}`, s);
    for (const t of a.tenants) if (!(t.rent > 0) || t.mood < 0 || t.mood > 100 || !t.first) fail(`bad tenant ${JSON.stringify(t)} @${where}`, s);
  }
  if (m.housing.type === 'rent' && !(m.housing.rent > 0)) fail(`rent ${m.housing.rent} @${where}`, s);
  // Owning the house (54-house.js): racehorses keep sane numbers, and a book always has punters.
  for (const id in s.pets) {
    const h = s.pets[id].race;
    if (h && (!(h.spd >= 30 && h.spd <= 99 && h.sta >= 30 && h.sta <= 99) || !['yearling', 'racing', 'broodmare', 'stud', 'retired'].includes(h.state) || h.wins > h.starts)) fail(`bad racehorse ${JSON.stringify(h)} @${where}`, s);
  }
  if (m.book && !(m.book.punters >= 3)) fail(`book with ${m.book.punters} punters @${where}`, s);
  // Military (59-military.js): a service record keeps sane numbers; only veterans have a discharge; serving means a career.
  if (m.mil) {
    const mi = m.mil;
    if (!(mi.ptsd >= 0 && mi.ptsd <= 100) || !(mi.served >= 0) || !(mi.rating >= 0 && mi.rating <= 100) || !(mi.edLeft >= 0)) fail(`bad service record ${JSON.stringify({ ptsd: mi.ptsd, served: mi.served, rating: mi.rating, edLeft: mi.edLeft })} @${where}`, s);
    if (!g('BRANCHES')[mi.branch] || !g('SPECIALTIES')[mi.spec]) fail(`unknown branch or specialty ${mi.branch}/${mi.spec} @${where}`, s);
    if (mi.vet && m.career && g('isMilJob')(m.career.id)) fail(`a veteran with a military career @${where}`, s);
    if (mi.deserter && !mi.deserter.caught && m.career && g('isMilJob')(m.career.id)) fail(`a deserter still serving @${where}`, s);
  }
  // Spies (60-spy.js): meters stay in range, a network never passes six, a burned cover is a zero cover.
  if (m.spy) {
    const sp = m.spy;
    if (!(sp.cover.strength >= 0 && sp.cover.strength <= 100) || !(sp.heat >= 0 && sp.heat <= 100) || !(sp.standing >= 0 && sp.standing <= 100)) fail(`bad spy meters ${JSON.stringify({ c: sp.cover.strength, h: sp.heat, s: sp.standing })} @${where}`, s);
    if (!g('SPY_COVERS')[sp.cover.id] || !g('SPY_TRACKS')[sp.track]) fail(`unknown cover or track ${sp.cover.id}/${sp.track} @${where}`, s);
    if (sp.assets.filter((a) => a.state === 'active').length > 6) fail(`more than six live assets @${where}`, s);
    if (sp.alumni && m.career && g('isSpyJob')(m.career.id)) fail(`an alumnus still working for the agency @${where}`, s);
    if (sp.burned && !(sp.burned.year > 0)) fail(`a burn without a year @${where}`, s);
  }
  // The web (62-web.js): secrets keep sane numbers and real people, ties point at real people, reputation stays in range.
  if (s.web) {
    const kinds = g('SECRET_KINDS');
    for (const id in s.web.secrets) {
      const x = s.web.secrets[id];
      if (!kinds[x.kind] || !(x.sev >= 1 && x.sev <= 5) || !(x.ev >= 0 && x.ev <= 100) || !x.knows.includes(x.subj) || !s.people[x.subj]) fail(`bad secret ${JSON.stringify(x)} @${where}`, s);
    }
  }
  // Investigations (63-cases.js, 64-detective.js): evidence and progress stay in range, files have a real status, a case is about a real person.
  if (s.inv) {
    const n = Object.keys(s.inv.list).length;
    if (n > 70) fail(`${n} case files @${where}`, s);
    for (const c of Object.values(s.inv.list)) {
      if (!(c.prog >= 0 && c.prog <= 100) || !['open', 'cold', 'solved', 'closed'].includes(c.status) || !['trace', 'wit', 'dig'].every((k) => c.ev[k] >= 0 && c.ev[k] <= 100)) fail(`bad case ${JSON.stringify(c)} @${where}`, s);
      if (c.who !== null && !s.people[c.who]) fail(`a case about a missing person ${c.who} @${where}`, s);
      if (!CRIMES_ALL[c.crime]) fail(`a case for an unknown crime ${c.crime} @${where}`, s);
    }
  }
  // Intimacy (68-intimacy.js): never before 18, and every meter in range.
  if (m.intim && (m.intim.first != null && m.intim.first < 18)) fail(`a night before 18 (${m.intim.first}) @${where}`, s);
  for (const pid in m.rels) {
    const r = m.rels[pid];
    for (const k of ['chem', 'spark', 'feel']) if (r[k] != null && !(r[k] >= 0 && r[k] <= 100)) fail(`relationship ${k}=${r[k]} @${where}`, s);
    if (r.kind === 'fwb' && s.people[pid] && s.year - s.people[pid].birthYear < 18) fail(`a friend with benefits under 18 @${where}`, s);
  }
  // Substances and nightlife (69-substances.js, 70-nightlife.js): tolerance in range, nothing before 18, a scene standing in range.
  for (const id in m.subs || {}) {
    const st = m.subs[id];
    if (!g('SUBSTANCES')[id] || !(st.tol >= 0 && st.tol <= 100) || st.uses < 0 || st.relapses < 0) fail(`bad substance state ${id} ${JSON.stringify(st)} @${where}`, s);
    if (st.first != null && st.first < 18) fail(`${id} used at ${st.first} @${where}`, s);
  }
  if (m.night && !(m.night.scene >= 0 && m.night.scene <= 100)) fail(`scene standing ${m.night.scene} @${where}`, s);
  for (const id in m.used || {}) if (m.used[id] > s.year) fail(`${id} used in the future @${where}`, s);
  // Career cards (65-work.js): every meter in range, no desk piled high, every card on a desk is a real card.
  for (const wid in m.work || {}) {
    const w = m.work[wid];
    if (!g('WORKDECK')[wid] || !(w.m >= 0 && w.m <= 100) || w.hand.length > 6) fail(`bad work state ${wid} ${JSON.stringify({ m: w.m, hand: w.hand.length })} @${where}`, s);
    for (const h of w.hand) if (!ctx.wkCard(wid, h.cid)) fail(`unknown card ${h.cid} on the ${wid} desk @${where}`, s);
  }
  // Adult careers (71-adult-work.js): never held before 18, and never dealt with a switch off.
  if (m.career && g('JOBS')[m.career.id].adult && s.year - s.people[s.playerId].birthYear < 18) fail(`a minor in an adult career (${m.career.id}) @${where}`, s);
  if (m.career && g('JOBS')[m.career.id].adult && !g('adultOn')() && m.work && m.work[m.career.id] && m.work[m.career.id].hand.length) fail(`adult cards on the desk with a switch off @${where}`, s);
  // Violence and the serial arc (72-violence.js, 73-serial.js): meters in range, nothing before 18, nothing with a switch off.
  if (m.vio && (!(m.vio.haunt >= 0 && m.vio.haunt <= 100) || m.vio.kills < 0 || m.vio.defense < 0)) fail(`bad violence state ${JSON.stringify(m.vio)} @${where}`, s);
  if (m.ser && (!(m.ser.urge >= 0 && m.ser.urge <= 100) || m.ser.kills < 0 || m.ser.cool < 0)) fail(`bad serial state ${JSON.stringify(m.ser)} @${where}`, s);
  if (m.ser && m.ser.on && s.year - s.people[s.playerId].birthYear < 18) fail(`a serial arc before 18 @${where}`, s);
  // Dark themes (74-dark.js): meters in range, a stalker is a real adult, nothing before 18.
  if (m.dark) {
    if (!(m.dark.moral >= 0 && m.dark.moral <= 100)) fail(`bad moral weight ${m.dark.moral} @${where}`, s);
    const k = m.dark.stalk;
    if (k && (!(k.level >= 0 && k.level <= 100) || !s.people[k.by])) fail(`bad stalking ${JSON.stringify(k)} @${where}`, s);
    if ((m.dark.moral > 0 || k) && s.year - s.people[s.playerId].birthYear < 18) fail(`dark themes before 18 @${where}`, s);
  }
  // Abduction and the paper (78-secret-space.js, 79-news.js): a captive is an adult, alive, a captive, with meters in range.
  if (m.kn && m.kn.cap) {
    const c = m.kn.cap, q = s.people[c.pid];
    if (!q || !q.alive || !m.rels[c.pid] || m.rels[c.pid].kind !== 'captive' || s.year - q.birthYear < 18 || ![c.supplies, c.health, c.spirit, c.integ].every((v) => v >= 0 && v <= 100)) fail(`bad captive ${JSON.stringify({ c, alive: q && q.alive })} @${where}`, s);
    if (s.year - s.people[s.playerId].birthYear < 18) fail(`a captive held by a minor @${where}`, s);
  }
  if (m.kn && !(m.kn.heat >= 0 && m.kn.heat <= 100)) fail(`bad heat ${m.kn.heat} @${where}`, s);
  if ((s.news || []).length > 80) fail(`${s.news.length} articles @${where}`, s);
  if (m.dt && (m.dt.load.length > 12 || !(m.dt.solved >= 0) || !(m.dt.wrong >= 0))) fail(`bad detective record ${JSON.stringify(m.dt)} @${where}`, s);
  for (const id in s.people) {
    const q = s.people[id];
    if (q.ties && (q.ties.length > 6 || q.ties.some((t) => !s.people[t.id]))) fail(`bad ties on ${id} @${where}`, s);
    if (q.rep && !(q.rep.name >= 0 && q.rep.name <= 100 && q.rep.scandal >= 0 && q.rep.scandal <= 100)) fail(`bad reputation on ${id} @${where}`, s);
  }
  // Zoos (58-zoo.js): care and condition stay in range, and no habitat holds more than it can.
  for (const co of ctx.companies(s)) {
    const z = co.zoo;
    if (!z) continue;
    if (!(z.welfare >= 0 && z.welfare <= 100 && z.visitorSat >= 0 && z.visitorSat <= 100) || !Number.isFinite(co.cash)) fail(`bad zoo ${co.name} welfare ${z.welfare} sat ${z.visitorSat} cash ${co.cash} @${where}`, s);
    for (const e of z.exhibits) {
      if (!(e.condition >= 10 && e.condition <= 100 && e.security >= 10 && e.security <= 100)) fail(`bad habitat ${JSON.stringify(e)} @${where}`, s);
      if (z.animals.filter((a) => a.exhibitId === e.id).length > e.cap) fail(`habitat ${e.name} over capacity @${where}`, s);
    }
    for (const a of z.animals) if (!(a.age >= 0) || !(a.health >= 0 && a.health <= 100) || !z.exhibits.some((e) => e.id === a.exhibitId)) fail(`bad zoo animal ${JSON.stringify(a)} @${where}`, s);
  }
  // Growing up (55-57): popularity, subject offsets, club ranks and lesson levels stay in range.
  const sc = m.edu.current;
  if (sc && sc.kind === 'school' && sc.subj) {
    if (!(sc.pop >= 0 && sc.pop <= 100)) fail(`popularity ${sc.pop} @${where}`, s);
    for (const k in sc.subj) if (!(Math.abs(sc.subj[k]) <= 25)) fail(`subject ${k} offset ${sc.subj[k]} @${where}`, s);
  }
  if (sc && sc.club) for (const id in sc.club) { const d = sc.club[id]; if (!g('SCHOOL_CLUBS')[id] || !(d.r >= 0 && d.r <= 3) || !Number.isFinite(d.pts)) fail(`bad club record ${id} ${JSON.stringify(d)} @${where}`, s); }
  for (const id in m.lessons || {}) { const r = m.lessons[id], L = g('LESSON_TYPES')[id]; if (!L || !(r.lvl >= 0 && r.lvl < g('LESSON_FAMS')[L.fam].levels.length) || !Number.isFinite(r.xp)) fail(`bad lesson ${id} ${JSON.stringify(r)} @${where}`, s); }
  // Real currencies (50-currency.js): a life that never lived in the US shows no plain "$123" anywhere.
  if (ctx.run('MONEY_FMT') && !(m.places || []).some((k) => k.startsWith('us:')) && p.country !== 'us') {
    const texts = s.pending.flatMap((pp) => [pp.text, pp.title, ...pp.choices.map((c) => c.label + ' ' + (c.sub || ''))]).concat(last ? last.lines.map((l) => l.t) : []);
    const leak = texts.find((t) => DOLLAR.test(String(t)));
    if (leak) fail(`dollars in a ${p.country} life: "${leak}" @${where}`, s);
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
  // A judge's docket and a lawyer's clients are the job, so the bot leans on them.
  for (const cat of CATS) for (const a of ctx.actionList(s, cat)) { out.push([a.id, undefined]); if (['ct_hear', 'ct_client'].includes(a.id)) out.push([a.id, undefined], [a.id, undefined], [a.id, undefined]); }
  for (const pid in s.player.rels) for (const a of ctx.actionList(s, 'person', pid)) out.push([a.id, pid]);
  for (const pid in s.people) if (!s.people[pid].alive && s.player.rels[pid]) for (const a of ctx.actionList(s, 'person', pid)) out.push([a.id, pid]);
  for (const id in s.pets) for (const a of ctx.actionList(s, 'pet', id)) out.push([a.id, id]);
  for (const a0 of s.player.assets) for (const a of ctx.actionList(s, 'asset', a0.id)) out.push([a.id, a0.id]);
  for (const v of ctx.venuesReach(s)) for (const a of ctx.actionList(s, 'venue', v.id)) out.push([a.id, v.id]);
  for (const co of s.player.companies || []) for (const a of ctx.actionList(s, 'company', co.id)) { out.push([a.id, co.id]); if (['biz_hire', 'biz_product', 'biz_open'].includes(a.id)) out.push([a.id, co.id], [a.id, co.id]); }
  return out;
}

const kin = { lives: 0, people: 0, maxPeople: 0 };
const chal = { started: 0, done: 0, failed: 0 };
const youth = { lessons: 0, medals: 0, blackBelts: 0, captains: 0, titles: 0, valedictorians: 0, elite: 0, fullRides: 0, detentions: 0, suspensions: 0, expulsions: 0, grounded: 0, bullied: 0 };
const military = { lives: 0, acts: 0, maxTours: 0 };
const milSeen = new Set();
const spies = { lives: 0, acts: 0, missions: 0, burned: 0, turned: 0 };
const ventures = { schemes: 0, collapsed: 0, cons: 0, rings: 0, squeezes: 0, ops: 0, busts: 0, deaths: 0, vigs: 0, aided: 0, twists: 0, organized: 0, abuseSurvived: 0, abuseDone: 0 };
const spySeen = new Set();
const house = { books: 0, bookNet: 0, horses: 0, wins: 0, bigWins: 0, foals: 0, sold: 0, whales: 0, licenses: 0 };
const cities = { moves: 0, places: 0, tenants: 0, maxTenants: 0, signed: 0, evicted: 0, wasEvicted: 0, beaten: 0, rent: 0 };
const courts = { filed: 0, won: 0, lost: 0, settled: 0, sued: 0, beaten: 0, small: 0, rulings: 0, justices: 0, clientWins: 0 };
const biz = { founded: 0, ipos: 0, exits: 0, fails: 0, maxVal: 0, maxStaff: 0, profitable: 0, coYears: 0, byInd: {} };
const stats = { lives: 0, deaths: [], worth: [], gens: [], titles: {}, causes: {}, careers: {}, actionsRun: {}, prison: 0, degrees: {}, maxAge: 0, events: {}, tagLives: {} };
const t0 = Date.now();
for (let i = 0; i < (opts.merge ? 0 : N); i++) {
  if (i % opts.shard[1] !== opts.shard[0]) continue;
  for (const t of TAG_IDS) { META.settings[t] = chance(0.5); if (META.settings[t]) stats.tagLives[t] = (stats.tagLives[t] || 0) + 1; }
  META.settings.currency = chance(0.15) ? 'usd' : 'local';
  META.settings.language = ['clean', 'salty', 'unfiltered'][randInt(0, 2)]; // the language dial (67-language.js)
  // The chaos persona (i % 10 = 4) needs Chaos on.
  if (i % 10 === 4 && !META.settings.chaos) { META.settings.chaos = true; stats.tagLives.chaos = (stats.tagLives.chaos || 0) + 1; }
  // The adult-careers persona (i % 20 = 15) needs both of its switches on.
  if (i % 20 === 15) for (const t of ['mature', 'mature_adultwork']) if (!META.settings[t]) { META.settings[t] = true; stats.tagLives[t] = (stats.tagLives[t] || 0) + 1; }
  // The violence persona (i % 20 = 19) needs its switches on.
  if (i % 20 === 19) for (const t of ['mature', 'mature_violence']) if (!META.settings[t]) { META.settings[t] = true; stats.tagLives[t] = (stats.tagLives[t] || 0) + 1; }
  // The dark-themes persona (i % 20 = 5) needs its switches on.
  if (i % 20 === 5) for (const t of ['mature', 'mature_themes']) if (!META.settings[t]) { META.settings[t] = true; stats.tagLives[t] = (stats.tagLives[t] || 0) + 1; }
  let s;
  // One life in ten is born royal, and one plays a challenge (hand-made, daily or random).
  try {
    if (i % 10 === 6) { const all = g('CHALLENGES').filter((c) => !c.chaos || META.settings.chaos); s = ctx.startChallenge(chance(0.6) ? pick(all) : chance(0.5) ? ctx.dailyChallenge(`2026-01-${String(1 + (i % 28)).padStart(2, '0')}`) : ctx.randomChallenge()); }
    else {
      // A third of the lives are born in a past year, so they live through real history (88-world.js); the personas steer by age, so they work in any year.
      const o = i % 10 === 0 ? { country: pick(['uk', 'es', 'se', 'jp']), royal: true } : {};
      if (i % 3 === 1) { o.year = randInt(1900, 2000); stats.pastBirths = (stats.pastBirths || 0) + 1; }
      s = ctx.createLife(o);
    }
  } catch (e) { fail('createLife threw: ' + e.stack); continue; }
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
    // their actions and events get tested: parents (i % 10 = 1: three kids at 30, a company,
    // half of them a crime family too, and lots of parenting), cities (2: rents at 20, moves
    // city at 26 and 41, and at 30 buys a duplex to live in plus two more homes to rent out,
    // then plays landlord and tenant every year), chaos (4: powers, a cape career, half of them
    // vampires), sports (3), fame (5), the
    // underworld (7), romance (8: a partner at 24, then hookups, affairs and open
    // relationships), and the courts (9: a judge or a lawyer at 36, sometimes already high
    // on the ladder).
    const age = s.year - s.people[s.playerId].birthYear;
    if (s.gen === 1 && !s.player.prison) {
      try {
        if (i % 10 === 3 && age === 19) { const job = ['athlete', 'fighter', 'racer', 'coach', 'gm'][Math.floor(i / 10) % 5]; if (s.player.career) ctx.leaveJob(s, 'switched'); Object.assign(s.player.skills, { athletics: 60, fitness: 55, martial: 55, driving: 55, business: 40, charisma: 30 }); ctx.hire(s, job, 0); ctx.startSportsCareer(s, job); resolveAll(s, 'persona'); }
        if (i % 10 === 9 && age === 36) { const job = ['judge', 'lawyer'][Math.floor(i / 10) % 2]; if (s.player.career) ctx.leaveJob(s, 'switched'); s.player.edu.current = null; g('Sandbox').grantDegree(s, 'jd'); s.people[s.playerId].stats.smarts = Math.max(80, s.people[s.playerId].stats.smarts); s.player.skills.charisma = Math.max(40, s.player.skills.charisma || 0); ctx.hire(s, job, Math.floor(i / 20) % 3); }
        if (i % 10 === 1 && age === 30) {
          s.player.money += 2e6;
          let mate = ctx.romanticId(s);
          if (!mate) { const q = ctx.makeAdultNear(s, {}); ctx.setRel(s, q.id, 'spouse', 80); s.people[s.playerId].partner = q.id; q.partner = s.playerId; s.people[s.playerId].married = q.married = true; mate = q.id; }
          [11, 7, 4].forEach((a, k) => { const kid = ctx.bornChild(s, mate, ['Ari', 'Bo', 'Cy'][k], pick(['m', 'f'])); kid.birthYear = s.year - a; if (k === 1) kid.stats.looks = 75; });
          ctx.doAction(s, 'biz_found');
          resolveAll(s, 'persona');
          if (i % 20 === 1) { s.player.skills.streetwise = 60; ctx.doAction(s, 'mob_found'); resolveAll(s, 'persona'); }
        }
        if (i % 10 === 1 && age > 30 && chance(0.6)) {
          const acts = [];
          for (const pid in s.player.rels) for (const a of ctx.actionList(s, 'person', pid)) if (a.group === 'parent') acts.push([a.id, pid]);
          if (acts.length) { const [id, t] = pick(acts); ctx.doAction(s, id, t); stats.actionsRun[id] = (stats.actionsRun[id] || 0) + 1; check(s, 'action:' + id); resolveAll(s, 'parent:' + id); }
          if (chance(0.15)) { ctx.doAction(s, 'name_heir'); stats.actionsRun.name_heir = (stats.actionsRun.name_heir || 0) + 1; resolveAll(s, 'heir'); }
        }
        if (i % 10 === 8 && age === 24 && !ctx.romanticId(s)) {
          const q = ctx.makeAdultNear(s, {});
          ctx.setRel(s, q.id, 'partner', 75); q.partner = s.playerId;
          for (let k = 0; k < 3; k++) ctx.setRel(s, ctx.makeAdultNear(s, {}).id, 'friend', 70);
        }
        if (i % 10 === 8 && age > 24 && age < 70 && chance(0.6)) {
          const acts = [];
          for (const pid in s.player.rels) for (const a of ctx.actionList(s, 'person', pid)) if (a.id.startsWith('rx_') || ['p_askout', 'p_leave_for', 'p_breakup'].includes(a.id)) acts.push([a.id, pid]);
          for (const id of ['hookup', 'find_date']) if (ctx.actionList(s, 'love').some((a) => a.id === id)) acts.push([id, undefined]);
          if (acts.length) { const [id, t] = pick(acts); ctx.doAction(s, id, t); stats.actionsRun[id] = (stats.actionsRun[id] || 0) + 1; check(s, 'action:' + id); resolveAll(s, 'romance:' + id); }
        }
        if (i % 10 === 2 && age === 20 && s.player.housing.type !== 'rent') { ctx.doAction(s, 'find_rental'); resolveAll(s, 'persona'); }
        if (i % 10 === 2 && (age === 26 || age === 41)) { ctx.doAction(s, 'city_move'); resolveAll(s, 'persona'); }
        if (i % 10 === 2 && age === 30) {
          s.player.money += 2e6;
          const homes = ['duplex', pick(['fourplex', 'apartments']), pick(['house', 'condo', 'townhouse'])].map((t) => ctx.makeHouse(s, t));
          s.player.assets.push(...homes);
          ctx.doAction(s, 'asset_movein', homes[0].id); resolveAll(s, 'persona');
          for (const a of homes) { ctx.doAction(s, 'asset_rentout', a.id); resolveAll(s, 'persona'); }
        }
        if (i % 10 === 2 && age > 20 && chance(0.7)) {
          const acts = [];
          for (const a0 of s.player.assets) for (const a of ctx.actionList(s, 'asset', a0.id)) if ((a.id.startsWith('ll_') || a.id === 'asset_rentout') && (a.id !== 'asset_rentout' || !a0.rentedOut || chance(0.05))) acts.push([a.id, a0.id]);
          for (const a of ctx.actionList(s, 'home')) if (a.id.startsWith('ll_')) acts.push([a.id, undefined], [a.id, undefined]);
          if (acts.length) { const [id, t] = pick(acts); ctx.doAction(s, id, t); stats.actionsRun[id] = (stats.actionsRun[id] || 0) + 1; check(s, 'action:' + id); resolveAll(s, 'cities:' + id); }
        }
        // Chaos (4): powers at 14, a hero or a villain at 18, Chaos actions most years, and every
        // other one turned into a vampire at 45 who walks into the sunrise at 130.
        if (i % 10 === 4 && age === 14) { ctx.grantPower(s); ctx.grantPower(s); }
        if (i % 10 === 4 && age === 18) {
          ctx.doAction(s, 'cape_start');
          const side = i % 20 === 4 ? 'hero' : 'villain';
          if (s.pending[0] && s.pending[0].handler === 'capeSide') ctx.resolvePopup(s, s.pending[0].id, s.pending[0].choices.findIndex((c) => c.value === side));
          resolveAll(s, 'persona');
        }
        if (i % 10 === 4 && age === 45 && i % 20 === 14) { ctx.makeVampire(s, s.people[s.playerId]); }
        if (i % 10 === 4 && age > 14) for (let k = 0; k < 2 && !s.dead; k++) {
          const hungry = s.player.blood && s.player.blood.hunger >= 50;
          let acts = ctx.actionList(s, 'super').map((a) => [a.id, undefined]).filter(([id]) => id !== 'vp_sunrise' && (!hungry || ['vp_feed', 'vp_bank', 'vp_animal'].includes(id)));
          if (!hungry) for (const pid in s.player.rels) for (const a of ctx.actionList(s, 'person', pid)) if (a.id === 'vp_turn') acts.push([a.id, pid]);
          if (!acts.length) acts = ctx.actionList(s, 'super').map((a) => [a.id, undefined]).filter(([id]) => id !== 'vp_sunrise');
          if (acts.length) { const [id, t] = pick(acts); ctx.doAction(s, id, t); stats.actionsRun[id] = (stats.actionsRun[id] || 0) + 1; check(s, 'action:' + id); resolveAll(s, 'chaos:' + id); }
        }
        if (i % 10 === 4 && age >= 130 && s.people[s.playerId].vamp) { ctx.doAction(s, 'vp_sunrise'); if (s.pending[0] && s.pending[0].handler === 'vpSunrise') ctx.resolvePopup(s, s.pending[0].id, 0); stats.actionsRun.vp_sunrise = (stats.actionsRun.vp_sunrise || 0) + 1; resolveAll(s, 'sunrise'); }
        if (i % 10 === 5 && age === 20) { const job = ['musician', 'author', 'comedian', 'director', 'producer', 'actor', 'model'][Math.floor(i / 10) % 7]; if (s.player.career) ctx.leaveJob(s, 'switched'); Object.assign(s.player.skills, { music: 50, writing: 50, acting: 50, art: 50, charisma: 40 }); s.people[s.playerId].stats.looks = Math.max(75, s.people[s.playerId].stats.looks); ctx.hire(s, job, 0); }
      } catch (e) { fail('persona setup threw: ' + e.stack.split('\n').slice(0, 3).join(' | '), s); }
    }
    if (s.gen === 1 && i % 10 === 7 && age === 18) s.player.skills.streetwise = Math.max(50, s.player.skills.streetwise || 0);
    // The underworld persona gambles too: a bookie tab at 25, then a night out most years.
    if (s.gen === 1 && i % 10 === 7 && !s.dead && !s.player.prison && ctx.canGamble(s)) {
      try {
        if (age === 25) { const v = ctx.venuesIn(s, s.people[s.playerId].country, s.people[s.playerId].city).find((x) => x.kind === 'bookie'); if (v) ctx.addDebt(s, v, ctx.price(s, 30000)); }
        if (chance(0.8)) { const acts = ctx.actionList(s, 'gamble').map((a) => [a.id, undefined]).concat(ctx.venuesReach(s).map((v) => ['venue_visit', v.id])); const [id, t] = pick(acts); ctx.doAction(s, id, t); stats.actionsRun[id] = (stats.actionsRun[id] || 0) + 1; check(s, 'action:' + id); resolveAll(s, 'gamble:' + id); }
      } catch (e) { fail('gambling persona threw: ' + e.stack.split(String.fromCharCode(10)).slice(0, 3).join(' | '), s); }
    }
    // Growing up (the courts persona, 9, before it's a judge): three Playtime, home, lessons,
    // school or teacher actions a year until 18, with a bright kid every other time.
    if (s.gen === 1 && i % 10 === 9 && !s.dead && !s.player.prison && age < 18) {
      try {
        if (age === 6 && i % 20 === 9) s.people[s.playerId].stats.smarts = Math.max(85, s.people[s.playerId].stats.smarts);
        for (let k = 0; k < 3 && !s.dead; k++) {
          const acts = ['play', 'parents', 'learn', 'school'].flatMap((c) => ctx.actionList(s, c).map((a) => [a.id, undefined]));
          for (const pid in s.player.rels) for (const a of ctx.actionList(s, 'person', pid)) if (a.id.startsWith('sl_') || (['teacher', 'principal', 'bully', 'instructor'].includes(s.player.rels[pid].kind) && chance(0.2))) acts.push([a.id, pid]);
          if (!acts.length) break;
          const [id, t] = pick(acts);
          ctx.doAction(s, id, t); stats.actionsRun[id] = (stats.actionsRun[id] || 0) + 1; check(s, 'action:' + id); resolveAll(s, 'youth:' + id);
        }
      } catch (e) { fail('youth persona threw: ' + e.stack.split(String.fromCharCode(10)).slice(0, 3).join(' | '), s); }
    }
    // And owns the house: half of them run a book from 23; the other half buy two racehorses at
    // 30 and open a casino at 35. Then a Track & Book, racehorse or casino action most years.
    if (s.gen === 1 && i % 10 === 7 && !s.dead && !s.player.prison && age >= 23) {
      try {
        if (i % 20 === 7 && age === 23 && ctx.canGamble(s)) { s.player.money += 20000; ctx.doAction(s, 'bk_start'); resolveAll(s, 'house'); }
        if (i % 20 === 17 && age === 30) { s.player.money += 3e6; for (let k = 0; k < 2; k++) { ctx.doAction(s, 'hs_buy'); resolveAll(s, 'house'); } }
        if (i % 20 === 17 && age === 35 && !ctx.hasFelony(s) && ctx.companies(s).length < 3) { s.player.money += 8e6; ctx.foundCompany(s, 'casino', 'Sim Casino', { equity: 1, debt: 0 }).auto = true; }
        if (chance(0.7)) {
          const acts = ctx.actionList(s, 'turf').map((a) => [a.id, undefined]);
          for (const p of ctx.racehorses(s)) for (const a of ctx.actionList(s, 'pet', p.id)) if (a.id.startsWith('hs_')) acts.push([a.id, p.id]);
          for (const co of ctx.companies(s)) if (co.ind === 'casino') for (const a of ctx.actionList(s, 'company', co.id)) if (a.id.startsWith('cs_')) acts.push([a.id, co.id]);
          if (acts.length) { const [id, t] = pick(acts); ctx.doAction(s, id, t); stats.actionsRun[id] = (stats.actionsRun[id] || 0) + 1; check(s, 'action:' + id); resolveAll(s, 'house:' + id); }
        }
      } catch (e) { fail('house persona threw: ' + e.stack.split(String.fromCharCode(10)).slice(0, 3).join(' | '), s); }
    }
    // And some join up: enlist at 19 (a war is on in the draft years), then a military or veterans' action most years.
    if (s.gen === 1 && i % 20 === 12 && !s.dead && !s.player.prison && age >= 19) {
      try {
        if (age === 19) {
          if (s.player.career) ctx.leaveJob(s, 'switched');
          s.player.edu.current = null;
          if (!s.player.edu.degrees.some((d) => d.type === 'high')) s.player.edu.degrees.push({ type: 'high' });
          s.player.skills.fitness = Math.max(40, s.player.skills.fitness || 0);
          const cc = s.people[s.playerId].country, slot = ctx.warSlot(s, cc);
          if (!slot.war && i % 40 === 12) { slot.war = ctx.makeWar(s, cc); slot.war.intensity = 3; slot.war.draft = true; }
          for (let t = 0; t < 12 && !(s.player.career && s.player.career.id === 'military'); t++) { s.player.counters = {}; ctx.applyJob(s, 'military'); resolveAll(s, 'enlist'); }
        }
        for (let k = 0; k < 2 && !s.dead; k++) {
          const acts = ctx.actionList(s, 'mil').filter((a) => !['mil_awol'].includes(a.id) || chance(0.1));
          if (!acts.length) break;
          const a = pick(acts); ctx.doAction(s, a.id); stats.actionsRun[a.id] = (stats.actionsRun[a.id] || 0) + 1; check(s, 'action:' + a.id); resolveAll(s, 'mil:' + a.id);
          if (s.player.mil) { military.acts++; }
        }
        if (s.player.mil) { if (!milSeen.has(s.id)) { milSeen.add(s.id); military.lives++; } military.maxTours = Math.max(military.maxTours, s.player.mil.tours.length); }
      } catch (e) { fail('military persona threw: ' + e.stack.split(String.fromCharCode(10)).slice(0, 3).join(' | '), s); }
    }
    // And some join the agency: a degree at 24, vetting, then an intelligence action most years (sometimes a sale).
    if (s.gen === 1 && i % 20 === 16 && !s.dead && !s.player.prison && age >= 24) {
      try {
        if (age === 24) {
          if (s.player.career) ctx.leaveJob(s, 'switched');
          s.player.edu.current = null;
          for (const d of [{ type: 'high' }, { type: 'bachelor', major: 'business' }]) if (!s.player.edu.degrees.some((x) => x.type === d.type)) s.player.edu.degrees.push(d);
          s.people[s.playerId].stats.smarts = Math.max(70, s.people[s.playerId].stats.smarts);
          s.player.record = s.player.record.filter((r) => !(ctx.run('CRIMES')[r.crime] || {}).felony);
          for (let t = 0; t < 60 && !(s.player.career && s.player.career.id === 'spy'); t++) { s.player.counters = {}; ctx.applyJob(s, 'spy'); resolveAll(s, 'spy-join'); }
        }
        for (let k = 0; k < 2 && !s.dead; k++) {
          const acts = ctx.actionList(s, 'spy').filter((a) => !['spy_sell', 'spy_defect'].includes(a.id) || chance(0.15));
          if (!acts.length) break;
          const a = pick(acts); ctx.doAction(s, a.id); stats.actionsRun[a.id] = (stats.actionsRun[a.id] || 0) + 1; check(s, 'action:' + a.id); resolveAll(s, 'spy:' + a.id);
          spies.acts++;
        }
        if (s.player.spy) { if (!spySeen.has(s.id)) { spySeen.add(s.id); spies.lives++; } }
      } catch (e) { fail('spy persona threw: ' + e.stack.split(String.fromCharCode(10)).slice(0, 3).join(' | '), s); }
    }
    // And some run a zoo: open one at 28, then a zoo action most years.
    if (s.gen === 1 && i % 20 === 18 && !s.dead && !s.player.prison && age >= 28) {
      try {
        if (age === 28 && ctx.companies(s).length < 3) { s.player.money += 6e6; const co = ctx.foundCompany(s, 'zoo', 'Sim Zoo', { equity: 1, debt: 0 }); co.auto = true; resolveAll(s, 'zoo'); }
        for (const co of ctx.companies(s)) {
          if (co.ind !== 'zoo' || co.closed || !chance(0.8)) continue;
          const acts = ctx.actionList(s, 'company', co.id).filter((a) => a.id.startsWith('zoo_'));
          if (acts.length) { const a = pick(acts); ctx.doAction(s, a.id, co.id); stats.actionsRun[a.id] = (stats.actionsRun[a.id] || 0) + 1; check(s, 'action:' + a.id); resolveAll(s, 'zoo:' + a.id); }
        }
      } catch (e) { fail('zoo persona threw: ' + e.stack.split(String.fromCharCode(10)).slice(0, 3).join(' | '), s); }
    }
    // And some work the other side of the law: a detective from 24 who works the desk most years,
    // with a crime or two of their own at 30 and 34 so there is a file to lose.
    if (s.gen === 1 && i % 20 === 13 && !s.dead && !s.player.prison && age >= 24) {
      try {
        if (age === 24) {
          if (s.player.career) ctx.leaveJob(s, 'switched');
          s.player.edu.current = null;
          s.player.record = s.player.record.filter((r) => !(ctx.run('CRIMES')[r.crime] || {}).felony);
          ctx.hire(s, 'police', 2); resolveAll(s, 'detective-join');
        }
        if (age === 30 || age === 34) { ctx.commitCrime(s, 'burglary'); resolveAll(s, 'detective-crime'); }
        for (let k = 0; k < 2 && !s.dead; k++) {
          const acts = ctx.actionList(s, 'cases').filter((a) => a.id !== 'inv_flee' || chance(0.1));
          if (!acts.length) break;
          const a = pick(acts); ctx.doAction(s, a.id); stats.actionsRun[a.id] = (stats.actionsRun[a.id] || 0) + 1; check(s, 'action:' + a.id); resolveAll(s, 'cases:' + a.id);
        }
      } catch (e) { fail('detective persona threw: ' + e.stack.split(String.fromCharCode(10)).slice(0, 3).join(' | '), s); }
    }
    // And some work a job that plays its own year (65-work.js): hired at 24 with no questions asked,
    // then two things off the desk most years.
    if (s.gen === 1 && (i % 20 === 11 || i % 10 === 8) && !s.dead && !s.player.prison && age >= 24) {
      try {
        const plain = Object.keys(g('WORKDECK')).filter((id) => !g('JOBS')[id].adult && !g('JOBS')[id].special && id !== 'police'); // every ordinary career with a deck (65-77)
        const wid = plain[Math.floor(i / 10) % plain.length];
        if (age === 24) { if (s.player.career) ctx.leaveJob(s, 'switched'); s.player.edu.current = null; ctx.hire(s, wid, 0); resolveAll(s, 'work-join'); }
        for (let k = 0; k < 2 && !s.dead; k++) {
          if (!s.player.career || !ACTIONS.wk_work.when(s)) break;
          ctx.doAction(s, 'wk_work'); stats.actionsRun.wk_work = (stats.actionsRun.wk_work || 0) + 1; check(s, 'action:wk_work'); resolveAll(s, 'work:' + wid);
        }
        if (s.player.career && s.player.career.id === 'journalist' && ACTIONS.wk_publish.when(s)) { ctx.doAction(s, 'wk_publish'); resolveAll(s, 'work:publish'); }
      } catch (e) { fail('work persona threw: ' + e.stack.split(String.fromCharCode(10)).slice(0, 3).join(' | '), s); }
    }
    // And one works the night scene (71-adult-work.js): a dancer, companion, creator or club manager from 22,
    // with a different boundary setting and level of openness each life, and two cards off the desk most years.
    if (s.gen === 1 && i % 20 === 15 && !s.dead && !s.player.prison && age >= 22) {
      try {
        const wid = ['club_dancer', 'companion', 'creator', 'club_owner'][Math.floor(i / 20) % 4];
        if (age === 22) {
          if (s.player.career) ctx.leaveJob(s, 'switched');
          s.player.edu.current = null; ctx.hire(s, wid, 0);
          const op = s.pending.find((q) => q.handler === 'adultOpen');
          if (op) ctx.resolvePopup(s, op.id, Math.floor(i / 80) % 3);
          if (['club_dancer', 'companion', 'creator'].includes(wid)) ctx.wkState(s, wid).flags.bound = Math.floor(i / 20) % 3;
          resolveAll(s, 'adult-join');
        }
        for (let k = 0; k < 2 && !s.dead; k++) {
          if (!s.player.career || !ACTIONS.wk_work.when(s)) break;
          ctx.doAction(s, 'wk_work'); stats.actionsRun.wk_work = (stats.actionsRun.wk_work || 0) + 1; check(s, 'action:wk_work'); resolveAll(s, 'adult:' + wid);
        }
        if (s.player.career && ACTIONS.adult_tell.when(s) && chance(0.1)) { ctx.doAction(s, 'adult_tell'); resolveAll(s, 'adult:tell'); }
      } catch (e) { fail('adult persona threw: ' + e.stack.split(String.fromCharCode(10)).slice(0, 3).join(' | '), s); }
    }
    // And one is pulled into the dark (72-violence.js, 73-serial.js): at 24, two deaths and the turn, then
    // the year does the rest (the urge, the cases, the people at home), with random answers to every question.
    if (s.gen === 1 && i % 20 === 19 && !s.dead && !s.player.prison && age === 24) {
      try {
        for (let k = 0; k < 2; k++) { const v = ctx.makeAdultNear(s, { minAge: 25, maxAge: 40 }); ctx.setRel(s, v.id, 'enemy', 5); ctx.webFact(s, 'killed', { pid: v.id, how: 'poison' }); }
        const tp = s.pending.find((q) => q.handler === 'serTurn');
        if (tp) ctx.resolvePopup(s, tp.id, tp.choices.findIndex((c) => c.value === 'on'));
        const mp = s.pending.find((q) => q.handler === 'serMo');
        if (mp) ctx.resolvePopup(s, mp.id, Math.floor(i / 20) % 3);
        resolveAll(s, 'serial-turn');
      } catch (e) { fail('violence persona threw: ' + e.stack.split(String.fromCharCode(10)).slice(0, 3).join(' | '), s); }
    }
    // And one has heavier years (74-dark.js): at 25 an ex who will not be forgotten, a partner and a name,
    // and a weight on the conscience; the year does the rest, with random answers to every question.
    if (s.gen === 1 && i % 20 === 5 && !s.dead && !s.player.prison && age === 25) {
      try {
        const ex = ctx.makeAdultNear(s, { minAge: 25, maxAge: 40 }); ctx.setRel(s, ex.id, 'ex', 10);
        const f = ctx.makeAdultNear(s, { minAge: 25, maxAge: 40 }); ctx.setRel(s, f.id, 'friend', 60);
        s.player.fame = Math.max(s.player.fame, 45); ctx.darkMoral(s, 35);
        resolveAll(s, 'dark-setup');
      } catch (e) { fail('dark persona threw: ' + e.stack.split(String.fromCharCode(10)).slice(0, 3).join(' | '), s); }
    }
    // And every other one of those (i % 40 = 39) goes further (78-secret-space.js): at 27 a house with a room in it, someone
    // taken, and from then on a couple of care actions most years, with random answers to every question.
    if (s.gen === 1 && i % 40 === 39 && !s.dead && !s.player.prison && age >= 27) {
      try {
        if (age === 27) {
          const room = ['ss_shed', 'ss_attic', 'ss_garage', 'ss_basement', 'ss_secret_room', 'ss_dungeon'][Math.floor(i / 40) % 6];
          s.player.assets.push({ id: 'simh', kind: 'house', name: 'Sim House', type: 'house', value: 400000, cond: 80, units: 1, tenants: [], renovations: [{ id: room, unit: 0, quality: 'great', year: s.year }] });
          s.player.housing = { type: 'own', assetId: 'simh', rent: 0, name: 'Sim House' };
          s.player.money = Math.max(s.player.money, 2e6);
          const v = ctx.makeAdultNear(s, { minAge: 25, maxAge: 50 });
          ctx.capTake(s, v, 'simh:' + room);
          resolveAll(s, 'kidnap-start');
        }
        for (let k = 0; k < 2 && !s.dead; k++) {
          const ids = ['cap_feed', 'cap_med', 'cap_comf', 'cap_rein'].filter((id) => ACTIONS[id].when(s));
          if (!ids.length) break;
          const id = ids[Math.floor(Math.random() * ids.length)];
          ctx.doAction(s, id); stats.actionsRun[id] = (stats.actionsRun[id] || 0) + 1; check(s, 'action:' + id); resolveAll(s, 'kidnap:' + id);
        }
        if (s.player.kn && s.player.kn.cap && chance(0.05)) { ctx.doAction(s, 'kn_release'); resolveAll(s, 'kidnap:release'); }
      } catch (e) { fail('kidnap persona threw: ' + e.stack.split(String.fromCharCode(10)).slice(0, 3).join(' | '), s); }
    }
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
  kin.lives++; kin.people += Object.keys(s.people).length; kin.maxPeople = Math.max(kin.maxPeople, Object.keys(s.people).length);
  for (const id in s.player.rels) { const k = s.player.rels[id].kind; if (['aunt', 'cousin', 'nibling', 'inlaw', 'sibling', 'halfsibling'].includes(k)) kin[k] = (kin[k] || 0) + 1; }
  const lf = s.player.life; biz.founded += lf.companiesFounded || 0; biz.ipos += lf.ipos || 0; biz.exits += lf.exits || 0; biz.fails += lf.bizFails || 0;
  for (const [k, t] of [['moves', 'cityMoves'], ['signed', 'tenantsSigned'], ['evicted', 'tenantsEvicted'], ['wasEvicted', 'evicted'], ['beaten', 'evictionsBeaten'], ['rent', 'rentCollected']]) cities[k] += lf[t] || 0;
  cities.places += (s.player.places || []).length;
  for (const [k, c] of [['lessons', 'lessonsStarted'], ['medals', 'lessonMedals'], ['blackBelts', 'blackBelts'], ['captains', 'captain'], ['titles', 'clubTitles'], ['valedictorians', 'valedictorian'], ['elite', 'eliteAdmit'], ['fullRides', 'fullRide'], ['detentions', 'detentions'], ['suspensions', 'suspensions'], ['expulsions', 'expulsions'], ['grounded', 'grounded'], ['bullied', 'bullied']]) youth[k] += lf[c] || 0;
  for (const [k, c] of [['missions', 'spyMissions'], ['burned', 'burned'], ['turned', 'turned']]) spies[k] += lf[c] || 0;
  for (const [k, c] of [['schemes', 'schemesStarted'], ['collapsed', 'schemesCollapsed'], ['cons', 'conStarted'], ['rings', 'ringStarted'], ['squeezes', 'squeezes'], ['ops', 'opStarted'], ['busts', 'opBusts'], ['deaths', 'opDeaths'], ['vigs', 'vigStarted'], ['aided', 'casesAided'], ['twists', 'workTwists'], ['organized', 'organized'], ['abuseSurvived', 'abuseSurvived'], ['abuseDone', 'abuseDone']]) ventures[k] += lf[c] || 0;
  for (const [k, c] of [['books', 'booksStarted'], ['bookNet', 'bookNet'], ['horses', 'racehorses'], ['wins', 'ownerWins'], ['bigWins', 'bigRaceWins'], ['foals', 'foals'], ['sold', 'horsesSold'], ['whales', 'whaleBeaten'], ['licenses', 'licenseLost']]) house[k] += lf[c] || 0;
  if (s.challenge) { chal.started++; if (s.challenge.done) chal.done++; else if (s.challenge.failed || s.challenge.pid !== s.playerId) chal.failed++; }
  const nt = s.player.assets.reduce((n, a) => n + (a.tenants || []).length, 0); cities.tenants += nt; cities.maxTenants = Math.max(cities.maxTenants, nt);
  for (const [k, t] of [['filed', 'lawsuitsFiled'], ['won', 'lawsuitsWon'], ['lost', 'lawsuitsLost'], ['settled', 'settlements'], ['sued', 'timesSued'], ['beaten', 'suitsBeaten'], ['small', 'smallClaimsWon'], ['rulings', 'rulings'], ['justices', 'supremeCourt'], ['clientWins', 'clientWins']]) courts[k] += lf[t] || 0;
}

// One run's raw numbers. Shards write these; --merge adds them up.
let agg = { lives: stats.lives, seed: SEED, maxSecs: (Date.now() - t0) / 1000, shards: 1, failures, fails, stats, biz, kin, courts, cities, chal, house, youth, military, spies, ventures, seen: [...g('STORY_SEEN')] };
if (opts.json) { fs.writeFileSync(opts.json, JSON.stringify(agg)); process.exit(0); }
if (opts.merge) agg = opts.merge.map((f) => JSON.parse(fs.readFileSync(f, 'utf8'))).reduce(mergeAgg);
// Numbers add up (keys starting with "max" take the larger), lists join, objects merge.
function mergeAgg(a, b) {
  const out = Array.isArray(a) ? a.concat(b) : {};
  if (Array.isArray(a)) return out;
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[k], y = b[k];
    if (k === 'seed') out[k] = x ?? y;
    else if (x === undefined) out[k] = y;
    else if (y === undefined) out[k] = x;
    else if (typeof x === 'number') out[k] = k.startsWith('max') ? Math.max(x, y) : x + y;
    else out[k] = mergeAgg(x, y);
  }
  return out;
}
report(agg);

function report({ stats, biz, kin, courts, cities, chal, house, youth, military, spies, ventures, failures, fails, seed, maxSecs, shards, seen }) {
const avg = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0);
const median = (a) => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : 0; };
const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k}:${v}`).join(', ');
const evIds = g('EVENT_IDS');
const neverFired = evIds.filter((id) => !stats.events[id]);
const neverRun = ACTION_ORDER.filter((id) => !stats.actionsRun[id]);
const STORIES = g('STORIES'), SEEN = new Set(seen);
const chapters = g('STORY_IDS').flatMap((id) => Object.keys(STORIES[id].chapters).map((ch) => id + ':' + ch));
const unread = chapters.filter((k) => !SEEN.has(k));
console.log(`\nByteLyfe sim: ${stats.lives} lives, seed ${seed}, ${maxSecs.toFixed(1)}s${shards > 1 ? ` (${shards} shards in parallel)` : ''}`);
console.log(`Deaths: ${stats.deaths.length} · avg age ${avg(stats.deaths)} · median ${median(stats.deaths)} · max ${stats.maxAge}`);
console.log(`Net worth at death: median ${median(stats.worth)} · avg ${avg(stats.worth)}`);
console.log(`Causes: ${top(stats.causes, 10)}`);
console.log(`Titles: ${top(stats.titles, 10)}`);
console.log(`Degrees held at end: ${top(stats.degrees, 12)}`);
console.log(`Careers reached (max level): ${Object.keys(stats.careers).length} of ${JOB_IDS.length}`);
console.log(`Prison-years observed: ${stats.prison}`);
console.log(`Business: ${biz.founded} founded (last gen per life) · ${biz.coYears} company-years, ${Math.round((biz.profitable / Math.max(1, biz.coYears)) * 100)}% profitable · ${biz.ipos} IPOs · ${biz.exits} exits · ${biz.fails} bankruptcies · max worth ${Math.round(biz.maxVal).toLocaleString()} · max staff ${biz.maxStaff}`);
console.log(`Company-years by industry: ${top(biz.byInd, 22)}`);
console.log(`Family (last gen per life, average): ${['sibling', 'aunt', 'cousin', 'nibling', 'inlaw'].map((k) => `${((kin[k] || 0) / Math.max(1, kin.lives)).toFixed(1)} ${k}`).join(' · ')} · ${Math.round(kin.people / Math.max(1, kin.lives))} people in the save (max ${kin.maxPeople})`);
console.log(`Courts (last gen per life): ${courts.filed} lawsuits filed · ${courts.won} won, ${courts.lost} lost, ${courts.settled} settled · sued ${courts.sued} times, ${courts.beaten} beaten · ${courts.small} small-claims wins · ${courts.rulings} rulings, ${courts.justices} justices confirmed · ${courts.clientWins} trials won for clients`);
console.log(`Cities (last gen per life): ${cities.moves} city moves · ${(cities.places / Math.max(1, kin.lives)).toFixed(1)} cities lived in on average · ${cities.signed} leases signed by tenants · ${cities.tenants} tenants at the end (max ${cities.maxTenants}) · ${cities.evicted} tenants evicted · player evicted ${cities.wasEvicted} times, ${cities.beaten} evictions beaten · ${Math.round(cities.rent).toLocaleString()} rent collected`);
console.log(`Challenges: ${chal.started} started · ${chal.done} completed · ${chal.failed} failed`);
console.log(`Growing up (last gen per life): ${youth.lessons} lessons started, ${youth.medals} medals, ${youth.blackBelts} black belts · ${youth.captains} captains, ${youth.titles} club titles · ${youth.valedictorians} valedictorians, ${youth.elite} elite admissions, ${youth.fullRides} full rides · ${youth.detentions} detentions, ${youth.suspensions} suspensions, ${youth.expulsions} expulsions · grounded ${youth.grounded} times · ${youth.bullied} bullied`);
console.log(`Spies: ${spies.lives} lives in the agency, ${spies.acts} intelligence actions, ${spies.missions} missions, ${spies.burned} burned covers, ${spies.turned} turned or doubled`);
console.log(`Ventures: ${ventures.schemes} investment schemes (${ventures.collapsed} collapsed), ${ventures.cons} long cons, ${ventures.rings} blackmail rings (${ventures.squeezes} squeezes), ${ventures.ops} drug operations (${ventures.busts} busts, ${ventures.deaths} deaths), ${ventures.vigs} vigilantes, ${ventures.organized} neighborhood projects, ${ventures.aided} cases aided, ${ventures.twists} career twists, abuse: ${ventures.abuseSurvived} lives affected and ${ventures.abuseDone} lives where the player was the one doing it`);
console.log(`Military: ${military.lives} lives served, ${military.acts} military actions, most tours in one life ${military.maxTours}`);
console.log(`The house (last gen per life): ${house.books} books started, ${Math.round(house.bookNet).toLocaleString()} kept · ${house.horses} racehorses, ${house.wins} race wins, ${house.bigWins} big-race wins, ${house.foals} foals, ${house.sold} sold · casinos ${biz.byInd.casino || 0} company-years, ${house.whales} whale-beating years, ${house.licenses} licenses lost`);
console.log(`Content tags on: ${TAG_IDS.map((t) => `${t} in ${stats.tagLives[t] || 0} lives`).join(', ')}`);
console.log(`Events never fired (${neverFired.length}/${evIds.length}): ${neverFired.join(', ') || 'none'}`);
console.log(`Actions never run (${neverRun.length}/${ACTION_ORDER.length}): ${neverRun.join(', ') || 'none'}`);
console.log(`Story chapters never reached (${unread.length}/${chapters.length}): ${unread.join(', ') || 'none'}`);
if (failures) {
  console.log(`\n❌ ${failures} invariant failures. First ${Math.min(25, fails.length)}:`);
  for (const f of fails.slice(0, 25)) console.log('  - ' + f);
  process.exit(1);
}
console.log('\n✅ No invariant failures.');
}
