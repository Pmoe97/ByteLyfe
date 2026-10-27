/* =====================================================================
 * 60-spy.js — secret agent: an intelligence-agency career with recruitment,
 * a cover identity, missions abroad (with twists), assets you run, moles to
 * hunt, double agents, capture and prisoner swaps, getting burned, and life
 * after (memoirs, consulting, revenge). Events are at the bottom.
 *
 * M(s).spy (made at recruitment; it stays for life as your file) =
 *   { agency, handle, joined, track ('field' | 'tech' | 'analyst' | 'handler'), trained,
 *     cover: { id, strength (0-100) }, heat (0-100, foreign attention), standing (0-100, with
 *     your own agency), desk, ok, fail, missions: [{ y, id, name, state, result }],
 *     assets: [{ id, name, role, state, loyalty, value, since, adj }], told: { pid: true },
 *     turned: { state, since, forced } | null (selling secrets), controlled: { state, since } | null
 *     (a double the agency runs), sold, burned: { year, how } | null, burns, alumni, left: { year,
 *     reason }, disavowed, captive, defected, memoir }
 * spyTick runs just before careerTick; spyYear is the working year, called from specialTick in
 * 15-career.js; spyApply is called from specialApply; spyLeft from leaveJob.
 * ===================================================================== */

const SPY_AGENCIES = {
  us: 'the Overseas Intelligence Bureau', ca: 'the Northern Intelligence Office', uk: 'the Whitehall Section', ie: 'the Emerald Office',
  au: 'the Southern Cross Service', mx: 'the National Foreign Intelligence Office', br: 'the Cruzeiro Agency', fr: 'the Service du Renseignement Extérieur',
  de: 'the Bundesamt für Auslandsaufklärung', it: 'the Servizio Informazioni Esterne', es: 'the Centro Nacional de Inteligencia Exterior', se: 'the Foreign Signals Office',
  jp: 'the Cabinet Foreign Intelligence Office', kr: 'the National Overseas Intelligence Agency', in: 'the External Intelligence Wing', ng: 'the Federal Overseas Intelligence Department',
  ph: 'the Archipelago Intelligence Service', za: 'the Southern Intelligence Bureau',
};
const SPY_HANDLE_A = ['Quiet', 'Amber', 'Hollow', 'Iron', 'Silent', 'Crimson', 'Pale', 'Winter', 'Glass', 'Salt', 'Velvet', 'Ashen'];
const SPY_HANDLE_B = ['Heron', 'Lantern', 'Fox', 'Orchid', 'Compass', 'Raven', 'Harbor', 'Mirror', 'Sparrow', 'Anvil', 'Tide', 'Moth'];
const SPY_COVERS = {
  diplomat: { name: 'Embassy attaché', emoji: '🛂', boost: 'handler', immunity: true, blurb: 'Diplomatic immunity may save you if you are caught.' },
  journalist: { name: 'Foreign correspondent', emoji: '📰', boost: 'field', blurb: 'Reporters ask questions for a living.' },
  consultant: { name: 'Business consultant', emoji: '💼', boost: 'tech', blurb: 'Nobody checks a consultant’s laptop twice.' },
  trader: { name: 'Import-export trader', emoji: '🚢', boost: 'handler', blurb: 'Crates, customs and plenty of cash.' },
  academic: { name: 'Visiting academic', emoji: '🎓', boost: 'analyst', blurb: 'Conferences open doors in every country.' },
  aid: { name: 'Aid worker', emoji: '🩺', boost: 'field', blurb: 'People trust the ones who bring medicine.' },
};
const SPY_COVER_IDS = Object.keys(SPY_COVERS);
const SPY_TRACKS = {
  field: { name: 'Field operations', emoji: '🕶️', skills: ['streetwise', 'martial'], blurb: 'Surveillance, break-ins and the sharp end.' },
  tech: { name: 'Technical', emoji: '💻', skills: ['coding', 'streetwise'], blurb: 'Networks, devices and things that listen.' },
  analyst: { name: 'Analysis', emoji: '🗂️', skills: ['writing', 'business'], blurb: 'Reading the room from three thousand miles away.' },
  handler: { name: 'Agent handling', emoji: '🤝', skills: ['charisma', 'acting'], blurb: 'People are the best source there is.' },
};
const SPY_TRACK_IDS = Object.keys(SPY_TRACKS);
const SPY_ROLES = ['ministry clerk', 'customs officer', 'army driver', 'embassy cook', 'newspaper editor', 'bank manager', 'colonel’s aide', 'university professor', 'dock foreman', 'telecom engineer', 'hotel concierge', 'minister’s secretary'];
CRIMES.treason = { name: 'Treason', emoji: '🕵️', minAge: 17, sentence: [10, 45], conviction: 0.9, karma: -12, felony: true, verb: 'treason' };
CRIMES.espionage = { name: 'Espionage', emoji: '🕵️', minAge: 17, sentence: [3, 14], conviction: 0.9, karma: -2, felony: false, verb: 'espionage abroad' };
CRIMES.leak = { name: 'Leaking state secrets', emoji: '📖', minAge: 17, sentence: [1, 6], conviction: 0.8, karma: -4, felony: true, verb: 'leaking state secrets' };

/* ---- accessors ------------------------------------------------------------ */
const isSpyJob = (id) => !!JOBS[id] && JOBS[id].special === 'spy';
function inAgency(s) { const c = M(s).career; return !!c && isSpyJob(c.id) && free(s); }
function spy(s) { return M(s).spy || null; }
function agencyName(s) { return SPY_AGENCIES[P(s).country] || `the ${country(s).adj} Intelligence Service`; }
function ensureSpy(s) {
  const m = M(s);
  if (!m.spy) {
    m.spy = {
      agency: agencyName(s), handle: pick(SPY_HANDLE_A) + ' ' + pick(SPY_HANDLE_B), joined: s.year, track: 'field', trained: true, cover: { id: 'consultant', strength: 100 }, heat: 0, standing: 50, desk: false,
      ok: 0, fail: 0, missions: [], assets: [], told: {}, turned: null, controlled: null, sold: 0, burned: null, burns: 0, alumni: false, left: null, disavowed: false, captive: false, defected: 0, memoir: false,
    };
  }
  return m.spy;
}
const spyAlumnus = (s) => !!spy(s) && spy(s).alumni && !spy(s).disavowed;
const spyCtx = (s) => !!spy(s) && (inAgency(s) || spy(s).alumni || !!spy(s).turned);
function coverOf(s) { return SPY_COVERS[(spy(s) || { cover: { id: 'consultant' } }).cover.id] || SPY_COVERS.consultant; }
function liveAssets(s) { return spy(s) ? spy(s).assets.filter((a) => a.state === 'active') : []; }
function vetSpyEdge(s) { const m = typeof mil === 'function' ? mil(s) : null; return m && m.vet && m.discharge !== 'dishonorable' && ['intel', 'cyber'].includes(m.spec) ? 0.15 : 0; }
function spyState(s) {
  const war = typeof activeWar === 'function' ? activeWar(s) : null;
  if (war && chance(0.5)) return { name: war.foe, adj: war.foeAdj };
  const [name, adj] = pick(FOES);
  return { name, adj };
}
const spyOdds = (o) => (o >= 0.7 ? 'Good odds' : o >= 0.5 ? 'Even odds' : o >= 0.3 ? 'Long odds' : 'Very long odds');

/* ---- recruitment ----------------------------------------------------------- */
// Called by specialApply (15-career.js). The vetting is the interview.
function spyApply(s, id) {
  const j = JOBS[id], old = spy(s);
  if (old && old.disavowed) return { text: 'The agency has a file on you. The vetting officer did not even sit down.', title: j.name, emoji: j.emoji, tone: 'bad', nolog: true };
  let odds = 0.18 + (P(s).stats.smarts - 50) / 220 + skill(s, 'streetwise') / 400 + skill(s, 'charisma') / 600 + (eduRank(s) >= 4 ? 0.05 : 0) + (M(s).karma >= 40 ? 0.04 : -0.1) + vetSpyEdge(s);
  if (old && old.alumni && !old.burned) odds += 0.2;
  if (!chance(clamp(odds, 0.04, 0.8))) {
    add(s, { happy: -4 });
    return { text: 'The vetting officer thanked you for your interest. Interest was all it was.', title: j.name, emoji: j.emoji, tone: 'bad' };
  }
  if (M(s).career) leaveJob(s, 'switched');
  hire(s, id, 0);
  startSpyCareer(s);
  return { text: `You passed the vetting. Your friends think you took a job in ${coverOf(s).name.toLowerCase()}.`, title: j.name, emoji: j.emoji, tone: 'good' };
}
// Defaults first, so a popup nobody answers still leaves a valid file.
function startSpyCareer(s) {
  const sp = ensureSpy(s);
  const back = sp.alumni;
  sp.alumni = false;
  sp.left = null;
  sp.trained = back;
  sp.desk = false;
  sp.agency = agencyName(s);
  sp.cover = { id: pick(SPY_COVER_IDS), strength: 100 };
  sp.track = pick(SPY_TRACK_IDS);
  sp.heat = back ? Math.min(sp.heat, 30) : 0;
  sp.standing = back ? Math.max(sp.standing, 45) : 50;
  const c = M(s).career;
  if (c) c.employer = sp.agency.replace(/^the /, '').replace(/^./, (x) => x.toUpperCase());
  tally(s, 'spyJoined');
  popup(s, {
    emoji: '🎭', title: 'Choose your cover', text: `Your handle is ${sp.handle}. Now: what do you tell everyone you do for a living?`, handler: 'spyCover',
    choices: SPY_COVER_IDS.map((id) => ({ label: SPY_COVERS[id].emoji + ' ' + SPY_COVERS[id].name, value: id, sub: SPY_COVERS[id].blurb })),
  });
}
onChoice('spyCover', (s, ctx, id) => {
  const sp = ensureSpy(s);
  if (SPY_COVERS[id]) sp.cover = { id, strength: 100 };
  if (sp.trained) return { text: `You are a ${coverOf(s).name.toLowerCase()} again, on paper.`, emoji: coverOf(s).emoji };
  popup(s, {
    emoji: '🎓', title: 'Choose your training', text: 'The agency academy teaches everything, but you will be known for one thing.', handler: 'spyTrack',
    choices: SPY_TRACK_IDS.map((id) => ({ label: SPY_TRACKS[id].emoji + ' ' + SPY_TRACKS[id].name, value: id, sub: SPY_TRACKS[id].blurb })),
  });
  return { text: `Cover story: ${coverOf(s).name.toLowerCase()}. Your mother will tell people at church.`, emoji: coverOf(s).emoji };
});
onChoice('spyTrack', (s, ctx, id) => {
  const sp = ensureSpy(s);
  if (SPY_TRACKS[id]) sp.track = id;
  return { text: `You signed up for ${SPY_TRACKS[sp.track].name.toLowerCase()}. Academy starts this year.`, emoji: SPY_TRACKS[sp.track].emoji };
});
function spyAcademy(s, sp) {
  sp.trained = true;
  const t = SPY_TRACKS[sp.track];
  addSkill(s, t.skills[0], randFloat(7, 12));
  addSkill(s, t.skills[1], randFloat(4, 8));
  addSkill(s, 'streetwise', randFloat(2, 5));
  add(s, { happy: -2, smarts: randInt(1, 3) });
  bodyNudge(s, { muscle: randFloat(0, 2), fat: -randFloat(0, 2) });
  log(s, `🎓 You survived the academy: dead drops, surveillance runs, and three weeks of pretending to be someone else. Your handle is ${sp.handle}.`);
}

/* ---- the working year ---------------------------------------------------------- */
function spyYear(s, c, j) {
  const sp = ensureSpy(s);
  if (!sp.trained) { spyAcademy(s, sp); return; }
  sp.cover.strength = clamp100(sp.cover.strength + (sp.heat < 40 ? 5 : 1) - randInt(0, 2)); // a quiet year lets the story settle
  // Standing: results lift it; neglect lets it sag.
  sp.standing = clamp100(sp.standing + (c.perf >= 60 ? 1 : -1));
  if (sp.standing < 15 && chance(0.3)) {
    leaveJob(s, 'fired');
    announce(s, { emoji: '📁', title: 'Let go', tone: 'bad', text: 'The agency let you go quietly, with a nondisclosure order in six places and no pension talk.' });
    return;
  }
  const pr = 0.28 + sp.standing / 300 - (sp.desk ? 0.12 : 0);
  if (c.level < j.ladder.length - 1 && c.levelYears >= 2 && c.perf >= 55 && sp.standing >= (c.level >= 3 ? 55 : 35) && chance(clamp(pr, 0.05, 0.6))) promote(s, 'The agency noticed your results.');
  checkBurn(s);
  if (sp.burned) return;
  if (sp.desk) { sp.standing = clamp100(sp.standing + 2); c.perf = clamp100(c.perf + 3); return; }
  if (chance(0.72)) offerMission(s);
}
function spyTick(s) {
  const sp = spy(s);
  if (!sp || s.dead) return;
  // A captive spy waits for an exchange.
  if (sp.captive && inPrison(s)) {
    if (chance(0.22)) { sp.captive = false; tally(s, 'swap'); release(s, 'The two governments agreed to a prisoner exchange, on a bridge, before dawn.'); }
    return;
  }
  if (!inAgency(s) && !sp.turned) { if (sp.heat > 0) sp.heat = Math.max(0, sp.heat - 8); revengeYear(s); return; }
  sp.heat = Math.max(0, sp.heat - 6);
  if (inAgency(s)) assetsYear(s, sp);
  if (sp.controlled) controlledYear(s, sp);
  if (sp.turned && !sp.burned) traitorYear(s, sp);
}

/* ---- missions -------------------------------------------------------------------- */
// ways are [label, skill, sub]. minimum: the rank (ladder index) needed to be offered it.
const SPY_MISSIONS = {
  watch: { name: 'Surveillance', emoji: '🔭', kind: 'field', min: 0, abroad: true, base: 0.55, pay: 2500, risk: 1, text: (st) => `A ${st.adj} trade official keeps meeting people nobody can explain. Find out who.`,
    ways: [['Tail them on foot', 'streetwise', 'Old-fashioned shoe leather'], ['Bug their apartment', 'coding', 'Wires, and a lot of luck'], ['Befriend their neighbor', 'charisma', 'Slow and friendly']] },
  recruit: { name: 'Recruit an asset', emoji: '🤝', kind: 'handler', min: 0, abroad: true, base: 0.48, pay: 3500, risk: 1, text: (st) => `A ${st.adj} ministry clerk has debts, a grudge and access. Turn them.`,
    ways: [['Offer cash', 'business', 'Everyone has a price'], ['Appeal to their ideals', 'charisma', 'They hate their own government'], ['Use their secret', 'streetwise', 'Leverage, bluntly']] },
  documents: { name: 'Copy the documents', emoji: '🗄️', kind: 'field', min: 1, abroad: true, base: 0.45, pay: 6000, risk: 1.4, text: (st) => `A ${st.adj} defense ministry safe holds plans we need. Get a copy and leave no trace.`,
    ways: [['Pick the lock at night', 'streetwise', 'Quiet, if you are good'], ['Talk past the guards', 'acting', 'Confidence is a uniform'], ['Hack the records system', 'coding', 'Do it from a café']] },
  cyber: { name: 'Break into a network', emoji: '💻', kind: 'tech', min: 1, abroad: true, base: 0.48, pay: 6500, risk: 1, text: (st) => `A ${st.adj} security agency runs the network behind everything. Get in.`,
    ways: [['Phish the staff', 'coding', 'The oldest trick'], ['Plant a device in the building', 'streetwise', 'Hands on'], ['Bribe a systems administrator', 'charisma', 'Cheap and noisy']] },
  infiltrate: { name: 'Infiltrate a network', emoji: '🎭', kind: 'field', min: 1, abroad: true, base: 0.42, pay: 7000, risk: 1.6, text: (st) => `A ${st.adj} smuggling ring is moving weapons across three borders. Get inside it.`,
    ways: [['Go in under a false name', 'acting', 'Be someone else'], ['Befriend a mid-level member', 'charisma', 'Patient and personal'], ['Watch from the edges', 'streetwise', 'Safer, and slower']] },
  defector: { name: 'Bring out a defector', emoji: '🚪', kind: 'handler', min: 2, abroad: true, base: 0.4, pay: 12000, risk: 1.8, text: (st) => `A senior ${st.adj} scientist wants out, tonight. Get them across the border alive.`,
    ways: [['Drive them across at night', 'driving', 'Fast and loud'], ['Forge papers, take the train', 'art', 'Slow and clean'], ['Walk them over the mountains', 'fitness', 'Hard, and unwatched']] },
  sabotage: { name: 'Sabotage a facility', emoji: '💥', kind: 'field', min: 2, abroad: true, base: 0.4, pay: 14000, risk: 2, noisy: true, text: (st) => `A ${st.adj} plant is building something that must never be finished.`,
    ways: [['Set a timer charge', 'fitness', 'Loud, and final'], ['Corrupt the control software', 'coding', 'Silent, then very loud'], ['Contaminate the fuel supply', 'streetwise', 'Messy and slow']] },
  negotiate: { name: 'Back-channel talks', emoji: '🕊️', kind: 'analyst', min: 3, abroad: true, base: 0.5, pay: 15000, risk: 1.2, text: (st) => `The government cannot be seen talking to ${st.name}. You can. Close the gap.`,
    ways: [['Make the offer in person', 'charisma', 'Look them in the eye'], ['Pass messages through a third country', 'streetwise', 'Slow and deniable'], ['Lean on what we know about them', 'business', 'Cold and effective']] },
  mole: { name: 'Hunt the mole', emoji: '🐀', kind: 'analyst', min: 2, abroad: false, base: 0.5, pay: 9000, risk: 0.6, text: () => 'Something is leaking from inside the agency. Counterintelligence has narrowed it to three people.', ways: [] },
};
const SPY_MISSION_IDS = Object.keys(SPY_MISSIONS);

function missionOdds(s, mi, i) {
  const sp = spy(s), sk = mi.ways[i][1];
  const o = mi.base + 0.05 + (skill(s, sk) - 30) / 160 + (P(s).stats.smarts - 50) / 400 + (sp.cover.strength - 60) / 400 - sp.heat / 350 + (sp.track === mi.kind ? 0.08 : 0) + (coverOf(s).boost === mi.kind ? 0.05 : 0) + (trait(s, 'cunning') ? 0.04 : 0) + (M(s).career.perf - 50) / 500;
  return clamp(o, 0.12, 0.88);
}
function offerMission(s) {
  const sp = spy(s), c = M(s).career;
  if (flag(s, 'spyMission') === s.year) return;
  const pool = SPY_MISSION_IDS.filter((id) => SPY_MISSIONS[id].min <= c.level);
  const id = weighted(pool, (x) => (SPY_MISSIONS[x].kind === sp.track ? 1.6 : 1));
  flag(s, 'spyMission', s.year);
  if (id === 'mole') return offerMole(s);
  const mi = SPY_MISSIONS[id], st = spyState(s);
  const choices = mi.ways.map((w, i) => ({ label: w[0], value: i, sub: `${w[2]} · ${spyOdds(missionOdds(s, mi, i))}` }));
  choices.push({ label: 'Decline the assignment', value: 'no', sub: 'Your handler will remember' });
  popup(s, { emoji: mi.emoji, title: `Assignment: ${mi.name}`, text: `Your handler slides a folder across the table. ${mi.text(st)} It pays ${fmtMoney(price(s, Math.round(mi.pay * (1 + c.level * 0.35))))}.`, handler: 'spyMission', ctx: { id, st }, choices });
}
onChoice('spyMission', (s, ctx, i) => {
  const sp = spy(s), c = M(s).career, mi = SPY_MISSIONS[ctx.id];
  if (!sp || !c || !mi || !isSpyJob(c.id)) return;
  if (i === 'no') { sp.standing = clamp100(sp.standing - 4); c.perf = clamp100(c.perf - 5); return 'You told your handler to find someone else. They wrote it in the file.'; }
  return runMission(s, mi, ctx.id, ctx.st, i);
});
function runMission(s, mi, id, st, i) {
  const sp = spy(s), c = M(s).career;
  const odds = missionOdds(s, mi, i), sk = mi.ways[i][1];
  const rec = { y: s.year, id, name: mi.name, state: st ? st.name : '', result: 'success' };
  sp.missions.push(rec);
  if (sp.missions.length > 40) sp.missions.shift();
  tally(s, 'spyMissions');
  addSkill(s, sk, randFloat(1, 3));
  let out = 'success';
  if (!chance(odds)) {
    const wts = { partial: 3, blown: 3, captured: mi.abroad ? 1.6 : 0, killed: 0.15 * mi.risk };
    out = weighted(Object.keys(wts).filter((k) => wts[k] > 0), (k) => wts[k]);
  }
  rec.result = out;
  const pay = price(s, Math.round(mi.pay * (1 + c.level * 0.35) * randFloat(0.8, 1.3)));
  if (out === 'killed') {
    sp.fail++;
    die(s, 'killed on an operation that officially never happened');
    return 'The operation went wrong in a way nobody was supposed to hear about.';
  }
  if (out === 'captured') {
    sp.fail++;
    tally(s, 'spyCaptured');
    popup(s, {
      emoji: '⛓️', title: 'Captured', text: `${st ? cap(st.adj) : 'Foreign'} security officers have you in a windowless room. Nobody at home knows where you are.`, handler: 'spyCaught', ctx: { st },
      choices: [
        { label: 'Claim diplomatic immunity', value: 'immunity', sub: coverOf(s).immunity ? 'Your cover supports it' : 'You have no diplomatic cover', disabled: !coverOf(s).immunity },
        { label: 'Say nothing and wait for an exchange', value: 'wait', sub: 'Your government may trade for you' },
        { label: 'Plan an escape', value: 'escape', sub: 'Risky and physical' },
        { label: 'Tell them what they want', value: 'talk', tone: 'bad', sub: 'It will cost you everything else' },
      ],
    });
    return { text: 'Your cover held for about nine seconds.', title: mi.name, emoji: '⛓️', tone: 'bad' };
  }
  if (out === 'blown') {
    sp.fail++;
    sp.cover.strength = clamp100(sp.cover.strength - randInt(12, 26));
    sp.heat = clamp100(sp.heat + randInt(10, 22));
    sp.standing = clamp100(sp.standing - 5);
    c.perf = clamp100(c.perf - 6);
    add(s, { happy: -3 });
    checkBurn(s);
    return { text: `Something went wrong with ${mi.name.toLowerCase()}, and somebody saw your face. You got out, but your cover took the damage.`, title: mi.name, emoji: mi.emoji, tone: 'bad' };
  }
  if (out === 'partial') {
    add(s, { money: Math.round(pay / 3) });
    sp.standing = clamp100(sp.standing + 2);
    sp.heat = clamp100(sp.heat + randInt(5, 10));
    c.perf = clamp100(c.perf + 2);
    checkBurn(s);
    return { text: `You got part of what the agency wanted from ${mi.name.toLowerCase()}. The rest got away. Bonus: ${fmtMoney(Math.round(pay / 3))}.`, title: mi.name, emoji: mi.emoji };
  }
  // Success.
  sp.ok++;
  tally(s, 'spyOk');
  add(s, { money: pay });
  sp.standing = clamp100(sp.standing + randInt(5, 11));
  c.perf = clamp100(c.perf + 8);
  sp.heat = clamp100(sp.heat + randInt(2, 7) * (mi.noisy ? 2 : 1));
  sp.cover.strength = clamp100(sp.cover.strength - randInt(1, 5));
  const lines = [`${mi.name} came off clean. The agency paid ${fmtMoney(pay)}.`];
  if (id === 'recruit') { const a = makeAsset(s, st); lines.push(`${a.name}, a ${a.role}, is now yours.`); }
  if (id === 'defector') { add(s, { karma: 4, happy: 4 }); lines.push('The scientist cried at the border post.'); }
  if (id === 'sabotage') { add(s, { karma: -3 }); sp.heat = clamp100(sp.heat + 8); lines.push('The fire was visible from the highway.'); }
  if (id === 'negotiate') { add(s, { karma: 3 }); lines.push('A war was avoided. No one will ever know.'); }
  if (id === 'documents' || id === 'cyber') sp.standing = clamp100(sp.standing + 3);
  checkBurn(s);
  if (!s.dead && !sp.burned && chance(0.35)) spyTwistPopup(s);
  return { text: lines.join(' '), title: mi.name, emoji: mi.emoji, tone: 'good' };
}
function checkBurn(s) {
  const sp = spy(s);
  if (!sp || sp.burned || !inAgency(s)) return;
  if (sp.cover.strength <= 0 || sp.heat >= 100) burnSpy(s, sp.heat >= 100 ? 'hunted' : 'blown');
}

/* ---- the mole hunt ---------------------------------------------------------------- */
const MOLE_CLUES = ['has been working late with the door closed', 'has a bank account nobody can explain', 'made three trips abroad that are not on the schedule', 'keeps asking about files outside their desk', 'was seen meeting a stranger in the park'];
const MOLE_ALIBIS = ['was at their daughter’s recital all week', 'turned out to be seeing a doctor in secret', 'was quietly interviewing for a private job', 'is just a night owl with a chaotic schedule', 'had a quiet family reason for the trips'];
function offerMole(s) {
  const real = chance(0.8);
  const crew = [0, 1, 2].map(() => { const q = makeAdultNear(s, { minAge: Math.max(24, A(s) - 8), maxAge: A(s) + 15 }); setRel(s, q.id, 'coworker', randInt(35, 65)); return q; });
  const moleIdx = real ? randInt(0, 2) : -1;
  const sharp = clamp(0.45 + (P(s).stats.smarts - 50) / 150 + skill(s, 'streetwise') / 400, 0.45, 0.9);
  const suspect = crew.map((q, i) => (i === moleIdx ? chance(sharp) : chance(0.28)));
  const choices = crew.map((q, i) => ({ label: `Accuse ${q.first} ${q.last}`, value: i, sub: `${q.first} ${suspect[i] ? MOLE_CLUES[randInt(0, MOLE_CLUES.length - 1)] : MOLE_ALIBIS[randInt(0, MOLE_ALIBIS.length - 1)]}` }));
  choices.push({ label: 'Report there is no mole', value: 'none', sub: 'A false alarm, you suspect' });
  popup(s, { emoji: '🐀', title: 'Assignment: Hunt the mole', text: SPY_MISSIONS.mole.text(), handler: 'spyMole', ctx: { ids: crew.map((q) => q.id), moleIdx, names: crew.map((q) => q.first + ' ' + q.last) }, choices });
}
onChoice('spyMole', (s, ctx, v) => {
  const sp = spy(s), c = M(s).career;
  if (!sp || !c || !isSpyJob(c.id)) return;
  const mi = SPY_MISSIONS.mole, pay = price(s, Math.round(mi.pay * (1 + c.level * 0.35)));
  const rec = { y: s.year, id: 'mole', name: mi.name, state: '', result: 'success' };
  sp.missions.push(rec);
  tally(s, 'spyMissions');
  const right = v === 'none' ? ctx.moleIdx < 0 : v === ctx.moleIdx;
  if (right) {
    sp.ok++;
    tally(s, 'spyOk');
    if (ctx.moleIdx >= 0) { tally(s, 'moleCaught'); add(s, { money: pay, karma: 2 }); sp.standing = clamp100(sp.standing + 10); c.perf = clamp100(c.perf + 10); return { text: `${ctx.names[ctx.moleIdx]} was the one. Security led them out of the building in front of everyone. You got ${fmtMoney(pay)} and a quiet nod from the director.`, title: 'Mole caught', emoji: '🐀', tone: 'good' }; }
    add(s, { money: Math.round(pay / 2) });
    sp.standing = clamp100(sp.standing + 4);
    return { text: 'You reported that the leak was nothing more than careless filing. Everyone slept better, and you were right.', title: 'No mole', emoji: '🗂️', tone: 'good' };
  }
  rec.result = 'blown';
  sp.fail++;
  sp.standing = clamp100(sp.standing - 8);
  c.perf = clamp100(c.perf - 8);
  add(s, { karma: -3, happy: -4 });
  sp.heat = clamp100(sp.heat + 10);
  if (v !== 'none' && ctx.ids[v] && s.people[ctx.ids[v]]) { addRel(s, ctx.ids[v], -40); return { text: `You accused ${ctx.names[v]}, and you were wrong. An innocent career ended and the real leak is still out there.`, title: 'Wrong person', emoji: '🐀', tone: 'bad' }; }
  return { text: 'You reported there was no mole, and a month later the leak was back. Your name is on the first report.', title: 'Missed it', emoji: '🐀', tone: 'bad' };
});

/* ---- twists: the thing that happens on the way home --------------------------------------- */
const SPY_TWISTS = [
  { id: 'tail', emoji: '🚗', title: 'Followed', text: () => 'A gray car has been behind you for three blocks.',
    choices: [
      ['Lose them in the market', (s) => (chance(clamp(0.35 + skill(s, 'streetwise') / 150, 0.2, 0.85)) ? (spy(s).heat = Math.max(0, spy(s).heat - 6), 'You went in the front of a fish stall and out the back. The car circled twice and gave up.') : (spy(s).heat = clamp100(spy(s).heat + 10), spy(s).cover.strength = clamp100(spy(s).cover.strength - 8), 'You ducked into the market and they were still behind you at the other end.')), 'Streetwise'],
      ['Lead them to a safe house', (s) => { if (chance(0.5)) { spy(s).standing = clamp100(spy(s).standing - 3); return 'The safe house was compromised the moment you walked in. The agency will not forget the bill.'; } return 'They followed you to the house. They also followed you out of it, and went home.'; }, 'Gamble'],
      ['Confront them', (s) => (chance(clamp(0.3 + skill(s, 'martial') / 200, 0.15, 0.7)) ? (add(s, { happy: 2 }), 'Two quick words and a hand on a collar. They have not bothered you since.') : (add(s, { health: -10 }), spy(s).heat = clamp100(spy(s).heat + 12), 'They were not alone. You woke up with a headache and a very annoyed handler.')), 'Direct'],
    ] },
  { id: 'honeytrap', emoji: '🥂', title: 'The stranger at the bar', text: () => 'At the hotel bar, someone you have never met knows your name. Your cover name.',
    choices: [
      ['Walk away', () => 'You paid for your drink, said goodnight and checked the room for cameras.', 'Safe'],
      ['Play along to learn more', (s) => (chance(clamp(0.3 + skill(s, 'charisma') / 150 + skill(s, 'acting') / 300, 0.2, 0.8)) ? (spy(s).standing = clamp100(spy(s).standing + 5), spy(s).heat = clamp100(spy(s).heat + 8), 'They worked for the other side, and so did the drinks. You learned more than they did.') : (spy(s).cover.strength = clamp100(spy(s).cover.strength - 20), add(s, { karma: -2 }), 'It was a trap, and you walked in smiling. By morning they had photographs.')), 'Risky'],
      ['Report to your handler', (s) => { spy(s).standing = clamp100(spy(s).standing + 2); return 'Your handler thanked you, then spent a week working out what the other side wanted.'; }, 'By the book'],
    ] },
  { id: 'envelope', emoji: '✉️', title: 'Sealed envelope', text: () => 'A sealed envelope waits in your hotel room. No sender. It names a senior colleague as a traitor.',
    choices: [
      ['Take it to the director', (s) => { if (chance(0.5)) { spy(s).standing = clamp100(spy(s).standing + 8); return 'It was genuine. The director thanked you in a voice that said it was never to be mentioned.'; } spy(s).standing = clamp100(spy(s).standing - 6); return 'It was a forgery meant to frame a loyal officer. Somehow you are the one who looks gullible.'; }, 'Honest'],
      ['Burn it', () => 'You burned it in the bathroom sink and ran the tap. You told no one.', 'Quiet'],
      ['Investigate first', (s) => (chance(clamp(0.35 + skill(s, 'streetwise') / 200, 0.2, 0.75)) ? (spy(s).standing = clamp100(spy(s).standing + 6), 'It took a week. By the end you could prove it was a fake, and who sent it.') : (spy(s).heat = clamp100(spy(s).heat + 8), 'You asked questions in the wrong places. Someone has noticed that you ask questions.')), 'Careful'],
    ] },
  { id: 'border', emoji: '🛂', title: 'The border post', text: () => 'The border guard holds your passport up to the light, then looks at you for a long time.',
    choices: [
      ['Stay calm', (s) => (chance(clamp(0.45 + skill(s, 'acting') / 200, 0.3, 0.9)) ? 'The stamp came down. You did not breathe out until the train was moving.' : (spy(s).heat = clamp100(spy(s).heat + 12), 'They let you through, and they wrote your name down first.')), 'Acting'],
      ['Offer a small bribe', (s) => { const b = price(s, 400); if (!pay(s, b)) return 'You had no money to offer, which made things worse.'; add(s, { karma: -1 }); return `You slid ${fmtMoney(b)} inside the passport. The guard yawned and stamped it.`; }, 'Fast'],
      ['Claim your cover’s privileges', (s) => (coverOf(s).immunity ? (spy(s).cover.strength = clamp100(spy(s).cover.strength - 5), 'The diplomatic pouch worked its usual magic. You were waved through.') : (spy(s).cover.strength = clamp100(spy(s).cover.strength - 10), 'Your cover does not carry that kind of authority. The guard said so, loudly.')), 'Pulling rank'],
    ] },
  { id: 'asset_child', emoji: '🩺', title: 'A debt of honor', when: (s) => liveAssets(s).length > 0, text: (s) => `Your asset ${liveAssets(s)[0].name} tells you their child needs an operation the family cannot afford.`,
    choices: [
      ['Pay from your own pocket', (s) => { const a = liveAssets(s)[0], b = price(s, 8000); if (!pay(s, b)) return `You could not raise ${fmtMoney(b)}. ${a.name} understood, and you both pretended it was fine.`; a.loyalty = clamp100(a.loyalty + 25); add(s, { karma: 5, happy: 3 }); return `You paid ${fmtMoney(b)}. ${a.name} will never say it out loud, but you own a lifelong friend.`; }, 'Generous'],
      ['Ask the agency to cover it', (s) => { const a = liveAssets(s)[0]; spy(s).standing = clamp100(spy(s).standing - 3); a.loyalty = clamp100(a.loyalty + 10); return 'The agency approved half of it and called it an operating expense.'; }, 'Official'],
      ['Use it as leverage', (s) => { const a = liveAssets(s)[0]; a.value = Math.min(3, a.value + 1); a.loyalty = clamp100(a.loyalty - 20); add(s, { karma: -4 }); return `${a.name} gave you more than you asked for. They will not forget how.`; }, 'Cold'],
    ] },
  { id: 'abandon', emoji: '📛', title: 'Burn the source', when: (s) => liveAssets(s).length > 0, text: (s) => `Your handler orders you to drop ${liveAssets(s)[0].name} to protect a bigger operation. The other side is closing in.`,
    choices: [
      ['Obey', (s) => { const a = liveAssets(s)[0]; a.state = 'burned'; tally(s, 'assetsLost'); spy(s).standing = clamp100(spy(s).standing + 3); add(s, { karma: -4 }); return `You went silent. A week later you heard what happened to ${a.name}.`; }, 'Orders'],
      ['Refuse and extract them', (s) => { const a = liveAssets(s)[0], b = price(s, 5000); pay(s, b); a.state = 'extracted'; spy(s).standing = clamp100(spy(s).standing - 6); add(s, { karma: 4 }); return `You pulled ${a.name} out through a back door and got a written warning for it.`; }, 'Costs money and standing'],
      ['Warn them quietly', (s) => { const a = liveAssets(s)[0]; a.state = 'dropped'; add(s, { karma: 2 }); spy(s).heat = clamp100(spy(s).heat + 6); return `You left a note where only ${a.name} would find it. By morning they were gone, and no one asked you.`; }, 'A quiet mercy'],
    ] },
];
function spyTwistPopup(s) {
  const t = pick(SPY_TWISTS.filter((x) => !x.when || x.when(s)));
  popup(s, { emoji: t.emoji, title: t.title, text: t.text(s), handler: 'spyTwist', ctx: { id: t.id }, choices: t.choices.map((ch, i) => ({ label: ch[0], value: i, sub: ch[2] || '' })) });
}
onChoice('spyTwist', (s, ctx, i) => {
  const t = SPY_TWISTS.find((x) => x.id === ctx.id), sp = spy(s);
  if (!t || !sp) return;
  const ch = t.choices[i] || t.choices[0];
  const text = ch[1](s);
  checkBurn(s);
  return { text, title: t.title, emoji: t.emoji };
});

/* ---- captured -------------------------------------------------------------------------------- */
onChoice('spyCaught', (s, ctx, v) => {
  const sp = spy(s), c = M(s).career;
  if (!sp) return;
  const trial = (lead) => { sp.captive = true; sp.cover.strength = 0; return sentence(s, 'espionage', 1, lead); };
  if (v === 'immunity') {
    if (chance(0.85)) {
      tally(s, 'immunity');
      sp.cover.strength = 0;
      sp.heat = clamp100(sp.heat + 30);
      add(s, { happy: -4 });
      burnSpy(s, 'expelled');
      return { text: 'The ambassador arrived within the hour. You were declared persona non grata and put on the next flight home.', title: 'Expelled', emoji: '🛂', tone: 'good' };
    }
    return trial('They did not honor your papers.');
  }
  if (v === 'escape') {
    if (chance(clamp(0.2 + skill(s, 'fitness') / 250 + skill(s, 'streetwise') / 300 + skill(s, 'martial') / 400, 0.1, 0.65))) {
      sp.standing = clamp100(sp.standing + 10);
      sp.heat = clamp100(sp.heat + 25);
      add(s, { health: -10, happy: 8 });
      tally(s, 'spyEscape');
      return { text: 'You slipped your cuffs on a broken radiator pipe, climbed out a bathroom window and walked three nights to the border.', title: 'Escaped', emoji: '🏃', tone: 'good' };
    }
    add(s, { health: -20, happy: -8 });
    return trial('The escape failed, and it cost you two ribs.');
  }
  if (v === 'talk') {
    sp.standing = clamp100(sp.standing - 25);
    add(s, { karma: -6, happy: -10 });
    sp.turned = { state: (ctx.st && ctx.st.name) || 'a rival service', since: s.year, forced: true };
    tally(s, 'turned');
    sp.heat = clamp100(sp.heat + 20);
    return { text: 'You talked. They were kind about it, in the way people are when they are about to ask for more. You walked out with a phone number and a debt.', title: 'Released', emoji: '📞', tone: 'bad' };
  }
  // Wait for an exchange.
  add(s, { health: -8, happy: -10 });
  if (chance(0.55)) {
    sp.standing = clamp100(sp.standing + 6);
    add(s, { karma: 2 });
    tally(s, 'swap');
    return { text: 'You kept your mouth shut for four months. In the end you walked across a bridge in borrowed shoes, traded for a man you never met.', title: 'Exchanged', emoji: '🕊️', tone: 'good' };
  }
  return trial('Nobody traded for you.');
});

/* ---- getting burned --------------------------------------------------------------------------- */
function burnSpy(s, how) {
  const sp = spy(s), c = M(s).career;
  if (!sp || !c || !isSpyJob(c.id) || sp.burned) return;
  sp.burned = { year: s.year, how };
  sp.burns++;
  tally(s, 'burned');
  sp.cover.strength = 0;
  const text = { blown: 'Your face is in a foreign file now. Your cover is gone.', hunted: 'Three services know your name. You cannot work in the field again as you are.', expelled: 'You are known to everyone as the diplomat who was expelled.' }[how];
  announce(s, {
    emoji: '🔥', title: 'Burned', tone: 'bad', text: `${text} The agency wants to know what happens next.`, handler: 'spyBurn',
    choices: [
      { label: 'Ask for a new identity', value: 'newface', sub: 'A new cover, a lower rank, a lot of paperwork', disabled: sp.standing < 35 },
      { label: 'Take a desk at headquarters', value: 'desk', sub: 'Safe, and slower' },
      { label: 'Resign quietly', value: 'resign', sub: 'A nondisclosure order and your pension rights' },
      { label: 'Go public', value: 'public', tone: 'bad', sub: 'A tell-all. The agency will not like it.' },
    ],
  });
}
onChoice('spyBurn', (s, ctx, v) => {
  const sp = spy(s), c = M(s).career;
  if (!sp || !c || !isSpyJob(c.id)) return;
  const famFall = () => { for (const p of relPeople(s, ['spouse', 'partner', 'parent', 'child', 'sibling'])) if (chance(0.5)) addRel(s, p.id, -randInt(4, 12)); };
  if (v === 'newface') {
    sp.burned = null;
    sp.cover = { id: pick(SPY_COVER_IDS), strength: 70 };
    sp.heat = 35;
    if (c.level > 0) { c.level--; c.salary = salaryFor(s, c.id, c.level); }
    c.perf = clamp100(c.perf - 10);
    return { text: `Plastic surgeons, a new passport and a new life story. You are a ${coverOf(s).name.toLowerCase()} now, and you hope this one lasts.`, title: 'New identity', emoji: '🎭' };
  }
  if (v === 'desk') {
    sp.burned = null;
    sp.desk = true;
    sp.cover = { id: sp.cover.id, strength: 40 };
    sp.heat = 40;
    return 'You swapped your passport for a headquarters pass. It is dull and it is safe.';
  }
  if (v === 'public') {
    famFall();
    leaveJob(s, 'quit');
    return writeMemoir(s, 'tellall');
  }
  famFall();
  leaveJob(s, 'quit');
  return { text: 'You signed the papers and turned in your badge. A man you had never seen thanked you for your service.', title: 'Resigned', emoji: '📁' };
});

// Foreign services remember who burned them.
function revengeYear(s) {
  const sp = spy(s);
  if (!sp || !sp.burned || s.year - sp.burned.year > 10 || !chance(0.06)) return;
  popup(s, {
    emoji: '🕶️', title: 'Watched', text: 'The same two men have been at the café across the street every morning for a week. They do not order coffee.', handler: 'spyRevenge',
    choices: [{ label: 'Hire private security', value: 'guard', sub: fmtMoney(price(s, 6000)) }, { label: 'Move away for a while', value: 'move', sub: fmtMoney(price(s, 3000)) }, { label: 'Ignore it', value: 'ignore', tone: 'bad' }],
  });
}
onChoice('spyRevenge', (s, ctx, v) => {
  const sp = spy(s);
  if (v === 'guard') { const b = price(s, 6000); if (!pay(s, b)) return cantAfford(b); sp.burned.year = s.year - 8; return 'The guards look like they were built from two refrigerators. The men at the café went home.'; }
  if (v === 'move') { const b = price(s, 3000); if (!pay(s, b)) return cantAfford(b); add(s, { happy: -2 }); sp.burned.year = s.year - 6; return 'You rented a cabin and did not use your own name. A month later, the men were gone.'; }
  if (chance(0.08)) { die(s, 'killed in a hit-and-run that police called an accident'); return 'The car came out of nowhere.'; }
  if (chance(0.3)) { add(s, { health: -15, happy: -6 }); getSick(s, 'broken_leg'); return 'A car mounted the curb outside your house. You live, but not unscathed.'; }
  return 'You waited. Nothing happened, which is not the same thing as safety.';
});

/* ---- assets ----------------------------------------------------------------------------------- */
function makeAsset(s, st) {
  const sp = spy(s), cc = pick(Object.keys(COUNTRIES)), C = COUNTRIES[cc];
  const a = { id: uid(s, 'a'), name: pick(chance(0.5) ? C.m : C.f) + ' ' + pick(C.last), role: pick(SPY_ROLES), state: 'active', loyalty: randInt(45, 70), value: randInt(1, 3), since: s.year, adj: st ? st.adj : 'foreign' };
  const live = sp.assets.filter((x) => x.state === 'active');
  if (live.length >= 6) live.sort((x, y) => x.loyalty - y.loyalty)[0].state = 'dropped';
  sp.assets.push(a);
  tally(s, 'assetsRecruited');
  return a;
}
function assetsYear(s, sp) {
  for (const a of sp.assets) {
    if (a.state !== 'active') continue;
    a.loyalty = clamp100(a.loyalty + randInt(-8, 4));
    if (!sp.desk && chance(a.value * 0.18 + a.loyalty / 600)) {
      const p = price(s, 1200 * a.value);
      add(s, { money: p });
      sp.standing = clamp100(sp.standing + a.value);
      log(s, `📂 ${a.name} passed you a report from ${a.adj === 'foreign' ? 'abroad' : 'a ' + a.adj + ' source'}. The agency paid ${fmtMoney(p)}.`);
    }
    if (a.loyalty < 15 && chance(0.3)) { a.state = 'turned'; sp.standing = clamp100(sp.standing - 6); sp.heat = clamp100(sp.heat + 10); log(s, `🔁 ${a.name} was feeding you what the other side wanted you to hear.`, 'bad'); continue; }
    if (chance(0.03 + sp.heat / 700 + (a.loyalty < 30 ? 0.06 : 0))) {
      a.state = chance(0.35) ? 'dead' : 'burned';
      tally(s, 'assetsLost');
      sp.heat = clamp100(sp.heat + 10);
      add(s, { happy: -4, karma: a.state === 'dead' ? -1 : 0 });
      log(s, a.state === 'dead' ? `🕯️ ${a.name} disappeared, and the news confirmed what that meant.` : `📛 ${a.name} was arrested by ${a.adj} security. Your network has a hole in it.`, 'bad');
    }
  }
}
defAction({
  id: 'spy_assets', cat: 'spy', label: 'Handle an asset', emoji: '🗝️', desc: 'Meet, pay or extract the people you run.', when: (s) => inAgency(s) && !spy(s).desk && liveAssets(s).length > 0,
  run: (s) => {
    popup(s, {
      emoji: '🗝️', title: 'Which asset?', text: 'Your network.', handler: 'spyAssetPick',
      choices: liveAssets(s).map((a) => ({ label: `${a.name}, ${a.role}`, value: a.id, sub: `Loyalty ${a.loyalty}% · worth ${'★'.repeat(a.value)}` })).concat([{ label: 'Never mind', value: null }]),
    });
  },
});
onChoice('spyAssetPick', (s, ctx, id) => {
  const a = liveAssets(s).find((x) => x.id === id);
  if (!a) return;
  popup(s, {
    emoji: '🗝️', title: a.name, text: `${cap(a.role)}. Loyalty ${a.loyalty}%.`, handler: 'spyAssetDo', ctx: { id },
    choices: [
      { label: 'Meet in person', value: 'meet', sub: fmtMoney(price(s, 300)) + ' · risk of being seen' },
      { label: 'Pay a bonus', value: 'bonus', sub: fmtMoney(price(s, 4000)) },
      { label: 'Extract them', value: 'extract', sub: fmtMoney(price(s, 15000)) + ' · they come home safe' },
      { label: 'Cut them loose', value: 'drop', tone: 'bad', sub: 'They are on their own' },
    ],
  });
});
onChoice('spyAssetDo', (s, ctx, v) => {
  const sp = spy(s), a = sp && sp.assets.find((x) => x.id === ctx.id && x.state === 'active');
  if (!a) return;
  if (v === 'meet') {
    const b = price(s, 300);
    if (bump(s, 'assetmeet') > 2) return { text: 'You have met enough this year. Repeats draw eyes.', nolog: true };
    if (!pay(s, b)) return cantAfford(b);
    a.loyalty = clamp100(a.loyalty + randInt(10, 18));
    sp.heat = clamp100(sp.heat + randInt(1, 4));
    return `You met ${a.name} at the usual place. A fresh set of names and a short, warm handshake.`;
  }
  if (v === 'bonus') { const b = price(s, 4000); if (!pay(s, b)) return cantAfford(b); a.loyalty = clamp100(a.loyalty + 20); return `${a.name} counted the envelope twice. Loyalty bought, for now.`; }
  if (v === 'extract') {
    const b = price(s, 15000);
    if (!pay(s, b)) return cantAfford(b);
    a.state = 'extracted';
    add(s, { karma: 6, happy: 4 });
    sp.standing = clamp100(sp.standing + 2);
    return { text: `${a.name} and family got new papers and a new home. Your network lost a source, and you gained a friend.`, emoji: '🛬', tone: 'good' };
  }
  a.state = 'dropped';
  add(s, { karma: -4 });
  return `You cut ${a.name} loose. You did not look back, and that is the part that bothers you.`;
});

/* ---- double agents ------------------------------------------------------------------------------- */
function becomeTraitor(s, state, forced) {
  const sp = spy(s);
  sp.turned = { state, since: s.year, forced: !!forced };
  tally(s, 'turned');
  sp.sold++;
  add(s, { karma: -6 });
}
function traitorYear(s, sp) {
  const t = sp.turned;
  const c = M(s).career;
  const pay = price(s, randInt(12000, 40000) * (c ? 1 + c.level * 0.4 : 1));
  add(s, { money: pay, karma: -1 });
  log(s, `🕶️ ${cap(t.state)} paid you ${fmtMoney(pay)} for what you carried out of the building.`);
  const odds = clamp(0.06 + sp.heat / 500 + (s.year - t.since) * 0.01 - (trait(s, 'cunning') ? 0.03 : 0) - skill(s, 'streetwise') / 1500, 0.03, 0.4);
  if (chance(odds)) exposeTraitor(s);
}
function exposeTraitor(s) {
  const sp = spy(s);
  if (!sp || !sp.turned) return;
  const lawyer = price(s, 30000);
  popup(s, {
    emoji: '🚨', title: 'Exposed', text: 'Counterintelligence has your bank records, a camera angle and a patient look. They are waiting in the lobby.', handler: 'spyExposed',
    choices: [
      { label: 'Run for the border', value: 'flee', sub: 'Defect, and live under a new name' },
      { label: 'Confess and cut a deal', value: 'deal', sub: 'A lighter sentence, and a short future' },
      { label: 'Fight it in court', value: 'fight', sub: fmtMoney(lawyer) + ' · likely to lose', disabled: M(s).money < lawyer },
    ],
  });
}
onChoice('spyExposed', (s, ctx, v) => {
  const sp = spy(s);
  if (!sp) return;
  sp.disavowed = true;
  const t = sp.turned;
  sp.turned = null;
  const treason = (mult, lead) => { if (M(s).career) leaveJob(s, 'fired'); return sentence(s, 'treason', mult, lead); };
  if (v === 'flee') {
    const bonus = price(s, 120000);
    add(s, { money: bonus, karma: -15, happy: -10 });
    for (const p of relPeople(s, ['spouse', 'partner', 'parent', 'child', 'sibling'])) addRel(s, p.id, -randInt(10, 25));
    if (M(s).career) leaveJob(s, 'defected');
    M(s).wanted = 30;
    sp.defected = s.year;
    tally(s, 'defected');
    return { text: `You crossed the river at night with a bag of files. ${cap(t.state)} gave you ${fmtMoney(bonus)} and a new name. At home, you are a headline.`, title: 'Defected', emoji: '🛫', tone: 'bad' };
  }
  if (v === 'fight') {
    const cost = price(s, 30000);
    if (!pay(s, cost)) return treason(1, 'You could not pay the lawyer.');
    if (chance(0.2)) { add(s, { happy: 6 }); if (M(s).career) { M(s).career.perf = clamp100(M(s).career.perf - 30); } return { text: 'The evidence was thin in the one place that mattered. The charges were dropped. The agency let you go all the same.', title: 'Acquitted', emoji: '⚖️', tone: 'good' }; }
    return treason(0.9, 'A closed court found you guilty.');
  }
  return treason(0.5, 'You confessed and gave up everything you knew.');
});
// A double the agency runs: you pretend to sell, the agency feeds you what to pass over.
function controlledYear(s, sp) {
  const d = sp.controlled;
  sp.standing = clamp100(sp.standing + 3);
  add(s, { money: price(s, 6000) });
  if (chance(0.06 + sp.heat / 800)) {
    sp.controlled = null;
    sp.heat = clamp100(sp.heat + 25);
    sp.cover.strength = clamp100(sp.cover.strength - 15);
    announce(s, { emoji: '🎭', title: 'The game is up', tone: 'bad', text: `${cap(d.state)} worked out that you were feeding them what your agency wanted. The double game is over, and they know your face.` });
    checkBurn(s);
  }
}
defAction({
  id: 'spy_sell', cat: 'spy', label: 'Sell a secret', emoji: '💰', desc: 'Pass something to a rival service for cash. It is treason.', when: (s) => inAgency(s) && !spy(s).desk && M(s).career.level >= 1 && !spy(s).turned,
  run: (s) => {
    const sp = spy(s), c = M(s).career;
    if (bump(s, 'spysell') > 1) return { text: 'You have already made contact this year.', nolog: true };
    const [name] = pick(FOES);
    const pay = price(s, randInt(25000, 70000) * (1 + c.level * 0.3));
    add(s, { money: pay, karma: -8 });
    sp.sold++;
    sp.heat = clamp100(sp.heat + 8);
    tally(s, 'sold');
    if (chance(clamp(0.1 + sp.sold * 0.07 + sp.heat / 500, 0.1, 0.55))) { sp.turned = { state: name, since: s.year, forced: false }; exposeTraitor(s); return { text: `You passed a folder to ${name}. Someone was photographing the meeting.`, emoji: '📸', tone: 'bad' }; }
    return { text: `You passed a folder to ${name} and took ${fmtMoney(pay)} in an envelope. Nobody saw. You were not sure that was a relief.`, title: 'Sold', emoji: '💰', tone: 'bad' };
  },
});
defAction({
  id: 'spy_defect', cat: 'spy', label: 'Defect', emoji: '🛫', desc: 'Run for good, with everything you know.', when: (s) => spyCtx(s) && !!spy(s).turned && free(s) && !spy(s).defected,
  run: (s) => { const sp = spy(s); sp.disavowed = true; return HANDLERS.spyExposed(s, {}, 'flee'); },
});

/* ---- other actions ---------------------------------------------------------------------------------- */
const spyAgent = (s) => inAgency(s) && !!spy(s);
defAction({
  id: 'spy_train', cat: 'spy', label: 'Practice tradecraft', emoji: '🧭', desc: 'Surveillance runs, lock picks and memory drills.', when: spyAgent,
  run: (s) => {
    const n = bump(s, 'spytrain'), sp = spy(s), t = SPY_TRACKS[sp.track];
    addSkill(s, t.skills[0], randFloat(2, 4) / n);
    addSkill(s, pick(['streetwise', 'charisma', 'acting', 'coding', 'martial']), randFloat(1, 2.5) / n);
    M(s).career.perf = clamp100(M(s).career.perf + randInt(2, 5) / n);
    return vary('You {ran a surveillance route around the city|practiced picking a lock in the dark|memorized a plate number from the other side of the street|spent a night learning a new accent}.');
  },
});
defAction({
  id: 'spy_cover', cat: 'spy', label: 'Maintain your cover', emoji: '🎭', desc: 'Keep the story alive: business cards, a real office, a few real clients.', when: spyAgent,
  sub: (s) => fmtMoney(price(s, 1500)),
  run: (s) => {
    const b = price(s, 1500), sp = spy(s);
    if (bump(s, 'spycover') > 2) return { text: 'Any more and it would look like effort.', nolog: true };
    if (!pay(s, b)) return cantAfford(b);
    sp.cover.strength = clamp100(sp.cover.strength + randInt(14, 24));
    if (sp.burned) return 'You tried. A burned cover does not heal; it only gets quieter.';
    return `You took a call as a ${coverOf(s).name.toLowerCase()}, wrote a few believable emails and picked up a real client. Your story is healthier.`;
  },
});
defAction({
  id: 'spy_lielow', cat: 'spy', label: 'Lie low', emoji: '🛋️', desc: 'Disappear for a while. Heat falls faster.', when: (s) => spyAgent(s) && spy(s).heat > 5,
  run: (s) => {
    if (bump(s, 'spylielow') > 1) return { text: 'You are already lying low.', nolog: true };
    const sp = spy(s);
    sp.heat = Math.max(0, sp.heat - randInt(8, 15));
    M(s).career.perf = clamp100(M(s).career.perf - 4);
    return 'You took a week at a cousin’s lake house and answered no calls. It was the best week in months.';
  },
});
defAction({
  id: 'spy_desk', cat: 'spy', label: (s) => (spy(s) && spy(s).desk ? 'Ask for field work again' : 'Ask for a desk job'), emoji: '🗃️', desc: 'Trade assignments for safety, or the other way round.', when: spyAgent,
  run: (s) => {
    const sp = spy(s);
    if (bump(s, 'spydesk') > 1) return { text: 'You already asked this year.', nolog: true };
    sp.desk = !sp.desk;
    if (!sp.desk) return 'You asked for the field and your handler smiled the way a cat does.';
    return 'You took a desk at headquarters. No more assignments, no more risk, and slower promotion.';
  },
});
defAction({
  id: 'spy_tell', cat: 'spy', label: 'Tell your partner the truth', emoji: '🤫', desc: 'Break the oath for the person you love.', when: (s) => spyCtx(s) && !!romanticId(s) && !spy(s).told[romanticId(s)],
  run: (s) => {
    const sp = spy(s), pid = romanticId(s);
    sp.told[pid] = true;
    addRel(s, pid, randInt(12, 22));
    add(s, { happy: 6 });
    if (inAgency(s) && chance(0.35)) { sp.standing = clamp100(sp.standing - 8); sp.cover.strength = clamp100(sp.cover.strength - 10); return { text: `You told ${nm(s, pid)} everything. A week later your handler asked, very politely, how you thought the agency would feel about that.`, person: pid }; }
    return { text: `You told ${nm(s, pid)} what you really do. They went quiet, then laughed, then asked a hundred questions.`, person: pid };
  },
});
defAction({
  id: 'spy_memoir', cat: 'spy', label: 'Write a memoir', emoji: '📖', desc: 'The truth about what you did, for money. Lawyers will notice.', when: (s) => !!spy(s) && free(s) && !spy(s).memoir && !inAgency(s) && (spy(s).alumni || !!spy(s).burned || !!spy(s).defected || !!spy(s).disavowed),
  run: (s) => {
    popup(s, {
      emoji: '📖', title: 'What kind of book?', text: 'Agencies tend to read memoirs before the public does.', handler: 'spyMemoir',
      choices: [
        { label: 'A full tell-all', value: 'tellall', tone: 'bad', sub: 'Names, dates, operations · high income, high legal risk' },
        { label: 'A sanitized memoir', value: 'clean', sub: 'Cleared by the agency · modest income' },
        { label: 'A spy novel', value: 'novel', sub: 'Thinly veiled and safe · decent income' },
        { label: 'Never mind', value: null },
      ],
    });
  },
});
onChoice('spyMemoir', (s, ctx, v) => (v ? writeMemoir(s, v) : undefined));
function writeMemoir(s, kind) {
  const sp = ensureSpy(s);
  sp.memoir = true;
  tally(s, 'memoir');
  const base = { tellall: 120000, clean: 25000, novel: 60000 }[kind];
  const income = price(s, Math.round(base * (1 + M(s).fame / 100 + skill(s, 'writing') / 100) * randFloat(0.6, 1.5)));
  add(s, { money: income, fame: { tellall: randInt(8, 20), clean: randInt(2, 6), novel: randInt(3, 9) }[kind], karma: kind === 'tellall' ? -3 : 0 });
  addSkill(s, 'writing', randFloat(2, 5));
  const risk = { tellall: 0.55, clean: 0.05, novel: 0.04 }[kind];
  if (chance(risk)) {
    if (chance(0.45)) return sentence(s, 'leak', 0.7, `The book earned ${fmtMoney(income)}. The prosecutors read it too.`);
    const fine = price(s, randInt(30000, 90000));
    M(s).money -= Math.min(M(s).money, fine);
    return { text: `The book earned ${fmtMoney(income)} and then the agency’s lawyers took ${fmtMoney(fine)} and the next print run.`, title: 'Banned', emoji: '📖', tone: 'bad' };
  }
  return { text: `Your ${kind === 'novel' ? 'novel' : 'memoir'} made ${fmtMoney(income)} and a few talk-show couches.`, title: 'Published', emoji: '📖', tone: 'good' };
}
defAction({
  id: 'spy_consult', cat: 'spy', label: 'Consult for a security firm', emoji: '🕴️', desc: 'Private clients pay well for an ex-spook’s opinion.', when: (s) => !!spy(s) && free(s) && spyAlumnus(s) && !inAgency(s),
  run: (s) => {
    if (bump(s, 'spyconsult') > 1) return { text: 'You already took a client this year.', nolog: true };
    const pay = price(s, randInt(25000, 65000));
    add(s, { money: pay });
    addSkill(s, 'business', 1);
    return `A private security firm paid ${fmtMoney(pay)} for a week of your opinion. Most of it was “don’t do that.”`;
  },
});
for (const k of Object.keys(ACTIONS)) if (ACTIONS[k].cat === 'spy') { const w = ACTIONS[k].when; ACTIONS[k].when = (s, t) => spyCtx(s) && w(s, t); }
ACT_CATS.splice(ACT_CATS.findIndex((c) => c.id === 'crime'), 0, { id: 'spy', name: 'Intelligence', emoji: '🕵️' });

// What the rest of the game hears about a spy leaving.
function spyLeft(s, c, reason) {
  if (!isSpyJob(c.id)) return;
  const sp = ensureSpy(s);
  sp.alumni = true;
  sp.left = { year: s.year, reason };
  sp.desk = false;
  if (['jailed', 'fired', 'defected'].includes(reason)) sp.disavowed = true;
  for (const a of sp.assets) if (a.state === 'active') a.state = 'dropped';
}

/* ---- events ------------------------------------------------------------------------------------------- */
const spyRecruitable = (s) => free(s) && !inAgency(s) && !hasFelony(s) && !(spy(s) && spy(s).disavowed) && P(s).stats.smarts >= 60 && eduRank(s) >= 3;
EV('spy_recruiter', {
  ages: [21, 40], w: 1.5, cooldown: 6, when: spyRecruitable, emoji: '☕', text: 'A polite stranger buys you coffee and asks, as if it were nothing, whether you have ever wanted to do something that mattered.',
  choices: [
    ['Hear them out', (s) => { if (M(s).career) leaveJob(s, 'switched'); hire(s, 'spy', 0); startSpyCareer(s); return { text: 'Three weeks of interviews, one lie detector and a thick envelope later, you work for the agency. You cannot tell a soul.', emoji: '🕵️', tone: 'good' }; }],
    ['Politely decline', () => 'You said no thanks. They left a card with only a phone number on it. You kept it.'],
  ],
});
EV('spy_deaddrop', {
  ages: [21, 60], w: 1, cooldown: 3, when: (s) => inAgency(s) && !spy(s).desk, emoji: '🧱', text: 'There is a chalk mark on the lamppost outside your building. The signal for a pickup.',
  choices: [
    ['Service the drop', (s) => { spy(s).standing = clamp100(spy(s).standing + 4); spy(s).heat = clamp100(spy(s).heat + 2); return 'You picked up a loose brick from a park wall. Inside: a roll of film and a note in a hand you do not know.'; }],
    ['Skip it, it feels wrong', (s) => { if (chance(0.5)) { spy(s).standing = clamp100(spy(s).standing + 2); return 'It turned out to be a trap. The agency bought you a drink.'; } spy(s).standing = clamp100(spy(s).standing - 3); return 'It was nothing. Your handler was less than pleased.'; }],
  ],
});
EV('spy_vanish', {
  ages: [24, 65], w: 0.8, cooldown: 5, when: (s) => inAgency(s) && M(s).career.level >= 1, emoji: '🪑', text: 'The desk next to yours has been empty for three weeks. No one will say where your colleague went.',
  choices: [
    ['Ask around', (s) => { spy(s).standing = clamp100(spy(s).standing - 4); spy(s).heat = clamp100(spy(s).heat + 3); return 'Someone from security stopped by your desk to ask why you wanted to know.'; }],
    ['Keep your head down', (s) => { add(s, { happy: -2 }); return 'You did not ask. In this building that is how you stay.'; }],
  ],
});
EV('spy_budget', {
  ages: [26, 65], w: 0.8, cooldown: 6, when: (s) => inAgency(s), emoji: '✂️', text: 'The budget committee wants to cut the agency’s field allowance by a third.',
  choices: [
    ['Volunteer for hazard duty', (s) => { const p = price(s, 8000); add(s, { money: p, health: -2 }); spy(s).heat = clamp100(spy(s).heat + 8); return `You took the dirtiest posting for ${fmtMoney(p)} extra. Your handler said you were a patriot, and meant it.`; }],
    ['Take the cut', (s) => { M(s).career.salary = Math.round(M(s).career.salary * 0.96); add(s, { happy: -2 }); return 'Everyone took the cut. Nobody said anything out loud.'; }],
  ],
});
EV('spy_reporter', {
  ages: [24, 65], w: 0.8, cooldown: 5, when: (s) => inAgency(s) && !spy(s).desk, emoji: '🎙️', text: 'A reporter calls your office. They have your name, a photograph from a foreign airport, and a lot of questions.',
  choices: [
    ['Deny everything', (s) => (chance(clamp(0.4 + skill(s, 'acting') / 200, 0.25, 0.85)) ? 'You laughed, gave a straight face, and spent twenty minutes on cover-story trivia. The reporter moved on.' : (spy(s).cover.strength = clamp100(spy(s).cover.strength - 14), spy(s).heat = clamp100(spy(s).heat + 8), 'The reporter wrote it down. The story did not run, but it exists.'))],
    ['Say no comment', (s) => { spy(s).heat = clamp100(spy(s).heat + 4); return 'The reporter said that was an answer too.'; }],
    ['Alert the director', (s) => { spy(s).standing = clamp100(spy(s).standing + 3); return 'By the end of the day a lawyer had called the paper. The story went away.'; }],
  ],
});
EV('spy_classmate', {
  ages: [22, 60], w: 0.8, cooldown: 5, when: (s) => inAgency(s) && !spy(s).desk, emoji: '🛬', text: 'Waiting for a flight, someone shouts your real name. It is a classmate from school, delighted to see you.',
  choices: [
    ['Pretend not to know them', (s) => { spy(s).cover.strength = clamp100(spy(s).cover.strength - 2); add(s, { happy: -1 }); return 'You looked right through them. They looked hurt. You wrote down their face.'; }],
    ['Greet them warmly', (s) => { spy(s).cover.strength = clamp100(spy(s).cover.strength - 12); add(s, { happy: 3 }); return 'You had a drink and a lovely time. You used your real name three times and have regretted every one of them.'; }],
  ],
});
EV('spy_polygraph', {
  ages: [24, 65], w: 1, cooldown: 5, when: (s) => inAgency(s), emoji: '📈', text: 'A routine polygraph has been scheduled for you. The examiner is smiling too much.',
  choices: [
    ['Stay calm', (s) => { const sp = spy(s); const bad = sp.turned ? 0.5 : 0.04; if (chance(clamp(bad - skill(s, 'acting') / 400, 0.02, 0.6))) { if (sp.turned) exposeTraitor(s); else { sp.standing = clamp100(sp.standing - 5); } return sp.turned ? 'The needle jumped twice on the question you were afraid of.' : 'The needle twitched on a question about your mother. They marked you down anyway.'; } add(s, { happy: -1 }); return 'You answered each question in the same voice. The examiner stopped smiling.'; }],
    ['Ask for a lawyer', (s) => { spy(s).standing = clamp100(spy(s).standing - 4); return 'It delayed things by a month and cost you some goodwill.'; }],
  ],
});
EV('spy_approach', {
  ages: [24, 60], w: 1, cooldown: 6, when: (s) => inAgency(s) && !spy(s).turned && !spy(s).controlled && M(s).career.level >= 1, emoji: '🧳', text: 'A courteous man in the lobby of your hotel says he represents people who admire your work. They would like to help you retire early.',
  choices: [
    ['Report it to your handler', (s) => { const sp = spy(s); const [name] = pick(FOES); sp.controlled = { state: name, since: s.year }; sp.standing = clamp100(sp.standing + 10); tally(s, 'turned'); return 'Your handler glowed. You were told to accept the next meeting and be someone worth buying. You are now a double, and the agency is the other half.'; }],
    ['Take the money', (s) => { const [name] = pick(FOES); const bonus = price(s, randInt(15000, 50000)); becomeTraitor(s, name, false); add(s, { money: bonus }); return { text: `You took ${fmtMoney(bonus)} in an envelope and a number to call. You are not sure you can ever give it back.`, emoji: '💰', tone: 'bad' }; }],
    ['Refuse and walk away', (s) => { spy(s).heat = clamp100(spy(s).heat + 5); return 'You said you were happy with your work. He said that people usually are, until they are not.'; }],
  ],
});
EV('spy_partner_suspects', {
  ages: [22, 70], w: 1.5, cooldown: 4, when: (s) => spyCtx(s) && inAgency(s) && !!romanticId(s) && !spy(s).told[romanticId(s)], emoji: '🧐', ctx: (s) => ({ pid: romanticId(s) }),
  text: (s, c) => `${nm(s, c.pid)} says you have been disappearing for weeks, and that your story about the “conference” has holes.`,
  choices: [
    ['Lie smoothly', (s, c) => { if (chance(clamp(0.45 + skill(s, 'acting') / 200 + skill(s, 'charisma') / 400, 0.3, 0.85))) { addRel(s, c.pid, 2); return `${nm(s, c.pid)} nodded. They want to believe you.`; } addRel(s, c.pid, -12); add(s, { happy: -3 }); return `${nm(s, c.pid)} did not buy it. The dinner was cold.`; }],
    ['Come clean', (s, c) => { spy(s).told[c.pid] = true; addRel(s, c.pid, randInt(8, 18)); spy(s).standing = clamp100(spy(s).standing - 4); return { text: `You told ${nm(s, c.pid)} everything. They held your hand and said very little.`, person: c.pid }; }],
    ['Let them think it is an affair', (s, c) => { addRel(s, c.pid, -22); spy(s).cover.strength = clamp100(spy(s).cover.strength + 8); add(s, { karma: -2, happy: -3 }); return `You let ${nm(s, c.pid)} believe the worse, simpler story. It protects the secret and hurts them.`; }],
  ],
});
EV('spy_defector_door', {
  ages: [26, 65], w: 0.8, cooldown: 6, when: (s) => inAgency(s) && !spy(s).desk, emoji: '🌧️', text: 'Someone is on your doorstep in the rain, shaking. They say they work for a foreign ministry and that they are in danger.',
  choices: [
    ['Take them in and call it in', (s) => { const sp = spy(s); sp.standing = clamp100(sp.standing + 8); if (chance(0.25)) { sp.heat = clamp100(sp.heat + 12); return 'It might have been a trap. It might not. The agency took them away and thanked you for the trouble.'; } add(s, { karma: 3 }); return 'The agency debriefed them for a month. What they knew was worth a year of work.'; }],
    ['Turn them away', (s) => { add(s, { karma: -3 }); return 'You said you could not help. You heard nothing more, and you did not want to.'; }],
  ],
});
EV('spy_safehouse', {
  ages: [24, 65], w: 0.7, cooldown: 5, when: (s) => inAgency(s) && !spy(s).desk, emoji: '🏚️', text: 'The neighbors are suspicious of the safe house you use. Somebody has called the police twice.',
  choices: [
    ['Move out at once', (s) => { const b = price(s, 2000); pay(s, b); return `You moved the operation in a day. It cost ${fmtMoney(b)} and a week of sleep.`; }],
    ['Charm the neighbors', (s) => (chance(clamp(0.4 + skill(s, 'charisma') / 200, 0.25, 0.85)) ? 'A box of pastries and some well-timed small talk. They decided you were a lovely young couple.' : (spy(s).heat = clamp100(spy(s).heat + 10), 'The pastries did not help. A police car idled outside for an hour.'))],
  ],
});
EV('spy_award', {
  ages: [26, 70], w: 1, once: true, when: (s) => inAgency(s) && spy(s).ok >= 3, emoji: '🏅', text: 'The director calls you to a closed ceremony in a basement room. A medal with no name on it. No photographs.',
  choices: [['Accept it', (s) => { add(s, { happy: 10, karma: 1 }); spy(s).standing = clamp100(spy(s).standing + 8); return 'You held the medal for forty seconds. Then they took it back and locked it in a vault with your name on the box.'; }]],
});
EV('spy_scapegoat', {
  ages: [28, 65], w: 0.8, cooldown: 6, when: (s) => inAgency(s) && spy(s).fail >= 1 && M(s).career.level >= 2, emoji: '🧯', text: 'A failed operation has reached the newspapers. The agency needs a name to give the committee, and yours is on the list.',
  choices: [
    ['Take the fall', (s) => { spy(s).standing = clamp100(spy(s).standing - 12); add(s, { karma: 4, happy: -4 }); M(s).career.perf = clamp100(M(s).career.perf - 15); return 'You took the blame in front of the committee. Your director squeezed your shoulder on the way out.'; }],
    ['Fight it', (s) => { if (chance(clamp(0.4 + spy(s).standing / 250, 0.25, 0.8))) { spy(s).standing = clamp100(spy(s).standing + 4); return 'You brought records and a lawyer’s calm. They found a less inconvenient name.'; } spy(s).standing = clamp100(spy(s).standing - 18); M(s).career.perf = clamp100(M(s).career.perf - 20); return 'You lost the argument and your career took a long step backwards.'; }],
  ],
});
EV('spy_alumni_offer', {
  ages: [30, 80], w: 1, cooldown: 4, when: (s) => !!spy(s) && free(s) && spyAlumnus(s) && !inAgency(s), emoji: '💼', text: 'A private intelligence firm wants a former officer to sit on its advisory board.',
  choices: [
    ['Take the seat', (s) => { const p = price(s, randInt(40000, 120000)); add(s, { money: p, happy: 3 }); return `The board pays ${fmtMoney(p)} a year to nod thoughtfully. You are very good at it.`; }],
    ['Decline', () => 'You told them you had earned the quiet. They sent flowers.'],
  ],
});

/* ---- achievements, legacy and goals ------------------------------------------------------------------------ */
ACHIEVEMENTS.push(
  { id: 'spy_first', name: 'First Assignment', emoji: '🕵️', desc: 'Complete a mission for the agency.', check: (s) => LC(s, 'spyOk') >= 1 },
  { id: 'spy_ten', name: 'Veteran Operative', emoji: '🗂️', desc: 'Complete ten missions.', check: (s) => LC(s, 'spyOk') >= 10 },
  { id: 'spy_asset', name: 'Source Handler', emoji: '🗝️', desc: 'Recruit an asset.', check: (s) => LC(s, 'assetsRecruited') >= 1 },
  { id: 'spy_network', name: 'A Network', emoji: '🕸️', desc: 'Run three live assets at once.', check: (s) => liveAssets(s).length >= 3 },
  { id: 'spy_mole', name: 'Mole Hunter', emoji: '🐀', desc: 'Unmask a mole inside the agency.', check: (s) => LC(s, 'moleCaught') >= 1 },
  { id: 'spy_double', name: 'Two Faces', emoji: '🎭', desc: 'Become a double agent.', check: (s) => LC(s, 'turned') >= 1 },
  { id: 'spy_traitor', name: 'Traitor', emoji: '💰', desc: 'Sell a secret to a rival service.', check: (s) => LC(s, 'sold') >= 1 },
  { id: 'spy_defect', name: 'Defector', emoji: '🛫', desc: 'Defect to another country.', check: (s) => LC(s, 'defected') >= 1 },
  { id: 'spy_burned', name: 'Burned', emoji: '🔥', desc: 'Have your cover blown.', check: (s) => LC(s, 'burned') >= 1 },
  { id: 'spy_swap', name: 'Exchanged', emoji: '🌉', desc: 'Come home in a prisoner exchange.', check: (s) => LC(s, 'swap') >= 1 },
  { id: 'spy_immune', name: 'Diplomatic Immunity', emoji: '🛂', desc: 'Talk your way out of a cell with your papers.', check: (s) => LC(s, 'immunity') >= 1 },
  { id: 'spy_memoir', name: 'Tell-All', emoji: '📖', desc: 'Publish a book about your spy life.', check: (s) => LC(s, 'memoir') >= 1 },
  { id: 'spy_chief', name: 'Station Chief', emoji: '🏢', desc: 'Reach Station Chief or higher.', check: (s) => !!M(s).career && isSpyJob(M(s).career.id) && M(s).career.level >= 4 },
  { id: 'spy_director', name: 'The Director', emoji: '🎩', desc: 'Become Director of the agency.', check: (s) => !!M(s).career && isSpyJob(M(s).career.id) && M(s).career.level >= 6 },
);
LEGACY_TITLES.unshift(
  { id: 'master_spy', name: 'Master Spy', emoji: '🕵️', check: (s) => LC(s, 'spyOk') >= 8 && !!spy(s) && !spy(s).disavowed },
  { id: 'traitor_t', name: 'Traitor', emoji: '🐍', check: (s) => LC(s, 'sold') >= 2 || LC(s, 'defected') >= 1 },
);
GOALS.push(
  { id: 'g_spy', text: 'Join an intelligence agency', emoji: '🕵️', check: (s) => LC(s, 'spyJoined') >= 1 },
  { id: 'g_station', text: 'Run a station abroad', emoji: '🏢', check: (s) => !!M(s).career && isSpyJob(M(s).career.id) && M(s).career.level >= 4 },
);
