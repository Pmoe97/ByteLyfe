/* =====================================================================
 * 58-zoo.js — Zoo & Wildlife Sanctuary expansion on the business engine.
 *
 * A zoo is a company (industry 'zoo') with co.zoo = {
 *   ticketPrice: 0..3 (ZOO_TICKET_PRICES),
 *   welfare: 0..100,
 *   visitorSat: 0..100,
 *   escapes: count,
 *   incidents: count,
 *   enriched: bool,
 *   inspected: bool,
 *   vetChecked: bool,
 *   exhibits: [ { id, biome, name, cap, condition, security, enriched } ],
 *   animals: [ { id, sp, name, sex, age, health, happiness, exhibitId } ],
 *   breeding: [ { id, sp, sireId, damId, sireName, damName, progress, target } ]
 * }
 * zooMods feeds bizForecast; zooYear runs inside companyYear.
 * ===================================================================== */

const ZOO_TICKET_PRICES = [
  { id: 'discount', name: 'Discount', fee: 15, mult: 0.75, demand: 1.3, desc: 'Budget admission. Heavy crowds, thinner margins.' },
  { id: 'standard', name: 'Standard', fee: 28, mult: 1.0, demand: 1.0, desc: 'Balanced pricing for general admission.' },
  { id: 'premium', name: 'Premium', fee: 45, mult: 1.5, demand: 0.8, desc: 'Higher admission with tram tours and guidebooks.' },
  { id: 'vip', name: 'VIP Safari Pass', fee: 75, mult: 2.2, demand: 0.6, desc: 'Behind-the-scenes passes and private feeding encounters.' },
];

function zooTicketLabel(s, t) {
  return `${t.name} (${fmtMoney(price(s, t.fee))})`;
}

const ZOO_BIOMES = {
  savanna: { name: 'African Savanna', emoji: '🌾', cost: 120000, upkeep: 18000, cap: 8, desc: 'Open grasslands with watering holes and acacia shade.' },
  jungle: { name: 'Tropical Jungle', emoji: '🌴', cost: 140000, upkeep: 22000, cap: 8, desc: 'Canopy vines, climbing structures and humid misting.' },
  arctic: { name: 'Arctic Tundra', emoji: '❄️', cost: 180000, upkeep: 28000, cap: 6, desc: 'Glacial rocks with deep chilled saltwater diving pools.' },
  bigcats: { name: 'Predator Ridge', emoji: '⛰️', cost: 160000, upkeep: 24000, cap: 6, desc: 'High-security rock bluffs with reinforced barriers.' },
  reptile: { name: 'Reptile Biodome', emoji: '🦎', cost: 110000, upkeep: 15000, cap: 10, desc: 'Climate-controlled terrarium dome with heated rockbeds.' },
  aquatic: { name: 'Lagoon & Wetlands', emoji: '🌊', cost: 130000, upkeep: 20000, cap: 8, desc: 'Filtered lagoons, sunning banks and underwater viewing.' },
  outback: { name: 'Outback Bush', emoji: '🦘', cost: 100000, upkeep: 14000, cap: 8, desc: 'Red dirt runs, shaded shelters and eucalyptus branches.' },
  aviary: { name: 'Grand Aviary', emoji: '🦅', cost: 125000, upkeep: 16000, cap: 12, desc: 'Soaring free-flight mesh dome with high nesting branches.' },
};

const ZOO_SPECIES = {
  zebra: { name: 'Plains Zebra', emoji: '🦓', biome: 'savanna', tier: 'common', appeal: 75, diet: 2200, danger: 15, life: 22, breedYears: 1, cost: 12000 },
  otter: { name: 'River Otter', emoji: '🦦', biome: 'aquatic', tier: 'common', appeal: 80, diet: 1800, danger: 10, life: 15, breedYears: 1, cost: 14000 },
  flamingo: { name: 'Greater Flamingo', emoji: '🦩', biome: 'aquatic', tier: 'common', appeal: 74, diet: 1200, danger: 5, life: 30, breedYears: 1, cost: 10000 },
  kangaroo: { name: 'Red Kangaroo', emoji: '🦘', biome: 'outback', tier: 'common', appeal: 76, diet: 1500, danger: 25, life: 18, breedYears: 1, cost: 15000 },
  giraffe: { name: 'Giraffe', emoji: '🦒', biome: 'savanna', tier: 'uncommon', appeal: 85, diet: 3500, danger: 20, life: 25, breedYears: 1, cost: 35000 },
  chimpanzee: { name: 'Chimpanzee', emoji: '🐵', biome: 'jungle', tier: 'uncommon', appeal: 84, diet: 2800, danger: 45, life: 35, breedYears: 1, cost: 32000 },
  penguin: { name: 'Emperor Penguin', emoji: '🐧', biome: 'arctic', tier: 'uncommon', appeal: 88, diet: 2000, danger: 5, life: 20, breedYears: 1, cost: 38000 },
  koala: { name: 'Koala', emoji: '🐨', biome: 'outback', tier: 'uncommon', appeal: 86, diet: 2200, danger: 10, life: 15, breedYears: 1, cost: 34000 },
  tortoise: { name: 'Galapagos Tortoise', emoji: '🐢', biome: 'reptile', tier: 'uncommon', appeal: 78, diet: 1200, danger: 5, life: 100, breedYears: 2, cost: 28000 },
  eagle: { name: 'Golden Eagle', emoji: '🦅', biome: 'aviary', tier: 'uncommon', appeal: 80, diet: 1600, danger: 30, life: 30, breedYears: 1, cost: 30000 },
  wolf: { name: 'Timber Wolf', emoji: '🐺', biome: 'bigcats', tier: 'uncommon', appeal: 84, diet: 3000, danger: 50, life: 16, breedYears: 1, cost: 36000 },
  lion: { name: 'African Lion', emoji: '🦁', biome: 'savanna', tier: 'rare', appeal: 92, diet: 4800, danger: 65, life: 16, breedYears: 1, cost: 85000 },
  tiger: { name: 'Bengal Tiger', emoji: '🐅', biome: 'bigcats', tier: 'rare', appeal: 93, diet: 5200, danger: 70, life: 18, breedYears: 1, cost: 90000 },
  cheetah: { name: 'Cheetah', emoji: '🐆', biome: 'savanna', tier: 'rare', appeal: 85, diet: 4000, danger: 50, life: 14, breedYears: 1, cost: 80000 },
  komodo: { name: 'Komodo Dragon', emoji: '🦎', biome: 'reptile', tier: 'rare', appeal: 83, diet: 2600, danger: 60, life: 30, breedYears: 1, cost: 75000 },
  elephant: { name: 'African Elephant', emoji: '🐘', biome: 'savanna', tier: 'legendary', appeal: 98, diet: 7800, danger: 35, life: 60, breedYears: 2, cost: 220000 },
  rhino: { name: 'White Rhino', emoji: '🦏', biome: 'savanna', tier: 'legendary', appeal: 90, diet: 6200, danger: 45, life: 45, breedYears: 2, cost: 200000 },
  gorilla: { name: 'Mountain Gorilla', emoji: '🦍', biome: 'jungle', tier: 'legendary', appeal: 96, diet: 4200, danger: 55, life: 40, breedYears: 2, cost: 240000 },
  panda: { name: 'Giant Panda', emoji: '🐼', biome: 'jungle', tier: 'legendary', appeal: 100, diet: 6800, danger: 25, life: 28, breedYears: 2, cost: 280000 },
  polar_bear: { name: 'Polar Bear', emoji: '🐻‍❄️', biome: 'arctic', tier: 'legendary', appeal: 95, diet: 6400, danger: 75, life: 25, breedYears: 2, cost: 250000 },
};

const ZOO_ANIMAL_NAMES = ['Kibo', 'Simba', 'Nala', 'Raja', 'Zara', 'Barnaby', 'Pip', 'Luna', 'Milo', 'Koko', 'Toby', 'Bella', 'Thor', 'Freya', 'Echo', 'Atlas', 'Nova', 'Ziggy', 'Daisy', 'Samson'];
const ZOO_BABY_NAMES = ['Pip', 'Peanut', 'Milo', 'Nala', 'Koba', 'Luna', 'Kibo', 'Ziggy', 'Koko', 'Sunny', 'Ollie', 'Puff', 'Bambi', 'Cleo'];

function ownsZoo(s) {
  return companies(s).some((c) => !c.closed && c.ind === 'zoo');
}

function runsZoo(s, id) {
  const co = company(s, id);
  return canManage(s, co) && co.ind === 'zoo';
}

function zooOf(co) {
  if (co.zoo) return co.zoo;
  const ex1 = { id: 'ex_savanna_' + co.id, biome: 'savanna', name: 'Savanna Plains', cap: 8, condition: 100, security: 85, enriched: false };
  const ex2 = { id: 'ex_jungle_' + co.id, biome: 'jungle', name: 'Primate Forest', cap: 8, condition: 100, security: 85, enriched: false };
  co.zoo = {
    ticketPrice: 1, // Standard
    welfare: 80,
    visitorSat: 80,
    escapes: 0,
    incidents: 0,
    enriched: false,
    inspected: false,
    vetChecked: false,
    exhibits: [ex1, ex2],
    animals: [
      { id: 'an_1_' + co.id, sp: 'zebra', name: 'Stripes', sex: 'm', age: 4, health: 90, happiness: 85, exhibitId: ex1.id },
      { id: 'an_2_' + co.id, sp: 'zebra', name: 'Dawn', sex: 'f', age: 3, health: 95, happiness: 90, exhibitId: ex1.id },
      { id: 'an_3_' + co.id, sp: 'chimpanzee', name: 'Barnaby', sex: 'm', age: 6, health: 92, happiness: 85, exhibitId: ex2.id },
    ],
    breeding: [],
  };
  return co.zoo;
}

/* ---- yearly modifiers & simulation ---------------------------------- */

// What the zoo adds to bizForecast: visitor demand pull, reputation pull, and diet/enclosure upkeeps.
function zooMods(s, co) {
  const z = zooOf(co);
  const T = ZOO_TICKET_PRICES[z.ticketPrice] || ZOO_TICKET_PRICES[1];

  // Animal appeal & variety:
  let appealSum = 0;
  const spSeen = new Set();
  for (const a of z.animals) {
    const def = ZOO_SPECIES[a.sp];
    if (def) {
      appealSum += def.appeal * (a.happiness / 100);
      spSeen.add(a.sp);
    }
  }
  const animalMult = clamp(0.75 + Math.sqrt(appealSum) / 22, 0.75, 2.5);
  const varietyMult = clamp(1 + (spSeen.size - 2) * 0.05, 0.9, 1.6);
  const welfareMult = (0.7 + z.welfare / 250) * (0.7 + z.visitorSat / 250);

  // Demand multiplier on revenue:
  const revMult = clamp(T.demand * T.mult * animalMult * varietyMult * welfareMult, 0.35, 3.2);

  // Upkeeps:
  const dietCosts = sum(z.animals, (a) => {
    const def = ZOO_SPECIES[a.sp];
    return def ? price(s, def.diet) : 0;
  });
  const habitatCosts = sum(z.exhibits, (e) => {
    const b = ZOO_BIOMES[e.biome];
    return b ? price(s, b.upkeep) : 0;
  });
  const totalCost = dietCosts + habitatCosts;

  // Reputation pull:
  let repPull = 0;
  if (z.welfare >= 85) repPull += 4;
  else if (z.welfare < 50) repPull -= 6;
  if (spSeen.size >= 8) repPull += 3;

  return { rev: revMult, rep: repPull, cost: totalCost };
}

function zooYear(s, co, revenue) {
  const z = zooOf(co);
  const out = { extraRev: 0, cost: 0 };
  const mine = co.ceo === 'you' && free(s);

  // 1. Animals age & mortality:
  const surviving = [];
  for (const a of z.animals) {
    a.age++;
    const def = ZOO_SPECIES[a.sp];
    let died = false;
    if (def && a.age > def.life) {
      const deathChance = Math.min(0.65, (a.age - def.life) * 0.18 + (100 - a.health) / 200);
      if (chance(deathChance)) {
        died = true;
        if (mine) log(s, `💀 ${a.name} the ${def.name} passed away peacefully of old age at ${a.age}.`, 'bad');
      }
    }
    if (!died) surviving.push(a);
  }
  z.animals = surviving;

  // 2. Staffing & Animal Welfare:
  const keepers = co.team.ops.n;
  const needKeepers = Math.max(1, Math.ceil(z.animals.length / 3.5));
  if (keepers >= needKeepers) {
    z.welfare = clamp100(z.welfare + randInt(1, 4));
    for (const a of z.animals) {
      a.happiness = clamp100(a.happiness + randInt(2, 6));
      a.health = clamp100(a.health + randInt(1, 4));
    }
  } else {
    const under = (needKeepers - keepers) / needKeepers;
    z.welfare = clamp100(z.welfare - Math.round(under * 12));
    for (const a of z.animals) {
      a.happiness = clamp100(a.happiness - randInt(3, 8));
      a.health = clamp100(a.health - randInt(2, 6));
    }
    if (mine && keepers < needKeepers && chance(0.5)) {
      log(s, `⚠️ ${co.name} is short on zookeepers. Animal enclosures are getting messy and welfare is declining.`, 'bad');
    }
  }

  // 3. Visitor Satisfaction:
  const appealTotal = sum(z.animals, (a) => (ZOO_SPECIES[a.sp] ? ZOO_SPECIES[a.sp].appeal : 50));
  const targetSat = clamp(Math.round(40 + z.welfare * 0.35 + Math.min(25, appealTotal / 25)), 20, 100);
  z.visitorSat = clamp100(Math.round(z.visitorSat * 0.7 + targetSat * 0.3));

  // 4. Enclosure Wear & Tear:
  for (const e of z.exhibits) {
    e.condition = clamp(e.condition - randInt(2, 5), 10, 100);
  }

  // 5. Breeding Programs:
  const zoologistPower = co.team.rnd.n * (0.6 + co.team.rnd.skill / 100);
  const remainingBreeding = [];
  for (const b of z.breeding) {
    b.progress += Math.max(1, Math.round(zoologistPower * 1.2));
    if (b.progress >= b.target) {
      const def = ZOO_SPECIES[b.sp];
      const babyName = pick(ZOO_BABY_NAMES);
      const babySex = chance(0.5) ? 'm' : 'f';
      const baby = {
        id: uid(s, 'an'),
        sp: b.sp,
        name: babyName,
        sex: babySex,
        age: 0,
        health: 95,
        happiness: 95,
        exhibitId: z.animals.find((a) => a.id === b.damId)?.exhibitId || z.exhibits[0].id,
      };
      z.animals.push(baby);
      tally(s, 'zooBabiesBorn');
      co.rep = clamp100(co.rep + (def && (def.tier === 'rare' || def.tier === 'legendary') ? 6 : 3));
      z.visitorSat = clamp100(z.visitorSat + 10);
      co.team.rnd.morale = clamp100(co.team.rnd.morale + 12);
      if (mine) {
        log(s, `🎉 Celebration at ${co.name}! A healthy baby ${def ? def.name : 'animal'} named ${babyName} was born in the conservation program!`, 'good');
      }
    } else {
      remainingBreeding.push(b);
    }
  }
  z.breeding = remainingBreeding;

  // 6. Conservation Research Grants:
  if (co.team.rnd.n >= 2 && co.team.rnd.skill >= 35 && chance(0.4)) {
    const grant = price(s, randInt(50000, 180000));
    out.extraRev += grant;
    co.rep = clamp100(co.rep + 2);
    if (mine) {
      log(s, `🔬 ${co.name}'s zoology research team won a ${fmtMoney(grant)} wildlife conservation grant!`, 'good');
    }
  }

  // 7. Containment Breach / Escape Incident:
  const dangerousCount = z.animals.filter((a) => ZOO_SPECIES[a.sp] && ZOO_SPECIES[a.sp].danger >= 50).length;
  const poorExhibits = z.exhibits.filter((e) => e.condition < 40).length;
  const escapeRisk = clamp(dangerousCount * 0.01 + poorExhibits * 0.04 - (keepers >= needKeepers ? 0.03 : 0), 0.01, 0.25);
  if (chance(escapeRisk)) {
    z.escapes++;
    const escapee = pick(z.animals.filter((a) => ZOO_SPECIES[a.sp] && ZOO_SPECIES[a.sp].danger >= 40)) || pick(z.animals);
    const def = escapee ? ZOO_SPECIES[escapee.sp] : null;
    const spName = def ? def.name : 'animal';
    if (mine) {
      popup(s, {
        emoji: '🚨',
        title: 'Containment Breach!',
        text: `Alarms blare across the grounds: ${escapee ? escapee.name : 'an animal'}, a ${spName}, has broken past its enclosure barrier! Visitors are panicking.`,
        handler: 'zooEscape',
        ctx: { co: co.id, animal: escapee ? escapee.id : null },
        choices: [
          { label: 'Deploy the tranquilizer dart team', value: 'dart', sub: 'Calm and professional. Requires cash for response protocol.' },
          { label: 'Sound alarms and evacuate the park', value: 'evacuate', sub: 'Safety first. Costs admission refunds and hurts reputation.' },
          { label: 'Lure back with favorite food treats', value: 'food', sub: 'Low cost, but risks injury or escalation.' },
        ],
      });
    } else {
      out.cost += price(s, 25000);
      co.rep = clamp100(co.rep - 4);
    }
  }

  // Reset annual actions
  z.enriched = false;
  z.inspected = false;
  z.vetChecked = false;

  return out;
}

onChoice('zooEscape', (s, ctx, val) => {
  const co = company(s, ctx.co);
  if (!co) return;
  const z = zooOf(co);
  if (val === 'dart') {
    const cost = price(s, 15000);
    co.cash -= cost;
    co.rep = clamp100(co.rep - 2);
    return { text: `The keeper dart team successfully tranquilized the animal safely and restored containment. Emergency response cost ${fmtMoney(cost)}.`, emoji: '🎯', tone: 'good' };
  } else if (val === 'evacuate') {
    const loss = price(s, 35000);
    co.cash -= loss;
    co.rep = clamp100(co.rep - 6);
    z.visitorSat = clamp100(z.visitorSat - 15);
    return { text: `You evacuated all guests calmly without injuries. Refunds and lost ticket sales cost ${fmtMoney(loss)}.`, emoji: '📢', tone: 'bad' };
  } else {
    if (chance(0.6)) {
      return { text: 'Remarkably, keepers rattled the feed buckets and the escapee strolled right back into its night quarters!', emoji: '🥩', tone: 'good' };
    } else {
      const damages = price(s, 50000);
      co.cash -= damages;
      co.rep = clamp100(co.rep - 10);
      return { text: `The animal rampaged through a gift shop before being netted! Repairs and incident fines cost ${fmtMoney(damages)}.`, emoji: '💥', tone: 'bad' };
    }
  }
});

/* ---- Zoo Actions (cat: 'company', target: 'company') ---------------- */

defAction({
  id: 'zoo_ticket',
  cat: 'company',
  target: 'company',
  label: 'Ticket pricing',
  emoji: '🎟️',
  when: runsZoo,
  sub: (s, id) => zooTicketLabel(s, ZOO_TICKET_PRICES[zooOf(company(s, id)).ticketPrice] || ZOO_TICKET_PRICES[1]),
  run: (s, id) => {
    const co = company(s, id), z = zooOf(co);
    popup(s, {
      emoji: '🎟️',
      title: 'Zoo Admission Pricing',
      text: 'Lower ticket prices bring packed crowds and higher concession volumes. Premium passes cater to high-end visitors and safari experiences.',
      handler: 'zooTicket',
      ctx: { co: id },
      choices: ZOO_TICKET_PRICES.map((t, i) => ({
        label: zooTicketLabel(s, t),
        value: i,
        sub: t.desc,
      })).concat([{ label: 'Never mind', value: null }]),
    });
  },
});

onChoice('zooTicket', (s, ctx, i) => {
  const co = company(s, ctx.co);
  if (!co || i == null) return;
  zooOf(co).ticketPrice = i;
  return { text: `${co.name}'s admission prices are set to ${zooTicketLabel(s, ZOO_TICKET_PRICES[i])}.`, quiet: true };
});

defAction({
  id: 'zoo_acquire',
  cat: 'company',
  target: 'company',
  label: 'Acquire an animal',
  emoji: '🐾',
  when: runsZoo,
  sub: (s, id) => `From global conservation exchanges & rescues`,
  run: (s, id) => {
    const co = company(s, id), z = zooOf(co);
    const spKeys = Object.keys(ZOO_SPECIES);
    const candidates = [];
    for (let i = 0; i < 4; i++) {
      const k = pick(spKeys);
      const def = ZOO_SPECIES[k];
      const name = pick(ZOO_ANIMAL_NAMES);
      const sex = chance(0.5) ? 'm' : 'f';
      const age = randInt(1, Math.min(10, Math.floor(def.life * 0.4)));
      const cost = price(s, def.cost);
      candidates.push({ sp: k, name, sex, age, cost });
    }
    popup(s, {
      emoji: '🐾',
      title: 'Acquire an Animal',
      text: `Choose an animal to bring to ${co.name}. It must have an enclosure habitat matching its biome with spare capacity.`,
      handler: 'zooAcquirePick',
      ctx: { co: id, candidates },
      choices: candidates.map((c, idx) => {
        const def = ZOO_SPECIES[c.sp];
        const b = ZOO_BIOMES[def.biome];
        const matchEx = z.exhibits.find((e) => e.biome === def.biome && z.animals.filter((a) => a.exhibitId === e.id).length < e.cap);
        const disabled = co.cash < c.cost || !matchEx;
        let sub = `${fmtMoney(c.cost)} · ${c.sex === 'm' ? 'Male' : 'Female'}, age ${c.age} · ${b.name}`;
        if (!matchEx) sub += ' (no habitat capacity)';
        else if (co.cash < c.cost) sub += ' (cannot afford)';
        return {
          label: `${def.emoji} ${c.name} the ${def.name} (${cap(def.tier)})`,
          value: idx,
          sub,
          disabled,
        };
      }).concat([{ label: 'Never mind', value: null }]),
    });
  },
});

onChoice('zooAcquirePick', (s, ctx, idx) => {
  const co = company(s, ctx.co);
  if (!co || idx == null) return;
  const c = ctx.candidates[idx];
  if (!c) return;
  const z = zooOf(co);
  const def = ZOO_SPECIES[c.sp];
  const ex = z.exhibits.find((e) => e.biome === def.biome && z.animals.filter((a) => a.exhibitId === e.id).length < e.cap);
  if (!ex) return { text: `You do not have space in a ${ZOO_BIOMES[def.biome].name} enclosure.`, nolog: true };
  if (co.cash < c.cost) return { text: `${co.name} cannot afford ${fmtMoney(c.cost)}.`, nolog: true };

  co.cash -= c.cost;
  const newAnimal = {
    id: uid(s, 'an'),
    sp: c.sp,
    name: c.name,
    sex: c.sex,
    age: c.age,
    health: randInt(85, 98),
    happiness: randInt(80, 95),
    exhibitId: ex.id,
  };
  z.animals.push(newAnimal);
  co.rep = clamp100(co.rep + randInt(1, 3));
  return {
    text: `Welcomed ${def.emoji} ${c.name} the ${def.name} to ${co.name}'s ${ex.name}! Visitors are thrilled to see them.`,
    emoji: def.emoji,
    tone: 'good',
  };
});

defAction({
  id: 'zoo_exhibit',
  cat: 'company',
  target: 'company',
  label: 'Build a new exhibit',
  emoji: '🏗️',
  when: runsZoo,
  sub: (s, id) => `${zooOf(company(s, id)).exhibits.length} exhibits currently`,
  run: (s, id) => {
    const co = company(s, id), z = zooOf(co);
    popup(s, {
      emoji: '🏗️',
      title: 'Build Enclosure Habitat',
      text: 'Expanding your zoo with specialized biomes lets you house new species and draw larger crowds.',
      handler: 'zooExhibitPick',
      ctx: { co: id },
      choices: Object.entries(ZOO_BIOMES).map(([biomeKey, b]) => {
        const cost = price(s, b.cost);
        return {
          label: `${b.emoji} ${b.name} (${fmtMoney(cost)})`,
          value: biomeKey,
          sub: `Capacity ${b.cap} animals · ${b.desc}`,
          disabled: co.cash < cost,
        };
      }).concat([{ label: 'Never mind', value: null }]),
    });
  },
});

onChoice('zooExhibitPick', (s, ctx, biomeKey) => {
  const co = company(s, ctx.co);
  if (!co || !biomeKey) return;
  const b = ZOO_BIOMES[biomeKey];
  const cost = price(s, b.cost);
  if (co.cash < cost) return { text: `${co.name} cannot afford ${fmtMoney(cost)}.`, nolog: true };

  co.cash -= cost;
  const z = zooOf(co);
  const countSame = z.exhibits.filter((e) => e.biome === biomeKey).length;
  const name = countSame > 0 ? `${b.name} ${countSame + 1}` : b.name;
  const newEx = {
    id: uid(s, 'ex'),
    biome: biomeKey,
    name,
    cap: b.cap,
    condition: 100,
    security: 90,
    enriched: false,
  };
  z.exhibits.push(newEx);
  co.rep = clamp100(co.rep + 3);
  return {
    text: `Completed construction on ${b.emoji} ${name}! Room for ${b.cap} animals.`,
    emoji: '🏗️',
    tone: 'good',
  };
});

defAction({
  id: 'zoo_breed',
  cat: 'company',
  target: 'company',
  label: 'Conservation breeding',
  emoji: '🧬',
  when: runsZoo,
  sub: (s, id) => `${zooOf(company(s, id)).breeding.length} active programs`,
  run: (s, id) => {
    const co = company(s, id), z = zooOf(co);
    if (co.team.rnd.n < 1) {
      return { text: `You need at least one Zoologist on your R&D team to manage a conservation breeding program.`, nolog: true };
    }
    // Find species with both adult male and female not already in breeding
    const eligible = [];
    const breedingSps = new Set(z.breeding.map((b) => b.sp));
    const spMap = {};
    for (const a of z.animals) {
      if (!spMap[a.sp]) spMap[a.sp] = { m: [], f: [] };
      if (a.sex === 'm') spMap[a.sp].m.push(a);
      else if (a.sex === 'f') spMap[a.sp].f.push(a);
    }
    for (const [sp, p] of Object.entries(spMap)) {
      if (p.m.length > 0 && p.f.length > 0 && !breedingSps.has(sp)) {
        eligible.push({ sp, sire: p.m[0], dam: p.f[0] });
      }
    }
    if (!eligible.length) {
      return { text: 'You do not have any eligible pairs of male and female animals of the same species ready for breeding.', nolog: true };
    }
    popup(s, {
      emoji: '🧬',
      title: 'Species Survival Plan',
      text: 'Pair adult animals to participate in the scientific breeding registry. Zoologists oversee ovulation, genetic diversity, and nursery care.',
      handler: 'zooBreedPick',
      ctx: { co: id, eligible },
      choices: eligible.map((el, i) => {
        const def = ZOO_SPECIES[el.sp];
        return {
          label: `${def.emoji} Breed ${def.name}`,
          value: i,
          sub: `Pair: ${el.sire.name} (♂) & ${el.dam.name} (♀) · Gestation target ~${def.breedYears} yr`,
        };
      }).concat([{ label: 'Never mind', value: null }]),
    });
  },
});

onChoice('zooBreedPick', (s, ctx, i) => {
  const co = company(s, ctx.co);
  if (!co || i == null) return;
  const el = ctx.eligible[i];
  if (!el) return;
  const z = zooOf(co);
  const def = ZOO_SPECIES[el.sp];
  z.breeding.push({
    id: uid(s, 'br'),
    sp: el.sp,
    sireId: el.sire.id,
    damId: el.dam.id,
    sireName: el.sire.name,
    damName: el.dam.name,
    progress: 0,
    target: (def ? def.breedYears : 1) * 2,
  });
  return {
    text: `Enrolled ${el.sire.name} and ${el.dam.name} into the ${def ? def.name : 'species'} conservation breeding program. Your zoologists are monitoring them closely.`,
    emoji: '🧬',
    tone: 'good',
  };
});

defAction({
  id: 'zoo_enrich',
  cat: 'company',
  target: 'company',
  label: 'Fund habitat enrichment',
  emoji: '🤹',
  when: (s, id) => runsZoo(s, id) && !zooOf(company(s, id)).enriched,
  sub: (s, id) => fmtMoney(bizCost(s, company(s, id), 25000)),
  run: (s, id) => {
    const co = company(s, id), cost = bizCost(s, co, 25000);
    if (co.cash < cost) return { text: `${co.name} cannot afford ${fmtMoney(cost)}.`, nolog: true };
    co.cash -= cost;
    const z = zooOf(co);
    z.enriched = true;
    z.welfare = clamp100(z.welfare + 10);
    z.visitorSat = clamp100(z.visitorSat + 8);
    for (const a of z.animals) a.happiness = clamp100(a.happiness + randInt(6, 12));
    return {
      text: `Installed puzzle feeders, climbing towers, and splash waterfall pools across the habitats. The animals are active, engaged, and visibly joyful!`,
      emoji: '🤹',
      tone: 'good',
    };
  },
});

defAction({
  id: 'zoo_vet',
  cat: 'company',
  target: 'company',
  label: 'Veterinary health campaign',
  emoji: '🩺',
  when: (s, id) => runsZoo(s, id) && !zooOf(company(s, id)).vetChecked,
  sub: (s, id) => fmtMoney(bizCost(s, company(s, id), 20000)),
  run: (s, id) => {
    const co = company(s, id), cost = bizCost(s, co, 20000);
    if (co.cash < cost) return { text: `${co.name} cannot afford ${fmtMoney(cost)}.`, nolog: true };
    co.cash -= cost;
    const z = zooOf(co);
    z.vetChecked = true;
    z.welfare = clamp100(z.welfare + 6);
    for (const a of z.animals) a.health = clamp100(a.health + randInt(10, 18));
    return {
      text: `The veterinary team conducted thorough preventative examinations, booster vaccinations, and nutritional updates for every animal in the collection.`,
      emoji: '🩺',
      tone: 'good',
    };
  },
});

defAction({
  id: 'zoo_inspect',
  cat: 'company',
  target: 'company',
  label: 'Inspect the grounds',
  emoji: '🔍',
  when: (s, id) => runsZoo(s, id) && !zooOf(company(s, id)).inspected,
  run: (s, id) => {
    const co = company(s, id), z = zooOf(co);
    z.inspected = true;
    for (const r of BIZ_ROLE_IDS) {
      if (co.team[r].n) co.team[r].morale = clamp100(co.team[r].morale + 3);
    }
    for (const e of z.exhibits) {
      e.condition = clamp100(e.condition + 5);
      e.security = clamp100(e.security + 5);
    }
    return {
      text: `You walked the park from end to end, greeting zookeepers, inspecting enclosure locks, and testing perimeter security. Staff appreciated your presence.`,
      emoji: '🔍',
      tone: 'good',
    };
  },
});
