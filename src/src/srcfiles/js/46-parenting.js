/* =====================================================================
 * 46-parenting.js — raising your kids: picking their school (public,
 * private, boarding or homeschool), pushing them into child acting or
 * music, homework and discipline, arranging their marriages, and naming
 * and grooming an heir for the family business and the crime family.
 * Parenting events are at the bottom.
 *
 * On your child (an NPC in s.people):
 *   p.school = { kind, name, paid, free }   private, boarding or homeschool, ages 5-17
 *              (no p.school = public). paid: the year tuition was last paid.
 *              free: a scholarship.
 *   p.stage = { kind: 'acting'|'music', years, fame, earned, trust, pay, best, top, done }
 *              a child performer. trust is held for them until 18. pay is where
 *              the money goes: 'trust', 'half' or 'family' (null until you decide).
 *   p.groom, p.mobGroom   years spent learning the family business, or the family trade
 *   p.arranged            true while a marriage you arranged is new; 2 once it has settled
 *   p.flags.awayFromYou   at boarding school, so not raised at home (16-money.js)
 *   p.flags.schoolPicked  you've been asked where they go (once, at age 4, in parentingTick)
 * M(s).heir = pid         the child who takes over your companies and your crime family.
 * parentingTick runs right after familyTick. continueAs (26-death.js) calls
 * passBusiness, passMob and childLegacy when the next generation takes over.
 * ===================================================================== */

const KID_SCHOOLS = {
  public: { name: 'Public school', emoji: '🏫', cost: 0, desc: 'Close to home, with the neighborhood kids' },
  private: { name: 'Private school', emoji: '🎓', cost: 16000, desc: 'Small classes, big expectations' },
  boarding: { name: 'Boarding school', emoji: '🏛️', cost: 42000, desc: 'Top results, but they live away from home' },
  home: { name: 'Homeschool', emoji: '🏡', cost: 1500, desc: 'You teach them. Results depend on you' },
};
const KID_SCHOOL_IDS = Object.keys(KID_SCHOOLS);
const BOARDING_NAMES = ['St. Aldric’s School', 'Ravensworth College', 'Harrowgate School', 'Wexley Hall', 'Blackmoor Academy', 'Ellesmere College', 'Saint Benedict’s School', 'Thornbury Hall', 'Kingsmere School'];
// gigs: [fame needed, what they booked, US-baseline pay, fame it brings]
const STAGE_KINDS = {
  acting: {
    name: 'Child actor', emoji: '🎬', stat: 'looks', skill: 'acting', job: 'actor', place: 'trailer',
    gigs: [
      [0, 'a cereal commercial', 3000, 4], [0, 'a toy catalog shoot', 1500, 2], [0, 'a background part in a family movie', 2000, 3],
      [10, 'a guest spot on a sitcom', 9000, 6], [20, 'a recurring role on a kids’ TV show', 30000, 8], [35, 'a starring role on a hit family sitcom', 120000, 10],
      [50, 'a big part in a summer blockbuster', 400000, 12], [70, 'the lead in a film franchise', 1500000, 12],
    ],
  },
  music: {
    name: 'Child musician', emoji: '🎵', stat: 'smarts', skill: 'music', job: 'musician', place: 'dressing room',
    gigs: [
      [0, 'a recital at the town hall', 300, 2], [0, 'a regional talent show', 1000, 4], [0, 'a jingle for a local furniture store', 1500, 2],
      [10, 'a cover song that went viral', 5000, 7], [20, 'a run on a televised talent competition', 20000, 9], [35, 'a children’s album', 80000, 9],
      [50, 'opening for a pop star on tour', 300000, 11], [70, 'a platinum single', 1200000, 12],
    ],
  },
};
const AGENCY_KIDS = ['Little Stars Talent', 'Bright Eyes Agency', 'Tiny Titans Management', 'Sunny Side Talent'];

/* ---- helpers ------------------------------------------------------------- */
function pron(p, form) {
  const w = { he: ['he', 'she', 'they'], him: ['him', 'her', 'them'], his: ['his', 'her', 'their'] }[form.toLowerCase()];
  const out = genderWord(p, w[0], w[1], w[2]);
  return form[0] === form[0].toUpperCase() ? cap(out) : out;
}
function setPFlag(p, k, v) {
  if (v) (p.flags || (p.flags = {}))[k] = true;
  else if (p.flags) delete p.flags[k];
}
// Money that moves during the year shows up on this year's finance sheet (financeTick ran already).
function famSpend(s, label, amt) {
  amt = Math.round(amt);
  if (amt <= 0) return;
  M(s).money -= amt;
  const fin = M(s).lastFinance;
  if (fin && fin.year === s.year) fin.exp.push([label, amt]);
}
function famEarn(s, label, amt) {
  amt = Math.round(amt);
  if (amt <= 0) return;
  M(s).money += amt;
  const fin = M(s).lastFinance;
  if (fin && fin.year === s.year) fin.inc.push([label, amt]);
}
const childWhere = (lo, hi, f) => (s) => someone(s, ['child'], (p) => ageOf(s, p) >= lo && ageOf(s, p) <= hi && (!f || f(s, p)));
const isChild = (s, pid) => relKind(s, pid) === 'child';

/* ---- schools --------------------------------------------------------------- */
function kidSchool(p) { return (p.school && p.school.kind) || 'public'; }
function kidSchoolName(kind) {
  if (kind === 'private') return pick(SCHOOL_ROOTS) + ' ' + pick(['Academy', 'Preparatory School', 'Country Day School', 'Day School']);
  if (kind === 'boarding') return pick(BOARDING_NAMES);
  return kind === 'home' ? 'Homeschool' : '';
}
function schoolLabel(p) {
  const k = kidSchool(p);
  if (k === 'public') return 'public school';
  return k === 'home' ? 'homeschool' : p.school.name;
}
function schoolCost(s, kind) { return price(s, KID_SCHOOLS[kind].cost); }
function schoolSub(s, kind) { const K = KID_SCHOOLS[kind]; return `${K.cost ? fmtMoney(schoolCost(s, kind)) + ' a year' : 'Free'} · ${K.desc}`; }
// Move a child to a new school. Tuition for this year is due now (nothing before age 5).
function setKidSchool(s, pid, kind) {
  const p = s.people[pid];
  if (!p || !KID_SCHOOLS[kind]) return;
  if (kind === kidSchool(p)) return { text: `${p.first} already goes to ${schoolLabel(p)}.`, nolog: true };
  const early = ageOf(s, p) < 5, cost = early ? 0 : schoolCost(s, kind);
  if (cost && !pay(s, cost)) return cantAfford(cost);
  const was = kidSchool(p);
  if (kind === 'public') delete p.school;
  else p.school = { kind, name: kidSchoolName(kind), paid: early ? null : s.year };
  setPFlag(p, 'awayFromYou', kind === 'boarding');
  setPFlag(p, 'schoolPicked', true);
  if (kind === 'boarding') tally(s, 'boarding');
  const n = p.first, when = early ? ' next year' : '';
  if (kind === 'boarding') { addRel(s, pid, -6); return `${n} is off to ${p.school.name}${when}. There were tears at the gate, then a wave.`; }
  if (kind === 'private') { addRel(s, pid, 2); return `${n} starts at ${p.school.name}${when}. The uniform has a blazer.`; }
  if (kind === 'home') { addRel(s, pid, 4); return `You'll teach ${n} at home${when}. The kitchen table is a classroom now.`; }
  return was === 'boarding' ? `${n} is home again, at the public school down the street.` : `${n} is going to the public school down the street${when}.`;
}
// Before school starts (age 4), every option is open; after that, the current school is marked.
function schoolPopup(s, pid) {
  const p = s.people[pid], young = ageOf(s, p) < 5, cur = young && !p.school ? null : kidSchool(p);
  popup(s, {
    emoji: '🏫', title: `${p.first}'s school`, person: pid, handler: 'kidSchool', ctx: { pid },
    text: young ? `${p.first} starts school next year. Where should ${pron(p, 'he')} go?` : `${p.first} goes to ${schoolLabel(p)}. Do you want to make a change?`,
    choices: KID_SCHOOL_IDS.map((k) => ({ label: `${KID_SCHOOLS[k].emoji} ${KID_SCHOOLS[k].name}`, value: k, sub: k === cur ? 'Where they are now' : schoolSub(s, k), disabled: k === cur }))
      .concat(cur ? [{ label: 'Leave it as it is', value: null }] : []),
  });
}
onChoice('kidSchool', (s, ctx, kind) => {
  const p = s.people[ctx.pid];
  if (!kind || !p || !p.alive || !isChild(s, p.id)) return;
  if (kind === 'public' && !p.school) { setPFlag(p, 'schoolPicked', true); return `${p.first} will go to the public school down the street, with all the neighborhood kids.`; }
  return setKidSchool(s, p.id, kind);
});
defAction({
  id: 'kid_school', cat: 'person', group: 'parent', target: 'person', label: 'Choose their school', emoji: '🏫',
  when: (s, pid) => reachable(s, pid) && A(s) >= 18 && isChild(s, pid) && tAge(s, pid) >= 4 && tAge(s, pid) <= 16,
  sub: (s, pid) => cap(schoolLabel(tgt(s, pid))),
  run: (s, pid) => { schoolPopup(s, pid); },
});
// One school year for one child. Returns the fee charged, if any.
function schoolYear(s, p) {
  const a = ageOf(s, p), kind = kidSchool(p);
  let fee = 0;
  if (a >= 18) { if (p.school) graduateKid(s, p); return 0; }
  if (a < 5) return 0;
  if (kind === 'public') { p.stats.smarts = clamp100(p.stats.smarts + randInt(0, 1)); return 0; }
  if (kind === 'home' && inPrison(s)) {
    delete p.school;
    log(s, `🏫 You can't homeschool ${p.first} from prison. ${pron(p, 'He')} went back to public school.`, 'bad');
    return 0;
  }
  if (!p.school.free && p.school.paid !== s.year) {
    const cost = schoolCost(s, kind);
    if (M(s).money < cost) {
      log(s, `🏫 You couldn't pay for ${p.first}'s ${kind === 'home' ? 'homeschool books' : `tuition at ${p.school.name}`}, so ${pron(p, 'he')} moved to public school.`, 'bad');
      delete p.school;
      setPFlag(p, 'awayFromYou', false);
      addRel(s, p.id, -5);
      return 0;
    }
    famSpend(s, kind === 'home' ? `${p.first}'s homeschool books` : `${p.first}'s tuition`, cost);
    p.school.paid = s.year;
    fee = cost;
  }
  const gain = kind === 'private' ? randInt(0, 2) : kind === 'boarding' ? randInt(1, 2) : clamp(Math.round((P(s).stats.smarts - 50) / 20) + randInt(-1, 1), -1, 3);
  p.stats.smarts = clamp100(p.stats.smarts + gain);
  if (kind === 'boarding') addRel(s, p.id, -randInt(1, 4));
  if (kind === 'home') { addRel(s, p.id, randInt(1, 3)); p.stats.happy = clamp100(p.stats.happy - randInt(0, 2)); }
  return fee;
}
// Private and boarding graduates go to university more often.
function graduateKid(s, p) {
  log(s, `🎓 ${p.first} graduated from ${p.school.kind === 'home' ? 'homeschool' : p.school.name}.`, 'good');
  if ((p.school.kind === 'private' || p.school.kind === 'boarding') && (EDU_RANK[p.edu || 'none'] || 0) < 3 && chance(0.5)) {
    p.edu = 'bachelor';
    p.major = p.major || pick(MAJOR_IDS);
    p.job = { student: true };
  }
  delete p.school;
  setPFlag(p, 'awayFromYou', false);
}

/* ---- child acting and music -------------------------------------------------- */
function stageName(p) { return STAGE_KINDS[p.stage.kind].name.replace('Child ', '').toLowerCase(); }
function startStage(s, p, kind, sure) {
  const S = STAGE_KINDS[kind];
  const odds = clamp(0.35 + (p.stats[S.stat] - 50) / 100 + (hasTrait(p, 'creative') ? 0.15 : 0) + (hasTrait(p, 'charming') ? 0.1 : 0), 0.15, 0.85);
  if (!sure && !chance(odds)) {
    addRel(s, p.id, -2);
    return { text: kind === 'acting' ? `${p.first} froze at the audition. No agency signed ${pron(p, 'him')}. Maybe next year.` : `${p.first} played the recital piece twice as fast as written. No teacher would take ${pron(p, 'him')} on yet.`, tone: 'bad' };
  }
  p.stage = { kind, years: 0, fame: 0, earned: 0, trust: 0, pay: null, best: '', top: -1, done: false };
  tally(s, 'stageKids');
  addRel(s, p.id, hasTrait(p, 'anxious') || hasTrait(p, 'loner') ? -5 : 4);
  const agency = pick(AGENCY_KIDS);
  return { text: kind === 'acting' ? `${agency} signed ${p.first}! Headshots are done and the auditions start next month.` : `${p.first} has a music teacher, a manager from ${agency} and a first gig lined up.`, tone: 'good', person: p.id };
}
defAction({
  id: 'kid_stage', cat: 'person', group: 'parent', target: 'person', label: 'Push them into show business', emoji: '🎭',
  when: (s, pid) => reachable(s, pid) && A(s) >= 18 && isChild(s, pid) && tAge(s, pid) >= 3 && tAge(s, pid) <= 14 && !tgt(s, pid).stage && !count(s, 'stage_' + pid),
  sub: (s) => `Headshots and lessons: ${fmtMoney(price(s, 800))}`,
  run: (s, pid) => {
    const p = tgt(s, pid);
    popup(s, {
      emoji: '🎭', title: 'Show business', person: pid, handler: 'kidStage', ctx: { pid },
      text: `What kind of star will ${p.first} be?`,
      choices: [{ label: '🎬 Child acting', value: 'acting', sub: 'Commercials, TV and film. Looks help.' }, { label: '🎵 Music', value: 'music', sub: 'Recitals, talent shows and records. Smarts help.' }, { label: 'Never mind', value: null }],
    });
  },
});
onChoice('kidStage', (s, ctx, kind) => {
  const p = s.people[ctx.pid];
  if (!kind || !p || !p.alive || p.stage) return;
  const cost = price(s, 800);
  if (!pay(s, cost)) return cantAfford(cost);
  bump(s, 'stage_' + p.id);
  return startStage(s, p, kind);
});
function stageYear(s, p) {
  const st = p.stage, S = STAGE_KINDS[st.kind], a = ageOf(s, p);
  if (a >= 18 && st.trust) {
    p.money += st.trust;
    log(s, `💼 ${p.first}'s trust fund of ${fmtMoney(st.trust)} from ${pron(p, 'his')} ${stageName(p)} years was released to ${pron(p, 'him')}.`);
    st.trust = 0;
  }
  if (st.done) return;
  if (a >= 18) return endStage(s, p);
  st.years++;
  const talent = p.stats[S.stat] * 0.5 + st.years * 3 + (hasTrait(p, 'creative') ? 10 : 0) + (hasTrait(p, 'charming') ? 6 : 0);
  if (chance(clamp(0.3 + talent / 150, 0.3, 0.9))) {
    const pool = S.gigs.map((g, i) => [g, i]).filter(([g]) => g[0] <= st.fame).slice(-3);
    const [g, i] = pick(pool);
    const amt = price(s, g[2] * randFloat(0.8, 1.3));
    st.fame = clamp100(st.fame + g[3] + randInt(0, 3));
    st.earned += amt;
    if (i > st.top) { st.top = i; st.best = g[1]; }
    tally(s, 'kidGigs');
    if (st.fame >= 50 && !st.star) { st.star = true; tally(s, 'childStar'); }
    log(s, `${S.emoji} ${p.first} booked ${g[1]} and earned ${fmtMoney(amt)}.`, 'good');
    if (!st.pay) {
      st.trust += amt;
      popup(s, {
        emoji: '💵', title: `${p.first}'s first paycheck`, person: p.id, handler: 'stagePay', ctx: { pid: p.id, amt },
        text: `${p.first} earned ${fmtMoney(amt)} from ${g[1]}. Where should ${pron(p, 'his')} earnings go, now and from here on?`,
        choices: [{ label: '🏦 All of it into a trust until they turn 18', value: 'trust' }, { label: 'Half in trust, half for the family', value: 'half' }, { label: 'The family budget. Kids are expensive.', value: 'family', tone: 'bad' }],
      });
    } else {
      const fam = st.pay === 'family' ? amt : st.pay === 'half' ? Math.round(amt / 2) : 0;
      st.trust += amt - fam;
      famEarn(s, `${p.first}'s ${stageName(p)} work`, fam);
    }
  } else log(s, `${S.emoji} ${p.first} went to ${randInt(3, 12)} auditions this year and booked nothing.`);
  // Fame wears on a kid. The ones who don't love it ask to stop.
  p.stats.happy = clamp100(p.stats.happy - randInt(0, 2) + (relOf(s, p.id).rel > 60 ? 1 : 0));
  if (a >= 7 && chance(clamp(0.04 + st.years * 0.015 + (st.pushed || 0) * 0.05 + (p.stats.happy < 40 ? 0.1 : 0), 0, 0.4))) {
    popup(s, {
      emoji: '😞', title: `${p.first} wants to quit`, person: p.id, handler: 'stageQuit', ctx: { pid: p.id },
      text: `${p.first} is tired of ${st.kind === 'acting' ? 'auditions' : 'rehearsals'} and just wants to be a normal kid.`,
      choices: [{ label: 'Let them quit', value: true }, { label: 'Make them keep going', value: false, tone: 'bad' }],
    });
  }
}
onChoice('stagePay', (s, ctx, v) => {
  const p = s.people[ctx.pid];
  if (!p || !p.stage) return;
  const st = p.stage;
  st.pay = v;
  if (v === 'trust') { addRel(s, p.id, 4); add(s, { karma: 2 }); return { text: `Every cent goes into a trust for ${p.first}. Future ${p.first} says thank you.`, quiet: true }; }
  const take = v === 'family' ? ctx.amt : Math.round(ctx.amt / 2);
  st.trust = Math.max(0, st.trust - take);
  famEarn(s, `${p.first}'s ${stageName(p)} work`, take);
  add(s, { karma: v === 'family' ? -4 : 0 });
  if (v === 'family') addRel(s, p.id, -4);
  return { text: v === 'family' ? `${p.first}'s earnings go into the family budget. Somebody has to pay for the headshots.` : `Half for ${p.first}'s future, half for the family.`, quiet: true };
});
onChoice('stageQuit', (s, ctx, yes) => {
  const p = s.people[ctx.pid];
  if (!p || !p.stage || p.stage.done) return;
  if (yes) { endStage(s, p, true); addRel(s, p.id, 6); p.stats.happy = clamp100(p.stats.happy + 8); return { text: `${p.first} retired from show business at ${ageOf(s, p)}. ${pron(p, 'He')} spent the first free Saturday riding a bike in circles.`, tone: 'good' }; }
  p.stage.pushed = (p.stage.pushed || 0) + 1;
  addRel(s, p.id, -12);
  p.stats.happy = clamp100(p.stats.happy - 10);
  add(s, { karma: -2 });
  return { text: `${p.first} is going back to work. ${pron(p, 'He')} didn't speak to you for the whole car ride.`, tone: 'bad' };
});
// The stage years end: they quit, or they grew up. The famous ones may go pro.
function endStage(s, p, quit) {
  const st = p.stage, S = STAGE_KINDS[st.kind];
  st.done = true;
  if (quit) return;
  if (st.fame >= 30 && chance(0.35 + st.fame / 200)) {
    p.job = { id: S.job, level: st.fame >= 70 ? 3 : st.fame >= 50 ? 2 : 1 };
    log(s, `${S.emoji} ${p.first} turned 18 and went pro as ${aAn(npcJobTitle(p))}.`, 'good');
  } else if (st.fame >= 20) log(s, `${S.emoji} ${p.first} grew up and left show business. People still recognize ${pron(p, 'him')} from ${st.best}.`);
}

/* ---- homework and discipline ------------------------------------------------ */
defAction({
  id: 'kid_homework', cat: 'person', group: 'parent', target: 'person', label: 'Help with homework', emoji: '🧮',
  when: (s, pid) => reachable(s, pid) && A(s) >= 16 && isChild(s, pid) && tAge(s, pid) >= 6 && tAge(s, pid) <= 17 && kidSchool(tgt(s, pid)) !== 'boarding',
  run: (s, pid) => {
    const p = tgt(s, pid), n = bump(s, 'hw_' + pid);
    const topic = pick(['long division', 'photosynthesis', 'the French Revolution', 'fractions', 'a book report', 'the water cycle', 'algebra', 'a volcano model']);
    if (n > 2) { addRel(s, pid, -2); return `${p.first} says ${pron(p, 'he')} can do it alone, thanks.`; }
    if (P(s).stats.smarts + randInt(-25, 20) < 35) { addRel(s, pid, 2); return `You confidently explained ${topic} to ${p.first}. You were wrong. The teacher sent a note home.`; }
    p.stats.smarts = clamp100(p.stats.smarts + randInt(1, 3));
    relGain(s, pid, randInt(2, 6));
    return `You helped ${p.first} with ${topic}. It finally clicked.`;
  },
});
defAction({
  id: 'kid_discipline', cat: 'person', group: 'parent', target: 'person', label: 'Discipline them', emoji: '📏',
  when: (s, pid) => reachable(s, pid) && A(s) >= 16 && isChild(s, pid) && tAge(s, pid) >= 3 && tAge(s, pid) <= 17,
  run: (s, pid) => {
    const p = tgt(s, pid), teen = tAge(s, pid) >= 12;
    popup(s, {
      emoji: '📏', title: `Discipline ${p.first}`, person: pid, handler: 'kidDiscipline', ctx: { pid },
      text: `${p.first} ${pick(teen ? ['broke curfew again', 'talked back at dinner', 'skipped a class', 'dented the car door'] : ['drew on the wall', 'bit a cousin', 'flushed your keys', 'refused to go to bed'])}. How do you handle it?`,
      choices: [{ label: '🗣️ Sit down and talk it through', value: 'talk' }, { label: teen ? '🔒 Ground them' : '⏱️ Time-out', value: 'ground' }, { label: teen ? '📵 Take their phone' : '🧸 Take away a toy', value: 'phone' }, { label: '🧹 Extra chores', value: 'chores' }, { label: '📢 Yell', value: 'yell', tone: 'bad' }],
    });
  },
});
onChoice('kidDiscipline', (s, ctx, v) => {
  const p = s.people[ctx.pid];
  if (!p || !p.alive || !relOf(s, p.id)) return;
  const n = p.first, rel = relOf(s, p.id).rel;
  if (v === 'talk') {
    if (rel + randInt(-20, 20) >= 50) { addRel(s, p.id, 5); return `${n} said sorry, and meant it. You hugged it out.`; }
    addRel(s, p.id, -1);
    return `${n} stared at the wall for the whole talk.`;
  }
  if (v === 'ground') { addRel(s, p.id, -4); p.stats.smarts = clamp100(p.stats.smarts + 1); return `${n} spent the week in ${pron(p, 'his')} room. It has never been this clean.`; }
  if (v === 'phone') { addRel(s, p.id, -6); p.stats.smarts = clamp100(p.stats.smarts + randInt(0, 2)); return `Without ${ageOf(s, p) >= 12 ? 'a phone' : 'the toy'}, ${n} discovered books. Briefly.`; }
  if (v === 'chores') { addRel(s, p.id, -3); add(s, { happy: 1 }); return `${n} cleaned the garage. You found things you lost in ${s.year - randInt(3, 9)}.`; }
  addRel(s, p.id, -10);
  p.stats.happy = clamp100(p.stats.happy - 5);
  add(s, { happy: -2, karma: -1 });
  return { text: `You yelled. ${n} yelled back. Nobody won.`, tone: 'bad' };
});

/* ---- arranged marriages ------------------------------------------------------ */
function matchGender(p) {
  const other = p.gender === 'm' ? 'f' : p.gender === 'f' ? 'm' : pick(['m', 'f']);
  if (p.orient === 'gay') return p.gender === 'm' || p.gender === 'f' ? p.gender : pick(['m', 'f']);
  if (p.orient === 'bi') return chance(0.5) ? other : p.gender === 'm' || p.gender === 'f' ? p.gender : other;
  return other;
}
// Three matches, each with a selling point: a wealthy family, a great career, or looks.
function matchFor(s, p, i) {
  const age = i === 1 ? clamp(ageOf(s, p) + randInt(0, 5), 27, 99) : clamp(ageOf(s, p) + randInt(-4, 4), 18, 99);
  const c = makePerson(s, { gender: matchGender(p), age, country: p.country, city: chance(0.6) ? p.city : undefined, looks: i === 2 ? randInt(78, 98) : undefined, smarts: i === 1 ? randInt(72, 95) : undefined });
  if (i === 1) c.edu = pick(['md', 'jd', 'mba', 'phd', 'master']);
  assignNpcLife(s, c);
  if (i === 0) c.money = price(s, randInt(3, 30) * 100000);
  return c;
}
function matchLine(s, c, i) {
  const job = npcJobTitle(c);
  return `Age ${ageOf(s, c)}${job ? ' · ' + job : ''} · ${['From a wealthy family', DEGREE_NAMES[c.edu] || 'Well educated', 'Strikingly good-looking'][i]}`;
}
function arrangeFor(s, pid) {
  const p = s.people[pid], cost = price(s, 2500);
  if (count(s, 'arrange_' + pid)) return { text: 'The matchmaker is still working on the last list.', nolog: true };
  if (!pay(s, cost)) return cantAfford(cost);
  bump(s, 'arrange_' + pid);
  const cands = [0, 1, 2].map((i) => matchFor(s, p, i));
  popup(s, {
    emoji: '💑', title: `A match for ${p.first}`, person: pid, handler: 'arrange', ctx: { pid, ids: cands.map((c) => c.id) },
    text: `The matchmaker found three families who'd love to meet yours. Who should ${p.first} marry?`,
    choices: cands.map((c, i) => ({ label: `${c.first} ${c.last}`, value: c.id, sub: matchLine(s, c, i) })).concat([{ label: 'None of them', value: null }]),
  });
}
defAction({
  id: 'kid_arrange', cat: 'person', group: 'parent', target: 'person', label: 'Arrange a marriage', emoji: '💑',
  when: (s, pid) => reachable(s, pid) && A(s) >= 36 && isChild(s, pid) && tAge(s, pid) >= 18 && tAge(s, pid) <= 45 && !tgt(s, pid).partner && !count(s, 'arrange_' + pid),
  sub: (s) => `Matchmaker: ${fmtMoney(price(s, 2500))}`,
  run: (s, pid) => arrangeFor(s, pid),
});
onChoice('arrange', (s, ctx, cid) => {
  const p = s.people[ctx.pid], c = cid && s.people[cid];
  if (!p || !p.alive || !relOf(s, p.id)) return;
  if (!c) return `You sent the matchmaker away. ${p.first} looked relieved.`;
  if (p.partner) return `${p.first} is already seeing someone, it turns out.`;
  const odds = clamp(0.3 + relOf(s, p.id).rel / 220 + (c.stats.looks - 50) / 250 - (hasTrait(p, 'romantic') ? 0.15 : 0) + (hasTrait(p, 'kind') ? 0.05 : 0), 0.1, 0.9);
  if (!chance(odds)) {
    addRel(s, p.id, -12);
    return { text: `${p.first} refused to marry a stranger. "It's my life!" The door slammed.`, tone: 'bad' };
  }
  p.partner = c.id;
  c.partner = p.id;
  p.married = c.married = true;
  p.arranged = true;
  setRel(s, c.id, 'inlaw', randInt(45, 70));
  tally(s, 'arranged');
  addRel(s, p.id, randInt(-6, 6));
  add(s, { happy: 4 });
  let extra = '';
  if (c.money >= price(s, 300000)) { const gift = Math.round(c.money * 0.1); p.money += gift; extra = ` ${c.first}'s family paid for the wedding and gave the couple ${fmtMoney(gift)}.`; }
  return { text: `${p.first} met ${c.first} for tea, then for dinner, and six months later they were married.${extra}`, tone: 'good', person: c.id };
});
// A marriage ends between two people who aren't you.
function npcSplit(s, p) {
  const sp = s.people[p.partner];
  p.partner = null;
  p.married = false;
  delete p.arranged;
  if (!sp) return;
  sp.partner = null;
  sp.married = false;
  if (relKind(s, sp.id) === 'inlaw') dropRel(s, sp.id);
}

/* ---- heirs --------------------------------------------------------------------- */
function namedHeir(s) {
  const id = M(s).heir, p = id && s.people[id];
  return p && p.alive && isChild(s, id) && !flag(s, 'disowned_' + id) ? p : null;
}
// What the heir would take over today.
function heirDuty(s) {
  const out = companies(s).filter((c) => !c.closed).map((c) => c.name);
  const f = M(s).uw && uw(s).rank === 4 && myFamily(s);
  if (f) out.push(f.name);
  return out;
}
defAction({
  id: 'name_heir', cat: 'legal', label: 'Name your heir', emoji: '🗝️', desc: 'Who takes over the family business and the crime family.',
  when: (s) => !s.dead && A(s) >= 18 && heirOptions(s).length > 0,
  sub: (s) => { const h = namedHeir(s); return h ? `Your heir: ${h.first}` : 'Nobody named yet'; },
  run: (s) => {
    const cur = namedHeir(s), duty = heirDuty(s);
    popup(s, {
      emoji: '🗝️', title: 'Your heir', handler: 'nameHeir',
      text: `When you die, your heir takes over ${duty.length ? listJoin(duty) : 'any company or crime family you leave behind'}, whichever child you go on to play. Your will still decides who gets the money.`,
      choices: heirOptions(s).slice(0, 6).map((h) => ({ label: `${h.first} ${h.last}`, value: h.id, sub: `${kinLabel('child', h)} · age ${ageOf(s, h)}${npcJobTitle(h) ? ' · ' + npcJobTitle(h) : ''}${cur && cur.id === h.id ? ' · your heir now' : ''}`, disabled: !!cur && cur.id === h.id }))
        .concat(cur ? [{ label: 'Nobody, for now', value: '' }] : [], [{ label: 'Never mind', value: null }]),
    });
  },
});
onChoice('nameHeir', (s, ctx, v) => {
  if (v === null || v === undefined) return;
  if (v === '') { M(s).heir = null; return { text: 'You have no named heir now.', quiet: true }; }
  const p = s.people[v];
  if (!p || !p.alive) return;
  M(s).heir = v;
  addRel(s, v, 10);
  const others = heirOptions(s).filter((h) => h.id !== v && ageOf(s, h) >= 12);
  for (const o of others) addRel(s, o.id, -4);
  tally(s, 'heirNamed');
  return { text: `You named ${p.first} your heir.${others.length ? ` ${others.length > 1 ? 'The other kids' : others[0].first} took the news quietly. Mostly.` : ''}`, tone: 'good' };
});
defAction({
  id: 'kid_groom_biz', cat: 'person', group: 'parent', target: 'person', label: 'Bring them into the business', emoji: '💼',
  when: (s, pid) => reachable(s, pid) && A(s) >= 18 && isChild(s, pid) && tAge(s, pid) >= 14 && companies(s).some((c) => !c.closed) && !count(s, 'groom_' + pid) && (tgt(s, pid).groom || 0) < 10,
  sub: (s, pid) => (tgt(s, pid).groom ? `${nOf(tgt(s, pid).groom, 'year')} learning the ropes` : 'Groom a successor'),
  run: (s, pid) => {
    bump(s, 'groom_' + pid);
    const p = tgt(s, pid), co = pick(companies(s).filter((c) => !c.closed));
    const keen = chance(clamp(0.55 + relOf(s, pid).rel / 300 + (hasTrait(p, 'ambitious') ? 0.2 : 0) - (hasTrait(p, 'lazy') ? 0.2 : 0), 0.1, 0.95));
    if (!keen) { addRel(s, pid, -3); return `${p.first} spent ${tAge(s, pid) < 18 ? 'the summer job' : 'the week'} at ${co.name} looking at ${pron(p, 'his')} phone.`; }
    p.groom = (p.groom || 0) + 1;
    relGain(s, pid, randInt(2, 6));
    return tAge(s, pid) < 18 ? `${p.first} worked a summer job at ${co.name} and asked smart questions about the numbers.` : `${p.first} sat in on meetings at ${co.name}. The staff already call ${pron(p, 'him')} "the heir."`;
  },
});
defAction({
  id: 'kid_groom_mob', cat: 'person', group: 'parent', target: 'person', label: 'Teach them the family trade', emoji: '🕴️',
  when: (s, pid) => reachable(s, pid) && isChild(s, pid) && tAge(s, pid) >= 16 && rankAtLeast(s, 3) && !uw(s).rat && !count(s, 'mobgroom_' + pid) && (tgt(s, pid).mobGroom || 0) < 10,
  sub: (s, pid) => (tgt(s, pid).mobGroom ? `${nOf(tgt(s, pid).mobGroom, 'year')} in the life` : 'Show them how the family works'),
  run: (s, pid) => {
    bump(s, 'mobgroom_' + pid);
    const p = tgt(s, pid);
    if (hasTrait(p, 'kind') && chance(0.5)) { addRel(s, pid, -8); return `${p.first} wants nothing to do with "the family business," and knows exactly what it is.`; }
    p.mobGroom = (p.mobGroom || 0) + 1;
    addHeat(s, 2);
    add(s, { karma: -3 });
    addRel(s, pid, 3);
    return `You took ${p.first} along ${pick(['to collect from a nervous restaurant owner', 'to a sit-down with the capos', 'to count the take at the social club', 'to settle a dispute over a parking lot'])}. ${pron(p, 'He')} watched and learned.`;
  },
});
function heirCheck(s) {
  const id = M(s).heir;
  if (!id || namedHeir(s)) return;
  const p = s.people[id];
  M(s).heir = null;
  if (p && !p.alive) log(s, `🗝️ ${p.first} was your heir. You can name a new one in Identity & Legal.`, 'bad');
}

/* ---- passing it on (called from continueAs in 26-death.js) ------------------------- */
// A company leaves your family's books and carries on as a rival on the market (37-market.js).
function companyToFirm(s, co) {
  const mk = ensureMarket(s), last = co.last || {};
  const rev = Math.max(1, Math.round(last.revenue || co.lastRev || locRevenue(s, co.ind)));
  const f = {
    id: 'f' + ++mk.seq, name: co.name, ind: co.ind, rev, founded: co.founded,
    margin: Math.round(clamp(last.revenue ? last.profit / last.revenue : 0.05, -0.08, 0.3) * 1000) / 1000,
    rep: Math.round(clamp100(co.rep ?? 50)), q: Math.round(clamp100(Math.max(40, ...(co.products || []).map((x) => x.q)))),
    trend: 0, val: 0, ticker: '', sh: 0, price: 0, chg: 0, beta: 1, div: 0,
  };
  f.val = Math.round(firmFair(f));
  if (co.public && co.ticker && co.shares > 0) {
    f.ticker = co.ticker;
    f.sh = co.shares;
    f.price = Math.max(0.05, Math.round(co.price * 100) / 100);
    f.val = Math.round(f.price * f.sh);
  }
  mk.firms[f.id] = f;
  return f;
}
// The named heir isn't the child you go on as: the companies go to them.
function passBusiness(s, cos, p, oldName) {
  for (const co of cos) companyToFirm(s, co);
  if (ageOf(s, p) >= 18) { p.job = { id: 'executive', level: JOBS.executive.ladder.length - 1 }; p.retired = false; }
  tally(s, 'heirBusiness');
  log(s, `🏢 As ${oldName} wished, your ${kinTitle(s, p.id).toLowerCase()} ${p.first} took over ${listJoin(cos.map((c) => c.name))}${ageOf(s, p) < 18 ? ', with a trustee in charge until ' + pron(p, 'he') + ' grows up' : ''}.`);
}
// A crime family whose boss died: their named heir may take a seat at the head of the table.
function passMob(s, oldM, heir, named, old) {
  const u = oldM.uw, f = u && u.fam && underworldOf(s).families[u.fam];
  if (!f || u.rank < 4) return;
  if (named && named.id === heir.id && ageOf(s, heir) >= 18) {
    popup(s, {
      emoji: '🕴️', title: 'The family is waiting', handler: 'mobInherit',
      ctx: { fam: f.id, crew: u.crew, turf: u.turf, respect: u.respect, heat: u.heat, rackets: u.rackets, enemy: u.enemy, groom: heir.mobGroom || 0 },
      text: `You were named heir, and the capos of ${f.name} want an answer: will you take your ${kinLabel('parent', old).toLowerCase()}'s seat at the head of the table?`,
      choices: [{ label: '👔 Take over the family', value: true, tone: 'bad' }, { label: 'Walk away from that life', value: false }],
    });
    return;
  }
  log(s, mobMovesOn(s, f, u.crew, u.turf, named && ageOf(s, named) >= 18 ? named : null));
}
// The family carries on without you, under a new boss.
function mobMovesOn(s, f, crew, turf, boss) {
  if (f.mine) {
    f.mine = false;
    f.strength = clamp(Math.round(10 + crew * 4 + turf / 2), 20, 90);
    f.turf = clamp(Math.round(turf), 10, 70);
  }
  const last = f.name.replace(/^the | family$/g, '');
  f.boss = boss ? fullName(boss) : `${randomFirst(f.country, chance(0.75) ? 'm' : 'f')} ${last}`;
  return boss ? `🕴️ Your ${kinTitle(s, boss.id).toLowerCase()} ${boss.first} is the boss of ${f.name} now.` : `🕴️ ${f.boss}, the old underboss, runs ${f.name} now.`;
}
onChoice('mobInherit', (s, ctx, yes) => {
  const f = underworldOf(s).families[ctx.fam];
  if (!f) return;
  if (!yes) return mobMovesOn(s, f, ctx.crew, ctx.turf, null).replace('🕴️ ', '') + ' You walked away clean.';
  const u = uw(s);
  Object.assign(u, { fam: f.id, rank: 4, made: true, respect: clamp(Math.round(ctx.respect * 0.6 + ctx.groom * 5), 20, 100), heat: Math.round(ctx.heat / 2), crew: ctx.crew, turf: ctx.turf, rackets: ctx.rackets || [], enemy: ctx.enemy || null });
  f.boss = fullName(P(s));
  tally(s, 'becameBoss');
  tally(s, 'mobHeir');
  add(s, { karma: -5 });
  return { text: `You kissed the ring, and then they kissed yours. You run ${f.name} now.`, tone: 'good', emoji: '👔', title: 'The new boss' };
});
// What a child brings into their own life when you go on as them.
function childLegacy(s, p) {
  const m = M(s), age = ageOf(s, p), st = p.stage;
  if (st) {
    const S = STAGE_KINDS[st.kind];
    m.skills[S.skill] = Math.max(m.skills[S.skill] || 0, Math.min(80, 12 + st.years * 6));
    m.fame = clamp100(Math.max(m.fame, Math.round(st.fame * (st.done ? 0.5 : 0.85))));
    if (st.trust) { if (age < 18) m.trust += st.trust; else m.money += st.trust; }
    if (st.best && st.fame >= 15) log(s, `${S.emoji} People still recognize you from ${st.best}.`);
  }
  if (p.groom) m.skills.business = Math.max(m.skills.business || 0, Math.min(75, 10 + p.groom * 7));
  if (p.mobGroom) m.skills.streetwise = Math.max(m.skills.streetwise || 0, Math.min(75, 10 + p.mobGroom * 7));
  const cur = eduCur(s);
  if (p.school && age < 18 && cur && cur.kind === 'school' && p.school.kind !== 'home') {
    cur.name = p.school.name;
    cur.grades = clamp100(cur.grades + 6);
  }
  for (const k of ['school', 'stage', 'groom', 'mobGroom', 'arranged']) delete p[k];
  setPFlag(p, 'awayFromYou', false);
}

/* ---- the year ---------------------------------------------------------------------- */
function parentingTick(s) {
  if (s.dead) return;
  let fees = 0;
  const paid = [];
  for (const p of myChildren(s)) {
    if (ageOf(s, p) === 4 && !flagOf(p, 'schoolPicked') && A(s) >= 18 && free(s)) { setPFlag(p, 'schoolPicked', true); schoolPopup(s, p.id); }
    const fee = schoolYear(s, p);
    if (fee) { fees += fee; paid.push(p.school.kind === 'home' ? `${p.first} at home` : `${p.first} at ${p.school.name}`); }
    if (p.stage) stageYear(s, p);
  }
  if (fees) log(s, `🏫 School fees: ${fmtMoney(fees)} (${listJoin(paid)}).`);
  heirCheck(s);
}

/* ---- parenting events ---------------------------------------------------------------- */
const atSchool = (kind) => (s, p) => kidSchool(p) === kind;
// What the private-school crowd has, what you didn't buy, and what you bought instead.
const KEEPING_UP = [['a pony', 'a pony', 'riding lessons and a very nice helmet'], ['a ski chalet', 'a chalet', 'a long weekend on the slopes'], ['a boat', 'a boat', 'a summer of sailing lessons'], ['their own credit card', 'a credit card', 'a prepaid card with a very strict limit']];
const onStage = (s, p) => !!p.stage && !p.stage.done;
EV('par_boarding_homesick', {
  w: 2, ages: [22, 85], emoji: '✉️', ctx: childWhere(5, 17, atSchool('boarding')),
  text: (s, c) => `A letter came from ${nm(s, c.pid)} at ${s.people[c.pid].school.name}. It says "I miss home" three times.`,
  choices: [
    { label: 'Visit for the weekend', sub: (s) => fmtMoney(price(s, 600)), fx: (s, c) => { const cost = price(s, 600); if (!pay(s, cost)) return cantAfford(cost); addRel(s, c.pid, 10); add(s, { happy: 3 }); return `You took ${nm(s, c.pid)} out for pancakes and a long walk around the grounds.`; } },
    ['Bring them home', (s, c) => { const r = setKidSchool(s, c.pid, 'public'); addRel(s, c.pid, 12); return r; }],
    ['Send a care package', (s, c) => { addRel(s, c.pid, 4); return 'You sent cookies, warm socks and a photo from home.'; }],
    ['Tell them to toughen up', (s, c) => { addRel(s, c.pid, -8); const p = s.people[c.pid]; p.stats.happy = clamp100(p.stats.happy - 6); return `${nm(s, c.pid)}'s next letter was one line long.`; }],
  ],
});
EV('par_boarding_trouble', {
  w: 2, ages: [25, 85], emoji: '🏛️', ctx: childWhere(11, 17, atSchool('boarding')),
  text: (s, c) => `The headmaster of ${s.people[c.pid].school.name} called. ${nm(s, c.pid)} was caught ${pick(['running a snack-smuggling ring out of the dorms', 'sneaking into town after lights-out', 'taking bets on the chess team', 'hosting a midnight feast for the whole floor'])}.`,
  choices: [
    ['Back the school', (s, c) => { addRel(s, c.pid, -4); const p = s.people[c.pid]; p.stats.smarts = clamp100(p.stats.smarts + 1); return `${nm(s, c.pid)} got a month of detention in the library. ${pron(s.people[c.pid], 'He')} read everything.`; }],
    ['Laugh about it together', (s, c) => { addRel(s, c.pid, 6); add(s, { karma: -1 }); return 'You told the headmaster you would have a serious talk. You did not.'; }],
    { label: 'Make a donation so it goes away', sub: (s) => fmtMoney(price(s, 5000)), fx: (s, c) => { const cost = price(s, 5000); if (!pay(s, cost)) return cantAfford(cost); addRel(s, c.pid, 2); return 'The incident was forgotten. There is a new bench by the chapel with your name on it.'; } },
  ],
});
EV('par_private_keepup', {
  w: 2, ages: [25, 85], emoji: '🐴', ctx: (s) => { const c = childWhere(7, 16, atSchool('private'))(s); return c && Object.assign(c, { k: randInt(0, KEEPING_UP.length - 1) }); },
  text: (s, c) => `Everyone at ${s.people[c.pid].school.name} has ${KEEPING_UP[c.k][0]}, and ${nm(s, c.pid)} wants to know why your family doesn't.`,
  choices: [
    { label: 'Splurge to keep up', sub: (s) => fmtMoney(price(s, 3000)), fx: (s, c) => { const cost = price(s, 3000); if (!pay(s, cost)) return cantAfford(cost); addRel(s, c.pid, 8); return `You did not buy ${KEEPING_UP[c.k][1]}. You bought ${KEEPING_UP[c.k][2]}. It worked.`; } },
    ['Talk about what really matters', (s, c) => { addRel(s, c.pid, chance(0.5) ? 4 : -2); add(s, { karma: 2 }); return `${nm(s, c.pid)} rolled ${pron(s.people[c.pid], 'his')} eyes, but later gave half ${pron(s.people[c.pid], 'his')} allowance to a food drive.`; }],
    ['Move them to public school', (s, c) => { const r = setKidSchool(s, c.pid, 'public'); addRel(s, c.pid, -6); return r; }],
  ],
});
EV('par_homeschool_trip', {
  w: 2, ages: [22, 85], emoji: '🦕', ctx: childWhere(5, 17, atSchool('home')),
  text: (s, c) => `Homeschool field trip day: you took ${nm(s, c.pid)} to ${pick(['the natural history museum', 'a science center', 'a working farm', 'the planetarium', 'a glassblowing studio'])}.`,
  auto: (s, c) => { const p = s.people[c.pid]; p.stats.smarts = clamp100(p.stats.smarts + randInt(1, 3)); addRel(s, c.pid, 4); return pick(['There were 400 questions. You knew the answers to nine.', `${p.first} wants to be a paleontologist now. Again.`, 'You both learned something. Mostly you.']); },
});
EV('par_homeschool_lonely', {
  w: 2, ages: [22, 85], emoji: '🏡', ctx: childWhere(8, 16, atSchool('home')),
  text: (s, c) => `${nm(s, c.pid)} watches the neighborhood kids walk to school every morning, and asked if ${pron(s.people[c.pid], 'he')} could go too.`,
  choices: [
    ['Enroll them in public school', (s, c) => { const r = setKidSchool(s, c.pid, 'public'); addRel(s, c.pid, 6); return r; }],
    { label: 'Sign them up for clubs and sports', sub: (s) => fmtMoney(price(s, 800)), fx: (s, c) => { const cost = price(s, 800); if (!pay(s, cost)) return cantAfford(cost); const p = s.people[c.pid]; p.stats.happy = clamp100(p.stats.happy + 6); addRel(s, c.pid, 3); return `${nm(s, c.pid)} joined a soccer team and a robotics club, and made three friends in a week.`; } },
    ['Homeschool is better', (s, c) => { addRel(s, c.pid, -6); const p = s.people[c.pid]; p.stats.happy = clamp100(p.stats.happy - 4); return `${nm(s, c.pid)} went back to ${pron(s.people[c.pid], 'his')} worksheets without a word.`; }],
  ],
});
EV('par_scholarship', {
  ages: [25, 85], emoji: '🏅', ctx: (s) => { const c = childWhere(10, 15, (s, p) => kidSchool(p) === 'public' && p.stats.smarts >= 75)(s); return c && Object.assign(c, { name: kidSchoolName('private') }); },
  text: (s, c) => `${nm(s, c.pid)} aced an entrance exam and was offered a full scholarship to ${c.name}.`,
  choices: [
    ['Accept the scholarship', (s, c) => { const p = s.people[c.pid]; p.school = { kind: 'private', name: c.name, paid: s.year, free: true }; addRel(s, c.pid, 8); add(s, { happy: 5 }); return { text: `${p.first} starts at ${c.name} in the fall, for free.`, tone: 'good' }; }],
    ['Stay at public school', (s, c) => { addRel(s, c.pid, -3); return `${nm(s, c.pid)} framed the letter and stayed with ${pron(s.people[c.pid], 'his')} friends.`; }],
  ],
});
EV('par_talent_scout', {
  ages: [21, 80], emoji: '📸', ctx: childWhere(3, 12, (s, p) => !p.stage && p.stats.looks >= 55),
  text: (s, c) => `A talent scout spotted ${nm(s, c.pid)} at the mall and wants ${pron(s.people[c.pid], 'him')} for a ${pick(['cereal', 'juice box', 'toy store', 'theme park'])} commercial.`,
  choices: [
    ['Sign them up', (s, c) => startStage(s, s.people[c.pid], 'acting', true)],
    ['No thanks', () => 'You took the business card and threw it away in the parking lot.'],
  ],
});
EV('par_music_prodigy', {
  ages: [21, 80], emoji: '🎹', ctx: childWhere(4, 12, (s, p) => !p.stage && (hasTrait(p, 'creative') || p.stats.smarts >= 65)),
  text: (s, c) => `${nm(s, c.pid)} picked out a song on the piano by ear, then made up one of ${pron(s.people[c.pid], 'his')} own.`,
  choices: [
    ['Get them lessons and gigs', (s, c) => startStage(s, s.people[c.pid], 'music', true)],
    ['Let them play for fun', (s, c) => { addRel(s, c.pid, 3); const p = s.people[c.pid]; p.stats.happy = clamp100(p.stats.happy + 3); return `${nm(s, c.pid)} plays every night after dinner. It is the best part of your day.`; }],
  ],
});
EV('par_stage_tantrum', {
  w: 2, ages: [21, 85], emoji: '🎬', ctx: childWhere(4, 17, onStage),
  text: (s, c) => `${nm(s, c.pid)} refused to come out of ${pron(s.people[c.pid], 'his')} ${STAGE_KINDS[s.people[c.pid].stage.kind].place} until someone found the green jelly beans.`,
  choices: [
    ['Find the green jelly beans', (s, c) => { addRel(s, c.pid, 2); return 'You drove to four stores. The crew gave you a round of applause.'; }],
    ['Pull them off the job', (s, c) => { const st = s.people[c.pid].stage; st.fame = Math.max(0, st.fame - 3); addRel(s, c.pid, 5); return `You took ${nm(s, c.pid)} home. The producers were not happy. ${nm(s, c.pid)} was.`; }],
    ['The show must go on', (s, c) => { const st = s.people[c.pid].stage; st.fame = clamp100(st.fame + 2); addRel(s, c.pid, -6); return `${nm(s, c.pid)} came out and gave a great performance, then glared at you all the way home.`; }],
  ],
});
EV('par_stage_tabloid', {
  w: 2, ages: [28, 85], emoji: '📰', ctx: childWhere(13, 17, (s, p) => onStage(s, p) && p.stage.fame >= 25),
  text: (s, c) => `The tabloids photographed ${nm(s, c.pid)} ${pick(['leaving a nightclub at 2 a.m.', 'at a party for people twice that age', 'in a shouting match with a photographer'])}.`,
  choices: [
    { label: 'Send them to a wellness retreat', sub: (s) => fmtMoney(price(s, 8000)), fx: (s, c) => { const cost = price(s, 8000); if (!pay(s, cost)) return cantAfford(cost); const p = s.people[c.pid]; p.stats.health = clamp100(p.stats.health + 5); addRel(s, c.pid, 4); return `Two weeks of yoga and no phones. ${nm(s, c.pid)} came back calmer.`; } },
    ['Ground them for a year', (s, c) => { addRel(s, c.pid, -10); return `${nm(s, c.pid)} says ${pron(s.people[c.pid], 'he')} will never forgive you. Check back in 15 years.`; }],
    ['Any press is good press', (s, c) => { const st = s.people[c.pid].stage; st.fame = clamp100(st.fame + 5); addRel(s, c.pid, -4); add(s, { karma: -3 }); return `${nm(s, c.pid)}'s next project got twice the attention.`; }],
  ],
});
EV('par_stage_award', {
  ages: [21, 85], emoji: '🏆', w: 0.6, popup: true, ctx: childWhere(6, 17, (s, p) => onStage(s, p) && p.stage.fame >= 35),
  text: (s, c) => `${nm(s, c.pid)} was nominated for a Young Performer Award for ${s.people[c.pid].stage.best}.`,
  auto: (s, c) => {
    const st = s.people[c.pid].stage;
    if (chance(0.4)) { st.fame = clamp100(st.fame + 8); addRel(s, c.pid, 4); tally(s, 'kidAwards'); return { text: `${nm(s, c.pid)} won! The speech thanked you, the agent and "everyone who believed in me." You cried.`, tone: 'good' }; }
    st.fame = clamp100(st.fame + 3);
    return `${nm(s, c.pid)} lost to a ${randInt(7, 12)}-year-old ventriloquist. You were robbed.`;
  },
});
EV('par_heir_jealous', {
  ages: [35, 95], emoji: '🗝️', when: (s) => !!namedHeir(s), ctx: childWhere(14, 90, (s, p) => p.id !== M(s).heir),
  text: (s, c) => `${nm(s, c.pid)} is hurt that you named ${namedHeir(s).first} your heir. "What about me?"`,
  choices: [
    ['Stand by your choice', (s, c) => { addRel(s, c.pid, -8); return `${nm(s, c.pid)} said ${pron(s.people[c.pid], 'he')} understood. ${pron(s.people[c.pid], 'He')} did not.`; }],
    ['Make them your heir instead', (s, c) => { const was = namedHeir(s); M(s).heir = c.pid; addRel(s, c.pid, 12); if (was) addRel(s, was.id, -15); return `${nm(s, c.pid)} is your heir now. ${was ? `${was.first} found out at dinner.` : ''}`; }],
    ['Say you love them all the same', (s, c) => { addRel(s, c.pid, chance(0.5) ? 3 : -3); return 'It was true. It did not quite help.'; }],
  ],
});
EV('par_heir_pitch', {
  ages: [36, 95], emoji: '💡', when: (s) => companies(s).some((c) => !c.closed && c.ceo === 'you') && !!namedHeir(s) && ageOf(s, namedHeir(s)) >= 16,
  ctx: (s) => ({ pid: M(s).heir, co: pick(companies(s).filter((c) => !c.closed && c.ceo === 'you')).id, idea: pick(['a loyalty app', 'a bold new product line', 'opening in a new city', 'a viral marketing stunt']) }),
  text: (s, c) => `Your heir ${nm(s, c.pid)} has an idea for ${company(s, c.co).name}: ${c.idea}.`,
  choices: [
    ['Let them run with it', (s, c) => {
      const co = company(s, c.co), p = s.people[c.pid];
      if (!co || co.closed) return { text: 'The moment passed.', quiet: true, nolog: true };
      p.groom = Math.min(10, (p.groom || 0) + 1);
      if (chance(0.35 + p.groom * 0.05 + p.stats.smarts / 400)) { co.rep = clamp100(co.rep + 6); addRel(s, c.pid, 8); return { text: `It worked. Customers loved it, and ${p.first} was the talk of ${co.name}.`, tone: 'good' }; }
      const loss = bizCost(s, co, 20000);
      co.cash -= loss;
      addRel(s, c.pid, 2);
      return { text: `It flopped and cost ${co.name} ${fmtMoney(loss)}. ${p.first} learned more from it than from any success.`, tone: 'bad' };
    }],
    ['Not yet', (s, c) => { addRel(s, c.pid, -4); return `${nm(s, c.pid)} said "fine" in the way that means it isn't.`; }],
  ],
});
EV('par_mob_heir', {
  ages: [30, 95], emoji: '🕴️', when: (s) => free(s) && rankAtLeast(s, 3) && !uw(s).rat && !!namedHeir(s) && ageOf(s, namedHeir(s)) >= 18, ctx: (s) => ({ pid: M(s).heir }),
  text: (s, c) => `A capo asks whether ${nm(s, c.pid)} is really ready to run ${myFamily(s).name} someday.`,
  choices: [
    ['Give them a crew of their own', (s, c) => {
      const p = s.people[c.pid];
      p.mobGroom = Math.min(10, (p.mobGroom || 0) + 1);
      addHeat(s, 3);
      add(s, { karma: -3 });
      if (chance(0.25)) { p.stats.health = clamp100(p.stats.health - 15); return { text: `A rival crew tested ${p.first} in the first week and put ${pron(p, 'him')} in the hospital. ${pron(p, 'He')} came back harder.`, tone: 'bad' }; }
      addRespect(s, 2);
      return `${p.first}'s crew made their numbers every month. The capos stopped asking.`;
    }],
    ['Keep them out of it for now', (s, c) => { addRel(s, c.pid, 3); return 'The capo shrugged. "Your call, boss."'; }],
  ],
});
EV('par_arranged_love', {
  ages: [36, 95], emoji: '💑', popup: true, ctx: childWhere(18, 90, (s, p) => p.arranged === true && !!s.people[p.partner]),
  text: (s, c) => `${nm(s, c.pid)} says marrying ${nm(s, s.people[c.pid].partner)} was the best thing you ever did for ${pron(s.people[c.pid], 'him')}.`,
  auto: (s, c) => { s.people[c.pid].arranged = 2; addRel(s, c.pid, 10); add(s, { happy: 4 }); return 'They finish each other’s sentences now. You take full credit.'; },
});
EV('par_arranged_misery', {
  ages: [36, 95], emoji: '💔', w: 0.7, ctx: childWhere(18, 90, (s, p) => p.arranged === true && !!s.people[p.partner]),
  text: (s, c) => `${nm(s, c.pid)} admits the marriage you arranged to ${nm(s, s.people[c.pid].partner)} is miserable. The two of them barely speak.`,
  choices: [
    ['Tell them to stick it out', (s, c) => { const p = s.people[c.pid]; addRel(s, c.pid, -8); if (chance(0.4)) { npcSplit(s, p); return { text: `${p.first} divorced anyway, and stopped taking your calls for a while.`, tone: 'bad' }; } p.arranged = 2; return `${p.first} is sticking it out. You hope you were right.`; }],
    ['Tell them it’s okay to leave', (s, c) => { const p = s.people[c.pid]; npcSplit(s, p); addRel(s, c.pid, 8); add(s, { karma: 2 }); return `${p.first} filed for divorce, moved into a tiny apartment and already seems happier.`; }],
    { label: 'Pay for couples counseling', sub: (s) => fmtMoney(price(s, 3000)), fx: (s, c) => { const cost = price(s, 3000); if (!pay(s, cost)) return cantAfford(cost); const p = s.people[c.pid]; if (chance(0.6)) { p.arranged = 2; addRel(s, c.pid, 5); return { text: 'It took a year of Tuesdays, but they found their way to each other.', tone: 'good' }; } npcSplit(s, p); return `Counseling helped them part as friends. ${p.first} is single again.`; } },
  ],
});
EV('par_match_ask', {
  ages: [40, 90], emoji: '☕', ctx: childWhere(27, 45, (s, p) => !p.partner),
  text: (s, c) => `${nm(s, c.pid)} is ${ageOf(s, s.people[c.pid])}, single and tired of dating apps, and half-jokingly asked if you know anyone.`,
  choices: [
    { label: 'Call a matchmaker', sub: (s) => fmtMoney(price(s, 2500)), fx: (s, c) => arrangeFor(s, c.pid) },
    ['Love will find them', (s, c) => { addRel(s, c.pid, 3); return `You told ${nm(s, c.pid)} the right person shows up when you stop looking.`; }],
    ['Nag them about grandkids', (s, c) => { addRel(s, c.pid, -5); return `${nm(s, c.pid)} changed the subject to the weather three times.`; }],
  ],
});
