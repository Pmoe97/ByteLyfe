/* =====================================================================
 * 51-chaos.js — Chaos mode: superpowers, superhero and supervillain careers,
 * vampire lives, and ascending as an archangel or a demon lord. Every
 * event and action here carries tags: ['chaos'] (off by default), and the
 * yearly tick does nothing while the Chaos switch is off.
 *
 * p.powers = ['flight', ...]          anyone can have powers (a nemesis does)
 * p.alias                             a hero or villain name
 * p.vamp = { year, sire }             a vampire; p.frozenAge stops their aging
 *   (bodyAge in 19-health.js reads it for health, death and events)
 * M(s).sup = { control, outed, side, alias, rep, rank, nemesis, deeds, wins,
 *              henchmen, team }       your powers and cape career
 * M(s).blood = { hunger, hunt, kills, sired }   your life as a vampire
 * s.ancestor = { kind: 'angel'|'demon', name, year }   someone in the family
 *   line ascended; later generations hear from them
 * chaosTick runs after courtTick.
 * ===================================================================== */

function chaosOn() { return tagsOn(['chaos']); }
const CHAOS = ['chaos'];

/* ---- powers ----------------------------------------------------------------- */
const POWERS = {
  flight: { name: 'Flight', emoji: '🕊️', desc: 'You can fly.' },
  strength: { name: 'Super strength', emoji: '💪', desc: 'You can lift a bus.' },
  lasers: { name: 'Laser eyes', emoji: '👁️', desc: 'Beams of heat, from your eyes.' },
  invisible: { name: 'Invisibility', emoji: '👻', desc: 'You can vanish at will.' },
  telepathy: { name: 'Telepathy', emoji: '🧠', desc: 'You hear what people think.' },
  speed: { name: 'Super speed', emoji: '⚡', desc: 'Faster than anything alive.' },
  healing: { name: 'Healing factor', emoji: '🩹', desc: 'Your wounds close in seconds.' },
  weather: { name: 'Weather control', emoji: '🌩️', desc: 'Storms answer to you.' },
  telekinesis: { name: 'Telekinesis', emoji: '🌀', desc: 'You move things with your mind.' },
  shapeshift: { name: 'Shapeshifting', emoji: '🎭', desc: 'You can look like anyone.' },
};
const POWER_IDS = Object.keys(POWERS);
// What each power is for: [label, outcome, minimum age], one kind and one selfish or silly.
const POWER_USES = {
  flight: [['Fly over the city at dawn', (s) => { add(s, { happy: 6 }); return 'The whole city was pink and gold below you. Nobody looked up.'; }],
    ['Skip the commute forever', (s) => { if (M(s).career) M(s).career.perf = clamp100(M(s).career.perf + 4); add(s, { happy: 2 }); return 'You land on the office roof at 8:59 every morning.'; }]],
  strength: [['Lift a car off a trapped driver', (s) => { add(s, { karma: 5 }); return 'You lifted it like a grocery bag. The driver will tell this story forever.'; }],
    ['Win an arm-wrestling tournament', (s) => { const amt = price(s, randInt(500, 3000)); add(s, { money: amt }); return `You won ${fmtMoney(amt)} and broke the table.`; }, 16]],
  lasers: [['Cook dinner with your eyes', (s) => { if (chance(0.25)) { M(s).money -= price(s, 400); return 'The steak was perfect. The curtains were not.'; } add(s, { happy: 3 }); return 'Perfectly seared, in two seconds flat.'; }],
    ['Carve a sculpture from a boulder', (s) => { addSkill(s, 'art', 3); const amt = price(s, randInt(200, 4000)); add(s, { money: amt }); return `A gallery bought it for ${fmtMoney(amt)}. They think you used a very small chisel.`; }]],
  invisible: [['Sneak into a sold-out concert', (s) => { add(s, { happy: 6 }); return 'Front row, invisible, dancing like nobody was watching. Nobody was.'; }],
    ['Eavesdrop on your boss', (s) => { add(s, { karma: -2 }); if (M(s).career) M(s).career.perf = clamp100(M(s).career.perf + 6); return 'You know exactly what to say in your next review.'; }, 16]],
  telepathy: [['Read your partner’s mind', (s) => { const r = romanticId(s); if (!r) return 'You listened to a stranger’s thoughts instead. They were mostly about lunch.'; addRel(s, r, chance(0.7) ? 8 : -12); return chance(0.7) ? `${nm(s, r)} is thinking about how much they love you.` : `${nm(s, r)} is thinking about someone from work. You wish you hadn’t looked.`; }],
    ['Clean up at a poker game', (s) => { const amt = price(s, randInt(800, 8000)); add(s, { money: amt, karma: -3 }); return `You knew every hand at the table. You walked away with ${fmtMoney(amt)}.`; }, 18]],
  speed: [['Run around the world before breakfast', (s) => { add(s, { happy: 5 }); addSkill(s, 'athletics', 2); return 'Forty minutes. You stopped for a croissant in Paris.'; }],
    ['Do a week of chores in a minute', (s) => { add(s, { happy: 3 }); return 'Laundry folded, floors scrubbed, taxes done. You took a nap.'; }]],
  healing: [['Heal a stranger at the hospital', (s) => { add(s, { karma: 6 }); return 'You touched their hand and their color came back. The doctors are baffled.'; }],
    ['Show off at a party', (s) => { add(s, { happy: 2 }); return outRisk(s, 0.35, 'You let someone cut your palm and it healed before the blood dripped.'); }]],
  weather: [['Save a farmer’s crops from drought', (s) => { add(s, { karma: 5 }); return 'You called the rain. The farmer cried in it.'; }],
    ['Make it snow in midsummer', (s) => { add(s, { happy: 4 }); return outRisk(s, 0.2, 'The news is calling it a "freak weather event." You built a snowman.'); }]],
  telekinesis: [['Rearrange your whole home with your mind', (s) => { add(s, { happy: 3 }); return 'The couch floated across the room while you drank your coffee.'; }],
    ['Nudge a slot machine', (s) => { const amt = price(s, randInt(1000, 20000)); add(s, { money: amt, karma: -3 }); return `Three sevens. Then three more. You left with ${fmtMoney(amt)} before security got curious.`; }, 18]],
  shapeshift: [['Spend a day as your boss', (s) => { if (M(s).career && chance(0.5)) { M(s).career.perf = clamp100(M(s).career.perf + 8); return 'As your boss, you gave yourself a glowing review.'; } add(s, { karma: -1 }); return 'You cancelled every meeting and went home at noon.'; }, 16],
    ['Pass as a celebrity at a club', (s) => { add(s, { happy: 5 }); return 'Free drinks, a VIP booth, and a very confused real celebrity in the doorway.'; }, 18]],
};
function sup(s) { const m = M(s); return m.sup || (m.sup = { control: 15, outed: false, side: null, alias: '', rep: 0, rank: 0, nemesis: null, deeds: 0, wins: 0, henchmen: 0, team: false }); }
function hasPowers(p) { return !!(p && p.powers && p.powers.length); }
function myPowers(s) { return P(s).powers || []; }
// Gain a power (a random new one if none is named). Returns its id, or null.
function grantPower(s, id, p) {
  p = p || P(s);
  p.powers = p.powers || [];
  const left = POWER_IDS.filter((k) => !p.powers.includes(k));
  const pw = id && left.includes(id) ? id : pick(left);
  if (!pw) return null;
  p.powers.push(pw);
  if (p === P(s)) { sup(s); tally(s, 'powers'); }
  return pw;
}
// Using powers in public can blow your secret identity.
function outRisk(s, odds, text) {
  const u = sup(s);
  if (u.outed || !chance(odds * (1.3 - u.control / 100))) return text;
  u.outed = true;
  M(s).fame = clamp100(M(s).fame + 15);
  tally(s, 'outed');
  return `${text} Someone filmed it. Your secret is out: the whole world knows you have powers.`;
}
// Skipping town in a hurry: the lease ends and you look for a place in the new city.
function fleeTo(s, city) {
  const dep = leaveRental(s, 'moved');
  if (A(s) >= 18) M(s).housing = { type: 'homeless', assetId: null, rent: 0, name: '' };
  relocate(s, P(s).country, city);
  if (A(s) >= 18) openRentals(s, `You need a place to live in ${city}.`);
  return dep;
}
// Invisibility and shapeshifting make crime easier (commitCrime in 20-crime.js).
function powerCrimeEdge(s) { return chaosOn() && myPowers(s).some((k) => k === 'invisible' || k === 'shapeshift') ? 0.25 : 0; }

defAction({
  id: 'pw_use', cat: 'super', label: 'Use your powers', emoji: '✨', tags: CHAOS,
  when: (s) => free(s) && hasPowers(P(s)) && A(s) >= 6 && count(s, 'pw_use') < 3,
  sub: (s) => myPowers(s).map((k) => POWERS[k].name).join(', '),
  run: (s) => {
    bump(s, 'pw_use');
    popup(s, {
      emoji: '✨', title: 'Your powers', handler: 'pwUse', text: `Control: ${sup(s).control}%.${sup(s).outed ? ' The world knows.' : ' Nobody knows. Yet.'}`,
      choices: myPowers(s).flatMap((k) => POWER_USES[k].map((u, i) => [u, i]).filter(([u]) => A(s) >= (u[2] || 0)).map(([u, i]) => ({ label: `${POWERS[k].emoji} ${u[0]}`, value: k + ':' + i }))).concat([{ label: 'Never mind', value: null }]),
    });
  },
});
onChoice('pwUse', (s, ctx, v) => {
  if (!v || !chaosOn()) return;
  const [k, i] = v.split(':'), use = POWER_USES[k] && POWER_USES[k][i];
  if (!use || !myPowers(s).includes(k) || A(s) < (use[2] || 0)) return;
  const u = sup(s);
  u.control = clamp100(u.control + randInt(1, 3));
  // Low control means mishaps.
  if (chance((100 - u.control) / 400)) {
    add(s, { health: -randInt(2, 8) });
    return { text: outRisk(s, 0.5, pick([`Your ${POWERS[k].name.toLowerCase()} misfired. Nobody was hurt, except your pride and the neighbor’s fence.`, `You lost control halfway through. The fire department asked a lot of questions.`])), tone: 'bad' };
  }
  return use[1](s);
});
defAction({
  id: 'pw_train', cat: 'super', label: 'Train your powers', emoji: '🎯', tags: CHAOS,
  when: (s) => free(s) && hasPowers(P(s)) && !count(s, 'pw_train'),
  sub: (s) => `Control ${sup(s).control}%`,
  run: (s) => {
    bump(s, 'pw_train');
    const u = sup(s), gain = randInt(6, 12);
    u.control = clamp100(u.control + gain);
    if (chance(0.08)) { add(s, { health: -5 }); return 'You trained in an abandoned quarry. The quarry is now a canyon.'; }
    return `You trained in secret all year. Control is up to ${u.control}%.`;
  },
});
defAction({
  id: 'pw_reveal', cat: 'super', label: 'Reveal your powers to the world', emoji: '📣', tags: CHAOS,
  when: (s) => free(s) && hasPowers(P(s)) && !sup(s).outed && A(s) >= 16,
  run: (s) => {
    const u = sup(s);
    u.outed = true;
    M(s).fame = clamp100(M(s).fame + 25);
    tally(s, 'outed');
    return { text: `You showed the world what you can do on live TV. Every phone on earth buzzed at once. You’re famous now${u.side === 'villain' ? ', and every police force on earth has your photo' : ''}.`, tone: 'good' };
  },
});

/* ---- capes: heroes and villains ------------------------------------------- */
const CAPE = {
  hero: { name: 'Superhero', ranks: ['Rookie vigilante', 'Neighborhood hero', 'City protector', 'National icon', 'World guardian'], first: ['Captain', 'Lady', 'Doctor', 'The', 'Mister', 'Major'], last: ['Comet', 'Bolt', 'Sentinel', 'Halo', 'Tempest', 'Aegis', 'Nova', 'Vanguard', 'Beacon', 'Meridian'] },
  villain: { name: 'Supervillain', ranks: ['Petty crook', 'Menace', 'Supervillain', 'Criminal mastermind', 'World-ending threat'], first: ['Baron', 'Doctor', 'The', 'Madame', 'Count', 'Professor'], last: ['Vex', 'Gloom', 'Havoc', 'Malice', 'Ruin', 'Hex', 'Nightshade', 'Rot', 'Cinder', 'Umbra'] },
};
const CAPE_RANK_AT = [0, 15, 35, 60, 85];
function capeName(side) { const C = CAPE[side]; return `${pick(C.first)} ${pick(C.last)}`; }
function capeRank(s) { const u = sup(s); return u.side ? CAPE[u.side].ranks[u.rank] : ''; }
function otherSide(side) { return side === 'hero' ? 'villain' : 'hero'; }
function nemesisOf(s) { const id = sup(s).nemesis, p = id && s.people[id]; return p && p.alive && M(s).rels[id] ? p : null; }
function makeNemesis(s) {
  const u = sup(s), side = otherSide(u.side);
  const p = makeAdultNear(s, { minAge: Math.max(18, A(s) - 10), maxAge: A(s) + 15 });
  grantPower(s, null, p);
  p.alias = capeName(side);
  p.capeSide = side;
  setRel(s, p.id, 'enemy', 5);
  u.nemesis = p.id;
  return p;
}
function addRep(s, d) {
  const u = sup(s);
  u.rep = clamp100(u.rep + d);
  let r = 0;
  for (let i = 0; i < CAPE_RANK_AT.length; i++) if (u.rep >= CAPE_RANK_AT[i]) r = i;
  if (r > u.rank) { u.rank = r; return ` You're ${aAn(CAPE[u.side].ranks[r].toLowerCase())} now.`; }
  u.rank = r;
  return '';
}
defAction({
  id: 'cape_start', cat: 'super', label: 'Put on a mask', emoji: '🦸', tags: CHAOS, desc: 'Become a superhero or a supervillain.',
  when: (s) => free(s) && hasPowers(P(s)) && !sup(s).side && A(s) >= 16,
  run: (s) => {
    popup(s, {
      emoji: '🦸', title: 'Which side?', handler: 'capeSide',
      text: 'The city needs someone. It could be someone to save it, or someone to take it.',
      choices: [{ label: '🦸 Become a superhero', value: 'hero', sub: 'Patrols, rescues, sponsors and a nemesis' }, { label: '🦹 Become a supervillain', value: 'villain', sub: 'Heists, schemes, henchmen and a nemesis' }, { label: 'Not yet', value: null }],
    });
  },
});
onChoice('capeSide', (s, ctx, side) => {
  if (!side || !CAPE[side]) return;
  popup(s, { emoji: side === 'hero' ? '🦸' : '🦹', title: 'Your name', text: 'Every legend needs one.', handler: 'capeName', ctx: { side }, input: { label: 'Alias', value: capeName(side), max: 28 }, choices: [{ label: side === 'hero' ? 'Suit up' : 'Mwahaha' }] });
});
onChoice('capeName', (s, ctx, v, input) => {
  const u = sup(s), alias = cleanName(input) || capeName(ctx.side);
  Object.assign(u, { side: ctx.side, alias, rep: 5, rank: 0 });
  P(s).alias = alias;
  tally(s, ctx.side === 'hero' ? 'becameHero' : 'becameVillain');
  const n = makeNemesis(s);
  return { text: `${alias} is born. Within a week, ${n.alias} (${fullName(n)}, though you don't know that yet) made it clear this city isn't big enough for both of you.`, emoji: ctx.side === 'hero' ? '🦸' : '🦹', tone: 'good', person: n.id };
});
// Heroes patrol and answer alarms; villains pull heists and unveil schemes.
defAction({
  id: 'cape_patrol', cat: 'super', label: 'Go on patrol', emoji: '🌃', tags: CHAOS,
  when: (s) => free(s) && sup(s).side === 'hero' && count(s, 'cape_patrol') < 3,
  sub: (s) => capeRank(s),
  run: (s) => {
    bump(s, 'cape_patrol');
    const u = sup(s);
    u.deeds++;
    if (chance(0.12 - u.control / 1500)) { getSick(s, pick(['broken_arm', 'broken_leg', 'concussion'])); return { text: 'A mugger got lucky with a pipe. Heroes heal, eventually.', tone: 'bad' }; }
    add(s, { karma: 2 });
    return `${pick(['You stopped a mugging in an alley.', 'You caught a purse snatcher in two seconds flat.', 'You pulled a kid out of a flooded drain.', 'You talked a jumper down from a bridge.', 'You stopped a getaway car with your bare hands.'])}${addRep(s, randInt(2, 5))}`;
  },
});
defAction({
  id: 'cape_alarm', cat: 'super', label: 'Answer the big alarm', emoji: '🚨', tags: CHAOS,
  when: (s) => free(s) && sup(s).side === 'hero' && !count(s, 'cape_alarm') && sup(s).rank >= 1,
  run: (s) => {
    bump(s, 'cape_alarm');
    const u = sup(s), what = pick(['a burning skyscraper', 'a runaway train', 'a collapsing bridge', 'a giant robot rampaging downtown', 'a tidal wave heading for the harbor']);
    if (chance(0.03)) { die(s, `while saving the city from ${what}`); return { text: `You saved everyone from ${what}. Everyone but you.`, tone: 'bad' }; }
    if (chance(0.25 - u.control / 600)) { add(s, { health: -randInt(10, 25) }); return { text: `You stopped ${what}, but it nearly stopped you too.${addRep(s, 6)}`, tone: 'bad' }; }
    M(s).fame = clamp100(M(s).fame + (u.outed ? 6 : 2));
    add(s, { karma: 4, happy: 5 });
    return { text: `You stopped ${what}. The city held its breath, then cheered.${addRep(s, randInt(6, 12))}`, tone: 'good' };
  },
});
defAction({
  id: 'cape_heist', cat: 'super', label: 'Pull a super heist', emoji: '💎', tags: CHAOS,
  when: (s) => free(s) && sup(s).side === 'villain' && count(s, 'cape_heist') < 2,
  sub: (s) => capeRank(s),
  run: (s) => {
    bump(s, 'cape_heist');
    const u = sup(s), target = pick(['the national gold reserve', 'a diamond exhibition', 'a crypto billionaire’s vault', 'a museum’s crown jewels', 'an armored train']);
    const odds = 0.55 + u.control / 300 + u.henchmen * 0.02 + powerCrimeEdge(s) - (u.outed ? 0.1 : 0);
    if (chance(clamp(odds, 0.15, 0.92))) {
      const loot = price(s, Math.round(randInt(20000, 200000) * (1 + u.rank)));
      add(s, { money: loot, karma: -4 });
      tally(s, 'crimeLoot', loot);
      return { text: `You robbed ${target} in broad daylight. ${fmtMoney(loot)}, gone.${addRep(s, randInt(5, 10))}`, tone: 'good' };
    }
    if (chance(0.5)) return arrest(s, 'heist');
    return { text: `Your heist on ${target} went sideways. You escaped with nothing but a grudge.${nemesisOf(s) ? ` ${nemesisOf(s).alias} was waiting for you.` : ''}`, tone: 'bad' };
  },
});
defAction({
  id: 'cape_scheme', cat: 'super', label: 'Unveil a doomsday scheme', emoji: '🌋', tags: CHAOS,
  when: (s) => free(s) && sup(s).side === 'villain' && !count(s, 'cape_scheme') && sup(s).rank >= 1,
  run: (s) => {
    bump(s, 'cape_scheme');
    const plan = pick(['freeze the capital in a block of ice', 'hold the moon for ransom', 'replace every song on the radio with your own', 'shrink the city’s parliament to the size of mice', 'turn off the sun for one hour']);
    M(s).fame = clamp100(M(s).fame + 5);
    add(s, { karma: -3 });
    if (chance(0.45)) return { text: `You announced your plan to ${plan}. It almost worked. The world is terrified of you.${addRep(s, randInt(8, 15))}`, tone: 'good' };
    return { text: `You announced your plan to ${plan}. ${nemesisOf(s) ? nemesisOf(s).alias : 'A hero'} foiled it on live TV.${addRep(s, 2)}`, tone: 'bad' };
  },
});
defAction({
  id: 'cape_henchmen', cat: 'super', label: 'Hire henchmen', emoji: '🕶️', tags: CHAOS,
  when: (s) => free(s) && sup(s).side === 'villain' && sup(s).henchmen < 20,
  sub: (s) => `${nOf(sup(s).henchmen, 'henchman', 'henchmen')} · ${fmtMoney(price(s, 30000))}/yr each`,
  run: (s) => {
    const u = sup(s), cost = price(s, 15000);
    if (!pay(s, cost)) return cantAfford(cost);
    u.henchmen += 3;
    return `Three new henchmen in matching jumpsuits. They are very enthusiastic and slightly incompetent.`;
  },
});
defAction({
  id: 'cape_nemesis', cat: 'super', label: (s) => `Confront ${nemesisOf(s) ? nemesisOf(s).alias : 'your nemesis'}`, emoji: '⚔️', tags: CHAOS,
  when: (s) => free(s) && !!sup(s).side && !!nemesisOf(s) && !count(s, 'cape_nemesis'),
  run: (s) => {
    bump(s, 'cape_nemesis');
    const u = sup(s), n = nemesisOf(s);
    const odds = 0.4 + u.control / 250 + u.rank * 0.04 + (myPowers(s).length - 1) * 0.05;
    if (chance(clamp(odds, 0.15, 0.85))) {
      u.wins++;
      addRel(s, n.id, -10);
      tally(s, 'nemesisWins');
      const end = u.wins >= 3 && chance(0.4);
      if (end) { u.nemesis = null; dropRel(s, n.id); n.alias = ''; }
      return { text: `You beat ${n.alias || fullName(n)} in a fight that leveled three city blocks.${end ? ` ${n.first} hung up the cape for good.` : ''}${addRep(s, randInt(5, 10))}`, tone: 'good', person: n.id };
    }
    add(s, { health: -randInt(8, 20) });
    return { text: `${n.alias} won this round. You limped home.`, tone: 'bad', person: n.id };
  },
});
defAction({
  id: 'cape_retire', cat: 'super', label: 'Hang up the cape', emoji: '🧥', tags: CHAOS,
  when: (s) => free(s) && !!sup(s).side,
  run: (s) => {
    const u = sup(s), was = u.alias;
    Object.assign(u, { side: null, henchmen: 0, team: false });
    P(s).alias = '';
    return `${was} is retired. The suit is in the back of your closet, just in case.`;
  },
});
function capeYear(s) {
  const u = M(s).sup;
  if (!u || !u.side || inPrison(s)) return;
  if (u.side === 'hero' && (u.outed || u.rank >= 2)) {
    const amt = price(s, Math.round((u.rank * 20000 + M(s).fame * 1500) * (u.team ? 1.5 : 1)));
    if (amt > 0) { add(s, { money: amt }); finRow(s, 'inc', `${u.alias}: sponsors and merch`, amt); }
  }
  if (u.side === 'villain' && u.henchmen) {
    const cost = price(s, 30000) * u.henchmen;
    M(s).money -= cost;
    finRow(s, 'exp', `${u.alias}: henchmen`, cost);
    if (M(s).money < 0 && chance(0.5)) { u.henchmen = Math.max(0, u.henchmen - 3); log(s, '🕶️ Three unpaid henchmen quit to start a podcast about you.', 'bad'); }
  }
  u.rep = clamp100(u.rep - 2);
  if (!nemesisOf(s) && chance(0.3)) { const n = makeNemesis(s); log(s, `⚔️ A new rival calls themselves ${n.alias}.`); }
}

/* ---- vampires ------------------------------------------------------------------ */
function isVamp(p) { return !!(p && p.vamp); }
function blood(s) { const m = M(s); return m.blood || (m.blood = { hunger: 30, hunt: 0, kills: 0, sired: 0 }); }
// Turning: the clock stops. Old illnesses go, looks sharpen.
function makeVampire(s, p, sireId) {
  p.vamp = { year: s.year, sire: sireId || null };
  p.frozenAge = ageOf(s, p);
  p.stats.looks = clamp100(p.stats.looks + 10);
  p.stats.health = Math.max(p.stats.health, 85);
  if (p === P(s)) { M(s).diseases = []; blood(s); tally(s, 'vampire'); }
}
// Back to mortal: you pick up aging from the age you looked.
function cureVampire(s, p) {
  p.birthYear = s.year - (p.frozenAge ?? ageOf(s, p));
  delete p.vamp;
  delete p.frozenAge;
  if (p === P(s)) delete M(s).blood;
}
function feed(s, amt) { const b = blood(s); b.hunger = clamp(b.hunger - amt, 0, 100); }
const isMyVamp = (s) => free(s) && isVamp(P(s));
defAction({
  id: 'vp_feed', cat: 'super', label: 'Feed on a stranger', emoji: '🦇', tags: CHAOS,
  when: (s) => isMyVamp(s) && count(s, 'vp_feed') < 2,
  sub: (s) => `Hunger ${blood(s).hunger}%`,
  run: (s) => {
    bump(s, 'vp_feed');
    const b = blood(s);
    feed(s, 55);
    b.hunt = clamp(b.hunt + randInt(12, 20), 0, 100);
    add(s, { karma: -2 });
    if (chance(0.06 + b.hunger / 800)) {
      b.kills++;
      tally(s, 'murders');
      add(s, { karma: -8, happy: -6 });
      b.hunt = clamp(b.hunt + 25, 0, 100);
      if (chance(0.25)) return arrest(s, 'murder');
      return { text: 'You couldn’t stop. The papers are calling it "the alley murders." The hunters read papers too.', tone: 'bad' };
    }
    return pick(['A tourist in a dark alley. They woke up dizzy, remembering nothing.', 'A clubber at closing time. They thought it was a hickey.', 'A night-shift worker on a bus. They slept through their stop.']);
  },
});
defAction({
  id: 'vp_bank', cat: 'super', label: 'Buy blood from a shady supplier', emoji: '🩸', tags: CHAOS,
  when: (s) => isMyVamp(s) && !count(s, 'vp_bank'),
  sub: (s) => fmtMoney(price(s, 3000)),
  run: (s) => {
    bump(s, 'vp_bank');
    const cost = price(s, 3000);
    if (!pay(s, cost)) return cantAfford(cost);
    feed(s, 45);
    return 'Bagged and chilled. It’s like eating leftovers, but it keeps the hunters away.';
  },
});
defAction({
  id: 'vp_animal', cat: 'super', label: 'Drink animal blood', emoji: '🐀', tags: CHAOS,
  when: (s) => isMyVamp(s) && !count(s, 'vp_animal'),
  run: (s) => { bump(s, 'vp_animal'); feed(s, 20); add(s, { happy: -3, karma: 1 }); return 'Rats. It took the edge off. It did nothing for your dignity.'; },
});
defAction({
  id: 'vp_hunters', cat: 'super', label: 'Hunt the hunters', emoji: '🗡️', tags: CHAOS,
  when: (s) => isMyVamp(s) && blood(s).hunt >= 40 && !count(s, 'vp_hunters'),
  sub: (s) => `Hunters: ${blood(s).hunt}%`,
  run: (s) => {
    bump(s, 'vp_hunters');
    const b = blood(s);
    if (chance(0.55 + (myPowers(s).length ? 0.1 : 0))) { b.hunt = clamp(b.hunt - 35, 0, 100); add(s, { karma: -2 }); return 'You found their safehouse first. The crossbows are at the bottom of the river now.'; }
    if (chance(0.3)) { die(s, 'staked by a vampire hunter'); return { text: 'They were waiting for you.', tone: 'bad' }; }
    add(s, { health: -20 });
    return { text: 'You barely got away with a silver bolt in your shoulder.', tone: 'bad' };
  },
});
defAction({
  id: 'vp_sunrise', cat: 'super', label: 'Walk into the sunrise', emoji: '🌅', tags: CHAOS, desc: 'End your long night.',
  when: (s) => isMyVamp(s) && A(s) - P(s).frozenAge >= 20,
  run: (s) => {
    popup(s, { emoji: '🌅', title: 'Walk into the sunrise?', text: 'After everything, you could just watch the sun come up. Once.', handler: 'vpSunrise', choices: [{ label: 'Watch the sunrise', value: true, tone: 'bad' }, { label: 'Not yet', value: false }] });
  },
});
onChoice('vpSunrise', (s, ctx, yes) => { if (!yes || !isVamp(P(s))) return; die(s, 'while watching one last sunrise'); return { text: 'It was the most beautiful thing you had ever seen.', tone: 'bad' }; });
defAction({
  id: 'vp_turn', cat: 'person', target: 'person', label: 'Offer them eternity', emoji: '🧛', tags: CHAOS,
  when: (s, pid) => isMyVamp(s) && reachable(s, pid) && ageOf(s, s.people[pid]) >= ADULT_AGE && !isVamp(s.people[pid]) && relOf(s, pid).rel >= 50 && !count(s, 'vp_turn'),
  run: (s, pid) => {
    bump(s, 'vp_turn');
    const p = s.people[pid], r = relOf(s, pid);
    const odds = 0.2 + (r.rel - 50) / 100 + (K_ROMANCE.includes(r.kind) ? 0.2 : 0) + (hasTrait(p, 'adventurous') ? 0.15 : 0) - (hasTrait(p, 'anxious') ? 0.15 : 0);
    if (!chance(clamp(odds, 0.05, 0.85))) { addRel(s, pid, -12); return { text: `${p.first} said no. They look at you differently now, and they lock their window at night.`, tone: 'bad' }; }
    makeVampire(s, p, P(s).id);
    blood(s).sired++;
    tally(s, 'sired');
    addRel(s, pid, 15);
    return { text: `${p.first} said yes. You'll have each other for a very long time.`, tone: 'good', person: pid };
  },
});
function vampYear(s) {
  if (!isVamp(P(s)) || inPrison(s)) return;
  const b = blood(s);
  b.hunger = clamp(b.hunger + randInt(20, 30), 0, 100);
  b.hunt = clamp(b.hunt - 6, 0, 100);
  if (b.hunger >= 100) {
    add(s, { health: -15, happy: -8 });
    log(s, '🦇 The hunger is unbearable. You’re wasting away.', 'bad');
    if (P(s).stats.health <= 0) die(s, 'starving for blood');
  }
}

/* ---- ascension ------------------------------------------------------------------- */
function ascend(s, kind) {
  const p = P(s);
  s.ancestor = { kind, name: fullName(p), year: s.year };
  tally(s, kind === 'angel' ? 'archangel' : 'demonLord');
  checkAchievements(s);
  die(s, kind === 'angel' ? 'while ascending to join the archangels' : 'after descending to rule the underworld as a demon lord');
}
function ancestorKind(s) { return s.ancestor && s.ancestor.kind; }

/* ---- the year ---------------------------------------------------------------------- */
function chaosTick(s) {
  if (!chaosOn() || s.dead) return;
  const p = P(s);
  if (hasPowers(p)) {
    const u = sup(s);
    if (myPowers(s).includes('healing')) add(s, { health: randInt(1, 4) });
    if (myPowers(s).includes('speed') && A(s) >= 8) addSkill(s, 'athletics', 1);
    if (myPowers(s).includes('strength') && A(s) >= 8) addSkill(s, 'fitness', 1);
    u.control = clamp100(u.control + (A(s) < 25 ? 1 : 0));
  }
  capeYear(s);
  vampYear(s);
}

/* ---- events: getting powers ----------------------------------------------------- */
EV('ch_meteor', {
  ages: [8, 90], w: 0.35, once: true, tags: CHAOS, emoji: '☄️', when: (s) => !hasPowers(P(s)), text: 'A small glowing meteorite crashed into your backyard. It hums.',
  choices: [
    ['Touch it', (s) => { const pw = grantPower(s); add(s, { health: -5 }); return { text: `It burned your hand, then the pain stopped. Something changed. You have ${POWERS[pw].name.toLowerCase()}.`, tone: 'good', emoji: POWERS[pw].emoji }; }],
    ['Sell it to a collector', (s) => { const amt = price(s, randInt(5000, 40000)); add(s, { money: amt }); return `A man in a long coat paid ${fmtMoney(amt)} cash and didn’t ask questions.`; }],
    ['Call the scientists', (s) => { add(s, { smarts: 2 }); return 'They took it away in a lead box. One of them winked at you.'; }],
  ],
});
EV('ch_lab', {
  ages: [16, 70], w: 0.4, once: true, tags: CHAOS, emoji: '🧪', when: (s) => !hasPowers(P(s)) && free(s), text: 'A lab accident at a research center you were touring splashed you with something green and glowing.',
  choices: [
    ['Get checked out at the hospital', (s) => { if (chance(0.6)) { const pw = grantPower(s); return { text: `The doctors found nothing. That night, you discovered ${POWERS[pw].name.toLowerCase()}.`, tone: 'good', emoji: POWERS[pw].emoji }; } return 'Just a rash. A very glowy rash.'; }],
    ['Sue the lab', (s) => { const amt = price(s, randInt(10000, 80000)); add(s, { money: amt }); if (chance(0.4)) { const pw = grantPower(s); return { text: `They settled for ${fmtMoney(amt)}. Also, you have ${POWERS[pw].name.toLowerCase()} now.`, emoji: POWERS[pw].emoji }; } return `They settled quietly for ${fmtMoney(amt)}.`; }],
  ],
});
EV('ch_lightning', {
  ages: [10, 90], w: 0.3, once: true, tags: CHAOS, emoji: '🌩️', text: 'You were struck by lightning on an open field.',
  auto: (s) => {
    if (!hasPowers(P(s)) && chance(0.6)) { const pw = grantPower(s, chance(0.5) ? 'speed' : 'weather'); return { text: `You woke up in the hospital with your hair standing on end, and ${POWERS[pw].name.toLowerCase()}.`, tone: 'good' }; }
    add(s, { health: -randInt(10, 25) });
    return { text: 'You survived. Your watch didn’t.', tone: 'bad' };
  },
});
EV('ch_tea', {
  ages: [14, 90], w: 0.4, once: true, tags: CHAOS, emoji: '🍵', when: (s) => free(s) && !hasPowers(P(s)), text: 'A street vendor with no cart and no shadow offered you a cup of "very special tea."',
  choices: [
    ['Drink it', (s) => { if (chance(0.55)) { const pw = grantPower(s); return { text: `It tasted like thunderstorms. By morning, you had ${POWERS[pw].name.toLowerCase()}.`, tone: 'good', emoji: POWERS[pw].emoji }; } add(s, { happy: 4 }); return 'It was just very, very good tea. You feel wonderful.'; }],
    ['Politely decline', () => 'When you looked back, the vendor was gone. So was the street corner.'],
  ],
});
EV('ch_quirk', {
  ages: [3, 9], w: 0.5, once: true, tags: CHAOS, emoji: '🧸', when: (s) => !hasPowers(P(s)), text: 'When you got upset today, every toy in your room floated off the floor.',
  choices: [
    ['Tell your parents', (s) => { grantPower(s, 'telekinesis'); for (const q of relPeople(s, ['parent'])) addRel(s, q.id, 3); return { text: 'Your parents made you promise to keep it a family secret. You have telekinesis.', tone: 'good' }; }],
    ['Keep it secret', (s) => { grantPower(s, 'telekinesis'); return { text: 'It’s your secret now. You have telekinesis.', tone: 'good' }; }],
  ],
});
EV('ch_stranger', {
  ages: [18, 80], w: 0.35, once: true, tags: CHAOS, emoji: '🧙', when: (s) => free(s), text: 'A hooded stranger stopped you on the street. "Your potential is sleeping. For a price, I can wake it."',
  choices: [
    { label: 'Pay the price', sub: (s) => fmtMoney(price(s, 25000)), fx: (s) => { const c = price(s, 25000); if (!pay(s, c)) return cantAfford(c); const pw = grantPower(s); if (!pw) return 'The stranger looked at you, laughed, and gave your money back. "You need no more."'; return { text: `They touched your forehead. You have ${POWERS[pw].name.toLowerCase()} now.`, tone: 'good', emoji: POWERS[pw].emoji }; } },
    ['Walk away', () => 'They watched you go, smiling, as if they knew you’d be back.'],
  ],
});
EV('ch_agents', {
  ages: [16, 90], tags: CHAOS, emoji: '🕴️', when: (s) => hasPowers(P(s)) && sup(s).outed && free(s), text: 'Two agents in identical gray suits knocked on your door. "The government has a program for people like you."',
  choices: [
    ['Join the program', (s) => { const amt = price(s, 60000); add(s, { money: amt }); sup(s).control = clamp100(sup(s).control + 15); return `Training, a stipend of ${fmtMoney(amt)}, and a lanyard that opens doors you didn’t know existed.`; }],
    ['Slam the door', (s) => { add(s, { happy: -2 }); return 'There is a gray van parked across the street now. It never leaves.'; }],
    ['Leave town tonight', (s) => { const to = pick(country(s).cities.filter((c) => c !== P(s).city)) || P(s).city; fleeTo(s, to); return `You were in ${to} by morning.`; }],
  ],
});
EV('ch_fan', {
  ages: [16, 100], tags: CHAOS, emoji: '🧒', when: (s) => !!(M(s).sup && M(s).sup.side === 'hero' && M(s).sup.rank >= 2), text: (s) => `You saw a kid at the park dressed as ${M(s).sup.alias}, cape and all.`,
  auto: (s) => { add(s, { happy: 6 }); return 'You signed their notebook in secret. They’ll never know it was really you.'; },
});

/* ---- events: capes -------------------------------------------------------------- */
EV('cape_ambush', {
  ages: [16, 100], tags: CHAOS, emoji: '⚔️', when: (s) => !!(M(s).sup && M(s).sup.side) && !!nemesisOf(s) && free(s), ctx: (s) => ({ pid: sup(s).nemesis }),
  text: (s, c) => `${s.people[c.pid].alias} ambushed you on your way home.`,
  choices: [
    ['Fight back', (s, c) => { if (chance(0.45 + sup(s).control / 300)) return { text: `You sent ${s.people[c.pid].alias} running.${addRep(s, 4)}`, tone: 'good' }; add(s, { health: -randInt(8, 18) }); return { text: 'You lost. Badly.', tone: 'bad' }; }],
    ['Run', (s) => { addRep(s, -3); return 'You got away. The internet has a blurry video of you running.'; }],
    ['Try to talk', (s, c) => { if (chance(0.3)) { addRel(s, c.pid, 20); return `You talked for hours on a rooftop. ${s.people[c.pid].first} isn’t so different from you.`; } return 'They were not in a talking mood.'; }],
  ],
});
EV('cape_team', {
  ages: [18, 100], tags: CHAOS, emoji: '🛡️', once: true, when: (s) => !!(M(s).sup && M(s).sup.side && !M(s).sup.team && M(s).sup.rank >= 2), text: (s) => (sup(s).side === 'hero' ? 'The Paragon League, the world’s greatest heroes, invited you to join.' : 'The Syndicate of Ruin, the world’s worst villains, wants you at their table.'),
  choices: [
    ['Join them', (s) => { sup(s).team = true; return { text: `${sup(s).side === 'hero' ? 'A satellite headquarters, a group chat and a team photo.' : 'A volcano lair, a group chat and a team photo with very dramatic lighting.'}${addRep(s, 8)}`, tone: 'good' }; }],
    ['Stay solo', () => 'You work alone. It’s more dramatic that way.'],
  ],
});
EV('cape_reporter', {
  ages: [18, 100], tags: CHAOS, emoji: '📰', when: (s) => !!(M(s).sup && M(s).sup.side && !M(s).sup.outed), text: (s) => `A reporter is getting close to figuring out who ${sup(s).alias} really is.`,
  choices: [
    ['Throw them off the scent', (s) => (chance(0.5 + skill(s, 'charisma') / 250) ? 'You planted a fake lead. They’re chasing a dentist in another city.' : outRisk(s, 1, 'They put it together.'))],
    ['Give them an exclusive', (s) => { const u = sup(s); u.outed = true; M(s).fame = clamp100(M(s).fame + 20); tally(s, 'outed'); return { text: `The interview broke the internet. Everyone knows ${u.alias} is you.`, tone: 'good' }; }],
  ],
});
EV('cape_crossover', {
  ages: [18, 100], w: 0.6, tags: CHAOS, emoji: '🤖', when: (s) => !!(M(s).sup && M(s).sup.side) && !!nemesisOf(s), ctx: (s) => ({ pid: sup(s).nemesis }),
  text: (s, c) => `A giant robot from space is attacking the city. ${s.people[c.pid].alias} suggests a truce.`,
  choices: [
    ['Team up', (s, c) => { addRel(s, c.pid, 25); add(s, { karma: 2 }); return { text: `You and ${s.people[c.pid].alias} took it down together. Then you went back to hating each other.${addRep(s, 8)}`, tone: 'good' }; }],
    ['Handle it alone', (s) => (chance(0.5) ? { text: `You did it alone.${addRep(s, 10)}`, tone: 'good' } : (add(s, { health: -15 }), { text: 'The robot won. The city is mostly fine.', tone: 'bad' }))],
  ],
});

/* ---- events: vampires ------------------------------------------------------------- */
EV('vp_bitten', {
  ages: [18, 70], w: 0.2, once: true, tags: CHAOS, emoji: '🦇', when: (s) => free(s) && !isVamp(P(s)), text: 'At a nightclub, a pale stranger with old-fashioned manners leaned in close. Too close. You felt teeth.',
  choices: [
    ['Fight them off', (s) => { if (chance(0.6)) return 'You shoved them into the crowd and ran. Two little marks on your neck, nothing more.'; makeVampire(s, P(s)); return { text: 'You fought, but it was too late. By morning, the sun hurt. You’re a vampire.', tone: 'bad', emoji: '🦇' }; }],
    ['Let it happen', (s) => { makeVampire(s, P(s)); return { text: 'Everything went red, then quiet. You’re a vampire now. You will never look a day older.', emoji: '🦇' }; }],
  ],
});
EV('vp_count', {
  ages: [25, 80], w: 0.3, once: true, tags: CHAOS, emoji: '🍷', when: (s) => free(s) && !isVamp(P(s)), text: 'A centuries-old aristocrat invited you to dinner at a crumbling estate, then offered you eternal life.',
  choices: [
    ['Accept eternity', (s) => { makeVampire(s, P(s)); return { text: 'One bite, and time let go of you. You’re a vampire.', emoji: '🦇' }; }],
    ['Decline and leave', () => 'You left before dessert. You still hear the piano some nights.'],
  ],
});
EV('vp_hunter', {
  ages: [18, 5000], w: 2, tags: CHAOS, emoji: '🏹', when: (s) => isVamp(P(s)) && free(s) && blood(s).hunt >= 35, text: 'A hunter with a crossbow and a very old book is asking about you around town.',
  choices: [
    ['Skip town', (s) => { const to = pick(country(s).cities.filter((c) => c !== P(s).city)) || P(s).city; fleeTo(s, to); blood(s).hunt = clamp(blood(s).hunt - 40, 0, 100); return `You started over in ${to}. You’re good at starting over.`; }],
    ['Lie low', (s) => { blood(s).hunt = clamp(blood(s).hunt - 15, 0, 100); feed(s, -15); return 'You didn’t feed for weeks. The hunger is worse, but the hunter moved on.'; }],
    ['Face them', (s) => { if (chance(0.6)) { blood(s).hunt = 0; return 'You won. There’s one less hunter in the world.'; } die(s, 'staked by a vampire hunter'); return { text: 'The old book was right about you.', tone: 'bad' }; }],
  ],
});
EV('vp_sun', {
  ages: [18, 5000], tags: CHAOS, emoji: '☀️', when: (s) => isVamp(P(s)) && free(s), text: 'You overslept and woke up with sunlight creeping across the floor toward you.',
  auto: (s) => (chance(0.7) ? 'You rolled under the bed just in time. You bought blackout curtains that afternoon.' : (add(s, { health: -20, looks: -3 }), { text: 'It caught your arm. The scar will take a decade to fade.', tone: 'bad' })),
});
EV('vp_outlived', {
  ages: [18, 5000], w: 2, tags: CHAOS, emoji: '🕯️', when: (s) => isVamp(P(s)) && A(s) - P(s).frozenAge >= 50, cooldown: 25, text: 'You went back to your old neighborhood. Everyone you knew there is gone.',
  auto: (s) => { add(s, { happy: -8 }); return pick(['A coffee shop stands where your first home was.', 'Your childhood friend’s grandchild runs the corner store now.', 'Nobody remembers your name. You remember all of theirs.']); },
});
EV('vp_cure', {
  ages: [18, 5000], w: 0.3, tags: CHAOS, emoji: '🔮', when: (s) => isVamp(P(s)) && free(s) && A(s) - P(s).frozenAge >= 10, text: 'A witch in a back-alley shop claims she can make you mortal again.',
  choices: [
    { label: 'Take the cure', sub: (s) => fmtMoney(price(s, 50000)), fx: (s) => { const c = price(s, 50000); if (!pay(s, c)) return cantAfford(c); if (!chance(0.6)) return { text: 'You drank it. Nothing happened. The witch had already left town.', tone: 'bad' }; cureVampire(s, P(s)); tally(s, 'vampCured'); return { text: 'Your heart started beating again. You cried in the sunlight for an hour. You’ll age now, like everyone else.', tone: 'good' }; } },
    ['Stay what you are', () => 'Forever is a long time. But not long enough to give it up.'],
  ],
});

/* ---- events: ascension and the ancestor ------------------------------------------- */
EV('asc_choir', {
  ages: [40, 5000], once: true, tags: CHAOS, emoji: '😇', when: (s) => free(s) && M(s).karma >= 92 && !isVamp(P(s)), text: 'A choir of light filled your room. A voice like a bell offered you a place among the archangels.',
  choices: [
    ['Ascend', (s) => { ascend(s, 'angel'); return { text: 'You rose into the light, and your family felt warm for no reason at all.', tone: 'good' }; }],
    ['Not yet: there’s more good to do', (s) => { add(s, { karma: 2, happy: 5 }); return 'The light faded, but it left something behind. You feel lighter.'; }],
  ],
});
EV('asc_throne', {
  ages: [30, 5000], once: true, tags: CHAOS, emoji: '🔥', when: (s) => free(s) && (M(s).karma <= 8 || LC(s, 'murders') >= 2 || (M(s).sup && M(s).sup.side === 'villain' && M(s).sup.rank >= 3)), text: 'The floor split open. From the dark below, a voice offered you a throne of ashes.',
  choices: [
    ['Take the throne', (s) => { ascend(s, 'demon'); return { text: 'You descended in a pillar of fire. Somewhere below, a crown fit perfectly.', tone: 'bad' }; }],
    ['Refuse', (s) => { add(s, { karma: 3 }); return 'The floor closed. Your house smells like sulfur for a month.'; }],
  ],
});
EV('anc_angel', {
  ages: [5, 110], w: 0.6, tags: CHAOS, emoji: '🕊️', cooldown: 6, when: (s) => ancestorKind(s) === 'angel', text: (s) => `You dreamed of ${s.ancestor.name}, the archangel in your family line. You woke up glowing.`,
  auto: (s) => { add(s, { health: randInt(5, 12), happy: 5, karma: 2 }); return 'Whatever ailed you feels lighter today.'; },
});
EV('anc_demon', {
  ages: [16, 110], w: 0.6, tags: CHAOS, emoji: '😈', cooldown: 8, when: (s) => ancestorKind(s) === 'demon' && free(s), text: (s) => `A voice in the mirror says it is ${s.ancestor.name}, your ancestor, now a demon lord. It offers you a deal.`,
  choices: [
    ['Take the deal', (s) => { const amt = price(s, randInt(100000, 1000000)); add(s, { money: amt, karma: -15 }); M(s).fame = clamp100(M(s).fame + 10); tally(s, 'demonDeals'); return { text: `${fmtMoney(amt)} appeared in your account. You can’t remember what you promised.`, tone: 'good' }; }],
    ['Smash the mirror', (s) => { add(s, { happy: -2, karma: 3 }); return 'Seven years of bad luck beats an eternity of worse.'; }],
  ],
});

/* ---- achievements and legacy ----------------------------------------------------- */
ACHIEVEMENTS.push(
  { id: 'origin_story', name: 'Origin Story', emoji: '☄️', desc: 'Gain a superpower. (Chaos)', check: (s) => LC(s, 'powers') >= 1 },
  { id: 'masked_hero', name: 'Masked Hero', emoji: '🦸', desc: 'Become a superhero. (Chaos)', check: (s) => LC(s, 'becameHero') >= 1 },
  { id: 'evil_laugh', name: 'Evil Laugh', emoji: '🦹', desc: 'Become a supervillain. (Chaos)', check: (s) => LC(s, 'becameVillain') >= 1 },
  { id: 'world_guardian', name: 'World Guardian', emoji: '🌍', desc: 'Reach the top rank as a hero. (Chaos)', check: (s) => !!(M(s).sup && M(s).sup.side === 'hero' && M(s).sup.rank === 4) },
  { id: 'world_threat', name: 'World-Ending Threat', emoji: '🌋', desc: 'Reach the top rank as a villain. (Chaos)', check: (s) => !!(M(s).sup && M(s).sup.side === 'villain' && M(s).sup.rank === 4) },
  { id: 'arch_rival', name: 'Arch-Rival', emoji: '⚔️', desc: 'Beat your nemesis three times. (Chaos)', check: (s) => LC(s, 'nemesisWins') >= 3 },
  { id: 'fangs_out', name: 'Fangs Out', emoji: '🦇', desc: 'Become a vampire. (Chaos)', check: (s) => LC(s, 'vampire') >= 1 },
  { id: 'two_hundred', name: 'Two Hundred Candles', emoji: '🕯️', desc: 'Live to 200. (Chaos)', check: (s) => A(s) >= 200 },
  { id: 'sire', name: 'Sire', emoji: '🧛', desc: 'Turn three people into vampires. (Chaos)', check: (s) => LC(s, 'sired') >= 3 },
  { id: 'heaven_sent', name: 'Heaven Sent', emoji: '😇', desc: 'Ascend as an archangel. (Chaos)', check: (s) => LC(s, 'archangel') >= 1 },
  { id: 'throne_ashes', name: 'Throne of Ashes', emoji: '🔥', desc: 'Become a demon lord. (Chaos)', check: (s) => LC(s, 'demonLord') >= 1 },
);
LEGACY_TITLES.unshift(
  { id: 'archangel', name: 'Archangel', emoji: '😇', check: (s) => LC(s, 'archangel') >= 1 },
  { id: 'demon_lord', name: 'Demon Lord', emoji: '🔥', check: (s) => LC(s, 'demonLord') >= 1 },
  { id: 'vampire', name: 'Vampire', emoji: '🦇', check: (s) => isVamp(P(s)) },
  { id: 'superhero', name: 'Superhero', emoji: '🦸', check: (s) => LC(s, 'becameHero') >= 1 && (M(s).sup || {}).rank >= 2 },
  { id: 'supervillain', name: 'Supervillain', emoji: '🦹', check: (s) => LC(s, 'becameVillain') >= 1 && (M(s).sup || {}).rank >= 2 },
);
ACT_CATS.splice(ACT_CATS.findIndex((c) => c.id === 'crime'), 0, { id: 'super', name: 'Supernatural', emoji: '🌀' });
