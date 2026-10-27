/* =====================================================================
 * 47-romance.js — Relationships 2.0: open relationships, secret affairs
 * that can be found out, and one-night stands who come back into your
 * life. Romance events are at the bottom; the messiest are tagged mature.
 *
 * M(s).open = { pid, since, by: 'you'|'them', jealous }   your relationship
 *   with pid is open. It ends by itself when pid stops being your partner.
 * A lover's relationship record (M(s).rels[pid], kind 'lover') also holds
 *   sus     0-100, how suspicious your partner is (secret affairs only)
 *   known   true when your partner knows (you were open at the time)
 *   hid     the year it became a secret (an affair, or kept on after closing up)
 *   long    set once the affair has stayed secret for five years
 * A fling (kind 'fling') is someone you hooked up with once. Their record holds
 *   met     the year it happened
 *   cheat   the partner you were with at the time, if it was cheating
 *   kid     set once they've come back with a child
 * startRomance (18-relationships.js) hands affairs to affairBegins; npcTick
 * (22-npc.js) runs affairYear for each lover; the hookup action makes a fling
 * with makeFling. romanceTick runs right after parentingTick.
 * ===================================================================== */

/* ---- open relationships ------------------------------------------------- */
function openWith(s, pid) { const o = M(s).open; return !!o && !!pid && o.pid === pid && romanticId(s) === pid; }
function isOpen(s) { return openWith(s, romanticId(s)); }
function secretLovers(s) { return relPeople(s, ['lover']).filter((p) => !relOf(s, p.id).known); }
// The relationship opens up. Lovers you already had stop being a secret.
function openUp(s, pid, by) {
  M(s).open = { pid, since: s.year, by, jealous: 10 };
  tally(s, 'openRel');
  const hidden = secretLovers(s);
  for (const l of hidden) Object.assign(relOf(s, l.id), { known: true, sus: 0 });
  if (!hidden.length) return '';
  addRel(s, pid, -10);
  return ` You also told ${nm(s, pid)} about ${listJoin(hidden.map((l) => l.first))}. That was a long night.`;
}
// Back to just the two of you. Lovers end, or carry on in secret.
function closeOpen(s, keep) {
  const pid = M(s).open && M(s).open.pid;
  delete M(s).open;
  const lovers = relPeople(s, ['lover']);
  for (const l of lovers) {
    if (keep) Object.assign(relOf(s, l.id), { known: false, sus: 30, hid: s.year });
    else endRomance(s, l.id, 'ex');
  }
  if (pid && relOf(s, pid)) addRel(s, pid, 8);
  if (keep && lovers.length) add(s, { karma: -3 });
  return lovers;
}
defAction({
  id: 'rx_open', cat: 'person', group: 'romance', target: 'person', label: 'Ask to open the relationship', emoji: '🔓',
  when: (s, pid) => reachable(s, pid) && A(s) >= 18 && tAge(s, pid) >= 18 && romanticId(s) === pid && !openWith(s, pid) && !count(s, 'rx_open'),
  run: (s, pid) => {
    bump(s, 'rx_open');
    const p = tgt(s, pid), r = relOf(s, pid);
    const odds = clamp(0.12 + (r.rel - 50) / 200 + (hasTrait(p, 'adventurous') ? 0.25 : 0) - (hasTrait(p, 'romantic') ? 0.15 : 0) - (hasTrait(p, 'anxious') ? 0.1 : 0) + (p.orient === 'bi' ? 0.08 : 0) + (s.year - r.since >= 6 ? 0.08 : 0), 0.03, 0.8);
    if (chance(odds)) {
      addRel(s, pid, -randInt(0, 5));
      const extra = openUp(s, pid, 'you');
      return { text: `${p.first} thought about it for a week, then said yes, with rules: be honest, be safe, and nobody you both know.${extra}`, tone: 'good' };
    }
    addRel(s, pid, -randInt(8, 18));
    for (const l of secretLovers(s)) relOf(s, l.id).sus = clamp((relOf(s, l.id).sus || 0) + 15, 0, 100);
    if (r.rel < 30 && chance(0.4)) {
      const t = relKind(s, pid) === 'spouse' ? divorce(s, pid, false).text : (endRomance(s, pid, 'ex'), '');
      return { text: `${p.first} went quiet, then asked "Is there someone else?", then left. ${t}`.trim(), tone: 'bad' };
    }
    return { text: `${p.first} said no, and keeps asking whether there's someone else.`, tone: 'bad' };
  },
});
defAction({
  id: 'rx_close', cat: 'person', group: 'romance', target: 'person', label: 'Close the relationship', emoji: '🔒',
  when: (s, pid) => reachable(s, pid) && openWith(s, pid),
  sub: (s) => `Open since ${M(s).open.since}`,
  run: (s, pid) => {
    const lovers = relPeople(s, ['lover']);
    if (!lovers.length) { closeOpen(s, false); return `You and ${nm(s, pid)} are exclusive again.`; }
    popup(s, {
      emoji: '🔒', title: 'Close the relationship?', handler: 'rxClose', ctx: { pid },
      text: `Going back to just you and ${nm(s, pid)} means deciding about ${listJoin(lovers.map((l) => l.first))}.`,
      choices: [{ label: `End things with ${lovers.length > 1 ? 'all of them' : lovers[0].first}`, value: 'end' }, { label: 'Keep seeing them in secret', value: 'keep', tone: 'bad' }, { label: 'Keep it open', value: null }],
    });
  },
});
onChoice('rxClose', (s, ctx, v) => {
  if (!v || !openWith(s, ctx.pid)) return;
  const lovers = closeOpen(s, v === 'keep');
  if (v === 'keep') return { text: `You and ${nm(s, ctx.pid)} are exclusive again. As far as ${nm(s, ctx.pid)} knows.`, tone: 'bad' };
  return `You ended things with ${listJoin(lovers.map((l) => l.first))}. You and ${nm(s, ctx.pid)} are exclusive again.`;
});
function openYear(s, o) {
  const q = s.people[o.pid], lovers = relPeople(s, ['lover']);
  o.jealous = clamp(o.jealous + lovers.length * randInt(4, 10) - randInt(1, 4) - (hasTrait(q, 'adventurous') ? 3 : 0), 0, 100);
  if (o.jealous >= 70) addRel(s, o.pid, -randInt(2, 5));
  if (lovers.length && o.jealous >= 45 && chance(o.jealous / 180)) {
    const l = pick(lovers);
    popup(s, {
      emoji: '😒', title: 'Jealous', person: o.pid, handler: 'rxJealous', ctx: { pid: l.id, rom: o.pid },
      text: `${q.first} says the open relationship was a mistake, or at least ${l.first} was. "You spend more time with them than with me."`,
      choices: [{ label: `End things with ${l.first}`, value: 'end' }, { label: 'Reassure them', value: 'reassure' }, { label: 'Close the relationship', value: 'close' }, { label: 'This is what we agreed to', value: 'agreed', tone: 'bad' }],
    });
  }
}
onChoice('rxJealous', (s, ctx, v) => {
  const o = M(s).open, l = s.people[ctx.pid], q = s.people[ctx.rom];
  if (!o || !l || !q || !openWith(s, ctx.rom)) return { text: 'The moment passed.', quiet: true, nolog: true };
  if (v === 'end') { if (relKind(s, l.id) === 'lover') endRomance(s, l.id, 'ex'); o.jealous = Math.max(0, o.jealous - 30); addRel(s, q.id, 6); return `You ended things with ${l.first}. ${q.first} slept better that night. So did you, mostly.`; }
  if (v === 'reassure') {
    if (chance(0.4 + skill(s, 'charisma') / 200)) { o.jealous = Math.max(0, o.jealous - 20); addRel(s, q.id, 4); return `You talked until 2 a.m. ${q.first} feels like the priority again.`; }
    addRel(s, q.id, -6);
    return `You said all the right words. ${q.first} didn't believe any of them.`;
  }
  if (v === 'close') { closeOpen(s, false); return `You closed the relationship. It's just you and ${q.first} again.`; }
  addRel(s, q.id, -12);
  o.jealous = Math.min(100, o.jealous + 10);
  if (relOf(s, q.id).rel < 25 && chance(0.5)) {
    const t = relKind(s, q.id) === 'spouse' ? divorce(s, q.id, false).text : (endRomance(s, q.id, 'ex'), '');
    return { text: `"Then I don't agree anymore." ${q.first} left. ${t}`.trim(), tone: 'bad' };
  }
  return { text: `${q.first} stopped arguing, which was somehow worse.`, tone: 'bad' };
});

/* ---- affairs -------------------------------------------------------------- */
// Someone new says yes while you're with someone else (from startRomance).
function affairBegins(s, pid, current) {
  const p = tgt(s, pid), rom = s.people[current];
  const r = setRel(s, pid, 'lover', Math.max(relOf(s, pid) ? relOf(s, pid).rel : 50, 60));
  if (openWith(s, current)) {
    r.known = true;
    r.sus = 0;
    M(s).open.jealous = Math.min(100, M(s).open.jealous + 8);
    add(s, { happy: 5 });
    return { text: `${p.first} said yes. ${rom.first} knows, and is fine with it. Mostly.`, tone: 'good', person: pid };
  }
  r.sus = 10;
  r.hid = s.year;
  tally(s, 'affairs');
  webFact(s, 'affair_begun', { pid, rom: current }); // the secret ledger (62-web.js)
  add(s, { karma: -5, happy: 4 });
  return { text: `${p.first} said yes... even though you're already with ${rom.first}. You're having an affair.`, tone: 'bad' };
}
function caughtOdds(s, pid) { const r = relOf(s, pid); return clamp(0.04 + ((r && r.sus) || 0) / 200, 0.04, 0.6); }
function riskWord(s, pid) {
  const o = caughtOdds(s, pid);
  return `${o < 0.12 ? 'Low' : o < 0.25 ? 'Medium' : 'High'} risk of getting caught (${Math.round(o * 100)}% a year)`;
}
// Each year an affair gets harder to hide, until your partner finds out.
function affairYear(s, pid) {
  const rom = romanticId(s), r = relOf(s, pid);
  if (!rom || rom === pid || !r) return;
  if (openWith(s, rom)) { r.known = true; r.sus = 0; return; }
  r.known = false;
  r.sus = clamp(Math.round((r.sus ?? 15) + 4 + 3 * (secretLovers(s).length - 1) + (r.rel > 70 ? 3 : 0) - (trait(s, 'cunning') ? 4 : 0)), 0, 100);
  if (r.hid == null) r.hid = s.year;
  if (s.year - r.hid >= 5 && !r.long) { r.long = true; tally(s, 'longAffair'); }
  if (chance(caughtOdds(s, pid))) caughtPopup(s, pid, rom);
}
const CLUES = ['a string of late-night texts from', 'a hotel receipt and a note signed by', 'a second phone full of messages from', 'a photo on a friend’s feed of you and'];
function caughtPopup(s, pid, rom) {
  if (s.pending.some((pp) => pp.handler === 'affairCaught')) return;
  const p = s.people[pid], q = s.people[rom];
  if (!p || !q) return; // the lover or the partner is gone by the time it comes out
  tally(s, 'caughtCheating');
  popup(s, {
    emoji: '😳', title: 'Caught', tone: 'bad', person: rom, handler: 'affairCaught', ctx: { pid, rom },
    text: `${q.first} found ${pick(CLUES)} ${p.first}.`,
    choices: [{ label: 'Deny everything', value: 'deny' }, { label: 'Confess and beg forgiveness', value: 'confess' }, { label: `Leave ${q.first} for ${p.first}`, value: 'leave' }, { label: 'Suggest opening the relationship', value: 'open' }],
  });
  webFact(s, 'affair_found', { pid, rom });
}
// Your partner leaves you: a divorce or a breakup. Returns any extra text.
function partnerLeaves(s, rom) { return relKind(s, rom) === 'spouse' ? divorce(s, rom, false).text : (endRomance(s, rom, 'ex'), ''); }
function confessAffair(s, pid, rom) {
  const p = s.people[pid], q = s.people[rom];
  // The partner may have left earlier in the same stack of popups.
  if (!p || !q || !relOf(s, rom)) return { text: 'The moment passed.', quiet: true, nolog: true };
  addRel(s, rom, -25);
  if (relKind(s, pid) === 'lover') endRomance(s, pid, 'ex');
  add(s, { karma: 2 });
  if (relOf(s, rom).rel >= 25 && chance(0.55)) return { text: `You ended it with ${p.first} and told ${q.first} everything. It will take a long time, but ${q.first} is willing to try.` };
  return { text: `You told ${q.first} everything. It wasn't enough. ${partnerLeaves(s, rom)}`.trim(), tone: 'bad' };
}
onChoice('affairCaught', (s, ctx, v) => {
  const p = s.people[ctx.pid], q = s.people[ctx.rom];
  if (!p || !q || !q.alive || romanticId(s) !== ctx.rom || relKind(s, ctx.pid) !== 'lover') return { text: 'The moment passed.', quiet: true, nolog: true };
  const r = relOf(s, ctx.pid);
  if (v === 'deny') {
    if (chance(clamp(0.25 + skill(s, 'charisma') / 250 + (trait(s, 'cunning') ? 0.15 : 0) - (r.sus || 0) / 300, 0.05, 0.75))) {
      addRel(s, ctx.rom, -8);
      r.sus = clamp((r.sus || 0) + 25, 0, 100);
      return `You had an explanation for everything. ${q.first} wants to believe you. For now.`;
    }
    addRel(s, ctx.rom, -35);
    if (relOf(s, ctx.rom).rel < 30) return { text: `${q.first} didn't buy a word of it, and left. ${partnerLeaves(s, ctx.rom)}`.trim(), tone: 'bad' };
    return { text: `${q.first} didn't buy a word of it. You're sleeping on the couch.`, tone: 'bad' };
  }
  if (v === 'confess') return confessAffair(s, ctx.pid, ctx.rom);
  if (v === 'leave') return ACTIONS.p_leave_for.run(s, ctx.pid);
  if (chance(clamp(0.1 + (hasTrait(q, 'adventurous') ? 0.25 : 0) + (relOf(s, ctx.rom).rel - 50) / 250, 0.03, 0.5))) {
    addRel(s, ctx.rom, -10);
    openUp(s, ctx.rom, 'you');
    return { text: `Against all odds, ${q.first} agreed to try an open relationship. ${p.first} is no longer a secret.`, tone: 'good' };
  }
  addRel(s, ctx.rom, -30);
  if (relOf(s, ctx.rom).rel < 30) return { text: `"You want me to make it okay?" ${q.first} left. ${partnerLeaves(s, ctx.rom)}`.trim(), tone: 'bad' };
  return { text: `${q.first} threw a shoe at you. It was a reasonable response.`, tone: 'bad' };
});
defAction({
  id: 'rx_rendezvous', cat: 'person', group: 'romance', target: 'person', label: 'Secret rendezvous', emoji: '🏨',
  when: (s, pid) => reachable(s, pid) && A(s) >= 18 && relKind(s, pid) === 'lover' && !relOf(s, pid).known && !!romanticId(s),
  sub: (s, pid) => `${fmtMoney(price(s, 250))} · ${riskWord(s, pid)}`,
  run: (s, pid) => {
    if (bump(s, 'rendezvous_' + pid) > 2) return { text: 'Twice in one year is already pushing your luck.', nolog: true };
    const cost = price(s, 250);
    if (!pay(s, cost)) return cantAfford(cost);
    relGain(s, pid, randInt(8, 14));
    add(s, { happy: 4 });
    const r = relOf(s, pid);
    r.sus = clamp((r.sus || 0) + randInt(5, 10), 0, 100);
    return `You met ${nm(s, pid)} at ${pick(['a hotel two towns over', 'a cabin with no cell signal', 'a hotel bar where nobody knows you', 'a "work conference"'])}.`;
  },
});
defAction({
  id: 'rx_cover', cat: 'person', group: 'romance', target: 'person', label: 'Cover your tracks', emoji: '🕶️',
  when: (s, pid) => reachable(s, pid) && relKind(s, pid) === 'lover' && !relOf(s, pid).known && !!romanticId(s) && !count(s, 'cover_' + pid),
  sub: (s, pid) => `${fmtMoney(price(s, 400))} · ${riskWord(s, pid)}`,
  run: (s, pid) => {
    const cost = price(s, 400);
    if (!pay(s, cost)) return cantAfford(cost);
    bump(s, 'cover_' + pid);
    const r = relOf(s, pid);
    r.sus = clamp((r.sus || 0) - randInt(12, 22) - (trait(s, 'cunning') ? 5 : 0), 0, 100);
    return `You ${pick(['bought a burner phone', 'got a friend to back up your alibi', 'cleared every message and photo', 'started paying for everything in cash'])}. ${riskWord(s, pid)}.`;
  },
});
// A one-off hookup found out about (the hookup action and repeat flings).
function hookupFoundOut(s, rom) {
  tally(s, 'caughtCheating');
  webFact(s, 'fling_found', { rom });
  addRel(s, rom, -35);
  let out = ` ${nm(s, rom)} found out.`;
  if (relOf(s, rom).rel < 25 || chance(0.5)) {
    if (relKind(s, rom) === 'spouse') { out += ' They filed for divorce.'; divorce(s, rom, false); } else { endRomance(s, rom, 'ex'); out += ' They dumped you.'; }
  }
  return out;
}

/* ---- flings -------------------------------------------------------------------- */
// The person from a hookup stays in your life (only the latest few stay in touch).
function makeFling(s, c) {
  const p = makePerson(s, { first: c.first, last: c.last, gender: c.gender, age: c.age, country: c.country, city: P(s).city, looks: c.looks, smarts: c.smarts, traits: c.traits, job: c.job, edu: c.edu, money: c.money || 0 });
  p.orient = P(s).gender === p.gender ? (chance(0.5) ? 'gay' : 'bi') : chance(0.85) ? 'straight' : 'bi';
  const r = setRel(s, p.id, 'fling', randInt(30, 60));
  r.met = s.year;
  const rom = romanticId(s);
  if (rom && !openWith(s, rom)) r.cheat = rom;
  const all = relPeople(s, ['fling']).sort((a, b) => relOf(s, a.id).met - relOf(s, b.id).met);
  while (all.length > 6) dropRel(s, all.shift().id);
  return p;
}
function flingAgain(s, pid) {
  const p = tgt(s, pid), rom = romanticId(s);
  add(s, { happy: randInt(3, 6) });
  addRel(s, pid, 8);
  tally(s, 'hookups');
  let out = `You and ${p.first} hooked up again. ${pick(['It is becoming a habit.', 'Same spark.', 'You both said it was the last time.', 'Breakfast, this time.'])}`;
  if (rom && !openWith(s, rom)) { relOf(s, pid).cheat = rom; if (chance(0.25)) out += hookupFoundOut(s, rom); }
  else if (!rom && relOf(s, pid).rel >= 60 && chance(0.35)) { const res = startRomance(s, pid); return { text: `${out} Then ${p.first} asked if this could be a real thing. ${res.text}`, tone: 'good', person: pid }; }
  return out;
}
defAction({
  id: 'rx_fling_again', cat: 'person', group: 'romance', target: 'person', label: 'Hook up again', emoji: '🔥',
  when: (s, pid) => reachable(s, pid) && A(s) >= 18 && relKind(s, pid) === 'fling' && !count(s, 'fling_' + pid),
  run: (s, pid) => { bump(s, 'fling_' + pid); return flingAgain(s, pid); },
});
defAction({
  id: 'rx_fling_date', cat: 'person', group: 'romance', target: 'person', label: 'Ask them on a real date', emoji: '🌹',
  when: (s, pid) => reachable(s, pid) && A(s) >= 18 && relKind(s, pid) === 'fling' && !tgt(s, pid).partner && !count(s, 'flingdate_' + pid),
  run: (s, pid) => {
    bump(s, 'flingdate_' + pid);
    if (!chance(clamp(askOutOdds(s, tgt(s, pid)) + 0.1, 0.05, 0.95))) { addRel(s, pid, -6); return `${nm(s, pid)} said that night was fun, but that's all it was.`; }
    return startRomance(s, pid);
  },
});
defAction({
  id: 'rx_ghost', cat: 'person', group: 'romance', target: 'person', label: 'Ghost them', emoji: '👻',
  when: (s, pid) => reachable(s, pid) && relKind(s, pid) === 'fling',
  run: (s, pid) => { const n = nm(s, pid); dropRel(s, pid); return `You blocked ${n}'s number and deleted the photos. It never happened.`; },
});
function flingYear(s) {
  for (const p of relPeople(s, ['fling'])) {
    const r = relOf(s, p.id);
    if ((s.year - (r.met || s.year) >= 10 && chance(0.25)) || (r.rel < 5 && chance(0.3))) dropRel(s, p.id);
  }
}

/* ---- the year ---------------------------------------------------------------------- */
function romanceTick(s) {
  if (s.dead) return;
  const o = M(s).open;
  if (o && romanticId(s) !== o.pid) delete M(s).open;
  else if (o) openYear(s, o);
  flingYear(s);
}

/* ---- romance events -------------------------------------------------------------------- */
const secretLover = (f) => (s) => (romanticId(s) ? someone(s, ['lover'], (p) => !relOf(s, p.id).known && (!f || f(s, p, relOf(s, p.id)))) : null);
const aFling = (f) => (s) => someone(s, ['fling'], (p) => !f || f(s, p, relOf(s, p.id)));
const romName = (s) => nm(s, romanticId(s));
function flingBack(s) { tally(s, 'flingReturns'); }
EV('rx_partner_open', {
  ages: [22, 75], emoji: '🔓', ctx: (s) => { const id = romanticId(s), p = id && s.people[id], r = id && relOf(s, id); return p && ageOf(s, p) >= 18 && !openWith(s, id) && s.year - r.since >= 3 && (hasTrait(p, 'adventurous') || r.rel < 60) ? { pid: id } : null; },
  text: (s, c) => `${nm(s, c.pid)} sat you down for a serious talk, and asked to open the relationship.`,
  choices: [
    ['Agree to try it', (s, c) => { const extra = openUp(s, c.pid, 'them'); addRel(s, c.pid, 6); return `You agreed. There are rules, a shared calendar and a lot of nervous laughter.${extra}`; }],
    ['Say no', (s, c) => { addRel(s, c.pid, -6); return `${nm(s, c.pid)} said it was just an idea. It did not sound like just an idea.`; }],
    ['Break up', (s, c) => { const t = partnerLeaves(s, c.pid); add(s, { happy: -6 }); return `If that's what ${nm(s, c.pid)} wants, they can want it with someone else. ${t}`.trim(); }],
  ],
});
EV('rx_open_their_date', {
  ages: [20, 80], emoji: '💃', when: isOpen, ctx: (s) => ({ pid: romanticId(s) }),
  text: (s, c) => `${nm(s, c.pid)} has a date tonight with ${pick(['a yoga instructor', 'someone from the climbing gym', 'a chef', 'an old college friend', 'a very tall architect'])}.`,
  choices: [
    ['Help them pick an outfit', (s, c) => { addRel(s, c.pid, 5); add(s, { happy: 1 }); return 'They looked great. You said so. You meant it, mostly.'; }],
    ['Feel a pang of jealousy', (s) => { add(s, { happy: -3 }); M(s).open.jealous = Math.min(100, M(s).open.jealous + 5); return 'You reorganized the spice rack twice before they came home.'; }],
    ['Ask to close the relationship', (s, c) => { if (relPeople(s, ['lover']).length) closeOpen(s, false); else delete M(s).open; addRel(s, c.pid, chance(0.6) ? 4 : -4); return `You asked ${nm(s, c.pid)} to cancel. They did, and the relationship is closed again.`; }],
  ],
});
EV('rx_open_leaves', {
  ages: [20, 85], emoji: '💔', w: 0.4, popup: true, when: (s) => isOpen(s) && relOf(s, romanticId(s)).rel < 40, ctx: (s) => ({ pid: romanticId(s) }),
  text: (s, c) => `${nm(s, c.pid)} fell for someone ${pron(s.people[c.pid], 'he')} met while the relationship was open, and is leaving you.`,
  auto: (s, c) => { const t = partnerLeaves(s, c.pid); add(s, { happy: -8 }); return { text: t, tone: 'bad' }; },
});
EV('rx_ultimatum', {
  w: 2, ages: [18, 80], emoji: '⏳', ctx: secretLover((s, p, r) => r.rel >= 55 && s.year - r.since >= 2),
  text: (s, c) => `${nm(s, c.pid)} is tired of being a secret. "Leave ${romName(s)}, or this is over."`,
  choices: [
    [`Leave your partner`, (s, c) => ACTIONS.p_leave_for.run(s, c.pid)],
    ['End the affair', (s, c) => { endRomance(s, c.pid, 'ex'); add(s, { happy: -4 }); return `You ended it with ${nm(s, c.pid)}. Nobody at home will ever know why you were so quiet that week.`; }],
    ['Promise "soon"', (s, c) => { const r = relOf(s, c.pid); r.promised = (r.promised || 0) + 1; r.sus = clamp((r.sus || 0) + 5, 0, 100); if (r.promised >= 2) { endRomance(s, c.pid, 'ex'); return { text: `${nm(s, c.pid)} has heard "soon" before, and left.`, tone: 'bad' }; } addRel(s, c.pid, -5); return `${nm(s, c.pid)} gave you one more chance. One.`; }],
  ],
});
EV('rx_spotted', {
  w: 2, ages: [18, 85], emoji: '👀', ctx: secretLover(),
  text: (s, c) => `Someone from ${pick(['work', 'your gym', 'the neighborhood'])} spotted you with ${nm(s, c.pid)} at a restaurant across town.`,
  choices: [
    ['Ask them to keep it quiet', (s, c) => { const r = relOf(s, c.pid); r.sus = clamp((r.sus || 0) + 5, 0, 100); return 'They said "of course." They will absolutely tell someone.'; }],
    ['Say it was a work dinner', (s, c) => { const r = relOf(s, c.pid); r.sus = clamp((r.sus || 0) + (chance(0.4 + skill(s, 'charisma') / 200) ? 2 : 15), 0, 100); return 'You described the "client" in great detail. Too much detail.'; }],
    ['Tell your partner before they do', (s, c) => confessAffair(s, c.pid, romanticId(s))],
  ],
});
EV('rx_suspicious', {
  w: 2, ages: [18, 85], emoji: '🤨', ctx: secretLover((s, p, r) => (r.sus || 0) >= 45),
  text: (s, c) => `${romName(s)} has started asking where you go ${pick(['on Thursday nights', 'during your "late meetings"', 'on weekends', 'on your long lunches'])}.`,
  choices: [
    ['Invent a hobby', (s, c) => { const r = relOf(s, c.pid); r.sus = Math.max(0, (r.sus || 0) - 10); const h = pick(['pottery', 'a book club', 'salsa lessons', 'birdwatching']); return `You told them it's ${h}. Now you have to actually learn ${h}.`; }],
    ['Get defensive', (s, c) => { addRel(s, romanticId(s), -8); const r = relOf(s, c.pid); r.sus = clamp((r.sus || 0) + 5, 0, 100); return '"Why are you checking up on me?" It did not help.'; }],
    ['Come clean', (s, c) => confessAffair(s, c.pid, romanticId(s))],
  ],
});
EV('rx_private_eye', {
  w: 2, ages: [20, 85], emoji: '🕵️', ctx: secretLover((s, p, r) => (r.sus || 0) >= 65),
  text: (s) => `The same gray car has been parked outside for a week. ${romName(s)} hired a private investigator.`,
  choices: [
    ['End the affair now', (s, c) => { endRomance(s, c.pid, 'ex'); return `You ended it with ${nm(s, c.pid)} by text, from a parking garage. The investigator found nothing. This time.`; }],
    ['Lose the tail', (s, c) => { if (chance(0.3 + skill(s, 'driving') / 150)) { const r = relOf(s, c.pid); r.sus = Math.max(0, (r.sus || 0) - 20); return 'Three left turns, a car wash and a parking garage later, you were free.'; } caughtPopup(s, c.pid, romanticId(s)); return { text: 'The investigator got the photos.', quiet: true }; }],
    ['Confront your partner', (s, c) => { addRel(s, romanticId(s), -10); const r = relOf(s, c.pid); r.sus = clamp((r.sus || 0) + 10, 0, 100); return `${romName(s)} denied everything. The car is still there.`; }],
  ],
});
EV('rx_double_booked', {
  ages: [18, 75], emoji: '📅', ctx: (s) => { const ls = romanticId(s) ? secretLovers(s) : []; return ls.length >= 2 ? { pid: ls[0].id, b: ls[1].id } : null; },
  text: (s, c) => `You double-booked Valentine's Day with ${nm(s, c.pid)} and ${nm(s, c.b)}. And ${romName(s)} expects dinner too.`,
  choices: [
    ['Run between three restaurants', (s, c) => { for (const id of [c.pid, c.b]) { if (!relOf(s, id)) continue; addRel(s, id, 3); relOf(s, id).sus = clamp((relOf(s, id).sus || 0) + 10, 0, 100); } add(s, { happy: -3, health: -1 }); return 'Three dinners, two desserts and one very confused waiter who saw you at all of them.'; }],
    ['Cancel on one of them', (s, c) => { addRel(s, c.b, -10); return `${nm(s, c.b)} got a text that said "sick, so sorry." ${nm(s, c.b)} did not believe it.`; }],
  ],
});
EV('rx_blackmail', {
  ages: [20, 85], emoji: '💰', tags: ['mature'], ctx: (s) => { const c = secretLover((s, p, r) => r.rel < 40)(s); return c && Object.assign(c, { amt: price(s, randInt(2, 10) * 1000) }); },
  text: (s, c) => `${nm(s, c.pid)} wants ${fmtMoney(c.amt)} to keep quiet about the affair.`,
  choices: [
    { label: 'Pay', sub: (s, c) => fmtMoney(c.amt), fx: (s, c) => { if (!pay(s, c.amt)) return cantAfford(c.amt); endRomance(s, c.pid, 'ex'); add(s, { happy: -4 }); return `You paid. ${nm(s, c.pid)} promised that was the end of it.`; } },
    ['Refuse', (s, c) => { if (chance(0.5)) { caughtPopup(s, c.pid, romanticId(s)); return { text: `${nm(s, c.pid)} made a phone call.`, quiet: true }; } endRomance(s, c.pid, 'ex'); return `${nm(s, c.pid)} was bluffing. It's over, and it stays a secret.`; }],
    ['Confess to your partner first', (s, c) => confessAffair(s, c.pid, romanticId(s))],
  ],
});
EV('rx_doorstep', {
  ages: [20, 85], emoji: '🚪', tags: ['mature'], ctx: secretLover((s, p, r) => r.rel >= 70),
  text: (s, c) => `${nm(s, c.pid)} showed up at your front door while ${romName(s)} was home.`,
  choices: [
    ['Introduce them as a coworker', (s, c) => { if (chance(0.35 + skill(s, 'charisma') / 200)) { const r = relOf(s, c.pid); r.sus = clamp((r.sus || 0) + 15, 0, 100); return 'Somehow, it worked. Your partner even offered them coffee.'; } caughtPopup(s, c.pid, romanticId(s)); return { text: 'Your partner did not believe the coworker story.', quiet: true }; }],
    ['Shut the door and text them later', (s, c) => { addRel(s, c.pid, -10); const r = relOf(s, c.pid); r.sus = clamp((r.sus || 0) + 10, 0, 100); return `"Who was that?" "Wrong house." ${nm(s, c.pid)} sent a very long text.`; }],
    ['Tell the truth, right there', (s, c) => confessAffair(s, c.pid, romanticId(s))],
  ],
});
EV('rx_fling_text', {
  ages: [18, 70], emoji: '📱', w: 1.5, ctx: aFling((s, p, r) => s.year - r.met >= 1),
  text: (s, c) => `A text from ${nm(s, c.pid)} at 2 a.m.: "u up?"`,
  choices: [
    ['Meet up', (s, c) => { flingBack(s); return flingAgain(s, c.pid); }],
    ['Leave them on read', (s, c) => { addRel(s, c.pid, -6); return 'You put the phone face down and went back to sleep. Eventually.'; }],
    ['Block them', (s, c) => { const n = nm(s, c.pid); dropRel(s, c.pid); return `${n} is blocked. Growth.`; }],
  ],
});
EV('rx_fling_boss', {
  ages: [20, 70], emoji: '💼', when: (s) => !!M(s).career && free(s), ctx: aFling((s, p, r) => s.year - r.met >= 1 && ageOf(s, p) >= 22),
  text: (s, c) => `Your new manager at work is ${nm(s, c.pid)}. From that night.`,
  choices: [
    ['Pretend you’ve never met', (s, c) => { flingBack(s); const ok = chance(0.5 + skill(s, 'charisma') / 200); if (M(s).career) M(s).career.perf = clamp(M(s).career.perf + (ok ? 2 : -6), 0, 100); return ok ? 'You both played it perfectly. Your performance review was glowing, and very formal.' : 'You called them by a nickname in the first meeting. Everyone noticed.'; }],
    ['Laugh about it in private', (s, c) => { flingBack(s); addRel(s, c.pid, 10); return `${nm(s, c.pid)} laughed too. You agreed it never happened. You both keep smiling in meetings.`; }],
    ['Ask for a transfer', (s, c) => { flingBack(s); if (M(s).career) M(s).career.perf = clamp(M(s).career.perf - 4, 0, 100); return 'HR asked why. You said "personal reasons" and stared at the wall.'; }],
  ],
});
EV('rx_fling_dating_friend', {
  ages: [18, 70], emoji: '😬', ctx: (s) => { const c = aFling()(s); const f = c && someone(s, ['friend', 'bestie', 'sibling'], (p) => ageOf(s, p) >= 18 && !p.partner && attractedTo(s.people[c.pid], p)); return c && f ? { pid: c.pid, f: f.pid } : null; },
  text: (s, c) => `${nm(s, c.pid)} is dating your ${kinTitle(s, c.f).toLowerCase()} ${nm(s, c.f)}. Nobody knows about your night together.`,
  choices: [
    [`Tell them the truth`, (s, c) => { flingBack(s); if (chance(0.5)) { addRel(s, c.f, 5); return `${nm(s, c.f)} laughed, then thanked you for being honest.`; } addRel(s, c.f, -10); return `${nm(s, c.f)} said it was fine. It was not fine.`; }],
    ['Keep it to yourself', (s) => { flingBack(s); add(s, { happy: -2 }); return 'Every group dinner is now a small test of your acting skills.'; }],
    ['Warn them to treat your friend right', (s, c) => { flingBack(s); addRel(s, c.pid, -4); return `${nm(s, c.pid)} said "obviously." You stared at each other for a long time.`; }],
  ],
});
EV('rx_fling_neighbor', {
  ages: [18, 80], emoji: '📦', ctx: aFling(),
  text: (s, c) => `${nm(s, c.pid)} just moved in next door.`,
  choices: [
    ['Wave awkwardly', (s) => { flingBack(s); return 'You wave every morning now. It never gets less awkward.'; }],
    ['Bring over some cookies', (s, c) => { flingBack(s); setRel(s, c.pid, 'friend', Math.max(relOf(s, c.pid).rel, 50)); return `You and ${nm(s, c.pid)} laughed about it over cookies. You're friends now. Just friends.`; }],
    ['Avoid the hallway forever', (s) => { flingBack(s); add(s, { happy: -2 }); return 'You now check the peephole before taking out the trash.'; }],
  ],
});
EV('rx_fling_viral', {
  ages: [18, 80], emoji: '📲', when: (s) => M(s).fame >= 25, ctx: aFling(),
  text: (s, c) => `${nm(s, c.pid)} posted a thread about a night with "someone famous." Everyone knows it's you.`,
  choices: [
    ['Laugh along in public', (s) => { flingBack(s); M(s).fame = clamp100(M(s).fame + 3); const rom = romanticId(s); if (rom && !isOpen(s)) addRel(s, rom, -8); return 'Your reply got more likes than the thread.'; }],
    ['Ask them to take it down', (s, c) => { flingBack(s); addRel(s, c.pid, -5); return chance(0.5) ? 'It came down a day later. The screenshots did not.' : `${nm(s, c.pid)} posted your message asking them to take it down.`; }],
    { label: 'Have a lawyer send a letter', sub: (s) => fmtMoney(price(s, 2000)), fx: (s, c) => { const cost = price(s, 2000); if (!pay(s, cost)) return cantAfford(cost); flingBack(s); dropRel(s, c.pid); return 'The thread is gone, and so is any chance of a sequel.'; } },
  ],
});
EV('rx_fling_kid', {
  ages: [21, 75], emoji: '👶', w: 0.3, ctx: aFling((s, p, r) => !r.kid && s.year - r.met >= 3 && P(s).gender === 'm' && p.gender === 'f'),
  text: (s, c) => `${nm(s, c.pid)} showed up with a ${s.year - relOf(s, c.pid).met - 1}-year-old who has your eyes.`,
  choices: [
    ['Get to know your child', (s, c) => { flingBack(s); return flingChild(s, c.pid, true); }],
    ['Ask for a DNA test first', (s, c) => { flingBack(s); if (chance(0.7)) return flingChild(s, c.pid, false); relOf(s, c.pid).kid = true; addRel(s, c.pid, -10); return 'The test came back: not yours. Nobody knows what to say.'; }],
    ['Deny it', (s, c) => { flingBack(s); relOf(s, c.pid).kid = true; addRel(s, c.pid, -25); add(s, { karma: -6 }); return `${nm(s, c.pid)} left without a word. You will always wonder.`; }],
  ],
});
// The child from a one-night stand joins your family.
function flingChild(s, pid, warm) {
  const mom = s.people[pid], me = P(s), r = relOf(s, pid);
  r.kid = true;
  const age = Math.max(1, s.year - r.met - 1);
  const kid = makePerson(s, Object.assign({ gender: chance(0.5) ? 'm' : 'f', age, country: mom.country, city: mom.city, last: mom.last, parents: [me.id, mom.id], traits: inheritTraits(me, mom) }, childStatsFrom(me, mom)));
  me.children.push(kid.id);
  mom.children.push(kid.id);
  setRel(s, kid.id, 'child', warm ? 45 : 30);
  tally(s, 'kids');
  const rom = romanticId(s);
  if (rom && rom !== pid) addRel(s, rom, r.cheat === rom ? -25 : -8);
  return { text: `${kid.first} is ${age} and loves dinosaurs. You have a ${genderWord(kid, 'son', 'daughter', 'child')}.${rom && r.cheat === rom ? ` ${nm(s, rom)} can count, and knows exactly when this happened.` : ''}`, person: kid.id };
}
EV('rx_fling_bar', {
  ages: [18, 70], emoji: '🍸', ctx: aFling((s, p, r) => s.year - r.met >= 2),
  text: (s, c) => `You ran into ${nm(s, c.pid)} at a bar. The spark is still there.`,
  choices: [
    ['Go home with them again', (s, c) => { flingBack(s); return flingAgain(s, c.pid); }],
    ['Just catch up', (s, c) => { flingBack(s); addRel(s, c.pid, 6); if (chance(0.4)) { setRel(s, c.pid, 'friend', relOf(s, c.pid).rel); return `You talked for hours. ${nm(s, c.pid)} is a friend now.`; } return 'You caught up over one drink and said good night.'; }],
    ['Pretend you didn’t see them', (s) => { flingBack(s); return 'You left through the kitchen.'; }],
  ],
});
EV('rx_fling_stalker', {
  ages: [18, 70], emoji: '🚨', tags: ['mature'], w: 0.5, ctx: aFling((s, p, r) => r.rel >= 55 && s.year - r.met <= 4),
  text: (s, c) => `${nm(s, c.pid)} keeps showing up wherever you go: your gym, your work, your street.`,
  choices: [
    ['Talk to them, firmly', (s, c) => { flingBack(s); if (chance(0.5)) { dropRel(s, c.pid); return 'You were kind and very clear. It worked.'; } return { text: `${nm(s, c.pid)} nodded, and was outside your work the next morning.`, tone: 'bad' }; }],
    { label: 'Get a restraining order', sub: (s) => fmtMoney(price(s, 1500)), fx: (s, c) => { const cost = price(s, 1500); if (!pay(s, cost)) return cantAfford(cost); flingBack(s); dropRel(s, c.pid); return 'The judge granted it in ten minutes. You slept well for the first time in weeks.'; } },
    ['Ignore it', (s) => { flingBack(s); add(s, { happy: -6 }); return 'It did not go away.'; }],
  ],
});
EV('rx_fling_party', {
  ages: [20, 80], emoji: '🥂', when: (s) => !!romanticId(s), ctx: aFling(),
  text: (s, c) => `At ${romName(s)}'s work party, you came face to face with ${nm(s, c.pid)}.`,
  choices: [
    ['Act like strangers', (s, c) => { flingBack(s); if (chance(0.2)) { addRel(s, romanticId(s), -10); return `"How do you two know each other?" Your partner noticed the look.`; } return 'You shook hands like strangers. Nobody noticed. You think.'; }],
    ['Tell your partner later', (s, c) => {
      flingBack(s);
      const rom = romanticId(s), r = relOf(s, c.pid);
      if (r.cheat !== rom) { addRel(s, rom, 3); return `It was before you two met. ${romName(s)} laughed and said the world is small.`; }
      addRel(s, rom, -25);
      if (relOf(s, rom).rel < 25) return { text: `It was while you were together, and that was the end of it. ${partnerLeaves(s, rom)}`.trim(), tone: 'bad' };
      return { text: 'It happened while you were together. The drive home was very, very quiet.', tone: 'bad' };
    }],
  ],
});
