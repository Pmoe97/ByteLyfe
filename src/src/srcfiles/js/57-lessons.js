/* =====================================================================
 * 57-lessons.js — classes and lessons outside school: instruments, martial
 * arts, combat sports, dance, sports, arts and crafts, languages, chess,
 * stage skills and life skills (LESSON_TYPES in 03-data-edu.js), for any age.
 *
 * M(s).lessons = { id: { lvl, xp, yrs, since, on, pid (your teacher), medals, best } }
 *   lvl indexes the family's levels (belts, grades, ratings); xp fills toward the next
 *   test (lessonNeed). Up to three at once. lessonsYear (from youthTick) charges the
 *   year's fee (your parents pay while you live at home, if they can), adds the year's
 *   xp from practice (counted as 'lp_<id>'), runs level tests, and a showcase or
 *   competition if you didn't enter one yourself ('ls_show_<id>').
 * Teachers are people (kind 'instructor', p.lesson = the lesson id).
 * ===================================================================== */

const MAX_LESSONS = 3;
function lessonsOf(s) { return M(s).lessons || (M(s).lessons = {}); }
function activeLessons(s) { const L = lessonsOf(s); return Object.keys(L).filter((id) => L[id].on && LESSON_TYPES[id]); }
function lessonFam(id) { return LESSON_FAMS[LESSON_TYPES[id].fam]; }
function lessonLevel(id, lvl) { const lv = lessonFam(id).levels; return lv[Math.min(lvl, lv.length - 1)]; }
function lessonTop(id) { return lessonFam(id).levels.length - 1; }
function lessonNeed(lvl) { return 25 + lvl * 12; }
// A lesson's name inside a sentence: "piano", but "Spanish" and "Brazilian jiu-jitsu".
function lessonNoun(id) { const L = LESSON_TYPES[id]; return L.fam === 'lang' || /^(Brazilian|Muay)/.test(L.name) ? L.name : L.name.toLowerCase(); }
function lessonFee(s, id) { return price(s, LESSON_TYPES[id].cost); }
function lessonSkill(s, id) { const L = LESSON_TYPES[id]; return L.skill ? skill(s, L.skill) : P(s).stats.smarts * 0.8; }
function lessonOpen(s, id) { const L = LESSON_TYPES[id]; return A(s) >= L.minAge && !(L.lang && L.lang.includes(P(s).country)); }
// Your parents pay while you live with them, through the year you turn 18.
function parentsPayLessons(s) { return A(s) <= 18 && M(s).housing.type === 'parents' && !inPrison(s) && myParents(s).length > 0; }
function ownsInstrument(s, id) { const L = LESSON_TYPES[id]; return !!L.inst && M(s).assets.some((a) => a.kind === 'instrument' && L.inst.includes(a.type)); }
// What the teacher is called: a sensei for the belt arts, a coach for sports, else a teacher.
function teacherWord(id) { const f = LESSON_TYPES[id].fam; return f === 'belt' || f === 'bjj' ? 'sensei' : ['ring', 'sport', 'swim'].includes(f) ? 'coach' : 'teacher'; }
const LESSON_KIND = { music: 'arts', belt: 'sport', bjj: 'sport', ring: 'sport', dance: 'arts', ballet: 'arts', sport: 'sport', swim: 'sport', art: 'arts', lang: 'academic', chess: 'academic', study: 'academic', stage: 'arts', life: 'service' };

/* ---- starting, practicing, quitting ------------------------------------------------------ */
defAction({
  id: 'ls_start', cat: 'learn', label: 'Start a class or lesson', emoji: '🎓', desc: 'Instruments, martial arts, dance, sports, languages and more.',
  when: (s) => free(s) && A(s) >= 4 && activeLessons(s).length < MAX_LESSONS,
  sub: (s) => (parentsPayLessons(s) ? 'Your parents pay, if they agree' : `${MAX_LESSONS - activeLessons(s).length} more you can take`),
  run: (s) => {
    const fams = Object.keys(LESSON_FAMS).filter((f) => LESSON_IDS.some((id) => LESSON_TYPES[id].fam === f && lessonOpen(s, id) && !(lessonsOf(s)[id] && lessonsOf(s)[id].on)));
    const groups = [];
    for (const f of fams) { const n = LESSON_FAMS[f].name; if (!groups.includes(n)) groups.push(n); }
    popup(s, { emoji: '🎓', title: 'Classes & lessons', text: 'What do you want to learn?', handler: 'lsGroup', choices: groups.map((g) => ({ label: `${Object.values(LESSON_FAMS).find((x) => x.name === g).emoji} ${g}`, value: g })).concat([{ label: 'Never mind', value: null }]) });
  },
});
onChoice('lsGroup', (s, ctx, g) => {
  if (!g) return;
  const ids = LESSON_IDS.filter((id) => lessonFam(id).name === g && lessonOpen(s, id) && !(lessonsOf(s)[id] && lessonsOf(s)[id].on));
  const kid = parentsPayLessons(s);
  popup(s, {
    emoji: '🎓', title: g, handler: 'lsPick', text: kid ? 'Your parents will have to agree to pay.' : 'Lessons are billed by the year.',
    choices: ids.map((id) => { const L = LESSON_TYPES[id], had = lessonsOf(s)[id]; return { label: `${L.emoji} ${L.name}`, value: id, sub: `${fmtMoney(lessonFee(s, id))}/yr${had ? ` · back to ${lessonLevel(id, had.lvl)}` : ''}${ownsInstrument(s, id) ? ' · you have the instrument' : ''}`, disabled: !kid && M(s).money < lessonFee(s, id) }; }).concat([{ label: 'Never mind', value: null }]),
  });
});
onChoice('lsPick', (s, ctx, id) => {
  if (!id || !LESSON_TYPES[id]) return;
  if (activeLessons(s).length >= MAX_LESSONS) return { text: `You can only fit ${MAX_LESSONS} classes into a year.`, nolog: true };
  const fee = lessonFee(s, id), L = LESSON_TYPES[id];
  if (parentsPayLessons(s)) {
    if (!parentsSayYes(s, fee, 0.45 + (['music', 'lang', 'chess', 'study'].includes(L.fam) && homeRec(s).strict >= 60 ? 0.2 : 0))) return { text: `Your parents said ${lessonNoun(id)} lessons are ${pick(['too expensive right now', 'a phase', 'something to ask about again next year'])}.`, tone: 'bad' };
  } else if (!pay(s, fee)) return cantAfford(fee);
  else finRow(s, 'exp', 'Lessons', fee);
  return enrollLesson(s, id);
});
// Join (or rejoin) a lesson with a teacher of your own. The first year is paid already.
function enrollLesson(s, id) {
  const L = LESSON_TYPES[id], all = lessonsOf(s), back = all[id];
  const rec = back || (all[id] = { lvl: 0, xp: 0, yrs: 0, since: s.year, on: true, pid: null, medals: 0, best: '' });
  rec.on = true;
  if (!rec.pid || !s.people[rec.pid] || relKind(s, rec.pid) !== 'instructor') {
    const t = makeAdultNear(s, { minAge: 22, maxAge: 68 });
    t.lesson = id;
    setRel(s, t.id, 'instructor', randInt(45, 60));
    rec.pid = t.id;
  }
  tally(s, 'lessonsStarted');
  add(s, { happy: 2 });
  const t = s.people[rec.pid];
  return { text: `${L.emoji} You started ${lessonNoun(id)}${back ? ` again, picking up at ${lessonLevel(id, rec.lvl)}` : ''}. Your ${teacherWord(id)} is ${t.first} ${t.last}.`, tone: 'good', person: t.id };
}
const PRACTICE = {
  music: ['You practiced scales until your neighbors knew them by heart.', 'You finally nailed the tricky passage.', 'You practiced for an hour and lost track of time.'],
  belt: ['You drilled your forms until they felt like breathing.', 'You sparred with the older students and held your own.', 'You practiced your kicks on the backyard tree. The tree lost.'],
  bjj: ['You rolled with the blue belts and tapped out twice. Progress.', 'You drilled the same escape fifty times.', 'You finally hit that sweep in live rolling.'],
  ring: ['You hit the heavy bag until your arms went numb.', 'You sparred three rounds and learned a lot about your chin.', 'You skipped rope until you could do it in your sleep.'],
  dance: ['You ran the routine until your feet ached.', 'You learned a new combination and nailed it.', 'You danced in the studio mirror until closing.'],
  ballet: ['You held your positions until your legs shook.', 'You practiced your turns at the barre.', 'Your teacher said your form is finally improving.'],
  sport: ['You trained hard and went home exhausted.', 'You worked on your technique with your coach.', 'You put in extra hours on the weekend.'],
  swim: ['You swam laps until the lifeguard went home.', 'You shaved a second off your best time.', 'You worked on your turns at the wall.'],
  art: ['You filled a whole sketchbook.', 'You made something you are actually proud of.', 'You worked late in the studio.'],
  lang: ['You watched a whole movie without subtitles. Mostly.', 'You practiced with your conversation partner.', 'You did flashcards on the bus every day.'],
  chess: ['You studied openings for hours.', 'You played twenty online games and won most of them.', 'You worked through a book of puzzles.'],
  study: ['You practiced until it started to click.', 'You built something small and it worked.', 'You put in a solid week of practice.'],
  stage: ['You rehearsed your piece in the mirror.', 'You did an open mic and survived.', 'You worked on your material.'],
  life: ['You practiced until it felt easy.', 'You got noticeably better.', 'You put in the hours.'],
};
defAction({
  id: 'ls_practice', cat: 'learn', label: 'Practice', emoji: '🎶', desc: 'Practice counts toward your next level.',
  when: (s) => free(s) && activeLessons(s).length > 0,
  run: (s) => {
    const act = activeLessons(s);
    if (act.length === 1) return practiceLesson(s, act[0]);
    popup(s, { emoji: '🎶', title: 'Practice', handler: 'lsPractice', choices: act.map((id) => ({ label: `${LESSON_TYPES[id].emoji} ${LESSON_TYPES[id].name}`, value: id, sub: lessonLevel(id, lessonsOf(s)[id].lvl), disabled: count(s, 'lp_' + id) >= 3 })).concat([{ label: 'Never mind', value: null }]) });
  },
});
onChoice('lsPractice', (s, ctx, id) => (id ? practiceLesson(s, id) : undefined));
function practiceLesson(s, id) {
  const L = LESSON_TYPES[id], rec = lessonsOf(s)[id];
  if (!L || !rec || !rec.on) return;
  if (count(s, 'lp_' + id) >= 3) return { text: `You've practiced ${lessonNoun(id)} as much as you can this year.`, nolog: true };
  bump(s, 'lp_' + id);
  rec.xp += randInt(3, 6) + (ownsInstrument(s, id) ? 2 : 0);
  if (L.skill) addSkill(s, L.skill, randFloat(1, 2.5));
  if (L.also) addSkill(s, L.also, randFloat(0.3, 1));
  if (L.stat === 'smarts' && chance(0.3)) add(s, { smarts: 1 });
  if (rec.pid && s.people[rec.pid] && relKind(s, rec.pid) === 'instructor') addRel(s, rec.pid, 2);
  return `${L.emoji} ${pick(PRACTICE[L.fam])}`;
}
defAction({
  id: 'ls_show', cat: 'learn', label: 'Perform or compete', emoji: '🏆',
  sub: () => 'Recitals, tournaments, meets and exhibitions',
  when: (s) => free(s) && activeLessons(s).some((id) => lessonFam(id).show && lessonsOf(s)[id].lvl >= 1 && !count(s, 'ls_show_' + id)),
  run: (s) => {
    const ids = activeLessons(s).filter((id) => lessonFam(id).show && lessonsOf(s)[id].lvl >= 1 && !count(s, 'ls_show_' + id));
    popup(s, { emoji: '🏆', title: 'Perform or compete', handler: 'lsShowPick', choices: ids.map((id) => ({ label: `${LESSON_TYPES[id].emoji} ${LESSON_TYPES[id].name} ${lessonFam(id).show}`, value: id, sub: lessonLevel(id, lessonsOf(s)[id].lvl) })).concat([{ label: 'Never mind', value: null }]) });
  },
});
onChoice('lsShowPick', (s, ctx, id) => {
  if (!id || !LESSON_TYPES[id]) return;
  const f = lessonFam(id);
  popup(s, { emoji: LESSON_TYPES[id].emoji, title: `The ${f.show}`, handler: 'lsShow', ctx: { id }, text: `Your ${lessonNoun(id)} ${f.show} is today. ${pick(['Your stomach is doing flips.', 'Your whole family is in the audience.', 'The competition looks tough.'])}`, choices: [{ label: 'Go for the hardest thing you know', value: 'bold' }, { label: 'Do what you do best', value: 'safe' }, { label: 'Just have fun with it', value: 'fun' }] });
});
onChoice('lsShow', (s, ctx, v) => {
  const rec = lessonsOf(s)[ctx.id];
  if (!rec || !rec.on || count(s, 'ls_show_' + ctx.id)) return;
  bump(s, 'ls_show_' + ctx.id);
  return lessonShow(s, ctx.id, v === 'bold' ? gauss(4, 14) : v === 'fun' ? -3 : 2, v === 'fun');
});
// A recital, tournament, meet or exhibition. Medals at the top; national titles near the top levels.
function lessonShow(s, id, edge, fun) {
  const L = LESSON_TYPES[id], f = lessonFam(id), rec = lessonsOf(s)[id];
  const perf = lessonSkill(s, id) * 0.5 + rec.lvl * 8 + lastCount(s, 'lp_' + id) * 3 + count(s, 'lp_' + id) * 3 + edge + gauss(0, 12);
  const place = perf >= 64 ? 1 : perf >= 55 ? 2 : perf >= 47 ? 3 : 0;
  const high = rec.lvl >= lessonTop(id) - 1, where = high ? 'national' : rec.lvl >= 2 ? 'regional' : 'local';
  if (fun) add(s, { happy: 4 });
  if (!place) { add(s, { happy: fun ? 0 : -2 }); return { text: f.show === 'recital' || f.show === 'showcase' || f.show === 'exhibition' ? `${L.emoji} Your ${f.show} ${pick(['had a wobbly moment in the middle', 'went fine, and nobody remembers it', 'was mostly your parents clapping'])}.` : `${L.emoji} You didn't place at the ${where} ${f.show}. ${pick(['Next time.', 'You learned a lot.', 'The winner was really good.'])}`, emoji: L.emoji };
  }
  rec.medals++;
  tally(s, 'lessonMedals');
  add(s, { happy: place === 1 ? 8 : 4 });
  const prize = f.show === 'recital' || f.show === 'showcase' ? ['a standing ovation', 'warm applause and an encore', 'polite applause'][place - 1] : f.show === 'exhibition' ? ['first prize', 'second prize', 'an honorable mention'][place - 1] : f.show === 'exam' ? ['top marks', 'a distinction', 'a merit'][place - 1] : ['gold', 'silver', 'bronze'][place - 1];
  const text = `${L.emoji} ${f.show === 'recital' || f.show === 'showcase' ? `Your ${where} ${f.show} earned ${prize}.` : `${cap(prize)} at the ${where} ${lessonNoun(id)} ${f.show}!`}`;
  if (place === 1) {
    rec.best = `${cap(where)} ${f.show} winner`;
    if (high) { tally(s, 'nationalChamp'); M(s).fame = clamp100(M(s).fame + 3); addResume(s, `National ${lessonNoun(id)} ${f.show} winner`, 3, LESSON_KIND[L.fam]); }
    else if (rec.lvl >= 2) addResume(s, `Regional ${lessonNoun(id)} ${f.show} winner`, 1.5, LESSON_KIND[L.fam]);
  }
  return { text, tone: 'good', emoji: L.emoji };
}
defAction({
  id: 'ls_quit', cat: 'learn', label: 'Quit a class', emoji: '🚪',
  when: (s) => free(s) && activeLessons(s).length > 0,
  run: (s) => { popup(s, { emoji: '🚪', title: 'Quit a class', handler: 'lsQuit', choices: activeLessons(s).map((id) => ({ label: `${LESSON_TYPES[id].emoji} ${LESSON_TYPES[id].name}`, value: id, sub: lessonLevel(id, lessonsOf(s)[id].lvl) })).concat([{ label: 'Never mind', value: null }]) }); },
});
onChoice('lsQuit', (s, ctx, id) => {
  const rec = id && lessonsOf(s)[id];
  if (!rec) return;
  rec.on = false;
  if (atHome(s) && homeRec(s).strict >= 70) relAll(s, ['parent', 'stepparent'], -4);
  return `You quit ${lessonNoun(id)} at ${lessonLevel(id, rec.lvl).toLowerCase()}. You can always pick it back up.`;
});

/* ---- the year ---------------------------------------------------------------------------- */
function lessonsYear(s) {
  for (const id of activeLessons(s)) {
    const L = LESSON_TYPES[id], f = lessonFam(id), rec = lessonsOf(s)[id];
    // The bill for the year ahead.
    const fee = lessonFee(s, id);
    if (inPrison(s)) { rec.on = false; continue; }
    if (parentsPayLessons(s)) {
      const p = myParents(s).sort((a, b) => b.money - a.money)[0];
      if (!p || p.money < fee) { rec.on = false; log(s, `${L.emoji} Your parents couldn't keep paying for ${lessonNoun(id)}.`, 'bad'); continue; }
      p.money -= fee;
    } else {
      if (M(s).money < fee) { rec.on = false; log(s, `${L.emoji} You couldn't afford ${lessonNoun(id)} lessons anymore.`, 'bad'); continue; }
      M(s).money -= fee;
      finRow(s, 'exp', 'Lessons', fee);
    }
    rec.yrs++;
    const prac = lastCount(s, 'lp_' + id), t = rec.pid && s.people[rec.pid] && relKind(s, rec.pid) === 'instructor' ? s.people[rec.pid] : null;
    const talent = (['music', 'art', 'stage', 'dance', 'ballet'].includes(L.fam) && trait(s, 'creative') ? 4 : 0) + (['belt', 'bjj', 'ring', 'sport', 'swim', 'dance', 'ballet'].includes(L.fam) && trait(s, 'athletic') ? 4 : 0) + (['lang', 'chess', 'study'].includes(L.fam) && trait(s, 'bookworm') ? 4 : 0);
    rec.xp += Math.round(10 + prac * 9 + lessonSkill(s, id) / 12 + talent + (ownsInstrument(s, id) ? 6 : 0) + (t ? (relOf(s, t.id).rel - 50) / 10 : 0) - (trait(s, 'lazy') ? 4 : 0));
    if (L.skill) addSkill(s, L.skill, randFloat(1.5, 3) + prac * 0.5);
    if (L.also) addSkill(s, L.also, randFloat(0.5, 1.5));
    if (L.stat === 'smarts') add(s, { smarts: randInt(0, 2) });
    // The test for the next level.
    if (rec.lvl < lessonTop(id) && rec.xp >= lessonNeed(rec.lvl)) {
      if (chance(clamp(0.55 + lessonSkill(s, id) / 250 + prac * 0.07, 0.3, 0.95))) {
        rec.xp -= lessonNeed(rec.lvl);
        rec.lvl++;
        const name = lessonLevel(id, rec.lvl), top = rec.lvl === lessonTop(id);
        lessonMilestone(s, id, rec.lvl);
        const line = `${L.emoji} ${f.levels[0].includes('belt') ? `You earned your ${name.toLowerCase()} in ${lessonNoun(id)}!` : L.fam === 'lang' ? `You passed the ${name} exam in ${lessonNoun(id)}!` : `${cap(lessonNoun(id))}: you reached ${name}!`}`;
        if (top || /black belt|Diploma|Grandmaster|national/i.test(name)) announce(s, { emoji: L.emoji, title: name, text: line.replace(/^\S+ /, ''), tone: 'good' });
        else log(s, line, 'good');
      } else { rec.xp = Math.round(rec.xp * 0.6); log(s, `${L.emoji} You didn't pass your ${lessonNoun(id)} test for ${lessonLevel(id, rec.lvl + 1).toLowerCase()}. Next year.`, 'bad'); }
    }
    if (f.show && rec.lvl >= 1 && !lastCount(s, 'ls_show_' + id) && chance(A(s) < 25 ? 0.35 : 0.12)) { const r = lessonShow(s, id, 0, false); log(s, r.text, r.tone || ''); }
  }
}
// Achievements and the résumé colleges read.
function lessonMilestone(s, id, lvl) {
  const L = LESSON_TYPES[id], name = lessonLevel(id, lvl);
  if (/^Black belt$/.test(name)) { tally(s, 'blackBelts'); addResume(s, `Black belt in ${lessonNoun(id)}`, 2.5, 'sport'); }
  if (L.fam === 'music' && lvl >= 5) { tally(s, 'virtuoso'); addResume(s, `${name} in ${lessonNoun(id)}`, 2.5, 'arts'); }
  if (L.fam === 'lang' && lvl >= 4) tally(s, 'fluent');
  if (L.fam === 'chess' && lvl === lessonTop(id)) tally(s, 'grandmaster');
  if (lvl === lessonTop(id) && !['belt', 'music'].includes(L.fam)) addResume(s, `${name}, ${lessonNoun(id)}`, 2.5, LESSON_KIND[L.fam]);
  if (lvl >= 2 && A(s) <= 10) tally(s, 'prodigy');
}

/* ---- events -------------------------------------------------------------------------------- */
const takingLesson = (fams) => (s) => { const ids = activeLessons(s).filter((id) => !fams || fams.includes(LESSON_TYPES[id].fam)); return ids.length ? { id: pick(ids) } : null; };
EV('ls_tiger', {
  ages: [5, 12], once: true, emoji: '🎻', when: (s) => atHome(s) && homeRec(s).strict >= 70 && activeLessons(s).length < 2, text: (s) => `Your parents signed you up for ${pick(['piano', 'violin'])} lessons. Every Saturday, no arguments.`,
  choices: [
    ['Give it a real try', (s) => { const id = chance(0.5) ? 'piano' : 'violin'; if (lessonsOf(s)[id] && lessonsOf(s)[id].on) return 'You were already taking lessons. Your parents signed you up for extra ones.'; return enrollLesson(s, id); }],
    ['Refuse to go', (s) => { relAll(s, ['parent', 'stepparent'], -6); if (chance(0.6)) { const r = enrollLesson(s, 'piano'); r.text = 'You refused. They signed you up anyway. ' + r.text; return r; } return 'You held out for a whole month. They gave up. You won, this time.'; }],
  ],
});
EV('ls_stage_fright', {
  ages: [5, 40], emoji: '😰', ctx: takingLesson(['music', 'dance', 'ballet', 'stage']), text: (s, c) => `You froze backstage before your ${lessonNoun(c.id)} performance.`,
  choices: [
    ['Breathe and walk out there', (s, c) => { if (chance(0.55 + lessonSkill(s, c.id) / 200)) { add(s, { happy: 6 }); lessonsOf(s)[c.id].xp += 5; return 'Your hands shook for the first ten seconds. Then it was the best you have ever been.'; } add(s, { happy: -3 }); return 'You got through it. Barely. Your family clapped anyway.'; }],
    ['Ask your teacher for a pep talk', (s, c) => { const r = lessonsOf(s)[c.id]; if (r.pid && s.people[r.pid]) addRel(s, r.pid, 6); add(s, { happy: 2 }); return 'Your teacher told you they still get nervous too. It helped more than you expected.'; }],
    ['Fake being sick', (s) => { add(s, { happy: -2 }); return 'You went home with a "stomachache." You felt bad about it all week.'; }],
  ],
});
EV('ls_sensei', {
  ages: [5, 60], emoji: '🥋', ctx: takingLesson(['belt', 'bjj']), text: (s, c) => { const r = lessonsOf(s)[c.id], t = r.pid && s.people[r.pid]; return `After class, ${t ? t.first : 'your sensei'} told you: "The belt only covers two inches of your waist. You cover the rest."`; },
  auto: (s) => { add(s, { karma: 2, happy: 2 }); return 'You have no idea what it means, but you think about it a lot.'; },
});
EV('ls_rival', {
  ages: [7, 40], emoji: '😤', ctx: takingLesson(['ring', 'sport', 'swim', 'chess', 'belt']), text: (s, c) => `Someone at ${lessonNoun(c.id)} keeps beating you, and loves to say so.`,
  choices: [
    ['Train twice as hard', (s, c) => { lessonsOf(s)[c.id].xp += 8; add(s, { happy: -1 }); return 'You trained every day for a month. The next time you met, it was close.'; }],
    ['Ask them for tips', (s) => { add(s, { karma: 2 }); return 'They were so surprised they actually helped. You might be friends now.'; }],
    ['Let it go', () => 'You decided it was not worth the energy.'],
  ],
});
EV('ls_prodigy', {
  ages: [5, 12], once: true, emoji: '🌟', ctx: (s) => { const ids = activeLessons(s).filter((id) => lessonsOf(s)[id].lvl >= 2); return ids.length ? { id: pick(ids) } : null; },
  text: (s, c) => `A local paper wants to write about the kid who is already at ${lessonLevel(c.id, lessonsOf(s)[c.id].lvl)} in ${lessonNoun(c.id)}.`,
  choices: [
    ['Do the interview', (s) => { M(s).fame = clamp100(M(s).fame + 3); add(s, { happy: 5 }); tally(s, 'prodigy'); return 'Your photo was on page four. Your grandparents bought twenty copies.'; }],
    ['Stay out of the papers', () => 'You said you just like doing it. That was the whole quote.'],
  ],
});

/* ---- data hooks, achievements and goals ---------------------------------------------------- */
KIN_LABELS.instructor = ['Teacher', 'Teacher', 'Teacher'];
REL_GROUPS.find((g) => g.id === 'other').kinds.push('instructor');
REL_DECAY.instructor = 2;
ACT_CATS.splice(ACT_CATS.findIndex((c) => c.id === 'mind') + 1, 0, { id: 'learn', name: 'Classes & Lessons', emoji: '🎓' });
ACHIEVEMENTS.push(
  { id: 'black_belt', name: 'Black Belt', emoji: '🥋', desc: 'Earn a black belt.', check: (s) => LC(s, 'blackBelts') >= 1 },
  { id: 'virtuoso', name: 'Virtuoso', emoji: '🎻', desc: 'Earn a diploma on an instrument.', check: (s) => LC(s, 'virtuoso') >= 1 },
  { id: 'polyglot', name: 'Polyglot', emoji: '🌍', desc: 'Become fluent in two languages you studied.', check: (s) => LC(s, 'fluent') >= 2 },
  { id: 'grandmaster', name: 'Grandmaster', emoji: '♟️', desc: 'Reach grandmaster in chess.', check: (s) => LC(s, 'grandmaster') >= 1 },
  { id: 'national_champ', name: 'National Champion', emoji: '🥇', desc: 'Win a national competition in your lessons.', check: (s) => LC(s, 'nationalChamp') >= 1 },
  { id: 'prodigy', name: 'Prodigy', emoji: '🌟', desc: 'Climb the ranks of a lesson before you turn 11.', check: (s) => LC(s, 'prodigy') >= 1 },
);
GOALS.push({ id: 'g_black_belt', text: 'Earn a black belt', emoji: '🥋', check: (s) => LC(s, 'blackBelts') >= 1 });
