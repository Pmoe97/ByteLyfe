/* =====================================================================
 * 45-family.js — the wider family: aunts and uncles, cousins, nieces and
 * nephews, and in-laws; siblings and cousins who grow up, marry, have kids,
 * get promoted and split up; in-laws to win over before the wedding; and
 * family trees for anyone you know. Family events are at the bottom.
 *
 * Relatives are made the first time you look for them (ensureRelatives,
 * ensureInlaws, ensureTreeFor), so lives where you never look stay small.
 *   p.kin = true    this person's parents and siblings have been made
 *   p.kids = true   this person's children have been made (aunts and uncles)
 *   p.tree = id     made for the family tree of someone who isn't family;
 *                   gcPeople keeps them as long as it keeps that person
 * Your aunts and uncles, cousins and nieces and nephews join your relationships
 * as 'aunt', 'cousin' and 'nibling'; your partner's family and your siblings'
 * spouses as 'inlaw' (kinTitle in 13-people.js says which kind of in-law).
 * M(s).flags.kin = true once you've met your extended family.
 * familyTick runs right after npcTick.
 * ===================================================================== */

/* ---- making relatives ------------------------------------------------------ */
function siblingsOf(s, p) {
  const out = new Set();
  for (const id of p.parents) { const par = s.people[id]; if (par) for (const c of par.children) if (c !== p.id && s.people[c]) out.add(c); }
  return [...out].map((id) => s.people[id]);
}
function linkKid(par, kid) {
  if (!par.children.includes(kid.id)) par.children.push(kid.id);
  if (!kid.parents.includes(par.id)) kid.parents.push(par.id);
}
// Someone from the same family: same country, often the same city, a similar skin tone.
function makeKin(s, like, o) {
  const p = makePerson(s, Object.assign({ country: like.country, city: chance(0.6) ? like.city : pick(COUNTRIES[like.country].cities) }, o));
  if (like.look && p.look) p.look.skin = clamp(like.look.skin + randInt(-1, 1), 0, 7);
  assignNpcLife(s, p);
  return p;
}
// A relative who died before you could know them still belongs on the tree.
// They die between minDeath and maxDeath (by default, some time before this year).
function lateKin(s, p, minDeath, maxDeath) {
  const hi = (maxDeath ?? s.year) - 1, lo = Math.min(hi, Math.max(minDeath, p.birthYear + 45));
  p.alive = false;
  p.deathYear = Math.max(p.birthYear + 1, randInt(lo, hi));
  p.cause = npcCause(p.deathYear - p.birthYear);
}
// Both parents, made if missing. deadBy: they died before that year (your own grandparents
// who weren't alive when you were born); otherwise they may be alive or long gone.
function ensureParents(s, p, tree, deadBy) {
  const have = p.parents.map((id) => s.people[id]).filter(Boolean);
  if (have.length >= 2) return;
  const age = ageOf(s, p), first = have[0];
  const g1 = first ? first.gender : chance(0.97) ? 'f' : 'm';
  const made = [];
  if (!first) made.push(makeKin(s, p, { gender: g1, age: age + clamp(Math.round(gauss(29, 5)), 18, 44), last: p.last }));
  const anchor = first || made[0];
  made.push(makeKin(s, p, { gender: g1 === 'f' ? (chance(0.97) ? 'm' : 'f') : chance(0.97) ? 'f' : 'm', age: clamp(ageOf(s, anchor) + randInt(-4, 6), age + 18, 110), last: p.last }));
  for (const par of made) {
    const a = ageOf(s, par);
    if (deadBy) lateKin(s, par, p.birthYear + 1, deadBy);
    else if (!chance(a < 60 ? 0.95 : clamp(1 - (a - 60) / 38, 0.05, 0.9))) lateKin(s, par, p.birthYear + 1);
    if (tree) par.tree = tree;
    linkKid(par, p);
  }
  const [x, y] = p.parents.map((id) => s.people[id]);
  if (x && y && x.alive && y.alive && !x.partner && !y.partner) { x.partner = y.id; y.partner = x.id; x.married = y.married = chance(0.75); }
}
// Brothers and sisters, made once (p.kin). Returns all of p's siblings.
function ensureSiblings(s, p, tree, deadBy) {
  if (p.kin) return siblingsOf(s, p);
  p.kin = true;
  ensureParents(s, p, tree, deadBy);
  const pars = p.parents.map((id) => s.people[id]).filter(Boolean);
  if (!pars.length) return siblingsOf(s, p);
  const youngest = Math.min(...pars.map((x) => ageOf(s, x)));
  // Nobody is born after a parent has died.
  const lastBirth = Math.min(s.year, ...pars.filter((x) => !x.alive).map((x) => x.deathYear));
  const want = weighted([0, 1, 2, 3], (n) => [30, 36, 22, 12][n]) - siblingsOf(s, p).length;
  // Siblings carry the family name: a mother's brothers share her maiden name, not her married one.
  const last = (pars.find((x) => x.gender === 'm') || pars[0]).last || p.last;
  for (let i = 0; i < want; i++) {
    const age = clamp(ageOf(s, p) + randInt(-10, 10), s.year - lastBirth, Math.max(s.year - lastBirth, youngest - 18));
    const sib = makeKin(s, p, { age, last });
    for (let k = 0; k < 12 && siblingsOf(s, p).some((x) => x.first === sib.first); k++) sib.first = randomFirst(sib.country, sib.gender);
    for (const par of pars) linkKid(par, sib);
    if (tree) sib.tree = tree;
    if (age >= 60 && chance(clamp((age - 60) / 40, 0, 0.9))) lateKin(s, sib, sib.birthYear + 45);
  }
  return siblingsOf(s, p);
}
// A husband or wife for a relative who has none.
function spouseFor(s, p, tree) {
  const g = chance(0.9) ? (p.gender === 'm' ? 'f' : p.gender === 'f' ? 'm' : pick(['m', 'f'])) : p.gender;
  const sp = makeKin(s, p, { gender: g, age: clamp(ageOf(s, p) + randInt(-5, 5), 18, 99) });
  if (tree) sp.tree = tree;
  p.partner = sp.id;
  sp.partner = p.id;
  p.married = sp.married = true;
  return sp;
}
// An aunt or uncle's spouse and kids, made once (p.kids).
function ensureKids(s, p) {
  if (p.kids) return;
  p.kids = true;
  const age = p.alive ? ageOf(s, p) : p.deathYear - p.birthYear;
  if (age < 24) return;
  if (p.alive && !p.partner && chance(0.65)) spouseFor(s, p);
  const sp = p.partner && s.people[p.partner];
  const want = weighted([0, 1, 2, 3], (n) => [28, 30, 28, 14][n]) - p.children.length;
  for (let i = 0; i < want; i++) {
    const kidAge = randInt(Math.max(0, ageOf(s, p) - 42), ageOf(s, p) - 20);
    if (!p.alive && s.year - kidAge > p.deathYear) continue;
    const kid = makeKin(s, p, { age: kidAge, last: sp && sp.gender === 'm' && p.gender !== 'm' ? sp.last : p.last });
    linkKid(p, kid);
    if (sp) linkKid(sp, kid);
  }
}
function addKin(s, p, kind, lo, hi) {
  if (!p || !p.alive || p.id === s.playerId || relOf(s, p.id)) return false;
  setRel(s, p.id, kind, randInt(lo, hi));
  return true;
}

// Your aunts and uncles (and their spouses and kids) and your nieces and nephews.
function ensureRelatives(s) {
  const me = P(s), met = [];
  for (const par of me.parents.map((id) => s.people[id]).filter(Boolean)) {
    // Grandparents you never met died before you were born.
    for (const a of ensureSiblings(s, par, null, me.birthYear)) {
      ensureKids(s, a);
      if (addKin(s, a, 'aunt', 30, 75)) met.push(a);
      for (const c of a.children.map((id) => s.people[id]).filter(Boolean)) if (addKin(s, c, 'cousin', 25, 70)) met.push(c);
    }
  }
  for (const sib of relPeople(s, ['sibling', 'halfsibling'])) {
    for (const k of sib.children.map((id) => s.people[id]).filter(Boolean)) addKin(s, k, 'nibling', 45, 80);
    if (sib.partner) addKin(s, s.people[sib.partner], 'inlaw', 35, 70);
  }
  const mate = romanticId(s);
  if (mate && ['fiance', 'spouse'].includes(relKind(s, mate))) ensureInlaws(s, mate);
  flag(s, 'kin', true);
  return met;
}
// Your partner's parents and siblings become your in-laws (or future ones).
function ensureInlaws(s, pid) {
  const p = s.people[pid];
  if (!p) return [];
  const met = [];
  for (const sib of ensureSiblings(s, p)) if (addKin(s, sib, 'inlaw', 35, 65)) met.push(sib);
  for (const par of p.parents.map((id) => s.people[id]).filter(Boolean)) if (addKin(s, par, 'inlaw', 30, 65)) met.unshift(par);
  return met;
}
// A breakup or divorce takes the in-laws with it.
function dropInlaws(s, pid) {
  const p = s.people[pid];
  if (!p) return;
  for (const q of [...p.parents.map((id) => s.people[id]), ...siblingsOf(s, p)]) if (q && relKind(s, q.id) === 'inlaw') dropRel(s, q.id);
}
// Whatever someone's family tree needs. Family and partners join your relationships;
// anyone else's relatives are tree-only (p.tree).
function ensureTreeFor(s, pid) {
  if (pid === s.playerId) return ensureRelatives(s);
  const p = s.people[pid], kind = relKind(s, pid);
  if (!p) return [];
  if (['partner', 'fiance', 'spouse'].includes(kind)) return ensureInlaws(s, pid);
  if (isFamilyKind(kind) || ['exspouse'].includes(kind)) return [];
  ensureSiblings(s, p, pid);
  return [];
}
// After continueAs: your old family, seen from the heir.
function rebuildExtended(s) {
  const me = P(s);
  for (const par of me.parents.map((id) => s.people[id]).filter(Boolean)) {
    for (const a of siblingsOf(s, par)) {
      addKin(s, a, 'aunt', 40, 85);
      for (const c of a.children.map((id) => s.people[id]).filter(Boolean)) addKin(s, c, 'cousin', 30, 75);
    }
  }
  for (const sib of relPeople(s, ['sibling', 'halfsibling'])) {
    for (const k of sib.children.map((id) => s.people[id]).filter(Boolean)) addKin(s, k, 'nibling', 45, 85);
    if (sib.partner) addKin(s, s.people[sib.partner], 'inlaw', 40, 70);
  }
  for (const c of relPeople(s, ['child'])) if (c.partner) addKin(s, s.people[c.partner], 'inlaw', 40, 70);
  const mate = romanticId(s);
  if (mate) for (const par of s.people[mate].parents.map((id) => s.people[id])) addKin(s, par, 'inlaw', 40, 70);
}

/* ---- in-laws to win over --------------------------------------------------- */
const parentInlaw = (s, pid) => { const m = romanticId(s); return relKind(s, pid) === 'inlaw' && !!m && s.people[m].parents.includes(pid); };
function blessed(s, mateId) { return !!flag(s, 'blessing_' + mateId); }
defAction({
  id: 'p_meet_family', cat: 'person', target: 'person', label: 'Meet their family', emoji: '🏡',
  when: (s, pid) => reachable(s, pid) && isKind(s, pid, ['partner', 'fiance', 'spouse']) && A(s) >= 16 && !flag(s, 'metfam_' + pid),
  run: (s, pid) => {
    flag(s, 'metfam_' + pid, true);
    const met = ensureInlaws(s, pid);
    if (!met.length) return { text: `${nm(s, pid)} doesn't have any family left to meet.`, nolog: true };
    popup(s, {
      emoji: '🏡', title: `${nm(s, pid)}'s family`, handler: 'meetFamily', ctx: { pid, ids: met.map((p) => p.id) },
      text: `You're meeting ${listJoin(met.map((p) => `${p.first} (${kinTitle(s, p.id).toLowerCase()})`))} for the first time. How do you make a first impression?`,
      choices: [
        { label: '🎁 Bring a thoughtful gift', value: 'gift', sub: fmtMoney(price(s, 60)), disabled: M(s).money < price(s, 60) },
        { label: '🍲 Praise the cooking, ask for seconds', value: 'food' },
        { label: '🙂 Just be yourself', value: 'self' },
        { label: '🗣️ Debate politics with their dad', value: 'debate' },
      ],
    });
  },
});
onChoice('meetFamily', (s, ctx, v) => {
  const ids = (ctx.ids || []).filter((id) => relOf(s, id));
  if (!ids.length) return;
  if (v === 'gift') { const c = price(s, 60); if (!pay(s, c)) return cantAfford(c); }
  const d = { gift: [8, 18], food: [5, 15], self: [-6, 16], debate: [-18, 6] }[v] || [0, 0];
  let sum = 0;
  for (const id of ids) { const x = randInt(d[0], d[1]) + Math.round(skill(s, 'charisma') / 20); addRel(s, id, x); sum += x; }
  addRel(s, ctx.pid, sum > 0 ? 4 : -4);
  if (sum / ids.length >= 8) return { text: `They loved you. ${nm(s, ctx.pid)}'s family already treats you like one of their own.`, tone: 'good' };
  if (sum / ids.length >= 0) return `It went fine. ${nm(s, ctx.pid)}'s family is still making up their minds about you.`;
  return { text: `It did not go well. On the drive home, ${nm(s, ctx.pid)} was very quiet.`, tone: 'bad' };
});
defAction({
  id: 'p_blessing', cat: 'person', target: 'person', label: 'Ask for their blessing', emoji: '🙏',
  when: (s, pid) => reachable(s, pid) && parentInlaw(s, pid) && isKind(s, romanticId(s), ['partner', 'fiance']) && !blessed(s, romanticId(s)),
  run: (s, pid) => {
    if (bump(s, 'blessing_' + pid) > 1) return { text: 'Give them some time to think.', nolog: true };
    const mate = romanticId(s), r = relOf(s, pid).rel;
    if (chance(clamp((r - 35) / 45, 0.05, 0.95))) { flag(s, 'blessing_' + mate, true); addRel(s, pid, 5); add(s, { happy: 6 }); return { text: `${nm(s, pid)} hugged you and said, "Welcome to the family."`, tone: 'good' }; }
    addRel(s, pid, -3);
    return { text: `${nm(s, pid)} said they want to get to know you a lot better first.`, tone: 'bad' };
  },
});
// What the in-laws do at your wedding: the hostile ones stay home, the delighted ones chip in.
function inlawsAtWedding(s, pid, cost) {
  const pars = s.people[pid].parents.map((id) => s.people[id]).filter((p) => p && p.alive && relKind(s, p.id) === 'inlaw');
  if (!pars.length) return '';
  const cold = pars.filter((p) => relOf(s, p.id).rel < 30);
  if (cold.length) { add(s, { happy: -5 }); addRel(s, pid, -4); return ` ${listJoin(cold.map((p) => p.first))} refused to come.`; }
  if (cost > 0 && pars.every((p) => relOf(s, p.id).rel >= 70)) { const gift = Math.round(cost * 0.4); add(s, { money: gift }); return ` ${listJoin(pars.map((p) => p.first))} were so happy they paid ${fmtMoney(gift)} toward it.`; }
  return blessed(s, pid) ? ` ${pars[0].first} gave a lovely toast.` : '';
}

defAction({
  id: 'fam_meet_relatives', cat: 'family', label: 'Get to know your extended family', emoji: '🌳', desc: 'Aunts, uncles, cousins, nieces and nephews.',
  when: (s) => free(s) && A(s) >= 4 && !flag(s, 'kin'),
  run: (s) => {
    const met = ensureRelatives(s);
    if (!met.length) return 'Your family is small. It is just the people you already know.';
    const aunts = met.filter((p) => relKind(s, p.id) === 'aunt'), cousins = met.filter((p) => relKind(s, p.id) === 'cousin');
    add(s, { happy: 3 });
    return `At a family barbecue you got to know ${[aunts.length ? nOf(aunts.length, 'aunt or uncle', 'aunts and uncles') : '', cousins.length ? nOf(cousins.length, 'cousin') : ''].filter(Boolean).join(' and ')}. Check your family tree in People.`;
  },
});

/* ---- the family's own lives ------------------------------------------------- */
function familyTick(s) {
  if (s.dead) return;
  for (const p of relPeople(s, ['sibling', 'halfsibling', 'cousin', 'aunt', 'nibling'])) {
    const kind = relKind(s, p.id), age = ageOf(s, p), sib = kind === 'sibling' || kind === 'halfsibling';
    const who = `Your ${kinLabel(kind, p).toLowerCase()} ${p.first}`;
    if (sib && p.job && p.job.id) {
      const key = `${p.job.id}:${p.job.level}`;
      if (p.jobKey && p.jobKey !== key && p.jobKey.startsWith(p.job.id + ':') && p.job.level > Number(p.jobKey.split(':')[1])) log(s, `📈 ${who} was promoted to ${npcJobTitle(p)}.`);
      p.jobKey = key;
    }
    if (age >= 22 && age <= 60 && !p.partner && kind !== 'aunt' && chance(0.06)) {
      const sp = spouseFor(s, p);
      if (sib && !inPrison(s)) {
        popup(s, {
          emoji: '💒', title: 'A family wedding', person: p.id, handler: 'famWedding', ctx: { pid: p.id, sp: sp.id },
          text: `${who} is marrying ${sp.first} ${sp.last}, and you're invited.`,
          choices: [{ label: '🥂 Give a toast', value: 'toast' }, { label: '💃 Just enjoy the party', value: 'party' }, { label: 'Skip it', value: 'skip' }],
        });
      } else log(s, `💒 ${who} married ${sp.first}.`, 'good');
    } else if (sib && p.partner && s.people[p.partner] && age >= 22 && age <= 42 && p.children.length < 3 && chance(0.08)) {
      const sp = s.people[p.partner], g = chance(0.5) ? 'm' : 'f';
      const kid = makePerson(s, { gender: g, age: 0, country: p.country, city: p.city, last: p.gender === 'm' || sp.gender !== 'm' ? p.last : sp.last });
      linkKid(p, kid);
      linkKid(sp, kid);
      const namesake = g === P(s).gender && chance(0.12);
      if (namesake) kid.first = P(s).first;
      setRel(s, kid.id, 'nibling', 65);
      tally(s, 'niblings');
      announce(s, { emoji: '👶', title: 'A new baby in the family', person: kid.id, tone: 'good', text: `${who} had a baby ${g === 'm' ? 'boy' : 'girl'}${namesake ? `, and named ${genderWord(kid, 'him', 'her', 'them')} ${kid.first}, after you!` : ` named ${kid.first}.`}` });
      if (namesake) addRel(s, p.id, 10);
    } else if (p.married && p.partner && s.people[p.partner] && chance(0.012)) {
      const sp = s.people[p.partner];
      p.partner = null;
      p.married = false;
      sp.partner = null;
      sp.married = false;
      if (relKind(s, sp.id) === 'inlaw') dropRel(s, sp.id);
      log(s, `📝 ${who} and ${sp.first} got divorced.`, 'bad');
    }
  }
}
onChoice('famWedding', (s, ctx, v) => {
  const p = s.people[ctx.pid], sp = s.people[ctx.sp];
  if (!p || !sp) return;
  addKin(s, sp, 'inlaw', 40, 65);
  if (v === 'skip') { addRel(s, p.id, -15); return { text: `You missed ${p.first}'s wedding. ${genderWord(p, 'He', 'She', 'They')} noticed.`, tone: 'bad' }; }
  add(s, { happy: 6 });
  if (v === 'party') { addRel(s, p.id, 6); return `You danced until the band packed up. ${p.first} and ${sp.first} are married!`; }
  addSkill(s, 'charisma', 2);
  if (skill(s, 'charisma') + randInt(0, 60) >= 45) { addRel(s, p.id, 15); addRel(s, sp.id, 10); return { text: 'Your toast made the whole room laugh, then cry. People asked for a copy.', tone: 'good' }; }
  addRel(s, p.id, -5);
  return 'Your toast included a story that should have stayed a family secret.';
});

/* ---- family events ----------------------------------------------------------- */
function kinName(s, pid) {
  const t = kinTitle(s, pid), first = nm(s, pid);
  const short = { Uncle: 'Uncle', Aunt: 'Aunt', Grandfather: 'Grandpa', Grandmother: 'Grandma' }[t];
  return short ? `${short} ${first}` : `your ${t.toLowerCase()} ${first}`;
}
const kinAged = (kinds, lo, hi) => (s) => someone(s, kinds, (p) => ageOf(s, p) >= lo && ageOf(s, p) <= hi);
EV('fam_couch', {
  ages: [22, 85], emoji: '🛋️', when: (s) => free(s) && livesAlone(s), ctx: (s) => someone(s, ['sibling', 'halfsibling', 'cousin'], (p) => ageOf(s, p) >= 20 && (!p.job || chance(0.3))),
  text: (s, c) => `Your ${kinTitle(s, c.pid).toLowerCase()} ${nm(s, c.pid)} lost their job and asks to crash on your couch "for a couple of weeks."`,
  choices: [
    ['Of course', (s, c) => { addRel(s, c.pid, 15); add(s, { happy: -3, karma: 2 }); return pick([`It has been four months. ${nm(s, c.pid)} has started rearranging your furniture.`, `${nm(s, c.pid)} cooked every night and found a job in six weeks. Best roommate ever.`]); }],
    ['Help them find a place instead', (s, c) => { addRel(s, c.pid, 4); return `You spent a weekend apartment hunting with ${nm(s, c.pid)}.`; }],
    ['Say no', (s, c) => { addRel(s, c.pid, -12); return `${nm(s, c.pid)} said "wow, okay" and hung up.`; }],
  ],
});
EV('fam_aunt_card', {
  ages: [5, 17], emoji: '💌', ctx: (s) => someone(s, ['aunt', 'grandparent']), text: (s, c) => `${cap(kinName(s, c.pid))} sent you a birthday card.`,
  auto: (s, c) => { const amt = price(s, randInt(10, s.people[c.pid].money > price(s, 500000) ? 200 : 40)); add(s, { money: amt, happy: 3 }); addRel(s, c.pid, 4); return `There was ${fmtMoney(amt)} inside, and a note that said "Don't spend it all at once!"`; },
});
EV('fam_babysit_nibling', {
  ages: [14, 80], emoji: '🧸', when: free, ctx: kinAged(['nibling'], 1, 11), text: (s, c) => `Your sibling asks if you can babysit ${nm(s, c.pid)} for the weekend.`,
  choices: [
    ['Be the fun one', (s, c) => { addRel(s, c.pid, 12); add(s, { happy: 5 }); return `Pancakes for dinner, a blanket fort and a movie marathon. ${nm(s, c.pid)} begged to stay longer.`; }],
    ['Stick to the rules', (s, c) => { addRel(s, c.pid, 4); relAll(s, ['sibling', 'halfsibling'], 3); return 'Bedtime at eight, vegetables eaten. Your sibling was impressed.'; }],
    ['Make an excuse', (s) => { relAll(s, ['sibling', 'halfsibling'], -3); return 'They found another babysitter. They will remember.'; }],
  ],
});
EV('fam_cousin_wedding', {
  ages: [8, 90], emoji: '💒', when: free, ctx: kinAged(['cousin'], 22, 50), text: (s, c) => `Your cousin ${nm(s, c.pid)} is getting married, and the whole family will be there.`,
  choices: [
    ['Go and dance all night', (s, c) => { const p = s.people[c.pid]; if (!p.partner) spouseFor(s, p); addRel(s, c.pid, 8); relAll(s, ['aunt', 'cousin'], 3); add(s, { happy: 5 }); return 'Your uncle tried to breakdance. An ambulance was almost called.'; }],
    ['Send a gift', (s, c) => { const p = s.people[c.pid]; if (!p.partner) spouseFor(s, p); const cost = price(s, 100); M(s).money -= cost; addRel(s, c.pid, 3); return `You sent a ${fmtMoney(cost)} toaster. It was the fourth toaster.`; }],
  ],
});
EV('fam_inlaw_kitchen', {
  ages: [22, 90], emoji: '🍳', when: (s) => free(s) && !!spouseId(s), ctx: (s) => someone(s, ['inlaw'], (p) => s.people[spouseId(s)].parents.includes(p.id)),
  text: (s, c) => `Your ${kinTitle(s, c.pid).toLowerCase()} ${nm(s, c.pid)} reorganized your entire kitchen "to help."`,
  choices: [
    ['Thank them warmly', (s, c) => { addRel(s, c.pid, 8); add(s, { karma: 2, happy: -1 }); return 'You still cannot find the cheese grater.'; }],
    ['Put it all back while they watch', (s, c) => { addRel(s, c.pid, -10); add(s, { happy: 2 }); return 'The silence could have frozen soup.'; }],
    ['Ask them to teach you a family recipe', (s, c) => { addRel(s, c.pid, 12); addSkill(s, 'cooking', 3); return `${nm(s, c.pid)} lit up. You now make the best stew in two families.`; }],
  ],
});
EV('fam_holiday_tug', {
  ages: [22, 90], emoji: '🎄', when: (s) => free(s) && !!spouseId(s) && relPeople(s, ['inlaw']).length > 0 && relPeople(s, ['parent']).length > 0,
  text: 'Your family and your in-laws both expect you for the holidays.',
  choices: [
    ['Go to your family', (s) => { relAll(s, ['parent'], 6); relAll(s, ['inlaw'], -6); addRel(s, spouseId(s), -3); return 'Your spouse spent the dinner texting their mother.'; }],
    ['Go to the in-laws', (s) => { relAll(s, ['inlaw'], 8); relAll(s, ['parent'], -6); addRel(s, spouseId(s), 5); return 'Your in-laws made your favorite dessert. Your mom called twice.'; }],
    ['Host everyone together', (s) => { const ok = chance(0.5 + skill(s, 'charisma') / 300); relAll(s, ['parent', 'inlaw'], ok ? 6 : -4); add(s, { happy: ok ? 6 : -4 }); return ok ? 'Both families got along. Someone suggested doing it every year.' : 'The two families did not mix. There was an incident with the gravy.'; }],
  ],
});
EV('fam_godparent', {
  ages: [18, 80], emoji: '🕯️', ctx: kinAged(['nibling'], 0, 1), text: (s, c) => `Your sibling asks you to be ${nm(s, c.pid)}'s godparent and guardian.`,
  choices: [
    ['Accept the honor', (s, c) => { addRel(s, c.pid, 15); relAll(s, ['sibling', 'halfsibling'], 6); add(s, { happy: 6, karma: 2 }); return `You held ${nm(s, c.pid)} at the ceremony. They grabbed your nose.`; }],
    ['Say you are not ready', (s) => { relAll(s, ['sibling', 'halfsibling'], -4); return 'They asked your cousin instead.'; }],
  ],
});
EV('fam_uncle_story', {
  ages: [6, 70], emoji: '🍗', ctx: (s) => someone(s, ['aunt'], (p) => ageOf(s, p) >= 40), text: (s, c) => `At the family barbecue, ${kinName(s, c.pid)} launched into the story about ${pick(['the time they almost met a famous singer', 'the great flood of the family basement', 'the fish that got away, which grows every year', 'their one week as a rodeo clown'])}. Again.`,
  choices: [
    ['Act amazed, as always', (s, c) => { addRel(s, c.pid, 8); add(s, { karma: 1 }); return 'The fish was nine feet long this time.'; }],
    ['Finish the story for them', (s, c) => { addRel(s, c.pid, -5); add(s, { happy: 2 }); return 'The whole table laughed. They did not.'; }],
  ],
});
EV('fam_cousin_rivalry', {
  ages: [8, 17], emoji: '🏅', ctx: (s) => someone(s, ['cousin'], (p) => Math.abs(ageOf(s, p) - A(s)) <= 2), text: (s, c) => `Your cousin ${nm(s, c.pid)} brought home a trophy, and the whole family will not stop talking about it.`,
  choices: [
    ['Challenge them to a rematch', (s, c) => { addSkill(s, 'athletics', 2); if (chance(0.5)) { add(s, { happy: 6 }); addRel(s, c.pid, -3); return 'You won the backyard rematch. You will mention it for decades.'; } addRel(s, c.pid, 3); return `${nm(s, c.pid)} won again. You shook hands, grudgingly.`; }],
    ['Congratulate them', (s, c) => { addRel(s, c.pid, 8); add(s, { karma: 1 }); return `${nm(s, c.pid)} said you would win next time. Cousins.`; }],
  ],
});
EV('fam_feud', {
  ages: [16, 90], emoji: '🔥', when: (s) => relPeople(s, ['aunt']).length > 0 && relPeople(s, ['parent']).length > 0, ctx: (s) => someone(s, ['aunt']),
  text: (s, c) => `Your parent and ${kinName(s, c.pid)} are not speaking after a fight about ${pick(['who gets grandma’s china', 'a loan from twenty years ago', 'a comment about someone’s cooking', 'politics'])}.`,
  choices: [
    ['Broker peace', (s, c) => { if (chance(0.45 + skill(s, 'charisma') / 250)) { relAll(s, ['parent'], 5); addRel(s, c.pid, 8); add(s, { karma: 3 }); return 'You got them in the same room. They hugged. Everyone cried.'; } return 'They agreed to disagree. Loudly.'; }],
    ['Take your parent’s side', (s, c) => { relAll(s, ['parent'], 6); addRel(s, c.pid, -12); return 'Family dinners will be quieter this year.'; }],
    ['Stay out of it', () => 'You will be at the next reunion. You will sit very far away from both of them.'],
  ],
});
EV('fam_nibling_grad', {
  ages: [25, 95], emoji: '🎓', ctx: kinAged(['nibling'], 17, 18), text: (s, c) => `Your ${kinTitle(s, c.pid).toLowerCase()} ${nm(s, c.pid)} is graduating from high school.`,
  choices: [
    { label: 'Send a generous check', sub: (s) => fmtMoney(price(s, 500)), fx: (s, c) => { const amt = price(s, 500); if (!pay(s, amt)) return cantAfford(amt); s.people[c.pid].money += amt; addRel(s, c.pid, 12); return `${nm(s, c.pid)} called to say thank you. Without being told to.`; } },
    ['Give them some life advice', (s, c) => { addRel(s, c.pid, 4); return `You told ${nm(s, c.pid)} to ${pick(['always read the fine print', 'never trust a free couch', 'call their mother more', 'learn to cook three good meals'])}.`; }],
  ],
});
