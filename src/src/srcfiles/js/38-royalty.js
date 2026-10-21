/* =====================================================================
 * 38-royalty.js — royal families in monarchy countries: royal births,
 * titles, the line of succession, coronations, duties, approval, the royal
 * allowance, scandals, abdicating, renouncing, and referendums that can
 * end the monarchy. Royal events are at the bottom of this file.
 *
 * s.crown = { country, house, monarch: pid, abolished,
 *             reigns: [{ pid, first, g, num, from, to }] }
 *   One crown per family line, so it outlives each character.
 * Royal blood: p.royal marks the first royals; descendants inherit it
 *   (royalBlood). p.renounced takes a person and their line out of the
 *   succession. p.abdicated marks a monarch who stepped down.
 * M(s).royal = { approval, patronages }   the current character's standing.
 * Succession is absolute primogeniture: the eldest line first, any gender.
 * ===================================================================== */

const ROYAL_BIRTH_ODDS = 0.03; // share of random births in a monarchy country
const ROYAL_STYLES = {
  uk: { houses: ['Ashworth', 'Belmere', 'Carrowe'], palace: (h) => h + ' Palace', monarch: ['King', 'Queen'] },
  es: { houses: ['Montealba', 'Villaraso', 'Castrell'], palace: (h) => 'Palacio de ' + h, monarch: ['King', 'Queen'] },
  se: { houses: ['Ekholm', 'Stjärnvik', 'Lindqvarn'], palace: (h) => h + ' Palace', monarch: ['King', 'Queen'] },
  jp: { houses: ['Asahi', 'Kirishima'], palace: (h) => h + ' Palace', monarch: ['Emperor', 'Empress'] },
};

/* ---- who is royal ------------------------------------------------------ */
function crown(s) { return s.crown && !s.crown.abolished ? s.crown : null; }
function royalStyle(s) { return ROYAL_STYLES[s.crown.country]; }
function royalState(s) { return M(s).royal || (M(s).royal = { approval: 60, patronages: [] }); }
function royalBlood(s, p, depth) {
  if (!p || p.renounced) return false;
  if (p.royal) return true;
  if ((depth || 0) > 6) return false;
  return p.parents.some((id) => royalBlood(s, s.people[id], (depth || 0) + 1));
}
function isMonarch(s, p) { const cr = crown(s); return !!cr && !!p && cr.monarch === p.id; }
function isConsort(s, p) { const cr = crown(s); const mon = cr && s.people[cr.monarch]; return !!mon && !!p && mon.alive && mon.partner === p.id && mon.married; }
function isRoyal(s) { const cr = crown(s), p = P(s); return !!cr && !!p && (cr.monarch === p.id || isConsort(s, p) || royalBlood(s, p)); }

// Everyone in line, in order. The monarch is not in their own line.
function successionLine(s) {
  const cr = crown(s);
  let root = cr && s.people[cr.monarch];
  if (!root) return [];
  for (let i = 0; i < 8; i++) {
    const up = root.parents.map((id) => s.people[id]).find((q) => q && royalBlood(s, q));
    if (!up) break;
    root = up;
  }
  const out = [];
  const visit = (p, d) => {
    if (!p || p.renounced || d > 8) return;
    if (p.alive && p.id !== cr.monarch && !p.abdicated) out.push(p);
    const kids = p.children.map((id) => s.people[id]).filter((k) => k && royalBlood(s, k)).sort((a, b) => a.birthYear - b.birthYear);
    for (const k of kids) visit(k, d + 1);
  };
  visit(root, 0);
  return out;
}
function linePos(s, p) { const i = successionLine(s).findIndex((q) => q.id === (p || P(s)).id); return i + 1; }
function isHeir(s, p) { const h = successionLine(s)[0]; return !!h && !!p && h.id === p.id; }

/* ---- titles ------------------------------------------------------------ */
function royalTitle(s, p) {
  const cr = crown(s);
  if (!cr || !p) return '';
  const st = royalStyle(s);
  const mon = genderWord(p, st.monarch[0], st.monarch[1], 'Sovereign');
  if (p.id === cr.monarch) return mon;
  if (p.abdicated) return 'Former ' + mon;
  if (isConsort(s, p)) return genderWord(p, 'Prince Consort', st.monarch[1] + ' Consort', 'Royal Consort');
  if (!royalBlood(s, p)) return '';
  if (isHeir(s, p)) return genderWord(p, 'Crown Prince', 'Crown Princess', 'Crown Heir');
  return genderWord(p, 'Prince', 'Princess', 'Royal Highness');
}
function roman(n) {
  let out = '';
  for (const [v, r] of [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]) while (n >= v) { out += r; n -= v; }
  return out;
}
// "Queen Olivia II". Regnal numbers show from the second monarch of a name on.
function royalName(s, p) {
  const t = royalTitle(s, p);
  if (!t) return fullName(p);
  const r = s.crown.reigns.slice().reverse().find((x) => x.pid === p.id);
  return `${t} ${p.first}${r && r.num > 1 ? ' ' + roman(r.num) : ''}`;
}
function houseName(s) { return 'House of ' + s.crown.house; }
function palaceName(s) { return royalStyle(s).palace(s.crown.house); }

/* ---- being born royal ---------------------------------------------------
 * Called from createLife after the family exists. One parent is royal by
 * blood; either they reign, or their parent (your grandparent) does. */
function makeRoyal(s, fam) {
  const me = P(s), st = ROYAL_STYLES[me.country];
  const rp = chance(0.5) ? fam.p1 : fam.p2;
  rp.royal = true;
  let monarch = rp;
  const gp = rp.parents.map((id) => s.people[id]).find((x) => x && x.alive);
  if (gp && chance(0.5)) { gp.royal = true; monarch = gp; }
  const from = s.year - randInt(1, Math.max(1, ageOf(s, monarch) - 21));
  s.crown = { country: me.country, house: pick(st.houses), monarch: monarch.id, reigns: pastReigns(me.country, from), abolished: false };
  // Royal houses reuse names: sometimes an earlier monarch shares this one's.
  if (chance(0.45)) { const r = pick(s.crown.reigns); r.first = monarch.first; r.g = monarch.gender; }
  const seen = {};
  for (const r of s.crown.reigns) r.num = seen[r.first] = (seen[r.first] || 0) + 1;
  s.crown.reigns.push({ pid: monarch.id, first: monarch.first, g: monarch.gender, num: (seen[monarch.first] || 0) + 1, from, to: null });
  // Royals live at the palace in the capital and don't hold ordinary jobs.
  const capital = COUNTRIES[me.country].cities[0];
  for (const p of [me, fam.p1, fam.p2, monarch, ...relPeople(s, ['sibling'])]) p.city = capital;
  for (const p of [fam.p1, fam.p2, monarch]) { p.job = null; p.retired = false; }
  royalState(s).approval = 70;
  M(s).fame = isHeir(s, me) ? 65 : 40;
  tally(s, 'royalBirth');
}
function pastReigns(cid, until) {
  const out = [];
  let y = until;
  for (let i = randInt(2, 4); i > 0; i--) {
    const len = randInt(8, 40), g = chance(0.5) ? 'm' : 'f';
    out.unshift({ pid: null, first: randomFirst(cid, g), g, num: 1, from: y - len, to: y });
    y -= len;
  }
  return out;
}
function theCountry(c) { const n = COUNTRIES[c].name; return /^(United|Philippines)/.test(n) ? 'the ' + n : n; }
function royalIntroLog(s) {
  const cr = crown(s), mon = s.people[cr.monarch], me = P(s);
  log(s, `👑 You were born into the ${houseName(s)}, the royal family of ${theCountry(cr.country)}. ${cap(kinOf(s, mon.id))} is ${royalName(s, mon)}, and you are ${ordinal(linePos(s, me))} in line to the throne.`, 'good');
}

/* ---- the crown changes hands --------------------------------------------- */
function crownCheck(s) {
  const cr = crown(s);
  if (!cr) return;
  const mon = s.people[cr.monarch];
  if (!mon || !mon.alive || mon.abdicated) passCrown(s, mon);
}
function passCrown(s, old) {
  const cr = crown(s);
  if (!cr) return;
  const last = cr.reigns[cr.reigns.length - 1];
  if (last && last.to == null) last.to = s.year;
  let heir = successionLine(s)[0];
  if (!heir) {
    heir = makePerson(s, { age: randInt(35, 65), country: cr.country });
    assignNpcLife(s, heir);
    heir.royal = true;
    log(s, `👑 With no heirs left, the crown passed to a distant cousin, ${fullName(heir)}.`);
  }
  cr.monarch = heir.id;
  cr.reigns.push({ pid: heir.id, first: heir.first, g: heir.gender, num: 1 + cr.reigns.filter((r) => r.first === heir.first).length, from: s.year, to: null });
  const why = old ? `After ${old.first}'s ${old.abdicated ? 'abdication' : 'death'}, ` : '';
  if (heir.id === s.playerId) {
    const st = royalState(s);
    st.approval = clamp100(st.approval + 10);
    M(s).fame = clamp100(Math.max(M(s).fame, 85));
    add(s, { happy: 20 });
    tally(s, 'crowned');
    const text = `${why}you took the throne as ${royalName(s, heir)}. The coronation at ${palaceName(s)} was watched by millions.`;
    announce(s, { emoji: '👑', title: 'Long live the ' + royalTitle(s, heir), text: cap(text), log: '👑 ' + cap(text), kind: 'good', tone: 'good' });
    return;
  }
  log(s, `👑 ${why}${heir.first} took the throne as ${royalName(s, heir)}.`);
  if (isRoyal(s) && linePos(s)) log(s, `You are now ${ordinal(linePos(s))} in line to the throne.`);
}

/* ---- the royal year ------------------------------------------------------ */
const ROYAL_DUTIES = ['roy_eng', 'roy_patron', 'roy_tour', 'roy_address'];
function royalTick(s) {
  const cr = crown(s);
  if (!cr) return;
  const mon = s.people[cr.monarch];
  // A monarch outside your family still grows old, and very old ones may step aside.
  if (mon && mon.alive && mon.id !== s.playerId) {
    const age = ageOf(s, mon);
    if (!relOf(s, mon.id) && chance(mortality(age, 60))) npcDies(s, mon, npcCause(age));
    else if (age >= 78 && chance(0.1)) { mon.abdicated = true; log(s, `👑 ${royalName(s, mon)} abdicated at ${age}.`); }
  }
  crownCheck(s);
  if (s.dead || !isRoyal(s)) return;
  const me = P(s), m = M(s), st = royalState(s);
  // Remember royal blood on close family, so it survives old records being cleared.
  for (const p of relPeople(s, ['child', 'grandchild', 'sibling', 'halfsibling'])) if (royalBlood(s, p)) p.royal = true;
  if (royalBlood(s, me)) me.royal = true;
  // Approval settles toward what your conduct earns.
  const duties = sum(ROYAL_DUTIES, (k) => lastCount(s, k));
  const adult = A(s) >= 18;
  const target = 48 + (m.karma - 50) / 4 + Math.min(20, duties * 5) - (inPrison(s) ? 35 : 0) - (adult && !duties ? 8 : 0);
  st.approval = Math.round(clamp100(st.approval + (target - st.approval) * 0.3 + gauss(0, 3)));
  m.fame = clamp100(Math.max(m.fame, isMonarch(s, me) ? 85 : isHeir(s, me) ? 65 : 40));
  // royalTick runs after financeTick (so a monarch who died this year is already replaced),
  // so the allowance is paid here and added to this year's finance sheet.
  if (adult && !inPrison(s)) {
    const amt = Math.round(price(s, isMonarch(s, me) ? 2000000 : isHeir(s, me) || isConsort(s, me) ? 600000 : 150000) * (1 - country(s).tax));
    m.money += amt;
    if (m.lastFinance && m.lastFinance.year === s.year) m.lastFinance.inc.push(['Royal allowance (after tax)', amt]);
  }
  if (isMonarch(s, me) && st.approval < 20 && chance(0.35)) {
    popup(s, {
      emoji: '🗳️', title: 'A referendum', handler: 'royalVote', tone: 'bad',
      text: `Your approval is down to ${st.approval}%. Parliament has called a referendum on abolishing the monarchy. How will you respond?`,
      choices: [{ label: 'Campaign to save the crown', value: 'campaign' }, { label: 'Promise reforms and a smaller allowance', value: 'reform' }, { label: 'Stay above politics', value: 'quiet' }],
    });
  }
}
onChoice('royalVote', (s, ctx, how) => {
  const cr = crown(s);
  if (!cr || !isMonarch(s, P(s))) return;
  const st = royalState(s);
  const keep = clamp(0.25 + st.approval / 60 + { campaign: 0.12, reform: 0.18, quiet: 0 }[how] + skill(s, 'charisma') / 500, 0.1, 0.9);
  if (chance(keep)) { st.approval = clamp100(st.approval + 15); return { text: `The monarchy survived the vote, ${Math.round(50 + keep * 20)}% to ${Math.round(50 - keep * 20)}%. You've been given a second chance.`, tone: 'good', emoji: '👑' }; }
  cr.abolished = true;
  const last = cr.reigns[cr.reigns.length - 1];
  if (last) last.to = s.year;
  add(s, { happy: -20 });
  tally(s, 'dethroned');
  return { text: `The nation voted to become a republic. After centuries, the ${'House of ' + cr.house} no longer reigns. You keep your fortune, but you're a private citizen now.`, tone: 'bad', emoji: '🗳️', title: 'The end of the monarchy' };
});

/* ---- royal life (Activities) ---------------------------------------------- */
const royalFree = (s, minAge) => free(s) && isRoyal(s) && A(s) >= minAge;
function approve(s, d) { const st = royalState(s); st.approval = Math.round(clamp100(st.approval + d)); }
const ENGAGEMENTS = ['opened a new children’s hospital wing', 'cut the ribbon on a new bridge', 'visited a town hit by floods', 'launched a ship', 'hosted a garden party', 'toured a primary school', 'presented medals to athletes', 'unveiled a statue', 'visited the troops'];
defAction({
  id: 'royal_engagement', cat: 'royal', label: 'Attend a royal engagement', emoji: '🎀', desc: 'Ribbons, handshakes and hospital visits.',
  when: (s) => royalFree(s, 6),
  run: (s) => {
    const n = bump(s, 'roy_eng');
    if (n > 3) return { text: 'Your diary is full for the rest of the year.', nolog: true };
    if (A(s) < 13) { approve(s, 3); add(s, { happy: 1 }); return vary('You {waved from the palace balcony|handed flowers to a visiting president|sat very still through a three-hour ceremony}. The crowd adored you.'); }
    const what = pick(ENGAGEMENTS);
    addSkill(s, 'charisma', 1);
    if (chance(0.1)) { approve(s, -4); return { text: `You ${what}, then called the mayor by the wrong name. The clip went viral.`, tone: 'bad' }; }
    approve(s, randInt(2, 5));
    add(s, { karma: 1, happy: 1 });
    return `You ${what}. The papers loved it.`;
  },
});
const CAUSES = ['a children’s hospital', 'an animal rescue', 'a mental health charity', 'a veterans’ fund', 'a literacy campaign', 'an ocean cleanup', 'a youth sports league', 'a homeless shelter', 'a cancer research fund', 'a wildlife reserve'];
defAction({
  id: 'royal_patron', cat: 'royal', label: 'Become patron of a charity', emoji: '🤲', desc: 'Lend your name to a good cause.',
  sub: (s) => { const n = royalState(s).patronages.length; return n ? `Patron of ${nOf(n, 'charity', 'charities')}` : 'Lend your name to a good cause.'; },
  when: (s) => royalFree(s, 12),
  run: (s) => {
    if (bump(s, 'roy_patron') > 1) return { text: 'You took on a new patronage this year already.', nolog: true };
    const mine = royalState(s).patronages;
    const options = CAUSES.filter((c) => !mine.includes(c));
    if (!options.length) return { text: "You're already patron of every cause that asked.", nolog: true };
    popup(s, { emoji: '🤲', title: 'Royal patronage', text: 'These charities have asked you to be their patron.', handler: 'royalPatron', choices: options.sort(() => rand() - 0.5).slice(0, 4).map((c) => ({ label: cap(c), value: c })).concat([{ label: 'Not this year', value: null }]) });
  },
});
onChoice('royalPatron', (s, ctx, cause) => {
  if (!cause || !isRoyal(s)) return;
  royalState(s).patronages.push(cause);
  approve(s, 5);
  add(s, { karma: 3, happy: 2 });
  return { text: `You became the royal patron of ${cause}. Donations doubled overnight.`, tone: 'good', emoji: '🤲' };
});
defAction({
  id: 'royal_tour', cat: 'royal', label: 'Go on a royal tour', emoji: '🛩️', desc: 'Represent the crown abroad.',
  when: (s) => royalFree(s, 16),
  run: (s) => {
    if (bump(s, 'roy_tour') > 1) return { text: 'One overseas tour a year is plenty for the palace.', nolog: true };
    const opts = COUNTRY_IDS.filter((c) => c !== P(s).country).sort(() => rand() - 0.5).slice(0, 3);
    popup(s, { emoji: '🛩️', title: 'Royal tour', text: 'The foreign office suggests three destinations.', handler: 'royalTour', choices: opts.map((c) => ({ label: COUNTRIES[c].flag + ' ' + COUNTRIES[c].name, value: c })).concat([{ label: 'Stay home', value: null }]) });
  },
});
onChoice('royalTour', (s, ctx, c) => {
  if (!c || !isRoyal(s)) return;
  const C = COUNTRIES[c];
  add(s, { happy: 5, fame: 2 });
  tally(s, 'royalTours');
  if (chance(0.15)) { approve(s, -6); return { text: `On your tour of ${C.name}, you mixed up the president's name at the state dinner. Twice.`, tone: 'bad', emoji: '🛩️' }; }
  approve(s, randInt(4, 9));
  return { text: `Your ${C.adj} tour was a triumph: ${vary('{crowds lined every street|you danced at a festival|you planted a tree with schoolchildren|you gave a speech in the local language}')}.`, tone: 'good', emoji: '🛩️' };
});
defAction({
  id: 'royal_address', cat: 'royal', label: 'Address the nation', emoji: '🎙️', desc: 'A speech broadcast to the whole country.',
  when: (s) => free(s) && isMonarch(s, P(s)),
  run: (s) => {
    if (bump(s, 'roy_address') > 1) return { text: 'You already addressed the nation this year.', nolog: true };
    if (chance(0.5 + skill(s, 'charisma') / 200)) { approve(s, 8); return { text: 'Your address moved the nation. Even the critics called it the speech of the year.', tone: 'good' }; }
    approve(s, 2);
    return 'Your address was... fine. Most people had it on in the background.';
  },
});
defAction({
  id: 'royal_interview', cat: 'royal', label: 'Give a tell-all interview', emoji: '📺', desc: 'Spill the palace secrets for a fortune.',
  when: (s) => royalFree(s, 18) && !isMonarch(s, P(s)) && !flag(s, 'toldAll'),
  run: (s) => { popup(s, { emoji: '📺', title: 'Tell all?', text: 'A network will pay a fortune for the inside story of your royal life. The palace will never forgive you.', handler: 'royalTellAll', choices: [{ label: 'Tell them everything', value: true, tone: 'bad' }, { label: 'Keep the family secrets', value: false }] }); },
});
onChoice('royalTellAll', (s, ctx, yes) => {
  if (!yes || !isRoyal(s)) return;
  flag(s, 'toldAll', true);
  const pay = price(s, randInt(1, 6) * 1000000);
  add(s, { money: pay, fame: 15, happy: 4 });
  approve(s, -25);
  for (const p of relPeople(s)) if (royalBlood(s, p) || isMonarch(s, p)) addRel(s, p.id, -15);
  return { text: `Your interview drew a record audience and paid ${fmtMoney(pay)}. The palace issued a one-line statement. Your family has stopped returning your calls.`, tone: 'bad', emoji: '📺' };
});
defAction({
  id: 'royal_renounce', cat: 'royal', label: 'Give up your royal title', emoji: '🚪', desc: 'Leave the line of succession for good.',
  when: (s) => royalFree(s, 18) && !isMonarch(s, P(s)) && royalBlood(s, P(s)),
  run: (s) => { popup(s, { emoji: '🚪', title: 'Renounce your title?', text: 'You and any children you have will leave the line of succession and lose the royal allowance. There is no going back.', handler: 'royalRenounce', choices: [{ label: 'Renounce it', value: true, tone: 'bad' }, { label: 'Stay royal', value: false }] }); },
});
onChoice('royalRenounce', (s, ctx, yes) => {
  if (!yes) return;
  P(s).renounced = true;
  add(s, { happy: 5 });
  tally(s, 'renounced');
  return { text: 'You gave up your royal title. For the first time, you can go to the shops without a security detail.', emoji: '🚪' };
});
defAction({
  id: 'royal_abdicate', cat: 'royal', label: 'Abdicate the throne', emoji: '🪑', desc: 'Hand the crown to your heir.',
  when: (s) => free(s) && isMonarch(s, P(s)) && A(s) >= 18,
  run: (s) => { popup(s, { emoji: '🪑', title: 'Abdicate?', text: `The crown would pass to ${successionLine(s)[0] ? royalName(s, successionLine(s)[0]) : 'a distant cousin'}. You keep your fortune and a courtesy title.`, handler: 'royalAbdicate', choices: [{ label: 'Abdicate', value: true, tone: 'bad' }, { label: 'Keep reigning', value: false }] }); },
});
onChoice('royalAbdicate', (s, ctx, yes) => {
  const me = P(s);
  if (!yes || !isMonarch(s, me)) return;
  me.abdicated = true;
  tally(s, 'abdications');
  add(s, { happy: 8 });
  passCrown(s, me);
  return { text: `You abdicated. ${royalName(s, s.people[s.crown.monarch])} reigns now, and you finally have your weekends back.`, emoji: '🪑' };
});
defAction({
  id: 'p_knight', cat: 'person', target: 'person', label: 'Give them a knighthood', emoji: '⚔️',
  when: (s, pid) => free(s) && isMonarch(s, P(s)) && reachable(s, pid) && tAge(s, pid) >= 16 && !tgt(s, pid).knighted && !royalBlood(s, tgt(s, pid)),
  run: (s, pid) => {
    const p = tgt(s, pid);
    p.knighted = true;
    addRel(s, pid, 12);
    return { text: `You touched a sword to ${p.first}'s shoulders. Arise, ${genderWord(p, 'Sir ' + p.first, 'Dame ' + p.first, p.first + ', Knight of the Realm')}!`, tone: 'good', person: pid };
  },
});
// The crown pays for a royal wedding (offered from Plan the wedding, 18-relationships.js).
function royalWedding(s, pid) {
  const p = marry(s, pid);
  addRel(s, pid, 15);
  add(s, { happy: 20, fame: 5 });
  approve(s, 10);
  tally(s, 'royalWeddings');
  return { text: `Millions watched you marry ${p.first} at ${palaceName(s)}. The crowds outside stretched for miles. 💒`, tone: 'good', person: pid, emoji: '👑' };
}

/* ---- royal events ---------------------------------------------------------- */
const royalEv = (s) => isRoyal(s);
EV('roy_birthday', {
  ages: [1, 12], w: 0.8, when: royalEv, emoji: '🎈', text: 'Crowds gathered outside the palace to celebrate your birthday.',
  auto: (s) => { add(s, { happy: 3 }); return 'You waved until your arm got tired.'; },
});
EV('roy_security', {
  ages: [0, 120], w: 0.3, when: royalEv, emoji: '🛡️', text: 'Royal protection officers quietly foiled a plot against you.',
  auto: (s) => { add(s, { happy: -2 }); return "You're safe. You won't travel anywhere without them again."; },
});
EV('roy_school', {
  ages: [11, 13], once: true, when: royalEv, emoji: '🏰', text: 'The palace wants to send you to Greythorne, a famously strict boarding school.',
  choices: [
    ['Go', (s) => { add(s, { smarts: 4, happy: -3 }); approve(s, 2); return 'Cold showers, Latin and rugby. You came back sharper.'; }],
    ['Refuse', (s) => { add(s, { happy: 2 }); approve(s, -2); return 'You stayed at home. The newspapers called you spoiled.'; }],
  ],
});
EV('roy_paparazzi', {
  ages: [10, 120], when: royalEv, emoji: '📸', text: 'A photographer snapped you {mid-sneeze|falling into a fountain|picking your teeth at a parade|asleep at a concert}. It made every front page.',
  choices: [
    ['Laugh it off', (s) => { approve(s, 2); add(s, { happy: 1 }); return 'You posted the photo yourself. People loved it.'; }],
    ['Sue the tabloid', (s) => { if (chance(0.5)) { const w = price(s, 50000); add(s, { money: w }); approve(s, 2); return `You won ${fmtMoney(w)} in damages.`; } approve(s, -3); return 'You lost the case, and the photo ran again.'; }],
    ['Say nothing', (s) => { approve(s, -1); return 'It blew over in a week.'; }],
  ],
});
EV('roy_gaffe', {
  ages: [16, 120], when: royalEv, emoji: '🍷', text: 'At a state banquet, you made a joke that landed very, very badly.',
  choices: [
    ['Apologize publicly', (s) => { approve(s, -2); return 'The apology was gracious. Mostly forgiven.'; }],
    ['Double down', (s) => { approve(s, -8); add(s, { fame: 3 }); return 'Half the country is furious. The other half made it a meme.'; }],
    ['Blame the jet lag', (s) => { approve(s, -4); return 'Nobody believed you.'; }],
  ],
});
EV('roy_commoner', {
  ages: [17, 40], when: (s) => royalEv(s) && !romanticId(s), emoji: '💌', text: 'You fell for a commoner you met at {a polo match|a university lecture|a charity gala}. The palace is not pleased.',
  choices: [
    ['Date them anyway', (s) => { const p = candidatePerson(s); setRel(s, p.id, 'friend', 60); startRomance(s, p.id); approve(s, chance(0.5) ? 3 : -3); return { text: `You and ${p.first} went public. The tabloids can't get enough.`, tone: 'good', person: p.id }; }],
    ['End it for the crown', (s) => { add(s, { happy: -6 }); approve(s, 2); return 'Duty first. It still stings.'; }],
  ],
});
EV('roy_sibling_scandal', {
  ages: [14, 120], when: royalEv, emoji: '📰',
  ctx: (s) => someone(s, ['sibling', 'halfsibling'], (p) => royalBlood(s, p) && ageOf(s, p) >= 16),
  text: (s, c) => `Your ${kinOf(s, c.pid).replace(/^your /, '')} ${nm(s, c.pid)} is all over the tabloids for {a wild night out|a messy divorce|a shady business deal|insulting a foreign leader}.`,
  choices: [
    ['Defend them', (s, c) => { addRel(s, c.pid, 8); approve(s, -3); return `${nm(s, c.pid)} won't forget you stood by them.`; }],
    ['Distance yourself', (s, c) => { addRel(s, c.pid, -10); approve(s, 2); return `The palace said ${nm(s, c.pid)} "acted alone."`; }],
  ],
});
EV('roy_affair_rumor', {
  ages: [25, 120], when: (s) => royalEv(s) && relKind(s, romanticId(s)) === 'spouse', emoji: '🗞️', text: 'A tabloid claims you are having an affair. It is not true... probably.',
  choices: [
    ['Deny it on TV', (s) => { approve(s, -2); return 'Denying it kept the story alive another week.'; }],
    ['Sue for libel', (s) => { if (chance(0.55)) { approve(s, 3); return 'You won. The tabloid printed a tiny apology on page 37.'; } approve(s, -4); return 'You lost, and the trial was a circus.'; }],
    ['Ignore it', (s) => { approve(s, -1); return 'It faded, eventually.'; }],
  ],
});
EV('roy_pm_audience', {
  ages: [18, 120], when: (s) => royalEv(s) && isMonarch(s, P(s)), emoji: '🏛️', text: 'Your weekly audience with the prime minister got heated over {taxes|a new law|a foreign crisis}.',
  choices: [
    ['Offer quiet advice', (s) => { approve(s, 1); add(s, { karma: 1 }); return 'The prime minister took your advice. Nobody will ever know.'; }],
    ['Stay neutral', () => 'You nodded politely, as monarchs do.'],
    ['Speak out in public', (s) => { if (chance(0.5)) { approve(s, 6); return 'The public agreed with you. Politicians did not.'; } approve(s, -10); return 'It caused a constitutional crisis. Columnists are asking what a monarch is for.'; }],
  ],
});
EV('roy_jubilee', {
  ages: [18, 120], once: true, emoji: '🎉', text: 'The country celebrated your Silver Jubilee: 25 years on the throne.',
  when: (s) => { const cr = crown(s); const r = cr && cr.reigns[cr.reigns.length - 1]; return !!r && r.pid === s.playerId && s.year - r.from >= 25; },
  auto: (s) => { approve(s, 15); add(s, { happy: 10, fame: 5 }); return 'Street parties, fireworks and a commemorative coin with your face on it.'; },
});
