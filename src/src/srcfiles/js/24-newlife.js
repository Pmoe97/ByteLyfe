/* =====================================================================
 * 24-newlife.js — being born: a random life or a custom one.
 *
 * createLife({ first, last, gender, country, city, year, wealth, royal, traits,
 *              orient, smarts, looks, health, happy, look })
 * royal: true makes you a royal in a monarchy country (38-royalty.js).
 * `look` is an appearance from the character creator (36-looks.js); its
 * fields override what the baby inherits from its parents.
 * Every field is optional; anything missing is rolled at random.
 * ===================================================================== */

function createLife(opts) {
  opts = opts || {};
  const year = opts.year || new Date().getFullYear();
  const s = newState(year);
  const countryId = opts.country && COUNTRIES[opts.country] ? opts.country : pick(COUNTRY_IDS);
  const gender = opts.gender || (chance(0.5) ? 'm' : 'f');
  const C = COUNTRIES[countryId];
  const me = makePerson(s, {
    first: opts.first || randomFirst(countryId, gender),
    last: opts.last || randomLast(countryId),
    gender, age: 0, country: countryId,
    city: opts.city && C.cities.includes(opts.city) ? opts.city : pick(C.cities),
    orient: opts.orient && ORIENTATIONS[opts.orient] ? opts.orient : undefined,
  });
  s.playerId = me.id;
  s.player = newPlayerBlock();
  // Royal births (38-royalty.js): chosen in a custom life, or now and then by chance.
  const royal = !!C.monarchy && (opts.royal || (opts.royal === undefined && !opts.wealth && chance(ROYAL_BIRTH_ODDS)));
  const fam = generateFamily(s, me, { wealth: royal ? 'rich' : opts.wealth, skin: opts.look ? opts.look.skin : undefined });
  if (royal) makeRoyal(s, fam);
  const st = childStatsFrom(fam.p1, fam.p2);
  me.stats = {
    happy: opts.happy ?? st.happy,
    health: opts.health ?? st.health,
    smarts: opts.smarts ?? st.smarts,
    looks: opts.looks ?? st.looks,
  };
  me.traits = opts.traits && opts.traits.length ? opts.traits.slice(0, 3) : inheritTraits(fam.p1, fam.p2);
  // The player existed before their parents did, so inherit the look now.
  me.look = Object.assign(inheritLook(me, fam.p1, fam.p2, 0), opts.look || {});
  // Nobody names a kid after a sibling or the other parent's name... usually.
  const taken = new Set(relPeople(s).map((p) => p.first));
  if (!opts.first) for (let i = 0; i < 12 && taken.has(me.first); i++) me.first = randomFirst(countryId, gender);
  const m = M(s);
  m.karma = clamp100(gauss(55, 10));
  m.wealthTier = fam.tier;
  m.lifestyle = fam.tier === 'rich' ? 'lavish' : fam.tier === 'poor' ? 'frugal' : 'normal';

  if (chance(0.22)) {
    const sp = pick(['dog', 'dog', 'cat', 'cat', 'fish', 'rabbit', 'parrot']);
    const S = PET_SPECIES[sp];
    const id = uid(s, 'pet');
    s.pets[id] = { id, species: sp, breed: pick(S.breeds), name: pick(PET_NAMES), born: year - randInt(0, Math.max(0, S.life[0] - 3)), alive: true, rel: 60, life: randInt(S.life[0], S.life[1]), owner: me.id };
  }
  assignGoals(s);
  startYearLog(s);
  introLog(s, fam);
  return s;
}

function introLog(s, fam) {
  const me = P(s), C = country(s);
  const [mo, d] = me.bday;
  log(s, `👶 You were born a ${genderWord(me, 'boy', 'girl', 'baby')} in ${me.city}, ${C.name} ${C.flag}, on ${MONTHS[mo - 1]} ${d}, ${s.year}. You're a ${zodiacOf(mo, d)}.`);
  const parentLine = (p) => {
    const job = npcJobTitle(p);
    if (royalTitle(s, p) || !job) return `Your ${kinLabel('parent', p).toLowerCase()} is ${royalName(s, p)}, ${ageOf(s, p)}.`;
    return `Your ${kinLabel('parent', p).toLowerCase()} is ${fullName(p)}, ${aAn(ageOf(s, p) + '-year-old')} ${job.toLowerCase()}.`;
  };
  log(s, parentLine(fam.p1) + ' ' + parentLine(fam.p2));
  const sibs = relPeople(s, ['sibling']);
  if (sibs.length) log(s, `You have ${sibs.length === 1 ? 'an older ' + kinLabel('sibling', sibs[0]).toLowerCase() : sibs.length + ' older siblings'}: ${listJoin(sibs.map((p) => `${p.first} (${ageOf(s, p)})`))}.`);
  const tier = WEALTH[M(s).wealthTier];
  if (crown(s)) royalIntroLog(s);
  else log(s, `Your family is ${tier.name.toLowerCase()}.`);
  const pet = Object.values(s.pets)[0];
  if (pet) log(s, `The family has a ${PET_SPECIES[pet.species].name.toLowerCase()} named ${pet.name}. ${PET_SPECIES[pet.species].emoji}`);
  if (me.traits.length) log(s, `Personality: ${listJoin(me.traits.map((t) => TRAITS[t].name.toLowerCase()))}.`);
}
