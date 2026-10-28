/* =====================================================================
 * 84-street-justice.js — what crime does to the people it is done to, and
 * the people who take it into their own hands.
 *
 *   Community fallout  A victim is a real person in the web. When something you did (or somebody did) hurts
 *                      one, the people close to them remember: they turn on whoever they think was behind
 *                      it, a victims' group forms and will not let the case go cold, and a neighborhood
 *                      that lost someone stays uneasy. Anyone can see this; it needs no switch.
 *   Witnesses          Behind Mature. Every case that depends on a witness has a person behind it. You can
 *                      pay them, frighten them or help them move, and each is a crime of its own. And the
 *                      other side: you see something, and somebody makes it clear what seeing it will cost.
 *   The vigilante      Behind Mature and Violence. A street name, a lead, three ways to act on it, and a
 *                      police detective who would like a word. It can help, it can go wrong in a way that is
 *                      not undone, and it is a crime whichever way it goes.
 *
 * s.web.victims = [{ pid, harm, year, by }]   harm: money | blackmail | death | assault | fear; by: the culprit's person id
 * M(s).vig = { alias, since, rep, heat, wins, wrong, caught }
 * Witness: a person with relationship kind 'witness'; the case remembers them (c.wpid).
 * ===================================================================== */

const WI_TAGS = ['mature'];
const VIG_TAGS = ['mature', 'mature_violence'];
function wiOn() { return tagsOn(WI_TAGS); }
function vigOn() { return tagsOn(VIG_TAGS); }
CRIMES.tampering = { name: 'Witness tampering', emoji: '🗣️', minAge: 14, sentence: [2, 10], conviction: 0.8, karma: -10, felony: true, verb: 'witness tampering' }; // not a Crime-menu crime
CRIMES.vigilantism = { name: 'Vigilantism', emoji: '🏮', minAge: 16, sentence: [1, 8], conviction: 0.7, karma: -6, felony: true, verb: 'assault and obstruction' };
INV_PROFILE.tampering = [4, 40, 30, 'other'];
INV_PROFILE.vigilantism = [10, 45, 15, 'violent'];
Object.assign(KIN_LABELS, { witness: ['Witness', 'Witness', 'Witness'] });
REL_GROUPS.find((g) => g.id === 'other').kinds.push('witness');
Object.assign(REL_DECAY, { witness: 0 });
Object.assign(NEWS_T, {
  vigilante: [
    ['"{{alias}}": the city has a new name to argue about', 'Someone calling themselves {{alias}} has been showing up where the police have not, and leaving evidence behind. Detectives say they are "not impressed." A radio host says he is "a little bit impressed."'],
    ['Who is {{alias}}?', 'It started as a rumor and has become a conversation. {{city}} is divided: some leave flowers at the places {{alias}} has been, and some leave complaints at the police station.'],
  ],
  vigilante_end: [
    ['{{alias}} unmasked: {{full}}', 'The city\'s most argued-about stranger has a name, and a face, and a lawyer. {{full}} had "no comment," and a very tired look.'],
  ],
  victims: [
    ['Victims form a group in {{city}}', 'A dozen people, and their families, met at a library on {{day}} to say that the case "will not go away." A spokesperson said so twice, and asked the police to be "more visible."'],
  ],
});

/* ---- community fallout ------------------------------------------------------------------------------------------ */
function victimsOf(s) { const w = webOf(s); return w.victims || (w.victims = []); }
onWebFact('victim', (s, d) => {
  const list = victimsOf(s);
  list.push({ pid: d.pid || null, harm: d.harm || 'money', year: s.year, by: d.by === undefined ? s.playerId : d.by });
  while (list.length > 30) list.shift();
  // The people who love them hear about it, and some of them hear who.
  const p = d.pid && s.people[d.pid];
  if (!p) return;
  for (const id of webTies(s, p).keys()) {
    if (id === s.playerId || !M(s).rels[id]) continue;
    addRel(s, id, -3);
  }
});
function victimsAgainstMe(s, years) { return victimsOf(s).filter((v) => v.by === s.playerId && s.year - v.year <= (years || 6)); }
const FALLOUT_CRIMES = ['ponzi', 'con', 'blackmail', 'trafficking', 'manufacturing', 'assault', 'murder', 'arson', 'tampering', 'vigilantism', 'kidnapping'];
function falloutYear(s) {
  const mine = victimsAgainstMe(s, 6);
  if (!mine.length) return;
  // Victims do not let go: a case against you with victims behind it does not go cold, and gets a little nearer.
  for (const c of invMine(s, (k) => FALLOUT_CRIMES.includes(k.crime))) {
    if (!c.victimsKeep) c.victimsKeep = true;
    c.last = s.year;
    if (c.status === 'open') c.prog = clamp(c.prog + 2 + Math.min(3, mine.length), 0, 100);
  }
  // Their people turn on whoever they think did it.
  for (const v of mine) {
    const p = v.pid && s.people[v.pid];
    if (!p || !p.alive) continue;
    for (const id of webTies(s, p).keys()) {
      if (id === s.playerId || !M(s).rels[id] || !chance(0.15)) continue;
      addRel(s, id, -6);
      if (chance(0.12) && relKind(s, id) !== 'enemy') setRel(s, id, 'enemy', 5);
    }
  }
  if (mine.length >= 2 && !s.pending.some((p) => p.handler === 'webGroup') && chance(0.3) && free(s) && A(s) >= 16) victimsGroup(s, mine);
}
function victimsGroup(s, mine) {
  const c = invMine(s, (k) => FALLOUT_CRIMES.includes(k.crime))[0];
  if (!c) return;
  const cost = price(s, 8000);
  newsPost(s, 'victims', { day: pick(['Tuesday', 'Saturday', 'Thursday']) }, true);
  popup(s, {
    emoji: '🕯️', title: 'A victims\' group', handler: 'webGroup', ctx: { cid: c.id, cost },
    text: `${nOf(mine.length, 'person', 'people')} you hurt, or whose families you hurt, have started meeting. They say the case will not go cold. They have photographs, and a lawyer, and a mailing list. Somebody has made a point of saying your city is smaller than you think.`,
    choices: [
      { label: 'Go, and listen', value: 'go', sub: 'You may be recognized' },
      { label: 'Send money, with no name', value: 'pay', sub: fmtMoney(cost), disabled: M(s).money < cost },
      { label: 'Turn yourself in', value: 'in', tone: 'good', sub: 'A plea, and a smaller sentence' },
      { label: 'Stay away', value: 'away' },
    ],
  });
}
onChoice('webGroup', (s, ctx, v) => {
  const c = invOf(s).list[ctx.cid];
  if (!c || (c.status !== 'open' && c.status !== 'cold')) return { text: 'By the time you decided, the case was already closed.', quiet: true, nolog: true };
  if (v === 'pay') { if (!pay(s, ctx.cost)) return cantAfford(ctx.cost); add(s, { karma: 6, happy: 1 }); return 'A cashier\'s check, a plain envelope and no return address. It does not fix anything. It is not nothing.'; }
  if (v === 'in') {
    add(s, { karma: 10, happy: 2 });
    tally(s, 'turnedIn');
    c.status = 'solved'; c.solved = s.year;
    webRepAdd(P(s), { name: 2 });
    const r = arrest(s, CRIMES[c.crime] ? c.crime : 'burglary');
    return { text: `You walked into a station and said it out loud. ${r && r.text ? r.text : ''} It is the worst day, and the first one in a long time that did not feel like waiting.`.trim(), tone: 'good' };
  }
  if (v === 'go') {
    if (chance(0.3)) { c.prog = clamp(c.prog + 25, 0, 100); invEvidence(s, c, { wit: 12 }); add(s, { karma: 4, happy: -4 }); return { text: 'You sat at the back. A woman a few rows ahead turned, and looked at you for a long moment. She did not say anything. She did not have to.', tone: 'bad' }; }
    add(s, { karma: 5, happy: -4 });
    return 'You sat at the back and listened to what you did, in other people\'s words. Nobody looked at you. You did not look at yourself.';
  }
  add(s, { happy: -1 });
  return 'You stayed away. The meetings go on without you, and they are not about you any more. They are about the thing you cannot give back.';
});

/* ---- witnesses (Mature) -------------------------------------------------------------------------------------------- */
function caseWitness(s, c) {
  let p = c.wpid && s.people[c.wpid];
  if (!p || !p.alive) {
    p = makeAdultNear(s, { minAge: 20, maxAge: 65 });
    setRel(s, p.id, 'witness', 20);
    c.wpid = p.id;
  }
  return p;
}
function wiCases(s) { return invMine(s, (c) => c.status === 'open' && c.ev.wit >= 15 && c.wiYear !== s.year); }
defAction({
  id: 'wi_lean', cat: 'crime', label: 'Deal with a witness', emoji: '🗣️', desc: 'Somebody saw. A case is only as strong as the people who will say so.', tags: WI_TAGS,
  when: (s) => free(s) && A(s) >= 18 && wiOn() && wiCases(s).length > 0 && !count(s, 'wi_lean'),
  sub: (s) => `${nOf(wiCases(s).length, 'case')} with a witness`,
  run: (s) => {
    const cases = wiCases(s).sort((a, b) => b.ev.wit - a.ev.wit).slice(0, 3);
    popup(s, {
      emoji: '🗣️', title: 'Which case?', text: 'Whatever you do, a witness is a person, with a life, and a phone.', handler: 'wiPick',
      choices: cases.map((c) => ({ label: `${invEmoji(c)} ${cap(invVerb(c))} (${c.year})`, sub: `Witnesses ${c.ev.wit}%`, value: c.id })).concat([{ label: 'Never mind', value: null }]),
    });
  },
});
onChoice('wiPick', (s, ctx, cid) => {
  const c = cid && invOf(s).list[cid];
  if (!c || c.status !== 'open') return;
  const p = caseWitness(s, c), cost = price(s, Math.round(5000 + c.ev.wit * 60)), move = price(s, 8000);
  const ch = [
    { label: 'Pay them to forget', value: 'pay', sub: `${fmtMoney(cost)} · ${Math.round(wiOdds(s, 'pay', p) * 100)}%`, disabled: M(s).money < cost, tone: 'bad' },
    { label: 'Help them move away', value: 'move', sub: `${fmtMoney(move)} · ${Math.round(wiOdds(s, 'move', p) * 100)}%`, disabled: M(s).money < move },
  ];
  if (vigOn()) ch.push({ label: 'Make sure they are afraid', value: 'scare', sub: `${Math.round(wiOdds(s, 'scare', p) * 100)}% · it is a crime, and it is cruel`, tone: 'bad' });
  ch.push({ label: 'Leave them alone', value: null });
  popup(s, { emoji: '🗣️', title: `${p.first}, the witness`, person: p.id, handler: 'wiHow', ctx: { cid, cost, move }, text: `${fullName(p)} saw what happened. ${cap(pr(p).he)} told the police once. ${cap(pr(p).he)} has not been asked to again, yet.`, choices: ch });
});
function wiOdds(s, how, p) {
  const base = { pay: 0.5, move: 0.8, scare: 0.5 }[how] + skill(s, 'charisma') / 500 + skill(s, 'streetwise') / 500;
  return clamp(base - (relOf(s, p.id) ? 0 : 0) - (trait(s, 'kind') ? 0.05 : 0), 0.15, 0.9);
}
onChoice('wiHow', (s, ctx, how) => {
  const c = invOf(s).list[ctx.cid];
  if (!how || !c || c.status !== 'open') return;
  const p = caseWitness(s, c);
  bump(s, 'wi_lean');
  c.wiYear = s.year;
  const ok = chance(wiOdds(s, how, p));
  if (how === 'pay') { if (!pay(s, ctx.cost)) return cantAfford(ctx.cost); add(s, { karma: -8 }); }
  if (how === 'move') { if (!pay(s, ctx.move)) return cantAfford(ctx.move); add(s, { karma: -3 }); }
  if (how === 'scare') { add(s, { karma: -14, happy: -3 }); if (typeof vioHaunt === 'function') vioHaunt(s, 6); }
  if (ok) {
    invEvidence(s, c, { wit: how === 'scare' ? -38 : how === 'pay' ? -30 : -22 });
    c.prog = clamp(c.prog - 10, 0, 100);
    if (how === 'scare') { p.city = pick(country(s).cities.filter((x) => x !== p.city)) || p.city; webUneaseAdd(s, 1); webFact(s, 'victim', { pid: p.id, harm: 'fear' }); }
    // A deal like that is a secret between the two of you.
    if (how !== 'move') webNewSecret(s, 'crime', s.playerId, { crime: 'tampering', sev: 3, ev: 30, knows: [p.id] });
    const lines = { pay: `${p.first} took the envelope, and looked at the floor, and said ${pr(p).he} did not remember much, now that you mention it. It will not hold forever.`, move: `${p.first} took the money, and a job in another state. ${cap(pr(p).he)} is not going to be at the trial. ${cap(pr(p).he)} is also, quite possibly, happier.`, scare: `${p.first} stopped answering the door, and then stopped living at the address. The police have a witness who no longer wants to be one. You did that, and you will know it.` };
    return { text: lines[how], tone: how === 'move' ? '' : 'bad' };
  }
  // It backfires: they go to the police, and now there is a second case.
  if (relOf(s, p.id)) setRel(s, p.id, 'enemy', 0);
  c.prog = clamp(c.prog + 25, 0, 100);
  invEvidence(s, c, { wit: 10 });
  const k = invOpen(s, 'tampering', { messy: true, ev: { wit: 30 } });
  k.prog = clamp(k.prog + 25, 0, 90);
  webRepAdd(P(s), { scandal: 4, name: -3 });
  return { text: `${p.first} said no, and took notes. By evening there was a second file on your name, and a detective had a new reason to be at the door.`, tone: 'bad' };
});
// The other side: you saw something, and somebody would rather you had not.
EV('wi_you_saw', {
  ages: [16, 90], emoji: '👁️', title: 'You saw it', tags: WI_TAGS, cooldown: 6, w: 0.7,
  when: (s) => free(s) && !inPrison(s),
  ctx: (s) => ({ crime: pick(['an assault outside a bar', 'a break-in on your street', 'a hit-and-run', 'a robbery at a corner store', 'a man being dragged into a car']), who: pick(['a man you recognized', 'two men in jackets with a crest on the back', 'somebody who clearly was not afraid of being seen']) }),
  text: (s, c) => `You were in the wrong place at the right time: ${c.crime}. ${cap(c.who)} saw you see it.`,
  choices: [
    ['Go to the police', (s) => {
      add(s, { karma: 5 }); webRepAdd(P(s), { name: 2 });
      if (chance(0.25)) { add(s, { happy: -4, health: -3 }); return { text: 'You gave a full statement. A week later, a car idled outside your house for two nights, and a note appeared on your windshield. The police took it seriously, this time. You are being careful.', tone: 'bad' }; }
      return { text: 'You gave a full statement, and a detective said it mattered. You do not know what happened after that, which is how it usually goes.', tone: 'good' };
    }],
    ['Say nothing', (s) => { add(s, { karma: -3, happy: -2 }); return 'You said nothing, and you were not the only one. It sat with you for a long time, and then it sat in the back.'; }],
    ['Tell a friend, and let them decide', (s) => { const f = pickRel(s, ['friend', 'bestie', 'sibling']); if (f) addRel(s, f, 3); add(s, { happy: -1 }); return 'You told someone you trust, who told you to go to the police. You thought about it for a week.'; }],
    ['Take the money', (s) => { const amt = price(s, 3000); add(s, { money: amt, karma: -8 }); webNewSecret(s, 'crime', s.playerId, { crime: 'bribery', sev: 2, ev: 25 }); return { text: `A man in a good coat gave you ${fmtMoney(amt)}, in an envelope. "For your trouble," he said. You are not sure what trouble you have been paid for.`, tone: 'bad' }; }],
  ],
});

/* ---- the vigilante (Mature + Violence) ------------------------------------------------------------------------------ */
const VIG_ALIAS_A = ['The Lantern', 'Night Watch', 'The Plumber', 'Mr. Tuesday', 'The Hornet', 'Saint Mark', 'The Quiet One', 'Candle'];
function vigOf(s) { return M(s).vig || null; }
defSecretKind('vigilante', {
  sev: 4, icon: '🏮',
  mine: (s) => (vigOf(s) ? `that you are ${vigOf(s).alias}` : 'who you are at night'),
  rumor: (s, sec) => `${webName(s, sec.subj)} is the one the papers call a vigilante`,
  tipOdds: (s) => { const v = vigOf(s); return v ? 0.01 + v.heat / 700 : 0; },
  expose: (s) => { vigUnmasked(s); return ' You are the story.'; },
});
defAction({
  id: 'vig_start', cat: 'street', label: 'Take the law into your own hands', emoji: '🏮', desc: 'The police are not doing it, so you will. A street name, a lead, and a lot of ways this goes wrong.', tags: VIG_TAGS,
  when: (s) => free(s) && A(s) >= 18 && !vigOf(s) && vigOn() && (skill(s, 'streetwise') >= 20 || skill(s, 'martial') >= 30),
  run: (s) => {
    const alias = pick(VIG_ALIAS_A);
    M(s).vig = { alias, since: s.year, rep: 0, heat: 0, wins: 0, wrong: 0, caught: 0 };
    webNewSecret(s, 'vigilante', s.playerId, { ev: 12, sev: 4 });
    tally(s, 'vigStarted');
    return { text: `You picked a name, ${alias}, and a hat, and a night. It is not a game, and it does not feel like one. Some of the people you will find deserve it. Some will not.`, emoji: '🏮' };
  },
});
const vigLeads = (s) => {
  const have = Object.values(invOf(s).list).filter((c) => c.who === null && !c.assigned && c.status === 'open' && c.cc === P(s).country && c.city === P(s).city).slice(0, 2).map((c) => ({ id: c.id, crime: c.crime, name: c.vname || 'someone', real: true }));
  const out = have.slice();
  while (out.length < 3) out.push({ id: 'n' + out.length, crime: pick(['burglary', 'assault', 'scam', 'car_theft', 'drugs', 'vandalism']), name: `${randomFirst(P(s).country)} ${randomLast(P(s).country)}`, real: false });
  return out;
};
defAction({
  id: 'vig_patrol', cat: 'street', label: (s) => `Go out as ${vigOf(s) ? vigOf(s).alias : 'someone else'}`, emoji: '🌃', desc: 'A lead, a decision, and a risk.', tags: VIG_TAGS,
  when: (s) => free(s) && !!vigOf(s) && vigOn() && !count(s, 'vig_patrol'),
  sub: (s) => `${vigOf(s).rep} street rep · ${vigOf(s).heat} heat`,
  run: (s) => {
    const leads = vigLeads(s);
    popup(s, {
      emoji: '🌃', title: 'A lead', handler: 'vigPick', ctx: { leads },
      text: 'You have three names, and three stories. Whether any of them is true is the first thing you will have to decide.',
      choices: leads.map((l, i) => ({ label: `${invEmoji({ crime: l.crime })} ${cap(CRIMES[l.crime].verb)}: ${l.name}`, value: i, sub: l.real ? 'The police have a file' : 'A tip, and a feeling' })).concat([{ label: 'Stay home', value: null }]),
    });
  },
});
const vigOdds = (s, how, lead) => {
  const sm = P(s).stats.smarts;
  const o = { send: 0.35 + sm / 300 + skill(s, 'streetwise') / 400, face: 0.4 + skill(s, 'charisma') / 300 + skill(s, 'martial') / 400, hurt: 0.4 + skill(s, 'martial') / 200 + skill(s, 'fitness') / 400 }[how];
  return clamp(o + (lead && lead.real ? 0.08 : -0.05), 0.12, 0.88);
};
onChoice('vigPick', (s, ctx, i) => {
  const lead = ctx.leads[i];
  if (!lead || !vigOf(s)) return;
  popup(s, {
    emoji: '🏮', title: `${cap(CRIMES[lead.crime].verb)}: ${lead.name}`, handler: 'vigAct', ctx: { lead },
    text: `${lead.real ? 'There is a file at the police station with this on it, and nobody working it.' : 'It is a rumor from somebody you trust a little.'} How you handle it is the whole question.`,
    choices: [
      { label: 'Dig, and send it all to the police', value: 'send', sub: `${Math.round(vigOdds(s, 'send', lead) * 100)}% · the safe way` },
      { label: 'Confront them', value: 'face', sub: `${Math.round(vigOdds(s, 'face', lead) * 100)}% · it could go either way` },
      { label: 'Make them pay', value: 'hurt', sub: `${Math.round(vigOdds(s, 'hurt', lead) * 100)}% · and if you are wrong?`, tone: 'bad' },
      { label: 'Walk away', value: null },
    ],
  });
});
onChoice('vigAct', (s, ctx, how) => {
  const v = vigOf(s), lead = ctx.lead;
  if (!v || !how) return;
  bump(s, 'vig_patrol');
  const won = chance(vigOdds(s, how, lead));
  const real = lead.real || chance(0.8); // a tip is sometimes wrong
  const c = lead.real ? invOf(s).list[lead.id] : null;
  const gain = (n) => { v.rep = clamp100(v.rep + n); };
  if (how === 'send') {
    if (won && real) {
      gain(4); v.wins++; v.heat = clamp100(v.heat + 2); webRepAdd(P(s), { name: 2 }); add(s, { karma: 4, happy: 2 });
      if (c) { c.prog = clamp(c.prog + 40, 0, 100); } else { const k = invWorldCase(s, { crime: lead.crime, vname: lead.name }); k.prog = 60; }
      return { text: `You put it together over a few weeks: dates, photographs, a pattern. A detective called you "very thorough," and did not ask who you were. ${lead.name} was arrested a month later.`, tone: 'good' };
    }
    add(s, { happy: -1 });
    return 'You sent what you had, and it was not enough. The police thanked you, and filed it. Nothing happened, which is how it goes more often than it should.';
  }
  if (how === 'face') {
    v.heat = clamp100(v.heat + 8);
    if (won && real) { gain(6); v.wins++; add(s, { karma: 2 }); if (c) c.prog = clamp(c.prog + 30, 0, 100); return { text: `${lead.name} did not say a thing, which was an answer. By the end of the week, the problem had moved away.`, tone: 'good' }; }
    if (!real) { v.wrong++; webRepAdd(P(s), { scandal: 3, name: -2 }); add(s, { karma: -4, happy: -3 }); return { text: `${lead.name} had no idea what you were talking about, and it showed. It was not them. You were wrong, and they know your face.`, tone: 'bad' }; }
    add(s, { health: -randInt(2, 10), happy: -2 });
    return { text: `${lead.name} laughed at you, and then did not. You left with a split lip and the sense of having been seen.`, tone: 'bad' };
  }
  // Make them pay: odds, outcomes, and no detail.
  add(s, { karma: -10 });
  v.heat = clamp100(v.heat + 18);
  webFact(s, 'assault', {});
  invOpen(s, 'assault', { who: s.playerId, ev: { wit: 25 } });
  if (typeof vioHaunt === 'function') vioHaunt(s, 8);
  if (!real) {
    v.wrong++; gain(-6);
    webRepAdd(P(s), { scandal: 8, name: -6 });
    getSued(s, 'injury', { vs: lead.name, cap: lead.name.split(' ').pop() }, {});
    return { text: `It was the wrong person. ${lead.name} was in a hospital, and then in a courtroom, and the case was against you. You will carry that one a long time.`, tone: 'bad' };
  }
  if (won) {
    gain(10); v.wins++; add(s, { happy: 1 });
    if (c) { c.status = 'solved'; c.solved = s.year; }
    webFact(s, 'victim', { pid: null, harm: 'assault', by: s.playerId });
    return { text: `It was loud, and short, and ${lead.name} is not going to be doing it again. You are not sure what you feel, and you are not sure it should be satisfaction.`, tone: 'bad' };
  }
  add(s, { health: -randInt(8, 20), happy: -4 });
  gain(-3);
  return { text: `${lead.name} was not alone, and it did not go well. You left bleeding, and you did not feel like a hero.`, tone: 'bad' };
});
defAction({
  id: 'vig_quit', cat: 'street', label: 'Hang up the hat', emoji: '🚪', desc: 'Stop. It does not erase what happened, but it stops the next one.', tags: VIG_TAGS,
  when: (s) => free(s) && !!vigOf(s),
  run: (s) => {
    const v = vigOf(s);
    const sec = webLive(s, (x) => x.kind === 'vigilante' && x.subj === s.playerId)[0];
    if (sec) delete webOf(s).secrets[sec.id];
    M(s).vig = null;
    add(s, { happy: 3, karma: 2 });
    return { text: `${v.alias} stopped showing up. For a while there were flowers where ${v.alias} had been, and then fewer. Some nights, you still listen to the radio for it.`, tone: '' };
  },
});
ACT_CATS.splice(ACT_CATS.findIndex((c) => c.id === 'crime'), 0, { id: 'street', name: 'Street Justice', emoji: '🏮' });
function vigUnmasked(s) {
  const v = vigOf(s);
  if (!v) return;
  const sec = webLive(s, (x) => x.kind === 'vigilante' && x.subj === s.playerId)[0];
  if (sec) { sec.out = true; sec.outYear = s.year; }
  const k = invOpen(s, 'vigilantism', { messy: true, ev: { wit: 30 } });
  k.prog = clamp(35 + v.heat / 3, 0, 90);
  webRepAdd(P(s), { scandal: v.wrong ? 10 : 4, name: v.wins >= 3 && !v.wrong ? 6 : -4 });
  newsPost(s, 'vigilante_end', { alias: v.alias, full: fullName(P(s)) }, true);
  M(s).vig = null;
  v.caught++;
  log(s, `🏮 ${v.alias} has a name now, and it is yours. ${v.wins >= 3 && !v.wrong ? 'Half the city is on your side. The other half has a lawyer.' : 'Nobody is on your side. Everybody has an opinion.'}`, 'bad');
}
function vigYear(s) {
  const v = vigOf(s);
  if (!v) return;
  if (!vigOn()) return; // a switch was turned off: the hat waits
  if (inPrison(s)) { vigUnmasked(s); return; }
  v.heat = clamp100(v.heat - 7);
  const sec = webLive(s, (x) => x.kind === 'vigilante' && x.subj === s.playerId)[0];
  if (sec) sec.ev = clamp100(sec.ev + Math.round(v.heat / 12));
  if (v.rep >= 25 && !v.named) { v.named = true; newsPost(s, 'vigilante', { alias: v.alias }, true); log(s, `📰 The papers have a name for whoever has been showing up: "${v.alias}". The police have asked people not to call it heroic.`, ''); }
  if (v.heat >= 45 && chance(v.heat / 260)) vigUnmasked(s);
}

/* ---- the year ------------------------------------------------------------------------------------------------------------ */
function streetYear(s) {
  if (A(s) < 14) return;
  falloutYear(s);
  vigYear(s);
}
onYear('street', streetYear);
