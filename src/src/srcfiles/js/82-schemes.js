/* =====================================================================
 * 82-schemes.js — crime that runs for years. Three schemes, each a thing
 * you start, tend every year and one day have to end:
 *
 *   Ponzi scheme   An investment club, a private fund or a "yield" platform. New money pays the old
 *                  money's returns and a little goes into your pocket. The people who put money in are
 *                  real people from your life. It ends when you wind it down honestly, run, or it falls
 *                  over (a shortfall, an audit, the ledger getting out).
 *   Long con       A romance, a business partner or a fake charity worked over years on one mark. Each
 *                  year you decide how hard to lean; suspicion builds, and the mark's family notices.
 *   Blackmail ring Behind Mature. Dig for dirt on the people you know, squeeze what you hold (the web's
 *                  secrets, 62-web.js), run a crew. Every squeeze is a chance someone goes to the police.
 *
 * M(s).scheme = { ponzi, con, ring, done: [{ kind, year, how, amt }] }
 *   ponzi  null | { style, name, since, owed, pot, skim, investors, heat, marks: [{ pid, amt }], sec }
 *   con    null | { style, mark: pid | null, since, take, trust, susp, sec }
 *   ring   null | { since, crew, take, heat, cool: { secretId: year } }
 *
 * Built on the case-file engine (63-cases.js: a collapse opens a case against you, with every investor a
 * witness), the web (62-web.js: a 'fraud' and a 'long_con' secret that leak, victims who talk, scandal) and the
 * press (79-news.js). Yearly turns come through onYear (25-ageup.js).
 * ===================================================================== */

CRIMES.ponzi = { name: 'Run an investment scheme', emoji: '📉', minAge: 21, sentence: [6, 25], conviction: 0.85, karma: -18, felony: true, verb: 'securities fraud' }; // not a Crime-menu crime
CRIMES.blackmail = { name: 'Blackmail', emoji: '✉️', minAge: 16, sentence: [3, 12], conviction: 0.8, karma: -14, felony: true, verb: 'blackmail' };
INV_PROFILE.ponzi = [2, 70, 80, 'fraud'];
INV_PROFILE.blackmail = [3, 45, 40, 'fraud'];
Object.assign(KIN_LABELS, { mark: ['Mark', 'Mark', 'Mark'] });
REL_GROUPS.find((g) => g.id === 'other').kinds.push('mark');
Object.assign(REL_DECAY, { mark: 0 });
Object.assign(NEWS_T, {
  scheme: [
    ['{{what}} collapses, investors lose {{amt}}', 'It was called {{co}}. Investors say they were promised {{rate}} a year, and that "everyone" they knew was in it. {{det}} would say only that the case was "active."'],
    ['"It was too good to be true": {{co}} unravels', 'Hundreds of people are asking where their money went. Police have opened an inquiry, and a number of lawyers have opened offices.'],
  ],
  con: [
    ['Police warn of a "long game" fraud in {{city}}', 'A resident told officers they had spent years in what they thought was a relationship, or a partnership, and had lost {{amt}}. Investigators are "looking at a pattern."'],
  ],
  ring: [
    ['Blackmail ring: police ask victims to come forward', 'Detectives say they believe a person in {{city}} has been collecting people\'s secrets and selling them back. "You are not in trouble," a spokesperson said. "You are a victim."'],
  ],
});
function schemeOf(s) { return M(s).scheme || (M(s).scheme = { ponzi: null, con: null, ring: null, done: [] }); }
function pzOf(s) { return schemeOf(s).ponzi; }
function conOf(s) { return schemeOf(s).con; }
function ringOf(s) { return schemeOf(s).ring; }
function ringOn() { return tagsOn(['mature']); }
function schemeEnd(s, kind, how, amt) { const d = schemeOf(s); d.done.push({ kind, year: s.year, how, amt: amt || 0 }); if (d.done.length > 12) d.done.shift(); }

/* ---- the ponzi scheme -------------------------------------------------------------------------------------- */
const PZ_STYLES = {
  club: { label: 'An investment club', emoji: '🤝', rate: 0.10, raise: 120000, cap: 1500000, blurb: 'People who trust you, and the people they tell.' },
  fund: { label: 'A private growth fund', emoji: '📈', rate: 0.16, raise: 600000, cap: 20000000, blurb: 'Slides, a website and a very confident voice.' },
  platform: { label: 'A "yield" platform', emoji: '💹', rate: 0.28, raise: 3000000, cap: 150000000, blurb: 'Fast, viral and brittle.' },
};
const PZ_NAMES_A = ['Keystone', 'Harbor', 'Northgate', 'Aurora', 'Summit', 'Evergreen', 'Cobalt', 'Meridian', 'Lantern', 'Redwood'];
const PZ_NAMES_B = ['Partners', 'Capital', 'Yield', 'Growth Fund', 'Holdings', 'Ventures', 'Trust', 'Group'];
const pzCap = (s, st) => price(s, st.cap);
defSecretKind('fraud', {
  sev: 4, icon: '📉',
  mine: (s, sec) => `the truth about ${sec.note || 'your fund'}`,
  rumor: (s, sec) => `${webName(s, sec.subj)}'s fund is not what it seems`,
  tipOdds: (s) => { const z = pzOf(s); return z ? 0.01 + z.heat / 700 : 0; },
  expose: (s) => { if (pzOf(s)) { pzCollapse(s, 'exposed'); return ' The investors have heard.'; } return ''; },
});
function pzStart(s, style) {
  const st = PZ_STYLES[style], cost = price(s, 3000);
  if (!st || pzOf(s) || !free(s) || !pay(s, cost)) return;
  const raise0 = price(s, Math.round(st.raise * 0.15 * (1 + skill(s, 'charisma') / 100)));
  const circle = relPeople(s, ['friend', 'bestie', 'coworker', 'sibling', 'neighbor', 'parent', 'classmate']).filter((p) => ageOf(s, p) >= 21);
  const marks = [];
  while (marks.length < Math.min(4, circle.length)) { const p = pick(circle.filter((x) => !marks.some((m) => m.pid === x.id))); if (!p) break; marks.push({ pid: p.id, amt: Math.round(raise0 / 8) }); }
  const name = `${pick(PZ_NAMES_A)} ${pick(PZ_NAMES_B)}`;
  const z = schemeOf(s).ponzi = { style, name, since: s.year, owed: raise0, pot: Math.round(raise0 * 0.92), skim: 0, investors: randInt(6, 16), heat: 6, marks, sec: null };
  z.sec = webNewSecret(s, 'fraud', s.playerId, { ev: 12, sev: 4, note: name }).id;
  addSkill(s, 'business', 2);
  tally(s, 'schemesStarted');
  return z;
}
function pzTurn(s) {
  const z = pzOf(s), st = PZ_STYLES[z.style];
  if (!free(s) || A(s) < 18) { if (inPrison(s)) pzCollapse(s, 'jailed'); return; }
  // What the year brings: new money, and the returns promised to the old.
  const saturated = z.owed > pzCap(s, st);
  const flow = price(s, Math.round(st.raise * randFloat(0.5, 1.3) * (1 + skill(s, 'charisma') / 120) * clamp(webRep(P(s)).name / 60, 0.6, 1.4) * (saturated ? 0.25 : 1)));
  const due = Math.round(z.owed * st.rate);
  z.turn = { flow, due, saturated };
  const room = Math.round(z.pot + flow - due);
  const need = Math.max(0, z.owed - z.pot), honest = M(s).money >= need; // winding down stops the new money
  popup(s, {
    emoji: st.emoji, title: z.name, handler: 'pzTurn', ctx: { flow, due },
    text: `${z.name} has ${z.investors} investors and owes them ${fmtMoney(z.owed)}, and this year's promised returns come to ${fmtMoney(due)}. ${saturated ? 'New money has dried up: everyone who would invest already has. ' : `New money is coming in: about ${fmtMoney(flow)}. `}${room < 0 ? 'There is not enough to pay everyone this year.' : 'There is enough to cover this year, for now.'} ${z.heat >= 60 ? 'You can feel eyes on it.' : ''}`.trim(),
    choices: [
      { label: 'Pay the returns, skim a little', value: 'steady', sub: `You take ${fmtMoney(Math.round(flow * 0.05))}` },
      { label: 'Skim big', value: 'greedy', sub: `You take ${fmtMoney(Math.round(flow * 0.25))} · more risk`, tone: 'bad' },
      { label: 'Recruit hard', value: 'recruit', sub: 'Nearly twice the new money · more risk', tone: 'bad' },
      { label: 'Wind it down, pay everyone back', value: 'wind', sub: honest ? (need ? `You make up ${fmtMoney(need)} yourself` : 'There is enough to pay everyone') : `You are ${fmtMoney(need - M(s).money)} short`, disabled: !honest },
      { label: 'Take the money and run', value: 'run', tone: 'bad' },
    ],
  });
}
onChoice('pzTurn', (s, ctx, v) => {
  const z = pzOf(s);
  if (!z || !free(s)) return;
  const st = PZ_STYLES[z.style];
  if (v === 'wind') {
    const need = Math.max(0, z.owed - z.pot);
    if (M(s).money < need) return { text: 'You did not have enough to make everyone whole.', tone: 'bad' };
    M(s).money -= need;
    for (const m of z.marks) { const p = s.people[m.pid]; if (p && p.alive) { p.money += Math.round(m.amt * 1.1); if (relOf(s, p.id)) addRel(s, p.id, 4); } }
    const sec = webOf(s).secrets[z.sec];
    if (sec) delete webOf(s).secrets[z.sec];
    schemeOf(s).ponzi = null;
    schemeEnd(s, 'ponzi', 'wound down', z.owed);
    add(s, { karma: 8, happy: 3 });
    webRepAdd(P(s), { scandal: 2, name: -2 });
    return { text: `${z.name} closed. You paid back every investor, with something on top, out of your own pocket. Some of them thanked you. A few of them wondered, quietly, what it had been.`, tone: 'good', emoji: st.emoji };
  }
  if (v === 'run') {
    const take = Math.round(z.pot * 0.8);
    add(s, { money: take, happy: -4 });
    z.skim += take;
    z.fled = true;
    pzCollapse(s, 'run');
    return;
  }
  const mul = { steady: [0.05, 0, 3], greedy: [0.25, 10, 5], recruit: [0.08, 8, 4] }[v] || [0.05, 0, 3];
  const flow = v === 'recruit' ? Math.round(ctx.flow * 1.7) : ctx.flow;
  const skim = Math.round(flow * mul[0]);
  add(s, { money: skim, karma: -2 });
  z.skim += skim;
  z.pot += flow - skim - ctx.due;
  z.owed += flow;
  z.investors += Math.max(1, Math.round(flow / Math.max(1, price(s, 40000))));
  z.heat = clamp100(z.heat + mul[1] + mul[2] + Math.round((z.owed / pzCap(s, st)) * 8) - (v === 'steady' ? 2 : 0));
  const sec = webOf(s).secrets[z.sec];
  if (sec) sec.ev = clamp100(sec.ev + Math.round(z.heat / 10));
  // Somebody close to you puts their savings in.
  if (chance(0.4) && z.marks.length < 8) {
    const cand = relPeople(s, ['friend', 'bestie', 'coworker', 'sibling', 'neighbor', 'classmate']).filter((p) => ageOf(s, p) >= 21 && !z.marks.some((m) => m.pid === p.id));
    const p = pick(cand);
    if (p) z.marks.push({ pid: p.id, amt: Math.round(Math.max(p.money * 0.4, price(s, 3000))) });
  }
  if (z.pot < 0) { pzCollapse(s, 'shortfall'); return; }
  if ((sec && sec.ev >= 85) || chance(z.heat / 300)) { pzCollapse(s, z.heat >= 55 ? 'audit' : 'exposed'); return; }
  return { text: `${z.name} paid out ${fmtMoney(ctx.due)} in returns this year, and took in ${fmtMoney(flow)}. Everyone is happy. That is the problem with it.`, tone: '', emoji: st.emoji };
});
function pzYear(s) {
  const z = pzOf(s);
  if (!z) return;
  if (s.pending.some((p) => p.handler === 'pzTurn')) return;
  z.marks = z.marks.filter((m) => s.people[m.pid] && s.people[m.pid].alive);
  pzTurn(s);
}
function pzCollapse(s, how) {
  const z = pzOf(s);
  if (!z) return;
  const st = PZ_STYLES[z.style];
  schemeOf(s).ponzi = null;
  schemeEnd(s, 'ponzi', how, z.owed);
  const sec = webOf(s).secrets[z.sec];
  if (sec) { sec.out = true; sec.outYear = s.year; }
  // The people who put money in are real, and they lost it.
  let lost = 0;
  for (const m of z.marks) {
    const p = s.people[m.pid];
    if (!p || !p.alive) continue;
    lost += m.amt;
    p.money = Math.max(0, p.money - m.amt);
    if (relOf(s, p.id)) { addRel(s, p.id, -45); if (chance(0.5)) setRel(s, p.id, 'enemy', 4); }
    if (chance(0.35) && !webLive(s, (x) => x.subj === p.id).length) webNewSecret(s, 'npc_debt', p.id, { ev: 25, knows: [s.playerId] });
    webFact(s, 'victim', { pid: p.id, harm: 'money' });
  }
  webUneaseAdd(s, 2 + Math.round(z.owed / pzCap(s, st) * 3));
  webRepAdd(P(s), { scandal: 16, name: -12 });
  tally(s, 'schemesCollapsed');
  const co = z.name;
  newsPost(s, 'scheme', { what: co, co, amt: fmtMoney(z.owed), rate: Math.round(st.rate * 100) + '%', det: 'The lead detective' }, true);
  // A case, with every investor a witness; running makes it harder to close.
  const c = invOpen(s, 'ponzi', { messy: true, ev: { wit: Math.min(40, z.investors) } });
  c.prog = clamp(30 + (how === 'audit' ? 25 : 0) + (how === 'run' ? 10 : 0), 0, 90);
  if (sec) { sec.case = c.id; c.sec = sec.id; }
  if (how === 'run') { c.lay = true; pzFlee(s); }
  const text = { shortfall: 'There was not enough to pay the returns, and everyone found out in the same week.', audit: 'Regulators froze the accounts and opened the books.', exposed: 'The truth got out, and then it was everywhere.', run: 'You took what you could and left the city before anyone noticed the accounts were empty.', jailed: 'With you in custody, nobody was left to keep the music playing.' }[how];
  log(s, `${st.emoji} ${co} collapsed. ${text} Investors lost ${fmtMoney(z.owed)}.`, 'bad');
  if (how !== 'run' && how !== 'jailed' && chance({ audit: 0.5, shortfall: 0.3, exposed: 0.4 }[how] || 0.3) && !inPrison(s)) { const r = arrest(s, 'ponzi'); if (r && r.text) log(s, r.text, 'bad'); }
}
function pzFlee(s) {
  const cities = country(s).cities.filter((c) => c !== P(s).city);
  if (!cities.length || typeof relocate !== 'function') return;
  const to = pick(cities);
  relocate(s, P(s).country, to);
  cityArrive(s);
  if (M(s).housing.type === 'rent') M(s).housing = { type: 'rent', assetId: null, rent: M(s).housing.rent, name: 'A rented room', rtype: 'apt1' };
  log(s, `🚪 You left for ${to} the same night, under your own name and nobody else's business.`, 'bad');
}
// A conviction takes some of it back.
onWebFact('arrested', (s, d) => {
  if (d.crime !== 'ponzi') return;
  const back = Math.min(Math.max(0, M(s).money), Math.round(Math.max(0, M(s).money) * 0.5));
  M(s).money -= back;
  if (back > 0) log(s, `⚖️ The court ordered ${fmtMoney(back)} paid back to the people you took it from.`, 'bad');
});
defAction({
  id: 'scheme_ponzi', cat: 'schemes', label: 'Start an investment scheme', emoji: '📉', desc: 'Other people\'s money, a promise and a very good smile. It ends one way or another.',
  when: (s) => free(s) && A(s) >= 21 && !pzOf(s) && M(s).money >= price(s, 3000),
  sub: (s) => `Set-up ${fmtMoney(price(s, 3000))}`,
  run: (s) => {
    popup(s, {
      emoji: '📉', title: 'What do you call it?', text: 'The only thing every one of these needs is people who want to believe.', handler: 'pzStart',
      choices: Object.keys(PZ_STYLES).map((id) => ({ label: `${PZ_STYLES[id].emoji} ${PZ_STYLES[id].label}`, value: id, sub: `${PZ_STYLES[id].blurb} Promises ${Math.round(PZ_STYLES[id].rate * 100)}% a year.` })).concat([{ label: 'Never mind', value: null }]),
    });
  },
});
onChoice('pzStart', (s, ctx, id) => {
  if (!id) return;
  const z = pzStart(s, id);
  if (!z) return { text: 'You could not get it off the ground.', tone: 'bad', nolog: true };
  return { text: `${z.name} is open for business. ${z.marks.length ? `${listJoin(z.marks.map((m) => nm(s, m.pid)))} ${z.marks.length === 1 ? 'is' : 'are'} in already.` : 'Nobody you know is in yet.'} It will ask you for a decision every year.`, emoji: PZ_STYLES[id].emoji };
});

/* ---- the long con -------------------------------------------------------------------------------------------- */
const CON_STYLES = {
  romance: { label: 'A romance', emoji: '💌', blurb: 'A lonely person with money, and a very attentive partner.', mark: true },
  partner: { label: 'A business partner', emoji: '🤝', blurb: 'Someone who wants in on something that does not exist.', mark: true },
  charity: { label: 'A charity that is not one', emoji: '🎗️', blurb: 'A cause, a logo, and donors who do not check.', mark: false },
};
defSecretKind('long_con', {
  sev: 4, icon: '💌',
  mine: (s, sec) => (sec.other && s.people[sec.other] ? `what you have been doing to ${webName(s, sec.other)}` : 'the charity that is not one'),
  rumor: (s, sec) => `${webName(s, sec.subj)} has been working someone for years`,
  expose: (s) => { conReport(s, 'exposed'); return ' The police have a name.'; },
});
function conStart(s, style) {
  const K = CON_STYLES[style];
  if (!K || conOf(s) || !free(s)) return;
  let mark = null;
  if (K.mark) {
    mark = makeAdultNear(s, { minAge: 38, maxAge: 72 });
    mark.money = price(s, randInt(120000, 800000));
    setRel(s, mark.id, 'mark', style === 'romance' ? 45 : 40);
  }
  const c = schemeOf(s).con = { style, mark: mark ? mark.id : null, since: s.year, take: 0, trust: 40, susp: 0, sec: null };
  c.sec = webNewSecret(s, 'long_con', s.playerId, { other: mark ? mark.id : null, ev: 10, sev: 4 }).id;
  tally(s, 'conStarted');
  return c;
}
function conTurn(s) {
  const c = conOf(s), K = CON_STYLES[c.style], m = c.mark && s.people[c.mark];
  if (!free(s)) return;
  if (K.mark && (!m || !m.alive)) { schemeOf(s).con = null; return; }
  const cap = m ? Math.max(0, m.money) : price(s, 40000);
  popup(s, {
    emoji: K.emoji, title: K.label, handler: 'conTurn', ctx: {},
    text: m ? `${m.first} has ${fmtMoney(cap)} left and trusts you ${c.trust >= 70 ? 'completely' : c.trust >= 45 ? 'a great deal' : 'less than before'}. ${c.susp >= 55 ? `Lately ${pr(m).he} has been asking more questions than ${pr(m).he} used to.` : 'Nothing has been said. Nothing has been noticed.'}` : `The cause is bringing in donors, and nobody has asked for the books. ${c.susp >= 55 ? 'A local reporter has.' : ''}`,
    choices: [
      { label: 'Keep it warm', value: 'warm', sub: 'Trust up, suspicion down, a little money' },
      { label: 'Ask for a "loan"', value: 'loan', sub: `Up to ${fmtMoney(Math.round(cap * 0.2))}` },
      { label: 'Push a "venture"', value: 'venture', sub: `Up to ${fmtMoney(Math.round(cap * 0.5))} · a lot of suspicion`, tone: 'bad' },
      { label: 'End it clean and disappear', value: 'end', sub: 'You keep what you have' },
      { label: 'Come clean', value: 'clean', sub: 'Give some back. Karma, and a lawyer\'s letter', tone: 'good' },
    ],
  });
}
onChoice('conTurn', (s, ctx, v) => {
  const c = conOf(s);
  if (!c || !free(s)) return;
  const K = CON_STYLES[c.style], m = c.mark && s.people[c.mark];
  const cap = m ? Math.max(0, m.money) : price(s, 40000);
  const take = (frac, susp, trust) => {
    const amt = Math.round(Math.min(cap, price(s, 40000 * 20)) * frac * (0.6 + c.trust / 120));
    if (m) m.money = Math.max(0, m.money - amt);
    c.take += amt; add(s, { money: amt, karma: -3 });
    c.susp = clamp100(c.susp + susp + (cap <= 0 ? 10 : 0));
    c.trust = clamp100(c.trust + trust);
    if (m && relOf(s, m.id)) addRel(s, m.id, trust > 0 ? 6 : -4);
    return amt;
  };
  if (v === 'warm') { const amt = take(0.02, -12, 12); addSkill(s, 'charisma', 1); return `${m ? `${m.first}` : 'The donors'} felt looked after, which was the idea.${amt ? ` It paid ${fmtMoney(amt)}.` : ''}`; }
  if (v === 'loan') { const amt = take(0.2, 10, -4); return { text: `${m ? m.first : 'A donor'} did not ask what it was for. ${fmtMoney(amt)} changed hands.`, tone: '' }; }
  if (v === 'venture') { const amt = take(0.5, 25, -10); return { text: `It was a big number, and ${m ? m.first : 'the board'} signed anyway. ${fmtMoney(amt)} moved. You can feel how much that cost.`, tone: 'bad' }; }
  if (v === 'end') { conEnd(s, 'ended clean'); if (m) { if (relOf(s, m.id)) setRel(s, m.id, 'enemy', 0); } return { text: 'You stopped answering, and then the number stopped working. It was clean. It was also a person.', tone: 'bad' }; }
  if (v === 'clean') {
    const back = Math.round(c.take * 0.4);
    if (back > M(s).money) return { text: 'You did not have what you would have had to give back.', tone: 'bad' };
    M(s).money -= back;
    if (m) { m.money += back; if (relOf(s, m.id)) addRel(s, m.id, 10); }
    conEnd(s, 'confessed');
    add(s, { karma: 12, happy: 2 });
    webRepAdd(P(s), { scandal: 4, name: -3 });
    return { text: `${m ? `${m.first} was quiet for a long time. Then a lawyer's letter came.` : 'You closed the fund and said what it had been.'} It cost ${fmtMoney(back)}. It also cost less than the alternative.`, tone: 'good' };
  }
});
function conEnd(s, how) {
  const c = conOf(s);
  if (!c) return;
  const sec = webOf(s).secrets[c.sec];
  if (sec && how !== 'reported') delete webOf(s).secrets[c.sec];
  schemeOf(s).con = null;
  schemeEnd(s, 'con', how, c.take);
}
function conReport(s, how) {
  const c = conOf(s);
  if (!c) return;
  const m = c.mark && s.people[c.mark];
  const k = invOpen(s, 'con', { messy: true, ev: { wit: 35 } });
  k.prog = clamp(35 + (how === 'exposed' ? 10 : 0), 0, 90);
  const sec = webOf(s).secrets[c.sec];
  if (sec) { sec.out = true; sec.outYear = s.year; sec.case = k.id; k.sec = sec.id; }
  webRepAdd(P(s), { scandal: 10, name: -8 });
  newsPost(s, 'con', { amt: fmtMoney(c.take) }, true);
  if (m && relOf(s, m.id)) setRel(s, m.id, 'enemy', 0);
  webFact(s, 'victim', { pid: m ? m.id : null, harm: 'money' });
  log(s, `${CON_STYLES[c.style].emoji} ${m ? m.first : 'Someone'} went to the police about what you took: ${fmtMoney(c.take)}. A detective has your name.`, 'bad');
  schemeEnd(s, 'con', how === 'exposed' ? 'exposed' : 'reported', c.take);
  schemeOf(s).con = null;
}
function conYear(s) {
  const c = conOf(s);
  if (!c || !free(s)) return;
  if (s.pending.some((p) => p.handler === 'conTurn' || p.handler === 'conFamily')) return;
  const K = CON_STYLES[c.style], m = c.mark && s.people[c.mark];
  if (K.mark && (!m || !m.alive)) { schemeOf(s).con = null; return; }
  c.susp = clamp100(c.susp + 4 + (m && m.money <= 0 ? 12 : 0));
  const sec = webOf(s).secrets[c.sec];
  if (sec) sec.ev = clamp100(sec.ev + Math.round(c.susp / 12));
  if (c.susp >= 100) { conReport(s, 'reported'); return; }
  if (c.susp >= 70 && m && !c.family) {
    c.family = true;
    popup(s, {
      emoji: '👪', title: 'The family is asking', handler: 'conFamily', person: m.id, ctx: {},
      text: `${m.first}'s ${m.gender === 'm' ? 'daughter' : 'son'} called you. "I just want to understand where all the money went." It was polite. It was not a question.`,
      choices: [{ label: 'Charm them', value: 'charm', sub: 'Charisma' }, { label: 'Pull back from the mark', value: 'pull', sub: 'Safer, and slower' }, { label: 'Cut them off', value: 'cut', tone: 'bad' }],
    });
    return;
  }
  conTurn(s);
}
onChoice('conFamily', (s, ctx, v) => {
  const c = conOf(s);
  if (!c) return;
  if (v === 'charm') {
    if (chance(clamp(0.35 + skill(s, 'charisma') / 250, 0.1, 0.8))) { c.susp = clamp100(c.susp - 25); return 'You were warm and specific and a little hurt. They apologized for asking.'; }
    c.susp = clamp100(c.susp + 15);
    return { text: 'You said all the right things. They wrote down the dates.', tone: 'bad' };
  }
  if (v === 'pull') { c.susp = clamp100(c.susp - 15); c.trust = clamp100(c.trust - 15); return 'You went quiet for a season. It cooled things down, and cost you the warmth you had built.'; }
  c.susp = clamp100(c.susp + 10);
  c.family = false;
  return { text: 'You stopped taking their calls. It did not make the question go away.', tone: 'bad' };
});
defAction({
  id: 'scheme_con', cat: 'schemes', label: 'Start a long con', emoji: '💌', desc: 'Years of patience on one mark. It pays better than anything quick, and it ends worse.',
  when: (s) => free(s) && A(s) >= 21 && !conOf(s) && skill(s, 'charisma') >= 15,
  sub: () => 'Needs charm',
  run: (s) => {
    popup(s, {
      emoji: '💌', title: 'Who is the mark?', text: 'The first rule of a long game is that the other person never thinks it is one.', handler: 'conStart',
      choices: Object.keys(CON_STYLES).map((id) => ({ label: `${CON_STYLES[id].emoji} ${CON_STYLES[id].label}`, value: id, sub: CON_STYLES[id].blurb })).concat([{ label: 'Never mind', value: null }]),
    });
  },
});
onChoice('conStart', (s, ctx, id) => {
  if (!id) return;
  const c = conStart(s, id);
  if (!c) return { text: 'You could not get it started.', tone: 'bad', nolog: true };
  const m = c.mark && s.people[c.mark];
  return { text: m ? `You met ${fullName(m)} at ${pick(['a fundraiser', 'a hotel bar', 'a friend of a friend\'s party', 'a church supper', 'a conference'])}. ${cap(pr(m).he)} is easy to talk to. That is the whole job.` : 'You registered the charity, designed the logo and wrote the first appeal. It ran itself, for a while.', emoji: CON_STYLES[id].emoji };
});

/* ---- the blackmail ring (Mature) ----------------------------------------------------------------------------- */
defSecretKind('blackmail_ring', {
  sev: 4, icon: '✉️',
  mine: () => 'the files you keep on other people',
  rumor: (s, sec) => `${webName(s, sec.subj)} keeps files on people`,
  tipOdds: (s) => { const r = ringOf(s); return r ? 0.01 + r.heat / 900 : 0; },
  expose: (s) => { if (ringOf(s)) { ringBusted(s, 'exposed'); return ' The files were found.'; } return ''; },
});
// What you hold: secrets about other people that you are one of the people who know.
function ringFiles(s, r) { return webHeard(s).filter((x) => !(r.cool && r.cool[x.id] >= s.year)); }
function ringStart(s) {
  if (ringOf(s) || !free(s) || !ringOn()) return;
  const r = schemeOf(s).ring = { since: s.year, crew: 0, take: 0, heat: 0, cool: {}, sec: null };
  r.sec = webNewSecret(s, 'blackmail_ring', s.playerId, { ev: 10, sev: 4 }).id;
  tally(s, 'ringStarted');
  return r;
}
defAction({
  id: 'ring_start', cat: 'schemes', label: 'Start keeping files', emoji: '🗂️', desc: 'You hear things. Start writing them down, and decide what they are worth.', tags: ['mature'],
  when: (s) => free(s) && A(s) >= 18 && !ringOf(s) && (webHeard(s).length >= 1 || skill(s, 'streetwise') >= 25),
  run: (s) => { const r = ringStart(s); return r ? { text: 'You bought a notebook and started a habit. It is just a list, for now. It is a list of people.', emoji: '🗂️' } : undefined; },
});
defAction({
  id: 'ring_work', cat: 'schemes', label: 'Work the files', emoji: '✉️', desc: 'Squeeze what you hold, dig for more, or hire help.', tags: ['mature'],
  when: (s) => free(s) && !!ringOf(s) && !count(s, 'ring_work'),
  sub: (s) => { const r = ringOf(s); return `${nOf(ringFiles(s, r).length, 'file')} · crew of ${r.crew} · heat ${r.heat}`; },
  run: (s) => {
    const r = ringOf(s), files = ringFiles(s, r).sort((a, b) => b.sev - a.sev).slice(0, 4), dig = price(s, 1200), hire = price(s, 4000);
    const choices = files.map((x) => ({ label: `Squeeze ${webName(s, x.subj)}`, sub: `${cap(webRumor(s, x)).slice(0, 60)} · about ${fmtMoney(Math.min(Math.max(0, (s.people[x.subj] || {}).money || 0), price(s, 1500 + 500 * x.sev)))}`, value: 'f:' + x.id, tone: 'bad' }));
    choices.push({ label: 'Pay someone to dig', sub: fmtMoney(dig), value: 'dig', disabled: M(s).money < dig });
    if (r.crew < 4) choices.push({ label: 'Take on a crew member', sub: fmtMoney(hire), value: 'hire', disabled: M(s).money < hire });
    choices.push({ label: 'Lay low this year', value: 'low' });
    popup(s, { emoji: '✉️', title: 'The files', text: `${files.length ? 'What you hold is worth something to the people it is about.' : 'You do not hold anything worth anything yet.'} Crew: ${r.crew}. Heat: ${r.heat}.`, handler: 'ringWork', choices });
  },
});
const ringOdds = (s, r, p) => clamp(0.45 + skill(s, 'charisma') / 400 + skill(s, 'streetwise') / 400 + r.crew * 0.04 - (relOf(s, p.id) ? relOf(s, p.id).rel / 400 : 0) - r.heat / 400, 0.1, 0.85);
onChoice('ringWork', (s, ctx, v) => {
  const r = ringOf(s);
  if (!r || !free(s) || !ringOn()) return;
  bump(s, 'ring_work');
  if (v === 'low') { r.heat = Math.max(0, r.heat - 15); return 'You kept the notebook shut. Nobody called. That is the best kind of year.'; }
  if (v === 'hire') {
    const cost = price(s, 4000);
    if (!pay(s, cost)) return cantAfford(cost);
    r.crew++;
    return `You found someone who is good at listening in rooms. They start on Monday. ${r.crew > 2 ? 'You are starting to need to remember who knows what about whom.' : ''}`.trim();
  }
  if (v === 'dig') {
    const cost = price(s, 1200);
    if (!pay(s, cost)) return cantAfford(cost);
    const cands = relPeople(s, ['friend', 'bestie', 'coworker', 'boss', 'sibling', 'classmate', 'neighbor']).filter((p) => ageOf(s, p) >= 20 && !webLive(s, (x) => x.subj === p.id).length);
    const p = pick(cands);
    if (!p) return 'You paid for a month of looking, and found nobody worth looking at.';
    const kind = pick(['npc_debt', 'npc_habit', 'npc_crime', 'npc_affair']);
    const o = { ev: 35, knows: [s.playerId] };
    if (kind === 'npc_crime') o.note = pick(NPC_CRIME_NOTES);
    if (kind === 'npc_habit') o.note = pick(NPC_HABIT_NOTES);
    if (kind === 'npc_affair') { const o2 = pick(cands.filter((x) => x.id !== p.id)); if (!o2) return 'You paid for a month of looking, and it came back empty.'; o.other = o2.id; o.knows.push(o2.id); }
    webNewSecret(s, kind, p.id, o);
    r.heat = clamp100(r.heat + 4);
    return { text: `A folder arrived, with photographs. It is about ${p.first}: ${webRumor(s, webLive(s, (x) => x.subj === p.id).pop())}. You had not asked for ${p.first} in particular. That is how it works.`, tone: 'bad' };
  }
  const sec = webOf(s).secrets[String(v).slice(2)], p = sec && s.people[sec.subj];
  if (!sec || !p || !p.alive || sec.out) return 'By the time you picked up the phone, it was old news.';
  r.cool[sec.id] = s.year + 2;
  add(s, { karma: -8 });
  tally(s, 'squeezes');
  if (chance(ringOdds(s, r, p))) {
    const amt = Math.min(Math.max(0, p.money), price(s, 1500 + 500 * sec.sev));
    p.money -= amt; add(s, { money: amt });
    r.take += amt;
    r.heat = clamp100(r.heat + 5);
    if (relOf(s, p.id)) relOf(s, p.id).rel = Math.min(relOf(s, p.id).rel, 6);
    webFact(s, 'victim', { pid: p.id, harm: 'blackmail' });
    return { text: `${p.first} paid ${fmtMoney(amt)}, in cash, in a parking lot, without looking at you. It will happen again, and you both know it.`, tone: 'bad' };
  }
  r.heat = clamp100(r.heat + 14);
  webFact(s, 'extorted', { pid: p.id }); // they may go to the police (63-cases.js)
  if (relOf(s, p.id)) addRel(s, p.id, -30);
  if (chance(0.4)) webLearn(s, sec, pick([...webTies(s, p).keys()].filter((id) => id !== s.playerId && !sec.knows.includes(id))) || p.id, p.id);
  return { text: `${p.first} would not pay, and said so loudly. ${cap(pr(p).he)} knows who you are, and who they can tell.`, tone: 'bad' };
});
function ringYear(s) {
  const r = ringOf(s);
  if (!r) return;
  if (!ringOn()) return; // the switch was turned off: the files wait
  r.heat = Math.max(0, r.heat - 8);
  r.cool = Object.fromEntries(Object.entries(r.cool).filter(([, y]) => y >= s.year));
  const sec = webOf(s).secrets[r.sec];
  if (sec) sec.ev = clamp100(sec.ev + Math.round(r.heat / 10));
  // A crew member is one more person who can talk.
  if (r.crew && chance(0.04 * r.crew)) { r.crew--; r.heat = clamp100(r.heat + 18); log(s, '🗂️ A man who used to work for you has been seen with the police. You have no idea what he took with him.', 'bad'); }
  if (r.heat >= 40 && chance(r.heat / 220)) ringBusted(s, 'police');
}
function ringBusted(s, how) {
  const r = ringOf(s);
  if (!r) return;
  const sec = webOf(s).secrets[r.sec];
  if (sec) { sec.out = true; sec.outYear = s.year; }
  const k = invOpen(s, 'blackmail', { messy: true, ev: { wit: 30 } });
  k.prog = clamp(35 + r.heat / 3, 0, 90);
  if (sec) { sec.case = k.id; k.sec = sec.id; }
  webRepAdd(P(s), { scandal: 12, name: -10 });
  newsPost(s, 'ring', {}, true);
  schemeEnd(s, 'ring', how, r.take);
  schemeOf(s).ring = null;
  log(s, '✉️ Somebody found the notebook. The files are in an evidence bag now, and a detective is reading about people you know.', 'bad');
  if (how === 'police' && chance(0.4) && !inPrison(s)) { const x = arrest(s, 'blackmail'); if (x && x.text) log(s, x.text, 'bad'); }
}

/* ---- the year -------------------------------------------------------------------------------------------------- */
function schemesYear(s) {
  if (A(s) < 16) return;
  if (!M(s).scheme) return;
  // A fugitive or a prisoner has no schemes to run: the ones that need a hand on them fall apart.
  if (inPrison(s)) { if (pzOf(s)) pzCollapse(s, 'jailed'); if (conOf(s)) conReport(s, 'reported'); if (ringOf(s)) ringBusted(s, 'jailed'); return; }
  pzYear(s);
  if (s.dead) return;
  conYear(s);
  ringYear(s);
}
onYear('schemes', schemesYear);
ACT_CATS.splice(ACT_CATS.findIndex((c) => c.id === 'crime'), 0, { id: 'schemes', name: 'Schemes & Rackets', emoji: '🕵️' });
