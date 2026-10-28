/* =====================================================================
 * 42-courts.js — civil court: suing people, companies, your employer, the
 * city and the prison; getting sued (car crashes, neighbors, dog bites,
 * patients, rival celebrities, copyright claims, your company's customers,
 * frivolous strangers); small claims court; lawyers and their fees,
 * settlement offers, discovery, testimony, verdicts and appeals. Judges hear
 * a docket of cases every year and rise by appointment to the Supreme
 * Court (nomination and a confirmation hearing). Lawyers take on clients.
 * Courts events are at the bottom.
 *
 * M(s).court (created on first contact) = { seq, cases: [Case], past: [Past],
 *   docket: { year, cases: [Docket] } | null, bench: { heard, overturned, landmark, bribes },
 *   practice: { won, lost } }
 * Case = { id, side: 'plaintiff'|'defendant', type, vs (the other side's name), cap (their
 *   name in the case title), pid | firm | co (who they are, or which of your companies is
 *   being sued), claim, merit (0-100: how strong the case really is for you), their (their
 *   lawyers' edge), lawyer (a COUNSEL id), stage: 'pretrial'|'appeal', year (filed), trial
 *   (the year it goes to trial), won, amt (the judgment if the plaintiff wins), appellant }
 * Past = { y, side, type, vs, result: 'won'|'lost'|'settled'|'dropped', amt }
 * Docket = { t: 'crim'|'civ'|'app'|'sup', name, text, truth | merit, ev, ... , done }
 * courtTick runs after financeTick: legal fees go straight to this year's finance sheet.
 * ===================================================================== */

// claim: [lo, hi] US-baseline damages asked for. m: [lo, hi] merit for you.
// p / d: how the suit reads when you're the plaintiff / the defendant.
const CASE_TYPES = {
  debt: { name: 'Unpaid debt', emoji: '💸', claim: [1000, 25000], m: [35, 80], p: 'over money they owe you', d: 'over money they say you owe them' },
  defamation: { name: 'Defamation', emoji: '🗞️', claim: [20000, 400000], m: [15, 65], p: 'for spreading lies about you', d: 'over something you said about them' },
  injury: { name: 'Personal injury', emoji: '🩹', claim: [10000, 500000], m: [20, 70], p: 'for injuring you', d: 'over an injury they blame on you' },
  distress: { name: 'Emotional distress', emoji: '😢', claim: [5000, 150000], m: [10, 50], p: 'for emotional distress', d: 'for emotional distress' },
  contract: { name: 'Breach of contract', emoji: '📄', claim: [5000, 150000], m: [25, 75], p: 'for breaking a deal with you', d: 'for breaking a deal with them' },
  product: { name: 'Defective product', emoji: '🧯', claim: [50000, 3000000], m: [25, 75], p: 'over a product that hurt you' },
  advertising: { name: 'False advertising', emoji: '📢', claim: [5000, 250000], m: [25, 70], p: 'for false advertising' },
  privacy: { name: 'Data breach', emoji: '🔓', claim: [10000, 500000], m: [30, 75], p: 'for leaking your personal data' },
  hotcoffee: { name: 'Scalding coffee', emoji: '☕', claim: [100000, 5000000], m: [5, 40], p: 'over a coffee that scalded you' },
  discrimination: { name: 'Workplace discrimination', emoji: '🏢', claim: [30000, 800000], m: [20, 70], p: 'for discrimination at work' },
  wages: { name: 'Unpaid overtime', emoji: '⏰', claim: [5000, 80000], m: [40, 85], p: 'for years of unpaid overtime' },
  wrongful: { name: 'Wrongful termination', emoji: '📦', claim: [20000, 500000], m: [20, 70], p: 'for firing you unfairly', d: 'for firing them unfairly' },
  pothole: { name: 'Pothole damage', emoji: '🕳️', claim: [1000, 15000], m: [35, 75], p: 'over the pothole that wrecked your car' },
  misconduct: { name: 'Police misconduct', emoji: '🚓', claim: [20000, 1500000], m: [15, 60], p: 'for police misconduct during your arrest' },
  conditions: { name: 'Prison conditions', emoji: '⛓️', claim: [5000, 100000], m: [10, 55], p: 'over conditions behind bars' },
  crash: { name: 'Car accident', emoji: '🚗', claim: [10000, 300000], m: [25, 75], d: 'over a car accident' },
  property: { name: 'Property dispute', emoji: '🏡', claim: [5000, 80000], m: [30, 75], d: 'over {the fence line|your tree’s roots in their pipes|the shared driveway|a leak from your side}' },
  dogbite: { name: 'Dog bite', emoji: '🐕', claim: [5000, 150000], m: [15, 55], d: 'because your dog bit them' },
  copyright: { name: 'Copyright infringement', emoji: '🎼', claim: [100000, 8000000], m: [30, 80], d: 'claiming you copied their work' },
  malpractice: { name: 'Malpractice', emoji: '🩺', claim: [50000, 3000000], m: [30, 80], d: 'for malpractice' },
  slipfall: { name: 'Slip and fall', emoji: '🍌', claim: [20000, 400000], m: [30, 75], d: 'after slipping on a wet floor' },
  frivolous: { name: 'Frivolous lawsuit', emoji: '🤡', claim: [10000, 1000000], m: [70, 95], d: '' },
};
// fee: US-baseline retainer up front. yearly: billed every year the case stays open.
// cut: their share of anything you win (no-win, no-fee lawyers only take plaintiffs).
// edge: how much they improve your odds (yourself: selfDefense in 20-crime.js).
const COUNSEL = [
  { id: 'self', name: 'Represent yourself', emoji: '🙋', fee: 0, yearly: 0, edge: 0 },
  { id: 'contingency', name: 'No-win, no-fee lawyer', emoji: '📞', fee: 0, yearly: 0, cut: 0.35, edge: 8, plaintiff: true },
  { id: 'budget', name: 'Budget attorney', emoji: '👔', fee: 3000, yearly: 2000, edge: 5 },
  { id: 'firm', name: 'Experienced attorney', emoji: '💼', fee: 15000, yearly: 8000, edge: 12 },
  { id: 'elite', name: 'Elite litigation team', emoji: '🦈', fee: 100000, yearly: 50000, edge: 22 },
];
const SMALL_CLAIMS = [
  'Your old landlord kept your whole security deposit', 'A dry cleaner ruined your best outfit', 'A contractor took your deposit and vanished',
  'Your ex-roommate skipped out on three months of rent', 'A mechanic charged you for repairs nobody did', 'A wedding photographer lost all your photos',
  'An airline lost your luggage and won’t pay', 'Your neighbor’s tree fell on your shed', 'A moving company broke your TV', 'A friend never paid back the concert tickets',
];
const CIVIL_GRIEVANCES = ['a botched kitchen renovation', 'a fender-bender', 'an unpaid invoice', 'a dog bite', 'a broken lease', 'a defective treadmill', 'a viral one-star review', 'a wedding gone wrong', 'a slip on an icy sidewalk', 'a fence built two feet over the line', 'a cancelled concert', 'a leaky roof'];
const SYMPATHETIC = ['a single parent who stole baby formula', 'a teenager on a dare', 'a veteran down on their luck', 'a grandparent with no record', 'a nurse working three jobs'];
const EVIDENCE = [{ w: 'airtight', g: 0.95, c: 0.5 }, { w: 'strong', g: 0.8, c: 0.35 }, { w: 'shaky', g: 0.45, c: 0.15 }, { w: 'thin', g: 0.15, c: 0.1 }];
const APPEAL_CLAIMS = ['the police searched the car without a warrant', 'a juror slept through the testimony', 'the prosecution hid evidence from the defense', 'the judge gave the jury the wrong instructions', 'the confession was coerced', 'the defense lawyer was asleep at the wheel'];
// The Supreme Court's big questions. a: the two ways to rule. k: karma for each.
const LANDMARKS = [
  { q: 'Can the police search your phone without a warrant?', a: ['Require a warrant', 'Let them search'], k: [3, -2] },
  { q: 'Are app delivery drivers employees or freelancers?', a: ['They are employees', 'They are freelancers'], k: [2, -1] },
  { q: 'Do you have the right to repair the things you own?', a: ['Protect the right to repair', 'Side with the manufacturers'], k: [2, -1] },
  { q: 'Can a city ban cars from its downtown?', a: ['Uphold the ban', 'Strike it down'], k: [1, 0] },
  { q: 'Can a company patent a human gene?', a: ['No patents on genes', 'Allow the patent'], k: [2, -2] },
  { q: 'Can schools punish students for what they post at home?', a: ['Protect students’ speech', 'Back the schools'], k: [2, -1] },
  { q: 'Must the government pay fairly for land it takes for a highway?', a: ['Pay full value', 'Defer to the government'], k: [2, -1] },
  { q: 'Can a work made by a machine be copyrighted?', a: ['Only humans hold copyrights', 'Machines’ work counts too'], k: [1, 0] },
  { q: 'Can a landlord refuse tenants who have pets?', a: ['Side with the tenants', 'Side with the landlords'], k: [1, 0] },
  { q: 'Is a secret recording of a public official allowed as evidence?', a: ['Allow the recording', 'Throw it out'], k: [1, 1] },
];
const MAX_SUITS = 3; // lawsuits you can have going at once as the plaintiff

/* ---- state -------------------------------------------------------------- */
function court(s) { return M(s).court || (M(s).court = { seq: 0, cases: [], past: [], docket: null, bench: { heard: 0, overturned: 0, landmark: 0, bribes: 0 }, practice: { won: 0, lost: 0 } }); }
function openCases(s) { return M(s).court ? M(s).court.cases : []; }
function caseById(s, id) { return openCases(s).find((k) => k.id === id) || null; }
function suitsFiled(s) { return openCases(s).filter((k) => k.side === 'plaintiff').length; }
function counselOf(id) { return COUNSEL.find((c) => c.id === id) || COUNSEL[0]; }
const canSue = (s) => free(s) && A(s) >= 18;
function suitLimit(s) {
  if (count(s, 'sue') >= 2) return { text: "You've filed enough lawsuits for one year.", nolog: true };
  if (suitsFiled(s) >= MAX_SUITS) return { text: `You already have ${MAX_SUITS} lawsuits going. Your lawyer begs you to wait.`, nolog: true };
  return null;
}
// Log-uniform, so big claims stay rare.
function claimFor(s, type) { const c = CASE_TYPES[type].claim; return price(s, Math.exp(randFloat(Math.log(c[0]), Math.log(c[1])))); }
function draftCase(s, side, type, o) {
  const T = CASE_TYPES[type];
  return Object.assign({ side, type, claim: claimFor(s, type), merit: randInt(T.m[0], T.m[1]), their: randInt(4, 14), vs: '', cap: '' }, o);
}
// The other side's lawyers: deep pockets buy better ones.
function moneyEdge(s, amt) { return amt >= price(s, 1e9) ? 22 : amt >= price(s, 1e8) ? 18 : amt >= price(s, 1e7) ? 14 : amt >= price(s, 1e6) ? 11 : amt >= price(s, 100000) ? 7 : 3; }
function personParty(s, p) { return { vs: fullName(p), cap: p.last, pid: p.id, their: moneyEdge(s, p.money) }; }
function firmParty(s, f) { return { vs: f.name, cap: f.name, firm: f.id, their: Math.max(10, moneyEdge(s, f.rev)) }; }
function randomParty(s) { const cc = P(s).country, first = randomFirst(cc), last = randomLast(cc); return { vs: `${first} ${last}`, cap: last }; }
function bigFirm(s, inds) {
  const pool = firms(s).filter((f) => !inds || inds.includes(f.ind));
  return weighted(pool.length ? pool : firms(s), (f) => Math.sqrt(Math.max(1, f.rev)));
}

/* ---- the odds --------------------------------------------------------- */
function selfEdge(s) { return Math.round(selfDefense(s) * 60); }
function myEdge(s, k) { return k.lawyer === 'self' ? selfEdge(s) : counselOf(k.lawyer).edge; }
function caseOdds(s, k, mod) {
  const x = k.merit + myEdge(s, k) - k.their + (M(s).karma - 50) / 10 + skill(s, 'charisma') / 20 + (mod || 0);
  return clamp(1 / (1 + Math.exp(-(x - 50) / 12)), 0.03, 0.97);
}
function oddsWord(p) { return p >= 0.7 ? 'strong' : p >= 0.5 ? 'decent' : p >= 0.3 ? 'shaky' : 'grim'; }
function partyName(s, k) { const co = k.co && company(s, k.co); return co ? co.name : P(s).last; }
function caseName(s, k) { return k.side === 'plaintiff' ? `${partyName(s, k)} v. ${k.cap}` : `${k.cap} v. ${partyName(s, k)}`; }
function casePhrase(k) { const T = CASE_TYPES[k.type]; return k.why || vary((k.side === 'plaintiff' ? T.p : T.d) || 'over ' + T.name.toLowerCase()); }

/* ---- money -------------------------------------------------------------- */
function finSheet(s) { return M(s).lastFinance && M(s).lastFinance.year === s.year ? M(s).lastFinance : null; }
function finRow(s, side, label, amt) {
  const fin = finSheet(s);
  if (!fin || !amt) return;
  const rows = fin[side], row = rows.find((r) => r[0] === label);
  if (row) row[1] += amt; else rows.push([label, amt]);
}
// Money in or out of a case lands with you, or with your company when it's the one in court.
function caseMoney(s, k, amt) {
  const co = k.co && company(s, k.co);
  if (co) co.cash += Math.round(amt);
  else M(s).money += Math.round(amt);
}
function billCounsel(s, k) {
  const fee = price(s, counselOf(k.lawyer).yearly);
  if (!fee) return;
  const co = k.co && company(s, k.co);
  if (co) { co.cash -= fee; return; }
  if (M(s).money < fee) {
    k.lawyer = 'self';
    log(s, `📞 Your lawyer dropped ${caseName(s, k)} over unpaid bills. You're representing yourself now.`, 'bad');
    return;
  }
  M(s).money -= fee;
  finRow(s, 'exp', 'Legal fees', fee);
}

/* ---- filing and defending ---------------------------------------------- */
// Plaintiffs can walk away before filing; defendants have to pick someone.
function chooseCounsel(s, d) {
  const plaintiff = d.side === 'plaintiff', co = d.co && company(s, d.co);
  const cash = co ? co.cash : M(s).money;
  const choices = COUNSEL.filter((L) => plaintiff || !L.plaintiff).map((L) => {
    const fee = price(s, L.fee);
    const sub = L.id === 'self' ? (hasDegree(s, 'jd') ? 'Free · you know the law' : 'Free · risky') : L.cut ? `Free up front · takes ${Math.round(L.cut * 100)}% of what you win` : `${fmtMoney(fee)} + ${fmtMoney(price(s, L.yearly))}/yr`;
    return { label: `${L.emoji} ${L.name}`, value: L.id, sub, disabled: fee > Math.max(0, cash) };
  });
  if (plaintiff) choices.push({ label: 'Never mind', value: null });
  const who = co ? co.name : 'you';
  popup(s, {
    emoji: '⚖️', title: plaintiff ? 'Who will argue your case?' : 'You’re being sued', handler: 'ctCounsel', ctx: { d },
    text: plaintiff ? `You're suing ${d.vs} for ${fmtMoney(d.claim)} ${casePhrase(d)}.` : `${d.vs} is suing ${who} for ${fmtMoney(d.claim)} ${casePhrase(d)}. Who will defend ${co ? 'the company' : 'you'}?`,
    choices,
  });
}
onChoice('ctCounsel', (s, ctx, lid) => {
  const d = ctx.d;
  if (!lid || !d || s.dead || A(s) < 18) return;
  const L = counselOf(lid), fee = price(s, L.fee), co = d.co && company(s, d.co);
  if (d.co && (!co || co.closed)) return { text: 'The company is gone, and the lawsuit went with it.', quiet: true, nolog: true };
  if (co) co.cash -= fee;
  else if (!pay(s, fee)) return cantAfford(fee);
  const st = court(s);
  const k = Object.assign({ id: 'k' + (++st.seq), lawyer: lid, stage: 'pretrial', year: s.year, trial: s.year + randInt(1, 2), won: false, amt: 0, appellant: '' }, d);
  st.cases.push(k);
  const by = lid === 'self' ? 'You will argue it yourself.' : `${cap(aAn(L.name.toLowerCase()))} took the case.`;
  if (k.side === 'defendant') {
    tally(s, 'timesSued');
    return { text: `${k.vs} sued ${co ? co.name : 'you'} for ${fmtMoney(k.claim)} ${casePhrase(k)}. ${by} The trial is set for ${k.trial}.`, title: 'See you in court', emoji: '⚖️', tone: 'bad' };
  }
  bump(s, 'sue');
  tally(s, 'lawsuitsFiled');
  if (k.pid && s.people[k.pid]) {
    const kind = relKind(s, k.pid);
    if (kind && (isFamilyKind(kind) || K_ROMANCE.includes(kind))) addRel(s, k.pid, -35);
    else if (kind) setRel(s, k.pid, 'enemy', 5);
  }
  const c = M(s).career;
  if (k.job && c && c.employer === k.vs) {
    c.perf = clamp100(c.perf - 10);
    for (const b of relPeople(s, ['boss'])) addRel(s, b.id, -30);
    // Firing someone for suing you is retaliation, and juries hate it.
    if (chance(0.3)) { k.merit = Math.min(100, k.merit + 15); fire(s, `${k.vs} fired you the week you filed your lawsuit. Your lawyer called it textbook retaliation.`); }
  }
  delete k.job;
  return { text: `You sued ${k.vs} for ${fmtMoney(k.claim)} ${casePhrase(k)}. ${by} The trial is set for ${k.trial}.`, title: 'Lawsuit filed', emoji: '⚖️' };
});
// Getting sued: an event or your company's trouble calls this with a draft case.
function getSued(s, type, party, o) { chooseCounsel(s, draftCase(s, 'defendant', type, Object.assign({}, party, o))); }

/* ---- a case's year ------------------------------------------------------- */
function goneReason(s, k) {
  if (k.pid) { const p = s.people[k.pid]; if (!p || !p.alive) return `${k.vs} died, and the case died with them.`; }
  if (k.firm && !firmById(s, k.firm)) return `${k.vs} went out of business, so the case was dropped.`;
  if (k.co) { const co = company(s, k.co); if (!co || co.closed) return `${co ? co.name : 'Your company'} closed, so the case was dropped.`; }
  return '';
}
function caseYear(s, k) {
  const gone = goneReason(s, k);
  if (gone) { endCase(s, k, 'dropped', 0); log(s, `⚖️ ${gone}`); return; }
  billCounsel(s, k);
  if (k.stage === 'appeal') { appealRuling(s, k); return; }
  // People you sue sometimes sue you right back.
  if (k.side === 'plaintiff' && k.pid && !k.cs && chance(0.12)) { k.cs = true; getSued(s, 'distress', { vs: k.vs, cap: k.cap, pid: k.pid, their: k.their }); return; }
  if (s.year > k.year && chance(0.45)) {
    const delta = Math.round(gauss(myEdge(s, k) / 5 - 1, 9));
    k.merit = clamp(k.merit + delta, 0, 100);
    if (delta >= 5) log(s, `🔎 Discovery in ${caseName(s, k)} turned up evidence that helps you.`, 'good');
    else if (delta <= -5) log(s, `🔎 Discovery in ${caseName(s, k)} turned up something that hurts your side.`, 'bad');
  }
  if (s.year >= k.trial) trialDay(s, k);
  else if (chance(0.5)) settlementOffer(s, k);
}
function settlementOffer(s, k) {
  const o = caseOdds(s, k), plaintiff = k.side === 'plaintiff';
  let amt = Math.max(price(s, 500), nicePrice(plaintiff ? k.claim * o * randFloat(0.4, 0.85) : k.claim * (1 - o) * randFloat(0.3, 0.7)));
  // People can only offer what they have.
  const p = plaintiff && k.pid && s.people[k.pid];
  if (p) amt = Math.min(amt, nicePrice(Math.max(0, p.money)));
  if (amt < price(s, 500)) return false;
  const co = k.co && company(s, k.co), cash = co ? co.cash : M(s).money;
  popup(s, {
    emoji: '🤝', title: 'Settlement offer', handler: 'ctOffer', ctx: { id: k.id, amt },
    text: plaintiff ? `${k.vs} offered to settle ${caseName(s, k)} for ${fmtMoney(amt)}. Your chances at trial look ${oddsWord(o)}.` : `${k.vs} will drop ${caseName(s, k)} for ${fmtMoney(amt)}. Your chances at trial look ${oddsWord(o)}.`,
    choices: plaintiff
      ? [{ label: `Accept ${fmtMoney(amt)}`, value: 'yes' }, { label: 'Counter: ask for more', value: 'counter' }, { label: 'See them in court', value: 'no' }]
      : [{ label: `Pay ${fmtMoney(amt)} and settle`, value: 'yes', disabled: cash < amt }, { label: 'Counter: offer half', value: 'counter' }, { label: 'See them in court', value: 'no' }],
  });
  return true;
}
onChoice('ctOffer', (s, ctx, v) => {
  const k = caseById(s, ctx.id);
  if (!k || k.stage !== 'pretrial') return;
  const plaintiff = k.side === 'plaintiff';
  if (v === 'no') return `You turned down the offer. ${caseName(s, k)} is headed to trial.`;
  let amt = ctx.amt;
  if (v === 'counter') {
    if (!chance(clamp(0.25 + caseOdds(s, k) * 0.4, 0.1, 0.65))) return { text: `${k.vs} walked away from the table. See you in court.`, tone: 'bad' };
    amt = nicePrice(plaintiff ? amt * randFloat(1.2, 1.6) : amt / 2);
  }
  return settle(s, k, amt);
});
function settle(s, k, amt) {
  if (k.side === 'plaintiff') {
    const net = Math.round(amt * (1 - (counselOf(k.lawyer).cut || 0)));
    caseMoney(s, k, net);
    if (k.pid && s.people[k.pid]) s.people[k.pid].money = Math.max(0, s.people[k.pid].money - amt);
    add(s, { happy: 6 });
    endCase(s, k, 'settled', net);
    return { text: `You settled ${caseName(s, k)} for ${fmtMoney(amt)}.${net < amt ? ` After your lawyer's cut, you keep ${fmtMoney(net)}.` : ''}`, emoji: '🤝', tone: 'good' };
  }
  caseMoney(s, k, -amt);
  add(s, { happy: -3 });
  endCase(s, k, 'settled', -amt);
  return { text: `You paid ${fmtMoney(amt)} and ${k.vs} dropped the case.`, emoji: '🤝' };
}

/* ---- trial, verdict and appeal -------------------------------------------- */
function trialDay(s, k) {
  const o = caseOdds(s, k), cams = M(s).fame >= 40;
  popup(s, {
    emoji: '⚖️', title: 'Your day in court', handler: 'ctTrial', ctx: { id: k.id },
    text: `${caseName(s, k)} goes to trial${cams ? ', with TV cameras in the courtroom' : ''}${inPrison(s) ? '. You testify in an orange jumpsuit' : ''}. Your chances look ${oddsWord(o)}. How do you take the stand?`,
    choices: [
      { label: '📋 Stick to the facts', value: 'facts' },
      { label: '😢 Speak from the heart', value: 'heart' },
      { label: '😠 Go on the attack', value: 'attack', sub: 'Big swing either way' },
      { label: k.lawyer === 'self' ? '🤐 Say as little as possible' : '🤐 Let your lawyer do the talking', value: 'quiet' },
    ],
  });
}
onChoice('ctTrial', (s, ctx, v) => {
  const k = caseById(s, ctx.id);
  if (!k || k.stage !== 'pretrial') return;
  let mod = v === 'facts' ? 3 + (P(s).stats.smarts - 50) / 10 : v === 'heart' ? gauss(2, 8) + skill(s, 'charisma') / 12 : v === 'attack' ? gauss(0, 18) - (trait(s, 'hotheaded') ? 5 : 0) : k.lawyer === 'self' ? -10 : 2;
  if (inPrison(s)) mod -= 5;
  if (M(s).fame >= 40) add(s, { fame: 2 });
  addSkill(s, 'charisma', 1);
  return verdict(s, k, chance(caseOdds(s, k, mod)));
});
// The judgment if the plaintiff wins. Juries punish big companies now and then.
function judgment(s, k) {
  let amt = k.claim * randFloat(0.5, 1.1);
  const corp = k.side === 'plaintiff' ? !!k.firm : !!k.co;
  if (corp && chance(0.1)) amt *= randFloat(2, 5);
  return nicePrice(amt);
}
function verdict(s, k, won) {
  k.won = won;
  k.amt = judgment(s, k);
  webFact(s, 'court_verdict', { id: k.id, won, side: k.side, type: k.type, claim: k.claim, co: !!k.co, name: caseName(s, k) }); // a verdict is public (81-web2.js)
  const plaintiffWins = (k.side === 'plaintiff') === won;
  const head = won ? `The ${pick(['jury', 'court'])} found for you in ${caseName(s, k)}.` : `The ${pick(['jury', 'court'])} found against you in ${caseName(s, k)}.`;
  const stakes = plaintiffWins ? ` The judgment: ${fmtMoney(k.amt)}${k.amt > k.claim ? ', punitive damages included' : ''}.` : '';
  if (!won) {
    const cost = price(s, k.lawyer === 'self' ? 2000 : 25000);
    const co = k.co && company(s, k.co), cash = co ? co.cash : M(s).money;
    add(s, { happy: -6 });
    log(s, `⚖️ ${head}${stakes}`, 'bad');
    popup(s, {
      emoji: '📜', title: 'Appeal?', text: `${head}${stakes} You can take it to the court of appeals.`, handler: 'ctAppeal', ctx: { id: k.id, cost },
      choices: [{ label: 'Appeal the verdict', value: true, sub: fmtMoney(cost), disabled: cash < cost }, { label: 'Accept the verdict', value: false }],
    });
    return;
  }
  add(s, { happy: 8 });
  if (k.claim >= price(s, 20000) && chance(k.firm || k.co ? 0.35 : k.pid ? 0.12 : 0.25)) {
    k.stage = 'appeal';
    k.appellant = 'them';
    return { text: `${head}${stakes} ${k.vs} is appealing${plaintiffWins ? ', so the money is on hold until the appeals court rules' : ''}.`, emoji: '⚖️', tone: 'good' };
  }
  return { text: `${head}${stakes} ${finalize(s, k)}`.trim(), emoji: '⚖️', tone: 'good' };
}
onChoice('ctAppeal', (s, ctx, yes) => {
  const k = caseById(s, ctx.id);
  if (!k || k.stage !== 'pretrial') return;
  if (yes) {
    const co = k.co && company(s, k.co);
    if (co) co.cash -= ctx.cost;
    else if (!pay(s, ctx.cost)) return cantAfford(ctx.cost);
    k.stage = 'appeal';
    k.appellant = 'me';
    return { text: `You appealed ${caseName(s, k)}. The appeals court will rule next year.`, emoji: '📜' };
  }
  return { text: finalize(s, k) || 'You accepted the verdict.', emoji: '⚖️', tone: 'bad' };
});
function appealRuling(s, k) {
  const mine = k.appellant === 'me';
  const edge = mine ? myEdge(s, k) - k.their : k.their - myEdge(s, k);
  const flip = chance(clamp(0.22 + (mine ? k.merit - 50 : 50 - k.merit) / 150 + edge / 150, 0.08, 0.6));
  if (flip) k.won = !k.won;
  const head = flip ? `The court of appeals overturned the verdict in ${caseName(s, k)}.` : `The court of appeals upheld the verdict in ${caseName(s, k)}.`;
  const won = k.won;
  const text = `${head} ${finalize(s, k)}`.trim();
  announce(s, { emoji: '📜', title: 'The appeals court rules', text, log: '📜 ' + text, kind: won ? 'good' : 'bad', tone: won ? 'good' : 'bad' });
}
// Pays out a decided case and closes it. Returns a line about the money ('' when none moves).
function finalize(s, k) {
  const plaintiff = k.side === 'plaintiff', plaintiffWins = plaintiff === k.won;
  let line = '', amt = 0;
  if (plaintiff && k.won) {
    let got = k.amt;
    const p = k.pid && s.people[k.pid];
    if (p) { got = Math.min(got, Math.max(0, Math.round(p.money))); p.money -= got; }
    const net = Math.round(got * (1 - (counselOf(k.lawyer).cut || 0)));
    caseMoney(s, k, net);
    amt = net;
    if (got >= price(s, 1e6)) tally(s, 'bigVerdicts');
    if (k.firm) { const f = firmById(s, k.firm); if (f) f.rep = clamp100(f.rep - randInt(2, 6)); }
    if (k.claim >= price(s, 1e6)) add(s, { fame: 3 });
    line = got < k.amt ? `${k.vs} could only pay ${fmtMoney(got)} of it.` : '';
    if (net < got) line += ` After your lawyer's cut, you keep ${fmtMoney(net)}.`;
    if (!net) line = `${k.vs} didn't have a penny to pay you.`;
  } else if (!plaintiff && !k.won) {
    caseMoney(s, k, -k.amt);
    amt = -k.amt;
    line = `${k.co && company(s, k.co) ? company(s, k.co).name : 'You'} owe${k.co ? 's' : ''} ${fmtMoney(k.amt)}.`;
  } else if (plaintiff && !k.won && k.merit < 25 && chance(0.4)) {
    const costs = price(s, randInt(5000, 40000));
    M(s).money -= costs;
    amt = -costs;
    line = `The judge called the suit frivolous and ordered you to pay ${fmtMoney(costs)} of their legal costs.`;
  }
  if (k.pid && s.people[k.pid] && relOf(s, k.pid)) addRel(s, k.pid, plaintiffWins === plaintiff ? -10 : -3);
  endCase(s, k, k.won ? 'won' : 'lost', amt);
  return line.trim();
}
function endCase(s, k, result, amt) {
  const st = court(s);
  st.cases = st.cases.filter((x) => x !== k);
  st.past.push({ y: s.year, side: k.side, type: k.type, vs: k.vs, name: caseName(s, k), result, amt: Math.round(amt || 0) });
  while (st.past.length > 40) st.past.shift();
  if (result === 'won') tally(s, k.side === 'plaintiff' ? 'lawsuitsWon' : 'suitsBeaten');
  if (result === 'lost') tally(s, 'lawsuitsLost');
  if (result === 'settled') tally(s, 'settlements');
}

/* ---- court actions --------------------------------------------------------- */
defAction({
  id: 'ct_cases', cat: 'court', label: 'Your lawsuits', emoji: '📁', desc: 'Settle, drop or check on a case.',
  when: (s) => !s.dead && openCases(s).length > 0,
  sub: (s) => nOf(openCases(s).length, 'open case'),
  run: (s) => {
    popup(s, {
      emoji: '📁', title: 'Your lawsuits', text: 'Which case?', handler: 'ctPick',
      choices: openCases(s).map((k) => ({ label: `${CASE_TYPES[k.type].emoji} ${caseName(s, k)}`, value: k.id, sub: `${k.stage === 'appeal' ? 'On appeal' : `Trial in ${k.trial}`} · ${fmtMoney(k.claim)}` })).concat([{ label: 'Close', value: null }]),
    });
  },
});
onChoice('ctPick', (s, ctx, id) => {
  const k = caseById(s, id);
  if (!k) return;
  const o = caseOdds(s, k), choices = [];
  if (k.stage === 'pretrial') {
    choices.push({ label: k.side === 'plaintiff' ? '🤝 Push for a settlement' : '🤝 Offer to settle', value: 'settle' });
    if (k.side === 'plaintiff') choices.push({ label: '🗑️ Drop the lawsuit', value: 'drop', tone: 'bad' });
  } else if (k.appellant === 'me') choices.push({ label: '🗑️ Withdraw your appeal', value: 'withdraw', tone: 'bad' });
  choices.push({ label: 'Leave it', value: null });
  const L = counselOf(k.lawyer);
  popup(s, {
    emoji: CASE_TYPES[k.type].emoji, title: caseName(s, k), handler: 'ctManage', ctx: { id: k.id }, choices,
    text: `${k.side === 'plaintiff' ? `You're suing ${k.vs}` : `${k.vs} is suing ${k.co ? partyName(s, k) : 'you'}`} for ${fmtMoney(k.claim)} ${casePhrase(k)}. ${k.lawyer === 'self' ? "You're representing yourself" : `Your counsel: ${L.name.toLowerCase()}`}. ${k.stage === 'appeal' ? 'The appeals court rules next year.' : `Trial in ${k.trial}. Your chances look ${oddsWord(o)}.`}`,
  });
});
onChoice('ctManage', (s, ctx, v) => {
  const k = caseById(s, ctx.id);
  if (!k || !v) return;
  if (v === 'drop') { if (k.stage !== 'pretrial') return; endCase(s, k, 'dropped', 0); if (k.merit < 30) add(s, { karma: 1 }); return `You dropped your lawsuit against ${k.vs}.`; }
  if (v === 'withdraw') { if (k.stage !== 'appeal') return; return `You withdrew your appeal. ${finalize(s, k)}`.trim(); }
  if (k.stage !== 'pretrial') return;
  if (bump(s, 'settle_' + k.id) > 1) return { text: 'Their lawyers already said no this year.', nolog: true };
  if (!chance(clamp(0.3 + (k.side === 'plaintiff' ? caseOdds(s, k) : 1 - caseOdds(s, k)) * 0.5, 0.15, 0.8))) return `${k.vs} refused to negotiate.`;
  if (!settlementOffer(s, k)) return `${k.vs} can't afford to settle.`;
});
defAction({
  id: 'ct_sue_firm', cat: 'court', label: 'Sue a company', emoji: '🏢', desc: 'Take on a corporation.',
  when: canSue,
  run: (s) => {
    const lim = suitLimit(s);
    if (lim) return lim;
    const opts = [['product', null], ['advertising', null], ['privacy', DIGITAL_INDS], ['hotcoffee', ['cafe', 'restaurant', 'foodtruck', 'bakery']]].map(([t, inds]) => draftCase(s, 'plaintiff', t, firmParty(s, bigFirm(s, inds))));
    popup(s, {
      emoji: '🏢', title: 'Sue a company', text: 'Big companies have big lawyers, and deep pockets if you win. What happened?', handler: 'ctSue', ctx: { opts },
      choices: opts.map((d, i) => ({ label: `${CASE_TYPES[d.type].emoji} ${cap(casePhrase(d).replace(/^(over|for) /, ''))}`, value: i, sub: `vs. ${d.vs} · ${fmtMoney(d.claim)}` })).concat([{ label: 'Never mind', value: -1 }]),
    });
  },
});
onChoice('ctSue', (s, ctx, i) => {
  const d = ctx.opts && ctx.opts[i];
  if (!d) return;
  if (d.pid && (!s.people[d.pid] || !s.people[d.pid].alive)) return;
  chooseCounsel(s, d);
});
// Careers from older saves may have no employer yet.
function employerOf(s) { const c = M(s).career; return c.employer || (c.employer = employerName(s, JOBS[c.id])); }
function lastFiring(s) { return M(s).jobHistory.slice().reverse().find((h) => h.reason === 'fired' && s.year - h.end <= 2 && h.employer) || null; }
defAction({
  id: 'ct_sue_boss', cat: 'court', label: 'Sue your employer', emoji: '💼', desc: 'Discrimination, unpaid wages or an unfair firing.',
  when: (s) => canSue(s) && ((!!M(s).career && JOBS[M(s).career.id].special !== 'politics') || !!lastFiring(s)),
  run: (s) => {
    const lim = suitLimit(s);
    if (lim) return lim;
    const c = M(s).career, fired = lastFiring(s), opts = [];
    const boss = (name) => ({ vs: name, cap: name, their: 14 });
    if (c) opts.push(draftCase(s, 'plaintiff', 'discrimination', boss(employerOf(s))), draftCase(s, 'plaintiff', 'wages', boss(employerOf(s))));
    if (fired && !openCases(s).some((k) => k.type === 'wrongful' && k.vs === fired.employer)) opts.push(draftCase(s, 'plaintiff', 'wrongful', boss(fired.employer)));
    if (c) opts.forEach((d) => { if (d.vs === c.employer) d.job = true; });
    popup(s, {
      emoji: '💼', title: 'Sue your employer', text: c ? 'Suing the people who sign your paychecks can get awkward.' : 'They fired you. Was it legal?', handler: 'ctSueBoss', ctx: { opts },
      choices: opts.map((d, i) => ({ label: `${CASE_TYPES[d.type].emoji} ${CASE_TYPES[d.type].name}`, value: i, sub: `vs. ${d.vs} · ${fmtMoney(d.claim)}` })).concat([{ label: 'Never mind', value: -1 }]),
    });
  },
});
onChoice('ctSueBoss', (s, ctx, i) => {
  const d = ctx.opts && ctx.opts[i], c = M(s).career;
  if (!d || (d.job && (!c || c.employer !== d.vs))) return;
  chooseCounsel(s, d);
});
defAction({
  id: 'ct_sue_city', cat: 'court', label: 'Sue the city', emoji: '🏛️', desc: 'You can fight city hall.',
  when: (s) => canSue(s) && (M(s).assets.some((a) => a.kind === 'car') || M(s).record.some((r) => s.year - r.year <= 5)),
  run: (s) => {
    const lim = suitLimit(s);
    if (lim) return lim;
    const city = { vs: `the City of ${P(s).city}`, cap: `City of ${P(s).city}`, their: 12 }, opts = [];
    if (M(s).assets.some((a) => a.kind === 'car')) opts.push(draftCase(s, 'plaintiff', 'pothole', city));
    if (M(s).record.some((r) => s.year - r.year <= 5)) opts.push(draftCase(s, 'plaintiff', 'misconduct', city));
    popup(s, {
      emoji: '🏛️', title: 'Sue the city', text: `The ${city.cap} has a whole floor of lawyers. What's your complaint?`, handler: 'ctSue', ctx: { opts },
      choices: opts.map((d, i) => ({ label: `${CASE_TYPES[d.type].emoji} ${CASE_TYPES[d.type].name}`, value: i, sub: fmtMoney(d.claim) })).concat([{ label: 'Never mind', value: -1 }]),
    });
  },
});
defAction({
  id: 'p_sue', cat: 'person', target: 'person', label: 'Sue them', emoji: '⚖️',
  when: (s, pid) => reachable(s, pid) && canSue(s) && tAge(s, pid) >= 18 && !openCases(s).some((k) => k.pid === pid),
  run: (s, pid) => {
    const lim = suitLimit(s);
    if (lim) return lim;
    const p = tgt(s, pid), kind = relKind(s, pid);
    const opts = ['debt', 'defamation', 'injury', 'distress', 'contract'].map((t) => {
      const d = draftCase(s, 'plaintiff', t, personParty(s, p));
      if (kind === 'enemy') d.merit = Math.min(100, d.merit + 10);
      if (isFamilyKind(kind)) d.merit = Math.max(0, d.merit - 10); // juries hate family feuds
      return d;
    });
    popup(s, {
      emoji: '⚖️', title: `Sue ${p.first}?`, handler: 'ctSue', ctx: { opts }, person: pid,
      text: `What are you suing ${p.first} for? ${p.money >= price(s, 100000) ? `${p.first} can afford good lawyers.` : `${p.first} doesn't have deep pockets, so even a win might not pay much.`}`,
      choices: opts.map((d, i) => ({ label: `${CASE_TYPES[d.type].emoji} ${CASE_TYPES[d.type].name}`, value: i, sub: fmtMoney(d.claim) })).concat([{ label: 'Never mind', value: -1 }]),
    });
  },
});
defAction({
  id: 'pr_sue', cat: 'prison', label: 'Sue the prison', emoji: '⚖️', desc: 'Cold food, leaky roofs, a broken TV.',
  when: (s) => jailed(s) && A(s) >= 18,
  run: (s) => {
    const lim = suitLimit(s);
    if (lim) return lim;
    const pr = M(s).prison;
    chooseCounsel(s, draftCase(s, 'plaintiff', 'conditions', { vs: pr.name, cap: pr.name, their: 10 }));
  },
});

/* ---- small claims court ------------------------------------------------- */
defAction({
  id: 'ct_small', cat: 'court', label: 'Small claims court', emoji: '🧾', desc: 'No lawyers, small stakes, decided on the spot.',
  when: canSue,
  run: (s) => {
    if (bump(s, 'small') > 1) return { text: 'The small claims clerk says one case a year is plenty.', nolog: true };
    const opts = pickN(SMALL_CLAIMS, 3).map((t) => ({ t, amt: price(s, randInt(3, 80) * 100), merit: randInt(25, 85), who: randomParty(s).vs }));
    popup(s, {
      emoji: '🧾', title: 'Small claims court', text: 'Pick your grievance. The judge decides the same afternoon.', handler: 'ctSmall', ctx: { opts },
      choices: opts.map((o, i) => ({ label: o.t, value: i, sub: `Claim: ${fmtMoney(o.amt)}` })).concat([{ label: 'Let it go', value: -1 }]),
    });
  },
});
onChoice('ctSmall', (s, ctx, i) => {
  const o = ctx.opts && ctx.opts[i];
  if (!o) return;
  popup(s, {
    emoji: '🧾', title: 'Small claims court', handler: 'ctSmallCase', ctx: { o },
    text: `${o.t}. You're asking ${o.who} for ${fmtMoney(o.amt)}. The judge peers at you over their glasses. How do you make your case?`,
    choices: [{ label: '🗂️ Show your receipts and stay calm', value: 'receipts' }, { label: '🎭 Tell it like a courtroom drama', value: 'drama' }, { label: '🙋 Bring a surprise witness', value: 'witness' }, { label: '🤷 Wing it', value: 'wing' }],
  });
});
onChoice('ctSmallCase', (s, ctx, v) => {
  const o = ctx.o;
  if (!o || !canSue(s)) return;
  const mod = v === 'receipts' ? 10 + P(s).stats.smarts / 20 : v === 'drama' ? gauss(0, 20) + skill(s, 'acting') / 10 : v === 'witness' ? (chance(0.5) ? 20 : -15) : -5;
  const odds = clamp(1 / (1 + Math.exp(-(o.merit + mod + skill(s, 'charisma') / 20 + selfEdge(s) - 50) / 12)), 0.05, 0.95);
  const st = court(s);
  const how = { receipts: 'Your color-coded binder impressed the judge.', drama: 'You gave a closing speech nobody in the room will forget.', witness: chance(0.5) ? 'Your surprise witness backed up every word.' : 'Your surprise witness got confused and described a different case.', wing: 'You mostly said "come on, though" a lot.' }[v];
  if (chance(odds)) {
    add(s, { money: o.amt, happy: 6 });
    tally(s, 'smallClaimsWon');
    st.past.push({ y: s.year, side: 'plaintiff', type: 'debt', vs: o.who, name: 'Small claims', result: 'won', amt: o.amt });
    while (st.past.length > 40) st.past.shift();
    return { text: `${how} The judge ruled for you and ordered ${o.who} to pay ${fmtMoney(o.amt)}.`, emoji: '🧾', tone: 'good' };
  }
  add(s, { happy: -4 });
  st.past.push({ y: s.year, side: 'plaintiff', type: 'debt', vs: o.who, name: 'Small claims', result: 'lost', amt: 0 });
  while (st.past.length > 40) st.past.shift();
  return { text: `${how} The judge ruled for ${o.who}. Case closed.`, emoji: '🧾', tone: 'bad' };
});

/* ---- the bench: a judge's docket ------------------------------------------ */
const isJudge = (s) => hasCareer(s) && M(s).career.id === 'judge';
function party(s) { const cc = P(s).country; return { first: randomFirst(cc), last: randomLast(cc) }; }
function docketOf(s) {
  const st = court(s);
  if (!st.docket || st.docket.year !== s.year) {
    const lvl = M(s).career ? M(s).career.level : 0;
    const n = [4, 3, 3, 2][lvl] || 3;
    st.docket = { year: s.year, cases: Array.from({ length: n }, () => (lvl >= 3 ? landmarkCase(s) : lvl === 2 ? appealCase(s) : chance(lvl === 0 ? 0.6 : 0.55) ? crimCase(s, lvl) : civCase(s, lvl))) };
  }
  return st.docket;
}
function docketLeft(s) { return docketOf(s).cases.filter((x) => !x.done).length; }
function crimCase(s, lvl) {
  const crime = pick(lvl === 0 ? ['shoplift', 'vandalism', 'dui', 'pickpocket', 'assault'] : ['burglary', 'car_theft', 'drugs', 'scam', 'assault', 'embezzle', 'hacking', 'bank', 'racketeering', 'attempted_murder']);
  const ev = pick(EVIDENCE), d = party(s), sym = chance(0.25) ? pick(SYMPATHETIC) : '', priors = !sym && chance(0.3);
  return {
    t: 'crim', name: `The State v. ${d.last}`, who: `${d.first} ${d.last}`, ev: ev.w, truth: chance(ev.g), sym: !!sym, priors, hot: chance(0.15),
    text: `${d.first} ${d.last}${sym ? `, ${sym},` : ''} is charged with ${CRIMES[crime].verb}. The evidence is ${ev.w}.${priors ? ' They have a long record.' : ''}`,
  };
}
function civCase(s, lvl) {
  const a = party(s), f = lvl >= 1 && chance(0.35) ? bigFirm(s) : null, b = f ? { last: f.name } : party(s);
  const claim = price(s, lvl === 0 ? randInt(5, 100) * 100 : Math.exp(randFloat(Math.log(20000), Math.log(3000000))));
  const merit = randInt(10, 90);
  const read = merit >= 65 ? 'The plaintiff has the receipts.' : merit > 40 ? 'It could go either way.' : "The plaintiff's story has holes.";
  return { t: 'civ', name: `${a.last} v. ${b.last}`, merit, claim, hot: chance(0.15), text: `${a.first} ${a.last} is suing ${f ? f.name : `${b.first} ${b.last}`} for ${fmtMoney(claim)} over ${pick(CIVIL_GRIEVANCES)}. ${read}` };
}
function appealCase(s) {
  const d = party(s), crime = pick(['burglary', 'drugs', 'scam', 'assault', 'embezzle', 'murder', 'kidnapping', 'bank']), truth = chance(0.4);
  const read = truth ? (chance(0.75) ? 'The trial record backs them up.' : 'Parts of the record are murky.') : (chance(0.75) ? 'The trial record looks clean.' : 'Parts of the record are murky.');
  return { t: 'app', name: `${d.last} v. The State`, truth, hot: chance(0.15), text: `${d.first} ${d.last} was convicted of ${CRIMES[crime].verb}. The appeal argues that ${pick(APPEAL_CLAIMS)}. ${read}` };
}
function landmarkCase(s) {
  const a = party(s), b = chance(0.5) ? { last: bigFirm(s).name } : party(s), li = randInt(0, LANDMARKS.length - 1);
  return { t: 'sup', name: `${a.last} v. ${b.last}`, li, text: `The whole country is watching ${a.last} v. ${b.last}. The question: ${LANDMARKS[li].q}` };
}
function rulingChoices(x) {
  if (x.t === 'crim') return [{ label: '⛓️ Guilty: the maximum sentence', value: 'harsh' }, { label: '⚖️ Guilty: a lenient sentence', value: 'lenient' }, { label: '🕊️ Not guilty', value: 'acquit' }, { label: '🗑️ Throw the case out', value: 'dismiss' }];
  if (x.t === 'civ') return [{ label: '💰 Rule for the plaintiff', value: 'full' }, { label: '✂️ Rule for the plaintiff, but cut the damages', value: 'half' }, { label: '🛡️ Rule for the defendant', value: 'def' }, { label: '🤝 Send them to mediation', value: 'mediate' }];
  if (x.t === 'app') return [{ label: '🔨 Uphold the conviction', value: 'affirm' }, { label: '🔓 Overturn the conviction', value: 'reverse' }, { label: '🔁 Order a new trial', value: 'retrial' }];
  const L = LANDMARKS[x.li];
  return [{ label: L.a[0], value: 'a' }, { label: L.a[1], value: 'b' }, { label: 'Write a narrow opinion that dodges the big question', value: 'narrow' }];
}
defAction({
  id: 'ct_hear', cat: 'job', label: 'Hear a case', emoji: '🔨',
  sub: (s) => { const n = docketLeft(s); return n ? `${nOf(n, 'case')} left on your docket` : 'Your docket is clear'; },
  when: isJudge,
  run: (s) => {
    const d = docketOf(s), i = d.cases.findIndex((x) => !x.done);
    if (i < 0) return { text: 'Your docket is clear for the year. The clerks brought cake.', nolog: true };
    const x = d.cases[i];
    popup(s, { emoji: '🔨', title: x.name, text: x.text, handler: 'ctRule', ctx: { y: d.year, i }, choices: rulingChoices(x) });
  },
});
onChoice('ctRule', (s, ctx, v) => {
  if (!isJudge(s)) return;
  const d = docketOf(s), x = d.cases[ctx.i];
  if (!x || x.done || d.year !== ctx.y) return;
  x.done = true;
  const c = M(s).career, b = court(s).bench;
  b.heard++;
  tally(s, 'rulings');
  const perf = (n) => { c.perf = clamp100(c.perf + n); };
  let out = '', tone = '';
  const overturned = (why) => { b.overturned++; perf(-randInt(6, 10)); tone = 'bad'; return ` ${why}`; };
  if (x.t === 'crim') {
    const guilty = v === 'harsh' || v === 'lenient', right = guilty === x.truth;
    out = { harsh: `You found ${x.who} guilty and handed down the maximum sentence.`, lenient: `You found ${x.who} guilty, but went easy on the sentence.`, acquit: `You found ${x.who} not guilty.`, dismiss: `You threw out the case against ${x.who}.` }[v];
    if (right) { perf(randInt(2, 5)); add(s, { karma: 1 }); }
    if (guilty && !x.truth && chance(0.45)) out += overturned('Months later, the court of appeals overturned the conviction. New evidence showed the wrong person was on trial.');
    if (!guilty && x.truth && ['airtight', 'strong'].includes(x.ev)) { perf(-5); out += ' Critics called the verdict a travesty.'; tone = 'bad'; }
    if (v === 'dismiss' && x.truth) add(s, { karma: -2 });
    if (v === 'harsh' && x.sym) { add(s, { karma: -4 }); out += ' The sentence sparked outrage.'; }
    if (v === 'lenient' && x.sym) add(s, { karma: 3 });
    if (v === 'lenient' && x.priors && x.truth && chance(0.3)) { perf(-6); add(s, { fame: 2 }); out += ` A year later, ${x.who} was arrested again. The papers blamed you.`; tone = 'bad'; }
  } else if (x.t === 'civ') {
    const right = x.merit >= 60 ? v === 'full' || v === 'half' : x.merit <= 40 ? v === 'def' : v === 'half' || v === 'mediate';
    out = { full: `You ruled for the plaintiff in ${x.name} and awarded ${fmtMoney(x.claim)}.`, half: `You ruled for the plaintiff in ${x.name}, but cut the damages to ${fmtMoney(nicePrice(x.claim / 2))}.`, def: `You ruled for the defendant in ${x.name}.`, mediate: `You sent ${x.name} to mediation. They settled in the hallway.` }[v];
    if (right) perf(randInt(2, 5));
    else if (v !== 'mediate' && chance(0.4)) out += overturned('The court of appeals overturned your ruling.');
    else if (v === 'mediate') perf(-1);
  } else if (x.t === 'app') {
    const right = x.truth ? v !== 'affirm' : v === 'affirm';
    out = { affirm: `You upheld the conviction in ${x.name}.`, reverse: `You overturned the conviction in ${x.name}.`, retrial: `You ordered a new trial in ${x.name}.` }[v];
    if (right) perf(v === 'reverse' ? randInt(4, 6) : randInt(2, 5));
    else if (chance(0.35)) out += overturned('The Supreme Court reversed your court’s decision.');
  } else {
    const L = LANDMARKS[x.li], votes = pick(['5-4', '6-3', '7-2', '9-0']);
    if (v === 'narrow') { perf(2); out = `In ${x.name}, you wrote a careful, narrow opinion. Law students will be bored by it for decades.`; } else {
      const side = v === 'a' ? 0 : 1;
      b.landmark++;
      tally(s, 'landmarkRulings');
      perf(Math.round((P(s).stats.smarts - 50) / 10 + skill(s, 'writing') / 25 + gauss(2, 3)));
      add(s, { fame: randInt(2, 5), karma: L.k[side] });
      out = `In ${x.name}, the Supreme Court voted ${votes}: ${L.a[side].toLowerCase()}. You wrote the ${votes === '9-0' ? 'unanimous' : 'majority'} opinion.`;
    }
  }
  if (x.hot) { add(s, { fame: randInt(1, 3) }); out += ' The case was all over the news.'; }
  return { text: out, emoji: '🔨', tone };
});
// Once a year: last year's backlog, then appointments up the ladder.
function judgeYear(s) {
  const c = M(s).career, st = court(s), b = st.bench;
  tally(s, 'judgeYears');
  if (st.docket && st.docket.year === s.year - 1) {
    const left = st.docket.cases.filter((x) => !x.done).length;
    if (left) { c.perf = clamp100(c.perf - Math.min(10, left * 3)); log(s, `📚 You left ${nOf(left, 'case')} unheard last year. The backlog made the papers.`, 'bad'); }
  }
  st.docket = null;
  if (c.level === 0 && c.levelYears >= 2 && c.perf >= 60 && chance(0.4)) promote(s, 'You were appointed to the district court.');
  else if (c.level === 1 && c.levelYears >= 3 && c.perf >= 66 && b.overturned <= b.heard * 0.2 && chance(0.3)) promote(s, 'You were elevated to the court of appeals.');
  else if (c.level === 2 && c.levelYears >= 2 && c.perf >= 70 && chance(0.2)) {
    popup(s, {
      emoji: '🏛️', title: 'Supreme Court nomination', handler: 'ctConfirm',
      text: 'A seat opened on the Supreme Court, and you were nominated to fill it. First you have to survive a televised confirmation hearing.',
      choices: [{ label: '🗣️ Answer every question candidly', value: 'candid' }, { label: '🎩 Give careful, polished non-answers', value: 'careful' }, { label: '📺 Grandstand for the cameras', value: 'grand' }],
    });
  }
}
onChoice('ctConfirm', (s, ctx, v) => {
  const c = M(s).career;
  if (!isJudge(s) || c.level !== 2) return;
  const b = court(s).bench;
  const odds = 0.4 + (c.perf - 70) / 60 + (M(s).karma - 50) / 250 + skill(s, 'charisma') / 400 + (v === 'careful' ? 0.12 : v === 'grand' ? -0.1 : 0) - (b.bribes ? 0.3 : 0) - M(s).record.length * 0.1;
  add(s, { fame: v === 'grand' ? 8 : 4, karma: v === 'candid' ? 2 : 0 });
  if (chance(clamp(odds, 0.05, 0.9))) {
    tally(s, 'supremeCourt');
    promote(s, `The hearing ${v === 'grand' ? 'was a circus, but' : 'went well, and'} you were confirmed by a vote of ${randInt(51, 90)} to ${randInt(5, 45)}.`);
    return;
  }
  c.perf = clamp100(c.perf - 5);
  add(s, { happy: -10 });
  const why = b.bribes ? 'An old envelope of cash came up.' : v === 'grand' ? 'Your speeches did not land.' : v === 'candid' ? 'Your honest answers made enemies.' : 'Senators said they still had no idea what you believe.';
  return { text: `Your nomination failed. ${why} You're back on the court of appeals.`, emoji: '🏛️', tone: 'bad' };
});

/* ---- lawyers and their clients ------------------------------------------------ */
const LAWYER_CUT = [0.15, 0.2, 0.3, 0.5, 0.6]; // your share of a contingency win, by rung
function clientsFor(s) {
  const lvl = M(s).career.level, d = party(s), f = bigFirm(s), f2 = bigFirm(s), pb = party(s);
  const crime = pick(['burglary', 'drugs', 'scam', 'assault', 'embezzle', 'hacking', 'dui', 'murder']);
  const job = pick(['tech founder', 'dentist', 'bus driver', 'pop star', 'city councilor', 'chef', 'retired teacher']);
  const type = pick(['product', 'privacy', 'discrimination', 'advertising']);
  return shuffle([
    { k: 'defense', who: `${d.first} ${d.last}`, label: `🛡️ Defend ${d.first} ${d.last}`, sub: `${cap(aAn(job))} charged with ${CRIMES[crime].verb}`, diff: randInt(20, 85), fee: price(s, randInt(10, 80) * 1000 * (1 + lvl * 0.5)), hot: job === 'pop star' || crime === 'murder' },
    { k: 'plaintiff', who: f.name, label: `⚖️ Sue ${f.name}`, sub: `For ${pick(['a family', 'a nurse', 'a factory worker', 'a retired teacher'])} ${{ product: 'hurt by a defective product', privacy: 'whose data was leaked', discrimination: 'pushed out of a job', advertising: 'sold a product that never worked' }[type]} · no win, no fee`, diff: randInt(30, 80), fee: Math.round(price(s, Math.exp(randFloat(Math.log(50000), Math.log(3000000)))) * 0.33 * (LAWYER_CUT[lvl] || 0.15)), hot: chance(0.3) },
    { k: 'corporate', who: f2.name, label: `🏢 Represent ${f2.name}`, sub: `Defending a ${CASE_TYPES[type].name.toLowerCase()} suit · billable hours`, diff: randInt(30, 70), fee: price(s, randInt(20, 120) * 1000 * (1 + lvl * 0.5)), hot: false },
    { k: 'probono', who: `${pb.first} ${pb.last}`, label: `🤲 Take a pro bono case`, sub: `${pb.first} ${pb.last}, ${pick(['a tenant facing an unfair eviction', 'a teenager wrongly accused of shoplifting', 'a grandparent scammed out of their savings', 'a worker cheated out of wages'])}`, diff: randInt(25, 75), fee: 0, hot: false },
  ]).slice(0, 3);
}
defAction({
  id: 'ct_client', cat: 'job', label: 'Take on a client', emoji: '🗂️', desc: 'Argue a case for someone else.',
  when: (s) => hasCareer(s) && M(s).career.id === 'lawyer',
  sub: (s) => { const pr = M(s).court ? M(s).court.practice : null; return pr && pr.won + pr.lost ? `Your record: ${pr.won}-${pr.lost}` : 'Argue a case for someone else.'; },
  run: (s) => {
    if (count(s, 'client') >= 2) return { text: 'Your caseload is full for the year.', nolog: true };
    const cl = clientsFor(s);
    popup(s, { emoji: '🗂️', title: 'Prospective clients', text: 'Three files landed on your desk. Which one do you take?', handler: 'ctClient', ctx: { cl }, choices: cl.map((x, i) => ({ label: x.label, value: i, sub: x.sub })).concat([{ label: 'Not this year', value: -1 }]) });
  },
});
onChoice('ctClient', (s, ctx, i) => {
  const x = ctx.cl && ctx.cl[i];
  if (!x || !hasCareer(s) || M(s).career.id !== 'lawyer') return;
  bump(s, 'client');
  const deal = x.k === 'defense' ? 'Negotiate a plea deal' : x.k === 'corporate' ? 'Settle quietly' : 'Negotiate a settlement';
  popup(s, { emoji: '🗂️', title: x.who, text: `${x.sub}. The case looks ${x.diff >= 65 ? 'like an uphill fight' : x.diff >= 40 ? 'winnable' : 'very winnable'}. What's your strategy?`, handler: 'ctPlay', ctx: { x }, choices: [{ label: '⚖️ Take it to trial', value: 'trial', sub: 'Win big or lose big' }, { label: `🤝 ${deal}`, value: 'deal', sub: 'Safer, smaller' }] });
});
onChoice('ctPlay', (s, ctx, v) => {
  const x = ctx.x, c = M(s).career;
  if (!x || !hasCareer(s) || c.id !== 'lawyer') return;
  const pr = court(s).practice;
  addSkill(s, 'charisma', randFloat(1, 2));
  if (v === 'deal') {
    if (!chance(0.8)) return `The other side wouldn't deal. ${x.who} found another lawyer.`;
    c.perf = clamp100(c.perf + 2);
    const fee = Math.round(x.fee * 0.5);
    add(s, { money: fee, karma: x.k === 'probono' ? 2 : 0 });
    return { text: `You worked out a deal for ${x.who}.${fee ? ` Your share: ${fmtMoney(fee)}.` : ''}`, emoji: '🤝', tone: 'good' };
  }
  const odds = clamp(0.35 + skill(s, 'charisma') / 250 + (P(s).stats.smarts - 50) / 250 + c.level * 0.05 - (x.diff - 50) / 100 + (trait(s, 'cunning') ? 0.05 : 0), 0.05, 0.92);
  if (chance(odds)) {
    pr.won++;
    tally(s, 'clientWins');
    c.perf = clamp100(c.perf + randInt(5, 9));
    add(s, { money: x.fee, happy: 5, karma: x.k === 'probono' ? 4 : 0, fame: x.hot ? randInt(3, 7) : 0 });
    const what = { defense: `The jury acquitted ${x.who}.`, plaintiff: `The jury ruled against ${x.who}, and your client walked away rich.`, corporate: `You won the case for ${x.who}.`, probono: `You won for ${x.who}. They hugged you on the courthouse steps.` }[x.k];
    return { text: `${what}${x.fee ? ` Your share: ${fmtMoney(x.fee)}.` : ''}${x.hot ? ' The win made headlines.' : ''}`, emoji: '⚖️', tone: 'good' };
  }
  pr.lost++;
  c.perf = clamp100(c.perf - randInt(4, 8));
  const billed = x.k === 'corporate' ? Math.round(x.fee * 0.6) : 0;
  add(s, { money: billed, happy: -4, karma: x.k === 'probono' ? 1 : 0 });
  const what = { defense: `The jury convicted ${x.who}.`, plaintiff: `You lost the case against ${x.who}. No win, no fee.`, corporate: `${x.who} lost the case, but they still paid your bill.`, probono: `You lost, but ${x.who} thanked you for fighting.` }[x.k];
  return { text: what, emoji: '⚖️', tone: 'bad' };
});

/* ---- the year in court ------------------------------------------------------------ */
function courtTick(s) {
  if (s.dead) return;
  if (isJudge(s)) judgeYear(s);
  if (!M(s).court) return;
  for (const k of M(s).court.cases.slice()) {
    caseYear(s, k);
    if (s.dead) return;
  }
}

/* ---- courts events ----------------------------------------------------------------- */
const sue = (type) => (s) => { getSued(s, type, randomParty(s)); };
// Can't afford to settle? Then it's off to court after all.
const settleFor = (usd, type) => ({ label: 'Settle out of court', sub: (s) => fmtMoney(price(s, usd)), fx: (s) => { const amt = price(s, usd); if (!pay(s, amt)) { getSued(s, type, randomParty(s)); return; } tally(s, 'settlements'); return `You paid ${fmtMoney(amt)} and they went away.`; } });
const hasCar = (s) => M(s).assets.some((a) => a.kind === 'car');
EV('ct_jury', {
  ages: [18, 80], when: (s) => free(s) && !isJudge(s), emoji: '⚖️', text: 'You were summoned for jury duty.',
  choices: [
    ['Serve', (s) => {
      const d = party(s), ev = pick(EVIDENCE), crime = pick(['burglary', 'car_theft', 'scam', 'assault', 'embezzle', 'shoplift']);
      popup(s, {
        emoji: '⚖️', title: 'The jury room', handler: 'ctJury', ctx: { who: `${d.first} ${d.last}`, truth: chance(ev.g) },
        text: `${d.first} ${d.last} is accused of ${CRIMES[crime].verb}. The evidence is ${ev.w}. The other jurors are looking at you. How do you vote?`,
        choices: [{ label: 'Guilty', value: 'guilty' }, { label: 'Not guilty', value: 'acquit' }, { label: 'Hold out for a hung jury', value: 'hung' }],
      });
    }],
    ['Try to get out of it', (s) => (chance(0.5) ? 'You told the judge you are "very biased against everyone." Dismissed.' : 'The judge was not buying it. You served anyway.')],
  ],
});
onChoice('ctJury', (s, ctx, v) => {
  add(s, { smarts: 1 });
  if (v === 'hung') { add(s, { happy: -2 }); return 'You held out for three days. The judge declared a mistrial.'; }
  if (v === 'guilty') { add(s, { karma: ctx.truth ? 1 : -1 }); return ctx.truth ? `After two days of deliberation, the jury convicted ${ctx.who}. You felt good about it.` : `The jury convicted ${ctx.who}. Something about it still bothers you.`; }
  add(s, { karma: ctx.truth ? -1 : 3 });
  return ctx.truth ? `You talked the jury into an acquittal. Outside, ${ctx.who} winked at you.` : `You convinced the jury the evidence didn't add up. ${ctx.who} hugged their lawyer and cried.`;
});
EV('ct_sued_crash', {
  ages: [18, 90], w: 0.6, when: (s) => free(s) && hasCar(s), emoji: '🚗', text: 'The other driver in a fender-bender says you caused it, and they lawyered up.',
  choices: [['Fight it in court', sue('crash')], { label: 'Let your insurance settle it', sub: (s) => `${fmtMoney(price(s, 1000))} deductible`, fx: (s) => { const amt = price(s, 1000); M(s).money -= amt; return `Your insurance paid them off. You paid the ${fmtMoney(amt)} deductible, and your premium went up.`; } }],
});
EV('ct_sued_neighbor', {
  ages: [20, 95], w: 0.5, when: (s) => free(s) && M(s).assets.some((a) => a.kind === 'house'), emoji: '🏡', text: 'Your neighbor is taking you to court in a property dispute.',
  choices: [['Fight it in court', sue('property')], settleFor(8000, 'property')],
});
EV('ct_sued_dog', {
  ages: [16, 95], w: 0.6, when: (s) => free(s) && myPets(s).some((p) => p.species === 'dog'), emoji: '🐕', text: 'Your dog bit {the mail carrier|a jogger|a delivery driver}. Now they’re suing.',
  choices: [['Fight it in court', sue('dogbite')], settleFor(6000, 'dogbite')],
});
EV('ct_sued_defamation', {
  ages: [18, 90], w: 0.7, when: (s) => free(s) && M(s).fame >= 40, emoji: '🗞️', ctx: (s) => ({ who: pick(STARS.concat(ARTISTS)) }),
  text: (s, c) => `${c.who} says you lied about them in an interview, and is suing you for defamation.`,
  choices: [
    { label: 'Fight it in court', fx: (s, c) => getSued(s, 'defamation', { vs: c.who, cap: c.who.split(' ').pop(), their: 16 }) },
    { label: 'Apologize publicly', fx: (s, c) => { add(s, { fame: -3, happy: -3 }); if (chance(0.6)) return `${c.who} accepted your apology and dropped the case.`; getSued(s, 'defamation', { vs: c.who, cap: c.who.split(' ').pop(), their: 16 }); } },
  ],
});
EV('ct_sued_copyright', {
  ages: [16, 90], w: 0.8, emoji: '🎼', when: (s) => free(s) && ['musician', 'producer', 'author'].includes(fameJob(s) ? fameJob(s).id : '') && !!M(s).sb && M(s).sb.works.length > 0,
  ctx: (s) => ({ title: M(s).sb.works[M(s).sb.works.length - 1].title, who: pick(ARTISTS) }),
  text: (s, c) => `${c.who} claims your “${c.title}” copied their work, and they want a fortune.`,
  choices: [
    { label: 'Fight it in court', fx: (s, c) => getSued(s, 'copyright', { vs: c.who, cap: c.who.split(' ').pop(), their: 18 }) },
    { label: 'Give them a credit and a cut', fx: (s, c) => { const amt = price(s, randInt(20, 150) * 1000); M(s).money -= amt; tally(s, 'settlements'); return `You added ${c.who} to the credits and paid ${fmtMoney(amt)}. The internet decided you did copy it.`; } },
  ],
});
EV('ct_sued_malpractice', {
  ages: [24, 80], w: 0.8, emoji: '🩺', when: (s) => hasCareer(s) && ['doctor', 'surgeon', 'dentist', 'vet', 'pharmacist', 'nurse', 'therapist', 'lawyer'].includes(M(s).career.id),
  text: (s) => `A former ${M(s).career.id === 'lawyer' ? 'client' : M(s).career.id === 'vet' ? 'patient’s owner' : 'patient'} says you botched the job, and is suing you for malpractice.`,
  choices: [['Fight it in court', sue('malpractice')], { label: 'Let your malpractice insurance settle', fx: (s) => { M(s).career.perf = clamp100(M(s).career.perf - 5); tally(s, 'settlements'); return 'Your insurer settled. Your premiums went up, and your boss noticed.'; } }],
});
EV('ct_sued_frivolous', {
  ages: [18, 95], w: 0.4, emoji: '🤡', when: free, ctx: (s) => ({ why: pick(['your sneeze startled them into dropping a wedding cake', 'your car is "too shiny" and hurt their eyes', 'you looked at their parking spot', 'your lawn gnome has a "menacing stare"', 'your holiday lights kept their cat awake']) }),
  text: (s, c) => `A stranger is suing you because ${c.why}.`,
  choices: [{ label: 'Fight it in court', fx: (s, c) => getSued(s, 'frivolous', Object.assign(randomParty(s), { their: 4, why: `because ${c.why}` })) }, settleFor(1500, 'frivolous')],
});
EV('ct_hot_coffee', {
  ages: [16, 90], w: 0.5, emoji: '☕', when: canSue, ctx: (s) => { const f = bigFirm(s, ['cafe', 'restaurant', 'foodtruck', 'bakery']); return f ? { firm: f.id } : null; },
  text: (s, c) => `A coffee from ${firmById(s, c.firm) ? firmById(s, c.firm).name : 'a drive-through'} was so hot it scalded your lap.`,
  choices: [
    { label: 'Sue them', fx: (s, c) => { const f = firmById(s, c.firm); if (!f) return 'They already went out of business.'; const lim = suitLimit(s); if (lim) return 'You have enough lawsuits going already.'; chooseCounsel(s, draftCase(s, 'plaintiff', 'hotcoffee', firmParty(s, f))); } },
    ['Let it go', (s) => { add(s, { health: -1 }); return 'You bought a lid next time.'; }],
  ],
});
EV('ct_class_action', {
  ages: [18, 95], w: 0.5, emoji: '📬', when: free, ctx: (s) => { const f = bigFirm(s); return f ? { name: f.name, what: pick(['hidden fees', 'a data leak', 'misleading labels', 'a recalled product', 'price fixing']) } : null; },
  text: (s, c) => `A letter says you're part of a class-action settlement against ${c.name} over ${c.what}.`,
  choices: [
    ['File a claim', (s, c) => { if (chance(0.08)) { const amt = price(s, randInt(2000, 20000)); add(s, { money: amt, happy: 6 }); return `You were one of the worst-affected customers. Your check came to ${fmtMoney(amt)}!`; } const amt = price(s, randInt(8, 90)); add(s, { money: amt }); return `Two years later, a check arrived for ${fmtMoney(amt)}.`; }],
    ['Toss it, it looks like a scam', () => 'It was real. You will never know how much.'],
  ],
});
EV('ct_witness', {
  ages: [16, 90], w: 0.5, emoji: '👀', when: free, text: 'You saw a robbery. The prosecutor wants you to testify.',
  choices: [
    ['Testify', (s) => { add(s, { karma: 3 }); if (chance(0.15)) { add(s, { happy: -6 }); return 'Your testimony put the robber away. A few weeks later, someone keyed your car.'; } return 'Your testimony put the robber away. The prosecutor shook your hand.'; }],
    ['Say you saw nothing', (s) => { add(s, { karma: -2 }); if (chance(0.25)) { const fine = price(s, 500); M(s).money -= fine; return `They subpoenaed you anyway, and fined you ${fmtMoney(fine)} for stalling.`; } return 'The robber walked. You try not to think about it.'; }],
  ],
});
EV('ct_judge_conflict', {
  ages: [35, 90], emoji: '🤝', when: isJudge, ctx: (s) => someone(s, [...K_FRIENDS, 'sibling', 'halfsibling', 'inlaw'], (p) => ageOf(s, p) >= 18),
  text: (s, c) => `${nm(s, c.pid)}'s case just landed on your docket.`,
  choices: [
    ['Recuse yourself', (s) => { M(s).career.perf = clamp100(M(s).career.perf + 2); add(s, { karma: 1 }); return 'You handed the case to another judge. Textbook.'; }],
    ['Go easy on them', (s, c) => { addRel(s, c.pid, 20); add(s, { karma: -5 }); if (chance(0.25)) { M(s).career.perf = clamp100(M(s).career.perf - 20); add(s, { fame: 3 }); return { text: `A reporter found out you know ${nm(s, c.pid)}. The judicial conduct board opened an investigation.`, tone: 'bad' }; } return `${nm(s, c.pid)} walked out of your courtroom grinning.`; }],
    ['Rule by the book', (s, c) => { addRel(s, c.pid, -15); add(s, { karma: 3 }); M(s).career.perf = clamp100(M(s).career.perf + 3); return `You ruled against ${nm(s, c.pid)}. Thanksgiving will be awkward.`; }],
  ],
});
EV('ct_judge_envelope', {
  ages: [35, 90], w: 0.7, emoji: '✉️', when: isJudge, text: "A wealthy defendant's lawyer left a thick envelope in your chambers.",
  choices: [
    ['Keep it', (s) => {
      const amt = price(s, randInt(20, 200) * 1000 * (M(s).career.level + 1));
      add(s, { money: amt, karma: -10 });
      court(s).bench.bribes++;
      if (chance(0.15)) { fire(s, 'Investigators traced the envelope. You were removed from the bench in disgrace.'); return arrest(s, 'bribery'); }
      return `You counted ${fmtMoney(amt)}. The defendant got a very favorable ruling.`;
    }],
    ['Report it', (s) => { M(s).career.perf = clamp100(M(s).career.perf + 5); add(s, { karma: 4, fame: 1 }); return 'You reported the bribe. The lawyer was disbarred, and you were praised in the papers.'; }],
  ],
});
EV('ct_star_client', {
  ages: [24, 80], w: 0.8, emoji: '🌟', when: (s) => hasCareer(s) && M(s).career.id === 'lawyer' && M(s).career.level >= 2, ctx: (s) => ({ who: pick(STARS.concat(ARTISTS)) }),
  text: (s, c) => `${c.who} wants you to defend them in the trial of the year.`,
  choices: [
    ['Take the case', (s, c) => {
      const fee = price(s, randInt(100, 600) * 1000), cc = M(s).career, pr = court(s).practice;
      if (chance(clamp(0.35 + skill(s, 'charisma') / 200 + cc.level * 0.05, 0.1, 0.9))) { pr.won++; tally(s, 'clientWins'); cc.perf = clamp100(cc.perf + 10); add(s, { money: fee, fame: randInt(6, 12), happy: 8 }); return { text: `Not guilty! ${c.who} thanked you on live TV. Your fee: ${fmtMoney(fee)}.`, tone: 'good' }; }
      pr.lost++; cc.perf = clamp100(cc.perf - 8); add(s, { money: Math.round(fee / 2), fame: randInt(3, 6) }); return { text: `${c.who} was convicted. You still got paid, but the late-night hosts made you a punchline.`, tone: 'bad' };
    }],
    ['Pass', () => 'You said you do not do circuses.'],
  ],
});
