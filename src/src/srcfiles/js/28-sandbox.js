/* =====================================================================
 * 28-sandbox.js — the free "god mode": edit anything (you, and anyone in
 * your life), and rewind time.
 * Nothing here is gated. The rewind buffer keeps the last REWIND_MAX years.
 * ===================================================================== */

const REWIND = {}; // life id -> JSON snapshots, oldest first
const REWIND_MAX = 10;

function pushRewind(s) {
  if (s.headStart) return; // a head start (90-head-start.js) is not a life you can rewind into
  const a = REWIND[s.id] || (REWIND[s.id] = []);
  a.push(JSON.stringify(s));
  if (a.length > REWIND_MAX) a.shift();
}
function rewindDepth(s) { return (REWIND[s.id] || []).length; }
// Returns the state from `years` age-ups ago (or null). The caller swaps it in.
function rewindState(s, years) {
  const a = REWIND[s.id];
  if (!a || !a.length) return null;
  const n = clamp(years || 1, 1, a.length);
  const snap = a.splice(a.length - n, n)[0];
  const st = JSON.parse(snap);
  st.pending = [];
  return st;
}

const Sandbox = {
  setStat(s, k, v) {
    if (STAT_KEYS.includes(k)) P(s).stats[k] = clamp100(v);
    else if (k === 'karma' || k === 'fame') M(s)[k] = clamp100(v);
  },
  setMoney(s, v) { M(s).money = Math.round(Number(v) || 0); },
  setSkill(s, k, v) { M(s).skills[k] = clamp(Math.round(Number(v) || 0), 0, 100); },
  toggleTrait(s, t) {
    const p = P(s);
    if (p.traits.includes(t)) p.traits = p.traits.filter((x) => x !== t);
    else if (p.traits.length < 4 && !traitsConflict(p.traits, t)) p.traits.push(t);
  },
  cureAll(s) { M(s).diseases = []; M(s).addictions = {}; P(s).stats.health = Math.max(P(s).stats.health, 60); },
  freeMe(s) {
    if (M(s).prison) release(s, 'A mysterious pardon arrived.');
    M(s).wanted = 0;
    M(s).flags.heat = [];
  },
  clearRecord(s) { M(s).record = []; M(s).life.felonies = 0; },
  giveLicense(s) { M(s).license = true; },
  setRel(s, pid, v) { const r = relOf(s, pid); if (r) r.rel = clamp100(v); },
  rerollGoals(s) { assignGoals(s); },
  grantDegree(s, type, major) {
    if (!DEGREE_NAMES[type]) return;
    if (type !== 'high' && !hasHighSchool(s)) M(s).edu.degrees.push({ type: 'high', year: s.year, gpa: 80 });
    M(s).edu.degrees.push({ type, major: major || null, year: s.year, gpa: 85 });
  },
  hireAt(s, jobId, level) {
    if (!JOBS[jobId]) return;
    if (M(s).career) leaveJob(s, 'switched');
    if (M(s).edu.current) M(s).edu.current = null;
    hire(s, jobId, clamp(level || 0, 0, JOBS[jobId].ladder.length - 1));
  },

  /* ---- other people ------------------------------------------------
   * Deep edits for anyone in your life. They keep the family tree sane:
   * parents stay at least 14 years older than their kids, and a romantic
   * partner stays on your side of 18 (adults with adults, teens with teens).
   * Bodies only exist from ADULT_AGE, so aging someone down removes theirs. */
  npcAgeRange(s, pid) {
    const p = s.people[pid];
    if (!p) return [0, 0];
    let lo = 0, hi = 110;
    for (const id of p.parents || []) { const q = s.people[id]; if (q) hi = Math.min(hi, ageOf(s, q) - 14); }
    for (const id of p.children || []) { const q = s.people[id]; if (q) lo = Math.max(lo, ageOf(s, q) + 14); }
    const romantic = ['partner', 'fiance', 'spouse', 'lover', 'fling', 'ex'].includes(relKind(s, pid));
    if (romantic && A(s) >= ADULT_AGE) lo = Math.max(lo, ADULT_AGE);
    else if (romantic) hi = Math.min(hi, ADULT_AGE - 1);
    if (p.partner || p.married) lo = Math.max(lo, ADULT_AGE);
    const now = ageOf(s, p);
    return hi < lo ? [now, now] : [lo, hi];
  },
  npcAge(s, pid, age) {
    const p = s.people[pid];
    if (!p || !p.alive) return;
    const [lo, hi] = Sandbox.npcAgeRange(s, pid);
    p.birthYear = s.year - clamp(Math.round(Number(age) || 0), lo, hi);
    if (ageOf(s, p) < ADULT_AGE) delete p.body;
    else ensureBody(s, p);
    if (ageOf(s, p) < 16 && p.job && !p.job.student) p.job = null;
  },
  npcName(s, pid, part, v) {
    const p = s.people[pid], name = cleanName(v);
    if (p && name && (part === 'first' || part === 'last')) p[part] = name;
  },
  npcStat(s, pid, k, v) { const p = s.people[pid]; if (p && STAT_KEYS.includes(k)) p.stats[k] = clamp100(v); },
  npcMoney(s, pid, v) { const p = s.people[pid]; if (p) p.money = Math.round(Number(v) || 0); },
  npcTrait(s, pid, t) {
    const p = s.people[pid];
    if (!p || !TRAITS[t]) return;
    p.traits = p.traits || [];
    if (p.traits.includes(t)) p.traits = p.traits.filter((x) => x !== t);
    else if (p.traits.length < 4 && !traitsConflict(p.traits, t)) p.traits.push(t);
  },
  npcGender(s, pid, g) { const p = s.people[pid]; if (p && ['m', 'f', 'x'].includes(g)) p.gender = g; },
  npcOrient(s, pid, o) { const p = s.people[pid]; if (p && ORIENTATIONS[o]) p.orient = o; },
  // v: a JOBS id, 'pt:<PT_JOBS id>', 'student', 'retired' or 'none'.
  npcJob(s, pid, v, level) {
    const p = s.people[pid];
    if (!p || !p.alive) return;
    const age = ageOf(s, p);
    p.retired = false;
    if (v === 'retired' && age >= 40) { p.job = null; p.retired = true; }
    else if (v === 'student') p.job = { student: true };
    else if (String(v).startsWith('pt:') && PT_JOBS[v.slice(3)] && age >= 14) p.job = { pt: v.slice(3) };
    else if (JOBS[v] && age >= 16) p.job = { id: v, level: clamp(Math.round(Number(level) || 0), 0, JOBS[v].ladder.length - 1) };
    else p.job = null;
  },
  npcEdu(s, pid, deg, major) {
    const p = s.people[pid];
    if (!p) return;
    p.edu = deg && DEGREE_NAMES[deg] ? deg : null;
    p.major = p.edu && MAJORS[major] ? major : null;
  },
  npcHome(s, pid, cc, city) {
    const p = s.people[pid], C = COUNTRIES[cc];
    if (!p || !C) return;
    p.country = cc;
    p.city = C.cities.includes(city) ? city : C.cities.includes(p.city) ? p.city : C.cities[0];
  },
  // Friends, best friends and enemies can trade places; family and romance can't.
  npcKinds: ['friend', 'bestie', 'enemy'],
  npcKindEditable(s, pid) { const k = relKind(s, pid); return ['friend', 'bestie', 'enemy', 'classmate', 'coworker', 'cellmate'].includes(k); },
  npcKind(s, pid, kind) { const r = relOf(s, pid); if (r && Sandbox.npcKindEditable(s, pid) && Sandbox.npcKinds.includes(kind)) r.kind = kind; },
};
