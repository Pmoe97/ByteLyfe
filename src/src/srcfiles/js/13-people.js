/* =====================================================================
 * 13-people.js — making people, family trees, relationship records.
 *
 * A Person is the same shape for everyone (NPCs and the player). The
 * player's feelings toward others live in M(s).rels[pid] = { kind, rel, since }.
 * Family links (parents/children/partner) live on the people themselves,
 * so a family tree survives when you continue as your child.
 * ===================================================================== */

function randomOrient() {
  const r = rand();
  return r < 0.86 ? 'straight' : r < 0.92 ? 'gay' : r < 0.98 ? 'bi' : 'ace';
}

function makePerson(s, o) {
  o = o || {};
  const countryId = COUNTRIES[o.country] ? o.country : 'us';
  const gender = o.gender || (chance(0.5) ? 'm' : 'f');
  const p = {
    id: uid(s, 'p'),
    first: o.first || randomFirst(countryId, gender),
    last: o.last || randomLast(countryId),
    gender,
    country: countryId,
    city: o.city || pick(COUNTRIES[countryId].cities),
    birthYear: o.birthYear != null ? o.birthYear : s.year - (o.age || 0),
    bday: o.bday || [randInt(1, 12), randInt(1, 28)],
    alive: true,
    deathYear: null,
    cause: null,
    stats: {
      happy: o.happy ?? statRoll(65),
      health: o.health ?? clamp100(gauss(82, 12)),
      smarts: o.smarts ?? statRoll(),
      looks: o.looks ?? statRoll(),
    },
    traits: o.traits || randomTraits(randInt(1, 2)),
    orient: o.orient || randomOrient(),
    job: o.job || null, // NPC occupation: { id, level } | { pt: id }
    edu: o.edu || null, // NPC highest degree key
    major: o.major || null,
    money: Math.round(o.money ?? 0),
    parents: o.parents ? o.parents.slice() : [],
    children: [],
    partner: null,
    married: false,
    retired: false,
  };
  s.people[p.id] = p;
  if (o.look) p.look = o.look;
  ensureLook(s, p, o.adopted);
  return p;
}

function childStatsFrom(a, b) {
  const avg = (k) => {
    const vals = [a, b].filter(Boolean).map((x) => x.stats[k]);
    return vals.length ? sum(vals) / vals.length : 55;
  };
  return {
    smarts: clamp100(avg('smarts') * 0.5 + gauss(28, 16)),
    looks: clamp100(avg('looks') * 0.5 + gauss(28, 16)),
    health: clamp100(gauss(88, 9)),
    happy: clamp100(gauss(80, 10)),
  };
}

/* ---- NPC occupations ---------------------------------------------- */
function npcQualifies(p, jobId, age) {
  const j = JOBS[jobId];
  if (!j || j.special) return false;
  const r = j.req || {};
  if (r.age && age < r.age) return false;
  if (r.maxAge && age > r.maxAge) return false;
  const rank = EDU_RANK[p.edu || 'none'] || 0;
  if (r.degree) return p.edu === r.degree;
  if (r.trade) return p.edu === 'trade';
  if (r.edu && rank < EDU_RANK[r.edu]) return false;
  if (r.smarts && p.stats.smarts < r.smarts - 10) return false;
  if (r.looks && p.stats.looks < r.looks - 10) return false;
  return true;
}
function npcJobTitle(p) {
  if (!p.alive) return '';
  if (p.retired) return 'Retired';
  if (p.job && p.job.id && JOBS[p.job.id]) return JOBS[p.job.id].ladder[Math.min(p.job.level, JOBS[p.job.id].ladder.length - 1)][0];
  if (p.job && p.job.pt && PT_JOBS[p.job.pt]) return PT_JOBS[p.job.pt].name;
  if (p.job && p.job.student) return 'Student';
  return '';
}
function npcSalary(s, p) {
  if (!p.job || !p.job.id || !JOBS[p.job.id]) return 0;
  const lad = JOBS[p.job.id].ladder;
  return Math.round(lad[Math.min(p.job.level, lad.length - 1)][1] * (COUNTRIES[p.country] || COUNTRIES.us).econ);
}
// Give an adult NPC an education, a job and savings that fit their age.
function assignNpcLife(s, p, opts) {
  const age = ageOf(s, p);
  opts = opts || {};
  if (age < 18) {
    p.job = age >= 16 && chance(0.25) ? { pt: pick(Object.keys(PT_JOBS)) } : null;
    return;
  }
  if (!p.edu) {
    const r = p.stats.smarts + randInt(-20, 20);
    if (r > 78 && chance(0.45)) p.edu = pick(['master', 'jd', 'md', 'mba', 'phd', 'dds', 'pharmd']);
    else if (r > 48) p.edu = 'bachelor';
    else if (r > 32) p.edu = pick(['high', 'assoc', 'trade']);
    else p.edu = chance(0.85) ? 'high' : 'none';
    if (EDU_RANK[p.edu] >= 3) p.major = pick(MAJOR_IDS);
  }
  if (age >= 67 && !opts.working) { p.retired = true; p.job = null; }
  else if (age <= 22 && EDU_RANK[p.edu] >= 3 && chance(0.6)) { p.job = { student: true }; }
  else if (chance(opts.jobs ? 0.04 : 0.08)) { p.job = null; }
  else {
    let pool = opts.jobs ? opts.jobs.filter((id) => id && npcQualifies(p, id, age) && eraJobOk(s, id)) : [];
    if (!pool.length) pool = JOB_IDS.filter((id) => npcQualifies(p, id, age) && eraJobOk(s, id));
    if (pool.length) {
      const id = pick(pool);
      const len = JOBS[id].ladder.length;
      const lvl = clamp(Math.floor(((age - 20) / 9) * rand() * 1.4), 0, len - 1);
      p.job = { id, level: lvl };
    }
  }
  if (!opts.keepMoney) {
    const yearsWorking = Math.max(0, age - 22);
    p.money = Math.round(Math.max(0, npcSalary(s, p) * yearsWorking * randFloat(0.02, 0.18) + gauss(3000, 4000) * econOf(p)));
  }
}
function econOf(p) { return (COUNTRIES[p.country] || COUNTRIES.us).econ; }

/* ---- relationship records ----------------------------------------- */
function setRel(s, pid, kind, rel) {
  const old = M(s).rels[pid];
  M(s).rels[pid] = { kind, rel: clamp100(rel ?? (old ? old.rel : 50)), since: old && old.kind === kind ? old.since : s.year };
  return M(s).rels[pid];
}
function relOf(s, pid) { return M(s).rels[pid] || null; }
function relKind(s, pid) { const r = M(s).rels[pid]; return r ? r.kind : null; }
function addRel(s, pid, d) {
  const r = M(s).rels[pid];
  if (!r) return null;
  let delta = d;
  if (d > 0 && trait(s, 'charming')) delta *= 1.25;
  if (d > 0 && trait(s, 'loner')) delta *= 0.85;
  r.rel = clamp100(r.rel + delta);
  return r;
}
function dropRel(s, pid) { delete M(s).rels[pid]; }
function relPeople(s, kinds, opts) {
  const out = [];
  const rels = M(s).rels;
  for (const pid in rels) {
    const p = s.people[pid];
    if (!p) continue;
    if (kinds && !kinds.includes(rels[pid].kind)) continue;
    if (!kinds && rels[pid].kind === 'captive') continue; // somebody you are holding is not somebody you can ask to dinner (78-secret-space.js)
    if (!(opts && opts.dead) && !p.alive) continue;
    out.push(p);
  }
  return out;
}
function pickRel(s, kinds, filter) {
  const list = relPeople(s, kinds).filter((p) => !filter || filter(p));
  return list.length ? pick(list).id : null;
}
function kinLabel(kind, p) {
  const L = KIN_LABELS[kind];
  if (!L) return cap(kind || 'acquaintance');
  return p.gender === 'm' ? L[0] : p.gender === 'f' ? L[1] : L[2];
}
// What they are to you, in words: in-laws are worked out from the family tree
// ("Mother-in-law", "Future brother-in-law", "Partner's father", "Son-in-law").
function kinTitle(s, pid) {
  const r = relOf(s, pid), p = s.people[pid];
  if (!r || !p) return '';
  if (r.kind === 'teacher' && p.teaches && typeof SUBJECTS !== 'undefined' && SUBJECTS[p.teaches]) return SUBJECTS[p.teaches].name + ' teacher';
  if (r.kind === 'instructor' && p.lesson && typeof LESSON_TYPES !== 'undefined' && LESSON_TYPES[p.lesson]) return LESSON_TYPES[p.lesson].name + ' teacher';
  const base = r.kind === 'inlaw' ? inlawTitle(s, p) : kinLabel(r.kind, p);
  // A relative you dated and left stays family: "Sister · Ex" (48-taboo.js tabooRestoreFamily).
  if (r.exRom && isFamilyKind(r.kind)) return base + ' · ' + kinLabel(r.exRom, p);
  // Taboo dual role: "Sister · Girlfriend" instead of losing the blood label.
  try {
    if (r.taboo && typeof bloodKinshipInfo === 'function') {
      const fam = r.wasFam || bloodKinshipInfo(s, pid);
      if (fam) {
        const famLbl = kinLabel(fam === 'halfsibling' ? 'halfsibling' : fam, p);
        if (famLbl && famLbl !== base) return famLbl + ' · ' + base;
      }
    }
  } catch (e) {}
  return base;
}
function inlawTitle(s, p) {
  const word = (m, f, x) => genderWord(p, m, f, x);
  const mateId = romanticId(s), mate = mateId && s.people[mateId], mk = mate && relKind(s, mateId);
  const via = (base) => (mk === 'spouse' ? cap(base) + '-in-law' : mk === 'fiance' ? 'Future ' + base + '-in-law' : "Partner's " + base.replace(/-in-law$/, ''));
  if (mate && mate.parents.includes(p.id)) return via(word('father', 'mother', 'parent'));
  if (mate && mate.parents.some((x) => p.parents.includes(x))) return via(word('brother', 'sister', 'sibling'));
  const theirs = p.partner && relKind(s, p.partner);
  if (theirs === 'sibling' || theirs === 'halfsibling') return word('Brother-in-law', 'Sister-in-law', 'Sibling-in-law');
  if (theirs === 'child') return word('Son-in-law', 'Daughter-in-law', 'Child-in-law');
  return 'In-law';
}
// "your mother", "your friend" — for sentences.
function kinOf(s, pid) {
  const r = relOf(s, pid), p = s.people[pid];
  if (!r || !p) return 'someone you know';
  const lbl = kinTitle(s, pid);
  return 'your ' + (lbl === 'Ex' ? 'ex' : lbl.charAt(0).toLowerCase() + lbl.slice(1));
}
function nm(s, pid) { const p = s.people[pid]; return p ? p.first : 'someone'; }
function full(s, pid) { const p = s.people[pid]; return p ? fullName(p) : 'someone'; }
function romanticId(s) {
  for (const k of ['spouse', 'fiance', 'partner']) {
    const p = relPeople(s, [k])[0];
    if (p) return p.id;
  }
  return null;
}
function spouseId(s) { const p = relPeople(s, ['spouse'])[0]; return p ? p.id : null; }
function hasRomance(s) { return !!romanticId(s); }
function myChildren(s, opts) { return relPeople(s, ['child'], opts); }
function isFamilyKind(kind) { return FAMILY_KINDS.includes(kind); }

/* ---- the family you are born into ---------------------------------- */
function generateFamily(s, me, o) {
  o = o || {};
  const tier = o.wealth && WEALTH[o.wealth] ? o.wealth : weighted(WEALTH_IDS, (id) => ({ poor: 14, modest: 26, middle: 32, comfortable: 19, rich: 9 }[id]));
  const c = me.country, city = me.city, last = me.last;
  const momAge = clamp(Math.round(gauss(29, 5)), 17, 45);
  const dadAge = clamp(momAge + Math.round(gauss(2, 4)), 18, 62);
  // Most kids have a mother and a father; some have two moms or two dads.
  const r = rand();
  const g1 = r < 0.02 ? 'm' : 'f';
  const g2 = r > 0.98 ? 'f' : 'm';
  const p1 = makePerson(s, { gender: g1, age: momAge, country: c, city, last, health: clamp100(gauss(82, 10)) });
  const p2 = makePerson(s, { gender: g2, age: dadAge, country: c, city, last, health: clamp100(gauss(80, 10)) });
  const jobs = WEALTH[tier].jobs;
  assignNpcLife(s, p1, { jobs, working: true });
  assignNpcLife(s, p2, { jobs: jobs.filter((j) => !p1.job || j !== p1.job.id), working: true });
  for (let k = 0; k < 12 && p2.first === p1.first; k++) p2.first = randomFirst(c, p2.gender);
  // A custom life's chosen skin tone: parents (and so siblings) match it.
  if (o.skin != null) for (const q of [p1, p2]) q.look.skin = clamp(o.skin + randInt(-1, 1), 0, 7);
  const [lo, hi] = WEALTH[tier].money;
  const pot = Math.round(randFloat(lo, hi) * econOf(p1));
  p1.money = Math.round(pot * randFloat(0.3, 0.7));
  p2.money = pot - p1.money;
  p1.partner = p2.id;
  p2.partner = p1.id;
  p1.married = p2.married = chance(0.78);
  me.parents = [p1.id, p2.id];
  p1.children.push(me.id);
  p2.children.push(me.id);
  setRel(s, p1.id, 'parent', randInt(55, 95));
  setRel(s, p2.id, 'parent', randInt(45, 95));

  // Older siblings.
  const boom = worldSiblingBonus(s); // a baby boom (88-world.js) makes families bigger
  const nOlder = weighted([0, 1, 2, 3], (n) => [42 * (1 - boom), 34, 17 * (1 + boom), 7 * (1 + 2 * boom)][n]);
  for (let i = 0; i < nOlder; i++) {
    const maxAge = Math.min(momAge - 17, dadAge - 17, 16);
    if (maxAge < 1) break;
    const st = childStatsFrom(p1, p2);
    const sib = makePerson(s, Object.assign({ age: randInt(1, maxAge), country: c, city, last, parents: [p1.id, p2.id], traits: inheritTraits(p1, p2) }, st));
    const used = new Set([p1.first, p2.first, ...relPeople(s, ['sibling']).map((x) => x.first)]);
    for (let k = 0; k < 12 && used.has(sib.first); k++) sib.first = randomFirst(c, sib.gender);
    p1.children.push(sib.id);
    p2.children.push(sib.id);
    assignNpcLife(s, sib);
    setRel(s, sib.id, 'sibling', randInt(35, 85));
  }

  // Grandparents (only the ones still living).
  for (const par of [p1, p2]) {
    for (const g of ['m', 'f']) {
      const gAge = ageOf(s, par) + clamp(Math.round(gauss(28, 5)), 17, 45);
      const aliveOdds = gAge < 60 ? 0.97 : clamp(1 - (gAge - 60) / 38, 0.05, 0.95);
      if (!chance(aliveOdds)) continue;
      const gp = makePerson(s, { gender: g, age: gAge, country: c, city: pick(COUNTRIES[c].cities), last: g === 'm' && par === p2 ? last : randomLast(c), health: clamp100(gauss(70, 14)) });
      assignNpcLife(s, gp);
      // Created after the parent, so match the parent's skin by hand.
      gp.look.skin = clamp(par.look.skin + randInt(-1, 1), 0, 7);
      gp.children.push(par.id);
      par.parents.push(gp.id);
      setRel(s, gp.id, 'grandparent', randInt(40, 92));
    }
  }
  return { tier, p1, p2 };
}

// Classmates for a new school stage: kids your age from your city.
function makeClassmates(s, n) {
  const me = P(s);
  const out = [];
  for (let i = 0; i < n; i++) {
    const k = makePerson(s, { age: A(s) + randInt(-1, 1) || A(s), country: me.country, city: me.city });
    if (ageOf(s, k) < 4) k.birthYear = me.birthYear;
    setRel(s, k.id, 'classmate', randInt(25, 60));
    out.push(k.id);
  }
  return out;
}

// A new adult acquaintance near the player's age (for friends, dates, coworkers).
function makeAdultNear(s, o) {
  o = o || {};
  const me = P(s);
  const myAge = A(s);
  const lo = o.minAge ?? Math.max(18, myAge - 8);
  const hi = o.maxAge ?? Math.max(lo, myAge + 8);
  const p = makePerson(s, { age: randInt(lo, hi), gender: o.gender, country: o.country || me.country, city: me.city });
  assignNpcLife(s, p);
  return p;
}

/* ---- clean up people who no longer matter -------------------------- */
function gcPeople(s) {
  const keep = new Set([s.playerId]);
  for (const pid in M(s).rels) keep.add(pid);
  for (const l of s.lineage) if (l.id) keep.add(l.id);
  if (s.crown && s.crown.monarch) keep.add(s.crown.monarch);
  // Relatives made for the family tree of someone you know stay as long as that person does.
  for (const id in s.people) { const a = s.people[id].tree; if (a && keep.has(a)) keep.add(id); }
  for (const id of [...keep]) {
    const p = s.people[id];
    if (!p) continue;
    for (const x of [...p.parents, ...p.children, p.partner]) if (x) keep.add(x);
  }
  for (const id in s.people) if (!keep.has(id)) delete s.people[id];
  for (const id in s.people) {
    const p = s.people[id];
    p.parents = p.parents.filter((x) => s.people[x]);
    p.children = p.children.filter((x) => s.people[x]);
    if (p.partner && !s.people[p.partner]) { p.partner = null; p.married = false; }
  }
  webPrune(s); // secrets and ties that pointed at the people just removed (62-web.js)
}
