/* =====================================================================
 * 86-careers-plus.js — the careers the first three phases left on the
 * table, built on the career-cards engine (65-work.js).
 *
 *   Two new tracks   Forensic science and behavioral analysis. They work real case files (63-cases.js): a good
 *                    year moves a case and closes it, a bad one sets it back, and promotion needs the cases you
 *                    helped close.
 *   Beat cops        Patrol, up to Detective, now plays a deck of its own: a traffic stop, a domestic call, a
 *                    chase, the shopkeeper who knows things. From Detective up it is the detective's desk
 *                    (64-detective.js), as before.
 *   Full systems     Paramedic, teacher and lawyer get training and promotion gates, a yearly strain or a
 *                    yearly class, showpiece cards with several decisions, and twists.
 *   Competition      The chef's cook-off circuit, regional to world.
 *   Seasons          Farming and fishing have a year: weather, prices, a quota, and what the year does to what
 *                    each card pays.
 *   Twists           The first showpiece jobs (doctor, surgeon, firefighter, bartender, chef, journalist, pilot)
 *                    can follow a good result with a card nobody saw coming, as the spy's missions do.
 *
 * Every card is data in the same shape as 66-work-decks.js. Nothing here needs a switch.
 * ===================================================================== */

/* ---- helpers -------------------------------------------------------------------------------------------------- */
// A twist is a card that is never dealt on its own, only after another one ends well.
function addTwist(jobs, cardId, twist, chance) {
  for (const id of [].concat(jobs)) {
    const d = WORKDECK[id];
    if (!d) continue;
    const k = d.cards.find((x) => x.id === cardId);
    if (!k) continue;
    k.twist = twist.id;
    if (chance !== undefined) k.twistChance = chance;
    if (!d.cards.some((x) => x.id === twist.id)) d.cards.push(Object.assign({ only: true, w: 0 }, twist));
  }
}
const T = (id, name, emoji, text, ways, ok, meh, bad, o) => Object.assign({ id, name, emoji, base: 0.5, stages: [{ text, ways }], ok, meh, bad, only: true, w: 0 }, o || {});
// Cases that are not yours, in the city where you work: the ones forensics and profiling move.
function caseHere(s) {
  const k = Object.values(invOf(s).list).find((x) => x.who === null && !x.assigned && x.status === 'open' && x.cc === P(s).country && x.city === P(s).city);
  return k || invWorldCase(s, {});
}
function caseAid(s, st, out, ev) {
  const k = caseHere(s);
  if (out === 'ok') {
    invEvidence(s, k, { [ev]: randInt(10, 18) });
    k.prog = clamp(k.prog + randInt(25, 45), 0, 100);
    st.flags.assists = (st.flags.assists || 0) + 1;
    if (k.prog >= 100 && k.status === 'open') {
      k.status = 'solved'; k.solved = s.year;
      st.flags.solved = (st.flags.solved || 0) + 1;
      tally(s, 'casesAided');
      add(s, { happy: 3, karma: 1 });
      log(s, `🗂️ Your work helped close the ${invVerb(k)} case${k.vname ? ' that hit ' + k.vname : ''}.`, 'good');
    }
  } else if (out === 'bad') k.prog = clamp(k.prog - 10, 0, 100);
  return k;
}
// A cold case, if there is one, wakes up.
function coldWake(s) {
  const k = Object.values(invOf(s).list).find((x) => x.who === null && !x.assigned && x.status === 'cold');
  if (k) { k.status = 'open'; k.last = s.year; k.prog = Math.max(k.prog, 40); return k; }
  const n = invWorldCase(s, {});
  n.prog = 45;
  return n;
}
// A full system keeps the universal cards (a bad idea from above, the crunch, a coworker who needs a hand) of 76-work-decks-2.js.
function defFull(id, uniIds, def) {
  const m = Object.assign({}, TPL_CAT[JOBS[id].cat] || TPL_CAT.office);
  m.Team = cap(m.team);
  def.cards = uniIds.map((u) => tpl(UNI[u](), m)).concat(def.cards);
  return defWork(id, def);
}
const needAssists = (mul) => (s, c, st) => (st.flags.assists || 0) >= mul * (c.level + 1);

/* ---- forensic science ------------------------------------------------------------------------------------------ */
Object.assign(JOBS, {
  forensics: {
    name: 'Forensic Science', emoji: '🔬', cat: 'public', skill: 'smarts',
    ladder: [['Evidence Technician', 46000], ['Forensic Analyst', 64000], ['Senior Examiner', 86000], ['Lead Forensic Scientist', 112000], ['Director of Forensics', 148000]],
    req: { age: 21, edu: 'bachelor', majors: ['biology', 'chemistry', 'physics'], smarts: 55, clean: true },
  },
  profiler: {
    name: 'Behavioral Analysis', emoji: '🧠', cat: 'public', skill: 'smarts',
    ladder: [['Research Analyst', 52000], ['Behavioral Analyst', 70000], ['Criminal Profiler', 92000], ['Senior Profiler', 120000], ['Head of the Behavioral Unit', 152000]],
    req: { age: 23, edu: 'bachelor', majors: ['psychology', 'sociology'], smarts: 60, clean: true },
  },
});
// JOB_IDS (04-data-careers.js) was made before these two existed: the job board, God Mode and everyone's job pool read it.
JOB_IDS.push('forensics', 'profiler');
defFull('forensics', ['boss', 'training', 'crunch', 'conflict', 'favor'], {
  meter: { name: 'Lab credibility', emoji: '🔬', start: 52, words: WORDS('Doubted', 'Learning', 'Reliable', 'Trusted in court', 'The name the lab is known for') },
  desk: 'Your bench', fired: 'An internal review found the lab could no longer stand behind your work, and you were let go.',
  gate: needAssists(2),
  kv: (s, st) => [['Cases you moved', String(st.flags.assists || 0)], ['Cases you helped close', String(st.flags.solved || 0)]],
  cards: [
    { id: 'bench', name: 'A case lands on your bench', emoji: '🧫', w: 2, base: 0.5, pay: 600,
      intro: 'A box arrives with a number on it, and a detective who would like it yesterday.',
      stages: [
        { text: 'The evidence is thin, and degraded. What do you work first?', ways: [W('The physical trace', 'smarts', 'Patient'), W('The digital record', 'coding', 'Technical'), W('A second look at the scene photos', 'art', 'An eye for detail', 0.03)], ok: 'There was something there, and you found it.', bad: 'Whatever was there is gone, or you missed it.' },
        { text: 'The result is ambiguous. The detective wants a yes or a no.', ways: [W('Say exactly what the data supports', 'smarts', 'Honest, and less satisfying', 0, 0, '', { karma: 1, m: 1 }), W('Offer a probable match', 'charisma', 'Useful, and a risk', -0.03), W('Ask for more time', 'smarts', 'Careful, and slow', 0.04)], ok: 'Your report was clear, and it held.', bad: 'It was close enough that nobody trusted it.' },
      ],
      ok: 'The detective read it twice and started moving. The case is a lot nearer than it was.', meh: 'It helped a little, which in this job is most days.', bad: 'The result did not hold up, and the case slipped back.',
      twist: 'breakthrough', fx: { ok: { m: 6, name: 1 }, bad: { m: -7 } }, after: (s, out, c, st) => caseAid(s, st, out, 'trace') },
    { id: 'contaminated', name: 'A contaminated sample', emoji: '⚠️', min: 0, base: 0.5, risk: 0.2,
      stages: [{ text: 'You realize, an hour after you logged it, that a sample was contaminated on your bench. Nobody knows. Yet.', ways: [W('Report it at once', 'smarts', 'Honest, and awkward', 0, 0, '', { karma: 2, name: 1 }), W('Re-run it and hope the numbers hold', 'streetwise', 'Risky', -0.05), W('Quietly swap the log entry', 'streetwise', 'A line you do not come back from', -0.08, 0, '', { dirty: true, karma: -4, secret: 'falsifying' })] }],
      ok: 'You owned it, redid it, and the lab wrote a new procedure with your name on it.', meh: 'It all worked out, and you did not sleep.', bad: 'It came out, and a defense lawyer will remember the date.',
      fx: { ok: { m: 5, name: 1 }, bad: { m: -10, scandal: 6 } } },
    { id: 'stand', name: 'The witness stand', emoji: '⚖️', min: 1, w: 1.3, base: 0.5, pay: 900,
      stages: [
        { text: 'You are an expert witness. The defense lawyer is well prepared.', ways: [W('Keep it plain and short', 'smarts', 'Clear'), W('Teach the jury', 'charisma', 'Engaging', 0.03), W('Defend every number to the decimal', 'smarts', 'Thorough, and dry', -0.02)], ok: 'The jury followed you.', bad: 'The lawyer got you to say more than you meant to.' },
        { text: '"Is it possible, Doctor, that you are wrong?"', ways: [W('"Anything is possible. This is not likely."', 'smarts', 'Honest'), W('"No."', 'streetwise', 'Strong, and false', -0.1, 0, '', { dirty: true, karma: -2 }), W('Explain the margin of error', 'smarts', 'Careful')], ok: 'It was the best answer anyone could have given.', bad: 'It was the answer the lawyer was waiting for.' },
      ],
      ok: 'They believed you, and the verdict said so.', meh: 'The jury was not sure what to make of it, and neither were you.', bad: 'The defense took you apart, and the case went with you.',
      fx: { ok: { m: 6, name: 2 }, bad: { m: -8, scandal: 3 } } },
    { id: 'backlog', name: 'The backlog', emoji: '📚', min: 0, base: 0.55,
      stages: [{ text: 'There are six hundred cases waiting, and one of them has a victim who has been waiting for four years.', ways: [W('Take them in order', 'smarts', 'Fair'), W('Pull the oldest one', 'charisma', 'Kind, and slower', 0.02, 0, '', { karma: 1 }), W('Triage by what is most solvable', 'business', 'Efficient, and cold')] }],
      ok: 'The wait got shorter, and one family got a call.', meh: 'The pile is the same size, and so are you.', bad: 'You burned out half the bench, and the pile is the same.',
      fx: { ok: { m: 4, karma: 1 }, bad: { m: -5, happy: -3 } } },
    { id: 'cold', name: 'A cold case, reopened', emoji: '🧊', min: 1, w: 0.9, base: 0.45,
      stages: [{ text: 'A new technique, and a box of old evidence in a basement. Somebody wants to try it.', ways: [W('Rerun everything', 'smarts', 'Thorough'), W('Pick the one sample that matters', 'smarts', 'Instinct', -0.03), W('Ask for help from another lab', 'charisma', 'Shared credit', 0.03)] }],
      ok: 'The sample talked, after all these years. A detective called you at home to say thank you.', meh: 'It narrowed things down, which is more than anyone had in years.', bad: 'Whatever was in the box is long gone.',
      fx: { ok: { m: 6, name: 2, karma: 2 }, bad: { m: -3 } }, after: (s, out, c, st) => { if (out === 'ok') { const k = coldWake(s); st.flags.assists = (st.flags.assists || 0) + 1; k.prog = clamp(k.prog + 35, 0, 100); } } },
    { id: 'pressure', name: 'They want a result', emoji: '😤', min: 1, base: 0.5,
      stages: [{ text: 'A detective who is sure about a suspect leans on you to find what supports it.', ways: [W('Report only what is there', 'smarts', 'Honest, and unwelcome', 0, 0, '', { karma: 2, name: 1 }), W('Emphasize what fits', 'streetwise', 'A tilt', -0.04, 0, '', { dirty: true, karma: -3 }), W('Take it to your lab director', 'charisma', 'Safe, and slow', 0.02)] }],
      ok: 'You told them what the evidence said, and it was not what they wanted. They respected it, later.', meh: 'It was an uncomfortable meeting, and it got you nowhere.', bad: 'The wrong person was charged, and your report was in the file.',
      fx: { ok: { m: 5, name: 1 }, bad: { m: -9, scandal: 6, happy: -4 } } },
    { id: 'tech', name: 'New equipment', emoji: '🧪', min: 0, base: 0.55,
      stages: [{ text: 'The lab can afford one big purchase this year, and everyone has a different one in mind.', ways: [W('Argue for the sequencer', 'smarts', 'Technical'), W('Back the digital forensics suite', 'coding', 'Modern'), W('Push for more staff instead', 'charisma', 'Practical', 0.03)] }],
      ok: 'The lab got it, and a case that had been stuck for a year came loose in a week.', meh: 'A compromise, and half of everything.', bad: 'The budget went elsewhere. Your argument is in the minutes.',
      fx: { ok: { m: 5 }, bad: { m: -3 } } },
    T('breakthrough', 'A breakthrough', '💡', 'A result comes back that nobody expected, and it points at somebody the police had already ruled out.', [W('Call the detective now', 'charisma', 'Fast'), W('Verify it twice first', 'smarts', 'Careful', 0.04), W('Put it in the report and wait', 'smarts', 'Safe, and slow')], 'The detective drove to your lab in the rain. By morning there was a warrant.', 'It was real, and it was messy, and it mattered.', 'Something in the chain of evidence was not clean, and the result was thrown out.', { fx: { ok: { m: 6, name: 2, fame: 1 }, bad: { m: -6 } }, after: (s, out, c, st) => caseAid(s, st, out, 'dig') }),
  ],
});
/* ---- behavioral analysis ----------------------------------------------------------------------------------------- */
defFull('profiler', ['boss', 'training', 'crunch', 'mistake', 'offer'], {
  meter: { name: 'Standing in the unit', emoji: '🧠', start: 52, words: WORDS('Dismissed', 'Listened to', 'Taken seriously', 'Sought out', 'The one they send for') },
  desk: 'Your files', fired: 'The unit decided your reports were guessing, and let you go.',
  gate: needAssists(2),
  kv: (s, st) => [['Cases you moved', String(st.flags.assists || 0)], ['Cases you helped close', String(st.flags.solved || 0)]],
  cards: [
    { id: 'series', name: 'A series with no name', emoji: '🗂️', w: 2, base: 0.45, pay: 700,
      intro: 'A detective puts five files on your desk and says they might be one hand.',
      stages: [
        { text: 'Where do you start?', ways: [W('The timeline', 'smarts', 'Patterns in time'), W('The victims', 'charisma', 'Who they had in common', 0.02), W('The places', 'streetwise', 'Geography')], ok: 'A shape starts to come out of the noise.', bad: 'You are seeing things that are not there, and you cannot tell which.' },
        { text: 'You have a picture of whoever this is. How do you present it?', ways: [W('Give them the range of possibilities', 'smarts', 'Honest, and less useful', 0, 0, '', { karma: 1 }), W('Commit to one profile', 'acting', 'Bold, and a risk', -0.06), W('Say what you do not know', 'writing', 'Credible', 0.03)], ok: 'The detectives wrote down every word.', bad: 'The profile was confident, and wrong.' },
      ],
      ok: 'Your profile narrowed the field, and the detectives knew who to look at.', meh: 'It was useful, in the way a map with half the roads is.', bad: 'A good profile in the wrong place does a lot of damage, and the unit saw that.',
      twist: 'hunch', fx: { ok: { m: 6, name: 1 }, bad: { m: -8 } }, after: (s, out, c, st) => caseAid(s, st, out, 'wit') },
    { id: 'interview', name: 'The interview', emoji: '🪑', min: 0, base: 0.5, who: 'survivor',
      stages: [{ text: '[who] was in the room on the worst night of their life. They have not told anyone the whole story. They might tell you.', ways: [W('Let them talk, and say little', 'charisma', 'Patient', 0.04), W('Ask the question directly', 'smarts', 'Efficient'), W('Share something of yours first', 'acting', 'Warm, and risky', -0.02)] }],
      ok: '[first] told you everything, and then said thank you for listening.', meh: '[first] gave you some of it. The rest is behind a door.', bad: '[first] shut down, and the door stayed shut.',
      fx: { ok: { m: 5, karma: 2 }, bad: { m: -5 } }, after: (s, out, c, st) => { if (out === 'ok') caseAid(s, st, out, 'wit'); } },
    { id: 'press', name: 'The press wants a profile', emoji: '🎙️', min: 1, w: 1.1, base: 0.5,
      stages: [{ text: 'A television producer wants you on air to talk about a case that is still open.', ways: [W('Decline, politely', 'smarts', 'Clean', 0, 0, '', { karma: 1, name: 1 }), W('Say only what the unit approved', 'charisma', 'Safe'), W('Say what you think', 'acting', 'Great television, and a risk', -0.07, 0, '', { dirty: true, fame: 3 })] }],
      ok: 'You said nothing that could hurt a case, and everyone remembered you were calm.', meh: 'It was fine. Your boss said it was fine.', bad: 'You said one thing too many, and a defense lawyer is going to love it.',
      fx: { ok: { m: 4, fame: 2, name: 1 }, bad: { m: -8, scandal: 5 } } },
    { id: 'wrong', name: 'A profile that was wrong', emoji: '❌', min: 1, base: 0.5, risk: 0.2,
      stages: [{ text: 'Months later, it turns out the person you described is not who they were looking for. A man spent a year in a cell because of your confidence.', ways: [W('Say so, in writing', 'smarts', 'Honest, and a cost', 0, 0, '', { karma: 3, name: 1 }), W('Say the case was ambiguous', 'charisma', 'Defensive'), W('Say nothing', 'streetwise', 'It is not a line you come back from', -0.06, 0, '', { dirty: true, karma: -4 })] }],
      ok: 'You owned it. The unit changed how it presents profiles, and put your memo in the training.', meh: 'It was an uncomfortable hearing, and nobody lost their job.', bad: 'It came out that you had known, and the hearing was not kind.',
      fx: { ok: { m: 5, karma: 2 }, bad: { m: -11, scandal: 8, happy: -5 } } },
    { id: 'bereaved', name: 'The bereaved', emoji: '🕊️', min: 0, base: 0.55, who: 'survivor',
      stages: [{ text: '[who] has lost someone, and has been given your name as the person who will tell them what happened.', ways: [W('Tell them plainly', 'smarts', 'Honest'), W('Tell them gently, in stages', 'charisma', 'Kind', 0.04), W('Send a colleague', 'streetwise', 'Easier, and cold')] }],
      ok: '[first] asked a few questions, and wrote you a letter afterwards. You kept it.', meh: '[first] said thank you, and meant something else.', bad: '[first] left angry, and said you were cold.',
      fx: { ok: { m: 5, karma: 3 }, bad: { m: -6, happy: -3 } } },
    { id: 'hold', name: 'The prisoner who will not stop talking', emoji: '⛓️', min: 1, w: 0.9, base: 0.5,
      stages: [{ text: 'A convicted offender has offered to talk to you for a month, about how he thinks. Everyone says it is a bad idea.', ways: [W('Take the interviews', 'smarts', 'Insightful, and a toll'), W('Send questions in writing', 'writing', 'Safe, and thinner', 0.03), W('Decline', 'smarts', 'Wise, and a missed chance')] }],
      ok: 'You came out of it with a way of looking at the files that nobody in the unit had.', meh: 'You learned something, and you are not sure it was worth it.', bad: 'He was the one doing the studying.',
      fx: { ok: { m: 7, name: 1 }, bad: { m: -5, happy: -5 } } },
    T('hunch', 'A hunch', '🔦', 'Something in the files has been bothering you for a week: a detail that is in every report and that nobody has written down.', [W('Chase it yourself', 'streetwise', 'Brave, and out of your lane', -0.04), W('Take it to the lead detective', 'charisma', 'Proper'), W('Write it up and hand it over', 'writing', 'Safe')], 'It was real. A detective read your note, went white, and drove somewhere in a hurry.', 'It was a piece of the picture, not all of it.', 'It was nothing, and you were told so in a meeting.', { fx: { ok: { m: 6, name: 2 }, bad: { m: -4 } }, after: (s, out, c, st) => caseAid(s, st, out, 'trace') }),
  ],
});

// The decks above are newer than wkRegister (66-work-decks.js), so these two jobs register their year here.
for (const id of ['forensics', 'profiler']) onCareerYear(id, (s, c) => wkYear(s, c));

/* ---- patrol (Law Enforcement, up to Detective) ---------------------------------------------------------------------- */
defFull('police', ['boss', 'crunch', 'conflict', 'favor'], {
  meter: { name: 'Respect on the beat', emoji: '👮', start: 52, words: WORDS('Not trusted', 'The new one', 'Known on the block', 'Respected', 'Somebody people call by name') },
  desk: 'Your beat', fired: 'The department decided you were not fit for patrol, and took your badge.',
  deal: () => 2,
  kv: (s, st) => [['Calls you handled well', String(st.ok)]],
  cards: [
    { id: 'stop', name: 'A traffic stop', emoji: '🚔', max: 1, w: 1.5, base: 0.55, risk: 0.3,
      stages: [{ text: 'A late-night stop on a quiet road. The driver is nervous, and their hands are not where you would like.', ways: [W('Go by the book, slowly', 'smarts', 'Procedure'), W('Keep them talking', 'charisma', 'Calm', 0.03), W('Call for backup first', 'streetwise', 'Careful, and slower')] }],
      ok: 'It was a taillight and a lot of nerves. You let them go with a warning and a good night.', meh: 'A ticket, a signature, and a long look in the mirror.', bad: 'It got tense. Nobody was hurt, and your report was a page longer than you wanted.',
      fx: { ok: { m: 4, perf: 3 }, bad: { m: -5 } } },
    { id: 'domestic', name: 'A domestic call', emoji: '🏠', max: 1, w: 1.4, base: 0.5, risk: 0.5, who: 'survivor',
      stages: [
        { text: 'Raised voices, a neighbor’s call, and a door that opens just a crack. [who] says everything is fine.', ways: [W('Ask to speak to them alone', 'charisma', 'Careful', 0.04), W('Insist on seeing the house', 'streetwise', 'Firm, and a risk'), W('Take their word and go', 'streetwise', 'Easy, and wrong', -0.08, 0, '', { dirty: true, karma: -2 })], ok: '[first] let you in, and then, once alone, said it quietly.', bad: 'The door closed, and so did the moment.' },
        { text: 'You have enough to act on. How?', ways: [W('Arrest and refer them to services', 'smarts', 'By the book'), W('Separate them and take statements', 'charisma', 'Patient'), W('Call a victim advocate to the scene', 'charisma', 'Kind', 0.03)], ok: 'Everyone was safe by morning, and [first] had a number to call.', bad: 'It was messy, and it did not stay solved.' },
      ],
      ok: 'It was the hardest call of the week, and it went right. [first] sent a card to the station.', meh: 'Nobody was hurt that night. You are not sure that means much.', bad: 'You went back three weeks later. That is the part you remember.',
      fx: { ok: { m: 6, karma: 2 }, bad: { m: -7, happy: -4 } } },
    { id: 'chase', name: 'A foot chase', emoji: '🏃', max: 1, w: 1, base: 0.5, risk: 0.5,
      stages: [{ text: 'Somebody runs from a corner store, and you are the only unit on the street.', ways: [W('Run them down', 'fitness', 'Brute speed'), W('Cut them off with the car', 'driving', 'Smart'), W('Call it in and let the others close', 'smarts', 'Safe, and slower')] }],
      ok: 'You got them at the end of an alley, out of breath, and without a scratch on either of you.', meh: 'You lost them, and found the wallet they dropped.', bad: 'You tripped on a curb and spent a week on crutches.',
      fx: { ok: { m: 4, perf: 3 }, bad: { m: -5, health: -4 } } },
    { id: 'shopkeeper', name: 'The shopkeeper who knows things', emoji: '🏪', max: 1, w: 1.2, base: 0.55, who: 'regular', learn: 'npc_crime',
      stages: [{ text: '[who] has run the corner store for thirty years, and has noticed everything.', ways: [W('Stop in every week, buy something', 'charisma', 'Patient', 0.04), W('Ask direct questions', 'smarts', 'Efficient'), W('Do small favors', 'streetwise', 'A currency', 0.02)] }],
      ok: '[first] trusts you now, and told you what everyone on the block has been whispering.', meh: '[first] gave you a coffee, and a long story about a nephew.', bad: '[first] decided you were here for something, and went quiet.',
      fx: { ok: { m: 6, perf: 3 }, bad: { m: -3 } } },
    { id: 'force', name: 'A use-of-force review', emoji: '📋', max: 1, w: 0.9, base: 0.5,
      stages: [{ text: 'A call went badly last week, and your report is going to be read by people with a camera angle you do not have.', ways: [W('Write exactly what happened', 'writing', 'Honest', 0.02, 0, '', { karma: 2, name: 1 }), W('Write it the way that is easiest', 'streetwise', 'A tilt', -0.05, 0, '', { dirty: true, karma: -3 }), W('Ask a union rep to look at it first', 'charisma', 'Safe')] }],
      ok: 'The camera and your report agreed, and the review was a short meeting.', meh: 'The review noted "areas for improvement," and everyone moved on.', bad: 'The footage and your report did not match. Now there is a hearing.',
      fx: { ok: { m: 5, name: 1 }, bad: { m: -10, scandal: 7 } } },
    { id: 'rookie', name: 'The new partner', emoji: '👥', max: 1, w: 1, base: 0.5,
      stages: [{ text: 'You have been given a rookie, and the rookie has opinions.', ways: [W('Teach them, patiently', 'charisma', 'Patient', 0.04), W('Let them learn the hard way', 'streetwise', 'Quick, and a risk'), W('Ask for another partner', 'smarts', 'Selfish, and honest')] }],
      ok: 'By the end of the year they were finishing your sentences, and writing better reports than you.', meh: 'It was a year, and you both survived it.', bad: 'The rookie made a mistake on your watch, and you took half of the blame.',
      fx: { ok: { m: 4, karma: 1 }, bad: { m: -5 } } },
    { id: 'crowd', name: 'A protest', emoji: '📣', max: 1, w: 0.8, base: 0.5, risk: 0.3,
      stages: [{ text: 'A thousand people, a permit and a very tired lieutenant. Somebody throws something.', ways: [W('Hold the line, and stay calm', 'smarts', 'Disciplined'), W('Talk to the organizers', 'charisma', 'De-escalate', 0.04), W('Pull back', 'streetwise', 'Cautious, and noticed')] }],
      ok: 'Nobody got hurt, and the march ended where it was supposed to.', meh: 'It was a long night, and an hour of overtime.', bad: 'It got out of hand, and somebody took a video.',
      fx: { ok: { m: 4 }, bad: { m: -6, scandal: 2 } } },
  ],
});
// Patrol plays this deck, and the detective's desk plays its own year from Detective up (64-detective.js).
{
  const prev = CAREER_YEAR.police;
  onCareerYear('police', (s, c, j) => {
    if (c.level < 2) { wkYear(s, c); return; }
    const st = M(s).work && M(s).work.police;
    if (st) st.hand = []; // the beat stops at Detective
    if (prev) prev(s, c, j);
  });
}

/* ---- paramedic: a full system ------------------------------------------------------------------------------------------ */
defFull('paramedic', ['boss', 'training', 'mistake', 'crunch', 'favor'], {
  meter: { name: 'Crew trust', emoji: '🚑', start: 52, words: WORDS('Doubted', 'Watched', 'Trusted', 'Relied on', 'The one they ask for') },
  desk: 'Your calls', fired: 'Your crew asked for a different partner, and the service agreed.',
  // The advanced certification is earned on the job; it is the only way up from EMT.
  gate: (s, c, st) => (c.level === 0 ? (st.flags.cert || 0) >= 1 : c.level === 1 ? (st.flags.cert || 0) >= 2 : (st.flags.calls || 0) >= 6 * c.level),
  yearStart: (s, c, st) => {
    // The strain of the work builds, and eases with rest.
    st.flags.stress = clamp100((st.flags.stress || 15) + 8 - (c.perf >= 60 ? 3 : 0));
    st.flags.calls = (st.flags.calls || 0) + 2;
    if (st.flags.stress >= 70) log(s, '🚑 You have not had a real day off in months, and it shows in everything you do.', 'bad');
  },
  kv: (s, st) => [['Certifications', String(st.flags.cert || 0)], ['Strain', `${Math.round(st.flags.stress || 15)}%`]],
  cards: [
    { id: 'ridealong', name: 'The ride-along', emoji: '🚑', min: 0, max: 1, w: 2, base: 0.55,
      stages: [{ text: 'A senior paramedic is grading your calls this week, for your advanced certification.', ways: [W('Run every call by the book', 'smarts', 'Careful, and a bit slow'), W('Lead with confidence', 'charisma', 'Smooth', 0.02), W('Ask questions, and learn', 'smarts', 'Humble, and thorough', 0.04)] }],
      ok: 'She signed the form, and said you would be good at this. You will remember that for a long time.', meh: 'She wants to see another week.', bad: 'She wrote "needs more time." It is going to sting.',
      fx: { ok: { m: 5, perf: 4 }, bad: { m: -4 } }, after: (s, out, c, st) => { if (out === 'ok') st.flags.cert = (st.flags.cert || 0) + 1; } },
    { id: 'als', name: 'The advanced life support exam', emoji: '📝', min: 1, max: 2, w: 1.6, base: 0.5,
      when: (s, c, st) => (st.flags.cert || 0) < 3,
      stages: [{ text: 'Eight hours, written and practical, and a room full of people who all look as scared as you.', ways: [W('Study the protocols cold', 'smarts', 'Prepared'), W('Trust your hands from the street', 'fitness', 'Practical'), W('Join a study group', 'charisma', 'Shared', 0.03)] }],
      ok: 'You passed with a score that made your instructor grin.', meh: 'Barely. A pass is a pass.', bad: 'You failed a station by one step. There is a retake in the spring.',
      fx: { ok: { m: 6, perf: 5 }, bad: { m: -4 } }, after: (s, out, c, st) => { if (out === 'ok') st.flags.cert = (st.flags.cert || 0) + 1; } },
    { id: 'arrest', name: 'A cardiac arrest', emoji: '💔', w: 1.6, base: 0.5, risk: 0.3, who: 'patient',
      intro: 'The call comes in at 3 a.m. for [who].',
      stages: [
        { text: 'You arrive, and there is a crowd, and a daughter on her knees doing compressions badly.', ways: [W('Take over compressions', 'fitness', 'Strong'), W('Coach the daughter and set up the monitor', 'charisma', 'Calm', 0.03), W('Intubate first', 'smarts', 'Advanced, and slower', -0.04)], ok: 'The rhythm changed.', bad: 'The line stayed flat.' },
        { text: 'You have a pulse, barely, and ten minutes to the hospital.', ways: [W('Drive fast, work fast', 'driving', 'Risky', -0.03), W('Work the patient, let your partner drive', 'smarts', 'Teamwork'), W('Radio ahead and stay on it', 'charisma', 'Prepared', 0.03)], ok: '[first] was awake, and angry, by the time you got there.', bad: 'The monitor alarmed twice before the doors opened.' },
      ],
      ok: '[first] walked out of the hospital a week later, and the whole station came out to see it.', meh: '[first] survived, and will not be the same. You did what could be done.', bad: '[first] did not make it. Your crew did everything right, and that is not always a comfort.',
      twist: 'family', fx: { ok: { m: 7, name: 1, karma: 2 }, bad: { m: -4, happy: -5 } }, after: (s, out, c, st) => { st.flags.stress = clamp100((st.flags.stress || 15) + (out === 'bad' ? 10 : 3)); } },
    { id: 'overdose', name: 'An overdose', emoji: '🆘', min: 0, w: 1.3, base: 0.5, risk: 0.3, who: 'patient',
      stages: [{ text: 'A young person is on a bathroom floor, and their friends are shouting over each other. [who] is not breathing well.', ways: [W('Get everyone out of the way and work', 'smarts', 'Clear'), W('Give the antidote, then reassess', 'smarts', 'By the protocol'), W('Talk to the friends while your partner works', 'charisma', 'Information, and calm', 0.03)] }],
      ok: '[first] opened their eyes and asked what happened. The friends were crying. So were you, a little, in the truck.', meh: '[first] is in the ICU. The odds are better than they were.', bad: 'You did everything you could, and it was not enough.',
      fx: { ok: { m: 6, karma: 2 }, bad: { m: -4, happy: -5 } }, after: (s, out, c, st) => { if (out === 'ok') webFact(s, 'good_deed', { kind: 'hero', name: 3 }); st.flags.stress = clamp100((st.flags.stress || 15) + 4); } },
    { id: 'birth', name: 'A baby on the way', emoji: '👶', min: 0, w: 1, base: 0.55,
      stages: [{ text: 'A woman in labor, a long driveway, and a baby that has decided it cannot wait for the hospital.', ways: [W('Deliver it in the ambulance', 'smarts', 'By the book'), W('Keep her calm and drive', 'charisma', 'Steady', 0.03), W('Radio the hospital team to meet you', 'smarts', 'Prepared')] }],
      ok: 'A cry, and a name, and a very tired mother who made you promise to visit.', meh: 'It was fine in the end, and it was a lot.', bad: 'It was harder than it should have been. Mother and baby are okay, and you will not forget it.',
      fx: { ok: { m: 6, happy: 4 }, bad: { m: -3, happy: -2 } } },
    { id: 'mci', name: 'A mass casualty incident', emoji: '🚨', min: 2, w: 1.1, base: 0.45, risk: 0.5,
      stages: [
        { text: 'Dispatch: a bus and a truck, on a highway, twenty-three patients. You are first on scene.', ways: [W('Take command and triage', 'smarts', 'Command'), W('Treat the worst first', 'fitness', 'Hands'), W('Call for every unit and wait for them', 'charisma', 'Safe, and slow')], ok: 'You had a structure within two minutes.', bad: 'The scene was chaos for the first ten.' },
        { text: 'Units are arriving, and each one wants to do something different.', ways: [W('Assign clear sectors', 'smarts', 'Organized'), W('Work a sector yourself', 'fitness', 'In the thick of it'), W('Let the chiefs sort it out', 'charisma', 'Deferential', -0.04)], ok: 'It ran like a drill.', bad: 'Some people waited too long.' },
        { text: 'Hours later, the count is in.', ways: [W('Write an honest after-action report', 'writing', 'Honest, and hard', 0, 0, '', { karma: 2 }), W('Write the version that makes everyone look good', 'charisma', 'Political', -0.03), W('Ask for time off first', 'smarts', 'Healthy')], ok: 'The report became a case study.', bad: 'The report left things out, and people noticed.' },
      ],
      ok: 'Twenty-two of twenty-three went home. The one who did not is the one you carry.', meh: 'It was as good as anyone could have asked for, and not as good as you wanted.', bad: 'More people were lost than should have been, and the inquiry has questions.',
      fx: { ok: { m: 10, name: 3, fame: 2 }, bad: { m: -12, happy: -6 } }, after: (s, out, c, st) => { st.flags.stress = clamp100((st.flags.stress || 15) + 12); if (out === 'ok') webFact(s, 'good_deed', { kind: 'hero', name: 6 }); } },
    { id: 'frequent', name: 'The frequent caller', emoji: '📞', min: 0, w: 1, base: 0.55, who: 'patient', learn: 'npc_habit',
      stages: [{ text: '[who] has called nine times this winter, and nothing is wrong, except that nobody visits.', ways: [W('Sit down and have a cup of tea', 'charisma', 'Kind', 0.04, 0, '', { karma: 2 }), W('Refer them to a social worker', 'smarts', 'Proper'), W('Tell dispatch to stop sending you', 'streetwise', 'Short, and cold')] }],
      ok: '[first] called once more, to say they had joined a card club, and thanks.', meh: 'You made the referral, and the calls went down.', bad: '[first] called again on a night when it really was an emergency, and you were slow to believe it.',
      fx: { ok: { m: 5, karma: 2 }, bad: { m: -5, happy: -3 } } },
    { id: 'burnout', name: 'The wear and tear', emoji: '😩', min: 0, w: (s, c, st) => ((st.flags.stress || 0) >= 70 ? 6 : (st.flags.stress || 0) >= 55 ? 3 : 0.2), when: (s, c, st) => (st.flags.stress || 0) >= 45, base: 0.5,
      stages: [{ text: 'You catch yourself flinching at the sound of the radio on your days off. A colleague has stopped coming to work.', ways: [W('Take a real break', 'smarts', 'Healthy, and costs a month of pay', 0, 0, '', { money: -2500 }), W('Talk to the peer support team', 'charisma', 'Honest', 0.03), W('Push through', 'fitness', 'Brave, and costly', -0.05)] }],
      ok: 'You took the help that was offered, and the radio stopped sounding like a threat.', meh: 'It is better, and it is not fixed.', bad: 'You made a mistake on a call that you would not normally have made. It was a small one. It was enough.',
      fx: { ok: { m: 4, happy: 4 }, bad: { m: -8, happy: -6, health: -3 } }, after: (s, out, c, st) => { st.flags.stress = clamp100((st.flags.stress || 15) - (out === 'ok' ? 35 : out === 'meh' ? 15 : -5)); } },
    { id: 'dispatch', name: 'The dispatcher and the protocol', emoji: '📻', min: 1, w: 0.9, base: 0.5,
      stages: [{ text: 'Dispatch sends you to the wrong end of town on a call you know is worse than it sounds.', ways: [W('Follow the protocol', 'smarts', 'By the book'), W('Divert, and explain later', 'streetwise', 'A judgment call', -0.04), W('Ask a second unit to cover the other side', 'charisma', 'Collaborative', 0.03)] }],
      ok: 'You made the right call, and it was in the log for the right reasons.', meh: 'It was fine.', bad: 'You were wrong, and the log shows it.',
      fx: { ok: { m: 4, perf: 4 }, bad: { m: -6, perf: -4 } } },
    T('family', 'The family finds you', '💐', 'Weeks later, the family you worked with shows up at the station, with a cake and a card, and a grandchild who wants to see the ambulance.', [W('Show the child the truck', 'charisma', 'Warm'), W('Say it was the whole crew', 'charisma', 'Generous', 0.03), W('Keep it short, you are on shift', 'smarts', 'Professional')], 'It was the best part of the year. The station kept the card on the wall for a decade.', 'A nice afternoon, and a lot of cake.', 'You were too tired to be gracious. They understood. You did not.', { fx: { ok: { m: 5, happy: 5, name: 1 } } }),
  ],
});

/* ---- teacher: a full system -------------------------------------------------------------------------------------------- */
const CLASS_MIX = [['an easy class', 1.0], ['an ordinary class', 0.97], ['a lively class', 0.93], ['a hard class', 0.88]];
defFull('teacher', ['boss', 'crunch', 'conflict', 'offer', 'favor'], {
  meter: { name: 'Standing in the classroom', emoji: '🍎', start: 52, words: WORDS('Struggling', 'Finding your feet', 'Steady', 'Respected', 'Remembered') },
  desk: 'Your classroom', fired: 'The school did not renew your contract, and the principal would not look you in the eye.',
  // Tenure, and results, before the big jobs.
  gate: (s, c, st) => (c.level === 0 ? true : c.level === 1 ? (st.flags.years || 0) >= 3 : c.level === 2 ? (st.flags.years || 0) >= 6 && (st.flags.scores || 0) >= 2 : (st.flags.years || 0) >= 9 && (st.flags.scores || 0) >= 4),
  yearStart: (s, c, st) => {
    st.flags.years = (st.flags.years || 0) + 1;
    st.flags.cls = weighted([0, 1, 2, 3], (i) => [1.4, 2, 1.3, 0.7][i]);
    st.flags.strain = clamp100((st.flags.strain || 10) + 6 + st.flags.cls * 3);
    log(s, `🍎 This year you have ${CLASS_MIX[st.flags.cls][0]}.`);
  },
  payMul: (s, st) => 1 + ((st.flags.scores || 0) >= 3 ? 0.08 : 0),
  kv: (s, st) => [['This year', CLASS_MIX[st.flags.cls ?? 1][0]], ['Years teaching', String(st.flags.years || 0)], ['Good results', String(st.flags.scores || 0)]],
  cards: [
    { id: 'first_week', name: 'The first week', emoji: '🎒', w: 1.5, base: 0.5,
      stages: [{ text: 'Thirty names, thirty faces, and a class that is working out how far they can push.', ways: [W('Set firm rules on day one', 'charisma', 'Clear'), W('Win them over with humor', 'acting', 'Warm, and a gamble', -0.02), W('Learn everyone’s name before lunch', 'smarts', 'Personal', 0.04)] }],
      ok: 'By Friday they were arguing about the book, which is all you ever wanted.', meh: 'It is going to be a long year, but a workable one.', bad: 'The class decided you were soft, and told each other.',
      fx: { ok: { m: 5 }, bad: { m: -5 } } },
    { id: 'struggling', name: 'A student who is slipping', emoji: '📉', w: 1.6, base: 0.5, who: 'client',
      stages: [
        { text: 'A bright student has stopped handing things in. You are not sure why, and [who], their parent, has asked for a meeting.', ways: [W('Ask the student, privately', 'charisma', 'Kind', 0.04), W('Talk to the counselor first', 'smarts', 'Careful'), W('Set a firm deadline', 'charisma', 'Fair, and cold')], ok: 'The student told you something that changed how you saw the whole year.', bad: 'They shut down, and the parent heard it from them first.' },
        { text: 'The parent is anxious and defensive. How do you handle the meeting?', ways: [W('Listen first', 'charisma', 'Patient', 0.03), W('Lay out the facts and a plan', 'smarts', 'Clear'), W('Bring in the counselor', 'charisma', 'Supported')], ok: '[first] left with a plan and a handshake.', bad: '[first] left upset, and has written to the principal.' },
      ],
      ok: 'By the spring, that student was back on track, and [first] sent a note you still have.', meh: 'It is better, and it is not fixed.', bad: 'The student transferred. You will wonder about them for years.',
      twist: 'letter', fx: { ok: { m: 6, karma: 2 }, bad: { m: -5, happy: -3 } } },
    { id: 'test', name: 'The big exam', emoji: '📝', w: 1.5, base: 0.5,
      stages: [{ text: 'The school’s funding depends on this year’s scores, and the rest of the staff are teaching to the test.', ways: [W('Teach it properly, and trust it works', 'smarts', 'Honest, and slower', 0, 0, '', { karma: 1 }), W('Drill the test questions', 'charisma', 'Efficient, and hollow'), W('Quietly help the borderline students on the day', 'streetwise', 'A line you do not come back from', -0.07, 0, '', { dirty: true, karma: -4, secret: 'falsifying' })] }],
      ok: 'The scores came in well above the district average, and the students had actually learned something.', meh: 'Average, which is to say fine.', bad: 'The results were poor, and the principal wants a word.',
      fx: { ok: { m: 6, name: 1, perf: 4 }, bad: { m: -7, scandal: 1 } }, after: (s, out, c, st) => { if (out === 'ok') st.flags.scores = (st.flags.scores || 0) + 1; } },
    { id: 'fight', name: 'A fight in the corridor', emoji: '🥊', min: 0, w: (s, c, st) => 0.8 + (st.flags.cls || 0) * 0.5, base: 0.5, risk: 0.2,
      stages: [{ text: 'Two of your students, a crowd of phones, and a corridor that suddenly feels very small.', ways: [W('Step between them and keep your voice low', 'charisma', 'Calm', 0.04), W('Shout for a colleague and clear the hall', 'smarts', 'Procedure'), W('Pull one aside, firmly', 'fitness', 'Physical, and risky', -0.05)] }],
      ok: 'It ended in thirty seconds, and the two of them sat outside your door for an hour and talked.', meh: 'It was broken up, and both were suspended. It was not your best day.', bad: 'You got an elbow, and there is a report.',
      fx: { ok: { m: 5, karma: 1 }, bad: { m: -4, health: -3 } } },
    { id: 'strike', name: 'The staff room votes', emoji: '✊', min: 1, w: 0.9, base: 0.5,
      stages: [{ text: 'The union wants a strike vote over class sizes and pay. The principal has asked you, quietly, to think of the students.', ways: [W('Vote to strike', 'charisma', 'Solidarity', 0, 0, '', { karma: 1 }), W('Vote against, and say why', 'smarts', 'Principled, and lonely'), W('Abstain', 'streetwise', 'Safe, and noticed', 0.02)] }],
      ok: 'The deal that came out of it was better than anyone had expected, and you were a part of it.', meh: 'A compromise, and a few bad feelings.', bad: 'The strike dragged on, and some colleagues stopped speaking to you.',
      fx: { ok: { m: 4, perf: 3, name: 1 }, bad: { m: -6 } } },
    { id: 'mentor', name: 'A new teacher on your corridor', emoji: '🌱', min: 1, w: 1, base: 0.55,
      stages: [{ text: 'A first-year is drowning, and has been put in your care.', ways: [W('Share every lesson plan', 'charisma', 'Generous', 0.04, 0, '', { karma: 2 }), W('Observe, and give honest feedback', 'smarts', 'Useful, and blunt'), W('Tell them to find their own way', 'streetwise', 'Easy, and cold')] }],
      ok: 'By spring, they were running a better class than you did at the same stage, and said so.', meh: 'They made it through the year. That is the point.', bad: 'They quit in February. The principal asked what you had told them.',
      fx: { ok: { m: 5, karma: 2 }, bad: { m: -4 } } },
    { id: 'parent_night', name: 'Parent-teacher night', emoji: '👪', w: 1.1, base: 0.55, who: 'client',
      stages: [{ text: '[who] has come to talk about their child’s grade, and is not in a mood to listen.', ways: [W('Walk through the work, piece by piece', 'smarts', 'Factual'), W('Start with what the child does well', 'charisma', 'Kind', 0.04), W('Hold the line on the grade', 'charisma', 'Firm, and cold', -0.02)] }],
      ok: '[first] left saying you were the first teacher who had told them what was actually going on.', meh: '[first] was polite, and unconvinced.', bad: '[first] is going to the principal, and has said so.',
      fx: { ok: { m: 4 }, bad: { m: -4 } } },
    { id: 'burnout', name: 'The Sunday night dread', emoji: '😩', min: 0, w: (s, c, st) => ((st.flags.strain || 0) >= 70 ? 6 : (st.flags.strain || 0) >= 55 ? 3 : 0.2), when: (s, c, st) => (st.flags.strain || 0) >= 45, base: 0.5,
      stages: [{ text: 'You have been grading until midnight for months, and you have started to dread the sound of the first bell.', ways: [W('Take a personal day, and mean it', 'smarts', 'Healthy'), W('Talk to a mentor', 'charisma', 'Honest', 0.03), W('Push through', 'fitness', 'Brave, and costly', -0.05)] }],
      ok: 'You took the day, and the next one, and found out the class had not fallen apart without you.', meh: 'You are managing, and that is the best that can be said.', bad: 'You snapped at a student for something small. That is the thing you will think about.',
      fx: { ok: { m: 3, happy: 4 }, bad: { m: -7, happy: -5 } }, after: (s, out, c, st) => { st.flags.strain = clamp100((st.flags.strain || 10) - (out === 'ok' ? 35 : out === 'meh' ? 15 : -5)); } },
    { id: 'award', name: 'Teacher of the year', emoji: '🏆', min: 1, w: (s, c, st) => ((st.flags.scores || 0) >= 2 ? 1.2 : 0), when: (s, c, st) => (st.flags.scores || 0) >= 2 && st.m >= 60, base: 0.6,
      stages: [{ text: 'You have been nominated for the district’s teacher of the year. The ceremony includes a speech.', ways: [W('Give the credit to your students', 'charisma', 'Gracious', 0.03, 0, '', { karma: 2 }), W('Tell the truth about the funding', 'smarts', 'Brave, and a risk'), W('Keep it short and sweet', 'acting', 'Safe')] }],
      ok: 'A hundred former students were in the room. Someone said the word "remembered," and you cried.', meh: 'You did not win, and the nomination was enough.', bad: 'The speech was a mess, and the school board was in the front row.',
      fx: { ok: { m: 6, fame: 2, name: 3, happy: 6 }, bad: { m: -3 } } },
    T('letter', 'A letter, years late', '✉️', 'A former student writes to say that your class was the reason they did not give up. They are a nurse now. They sent a photo.', [W('Write back, at length', 'writing', 'Warm'), W('Pin it above your desk', 'charisma', 'Quiet'), W('Forward it to the principal', 'smarts', 'Proud')], 'You kept it in your desk for the rest of your career, and read it on the bad days.', 'It was a nice afternoon.', 'You meant to write back, and did not, and then it was too late.', { fx: { ok: { m: 5, happy: 5, karma: 2 } } }),
  ],
});
addTwist('teacher', 'test', T('winners', 'The students who did it', '🎉', 'The class that did so well wants to celebrate, and invites you. A parent donates a small fund for the school library in your name.', [W('Accept, and give it to the library', 'charisma', 'Generous', 0, 0, '', { karma: 2 }), W('Keep it modest, and say thanks', 'acting', 'Humble'), W('Turn it down', 'smarts', 'Awkward')], 'The library has your name on a shelf, and a lot of very small people use it.', 'A nice moment.', 'It felt like too much, and you said so too loudly.', { fx: { ok: { m: 4, happy: 4, name: 1 } }, after: (s, out, c, st) => { if (out === 'ok') webFact(s, 'good_deed', { kind: 'organize', name: 3 }); } }), 0.3);

/* ---- lawyer: a full system -------------------------------------------------------------------------------------------------- */
defFull('lawyer', ['boss', 'training', 'mistake', 'offer'], {
  meter: { name: 'Standing at the bar', emoji: '⚖️', start: 52, words: WORDS('Doubted', 'An associate', 'Reliable', 'Sought after', 'A name on the door') },
  desk: 'Your docket', fired: 'The firm did not make you an offer, and it was kind about it.',
  // The partner track: results, and the clients you brought in.
  gate: (s, c, st) => (c.level <= 1 ? true : c.level === 2 ? (st.flags.wins || 0) >= 2 : (st.flags.wins || 0) >= 4 && (st.flags.clients || 0) >= 2),
  yearStart: (s, c, st) => { st.flags.hours = clamp100((st.flags.hours || 20) + 7 - (c.level >= 3 ? 4 : 0)); },
  payMul: (s, st) => 1 + (st.flags.clients || 0) * 0.04,
  kv: (s, st) => [['Trials won', String(st.flags.wins || 0)], ['Clients you brought in', String(st.flags.clients || 0)], ['Billable strain', `${Math.round(st.flags.hours || 20)}%`]],
  cards: [
    { id: 'billable', name: 'The billable hour', emoji: '⏱️', w: 1.4, base: 0.55, pay: 1500,
      stages: [{ text: 'You are 140 hours behind the firm’s target, and it is only October.', ways: [W('Work every weekend', 'fitness', 'Grind, and a toll', -0.03), W('Delegate to the juniors', 'charisma', 'Smart, and noticed', 0.03), W('Pad the entries', 'streetwise', 'A line you do not come back from', -0.08, 0, '', { dirty: true, karma: -4, secret: 'falsifying' })] }],
      ok: 'You hit the target with a week to spare, and nobody asked how.', meh: 'You were close enough that nobody made a speech.', bad: 'Your numbers were a problem, and everyone knew it.',
      fx: { ok: { m: 5, perf: 3 }, bad: { m: -6 } }, after: (s, out, c, st) => { st.flags.hours = clamp100((st.flags.hours || 20) + (out === 'ok' ? 3 : 8)); } },
    { id: 'trial', name: 'The trial', emoji: '🏛️', min: 1, w: 1.8, base: 0.45, pay: 4000, who: 'client',
      intro: '[who] has put everything on you.',
      stages: [
        { text: 'Opening statements. The other side is better funded and has a theory.', ways: [W('Tell a simple story', 'charisma', 'Clear'), W('Lead with the evidence', 'smarts', 'Thorough'), W('Attack their theory early', 'acting', 'Bold, and a risk', -0.04)], ok: 'The jury was listening.', bad: 'The jury drifted.' },
        { text: 'Your key witness is on the stand, and they are not as sure as they were in your office.', ways: [W('Walk them through it, gently', 'charisma', 'Patient', 0.03), W('Press, and keep it moving', 'smarts', 'Direct'), W('Go to the documents instead', 'writing', 'Safe')], ok: 'It held.', bad: 'It went sideways, and the other side noticed.' },
        { text: 'Closing. Twelve strangers, and a long afternoon.', ways: [W('Speak plainly, to one person at a time', 'charisma', 'Human', 0.04), W('Walk them through the facts, one by one', 'smarts', 'Logical'), W('Close on the moral of it', 'acting', 'Persuasive')], ok: 'You could feel it turn.', bad: 'You lost the room by the second page.' },
      ],
      ok: '"Not guilty." [first] put both hands on the table and did not say anything for a long time.', meh: 'A hung jury. The retrial is in the spring.', bad: 'Guilty. [first] looked at you, and you will see that look for a long time.',
      twist: 'press', fx: { ok: { m: 8, name: 2, fame: 2 }, bad: { m: -8, happy: -5 } }, after: (s, out, c, st) => { if (out === 'ok') st.flags.wins = (st.flags.wins || 0) + 1; st.flags.hours = clamp100((st.flags.hours || 20) + 5); } },
    { id: 'probono', name: 'A pro bono case', emoji: '🤝', min: 0, w: 1.1, base: 0.5, who: 'client',
      stages: [{ text: '[who] cannot pay, has been turned away twice, and has a case that deserves a hearing.', ways: [W('Take it, and do it properly', 'smarts', 'Generous, and time', 0, 0, '', { karma: 3, name: 1 }), W('Refer them to legal aid', 'charisma', 'Responsible'), W('Say you are too busy', 'streetwise', 'Honest, and cold')] }],
      ok: 'You won, and [first] told the whole town. The firm put it in the newsletter, a bit grudgingly.', meh: 'It ended in a settlement, and [first] was grateful.', bad: 'You lost, and it hurt more than most.',
      fx: { ok: { m: 5, name: 2, karma: 3 }, bad: { m: -3 } }, after: (s, out) => { if (out === 'ok') webFact(s, 'good_deed', { kind: 'charity', name: 3 }); } },
    { id: 'confides', name: 'What the client told you', emoji: '🤐', min: 0, w: 1, base: 0.5, who: 'client', learn: 'npc_crime',
      stages: [{ text: '[who] tells you something in confidence that you did not want to know. It is about somebody else.', ways: [W('Keep the privilege, and say nothing', 'smarts', 'By the rule, and a burden', 0, 0, '', { karma: 0 }), W('Advise them to come forward', 'charisma', 'Right, and hard', 0.02, 0, '', { karma: 2 }), W('Withdraw from the case', 'streetwise', 'Clean, and costly')] }],
      ok: '[first] listened to you, and made the right call. You will never be able to say what you did.', meh: 'It stayed in the room, and you did not sleep that week.', bad: 'It got out, somehow, and the bar association wants a word.',
      fx: { ok: { m: 4, karma: 2 }, bad: { m: -7, scandal: 4 } } },
    { id: 'discovery', name: 'Discovery trouble', emoji: '📂', min: 0, w: 1.2, base: 0.5,
      stages: [{ text: 'The other side produced forty thousand pages at 4 p.m. on the last day, and one of them is a problem for your client.', ways: [W('Read it all, overnight', 'smarts', 'Thorough, and awful'), W('Delegate it, and review the flagged pages', 'business', 'Efficient'), W('Move to exclude it', 'writing', 'Clever, and a risk', -0.03)] }],
      ok: 'You found the page before they could use it, and you used it first.', meh: 'You found it, and so did they.', bad: 'You found it at 3 a.m., and it was too late to do anything.',
      fx: { ok: { m: 5, perf: 3 }, bad: { m: -6 } } },
    { id: 'pitch', name: 'The big pitch', emoji: '📈', min: 2, w: 1.3, base: 0.45,
      stages: [{ text: 'A large company is choosing a law firm this week, and you are the one in the room.', ways: [W('Sell them on results', 'smarts', 'Data'), W('Sell them on yourself', 'charisma', 'Warm, and a risk', -0.02), W('Offer a discount', 'business', 'Easy, and cheap')] }],
      ok: 'They signed. The partners took you to dinner, which they have never done before.', meh: 'They are going to think about it.', bad: 'They went with the bigger name.',
      fx: { ok: { m: 6, perf: 4 }, bad: { m: -3 } }, after: (s, out, c, st) => { if (out === 'ok') st.flags.clients = (st.flags.clients || 0) + 1; } },
    { id: 'partner_vote', name: 'The partnership vote', emoji: '🗳️', min: 3, w: 1.4, base: 0.45, when: (s, c, st) => (st.flags.wins || 0) >= 2,
      stages: [{ text: 'The partners are meeting tonight about you, and you are in the hallway pretending to read an email.', ways: [W('Wait, and let the record speak', 'smarts', 'Patient'), W('Have a quiet word with the managing partner', 'charisma', 'Political', 0.03), W('Offer to take on the worst client', 'business', 'Eager, and a risk')] }],
      ok: 'They called you in at ten, and shook your hand.', meh: 'Not this year. Next year, they said, with a smile.', bad: 'They went with someone else.',
      fx: { ok: { m: 8, perf: 6, happy: 6 }, bad: { m: -5, happy: -4 } } },
    { id: 'burn', name: 'The long hours', emoji: '😩', min: 0, w: (s, c, st) => ((st.flags.hours || 0) >= 70 ? 6 : (st.flags.hours || 0) >= 55 ? 3 : 0.2), when: (s, c, st) => (st.flags.hours || 0) >= 45, base: 0.5,
      stages: [{ text: 'You have missed three anniversaries, a recital and your own birthday, and you did not notice any of them until now.', ways: [W('Take a vacation, a real one', 'smarts', 'Healthy, and costly', 0, 0, '', { money: -3000 }), W('See someone about it', 'charisma', 'Honest', 0.03), W('Keep going', 'fitness', 'Brave, and foolish', -0.05)] }],
      ok: 'You went somewhere without a phone, and came back with a different idea about how to do this.', meh: 'It helped a little, which is more than nothing.', bad: 'A mistake on a filing, and a client you will not get back.',
      fx: { ok: { m: 3, happy: 5 }, bad: { m: -8, happy: -6, health: -3 } }, after: (s, out, c, st) => { st.flags.hours = clamp100((st.flags.hours || 20) - (out === 'ok' ? 35 : out === 'meh' ? 15 : -5)); } },
    T('press', 'The press wants a statement', '🎤', 'You walk out of the courthouse into a wall of cameras.', [W('Say a few careful words', 'charisma', 'Measured'), W('Let the client speak', 'acting', 'Risky'), W('Say nothing, and keep walking', 'smarts', 'Safe')], 'It was twenty seconds on the evening news, and every law student in the state watched it.', 'A short clip, and nothing worse.', 'You said one sentence too many.', { fx: { ok: { m: 4, fame: 3, name: 2 }, bad: { m: -5, scandal: 3 } } }),
  ],
});

/* ---- the chef's cook-off circuit ------------------------------------------------------------------------------------------- */
{
  const chef = WORKDECK.chef;
  const stage = (n) => (s, c, st) => (st.flags.cook || 0) === n;
  chef.cards.push(
    { id: 'cook_regional', name: 'The regional cook-off', emoji: '🥘', min: 1, w: 1.2, base: 0.6, when: stage(0), pay: 1500,
      intro: 'Sixty minutes, one basket of mystery ingredients, and eleven other chefs.',
      stages: [
        { text: 'The basket is open. What is your concept?', ways: [W('Something classic, perfectly executed', 'cooking', 'Safe, and good'), W('Something daring', 'cooking', 'A gamble', -0.06), W('Play to the ingredients, and keep it simple', 'smarts', 'Smart', 0.03)], ok: 'The plan came together in your head, whole.', bad: 'Halfway through, you changed your mind.' },
        { text: 'Twelve minutes left, and a pan has gone dry.', ways: [W('Re-plate everything', 'cooking', 'Focused'), W('Fix it and push on', 'fitness', 'Hands'), W('Ask the judge for time', 'charisma', 'Brave, and against the rules', -0.1)], ok: 'The plate went out looking like the plan.', bad: 'The plate went out looking like the pan.' },
        { text: 'The judges are tasting. One of them is a critic whose review you have been dreading for years.', ways: [W('Explain the dish with confidence', 'charisma', 'Persuasive'), W('Let the food speak', 'cooking', 'Quiet'), W('Tell the story behind it', 'acting', 'Warm', 0.02)], ok: 'The critic put down the spoon, and looked at you.', bad: 'The critic took one bite, and wrote something down.' },
      ],
      ok: 'You won the regional title. A trophy, a check and a camera in your face, all in the same hour.', meh: 'Third place, and a card from a restaurant owner who liked the dish.', bad: 'You went out in the first round. It happens to everyone, supposedly.',
      fx: { ok: { m: 7, fame: 4, name: 2 }, bad: { m: -4 } }, after: (s, out, c, st) => { if (out === 'ok') st.flags.cook = 1; } },
    { id: 'cook_national', name: 'The national final', emoji: '🏆', min: 2, w: 1.4, base: 0.57, when: stage(1), pay: 6000,
      stages: [
        { text: 'The national final is live, with an audience and four cameras. You are cooking against a chef you have admired for twenty years.', ways: [W('Cook your best dish', 'cooking', 'Honest'), W('Cook to beat them', 'cooking', 'Competitive', -0.04), W('Cook for the judges’ palate', 'smarts', 'Strategic', 0.02)], ok: 'The kitchen felt like a stage, and you were not afraid of it.', bad: 'The cameras got into your head.' },
        { text: 'A burner dies at the worst possible moment.', ways: [W('Improvise on the spot', 'cooking', 'Flexible'), W('Ask the production for help', 'charisma', 'Honest'), W('Keep the plan, and work around it', 'smarts', 'Disciplined')], ok: 'It looked on television like it was the plan all along.', bad: 'It looked on television exactly like what it was.' },
        { text: 'The final scores. The rival and you are tied.', ways: [W('Congratulate them first', 'charisma', 'Classy', 0.04), W('Wait quietly', 'smarts', 'Calm'), W('Argue for a tasting recount', 'streetwise', 'Bold, and risky', -0.08)], ok: 'Your name was called.', bad: 'Theirs was.' },
      ],
      ok: 'National champion. The phone has not stopped ringing, and you have not eaten a proper meal in a week.', meh: 'Runner-up, to a chef you respect. It was the best loss of your life.', bad: 'You fell apart on camera, and the clip is going around.',
      fx: { ok: { m: 9, fame: 8, name: 4, happy: 8 }, bad: { m: -6, happy: -4, scandal: 1 } }, after: (s, out, c, st) => { if (out === 'ok') st.flags.cook = 2; } },
    { id: 'cook_world', name: 'The world stage', emoji: '🌍', min: 3, w: 1.3, base: 0.55, when: stage(2), pay: 20000,
      stages: [
        { text: 'The world final is in a city you have never seen, in front of a panel of judges who have written the books you learned from.', ways: [W('Cook the dish that made your name', 'cooking', 'Signature'), W('Cook something new', 'cooking', 'A risk', -0.05), W('Cook your family’s recipe', 'cooking', 'Heart', 0.03)], ok: 'You could hear your own pulse, and you cooked through it.', bad: 'You tried to prove something, and it showed.' },
        { text: 'A rival from the other side of the world is cooking something astonishing next to you.', ways: [W('Do not look', 'smarts', 'Focused'), W('Adapt, and make yours better', 'cooking', 'Competitive', -0.03), W('Compliment them mid-service', 'charisma', 'Classy', 0.03)], ok: 'You came out of it better than you went in.', bad: 'They got into your head.' },
        { text: 'The head judge tastes your plate and says nothing for a very long time.', ways: [W('Stay still', 'smarts', 'Calm'), W('Describe what you were thinking', 'charisma', 'Open'), W('Look at the floor', 'acting', 'Humble')], ok: 'She said one word, and the room stood up.', bad: 'She asked a polite question, which is not a good sign.' },
      ],
      ok: 'World champion. They put your name on a wall in a city you did not know a week ago, and a very large check in your hand.', meh: 'A medal, and a short speech in a language you do not speak.', bad: 'You came home with a handshake, and a lot of new respect for the people who beat you.',
      fx: { ok: { m: 12, fame: 15, name: 6, happy: 12 }, bad: { m: -4, happy: -3 } }, after: (s, out, c, st) => { if (out === 'ok') { st.flags.cook = 3; tally(s, 'worldCook'); } } },
  );
  chef.kv = (s, st) => [['Cook-off circuit', ['Not yet', 'Regional champion', 'National champion', 'World champion'][st.flags.cook || 0]]];
}

/* ---- seasons: farming and fishing -------------------------------------------------------------------------------------------- */
const FARM_WX = [['a good growing year', 1.1, 'good'], ['an ordinary year', 1.0, 'ok'], ['a dry year', 0.8, 'dry'], ['a wet, miserable year', 0.85, 'wet'], ['a freak hail year', 0.7, 'hail']];
const FARM_PRICE = [['strong prices', 1.15], ['ordinary prices', 1.0], ['low prices', 0.85]];
defFull('farm', ['crunch', 'favor', 'mistake'], {
  meter: { name: 'Standing in the valley', emoji: '🚜', start: 52, words: WORDS('Struggling', 'Getting by', 'Steady', 'Well regarded', 'The farm everyone points to') },
  desk: 'Your season', fired: 'The land went to a neighbor, and so did the work. It is nobody’s fault.',
  yearStart: (s, c, st) => {
    st.flags.wx = weighted([0, 1, 2, 3, 4], (i) => [2, 3, 1.5, 1.3, 0.5][i]);
    st.flags.px = weighted([0, 1, 2], (i) => [1.2, 3, 1.5][i]);
    log(s, `🌾 It is ${FARM_WX[st.flags.wx][0]}, with ${FARM_PRICE[st.flags.px][0]}.`);
  },
  payMul: (s, st) => FARM_WX[st.flags.wx ?? 1][1] * FARM_PRICE[st.flags.px ?? 1][1],
  kv: (s, st) => [['This season', FARM_WX[st.flags.wx ?? 1][0]], ['The market', FARM_PRICE[st.flags.px ?? 1][0]], ['Debt', st.flags.debt ? 'Yes' : 'None']],
  cards: [
    { id: 'planting', name: 'Planting', emoji: '🌱', w: 1.4, base: 0.55, pay: 3000,
      stages: [{ text: 'The ground is ready, and the forecast is a coin flip.', ways: [W('Plant now, while the window is open', 'fitness', 'Hands'), W('Wait a week, for the rain', 'smarts', 'Patient', 0.03), W('Split it across two fields', 'business', 'Hedged')] }],
      ok: 'A clean planting, and the first green by the end of the month.', meh: 'A decent stand, and a few gaps.', bad: 'A hard rain washed half of it out, and you replanted.',
      fx: { ok: { m: 4 }, bad: { m: -4 } } },
    { id: 'weather', name: 'The weather turns', emoji: '⛈️', w: (s, c, st) => ((st.flags.wx ?? 1) >= 2 ? 3 : 0.6), base: 0.5, risk: 0.3,
      stages: [{ text: 'It has not rained in six weeks, or it has not stopped in six days. Either way, the crop is in trouble.', ways: [W('Irrigate, drain or cover everything you can', 'fitness', 'Hard work'), W('Prioritize the best field', 'smarts', 'Triage'), W('Call the extension office, and get advice', 'charisma', 'Practical', 0.03)] }],
      ok: 'You saved most of it, with two weeks of sleep and a pump that should have been replaced years ago.', meh: 'You saved half, which is what a lot of people got.', bad: 'The weather won.',
      fx: { ok: { m: 5, perf: 3 }, bad: { m: -6, happy: -4 } } },
    { id: 'pest', name: 'Pests', emoji: '🐛', w: 1.1, base: 0.5,
      stages: [{ text: 'Something is eating the crop from the edges in, and your neighbor’s field is worse.', ways: [W('Spray, as the guidelines say', 'smarts', 'By the book', 0.02), W('Try a natural control', 'smarts', 'Slower, and gentler'), W('Do nothing, and hope', 'streetwise', 'Free, and a risk', -0.05)] }],
      ok: 'It stopped at the fence line, and your neighbor asked what you had done.', meh: 'You lost a corner of it.', bad: 'It took a third of the harvest.',
      fx: { ok: { m: 4 }, bad: { m: -5 } } },
    { id: 'harvest', name: 'Harvest', emoji: '🌾', w: 1.6, base: 0.5, pay: 6000,
      stages: [
        { text: 'The grain is ready, and so is a storm front on the radar.', ways: [W('Bring everyone in, and run through the night', 'fitness', 'Brutal'), W('Rent a second combine', 'business', 'Expensive, and fast', 0.04, 1500), W('Gamble on the weather', 'streetwise', 'Free, and a risk', -0.07)], ok: 'It was in the bin by dawn.', bad: 'The storm came early.' },
        { text: 'The buyer is at the gate, and the price has dropped.', ways: [W('Sell now', 'business', 'Safe'), W('Store it, and wait for a better price', 'smarts', 'A bet', -0.02), W('Sell half, store half', 'business', 'Hedged', 0.02)], ok: 'You got more than you expected.', bad: 'The price fell again.' },
      ],
      ok: 'A good year, and a good price. The bank manager was friendly on the phone.', meh: 'Break-even, and a lot of work.', bad: 'The numbers do not work, and you will have to borrow.',
      twist: 'buyer', fx: { ok: { m: 7, perf: 4 }, bad: { m: -7 } }, after: (s, out, c, st) => { if (out === 'bad') st.flags.debt = true; } },
    { id: 'loan', name: 'The bank', emoji: '🏦', w: (s, c, st) => (st.flags.debt ? 2.5 : 0.5), base: 0.5, when: (s, c, st) => !!st.flags.debt || c.level >= 1,
      stages: [{ text: 'The loan comes due, and it is not a good year to ask for time.', ways: [W('Ask for an extension, in person', 'charisma', 'Honest', 0.03), W('Sell some equipment', 'business', 'Painful'), W('Take a second job in town', 'fitness', 'Hard, and honest', 0, 0, '', { karma: 1 })] }],
      ok: 'The manager grumbled, and signed. You owe them, and you know it.', meh: 'You scraped it together, and it hurt.', bad: 'They took a field. It was a small one. It was the best one.',
      fx: { ok: { m: 3 }, bad: { m: -8, happy: -5 } }, after: (s, out, c, st) => { if (out !== 'bad') st.flags.debt = false; } },
    { id: 'breakdown', name: 'The tractor dies', emoji: '🔧', w: 1, base: 0.5,
      stages: [{ text: 'It is the one week you cannot afford it, and the repair shop is a day away.', ways: [W('Fix it yourself', 'fitness', 'Hands'), W('Borrow a neighbor’s', 'charisma', 'Neighborly', 0.04), W('Pay for a rush repair', 'business', 'Expensive', 0.04, 1200)] }],
      ok: 'It ran again by morning, with a part nobody has seen since the nineties.', meh: 'A day lost, and a favor owed.', bad: 'A week lost, and a bill that made you sit down.',
      fx: { ok: { m: 3 }, bad: { m: -4 } } },
    { id: 'water', name: 'Water rights', emoji: '💧', min: 1, w: 1, base: 0.5, who: 'client',
      stages: [{ text: '[who], your neighbor, wants to talk about the creek, in the voice that means a lawyer is next.', ways: [W('Sit down at their kitchen table', 'charisma', 'Neighborly', 0.04), W('Show them the survey', 'smarts', 'Factual'), W('Call your own lawyer', 'business', 'Escalation', -0.02, 800)] }],
      ok: '[first] agreed to a schedule, and you shook on it. You have been neighbors for twenty years, and will be for twenty more.', meh: 'A compromise nobody likes.', bad: 'It is in court, and it will be for years.',
      fx: { ok: { m: 4, karma: 1 }, bad: { m: -5 } } },
    { id: 'accident', name: 'A farm accident', emoji: '⚠️', w: 0.7, base: 0.5, risk: 1.2, die: 'a farm accident',
      stages: [{ text: 'Something goes wrong with a machine, or an animal, or a ladder, in the half-second when you were thinking about something else.', ways: [W('React fast', 'fitness', 'Instinct'), W('Stay calm, and think', 'smarts', 'Careful'), W('Shout for help', 'charisma', 'Safe', 0.02)] }],
      ok: 'A bruise and a story. Your neighbor has been telling it ever since.', meh: 'A cast, and six weeks of being told to sit down.', bad: 'It was serious, and the recovery will be long.',
      fx: { ok: { m: 2 }, bad: { m: -4, health: -8 } } },
    T('buyer', 'A buyer’s offer', '🤝', 'A grain company has noticed your yields, and offers a three-year contract, at a fixed price, with a bonus.', [W('Sign it', 'business', 'Steady, and capped'), W('Negotiate for more', 'charisma', 'Bold'), W('Decline, and keep your freedom', 'smarts', 'Independent')], 'You got a better deal than the one they came with, and the bank manager sent a fruit basket.', 'A fair contract, and a few years of certainty.', 'The price in the fine print was not the price in the handshake.', { fx: { ok: { m: 5, perf: 4 }, bad: { m: -4 } }, after: (s, out) => { if (out === 'ok') add(s, { money: price(s, 5000) }); } }),
  ],
});
const SEA = [['a calm season', 1.1, 0], ['an ordinary season', 1.0, 1], ['a rough season', 0.88, 2], ['a storm year', 0.75, 3]];
defFull('fishing', ['crunch', 'favor', 'training'], {
  meter: { name: 'Standing on the dock', emoji: '🎣', start: 52, words: WORDS('A hazard', 'Green', 'Steady', 'Respected', 'The one they follow out') },
  desk: 'Your season', fired: 'The captain found another deckhand, and nobody on the dock argued.',
  yearStart: (s, c, st) => {
    st.flags.sea = weighted([0, 1, 2, 3], (i) => [2, 3, 1.6, 0.8][i]);
    st.flags.quota = weighted([0, 1], (i) => [3, 1][i]); // 1 = a tight quota this year
    log(s, `🎣 It is ${SEA[st.flags.sea][0]}${st.flags.quota ? ', and the quota is tight' : ''}.`);
  },
  payMul: (s, st) => SEA[st.flags.sea ?? 1][1] * (st.flags.quota ? 0.9 : 1),
  kv: (s, st) => [['This season', SEA[st.flags.sea ?? 1][0]], ['The quota', st.flags.quota ? 'Tight' : 'Ordinary']],
  cards: [
    { id: 'haul', name: 'The haul', emoji: '🐟', w: 1.8, base: 0.5, pay: 3500,
      stages: [{ text: 'Four hours out, the sonar lights up, and the crew starts to move.', ways: [W('Set the nets, now', 'fitness', 'Fast'), W('Wait, and read the water', 'smarts', 'Patient', 0.03), W('Radio another boat to share the find', 'charisma', 'Sociable')] }],
      ok: 'The hold was full by dusk, and nobody on the dock could stop talking about it.', meh: 'A decent catch, and an honest day.', bad: 'Empty nets, and a long, quiet run home.',
      fx: { ok: { m: 5, perf: 3 }, bad: { m: -4 } } },
    { id: 'storm', name: 'A storm at sea', emoji: '🌊', w: (s, c, st) => ((st.flags.sea ?? 1) >= 2 ? 2.5 : 0.7), base: 0.45, risk: 1.4, die: 'lost at sea',
      stages: [
        { text: 'The sky goes green, and the radio says the storm is coming faster than forecast. You are two hours from port.', ways: [W('Run for port, now', 'driving', 'Fast'), W('Ride it out and secure everything', 'fitness', 'Steady'), W('Follow another boat in', 'charisma', 'Safe', 0.03)], ok: 'You beat it by an hour.', bad: 'The first wave came over the stern.' },
        { text: 'A deckhand goes down, and the boat is heaving.', ways: [W('Go after them yourself', 'fitness', 'Brave, and risky', -0.06), W('Throw the line, and turn the boat', 'driving', 'Skill'), W('Call the coast guard, and hold the position', 'smarts', 'By the book')], ok: 'They were back on deck, soaked and swearing.', bad: 'It took a long time, and a lot of luck.' },
      ],
      ok: 'You came into harbor to a crowd of wives, husbands and kids. Everyone was home.', meh: 'You lost gear and a day. Nobody was lost.', bad: 'It was a bad one. The harbor held a memorial the next week, and you were in the front row.',
      fx: { ok: { m: 8, name: 2 }, bad: { m: -9, happy: -7 } } },
    { id: 'rescue', name: 'A distress call', emoji: '🆘', min: 0, w: 0.8, base: 0.5, risk: 0.7,
      stages: [{ text: 'A small boat is taking on water in the next cove, and you are the closest.', ways: [W('Go straight there', 'driving', 'Fast, and brave'), W('Call the coast guard, and move in', 'smarts', 'Coordinated'), W('Send the dinghy', 'fitness', 'Hands')] }],
      ok: 'You got three people off before it went down. The coast guard put your name in the report.', meh: 'You were there in time to help the coast guard.', bad: 'You were too late for one of them, and you will not forget it.',
      fx: { ok: { m: 7, name: 2, karma: 4, fame: 1 }, bad: { m: -4, happy: -5 } }, after: (s, out) => { if (out === 'ok') webFact(s, 'good_deed', { kind: 'hero', name: 5 }); } },
    { id: 'inspector', name: 'The quota inspector', emoji: '📋', w: (s, c, st) => (st.flags.quota ? 2 : 0.7), base: 0.5,
      stages: [{ text: 'The inspector is at the dock, and you are over on one species.', ways: [W('Tell them the truth', 'smarts', 'Honest, and costly', 0, 0, '', { karma: 2 }), W('Argue the numbers', 'charisma', 'Bold'), W('Hide the excess', 'streetwise', 'A line you do not come back from', -0.08, 0, '', { dirty: true, karma: -4, secret: 'fencing' })] }],
      ok: 'A warning, and a handshake. You are on his good list now.', meh: 'A fine, and a long conversation about next year.', bad: 'He found it. The boat is tied up for a month.',
      fx: { ok: { m: 4, name: 1 }, bad: { m: -8, scandal: 3 } } },
    { id: 'repair', name: 'The engine', emoji: '🔧', w: 1.1, base: 0.5,
      stages: [{ text: 'The engine has been making a noise for a month, and the boat is the whole business.', ways: [W('Rebuild it yourself', 'fitness', 'Hands'), W('Pay the yard for a proper job', 'business', 'Expensive, and safe', 0.05, 3000), W('Nurse it through the season', 'streetwise', 'Free, and a risk', -0.06)] }],
      ok: 'It ran better than it had in years, and cost you a month of evenings.', meh: 'It runs. You do not entirely trust it.', bad: 'It died out past the headland, and a tow cost more than the repair would have.',
      fx: { ok: { m: 3 }, bad: { m: -5 } } },
    { id: 'smuggle', name: 'A quiet offer', emoji: '🤫', min: 1, w: 0.9, base: 0.5, risk: 0.2,
      stages: [{ text: 'A man on the dock offers a lot of money to take a few crates in from a larger boat, past the harbor lights, and not ask what is in them.', ways: [W('Say no, and mean it', 'smarts', 'Clean', 0, 0, '', { karma: 2 }), W('Tell the coast guard', 'charisma', 'Right, and risky', -0.03, 0, '', { karma: 3, name: 1 }), W('Take the money', 'streetwise', 'A line you do not come back from', -0.06, 0, '', { dirty: true, money: 6000, karma: -6, secret: 'fencing' })] }],
      ok: 'He nodded, and never spoke to you again. A month later, the coast guard made an arrest.', meh: 'He found another boat. You will never know what was in the crates.', bad: 'Word got out that you were asked, and somebody has wondered since whether you said yes.',
      fx: { ok: { m: 5, name: 1 }, bad: { m: -6, scandal: 3 } } },
    { id: 'crew', name: 'A green deckhand', emoji: '⚓', min: 1, w: 1, base: 0.55,
      stages: [{ text: 'A new hand is seasick, scared and trying very hard to look otherwise.', ways: [W('Teach them properly', 'charisma', 'Patient', 0.04, 0, '', { karma: 1 }), W('Throw them into the work', 'fitness', 'Hard, and quick'), W('Send them back to shore', 'smarts', 'Safe, and cold')] }],
      ok: 'By September, they were setting nets faster than you, and said so, and grinned.', meh: 'They stayed the season.', bad: 'They quit at the dock, and told everyone why.',
      fx: { ok: { m: 4, karma: 1 }, bad: { m: -3 } } },
  ],
});

/* ---- twists for the first showpiece jobs ----------------------------------------------------------------------------------- */
addTwist(['doctor', 'surgeon'], 'puzzle', T('grateful', 'The patient who came back', '🩺', 'The patient you finally diagnosed has come to the clinic in person, with a plant and a long, thank-you speech.', [W('Accept it warmly', 'charisma', 'Kind'), W('Pass the credit to the team', 'charisma', 'Generous', 0.03), W('Say you were just doing your job', 'smarts', 'Humble')], 'It was the best part of the year. The plant is still on your desk.', 'A nice afternoon.', 'You were rushed, and they left feeling like an interruption.', { fx: { ok: { m: 4, happy: 5, karma: 2 } } }), 0.4);
addTwist(['doctor', 'surgeon'], 'er_night', T('grant', 'A research offer', '🔬', 'A reviewer saw how you handled that case, and wants to bring you in on a study with a very big grant.', [W('Say yes, and carve out the time', 'smarts', 'Ambitious, and busy'), W('Join as an adviser only', 'charisma', 'Careful'), W('Decline', 'smarts', 'Focused')], 'The paper had your name on it, and the grant paid for a new wing.', 'It was a good line on your CV, and a lot of meetings.', 'It ate your evenings, and went nowhere.', { fx: { ok: { m: 5, name: 2, fame: 2 }, bad: { m: -3, happy: -3 } } }), 0.3);
addTwist('firefighter', 'structure', T('medalcall', 'A commendation', '🎖️', 'The chief reads out your name at the station meeting, and the mayor will give you a medal on Friday.', [W('Accept, and share it with the crew', 'charisma', 'Gracious', 0, 0, '', { karma: 2 }), W('Say you did what any of them would have', 'smarts', 'Humble'), W('Stand a little taller', 'acting', 'Proud')], 'It was in the paper, and your mother cried.', 'A nice ceremony, and a medal in a drawer.', 'You made a joke at the wrong moment, and the mayor did not laugh.', { fx: { ok: { m: 5, name: 2, fame: 2, happy: 5 } }, after: (s, out) => { if (out === 'ok') webFact(s, 'good_deed', { kind: 'hero', name: 5 }); } }), 0.35);
addTwist('bartender', 'confidant', T('tip', 'A very big tip', '💵', 'On the way out, a regular presses a folded note into your hand. It is a lot of money, and a name, and a favor.', [W('Take the tip, and the favor', 'streetwise', 'A friend, and an obligation'), W('Take the tip, decline the favor', 'charisma', 'Polite'), W('Give it back', 'smarts', 'Clean, and awkward', 0, 0, '', { karma: 1 })], 'It turned out to be a very good friend to have, and the favor was a small one.', 'A nice night.', 'The favor turned out to be a bigger one than it sounded.', { fx: { ok: { m: 4, happy: 3 }, bad: { m: -4 } }, after: (s, out) => { if (out !== 'bad') add(s, { money: price(s, 800) }); } }), 0.3);
addTwist('journalist', 'investigation', T('award', 'A nomination', '🏅', 'The investigation has been nominated for a regional prize, and your editor has told the whole newsroom.', [W('Thank the people who talked to you', 'charisma', 'Gracious'), W('Mention the paper’s legal fight', 'writing', 'Pointed'), W('Keep it short', 'smarts', 'Safe')], 'It won, and the plaque is in the newsroom. The source who talked to you sent flowers, anonymously.', 'Runner-up, and a very nice dinner.', 'You told a joke in your speech that you should not have.', { fx: { ok: { m: 5, fame: 3, name: 3 } } }), 0.35);
addTwist('pilot', 'weather', T('captain', 'A word from the captain', '👨‍✈️', 'The captain who watched you handle that approach has asked you to dinner, and to apply for the training program.', [W('Say yes, and apply', 'smarts', 'Ambitious'), W('Say yes to dinner, and think about the rest', 'charisma', 'Careful'), W('Politely decline', 'smarts', 'Settled')], 'The program took you, and the captain wrote you the letter.', 'A nice dinner, and a lot to think about.', 'You were nervous, and said all the wrong things.', { fx: { ok: { m: 5, perf: 5, happy: 4 } } }), 0.3);
