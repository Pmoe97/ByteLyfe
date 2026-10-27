/* =====================================================================
 * 15-career.js — jobs, interviews, performance, promotions, retirement,
 * part-time work, gigs, and the special career tracks (fame, sports,
 * military, politics).
 *
 * M(s).career = { id, level, perf, years, levelYears, salary, term }
 * ===================================================================== */

function hasFelony(s) { return M(s).record.some((r) => CRIMES[r.crime] && CRIMES[r.crime].felony); }

// Requirement check shared by jobs, part-time jobs and gigs. Returns unmet requirements as text.
function missingReqs(s, req) {
  const out = [];
  if (!req) return out;
  const p = P(s), age = A(s);
  if (req.age && age < req.age) out.push(`Age ${req.age}+`);
  if (req.maxAge && age > req.maxAge) out.push(`Age ${req.maxAge} or younger`);
  if (req.degree && !hasDegree(s, req.degree)) out.push(DEGREE_NAMES[req.degree]);
  if (req.trade && !hasTrade(s, req.trade)) out.push(TRADES[req.trade].name + ' certificate');
  if (req.edu) {
    const rankOk = eduRank(s) >= EDU_RANK[req.edu];
    if (req.majors) {
      if (!rankOk || !hasMajor(s, req.majors)) out.push(DEGREE_NAMES[req.edu] + ' in ' + listJoin(req.majors.slice(0, 4).map((m) => MAJORS[m].name)) + (req.majors.length > 4 ? ' or similar' : ''));
    } else if (!rankOk) out.push(DEGREE_NAMES[req.edu]);
  }
  if (req.smarts && p.stats.smarts < req.smarts) out.push(`Smarts ${req.smarts}+`);
  if (req.looks && p.stats.looks < req.looks) out.push(`Looks ${req.looks}+`);
  if (req.sk) for (const k in req.sk) if (skill(s, k) < req.sk[k]) out.push(`${SKILLS[k].name} ${req.sk[k]}+`);
  if (req.license && !M(s).license) out.push("Driver's license");
  if (req.clean && hasFelony(s)) out.push('Clean criminal record');
  if (req.drink && age < country(s).drink) out.push(`Legal drinking age (${country(s).drink})`);
  return out;
}

function salaryFor(s, id, level) {
  const lad = JOBS[id].ladder;
  return nicePrice(lad[Math.min(level, lad.length - 1)][1] * econ(s) * wageOf(s));
}
function careerTitle(s) {
  const c = M(s).career;
  return c ? JOBS[c.id].ladder[c.level][0] : '';
}
function jobTitle(s) {
  if (s.dead) return '';
  if (inPrison(s)) return M(s).prison.juvie ? 'In juvenile detention' : 'Prisoner';
  if (M(s).career) return careerTitle(s);
  const ceoOf = (M(s).companies || []).find((c) => c.ceo === 'you' && !c.closed);
  if (ceoOf && !inSchool(s)) return 'CEO of ' + ceoOf.name;
  if (inSchool(s)) return eduTitle(s) + (M(s).ptJob ? ' · ' + PT_JOBS[M(s).ptJob.id].name : '');
  if (M(s).ptJob) return PT_JOBS[M(s).ptJob.id].name;
  if (M(s).retired) return 'Retired';
  const a = A(s);
  if (a < 1) return 'Baby';
  if (a < 4) return 'Toddler';
  if (a < 18) return 'Kid';
  return 'Unemployed';
}

// This year's job board: which careers are hiring. Your city's size and industries
// decide the odds (jobOpenOdds in 49-cities.js).
function jobBoard(s) {
  let l = s.listings.jobs;
  if (!l || l.year !== s.year) {
    l = s.listings.jobs = { year: s.year, open: JOB_IDS.filter((id) => chance(jobOpenOdds(s, id))) };
  }
  return JOB_IDS.map((id) => ({ id, open: l.open.includes(id) || !!JOBS[id].special, missing: missingReqs(s, JOBS[id].req) }));
}

function canWorkFullTime(s) { return free(s) && A(s) >= 16 && !inSchool(s); }

function applyJob(s, id) {
  const j = JOBS[id];
  if (!canWorkFullTime(s)) return { text: inSchool(s) ? "You can't take a full-time job while you're in school. Try part-time work." : "You can't apply right now.", nolog: true };
  const miss = missingReqs(s, j.req);
  if (miss.length) return { text: `You don't qualify yet. You need: ${miss.join(', ')}.`, title: j.name, emoji: j.emoji, nolog: true };
  if (M(s).career && M(s).career.id === id) return { text: 'You already work here.', nolog: true };
  if (inService(s) && j.special !== 'military') return { text: 'You are under contract with the armed forces. Finish your term first.', nolog: true };
  if (j.special === 'military' && isDeserter(s)) return { text: 'You are a wanted deserter. Walking into a recruiter’s office would end badly.', nolog: true };
  if (bump(s, 'apply') > 6) return { text: "You've sent out a lot of applications this year. Wait until next year.", nolog: true };
  if (j.special === 'politics') return startElection(s, 0);
  if (j.special) return specialApply(s, id);
  const qi = randInt(0, INTERVIEW_QS.length - 1);
  const order = shuffle([0, 1, 2]);
  popup(s, {
    emoji: j.emoji, title: 'Interview: ' + j.ladder[0][0], text: `"${INTERVIEW_QS[qi].q}"`, handler: 'interview', ctx: { id, qi },
    choices: order.map((i) => ({ label: INTERVIEW_QS[qi].a[i][0], value: i })),
  });
}
onChoice('interview', (s, ctx, ai) => {
  const j = JOBS[ctx.id];
  const mod = INTERVIEW_QS[ctx.qi].a[ai][1];
  const p = P(s);
  const best = bestDegree(s);
  let odds = 0.5 + mod + (p.stats.smarts - 50) / 220 + (p.stats.looks - 50) / 320 + skill(s, 'charisma') / 350;
  if (j.skill) odds += skill(s, j.skill) / 400;
  if (trait(s, 'charming')) odds += 0.08;
  if (best && best.honors) odds += 0.06;
  if (best && best.tier === 'elite') odds += 0.1;
  else if (best && best.tier === 'selective') odds += 0.05;
  if (hasFelony(s)) odds -= 0.3;
  if (M(s).wanted) odds -= 0.2;
  odds += vetHireEdge(s, j); // veterans’ preference (59-military.js)
  if (!chance(clamp(odds, 0.05, 0.95))) {
    add(s, { happy: -3 });
    return { text: `They went with another candidate for ${j.ladder[0][0]}.`, title: 'Not this time', emoji: '📭', tone: 'bad' };
  }
  // Experience in the same career lets you start a rung higher.
  const prev = M(s).jobHistory.filter((h) => h.id === ctx.id).sort((a, b) => b.level - a.level)[0];
  const level = prev ? Math.max(0, Math.min(prev.level - 1, j.ladder.length - 2)) : 0;
  if (M(s).career) leaveJob(s, 'switched');
  hire(s, ctx.id, level);
  return { text: `You got the job! You're now a ${j.ladder[level][0]} earning ${fmtMoney(salaryFor(s, ctx.id, level))} a year.`, title: 'Hired!', emoji: j.emoji, tone: 'good' };
});

const EMPLOYER_ROOTS = ['Northwind', 'Brightside', 'Summit', 'Bluebird', 'Ironclad', 'Evergreen', 'Lighthouse', 'Redwood', 'Silverline', 'Harbor', 'Keystone', 'Pinnacle', 'Crescent', 'Riverbend', 'Starlight', 'Copperfield', 'Blue Ridge', 'Juniper'];
const EMPLOYER_SUFFIX = {
  service: ['Diner', 'Market', 'Bistro', 'Outfitters', 'Fitness'], office: ['Group', 'Services', 'Partners'], transport: ['Logistics', 'Freight', 'Airlines', 'Express'],
  trades: ['Builders', 'Works', 'Contracting', 'Farms'], public: ['City Services', 'Public Safety', 'Municipal Services'], health: ['Hospital', 'Medical Center', 'Clinic', 'Health'],
  tech: ['Labs', 'Systems', 'Software', 'Technologies'], science: ['Institute', 'Research', 'Laboratories'], business: ['Capital', 'Holdings', 'Financial', '& Co.'],
  law: ['Law Group', '& Associates', 'Legal'], education: ['Academy', 'University', 'School District'], media: ['Media', 'Studios', 'Creative'],
  fame: ['Entertainment', 'Records', 'Pictures', 'Talent Agency'], sports: ['Athletic Club', 'FC', 'Sports Club'],
};
function employerName(s, j) {
  if (j.cat === 'military') return country(s).adj + ' Armed Forces';
  if (j.cat === 'politics') return 'Public office';
  return pick(EMPLOYER_ROOTS) + ' ' + pick(EMPLOYER_SUFFIX[j.cat] || ['Inc.']);
}

function hire(s, id, level) {
  const j = JOBS[id];
  M(s).career = { id, level, perf: 55, years: 0, levelYears: 0, salary: salaryFor(s, id, level), term: 0, employer: employerName(s, j) };
  M(s).retired = null;
  tally(s, 'jobs');
  clearKind(s, 'coworker');
  clearKind(s, 'boss');
  if (!j.special || j.special === 'military') {
    for (let i = 0, n = randInt(2, 4); i < n; i++) {
      const c = makeAdultNear(s, { minAge: Math.max(18, A(s) - 12), maxAge: A(s) + 15 });
      c.job = { id, level: randInt(0, Math.max(0, j.ladder.length - 2)) };
      setRel(s, c.id, 'coworker', randInt(30, 60));
    }
    const b = makeAdultNear(s, { minAge: Math.max(28, A(s)), maxAge: Math.max(35, A(s) + 25) });
    b.job = { id, level: j.ladder.length - 1 };
    setRel(s, b.id, 'boss', randInt(35, 60));
  }
  log(s, `${j.emoji} You started working as a ${j.ladder[level][0]}.`);
}

function leaveJob(s, reason) {
  const c = M(s).career;
  if (!c) return;
  M(s).jobHistory.push({ id: c.id, level: c.level, years: c.years, end: s.year, reason, employer: c.employer });
  M(s).career = null;
  milLeft(s, c, reason); // a uniform comes off with a discharge (59-military.js)
  spyLeft(s, c, reason); // the agency closes your file (60-spy.js)
  clearKind(s, 'coworker');
  clearKind(s, 'boss');
}

function promote(s, why) {
  const c = M(s).career, j = JOBS[c.id];
  if (c.level >= j.ladder.length - 1) return false;
  c.level++;
  c.levelYears = 0;
  c.salary = Math.max(salaryFor(s, c.id, c.level), Math.round(c.salary * 1.08));
  c.perf = Math.min(c.perf, 70);
  tally(s, 'promotions');
  add(s, { happy: 8 });
  if (j.special === 'fame') add(s, { fame: randInt(6, 14) });
  announce(s, { emoji: '📈', title: 'Promotion!', tone: 'good', text: `${why || 'You were promoted.'} You're now a ${j.ladder[c.level][0]}, earning ${fmtMoney(c.salary)} a year.` });
  return true;
}

function fire(s, text) {
  const title = careerTitle(s);
  leaveJob(s, 'fired');
  tally(s, 'firings');
  add(s, { happy: -12 });
  announce(s, { emoji: '📦', title: 'Fired', tone: 'bad', text: text || `You were fired from your job as a ${title}.` });
}

function careerTick(s) {
  const c = M(s).career;
  if (!c || inPrison(s)) return;
  const j = JOBS[c.id];
  const p = P(s);
  c.years++;
  c.levelYears++;
  tally(s, 'workYears');
  if (j.skill) addSkill(s, j.skill, randFloat(1, 3));
  let base = 45 + (p.stats.smarts - 50) * 0.2 + (j.skill ? skill(s, j.skill) * 0.15 : 5) + (p.stats.happy - 50) * 0.1;
  if (trait(s, 'ambitious')) base += 7;
  if (trait(s, 'lazy')) base -= 8;
  if (p.stats.health < 30) base -= 10;
  c.perf = clamp100(c.perf + (base - c.perf) * 0.3 + randInt(-8, 8));

  if (j.special) { specialTick(s, c, j); return; }

  if (c.perf >= 50) c.salary = Math.round(c.salary * randFloat(1.01, 1.04));
  if (c.perf < 18 && chance(0.45)) { fire(s, `Your performance has been terrible. You were let go from your job as a ${careerTitle(s)}.`); return; }
  const need = 1 + Math.floor(c.level / 2);
  if (c.level < j.ladder.length - 1 && !j.appointed && c.levelYears >= need && c.perf >= 62) {
    let odds = 0.3 + (c.perf - 62) / 70;
    if (trait(s, 'ambitious')) odds += 0.1;
    if (chance(odds)) promote(s, 'Your hard work paid off.');
  }
  // Mandatory retirement nudge (judges serve until they choose to go).
  if (A(s) >= 70 && !j.appointed && chance(0.35)) {
    popup(s, {
      emoji: '🏖️', title: 'Time to retire?', text: 'Your boss gently suggests it might be time to retire.', handler: 'retireAsk',
      choices: [{ label: 'Retire', value: true }, { label: 'Keep working', value: false }],
    });
  }
}
onChoice('retireAsk', (s, ctx, yes) => (yes ? retire(s) : 'You told your boss you are not going anywhere.'));

function pensionFor(s, c) {
  if (!c) return 0;
  if (JOBS[c.id].special === 'military') return militaryPension(s, c);
  return Math.round(c.salary * Math.min(0.6, (c.years + 2) * 0.015));
}
function retire(s) {
  const c = M(s).career;
  if (!c) return;
  const title = careerTitle(s);
  const pension = A(s) >= 50 ? pensionFor(s, c) : 0;
  leaveJob(s, 'retired');
  M(s).retired = { pension, year: s.year };
  add(s, { happy: 10 });
  return { text: `You retired from your career as a ${title}.${pension ? ` Your pension pays ${fmtMoney(pension)} a year.` : ''}`, emoji: '🏖️', tone: 'good' };
}

/* ---- job actions --------------------------------------------------- */
const hasCareer = (s) => free(s) && !!M(s).career;
defAction({
  id: 'work_harder', cat: 'job', label: 'Work harder', emoji: '💪', desc: 'Boost your performance.',
  when: hasCareer,
  run: (s) => {
    const n = bump(s, 'workhard');
    const c = M(s).career;
    if (n > 3) { add(s, { happy: -3, health: -1 }); return "You're burning out. Working even harder isn't helping."; }
    c.perf = clamp100(c.perf + randInt(5, 11) / n);
    add(s, { happy: -randInt(0, 2) });
    return vary('You {stayed late every night|crushed your to-do list|volunteered for the hard projects|impressed everyone in a meeting}.');
  },
});
defAction({
  id: 'slack_off', cat: 'job', label: 'Slack off', emoji: '😴', desc: 'Enjoy yourself on the clock.',
  when: hasCareer,
  run: (s) => {
    const c = M(s).career;
    c.perf = clamp100(c.perf - randInt(4, 10));
    add(s, { happy: randInt(2, 5) });
    if (c.perf < 15 && chance(0.4)) { fire(s, 'Your boss caught you napping under your desk. You were fired.'); return; }
    return vary('You {spent the day watching videos at your desk|took a three-hour lunch|pretended to be on a call all afternoon}.');
  },
});
defAction({
  id: 'ask_raise', cat: 'job', label: 'Ask for a raise', emoji: '💵', desc: 'Could go either way.',
  when: (s) => hasCareer(s) && !JOBS[M(s).career.id].special && !JOBS[M(s).career.id].appointed,
  run: (s) => {
    if (bump(s, 'raise') > 1) return { text: 'You already asked this year.', nolog: true };
    const c = M(s).career;
    if (chance(clamp((c.perf - 35) / 60, 0.05, 0.85))) {
      const pct = randFloat(0.04, 0.12);
      c.salary = Math.round(c.salary * (1 + pct));
      add(s, { happy: 5 });
      return { text: `Your boss gave you a ${Math.round(pct * 100)}% raise. You now make ${fmtMoney(c.salary)} a year.`, tone: 'good' };
    }
    c.perf = clamp100(c.perf - 4);
    if (c.perf < 35 && chance(0.12)) { fire(s, 'You asked for a raise. Your boss responded by firing you.'); return; }
    add(s, { happy: -3 });
    return 'Your boss laughed, then realized you were serious. No raise.';
  },
});
defAction({
  id: 'ask_promo', cat: 'job', label: 'Ask for a promotion', emoji: '⬆️', desc: 'Make your case for the next rung.',
  when: (s) => hasCareer(s) && !JOBS[M(s).career.id].special && !JOBS[M(s).career.id].appointed && M(s).career.level < JOBS[M(s).career.id].ladder.length - 1,
  run: (s) => {
    if (bump(s, 'promo') > 1) return { text: 'You already asked this year.', nolog: true };
    const c = M(s).career;
    const odds = clamp((c.perf - 50) / 60 + c.levelYears * 0.06, 0.03, 0.85);
    if (chance(odds)) { promote(s, 'You made your case and your boss agreed.'); return; }
    c.perf = clamp100(c.perf - 5);
    add(s, { happy: -3 });
    return 'Your boss said you are "not quite ready" for that role yet.';
  },
});
defAction({
  id: 'retire', cat: 'job', label: 'Retire', emoji: '🏖️', desc: 'Leave work behind for good.',
  when: (s) => hasCareer(s) && A(s) >= 50,
  sub: (s) => (pensionFor(s, M(s).career) ? 'Pension: ' + fmtMoney(pensionFor(s, M(s).career)) + '/yr' : ''),
  run: (s) => retire(s),
});
defAction({
  id: 'quit_job', cat: 'job', label: 'Quit job', emoji: '🚪', desc: 'Walk out.',
  when: hasCareer,
  run: (s) => {
    popup(s, {
      emoji: '🚪', title: 'Quit your job?', text: `Are you sure you want to quit your job as a ${careerTitle(s)}?`, handler: 'quitJob',
      choices: [{ label: 'Quit', value: 'quit', tone: 'bad' }, { label: 'Quit dramatically', value: 'drama', tone: 'bad' }, { label: 'Stay', value: null }],
    });
  },
});
onChoice('quitJob', (s, ctx, v) => {
  if (!v) return;
  const title = careerTitle(s);
  leaveJob(s, 'quit');
  if (v === 'drama') {
    add(s, { happy: randInt(4, 9), karma: -2 });
    return vary(`You {flipped your desk|gave a fiery speech in the break room|quit by singing it over the intercom} and left your job as a ${title}.`);
  }
  add(s, { happy: 2 });
  return `You quit your job as a ${title}.`;
});

/* ---- part-time work ------------------------------------------------ */
defAction({
  id: 'pt_jobs', cat: 'jobs', label: 'Part-time jobs', emoji: '🧾', desc: 'Earn money around school.',
  when: (s) => free(s) && A(s) >= 14 && !M(s).career,
  sub: (s) => (M(s).ptJob ? 'Current: ' + PT_JOBS[M(s).ptJob.id].name : ''),
  run: (s) => {
    const choices = Object.keys(PT_JOBS).map((id) => {
      const j = PT_JOBS[id], miss = missingReqs(s, j.req);
      return { label: j.emoji + ' ' + j.name, value: id, sub: miss.length ? 'Needs: ' + miss.join(', ') : fmtMoney(price(s, j.pay)) + '/yr', disabled: miss.length > 0 };
    });
    if (M(s).ptJob) choices.unshift({ label: 'Quit my part-time job', value: 'quit', tone: 'bad' });
    choices.push({ label: 'Never mind', value: null });
    popup(s, { emoji: '🧾', title: 'Part-time jobs', text: 'Flexible hours, modest pay.', handler: 'ptJob', choices });
  },
});
onChoice('ptJob', (s, ctx, id) => {
  if (!id) return;
  if (id === 'quit') { const n = PT_JOBS[M(s).ptJob.id].name; M(s).ptJob = null; return `You quit your job as a ${n}.`; }
  const j = PT_JOBS[id];
  if (!chance(0.75 + (trait(s, 'charming') ? 0.1 : 0) - (hasFelony(s) ? 0.3 : 0))) return { text: `The manager decided not to hire you as a ${j.name}.`, tone: 'bad' };
  M(s).ptJob = { id, pay: price(s, j.pay) };
  return { text: `You were hired as a ${j.name}! ${j.emoji}`, tone: 'good' };
});

/* ---- gigs ---------------------------------------------------------- */
defAction({
  id: 'gigs', cat: 'jobs', label: 'Side gigs', emoji: '💰', desc: 'Quick cash. A few per year.',
  when: (s) => free(s) && A(s) >= 5,
  sub: (s) => `${Math.max(0, 4 - count(s, 'gig'))} left this year`,
  run: (s) => {
    const a = A(s);
    const choices = Object.keys(GIGS).filter((id) => a >= GIGS[id].ages[0] && a <= GIGS[id].ages[1]).map((id) => {
      const g = GIGS[id], miss = missingReqs(s, g.req);
      return { label: g.emoji + ' ' + g.name, value: id, sub: miss.length ? 'Needs: ' + miss.join(', ') : '', disabled: miss.length > 0 };
    });
    choices.push({ label: 'Never mind', value: null });
    popup(s, { emoji: '💰', title: 'Side gigs', text: 'Pick a gig.', handler: 'gig', choices });
  },
});
onChoice('gig', (s, ctx, id) => {
  if (!id) return;
  if (bump(s, 'gig') > 4) return { text: "You're all gigged out for the year.", nolog: true };
  const g = GIGS[id];
  let amt = randInt(g.pay[0], g.pay[1]);
  if (g.scale) amt = Math.round(amt * (0.3 + skill(s, g.scale) / 70));
  amt = price(s, amt);
  if (g.sk) addSkill(s, g.sk, randFloat(1, 3));
  if (chance(0.08)) { add(s, { happy: -2 }); return vary(`The ${g.name.toLowerCase()} gig {fell through|was a disaster|got rained out}. You earned nothing.`); }
  add(s, { money: amt, happy: 1 });
  return `${g.emoji} You earned ${fmtMoney(amt)}.`;
});

/* ---- special tracks ----------------------------------------------- */
function specialApply(s, id) {
  const j = JOBS[id];
  if (j.special === 'spy') return spyApply(s, id); // vetting, cover and training (60-spy.js)
  const k = j.skill;
  let odds;
  if (j.special === 'military') odds = 0.9;
  else if (j.looksDriven) odds = (P(s).stats.looks - 60) / 35;
  else if (j.special === 'sports') odds = (skill(s, k) - 35) / 45 + (skill(s, 'fitness') - 40) / 120;
  else odds = 0.25 + (skill(s, k) - 15) / 60 + P(s).stats.looks / 500;
  if (!chance(clamp(odds, 0.05, 0.95))) {
    add(s, { happy: -4 });
    const fail = { fame: "Nobody called you back. Keep building your skills.", sports: "You didn't make the team after tryouts.", military: 'The recruiter turned you down.', coach: 'No team called you back. Build your reputation first.' }[j.special];
    return { text: fail, title: j.name, emoji: j.emoji, tone: 'bad' };
  }
  if (M(s).career) leaveJob(s, 'switched');
  hire(s, id, 0);
  startSportsCareer(s, id); // picks a sport and team, or a weight class (41-sports.js)
  if (j.special === 'military') startMilitaryCareer(s, id); // branch and specialty (59-military.js)
  const verb = { fame: 'You landed your first gig', sports: 'You made the team', military: 'You enlisted', coach: 'You got the job' }[j.special];
  return { text: `${verb}! You're now a ${j.ladder[0][0]}.`, title: j.name, emoji: j.emoji, tone: 'good' };
}

function specialTick(s, c, j) {
  if (j.special === 'fame') {
    const target = clamp(c.level * 18 + 5, 0, 100);
    M(s).fame = clamp100(M(s).fame + (target - M(s).fame) * 0.2 + randInt(-2, 3));
    if (c.level >= 3) c.salary = Math.round(salaryFor(s, c.id, c.level) * randFloat(0.7, 1.5));
    if (chance(0.06)) {
      add(s, { happy: -6, fame: 4 });
      log(s, '📰 A tabloid ran an unflattering story about you.', 'bad');
    }
  } else if (j.special === 'sports') {
    addSkill(s, 'fitness', 1);
    const sk = skill(s, j.skill);
    if (chance(0.12)) { getSick(s, chance(0.5) ? 'broken_leg' : 'concussion'); c.perf = clamp100(c.perf - 20); log(s, '🤕 You were injured during the season.', 'bad'); }
    // Fighters climb through rankings and belts, drivers through results (41-sports.js).
    if (!['fighter', 'racer'].includes(c.id) && c.level < j.ladder.length - 1 && c.perf > 55 && chance(clamp((sk - 40 - c.level * 10) / 50, 0.03, 0.6))) promote(s, 'You had a breakout season.');
    M(s).fame = clamp100(M(s).fame + c.level * 2 + randInt(-2, 2));
    if (A(s) >= 33 + (trait(s, 'athletic') ? 3 : 0) && chance(0.35)) {
      const title = careerTitle(s);
      leaveJob(s, 'retired');
      announce(s, { emoji: '🏁', title: 'End of an era', text: `Your body told you it was time. You retired from pro sports as a ${title}.` });
    }
  } else if (j.special === 'military') {
    militaryYear(s, c, j); // ranks, terms, deployments and wars (59-military.js)
  } else if (j.special === 'spy') {
    spyYear(s, c, j); // training, missions and the agency's verdict (60-spy.js)
  } else if (j.special === 'politics') {
    c.term = (c.term || 0) + 1;
    if (c.term >= 4) {
      c.term = 0;
      popup(s, {
        emoji: '🗳️', title: 'Election year', text: `Your term as ${careerTitle(s)} is up. Approval rating: ${c.perf}%.`, handler: 'reelect',
        choices: [{ label: 'Run for re-election', value: 'run' }, { label: 'Step down', value: 'quit' }],
      });
    }
    if (chance(0.07 + (M(s).karma < 30 ? 0.08 : 0))) {
      c.perf = clamp100(c.perf - randInt(10, 25));
      add(s, { fame: 5, happy: -6 });
      log(s, '📰 ' + vary('A {scandal|leaked email|bad interview|hot-mic moment} sent your approval rating tumbling.'), 'bad');
    }
    M(s).fame = clamp100(M(s).fame + (c.level * 15 - M(s).fame) * 0.15);
  }
}

// Old saves may still hold this popup; new deployments use milDeploy (59-military.js).
onChoice('deploy', (s, ctx, v) => {
  const c = M(s).career;
  if (!c) return;
  if (v === 'desk') { c.perf = clamp100(c.perf - 8); return 'You spent the deployment pushing paperwork at base.'; }
  const r = rand();
  if (r < 0.015 + (trait(s, 'adventurous') ? 0.01 : 0)) { die(s, 'killed in action'); return 'You were killed in action.'; }
  if (r < 0.12) { getSick(s, chance(0.5) ? 'broken_leg' : 'concussion'); add(s, { health: -15, happy: -10 }); c.perf = clamp100(c.perf + 5); return 'You were wounded in combat, but you survived.'; }
  c.perf = clamp100(c.perf + 12);
  if (chance(0.3)) { add(s, { fame: 3, karma: 3, happy: 6 }); tally(s, 'medals'); return { text: 'You were awarded a medal for bravery! 🎖️', tone: 'good' }; }
  add(s, { happy: -3 });
  return 'You completed your deployment and came home safely.';
});

// Fame careers make named works (albums, books, films...): see sb_make in 40-fame.js.
defAction({
  id: 'tour', cat: 'job', label: 'Go on tour', emoji: '🚌', desc: 'Money and fame. Exhausting.',
  when: (s) => hasCareer(s) && ['musician', 'comedian'].includes(M(s).career.id) && M(s).career.level >= 1,
  run: (s) => {
    if (bump(s, 'tour') > 1) return { text: 'You can only tour once a year.', nolog: true };
    const c = M(s).career;
    const take = price(s, Math.round(c.salary * randFloat(0.2, 0.8)));
    add(s, { money: take, fame: randInt(2, 6), health: -randInt(2, 6), happy: randInt(-2, 6) });
    if (chance(0.15)) habit(s, chance(0.5) ? 'alcohol' : 'partydrugs', randInt(5, 12));
    return `Your tour grossed ${fmtMoney(take)}.`;
  },
});
defAction({
  id: 'train', cat: 'job', label: 'Train hard', emoji: '🏋️', desc: 'Sharpen your edge.',
  when: (s) => hasCareer(s) && JOBS[M(s).career.id].special === 'sports',
  run: (s) => {
    const n = bump(s, 'train');
    const c = M(s).career;
    addSkill(s, JOBS[c.id].skill, randFloat(2, 4) / n);
    addSkill(s, 'fitness', randFloat(1, 3) / n);
    c.perf = clamp100(c.perf + randInt(3, 8) / n);
    if (chance(0.05 * n)) { getSick(s, 'broken_arm'); return 'You overdid it and broke your arm in training.'; }
    return 'You trained like your career depended on it. It does.';
  },
});
// Fighters take fights through sp_fight (41-sports.js): rankings, camps and title belts.

/* ---- politics: elections ------------------------------------------- */
function startElection(s, toLevel) {
  const office = JOBS.politician.ladder[toLevel][0];
  const budgets = [0, 5000, 50000, 500000, 5000000].map((b) => price(s, b * Math.pow(3, toLevel)));
  popup(s, {
    emoji: '🗳️', title: 'Run for ' + office, text: 'How much will you spend on your campaign?', handler: 'election', ctx: { toLevel },
    choices: budgets.map((b, i) => ({ label: i === 0 ? 'Grassroots (free)' : fmtMoney(b), value: i, disabled: b > M(s).money })).concat([{ label: 'Never mind', value: -1 }]),
  });
}
onChoice('election', (s, ctx, bi) => {
  if (bi < 0) return;
  const toLevel = ctx.toLevel;
  const office = JOBS.politician.ladder[toLevel][0];
  const cost = [0, 5000, 50000, 500000, 5000000].map((b) => price(s, b * Math.pow(3, toLevel)))[bi];
  if (!pay(s, cost)) return cantAfford(cost);
  const c = M(s).career;
  let odds = 0.25 + skill(s, 'charisma') / 250 + (M(s).karma - 50) / 300 + M(s).fame / 400 + bi * 0.08 - toLevel * 0.06 + vetElectionEdge(s);
  if (c && c.id === 'politician') odds += (c.perf - 50) / 150;
  if (trait(s, 'charming')) odds += 0.06;
  addSkill(s, 'charisma', 2);
  if (!chance(clamp(odds, 0.04, 0.9))) {
    add(s, { happy: -8 });
    return { text: `You lost the race for ${office}.`, title: 'Election night', emoji: '🗳️', tone: 'bad' };
  }
  if (!c || c.id !== 'politician') {
    if (c) leaveJob(s, 'switched');
    hire(s, 'politician', toLevel);
    M(s).career.perf = 55;
  } else {
    c.level = toLevel;
    c.levelYears = 0;
    c.salary = salaryFor(s, 'politician', toLevel);
    c.term = 0;
    c.perf = clamp100(c.perf + 10);
  }
  add(s, { happy: 12, fame: 5 + toLevel * 6 });
  tally(s, 'elections');
  return { text: `You won! You are now ${aAn(office)}.`, title: 'Election night', emoji: '🎉', tone: 'good' };
});
onChoice('reelect', (s, ctx, v) => {
  const c = M(s).career;
  if (!c) return;
  if (v === 'quit') { const t = careerTitle(s); leaveJob(s, 'retired'); return `You stepped down as ${t}.`; }
  const odds = clamp(0.2 + c.perf / 110 + (M(s).karma - 50) / 300, 0.05, 0.92);
  if (chance(odds)) { c.perf = clamp100(c.perf + 5); add(s, { happy: 6 }); return { text: 'You won re-election!', tone: 'good' }; }
  const t = careerTitle(s);
  leaveJob(s, 'lost election');
  add(s, { happy: -10 });
  return { text: `You lost your re-election bid and are no longer ${t}.`, tone: 'bad' };
});
defAction({
  id: 'run_higher', cat: 'job', label: 'Run for higher office', emoji: '🗳️', desc: 'Aim for the next office up.',
  when: (s) => hasCareer(s) && M(s).career.id === 'politician' && M(s).career.levelYears >= 2 && M(s).career.level < JOBS.politician.ladder.length - 1,
  sub: (s) => JOBS.politician.ladder[M(s).career.level + 1][0],
  run: (s) => {
    if (bump(s, 'runhigher') > 1) return { text: 'One campaign a year is plenty.', nolog: true };
    startElection(s, M(s).career.level + 1);
  },
});
defAction({
  id: 'town_hall', cat: 'job', label: 'Hold a town hall', emoji: '🎤', desc: 'Win hearts. Or not.',
  when: (s) => hasCareer(s) && M(s).career.id === 'politician',
  run: (s) => {
    if (bump(s, 'townhall') > 2) return { text: 'Your staff is begging you to rest your voice.', nolog: true };
    const c = M(s).career;
    addSkill(s, 'charisma', 2);
    if (chance(0.4 + skill(s, 'charisma') / 200)) { c.perf = clamp100(c.perf + randInt(4, 9)); return 'The crowd loved you. Your approval rating went up.'; }
    c.perf = clamp100(c.perf - randInt(2, 6));
    return 'Someone asked a question you could not answer. It went viral.';
  },
});
defAction({
  id: 'bribe', cat: 'job', label: 'Accept a bribe', emoji: '💰', desc: 'Easy money. Huge risk.',
  when: (s) => hasCareer(s) && ['politician', 'police', 'judge', 'lawyer'].includes(M(s).career.id),
  run: (s) => {
    if (bump(s, 'bribe') > 1) return { text: 'Nobody else is offering this year.', nolog: true };
    const amt = price(s, randInt(5000, 80000) * (M(s).career.level + 1));
    add(s, { money: amt, karma: -12 });
    if (chance(0.22)) {
      fire(s, 'Investigators traced the money. You were fired in disgrace.');
      arrest(s, 'bribery');
      return;
    }
    return `You quietly pocketed ${fmtMoney(amt)}.`;
  },
});
