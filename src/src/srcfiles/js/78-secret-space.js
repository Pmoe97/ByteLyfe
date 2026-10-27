/* =====================================================================
 * 78-secret-space.js — abduction and captivity, the darkest thing in the
 * game, built to be a story about consequences. Behind the Mature and
 * Violence switches (VIO_TAGS, 72-violence.js), off by default, adults only.
 *
 * Rules, as everywhere in Mature mode (and checked by dev/verify/kidnap.mjs):
 *   - Everyone is 18+: the player, every profile on offer, every captive. Never a child.
 *   - Nothing sexual, anywhere, in any form. The Dungeon is just the strongest room.
 *   - Abstract. Captivity is a set of care meters and odds; there are never scenes of anyone being mistreated,
 *     and nothing says how to do anything. What the game shows is what it costs: a person's life, a case file
 *     that closes in, a conscience that does not fit in the room.
 *   - There is always a way out: let them go, turn yourself in, or never begin (every step has "Not tonight").
 *
 * What you need: a secret space in the home you live in. They are renovation projects (17-assets.js,
 * RENOVATION_PROJECTS): an Attic Hideaway, a Garage Bay, a Garden Shed, a Finished Basement, a Hidden Room
 * or the Dungeon, each with its own integrity (how well it holds), comfort (how well the person in it fares),
 * concealment, quiet, cost, effect on the home's value and chance a contractor reports you.
 *
 * M(s).kn = { cap, heat, taken, freed, lost }
 *   heat   0-100, how much attention the house has drawn (a contractor's tip, a neighbor who heard something)
 *   cap    null | { pid, key, since, supplies, health, spirit, integ, wits, was, seen, yr: { fed, med, comf, rein } }
 *            supplies  food and water: it falls every year, and a person with none for long does not last
 *            health    0 is death; spirit: despair is a kind of dying too
 *            integ     how well the space holds right now; it wears, and escapes come out of what is left
 *   one captive at a time. The person is kept as a relationship of kind 'captive' (so nobody forgets them, and
 *   nothing treats them as a friend); `was` is what they were to you.
 *
 * A captive ends one of four ways: you let them go (kn_release), they get out (capEscape), they die
 * (capDie, which goes through the web's 'killed' fact and 72-violence.js's "what now"), or you are caught.
 * The case file (63-cases.js) opens when they are taken, the paper (79-news.js) reports it, and
 * the people who miss them keep looking.
 * ===================================================================== */

const SPACES = {
  ss_attic: { name: 'Attic Hideaway', emoji: '🏚️', base: 12000, valBoost: 0.03, integ: 35, comfort: 25, conceal: 60, quiet: 45, risk: 0.04, desc: 'Under the eaves. Easy to hide, brutal in summer, and the floorboards carry every sound.' },
  ss_garage: { name: 'Garage Bay', emoji: '🚗', base: 9000, valBoost: 0.04, integ: 40, comfort: 30, conceal: 25, quiet: 35, risk: 0.03, desc: 'Big, plain, and visible from the street. Everybody has seen the door.' },
  ss_shed: { name: 'Garden Shed', emoji: '🏠', base: 5000, valBoost: 0.01, integ: 20, comfort: 10, conceal: 30, quiet: 25, risk: 0.02, desc: 'Cheap, damp and the first place anyone would look.' },
  ss_basement: { name: 'Finished Basement', emoji: '🧱', base: 30000, valBoost: 0.08, integ: 65, comfort: 45, conceal: 55, quiet: 70, risk: 0.06, desc: 'Solid walls, one door, and the most livable of the ordinary rooms. It adds real value to the house.' },
  ss_secret_room: { name: 'Hidden Room', emoji: '🚪', base: 38000, valBoost: 0.03, integ: 55, comfort: 50, conceal: 85, quiet: 60, risk: 0.12, desc: 'Behind a wall, behind a bookcase. Nobody finds what they do not know to look for. Contractors remember odd requests.' },
  ss_dungeon: { name: 'The Dungeon', emoji: '⛓️', base: 95000, valBoost: -0.1, integ: 95, comfort: 55, conceal: 70, quiet: 92, risk: 0.55, desc: 'Reinforced concrete, steel doors, no windows. The strongest of them all, and it knocks a tenth off what the house is worth. Nobody builds one by accident, and every contractor who sees the plans remembers them.' },
};
const SPACE_IDS = Object.keys(SPACES);
for (const id of SPACE_IDS) {
  const sp = SPACES[id];
  RENOVATION_PROJECTS[id] = { id, name: sp.name, emoji: sp.emoji, shared: false, base: sp.base, valBoost: sp.valBoost, rentBoost: 0, desc: sp.desc, tags: VIO_TAGS, secret: true };
  RENOVATION_IDS.push(id);
}
Object.assign(KIN_LABELS, { captive: ['Captive', 'Captive', 'Captive'] });
Object.assign(REL_DECAY, { captive: 0 });
CRIMES.attempted_kidnapping = { name: 'Attempted kidnapping', minAge: 18, sentence: [2, 9], conviction: 0.8, karma: -15, felony: true, verb: 'attempted kidnapping' }; // not a Crime-menu crime
INV_PROFILE.kidnapping = [18, 32, 22, 'abduction'];
INV_PROFILE.attempted_kidnapping = [10, 60, 12, 'abduction'];

function knOf(s) { const m = M(s); return m.kn || (m.kn = { cap: null, heat: 0, taken: 0, freed: 0, lost: 0 }); }
const knCap = (s) => knOf(s).cap;
const QUALITY_INTEG = { flawless: 1.1, great: 1, botched: 0.75 };
// Every secret space in the home you live in.
function ssSpaces(s) {
  const out = [];
  for (const a of M(s).assets || []) {
    if (a.kind !== 'house' || !livesIn(s, a)) continue;
    for (const r of a.renovations || []) if (SPACES[r.id] && (r.unit === 0 || r.unit === null)) out.push({ key: a.id + ':' + r.id, a, r, id: r.id, sp: SPACES[r.id], integ: Math.round(SPACES[r.id].integ * (QUALITY_INTEG[r.quality] || 1)) });
  }
  return out;
}
const ssVacant = (s) => (knCap(s) ? [] : ssSpaces(s));
const knAble = (s) => knOn() && free(s) && A(s) >= 18 && !inPrison(s);
const knOn = () => vioOn();
const spaceOf = (s, cap) => ssSpaces(s).find((x) => x.key === cap.key) || null;

/* ---- building one ---------------------------------------------------------------------------------- */
// Called by completeRenovation (17-assets.js) when the project is one of these.
function ssBuilt(s, a, p, scope, quality, tier) {
  if (!a.renovations) a.renovations = [];
  a.renovations.push({ id: p.id, unit: scope, quality, year: s.year });
  const sp = SPACES[p.id], valAdd = Math.round(a.value * sp.valBoost * (quality === 'botched' ? 0.5 : 1));
  a.value = Math.max(1000, a.value + valAdd);
  a.cond = clamp(a.cond + (quality === 'botched' ? -6 : 10), 10, 100);
  const bits = [`The ${sp.name.toLowerCase()} is finished at ${a.name}.`];
  if (quality === 'botched') bits.push('The crew cut corners, and it will not hold as well as it should.');
  else if (quality === 'flawless') bits.push('The work is excellent.');
  bits.push(valAdd >= 0 ? `It added ${fmtMoney(valAdd)} to the value.` : `It took ${fmtMoney(-valAdd)} off the value.`);
  // A contractor who sees plans like these may say something.
  const tip = clamp(sp.risk * ({ budget: 0.7, reputable: 1.3, luxury: 0.9 }[tier] || 1), 0, 0.9);
  if (chance(tip)) {
    const cost = price(s, 6000);
    popup(s, {
      emoji: '📞', title: 'The contractor talked', handler: 'ssTip', ctx: { cost, id: p.id },
      text: `Somebody on the crew did not like what they were building, and called a tip line. A detective has left a card in your door, with a handwritten note: "A word about the ${sp.name.toLowerCase()}."`,
      choices: [
        { label: 'Call it a wine cellar, and smile', value: 'smile', sub: `${Math.round(clamp(0.45 + skill(s, 'charisma') / 250, 0.15, 0.85) * 100)}%` },
        { label: 'Get a lawyer', value: 'lawyer', sub: fmtMoney(cost), disabled: M(s).money < cost },
        { label: 'Offer the crew something to forget it', value: 'pay', tone: 'bad', sub: fmtMoney(cost) },
        { label: 'Ignore it', value: 'ignore' },
      ],
    });
  }
  newsPost(s, 'reno', { street: P(s).city });
  return { text: bits.join(' '), emoji: sp.emoji, tone: valAdd >= 0 ? 'good' : '', title: sp.name + ' built' };
}
onChoice('ssTip', (s, ctx, v) => {
  const k = knOf(s);
  if (v === 'smile') {
    if (chance(clamp(0.45 + skill(s, 'charisma') / 250, 0.15, 0.85))) { k.heat = clamp100(k.heat + 4); return { text: 'The detective looked around, asked about humidity, and wrote "wine cellar" in a notebook. You will be on a list, but a short one.', tone: '' }; }
    k.heat = clamp100(k.heat + 18);
    return { text: 'The detective asked a lot of questions you did not have good answers to. They did not push. They did not need to.', tone: 'bad' };
  }
  if (v === 'lawyer') { if (!pay(s, ctx.cost)) return cantAfford(ctx.cost); k.heat = clamp100(k.heat + 6); return 'Your lawyer spoke for twenty minutes about permits and privacy and made the whole thing sound dull. It worked.'; }
  if (v === 'pay') { if (!pay(s, ctx.cost)) return cantAfford(ctx.cost); k.heat = clamp100(k.heat + 10); webNewSecret(s, 'crime', s.playerId, { crime: 'bribery', sev: 2, ev: 20 }); return { text: 'The crew took the envelope, and agreed that they did not remember anything. You will always wonder.', tone: 'bad' }; }
  k.heat = clamp100(k.heat + 20);
  return { text: 'You ignored it. They did not.', tone: 'bad' };
});

/* ---- the kidnap ---------------------------------------------------------------------------------------- */
// A handful of people to choose from. They are people: they have lives, and ties, and somebody who will look.
function knProfiles(s, n) {
  const out = [];
  for (let i = 0; i < (n || 3); i++) {
    const p = makeAdultNear(s, { minAge: 18, maxAge: 70 });
    const ties = webTies(s, p).size;
    out.push(p);
    p._ties = ties;
  }
  return out;
}
function knDescribe(s, p) {
  const ties = webTies(s, p).size, job = p.job && p.job.id && JOBS[p.job.id] ? JOBS[p.job.id].ladder[Math.min(p.job.level || 0, JOBS[p.job.id].ladder.length - 1)][0] : pick(['between jobs', 'retired', 'a night owl']);
  const loner = ties <= 1 ? 'keeps to themselves' : ties >= 4 ? 'knows half the town' : 'has a few people';
  const wits = p.stats.smarts >= 65 ? 'sharp' : p.stats.smarts <= 35 ? 'easily fooled' : 'ordinary';
  return `${ageOf(s, p)} · ${job} · ${loner} · ${wits}`;
}
defAction({
  id: 'kn_kidnap', cat: 'crime', label: 'Take someone', emoji: '🌑', tags: VIO_TAGS,
  desc: 'You have the space. You have a list of people nobody is watching. You do not have to.',
  when: (s) => knAble(s) && ssVacant(s).length > 0,
  sub: (s) => nOf(ssVacant(s).length, 'space') + ' ready',
  run: (s) => {
    const people = knProfiles(s, 3);
    popup(s, {
      emoji: '🌑', title: 'Who', handler: 'knPick', ctx: {},
      text: 'Three people, none of them yours. Every one of them is somebody’s whole world. You could stop here, and nothing would have happened.',
      choices: people.map((p) => ({ label: fullName(p), sub: knDescribe(s, p), value: p.id })).concat([{ label: 'Not tonight', value: null, sub: 'Go home' }]),
    });
  },
});
defAction({
  id: 'kn_kidnap_person', cat: 'person', target: 'person', label: 'Take them', emoji: '🌑', tags: VIO_TAGS,
  desc: 'Somebody you know, who knows you.',
  when: (s, pid) => knAble(s) && ssVacant(s).length > 0 && !!s.people[pid] && s.people[pid].alive && relOf(s, pid) && relKind(s, pid) !== 'captive' && ageOf(s, s.people[pid]) >= 18 && reachable(s, pid),
  run: (s, pid) => knStart(s, pid),
});
onChoice('knPick', (s, ctx, pid) => { if (pid) knStart(s, pid); });
function knStart(s, pid) {
  const p = s.people[pid], spaces = ssVacant(s);
  if (!p || !p.alive || ageOf(s, p) < 18 || !spaces.length || !knAble(s)) return;
  const known = !!relOf(s, pid);
  const go = (where) => knApproach(s, pid, where);
  if (spaces.length === 1) return go(spaces[0].key);
  popup(s, {
    emoji: '🏠', title: 'Where', handler: 'knWhere', ctx: { pid },
    text: `You have more than one space. Where would ${p.first} be?`,
    choices: spaces.map((x) => ({ label: `${x.sp.emoji} ${x.sp.name}`, value: x.key, sub: `Holds ${x.integ} · comfort ${x.sp.comfort} · hidden ${x.sp.conceal}` })).concat([{ label: 'Not tonight', value: null }]),
  });
  void known;
}
onChoice('knWhere', (s, ctx, key) => { if (key) knApproach(s, ctx.pid, key); });
function knApproach(s, pid, key) {
  const p = s.people[pid];
  popup(s, {
    emoji: '🌑', title: p.first, handler: 'knHow', ctx: { pid, key }, person: relOf(s, pid) ? pid : null,
    text: `${p.first} has no idea. This is the last point at which that is true, and the last at which you can walk away.`,
    choices: [
      { label: 'Watch for a while first', value: 'plan', sub: 'Patience, and exposure' },
      { label: 'Lure them', value: 'lure', sub: `${Math.round(knOdds(s, p, 'lure', key, 0) * 100)}%` },
      { label: 'Ambush them', value: 'ambush', tone: 'bad', sub: `${Math.round(knOdds(s, p, 'ambush', key, 0) * 100)}%` },
      { label: 'Not tonight', value: null, sub: 'Walk away' },
    ],
  });
}
function knOdds(s, p, how, key, plan) {
  const x = ssSpaces(s).find((q) => q.key === key);
  const me = (how === 'lure' ? skill(s, 'charisma') / 220 + skill(s, 'acting') / 400 : skill(s, 'fitness') / 220 + skill(s, 'martial') / 300) + skill(s, 'streetwise') / 400 + (trait(s, 'cunning') ? 0.07 : 0);
  const them = (p.stats.smarts - 50) / 260 + (p.stats.health - 50) / 320 + (relOf(s, p.id) && how === 'lure' ? -0.15 : 0); // someone who knows you walks right in
  return clamp(0.38 + me - them + plan + (x ? x.sp.conceal / 600 : 0) - (knOf(s).heat / 500), 0.1, 0.85);
}
onChoice('knHow', (s, ctx, v) => {
  const p = s.people[ctx.pid];
  if (!v || !p || !p.alive || !knAble(s) || knCap(s)) return;
  if (v === 'plan') {
    knOf(s).heat = clamp100(knOf(s).heat + 3);
    const o = (h) => `${Math.round(knOdds(s, p, h, ctx.key, 0.1) * 100)}%`;
    popup(s, {
      emoji: '🌑', title: p.first, handler: 'knHow2', ctx: { pid: ctx.pid, key: ctx.key },
      text: `You learned ${p.first}’s routes, and ${pr(p).his} habits, and the one hour of the week nobody is looking. It does not feel like a plan. It feels like a decision you are being walked toward.`,
      choices: [{ label: 'Lure them', value: 'lure', sub: o('lure') }, { label: 'Ambush them', value: 'ambush', tone: 'bad', sub: o('ambush') }, { label: 'Not tonight', value: null }],
    });
    return { text: 'You watched.', nolog: true, quiet: true };
  }
  return knResolve(s, ctx.pid, ctx.key, v, 0);
});
onChoice('knHow2', (s, ctx, v) => { if (v) return knResolve(s, ctx.pid, ctx.key, v, 0.1); });
function knResolve(s, pid, key, how, plan) {
  const p = s.people[pid];
  const odds = knOdds(s, p, how, key, plan);
  tally(s, 'kidnapAttempts');
  if (chance(odds)) return capTake(s, p, key);
  // It falls apart.
  vioHaunt(s, 6);
  const c = invOpen(s, 'attempted_kidnapping', { who: s.playerId, victim: pid, vname: fullName(p), ev: { wit: 20 } });
  newsPost(s, 'attempt', { name: p.first, full: fullName(p) });
  if (chance(0.3)) { const r = arrest(s, 'attempted_kidnapping'); return { text: `It went wrong before it began, and somebody saw enough. ${r.text}`, tone: 'bad' }; }
  void c;
  return { text: how === 'lure' ? `${p.first} saw it for what it was, and was gone before you could think of another way. A description is on its way to the police.` : `${p.first} got away. There were people on the street. A description is on its way to the police.`, tone: 'bad' };
}
// They are in. What happens now is a long way from the moment you decided.
function capTake(s, p, key) {
  const x = ssSpaces(s).find((q) => q.key === key), k = knOf(s);
  if (!x) return;
  const was = relKind(s, p.id), wasRel = relOf(s, p.id) ? relOf(s, p.id).rel : 0;
  if (was && K_ROMANCE.includes(was)) endRomance(s, p.id, was === 'spouse' ? 'exspouse' : 'ex');
  setRel(s, p.id, 'captive', 0);
  k.cap = { pid: p.id, key, since: s.year, supplies: 100, health: clamp(p.stats.health, 40, 100), spirit: 70, integ: x.integ, wits: p.stats.smarts, was: was || null, wasRel, yr: { fed: 0, med: 0, comf: 0, rein: 0 } };
  k.taken++;
  tally(s, 'kidnaps');
  vioHaunt(s, 25);
  add(s, { karma: -35, happy: -6 });
  webFact(s, 'kidnapped', { pid: p.id });
  const c = invOpen(s, 'kidnapping', { victim: p.id, vname: fullName(p), ev: { trace: -(x.sp.conceal / 5), wit: Math.min(30, webTies(s, p).size * 6) } });
  c.cover = (c.cover || 0) + Math.round(x.sp.conceal / 4);
  const sec = webNewSecret(s, 'crime', s.playerId, { crime: 'kidnapping', sev: 4, ev: 18, other: p.id });
  sec.case = c.id; c.sec = sec.id;
  newsPost(s, 'missing', { name: p.first, full: fullName(p), age: ageOf(s, p), city: P(s).city, ties: webTies(s, p).size });
  return { text: `${p.first} is in the ${x.sp.name.toLowerCase()}. It is done, and it is not over. A person needs food, water and care, every year, for as long as they are there, and they need a way out that you are able to give. The Crime menu has what they need.`, tone: 'bad', emoji: '🌑', title: 'It is done' };
}

/* ---- care ------------------------------------------------------------------------------------------------- */
const capHeld = (s) => knOn() && !!knCap(s) && free(s) && !inPrison(s);
const CARE = {
  feed: { label: 'Bring them supplies', emoji: '🥫', max: 2, cost: 150, desc: 'Food and water. Without it, nothing else matters.', run: (s, c) => { c.supplies = 100; return 'You brought what they needed, and left. They were still alive, which is the only measure you have.'; } },
  med: { label: 'See to their health', emoji: '🩹', max: 1, cost: 250, desc: 'Medicine and a clean cloth. You are not a doctor.', run: (s, c) => { c.health = clamp100(c.health + randInt(20, 40)); if (chance(0.12)) knOf(s).heat = clamp100(knOf(s).heat + 6); return 'You did what you could for them, and it helped. Somebody at the pharmacy looked at your basket a little too long.'; } },
  comf: { label: 'Make them more comfortable', emoji: '🛏️', max: 1, cost: 400, desc: 'A blanket, a light, a book. It matters more than you would think.', run: (s, c) => { c.spirit = clamp100(c.spirit + 22); c.supplies = clamp100(c.supplies + 10); return 'A few small things, and the room is a little less like a room. It does not change what it is.'; } },
  rein: { label: 'Reinforce the space', emoji: '🔧', max: 1, cost: 1500, desc: 'New locks and braces. It holds better, and it is a more serious thing every time.', run: (s, c, x) => { c.integ = clamp(c.integ + 25, 0, x ? x.integ : 100); knOf(s).heat = clamp100(knOf(s).heat + 3); return 'You spent a weekend on it, and the space is as sound as it was the day it was built.'; } },
};
for (const id of Object.keys(CARE)) {
  const C = CARE[id];
  defAction({
    id: 'cap_' + id, cat: 'crime', label: C.label, emoji: C.emoji, tags: VIO_TAGS, desc: C.desc,
    when: (s) => capHeld(s) && knCap(s).yr[id === 'feed' ? 'fed' : id === 'med' ? 'med' : id === 'comf' ? 'comf' : 'rein'] < C.max,
    sub: (s) => `${fmtMoney(price(s, C.cost))}${id === 'feed' ? ` · supplies ${Math.round(knCap(s).supplies)}%` : ''}`,
    run: (s) => {
      const c = knCap(s), cost = price(s, C.cost), key = id === 'feed' ? 'fed' : id === 'med' ? 'med' : id === 'comf' ? 'comf' : 'rein';
      if (!pay(s, cost)) return cantAfford(cost);
      c.yr[key]++;
      const x = spaceOf(s, c);
      const text = C.run(s, c, x);
      capVisit(s);
      return text;
    },
  });
}
// Every visit is a small risk of being noticed.
function capVisit(s) {
  const c = knCap(s), x = c && spaceOf(s, c);
  if (!x) return;
  knOf(s).heat = clamp100(knOf(s).heat + (100 - x.sp.conceal) / 40);
}
defAction({
  id: 'kn_release', cat: 'crime', label: 'Let them go', emoji: '🕊️', tags: VIO_TAGS, desc: 'It is not too late. It will never be easy, and it will always be better.',
  when: (s) => capHeld(s),
  run: (s) => {
    const c = knCap(s), p = s.people[c.pid];
    popup(s, {
      emoji: '🕊️', title: 'Let them go', handler: 'capRelease', ctx: {},
      text: `${p ? p.first : 'They'} will walk out, and tell everyone everything. Nothing you can do will change that now. It is still the best thing you can do.`,
      choices: [{ label: 'Let them go, and run', value: 'run', sub: 'You will have a head start' }, { label: 'Take them to the police yourself', value: 'surrender', sub: 'The best of the bad options' }, { label: 'Not yet', value: null }],
    });
  },
});
onChoice('capRelease', (s, ctx, v) => {
  const c = knCap(s);
  if (!v || !c) return;
  const p = s.people[c.pid];
  const cs = invMine(s, (x) => x.crime === 'kidnapping' && x.victim === c.pid)[0];
  capFree(s, 'released');
  if (v === 'surrender') {
    vioOf(s).help++; vioHaunt(s, -20);
    const r = arrest(s, 'kidnapping');
    return { text: `${p ? p.first : 'They'} walked out into the daylight beside you. You gave a full statement. ${r.text}`, tone: 'bad' };
  }
  if (cs) { invEvidence(s, cs, { wit: 40 }); cs.prog = clamp(cs.prog + 25, 0, 100); }
  vioHaunt(s, -12);
  return { text: `${p ? p.first : 'They'} stumbled out and did not look back. You were gone within the hour. It was the right thing, and it is a very long way from enough. The police have a statement now.`, tone: 'bad' };
});
// They are out, by your hand or theirs: the person goes back to the world, and the case gets what they know.
function capFree(s, how) {
  const k = knOf(s), c = k.cap;
  if (!c) return;
  const p = s.people[c.pid];
  k.cap = null; k.freed++;
  if (p && p.alive) {
    setRel(s, p.id, 'enemy', 0); // whoever they were to you, they are not now
    p.stats.happy = clamp100(p.stats.happy - 30); p.stats.health = clamp100(Math.min(p.stats.health, c.health));
  }
  newsPost(s, 'found', { name: p ? p.first : 'The missing person', full: p ? fullName(p) : '', how });
}

/* ---- the year --------------------------------------------------------------------------------------------- */
function capYear(s) {
  if (!knOn() || s.dead || A(s) < 18) return;
  const k = knOf(s);
  k.heat = Math.max(0, Math.round(k.heat * 0.9 - 0.5)); // attention fades
  const c = k.cap;
  if (!c) return;
  const p = s.people[c.pid], x = spaceOf(s, c);
  // The person is gone from the world, or the room is.
  if (!p || !p.alive) { capDie(s, c, 'natural'); return; }
  if (!x) { capFound(s, 'The house is no longer yours, and somebody found what was in it.'); return; }
  c.yr = { fed: 0, med: 0, comf: 0, rein: 0 };
  // While you are away, nobody comes.
  if (inPrison(s)) { c.supplies = 0; c.health -= 60; if (c.health <= 0) { capDie(s, c, 'abandoned'); return; } }
  // What a year does.
  const fedEnough = c.supplies >= 30;
  c.supplies = Math.max(0, c.supplies - Math.round(70 - x.sp.comfort / 4));
  c.spirit = clamp100(c.spirit - Math.round(12 + (100 - x.sp.comfort) / 10));
  c.integ = Math.max(0, c.integ - randInt(4, 10) - (c.spirit < 30 ? 3 : 0));
  c.health = clamp100(c.health - randInt(0, 8) - (c.supplies < 25 ? 30 : 0) - (c.spirit < 20 ? 15 : 0) - (fedEnough ? 0 : 10));
  vioHaunt(s, 6); // a year with this is a year with this
  add(s, { happy: -4 });
  if (c.health <= 0) { capDie(s, c, c.supplies < 25 ? 'neglect' : 'despair'); return; }
  // The people who miss them keep looking.
  const cs = invMine(s, (q) => q.crime === 'kidnapping' && q.victim === c.pid)[0];
  if (cs) { invEvidence(s, cs, { wit: Math.min(8, webTies(s, p).size * 2), trace: Math.round(knOf(s).heat / 20) }); if (cs.status === 'cold') invReopen(s, cs, 'a family that will not stop asking'); }
  // They try to get out.
  const esc = clamp(0.02 + (100 - c.integ) / 220 + (c.wits - 50) / 600 + (c.spirit < 30 ? 0.04 : 0), 0, 0.6);
  if (chance(esc)) { capEscape(s, c, p); return; }
  // Somebody heard something.
  const heard = clamp((100 - x.sp.quiet) / 320 + k.heat / 600 + (c.spirit < 30 ? 0.04 : 0), 0, 0.5);
  if (free(s) && chance(heard) && !s.pending.some((q) => q.handler === 'capKnock')) capKnock(s, c, x);
  else if (romanticId(s) && chance(0.12 * (1 - x.sp.conceal / 120)) && free(s)) capHome(s, c);
  // A search.
  if (cs && (k.heat >= 40 && chance(k.heat / 300) || cs.prog >= 70) && free(s) && !s.pending.some((q) => q.handler === 'capSearch')) capSearch(s, c, cs);
}
function capKnock(s, c, x) {
  popup(s, {
    emoji: '🚪', title: 'A knock', handler: 'capKnock', ctx: {},
    text: `Someone from next door is at the door. They heard something, they say, from somewhere under the house. They are being polite. They would like to understand.`,
    choices: [{ label: 'Be warm, and explain', value: 'warm', sub: `${Math.round(clamp(0.5 + skill(s, 'charisma') / 250 + x.sp.quiet / 400, 0.15, 0.9) * 100)}%` }, { label: 'Say nothing, and close the door', value: 'door', tone: 'bad' }, { label: 'Let them go, right now', value: 'free', sub: 'End it' }],
  });
}
onChoice('capKnock', (s, ctx, v) => {
  const c = knCap(s), k = knOf(s);
  if (!c) return;
  const x = spaceOf(s, c);
  if (v === 'free') { capFree(s, 'released'); vioHaunt(s, -15); return { text: 'You opened the door, and the neighbor watched a stranger walk out of your house. They already had their phone out.', tone: 'bad' }; }
  if (v === 'warm' && chance(clamp(0.5 + skill(s, 'charisma') / 250 + (x ? x.sp.quiet / 400 : 0), 0.15, 0.9))) { k.heat = clamp100(k.heat + 5); return { text: 'You were friendly, and a little embarrassed about the pipes. They said they had probably imagined it. They will think about it again.', tone: 'bad' }; }
  k.heat = clamp100(k.heat + (v === 'door' ? 25 : 15));
  return { text: v === 'door' ? 'You said nothing. They noticed you saying nothing.' : 'They did not believe you. They did not say so.', tone: 'bad' };
});
function capHome(s, c) {
  const rom = romanticId(s);
  popup(s, {
    emoji: '🏠', title: 'At home', handler: 'capHome', ctx: { rom }, person: rom,
    text: `${nm(s, rom)} heard something in the house, and has been very quiet about it ever since. Tonight, ${pr(s.people[rom]).he} asked what was in the ${(spaceOf(s, c) || { sp: { name: 'basement' } }).sp.name.toLowerCase()}.`,
    choices: [{ label: 'Explain it away', value: 'explain' }, { label: 'Tell the truth', value: 'tell', sub: 'It will cost everything' }, { label: 'Let them go, now', value: 'free' }],
  });
}
onChoice('capHome', (s, ctx, v) => {
  const c = knCap(s), p = s.people[ctx.rom];
  if (!c || !p || !relOf(s, ctx.rom)) return;
  const cs = invMine(s, (q) => q.crime === 'kidnapping')[0];
  if (v === 'free') { capFree(s, 'released'); vioHaunt(s, -15); return { text: `You opened the door in front of ${p.first}. You do not know what ${pr(p).he} will say. You know what ${pr(p).he} should.`, tone: 'bad' }; }
  if (v === 'tell') { if (cs) invTip(s, cs, 40); vioHaunt(s, -8); return { text: `${p.first} listened to all of it without moving. Then ${pr(p).he} stood up and walked out of the house. ${partnerLeaves(s, ctx.rom)}`.trim(), tone: 'bad' }; }
  if (chance(clamp(0.4 + skill(s, 'acting') / 300 + skill(s, 'charisma') / 400, 0.1, 0.8))) { addRel(s, ctx.rom, 1); return { text: `${p.first} wanted to believe it, and did. You are very good at this. You wish you were not.`, tone: 'bad' }; }
  if (cs) invTip(s, cs, 25);
  addRel(s, ctx.rom, -15);
  return { text: `${p.first} said it was fine, and looked at you like a stranger.`, tone: 'bad' };
});
function capSearch(s, c, cs) {
  const x = spaceOf(s, c), cost = price(s, 4000);
  popup(s, {
    emoji: '📜', title: 'A search warrant', handler: 'capSearch', ctx: { cost },
    text: `They are at the door with a warrant, and a dog, and not much patience. Whatever they find in the ${x ? x.sp.name.toLowerCase() : 'house'} is going to be the rest of your life.`,
    choices: [{ label: 'Let them in', value: 'open' }, { label: 'Get a lawyer on the phone', value: 'lawyer', sub: fmtMoney(cost), disabled: M(s).money < cost }, { label: 'Let them go, and open the door', value: 'free', sub: 'End it, on your own terms' }],
  });
  void cs;
}
onChoice('capSearch', (s, ctx, v) => {
  const c = knCap(s), x = c && spaceOf(s, c);
  if (!c) return;
  if (v === 'free') { capFree(s, 'released'); vioHaunt(s, -15); const r = arrest(s, 'kidnapping'); return { text: `You opened the hidden door yourself. ${r.text}`, tone: 'bad' }; }
  if (v === 'lawyer' && !pay(s, ctx.cost)) return cantAfford(ctx.cost);
  const hide = clamp((x ? x.sp.conceal : 40) / 100 + (v === 'lawyer' ? 0.15 : 0) - knOf(s).heat / 300, 0.05, 0.9);
  if (chance(hide)) { knOf(s).heat = clamp100(knOf(s).heat + 10); return { text: 'They went through the house for four hours, and did not find the door. They left with boxes and a suspicion. They will be back.', tone: 'bad' }; }
  capFree(s, 'found');
  const r = arrest(s, 'kidnapping');
  return { text: `They found it. ${r.text}`, tone: 'bad' };
});
function capFound(s, why) {
  const c = knCap(s);
  if (!c) return;
  capFree(s, 'found');
  const r = arrest(s, 'kidnapping');
  log(s, `🗂️ ${why} ${r && r.text ? r.text : ''}`.trim(), 'bad');
}
// They are out. In the next few minutes you decide what kind of person you will be.
function capEscape(s, c, p) {
  const cs = invMine(s, (q) => q.crime === 'kidnapping' && q.victim === c.pid)[0];
  if (cs) { invEvidence(s, cs, { wit: 40 }); cs.prog = clamp(cs.prog + 30, 0, 100); }
  popup(s, {
    emoji: '🏃', title: 'They are out', handler: 'capEscape', ctx: {},
    text: `The space did not hold. ${p.first} is on the street, and in a few minutes will be on a phone. Whatever you do next has to be done fast.`,
    choices: [{ label: 'Run, now', value: 'run' }, { label: 'Take everything apart before anyone arrives', value: 'scrub', tone: 'bad', sub: 'Risky' }, { label: 'Wait for them, and give yourself up', value: 'wait' }],
  });
  capFree(s, 'escaped');
}
onChoice('capEscape', (s, ctx, v) => {
  const cs = invMine(s, (q) => q.crime === 'kidnapping' && q.status === 'open').pop();
  if (v === 'wait') { vioOf(s).help++; vioHaunt(s, -18); const r = arrest(s, 'kidnapping'); return { text: `You sat on the front step. ${r.text}`, tone: 'bad' }; }
  if (v === 'scrub') {
    if (chance(clamp(0.3 + skill(s, 'streetwise') / 250, 0.1, 0.7))) { if (cs) invEvidence(s, cs, { trace: -25 }); return { text: 'By the time they arrived, there was a very ordinary basement. They were not fooled, and they could not prove it.', tone: 'bad' }; }
    if (cs) { invEvidence(s, cs, { trace: 12 }); cs.prog = clamp(cs.prog + 20, 0, 100); }
    return { text: 'They arrived before you finished. The rest was easy for them.', tone: 'bad' };
  }
  if (cs) cs.prog = clamp(cs.prog + 8, 0, 100);
  add(s, { happy: -4 });
  return { text: 'You ran, and kept running, and the whole time you knew exactly how fast the phone was.', tone: 'bad' };
});

/* ---- when it ends in a death ------------------------------------------------------------------------------ */
// Neglect, despair or an empty house. Through the web's 'killed' fact (72-violence.js asks what you do now).
function capDie(s, c, why) {
  const k = knOf(s), p = s.people[c.pid];
  k.cap = null; k.lost++;
  vioHaunt(s, 20);
  add(s, { karma: -40, happy: -10 });
  tally(s, 'murders');
  if (p && p.alive) npcDies(s, p, 'suspicious circumstances', { murdered: true });
  else if (p) p.cause = 'suspicious circumstances';
  const kc = invMine(s, (q) => q.crime === 'kidnapping' && q.victim === c.pid)[0];
  if (kc) { kc.status = 'closed'; kc.closed = s.year; }
  webFact(s, 'killed', { pid: c.pid, how: 'captive' });
  log(s, `🕯️ ${p ? p.first : 'They'} did not survive ${why === 'neglect' ? 'the lack of care' : why === 'despair' ? 'it' : why === 'abandoned' ? 'you being gone' : 'the year'}. There is no taking that back.`, 'bad');
  newsPost(s, 'body', { name: p ? p.first : 'The missing person', full: p ? fullName(p) : '' });
}
