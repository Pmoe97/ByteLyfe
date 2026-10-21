/* =====================================================================
 * 44-holidays.js — holidays and the seasons. Each holiday belongs to the
 * countries that celebrate it, so a life in Mexico gets the Day of the Dead
 * and a life in Sweden gets Midsummer. Seasonal events follow the climate:
 * snow where it snows, monsoons where they come, Christmas on the beach in
 * the southern hemisphere.
 *
 * HOL(id, countries | null, def) is EV('hol_' + id, def) for those countries
 * (null = everywhere), with a two-year cooldown, and it counts the
 * holidays you celebrate (life tally 'holidays').
 * ===================================================================== */

const SNOWY = ['us', 'ca', 'uk', 'ie', 'fr', 'de', 'it', 'es', 'se', 'jp', 'kr'];
const STORMY = { typhoon: ['ph', 'jp', 'kr'], monsoon: ['in', 'ph', 'ng'], hurricane: ['us', 'mx'] };
const SOUTHERN = ['au', 'za', 'br'];
const EASTER = ['us', 'ca', 'uk', 'ie', 'au', 'de', 'fr', 'it', 'es', 'se', 'ph', 'br', 'mx', 'za'];
const inCountry = (s, list) => !list || list.includes(P(s).country);

function HOL(id, countries, def) {
  const when = def.when;
  const counted = (fx) => (s, c) => { tally(s, 'holidays'); return fx(s, c); };
  const choices = def.choices && def.choices.map((raw) => {
    const o = Array.isArray(raw) ? { label: raw[0], fx: raw[1] } : raw;
    return Object.assign({}, o, { fx: counted(o.fx) });
  });
  EV('hol_' + id, Object.assign({ cooldown: 2 }, def, {
    when: (s) => inCountry(s, countries) && (!when || when(s)),
    choices, auto: def.auto && counted(def.auto),
  }));
}
const kidAt = (s) => A(s) < 13;
const hasKids = (s) => myChildren(s).some((c) => ageOf(s, c) < 13);

/* ---- everywhere --------------------------------------------------------- */
HOL('new_year', null, {
  ages: [8, 100], emoji: '🎆', text: "It's New Year's Eve. Time for a resolution.",
  choices: [
    ['Get in shape this year', (s) => { addSkill(s, 'fitness', 4); add(s, { health: 2 }); return chance(0.5) ? 'You went to the gym every day in January. February was a different story.' : 'You actually stuck with it. Who knew?'; }],
    ['Read more books', (s) => { add(s, { smarts: 2 }); return `You read ${randInt(3, 30)} books this year.`; }],
    ['Be nicer to people', (s) => { add(s, { karma: 3 }); return 'You held a lot of doors. It counts.'; }],
    ['No resolutions, just dancing', (s) => { add(s, { happy: 5 }); return 'You counted down with confetti in your hair.'; }],
  ],
});
HOL('valentine', null, {
  ages: [14, 95], emoji: '💝', text: "It's Valentine's Day.",
  choices: [
    { label: (s) => `Plan something special for ${nm(s, romanticId(s))}`, when: (s) => hasRomance(s), fx: (s) => { const pid = romanticId(s); addRel(s, pid, randInt(6, 14)); add(s, { happy: 5 }); return `${pick(['A candlelit dinner', 'A picnic at sunset', 'Breakfast in bed', 'A handwritten letter'])}. ${nm(s, pid)} loved it.`; } },
    { label: 'Forget it entirely', when: (s) => hasRomance(s), fx: (s) => { addRel(s, romanticId(s), -10); return 'You remembered at 9 p.m. The gas station had one sad rose left.'; } },
    { label: 'Celebrate with your single friends', when: (s) => !hasRomance(s), fx: (s) => { add(s, { happy: 4 }); relAll(s, K_FRIENDS, 4); return 'Pizza, bad movies, and a toast to being fabulous.'; } },
    { label: 'Buy yourself chocolate', when: (s) => !hasRomance(s), fx: (s) => { add(s, { happy: 3 }); return 'The best relationship is with half-price candy on February 15th.'; } },
  ],
});
HOL('parents_day', null, {
  ages: [6, 80], emoji: '💐', ctx: (s) => someone(s, ['parent', 'stepparent']),
  text: (s, c) => `It's ${genderWord(s.people[c.pid], "Father's Day", "Mother's Day", "Parents' Day")}.`,
  choices: [
    ['Make a card by hand', (s, c) => { addRel(s, c.pid, 8); return `${nm(s, c.pid)} put it on the fridge. It will be there for years.`; }],
    { label: 'Take them out to brunch', sub: (s) => fmtMoney(price(s, 80)), when: (s) => A(s) >= 16, fx: (s, c) => { const cost = price(s, 80); if (!pay(s, cost)) return cantAfford(cost); addRel(s, c.pid, 12); add(s, { happy: 3 }); return `${nm(s, c.pid)} told the waiter all about you.`; } },
    ['Forget to call', (s, c) => { addRel(s, c.pid, -8); return `${nm(s, c.pid)} said it was fine. It was not fine.`; }],
  ],
});
HOL('winter_wish', null, {
  ages: [3, 12], emoji: '🎁', text: 'The holidays are coming. What is at the top of your wish list?',
  choices: [
    ['A bike', (s) => { add(s, { happy: 6 }); addSkill(s, 'fitness', 2); return 'A shiny new bike! You rode it until it got dark.'; }],
    ['A video game console', (s) => { add(s, { happy: 7, smarts: -1 }); return 'You did not see daylight until January.'; }],
    ['A puppy', (s) => { if (parentsAgree(s) && chance(0.4)) { const p = giftPet(s, 'dog'); add(s, { happy: 10 }); return `There was a box with holes in it. Inside was ${p.name}!`; } add(s, { happy: -2 }); return 'You got socks. And a stuffed dog. It is not the same.'; }],
    ['Books', (s) => { add(s, { smarts: 2, happy: 3 }); return 'A whole stack of them. You read three before lunch.'; }],
  ],
});
HOL('holiday_hosting', null, {
  ages: [22, 95], emoji: '🦃', when: (s) => free(s) && livesAlone(s),
  text: 'Everyone wants to know who is hosting the big holiday dinner this year.',
  choices: [
    { label: 'Host it yourself', sub: (s) => fmtMoney(price(s, 400)), fx: (s) => { const cost = price(s, 400); if (!pay(s, cost)) return cantAfford(cost); addSkill(s, 'cooking', 2); relAll(s, K_FAMILY, 5); add(s, { happy: chance(0.6) ? 6 : -3 }); return pick(['The turkey was perfect. Everyone said so twice.', 'The oven died at noon. You ordered forty dumplings and called it a tradition.', 'Two relatives argued about politics, but the pie was a triumph.']); } },
    ['Volunteer at a shelter instead', (s) => { add(s, { karma: 5, happy: 4 }); return 'You served three hundred plates. It was the best holiday in years.'; }],
    { label: 'Escape somewhere warm', sub: (s) => fmtMoney(price(s, 1800)), fx: (s) => { const cost = price(s, 1800); if (!pay(s, cost)) return cantAfford(cost); tally(s, 'vacations'); relAll(s, ['parent'], -3); add(s, { happy: 8 }); return 'You spent the holidays on a beach. Your mother sent a passive-aggressive card.'; } },
  ],
});
HOL('holiday_party_kid', null, {
  ages: [4, 12], emoji: '🎄', when: (s) => relPeople(s, ['parent', 'grandparent']).length > 0, text: 'The whole family is together for the holidays.',
  choices: [
    ['Help in the kitchen', (s) => { addSkill(s, 'cooking', 2); relAll(s, ['parent', 'grandparent'], 4); return 'You were in charge of the mashed potatoes. They were lumpy. Everyone ate them.'; }],
    ['Sneak extra dessert', (s) => { add(s, { happy: 4 }); if (chance(0.3)) { getSick(s, 'stomach'); return 'Three slices of pie later, you regretted everything.'; } return 'Nobody noticed. You are a dessert ninja.'; }],
    ['Play with your cousins all day', (s) => { add(s, { happy: 6 }); return 'You built a fort out of every couch cushion in the house.'; }],
  ],
});

/* ---- country holidays ----------------------------------------------------------- */
HOL('halloween', ['us', 'ca', 'uk', 'ie', 'au'], {
  ages: [3, 12], emoji: '🎃', text: "It's Halloween! What will you dress up as?",
  choices: [
    ['Something scary', (s) => { add(s, { happy: 5 }); return `You went as ${pick(['a vampire', 'a zombie', 'a haunted doll', 'a werewolf'])} and scared your own grandma.`; }],
    ['Something funny', (s) => { add(s, { happy: 5 }); return `You went as ${pick(['a slice of pizza', 'a toaster', 'a banana', 'a potato'])}. You got extra candy for effort.`; }],
    ['A homemade costume', (s) => { addSkill(s, 'art', 3); add(s, { happy: 4 }); return 'Mostly cardboard and tape. Entirely yours.'; }],
    ['Skip trick-or-treating to eat candy at home', (s) => { add(s, { happy: 2 }); return 'You handed out half the candy and ate the other half.'; }],
  ],
});
HOL('halloween_grown', ['us', 'ca', 'uk', 'ie', 'au'], {
  ages: [13, 90], emoji: '👻', text: (s) => (hasKids(s) ? "It's Halloween, and the kids are vibrating with excitement." : "It's Halloween."),
  choices: [
    { label: 'Take the kids trick-or-treating', when: hasKids, fx: (s) => { relAll(s, ['child'], 6); add(s, { happy: 5 }); return 'You confiscated a "parent tax" of chocolate bars.'; } },
    ['Go to a costume party', (s) => { add(s, { happy: 5 }); if (chance(0.15) && !hasRomance(s) && A(s) >= 18) { const p = meetSomeone(s, 'friend', 60); return { text: `You met ${p.first} at the punch bowl. They were dressed as the other half of your costume.`, person: p.id }; } return 'Your costume won second place. You were robbed.'; }],
    ['Hand out full-size candy bars', (s) => { add(s, { karma: 3, money: -price(s, 60) }); return 'You are now the most famous house on the street.'; }],
    ['Turn off the lights and hide', () => 'You watched horror movies in the dark while kids knocked.'],
  ],
});
HOL('thanksgiving', ['us', 'ca'], {
  ages: [5, 100], emoji: '🦃', when: (s) => relPeople(s, K_FAMILY).length > 0, text: "It's Thanksgiving, and the whole family is around one table.",
  choices: [
    ['Say what you are grateful for', (s) => { relAll(s, K_FAMILY, 5); add(s, { happy: 4, karma: 1 }); return 'Your aunt cried. Your uncle pretended not to.'; }],
    ['Start a political argument', (s) => { relAll(s, K_FAMILY, -6); add(s, { happy: 1 }); return 'You won the argument. You lost the pie.'; }],
    ['Eat until you need a nap', (s) => { add(s, { happy: 5, health: -1 }); return 'You woke up on the couch with a napkin still tucked in your shirt.'; }],
  ],
});
HOL('independence', ['us', 'mx', 'in', 'ng', 'ph', 'kr', 'br', 'za', 'ca'], {
  ages: [4, 100], emoji: '🎇',
  text: (s) => `It's ${{ us: 'the Fourth of July', ca: 'Canada Day', za: 'Freedom Day', kr: 'Liberation Day' }[P(s).country] || 'Independence Day'}.`,
  choices: [
    ['Fireworks and a barbecue', (s) => { add(s, { happy: 5 }); if (chance(0.06)) { add(s, { health: -4 }); return 'A rogue firework singed your eyebrows. Worth it.'; } return 'Grilled food, cold drinks and a sky full of color.'; }],
    ['Watch the parade', (s) => { add(s, { happy: 3 }); return `You waved a tiny ${country(s).adj} flag until your arm got tired.`; }],
    ['Sleep in', () => 'A day off is a day off.'],
  ],
});
HOL('lunar_new_year', ['kr', 'ph'], {
  ages: [3, 100], emoji: '🧧', text: (s) => (P(s).country === 'kr' ? "It's Seollal, the Lunar New Year. The family gathers in their best clothes." : "It's Lunar New Year. Red lanterns line the streets."),
  choices: [
    { label: 'Bow to your elders for New Year money', when: (s) => A(s) < 18, fx: (s) => { const amt = price(s, randInt(20, 200)); add(s, { money: amt, happy: 5 }); return `Your envelopes added up to ${fmtMoney(amt)}.`; } },
    { label: 'Hand out envelopes to the kids', when: (s) => A(s) >= 25, fx: (s) => { const amt = price(s, randInt(50, 300)); M(s).money -= amt; relAll(s, ['child', 'grandchild', 'sibling'], 4); add(s, { karma: 2 }); return `You gave away ${fmtMoney(amt)} in crisp new bills. The kids adore you, for today.`; } },
    ['Eat until you burst', (s) => { add(s, { happy: 4 }); return 'Rice cake soup, dumplings, and a second bowl of everything.'; }],
  ],
});
HOL('chuseok', ['kr'], {
  ages: [5, 100], emoji: '🌕', text: "It's Chuseok. The family heads to the hometown to honor the ancestors and share the harvest.",
  choices: [
    ['Make songpyeon with the family', (s) => { addSkill(s, 'cooking', 2); relAll(s, K_FAMILY, 4); return 'Your rice cakes looked like lumpy moons. Grandma said they were perfect.'; }],
    ['Brave the holiday traffic', (s) => { add(s, { happy: -2 }); relAll(s, ['parent', 'grandparent'], 6); return 'A three-hour drive took eleven. Your family was very glad to see you.'; }],
  ],
});
HOL('diwali', ['in'], {
  ages: [3, 100], emoji: '🪔', text: "It's Diwali. Every window is glowing with lamps.",
  choices: [
    ['Light lamps and share sweets', (s) => { relAll(s, [...K_FAMILY, ...K_FRIENDS], 3); add(s, { happy: 5, karma: 1 }); return 'Your neighbors brought sweets, you brought sweets, and now everyone has too many sweets.'; }],
    ['Set off firecrackers', (s) => { add(s, { happy: 5 }); if (chance(0.08)) { add(s, { health: -5 }); return 'A rocket went sideways. You will be fine, eventually.'; } return 'The loudest night of the year, and you were part of it.'; }],
    { label: 'Buy gold for good luck', when: (s) => A(s) >= 20, sub: (s) => fmtMoney(price(s, 500)), fx: (s) => { const cost = price(s, 500); if (!pay(s, cost)) return cantAfford(cost); M(s).assets.push({ id: uid(s, 'a'), kind: 'jewelry', type: 'coin', emoji: '💰', name: 'Diwali gold coin', value: cost, paid: cost, cond: 100, since: s.year }); return 'A small gold coin, for prosperity.'; } },
  ],
});
HOL('holi', ['in'], {
  ages: [4, 90], emoji: '🌈', text: "It's Holi, the festival of colors.",
  choices: [
    ['Throw colored powder at everyone', (s) => { add(s, { happy: 7 }); relAll(s, K_FRIENDS, 4); return 'You were pink for three days. Totally worth it.'; }],
    ['Wear white and hope for the best', (s) => { add(s, { happy: 4 }); return 'Your white shirt lasted eight seconds.'; }],
  ],
});
HOL('eid', ['ng', 'in'], {
  ages: [3, 100], emoji: '🌙', text: "It's Eid, and the feasting has begun.",
  choices: [
    ['Visit family and friends', (s) => { relAll(s, [...K_FAMILY, ...K_FRIENDS], 4); add(s, { happy: 5 }); return 'Every house you visited fed you. You visited a lot of houses.'; }],
    ['Give to the poor', (s) => { const amt = price(s, 50); M(s).money -= amt; add(s, { karma: 5 }); return `You gave ${fmtMoney(amt)} to families in need.`; }],
  ],
});
HOL('day_of_dead', ['mx'], {
  ages: [5, 100], emoji: '💀', ctx: (s) => { const p = relPeople(s, K_FAMILY, { dead: true }).find((x) => !x.alive); return p ? { pid: p.id } : null; },
  text: (s, c) => `It's the Day of the Dead. You're building an altar for ${nm(s, c.pid)}.`,
  choices: [
    ['Fill it with their favorite things', (s, c) => { add(s, { happy: 6, karma: 2 }); return `Marigolds, candles, sugar skulls and ${pick(['their favorite candy', 'a photo from their wedding', 'a bottle of their terrible coffee', 'their old reading glasses'])}. It felt like they were in the room.`; }],
    ['Spend the night at the cemetery with family', (s) => { relAll(s, K_FAMILY, 5); add(s, { happy: 4 }); return 'Music, stories and candlelight until dawn.'; }],
  ],
});
HOL('carnival', ['br'], {
  ages: [8, 85], emoji: '🎭', text: "It's Carnival! The whole city is dancing.",
  choices: [
    { label: 'Join a samba school parade', sub: (s) => fmtMoney(price(s, 300)), when: (s) => A(s) >= 14, fx: (s) => { const cost = price(s, 300); if (!pay(s, cost)) return cantAfford(cost); addSkill(s, 'fitness', 3); add(s, { happy: 10, fame: chance(0.1) ? 2 : 0 }); return 'Feathers, sequins and seven hours of dancing. Your feet will forgive you by Easter.'; } },
    ['Follow a street party', (s) => { add(s, { happy: 7 }); if (A(s) >= 18 && chance(0.2)) habit(s, 'alcohol', 4); return 'You followed a brass band for twelve blocks and made forty new friends.'; }],
    ['Leave town for the quiet', () => 'You spent Carnival at a quiet beach house. Bliss.'],
  ],
});
HOL('bonfire_night', ['uk'], {
  ages: [4, 95], emoji: '🔥', text: "It's Bonfire Night. Fireworks are popping all over town.",
  choices: [
    ['Go to the big town bonfire', (s) => { add(s, { happy: 5 }); return 'Toffee apples, sparklers and a guy on stilts.'; }],
    ['Set off your own fireworks', (s) => { if (chance(0.1)) { add(s, { health: -5 }); return 'A rocket fell over and chased the dog. Then you.'; } add(s, { happy: 5 }); return 'Your back garden display was the talk of the street.'; }],
  ],
});
HOL('st_patricks', ['ie'], {
  ages: [4, 95], emoji: '☘️', text: "It's St. Patrick's Day.",
  choices: [
    ['March in the parade', (s) => { add(s, { happy: 5 }); return 'You marched behind a pipe band in the rain, grinning the whole way.'; }],
    { label: 'Spend it at the pub', when: (s) => A(s) >= country(s).drink, fx: (s) => { add(s, { happy: 5 }); habit(s, 'alcohol', 3); return 'You sang every song the band knew, and two it did not.'; } },
    ['Avoid the crowds', () => 'You watched the parade on TV with a cup of tea.'],
  ],
});
HOL('golden_week', ['jp'], {
  ages: [6, 95], emoji: '🎏', text: "It's Golden Week. The whole country is on holiday at once.",
  choices: [
    { label: 'Travel anyway', sub: (s) => fmtMoney(price(s, 600)), when: (s) => A(s) >= 16, fx: (s) => { const cost = price(s, 600); if (!pay(s, cost)) return cantAfford(cost); tally(s, 'vacations'); add(s, { happy: 6 }); return 'The bullet train was packed, the hot spring was perfect.'; } },
    ['Stay home and sleep', (s) => { add(s, { happy: 4, health: 1 }); return 'You slept fourteen hours. A national treasure.'; }],
  ],
});
HOL('obon', ['jp'], {
  ages: [5, 100], emoji: '🏮', text: "It's Obon, when families welcome back the spirits of their ancestors.",
  choices: [
    ['Visit the family grave', (s) => { relAll(s, ['parent', 'grandparent'], 4); add(s, { karma: 2 }); return 'You cleaned the gravestone and left fresh flowers.'; }],
    ['Dance at the Bon festival', (s) => { addSkill(s, 'fitness', 1); add(s, { happy: 6 }); return 'Lanterns, taiko drums and a circle of dancers until midnight.'; }],
  ],
});
HOL('midsummer', ['se'], {
  ages: [4, 100], emoji: '🌼', text: "It's Midsummer. The sun barely sets.",
  choices: [
    ['Dance around the maypole', (s) => { add(s, { happy: 6 }); return 'You hopped like a frog with everyone else. It is tradition.'; }],
    ['Pick seven flowers for your pillow', (s) => { add(s, { happy: 3 }); return chance(0.5) ? 'They say you will dream of your future love. You dreamed about herring.' : 'You dreamed of someone with kind eyes. You did not see their face.'; }],
    ['Eat pickled herring and strawberries', (s) => { add(s, { happy: 4 }); return 'Not together. Probably.'; }],
  ],
});
HOL('oktoberfest', ['de'], {
  ages: [18, 90], emoji: '🍺', text: "It's Oktoberfest season.",
  choices: [
    ['Find a seat in the beer tent', (s) => { add(s, { happy: 6 }); habit(s, 'alcohol', 4); return 'Brass band, giant pretzels, and a table of strangers who are now your best friends.'; }],
    ['Ride the rides and eat roast almonds', (s) => { add(s, { happy: 4 }); return 'The Ferris wheel view was worth the line.'; }],
    ['Avoid the city for two weeks', () => 'The trains are full of people in lederhosen. You stayed home.'],
  ],
});
HOL('bastille', ['fr'], {
  ages: [4, 100], emoji: '🎆', text: "It's Bastille Day.",
  choices: [
    ['Watch the fireworks over the river', (s) => { add(s, { happy: 5 }); return 'The whole city went "ooh" at the same time.'; }],
    ["Dance at a firefighters' ball", (s) => { add(s, { happy: 6 }); return 'An accordion, a fire station and dancing until two in the morning.'; }],
  ],
});
HOL('ferragosto', ['it'], {
  ages: [4, 100], emoji: '🏖️', text: "It's Ferragosto. Half the country is at the beach.",
  choices: [
    ['Join the exodus to the coast', (s) => { add(s, { happy: 6 }); if (chance(0.25)) getSick(s, 'sunburn'); return 'Three hours of traffic, eight hours of sea, one enormous lunch.'; }],
    ['Enjoy the empty city', (s) => { add(s, { happy: 4 }); return 'You had the whole piazza to yourself.'; }],
  ],
});
HOL('tomatina', ['es'], {
  ages: [12, 70], emoji: '🍅', text: 'La Tomatina is this week: a town-wide tomato fight.',
  choices: [
    ['Throw tomatoes with strangers', (s) => { add(s, { happy: 8 }); return 'You found tomato seeds in your ears for a week.'; }],
    ['Watch from a balcony', (s) => { add(s, { happy: 3 }); return 'Still got hit. Balconies are not safe.'; }],
  ],
});
HOL('easter', EASTER, {
  ages: [3, 10], emoji: '🐣', text: "It's Easter, and there's an egg hunt in the garden.",
  choices: [
    ['Hunt like your life depends on it', (s) => { add(s, { happy: 5 }); return `You found ${randInt(9, 31)} eggs, including one from last year. Do not eat that one.`; }],
    ['Help the little kids find theirs', (s) => { add(s, { happy: 3, karma: 3 }); return 'You pointed at bushes very obviously. The little ones were thrilled.'; }],
  ],
});
HOL('summer_christmas', SOUTHERN, {
  ages: [3, 100], emoji: '🎅', text: 'Christmas in the middle of summer: barbecue, sunscreen and a beach full of Santa hats.',
  choices: [
    ['Spend it at the beach', (s) => { add(s, { happy: 6 }); if (chance(0.3)) getSick(s, 'sunburn'); return 'Prawns on the grill and a sunburned Santa in the surf.'; }],
    ['A family lunch in the backyard', (s) => { relAll(s, K_FAMILY, 4); add(s, { happy: 4 }); return 'Pavlova, cricket on the lawn and an uncle asleep under a tree.'; }],
  ],
});

/* ---- the seasons ----------------------------------------------------------------- */
HOL('first_snow', SNOWY, {
  ages: [3, 90], emoji: '☃️', text: 'The first snow of the year fell overnight.',
  choices: [
    ['Build a snowman', (s) => { add(s, { happy: 5 }); return `You named it ${pick(['Gerald', 'Frosty Jr.', 'Mr. Carrot', 'Sir Chilly'])}. It lasted three days.`; }],
    ['Start a snowball fight', (s) => { add(s, { happy: 6 }); relAll(s, [...K_FRIENDS, 'sibling'], 3); return 'You won. Everyone else says otherwise.'; }],
    { label: 'Shovel the neighbors’ driveways', when: (s) => A(s) >= 10, fx: (s) => { const amt = price(s, randInt(20, 120)); add(s, { money: amt, karma: 2 }); addSkill(s, 'fitness', 2); return `Your back hurts, but you made ${fmtMoney(amt)}.`; } },
  ],
});
HOL('blizzard', SNOWY, {
  ages: [16, 100], w: 0.6, emoji: '🌨️', text: 'A blizzard buried the city. Nothing is moving for three days.',
  choices: [
    ['Hunker down with soup and movies', (s) => { add(s, { happy: 3 }); return 'The coziest three days of the year.'; }],
    ['Dig out and check on your neighbors', (s) => { add(s, { karma: 4 }); addSkill(s, 'fitness', 2); return 'The old man next door was out of heating oil. You fixed that.'; }],
  ],
});
HOL('spring', null, {
  ages: [4, 100], emoji: '🌸', text: 'Spring is here. The trees are blooming and the pollen is everywhere.',
  choices: [
    ['Have a picnic under the blossoms', (s) => { add(s, { happy: 5 }); if (chance(0.25)) getSick(s, 'allergies'); return 'Sandwiches, sunshine and a lot of sneezing.'; }],
    { label: 'Spring-clean the whole place', when: (s) => A(s) >= 14, fx: (s) => { add(s, { happy: 3 }); if (chance(0.15)) { const amt = price(s, randInt(20, 400)); add(s, { money: amt }); return `Behind the couch you found ${fmtMoney(amt)} in forgotten cash.`; } return 'You threw out nine bags of junk and kept one weird lamp.'; } },
    ['Stay inside with the windows shut', () => 'Your nose thanks you.'],
  ],
});
HOL('summer_camp', null, {
  ages: [7, 13], emoji: '🏕️', when: (s) => relPeople(s, ['parent']).length > 0, text: 'Your parents are signing you up for summer camp. Which one?',
  choices: [
    ['Outdoor adventure camp', (s) => { addSkill(s, 'fitness', 3); add(s, { happy: 5 }); const p = meetSomeone(s, 'friend', 60); return { text: `Canoes, campfires and a raccoon that stole your shoe. You and ${p.first} are friends for life now.`, person: p.id }; }],
    ['Science camp', (s) => { add(s, { smarts: 3, happy: 3 }); return 'You built a rocket that went higher than the counselor’s.'; }],
    ['Arts and theater camp', (s) => { addSkill(s, 'acting', 3); addSkill(s, 'art', 2); add(s, { happy: 4 }); return 'You played a tree in the final show. The best tree.'; }],
    ['Beg to stay home', (s) => { add(s, { happy: 1 }); return 'You won. It was a very long, very boring summer.'; }],
  ],
});
HOL('back_to_school', null, {
  ages: [6, 17], emoji: '🎒', when: isStudent, text: "It's the first day of a new school year.",
  choices: [
    ['Sit in the front row', (s) => { add(s, { smarts: 2 }); return 'Your teacher already knows your name. For better or worse.'; }],
    ['Sit next to someone new', (s) => { const p = meetSomeone(s, 'friend', 50); return { text: `You sat next to ${p.first}. You've been inseparable ever since.`, person: p.id }; }],
    ['Show off your new clothes', (s) => { add(s, { happy: 3, looks: 1 }); return 'You looked great. You checked your reflection in every window.'; }],
  ],
});
HOL('autumn_leaves', SNOWY, {
  ages: [3, 12], emoji: '🍂', text: 'The leaves turned red and gold, and someone raked them into a giant pile.',
  choices: [
    ['Jump in!', (s) => { add(s, { happy: 6 }); return chance(0.2) ? 'There was a garden gnome hidden in the pile. Ouch.' : 'Best. Pile. Ever.'; }],
    ['Collect the prettiest ones', (s) => { addSkill(s, 'art', 2); add(s, { happy: 3 }); return 'You pressed them in a book. They are still there.'; }],
  ],
});
HOL('pumpkin_patch', ['us', 'ca'], {
  ages: [3, 12], emoji: '🎃', text: 'Your family went to a pumpkin patch.',
  choices: [
    ['Pick the biggest pumpkin', (s) => { add(s, { happy: 5 }); return 'You could not lift it. Your dad pulled a muscle.'; }],
    ['Get lost in the corn maze', (s) => { add(s, { happy: 4 }); return 'Forty-five minutes. You found the exit by crying.'; }],
  ],
});
HOL('beach_day', null, {
  ages: [4, 85], emoji: '🏖️', text: 'It is the hottest day of the summer, and everyone is heading to the beach.',
  choices: [
    ['Swim out past the waves', (s) => { addSkill(s, 'fitness', 2); add(s, { happy: 5 }); if (chance(0.03)) { add(s, { health: -8 }); return 'A rip current pulled you out. A lifeguard pulled you back. Lesson learned.'; } return 'The water was perfect.'; }],
    ['Build an epic sandcastle', (s) => { addSkill(s, 'art', 2); add(s, { happy: 4 }); return 'It had a moat, three towers and a drawbridge made of a popsicle stick.'; }],
    ['Nap in the sun', (s) => { add(s, { happy: 3 }); if (chance(0.5)) { getSick(s, 'sunburn'); return 'You woke up the color of a lobster.'; } return 'The best nap of the year.'; }],
  ],
});
HOL('typhoon', STORMY.typhoon, {
  ages: [4, 100], w: 0.6, emoji: '🌀', text: 'A typhoon is heading straight for the coast.',
  choices: [
    ['Stock up and ride it out', (s) => { add(s, { happy: -3 }); if (myHouse(s) && chance(0.3)) { const fix = price(s, randInt(1500, 9000)); M(s).money -= fix; return `The wind tore off part of your roof. Repairs: ${fmtMoney(fix)}.`; } return 'Two days of howling wind. You played cards by flashlight.'; }],
    ['Evacuate inland', (s) => { add(s, { happy: -1 }); return 'You stayed with relatives until it passed. Your street flooded, but you were safe.'; }],
  ],
});
HOL('monsoon', STORMY.monsoon, {
  ages: [4, 100], w: 0.7, emoji: '🌧️', text: 'The monsoon rains arrived all at once.',
  choices: [
    ['Dance in the first rain', (s) => { add(s, { happy: 5 }); if (chance(0.2)) getSick(s, 'cold'); return 'Everyone poured into the street. The smell of wet earth was incredible.'; }],
    ['Wade to work anyway', (s) => { add(s, { happy: -2 }); return 'Knee-deep water, ruined shoes, and a lot of respect from your boss.'; }],
  ],
});
HOL('hurricane', STORMY.hurricane, {
  ages: [4, 100], w: 0.5, emoji: '🌪️', text: 'A hurricane is forecast to make landfall near you.',
  choices: [
    ['Board up and stay', (s) => { add(s, { happy: -4 }); if (myHouse(s) && chance(0.35)) { const fix = price(s, randInt(3000, 25000)); M(s).money -= fix; return `It hit hard. Flood damage cost ${fmtMoney(fix)} to fix.`; } return 'The windows rattled all night, but you made it through.'; }],
    ['Evacuate', (s) => { add(s, { happy: -2 }); return 'Twelve hours in traffic to a motel. You came home to a fallen tree and a dry house.'; }],
  ],
});
HOL('prison_holiday', null, {
  ages: [10, 120], prison: true, emoji: '🍗', text: 'It is a holiday. The prison kitchen is serving "festive loaf."',
  choices: [
    ['Share a meal with the inmates on your block', (s) => { add(s, { happy: 3 }); const cm = pickRel(s, ['cellmate']); if (cm) addRel(s, cm, 6); return 'Someone saved candy for weeks to share. It was a good day, all things considered.'; }],
    ['Write letters home', (s) => { add(s, { happy: 2 }); relAll(s, K_FAMILY, 3); return 'You wrote until lights out.'; }],
  ],
});
