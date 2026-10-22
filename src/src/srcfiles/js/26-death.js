/* =====================================================================
 * 26-death.js — dying, the estate, and continuing as your child.
 *
 * When the player dies, a lineage record is written (s.lineage) and the
 * life is over until they pick an heir with continueAs(s, childId) or
 * start fresh. The estate is split by M(s).will.
 * ===================================================================== */

function lastJobTitle(s) {
  const m = M(s);
  if (m.career) return careerTitle(s);
  const co = (m.companies || []).find((c) => c.ceo === 'you' && !c.closed);
  if (co) return 'CEO of ' + co.name;
  if (m.retired) {
    const h = m.jobHistory[m.jobHistory.length - 1];
    return h && JOBS[h.id] ? 'Retired ' + JOBS[h.id].ladder[h.level][0] : 'Retired';
  }
  const h = m.jobHistory[m.jobHistory.length - 1];
  return h && JOBS[h.id] ? 'Former ' + JOBS[h.id].ladder[h.level][0] : jobTitle(s) || 'None';
}

function die(s, cause) {
  if (s.dead) return;
  const p = P(s), m = M(s);
  const age = A(s);
  p.alive = false;
  p.deathYear = s.year;
  p.cause = cause;
  s.dead = true;
  if (p.partner && s.people[p.partner]) {
    const q = s.people[p.partner];
    if (q.partner === p.id) { q.partner = null; q.married = false; }
  }
  checkAchievements(s);
  const titles = legacyTitles(s);
  const rec = {
    id: p.id, name: royalName(s, p), gender: p.gender, born: p.birthYear, died: s.year, age, cause,
    worth: Math.round(netWorth(s)), title: titles[0] ? titles[0].name : 'Ordinary Citizen', titleEmoji: titles[0] ? titles[0].emoji : '🙂',
    titles: titles.map((t) => t.id), gen: s.gen, job: lastJobTitle(s), country: p.country,
    kids: myChildren(s, { dead: true }).length, achievements: m.achievements.slice(),
    goals: m.goals.filter((g) => g.done).length + '/' + m.goals.length,
    stats: Object.assign({}, p.stats), karma: m.karma, fame: m.fame, edu: degreeLabel(bestDegree(s)),
    epitaph: epitaphFor(s, titles),
  };
  s.lineage.push(rec);
  s.pending = [];
  log(s, `⚰️ You died ${deathPhrase(cause)} at age ${age}.`, 'bad');
  popup(s, { emoji: '⚰️', title: 'Your life has ended', text: `${fullName(p)} died ${deathPhrase(cause)} at age ${age}.`, tone: 'bad', choices: [{ label: 'See my life story' }] });
  onLifeEnded(s, rec);
}

function epitaphFor(s, titles) {
  const t = titles[0] ? titles[0].id : '';
  const lines = {
    saint: 'The world was kinder with them in it.', villain: 'Nobody is quite sure how they slept at night.', tycoon: 'They could not take it with them, but they tried.',
    millionaire: 'Comfortable to the very end.', broke: 'Died owing money to just about everyone.', jailbird: 'Spent more birthdays behind bars than in front of a cake.',
    star: 'Their name will be in lights for a long time.', scholar: 'Never stopped learning.', family: 'Their family tree has a lot of branches.',
    centenarian: 'One hundred candles and still going strong, until they weren’t.', gone_soon: 'Gone far too soon.', heartbreaker: 'Left a trail of broken hearts.',
    globetrotter: 'Saw the whole world and loved it.', workaholic: 'Probably still answering emails somewhere.', athlete: 'Ran their race.',
    lonely: 'Walked their own path.', politician: 'Promised a lot. Delivered some.', fugitive: 'Never stopped running.',
    monarch: 'They wore the crown, and the crown wore on them.', goat: 'The greatest of all time. Ask anyone. Ask them twice.', legend: 'The trophies are still on the shelf. The work is still playing somewhere.', don: 'An offer you couldn’t refuse, to the very end.', royal: 'Born to the palace. Never quite out of the papers.',
  };
  return lines[t] || pick(['Lived, laughed, aged up.', 'They did their best.', 'Here lies a perfectly ordinary legend.', 'They were here, and it mattered.']);
}

/* ---- the estate ---------------------------------------------------- */
// Companies are not split up: they pass whole to your named heir, or else to the child you continue as.
function estateValue(s) { return Math.max(0, Math.round(netWorth(s) - companiesValue(s))); }
function heirOptions(s) {
  return myChildren(s).filter((c) => !flag(s, 'disowned_' + c.id)).sort((a, b) => a.birthYear - b.birthYear);
}
function estateShares(s) {
  const total = estateValue(s);
  const shares = {};
  if (!total) return shares;
  const kids = heirOptions(s);
  const sp = spouseId(s) && s.people[spouseId(s)] && s.people[spouseId(s)].alive ? spouseId(s) : null;
  const will = M(s).will;
  if (will === 'charity') return shares;
  const heir = namedHeir(s);
  if (will === 'heir' && heir) { shares[heir.id] = total; return shares; }
  if (will === 'spouse' && sp) { shares[sp] = total; return shares; }
  if ((will === 'eldest' || will === 'youngest') && kids.length) {
    shares[(will === 'eldest' ? kids[0] : kids[kids.length - 1]).id] = total;
    return shares;
  }
  let rest = total;
  if (sp) { shares[sp] = Math.round(total * (kids.length ? 0.5 : 1)); rest -= shares[sp]; }
  if (kids.length) for (const k of kids) shares[k.id] = Math.round(rest / kids.length);
  return shares;
}

/* ---- continue as your child ---------------------------------------- */
// The heir you named (46-parenting.js) takes over your companies and crime family,
// whichever child you go on as.
function continueAs(s, pid) {
  const old = P(s), oldM = M(s);
  const heir = s.people[pid];
  if (!s.dead || !heir || !heir.alive) return false;
  const named = namedHeir(s);
  const shares = estateShares(s);
  const estate = estateValue(s);
  for (const id in shares) if (id !== pid && s.people[id]) s.people[id].money += shares[id];
  const oldPets = Object.values(s.pets).filter((p) => p.alive);
  const oldWill = oldM.will;

  s.playerId = pid;
  s.player = newPlayerBlock();
  useCurrency(s);
  s.gen++;
  s.dead = false;
  s.pending = [];
  s.listings = {};
  const m = M(s);
  m.karma = clamp100(gauss(55, 10));
  m.will = oldWill;
  m.wealthTier = estate > 1e6 ? 'rich' : 'middle';
  const age = ageOf(s, heir);

  // Family, rebuilt around the heir.
  const rel = (lo, hi) => randInt(lo, hi);
  for (const parId of heir.parents) {
    const par = s.people[parId];
    if (par) setRel(s, parId, 'parent', par.id === old.id ? 80 : rel(45, 90));
    if (par) for (const gpId of par.parents) if (s.people[gpId] && s.people[gpId].alive) setRel(s, gpId, 'grandparent', rel(40, 85));
  }
  const oldSpouse = old.partner && s.people[old.partner];
  if (oldSpouse && oldSpouse.alive && !heir.parents.includes(oldSpouse.id)) setRel(s, oldSpouse.id, 'stepparent', rel(30, 70));
  const sibIds = new Set();
  for (const parId of heir.parents) { const par = s.people[parId]; if (par) for (const c of par.children) if (c !== pid) sibIds.add(c); }
  for (const id of sibIds) {
    const sib = s.people[id];
    if (!sib) continue;
    const full = heir.parents.length && heir.parents.every((x) => sib.parents.includes(x));
    setRel(s, id, full ? 'sibling' : 'halfsibling', rel(35, 85));
  }
  if (heir.partner && s.people[heir.partner]) {
    const sp = s.people[heir.partner];
    setRel(s, sp.id, heir.married ? 'spouse' : 'partner', rel(55, 90));
  }
  for (const c of heir.children) {
    const kid = s.people[c];
    if (!kid) continue;
    setRel(s, c, 'child', rel(60, 95));
    for (const gc of kid.children) if (s.people[gc]) setRel(s, gc, 'grandchild', rel(50, 90));
  }
  // Aunts, uncles, cousins, nieces, nephews and in-laws carry over (45-family.js).
  rebuildExtended(s);

  // School, degrees and work from the heir's life so far.
  if (age >= 5 && age < 18) {
    flag(s, 'startedSchool', true);
    const stage = age <= 10 ? 'primary' : age <= 13 ? 'middle' : 'high';
    enrollSchool(s, stage);
    const startAge = { primary: 5, middle: 11, high: 14 }[stage];
    eduCur(s).year = age - startAge + 1;
    eduCur(s).grades = clamp100(heir.stats.smarts * 0.7 + randInt(5, 25));
  } else if (age >= 18) {
    flag(s, 'startedSchool', true);
    const rank = EDU_RANK[heir.edu || 'high'] ?? 1;
    if (rank >= 1) m.edu.degrees.push({ type: 'high', year: heir.birthYear + 18, gpa: 70 });
    if (heir.edu && rank >= 2) m.edu.degrees.push({ type: heir.edu, major: heir.edu === 'trade' ? pick(TRADE_IDS) : (heir.major || pick(MAJOR_IDS)), year: heir.birthYear + 22, gpa: 70 });
    if (heir.job && heir.job.id && JOBS[heir.job.id]) {
      const lvl = Math.min(heir.job.level, JOBS[heir.job.id].ladder.length - 1);
      m.career = { id: heir.job.id, level: lvl, perf: 55, years: Math.max(0, age - 23), levelYears: 1, salary: salaryFor(s, heir.job.id, lvl), term: 0, employer: employerName(s, JOBS[heir.job.id]) };
    } else if (heir.retired) {
      m.retired = { pension: price(s, 15000), year: s.year };
    }
    m.license = chance(0.85);
    m.housing = { type: 'rent', assetId: null, rent: price(s, 18000), name: 'One-Bedroom Apartment' };
  }
  for (const k of SKILL_IDS) if (chance(0.3)) m.skills[k] = randInt(0, Math.min(55, age * 2));
  for (const pet of oldPets) pet.owner = pid;
  // The family business passes to the heir. A trustee runs it until they turn 18.
  const open = (oldM.companies || []).filter((c) => !c.closed);
  const handed = named && named.id !== pid ? open : [];
  const inherited = handed.length ? [] : open;
  for (const co of inherited) {
    co.draw = 0;
    co.auto = true;
    if (age < 18) { co.ceo = 'trustee'; co.ceoName = randomFirst(heir.country, chance(0.5) ? 'm' : 'f') + ' ' + randomLast(heir.country); }
    else if (co.ceo === 'you' && co.equity < 0.5) co.ceo = 'hired';
    if (co.ceo === 'hired' && !co.ceoName) co.ceoName = randomFirst(heir.country, chance(0.5) ? 'm' : 'f') + ' ' + randomLast(heir.country);
  }
  m.companies = inherited;
  if (inherited.length) tally(s, 'inheritedCompanies', inherited.length);
  if (inherited.length && named) tally(s, 'heirBusiness');

  assignGoals(s);
  s.log = [];
  startYearLog(s);
  log(s, `🧬 Generation ${s.gen}: you are now ${fullName(heir)}, ${age} years old, ${genderWord(heir, 'son', 'daughter', 'child')} of the late ${fullName(old)}.`);
  const share = shares[pid] || 0;
  if (share) inherit(s, share, `your ${kinLabel('parent', old).toLowerCase()}`);
  else if (estate > 0) log(s, `📜 ${old.first}'s will left you nothing.`, 'bad');
  if (heir.money > 0 && age >= 18) { m.money += heir.money; heir.money = 0; }
  for (const co of inherited) log(s, `🏢 You inherited ${pctStr(co.equity)} of ${co.name}${co.ceo === 'trustee' ? `. ${co.ceoName} will run it as trustee until you turn 18` : co.ceo === 'hired' ? `, run by ${co.ceoName}` : ''}.`, 'good');
  if (handed.length) passBusiness(s, handed, named, old.first);
  // Fame, a trust fund and know-how from childhood; then the crime family (46-parenting.js).
  childLegacy(s, heir);
  passMob(s, oldM, heir, named, old);
  // A monarch's death passes the crown, maybe to you (38-royalty.js).
  crownCheck(s);
  afterChange(s);
  return true;
}
