/* =====================================================================
 * 20-crime.js — committing crimes, arrests, trials, prison, escapes.
 *
 * M(s).prison = { yearsLeft, total, served, crime, behavior, juvie, name, gang }
 * M(s).wanted = years left on an escaped sentence (0 = not a fugitive)
 * M(s).flags.heat = [{ crime, year }] crimes the police might still solve
 * ===================================================================== */

const CRIME_WIN = {
  shoplift: ['You slipped {a candy bar|a pair of sunglasses|a phone charger|a designer scarf} into your pocket and strolled out.'],
  pickpocket: ['You lifted a wallet from {a distracted tourist|a man on the subway|a woman at the farmers market}.'],
  vandalism: ['You {spray-painted a giant smiley face on a bridge|egged a car|knocked over every trash can on the block}. Nobody saw.'],
  burglary: ['You broke into a {quiet suburban house|fancy apartment|vacation home} and made off with the valuables.'],
  car_theft: ['You hot-wired a {sports car|pickup|minivan} and sold it to a chop shop.'],
  drugs: ['You moved product all year without a hitch.'],
  hacking: ['You slipped into a corporate network and drained an account.'],
  scam: ['You convinced dozens of people their "computer had a virus." They paid up.'],
  bank: ['You walked out of the bank with bags of cash. Your heart is still pounding.'],
  heist: ['You pulled off the heist of the decade. The jewels are yours.'],
  embezzle: ['You quietly moved company money into your own account.'],
};

function crimeOk(s, id) {
  const c = CRIMES[id];
  if (!free(s) || A(s) < c.minAge) return false;
  if (c.needsJob && !M(s).career) return false;
  return true;
}
function commitCrime(s, id) {
  const c = CRIMES[id];
  const miss = missingReqs(s, { sk: c.sk });
  if (miss.length) return { text: `You don't have the skills for that. You need: ${miss.join(', ')}.`, nolog: true };
  if (bump(s, 'crime') > 4) return { text: 'You should lay low for the rest of the year.', nolog: true };
  tally(s, 'crimes');
  let odds = c.success + skill(s, 'streetwise') / 250 + (c.skillKey ? skill(s, c.skillKey) / 300 : 0);
  if (trait(s, 'cunning')) odds += 0.1;
  if (trait(s, 'lucky')) odds += 0.05;
  odds += powerCrimeEdge(s); // invisibility or shapeshifting (51-chaos.js)
  if (trait(s, 'anxious')) odds -= 0.05;
  addSkill(s, 'streetwise', c.skill || 2);
  if (chance(clamp(odds, 0.03, 0.95))) {
    let loot = 0;
    if (id === 'embezzle') loot = Math.round(M(s).career.salary * randFloat(0.1, 1.2));
    else if (c.loot[1] > 0) loot = price(s, randInt(c.loot[0], c.loot[1]));
    add(s, { money: loot, karma: c.karma, happy: randInt(1, 4) });
    tally(s, 'crimeLoot', loot); // what it leaves behind is a case file (63-cases.js)
    webFact(s, 'crime_clean', { crime: id });
    return { text: vary(pick(CRIME_WIN[id])) + (loot ? ` You got ${fmtMoney(loot)}.` : ''), emoji: c.emoji };
  }
  if (c.deadly && chance(c.deadly)) { die(s, 'a police shootout'); return 'It went horribly wrong.'; }
  add(s, { karma: Math.round(c.karma / 2) });
  if (chance(c.caught)) return arrest(s, id);
  webFact(s, 'crime_messy', { crime: id }); // you got away, but it was untidy
  add(s, { happy: -2 });
  return vary('{It went sideways, but you got away.|You panicked and ran. Nobody followed.|You chickened out at the last second.}');
}

// Minor offenses: a fine and a note on your record. No trial.
function arrestMinor(s, id) {
  const c = CRIMES[id];
  const fine = price(s, randInt(150, 1500));
  M(s).money -= fine;
  M(s).record.push({ crime: id, year: s.year, years: 0 });
  log(s, `🚓 You were cited for ${c.verb} and fined ${fmtMoney(fine)}.`, 'bad');
}

function arrest(s, id) {
  const c = CRIMES[id];
  if (c.sentence[1] === 0) { arrestMinor(s, id); return { text: `You were caught ${c.verb === 'vandalism' ? 'vandalizing' : 'in the act'} and fined.`, tone: 'bad', emoji: '🚓' }; }
  if (A(s) < 12) {
    for (const p of relPeople(s, ['parent'])) addRel(s, p.id, -10);
    add(s, { happy: -5 });
    return { text: 'You were caught. The police brought you home to your very disappointed parents.', tone: 'bad', emoji: '🚓' };
  }
  tally(s, 'arrests');
  webFact(s, 'arrested', { crime: id });
  popup(s, {
    emoji: '⚖️', title: 'Court date', text: `You've been charged with ${c.verb}. Who will defend you?`, handler: 'trial', ctx: { crime: id },
    choices: LAWYERS.map((l) => ({ label: l.emoji + ' ' + l.name, value: l.id, sub: l.cost ? fmtMoney(price(s, l.cost)) : 'Free', disabled: price(s, l.cost) > M(s).money && l.cost > 0 })).concat([
      { label: '🙋 Represent yourself', value: 'self', sub: hasDegree(s, 'jd') ? 'You know the law' : 'Bold' },
      { label: '🙇 Plead guilty for a lighter sentence', value: 'plea' },
    ]),
  });
  return { text: `🚔 You were arrested for ${c.verb}!`, tone: 'bad', emoji: '🚔' };
}
// Representing yourself, in a criminal trial or a lawsuit (42-courts.js): a law degree, years
// as a lawyer or judge, and charisma help. On the LAWYERS bonus scale: about -0.08 for a
// layperson, up to about 0.35 for a seasoned trial lawyer.
function selfDefense(s) {
  const c = M(s).career;
  let b = skill(s, 'charisma') / 1000 - 0.08;
  if (hasDegree(s, 'jd')) b += 0.12 + skill(s, 'charisma') / 1000;
  if (c && ['lawyer', 'judge'].includes(c.id)) b += c.level * 0.03;
  return b;
}
onChoice('trial', (s, ctx, lid) => {
  const c = CRIMES[ctx.crime];
  if (lid === 'plea') return sentence(s, ctx.crime, 0.55, 'You pleaded guilty.');
  const L = lid === 'self' ? { id: 'self', cost: 0, bonus: selfDefense(s) } : LAWYERS.find((l) => l.id === lid);
  const cost = price(s, L.cost);
  if (!pay(s, cost)) return cantAfford(cost);
  const priors = M(s).record.length;
  let odds = c.conviction - L.bonus - (M(s).karma - 50) / 400 + priors * 0.04 + (M(s).wanted ? 0.1 : 0) + webJuryEdge(s); // your name travels (62-web.js)
  if (trait(s, 'lucky')) odds -= 0.05;
  if (trait(s, 'charming')) odds -= 0.03;
  if (!chance(clamp(odds, 0.05, 0.97))) {
    add(s, { happy: 12 });
    tally(s, 'acquittals');
    return { text: `NOT GUILTY! ${L.id === 'public' ? 'Your public defender pulled off a miracle.' : L.id === 'self' ? 'You defended yourself, and the jury believed you.' : 'Your lawyer earned every penny.'}`, tone: 'good', emoji: '🎉' };
  }
  return sentence(s, ctx.crime, 1, 'The jury found you guilty.');
});
function sentence(s, crimeId, mult, lead) {
  const c = CRIMES[crimeId];
  const priors = M(s).record.filter((r) => CRIMES[r.crime] && CRIMES[r.crime].felony).length;
  let yrs = Math.round((randInt(c.sentence[0], c.sentence[1]) + priors) * mult);
  if (c.sentence[1] >= 99 && mult >= 1 && chance(0.35)) yrs = 99;
  M(s).record.push({ crime: crimeId, year: s.year, years: yrs });
  if (c.felony) tally(s, 'felonies');
  if (yrs <= 0) {
    const fine = price(s, randInt(500, 5000));
    M(s).money -= fine;
    return { text: `${lead} You got probation and a ${fmtMoney(fine)} fine.`, tone: 'bad', emoji: '⚖️' };
  }
  goToPrison(s, yrs, crimeId);
  return { text: `${lead} You were sentenced to ${yrs >= 99 ? 'life in prison' : nOf(yrs, 'year') + (M(s).prison.juvie ? ' in juvenile detention' : ' in prison')}.`, tone: 'bad', emoji: '⛓️' };
}

function goToPrison(s, years, crimeId) {
  const juvie = A(s) < 18;
  if (juvie) years = Math.min(years, 4);
  const m = M(s);
  m.prison = { yearsLeft: years, total: years, served: 0, crime: crimeId, behavior: 50, juvie, name: pick(juvie ? JUVIE_NAMES : PRISON_NAMES), gang: null };
  m.wanted = 0;
  if (m.career) leaveJob(s, 'jailed');
  m.ptJob = null;
  if (m.edu.current) { m.edu.current = null; m.edu.dropouts++; }
  clearKind(s, 'classmate');
  if (m.housing.type === 'rent') m.housing = { type: 'homeless', assetId: null, rent: 0, name: '' };
  tally(s, 'prisonStints');
  add(s, { happy: -15 });
  const rom = romanticId(s);
  if (rom && years >= 2 && chance(0.4)) {
    const n = nm(s, rom);
    if (relKind(s, rom) === 'spouse') divorce(s, rom, false); else endRomance(s, rom, 'ex');
    log(s, `💔 ${n} left you after your conviction.`, 'bad');
  }
  clearKind(s, 'cellmate');
  const cm = makeAdultNear(s, { minAge: juvie ? A(s) : 19, maxAge: juvie ? 17 : 60, gender: P(s).gender === 'x' ? undefined : P(s).gender });
  cm.job = null;
  setRel(s, cm.id, 'cellmate', randInt(20, 55));
}

function release(s, how) {
  const m = M(s);
  const name = m.prison.name;
  const left = stashCount(s) ? ' Your stash stays behind for whoever gets your bunk.' : '';
  m.prison = null;
  if (m.housing.type !== 'own') m.housing = relPeople(s, ['parent']).length && A(s) < 30 ? { type: 'parents', assetId: null, rent: 0, name: '' } : (A(s) < 18 ? { type: 'parents', assetId: null, rent: 0, name: '' } : { type: 'homeless', assetId: null, rent: 0, name: '' });
  add(s, { happy: 15 });
  for (const pid in m.rels) if (m.rels[pid].kind === 'cellmate') m.rels[pid].kind = m.rels[pid].rel >= 50 ? 'friend' : 'ex';
  for (const pid in m.rels) if (m.rels[pid].kind === 'ex' && s.people[pid] && !s.people[pid].partner && m.rels[pid].since === s.year) delete m.rels[pid];
  announce(s, { emoji: '🔓', title: 'Free!', text: `${how || 'You served your time.'} You walked out of ${name} a free person.${left}`, tone: 'good' });
}

function prisonTick(s) {
  const m = M(s);
  // Old crimes catching up with you.
  const heat = m.flags.heat || [];
  if (heat.length) {
    m.flags.heat = heat.filter((h) => s.year - h.year <= 7);
    if (!m.prison && m.flags.heat.length && chance(0.12)) {
      const h = pick(m.flags.heat);
      m.flags.heat = m.flags.heat.filter((x) => x !== h);
      announce(s, { emoji: '🕵️', title: 'Cold case', text: `Detectives finally linked you to a ${CRIMES[h.crime].verb} case from ${h.year}.`, tone: 'bad' });
      const r = arrest(s, h.crime);
      if (r && r.text) log(s, r.text, 'bad');
      return;
    }
  }
  if (m.wanted && !m.prison) {
    if (chance(clamp(0.25 - skill(s, 'streetwise') / 400, 0.06, 0.25))) {
      const left = m.wanted;
      m.wanted = 0;
      announce(s, { emoji: '🚨', title: 'Caught!', text: 'The police tracked you down. Your time on the run is over.', tone: 'bad' });
      M(s).record.push({ crime: 'escape', year: s.year, years: 2 });
      goToPrison(s, left + randInt(2, 4), 'escape');
    } else {
      log(s, '🕶️ Another year on the run.', 'bad');
    }
    return;
  }
  const pr = m.prison;
  if (!pr) return;
  pr.served++;
  tally(s, 'prisonYears');
  if (pr.total < 99) pr.yearsLeft--;
  pr.behavior = clamp100(pr.behavior + randInt(-3, 5));
  if (pr.total < 99 && pr.yearsLeft <= 0) { release(s); return; }
  if (pr.total >= 2 && pr.served >= Math.ceil(Math.min(pr.total, 40) / 3) && pr.behavior >= 55 && chance(0.5)) {
    popup(s, {
      emoji: '📋', title: 'Parole hearing', text: 'The parole board will decide if you can go home early. How do you present yourself?', handler: 'parole',
      choices: [{ label: '🙏 Express genuine remorse', value: 'remorse' }, { label: '😶 Keep it short', value: 'quiet' }, { label: '😠 Argue that you were framed', value: 'argue' }],
    });
  }
}
onChoice('parole', (s, ctx, v) => {
  const pr = M(s).prison;
  if (!pr) return;
  const odds = pr.behavior / 140 + (v === 'remorse' ? 0.15 : v === 'argue' ? -0.25 : 0) + (M(s).karma - 50) / 300;
  if (chance(clamp(odds, 0.03, 0.9))) { release(s, 'The parole board granted your release.'); return; }
  pr.behavior = clamp100(pr.behavior - 5);
  return { text: 'Parole denied.', tone: 'bad' };
});

/* ---- prison actions ------------------------------------------------ */
const jailed = (s) => !s.dead && inPrison(s);
defAction({
  id: 'pr_workout', cat: 'prison', label: 'Work out in the yard', emoji: '🏋️',
  when: jailed,
  run: (s) => { const n = bump(s, 'prworkout'); addSkill(s, 'fitness', randFloat(3, 6) / n); add(s, { health: n <= 2 ? randInt(1, 3) : 0, happy: 1 }); return 'You pumped iron in the yard. The other inmates took notice.'; },
});
defAction({
  id: 'pr_library', cat: 'prison', label: 'Prison library', emoji: '📚',
  when: jailed,
  run: (s) => { const n = bump(s, 'prlib'); add(s, { smarts: n <= 3 ? randInt(1, 3) : 0 }); M(s).prison.behavior = clamp100(M(s).prison.behavior + 2); return `You read ${pick(['a dusty law textbook', 'a stack of mystery novels', 'a philosophy book', 'a book about escaping prison (ironic)'])}.`; },
});
defAction({
  id: 'pr_behave', cat: 'prison', label: 'Keep your head down', emoji: '😇', desc: 'Good behavior helps at parole.',
  when: jailed,
  run: (s) => { const n = bump(s, 'prbehave'); M(s).prison.behavior = clamp100(M(s).prison.behavior + Math.round(randInt(5, 10) / n)); add(s, { karma: 1 }); return 'You did your chores, followed the rules, and stayed out of trouble.'; },
});
defAction({
  id: 'pr_job', cat: 'prison', label: 'Work a prison job', emoji: '🧺',
  when: jailed,
  run: (s) => {
    if (bump(s, 'prjob') > 1) return { text: 'You already worked your shifts this year.', nolog: true };
    const pay = price(s, randInt(150, 600));
    add(s, { money: pay });
    M(s).prison.behavior = clamp100(M(s).prison.behavior + 4);
    return `You ${pick(['worked in the laundry', 'cooked in the kitchen', 'stamped license plates', 'mopped the halls'])} and earned ${fmtMoney(pay)}.`;
  },
});
defAction({
  id: 'pr_ged', cat: 'prison', label: 'Study for your GED', emoji: '📝',
  when: (s) => jailed(s) && !hasHighSchool(s) && A(s) >= 16,
  run: (s) => {
    if (bump(s, 'prged') > 1) return { text: 'The next exam is next year.', nolog: true };
    if (chance(0.25 + P(s).stats.smarts / 120)) { M(s).edu.degrees.push({ type: 'ged', year: s.year, gpa: 60 }); M(s).prison.behavior = clamp100(M(s).prison.behavior + 10); return { text: 'You earned your GED behind bars!', tone: 'good' }; }
    return 'You failed the GED exam this time.';
  },
});
defAction({
  id: 'pr_gang', cat: 'prison', label: 'Join a gang', emoji: '🐍',
  when: (s) => jailed(s) && !M(s).prison.gang && !M(s).prison.juvie,
  run: (s) => {
    if (vioOn() && A(s) >= 18) { vioInitiation(s, 'prison'); return; } // they want proof (72-violence.js)
    const g = pick(GANGS);
    if (!chance(0.5 + skill(s, 'martial') / 200 + skill(s, 'streetwise') / 200)) { add(s, { health: -randInt(5, 12) }); return `${cap(g)} weren't impressed. You got roughed up for asking.`; }
    M(s).prison.gang = g;
    M(s).prison.behavior = clamp100(M(s).prison.behavior - 10);
    addSkill(s, 'streetwise', 5);
    return `You joined ${g}. You've got backup now.`;
  },
});
defAction({
  id: 'pr_riot', cat: 'prison', label: 'Start a riot', emoji: '🔥',
  when: (s) => jailed(s) && A(s) >= 14,
  run: (s) => {
    if (bump(s, 'riot') > 1) return { text: 'The guards are watching you too closely now.', nolog: true };
    const pr = M(s).prison;
    pr.behavior = clamp100(pr.behavior - 25);
    if (chance(0.06)) { M(s).wanted = Math.max(1, pr.yearsLeft); M(s).prison = null; tally(s, 'escapes'); if (M(s).housing.type !== 'own') M(s).housing = { type: 'homeless', assetId: null, rent: 0, name: '' }; return { text: 'In the chaos of the riot, you slipped out a broken gate. You escaped!', tone: 'good' }; }
    if (chance(0.3)) { add(s, { health: -randInt(8, 20) }); if (pr.total < 99) pr.yearsLeft += 1; return 'The riot was crushed. You were hurt and got a year added to your sentence.'; }
    add(s, { happy: 4 });
    return 'You started a riot. It was chaos. The guards never figured out who started it.';
  },
});
defAction({
  id: 'pr_escape', cat: 'prison', label: 'Attempt escape', emoji: '🕳️',
  when: jailed,
  run: (s) => {
    if (bump(s, 'escape') > 1) return { text: 'Security is too tight after your last attempt.', nolog: true };
    popup(s, {
      emoji: '🕳️', title: 'Escape plan', text: 'How will you get out?', handler: 'escape',
      choices: [{ label: '⛏️ Dig a tunnel with a spoon', value: 'tunnel' }, { label: '🧺 Hide in the laundry truck', value: 'laundry' }, { label: '🧗 Climb the fence at night', value: 'fence' }, { label: 'Not today', value: null }],
    });
  },
});
onChoice('escape', (s, ctx, how) => {
  const pr = M(s).prison;
  if (!how || !pr) return;
  let odds = { tunnel: 0.12, laundry: 0.18, fence: 0.15 }[how];
  odds += skill(s, 'streetwise') / 400 + (how === 'fence' ? skill(s, 'fitness') / 300 : 0) + (how === 'tunnel' ? P(s).stats.smarts / 600 : 0);
  if (trait(s, 'cunning')) odds += 0.06;
  if (chance(clamp(odds, 0.02, 0.6))) {
    M(s).wanted = Math.max(1, pr.total >= 99 ? 30 : pr.yearsLeft);
    M(s).prison = null;
    tally(s, 'escapes');
    if (M(s).housing.type !== 'own') M(s).housing = { type: 'homeless', assetId: null, rent: 0, name: '' };
    add(s, { happy: 15 });
    return { text: 'You escaped! You are now a fugitive. Keep your head down.', tone: 'good', emoji: '🏃' };
  }
  if (how === 'fence' && chance(0.08)) { die(s, 'a failed prison escape'); return 'The fence was electrified.'; }
  if (pr.total < 99) pr.yearsLeft += randInt(2, 5);
  pr.behavior = clamp100(pr.behavior - 30);
  add(s, { happy: -8 });
  return { text: 'The guards caught you. Years were added to your sentence.', tone: 'bad' };
});
defAction({
  id: 'pr_appeal', cat: 'prison', label: 'File an appeal', emoji: '📜',
  when: (s) => jailed(s) && !M(s).prison.juvie,
  sub: (s) => fmtMoney(price(s, 20000)),
  run: (s) => {
    if (bump(s, 'appeal') > 1) return { text: 'Your lawyer says to wait for next year.', nolog: true };
    const cost = price(s, 20000);
    if (!pay(s, cost)) return cantAfford(cost);
    const pr = M(s).prison;
    const r = rand();
    if (r < 0.08) { release(s, 'Your conviction was overturned on appeal!'); return; }
    if (r < 0.35 && pr.total < 99) { pr.yearsLeft = Math.max(1, Math.round(pr.yearsLeft * randFloat(0.4, 0.7))); return { text: `Your sentence was reduced. ${nOf(pr.yearsLeft, 'year')} left.`, tone: 'good' }; }
    return { text: 'Your appeal was denied.', tone: 'bad' };
  },
});

/* ---- the prison economy --------------------------------------------
 * Contraband (CONTRABAND in 07-data-crime.js) sits in M(s).prison.stash, so it's
 * gone the day you walk out. Resale prices are rolled once a year into
 * prison.market; lockdowns push them up (spikeContraband). */
function stash(s) { const pr = M(s).prison; return pr.stash || (pr.stash = {}); }
function stashCount(s) { return inPrison(s) ? Object.values(stash(s)).reduce((t, n) => t + n, 0) : 0; }
function hasStash(s, id) { return inPrison(s) && (stash(s)[id] || 0) > 0; }
function takeStash(s, id, n) { const st = stash(s); st[id] = Math.max(0, (st[id] || 0) - n); if (!st[id]) delete st[id]; }
function stashLine(s) { return CONTRABAND_IDS.filter((id) => stash(s)[id]).map((id) => `${CONTRABAND[id].emoji} ${stash(s)[id]}`).join(' · '); }
function contrabandPrice(s, id) {
  const pr = M(s).prison;
  if (!pr.market || pr.market.year !== s.year) {
    pr.market = { year: s.year, mult: {} };
    for (const k of CONTRABAND_IDS) pr.market.mult[k] = Math.round(randFloat(1.2, 2.6) * 100) / 100;
  }
  const C = CONTRABAND[id];
  return Math.max(1, Math.round((price(s, C.cost) / C.lot) * pr.market.mult[id] * (pr.gang ? 1.2 : 1)));
}
function spikeContraband(s, factor) {
  contrabandPrice(s, CONTRABAND_IDS[0]);
  const mk = M(s).prison.market;
  for (const k in mk.mult) mk.mult[k] = Math.round(mk.mult[k] * factor * 100) / 100;
}
// Caught with contraband: it's confiscated, your record suffers, and phones or weapons can add a year.
function bustStash(s, ids) {
  const pr = M(s).prison;
  const serious = ids.some((id) => CONTRABAND[id].serious && stash(s)[id]);
  for (const id of ids) takeStash(s, id, Infinity);
  pr.behavior = clamp100(pr.behavior - (serious ? 20 : 10));
  tally(s, 'contrabandBusts');
  if (serious && pr.total < 99 && chance(0.5)) { pr.yearsLeft++; return ' A year was added to your sentence.'; }
  return '';
}
const STASH_SPOTS = ['inside your mattress', 'behind a loose brick', 'in the toilet tank', 'inside a hollowed-out book', 'taped under your bunk', 'in a sock inside another sock'];
defAction({
  id: 'pr_dealer', cat: 'prison', label: 'Contraband dealer', emoji: '🛒', desc: 'Buy low in the yard, sell high on the block.',
  when: jailed,
  sub: (s) => (stashCount(s) ? 'Your stash: ' + stashLine(s) : 'Buy low in the yard, sell high on the block.'),
  run: (s) => {
    if (bump(s, 'dealer') > 3) return { text: 'The dealer says to come back next year. Too many eyes on the yard.', nolog: true };
    const st = stash(s);
    const ids = CONTRABAND_IDS.filter((id) => !M(s).prison.juvie || CONTRABAND[id].juvie);
    const buys = ids.map((id) => { const C = CONTRABAND[id], cost = price(s, C.cost); return { label: `Buy ${C.emoji} ${C.lotName}`, value: 'buy:' + id, sub: fmtMoney(cost), disabled: M(s).money < cost }; });
    const sells = CONTRABAND_IDS.filter((id) => st[id]).map((id) => { const C = CONTRABAND[id]; return { label: `Sell your ${C.emoji} ${C.name.toLowerCase()} (${st[id]})`, value: 'sell:' + id, sub: `${fmtMoney(contrabandPrice(s, id) * st[id])} this year` }; });
    popup(s, {
      emoji: '🛒', title: 'Contraband dealer', handler: 'contraband',
      text: stashCount(s) ? `Your stash: ${stashLine(s)}. Prices on the block change every year.` : 'The dealer opens their jacket. Everything has a price, and resale prices change every year.',
      choices: buys.concat(sells, [{ label: 'Walk away', value: null }]),
    });
  },
});
onChoice('contraband', (s, ctx, v) => {
  if (!v || !inPrison(s)) return;
  const [act, id] = v.split(':');
  const C = CONTRABAND[id];
  if (!C) return;
  const pr = M(s).prison;
  if (act === 'buy') {
    const cost = price(s, C.cost);
    if (!pay(s, cost)) return cantAfford(cost);
    if (chance(C.risk / 2)) { pr.behavior = clamp100(pr.behavior - 5); return { text: `A guard saw the handoff. Your ${C.name.toLowerCase()} went in the evidence bin and your money is gone.`, tone: 'bad' }; }
    stash(s)[id] = (stash(s)[id] || 0) + C.lot;
    return `You bought ${C.lotName} and hid ${C.lot > 1 ? 'them' : 'it'} ${pick(STASH_SPOTS)}.`;
  }
  const n = stash(s)[id] || 0;
  if (!n) return;
  const odds = C.risk * (1 + n / 8) - skill(s, 'streetwise') / 400 - (trait(s, 'cunning') ? 0.04 : 0) - (pr.gang ? 0.03 : 0);
  if (chance(clamp(odds, 0.01, 0.5))) return { text: `A guard caught you dealing ${C.name.toLowerCase()}. All of it was confiscated.${bustStash(s, [id])}`, tone: 'bad' };
  const earned = contrabandPrice(s, id) * n;
  takeStash(s, id, n);
  add(s, { money: earned });
  addSkill(s, 'streetwise', 1);
  tally(s, 'contrabandSales', earned);
  return { text: `You sold your ${C.name.toLowerCase()} on the block for ${fmtMoney(earned)}.`, tone: 'good' };
});
defAction({
  id: 'pr_stash', cat: 'prison', label: 'Your stash', emoji: '🎒',
  when: (s) => jailed(s) && stashCount(s) > 0,
  sub: (s) => stashLine(s),
  run: (s) => {
    const st = stash(s);
    const food = (st.noodles || 0) + (st.candy || 0);
    const choices = [];
    if (st.phone) choices.push({ label: '📱 Call home on the phone', value: 'call' });
    if (food) choices.push({ label: '🍜 Have a contraband feast', value: 'feast' });
    if (food && pickRel(s, ['cellmate'])) choices.push({ label: '🤝 Share snacks with your cellmate', value: 'share' });
    if (st.hooch) choices.push({ label: '🍶 Drink some hooch', value: 'drink' });
    choices.push({ label: '🚽 Flush everything', value: 'flush' }, { label: 'Close', value: null });
    popup(s, { emoji: '🎒', title: 'Your stash', text: `Hidden in your cell: ${stashLine(s)}.${st.shiv ? ' The shiv gives you an edge in fights.' : ''}`, handler: 'stash', choices });
  },
});
onChoice('stash', (s, ctx, v) => {
  if (!v || !inPrison(s)) return;
  const st = stash(s), pr = M(s).prison;
  if (v === 'call') {
    if (!st.phone) return;
    if (bump(s, 'prcall') > 2) return { text: "The battery's dead and the charger guy got transferred.", nolog: true };
    if (chance(0.12)) return { text: `A guard heard the ringtone.${bustStash(s, ['phone'])}`, tone: 'bad' };
    const pid = pickRel(s, [...K_FAMILY, ...K_ROMANCE, ...K_FRIENDS], (p) => ageOf(s, p) >= 10);
    if (!pid) { add(s, { happy: -2 }); return 'You scrolled through the contacts. Nobody you could call.'; }
    addRel(s, pid, 6);
    add(s, { happy: 5 });
    return { text: `You called ${nm(s, pid)} from your bunk. They couldn't believe it was you.`, person: pid };
  }
  if (v === 'feast' || v === 'share') {
    if (bump(s, 'feast') > 2) return { text: "You're still full from last time.", nolog: true };
    const ate = Math.min(st.noodles || 0, 5) + Math.min(st.candy || 0, 2);
    takeStash(s, 'noodles', 5);
    takeStash(s, 'candy', 2);
    if (v === 'share') {
      const cm = pickRel(s, ['cellmate']);
      if (cm) addRel(s, cm, 10);
      add(s, { happy: 3, karma: 1 });
      return `You and ${cm ? nm(s, cm) : 'your cellmate'} split a feast of noodles and candy. ${cm ? nm(s, cm) : 'They'} owe${cm ? 's' : ''} you one.`;
    }
    add(s, { happy: Math.min(7, 2 + Math.round(ate / 2)) });
    return 'You cooked noodles with hot tap water and crushed candy on top. Five stars.';
  }
  if (v === 'drink') {
    if (!st.hooch) return;
    takeStash(s, 'hooch', 1);
    habit(s, 'alcohol', 8);
    if (chance(0.12)) { add(s, { health: -3, happy: -2 }); return 'It was mostly fermented ketchup. You regret everything.'; }
    add(s, { happy: 5 });
    return 'It tasted like fruit cocktail and bad decisions. You slept great.';
  }
  if (v === 'flush') {
    for (const id of CONTRABAND_IDS) takeStash(s, id, Infinity);
    pr.behavior = clamp100(pr.behavior + 2);
    return 'You flushed it all. The plumbing on your block will never be the same.';
  }
});
defAction({
  id: 'pr_brew', cat: 'prison', label: 'Brew hooch', emoji: '🍶', desc: 'Fruit, sugar, a plastic bag and patience.',
  when: (s) => jailed(s) && !M(s).prison.juvie && A(s) >= 16,
  run: (s) => {
    if (bump(s, 'brew') > 1) return { text: 'Your last batch is still fermenting.', nolog: true };
    if (chance(0.12)) { M(s).prison.behavior = clamp100(M(s).prison.behavior - 6); return { text: 'The bag burst in the middle of the night. Your cell smells like a fruit salad crime scene.', tone: 'bad' }; }
    const n = randInt(2, 4);
    stash(s).hooch = (stash(s).hooch || 0) + n;
    return `You brewed ${n} bags of hooch from ${pick(['canteen oranges', 'ketchup packets and bread', 'fruit cocktail cups', 'a suspicious amount of jelly'])}. It smells like a mistake.`;
  },
});

/* ---- crimes against a person -------------------------------------- */
defAction({
  id: 'p_assault', cat: 'person', target: 'person', label: 'Assault', emoji: '👊',
  when: (s, pid) => reachable(s, pid) && A(s) >= 8 && tAge(s, pid) >= 6,
  run: (s, pid) => {
    if (vioOn() && A(s) >= 18) { vioFight(s, pid); return; } // a scene you can walk out of (72-violence.js)
    const p = tgt(s, pid);
    const me = skill(s, 'martial') + skill(s, 'fitness') / 2 + P(s).stats.health / 5 + (trait(s, 'hotheaded') ? 10 : 0) + randInt(0, 40);
    const them = Math.min(ageOf(s, p), 30) + p.stats.health / 4 + randInt(0, 40) - (ageOf(s, p) > 65 ? 25 : 0);
    tally(s, 'fights');
    webFact(s, 'assault', { pid });
    add(s, { karma: -6 });
    setRel(s, pid, isFamilyKind(relKind(s, pid)) || K_ROMANCE.includes(relKind(s, pid)) ? relKind(s, pid) : 'enemy', 5);
    if (K_ROMANCE.includes(relKind(s, pid)) && chance(0.6)) endRomance(s, pid, relKind(s, pid) === 'spouse' ? 'exspouse' : 'ex');
    let out;
    if (me > them) {
      p.stats.health = clamp100(p.stats.health - randInt(10, 30));
      tally(s, 'fightWins');
      out = `You beat up ${p.first}.`;
    } else {
      add(s, { health: -randInt(5, 15), happy: -4 });
      if (chance(0.15)) getSick(s, pick(['broken_arm', 'concussion']));
      out = `You picked a fight with ${p.first} and lost.`;
    }
    if (A(s) >= 12 && chance(0.3)) {
      const r = arrest(s, 'assault');
      return { text: out + ' ' + r.text, tone: 'bad' };
    }
    return out;
  },
});
defAction({
  id: 'p_murder', cat: 'person', target: 'person', label: 'Murder', emoji: '🔪',
  when: (s, pid) => reachable(s, pid) && A(s) >= 14 && tAge(s, pid) >= 1,
  run: (s, pid) => {
    popup(s, {
      emoji: '🔪', title: 'Murder ' + nm(s, pid) + '?', text: 'This cannot be undone. How?', handler: 'murder', ctx: { pid },
      choices: [
        { label: '🧪 Poison their drink', value: 'poison' },
        { label: '🎭 Stage an "accident"', value: 'accident' },
        { label: '🕴️ Hire a hitman', value: 'hitman', sub: fmtMoney(price(s, 50000)) },
        { label: "I can't do this", value: null },
      ],
    });
  },
});
onChoice('murder', (s, ctx, how) => {
  const p = s.people[ctx.pid];
  if (!how || !p || !p.alive) return;
  if (how === 'hitman' && !pay(s, price(s, 50000))) return cantAfford(price(s, 50000));
  let odds = { poison: 0.45, accident: 0.4, hitman: 0.65 }[how] + skill(s, 'streetwise') / 400;
  if (trait(s, 'cunning')) odds += 0.08;
  if (!chance(clamp(odds, 0.05, 0.85))) {
    setRel(s, ctx.pid, 'enemy', 0);
    add(s, { karma: -15 });
    if (chance(0.6)) return arrest(s, 'attempted_murder');
    return { text: `${p.first} survived. They don't know it was you... yet.`, tone: 'bad' };
  }
  add(s, { karma: -40, happy: trait(s, 'kind') ? -15 : -5 });
  tally(s, 'murders');
  npcDies(s, p, how === 'accident' ? 'a tragic accident' : 'suspicious circumstances', { murdered: true });
  webFact(s, 'killed', { pid: ctx.pid, how }); // opens the secret and the case (62-web.js, 63-cases.js)
  if (chance(how === 'hitman' ? 0.2 : 0.35)) return arrest(s, 'murder');
  return { text: `${p.first} is dead. Nobody suspects you. Yet.`, tone: 'bad' };
});
