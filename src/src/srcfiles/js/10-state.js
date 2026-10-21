/* =====================================================================
 * 10-state.js — the shape of a life, and the accessors everything uses.
 *
 * One save = one family line. `s.people` holds every person who matters
 * (the player character included); `s.player` holds the things only the
 * person you are playing has (money, school, career, relationships...).
 * When you continue as your child, `s.playerId` moves and `s.player` is
 * rebuilt for the heir.
 *
 * Short accessors used throughout the engine and event content:
 *   P(s)  the player's Person          M(s)  the player-only block
 *   A(s)  the player's age             ageOf(s, p)  anyone's age
 * ===================================================================== */

const SAVE_VERSION = 1;
let G = null; // the life being played, or null on the title screen

function newState(year) {
  return {
    v: SAVE_VERSION,
    id: 'life_' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36),
    created: Date.now(),
    updated: Date.now(),
    year,
    startYear: year,
    playerId: null,
    player: null,
    people: {},
    pets: {},
    log: [],
    pending: [],
    nextId: 1,
    gen: 1,
    lineage: [], // one record per finished player character in this family line
    listings: {}, // shop/job listings, regenerated each year: { key: { year, items } }
    dead: false,
    over: false, // true once the family line has ended (no heir chosen)
  };
}

function newPlayerBlock() {
  return {
    money: 0,
    trust: 0, // inheritance held until 18
    karma: 50,
    fame: 0,
    skills: {},
    edu: { degrees: [], current: null, dropouts: 0 },
    career: null, // { id, level, perf, years, levelYears, salary }
    ptJob: null, // { id, pay }
    retired: null, // { pension }
    jobHistory: [],
    rels: {}, // personId -> { kind, rel, since }
    housing: { type: 'parents', assetId: null, rent: 0, name: '' },
    assets: [],
    loans: [],
    invest: { savings: 0, bonds: 0, index: 0, stocks: 0, crypto: 0 },
    diseases: [], // { id, since, known }
    addictions: {}, // id -> severity 0..100
    record: [], // { crime, year, years }
    prison: null,
    wanted: 0, // >0 while you are a fugitive
    license: false,
    socials: null, // { followers, posts, verified }
    pregnancy: null, // { partnerId, carrier: 'me'|'partner', year }
    lifestyle: 'normal',
    diet: 'normal', // a DIETS key (36-looks.js); shapes body fat each year
    freeRestyle: false, // true right after turning 18: one free redesign of face and body
    counters: {}, // per-year action counts, reset on age up
    lastCounters: {},
    evHist: {}, // event id -> year it last fired
    goals: [],
    achievements: [], // unlocked during this life
    life: {}, // per-life tallies for titles and achievements
    flags: {}, // misc one-off flags
    lastFinance: null,
    will: 'equal',
    companies: [], // businesses you own (34-business.js)
    bizIncome: [], // this year's pay from your companies, collected by financeTick
  };
}

/* ---- accessors ---------------------------------------------------- */
function P(s) { return s.people[s.playerId]; }
function M(s) { return s.player; }
function ageOf(s, p) { return s.year - p.birthYear; }
function A(s) { return ageOf(s, P(s)); }
function person(s, id) { return s.people[id]; }
function country(s, p) { return COUNTRIES[(p || P(s)).country] || COUNTRIES.us; }
function econ(s) { return country(s).econ; }
// Scale a US-baseline price to the player's country and round it nicely.
function price(s, usd) { return nicePrice(usd * econ(s)); }
function inPrison(s) { return !!M(s).prison; }
function free(s) { return !s.dead && !M(s).prison; }
function isAdult(s) { return A(s) >= 18; }
function canAfford(s, amt) { return M(s).money >= amt; }
function tally(s, key, n) { const l = M(s).life; l[key] = (l[key] || 0) + (n ?? 1); return l[key]; }
function lifeCount(s, key) { return M(s).life[key] || 0; }
// Per-year counters: limit how often an action pays off in one year.
function bump(s, key) { const c = M(s).counters; c[key] = (c[key] || 0) + 1; return c[key]; }
function count(s, key) { return M(s).counters[key] || 0; }
function flag(s, key, val) { if (val !== undefined) M(s).flags[key] = val; return M(s).flags[key]; }
function uid(s, prefix) { s.nextId = (s.nextId || 1) + 1; return prefix + s.nextId.toString(36); }

/* ---- names and pronouns ------------------------------------------- */
function randomFirst(countryId, gender) {
  const C = COUNTRIES[countryId] || COUNTRIES.us;
  const pool = gender === 'm' ? C.m : gender === 'f' ? C.f : (chance(0.5) ? C.m : C.f);
  return pick(pool);
}
function randomLast(countryId) { return pick((COUNTRIES[countryId] || COUNTRIES.us).last); }
function fullName(p) { return p.first + ' ' + p.last; }
// Pronoun set for a person. 'x' = nonbinary (they/them).
function pr(p) {
  if (p.gender === 'm') return { he: 'he', him: 'him', his: 'his', He: 'He', His: 'His', is: 'is', was: 'was', has: 'has', s: 's' };
  if (p.gender === 'f') return { he: 'she', him: 'her', his: 'her', He: 'She', His: 'Her', is: 'is', was: 'was', has: 'has', s: 's' };
  return { he: 'they', him: 'them', his: 'their', He: 'They', His: 'Their', is: 'are', was: 'were', has: 'have', s: '' };
}
function genderWord(p, m, f, x) { return p.gender === 'm' ? m : p.gender === 'f' ? f : x; }
