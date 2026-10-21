/* =====================================================================
 * 14-school.js — compulsory school, college, trade school, grad school.
 *
 * M(s).edu = { degrees: [{ type, major, year, gpa, honors }], current, dropouts }
 * current = { kind: 'school'|'college'|'grad', stage|type|prog, major, year,
 *             years, grades, name, funding, cost, clique, clubs, probation }
 * ===================================================================== */

const SCHOOL_ROOTS = ['Lincoln', 'Riverside', 'Oakwood', 'Westfield', 'Hillcrest', 'Maplewood', 'Northgate', 'Sunnyvale', 'Greenfield', 'Kingsbridge', 'Lakeview', 'Brookside', 'Cedar Park', 'Fairmont', 'Ashford', 'Pinecrest', 'St. Clair', 'Highland'];
const COLLEGE_PATTERNS = ['University of {city}', '{city} State University', '{root} College', '{root} Institute of Technology', '{root} University', '{city} Polytechnic'];
// Tuition multiplier on top of econ: several countries make college cheap or free.
const TUITION_MULT = { de: 0.05, fr: 0.1, se: 0, it: 0.2, es: 0.25, ie: 0.4, jp: 0.6, kr: 0.6, ng: 0.5, in: 0.6, ph: 0.6, za: 0.6, mx: 0.4, br: 0.3, au: 0.6, ca: 0.7 };

function inSchool(s) { return !!M(s).edu.current; }
function eduCur(s) { return M(s).edu.current; }
function eduRank(s) { return Math.max(0, ...M(s).edu.degrees.map((d) => EDU_RANK[d.type] || 0)); }
function hasDegree(s, type) { return M(s).edu.degrees.some((d) => d.type === type); }
function hasHighSchool(s) { return hasDegree(s, 'high') || hasDegree(s, 'ged'); }
function hasMajor(s, majors) { return M(s).edu.degrees.some((d) => (EDU_RANK[d.type] || 0) >= 3 && majors.includes(d.major)); }
function hasTrade(s, id) { return M(s).edu.degrees.some((d) => d.type === 'trade' && d.major === id); }
function bestDegree(s) {
  const ds = M(s).edu.degrees.slice().sort((a, b) => (EDU_RANK[b.type] || 0) - (EDU_RANK[a.type] || 0));
  return ds[0] || null;
}
function degreeLabel(d) {
  if (!d) return 'No diploma';
  const base = DEGREE_NAMES[d.type] || d.type;
  if (d.type === 'trade' && TRADES[d.major]) return base + ' (' + TRADES[d.major].name + ')';
  if (d.major && MAJORS[d.major]) return base + ' in ' + MAJORS[d.major].name;
  return base;
}
function eduTitle(s) {
  const c = eduCur(s);
  if (!c) return '';
  if (c.kind === 'school') return SCHOOL_STAGES[c.stage].name + ' student';
  if (c.kind === 'college') return (c.type === 'trade' ? TRADES[c.major].name + ' student' : MAJORS[c.major] ? MAJORS[c.major].name + ' student' : 'College student');
  return GRAD_PROGRAMS[c.prog].name + ' student';
}
function schoolName(stage) { return pick(SCHOOL_ROOTS) + ' ' + pick(SCHOOL_STAGES[stage].suffix); }
function collegeName(s) { return pick(COLLEGE_PATTERNS).replace('{city}', P(s).city).replace('{root}', pick(SCHOOL_ROOTS)); }
function clearKind(s, kind) { for (const pid in M(s).rels) if (M(s).rels[pid].kind === kind) delete M(s).rels[pid]; }
function tuition(s, usd) { return nicePrice(usd * econ(s) * (TUITION_MULT[P(s).country] ?? 1)); }

/* ---- compulsory school -------------------------------------------- */
function enrollSchool(s, stage) {
  const st = SCHOOL_STAGES[stage];
  const name = schoolName(stage);
  const prev = eduCur(s);
  M(s).edu.current = {
    kind: 'school', stage, year: 1, years: st.years,
    grades: prev ? prev.grades : clamp100(P(s).stats.smarts * 0.7 + randInt(5, 28)),
    name, clique: prev && stage !== 'primary' ? prev.clique : null, clubs: prev ? prev.clubs.slice() : [],
  };
  clearKind(s, 'classmate');
  makeClassmates(s, randInt(4, 7));
  log(s, `${st.emoji} You started ${st.name} at ${name}.`);
}

function schoolTick(s) {
  const e = M(s).edu, cur = e.current, p = P(s);
  if (!cur) {
    if (A(s) === 5 && !flag(s, 'startedSchool') && !inPrison(s)) { flag(s, 'startedSchool', true); enrollSchool(s, 'primary'); }
    return;
  }
  // Grades drift toward what your smarts and attitude earn; studying pushes them up directly.
  let target = p.stats.smarts * 0.7 + 22;
  if (trait(s, 'lazy')) target -= 8;
  if (trait(s, 'bookworm')) target += 6;
  if (trait(s, 'ambitious')) target += 4;
  if (cur.clique === 'brains') target += 4;
  if (cur.clique === 'rebels') target -= 5;
  cur.grades = clamp100(cur.grades + (target - cur.grades) * 0.25 + randInt(-6, 6));
  for (const c of cur.clubs || []) {
    const club = SCHOOL_CLUBS[c];
    if (!club) continue;
    if (club.skill) addSkill(s, club.skill, randFloat(3, 6));
    if (club.also) addSkill(s, club.also, randFloat(1, 3));
    if (club.stat) add(s, { [club.stat]: randInt(1, 3) });
  }
  if (cur.kind === 'school') add(s, { smarts: randInt(0, 3) });
  else add(s, { smarts: randInt(1, 3) });

  if (cur.kind !== 'school') {
    // College / grad: collect a stipend; flunking twice in a row gets you expelled.
    if (cur.kind === 'grad' && GRAD_PROGRAMS[cur.prog].stipend) add(s, { money: price(s, GRAD_PROGRAMS[cur.prog].stipend) });
    if (cur.grades < 20) {
      if (cur.probation) {
        e.current = null;
        e.dropouts++;
        announce(s, { emoji: '📉', title: 'Expelled', text: `Your grades never recovered. ${cur.name} expelled you.`, tone: 'bad' });
        add(s, { happy: -10 });
        return;
      }
      cur.probation = true;
      log(s, `📉 You were put on academic probation at ${cur.name}.`, 'bad');
    } else if (cur.grades > 40) cur.probation = false;
  }

  cur.year++;
  if (cur.year <= cur.years) {
    if (cur.kind !== 'school') chargeTuition(s, cur); // tuition for the year that just started
    return;
  }
  graduate(s, cur);
}

function graduate(s, cur) {
  const e = M(s).edu;
  if (cur.kind === 'school') {
    const st = SCHOOL_STAGES[cur.stage];
    if (st.next) {
      log(s, `🎒 You finished ${st.name}.`);
      enrollSchool(s, st.next);
      return;
    }
    // High school.
    if (cur.grades < 22 && chance(0.6)) {
      cur.year = cur.years;
      announce(s, { emoji: '📚', title: 'Held back', text: `Your grades were too low to graduate. You'll repeat your final year at ${cur.name}.`, tone: 'bad' });
      add(s, { happy: -8 });
      return;
    }
    const honors = cur.grades >= 90;
    e.degrees.push({ type: 'high', year: s.year, gpa: cur.grades, honors });
    e.current = null;
    clearKind(s, 'classmate');
    tally(s, 'graduations');
    add(s, { happy: 8 });
    popup(s, {
      emoji: '🎓', title: honors ? 'Graduated with honors!' : 'You graduated!',
      text: `You graduated from ${cur.name}${honors ? ' at the top of your class' : ''}. What's next?`,
      tone: 'good', handler: 'afterHigh', choices: afterHighChoices(s),
    });
    log(s, `🎓 You graduated from ${cur.name}${honors ? ' with honors' : ''}.`, 'good');
    return;
  }
  // College / grad.
  const type = cur.kind === 'college' ? COLLEGES[cur.type].degree : GRAD_PROGRAMS[cur.prog].degree;
  const honors = cur.grades >= 88;
  e.degrees.push({ type, major: cur.major || null, year: s.year, gpa: cur.grades, honors });
  e.current = null;
  tally(s, 'graduations');
  add(s, { happy: 10, smarts: 3 });
  const deg = degreeLabel(e.degrees[e.degrees.length - 1]);
  announce(s, {
    emoji: '🎓', title: 'Graduation day', tone: 'good',
    text: `You earned your ${deg} from ${cur.name}${honors ? ' with honors' : ''}! Check the Occupation tab for jobs${cur.kind === 'college' ? ' or graduate school' : ''}.`,
  });
}

function afterHighChoices(s) {
  return [
    { label: '🎓 Apply to university', value: 'university' },
    { label: '🏛️ Community college', value: 'community' },
    { label: '🛠️ Trade school', value: 'trade' },
    { label: '💼 Start working', value: 'work' },
    { label: '🌴 Take a gap year', value: 'gap' },
  ];
}
onChoice('afterHigh', (s, ctx, v) => {
  if (v === 'work') return { text: 'You decided to join the workforce. Job listings are on the Occupation tab.', quiet: true };
  if (v === 'gap') { add(s, { happy: 6 }); return 'You took a gap year to figure things out.'; }
  openMajorPicker(s, v);
});

/* ---- college ------------------------------------------------------- */
function openMajorPicker(s, type) {
  const list = type === 'trade' ? TRADE_IDS.map((id) => ({ label: TRADES[id].name, value: id }))
    : MAJOR_IDS.map((id) => ({ label: MAJORS[id].name, value: id, sub: MAJORS[id].smarts > P(s).stats.smarts ? 'Competitive' : '' }));
  list.push({ label: 'Never mind', value: null });
  popup(s, {
    emoji: COLLEGES[type].emoji, title: COLLEGES[type].name,
    text: type === 'trade' ? 'Which trade do you want to learn?' : 'Pick a major.',
    handler: 'pickMajor', ctx: { type }, choices: list,
  });
}
onChoice('pickMajor', (s, ctx, major) => {
  if (!major) return;
  const type = ctx.type;
  const c = COLLEGES[type];
  const name = type === 'community' ? P(s).city + ' Community College' : type === 'trade' ? P(s).city + ' Technical Institute' : collegeName(s);
  if (type === 'university') {
    const last = M(s).edu.degrees.find((d) => d.type === 'high' || d.type === 'ged');
    const gpa = last ? last.gpa ?? 60 : 60;
    let odds = 0.45 + (gpa - 55) / 90 + (P(s).stats.smarts - MAJORS[major].smarts) / 120;
    if (lifeCount(s, 'felonies')) odds -= 0.15;
    if (!chance(clamp(odds, 0.08, 0.97))) {
      add(s, { happy: -6 });
      return { text: `${name} rejected your application for ${MAJORS[major].name}. Community college is always an option.`, title: 'Rejected', emoji: '📭', tone: 'bad' };
    }
  }
  const cost = tuition(s, c.cost);
  openFunding(s, { kind: 'college', type, major, name, cost, years: c.years });
});

function openFunding(s, info) {
  const totalGuess = info.cost * info.years;
  const choices = [];
  if (info.cost === 0) {
    startCollege(s, info, 'free');
    return;
  }
  if (!info.noParents && relPeople(s, ['parent']).length) choices.push({ label: '👪 Ask my parents to pay', value: 'parents' });
  if (!info.noScholarship) choices.push({ label: '🏅 Apply for a scholarship', value: 'scholarship' });
  choices.push({ label: '🏦 Take out student loans', value: 'loan', sub: fmtMoney(info.cost) + ' / year' });
  choices.push({ label: '💵 Pay it myself', value: 'cash', sub: fmtMoney(info.cost) + ' / year', disabled: M(s).money < info.cost });
  choices.push({ label: 'Cancel', value: 'cancel' });
  popup(s, {
    emoji: '💳', title: 'Paying for ' + info.name,
    text: `Tuition is ${fmtMoney(info.cost)} a year, about ${fmtMoney(totalGuess)} in total. How will you pay?`,
    handler: 'funding', ctx: info, choices,
  });
}
onChoice('funding', (s, info, v) => {
  if (v === 'cancel') return;
  if (v === 'parents') {
    const parents = relPeople(s, ['parent']);
    const rich = parents.reduce((t, p) => t + p.money, 0);
    const best = Math.max(...parents.map((p) => relOf(s, p.id).rel));
    const odds = clamp((rich / (info.cost * info.years)) * 0.5 + (best - 40) / 100, 0, 0.95);
    if (chance(odds)) {
      startCollege(s, info, 'parents');
      return { text: `Your parents agreed to pay for ${info.name}!`, emoji: '👪', tone: 'good' };
    }
    popup(s, { emoji: '😬', title: 'Your parents said no', text: "They can't (or won't) cover it.", choices: [{ label: 'OK' }] });
    openFunding(s, Object.assign({}, info, { noParents: true }));
    return;
  }
  if (v === 'scholarship') {
    const last = M(s).edu.degrees[M(s).edu.degrees.length - 1];
    const gpa = last && last.gpa != null ? last.gpa : 50;
    const odds = clamp((gpa - 70) / 35 + P(s).stats.smarts / 400 + (last && last.honors ? 0.15 : 0), 0, 0.9);
    if (chance(odds)) {
      startCollege(s, info, 'scholarship');
      return { text: `You won a full scholarship to ${info.name}!`, emoji: '🏅', tone: 'good' };
    }
    popup(s, { emoji: '📭', title: 'No scholarship', text: 'Your scholarship application was turned down.', choices: [{ label: 'OK' }] });
    openFunding(s, Object.assign({}, info, { noScholarship: true }));
    return;
  }
  if (v === 'cash' && M(s).money < info.cost) return cantAfford(info.cost);
  startCollege(s, info, v);
  return { text: `You enrolled at ${info.name}.`, emoji: '🎓' };
});

function startCollege(s, info, funding) {
  const cur = {
    kind: info.kind, type: info.type || null, prog: info.prog || null, major: info.major || null,
    year: 1, years: info.years, grades: clamp100(P(s).stats.smarts * 0.6 + randInt(10, 30)),
    name: info.name, funding, cost: info.cost, clubs: [], clique: null, probation: false,
  };
  M(s).edu.current = cur;
  chargeTuition(s, cur);
  clearKind(s, 'classmate');
  makeClassmates(s, randInt(3, 6));
  for (const pid of Object.keys(M(s).rels)) {
    const r = M(s).rels[pid];
    if (r.kind === 'classmate') { const p = s.people[pid]; p.birthYear = P(s).birthYear + randInt(-2, 2); assignNpcLife(s, p); p.job = { student: true }; }
  }
  log(s, `🎓 You enrolled at ${info.name}${info.major ? ' (' + (MAJORS[info.major] ? MAJORS[info.major].name : TRADES[info.major] ? TRADES[info.major].name : '') + ')' : ''}.`);
}

function chargeTuition(s, cur) {
  if (!cur.cost) return;
  if (cur.funding === 'parents') {
    const parents = relPeople(s, ['parent']).sort((a, b) => b.money - a.money);
    let need = cur.cost;
    for (const p of parents) { const t = Math.min(p.money, need); p.money -= t; need -= t; }
    if (need > 0) addStudentLoan(s, need);
  } else if (cur.funding === 'loan') {
    addStudentLoan(s, cur.cost);
  } else if (cur.funding === 'cash') {
    if (M(s).money >= cur.cost) M(s).money -= cur.cost;
    else addStudentLoan(s, cur.cost);
  }
}

/* ---- graduate school ----------------------------------------------- */
function gradEligible(s, progId) {
  const g = GRAD_PROGRAMS[progId];
  const bach = M(s).edu.degrees.filter((d) => (EDU_RANK[d.type] || 0) >= 3);
  if (!bach.length) return { ok: false, why: "Requires a bachelor's degree" };
  if (g.majors && !hasMajor(s, g.majors)) return { ok: false, why: 'Requires a degree in ' + listJoin(g.majors.map((m) => MAJORS[m].name)) };
  if (hasDegree(s, g.degree) && g.degree !== 'master') return { ok: false, why: 'You already have this degree' };
  if (progId === 'phd' && !hasDegree(s, 'master') && P(s).stats.smarts < 80) return { ok: false, why: "Requires a master's degree (or Smarts 80+)" };
  return { ok: true };
}
function applyGrad(s, progId) {
  const g = GRAD_PROGRAMS[progId];
  const bach = M(s).edu.degrees.filter((d) => (EDU_RANK[d.type] || 0) >= 3).sort((a, b) => (b.gpa || 0) - (a.gpa || 0))[0];
  const gpa = bach.gpa ?? 60;
  const odds = clamp(0.3 + (gpa - 60) / 70 + (P(s).stats.smarts - g.smarts) / 90 - (lifeCount(s, 'felonies') ? 0.2 : 0), 0.04, 0.95);
  if (!chance(odds)) {
    add(s, { happy: -5 });
    return { text: `${g.name} rejected your application.`, title: 'Rejected', emoji: '📭', tone: 'bad' };
  }
  const name = (progId === 'law' ? pick(SCHOOL_ROOTS) + ' School of Law' : progId === 'med' ? pick(SCHOOL_ROOTS) + ' Medical School' : progId === 'business' ? pick(SCHOOL_ROOTS) + ' Business School' : collegeName(s));
  openFunding(s, { kind: 'grad', prog: progId, major: progId === 'masters' || progId === 'phd' ? bach.major : null, name, cost: tuition(s, g.cost), years: g.years });
}

/* ---- school actions ------------------------------------------------ */
defAction({
  id: 'study', cat: 'school', label: 'Study harder', emoji: '📖', desc: 'Raise your grades and smarts.',
  when: (s) => inSchool(s) && free(s),
  run: (s) => {
    const n = bump(s, 'study');
    const cur = eduCur(s);
    if (n > 4) { add(s, { happy: -2 }); return 'You tried to study again, but the words just swam on the page.'; }
    cur.grades = clamp100(cur.grades + randInt(3, 8) / n);
    add(s, { smarts: chance(0.7) ? randInt(1, 3) : 0, happy: -1 });
    return vary('You {hit the books|studied late into the night|made flashcards for everything|joined a study group} and your grades improved.');
  },
});
defAction({
  id: 'hooky', cat: 'school', label: 'Skip class', emoji: '🛹', desc: 'Have fun. Hurt your grades.',
  when: (s) => inSchool(s) && free(s),
  run: (s) => {
    const cur = eduCur(s);
    cur.grades = clamp100(cur.grades - randInt(3, 7));
    add(s, { happy: randInt(2, 5) });
    if (cur.kind === 'school' && chance(0.3)) {
      for (const p of relPeople(s, ['parent'])) addRel(s, p.id, -6);
      return 'You skipped class. The school called your parents. They were not amused.';
    }
    return vary('You skipped class and {went to the arcade|wandered the mall|slept in|hung out by the river}.');
  },
});
defAction({
  id: 'teacher', cat: 'school', label: 'Talk to a teacher', emoji: '🎓', desc: 'Ask for help or extra credit.',
  when: (s) => inSchool(s) && free(s) && eduCur(s).kind === 'school',
  run: (s) => {
    if (bump(s, 'teacher') > 2) return { text: 'Your teacher is starting to avoid you.', nolog: true };
    const cur = eduCur(s);
    if (chance(0.7)) { cur.grades = clamp100(cur.grades + randInt(2, 5)); add(s, { smarts: 1 }); return 'Your teacher stayed after class to help you. It actually made sense this time.'; }
    return 'Your teacher told you to "just read the chapter again." Helpful.';
  },
});
defAction({
  id: 'clique', cat: 'school', label: 'Join a clique', emoji: '👥', desc: 'Find your people.',
  when: (s) => inSchool(s) && free(s) && eduCur(s).kind === 'school' && A(s) >= 11,
  sub: (s) => (eduCur(s).clique ? 'Current: ' + CLIQUES[eduCur(s).clique].name : 'None yet'),
  run: (s) => {
    popup(s, {
      emoji: '👥', title: 'Cliques', text: 'Which crowd do you want to run with?', handler: 'clique',
      choices: Object.keys(CLIQUES).map((id) => ({ label: CLIQUES[id].emoji + ' ' + CLIQUES[id].name, value: id })).concat([{ label: 'Leave my clique', value: 'none' }, { label: 'Never mind', value: null }]),
    });
  },
});
onChoice('clique', (s, ctx, id) => {
  if (id === null) return;
  const cur = eduCur(s);
  if (!cur) return;
  if (id === 'none') { cur.clique = null; return 'You went solo.'; }
  const c = CLIQUES[id];
  const looks = P(s).stats.looks, smarts = P(s).stats.smarts;
  let odds = 0.65;
  if (id === 'populars') odds = (looks - 30) / 60;
  if (id === 'brains') odds = (smarts - 30) / 60;
  if (id === 'jocks') odds = 0.25 + skill(s, 'athletics') / 80;
  if (!chance(clamp(odds, 0.05, 0.95))) { add(s, { happy: -4 }); return `The ${c.name} wouldn't let you in.`; }
  cur.clique = id;
  add(s, { happy: 4 });
  if (c.skill) addSkill(s, c.skill, 3);
  return `You're one of the ${c.name} now. ${c.emoji}`;
});
defAction({
  id: 'clubs', cat: 'school', label: 'Clubs & teams', emoji: '🏅', desc: 'Join an activity to build a skill.',
  when: (s) => inSchool(s) && free(s) && A(s) >= 7,
  sub: (s) => { const c = eduCur(s).clubs || []; return c.length ? c.map((k) => SCHOOL_CLUBS[k].name).join(', ') : 'None yet'; },
  run: (s) => {
    const cur = eduCur(s);
    popup(s, {
      emoji: '🏅', title: 'Clubs & teams', text: 'You can be in up to two at a time. Tap one you are in to leave it.', handler: 'club',
      choices: Object.keys(SCHOOL_CLUBS).map((id) => ({ label: SCHOOL_CLUBS[id].emoji + ' ' + SCHOOL_CLUBS[id].name, value: id, sub: (cur.clubs || []).includes(id) ? 'Member (tap to leave)' : '' })).concat([{ label: 'Never mind', value: null }]),
    });
  },
});
onChoice('club', (s, ctx, id) => {
  const cur = eduCur(s);
  if (!id || !cur) return;
  cur.clubs = cur.clubs || [];
  const c = SCHOOL_CLUBS[id];
  if (cur.clubs.includes(id)) { cur.clubs = cur.clubs.filter((x) => x !== id); return `You quit the ${c.name}.`; }
  if (cur.clubs.length >= 2) return { text: 'You are already in two activities. Leave one first.', nolog: true };
  if (id === 'sports' && skill(s, 'athletics') < 10 && P(s).stats.health < 40 && chance(0.5)) return `You didn't make the cut for the ${c.name}.`;
  cur.clubs.push(id);
  add(s, { happy: 3 });
  if (c.skill) addSkill(s, c.skill, 3);
  return `You joined the ${c.name}! ${c.emoji}`;
});
defAction({
  id: 'party_college', cat: 'school', label: 'Go to a campus party', emoji: '🎉', desc: 'Fun now, grades later.',
  when: (s) => inSchool(s) && free(s) && eduCur(s).kind !== 'school',
  run: (s) => {
    const cur = eduCur(s);
    cur.grades = clamp100(cur.grades - randInt(1, 4));
    add(s, { happy: randInt(3, 7) });
    if (A(s) >= country(s).drink && chance(0.4)) habit(s, 'alcohol', randInt(3, 8));
    if (chance(0.25)) {
      const f = makeAdultNear(s, { minAge: A(s) - 2, maxAge: A(s) + 2 });
      f.job = { student: true };
      setRel(s, f.id, 'friend', randInt(45, 70));
      return `You partied until sunrise and made a new friend, ${f.first}.`;
    }
    return vary('You {danced on a table|won at beer pong|DJed from your phone|ate an entire pizza} at a campus party.');
  },
});
defAction({
  id: 'change_major', cat: 'school', label: 'Change major', emoji: '🔀', desc: 'Only in your first two years.',
  when: (s) => inSchool(s) && free(s) && eduCur(s).kind === 'college' && eduCur(s).type !== 'trade' && eduCur(s).year <= 2,
  run: (s) => {
    popup(s, {
      emoji: '🔀', title: 'Change major', text: 'Switching resets you to year one.', handler: 'changeMajor',
      choices: MAJOR_IDS.filter((m) => m !== eduCur(s).major).map((m) => ({ label: MAJORS[m].name, value: m })).concat([{ label: 'Never mind', value: null }]),
    });
  },
});
onChoice('changeMajor', (s, ctx, m) => {
  const cur = eduCur(s);
  if (!m || !cur) return;
  cur.major = m;
  cur.year = 1;
  return `You switched your major to ${MAJORS[m].name}.`;
});
defAction({
  id: 'dropout', cat: 'school', label: 'Drop out', emoji: '🚪', desc: 'Walk away from school.',
  when: (s) => inSchool(s) && free(s) && (eduCur(s).kind !== 'school' || (eduCur(s).stage === 'high' && A(s) >= 16)),
  run: (s) => {
    popup(s, {
      emoji: '🚪', title: 'Drop out?', text: `Are you sure you want to drop out of ${eduCur(s).name}?`, handler: 'dropout',
      choices: [{ label: 'Yes, drop out', value: true, tone: 'bad' }, { label: 'No, stay', value: false }],
    });
  },
});
onChoice('dropout', (s, ctx, yes) => {
  if (!yes) return;
  const cur = eduCur(s);
  M(s).edu.current = null;
  M(s).edu.dropouts++;
  tally(s, 'dropouts');
  clearKind(s, 'classmate');
  if (cur.kind === 'school') for (const p of relPeople(s, ['parent'])) addRel(s, p.id, -15);
  add(s, { happy: chance(0.5) ? 4 : -4 });
  return `You dropped out of ${cur.name}.`;
});
defAction({
  id: 'ged', cat: 'school', label: 'Get your GED', emoji: '📝', desc: 'A high school equivalency test.',
  when: (s) => free(s) && !inSchool(s) && !hasHighSchool(s) && A(s) >= 16,
  sub: (s) => fmtMoney(price(s, 150)),
  run: (s) => {
    const cost = price(s, 150);
    if (!pay(s, cost)) return cantAfford(cost);
    if (chance(clamp(0.3 + P(s).stats.smarts / 100, 0.2, 0.95))) {
      M(s).edu.degrees.push({ type: 'ged', year: s.year, gpa: clamp100(P(s).stats.smarts * 0.8 + 10) });
      add(s, { happy: 6 });
      return { text: 'You passed the GED exam!', tone: 'good' };
    }
    add(s, { happy: -4 });
    return 'You failed the GED exam. You can try again.';
  },
});
