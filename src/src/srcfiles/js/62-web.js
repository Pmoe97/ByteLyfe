/* =====================================================================
 * 62-web.js — the connected world. Secrets that leak along social ties,
 * a reputation that follows you, a fact bus the systems announce things
 * on, and neighborhoods that get uneasy.
 *
 * s.web = { seq, secrets: { id: Secret }, unease: { 'cc:city': n } }
 *   Secret = { id, kind, subj, other, rom, year, sev, ev, knows: [pid], out,
 *              hush: { pid: untilYear }, crime?, note? }
 *     subj    whose secret it is (the player's person id, or an NPC)
 *     other   the second person in it (a lover, a victim)
 *     sev     1-5, how much it would hurt if it got out
 *     ev      0-100, how much proof there is; people learning it raise it
 *     knows   everyone who knows, the subject included
 *     out     true once it is no secret any more
 * p.rep  = { name, scandal } on any person (the player's is what counts)
 * p.ties = [{ id, k }] up to six, who a person talks to besides their family
 *
 * webTick runs once a year (after youthTick): it weaves your circle's
 * ties, starts a little drama among the people you know, leaks every
 * secret one step along the ties, and lets old ones fade. Whatever reaches
 * you as hearsay is a popup you can answer. Other files announce what
 * happened with webFact(s, 'killed', { pid }) and read the result with
 * webHireEdge, webJuryEdge and webUnease.
 * ===================================================================== */

const WEB_MAX_SECRETS = 60;
const WEB_MAX_TIES = 6;
// How the people in your life group together: coworkers know each other, and so on.
const WEB_TIE_KIND = { coworker: 'work', boss: 'work', classmate: 'school', teacher: 'school', friend: 'friend', bestie: 'friend', cellmate: 'cell' };
const WEB_TELL_WEIGHT = { friend: 3, work: 2, school: 2, kin: 1.5, you: 1.5, cell: 1 };

function webOf(s) {
  if (!s.web) s.web = { seq: 0, secrets: {}, unease: {} };
  return s.web;
}
function webName(s, id) { const p = s.people[id]; return p ? p.first : 'someone'; }

/* ---- reputation ------------------------------------------------------ */
function webRep(p) { return p.rep || (p.rep = { name: 50, scandal: 0 }); }
function webRepAdd(p, d) {
  const r = webRep(p);
  if (d.name) r.name = clamp100(r.name + d.name);
  if (d.scandal) r.scandal = clamp100(r.scandal + d.scandal);
}
// Odds nudges other systems read. A scandal costs you job offers and juries' goodwill.
function webHireEdge(s) { const r = webRep(P(s)); return -r.scandal / 300 + (r.name - 50) / 500; }
function webJuryEdge(s) { const r = webRep(P(s)); return r.scandal / 400 - (r.name - 50) / 500; }
function webRepWord(r) {
  if (r.scandal >= 60) return 'Infamous';
  if (r.scandal >= 30) return 'Talked about';
  if (r.name >= 70) return 'Well respected';
  if (r.name >= 45) return 'Decent';
  return 'Doubted';
}

/* ---- secrets ---------------------------------------------------------- */
const SECRET_KINDS = {
  affair: { sev: 3, icon: '💔' },
  cheated: { sev: 2, icon: '🌙' },
  crime: { sev: 2, icon: '🧤' },
  killing: { sev: 5, icon: '🕯️' },
  sti: { sev: 3, icon: '🧪' },
  npc_affair: { sev: 3, icon: '💔' },
  npc_debt: { sev: 2, icon: '💸' },
  npc_crime: { sev: 2, icon: '🚔' },
  npc_fired: { sev: 2, icon: '📦' },
  npc_habit: { sev: 2, icon: '🍺' },
  adult_work: { sev: 3, icon: '🎭' }, // what you do for a living, from 71-adult-work.js
};
const NPC_CRIME_NOTES = ['a drunk-driving stop', 'a shoplifting charge', 'a bar fight', 'a bounced-check scandal'];
const NPC_HABIT_NOTES = ['drinking', 'gambling', 'pill'];

function webNewSecret(s, kind, subj, o) {
  o = o || {};
  const w = webOf(s);
  const ids = Object.keys(w.secrets);
  if (ids.length >= WEB_MAX_SECRETS) {
    const old = ids.filter((id) => w.secrets[id].subj !== s.playerId).sort((a, b) => w.secrets[a].year - w.secrets[b].year)[0] || ids[0];
    delete w.secrets[old];
  }
  const knows = [subj].concat((o.knows || []).filter((x) => x && x !== subj));
  const sec = { id: 'x' + (++w.seq).toString(36), kind, subj, other: o.other || null, rom: o.rom || null, year: s.year, sev: o.sev ?? SECRET_KINDS[kind].sev, ev: o.ev ?? 20, knows: Array.from(new Set(knows)), out: false };
  if (o.crime) sec.crime = o.crime;
  if (o.note) sec.note = o.note;
  w.secrets[sec.id] = sec;
  return sec;
}
function webLive(s, filter) { return Object.values(webOf(s).secrets).filter((x) => !x.out && (!filter || filter(x))); }
function webMine(s) { return webLive(s, (x) => x.subj === s.playerId); }
// What you have heard about other people.
function webHeard(s) { return webLive(s, (x) => x.subj !== s.playerId && x.knows.includes(s.playerId)); }
function webKnowers(s, sec) { return sec.knows.filter((id) => id !== sec.subj && s.people[id] && s.people[id].alive); }
// The secrets of yours a given person knows.
function webTheyKnow(s, pid) { return webMine(s).filter((x) => x.knows.includes(pid)); }
function webAbout(s, pid) { return webHeard(s).filter((x) => x.subj === pid); }

// How a secret reads from the player's side ("your affair with Dana") and as a rumor.
function webLabel(s, sec) {
  const b = webName(s, sec.other);
  if (sec.kind === 'affair') return `your affair with ${b}`;
  if (sec.kind === 'cheated') return `your night with ${b}`;
  if (sec.kind === 'crime') return `${CRIMES[sec.crime] ? CRIMES[sec.crime].verb : 'a crime'} nobody has pinned on you`;
  if (sec.kind === 'killing') return `what happened to ${b}`;
  if (sec.kind === 'sti') return `a diagnosis you have not told ${webName(s, sec.rom)} about`;
  if (sec.kind === 'adult_work') return adultWorkLabel(s, sec);
  return webRumor(s, sec);
}
function webRumor(s, sec) {
  const subj = s.people[sec.subj], a = webName(s, sec.subj), b = webName(s, sec.other);
  const his = subj ? pr(subj).his : 'their';
  switch (sec.kind) {
    case 'npc_affair': return `${a} has been sneaking around with ${b} behind ${his} partner's back`;
    case 'npc_debt': return `${a} is buried in debt and hiding it`;
    case 'npc_crime': return `${a} got caught up in ${sec.note || 'trouble with the law'} and kept it quiet`;
    case 'npc_fired': return `${a} was fired and hasn't told anyone`;
    case 'npc_habit': return `${a} has a serious ${sec.note || 'drinking'} problem`;
    default: return `${a} is hiding something`;
  }
}

/* ---- ties: who talks to whom ------------------------------------------ */
// Everyone a person could tell, with how they know each other. Family is read off the
// family tree; everyone else is in p.ties. The player counts as someone a person can tell
// when they know you.
function webTies(s, p) {
  const out = new Map();
  const add = (id, k) => { if (id && id !== p.id && s.people[id] && s.people[id].alive && !out.has(id)) out.set(id, k); };
  for (const id of p.parents || []) {
    add(id, 'kin');
    const par = s.people[id];
    if (par) for (const c of par.children || []) add(c, 'kin');
  }
  for (const id of p.children || []) add(id, 'kin');
  add(p.partner, 'kin');
  for (const t of p.ties || []) add(t.id, t.k);
  if (p.id !== s.playerId && M(s).rels[p.id]) add(s.playerId, 'you');
  return out;
}
function webLink(s, a, b, k) {
  const pa = s.people[a], pb = s.people[b];
  if (!pa || !pb || a === b || a === s.playerId || b === s.playerId) return;
  const put = (x, y) => {
    const l = x.ties || (x.ties = []);
    if (l.some((t) => t.id === y.id)) return true;
    if (l.length >= WEB_MAX_TIES) return false;
    l.push({ id: y.id, k });
    return true;
  };
  if (put(pa, pb)) put(pb, pa);
}
// Your circle gets to know itself: coworkers meet coworkers, friends meet friends.
function webWeave(s) {
  const groups = {};
  for (const pid in M(s).rels) {
    const p = s.people[pid];
    if (!p || !p.alive) continue;
    const k = WEB_TIE_KIND[M(s).rels[pid].kind];
    if (k) (groups[k] || (groups[k] = [])).push(pid);
  }
  for (const k in groups) {
    const list = groups[k];
    if (list.length < 2) continue;
    for (const pid of list) if (chance(0.45)) webLink(s, pid, pick(list.filter((x) => x !== pid)), k);
  }
  // Your partner knows your friends.
  const rom = romanticId(s);
  if (rom && groups.friend) for (const pid of groups.friend) if (chance(0.2)) webLink(s, rom, pid, 'friend');
}

/* ---- the fact bus ------------------------------------------------------ */
const WEB_ON = {};
function onWebFact(type, fn) { (WEB_ON[type] || (WEB_ON[type] = [])).push(fn); }
function webFact(s, type, data) {
  for (const fn of WEB_ON[type] || []) {
    try { fn(s, data || {}); } catch (e) { console.error('[ByteLyfe] web fact failed:', type, e); }
  }
}

/* ---- unease: a neighborhood remembers ---------------------------------- */
function webCityKey(s) { const p = P(s); return p.country + ':' + p.city; }
function webUneaseAdd(s, d, key) {
  const w = webOf(s), k = key || webCityKey(s);
  const v = Math.round(clamp((w.unease[k] || 0) + d, 0, 20) * 10) / 10;
  if (v <= 0) delete w.unease[k]; else w.unease[k] = v;
}
function webUneaseHere(s) { return webOf(s).unease[webCityKey(s)] || 0; }
// Read by cityMarketYear (49-cities.js): an uneasy city's prices sag.
function webUnease(s, cc, city) { return ((s.web && s.web.unease && s.web.unease[cc + ':' + city]) || 0) * 0.004; }

/* ---- learning, staking and exposure ------------------------------------ */
function webLearn(s, sec, pid, from) {
  if (sec.knows.includes(pid) || !s.people[pid]) return;
  sec.knows.push(pid);
  sec.ev = clamp100(sec.ev + 8);
  if (sec.case && sec.subj !== pid) invTip(s, sec, 6); // one more person who could tell the police (63-cases.js)
  if (pid === s.playerId) {
    if (sec.subj !== pid) webHearsay(s, sec, from);
    return;
  }
  if (sec.subj === s.playerId) webStake(s, sec, pid);
  if (!sec.out) webCheckPublic(s, sec);
}
function webCheckPublic(s, sec) {
  if (sec.out) return;
  if (sec.knows.length >= (sec.sev >= 4 ? 4 : 5) || sec.ev >= 85) webExpose(s, sec, 'gossip');
}
// The person it matters most to has just found out.
function webStake(s, sec, pid) {
  const rom = romanticId(s);
  if (!rom || rom !== pid || sec.out) return;
  if (sec.kind === 'adult_work') { adultPartnerFound(s, sec, rom); return; }
  if (sec.kind === 'sti' && sec.rom === rom) {
    sec.out = true;
    sec.outYear = s.year;
    webRepAdd(P(s), { scandal: 2, name: -3 });
    addRel(s, rom, -22);
    announce(s, { emoji: '🧪', title: 'They found out', text: `${nm(s, rom)} found out about your diagnosis, and that you did not tell them.${relOf(s, rom).rel < 25 && chance(0.4) ? ' ' + partnerLeaves(s, rom) : ''}`.trim(), tone: 'bad', person: rom });
    return;
  }
  if (sec.kind === 'affair' && sec.rom === rom && sec.other && relKind(s, sec.other) === 'lover') {
    caughtPopup(s, sec.other, rom); // 47-romance.js; it announces the fact back to us
  } else if ((sec.kind === 'affair' || sec.kind === 'cheated') && sec.rom === rom) {
    sec.out = true;
    sec.outYear = s.year;
    webRepAdd(P(s), { scandal: sec.sev, name: -sec.sev });
    announce(s, { emoji: '😳', title: 'Word got back', text: `Word got around, and it reached ${nm(s, rom)}.${hookupFoundOut(s, rom)}`, tone: 'bad', person: rom });
  }
}
function webExpose(s, sec, how) {
  if (sec.out) return;
  sec.out = true;
  sec.outYear = s.year;
  const me = sec.subj === s.playerId, subj = s.people[sec.subj];
  if (me) {
    const p = P(s);
    webRepAdd(p, { scandal: 5 * sec.sev, name: -3 * sec.sev });
    for (const par of relPeople(s, ['parent', 'sibling', 'child'])) addRel(s, par.id, -sec.sev);
    const rom = romanticId(s);
    let extra = '';
    if (sec.kind === 'affair' && rom && rom === sec.rom && sec.other && relKind(s, sec.other) === 'lover') caughtPopup(s, sec.other, rom);
    else if ((sec.kind === 'affair' || sec.kind === 'cheated') && rom && rom === sec.rom) extra = hookupFoundOut(s, rom);
    if ((sec.kind === 'crime' || sec.kind === 'killing') && !invTip(s, sec, 30)) {
      // No case file to feed (an old save): fall back to the cold-case roll.
      const heat = M(s).flags.heat || (M(s).flags.heat = []);
      const crime = sec.kind === 'killing' ? 'murder' : sec.crime;
      heat.push({ crime, year: s.year }, { crime, year: s.year });
      if (sec.kind === 'killing' && sec.ev >= 60 && chance(0.5) && !inPrison(s) && !s.dead) { const r = arrest(s, 'murder'); if (r && r.text) log(s, r.text, 'bad'); }
    }
    if (sec.kind === 'adult_work') extra = adultExposed(s, sec);
    announce(s, { emoji: '📣', title: 'It got out', text: `${cap(webLabel(s, sec))} is no longer a secret. ${how === 'tip' ? 'Someone called it in.' : 'People are talking.'}${extra}`, tone: 'bad' });
    return;
  }
  if (!subj) return;
  if (sec.kind === 'npc_affair') {
    const mate = subj.partner && s.people[subj.partner];
    if (mate) { subj.partner = null; subj.married = false; mate.partner = null; mate.married = false; }
    const lover = s.people[sec.other];
    if (lover && lover.alive && !lover.partner && !mate) { lover.partner = subj.id; subj.partner = lover.id; }
  } else if (sec.kind === 'npc_fired') {
    subj.job = null;
  } else if (sec.kind === 'npc_debt') {
    subj.money = 0;
  } else if (sec.kind === 'npc_crime') {
    subj.money = Math.max(0, subj.money - Math.round(300 * econOf(subj)));
  } else if (sec.kind === 'npc_habit') {
    subj.stats.health = clamp100(subj.stats.health - 5);
    subj.stats.happy = clamp100(subj.stats.happy - 8);
  }
  if (M(s).rels[subj.id]) log(s, `🗣️ Everyone knows now: ${webRumor(s, sec)}.`);
}

/* ---- facts the systems announce ---------------------------------------- */
function webCrimeSecret(s, d) {
  const c = CRIMES[d.crime];
  if (!c || (!c.felony && chance(0.7))) return;
  const me = s.playerId;
  const have = webLive(s, (x) => x.kind === 'crime' && x.subj === me && x.crime === d.crime)[0];
  if (have) { have.ev = clamp100(have.ev + 10); return; }
  const sev = c.felony ? (c.sentence[1] >= 8 ? 3 : 2) : 1;
  const sec = webNewSecret(s, 'crime', me, { sev, ev: 15 + sev * 8, crime: d.crime });
  const w = pickRel(s, ['friend', 'bestie', 'coworker', 'classmate']);
  if (c.felony && w && chance(0.15)) sec.knows.push(w);
}
onWebFact('crime_clean', webCrimeSecret);
onWebFact('crime_messy', webCrimeSecret);
onWebFact('arrested', (s, d) => {
  const c = CRIMES[d.crime];
  // A conviction makes it a matter of record: nothing left to keep secret.
  for (const x of webLive(s, (y) => y.subj === s.playerId && ((y.kind === 'crime' && y.crime === d.crime) || (y.kind === 'killing' && d.crime === 'murder')))) delete webOf(s).secrets[x.id];
  webRepAdd(P(s), c && c.felony ? { scandal: 6, name: -5 } : { scandal: 2, name: -1 });
});
onWebFact('killed', (s, d) => {
  const victim = s.people[d.pid];
  const sec = webNewSecret(s, 'killing', s.playerId, { other: d.pid, ev: { poison: 25, accident: 20, hitman: 15 }[d.how] || 25 });
  webUneaseAdd(s, 6);
  // The people who loved them grieve, and some of them wonder.
  if (!victim) return;
  for (const id of webTies(s, victim).keys()) {
    if (id === s.playerId || !M(s).rels[id]) continue;
    addRel(s, id, -12);
    if (chance(0.3)) sec.knows.push(id);
  }
  sec.ev = clamp100(sec.ev + 5 * (sec.knows.length - 1));
  webCheckPublic(s, sec);
});
onWebFact('assault', (s) => {
  webUneaseAdd(s, 1.5);
  if (chance(0.35)) webRepAdd(P(s), { scandal: 2, name: -2 });
});
onWebFact('affair_begun', (s, d) => { webNewSecret(s, 'affair', s.playerId, { other: d.pid, rom: d.rom, knows: [d.pid], ev: 10 }); });
onWebFact('fling_cheat', (s, d) => { webNewSecret(s, 'cheated', s.playerId, { other: d.pid, rom: d.rom, knows: [d.pid], ev: 8 }); });
// The partner found out through the old routes; the secret is no secret.
function webFound(s, d, kind) {
  const sec = webLive(s, (x) => x.kind === kind && x.subj === s.playerId && (d.pid ? x.other === d.pid : x.rom === d.rom))[0];
  if (!sec) return;
  if (d.rom && !sec.knows.includes(d.rom)) sec.knows.push(d.rom);
  sec.out = true;
  sec.outYear = s.year;
  webRepAdd(P(s), { scandal: sec.sev, name: -sec.sev });
}
onWebFact('affair_found', (s, d) => webFound(s, d, 'affair'));
onWebFact('fling_found', (s, d) => webFound(s, d, 'cheated'));
onWebFact('promoted', (s) => webRepAdd(P(s), { name: 1 }));

/* ---- the yearly tick ---------------------------------------------------- */
function webTick(s) {
  webPrune(s);
  webWeave(s);
  webCircleDrama(s);
  webLeak(s);
  webDecay(s);
}

function webPrune(s) {
  const w = webOf(s);
  for (const id in w.secrets) {
    const x = w.secrets[id], subj = s.people[x.subj];
    if (!subj || (!subj.alive && !x.out)) { delete w.secrets[id]; continue; }
    x.knows = x.knows.filter((k) => s.people[k]);
    if (!x.knows.includes(x.subj)) x.knows.push(x.subj);
    if (x.other && !s.people[x.other]) x.other = null;
    if (x.hush) for (const k in x.hush) if (!s.people[k] || x.hush[k] < s.year) delete x.hush[k];
  }
  for (const id in s.people) {
    const l = s.people[id].ties;
    if (l) s.people[id].ties = l.filter((t) => s.people[t.id] && t.id !== id);
  }
}

// A little drama among the people you know: the web needs something to carry.
function webCircleDrama(s) {
  if (A(s) < 18 || s.dead) return;
  const cands = relPeople(s, ['friend', 'bestie', 'coworker', 'boss', 'sibling', 'classmate']).filter((p) => { const a = ageOf(s, p); return a >= 20 && a <= 75; });
  if (cands.length < 2) return;
  for (let n = 0; n < 2; n++) {
    if (!chance(0.3)) continue;
    const subj = pick(cands);
    if (webLive(s, (x) => x.subj === subj.id).length) continue;
    const mate = subj.partner && s.people[subj.partner];
    const lovers = mate && mate.alive ? cands.filter((o) => o.id !== subj.id && o.id !== subj.partner && attractedTo(subj, o) && attractedTo(o, subj)) : [];
    const kind = weighted(['npc_affair', 'npc_debt', 'npc_crime', 'npc_fired', 'npc_habit'], (k) => ({ npc_affair: lovers.length ? 3 : 0, npc_debt: 3, npc_crime: 2, npc_fired: subj.job && subj.job.id ? 2 : 0, npc_habit: 2 }[k]));
    if (!kind) continue;
    const o = { ev: 20 };
    if (kind === 'npc_affair') { o.other = pick(lovers).id; o.knows = [o.other]; }
    if (kind === 'npc_crime') o.note = pick(NPC_CRIME_NOTES);
    if (kind === 'npc_habit') o.note = pick(NPC_HABIT_NOTES.concat(subsOn() ? ['cocaine', 'opioid'] : []));
    const sec = webNewSecret(s, kind, subj.id, o);
    const ties = [...webTies(s, subj).keys()].filter((id) => id !== s.playerId);
    if (ties.length && chance(0.3)) sec.knows.push(pick(ties));
    // Close friends sometimes confide.
    const r = relOf(s, subj.id);
    if (r && ['friend', 'bestie'].includes(r.kind) && r.rel >= 60 && chance(0.3)) { sec.knows.push(s.playerId); webHearsay(s, sec, subj.id, true); }
  }
}

function webLeakOdds(s, sec, kid) {
  let o = 0.05 + sec.sev * 0.02;
  const r = M(s).rels[kid];
  if (sec.subj === s.playerId) {
    const k = r && r.kind;
    if (k === 'enemy') o += 0.25;
    if (k === 'ex' || k === 'exspouse') o += 0.18;
    if (r && r.rel >= 70) o *= 0.4;
    else if (r && r.rel <= 25) o += 0.1;
    if (kid === sec.other && (sec.kind === 'affair' || sec.kind === 'cheated')) o *= 0.5;
    if (romanticId(s) === kid) o += 0.15;
    if (sec.hush && sec.hush[kid] >= s.year) o *= 0.15;
  } else {
    o += 0.04;
  }
  return clamp(o, 0.01, 0.6);
}
function webPickTarget(s, kid, sec) {
  const p = s.people[kid];
  const opts = [...webTies(s, p).entries()].filter(([id]) => !sec.knows.includes(id));
  const pick1 = weighted(opts, ([, k]) => WEB_TELL_WEIGHT[k] || 1);
  return pick1 ? pick1[0] : null;
}
function webLeak(s) {
  for (const sec of webLive(s)) {
    for (const kid of webKnowers(s, sec).filter((id) => id !== s.playerId).slice(0, 6)) {
      if (sec.out) break;
      if (!chance(webLeakOdds(s, sec, kid))) continue;
      const to = webPickTarget(s, kid, sec);
      if (to) webLearn(s, sec, to, kid);
    }
    // Nobody talked: someone called it in.
    if (!sec.out && sec.subj === s.playerId && (sec.kind === 'crime' || sec.kind === 'killing') && chance(sec.ev / 600)) webExpose(s, sec, 'tip');
  }
}
function webDecay(s) {
  const w = webOf(s);
  for (const id in w.secrets) {
    const x = w.secrets[id];
    if (x.out) { if (s.year - (x.outYear || x.year) > 20) delete w.secrets[id]; continue; }
    x.ev = Math.max(5, x.ev - 3);
    if (s.year - x.year > 15 && x.kind !== 'killing') delete w.secrets[id];
  }
  const r = webRep(P(s));
  if (r.scandal > 0) r.scandal = clamp100(r.scandal - Math.max(1, Math.round(r.scandal * 0.07)));
  r.name = clamp100(r.name + Math.sign(50 - r.name));
  for (const k in w.unease) { w.unease[k] = Math.round(w.unease[k] * 8) / 10; if (w.unease[k] < 0.5) delete w.unease[k]; }
}
// Your children inherit part of the family name, good or bad.
function webHeir(s, old, heir) {
  const o = webRep(old), h = webRep(heir);
  h.name = clamp100(50 + Math.round((o.name - 50) * 0.5));
  h.scandal = clamp100(Math.round(o.scandal * 0.5));
  if (h.scandal >= 20) log(s, `🗣️ People still remember the talk about ${old.first}. Some doors open a little slower for you.`, 'bad');
}

/* ---- hearsay: what reaches you ------------------------------------------ */
function webHearsay(s, sec, from, confided) {
  if (s.dead || inPrison(s) || A(s) < 18) return;
  if (bump(s, 'webhear') > 2 || s.pending.some((pp) => pp.handler === 'webHear' && pp.ctx.sid === sec.id)) return;
  const subj = s.people[sec.subj];
  if (!subj) return;
  const src = s.people[from];
  const text = confided
    ? `${subj.first} pulled you aside, voice low. "You can't tell anyone." Then, in confidence: ${webRumor(s, sec)}.`
    : `${src && src.id !== subj.id ? src.first : 'Someone'} leans in. "You didn't hear this from me." "${cap(webRumor(s, sec))}."`;
  const choices = [{ label: 'Keep it to yourself', value: 'quiet' }, { label: `Ask ${subj.first} about it`, value: 'ask' }];
  if (['npc_debt', 'npc_fired', 'npc_habit'].includes(sec.kind)) choices.push({ label: 'Quietly offer help', sub: fmtMoney(price(s, 500)), value: 'help' });
  choices.push({ label: 'Pass it along', value: 'spread', tone: 'bad' });
  if (tagsOn(['mature'])) choices.push({ label: 'Use it to squeeze them', value: 'squeeze', tone: 'bad' });
  popup(s, { emoji: SECRET_KINDS[sec.kind].icon, title: confided ? 'A confidence' : 'Word gets around', text, handler: 'webHear', ctx: { sid: sec.id }, person: subj.id, choices });
}
onChoice('webHear', (s, ctx, v) => {
  const sec = webOf(s).secrets[ctx.sid], p = sec && s.people[sec.subj];
  if (!sec || !p || !p.alive || sec.out) return { text: 'By the time you made up your mind, it was old news.', quiet: true, nolog: true };
  const r = relOf(s, p.id);
  if (v === 'quiet') {
    add(s, { karma: 1 });
    if (r && r.rel >= 40) addRel(s, p.id, 2);
    return 'You kept it to yourself. Some things are not yours to repeat.';
  }
  if (v === 'ask') {
    if (chance(clamp((r ? r.rel : 30) / 100 + skill(s, 'charisma') / 400, 0.15, 0.85))) {
      if (r) addRel(s, p.id, 6);
      return `${p.first} went quiet, then told you everything. "Please don't tell anyone." You won't.`;
    }
    if (r) addRel(s, p.id, -10);
    return { text: `${p.first} denied everything, a little too fast. They know someone has been talking.`, tone: 'bad' };
  }
  if (v === 'help') {
    const cost = price(s, 500);
    if (!pay(s, cost)) return cantAfford(cost);
    if (sec.kind === 'npc_debt') p.money += cost;
    if (r) addRel(s, p.id, 10);
    add(s, { karma: 2 });
    return `You quietly helped ${p.first}${sec.kind === 'npc_habit' ? ' find a meeting and a ride there' : ''}. They will not forget it.`;
  }
  if (v === 'spread') {
    const pool = relPeople(s, ['friend', 'bestie', 'coworker', 'classmate', 'sibling']).filter((x) => x.id !== p.id && !sec.knows.includes(x.id));
    add(s, { karma: -2 });
    if (!pool.length) return 'You had no one left to tell.';
    const t = pick(pool);
    webLearn(s, sec, t.id, s.playerId);
    // What a patient, a client or a regular told you in confidence is not yours to spread (65-work.js).
    const trust = { patient: 8, client: 6, regular: 3 }[sec.via];
    if (trust) { webRepAdd(P(s), { scandal: trust - 2, name: -trust }); log(s, '🤐 Telling what someone confided in you is a breach of trust, and word of it travels.', 'bad'); }
    if (r && chance(0.3)) { addRel(s, p.id, -25); return { text: `You told ${t.first}. It got back to ${p.first}, and they know who talked.`, tone: 'bad' }; }
    return `You told ${t.first}. The story has legs now.`;
  }
  if (v === 'squeeze' && tagsOn(['mature'])) return webSqueeze(s, sec, p);
});
// Squeezing someone for what you know (mature content).
function webSqueeze(s, sec, p) {
  const amt = Math.min(Math.max(0, p.money), price(s, 1500 + 500 * sec.sev));
  add(s, { karma: -8 });
  if (amt > 0 && chance(clamp(0.5 + skill(s, 'charisma') / 400 + skill(s, 'streetwise') / 400, 0.2, 0.85))) {
    p.money -= amt;
    M(s).money += amt;
    webFact(s, 'extorted', { pid: p.id }); // they may go to the police (63-cases.js)
    if (relOf(s, p.id)) relOf(s, p.id).rel = Math.min(relOf(s, p.id).rel, 8);
    return { text: `${p.first} paid ${fmtMoney(amt)} and looked at you like a stranger.`, tone: 'bad' };
  }
  if (relOf(s, p.id)) addRel(s, p.id, -30);
  webRepAdd(P(s), { scandal: 8, name: -6 });
  return { text: `${p.first} laughed in your face and told people you tried to blackmail them.`, tone: 'bad' };
}

/* ---- actions ------------------------------------------------------------- */
const webKnowsMine = (s, pid) => reachable(s, pid) && A(s) >= 14 && webTheyKnow(s, pid).length > 0;
defAction({
  id: 'web_silence', cat: 'person', group: 'web', target: 'person', label: 'Keep them quiet', emoji: '🤐', desc: 'They know something you would rather they did not.',
  when: (s, pid) => webKnowsMine(s, pid) && !count(s, 'silence_' + pid),
  sub: (s, pid) => `They know ${nOf(webTheyKnow(s, pid).length, 'secret')}`,
  run: (s, pid) => {
    const cost = price(s, 1500 * Math.max(...webTheyKnow(s, pid).map((x) => x.sev)));
    const choices = [{ label: 'Ask them as a favor', value: 'ask' }, { label: 'Pay for their silence', sub: fmtMoney(cost), value: 'pay', disabled: M(s).money < cost }];
    if (tagsOn(['mature'])) choices.push({ label: 'Lean on them', value: 'lean', tone: 'bad' });
    choices.push({ label: 'Never mind', value: null });
    popup(s, { emoji: '🤐', title: `Keep ${nm(s, pid)} quiet`, text: `${nm(s, pid)} knows ${listJoin(webTheyKnow(s, pid).map((x) => webLabel(s, x)))}. How do you handle it?`, handler: 'webSilence', ctx: { pid, cost }, person: pid, choices });
  },
});
onChoice('webSilence', (s, ctx, v) => {
  const p = s.people[ctx.pid], secs = p ? webTheyKnow(s, ctx.pid) : [];
  if (!v || !p || !p.alive || !secs.length) return;
  bump(s, 'silence_' + ctx.pid);
  const r = relOf(s, ctx.pid);
  const hush = (yrs) => { for (const x of secs) (x.hush || (x.hush = {}))[ctx.pid] = s.year + yrs; };
  if (v === 'ask') {
    if (chance(clamp((r ? r.rel : 30) / 100 + skill(s, 'charisma') / 400, 0.1, 0.9))) { hush(2); return `${p.first} promised to keep quiet. You believe them, mostly.`; }
    if (r) addRel(s, ctx.pid, -8);
    return { text: `${p.first} said "of course," in a way that did not sound like it.`, tone: 'bad' };
  }
  if (v === 'pay') {
    if (!pay(s, ctx.cost)) return cantAfford(ctx.cost);
    hush(4);
    return `${fmtMoney(ctx.cost)} later, ${p.first} has lost their memory. For now.`;
  }
  if (v === 'lean' && tagsOn(['mature'])) {
    add(s, { karma: -4 });
    if (chance(clamp(0.35 + skill(s, 'streetwise') / 250 + (trait(s, 'hotheaded') ? 0.1 : 0), 0.1, 0.8))) {
      hush(5);
      if (r) r.rel = Math.min(r.rel, 8);
      return { text: `${p.first} got the message. They will not say a word, and they will not look at you again either.`, tone: 'bad' };
    }
    if (r) addRel(s, ctx.pid, -30);
    for (const x of secs) x.ev = clamp100(x.ev + 10);
    return { text: `${p.first} was not scared. They were angry, and now they have a reason to talk.`, tone: 'bad' };
  }
});
defAction({
  id: 'web_confront', cat: 'person', group: 'web', target: 'person', label: 'Bring up what you heard', emoji: '🗣️', desc: 'You know something about them.',
  when: (s, pid) => reachable(s, pid) && webAbout(s, pid).length > 0 && !count(s, 'confront_' + pid),
  sub: (s, pid) => cap(webRumor(s, webAbout(s, pid)[0])),
  run: (s, pid) => {
    bump(s, 'confront_' + pid);
    const sec = webAbout(s, pid)[0];
    const choices = [{ label: 'Ask them about it', value: 'ask' }];
    if (['npc_debt', 'npc_fired', 'npc_habit'].includes(sec.kind)) choices.push({ label: 'Quietly offer help', sub: fmtMoney(price(s, 500)), value: 'help' });
    if (tagsOn(['mature'])) choices.push({ label: 'Use it to squeeze them', value: 'squeeze', tone: 'bad' });
    choices.push({ label: 'Never mind', value: null });
    popup(s, { emoji: '🗣️', title: nm(s, pid), text: `You know that ${webRumor(s, sec)}.`, handler: 'webHear', ctx: { sid: sec.id }, person: pid, choices });
  },
});
defAction({
  id: 'web_coverup', cat: 'crime', label: 'Destroy evidence', emoji: '🔥', desc: 'Make something you did harder to prove.',
  when: (s) => free(s) && A(s) >= 14 && webMine(s).some((x) => x.kind === 'crime' || x.kind === 'killing') && !count(s, 'coverup'),
  sub: (s) => fmtMoney(price(s, 800)),
  run: (s) => {
    const cost = price(s, 800);
    if (!pay(s, cost)) return cantAfford(cost);
    bump(s, 'coverup');
    const sec = webMine(s).filter((x) => x.kind === 'crime' || x.kind === 'killing').sort((a, b) => b.sev - a.sev)[0];
    sec.ev = clamp100(sec.ev - 25 - (trait(s, 'cunning') ? 8 : 0));
    invScrub(s, sec); // and the police file (63-cases.js)
    add(s, { karma: -2 });
    return `You spent ${fmtMoney(cost)} making sure ${webLabel(s, sec)} gets harder to prove. The trail is colder now.`;
  },
});

/* ---- events ------------------------------------------------------------- */
const webSerious = (s) => webMine(s).filter((x) => x.kind === 'killing' || (x.kind === 'crime' && x.sev >= 2));
EV('web_canvass', {
  ages: [16, 95], emoji: '🚔', title: 'Questions at the door', cooldown: 3,
  when: (s) => free(s) && webSerious(s).length > 0,
  w: 2,
  ctx: (s) => ({ sid: pick(webSerious(s)).id }),
  text: (s, c) => `Two detectives are going door to door about ${webOf(s).secrets[c.sid] && webOf(s).secrets[c.sid].kind === 'killing' ? 'a death in the neighborhood' : 'a string of break-ins'}. They ask if you have a minute.`,
  choices: [
    ['Play it cool', (s, c) => {
      const sec = webOf(s).secrets[c.sid];
      if (!sec || sec.out) return 'They moved on to the next house.';
      if (chance(clamp(0.5 + skill(s, 'charisma') / 300 + (trait(s, 'cunning') ? 0.12 : 0) - sec.ev / 250, 0.1, 0.9))) { sec.ev = clamp100(sec.ev - 10); return 'You were helpful, a little bored, and forgettable. They thanked you and left.'; }
      sec.ev = clamp100(sec.ev + 15);
      return { text: 'You smiled one second too long. One of them wrote something down.', tone: 'bad' };
    }],
    { label: 'Say nothing and call a lawyer', sub: (s) => fmtMoney(price(s, 1500)), fx: (s, c) => {
      const cost = price(s, 1500), sec = webOf(s).secrets[c.sid];
      if (!pay(s, cost)) return cantAfford(cost);
      if (sec) sec.ev = clamp100(sec.ev - 15);
      return 'Your lawyer did all the talking. The detectives got nothing, and noticed that.';
    } },
    { label: 'Ask a friend to vouch for you', when: (s) => !!pickRel(s, ['friend', 'bestie']), fx: (s, c) => {
      const sec = webOf(s).secrets[c.sid], f = pickRel(s, ['friend', 'bestie']);
      if (!sec || !f) return 'The moment passed.';
      sec.ev = clamp100(sec.ev - 25);
      if (!sec.knows.includes(f)) sec.knows.push(f);
      return `${nm(s, f)} said you were home all night. They did not ask why it mattered. They will.`;
    } },
  ],
});
EV('web_vigil', {
  ages: [8, 95], emoji: '🕯️', title: 'A vigil on the block', cooldown: 4,
  when: (s) => webUneaseHere(s) >= 3,
  w: 2,
  text: 'After what happened in the neighborhood, people are putting out candles on the corner. Someone has a clipboard for a neighborhood watch.',
  choices: [
    ['Light a candle', (s) => { add(s, { karma: 2, happy: -1 }); webUneaseAdd(s, -1); return 'You stood with your neighbors in the dark for an hour. Nobody said much.'; }],
    ['Join the neighborhood watch', (s) => { add(s, { karma: 3 }); webRepAdd(P(s), { name: 3 }); webUneaseAdd(s, -2); return 'You signed the clipboard. The block feels a little safer, or at least better watched.'; }],
    ['Stay home', (s) => { add(s, { happy: -1 }); return 'You watched the candles through the window.'; }],
  ],
});
EV('web_shunned', {
  ages: [16, 95], emoji: '🗣️', title: 'The talk of the town', cooldown: 4,
  when: (s) => free(s) && webRep(P(s)).scandal >= 25,
  w: (s) => 1 + webRep(P(s)).scandal / 30,
  text: 'The invitations have dried up, and conversations stop when you walk in. Everyone knows.',
  choices: [
    ['Own it in public', (s) => {
      if (chance(clamp(0.35 + skill(s, 'charisma') / 250, 0.15, 0.8))) { webRepAdd(P(s), { scandal: -10, name: 4 }); add(s, { karma: 2 }); return 'You said it out loud, before anyone else could. Respect came back slowly, then all at once.'; }
      webRepAdd(P(s), { scandal: 4 });
      return { text: 'You tried to explain yourself. It made a better story than the truth.', tone: 'bad' };
    }],
    ['Lie low', (s) => {
      for (const p of relPeople(s, ['friend', 'coworker', 'classmate']).slice(0, 2)) addRel(s, p.id, -8);
      const c = M(s).career;
      if (c && !JOBS[c.id].special && chance(0.2)) { fire(s, 'Your employer let you go quietly after the talk around town.'); return; }
      return 'You kept your head down. The town found someone else to talk about, eventually.';
    }],
    { label: 'Hire a lawyer to fight the rumors', sub: (s) => fmtMoney(price(s, 800)), fx: (s) => {
      const cost = price(s, 800);
      if (!pay(s, cost)) return cantAfford(cost);
      webRepAdd(P(s), { scandal: -6 });
      return 'Your lawyer sent a few letters. The worst of the talk stopped, or at least went quiet.';
    } },
  ],
});
EV('web_hush_money', {
  ages: [16, 95], emoji: '📞', title: 'A call from someone who knows', cooldown: 3, tags: ['mature'],
  when: (s) => free(s) && webMine(s).some((x) => x.sev >= 3 && webKnowers(s, x).some((k) => !isFamilyKind(relKind(s, k) || '') && (relOf(s, k) ? relOf(s, k).rel < 60 : true) && k !== romanticId(s))),
  ctx: (s) => {
    const secs = webMine(s).filter((x) => x.sev >= 3);
    const sec = pick(secs);
    const cands = webKnowers(s, sec).filter((k) => !isFamilyKind(relKind(s, k) || '') && k !== romanticId(s));
    if (!cands.length) return null;
    return { sid: sec.id, pid: pick(cands), amt: price(s, 2000 * sec.sev) };
  },
  text: (s, c) => `${nm(s, c.pid)} calls. Friendly, at first. Then: "I think about ${webLabel(s, webOf(s).secrets[c.sid] || { kind: 'npc_debt', subj: c.pid })} a lot. It would be a shame if it came up. I could use ${fmtMoney(c.amt)}."`,
  choices: [
    { label: 'Pay', sub: (s, c) => fmtMoney(c.amt), fx: (s, c) => {
      if (!pay(s, c.amt)) return cantAfford(c.amt);
      const sec = webOf(s).secrets[c.sid];
      if (sec) (sec.hush || (sec.hush = {}))[c.pid] = s.year + 3;
      return 'You paid. They said thank you, which was the worst part. The price will go up.';
    } },
    ['Refuse', (s, c) => {
      const sec = webOf(s).secrets[c.sid], to = sec && webPickTarget(s, c.pid, sec);
      if (sec && to && chance(0.6)) { webLearn(s, sec, to, c.pid); return { text: `${nm(s, c.pid)} hung up. By the weekend, someone else had heard.`, tone: 'bad' }; }
      return 'You hung up. Nothing happened. That is what you are telling yourself.';
    }],
    ['Threaten them', (s, c) => {
      if (chance(clamp(0.35 + skill(s, 'streetwise') / 250, 0.1, 0.8))) {
        if (relOf(s, c.pid)) relOf(s, c.pid).rel = Math.min(relOf(s, c.pid).rel, 8);
        const sec = webOf(s).secrets[c.sid];
        if (sec) (sec.hush || (sec.hush = {}))[c.pid] = s.year + 5;
        add(s, { karma: -4 });
        return { text: `${nm(s, c.pid)} heard something in your voice. They will not call again.`, tone: 'bad' };
      }
      return { text: `${nm(s, c.pid)} recorded the call. Now there are two problems.`, tone: 'bad' };
    }],
  ],
});
