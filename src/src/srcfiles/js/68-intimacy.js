/* =====================================================================
 * 68-intimacy.js — love lives with texture. Behind the Mature and
 * Intimacy switches (CONTENT_TAGS in 12-flow.js, both off by default),
 * hooking up is a night with choices instead of one line; relationships
 * have a spark that needs tending; friends with benefits are a thing you
 * can ask for and a thing that can change; protection, tests and the
 * worries that follow are real.
 *
 * Rules that hold everywhere in this file: 18+ both people, always;
 * consensual, with a way out at every step ("Not tonight", "I changed my
 * mind"); and fade-to-black. The scenes say what it was like, never what
 * happened. Language is the dial's business (67-language.js), not this file's.
 *
 * M(s).intim = { n, yrs: [years], bc, tested, scares }
 *   n       people, in all, in the nights this system ran
 *   yrs     the years of those nights (only the last three count toward a reputation)
 *   bc      you are on contraception (it costs a little every year)
 *   tested  the last year you got tested
 * A relationship record (M(s).rels[pid]) can carry:
 *   chem    0-100, how well you two fit (made the first time it matters)
 *   spark   0-100, the heat in an ongoing relationship (partner, spouse, fiance, fwb)
 *   feel    0-100, how far a friend with benefits has fallen
 * ===================================================================== */

const INT_TAGS = ['mature', 'mature_intimacy'];
const intimOn = () => tagsOn(INT_TAGS);
function intimOf(s) { const m = M(s); return m.intim || (m.intim = { n: 0, yrs: [], bc: false, tested: 0, scares: 0 }); }

Object.assign(KIN_LABELS, { fwb: ['Friend with benefits', 'Friend with benefits', 'Friend with benefits'] });
REL_GROUPS.find((g) => g.id === 'friends').kinds.push('fwb');
Object.assign(REL_DECAY, { fwb: 3 });
Object.assign(WEB_TIE_KIND, { fwb: 'friend' });

/* ---- chemistry and spark ----------------------------------------------------- */
function intimRoll(s, c) {
  return clamp100(Math.round(35 + (c.looks - 50) * 0.3 + (P(s).stats.looks - 50) * 0.15 + (trait(s, 'charming') ? 8 : 0) + randInt(-22, 22)));
}
function intimChem(s, pid) {
  const r = relOf(s, pid), p = s.people[pid];
  if (!r || !p) return 50;
  if (r.chem == null) r.chem = clamp100(Math.round(35 + (p.stats.looks - 50) * 0.3 + (P(s).stats.looks - 50) * 0.15 + (trait(s, 'charming') ? 8 : 0) + (hasTrait(p, 'romantic') ? 5 : 0) + randInt(-22, 22)));
  return r.chem;
}
const SPARK_WORDS = [[0, 'Cold'], [25, 'Cooling'], [45, 'Warm'], [65, 'Hot'], [85, 'Electric']];
function sparkWord(v) { let w = SPARK_WORDS[0][1]; for (const [min, word] of SPARK_WORDS) if (v >= min) w = word; return w; }
function intimSpark(s, pid) { const r = relOf(s, pid); return r ? r.spark ?? 55 : 0; }
function intimBump(s, pid, d) { const r = relOf(s, pid); if (r) r.spark = clamp100((r.spark ?? 55) + d); }
// A run of nights makes a name. It costs a little with people who want something steady.
function intimRep(s) { const n = intimOf(s).yrs.length; return n >= 5 ? 'Known around town' : n >= 3 ? 'Adventurous' : ''; }
function intimDateEdge(s) { return intimOn() && intimOf(s).yrs.length >= 5 ? -0.08 : 0; } // read by askOutOdds (18-relationships.js)

/* ---- a night ------------------------------------------------------------------- */
const INT_SETTINGS = [
  'A friend’s party. Someone across the room has been looking at you for twenty minutes.',
  'A late night at a bar. The conversation has run a lot longer than either of you planned.',
  'A rooftop party, a good playlist, and someone who laughs at all your jokes.',
  'A first date that went better than expected. Neither of you is in a hurry to say goodnight.',
  'A wedding afterparty. Everyone else is dancing, and the two of you are talking in a corner.',
];
function intimStart(s, o) {
  o = o || {};
  const c = o.c || null, p = o.pid ? s.people[o.pid] : null;
  if (A(s) < 18 || !free(s) || (!c && !p)) return { text: 'Not now.', nolog: true };
  if ((p && ageOf(s, p) < 18) || (c && c.age < 18)) return { text: 'No.', nolog: true };
  const rom = romanticId(s), cheating = !!(rom && !openWith(s, rom) && (!p || p.id !== rom));
  const first = c ? c.first : p.first;
  const chem = c ? (c.chem == null ? (c.chem = intimRoll(s, c)) : c.chem) : intimChem(s, p.id);
  const ctx = { c, pid: p ? p.id : null, first, chem, cheating, rom: cheating ? rom : null, clarity: 0 };
  if (o.skipTalk) { ctx.clarity = 2; intimProtect(s, ctx); return; }
  const where = p ? `${first} is at your door, and you are both pretending it is for a good reason.` : pick(INT_SETTINGS);
  popup(s, {
    emoji: '🌙', title: first, person: p ? p.id : null, handler: 'inScene', ctx,
    text: `${where}${cheating ? ` You have ${nm(s, rom)} at home. This is a choice, and it is yours.` : ''}`,
    choices: [{ label: 'Talk first, and see where it goes', value: 'talk' }, { label: 'Say plainly what you are hoping for', value: 'direct' }, { label: 'Go with the flow', value: 'flow' }, { label: 'Not tonight', value: 'no' }],
  });
}
onChoice('inScene', (s, ctx, v) => {
  if (!v || v === 'no') return { text: `You said goodnight. There is nothing wrong with that.${ctx.cheating ? ' It was the harder choice, and the right one.' : ''}`, tone: 'good' };
  const clarity = { talk: 1, direct: 2, flow: 0 }[v] ?? 0;
  if (!chance(clamp(0.3 + ctx.chem / 130 + clarity * 0.06 + skill(s, 'charisma') / 500 - (ctx.cheating ? 0.05 : 0), 0.1, 0.92))) {
    add(s, { happy: -1 });
    return `${ctx.first} smiled, said it had been a really nice night, and meant it. That was all. ${pick(['It was a perfectly good ending.', 'You were both grown-ups about it.'])}`;
  }
  intimProtect(s, Object.assign({}, ctx, { clarity }));
});
function intimProtect(s, ctx) {
  const choices = [{ label: 'Use protection', value: 'protect' }];
  if (ctx.clarity >= 1) choices.push({ label: 'Ask when you were both last tested', value: 'test', sub: 'Honest, and unromantic' });
  choices.push({ label: 'Skip it', value: 'skip', tone: 'bad', sub: 'Risky for both of you' }, { label: 'Actually, you have changed your mind', value: 'stop' });
  popup(s, { emoji: '🌙', title: ctx.first, person: ctx.pid, handler: 'inProtect', ctx, text: 'Things are heading somewhere, and you both want them to. Before they do:', choices });
}
onChoice('inProtect', (s, ctx, v) => {
  if (!v || v === 'stop') { add(s, { karma: 1 }); return { text: `You said you had changed your mind. ${ctx.first} said "okay," right away, and meant it. That is exactly how it should go.`, tone: 'good' }; }
  let mode = v;
  if (v === 'test') mode = chance(ctx.clarity >= 2 ? 0.9 : 0.75) ? 'test' : 'protect';
  return intimNight(s, ctx, mode);
});
const INT_TIERS = {
  electric: ['The rest of the night belonged to the two of you. By the time you looked at the clock, it was nearly morning.', 'It was the kind of night that makes you check your phone the next day, just in case. {~Wow.|Holy hell.|Holy shit.}', 'You will not be able to explain this one to your friends, and you will try.'],
  good: ['It was warm, a little funny, and exactly what you both wanted.', 'It was easy and unhurried. You fell asleep to the sound of their breathing.', 'It was good. Not a movie, a real night, which is better.'],
  awkward: ['It was fine. There was a lot of laughter in the wrong places, and a moment where neither of you knew where to put your hands.', 'It did not quite click. You were both polite about it, which somehow made it worse.', 'It was a little clumsy, and very human, and you will remember it for the wrong reasons.'],
};
function intimNight(s, ctx, mode) {
  const im = intimOf(s);
  const quality = clamp100(ctx.chem + ctx.clarity * 8 + (mode === 'skip' ? 0 : 4) + randInt(-12, 12));
  const tier = quality >= 75 ? 'electric' : quality >= 50 ? 'good' : 'awkward';
  // The person from the night.
  let p = ctx.pid ? s.people[ctx.pid] : null;
  if (!p) p = makeFling(s, ctx.c); // 47-romance.js
  const r = relOf(s, p.id) || setRel(s, p.id, 'fling', 50);
  r.chem = ctx.chem;
  r.spark = clamp100((r.spark ?? 50) + (tier === 'electric' ? 20 : tier === 'good' ? 10 : 2));
  if (ctx.cheating) webFact(s, 'fling_cheat', { pid: p.id, rom: ctx.rom }); // 62-web.js
  im.n++; im.yrs.push(s.year);
  if (im.first == null) im.first = A(s);
  tally(s, 'hookups');
  add(s, { happy: tier === 'electric' ? 8 : tier === 'good' ? 5 : 1 });
  let out = vary(pick(INT_TIERS[tier]));
  if (mode === 'skip') out += ' You both knew you probably should have talked about it first.';
  if (mode === 'test') out += ' It was an odd conversation to have, and it made everything easier.';
  // What can follow.
  const odds = mode === 'skip' ? 0.14 : mode === 'test' ? 0.006 : 0.02;
  if (chance(odds)) {
    const id = pick(STIS);
    if (getSick(s, id)) { const d = M(s).diseases.find((x) => x.id === id); if (d) d.known = false; } // it does not announce itself
  }
  let preg = false;
  if (!M(s).pregnancy && canConceive(P(s), p)) {
    const f = fertility(P(s).gender === 'f' ? A(s) : ageOf(s, p));
    if (f > 0 && chance((mode === 'skip' ? 0.08 : 0.012) * (im.bc ? 0.25 : 1) * f / 0.45)) {
      relOf(s, p.id).kid = true;
      M(s).pregnancy = { partnerId: p.id, carrier: P(s).gender === 'f' ? 'me' : 'partner', year: s.year };
      preg = true;
      out += P(s).gender === 'f' ? ' A few weeks later, you are pregnant.' : ` A few weeks later, ${p.first} calls to tell you they are pregnant.`;
    }
    if (!preg && mode === 'skip' && chance(0.3)) {
      im.scares++;
      popup(s, { emoji: '😰', title: 'A very long two weeks', handler: 'inScare', ctx: { pid: p.id }, text: `Two weeks later, there is a worry sitting in the back of your mind, and it is about ${p.first}.`, choices: [{ label: 'Take a test', sub: fmtMoney(price(s, 15)), value: 'test' }, { label: 'Wait and hope', value: null }] });
    }
  }
  // The morning after.
  const nm1 = p.first;
  popup(s, {
    emoji: '☀️', title: 'The morning after', person: p.id, handler: 'inMorning', ctx: { pid: p.id, quality, cheating: ctx.cheating },
    text: `${nm1} is already awake, looking at you like someone deciding what to say.`,
    choices: [{ label: 'Stay for breakfast', value: 'stay' }, { label: 'Say you would like to see them again', value: 'again' }, { label: 'Say it was a one-time thing, kindly', value: 'once' }, { label: 'Slip out quietly', value: 'slip', tone: 'bad' }],
  });
  return { text: out, title: 'The night', emoji: '🌙', tone: tier === 'awkward' || mode === 'skip' ? '' : 'good' };
}
onChoice('inMorning', (s, ctx, v) => {
  const p = s.people[ctx.pid], r = relOf(s, ctx.pid);
  if (!p || !r) return;
  if (v === 'stay') { addRel(s, p.id, 6); intimBump(s, p.id, 4); return `You stayed for breakfast. ${p.first} burned the toast, and neither of you cared.`; }
  if (v === 'again') {
    if (chance(clamp(0.45 + ctx.quality / 200, 0.3, 0.9))) { addRel(s, p.id, 10); intimBump(s, p.id, 6); return { text: `${p.first} smiled. "I would like that." Neither of you looked at your phone.`, tone: 'good' }; }
    addRel(s, p.id, -3);
    return `${p.first} said, kindly, that they were not looking for anything. It stung for about a day.`;
  }
  if (v === 'once') { addRel(s, p.id, 3); add(s, { karma: 1 }); return `You said it was lovely, and that it was a one-time thing. ${p.first} said that was fine, and seemed to mean it. Clear is kind.`; }
  addRel(s, p.id, -10);
  add(s, { karma: -2 });
  return { text: `You left before ${p.first} woke up, with a note that said nothing. They noticed.`, tone: 'bad' };
});
onChoice('inScare', (s, ctx, v) => {
  if (!v) { add(s, { happy: -3 }); return 'You waited and worried. A week later, it passed, and you did not talk about it.'; }
  const cost = price(s, 15);
  if (!pay(s, cost)) return cantAfford(cost);
  add(s, { happy: 2 });
  return { text: 'Negative. You breathed for the first time in two weeks, and promised yourself you would not do that again.', tone: 'good' };
});

/* ---- the hookup and old flings hand over to the scene when it is switched on ------ */
// (18-relationships.js and 47-romance.js call intimOn() and intimStart().)

/* ---- looking after each other -------------------------------------------------------- */
const intimPartner = (s, pid) => reachable(s, pid) && A(s) >= 18 && tAge(s, pid) >= 18 && ['partner', 'fiance', 'spouse'].includes(relKind(s, pid));
function intimAct(id, label, emoji, desc, usd, f, opts) {
  defAction({
    id, cat: 'person', group: 'romance', target: 'person', label, emoji, desc, tags: INT_TAGS,
    when: (s, pid) => intimPartner(s, pid) && !count(s, id + '_' + pid) && (!opts || !opts.when || opts.when(s, pid)),
    sub: (s) => (usd ? fmtMoney(price(s, usd)) : ''),
    run: (s, pid) => {
      const cost = usd ? price(s, usd) : 0;
      if (cost && !pay(s, cost)) return cantAfford(cost);
      bump(s, id + '_' + pid);
      return f(s, pid);
    },
  });
}
intimAct('in_night_in', 'Plan a night in', '🕯️', 'Candles, a good meal, and no phones.', 40, (s, pid) => {
  intimBump(s, pid, randInt(8, 14)); addRel(s, pid, 3); add(s, { happy: 3 });
  return `You and ${nm(s, pid)} cooked together, ignored your phones, and went to bed early. ${pick(['It was exactly what you needed.', 'It felt like the first year.'])}`;
});
intimAct('in_getaway', 'Take a weekend away', '🧳', 'Somewhere with a view and nothing to do.', 900, (s, pid) => {
  intimBump(s, pid, randInt(14, 22)); addRel(s, pid, 6); add(s, { happy: 6 });
  return `You and ${nm(s, pid)} left town for the weekend. You remembered what you liked about each other.`;
});
intimAct('in_talk_wants', 'Talk about what you both want', '🗣️', 'Honestly, and out loud.', 0, (s, pid) => {
  const p = tgt(s, pid);
  if (chance(clamp(0.55 + skill(s, 'charisma') / 300 + (hasTrait(p, 'anxious') ? -0.1 : 0), 0.3, 0.9))) { intimBump(s, pid, 8); addRel(s, pid, 5); return { text: `You talked for two hours, with no phones, about what each of you wants. ${p.first} said a few things you did not know. So did you.`, tone: 'good' }; }
  addRel(s, pid, 1);
  return `You tried. It came out clumsier than you wanted, and ${p.first} was shy. It was a start.`;
});
intimAct('in_try_new', 'Try something new together', '✨', 'Whatever the two of you decide.', 0, (s, pid) => {
  const p = tgt(s, pid), o = clamp(0.4 + (trait(s, 'adventurous') ? 0.15 : 0) + (hasTrait(p, 'adventurous') ? 0.15 : 0) + intimSpark(s, pid) / 300, 0.2, 0.85);
  if (chance(o)) { intimBump(s, pid, 15); addRel(s, pid, 4); add(s, { happy: 4 }); return { text: `You tried something new, together, and agreed on it first. ${p.first} laughed more than either of you expected.`, tone: 'good' }; }
  intimBump(s, pid, 3);
  return `It was a bit of a flop, and you both laughed about it afterward, which counts for a lot.`;
});
intimAct('in_counsel', 'See a couples counselor', '🛋️', 'For when the spark has gone quiet.', 150, (s, pid) => {
  const p = tgt(s, pid), r = relOf(s, pid);
  if (chance(clamp(0.45 + r.rel / 200, 0.3, 0.85))) { intimBump(s, pid, 12); addRel(s, pid, 8); return { text: `The counselor asked three questions you had both been avoiding. ${p.first} cried a little, and so did you. It helped.`, tone: 'good' }; }
  addRel(s, pid, 1);
  return 'It was a polite hour with a box of tissues. You did not say what you meant. Maybe next time.';
}, { when: (s, pid) => intimSpark(s, pid) < 45 || relOf(s, pid).rel < 50 });

/* ---- friends with benefits ------------------------------------------------------------- */
const intimSolo = (s) => !romanticId(s) || openWith(s, romanticId(s));
defAction({
  id: 'in_fwb_ask', cat: 'person', group: 'romance', target: 'person', label: 'Suggest friends with benefits', emoji: '🤝', desc: 'Clear, kind and no strings. If they want it.', tags: INT_TAGS,
  when: (s, pid) => {
    if (!reachable(s, pid) || A(s) < 18 || tAge(s, pid) < 18 || !['friend', 'bestie', 'ex', 'exspouse', 'fling'].includes(relKind(s, pid))) return false;
    const p = tgt(s, pid);
    return !p.partner && intimSolo(s) && attractedTo(P(s), p) && attractedTo(p, P(s)) && !count(s, 'fwbask_' + pid) && !(relOf(s, pid).taboo);
  },
  sub: (s, pid) => `Spark ${sparkWord(Math.round(intimChem(s, pid)))}`,
  run: (s, pid) => {
    bump(s, 'fwbask_' + pid);
    const p = tgt(s, pid), r = relOf(s, pid);
    const odds = clamp(0.2 + intimChem(s, pid) / 250 + r.rel / 220 + (hasTrait(p, 'adventurous') ? 0.12 : 0) + (trait(s, 'charming') ? 0.06 : 0) - (hasTrait(p, 'romantic') ? 0.12 : 0), 0.05, 0.8);
    if (chance(odds)) {
      setRel(s, pid, 'fwb', Math.max(r.rel, 55));
      Object.assign(relOf(s, pid), { feel: 8, spark: 60 });
      return { text: `${p.first} thought about it, laughed, and said yes, with ground rules: be honest, be safe, and tell each other the minute either of you wants something else.`, tone: 'good' };
    }
    addRel(s, pid, -5);
    return `${p.first} laughed, and said they liked things the way they were. It was a little awkward for a week.`;
  },
});
defAction({
  id: 'in_fwb_night', cat: 'person', group: 'romance', target: 'person', label: 'Spend the night', emoji: '🌙', desc: 'You both know how this works.', tags: INT_TAGS,
  when: (s, pid) => reachable(s, pid) && A(s) >= 18 && tAge(s, pid) >= 18 && relKind(s, pid) === 'fwb' && count(s, 'fwbn_' + pid) < 2 && !s.pending.length,
  run: (s, pid) => { bump(s, 'fwbn_' + pid); intimStart(s, { pid, skipTalk: true }); },
});
defAction({
  id: 'in_fwb_define', cat: 'person', group: 'romance', target: 'person', label: 'Say what this is', emoji: '💬', desc: 'Make it official, or let it end well.', tags: INT_TAGS,
  when: (s, pid) => reachable(s, pid) && A(s) >= 18 && tAge(s, pid) >= 18 && relKind(s, pid) === 'fwb',
  run: (s, pid) => {
    const p = tgt(s, pid), r = relOf(s, pid);
    popup(s, { emoji: '💬', title: p.first, person: pid, handler: 'inDefine', ctx: { pid }, text: `You and ${p.first} have been seeing each other for a while. What do you want to say?`, choices: [{ label: 'Ask if they want to date', value: 'date', sub: r.feel >= 35 ? 'They might' : 'They have not said anything' }, { label: 'End it, kindly', value: 'end' }, { label: 'Never mind', value: null }] });
  },
});
onChoice('inDefine', (s, ctx, v) => {
  const p = s.people[ctx.pid], r = relOf(s, ctx.pid);
  if (!v || !p || !r || r.kind !== 'fwb') return;
  if (v === 'end') { r.kind = 'friend'; addRel(s, ctx.pid, -2); add(s, { karma: 1 }); return `You told ${p.first} you thought it was time to go back to being friends. They said they had been wondering the same thing, and you both meant it.`; }
  if (chance(clamp(0.2 + r.feel / 120 + r.rel / 300, 0.1, 0.85))) return startRomance(s, ctx.pid);
  r.kind = 'friend';
  addRel(s, ctx.pid, -6);
  return { text: `${p.first} said they were not looking for that, and that maybe it was time to stop. You are friends again, mostly.`, tone: 'bad' };
});
function fwbYear(s) {
  for (const p of relPeople(s, ['fwb'])) {
    const r = relOf(s, p.id);
    if (!intimSolo(s)) { r.kind = 'friend'; log(s, `🤝 You and ${p.first} stopped seeing each other that way when you got serious with someone else.`); continue; }
    if (p.partner && p.partner !== s.playerId) { r.kind = 'friend'; log(s, `🤝 ${p.first} started seeing someone, and the arrangement ended, kindly.`); continue; }
    r.feel = clamp100((r.feel || 8) + randInt(2, 9) + (intimChem(s, p.id) > 70 ? 4 : 0) - (hasTrait(p, 'loner') ? 3 : 0));
    r.spark = clamp100((r.spark ?? 60) - 4);
    if (r.feel >= 55 && !s.pending.some((x) => x.handler === 'inFeelings') && chance(0.5)) {
      popup(s, {
        emoji: '💬', title: `${p.first} has something to say`, person: p.id, handler: 'inFeelings', ctx: { pid: p.id },
        text: `${p.first} has been quiet all evening. Then: "I think I have started to feel something. I wanted you to hear it from me."`,
        choices: [{ label: 'Say you feel it too, and try dating', value: 'date' }, { label: 'Be honest: you are not looking for more', value: 'honest' }, { label: 'Pull back quietly', value: 'pull', tone: 'bad' }],
      });
    }
  }
}
onChoice('inFeelings', (s, ctx, v) => {
  const p = s.people[ctx.pid], r = relOf(s, ctx.pid);
  if (!p || !r || r.kind !== 'fwb') return { text: 'The moment passed.', quiet: true, nolog: true };
  if (v === 'date') return startRomance(s, ctx.pid);
  if (v === 'honest') { r.kind = 'friend'; addRel(s, ctx.pid, -4); add(s, { karma: 2 }); return `You told ${p.first} the truth, gently, and thanked them for telling you. It hurt both of you a little. It was still the right thing.`; }
  r.kind = 'friend'; addRel(s, ctx.pid, -14); add(s, { karma: -2 });
  return { text: `You stopped answering as quickly, and then stopped answering. ${p.first} got the message. It was not a kind way to give it.`, tone: 'bad' };
});

/* ---- care for your body --------------------------------------------------------------------- */
defAction({
  id: 'in_test', cat: 'health', label: 'Get tested', emoji: '🧪', desc: 'A quick, confidential sexual-health screening.', tags: INT_TAGS,
  when: (s) => free(s) && A(s) >= 18 && !count(s, 'intest'),
  sub: (s) => medLabel(s, { cost: 60 }),
  run: (s) => {
    const cost = medBill(s, { cost: 60 });
    if (!pay(s, cost)) return cantAfford(cost);
    bump(s, 'intest');
    intimOf(s).tested = s.year;
    const hidden = M(s).diseases.filter((d) => !d.known && DISEASES[d.id].sti);
    for (const d of hidden) if (chance(0.97)) d.known = true;
    const found = hidden.filter((d) => d.known);
    add(s, { happy: 1 });
    if (found.length) return { text: `The screening came back with something: ${listJoin(found.map((d) => DISEASES[d.id].name.toLowerCase()))}. It is treatable, and you found it early. You have a hard call to make.`, tone: 'bad' };
    return { text: 'The screening came back clean. It is a very small piece of paper that makes you feel very large.', tone: 'good' };
  },
});
defAction({
  id: 'in_bc_on', cat: 'health', label: 'Start contraception', emoji: '💊', desc: 'Lowers the chance of a pregnancy. A little each year.', tags: INT_TAGS,
  when: (s) => free(s) && A(s) >= 18 && !intimOf(s).bc,
  sub: (s) => `${fmtMoney(price(s, 250))} a year`,
  run: (s) => { const cost = price(s, 250); if (!pay(s, cost)) return cantAfford(cost); intimOf(s).bc = true; return 'You started contraception. It is one less thing to worry about.'; },
});
defAction({
  id: 'in_bc_off', cat: 'health', label: 'Stop contraception', emoji: '💊', desc: 'You are trying, or you are done.', tags: INT_TAGS,
  when: (s) => free(s) && A(s) >= 18 && intimOf(s).bc,
  run: (s) => { intimOf(s).bc = false; return 'You stopped contraception.'; },
});

/* ---- the year --------------------------------------------------------------------------------- */
function intimTick(s) {
  if (A(s) < 18 || s.dead) return;
  const im = intimOf(s);
  im.yrs = im.yrs.filter((y) => s.year - y <= 3);
  // A silent infection announces itself, eventually.
  for (const d of M(s).diseases) if (!d.known && DISEASES[d.id].sti && s.year - d.since >= 1 && chance(0.4)) { d.known = true; log(s, `🦠 You noticed symptoms, and a doctor named it: ${DISEASES[d.id].name.toLowerCase()}.`, 'bad'); }
  if (!intimOn()) return;
  if (im.bc) { const c = price(s, 250); if (M(s).money >= c) M(s).money -= c; else { im.bc = false; log(s, '💊 You could not afford your contraception this year, and it lapsed.', 'bad'); } }
  const rom = romanticId(s), r = rom && relOf(s, rom);
  if (r) {
    r.spark = clamp100((r.spark ?? 60) - 3 - Math.min(3, dependents(s).length) - (A(s) > 55 ? 1 : 0) + (r.rel > 75 ? 1 : 0));
    if (r.spark < 25) addRel(s, rom, -3);
    else if (r.spark > 75) addRel(s, rom, 1);
  }
  if (im.yrs.length >= 5) webRepAdd(P(s), { name: -1 });
  fwbYear(s);
}

/* ---- events ------------------------------------------------------------------------------------- */
const intimSparkLow = (s) => { const r = romanticId(s); return !!r && intimSpark(s, r) < 35; };
EV('in_ex_text', {
  ages: [20, 70], emoji: '📱', title: 'A text at 1 a.m.', tags: INT_TAGS, cooldown: 3,
  when: (s) => free(s) && relPeople(s, ['ex', 'exspouse']).some((p) => ageOf(s, p) >= 20 && relOf(s, p.id).rel >= 15),
  ctx: (s) => ({ pid: pick(relPeople(s, ['ex', 'exspouse']).filter((p) => ageOf(s, p) >= 20 && relOf(s, p.id).rel >= 15)).id }),
  text: (s, c) => `Your phone lights up at 1 a.m. It is ${nm(s, c.pid)}. "Hey. I know it is late. I was just thinking about you."`,
  choices: [
    ['Ignore it', (s) => { if (romanticId(s)) add(s, { karma: 1 }); return 'You put the phone face down. It buzzed once more, and then it was quiet.'; }],
    ['Reply, civilly', (s, c) => { addRel(s, c.pid, 3); return `You wrote back something friendly and short. ${nm(s, c.pid)} sent a smiley face. That was all.`; }],
    ['Meet for a drink', (s, c) => { intimStart(s, { pid: c.pid }); return `You told yourself it was only a drink.`; }],
  ],
});
EV('in_coworker_spark', {
  ages: [21, 60], emoji: '💼', title: 'A spark at work', tags: INT_TAGS, cooldown: 4,
  when: (s) => !!M(s).career && free(s) && relPeople(s, ['coworker']).some((p) => ageOf(s, p) >= 21 && !p.partner && attractedTo(P(s), p) && attractedTo(p, P(s))),
  ctx: (s) => ({ pid: pick(relPeople(s, ['coworker']).filter((p) => ageOf(s, p) >= 21 && !p.partner && attractedTo(P(s), p) && attractedTo(p, P(s)))).id }),
  text: (s, c) => `${nm(s, c.pid)} has been lingering by your desk lately, and laughing at things that are not funny. You are pretty sure you are not imagining it.${romanticId(s) && !openWith(s, romanticId(s)) ? ` You have ${nm(s, romanticId(s))} at home.` : ''}`,
  choices: [
    ['Keep it professional', (s) => { add(s, { karma: 1 }); return 'You kept the door closed, politely. It was a little sad, and a little proud.'; }],
    { label: 'Ask them out', when: (s) => intimSolo(s), fx: (s, c) => { const p = tgt(s, c.pid); if (chance(askOutOdds(s, p))) return startRomance(s, c.pid); addRel(s, c.pid, -4); return `${p.first} said, kindly, that they did not mix work and anything else. Now you both have to see each other every day.`; } },
    { label: 'Flirt back, harmlessly', when: (s) => !intimSolo(s), fx: (s, c) => { add(s, { happy: 2 }); if (chance(0.2)) { addRel(s, romanticId(s), -6); return { text: 'It was harmless, mostly. Somebody in the office mentioned it to your partner, with an eyebrow.', tone: 'bad' }; } return 'It was harmless, mostly. You noticed that you noticed.'; } },
  ],
});
EV('in_app_match', {
  ages: [18, 55], emoji: '📲', title: 'A very good match', tags: INT_TAGS, cooldown: 3,
  when: (s) => free(s) && intimSolo(s),
  ctx: (s) => { const c = makeDateCandidate(s); return { c }; },
  text: (s, c) => `A dating app shows you ${c.c.first}, ${c.c.age}: ${c.c.job && c.c.job.id ? JOBS[c.c.job.id].name.toLowerCase() : 'between jobs'}, a good laugh, and a photo that is not trying too hard. You both swiped right.`,
  choices: [
    ['Go on the date', (s, c) => { intimStart(s, { c: c.c }); return `The date was better than either of you expected.`; }],
    ['Keep it slow: just coffee', (s, c) => { const p = makeFling(s, c.c); setRel(s, p.id, 'friend', 55); return `You met for coffee, and talked for three hours. You have a new friend, with possibilities.`; }],
    ['Swipe left', () => 'You swiped left, and then right, and then left. You have got to stop doing that.'],
  ],
});
EV('in_photo', {
  ages: [18, 50], emoji: '📸', title: 'Tagged', tags: INT_TAGS, cooldown: 4,
  when: (s) => free(s) && intimSolo(s) && !!pickRel(s, ['friend', 'coworker']),
  ctx: (s) => someone(s, ['friend', 'coworker']),
  text: (s, c) => `${nm(s, c.pid)} tagged you in a photo from last night: you, a bar, and someone very close to your face. It is already in a group chat.`,
  choices: [
    ['Ask them to take it down', (s, c) => { if (chance(0.7 + (relOf(s, c.pid).rel - 50) / 200)) return `${nm(s, c.pid)} took it down and apologized. The group chat screenshotted it first.`; addRel(s, c.pid, -4); return { text: `${nm(s, c.pid)} said it was just a joke. It was still there in the morning.`, tone: 'bad' }; }],
    ['Laugh it off', (s) => { add(s, { happy: 1 }); return 'You commented "worth it," and the whole thing died down by Friday.'; }],
    ['Own it', (s) => { add(s, { happy: 3 }); webRepAdd(P(s), { name: 1 }); return 'You reposted it with a caption. Nobody had anything to say after that. You are surprisingly good at this.'; }],
  ],
});
EV('in_dry_spell', {
  ages: [22, 80], emoji: '🌫️', title: 'Gone quiet', tags: INT_TAGS, cooldown: 3,
  when: (s) => free(s) && intimSparkLow(s),
  ctx: (s) => ({ pid: romanticId(s) }),
  text: (s, c) => `${nm(s, c.pid)} falls asleep with the lights on, again. Somewhere in the last year the two of you stopped touching in the hallway. Neither of you has said anything.`,
  choices: [
    ['Talk about it', (s, c) => { intimBump(s, c.pid, 8); addRel(s, c.pid, 3); return `You said it out loud, which was the hardest part. ${nm(s, c.pid)} said they had been thinking the same thing.`; }],
    { label: 'Book a weekend away', sub: (s) => fmtMoney(price(s, 900)), fx: (s, c) => { const cost = price(s, 900); if (!pay(s, cost)) return cantAfford(cost); intimBump(s, c.pid, 16); addRel(s, c.pid, 5); return 'Two nights, a view, and no laundry. You found each other again.'; } },
    { label: 'See a counselor', sub: (s) => fmtMoney(price(s, 150)), fx: (s, c) => { const cost = price(s, 150); if (!pay(s, cost)) return cantAfford(cost); intimBump(s, c.pid, 10); addRel(s, c.pid, 6); return 'The counselor asked what each of you missed. Neither of you had an answer, and both of you did.'; } },
    ['Hope it passes', (s, c) => { intimBump(s, c.pid, -3); addRel(s, c.pid, -3); return 'You hoped it would pass. It did not, but it did get quieter.'; }],
  ],
});
EV('in_anniversary', {
  ages: [22, 90], emoji: '🥂', title: 'The anniversary', tags: INT_TAGS, cooldown: 3,
  when: (s) => { const r = romanticId(s); return free(s) && !!r && s.year - relOf(s, r).since >= 2 && intimSpark(s, r) >= 45; },
  ctx: (s) => ({ pid: romanticId(s) }),
  text: (s, c) => `It is you and ${nm(s, c.pid)}’s anniversary. They have not mentioned it, which means they are planning something, or they have forgotten.`,
  choices: [
    { label: 'Plan something special', sub: (s) => fmtMoney(price(s, 200)), fx: (s, c) => { const cost = price(s, 200); if (!pay(s, cost)) return cantAfford(cost); intimBump(s, c.pid, 10); addRel(s, c.pid, 6); add(s, { happy: 4 }); return { text: 'You booked a table, wore the thing they like, and held hands under it. It was a very good night.', tone: 'good' }; } },
    ['Stay in', (s, c) => { intimBump(s, c.pid, 4); addRel(s, c.pid, 3); return 'You stayed in, ordered the same dinner you always order, and fell asleep on the couch. It was perfect.'; }],
    ['Forget about it', (s, c) => { addRel(s, c.pid, -8); return { text: 'You forgot. They did not say anything, which was worse than if they had.', tone: 'bad' }; }],
  ],
});
EV('in_regret', {
  ages: [20, 60], emoji: '🌧️', title: 'A quiet morning', tags: INT_TAGS, cooldown: 4,
  when: (s) => free(s) && intimOf(s).yrs.length >= 3,
  text: 'It is a quiet Sunday. You have had a lot of nights out recently, and you are not entirely sure what you were looking for in any of them.',
  choices: [
    ['Call a friend and talk', (s) => { add(s, { happy: 3 }); const f = pickRel(s, ['friend', 'bestie']); if (f) addRel(s, f, 4); return 'You talked for an hour with someone who has known you for years. It was the best part of your week.'; }],
    ['Take a break from dating', (s) => { add(s, { happy: 2, karma: 1 }); intimOf(s).yrs = []; return 'You deleted the apps for a while. You spent a month on the things you used to like. You felt like yourself.'; }],
    ['Keep going', (s) => { add(s, { happy: -2 }); return 'You kept going. It was fun, and it was not.'; }],
  ],
});
EV('in_sti_tell', {
  ages: [18, 80], emoji: '🧪', title: 'A hard conversation', tags: INT_TAGS, cooldown: 2,
  when: (s) => free(s) && !!romanticId(s) && M(s).diseases.some((d) => d.known && DISEASES[d.id].sti && !d.told),
  ctx: (s) => ({ pid: romanticId(s) }),
  text: (s, c) => `The test is back. It is nothing that cannot be treated, and nothing you can unknow. ${nm(s, c.pid)} is in the next room, humming.`,
  choices: [
    ['Tell them straight away', (s, c) => { for (const d of M(s).diseases) if (DISEASES[d.id].sti) d.told = true; const r = relOf(s, c.pid); addRel(s, c.pid, -randInt(2, 10)); add(s, { karma: 2, happy: -2 }); if (r.rel < 35 && chance(0.25)) return { text: `You told ${nm(s, c.pid)} everything. They needed some time, and then some more time, and then they left. ${partnerLeaves(s, c.pid)}`.trim(), tone: 'bad' }; return { text: `You told ${nm(s, c.pid)}. They were quiet for a long time, then reached for your hand, and asked what the next step was. You made an appointment for both of you.`, tone: 'good' }; }],
    ['Wait until you are sure what it is', (s, c) => { for (const d of M(s).diseases) if (DISEASES[d.id].sti) d.told = true; addRel(s, c.pid, -2); return 'You waited a week, until you knew exactly what you were saying. It was a hard conversation, and a better one for the week.'; }],
    { label: 'Say nothing', tone: 'bad', fx: (s, c) => { for (const d of M(s).diseases) if (DISEASES[d.id].sti) d.told = true; add(s, { karma: -4 }); webNewSecret(s, 'sti', s.playerId, { rom: c.pid, sev: 3, ev: 10 }); return { text: 'You said nothing. It sits at the back of every conversation now.', tone: 'bad' }; } },
  ],
});
