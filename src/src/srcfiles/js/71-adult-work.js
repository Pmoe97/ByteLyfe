/* =====================================================================
 * 71-adult-work.js — the adult careers, as card decks. Behind the Mature
 * and Adult careers switches (CONTENT_TAGS in 12-flow.js, both off by
 * default): a club dancer, a companion, a subscription content creator and
 * a club manager who may end up owning the place. They are jobs like any
 * other (JOBS, the job board, the ladder) whose year is played by the
 * career-cards engine (65-work.js), and whose real drama is who knows.
 *
 * Rules that hold for everything in this file, and that dev/verify/adult.mjs checks:
 *   - 18+, always: the jobs need age 18 (21 for the club) and the decks deal nothing to a minor.
 *   - Consent-forward. You set your boundaries (Careful, Balanced, Bold) and they decide which offers
 *     reach you; every card that puts pressure on you has a "walk away" way (WALK) that always works and
 *     costs only what the card would have paid; and autopilot walks from such a card rather than
 *     playing it for you.
 *   - Fade-to-black. The cards say what the work is like, never what happened.
 *   - No coercion, no trafficking, no minors. A fake ID at the club's door is turned away, every way.
 *   - Safety is part of the job, and so are the people who look after it: security, a manager who backs you,
 *     a friend who checks in.
 *
 * Secrets: with the job comes a web secret (62-web.js, kind 'adult_work', note = the job id), unless you
 * choose to be open about it. Who knows is the drama: a family member in the crowd, a relative who finds
 * your page, a former client who wants paying. You can tell people yourself, which is always better than
 * being found out. The deck's state (65-work.js) carries the choices:
 *   M(s).work[jobId].flags = { bound: 0 | 1 | 2, vis: 'private' | 'family' | 'open' }
 *
 * Whether a companion's trade is legal is a game's simplification of the world (ADULT_LAW), not advice.
 * ===================================================================== */

const ADULT_TAGS = ['mature', 'mature_adultwork'];
const adultOn = () => tagsOn(ADULT_TAGS);
const ADULT_JOB_IDS = ['club_dancer', 'companion', 'creator', 'club_owner'];
const adultJobIds = () => (adultOn() ? ADULT_JOB_IDS : []);
JOB_CATS.night = 'Nightlife & Adult Work';

const AUDITION = (q, a, b, c) => ({ q, a: [[a, 0.15], [b, -0.05], [c, -0.12]] });
Object.assign(JOBS, {
  club_dancer: {
    name: 'Club Dancing', emoji: '💃', cat: 'night', adult: true, skill: 'fitness',
    ladder: [['Club Dancer', 28000], ['Featured Dancer', 42000], ['Headliner', 70000], ['Showcase Star', 115000]],
    req: { age: 18, looks: 35, sk: { fitness: 20 } },
    interview: [
      AUDITION('Before we start, tell me what you will and will not do on this floor.', 'I set my own limits, and I walk if they are crossed.', 'Whatever the house needs.', 'I have not thought about it.'),
      AUDITION('A patron will not back off. What do you do?', 'Signal security, and keep the stage mine.', 'Ignore it until it stops.', 'Handle it myself.'),
    ],
  },
  companion: {
    name: 'Companionship', emoji: '🥂', cat: 'night', adult: true, skill: 'charisma',
    ladder: [['Companion', 36000], ['Established Companion', 58000], ['Premier Companion', 92000], ['Mentor and Consultant', 130000]],
    req: { age: 18, looks: 40, sk: { charisma: 20 } },
    interview: [
      AUDITION('How do you screen a new client?', 'References, a public first meeting and a friend who checks in.', 'I go with my gut.', 'I do not, it slows things down.'),
      AUDITION('A client will not respect a boundary. What happens next?', 'The evening ends, and I do not apologize.', 'I try to smooth it over.', 'I let it slide this once.'),
    ],
  },
  creator: {
    name: 'Subscription Content', emoji: '📸', cat: 'night', adult: true, skill: 'charisma',
    ladder: [['Hobbyist Creator', 12000], ['Full-Time Creator', 38000], ['Top Creator', 120000], ['Studio Founder', 250000]],
    req: { age: 18 },
    interview: [
      AUDITION('What is your plan if your content gets out past the platform?', 'Watermarks, takedowns and a lawyer on call.', 'Hope it does not.', 'I have not thought that far.'),
      AUDITION('Who will see the real you behind the page?', 'Only the people I choose.', 'Whoever finds it.', 'Nobody. It is a secret.'),
    ],
  },
  club_owner: {
    name: 'Club Management', emoji: '🎶', cat: 'night', adult: true, skill: 'business',
    ladder: [['Floor Manager', 38000], ['Club Manager', 58000], ['General Manager', 90000], ['Club Owner', 170000]],
    req: { age: 21, sk: { charisma: 25, business: 15 } },
    interview: [
      AUDITION('A dancer tells you a patron crossed a line. What do you do?', 'Remove the patron and back the dancer.', 'Check the cameras, then decide.', 'Ask them not to make a fuss.'),
      AUDITION('The books are tight. Where do you save money?', 'Not on security, and not on the performers.', 'On the lights.', 'On the staff I do not like.'),
    ],
  },
});

// A stylized map of where a companion’s trade is licensed, tolerated or against the law.
const ADULT_LAW = { de: 'legal', au: 'legal', uk: 'gray', ca: 'gray', ie: 'gray', fr: 'gray', es: 'gray', it: 'gray', mx: 'gray', br: 'gray', jp: 'gray' };
function adultLaw(s) { return ADULT_LAW[P(s).country] || 'illegal'; }
const ADULT_LAW_WORDS = { legal: 'A licensed trade here', gray: 'A gray area here', illegal: 'Against the law here' };

/* ---- boundaries ------------------------------------------------------------------ */
const ADULT_BOUNDS = [
  { name: 'Careful', pay: 0.8, desc: 'Only the safest offers reach you. A quieter, steadier year, and fewer things that can go wrong.' },
  { name: 'Balanced', pay: 1, desc: 'The ordinary mix of work, with every limit still yours.' },
  { name: 'Bold', pay: 1.25, desc: 'More offers and better pay, and more that can go wrong. It is still always your choice, card by card.' },
];
const adSt = (s, id) => wkState(s, id);
const adBound = (st) => (st.flags.bound ?? 1);
// Weight a card by your boundaries: bw(careful, balanced, bold).
const bw = (a, b, c) => (s, cr, st) => [a, b, c][adBound(st)];
const adBoundsJob = (s) => { const c = M(s).career; return c && ['club_dancer', 'companion', 'creator'].includes(c.id) ? c.id : null; };
// The way out of anything that puts pressure on you.
const WALK = (label, sub) => W(label || 'Say no and walk away', 'charisma', sub || 'Always allowed', 0, 0, 'walk');

/* ---- who knows --------------------------------------------------------------------- */
const AD_LABEL = { club_dancer: 'your nights on the club floor', companion: 'your work as a companion', creator: 'your subscription page', club_owner: 'your club' };
function adultWorkLabel(s, sec) { return AD_LABEL[sec.note] || 'what you do for a living'; }
function adultSecret(s, id) { return webLive(s, (x) => x.kind === 'adult_work' && x.subj === s.playerId && x.note === id)[0] || null; }
const AD_VIS = { private: 'A secret', family: 'Your family, and your partner', open: 'Everyone' };
const AD_SEV = { club_dancer: 2, companion: 4, creator: 3 };

// Called when you are hired (hire in 15-career.js).
function adultHired(s, id, level) {
  const st = adSt(s, id);
  if (id === 'club_owner') { st.flags.vis = 'open'; return; } // running a club is no secret
  st.flags.vis = 'private';
  popup(s, {
    emoji: '🎭', title: 'Who knows?', handler: 'adultOpen', ctx: { id },
    text: `You are a ${JOBS[id].ladder[level][0]} now. Before the first night: who do you want to know? It is your call, and you can change it later.`,
    choices: [
      { label: 'Keep it private', value: 'private', sub: 'A secret that can leak. Most people will never need to know.' },
      { label: 'Tell my partner and family', value: 'family', sub: 'Some will take it well, and some will not.' },
      { label: 'Be open about it', value: 'open', sub: 'No secret to keep, and a name that comes with it.' },
    ],
  });
}
onChoice('adultOpen', (s, ctx, mode) => adultDisclose(s, ctx.id, mode, true));

function adultDisclose(s, id, mode, fresh) {
  const st = adSt(s, id), sec = adultSecret(s, id), j = JOBS[id];
  if (mode === 'private') {
    if (!sec) webNewSecret(s, 'adult_work', s.playerId, { sev: AD_SEV[id] || 2, ev: 8, note: id, rom: romanticId(s) });
    st.flags.vis = 'private';
    return { text: 'You kept it to yourself. It is a secret now, and secrets travel.', title: j.name, emoji: j.emoji, tone: '' };
  }
  if (sec) { sec.out = true; sec.outYear = s.year; }
  if (mode === 'open') {
    st.flags.vis = 'open';
    webRepAdd(P(s), { scandal: 3, name: -1 });
    add(s, { fame: id === 'creator' ? 2 : 0, happy: 3 });
    // Nothing is left to leak, but not everybody is thrilled to hear it from the grapevine.
    const lines = [];
    const rom = romanticId(s);
    if (rom) lines.push(adultReact(s, rom, 'told'));
    return { text: `You stopped hiding it. ${lines.join(' ')}`.trim() + ' There is nothing left to leak, and some doors close.', title: 'Out in the open', emoji: '🎭', tone: 'good' };
  }
  // family: your partner and the adults who are close to you
  st.flags.vis = 'family';
  const rom = romanticId(s);
  const kin = relPeople(s, ['parent', 'sibling', 'child']).filter((p) => ageOf(s, p) >= 18).slice(0, 4);
  const lines = [];
  if (rom) lines.push(adultReact(s, rom, 'told'));
  for (const p of kin) lines.push(adultReact(s, p.id, 'told'));
  if (!sec) webNewSecret(s, 'adult_work', s.playerId, { sev: AD_SEV[id] || 2, ev: 8, note: id, rom, knows: (rom ? [rom] : []).concat(kin.map((p) => p.id)) });
  else for (const p of (rom ? [{ id: rom }] : []).concat(kin)) if (!sec.knows.includes(p.id)) sec.knows.push(p.id);
  return { text: lines.length ? lines.join(' ') : 'There was nobody close enough to tell.', title: 'You told them', emoji: '🎭', tone: lines.length ? '' : 'good' };
}

// One person hears it. Told by you, they take it better than if they find out some other way.
function adultReact(s, pid, how) {
  const p = s.people[pid], r = relOf(s, pid);
  if (!p || !r) return '';
  const o = clamp(0.35 + r.rel / 160 + (how === 'told' ? 0.12 : -0.1), 0.12, 0.85);
  if (chance(o)) {
    addRel(s, pid, how === 'told' ? 4 : 1);
    return `${p.first} took it in stride${how === 'told' ? ' and said thank you for telling the truth' : ''}.`;
  }
  addRel(s, pid, how === 'told' ? -10 : -18);
  let text = `${p.first} did not take it well.`;
  if (['partner', 'fiance', 'spouse'].includes(r.kind) && r.rel < 55 && chance(0.5)) text += ' ' + partnerLeaves(s, pid);
  return text;
}
// The partner hears from somebody else (webStake in 62-web.js).
function adultPartnerFound(s, sec, rom) {
  announce(s, { emoji: '🎭', title: 'They found out', text: `${nm(s, rom)} found out what you do for a living from somebody else. ${adultReact(s, rom, 'found')}`.trim(), tone: 'bad', person: rom });
}
// It is out (webExpose in 62-web.js). Returns what to add to the announcement.
function adultExposed(s, sec) {
  const id = sec.note, st = M(s).work && M(s).work[id], rom = romanticId(s);
  if (st) st.flags.vis = 'open';
  if (id === 'creator') add(s, { fame: 3 }); // curiosity brings subscribers
  return rom && !sec.knows.includes(rom) ? ' ' + adultReact(s, rom, 'found') : '';
}
// A slip: somebody in your circle learns it.
function adultSlip(s, id, p) {
  const sec = adultSecret(s, id);
  if (!sec || !chance(p)) return;
  const pid = pickRel(s, ['friend', 'bestie', 'coworker', 'sibling', 'parent']);
  if (pid) webLearn(s, sec, pid, null);
}
const adPrivate = (id) => (s, c, st) => st.flags.vis === 'private' && !!adultSecret(s, id);

/* ---- actions ------------------------------------------------------------------------ */
defAction({
  id: 'adult_bounds', cat: 'job', label: 'Set your boundaries', emoji: '🛡️', tags: ADULT_TAGS,
  desc: 'Decide how much you are willing to take on. It decides which offers reach you, and you can change it any time.',
  when: (s) => free(s) && !!adBoundsJob(s),
  sub: (s) => ADULT_BOUNDS[adBound(adSt(s, adBoundsJob(s)))].name,
  run: (s) => {
    const id = adBoundsJob(s), cur = adBound(adSt(s, id));
    popup(s, { emoji: '🛡️', title: 'Your boundaries', text: 'Whatever you choose, every offer is still yours to refuse.', handler: 'adultBounds', ctx: { id },
      choices: ADULT_BOUNDS.map((b, i) => ({ label: b.name + (i === cur ? ' (now)' : ''), value: i, sub: b.desc })).concat([{ label: 'Never mind', value: null }]) });
  },
});
onChoice('adultBounds', (s, ctx, v) => {
  if (v === null || v === undefined) return;
  adSt(s, ctx.id).flags.bound = v;
  return { text: `You are working at ${ADULT_BOUNDS[v].name.toLowerCase()}. ${ADULT_BOUNDS[v].desc}`, title: 'Your boundaries', emoji: '🛡️', tone: 'good' };
});
defAction({
  id: 'adult_tell', cat: 'job', label: 'Come clean', emoji: '🎭', tags: ADULT_TAGS,
  desc: 'Tell people what you do, on your terms, before somebody else does.',
  when: (s) => free(s) && !!M(s).career && !!adultSecret(s, M(s).career.id),
  run: (s) => {
    const id = M(s).career.id;
    popup(s, { emoji: '🎭', title: 'Come clean', text: 'Who do you want to hear it from you?', handler: 'adultTell', ctx: { id },
      choices: [{ label: 'My partner and family', value: 'family' }, { label: 'Everyone', value: 'open' }, { label: 'Never mind', value: null }] });
  },
});
onChoice('adultTell', (s, ctx, v) => (v ? adultDisclose(s, ctx.id, v) : undefined));

/* ---- cards every adult deck shares -------------------------------------------------------- */
const adultTax = () => ({ id: 'taxes', name: 'Tax season', emoji: '🧾', min: 0, w: 0.9, base: 0.55,
  stages: [{ text: 'Most of your income is tips, bookings or platform payouts, and tax season is here.', ways: [
    W('Report all of it', 'business', 'Honest, and a good night’s sleep', 0, 0, '', { karma: 1 }),
    W('Hire an accountant', 'smarts', 'Costs money, and it is safe', 0.1, 400),
    W('Report only part of it', 'streetwise', 'A gamble, and a dishonest one', -0.12, 0, '', { dirty: true, karma: -2, money: 800 }),
  ] }],
  ok: 'The return went through clean, and you slept well for the first time in a month.', meh: 'You paid what you owed, plus some stress.', bad: 'The audit letter came. You paid back taxes, a penalty, and a lot of pride.',
  fx: { ok: { m: 2, happy: 2 }, bad: { m: -4, happy: -6 } },
  after: (s, out) => { if (out === 'bad') add(s, { money: -Math.min(Math.round(3000 * econ(s)), Math.max(0, M(s).money)) }); } });
const adultBurnout = () => ({ id: 'burnout', name: 'The wear and tear', emoji: '😩', w: 0.8, base: 0.5,
  stages: [{ text: 'The hours, the late nights and the people have been adding up, and your body is sending a bill.', ways: [
    W('Cut back to fewer nights', 'charisma', 'Less money, more life', 0.04),
    W('Push through', 'fitness', 'Stamina over sense', -0.08),
    W('See a doctor and take it seriously', 'smarts', 'Costs money', 0.05, 300),
    WALK('Take a month off', 'Money will be tight'),
  ] }],
  walk: 'You took a month. Money was tight, and you slept properly for the first time in a year.', walkFx: { happy: 5, m: -1 },
  ok: 'You listened to your body before it made you, and you are better for it.', meh: 'You got through it, tired.', bad: 'You pushed too hard and you are paying for it.',
  fx: { ok: { happy: 3 }, bad: { happy: -6, health: -6 } } });
const adultRecognized = (id) => ({ id: 'recognized', name: 'Someone who knows you', emoji: '👀', min: 0, w: 1, base: 0.5, when: adPrivate(id),
  stages: [{ text: 'Someone who knows your family has seen you at work, and they are looking right at you.', ways: [
    W('Walk over and say hello', 'charisma', 'Own it'),
    W('Keep your distance and hope', 'acting', 'It may blow over', -0.04),
    W('Ask them, politely, to keep it to themselves', 'charisma', 'A favor', 0.02),
  ] }],
  ok: 'It was awkward for a minute, and then it was fine. They have no plans to tell anyone.', meh: 'They said nothing, and you are not sure what that means.', bad: 'They went quiet, and quiet is how things get around.',
  fx: { ok: { m: 1 }, bad: { m: -2 } },
  after: (s, out) => adultSlip(s, id, out === 'ok' ? 0.04 : out === 'meh' ? 0.3 : 0.75) });

/* ---- the club dancer ---------------------------------------------------------------------- */
// The club you work at is the city's real one (70-nightlife.js), a place with a mood and regulars (81-web2.js).
// A club in a good mood pays better; one in a bad year does not.
function adClubMood(s) { const c = adultClub(s), p = c && placeGet(s, c.key); return p ? clamp(0.85 + p.mood / 330, 0.85, 1.12) : 1; }
function adultClub(s) { const v = nightVenues(s).find((x) => x.kind === 'club'); return v ? { key: nightPlaceKey(s, v), kind: 'night', name: v.name, emoji: '💃' } : null; }
defWork('club_dancer', {
  meter: { name: 'Your name on the floor', emoji: '💃', start: 50, words: WORDS('Unknown', 'A new face', 'A regular act', 'A crowd favorite', 'The headliner') },
  desk: 'Your nights', tags: ADULT_TAGS, deal: () => 3, fired: 'The club let you go after a string of no-shows, and the stage went to someone else.',
  payMul: (s, st) => ADULT_BOUNDS[adBound(st)].pay * (hereInfo(s).wage || 1) * adClubMood(s),
  place: (s) => adultClub(s),
  kv: (s, st) => [['Where you dance', (adultClub(s) || { name: 'The club' }).name], ['Your boundaries', ADULT_BOUNDS[adBound(st)].name], ['Who knows', AD_VIS[st.flags.vis] || 'Nobody']],
  cards: [
    { id: 'friday', name: 'A packed Friday', emoji: '💃', w: 1.6, base: 0.5, pay: 500,
      intro: 'The floor is full, the DJ is late and the manager is pacing.',
      stages: [
        { text: 'What do you do with your first set?', ways: [W('Open with your best routine', 'fitness', 'Technique'), W('Read the room first', 'charisma', 'Patience', 0.03), W('Try something new', 'art', 'Brilliant or messy', -0.07)], ok: 'The room came up with you.', bad: 'The routine missed the beat, and the room noticed.' },
        { text: 'The manager asks you to stay late for a second set.', ways: [W('Stay, and give them a show', 'fitness', 'Tired, and paid'), W('Take the early break', 'charisma', 'Rest first', 0.02), WALK('Go home', 'It is your night off')], ok: 'The second set was better than the first.', bad: 'You ran out of steam halfway through.' },
      ],
      ok: 'A night people will talk about. Your tip jar was heavy, and so was your sleep.', meh: 'A decent night, and a decent envelope.', bad: 'A flat night. The manager noticed, and so did you.',
      walk: 'You went home, and nobody minded.', fx: { ok: { m: 6, name: 1 }, bad: { m: -5 } } },
    { id: 'regular_fan', name: 'A regular who wants to talk', emoji: '🌹', w: 1.2, base: 0.5, pay: 250, who: 'regular',
      stages: [{ text: '[who] is here again, tipping well, and wants to know about your life outside the club.', ways: [W('Keep it friendly and professional', 'charisma', 'Boundaries held', 0.04), W('Enjoy the attention, stay careful', 'acting', 'A little warmer', -0.02), WALK('Tell the floor staff you are not talking tonight')] }],
      ok: '[who] tipped well, took the hint, and tipped again the next week.', meh: '[who] stayed a little too long, and left a good tip.', bad: '[who] took it personally and sulked at the back of the room.',
      walk: 'You told the floor staff, and [who] got a polite word. Nothing more was said.', fx: { ok: { m: 3 }, bad: { m: -3 } } },
    { id: 'private_booking', name: 'A private booking', emoji: '🕯️', min: 1, w: bw(0, 1, 1.8), when: (s, c, st) => adBound(st) >= 1, base: 0.5, pay: 900, who: 'client',
      intro: 'The house takes private bookings, with its own rules, its own security and a door that stays open.',
      stages: [{ text: '[who] wants to book you for a private evening. The club’s rules cover everything, and you set your own limits on top of them.', ways: [W('Accept on the club’s terms', 'charisma', 'Standard house rules'), W('Counter with firmer terms', 'streetwise', 'Safer and pricier', 0.03), WALK('Decline the booking')] }],
      ok: 'An ordinary, well-paid evening, with security in earshot the whole time.', meh: 'It was fine. [who] argued about the rate on the way out.', bad: '[who] pushed on the terms, and the manager cancelled the booking.',
      walk: 'You said no, the manager said "fair enough", and that was that.', fx: { ok: { m: 4, name: 1 }, bad: { m: -3 } } },
    { id: 'bad_patron', name: 'A patron breaks the rules', emoji: '🚫', w: 1, base: 0.5, risk: 0.4,
      stages: [{ text: 'A patron crowds the stage and gets loud when told to back off.', ways: [W('Signal security', 'streetwise', 'It is their job', 0.07), W('Step off the stage and hold your ground', 'fitness', 'Firm'), W('Defuse it with words', 'charisma', 'Calm', -0.02), WALK('Leave the floor and let security handle it')] }],
      ok: 'Security had them out in a minute, and the manager comped your night.', meh: 'It cost you the rest of the shift, and nothing more.', bad: 'It got heated before security arrived. You were shaken, not badly hurt.',
      walk: 'You left the floor, security dealt with it, and the manager told you to take the night.', fx: { ok: { m: 4 }, bad: { m: -4, happy: -5 } } },
    { id: 'stage_door', name: 'A regular who will not take no', emoji: '👁️', min: 1, w: bw(0.3, 0.9, 1.4), base: 0.45, who: 'regular',
      stages: [{ text: '[who] has started waiting by the stage door, and knows things about you that you never said.', ways: [W('Tell security and have [first] banned', 'streetwise', 'Official', 0.05), W('Change your routine and your exits', 'smarts', 'Cautious', 0.02), W('Go to the police', 'smarts', 'On the record'), W('Confront [first] yourself', 'charisma', 'Risky', -0.1), WALK('Take a few nights off', 'Stay home until it is dealt with')] }],
      walk: 'You stayed home while the club dealt with it. [first] was told not to come back, and you went back to work when it was safe.', ok: '[who] was banned and has not been seen since.', meh: 'It stopped for now, and you still look over your shoulder.', bad: '[who] got worse. The club doubled the door staff, and you take a different route home now.',
      fx: { ok: { m: 4 }, bad: { m: -7, happy: -7 } },
      after: (s, out, c, st) => { if (out !== 'ok') st.flags.followed = s.year; } }, // the stalking systems read this (4e)
    adultTax(),
    adultRecognized('club_dancer'),
    adultBurnout(),
    { id: 'house_fee', name: 'The house raises its cut', emoji: '💵', min: 1, w: 0.9, base: 0.5,
      stages: [{ text: 'The club has raised its cut of your tips, and the other dancers are muttering.', ways: [W('Pay it', 'business', 'Peace'), W('Negotiate with the manager', 'charisma', 'Fair'), W('Organize the other dancers', 'charisma', 'Together, and risky', -0.05, 0, '', { name: 1 }), WALK('Take a shift at the rival club', 'Leave it behind')] }],
      ok: 'You kept your share, and the others noticed who spoke up.', meh: 'You paid it, and the cut stayed where it was.', bad: 'The manager did not like being pushed. Your good slots went to someone else.',
      walk: 'You went across town. The rival club was glad to have you.', fx: { ok: { m: 4, name: 1 }, bad: { m: -5 } } },
    { id: 'showcase', name: 'The showcase', emoji: '🏆', min: 1, w: 1, base: 0.45, pay: 3000,
      stages: [
        { text: 'The regional showcase is judged by industry people. Your routine is eleven minutes long.', ways: [W('Perfect the classic', 'fitness', 'Technique'), W('Build something that is yours', 'art', 'Original', -0.05), W('Bring a partner for the act', 'charisma', 'Shared', 0.03)], ok: 'The routine landed.', bad: 'A slip in the first minute.' },
        { text: 'The judges ask for a word afterwards.', ways: [W('Thank them and listen', 'charisma', 'Open'), W('Pitch your next act', 'business', 'Bold'), W('Escape to the bar', 'fitness', 'You earned it')], ok: 'They wrote your name down.', bad: 'They were polite, and that was all.' },
      ],
      ok: 'You took second place, and a talent scout took your number.', meh: 'You placed, and the photos were good.', bad: 'You did not place, and you learned a lot.',
      fx: { ok: { m: 8, fame: 3, name: 2 }, bad: { m: -3 } } },
    { id: 'camera_phone', name: 'A video you did not agree to', emoji: '📱', w: 0.9, base: 0.5, when: (s, c, st) => adBound(st) >= 1,
      stages: [{ text: 'A patron filmed your set without asking and put it online.', ways: [W('Have the club demand it comes down', 'charisma', 'Fast'), W('File a takedown through a lawyer', 'smarts', 'Costs money', 0.08, 600), W('Let it ride', 'acting', 'Free publicity, maybe', -0.02)] }],
      ok: 'It was down within a day, and the patron was banned for good.', meh: 'It came down, eventually, and a few copies are still out there.', bad: 'It went round before anyone could stop it.',
      fx: { ok: { m: 3 }, bad: { m: -3, happy: -4 } },
      after: (s, out) => { if (out === 'bad') adultSlip(s, 'club_dancer', 0.6); else if (out === 'ok') add(s, { fame: 1 }); } },
    { id: 'promoter', name: 'A touring offer', emoji: '🎤', min: 2, w: 1, base: 0.5, pay: 6000,
      stages: [{ text: 'A promoter offers a headline slot on a tour of six cities.', ways: [W('Take it', 'charisma', 'Exciting, and tiring'), W('Negotiate the terms and the contract', 'business', 'Careful', 0.04), W('Stay home', 'fitness', 'Safe, and settled')] }],
      ok: 'The tour sold out in three cities, and you came home with a following.', meh: 'It was a good run, and a tired one.', bad: 'The promoter overpromised and underpaid, and you came home with stories.',
      fx: { ok: { m: 7, fame: 4, name: 2 }, bad: { m: -4 } } },
  ],
});

/* ---- the companion --------------------------------------------------------------------------- */
const COMPANION_LAW = {
  legal: { id: 'inspection', name: 'The licensing inspector', emoji: '📋', text: 'An inspector is reviewing your license and your paperwork this week.', ways: [W('Everything is in order', 'business', 'Prepared'), W('Hire a consultant to check it', 'smarts', 'Costs money', 0.08, 400), W('Ask a colleague for advice', 'charisma', 'Free')], ok: 'The file was clean, and the inspector thanked you for being organized.', meh: 'A few small corrections, and no trouble.', bad: 'You got a warning, and a stack of forms.' },
  gray: { id: 'sting', name: 'Careful questions', emoji: '🚔', text: 'A new inquiry is asking oddly careful questions, and it feels like a test.', ways: [W('Spot it, and decline politely', 'streetwise', 'Instinct', 0.04), W('Call your lawyer first', 'smarts', 'Costs money', 0.1, 500), W('Take the booking anyway', 'acting', 'Risky', -0.1)], ok: 'You smelled it coming and walked away clean.', meh: 'It might have been a test, or just a nervous client. You will never know.', bad: 'It was a test. You were warned, and a note went into a file.' },
  illegal: { id: 'sting', name: 'An undercover officer', emoji: '🚔', text: 'A new inquiry is asking oddly careful questions, and the law here is not on your side.', ways: [W('Spot it, and decline politely', 'streetwise', 'Instinct', 0.04), W('Call your lawyer first', 'smarts', 'Costs money', 0.1, 500), W('Take the booking anyway', 'acting', 'Risky', -0.12)], ok: 'You smelled it coming and walked away clean.', meh: 'It might have been a test, or just a nervous client. You will never know.', bad: 'It was a sting. You were cited and fined, and it is on your record.' },
};
const lawCard = () => {
  const mk = (law) => { const d = COMPANION_LAW[law]; return { id: 'law_' + law, name: d.name, emoji: d.emoji, min: 0, w: law === 'legal' ? 0.8 : 1.1, base: 0.5, when: (s) => adultLaw(s) === law, stages: [{ text: d.text, ways: d.ways }], ok: d.ok, meh: d.meh, bad: d.bad,
    fx: { ok: { m: 3 }, bad: { m: -5, happy: -4, scandal: law === 'legal' ? 0 : 4 } },
    after: (s, out) => { if (out === 'bad' && law === 'illegal') arrestMinor(s, 'solicitation'); } }; };
  return ['legal', 'gray', 'illegal'].map(mk);
};
defWork('companion', {
  meter: { name: 'Your standing', emoji: '🥂', start: 50, words: WORDS('Doubted', 'Starting out', 'Reliable', 'Sought after', 'The one people ask for') },
  desk: 'Your calendar', tags: ADULT_TAGS, deal: () => 3, fired: 'Your bookings dried up and the work moved on without you.',
  payMul: (s, st) => ADULT_BOUNDS[adBound(st)].pay * (hereInfo(s).wage || 1),
  kv: (s, st) => [['Your boundaries', ADULT_BOUNDS[adBound(st)].name], ['Who knows', AD_VIS[st.flags.vis] || 'Nobody'], ['The law here', ADULT_LAW_WORDS[adultLaw(s)]]],
  cards: [
    { id: 'inquiry', name: 'A new inquiry', emoji: '📨', w: 1.6, base: 0.5, pay: 700, who: 'client',
      intro: 'An inquiry arrives from [who], polite and well written.',
      stages: [
        { text: 'You can screen carefully or take the booking at face value.', ways: [W('Verify first, and meet in public', 'smarts', 'References and a public first meeting', 0.06), W('Have a friend check in on you', 'charisma', 'A safety net', 0.03), W('Skip the screening', 'streetwise', 'Faster money, and riskier', -0.12, 0, '', { dirty: true }), WALK('Decline the inquiry')], ok: 'The references checked out.', bad: 'Something did not add up, and you caught it late.' },
        { text: 'The evening is going well. [first] asks for more of your time than you agreed.', ways: [W('Politely hold to the agreed time', 'charisma', 'Boundaries', 0.04), W('Extend it, at a higher rate', 'business', 'On your terms'), WALK('End the evening here')], ok: 'It ended on your terms.', bad: '[first] did not like hearing no.' },
      ],
      ok: 'A pleasant evening, a fair fee, and a note in your calendar to say yes again.', meh: 'It was fine, and slightly awkward at the end.', bad: 'It was a poor fit. You left on time, and you know what to look for next time.',
      walk: 'You said no. The inquiry was withdrawn, politely.', fx: { ok: { m: 5, name: 1 }, bad: { m: -4 } } },
    { id: 'regular_client', name: 'A regular who wants more', emoji: '🥀', min: 1, w: 1.1, base: 0.5, who: 'client',
      stages: [{ text: '[who] has booked you every month for a year, and has started talking about something more.', ways: [W('Be warm, and keep it professional', 'charisma', 'Boundaries held', 0.04), W('Say it is time to end the arrangement', 'charisma', 'A clean break', 0.02), WALK('Stop answering', 'Quiet, and final')] }],
      ok: 'It stayed professional, and [first] sent two friends your way.', meh: 'It cooled, and so did the bookings.', bad: '[first] did not take it well. The messages kept coming for a month.',
      walk: 'You went quiet, and [first] eventually got the message.', fx: { ok: { m: 4 }, bad: { m: -4, happy: -4 } } },
    { id: 'safety_flag', name: 'Something feels off', emoji: '⚠️', w: 1, base: 0.5, risk: 0.4, who: 'client',
      stages: [{ text: '[who]’s story does not add up, and a friend you trust says something feels wrong.', ways: [WALK('Cancel and block the number', 'Trust your gut'), W('Meet only somewhere public, with a check-in', 'smarts', 'Careful', 0.03), W('Go anyway', 'streetwise', 'Risky', -0.1, 0, '', { dirty: true })] }],
      ok: 'It was fine, and you were right to be careful anyway.', meh: 'It was tense, and you left early.', bad: 'It turned hostile. You got out, with a bruise and a lesson.',
      walk: 'You cancelled. Your friend sent a heart and a "good call".', fx: { ok: { m: 3 }, bad: { m: -5, happy: -6 } } },
    ...lawCard(),
    { id: 'blackmail', name: 'A former client wants paying', emoji: '💬', min: 1, w: 0.9, base: 0.5, when: adPrivate('companion'),
      stages: [{ text: 'A former client says they will tell your family what you do unless you pay.', ways: [W('Call the bluff', 'streetwise', 'Risky', -0.03), W('Go to the police', 'smarts', 'Real protection, and it may get out', 0.04), W('Tell your family yourself first', 'charisma', 'Takes the leverage away', 0, 0, '', { m: 1 }), W('Pay', 'business', 'It never ends there', 0, 1500, '', { dirty: true, karma: -1 })] }],
      ok: 'They backed off, and the threat is gone.', meh: 'They went quiet, and you are not sure it is over.', bad: 'They followed through, and some people heard it from them.',
      fx: { ok: { m: 3 }, bad: { m: -5, happy: -6 } },
      after: (s, out) => adultSlip(s, 'companion', out === 'ok' ? 0 : out === 'meh' ? 0.2 : 0.8) },
    { id: 'gala', name: 'A charity gala', emoji: '🥂', min: 1, w: 1, base: 0.5, pay: 1800, who: 'client',
      stages: [{ text: '[who] needs a polished guest for a charity gala, and the room will be full of the right people.', ways: [W('Prepare thoroughly', 'smarts', 'Research', 0.04), W('Charm the room', 'charisma', 'Improvise'), W('Bring a friend as a second pair of eyes', 'charisma', 'Safer', 0.03), WALK('Decline the invitation')] }],
      walk: 'You declined, and [first] sent a gracious reply.', ok: 'The evening was a triumph, and three people asked for your card.', meh: 'A good night, a long one, and a nice fee.', bad: 'You said the wrong thing to the wrong person, and the room knew it.',
      fx: { ok: { m: 6, name: 1 }, bad: { m: -4 } } },
    { id: 'trip', name: 'Two weeks abroad', emoji: '✈️', min: 2, w: bw(0.3, 0.8, 1.4), when: (s, c, st) => adBound(st) >= 1, base: 0.5, pay: 4000, who: 'client',
      stages: [{ text: '[who] offers a well-paid two weeks abroad. You would be away from every friend you have.', ways: [W('Insist on your own room and a return ticket', 'smarts', 'Safe', 0.06), W('Take the trip on trust', 'charisma', 'Easy, and uncertain', -0.05), WALK('Turn it down')] }],
      ok: 'A beautiful two weeks, and every clause was honored.', meh: 'It was fine. The weather was better than the company.', bad: 'The trip was not what was promised. You came home early, on your own ticket.',
      walk: 'You turned it down. [first] understood.', fx: { ok: { m: 5, happy: 4 }, bad: { m: -4, happy: -5 } } },
    { id: 'agency', name: 'An agency approaches', emoji: '🏢', min: 1, w: 0.9, base: 0.5,
      stages: [{ text: 'A booking agency offers to run your calendar for a cut.', ways: [W('Sign with them', 'business', 'Steady bookings, and fees'), W('Stay independent', 'streetwise', 'Freedom, and less support'), W('Negotiate a better cut', 'charisma', 'Bold', -0.05), WALK('Say thanks, and decline')] }],
      ok: 'You got good terms, and the calendar filled up.', meh: 'It was fine on paper, and not much different in practice.', bad: 'The fees were higher than the brochure, and the calendar was thinner.',
      walk: 'You said no, and they sent a polite note back.', fx: { ok: { m: 4 }, bad: { m: -4 } } },
    adultTax(),
    adultRecognized('companion'),
    adultBurnout(),
    { id: 'way_out', name: 'The way out', emoji: '🚪', min: 2, w: 1.1, base: 0.5,
      stages: [{ text: 'You have saved enough to think about doing something else.', ways: [W('Plan a gradual exit', 'business', 'Retrain, and save', 0.05, 0, '', { karma: 1 }), W('Keep going a few more years', 'charisma', 'More money, more wear'), W('Mentor a newcomer', 'charisma', 'Pass it on', 0.02, 0, '', { karma: 2 })] }],
      ok: 'You have a plan, a savings account and a feeling like a door that is open.', meh: 'It is a plan, more or less.', bad: 'It is not going as smoothly as you hoped, and the door is still open.',
      fx: { ok: { m: 3, happy: 5, karma: 1 } } },
  ],
});

/* ---- the creator ------------------------------------------------------------------------------ */
defWork('creator', {
  meter: { name: 'Your audience', emoji: '📸', start: 40, words: WORDS('A handful', 'A small crowd', 'Growing', 'Loyal', 'Huge') },
  desk: 'Your page', tags: ADULT_TAGS, deal: () => 3, fired: 'The platform closed your page, and the audience went somewhere else.',
  payMul: (s, st) => ADULT_BOUNDS[adBound(st)].pay,
  kv: (s, st) => [['Your boundaries', ADULT_BOUNDS[adBound(st)].name], ['Who knows', AD_VIS[st.flags.vis] || 'Nobody']],
  cards: [
    { id: 'week', name: 'The week’s content', emoji: '📸', w: 1.6, base: 0.5, pay: 300,
      stages: [
        { text: 'The calendar is empty. How do you plan the week?', ways: [W('Stick to the schedule', 'business', 'Consistency'), W('Quality over quantity', 'art', 'Craft', 0.02), W('Chase a trend', 'acting', 'Fast, and may flop', -0.06)], ok: 'The plan held.', bad: 'The plan fell apart by Wednesday.' },
        { text: 'It is posted. The first hour is quiet.', ways: [W('Reply to everyone', 'charisma', 'Loyalty'), W('Run a poll for next week', 'smarts', 'Data'), W('Step away from the phone', 'fitness', 'Sanity', 0.02)], ok: 'The numbers climbed.', bad: 'The numbers did not.' },
      ],
      ok: 'A strong week. New subscribers, and a lot of kind messages.', meh: 'A steady week.', bad: 'A flat week, and you spent it refreshing the page.',
      fx: { ok: { m: 5 }, bad: { m: -4 } } },
    { id: 'platform', name: 'The platform changes the rules', emoji: '📉', w: 1, base: 0.5,
      stages: [{ text: 'The platform changes its policy, and your revenue halves overnight.', ways: [W('Diversify to a second platform', 'business', 'Smart'), W('Appeal and wait', 'charisma', 'Slow'), W('Build your own site', 'coding', 'Yours, and costly', -0.05)] }],
      ok: 'You had a second home ready, and the fans followed.', meh: 'It took a quarter, and you survived.', bad: 'The money did not come back, and you are rebuilding.',
      fx: { ok: { m: 4 }, bad: { m: -6 } } },
    { id: 'leak', name: 'Reposted without permission', emoji: '🔓', w: 1, base: 0.5,
      stages: [{ text: 'Your work is reposted on another site without your permission.', ways: [W('Send a takedown notice', 'smarts', 'Free, and slow'), W('Hire a lawyer', 'business', 'Costs money, and effective', 0.1, 700), W('Tell your fans, openly', 'charisma', 'Turn it into a story', -0.02)] }],
      ok: 'The copies came down, and your fans rallied round.', meh: 'Most of it came down, eventually.', bad: 'It spread faster than you could chase it.',
      fx: { ok: { m: 4 }, bad: { m: -4 } },
      after: (s, out) => { if (out === 'bad') adultSlip(s, 'creator', 0.4); } },
    { id: 'fan_line', name: 'A fan who will not stop', emoji: '🚧', min: 1, w: bw(0.3, 0.9, 1.3), base: 0.5, who: 'regular',
      stages: [{ text: '[who] has been messaging all day, every day, and wants to meet.', ways: [WALK('Block and move on', 'Quiet, and final'), W('Set the rules, in public', 'charisma', 'Firm, and kind', 0.03), W('Report to the platform', 'smarts', 'On the record', 0.04), W('Agree to meet', 'streetwise', 'Not a good idea', -0.15, 0, '', { dirty: true })] }],
      ok: '[first] backed off, and the community noticed how you handled it.', meh: 'The messages slowed, and did not stop.', bad: '[first] found other ways to reach you, and you changed your handles.',
      walk: 'You blocked [first]. It was quiet within the hour.', fx: { ok: { m: 4 }, bad: { m: -5, happy: -6 } },
      after: (s, out, c, st) => { if (out === 'bad') st.flags.followed = s.year; } }, // the stalking systems read this (4e)
    { id: 'family_found', name: 'A relative finds your page', emoji: '👪', min: 0, w: 1, base: 0.5, when: adPrivate('creator'),
      stages: [{ text: 'A relative has found your page.', ways: [W('Tell them the truth, calmly', 'charisma', 'Honest'), W('Deny it', 'acting', 'It may not hold', -0.08, 0, '', { dirty: true, karma: -1 }), W('Ask them to keep it between you', 'charisma', 'Hopeful', 0.0)] }],
      ok: 'They took a long breath, said "it is your life," and the conversation moved on.', meh: 'They agreed to keep it quiet. You can tell it is a strain.', bad: 'It did not go well, and you suspect more people will hear.',
      fx: { ok: { m: 2, happy: 3 }, bad: { m: -3, happy: -5 } },
      after: (s, out) => { const kin = pickRel(s, ['parent', 'sibling']); if (kin) addRel(s, kin, out === 'ok' ? 3 : out === 'meh' ? -3 : -12); adultSlip(s, 'creator', out === 'ok' ? 0 : out === 'meh' ? 0.15 : 0.7); } },
    { id: 'processor', name: 'Your payments are frozen', emoji: '🏦', min: 1, w: 0.9, base: 0.5, pay: 1500,
      stages: [{ text: 'Your payment processor freezes your account pending a review.', ways: [W('Provide the documents and wait', 'business', 'Patience'), W('Switch processors', 'coding', 'Fast, and pricier', -0.03), W('Hire a lawyer', 'business', 'Costs money', 0.06, 600)] }],
      ok: 'The hold lifted in a week, and nothing was lost.', meh: 'It took a month, and you borrowed from your savings.', bad: 'The account was closed, and you are starting a new one.',
      fx: { ok: { m: 2 }, bad: { m: -4, happy: -3 } } },
    { id: 'collab', name: 'A collaboration', emoji: '🤝', min: 1, w: 1, base: 0.5, pay: 1200,
      stages: [{ text: 'Another creator proposes a collaboration.', ways: [W('Say yes, with a written agreement', 'business', 'Safe', 0.04), W('Negotiate the split', 'charisma', 'Fair'), WALK('Decline politely')] }],
      ok: 'The collab outperformed both of your usual weeks, and you are friends now.', meh: 'It went fine, and it was nice to have company.', bad: 'The other creator did not hold up their end.',
      walk: 'You declined, and nobody minded.', fx: { ok: { m: 5, fame: 2 }, bad: { m: -3 } } },
    { id: 'impostor', name: 'An impostor', emoji: '🎭', w: 0.8, base: 0.5, pay: 400,
      stages: [{ text: 'A scammer is posing as you and charging your fans for a "private page".', ways: [W('Warn your audience, loudly', 'charisma', 'Fast'), W('Report them to the platform', 'smarts', 'Official'), W('Pay a firm to chase them', 'business', 'Costs money, and effective', 0.08, 500)] }],
      ok: 'The impostor was banned, and your fans loved you for the warning.', meh: 'It took two weeks to take down, and nobody was out much.', bad: 'Some of your fans were scammed, and a few blamed you.',
      fx: { ok: { m: 4, name: 1 }, bad: { m: -5 } } },
    { id: 'brand', name: 'A mainstream brand calls', emoji: '🏷️', min: 1, w: 0.9, base: 0.45, pay: 3500,
      stages: [{ text: 'A mainstream brand wants to work with you, quietly.', ways: [W('Say yes and keep it quiet', 'business', 'Paid, and private'), W('Insist the deal is public', 'charisma', 'Stigma tested', -0.06, 0, '', { name: 1 }), WALK('Pass')] }],
      ok: 'The campaign ran, and nobody batted an eye.', meh: 'It was fine, and a little awkward.', bad: 'There was a backlash, and the brand dropped you.',
      walk: 'You passed. The brand said they understood.', fx: { ok: { m: 4, name: 2, fame: 2 }, bad: { m: -5, scandal: 4 } } },
    { id: 'moderators', name: 'The comments turn toxic', emoji: '🗯️', min: 1, w: 0.8, base: 0.5,
      stages: [{ text: 'Your community is turning toxic, and the loudest voices are winning.', ways: [W('Hire moderators', 'business', 'Costs money', 0.06, 300), W('Set rules and enforce them', 'charisma', 'Firm'), W('Ignore it', 'fitness', 'Hope it passes', -0.1)] }],
      ok: 'The community cleaned itself up, and the good people stayed.', meh: 'It is calmer, mostly.', bad: 'The good people left, and the loud ones stayed.',
      fx: { ok: { m: 4 }, bad: { m: -5 } } },
    adultTax(),
    adultBurnout(),
  ],
});

/* ---- the club manager and owner -------------------------------------------------------------------- */
defWork('club_owner', {
  meter: { name: 'Staff trust', emoji: '🎶', start: 50, words: WORDS('Distrusted', 'Watched', 'Respected', 'Trusted', 'Their champion') },
  desk: 'Your club', tags: ADULT_TAGS, deal: () => 3, fired: 'The owners let you go, and the staff did not look sorry.',
  place: (s) => adultClub(s),
  kv: (s) => [['Your club', (adultClub(s) || { name: 'The club' }).name]],
  cards: [
    { id: 'big_night', name: 'A sold-out Saturday', emoji: '🎶', w: 1.6, base: 0.5, pay: 1500,
      stages: [
        { text: 'The doors open in an hour. Staff, stock and security are all stretched thin.', ways: [W('Call in extra staff', 'business', 'Costs money', 0.05, 400), W('Run lean and watch the floor', 'charisma', 'Hands-on'), W('Open anyway and hope', 'streetwise', 'Risky', -0.08)], ok: 'The team came through.', bad: 'The first hour was chaos.' },
        { text: 'At midnight the bar runs dry on the best seller.', ways: [W('Send a runner to the supplier', 'smarts', 'Quick'), W('Move people to what you have', 'charisma', 'Charm'), W('Raise the prices on what is left', 'business', 'Cynical, and works', -0.02, 0, '', { dirty: true, money: 500, karma: -1 })], ok: 'Nobody noticed.', bad: 'People noticed.' },
      ],
      ok: 'A night that paid the month’s bills, and the staff went home proud.', meh: 'It paid, and everyone was glad it was over.', bad: 'It was a mess, and the Sunday review was long.',
      fx: { ok: { m: 5, name: 1 }, bad: { m: -5 } } },
    { id: 'complaint', name: 'A dancer comes to you', emoji: '🛡️', w: 1.3, base: 0.55,
      stages: [{ text: 'A dancer tells you a patron crossed a line. The patron is a big spender.', ways: [W('Ban the patron, and back the dancer', 'charisma', 'Staff first', 0.1, 0, '', { karma: 2, m: 3 }), W('Check the cameras, then decide', 'smarts', 'Thorough', 0.02), W('Ask the dancer not to make a fuss', 'charisma', 'Easy, and a mistake', -0.2, 0, '', { dirty: true, karma: -4, m: -8 })] }],
      ok: 'The patron was out for good, and the whole floor saw whose side you were on.', meh: 'It took a day to sort out, and the dancer was satisfied.', bad: 'The dancer left, and others noticed how it was handled.',
      fx: { ok: { m: 6, name: 1 }, bad: { m: -8, scandal: 3 } } },
    { id: 'licence', name: 'The licensing inspection', emoji: '📋', w: 1, base: 0.5,
      stages: [{ text: 'The licensing board is inspecting the club this week.', ways: [W('Everything is by the book', 'business', 'Prepared'), W('Fix the issues overnight', 'smarts', 'Last minute'), W('Call your lawyer', 'business', 'Costs money', 0.1, 600)] }],
      ok: 'A clean report, and a letter of commendation.', meh: 'A few fixes, and no fine.', bad: 'A fine, and a hearing in thirty days.',
      fx: { ok: { m: 4 }, bad: { m: -5 } } },
    { id: 'id_night', name: 'A fake-ID night', emoji: '🎫', w: 1, base: 0.55,
      stages: [{ text: 'A group at the door is holding IDs that do not look right.', ways: [W('Check every ID, and turn away anyone who fails', 'smarts', 'By the book', 0.1), W('Call the police about the fakes', 'charisma', 'Firm'), WALK('Close the door on all of them', 'Nobody underage gets in')] }],
      ok: 'The door staff caught every one, and the group left without a scene.', meh: 'A few arguments, and nobody got in.', bad: 'The group made a scene on the sidewalk, and a neighbor filmed it.',
      walk: 'You closed the door on the whole group. No ID, no entry, and no argument.', fx: { ok: { m: 5, name: 1 }, bad: { m: -3 } } },
    { id: 'share', name: 'The performers’ share', emoji: '💵', min: 1, w: 1, base: 0.5,
      stages: [{ text: 'A promoter suggests cutting the performers’ share to improve your margin.', ways: [W('Refuse, and keep the fair split', 'charisma', 'Right, and it costs', 0.05, 0, '', { karma: 2, m: 3, money: -600 }), W('Meet halfway with a bonus scheme', 'business', 'A compromise'), W('Cut the share', 'business', 'More profit, and resentment', -0.05, 0, '', { dirty: true, karma: -3, m: -6, money: 1800 })] }],
      ok: 'The performers heard, and the loyalty showed up in the room.', meh: 'It was not perfect, and nobody walked.', bad: 'The staff grumbled, and the best two left.',
      fx: { ok: { m: 4 }, bad: { m: -5 } } },
    { id: 'rival', name: 'A rival poaches your headliner', emoji: '🥊', min: 1, w: 0.9, base: 0.5,
      stages: [{ text: 'A rival club has offered your headliner more money to move.', ways: [W('Match the offer', 'business', 'Costs money', 0.06, 1500), W('Wish them well, and let them go', 'charisma', 'Gracious', 0, 0, '', { karma: 1 }), W('Badmouth the rival', 'streetwise', 'Petty', -0.1, 0, '', { dirty: true, karma: -2 })] }],
      ok: 'Your headliner stayed, and the rival lost its nerve.', meh: 'They left, and you stayed on good terms.', bad: 'They left, and took two regulars with them.',
      fx: { ok: { m: 4 }, bad: { m: -4 } } },
    { id: 'capacity', name: 'Over capacity', emoji: '🔥', min: 1, w: 0.8, base: 0.5, risk: 0.8,
      stages: [{ text: 'It is full past the fire marshal’s number, and the owner wants the door kept open.', ways: [W('Close the door, and let the line wait', 'charisma', 'By the book', 0.08, 0, '', { karma: 1, money: -400 }), W('Stagger entry with a clicker', 'smarts', 'Smart'), W('Ignore the number', 'streetwise', 'Easy money, and dangerous', -0.1, 0, '', { dirty: true, karma: -3, money: 1500 })] }],
      ok: 'Nothing happened, which is exactly how a good night should end.', meh: 'A tense night, and an unscheduled visit from a marshal.', bad: 'It was too close. The marshal fined the club, and everyone remembered.',
      fx: { ok: { m: 3 }, bad: { m: -7, scandal: 4 } } },
    { id: 'neighbors', name: 'The neighbors complain', emoji: '🏘️', min: 1, w: 0.8, base: 0.5,
      stages: [{ text: 'The neighbors are petitioning the council about the noise.', ways: [W('Soundproof the building', 'business', 'Costs money', 0.06, 2500), W('Meet them, and compromise on hours', 'charisma', 'Diplomatic'), W('Ignore the petition', 'streetwise', 'Hope it passes', -0.1)] }],
      ok: 'They came to a street party, and left friends.', meh: 'A compromise nobody loved.', bad: 'The council cut your closing hour. The loss is real.',
      fx: { ok: { m: 3, name: 1 }, bad: { m: -4 } } },
    { id: 'security', name: 'The security question', emoji: '🕴️', min: 1, w: 0.9, base: 0.5,
      stages: [{ text: 'A near-miss last week has everyone asking about security.', ways: [W('Hire a trained team, and train the staff', 'business', 'Costs money', 0.08, 2000), W('Add cameras and a panic button', 'smarts', 'Cheaper', 0.04, 500), W('Hold off', 'fitness', 'Risky', -0.1)] }],
      ok: 'The staff felt it at once. Nobody forgot who paid for it.', meh: 'It helped, a little.', bad: 'Nothing changed, and the staff noticed that too.',
      fx: { ok: { m: 6 }, bad: { m: -5 } } },
    { id: 'expand', name: 'A second room', emoji: '🏗️', min: 2, w: 0.9, base: 0.45, pay: 8000,
      stages: [{ text: 'The building next door is for sale. A second room would double the capacity, and the debt.', ways: [W('Buy it', 'business', 'Costs money', 0, 15000), W('Rent it for events first', 'business', 'Careful', 0.05, 3000), W('Pass', 'charisma', 'Safe')] }],
      ok: 'The second room paid for itself in a year.', meh: 'It is working, slowly.', bad: 'It ate your margin, and your weekends.',
      fx: { ok: { m: 5, name: 1 }, bad: { m: -4 } } },
  ],
});

wkRegister(); // 66-work-decks.js registered the first eight; these four join them
