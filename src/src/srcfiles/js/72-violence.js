/* =====================================================================
 * 72-violence.js — grittier crime, and what it costs. Behind the Mature
 * and Violence switches (CONTENT_TAGS in 12-flow.js, both off by default),
 * a fight is a scene you can walk out of, a killing is something you carry,
 * and the underworld asks for proof. Adults only (18+).
 *
 * Rules that hold everywhere in this file and in 73-serial.js, and that
 * dev/verify/violence.mjs checks:
 *   - Violence is implied and abstract: odds, outcomes and what comes after.
 *     Nothing says how anything is done, and nothing is described in detail.
 *   - No sexual violence, anywhere, in any system. No sexual content at all.
 *   - Adults only: the player is 18+ for every scene, and so is everyone else in one.
 *   - Consequences are the point. Nothing here is made to look like a good idea.
 *
 * M(s).vio = { haunt, kills, defense, help }
 *   haunt    0-100, the weight of what you have done. It costs happiness and sleep every year, fades slowly,
 *            and is only lifted by help, by telling someone, or by time
 *   kills    people you have killed on purpose; defense: people you killed to stop them killing you
 *   help     times you have asked for help with it (a therapist, a sponsor, a friend)
 *
 * The scenes: you start a fight (p_assault, 20-crime.js, calls vioFight), a stranger starts one with
 * you (an event), a killing leaves you choices about what to do next (vioAfter, off the web's 'killed'
 * fact), a witness has to be dealt with (vioWitness), the family or the yard asks you to prove yourself
 * (vioInitiation, from 39-underworld.js and pr_gang in 20-crime.js), and the nights are bad (vioNight).
 * The serial arc is 73-serial.js.
 * ===================================================================== */

const VIO_TAGS = ['mature', 'mature_violence'];
const vioOn = () => tagsOn(VIO_TAGS);
function vioOf(s) { const m = M(s); return m.vio || (m.vio = { haunt: 0, kills: 0, defense: 0, help: 0 }); }
const HAUNT_WORDS = [[0, 'Quiet'], [15, 'Uneasy'], [35, 'Haunted'], [60, 'Heavy'], [80, 'Unbearable']];
function hauntWord(v) { let w = HAUNT_WORDS[0][1]; for (const [min, word] of HAUNT_WORDS) if (v >= min) w = word; return w; }
// What you did sits in you. A kind person carries more of it.
function vioHaunt(s, n) {
  const v = vioOf(s);
  v.haunt = clamp100(Math.round(v.haunt + n * (trait(s, 'kind') ? 1.3 : 1)));
}

CRIMES.manslaughter = { name: 'Manslaughter', minAge: 14, sentence: [2, 12], conviction: 0.75, karma: -25, felony: true, verb: 'manslaughter' }; // not a Crime-menu crime
INV_PROFILE.manslaughter = [22, 55, 12, 'violent'];

/* ---- a fight you pick ----------------------------------------------------------------- */
// Called by p_assault (20-crime.js) when Violence is on. You can still walk away.
function vioFight(s, pid) {
  const p = s.people[pid];
  if (!p) return;
  popup(s, {
    emoji: '👊', title: p.first, handler: 'vioFight', ctx: { pid, step: 0 }, person: pid,
    text: `You and ${p.first} are face to face, and the room has gone quiet. Nobody is making you do this.`,
    choices: [
      { label: 'Back down and walk away', value: 'walk' },
      { label: 'Say it out loud, not with fists', value: 'talk', sub: `${Math.round(vioTalkOdds(s) * 100)}%` },
      { label: 'Throw the first punch', value: 'hit', tone: 'bad' },
    ],
  });
}
const vioTalkOdds = (s) => clamp(0.3 + skill(s, 'charisma') / 250 + (trait(s, 'hotheaded') ? -0.12 : 0), 0.08, 0.8);
onChoice('vioFight', (s, ctx, v) => {
  const p = s.people[ctx.pid];
  if (!p || !p.alive) return;
  if (v === 'walk') { add(s, { karma: 1, happy: 1 }); return { text: `You walked away from ${p.first}. It is harder than it looks, and it is the right call.`, tone: 'good' }; }
  if (v === 'talk') {
    if (chance(vioTalkOdds(s))) { add(s, { karma: 2 }); return { text: `You said what you meant, out loud. ${p.first} had been ready for a fight and was not ready for that. It ended there.`, tone: 'good' }; }
    return vioFightStage2(s, ctx.pid, 'It did not land. ');
  }
  if (v === 'hit') return vioFightStage2(s, ctx.pid, '');
  // the second decision: how far
  const me = skill(s, 'martial') + skill(s, 'fitness') / 2 + P(s).stats.health / 5 + (trait(s, 'hotheaded') ? 10 : 0) + randInt(0, 40) + (v === 'all' ? 10 : 0);
  const them = Math.min(ageOf(s, p), 30) + p.stats.health / 4 + randInt(0, 40) - (ageOf(s, p) > 65 ? 25 : 0);
  tally(s, 'fights');
  webFact(s, 'assault', { pid: ctx.pid });
  add(s, { karma: -6 });
  const kind = relKind(s, ctx.pid);
  setRel(s, ctx.pid, isFamilyKind(kind) || K_ROMANCE.includes(kind) ? kind : 'enemy', 5);
  if (K_ROMANCE.includes(kind) && chance(0.6)) endRomance(s, ctx.pid, kind === 'spouse' ? 'exspouse' : 'ex');
  let out;
  if (me > them) {
    tally(s, 'fightWins');
    p.stats.health = clamp100(p.stats.health - (v === 'all' ? randInt(18, 45) : v === 'quick' ? randInt(4, 12) : randInt(10, 25)));
    if (v === 'all' && chance(0.03 + (ageOf(s, p) > 60 ? 0.03 : 0))) return vioFightDeath(s, p);
    vioHaunt(s, v === 'all' ? 6 : 2);
    out = v === 'quick' ? `You ended it fast, and stopped. ${p.first} will be sore for a week.` : v === 'all' ? `You did not stop until it was over. ${p.first} is hurt, and you can still hear it.` : `You won. ${p.first} will not forget it, and neither will you.`;
  } else {
    add(s, { health: -randInt(5, 15), happy: -4 });
    if (chance(0.15)) getSick(s, pick(['broken_arm', 'concussion']));
    out = `You started it and you lost. ${p.first} did not even look angry.`;
  }
  if (A(s) >= 12 && chance(v === 'all' ? 0.45 : v === 'quick' ? 0.15 : 0.3)) {
    const r = arrest(s, 'assault');
    return { text: out + ' ' + r.text, tone: 'bad' };
  }
  return out;
});
function vioFightStage2(s, pid, lead) {
  const p = s.people[pid];
  popup(s, {
    emoji: '👊', title: 'How far?', handler: 'vioFight', ctx: { pid, step: 1 }, person: pid,
    text: `${lead}It is physical now, and the next few seconds are yours to decide. Whatever you choose, you will live with it.`,
    choices: [
      { label: 'End it quickly, then stop', value: 'quick', sub: 'Less damage, less to answer for' },
      { label: 'Fight it out', value: 'fight' },
      { label: 'Go all out', value: 'all', tone: 'bad', sub: 'You may not be able to stop' },
    ],
  });
  return { text: lead.trim() || 'It began.', nolog: true, quiet: true };
}
// The fight that went too far.
function vioFightDeath(s, p) {
  tally(s, 'murders');
  vioOf(s).kills++;
  vioHaunt(s, 30);
  add(s, { karma: -25, happy: -10 });
  npcDies(s, p, 'a fight', { murdered: true });
  webFact(s, 'killed', { pid: p.id, how: 'fight' });
  if (chance(0.45)) { const r = arrest(s, 'manslaughter'); return { text: `${p.first} did not get up. ${r.text}`, tone: 'bad' }; }
  return { text: `${p.first} did not get up. You stood there for a long time. Then you were the one leaving, and nobody had seen your face. Yet.`, tone: 'bad' };
}

/* ---- the one who comes at you ---------------------------------------------------------- */
EV('vio_attacked', {
  ages: [18, 80], w: 0.5, emoji: '🌃', title: 'The wrong street', tags: VIO_TAGS, cooldown: 6, when: (s) => free(s),
  text: 'A stranger steps out in front of you on a quiet street, hand inside a jacket, and says you are going to give them everything you have.',
  choices: [
    ['Hand it over', (s) => { const lost = Math.min(M(s).money, price(s, randInt(60, 400))); add(s, { money: -lost, happy: -3 }); return { text: 'You handed it over. Your hands shook for an hour, and nothing else happened. It was the right call.', tone: 'good' }; }],
    ['Run', (s) => (chance(clamp(0.35 + skill(s, 'fitness') / 200, 0.1, 0.85)) ? { text: 'You ran, and kept running, and did not look back until your own front door. You were fine.', tone: 'good' } : (add(s, { health: -randInt(4, 12), happy: -4 }), { text: 'They were faster. You lost your things, and you have a bruise that will take a month to fade.', tone: 'bad' }))],
    ['Talk them down', (s) => (chance(clamp(0.3 + skill(s, 'charisma') / 220, 0.1, 0.8)) ? { text: 'You kept your voice low and your hands where they could see. Somewhere in the conversation, they remembered they were a person. They left.', tone: 'good' } : (add(s, { money: -Math.min(M(s).money, price(s, 150)), happy: -4 }), { text: 'You tried, and it did not work, and it cost you what they came for.', tone: 'bad' }))],
    ['Fight back', (s) => {
      const win = skill(s, 'martial') + skill(s, 'fitness') / 2 + randInt(0, 45) > 45 + randInt(0, 15);
      if (!win) { add(s, { health: -randInt(8, 20), happy: -5 }); if (chance(0.15)) getSick(s, 'broken_arm'); return { text: 'You tried, and you lost. You woke up later with a stranger asking if you knew your name.', tone: 'bad' }; }
      if (chance(0.04 + skill(s, 'martial') / 2000)) return vioDefenseKill(s);
      add(s, { happy: 2, karma: 1 });
      return { text: 'You fought back, and they ran. You sat on the curb for a while, and shook.', tone: 'good' };
    }],
  ],
});
// You killed someone who was trying to kill you. The law still has questions.
function vioDefenseKill(s) {
  const p = makeAdultNear(s, { minAge: 20, maxAge: 45 });
  npcDies(s, p, 'a street fight', { murdered: true });
  vioOf(s).defense++;
  vioHaunt(s, 20);
  add(s, { happy: -8 });
  const cost = price(s, 2000);
  popup(s, {
    emoji: '🚔', title: 'The inquiry', handler: 'vioInquiry', ctx: { cost },
    text: 'They did not get up. You called for help yourself, and waited with them until it arrived. Now two detectives are asking you to go through it from the beginning.',
    choices: [{ label: 'Tell the whole truth, plainly', value: 'truth' }, { label: 'Get a lawyer first', value: 'lawyer', sub: fmtMoney(cost), disabled: M(s).money < cost }, { label: 'Say as little as you can', value: 'quiet' }],
  });
  return { text: 'They did not get up. You will remember that for the rest of your life.', tone: 'bad' };
}
onChoice('vioInquiry', (s, ctx, v) => {
  if (v === 'lawyer' && !pay(s, ctx.cost)) return cantAfford(ctx.cost);
  const r = webRep(P(s));
  const odds = clamp(0.6 + (r.name - 50) / 300 - r.scandal / 300 + (v === 'lawyer' ? 0.18 : v === 'truth' ? 0.1 : -0.1), 0.2, 0.92);
  if (chance(odds)) { add(s, { karma: 2 }); return { text: 'The inquiry ruled it self-defense. It did not feel like a ruling. It felt like being told you could go.', tone: 'good' }; }
  const out = arrest(s, 'manslaughter');
  return { text: `They did not believe it was as simple as you said. ${out.text}`, tone: 'bad' };
});

/* ---- after a killing ----------------------------------------------------------------------- */
// The web announces every killing; with Violence on, what you do next is a choice.
onWebFact('killed', (s, d) => {
  if (!vioOn() || !d.pid || d.how === 'fight' || A(s) < 18) return;
  const v = vioOf(s);
  v.kills++;
  vioHaunt(s, 30);
  const friend = pickRel(s, ['friend', 'bestie']);
  const sec = webLive(s, (x) => x.kind === 'killing' && x.subj === s.playerId && x.other === d.pid)[0];
  const captive = d.how === 'captive', hireCost = price(s, 6000); // a person who died in your care (78-secret-space.js)
  popup(s, {
    emoji: '🕯️', title: 'What now?', handler: 'vioAfter', ctx: { pid: d.pid, friend, sec: sec ? sec.id : null, how: d.how, hireCost },
    text: captive ? 'They are gone, and it was your doing, by neglect or by despair. Nobody knows yet. What happens in the next hour decides what happens to the rest of your life.' : 'It is over, and the world is exactly as it was a minute ago, except for you. The next hour matters more than the last one did.',
    choices: [
      ...(captive ? [{ label: 'Pay someone who asks no questions', value: 'hire', tone: 'bad', sub: fmtMoney(hireCost), disabled: M(s).money < hireCost }] : []),
      { label: 'Get away clean', value: 'clean', sub: `${Math.round(vioCleanOdds(s) * 100)}%` },
      { label: 'Get rid of everything that ties you to it', value: 'scrub', sub: `${Math.round(vioCleanOdds(s, 0.12) * 100)}%`, tone: 'bad' },
      ...(friend ? [{ label: `Call ${nm(s, friend)}`, value: 'friend', sub: 'They will know' }] : []),
      { label: 'Turn yourself in', value: 'confess', sub: 'It is the only way this stops' },
    ],
  });
});
const vioCleanOdds = (s, d) => clamp(0.35 + skill(s, 'streetwise') / 250 + (trait(s, 'cunning') ? 0.1 : 0) + (d || 0), 0.1, 0.85);
onChoice('vioAfter', (s, ctx, v) => {
  const c = invMine(s, (x) => x.crime === 'murder' && x.victim === ctx.pid)[0];
  if (v === 'confess') {
    vioOf(s).help++;
    vioHaunt(s, -15);
    const r = arrest(s, 'murder');
    return { text: `You called it in yourself. ${r.text}`, tone: 'bad' };
  }
  if (v === 'friend') {
    const f = s.people[ctx.friend], sec = ctx.sec && webOf(s).secrets[ctx.sec];
    if (!f || !f.alive) return 'The friend you had in mind was not around any more.';
    if (sec && !sec.knows.includes(f.id)) sec.knows.push(f.id);
    if (c) invEvidence(s, c, { wit: 8 });
    vioHaunt(s, -5);
    addRel(s, f.id, chance(0.5) ? 8 : -25);
    return { text: `${f.first} did not say anything for a long time. Then ${pr(f).he} sat down next to you. You are not alone with it now, and ${pr(f).he} ${pr(f).is} not either.`, tone: '' };
  }
  if (v === 'hire') {
    if (!pay(s, ctx.hireCost)) return cantAfford(ctx.hireCost);
    webNewSecret(s, 'crime', s.playerId, { crime: 'bribery', sev: 3, ev: 25 }); // somebody now knows, and has your number
    if (chance(0.75)) { if (c) invEvidence(s, c, { trace: -22, dig: -10 }); return { text: 'Somebody came, and went, and did not say a word. By morning there was nothing left to find. You now owe a person you will never be rid of.', tone: 'bad' }; }
    if (c) invEvidence(s, c, { trace: 14, wit: 10 });
    return { text: 'Somebody came, and went, and was not careful. The rest was easy for the police.', tone: 'bad' };
  }
  const scrub = v === 'scrub';
  if (chance(vioCleanOdds(s, scrub ? 0.12 : 0))) {
    if (c) invEvidence(s, c, { trace: scrub ? -22 : -10, dig: scrub ? -10 : 0 });
    return { text: scrub ? 'By morning there was nothing left to find. You do not feel safe. You feel empty.' : 'You were gone before anyone knew there was anything to find.', tone: 'bad' };
  }
  if (c) invEvidence(s, c, { trace: scrub ? 15 : 12, wit: 10 });
  return { text: scrub ? 'Somebody saw you out there, and they saw what you were carrying.' : 'You were seen leaving. You are not sure by whom.', tone: 'bad' };
});

/* ---- a witness ------------------------------------------------------------------------------ */
function vioWitness(s, c) {
  const cost = price(s, 8000), name = pick(['a neighbor', 'the man from the corner store', 'a woman who was walking her dog', 'a teenager’s father from two streets over', 'a night-shift cleaner']);
  c.st.wp = true;
  popup(s, {
    emoji: '👁️', title: 'Someone saw', handler: 'vioWitness', ctx: { cid: c.id, cost },
    text: `${cap(name)} saw more than they should have, and has been looking at you differently. Sooner or later, they will tell somebody.`,
    choices: [
      { label: 'Pay them to forget it', value: 'pay', sub: fmtMoney(cost), disabled: M(s).money < cost, tone: 'bad' },
      { label: 'Make it clear what talking would cost them', value: 'threat', tone: 'bad', sub: 'A crime of its own' },
      { label: 'Keep your head down', value: 'low' },
      { label: 'Go to the police yourself', value: 'confess' },
    ],
  });
}
onChoice('vioWitness', (s, ctx, v) => {
  const c = invOf(s).list[ctx.cid];
  if (!c || c.status !== 'open') return { text: 'By the time you had decided, it no longer mattered.', quiet: true, nolog: true };
  if (v === 'confess') { vioOf(s).help++; vioHaunt(s, -10); const r = arrest(s, CRIMES[c.crime] ? c.crime : 'assault'); return { text: `You went in. ${r.text}`, tone: 'bad' }; }
  if (v === 'low') { c.lay = true; return 'You went to work, came home, and tried to be somebody nobody remembers. It is a very long wait.'; }
  if (v === 'pay') {
    if (!pay(s, ctx.cost)) return cantAfford(ctx.cost);
    if (chance(0.55)) { invEvidence(s, c, { wit: -25 }); webNewSecret(s, 'crime', s.playerId, { crime: 'bribery', sev: 2, ev: 20 }); return { text: 'They took the money, and looked at the floor, and said they had not seen anything. You own a debt you cannot see now.', tone: 'bad' }; }
    invEvidence(s, c, { wit: 12 });
    return { text: 'They took the money, and told the police about the money.', tone: 'bad' };
  }
  if (chance(clamp(0.35 + skill(s, 'streetwise') / 250, 0.1, 0.8))) {
    invEvidence(s, c, { wit: -30 });
    webNewSecret(s, 'crime', s.playerId, { crime: 'extortion', sev: 3, ev: 25 });
    add(s, { karma: -8, happy: -4 });
    vioHaunt(s, 6);
    return { text: 'It worked. They will not be telling anybody anything. You have one more person who is afraid of you, and it is not a good feeling.', tone: 'bad' };
  }
  invEvidence(s, c, { wit: 20 });
  c.prog = clamp(c.prog + 15, 0, 100);
  return { text: 'They went straight to the police, and told them everything, including what you said.', tone: 'bad' };
});

/* ---- the nights are bad ----------------------------------------------------------------------- */
function vioYear(s) {
  if (!vioOn() || A(s) < 18 || s.dead) return;
  const v = vioOf(s);
  for (const c of invMine(s, (x) => x.status === 'open' && ['murder', 'assault', 'manslaughter'].includes(x.crime) && x.ev.wit >= 40 && !x.st.wp)) { if (free(s) && !s.pending.some((p) => p.handler === 'vioWitness') && chance(0.35)) { vioWitness(s, c); break; } }
  if (v.haunt <= 0) return;
  add(s, { happy: -Math.round(v.haunt / 12), health: v.haunt >= 60 ? -2 : 0 });
  if (v.haunt >= 30 && free(s) && chance(v.haunt / 220) && !s.pending.some((p) => p.handler === 'vioNight')) vioNight(s);
  v.haunt = clamp100(Math.round(v.haunt * 0.96 - 0.5));
}
function vioNight(s) {
  const cost = price(s, 150), friend = pickRel(s, ['friend', 'bestie']);
  popup(s, {
    emoji: '🌙', title: 'The nights', handler: 'vioNight', ctx: { cost, friend },
    text: 'You have not slept properly in weeks. Every quiet moment is the same moment, replaying. It is not getting better by itself.',
    choices: [
      { label: 'See a therapist', value: 'therapy', sub: fmtMoney(cost), disabled: M(s).money < cost },
      ...(friend ? [{ label: `Talk to ${nm(s, friend)}`, value: 'friend', sub: 'Without the details, or with them' }] : []),
      { label: 'Drink it quiet', value: 'drink', tone: 'bad' },
      { label: 'Turn yourself in', value: 'confess', sub: 'If there is something to turn in' },
      { label: 'Carry on', value: 'on' },
    ],
  });
}
onChoice('vioNight', (s, ctx, v) => {
  const m = vioOf(s);
  if (v === 'therapy') { if (!pay(s, ctx.cost)) return cantAfford(ctx.cost); m.help++; vioHaunt(s, -14); add(s, { happy: 3 }); return { text: 'The first session, you said nothing for forty minutes. The fifth, you said everything. Not all of it is fixed, and some of it can be carried.', tone: 'good' }; }
  if (v === 'friend') { const f = s.people[ctx.friend]; if (!f) return; m.help++; vioHaunt(s, -8); addRel(s, f.id, 5); return { text: `You told ${f.first} as much as you could. ${cap(pr(f).he)} listened and did not look away.`, tone: 'good' }; }
  if (v === 'drink') { habit(s, 'alcohol', 8); vioHaunt(s, -3); add(s, { health: -2 }); return { text: 'It worked until about four in the morning, and then it stopped working, and you were drinking at four in the morning.', tone: 'bad' }; }
  if (v === 'confess') {
    const c = invMine(s, (x) => x.status === 'open' || x.status === 'cold').find((x) => ['murder', 'manslaughter', 'assault'].includes(x.crime));
    if (!c) { vioHaunt(s, -3); return 'There was nothing to confess to, in the end. It did not help as much as you hoped.'; }
    m.help++; vioHaunt(s, -20);
    const r = arrest(s, c.crime);
    return { text: `You walked into a police station with nothing to say but the truth. ${r.text}`, tone: 'bad' };
  }
  add(s, { happy: -3 });
  return 'You carried on. It carried on too.';
});

/* ---- proving yourself ------------------------------------------------------------------------------- */
// The family or the yard wants to see what you are made of. Called from mobJoin (39-underworld.js) and pr_gang (20-crime.js).
function vioInitiation(s, where) {
  const prison = where === 'prison';
  popup(s, {
    emoji: prison ? '🐍' : '🕴️', title: 'Proving yourself', handler: 'vioJump', ctx: { where },
    text: prison ? 'They will have you, but not for free. Everyone on the block has been watching to see what you will do.' : 'They like you well enough. Now they want to know whether you will hold up when it counts.',
    choices: [
      { label: 'Take the beating', value: 'beating', sub: 'Count to ten, and stay on your feet' },
      { label: 'Do what they ask of you', value: 'errand', sub: 'It will be on your record', tone: 'bad' },
      { label: 'Prove yourself against someone', value: 'rival', sub: 'Somebody will get hurt', tone: 'bad' },
      { label: 'Back out', value: 'out', sub: 'They may not let it go' },
    ],
  });
}
onChoice('vioJump', (s, ctx, v) => {
  const prison = ctx.where === 'prison', u = !prison && uw(s), pr0 = prison && M(s).prison;
  const gain = (n) => { if (prison) { if (pr0 && !pr0.gang) pr0.gang = pick(GANGS); } else if (u) u.respect = (u.respect || 0) + n; };
  if (v === 'out') {
    if (prison) { add(s, { health: -randInt(0, 8) }); return 'You said no. They took it as an insult, and a day later, again, in the showers. It is not over, but you are not theirs.'; }
    if (u) Object.assign(u, { fam: null, rank: 0, respect: 0, rackets: [] });
    return { text: 'You told them you had changed your mind. A very quiet man said they would remember this, and let you go.', tone: '' };
  }
  if (v === 'beating') {
    add(s, { health: -randInt(8, 18), happy: -3 });
    gain(4);
    vioHaunt(s, 1);
    return { text: 'You counted to ten, and then you counted to ten again. You were on your feet at the end. That was the point.', tone: '' };
  }
  if (v === 'errand') {
    webFact(s, 'crime_messy', { crime: prison ? 'fencing' : 'extortion' });
    add(s, { karma: -6, money: prison ? 0 : price(s, 1500) });
    gain(6);
    return { text: 'You did what you were told, to someone who had done nothing to you. It was over in a minute. It is going to be a problem for much longer.', tone: 'bad' };
  }
  // against a rival
  const win = skill(s, 'martial') + skill(s, 'fitness') / 2 + skill(s, 'streetwise') / 2 + randInt(0, 40) > 55;
  add(s, { karma: -8 });
  invOpen(s, 'assault', { who: s.playerId, ev: { wit: 20 } });
  tally(s, 'fights');
  if (win) { gain(8); vioHaunt(s, 5); return { text: 'You did what you came to do, and a stranger will not be walking straight for a while. Nobody in the room looked surprised.', tone: 'bad' }; }
  add(s, { health: -randInt(10, 22), happy: -5 });
  gain(2);
  return { text: 'It did not go the way you planned. They stopped it before it got worse, and said you had guts, and meant it as a consolation.', tone: 'bad' };
});

/* ---- the yard ------------------------------------------------------------------------------------------ */
EV('vio_yard_protection', {
  ages: [18, 120], prison: true, w: 1.2, emoji: '🧱', title: 'Protection', tags: VIO_TAGS, cooldown: 3,
  text: 'A man you have never spoken to says you are going to need protection in here, and that it costs.',
  choices: [
    ['Pay', (s) => { const cost = price(s, 120); if (!pay(s, cost)) return cantAfford(cost); return 'You paid. Nobody bothered you, which was the point, and which is how it keeps going.'; }],
    ['Refuse', (s) => { M(s).prison.behavior = clamp100(M(s).prison.behavior - 4); if (chance(0.5)) { add(s, { health: -randInt(6, 16) }); return { text: 'They did not like being told no. You woke up in the infirmary.', tone: 'bad' }; } return 'You said no, and held his stare, and he walked away. For now.'; }],
    ['Tell a guard', (s) => { M(s).prison.behavior = clamp100(M(s).prison.behavior + 4); if (chance(0.45)) { add(s, { health: -10 }); return { text: 'Word got around that you talked. You paid for it later.', tone: 'bad' }; } return 'The guard wrote it down and moved him to another block.'; }],
  ],
});
EV('vio_yard_hurt', {
  ages: [18, 120], prison: true, w: 0.8, emoji: '🚨', title: 'On the yard', tags: VIO_TAGS, cooldown: 4,
  text: 'Across the yard, a man goes down and does not get up, and a ring of people forms. Everybody is very interested in the sky.',
  choices: [
    ['Look away', (s) => { vioHaunt(s, 2); add(s, { happy: -3 }); return { text: 'You looked away like everyone else. You will think about it later.', tone: '' }; }],
    ['Call for a guard', (s) => { M(s).prison.behavior = clamp100(M(s).prison.behavior + 5); add(s, { karma: 2 }); if (chance(0.35)) { add(s, { health: -8 }); return { text: 'He lived. Somebody noticed who shouted, and you were made to regret it.', tone: 'bad' }; } return { text: 'He lived. Nobody thanked you, and it did not matter.', tone: 'good' }; }],
    ['Help him', (s) => { add(s, { karma: 4, health: -2 }); M(s).prison.behavior = clamp100(M(s).prison.behavior + 3); return { text: 'You knelt down and put pressure where it was needed until the guards came. Your hands were not clean afterwards. You did not mind.', tone: 'good' }; }],
  ],
});

/* ---- actions ------------------------------------------------------------------------------------------- */
defAction({
  id: 'vio_help', cat: 'health', label: 'Talk to someone about it', emoji: '🕊️', tags: VIO_TAGS,
  desc: 'Whatever you are carrying, it does not have to be alone.',
  when: (s) => free(s) && A(s) >= 18 && vioOf(s).haunt >= 15,
  sub: (s) => `${hauntWord(vioOf(s).haunt)} · ${fmtMoney(price(s, 150))}`,
  run: (s) => {
    const cost = price(s, 150);
    if (bump(s, 'viohelp') > 2) return { text: 'You have done enough talking for one year. Let it settle.', nolog: true };
    if (!pay(s, cost)) return cantAfford(cost);
    vioOf(s).help++;
    vioHaunt(s, -12);
    add(s, { happy: 3 });
    return 'You talked, and somebody listened, and did not flinch. It helps, a little, and a little is a lot.';
  },
});
