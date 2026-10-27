/* =====================================================================
 * 63-cases.js — investigations. Every crime you commit leaves a case file,
 * a detective works it, and the year decides whether it goes cold, comes
 * back, or ends with a knock on the door. Replaces the old "caught" roll
 * and the cold-case lottery. Police casework (the other side) is 64-detective.js.
 *
 * s.inv = { seq, list: { id: Case }, dets: { 'cc:city': detectivePid } }
 *   Case = { id, crime, fam, year, last, cc, city, who, victim, vname,
 *            ev: { trace, wit, dig }, prog, status, det, links, cover, lay,
 *            st: { i, w }, sec, alibi, nick, assigned, npc }
 *     who     the culprit's person id (the player's, or null for a stranger)
 *     ev      what there is to find: physical traces, witnesses, digital records
 *     prog    0-100, how far the police are; every break adds 30-45, and 100 is an arrest
 *     status  open | cold | solved | closed
 *     links   other cases that look like the same hand; three make a series
 *     det     a detective, who is a person (kind 'detective') and keeps score
 *   p.det = { skill, obs, solved } on a detective: obs is how personal it gets
 *
 * invTick runs once a year (after webTick): for each case against you it
 * works out how likely a break is from the evidence, the detective and how
 * well you have covered your tracks, then fires an interview or a warrant
 * popup as the case closes in. The web (62-web.js) feeds it: a secret's
 * knowers are witnesses, and an exposed secret is a tip.
 * ===================================================================== */

const INV_CAP = 70;
// What a crime leaves behind: [traces, witnesses, digital records] when it is done, and
// its family, which is how cases get linked into a series.
const INV_PROFILE = {
  shoplift: [4, 25, 20, 'property'], pickpocket: [3, 30, 8, 'property'], vandalism: [8, 15, 10, 'property'],
  burglary: [25, 15, 12, 'property'], car_theft: [18, 20, 20, 'property'], arson: [30, 12, 8, 'property'],
  drugs: [10, 15, 25, 'drugs'], hacking: [3, 0, 60, 'fraud'], scam: [4, 25, 40, 'fraud'],
  embezzle: [5, 10, 55, 'fraud'], insider_trading: [2, 5, 70, 'fraud'], con: [3, 45, 45, 'fraud'],
  extortion: [4, 60, 30, 'fraud'], bank: [30, 55, 55, 'robbery'], heist: [28, 30, 50, 'robbery'],
  assault: [18, 60, 8, 'violent'], murder: [28, 18, 18, 'violent'],
};
const INV_DEFAULT = [12, 15, 10, 'other'];
const INV_NICK_A = ['Quiet', 'Harbor', 'Midnight', 'Gray', 'Paper', 'Lantern', 'Back-Door', 'Rooftop'];
const INV_NICK_B = ['Visitor', 'Ghost', 'Shadow', 'Collector', 'Hand', 'Stranger', 'Caller', 'Fox'];

Object.assign(KIN_LABELS, { detective: ['Detective', 'Detective', 'Detective'] });
REL_GROUPS.find((g) => g.id === 'other').kinds.push('detective');
Object.assign(REL_DECAY, { detective: 0 });

CRIMES.arson = { name: 'Set a fire', emoji: '🔥', minAge: 16, success: 0.5, loot: [0, 0], caught: 0.55, later: 0.08, sentence: [3, 15], conviction: 0.8, karma: -12, skill: 4, felony: true, verb: 'arson' };
CRIMES.insider_trading = { name: 'Trade on inside information', emoji: '📈', minAge: 21, needsJob: true, sk: { business: 35 }, skillKey: 'business', success: 0.5, loot: [20000, 400000], caught: 0.5, later: 0.1, sentence: [1, 8], conviction: 0.75, karma: -6, skill: 3, felony: true, verb: 'insider trading' };
CRIMES.con = { name: 'Run a romance scam', emoji: '💌', minAge: 18, sk: { charisma: 30 }, skillKey: 'charisma', success: 0.5, loot: [3000, 90000], caught: 0.5, later: 0.08, sentence: [1, 8], conviction: 0.75, karma: -14, skill: 4, felony: true, verb: 'romance fraud' };
Object.assign(CRIME_WIN, {
  arson: ['The {warehouse|house|garage|restaurant} went up in minutes. You were long gone before the sirens.'],
  insider_trading: ['A tip from the right person, a quiet trade, and a very good week.'],
  con: ['{Three|Four|A dozen} lonely people sent money to a person who does not exist.'],
});
for (const id of ['arson', 'insider_trading', 'con']) {
  defAction({
    id: 'crime_' + id, cat: 'crime', label: CRIMES[id].name, emoji: CRIMES[id].emoji,
    sub: () => (CRIMES[id].sentence[1] >= 8 ? 'Very risky' : 'Risky'),
    when: (s) => crimeOk(s, id),
    run: (s) => commitCrime(s, id),
  });
}

/* ---- the file ------------------------------------------------------------ */
function invOf(s) { return s.inv || (s.inv = { seq: 0, list: {}, dets: {} }); }
function invMine(s, filter) { return Object.values(invOf(s).list).filter((c) => c.who === s.playerId && (c.status === 'open' || c.status === 'cold') && (!filter || filter(c))); }
function invScore(c) { return 0.45 * c.ev.trace + 0.35 * c.ev.wit + 0.2 * c.ev.dig; }
function invDet(s, c) { const d = c.det && s.people[c.det]; return d && d.alive ? d : null; }
function invHeat(c) {
  if (c.status === 'cold') return 'Cold';
  return c.prog >= 70 ? 'Closing in' : c.prog >= 40 ? 'Hot' : c.prog >= 15 ? 'Warm' : 'Quiet';
}
function invVerb(c) { return CRIMES[c.crime] ? CRIMES[c.crime].verb : 'a crime'; }
function invEmoji(c) { return (CRIMES[c.crime] && CRIMES[c.crime].emoji) || { murder: '🔪', assault: '👊', extortion: '📞' }[c.crime] || '🗂️'; }
function invEvidence(s, c, d) {
  let up = false;
  for (const k of ['trace', 'wit', 'dig']) {
    if (!d[k]) continue;
    c.ev[k] = clamp100(c.ev[k] + d[k]);
    if (d[k] > 0) up = true;
  }
  if (up) {
    c.last = s.year;
    if (c.status === 'cold') invReopen(s, c, 'new evidence');
  }
}
// Someone tells the police. Takes a case or one of your secrets that points at one.
function invTip(s, x, amt) {
  const c = x && (x.kind ? invOf(s).list[x.case] : x);
  if (!c || c.status === 'solved' || c.status === 'closed') return false;
  invEvidence(s, c, { wit: amt || 20 });
  return true;
}
// Destroy evidence on whatever case a secret points at.
function invScrub(s, sec) {
  const c = sec && invOf(s).list[sec.case];
  if (c && c.status !== 'solved') invEvidence(s, c, { trace: -22, dig: -10 });
}

function invDetective(s, cc, city) {
  const reg = invOf(s).dets, key = cc + ':' + city;
  let d = reg[key] && s.people[reg[key]];
  if (!d || !d.alive) {
    d = makePerson(s, { age: randInt(34, 58), country: cc, city, job: { id: 'police', level: randInt(2, 4) } });
    d.edu = 'bachelor';
    d.det = { skill: randInt(40, 85), obs: 0, solved: 0 };
    reg[key] = d.id;
  }
  if (!M(s).rels[d.id]) setRel(s, d.id, 'detective', 8);
  return d;
}

function invOpen(s, crime, o) {
  o = o || {};
  const inv = invOf(s), prof = INV_PROFILE[crime] || INV_DEFAULT;
  const ids = Object.keys(inv.list);
  if (ids.length >= INV_CAP) {
    const rank = (id) => ({ solved: 0, closed: 0, cold: 1, open: 2 }[inv.list[id].status]) * 1e4 + inv.list[id].year;
    delete inv.list[ids.sort((a, b) => rank(a) - rank(b))[0]];
  }
  const k = o.messy ? 1.4 : 0.7, extra = o.ev || {};
  const roll = (b, add) => clamp100(Math.round(b * k * randFloat(0.6, 1.4)) + (add || 0));
  const me = P(s);
  const c = {
    id: 'i' + (++inv.seq).toString(36), crime, fam: prof[3], year: s.year, last: s.year,
    cc: o.cc || me.country, city: o.city || me.city,
    who: o.who === undefined ? s.playerId : o.who, victim: o.victim || null, vname: o.vname || null,
    ev: { trace: roll(prof[0], extra.trace), wit: roll(prof[1], extra.wit), dig: roll(prof[2], extra.dig) },
    prog: 0, status: 'open', det: null, links: [], cover: 0, st: {},
  };
  if (o.assigned) c.assigned = true;
  if (c.who === null) c.npc = { cunning: randInt(20, 80) };
  inv.list[c.id] = c;
  if (c.who === s.playerId) {
    c.det = invDetective(s, c.cc, c.city).id;
    invLink(s, c);
  }
  return c;
}

// The same hand: a case in the same family within six years joins the series, and the
// detective who had the first one gets the new one and takes it personally.
function invLink(s, c) {
  if (c.fam === 'other') return;
  const kin = Object.values(invOf(s).list).filter((o) => o.id !== c.id && o.who === c.who && o.fam === c.fam && (o.status === 'open' || o.status === 'cold') && s.year - o.year <= 6);
  if (!kin.length) return;
  for (const o of kin) {
    if (!o.links.includes(c.id)) o.links.push(c.id);
    if (!c.links.includes(o.id)) c.links.push(o.id);
    invEvidence(s, o, { trace: 6 }); // a pattern is a kind of evidence
    const od = invDet(s, o);
    if (od) od.det.obs = clamp100(od.det.obs + 8);
  }
  const first = kin.map((o) => invDet(s, o)).find((d) => d);
  if (first) { c.det = first.id; if (!M(s).rels[first.id]) setRel(s, first.id, 'detective', 8); }
  const series = [c].concat(kin);
  const nick = series.map((o) => o.nick).find((n) => n);
  if (nick) c.nick = nick;
  else if (series.length >= 3) {
    const n = `The ${pick(INV_NICK_A)} ${pick(INV_NICK_B)}`;
    for (const o of series) o.nick = n;
    webUneaseAdd(s, 2, c.cc + ':' + c.city);
    log(s, `📰 The press has a name for whoever is behind these: "${n}". The city is watching the news.`, 'bad');
  }
}

/* ---- the year: a break, a lead, a knock on the door ------------------------ */
function invCover(s, c) {
  let v = 18 + skill(s, 'streetwise') / 3 + (trait(s, 'cunning') ? 10 : 0) + (c.cover || 0) + (c.lay ? 15 : 0);
  if (c.cc !== P(s).country || c.city !== P(s).city) v += 25; // you left town
  return v;
}
function invTick(s) {
  const inv = invOf(s);
  for (const c of Object.values(inv.list)) {
    if (c.who !== s.playerId) continue;
    if (c.status === 'open') invCaseYear(s, c);
    else if (c.status === 'cold') invColdYear(s, c);
    else if (s.year - (c.solved || c.closed || c.year) > 10) delete inv.list[c.id];
    if (s.dead) return;
  }
  invDropDets(s);
  invWorldYear(s); // strangers' crimes, and the ones that hit people you know (64-detective.js)
}
function invCaseYear(s, c) {
  if (inPrison(s)) return; // the file waits
  const E = invScore(c), C = invCover(s, c), d = invDet(s, c), dt = d && d.det;
  const D = dt ? dt.skill + dt.obs * 0.5 : 45;
  const T = clamp(E * 1.1 + D * 0.5 - C * 0.8 + Math.min(4, c.links.length) * 10 + (c.crime === 'murder' ? 20 : 0), 0, 100);
  c.prog = clamp(c.prog - 2, 0, 100);
  if (chance(clamp(T / 150, 0, 0.5))) {
    c.prog = clamp(c.prog + randInt(30, 45), 0, 100);
    invEvidence(s, c, { [pick(['trace', 'wit', 'dig'])]: randInt(5, 12) });
  }
  // A friend who gave you an alibi may not hold up.
  if (c.alibi && chance(0.1)) {
    const f = s.people[c.alibi];
    c.alibi = null;
    c.prog = clamp(c.prog + 25, 0, 100);
    if (f) { log(s, `🗂️ ${f.first} changed their story to the police.`, 'bad'); if (relOf(s, f.id)) addRel(s, f.id, -15); }
  }
  c.ev.trace = clamp100(c.ev.trace - 2);
  c.ev.wit = clamp100(c.ev.wit - 3);
  c.cover = Math.max(0, (c.cover || 0) - 8);
  c.lay = false;
  if (c.prog >= 100) { invArrest(s, c); return; }
  if (c.prog < 25) c.st = {};
  if (!s.pending.some((p) => p.handler === 'invTalk' || p.handler === 'invWarrant')) {
    if (c.prog >= 70 && !c.st.w) { c.st.w = true; invWarrant(s, c); return; }
    if (c.prog >= 40 && !c.st.i) { c.st.i = true; invInterview(s, c); return; }
  }
  if (s.year - c.last >= 3 && c.prog < 70) invCold(s, c);
}
function invCold(s, c) {
  c.status = 'cold';
  c.coldYear = s.year;
  if (CRIMES[c.crime] && CRIMES[c.crime].felony) log(s, `🗂️ The ${invVerb(c)} case has gone cold. For now.`);
}
function invColdYear(s, c) {
  const limit = c.crime === 'murder' ? 999 : CRIMES[c.crime] && CRIMES[c.crime].felony ? 15 : 6;
  if (s.year - c.year > limit) { c.status = 'closed'; c.closed = s.year; return; }
  if (chance(0.015 + (c.ev.trace >= 30 ? 0.02 : 0) + (c.links.length ? 0.02 : 0))) invReopen(s, c, 'a new forensic technique');
}
function invReopen(s, c, why) {
  if (c.status !== 'cold') return;
  c.status = 'open';
  c.last = s.year;
  c.prog = Math.max(c.prog, 25);
  if (c.who === s.playerId && CRIMES[c.crime] && CRIMES[c.crime].felony) log(s, `🗂️ Detectives reopened the ${invVerb(c)} case, thanks to ${why}.`, 'bad');
}
function invArrest(s, c) {
  c.status = 'solved';
  c.solved = s.year;
  const d = invDet(s, c);
  if (d) { d.det.solved++; d.det.obs = 0; }
  // Everything in the series goes to trial together.
  for (const id of c.links) { const o = invOf(s).list[id]; if (o && (o.status === 'open' || o.status === 'cold')) { o.status = 'solved'; o.solved = s.year; if (o.crime !== c.crime) webFact(s, 'arrested', { crime: o.crime }); } }
  log(s, `🗂️ ${d ? 'Detective ' + d.last : 'The police'} finally had enough on the ${invVerb(c)} case${c.links.length ? ` and the ${nOf(c.links.length, 'other case')} like it` : ''}.`, 'bad');
  const r = arrest(s, CRIMES[c.crime] ? c.crime : 'burglary');
  if (r && r.text) log(s, r.text, 'bad');
}

/* ---- the detective at your door -------------------------------------------- */
function invInterview(s, c) {
  const d = invDet(s, c), cost = price(s, 1500), bribe = price(s, 5000);
  const friend = pickRel(s, ['friend', 'bestie']);
  const choices = [{ label: 'Keep calm and answer', value: 'talk' }, { label: 'Get a lawyer first', sub: fmtMoney(cost), value: 'lawyer', disabled: M(s).money < cost }];
  if (friend) choices.push({ label: `Have ${nm(s, friend)} vouch for you`, value: 'alibi' });
  choices.push({ label: 'Offer an envelope', sub: fmtMoney(bribe), value: 'bribe', tone: 'bad', disabled: M(s).money < bribe });
  popup(s, {
    emoji: '🗂️', title: 'A few questions', person: d ? d.id : null, handler: 'invTalk', ctx: { cid: c.id, cost, bribe, friend },
    text: `${d ? 'Detective ' + d.first + ' ' + d.last : 'A detective'} is at the door. "Routine. We're talking to everyone who was around when the ${invVerb(c)} happened. Mind if I ask where you were?"`,
    choices,
  });
}
onChoice('invTalk', (s, ctx, v) => {
  const c = invOf(s).list[ctx.cid];
  if (!c || c.status !== 'open') return { text: 'By the time you had decided, the detective had moved on.', quiet: true, nolog: true };
  const d = invDet(s, c), dt = d && d.det, E = invScore(c);
  if (v === 'talk') {
    if (chance(clamp(0.35 + skill(s, 'charisma') / 300 + (trait(s, 'cunning') ? 0.12 : 0) - E / 200, 0.08, 0.85))) { c.prog = clamp(c.prog - 12, 0, 100); return 'You were calm, specific and a little bored. The detective wrote it all down and left.'; }
    c.prog = clamp(c.prog + 15, 0, 100);
    invEvidence(s, c, { wit: 8 });
    return { text: 'Somewhere in your answers, a time did not line up. The detective did not say a word. That was worse.', tone: 'bad' };
  }
  if (v === 'lawyer') {
    if (!pay(s, ctx.cost)) return cantAfford(ctx.cost);
    c.prog = clamp(c.prog - 5, 0, 100);
    return 'Your lawyer spoke for you, and for about ten minutes. The detective left with nothing and a lot to think about.';
  }
  if (v === 'alibi') {
    const f = s.people[ctx.friend];
    if (!f || !f.alive) return 'The friend you had in mind was not around any more.';
    c.prog = clamp(c.prog - 18, 0, 100);
    c.alibi = f.id;
    const sec = c.sec && webOf(s).secrets[c.sec];
    if (sec && !sec.knows.includes(f.id)) sec.knows.push(f.id);
    return `${f.first} told the detective you were home all night. They did not ask why it mattered. They will.`;
  }
  if (v === 'bribe') {
    if (!pay(s, ctx.bribe)) return cantAfford(ctx.bribe);
    if (chance(clamp(0.35 - (dt ? dt.obs / 250 : 0), 0.05, 0.4))) {
      c.prog = clamp(c.prog - 30, 0, 100);
      webNewSecret(s, 'crime', s.playerId, { crime: 'bribery', sev: 3, ev: 30, knows: d ? [d.id] : [] });
      return { text: `${d ? d.first : 'The detective'} looked at the envelope for a long time, then put it in a pocket. You are not sure who owns whom now.`, tone: 'bad' };
    }
    c.prog = clamp(c.prog + 20, 0, 100);
    const r = arrest(s, 'bribery');
    return { text: `${d ? d.first : 'The detective'} did not take the envelope. ${r && r.text ? r.text : ''}`.trim(), tone: 'bad' };
  }
});
function invWarrant(s, c) {
  const d = invDet(s, c), cost = price(s, 3000);
  popup(s, {
    emoji: '📜', title: 'A search warrant', person: d ? d.id : null, handler: 'invWarrant', ctx: { cid: c.id, cost },
    text: `${d ? 'Detective ' + d.last : 'The police'} are at the door with a warrant. They are going through everything.`,
    choices: [{ label: 'Let them in', value: 'open' }, { label: 'Call your lawyer', sub: fmtMoney(cost), value: 'lawyer', disabled: M(s).money < cost }, { label: 'Get rid of what you can, fast', value: 'hide', tone: 'bad' }],
  });
}
onChoice('invWarrant', (s, ctx, v) => {
  const c = invOf(s).list[ctx.cid];
  if (!c || c.status !== 'open') return { text: 'The search found nothing worth the paperwork.', quiet: true, nolog: true };
  if (v === 'open') { c.prog = clamp(c.prog + 12, 0, 100); invEvidence(s, c, { trace: 10 }); return { text: 'They were polite, and thorough, and took boxes.', tone: 'bad' }; }
  if (v === 'lawyer') {
    if (!pay(s, ctx.cost)) return cantAfford(ctx.cost);
    c.prog = clamp(c.prog - 8, 0, 100);
    return 'Your lawyer made them wait in the hallway for an hour and photographed everything they took.';
  }
  if (chance(clamp(0.35 + skill(s, 'streetwise') / 250 + (trait(s, 'cunning') ? 0.1 : 0), 0.1, 0.8))) {
    invEvidence(s, c, { trace: -25 });
    c.prog = clamp(c.prog - 15, 0, 100);
    return 'By the time they reached the second floor, there was not much left to find.';
  }
  c.prog = clamp(c.prog + 22, 0, 100);
  invEvidence(s, c, { trace: 8 });
  return { text: 'They caught you with your hands full. Now there is obstruction on top of everything else.', tone: 'bad' };
});

/* ---- facts: what each crime leaves behind --------------------------------- */
function invLinkSecret(s, c, kind, crime) {
  const sec = webLive(s, (x) => x.subj === s.playerId && x.kind === kind && (kind === 'killing' || x.crime === crime)).pop();
  if (sec && !sec.case) { sec.case = c.id; c.sec = sec.id; }
}
const invCrimeFact = (messy) => (s, d) => {
  const cr = CRIMES[d.crime];
  if (!cr || (!cr.felony && chance(0.7))) return;
  const c = invOpen(s, d.crime, { messy });
  invLinkSecret(s, c, 'crime', d.crime);
  if (d.crime === 'arson') {
    webUneaseAdd(s, 1);
    if (chance(0.08)) { add(s, { karma: -30, happy: -10 }); log(s, '🔥 Somebody did not get out of the fire. You will carry that.', 'bad'); webFact(s, 'killed', { pid: null, how: 'accident' }); }
  }
};
onWebFact('crime_clean', invCrimeFact(false));
onWebFact('crime_messy', invCrimeFact(true));
onWebFact('killed', (s, d) => {
  const v = d.pid && s.people[d.pid];
  const c = invOpen(s, 'murder', { victim: d.pid, vname: v ? fullName(v) : null, ev: { poison: { trace: 0, dig: -5 }, accident: { trace: -8 }, hitman: { trace: -10, dig: 15 } }[d.how] || {} });
  invLinkSecret(s, c, 'killing');
});
// A fight leaves a victim who saw your face, and who may or may not call.
onWebFact('assault', (s, d) => {
  const v = s.people[d.pid];
  if (!v || !chance(isFamilyKind(relKind(s, d.pid) || '') ? 0.3 : 0.75)) return;
  invOpen(s, 'assault', { victim: d.pid, vname: fullName(v), ev: { wit: 35 } });
});
onWebFact('extorted', (s, d) => {
  const v = s.people[d.pid];
  if (!v || !chance(0.55)) return;
  invOpen(s, 'extortion', { victim: d.pid, vname: fullName(v), ev: { wit: 20 } });
});
// A conviction ends the case that convicted you.
onWebFact('arrested', (s, d) => {
  for (const c of invMine(s, (x) => x.status === 'open' && x.crime === d.crime && x.prog >= 60)) { c.status = 'solved'; c.solved = s.year; }
});

function invDropDets(s) {
  const reg = invOf(s).dets, live = new Set(invMine(s, (c) => c.status === 'open').map((c) => c.det));
  for (const k in reg) {
    const d = s.people[reg[k]];
    if (!d) { delete reg[k]; continue; }
    if (!live.has(d.id) && M(s).rels[d.id] && relKind(s, d.id) === 'detective') dropRel(s, d.id);
  }
}

/* ---- what you can do about it ----------------------------------------------- */
const invOpenMine = (s) => free(s) && A(s) >= 12 && invMine(s, (c) => c.status === 'open').length > 0;
defAction({
  id: 'inv_laylow', cat: 'cases', label: 'Lay low', emoji: '🛋️', desc: 'Stay quiet, stay home, change nothing.',
  when: (s) => invOpenMine(s) && !count(s, 'laylow'),
  run: (s) => {
    bump(s, 'laylow');
    for (const c of invMine(s, (x) => x.status === 'open')) c.lay = true;
    add(s, { happy: -2 });
    return 'You stopped going out, stopped spending, and stopped answering the phone. It is a very boring way to be safe.';
  },
});
defAction({
  id: 'inv_flee', cat: 'cases', label: 'Skip town', emoji: '🚚', desc: 'Start over in another city. The file may follow.',
  when: (s) => invOpenMine(s) && !inPrison(s),
  sub: (s) => fmtMoney(price(s, 2500)),
  run: (s) => {
    const cc = P(s).country, here = P(s).city;
    const cities = shuffle(COUNTRIES[cc].cities.filter((x) => x !== here)).slice(0, 3);
    if (!cities.length) return { text: 'There is nowhere else to go.', nolog: true };
    popup(s, { emoji: '🚚', title: 'Skip town', text: 'Where to?', handler: 'invFlee', ctx: { cc, cost: price(s, 2500) }, choices: cities.map((x) => ({ label: x, value: x })).concat([{ label: 'Stay', value: null }]) });
  },
});
onChoice('invFlee', (s, ctx, city) => {
  if (!city) return;
  if (!pay(s, ctx.cost)) return cantAfford(ctx.cost);
  const from = P(s).city;
  const dep = leaveRental(s, 'moved');
  M(s).housing = { type: 'homeless', assetId: null, rent: 0, name: '' };
  if (M(s).career) leaveJob(s, 'moved');
  const comes = relocate(s, ctx.cc, city);
  for (const c of invMine(s, (x) => x.status === 'open')) {
    if (!chance(c.links.length ? 0.6 : 0.35)) c.prog = clamp(c.prog - 20, 0, 100);
  }
  add(s, { happy: -3 });
  openRentals(s, `Welcome to ${city}. Nobody here knows your name. Find a place to live.`);
  return `You left ${from} in the middle of the night. ${dep} ${comes}`.trim();
});

/* ---- registration ---------------------------------------------------------------- */
ACT_CATS.splice(ACT_CATS.findIndex((c) => c.id === 'crime'), 0, { id: 'cases', name: 'Case files', emoji: '🗂️' });
