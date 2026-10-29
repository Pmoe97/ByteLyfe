/* =====================================================================
 * 48-taboo.js — consensual adult-only family romance (opt-in).
 *
 * Strict rules (user-approved):
 *   - master META.settings.taboo must be ON, plus the subtype for that
 *     relative (taboo_parent, taboo_step, taboo_sibling, taboo_child,
 *     taboo_grand, taboo_extended, taboo_inlaw). All default OFF, so the
 *     game is exactly as before until the player opts in (Settings).
 *   - 18+ BOTH, no exceptions. Teens can never start or continue this.
 *   - consensual: uses the normal attractedTo/orientation + ask-out odds,
 *     partner consent (affair path), and proposal/marriage odds.
 *   - realistic pregnancy: allowed; first-generation risk is low but real,
 *     later inbred generations rise fast via pedigree F (stored as p.inbred).
 *   - neutral sim with some fallout: karma/fame dings, family disapproval,
 *     blessing blocked, a few discovery events. No jail, no teen content.
 *
 * Rel kinds map to subtype tags (02-data-people.js kinds):
 *   parent->taboo_parent, stepparent->taboo_step,
 *   sibling/half->taboo_sibling, child->taboo_child,
 *   grandparent/grandchild->taboo_grand,
 *   aunt/cousin/nibling->taboo_extended, inlaw->taboo_inlaw
 * Blood is also read from the tree (p.parents/p.children), so a sibling
 * who became 'partner' is still recognised via tabooTagFor().
 * ===================================================================== */

const TABOO_MASTER = 'taboo';
const TABOO_KIND_TO_TAG = {
  parent: 'taboo_parent',
  stepparent: 'taboo_step',
  sibling: 'taboo_sibling',
  halfsibling: 'taboo_sibling',
  child: 'taboo_child',
  grandparent: 'taboo_grand',
  grandchild: 'taboo_grand',
  aunt: 'taboo_extended',
  cousin: 'taboo_extended',
  nibling: 'taboo_extended',
  inlaw: 'taboo_inlaw',
};
const TABOO_FAMILY_KINDS = Object.keys(TABOO_KIND_TO_TAG);

function tabooTagForKind(kind) { return TABOO_KIND_TO_TAG[kind] || null; }

// Tree-based family detection (survives kind changing to partner/spouse).
function bloodKinshipInfo(s, pid) {
  const me = P(s), p = s.people[pid];
  if (!me || !p || pid === s.playerId) return null;
  if (me.parents.includes(pid)) return 'parent';
  if (me.children.includes(pid)) return 'child';
  if (me.parents.length && p.parents && p.parents.length) {
    const shared = me.parents.filter((x) => p.parents.includes(x));
    if (shared.length) {
      const full = me.parents.length === p.parents.length && me.parents.every((x) => p.parents.includes(x));
      return full ? 'sibling' : 'halfsibling';
    }
  }
  for (const parId of me.parents) {
    const par = s.people[parId];
    if (par && par.parents.includes(pid)) return 'grandparent';
  }
  for (const cId of me.children) {
    const c = s.people[cId];
    if (c && c.children.includes(pid)) return 'grandchild';
  }
  for (const parId of me.parents) {
    const par = s.people[parId];
    if (par && par.partner === pid) return 'stepparent';
  }
  try {
    for (const parId of me.parents) {
      const par = s.people[parId];
      if (!par) continue;
      const sibs = siblingsOf(s, par);
      if (sibs.some((x) => x.id === pid)) return 'aunt';
    }
  } catch (e) {}
  try {
    const mySibs = new Set();
    for (const parId of me.parents) {
      const par = s.people[parId];
      if (par) for (const c of par.children) if (c !== s.playerId) mySibs.add(c);
    }
    for (const sibId of mySibs) {
      const sib = s.people[sibId];
      if (sib && sib.children.includes(pid)) return 'nibling';
    }
  } catch (e) {}
  try {
    for (const apId of (p.parents || [])) {
      for (const parId of me.parents) {
        const par = s.people[parId];
        if (!par) continue;
        const sibs = siblingsOf(s, par);
        if (sibs.some((x) => x.id === apId)) return 'cousin';
      }
    }
  } catch (e) {}
  return null;
}

// Which subtype tag governs this person (stored taboo wins, then kind, then tree).
function tabooTagFor(s, pid) {
  const r = relOf(s, pid);
  if (r && r.taboo && typeof META !== 'undefined' && META.settings[r.taboo] !== undefined) return r.taboo;
  if (r && TABOO_KIND_TO_TAG[r.kind]) return TABOO_KIND_TO_TAG[r.kind];
  const b = bloodKinshipInfo(s, pid);
  if (b && TABOO_KIND_TO_TAG[b]) return TABOO_KIND_TO_TAG[b];
  return null;
}

function isTabooFamily(s, pid) {
  const r = relOf(s, pid);
  if (r && r.taboo) return true;
  if (r && TABOO_KIND_TO_TAG[r.kind]) return true;
  return !!bloodKinshipInfo(s, pid);
}

// Strict gate: master + subtype + 18+ both. Callers also check reachable/attraction.
function tabooRomanceAllowed(s, pid) {
  try {
    if (typeof META === 'undefined' || !META.settings.taboo) return false;
    const tag = tabooTagFor(s, pid);
    if (!tag || !META.settings[tag]) return false;
    if (A(s) < 18 || tAge(s, pid) < 18) return false;
    return true;
  } catch (e) { return false; }
}

function tabooPartners(s) {
  return relPeople(s, ['partner', 'fiance', 'spouse', 'lover']).filter((p) => relOf(s, p.id).taboo || isTabooFamily(s, p.id));
}

/* ---- pedigree inbreeding ------------------------------------------ */
function tabooAncestors(s, id, maxDepth) {
  const out = {};
  const q = [[id, 0]];
  out[id] = 0;
  while (q.length) {
    const [cur, d] = q.shift();
    if (d >= (maxDepth || 6)) continue;
    const p = s.people[cur];
    if (!p || !p.parents) continue;
    for (const par of p.parents) {
      if (!s.people[par]) continue;
      if (out[par] === undefined || d + 1 < out[par]) {
        out[par] = d + 1;
        q.push([par, d + 1]);
      }
    }
  }
  return out;
}

// Kinship via pedigree recursion (handles multi-gen correctly).
// F of a child = kinship of its parents. Uses birthYear to always expand
// the younger side, so full sibs = 0.25, second-gen inbred matings rise fast.
function tabooKinship(s, aId, bId, memo, depth) {
  if (!aId || !bId) return 0;
  if (!s.people[aId] || !s.people[bId]) return 0;
  memo = memo || {};
  depth = depth || 0;
  if (depth > 12) return 0;
  const key = aId < bId ? aId + '|' + bId : bId + '|' + aId;
  if (key in memo) return memo[key];
  let out = 0;
  if (aId === bId) {
    out = 0.5 * (1 + ((s.people[aId] && s.people[aId].inbred) || 0));
  } else {
    const a = s.people[aId], b = s.people[bId];
    const aPar = (a.parents || []).filter((x) => s.people[x]);
    const bPar = (b.parents || []).filter((x) => s.people[x]);
    // Expand the younger person (larger birthYear); founders with no parents are 0.
    let expandA = false, expandB = false;
    if (aPar.length && (!bPar.length || (a.birthYear || 0) >= (b.birthYear || 0))) expandA = true;
    else if (bPar.length) expandB = true;
    else out = 0;
    if (expandA) {
      out = aPar.length === 1 ? 0.5 * tabooKinship(s, aPar[0], bId, memo, depth + 1)
        : 0.5 * (tabooKinship(s, aPar[0], bId, memo, depth + 1) + tabooKinship(s, aPar[1], bId, memo, depth + 1));
    } else if (expandB) {
      out = bPar.length === 1 ? 0.5 * tabooKinship(s, aId, bPar[0], memo, depth + 1)
        : 0.5 * (tabooKinship(s, aId, bPar[0], memo, depth + 1) + tabooKinship(s, aId, bPar[1], memo, depth + 1));
    }
  }
  memo[key] = out;
  return out;
}

// Coancestry of aId+bId = F of their child.
function tabooInbreeding(s, aId, bId) {
  if (!aId || !bId || aId === bId) return 0;
  try {
    return Math.min(0.5, tabooKinship(s, aId, bId, {}, 0));
  } catch (e) { return 0; }
}

function tabooDepthOf(p) {
  if (!p) return 0;
  if (p.tabooDepth) return p.tabooDepth;
  if (p.inbred && p.inbred > 0.03) return 1;
  return 0;
}

// Extra miscarriage risk for a taboo pregnancy (base game already has 4% for carrier==me).
function tabooMiscarriageOdds(s, partnerId) {
  try {
    const me = P(s), partner = s.people[partnerId];
    if (!me || !partner) return 0;
    const F = tabooInbreeding(s, me.id, partnerId);
    if (F <= 0.005) return 0;
    return Math.min(0.35, F * 0.3);
  } catch (e) { return 0; }
}

// Apply realistic birth effects. First-gen low but real; later gens rise fast.
function tabooBirthAdjust(s, kid, parentA, parentB) {
  try {
    const F = tabooInbreeding(s, parentA.id, parentB.id);
    kid.inbred = F;
    const pd = Math.max(tabooDepthOf(parentA), tabooDepthOf(parentB));
    kid.tabooDepth = F > 0.03 ? pd + 1 : 0;
    if (F <= 0.005) return { F, defect: false };
    let defectChance = F * 0.35;
    if (kid.tabooDepth >= 2) defectChance += 0.08;
    if (kid.tabooDepth >= 3) defectChance += 0.15;
    defectChance = Math.min(0.6, defectChance);
    tally(s, 'tabooKids');
    if (chance(defectChance)) {
      kid.tabooBorn = true;
      tally(s, 'tabooDefects');
      kid.stats.health = clamp100(kid.stats.health - randInt(12, 24));
      kid.stats.smarts = clamp100(kid.stats.smarts - randInt(8, 18));
      if (chance(0.4)) kid.stats.looks = clamp100(kid.stats.looks - randInt(5, 14));
      if (chance(0.35)) {
        const pool = ['asthma', 'allergies', 'migraines', 'heart', 'diabetes'];
        const pickId = pick(pool);
        if (typeof addDisease === 'function') addDisease(s, kid, pickId);
      }
      return { F, defect: true };
    }
    // Subtle drag even without a named defect.
    kid.stats.health = clamp100(kid.stats.health - Math.round(F * 20));
    return { F, defect: false };
  } catch (e) { return { F: 0, defect: false }; }
}

/* ---- fallout (neutral sim, some social cost) ----------------------- */
function tabooDisapproval(s, pid, big) {
  let n = 0;
  for (const q of relPeople(s, ['parent', 'stepparent', 'sibling', 'halfsibling', 'child', 'grandparent', 'grandchild', 'aunt', 'cousin', 'nibling'])) {
    if (q.id === pid) continue;
    if (!q.alive) continue;
    addRel(s, q.id, big ? -randInt(10, 20) : -randInt(4, 10));
    n++;
  }
  return n;
}

// origSince: when the family tie was first on your list, so it can come back unchanged after a breakup.
function tabooOnRomanceStart(s, pid, origKind, origSince) {
  try {
    const r = relOf(s, pid);
    const tag = tabooTagFor(s, pid) || (origKind && TABOO_KIND_TO_TAG[origKind]) || null;
    if (r && tag) {
      r.taboo = tag;
      if (origKind && !r.wasFam) { r.wasFam = origKind; if (origSince) r.famSince = origSince; }
    }
    tally(s, 'tabooPartners');
    add(s, { karma: -4 });
    if (M(s).fame >= 30) add(s, { fame: -2 });
    tabooDisapproval(s, pid, false);
  } catch (e) {}
}

/* ---- when it ends, they are still family ------------------------------------
 * Dating a relative turns the relationship into 'partner' (wasFam remembers what it was). Ending it must not
 * file them under Others as an 'ex': blood is blood, so the family kind comes back with exRom ('ex' or
 * 'exspouse') kept for the title ("Sister · Ex"). An in-law only returns while your current partner is who
 * they are an in-law through. endRomance calls this, and migrate (29-save.js) for saves made before. */
function tabooFamilyTieHolds(s, pid, kind) {
  if (!kind) return false;
  if (kind !== 'inlaw') return true;
  const p = s.people[pid], mateId = romanticId(s), mate = mateId && s.people[mateId];
  if (!p || !mate || mateId === pid) return false;
  return mate.parents.includes(pid) || (p.parents || []).some((x) => mate.parents.includes(x));
}
function tabooRestoreFamily(s, pid, exKind) {
  const r = relOf(s, pid);
  if (!r || !r.wasFam || !K_EXES.includes(r.kind) || !s.people[pid]) return false;
  if (!tabooFamilyTieHolds(s, pid, r.wasFam)) return false;
  const keep = { taboo: r.taboo, wasFam: r.wasFam, since: r.famSince || r.since };
  const n = setRel(s, pid, r.wasFam, r.rel);
  if (keep.taboo) n.taboo = keep.taboo;
  n.wasFam = keep.wasFam;
  n.famSince = keep.since;
  n.since = keep.since;
  n.exRom = exKind || r.kind;
  return true;
}

function tabooOnMarry(s, pid) {
  try {
    add(s, { karma: -6 });
    if (M(s).fame >= 20) add(s, { fame: -3 });
    tabooDisapproval(s, pid, true);
    tally(s, 'tabooMarriages');
  } catch (e) {}
}

function tabooTick(s) {
  if (s.dead) return;
  const lovers = tabooPartners(s);
  if (!lovers.length) return;
  // Slow family drift while it continues. Events do the drama.
  for (const q of relPeople(s, ['parent', 'stepparent', 'sibling', 'halfsibling', 'child', 'grandparent', 'grandchild', 'aunt', 'cousin', 'nibling'])) {
    if (lovers.some((l) => l.id === q.id)) continue;
    if (chance(0.35)) addRel(s, q.id, -1);
  }
}

/* ---- discovery / reaction events (all adult-only, master-gated) --- */
EV('taboo_whispers', {
  ages: [18, 90], emoji: '👀', tags: ['taboo'],
  when: (s) => free(s) && tabooPartners(s).length > 0,
  ctx: (s) => { const l = tabooPartners(s); return l.length ? { pid: pick(l).id } : null; },
  text: (s, c) => `${pick(['Your phone lights up all day', 'The group chat goes quiet when you walk in', 'Your family keeps exchanging looks'])}. Someone suspects you and ${nm(s, c.pid)} are more than ${kinOf(s, c.pid)}.`,
  choices: [
    ['Deny it', (s, c) => { add(s, { karma: -1 }); const r = relOf(s, c.pid); if (r && r.kind === 'lover') r.sus = clamp((r.sus || 0) + 10, 0, 100); tabooDisapproval(s, c.pid, false); return `You laughed it off. Nobody laughed back.`; }],
    ['Own it calmly', (s, c) => { add(s, { karma: -3, happy: 2 }); addRel(s, c.pid, 6); tabooDisapproval(s, c.pid, true); return `You said you're both adults and it's consensual. The silence lasted a long time. ${nm(s, c.pid)} squeezed your hand under the table.`; }],
    ['Cool things off for now', (s, c) => { addRel(s, c.pid, -8); return `You created some distance from ${nm(s, c.pid)}. It hurt, but the questions stopped.`; }],
  ],
});

EV('taboo_holiday', {
  ages: [18, 95], emoji: '🦃', tags: ['taboo'],
  when: (s) => free(s) && tabooPartners(s).length > 0,
  ctx: (s) => { const l = tabooPartners(s).filter((p) => ageOf(s, p) >= 18); return l.length ? { pid: pick(l).id } : null; },
  text: (s, c) => `At a family gathering, you arrived with ${nm(s, c.pid)}. Every conversation stopped for a second too long.`,
  choices: [
    ['Sit together anyway', (s, c) => { addRel(s, c.pid, 8); add(s, { happy: 3, karma: -2 }); tabooDisapproval(s, c.pid, true); return `You stayed side by side through dinner. ${nm(s, c.pid)} will remember that you didn't hide.`; }],
    ['Keep your distance tonight', (s, c) => { addRel(s, c.pid, -5); add(s, { happy: -3 }); return `You played it cool and sat apart. It felt awful and everyone still noticed.`; }],
    ['Leave early together', (s, c) => { addRel(s, c.pid, 4); add(s, { happy: 2, karma: -2 }); tabooDisapproval(s, c.pid, false); return `You made an excuse and left. The car ride home was quiet, but together.`; }],
  ],
});

EV('taboo_talk', {
  ages: [18, 90], emoji: '💬', tags: ['taboo'], w: 0.8,
  when: (s) => free(s) && tabooPartners(s).length > 0,
  ctx: (s) => { const fam = relPeople(s, ['parent', 'sibling', 'halfsibling', 'child', 'grandparent']).filter((p) => ageOf(s, p) >= 18 && !tabooPartners(s).some((l) => l.id === p.id)); const l = tabooPartners(s); return fam.length && l.length ? { pid: pick(fam).id, love: pick(l).id } : null; },
  text: (s, c) => `Your ${kinTitle(s, c.pid).toLowerCase()} ${nm(s, c.pid)} asked to talk about you and ${nm(s, c.love)}. "Is this really what you want?"`,
  choices: [
    ['Say yes, you are sure', (s, c) => { addRel(s, c.love, 5); addRel(s, c.pid, chance(0.5) ? 4 : -8); return chance(0.5) ? `${nm(s, c.pid)} doesn't love it, but accepts you're an adult.` : `${nm(s, c.pid)} said "don't expect me at the wedding."`; }],
    ['Ask for time', (s, c) => { add(s, { happy: -2 }); return `You asked for patience. ${nm(s, c.pid)} said they'll try.`; }],
  ],
});

EV('taboo_pregnancy_news', {
  ages: [18, 45], emoji: '🤰', tags: ['taboo'],
  when: (s) => free(s) && !!M(s).pregnancy && tabooTagFor(s, M(s).pregnancy.partnerId),
  ctx: (s) => ({ pid: M(s).pregnancy.partnerId }),
  text: (s, c) => `The news that ${nm(s, c.pid)} is expecting your child is spreading through the family. The questions are harder now.`,
  choices: [
    ['Face it together', (s, c) => { addRel(s, c.pid, 6); tabooDisapproval(s, c.pid, true); add(s, { happy: 2, karma: -2 }); return `You told everyone the baby will be loved, whatever they think. ${nm(s, c.pid)} cried, then smiled.`; }],
    ['Keep it private', (s, c) => { add(s, { happy: -2 }); return `You stopped answering questions. The rumors filled the silence.`; }],
  ],
});
