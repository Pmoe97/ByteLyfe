/* =====================================================================
 * 17-assets.js — homes, rentals, vehicles, valuables.
 *
 * Asset = { id, kind, type, name, emoji, value, paid, cond, since,
 *           beds, loanId, rentedOut, rentIncome }
 * kind: house | car | boat | aircraft | jewelry | instrument | art
 * Shop listings refresh every year (s.listings[key]).
 * M(s).housing = { type: parents | rent | own | homeless, assetId, rent, name }
 * ===================================================================== */

const SHOPS = {
  houses: { name: 'Real estate', emoji: '🏡', minAge: 18, kind: 'house' },
  cars: { name: 'Car dealership', emoji: '🚗', minAge: 16, kind: 'car' },
  boats: { name: 'Marina', emoji: '⛵', minAge: 18, kind: 'boat' },
  aircraft: { name: 'Aircraft broker', emoji: '✈️', minAge: 21, kind: 'aircraft' },
  jewelry: { name: 'Jeweler', emoji: '💍', minAge: 14, kind: 'jewelry' },
  instruments: { name: 'Music shop', emoji: '🎸', minAge: 8, kind: 'instrument' },
  art: { name: 'Art auction', emoji: '🖼️', minAge: 18, kind: 'art' },
};

function listing(s, key) {
  let l = s.listings[key];
  if (!l || l.year !== s.year) l = s.listings[key] = { year: s.year, items: genListing(s, key) };
  return l.items;
}

function genListing(s, key) {
  const out = [];
  const mk = (o) => Object.assign({ id: uid(s, 'a'), cond: 100, since: s.year }, o);
  if (key === 'houses') {
    for (let i = 0; i < 7; i++) {
      const t = weighted(HOUSE_TYPES, (x) => x.w);
      const cond = randInt(25, 100);
      out.push(mk({ kind: 'house', type: t.id, emoji: t.emoji, name: pick(HOUSE_ADJ) + ' ' + t.name, cond, beds: randInt(t.beds[0], t.beds[1]), built: s.year - randInt(0, 110), value: price(s, t.base * randFloat(0.65, 1.4) * (0.6 + cond / 250)) }));
    }
  } else if (key === 'rentals') {
    for (const t of RENTAL_TYPES) {
      if (chance(0.25)) continue;
      out.push({ id: uid(s, 'r'), type: t.id, emoji: t.emoji, name: pick(HOUSE_ADJ) + ' ' + t.name, rent: price(s, t.rent * randFloat(0.8, 1.25)) });
    }
  } else if (key === 'cars') {
    for (let i = 0; i < 7; i++) {
      const t = weighted(CAR_CLASSES, (x) => x.w);
      const age = t.used ? randInt(8, 40) : (chance(0.6) ? 0 : randInt(1, 8));
      const cond = age === 0 ? 100 : randInt(35, 95);
      const v = t.base * (age === 0 ? 1 : t.id === 'classic' ? randFloat(0.8, 2) : Math.pow(0.86, age)) * (0.5 + cond / 200) * randFloat(0.9, 1.15);
      out.push(mk({ kind: 'car', type: t.id, emoji: t.emoji, name: `${s.year - age} ${pick(CAR_BRANDS)} ${t.name}`, cond, value: price(s, Math.max(800, v)) }));
    }
  } else if (key === 'boats') {
    for (const t of pickN(BOAT_TYPES, 4)) out.push(mk({ kind: 'boat', type: t.id, emoji: t.emoji, name: `${pick(['Sea', 'Blue', 'Salt', 'Lucky', 'Wild', 'Silver'])} ${pick(['Breeze', 'Runner', 'Gull', 'Dream', 'Wake', 'Tide'])} (${t.name})`, value: price(s, t.base * randFloat(0.8, 1.3)) }));
  } else if (key === 'aircraft') {
    for (const t of AIRCRAFT_TYPES) out.push(mk({ kind: 'aircraft', type: t.id, emoji: t.emoji, name: `${pick(CAR_BRANDS)} ${t.name}`, value: price(s, t.base * randFloat(0.85, 1.25)) }));
  } else if (key === 'jewelry') {
    for (let i = 0; i < 6; i++) {
      const t = pick(JEWELRY_TYPES), [mat, mult] = pick(JEWEL_MATERIALS);
      out.push(mk({ kind: 'jewelry', type: t.id, emoji: t.emoji, name: `${mat} ${t.name}`, value: price(s, t.base * mult * randFloat(0.8, 1.4)) }));
    }
  } else if (key === 'instruments') {
    for (const t of INSTRUMENTS) out.push(mk({ kind: 'instrument', type: t.id, emoji: t.emoji, name: t.name, value: price(s, t.base * randFloat(0.9, 1.2)) }));
  } else if (key === 'art') {
    for (let i = 0; i < 5; i++) {
      const v = Math.exp(randFloat(Math.log(1500), Math.log(4000000)));
      out.push(mk({ kind: 'art', type: 'art', emoji: '🖼️', name: `${pick(ART_PIECES)} by ${pick(ART_ARTISTS)}`, value: price(s, v) }));
    }
  }
  return out.sort((a, b) => (a.value || a.rent) - (b.value || b.rent));
}

function assetUpkeep(s, a) {
  if (a.kind === 'house') return Math.round(a.value * 0.012);
  if (a.kind === 'car') return price(s, 900) + Math.round(a.value * 0.02);
  if (a.kind === 'boat') return Math.round(a.value * 0.07);
  if (a.kind === 'aircraft') return Math.round(a.value * 0.09);
  return 0;
}
function myAsset(s, id) { return M(s).assets.find((a) => a.id === id) || null; }
function residence(s) { return M(s).housing.type === 'own' ? myAsset(s, M(s).housing.assetId) : null; }
function housingLabel(s) {
  const h = M(s).housing;
  if (inPrison(s)) return 'Prison cell';
  if (h.type === 'parents') return A(s) < 18 ? 'Your family home' : "Your parents' place";
  if (h.type === 'rent') return h.name + ' (renting)';
  if (h.type === 'own') { const a = residence(s); return a ? a.name : 'Your home'; }
  return 'Homeless';
}

/* ---- buying -------------------------------------------------------- */
function openShop(s, key) {
  const shop = SHOPS[key];
  if (A(s) < shop.minAge) return { text: `You must be at least ${shop.minAge} to shop here.`, nolog: true };
  const items = listing(s, key);
  if (!items.length) return { text: 'Nothing for sale right now. Check back next year.', nolog: true };
  popup(s, {
    emoji: shop.emoji, title: shop.name, text: key === 'houses' ? 'This year’s listings.' : 'Take a look around.', handler: 'shopPick', ctx: { key },
    choices: items.map((it) => ({
      label: it.emoji + ' ' + it.name, value: it.id,
      sub: fmtMoney(it.value) + (it.kind === 'house' ? ` · ${it.beds ? it.beds + ' bed · ' : ''}condition ${it.cond}%` : it.kind === 'car' && it.cond < 100 ? ` · condition ${it.cond}%` : ''),
    })).concat([{ label: 'Leave', value: null }]),
  });
}
onChoice('shopPick', (s, ctx, id) => {
  if (!id) return;
  const it = listing(s, ctx.key).find((x) => x.id === id);
  if (!it) return;
  const choices = [{ label: '💵 Pay cash', value: 'cash', sub: fmtMoney(it.value), disabled: M(s).money < it.value }];
  const fin = financeTerms(it);
  if (fin && canBorrow(s)) {
    const down = Math.round(it.value * fin.down);
    choices.push({ label: `🏦 Finance it (${Math.round(fin.down * 100)}% down)`, value: 'loan', sub: `${fmtMoney(down)} down, ~${fmtMoney(amortize(it.value - down, fin.rate, fin.years))}/yr for ${fin.years} years`, disabled: M(s).money < down });
  }
  choices.push({ label: 'Never mind', value: null });
  popup(s, { emoji: it.emoji, title: it.name, text: `Price: ${fmtMoney(it.value)}`, handler: 'buy', ctx: { key: ctx.key, id }, choices });
});
function financeTerms(it) {
  if (it.kind === 'house') return { down: 0.2, rate: 0.065, years: 30, name: 'Mortgage' };
  if (it.kind === 'car') return { down: 0.1, rate: 0.075, years: 5, name: 'Car loan' };
  if (it.kind === 'boat' || it.kind === 'aircraft') return { down: 0.2, rate: 0.08, years: 10, name: it.kind === 'boat' ? 'Boat loan' : 'Aircraft loan' };
  return null;
}
onChoice('buy', (s, ctx, how) => {
  if (!how) return;
  const items = listing(s, ctx.key);
  const it = items.find((x) => x.id === ctx.id);
  if (!it) return;
  if (how === 'cash') {
    if (!pay(s, it.value)) return cantAfford(it.value);
  } else {
    const fin = financeTerms(it);
    const down = Math.round(it.value * fin.down);
    const yearly = amortize(it.value - down, fin.rate, fin.years);
    const income = (M(s).career ? M(s).career.salary : 0) + (M(s).ptJob ? M(s).ptJob.pay : 0) + (M(s).retired ? M(s).retired.pension : 0);
    const odds = clamp((income / (yearly * 3)) * 0.7 + Math.max(0, netWorth(s)) / (it.value * 2) - (hasFelony(s) ? 0.1 : 0), 0.02, 0.95);
    if (!chance(odds)) return { text: `The bank denied your ${fin.name.toLowerCase()} application.`, tone: 'bad', emoji: '🏦' };
    if (!pay(s, down)) return cantAfford(down);
    const loan = addLoan(s, { kind: it.kind, name: fin.name + ': ' + it.name, amount: it.value - down, rate: fin.rate, years: fin.years });
    it.loanId = loan.id;
    loan.assetId = it.id;
  }
  s.listings[ctx.key].items = items.filter((x) => x !== it);
  it.paid = it.value;
  it.since = s.year;
  M(s).assets.push(it);
  tally(s, 'purchases');
  if (it.kind === 'car') tally(s, 'carsBought');
  if (it.kind === 'house') tally(s, 'housesBought');
  add(s, { happy: clamp(Math.round(Math.log10(Math.max(10, it.value)) * 1.5), 1, 12) });
  if (it.kind === 'house' && M(s).housing.type !== 'own') {
    popup(s, { emoji: '🔑', title: 'Move in?', text: `Do you want to move into your new ${it.name.toLowerCase()}?`, handler: 'moveIn', ctx: { id: it.id }, choices: [{ label: 'Move in', value: true }, { label: 'Not yet', value: false }] });
  }
  return { text: `You bought a ${it.name} for ${fmtMoney(it.value)}.`, emoji: it.emoji, tone: 'good' };
});
onChoice('moveIn', (s, ctx, yes) => (yes ? moveInto(s, ctx.id) : undefined));
function moveInto(s, id) {
  const a = myAsset(s, id);
  if (!a) return;
  a.rentedOut = false;
  M(s).housing = { type: 'own', assetId: id, rent: 0, name: a.name };
  tally(s, 'moves');
  add(s, { happy: 4 });
  return { text: `You moved into your ${a.name}.`, emoji: '🔑' };
}

function removeAsset(s, id) {
  const m = M(s);
  const a = myAsset(s, id);
  if (!a) return;
  if (a.loanId) m.loans = m.loans.filter((l) => l.id !== a.loanId);
  m.assets = m.assets.filter((x) => x !== a);
  if (m.housing.type === 'own' && m.housing.assetId === id) {
    m.housing = relPeople(s, ['parent']).length && A(s) < 35 ? { type: 'parents', assetId: null, rent: 0, name: '' } : { type: 'homeless', assetId: null, rent: 0, name: '' };
  }
}
function sellValue(a) { return Math.round(a.value * (a.kind === 'house' ? 0.94 : 0.9)); }

/* ---- asset actions (target: asset id) ------------------------------ */
const ownedOf = (kind) => (s, id) => free(s) && !!myAsset(s, id) && (!kind || kind.includes(myAsset(s, id).kind));
defAction({
  id: 'asset_movein', cat: 'asset', target: 'asset', label: 'Move in', emoji: '🔑',
  when: (s, id) => ownedOf(['house'])(s, id) && !(M(s).housing.type === 'own' && M(s).housing.assetId === id),
  run: (s, id) => moveInto(s, id),
});
defAction({
  id: 'asset_rentout', cat: 'asset', target: 'asset', emoji: '🏷️',
  label: (s, id) => (myAsset(s, id).rentedOut ? 'Stop renting it out' : 'Rent it out'),
  sub: (s, id) => (myAsset(s, id).rentedOut ? 'Earning ' + fmtMoney(myAsset(s, id).rentIncome) + '/yr' : 'About ' + fmtMoney(Math.round(myAsset(s, id).value * 0.05)) + '/yr'),
  when: (s, id) => ownedOf(['house'])(s, id) && !(M(s).housing.type === 'own' && M(s).housing.assetId === id),
  run: (s, id) => {
    const a = myAsset(s, id);
    if (a.rentedOut) { a.rentedOut = false; return `Your tenants moved out of the ${a.name}.`; }
    a.rentedOut = true;
    a.rentIncome = Math.round(a.value * randFloat(0.04, 0.06) * (0.6 + a.cond / 250));
    return `You found tenants for your ${a.name}. They'll pay ${fmtMoney(a.rentIncome)} a year.`;
  },
});
defAction({
  id: 'asset_renovate', cat: 'asset', target: 'asset', label: 'Renovate', emoji: '🛠️',
  sub: (s, id) => fmtMoney(Math.round(myAsset(s, id).value * 0.1)),
  when: (s, id) => ownedOf(['house'])(s, id) && myAsset(s, id).cond < 98,
  run: (s, id) => {
    const a = myAsset(s, id);
    const cost = Math.round(a.value * 0.1);
    if (!pay(s, cost)) return cantAfford(cost);
    a.cond = clamp(a.cond + randInt(25, 45), 0, 100);
    a.value = Math.round(a.value * randFloat(1.04, 1.16));
    return `You renovated the ${a.name}. It's worth about ${fmtMoney(a.value)} now.`;
  },
});
defAction({
  id: 'asset_party', cat: 'asset', target: 'asset', label: 'Throw a house party', emoji: '🎉',
  when: (s, id) => ownedOf(['house'])(s, id) && M(s).housing.assetId === id && A(s) >= 16,
  run: (s, id) => {
    if (bump(s, 'houseparty') > 2) return { text: 'Your neighbors have had enough parties for one year.', nolog: true };
    const cost = price(s, 500);
    if (!pay(s, cost)) return cantAfford(cost);
    for (const p of relPeople(s, ['friend', 'bestie'])) addRel(s, p.id, randInt(2, 8));
    add(s, { happy: randInt(4, 9) });
    if (chance(0.15)) { myAsset(s, id).cond = clamp(myAsset(s, id).cond - 8, 0, 100); return 'The party was legendary. So was the damage to your living room.'; }
    return vary('You threw a {legendary|cozy|wild|themed} party. Everyone had a blast.');
  },
});
defAction({
  id: 'asset_drive', cat: 'asset', target: 'asset', emoji: '🛣️',
  label: (s, id) => ({ car: 'Go for a drive', boat: 'Take it out on the water', aircraft: 'Take it for a flight' }[myAsset(s, id).kind]),
  when: ownedOf(['car', 'boat', 'aircraft']),
  run: (s, id) => {
    const a = myAsset(s, id);
    if (bump(s, 'drive_' + id) > 2) return { text: 'You have had enough joyrides this year.', nolog: true };
    add(s, { happy: randInt(2, 6) });
    if (a.kind === 'car') {
      addSkill(s, 'driving', randFloat(1, 3));
      if (!M(s).license && chance(0.25)) { arrestMinor(s, 'nolicense'); return 'You got pulled over. No license.'; }
      const risk = 0.06 - skill(s, 'driving') / 2500 + (a.cond < 40 ? 0.04 : 0) + (trait(s, 'adventurous') ? 0.02 : 0) - (trait(s, 'anxious') ? 0.02 : 0);
      if (chance(risk)) return carAccident(s, a);
      return vary(`You took your ${a.name} for a {spin|drive along the coast|cruise downtown|late-night drive}.`);
    }
    if (chance(0.03)) { a.cond = clamp(a.cond - 25, 0, 100); add(s, { health: -randInt(3, 10) }); return `You had a scary accident in your ${a.name}, but you're okay.`; }
    return `You took your ${a.name} out. ${a.kind === 'boat' ? 'The water was perfect.' : 'The view was incredible.'}`;
  },
});
function carAccident(s, a) {
  a.cond = clamp(a.cond - randInt(20, 60), 0, 100);
  a.value = Math.round(a.value * (0.5 + a.cond / 200));
  const r = rand();
  if (r < 0.03) { die(s, 'a car crash'); return 'You crashed your car.'; }
  if (r < 0.35) { getSick(s, pick(['broken_arm', 'broken_leg', 'concussion'])); add(s, { health: -randInt(5, 15) }); return { text: `You crashed your ${a.name} and ended up in the hospital.`, tone: 'bad' }; }
  add(s, { happy: -5 });
  return { text: `You had a fender bender in your ${a.name}.`, tone: 'bad' };
}
defAction({
  id: 'asset_repair', cat: 'asset', target: 'asset', label: 'Repair', emoji: '🔧',
  sub: (s, id) => fmtMoney(Math.max(price(s, 200), Math.round(myAsset(s, id).value * 0.08))),
  when: (s, id) => ownedOf(['car', 'boat', 'aircraft'])(s, id) && myAsset(s, id).cond < 90,
  run: (s, id) => {
    const a = myAsset(s, id);
    const cost = Math.max(price(s, 200), Math.round(a.value * 0.08));
    if (!pay(s, cost)) return cantAfford(cost);
    a.cond = clamp(a.cond + randInt(30, 50), 0, 100);
    return `Your ${a.name} has been repaired.`;
  },
});
defAction({
  id: 'asset_play', cat: 'asset', target: 'asset', label: 'Practice', emoji: '🎶',
  when: ownedOf(['instrument']),
  run: (s, id) => {
    const n = bump(s, 'practice');
    addSkill(s, 'music', randFloat(2, 5) / n);
    add(s, { happy: 2 });
    return `You practiced your ${myAsset(s, id).name.toLowerCase()}. ${skill(s, 'music') > 60 ? 'You sound great.' : 'The neighbors are coping.'}`;
  },
});
defAction({
  id: 'asset_gift', cat: 'asset', target: 'asset', label: 'Give as a gift', emoji: '🎁',
  when: (s, id) => ownedOf(['jewelry', 'art', 'instrument', 'car'])(s, id) && relPeople(s).length > 0,
  run: (s, id) => {
    const people = relPeople(s).filter((p) => ageOf(s, p) >= 5).slice(0, 25);
    popup(s, {
      emoji: '🎁', title: 'Give it to...', handler: 'giftAsset', ctx: { id },
      choices: people.map((p) => ({ label: fullName(p), value: p.id, sub: kinLabel(relOf(s, p.id).kind, p) })).concat([{ label: 'Never mind', value: null }]),
    });
  },
});
onChoice('giftAsset', (s, ctx, pid) => {
  const a = myAsset(s, ctx.id);
  if (!pid || !a || !s.people[pid]) return;
  removeAsset(s, a.id);
  const boost = clamp(Math.round(Math.log10(Math.max(10, a.value)) * 5), 5, 40);
  addRel(s, pid, boost);
  add(s, { karma: 2, happy: 3 });
  return `You gave your ${a.name} to ${nm(s, pid)}. They loved it.`;
});
defAction({
  id: 'asset_sell', cat: 'asset', target: 'asset', label: 'Sell', emoji: '💲',
  sub: (s, id) => 'About ' + fmtMoney(sellValue(myAsset(s, id))),
  when: ownedOf(null),
  run: (s, id) => {
    const a = myAsset(s, id);
    const loan = a.loanId ? M(s).loans.find((l) => l.id === a.loanId) : null;
    const gross = Math.round(sellValue(a) * randFloat(0.93, 1.05));
    const owed = loan ? loan.balance : 0;
    removeAsset(s, id);
    add(s, { money: gross - owed });
    tally(s, 'sales');
    return `You sold your ${a.name} for ${fmtMoney(gross)}${owed ? ` and paid off the ${fmtMoney(owed)} loan` : ''}.`;
  },
});

/* ---- housing actions ----------------------------------------------- */
defAction({
  id: 'find_rental', cat: 'home', label: 'Rent a place', emoji: '🏢', desc: 'Move out and rent.',
  when: (s) => free(s) && A(s) >= 18 && M(s).housing.type !== 'rent',
  run: (s) => {
    const items = listing(s, 'rentals');
    popup(s, {
      emoji: '🏢', title: 'Rentals', text: 'Rent is paid yearly. You will also pay living costs.', handler: 'rent',
      choices: items.map((r) => ({ label: r.emoji + ' ' + r.name, value: r.id, sub: fmtMoney(r.rent) + '/yr' })).concat([{ label: 'Never mind', value: null }]),
    });
  },
});
onChoice('rent', (s, ctx, id) => {
  if (!id) return;
  const r = listing(s, 'rentals').find((x) => x.id === id);
  if (!r) return;
  const deposit = Math.round(r.rent / 6);
  if (!pay(s, deposit)) return cantAfford(deposit);
  const first = M(s).housing.type === 'parents';
  M(s).housing = { type: 'rent', assetId: null, rent: r.rent, name: r.name };
  tally(s, 'moves');
  add(s, { happy: first ? 8 : 3 });
  return { text: `You${first ? ' moved out of your parents’ place and' : ''} signed a lease on a ${r.name.toLowerCase()}. Deposit: ${fmtMoney(deposit)}.`, emoji: '🔑', tone: 'good' };
});
defAction({
  id: 'move_home', cat: 'home', label: 'Move back in with your parents', emoji: '🏠', desc: 'Free rent. Some pride lost.',
  when: (s) => free(s) && A(s) >= 18 && M(s).housing.type !== 'parents' && relPeople(s, ['parent']).length > 0,
  run: (s) => {
    const best = Math.max(...relPeople(s, ['parent']).map((p) => relOf(s, p.id).rel));
    if (!chance(clamp(best / 80, 0.1, 0.95))) return { text: 'Your parents said no. They turned your room into a home gym.', tone: 'bad' };
    M(s).housing = { type: 'parents', assetId: null, rent: 0, name: '' };
    add(s, { happy: A(s) > 28 ? -4 : 0 });
    return 'You moved back in with your parents.';
  },
});

function assetTick(s) {
  for (const a of M(s).assets) {
    if (a.kind === 'house') {
      a.value = Math.round(a.value * (1 + gauss(0.035, 0.07)));
      a.cond = clamp(a.cond - randInt(0, 3), 0, 100);
      if (a.rentedOut && chance(0.08)) { a.cond = clamp(a.cond - randInt(5, 20), 0, 100); log(s, `🏚️ Your tenants trashed the ${a.name}.`, 'bad'); }
    } else if (a.kind === 'car') {
      a.value = Math.round(a.value * (a.type === 'classic' ? randFloat(0.98, 1.08) : randFloat(0.82, 0.9)));
      a.cond = clamp(a.cond - randInt(2, 8), 0, 100);
      if (a.cond < 25 && chance(0.25)) log(s, `🚗 Your ${a.name} broke down again.`, 'bad');
    } else if (a.kind === 'boat') {
      a.value = Math.round(a.value * randFloat(0.88, 0.96)); a.cond = clamp(a.cond - randInt(2, 6), 0, 100);
    } else if (a.kind === 'aircraft') {
      a.value = Math.round(a.value * randFloat(0.9, 0.96)); a.cond = clamp(a.cond - randInt(1, 5), 0, 100);
    } else if (a.kind === 'jewelry') {
      a.value = Math.round(a.value * (1 + gauss(0.02, 0.05)));
    } else if (a.kind === 'art') {
      a.value = Math.round(a.value * Math.max(0.3, 1 + gauss(0.04, 0.25)));
    } else if (a.kind === 'instrument') {
      a.value = Math.round(a.value * randFloat(0.92, 1.0));
    }
    a.value = Math.max(50, a.value);
  }
}
