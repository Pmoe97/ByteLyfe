/* =====================================================================
 * 75-work-life.js — the life around the work. Two things that make a job
 * a place with people in it, both plugged into the web (62-web.js):
 *
 *   Favors     A ledger of who owes whom. Do someone a favor and they owe you one; ask for one and, unless they
 *              already owe you, you owe them. A favor owed to you can be called in on a card (a way with kind
 *              'favor': +25 points of odds, one favor spent), asked for outright (a reference, a loan, a word
 *              on your behalf, someone to vouch for you), or used to keep a secret quiet (web_silence). What
 *              you owe gets called in, sooner or later.
 *   Venues     Where the people at work actually talk: the break room, the staff lounge, the truck at lunch.
 *              Hang out and you meet people, hear things (the web's hearsay), buy a round and earn a favor,
 *              or keep your head down. The coworkers who share a venue are tied to each other, which is how
 *              a secret travels.
 *
 * M(s).favors = { pid: n }    n > 0 they owe you, n < 0 you owe them
 * M(s).favorRef = year        a reference you were promised this year (read by interviews, 15-career.js)
 * ===================================================================== */

/* ---- favors -------------------------------------------------------------------------------------- */
function favorsOf(s) { const m = M(s); return m.favors || (m.favors = {}); }
function favorN(s, pid) { return favorsOf(s)[pid] || 0; }
function favorAdd(s, pid, n) {
  const f = favorsOf(s);
  f[pid] = clamp((f[pid] || 0) + n, -3, 5);
  if (!f[pid]) delete f[pid];
}
// Who owes you, most first.
function favorsOwed(s) {
  const f = favorsOf(s);
  return Object.keys(f).filter((id) => f[id] > 0 && s.people[id] && s.people[id].alive && relOf(s, id)).sort((a, b) => f[b] - f[a]);
}
function favorTop(s) { const id = favorsOwed(s)[0]; return id ? s.people[id] : null; }
// Spend one favor owed to you (from pid, or whoever owes you most). Returns whether there was one.
function favorSpend(s, pid) {
  const id = pid && favorN(s, pid) > 0 ? pid : favorsOwed(s)[0];
  if (!id) return false;
  favorAdd(s, id, -1);
  return true;
}
const FAVOR_KINDS = ['friend', 'bestie', 'coworker', 'boss', 'neighbor', 'sibling', 'regular', 'client', 'classmate', 'cellmate'];
const favorOk = (s, pid) => reachable(s, pid) && A(s) >= 14 && FAVOR_KINDS.includes(relKind(s, pid));

defAction({
  id: 'favor_do', cat: 'person', group: 'web', target: 'person', label: 'Do them a favor', emoji: '🤝', desc: 'Something small, and they will remember it.',
  when: (s, pid) => favorOk(s, pid) && !count(s, 'favor_' + pid),
  sub: (s, pid) => (favorN(s, pid) > 0 ? 'They already owe you' : favorN(s, pid) < 0 ? 'You owe them' : 'Make a friend'),
  run: (s, pid) => {
    popup(s, {
      emoji: '🤝', title: `A favor for ${nm(s, pid)}`, text: 'What can you do for them?', handler: 'favorDo', ctx: { pid }, person: pid,
      choices: [
        { label: 'Cover their shift, or their errand', value: 'cover', sub: 'It costs you an evening' },
        { label: 'Help with something heavy', value: 'hand', sub: 'It costs you a weekend' },
        { label: 'Lend them some money', value: 'money', sub: fmtMoney(price(s, 300)), disabled: M(s).money < price(s, 300) },
        { label: 'Never mind', value: null },
      ],
    });
  },
});
onChoice('favorDo', (s, ctx, v) => {
  const p = s.people[ctx.pid];
  if (!v || !p || !p.alive || !relOf(s, ctx.pid)) return;
  if (bump(s, 'favors') > 4) return { text: 'You are stretched thin enough already. Let somebody else carry something this year.', nolog: true };
  bump(s, 'favor_' + ctx.pid);
  let n = 1, text;
  if (v === 'money') { const cost = price(s, 300); if (!pay(s, cost)) return cantAfford(cost); n = 2; text = `You handed ${p.first} the money and said it was nothing. It was not nothing, and ${pr(p).he} knew it.`; }
  else if (v === 'hand') { add(s, { happy: -1, health: -1 }); text = `You spent Saturday carrying ${p.first}'s life from one place to another. ${cap(pr(p).he)} bought you dinner, and said ${pr(p).he} owed you.`; }
  else { add(s, { happy: -1 }); text = `You covered for ${p.first} without being asked twice. ${cap(pr(p).he)} noticed.`; }
  favorAdd(s, ctx.pid, n);
  addRel(s, ctx.pid, 3 * n);
  add(s, { karma: 1 });
  return { text, tone: 'good' };
});

const FAVOR_ASKS = {
  ref: { label: 'A reference', sub: 'A word to anyone who is hiring', text: (p) => `${p.first} said you would be a good hire to anyone who asked. This year, that carries weight.` },
  loan: { label: 'A loan', sub: 'Interest-free, if they say yes', text: (p) => `${p.first} lent you the money with no interest, and no paperwork, and a look that meant something.` },
  word: { label: 'A word on your behalf', sub: 'Somebody who listens to them', text: (p) => `${p.first} made a few calls. The talk about you softened, a little.` },
  cover: { label: 'Someone to vouch for you', sub: 'The police have been asking', text: (p) => `${p.first} told the detectives you were with ${pr(p).him} all evening. ${cap(pr(p).he)} did not ask why it mattered. ${cap(pr(p).he)} will.` },
};
defAction({
  id: 'favor_ask', cat: 'person', group: 'web', target: 'person', label: 'Ask a favor', emoji: '🙏', desc: 'A reference, a loan, a word on your behalf.',
  when: (s, pid) => favorOk(s, pid) && relOf(s, pid).rel >= 40 && !count(s, 'ask_' + pid),
  sub: (s, pid) => (favorN(s, pid) > 0 ? 'They owe you, so it is free' : 'You will owe them'),
  run: (s, pid) => {
    const open = typeof invMine === 'function' ? invMine(s, (c) => c.status === 'open' && c.who === s.playerId) : [];
    const choices = ['ref', 'loan', 'word'].concat(open.length ? ['cover'] : []).map((k) => ({ label: FAVOR_ASKS[k].label, value: k, sub: FAVOR_ASKS[k].sub }));
    choices.push({ label: 'Never mind', value: null });
    popup(s, { emoji: '🙏', title: `Ask ${nm(s, pid)}`, text: favorN(s, pid) > 0 ? `${nm(s, pid)} owes you one. What do you ask for?` : `If ${nm(s, pid)} says yes, you will owe ${pr(s.people[pid]).him} one. What do you ask for?`, handler: 'favorAsk', ctx: { pid }, person: pid, choices });
  },
});
onChoice('favorAsk', (s, ctx, v) => {
  const p = s.people[ctx.pid], r = relOf(s, ctx.pid);
  if (!v || !p || !p.alive || !r) return;
  bump(s, 'ask_' + ctx.pid);
  const owed = favorN(s, ctx.pid) > 0;
  if (!owed && !chance(clamp(r.rel / 120 + skill(s, 'charisma') / 400, 0.1, 0.85))) { addRel(s, ctx.pid, -5); return { text: `${p.first} said it was not a good time. It was a polite no, and it was still a no.`, tone: 'bad' }; }
  favorAdd(s, ctx.pid, -1); // spends what they owed you, or makes you owe them
  if (v === 'ref') M(s).favorRef = s.year;
  else if (v === 'loan') add(s, { money: price(s, 1500) });
  else if (v === 'word') webRepAdd(P(s), { scandal: -4, name: 1 });
  else if (v === 'cover') {
    const c = invMine(s, (x) => x.status === 'open' && x.who === s.playerId)[0];
    if (c) { c.prog = clamp(c.prog - 12, 0, 100); const sec = c.sec && webOf(s).secrets[c.sec]; if (sec && !sec.knows.includes(p.id)) sec.knows.push(p.id); c.alibi = p.id; }
  }
  return { text: FAVOR_ASKS[v].text(p), tone: 'good' };
});

// What you owe gets called in.
function favorYear(s) {
  if (A(s) < 18 || s.dead || !free(s)) return;
  const f = favorsOf(s);
  for (const id of Object.keys(f)) if (!s.people[id] || !s.people[id].alive || !relOf(s, id)) delete f[id];
  const owe = Object.keys(f).filter((id) => f[id] < 0);
  if (owe.length && chance(0.35) && !s.pending.some((p) => p.handler === 'favorDue')) {
    const pid = pick(owe), cost = price(s, 400);
    popup(s, {
      emoji: '🤝', title: 'You owe one', handler: 'favorDue', ctx: { pid, cost }, person: pid,
      text: `${nm(s, pid)} has not mentioned it, and has not forgotten it either. ${cap(pr(s.people[pid]).he)} has a favor to ask, and it is yours to pay.`,
      choices: [{ label: 'Do it, and be done', value: 'pay', sub: `${fmtMoney(cost)} or an evening` }, { label: 'Put it off', value: 'later' }, { label: 'Refuse', value: 'no', tone: 'bad' }],
    });
  }
}
onChoice('favorDue', (s, ctx, v) => {
  const p = s.people[ctx.pid];
  if (!p || !relOf(s, ctx.pid)) return;
  if (v === 'pay') {
    if (M(s).money >= ctx.cost) add(s, { money: -ctx.cost }); else add(s, { happy: -2 });
    favorAdd(s, ctx.pid, 1); addRel(s, ctx.pid, 5); add(s, { karma: 1 });
    return { text: `You did what ${p.first} asked, and it was fine, and ${pr(p).he} said you were one of the good ones. You are even.`, tone: 'good' };
  }
  if (v === 'later') { addRel(s, ctx.pid, -4); return `You said soon. ${p.first} said no rush, in the voice of someone who is keeping count.`; }
  favorAdd(s, ctx.pid, 1); addRel(s, ctx.pid, -22); add(s, { karma: -2 });
  webRepAdd(P(s), { name: -2 });
  return { text: `You said no. ${p.first} did not argue. ${cap(pr(p).he)} just stopped calling, and told a few people why.`, tone: 'bad' };
});
// A reference you were promised this year helps with interviews (15-career.js).
function favorRefEdge(s) { return M(s).favorRef === s.year ? 0.12 : 0; }

/* ---- venues ---------------------------------------------------------------------------------------- */
const WORK_VENUES = {
  service: ['the break room', 'the back lot after close'], office: ['the break room', 'the Friday happy hour'], business: ['the lunch place downstairs', 'the client dinner'],
  transport: ['the depot canteen', 'the layover bar'], public: ['the station kitchen', 'the diner by the precinct'], trades: ['the truck at lunch', 'the site trailer'],
  health: ['the staff lounge', 'the 3 a.m. cafeteria'], tech: ['the kitchenette', 'the Thursday game night'], science: ['the coffee corner by the lab', 'the conference bar'],
  law: ['the library stacks', 'the courthouse steps'], education: ['the teachers’ lounge', 'the parking lot after the bell'], media: ['the corner of the newsroom', 'the bar across the street'],
  fame: ['the green room', 'the after-party'], sports: ['the locker room', 'the team bus'], military: ['the mess hall', 'the barracks porch'], spy: ['the canteen', 'the safe café'],
  politics: ['the corridor outside the chamber', 'the fundraiser'], night: ['the back office', 'the staff room before the doors open'],
};
function venuesFor(s) { const c = M(s).career; return c ? WORK_VENUES[JOBS[c.id].cat] || ['the break room', 'the parking lot'] : []; }
const venueOk = (s) => free(s) && A(s) >= 16 && !!M(s).career && relPeople(s, ['coworker', 'boss']).length > 0;
defAction({
  id: 'wv_hang', cat: 'job', label: 'Hang out where people talk', emoji: '☕', desc: 'The break room, the lounge, the truck at lunch. Where things get said.',
  when: (s) => venueOk(s) && count(s, 'venue') < 2,
  sub: (s) => cap(venuesFor(s)[count(s, 'venue') % 2]),
  run: (s) => {
    const v = venuesFor(s)[count(s, 'venue') % 2];
    bump(s, 'venue');
    popup(s, {
      emoji: '☕', title: cap(v), handler: 'venueGo', ctx: { v },
      text: `It is ${v}, and a few people from work are there. Nobody is working. This is where the real work gets done.`,
      choices: [
        { label: 'Join the conversation', value: 'join', sub: 'Listen, mostly' },
        { label: 'Buy a round, or bring something', value: 'round', sub: fmtMoney(price(s, 40)), disabled: M(s).money < price(s, 40) },
        { label: 'Take a side in an argument', value: 'side', tone: 'bad', sub: 'Risky' },
        { label: 'Keep to yourself', value: 'alone' },
      ],
    });
  },
});
onChoice('venueGo', (s, ctx, v) => {
  const crew = relPeople(s, ['coworker', 'boss']);
  if (!crew.length || !M(s).career) return;
  const a = pick(crew), b = pick(crew.filter((x) => x.id !== a.id)) || a;
  if (v === 'alone') { add(s, { happy: 1 }); return 'You ate your lunch in peace. It was nice, and it was also a little lonely.'; }
  if (v === 'round') {
    const cost = price(s, 40);
    if (!pay(s, cost)) return cantAfford(cost);
    addRel(s, a.id, 5); addRel(s, b.id, 3); favorAdd(s, a.id, 1);
    M(s).career.perf = clamp100(M(s).career.perf + 2);
    return { text: `You bought the round, and ${a.first} said ${pr(a).he} owed you one, and meant it.`, tone: 'good' };
  }
  if (v === 'side') {
    if (chance(clamp(0.45 + skill(s, 'charisma') / 300, 0.15, 0.8))) { addRel(s, a.id, 6); addRel(s, b.id, -4); M(s).career.perf = clamp100(M(s).career.perf + 3); return { text: `You said what half the room was thinking. ${a.first} will remember it, and so will everyone else.`, tone: 'good' }; }
    addRel(s, a.id, -8); addRel(s, b.id, -8); M(s).career.perf = clamp100(M(s).career.perf - 4);
    return { text: 'You picked the wrong side, loudly. The conversation moved on without you.', tone: 'bad' };
  }
  // join: you meet people, and you hear things
  addRel(s, a.id, 3); addRel(s, b.id, 2);
  if (typeof webLink === 'function') webLink(s, a.id, b.id, 'work'); // coworkers who share a venue talk to each other
  const heard = venueGossip(s, a, crew);
  return heard ? { text: `${a.first} and ${b.first} got talking, and you listened.`, tone: '' } : `You swapped stories with ${a.first} and ${b.first}. Nothing happened, which is what the break room is for.`;
});
// Somebody at work has something going on, and somebody else lets it slip.
function venueGossip(s, from, crew) {
  if (!chance(0.4)) return false;
  const subjs = crew.filter((x) => x.id !== from.id && ageOf(s, x) >= 20 && !webLive(s, (y) => y.subj === x.id).length);
  if (!subjs.length) return false;
  const subj = pick(subjs);
  const kind = weighted(['npc_debt', 'npc_fired', 'npc_habit', 'npc_crime'], (k) => ({ npc_debt: 3, npc_fired: subj.job && subj.job.id ? 2 : 0, npc_habit: 2, npc_crime: 1 }[k]));
  if (!kind) return false;
  const o = { ev: 20 };
  if (kind === 'npc_crime') o.note = pick(NPC_CRIME_NOTES);
  if (kind === 'npc_habit') o.note = pick(NPC_HABIT_NOTES);
  const sec = webNewSecret(s, kind, subj.id, o);
  sec.knows.push(from.id);
  webLearn(s, sec, s.playerId, from.id);
  return true;
}
EV('wv_party', {
  ages: [18, 70], w: 0.9, emoji: '🎈', title: 'The work party', cooldown: 3,
  when: (s) => free(s) && !!M(s).career && relPeople(s, ['coworker', 'boss']).length > 0,
  text: (s) => `It is the ${pick(['holiday', 'summer', 'end-of-quarter', 'retirement'])} party, at ${pick(venuesFor(s))} and a rented room. Everyone is a little more themselves than usual.`,
  choices: [
    ['Mingle, with a plan', (s) => { const crew = relPeople(s, ['coworker', 'boss']); for (const p of crew.slice(0, 3)) addRel(s, p.id, 4); M(s).career.perf = clamp100(M(s).career.perf + 3); const a = pick(crew); if (a) favorAdd(s, a.id, 1); return { text: 'You talked to everyone you meant to, and a few you did not. Somebody said you were great to work with, in front of the boss.', tone: 'good' }; }],
    ['Stay for an hour, then go', (s) => { add(s, { happy: 1 }); return 'You showed your face and left before it got interesting.'; }],
    ['Have far too good a time', (s) => { const crew = relPeople(s, ['coworker', 'boss']); if (chance(0.35)) { webRepAdd(P(s), { scandal: 3, name: -2 }); M(s).career.perf = clamp100(M(s).career.perf - 5); for (const p of crew.slice(0, 2)) addRel(s, p.id, -4); return { text: 'There is a video. You are in it. Monday is going to be long.', tone: 'bad' }; } add(s, { happy: 4 }); for (const p of crew.slice(0, 3)) addRel(s, p.id, 5); return { text: 'You were the life of the party, and nobody can say otherwise. It was a great night.', tone: 'good' }; }],
  ],
});
