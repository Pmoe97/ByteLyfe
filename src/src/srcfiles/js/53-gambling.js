/* =====================================================================
 * 53-gambling.js — gambling: named venues that live in every city, your
 * standing at each, table games, horse racing, sports, fight and poker
 * betting, credit and the people who collect it, the road back, and the
 * casino city of Silver Mesa.
 *
 * s.venues = { id: venue }, s.venueIdx = { 'cc:city': [ids] }   made the first
 *   time anyone looks at a city (venuesIn), shared by the family line.
 *   venue = { id, cc, city, kind, name, owner, glam, open, since, horses? }
 *   owner: { fam } a crime family, { firm } a market company, { first, last, g,
 *   pid? } a bookie (made a person the first time you bet with them), { co } a casino
 *   you own (54-house.js).
 * M(s).gamb = { at: { venueId: { wagered, tier, banned, heat, visits } },
 *   bets: open season bets, debts: [{ id, kind, vid, who, pid, amt, rate, since,
 *   stage, paid }], race: a race waiting for its finish, poker: { rating, cashes,
 *   wins, rivals }, excluded: the year a self-ban ends, trip: { key, year } }
 * A race is decided when the bet is placed but paid out by settleRace, which the
 * race screen calls at the finish (doAction and ageUp settle any race left over).
 * gamblingTick runs after sportsTick: season bets, debts, horses, venue news.
 * ===================================================================== */

const VENUE_KINDS = {
  backroom: { name: 'Back-room game', emoji: '🃏', games: ['poker', 'dice'], min: 50, max: 20000, credit: 'mob', desc: 'Cash only, credit on a handshake, and nobody calls the cops.' },
  bookie: { name: 'Bookie', emoji: '📒', games: ['sports', 'fight', 'horses'], min: 20, max: 50000, credit: 'bookie', desc: 'Takes bets on anything. Friendly, until you owe.' },
  track: { name: 'Racetrack', emoji: '🏇', games: ['horses'], min: 2, max: 100000, desc: 'Named horses, real odds and tips from the rail.' },
  casino: { name: 'Casino', emoji: '🎰', games: ['bj', 'roulette', 'slots', 'count', 'poker'], min: 10, max: 25000, credit: 'marker', desc: 'Comps for regulars and eyes in the sky.' },
  resort: { name: 'Resort casino', emoji: '💎', games: ['bj', 'baccarat', 'roulette', 'slots', 'count', 'poker'], min: 100, max: 500000, credit: 'marker', desc: 'High limits, VIP hosts and comped suites.' },
  app: { name: 'Betting app', emoji: '📱', games: ['sports', 'fight', 'horses', 'slots'], min: 1, max: 10000, desc: 'Always in your pocket. That’s the problem.' },
};
const GAMES = {
  bj: { name: 'Blackjack', emoji: '🃏' }, roulette: { name: 'Roulette', emoji: '🎡' }, slots: { name: 'Slots', emoji: '🎰' },
  baccarat: { name: 'Baccarat', emoji: '💎' }, count: { name: 'Count cards at blackjack', emoji: '🧮' }, dice: { name: 'Shoot dice', emoji: '🎲' },
  poker: { name: 'Poker', emoji: '♠️' }, horses: { name: 'Bet on a race', emoji: '🏇' }, sports: { name: 'Bet on a season', emoji: '🏆' }, fight: { name: 'Fight night', emoji: '🥊' },
};
const TIERS = [['Newcomer', 0], ['Regular', 2000], ['Silver', 20000], ['Gold', 200000], ['Whale', 2000000]];
const CASINO_A = ['Golden', 'Silver', 'Lucky', 'Royal', 'Red', 'Diamond', 'Gilded', 'Neon', 'Crimson', 'Emerald', 'Midnight', 'Copper'];
const CASINO_B = ['Ace', 'Horseshoe', 'Nugget', 'Spade', 'Crown', 'Clover', 'Star', 'Chip', 'Dragon', 'Jackpot', 'Lantern', 'Coin'];
const RESORT_A = ['Monarch', 'Opaline', 'Sovereign', 'Celestine', 'Aurelian', 'Halcyon', 'Bellmont', 'Marquise', 'Solenne', 'Valmont', 'Seraphine', 'Imperial Jade'];
const RESORT_B = ['Grand', 'Resort & Casino', 'Palace', 'Towers'];
const BACKROOMS = ['a laundromat', 'a butcher shop', 'a bowling alley', 'a social club', 'an all-night diner', 'a cigar shop', 'a dry cleaner', 'a pool hall'];
const HORSE_A = ['Midnight', 'Silver', 'Golden', 'Lucky', 'Thunder', 'Velvet', 'Copper', 'Royal', 'Shadow', 'Morning', 'Wild', 'Desert', 'Crimson', 'Northern', 'Quiet', 'Rapid', 'Gentle', 'Iron', 'Painted', 'Second'];
const HORSE_B = ['Comet', 'Dancer', 'Arrow', 'Echo', 'Gambit', 'Whisper', 'Legacy', 'Storm', 'Promise', 'Ember', 'Rhapsody', 'Sonnet', 'Mariner', 'Bandit', 'Lantern', 'Fortune', 'Glory', 'Tempo', 'Chance', 'Verdict'];
const SILKS = ['#E5484D', '#3E8EF7', '#F5B700', '#30A46C', '#8E4EC6', '#F76B15', '#E93D82', '#12A594', '#8D6E63', '#5B5BD6'];
const BOOKIE_NICKS = ['the Accountant', 'Two Phones', 'Sunday', 'the Professor', 'Lucky', 'Uncle', 'Paperclip', 'the Vet', 'Slow Hands', 'Grandpa'];

function gambleAge(s) { return Math.max(18, country(s).drink); }
function canGamble(s) { return free(s) && A(s) >= gambleAge(s) && !worldClosed(s, 'gambling'); } // casinos close in a pandemic (88-world.js)
function gamb(s) { const m = M(s); return m.gamb || (m.gamb = { at: {}, bets: [], debts: [], race: null, poker: { rating: 0, cashes: 0, wins: 0, rivals: [] }, excluded: 0, trip: null }); }
function excluded(s) { return gamb(s).excluded > s.year; }
function vById(s, id) { return (s.venues || {})[id] || null; }
function vStand(s, id) { const g = gamb(s); return g.at[id] || (g.at[id] = { wagered: 0, tier: 0, banned: 0, heat: 0, visits: 0 }); }
function tierName(s, id) { return TIERS[vStand(s, id).tier][0]; }

/* ---- venues ------------------------------------------------------------------- */
function newVenue(s, cc, city, kind) {
  s.venueSeq = (s.venueSeq || 0) + 1;
  const v = { id: 'v' + s.venueSeq, cc, city, kind, open: true, since: s.year, glam: 50 };
  if (kind === 'casino') {
    v.name = `${pick(CASINO_A)} ${pick(CASINO_B)} Casino`; v.glam = randInt(35, 65);
    const chains = industryRivals(s, 'casino');
    if (chance(0.25)) { const f = pick(familiesIn(s, cc)); v.owner = { fam: f.id }; } else if (chains.length && chance(0.6)) v.owner = { firm: pick(chains).id };
  }
  else if (kind === 'resort') { const hotels = industryRivals(s, 'hotel'); v.name = `The ${pick(RESORT_A)} ${pick(RESORT_B)}`; v.glam = randInt(75, 98); if (hotels.length) v.owner = { firm: pick(hotels).id }; }
  else if (kind === 'track') { v.name = `${city} ${pick(['Downs', 'Park', 'Racecourse', 'Raceway'])}`; v.glam = randInt(40, 70); v.horses = []; for (let i = 0; i < 12; i++) v.horses.push(newHorse(s)); }
  else if (kind === 'backroom') { const f = pick(familiesIn(s, cc)); v.owner = { fam: f.id }; v.name = `the back room of ${pick(BACKROOMS)}`; v.glam = randInt(5, 20); }
  else if (kind === 'bookie') { const g = chance(0.7) ? 'm' : 'f'; v.owner = { first: randomFirst(cc, g), last: randomLast(cc), g, nick: pick(BOOKIE_NICKS) }; v.name = `${v.owner.first} ${v.owner.last}`; v.glam = 10; }
  (s.venues || (s.venues = {}))[v.id] = v;
  return v;
}
// The venues of a city, made the first time someone looks. A casino city has the most.
function venuesIn(s, cc, city) {
  const idx = s.venueIdx || (s.venueIdx = {}), key = cityKey(cc, city);
  if (!idx[key]) {
    const info = cityInfo(cc, city), size = info.size, casinoCity = info.traits.includes('casino');
    const n = (kind, count) => { const ids = []; for (let i = 0; i < count; i++) ids.push(newVenue(s, cc, city, kind).id); return ids; };
    const roll = (p) => (chance(p) ? 1 : 0);
    idx[key] = [].concat(
      n('bookie', 1),
      n('backroom', casinoCity ? 2 : size === 'small' ? roll(0.5) : 1),
      n('track', casinoCity ? 1 : size === 'metro' ? 1 : size === 'big' ? roll(0.6) : size === 'mid' ? roll(0.3) : roll(0.1)),
      n('casino', casinoCity ? 4 : size === 'metro' ? 2 : size === 'big' ? 1 : size === 'mid' ? roll(0.6) : roll(0.25)),
      n('resort', casinoCity ? 4 : size === 'metro' && (info.traits.includes('tourist') || info.traits.includes('party')) ? 1 : size === 'metro' ? roll(0.5) : 0),
    );
  }
  return idx[key].map((id) => s.venues[id]).filter((v) => v && v.open);
}
// The app is one venue for the whole family line.
function appVenue(s) {
  const all = s.venues || (s.venues = {});
  if (!all.app) all.app = { id: 'app', cc: null, city: null, kind: 'app', name: pick(['BetPocket', 'OddsOn', 'Wagerly', 'PlayLine']), open: true, since: s.year, glam: 30 };
  return all.app;
}
// Where you can gamble right now: your city, your trip city this year, and the app.
function tripKey(s) { const t = gamb(s).trip; return t && t.year === s.year ? t.key : null; }
function venuesReach(s) {
  if (!canGamble(s)) return [];
  const here = venuesIn(s, P(s).country, P(s).city);
  const tk = tripKey(s), trip = tk && tk !== cityKey(P(s).country, P(s).city) ? venuesIn(s, ...tk.split(':')) : [];
  return here.concat(trip, [appVenue(s)]);
}
function venueLabel(s, v) { return v.kind === 'bookie' ? `${v.owner.first} “${v.owner.nick}” ${v.owner.last}` : cap(v.name); }
function ownerText(s, v) {
  const o = v.owner;
  if (!o) return v.kind === 'app' ? 'An app' : 'Independent';
  if (o.fam) { const f = underworldOf(s).families[o.fam]; return f ? `Run by ${f.name}` : 'Run by the mob'; }
  if (o.firm) { const f = firmById(s, o.firm); return f ? `Owned by ${f.name}${f.ticker ? ` (${f.ticker})` : ''}` : 'Corporate'; }
  if (o.co) return company(s, o.co) ? 'Your casino' : 'Independent';
  return 'A bookie';
}
// The bookie becomes a person in your life the first time you bet with them.
function bookieOf(s, v) {
  const o = v.owner;
  if (o.pid && s.people[o.pid] && s.people[o.pid].alive && M(s).rels[o.pid]) return s.people[o.pid];
  const p = makePerson(s, { first: o.first, last: o.last, gender: o.g, age: randInt(38, 66), country: v.cc, city: v.city });
  o.pid = p.id;
  setRel(s, p.id, 'bookie', 50);
  return p;
}
function wagered(s, v, amt) {
  const st = vStand(s, v.id);
  st.wagered += amt;
  tally(s, 'gambled', amt);
  habit(s, 'gambling', randFloat(0.5, 2));
  let t = 0;
  for (let i = 0; i < TIERS.length; i++) if (st.wagered >= price(s, TIERS[i][1])) t = i;
  if (t > st.tier && ['casino', 'resort', 'track'].includes(v.kind)) {
    st.tier = t;
    log(s, `${t >= 4 ? '🐋' : '⭐'} ${cap(v.name)} made you a ${TIERS[t][0]} member.${t === 3 ? ' A comped suite is waiting.' : t === 4 ? ' You have a personal host now.' : ''}`, 'good');
    if (t >= 3) add(s, { happy: 4 });
    if (t >= 4) tally(s, 'whale');
  }
}
function betAmounts(s, v) {
  const K = VENUE_KINDS[v.kind], st = vStand(s, v.id);
  const lo = price(s, K.min), hi = price(s, K.max) * (st.tier >= 3 ? 4 : 1);
  return [10, 100, 1000, 10000, 100000, 1000000].map((b) => price(s, b)).filter((b) => b >= lo && b <= hi);
}
// Can you place this bet on credit? Bookies, back rooms and casinos extend it.
function creditLine(s, v) {
  const K = VENUE_KINDS[v.kind];
  if (!K.credit) return 0;
  if (K.credit === 'marker') return vStand(s, v.id).tier >= 2 || netWorth(s) >= price(s, 100000) ? Math.max(price(s, 10000), Math.round(netWorth(s) * 0.25)) : 0;
  return price(s, K.credit === 'mob' ? 50000 : 20000);
}
function owedTo(s, v) { return sum(gamb(s).debts.filter((d) => d.vid === v.id), (d) => d.amt); }
// Pay a stake: cash if you have it, else on credit (a debt to whoever runs the venue).
function stake(s, v, amt, credit) {
  if (!credit) return pay(s, amt);
  if (owedTo(s, v) + amt > creditLine(s, v)) return false;
  addDebt(s, v, amt);
  return true;
}
function addDebt(s, v, amt) {
  const g = gamb(s), K = VENUE_KINDS[v.kind];
  const kind = K.credit === 'marker' ? 'marker' : K.credit === 'mob' ? 'mob' : 'bookie';
  let d = g.debts.find((x) => x.vid === v.id);
  if (!d) {
    const who = kind === 'bookie' ? bookieOf(s, v) : null;
    d = { id: uid(s, 'gd'), kind, vid: v.id, who: venueLabel(s, v), pid: who ? who.id : null, amt: 0, rate: kind === 'marker' ? 0 : kind === 'mob' ? 0.5 : 0.3, since: s.year, stage: 0, paid: s.year };
    g.debts.push(d);
  }
  d.amt += Math.round(amt);
  if (gambDebt(s) >= price(s, 100000)) tally(s, 'deepDebt');
}
function gambDebt(s) { return sum(gamb(s).debts, (d) => d.amt); }
// Lost after a big swing, with the habit's hooks in you: one more?
function chaseOffer(s, v, game, amt) {
  if ((M(s).addictions.gambling || 0) < 40 || !chance(0.35) || M(s).money < amt) return;
  popup(s, { emoji: '😬', title: 'Win it back?', text: `You could win back that ${fmtMoney(amt)} right now. One more.`, handler: 'gChase', ctx: { v: v.id, game, amt }, choices: [{ label: 'One more', value: true, tone: 'bad' }, { label: 'Walk away', value: false }] });
}
// The table games in 21-activities.js call this when you lose.
function tableLoss(s, game, amt, vid) { const v = vid && vById(s, vid); if (v) chaseOffer(s, v, game, amt); }
onChoice('gChase', (s, ctx, yes) => {
  if (!yes) { habit(s, 'gambling', -1); add(s, { happy: -2 }); return { text: 'You walked out into the night air. It took everything you had.', quiet: true }; }
  tally(s, 'chased');
  return playGame(s, vById(s, ctx.v), ctx.game, ctx.amt, false);
});

/* ---- visiting a venue -------------------------------------------------------------- */
function visitVenue(s, v) {
  if (!v || !v.open) return;
  if (v.owner && v.owner.co && company(s, v.owner.co)) return ownVenueVisit(s, v); // 54-house.js
  if (excluded(s) && v.kind !== 'bookie' && v.kind !== 'backroom') return { text: `Your name is on the self-exclusion list until ${gamb(s).excluded}. The door staff wished you well.`, nolog: true };
  const st = vStand(s, v.id);
  if (st.banned > s.year) return { text: `You're banned from ${v.name} until ${st.banned}.`, nolog: true };
  st.visits++;
  placeVisit(s, 'gamb:' + v.id, { kind: 'gamb', name: v.name, emoji: VENUE_KINDS[v.kind].emoji }); // a place with regulars (81-web2.js)
  const K = VENUE_KINDS[v.kind], owed = owedTo(s, v);
  const games = K.games.filter((g) => g !== 'count' || (P(s).stats.smarts >= 65 && skill(s, 'cards') >= 25));
  popup(s, {
    emoji: K.emoji, title: venueLabel(s, v), handler: 'gVenue', ctx: { v: v.id },
    text: `${K.desc} ${ownerText(s, v)}.${['casino', 'resort', 'track'].includes(v.kind) ? ` You're a ${tierName(s, v.id)} here.` : ''}${owed ? ` You owe ${fmtMoney(owed)} here.` : ''}`,
    choices: games.map((g) => ({ label: `${GAMES[g].emoji} ${GAMES[g].name}`, value: g })).concat(owed ? [{ label: '💵 Pay what you owe', value: 'pay', sub: fmtMoney(owed), disabled: M(s).money <= 0 }] : []).concat([{ label: 'Leave', value: null }]),
  });
}
onChoice('gVenue', (s, ctx, g) => {
  const v = vById(s, ctx.v);
  if (!g || !v || !canGamble(s)) return;
  if (g === 'pay') return payDebt(s, gamb(s).debts.find((d) => d.vid === v.id), M(s).money);
  if (g === 'horses') return raceCard(s, v);
  if (g === 'sports') return sportsBoard(s, v);
  if (g === 'fight') return fightCard(s, v);
  if (g === 'poker') return pokerMenu(s, v);
  const amts = betAmounts(s, v), line = creditLine(s, v) - owedTo(s, v);
  popup(s, {
    emoji: GAMES[g].emoji, title: GAMES[g].name, text: `Cash: ${fmtMoney(M(s).money)}.${line > 0 ? ` Credit left: ${fmtMoney(line)}.` : ''}`, handler: 'gStake', ctx: { v: v.id, g },
    choices: amts.map((b) => ({ label: `Bet ${fmtMoney(b)}`, value: b, disabled: M(s).money < b && line < b, sub: M(s).money < b && line >= b ? 'on credit' : '' })).concat([{ label: 'Leave', value: 0 }]),
  });
});
onChoice('gStake', (s, ctx, amt) => {
  const v = vById(s, ctx.v);
  if (!amt || !v) return;
  return playGame(s, v, ctx.g, amt, M(s).money < amt);
});
// One bet at a table. Wins pay out right away; losses may tempt a chase.
function playGame(s, v, g, amt, credit) {
  if (!v || bump(s, 'gamble') > 20) return { text: 'Security suggests you call it a night.', nolog: true };
  if (!stake(s, v, amt, credit)) return cantAfford(amt);
  wagered(s, v, amt);
  const lose = (text) => { add(s, { happy: -2 }); chaseOffer(s, v, g, amt); return { text: `${text} You lost ${fmtMoney(amt)}.`, tone: 'bad', emoji: GAMES[g].emoji, title: GAMES[g].name }; };
  const win = (mult, text) => { const got = Math.round(amt * mult); M(s).money += got; tally(s, 'gambleWins', got - amt); add(s, { happy: mult >= 5 ? 10 : 4 }); return { text: `${text} You won ${fmtMoney(got - amt)}!`, tone: 'good', emoji: GAMES[g].emoji, title: GAMES[g].name }; };
  if (g === 'bj') {
    const st = { bet: amt, me: [drawCard(), drawCard()], dealer: [drawCard(), drawCard()], v: v.id };
    if (handValue(st.me) === 21) return bjSettle(s, st, 'natural');
    bjPrompt(s, st);
    return;
  }
  if (g === 'roulette') {
    popup(s, { emoji: '🎡', title: 'Roulette', text: `${fmtMoney(amt)} in chips. Where do they go?`, handler: 'roulette', ctx: { bet: amt, v: v.id },
      choices: [{ label: '🔴 Red', value: 'red' }, { label: '⚫ Black', value: 'black' }, { label: 'Odd', value: 'odd' }, { label: 'Even', value: 'even' }, { label: '🍀 Single number: 7', value: 'seven' }] });
    return;
  }
  if (g === 'slots') return spinSlots(s, amt, v.id);
  if (g === 'baccarat') {
    popup(s, { emoji: '💎', title: 'Baccarat', text: `${fmtMoney(amt)} on the table. Player, banker or tie?`, handler: 'gBaccarat', ctx: { v: v.id, amt }, choices: [{ label: 'Banker', value: 'banker' }, { label: 'Player', value: 'player' }, { label: 'Tie (pays 8 to 1)', value: 'tie' }] });
    return;
  }
  if (g === 'dice') {
    if (chance(0.493 + (trait(s, 'lucky') ? 0.02 : 0))) {
      const r = win(2, `You hit your point ${pick(['twice in a row', 'on the last roll', 'with the whole room shouting'])}.`);
      if (v.owner && v.owner.fam && amt >= price(s, 5000) && chance(0.15)) { r.text += ' Two men asked to check your dice. They let you go, eventually.'; add(s, { happy: -4 }); }
      return r;
    }
    return lose('Snake eyes.');
  }
  if (g === 'count') {
    const st = vStand(s, v.id);
    st.heat += randInt(15, 30) - (myPowers(s).includes('shapeshift') ? 10 : 0);
    addSkill(s, 'cards', randFloat(1, 3));
    if (st.heat >= 60) {
      st.heat = 0;
      const until = s.year + randInt(5, 15);
      const chain = v.owner && v.owner.firm ? Object.values(s.venues).filter((x) => x.owner && x.owner.firm === v.owner.firm) : [v];
      for (const x of chain) vStand(s, x.id).banned = until;
      tally(s, 'backedOff');
      M(s).money += amt;
      return { text: `Two men in suits tapped your shoulder: "You're welcome to play any other game." You're banned from ${chain.length > 1 ? `every casino ${firmById(s, v.owner.firm).name} owns` : v.name} until ${until}.`, tone: 'bad', emoji: '🧮', title: 'Backed off' };
    }
    if (chance(0.56 + skill(s, 'cards') / 600)) return win(randFloat(2, 2.6), 'The count ran hot and you bet big at exactly the right moments.');
    return lose('The shoe ran cold.');
  }
}
onChoice('gBaccarat', (s, ctx, on) => {
  const r = rand(), res = r < 0.4586 ? 'banker' : r < 0.9048 ? 'player' : 'tie', v = vById(s, ctx.v);
  const word = { banker: 'The banker won', player: 'The player hand won', tie: 'It was a tie' }[res];
  if (res === 'tie' && on !== 'tie') { M(s).money += ctx.amt; return { text: `${word}. Your bet came back.`, emoji: '💎', title: 'Baccarat' }; }
  if (on !== res) { add(s, { happy: -2 }); if (v) chaseOffer(s, v, 'baccarat', ctx.amt); return { text: `${word}. You lost ${fmtMoney(ctx.amt)}.`, tone: 'bad', emoji: '💎', title: 'Baccarat' }; }
  const mult = on === 'tie' ? 9 : on === 'banker' ? 1.95 : 2, got = Math.round(ctx.amt * mult);
  M(s).money += got;
  tally(s, 'gambleWins', got - ctx.amt);
  add(s, { happy: on === 'tie' ? 10 : 4 });
  return { text: `${word}. You won ${fmtMoney(got - ctx.amt)}.`, tone: 'good', emoji: '💎', title: 'Baccarat' };
});

/* ---- horse racing ---------------------------------------------------------------- */
function newHorse(s) {
  const spd = randInt(55, 92), sta = randInt(45, 95), age = randInt(2, 5), starts = (age - 2) * randInt(3, 7);
  return { id: uid(s, 'h'), name: `${pick(HORSE_A)} ${pick(HORSE_B)}`, spd, sta, form: randInt(-5, 5), wins: Math.round(starts * clamp((spd - 55) / 110 + gauss(0, 0.05), 0, 0.5)), starts, born: s.year - age };
}
// A race's field and the odds the track posts (with the track's 15% take).
function raceField(s, v) { return raceOdds(v.horses.slice().sort(() => rand() - 0.5).slice(0, 8)); }
// Odds for any field of horses (the big races in 54-house.js bring their own).
function raceOdds(pool) {
  const ex = pool.map((h) => Math.exp(racePower(h) / 6)), tot = sum(ex);
  return pool.map((h, i) => {
    const p = ex[i] / tot, dec = clamp((1 / p) * 0.85, 1.2, 101);
    return { hid: h.id, name: h.name, no: i + 1, color: SILKS[i], p, dec: Math.round(dec * 10) / 10 };
  });
}
// A horse's strength on the day: the odds and the result both come from it.
function racePower(h) { return h.spd * 0.62 + h.sta * 0.28 + h.form * 1.2; }
// Fractional odds the way a tote board shows them: 1/3, 5/2, 11/2, 16/1, 33/1.
function oddsText(dec) {
  const x = dec - 1;
  if (x < 1) return `1/${Math.max(2, Math.round(1 / x))}`;
  if (x >= 10) return `${Math.round(x)}/1`;
  const n = Math.round(x * 2) / 2;
  return Number.isInteger(n) ? `${n}/1` : `${n * 2}/2`;
}
// The race itself. The finishing order is drawn from the same strengths the odds are,
// so the odds are fair (a 20/1 shot wins about one race in twenty-one, less the take).
// The frames, each horse's position step by step for the race screen, then show how it
// got there: front-runners (more speed than stamina) go early, stayers come late, and
// anyone can surge. pool is where the field's horses are looked up (the track's own,
// unless given).
function runRace(s, v, field, pool) {
  const horses = field.map((f) => (pool || v.horses).find((h) => h.id === f.hid));
  const order = [], left = horses.map((h, i) => i);
  while (left.length) { const i = weighted(left, (k) => Math.exp(racePower(horses[k]) / 6)); order.push(i); left.splice(left.indexOf(i), 1); }
  const done = [];
  let t = randFloat(44, 50);
  order.forEach((i, k) => { if (k) t += k === 1 ? Math.abs(gauss(0, 1.2)) + 0.05 : clamp(gauss(1.2, 0.8), 0.1, 4); done[i] = t; });
  // Each horse's path: 20 knots of a curve, bent by its running style, with surges.
  const K = 20, paths = horses.map((h) => {
    const a = clamp(1 - (h.spd - h.sta) / 130 + gauss(0, 0.1), 0.72, 1.35), cum = [0];
    let tot = 0;
    for (let k = 1; k <= K; k++) { tot += Math.max(0.01, (Math.pow(k / K, a) - Math.pow((k - 1) / K, a)) * (1 + gauss(0, 0.25) + (chance(0.06) ? randFloat(0.4, 1) : 0))); cum.push(tot); }
    return cum.map((x) => x / tot);
  });
  const frames = [];
  for (let f = 0, N = Math.ceil(Math.max(...done)); f <= N; f++) {
    frames.push(horses.map((h, i) => {
      const x = Math.min(1, f / done[i]) * K, k = Math.floor(x), y = k >= K ? 1 : paths[i][k] + (paths[i][k + 1] - paths[i][k]) * (x - k);
      return Math.round(y * 1000) / 10;
    }));
  }
  const margin = done[order[1]] - done[order[0]];
  order.forEach((i, place) => { const h = horses[i]; h.starts++; if (place === 0) { h.wins++; h.form = clamp(h.form + 2, -10, 10); } else if (place > 4) h.form = clamp(h.form - 1, -10, 10); });
  return { frames, order, margin };
}
function raceCard(s, v) {
  const track = v.kind === 'track' ? v : nationalTrack(s, v);
  if (!track) return { text: 'There’s no racing anywhere near here.', nolog: true };
  if (count(s, 'race') >= 4) return { text: 'That’s the last race on the card this year.', nolog: true };
  const field = raceField(s, track);
  popup(s, {
    emoji: '🏇', title: `Race ${count(s, 'race') + 1} at ${track.name}`, text: `${v.kind === 'track' ? 'Pick a horse.' : `You're betting through ${venueLabel(s, v)}.`} Win pays the odds; place (top two) and show (top three) pay less but come in more often.`, handler: 'gHorse', ctx: { v: v.id, t: track.id, field },
    choices: field.map((f) => ({ label: `${f.no}. ${f.name}`, value: f.hid, sub: `${oddsText(f.dec)}${track.horses.find((h) => h.id === f.hid).wins ? ` · ${nOf(track.horses.find((h) => h.id === f.hid).wins, 'win')}` : ''}` })).concat([{ label: 'Skip this race', value: null }]),
  });
}
// Bookies and the app take bets on the country's biggest track.
function nationalTrack(s, v) {
  const cc = v.cc || P(s).country, cities = COUNTRIES[cc].cities;
  for (const c of cities) { const t = venuesIn(s, cc, c).find((x) => x.kind === 'track'); if (t) return t; }
  return null;
}
onChoice('gHorse', (s, ctx, hid) => {
  if (!hid) return;
  const f = ctx.field.find((x) => x.hid === hid), v = vById(s, ctx.v);
  if (!f || !v) return;
  const amts = betAmounts(s, v), line = creditLine(s, v) - owedTo(s, v);
  popup(s, {
    emoji: '🏇', title: f.name, text: `${oddsText(f.dec)}. How much, and how?`, handler: 'gHorseBet', ctx: Object.assign({}, ctx, { hid }),
    choices: ['win', 'place', 'show'].flatMap((type) => amts.slice(0, 4).map((b) => ({ label: `${fmtMoney(b)} to ${type}`, value: `${type}:${b}`, disabled: M(s).money < b && line < b, sub: M(s).money < b && line >= b ? 'on credit' : '' }))).concat([{ label: 'Never mind', value: null }]),
  });
});
onChoice('gHorseBet', (s, ctx, val) => {
  if (!val) return;
  const [type, n] = val.split(':'), amt = Number(n), v = vById(s, ctx.v), track = vById(s, ctx.t);
  if (!v || !track || !(amt > 0)) return;
  if (gamb(s).race) settleRaceQuietly(s);
  if (!stake(s, v, amt, M(s).money < amt)) return cantAfford(amt);
  bump(s, 'race');
  wagered(s, v, amt);
  const field = ctx.field, mine = field.findIndex((x) => x.hid === ctx.hid), r = runRace(s, track, field);
  const place = r.order.indexOf(mine), f = field[mine];
  const hit = type === 'win' ? place === 0 : type === 'place' ? place <= 1 : place <= 2;
  const mult = hit ? (type === 'win' ? f.dec : type === 'place' ? 1 + (f.dec - 1) / 2.8 : 1 + (f.dec - 1) / 4.5) : 0;
  gamb(s).race = { track: track.name, field: field.map((x) => ({ name: x.name, no: x.no, color: x.color, odds: oddsText(x.dec) })), frames: r.frames, order: r.order, mine, type, amt, payout: Math.round(amt * mult), margin: r.margin, long: type === 'win' && hit && f.dec >= 21, shown: false };
  return { text: `They’re in the gate at ${track.name}...`, quiet: true };
});
// A race nobody watched (you went on to something else): pay it and note it in the log.
function settleRaceQuietly(s) {
  const r = settleRace(s);
  if (r) log(s, `🏇 ${r.text}`, r.tone);
}
// Pays out a finished race (the race screen calls this at the finish line).
function settleRace(s) {
  const g = M(s).gamb, r = g && g.race;
  if (!r) return;
  g.race = null;
  const names = r.order.slice(0, 3).map((i) => `${r.field[i].name} (${r.field[i].odds})`);
  const head = `${names[0]} won${r.margin < 0.25 ? ' by a nose' : r.margin > 3 ? ' by a mile' : ''}, then ${names[1]} and ${names[2]}.`;
  if (r.own) return settleOwnRace(s, r, head); // your own horse in a big race (54-house.js)
  const mine = r.field[r.mine].name;
  if (r.payout > 0) {
    add(s, { money: r.payout, happy: r.long ? 12 : 5 });
    tally(s, 'gambleWins', r.payout - r.amt);
    if (r.long) tally(s, 'longShots');
    if (r.order[0] === r.mine && r.margin < 0.25) tally(s, 'photoFinish');
    return { text: `${head} Your ${r.type} bet on ${mine} paid ${fmtMoney(r.payout)}.`, tone: 'good', emoji: '🏇', title: r.track };
  }
  add(s, { happy: -2 });
  return { text: `${head} ${mine} came in ${ordinal(r.order.indexOf(r.mine) + 1)}. You lost ${fmtMoney(r.amt)}.`, tone: 'bad', emoji: '🏇', title: r.track };
}

/* ---- season bets and fight nights ----------------------------------------------------- */
function sportsBoard(s, v) {
  popup(s, {
    emoji: '🏆', title: 'Bet on a season', text: 'Pick a league. Bets pay when this season’s champion is crowned.', handler: 'gSport', ctx: { v: v.id },
    choices: SPORT_IDS.map((k) => ({ label: `${SPORTS[k].emoji} ${SPORTS[k].league}`, value: k })).concat([{ label: 'Never mind', value: null }]),
  });
}
function teamOdds(s, sport) {
  const lg = leagueOf(s, sport), ex = lg.teams.map((t) => Math.pow(Math.max(5, t.rating), 4)), tot = sum(ex);
  return lg.teams.map((t, i) => ({ name: t.name, dec: Math.round(Math.max(1.5, (tot / ex[i]) * 0.8) * 10) / 10 })).sort((a, b) => a.dec - b.dec);
}
onChoice('gSport', (s, ctx, sport) => {
  if (!sport || !SPORTS[sport]) return;
  popup(s, {
    emoji: SPORTS[sport].emoji, title: SPORTS[sport].league, text: 'Who takes the title this season?', handler: 'gSportTeam', ctx: Object.assign({}, ctx, { sport }),
    choices: teamOdds(s, sport).map((t) => ({ label: t.name, value: t.name, sub: oddsText(t.dec) })).concat([{ label: 'Never mind', value: null }]),
  });
});
onChoice('gSportTeam', (s, ctx, team) => {
  const v = vById(s, ctx.v);
  if (!team || !v) return;
  const t = teamOdds(s, ctx.sport).find((x) => x.name === team), amts = betAmounts(s, v), line = creditLine(s, v) - owedTo(s, v);
  popup(s, {
    emoji: '🏆', title: team, text: `${oddsText(t.dec)} to win it all.`, handler: 'gSportBet', ctx: Object.assign({}, ctx, { team, dec: t.dec }),
    choices: amts.map((b) => ({ label: `Bet ${fmtMoney(b)}`, value: b, disabled: M(s).money < b && line < b, sub: M(s).money < b && line >= b ? 'on credit' : `pays ${fmtMoney(Math.round(b * t.dec))}` })).concat([{ label: 'Never mind', value: 0 }]),
  });
});
onChoice('gSportBet', (s, ctx, amt) => {
  const v = vById(s, ctx.v);
  if (!amt || !v) return;
  if (gamb(s).bets.length >= 6) return { text: 'You already have six bets riding. Let them play out.', nolog: true };
  if (!stake(s, v, amt, M(s).money < amt)) return cantAfford(amt);
  wagered(s, v, amt);
  gamb(s).bets.push({ sport: ctx.sport, team: ctx.team, dec: ctx.dec, amt, year: s.year, via: venueLabel(s, v) });
  const mine = M(s).sp && M(s).sp.team === ctx.team;
  if (mine) tally(s, 'betOnSelf');
  return { text: `${fmtMoney(amt)} on the ${ctx.team} at ${oddsText(ctx.dec)}.${mine ? ' Betting on your own team is legal here. Mostly.' : ''}`, emoji: '🏆' };
});
function fightCard(s, v) {
  if (count(s, 'fight') >= 2) return { text: 'No more big fights this year.', nolog: true };
  const cc = v.cc || P(s).country, a = `${randomFirst(cc, 'm')} ${randomLast(cc)}`, b = `${randomFirst(cc, chance(0.3) ? 'f' : 'm')} ${randomLast(cc)}`;
  const pa = randFloat(0.3, 0.75), da = Math.round(Math.max(1.15, 0.92 / pa) * 10) / 10, db = Math.round(Math.max(1.15, 0.92 / (1 - pa)) * 10) / 10;
  popup(s, {
    emoji: '🥊', title: 'Fight night', text: `${a} (${oddsText(da)}) vs. ${b} (${oddsText(db)}).`, handler: 'gFight', ctx: { v: v.id, a, b, pa, da, db },
    choices: [{ label: `Bet on ${a}`, value: 'a' }, { label: `Bet on ${b}`, value: 'b' }, { label: 'Never mind', value: null }],
  });
}
onChoice('gFight', (s, ctx, side) => {
  const v = vById(s, ctx.v);
  if (!side || !v) return;
  const amt = betAmounts(s, v)[Math.min(2, betAmounts(s, v).length - 1)];
  if (!amt || !stake(s, v, amt, M(s).money < amt)) return cantAfford(amt || 0);
  bump(s, 'fight');
  wagered(s, v, amt);
  const aWins = chance(ctx.pa), won = (side === 'a') === aWins, winner = aWins ? ctx.a : ctx.b;
  const how = pick(['by knockout in the first round', 'on a split decision', 'by submission in the third', 'by TKO after a wild fifth round']);
  if (!won) { add(s, { happy: -2 }); return { text: `${winner} won ${how}. Your ${fmtMoney(amt)} went with them.`, tone: 'bad', emoji: '🥊' }; }
  const got = Math.round(amt * (side === 'a' ? ctx.da : ctx.db));
  M(s).money += got;
  tally(s, 'gambleWins', got - amt);
  return { text: `${winner} won ${how}. You collected ${fmtMoney(got)}.`, tone: 'good', emoji: '🥊' };
});

/* ---- poker -------------------------------------------------------------------------- */
const POKER_EVENTS = [
  { id: 'bar', name: 'Bar tournament', buyin: 100, field: 30, kinds: ['backroom', 'casino'] },
  { id: 'weekly', name: 'Casino weekly', buyin: 1000, field: 80, kinds: ['casino', 'resort'] },
  { id: 'cash', name: 'High-stakes cash game', buyin: 20000, field: 0, kinds: ['backroom', 'resort'] },
  { id: 'highroller', name: 'High roller', buyin: 25000, field: 40, kinds: ['resort'] },
  { id: 'main', name: 'The Grand Felt Championship', buyin: 10000, field: 6000, kinds: ['resort'], casinoCity: true },
];
function pokerRating(s) { return clamp(skill(s, 'cards') * 0.6 + P(s).stats.smarts * 0.2 + skill(s, 'charisma') * 0.2 + (myPowers(s).includes('telepathy') ? 25 : 0), 0, 100); }
function pokerMenu(s, v) {
  const casinoCity = cityInfo(v.cc, v.city).traits.includes('casino');
  const evs = POKER_EVENTS.filter((e) => e.kinds.includes(v.kind) && (!e.casinoCity || casinoCity));
  popup(s, {
    emoji: '♠️', title: 'Poker', text: `Your game: ${pokerRating(s) >= 70 ? 'a shark' : pokerRating(s) >= 45 ? 'solid' : pokerRating(s) >= 25 ? 'a regular' : 'the fish at the table'}.`, handler: 'gPoker', ctx: { v: v.id },
    choices: evs.map((e) => ({ label: e.name, value: e.id, sub: `${e.field ? 'Buy-in' : 'Bring'} ${fmtMoney(price(s, e.buyin))}${e.field ? ` · ${fmtNum(e.field)} players` : ''}`, disabled: M(s).money < price(s, e.buyin) || (e.id === 'main' && count(s, 'pokerMain') > 0) })).concat([{ label: 'Never mind', value: null }]),
  });
}
function pokerRival(s) {
  const g = gamb(s);
  g.poker.rivals = g.poker.rivals.filter((id) => s.people[id] && s.people[id].alive && M(s).rels[id]);
  if (g.poker.rivals.length < 2 && chance(0.5)) { const p = makeAdultNear(s, { minAge: 22, maxAge: 60 }); p.pokerPro = true; setRel(s, p.id, 'rival', 40); g.poker.rivals.push(p.id); return p; }
  return g.poker.rivals.length ? s.people[pick(g.poker.rivals)] : null;
}
onChoice('gPoker', (s, ctx, id) => {
  const v = vById(s, ctx.v), e = POKER_EVENTS.find((x) => x.id === id);
  if (!v || !e) return;
  const cost = price(s, e.buyin);
  if (!pay(s, cost)) return cantAfford(cost);
  if (e.id === 'main') bump(s, 'pokerMain');
  if (bump(s, 'poker') > 6) { M(s).money += cost; return { text: 'You’ve played enough poker this year. Your back hurts.', nolog: true }; }
  wagered(s, v, cost);
  addSkill(s, 'cards', randFloat(2, 4));
  const g = gamb(s), r = pokerRating(s), rival = pokerRival(s);
  const vs = rival ? ` ${rival.first} ${rival.last}${rival.pokerPro ? ', your rival,' : ''} was at your table.` : '';
  if (!e.field) {
    // A cash game: you win or lose a chunk of what you brought.
    const swing = gauss((r - 45) / 120, 0.6), back = Math.max(0, Math.round(cost * (1 + swing)));
    M(s).money += back;
    if (back > cost) tally(s, 'gambleWins', back - cost);
    return { text: `${back >= cost ? `You walked away with ${fmtMoney(back)}.` : `You left with ${fmtMoney(back)}.`}${vs}`, tone: back >= cost ? 'good' : 'bad', emoji: '♠️' };
  }
  const pool = cost * e.field * 0.9;
  const cashP = clamp(0.06 + r / 450, 0.05, 0.38), ftP = clamp(0.1 + r / 350, 0.1, 0.4), winP = clamp(0.08 + r / 600, 0.08, 0.25) * (e.field > 1000 ? 0.4 : 1);
  if (!chance(cashP)) { add(s, { happy: -2 }); return { text: `You busted ${pick(['on a bad beat', 'with pocket kings into aces', 'bluffing into the nuts', 'an hour in'])}.${vs}`, tone: 'bad', emoji: '♠️' }; }
  g.poker.cashes++;
  if (!chance(ftP)) { const got = Math.round(cost * randFloat(1.5, 4)); M(s).money += got; return { text: `You cashed for ${fmtMoney(got)}.${vs}`, tone: 'good', emoji: '♠️' }; }
  if (e.id === 'main') { tally(s, 'finalTable'); M(s).fame = clamp100(M(s).fame + 12); }
  if (chance(winP)) {
    const got = Math.round(pool * (e.id === 'main' ? 0.15 : 0.28));
    M(s).money += got;
    g.poker.wins++;
    tally(s, 'gambleWins', got - cost);
    if (e.id === 'main') { tally(s, 'feltChampion'); M(s).fame = clamp100(M(s).fame + 20); }
    if (rival) addRel(s, rival.id, -8);
    return { text: `You won the ${e.name}! ${fmtMoney(got)}${e.id === 'main' ? ', a gold bracelet and your face on every poker site' : ''}.${rival ? ` You knocked out ${rival.first} on the way.` : ''}`, tone: 'good', emoji: '🏆' };
  }
  const got = Math.round(pool * randFloat(0.02, 0.09));
  M(s).money += got;
  return { text: `You made the final table${e.id === 'main' ? ' on live TV' : ''} and finished ${ordinal(randInt(2, 9))} for ${fmtMoney(got)}.${vs}`, tone: 'good', emoji: '♠️' };
});

/* ---- debts and the people who collect them --------------------------------------------- */
function payDebt(s, d, amt) {
  if (!d) return;
  amt = Math.min(Math.round(amt), d.amt, Math.max(0, M(s).money));
  if (amt <= 0) return cantAfford(d.amt);
  M(s).money -= amt;
  d.amt -= amt;
  d.paid = s.year;
  if (d.amt <= 0) { gamb(s).debts = gamb(s).debts.filter((x) => x !== d); return { text: `You paid ${d.who} in full. ${pick(['They seemed almost disappointed.', 'A handshake, and you never want to see them again.', 'They said "pleasure doing business."'])}`, tone: 'good', emoji: '💵' }; }
  d.stage = Math.max(0, d.stage - 1);
  return { text: `You paid ${d.who} ${fmtMoney(amt)}. You still owe ${fmtMoney(d.amt)}.`, emoji: '💵' };
}
defAction({
  id: 'g_debts', cat: 'gamble', label: 'Pay off a gambling debt', emoji: '💵',
  when: (s) => free(s) && gamb(s).debts.length > 0,
  sub: (s) => `You owe ${fmtMoney(gambDebt(s))}`,
  run: (s) => {
    popup(s, { emoji: '💵', title: 'What you owe', handler: 'gPayPick', choices: gamb(s).debts.map((d) => ({ label: d.who, value: d.id, sub: `${fmtMoney(d.amt)}${d.rate ? ` · ${Math.round(d.rate * 100)}% a year` : ' · a casino marker'}` })).concat([{ label: 'Never mind', value: null }]) });
  },
});
onChoice('gPayPick', (s, ctx, id) => {
  const d = id && gamb(s).debts.find((x) => x.id === id);
  if (!d) return;
  popup(s, { emoji: '💵', title: d.who, text: `You owe ${fmtMoney(d.amt)}.`, handler: 'gPay', ctx: { id },
    choices: [{ label: 'Pay it all', value: 1, disabled: M(s).money < d.amt }, { label: 'Pay half', value: 0.5, disabled: M(s).money < d.amt / 2 }, { label: 'Ask for more time', value: 'time' }, { label: 'Never mind', value: null }] });
});
onChoice('gPay', (s, ctx, v) => {
  const d = gamb(s).debts.find((x) => x.id === ctx.id);
  if (!d || !v) return;
  if (v === 'time') {
    if (count(s, 'gTime_' + d.id)) return { text: 'You already asked this year.', nolog: true };
    bump(s, 'gTime_' + d.id);
    if (chance(0.3 + skill(s, 'charisma') / 250 - d.stage * 0.08)) { d.paid = s.year; d.amt = Math.round(d.amt * 1.1); return `${d.who} gave you another year, and added 10% for the trouble.`; }
    return { text: `${d.who} said no. Then said it again, slower.`, tone: 'bad' };
  }
  return payDebt(s, d, d.amt * v);
});
// The yearly turn of the screw. Stage 1 a reminder, 2 a visit, 3 a beating, 4 a favor.
function debtYear(s, d, budget) {
  d.amt = Math.round(d.amt * (1 + d.rate));
  if (d.paid >= s.year - 1 && d.stage === 0) { d.stage = 0; return; }
  if (d.kind === 'marker') {
    if (s.year - d.since >= 1 && budget.n-- > 0) {
      gamb(s).debts = gamb(s).debts.filter((x) => x !== d);
      const v = vById(s, d.vid), f = v && v.owner && v.owner.firm && firmById(s, v.owner.firm);
      getSued(s, 'debt', f ? firmParty(s, f) : { vs: v ? v.name : d.who, cap: d.who, their: 12 }, { claim: d.amt, why: 'over an unpaid casino marker' });
    }
    return;
  }
  d.stage = Math.min(4, d.stage + 1);
  if (budget.n-- <= 0) return;
  if (d.stage === 1) { log(s, `📞 ${d.who} called "just to check in" about the ${fmtMoney(d.amt)} you owe.`, 'bad'); return; }
  if (d.stage === 2) {
    popup(s, { emoji: '🚪', title: 'A visit', tone: 'bad', handler: 'gCollect', ctx: { id: d.id },
      text: `${pick(['Two men', 'A very large man', 'A polite woman with very cold eyes'])} from ${d.who} ${pick(['waited by your car', 'showed up at your work', 'sat down next to you at lunch'])}. You owe ${fmtMoney(d.amt)}.`,
      choices: [{ label: 'Pay what you can', value: 'pay', disabled: M(s).money <= 0 }, { label: 'Promise to pay next year', value: 'promise' }, { label: 'Skip town', value: 'run' }] });
    return;
  }
  if (d.stage === 3) { announce(s, { emoji: '🏥', title: 'They came back', tone: 'bad', text: beating(s, d) }); return; }
  popup(s, { emoji: '🕴️', title: 'A favor instead', tone: 'bad', handler: 'gFavor', ctx: { id: d.id },
    text: `${d.who} has an offer: forget the ${fmtMoney(d.amt)} you owe, in exchange for a favor.`,
    choices: [
      { label: 'Drive a package across town', value: 'drive' },
      { label: 'Throw your next game', value: 'throw', disabled: !(M(s).career && JOBS[M(s).career.id].special === 'sports') },
      { label: 'Run their money through your company', value: 'launder', disabled: !companies(s).some((c) => !c.closed) },
      { label: 'Refuse', value: 'refuse', tone: 'bad' },
    ] });
}
// Beatings break bones. They aren't meant to kill, and almost never do.
function beating(s, d) {
  tally(s, 'beatings');
  const r = rand();
  if (r < 0.03) { die(s, 'after a beating over a gambling debt'); return `${d.who}'s people went too far.`; }
  if (r < 0.18) { add(s, { health: -30 }); M(s).money -= price(s, 8000); return `${d.who}'s people put you in the hospital for two weeks. The bill came to ${fmtMoney(price(s, 8000))}.`; }
  getSick(s, pick(['broken_arm', 'broken_leg']), { known: true });
  add(s, { health: -randInt(8, 15), happy: -8 });
  return `${d.who}'s people broke your ${pick(['arm', 'leg', 'kneecap', 'wrist'])} in a parking garage. "Next time, pay."`;
}
onChoice('gCollect', (s, ctx, v) => {
  const d = gamb(s).debts.find((x) => x.id === ctx.id);
  if (!d) return;
  if (v === 'pay') return payDebt(s, d, M(s).money);
  if (v === 'promise') { if (chance(0.5)) { d.stage = 1; return `${d.who} gave you one more year. "One."`; } return { text: beating(s, d), tone: 'bad' }; }
  const to = pick(country(s).cities.filter((c) => c !== P(s).city)) || P(s).city;
  fleeTo(s, to);
  if (d.kind === 'mob' || chance(0.5)) return { text: `You fled to ${to}. ${d.who} has friends there too.`, tone: 'bad' };
  gamb(s).debts = gamb(s).debts.filter((x) => x !== d);
  return `You fled to ${to}, and ${d.who} lost your trail.`;
});
onChoice('gFavor', (s, ctx, v) => {
  const d = gamb(s).debts.find((x) => x.id === ctx.id);
  if (!d) return;
  const clear = () => { gamb(s).debts = gamb(s).debts.filter((x) => x !== d); };
  if (v === 'drive') {
    clear();
    add(s, { karma: -5 });
    if (chance(0.2)) return arrest(s, 'trafficking');
    return 'You drove it. You didn’t look inside. Your debt is gone.';
  }
  if (v === 'throw') {
    clear();
    add(s, { karma: -8 });
    tally(s, 'threwGame');
    if (chance(0.25)) { M(s).fame = clamp100(M(s).fame - 20); leaveJob(s, 'fired'); return { text: 'You threw the game. The league found the betting pattern within a month. You’re banned for life.', tone: 'bad' }; }
    return 'You missed the shot that mattered, on purpose. Nobody noticed. You noticed.';
  }
  if (v === 'launder') {
    clear();
    add(s, { karma: -6 });
    if (M(s).uw) addHeat(s, 15);
    return 'Their money went through your books for a year. Your accountant stopped asking questions.';
  }
  if (tagsOn(['mature']) && chance(0.5)) {
    const kin = pick(relPeople(s, ['sibling', 'parent', 'child', 'spouse']).filter((p) => ageOf(s, p) >= 18));
    if (kin) { kin.stats.health = clamp100(kin.stats.health - 30); addRel(s, kin.id, -20); d.stage = 3; return { text: `You refused. A week later, ${kin.first} was jumped outside their home. The message was for you.`, tone: 'bad', person: kin.id }; }
  }
  d.stage = 3;
  return { text: `You refused. ${beating(s, d)}`, tone: 'bad' };
});

/* ---- the road back ----------------------------------------------------------------------- */
defAction({
  id: 'g_exclude', cat: 'gamble', label: 'Put yourself on the self-exclusion list', emoji: '🚫',
  when: (s) => canGamble(s) && !excluded(s) && (LC(s, 'gambled') > 0 || (M(s).addictions.gambling || 0) >= 10),
  sub: () => 'Casinos, tracks and the app turn you away for five years',
  run: (s) => {
    gamb(s).excluded = s.year + 5;
    habit(s, 'gambling', -12);
    tally(s, 'selfExcluded');
    add(s, { happy: 2 });
    return 'You signed the form. The clerk said it takes courage. It felt like it.';
  },
});
defAction({
  id: 'g_meeting', cat: 'gamble', label: 'Go to a recovery meeting', emoji: '🤝',
  when: (s) => free(s) && A(s) >= 16 && (M(s).addictions.gambling || 0) >= 15 && count(s, 'g_meeting') < 2,
  run: (s) => {
    const n = bump(s, 'g_meeting');
    habit(s, 'gambling', -randInt(8, 15) / n);
    if (!flag(s, 'gSponsor') && chance(0.6)) { const p = meetSomeone(s, 'friend', 65); flag(s, 'gSponsor', p.id); return { text: `${p.first} has been clean for eleven years. They gave you their number and said "call before, not after."`, person: p.id }; }
    return pick(['You said your name and how long it’s been. Everyone clapped.', 'Someone told a story that could have been yours.', 'The coffee was terrible. You came back anyway.']);
  },
});

/* ---- going out --------------------------------------------------------------------------- */
defAction({
  id: 'g_go', cat: 'gamble', label: 'Go out gambling', emoji: '🎰',
  when: canGamble,
  sub: (s) => `${nOf(venuesReach(s).length, 'place')} to play`,
  run: (s) => {
    popup(s, {
      emoji: '🎰', title: `Gambling in ${P(s).city}`, handler: 'gPick',
      choices: venuesReach(s).map((v) => ({ label: `${VENUE_KINDS[v.kind].emoji} ${venueLabel(s, v)}`, value: v.id, sub: `${VENUE_KINDS[v.kind].name}${v.city && v.city !== P(s).city ? ' · ' + v.city : ''}${vStand(s, v.id).banned > s.year ? ' · banned' : ''}` })).concat([{ label: 'Stay home', value: null }]),
    });
  },
});
onChoice('gPick', (s, ctx, id) => (id ? visitVenue(s, vById(s, id)) : undefined));
defAction({
  id: 'venue_visit', cat: 'venue', target: 'venue', label: 'Go there', emoji: '🎰',
  when: (s, id) => canGamble(s) && venuesReach(s).some((v) => v.id === id),
  run: (s, id) => visitVenue(s, vById(s, id)),
});
defAction({
  id: 'g_scratch', cat: 'gamble', label: 'Buy scratch cards', emoji: '🎫',
  when: (s) => free(s) && A(s) >= 18 && count(s, 'g_scratch') < 10,
  sub: (s) => fmtMoney(price(s, 20)),
  run: (s) => {
    bump(s, 'g_scratch');
    const cost = price(s, 20);
    if (!pay(s, cost)) return cantAfford(cost);
    habit(s, 'gambling', 0.5);
    tally(s, 'gambled', cost);
    const r = rand();
    if (r < 0.0005) { const amt = price(s, 250000); add(s, { money: amt, happy: 20 }); return { text: `Three diamonds. ${fmtMoney(amt)}! You scratched it four more times to be sure.`, tone: 'good' }; }
    if (r < 0.02) { const amt = price(s, 500); add(s, { money: amt, happy: 4 }); return { text: `You won ${fmtMoney(amt)}.`, tone: 'good' }; }
    if (r < 0.2) { add(s, { money: cost }); return 'You won your money back. You bought another one.'; }
    return pick(['Nothing. Not even close.', 'Two cherries and a lemon. Nothing.', 'One symbol away. They always are.']);
  },
});
defAction({
  id: 'g_trip', cat: 'gamble', label: 'Take a trip to Silver Mesa', emoji: '✈️', desc: 'The casino capital of the world.',
  when: (s) => canGamble(s) && !(P(s).country === 'us' && P(s).city === CASINO_CITY) && tripKey(s) !== cityKey('us', CASINO_CITY),
  sub: (s) => (casinoPerk(s) ? 'Your host sends the jet. Free.' : fmtMoney(tripCost(s))),
  run: (s) => {
    const cost = casinoPerk(s) ? 0 : tripCost(s);
    if (!pay(s, cost)) return cantAfford(cost);
    gamb(s).trip = { key: cityKey('us', CASINO_CITY), year: s.year };
    tally(s, 'casinoTrips');
    add(s, { happy: 5 });
    venuesIn(s, 'us', CASINO_CITY);
    return { text: `You landed in ${CASINO_CITY} at midnight and the Strip was brighter than noon. The casinos are open to you all year. (Activities → Gambling)`, emoji: '✈️', tone: 'good' };
  },
});
const CASINO_CITY = 'Silver Mesa';
function tripCost(s) { return vacationCost(s, { cost: 1500, abroad: P(s).country !== 'us' }); }
function casinoPerk(s) { return Object.keys(gamb(s).at).some((id) => vStand(s, id).tier >= 4); }

/* ---- the year ------------------------------------------------------------------------------- */
function gamblingTick(s) {
  if (s.dead) return;
  const g = M(s).gamb;
  if (g && g.race) settleRaceQuietly(s);
  // Season bets pay out once their season has been played.
  if (g && g.bets.length) {
    for (const b of g.bets.slice()) {
      const lg = leagueOf(s, b.sport);
      if (lg.year <= b.year) playSeason(s, b.sport);
      if (lg.year <= b.year) continue;
      g.bets = g.bets.filter((x) => x !== b);
      if (lg.champ === b.team) { const got = Math.round(b.amt * b.dec); M(s).money += got; tally(s, 'gambleWins', got - b.amt); finRow(s, 'inc', `Bet on the ${b.team}`, got); log(s, `🏆 The ${b.team} won the ${SPORTS[b.sport].league}! Your bet paid ${fmtMoney(got)}.`, 'good'); }
      else log(s, `🏆 The ${lg.champ} won the ${SPORTS[b.sport].league}. Your bet on the ${b.team} lost.`, 'bad');
    }
  }
  if (g && g.debts.length && free(s)) { const budget = { n: 1 }; for (const d of g.debts.slice()) { debtYear(s, d, budget); if (s.dead) return; } }
  // Horses age and retire, and the venues of your city have their own years (once anyone has looked).
  const known = s.venueIdx && s.venueIdx[cityKey(P(s).country, P(s).city)];
  if (known) for (const v of venuesIn(s, P(s).country, P(s).city)) {
    if (v.horses) {
      for (const h of v.horses.slice()) if (s.year - h.born >= 8 || chance(0.06)) { v.horses = v.horses.filter((x) => x !== h); v.horses.push(newHorse(s)); if (h.wins >= 6) log(s, `🐎 ${h.name} retired from ${v.name} with ${h.wins} wins.`); }
    }
    if (['casino', 'backroom', 'resort'].includes(v.kind) && !(v.owner && v.owner.co) && chance(0.03)) {
      v.open = false;
      const why = v.kind === 'backroom' ? 'was raided by the police' : v.owner && v.owner.fam ? 'lost its gaming license over mob ties' : 'closed its doors';
      if (canGamble(s)) log(s, `🎰 ${cap(v.name)} ${why}.`);
      const fresh = newVenue(s, v.cc, v.city, v.kind);
      s.venueIdx[cityKey(v.cc, v.city)].push(fresh.id);
      if (canGamble(s)) log(s, `✨ ${cap(fresh.name)} opened ${v.kind === 'backroom' ? 'across town' : 'in its place'}.`);
    }
  }
}

/* ---- events ---------------------------------------------------------------------------------- */
const gambler = (s) => canGamble(s) && LC(s, 'gambled') > 0;
EV('gb_free_bet', {
  era: 'web',
  ages: [18, 90], emoji: '📱', when: (s) => gambler(s) && (excluded(s) || (M(s).addictions.gambling || 0) >= 20), text: (s) => `${appVenue(s).name} sent you a notification: "We miss you! Here’s a free ${fmtMoney(price(s, 50))} bet."`,
  choices: [
    ['Use it', (s) => { habit(s, 'gambling', 5); tally(s, 'relapse'); return chance(0.4) ? `It won. Of course it won. You deposited ${fmtMoney(price(s, 500))} that night.` : 'It lost. You deposited more to "get it back."'; }],
    ['Delete the app', (s) => { habit(s, 'gambling', -4); add(s, { happy: 2 }); return 'Gone. Your thumb kept going to where it used to be for a week.'; }],
  ],
});
EV('gb_found_out', {
  ages: [21, 90], emoji: '💔', when: (s) => !!romanticId(s) && (gambDebt(s) > price(s, 20000) || (M(s).addictions.gambling || 0) >= 50), text: (s) => `${romName(s)} found the statements. All of them.`,
  choices: [
    ['Tell the whole truth', (s) => { addRel(s, romanticId(s), -12); habit(s, 'gambling', -5); return `${romName(s)} cried, then asked how they can help. You have a long way to go.`; }],
    ['Lie about it', (s) => { if (chance(0.4)) { addRel(s, romanticId(s), -4); return 'They believed you. That might be worse.'; } addRel(s, romanticId(s), -30); return { text: `${romName(s)} knew you were lying. They moved into the guest room.`, tone: 'bad' }; }],
  ],
});
EV('gb_host', {
  ages: [21, 90], emoji: '🐋', when: (s) => casinoPerk(s) && free(s), text: 'Your VIP host called: a private jet, a suite and front-row seats, all on the house. "Just come play."',
  choices: [
    ['Go', (s) => { gamb(s).trip = { key: cityKey('us', CASINO_CITY), year: s.year }; add(s, { happy: 8 }); habit(s, 'gambling', 3); return `You landed in ${CASINO_CITY} with champagne already poured.`; }],
    ['Not this time', () => 'Your host said "anytime," and sent a fruit basket.'],
  ],
});
EV('gb_lucky_charm', {
  ages: [21, 90], emoji: '🍀', when: gambler, text: 'A stranger at the table swears you’re their lucky charm and won’t leave your side.',
  choices: [
    ['Play along', (s) => { if (chance(0.5)) { const amt = price(s, randInt(500, 5000)); add(s, { money: amt, happy: 4 }); return `They won big and gave you a cut: ${fmtMoney(amt)}.`; } return 'They lost everything and blamed you. Loudly.'; }],
    ['Change tables', () => 'They followed you to the next table, then the bar, then the parking lot.'],
  ],
});
EV('gb_inside_tip', {
  ages: [21, 90], emoji: '🐎', when: (s) => gambler(s) && venuesIn(s, P(s).country, P(s).city).some((v) => v.kind === 'track'), text: 'A stable hand at the track whispered that tomorrow’s favorite has been given something it shouldn’t have.',
  choices: [
    ['Bet against the favorite', (s) => { const amt = price(s, 2000); if (!pay(s, amt)) return cantAfford(amt); add(s, { karma: -3 }); if (chance(0.7)) { const got = amt * 4; M(s).money += got; return `The favorite stumbled out of the gate. You won ${fmtMoney(got - amt)}.`; } return 'The favorite won by six lengths. So much for the tip.'; }],
    ['Report it to the stewards', (s) => { add(s, { karma: 5 }); return 'The horse was scratched and the trainer suspended. The stable hand never spoke to you again.'; }],
    ['Blackmail the trainer', (s) => { add(s, { karma: -8 }); if (chance(0.6)) { const amt = price(s, randInt(5000, 30000)); add(s, { money: amt }); return `The trainer paid ${fmtMoney(amt)} to keep you quiet.`; } return arrest(s, 'extortion'); }],
  ],
});
EV('gb_fix', {
  ages: [18, 45], emoji: '🤫', when: (s) => !!M(s).career && JOBS[M(s).career.id].special === 'sports' && free(s), text: 'A man with a lot of rings offered you a fortune to lose your next game.',
  choices: [
    ['Take the money', (s) => { const amt = price(s, randInt(50000, 300000)); add(s, { money: amt, karma: -10 }); tally(s, 'threwGame'); if (chance(0.25)) { M(s).fame = clamp100(M(s).fame - 25); leaveJob(s, 'fired'); return { text: `You took ${fmtMoney(amt)}. The league caught it. You’re banned for life.`, tone: 'bad' }; } return `You took ${fmtMoney(amt)} and missed what you had to miss.`; }],
    ['Report him to the league', (s) => { add(s, { karma: 6 }); M(s).fame = clamp100(M(s).fame + 3); return 'The league thanked you publicly. You’ve been checking under your car since.'; }],
    ['Walk away', () => 'You walked away. He smiled like he’d be back.'],
  ],
});
EV('gb_whale_friend', {
  ages: [25, 90], emoji: '💼', when: (s) => gambler(s) && Object.values(gamb(s).at).some((x) => x.tier >= 2), text: 'A whale you met at the high-limit tables asks you to hold a briefcase for "a day or two."',
  choices: [
    ['Hold it', (s) => { if (chance(0.6)) { const amt = price(s, randInt(5000, 50000)); add(s, { money: amt }); return `They picked it up a week later and left ${fmtMoney(amt)} for your trouble.`; } return arrest(s, 'fencing'); }],
    ['Say no', () => 'They shrugged and asked the bartender instead.'],
  ],
});
EV('gb_streak', {
  ages: [21, 90], emoji: '🔥', when: (s) => gambler(s) && free(s) && !excluded(s), text: 'You’re on a hot streak. You can’t seem to lose.',
  choices: [
    ['Keep riding it', (s) => { habit(s, 'gambling', 4); if (chance(0.45)) { const amt = price(s, randInt(5000, 40000)); add(s, { money: amt, happy: 8 }); return `You walked out up ${fmtMoney(amt)}, with a comped suite you didn’t need.`; } const amt = Math.min(Math.max(0, M(s).money), price(s, randInt(5000, 30000))); M(s).money -= amt; return { text: `The streak ended the way they always do. You gave back ${fmtMoney(amt)} and then some.`, tone: 'bad' }; }],
    ['Cash out while you’re ahead', (s) => { const amt = price(s, randInt(1000, 8000)); add(s, { money: amt, happy: 4 }); return `You cashed out up ${fmtMoney(amt)}. The pit boss looked genuinely sad.`; }],
  ],
});
EV('gb_raid', {
  ages: [21, 90], emoji: '🚔', w: 0.5, when: (s) => gambler(s) && venuesIn(s, P(s).country, P(s).city).some((v) => v.kind === 'backroom' && vStand(s, v.id).visits > 0), text: 'The back-room game was raided while you were at the table.',
  choices: [
    ['Run for the back door', (s) => (chance(0.6) ? 'You made it out through the kitchen.' : (arrestMinor(s, 'vandalism'), { text: 'You tripped over a mop bucket. They wrote you up.', tone: 'bad' }))],
    ['Sit still', (s) => { M(s).money -= Math.min(Math.max(0, M(s).money), price(s, 500)); return 'They confiscated the pot and took everyone’s names.'; }],
  ],
});

/* ---- data hooks, achievements and legacy -------------------------------------------------------- */
KIN_LABELS.bookie = ['Bookie', 'Bookie', 'Bookie'];
KIN_LABELS.rival = ['Rival', 'Rival', 'Rival'];
REL_GROUPS.find((x) => x.id === 'other').kinds.push('bookie', 'rival');
REL_DECAY.bookie = 0;
REL_DECAY.rival = 1;
ACT_CATS.splice(ACT_CATS.findIndex((c) => c.id === 'shop'), 0, { id: 'gamble', name: 'Gambling', emoji: '🎰' });
ACHIEVEMENTS.push(
  { id: 'high_roller', name: 'High Roller', emoji: '🐋', desc: 'Become a Whale at a casino.', check: (s) => LC(s, 'whale') >= 1 },
  { id: 'long_shot', name: 'Long Shot', emoji: '🏇', desc: 'Win a horse bet at 20 to 1 or longer.', check: (s) => LC(s, 'longShots') >= 1 },
  { id: 'photo_finish', name: 'Photo Finish', emoji: '📸', desc: 'Back a winner who won by a nose.', check: (s) => LC(s, 'photoFinish') >= 1 },
  { id: 'card_shark', name: 'Card Shark', emoji: '🧮', desc: 'Get backed off for counting cards.', check: (s) => LC(s, 'backedOff') >= 1 },
  { id: 'final_table', name: 'Final Table', emoji: '♠️', desc: 'Make the final table of the Grand Felt Championship.', check: (s) => LC(s, 'finalTable') >= 1 },
  { id: 'felt_champion', name: 'Champion of the Felt', emoji: '🏆', desc: 'Win the Grand Felt Championship.', check: (s) => LC(s, 'feltChampion') >= 1 },
  { id: 'in_too_deep', name: 'In Too Deep', emoji: '🕳️', desc: () => `Owe ${fmtMoneyShort(100000)} in gambling debts.`, check: (s) => LC(s, 'deepDebt') >= 1 },
  { id: 'still_standing', name: 'Still Standing', emoji: '🩹', desc: 'Survive a beating over a gambling debt.', check: (s) => LC(s, 'beatings') >= 1 && !s.dead },
  { id: 'clean_break', name: 'Clean Break', emoji: '🌅', desc: 'Kick a serious gambling habit.', check: (s) => LC(s, 'relapse') + LC(s, 'chased') > 0 && !(M(s).addictions.gambling > 0) && (LC(s, 'selfExcluded') > 0 || !!flag(s, 'gSponsor')) },
);
LEGACY_TITLES.splice(LEGACY_TITLES.findIndex((t) => t.id === 'tycoon'), 0,
  { id: 'high_roller', name: 'High Roller', emoji: '🐋', check: (s) => LC(s, 'whale') >= 1 },
  { id: 'gambler', name: 'Degenerate Gambler', emoji: '🎲', check: (s) => (M(s).addictions.gambling || 0) >= 80 || gambDebt(s) >= price(s, 250000) },
);
