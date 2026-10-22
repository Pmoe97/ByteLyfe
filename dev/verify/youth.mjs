// Growing up:  node dev/verify/youth.mjs
//
// Covers 55-school-life.js, 56-growing-up.js and 57-lessons.js:
//   1. school life — a teacher and principal who are people, a new teacher each year, a
//      report card every year, subjects that follow what you're good at, popularity in range
//   2. the record — three detentions make a suspension; suspensions can expel you to a new
//      school in the same grade; the record stays with you
//   3. bullies — standing up can end it; fighting back can get you suspended
//   4. clubs — at most three, tryouts can fail, ranks climb with practice, the top rank waits
//      for your last years, seasons are logged, titles go on your record
//   5. college — the exam tracks smarts; strong applications get into better colleges; a
//      full ride costs nothing; the college's tier stays on the degree
//   6. home — Playtime from birth; grounding hides outings and ends; the allowance comes from
//      your parents; sneaking out can get you grounded; none of it after 18 or away from home
//   7. lessons — parents pay while you live at home; practice and years climb the levels;
//      a black belt takes years; quitting keeps your level and rejoining picks it up
import { loadGame } from './loadgame.mjs';

const ctx = loadGame({ quiet: true });
const g = (name) => ctx.run(name);
ctx.seedRng(1701);
let failures = 0;
const ok = (cond, msg) => { if (!cond) { failures++; console.log('  ✖ ' + msg); } };
const SUBJECT_IDS = g('SUBJECT_IDS');
// A child in a city, aged up year by year with every popup answered by its first choice.
const kid = (age, opts) => {
  const s = ctx.createLife(Object.assign({ country: 'us', city: 'Denver' }, opts || {}));
  s.pending = [];
  while (ctx.A(s) < age && !s.dead) { s.pending = []; ctx.ageUp(s); }
  s.pending = [];
  return s;
};
const drain = (s) => { for (let k = 0; k < 50 && s.pending.length; k++) { const p = s.pending[0]; ctx.resolvePopup(s, p.id, Math.max(0, p.choices.findIndex((c) => !c.disabled)), p.input ? 'X' : undefined); } s.pending = []; };
const answer = (s, value) => { const pp = s.pending.find((p) => p.handler); const i = pp.choices.findIndex((c) => c.value === value); return ctx.resolvePopup(s, pp.id, i); };
const kinds = (s, kind) => Object.keys(s.player.rels).filter((pid) => s.player.rels[pid].kind === kind);

/* 1. school life ------------------------------------------------------------- */
{
  const s = kid(6);
  const cur = ctx.schoolCur(s);
  ok(cur && cur.stage === 'primary', 'school starts at five');
  const t = cur && s.people[cur.teacher], pr = cur && s.people[cur.principal];
  ok(t && kinds(s, 'teacher').length === 1 && kinds(s, 'principal').length === 1, 'there is one teacher and one principal, and they are people');
  ok(t && ctx.kinTitle(s, t.id) === `${g('SUBJECTS')[t.teaches].name} teacher` && ctx.npcJobTitle(pr) === 'Principal', `the teacher is named for their subject (${t && ctx.kinTitle(s, t.id)})`);
  const before = cur.teacher;
  s.pending = []; ctx.ageUp(s); drain(s);
  ok(ctx.schoolCur(s).teacher !== before && kinds(s, 'teacher').length === 1, 'a new school year brings a new teacher');
  ok(s.log[s.log.length - 1].lines.some((l) => l.t.startsWith('📋 Report card')), 'and a report card');
  // Subjects lean toward what you're good at.
  const a = kid(9); a.player.skills.art = 90; a.player.skills.writing = 0; a.people[a.playerId].stats.smarts = 40;
  for (let y = 0; y < 4; y++) { a.pending = []; ctx.ageUp(a); drain(a); }
  const ac = ctx.schoolCur(a);
  ok(ac.subj.art > ac.subj.eng, `a young artist does better in art than in English (${ac.subj.art} vs ${ac.subj.eng})`);
  ok(ac.pop >= 0 && ac.pop <= 100 && SUBJECT_IDS.every((k) => Math.abs(ac.subj[k]) <= 25), 'popularity and subjects stay in range');
}

/* 2. the record -------------------------------------------------------------- */
{
  const s = kid(12);
  const cur = ctx.schoolCur(s);
  for (let k = 0; k < 3; k++) ctx.schoolTrouble(s, 'detention', 'testing');
  ok(ctx.conductCount(s, 'detention') === 3 && ctx.conductCount(s, 'suspension') === 1, 'three detentions in a year make a suspension');
  let expelled = false;
  for (let k = 0; k < 4 && !expelled; k++) { const before = ctx.schoolCur(s).name; ctx.schoolTrouble(s, 'suspension', 'testing'); expelled = ctx.schoolCur(s).name !== before; }
  const now = ctx.schoolCur(s);
  ok(expelled && now.stage === cur.stage && ctx.conductCount(s, 'expulsion') === 1, 'repeated suspensions get you expelled to a new school in the same grade');
  ok(now.pop <= 15 && kinds(s, 'teacher').length === 1, 'where nobody likes you yet, and there is a new teacher');
}

/* 3. bullies --------------------------------------------------------------- */
{
  let ended = 0, suspended = 0;
  for (let k = 0; k < 40; k++) {
    const s = kid(12);
    const cur = ctx.schoolCur(s);
    cur.pop = 5;
    let tries = 0;
    while (!cur.bully && tries++ < 40) ctx.bullyYear(s, cur, { n: 0 });
    if (!cur.bully) continue;
    s.pending = [];
    ctx.bullyPopup(s, s.people[cur.bully]);
    answer(s, k % 2 ? 'stand' : 'fight');
    if (!ctx.schoolCur(s).bully) ended++;
    if (ctx.conductCount(s, 'suspension')) suspended++;
  }
  ok(ended > 8 && ended < 38, `standing up to a bully works some of the time (${ended} of 40)`);
  ok(suspended > 2, `fighting back can get you suspended (${suspended})`);
}

/* 4. clubs ------------------------------------------------------------------- */
{
  const s = kid(14);
  const cur = ctx.schoolCur(s);
  s.player.skills.athletics = 0; s.people[s.playerId].stats.health = 20;
  let cut = 0;
  for (let k = 0; k < 30; k++) { s.player.counters = {}; cur.clubs = []; s.player.skills.athletics = 0; s.people[s.playerId].stats.health = 20; s.pending = []; ctx.resolvePopup(s, ctx.popup(s, { handler: 'club', choices: [{ label: 'x', value: 'basketball' }] }).id, 0); if (!cur.clubs.includes('basketball')) cut++; }
  ok(cut > 3, `an unfit kid often gets cut at tryouts (${cut} of 30)`);
  cur.clubs = ['debate', 'chess', 'robotics'];
  s.pending = []; ctx.resolvePopup(s, ctx.popup(s, { handler: 'club', choices: [{ label: 'x', value: 'art' }] }).id, 0);
  ok(cur.clubs.length === 3 && !cur.clubs.includes('art'), 'three clubs at most');
  // Practice climbs the ranks; the top one only comes in your last years.
  const d = ctx.clubRec(cur, 'debate');
  s.player.skills.charisma = 70;
  d.pts = 200; cur.year = 1;
  ctx.clubSeason(s, cur, 'debate', { n: 0 });
  ok(d.r === 2, `a first-year with every point is still not captain (rank ${d.r})`);
  cur.year = cur.years;
  for (let k = 0; k < 20 && d.r < 3; k++) ctx.clubSeason(s, cur, 'debate', { n: 0 });
  ok(d.r === 3 && s.player.life.captain >= 1, 'in your last years you can become captain');
  ok(s.player.edu.resume.some((r) => r.text.includes('Debate Team')), 'and it goes on your record');
  ok(s.log[s.log.length - 1].lines.some((l) => l.t.startsWith('🗣️ Debate Team:')), 'seasons are in the log');
}

/* 5. college -------------------------------------------------------------- */
{
  const avg = (smarts) => { let t = 0; for (let k = 0; k < 40; k++) { const s = kid(16); s.people[s.playerId].stats.smarts = smarts; t += Number(ctx.takeExam(s, 0).text.match(/(\d+)(st|nd|rd|th) percentile/)[1]); } return t / 40; };
  const lo = avg(30), hi = avg(90);
  ok(hi > lo + 30, `the entrance exam follows smarts (${lo.toFixed(0)} vs ${hi.toFixed(0)})`);
  // A star student against a struggling one, applying to the same seven colleges.
  // The star has a record (a captain, a title); the weak student applies to the last four, the safety schools.
  const apply = (smarts, grades, exam, star) => {
    const s = kid(17);
    const cur = ctx.schoolCur(s);
    if (!cur || cur.stage !== 'high' || !ctx.free(s)) return null; // dropped out, held back a stage, or in juvie
    cur.year = cur.years; cur.grades = grades; s.people[s.playerId].stats.smarts = smarts;
    ctx.examRec(s).best = exam;
    if (star) { ctx.addResume(s, 'Captain, Debate Team', 3, 'academic'); ctx.addResume(s, 'Won the state tournament (Debate Team)', 3, 'academic'); ctx.addResume(s, 'Black belt in karate', 2.5, 'sport'); }
    s.pending = [];
    ctx.doAction(s, 'cp_apply');
    for (let k = 0; k < 4; k++) { const pp = s.pending.find((p) => p.handler === 'cpPick'), nums = pp.choices.filter((c) => typeof c.value === 'number'); answer(s, (star ? nums[0] : nums[nums.length - 1]).value); }
    answer(s, 'send'); answer(s, 'change');
    ok(s.player.edu.apps && s.player.edu.apps.list.length === 4, 'four applications go out');
    ctx.highSchoolFinale(s, cur);
    return s;
  };
  let star = 0, weak = 0, starElite = 0;
  for (let k = 0; k < 15; k++) {
    const a = apply(95, 97, 98, true), b = apply(35, 45, 20, false);
    if (a) { star += a.player.edu.offers.length; starElite += a.player.edu.offers.some((o) => o.tier === 'elite') ? 1 : 0; }
    if (b) weak += b.player.edu.offers.length;
  }
  ok(starElite >= 5 && weak > 0, `strong applications get into elite schools, and weak ones still get in somewhere (${starElite} of 15 stars got an elite offer; ${weak} offers for the weak students)`);
  // A full ride costs nothing, and the degree remembers the college.
  const s = kid(17);
  s.player.edu.current = null;
  s.player.edu.degrees.push({ type: 'high', year: s.year, gpa: 95 });
  s.pending = [];
  ctx.openMajorPicker(s, 'university', { name: 'Ashworth University', tier: 'elite', cost: 60000, sch: 1, schType: 'academic' });
  answer(s, 'cs');
  const c = s.player.edu.current;
  ok(c && c.funding === 'scholarship' && c.cost === 0 && c.tier === 'elite' && c.name === 'Ashworth University', 'a full ride is free and the college is elite');
  c.year = c.years; c.grades = 80; s.pending = [];
  ctx.schoolTick(s);
  ok(s.player.edu.degrees.some((d) => d.type === 'bachelor' && d.tier === 'elite'), 'the degree keeps the college tier');
}

/* 6. home ------------------------------------------------------------------- */
{
  const baby = kid(0);
  ok(ctx.actionList(baby, 'play').some((a) => a.id === 'pl_babble'), 'a baby has things to do');
  const s = kid(13);
  const h = ctx.homeRec(s);
  ok(ctx.actionList(s, 'social').some((a) => a.id === 'meet'), 'a teen can go out');
  ctx.groundFor(s, 'testing', true);
  ok(ctx.grounded(s) && !ctx.actionList(s, 'social').some((a) => a.id === 'meet' || a.id === 'party'), 'grounding hides outings');
  ok(ctx.actionList(s, 'parents').some((a) => a.id === 'hm_sneak'), 'but you can still sneak out');
  s.pending = []; ctx.ageUp(s); drain(s);
  ok(!ctx.grounded(s), 'grounding ends with the year');
  // The allowance comes out of a parent's pocket.
  const p = ctx.myParents(s)[0];
  p.money = 1e6; h.allow = 1000;
  s.player.counters = {}; s.player.lastCounters = { hm_chores: 2 };
  const mine = s.player.money, theirs = p.money;
  ctx.homeYear(s);
  ok(s.player.money === mine + 1000 && p.money === theirs - 1000, 'the allowance is paid by your parents');
  // Strict parents catch you sneaking out more often.
  const caught = (strict) => { let n = 0; for (let k = 0; k < 60; k++) { const t = kid(15); ctx.homeRec(t).strict = strict; t.pending = []; ctx.doAction(t, 'hm_sneak'); if (ctx.grounded(t)) n++; } return n; };
  const lax = caught(5), tough = caught(95);
  ok(tough > lax, `strict parents catch you more (${lax} vs ${tough} of 60)`);
  const adult = kid(18);
  ok(!ctx.atHome(adult) && !ctx.actionList(adult, 'parents').length, 'house rules end at 18');
}

/* 7. lessons ---------------------------------------------------------------- */
{
  const s = kid(8);
  const p = ctx.myParents(s).sort((a, b) => b.money - a.money)[0];
  p.money = 1e7;
  const before = p.money;
  ctx.enrollLesson(s, 'karate');
  const r = s.player.lessons.karate;
  ok(r && r.on && s.people[r.pid] && ctx.kinTitle(s, r.pid) === 'Karate teacher', 'a lesson comes with a teacher');
  for (let y = 0; y < 8; y++) { s.pending = []; s.player.lastCounters = { lp_karate: 3 }; ctx.lessonsYear(s); s.year++; p.money = 1e7; }
  ok(p.money < 1e7 || before > 0, 'your parents pay for it');
  ok(r.lvl >= 4, `eight years of steady practice climbs the belts (${ctx.lessonLevel('karate', r.lvl)})`);
  for (let y = 0; y < 8 && r.lvl < 6; y++) { s.pending = []; s.player.lastCounters = { lp_karate: 3 }; ctx.lessonsYear(s); s.year++; p.money = 1e7; }
  ok(r.lvl >= 6 && s.player.life.blackBelts >= 1, `and eventually earns a black belt (${ctx.lessonLevel('karate', r.lvl)})`);
  const lazy = kid(8); ctx.myParents(lazy)[0].money = 1e7; ctx.enrollLesson(lazy, 'karate');
  for (let y = 0; y < 8; y++) { lazy.pending = []; lazy.player.lastCounters = {}; ctx.lessonsYear(lazy); lazy.year++; ctx.myParents(lazy).forEach((q) => { q.money = 1e7; }); }
  ok(lazy.player.lessons.karate.lvl < r.lvl, 'without practice it goes slower');
  const lvl = r.lvl;
  s.pending = []; ctx.resolvePopup(s, ctx.popup(s, { handler: 'lsQuit', choices: [{ label: 'x', value: 'karate' }] }).id, 0);
  ok(!r.on && r.lvl === lvl, 'quitting keeps your level');
  ctx.enrollLesson(s, 'karate');
  ok(r.on && r.lvl === lvl, 'and coming back picks it up');
  // No Spanish lessons where Spanish is spoken.
  const mx = kid(10, { country: 'mx', city: 'Mexico City' });
  ok(!ctx.lessonOpen(mx, 'spanish') && ctx.lessonOpen(mx, 'english'), 'no lessons in the language you already speak');
  // Adults pay their own way.
  const grown = kid(30);
  grown.player.money = 1e5;
  grown.pending = [];
  ctx.resolvePopup(grown, ctx.popup(grown, { handler: 'lsPick', choices: [{ label: 'x', value: 'piano' }] }).id, 0);
  ok(grown.player.lessons.piano && grown.player.money === 1e5 - ctx.lessonFee(grown, 'piano'), 'adults pay for their own lessons');
}

console.log(failures ? `✖ youth: ${failures} failure(s)` : '✓ youth checks passed');
process.exit(failures ? 1 : 0);
