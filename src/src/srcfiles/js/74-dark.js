/* =====================================================================
 * 74-dark.js — darker adult themes, handled seriously. Behind the Mature
 * and Dark themes switches (CONTENT_TAGS in 12-flow.js, both off by
 * default), adults only. Three things, each built on the web:
 *
 *   Betrayal     Somebody you trusted passes your secret on, takes the credit, or hides something from you.
 *                You find out, and you decide: confront them, forgive them, cut them off, or make them
 *                pay. Revenge is a choice with a cost, and the cheapest option is letting go.
 *   Stalking     A fan, an ex or a regular will not let go. It escalates if you ignore it, and you have ways
 *                to act: document and report it, tell the people around you, get security, confront, or
 *                change how you live. It can end in an order, an arrest, or a quiet year when they give up.
 *                And the other side: an ex you cannot let go of, and what pushing it costs.
 *   Moral injury The harm that is not fear but betrayal of what you believe: an order you thought was wrong,
 *                a mistake covered up, an asset you left behind. It is a meter that costs sleep and
 *                people, and the way out is help.
 *
 * Rules, as in 72-violence.js: nothing graphic, nothing sexual, nobody under 18, and always a way out.
 * An unsafe situation is never the player's fault and is never played for anything but its weight.
 *
 * M(s).dark = { moral, stalk, grudge: { pid: year }, helped, betrayed }
 *   moral  0-100, moral injury; costs happiness every year, fades slowly, eased by help
 *   stalk  null | { by: pid, kind: 'ex' | 'fan' | 'regular', since, level (0-100), order, told, scared }
 *   quiet  the year a stalking last ended: nobody new starts for three years
 * ===================================================================== */

const DARK_TAGS = ['mature', 'mature_themes'];
const darkOn = () => tagsOn(DARK_TAGS);
function darkOf(s) { const m = M(s); return m.dark || (m.dark = { moral: 0, stalk: null, grudge: {}, helped: 0, betrayed: 0, quiet: 0 }); }
const MORAL_WORDS = [[0, 'Clear'], [15, 'Uneasy'], [35, 'Troubled'], [60, 'Heavy'], [80, 'Broken']];
function moralWord(v) { let w = MORAL_WORDS[0][1]; for (const [min, word] of MORAL_WORDS) if (v >= min) w = word; return w; }
const STALK_WORDS = [[0, 'A bad feeling'], [25, 'Being watched'], [50, 'Followed'], [75, 'Afraid at home']];
function stalkWord(v) { let w = STALK_WORDS[0][1]; for (const [min, word] of STALK_WORDS) if (v >= min) w = word; return w; }
function darkMoral(s, n) { const d = darkOf(s); d.moral = clamp100(Math.round(d.moral + n * (n > 0 && trait(s, 'kind') ? 1.3 : 1))); }

CRIMES.harassment = { name: 'Harassment', minAge: 14, sentence: [0, 0], conviction: 0.9, karma: -3, felony: false, verb: 'harassment' }; // not a Crime-menu crime
CRIMES.falsifying = { name: 'Falsifying a report', minAge: 17, sentence: [0, 0], conviction: 0.8, karma: -4, felony: false, verb: 'falsifying a report' };
Object.assign(KIN_LABELS, { stalker: ['Stalker', 'Stalker', 'Stalker'] });
REL_GROUPS.find((g) => g.id === 'other').kinds.push('stalker');
Object.assign(REL_DECAY, { stalker: 0 });

/* ---- betrayal ------------------------------------------------------------------------------------ */
const BETRAY_WHY = ['for a favor they were owed', 'because they thought you had it coming', 'because they had been drinking', 'because somebody pressed them hard', 'because it made them feel important'];
// The web's leak (62-web.js) records who told whom; when one of your secrets gets out, you find out who.
function darkYear(s) {
  if (!darkOn() || A(s) < 18 || s.dead) return;
  const d = darkOf(s);
  // Whoever it was may have been forgotten while you were away (prison, a move): the stalking ends with them.
  if (d.stalk && (!s.people[d.stalk.by] || !s.people[d.stalk.by].alive)) { d.stalk = null; d.quiet = s.year; }
  if (!free(s)) return;
  // Who told?
  for (const sec of Object.values(webOf(s).secrets)) {
    if (sec.subj !== s.playerId || !sec.out || sec.outYear !== s.year || !sec.told || sec.dk) continue;
    sec.dk = true;
    const trusted = Array.from(new Set(Object.values(sec.told))).filter((id) => s.people[id] && s.people[id].alive && relOf(s, id) && ['friend', 'bestie', 'sibling', 'partner', 'spouse', 'fiance', 'coworker', 'parent'].includes(relKind(s, id)) && relOf(s, id).rel >= 35);
    if (trusted.length && !s.pending.some((p) => p.handler === 'dkBetray')) { dkBetray(s, pick(trusted), sec); break; }
  }
  // Grudges fade.
  for (const k in d.grudge) if (!s.people[k] || s.year - d.grudge[k] > 8) delete d.grudge[k];
  stalkYear(s);
  moralYear(s);
}
function dkBetray(s, pid, sec) {
  const p = s.people[pid], why = pick(BETRAY_WHY);
  darkOf(s).betrayed++;
  popup(s, {
    emoji: '🗡️', title: 'Who told', handler: 'dkBetray', person: pid, ctx: { pid, why, sid: sec.id },
    text: `You worked it out. ${cap(webLabel(s, sec))} got out because ${p.first}, who you trusted, passed it on, ${why}. Your hands are cold.`,
    choices: [
      { label: `Confront ${p.first}`, value: 'confront' },
      { label: 'Forgive, and move on', value: 'forgive', sub: 'It will cost something to carry' },
      { label: 'Cut them out of your life', value: 'cut' },
      { label: 'Make them pay', value: 'pay', tone: 'bad' },
    ],
  });
}
onChoice('dkBetray', (s, ctx, v) => {
  const p = s.people[ctx.pid];
  if (!p || !relOf(s, ctx.pid)) return;
  if (v === 'forgive') { addRel(s, ctx.pid, -6); add(s, { karma: 2, happy: 1 }); return { text: `You told ${p.first} you knew, and that you were letting it go. It was the hard thing and the right one. It will not feel finished for a long time.`, tone: 'good' }; }
  if (v === 'cut') { addRel(s, ctx.pid, -50); darkOf(s).grudge[ctx.pid] = s.year; add(s, { happy: -2 }); return { text: `You stopped answering ${p.first}, and stopped showing up where ${pr(p).he} would be. Some people you trusted less than you thought.`, tone: '' }; }
  if (v === 'pay') { darkOf(s).grudge[ctx.pid] = s.year; dkRevenge(s, ctx.pid); return { text: 'You did not say anything. You started thinking.', nolog: true, quiet: true }; }
  const odds = clamp(0.35 + skill(s, 'charisma') / 250 + relOf(s, ctx.pid).rel / 300, 0.1, 0.8);
  if (chance(odds)) { addRel(s, ctx.pid, -4); add(s, { happy: 1 }); return { text: `${p.first} did not deny it. ${cap(pr(p).he)} said it was ${ctx.why}, and that ${pr(p).he} was sorry, and ${pr(p).he} looked it. It is not fixed. It is a start.`, tone: '' }; }
  addRel(s, ctx.pid, -25);
  add(s, { happy: -3 });
  return { text: `${p.first} said you were being dramatic, and that it was not that big a deal, and that you were always like this. It is the second betrayal.`, tone: 'bad' };
});

// Revenge is a choice with a price, and the cheapest option is letting go.
function dkRevenge(s, pid) {
  const p = s.people[pid];
  if (!p || !p.alive) return;
  const dirt = webAbout(s, pid)[0], cost = price(s, 2500);
  popup(s, {
    emoji: '🔥', title: 'Make them pay', handler: 'dkRevenge', person: pid, ctx: { pid, cost },
    text: `${p.first} did this to you. Nobody would blame you for wanting it to cost ${pr(p).him} something. You will have to live with whatever you pick.`,
    choices: [
      { label: 'Let it go', value: 'let', sub: 'Nothing, and then peace' },
      { label: 'Tell the world what you know about them', value: 'expose', disabled: !dirt, tone: 'bad', sub: dirt ? 'You heard something' : 'You do not know anything' },
      { label: 'Quietly make their life harder', value: 'sabotage', tone: 'bad', sub: `${Math.round(dkSabotageOdds(s) * 100)}%` },
      { label: 'Take them to court', value: 'court', sub: fmtMoney(cost), disabled: M(s).money < cost },
    ],
  });
}
const dkSabotageOdds = (s) => clamp(0.4 + skill(s, 'streetwise') / 250 + skill(s, 'charisma') / 400, 0.1, 0.85);
onChoice('dkRevenge', (s, ctx, v) => {
  const p = s.people[ctx.pid], d = darkOf(s);
  if (!p) return;
  if (v === 'let') { delete d.grudge[ctx.pid]; add(s, { karma: 3, happy: 3 }); return { text: 'You decided it was not worth any more of your life. It was the best revenge you could find, and you did not feel a thing, which was the point.', tone: 'good' }; }
  if (v === 'expose') {
    const sec = webAbout(s, ctx.pid)[0];
    if (sec) webExpose(s, sec, 'you');
    add(s, { karma: -8, happy: 2 });
    webRepAdd(P(s), { scandal: 3, name: -3 });
    if (relOf(s, ctx.pid)) setRel(s, ctx.pid, 'enemy', 0);
    return { text: `You told the right people the right thing, and ${p.first}'s life came apart in about a week. It was everything you imagined. You were surprised how much it also looked like you.`, tone: 'bad' };
  }
  if (v === 'court') {
    if (!pay(s, ctx.cost)) return cantAfford(ctx.cost);
    if (chance(0.45)) { add(s, { money: price(s, 6000), happy: 3, karma: 1 }); return { text: 'The court found for you. It took a year, and a lot of paperwork, and a lot of nerve. It was not satisfying, exactly. It was right.', tone: 'good' }; }
    return { text: 'It was your word against theirs, and the court agreed with neither of you. You are out the fees.', tone: 'bad' };
  }
  // sabotage
  add(s, { karma: -5 });
  if (chance(dkSabotageOdds(s))) {
    if (p.job && p.job.id) p.job = null; else p.money = Math.max(0, p.money - Math.round(1000 * econOf(p)));
    if (relOf(s, ctx.pid)) setRel(s, ctx.pid, 'enemy', 0);
    return { text: `A word in the right ear, a call that was never made, and ${p.first}'s luck turned. Nobody can prove a thing. You know.`, tone: 'bad' };
  }
  webRepAdd(P(s), { scandal: 4, name: -3 });
  if (relOf(s, ctx.pid)) setRel(s, ctx.pid, 'enemy', 0);
  return { text: `It came back to you. ${p.first} knows exactly who it was, and so do three of your friends.`, tone: 'bad' };
});

EV('dk_credit_taken', {
  ages: [20, 65], w: 0.9, emoji: '💼', title: 'Whose idea was it', tags: DARK_TAGS, cooldown: 6,
  when: (s) => free(s) && !!M(s).career && !JOBS[M(s).career.id].special && !!pickRel(s, ['coworker']),
  ctx: (s) => ({ pid: pickRel(s, ['coworker']) }),
  text: (s, c) => `The presentation was your work, start to finish. ${nm(s, c.pid)} just stood up in front of the whole department and called it ${pr(s.people[c.pid]).his} own.`,
  choices: [
    ['Talk to them privately', (s, c) => { if (chance(clamp(0.4 + skill(s, 'charisma') / 250, 0.1, 0.8))) { M(s).career.perf = clamp100(M(s).career.perf + 3); return { text: `${nm(s, c.pid)} went red, and said it was a mistake, and fixed it in the next meeting. You will never be sure it was.`, tone: 'good' }; } M(s).career.perf = clamp100(M(s).career.perf - 4); add(s, { happy: -3 }); return { text: 'They said there had been a misunderstanding, and that it was a team effort. You swallowed it.', tone: 'bad' }; }],
    ['Take it to your boss', (s, c) => { if (chance(0.5)) { M(s).career.perf = clamp100(M(s).career.perf + 6); addRel(s, c.pid, -20); return { text: 'Your boss went through the files, and the dates did the talking. You did not make a friend, and you made a point.', tone: 'good' }; } M(s).career.perf = clamp100(M(s).career.perf - 6); addRel(s, c.pid, -25); return { text: 'Your boss said they did not want to get involved in personal disputes. You are now somebody who complains.', tone: 'bad' }; }],
    ['Let it go', (s) => { add(s, { happy: -3 }); return 'You let it go. You did not forget it, and you started keeping your drafts.'; }],
    ['Get even', (s, c) => { darkOf(s).grudge[c.pid] = s.year; dkRevenge(s, c.pid); return { text: 'You smiled at them in the hallway, and started planning.', nolog: true, quiet: true }; }],
  ],
});
EV('dk_partner_money', {
  ages: [22, 70], w: 0.5, emoji: '🧾', title: 'The statement', tags: DARK_TAGS, cooldown: 8,
  when: (s) => free(s) && !!romanticId(s) && ['spouse', 'partner'].includes(relKind(s, romanticId(s))) && relOf(s, romanticId(s)).rel < 85,
  ctx: (s) => ({ pid: romanticId(s) }),
  text: (s, c) => `A letter you were not meant to see: ${nm(s, c.pid)} has been hiding a debt, in a name you share, for years.`,
  choices: [
    ['Talk it through, calmly', (s, c) => { if (chance(clamp(0.4 + relOf(s, c.pid).rel / 250, 0.1, 0.85))) { addRel(s, c.pid, 5); add(s, { money: -price(s, randInt(2000, 8000)), happy: -2 }); return { text: `${nm(s, c.pid)} cried, and told you everything, and you made a plan together. It is not the money. It is that it took a letter.`, tone: '' }; } addRel(s, c.pid, -15); add(s, { money: -price(s, randInt(3000, 12000)), happy: -4 }); return { text: `${nm(s, c.pid)} said it was none of your business, in your own kitchen. You paid anyway.`, tone: 'bad' }; }],
    ['Say nothing, and watch', (s, c) => { addRel(s, c.pid, -8); add(s, { money: -price(s, randInt(3000, 12000)), happy: -3 }); return { text: 'You did not say anything. You started looking at everything differently, and so did the next three months.', tone: 'bad' }; }],
    ['Protect what is yours', (s, c) => { addRel(s, c.pid, -20); const m = Math.min(M(s).money, price(s, 3000)); add(s, { money: -Math.round(m * 0.3) }); return { text: 'You moved your savings, and changed the passwords, and did not say why. It was prudent, and it did not feel like marriage.', tone: '' }; }],
    ['End it', (s, c) => { const t = partnerLeaves(s, c.pid); add(s, { happy: -6 }); return { text: `It was not about the money. ${t}`.trim(), tone: 'bad' }; }],
  ],
});

/* ---- stalking --------------------------------------------------------------------------------------- */
function stalkOf(s) { return darkOf(s).stalk; }
function stalkYear(s) {
  const d = darkOf(s);
  if (!d.stalk) {
    if (A(s) < 18 || s.year - d.quiet < 3 || !chance(0.04)) return;
    const exes = relPeople(s, ['ex', 'exspouse']).filter((p) => relOf(s, p.id).rel <= 35 && ageOf(s, p) >= 18);
    const reg = relPeople(s, ['regular']).filter((p) => ageOf(s, p) >= 18);
    const followed = Object.values(M(s).work || {}).some((w) => w.flags && w.flags.followed && s.year - w.flags.followed <= 1);
    const fame = M(s).fame >= 35 && chance((M(s).fame - 30) / 60);
    const kind = followed && reg.length ? 'regular' : fame ? 'fan' : exes.length && chance(0.5) ? 'ex' : null;
    if (!kind) return;
    let by;
    if (kind === 'ex') by = pick(exes);
    else if (kind === 'regular') by = pick(reg);
    else { by = makeAdultNear(s, { minAge: 20, maxAge: 60 }); setRel(s, by.id, 'stalker', 0); }
    d.stalk = { by: by.id, kind, since: s.year, level: 12, order: false, told: false, scared: false };
    stalkPopup(s, 'It starts small.');
    return;
  }
  const st = d.stalk, p = s.people[st.by];
  if (!p || !p.alive) { d.stalk = null; d.quiet = s.year; return; }
  st.level = clamp100(st.level + (st.order ? 3 : 10) + (st.kind === 'ex' ? 3 : 0) - (st.told ? 3 : 0));
  add(s, { happy: -Math.round(st.level / 15) });
  if (st.order && chance(0.3)) { stalkEnd(s, `${p.first} broke the order, and was arrested for it. It is over, and it takes a long time to feel like it.`); return; }
  if (st.level >= 70 && !st.scared) { st.scared = true; stalkScare(s); return; }
  if (!s.pending.some((q) => q.handler === 'dkStalk')) stalkPopup(s, '');
}
function stalkEnd(s, text) {
  const d = darkOf(s);
  d.stalk = null; d.quiet = s.year;
  log(s, '🛡️ ' + text, 'good');
}
function stalkPopup(s, lead) {
  const st = stalkOf(s), p = s.people[st.by];
  const cost = price(s, 1800);
  popup(s, {
    emoji: '👁️', title: stalkWord(st.level), handler: 'dkStalk', person: st.by, ctx: { cost },
    text: `${lead ? lead + ' ' : ''}${p.first} ${st.level < 30 ? 'keeps turning up where you are, and sending things you did not ask for' : st.level < 55 ? 'knows where you work, where you shop and when you come home' : 'is outside, again'}. None of this is your fault, and none of it is going away by itself.`.trim(),
    choices: [
      { label: 'Document it, and report it', value: 'report', sub: `${Math.round(stalkReportOdds(s) * 100)}%` },
      { label: 'Tell the people around you', value: 'tell', sub: 'So somebody is watching out' },
      { label: 'Get security, and change your routines', value: 'security', sub: fmtMoney(cost), disabled: M(s).money < cost },
      { label: 'Confront them', value: 'confront', tone: 'bad', sub: 'It may make things worse' },
      { label: 'Ignore it', value: 'ignore' },
    ],
  });
}
const stalkReportOdds = (s) => { const st = stalkOf(s); return clamp(0.4 + (st && st.told ? 0.15 : 0) + (webRep(P(s)).name - 50) / 300 + (st && st.kind === 'ex' ? 0.05 : 0.1), 0.1, 0.85); };
onChoice('dkStalk', (s, ctx, v) => {
  const st = stalkOf(s);
  if (!st) return { text: 'It had already stopped.', quiet: true, nolog: true };
  const p = s.people[st.by];
  if (v === 'report') {
    if (chance(stalkReportOdds(s))) { st.order = true; st.level = Math.max(0, st.level - 35); add(s, { happy: 2 }); return { text: `They took you seriously, and wrote it all down, and a judge signed an order that ${p.first} was served with in person. You can breathe, a little.`, tone: 'good' }; }
    st.level = clamp100(st.level + 3);
    return { text: 'They took notes, and said there was not enough yet. Keep the messages, they said. Write down dates. It is a very long wait for a system to catch up with something you already know.', tone: 'bad' };
  }
  if (v === 'tell') {
    st.told = true; st.level = Math.max(0, st.level - 10);
    for (const f of relPeople(s, ['friend', 'bestie', 'parent', 'sibling'])) addRel(s, f.id, 2);
    return { text: 'You told them all of it. Nobody said you were overreacting. Somebody walks you to your car now, and it matters more than you thought it would.', tone: 'good' };
  }
  if (v === 'security') {
    if (!pay(s, ctx.cost)) return cantAfford(ctx.cost);
    st.level = Math.max(0, st.level - 25);
    return { text: 'New locks, a camera by the door, a different route home and a number that is not on any list. It is a lot, and it helps.', tone: 'good' };
  }
  if (v === 'confront') {
    if (chance(clamp(0.3 + skill(s, 'charisma') / 300, 0.1, 0.7)) && st.kind !== 'fan') { stalkEnd(s, `You said it plainly, once. ${p.first} did not contact you again.`); return { text: `You said it plainly, once, in public, with a friend nearby. ${p.first} stood there for a long time, and then left. It was the end of it, this time.`, tone: 'good' }; }
    st.level = clamp100(st.level + 15); add(s, { happy: -3 });
    return { text: 'It made things worse. They took it as contact. You will not do that again.', tone: 'bad' };
  }
  st.level = clamp100(st.level + 12);
  return 'You ignored it, because you hoped it would stop. It did not.';
});
// The night it stops being a feeling.
function stalkScare(s) {
  const st = stalkOf(s), p = s.people[st.by];
  popup(s, {
    emoji: '🚨', title: 'Outside', handler: 'dkScare', person: st.by, ctx: {},
    text: `You came home and ${p.first} was outside, just standing there, looking up at your window. By the time you had your phone out, ${pr(p).he} had gone. You did not sleep.`,
    choices: [{ label: 'Call the police, right now', value: 'police' }, { label: 'Stay somewhere else for a while', value: 'away' }, { label: 'Ring a friend and stay on the line', value: 'friend' }],
  });
}
onChoice('dkScare', (s, ctx, v) => {
  const st = stalkOf(s);
  if (!st) return;
  const p = s.people[st.by];
  add(s, { happy: -6, health: -2 });
  if (v === 'police') {
    if (chance(0.6)) { stalkEnd(s, `${p.first} was arrested that night, and charged. It is over.`); return { text: `The police came fast this time, and ${p.first} was still two streets away. It was the end of it. You cried in the kitchen for an hour, and then you slept.`, tone: 'good' }; }
    st.order = true; st.level = Math.max(0, st.level - 30);
    return { text: 'They searched the street and found nothing. They took a full statement, and an order was granted a week later. You were the one who had to leave the house for a while.', tone: '' };
  }
  if (v === 'away') { st.level = Math.max(0, st.level - 20); return { text: 'You stayed with a friend for three weeks. It is a bitter way to find out who will take you in. It is also a way to find out.', tone: '' }; }
  st.told = true; st.level = Math.max(0, st.level - 10);
  return { text: 'You stayed on the phone until the sun came up, and your friend did not hang up once.', tone: '' };
});

// The other side: an ex you cannot let go of, and what pushing it costs.
EV('dk_obsession', {
  ages: [18, 60], w: 0.6, emoji: '🌧️', title: 'You cannot let go', tags: DARK_TAGS, cooldown: 6,
  when: (s) => free(s) && relPeople(s, ['ex', 'exspouse']).some((p) => ageOf(s, p) >= 18 && s.year - (relOf(s, p.id).since || s.year) <= 3),
  ctx: (s) => ({ pid: pick(relPeople(s, ['ex', 'exspouse']).filter((p) => ageOf(s, p) >= 18)).id }),
  text: (s, c) => `You still think about ${nm(s, c.pid)}. You have driven past ${pr(s.people[c.pid]).his} street more times than is plausible, and tonight you are looking at ${pr(s.people[c.pid]).his} profile again.`,
  choices: [
    ['Let go, and call a friend', (s) => { const f = pickRel(s, ['friend', 'bestie']); if (f) addRel(s, f, 4); add(s, { happy: 2, karma: 1 }); darkOf(s).helped++; return { text: 'You put the phone in a drawer and rang somebody who would answer. It was a bad night, and it was the last one like it.', tone: 'good' }; }],
    ['Check their page one more time', (s) => { add(s, { happy: -3 }); return 'You told yourself it was the last time. It is a long way from the last time.'; }],
    ['Show up where they will be', (s, c) => {
      if (chance(0.5)) { addRel(s, c.pid, -25); add(s, { happy: -5 }); return { text: `${nm(s, c.pid)} asked you, calmly, to stop. You went home. It was the most humiliating thing you have ever heard yourself agree to.`, tone: 'bad' }; }
      arrestMinor(s, 'harassment'); webRepAdd(P(s), { scandal: 4, name: -3 }); setRel(s, c.pid, 'enemy', 0);
      return { text: `${nm(s, c.pid)} called the police, and they were right to. You have a record for it now, and a lot of time to think about what you were doing.`, tone: 'bad' };
    }],
    ['Talk to someone professional', (s) => { const cost = price(s, 150); if (!pay(s, cost)) return cantAfford(cost); darkOf(s).helped++; add(s, { happy: 3 }); return { text: 'It was not about them, it turned out. It almost never is. You went back, and you are going back.', tone: 'good' }; }],
  ],
});

/* ---- moral injury ------------------------------------------------------------------------------------- */
function moralYear(s) {
  const d = darkOf(s);
  if (d.moral <= 0) return;
  add(s, { happy: -Math.round(d.moral / 25), health: d.moral >= 60 ? -1 : 0 });
  if (d.moral >= 35 && chance(d.moral / 250) && !s.pending.some((q) => q.handler === 'dkMoral')) moralNight(s);
  d.moral = clamp100(Math.round(d.moral * 0.97 - 0.3));
}
function moralNight(s) {
  const cost = price(s, 150), vet = mil(s) && mil(s).vet, friend = pickRel(s, ['friend', 'bestie', 'spouse', 'partner']);
  popup(s, {
    emoji: '🌘', title: 'What you did, and what you let happen', handler: 'dkMoral', ctx: { cost, friend },
    text: 'It was not fear. You can handle fear. It is that you knew it was wrong, and you did it anyway, or let it be done, and you cannot put that down.',
    choices: [
      { label: 'See a counselor', value: 'counsel', sub: fmtMoney(cost), disabled: M(s).money < cost },
      ...(vet ? [{ label: 'Go to the veterans’ group', value: 'group', sub: 'People who know' }] : []),
      ...(friend ? [{ label: `Tell ${nm(s, friend)}`, value: 'tell', sub: 'The real version' }] : []),
      { label: 'Drink it quiet', value: 'drink', tone: 'bad' },
      { label: 'Carry on', value: 'on' },
    ],
  });
}
onChoice('dkMoral', (s, ctx, v) => {
  const d = darkOf(s);
  if (v === 'counsel') { if (!pay(s, ctx.cost)) return cantAfford(ctx.cost); d.helped++; darkMoral(s, -14); add(s, { happy: 3 }); return { text: 'She did not tell you it was not your fault. She asked what you would have needed to hear, and waited. It is not fixed, and it is lighter.', tone: 'good' }; }
  if (v === 'group') { d.helped++; darkMoral(s, -10); add(s, { happy: 2 }); return { text: 'A circle of folding chairs in a church basement. Nobody asked what you had done. Somebody poured you coffee, and then you were allowed to talk.', tone: 'good' }; }
  if (v === 'tell') { const f = s.people[ctx.friend]; if (!f) return; d.helped++; darkMoral(s, -8); addRel(s, f.id, 5); return { text: `You told ${f.first} the real version, the one nobody else has. ${cap(pr(f).he)} did not look away.`, tone: 'good' }; }
  if (v === 'drink') { habit(s, 'alcohol', 8); darkMoral(s, -2); add(s, { health: -2 }); return { text: 'It worked until the morning, and then the morning was worse.', tone: 'bad' }; }
  add(s, { happy: -3 });
  return 'You carried on. It carried on too.';
});
defAction({
  id: 'dk_counsel', cat: 'health', label: 'Talk to a counselor', emoji: '🛋️', tags: DARK_TAGS,
  desc: 'Whatever you are carrying, it does not have to be alone.',
  when: (s) => free(s) && A(s) >= 18 && darkOf(s).moral >= 15,
  sub: (s) => `${moralWord(darkOf(s).moral)} · ${fmtMoney(price(s, 150))}`,
  run: (s) => {
    const cost = price(s, 150);
    if (bump(s, 'dkcounsel') > 2) return { text: 'You have done enough for one year. Let it settle.', nolog: true };
    if (!pay(s, cost)) return cantAfford(cost);
    darkOf(s).helped++; darkMoral(s, -12); add(s, { happy: 3 });
    return 'You said the thing out loud, to someone whose job is to hear it. It did not go away. It got a little smaller.';
  },
});

// A war, an order, and what it does to you.
EV('dk_mil_order', {
  ages: [18, 60], w: 1.1, emoji: '📻', title: 'An order', tags: DARK_TAGS, cooldown: 3,
  when: (s) => inService(s) && (mil(s).tours || []).length >= 1,
  text: 'Your commander gives an order that you are sure is wrong. Maybe not illegal. Wrong. Everyone in the room has gone very still.',
  choices: [
    ['Obey', (s) => { darkMoral(s, 14); M(s).career.perf = clamp100(M(s).career.perf + 4); return { text: 'You did what you were told. It was over by dinner, and you have been hearing the quiet since.', tone: 'bad' }; }],
    ['Refuse', (s) => { M(s).career.perf = clamp100(M(s).career.perf - 15); add(s, { karma: 3 }); darkMoral(s, -2); return { text: 'You said no, in front of everyone. It cost you a reprimand, and a few friends, and nothing you would trade for it.', tone: 'good' }; }],
    ['Report it up the chain', (s) => { if (chance(0.5)) { add(s, { karma: 5 }); webRepAdd(P(s), { name: 2 }); darkMoral(s, 2); return { text: 'Somebody listened. It was investigated, and the order was reversed. You are not popular, and you are proud.', tone: 'good' }; } M(s).career.perf = clamp100(M(s).career.perf - 15); darkMoral(s, 5); return { text: 'They thanked you, and then your name stopped appearing on the roster.', tone: 'bad' }; }],
    ['Look away', (s) => { darkMoral(s, 8); return { text: 'You looked at the floor. It is the thing you are least proud of in your life, and nobody even knows.', tone: 'bad' }; }],
  ],
});
EV('dk_mil_civilians', {
  ages: [18, 60], w: 0.7, emoji: '🗂️', title: 'The report', tags: DARK_TAGS, cooldown: 4,
  when: (s) => inService(s) && typeof activeWar === 'function' && !!activeWar(s),
  text: 'A mistake. An operation went wrong, and people who had nothing to do with the war were in the way. The colonel wants the report to say something else.',
  choices: [
    ['Write what happened', (s) => { M(s).career.perf = clamp100(M(s).career.perf - 8); add(s, { karma: 4 }); webRepAdd(P(s), { name: 2 }); darkMoral(s, -3); return { text: 'You wrote it exactly as it was, and signed it. It cost you a promotion. It is the only report you ever wrote that you can read.', tone: 'good' }; }],
    ['Sign the version they want', (s) => { M(s).career.perf = clamp100(M(s).career.perf + 3); darkMoral(s, 16); add(s, { karma: -4 }); webNewSecret(s, 'crime', s.playerId, { crime: 'falsifying', sev: 2, ev: 18 }); return { text: 'You signed it, and it went up, and nobody asked a thing. You think about their names more than you think about your own.', tone: 'bad' }; }],
    ['Take it to the press', (s) => { add(s, { fame: 4 }); darkMoral(s, -8); if (chance(0.5)) { const r = arrest(s, 'leak'); return { text: `It ran on the front page, and the whole story came out. They came for you next. ${r.text}`, tone: 'bad' }; } webRepAdd(P(s), { name: 3 }); return { text: 'It ran on the front page. The inquiry that followed was real. So was the price.', tone: 'good' }; }],
  ],
});
EV('dk_spy_asset', {
  ages: [21, 75], w: 1, emoji: '🕯️', title: 'The source', tags: DARK_TAGS, cooldown: 3,
  when: (s) => inAgency(s) && liveAssets(s).length > 0,
  ctx: (s) => ({ aid: pick(liveAssets(s)).id }),
  text: (s, c) => { const a = spy(s).assets.find((x) => x.id === c.aid); return `${a.name}, the ${a.role} you recruited, is in trouble. It is because of what you asked ${a.name.split(' ')[0]} to do. The agency says the operation is more important.`; },
  choices: [
    ['Get them out', (s, c) => { const cost = price(s, 5000), a = spy(s).assets.find((x) => x.id === c.aid); if (!pay(s, cost)) return cantAfford(cost); if (chance(0.55)) { a.state = 'dropped'; darkMoral(s, -4); add(s, { karma: 4 }); return { text: 'It cost a favor, and a bribe, and a night in a border town. They are somewhere else, alive, and angry with you. It is the best result you have had all year.', tone: 'good' }; } a.state = 'dead'; darkMoral(s, 14); return { text: 'You were a day late. You are always going to be a day late.', tone: 'bad' }; }],
    ['Warn them, against orders', (s, c) => { const a = spy(s).assets.find((x) => x.id === c.aid); spy(s).standing = clamp100(spy(s).standing - 15); if (chance(0.6)) { a.state = 'dropped'; add(s, { karma: 3 }); return { text: 'You broke the rules, and a person is alive. The agency put a note in your file. You would do it again.', tone: 'good' }; } a.state = 'dead'; darkMoral(s, 12); return { text: 'It was not enough, and now there is a note in your file too.', tone: 'bad' }; }],
    ['Leave them', (s, c) => { const a = spy(s).assets.find((x) => x.id === c.aid); a.state = 'dropped'; darkMoral(s, 12); return { text: 'You wrote the report that said the asset had been "released". Nobody asked what that meant. You did not either.', tone: 'bad' }; }],
    ['Use them one more time', (s, c) => { const a = spy(s).assets.find((x) => x.id === c.aid); spy(s).standing = clamp100(spy(s).standing + 8); if (chance(0.5)) { a.state = 'dead'; darkMoral(s, 18); add(s, { karma: -5 }); return { text: 'The operation was a success. The asset did not come back. You will write the commendation yourself.', tone: 'bad' }; } darkMoral(s, 8); return { text: 'It worked, and they came out of it, and you do not feel as if you did anything you should be proud of.', tone: 'bad' }; }],
  ],
});
