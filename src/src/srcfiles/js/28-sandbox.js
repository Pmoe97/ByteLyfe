/* =====================================================================
 * 28-sandbox.js — the free "god mode": edit anything, and rewind time.
 * Nothing here is gated. The rewind buffer keeps the last REWIND_MAX years.
 * ===================================================================== */

const REWIND = {}; // life id -> JSON snapshots, oldest first
const REWIND_MAX = 10;

function pushRewind(s) {
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
};
