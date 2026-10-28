/* =====================================================================
 * 55-school-life.js — school as a place you live in: a homeroom teacher every
 * year and a principal, a report card by subject, popularity, a school record
 * (detention, suspension, expulsion), bullies, midterms, clubs and teams with
 * ranks and seasons, and getting into college (the entrance exam, applications,
 * scholarships, valedictorian). School-life events are at the bottom.
 *
 * On the current school (M(s).edu.current, kind 'school'):
 *   teacher, principal (person ids), subj: { math: offset, ... } (a subject's grade is
 *   the overall grade plus its offset), pop (popularity 0-100), card: { year, g } (last
 *   report card), club: { id: { r: rank 0-3, pts, yrs, last } }, det/detYear (detentions
 *   this year), susp (suspensions at this school), bully (a person id).
 *   College keeps clubs and club records too.
 * On M(s).edu (eduRec): conduct [{ kind, year, why, at }], resume [{ text, w, kind, year }],
 *   exam: { best, tries, prep }, apps: { year, list, essay, fraud }, offers: [colleges].
 * 14-school.js calls startSchoolLife (enrolling), schoolPull (the grade target),
 * schoolYearLife (each school year, before it advances), newTeacher (each new year) and
 * highSchoolFinale (graduation). College offers feed the university choice.
 * ===================================================================== */

function eduRec(s) { const e = M(s).edu; if (!e.conduct) e.conduct = []; if (!e.resume) e.resume = []; return e; }
function schoolCur(s) { const c = eduCur(s); return c && c.kind === 'school' ? c : null; }
function finalYears(cur) { return cur.year >= cur.years - 1; }
function personIf(s, pid, kind) { const p = pid && s.people[pid]; return p && p.alive && relKind(s, pid) === kind ? p : null; }

/* ---- starting a school, and each new year ------------------------------------------ */
function startSchoolLife(s, prev) {
  const cur = schoolCur(s);
  if (!cur) return;
  cur.subj = prev && prev.subj ? Object.assign({}, prev.subj) : {};
  for (const k of SUBJECT_IDS) if (cur.subj[k] == null) cur.subj[k] = 0;
  driftSubjects(s, cur, 1);
  cur.pop = prev && prev.pop != null ? clamp100(prev.pop * 0.5 + popTarget(s, cur) * 0.5) : clamp100(popTarget(s, cur) + gauss(0, 6));
  // Club records carry over to the next school, but you start lower on the ladder.
  cur.club = {};
  for (const id of cur.clubs || []) {
    const d = prev && prev.club && prev.club[id];
    cur.club[id] = { r: d ? Math.max(0, d.r - 2) : 0, pts: d ? Math.round(d.pts * 0.35) : 0, yrs: 0, last: '' };
  }
  cur.clubs = (cur.clubs || []).filter((id) => SCHOOL_CLUBS[id] && stageOk(cur, SCHOOL_CLUBS[id]));
  cur.det = 0; cur.susp = 0; cur.bully = null;
  clearKind(s, 'bully');
  newPrincipal(s, cur);
  newTeacher(s, cur);
}
function newTeacher(s, cur) {
  cur = cur || schoolCur(s);
  if (!cur) return null;
  clearKind(s, 'teacher');
  const t = makeAdultNear(s, { minAge: 24, maxAge: 63 });
  t.job = { id: 'teacher', level: randInt(1, 2) };
  t.teaches = pick(SUBJECT_IDS);
  setRel(s, t.id, 'teacher', randInt(40, 60));
  cur.teacher = t.id;
  return t;
}
function newPrincipal(s, cur) {
  clearKind(s, 'principal');
  const p = makeAdultNear(s, { minAge: 42, maxAge: 66 });
  p.job = { id: 'teacher', level: 4 };
  setRel(s, p.id, 'principal', randInt(35, 55));
  cur.principal = p.id;
}
function endSchoolLife(s) { clearKind(s, 'teacher'); clearKind(s, 'principal'); clearKind(s, 'bully'); }
function stageOk(cur, c) { const order = ['primary', 'middle', 'high']; return cur.kind !== 'school' || order.indexOf(cur.stage) >= order.indexOf(c.min || 'primary'); }

// What the teacher (and a bully) do to the grades you're heading for.
function schoolPull(s, cur) {
  const t = personIf(s, cur.teacher, 'teacher');
  return (t ? (relOf(s, t.id).rel - 50) / 10 : 0) - (personIf(s, cur.bully, 'bully') ? 3 : 0);
}

/* ---- subjects and the report card ------------------------------------------------------ */
function aptitude(s, k) {
  const a = SUBJECTS[k].apt;
  if (a === 'smarts') return P(s).stats.smarts;
  if (a === 'fitness') return 25 + (skill(s, 'fitness') + skill(s, 'athletics')) * 0.45 + (P(s).stats.health - 50) * 0.2;
  if (a === 'art') return 25 + Math.max(skill(s, 'art'), skill(s, 'music')) * 0.9;
  return 25 + skill(s, a) * 0.6 + P(s).stats.smarts * 0.3;
}
// Each subject drifts toward how good you are at it compared with the rest, and toward
// the teacher who likes (or doesn't like) you.
function driftSubjects(s, cur, k) {
  const apt = {}, avg = sum(SUBJECT_IDS, (x) => (apt[x] = aptitude(s, x))) / SUBJECT_IDS.length;
  const t = personIf(s, cur.teacher, 'teacher');
  for (const x of SUBJECT_IDS) {
    let target = (apt[x] - avg) * 0.45;
    if (t && t.teaches === x) target += (relOf(s, t.id).rel - 50) / 8;
    cur.subj[x] = clamp(Math.round(cur.subj[x] + (target - cur.subj[x]) * k + gauss(0, 2)), -25, 25);
  }
}
function subjectGrade(cur, k) { return clamp100(cur.grades + ((cur.subj || {})[k] || 0)); }
function letterGrade(g) { return g >= 93 ? 'A' : g >= 88 ? 'A-' : g >= 84 ? 'B+' : g >= 78 ? 'B' : g >= 73 ? 'B-' : g >= 68 ? 'C+' : g >= 61 ? 'C' : g >= 55 ? 'C-' : g >= 50 ? 'D+' : g >= 40 ? 'D' : 'F'; }
function reportCard(s, cur) {
  const g = {};
  for (const k of SUBJECT_IDS) g[k] = subjectGrade(cur, k);
  cur.card = { year: s.year, g };
  const fails = SUBJECT_IDS.filter((k) => g[k] < 40).length, as = SUBJECT_IDS.filter((k) => g[k] >= 88).length;
  log(s, `📋 Report card: ${SUBJECT_IDS.map((k) => `${SUBJECTS[k].name} ${letterGrade(g[k])}`).join(', ')}.`, fails ? 'bad' : as >= 4 ? 'good' : '');
  if (as === SUBJECT_IDS.length) tally(s, 'straightAs');
  parentsSeeCard(s, fails, as); // 56-growing-up.js
}

/* ---- popularity ---------------------------------------------------------------------- */
function popTarget(s, cur) {
  const p = P(s);
  let t = 32 + (p.stats.looks - 50) * 0.3 + skill(s, 'charisma') * 0.18 + Math.min(12, M(s).fame / 4);
  if (cur.clique && CLIQUES[cur.clique]) t += CLIQUES[cur.clique].pop || 0;
  for (const id of cur.clubs || []) { const c = SCHOOL_CLUBS[id], d = cur.club && cur.club[id]; if (c) t += (c.pop || 0) * (1 + (d ? d.r : 0)) * 0.6; }
  if (trait(s, 'funny')) t += 5;
  if (trait(s, 'charming')) t += 5;
  if (trait(s, 'loner')) t -= 8;
  if (trait(s, 'anxious')) t -= 3;
  if (personIf(s, cur.bully, 'bully')) t -= 8;
  return clamp(t, 3, 97);
}
function addPop(s, d) { const cur = schoolCur(s); if (cur && cur.pop != null) cur.pop = clamp100(cur.pop + d); }
function popWord(v) { return v >= 85 ? 'Everyone knows you' : v >= 65 ? 'Popular' : v >= 45 ? 'Well liked' : v >= 25 ? 'Under the radar' : 'Invisible'; }

/* ---- the school record ------------------------------------------------------------------ */
// Detention, suspension or expulsion. Three detentions in a year is a suspension; a second
// suspension at the same school can be an expulsion.
function schoolTrouble(s, kind, why) {
  const cur = schoolCur(s);
  if (!cur) return;
  const e = eduRec(s);
  e.conduct.push({ kind, year: s.year, why, at: cur.name });
  if (e.conduct.length > 30) e.conduct.shift();
  if (kind === 'detention') {
    tally(s, 'detentions');
    cur.det = (cur.detYear === s.year ? cur.det || 0 : 0) + 1;
    cur.detYear = s.year;
    log(s, `📝 Detention for ${why}.`, 'bad');
    if (cur.det % 3 === 0) schoolTrouble(s, 'suspension', 'three detentions in one year');
    return;
  }
  const pr = personIf(s, cur.principal, 'principal');
  if (kind === 'suspension') {
    cur.susp = (cur.susp || 0) + 1;
    tally(s, 'suspensions');
    cur.grades = clamp100(cur.grades - randInt(3, 6));
    relAll(s, ['parent', 'stepparent'], -8);
    if (pr) addRel(s, pr.id, -10);
    if (cur.susp >= 3 || (cur.susp >= 2 && chance(0.4))) { schoolTrouble(s, 'expulsion', why); return; }
    announce(s, { emoji: '🚫', title: 'Suspended', tone: 'bad', text: `${pr ? `Principal ${pr.last}` : 'The principal'} suspended you for ${nOf(randInt(2, 5), 'day')} for ${why}. Your parents had to come and get you.` });
    groundFor(s, 'getting suspended'); // 56-growing-up.js
    return;
  }
  // Expelled: a new school, the same grade, and a reputation that got there first.
  tally(s, 'expulsions');
  relAll(s, ['parent', 'stepparent'], -15);
  const old = cur.name, year = cur.year;
  enrollSchool(s, cur.stage);
  const now = schoolCur(s);
  now.year = year;
  now.pop = Math.min(now.pop, 15);
  announce(s, { emoji: '🚪', title: 'Expelled', tone: 'bad', text: `${old} expelled you for ${why}. You start at ${now.name} on Monday, and everyone there has already heard about you.` });
  groundFor(s, 'getting expelled');
}
function conductCount(s, kind) { return eduRec(s).conduct.filter((c) => c.kind === kind).length; }

/* ---- bullies ------------------------------------------------------------------------------- */
const BULLY_ACTS = ['keeps tripping you in the hallway', 'took your lunch money, again', 'started a group chat just to make fun of you', 'shoved you into a locker in front of everyone', 'tells everyone a nasty nickname for you', 'drew something awful on your backpack'];
function bullyYear(s, cur, budget) {
  let b = personIf(s, cur.bully, 'bully');
  if (!b) {
    cur.bully = null;
    const odds = clamp(0.035 + (40 - cur.pop) / 250 + (['brains', 'gamers', 'band'].includes(cur.clique) ? 0.03 : 0) - skill(s, 'martial') / 400, 0.01, 0.2);
    if (A(s) < 7 || !chance(odds)) return;
    const me = P(s);
    b = makePerson(s, { age: A(s) + randInt(0, 2), country: me.country, city: me.city, gender: chance(0.6) ? 'm' : 'f' });
    setRel(s, b.id, 'bully', randInt(5, 18));
    cur.bully = b.id;
    tally(s, 'bullied');
    log(s, `😠 ${b.first} ${b.last} has decided to make your life miserable.`, 'bad');
  }
  add(s, { happy: -randInt(2, 6) });
  cur.grades = clamp100(cur.grades - 2);
  if (budget.n-- > 0) bullyPopup(s, b);
}
function bullyPopup(s, b) {
  const friends = relPeople(s, K_FRIENDS).filter((p) => ageOf(s, p) < 20).length;
  popup(s, {
    emoji: '😠', title: 'Bullied', tone: 'bad', handler: 'slBully', ctx: { pid: b.id }, person: b.id,
    text: `${b.first} ${pick(BULLY_ACTS)}.`,
    choices: [
      { label: 'Tell a teacher', value: 'tell' }, { label: 'Stand up to them', value: 'stand' }, { label: 'Fight back', value: 'fight', tone: 'bad' },
      { label: 'Get your friends to back you up', value: 'friends', disabled: friends < 2 }, { label: 'Try to make peace', value: 'peace' }, { label: 'Keep your head down', value: 'ignore' },
    ],
  });
}
// The bully stops: they become an enemy, a classmate or, rarely, a friend.
function endBully(s, cur, kind, rel) { if (cur.bully && s.people[cur.bully]) setRel(s, cur.bully, kind, rel); cur.bully = null; }
onChoice('slBully', (s, ctx, v) => {
  const cur = schoolCur(s), b = personIf(s, ctx.pid, 'bully');
  if (!cur || !b) return;
  const t = personIf(s, cur.teacher, 'teacher');
  if (v === 'tell') {
    addPop(s, -3);
    if (chance(0.45 + (t ? relOf(s, t.id).rel / 250 : 0))) { endBully(s, cur, 'enemy', 10); return `The teacher caught ${b.first} in the act. Detention, a call home, and they leave you alone now. Some kids call you a snitch.`; }
    return { text: `The teacher "had a word" with ${b.first}. It got worse.`, tone: 'bad' };
  }
  if (v === 'stand') {
    addSkill(s, 'charisma', 1);
    if (chance(0.3 + skill(s, 'charisma') / 150 + cur.pop / 300)) { endBully(s, cur, 'classmate', 30); addPop(s, 6); tally(s, 'stoodUp'); return { text: `You looked ${b.first} in the eye and told them to knock it off, in front of everyone. They did.`, tone: 'good' }; }
    addPop(s, -4);
    return { text: `${b.first} laughed in your face. So did their friends.`, tone: 'bad' };
  }
  if (v === 'fight') {
    tally(s, 'fights');
    const win = chance(clamp(0.35 + skill(s, 'martial') / 120 + skill(s, 'fitness') / 300 + (trait(s, 'hotheaded') ? 0.08 : 0), 0.1, 0.9));
    if (chance(0.5)) schoolTrouble(s, 'suspension', 'fighting');
    if (win) { endBully(s, cur, 'enemy', 5); addPop(s, 8); tally(s, 'stoodUp'); tally(s, 'fightWins'); return { text: `You put ${b.first} on the ground in front of half the school. Nobody has tripped you since.`, tone: 'good' }; }
    add(s, { health: -randInt(4, 10) });
    addPop(s, -5);
    return { text: `${b.first} won, easily. You went home with a black eye.`, tone: 'bad' };
  }
  if (v === 'friends') {
    if (chance(0.6)) { endBully(s, cur, 'enemy', 15); relAll(s, K_FRIENDS, 4); addPop(s, 3); tally(s, 'stoodUp'); return { text: `Your friends walked you to every class for a week. ${b.first} found someone else to bother, and then nobody.`, tone: 'good' }; }
    return 'Your friends tried. Bullies are patient.';
  }
  if (v === 'peace') {
    if (chance(0.22 + M(s).karma / 400)) { endBully(s, cur, 'friend', 45); add(s, { karma: 3 }); return { text: `You asked ${b.first} why. It all came out: things are bad at home. You're sort of friends now.`, tone: 'good' }; }
    return `${b.first} called you a loser and walked off.`;
  }
  add(s, { happy: -3 });
  return 'You kept your head down and counted the days until summer.';
});
defAction({
  id: 'sl_bully', cat: 'person', target: 'person', label: 'Deal with the bully', emoji: '😠',
  when: (s, pid) => reachable(s, pid) && relKind(s, pid) === 'bully' && !!schoolCur(s) && count(s, 'sl_bully') < 2,
  run: (s, pid) => { bump(s, 'sl_bully'); bullyPopup(s, s.people[pid]); },
});

/* ---- the year at school ---------------------------------------------------------------- */
function schoolYearLife(s, cur) {
  const budget = { n: 2 };
  driftSubjects(s, cur, 0.35);
  cur.pop = clamp100(cur.pop + (popTarget(s, cur) - cur.pop) * 0.35 + gauss(0, 4));
  reportCard(s, cur);
  for (const id of (cur.clubs || []).slice()) clubSeason(s, cur, id, budget);
  bullyYear(s, cur, budget);
  if (M(s).edu.current !== cur) return;
  if (cur.stage !== 'primary' && budget.n > 0 && chance(0.4)) {
    budget.n--;
    popup(s, {
      emoji: '📚', title: 'Midterms', handler: 'slMidterms', text: 'Midterms are next week, and the whole year leans on them.',
      choices: [{ label: 'Cram every night', value: 'cram' }, { label: 'Start a study group', value: 'group' }, { label: 'Get the answers from someone', value: 'cheat', tone: 'bad' }, { label: 'Wing it', value: 'wing' }],
    });
  }
}
onChoice('slMidterms', (s, ctx, v) => {
  const cur = schoolCur(s);
  if (!cur) return;
  if (v === 'cram') { cur.grades = clamp100(cur.grades + randInt(3, 8)); add(s, { happy: -3, health: -1, smarts: 1 }); return 'Flashcards at breakfast, flashcards at dinner. It worked.'; }
  if (v === 'group') {
    cur.grades = clamp100(cur.grades + randInt(2, 6));
    relAll(s, ['classmate'], 3);
    if (chance(0.3)) { const f = pick(relPeople(s, ['classmate'])); if (f) { setRel(s, f.id, 'friend', 55); return { text: `Your study group aced it, and you and ${f.first} are friends now.`, person: f.id }; } }
    return 'Your study group aced it, mostly by quizzing each other in silly voices.';
  }
  if (v === 'cheat') {
    add(s, { karma: -4 });
    if (chance(0.7 - (trait(s, 'cunning') ? -0.1 : 0))) { cur.grades = clamp100(cur.grades + randInt(6, 12)); return 'Nobody noticed. You got a better grade than you deserved.'; }
    cur.grades = clamp100(cur.grades - 12);
    schoolTrouble(s, 'detention', 'cheating on a test');
    return { text: 'The teacher had seen that answer key before. Zero, and detention.', tone: 'bad' };
  }
  if (chance(P(s).stats.smarts / 120)) return 'You winged it, and somehow it went fine.';
  cur.grades = clamp100(cur.grades - randInt(3, 7));
  return { text: 'You winged it. It showed.', tone: 'bad' };
});

/* ---- teachers and the principal -------------------------------------------------------- */
const asStudentWith = (kind) => (s, pid) => reachable(s, pid) && relKind(s, pid) === kind && !!schoolCur(s);
defAction({
  id: 'sl_credit', cat: 'person', target: 'person', label: 'Ask for extra credit', emoji: '✏️',
  when: (s, pid) => asStudentWith('teacher')(s, pid) && count(s, 'sl_credit') < 1,
  run: (s, pid) => {
    bump(s, 'sl_credit');
    const t = s.people[pid], cur = schoolCur(s);
    if (chance(0.35 + relOf(s, pid).rel / 200)) { cur.grades = clamp100(cur.grades + randInt(3, 6)); cur.subj[t.teaches] = clamp((cur.subj[t.teaches] || 0) + 3, -25, 25); return `${t.first} gave you an extra-credit project on ${SUBJECTS[t.teaches].name.toLowerCase()}. You did it, and it counted.`; }
    return `${t.first} said extra credit is for students who do the regular credit first.`;
  },
});
defAction({
  id: 'sl_suckup', cat: 'person', target: 'person', label: 'Suck up', emoji: '🍎',
  when: (s, pid) => asStudentWith('teacher')(s, pid) && count(s, 'sl_suckup') < 2,
  run: (s, pid) => {
    bump(s, 'sl_suckup');
    relGain(s, pid, randInt(4, 9));
    addPop(s, -1);
    if (relOf(s, pid).rel >= 90) tally(s, 'teachersPet');
    return vary(`You {brought ${nm(s, pid)} an apple|laughed at every one of ${nm(s, pid)}'s jokes|volunteered to clean the whiteboard}. Somebody in the back row whispered "teacher's pet."`);
  },
});
defAction({
  id: 'sl_grade', cat: 'person', target: 'person', label: 'Argue about a grade', emoji: '📝',
  when: (s, pid) => asStudentWith('teacher')(s, pid) && count(s, 'sl_grade') < 1,
  run: (s, pid) => {
    bump(s, 'sl_grade');
    const cur = schoolCur(s);
    if (chance(0.25 + skill(s, 'charisma') / 200 + (relOf(s, pid).rel - 50) / 200)) { cur.grades = clamp100(cur.grades + randInt(2, 4)); addSkill(s, 'charisma', 1); return `You made your case. ${nm(s, pid)} sighed and changed the grade.`; }
    addRel(s, pid, -6);
    if (chance(0.3)) { schoolTrouble(s, 'detention', 'arguing with a teacher'); return { text: `${nm(s, pid)} did not appreciate your tone.`, tone: 'bad' }; }
    return `${nm(s, pid)} said the grade stands.`;
  },
});
const PITCHES = ['a longer lunch', 'a school garden', 'a later start time', 'a gaming club', 'pizza Fridays', 'a student art wall', 'recycling bins in every room', 'a pet fish for the office'];
defAction({
  id: 'sl_pitch', cat: 'person', target: 'person', label: 'Pitch an idea', emoji: '💡',
  when: (s, pid) => asStudentWith('principal')(s, pid) && A(s) >= 8 && count(s, 'sl_pitch') < 1,
  run: (s, pid) => {
    bump(s, 'sl_pitch');
    const idea = pick(PITCHES), cur = schoolCur(s), council = cur.club && cur.club.council;
    if (chance(0.2 + skill(s, 'charisma') / 200 + cur.pop / 400 + (council ? 0.15 : 0))) {
      addPop(s, 5);
      relGain(s, pid, 5);
      addResume(s, `Persuaded the school to try ${idea}`, 1, 'leadership');
      return { text: `${nm(s, pid)} loved it. The school is trying ${idea}, and everyone knows whose idea it was.`, tone: 'good' };
    }
    return `${nm(s, pid)} said they'd "take it under advisement." That means no.`;
  },
});
// Mischief aimed at teachers lands you in detention; picking on other kids makes you the bully.
for (const [id, odds] of [['p_prank', 0.5], ['p_insult', 0.6], ['p_yell', 0.75], ['p_argue', 0.15]]) {
  const a = ACTIONS[id], run = a.run;
  a.run = (s, pid) => {
    const kind = relKind(s, pid), out = run(s, pid);
    if (!schoolCur(s) || s.dead) return out;
    if ((kind === 'teacher' || kind === 'principal') && chance(odds)) {
      if (id === 'p_prank') addPop(s, 3);
      schoolTrouble(s, 'detention', id === 'p_prank' ? 'pranking a teacher' : id === 'p_argue' ? 'talking back' : 'mouthing off to a teacher');
    } else if (kind === 'classmate' && id !== 'p_argue') meanStreak(s);
    return out;
  };
}
for (const id of ['p_rumor', 'p_tp']) { const a = ACTIONS[id]; if (!a) continue; const run = a.run; a.run = (s, pid) => { const kind = relKind(s, pid), out = run(s, pid); if (schoolCur(s) && kind === 'classmate') meanStreak(s); return out; }; }
{
  const a = ACTIONS.p_assault, run = a.run;
  a.run = (s, pid) => {
    const kind = relKind(s, pid), out = run(s, pid);
    if (schoolCur(s) && !s.dead && !inPrison(s)) {
      if (kind === 'teacher' || kind === 'principal') schoolTrouble(s, 'expulsion', 'hitting a teacher');
      else if (kind === 'classmate' || kind === 'bully') schoolTrouble(s, 'suspension', 'fighting');
    }
    return out;
  };
}
function meanStreak(s) {
  const n = bump(s, 'mean');
  if (n === 4) popup(s, {
    emoji: '😈', title: 'The school bully', handler: 'slMean', text: 'Kids have started calling you the school bully. One of them cried in the bathroom.',
    choices: [{ label: 'Own it', value: 'own', tone: 'bad' }, { label: 'Apologize to the kid you pick on most', value: 'sorry' }, { label: 'Tone it down', value: 'calm' }],
  });
}
onChoice('slMean', (s, ctx, v) => {
  if (v === 'own') { add(s, { karma: -6 }); addPop(s, 4); tally(s, 'wasBully'); if (chance(0.4)) schoolTrouble(s, 'detention', 'bullying'); return 'Kids get out of your way in the hallway now. Not all of them like you.'; }
  if (v === 'sorry') { add(s, { karma: 5 }); addPop(s, -1); return 'You apologized. It was the hardest thing you did all year.'; }
  return 'You eased off. Mostly.';
});

/* ---- clubs and teams ------------------------------------------------------------------- */
function clubRec(cur, id) { const m = cur.club || (cur.club = {}); return m[id] || (m[id] = { r: 0, pts: 0, yrs: 0, last: '' }); }
function clubSkill(s, c) { return c.skill ? skill(s, c.skill) : c.stat === 'smarts' ? P(s).stats.smarts * 0.8 : c.stat === 'karma' ? M(s).karma * 0.7 : P(s).stats.happy * 0.5; }
function clubRank(cur, id) { const d = cur.club && cur.club[id]; return SCHOOL_CLUBS[id].ranks[d ? d.r : 0]; }
// Tryouts for teams that pick their players.
function makesTeam(s, c) { return !c.tryout || chance(clamp(0.3 + clubSkill(s, c) / 70 + P(s).stats.health / 400, 0.15, 0.97)); }
function clubSeason(s, cur, id, budget) {
  const c = SCHOOL_CLUBS[id];
  if (!c) return;
  const d = clubRec(cur, id), cs = clubSkill(s, c), prac = lastCount(s, 'cp_' + id);
  d.yrs++;
  d.pts = Math.round(d.pts + 6 + prac * 5 + cs / 10 + gauss(0, 3));
  // Rising: the top rank only in your last two years, and the council's by election.
  const want = d.pts >= 70 ? 3 : d.pts >= 40 ? 2 : d.pts >= 15 ? 1 : 0;
  if (want > d.r) {
    let to = Math.min(want, 2);
    if (want === 3 && cur.kind === 'school' && finalYears(cur)) {
      if (id === 'council' && budget.n > 0) { budget.n--; electionPopup(s, cur); }
      else if (id !== 'council' && chance(0.45 + cur.pop / 250 + cs / 400)) to = 3;
    }
    if (to > d.r) promoteClub(s, cur, id, to);
  }
  // The season.
  const perf = 15 + cs * 0.7 + d.r * 10 + prac * 4 + gauss(0, 12);
  const tier = perf >= 72 ? 0 : perf >= 55 ? 1 : perf >= 38 ? 2 : 3;
  let text;
  if (c.team) {
    const w = clamp(Math.round(12 * (0.2 + perf / 140) + gauss(0, 1.5)), 0, 12);
    text = `went ${w}-${12 - w}${tier === 0 && w >= 7 ? ` and won ${c.comp}` : tier <= 1 && w >= 6 ? ` and lost ${c.comp}` : tier === 2 ? ' and missed the playoffs' : ''}`;
  } else if (id === 'drama') text = `put on ${c.comp}, with you as ${['a tree in the back', 'a supporting character', 'the lead', 'the lead, plus directing'][d.r]}. ${['Standing ovation.', 'The reviews were kind.', 'The parents clapped.', 'The set fell over in act two.'][tier]}`;
  else if (id === 'band' || id === 'choir') text = `earned a${tier === 0 ? ' Superior' : tier === 1 ? 'n Excellent' : tier === 2 ? ' Good' : ' Fair'} rating at ${c.comp}`;
  else if (id === 'council') text = pick(['ran the spring fundraiser', 'organized the school dance', 'got new lockers approved', 'argued about the vending machine for a whole year']);
  else text = [`won ${c.comp}`, `placed ${ordinal(randInt(2, 3))} at ${c.comp}`, `took part in ${c.comp}`, `came home from ${c.comp} empty-handed`][tier];
  d.last = text;
  log(s, `${c.emoji} ${c.name}: ${cap(text)}${text.endsWith('.') ? '' : '.'}`, tier === 0 ? 'good' : '');
  if (tier === 0 && (c.team || !['drama', 'band', 'choir', 'council'].includes(id))) {
    tally(s, 'clubTitles');
    addPop(s, 3);
    add(s, { happy: 5 });
    if (cur.kind === 'school') addResume(s, `Won ${c.comp} (${c.name})`, d.r >= 2 ? 3 : 2, c.kind);
  }
  if (c.stat === 'karma') add(s, { karma: randInt(1, 3) });
  if (budget.n > 0 && d.r >= 1 && chance(0.35)) {
    budget.n--;
    popup(s, { emoji: c.emoji, title: c.name, handler: 'slMoment', ctx: { id }, text: c.moment[0], choices: [{ label: c.moment[1], value: 'bold' }, { label: c.moment[2], value: 'team' }, { label: c.moment[3], value: 'safe' }] });
  }
}
function promoteClub(s, cur, id, to) {
  const c = SCHOOL_CLUBS[id], d = clubRec(cur, id);
  d.r = to;
  addPop(s, Math.max(0, c.pop || 0) + to);
  log(s, `${c.emoji} You're ${aAn(c.ranks[to].toLowerCase())} on the ${c.name} now.`.replace(/^(\S+) You're an? (captain|president|editor|club president|choir captain|team captain|section leader|secretary-general|student body president|editor-in-chief)/i, '$1 You\'re $2'), 'good');
  if (to >= 2 && cur.kind === 'school') addResume(s, `${c.ranks[to]}, ${c.name}`, to === 3 ? 3 : 1.5, c.kind);
  if (to === 3) tally(s, 'captain');
}
onChoice('slMoment', (s, ctx, v) => {
  const cur = eduCur(s), c = SCHOOL_CLUBS[ctx.id];
  if (!cur || !c || !(cur.clubs || []).includes(ctx.id)) return;
  const d = clubRec(cur, ctx.id);
  if (v === 'bold') {
    if (chance(clamp(0.3 + clubSkill(s, c) / 200 + d.r * 0.05, 0.15, 0.85))) {
      d.pts += 8; addPop(s, 6); add(s, { happy: 8 }); tally(s, 'clutch');
      if (cur.kind === 'school') addResume(s, `Came up big when it mattered (${c.name})`, 1.5, c.kind);
      return { text: pick(['It worked. People were still talking about it at graduation.', 'Everyone was on their feet. You will remember this one forever.', 'Your name was on the morning announcements the next day.']), tone: 'good' };
    }
    addPop(s, -3); add(s, { happy: -4 });
    return { text: pick(['It didn’t work. It really, really didn’t work.', 'A gamble, and a loss. Someone filmed it.', 'Close. Not close enough.']), tone: 'bad' };
  }
  if (v === 'team') {
    d.pts += 4; add(s, { karma: 2 }); relAll(s, ['classmate', ...K_FRIENDS], 2);
    return chance(0.6) ? { text: 'You made someone else the hero, and it worked. They haven’t stopped thanking you.', tone: 'good' } : 'You did the generous thing. It didn’t quite come off, but the team noticed.';
  }
  d.pts += 2;
  return pick(['You played it safe. Nobody will remember it, and that’s fine.', 'Steady and sensible. The coach nodded.']);
});
function electionPopup(s, cur) {
  popup(s, { emoji: '🗳️', title: 'Student body elections', handler: 'slElection', text: 'You’re running for student body president.', choices: [{ label: 'Run a serious campaign', value: 'serious' }, { label: 'Run a joke campaign', value: 'joke' }, { label: 'Promise free pizza', value: 'pizza' }, { label: 'Drop out of the race', value: 'out' }] });
}
onChoice('slElection', (s, ctx, v) => {
  const cur = schoolCur(s);
  if (!cur || v === 'out' || !(cur.clubs || []).includes('council')) return 'You dropped out and endorsed your friend.';
  const bonus = v === 'serious' ? skill(s, 'charisma') / 150 : v === 'joke' ? (trait(s, 'funny') ? 0.2 : 0.05) + cur.pop / 300 : 0.12 - M(s).karma / 1000;
  if (chance(clamp(0.25 + cur.pop / 250 + bonus, 0.1, 0.9))) { promoteClub(s, cur, 'council', 3); add(s, { happy: 8 }); return { text: v === 'joke' ? 'You ran as a joke and won in a landslide. Now you have to actually do it.' : 'You won! Your first act was a longer lunch. It was not approved.', tone: 'good' }; }
  return { text: 'You lost by eleven votes. You will never forget those eleven people.', tone: 'bad' };
});
defAction({
  id: 'sl_practice', cat: 'school', label: 'Go to practice', emoji: '🏋️', desc: 'Get better at your clubs and teams.',
  when: (s) => inSchool(s) && free(s) && (eduCur(s).clubs || []).length > 0,
  run: (s) => {
    const clubs = eduCur(s).clubs;
    if (clubs.length === 1) return practiceClub(s, clubs[0]);
    popup(s, { emoji: '🏋️', title: 'Practice', handler: 'slPractice', choices: clubs.map((id) => ({ label: `${SCHOOL_CLUBS[id].emoji} ${SCHOOL_CLUBS[id].name}`, value: id, sub: clubRank(eduCur(s), id), disabled: count(s, 'cp_' + id) >= 3 })).concat([{ label: 'Never mind', value: null }]) });
  },
});
onChoice('slPractice', (s, ctx, id) => (id ? practiceClub(s, id) : undefined));
function practiceClub(s, id) {
  const c = SCHOOL_CLUBS[id], cur = eduCur(s);
  if (!c || !cur || !(cur.clubs || []).includes(id)) return;
  if (count(s, 'cp_' + id) >= 3) return { text: `You've practiced with the ${c.name} all you can this year.`, nolog: true };
  bump(s, 'cp_' + id);
  if (c.skill) addSkill(s, c.skill, randFloat(1, 3));
  if (c.also) addSkill(s, c.also, randFloat(0.5, 1.5));
  if (c.kind === 'sport' && chance(0.03)) { getSick(s, pick(['sprained_ankle', 'broken_arm'].filter((x) => DISEASES[x])) || 'broken_arm'); return { text: `You got hurt at ${c.name.toLowerCase()} practice.`, tone: 'bad' }; }
  add(s, { happy: 1 });
  return `${c.emoji} ${vary(c.team || c.kind === 'sport' ? 'You {ran drills until your legs gave out|stayed late working on your weak spots|scrimmaged with the starters}.' : 'You {stayed after school with the club|worked through old competition problems|rehearsed until it felt easy}.')}`;
}

/* ---- getting into college --------------------------------------------------------------- */
function addResume(s, text, w, kind) {
  const e = eduRec(s);
  if (e.resume.some((r) => r.text === text)) return;
  e.resume.push({ text, w, kind, year: s.year });
  if (e.resume.length > 30) e.resume.shift();
}
function resumeScore(s) { return sum(eduRec(s).resume, (r) => r.w); }
function examRec(s) { const e = eduRec(s); return e.exam || (e.exam = { best: 0, tries: 0, prep: 0 }); }
// The college entrance exam, as a percentile: smarts and grades, sharpened by prep.
function takeExam(s, bonus) {
  const ex = examRec(s), cur = schoolCur(s);
  ex.tries++;
  const score = clamp(Math.round(50 + (P(s).stats.smarts - 50) * 0.9 + ((cur ? cur.grades : 60) - 60) * 0.35 + ex.prep * 4 + (bonus || 0) + gauss(0, 6) - (trait(s, 'anxious') ? 5 : 0)), 1, 99);
  const better = score > ex.best;
  ex.best = Math.max(ex.best, score);
  tally(s, 'examsTaken');
  return { text: `You scored in the ${ordinal(score)} percentile${ex.tries > 1 ? (better ? ', your best yet' : `. Your best is still the ${ordinal(ex.best)}`) : ''}.`, tone: score >= 80 ? 'good' : score < 35 ? 'bad' : '', emoji: '📝', title: 'Entrance exam' };
}
const examTime = (s) => { const cur = schoolCur(s); return !!cur && cur.stage === 'high' && A(s) >= 15 && free(s); };
defAction({
  id: 'cp_exam', cat: 'school', label: 'Take the college entrance exam', emoji: '📝',
  when: (s) => examTime(s) && examRec(s).tries < 3 && count(s, 'cp_exam') < 1,
  sub: (s) => (examRec(s).best ? `Best so far: ${ordinal(examRec(s).best)} percentile` : 'Colleges look at your score'),
  run: (s) => { bump(s, 'cp_exam'); return takeExam(s, 0); },
});
defAction({
  id: 'cp_prep', cat: 'school', label: 'Take an exam prep course', emoji: '📘',
  when: (s) => examTime(s) && examRec(s).prep < 2 && count(s, 'cp_prep') < 1,
  sub: (s) => fmtMoney(price(s, 1200)),
  run: (s) => {
    const cost = price(s, 1200);
    if (!familyPays(s, cost)) return { text: 'Nobody in your house can spare that right now.', nolog: true };
    bump(s, 'cp_prep');
    examRec(s).prep++;
    add(s, { smarts: 1, happy: -2 });
    return 'Saturday mornings in a classroom with a man who loves vocabulary words. Your practice scores went up.';
  },
});
// Your parents pay while you live at home (if they can); otherwise you do.
function familyPays(s, cost) {
  if (A(s) < 18 && M(s).housing.type === 'parents') {
    const ps = relPeople(s, ['parent', 'stepparent']).sort((a, b) => b.money - a.money);
    if (ps.length && ps[0].money >= cost) { ps[0].money -= cost; return true; }
  }
  return pay(s, cost);
}
function collegeName2(s, tier) {
  const T = COLLEGE_TIERS[tier], cities = country(s).cities;
  return pick(T.names).replace('{root}', pick(SCHOOL_ROOTS)).replace('{city}', tier === 'state' && chance(0.5) ? P(s).city : pick(cities));
}
function collegeCatalog(s) {
  const out = [], seen = new Set();
  for (const tier of ['elite', 'elite', 'selective', 'selective', 'state', 'state', 'open']) {
    let name = collegeName2(s, tier);
    for (let i = 0; seen.has(name) && i < 10; i++) name = collegeName2(s, tier);
    seen.add(name);
    out.push({ name, tier, cost: COLLEGE_TIERS[tier].cost });
  }
  return out;
}
function appStrength(s, essay) {
  const e = eduRec(s), cur = schoolCur(s);
  const gpa = cur ? cur.grades : 60, exam = e.exam && e.exam.best ? e.exam.best : 30, res = Math.min(100, resumeScore(s) * 8);
  const penalty = conductCount(s, 'suspension') * 6 + conductCount(s, 'expulsion') * 18 + (hasFelony(s) ? 20 : 0);
  return clamp(gpa * 0.45 + exam * 0.25 + res * 0.18 + (essay ?? 50) * 0.12 - penalty, 0, 100);
}
function chanceWord(s, tier) { const d = appStrength(s, 60) - COLLEGE_TIERS[tier].bar; return d >= 6 ? 'Likely' : d >= -4 ? 'A real shot' : d >= -12 ? 'A reach' : 'A long shot'; }
defAction({
  id: 'cp_apply', cat: 'school', label: 'Apply to colleges', emoji: '📬', desc: 'Pick up to four. Decisions come at graduation.',
  when: (s) => { const cur = schoolCur(s); return !!cur && cur.stage === 'high' && cur.year >= cur.years && A(s) >= 16 && free(s) && !eduRec(s).apps; },
  run: (s) => { applyPopup(s, collegeCatalog(s), []); },
});
function applyPopup(s, cat, picks) {
  popup(s, {
    emoji: '📬', title: 'College applications', handler: 'cpPick', ctx: { cat, picks },
    text: `${picks.length ? `Applying to: ${picks.map((i) => cat[i].name).join(', ')}. ` : ''}${picks.length < 4 ? 'Pick a college to apply to.' : 'That’s four. Time to write your essay.'}`,
    choices: (picks.length < 4 ? cat.map((c, i) => ({ c, i })).filter((x) => !picks.includes(x.i)).map(({ c, i }) => ({ label: c.name, value: i, sub: `${COLLEGE_TIERS[c.tier].name} · ${fmtMoney(tuition(s, c.cost))}/yr · ${chanceWord(s, c.tier)}` })) : [])
      .concat(picks.length ? [{ label: '✍️ Write the essay and send them', value: 'send' }] : [], [{ label: 'Not yet', value: null }]),
  });
}
onChoice('cpPick', (s, ctx, v) => {
  if (v === null || v === undefined) return;
  if (v !== 'send') { applyPopup(s, ctx.cat, ctx.picks.concat([v])); return; }
  popup(s, {
    emoji: '✍️', title: 'The essay', handler: 'cpEssay', ctx, text: 'Six hundred words that are supposed to be all of you.',
    choices: [{ label: 'Write about something that changed you', value: 'change' }, { label: 'Write about what you love doing', value: 'passion' }, { label: 'Pay someone to write it', value: 'pay', tone: 'bad' }, { label: 'Rush it the night before', value: 'rush' }],
  });
});
onChoice('cpEssay', (s, ctx, v) => {
  if (eduRec(s).apps || !schoolCur(s)) return;
  const w = skill(s, 'writing');
  let essay = v === 'change' ? 40 + w * 0.5 + gauss(0, 12) : v === 'passion' ? 35 + w * 0.3 + Math.min(30, resumeScore(s) * 3) + gauss(0, 10) : v === 'pay' ? 80 + gauss(0, 6) : 25 + w * 0.3 + gauss(0, 15);
  essay = clamp(Math.round(essay), 0, 100);
  const fraud = v === 'pay' && chance(0.2);
  if (v === 'pay') add(s, { karma: -5 });
  eduRec(s).apps = { year: s.year, list: ctx.picks.map((i) => ctx.cat[i]), essay, fraud };
  addSkill(s, 'writing', 1);
  tally(s, 'collegeApps', ctx.picks.length);
  return { text: `You sent ${nOf(ctx.picks.length, 'application')}. Decisions come in the spring, right before graduation.`, emoji: '📬' };
});
// Graduation day: valedictorian, then the envelopes.
function highSchoolFinale(s, cur) {
  const e = eduRec(s);
  if (cur.grades >= 93 && chance(clamp((cur.grades - 88) / 10, 0.2, 0.9))) {
    tally(s, 'valedictorian');
    addResume(s, 'Valedictorian', 3, 'academic');
    popup(s, { emoji: '🎤', title: 'Valedictorian', handler: 'slSpeech', text: `You're the valedictorian of ${cur.name}. The speech is yours.`, choices: [{ label: 'Thank your parents and teachers', value: 'thanks' }, { label: 'Give a speech that brings the house down', value: 'big' }, { label: 'Roast the school', value: 'roast', tone: 'bad' }] });
  } else if (cur.grades >= 89 && chance(0.4)) { addResume(s, 'Salutatorian', 2, 'academic'); log(s, `🥈 You graduated as salutatorian of ${cur.name}.`, 'good'); }
  const a = e.apps;
  if (!a) return;
  e.apps = null;
  if (a.fraud) { e.offers = []; log(s, '📭 A college flagged your essay as bought. Every school you applied to rejected you.', 'bad'); return; }
  const str = appStrength(s, a.essay);
  e.offers = a.list.filter((c) => str + gauss(0, 6) >= COLLEGE_TIERS[c.tier].bar).map((c) => Object.assign({}, c, scholarshipFor(s, c, str)));
  if (e.offers.some((c) => c.tier === 'elite')) tally(s, 'eliteAdmit');
  if (e.offers.some((c) => c.sch >= 1)) tally(s, 'fullRide');
  log(s, e.offers.length ? `📬 You got into ${e.offers.map((c) => c.name).join(', ')}.` : '📭 Every college you applied to turned you down.', e.offers.length ? 'good' : 'bad');
}
onChoice('slSpeech', (s, ctx, v) => {
  if (v === 'thanks') { relAll(s, ['parent', 'stepparent', 'teacher'], 6); return 'Your mother cried. So did your chemistry teacher.'; }
  if (v === 'big') { if (chance(0.4 + skill(s, 'charisma') / 150)) { add(s, { happy: 10, fame: 1 }); return { text: 'A standing ovation. Someone posted it and it got thousands of views.', tone: 'good' }; } return 'You aimed for inspiring and landed on long. People clapped when it ended.'; }
  if (chance(trait(s, 'funny') ? 0.75 : 0.45)) { add(s, { happy: 6 }); return 'The class lost it. The principal laughed despite himself.'; }
  return { text: 'Nobody laughed. The principal unplugged your microphone.', tone: 'bad' };
});
// The best scholarship a college offers you: academic, athletic, arts or need-based.
function scholarshipFor(s, c, str) {
  const bar = COLLEGE_TIERS[c.tier].bar, opts = [];
  if (str >= bar + 6) opts.push(['academic', clamp(Math.floor((str - bar) / 6) * 0.25, 0.25, 1)]);
  const cur = schoolCur(s), best = (kind) => (cur ? (cur.clubs || []).filter((id) => SCHOOL_CLUBS[id] && SCHOOL_CLUBS[id].kind === kind).map((id) => clubRec(cur, id).r) : []).concat(eduRec(s).resume.filter((r) => r.kind === kind && r.w >= 3).map(() => 2));
  if (c.tier !== 'elite' && Math.max(0, ...best('sport')) >= 2 && Math.max(skill(s, 'athletics'), skill(s, 'fitness')) >= 50) opts.push(['athletic', Math.max(...best('sport')) >= 3 ? 1 : 0.5]);
  if (Math.max(0, ...best('arts')) >= 2 && Math.max(skill(s, 'music'), skill(s, 'acting'), skill(s, 'art')) >= 50) opts.push(['arts', Math.max(...best('arts')) >= 3 ? 0.75 : 0.5]);
  const family = sum(relPeople(s, ['parent', 'stepparent']), (p) => p.money);
  if (c.tier !== 'elite' && family < price(s, 40000)) opts.push(['need-based', 0.5]);
  if (!opts.length) return { sch: 0, schType: '' };
  const top = opts.sort((a, b) => b[1] - a[1])[0];
  return { sch: top[1], schType: top[0] };
}
function offersPopup(s) {
  const offers = eduRec(s).offers || [];
  popup(s, {
    emoji: '🎓', title: 'Your acceptances', handler: 'cpChoose', text: 'Where will you go?',
    choices: offers.map((o, i) => ({ label: o.name, value: i, sub: `${COLLEGE_TIERS[o.tier].name} · ${fmtMoney(tuition(s, o.cost))}/yr${o.sch ? ` · ${o.sch >= 1 ? 'full' : Math.round(o.sch * 100) + '%'} ${o.schType} scholarship` : ''}` })).concat([{ label: 'Back', value: null }]),
  });
}
onChoice('cpChoose', (s, ctx, i) => {
  const o = i != null && (eduRec(s).offers || [])[i];
  if (!o) { popup(s, { emoji: '🎓', title: 'What’s next?', handler: 'afterHigh', choices: afterHighChoices(s) }); return; }
  openMajorPicker(s, 'university', o);
});

/* ---- school-life events ------------------------------------------------------------------ */
const inSchoolYears = (s) => !!schoolCur(s) && free(s);
const hasClubKind = (kinds) => (s) => { const cur = schoolCur(s); return !!cur && free(s) && (cur.clubs || []).some((id) => SCHOOL_CLUBS[id] && kinds.includes(SCHOOL_CLUBS[id].kind)); };
const myTeacher = (s) => { const cur = schoolCur(s), t = cur && personIf(s, cur.teacher, 'teacher'); return t ? { pid: t.id } : null; };
EV('sl_substitute', {
  ages: [6, 17], emoji: '🍎', when: inSchoolYears, text: 'You have a substitute teacher today, and they look terrified.',
  choices: [
    ['Behave', (s) => { add(s, { karma: 1 }); return 'You were the only one who behaved. The sub left a note thanking you by name.'; }],
    ['Swap names with your friend all day', (s) => { addPop(s, 2); if (chance(0.25)) { schoolTrouble(s, 'detention', 'swapping names with a substitute'); return 'It was hilarious until your real teacher read the note.'; } return 'Nobody figured it out. Legendary.'; }],
    ['Convince the class it’s a free period', (s) => { addPop(s, 3); if (chance(0.3)) { schoolTrouble(s, 'detention', 'staging a free period'); return 'The principal walked in during the dance party.'; } return 'Forty-five minutes of chaos. Nobody learned anything.'; }],
  ],
});
EV('sl_lunch_table', {
  ages: [11, 15], once: true, emoji: '🍱', when: (s) => { const cur = schoolCur(s); return !!cur && cur.year === 1 && cur.stage !== 'primary' && free(s); }, text: (s) => `First week at ${schoolCur(s).name}. You walk into the cafeteria with your tray. Where do you sit?`,
  choices: [
    ['At the popular table', (s) => { if (chance(schoolCur(s).pop / 100 + P(s).stats.looks / 300)) { addPop(s, 6); return 'You sat down like you belonged there. Apparently you do.'; } addPop(s, -4); return 'Someone said "that seat is taken." All of them were taken.'; }],
    ['Next to the kid sitting alone', (s) => { add(s, { karma: 3 }); const me = P(s), k = makePerson(s, { age: A(s), country: me.country, city: me.city }); setRel(s, k.id, 'friend', 60); return { text: `${k.first} had been eating alone for a month. Not anymore.`, person: k.id }; }],
    ['In the library', (s) => { add(s, { smarts: 1 }); addPop(s, -1); return 'Quiet, cool, and you finished a whole book by Friday.'; }],
  ],
});
EV('sl_homecoming', {
  ages: [14, 17], emoji: '💃', when: (s) => { const cur = schoolCur(s); return !!cur && cur.stage === 'high' && free(s); }, text: 'The homecoming dance is Saturday.',
  choices: [
    ['Go with a group of friends', (s) => { relAll(s, K_FRIENDS, 4); addPop(s, 2); add(s, { happy: 5 }); return 'You danced badly and loudly all night. Perfect.'; }],
    ['Ask your crush', (s) => { if (chance(0.35 + schoolCur(s).pop / 250 + P(s).stats.looks / 400)) { add(s, { happy: 8 }); addPop(s, 3); return 'They said yes! You slow-danced to a song you will now love forever.'; } add(s, { happy: -5 }); return 'They said they were "going with friends." They were not.'; }],
    ['Skip it', (s) => { add(s, { happy: -1 }); return 'You stayed home and heard all about it on Monday.'; }],
  ],
});
const SUPERLATIVES = [
  ['Most Likely to Succeed', (s, cur) => cur.grades >= 85], ['Most Popular', (s, cur) => cur.pop >= 75], ['Class Clown', (s) => trait(s, 'funny')],
  ['Most Athletic', (s) => skill(s, 'athletics') >= 50], ['Best Smile', (s) => P(s).stats.looks >= 75], ['Most Likely to Be Famous', (s) => M(s).fame >= 20 || skill(s, 'acting') >= 50 || skill(s, 'music') >= 50],
  ['Most Likely to Run the Country', (s, cur) => cur.club && cur.club.council && cur.club.council.r >= 2], ['Most Artistic', (s) => skill(s, 'art') >= 45], ['Biggest Heart', (s) => M(s).karma >= 75],
];
EV('sl_superlatives', {
  ages: [16, 18], once: true, emoji: '📸', when: (s) => { const cur = schoolCur(s); return !!cur && cur.stage === 'high' && cur.year >= cur.years; }, text: 'The yearbook superlatives came out.',
  auto: (s) => { const cur = schoolCur(s), won = SUPERLATIVES.filter(([, f]) => f(s, cur)); add(s, { happy: 4 }); return won.length ? `Your class voted you "${pick(won)[0]}."` : 'Your class voted you "Most Likely to Be Remembered by the Lunch Staff." You will take it.'; },
});
EV('sl_senior_prank', {
  ages: [16, 18], once: true, emoji: '🐐', when: (s) => { const cur = schoolCur(s); return !!cur && cur.stage === 'high' && cur.year >= cur.years && free(s); }, text: 'The senior class is planning the senior prank.',
  choices: [
    ['Mastermind it', (s) => { addPop(s, 8); add(s, { happy: 6 }); if (chance(0.3)) { schoolTrouble(s, 'suspension', 'the senior prank'); return 'Three goats in the gym. You got caught. Worth it, probably.'; } return 'Three goats in the gym, and nobody ever found out who. The school still tells the story.'; }],
    ['Help out', (s) => { addPop(s, 4); if (chance(0.1)) schoolTrouble(s, 'detention', 'the senior prank'); return 'You were on goat transport. A crucial role.'; }],
    ['Stay out of it', () => 'You watched from a safe distance. The goats were very good.'],
  ],
});
EV('sl_teacher_award', {
  ages: [7, 17], emoji: '🏅', ctx: myTeacher, when: (s) => { const t = myTeacher(s); return !!t && relOf(s, t.pid).rel >= 70; },
  text: (s, c) => `${nm(s, c.pid)} nominated you for the ${SUBJECTS[s.people[c.pid].teaches].name} award.`,
  auto: (s, c) => { add(s, { happy: 5 }); addResume(s, `${SUBJECTS[s.people[c.pid].teaches].name} award`, 1, 'academic'); return 'You won. Your parents framed the certificate.'; },
});
EV('sl_teacher_feud', {
  ages: [8, 17], emoji: '😒', ctx: myTeacher, when: (s) => { const t = myTeacher(s); return !!t && relOf(s, t.pid).rel <= 30; },
  text: (s, c) => `${nm(s, c.pid)} has it out for you. Every answer you give is wrong, even the right ones.`,
  choices: [
    ['Complain to the principal', (s, c) => { if (chance(0.4)) { addRel(s, c.pid, 15); return 'The principal had a word with them. They’ve been suspiciously polite since.'; } addRel(s, c.pid, -5); return 'The principal took the teacher’s side. Of course.'; }],
    ['Win them over', (s, c) => { if (chance(0.35 + skill(s, 'charisma') / 200)) { addRel(s, c.pid, 25); return 'You stayed after class and asked about their weekend. Turns out they’re human.'; } return 'You tried. They stayed frosty.'; }],
    ['Endure it', (s) => { add(s, { happy: -3 }); return 'You counted down the days until summer.'; }],
  ],
});
EV('sl_principal', {
  ages: [6, 17], emoji: '🏛️', when: inSchoolYears, text: 'You were called to the principal’s office over the loudspeaker.',
  auto: (s) => { if (chance(0.5)) { add(s, { happy: 3 }); addPop(s, 1); return 'It was a mix-up. They wanted the other kid with your name. Everyone thought you were in huge trouble, which was kind of great.'; } add(s, { happy: 4 }); return 'You’d been picked to show new students around. Fancy.'; },
});
EV('cl_bus', {
  ages: [9, 17], emoji: '🚌', when: hasClubKind(['sport', 'arts', 'academic']), text: 'The bus broke down on the way to an away competition.',
  choices: [
    ['Lead a sing-along', (s) => { addPop(s, 3); relAll(s, ['classmate', ...K_FRIENDS], 2); return 'Two hours on the side of the highway, and nobody will forget that sing-along.'; }],
    ['Sleep through it', () => 'You woke up at the venue with a stiff neck.'],
    ['Start a card tournament', (s) => { addSkill(s, 'cards', 1); return 'You won everyone’s snacks.'; }],
  ],
});
EV('cl_coach', {
  ages: [13, 17], emoji: '📋', when: (s) => { const cur = schoolCur(s); return !!cur && cur.stage === 'high' && (cur.clubs || []).some((id) => SCHOOL_CLUBS[id].kind === 'sport' && clubRec(cur, id).r >= 1); },
  text: 'Your coach pulled you aside: "You could play in college if you keep this up."',
  auto: (s) => { add(s, { happy: 5 }); addSkill(s, 'athletics', 1); return 'You started an extra workout the next morning.'; },
});
EV('cl_rivals', {
  era: 'web',
  ages: [10, 17], emoji: '🏫', when: (s) => { const cur = schoolCur(s); return !!cur && (cur.clubs || []).length > 0 && free(s); }, text: (s) => `A rival school’s ${SCHOOL_CLUBS[pick(schoolCur(s).clubs)].name.toLowerCase()} is trash-talking yours online.`,
  choices: [
    ['Clap back', (s) => (chance(0.5 + skill(s, 'writing') / 200) ? (addPop(s, 4), 'Your reply got more likes than their post. Victory.') : (addPop(s, -2), 'They had a better comeback. Ouch.'))],
    ['Prank their mascot', (s) => { addPop(s, 6); if (chance(0.3)) { schoolTrouble(s, 'detention', 'kidnapping a rival mascot'); return 'You got the mascot head. You also got caught.'; } return 'Their mascot head is now in your trophy case.'; }],
    ['Let the results talk', (s) => { add(s, { karma: 1 }); return 'You said nothing. The results will.'; }],
  ],
});

/* ---- data hooks, achievements and goals -------------------------------------------------- */
Object.assign(KIN_LABELS, { teacher: ['Teacher', 'Teacher', 'Teacher'], principal: ['Principal', 'Principal', 'Principal'], bully: ['Bully', 'Bully', 'Bully'] });
REL_GROUPS.find((g) => g.id === 'school').kinds.push('teacher', 'principal', 'bully');
Object.assign(REL_DECAY, { teacher: 4, principal: 2, bully: 0 });
ACHIEVEMENTS.push(
  { id: 'teachers_pet', name: 'Teacher’s Pet', emoji: '🍎', desc: 'Get a teacher to adore you.', check: (s) => LC(s, 'teachersPet') >= 1 },
  { id: 'straight_as', name: 'Straight As', emoji: '📋', desc: 'Get an A in every subject on a report card.', check: (s) => LC(s, 'straightAs') >= 1 },
  { id: 'captain', name: 'Captain', emoji: '🎖️', desc: 'Rise to captain or president of a school club or team.', check: (s) => LC(s, 'captain') >= 1 },
  { id: 'champions', name: 'Champions', emoji: '🏆', desc: 'Win a title with a school club or team.', check: (s) => LC(s, 'clubTitles') >= 1 },
  { id: 'valedictorian', name: 'Valedictorian', emoji: '🎤', desc: 'Graduate at the top of your class.', check: (s) => LC(s, 'valedictorian') >= 1 },
  { id: 'elite_admit', name: 'Thick Envelope', emoji: '📬', desc: 'Get into an elite university.', check: (s) => LC(s, 'eliteAdmit') >= 1 },
  { id: 'full_ride', name: 'Full Ride', emoji: '🎓', desc: 'Win a full scholarship.', check: (s) => LC(s, 'fullRide') >= 1 },
  { id: 'stood_up', name: 'Stood Up', emoji: '✊', desc: 'Make a bully back off.', check: (s) => LC(s, 'stoodUp') >= 1 },
  { id: 'suspended', name: 'Permanent Record', emoji: '🚫', desc: 'Get suspended from school.', check: (s) => LC(s, 'suspensions') >= 1 },
);
GOALS.push(
  { id: 'g_captain', text: 'Captain a school team or club', emoji: '🎖️', check: (s) => LC(s, 'captain') >= 1 },
  { id: 'g_elite', text: 'Get into an elite university', emoji: '📬', check: (s) => LC(s, 'eliteAdmit') >= 1 },
);
