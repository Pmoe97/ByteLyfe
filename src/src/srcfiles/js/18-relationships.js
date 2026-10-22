/* =====================================================================
 * 18-relationships.js — interacting with people, dating, marriage,
 * babies, adoption, and pets.
 *
 * Person interactions are actions with cat 'person' and target = person id.
 * The relationship meter lives in M(s).rels[pid].rel (0-100).
 * ===================================================================== */

const K_FAMILY = ['parent', 'stepparent', 'sibling', 'halfsibling', 'grandparent', 'child', 'grandchild', 'inlaw'];
const K_ROMANCE = ['partner', 'fiance', 'spouse', 'lover'];
const K_FRIENDS = ['friend', 'bestie'];
const K_ACQ = ['classmate', 'coworker', 'boss', 'cellmate'];
const K_EXES = ['ex', 'exspouse'];

function tgt(s, pid) { return s.people[pid]; }
function tAge(s, pid) { return ageOf(s, s.people[pid]); }
function isKind(s, pid, kinds) { const r = relOf(s, pid); return !!r && kinds.includes(r.kind); }
// Can you interact with this person at all right now?
function reachable(s, pid) {
  const p = tgt(s, pid);
  if (!p || !p.alive || s.dead || !relOf(s, pid)) return false;
  if (inPrison(s)) return relKind(s, pid) === 'cellmate';
  return A(s) >= 3;
}
function relGain(s, pid, base) {
  const n = bump(s, 'rel_' + pid);
  return addRel(s, pid, Math.max(1, Math.round(base / n)));
}

/* ---- everyday interactions ---------------------------------------- */
const TIME_TEXT = {
  parent: ['baked cookies', 'went to the park', 'watched a movie', 'worked on a puzzle', 'went fishing', 'cooked dinner together', 'played board games'],
  sibling: ['played video games', 'built a blanket fort', 'raced bikes', 'binged a TV show', 'traded secrets', 'went to the mall'],
  child: ['played hide and seek', 'built a sandcastle', 'went to the zoo', 'baked cupcakes', 'had a water balloon fight', 'went to the playground'],
  romance: ['had a picnic', 'went stargazing', 'took a cooking class', 'went dancing', 'cuddled on the couch', 'took a long walk'],
  friend: ['went bowling', 'played laser tag', 'grabbed coffee', 'went to a concert', 'played cards', 'went hiking', 'had a movie marathon'],
  other: ['grabbed lunch', 'chatted for a while', 'took a walk', 'played cards'],
};
function timeGroup(kind) {
  if (['parent', 'stepparent', 'grandparent', 'inlaw'].includes(kind)) return 'parent';
  if (['sibling', 'halfsibling'].includes(kind)) return 'sibling';
  if (['child', 'grandchild'].includes(kind)) return 'child';
  if (K_ROMANCE.includes(kind)) return 'romance';
  if (K_FRIENDS.includes(kind)) return 'friend';
  return 'other';
}
defAction({
  id: 'p_time', cat: 'person', target: 'person', label: 'Spend time', emoji: '💞',
  when: (s, pid) => reachable(s, pid) && relKind(s, pid) !== 'enemy',
  run: (s, pid) => {
    const r = relGain(s, pid, randInt(5, 11));
    add(s, { happy: randInt(1, 3) });
    const what = pick(TIME_TEXT[timeGroup(r.kind)]);
    if (tAge(s, pid) < 2) return `You cuddled baby ${nm(s, pid)}.`;
    return `You and ${kinOf(s, pid)} ${nm(s, pid)} ${what}.`;
  },
});
const TOPICS = ['the weather', 'movies', 'their job', 'politics', 'old memories', 'conspiracy theories', 'the meaning of life', 'food', 'sports', 'music', 'the neighbors', 'aliens', 'school', 'their dreams'];
defAction({
  id: 'p_talk', cat: 'person', target: 'person', label: 'Conversation', emoji: '💬',
  when: (s, pid) => reachable(s, pid) && A(s) >= 4 && tAge(s, pid) >= 3,
  run: (s, pid) => {
    const topic = pick(TOPICS);
    let odds = 0.75 + (trait(s, 'funny') ? 0.1 : 0) + skill(s, 'charisma') / 500;
    if (relKind(s, pid) === 'enemy') odds = 0.3;
    if (chance(odds)) { relGain(s, pid, randInt(2, 6)); return `You had a great conversation with ${nm(s, pid)} about ${topic}.`; }
    addRel(s, pid, -randInt(2, 6));
    return `You and ${nm(s, pid)} got into a disagreement about ${topic}.`;
  },
});
defAction({
  id: 'p_compliment', cat: 'person', target: 'person', label: 'Compliment', emoji: '🌷',
  when: (s, pid) => reachable(s, pid) && A(s) >= 5 && tAge(s, pid) >= 4,
  run: (s, pid) => {
    const what = pick(['smile', 'style', 'cooking', 'sense of humor', 'laugh', 'intelligence', 'taste in music', 'kindness']);
    if (chance(0.85)) { relGain(s, pid, randInt(2, 6)); return `You complimented ${nm(s, pid)}'s ${what}. They lit up.`; }
    return `You complimented ${nm(s, pid)}'s ${what}. It came out weird.`;
  },
});
defAction({
  id: 'p_hug', cat: 'person', target: 'person', label: 'Hug', emoji: '🤗',
  when: (s, pid) => reachable(s, pid) && A(s) >= 2 && isKind(s, pid, [...K_FAMILY, ...K_ROMANCE, ...K_FRIENDS]),
  run: (s, pid) => { relGain(s, pid, randInt(2, 5)); add(s, { happy: 1 }); return `You gave ${nm(s, pid)} a big hug.`; },
});
defAction({
  id: 'p_gift', cat: 'person', target: 'person', label: 'Give a gift', emoji: '🎁',
  when: (s, pid) => reachable(s, pid) && A(s) >= 6,
  run: (s, pid) => {
    const tiers = [['A small gift', 20], ['A nice gift', 120], ['A generous gift', 600], ['An extravagant gift', 4000]];
    popup(s, {
      emoji: '🎁', title: 'Gift for ' + nm(s, pid), handler: 'gift', ctx: { pid },
      choices: tiers.map(([l, c]) => ({ label: l, value: price(s, c), sub: fmtMoney(price(s, c)), disabled: M(s).money < price(s, c) })).concat([{ label: 'Never mind', value: 0 }]),
    });
  },
});
onChoice('gift', (s, ctx, amt) => {
  if (!amt || !s.people[ctx.pid]) return;
  if (!pay(s, amt)) return cantAfford(amt);
  const boost = clamp(Math.round(Math.log10(amt / econ(s)) * 4), 2, 20);
  addRel(s, ctx.pid, boost);
  add(s, { happy: 1, karma: 1 });
  const item = pick(['a book', 'a scarf', 'a watch', 'concert tickets', 'a fancy candle', 'a framed photo', 'a gift card', 'a plant', 'chocolates', 'a video game']);
  return `You gave ${nm(s, ctx.pid)} ${item}. ${boost > 10 ? 'They were overwhelmed.' : 'They appreciated it.'}`;
});
defAction({
  id: 'p_ask_money', cat: 'person', target: 'person', label: 'Ask for money', emoji: '🙏',
  when: (s, pid) => reachable(s, pid) && A(s) >= 5 && tAge(s, pid) >= 16 && (isKind(s, pid, ['parent', 'stepparent', 'grandparent']) || relOf(s, pid).rel >= 70),
  run: (s, pid) => {
    const p = tgt(s, pid);
    if (bump(s, 'askmoney_' + pid) > 2) { addRel(s, pid, -6); return `${p.first} is tired of you asking for money.`; }
    const r = relOf(s, pid);
    const odds = clamp(r.rel / 100 - (A(s) > 25 ? 0.2 : 0), 0.05, 0.9);
    if (p.money > 50 && chance(odds)) {
      const amt = Math.max(1, Math.round(Math.min(p.money * randFloat(0.002, 0.03), price(s, A(s) < 13 ? 40 : A(s) < 18 ? 300 : 5000) * randFloat(0.3, 1.2))));
      p.money -= amt;
      add(s, { money: amt });
      addRel(s, pid, -1);
      return `${p.first} gave you ${fmtMoney(amt)}.`;
    }
    addRel(s, pid, -3);
    return `${p.first} said no.`;
  },
});
defAction({
  id: 'p_argue', cat: 'person', target: 'person', label: 'Argue', emoji: '😤',
  when: (s, pid) => reachable(s, pid) && A(s) >= 4 && tAge(s, pid) >= 4,
  run: (s, pid) => {
    const r = addRel(s, pid, -randInt(5, 14));
    const about = pick(['money', 'chores', 'politics', 'nothing at all', 'the past', 'whose turn it was', 'their attitude']);
    if (r.rel < 15 && !isFamilyKind(r.kind) && !K_ROMANCE.includes(r.kind) && chance(0.5)) {
      setRel(s, pid, 'enemy', r.rel);
      return `You got into a screaming match with ${nm(s, pid)} about ${about}. You're enemies now.`;
    }
    return `You argued with ${nm(s, pid)} about ${about}.`;
  },
});
defAction({
  id: 'p_insult', cat: 'person', target: 'person', label: 'Insult', emoji: '🗯️',
  when: (s, pid) => reachable(s, pid) && A(s) >= 4 && tAge(s, pid) >= 4,
  run: (s, pid) => {
    const r = addRel(s, pid, -randInt(8, 18));
    add(s, { karma: -1 });
    const jab = pick(['their haircut', 'their cooking', 'their intelligence', 'their laugh', 'their taste in music', 'their shoes', 'their life choices']);
    if (r.rel < 12 && !isFamilyKind(r.kind) && !K_ROMANCE.includes(r.kind)) setRel(s, pid, 'enemy', r.rel);
    if (trait(s, 'hotheaded') && chance(0.2)) return `You mocked ${nm(s, pid)}'s ${jab}. It nearly came to blows.`;
    return `You made fun of ${nm(s, pid)}'s ${jab}.`;
  },
});
defAction({
  id: 'p_prank', cat: 'person', target: 'person', label: 'Prank', emoji: '🃏',
  when: (s, pid) => reachable(s, pid) && A(s) >= 6 && tAge(s, pid) >= 6,
  run: (s, pid) => {
    const prank = pick(['put salt in their coffee', 'hid all their left shoes', 'covered their car in sticky notes', 'swapped their shampoo for mayo', 'set every clock an hour ahead']);
    if (chance(0.5 + (trait(s, 'funny') ? 0.25 : 0))) { relGain(s, pid, randInt(1, 5)); add(s, { happy: 3 }); return `You ${prank}. ${nm(s, pid)} laughed it off.`; }
    addRel(s, pid, -randInt(4, 10));
    return `You ${prank}. ${nm(s, pid)} did not find it funny.`;
  },
});

/* ---- petty stuff ---------------------------------------------------- */
const TANTRUMS = {
  kid: ['threw yourself on the floor and kicked', 'held your breath until you turned purple', 'screamed in the middle of the grocery store', 'went completely limp in a parking lot'],
  teen: ['slammed every door in the house', 'gave a speech about how your life is ruined', 'refused to leave your room for three days', 'sighed loudly at dinner for a week'],
  adult: ['stomped your feet in their kitchen', 'threw a full tantrum at a family dinner', 'lay on their living room floor and wailed', 'called them eleven times in a row'],
};
defAction({
  id: 'p_tantrum', cat: 'person', target: 'person', label: 'Throw a tantrum', emoji: '😫', desc: 'Scream until they pay up.',
  when: (s, pid) => reachable(s, pid) && A(s) >= 3 && isKind(s, pid, ['parent', 'stepparent', 'grandparent']) && tAge(s, pid) >= 18,
  run: (s, pid) => {
    const p = tgt(s, pid), a = A(s);
    if (bump(s, 'tantrum_' + pid) > 1) { addRel(s, pid, -8); return `${p.first} put on noise-cancelling headphones. They've built up a tolerance.`; }
    const scene = pick(TANTRUMS[a < 10 ? 'kid' : a < 18 ? 'teen' : 'adult']);
    // Little kids get results. Grown adults get stared at.
    const odds = (a < 8 ? 0.55 : a < 13 ? 0.4 : a < 18 ? 0.25 : 0.08) + (relOf(s, pid).rel - 50) / 200;
    if (p.money > 20 && chance(clamp(odds, 0.03, 0.8))) {
      const amt = Math.max(1, Math.round(Math.min(p.money * randFloat(0.003, 0.04), price(s, a < 13 ? 60 : a < 18 ? 400 : 2000) * randFloat(0.4, 1.3))));
      p.money -= amt;
      add(s, { money: amt, karma: -1 });
      addRel(s, pid, -randInt(3, 7));
      return `You ${scene}. ${p.first} gave you ${fmtMoney(amt)} just to make it stop.`;
    }
    addRel(s, pid, -randInt(5, 10));
    add(s, { happy: -3 });
    return a < 18 ? `You ${scene}. ${p.first} grounded you instead.` : `You ${scene}. ${p.first} just stared at you until you stopped.`;
  },
});
defAction({
  id: 'p_tp', cat: 'person', target: 'person', label: 'Toilet-paper their house', emoji: '🧻',
  sub: (s) => fmtMoney(price(s, 15)),
  when: (s, pid) => reachable(s, pid) && A(s) >= 10 && tAge(s, pid) >= 10 && isKind(s, pid, [...K_FRIENDS, 'enemy', 'classmate', 'coworker', 'boss', ...K_EXES, 'inlaw']),
  run: (s, pid) => {
    const p = tgt(s, pid);
    if (bump(s, 'tp_' + pid) > 1) return { text: `${p.first} has been watching their yard every night since last time.`, nolog: true };
    const cost = price(s, 15);
    if (!pay(s, cost)) return cantAfford(cost);
    add(s, { karma: -2 });
    if (A(s) >= 12 && chance(0.08)) { addRel(s, pid, -randInt(8, 15)); return arrest(s, 'vandalism'); }
    if (chance(0.25 - (trait(s, 'cunning') ? 0.1 : 0))) {
      const r = addRel(s, pid, -randInt(8, 16));
      if (trait(s, 'funny') && chance(0.4) && r.kind !== 'enemy') { relGain(s, pid, 6); return `${p.first} caught you mid-throw, then grabbed a roll and helped.`; }
      if (r.rel < 15 && !isFamilyKind(r.kind)) setRel(s, pid, 'enemy', r.rel);
      return `${p.first} spotted you from the window. They know it was you.`;
    }
    add(s, { happy: relKind(s, pid) === 'enemy' ? 7 : 4 });
    return vary(`You draped ${p.first}'s {trees|whole front yard|mailbox and both cars} in toilet paper. {It looked like a winter wonderland.|It rained that night. It's papier-mâché now.|Nobody saw a thing.}`);
  },
});
defAction({
  id: 'p_yell', cat: 'person', target: 'person', label: 'Yell at them', emoji: '📢',
  when: (s, pid) => reachable(s, pid) && A(s) >= 4 && tAge(s, pid) >= 4,
  run: (s, pid) => {
    const p = tgt(s, pid), kind = relKind(s, pid);
    if (bump(s, 'yell_' + pid) > 2) return { text: `${p.first} walks the other way when they see you coming now.`, nolog: true };
    const over = pick(['chewing too loudly', 'breathing weird', 'looking at you funny', 'taking the last cookie', 'humming the same song all day', 'standing too close', 'nothing in particular']);
    add(s, { karma: -1, happy: trait(s, 'hotheaded') ? 3 : 1 });
    if (kind === 'classmate' && isStudent(s) && chance(0.35)) {
      eduCur(s).grades = clamp100(eduCur(s).grades - 3);
      relAll(s, ['parent'], -2);
      addRel(s, pid, -randInt(4, 9));
      return `You yelled at ${p.first} for ${over}. A teacher heard every word. Detention.`;
    }
    if (kind === 'boss' && M(s).career) {
      M(s).career.perf = clamp100(M(s).career.perf - 10);
      addRel(s, pid, -randInt(10, 18));
      return `You yelled at your boss for ${over}. HR would like a word.`;
    }
    const r = rand();
    let rel, out;
    if (r < 0.4) { rel = addRel(s, pid, -randInt(6, 12)); out = `You yelled at ${p.first} for ${over}. They yelled right back. The whole street heard.`; }
    else if (r < 0.6 && !inPrison(s)) { rel = addRel(s, pid, -randInt(8, 14)); add(s, { karma: -2 }); out = `You yelled at ${p.first} for ${over}. They burst into tears.`; }
    else { rel = addRel(s, pid, -randInt(3, 8)); add(s, { happy: 2 }); out = `You yelled at ${p.first} for ${over}. They were too stunned to answer. That felt great.`; }
    if (rel.rel < 15 && !isFamilyKind(rel.kind) && !K_ROMANCE.includes(rel.kind)) setRel(s, pid, 'enemy', rel.rel);
    return out;
  },
});
const RUMORS = ['still sleeps with a night-light', 'got banned from the bowling alley', 'cried at a car commercial', 'is in witness protection', 'thinks the moon is a hologram', 'has a secret second family', 'once lost a fight to a swan', 'has never washed their car. Not once'];
defAction({
  id: 'p_rumor', cat: 'person', target: 'person', label: 'Spread a rumor', emoji: '🗣️',
  when: (s, pid) => reachable(s, pid) && A(s) >= 8 && tAge(s, pid) >= 8 && isKind(s, pid, [...K_FRIENDS, 'enemy', 'classmate', 'coworker', 'boss', ...K_EXES, 'sibling', 'halfsibling', 'inlaw', 'cellmate']),
  run: (s, pid) => {
    const p = tgt(s, pid);
    if (bump(s, 'rumor_' + pid) > 1) return { text: `People are starting to notice you only ever talk about ${p.first}.`, nolog: true };
    const rumor = pick(RUMORS);
    add(s, { karma: -2 });
    if (chance(0.35 - skill(s, 'charisma') / 400 - (trait(s, 'cunning') ? 0.1 : 0))) {
      const r = addRel(s, pid, -randInt(12, 20));
      if (r.rel < 20 && !isFamilyKind(r.kind) && !K_ROMANCE.includes(r.kind)) setRel(s, pid, 'enemy', r.rel);
      add(s, { happy: -2 });
      return `You told everyone ${p.first} ${rumor}. It got traced back to you within a day. ${p.first} is furious.`;
    }
    add(s, { happy: 3 });
    return `You told everyone ${p.first} ${rumor}. By the next day, everyone was talking about it.`;
  },
});
defAction({
  id: 'p_silent', cat: 'person', target: 'person', label: 'Give the silent treatment', emoji: '🤐',
  when: (s, pid) => reachable(s, pid) && A(s) >= 5 && tAge(s, pid) >= 5 && isKind(s, pid, [...K_FAMILY, ...K_ROMANCE, ...K_FRIENDS]),
  run: (s, pid) => {
    const p = tgt(s, pid);
    if (bump(s, 'silent_' + pid) > 1) return { text: `You're already not speaking to ${p.first}.`, nolog: true };
    const r = rand();
    if (r < 0.45) { addRel(s, pid, 4); add(s, { happy: 3 }); return `${p.first} cracked after two days and apologized. Neither of you remembers what for.`; }
    if (r < 0.8) { add(s, { happy: -2 }); return `${p.first} didn't notice you weren't talking to them for a whole week.`; }
    addRel(s, pid, -8);
    return `${p.first} gave it right back. Nobody has said a word in weeks.`;
  },
});
defAction({
  id: 'p_befriend', cat: 'person', target: 'person', label: 'Befriend', emoji: '🤝',
  when: (s, pid) => reachable(s, pid) && isKind(s, pid, [...K_ACQ, 'enemy', ...K_EXES]) && relKind(s, pid) !== 'boss' && A(s) >= 4,
  run: (s, pid) => {
    const r = relOf(s, pid);
    if (bump(s, 'befriend_' + pid) > 1) return { text: `You already tried with ${nm(s, pid)} this year.`, nolog: true };
    const odds = clamp(r.rel / 100 + 0.2 + (trait(s, 'charming') ? 0.15 : 0) - (trait(s, 'loner') ? 0.1 : 0) - (r.kind === 'enemy' ? 0.3 : 0), 0.05, 0.95);
    if (chance(odds)) { setRel(s, pid, 'friend', Math.max(r.rel, 45) + 5); tally(s, 'friendsMade'); return { text: `${nm(s, pid)} is your friend now!`, tone: 'good' }; }
    addRel(s, pid, -2);
    return `${nm(s, pid)} wasn't interested in being friends.`;
  },
});
defAction({
  id: 'p_bestie', cat: 'person', target: 'person', label: 'Ask to be best friends', emoji: '💞',
  when: (s, pid) => reachable(s, pid) && relKind(s, pid) === 'friend' && relOf(s, pid).rel >= 80,
  run: (s, pid) => {
    if (relPeople(s, ['bestie']).length >= 2) return { text: 'You already have two best friends. Nobody needs three.', nolog: true };
    if (chance(0.75)) { setRel(s, pid, 'bestie'); add(s, { happy: 5 }); return { text: `${nm(s, pid)} is now your best friend!`, tone: 'good' }; }
    addRel(s, pid, -4);
    return `${nm(s, pid)} said they "don't really do labels."`;
  },
});
defAction({
  id: 'p_unfriend', cat: 'person', target: 'person', label: 'End friendship', emoji: '✂️',
  when: (s, pid) => reachable(s, pid) && isKind(s, pid, K_FRIENDS),
  run: (s, pid) => { const n = nm(s, pid); dropRel(s, pid); return `You ended your friendship with ${n}.`; },
});
defAction({
  id: 'p_peace', cat: 'person', target: 'person', label: 'Make peace', emoji: '🕊️',
  when: (s, pid) => reachable(s, pid) && relKind(s, pid) === 'enemy',
  run: (s, pid) => {
    if (chance(0.45 + (trait(s, 'kind') ? 0.15 : 0))) { setRel(s, pid, 'friend', 35); add(s, { karma: 3 }); return `You and ${nm(s, pid)} buried the hatchet.`; }
    return `${nm(s, pid)} refused to make peace.`;
  },
});
defAction({
  id: 'p_suckup', cat: 'person', target: 'person', label: 'Suck up', emoji: '🍎',
  when: (s, pid) => reachable(s, pid) && relKind(s, pid) === 'boss' && !!M(s).career,
  run: (s, pid) => {
    if (bump(s, 'suckup') > 2) return { text: 'Your boss is getting suspicious of all this flattery.', nolog: true };
    relGain(s, pid, randInt(3, 8));
    M(s).career.perf = clamp100(M(s).career.perf + randInt(1, 4));
    return `You laughed a little too hard at ${nm(s, pid)}'s joke. It worked.`;
  },
});
defAction({
  id: 'p_vacation', cat: 'person', target: 'person', label: 'Take on a trip', emoji: '🧳',
  when: (s, pid) => reachable(s, pid) && A(s) >= 18 && isKind(s, pid, [...K_FAMILY, ...K_ROMANCE, ...K_FRIENDS]) && tAge(s, pid) >= 3,
  sub: (s) => fmtMoney(price(s, 2500)),
  run: (s, pid) => {
    const cost = price(s, 2500);
    if (!pay(s, cost)) return cantAfford(cost);
    relGain(s, pid, randInt(10, 18));
    add(s, { happy: randInt(4, 9) });
    tally(s, 'vacations');
    return `You took ${nm(s, pid)} on a trip to ${pick(['the beach', 'the mountains', 'a big city', 'a lake cabin', 'wine country', 'a theme park'])}.`;
  },
});

/* ---- children & family -------------------------------------------- */
defAction({
  id: 'p_read', cat: 'person', target: 'person', label: 'Read a story', emoji: '📚',
  when: (s, pid) => reachable(s, pid) && A(s) >= 14 && isKind(s, pid, ['child', 'grandchild', 'sibling']) && tAge(s, pid) >= 1 && tAge(s, pid) <= 9,
  run: (s, pid) => { relGain(s, pid, randInt(4, 9)); tgt(s, pid).stats.smarts = clamp100(tgt(s, pid).stats.smarts + 1); return `You read ${pick(['a dragon story', 'a bedtime story', 'a silly poem', 'a book about space', 'a fairy tale'])} to ${nm(s, pid)}.`; },
});
defAction({
  id: 'p_teach', cat: 'person', target: 'person', label: 'Teach a life lesson', emoji: '🧭',
  when: (s, pid) => reachable(s, pid) && A(s) >= 18 && isKind(s, pid, ['child', 'grandchild']) && tAge(s, pid) >= 5 && tAge(s, pid) <= 20,
  run: (s, pid) => {
    const lesson = pick(['to always be kind', 'how to change a tire', 'about saving money', 'to stand up to bullies', 'how to cook pasta', 'to never trust a cat']);
    if (chance(0.7)) { relGain(s, pid, randInt(3, 7)); tgt(s, pid).stats.smarts = clamp100(tgt(s, pid).stats.smarts + randInt(0, 2)); return `You taught ${nm(s, pid)} ${lesson}.`; }
    addRel(s, pid, -2);
    return `You tried to teach ${nm(s, pid)} ${lesson}. They rolled their eyes.`;
  },
});
defAction({
  id: 'p_disown', cat: 'person', target: 'person', label: 'Disown', emoji: '🚫',
  when: (s, pid) => reachable(s, pid) && A(s) >= 18 && relKind(s, pid) === 'child',
  run: (s, pid) => {
    popup(s, { emoji: '🚫', title: 'Disown ' + nm(s, pid) + '?', text: 'They will be cut out of your life and your will.', handler: 'disown', ctx: { pid }, choices: [{ label: 'Disown them', value: true, tone: 'bad' }, { label: 'Never mind', value: false }] });
  },
});
onChoice('disown', (s, ctx, yes) => {
  if (!yes || !s.people[ctx.pid]) return;
  const n = nm(s, ctx.pid);
  setRel(s, ctx.pid, 'enemy', 0);
  flag(s, 'disowned_' + ctx.pid, true);
  add(s, { karma: -8 });
  return `You disowned ${n}.`;
});
defAction({
  id: 'p_grave', cat: 'person', target: 'person', label: 'Visit their grave', emoji: '💐',
  when: (s, pid) => free(s) && A(s) >= 4 && !!tgt(s, pid) && !tgt(s, pid).alive && !!relOf(s, pid),
  run: (s, pid) => { add(s, { happy: chance(0.5) ? 2 : -2 }); return `You visited ${nm(s, pid)}'s grave and left ${pick(['flowers', 'a small stone', 'a handwritten note', 'their favorite snack'])}.`; },
});

/* ---- romance ------------------------------------------------------- */
function attractedTo(me, other) {
  if (me.orient === 'bi' || me.orient === 'ace' || me.gender === 'x' || other.gender === 'x') return true;
  if (me.orient === 'gay') return me.gender === other.gender;
  return me.gender !== other.gender;
}
// Teens date teens; adults date adults. Never across that line.
function ageOk(myAge, theirAge) {
  if (myAge < 18 || theirAge < 18) return myAge >= 13 && theirAge >= 13 && myAge < 18 && theirAge < 18 && Math.abs(myAge - theirAge) <= 2;
  return true;
}
function dateGenderFor(me) {
  if (me.orient === 'bi' || me.orient === 'ace' || me.gender === 'x') return chance(0.5) ? 'm' : 'f';
  if (me.orient === 'gay') return me.gender;
  return me.gender === 'm' ? 'f' : 'm';
}
function askOutOdds(s, p) {
  const me = P(s);
  let odds = 0.4 + (me.stats.looks - p.stats.looks) / 140 + skill(s, 'charisma') / 300 + M(s).fame / 500;
  if (trait(s, 'charming')) odds += 0.1;
  if (trait(s, 'romantic')) odds += 0.08;
  if (netWorth(s) > 1e6) odds += 0.08;
  if (relOf(s, p.id)) odds += (relOf(s, p.id).rel - 50) / 120;
  return clamp(odds, 0.05, 0.95);
}
defAction({
  id: 'p_askout', cat: 'person', group: 'romance', target: 'person', label: 'Ask out', emoji: '💘',
  when: (s, pid) => {
    if (!reachable(s, pid) || relKind(s, pid) === 'boss') return false;
    const p = tgt(s, pid);
    if (!p || p.partner) return false;
    // Family: only when the opt-in taboo toggles allow it, strictly 18+ both.
    if (typeof isTabooFamily === 'function' && isTabooFamily(s, pid)) {
      if (typeof tabooRomanceAllowed !== 'function' || !tabooRomanceAllowed(s, pid)) return false;
      return attractedTo(P(s), p) && A(s) >= 18 && ageOf(s, p) >= 18;
    }
    if (!isKind(s, pid, [...K_ACQ, ...K_FRIENDS])) return false;
    return attractedTo(P(s), p) && ageOk(A(s), ageOf(s, p)) && !p.partner;
  },
  run: (s, pid) => {
    if (bump(s, 'askout_' + pid) > 1) return { text: `You already asked ${nm(s, pid)} this year.`, nolog: true };
    const p = tgt(s, pid);
    if (!attractedTo(p, P(s))) { add(s, { happy: -2 }); return `${p.first} let you down gently. They're not into you that way.`; }
    if (!chance(askOutOdds(s, p))) { addRel(s, pid, -4); add(s, { happy: -4 }); return `${p.first} turned you down.`; }
    return startRomance(s, pid);
  },
});
function startRomance(s, pid) {
  const p = tgt(s, pid);
  const current = romanticId(s);
  // Family romance: still goes through affair/open rules, but only if opted in (48-taboo.js).
  if (typeof isTabooFamily === 'function' && isTabooFamily(s, pid)) {
    if (typeof tabooRomanceAllowed !== 'function' || !tabooRomanceAllowed(s, pid)) return { text: `That's not something you do in this life.`, nolog: true };
    const origKind = relKind(s, pid);
    if (current && current !== pid) {
      const out = affairBegins(s, pid, current);
      if (typeof tabooOnRomanceStart === 'function') tabooOnRomanceStart(s, pid, origKind);
      return out;
    }
    setRel(s, pid, 'partner', Math.max(relOf(s, pid) ? relOf(s, pid).rel : 55, 60));
    p.partner = P(s).id;
    tally(s, 'partners');
    add(s, { happy: 8 });
    if (typeof tabooOnRomanceStart === 'function') tabooOnRomanceStart(s, pid, origKind);
    return { text: `${p.first} said yes! You're dating now. 💕`, tone: 'good', person: pid };
  }
  // Already with someone: an affair, or a second partner in an open relationship (47-romance.js).
  if (current && current !== pid) return affairBegins(s, pid, current);
  setRel(s, pid, 'partner', Math.max(relOf(s, pid) ? relOf(s, pid).rel : 55, 60));
  p.partner = P(s).id;
  tally(s, 'partners');
  add(s, { happy: 8 });
  return { text: `${p.first} said yes! You're dating now. 💕`, tone: 'good', person: pid };
}
defAction({
  id: 'p_date', cat: 'person', group: 'romance', target: 'person', label: 'Go on a date', emoji: '🌹',
  // A secret lover gets a secret rendezvous instead (47-romance.js).
  // Taboo: strictly 18+ both, even though normal dating allows 13+.
  when: (s, pid) => {
    if (!reachable(s, pid) || !isKind(s, pid, K_ROMANCE)) return false;
    try {
      const r = relOf(s, pid);
      if ((r && r.taboo) || (typeof isTabooFamily === 'function' && isTabooFamily(s, pid))) {
        return A(s) >= 18 && tAge(s, pid) >= 18 && !(relKind(s, pid) === 'lover' && romanticId(s) && !relOf(s, pid).known);
      }
    } catch (e) {}
    return A(s) >= 13 && !(relKind(s, pid) === 'lover' && romanticId(s) && !relOf(s, pid).known);
  },
  sub: (s) => fmtMoney(price(s, A(s) < 18 ? 20 : 120)),
  run: (s, pid) => {
    const cost = price(s, A(s) < 18 ? 20 : 120);
    if (!pay(s, cost)) return cantAfford(cost);
    const where = pick(A(s) < 18 ? ['the movies', 'the mall', 'a pizza place', 'the skating rink', 'a school dance'] : ['a fancy restaurant', 'a jazz bar', 'a rooftop dinner', 'an art gallery', 'a comedy club', 'a food truck festival']);
    if (chance(0.88)) { relGain(s, pid, randInt(5, 12)); add(s, { happy: randInt(2, 5) }); return `You took ${nm(s, pid)} to ${where}. Lovely evening.`; }
    addRel(s, pid, -5);
    return `You took ${nm(s, pid)} to ${where}. You argued the whole time.`;
  },
});
defAction({
  id: 'p_propose', cat: 'person', group: 'romance', target: 'person', label: 'Propose', emoji: '💍',
  when: (s, pid) => reachable(s, pid) && relKind(s, pid) === 'partner' && A(s) >= 18 && tAge(s, pid) >= 18,
  run: (s, pid) => {
    const rings = [['Simple band', 300], ['Nice ring', 3000], ['Stunning ring', 15000], ['Absurdly huge diamond', 120000]];
    popup(s, {
      emoji: '💍', title: 'Propose to ' + nm(s, pid), text: 'Pick a ring.', handler: 'propose', ctx: { pid },
      choices: rings.map(([l, c], i) => ({ label: l, value: i, sub: fmtMoney(price(s, c)), disabled: M(s).money < price(s, c) })).concat([{ label: 'Never mind', value: -1 }]),
    });
  },
});
onChoice('propose', (s, ctx, i) => {
  if (i < 0 || !s.people[ctx.pid]) return;
  const cost = price(s, [300, 3000, 15000, 120000][i]);
  if (!pay(s, cost)) return cantAfford(cost);
  const r = relOf(s, ctx.pid);
  const years = s.year - r.since;
  // Their parents' blessing helps (45-family.js).
  const odds = clamp(r.rel / 110 + i * 0.05 + Math.min(years, 4) * 0.05 - 0.15 + (blessed(s, ctx.pid) ? 0.1 : 0), 0.05, 0.97);
  if (chance(odds)) {
    setRel(s, ctx.pid, 'fiance');
    add(s, { happy: 10 });
    return { text: `${nm(s, ctx.pid)} said YES! You're engaged! 💍`, tone: 'good', person: ctx.pid };
  }
  addRel(s, ctx.pid, -15);
  add(s, { happy: -10 });
  if (chance(0.3)) { setRel(s, ctx.pid, 'ex', 25); tgt(s, ctx.pid).partner = null; return { text: `${nm(s, ctx.pid)} said no... and broke up with you.`, tone: 'bad' }; }
  return { text: `${nm(s, ctx.pid)} said no. Awkward.`, tone: 'bad' };
});
// Make it official. Also used by the prison chapel wedding (33-events-later.js).
function marry(s, pid) {
  const p = tgt(s, pid);
  const wasTaboo = (typeof isTabooFamily === 'function' && isTabooFamily(s, pid)) || (relOf(s, pid) && relOf(s, pid).taboo);
  const prevTaboo = relOf(s, pid) && relOf(s, pid).taboo;
  const prevWasFam = relOf(s, pid) && relOf(s, pid).wasFam;
  setRel(s, pid, 'spouse');
  if (prevTaboo) relOf(s, pid).taboo = prevTaboo;
  if (prevWasFam) relOf(s, pid).wasFam = prevWasFam;
  else if (wasTaboo && typeof tabooTagFor === 'function') {
    const t = tabooTagFor(s, pid);
    if (t) relOf(s, pid).taboo = t;
  }
  p.partner = P(s).id;
  p.married = true;
  P(s).partner = p.id;
  P(s).married = true;
  tally(s, 'marriages');
  // Your spouse's parents and siblings become your in-laws (45-family.js) — skipped for blood.
  if (!wasTaboo) ensureInlaws(s, pid);
  if (wasTaboo && typeof tabooOnMarry === 'function') tabooOnMarry(s, pid);
  return p;
}
defAction({
  id: 'p_wedding', cat: 'person', group: 'romance', target: 'person', label: 'Plan the wedding', emoji: '💒',
  when: (s, pid) => reachable(s, pid) && relKind(s, pid) === 'fiance',
  run: (s, pid) => {
    const opts = [['Elope at the courthouse', 100], ['Small wedding', 8000], ['Big wedding', 35000], ['Lavish destination wedding', 180000]];
    popup(s, {
      emoji: '💒', title: 'Wedding plans', text: `How will you marry ${nm(s, pid)}?`, handler: 'wedding', ctx: { pid },
      choices: (isRoyal(s) ? [{ label: '👑 A royal wedding', value: 'royal', sub: 'Paid for by the crown' }] : [])
        .concat(opts.map(([l, c], i) => ({ label: l, value: i, sub: fmtMoney(price(s, c)), disabled: M(s).money < price(s, c) })), [{ label: 'Not yet', value: -1 }]),
    });
  },
});
onChoice('wedding', (s, ctx, i) => {
  if (i === 'royal') return s.people[ctx.pid] && isRoyal(s) ? royalWedding(s, ctx.pid) : undefined;
  if (i < 0 || !s.people[ctx.pid]) return;
  const cost = price(s, [100, 8000, 35000, 180000][i]);
  if (!pay(s, cost)) return cantAfford(cost);
  const p = marry(s, ctx.pid);
  addRel(s, ctx.pid, 10 + i * 3);
  add(s, { happy: 10 + i * 3 });
  if (i === 0) return { text: `You and ${p.first} eloped! You're married. 💒`, tone: 'good', person: p.id };
  // The in-laws show up, stay home or chip in (45-family.js).
  const inlaws = inlawsAtWedding(s, p.id, cost);
  if (chance(0.12)) return { text: `You married ${p.first}! Someone's uncle fell into the cake, but it was perfect anyway.${inlaws}`, tone: 'good', person: p.id };
  return { text: `You married ${p.first} in a ${['', 'sweet little', 'beautiful', 'jaw-dropping'][i]} ceremony. 💒${inlaws}`, tone: 'good', person: p.id };
});
function endRomance(s, pid, kind) {
  const p = tgt(s, pid);
  if (!p) return;
  const prev = relOf(s, pid);
  const prevTaboo = prev && prev.taboo;
  const prevWasFam = prev && prev.wasFam;
  setRel(s, pid, kind, Math.max(5, relOf(s, pid).rel - 30));
  if (prevTaboo) relOf(s, pid).taboo = prevTaboo;
  if (prevWasFam) relOf(s, pid).wasFam = prevWasFam;
  if (p.partner === P(s).id) { p.partner = null; p.married = false; }
  if (P(s).partner === pid) { P(s).partner = null; P(s).married = false; }
  dropInlaws(s, pid); // their family goes with them (45-family.js)
  tally(s, 'breakups');
}
defAction({
  id: 'p_breakup', cat: 'person', group: 'romance', target: 'person', label: 'Break up', emoji: '💔',
  when: (s, pid) => reachable(s, pid) && isKind(s, pid, ['partner', 'fiance', 'lover']),
  run: (s, pid) => {
    const n = nm(s, pid);
    endRomance(s, pid, 'ex');
    add(s, { happy: trait(s, 'romantic') ? -8 : -3 });
    return `You broke up with ${n}.`;
  },
});
defAction({
  id: 'p_divorce', cat: 'person', group: 'romance', target: 'person', label: 'Divorce', emoji: '📝',
  when: (s, pid) => reachable(s, pid) && relKind(s, pid) === 'spouse',
  run: (s, pid) => {
    popup(s, { emoji: '📝', title: 'Divorce ' + nm(s, pid) + '?', text: 'Without a prenup, they could walk away with a big share of your money.', handler: 'divorce', ctx: { pid }, choices: [{ label: 'File for divorce', value: true, tone: 'bad' }, { label: 'Never mind', value: false }] });
  },
});
onChoice('divorce', (s, ctx, yes) => {
  if (!yes || !s.people[ctx.pid]) return;
  return divorce(s, ctx.pid, true);
});
function divorce(s, pid, iFiled) {
  const p = tgt(s, pid);
  const share = Math.max(0, Math.round(Math.max(0, M(s).money) * randFloat(0.2, 0.5)));
  M(s).money -= share;
  p.money += share;
  endRomance(s, pid, 'exspouse');
  tally(s, 'divorces');
  add(s, { happy: -8 });
  return { text: `${iFiled ? 'You divorced' : 'Your divorce from'} ${p.first}${iFiled ? '' : ' is final'}. ${share ? `They walked away with ${fmtMoney(share)}.` : ''}`, tone: 'bad' };
}
defAction({
  id: 'p_counseling', cat: 'person', group: 'romance', target: 'person', label: 'Couples counseling', emoji: '🛋️',
  when: (s, pid) => reachable(s, pid) && isKind(s, pid, ['partner', 'fiance', 'spouse']) && A(s) >= 18 && relOf(s, pid).rel < 70,
  sub: (s) => fmtMoney(price(s, 1500)),
  run: (s, pid) => {
    const cost = price(s, 1500);
    if (!pay(s, cost)) return cantAfford(cost);
    if (chance(0.7)) { addRel(s, pid, randInt(8, 20)); return `Counseling helped you and ${nm(s, pid)} reconnect.`; }
    addRel(s, pid, -5);
    return `You and ${nm(s, pid)} fought in the counselor's office.`;
  },
});
defAction({
  id: 'p_rekindle', cat: 'person', group: 'romance', target: 'person', label: 'Rekindle romance', emoji: '🔥',
  when: (s, pid) => {
    if (!reachable(s, pid) || !isKind(s, pid, K_EXES) || hasRomance(s) || tgt(s, pid).partner) return false;
    if (typeof isTabooFamily === 'function' && (isTabooFamily(s, pid) || (relOf(s, pid) && relOf(s, pid).wasFam))) {
      return typeof tabooRomanceAllowed === 'function' && tabooRomanceAllowed(s, pid) && attractedTo(P(s), tgt(s, pid));
    }
    return ageOk(A(s), tAge(s, pid));
  },
  run: (s, pid) => {
    if (bump(s, 'rekindle_' + pid) > 1) return { text: 'Give it some time.', nolog: true };
    if (chance(clamp(relOf(s, pid).rel / 100, 0.05, 0.8))) return startRomance(s, pid);
    addRel(s, pid, -5);
    return `${nm(s, pid)} said there's too much history.`;
  },
});
defAction({
  id: 'p_leave_for', cat: 'person', group: 'romance', target: 'person', label: 'Leave your partner for them', emoji: '🔀',
  when: (s, pid) => reachable(s, pid) && relKind(s, pid) === 'lover' && !!romanticId(s),
  run: (s, pid) => {
    const old = romanticId(s);
    const oldName = nm(s, old);
    if (relKind(s, old) === 'spouse') divorce(s, old, true); else endRomance(s, old, 'ex');
    setRel(s, pid, 'partner');
    tgt(s, pid).partner = P(s).id;
    add(s, { karma: -4 });
    return `You left ${oldName} to be with ${nm(s, pid)}.`;
  },
});

/* ---- babies -------------------------------------------------------- */
function canConceive(a, b) { if (a.vamp || b.vamp) return false; return (a.gender === 'f' && b.gender === 'm') || (a.gender === 'm' && b.gender === 'f'); }
function fertility(age) {
  if (age < 16) return 0;
  if (age <= 30) return 0.45;
  if (age <= 35) return 0.35;
  if (age <= 40) return 0.2;
  if (age <= 44) return 0.08;
  if (age <= 49) return 0.02;
  return 0;
}
defAction({
  id: 'p_baby', cat: 'person', group: 'romance', target: 'person', label: 'Try for a baby', emoji: '🍼',
  when: (s, pid) => reachable(s, pid) && isKind(s, pid, K_ROMANCE) && A(s) >= 18 && tAge(s, pid) >= 18 && !M(s).pregnancy,
  run: (s, pid) => {
    const me = P(s), p = tgt(s, pid);
    if (!canConceive(me, p)) return { text: `You and ${p.first} can't conceive together. You could adopt (Activities → Family).`, nolog: true };
    if (bump(s, 'baby') > 2) return { text: 'Give it some time.', nolog: true };
    const carrier = me.gender === 'f' ? me : p;
    const other = carrier === me ? p : me;
    let odds = fertility(ageOf(s, carrier)) * (ageOf(s, other) > 60 ? 0.5 : 1) * (0.6 + carrier.stats.health / 250);
    addRel(s, pid, 3);
    if (!chance(odds)) return `You and ${p.first} tried for a baby. No luck yet.`;
    M(s).pregnancy = { partnerId: pid, carrier: carrier === me ? 'me' : 'partner', year: s.year };
    add(s, { happy: 8 });
    return { text: carrier === me ? `You're pregnant with ${p.first}'s baby! 🤰` : `${p.first} is pregnant with your baby! 🤰`, tone: 'good' };
  },
});
function pregnancyTick(s) {
  const preg = M(s).pregnancy;
  if (!preg) return;
  M(s).pregnancy = null;
  const partner = s.people[preg.partnerId];
  if (preg.carrier === 'me' && chance(0.04)) { add(s, { happy: -15, health: -5 }); announce(s, { emoji: '💔', title: 'Miscarriage', text: 'You lost the pregnancy. Take care of yourself.', tone: 'bad' }); return; }
  // Taboo: extra realistic loss scaled by pedigree inbreeding (first-gen low, later gens rise).
  if (partner && typeof tabooMiscarriageOdds === 'function') {
    try {
      const extra = tabooMiscarriageOdds(s, preg.partnerId);
      if (extra > 0 && chance(extra)) {
        add(s, { happy: -15, health: -5 });
        tally(s, 'tabooLoss');
        announce(s, { emoji: '💔', title: 'Miscarriage', text: 'You lost the pregnancy. The doctor said these things happen, especially when parents share blood. Take care of yourself.', tone: 'bad' });
        return;
      }
    } catch (e) {}
  }
  const twins = chance(0.03);
  for (let i = 0; i < (twins ? 2 : 1); i++) {
    const g = chance(0.5) ? 'm' : 'f';
    popup(s, {
      emoji: '👶', title: twins ? `Twins! Baby ${i + 1}` : 'A baby is born!',
      text: `${partner ? partner.first + ' and you' : 'You'} welcomed a baby ${g === 'm' ? 'boy' : 'girl'}! What will you name ${g === 'm' ? 'him' : 'her'}?`,
      handler: 'nameBaby', ctx: { g, partnerId: preg.partnerId }, input: { label: 'Name', value: randomFirst(P(s).country, g), max: 24 },
      choices: [{ label: 'Name the baby' }], tone: 'good',
    });
  }
}
onChoice('nameBaby', (s, ctx, v, input) => {
  const name = cleanName(input) || randomFirst(P(s).country, ctx.g);
  const kid = bornChild(s, ctx.partnerId, name, ctx.g);
  return { text: `You named your ${ctx.g === 'm' ? 'son' : 'daughter'} ${kid.first}. 👶`, tone: 'good', person: kid.id };
});
function cleanName(v) { return String(v || '').replace(/[<>{}\[\]]/g, '').trim().slice(0, 24); }
function bornChild(s, partnerId, first, g) {
  const me = P(s), partner = s.people[partnerId];
  const st = childStatsFrom(me, partner);
  const kid = makePerson(s, Object.assign({ first, last: me.last, gender: g, age: 0, country: me.country, city: me.city, parents: [me.id].concat(partner ? [partner.id] : []), traits: inheritTraits(me, partner) }, st));
  me.children.push(kid.id);
  if (partner) {
    partner.children.push(kid.id);
    if (!relOf(s, partnerId)) setRel(s, partnerId, 'ex', 40);
  }
  setRel(s, kid.id, 'child', 85);
  tally(s, 'kids');
  // Taboo genetics: pedigree F stored on the child; first-gen low, later gens rise fast.
  try {
    if (partner && typeof tabooBirthAdjust === 'function' && (isTabooFamily(s, partnerId) || tabooInbreeding(s, me.id, partnerId) > 0.005)) {
      const res = tabooBirthAdjust(s, kid, me, partner);
      if (res && res.defect) log(s, `👶 ${kid.first} was born with health challenges the doctor says run higher when parents share blood.`, 'bad');
    } else if (partner) {
      kid.inbred = 0;
      kid.tabooDepth = 0;
    }
  } catch (e) {}
  return kid;
}
defAction({
  id: 'adopt_child', cat: 'family', label: 'Adopt a child', emoji: '🧸', desc: 'Give a kid a home.',
  when: (s) => free(s) && A(s) >= 21,
  sub: (s) => fmtMoney(price(s, 15000)),
  run: (s) => {
    const cost = price(s, 15000);
    if (!pay(s, cost)) return cantAfford(cost);
    let odds = 0.45 + (M(s).karma - 50) / 150 + (netWorth(s) > price(s, 50000) ? 0.15 : 0) + (hasRomance(s) ? 0.1 : 0) - (hasFelony(s) ? 0.4 : 0);
    if (!chance(clamp(odds, 0.05, 0.95))) { M(s).money += Math.round(cost * 0.7); return { text: 'The adoption agency turned down your application. Most of the fee was refunded.', tone: 'bad' }; }
    const g = chance(0.5) ? 'm' : 'f';
    const age = weighted([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], (a) => (a < 3 ? 3 : 1));
    const rom = romanticId(s);
    const kid = makePerson(s, { gender: g, age, country: P(s).country, city: P(s).city, last: P(s).last, adopted: true, parents: [P(s).id].concat(rom && relKind(s, rom) === 'spouse' ? [rom] : []) });
    P(s).children.push(kid.id);
    if (rom && relKind(s, rom) === 'spouse') tgt(s, rom).children.push(kid.id);
    setRel(s, kid.id, 'child', 70);
    tally(s, 'kids');
    tally(s, 'adoptions');
    add(s, { happy: 10, karma: 6 });
    return { text: `You adopted ${kid.first}, ${age === 0 ? 'a baby' : 'age ' + age}! 🧸`, tone: 'good', person: kid.id };
  },
});

/* ---- dating -------------------------------------------------------- */
function makeDateCandidate(s, opts) {
  const me = P(s), a = A(s);
  const g = dateGenderFor(me);
  let age;
  if (a < 18) age = clamp(a + randInt(-1, 1), 13, 17);
  else age = clamp(Math.round(gauss(a, a < 25 ? 2.5 : 5)), 18, 99);
  const C = (opts && opts.country) || (chance(0.9) ? me.country : pick(COUNTRY_IDS));
  const p = { first: randomFirst(C, g), last: randomLast(C), gender: g, age, country: C, looks: statRoll(), smarts: statRoll(), traits: randomTraits(randInt(1, 2)), job: null };
  if (age >= 18) {
    const tmp = { stats: { smarts: p.smarts, looks: p.looks }, country: C, edu: null, birthYear: s.year - age };
    assignNpcLife(s, tmp);
    p.job = tmp.job;
    p.edu = tmp.edu;
    p.money = tmp.money;
  }
  return p;
}
function candidateLine(c) {
  const job = c.job && c.job.id ? JOBS[c.job.id].ladder[Math.min(c.job.level, JOBS[c.job.id].ladder.length - 1)][0] : c.job && c.job.student ? 'Student' : c.age < 18 ? 'Student' : 'Unemployed';
  return `${c.age} · ${job} · Looks ${c.looks}%`;
}
defAction({
  id: 'find_date', cat: 'love', label: 'Find love', emoji: '💘', desc: 'Meet someone new.',
  when: (s) => free(s) && A(s) >= 13,
  run: (s) => {
    if (bump(s, 'finddate') > 4) return { text: "You've been on a lot of dates this year. Take a breather.", nolog: true };
    const cands = [makeDateCandidate(s), makeDateCandidate(s), makeDateCandidate(s)];
    popup(s, {
      emoji: '💘', title: 'Find love', text: A(s) < 18 ? 'A few people from school caught your eye.' : 'You met a few interesting people.', handler: 'pickDate', ctx: { cands },
      choices: cands.map((c, i) => ({ label: `${c.gender === 'm' ? '👨' : '👩'} ${c.first} ${c.last}`, sub: candidateLine(c), value: i })).concat([{ label: 'Not feeling it', value: -1 }]),
    });
  },
});
defAction({
  id: 'dating_app', cat: 'love', label: 'Dating app', emoji: '📱', desc: 'Swipe through local singles.',
  when: (s) => free(s) && A(s) >= 18,
  run: (s) => {
    if (bump(s, 'datingapp') > 3) return { text: 'You swiped until your thumb hurt. Try again next year.', nolog: true };
    const cands = Array.from({ length: 5 }, () => makeDateCandidate(s));
    popup(s, {
      emoji: '📱', title: 'Matches', text: 'You matched with a few people. Message one?', handler: 'pickDate', ctx: { cands, app: true },
      choices: cands.map((c, i) => ({ label: `${c.gender === 'm' ? '👨' : '👩'} ${c.first}, ${c.age}`, sub: candidateLine(c), value: i })).concat([{ label: 'Delete the app', value: -1 }]),
    });
  },
});
onChoice('pickDate', (s, ctx, i) => {
  if (i < 0) return;
  const c = ctx.cands[i];
  if (!c) return;
  const p = makePerson(s, { first: c.first, last: c.last, gender: c.gender, age: c.age, country: c.country, city: P(s).city, looks: c.looks, smarts: c.smarts, traits: c.traits, job: c.job, edu: c.edu, money: c.money || 0 });
  p.orient = P(s).gender === p.gender ? (chance(0.5) ? 'gay' : 'bi') : (chance(0.85) ? 'straight' : 'bi');
  if (!chance(askOutOdds(s, p) + (ctx.app ? 0.05 : 0))) {
    delete s.people[p.id];
    add(s, { happy: -3 });
    return vary(`${c.first} {wasn't interested|left you on read|said you're "more of a friend"|stood you up}.`);
  }
  setRel(s, p.id, 'friend', 55);
  return startRomance(s, p.id);
});
defAction({
  id: 'hookup', cat: 'love', label: 'Hook up', emoji: '🔥', desc: 'One night only. (18+)',
  when: (s) => free(s) && A(s) >= 18,
  run: (s) => {
    if (bump(s, 'hookup') > 3) return { text: 'Maybe slow down a little this year.', nolog: true };
    const c = makeDateCandidate(s);
    add(s, { happy: randInt(3, 7) });
    tally(s, 'hookups');
    // They stay in your life as a fling, and may come back (47-romance.js).
    const p = makeFling(s, c);
    let out = `You hooked up with ${c.first}, ${c.age}. ${pick(['Fireworks.', 'It was... fine.', 'They left before sunrise.', "You don't regret it."])}`;
    if (chance(0.05)) { getSick(s, pick(STIS)); out += ' A few weeks later, you noticed something was off down there.'; }
    const rom = romanticId(s);
    if (rom && !openWith(s, rom) && chance(0.25)) out += hookupFoundOut(s, rom);
    if (canConceive(P(s), c) && chance(0.02) && fertility(P(s).gender === 'f' ? A(s) : c.age) > 0 && !M(s).pregnancy) {
      relOf(s, p.id).kid = true;
      M(s).pregnancy = { partnerId: p.id, carrier: P(s).gender === 'f' ? 'me' : 'partner', year: s.year };
      out += P(s).gender === 'f' ? " And now you're pregnant." : ` Months later, ${c.first} called: they're pregnant.`;
    }
    return out;
  },
});

/* ---- pets ---------------------------------------------------------- */
function petAge(s, pet) { return s.year - pet.born; }
function myPets(s) { return Object.values(s.pets).filter((p) => p.alive); }
defAction({
  id: 'adopt_pet', cat: 'family', label: 'Adopt a pet', emoji: '🐾', desc: 'Visit the shelter or a breeder.',
  when: (s) => free(s) && A(s) >= 6,
  run: (s) => {
    if (A(s) < 18 && M(s).housing.type === 'parents') {
      const ok = relPeople(s, ['parent']).some((p) => chance(relOf(s, p.id).rel / 120));
      if (!ok) return 'Your parents said absolutely not. No pets.';
    }
    popup(s, {
      emoji: '🐾', title: 'Adopt a pet', text: 'Which animal?', handler: 'petSpecies',
      choices: Object.keys(PET_SPECIES).map((k) => ({ label: PET_SPECIES[k].emoji + ' ' + PET_SPECIES[k].name, value: k, sub: fmtMoney(price(s, PET_SPECIES[k].cost)) + ' · upkeep ' + fmtMoney(price(s, PET_SPECIES[k].upkeep)) + '/yr', disabled: M(s).money < price(s, PET_SPECIES[k].cost) && A(s) >= 18 })).concat([{ label: 'Never mind', value: null }]),
    });
  },
});
onChoice('petSpecies', (s, ctx, sp) => {
  if (!sp) return;
  const S = PET_SPECIES[sp];
  const breed = pick(S.breeds);
  popup(s, {
    emoji: S.emoji, title: `A ${breed}!`, text: `What will you name your new ${S.name.toLowerCase()}?`, handler: 'petName', ctx: { sp, breed },
    input: { label: 'Name', value: pick(PET_NAMES), max: 24 }, choices: [{ label: 'Adopt' }],
  });
});
onChoice('petName', (s, ctx, v, input) => {
  const S = PET_SPECIES[ctx.sp];
  const cost = A(s) >= 18 ? price(s, S.cost) : 0;
  if (!pay(s, cost)) return cantAfford(cost);
  const id = uid(s, 'pet');
  s.pets[id] = { id, species: ctx.sp, breed: ctx.breed, name: cleanName(input) || pick(PET_NAMES), born: s.year - randInt(0, Math.min(3, S.life[0] - 1)), alive: true, rel: 65, life: randInt(S.life[0], S.life[1]), owner: s.playerId };
  tally(s, 'pets');
  add(s, { happy: 6 });
  return { text: `You adopted ${s.pets[id].name}, a ${ctx.breed.toLowerCase()}! ${S.emoji}`, tone: 'good' };
});
function petReachable(s, id) { const p = s.pets[id]; return !!p && p.alive && free(s); }
defAction({
  id: 'pet_play', cat: 'pet', target: 'pet', label: 'Play', emoji: '🎾',
  when: petReachable,
  run: (s, id) => { const p = s.pets[id]; const n = bump(s, 'petplay_' + id); p.rel = clamp100(p.rel + Math.round(randInt(5, 12) / n)); add(s, { happy: randInt(1, 3) }); return `You played with ${p.name}. ${pick(['Pure joy.', 'They zoomed around the house.', 'They brought you a "present."', 'Best friends forever.'])}`; },
});
defAction({
  id: 'pet_walk', cat: 'pet', target: 'pet', emoji: '🦮',
  label: (s, id) => (s.pets[id].species === 'horse' ? 'Go riding' : 'Go for a walk'),
  when: (s, id) => petReachable(s, id) && ['dog', 'horse', 'pig', 'goat', 'ferret'].includes(s.pets[id].species),
  run: (s, id) => { const p = s.pets[id]; p.rel = clamp100(p.rel + randInt(3, 8)); addSkill(s, 'fitness', randFloat(1, 2)); add(s, { health: 1, happy: 2 }); return p.species === 'horse' ? `You went riding on ${p.name}.` : `You took ${p.name} for a walk around the neighborhood.`; },
});
defAction({
  id: 'pet_vet', cat: 'pet', target: 'pet', label: 'Take to the vet', emoji: '🩺',
  sub: (s) => fmtMoney(price(s, 250)),
  when: petReachable,
  run: (s, id) => {
    const cost = price(s, 250);
    if (!pay(s, cost)) return cantAfford(cost);
    const p = s.pets[id];
    if (petAge(s, p) >= p.life - 1 && chance(0.4)) { p.life++; return `The vet gave ${p.name} some medicine. They seem perkier.`; }
    return `The vet says ${p.name} is ${pick(['healthy as can be', 'a little chubby', 'in great shape', 'very dramatic about shots'])}.`;
  },
});
defAction({
  id: 'pet_rehome', cat: 'pet', target: 'pet', label: 'Rehome', emoji: '🏠',
  when: petReachable,
  run: (s, id) => { const p = s.pets[id]; delete s.pets[id]; add(s, { happy: -4, karma: -2 }); return `You found ${p.name} a new home.`; },
});
function petTick(s) {
  for (const p of myPets(s)) {
    p.rel = clamp100(p.rel - randInt(2, 6));
    if (petAge(s, p) >= p.life || (petAge(s, p) >= p.life - 2 && chance(0.25))) {
      p.alive = false;
      p.died = s.year;
      add(s, { happy: -randInt(6, 12) });
      announce(s, { emoji: '🌈', title: 'Goodbye, ' + p.name, text: `Your ${PET_SPECIES[p.species].name.toLowerCase()} ${p.name} passed away at age ${petAge(s, p)}.`, tone: 'bad' });
    } else if (p.rel < 10 && !p.race && chance(0.3)) { // racehorses live at the stables (54-house.js)
      p.alive = false;
      p.died = s.year;
      announce(s, { emoji: '🐾', title: p.name + ' ran away', text: `${p.name} ran away. Maybe they felt neglected.`, tone: 'bad' });
    }
  }
  for (const id in s.pets) if (!s.pets[id].alive && s.year - (s.pets[id].died || s.year) > 3) delete s.pets[id];
}
