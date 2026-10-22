/* =====================================================================
 * 52-challenges.js — challenges: a starting scenario plus goals. There are
 * hand-made ones, a daily one generated from the date (the same for
 * everyone, with streaks), and random ones on demand. All free, always.
 *
 * A challenge definition: { id, name, emoji, start, goals: [[kind, n]], stars,
 *   chaos, daily }. CH_STARTS are the scenarios (createLife options plus a
 *   setup), CH_GOALS the goal kinds (text, check, and how to generate one).
 * s.challenge = { id, name, emoji, start, goals: [{ k, n, done }], daily, pid,
 *   done, failed }   the challenge this life is playing. Only the character
 *   who started it can finish it; it fails when they die without it.
 * META.challenges = { done: { id: times }, daily: { last, streak, best },
 *   history: [{ name, done, when }] }   kept across lives (29-save.js).
 * checkChallenge runs in afterChange, so goals complete the moment they're met.
 * ===================================================================== */

const CH_STARTS = {
  any: { name: 'Any life', emoji: '🎲', desc: 'A random birth, anywhere.' },
  broke: { name: 'Born broke', emoji: '🥫', desc: 'Your family is struggling to get by.', opts: { wealth: 'poor' } },
  rich: { name: 'Silver spoon', emoji: '🥄', desc: 'Your family is wealthy.', opts: { wealth: 'rich' } },
  royal: { name: 'Born royal', emoji: '👑', desc: 'In line for a throne.', opts: () => ({ country: pick(['uk', 'es', 'se', 'jp']), royal: true }) },
  orphan: { name: 'Orphan', emoji: '🕯️', desc: 'You lose both parents as a baby. Your grandparents raise you.', setup: (s) => { for (const p of relPeople(s, ['parent'])) npcDies(s, p, 'a car crash'); } },
  sickly: { name: 'Born sickly', emoji: '🤧', desc: 'Frail from your very first day.', opts: { health: 25, traits: ['sickly'] } },
  prodigy: { name: 'Child prodigy', emoji: '🧠', desc: 'Smarter than your teachers by age six.', opts: { smarts: 98, traits: ['bookworm'] } },
  plain: { name: 'Born plain', emoji: '🥔', desc: 'Nobody will ever call you a looker.', opts: { looks: 8 } },
};
// Goal kinds. n is the number in the goal (a sum of money is in dollars, shown in local money).
const CH_GOALS = {
  worth: { text: (n) => `Be worth ${fmtMoneyShort(n)}`, check: (s, n) => netWorth(s) >= n, gen: [1e6, 5e6, 2e7] },
  retireRich: { text: (n) => `Retire before ${n} with ${fmtMoneyShort(1e6)}`, check: (s, n) => !!M(s).retired && A(s) < n && netWorth(s) >= 1e6, gen: [55, 60, 65] },
  age: { text: (n) => `Live to ${n}`, check: (s, n) => A(s) >= n, gen: [85, 90, 95] },
  kids: { text: (n) => `Have ${n} children`, check: (s, n) => LC(s, 'kids') >= n, gen: [3, 4, 6] },
  degree: { text: (d) => `Earn ${aAn(DEGREE_NAMES[d] || d)}`, check: (s, d) => hasDegree(s, d), gen: ['bachelor', 'master', 'jd', 'md', 'phd'] },
  top: { text: () => 'Reach the top of a career', check: (s) => M(s).achievements.includes('top_rung'), gen: [1] },
  fame: { text: (n) => `Reach ${n} fame`, check: (s, n) => M(s).fame >= n, gen: [50, 70, 90] },
  countries: { text: (n) => `Live in ${n} countries`, check: (s, n) => LC(s, 'countries') + 1 >= n, gen: [3, 4] },
  cities: { text: (n) => `Live in ${n} cities`, check: (s, n) => places(s).length >= n, gen: [3, 4, 5] },
  clean: { text: (n) => `Reach ${n} with a clean record`, check: (s, n) => A(s) >= n && !M(s).record.length, gen: [50, 60, 70] },
  karma: { text: (n) => `Reach ${n} karma`, check: (s, n) => M(s).karma >= n, gen: [85, 90, 95] },
  prison: { text: (n) => `Spend ${n} years in prison`, check: (s, n) => LC(s, 'prisonYears') >= n, gen: [2, 5] },
  partners: { text: (n) => `Date ${n} people`, check: (s, n) => LC(s, 'partners') >= n, gen: [5, 8] },
  marry: { text: (n) => (n === 1 ? 'Get married' : `Get married ${n} times`), check: (s, n) => LC(s, 'marriages') >= n, gen: [1, 2, 3] },
  company: { text: (n) => `Own a company worth ${fmtMoneyShort(n)}`, check: (s, n) => companies(s).some((c) => !c.closed && coWorth(c) >= n), gen: [1e6, 1e7] },
  donate: { text: (n) => `Give ${fmtMoneyShort(n)} to charity`, check: (s, n) => LC(s, 'donated') >= n, gen: [1e5, 1e6] },
  elected: { text: () => 'Win an election', check: (s) => LC(s, 'elections') >= 1, gen: [1] },
  boss: { text: () => 'Run a crime family', check: (s) => LC(s, 'becameBoss') + LC(s, 'cartelBoss') >= 1 },
  crown: { text: () => 'Wear the crown', check: (s) => LC(s, 'crowned') >= 1 },
  followers: { text: (n) => `Reach ${fmtNum(n)} followers`, check: (s, n) => !!M(s).socials && M(s).socials.followers >= n, gen: [1e5, 1e6] },
  tenants: { text: (n) => `Have ${n} tenants at once`, check: (s, n) => allTenants(s) >= n, gen: [3, 5] },
  pets: { text: (n) => `Adopt ${n} pets`, check: (s, n) => LC(s, 'pets') >= n, gen: [2, 4] },
  vacations: { text: (n) => `Take ${n} vacations`, check: (s, n) => LC(s, 'vacations') >= n, gen: [5, 10] },
  broke: { text: () => 'Die broke', check: (s) => netWorth(s) < 0, atDeath: true },
};
// Goals a generated challenge can draw (all reachable from any start).
const CH_GEN_GOALS = ['worth', 'retireRich', 'age', 'kids', 'degree', 'top', 'fame', 'countries', 'cities', 'clean', 'karma', 'partners', 'marry', 'company', 'donate', 'elected', 'followers', 'tenants', 'pets', 'vacations'];
const CHALLENGES = [
  { id: 'broke_retire_rich', name: 'Born Broke, Retire Rich', emoji: '🥫', start: 'broke', goals: [['retireRich', 60]], stars: 3 },
  { id: 'rags_riches', name: 'Rags to Riches', emoji: '💰', start: 'broke', goals: [['worth', 1e8]], stars: 4 },
  { id: 'mogul', name: 'Self-Made Mogul', emoji: '🏢', start: 'broke', goals: [['company', 1e9]], stars: 5 },
  { id: 'landlord', name: 'Landlord of the Year', emoji: '🗝️', start: 'broke', goals: [['tenants', 10]], stars: 4 },
  { id: 'nothing_to_office', name: 'Nothing to Office', emoji: '🗳️', start: 'broke', goals: [['elected']], stars: 3 },
  { id: 'silver_saint', name: 'Silver Spoon Saint', emoji: '😇', start: 'rich', goals: [['donate', 1e6], ['karma', 95]], stars: 3 },
  { id: 'black_sheep', name: 'Black Sheep', emoji: '🐑', start: 'rich', goals: [['prison', 10], ['broke']], stars: 3 },
  { id: 'heir_apparent', name: 'Heir Apparent', emoji: '👑', start: 'royal', goals: [['crown']], stars: 3 },
  { id: 'royal_rebel', name: 'Royal Rebel', emoji: '⛓️', start: 'royal', goals: [['prison', 3], ['fame', 80]], stars: 3 },
  { id: 'full_house', name: 'Full House', emoji: '👨‍👩‍👧‍👦', start: 'orphan', goals: [['marry', 1], ['kids', 6]], stars: 2 },
  { id: 'against_odds', name: 'Against the Odds', emoji: '🤧', start: 'sickly', goals: [['age', 90]], stars: 4 },
  { id: 'prodigy', name: 'Prodigy', emoji: '🧠', start: 'prodigy', goals: [['degree', 'md'], ['degree', 'phd']], stars: 2 },
  { id: 'glow_up', name: 'Glow-Up', emoji: '✨', start: 'plain', goals: [['fame', 80]], stars: 3 },
  { id: 'globetrotter', name: 'Globetrotter', emoji: '🌍', start: 'any', goals: [['countries', 5]], stars: 2 },
  { id: 'spotless', name: 'Spotless', emoji: '🧼', start: 'any', goals: [['clean', 80], ['karma', 85]], stars: 2 },
  { id: 'heartbreaker', name: 'Heartbreaker', emoji: '💔', start: 'any', goals: [['partners', 10], ['marry', 3]], stars: 2 },
  { id: 'made', name: 'Made', emoji: '🕴️', start: 'any', goals: [['boss'], ['clean', 60]], stars: 5 },
  { id: 'influencer', name: 'Influencer', emoji: '📱', start: 'any', goals: [['followers', 1e6]], stars: 3 },
  { id: 'forever_young', name: 'Forever Young', emoji: '🦇', start: 'any', goals: [['age', 200]], stars: 4, chaos: true },
];
function chGoalText(g) { const G0 = CH_GOALS[g.k]; return G0 ? G0.text(g.n) : g.k; }
function startOf(def) { return CH_STARTS[def.start] || CH_STARTS.any; }
function availableChallenges() { return CHALLENGES.filter((c) => !c.chaos || chaosOn()); }

/* ---- generating ------------------------------------------------------------ */
// A tiny seeded generator, so a date always gives the same challenge (the game's own
// random numbers are left alone).
function seededRand(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function dateKey(d) { d = d || new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function dayBefore(key) { const [y, m, d] = key.split('-').map(Number); return dateKey(new Date(y, m - 1, d - 1)); }
function genChallenge(r, id, name) {
  const take = (arr) => arr[Math.floor(r() * arr.length)];
  const start = take(Object.keys(CH_STARTS).filter((k) => k !== 'royal' || r() < 0.5));
  const kinds = CH_GEN_GOALS.slice(), goals = [];
  for (let i = 0; i < 2; i++) {
    const k = kinds.splice(Math.floor(r() * kinds.length), 1)[0];
    goals.push([k, take(CH_GOALS[k].gen)]);
  }
  return { id, name: name || `${CH_STARTS[start].name}, with a twist`, emoji: CH_STARTS[start].emoji, start, goals, stars: 0 };
}
function dailyChallenge(key) {
  key = key || dateKey();
  const [y, m, d] = key.split('-').map(Number);
  const def = genChallenge(seededRand(strHash('daily:' + key)), 'daily:' + key, `Daily challenge · ${MONTHS[m - 1]} ${d}`);
  def.daily = key;
  def.emoji = '📅';
  return def;
}
function randomChallenge() { return genChallenge(seededRand(Math.floor(Math.random() * 2 ** 31)), 'random', null); }

/* ---- playing -------------------------------------------------------------------- */
function startChallenge(def, extra) {
  const st = startOf(def);
  const opts = Object.assign({}, typeof st.opts === 'function' ? st.opts() : st.opts || {}, extra || {});
  const s = createLife(opts);
  if (st.setup) st.setup(s);
  s.challenge = { id: def.id, name: def.name, emoji: def.emoji, start: def.start, daily: def.daily || null, pid: s.playerId, done: false, failed: false, goals: def.goals.map(([k, n]) => ({ k, n: n === undefined ? null : n, done: false })) };
  log(s, `🎯 Challenge: ${def.name}. ${s.challenge.goals.map(chGoalText).join('. ')}.`);
  return s;
}
function meta() { const c = META.challenges || (META.challenges = { done: {}, daily: { last: null, streak: 0, best: 0 }, history: [] }); return c; }
function checkChallenge(s) {
  const ch = s.challenge;
  if (!ch || ch.done || ch.failed || ch.pid !== s.playerId) return;
  for (const g of ch.goals) {
    const G0 = CH_GOALS[g.k];
    if (g.done || !G0 || (G0.atDeath && !s.dead)) continue;
    let ok = false;
    try { ok = G0.check(s, g.n); } catch (e) { ok = false; }
    if (ok) g.done = true;
  }
  if (ch.goals.every((g) => g.done)) {
    ch.done = true;
    challengeDone(s, ch);
    if (!s.dead) popup(s, { emoji: '🏆', title: 'Challenge complete!', tone: 'good', text: `${ch.name}: ${ch.goals.map(chGoalText).join('. ')}.${ch.daily ? ` Daily streak: ${meta().daily.streak}.` : ''}` });
    log(s, `🏆 Challenge complete: ${ch.name}.`, 'good');
  } else if (s.dead) {
    ch.failed = true;
    const c = meta();
    c.history.unshift({ name: ch.name, done: false, when: Date.now() });
    c.history = c.history.slice(0, 30);
    saveMetaSoon();
  }
}
function challengeDone(s, ch) {
  const c = meta();
  tally(s, 'challenges');
  if (!ch.daily && ch.id !== 'random') c.done[ch.id] = (c.done[ch.id] || 0) + 1;
  if (ch.daily) {
    const d = c.daily;
    if (d.last !== ch.daily) d.streak = d.last === dayBefore(ch.daily) ? d.streak + 1 : 1;
    if (!d.last || ch.daily > d.last) d.last = ch.daily;
    d.best = Math.max(d.best, d.streak);
  }
  c.history.unshift({ name: ch.name, done: true, when: Date.now() });
  c.history = c.history.slice(0, 30);
  saveMetaSoon();
}
// The streak counts if the last daily done was yesterday's (or today's).
function streakAlive() { const d = meta().daily; return !!d.last && (d.last === dateKey() || d.last === dayBefore(dateKey())); }

ACHIEVEMENTS.push(
  { id: 'challenge_accepted', name: 'Challenge Accepted', emoji: '🎯', desc: 'Complete a challenge.', check: (s) => !!(s.challenge && s.challenge.done) },
  { id: 'on_a_roll', name: 'On a Roll', emoji: '🔥', desc: 'Complete the daily challenge seven days in a row.', check: () => meta().daily.streak >= 7 },
  { id: 'completionist', name: 'Completionist', emoji: '🏅', desc: 'Complete ten different challenges.', check: () => Object.keys(meta().done).length >= 10 },
);
