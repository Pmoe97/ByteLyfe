/* =====================================================================
 * 21-activities.js — the Activities menu: mind & body, social life,
 * money & luck (lottery, casino), shopping, travel, crime, identity &
 * legal, and fame / social media.
 * ===================================================================== */

const ACT_CATS = [
  { id: 'mind', name: 'Mind & Body', emoji: '🧘' },
  { id: 'health', name: 'Health & Looks', emoji: '🩺' },
  { id: 'love', name: 'Love & Dating', emoji: '💘' },
  { id: 'social', name: 'Social Life', emoji: '🎉' },
  { id: 'family', name: 'Family & Pets', emoji: '🐾' },
  { id: 'money', name: 'Money & Luck', emoji: '🎰' },
  { id: 'shop', name: 'Shopping', emoji: '🛍️' },
  { id: 'travel', name: 'Travel', emoji: '✈️' },
  { id: 'fame', name: 'Fame & Social Media', emoji: '⭐' },
  { id: 'royal', name: 'Royal Life', emoji: '👑' },
  { id: 'mob', name: 'Underworld', emoji: '🕴️' },
  { id: 'crime', name: 'Crime', emoji: '🦹' },
  { id: 'legal', name: 'Identity & Legal', emoji: '📜' },
  { id: 'court', name: 'Courts', emoji: '⚖️' },
  { id: 'prison', name: 'Prison Life', emoji: '⛓️' },
];

/* ---- mind & body --------------------------------------------------- */
defAction({
  id: 'gym', cat: 'mind', label: 'Hit the gym', emoji: '🏋️', desc: 'Fitness, health and looks.',
  when: (s) => free(s) && A(s) >= 12,
  run: (s) => {
    const n = bump(s, 'gym');
    addSkill(s, 'fitness', randFloat(4, 7) / n);
    bodyNudge(s, { muscle: randFloat(1, 2.5) / n, fat: -randFloat(0.5, 1.5) / n });
    add(s, { health: n <= 2 ? randInt(1, 3) : 0, looks: n <= 2 && chance(0.5) ? 1 : 0, happy: 1 });
    if (chance(0.015)) { getSick(s, 'broken_arm'); return 'You dropped a dumbbell and broke your arm. Ouch.'; }
    return vary(n > 3 ? 'You worked out again. Your muscles are begging for rest.' : 'You {lifted weights|did a brutal spin class|ran on the treadmill|did a full-body circuit} at the gym.');
  },
});
defAction({
  id: 'jog', cat: 'mind', label: 'Go for a run', emoji: '🏃', desc: 'Cheap cardio.',
  when: (s) => free(s) && A(s) >= 8,
  run: (s) => {
    const n = bump(s, 'jog');
    addSkill(s, 'fitness', randFloat(2, 4) / n);
    bodyNudge(s, { fat: -randFloat(0.5, 2) / n });
    add(s, { health: n <= 2 ? randInt(0, 2) : 0, happy: 1 });
    return vary('You went for a {jog around the block|long run by the river|sunrise run|run in the rain}.');
  },
});
defAction({
  id: 'meditate', cat: 'mind', label: 'Meditate', emoji: '🧘', desc: 'Calm your mind.',
  when: (s) => !s.dead && A(s) >= 8,
  run: (s) => {
    const n = bump(s, 'meditate');
    add(s, { happy: Math.round(randInt(2, 5) / n), health: n === 1 ? randInt(0, 1) : 0 });
    return vary('You {meditated for twenty minutes|sat in silence and breathed|tried a guided meditation app}. {You feel centered.|Your mind wandered to snacks.|Peace, briefly.}');
  },
});
defAction({
  id: 'library', cat: 'mind', label: 'Go to the library', emoji: '🏛️', desc: 'Get smarter.',
  when: (s) => free(s) && A(s) >= 6,
  run: (s) => {
    const n = bump(s, 'library');
    add(s, { smarts: n <= 3 ? randInt(1, 3) : 0 });
    return vary('You spent the afternoon at the library reading about {black holes|ancient Rome|the ocean|economics|birds|chess openings|psychology}.');
  },
});
defAction({
  id: 'read', cat: 'mind', label: 'Read a book', emoji: '📖', desc: 'Smarts and writing.',
  when: (s) => !s.dead && A(s) >= 5,
  run: (s) => {
    const n = bump(s, 'read');
    add(s, { smarts: n <= 2 && chance(0.6) ? 1 : 0, happy: 1 });
    addSkill(s, 'writing', randFloat(0.5, 2) / n);
    return `You read ${pick(['a mystery novel', 'a fantasy epic', 'a biography', 'a self-help book', 'a book of poems', 'a graphic novel', 'a sci-fi classic', 'a romance novel'])}.`;
  },
});
defAction({
  id: 'yoga', cat: 'mind', label: 'Yoga', emoji: '🧎', desc: 'Flexibility and calm.',
  when: (s) => free(s) && A(s) >= 12,
  run: (s) => { const n = bump(s, 'yoga'); addSkill(s, 'fitness', randFloat(1, 3) / n); add(s, { happy: Math.round(randInt(1, 3) / n) }); return 'You did yoga. Downward dog has never felt so right.'; },
});
defAction({
  id: 'garden', cat: 'mind', label: 'Garden', emoji: '🌻', desc: 'Grow something.',
  when: (s) => free(s) && A(s) >= 8,
  run: (s) => {
    const n = bump(s, 'garden');
    add(s, { happy: Math.round(randInt(2, 4) * (trait(s, 'green') ? 1.5 : 1) / n), health: n === 1 ? 1 : 0 });
    return trait(s, 'green') ? 'Your garden is thriving. Neighbors stop to admire your tomatoes.' : vary('You planted {herbs|tomatoes|sunflowers|a tiny cactus}. {It might survive.|Something already ate it.|It looks promising.}');
  },
});
// Classes and lessons (instruments, martial arts, dance, languages...) are in 57-lessons.js.

/* ---- social life --------------------------------------------------- */
function peerAgeRange(s) {
  const a = A(s);
  if (a < 18) return [Math.max(4, a - 1), Math.min(17, a + 1)];
  return [Math.max(18, a - 8), a + 8];
}
function meetSomeone(s, kind, rel) {
  const [lo, hi] = peerAgeRange(s);
  const p = makePerson(s, { age: randInt(lo, hi), country: P(s).country, city: P(s).city });
  assignNpcLife(s, p);
  setRel(s, p.id, kind, rel);
  return p;
}
defAction({
  id: 'meet', cat: 'social', label: 'Meet new people', emoji: '👋', desc: 'Make a new friend.',
  when: (s) => free(s) && A(s) >= 5,
  run: (s) => {
    if (bump(s, 'meet') > 3) return { text: "You've put yourself out there plenty this year.", nolog: true };
    const odds = 0.55 + (trait(s, 'charming') ? 0.15 : 0) - (trait(s, 'loner') ? 0.15 : 0) + skill(s, 'charisma') / 300;
    if (!chance(odds)) { add(s, { happy: -1 }); return vary('You tried to make conversation at {a coffee shop|the park|a meetup|the bus stop}. {Nobody bit.|It got awkward fast.|You talked about the weather for ten minutes.}'); }
    const p = meetSomeone(s, 'friend', randInt(40, 65));
    tally(s, 'friendsMade');
    add(s, { happy: 3 });
    return { text: `You met ${p.first} ${vary('{at the park|at a coffee shop|at a meetup|through a friend|in line at the grocery store}')} and hit it off. New friend!`, person: p.id };
  },
});
defAction({
  id: 'nightlife', cat: 'social', label: 'Go out on the town', emoji: '🕺', desc: 'Clubs, bars and bad decisions.',
  when: (s) => free(s) && A(s) >= 18,
  sub: (s) => fmtMoney(price(s, 80)),
  run: (s) => {
    if (subsOn()) { nightMenu(s); return; } // a night with choices (70-nightlife.js)
    const cost = price(s, 80);
    if (!pay(s, cost)) return cantAfford(cost);
    const n = bump(s, 'nightlife');
    add(s, { happy: Math.round(randInt(3, 7) / n), health: -randInt(0, 2) });
    if (A(s) >= country(s).drink) habit(s, 'alcohol', randInt(2, 6));
    const r = rand();
    if (r < 0.15) { const p = meetSomeone(s, 'friend', randInt(40, 60)); return { text: `You danced all night and made a new friend, ${p.first}.`, person: p.id }; }
    if (r < 0.22) { habit(s, 'partydrugs', randInt(6, 14)); return 'Someone offered you a little something at the club. You took it. What a night.'; }
    if (r < 0.26) { add(s, { money: -price(s, randInt(50, 300)) }); return 'You lost your wallet somewhere between the second and third bar.'; }
    return vary('You went {clubbing|bar hopping|to a rooftop lounge|to a karaoke bar} and {danced until 3am|sang your heart out|had a great time|made questionable choices}.');
  },
});
defAction({
  id: 'party', cat: 'social', label: 'Go to a party', emoji: '🎉', desc: 'See and be seen.',
  when: (s) => free(s) && A(s) >= 13,
  run: (s) => {
    const n = bump(s, 'party');
    add(s, { happy: Math.round(randInt(2, 6) / n) });
    for (const p of relPeople(s, ['friend', 'bestie'])) if (chance(0.3)) addRel(s, p.id, randInt(1, 4));
    if (A(s) < country(s).drink && chance(0.25)) {
      habit(s, 'alcohol', randInt(2, 5));
      if (chance(0.25)) { for (const p of relPeople(s, ['parent'])) addRel(s, p.id, -8); return 'You snuck a drink at the party. Your parents smelled it on you.'; }
      return 'You snuck a drink at the party. Nobody noticed.';
    }
    if (chance(0.2)) { const p = meetSomeone(s, 'friend', randInt(40, 60)); return { text: `You met ${p.first} at the party.`, person: p.id }; }
    return vary('You went to a {house party|birthday party|pool party|costume party}. {It was a blast.|The music was loud.|You danced on a coffee table.}');
  },
});
defAction({
  id: 'concert', cat: 'social', label: 'See a concert', emoji: '🎤', desc: 'Live music.',
  when: (s) => free(s) && A(s) >= 10,
  sub: (s) => fmtMoney(price(s, 90)),
  run: (s) => {
    const cost = A(s) >= 18 ? price(s, 90) : 0;
    if (!pay(s, cost)) return cantAfford(cost);
    add(s, { happy: randInt(3, 7) });
    addSkill(s, 'music', 0.5);
    return `You saw ${pick(['a punk band', 'a pop superstar', 'an orchestra', 'a jazz trio', 'a DJ set', 'a folk singer', 'a K-pop group'])} live. ${pick(['Goosebumps.', 'You lost your voice singing along.', 'Best night of the year.'])}`;
  },
});
defAction({
  id: 'volunteer', cat: 'social', label: 'Volunteer', emoji: '🤲', desc: 'Help out. Feel good.',
  when: (s) => free(s) && A(s) >= 8,
  run: (s) => {
    const n = bump(s, 'volunteer');
    add(s, { karma: Math.round(randInt(2, 4) / n), happy: Math.round(randInt(1, 3) / n) });
    addSkill(s, 'charisma', 1);
    tally(s, 'volunteering');
    webFact(s, 'good_deed', { kind: 'volunteer' }); // a good name (62-web.js, 81-web2.js)
    return `You volunteered at ${pick(['an animal shelter', 'a soup kitchen', 'a senior center', 'a beach cleanup', 'a children’s hospital', 'a food bank', 'a community garden'])}.`;
  },
});
defAction({
  id: 'movies', cat: 'social', label: 'Go to the movies', emoji: '🍿', desc: 'Popcorn and a show.',
  when: (s) => free(s) && A(s) >= 5,
  run: (s) => {
    const cost = A(s) >= 16 ? price(s, 15) : 0;
    if (!pay(s, cost)) return cantAfford(cost);
    add(s, { happy: randInt(1, 4) });
    return `You saw ${pick(['a superhero movie', 'a horror movie', 'a rom-com', 'an animated movie', 'an indie drama', 'a documentary', 'a three-hour space epic'])}. ${pick(['Loved it.', 'It was okay.', 'Someone kicked your seat the whole time.', 'You cried.'])}`;
  },
});
defAction({
  id: 'themepark', cat: 'social', label: 'Theme park', emoji: '🎢', desc: 'Roller coasters and churros.',
  when: (s) => free(s) && A(s) >= 5,
  run: (s) => {
    const cost = A(s) >= 16 ? price(s, 120) : 0;
    if (!pay(s, cost)) return cantAfford(cost);
    add(s, { happy: randInt(3, 7) });
    if (chance(0.03)) { add(s, { health: -5 }); return 'You threw up on the Mega Twister. Worth it.'; }
    return vary('You spent the day at a theme park and rode {every roller coaster|the log flume three times|the tallest drop in the country}.');
  },
});
defAction({
  id: 'shopping', cat: 'social', label: 'Shopping spree', emoji: '🛍️', desc: 'Retail therapy.',
  when: (s) => free(s) && A(s) >= 10 && M(s).money > 0,
  run: (s) => {
    const tiers = [100, 1000, 10000, 100000].map((t) => price(s, t));
    popup(s, {
      emoji: '🛍️', title: 'Shopping spree', text: 'How much do you want to spend?', handler: 'spree',
      choices: tiers.map((t) => ({ label: fmtMoney(t), value: t, disabled: M(s).money < t })).concat([{ label: 'Never mind', value: 0 }]),
    });
  },
});
onChoice('spree', (s, ctx, amt) => {
  if (!amt) return;
  if (!pay(s, amt)) return cantAfford(amt);
  const n = bump(s, 'spree');
  add(s, { happy: Math.round(clamp(Math.log10(amt / econ(s)) * 1.6, 1, 9) / n), looks: amt >= price(s, 10000) && n === 1 ? 1 : 0 });
  return `You spent ${fmtMoney(amt)} on ${pick(['clothes', 'gadgets', 'shoes', 'home decor', 'designer bags', 'sneakers', 'skincare'])}.`;
});
defAction({
  id: 'dingdong', cat: 'social', label: 'Ding-dong ditch', emoji: '🔔', desc: 'Ring a doorbell and run.',
  when: (s) => free(s) && A(s) >= 5 && A(s) <= 16,
  run: (s) => {
    if (bump(s, 'dingdong') > 2) return { text: 'Every house on the street has a doorbell camera now.', nolog: true };
    const r = rand();
    if (r < 0.65) { add(s, { happy: 3 }); return vary('You rang {the grumpy neighbor’s|every|the new family’s} doorbell and sprinted into the bushes. {They never saw you.|You laughed so hard you almost gave yourself away.|A dog barked. You were long gone.}'); }
    if (r < 0.88) {
      relAll(s, ['parent'], -4);
      add(s, { karma: -1 });
      return vary('The neighbor was {standing right behind the door|faster than they looked|waiting for you}. They marched you home to your parents.');
    }
    addSkill(s, 'fitness', 1);
    add(s, { happy: 2 });
    return 'A very large bodybuilder answered the door. You have never run that fast in your life.';
  },
});

/* ---- money & luck -------------------------------------------------- */
/* The lottery. There is one jackpot a year (and a fresh one each time it is won), and you can see it before you buy. It is drawn
 * from a weighted spread, usually modest and now and then enormous: minJack * (maxJack / minJack) ^ (u ^ skew), u random from 0 to 1.
 * It is worked out from the life's save id, the year and the number of wins so far, so the same life always sees the same jackpot
 * (nothing random is spent while a menu draws). Money is in today's dollars and goes through price() for the year.
 *   jackpot  chance per ticket of the jackpot   five  of five numbers (a prize of 1,000 to 50,000)   small  any small prize (1 to 6 tickets' worth) */
const LOTTO = { ticket: 5, jackpot: 1 / 250000, five: 1 / 5000, small: 1 / 10, minJack: 20e6, maxJack: 1.6e9, skew: 1.7, packs: [1, 10, 100, 1000, 10000] };
function lottoUnit(str) { // a number from 0 to 1 that only depends on the text
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function lottoWins(s) { return s.lotto && s.lotto.year === s.year ? s.lotto.wins : 0; }
function lottoJackpot(s) {
  const u = lottoUnit(String(s.id || '') + '|' + s.year + '|' + lottoWins(s));
  const raw = LOTTO.minJack * Math.pow(LOTTO.maxJack / LOTTO.minJack, Math.pow(u, LOTTO.skew));
  const unit = Math.pow(10, Math.floor(Math.log10(raw)) - 1); // two figures: 47 million, 1.3 billion
  return price(s, Math.round(raw / unit) * unit);
}
defAction({
  id: 'lottery', era: 'lottery', cat: 'gamble', label: 'Buy lottery tickets', emoji: '🎟️', desc: 'Long odds. Big dreams.',
  when: (s) => free(s) && A(s) >= 18,
  sub: (s) => `Jackpot ${fmtMoneyShort(lottoJackpot(s))} · ${fmtMoney(price(s, LOTTO.ticket))} a ticket`,
  run: (s) => {
    const cost = price(s, LOTTO.ticket);
    popup(s, {
      emoji: '🎟️', title: 'The lottery', handler: 'lottoBuy',
      text: `This year's jackpot is ${fmtMoney(lottoJackpot(s))}. It is a 1 in ${groupDigits(Math.round(1 / LOTTO.jackpot))} shot on each ticket, and about one ticket in ten wins something small. Tickets are ${fmtMoney(cost)} each.`,
      choices: LOTTO.packs.map((n) => ({ label: n === 1 ? 'Buy 1 ticket' : `Buy ${groupDigits(n)} tickets`, value: n, sub: fmtMoney(cost * n), disabled: M(s).money < cost * n })).concat([{ label: 'Never mind', value: 0 }]),
    });
  },
});
onChoice('lottoBuy', (s, ctx, n) => {
  if (!n || !LOTTO.packs.includes(n)) return;
  const cost = price(s, LOTTO.ticket) * n;
  if (!pay(s, cost)) return cantAfford(cost);
  habit(s, 'gambling', 0.5 * Math.min(n, 12));
  tally(s, 'gambled', cost);
  const luck = trait(s, 'lucky') ? 2 : 1, pj = luck * LOTTO.jackpot, pf = pj + luck * LOTTO.five, ps = pf + luck * LOTTO.small;
  let jacks = 0, jackSum = 0, fives = 0, fiveSum = 0, smalls = 0, smallSum = 0;
  for (let i = 0; i < n; i++) {
    const r = rand();
    if (r < pj) { const w = lottoJackpot(s); jacks++; jackSum += w; tally(s, 'jackpots'); s.lotto = { year: s.year, wins: lottoWins(s) + 1 }; } // a win draws a new jackpot
    else if (r < pf) { fives++; fiveSum += price(s, randInt(1000, 50000)); }
    else if (r < ps) { smalls++; smallSum += price(s, LOTTO.ticket) * randInt(1, 6); }
  }
  const won = jackSum + fiveSum + smallSum;
  add(s, { money: won, happy: jacks ? 30 : fives ? 10 : smalls ? 2 : 0 });
  if (n === 1) {
    if (jacks) return { text: `🎉 JACKPOT! You won ${fmtMoney(jackSum)}!`, tone: 'good' };
    if (fives) return { text: `You matched five numbers and won ${fmtMoney(fiveSum)}!`, tone: 'good' };
    if (smalls) return `You won ${fmtMoney(smallSum)} on a scratch-off.`;
    return pick(['No luck this time.', 'Not even close.', 'You matched one number. That pays nothing.', 'You lost. The lottery is a tax on hope.']);
  }
  const parts = [];
  if (jacks) parts.push(`🎉 JACKPOT${jacks > 1 ? ` (${jacks} times)` : ''}: ${fmtMoney(jackSum)}`);
  if (fives) parts.push(`${nOf(fives, 'win')} matching five numbers: ${fmtMoney(fiveSum)}`);
  if (smalls) parts.push(`${nOf(smalls, 'small prize')}: ${fmtMoney(smallSum)}`);
  const net = won - cost;
  return { text: `You bought ${groupDigits(n)} tickets for ${fmtMoney(cost)}. ${parts.length ? parts.join('; ') + '.' : 'Nothing.'} ${net >= 0 ? 'You came out ahead by' : 'You are down'} ${fmtMoney(Math.abs(net))}.`, tone: jacks || net > 0 ? 'good' : 'bad' };
});
defAction({
  id: 'charity', cat: 'money', label: 'Donate to charity', emoji: '💝', desc: 'Give back.',
  when: (s) => free(s) && A(s) >= 8 && M(s).money > 0,
  run: (s) => {
    const tiers = [20, 500, 10000, 250000, 5000000].map((t) => price(s, t));
    popup(s, {
      emoji: '💝', title: 'Donate', text: `To ${pick(['a children’s hospital', 'a wildlife fund', 'disaster relief', 'cancer research', 'a local food bank', 'clean water projects'])}.`, handler: 'donate',
      choices: tiers.map((t) => ({ label: fmtMoney(t), value: t, disabled: M(s).money < t })).concat([{ label: 'Never mind', value: 0 }]),
    });
  },
});
onChoice('donate', (s, ctx, amt) => {
  if (!amt) return;
  if (!pay(s, amt)) return cantAfford(amt);
  const pts = clamp(Math.round(Math.log10(amt / econ(s)) * 2.5), 1, 18);
  add(s, { karma: pts, happy: Math.ceil(pts / 3), fame: amt >= price(s, 250000) ? randInt(2, 6) : 0 });
  tally(s, 'donated', amt);
  webFact(s, 'good_deed', { kind: 'charity', amt, big: amt >= price(s, 250000), name: clamp(Math.round(pts / 3), 1, 6) });
  return `You donated ${fmtMoney(amt)}. ${pts >= 10 ? 'A building might get named after you.' : 'It felt good.'}`;
});
defAction({
  id: 'investments', cat: 'money', label: 'Investments', emoji: '📈', desc: 'Grow (or lose) your money.',
  when: (s) => free(s) && A(s) >= 18,
  sub: (s) => (investTotal(s) ? 'Portfolio: ' + fmtMoney(investTotal(s)) : 'Nothing invested'),
  run: (s) => {
    popup(s, {
      emoji: '📈', title: 'Investments', text: `Cash on hand: ${fmtMoney(M(s).money)}. Returns arrive each year.`, handler: 'investPick',
      choices: INVEST_IDS.filter((k) => eraHas(s, k) || M(s).invest[k]).map((k) => ({ label: INVESTMENTS[k].emoji + ' ' + INVESTMENTS[k].name, value: k, sub: `Balance ${fmtMoney(M(s).invest[k] || 0)} · ${riskLabel(INVESTMENTS[k])}` })).concat([{ label: 'Done', value: null }]),
    });
  },
});
function riskLabel(I) { return I.sd < 0.02 ? 'very safe' : I.sd < 0.1 ? 'low risk' : I.sd < 0.2 ? 'medium risk' : I.sd < 0.5 ? 'high risk' : 'wild'; }
onChoice('investPick', (s, ctx, k) => {
  if (!k) return;
  const cash = Math.max(0, M(s).money), bal = M(s).invest[k] || 0;
  const choices = [0.1, 0.25, 0.5, 1].map((f) => ({ label: `Invest ${f === 1 ? 'all my cash' : Math.round(f * 100) + '% of my cash'}`, value: 'in:' + Math.floor(cash * f), sub: fmtMoney(Math.floor(cash * f)), disabled: cash * f < 1 }))
    .concat([0.5, 1].map((f) => ({ label: `Withdraw ${f === 1 ? 'everything' : 'half'}`, value: 'out:' + Math.floor(bal * f), sub: fmtMoney(Math.floor(bal * f)), disabled: bal * f < 1 })))
    .concat([{ label: 'Back', value: null }]);
  popup(s, { emoji: INVESTMENTS[k].emoji, title: INVESTMENTS[k].name, text: `Balance: ${fmtMoney(bal)}. Average yearly return ~${Math.round(INVESTMENTS[k].mean * 100)}%, ${riskLabel(INVESTMENTS[k])}.`, handler: 'investDo', ctx: { k }, choices });
});
onChoice('investDo', (s, ctx, v) => {
  if (!v) return;
  const [dir, amt] = v.split(':');
  return dir === 'in' ? investMoney(s, ctx.k, Number(amt)) : withdrawMoney(s, ctx.k, Number(amt));
});

/* ---- casino --------------------------------------------------------- */
const CARD_RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const CARD_SUITS = ['♠', '♥', '♦', '♣'];
function drawCard() { return pick(CARD_RANKS) + pick(CARD_SUITS); }
function handValue(cards) {
  let total = 0, aces = 0;
  for (const c of cards) {
    const r = c.slice(0, -1);
    if (r === 'A') { aces++; total += 11; } else if (['J', 'Q', 'K'].includes(r)) total += 10; else total += Number(r);
  }
  while (total > 21 && aces) { total -= 10; aces--; }
  return total;
}
function betChoices(s) {
  return [10, 100, 1000, 10000, 100000].map((b) => price(s, b)).map((b) => ({ label: 'Bet ' + fmtMoney(b), value: b, disabled: M(s).money < b })).concat([{ label: 'Leave', value: 0 }]);
}
// The table games. Venues (53-gambling.js) deal them now; 'casinoGame' and 'casinoBet'
// stay for popups saved before venues existed.
onChoice('casinoGame', (s, ctx, g) => {
  if (!g) return;
  popup(s, { emoji: { bj: '🃏', roulette: '🎡', slots: '🎰' }[g], title: { bj: 'Blackjack', roulette: 'Roulette', slots: 'Slots' }[g], text: `Cash: ${fmtMoney(M(s).money)}`, handler: 'casinoBet', ctx: { g }, choices: betChoices(s) });
});
onChoice('casinoBet', (s, ctx, bet) => {
  if (!bet) return;
  if (bump(s, 'casino') > 12) return { text: 'Security politely suggests you call it a night.', nolog: true };
  if (!pay(s, bet)) return cantAfford(bet);
  habit(s, 'gambling', randFloat(1, 3));
  tally(s, 'gambled', bet);
  if (ctx.g === 'bj') {
    const st = { bet, me: [drawCard(), drawCard()], dealer: [drawCard(), drawCard()] };
    if (handValue(st.me) === 21) return bjSettle(s, st, 'natural');
    bjPrompt(s, st);
    return;
  }
  if (ctx.g === 'roulette') {
    popup(s, {
      emoji: '🎡', title: 'Roulette', text: `You bet ${fmtMoney(bet)}. Where do you put your chips?`, handler: 'roulette', ctx: { bet },
      choices: [{ label: '🔴 Red', value: 'red' }, { label: '⚫ Black', value: 'black' }, { label: 'Odd', value: 'odd' }, { label: 'Even', value: 'even' }, { label: '🍀 Single number: 7', value: 'seven' }],
    });
    return;
  }
  return spinSlots(s, bet);
});
function bjPrompt(s, st) {
  popup(s, {
    emoji: '🃏', title: 'Blackjack', handler: 'bj', ctx: st,
    text: `Your hand: ${st.me.join(' ')} (${handValue(st.me)})\nDealer shows: ${st.dealer[0]}`,
    choices: [{ label: 'Hit', value: 'hit' }, { label: 'Stand', value: 'stand' }].concat(st.me.length === 2 && M(s).money >= st.bet ? [{ label: 'Double down', value: 'double' }] : []),
  });
}
onChoice('bj', (s, st, v) => {
  if (v === 'double') { if (!pay(s, st.bet)) return cantAfford(st.bet); st.bet *= 2; st.me.push(drawCard()); return handValue(st.me) > 21 ? bjSettle(s, st, 'bust') : bjSettle(s, st, 'stand'); }
  if (v === 'hit') {
    st.me.push(drawCard());
    if (handValue(st.me) > 21) return bjSettle(s, st, 'bust');
    if (handValue(st.me) === 21) return bjSettle(s, st, 'stand');
    bjPrompt(s, st);
    return;
  }
  return bjSettle(s, st, 'stand');
});
function bjSettle(s, st, how) {
  const show = () => `You: ${st.me.join(' ')} (${handValue(st.me)})\nDealer: ${st.dealer.join(' ')} (${handValue(st.dealer)})\n`;
  if (how === 'bust') { add(s, { happy: -2 }); tableLoss(s, 'bj', st.bet, st.v); return { text: show() + `Bust! You lost ${fmtMoney(st.bet)}.`, tone: 'bad', emoji: '🃏', title: 'Blackjack' }; }
  if (how === 'natural') {
    if (handValue(st.dealer) === 21) { M(s).money += st.bet; return { text: show() + 'Both blackjack. Push.', emoji: '🃏', title: 'Blackjack' }; }
    const win = Math.round(st.bet * 2.5);
    M(s).money += win;
    add(s, { happy: 5 });
    return { text: show() + `Blackjack! You won ${fmtMoney(win - st.bet)}.`, tone: 'good', emoji: '🃏', title: 'Blackjack' };
  }
  while (handValue(st.dealer) < 17) st.dealer.push(drawCard());
  const me = handValue(st.me), d = handValue(st.dealer);
  if (d > 21 || me > d) { M(s).money += st.bet * 2; add(s, { happy: 4 }); return { text: show() + `You win ${fmtMoney(st.bet)}!`, tone: 'good', emoji: '🃏', title: 'Blackjack' }; }
  if (me === d) { M(s).money += st.bet; return { text: show() + 'Push. You get your bet back.', emoji: '🃏', title: 'Blackjack' }; }
  add(s, { happy: -2 });
  tableLoss(s, 'bj', st.bet, st.v);
  return { text: show() + `Dealer wins. You lost ${fmtMoney(st.bet)}.`, tone: 'bad', emoji: '🃏', title: 'Blackjack' };
}
const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
onChoice('roulette', (s, ctx, betOn) => {
  const n = randInt(0, 37); // 37 = "00"
  const label = n === 37 ? '00' : String(n);
  const isNum = n >= 1 && n <= 36;
  const red = RED_NUMBERS.includes(n);
  let mult = 0;
  if (betOn === 'red' && isNum && red) mult = 2;
  if (betOn === 'black' && isNum && !red) mult = 2;
  if (betOn === 'odd' && isNum && n % 2 === 1) mult = 2;
  if (betOn === 'even' && isNum && n % 2 === 0) mult = 2;
  if (betOn === 'seven' && n === 7) mult = 36;
  const color = !isNum ? '🟢' : red ? '🔴' : '⚫';
  if (mult) { M(s).money += ctx.bet * mult; add(s, { happy: mult > 2 ? 15 : 4 }); return { text: `The ball landed on ${color} ${label}. You won ${fmtMoney(ctx.bet * (mult - 1))}!`, tone: 'good', emoji: '🎡', title: 'Roulette' }; }
  add(s, { happy: -2 });
  tableLoss(s, 'roulette', ctx.bet, ctx.v);
  return { text: `The ball landed on ${color} ${label}. You lost ${fmtMoney(ctx.bet)}.`, tone: 'bad', emoji: '🎡', title: 'Roulette' };
});
const SLOT_SYMBOLS = [['🍒', 30], ['🍋', 25], ['🔔', 18], ['⭐', 12], ['💎', 7], ['7️⃣', 4]];
function spinSlots(s, bet, vid) {
  const reel = () => weighted(SLOT_SYMBOLS, (x) => x[1])[0];
  let r = [reel(), reel(), reel()];
  if (trait(s, 'lucky') && !(r[0] === r[1] && r[1] === r[2]) && chance(0.1)) r = [reel(), reel(), reel()];
  let mult = 0;
  if (r[0] === r[1] && r[1] === r[2]) mult = { '7️⃣': 60, '💎': 25, '⭐': 12, '🔔': 8, '🍋': 5, '🍒': 4 }[r[0]];
  else if (r.filter((x) => x === '🍒').length === 2) mult = 2;
  else if (r.includes('🍒')) mult = 1;
  const face = r.join(' ');
  if (mult > 1) { M(s).money += bet * mult; add(s, { happy: mult >= 25 ? 15 : 4 }); return { text: `${face}\nYou won ${fmtMoney(bet * (mult - 1))}!`, tone: 'good', emoji: '🎰', title: 'Slots' }; }
  if (mult === 1) { M(s).money += bet; return { text: `${face}\nYou got your bet back.`, emoji: '🎰', title: 'Slots' }; }
  add(s, { happy: -1 });
  tableLoss(s, 'slots', bet, vid);
  return { text: `${face}\nNothing. You lost ${fmtMoney(bet)}.`, tone: 'bad', emoji: '🎰', title: 'Slots' };
}

/* ---- shopping ------------------------------------------------------ */
for (const key of Object.keys(SHOPS)) {
  defAction({
    id: 'shop_' + key, cat: 'shop', label: SHOPS[key].name, emoji: SHOPS[key].emoji,
    when: (s) => free(s) && A(s) >= SHOPS[key].minAge,
    run: (s) => openShop(s, key),
  });
}

/* ---- travel -------------------------------------------------------- */
defAction({
  id: 'vacation', cat: 'travel', label: 'Go on vacation', emoji: '🏖️', desc: 'Get away from it all.',
  when: (s) => free(s) && A(s) >= 12,
  run: (s) => {
    popup(s, {
      emoji: '🏖️', title: 'Vacations', text: A(s) < 18 ? 'Your parents might take you somewhere, but you pay for solo trips.' : 'Where to?', handler: 'vacation',
      choices: VACATIONS.filter((v) => A(s) >= v.minAge).map((v) => ({ label: v.emoji + ' ' + v.name, value: v.id, sub: fmtMoney(vacationCost(s, v)) + (v.abroad && strengthPct(s, homeCur(s)) <= -8 ? ' · pricey: your money is weak' : v.abroad && strengthPct(s, homeCur(s)) >= 8 ? ' · cheap: your money is strong' : ''), disabled: M(s).money < vacationCost(s, v) })).concat([{ label: 'Stay home', value: null }]),
    });
  },
});
onChoice('vacation', (s, ctx, id) => {
  if (!id) return;
  const v = VACATIONS.find((x) => x.id === id);
  const cost = vacationCost(s, v);
  if (!pay(s, cost)) return cantAfford(cost);
  const n = bump(s, 'vacation');
  tally(s, 'vacations');
  let happy = randInt(v.happy[0], v.happy[1]);
  if (trait(s, 'adventurous')) happy = Math.round(happy * 1.3);
  add(s, { happy: Math.round(happy / n), health: randInt(0, 2) });
  const r = rand();
  if (r < 0.08) { getSick(s, 'food_poisoning'); return `Your ${v.name.toLowerCase()} was ruined by food poisoning.`; }
  if (r < 0.14 && ['beach', 'island', 'cruise'].includes(id)) { getSick(s, 'sunburn'); return `You got a brutal sunburn on your ${v.name.toLowerCase()}.`; }
  if (r < 0.18) { add(s, { money: -price(s, randInt(100, 900)) }); return `The airline lost your luggage, but your ${v.name.toLowerCase()} was still great.`; }
  if (r < 0.28 && A(s) >= 18 && !hasRomance(s)) {
    const c = makeDateCandidate(s, { country: pick(COUNTRY_IDS) });
    const p = makePerson(s, { first: c.first, last: c.last, gender: c.gender, age: c.age, country: c.country, looks: c.looks, smarts: c.smarts, job: c.job, edu: c.edu });
    setRel(s, p.id, 'friend', 60);
    return { text: `On your ${v.name.toLowerCase()}, you met ${p.first} from ${COUNTRIES[p.country].name}. You exchanged numbers. 😉`, person: p.id };
  }
  return `${v.emoji} ${pick(['You had the time of your life', 'You came back relaxed and tan', 'You took a thousand photos', 'You never wanted to come home'])} on your ${v.name.toLowerCase()}.`;
});
defAction({
  id: 'emigrate', cat: 'travel', label: 'Emigrate', emoji: '🛂', desc: 'Start a new life abroad.',
  when: (s) => free(s) && A(s) >= 18,
  run: (s) => {
    popup(s, {
      emoji: '🛂', title: 'Emigrate', text: 'Where do you want to live? Visas cost money and are not guaranteed.', handler: 'emigrate',
      choices: COUNTRY_IDS.filter((c) => c !== P(s).country).map((c) => ({ label: COUNTRIES[c].flag + ' ' + COUNTRIES[c].name, value: c, sub: `Visa: ${fmtMoney(price(s, 3000))}${M(s).money > 0 && curOf(c) !== homeCur(s) ? ` · your cash would be ${fmtInShort(curOf(c), cashAbroad(s, c))}` : ''}` })).concat([{ label: 'Stay', value: null }]),
    });
  },
});
onChoice('emigrate', (s, ctx, c) => {
  if (!c) return;
  if (bump(s, 'emigrate') > 1) return { text: 'Your visa application is still being processed. Try again next year.', nolog: true };
  const cost = price(s, 3000);
  if (!pay(s, cost)) return cantAfford(cost);
  const odds = 0.35 + P(s).stats.smarts / 300 + (M(s).career ? 0.15 : 0) + (eduRank(s) >= 3 ? 0.15 : 0) + (netWorth(s) > price(s, 100000) ? 0.15 : 0) - (hasFelony(s) ? 0.35 : 0);
  if (!chance(clamp(odds, 0.05, 0.95))) return { text: `Your visa to ${COUNTRIES[c].name} was denied.`, tone: 'bad', emoji: '🛂' };
  return emigrateNow(s, c);
});
// The move itself, once the visa is settled. The history events (89-world-events-3.js) use it too, with a city.
function emigrateNow(s, c, city) {
  const me = P(s), from = me.country;
  const dep = leaveRental(s, 'moved');
  const oldHomeId = M(s).housing.type === 'own' ? M(s).housing.assetId : null;
  me.country = c;
  me.city = city || pick(COUNTRIES[c].cities);
  cityArrive(s);
  const fx = exchangeOnEmigrate(s, from, c);
  useCurrency(s);
  if (M(s).career) leaveJob(s, 'moved');
  M(s).ptJob = null;
  if (M(s).edu.current) { M(s).edu.current = null; }
  if (M(s).housing.type !== 'homeless') M(s).housing = { type: 'homeless', assetId: null, rent: 0, name: '' };
  let vacateNote = '';
  if (oldHomeId) {
    const oldH = myAsset(s, oldHomeId);
    if (oldH) {
      oldH.rentedOut = true;
      if (oldH.mgr && freeUnits(s, oldH) > 0) {
        const mgrPlaced = managerFill(s, oldH);
        vacateNote = mgrPlaced.length ? ` Your property manager in ${oldH.city} placed a new tenant in your vacated unit: ${listJoin(mgrPlaced)}.` : ` Your property manager in ${oldH.city} is listing your vacated unit.`;
      } else {
        vacateNote = ` Your unit at ${oldH.name} in ${oldH.city} is now vacant and ready to rent out.`;
      }
    }
  }
  for (const pid in M(s).rels) if (['friend', 'classmate', 'coworker', 'boss'].includes(M(s).rels[pid].kind)) M(s).rels[pid].rel = clamp100(M(s).rels[pid].rel - 20);
  s.listings = {};
  tally(s, 'countries');
  add(s, { happy: 6 });
  return { text: `You moved to ${me.city}, ${COUNTRIES[c].name}! ${COUNTRIES[c].flag} Find a place to live and a new job.${dep ? ' ' + dep : ''}${fx ? ' ' + fx : ''}${vacateNote}`, tone: 'good', emoji: '🛂' };
}

/* ---- crime menu ---------------------------------------------------- */
for (const id of SOLO_CRIMES) {
  defAction({
    id: 'crime_' + id, cat: 'crime', label: CRIMES[id].name, emoji: CRIMES[id].emoji,
    sub: () => (CRIMES[id].sentence[1] >= 8 ? 'Very risky' : CRIMES[id].felony ? 'Risky' : 'Petty'),
    when: (s) => crimeOk(s, id),
    run: (s) => commitCrime(s, id),
  });
}
defAction({
  id: 'surrender', cat: 'crime', label: 'Turn yourself in', emoji: '🙋', desc: 'End your life on the run.',
  when: (s) => free(s) && M(s).wanted > 0,
  run: (s) => {
    const left = M(s).wanted;
    M(s).wanted = 0;
    goToPrison(s, Math.max(1, Math.round(left * 0.8)), 'escape');
    return { text: 'You turned yourself in. The judge went easy on you for it.', tone: 'bad' };
  },
});

/* ---- identity & legal ---------------------------------------------- */
defAction({
  id: 'license', cat: 'legal', label: "Driver's license test", emoji: '🚗', desc: 'Hit the road legally.',
  when: (s) => free(s) && !M(s).license && A(s) >= country(s).drive,
  sub: (s) => fmtMoney(price(s, 50)),
  run: (s) => {
    if (bump(s, 'license') > 2) return { text: 'The DMV says come back next year.', nolog: true };
    const cost = price(s, 50);
    if (!pay(s, cost)) return cantAfford(cost);
    const odds = 0.35 + skill(s, 'driving') / 70 + P(s).stats.smarts / 300 - (trait(s, 'anxious') ? 0.1 : 0);
    if (chance(clamp(odds, 0.1, 0.97))) { M(s).license = true; add(s, { happy: 6 }); return { text: 'You passed your driving test! 🚗', tone: 'good' }; }
    add(s, { happy: -4 });
    return `You failed your driving test. ${pick(['You ran a stop sign.', 'You hit a cone. Then another.', 'You forgot to signal. Every time.', 'The examiner screamed at one point.'])}`;
  },
});
defAction({
  id: 'name_change', cat: 'legal', label: 'Change your name', emoji: '🏷️', desc: 'Reinvent yourself.',
  when: (s) => free(s) && A(s) >= 18,
  sub: (s) => fmtMoney(price(s, 150)),
  run: (s) => {
    popup(s, { emoji: '🏷️', title: 'Change your name', text: 'Enter a new first and last name.', handler: 'rename', input: { label: 'Full name', value: fullName(P(s)), max: 40 }, choices: [{ label: 'Change it' }, { label: 'Never mind', value: 'cancel' }] });
  },
});
onChoice('rename', (s, ctx, v, input) => {
  if (v === 'cancel') return;
  const parts = cleanName(input).split(/\s+/).filter(Boolean);
  if (!parts.length) return { text: 'That is not a name.', nolog: true };
  const cost = price(s, 150);
  if (!pay(s, cost)) return cantAfford(cost);
  const old = fullName(P(s));
  P(s).first = parts[0];
  if (parts.length > 1) P(s).last = parts.slice(1).join(' ');
  return `You legally changed your name from ${old} to ${fullName(P(s))}.`;
});
defAction({
  id: 'orientation', cat: 'legal', label: 'Sexuality', emoji: '🏳️‍🌈', desc: 'Who you are attracted to.',
  when: (s) => !s.dead && A(s) >= 13,
  sub: (s) => ORIENTATIONS[P(s).orient].name,
  run: (s) => {
    popup(s, { emoji: '🏳️‍🌈', title: 'Sexuality', text: 'Who are you attracted to?', handler: 'orient', choices: Object.keys(ORIENTATIONS).map((k) => ({ label: ORIENTATIONS[k].name, value: k, sub: P(s).orient === k ? 'Current' : '' })) });
  },
});
onChoice('orient', (s, ctx, k) => {
  if (P(s).orient === k) return;
  P(s).orient = k;
  let out = `You came out as ${ORIENTATIONS[k].name.toLowerCase()}.`;
  const parents = relPeople(s, ['parent']);
  if (parents.length && k !== 'straight') {
    const p = pick(parents);
    if (chance(0.8)) { addRel(s, p.id, 5); out += ` ${p.first} hugged you and said they love you no matter what.`; } else { addRel(s, p.id, -10); out += ` ${p.first} needs some time.`; }
  }
  add(s, { happy: 6 });
  return out;
});
defAction({
  id: 'gender_identity', cat: 'legal', label: 'Gender identity', emoji: '💫', desc: 'How you identify.',
  when: (s) => !s.dead && A(s) >= 13,
  sub: (s) => genderWord(P(s), 'Man / boy', 'Woman / girl', 'Nonbinary'),
  run: (s) => {
    popup(s, { emoji: '💫', title: 'Gender identity', text: 'This changes your pronouns and how people refer to you.', handler: 'genderId', choices: [{ label: 'Man (he/him)', value: 'm' }, { label: 'Woman (she/her)', value: 'f' }, { label: 'Nonbinary (they/them)', value: 'x' }, { label: 'Never mind', value: null }] });
  },
});
onChoice('genderId', (s, ctx, g) => {
  if (!g || P(s).gender === g) return;
  P(s).gender = g;
  add(s, { happy: 8 });
  return `You came out as ${g === 'x' ? 'nonbinary' : g === 'm' ? 'a man' : 'a woman'}. You feel more like yourself than ever.`;
});
defAction({
  id: 'will', cat: 'legal', label: 'Write your will', emoji: '📜', desc: 'Who gets your money when you die.',
  when: (s) => !s.dead && A(s) >= 18,
  sub: (s) => ({ equal: 'Split among family', spouse: 'All to my spouse', eldest: 'All to my eldest child', youngest: 'All to my youngest child', heir: 'All to my heir', charity: 'All to charity' }[M(s).will] || ''),
  run: (s) => {
    popup(s, {
      emoji: '📜', title: 'Your will', text: 'When you die, your estate goes to...', handler: 'will',
      choices: [{ label: 'Split among family', value: 'equal' }, { label: 'All to my spouse', value: 'spouse' }, { label: 'All to my eldest child', value: 'eldest' }, { label: 'All to my youngest child', value: 'youngest' }]
        .concat(namedHeir(s) ? [{ label: `All to my heir, ${namedHeir(s).first}`, value: 'heir' }] : [], [{ label: 'All to charity', value: 'charity' }]),
    });
  },
});
onChoice('will', (s, ctx, v) => { M(s).will = v; return { text: 'You updated your will.', quiet: true }; });

/* ---- fame & social media ------------------------------------------- */
function followersToFame(f) { return f <= 0 ? 0 : clamp(Math.round(Math.log10(f) * 13 - 30), 0, 100); }
defAction({
  id: 'social_join', era: 'social', cat: 'fame', label: 'Create a social media account', emoji: '📱', desc: 'Post, grow, go viral.',
  when: (s) => !s.dead && A(s) >= 13 && !M(s).socials,
  run: (s) => { M(s).socials = { followers: randInt(5, 120), posts: 0, verified: false, handle: '@' + P(s).first.toLowerCase().replace(/[^a-z]/g, '') + randInt(10, 999) }; return `You created ${M(s).socials.handle}. You have ${M(s).socials.followers} followers (mostly relatives).`; },
});
const POST_TYPES = [
  { id: 'selfie', name: 'Post a selfie', emoji: '🤳', stat: 'looks' },
  { id: 'funny', name: 'Post a funny video', emoji: '😂', skill: 'charisma' },
  { id: 'talent', name: 'Show off a talent', emoji: '🎬', talent: true },
  { id: 'life', name: 'Share a life update', emoji: '📝' },
  { id: 'hottake', name: 'Post a hot take', emoji: '🌶️', risky: true },
];
defAction({
  id: 'social_post', era: 'social', cat: 'fame', label: 'Post something', emoji: '✨', desc: 'Grow your following.',
  when: (s) => !s.dead && !!M(s).socials && !inPrison(s),
  sub: (s) => fmtNum(M(s).socials.followers) + ' followers' + (M(s).socials.verified ? ' ✔️' : ''),
  run: (s) => {
    popup(s, { emoji: '✨', title: 'New post', text: 'What are you posting?', handler: 'post', choices: POST_TYPES.map((p) => ({ label: p.emoji + ' ' + p.name, value: p.id })).concat([{ label: 'Never mind', value: null }]) });
  },
});
onChoice('post', (s, ctx, id) => {
  if (!id) return;
  const so = M(s).socials;
  if (!so) return;
  const n = bump(s, 'post');
  if (n > 6) return { text: 'Your followers are getting tired of your posts. Give it a rest.', nolog: true };
  const t = POST_TYPES.find((x) => x.id === id);
  let q = 0.4;
  if (t.stat) q = P(s).stats[t.stat] / 100;
  if (t.skill) q = 0.3 + skill(s, t.skill) / 140 + (trait(s, 'funny') ? 0.15 : 0);
  if (t.talent) q = Math.max(...['music', 'art', 'acting', 'athletics', 'cooking', 'writing'].map((k) => skill(s, k))) / 100;
  if (t.risky) q = rand();
  so.posts++;
  let growth = Math.round(so.followers * (q - 0.25) * randFloat(0.05, 0.25) + q * randInt(5, 60) * (1 + M(s).fame / 20));
  let text;
  const viral = chance(0.02 + q * 0.06 + (t.risky ? 0.05 : 0));
  if (viral) {
    growth = Math.round(Math.max(so.followers, 500) * randFloat(1, 8));
    text = `Your post went VIRAL! 🚀 +${fmtNum(growth)} followers.`;
    tally(s, 'viral');
  } else if (t.risky && q < 0.3) {
    growth = -Math.round(so.followers * randFloat(0.05, 0.3));
    add(s, { karma: -2, happy: -4 });
    text = `Your hot take backfired. People are furious. ${fmtNum(growth)} followers.`;
  } else {
    text = growth >= 0 ? `Your post got some love. +${fmtNum(growth)} followers.` : `Crickets. ${fmtNum(growth)} followers.`;
  }
  so.followers = Math.max(0, so.followers + growth);
  if (!so.verified && so.followers >= 1000000) { so.verified = true; text += ' You got verified! ✔️'; }
  M(s).fame = clamp100(Math.max(M(s).fame, followersToFame(so.followers)));
  add(s, { happy: growth > 0 ? 2 : -1 });
  return { text, emoji: t.emoji };
});
defAction({
  id: 'social_delete', era: 'social', cat: 'fame', label: 'Delete your account', emoji: '🗑️',
  when: (s) => !s.dead && !!M(s).socials,
  run: (s) => { const h = M(s).socials.handle; M(s).socials = null; add(s, { happy: 3 }); return `You deleted ${h}. Peace and quiet.`; },
});
defAction({
  id: 'fan_meet', cat: 'fame', label: 'Meet your fans', emoji: '✍️', desc: 'Signings and selfies.',
  when: (s) => free(s) && M(s).fame >= 40,
  run: (s) => {
    if (bump(s, 'fans') > 2) return { text: 'Your publicist says you are overexposed.', nolog: true };
    add(s, { happy: randInt(3, 7), fame: randInt(0, 2) });
    if (chance(0.08)) return 'A fan got a little too intense. Security had to step in.';
    return 'You signed autographs for hours. Your hand hurts, but your heart is full.';
  },
});
defAction({
  id: 'stunt', cat: 'fame', label: 'Publicity stunt', emoji: '📣', desc: 'Get people talking.',
  when: (s) => free(s) && A(s) >= 16 && (M(s).fame >= 15 || (M(s).socials && M(s).socials.followers >= 5000)),
  run: (s) => {
    if (bump(s, 'stunt') > 1) return { text: 'One stunt a year is plenty.', nolog: true };
    const stunt = pick(['showed up to an awards show in a dress made of lettuce', 'announced a fake feud with a celebrity', 'skydived into a charity event', 'released a perfume that smells like pizza']);
    if (chance(0.6)) { add(s, { fame: randInt(4, 10), happy: 4 }); if (M(s).socials) M(s).socials.followers += Math.round(M(s).socials.followers * randFloat(0.1, 0.5)); return `You ${stunt}. Everyone is talking about you.`; }
    add(s, { fame: randInt(1, 4), karma: -3, happy: -5 });
    return `You ${stunt}. It was widely mocked.`;
  },
});
function fameTick(s) {
  const m = M(s);
  if (m.socials) {
    const so = m.socials;
    so.followers = Math.max(0, Math.round(so.followers * (lastCount(s, 'post') ? 1 : randFloat(0.9, 0.98))));
  }
  const famous = m.career && JOBS[m.career.id].special;
  if (!famous && m.fame > 0) m.fame = clamp100(m.fame - randInt(1, 4));
}
