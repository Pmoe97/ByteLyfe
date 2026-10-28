/* =====================================================================
 * 59-military.js — military depth: wars that break out and end, branches
 * and specialties, deployments with defining moments, the draft, desertion
 * and courts-martial, conscientious objection, officer and special forces
 * paths, and veterans' benefits (disability pay, schooling, home loans,
 * cheaper care, pensions). Events are at the bottom of this file.
 *
 * s.wars = { cc: { 'us': { war, quiet } }, log: [{ name, cc, foe, start, end, result }] }
 *   One war at a time per country, shared by the whole family line.
 *   war = { id, cc, name, foe, foeAdj, theater, start, intensity (1-4), momentum,
 *           draft, dead }
 * M(s).mil (made when you first serve; it stays for life as your service record) =
 *   { branch, spec, enlisted, termEnd, terms, served (years), trained, tours: [{ y, war,
 *     place, post, result }], wounds: [{ y, sev }], medals: { valor, heart, ribbon },
 *     ptsd (0-100), elite, drafted, vet, discharge, dischargeYear, deserter: { year, hide,
 *     caught }, co, edLeft (years of schooling aid), rating (disability %), claim,
 *     loanUsed, squad: [pid], bonds }
 * p.mil = { since, vet, dead }   a relative who serves (familyWar)
 * militaryTick runs just before careerTick; militaryYear is the service year, called
 * from specialTick in 15-career.js. The money hooks are vetIncome (financeTick),
 * vetCareMult (medPrice), vetLoanTerms (financeTerms) and militaryPension (pensionFor).
 * ===================================================================== */

const BRANCHES = {
  army: { name: 'Army', emoji: '🥾', deploy: 1, danger: 1, blurb: 'The largest force. Boots on the ground.' },
  marines: { name: 'Marines', emoji: '🦅', deploy: 1.15, danger: 1.25, blurb: 'First in, last out. Hard training, hard missions.' },
  navy: { name: 'Navy', emoji: '⚓', deploy: 0.8, danger: 0.6, blurb: 'Ships, ports and long months at sea.' },
  airforce: { name: 'Air Force', emoji: '✈️', deploy: 0.6, danger: 0.5, blurb: 'Aircraft, bases and the best food in uniform.' },
};
const BRANCH_IDS = Object.keys(BRANCHES);
const SPECIALTIES = {
  combat: { name: 'Combat arms', emoji: '🛡️', skill: 'martial', deploy: 1.25, danger: 1.4, blurb: 'The front line. Medals and funerals.' },
  medic: { name: 'Medic', emoji: '⚕️', skill: 'charisma', deploy: 1, danger: 0.9, blurb: 'Patch people up where it is loudest.' },
  engineer: { name: 'Engineer', emoji: '🔧', skill: 'driving', deploy: 1, danger: 1.1, blurb: 'Bridges, bunkers and the careful kind of explosions.' },
  intel: { name: 'Intelligence', emoji: '🕵️', skill: 'streetwise', deploy: 0.7, danger: 0.7, blurb: 'Reports, maps and secrets.' },
  cyber: { name: 'Cyber and signals', emoji: '💻', skill: 'coding', deploy: 0.6, danger: 0.5, blurb: 'Keep the network up and the other side’s down.' },
  logistics: { name: 'Logistics', emoji: '📦', skill: 'business', deploy: 0.7, danger: 0.6, blurb: 'Armies run on supply trucks.' },
  pilot: { name: 'Aviator', emoji: '🚁', skill: 'driving', deploy: 1.1, danger: 1.1, blurb: 'Officers fly. Commissioned officers only.' },
};
const SPEC_IDS = Object.keys(SPECIALTIES);

const FOES = [['Valdoria', 'Valdorian'], ['Karthovia', 'Karthovian'], ['Zelmark', 'Zelmarkan'], ['Oryndal', 'Oryndali'], ['Tessaly', 'Tessalian'], ['Marovia', 'Marovian'],
  ['Draxia', 'Draxian'], ['Pelmora', 'Pelmoran'], ['Sundaria', 'Sundarian'], ['Brenholt', 'Brenholt'], ['Qasra', 'Qasran'], ['the Veldt Republic', 'Veldt']];
const THEATERS = [['the northern frontier', 'Frontier'], ['the river delta', 'Delta'], ['the mountain passes', 'Passes'], ['the island chain', 'Archipelago'],
  ['the desert interior', 'Desert'], ['the coastal strait', 'Straits'], ['the eastern highlands', 'Highlands'], ['the border marshes', 'Marshes']];
const WAR_NAMES = [(a, t) => `the ${a} War`, (a, t) => `the ${t} War`, (a, t) => `the ${a} Conflict`, (a, t) => `the War of the ${t}`];
const INTENSITY = ['', 'A limited conflict', 'A hard-fought war', 'A major war', 'A total war'];
const DISCHARGES = {
  honorable: { name: 'Honorable', emoji: '🎖️' }, general: { name: 'General (under honorable conditions)', emoji: '📄' },
  oth: { name: 'Other than honorable', emoji: '📉' }, medical: { name: 'Medical (honorable)', emoji: '🩹' },
  retired: { name: 'Retired with honor', emoji: '🏅' }, dishonorable: { name: 'Dishonorable', emoji: '⛔' },
};
// Courts-martial and the draft are crimes on the civilian ledger too (20-crime.js reads this table).
CRIMES.desertion = { name: 'Desertion', emoji: '🏃', minAge: 17, success: 0, loot: [0, 0], caught: 0, later: 0, sentence: [1, 4], conviction: 0.85, karma: -6, skill: 0, felony: true, verb: 'desertion' };
CRIMES.draft_evasion = { name: 'Draft evasion', emoji: '📝', minAge: 17, success: 0, loot: [0, 0], caught: 0, later: 0, sentence: [1, 3], conviction: 0.8, karma: -4, skill: 0, felony: true, verb: 'draft evasion' };
DISEASES.ptsd = { art: '', name: 'PTSD', emoji: '🌫️', ages: [17, 120], w: 0, sev: 3, happy: -8, dur: 0, fade: 0.04, cure: 0.35, mental: true };

/* ---- accessors ----------------------------------------------------------- */
const isMilJob = (id) => !!JOBS[id] && JOBS[id].special === 'military';
function inService(s) { const c = M(s).career; return !!c && isMilJob(c.id) && free(s); }
function mil(s) { return M(s).mil || null; }
// The record is made the first time anything needs it (a service started from God Mode has none).
function ensureMil(s) {
  const m = M(s);
  if (!m.mil) m.mil = { branch: 'army', spec: 'logistics', enlisted: s.year, termEnd: s.year + 4, terms: 1, served: 0, trained: true, tours: [], wounds: [], medals: { valor: 0, heart: 0, ribbon: 0 }, ptsd: 0, elite: false, drafted: false, vet: false, discharge: null, dischargeYear: 0, deserter: null, co: false, edLeft: 0, rating: 0, claim: null, loanUsed: false, squad: [], bonds: 0 };
  return m.mil;
}
const isVeteran = (s) => !!(mil(s) && mil(s).vet);
const isDeserter = (s) => !!(mil(s) && mil(s).deserter && !mil(s).deserter.caught);
function branchOf(s) { return BRANCHES[(mil(s) || {}).branch] || BRANCHES.army; }
function specOf(s) { return SPECIALTIES[(mil(s) || {}).spec] || SPECIALTIES.logistics; }
function warBook(s) { return s.wars || (s.wars = { cc: {}, log: [] }); }
function warSlot(s, cc) { const W = warBook(s); return W.cc[cc] || (W.cc[cc] = { war: null, quiet: randInt(0, 25) }); }
function activeWar(s, cc) { const st = (s.wars && s.wars.cc || {})[cc || P(s).country]; return st ? st.war : null; }
function warLine(w) { return `${cap(w.name)} against ${w.foe}`; }
function medalCount(s) { const m = mil(s); return m ? m.medals.valor + m.medals.heart : 0; }
// A veteran's discharge decides which benefits they keep.
const FULL_VET = ['honorable', 'retired', 'medical'];
function vetHas(s, what) {
  const m = mil(s);
  if (!m || !m.vet || !m.discharge || m.discharge === 'dishonorable') return false;
  if (what === 'edu') return FULL_VET.includes(m.discharge) && m.edLeft > 0;
  if (what === 'loan') return m.discharge !== 'oth' && !m.loanUsed;
  if (what === 'care') return m.discharge !== 'oth' || m.ptsd >= 30 || m.rating > 0;
  if (what === 'pay') return m.rating > 0 && m.claim && m.claim.approved;
  return false;
}
function milRankName(s) { const c = M(s).career; return c && isMilJob(c.id) ? careerTitle(s) : ''; }

/* ---- wars ---------------------------------------------------------------------- */
function makeWar(s, cc) {
  const [foe, foeAdj] = pick(FOES), [theater, noun] = pick(THEATERS);
  const intensity = weighted([1, 2, 3, 4], (i) => [0, 2, 4, 3, 1][i]);
  return { id: uid(s, 'w'), cc, name: pick(WAR_NAMES)(foeAdj, noun), foe, foeAdj, theater, start: s.year, intensity, momentum: 0, draft: false, dead: randInt(20, 120) * intensity };
}
function warYear(s) {
  if (historyWarYear(s)) return; // the real wars of 1900 to 2025 come from the history table (88-world.js)
  const cc = P(s).country, st = warSlot(s, cc), W = warBook(s);
  let w = st.war;
  if (!w) {
    st.quiet++;
    if (!chance(clamp(0.006 + st.quiet * 0.0006, 0.006, 0.02))) return;
    w = st.war = makeWar(s, cc);
    announce(s, { emoji: '🚨', title: 'War!', tone: 'bad', text: `${country(s).name} is at war. ${INTENSITY[w.intensity]} with ${w.foe} has broken out over ${w.theater}: ${w.name}.`, log: `🚨 ${warLine(w)} broke out.` });
    return;
  }
  const yrs = s.year - w.start;
  w.momentum += gauss(0, 1.1);
  w.dead += Math.round(randInt(40, 260) * w.intensity);
  if (!w.draft && w.intensity >= 3 && yrs >= 1 && chance(0.5)) {
    w.draft = true;
    announce(s, { emoji: '📜', title: 'The draft is back', tone: 'bad', text: `With ${w.name} dragging on, ${country(s).name} reintroduced conscription for adults up to age 30.`, log: `📜 The draft returned for ${w.name}.` });
  }
  if (!inService(s) && w.intensity >= 2 && chance(0.4)) add(s, { happy: -1 });
  if (yrs >= 1 && (Math.abs(w.momentum) >= 3 || chance(0.07 + yrs * 0.03) || yrs >= 10)) endWar(s, st, w);
}
function endWar(s, st, w) {
  const result = w.momentum >= 2 ? 'victory' : w.momentum <= -2 ? 'defeat' : 'ceasefire';
  w.result = result;
  const W = warBook(s);
  W.log.push({ name: w.name, cc: w.cc, foe: w.foe, foeAdj: w.foeAdj, start: w.start, end: s.year, result, intensity: w.intensity, dead: w.dead, hid: w.hid || null });
  st.war = null;
  st.quiet = 0;
  const text = w.endText || { victory: `${cap(w.name)} ended in victory after ${nOf(s.year - w.start, 'year')}. There were parades in the capital.`, defeat: `${cap(w.name)} ended in defeat after ${nOf(s.year - w.start, 'year')}. The country is in mourning.`, ceasefire: `${cap(w.name)} ended in a ceasefire after ${nOf(s.year - w.start, 'year')}. Nobody quite won.` }[result];
  announce(s, { emoji: result === 'defeat' ? '🏳️' : '🕊️', title: 'The war is over', tone: result === 'defeat' ? 'bad' : 'good', text, log: '🕊️ ' + text });
  add(s, { happy: result === 'defeat' ? -3 : 3 });
  const m = M(s);
  if (m.warBonds) {
    const back = Math.round(m.warBonds * (result === 'victory' ? 1.3 : result === 'defeat' ? 0.5 : 1));
    add(s, { money: back });
    log(s, `💵 Your war bonds paid ${fmtMoney(back)} (you put in ${fmtMoney(m.warBonds)}).`, back >= m.warBonds ? 'good' : 'bad');
    m.warBonds = 0;
  }
  for (const p of Object.values(s.people)) if (p.mil && !p.mil.vet && p.alive) p.mil.vet = true;
  const me = mil(s);
  if (me && me.drafted && inService(s)) me.termEnd = Math.min(me.termEnd, s.year);
}

/* ---- enlisting --------------------------------------------------------------------- */
// Called by specialApply (15-career.js) right after hire(). Defaults first, so a popup nobody answers still leaves a valid record.
function startMilitaryCareer(s, id, opts) {
  const o = opts || {};
  const rec = ensureMil(s), rejoin = rec.served > 0;
  rec.vet = false;
  rec.discharge = null;
  rec.deserter = null;
  rec.terms = rejoin ? rec.terms + 1 : 1;
  rec.trained = rejoin;
  rec.enlisted = rejoin ? rec.enlisted : s.year;
  rec.drafted = !!o.drafted;
  rec.termEnd = s.year + (o.drafted ? 2 : 4);
  tally(s, 'enlisted');
  if (o.drafted) {
    rec.branch = weighted(BRANCH_IDS, (b) => (b === 'army' ? 5 : b === 'marines' ? 2 : 1));
    rec.spec = weighted(['combat', 'medic', 'engineer', 'logistics'], (x) => (x === 'combat' ? 4 : 2));
    return;
  }
  if (id !== 'officer' && rec.spec === 'pilot') rec.spec = 'combat';
  popup(s, {
    emoji: '🎖️', title: 'Choose your branch', text: 'Where will you serve? It decides how often you deploy and how dangerous the work gets.', handler: 'milBranch', ctx: { id },
    choices: BRANCH_IDS.map((b) => ({ label: BRANCHES[b].emoji + ' ' + BRANCHES[b].name, value: b, sub: BRANCHES[b].blurb })),
  });
}
onChoice('milBranch', (s, ctx, b) => {
  const m = ensureMil(s);
  if (BRANCHES[b]) m.branch = b;
  const officer = ctx.id === 'officer';
  popup(s, {
    emoji: '🛡️', title: 'Choose your specialty', text: 'What will you train for?', handler: 'milSpec', ctx: { officer },
    choices: SPEC_IDS.filter((x) => x !== 'pilot' || officer).map((x) => ({ label: SPECIALTIES[x].emoji + ' ' + SPECIALTIES[x].name, value: x, sub: SPECIALTIES[x].blurb })),
  });
});
onChoice('milSpec', (s, ctx, sp) => {
  const m = ensureMil(s);
  if (SPECIALTIES[sp] && (sp !== 'pilot' || ctx.officer)) m.spec = sp;
  return { text: `You signed up with the ${BRANCHES[m.branch].name} as ${SPECIALTIES[m.spec].name.toLowerCase()}. Basic training starts this year.`, emoji: BRANCHES[m.branch].emoji };
});

function basicTraining(s, m) {
  m.trained = true;
  const sp = specOf(s);
  addSkill(s, 'fitness', randFloat(6, 11));
  addSkill(s, sp.skill, randFloat(4, 8));
  bodyNudge(s, { muscle: randFloat(2, 4), fat: -randFloat(1, 3) });
  add(s, { health: randInt(1, 4), happy: -2 });
  if (chance(0.06)) { getSick(s, 'broken_arm'); log(s, '🤕 You broke your arm on the obstacle course.', 'bad'); }
  log(s, `🥾 You survived basic training. The drill sergeant said you were "adequate", which is the highest honor.`);
}

/* ---- the service year ---------------------------------------------------------------- */
function militaryYear(s, c, j) {
  const m = ensureMil(s), war = activeWar(s);
  m.served++;
  if (!m.trained) { basicTraining(s, m); return; }
  addSkill(s, specOf(s).skill, randFloat(0.5, 1.5));
  // Rank: wars reward the ones who come back.
  let pr = 0.45 + (war ? 0.1 : 0) + (m.medals.valor ? 0.08 : 0);
  if (c.level >= 5) pr *= 0.4;
  if (c.level < j.ladder.length - 1 && c.levelYears >= 2 && c.perf >= 55 && chance(pr)) promote(s, 'You earned a new rank.');
  // Misconduct: a bad record costs stripes, and a worse one costs the uniform.
  if (c.perf < 25 && chance(0.3)) {
    if (c.level > 0 && chance(0.6)) { c.level--; c.salary = salaryFor(s, c.id, c.level); c.perf = clamp100(c.perf + 20); log(s, '📉 A hearing busted you down a rank for repeated misconduct.', 'bad'); }
    else if (c.perf < 15) { separate(s, 'general', 'Your commander recommended an administrative separation. You were discharged under honorable conditions.'); return; }
  }
  // Combat leaves marks.
  if (m.ptsd > 30) { add(s, { happy: -Math.round(m.ptsd / 20) }); if (m.ptsd > 50 && chance(0.25)) habit(s, 'alcohol', randInt(4, 10)); }
  if (m.ptsd >= 45 && !hasDisease(s, 'ptsd')) getSick(s, 'ptsd', { known: true });
  if (m.ptsd >= 75 && chance(0.25) && !flag(s, 'medBoard')) { flag(s, 'medBoard', s.year); popup(s, { emoji: '🩹', title: 'Medical board', text: 'The doctors have recommended you for a medical discharge. You can take it, or fight to stay in uniform.', handler: 'milMedBoard', choices: [{ label: 'Accept the medical discharge', value: 'go' }, { label: 'Fight to stay in', value: 'stay' }] }); return; }
  // The end of a term.
  if (s.year >= m.termEnd) { termEnd(s, m, c); return; }
  // Orders.
  if (m.served >= 1) {
    let odds = (war ? 0.55 : 0.12) * branchOf(s).deploy * specOf(s).deploy * (m.elite ? 1.3 : 1);
    if (war && war.intensity <= 1) odds *= 0.6;
    if (chance(clamp(odds, 0, 0.9))) deployOrders(s, war);
  }
}
function termEnd(s, m, c) {
  const war = activeWar(s);
  if (m.drafted && (!war || m.served >= 2)) { separate(s, 'honorable', 'Your draft term is up. You were discharged with thanks and a bus ticket.'); return; }
  if (!m.drafted && war && war.intensity >= 3 && !m.elite && chance(0.4)) {
    m.termEnd = s.year + 1;
    announce(s, { emoji: '🔒', title: 'Stop-loss', tone: 'bad', text: `Your term was up, but with ${war.name} on, the order came down to extend every contract by a year.` });
    add(s, { happy: -5 });
    return;
  }
  const bonus = price(s, 6000 + c.level * 2500);
  popup(s, {
    emoji: '📝', title: 'Your term is up', text: `You have served ${nOf(m.served, 'year')}. Will you stay?`, handler: 'milTerm',
    choices: [
      { label: 'Re-enlist', value: 'stay', sub: `${fmtMoney(bonus)} bonus · four more years` },
      { label: 'Leave the service', value: 'leave', sub: 'An honorable discharge, and veterans’ benefits' },
    ].concat(m.served >= 20 ? [{ label: 'Retire', value: 'retire', sub: 'A pension for life' }] : []),
  });
}
onChoice('milTerm', (s, ctx, v) => {
  const m = mil(s), c = M(s).career;
  if (!m || !c) return;
  if (v === 'retire') return militaryRetire(s);
  if (v === 'leave') return separate(s, 'honorable', 'You turned in your gear and walked out of the gate a civilian.');
  const bonus = price(s, 6000 + c.level * 2500);
  add(s, { money: bonus });
  m.termEnd = s.year + 4;
  m.terms++;
  return `You re-enlisted and took a ${fmtMoney(bonus)} bonus. Four more years.`;
});
onChoice('milMedBoard', (s, ctx, v) => {
  if (v === 'go') return separate(s, 'medical', 'The board signed the papers. You left with a medical discharge and a folder of documents.');
  const c = M(s).career;
  if (c) c.perf = clamp100(c.perf - 10);
  return 'You told the board you were fit to serve. They wrote it down with a look.';
});
// Ending service: separate() picks the discharge; leaveJob → milLeft finishes the record.
function separate(s, type, text) {
  const m = ensureMil(s);
  m.next = type;
  leaveJob(s, 'discharged');
  announce(s, { emoji: DISCHARGES[type].emoji, title: 'Discharged', tone: type === 'dishonorable' || type === 'oth' ? 'bad' : 'good', text: `${text} Discharge: ${DISCHARGES[type].name}.` });
}
// leaveJob (15-career.js) calls this for every job; only military careers matter.
function milLeft(s, c, reason) {
  if (!isMilJob(c.id) || reason === 'commissioned') return;
  const m = ensureMil(s);
  let type = m.next;
  m.next = null;
  if (reason === 'deserted') return;
  if (!type) type = { retired: 'retired', jailed: 'dishonorable', switched: 'general', quit: 'oth', fired: 'oth' }[reason] || 'honorable';
  m.discharge = type;
  m.dischargeYear = s.year;
  m.vet = m.served >= 1 || type === 'dishonorable';
  m.edLeft = FULL_VET.includes(type) && (m.served >= 2 || m.rating > 0) ? 4 : 0;
  m.deployed = false;
  if (m.vet && type !== 'dishonorable') tally(s, 'veteran');
}
function militaryRetire(s) {
  const c = M(s).career, m = mil(s);
  if (!c || !m) return;
  const pension = militaryPension(s, c);
  const title = careerTitle(s);
  m.next = 'retired';
  leaveJob(s, 'retired');
  M(s).retired = { pension, year: s.year };
  add(s, { happy: 10 });
  tally(s, 'milRetired');
  return { text: `You retired from the ${BRANCHES[m.branch].name} as a ${title} after ${nOf(m.served, 'year')}. Your pension pays ${fmtMoney(pension)} a year.`, emoji: '🏅', tone: 'good' };
}
// Half of final pay at twenty years, then a little more for every year after.
function militaryPension(s, c) {
  const m = mil(s);
  if (!m || m.served < 20) return 0;
  return Math.round(c.salary * Math.min(0.75, 0.5 + (m.served - 20) * 0.025));
}

/* ---- deployments ---------------------------------------------------------------------- */
function deployOrders(s, war) {
  const m = mil(s);
  const text = war ? `Your unit is shipping out to ${war.theater} for ${war.name}. ${INTENSITY[war.intensity]}.` : pick(['Your unit is being sent overseas for a six-month peacekeeping mission.', 'Your unit is deploying abroad for a joint training exercise.', 'Your unit is rotating to a distant base for the year.']);
  const choices = [{ label: 'Serve with honor', value: 'serve', sub: 'Go where you are told' }];
  if (war) choices.push({ label: 'Volunteer for the front line', value: 'front', sub: 'More danger, more honors' });
  choices.push({ label: 'Request a rear assignment', value: 'rear', sub: 'Safer, and your career slows down' });
  choices.push({ label: 'Go AWOL', value: 'awol', tone: 'bad', sub: 'Refuse the orders and run' });
  popup(s, { emoji: '🚢', title: 'Deployment orders', text, handler: 'milDeploy', ctx: { wid: war ? war.id : null }, choices });
}
onChoice('milDeploy', (s, ctx, post) => {
  const c = M(s).career, m = mil(s);
  if (!c || !m || !isMilJob(c.id)) return;
  const war = ctx.wid ? activeWar(s) : null;
  if (post === 'awol') { desertPopup(s); return; }
  return runTour(s, post, war && war.id === ctx.wid ? war : null);
});
const POSTURE = { serve: 1, front: 1.7, rear: 0.25 };
function runTour(s, post, war) {
  const m = mil(s), c = M(s).career;
  const I = war ? war.intensity : 0.4, danger = branchOf(s).danger * specOf(s).danger * (m.elite ? 1.5 : 1) * POSTURE[post];
  const place = war ? war.theater : pick(['a distant base', 'the allied training ground', 'a peacekeeping post', 'a naval port abroad']);
  const t = { y: s.year, war: war ? war.name : '', place, post, result: 'safe' };
  m.tours.push(t);
  tally(s, 'tours');
  if (war) tally(s, 'warTours');
  if (chance(Math.min(0.2, 0.0025 * Math.pow(I, 1.6) * danger + (trait(s, 'adventurous') && war ? 0.003 : 0)))) {
    t.result = 'killed';
    die(s, war ? 'killed in action' : 'a training accident');
    return war ? `You were killed in action in ${war.theater}.` : 'You were killed in a training accident overseas.';
  }
  const lines = [];
  const squadLoss = squadYear(s, m, I, danger);
  if (squadLoss) lines.push(squadLoss);
  if (chance(Math.min(0.5, 0.035 * Math.pow(I, 1.1) * danger))) {
    const sev = randInt(1, 3);
    m.wounds.push({ y: s.year, sev: sev * 10 });
    m.medals.heart++;
    tally(s, 'medals');
    tally(s, 'woundsInAction');
    getSick(s, sev >= 3 ? 'broken_leg' : chance(0.5) ? 'broken_leg' : 'concussion');
    add(s, { health: -(8 + sev * 5), happy: -8 });
    t.result = 'wounded';
    lines.push('You were wounded in action and awarded a Purple Heart.');
  }
  if (war && chance(Math.min(0.1, 0.004 * I * danger))) {
    t.result = 'captured';
    popup(s, { emoji: '⛓️', title: 'Captured', text: `Your position was overrun. You are in the hands of ${war.foeAdj} forces, in a cold room, with no idea how long this will last.`, handler: 'milPOW', ctx: { wid: war.id }, choices: [{ label: 'Plan an escape', value: 'escape' }, { label: 'Wait for the prisoner exchange', value: 'wait' }, { label: 'Say what they want to hear', value: 'talk', tone: 'bad' }] });
  }
  // Exposure leaves a mark even on the lucky ones.
  const stress = Math.round(randInt(1, 6) * I * (0.6 + danger / 2) * (trait(s, 'anxious') ? 1.4 : 1));
  m.ptsd = clamp100(m.ptsd + stress - (P(s).stats.happy > 70 ? 2 : 0));
  if (war) {
    m.medals.ribbon++;
    const pay = price(s, 5000 * I);
    add(s, { money: pay });
    c.perf = clamp100(c.perf + (post === 'rear' ? 2 : 8));
    if (post === 'rear') c.levelYears = Math.max(0, c.levelYears - 1);
    addSkill(s, 'fitness', randFloat(1, 3));
    if (post !== 'rear' && chance(Math.min(0.5, 0.04 * I * POSTURE[post] * (m.elite ? 1.6 : 1) * (1 + (t.result === 'wounded' ? 0.5 : 0))))) {
      m.medals.valor++;
      tally(s, 'medals');
      tally(s, 'valorMedals');
      add(s, { fame: randInt(2, 6), karma: 3, happy: 6 });
      lines.push('You were awarded a medal for valor. 🎖️');
    }
    lines.push(`Combat pay added ${fmtMoney(pay)}.`);
  } else {
    c.perf = clamp100(c.perf + 4);
    add(s, { happy: 1 });
  }
  const head = war ? `You served a tour in ${war.theater}${post === 'front' ? ', on the front line' : post === 'rear' ? ', well behind it' : ''}.` : `You spent the year ${place === 'a distant base' ? 'at a distant base' : 'on a peacekeeping mission'}, and came home with a tan.`;
  if (war && t.result !== 'captured' && I >= 2 && post !== 'rear' && chance(0.55)) {
    const mid = pick(MOMENTS.filter((x) => !x.minI || I >= x.minI));
    popup(s, { emoji: mid.emoji, title: mid.title, text: mid.text(s, war), handler: 'milMoment', ctx: { id: mid.id, wid: war.id }, choices: mid.choices.map((ch, i) => ({ label: ch[0], value: i, sub: ch[2] || '' })) });
  }
  return { text: [head].concat(lines).join(' '), title: 'Tour of duty', emoji: war ? '🎖️' : '🚢', tone: t.result === 'wounded' ? 'bad' : 'good' };
}
// The squad that deploys with you: friends the war can take.
function squadYear(s, m, I, danger) {
  if (!m.squad) m.squad = [];
  m.squad = m.squad.filter((id) => s.people[id] && s.people[id].alive);
  while (m.squad.length < 2) {
    const q = makeAdultNear(s, { minAge: Math.max(18, A(s) - 6), maxAge: A(s) + 8 });
    q.mil = { since: s.year, vet: false };
    q.job = null;
    setRel(s, q.id, 'friend', randInt(55, 75));
    m.squad.push(q.id);
  }
  for (const id of m.squad.slice()) {
    if (!chance(Math.min(0.12, 0.002 * Math.pow(I, 1.6) * danger))) continue;
    const q = s.people[id];
    m.squad = m.squad.filter((x) => x !== id);
    npcDies(s, q, 'killed in action');
    tally(s, 'squadLost');
    return `${q.first} ${q.last}, who shared your tent, did not come home.`;
  }
  return '';
}
onChoice('milPOW', (s, ctx, v) => {
  const m = mil(s), c = M(s).career;
  if (!m || !c) return;
  const tough = skill(s, 'fitness') / 200 + skill(s, 'streetwise') / 300 + (m.elite ? 0.12 : 0);
  m.ptsd = clamp100(m.ptsd + randInt(15, 30));
  tally(s, 'pow');
  if (v === 'escape') {
    if (chance(clamp(0.3 + tough, 0.15, 0.7))) { add(s, { health: -8, fame: 8, karma: 4 }); m.medals.valor++; tally(s, 'medals'); return { text: 'You slipped out through a drainage tunnel, walked three nights and reached friendly lines. They are calling it a miracle.', title: 'Escaped', emoji: '🏃', tone: 'good' }; }
    add(s, { health: -22, happy: -14 });
    return { text: 'The escape failed. They broke two ribs and a window. You were exchanged months later, thin as a rail.', title: 'Recaptured', emoji: '⛓️', tone: 'bad' };
  }
  if (v === 'talk') { add(s, { karma: -6, happy: -10 }); c.perf = clamp100(c.perf - 20); return { text: 'You told them what they wanted. It bought you blankets. It will cost you a hearing and a lot of sleep.', title: 'Released', emoji: '📋', tone: 'bad' }; }
  add(s, { health: -14, happy: -10, karma: 3 });
  return { text: 'You kept your mouth shut and counted days. In the prisoner exchange you walked across the bridge in borrowed shoes.', title: 'Homecoming', emoji: '🕊️', tone: 'good' };
});

// Moments that decide what kind of soldier you were. Choices are [label, outcome, sub]; popups keep only the index.
const MOMENTS = [
  { id: 'ambush', emoji: '💥', title: 'Ambush at dusk', text: (s, w) => `Your convoy was hit on a road in ${w.theater}. Rounds are cracking over the ditch.`,
    choices: [
      ['Lay down covering fire', (s) => risk(s, { wound: 0.2, medal: 0.18, kill: 0.01 }, 'You held the ditch until the air support came.'), 'The steady choice'],
      ['Fall back and call for support', (s) => { M(s).career.perf = clamp100(M(s).career.perf + 2); return 'You pulled the wounded back and waited out the storm. Nobody argued with you.'; }, 'The careful choice'],
      ['Charge the ambush line', (s) => risk(s, { wound: 0.35, medal: 0.4, kill: 0.07 }, 'You went straight at them and the whole line broke. You are not sure how.'), 'Glory or a funeral'],
    ] },
  { id: 'rescue', emoji: '🩸', title: 'A comrade is down', text: () => 'A squadmate is lying in the open and the fire is still coming.',
    choices: [
      ['Drag them to cover', (s) => risk(s, { wound: 0.3, medal: 0.35, kill: 0.04, karma: 5 }, 'You got them behind the wall. They will never stop buying you drinks.'), 'Brave'],
      ['Wait for the medics', (s) => { add(s, { karma: -2, happy: -4 }); return 'The medics came a few minutes later. You still think about those minutes.'; }, 'Sensible'],
    ] },
  { id: 'order', emoji: '📜', title: 'An order you hate', text: () => 'Your commander tells you to seize a village’s winter food stores for the army. The village will go hungry.',
    choices: [
      ['Refuse and file a report', (s) => { add(s, { karma: 6, happy: -2, fame: 2 }); M(s).career.perf = clamp100(M(s).career.perf - 12); return 'The report got you a reprimand and a lot of enemies. The village kept its grain.'; }, 'Costs your career'],
      ['Follow the order', (s) => { add(s, { karma: -6, happy: -4 }); return 'You followed the order. You carry the village’s faces around with you.'; }, 'Costs your conscience'],
      ['Take only half and warn the elders', (s) => { add(s, { karma: 3 }); return 'You took what the army needed, left what the village needed, and wrote the numbers carefully.'; }, 'A quiet compromise'],
    ] },
  { id: 'overrun', emoji: '🚩', title: 'Holding the line', text: () => 'Your position is nearly overrun, and the ammunition is almost gone.', minI: 3,
    choices: [
      ['Hold at all costs', (s) => risk(s, { wound: 0.35, medal: 0.35, kill: 0.08 }, 'You held until the reinforcements arrived. The position still has your name on it.'), 'Risky'],
      ['Withdraw with the wounded', (s) => { M(s).career.perf = clamp100(M(s).career.perf + 3); add(s, { karma: 4 }); return 'You got everyone out. The hill fell the next morning, and you did not argue.'; }, 'Safer'],
      ['Surrender', (s) => { add(s, { karma: -2, happy: -6 }); M(s).career.perf = clamp100(M(s).career.perf - 12); mil(s).ptsd = clamp100(mil(s).ptsd + 10); return 'You put your hands up. You are alive. Several people will never forgive you for it.'; }, 'You live'],
    ] },
  { id: 'friendly', emoji: '🛬', title: 'Friendly fire', text: () => 'A friendly air strike landed on the wrong hill. Your sergeant says the report can say anything you want.',
    choices: [
      ['Report what happened', (s) => { add(s, { karma: 5 }); M(s).career.perf = clamp100(M(s).career.perf - 6); return 'An inquiry followed. Your sergeant stopped speaking to you, and the families got the truth.'; }, 'Honest'],
      ['Let it slide', (s) => { add(s, { karma: -5, happy: -3 }); return 'The report said "enemy action." It sits in your stomach like a stone.'; }, 'Silent'],
    ] },
  { id: 'letter', emoji: '✉️', title: 'Mail call', text: (s) => (romanticId(s) ? `A letter from ${nm(s, romanticId(s))} arrives after weeks of silence.` : 'A pile of letters from home arrives after weeks of silence.'),
    choices: [
      ['Write back every night', (s) => { const r = romanticId(s); if (r) addRel(s, r, 10); add(s, { happy: 5 }); mil(s).ptsd = Math.max(0, mil(s).ptsd - 3); return 'The pages got long. Home felt a little closer.'; }, 'Stay connected'],
      ['Put it off', (s) => { const r = romanticId(s); if (r) addRel(s, r, -10); add(s, { happy: -3 }); return 'You kept saying you would write tomorrow.'; }, 'Shut it out'],
    ] },
  { id: 'volunteers', emoji: '🪂', title: 'A call for volunteers', text: () => 'Command wants volunteers for a rescue mission behind the lines. It will be short, and it may not be pretty.', minI: 3,
    choices: [
      ['Volunteer', (s) => risk(s, { wound: 0.35, medal: 0.55, kill: 0.1, fame: 8 }, 'You went in at night, came out at dawn, and brought people home with you.'), 'The kind of thing they write about'],
      ['Stay put', () => 'You watched the team go. Some of them came back.', 'Let others do it'],
    ] },
];
// One risky call: odds of a wound, a medal or worse, with the fame and karma that come with it.
function risk(s, o, win) {
  const m = mil(s), c = M(s).career, boost = m.elite ? 1.3 : 1;
  if (chance(o.kill * boost)) { die(s, 'killed in action'); return 'You were killed in action.'; }
  const lines = [win];
  if (chance(o.wound)) { m.wounds.push({ y: s.year, sev: randInt(1, 3) * 10 }); m.medals.heart++; tally(s, 'medals'); getSick(s, 'broken_leg'); add(s, { health: -14, happy: -6 }); lines.push('You were wounded. Purple Heart.'); }
  if (chance(o.medal * boost)) { m.medals.valor++; tally(s, 'medals'); tally(s, 'valorMedals'); add(s, { fame: o.fame || 4, happy: 6 }); lines.push('A medal for valor followed. 🎖️'); }
  if (o.karma) add(s, { karma: o.karma });
  m.ptsd = clamp100(m.ptsd + randInt(2, 8));
  c.perf = clamp100(c.perf + 4);
  return lines.join(' ');
}
onChoice('milMoment', (s, ctx, i) => {
  const mid = MOMENTS.find((x) => x.id === ctx.id);
  if (!mid || !mil(s) || !M(s).career) return;
  const ch = mid.choices[i] || mid.choices[0];
  return { text: ch[1](s), title: mid.title, emoji: mid.emoji };
});

/* ---- the draft ------------------------------------------------------------------------- */
function deferEligible(s) { return inSchool(s) || dependents(s).length > 0 || P(s).stats.health < 35 || knownDiseases(s).length >= 2; }
function draftYear(s, w) {
  const m = M(s), a = A(s), ages = (w && w.draftAges) || [18, 30]; // a real war names its own ages, and calls up men (88-world.js)
  if (!w || !w.draft || a < ages[0] || a > ages[1] || !histDraftsMe(s, w) || inService(s) || inPrison(s) || (mil(s) && (mil(s).vet || mil(s).deserter))) return;
  if (w.lottery && s.year >= (w.lottery.from || 0)) return lotteryYear(s, w); // a draw by birthday, not a roll (88-world.js)
  if (m.flags['draft_' + w.id] || isMonarch(s, P(s)) || !chance(0.5)) return;
  m.flags['draft_' + w.id] = s.year;
  draftNotice(s, w, '');
}
// The letter, and the five things anyone can do about it. `lead` opens it ("Your number in the lottery was 73. ").
function draftNotice(s, w, lead) {
  popup(s, {
    emoji: '📜', title: 'Draft notice', text: `${lead}A letter from the ministry of defense: you have been selected for service in ${w.name}. You must report in thirty days.`, handler: 'milDraft', ctx: { wid: w.id },
    choices: [
      { label: 'Report for duty', value: 'report', sub: 'Two years, or until the war ends' },
      { label: 'Claim a deferment', value: 'defer', sub: deferEligible(s) ? 'You qualify' : 'You probably will not qualify' },
      { label: 'Apply as a conscientious objector', value: 'co', sub: 'A board decides whether you are sincere' },
      { label: 'Flee the country', value: 'flee', tone: 'bad', sub: 'Your family will not forgive you easily' },
      { label: 'Pay for a doctor’s note', value: 'bribe', tone: 'bad', sub: fmtMoney(price(s, 15000)) + ' · illegal' },
    ],
  });
}
onChoice('milDraft', (s, ctx, v) => {
  const m = M(s), w = activeWar(s);
  const report = () => { if (m.career) leaveJob(s, 'switched'); if (m.edu.current) { m.edu.current = null; m.edu.dropouts++; } hire(s, 'military', 0); startMilitaryCareer(s, 'military', { drafted: true }); return { text: `You reported for duty with a duffel bag and a bad feeling. You are now a Private in the ${BRANCHES[mil(s).branch].name}.`, title: 'Drafted', emoji: '🥾' }; };
  if (v === 'defer') {
    if (deferEligible(s) || chance(0.2)) { add(s, { happy: 2 }); return { text: 'The board granted your deferment. For now.', title: 'Deferred', emoji: '📋', tone: 'good' }; }
    return report();
  }
  if (v === 'co') return objectorBoard(s, true, report);
  if (v === 'flee') {
    ensureMil(s).dodger = true;
    tally(s, 'dodgers');
    add(s, { happy: -6, karma: -3 });
    for (const p of relPeople(s, ['parent', 'sibling', 'spouse', 'partner', 'child'])) addRel(s, p.id, -randInt(6, 14));
    return { text: 'You left in the night with one bag and a friend’s couch abroad. The people at home will remember who stayed and who ran.', title: 'Gone', emoji: '🛫', tone: 'bad' };
  }
  if (v === 'bribe') {
    const cost = price(s, 15000);
    if (!pay(s, cost)) return report();
    if (chance(0.65)) { add(s, { karma: -4 }); return { text: 'The doctor wrote you off as unfit. Nobody asked a single question, which is the problem.', title: 'Exempt', emoji: '🩺' }; }
    return sentence(s, 'draft_evasion', 1, 'You were caught buying a medical exemption.');
  }
  return report();
});
function objectorBoard(s, drafted, fallback) {
  const m = ensureMil(s);
  const odds = clamp(0.35 + (M(s).karma - 50) / 200 + m.ptsd / 300 + (activeWar(s) ? -0.1 : 0.1), 0.1, 0.8);
  if (chance(odds)) {
    m.co = true;
    tally(s, 'objector');
    add(s, { karma: 4, happy: -2, fame: 1 });
    if (inService(s)) { m.next = 'general'; leaveJob(s, 'discharged'); return { text: 'The board accepted your claim. You were discharged under honorable conditions, and your shipmates stopped speaking to you.', title: 'Objector', emoji: '🕊️' }; }
    return { text: 'The board accepted your claim. You spent two years rebuilding schools and clinics instead of carrying a rifle.', title: 'Objector', emoji: '🕊️', tone: 'good' };
  }
  add(s, { happy: -6 });
  if (drafted) return fallback();
  const c = M(s).career;
  if (c) c.perf = clamp100(c.perf - 15);
  return { text: 'The board decided you were not sincere. Your sergeant noticed that you asked.', title: 'Denied', emoji: '📋', tone: 'bad' };
}

/* ---- desertion and courts-martial ---------------------------------------------------------- */
function desert(s, how) {
  const m = ensureMil(s), c = M(s).career;
  if (!c || !isMilJob(c.id)) return;
  tally(s, 'deserted');
  if (how === 'awol') {
    c.perf = clamp100(c.perf - 22);
    if (c.level > 0 && chance(0.4)) { c.level--; c.salary = salaryFor(s, c.id, c.level); }
    const fine = price(s, 3000);
    M(s).money -= fine;
    add(s, { happy: 3, karma: -2 });
    return { text: `You went AWOL for three weeks, then walked back through the gate. You lost pay and rank, and ${fmtMoney(fine)} of savings.`, title: 'AWOL', emoji: '🏃', tone: 'bad' };
  }
  const hide = how === 'border' ? 'border' : how === 'city' ? 'city' : 'family';
  if (hide === 'border') pay(s, price(s, 4000));
  m.deserter = { year: s.year, hide, caught: false };
  m.next = null;
  leaveJob(s, 'deserted');
  add(s, { karma: -5, happy: -6 });
  return { text: hide === 'border' ? 'You slipped across the border in the back of a truck. The army can still find you.' : hide === 'city' ? 'You disappeared into the crowds of a big city under a borrowed name.' : 'You went home. The first knock on the door will be the police.', title: 'Deserter', emoji: '🏃', tone: 'bad' };
}
function deserterYear(s) {
  const m = mil(s);
  if (!m || !m.deserter || m.deserter.caught) return;
  const d = m.deserter, war = activeWar(s);
  add(s, { happy: -2 });
  // Everyone who knows (the web, 81-web2.js) is one more person who could tell the military police.
  const odds = clamp(0.1 + (d.hide === 'family' ? 0.15 : d.hide === 'border' ? -0.07 : -0.03) - skill(s, 'streetwise') / 800 + (war ? 0.03 : 0) + M(s).fame / 900 + webKindPressure(s, 'deserter'), 0.02, 0.5);
  if (!chance(odds)) { if (chance(0.4)) log(s, '🕶️ You saw a military police car slow down outside, and it kept going.', 'bad'); return; }
  deserterCaught(s);
}
// The military police have found you (a year's luck, or the web: someone told). A court-martial follows.
function deserterCaught(s) {
  const m = mil(s), d = m && m.deserter;
  if (!d || d.caught) return;
  d.caught = true;
  const cost = price(s, 12000), war = activeWar(s);
  popup(s, {
    emoji: '⚖️', title: 'Court-martial', text: `The military police found you in ${s.year - d.year === 0 ? 'the first year' : nOf(s.year - d.year, 'year')}. A court-martial will decide how long you go away.`, handler: 'milCourt', ctx: { war: !!war },
    choices: [
      { label: 'Plead guilty', value: 'plea', sub: 'A lighter sentence' },
      { label: 'Hire a military defense lawyer', value: 'lawyer', sub: fmtMoney(cost), disabled: M(s).money < cost },
      { label: 'Argue it was the war that broke you', value: 'trauma', sub: m.ptsd >= 40 ? 'The doctors back you up' : 'You have little to show for it' },
      { label: 'Defend yourself', value: 'self' },
    ],
  });
}
onChoice('milCourt', (s, ctx, v) => {
  const m = ensureMil(s);
  let mult = ctx.war ? 1.6 : 1, win = 0.05;
  if (v === 'plea') mult *= 0.55;
  if (v === 'lawyer') { const cost = price(s, 12000); if (!pay(s, cost)) return cantAfford(cost); win = 0.2; mult *= 0.8; }
  if (v === 'trauma') { win = clamp(m.ptsd / 200, 0.03, 0.4); mult *= 0.75; }
  if (v === 'self') win = clamp(0.04 + selfDefense(s) * 0.4, 0.02, 0.2);
  if (chance(win)) {
    add(s, { happy: 10 });
    m.deserter = null;
    m.vet = true;
    m.discharge = 'oth';
    m.dischargeYear = s.year;
    return { text: 'The panel believed you. The charges were dropped, and you were separated under other than honorable conditions.', title: 'Acquitted', emoji: '⚖️', tone: 'good' };
  }
  m.discharge = 'dishonorable';
  m.dischargeYear = s.year;
  m.vet = true;
  m.edLeft = 0;
  m.deserter = null;
  return sentence(s, 'desertion', mult, 'The court-martial found you guilty. You were dishonorably discharged.');
});
// Giving yourself up ends the running. Voluntary surrender is treated more kindly than being dragged in.
function surrenderDeserter(s) {
  const m = mil(s), war = activeWar(s);
  m.deserter.caught = true;
  popup(s, {
    emoji: '⚖️', title: 'Court-martial', text: 'You walked into a base and handed over your name. The panel notes it as a point in your favor.', handler: 'milCourt', ctx: { war: !!war },
    choices: [{ label: 'Plead guilty', value: 'plea', sub: 'They remember you came back' }, { label: 'Argue it was the war that broke you', value: 'trauma', sub: m.ptsd >= 40 ? 'The doctors back you up' : 'You have little to show for it' }],
  });
}

/* ---- veterans ------------------------------------------------------------------------------ */
// Money in: disability pay (tax-free) and schooling aid, read by financeTick.
function vetIncome(s) {
  const m = mil(s), out = [];
  if (!m || !m.vet) return out;
  if (vetHas(s, 'pay')) out.push(['Veterans disability pay', price(s, m.rating * 420)]);
  const cur = M(s).edu.current;
  if (cur && cur.kind !== 'school' && vetHas(s, 'edu')) out.push(['Veterans education aid', Math.min(cur.cost || 0, price(s, 20000)) + price(s, 6000)]);
  return out;
}
// Cheaper care: an honorable vet pays a third; a disability rating of 50+ pays nothing.
function vetCareMult(s) {
  if (!vetHas(s, 'care')) return 1;
  return mil(s).rating >= 50 ? 0 : 0.33;
}
// A veteran's mortgage: no down payment and a lower rate, once.
function vetLoanTerms(s, fin, it) {
  if (!s || !it || it.kind !== 'house' || !vetHas(s, 'loan')) return fin;
  return Object.assign({}, fin, { down: 0, rate: Math.max(0.03, fin.rate - 0.0075), name: 'Veterans mortgage', vet: true });
}
function disabilityBase(m) { return clamp(Math.round((m.wounds.reduce((t, w) => t + w.sev, 0) + m.ptsd * 0.6) / 10) * 10, 0, 100); }
function vetHireEdge(s, j) {
  const m = mil(s);
  if (!m || !m.vet) return 0;
  if (m.discharge === 'dishonorable') return -0.12;
  if (m.discharge === 'oth') return -0.03;
  return ['public', 'law', 'transport', 'trades'].includes(j.cat) ? 0.12 : 0.05;
}
function vetElectionEdge(s) { const m = mil(s); return m && m.vet && m.discharge !== 'dishonorable' ? 0.04 + Math.min(0.06, medalCount(s) * 0.03) : 0; }
function veteranYear(s) {
  const m = mil(s);
  if (!m || !m.vet) return;
  if (m.ptsd > 0 && !inService(s)) m.ptsd = clamp100(m.ptsd + randInt(-3, 2));
  if (m.ptsd > 30) add(s, { happy: -Math.round(m.ptsd / 25) });
  if (m.ptsd >= 45 && !hasDisease(s, 'ptsd')) getSick(s, 'ptsd', { known: true });
  const cur = M(s).edu.current;
  if (cur && cur.kind !== 'school' && vetHas(s, 'edu')) { m.edLeft--; if (m.edLeft <= 0) log(s, '🎓 Your veterans education benefit ran out.'); }
  if (m.ptsd >= 55 && chance(0.1)) add(s, { happy: -4 });
}

/* ---- relatives at war ------------------------------------------------------------------------ */
const WAR_KIN = ['sibling', 'halfsibling', 'child', 'cousin', 'nibling'];
function familyWar(s, w) {
  if (!w) return;
  for (const p of relPeople(s, WAR_KIN)) {
    const a = ageOf(s, p);
    if (!p.mil) {
      if (a >= 18 && a <= 35 && chance(0.08 * (w.intensity >= 3 ? 1.5 : 1))) {
        p.mil = { since: s.year, vet: false };
        log(s, `🥾 ${p.first} enlisted in the armed forces.`);
      }
      continue;
    }
    if (p.mil.vet || w.intensity < 2) continue;
    if (chance(Math.min(0.06, 0.0015 * Math.pow(w.intensity, 1.6)))) {
      const kind = kinTitle(s, p.id).toLowerCase();
      npcDies(s, p, 'killed in action');
      tally(s, 'goldStar');
      announce(s, { emoji: '🕯️', title: 'Killed in action', tone: 'bad', text: `Your ${kind} ${p.first} was killed in action in ${w.theater}. An officer and a chaplain came to the door.` });
    } else if (chance(0.05)) {
      log(s, `🩹 Your ${kinTitle(s, p.id).toLowerCase()} ${p.first} was wounded in ${w.theater}, but is recovering.`, 'bad');
      add(s, { happy: -2 });
    }
  }
}

/* ---- the year -------------------------------------------------------------------------------------- */
function militaryTick(s) {
  if (s.dead) return;
  warYear(s);
  const w = activeWar(s);
  familyWar(s, w);
  draftYear(s, w);
  deserterYear(s);
  veteranYear(s);
}

/* ---- actions ------------------------------------------------------------------------------------------- */
const MIL = ['mil'];
const serving = (s) => inService(s) && !!mil(s);
const milCtx = (s) => serving(s) || isVeteran(s) || isDeserter(s) || !!activeWar(s);
defAction({
  id: 'mil_train', cat: 'mil', label: 'Train with your unit', emoji: '🥾', desc: 'Drills, ranges and long marches.', when: serving,
  run: (s) => {
    const n = bump(s, 'miltrain'), c = M(s).career;
    addSkill(s, 'fitness', randFloat(2, 4) / n);
    addSkill(s, specOf(s).skill, randFloat(1, 3) / n);
    c.perf = clamp100(c.perf + randInt(3, 7) / n);
    if (chance(0.04 * n)) { getSick(s, 'broken_leg'); return 'A training exercise went wrong. You broke your leg on the range.'; }
    return vary('You {ran drills until sunrise|spent a week in the field|qualified on the range|led a long march with a full pack}.');
  },
});
defAction({
  id: 'mil_write', cat: 'mil', label: 'Call or write home', emoji: '📞', desc: 'Stay close to the people you left behind.', when: (s) => serving(s) || (isVeteran(s) && !!relPeople(s, ['spouse', 'partner', 'parent', 'child']).length),
  run: (s) => {
    if (bump(s, 'milwrite') > 2) return { text: 'You already called this week.', nolog: true };
    const p = relPeople(s, ['spouse', 'partner', 'parent', 'child', 'sibling']).filter((q) => q.alive)[0];
    if (!p) return 'There was nobody to call.';
    addRel(s, p.id, 8);
    add(s, { happy: 3 });
    if (mil(s) && mil(s).ptsd) mil(s).ptsd = Math.max(0, mil(s).ptsd - 1);
    return { text: `You talked to ${p.first} for an hour. Hearing a voice from home helped.`, person: p.id };
  },
});
defAction({
  id: 'mil_ocs', cat: 'mil', label: 'Apply for officer candidate school', emoji: '⭐', desc: 'Earn a commission and a new rank.',
  when: (s) => serving(s) && M(s).career.id === 'military' && M(s).career.level >= 1 && eduRank(s) >= 3 && A(s) <= 38,
  run: (s) => {
    if (bump(s, 'ocs') > 1) return { text: 'You can only apply once a year.', nolog: true };
    const odds = clamp(0.25 + P(s).stats.smarts / 250 + skill(s, 'charisma') / 400 + skill(s, 'fitness') / 400 + (M(s).career.perf - 50) / 200, 0.1, 0.85);
    if (!chance(odds)) { add(s, { happy: -4 }); return { text: 'The selection board passed on you. Try again next year.', emoji: '⭐', tone: 'bad' }; }
    leaveJob(s, 'commissioned');
    hire(s, 'officer', 0);
    tally(s, 'commissioned');
    return { text: `You were commissioned as a ${careerTitle(s)}. The salute you give now gets returned.`, title: 'Commissioned', emoji: '⭐', tone: 'good' };
  },
});
defAction({
  id: 'mil_sf', cat: 'mil', label: 'Try out for special forces', emoji: '🗡️', desc: 'Months of misery, a tiny chance of a badge.',
  when: (s) => serving(s) && !mil(s).elite && mil(s).served >= 2 && ['combat', 'medic', 'intel', 'engineer', 'pilot'].includes(mil(s).spec),
  run: (s) => {
    if (bump(s, 'sf') > 1) return { text: 'Selection only runs once a year.', nolog: true };
    const odds = clamp((skill(s, 'fitness') - 45) / 80 + (skill(s, 'martial') - 30) / 150 + P(s).stats.health / 400 - 0.05 + (trait(s, 'athletic') ? 0.08 : 0), 0.03, 0.55);
    addSkill(s, 'fitness', 3);
    if (!chance(odds)) { add(s, { health: -randInt(3, 10), happy: -5 }); return { text: 'You rang the bell on the third week. A lot of people did.', emoji: '🗡️', tone: 'bad' }; }
    const m = mil(s), c = M(s).career;
    m.elite = true;
    c.salary = Math.round(c.salary * 1.25);
    add(s, { fame: 5, happy: 12 });
    tally(s, 'specialForces');
    return { text: 'You made it through selection. The badge is smaller than you expected and it weighs a ton.', title: 'Special forces', emoji: '🗡️', tone: 'good' };
  },
});
defAction({
  id: 'mil_cross', cat: 'mil', label: 'Cross-train to a new specialty', emoji: '🔧', desc: 'Learn a different trade in uniform.',
  when: (s) => serving(s) && mil(s).served >= 2,
  run: (s) => {
    if (bump(s, 'cross') > 1) return { text: 'Cross-training takes a year.', nolog: true };
    const officer = M(s).career.id === 'officer';
    popup(s, { emoji: '🔧', title: 'New specialty', text: 'What do you want to learn?', handler: 'milCross', choices: SPEC_IDS.filter((x) => x !== mil(s).spec && (x !== 'pilot' || officer)).map((x) => ({ label: SPECIALTIES[x].emoji + ' ' + SPECIALTIES[x].name, value: x, sub: SPECIALTIES[x].blurb })).concat([{ label: 'Never mind', value: null }]) });
  },
});
onChoice('milCross', (s, ctx, sp) => {
  if (!sp || !SPECIALTIES[sp] || !mil(s)) return;
  mil(s).spec = sp;
  addSkill(s, SPECIALTIES[sp].skill, randFloat(4, 8));
  M(s).career.perf = clamp100(M(s).career.perf - 4);
  return `You retrained as ${SPECIALTIES[sp].name.toLowerCase()}. You are the new person in the room again.`;
});
defAction({
  id: 'mil_co', cat: 'mil', label: 'Apply as a conscientious objector', emoji: '🕊️', desc: 'Ask to leave because you cannot fight.',
  when: (s) => serving(s) && !mil(s).co,
  run: (s) => {
    if (bump(s, 'co') > 1) return { text: 'The board only meets once a year.', nolog: true };
    return objectorBoard(s, false);
  },
});
defAction({
  id: 'mil_leave', cat: 'mil', label: 'Ask to leave early', emoji: '🚪', desc: 'Request an early separation.', when: serving,
  run: (s) => {
    if (bump(s, 'leave') > 1) return { text: 'You already asked this year.', nolog: true };
    const c = M(s).career, war = activeWar(s), m = mil(s);
    if (m.drafted) return separate(s, 'honorable', 'Your discharge request was granted, with thanks.');
    const odds = (war ? 0.12 : 0.5) + (c.perf - 50) / 200;
    if (chance(clamp(odds, 0.05, 0.8))) return separate(s, c.perf >= 55 ? 'honorable' : 'general', 'Your request for early separation was approved.');
    c.perf = clamp100(c.perf - 5);
    add(s, { happy: -3 });
    return war ? 'Your request was denied. There is a war on, and they need everyone.' : 'Your request was denied. Your commander says to wait until your term ends.';
  },
});
defAction({
  id: 'mil_retire', cat: 'mil', label: 'Retire from the service', emoji: '🏅', desc: 'Twenty years in, a pension for life.',
  when: (s) => serving(s) && mil(s).served >= 20, sub: (s) => `Pension: ${fmtMoney(militaryPension(s, M(s).career))}/yr`,
  run: (s) => militaryRetire(s),
});
defAction({
  id: 'mil_awol', cat: 'mil', label: 'Go AWOL or desert', emoji: '🏃', desc: 'Leave without permission. There will be consequences.', when: serving,
  run: (s) => { desertPopup(s); },
});
function desertPopup(s) {
    popup(s, {
      emoji: '🏃', title: 'Desert?', text: 'Walking away is a crime, in a war a serious one, and the military does not forget.', handler: 'milRun',
      choices: [
        { label: 'Go AWOL for a few weeks, then come back', value: 'awol', sub: 'Lost pay and a bad mark' },
        { label: 'Desert and hide with family', value: 'family', sub: 'Easy to find', tone: 'bad' },
        { label: 'Desert and vanish into a big city', value: 'city', sub: 'Harder to find', tone: 'bad' },
        { label: 'Desert and cross the border', value: 'border', sub: fmtMoney(price(s, 4000)) + ' · hardest to find', tone: 'bad' },
        { label: 'Stay', value: null },
      ],
    });
}
onChoice('milRun', (s, ctx, v) => (v ? desert(s, v) : undefined));
defAction({
  id: 'mil_turnin', cat: 'mil', label: 'Turn yourself in', emoji: '🏳️', desc: 'End the running. Face the court.', when: (s) => isDeserter(s) && free(s),
  run: (s) => { surrenderDeserter(s); },
});
defAction({
  id: 'mil_reenlist', cat: 'mil', label: 'Rejoin the service', emoji: '🥾', desc: 'Put the uniform back on.', when: (s) => free(s) && isVeteran(s) && !inService(s) && !M(s).career && A(s) <= 35 && mil(s).discharge !== 'dishonorable' && mil(s).discharge !== 'oth',
  run: (s) => applyJob(s, eduRank(s) >= 3 && mil(s).served >= 4 ? 'officer' : 'military'),
});

// Veterans.
defAction({
  id: 'vet_claim', cat: 'mil', label: 'File a disability claim', emoji: '📑', desc: 'Ask for pay for what service did to you.', when: (s) => free(s) && isVeteran(s) && mil(s).discharge !== 'dishonorable' && !mil(s).claim,
  run: (s) => {
    const m = mil(s), base = disabilityBase(m);
    if (base < 10) { m.claim = { year: s.year, approved: false, base: 0 }; return 'The examiner could not connect anything to your service. The claim was closed.'; }
    const rating = clamp(Math.round(base * randFloat(0.6, 1) / 10) * 10, 10, 100);
    m.claim = { year: s.year, approved: true, base, appeals: 0 };
    m.rating = rating;
    return { text: `The veterans’ office rated you ${rating}% disabled. That pays ${fmtMoney(price(s, rating * 420))} a year, tax-free.${rating >= 50 ? ' Your care is free now.' : ''}`, title: 'Claim approved', emoji: '📑', tone: 'good' };
  },
});
defAction({
  id: 'vet_appeal', cat: 'mil', label: 'Appeal your disability rating', emoji: '📈', desc: 'Ask for a higher rating.', when: (s) => free(s) && isVeteran(s) && !!mil(s).claim && mil(s).claim.approved && mil(s).rating < disabilityBase(mil(s)),
  run: (s) => {
    const m = mil(s);
    if (bump(s, 'appeal') > 1) return { text: 'Your appeal is already in the pile.', nolog: true };
    m.claim.appeals = (m.claim.appeals || 0) + 1;
    if (chance(0.5)) { const up = Math.min(disabilityBase(m), m.rating + 10 * randInt(1, 2)); m.rating = up; return { text: `The board raised your rating to ${up}%.`, emoji: '📈', tone: 'good' }; }
    return 'The appeal was denied. You can file again next year.';
  },
});
defAction({
  id: 'vet_counsel', cat: 'mil', label: 'See a veterans’ counselor', emoji: '🛋️', desc: 'Talk to someone who understands.', when: (s) => free(s) && isVeteran(s) && mil(s).ptsd > 0,
  sub: (s) => medLabel(s, { cost: 180 }),
  run: (s) => {
    const m = mil(s), cost = medBill(s, { cost: 180 });
    if (!pay(s, cost)) return cantAfford(cost);
    const n = bump(s, 'vetcounsel');
    const drop = Math.round(randInt(6, 14) / n);
    m.ptsd = Math.max(0, m.ptsd - drop);
    add(s, { happy: Math.round(randInt(3, 7) / n) });
    if (m.ptsd < 45) cureDisease(s, 'ptsd');
    return 'The counselor was a veteran too. You said things out loud you had not said in years.';
  },
});
defAction({
  id: 'vet_group', cat: 'mil', label: 'Join a veterans’ group', emoji: '🤝', desc: 'Old soldiers, new friends.', when: (s) => free(s) && isVeteran(s) && A(s) >= 20,
  run: (s) => {
    if (bump(s, 'vetgroup') > 1) return { text: 'The group meets once a month. You already went.', nolog: true };
    const q = makeAdultNear(s, { minAge: Math.max(20, A(s) - 15), maxAge: A(s) + 20 });
    q.mil = { since: s.year - randInt(2, 20), vet: true };
    setRel(s, q.id, 'friend', randInt(40, 60));
    add(s, { happy: 4, karma: 1 });
    if (mil(s).ptsd) mil(s).ptsd = Math.max(0, mil(s).ptsd - 2);
    return { text: `You went to the hall and met ${q.first}, who served too. Neither of you needed to explain anything.`, person: q.id };
  },
});
defAction({
  id: 'vet_upgrade', cat: 'mil', label: 'Appeal your discharge', emoji: '📄', desc: 'Ask the board to upgrade it.', when: (s) => free(s) && isVeteran(s) && ['oth', 'general'].includes(mil(s).discharge),
  sub: (s) => fmtMoney(price(s, 3000)),
  run: (s) => {
    const m = mil(s), cost = price(s, 3000);
    if (bump(s, 'upgrade') > 1) return { text: 'The board hears one case a year.', nolog: true };
    if (!pay(s, cost)) return cantAfford(cost);
    const odds = 0.25 + (m.ptsd >= 40 ? 0.25 : 0) + (m.medals.valor ? 0.1 : 0);
    if (!chance(clamp(odds, 0.1, 0.7))) { add(s, { happy: -3 }); return 'The review board upheld your discharge.'; }
    m.discharge = m.discharge === 'oth' ? 'general' : 'honorable';
    if (FULL_VET.includes(m.discharge) && !m.edLeft) m.edLeft = 4;
    return { text: `The board upgraded your discharge to ${DISCHARGES[m.discharge].name.toLowerCase()}. Benefits that were frozen opened up.`, title: 'Upgraded', emoji: '📄', tone: 'good' };
  },
});

// Civilians in a country at war.
defAction({
  id: 'war_protest', cat: 'mil', label: 'Join an anti-war protest', emoji: '📣', desc: 'March in the street.', when: (s) => free(s) && A(s) >= 14 && !!activeWar(s) && !serving(s),
  run: (s) => {
    if (bump(s, 'protest') > 2) return { text: 'Your feet hurt too much for another march.', nolog: true };
    add(s, { karma: 2, happy: randInt(0, 4), fame: chance(0.2) ? 1 : 0 });
    if (chance(0.05)) { M(s).record.push({ crime: 'vandalism', year: s.year, years: 0 }); return 'You were arrested for blocking a road at the protest. They let you go with a warning.'; }
    return vary('You {marched down Main Street with a hand-lettered sign|chanted outside the ministry until you lost your voice|joined a candlelight vigil}.');
  },
});
defAction({
  id: 'war_bonds', cat: 'mil', label: 'Buy war bonds', emoji: '💵', desc: 'Lend the country money. It will pay off, if it wins.', when: (s) => free(s) && A(s) >= 18 && !!activeWar(s),
  sub: (s) => fmtMoney(price(s, 2000)),
  run: (s) => {
    const amt = price(s, 2000);
    if (!pay(s, amt)) return cantAfford(amt);
    M(s).warBonds = (M(s).warBonds || 0) + amt;
    add(s, { karma: 1, happy: 1 });
    return `You bought ${fmtMoney(amt)} in war bonds. They pay out when the war ends, more if it ends well.`;
  },
});
defAction({
  id: 'war_volunteer', cat: 'mil', label: 'Help the war effort', emoji: '🧣', desc: 'Pack boxes and visit veterans’ wards.', when: (s) => free(s) && A(s) >= 12 && !!activeWar(s) && !serving(s),
  run: (s) => {
    if (bump(s, 'warvol') > 2) return { text: 'You have done enough for this year.', nolog: true };
    add(s, { karma: 3, happy: 3 });
    return vary('You {packed care packages for the troops|knitted scarves for the soldiers|spent the afternoon at the veterans’ ward|helped a refugee family with their paperwork}.');
  },
});

// A military career can't be quit like an office job, and retires through its own door.
ACTIONS.quit_job.when = (s) => hasCareer(s) && !isMilJob(M(s).career.id);
ACTIONS.retire.when = (s) => hasCareer(s) && A(s) >= 50 && !isMilJob(M(s).career.id);
ACTIONS.ask_raise.when = ((old) => (s) => old(s) && !isMilJob(M(s).career.id))(ACTIONS.ask_raise.when);
ACTIONS.ask_promo.when = ((old) => (s) => old(s) && !isMilJob(M(s).career.id))(ACTIONS.ask_promo.when);

/* ---- events ------------------------------------------------------------------------------------------------ */
const servingNow = (s) => inService(s) && !!mil(s) && mil(s).trained;
const atWar = (s) => !!activeWar(s);
EV('mil_bonus_offer', {
  ages: [18, 45], w: 1.2, when: (s) => servingNow(s) && !mil(s).drafted && mil(s).termEnd - s.year <= 1, emoji: '💰', text: 'Your commander pulls you aside with a re-enlistment package.',
  choices: [
    ['Sign now', (s) => { const b = price(s, randInt(8000, 25000)); add(s, { money: b }); mil(s).termEnd = Math.max(mil(s).termEnd, s.year) + 4; mil(s).terms++; return `You signed and took ${fmtMoney(b)}. Four more years.`; }],
    ['Think it over', () => 'You said you needed to talk to your family. Your commander looked relieved to hear a reason.'],
  ],
});
EV('mil_mentor', {
  ages: [18, 50], w: 1, when: servingNow, emoji: '🎖️', text: 'A veteran master sergeant takes an interest in you.',
  choices: [
    ['Soak up everything', (s) => { M(s).career.perf = clamp100(M(s).career.perf + 8); addSkill(s, specOf(s).skill, 4); return 'He taught you three things that are not in any manual.'; }],
    ['Keep your distance', () => 'You did your job and went to the mess hall. He shrugged.'],
  ],
});
EV('mil_barracks', {
  ages: [18, 40], w: 1, when: servingNow, emoji: '🛏️', text: 'Someone in the barracks is stealing from lockers.',
  choices: [
    ['Report the thief', (s) => { add(s, { karma: 3 }); M(s).career.perf = clamp100(M(s).career.perf + 3); return 'You went to the sergeant. The thief was gone by the weekend.'; }],
    ['Handle it yourself', (s) => { add(s, { karma: -1 }); if (chance(0.3)) { M(s).career.perf = clamp100(M(s).career.perf - 10); return 'The fight got you written up. The stealing stopped.'; } return 'You had a quiet word at 3 a.m. The stealing stopped.'; }],
    ['Stay out of it', () => 'It stopped being your business the moment you locked your own locker.'],
  ],
});
EV('mil_hazing', {
  ages: [18, 30], w: 0.6, when: servingNow, emoji: '😠', text: 'A senior soldier has been making life hard for the new recruits in your unit.',
  choices: [
    ['File a complaint', (s) => { add(s, { karma: 3 }); M(s).career.perf = clamp100(M(s).career.perf - 3); return 'The inquiry took months. He transferred out, and the recruits breathed.'; }],
    ['Take it on the chin', (s) => { add(s, { happy: -3 }); return 'You said nothing. You learned who you never wanted to become.'; }],
  ],
});
EV('mil_homecoming', {
  ages: [18, 50], w: 1.5, when: (s) => servingNow(s) && mil(s).tours.length && mil(s).tours[mil(s).tours.length - 1].y === s.year - 1 && mil(s).tours[mil(s).tours.length - 1].result !== 'killed', emoji: '🛬', text: 'You are home from your deployment. The family is waiting at the airport with a sign.',
  choices: [
    ['Take your leave and rest', (s) => { add(s, { happy: 8, health: 2 }); mil(s).ptsd = Math.max(0, mil(s).ptsd - 4); for (const p of relPeople(s, ['spouse', 'partner', 'child', 'parent'])) addRel(s, p.id, 5); return 'You spent a month on the couch. It was the best month of the year.'; }],
    ['Volunteer for the next rotation', (s) => { M(s).career.perf = clamp100(M(s).career.perf + 6); add(s, { happy: -3 }); for (const p of relPeople(s, ['spouse', 'partner'])) addRel(s, p.id, -6); return 'Your commander noticed. Your partner did too.'; }],
  ],
});
EV('mil_nightmares', {
  ages: [18, 100], w: (s) => 1 + mil(s).ptsd / 30, when: (s) => !!mil(s) && mil(s).ptsd >= 25, emoji: '🌫️', text: 'Fireworks go off in the neighborhood and you are on the floor before you know it.', cooldown: 2,
  choices: [
    ['Call your counselor', (s) => { mil(s).ptsd = Math.max(0, mil(s).ptsd - 6); add(s, { happy: 2 }); return 'She picked up on the second ring. You stayed on the line until you stopped shaking.'; }],
    ['Pour a drink', (s) => { habit(s, 'alcohol', randInt(5, 12)); add(s, { happy: -2 }); return 'It helped for exactly as long as the bottle lasted.'; }],
    ['Say nothing', (s) => { mil(s).ptsd = clamp100(mil(s).ptsd + 3); add(s, { happy: -4 }); return 'You said you were fine. Everyone pretended to believe you.'; }],
  ],
});
EV('vet_parade', {
  ages: [20, 100], w: 1.2, when: (s) => !!mil(s) && mil(s).vet && mil(s).discharge !== 'dishonorable', cooldown: 4, emoji: '🎺', text: (s) => `The town holds a parade for veterans, and ${mil(s).medals.valor ? 'they ask you to carry a flag' : 'someone saved you a seat'}.`,
  choices: [
    ['March', (s) => { add(s, { happy: 6, karma: 1, fame: mil(s).medals.valor ? 2 : 0 }); return 'The band played, and a little girl asked if she could hold your medal.'; }],
    ['Watch from the curb', (s) => { add(s, { happy: 2 }); return 'You clapped for the ones who did not come back.'; }],
  ],
});
EV('vet_jobfair', {
  ages: [20, 60], w: 1.2, when: (s) => !!mil(s) && mil(s).vet && mil(s).discharge !== 'dishonorable' && !M(s).career && !inSchool(s) && mil(s).dischargeYear >= s.year - 6, emoji: '💼', text: 'A veterans’ job fair is in town, and the recruiters actually want to talk to you.',
  choices: [
    ['Work the room', (s) => { const j = pick(['security_guard', 'police', 'mechanic', 'electrician', 'pilot'].filter((id) => JOBS[id])); if (j && !missingReqs(s, JOBS[j].req).length) { hire(s, j, 0); return { text: `A recruiter signed you on the spot as a ${JOBS[j].ladder[0][0]}.`, emoji: JOBS[j].emoji, tone: 'good' }; } addSkill(s, 'charisma', 2); return 'You collected a lot of business cards. Several of them were even real.'; }],
    ['Skip it', () => 'You had somewhere else to be. You do not remember where.'],
  ],
});
EV('vet_backlog', {
  ages: [22, 100], w: 0.9, when: (s) => !!mil(s) && mil(s).vet && !!mil(s).claim && mil(s).claim.approved, cooldown: 5, emoji: '🗂️', text: 'The veterans’ office wrote to say your file needs a new exam. It is the third exam this year.',
  choices: [
    ['Go to the exam', (s) => { add(s, { happy: -2 }); if (chance(0.15) && mil(s).rating > 10) { mil(s).rating -= 10; return 'The new rating came back ten points lower. You filed an appeal in the parking lot.'; } return 'You waited four hours and answered the same questions. The rating stayed the same.'; }],
    ['Throw the letter out', (s) => { if (chance(0.5)) { mil(s).rating = Math.max(0, mil(s).rating - 20); return 'They cut your rating for "failure to appear." Of course they did.'; } return 'No one noticed. Yet.'; }],
  ],
});
EV('war_rationing', {
  ages: [14, 100], w: 1, when: (s) => atWar(s) && activeWar(s).intensity >= 3, cooldown: 3, emoji: '🥫', text: 'Rationing has started. Meat, fuel and sugar are all on coupons.',
  choices: [
    ['Follow the rules', (s) => { add(s, { karma: 2, happy: -2 }); return 'You queued, you cooked with less, and you grew a garden.'; }],
    ['Buy on the black market', (s) => { const c = price(s, randInt(100, 800)); if (!pay(s, c)) return 'You could not afford the prices.'; add(s, { karma: -3, happy: 2 }); return 'The steak was excellent. The shame was not.'; }],
  ],
});
EV('war_raid', {
  ages: [8, 100], w: 0.8, when: (s) => atWar(s) && activeWar(s).intensity >= 3, cooldown: 4, emoji: '🚨', text: 'An air-raid siren wails across the city in the middle of the night.',
  choices: [
    ['Go to the shelter', (s) => { add(s, { happy: -3 }); return 'You spent six hours underground with strangers and a thermos. Nothing fell near you.'; }],
    ['Stay in bed', (s) => { if (chance(0.02)) { getSick(s, 'broken_arm'); return 'A window blew in. You broke your arm, and you will not do that again.'; } add(s, { happy: -1 }); return 'It was a false alarm. You told the story for weeks.'; }],
  ],
});
EV('war_refugees', {
  ages: [16, 100], w: 0.8, when: (s) => atWar(s), cooldown: 5, emoji: '🧳', text: 'A refugee family from the war zone has moved into your neighborhood and needs help getting started.',
  choices: [
    ['Help them settle', (s) => { add(s, { karma: 4, happy: 3 }); const p = makeAdultNear(s, { minAge: 25, maxAge: 45 }); setRel(s, p.id, 'friend', 50); return { text: `You helped ${p.first} and the family find an apartment and enroll the kids in school.`, person: p.id }; }],
    ['Keep your distance', (s) => { add(s, { karma: -3 }); return 'You told yourself it was not your business.'; }],
  ],
});
EV('war_enlist_rush', {
  ages: [18, 35], w: 1, when: (s) => atWar(s) && !inService(s) && !(mil(s) && mil(s).vet) && !inSchool(s) && !M(s).career, emoji: '📢', cooldown: 4, text: (s) => `A recruiting poster for ${activeWar(s).name} stares you down: "Your country needs you."`,
  choices: [
    ['Enlist', (s) => applyJob(s, 'military')],
    ['Walk on', () => 'You looked at your shoes and crossed the street.'],
  ],
});
EV('mil_family_enlist', {
  ages: [30, 100], w: 0.8, when: (s) => atWar(s) && myChildren(s).some((c) => ageOf(s, c) >= 18 && ageOf(s, c) <= 25 && !(c.mil)), cooldown: 4, emoji: '👨‍👦', ctx: (s) => { const k = myChildren(s).filter((c) => ageOf(s, c) >= 18 && ageOf(s, c) <= 25 && !c.mil); return k.length ? { pid: pick(k).id } : null; },
  text: (s, c) => `${nm(s, c.pid)} tells you at dinner that they have decided to enlist.`,
  choices: [
    ['Say you are proud', (s, c) => { const p = s.people[c.pid]; p.mil = { since: s.year, vet: false }; addRel(s, c.pid, 6); add(s, { happy: -2 }); return `${p.first} grinned, and you smiled until you got to the kitchen.`; }],
    ['Beg them not to', (s, c) => { const p = s.people[c.pid]; if (chance(0.4)) return `${p.first} listened, and put the paperwork in a drawer.`; p.mil = { since: s.year, vet: false }; addRel(s, c.pid, -8); return `${p.first} enlisted anyway, and the dinner was quiet.`; }],
  ],
});
EV('vet_homeless', {
  ages: [25, 100], w: 0.7, when: (s) => !!mil(s) && mil(s).vet, cooldown: 5, emoji: '🧥', text: 'A man in an old field jacket asks you for change outside the station. He has a unit patch you recognize.',
  choices: [
    ['Give him a hand', (s) => { const g = price(s, randInt(20, 200)); if (!pay(s, g)) return 'You gave him your lunch instead.'; add(s, { karma: 4, happy: 2 }); return `You gave him ${fmtMoney(g)} and an hour. He said you were the first person to ask his name this month.`; }],
    ['Walk past', (s) => { add(s, { karma: -2, happy: -2 }); return 'You walked on. You did not walk on easily.'; }],
  ],
});
EV('mil_amnesty', {
  ages: [18, 80], w: 3, once: true, when: (s) => isDeserter(s) && !atWar(s) && warBook(s).log.some((l) => l.cc === P(s).country && s.year - l.end <= 3 && l.end >= mil(s).deserter.year), emoji: '🕊️', text: 'With the war over, the government has announced an amnesty for deserters who come forward.',
  choices: [
    ['Come forward', (s) => { const m = mil(s); m.deserter = null; m.vet = true; m.discharge = 'oth'; m.dischargeYear = s.year; add(s, { happy: 12, karma: 2 }); return { text: 'You turned yourself in. You were separated under other than honorable conditions and sent home. It was the first night you slept in years.', emoji: '🕊️', tone: 'good' }; }],
    ['Stay hidden', () => 'You did not trust the offer. You went on looking over your shoulder.'],
  ],
});

/* ---- achievements, legacy and goals ---------------------------------------------------------------------------- */
ACHIEVEMENTS.push(
  { id: 'boots_ground', name: 'Boots on the Ground', emoji: '🥾', desc: 'Complete a tour of duty in a war.', check: (s) => LC(s, 'warTours') >= 1 },
  { id: 'purple_heart', name: 'Purple Heart', emoji: '💜', desc: 'Be wounded in action.', check: (s) => LC(s, 'woundsInAction') >= 1 },
  { id: 'hero_nation', name: 'Hero of the Nation', emoji: '🏅', desc: 'Earn three medals for valor.', check: (s) => LC(s, 'valorMedals') >= 3 },
  { id: 'brass', name: 'Brass', emoji: '⭐', desc: 'Reach the rank of Colonel or higher.', check: (s) => !!M(s).career && M(s).career.id === 'officer' && M(s).career.level >= 5 },
  { id: 'twenty_years', name: 'Twenty Years', emoji: '🎖️', desc: 'Serve twenty years in uniform.', check: (s) => !!mil(s) && mil(s).served >= 20 },
  { id: 'honorable', name: 'Honorable Discharge', emoji: '📜', desc: 'Leave the service with honor.', check: (s) => !!mil(s) && mil(s).vet && FULL_VET.includes(mil(s).discharge) },
  { id: 'badge', name: 'The Badge', emoji: '🗡️', desc: 'Pass special forces selection.', check: (s) => LC(s, 'specialForces') >= 1 },
  { id: 'commissioned', name: 'Commissioned', emoji: '🔰', desc: 'Earn an officer’s commission from the enlisted ranks.', check: (s) => LC(s, 'commissioned') >= 1 },
  { id: 'deserter', name: 'Deserter', emoji: '🏃', desc: 'Desert the military.', check: (s) => LC(s, 'deserted') >= 1 },
  { id: 'dodger', name: 'Draft Dodger', emoji: '🛫', desc: 'Flee the country to avoid the draft.', check: (s) => LC(s, 'dodgers') >= 1 },
  { id: 'objector', name: 'Conscientious Objector', emoji: '🕊️', desc: 'Have a conscientious objector claim approved.', check: (s) => LC(s, 'objector') >= 1 },
  { id: 'homecoming', name: 'Homecoming', emoji: '🏠', desc: 'Come home from being a prisoner of war.', check: (s) => LC(s, 'pow') >= 1 && !s.dead },
  { id: 'gold_star', name: 'Gold Star', emoji: '🕯️', desc: 'Lose a relative in a war.', check: (s) => LC(s, 'goldStar') >= 1 },
  { id: 'brothers_arms', name: 'Brothers in Arms', emoji: '🤝', desc: 'Lose a squadmate in action.', check: (s) => LC(s, 'squadLost') >= 1 },
  { id: 'vet_benefits', name: 'Earned It', emoji: '📑', desc: 'Have a disability claim approved.', check: (s) => !!mil(s) && !!mil(s).claim && mil(s).claim.approved },
);
LEGACY_TITLES.unshift(
  { id: 'war_hero', name: 'War Hero', emoji: '🎖️', check: (s) => LC(s, 'valorMedals') >= 2 },
  { id: 'veteran', name: 'Veteran', emoji: '🥾', check: (s) => !!mil(s) && mil(s).served >= 4 && mil(s).discharge !== 'dishonorable' },
  { id: 'deserter_t', name: 'Deserter', emoji: '🏃', check: (s) => LC(s, 'deserted') >= 1 && !!mil(s) && mil(s).discharge === 'dishonorable' },
);
GOALS.push(
  { id: 'g_serve', text: 'Serve in the military', emoji: '🥾', check: (s) => LC(s, 'enlisted') >= 1 },
  { id: 'g_veteran', text: 'Leave the service with honor', emoji: '🎖️', check: (s) => !!mil(s) && mil(s).vet && FULL_VET.includes(mil(s).discharge) },
);
ACT_CATS.splice(ACT_CATS.findIndex((c) => c.id === 'crime'), 0, { id: 'mil', name: 'Military & Veterans', emoji: '🎖️' });
for (const k of Object.keys(ACTIONS)) if (ACTIONS[k].cat === 'mil') { const w = ACTIONS[k].when; ACTIONS[k].when = (s) => milCtx(s) && w(s); }
