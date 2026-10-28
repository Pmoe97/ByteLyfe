/* =====================================================================
 * 54-house.js — owning the house: running a book, owning and breeding
 * racehorses, and the casino side of the business engine.
 *
 * M(s).book (bk_start) = { since, years, punters, vig, credit, layoff, legal, tax, threat,
 *   rep, owed: [{ id, name, pid, amt, since }], last: { year, handle, gross, cut, net }, total }
 *   A book is punters, not people: a yearly handle (what they bet), a hold (your cut) and
 *   the swing of an unbalanced book. The big game each year is the one you watch.
 * Racehorses are pets (s.pets, species 'horse') with p.race = { sex, spd, sta, ps, pt, form,
 *   starts, wins, places, earn, stakes: [names], big: { key: year won }, ran: { key: year },
 *   trainer, state, sire, dam, bred, inFoal, banned, hurt }, so they sit on the Pets list,
 *   pass to your heir and cost a horse's upkeep. state: yearling, racing, broodmare, stud or
 *   retired. spd/sta are today's ability, ps/pt the ceiling a young horse grows toward.
 *   horseSeason runs a year of ordinary and stakes races; the big races (BIG_RACES) run on
 *   the race screen through M(s).gamb.race with r.own set, and settleOwnRace pays the purse.
 * A casino is a company (industry 'casino') with co.casino = { edge, vip, eye, skim, threat,
 *   probation, scandals, vid, cc, city } (casinoOf). casinoMods feeds bizForecast; casinoYear
 *   runs inside companyYear (the high-limit room's whales, cheats, the skim and the gaming
 *   commission). Its flagship is a venue in s.venues with owner { co }.
 * houseTick runs after gamblingTick.
 * ===================================================================== */

/* ---- the book ------------------------------------------------------------------- */
const BOOK_VIG = [
  { name: 'Generous', hold: 0.03, draw: 1.2, desc: 'Better prices than anyone in town. Punters flock in.' },
  { name: 'Standard', hold: 0.05, draw: 1, desc: 'The usual cut.' },
  { name: 'Greedy', hold: 0.08, draw: 0.8, desc: 'Fat margins, and punters drifting to other books.' },
];
const BOOK_NO_LICENSE = ['jp', 'kr', 'in']; // no licensed bookmakers here
const PUNTER_NICKS = ['Doc', 'Big Sal', 'the Dentist', 'Sneakers', 'Tuesday', 'Nails', 'Lefty', 'Moonpie', 'Hollywood', 'Slim', 'Biscuits', 'the Kid'];
function bookOf(s) { return M(s).book || null; }
function bookCap(s) { const b = bookOf(s); return Math.round(b.legal ? 80 + skill(s, 'business') * 4 : 30 + skill(s, 'streetwise') * 2 + skill(s, 'charisma')); }
// What one punter bets in a year, and the book's total.
function punterStake(s) { return price(s, 20000); }
function bookHandle(s) { const b = bookOf(s); return Math.round(b.punters * punterStake(s) * (b.credit ? 1.35 : 1)); }
function bookHold(s) { const b = bookOf(s); return BOOK_VIG[b.vig].hold - (b.layoff ? 0.015 : 0); }
function bookOwed(s) { const b = bookOf(s); return b ? sum(b.owed, (d) => d.amt) : 0; }
function canLicense(s) { return !BOOK_NO_LICENSE.includes(P(s).country); }
function punterName(s) { const cc = P(s).country; return chance(0.4) ? `${randomFirst(cc, chance(0.75) ? 'm' : 'f')} “${pick(PUNTER_NICKS)}” ${randomLast(cc)}` : `${randomFirst(cc, chance(0.7) ? 'm' : 'f')} ${randomLast(cc)}`; }

defAction({
  id: 'bk_start', cat: 'turf', label: 'Start taking bets', emoji: '📒', desc: 'Be the bookie. The house takes a cut of every bet.',
  when: (s) => canGamble(s) && A(s) >= 21 && !bookOf(s),
  sub: (s) => `Keep ${fmtMoney(price(s, 10000))} on hand to pay winners`,
  run: (s) => {
    const float = price(s, 10000);
    if (M(s).money < float) return cantAfford(float);
    const n = clamp(5 + Math.round(skill(s, 'streetwise') / 10 + skill(s, 'charisma') / 10) + relPeople(s, ['friend', 'bestie', 'coworker']).length, 5, 25);
    M(s).book = { since: s.year, years: 0, punters: n, vig: 1, credit: false, layoff: false, legal: false, tax: null, threat: null, rep: 50, owed: [], last: null, total: 0 };
    addSkill(s, 'streetwise', 2);
    tally(s, 'booksStarted');
    return { text: `You started taking bets from ${n} regulars: friends, coworkers, the crowd at the bar. A notebook, two phones and a lot of arithmetic.`, emoji: '📒', tone: 'good' };
  },
});
defAction({
  id: 'bk_prices', cat: 'turf', label: 'Set your prices', emoji: '🏷️',
  when: (s) => free(s) && !!bookOf(s),
  sub: (s) => `${BOOK_VIG[bookOf(s).vig].name} · ${Math.round(BOOK_VIG[bookOf(s).vig].hold * 100)}% cut`,
  run: (s) => { popup(s, { emoji: '🏷️', title: 'Your prices', text: 'A smaller cut brings in punters. A bigger one drives them to other books.', handler: 'bkVig', choices: BOOK_VIG.map((v, i) => ({ label: `${v.name} (${Math.round(v.hold * 100)}% cut)`, value: i, sub: v.desc })).concat([{ label: 'Never mind', value: null }]) }); },
});
onChoice('bkVig', (s, ctx, i) => { const b = bookOf(s); if (b && i != null) { b.vig = i; return { text: `Your book's prices are ${BOOK_VIG[i].name.toLowerCase()} now.`, quiet: true }; } });
defAction({
  id: 'bk_credit', cat: 'turf', emoji: '📝',
  label: (s) => (bookOf(s).credit ? 'Go back to cash only' : 'Let punters bet on credit'),
  sub: (s) => (bookOf(s).credit ? 'Fewer bets, no deadbeats' : 'More bets, and some never pay'),
  when: (s) => free(s) && !!bookOf(s),
  run: (s) => { const b = bookOf(s); b.credit = !b.credit; return { text: b.credit ? 'Your punters can bet on the slate now. Settle up Mondays.' : 'Cash only from now on. A few punters grumbled.', quiet: true }; },
});
defAction({
  id: 'bk_layoff', cat: 'turf', emoji: '⚖️',
  label: (s) => (bookOf(s).layoff ? 'Stop laying off bets' : 'Balance the book'),
  sub: (s) => (bookOf(s).layoff ? 'Keep the whole margin and the whole risk' : 'Lay off lopsided bets with a bigger book: steadier, smaller'),
  when: (s) => free(s) && !!bookOf(s),
  run: (s) => { const b = bookOf(s); b.layoff = !b.layoff; return { text: b.layoff ? 'Whenever too much money lands on one side, you pass it to a bigger book. Less profit, fewer sleepless nights.' : 'You stopped laying off. Every upset is yours now, good or bad.', quiet: true }; },
});
defAction({
  id: 'bk_license', cat: 'turf', label: 'Get a bookmaker’s license', emoji: '📜', desc: 'Go legal: no police, more punters, and the taxman’s share.',
  when: (s) => free(s) && !!bookOf(s) && !bookOf(s).legal && canLicense(s),
  sub: (s) => fmtMoney(price(s, 25000)),
  run: (s) => {
    const cost = price(s, 25000), b = bookOf(s);
    if (!pay(s, cost)) return cantAfford(cost);
    if (hasFelony(s)) return { text: 'The gambling commission turned you down: a felony record. The fee isn’t refundable.', tone: 'bad', emoji: '📜' };
    Object.assign(b, { legal: true, tax: null, threat: null });
    tally(s, 'bookLicensed');
    return { text: 'You’re a licensed bookmaker. A shopfront, a website, and the family stopped asking for its piece: licensed books have cameras and lawyers.', tone: 'good', emoji: '📜' };
  },
});
defAction({
  id: 'bk_collect', cat: 'turf', label: 'Collect what you’re owed', emoji: '💵',
  when: (s) => free(s) && !!bookOf(s) && bookOf(s).owed.length > 0,
  sub: (s) => `${fmtMoney(bookOwed(s))} on the slate`,
  run: (s) => { popup(s, { emoji: '💵', title: 'The slate', text: 'Who are you going after?', handler: 'bkDeadbeat', choices: bookOf(s).owed.map((d) => ({ label: d.name, value: d.id, sub: fmtMoney(d.amt) })).concat([{ label: 'Never mind', value: null }]) }); },
});
onChoice('bkDeadbeat', (s, ctx, id) => { const b = bookOf(s), d = b && b.owed.find((x) => x.id === id); if (d) deadbeatPopup(s, d); });
defAction({
  id: 'bk_close', cat: 'turf', label: 'Close your book', emoji: '🚪',
  when: (s) => free(s) && !!bookOf(s),
  run: (s) => { popup(s, { emoji: '🚪', title: 'Close your book?', text: 'Your punters will find somebody else. Whatever is on the slate stays unpaid.', handler: 'bkClose', choices: [{ label: 'Close it', value: true, tone: 'bad' }, { label: 'Keep going', value: false }] }); },
});
onChoice('bkClose', (s, ctx, yes) => { if (!yes || !bookOf(s)) return; M(s).book = null; return { text: 'You burned the notebook and changed your number.', emoji: '🚪' }; });

// Someone on the slate. Sometimes it's someone you know.
function addOwed(s, amt) {
  const b = bookOf(s);
  if (b.owed.length >= 5) { pick(b.owed).amt += amt; return; }
  const known = chance(0.3) && pick(relPeople(s, ['friend', 'coworker', 'sibling', 'cousin']).filter((p) => ageOf(s, p) >= 18));
  b.owed.push({ id: uid(s, 'bo'), name: known ? fullName(known) : punterName(s), pid: known ? known.id : null, amt, since: s.year });
}
function deadbeatPopup(s, d) {
  const crew = inMob(s) && (uw(s).crew > 0 || uw(s).rank >= 1);
  popup(s, {
    emoji: '💵', title: d.name, text: `${d.name} owes your book ${fmtMoney(d.amt)} and stopped answering the phone.`, handler: 'bkLean', ctx: { id: d.id }, person: d.pid && s.people[d.pid] ? d.pid : null,
    choices: [
      { label: 'Lean on them yourself', value: 'lean', disabled: bookOf(s).legal },
      { label: 'Send the crew', value: 'crew', disabled: !crew || bookOf(s).legal },
      { label: 'Give them more time', value: 'time' },
      { label: 'Forgive it', value: 'forgive' },
    ],
  });
}
onChoice('bkLean', (s, ctx, v) => {
  const b = bookOf(s), d = b && b.owed.find((x) => x.id === ctx.id);
  if (!d) return;
  const done = () => { b.owed = b.owed.filter((x) => x !== d); };
  if (v === 'time') { d.amt = Math.round(d.amt * 1.1); return `${d.name} swore on their mother. You added 10% for the trouble.`; }
  if (v === 'forgive') { done(); add(s, { karma: 3 }); b.rep = clamp100(b.rep - 3); if (d.pid) addRel(s, d.pid, 10); return `You tore up ${d.name}'s page. Word got around that you're soft.`; }
  if (v === 'crew') {
    add(s, { karma: -6 });
    addHeat(s, 5);
    if (chance(0.85)) { done(); M(s).money += d.amt; if (d.pid) addRel(s, d.pid, -40); return { text: `Your crew paid ${d.name} a visit. The money arrived the same afternoon: ${fmtMoney(d.amt)}.`, emoji: '🕴️' }; }
    return { text: `${d.name} had skipped town before your crew got there.`, tone: 'bad' };
  }
  add(s, { karma: -4 });
  addHeat(s, 3);
  addSkill(s, 'streetwise', 2);
  if (chance(clamp(0.45 + skill(s, 'streetwise') / 200 + skill(s, 'martial') / 400, 0.2, 0.9))) {
    done();
    M(s).money += d.amt;
    if (d.pid) addRel(s, d.pid, -30);
    return { text: `You explained the situation to ${d.name} in a parking lot. They found ${fmtMoney(d.amt)} by Friday.`, emoji: '💵' };
  }
  if (chance(0.25)) return arrest(s, 'extortion');
  return { text: `${d.name} laughed and shut the door. Everyone on the slate heard about it.`, tone: 'bad' };
});

// A year of the book: punters come and go, the handle and the hold, and what you keep.
function bookYear(s, budget) {
  const b = bookOf(s);
  b.years++;
  if (inPrison(s)) {
    if (!b.legal) { M(s).book = null; log(s, '📒 With you inside, your punters found another book. Yours is gone.', 'bad'); return; }
    b.punters = Math.max(3, Math.round(b.punters * 0.7));
    return;
  }
  const cap = bookCap(s);
  const want = b.punters * (1.15 + (b.rep - 50) / 150) * BOOK_VIG[b.vig].draw * (b.credit ? 1.1 : 1) * (b.legal ? 1.1 : 1) + randInt(-2, 3);
  b.punters = clamp(Math.round(b.punters + (Math.min(cap, want) - b.punters) * 0.6), 3, Math.max(3, cap));
  const handle = Math.round(bookHandle(s) * randFloat(0.85, 1.15));
  const sd = b.layoff ? 0.01 + 0.1 / Math.sqrt(b.punters) : 0.06 + 0.2 / Math.sqrt(b.punters);
  let gross = Math.round(handle * (bookHold(s) + gauss(0, sd)));
  // On credit, some losers never pay. What they owe goes on the slate.
  if (b.credit && gross > 0) { const slate = Math.round(handle * randFloat(0.01, 0.04)); gross -= slate; addOwed(s, slate); }
  const tax = b.legal ? Math.max(0, Math.round(gross * 0.15)) + price(s, 8000) : 0;
  const fam = myFamily(s);
  const cut = gross > 0 ? Math.round(gross * ((b.tax ? 0.2 : 0) + (fam && !fam.mine && !b.legal ? 0.3 : 0))) : 0;
  const net = gross - tax - cut;
  M(s).money += net;
  if (net >= 0) finRow(s, 'inc', 'Your book', net); else finRow(s, 'exp', 'Your book', -net);
  b.last = { year: s.year, handle, gross, tax, cut, net };
  b.total += net;
  tally(s, 'bookNet', net);
  if (b.total >= price(s, 1e6)) tally(s, 'bookMillion');
  b.rep = clamp100(b.rep + (55 - b.rep) * 0.15 + (b.vig === 0 ? 3 : b.vig === 2 ? -3 : 0));
  log(s, `📒 Your book took ${fmtMoneyShort(handle)} in bets from ${nOf(b.punters, 'punter')} and ${net >= 0 ? 'kept' : 'lost'} ${fmtMoneyShort(Math.abs(net))}.`, net >= 0 ? '' : 'bad');
  if (M(s).money < 0 && net < 0) {
    b.rep = clamp100(b.rep - 25);
    b.punters = Math.max(3, Math.round(b.punters * 0.6));
    log(s, '📒 You couldn’t cover all your winners. The ones you stiffed told everyone.', 'bad');
  }
  if (!b.legal) addHeat(s, Math.round(2 + b.punters / 20));
  // The family whose turf you're on, if it isn't yours.
  if (b.threat) bookThreat(s, b, budget);
  else if (!b.legal && !b.tax && !inMob(s) && b.punters >= 15 && budget.n > 0 && chance(0.3)) {
    budget.n--;
    const f = pick(familiesIn(s, P(s).country));
    popup(s, {
      emoji: '🕴️', title: 'A visit from the family', tone: 'bad', handler: 'bkTax', ctx: { fam: f.id },
      text: `A capo from ${f.name} stopped by. Your book is on their turf, and they want a fifth of everything, every year.`,
      choices: [{ label: 'Pay the fifth', value: 'pay' }, { label: 'Tell them no', value: 'no', tone: 'bad' }, { label: 'Ask to work for them', value: 'join', disabled: !!(M(s).uw && (M(s).uw.rat || M(s).uw.enemy)) }],
    });
  }
  if (b.owed.length && budget.n > 0 && chance(0.5)) { budget.n--; deadbeatPopup(s, b.owed.slice().sort((x, y) => y.amt - x.amt)[0]); }
  if (b.punters >= 10 && budget.n > 0 && chance(0.15)) { budget.n--; sharpPopup(s); }
  if (b.punters >= 8 && budget.n > 0 && chance(0.6)) { budget.n--; bigGame(s); }
}
onChoice('bkTax', (s, ctx, v) => {
  const b = bookOf(s), f = underworldOf(s).families[ctx.fam];
  if (!b || !f) return;
  if (v === 'pay') { b.tax = f.id; return `You shook the capo's hand. Nobody bothers your punters now. ${cap(f.name)} gets a fifth.`; }
  if (v === 'join') {
    Object.assign(uw(s), { fam: f.id, rank: 0, respect: 10, made: false, rackets: [] });
    tally(s, 'mobJoined');
    return { text: `You're an associate of ${f.name} now. Your book kicks up 30% to the family, and it has friends.`, emoji: '🕴️' };
  }
  b.threat = { fam: f.id, year: s.year };
  return { text: 'The capo smiled, said "think it over," and left his espresso untouched.', tone: 'bad' };
});
// You told the family no. They make their point for a few years, then lose interest.
function bookThreat(s, b, budget) {
  const f = underworldOf(s).families[b.threat.fam];
  if (!f || s.year - b.threat.year > 3 || inMob(s)) { b.threat = null; return; }
  if (!chance(0.45)) return;
  const r = rand();
  if (r < 0.4) { b.punters = Math.max(3, Math.round(b.punters / 2)); log(s, `🕴️ ${cap(f.name)} told your punters to bet somewhere else. Half of them listened.`, 'bad'); }
  else if (r < 0.65) { addHeat(s, 25); log(s, `🕴️ Somebody tipped off the police about your book. You can guess who.`, 'bad'); }
  else if (r < 0.85) { const amt = Math.min(Math.max(0, M(s).money), price(s, randInt(5000, 30000))); M(s).money -= amt; log(s, `🔥 The back room where you kept the book burned down. You lost ${fmtMoney(amt)} in cash.`, 'bad'); }
  else if (budget.n > 0) {
    budget.n--;
    popup(s, { emoji: '🕴️', title: cap(f.name), tone: 'bad', handler: 'bkPayUp', ctx: { fam: f.id }, text: 'Two men were waiting in your kitchen. "Last chance. A fifth."', choices: [{ label: 'Pay', value: true }, { label: 'Still no', value: false, tone: 'bad' }] });
  }
}
onChoice('bkPayUp', (s, ctx, yes) => {
  const b = bookOf(s);
  if (!b) return;
  if (yes) { b.threat = null; b.tax = ctx.fam; return 'You agreed to the fifth. They let themselves out.'; }
  add(s, { health: -randInt(10, 20), happy: -8 });
  getSick(s, pick(['broken_arm', 'broken_leg']), { known: true });
  return { text: 'They broke your arm and said it was a courtesy. Next time it wouldn’t be.', tone: 'bad' };
});
// A punter who keeps winning knows something.
function sharpPopup(s) {
  const name = punterName(s);
  popup(s, {
    emoji: '🎯', title: 'A sharp', handler: 'bkSharp', ctx: { name },
    text: `${name} has beaten your book ${randInt(9, 16)} weeks running. They clearly know something you don't.`,
    choices: [{ label: 'Limit their bets', value: 'limit' }, { label: 'Ban them', value: 'ban' }, { label: 'Copy their bets at another book', value: 'copy' }, { label: 'Keep taking their action', value: 'keep' }],
  });
}
onChoice('bkSharp', (s, ctx, v) => {
  const b = bookOf(s);
  if (!b) return;
  if (v === 'limit') return `You capped ${ctx.name} at small stakes. They called you a coward and kept betting small.`;
  if (v === 'ban') { b.rep = clamp100(b.rep - 3); b.punters = Math.max(3, b.punters - 1); return `You banned ${ctx.name}. Word got around that your book can't take a loss.`; }
  if (v === 'copy') {
    add(s, { karma: -1 });
    if (chance(0.6)) { const amt = price(s, randInt(5000, 40000)); M(s).money += amt; return { text: `You followed ${ctx.name}'s picks at a bigger book and made ${fmtMoney(amt)}.`, tone: 'good' }; }
    const amt = Math.min(Math.max(0, M(s).money), price(s, randInt(5000, 20000)));
    M(s).money -= amt;
    return { text: `${ctx.name}'s hot streak ended the week you started copying it. You lost ${fmtMoney(amt)}.`, tone: 'bad' };
  }
  const amt = Math.min(Math.max(0, M(s).money), price(s, randInt(5000, 30000)));
  M(s).money -= amt;
  b.rep = clamp100(b.rep + 5);
  return `${ctx.name} took you for another ${fmtMoney(amt)}, and every gambler in town heard your book takes anybody's action.`;
});

// The big game: money pours onto one side. Lay it off, shade the line, or pray.
function bigGame(s) {
  const b = bookOf(s), sport = pick(SPORT_IDS), odds = teamOdds(s, sport);
  const fav = odds[0], dog = odds[randInt(1, Math.min(3, odds.length - 1))];
  const pf = clamp((1 / fav.dec) / (1 / fav.dec + 1 / dog.dec), 0.55, 0.8);
  const H = Math.round(bookHandle(s) * randFloat(0.15, 0.3)), sh = chance(0.65) ? randFloat(0.7, 0.9) : randFloat(0.12, 0.3);
  const side = sh > 0.5 ? fav.name : dog.name, hold = bookHold(s), ex = gameResults(H, sh, pf, hold);
  const owe = -(sh > 0.5 ? ex.fav : ex.dog);
  popup(s, {
    emoji: SPORTS[sport].emoji, title: 'The big game', handler: 'bkBigGame', ctx: { sport, fav: fav.name, dog: dog.name, pf, H, sh, hold },
    text: `It's the ${SPORTS[sport].league} final: the ${fav.name} against the ${dog.name}. ${Math.round(Math.max(sh, 1 - sh) * 100)}% of the money on your book is on the ${side}. If the ${side} win, you're out ${fmtMoney(owe)}.`,
    choices: [
      { label: 'Lay off the excess with a bigger book', value: 'layoff', sub: `Lock in about ${fmtMoney(Math.round(H * hold * 0.6))}` },
      { label: 'Shade the line to even it out', value: 'shade', sub: 'If punters bite, the book balances' },
      { label: 'Let it ride', value: 'ride', tone: 'bad', sub: 'Win big or lose big' },
    ],
  });
}
// Profit if the favorite wins and if the underdog wins, with the money split sh / 1 - sh.
function gameResults(H, sh, pf, hold) {
  const decFav = (1 / pf) * (1 - hold), decDog = (1 / (1 - pf)) * (1 - hold);
  return { fav: Math.round(H - H * sh * decFav), dog: Math.round(H - H * (1 - sh) * decDog) };
}
onChoice('bkBigGame', (s, ctx, v) => {
  const b = bookOf(s);
  if (!b) return;
  const favWins = chance(ctx.pf), winner = favWins ? ctx.fav : ctx.dog, sc = pick(['in overtime', 'on a last-second shot', 'by a mile', 'in a game nobody will forget', 'after a wild comeback']);
  let profit, text;
  if (v === 'layoff') {
    profit = Math.round(ctx.H * ctx.hold * 0.6);
    tally(s, 'laidOff');
    text = `You laid off the excess. The ${winner} won ${sc}, and it didn't matter: your book made ${fmtMoney(profit)}.`;
  } else {
    let sh = ctx.sh;
    const shaded = v === 'shade' && chance(clamp(0.5 + skill(s, 'business') / 300 + skill(s, 'streetwise') / 400, 0.3, 0.85));
    if (shaded) sh = 0.5 + (sh - 0.5) * 0.25;
    const r = gameResults(ctx.H, sh, ctx.pf, ctx.hold - (v === 'shade' ? 0.01 : 0));
    profit = favWins ? r.fav : r.dog;
    const how = v === 'shade' ? (shaded ? 'You moved the line and the money evened out. ' : 'You moved the line, but nobody bit. ') : '';
    text = `${how}The ${winner} won ${sc}. Your book ${profit >= 0 ? 'made' : 'lost'} ${fmtMoney(Math.abs(profit))}.`;
    if (v === 'ride' && profit > ctx.H * 0.2) { tally(s, 'upsetSaved'); text += ' You may light a candle for them.'; }
  }
  M(s).money += profit;
  b.total += profit;
  tally(s, 'bookNet', profit);
  finRow(s, profit >= 0 ? 'inc' : 'exp', 'The big game', Math.abs(profit));
  if (profit < 0 && M(s).money < 0) { b.rep = clamp100(b.rep - 20); b.punters = Math.max(3, Math.round(b.punters * 0.7)); text += ' You couldn’t pay everyone on time, and your punters noticed.'; }
  add(s, { happy: profit >= 0 ? 4 : -6 });
  return { text, tone: profit >= 0 ? 'good' : 'bad', emoji: '📒', title: 'The big game' };
});

/* ---- racehorses --------------------------------------------------------------- */
const TRAINERS = [
  { name: 'Local trainer', fee: 12000, grow: 0.25, edge: 0, desc: 'Cheap, honest, and short on secrets.' },
  { name: 'Respected trainer', fee: 40000, grow: 0.35, edge: 1.5, desc: 'Brings young horses on and knows the tracks.' },
  { name: 'Champion trainer', fee: 100000, grow: 0.45, edge: 3, desc: 'The best yard in the country. Picks their horses.' },
];
const PURSE_SPLIT = [0.6, 0.2, 0.1, 0.05, 0.03, 0.02];
const STAKES_NAMES = ['Stakes', 'Handicap', 'Mile', 'Classic', 'Plate', 'Sprint', 'Trophy'];
// The big races. field: [speed mean, sd, stamina mean, sd] of the rivals.
const BIG_RACES = {
  derby: { name: (cc) => `The ${COUNTRIES[cc].cities[0]} Derby`, purse: 3000000, entry: 50000, field: [86, 3.5, 82, 5], desc: 'Three-year-olds only, once in a lifetime.' },
  cup: { name: (cc) => `The ${COUNTRIES[cc].cities[1]} Cup`, purse: 2000000, entry: 25000, field: [87, 3.5, 84, 5], desc: 'The country’s championship for older horses.' },
  gold: { name: () => 'The Silver Mesa Gold Cup', purse: 12000000, entry: 0, field: [90, 2.5, 87, 4], desc: 'The richest race in the world. By invitation.' },
};
function racehorses(s) { return myPets(s).filter((p) => p.race); }
function isRacehorse(s, id) { const p = s.pets[id]; return !!p && p.alive && !!p.race; }
function horseWord(h) { return h.sex === 'f' ? 'filly' : 'colt'; }
function genePower(h) { return h.ps * 0.62 + h.pt * 0.28; }
function bigWins(h) { return Object.keys(h.big || {}).length; }
function homeTrack(s) { const here = venuesIn(s, P(s).country, P(s).city).find((v) => v.kind === 'track'); return here || nationalTrack(s, { cc: P(s).country }); }
function bigRaceName(s, key) { return BIG_RACES[key].name(P(s).country); }
function stateText(h) { return { yearling: 'Too young to race', racing: 'In training', broodmare: 'Broodmare', stud: 'At stud', retired: 'Retired to pasture' }[h.state] || ''; }
function makeRacehorse(s, o) {
  const id = uid(s, 'pet'), S = PET_SPECIES.horse;
  const ps = clamp(Math.round(o.ps), 40, 99), pt = clamp(Math.round(o.pt), 40, 99);
  const age = s.year - o.born;
  const gap = age >= 5 ? 0 : (5 - age) * randFloat(3, 4.5);
  s.pets[id] = {
    id, species: 'horse', breed: 'Thoroughbred', name: o.name, born: o.born, alive: true, rel: 60, life: randInt(S.life[0], S.life[1]), owner: s.playerId,
    race: { sex: o.sex, spd: clamp(Math.round(o.spd ?? ps - gap), 30, 99), sta: clamp(Math.round(o.sta ?? pt - gap), 30, 99), ps, pt, form: 0, starts: o.starts || 0, wins: o.wins || 0, places: 0, earn: 0, stakes: [], big: {}, ran: {}, trainer: 0, state: age >= 2 ? 'racing' : 'yearling', sire: o.sire || '', dam: o.dam || '', bred: !!o.bred, inFoal: null, banned: 0, hurt: 0 },
  };
  tally(s, 'racehorses');
  return s.pets[id];
}
// What a horse would fetch at auction (no randomness: it also counts toward net worth).
function horseValue(s, p) {
  const h = p.race, age = petAge(s, p);
  if (h.state === 'stud') return Math.round(studFee(s, p) * 30);
  if (h.state === 'broodmare') return price(s, 10000 * Math.exp((genePower(h) - 64) / 6));
  if (h.state === 'retired') return price(s, 2000);
  const q = age < 4 ? genePower(h) : Math.max(racePower(h) - h.form * 1.2, 30);
  const ageF = age <= 3 ? 1 : age <= 5 ? 0.85 : age <= 7 ? 0.5 : 0.25;
  return price(s, 15000 * Math.exp((q - 64) / 5) * ageF * (1 + h.stakes.length * 0.15 + bigWins(h) * 0.5));
}
function stableValue(s) { return sum(racehorses(s), (p) => horseValue(s, p)); }
function horseStars(est) { const n = clamp(Math.round((est - 52) / 5), 1, 5); return '★'.repeat(n) + '☆'.repeat(5 - n); }

// Buying: the yearling sale (pedigree and promise) or a claiming race (proven, cheaper).
defAction({
  id: 'hs_buy', cat: 'turf', label: 'Buy a racehorse', emoji: '🐎', desc: 'At the yearling sale or out of a claiming race.',
  when: (s) => free(s) && A(s) >= 18 && racehorses(s).length < 12,
  sub: (s) => (racehorses(s).length ? `${nOf(racehorses(s).length, 'horse')} in your stable` : 'Silks, a stable and a lot of hay'),
  run: (s) => { popup(s, { emoji: '🐎', title: 'Buy a racehorse', text: 'Yearlings are a bet on bloodlines. A claiming race sells you a horse that has already run.', handler: 'hsBuyWhere', choices: [{ label: '🔨 The yearling sale', value: 'sale' }, { label: '🏇 Claim a horse after a race', value: 'claim', disabled: !homeTrack(s) }, { label: 'Never mind', value: null }] }); },
});
onChoice('hsBuyWhere', (s, ctx, v) => {
  if (v === 'sale') {
    const studs = studBook(s).list;
    const lots = [];
    for (let i = 0; i < 4; i++) {
      const sire = pick(studs), dps = clamp(gauss(70, 7), 50, 95), dpt = clamp(gauss(68, 8), 45, 95);
      const ps = clamp(Math.round((sire.spd + dps) / 2 + gauss(0, 4.5)), 45, 99), pt = clamp(Math.round((sire.sta + dpt) / 2 + gauss(0, 4.5)), 40, 99);
      const q = ps * 0.62 + pt * 0.28, cost = nicePrice(price(s, 15000 * Math.exp((q - 64) / 5)) * randFloat(0.7, 1.4));
      lots.push({ ps, pt, cost, sire: sire.name, dam: `${pick(HORSE_A)} ${pick(HORSE_B)}`, sex: chance(0.5) ? 'm' : 'f', est: Math.round(q + gauss(0, 3)) });
    }
    popup(s, {
      emoji: '🔨', title: 'The yearling sale', text: 'Four lots in the ring. The catalog stars are the experts’ guess, and the experts are often wrong.', handler: 'hsLot', ctx: { lots },
      choices: lots.map((l, i) => ({ label: `Lot ${i + 1}: a ${l.sex === 'f' ? 'filly' : 'colt'} by ${l.sire}`, value: i, sub: `${horseStars(l.est)} · ${fmtMoney(l.cost)}`, disabled: M(s).money < l.cost })).concat([{ label: 'Go home', value: null }]),
    });
    return;
  }
  if (v === 'claim') {
    const t = homeTrack(s), pool = t ? t.horses.filter((h) => s.year - h.born >= 3 && s.year - h.born <= 6).sort(() => rand() - 0.5).slice(0, 3) : [];
    if (!pool.length) return { text: 'Nothing worth claiming today.', nolog: true };
    popup(s, {
      emoji: '🏇', title: `Claiming race at ${t.name}`, text: 'Any horse in a claiming race can be bought for its claiming price. You can read their records.', handler: 'hsClaim', ctx: { t: t.id },
      choices: pool.map((h) => { const cost = claimPrice(s, h); return { label: h.name, value: h.id, sub: `${s.year - h.born} years old · ${nOf(h.wins, 'win')} in ${nOf(h.starts, 'start')} · ${fmtMoney(cost)}`, disabled: M(s).money < cost }; }).concat([{ label: 'Never mind', value: null }]),
    });
  }
});
function claimPrice(s, h) { return price(s, 8000 * Math.exp((h.spd * 0.62 + h.sta * 0.28 - 60) / 6)); }
onChoice('hsLot', (s, ctx, i) => {
  const l = ctx.lots && ctx.lots[i];
  if (!l) return;
  popup(s, { emoji: '🐴', title: `Your ${l.sex === 'f' ? 'filly' : 'colt'}`, text: `By ${l.sire}, out of ${l.dam}. Racehorses are named by their owners. What will you call this one?`, handler: 'hsLotName', ctx: l, input: { label: 'Name', value: `${pick(HORSE_A)} ${pick(HORSE_B)}`, max: 24 }, choices: [{ label: `Buy for ${fmtMoney(l.cost)}` }] });
});
onChoice('hsLotName', (s, l, v, input) => {
  if (racehorses(s).length >= 12) return { text: 'Your stable is full.', nolog: true };
  if (!pay(s, l.cost)) return cantAfford(l.cost);
  const p = makeRacehorse(s, { name: cleanName(input) || `${pick(HORSE_A)} ${pick(HORSE_B)}`, born: s.year - 1, sex: l.sex, ps: l.ps, pt: l.pt, sire: l.sire, dam: l.dam });
  add(s, { happy: 6 });
  return { text: `You bought ${p.name} for ${fmtMoney(l.cost)}. Next year ${l.sex === 'f' ? 'she' : 'he'} goes into training.`, emoji: '🐴', tone: 'good' };
});
onChoice('hsClaim', (s, ctx, hid) => {
  const t = vById(s, ctx.t), h = t && t.horses.find((x) => x.id === hid);
  if (!h) return;
  const cost = claimPrice(s, h);
  if (racehorses(s).length >= 12) return { text: 'Your stable is full.', nolog: true };
  if (!pay(s, cost)) return cantAfford(cost);
  t.horses = t.horses.filter((x) => x !== h);
  t.horses.push(newHorse(s));
  const young = s.year - h.born <= 4;
  const p = makeRacehorse(s, { name: h.name, born: h.born, sex: chance(0.5) ? 'm' : 'f', ps: h.spd + (young ? randInt(0, 5) : 0), pt: h.sta + (young ? randInt(0, 4) : 0), spd: h.spd, sta: h.sta, starts: h.starts, wins: h.wins });
  p.race.form = h.form;
  return { text: `You claimed ${p.name} for ${fmtMoney(cost)}. ${p.race.sex === 'f' ? 'She' : 'He'} moves to your stable tonight.`, emoji: '🏇', tone: 'good' };
});

// The stallions standing at stud this year, shared by the family line.
function studBook(s) {
  if (s.studBook && s.studBook.year === s.year) return s.studBook;
  const list = [92, 86, 81, 75].map((t, i) => {
    const spd = clamp(Math.round(t + gauss(0, 2)), 60, 99), sta = clamp(Math.round(t - 3 + gauss(0, 3)), 55, 99);
    const score = (spd * 0.62 + sta * 0.28) / 0.9 + (3 - i) * 2;
    return { name: `${pick(HORSE_A)} ${pick(HORSE_B)}`, spd, sta, fee: price(s, 2000 * Math.exp((score - 70) / 6)), rec: ['won the Gold Cup', 'won a Derby', 'won five stakes races', 'a game miler'][i] };
  });
  s.studBook = { year: s.year, list };
  return s.studBook;
}
function studScore(h) { return genePower(h) / 0.9 + h.stakes.length * 1.5 + bigWins(h) * 4; }
function studFee(s, p) { return price(s, 2000 * Math.exp((studScore(p.race) - 70) / 6)); }
function studReady(h) { return h.sex === 'm' && (h.wins >= 3 || h.stakes.length > 0); }

/* horse actions (target: pet id) */
const raceable = (s, id) => petReachable(s, id) && isRacehorse(s, id);
defAction({
  id: 'hs_bigrace', cat: 'pet', target: 'pet', label: 'Enter a big race', emoji: '🏆',
  when: (s, id) => raceable(s, id) && s.pets[id].race.state === 'racing' && bigRacesFor(s, s.pets[id]).length > 0,
  sub: (s, id) => bigRacesFor(s, s.pets[id]).map((k) => bigRaceName(s, k)).join(' · '),
  run: (s, id) => {
    const p = s.pets[id];
    popup(s, { emoji: '🏆', title: 'The big races', text: `${p.name} is ready. Which race?`, handler: 'hsBigRace', ctx: { pid: id },
      choices: bigRacesFor(s, p).map((k) => ({ label: bigRaceName(s, k), value: k, sub: `${BIG_RACES[k].desc} Purse ${fmtMoneyShort(price(s, BIG_RACES[k].purse))}${BIG_RACES[k].entry ? ` · entry ${fmtMoney(price(s, BIG_RACES[k].entry))}` : ''}`, disabled: M(s).money < price(s, BIG_RACES[k].entry) })).concat([{ label: 'Not this year', value: null }]) });
  },
});
function bigRacesFor(s, p) {
  const h = p.race, age = petAge(s, p);
  if (h.state !== 'racing' || h.banned > s.year || h.hurt === s.year || count(s, 'bigrace') >= 3) return [];
  return Object.keys(BIG_RACES).filter((k) => {
    if ((h.ran || {})[k] === s.year) return false;
    if (k === 'derby') return age === 3 && !(h.ran || {}).derby;
    if (k === 'cup') return age >= 3;
    return age >= 3 && (h.stakes.length > 0 || bigWins(h) > 0);
  });
}
onChoice('hsBigRace', (s, ctx, key) => {
  const p = s.pets[ctx.pid];
  if (!key || !p || !p.race) return;
  const amts = [0, 1000, 10000, 100000].map((b) => price(s, b));
  popup(s, { emoji: '🏆', title: bigRaceName(s, key), text: `A bet on ${p.name} to win, on top of the purse?`, handler: 'hsBigBet', ctx: { pid: ctx.pid, key },
    choices: amts.map((b) => ({ label: b ? `Bet ${fmtMoney(b)} to win` : 'Just watch', value: b, disabled: b > 0 && M(s).money < b + price(s, BIG_RACES[key].entry) })) });
});
onChoice('hsBigBet', (s, ctx, amt) => {
  const p = s.pets[ctx.pid], R = BIG_RACES[ctx.key];
  if (!p || !p.race || !R) return;
  if (gamb(s).race) settleRaceQuietly(s);
  const entry = price(s, R.entry);
  if (!pay(s, entry + amt)) return cantAfford(entry + amt);
  bump(s, 'bigrace');
  (p.race.ran || (p.race.ran = {}))[ctx.key] = s.year;
  if (amt) tally(s, 'gambled', amt);
  const me = runnerOf(p), names = new Set([p.name]), rivals = [];
  for (let i = 0; i < 7; i++) {
    let name = `${pick(HORSE_A)} ${pick(HORSE_B)}`;
    for (let k = 0; names.has(name) && k < 10; k++) name = `${pick(HORSE_A)} ${pick(HORSE_B)}`;
    names.add(name);
    rivals.push({ id: 'rv' + i, name, spd: clamp(Math.round(gauss(R.field[0], R.field[1])), 60, 99), sta: clamp(Math.round(gauss(R.field[2], R.field[3])), 55, 99), form: randInt(-3, 4), wins: 0, starts: 0 });
  }
  const pool = shuffle([me].concat(rivals)), field = raceOdds(pool), r = runRace(s, null, field, pool);
  const mine = field.findIndex((f) => f.hid === p.id), place = r.order.indexOf(mine), f = field[mine];
  const purse = price(s, R.purse), name = bigRaceName(s, ctx.key);
  gamb(s).race = {
    track: name, field: field.map((x) => ({ name: x.name, no: x.no, color: x.color, odds: oddsText(x.dec) })), frames: r.frames, order: r.order, mine, type: 'win', amt,
    payout: amt && place === 0 ? Math.round(amt * f.dec) : 0, margin: r.margin, long: amt > 0 && place === 0 && f.dec >= 21, shown: false,
    own: { pid: p.id, key: ctx.key, name, purse, won: Math.round(purse * (PURSE_SPLIT[place] || 0)) },
  };
  return { text: `${p.name} is in the gate for ${name}...`, quiet: true };
});
// A racehorse as the race engine sees it: today's ability plus the trainer's touch.
function runnerOf(p) { const h = p.race; return { id: p.id, name: p.name, spd: h.spd, sta: h.sta, form: clamp(h.form + TRAINERS[h.trainer].edge, -10, 13), wins: h.wins, starts: h.starts }; }
// The race screen calls this (through settleRace) at the finish: the purse, the record, the bet.
function settleOwnRace(s, r, head) {
  const p = s.pets[r.own.pid], place = r.order.indexOf(r.mine), name = r.field[r.mine].name;
  const got = r.own.won + r.payout;
  if (got) M(s).money += got;
  let text = `${head} ${place === 0 ? `${name} won ${r.own.name}!` : `${name} finished ${ordinal(place + 1)}.`}`;
  if (r.own.won) text += ` The purse paid you ${fmtMoney(r.own.won)}.`;
  if (r.amt) { text += r.payout ? ` Your bet paid ${fmtMoney(r.payout)}.` : ` Your ${fmtMoney(r.amt)} bet went with it.`; if (r.payout) tally(s, 'gambleWins', r.payout - r.amt); }
  if (p && p.race) {
    const h = p.race;
    h.starts++;
    h.earn += r.own.won;
    if (place === 0) {
      h.wins++;
      h.big[r.own.key] = s.year;
      h.stakes.push(r.own.name);
      h.form = clamp(h.form + 3, -10, 10);
      tally(s, 'ownerWins');
      tally(s, 'bigRaceWins');
      if (r.own.key === 'derby') tally(s, 'derbyWins');
      if (h.bred) tally(s, 'homebredStakes');
      if (h.big.derby === s.year && h.big.cup === s.year && h.big.gold === s.year) { tally(s, 'crown'); text += ` ${name} has won the Crown!`; }
      M(s).fame = clamp100(M(s).fame + (r.own.key === 'gold' ? 8 : 4));
      add(s, { happy: 15 });
    } else if (place <= 2) { h.places++; add(s, { happy: 4 }); }
    else add(s, { happy: -3 });
  }
  if (r.long) tally(s, 'longShots');
  if (got) finRow(s, 'inc', 'Purses', r.own.won);
  return { text, tone: place <= 2 ? 'good' : 'bad', emoji: '🏆', title: r.own.name };
}
defAction({
  id: 'hs_trainer', cat: 'pet', target: 'pet', label: 'Choose a trainer', emoji: '🧢',
  when: (s, id) => raceable(s, id) && ['yearling', 'racing'].includes(s.pets[id].race.state),
  sub: (s, id) => `${TRAINERS[s.pets[id].race.trainer].name} · ${fmtMoney(price(s, TRAINERS[s.pets[id].race.trainer].fee))}/yr`,
  run: (s, id) => { popup(s, { emoji: '🧢', title: 'Trainers', text: 'A better trainer brings a young horse closer to its best, and sharpens it on race day.', handler: 'hsTrainer', ctx: { pid: id }, choices: TRAINERS.map((t, i) => ({ label: t.name, value: i, sub: `${t.desc} ${fmtMoney(price(s, t.fee))} a year` })).concat([{ label: 'Never mind', value: null }]) }); },
});
onChoice('hsTrainer', (s, ctx, i) => {
  const p = s.pets[ctx.pid];
  if (!p || !p.race || i == null) return;
  if (i === 2 && genePower(p.race) < 68 && chance(0.6)) return { text: `The champion trainer watched ${p.name} gallop and politely said their yard is full.`, tone: 'bad' };
  p.race.trainer = i;
  return { text: `${p.name} moved to a ${TRAINERS[i].name.toLowerCase()}'s yard.`, quiet: true };
});
defAction({
  id: 'hs_retire', cat: 'pet', target: 'pet', label: 'Retire from racing', emoji: '🌾',
  when: (s, id) => raceable(s, id) && s.pets[id].race.state === 'racing',
  run: (s, id) => retirePopup(s, s.pets[id]),
});
function retirePopup(s, p) {
  const h = p.race, choices = h.sex === 'f'
    ? [{ label: 'Keep her as a broodmare', value: 'broodmare' }, { label: 'Retire her to pasture', value: 'retired' }]
    : [{ label: 'Stand him at stud', value: 'stud', disabled: !studReady(h), sub: studReady(h) ? `About ${fmtMoney(studFee(s, p))} a mating` : 'Needs three wins or a stakes win' }, { label: 'Retire him to pasture', value: 'retired' }];
  popup(s, { emoji: '🌾', title: `${p.name} retires`, text: `${nOf(h.wins, 'win')} in ${nOf(h.starts, 'start')} and ${fmtMoney(h.earn)} in purses. What next?`, handler: 'hsRetire', ctx: { pid: p.id }, choices: choices.concat([{ label: 'Keep racing', value: null }]) });
}
onChoice('hsRetire', (s, ctx, v) => {
  const p = s.pets[ctx.pid];
  if (!v || !p || !p.race) return;
  p.race.state = v;
  return v === 'stud' ? `${p.name} will stand at stud for about ${fmtMoney(studFee(s, p))} a mating.` : v === 'broodmare' ? `${p.name} joined your broodmare band.` : `${p.name} is retired to pasture. ${p.race.sex === 'f' ? 'She' : 'He'} rolled in the grass for an hour.`;
});
defAction({
  id: 'hs_stud', cat: 'pet', target: 'pet', label: 'Stand him at stud', emoji: '💰',
  when: (s, id) => raceable(s, id) && s.pets[id].race.state === 'retired' && studReady(s.pets[id].race),
  sub: (s, id) => `About ${fmtMoney(studFee(s, s.pets[id]))} a mating`,
  run: (s, id) => { s.pets[id].race.state = 'stud'; return `${s.pets[id].name} is standing at stud.`; },
});
defAction({
  id: 'hs_breed', cat: 'pet', target: 'pet', label: 'Breed her', emoji: '🍼',
  when: (s, id) => { if (!raceable(s, id)) return false; const p = s.pets[id], h = p.race; return h.state === 'broodmare' && !h.inFoal && petAge(s, p) <= 22 && count(s, 'breed_' + id) < 1; },
  run: (s, id) => {
    const p = s.pets[id], mine = racehorses(s).filter((x) => x.race.state === 'stud');
    popup(s, {
      emoji: '🍼', title: `A match for ${p.name}`, text: 'The stallions standing this year. Speed and stamina run in the blood, but every foal is a roll of the dice.', handler: 'hsBreed', ctx: { pid: id },
      choices: mine.map((x) => ({ label: `${x.name} (your stallion)`, value: 'own:' + x.id, sub: `${nOf(x.race.wins, 'win')} · free` }))
        .concat(studBook(s).list.map((x, i) => ({ label: x.name, value: 'book:' + i, sub: `${cap(x.rec)} · ${fmtMoney(x.fee)}`, disabled: M(s).money < x.fee })))
        .concat([{ label: 'Not this year', value: null }]),
    });
  },
});
onChoice('hsBreed', (s, ctx, v) => {
  const p = s.pets[ctx.pid];
  if (!v || !p || !p.race) return;
  let sire;
  if (v.startsWith('own:')) { const x = s.pets[v.slice(4)]; if (!x || !x.race) return; sire = { name: x.name, spd: x.race.ps, sta: x.race.pt }; }
  else { const x = studBook(s).list[Number(v.slice(5))]; if (!x) return; if (!pay(s, x.fee)) return cantAfford(x.fee); sire = { name: x.name, spd: x.spd, sta: x.sta }; }
  bump(s, 'breed_' + p.id);
  p.race.inFoal = { sire: sire.name, spd: sire.spd, sta: sire.sta, year: s.year };
  return { text: `${p.name} is in foal to ${sire.name}. The foal is due next year.`, emoji: '🍼', tone: 'good' };
});
defAction({
  id: 'hs_sell', cat: 'pet', target: 'pet', label: 'Sell at auction', emoji: '🔨',
  when: (s, id) => raceable(s, id),
  sub: (s, id) => `Worth about ${fmtMoney(horseValue(s, s.pets[id]))}`,
  run: (s, id) => { const p = s.pets[id]; popup(s, { emoji: '🔨', title: `Sell ${p.name}?`, text: `The auctioneer thinks ${p.name} will fetch about ${fmtMoney(horseValue(s, p))}. The bidding decides.`, handler: 'hsSell', ctx: { pid: id }, choices: [{ label: 'Send to auction', value: true }, { label: 'Keep', value: false }] }); },
});
onChoice('hsSell', (s, ctx, yes) => {
  const p = s.pets[ctx.pid];
  if (!yes || !p || !p.race) return;
  const got = nicePrice(horseValue(s, p) * randFloat(0.75, 1.3));
  delete s.pets[p.id];
  M(s).money += got;
  tally(s, 'horsesSold');
  add(s, { happy: -2 });
  return { text: `${p.name} sold for ${fmtMoney(got)}. You watched the trailer pull away.`, emoji: '🔨' };
});

// The year in the stable: growth, the season, foals, stud fees and the bills.
function stableYear(s, budget) {
  const list = racehorses(s);
  if (!list.length) return;
  let fees = 0, purses = 0, stud = 0;
  for (const p of list) {
    const h = p.race, age = petAge(s, p);
    if (!h.ran) h.ran = {};
    if (h.inFoal && h.inFoal.year < s.year) foaling(s, p, budget);
    if (h.state === 'yearling' && age >= 2) { h.state = 'racing'; log(s, `🐴 ${p.name} went into training.`); }
    if (h.state === 'yearling' || h.state === 'racing') {
      growHorse(h, age);
      fees += price(s, TRAINERS[h.trainer].fee) * (h.state === 'racing' ? 1 : age >= 1 ? 0.5 : 0);
    }
    if (h.state === 'racing') {
      if (age >= 9) {
        h.state = h.sex === 'f' ? 'broodmare' : studReady(h) ? 'stud' : 'retired';
        log(s, `🌾 ${p.name} retired from racing at ${age}: ${nOf(h.wins, 'win')} in ${nOf(h.starts, 'start')}. ${h.state === 'broodmare' ? 'She joins your broodmares.' : h.state === 'stud' ? 'He stands at stud now.' : 'Pasture and carrots from here on.'}`);
        continue;
      }
      if (h.banned > s.year) continue;
      purses += horseSeason(s, p);
      if (!p.alive) continue;
    }
    if (h.state === 'stud') stud += studYear(s, p);
  }
  if (fees) { M(s).money -= fees; finRow(s, 'exp', 'Training fees', fees); }
  if (purses) { M(s).money += purses; finRow(s, 'inc', 'Purses', purses); }
  if (stud) { M(s).money += stud; finRow(s, 'inc', 'Stud fees', stud); if (stud >= price(s, 1e6)) tally(s, 'studMillion'); }
}
function growHorse(h, age) {
  if (age <= 5) {
    const g = TRAINERS[h.trainer].grow;
    h.spd = clamp(Math.round(h.spd + (h.ps - h.spd) * g + gauss(0, 1)), 30, 99);
    h.sta = clamp(Math.round(h.sta + (h.pt - h.sta) * g + gauss(0, 1)), 30, 99);
  } else if (age >= 7) {
    h.spd = Math.max(30, h.spd - randInt(1, 3));
    h.sta = Math.max(30, h.sta - randInt(0, 2));
  }
}
// Where a horse finishes among rivals: draw winners by strength until it's this one.
function simPlace(me, rivals) {
  const left = [me].concat(rivals);
  for (let place = 0; left.length; place++) {
    const w = weighted(left, (h) => Math.exp(racePower(h) / 6));
    if (w === me) return place;
    left.splice(left.indexOf(w), 1);
  }
  return rivals.length;
}
function strongRivals(spd, sta) { const out = []; for (let i = 0; i < 7; i++) out.push({ spd: clamp(gauss(spd, 4), 55, 99), sta: clamp(gauss(sta, 6), 50, 99), form: randInt(-3, 3) }); return out; }
function horseSeason(s, p) {
  const h = p.race, track = homeTrack(s), glam = track ? 0.6 + track.glam / 100 : 1;
  const starts = h.hurt === s.year ? randInt(1, 3) : randInt(4, 7);
  let purse = 0, wins = 0, places = 0;
  const won = [];
  const me = runnerOf(p);
  for (let i = 0; i < starts; i++) {
    const stakes = racePower(me) >= 72 && i >= starts - 2 && chance(0.6);
    const rivals = stakes ? strongRivals(84, 80) : track ? track.horses.slice().sort(() => rand() - 0.5).slice(0, 7) : strongRivals(73, 70);
    const place = simPlace(me, rivals);
    purse += price(s, (stakes ? 250000 : 30000) * glam) * (PURSE_SPLIT[place] || 0);
    if (place === 0) { wins++; if (stakes) won.push(`The ${track ? track.city : P(s).city} ${pick(STAKES_NAMES)}`); }
    else if (place <= 2) places++;
  }
  purse = Math.round(purse);
  h.starts += starts; h.wins += wins; h.places += places; h.earn += purse;
  h.stakes.push(...won);
  if (h.stakes.length > 20) h.stakes = h.stakes.slice(-20);
  h.form = clamp(Math.round(h.form * 0.5 + (wins - starts * 0.2) * 2 + gauss(0, 1.5)), -10, 10);
  if (wins) tally(s, 'ownerWins', wins);
  if (won.length && h.bred) tally(s, 'homebredStakes', won.length);
  log(s, `🏇 ${p.name}: ${nOf(starts, 'start')}, ${nOf(wins, 'win')}${places ? `, ${nOf(places, 'place')}` : ''}, ${fmtMoneyShort(purse)} in purses.${won.length ? ` Won ${won.join(' and ')}!` : ''}`, wins ? 'good' : '');
  // Injuries: most heal, some end a career, and very rarely the worst happens.
  if (chance(0.07)) {
    const bill = price(s, randInt(5000, 30000));
    M(s).money -= bill;
    finRow(s, 'exp', 'Vet bills', bill);
    h.hurt = s.year + 1;
    if (chance(0.04)) { p.alive = false; p.died = s.year; add(s, { happy: -12 }); announce(s, { emoji: '🕊️', title: `Goodbye, ${p.name}`, text: `${p.name} broke down on the far turn and couldn't be saved. The whole barn cried.`, tone: 'bad' }); }
    else if (chance(0.3)) { h.state = h.sex === 'f' ? 'broodmare' : studReady(h) ? 'stud' : 'retired'; log(s, `🩹 ${p.name} bowed a tendon. ${h.sex === 'f' ? 'Her' : 'His'} racing days are over.`, 'bad'); }
    else log(s, `🩹 ${p.name} came back lame. The vet says rest, and ${fmtMoney(bill)}.`, 'bad');
  }
  return purse;
}
function studYear(s, p) {
  const h = p.race, age = petAge(s, p);
  const mares = clamp(Math.round((8 + (studScore(h) - 68) * 2.2 + randInt(-4, 4)) * (age > 20 ? 0.5 : 1)), 2, 140);
  const got = Math.round(studFee(s, p) * mares * 0.8);
  log(s, `💰 ${p.name} covered ${nOf(mares, 'mare')} at stud: ${fmtMoneyShort(got)}.`);
  return got;
}
// A mare in foal last year foals this spring. The foal is named on the spot (you can rename it).
function foaling(s, dam, budget) {
  const h = dam.race, f = h.inFoal;
  h.inFoal = null;
  const r = rand();
  if (r < 0.06) { log(s, `🍼 ${dam.name} didn't catch this year.`); return; }
  if (r < 0.12) { const bill = price(s, randInt(3000, 12000)); M(s).money -= bill; log(s, `🍼 ${dam.name}'s foal was stillborn. The vet's bill was ${fmtMoney(bill)}.`, 'bad'); return; }
  const sex = chance(0.5) ? 'm' : 'f';
  const p = makeRacehorse(s, { name: `${pick(HORSE_A)} ${pick(HORSE_B)}`, born: s.year, sex, ps: (f.spd + h.ps) / 2 + gauss(0, 4.5), pt: (f.sta + h.pt) / 2 + gauss(0, 4.5), sire: f.sire, dam: dam.name, bred: true });
  tally(s, 'foals');
  if (budget.n > 0 && racehorses(s).length <= 12) {
    budget.n--;
    popup(s, { emoji: '🐣', title: 'A foal!', text: `${dam.name} had a ${sex === 'f' ? 'filly' : 'colt'} by ${f.sire}, up and wobbling within the hour. What will you call ${sex === 'f' ? 'her' : 'him'}?`, handler: 'hsFoalName', ctx: { pid: p.id }, input: { label: 'Name', value: p.name, max: 24 }, choices: [{ label: 'Name the foal' }] });
  } else log(s, `🐣 ${dam.name} had a ${sex === 'f' ? 'filly' : 'colt'} by ${f.sire}. You called ${sex === 'f' ? 'her' : 'him'} ${p.name}.`, 'good');
}
onChoice('hsFoalName', (s, ctx, v, input) => { const p = s.pets[ctx.pid]; if (p && cleanName(input)) p.name = cleanName(input); return p ? { text: `Welcome to the world, ${p.name}.`, emoji: '🐣', tone: 'good' } : undefined; });

/* ---- the casino (industry 'casino') -------------------------------------------- */
const CASINO_EDGE = [
  { name: 'Loose', rev: 0.85, rep: 6, desc: 'The loosest slots in town. Players talk.' },
  { name: 'Standard', rev: 1, rep: 0, desc: 'The usual house edge.' },
  { name: 'Tight', rev: 1.15, rep: -7, desc: 'More from every bet, and players notice.' },
];
const CASINO_EYE = [
  { name: 'None', cost: 0, catch: 0 }, { name: 'Basic cameras', cost: 150000, catch: 0.4 },
  { name: 'Eye in the sky', cost: 500000, catch: 0.7 }, { name: 'State of the art', cost: 1500000, catch: 0.9 },
];
const VIP_COST = 800000;
function ownsCasino(s) { return companies(s).some((c) => !c.closed && c.ind === 'casino'); }
function casinoOf(co) { return co.casino || (co.casino = { edge: 1, vip: false, eye: 1, skim: null, threat: null, probation: 0, scandals: 0, vid: null, cc: null, city: null }); }
// What the casino adds to the year's forecast: the house edge, and the cost of cameras and the VIP room.
function casinoMods(s, co) {
  const c = casinoOf(co), E = CASINO_EDGE[c.edge];
  return { rev: E.rev, rep: E.rep + (c.vip ? 3 : 0) - c.scandals * 3, cost: price(s, CASINO_EYE[c.eye].cost) * co.locations + (c.vip ? price(s, VIP_COST) : 0) };
}
// Whales, cheats, the skim and the gaming commission: what the forecast can't see coming.
function casinoYear(s, co, revenue) {
  const c = casinoOf(co), out = { whales: 0, cost: 0 }, mine = co.ceo === 'you' && free(s);
  casinoVenue(s, co);
  if (c.skim && c.skim.self && !inMob(s)) c.skim = null;
  if (c.vip) {
    // More whales, with deeper pockets, come to famous casinos with enough hosts to court them.
    const n = randInt(0, 1) + (co.rep >= 45 ? 1 : 0) + (co.rep >= 65 ? 1 : 0) + (co.rep >= 85 ? 1 : 0) + (co.team.sales.n >= 5 ? 1 : 0);
    for (let i = 0; i < n; i++) out.whales += Math.round(price(s, randInt(2, 30) * 1e6) * (0.4 + co.rep / 80) * (0.03 + gauss(0, 0.07)));
    if (out.whales > 0 && chance(0.15)) { const stiff = Math.round(out.whales * randFloat(0.2, 0.6)); out.whales -= stiff; log(s, `🐋 A whale left ${co.name} owing ${fmtMoneyShort(stiff)} on a marker, and a lawyer in another country.`, 'bad'); }
    log(s, `🐋 ${co.name}'s high-limit room ${out.whales >= 0 ? 'won' : 'lost'} ${fmtMoneyShort(Math.abs(out.whales))} against ${nOf(n, 'whale')}.`, out.whales >= 0 ? 'good' : 'bad');
    if (out.whales >= price(s, 1e7)) tally(s, 'whaleBeaten');
  }
  if (chance(0.3)) {
    if (chance(CASINO_EYE[c.eye].catch)) log(s, `📹 ${co.name}'s surveillance caught ${pick(['a ring of card markers', 'a dealer palming chips', 'a crew hacking the slots', 'past-posting at roulette'])} before they cost much.`);
    else { const loss = price(s, randInt(100, 2000) * 1000); out.cost += loss; c.scandals++; log(s, `🎭 ${pick(['A cheating ring', 'A crooked dealer and three friends', 'A team with a hacked slot machine'])} took ${co.name} for ${fmtMoneyShort(loss)} before anyone noticed.`, 'bad'); }
  }
  if (c.skim) {
    const take = Math.round(Math.max(0, revenue) * c.skim.cut);
    out.cost += take;
    if (c.skim.self && inMob(s)) { M(s).money += take; finRow(s, 'inc', 'The count room', take); addRespect(s, 3); addHeat(s, 6); }
  }
  if (c.threat) casinoThreat(s, co, c, out);
  const audit = 0.06 + (c.skim ? 0.12 : 0) + c.scandals * 0.04 + (c.probation >= s.year ? 0.1 : 0);
  if (chance(audit)) commission(s, co, c, out);
  if (c.scandals > 0 && chance(0.4)) c.scandals--;
  if (mine && !c.skim && !c.threat && chance(0.12)) skimOffer(s, co);
  return out;
}
// The gaming commission's audit.
function commission(s, co, c, out) {
  if (c.skim && chance(0.5)) { revokeLicense(s, co, c); return; }
  if (c.skim || c.scandals >= 2) {
    const fine = price(s, c.skim ? 2e6 : 500000);
    out.cost += fine;
    c.probation = s.year + 3;
    log(s, `⚖️ The gaming commission fined ${co.name} ${fmtMoneyShort(fine)} and put it on probation until ${c.probation}.`, 'bad');
    return;
  }
  log(s, `⚖️ The gaming commission audited ${co.name}'s count room and found everything in order.`);
}
function revokeLicense(s, co, c) {
  const got = Math.max(0, Math.round(co.val * 0.5 * co.equity));
  M(s).money += got;
  co.closed = true;
  tally(s, 'licenseLost');
  const v = c.vid && vById(s, c.vid), buyer = pick(industryRivals(s, 'casino'));
  if (v) v.owner = buyer ? { firm: buyer.id } : null;
  announce(s, { emoji: '⚖️', title: 'License revoked', tone: 'bad', text: `The gaming commission found the skim and revoked ${co.name}'s license. It had to be sold in a fire sale${buyer ? ` to ${buyer.name}` : ''}; your share came to ${fmtMoney(got)}.` });
  if (c.skim.self && chance(0.4)) { const r = arrest(s, 'racketeering'); if (r && r.text) log(s, r.text, 'bad'); }
}
function skimOffer(s, co) {
  if (inMob(s)) {
    const fam = myFamily(s);
    popup(s, { emoji: '🕴️', title: 'The count room', handler: 'csSkim', ctx: { co: co.id, self: true }, text: `${fam.mine ? 'Your capos want' : `${fam.boss} wants`} ${co.name}'s count room to "come up a little light" every night. The difference goes to the family, and to you.`, choices: [{ label: 'Skim it', value: 'skim', tone: 'bad' }, { label: 'Keep the casino clean', value: 'no' }] });
    return;
  }
  const f = pick(familiesIn(s, P(s).country));
  popup(s, {
    emoji: '🕴️', title: cap(f.name), tone: 'bad', handler: 'csSkim', ctx: { co: co.id, fam: f.id },
    text: `Two men from ${f.name} toured ${co.name}'s count room like they owned it. They want ten percent off the top, every night, "to keep things running smoothly."`,
    choices: [{ label: 'Pay the skim', value: 'pay' }, { label: 'Throw them out', value: 'no', tone: 'bad' }, { label: 'Call the feds', value: 'feds' }],
  });
}
onChoice('csSkim', (s, ctx, v) => {
  const co = company(s, ctx.co);
  if (!co) return;
  const c = casinoOf(co);
  if (ctx.self) {
    if (v !== 'skim') { addRespect(s, -5); return 'You told the boss your casino stays clean. The boss did not like it.'; }
    c.skim = { self: true, cut: 0.08 };
    add(s, { karma: -6 });
    return { text: `Eight percent of ${co.name}'s take now leaves through the count room in paper bags. The gaming commission must never know.`, emoji: '🕴️' };
  }
  const f = underworldOf(s).families[ctx.fam];
  if (v === 'pay') { c.skim = { fam: ctx.fam, cut: 0.1 }; return `${cap(f ? f.name : 'The family')} takes ten percent off the top now. If the commission ever finds out, it's your license.`; }
  if (v === 'feds') { add(s, { karma: 8 }); uw(s).enemy = ctx.fam; return { text: 'The feds wired your count room and took down two of their soldiers. The family knows who talked.', tone: 'bad' }; }
  c.threat = { fam: ctx.fam, year: s.year };
  return { text: 'Security walked them out. One of them waved from the parking lot.', tone: 'bad' };
});
function casinoThreat(s, co, c, out) {
  if (s.year - c.threat.year > 3) { c.threat = null; return; }
  if (!chance(0.4)) return;
  if (chance(0.5)) { const loss = Math.round(price(s, indOf(co).locBuild) * 0.15); out.cost += loss; co.rep = clamp100(co.rep - 8); log(s, `🔥 A fire broke out in ${co.name}'s kitchen at 3 a.m. The fire marshal called it arson. Repairs: ${fmtMoneyShort(loss)}.`, 'bad'); }
  else { c.scandals++; log(s, `🎭 A dealer at ${co.name} was paid to cheat for a crew of "tourists." The family sends its regards.`, 'bad'); }
}
// Your casino's flagship is a real venue in the city where it opened.
function casinoVenue(s, co) {
  const c = casinoOf(co);
  let v = c.vid && vById(s, c.vid);
  if (!v) {
    c.cc = c.cc || P(s).country;
    c.city = c.city || P(s).city;
    venuesIn(s, c.cc, c.city);
    v = newVenue(s, c.cc, c.city, 'casino');
    s.venueIdx[cityKey(c.cc, c.city)].push(v.id);
    c.vid = v.id;
  }
  Object.assign(v, { name: co.name, owner: { co: co.id }, open: !co.closed, kind: c.vip ? 'resort' : 'casino', glam: clamp100(25 + co.rep * 0.7) });
  return v;
}
// Casino actions (target: company id)
const runsCasino = (s, id) => { const co = company(s, id); return canManage(s, co) && co.ind === 'casino'; };
defAction({
  id: 'cs_edge', cat: 'company', target: 'company', label: 'Set the house edge', emoji: '🎰',
  when: runsCasino, sub: (s, id) => CASINO_EDGE[casinoOf(company(s, id)).edge].name,
  run: (s, id) => { popup(s, { emoji: '🎰', title: 'The house edge', text: 'Looser games draw players and goodwill. Tighter ones make more from every bet, until players notice.', handler: 'csEdge', ctx: { co: id }, choices: CASINO_EDGE.map((e, i) => ({ label: e.name, value: i, sub: e.desc })).concat([{ label: 'Never mind', value: null }]) }); },
});
onChoice('csEdge', (s, ctx, i) => { const co = company(s, ctx.co); if (!co || i == null) return; casinoOf(co).edge = i; return { text: `${co.name}'s games are ${CASINO_EDGE[i].name.toLowerCase()} now.`, quiet: true }; });
defAction({
  id: 'cs_vip', cat: 'company', target: 'company', emoji: '🐋',
  label: (s, id) => (casinoOf(company(s, id)).vip ? 'Close the high-limit room' : 'Open a high-limit room'),
  sub: (s, id) => (casinoOf(company(s, id)).vip ? 'No more whales' : `Whales bet millions. ${fmtMoney(price(s, VIP_COST))} a year in hosts and comps`),
  when: runsCasino,
  run: (s, id) => { const c = casinoOf(company(s, id)); c.vip = !c.vip; casinoVenue(s, company(s, id)); return { text: c.vip ? 'The high-limit room is open: velvet ropes, private dealers and a host on call. Whales win big sometimes. That’s the point.' : 'You closed the high-limit room. Steadier books, fewer headlines.', quiet: true }; },
});
defAction({
  id: 'cs_eye', cat: 'company', target: 'company', label: 'Surveillance', emoji: '📹',
  when: runsCasino, sub: (s, id) => CASINO_EYE[casinoOf(company(s, id)).eye].name,
  run: (s, id) => { const co = company(s, id); popup(s, { emoji: '📹', title: 'The eye in the sky', text: 'Cheats find the casinos that aren’t watching.', handler: 'csEye', ctx: { co: id }, choices: CASINO_EYE.map((e, i) => ({ label: e.name, value: i, sub: `Catches about ${Math.round(e.catch * 100)}% of cheats · ${fmtMoney(price(s, e.cost) * co.locations)} a year` })).concat([{ label: 'Never mind', value: null }]) }); },
});
onChoice('csEye', (s, ctx, i) => { const co = company(s, ctx.co); if (!co || i == null) return; casinoOf(co).eye = i; return { text: `${co.name}'s surveillance: ${CASINO_EYE[i].name.toLowerCase()}.`, quiet: true }; });
defAction({
  id: 'cs_skim_stop', cat: 'company', target: 'company', emoji: '🧾',
  label: (s, id) => (casinoOf(company(s, id)).skim.self ? 'Stop skimming the count room' : 'Stop paying the skim'),
  when: (s, id) => runsCasino(s, id) && !!casinoOf(company(s, id)).skim,
  run: (s, id) => {
    const c = casinoOf(company(s, id)), sk = c.skim;
    c.skim = null;
    if (sk.self) { addRespect(s, -8); return 'The count room counts true again. The boss noticed the bags got lighter.'; }
    c.threat = { fam: sk.fam, year: s.year };
    return { text: 'You stopped the payments. The family stopped smiling.', tone: 'bad' };
  },
});
defAction({
  id: 'cs_tourney', cat: 'company', target: 'company', label: 'Host a poker tournament', emoji: '♠️',
  when: (s, id) => runsCasino(s, id) && count(s, 'cs_tourney') < 1,
  sub: (s, id) => fmtMoney(bizCost(s, company(s, id), 150000)),
  run: (s, id) => {
    const co = company(s, id), cost = bizCost(s, co, 150000);
    if (co.cash < cost) return { text: `${co.name} doesn't have ${fmtMoney(cost)} to spare.`, nolog: true };
    bump(s, 'cs_tourney');
    co.cash -= cost;
    co.rep = clamp100(co.rep + randInt(3, 7));
    M(s).fame = clamp100(M(s).fame + 1);
    return { text: `${co.name} hosted ${pick(['a televised high-stakes tournament', 'a charity poker night with celebrities', 'the regional championship'])}. The poker room hasn't been this full in years.`, emoji: '♠️', tone: 'good' };
  },
});
// Visiting your own casino: no playing against yourself.
function ownVenueVisit(s, v) {
  const co = company(s, v.owner.co);
  if (co) for (const r of BIZ_ROLE_IDS) if (co.team[r].n) co.team[r].morale = clamp(co.team[r].morale + 2, 0, 100);
  return { text: `You walked the floor of ${v.name}. The pit bosses straightened up, and you didn't place a bet: the house doesn't play against itself.`, emoji: '🎰' };
}

/* ---- the year --------------------------------------------------------------------- */
function houseTick(s) {
  if (s.dead) return;
  const budget = { n: 2 };
  if (bookOf(s)) bookYear(s, budget);
  stableYear(s, budget);
  // A casino that is no longer yours keeps its doors open under someone else.
  for (const v of Object.values(s.venues || {})) if (v.owner && v.owner.co && !company(s, v.owner.co)) v.owner = null;
}

/* ---- events ------------------------------------------------------------------------- */
const bookie = (s) => !!bookOf(s) && free(s);
const myRacer = (s) => { const p = pick(racehorses(s).filter((x) => x.race.state === 'racing' && petAge(s, x) >= 2)); return p ? { pet: p.id } : null; };
EV('bk_cop', {
  ages: [21, 90], emoji: '🚔', when: (s) => bookie(s) && !bookOf(s).legal, text: 'One of your regulars turns out to be a cop. He still wants to bet the game on Sunday.',
  choices: [
    ['Keep taking his bets', (s) => { if (chance(0.5)) { addHeat(s, -15); return 'He’s been tipping you off about raids ever since. Best customer you have.'; } addHeat(s, 12); return { text: 'He was undercover. Your name is in a file now.', tone: 'bad' }; }],
    ['Cut him off', (s) => { addHeat(s, 4); return 'He took it personally. He’s been parking outside your place.'; }],
    ['Buy him a drink and a favor', (s) => { const amt = price(s, 5000); if (!pay(s, amt)) return cantAfford(amt); addHeat(s, -20); add(s, { karma: -3 }); if (chance(0.15)) return arrest(s, 'bribery'); return `${fmtMoney(amt)} later, he’s the reason nobody bothers you.`; }],
  ],
});
EV('bk_fixed', {
  ages: [21, 90], emoji: '🤫', when: bookie, text: 'A nervous punter wants to put a fortune on a game he swears is fixed.',
  choices: [
    ['Take the bet', (s) => { const amt = price(s, randInt(30000, 150000)); if (chance(0.6)) { M(s).money -= amt; return { text: `The game was fixed. You paid out ${fmtMoney(amt)} through gritted teeth.`, tone: 'bad' }; } M(s).money += amt; return { text: `It wasn't fixed. He lost ${fmtMoney(amt)} and you never saw him again.`, tone: 'good' }; }],
    ['Turn him down', () => 'You said your book doesn’t take that kind of action. He tried the next bookie.'],
    ['Bet the same way somewhere else', (s) => { add(s, { karma: -3 }); const amt = price(s, randInt(5000, 40000)); if (chance(0.6)) { M(s).money += amt; return { text: `The fix was in. You made ${fmtMoney(amt)} at someone else’s book.`, tone: 'good' }; } M(s).money -= Math.min(Math.max(0, M(s).money), amt); return { text: 'The fix fell through. So did your money.', tone: 'bad' }; }],
  ],
});
EV('hs_buyer', {
  ages: [18, 100], emoji: '🤝', ctx: (s) => { const p = pick(racehorses(s).filter((x) => x.race.wins >= 2 && x.race.state === 'racing')); return p ? { pet: p.id } : null; },
  text: (s, c) => `A buyer from abroad flew in to watch ${s.pets[c.pet].name} work, and made an offer on the spot: ${fmtMoney(nicePrice(horseValue(s, s.pets[c.pet]) * 1.6))}.`,
  choices: [
    ['Sell', (s, c) => { const p = s.pets[c.pet]; if (!p) return; const amt = nicePrice(horseValue(s, p) * 1.6); delete s.pets[p.id]; M(s).money += amt; tally(s, 'horsesSold'); return `${p.name} flew out first class. You banked ${fmtMoney(amt)}.`; }],
    ['Not for sale', (s, c) => `You said ${s.pets[c.pet].name} isn’t for sale at any price. The buyer said everything is.`],
  ],
});
EV('hs_jockey', {
  ages: [18, 100], emoji: '🏇', ctx: myRacer, when: (s) => free(s),
  text: (s, c) => `A man in a camel coat offers you ${fmtMoney(price(s, 40000))} to have your jockey hold ${s.pets[c.pet].name} back in Saturday's race.`,
  choices: [
    ['Take the money', (s, c) => { const p = s.pets[c.pet]; add(s, { money: price(s, 40000), karma: -8 }); if (chance(0.25)) { p.race.banned = s.year + 3; add(s, { fame: -3 }); return { text: `The stewards reviewed the race. ${p.name} is banned from racing for three years, and so is your jockey.`, tone: 'bad' }; } return `${p.name} finished a quiet seventh. Nobody asked why.`; }],
    ['Refuse', (s, c) => `You told him ${s.pets[c.pet].name} runs to win. He tipped his hat and walked off.`],
    ['Report him to the stewards', (s) => { add(s, { karma: 4, fame: 1 }); return 'The stewards banned him from every track in the country.'; }],
  ],
});
EV('hs_vet', {
  ages: [18, 100], emoji: '💉', ctx: myRacer, when: (s) => free(s),
  text: (s, c) => `A track vet offers you something that “helps ${s.pets[c.pet].name} breathe.” It doesn’t show up on most tests.`,
  choices: [
    ['Use it', (s, c) => { const p = s.pets[c.pet]; add(s, { karma: -6 }); if (chance(0.3)) { const fine = price(s, 25000); M(s).money -= fine; p.race.banned = s.year + 2; return { text: `It showed up on this test. ${p.name} was disqualified and banned for two years, and you were fined ${fmtMoney(fine)}.`, tone: 'bad' }; } p.race.form = clamp(p.race.form + 6, -10, 10); return `${p.name} ran like the wind all spring.`; }],
    ['No thanks', (s) => { add(s, { karma: 2 }); return 'You said your horses run clean.'; }],
  ],
});
EV('hs_paddock', {
  ages: [6, 100], emoji: '🐴', ctx: (s) => { const p = pick(racehorses(s).filter((x) => petAge(s, x) <= 2)); return p ? { pet: p.id } : null; },
  text: (s, c) => `${s.pets[c.pet].name} took a first real gallop across the paddock and bucked for joy.`,
  auto: (s, c) => { add(s, { happy: 3 }); s.pets[c.pet].rel = clamp100(s.pets[c.pet].rel + 5); return 'The stable hands stopped to watch.'; },
});
EV('hs_carrots', {
  ages: [6, 100], emoji: '🥕', ctx: (s) => { const p = pick(racehorses(s).filter((x) => x.race.state === 'retired')); return p ? { pet: p.id } : null; },
  text: (s, c) => `Kids from down the road come by after school to feed carrots to ${s.pets[c.pet].name}.`,
  auto: (s, c) => { add(s, { happy: 2, karma: 1 }); s.pets[c.pet].rel = clamp100(s.pets[c.pet].rel + 6); return 'Retirement suits a champion.'; },
});
BEV('cs_celebrity', {
  when: isInd(['casino']), emoji: '🌟', text: 'A celebrity wants to throw a birthday party in the high-limit room.',
  choices: [
    ['Comp everything', (s, co) => { const cost = bizCost(s, co, 100000); co.cash -= cost; co.rep = clamp100(co.rep + 6); return `The photos were everywhere. It cost ${fmtMoney(cost)} and was worth every chip.`; }],
    ['Charge them like anyone else', (s, co) => { co.rep = clamp100(co.rep - 2); return 'They took the party to a rival casino.'; }],
  ],
});
BEV('cs_jackpot', {
  when: isInd(['casino']), emoji: '🎰', text: 'A retired schoolteacher hit the progressive jackpot on her fourth pull.',
  auto: (s, co) => { co.rep = clamp100(co.rep + 4); return 'The news crews loved it, and the slot floor was packed for a month.'; },
});
BEV('cs_dealer', {
  when: isInd(['casino']), emoji: '🃏', text: 'A dealer was caught palming chips into her sleeve.',
  choices: [
    ['Fire her and press charges', (s, co) => { co.rep = clamp100(co.rep + 1); return 'Security walked her out in handcuffs. The other dealers got the message.'; }],
    ['Let her go quietly', (s, co) => { for (const r of BIZ_ROLE_IDS) if (co.team[r].n) co.team[r].morale = clamp(co.team[r].morale + 2, 0, 100); return 'No police, no headlines. The staff appreciated it.'; }],
  ],
});

/* ---- data hooks, achievements, goals and legacy ------------------------------------- */
CRIMES.bookmaking = { name: 'Illegal bookmaking', minAge: 18, sentence: [0, 3], conviction: 0.75, karma: -3, felony: true, verb: 'illegal bookmaking' };
ACT_CATS.splice(ACT_CATS.findIndex((c) => c.id === 'gamble') + 1, 0, { id: 'turf', name: 'Track & Book', emoji: '🏇' });
ACHIEVEMENTS.push(
  { id: 'making_book', name: 'Making Book', emoji: '📒', desc: 'Run your own book for five years.', check: (s) => !!M(s).book && M(s).book.years >= 5 },
  { id: 'house_wins', name: 'The House Always Wins', emoji: '💼', desc: () => `Make ${fmtMoneyShort(1e6)} from your book.`, check: (s) => LC(s, 'bookMillion') >= 1 },
  { id: 'upset_special', name: 'Saved by the Upset', emoji: '🙏', desc: 'Let a lopsided book ride and get rescued by the result.', check: (s) => LC(s, 'upsetSaved') >= 1 },
  { id: 'winners_circle', name: 'Winner’s Circle', emoji: '🏇', desc: 'Win a race with a horse you own.', check: (s) => LC(s, 'ownerWins') >= 1 },
  { id: 'derby_day', name: 'Derby Day', emoji: '🌹', desc: 'Win a Derby.', check: (s) => LC(s, 'derbyWins') >= 1 },
  { id: 'the_crown', name: 'The Crown', emoji: '👑', desc: 'Win the Derby, the Cup and the Gold Cup with one horse in one year.', check: (s) => LC(s, 'crown') >= 1 },
  { id: 'homebred', name: 'Homebred Hero', emoji: '🐴', desc: 'Win a stakes race with a horse you bred.', check: (s) => LC(s, 'homebredStakes') >= 1 },
  { id: 'stud_fees', name: 'Standing at Stud', emoji: '💰', desc: () => `Earn ${fmtMoneyShort(1e6)} in stud fees in one year.`, check: (s) => LC(s, 'studMillion') >= 1 },
  { id: 'the_house', name: 'The House', emoji: '🎰', desc: 'Own a casino.', check: ownsCasino },
  { id: 'whale_hunter', name: 'Whale Hunter', emoji: '🐳', desc: () => `Win ${fmtMoneyShort(1e7)} from the whales in one year.`, check: (s) => LC(s, 'whaleBeaten') >= 1 },
);
GOALS.push(
  { id: 'g_racehorse', text: 'Win a race with your own horse', emoji: '🏇', check: (s) => LC(s, 'ownerWins') >= 1 },
  { id: 'g_casino', text: 'Own a casino', emoji: '🎰', check: ownsCasino },
);
LEGACY_TITLES.splice(LEGACY_TITLES.findIndex((t) => t.id === 'tycoon'), 0,
  { id: 'racing_legend', name: 'Racing Legend', emoji: '🏆', check: (s) => LC(s, 'derbyWins') >= 1 || LC(s, 'bigRaceWins') >= 3 },
  { id: 'casino_mogul', name: 'Casino Mogul', emoji: '🎰', check: (s) => companies(s).some((c) => !c.closed && c.ind === 'casino' && coWorth(c) >= price(s, 1e8)) },
);
