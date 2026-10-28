/* =====================================================================
 * 39-underworld.js — organized crime: crime families (join, get made,
 * rise, take over or found your own), family jobs, crews, rackets, heists,
 * turf wars, heat, raids and informants; three underworld careers (hitman,
 * loan shark, dealer up to cartel boss); the black market and a private
 * museum; and street racing. Underworld events are at the bottom.
 *
 * s.underworld = { seq, families: { id: { id, name, country, boss, strength, turf, mine } } }
 *   Rival families per country, shared by the whole family line.
 * M(s).uw (created on first contact) = { fam, rank, respect, made, heat, crew, turf,
 *   rackets: [{ type, lvl }], enemy, dealer: { rank, rep, cartel } | null, hits,
 *   book, collection: [{ id, name, emoji, value }], museum, rat, races }
 * Heat (0-100) is how hard the police are looking. It cools each year and turns
 * into raids while it's high. uwTick runs after financeTick, so underworld money
 * is added straight to this year's finance sheet.
 * ===================================================================== */

const MOB_RANKS = [
  { name: 'Associate', respect: 0 }, { name: 'Soldier', respect: 20 }, { name: 'Capo', respect: 45 },
  { name: 'Underboss', respect: 70 }, { name: 'Boss', respect: 999 },
];
const RACKET_SLOTS = [0, 0, 2, 3, 5]; // rackets you can run, by rank
const RACKETS = {
  protection: { name: 'Protection racket', emoji: '🛡️', income: 60000, heat: 4, rank: 2 },
  gambling: { name: 'Gambling den', emoji: '🎲', income: 90000, heat: 5, rank: 2 },
  chopshop: { name: 'Chop shop', emoji: '🔧', income: 80000, heat: 6, rank: 2 },
  unions: { name: 'Union kickbacks', emoji: '🏗️', income: 120000, heat: 5, rank: 3 },
  smuggling: { name: 'Smuggling ring', emoji: '🚢', income: 170000, heat: 8, rank: 3 },
  skim: { name: 'Casino skim', emoji: '🎰', income: 260000, heat: 9, rank: 4 },
};
const RACKET_IDS = Object.keys(RACKETS);
// crew: soldiers needed. crime: what you're charged with if it goes wrong.
const HEISTS = {
  warehouse: { name: 'Clean out a warehouse', emoji: '📦', loot: [40000, 300000], odds: 0.65, crew: 1, rank: 1, crime: 'burglary' },
  truck: { name: 'Hit an armored truck', emoji: '🚚', loot: [80000, 600000], odds: 0.5, crew: 2, rank: 1, crime: 'bank' },
  museum: { name: 'Steal a museum masterpiece', emoji: '🖼️', loot: [0, 0], odds: 0.35, crew: 3, rank: 2, crime: 'heist', art: true },
  kidnap: { name: 'Kidnap a tycoon for ransom', emoji: '💼', loot: [1000000, 8000000], odds: 0.35, crew: 4, rank: 2, crime: 'kidnapping' },
  casino: { name: 'Rob a casino vault', emoji: '🎰', loot: [500000, 5000000], odds: 0.3, crew: 6, rank: 2, crime: 'heist' },
  airport: { name: 'Raid an airport cargo hold', emoji: '✈️', loot: [1000000, 15000000], odds: 0.22, crew: 8, rank: 3, crime: 'heist' },
};
const HEIST_IDS = Object.keys(HEISTS);
const DEALER_RANKS = [
  { name: 'Corner dealer', pay: 15000, heat: 4, rep: 0 }, { name: 'Supplier', pay: 60000, heat: 6, rep: 25 },
  { name: 'Distributor', pay: 250000, heat: 8, rep: 50 }, { name: 'Kingpin', pay: 900000, heat: 11, rep: 75 },
  { name: 'Cartel boss', pay: 3000000, heat: 14, rep: 95 },
];
const CONTRACT_TARGETS = ['a rival enforcer', 'a crooked accountant who skimmed the wrong money', 'a gang leader who crossed the wrong people', 'a corrupt developer', 'a smuggler who stole a shipment', 'a cartel lieutenant', 'a loan shark who talked too much'];
const LOOT = [
  { name: 'Stolen impressionist painting', emoji: '🖼️', value: [200000, 3000000] },
  { name: 'Ancient bronze statue', emoji: '🗿', value: [150000, 1500000] },
  { name: 'Jeweled imperial egg', emoji: '🥚', value: [500000, 6000000] },
  { name: 'Roman coin hoard', emoji: '💰', value: [80000, 700000] },
  { name: 'Dinosaur skull', emoji: '🦖', value: [300000, 4000000] },
  { name: 'Antique samurai sword', emoji: '⚔️', value: [60000, 900000] },
  { name: 'Lost medieval manuscript', emoji: '📜', value: [100000, 2000000] },
  { name: "Pharaoh's golden amphora", emoji: '🏺', value: [400000, 5000000] },
];

/* ---- state -------------------------------------------------------------- */
function uw(s) {
  return M(s).uw || (M(s).uw = { fam: null, rank: 0, respect: 0, made: false, heat: 0, crew: 0, turf: 0, rackets: [], enemy: null, dealer: null, hits: 0, book: 0, collection: [], museum: null, rat: false, races: 0 });
}
function underworldOf(s) { return s.underworld || (s.underworld = { seq: 0, families: {} }); }
function familiesIn(s, c) {
  const w = underworldOf(s);
  const list = Object.values(w.families).filter((f) => f.country === c && !f.mine);
  while (list.length < 3) {
    const last = randomLast(c);
    const f = { id: 'fam' + ++w.seq, name: `the ${last} family`, country: c, boss: `${randomFirst(c, chance(0.75) ? 'm' : 'f')} ${last}`, strength: randInt(30, 80), turf: randInt(15, 35), mine: false };
    w.families[f.id] = f;
    list.push(f);
  }
  return list;
}
function myFamily(s) { const u = M(s).uw; return u && u.fam ? underworldOf(s).families[u.fam] || null : null; }
function inMob(s) { return !!myFamily(s); }
function mobRank(s) { return MOB_RANKS[uw(s).rank].name; }
function rankAtLeast(s, r) { return inMob(s) && uw(s).rank >= r; }
function addHeat(s, d) { const u = uw(s); u.heat = Math.round(clamp(u.heat + d, 0, 100)); }
function addRespect(s, d) { const u = uw(s); u.respect = Math.round(clamp(u.respect + d, 0, 100)); }
function familyPower(s, f) { const u = uw(s); return f.mine ? 10 + u.crew * 4 + u.turf / 2 : f.strength; }
function collectionValue(s) { const u = M(s).uw; return u ? sum(u.collection, (x) => x.value) : 0; }
const uwOk = (s, minAge) => free(s) && A(s) >= minAge;

/* ---- joining, rising, founding --------------------------------------------- */
defAction({
  id: 'mob_join', cat: 'mob', label: 'Get in with the mob', emoji: '🕴️', desc: 'Find someone who knows someone.',
  when: (s) => uwOk(s, 16) && !inMob(s) && !(M(s).uw && M(s).uw.rat),
  run: (s) => {
    if (bump(s, 'mob_join') > 1) return { text: 'Word is still getting around. Try again next year.', nolog: true };
    const odds = 0.15 + skill(s, 'streetwise') / 150 + (hasFelony(s) ? 0.2 : 0) + (M(s).karma < 30 ? 0.1 : 0) + (trait(s, 'cunning') ? 0.08 : 0);
    addSkill(s, 'streetwise', 2);
    if (!chance(clamp(odds, 0.05, 0.85))) return { text: vary('You {hung around the social club|asked the wrong bartender|tried to sound tough}. Nobody trusts a stranger.'), emoji: '🕴️' };
    popup(s, {
      emoji: '🕴️', title: 'A sit-down', text: 'Two families are willing to give you a shot. Pick carefully: you only leave one way.', handler: 'mobJoin',
      choices: familiesIn(s, P(s).country).slice(0, 2).map((f) => ({ label: cap(f.name), value: f.id, sub: `Run by ${f.boss} · strength ${f.strength}` })).concat([{ label: 'Walk away', value: null }]),
    });
  },
});
onChoice('mobJoin', (s, ctx, id) => {
  const f = id && underworldOf(s).families[id];
  if (!f || inMob(s)) return;
  const u = uw(s);
  Object.assign(u, { fam: f.id, rank: 0, respect: 5, made: false, rackets: [] });
  tally(s, 'mobJoined');
  if (vioOn() && A(s) >= 18) vioInitiation(s, 'mob'); // they want proof (72-violence.js)
  return { text: `You're an associate of ${f.name} now. Do what you're told, keep your mouth shut, and you'll go far.`, emoji: '🕴️', tone: 'good' };
});
/* ---- family jobs, crew, rackets ------------------------------------------- */
const FAMILY_JOBS = {
  collect: { name: 'Collect protection money', pay: [2000, 15000], odds: 0.8, respect: 3, heat: 3, crime: 'extortion' },
  numbers: { name: 'Run the numbers game', pay: [3000, 20000], odds: 0.85, respect: 2, heat: 2, crime: 'racketeering' },
  truck: { name: 'Hijack a delivery truck', pay: [5000, 40000], odds: 0.6, respect: 5, heat: 5, crime: 'racketeering' },
  message: { name: 'Send a message to someone who owes', pay: [1000, 8000], odds: 0.7, respect: 6, heat: 4, crime: 'extortion', karma: -4 },
};
defAction({
  id: 'mob_job', cat: 'mob', label: 'Do a job for the family', emoji: '💼', desc: 'Earn your cut. Earn their respect.',
  when: (s) => uwOk(s, 16) && inMob(s) && !myFamily(s).mine,
  run: (s) => {
    if (bump(s, 'mob_job') > 3) return { text: 'The boss says take it easy for the rest of the year.', nolog: true };
    popup(s, { emoji: '💼', title: 'What needs doing', handler: 'mobJob', text: 'The capo has a few jobs that need doing.', choices: Object.keys(FAMILY_JOBS).map((k) => ({ label: FAMILY_JOBS[k].name, value: k })).concat([{ label: 'Not today', value: null }]) });
  },
});
onChoice('mobJob', (s, ctx, k) => {
  const J = FAMILY_JOBS[k];
  if (!J || !inMob(s)) return;
  const u = uw(s);
  addSkill(s, 'streetwise', 2);
  if (chance(clamp(J.odds + skill(s, 'streetwise') / 300 + (trait(s, 'cunning') ? 0.05 : 0), 0.1, 0.95))) {
    const cut = price(s, randInt(J.pay[0], J.pay[1]) * (1 + u.rank * 0.6));
    add(s, { money: cut, karma: J.karma || -2 });
    addRespect(s, J.respect);
    addHeat(s, J.heat);
    return { text: `${J.name}: done. Your cut was ${fmtMoney(cut)}.`, emoji: '💼' };
  }
  addHeat(s, J.heat * 2);
  if (chance(0.35)) return arrest(s, J.crime);
  addRespect(s, -2);
  return { text: 'It went sideways, but you got away. The capo is not impressed.', tone: 'bad', emoji: '💼' };
});
defAction({
  id: 'mob_recruit', cat: 'mob', label: 'Recruit soldiers', emoji: '👥',
  sub: (s) => `Crew of ${uw(s).crew} · ${fmtMoney(price(s, 25000))}/yr each`,
  when: (s) => uwOk(s, 18) && rankAtLeast(s, 1),
  run: (s) => {
    const fee = price(s, 5000);
    popup(s, { emoji: '👥', title: 'Recruit', text: `Each recruit costs ${fmtMoney(fee)} up front and ${fmtMoney(price(s, 25000))} a year. A bigger crew means bigger heists, more racket money and better odds in a war.`, handler: 'mobRecruit', choices: [1, 3, 10].map((n) => ({ label: `Recruit ${nOf(n, 'soldier')}`, value: n, sub: fmtMoney(fee * n), disabled: M(s).money < fee * n })).concat([{ label: 'Never mind', value: 0 }]) });
  },
});
onChoice('mobRecruit', (s, ctx, n) => {
  if (!n || !inMob(s)) return;
  const fee = price(s, 5000) * n;
  if (!pay(s, fee)) return cantAfford(fee);
  uw(s).crew += n;
  addHeat(s, n);
  return { text: `${nOf(n, 'new soldier')} joined your crew. You have ${uw(s).crew} now.`, emoji: '👥' };
});
defAction({
  id: 'mob_racket', cat: 'mob', label: 'Run a racket', emoji: '🎲',
  sub: (s) => { const u = uw(s); return `${u.rackets.length}/${RACKET_SLOTS[u.rank]} rackets · they pay every year`; },
  when: (s) => uwOk(s, 18) && rankAtLeast(s, 2),
  run: (s) => {
    const u = uw(s);
    const owned = u.rackets.map((r) => r.type);
    const choices = u.rackets.filter((r) => r.lvl < 3).map((r) => { const R = RACKETS[r.type], cost = price(s, R.income * 0.6 * r.lvl); return { label: `Expand your ${R.name.toLowerCase()} (level ${r.lvl + 1})`, value: 'up:' + r.type, sub: fmtMoney(cost), disabled: M(s).money < cost }; });
    if (u.rackets.length < RACKET_SLOTS[u.rank]) {
      for (const k of RACKET_IDS) {
        if (owned.includes(k)) continue;
        const R = RACKETS[k], cost = price(s, R.income * 0.5);
        choices.push({ label: `${R.emoji} Start a ${R.name.toLowerCase()}`, value: 'new:' + k, sub: u.rank < R.rank ? `Needs the rank of ${MOB_RANKS[R.rank].name}` : `${fmtMoney(cost)} · about ${fmtMoney(price(s, R.income))}/yr`, disabled: u.rank < R.rank || M(s).money < cost });
      }
    }
    if (!choices.length) return { text: `You're running as many rackets as a ${mobRank(s).toLowerCase()} can handle.`, nolog: true };
    popup(s, { emoji: '🎲', title: 'Rackets', text: 'Rackets pay every year, but every one of them draws heat.', handler: 'mobRacket', choices: choices.concat([{ label: 'Never mind', value: null }]) });
  },
});
onChoice('mobRacket', (s, ctx, v) => {
  if (!v || !inMob(s)) return;
  const [act, k] = v.split(':');
  const R = RACKETS[k], u = uw(s);
  if (!R) return;
  if (act === 'up') {
    const r = u.rackets.find((x) => x.type === k);
    if (!r) return;
    const cost = price(s, R.income * 0.6 * r.lvl);
    if (!pay(s, cost)) return cantAfford(cost);
    r.lvl++;
    return { text: `Your ${R.name.toLowerCase()} is bigger than ever (level ${r.lvl}).`, emoji: R.emoji };
  }
  const cost = price(s, R.income * 0.5);
  if (!pay(s, cost)) return cantAfford(cost);
  u.rackets.push({ type: k, lvl: 1 });
  addRespect(s, 3);
  return { text: `You set up a ${R.name.toLowerCase()}. The money starts flowing next year.`, emoji: R.emoji, tone: 'good' };
});
defAction({
  id: 'mob_war', cat: 'mob', label: 'Move on rival turf', emoji: '💥', desc: 'Start a war with another family.',
  when: (s) => uwOk(s, 18) && rankAtLeast(s, 2) && uw(s).crew >= 3,
  run: (s) => {
    if (bump(s, 'mob_war') > 1) return { text: 'Your crew needs time to regroup.', nolog: true };
    const mine = myFamily(s);
    popup(s, { emoji: '💥', title: 'Turf war', text: `Your side's strength: about ${Math.round(familyPower(s, mine) + uw(s).crew * 3)}. Whose turf do you move on?`, handler: 'mobWar', choices: familiesIn(s, P(s).country).filter((f) => f.id !== mine.id).map((f) => ({ label: cap(f.name), value: f.id, sub: `Strength ${f.strength} · ${f.turf}% of the city` })).concat([{ label: 'Call it off', value: null }]) });
  },
});
onChoice('mobWar', (s, ctx, id) => {
  const rival = id && underworldOf(s).families[id], mine = myFamily(s);
  if (!rival || !mine) return;
  const u = uw(s);
  const me = familyPower(s, mine) + u.crew * 3 + u.respect / 2 + skill(s, 'streetwise') / 3 + randInt(0, 40);
  const them = rival.strength + randInt(0, 40);
  addHeat(s, 12);
  if (me > them) {
    const gain = randInt(5, 12);
    if (mine.mine) u.turf = Math.min(60, u.turf + gain); else mine.turf = Math.min(70, mine.turf + gain);
    rival.strength -= randInt(8, 18);
    rival.turf = Math.max(0, rival.turf - gain);
    addRespect(s, 8);
    u.crew = Math.max(0, u.crew - randInt(0, 1));
    tally(s, 'turfWins');
    if (rival.strength <= 0) { delete underworldOf(s).families[rival.id]; return { text: `You crushed ${rival.name}. They're finished, and their turf is yours.`, tone: 'good', emoji: '💥' }; }
    return { text: `Your crew took a big piece of ${rival.name}'s turf.`, tone: 'good', emoji: '💥' };
  }
  u.crew = Math.max(0, u.crew - randInt(1, 3));
  add(s, { health: -randInt(5, 20) });
  if (chance(0.05)) { die(s, 'in a mob shootout'); return 'The war went badly.'; }
  if (!u.enemy) u.enemy = rival.id;
  return { text: `${cap(rival.name)} hit back hard. You lost soldiers and some of your nerve.`, tone: 'bad', emoji: '💥' };
});
defAction({
  id: 'mob_heist', cat: 'mob', label: 'Plan a heist', emoji: '🗺️', desc: 'Big scores need a crew.',
  when: (s) => uwOk(s, 18) && rankAtLeast(s, 1),
  run: (s) => {
    if (bump(s, 'mob_heist') > 1) return { text: 'Heat from your last score has to die down first.', nolog: true };
    const u = uw(s);
    popup(s, {
      emoji: '🗺️', title: 'Plan a heist', text: `Your crew: ${u.crew}.`, handler: 'mobHeist',
      choices: HEIST_IDS.map((k) => { const H = HEISTS[k]; const why = u.rank < H.rank ? `Needs the rank of ${MOB_RANKS[H.rank].name}` : u.crew < H.crew ? `Needs a crew of ${H.crew}` : ''; return { label: H.emoji + ' ' + H.name, value: k, sub: why || (H.art ? 'Loot: a priceless artwork' : `Loot up to ${fmtMoneyShort(price(s, H.loot[1]))}`), disabled: !!why }; }).concat([{ label: 'Never mind', value: null }]),
    });
  },
});
onChoice('mobHeist', (s, ctx, k) => {
  if (!HEISTS[k] || !inMob(s)) return;
  popup(s, { emoji: HEISTS[k].emoji, title: HEISTS[k].name, text: 'How do you want to play it?', handler: 'mobHeistGo', ctx: { k }, choices: [{ label: 'Go in loud and fast', value: 'loud', sub: 'Bigger take, worse odds' }, { label: 'Pay an inside man', value: 'inside', sub: `${fmtMoney(price(s, HEISTS[k].loot[1] * 0.05 || 50000))} up front, better odds` }, { label: 'Plan it for months', value: 'plan', sub: 'Better odds, less heat' }, { label: 'Call it off', value: null }] });
});
onChoice('mobHeistGo', (s, ctx, how) => {
  const H = HEISTS[ctx.k];
  if (!how || !H || !inMob(s)) return;
  const u = uw(s);
  if (how === 'inside') { const fee = price(s, H.loot[1] * 0.05 || 50000); if (!pay(s, fee)) return cantAfford(fee); }
  const odds = H.odds + skill(s, 'streetwise') / 300 + Math.min(0.15, (u.crew - H.crew) * 0.02) + { loud: -0.05, inside: 0.15, plan: 0.07 }[how] + (trait(s, 'cunning') ? 0.05 : 0);
  addSkill(s, 'streetwise', 3);
  addHeat(s, how === 'plan' ? 12 : 20);
  tally(s, 'heists');
  if (chance(clamp(odds, 0.05, 0.9))) {
    addRespect(s, 10);
    add(s, { karma: -8, happy: 6 });
    tally(s, 'heistWins');
    if (H.art) {
      const it = lootItem(s);
      uw(s).collection.push(it);
      return { text: `You walked out of the museum with the ${it.name.toLowerCase().replace(/^stolen /, '')}. It's worth about ${fmtMoney(it.value)}, if you can ever sell it.`, tone: 'good', emoji: it.emoji, title: 'The score' };
    }
    const loot = price(s, randInt(H.loot[0], H.loot[1]) * (how === 'loud' ? 1.2 : 1));
    const share = 0.35 + u.rank * 0.1;
    const mine = Math.round(loot * share);
    add(s, { money: mine });
    return { text: `${k2text(ctx.k)} The take was ${fmtMoney(loot)}. Your share: ${fmtMoney(mine)}.`, tone: 'good', emoji: H.emoji, title: 'The score' };
  }
  if (chance(0.04)) { die(s, 'during a heist gone wrong'); return 'Everything went wrong at once.'; }
  if (chance(0.25)) u.crew = Math.max(0, u.crew - randInt(1, 2));
  if (chance(0.5)) return arrest(s, H.crime);
  addRespect(s, -3);
  return { text: 'The alarm went off early. Everyone scattered with nothing.', tone: 'bad', emoji: H.emoji };
});
function k2text(k) {
  return {
    warehouse: 'You backed a truck up to the loading dock and emptied the place.',
    truck: 'You stopped the armored truck on a quiet road and were gone in four minutes.',
    kidnap: 'The tycoon was released unharmed the moment the ransom cleared.',
    casino: 'You cracked the vault during a power cut nobody could explain.',
    airport: 'You drove the cargo out through the service gate in a stolen airline van.',
  }[k] || 'It went perfectly.';
}

/* ---- heat ------------------------------------------------------------------ */
defAction({
  id: 'uw_laylow', cat: 'mob', label: 'Lay low', emoji: '🕶️', desc: 'Cool the heat. Earn less this year.',
  sub: (s) => `Heat ${uw(s).heat}%`,
  when: (s) => free(s) && !!M(s).uw && uw(s).heat >= 10,
  run: (s) => {
    if (bump(s, 'uw_laylow') > 1) return { text: "You're already keeping your head down.", nolog: true };
    addHeat(s, -15);
    return { text: 'You stayed home, paid cash for everything and changed your routines. The heat is cooling.', emoji: '🕶️' };
  },
});
defAction({
  id: 'uw_flip', cat: 'mob', label: 'Become an informant', emoji: '🐀', desc: 'Make a deal with the feds.',
  when: (s) => free(s) && inMob(s) && A(s) >= 18 && !uw(s).rat,
  run: (s) => {
    popup(s, { emoji: '🐀', title: 'Make a deal?', text: 'The feds will make your heat disappear and pay you to wear a wire. If the family ever finds out, you’re a dead man walking.', handler: 'uwFlip', choices: [{ label: 'Wear the wire', value: true, tone: 'bad' }, { label: 'Never', value: false }] });
  },
});
onChoice('uwFlip', (s, ctx, yes) => {
  if (!yes || !inMob(s)) return;
  const u = uw(s);
  u.rat = true;
  u.heat = 0;
  add(s, { karma: 5 });
  tally(s, 'flipped');
  return { text: 'You signed the deal. From now on, every conversation goes on tape.', emoji: '🐀' };
});
// The family knows. Run, or face them.
function ratFound(s) {
  const u = uw(s), fam = myFamily(s);
  if (!u.rat || s.pending.some((p) => p.handler === 'uwRatFound')) return;
  popup(s, { emoji: '🐀', title: "They know", tone: 'bad', handler: 'uwRatFound', text: `${fam ? cap(fam.name) : 'The family'} found out you've been wearing a wire.`, choices: [{ label: 'Run: take witness protection', value: 'run' }, { label: 'Face them', value: 'face', tone: 'bad' }] });
}
// Witness protection: a new name in a new city, with everything underworld left behind.
function witnessProtection(s) {
  const me = P(s), u = uw(s), C = country(s);
  me.last = randomLast(me.country);
  me.city = pick(C.cities.filter((c) => c !== me.city));
  cityArrive(s);
  if (M(s).housing.type === 'rent') M(s).housing = { type: 'rent', assetId: null, rent: M(s).housing.rent, name: 'Safe House Apartment', rtype: 'apt1' };
  Object.assign(u, { fam: null, rank: 0, made: false, crew: 0, turf: 0, rackets: [], rat: false, enemy: null, heat: 0, dealer: null, book: 0 });
  add(s, { happy: -10 });
  tally(s, 'witnessProtection');
  return `You're ${fullName(me)} now, living quietly in ${me.city}.`;
}

/* ---- underworld careers ------------------------------------------------------ */
defAction({
  id: 'uw_deal', cat: 'mob', emoji: '💊',
  label: (s) => (M(s).uw && M(s).uw.dealer ? 'Move product' : 'Start dealing'),
  sub: (s) => { const d = M(s).uw && M(s).uw.dealer; return d ? `${DEALER_RANKS[d.rank].name}${d.cartel ? ' of ' + d.cartel : ''} · rep ${d.rep}` : 'Work your way up to cartel boss.'; },
  when: (s) => uwOk(s, 16),
  run: (s) => {
    const u = uw(s);
    if (!u.dealer) { u.dealer = { rank: 0, rep: 0, cartel: '' }; tally(s, 'dealerStart'); }
    if (bump(s, 'uw_deal') > 2) return { text: "You've moved all the product you can this year.", nolog: true };
    const d = u.dealer, R = DEALER_RANKS[d.rank];
    addSkill(s, 'streetwise', 2);
    if (chance(clamp(0.78 + skill(s, 'streetwise') / 300 - d.rank * 0.05, 0.3, 0.92))) {
      const pay = price(s, R.pay * randFloat(0.4, 0.8));
      add(s, { money: pay, karma: -2 });
      d.rep = Math.min(100, d.rep + randInt(4, 9));
      addHeat(s, R.heat);
      return { text: `${vary('{The shipment came in clean|Business was good|Your corners sold out}')}. You cleared ${fmtMoney(pay)}.`, emoji: '💊' };
    }
    addHeat(s, R.heat * 2);
    if (chance(0.4)) return arrest(s, d.rank >= 2 ? 'trafficking' : 'drugs');
    d.rep = Math.max(0, d.rep - 5);
    return { text: 'A deal went bad. You lost the product and some of your reputation.', tone: 'bad', emoji: '💊' };
  },
});
defAction({
  id: 'uw_quit_deal', cat: 'mob', label: 'Get out of the drug game', emoji: '🚪',
  when: (s) => free(s) && !!(M(s).uw && M(s).uw.dealer),
  run: (s) => { uw(s).dealer = null; add(s, { happy: 3 }); return 'You walked away from the drug game. Your old corners went to someone else within a week.'; },
});
defAction({
  id: 'uw_contract', cat: 'mob', label: 'Take a contract', emoji: '🎯', desc: 'Make problems disappear. For a fee.',
  sub: (s) => { const h = M(s).uw ? M(s).uw.hits : 0; return h ? `${nOf(h, 'contract')} completed` : 'Needs streetwise or martial arts 25'; },
  when: (s) => uwOk(s, 18) && (skill(s, 'streetwise') >= 25 || skill(s, 'martial') >= 25 || rankAtLeast(s, 1)),
  run: (s) => {
    if (bump(s, 'uw_contract') > 2) return { text: 'Your broker has no more work this year.', nolog: true };
    const h = uw(s).hits;
    const offers = CONTRACT_TARGETS.slice().sort(() => rand() - 0.5).slice(0, 3).map((t) => {
      const diff = randFloat(0.45, 0.85);
      return { t, fee: nicePrice(price(s, randInt(20000, 90000) * (1.4 - diff) * (1 + Math.min(h, 20) / 6))), odds: Math.round(diff * 100) / 100 };
    });
    popup(s, { emoji: '🎯', title: 'Contracts', text: 'Your broker slid three envelopes across the table.', handler: 'uwContract', ctx: { offers }, choices: offers.map((o, i) => ({ label: cap(o.t), value: i, sub: `${fmtMoney(o.fee)} · ${o.odds >= 0.7 ? 'easy' : o.odds >= 0.55 ? 'tricky' : 'dangerous'}` })).concat([{ label: 'Pass', value: -1 }]) });
  },
});
onChoice('uwContract', (s, ctx, i) => {
  const o = ctx.offers && ctx.offers[i];
  if (!o) return;
  const odds = o.odds + skill(s, 'streetwise') / 400 + skill(s, 'martial') / 400 + (trait(s, 'cunning') ? 0.05 : 0);
  addSkill(s, 'streetwise', 2);
  if (chance(clamp(odds, 0.1, 0.95))) {
    const u = uw(s);
    u.hits++;
    add(s, { money: o.fee, karma: -15 });
    addHeat(s, 10);
    if (inMob(s)) addRespect(s, 4);
    tally(s, 'murders');
    tally(s, 'contracts');
    return { text: `The job is done. ${fmtMoney(o.fee)} arrived in a gym bag.`, emoji: '🎯', tone: 'bad' };
  }
  if (chance(0.06)) { die(s, 'during a contract gone wrong'); return 'The target was waiting for you.'; }
  addHeat(s, 15);
  if (chance(0.4)) return arrest(s, 'attempted_murder');
  return { text: 'The target got away. Your broker is disappointed.', tone: 'bad', emoji: '🎯' };
});
defAction({
  id: 'uw_loanshark', cat: 'mob', label: 'Loan sharking', emoji: '🦈', desc: 'Lend at 30% to people the banks turned away.',
  sub: (s) => { const b = M(s).uw ? M(s).uw.book : 0; return b ? `${fmtMoney(b)} on the street` : 'Lend at 30% to people the banks turned away.'; },
  when: (s) => uwOk(s, 18),
  run: (s) => {
    const u = uw(s), cash = Math.max(0, M(s).money);
    const amts = [10000, 100000, 1000000].map((v) => price(s, v));
    popup(s, {
      emoji: '🦈', title: 'Your book', handler: 'uwLoan', text: `You have ${fmtMoney(u.book)} lent out. It earns about 30% a year, minus whatever the deadbeats never pay back.`,
      choices: amts.map((a) => ({ label: `Lend ${fmtMoney(a)}`, value: 'lend:' + a, disabled: cash < a })).concat(u.book ? [{ label: 'Call in all your loans', value: 'call', sub: 'Some of it never comes back' }] : [], [{ label: 'Done', value: null }]),
    });
  },
});
onChoice('uwLoan', (s, ctx, v) => {
  if (!v) return;
  const u = uw(s);
  if (v === 'call') {
    const back = Math.round(u.book * randFloat(0.6, 0.95));
    u.book = 0;
    add(s, { money: back });
    return { text: `You called in your loans and collected ${fmtMoney(back)}.`, emoji: '🦈' };
  }
  const amt = Number(v.split(':')[1]);
  if (!pay(s, amt)) return cantAfford(amt);
  u.book += amt;
  tally(s, 'loanshark');
  return { text: `You put ${fmtMoney(amt)} on the street. Your book is ${fmtMoney(u.book)}.`, emoji: '🦈' };
});

/* ---- the black market and the museum ------------------------------------------ */
function lootItem(s) { const L = pick(LOOT); return { id: uid(s, 'loot'), name: L.name, emoji: L.emoji, value: price(s, randInt(L.value[0], L.value[1])) }; }
defAction({
  id: 'uw_blackmarket', cat: 'mob', label: 'The black market', emoji: '🏺', desc: 'Stolen art and antiquities. No questions asked.',
  sub: (s) => { const n = M(s).uw ? M(s).uw.collection.length : 0; return n ? `Your collection: ${nOf(n, 'piece')} · ${fmtMoney(collectionValue(s))}` : 'Stolen art and antiquities. No questions asked.'; },
  when: (s) => uwOk(s, 18),
  run: (s) => {
    if (bump(s, 'uw_blackmarket') > 2) return { text: 'Your contact has nothing new until next year.', nolog: true };
    const u = uw(s);
    const offers = [lootItem(s), lootItem(s), lootItem(s)].map((it) => Object.assign(it, { ask: Math.round(it.value * randFloat(0.4, 0.7)) }));
    const choices = offers.map((it, i) => ({ label: `${it.emoji} Buy the ${it.name.toLowerCase()}`, value: 'buy:' + i, sub: `${fmtMoney(it.ask)} · worth about ${fmtMoney(it.value)}`, disabled: M(s).money < it.ask }));
    for (const it of u.collection) choices.push({ label: `Sell the ${it.name.toLowerCase()} to a fence`, value: 'fence:' + it.id, sub: `${fmtMoney(it.value * 0.6)} · safe` }, { label: `Auction the ${it.name.toLowerCase()}`, value: 'auction:' + it.id, sub: `${fmtMoney(it.value)} · someone might recognize it` });
    popup(s, { emoji: '🏺', title: 'The black market', text: 'A back room behind an antiques shop. Everything here is "of uncertain provenance."', handler: 'uwMarket', ctx: { offers }, choices: choices.concat([{ label: 'Leave', value: null }]) });
  },
});
onChoice('uwMarket', (s, ctx, v) => {
  if (!v) return;
  const u = uw(s), [act, key] = v.split(':');
  if (act === 'buy') {
    const it = ctx.offers[Number(key)];
    if (!it || !pay(s, it.ask)) return it ? cantAfford(it.ask) : undefined;
    u.collection.push({ id: it.id, name: it.name, emoji: it.emoji, value: it.value });
    addHeat(s, 3);
    tally(s, 'loot');
    return { text: `The ${it.name.toLowerCase()} is yours. Best not to ask where it came from.`, emoji: it.emoji };
  }
  const it = u.collection.find((x) => x.id === key);
  if (!it) return;
  u.collection = u.collection.filter((x) => x !== it);
  if (act === 'fence') { const got = Math.round(it.value * 0.6); add(s, { money: got }); return { text: `Your fence paid ${fmtMoney(got)} for the ${it.name.toLowerCase()}.`, emoji: '🏺' }; }
  if (chance(0.25)) { addHeat(s, 15); return arrest(s, 'fencing'); }
  add(s, { money: it.value });
  return { text: `The ${it.name.toLowerCase()} sold at auction for ${fmtMoney(it.value)}. Nobody asked a thing.`, tone: 'good', emoji: '🔨' };
});
defAction({
  id: 'uw_museum', cat: 'mob', label: 'Open a private museum', emoji: '🏛️', desc: 'Show off your collection. A very respectable front.',
  sub: (s) => fmtMoney(price(s, 400000)),
  when: (s) => uwOk(s, 21) && !!M(s).uw && !uw(s).museum && uw(s).collection.length >= 3,
  run: (s) => {
    const cost = price(s, 400000);
    if (!pay(s, cost)) return cantAfford(cost);
    uw(s).museum = { since: s.year, name: `The ${P(s).last} Collection` };
    tally(s, 'museums');
    add(s, { fame: 3, happy: 6 });
    return { text: `The ${P(s).last} Collection opened its doors. The ribbon-cutting was full of people who should have known better. It's the perfect front.`, tone: 'good', emoji: '🏛️' };
  },
});

/* ---- street racing -------------------------------------------------------------- */
defAction({
  id: 'uw_race', cat: 'mob', label: 'Street race', emoji: '🏎️', desc: 'Bet on yourself behind the wheel.',
  sub: (s) => { const c = myCar(s); return c ? `In your ${c.name}` : 'You need a car'; },
  when: (s) => uwOk(s, 16) && !!myCar(s),
  run: (s) => {
    if (bump(s, 'uw_race') > 3) return { text: 'Every street racer in town has already lost to you, or to the cops.', nolog: true };
    const bets = [500, 5000, 50000].map((v) => price(s, v));
    popup(s, { emoji: '🏎️', title: 'Street race', text: `Midnight, an empty industrial road, and a car that thinks it's faster than your ${myCar(s).name}.`, handler: 'uwRace', choices: bets.map((b) => ({ label: `Race for ${fmtMoney(b)}`, value: b, disabled: M(s).money < b })).concat([{ label: 'Back out', value: 0 }]) });
  },
});
onChoice('uwRace', (s, ctx, bet) => {
  const car = myCar(s);
  if (!bet || !car) return;
  if (M(s).money < bet) return cantAfford(bet);
  addSkill(s, 'driving', 2);
  tally(s, 'races');
  const r = rand();
  if (r < 0.06) {
    car.cond = clamp(car.cond - 40, 0, 100);
    add(s, { health: -randInt(10, 25), money: -bet });
    if (chance(0.12)) { die(s, 'a street racing crash'); return 'You lost control at the last corner.'; }
    return { text: `You wrapped your ${car.name} around a lamppost. You lost the bet and a lot of paint.`, tone: 'bad', emoji: '💥' };
  }
  if (r < 0.16) { addHeat(s, 3); return arrest(s, 'street_racing'); }
  const odds = 0.3 + skill(s, 'driving') / 250 + Math.min(0.25, car.value / price(s, 120000)) + car.cond / 500 + (trait(s, 'lucky') ? 0.05 : 0);
  if (chance(clamp(odds, 0.1, 0.85))) {
    add(s, { money: bet, happy: 5 });
    uw(s).races++;
    if (inMob(s)) addRespect(s, 1);
    return { text: `You crossed the line two car lengths ahead and pocketed ${fmtMoney(bet)}.`, tone: 'good', emoji: '🏁' };
  }
  add(s, { money: -bet, happy: -3 });
  return { text: `You lost by a bumper and handed over ${fmtMoney(bet)}.`, tone: 'bad', emoji: '🏎️' };
});

// Big moves: founding your own family, walking away, or taking over.
defAction({
  id: 'mob_found', cat: 'mob', emoji: '👔',
  label: (s) => (inMob(s) ? 'Break away and start your own family' : 'Start your own crime family'),
  sub: (s) => `Needs streetwise 40 and ${fmtMoney(price(s, 250000))}`,
  when: (s) => uwOk(s, 21) && (!inMob(s) || (uw(s).rank >= 2 && !myFamily(s).mine)) && !(M(s).uw && M(s).uw.rat),
  run: (s) => {
    const cost = price(s, 250000);
    if (skill(s, 'streetwise') < 40) return { text: "Nobody will follow you yet. You need more street credibility (streetwise 40).", nolog: true };
    if (!pay(s, cost)) return cantAfford(cost);
    const u = uw(s), w = underworldOf(s), old = myFamily(s);
    if (old) { u.enemy = old.id; u.respect = Math.round(u.respect / 2); }
    const f = { id: 'fam' + ++w.seq, name: `the ${P(s).last} family`, country: P(s).country, boss: fullName(P(s)), strength: 0, turf: 0, mine: true };
    w.families[f.id] = f;
    Object.assign(u, { fam: f.id, rank: 4, made: true, crew: Math.max(u.crew, 3), turf: Math.max(u.turf, 5) });
    tally(s, 'becameBoss');
    return { text: `You founded ${f.name}${old ? `, and ${old.name} will never forgive the betrayal` : ''}. You're the boss now.`, tone: 'good', emoji: '👔', title: 'A new family' };
  },
});
defAction({
  id: 'mob_leave', cat: 'mob', label: 'Walk away from the family', emoji: '🚶', desc: 'Nobody really leaves.',
  when: (s) => free(s) && inMob(s),
  run: (s) => {
    popup(s, { emoji: '🚶', title: 'Leave the family?', text: 'You would give up your crew and your rackets. Some families let people go. Most remember.', handler: 'mobLeave', choices: [{ label: 'Leave', value: true, tone: 'bad' }, { label: 'Stay', value: false }] });
  },
});
onChoice('mobLeave', (s, ctx, yes) => {
  const f = myFamily(s);
  if (!yes || !f) return;
  const u = uw(s);
  if (!f.mine && chance(0.5)) u.enemy = f.id;
  if (f.mine) delete underworldOf(s).families[f.id];
  Object.assign(u, { fam: null, rank: 0, made: false, crew: 0, turf: 0, rackets: [] });
  return { text: `You walked away from ${f.name}.${u.enemy ? ' They did not take it well.' : ''}`, emoji: '🚶' };
});
defAction({
  id: 'mob_coup', cat: 'mob', label: 'Take over the family', emoji: '👑', desc: "Move against the boss. There's no undo.",
  when: (s) => free(s) && inMob(s) && uw(s).rank === 3 && !myFamily(s).mine,
  run: (s) => {
    popup(s, { emoji: '🗡️', title: 'Move against the boss?', text: `${myFamily(s).boss} runs ${myFamily(s).name}. If you move and miss, you won't get a second chance.`, handler: 'mobCoup', choices: [{ label: 'Do it', value: true, tone: 'bad' }, { label: 'Wait', value: false }] });
  },
});
onChoice('mobCoup', (s, ctx, yes) => {
  const f = myFamily(s);
  if (!yes || !f) return;
  const u = uw(s);
  if (chance(clamp(0.25 + u.crew * 0.03 + u.respect / 300 + skill(s, 'streetwise') / 400, 0.1, 0.8))) {
    f.boss = fullName(P(s));
    u.rank = 4;
    addRespect(s, 15);
    add(s, { karma: -15 });
    tally(s, 'becameBoss');
    return { text: `It's done. You run ${f.name} now.`, tone: 'good', emoji: '👑', title: 'The new boss' };
  }
  if (chance(0.4)) { die(s, 'in a mob hit'); return 'The boss saw it coming.'; }
  Object.assign(u, { fam: null, rank: 0, made: false, crew: 0, rackets: [], enemy: f.id });
  return { text: `The coup failed. You fled with your life, and ${f.name} wants you dead.`, tone: 'bad', emoji: '🗡️' };
});


/* ---- the underworld year ----------------------------------------------------------- */
function uwTick(s) {
  const u = M(s).uw;
  if (!u || s.dead) return;
  const m = M(s), fin = m.lastFinance && m.lastFinance.year === s.year ? m.lastFinance : null;
  const earn = (label, amt) => { amt = Math.round(amt); if (amt <= 0) return; m.money += amt; if (fin) fin.inc.push([label, amt]); };
  const spend = (label, amt) => { amt = Math.round(amt); if (amt <= 0) return; m.money -= amt; if (fin) fin.exp.push([label, amt]); };
  for (const it of u.collection) it.value = Math.max(1000, Math.round(it.value * (1 + gauss(0.04, 0.08))));
  if (!free(s)) { u.heat = Math.max(0, u.heat - 10); return; }
  const fam = myFamily(s);
  const lowYear = lastCount(s, 'uw_laylow') > 0;

  if (fam && !fam.mine) {
    // The boss can fall: arrested, killed or dead of old age. An underboss steps up.
    if (chance(0.06)) {
      const old = fam.boss;
      if (u.rank === 3 && !u.rat) { fam.boss = fullName(P(s)); u.rank = 4; tally(s, 'becameBoss'); announce(s, { emoji: '👑', title: 'The new boss', text: `${old} is gone. As underboss, you now run ${fam.name}.`, tone: 'good' }); }
      else { const last = fam.name.replace(/^the | family$/g, ''); fam.boss = `${randomFirst(fam.country, chance(0.75) ? 'm' : 'f')} ${last}`; log(s, `🕴️ ${old} is gone. ${fam.boss} runs ${fam.name} now.`); }
    }
    // Getting made, and moving up.
    if (u.rank === 0 && u.respect >= MOB_RANKS[1].respect && !u.made && A(s) >= 18) {
      popup(s, { emoji: '🕴️', title: 'Getting made', handler: 'mobMade', text: `${fam.boss} says it's time you got made. First you have to prove yourself: a rat in the crew needs taking care of.`, choices: [{ label: 'Do it', value: true, tone: 'bad' }, { label: 'Refuse', value: false }] });
    } else if (u.rank >= 1 && u.rank < 3 && u.respect >= MOB_RANKS[u.rank + 1].respect && chance(0.6)) {
      u.rank++;
      announce(s, { emoji: '🕴️', title: 'Promoted', text: `${fam.boss} made you a ${mobRank(s).toLowerCase()} of ${fam.name}.`, tone: 'good' });
    }
  }
  if (fam) {
    // Rackets pay; a member kicks a share up to the boss. The crew draws a salary.
    const turf = fam.mine ? u.turf : fam.turf;
    let take = 0;
    for (const r of u.rackets) {
      const R = RACKETS[r.type];
      take += price(s, R.income) * r.lvl * (0.7 + turf / 100) * (1 - u.heat / 250) * (lowYear ? 0.5 : 1);
      u.heat = Math.min(100, u.heat + (R.heat * r.lvl) / 2);
    }
    if (take) earn(fam.mine ? 'Rackets' : 'Rackets (after kicking up)', take * (fam.mine ? 1 : 0.7));
    if (u.crew) spend('Crew payroll', u.crew * price(s, 25000));
    if (!fam.mine && u.rank < 4) addRespect(s, 1);
    if (fam.mine) addRespect(s, 2);
  }
  // The dealer climbs the ladder.
  const d = u.dealer;
  if (d && d.rank < DEALER_RANKS.length - 1 && d.rep >= DEALER_RANKS[d.rank + 1].rep && chance(0.6)) {
    d.rank++;
    if (d.rank === DEALER_RANKS.length - 1) { d.cartel = `the ${pick(country(s).cities)} Cartel`; tally(s, 'cartelBoss'); }
    announce(s, { emoji: '💊', title: 'Moving up', text: d.cartel ? `You run ${d.cartel} now. Every shipment in the country goes through you.` : `You're a ${DEALER_RANKS[d.rank].name.toLowerCase()} now.`, tone: 'good' });
  }
  // The loan book earns interest, and some of it walks away.
  if (u.book > 0) {
    earn('Loan-shark interest', u.book * 0.3);
    u.book = Math.round(u.book * (1 - randFloat(0.03, 0.15)));
    addHeat(s, Math.min(6, 2 + u.book / price(s, 1000000)));
  }
  if (u.museum) { earn('Museum tickets', collectionValue(s) * 0.05); m.fame = clamp100(m.fame + 1); u.heat = Math.max(0, u.heat - 6); }
  if (u.rat) {
    earn('Informant payments', price(s, 20000));
    if (chance(0.05)) ratFound(s); // and the web: a secret that leaks (81-web2.js) is the rest of the risk
  }
  // Heat cools, unless it boils over into a raid.
  u.heat = Math.round(clamp(u.heat - 8 - (lowYear ? 10 : 0), 0, 100));
  if (!u.rat && u.heat >= 30 && chance((u.heat - 20) / 250)) {
    u.heat = Math.max(0, u.heat - 35);
    const crime = d && d.rank >= 2 ? 'trafficking' : fam ? 'racketeering' : u.book ? 'loansharking' : m.book && !m.book.legal ? 'bookmaking' : u.collection.length ? 'fencing' : 'racketeering';
    announce(s, { emoji: '🚔', title: 'Raid', text: 'The police kicked in your door at dawn with a stack of warrants.', tone: 'bad' });
    const r = arrest(s, crime);
    if (r && r.text) log(s, r.text, 'bad');
  }
}
onChoice('mobMade', (s, ctx, yes) => {
  const u = uw(s);
  if (!inMob(s)) return;
  if (!yes) { addRespect(s, -10); return { text: "You refused. The boss won't forget it.", tone: 'bad', emoji: '🕴️' }; }
  if (chance(clamp(0.7 + skill(s, 'streetwise') / 300, 0.3, 0.92))) {
    Object.assign(u, { made: true, rank: 1 });
    addRespect(s, 10);
    addHeat(s, 15);
    add(s, { karma: -20 });
    tally(s, 'murders');
    tally(s, 'madeMan');
    return { text: `It's done. In a back room, with a candle and a picture of a saint, you became a made member of ${myFamily(s).name}.`, tone: 'good', emoji: '🕴️', title: "You're made" };
  }
  addHeat(s, 20);
  if (chance(0.5)) return arrest(s, 'attempted_murder');
  addRespect(s, -10);
  return { text: 'The rat got away. The boss is asking questions about you now.', tone: 'bad', emoji: '🕴️' };
});
onChoice('uwRatFound', (s, ctx, v) => {
  if (v === 'run') return { text: witnessProtection(s), emoji: '🧳', title: 'Witness protection' };
  if (chance(0.5)) { die(s, 'in a mob hit'); return 'They were waiting in the parking garage.'; }
  const u = uw(s);
  Object.assign(u, { fam: null, rank: 0, crew: 0, rackets: [], rat: false, enemy: u.fam });
  return { text: 'You survived the ambush, barely. You are out of the family, and they still want you dead.', tone: 'bad', emoji: '🐀' };
});

/* ---- underworld events ------------------------------------------------------------ */
EV('uw_offer', {
  ages: [16, 50], w: 0.6, emoji: '🕴️',
  when: (s) => !inMob(s) && (hasFelony(s) || skill(s, 'streetwise') >= 20) && !(M(s).uw && (M(s).uw.rat || M(s).uw.enemy)),
  text: (s) => `A well-dressed man from ${familiesIn(s, P(s).country)[0].name} says the boss has heard good things about you.`,
  choices: [
    ['Hear him out', (s) => { const f = familiesIn(s, P(s).country)[0]; Object.assign(uw(s), { fam: f.id, rank: 0, respect: 8, made: false, rackets: [] }); tally(s, 'mobJoined'); return { text: `You're an associate of ${f.name} now.`, emoji: '🕴️' }; }],
    ['Say no thanks', () => 'He smiled and said the offer stands. You hope it doesn’t.'],
  ],
});
EV('uw_rat', {
  ages: [18, 120], when: (s) => inMob(s) && uw(s).crew >= 2 && !uw(s).rat, emoji: '🐀', text: 'Someone in your crew has been talking to the feds.',
  choices: [
    ['Take care of it', (s) => { add(s, { karma: -15 }); addRespect(s, 5); addHeat(s, 5); uw(s).crew--; tally(s, 'murders'); if (chance(0.15)) return arrest(s, 'murder'); return 'The rat will never talk again.'; }],
    ['Feed them false information', (s) => { if (chance(0.5 + skill(s, 'streetwise') / 200)) { addHeat(s, -15); return 'The feds spent a month watching an empty warehouse.'; } addHeat(s, 20); return 'They figured out the tip was fake. Now they’re even more interested in you.'; }],
    ['Let it go', (s) => { addHeat(s, 20); return 'You let it go. The feds have a lot more on you now.'; }],
  ],
});
EV('uw_hit_attempt', {
  ages: [18, 120], w: 0.7, emoji: '💥',
  when: (s) => !!M(s).uw && (!!uw(s).enemy || (inMob(s) && uw(s).rank >= 2)),
  text: (s) => `${uw(s).enemy && underworldOf(s).families[uw(s).enemy] ? cap(underworldOf(s).families[uw(s).enemy].name) : 'A rival family'} sent someone to kill you.`,
  choices: [
    ['Fight back', (s) => { if (skill(s, 'martial') + skill(s, 'fitness') / 2 + randInt(0, 60) > 45) { addRespect(s, 6); return 'You fought them off. Word got around.'; } add(s, { health: -randInt(15, 35) }); if (chance(0.15)) { die(s, 'in a mob hit'); return 'They got you.'; } return 'You were badly hurt, but you lived.'; }],
    ['Run for it', (s) => { add(s, { happy: -4 }); return 'You ran. You spent the next month sleeping somewhere different every night.'; }],
    { label: 'Hire bodyguards', sub: (s) => fmtMoney(price(s, 100000)), fx: (s) => { const c = price(s, 100000); if (!pay(s, c)) return cantAfford(c); return 'Your bodyguards spotted the shooter a block away. Nobody tried again this year.'; } },
  ],
});
EV('uw_cop_bribe', {
  ages: [16, 120], when: (s) => !!M(s).uw && uw(s).heat >= 30, emoji: '🕵️', text: 'A detective offers to make your file disappear. For a price.',
  choices: [
    { label: 'Pay him', sub: (s) => fmtMoney(price(s, 50000)), fx: (s) => { const c = price(s, 50000); if (!pay(s, c)) return cantAfford(c); addHeat(s, -25); return 'Your file got very thin overnight.'; } },
    ['Refuse', () => 'He shrugged. "Your funeral."'],
  ],
});
EV('uw_mob_wedding', {
  ages: [16, 120], when: inMob, emoji: '💒', text: (s) => `You're invited to a wedding in ${myFamily(s).name}. Everyone will notice what you bring.`,
  choices: [
    { label: 'A fat envelope', sub: (s) => fmtMoney(price(s, 10000)), fx: (s) => { const c = price(s, 10000); if (!pay(s, c)) return cantAfford(c); addRespect(s, 4); return 'The boss himself thanked you for your generosity.'; } },
    ['A blender', (s) => { addRespect(s, -2); return 'People are still talking about the blender.'; }],
  ],
});
EV('uw_deadbeat', {
  ages: [18, 120], when: (s) => !!M(s).uw && uw(s).book > 0, emoji: '🦈', text: 'One of your borrowers says he can’t pay this month. Or next month.',
  choices: [
    ['Break his kneecaps', (s) => { add(s, { karma: -10 }); addHeat(s, 5); const got = Math.round(uw(s).book * 0.05); add(s, { money: got }); return `He found ${fmtMoney(got)} somewhere, fast.`; }],
    ['Give him more time', (s) => { uw(s).book = Math.round(uw(s).book * 0.95); return 'He thanked you. You will probably never see that money.'; }],
    ['Forgive the debt', (s) => { add(s, { karma: 4 }); uw(s).book = Math.round(uw(s).book * 0.97); return 'He cried. You told nobody, for your reputation’s sake.'; }],
  ],
});
EV('uw_cartel_war', {
  ages: [16, 120], when: (s) => !!(M(s).uw && M(s).uw.dealer && M(s).uw.dealer.rank >= 2), emoji: '🔥', text: 'A rival crew is moving product on your territory.',
  choices: [
    ['Push them out', (s) => { addHeat(s, 10); if (chance(0.55 + skill(s, 'streetwise') / 300)) { uw(s).dealer.rep = Math.min(100, uw(s).dealer.rep + 8); return 'They packed up and left town.'; } add(s, { health: -randInt(10, 25) }); if (chance(0.06)) { die(s, 'in a turf war'); return 'It got ugly.'; } return 'It turned violent. You were hurt, and they are still out there.'; }],
    ['Cut them in', (s) => { add(s, { money: -price(s, 20000) }); return 'You agreed to share. It cost you, but it was quiet.'; }],
    ['Back off', (s) => { uw(s).dealer.rep = Math.max(0, uw(s).dealer.rep - 10); return 'You gave up some corners. People noticed.'; }],
  ],
});
EV('uw_race_challenge', {
  ages: [16, 45], w: 0.6, when: (s) => !!myCar(s) && !!M(s).uw && uw(s).races >= 1, emoji: '🏁', text: 'Someone in a souped-up coupe challenged you to a race for money.',
  choices: [
    { label: 'Race them', sub: (s) => fmtMoney(price(s, 2000)), fx: (s) => (M(s).money < price(s, 2000) ? cantAfford(price(s, 2000)) : HANDLERS.uwRace(s, {}, price(s, 2000))) },
    ['Not tonight', () => 'You let them burn rubber without you.'],
  ],
});
