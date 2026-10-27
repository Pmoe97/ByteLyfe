/* =====================================================================
 * 80-ransom.js — the other side of the note. Behind the Mature and
 * Violence switches (VIO_TAGS, 72-violence.js), adults only: somebody you
 * know — never a child — has been "taken," and you are the one who gets
 * the note. Sometimes it is real, and sometimes it is serious, and sometimes
 * the person on the other end is a profoundly bad kidnapper, a group chat,
 * a family that wanted to skip a dinner, or the person themselves in a
 * trench coat. The game does not have to be dark all the time.
 *
 * kn_ransom (an event) builds one: who, from whom (RANSOM_TYPES), what the note is pinned with, what it
 * asks, and what will happen (every choice is "what do you do," and the truth is settled when the event fires).
 *   real   the person is held, by somebody; what you do decides how it ends. A serious note can end badly if
 *          you ignore it, and never in graphic terms.
 *   hoax   it was never real, and how it comes apart is RANSOM_REVEALS (the funnier half of the file).
 * ===================================================================== */

const RANSOM_TYPES = {
  amateur: { name: 'a pair of amateurs', tone: 0.25, real: 0.85, dem: [0.002, 0.01], w: 3, rescue: 0.8, ignoreEnds: 'They gave up after a week, got hungry, and let the person go at a gas station. They left a thank-you note on the door of your car.' },
  syndicate: { name: 'a professional crew', tone: 0.95, real: 1, dem: [0.04, 0.2], w: 1.2, rescue: 0.45, serious: true, rich: true },
  rival: { name: 'somebody who has been waiting a long time to hurt you', tone: 0.8, real: 1, dem: [0.02, 0.1], w: 1, rescue: 0.55, serious: true },
  eccentric: { name: 'someone with a very particular vision', tone: 0.15, real: 0.5, dem: [0.0005, 0.003], w: 2, rescue: 0.9, ignoreEnds: 'They released the person after two days, citing "creative differences with the plan."' },
  prank: { name: 'a group chat', tone: 0.05, real: 0, dem: [0.0002, 0.001], w: 2, rescue: 1 },
  self: { name: 'the person themselves', tone: 0.1, real: 0, dem: [0.002, 0.02], w: 2.4, rescue: 1 },
  mixup: { name: 'a monumental misunderstanding', tone: 0.05, real: 0, dem: [0.0001, 0.0005], w: 1.4, rescue: 1 },
};
const RANSOM_OBJECTS = {
  serious: ['a bloody knife', 'a knife driven through a photograph', 'a single black glove', 'a lock of hair in a plastic bag', 'a hotel key card, wrapped in tape'],
  silly: ['a rubber chicken', 'a very small knife', 'a plastic fork', 'a sticky note', 'a glitter-covered envelope', 'a crayon drawing of a knife', 'a salami', 'a postcard from a beach nobody has been to', 'a staple gun, for some reason', 'a note-card with a cartoon skull and a smiley face'],
};
const RANSOM_THREATS = {
  serious: ['you will never see them again', 'the next note will not be so polite', 'we will not be asked twice', 'you will hear from us, and you will not like how', 'you have forty-eight hours', 'what happens next is on you'],
  silly: ['leave a one-star review of your house', 'mail you one glitter bomb a week, for a year', 'teach their parrot your passwords', 'sing at you, in public, at length', 'alphabetize your entire spice rack', 'enter you in a hot-dog eating contest without your consent', 'tell everyone what you did at your birthday party', 'replace every bulb in your house with one slightly dimmer', 'send a mariachi band to every holiday', 'learn your coffee order and get it wrong, forever', 'rearrange your furniture by one inch', 'start a podcast about you', 'park a very small car in front of your very large one'],
};
const RANSOM_ASKS = {
  serious: (amt) => `${fmtMoney(amt)}, in cash, in a bag`,
  mid: (amt) => `${fmtMoney(amt)} in bitcoin`,
  silly: [(s) => `${fmtMoney(price(s, 250e6))} in bitcoin`, 'forty thousand gift cards (any store)', 'one (1) very large wheel of cheese', 'a lifetime supply of pickles', (s) => `${fmtMoney(price(s, 100))} and a sandwich`, 'three goats', 'a sincere apology', 'a mid-sized yacht, "lightly used"', 'every sock you own, left foot only', 'a framed photograph of the mayor', 'a fully catered dinner for eleven', 'a very good parking space'],
};
// How the hoaxes come apart. {{name}} is the person; "they" is anyone.
const RANSOM_REVEALS = {
  self: [
    'Turns out {{name}} sent the note. They were arrested at the airport while trying to smuggle themselves out of the country inside a dead lion. Nobody will say where the lion came from.',
    '{{name}} turned themselves in after their dog gave them the sad eyes in the interrogation room. The dog was, in the end, a witness.',
    '{{name}} had faked it to get out of a family dinner, and was caught when the family dinner moved to the hotel where they were hiding.',
    '{{name}} was found in a hotel bathtub with a tiny crown, a great deal of room service, and a signed contract with a streaming service for "the true story."',
    '{{name}} was "kidnapped" by a limousine they had hired themselves, and was discovered when the driver asked for a tip.',
    '{{name}} had wanted a quiet weekend, and worked out how to do it only after writing the note. They apologized with a basket of muffins.',
    'The kidnapper was {{name}} in a ski mask. They had put a hat on the ski mask, and could not understand why it was so easy to identify.',
    '{{name}} was caught on a security camera, taping the note to your door, wearing a sign that said "KIDNAPPER." It was a prop. It was also a mistake.',
    '{{name}} had been holding themselves hostage in a spare room for four days. They released themselves, citing "good behavior."',
    '{{name}} wanted to see if you would pay. You are, they said later, a better friend than they deserved, and a worse negotiator.',
  ],
  prank: [
    'It was your group chat. Every one of them, plus a person you have never met, who had joined "for the bit." There is a spreadsheet. There is a bit.',
    '{{name}} and four others "kidnapped" a cardboard cutout of {{name}} and mailed you the ransom. They have apologized in a document with a font.',
    'The whole thing was a surprise party that had gone horribly off the rails. The cake is fine. The cake is the only thing that is.',
    'It was an escape-room that went one room further than it should have. You are the first person to ever "win" it by calling the police.',
    'It was a very elaborate bet, now settled. {{name}} owes a friend a round of drinks and a favor.',
  ],
  mixup: [
    '{{name}} was not kidnapped. They were at a pottery retreat with their phone off. The note was meant for somebody else with a similar name, and a considerably worse landlord.',
    'It was addressed to a different {{name}} entirely. The kidnappers have been very apologetic about it, and have sent a fruit basket.',
    '{{name}} was fine. The "kidnapper" was a neighbor who had found a note in a book and misread it as an actual plan.',
    '{{name}} had gone on a spontaneous trip to see a lighthouse. The lighthouse was lovely. The phone was not.',
    'A children’s play, a very good one, in which {{name}} was the villain. Nobody had told the audience. Several of them called you.',
  ],
  eccentric: [
    'The "kidnapper" turned out to be a local retiree who had read too many novels. They released {{name}} with a lemon cake and a stern talking-to about "plot."',
    'It was an art installation, "Ransom, 2026." {{name}} was an unwitting participant, and has been offered a stipend and a very small trophy.',
    'The kidnapper had a lot of notes, and a very elaborate plan, and a van that would not start. They are now in a support group.',
    'It was a performance, said the kidnapper, "about vulnerability." {{name}} has been named a co-author.',
  ],
};
// How a real one can end.
const RANSOM_REAL = {
  paid_ok: ['The handoff was at a rest stop at dawn. {{name}} was waiting in the back of a parked car, shaken and fine, and did not say a word until you were both on the highway.', 'A bag, a phone call, a long wait. {{name}} walked out of an alley ten minutes later and into your arms.'],
  paid_bad: ['The handoff was a mess, and the money is gone. {{name}} was released anyway, a week later, thin and quiet. It took a very long time to be able to talk about it.'],
  police_ok: ['A quiet team found {{name}} in a storage unit on the edge of town, tired and unharmed. The police commissioner called it "textbook." {{name}} called it a lot of other things, with relief.', 'The detectives worked the note, the paper, and a coffee receipt. {{name}} was home in thirty hours.'],
  police_bad: ['The kidnappers panicked when the police came, and {{name}} was released, shaken, in a parking lot. The case is still open. So are you.'],
  ignored_bad: ['Nobody paid, and nobody came. {{name}} was released eventually, with no help from you. {{name}} has not forgotten that. You have not either.'],
  tragic: ['{{name}} did not come home. The note had meant it, and so had they. There is no joke in this one, and nothing you can say that will fit in the room.'],
  self_found: ['You looked into it yourself, asked the right people, and found {{name}} before the deadline. It took a lot of phone calls and a very good friend.'],
};
const RANSOM_COUNTER = [
  'You sent back a firm handshake, a coupon for a free appetizer, and a note that said "No."',
  'You offered half the demand and a gentle suggestion that they find a hobby.',
  'You replied with a single, laminated card reading "I have a lawyer, and I have a plan."',
  'You counter-offered with a casserole, a full apology and a request to re-open negotiations on better terms.',
];

function ransomPick(s) {
  const cands = relPeople(s).filter((p) => ageOf(s, p) >= 18 && relOf(s, p.id) && relKind(s, p.id) !== 'captive');
  return cands.length ? pick(cands) : null;
}
function ransomBuild(s) {
  const p = ransomPick(s);
  if (!p) return null;
  const nw = Math.max(0, netWorth(s));
  const types = Object.keys(RANSOM_TYPES).filter((k) => !RANSOM_TYPES[k].rich || nw > 100000);
  const type = weighted(types, (k) => RANSOM_TYPES[k].w), T = RANSOM_TYPES[type];
  const truth = chance(T.real) ? 'real' : 'hoax';
  const serious = !!T.serious || chance(T.tone * 0.6);
  const frac = randFloat(T.dem[0], T.dem[1]);
  const real = clamp(Math.round(nw * frac), price(s, 300), price(s, 8e6));
  const silly = !serious || T.tone < 0.3;
  const sillyAsk = (() => { const a = pick(RANSOM_ASKS.silly); return typeof a === 'function' ? a(s) : a; })();
  const ask = silly && chance(0.7) ? sillyAsk : T.tone > 0.6 ? RANSOM_ASKS.serious(real) : RANSOM_ASKS.mid(real);
  return { pid: p.id, type, truth, obj: pick(silly ? RANSOM_OBJECTS.silly : RANSOM_OBJECTS.serious), threat: pick(silly ? RANSOM_THREATS.silly : RANSOM_THREATS.serious), ask, amt: silly && ask !== RANSOM_ASKS.mid(real) ? price(s, randInt(15, 400)) : real, rel: kinTitle(s, p.id), full: fullName(p), name: p.first };
}
const ransomFill = (str, c) => String(str).replace(/\{\{(\w+)\}\}/g, (x, k) => (c[k] === undefined ? '' : c[k]));
EV('kn_ransom', {
  ages: [20, 90], w: 0.45, emoji: '✉️', title: 'A note on your door', tags: VIO_TAGS, cooldown: 6,
  when: (s) => free(s) && !!ransomPick(s),
  ctx: (s) => ransomBuild(s),
  text: (s, c) => `A ransom note is attached to your door with ${c.obj}. It reads: "We have kidnapped ${c.full} (${c.rel}). Send us ${c.ask}, or else we will ${c.threat}."`,
  choices: [
    ['Pay what they ask', (s, c) => ransomPlay(s, c, 'pay')],
    ['Haggle', (s, c) => ransomPlay(s, c, 'haggle')],
    ['Call the police', (s, c) => ransomPlay(s, c, 'police')],
    ['Look into it yourself', (s, c) => ransomPlay(s, c, 'look')],
    ['Do not send money. Do not call the police.', (s, c) => ransomPlay(s, c, 'ignore')],
    ['Send a counter-offer', (s, c) => ransomPlay(s, c, 'counter')],
  ],
});
function ransomPlay(s, c, how) {
  const p = s.people[c.pid], T = RANSOM_TYPES[c.type];
  if (!p || !p.alive || !relOf(s, c.pid)) return 'By the time you had decided, it was already settled.';
  const rel = (d) => { if (relOf(s, c.pid)) addRel(s, c.pid, d); };
  newsPost(s, 'ransom', { full: c.full, name: c.name }, true);
  const end = (text, tone) => { newsPost(s, 'ransom_end', { full: c.full, name: c.name, how: ransomFill(text, c) }, true); return { text: ransomFill(text, c), tone: tone || '', emoji: '✉️', title: 'The note' }; };
  const tragic = () => { if (p.alive) npcDies(s, p, 'a kidnapping gone wrong', { murdered: true }); add(s, { happy: -22 }); return end(pick(RANSOM_REAL.tragic), 'bad'); };
  if (how === 'counter') {
    add(s, { happy: 2 });
    if (c.truth === 'hoax') return end(`${pick(RANSOM_COUNTER)} ${pick(RANSOM_REVEALS[c.type] || RANSOM_REVEALS.self)}`, 'good');
    return end(`${pick(RANSOM_COUNTER)} It was not received well. ${pick(RANSOM_REAL.ignored_bad)}`, 'bad');
  }
  if (c.truth === 'hoax') {
    const reveal = pick(RANSOM_REVEALS[c.type] || RANSOM_REVEALS.self);
    if (how === 'pay') { const cost = Math.min(c.amt, Math.max(0, M(s).money)); add(s, { money: -cost }); rel(c.type === 'self' ? -8 : -3); return end(`You paid ${fmtMoney(cost)}. ${reveal} The money is, apparently, a matter for the lawyers.`, 'bad'); }
    if (how === 'haggle') { const cost = Math.round(Math.min(c.amt, Math.max(0, M(s).money)) / 3); add(s, { money: -cost }); return end(`You got it down to ${fmtMoney(cost)}, which is the best price anyone has ever paid for a hoax. ${reveal}`, ''); }
    if (how === 'police') { add(s, { karma: 1 }); return end(`The police took it very seriously for about a day. ${reveal}`, 'good'); }
    if (how === 'look') { add(s, { happy: 2 }); rel(2); return end(`You asked around, and it took one phone call. ${reveal}`, 'good'); }
    add(s, { happy: 3 }); // ignored: the funniest outcome is that it was fine
    return end(`You did nothing, which is exactly what the situation called for. ${reveal}`, 'good');
  }
  // real
  const mine = skill(s, 'streetwise') / 300 + skill(s, 'charisma') / 400;
  if (how === 'pay') {
    const cost = Math.min(c.amt, Math.max(0, M(s).money));
    if (cost <= 0 && c.amt > 0) return 'You did not have it, and neither did anyone you could ask.';
    add(s, { money: -cost });
    if (chance(0.85)) { rel(18); return end(`${pick(RANSOM_REAL.paid_ok)} It cost ${fmtMoney(cost)}.`, 'good'); }
    rel(6); add(s, { happy: -4 });
    return end(`${pick(RANSOM_REAL.paid_bad)} It cost ${fmtMoney(cost)}.`, 'bad');
  }
  if (how === 'haggle') {
    const cost = Math.round(Math.min(c.amt, Math.max(0, M(s).money)) * 0.5);
    if (chance(clamp(0.45 + mine - (T.serious ? 0.2 : 0), 0.1, 0.8))) { add(s, { money: -cost }); rel(14); return end(`You got it down to ${fmtMoney(cost)}. ${pick(RANSOM_REAL.paid_ok)}`, 'good'); }
    rel(-6); add(s, { happy: -3 });
    return end(`They did not like being haggled with. ${pick(RANSOM_REAL.paid_bad)}`, 'bad');
  }
  if (how === 'police') {
    if (chance(clamp(T.rescue + mine * 0.2, 0.2, 0.95))) { rel(12); add(s, { karma: 1 }); return end(pick(RANSOM_REAL.police_ok), 'good'); }
    if (T.serious && chance(0.08)) return tragic();
    rel(-4); add(s, { happy: -4 });
    return end(pick(RANSOM_REAL.police_bad), 'bad');
  }
  if (how === 'look') {
    if (chance(clamp(0.35 + mine, 0.1, 0.75))) { rel(16); add(s, { karma: 1 }); return end(pick(RANSOM_REAL.self_found), 'good'); }
    add(s, { money: -Math.min(Math.max(0, M(s).money), price(s, 500)), happy: -3 });
    return end(`You asked a lot of questions, and spent a lot of money, and found nothing. ${pick(RANSOM_REAL.police_bad)}`, 'bad');
  }
  // ignored, for real
  if (T.ignoreEnds) { rel(-10); return end(`${T.ignoreEnds} ${c.name} has opinions about how you handled it.`, ''); }
  if (T.serious && chance(0.25)) return tragic();
  rel(-25); add(s, { happy: -6 });
  return end(pick(RANSOM_REAL.ignored_bad), 'bad');
}
