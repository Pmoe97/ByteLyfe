/* =====================================================================
 * 73-serial.js — the serial offender. Behind the Mature and Violence
 * switches (VIO_TAGS, 72-violence.js), off by default, adults only. It is
 * built on the case-file series (63-cases.js, which joins crimes of one
 * hand, hands them to one detective and gives the press a name to use)
 * and on the web (secrets, ties, the people who have noticed).
 *
 * It is a story about what this does to a person and to everyone near them, and it is never
 * made to look like a good idea: the urge is a meter you lose to, the double life costs the people
 * you love, the detective gets closer, and every way out is a way out of something. Violence is abstract
 * (odds and outcomes, nothing described in detail), there is never anything sexual in it, and every
 * victim is an adult. There is always a way to refuse: hold on, get help, stop, or turn yourself in.
 *
 * M(s).ser = { on, mo, urge, kills, cool, held, copy, memoir, stopped, watched }
 *   mo       how you operate, chosen once: 'careful' | 'quick' | 'circle'
 *   urge     0-100, builds every year and after every act falls back; at 70 it asks you a question
 *   kills    acts in this arc; cool: years of quiet after one (urge cannot climb above 35)
 *   held     times you held on; stopped: you got out; copy: a copycat case is open
 *
 * serYear runs once a year (after vioYear, in ageUp). The acts are a chain of popups:
 *   urge (70+) -> hold on | get help | give in -> who -> the roll -> what now (72-violence.js)
 * ===================================================================== */

const SER_MOS = {
  careful: { name: 'Careful and patient', desc: 'Planning. Fewer traces, and years between.', odds: 0.12, cool: 1, trace: -12 },
  quick: { name: 'Fast and opportunistic', desc: 'Less planning, more luck, and more left behind.', odds: -0.04, cool: 0, trace: 10 },
  circle: { name: 'Close to home', desc: 'People you know. You know the routines, and everybody knows you.', odds: 0, cool: 0, trace: 4 },
};
function serOf(s) { const m = M(s); return m.ser || (m.ser = { on: false, mo: null, urge: 0, kills: 0, cool: 0, held: 0, copy: false, memoir: false, stopped: false, watched: false }); }
const serOn = (s) => vioOn() && serOf(s).on;
const SER_WORDS = [[0, 'Quiet'], [30, 'Stirring'], [55, 'Hungry'], [70, 'Pressing'], [90, 'Overwhelming']];
function serWord(v) { let w = SER_WORDS[0][1]; for (const [min, word] of SER_WORDS) if (v >= min) w = word; return w; }
const serCase = (s) => invMine(s, (c) => c.crime === 'murder' && c.status === 'open')[0] || null;

/* ---- the turn ---------------------------------------------------------------------------------------- */
// The second life is the one that changes what you are.
onWebFact('killed', (s, d) => {
  if (!vioOn() || !d.pid || d.how === 'fight' || A(s) < 18) return;
  const r = serOf(s);
  if (r.on || r.stopped || vioOf(s).kills < 2 || !free(s)) return;
  popup(s, {
    emoji: '🕯️', title: 'What you are', handler: 'serTurn',
    text: 'Two people are gone because of you, and the second time was easier than the first. That is the part that frightens you. It is not going to stop by itself.',
    choices: [
      { label: 'Get help, while you still can', value: 'help' },
      { label: 'Turn yourself in', value: 'confess', sub: 'End it here' },
      { label: 'Keep going', value: 'on', tone: 'bad' },
    ],
  });
});
onChoice('serTurn', (s, ctx, v) => {
  const r = serOf(s);
  if (v === 'help') {
    r.stopped = true; vioOf(s).help++; vioHaunt(s, -10);
    return { text: 'You found a number, and a person who did not hang up. It is the hardest thing you have ever done, and it is the first step of a very long road. You are not the person who did that, and you are.', tone: 'good' };
  }
  if (v === 'confess') { const out = arrest(s, 'murder'); vioHaunt(s, -15); return { text: `You went in and told them. ${out.text}`, tone: 'bad' }; }
  popup(s, {
    emoji: '🕯️', title: 'How', handler: 'serMo', text: 'You have a way of doing this now, whether you wanted one or not.',
    choices: Object.keys(SER_MOS).map((k) => ({ label: SER_MOS[k].name, value: k, sub: SER_MOS[k].desc })),
  });
  return { text: 'You decided to keep going.', nolog: true, quiet: true };
});
onChoice('serMo', (s, ctx, k) => {
  const r = serOf(s);
  r.on = true; r.mo = SER_MOS[k] ? k : 'careful'; r.urge = 20;
  log(s, '🕯️ It is a pattern now, and patterns get noticed.', 'bad');
  return { text: `${SER_MOS[r.mo].name}. It is a double life now: the one everybody sees, and the one you keep.`, tone: 'bad' };
});

/* ---- the year -------------------------------------------------------------------------------------------- */
function serYear(s) {
  if (!vioOn() || A(s) < 18 || s.dead) return;
  const r = serOf(s);
  if (!r.on) return;
  if (inPrison(s)) { r.urge = Math.max(0, r.urge - 15); return; }
  r.urge = clamp100(r.urge + 10 + r.kills * 2 - (r.mo === 'careful' ? 3 : 0));
  if (r.cool > 0) { r.cool--; r.urge = Math.min(r.urge, 35); }
  add(s, { happy: -2 }); // a double life is lonely
  const c = serCase(s), d = c && invDet(s, c);
  if (d && d.det.obs >= 60 && !r.watched) { r.watched = true; log(s, `🗂️ Detective ${d.last} has pinned the whole series to a wall, and the pins are getting closer to you.`, 'bad'); }
  // A copycat: somebody else starts copying. It buys you time, and it is somebody else's life.
  if (!r.copy && c && c.nick && chance(0.12)) {
    const k = invOpen(s, 'murder', { who: null });
    k.copy = true; k.cy = s.year; r.copy = true;
    vioHaunt(s, 6);
    log(s, '📰 Somebody else has started copying the work. The police are chasing two people now. It buys you time, and it means someone else is dead because of what you are.', 'bad');
  }
  if (r.copy) {
    for (const o of invMine(s, (x) => x.status === 'open' && !x.copy)) o.prog = clamp(o.prog - 6, 0, 100);
    for (const k of Object.values(invOf(s).list)) if (k.copy && s.year - k.cy >= 2 && k.status === 'open') { k.status = 'solved'; k.solved = s.year; r.copy = false; log(s, '📰 The copycat was caught. The police are looking back at the original now.', 'bad'); }
  }
  // The people at home notice.
  const rom = romanticId(s);
  if (rom && vioOf(s).kills >= 1 && c && chance(0.15) && free(s) && !s.pending.some((p) => p.handler === 'serSuspect')) {
    popup(s, {
      emoji: '🏠', title: 'At home', handler: 'serSuspect', ctx: { rom, cid: c.id }, person: rom,
      text: `${nm(s, rom)} has found something that does not add up, and has been very quiet about it ever since. Dinner is silent.`,
      choices: [{ label: 'Explain it away', value: 'explain' }, { label: 'Change the subject, and keep your distance', value: 'distance' }, { label: 'Tell them the truth', value: 'tell', sub: 'It will cost everything' }],
    });
  }
  if (r.urge >= 70 && free(s) && !s.pending.some((p) => p.handler === 'serUrge')) serUrge(s);
}
onChoice('serSuspect', (s, ctx, v) => {
  const c = invOf(s).list[ctx.cid], p = s.people[ctx.rom];
  if (!p || !p.alive || !relOf(s, ctx.rom)) return;
  if (v === 'tell') {
    vioHaunt(s, -8);
    if (c) invTip(s, c, 35);
    return { text: `${p.first} listened to all of it without moving. Then ${pr(p).he} stood up, and said ${pr(p).he} needed a minute, and did not come back. ${partnerLeaves(s, ctx.rom)}`.trim(), tone: 'bad' };
  }
  const odds = clamp((v === 'explain' ? 0.45 : 0.3) + skill(s, 'acting') / 300 + skill(s, 'charisma') / 400, 0.1, 0.8);
  if (chance(odds)) { addRel(s, ctx.rom, 2); return { text: `${p.first} wanted to believe it, and did. You are good at this. You wish you were not.`, tone: 'bad' }; }
  addRel(s, ctx.rom, -15);
  if (c) invTip(s, c, 20);
  return { text: `${p.first} said it was fine, and looked at you like a stranger. A few days later, a detective knew things about you that only ${pr(p).he} could have told.`, tone: 'bad' };
});

/* ---- the urge ------------------------------------------------------------------------------------------------ */
const serHoldOdds = (s) => clamp(0.4 + vioOf(s).help * 0.08 + vioOf(s).haunt / 400 - (serOf(s).urge - 70) / 200, 0.1, 0.85);
function serUrge(s) {
  const cost = price(s, 150);
  popup(s, {
    emoji: '🕯️', title: 'It is back', handler: 'serUrge', ctx: { cost },
    text: 'It has been building for weeks, and tonight it is louder than everything else. You know exactly what it wants. Nobody is making you.',
    choices: [
      { label: 'Hold on', value: 'hold', sub: `${Math.round(serHoldOdds(s) * 100)}%` },
      { label: 'Get help, tonight', value: 'help', sub: fmtMoney(cost), disabled: M(s).money < cost },
      { label: 'Give in', value: 'act', tone: 'bad' },
    ],
  });
}
onChoice('serUrge', (s, ctx, v) => {
  const r = serOf(s);
  if (v === 'help') {
    if (!pay(s, ctx.cost)) return cantAfford(ctx.cost);
    r.urge = Math.max(0, r.urge - 35); vioOf(s).help++; vioHaunt(s, -8);
    return { text: 'You called the number, and somebody answered at two in the morning, and stayed on the line until the worst of it passed.', tone: 'good' };
  }
  if (v === 'hold' && chance(serHoldOdds(s))) {
    r.urge = Math.max(0, r.urge - 30); r.held++;
    add(s, { karma: 2, happy: 2 });
    return { text: 'You held on. You sat on the kitchen floor until the sun came up, and it was still there in the morning, and so were you. That is one more night.', tone: 'good' };
  }
  if (v === 'hold') add(s, { happy: -3 });
  return serAct(s, v === 'hold' ? 'It was louder than you. ' : '');
});

/* ---- an act ------------------------------------------------------------------------------------------------------ */
function serAct(s, lead) {
  const r = serOf(s);
  const circle = relPeople(s, ['friend', 'coworker', 'neighbor', 'bestie']).filter((p) => ageOf(s, p) >= 20);
  popup(s, {
    emoji: '🌑', title: 'Who', handler: 'serWho', ctx: {},
    text: `${lead || ''}You could stop here. Whatever you choose, someone will pay for it. There is still a way not to.`.trim(),
    choices: [
      { label: 'A stranger passing through', value: 'far', sub: 'Fewer witnesses, and no ties to you' },
      { label: 'A stranger from the neighborhood', value: 'near' },
      ...(r.mo === 'circle' && circle.length ? [{ label: 'Someone who knows you', value: 'circle', tone: 'bad', sub: 'They will be missed by people you know' }] : []),
      { label: 'Not tonight', value: null, sub: 'Go home' },
    ],
  });
}
onChoice('serWho', (s, ctx, where) => {
  const r = serOf(s);
  if (!where) { r.urge = Math.max(0, r.urge - 8); add(s, { karma: 2 }); return { text: 'You sat in the car for an hour with the engine off. You did not. You drove home. It was close.', tone: 'good' }; }
  const mo = SER_MOS[r.mo || 'careful'], c0 = serCase(s), d = c0 && invDet(s, c0);
  const esc = Math.min(40, r.kills * 4); // each time you are a little less careful
  const odds = clamp(0.5 + skill(s, 'streetwise') / 300 + (trait(s, 'cunning') ? 0.1 : 0) + mo.odds + (where === 'far' ? 0.06 : where === 'circle' ? -0.12 : 0) - esc / 200 - (d ? d.det.obs / 300 : 0), 0.1, 0.85);
  if (!chance(odds) && chance(0.5)) { // it falls apart before it starts
    vioHaunt(s, 4); r.urge = Math.max(0, r.urge - 10);
    if (chance(0.4)) { const out = arrest(s, 'attempted_murder'); return { text: `It fell apart before it began, and someone saw enough. ${out.text}`, tone: 'bad' }; }
    return { text: 'It fell apart before it began. You got out with your heart pounding and nothing else. You are not sure whether to be relieved.', tone: 'bad' };
  }
  const close = !chance(odds);
  let p;
  if (where === 'circle') p = pick(relPeople(s, ['friend', 'coworker', 'neighbor', 'bestie']).filter((q) => ageOf(s, q) >= 20));
  if (!p) p = makeAdultNear(s, { minAge: 20, maxAge: 60 });
  if (!p) return;
  r.kills++; r.urge = 10; r.cool = randInt(1, 3) + mo.cool;
  tally(s, 'murders'); tally(s, 'serialActs');
  add(s, { karma: -40, happy: -8 });
  webUneaseAdd(s, 1.5);
  npcDies(s, p, 'suspicious circumstances', { murdered: true });
  webFact(s, 'killed', { pid: p.id, how: 'serial' }); // the case, the secret, and "what now" (72-violence.js)
  const c = invMine(s, (x) => x.crime === 'murder' && x.victim === p.id)[0];
  if (c) {
    invEvidence(s, c, { trace: mo.trace + (where === 'far' ? -6 : 0), wit: (where === 'far' ? -10 : where === 'circle' ? 10 : 0) + (close ? 25 : 0) });
    c.cover = (c.cover || 0) + (where === 'far' ? 10 : 0);
    const dd = invDet(s, c);
    if (dd) dd.det.obs = clamp100(dd.det.obs + 10);
  }
  if (close) serClose(s, c);
  return { text: close ? 'It is done, and it was not clean. Somebody may have seen something, and you know it.' : 'It is done. There is nothing about it that feels like you thought it would. There is only the quiet afterwards, and the long drive home.', tone: 'bad' };
});
// Somebody almost caught you in the act.
function serClose(s, c) {
  if (!c) return;
  popup(s, {
    emoji: '🚨', title: 'A close call', handler: 'serClose', ctx: { cid: c.id },
    text: 'A patrol car slows down beside you. Or a neighbor’s light comes on. Or somebody is standing at the end of the street, looking right at you. It could be nothing.',
    choices: [{ label: 'Talk your way through it', value: 'talk', sub: `${Math.round(clamp(0.35 + skill(s, 'charisma') / 250 + skill(s, 'acting') / 400, 0.1, 0.8) * 100)}%` }, { label: 'Disappear for a while', value: 'low' }, { label: 'Give yourself up', value: 'confess' }],
  });
}
onChoice('serClose', (s, ctx, v) => {
  const c = invOf(s).list[ctx.cid];
  if (v === 'confess') { vioOf(s).help++; vioHaunt(s, -15); const out = arrest(s, 'murder'); return { text: `You stopped and told them. ${out.text}`, tone: 'bad' }; }
  if (!c || c.status !== 'open') return 'It came to nothing, this time.';
  if (v === 'low') { c.lay = true; add(s, { happy: -3 }); return 'You stayed home for a month and ate nothing you could taste. It blew over. It will not blow over every time.'; }
  if (chance(clamp(0.35 + skill(s, 'charisma') / 250 + skill(s, 'acting') / 400, 0.1, 0.8))) { c.prog = clamp(c.prog - 10, 0, 100); return { text: 'You were friendly, and boring, and exactly what you looked like. They waved you on.', tone: 'bad' }; }
  c.prog = clamp(c.prog + 20, 0, 100);
  invEvidence(s, c, { wit: 10 });
  return { text: 'They took your name. They took a long look at your face.', tone: 'bad' };
});

/* ---- ways out -------------------------------------------------------------------------------------------------------- */
defAction({
  id: 'ser_act', cat: 'crime', label: 'Give in to it', emoji: '🌑', tags: VIO_TAGS,
  desc: 'You know what it wants. You also know you do not have to.',
  when: (s) => free(s) && A(s) >= 18 && serOf(s).on && serOf(s).urge >= 40 && !inPrison(s),
  sub: (s) => serWord(serOf(s).urge),
  run: (s) => { serAct(s, ''); },
});
defAction({
  id: 'ser_help', cat: 'health', label: 'Get help with it', emoji: '📞', tags: VIO_TAGS,
  desc: 'A number you can call. Somebody who will answer.',
  when: (s) => free(s) && serOf(s).on && !inPrison(s),
  sub: (s) => `${serWord(serOf(s).urge)} · ${fmtMoney(price(s, 150))}`,
  run: (s) => {
    const cost = price(s, 150);
    if (bump(s, 'serhelp') > 2) return { text: 'You have done enough this year. Keep calling next year, and the year after.', nolog: true };
    if (!pay(s, cost)) return cantAfford(cost);
    const r = serOf(s);
    r.urge = Math.max(0, r.urge - 30); vioOf(s).help++; vioHaunt(s, -8);
    return { text: 'You said it out loud to somebody who is trained to hear it. It did not go away, and it got a little quieter.', tone: 'good' };
  },
});
defAction({
  id: 'ser_stop', cat: 'health', label: 'Stop, for good', emoji: '🚪', tags: VIO_TAGS,
  desc: 'It will not undo anything. It is the only thing left that you can do.',
  when: (s) => free(s) && serOf(s).on && !inPrison(s),
  run: (s) => {
    popup(s, { emoji: '🚪', title: 'Stop, for good', text: 'You will not hurt anybody again. It will not be easy, and it will not undo any of it. You can still change who you are from here.', handler: 'serStop',
      choices: [{ label: 'I am done', value: true }, { label: 'Not yet', value: null }] });
  },
});
onChoice('serStop', (s, ctx, v) => {
  if (!v) return;
  const r = serOf(s);
  r.on = false; r.stopped = true; r.urge = 0;
  add(s, { karma: 4, happy: 2 });
  vioOf(s).help++;
  return { text: 'You made it a rule, and then you made it a habit, and then, a long time later, you made it who you are. The case files stay open. The nights are quieter.', tone: 'good' };
});

/* ---- what comes after ----------------------------------------------------------------------------------------------------- */
EV('ser_fan_mail', {
  ages: [18, 120], prison: true, w: 1.4, emoji: '✉️', title: 'Letters', tags: VIO_TAGS, cooldown: 2,
  when: (s) => serOf(s).kills >= 3,
  text: 'A mailbag, forwarded by the prison. Some of the letters are from people who want to tell you what you took from them. Some are from people who want to tell you they understand. You are not sure which is worse.',
  choices: [
    ['Read them all', (s) => { add(s, { happy: -3, fame: 1 }); vioHaunt(s, 3); return { text: 'You read every one. You read the first kind twice. They are right, and none of them is wrong.', tone: 'bad' }; }],
    ['Write back to one of the admirers', (s) => { add(s, { fame: 3, karma: -3 }); webRepAdd(P(s), { scandal: 3, name: -2 }); for (const f of relPeople(s, ['parent', 'sibling', 'child'])) addRel(s, f.id, -3); return { text: 'You wrote four pages, and by the time it was sent you wished you had not. Your family heard about it from the news.', tone: 'bad' }; }],
    ['Write to one of the others', (s) => { add(s, { karma: 5, happy: -2 }); vioHaunt(s, -6); return { text: 'You wrote one letter, to one person, saying only that you were sorry and that you knew it was not enough. You did not ask for a reply.', tone: 'good' }; }],
    ['Burn them unread', (s) => { add(s, { karma: 1 }); return 'You gave the bag back to the guard, and watched him put it in the incinerator. It did not make the letters stop.'; }],
  ],
});
defAction({
  id: 'ser_memoir', cat: 'prison', label: 'Write your story', emoji: '📖', tags: VIO_TAGS,
  desc: 'A publisher has written. They would like it in your own words.',
  when: (s) => !s.dead && inPrison(s) && serOf(s).kills >= 3 && !serOf(s).memoir && A(s) >= 18,
  run: (s) => {
    popup(s, {
      emoji: '📖', title: 'Your story', text: 'A small publisher wants a book. The families will read it. Everyone will.', handler: 'serMemoir',
      choices: [{ label: 'Tell the truth, all of it', value: 'truth', sub: 'No excuses' }, { label: 'Tell it your way', value: 'spin', tone: 'bad', sub: 'More money, and more pain' }, { label: 'Say no', value: null }],
    });
  },
});
onChoice('serMemoir', (s, ctx, v) => {
  if (!v) return;
  serOf(s).memoir = true;
  if (v === 'truth') {
    add(s, { fame: 6, karma: 4, money: price(s, 15000) }); vioHaunt(s, -10); webRepAdd(P(s), { scandal: 5, name: 3 });
    return { text: 'It took two years, and it was the hardest thing you have written. The families wrote to say they would never read it. Some of them did. A few said it helped.', tone: 'good' };
  }
  add(s, { fame: 10, karma: -4, money: price(s, 40000) }); webRepAdd(P(s), { scandal: 8, name: -3 });
  for (const f of relPeople(s, ['parent', 'sibling', 'child'])) addRel(s, f.id, -8);
  return { text: 'It sold well. The families said the book was an insult. They were right. You have never felt more famous, or more empty.', tone: 'bad' };
});

/* ---- how it is remembered ------------------------------------------------------------------------------------------------------ */
const serCaught = (s) => LC(s, 'serialActs') >= 3 && (!!M(s).prison || M(s).record.some((r) => r.crime === 'murder'));
LEGACY_TITLES.splice(LEGACY_TITLES.findIndex((t) => t.id === 'villain'), 0,
  { id: 'notorious', name: 'Notorious', emoji: '🕯️', check: (s) => serCaught(s) },
  { id: 'never_caught', name: 'Never Caught', emoji: '🌫️', check: (s) => LC(s, 'serialActs') >= 3 && !serCaught(s) });
