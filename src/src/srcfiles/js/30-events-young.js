/* =====================================================================
 * 30-events-young.js — event content for babies, toddlers and kids (0-12),
 * plus the small helpers event content shares.
 * ===================================================================== */

/* ---- helpers for event content ------------------------------------- */
function giftPet(s, sp) {
  const S = PET_SPECIES[sp];
  const id = uid(s, 'pet');
  s.pets[id] = { id, species: sp, breed: pick(S.breeds), name: pick(PET_NAMES), born: s.year - randInt(0, 2), alive: true, rel: 70, life: randInt(S.life[0], S.life[1]), owner: s.playerId };
  tally(s, 'pets');
  return s.pets[id];
}
function parentsAgree(s) { return relPeople(s, ['parent']).some((p) => chance(relOf(s, p.id).rel / 110)); }
function relAll(s, kinds, d) { for (const p of relPeople(s, kinds)) addRel(s, p.id, d); }
function myCar(s) { return M(s).assets.find((a) => a.kind === 'car') || null; }
function myHouse(s) { return M(s).assets.find((a) => a.kind === 'house') || null; }
function crushable(s, kinds) {
  return someone(s, kinds, (p) => attractedTo(P(s), p) && ageOk(A(s), ageOf(s, p)) && !p.partner);
}
function tryRomance(s, pid, bonus) {
  const p = s.people[pid];
  if (!p) return;
  if (!attractedTo(p, P(s))) { add(s, { happy: -2 }); return `${p.first} let you down gently. They're not into you that way.`; }
  if (chance(clamp(askOutOdds(s, p) + (bonus || 0), 0.05, 0.95))) return startRomance(s, pid);
  addRel(s, pid, -4);
  add(s, { happy: -4 });
  return `${p.first} turned you down.`;
}
function candidatePerson(s, opts) {
  const c = makeDateCandidate(s, opts);
  return makePerson(s, { first: c.first, last: c.last, gender: c.gender, age: c.age, country: c.country, city: P(s).city, looks: c.looks, smarts: c.smarts, traits: c.traits, job: c.job, edu: c.edu, money: c.money || 0 });
}
function parentsSplit(s) {
  const [a, b] = relPeople(s, ['parent']);
  if (!a || !b || a.partner !== b.id) return false;
  a.partner = b.partner = null;
  a.married = b.married = false;
  return true;
}
const isStudent = (s) => inSchool(s) && eduCur(s).kind === 'school';

/* ---- babies & toddlers (0-4) --------------------------------------- */
EV('baby_word', {
  ages: [1, 2], once: true, emoji: '🗣️', text: 'You said your first word!',
  auto: (s) => { add(s, { happy: 3 }); return `It was "${pick(['mama', 'dada', 'no', 'doggy', 'cookie', 'uh-oh', 'ball', 'more', 'why'])}."`; },
});
EV('baby_walk', {
  ages: [1, 2], once: true, emoji: '👣', text: 'You took your first wobbly steps.',
  auto: (s) => { add(s, { happy: 3, health: 1 }); return 'Everyone clapped. You fell over. Everyone clapped again.'; },
});
EV('baby_potty', { ages: [2, 4], once: true, emoji: '🚽', text: 'You finally mastered the potty.', auto: (s) => { add(s, { happy: 3 }); return 'A proud day for the whole family.'; } });
EV('tod_bug', {
  ages: [1, 4], emoji: '🐛', text: 'You found a beetle crawling across the kitchen floor.',
  choices: [
    ['Eat it', (s) => { add(s, { health: -1, happy: 2 }); return 'It was {crunchy|surprisingly salty|a mistake}. Someone screamed.'; }],
    ['Pet it', (s) => { add(s, { happy: 3, karma: 1 }); return 'You named it Gerald. Gerald left.'; }],
    ['Squish it', (s) => { add(s, { karma: -2 }); return 'Squish. You show no mercy.'; }],
  ],
});
EV('tod_tantrum', {
  ages: [2, 5], emoji: '🍭', text: 'At the grocery store, you spotted a giant rainbow lollipop.',
  choices: [
    ['Throw a tantrum', (s) => { relAll(s, ['parent'], -2); if (chance(0.4)) { add(s, { happy: 4 }); return 'You screamed until they bought it. Victory tastes like strawberry.'; } add(s, { happy: -3 }); return 'You screamed in aisle five. No lollipop.'; }],
    ['Ask nicely', (s) => { if (chance(0.6)) { add(s, { happy: 3 }); return 'You said please. It worked!'; } return 'They said maybe next time.'; }],
    ['Let it go', (s) => { add(s, { karma: 1 }); return 'You walked away. Very mature for a toddler.'; }],
  ],
});
EV('tod_crayon', {
  ages: [2, 5], emoji: '🖍️', text: 'You found a box of crayons and a big, blank wall.',
  choices: [
    ['Draw a mural on the wall', (s) => { addSkill(s, 'art', 2); relAll(s, ['parent'], -4); return 'Your mural was {breathtaking|mostly purple|a portrait of the cat}. Your parents were not impressed.'; }],
    ['Draw on paper', (s) => { addSkill(s, 'art', 2); add(s, { happy: 2 }); return 'You drew {a dog|a house|a sun with a face}. It went straight on the fridge.'; }],
    ['Eat a crayon', (s) => { add(s, { health: -1 }); return 'The blue one tasted best.'; }],
  ],
});
EV('tod_dog', {
  ages: [1, 5], emoji: '🐕', text: "A neighbor's huge, fluffy dog bounded up to you at the park.",
  choices: [
    ['Hug it', (s) => { if (chance(0.85)) { add(s, { happy: 4 }); return 'The dog licked your entire face. Best friends forever.'; } add(s, { health: -3, happy: -4 }); return 'The dog knocked you flat. You cried.'; }],
    ['Run away screaming', (s) => { add(s, { happy: -1 }); return 'The dog thought it was a game. It was not a game.'; }],
  ],
});
EV('tod_bite', {
  ages: [2, 5], emoji: '🦷', text: 'A kid at daycare bit your arm!',
  choices: [
    ['Bite back', (s) => { add(s, { karma: -2, happy: 2 }); return 'An eye for an eye. Both of you were sent to time-out.'; }],
    ['Tell the teacher', (s) => { add(s, { karma: 1 }); return 'The teacher made the biter apologize.'; }],
    ['Cry', (s) => { add(s, { happy: -2 }); return 'You cried until snack time.'; }],
  ],
});
EV('tod_veggies', {
  ages: [2, 6], emoji: '🥦', text: 'There is a pile of broccoli on your plate.',
  choices: [
    ['Eat it', (s) => { add(s, { health: 2 }); return 'You ate every tree. Strong bones!'; }],
    ['Throw it on the floor', (s) => { relAll(s, ['parent'], -2); return 'Broccoli everywhere. Dinner is over.'; }],
    ['Feed it to the dog', (s) => (Object.keys(s.pets).length ? 'The dog loved it. Your secret is safe.' : 'There is no dog. Your parents saw everything.')],
  ],
});
EV('tod_nightmare', {
  ages: [2, 7], emoji: '👻', text: 'You woke up from a terrible nightmare about a monster under your bed.',
  choices: [
    ["Run to your parents' bed", (s) => { const p = pickRel(s, ['parent']); if (p) addRel(s, p, 3); return 'You squeezed in between your parents and slept like a log.'; }],
    ['Hide under the covers', (s) => { add(s, { happy: -1 }); return 'You stayed under the blanket until the sun came up.'; }],
    ['Fight the monster', (s) => { add(s, { happy: 3 }); return 'You bravely checked under the bed. Only socks. You win.'; }],
  ],
});
EV('tod_bath', {
  ages: [1, 4], emoji: '🛁', text: "It's bath time.",
  choices: [
    ['Splash everywhere', (s) => { add(s, { happy: 3 }); return 'The bathroom flooded. Worth it.'; }],
    ['Behave', (s) => { relAll(s, ['parent'], 1); return 'You sat quietly with your rubber duck. A model citizen.'; }],
    ['Escape and run naked through the house', (s) => { add(s, { happy: 4 }); return 'You did three laps before they caught you.'; }],
  ],
});

/* ---- toddler hazards: the risky choice can end a life early.
 * The wildest ones are tagged chaos (off unless switched on in Settings). */
EV('tod_outlet', {
  ages: [1, 4], once: true, emoji: '🔌', text: 'You found a fork lying right next to a very interesting wall socket.',
  choices: [
    ['Stick the fork in', (s) => { if (chance(0.06)) { die(s, 'while sticking a fork in a wall socket'); return 'ZAP.'; } add(s, { health: -4, happy: 1 }); return 'ZAP. Your hair has been standing straight up ever since.'; }],
    ['Put the fork in your mouth instead', (s) => { add(s, { happy: 1 }); return 'Much safer. A little metallic.'; }],
    ['Hand it to a grown-up', (s) => { relAll(s, ['parent'], 2); add(s, { karma: 1 }); return 'Your parents went pale, then childproofed every socket in the house.'; }],
  ],
});
EV('tod_fridge', {
  ages: [2, 4], once: true, emoji: '🍪', text: 'The cookie jar lives on top of the fridge. You have a chair and a plan.',
  choices: [
    ['Climb up', (s) => {
      if (chance(0.05)) { die(s, 'a fall from the top of the fridge'); return 'The chair wobbled.'; }
      if (chance(0.5)) { add(s, { happy: 5 }); return 'You made it to the summit and ate four cookies in total silence.'; }
      add(s, { health: -6, happy: -3 });
      if (chance(0.2)) getSick(s, 'broken_arm');
      return 'The chair slid out from under you. No cookies, just a lot of crying.';
    }],
    ['Ask nicely for a cookie', (s) => (chance(0.5) ? (add(s, { happy: 3 }), 'It worked. One cookie, delivered with a kiss on the head.') : 'They said not before dinner.')],
    ['Give up', () => 'The cookies win this round.'],
  ],
});
EV('tod_fan', {
  ages: [3, 5], once: true, emoji: '🛏️', text: 'From the top bunk, you can almost reach the spinning ceiling fan.',
  choices: [
    ['Grab a blade', (s) => { if (chance(0.05)) { die(s, 'a ceiling fan accident'); return 'Round and round you went.'; } add(s, { health: -3, happy: 4 }); return 'You went around eleven times before you let go. Best ride ever.'; }],
    ['Throw a sock at it', (s) => { add(s, { happy: 2 }); return 'The sock flew across the room and landed in the fish tank.'; }],
    ['Lie down and watch it spin', (s) => { add(s, { happy: 1 }); return 'You fell asleep counting the rotations.'; }],
  ],
});
EV('tod_glowing', {
  ages: [1, 4], once: true, tags: ['chaos'], emoji: '☢️', text: 'Behind the couch, you found something small, round, and softly glowing green.',
  choices: [
    ['Eat it', (s) => {
      if (chance(0.3)) { die(s, 'after eating a glowing marble and exploding'); return 'You swallowed it. There was a bright flash.'; }
      add(s, { smarts: randInt(4, 10), health: -3 });
      return 'You glowed faintly for a week. The doctors have questions. You can now count to a thousand.';
    }],
    ['Lick it', (s) => { add(s, { happy: 3 }); return 'Your tongue tingled for three days. For a while you could hear radio stations in your teeth.'; }],
    ['Leave it alone', (s) => { add(s, { karma: 1 }); return 'Wise. The next morning it was gone. Nobody knows where it went.'; }],
  ],
});
EV('tod_goose', {
  ages: [2, 5], once: true, tags: ['chaos'], emoji: '🦢', text: 'A goose waddled into the backyard and stared directly into your soul.',
  choices: [
    ['Challenge it to single combat', (s) => {
      if (chance(0.25)) { die(s, 'in single combat with a goose'); return 'The goose did not hold back.'; }
      if (chance(0.45)) { add(s, { happy: 8 }); return 'You won. The goose bows to you now. The whole neighborhood saw it.'; }
      add(s, { health: -5, happy: -4 });
      return 'The goose won. You will never speak of this.';
    }],
    ['Offer it a cracker', (s) => { add(s, { happy: 4 }); return 'The goose accepted your tribute and follows you around now.'; }],
    ['Run', (s) => { add(s, { happy: -1 }); return 'It chased you around the yard twice and then went home.'; }],
  ],
});
EV('tod_balloons', {
  ages: [2, 4], once: true, tags: ['chaos'], emoji: '🎈', text: 'Someone tied an enormous bunch of helium balloons to your wrist at a party.',
  choices: [
    ['Jump as high as you can', (s) => {
      if (chance(0.2)) { die(s, 'after floating away on party balloons, never to be seen again'); return 'Up, up and away.'; }
      add(s, { happy: 8 });
      return 'You floated over three backyards before a tree caught you. The local paper called you Balloon Baby.';
    }],
    ['Hold on and wave at everyone', (s) => { add(s, { happy: 3 }); return 'Your feet left the ground for a second. An uncle grabbed your ankle.'; }],
    ['Let go', (s) => { add(s, { happy: -2 }); return 'You watched them drift away and cried about it for an hour.'; }],
  ],
});
EV('tod_pinata', {
  ages: [3, 5], once: true, tags: ['chaos'], emoji: '🐝', text: 'You found a big papery ball hanging in the backyard tree. It looks exactly like a piñata.',
  choices: [
    ['Whack it with a stick', (s) => {
      if (chance(0.25)) { die(s, 'during a piñata incident involving actual bees'); return 'It was not a piñata.'; }
      add(s, { health: -8, happy: -5 });
      return 'It was not a piñata. You were swollen like a balloon for a week, but you made it.';
    }],
    ['Poke it gently', (s) => { add(s, { health: -2 }); return 'One bee came out to see who was knocking. You got the message.'; }],
    ['Go tell a grown-up', (s) => { relAll(s, ['parent'], 2); return 'Your parent took one look and called an exterminator.'; }],
  ],
});

/* ---- kids (5-12) --------------------------------------------------- */
EV('kid_tooth', {
  ages: [5, 8], once: true, emoji: '🦷', text: 'You lost your first tooth!',
  choices: [
    ['Put it under your pillow', (s) => { const amt = price(s, randInt(1, 5)); add(s, { money: amt, happy: 3 }); return `The tooth fairy left you ${fmtMoney(amt)}.`; }],
    ['Keep it in a jar', () => 'You started a tooth collection. Totally normal.'],
  ],
});
EV('kid_bully', {
  ages: [6, 15], w: 2, when: isStudent, emoji: '😠',
  ctx: (s) => ({ name: randomFirst(P(s).country, chance(0.5) ? 'm' : 'f') }),
  text: (s, c) => `${c.name}, the class bully, demanded your lunch money.`,
  choices: [
    ['Hand it over', (s) => { add(s, { happy: -4 }); return 'Your stomach growled all afternoon.'; }],
    ['Fight back', (s, c) => {
      tally(s, 'fights');
      if (skill(s, 'martial') + skill(s, 'fitness') / 2 + (trait(s, 'hotheaded') ? 10 : 0) + randInt(0, 60) > 45) { add(s, { happy: 6 }); addSkill(s, 'martial', 1); return `You stood up to ${c.name}. They never bothered you again.`; }
      add(s, { health: -5, happy: -5 }); return `${c.name} gave you a black eye.`;
    }],
    ['Tell a teacher', (s) => { add(s, { karma: 1 }); return chance(0.6) ? 'The teacher stepped in. The bullying stopped.' : 'The teacher told you to "work it out." Thanks.'; }],
    ['Crack a joke', (s, c) => { if (trait(s, 'funny') || chance(0.4)) { add(s, { happy: 4 }); return `You made the whole class laugh at ${c.name} instead.`; } add(s, { health: -2 }); return "The joke didn't land. Neither did your dodge."; }],
  ],
});
EV('kid_wallet', {
  ages: [6, 90], emoji: '👛', text: (s) => `You found a wallet on the sidewalk with ${fmtMoney(price(s, 80))} inside.`,
  choices: [
    ['Turn it in', (s) => { add(s, { karma: 4, happy: 2 }); if (chance(0.3)) { const r = price(s, randInt(10, 50)); add(s, { money: r }); return `The owner was so grateful they gave you ${fmtMoney(r)} as a reward.`; } return 'You turned it in. Good human.'; }],
    ['Take the cash, return the wallet', (s) => { add(s, { money: price(s, 80), karma: -2 }); return 'You pocketed the cash and dropped the wallet in a mailbox.'; }],
    ['Keep everything', (s) => { add(s, { money: price(s, 80), karma: -4 }); return 'Finders keepers.'; }],
  ],
});
EV('kid_copy', {
  ages: [8, 17], when: isStudent, emoji: '📝', ctx: (s) => someone(s, ['classmate', 'friend', 'bestie'], (p) => ageOf(s, p) < 19),
  text: (s, c) => `${nm(s, c.pid)} wants to copy your homework.`,
  choices: [
    ['Let them', (s, c) => { addRel(s, c.pid, 6); add(s, { karma: -1 }); if (chance(0.2)) { eduCur(s).grades = clamp100(eduCur(s).grades - 6); return 'The teacher noticed your answers were identical. You both got zeros.'; } return `${nm(s, c.pid)} owes you one.`; }],
    ['Refuse', (s, c) => { addRel(s, c.pid, -4); return `${nm(s, c.pid)} called you a goody-goody.`; }],
    ['Tell the teacher', (s, c) => { addRel(s, c.pid, -15); add(s, { karma: 1 }); return `${nm(s, c.pid)} got detention. They are not happy with you.`; }],
  ],
});
EV('kid_kitten', {
  ages: [5, 17], emoji: '🐈', text: 'A scrawny stray kitten followed you home.',
  choices: [
    ['Beg to keep it', (s) => { if (parentsAgree(s)) { const p = giftPet(s, 'cat'); add(s, { happy: 6 }); return `Your parents caved. Meet ${p.name}! 🐈`; } add(s, { happy: -3 }); return 'Your parents said no. The kitten went to a shelter.'; }],
    ['Take it to a shelter', (s) => { add(s, { karma: 3 }); return 'The shelter staff promised to find it a home.'; }],
    ['Shoo it away', (s) => { add(s, { karma: -2 }); return 'The kitten looked back at you one last time. Ouch.'; }],
  ],
});
EV('kid_sleepover', {
  ages: [6, 14], emoji: '🛏️', ctx: (s) => someone(s, ['friend', 'bestie', 'classmate'], (p) => Math.abs(ageOf(s, p) - A(s)) <= 3),
  text: (s, c) => `${nm(s, c.pid)} invited you to a sleepover.`,
  choices: [
    ['Go', (s, c) => { addRel(s, c.pid, 10); add(s, { happy: 5 }); if (relKind(s, c.pid) === 'classmate') setRel(s, c.pid, 'friend'); return pick(['You stayed up all night telling ghost stories.', 'You made a pillow fort the size of a car.', 'You prank-called a pizza place. Twice.']); }],
    ['Stay home', (s, c) => { addRel(s, c.pid, -2); return 'You stayed home. You heard it was epic.'; }],
  ],
});
EV('kid_sciencefair', {
  ages: [8, 15], when: isStudent, emoji: '🔬', text: 'The science fair is coming up. What will you build?',
  choices: [
    ['A baking-soda volcano', (s) => sciFair(s, 0.3, 'Your volcano erupted beautifully.')],
    ['A robot', (s) => { addSkill(s, 'coding', 3); return sciFair(s, 0.15 + skill(s, 'coding') / 100, 'Your robot rolled across the gym floor.'); }],
    ['An experiment on plants and music', (s) => sciFair(s, 0.25, 'Turns out plants like jazz.')],
    ['Skip it', () => 'You skipped the science fair.'],
  ],
});
function sciFair(s, base, line) {
  add(s, { smarts: randInt(1, 3) });
  if (chance(clamp(base + P(s).stats.smarts / 200, 0.05, 0.9))) { add(s, { happy: 6 }); tally(s, 'awards'); return `${line} You won first place! 🥇`; }
  return `${line} The judges gave you an honorable mention.`;
}
EV('kid_spelling', {
  ages: [7, 13], when: isStudent, emoji: '🐝', text: () => `You made the spelling bee finals. Your word: "${pick(['onomatopoeia', 'bureaucracy', 'rhythm', 'chrysanthemum', 'mischievous', 'conscientious'])}."`,
  choices: [
    ['Spell it confidently', (s) => { if (chance(P(s).stats.smarts / 110)) { add(s, { happy: 7 }); tally(s, 'awards'); return 'You spelled it perfectly and won the spelling bee! 🏆'; } add(s, { happy: -3 }); return 'You missed one letter. So close.'; }],
    ['Ask for it in a sentence. Then stall.', (s) => { if (chance(P(s).stats.smarts / 130)) { add(s, { happy: 6 }); return 'The stalling worked. You got it right!'; } return 'All that stalling and you still got it wrong.'; }],
  ],
});
EV('kid_swing', {
  ages: [5, 11], emoji: '🎠', text: 'Your friends dared you to jump off the swing at full height.',
  choices: [
    ['Jump!', (s) => { if (chance(0.22)) { getSick(s, 'broken_arm'); add(s, { happy: -3 }); return 'You flew... then landed on your arm. It is broken.'; } add(s, { happy: 5 }); return 'You stuck the landing. Playground legend.'; }],
    ['Chicken out', (s) => { add(s, { happy: -1 }); return 'Bawk bawk.'; }],
  ],
});
EV('kid_newkid', {
  ages: [6, 17], when: isStudent, emoji: '🧒',
  ctx: (s) => ({ name: randomFirst(P(s).country, chance(0.5) ? 'm' : 'f') }),
  text: (s, c) => `A new kid named ${c.name} joined your class and is sitting alone at lunch.`,
  choices: [
    ['Sit with them', (s, c) => { const p = makePerson(s, { first: c.name, age: A(s), country: P(s).country, city: P(s).city }); setRel(s, p.id, 'friend', randInt(55, 75)); add(s, { karma: 3, happy: 3 }); tally(s, 'friendsMade'); return { text: `You and ${c.name} became fast friends.`, person: p.id }; }],
    ['Ignore them', () => 'Someone else will probably say hi.'],
    ['Make fun of them', (s) => { add(s, { karma: -4 }); return 'You made fun of the new kid. Not your finest moment.'; }],
  ],
});
EV('kid_parents_fight', {
  ages: [4, 17], emoji: '🗯️',
  when: (s) => { const ps = relPeople(s, ['parent']); return ps.length === 2 && ps[0].partner === ps[1].id; },
  text: 'Your parents got into a huge fight in the kitchen.',
  choices: [
    ['Hide in your room', (s) => { add(s, { happy: -4 }); return splitMaybe(s, 'You put on headphones and waited for it to end.'); }],
    ['Try to calm them down', (s) => { add(s, { happy: -2, karma: 2 }); relAll(s, ['parent'], 3); return splitMaybe(s, 'You stepped in between them. They stopped, embarrassed.'); }],
    ['Turn up the TV', (s) => { add(s, { happy: -2 }); return splitMaybe(s, 'You turned the cartoons up to max volume.'); }],
  ],
});
function splitMaybe(s, line) {
  if (chance(0.18) && parentsSplit(s)) { add(s, { happy: -10 }); return line + ' A few weeks later, your parents told you they are getting divorced.'; }
  return line;
}
EV('kid_birthday', {
  ages: [5, 12], emoji: '🎂', text: "It's your birthday! What kind of party do you want?",
  choices: [
    ['A huge party', (s) => { const rich = relPeople(s, ['parent']).reduce((t, p) => t + p.money, 0) > price(s, 20000); if (rich) { add(s, { happy: 8 }); return 'There was a bouncy castle AND a magician. Best day ever.'; } add(s, { happy: -2 }); return "Your parents said a huge party isn't in the budget this year."; }],
    ['A small party with friends', (s) => { add(s, { happy: 5 }); relAll(s, ['friend', 'bestie'], 3); return 'Pizza, cake and your favorite people.'; }],
    ['Just family', (s) => { add(s, { happy: 3 }); relAll(s, ['parent', 'sibling'], 3); return 'A cozy birthday at home.'; }],
  ],
});
EV('kid_icecream', {
  ages: [4, 10], emoji: '🍦', text: 'The ice cream truck is coming down the street!',
  choices: [
    ['Chase it down', (s) => { addSkill(s, 'fitness', 1); if (chance(0.6)) { add(s, { happy: 4 }); return 'You caught it! Rocket pop secured.'; } return 'It drove off. You ran three blocks for nothing.'; }],
    ['Beg your parents for money', (s) => { if (parentsAgree(s)) { add(s, { happy: 4 }); return 'Your parents gave you money for a cone.'; } return 'Your parents said there is ice cream in the freezer. It is frozen peas.'; }],
    ['Ignore it', () => 'You have more important things to do. Like naps.'],
  ],
});
EV('kid_gaming', {
  ages: [7, 16], emoji: '🎮', text: "You got a new video game. It's 2 a.m. and you're on the final boss.",
  choices: [
    ['Keep playing', (s) => { add(s, { happy: 4, health: -1 }); habit(s, 'gaming', randInt(3, 8)); return 'You beat the boss at 4 a.m. and slept through breakfast.'; }],
    ['Go to sleep', (s) => { add(s, { health: 1 }); return 'Responsible. The boss will still be there tomorrow.'; }],
  ],
});
EV('kid_window', {
  ages: [6, 13], emoji: '💥', text: "You broke the neighbor's window playing ball.",
  choices: [
    ['Confess', (s) => { add(s, { karma: 3 }); relAll(s, ['parent'], -2); return 'You confessed. Your parents paid for it, but they were proud you told the truth.'; }],
    ['Run away', (s) => { add(s, { karma: -3 }); if (chance(0.35)) { relAll(s, ['parent'], -8); return 'The neighbor saw you. Your parents grounded you for a month.'; } return 'You got away with it. The guilt lingers.'; }],
    { label: 'Blame your sibling', when: (s) => relPeople(s, ['sibling']).length > 0, fx: (s) => { const sib = pickRel(s, ['sibling']); addRel(s, sib, -12); add(s, { karma: -4 }); return `You blamed ${nm(s, sib)}. They got in trouble. They know it was you.`; } },
  ],
});
EV('kid_classpet', {
  ages: [6, 10], when: isStudent, emoji: '🐹', text: 'Your teacher asks who wants to take the class hamster home for the weekend.',
  choices: [
    ['Volunteer', (s) => { if (chance(0.88)) { add(s, { happy: 4, karma: 1 }); return 'Mr. Nibbles had a lovely weekend.'; } add(s, { happy: -6 }); return 'Mr. Nibbles escaped. He was found in the couch three days later, very pleased with himself.'; }],
    ['Pass', () => 'Someone else can deal with Mr. Nibbles.'],
  ],
});
EV('kid_talent', {
  ages: [6, 17], when: isStudent, emoji: '🎤', text: 'The school talent show is coming up.',
  choices: [
    ['Sing', (s) => talentShow(s, 'music', 'sang')],
    ['Dance', (s) => talentShow(s, 'fitness', 'danced')],
    ['Do magic tricks', (s) => talentShow(s, 'charisma', 'did magic tricks')],
    ['Do stand-up comedy', (s) => talentShow(s, 'acting', 'did stand-up', trait(s, 'funny') ? 25 : 0)],
    ['Skip it', () => 'You watched from the audience.'],
  ],
});
function talentShow(s, k, verb, bonus) {
  addSkill(s, k, 2);
  if (randInt(0, 100) < skill(s, k) + 25 + (bonus || 0)) { add(s, { happy: 7, fame: 1 }); tally(s, 'awards'); return `You ${verb} and brought the house down! First place! 🏆`; }
  if (chance(0.5)) { add(s, { happy: -5 }); return `You ${verb}. Someone laughed, and not in a good way.`; }
  add(s, { happy: 2 });
  return `You ${verb}. Polite applause.`;
}
EV('kid_couch', {
  ages: [5, 15], emoji: '🛋️', text: (s) => `You found ${fmtMoney(price(s, 20))} stuck in the couch cushions.`,
  choices: [
    ['Keep it', (s) => { add(s, { money: price(s, 20) }); return 'Free money!'; }],
    ['Give it to your parents', (s) => { add(s, { karma: 2 }); relAll(s, ['parent'], 3); return 'Your parents were touched by your honesty.'; }],
  ],
});
EV('kid_lost_mall', {
  ages: [4, 9], emoji: '🏬', text: 'You got separated from your family at the mall.',
  choices: [
    ['Find a security guard', (s) => { add(s, { smarts: 1 }); return 'The guard announced your name over the speakers. Your parents came running.'; }],
    ['Look for them yourself', (s) => (chance(0.6) ? 'You found them at the food court, eating pretzels without you.' : 'You wandered for an hour before a kind lady helped you.')],
    ['Cry loudly', (s) => { add(s, { happy: -2 }); return 'Very effective. Your parents found you within a minute.'; }],
  ],
});
EV('kid_tree', {
  ages: [6, 13], emoji: '🌳', text: 'You climbed the tallest tree in the park.',
  choices: [
    ['Climb higher', (s) => { if (chance(0.18)) { getSick(s, chance(0.5) ? 'broken_arm' : 'broken_leg'); return 'A branch snapped. You fell and broke a bone.'; } add(s, { happy: 5 }); return 'You could see the whole city from the top!'; }],
    ['Climb back down', () => 'You climbed down safely. Smart.'],
  ],
});
EV('kid_secret', {
  ages: [7, 15], emoji: '🤫', ctx: (s) => someone(s, ['sibling']),
  text: (s, c) => `Your ${kinLabel('sibling', s.people[c.pid]).toLowerCase()} ${nm(s, c.pid)} told you a big secret and made you promise not to tell.`,
  choices: [
    ['Keep the secret', (s, c) => { addRel(s, c.pid, 8); add(s, { karma: 1 }); return 'Your lips are sealed.'; }],
    ['Tell your parents', (s, c) => { addRel(s, c.pid, -15); return `${nm(s, c.pid)} got in big trouble. They aren't speaking to you.`; }],
    ['Use it as blackmail', (s, c) => { addRel(s, c.pid, -8); add(s, { karma: -3, happy: 2 }); return `${nm(s, c.pid)} has been doing your chores for weeks.`; }],
  ],
});
EV('kid_report', {
  ages: [6, 17], w: 1.5, when: isStudent, emoji: '📋', text: 'Report cards came home today.',
  auto: (s) => {
    const g = eduCur(s).grades;
    const letter = g >= 90 ? 'straight As' : g >= 75 ? 'mostly Bs' : g >= 60 ? 'mostly Cs' : g >= 45 ? 'a few Ds' : 'an F or two';
    if (g >= 75) { relAll(s, ['parent'], 3); add(s, { happy: 2 }); return `You got ${letter}. Your parents put it on the fridge.`; }
    if (g < 50) { relAll(s, ['parent'], -4); add(s, { happy: -3 }); return `You got ${letter}. Your parents were disappointed.`; }
    return `You got ${letter}.`;
  },
});
EV('kid_snowday', { ages: [5, 15], when: isStudent, emoji: '❄️', text: 'School was canceled for a snow day!', auto: (s) => { add(s, { happy: 4 }); return vary('You built {a snowman|an epic snow fort|a snow dragon} and had {a snowball fight|hot cocoa|the best day ever}.'); } });
EV('kid_petwish', {
  ages: [6, 13], when: (s) => !myPets(s).length, emoji: '🐶', text: 'You really, really want a pet.',
  choices: [
    ['Beg relentlessly', (s) => { if (chance(0.35)) { const p = giftPet(s, pick(['dog', 'cat', 'hamster', 'fish', 'rabbit'])); add(s, { happy: 8 }); return `It worked! Meet ${p.name}, your new ${PET_SPECIES[p.species].name.toLowerCase()}! ${PET_SPECIES[p.species].emoji}`; } relAll(s, ['parent'], -2); return 'Your parents said no. Firmly.'; }],
    ['Promise to do all the chores', (s) => { if (parentsAgree(s)) { const p = giftPet(s, pick(['dog', 'cat', 'guinea', 'fish'])); add(s, { happy: 8 }); return `Deal! Meet ${p.name}! ${PET_SPECIES[p.species].emoji} (You will now be doing all the chores.)`; } return 'Your parents said they will think about it. They will not think about it.'; }],
    ['Forget about it', () => 'Maybe when you are older.'],
  ],
});
EV('kid_allowance', {
  ages: [7, 15], once: true, emoji: '💵', text: 'Your parents offer you an allowance if you do chores.',
  choices: [
    ['Deal', (s) => { add(s, { money: price(s, randInt(100, 300)), karma: 1 }); return 'You dusted, vacuumed and saved up a nice little nest egg.'; }],
    ['Negotiate a better deal', (s) => { if (chance(0.3 + skill(s, 'charisma') / 100)) { add(s, { money: price(s, randInt(250, 500)) }); addSkill(s, 'business', 2); return 'You negotiated double. Future CEO.'; } return 'Your parents laughed and offered half.'; }],
    ['No thanks', () => 'Chores are not for you.'],
  ],
});
EV('kid_glasses', { ages: [6, 14], once: true, w: 0.5, emoji: '👓', text: 'You got glasses.', auto: (s) => { add(s, { smarts: 1, looks: -1 }); return 'You can finally read the board.'; } });
EV('kid_braces', { ages: [10, 15], once: true, w: 0.5, emoji: '😬', text: 'You got braces.', auto: (s) => { add(s, { looks: -1, happy: -2 }); return 'Your smile will be worth it someday.'; } });
EV('kid_sport', {
  ages: [5, 12], emoji: '⚽', text: 'Your parents want to sign you up for a sport.',
  choices: [
    ['Soccer', (s) => sportPick(s, 'soccer')],
    ['Swimming', (s) => sportPick(s, 'swimming')],
    ['Basketball', (s) => sportPick(s, 'basketball')],
    ['Gymnastics', (s) => sportPick(s, 'gymnastics')],
    ['No thanks', () => 'You would rather stay inside.'],
  ],
});
function sportPick(s, name) { addSkill(s, 'athletics', randFloat(3, 6)); addSkill(s, 'fitness', randFloat(2, 4)); add(s, { happy: 3 }); return `You joined a ${name} team. ${pick(['You scored in your first game!', 'You spent most of the season on the bench.', 'Your coach says you have real talent.', 'You mostly liked the orange slices.'])}`; }
EV('kid_instrument', {
  ages: [6, 12], emoji: '🎼', text: 'Your parents want you to learn an instrument.',
  choices: [
    ['Piano', (s) => instrumentPick(s, 'piano')],
    ['Guitar', (s) => instrumentPick(s, 'guitar')],
    ['Violin', (s) => instrumentPick(s, 'violin')],
    ['Drums', (s) => { relAll(s, ['parent'], -2); return instrumentPick(s, 'drums') + ' Your parents regret this.'; }],
    ['Absolutely not', () => 'Your musical career is over before it began.'],
  ],
});
function instrumentPick(s, name) { addSkill(s, 'music', randFloat(4, 8)); return `You started ${name} lessons. ${skill(s, 'music') > 20 ? 'You are a natural.' : 'It sounds like a cat in a blender, but you are improving.'}`; }
EV('kid_haunted', {
  ages: [7, 14], emoji: '🏚️', text: 'The kids at school say the old house at the end of the street is haunted.',
  choices: [
    ['Sneak inside', (s) => { if (chance(0.15)) { add(s, { health: -4 }); return 'You fell through a rotten floorboard. Not haunted, just dangerous.'; } add(s, { happy: 5 }); return pick(['You heard footsteps upstairs and ran for your life.', 'It was just raccoons. Lots of raccoons.', 'You found an old diary. Creepy and cool.']); }],
    ['Dare a friend to go in', (s) => { add(s, { happy: 2 }); return 'Your friend went in and came out screaming. Classic.'; }],
    ['Stay far away', () => 'Some mysteries are better left alone.'],
  ],
});
EV('kid_field_trip', {
  ages: [6, 13], when: isStudent, emoji: '🚌', text: () => `Your class went on a field trip to ${pick(['the science museum', 'the aquarium', 'a farm', 'the zoo', 'a chocolate factory', 'the planetarium'])}.`,
  auto: (s) => { add(s, { smarts: randInt(0, 2), happy: 3 }); return pick(['You learned a lot.', 'You got lost from the group for twenty minutes.', 'You bought a souvenir pencil.', 'It was the best day of the year.']); },
});
