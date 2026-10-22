/* =====================================================================
 * 56-growing-up.js — being a kid at home: Playtime (from your first year),
 * allowance and chores, asking your parents for things, house rules,
 * getting grounded, curfew, sneaking out, and parties while they're away.
 *
 * M(s).home (homeRec, made the first time anything looks) = { strict 0-100 (how
 *   strict your parents are), curfew (an hour, 20-24), grounded (the last year
 *   you're grounded through), groundings, allow (allowance a year, in dollars),
 *   phone, console, collection }
 * It only matters while you're under 18 and live with your parents (atHome).
 * Grounding hides outings, parties and dates (GROUNDED_BLOCKS). homeYear (from
 * youthTick, after houseTick) pays the allowance; 55-school-life.js calls
 * groundFor and parentsSeeCard.
 * ===================================================================== */

function homeRec(s) { const m = M(s); return m.home || (m.home = { strict: clamp(Math.round(gauss(50, 18)), 5, 95), curfew: 21, grounded: 0, groundings: 0, allow: 0, phone: false, console: false, collection: null }); }
function myParents(s) { return relPeople(s, ['parent', 'stepparent']).filter((p) => p.alive); }
function atHome(s) { return A(s) < 18 && M(s).housing.type === 'parents' && !inPrison(s) && myParents(s).length > 0; }
function grounded(s) { return atHome(s) && homeRec(s).grounded >= s.year; }
function strictWord(v) { return v >= 75 ? 'Very strict' : v >= 55 ? 'Strict' : v >= 35 ? 'Fair' : 'Easygoing'; }
function curfewText(h) { return h >= 24 ? 'midnight' : `${h - 12} p.m.`; }
// Grounded for the rest of this year (or through next year). Strict parents ground more.
function groundFor(s, why, sure, long) {
  if (!atHome(s)) return false;
  const h = homeRec(s);
  if (!sure && !chance(0.3 + h.strict / 140)) return false;
  h.grounded = Math.max(h.grounded, s.year + (long ? 1 : 0));
  h.groundings++;
  tally(s, 'grounded');
  log(s, `🔒 You're grounded ${long ? 'until the end of next year' : 'for the rest of the year'} for ${why}.`, 'bad');
  return true;
}
// Your parents read the report card.
function parentsSeeCard(s, fails, as) {
  if (!atHome(s)) return;
  const h = homeRec(s);
  if (fails) {
    relAll(s, ['parent', 'stepparent'], -3 * fails);
    if (h.allow && h.strict >= 60 && chance(0.5)) { h.allow = 0; log(s, '💵 Your parents stopped your allowance until your grades come up.', 'bad'); }
    groundFor(s, 'a failing grade');
  } else if (as >= 4) {
    relAll(s, ['parent', 'stepparent'], 3);
    if (chance(0.4)) { const amt = price(s, randInt(20, 100)); M(s).money += amt; log(s, `💵 Your parents gave you ${fmtMoney(amt)} for that report card.`, 'good'); }
  }
}
// Your parents decide: what it costs, whether they can afford it, how they feel about you,
// and how strict they are. The richest one pays.
function parentsSayYes(s, cost, base) {
  const ps = myParents(s).sort((a, b) => b.money - a.money);
  if (!ps.length) return false;
  const rel = sum(ps, (p) => relOf(s, p.id).rel) / ps.length;
  const canPay = ps[0].money >= cost;
  if (!chance(clamp(base + rel / 250 + (canPay ? 0.1 : -0.5) - (homeRec(s).strict - 50) / 250, 0.02, 0.95))) return false;
  if (cost) ps[0].money = Math.max(0, ps[0].money - cost);
  return true;
}
// Actions that stop while you're grounded.
const GROUNDED_BLOCKS = ['meet', 'party', 'concert', 'movies', 'themepark', 'shopping', 'find_date', 'dingdong', 'vacation', 'p_tp'];
for (const id of GROUNDED_BLOCKS) { const a = ACTIONS[id]; if (!a) continue; const w = a.when; a.when = (s, t) => !grounded(s) && w(s, t); }

/* ---- Playtime ------------------------------------------------------------------------ */
const playAge = (lo, hi) => (s) => free(s) && A(s) >= lo && A(s) <= hi;
const aParent = (s) => pick(myParents(s));
function play(id, o) { defAction(Object.assign({ id, cat: 'play' }, o)); }
play('pl_cry', {
  label: 'Cry for attention', emoji: '😭', when: playAge(0, 3),
  run: (s) => { const p = aParent(s); add(s, { happy: 1 }); if (!p) return 'You cried. Someone came eventually.'; if (bump(s, 'pl_cry') > 2) { addRel(s, p.id, -2); return `${p.first} put in earplugs.`; } relGain(s, p.id, 3); return `${p.first} picked you up and rocked you until you stopped. ${pick(['Victory.', 'You fell asleep on their shoulder.', 'Worth it.'])}`; },
});
play('pl_babble', {
  label: 'Babble', emoji: '👶', when: playAge(0, 2),
  run: (s) => { const n = bump(s, 'pl_babble'); add(s, { smarts: n <= 2 ? randInt(0, 2) : 0 }); const p = aParent(s); if (p) relGain(s, p.id, 2); return pick(['"Ba-ba-ba-ba." Your parents are convinced it was a word.', 'You told a long, serious story to the ceiling fan.', '"Da!" you said, pointing at the dog. Close enough.', 'You blew a raspberry and laughed at yourself for a full minute.']); },
});
play('pl_peekaboo', {
  label: 'Play peekaboo', emoji: '👀', when: playAge(0, 3),
  run: (s) => { const p = aParent(s); add(s, { happy: 3 }); if (p) relGain(s, p.id, 4); return `${p ? p.first : 'Someone'} disappeared behind their hands and came back. Every single time, it was amazing.`; },
});
play('pl_toys', {
  label: 'Play with your toys', emoji: '🧸', when: playAge(1, 9),
  run: (s) => { const n = bump(s, 'pl_toys'); add(s, { happy: n <= 3 ? 2 : 0, smarts: n === 1 && chance(0.4) ? 1 : 0 }); return A(s) <= 3 ? pick(['You stacked three blocks and knocked them over. Then again. Then again.', 'You fed your stuffed bear an imaginary sandwich.', 'You put the square block in the square hole. Genius.']) : pick(['You built a whole city out of blocks and ruled it wisely.', 'Your action figures fought a war over the couch cushions.', 'You held a tea party for every stuffed animal you own.']); },
});
play('pl_story', {
  label: 'Ask for a bedtime story', emoji: '📚', when: playAge(2, 9),
  run: (s) => { const p = aParent(s); if (!p) return 'You told yourself a story about a dragon. It was pretty good.'; relGain(s, p.id, 4); add(s, { smarts: bump(s, 'pl_story') <= 2 ? 1 : 0 }); return `${p.first} read you ${pick(['a story about a lost bunny', 'the dinosaur book, for the hundredth time', 'a chapter of a book about pirates', 'a story they made up on the spot'])}. You were asleep before the end.`; },
});
play('pl_draw', {
  label: 'Draw', emoji: '🖍️', when: playAge(2, 11),
  run: (s) => { addSkill(s, 'art', randFloat(1, 2.5) / bump(s, 'pl_draw')); if (A(s) < 6 && chance(0.2)) { relAll(s, ['parent', 'stepparent'], -2); return 'You drew a beautiful horse. On the living room wall. In permanent marker.'; } return `You drew ${pick(['your whole family as stick people', 'a purple dog with six legs', 'a rocket ship going to the sun', 'your house, with you as the tallest person in it'])}. It went on the fridge.`; },
});
play('pl_pretend', {
  label: 'Play pretend', emoji: '🦸', when: playAge(3, 10),
  run: (s) => { addSkill(s, 'acting', randFloat(1, 2) / bump(s, 'pl_pretend')); add(s, { happy: 2 }); if (!flag(s, 'imaginaryFriend') && A(s) <= 7 && chance(0.25)) { const n = pick(['Mr. Bubbles', 'Captain Zoom', 'Gloria', 'Sir Fluff', 'Bob the Invisible']); flag(s, 'imaginaryFriend', n); return `You made a new friend: ${n}. Nobody else can see ${n}. That's fine.`; } return `You were ${pick(['a dragon guarding the kitchen', 'an astronaut on the backyard moon', 'a chef running a very busy restaurant', 'a superhero saving the cat'])} all afternoon.`; },
});
play('pl_explore', {
  label: 'Explore the house', emoji: '🔍', when: playAge(1, 5),
  run: (s) => { if (chance(0.06)) { add(s, { health: -3, happy: -2 }); return 'You found the corner of the coffee table with your forehead.'; } add(s, { happy: 2, smarts: chance(0.3) ? 1 : 0 }); return `You found ${pick(['the cookie jar (on a high shelf, sadly)', 'the cat, who did not want to be found', 'a whole drawer of spoons', 'the TV remote, and hid it', 'a dust bunny the size of your head'])}.`; },
});
play('pl_mess', {
  label: 'Make a huge mess', emoji: '💥', when: playAge(1, 6),
  run: (s) => { add(s, { happy: 4 }); relAll(s, ['parent', 'stepparent'], -2); return pick(['You emptied every cupboard in the kitchen. Art.', 'You discovered what happens when you squeeze a whole tube of toothpaste.', 'Flour. Everywhere. Including the dog.', 'You built a mountain out of every pillow in the house.']); },
});
play('pl_cartoons', {
  label: 'Watch cartoons', emoji: '📺', when: playAge(2, 12),
  run: (s) => { const n = bump(s, 'pl_cartoons'); add(s, { happy: n <= 3 ? 2 : 0, smarts: n > 3 ? -1 : 0 }); return n > 3 ? 'You watched so many cartoons that you started talking like a cartoon.' : `You watched ${pick(['a show about a talking bus', 'superhero cartoons all morning', 'the same movie for the eleventh time', 'a show about a family of dogs'])}.`; },
});
play('pl_outside', {
  label: 'Play outside', emoji: '🌳', when: playAge(4, 12),
  run: (s) => {
    addSkill(s, 'fitness', randFloat(1, 2) / bump(s, 'pl_outside'));
    add(s, { happy: 3, health: 1 });
    if (chance(0.1)) { add(s, { health: -2 }); return 'You scraped your knee falling off the monkey bars. You were very brave about it, mostly.'; }
    if (chance(0.2)) { const me = P(s), k = makePerson(s, { age: A(s) + randInt(-1, 1), country: me.country, city: me.city }); setRel(s, k.id, 'friend', 50); return { text: `You met ${k.first} at the park. You played tag until dinner, and now you're friends.`, person: k.id }; }
    return `You ${pick(['climbed the tallest tree on the street', 'had a water fight with the hose', 'raced bikes around the block', 'dug for treasure in the yard and found a bottle cap'])}.`;
  },
});
play('pl_fort', {
  label: 'Build a fort', emoji: '🏰', when: playAge(4, 11),
  run: (s) => { add(s, { happy: 4 }); const sib = pick(relPeople(s, ['sibling', 'halfsibling']).filter((p) => ageOf(s, p) < 16)); if (sib) { relGain(s, sib.id, 5); return `You and ${sib.first} built a blanket fort with a secret password. Grown-ups were not allowed.`; } return 'You built a blanket fort and declared it an independent country.'; },
});
play('pl_games', {
  label: 'Play video games', emoji: '🎮', when: playAge(6, 17),
  run: (s) => {
    const n = bump(s, 'pl_games'), h = homeRec(s);
    if (atHome(s) && h.strict >= 70 && n >= 2 && chance(0.4)) { add(s, { happy: -2 }); return 'Your parents unplugged the console mid-game. "Screen time is over."'; }
    add(s, { happy: n <= 3 ? 3 : 1 });
    if (chance(0.3)) addSkill(s, 'coding', 0.5);
    return h.console || !atHome(s) ? `You ${pick(['beat the final boss after forty tries', 'built a castle block by block', 'played online until your eyes went square', 'speedran your favorite level'])}.` : 'You played games at a friend’s house. You still don’t have a console of your own.';
  },
});
play('pl_collect', {
  label: 'Start a collection', emoji: '📦', when: (s) => playAge(5, 14)(s) && !homeRec(s).collection,
  run: (s) => { const c = pick(['rocks', 'trading cards', 'stamps', 'bottle caps', 'stickers', 'coins from other countries']); homeRec(s).collection = c; add(s, { happy: 3 }); return `You started collecting ${c}. You have three already. It's a start.`; },
});

/* ---- Home & Parents ------------------------------------------------------------------- */
defAction({
  id: 'hm_chores', cat: 'parents', label: 'Do your chores', emoji: '🧹',
  when: (s) => atHome(s) && free(s) && A(s) >= 4 && count(s, 'hm_chores') < 3,
  run: (s) => {
    bump(s, 'hm_chores');
    relAll(s, ['parent', 'stepparent'], randInt(2, 4));
    const what = pick(A(s) < 8 ? ['picked up your toys', 'fed the cat', 'set the table'] : ['washed the dishes', 'mowed the lawn', 'folded the laundry', 'cleaned your room, actually cleaned it', 'took out the trash']);
    if (chance(0.25)) { const tip = price(s, randInt(5, 20)); M(s).money += tip; return `You ${what}. Your parents slipped you ${fmtMoney(tip)}.`; }
    return `You ${what}.`;
  },
});
function allowanceFor(s) {
  const rich = sum(myParents(s), (p) => p.money), mult = rich > price(s, 500000) ? 2 : rich > price(s, 60000) ? 1.2 : rich > price(s, 10000) ? 0.8 : 0.4;
  return price(s, clamp(A(s) * 1.2, 3, 25) * mult * 52);
}
defAction({
  id: 'hm_allowance', cat: 'parents', emoji: '💵',
  label: (s) => (homeRec(s).allow ? 'Ask for a raise in your allowance' : 'Ask for an allowance'),
  sub: (s) => (homeRec(s).allow ? `${fmtMoney(homeRec(s).allow)} a year now` : 'Money of your own, every week'),
  when: (s) => atHome(s) && free(s) && A(s) >= 6 && count(s, 'hm_allowance') < 1,
  run: (s) => {
    bump(s, 'hm_allowance');
    const h = homeRec(s), want = h.allow ? Math.round(h.allow * 1.3) : allowanceFor(s);
    if (!parentsSayYes(s, 0, 0.25 + Math.min(3, count(s, 'hm_chores') + lastCount(s, 'hm_chores')) * 0.07)) return { text: `"Money doesn't grow on trees." You've heard that one before.`, tone: 'bad' };
    h.allow = want;
    return { text: `Your parents agreed: ${fmtMoney(Math.round(want / 52))} a week. You're rich.`, tone: 'good' };
  },
});
const ASKS = {
  phone: { label: 'A phone of your own', emoji: '📱', age: 10, cost: 400, base: 0.3, ok: (s) => !homeRec(s).phone },
  console: { label: 'A game console', emoji: '🎮', age: 6, cost: 450, base: 0.25, ok: (s) => !homeRec(s).console },
  curfew: { label: 'A later curfew', emoji: '⏰', age: 13, cost: 0, base: 0.2, ok: (s) => homeRec(s).curfew < 24 },
  party: { label: 'A birthday party', emoji: '🎂', age: 5, cost: 300, base: 0.45, ok: () => true },
  tutor: { label: 'A tutor', emoji: '📘', age: 8, cost: 1500, base: 0.4, ok: (s) => !!schoolCur(s) },
  car: { label: 'Help buying a car', emoji: '🚗', age: 16, cost: 0, base: 0.2, ok: (s) => !!M(s).license && !M(s).assets.some((a) => a.kind === 'car') },
};
defAction({
  id: 'hm_ask', cat: 'parents', label: 'Ask your parents for something', emoji: '🙏',
  when: (s) => atHome(s) && free(s) && A(s) >= 5,
  run: (s) => {
    popup(s, { emoji: '🙏', title: 'Pretty please?', handler: 'hmAsk', choices: Object.keys(ASKS).filter((k) => A(s) >= ASKS[k].age && ASKS[k].ok(s)).map((k) => ({ label: `${ASKS[k].emoji} ${ASKS[k].label}`, value: k, disabled: count(s, 'ask_' + k) > 0, sub: count(s, 'ask_' + k) ? 'Already asked this year' : '' })).concat([{ label: 'Never mind', value: null }]) });
  },
});
onChoice('hmAsk', (s, ctx, k) => {
  const A_ = ASKS[k];
  if (!A_ || count(s, 'ask_' + k)) return;
  bump(s, 'ask_' + k);
  const h = homeRec(s), cost = price(s, A_.cost);
  let base = A_.base + (k === 'curfew' ? skill(s, 'charisma') / 250 : 0) + (k === 'tutor' && schoolCur(s).grades < 55 ? 0.3 : 0);
  if (k === 'car') {
    const rich = myParents(s).sort((a, b) => b.money - a.money)[0], gift = price(s, randInt(4000, 12000));
    if (!rich || rich.money < gift * 3 || !parentsSayYes(s, gift, base)) return { text: '"A car? Get a job," they said, helpfully.', tone: 'bad' };
    M(s).money += gift;
    return { text: `Your parents gave you ${fmtMoney(gift)} toward a car. The rest is up to you.`, tone: 'good' };
  }
  if (!parentsSayYes(s, cost, base)) return { text: pick(['"We\'ll see." That means no.', '"Ask again when your room is clean."', '"Absolutely not."', '"Maybe for your birthday." Your birthday came and went.']), tone: 'bad' };
  if (k === 'phone') { h.phone = true; addPop(s, 3); return { text: 'You have a phone! Your group chats have never been busier.', tone: 'good' }; }
  if (k === 'console') { h.console = true; add(s, { happy: 6 }); return { text: 'A brand-new console. You set it up before they finished saying "homework first."', tone: 'good' }; }
  if (k === 'curfew') { h.curfew = Math.min(24, h.curfew + 1); return { text: `Your curfew is ${curfewText(h.curfew)} now. Don't push it.`, tone: 'good' }; }
  if (k === 'party') { add(s, { happy: 6 }); addPop(s, 4); relAll(s, K_FRIENDS, 4); return { text: `${pick(['A bouncy castle', 'A pizza party', 'A sleepover with everyone', 'A trip to the trampoline park'])} for your birthday. Best day ever.`, tone: 'good' }; }
  const cur = schoolCur(s);
  cur.grades = clamp100(cur.grades + randInt(4, 8));
  add(s, { smarts: 2 });
  return { text: 'Your parents hired a tutor. Twice a week, painfully, your grades went up.', tone: 'good' };
});
defAction({
  id: 'hm_sneak', cat: 'parents', label: 'Sneak out at night', emoji: '🌃',
  sub: (s) => (grounded(s) ? 'You are grounded. Very risky.' : `Curfew is ${curfewText(homeRec(s).curfew)}`),
  when: (s) => atHome(s) && free(s) && A(s) >= 12 && count(s, 'hm_sneak') < 2,
  run: (s) => {
    bump(s, 'hm_sneak');
    const h = homeRec(s);
    const caught = chance(clamp(0.15 + h.strict / 250 + (grounded(s) ? 0.15 : 0) - (trait(s, 'cunning') ? 0.08 : 0) - skill(s, 'streetwise') / 400, 0.05, 0.7));
    add(s, { happy: 4 });
    const what = pick(A(s) >= 15 ? ['went to a party at an older kid’s house', 'drove around with friends until two in the morning', 'climbed the water tower and watched the city lights', 'met up with your crush at the park'] : ['rode bikes around the empty streets with friends', 'snuck into the neighbor’s pool', 'watched a meteor shower from the roof', 'went to the 24-hour diner for fries']);
    addPop(s, 2);
    if (A(s) >= 15 && what.includes('party') && chance(0.4)) habit(s, 'alcohol', randInt(1, 4));
    if (!caught) return `You climbed out your window and ${what}. You were back in bed before anyone noticed.`;
    relAll(s, ['parent', 'stepparent'], -randInt(5, 10));
    groundFor(s, 'sneaking out', true, grounded(s));
    return { text: `You ${what}, then came home to find ${aParent(s) ? aParent(s).first : 'your parent'} waiting in the dark kitchen.`, tone: 'bad' };
  },
});
defAction({
  id: 'hm_party', cat: 'parents', label: 'Throw a party while your parents are away', emoji: '🎉',
  when: (s) => atHome(s) && free(s) && A(s) >= 14 && count(s, 'hm_party') < 1,
  run: (s) => houseParty(s),
});
function houseParty(s) {
  bump(s, 'hm_party');
  const h = homeRec(s);
  add(s, { happy: 8 });
  addPop(s, 8);
  relAll(s, [...K_FRIENDS, 'classmate'], 3);
  tally(s, 'houseParties');
  if (chance(0.3)) habit(s, 'alcohol', randInt(1, 4));
  const broke = chance(0.3) ? pick(['a lamp', 'the glass coffee table', 'your mom’s favorite vase', 'the fridge door, somehow']) : null;
  if (!chance(clamp(0.25 + h.strict / 300 + (broke ? 0.2 : 0), 0.1, 0.8))) return `The whole school came. ${broke ? `Somebody broke ${broke}, and you replaced it before anyone got home.` : 'You cleaned until sunrise and nobody ever found out.'}`;
  relAll(s, ['parent', 'stepparent'], -randInt(8, 14));
  groundFor(s, 'throwing a party in their house', true, true);
  return { text: `${broke ? `Somebody broke ${broke}. ` : ''}A neighbor called your parents. They came home early to find forty teenagers in the living room.`, tone: 'bad' };
}

/* ---- the year at home ------------------------------------------------------------------- */
function homeYear(s) {
  if (!atHome(s)) return;
  const h = homeRec(s);
  if (h.allow) {
    if (!lastCount(s, 'hm_chores') && h.strict >= 55 && chance(0.4)) { h.allow = 0; log(s, '💵 No chores, no allowance. Your parents cut you off.', 'bad'); return; }
    const p = myParents(s).sort((a, b) => b.money - a.money)[0];
    if (p && p.money >= h.allow) { p.money -= h.allow; M(s).money += h.allow; finRow(s, 'inc', 'Allowance', h.allow); }
    else if (p) { h.allow = 0; log(s, '💵 Money got tight at home, and your allowance was the first thing to go.', 'bad'); }
  }
}
function youthTick(s) {
  if (s.dead) return;
  homeYear(s);
  lessonsYear(s); // 57-lessons.js
}

/* ---- events -------------------------------------------------------------------------------- */
EV('hm_parents_away', {
  ages: [14, 17], emoji: '🧳', when: (s) => atHome(s) && free(s), text: 'Your parents are going away for the weekend. "We trust you."',
  choices: [
    ['Throw a party', (s) => houseParty(s)],
    ['Invite one friend over', (s) => { relAll(s, K_FRIENDS, 3); add(s, { happy: 4 }); return 'Pizza, horror movies and absolutely no sleep. Perfect.'; }],
    ['Enjoy the quiet', (s) => { add(s, { happy: 3 }); return 'You ate cereal for dinner and controlled the TV. Peace.'; }],
  ],
});
EV('hm_curfew', {
  ages: [13, 17], emoji: '⏰', when: (s) => atHome(s) && free(s), text: (s) => `You lost track of time at a friend's place. It's an hour past your ${curfewText(homeRec(s).curfew)} curfew.`,
  choices: [
    ['Rush home and apologize', (s) => { relAll(s, ['parent', 'stepparent'], -2); return 'You got a lecture at the door. A long one.'; }],
    ['Call your parents', (s) => { relAll(s, ['parent', 'stepparent'], 2); add(s, { karma: 1 }); return 'They were annoyed, but they picked you up and said they were glad you called.'; }],
    ['Stay out. You’re already late.', (s) => { add(s, { happy: 3 }); if (chance(0.3 + homeRec(s).strict / 200)) { relAll(s, ['parent', 'stepparent'], -6); groundFor(s, 'breaking curfew', true); return { text: 'They were waiting up. Of course they were waiting up.', tone: 'bad' }; } return 'Everybody was asleep when you got home. You got away with it.'; }],
  ],
});
EV('hm_chore_war', {
  ages: [6, 15], emoji: '🍽️', ctx: (s) => { const sib = atHome(s) && pick(relPeople(s, ['sibling', 'halfsibling']).filter((p) => ageOf(s, p) >= 5 && ageOf(s, p) < 18)); return sib ? { pid: sib.id } : null; },
  text: (s, c) => `You and ${nm(s, c.pid)} are fighting over whose turn it is to do the dishes.`,
  choices: [
    ['Just do them', (s, c) => { relAll(s, ['parent', 'stepparent'], 2); addRel(s, c.pid, 2); return 'You did the dishes. Nobody thanked you. You know what you did.'; }],
    ['Make a chore chart', (s, c) => { addSkill(s, 'business', 1); addRel(s, c.pid, -1); return 'You made a laminated chore chart. It solved everything for almost a week.'; }],
    ['Bribe them to do it', (s, c) => { const amt = price(s, 5); if (M(s).money < amt) return 'You had nothing to bribe them with.'; M(s).money -= amt; addRel(s, c.pid, 3); return `${fmtMoney(amt)} later, ${nm(s, c.pid)} was scrubbing pots and humming.`; }],
  ],
});
EV('hm_savings', {
  ages: [8, 16], emoji: '🐷', when: (s) => atHome(s) && homeRec(s).allow > 0 && M(s).money > price(s, 100), text: 'You saved up your allowance for months. It feels like a fortune.',
  choices: [
    ['Buy the thing you’ve wanted forever', (s) => { const amt = Math.min(M(s).money, price(s, randInt(60, 200))); M(s).money -= amt; add(s, { happy: 6 }); return `You spent ${fmtMoney(amt)} on ${pick(['a skateboard', 'a giant LEGO set', 'the new game everyone has', 'a telescope'])}. Worth every penny.`; }],
    ['Keep saving', (s) => { tally(s, 'kidSaver'); return 'You kept saving. Your piggy bank is getting heavy.'; }],
    ['Give some to charity', (s) => { const amt = Math.min(M(s).money, price(s, 30)); M(s).money -= amt; add(s, { karma: 4, happy: 2 }); return `You gave ${fmtMoney(amt)} to the animal shelter. They sent you a photo of a very happy dog.`; }],
  ],
});
EV('hm_imaginary', {
  ages: [3, 7], emoji: '👻', when: (s) => !!flag(s, 'imaginaryFriend'), text: (s) => `Your imaginary friend, ${flag(s, 'imaginaryFriend')}, has opinions about dinner.`,
  auto: (s) => { add(s, { happy: 2 }); return pick([`${flag(s, 'imaginaryFriend')} refused to eat broccoli. You backed them up.`, `Your parents set an extra plate for ${flag(s, 'imaginaryFriend')}. You were thrilled.`, `${flag(s, 'imaginaryFriend')} moved away to "the moon." You were sad for a day.`]); },
});

/* ---- data hooks and achievements --------------------------------------------------------- */
ACT_CATS.unshift({ id: 'play', name: 'Playtime', emoji: '🧸' });
ACT_CATS.splice(ACT_CATS.findIndex((c) => c.id === 'family') + 1, 0, { id: 'parents', name: 'Home & Parents', emoji: '🏠' });
ACHIEVEMENTS.push(
  { id: 'grounded_life', name: 'Grounded for Life', emoji: '🔒', desc: 'Get grounded five times.', check: (s) => LC(s, 'grounded') >= 5 },
  { id: 'house_party', name: 'Parents Are Away', emoji: '🎉', desc: 'Throw a party while your parents are out of town.', check: (s) => LC(s, 'houseParties') >= 1 },
);
