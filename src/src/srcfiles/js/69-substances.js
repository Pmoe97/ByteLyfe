/* =====================================================================
 * 69-substances.js — the substance ladder. Behind the Mature and
 * Substances switches (both off by default), the habits the game already
 * has (alcohol, painkillers, party drugs) get company on a ladder (weed,
 * pills, party drugs, cocaine, opioids) and a real arc: tolerance,
 * cravings, withdrawal, relapse, an overdose scare, and the people who
 * notice. It is about consequences. It never says how anything is made
 * or taken, and it never makes any of it look like a good idea.
 *
 * M(s).subs = { [id]: { uses, last, tol, clean, relapses, peak, rehab } }
 *   tol      0-100, how much more it takes; it fades while you are off it
 *   clean    years since you last used
 *   peak     the worst your habit has been (relapse is using again after a bad one)
 *   rehab    the year you last went through rehab
 * M(s).used[id] = the year you last used (written by habit() in 19-health.js,
 *   so every old use of alcohol and party drugs counts too)
 * The ladder's habits are ADDICTIONS (06-data-health.js): severity 0-100, 50+ is hooked.
 * Nightlife, where most of it starts, is 70-nightlife.js.
 * ===================================================================== */

const SUB_TAGS = ['mature', 'mature_substances'];
const subsOn = () => tagsOn(SUB_TAGS);

Object.assign(ADDICTIONS, {
  weed: { name: 'Cannabis', emoji: '🌿', health: -1.5, happy: -1.5, money: 1200 },
  cocaine: { name: 'Cocaine', emoji: '❄️', health: -9, happy: -6, money: 12000, overdose: 0.05 },
  opioids: { name: 'Opioids', emoji: '💉', health: -12, happy: -8, money: 8000, overdose: 0.08 },
});
// The rungs. hook: habit added per use. tol: tolerance added. od: the chance a use goes wrong. risk: the chance buying it gets you arrested.
const SUBSTANCES = {
  alcohol: { tier: 0, name: 'alcohol', cost: 30, high: [2, 5], hook: 2.5, tol: 4, od: 0, risk: 0 },
  weed: { tier: 1, name: 'cannabis', cost: 25, high: [3, 6], hook: 3, tol: 5, od: 0, risk: 0.015 },
  pills: { tier: 2, name: 'pills', cost: 60, high: [4, 7], hook: 7, tol: 8, od: 0.004, risk: 0.02 },
  partydrugs: { tier: 2, name: 'party drugs', cost: 70, high: [5, 8], hook: 6, tol: 7, od: 0.004, risk: 0.03 },
  cocaine: { tier: 3, name: 'cocaine', cost: 150, high: [6, 9], hook: 10, tol: 10, od: 0.01, risk: 0.04 },
  opioids: { tier: 4, name: 'opioids', cost: 120, high: [6, 10], hook: 14, tol: 12, od: 0.02, risk: 0.05 },
};
const SUB_IDS = Object.keys(SUBSTANCES);
const SUB_DRUGS = SUB_IDS.filter((id) => SUBSTANCES[id].tier >= 1);

CRIMES.possession = { name: 'Drug possession', minAge: 14, sentence: [0, 2], conviction: 0.8, karma: -3, felony: false, verb: 'drug possession' };
Object.assign(KIN_LABELS, { dealer: ['Dealer', 'Dealer', 'Dealer'], sponsor: ['Sponsor', 'Sponsor', 'Sponsor'] });
REL_GROUPS.find((g) => g.id === 'other').kinds.push('dealer');
REL_GROUPS.find((g) => g.id === 'friends').kinds.push('sponsor');
Object.assign(REL_DECAY, { dealer: 3, sponsor: 2 });
Object.assign(WEB_TIE_KIND, { dealer: 'friend', sponsor: 'friend' });

/* ---- state ---------------------------------------------------------------------- */
function subsOf(s) { const m = M(s); return m.subs || (m.subs = {}); }
function subState(s, id) { const a = subsOf(s); return a[id] || (a[id] = { uses: 0, last: 0, tol: 0, clean: 0, relapses: 0, peak: 0, rehab: 0 }); }
function subSev(s, id) { return M(s).addictions[id] || 0; }
function subWorst(s) {
  const ids = SUB_IDS.filter((id) => subSev(s, id) >= 15).sort((a, b) => subSev(s, b) - subSev(s, a));
  return ids[0] || null;
}
const subSponsor = (s) => relPeople(s, ['sponsor'])[0] || null;
// What the people around you would offer you next: the ladder goes up, and only after the rung below.
function subMaxTier(s) {
  const a = subsOf(s), used = (id) => (a[id] ? a[id].uses : 0);
  let t = 1;
  if (used('weed') >= 2 || used('pills') + used('partydrugs') >= 1) t = 2;
  if (used('pills') + used('partydrugs') >= 2) t = 3;
  if (used('cocaine') >= 2 || subSev(s, 'pills') >= 30) t = 4;
  return t;
}

/* ---- using ------------------------------------------------------------------------ */
// One use: what it gives, what it costs, what it starts. Returns { high, od, relapse } or null if you cannot pay.
function subsUse(s, id, o) {
  o = o || {};
  const X = SUBSTANCES[id], st = subState(s, id);
  const cost = o.free ? 0 : price(s, X.cost);
  if (cost && !pay(s, cost)) return null;
  const strength = 1 - st.tol / 200;
  const high = Math.max(1, Math.round(randInt(X.high[0], X.high[1]) * strength));
  const relapse = st.peak >= 40 && subSev(s, id) < 15 && st.clean >= 1;
  if (relapse) { st.relapses++; tally(s, 'subRelapse'); }
  add(s, { happy: high, health: -Math.round(X.tier * 0.6) });
  habit(s, id, X.hook * (1 + st.tol / 200));
  st.uses++; st.last = s.year; st.clean = 0;
  if (st.first == null) st.first = A(s);
  st.tol = clamp100(st.tol + X.tol);
  st.peak = Math.max(st.peak, subSev(s, id));
  tally(s, 'substanceUses');
  return { high, relapse, od: !!X.od && chance(X.od * (1 + st.tol / 100) * (o.mixed ? 2.5 : 1)) };
}
// Something goes very wrong. Returns true if it killed you.
function subsOverdose(s, id) {
  const X = SUBSTANCES[id] || { tier: 2 };
  const helper = relPeople(s, ['friend', 'bestie', 'partner', 'spouse', 'lover', 'fwb']).find((p) => relOf(s, p.id).rel >= 40 && ageOf(s, p) >= 18);
  if (!chance(clamp((helper ? 0.8 : 0.45) - X.tier * 0.03, 0.25, 0.85))) { die(s, 'an overdose'); return true; }
  add(s, { health: -15, happy: -6 });
  tally(s, 'overdoses');
  popup(s, {
    emoji: '🏥', title: 'A second chance', handler: 'subWake', ctx: { id }, person: helper ? helper.id : null,
    text: helper ? `${helper.first} found you on the floor and called for help. You woke up in a hospital, with a tube in your arm and ${helper.first} asleep in the chair.` : 'You woke up in a hospital. A stranger had found you and called it in. You will never know who.',
    choices: [{ label: 'Go to rehab', value: 'rehab' }, { label: 'Swear off it', value: 'swear' }, { label: 'Shrug it off', value: 'shrug', tone: 'bad' }],
  });
  return false;
}
onChoice('subWake', (s, ctx, v) => {
  if (v === 'rehab') { ACTIONS.rehab.run(s); return; }
  if (v === 'swear') { habit(s, ctx.id, -15); add(s, { karma: 1 }); return 'You said it out loud, to a nurse who had heard it before. You meant it. That is a start.'; }
  habit(s, ctx.id, 5);
  return { text: 'You told yourself it was a fluke, and signed yourself out the next morning.', tone: 'bad' };
});

/* ---- the year: withdrawal, cravings, tolerance ------------------------------------------ */
function subsYear(s) {
  if (A(s) < 18 || s.dead || !subsOn()) return;
  const used = M(s).used || {};
  for (const id of SUB_IDS) {
    const sev = subSev(s, id);
    if (!sev && !(subsOf(s)[id])) continue;
    const st = subState(s, id);
    st.peak = Math.max(st.peak, sev);
    if (!(used[id] >= s.year - 1)) {
      st.clean++;
      st.tol = Math.max(0, st.tol - 15);
      if (sev >= 30) {
        add(s, { health: -Math.round(sev / 14), happy: -Math.round(sev / 10) });
        log(s, `😣 A year without ${SUBSTANCES[id].name} was a hard one. Your body and your head both noticed.`, 'bad');
      }
    } else st.clean = 0;
    if (sev >= 30 && !inPrison(s) && !s.pending.some((p) => p.handler === 'subCraving') && chance(0.45)) subsCraving(s, id);
  }
}
function subsCraving(s, id) {
  const call = subSponsor(s) || pickRel(s, ['friend', 'bestie']);
  const choices = [{ label: 'Hold on', value: 'hold', sub: 'It passes, mostly' }];
  if (call) choices.push({ label: subSponsor(s) ? 'Call your sponsor' : `Call ${nm(s, pickRel(s, ['friend', 'bestie']))}`, value: 'call' });
  choices.push({ label: 'Give in', value: 'use', tone: 'bad' });
  popup(s, { emoji: SUBSTANCES[id].tier ? ADDICTIONS[id].emoji : '🍺', title: 'A craving', handler: 'subCraving', ctx: { id }, text: `It has been a while, and ${SUBSTANCES[id].name} is all you can think about tonight. Your phone is right there.`, choices });
}
onChoice('subCraving', (s, ctx, v) => {
  const id = ctx.id, st = subState(s, id), sev = subSev(s, id);
  if (!sev) return { text: 'It passed.', quiet: true, nolog: true };
  if (v === 'use') { const r = subsUse(s, id); return r ? { text: `You gave in. ${r.relapse ? 'After all that, you gave in. Tomorrow will be harder to explain to yourself.' : 'It felt like relief, and then like a bill coming due.'}`, tone: 'bad' } : cantAfford(price(s, SUBSTANCES[id].cost)); }
  const helped = v === 'call';
  const odds = clamp(0.5 - sev / 200 + st.clean * 0.05 + (helped ? (subSponsor(s) ? 0.3 : 0.12) : 0) + (trait(s, 'addictive') ? -0.12 : 0), 0.1, 0.9);
  if (chance(odds)) { habit(s, id, -6); add(s, { karma: 1, happy: 2 }); return { text: helped ? 'You called, and they picked up on the second ring. You talked until the feeling went away, which took about an hour.' : 'You sat with it. It was a long hour, and then it was over.', tone: 'good' }; }
  const r = subsUse(s, id);
  return { text: r ? 'You held on for a while. Not long enough.' : 'You held on, and could not afford it anyway.', tone: 'bad' };
});

/* ---- recovery ----------------------------------------------------------------------------- */
// Rehab (19-health.js) calls this when it works.
function subsRehab(s, id) { const st = subsOf(s)[id]; if (st) { st.rehab = s.year; st.tol = 0; st.clean = 0; } }
defAction({
  id: 'sub_meeting', cat: 'health', label: 'Go to a meeting', emoji: '🪑', desc: 'Folding chairs, bad coffee, people who understand.', tags: SUB_TAGS,
  when: (s) => free(s) && A(s) >= 16 && !!subWorst(s) && count(s, 'sub_meeting') < 2,
  sub: (s) => { const w = subWorst(s); return w ? `For your ${SUBSTANCES[w].name} habit` : ''; },
  run: (s) => {
    const n = bump(s, 'sub_meeting'), id = subWorst(s);
    habit(s, id, -randInt(5, 12) / n);
    add(s, { happy: 2, karma: 1 });
    tally(s, 'meetings');
    if (lifeCount(s, 'meetings') >= 3 && !subSponsor(s)) {
      const p = makeAdultNear(s, { minAge: 30, maxAge: 65 });
      setRel(s, p.id, 'sponsor', 60);
      return { text: `You said your name in a circle of folding chairs, and it did not kill you. Afterward, ${p.first} gave you a number on a napkin. "Call it. I mean it." ${p.first} is your sponsor now.`, tone: 'good', person: p.id };
    }
    return pick(['You said a few sentences you had not said aloud before. Nobody flinched.', 'You listened to a stranger describe your last year, nearly word for word.', 'The coffee was terrible. The room was the best thing you did all week.']);
  },
});
defAction({
  id: 'sub_buy', cat: 'person', target: 'person', label: 'Buy something', emoji: '📞', desc: 'You know how to reach them.', tags: SUB_TAGS,
  when: (s, pid) => reachable(s, pid) && A(s) >= 18 && relKind(s, pid) === 'dealer' && !count(s, 'sub_buy'),
  run: (s, pid) => {
    const mt = subMaxTier(s);
    const choices = SUB_DRUGS.filter((id) => SUBSTANCES[id].tier <= mt && (subsOf(s)[id] ? subsOf(s)[id].uses > 0 : SUBSTANCES[id].tier === 1)).map((id) => ({ label: `${ADDICTIONS[id].emoji} ${cap(SUBSTANCES[id].name)}`, sub: fmtMoney(price(s, SUBSTANCES[id].cost)), value: id, disabled: M(s).money < price(s, SUBSTANCES[id].cost) }));
    choices.push({ label: 'Never mind', value: null });
    popup(s, { emoji: '📞', title: nm(s, pid), person: pid, handler: 'subBuy', ctx: { pid }, text: `${nm(s, pid)} picks up on the first ring. "Yeah. What do you need?"`, choices });
  },
});
onChoice('subBuy', (s, ctx, id) => {
  if (!id) return;
  bump(s, 'sub_buy');
  const X = SUBSTANCES[id];
  if (chance(0.1)) { const cost = Math.min(M(s).money, price(s, X.cost)); M(s).money -= cost; return { text: `You handed over ${fmtMoney(cost)} and got nothing for it. There is nobody to complain to.`, tone: 'bad' }; }
  if (chance(X.risk)) { const r = arrest(s, 'possession'); return { text: `A patrol car was waiting on the corner. ${r && r.text ? r.text : ''}`.trim(), tone: 'bad' }; }
  const r = subsUse(s, id);
  if (!r) return cantAfford(price(s, X.cost));
  let out = `You bought it, and used it. For an hour you did not feel anything you did not want to.`;
  if (r.od) { if (subsOverdose(s, id)) return; out += ' It was too much.'; }
  return { text: out, tone: 'bad' };
});
function subsDealer(s) {
  const have = relPeople(s, ['dealer']);
  if (have.length && chance(0.6)) return have[0];
  if (have.length >= 2) return have[0];
  const p = makeAdultNear(s, { minAge: 20, maxAge: 45 });
  setRel(s, p.id, 'dealer', randInt(25, 45));
  return p;
}

/* ---- events ------------------------------------------------------------------------------------ */
const subUsedLately = (s) => SUB_DRUGS.some((id) => { const a = subsOf(s)[id]; return a && a.last >= s.year - 1 && id !== 'pills'; });
EV('sb_peer', {
  ages: [18, 55], emoji: '🛋️', title: 'Passed around', tags: SUB_TAGS, cooldown: 3,
  when: (s) => free(s) && !!pickRel(s, ['friend', 'bestie']),
  ctx: (s) => someone(s, ['friend', 'bestie']),
  text: (s, c) => `At ${nm(s, c.pid)}’s place, something is going around the room. ${nm(s, c.pid)} holds it out to you, with a look that says it is no big deal.`,
  choices: [
    ['No thanks', (s, c) => { addRel(s, c.pid, -1); add(s, { karma: 1 }); return `${nm(s, c.pid)} shrugged and passed it on. Nobody said a thing. You felt both very sensible and very square.`; }],
    { label: 'Just this once', tone: 'bad', fx: (s, c) => { const id = weighted(SUB_DRUGS.filter((x) => SUBSTANCES[x].tier <= Math.min(2, subMaxTier(s))), (x) => 4 - SUBSTANCES[x].tier); const r = subsUse(s, id, { free: true }); addRel(s, c.pid, 3); return { text: `You said "just this once." ${r ? vary('It was {~fine|pretty good|honestly pretty great}. That is the part that worries you.') : ''}`, tone: 'bad' }; } },
    ['Tell them you are worried', (s, c) => { if (chance(0.35 + skill(s, 'charisma') / 300)) { addRel(s, c.pid, 4); return `${nm(s, c.pid)} looked at you for a long moment, and put it away. "Yeah. Okay." It was a good night after that.`; } addRel(s, c.pid, -6); return `${nm(s, c.pid)} said you were being dramatic, and the room agreed.`; }],
  ],
});
EV('sb_drug_test', {
  ages: [18, 65], emoji: '🧪', title: 'A random screening', tags: SUB_TAGS, cooldown: 4,
  when: (s) => free(s) && !!M(s).career && !JOBS[M(s).career.id].special,
  text: 'An email from HR: a random screening this week, and your name is on the list.',
  choices: [
    ['Take it', (s) => {
      const used = subUsedLately(s), hard = SUB_DRUGS.some((id) => SUBSTANCES[id].tier >= 3 && subsOf(s)[id] && subsOf(s)[id].last >= s.year - 1);
      if (used && chance(hard ? 0.9 : 0.6)) { webRepAdd(P(s), { scandal: 3, name: -3 }); fire(s, 'The screening came back positive. You were walked to your car with a cardboard box.'); return; }
      return used ? 'You held your breath, and it came back clean. You sat in the car afterward for ten minutes.' : 'It came back clean. It was almost insulting how easy it was.';
    }],
    ['Ask to reschedule', (s) => { if (chance(0.5)) return 'HR said the end of the month was fine. You made very good use of it.'; M(s).career.perf = clamp100(M(s).career.perf - 6); return { text: 'HR said that was not how it worked. You came across as someone with a reason.', tone: 'bad' }; }],
    ['Resign before it', (s) => { const t = careerTitle(s); leaveJob(s, 'resigned'); add(s, { happy: -4 }); return `You wrote a two-line resignation as a ${t}, citing "personal reasons." Everyone in the office knew exactly what that meant.`; }],
  ],
});
EV('sb_intervention', {
  ages: [18, 90], emoji: '🪑', title: 'The kitchen table', tags: SUB_TAGS, cooldown: 3,
  when: (s) => free(s) && SUB_IDS.some((id) => subSev(s, id) >= 55) && !!pickRel(s, ['partner', 'spouse', 'parent', 'bestie', 'sibling'], (p) => relOf(s, p.id).rel >= 35),
  ctx: (s) => ({ pid: pickRel(s, ['partner', 'spouse', 'parent', 'bestie', 'sibling'], (p) => relOf(s, p.id).rel >= 35), id: subWorst(s) }),
  text: (s, c) => `${nm(s, c.pid)} asked you to sit down. There is a printed list on the table, in their handwriting, of the last year. It is a very honest list.`,
  choices: [
    ['Listen, and agree to get help', (s, c) => { addRel(s, c.pid, 10); ACTIONS.rehab.run(s); return `${nm(s, c.pid)} did not say "I told you so." They just reached across the table and held your hand until it stopped shaking.`; }],
    ['Promise to cut back', (s, c) => { habit(s, c.id, -8); if (chance(0.5)) { addRel(s, c.pid, 3); return 'They wanted to believe you. They said so. It was the kindest thing anyone said to you all year.'; } addRel(s, c.pid, -4); return { text: 'They nodded the way you nod at someone who has said it before. That was the worst part.', tone: 'bad' }; }],
    { label: 'Storm out', tone: 'bad', fx: (s, c) => { addRel(s, c.pid, -15); add(s, { happy: -3 }); return { text: 'You slammed the door and sat in your car for an hour. The list was still on the table when you got back.', tone: 'bad' }; } },
  ],
});
EV('sb_friend_od', {
  ages: [18, 60], emoji: '🚨', title: 'Not breathing right', tags: SUB_TAGS, cooldown: 5,
  when: (s) => free(s) && !!pickRel(s, ['friend', 'bestie'], (p) => relOf(s, p.id).rel >= 45 && ageOf(s, p) >= 18),
  ctx: (s) => someone(s, ['friend', 'bestie'], (p) => relOf(s, p.id).rel >= 45 && ageOf(s, p) >= 18),
  text: (s, c) => `At the end of a long night, ${nm(s, c.pid)} is slumped against the wall of the back room. Their lips are a bad color, and nobody else has noticed.`,
  choices: [
    ['Call emergency services at once', (s, c) => { addRel(s, c.pid, 20); add(s, { karma: 4 }); if (chance(0.9)) return { text: `The paramedics said you did exactly the right thing. ${nm(s, c.pid)} spent three days in the hospital, and a lot of time after that being grateful.`, tone: 'good' }; npcDies(s, s.people[c.pid], 'an overdose', { murdered: false }); return { text: `You called right away. It was not enough. You will always know you did everything you could, and it will never feel like enough.`, tone: 'bad' }; }],
    ['Try to wake them yourself', (s, c) => { if (chance(0.6)) { addRel(s, c.pid, 10); return 'They came around, groaning. You did not take your eyes off them for the rest of the night. You should have called someone anyway.'; } npcDies(s, s.people[c.pid], 'an overdose', { murdered: false }); add(s, { happy: -8 }); return { text: 'You tried everything you knew. It was not the right thing, and it was too late.', tone: 'bad' }; }],
    { label: 'Panic and leave', tone: 'bad', fx: (s, c) => { add(s, { karma: -8, happy: -6 }); if (chance(0.55)) { npcDies(s, s.people[c.pid], 'an overdose', { murdered: false }); return { text: `You walked out into the cold air and kept walking. Somebody else found ${nm(s, c.pid)}, much later. You think about that every day.`, tone: 'bad' }; } addRel(s, c.pid, -30); return { text: `${nm(s, c.pid)} woke up on the floor, alone, and remembered who had walked past. They have not spoken to you since.`, tone: 'bad' }; } },
  ],
});
EV('sb_dealer_call', {
  ages: [18, 60], emoji: '📞', title: 'An unknown number, a familiar voice', tags: SUB_TAGS, cooldown: 3,
  when: (s) => free(s) && relPeople(s, ['dealer']).length > 0,
  ctx: (s) => ({ pid: relPeople(s, ['dealer'])[0].id }),
  text: (s, c) => `${nm(s, c.pid)} calls, friendly. "Hey, been a while. Got something new in. You would like it."`,
  choices: [
    ['Delete the number', (s, c) => { dropRel(s, c.pid); add(s, { karma: 1, happy: 1 }); for (const id of SUB_IDS) if (subSev(s, id) > 0) habit(s, id, -2); return 'You deleted the number, and then deleted it again from the call log. It was only a phone number, and it was not.'; }],
    ['Let it ring out', () => 'You watched the phone ring until it stopped. It left a message, which you did not play.'],
    { label: 'Hear what they have', tone: 'bad', fx: (s, c) => { const mt = Math.min(4, subMaxTier(s) + 1); const id = weighted(SUB_DRUGS.filter((x) => SUBSTANCES[x].tier === mt), () => 1) || weighted(SUB_DRUGS.filter((x) => SUBSTANCES[x].tier <= mt), (x) => SUBSTANCES[x].tier); const r = subsUse(s, id, { free: true }); if (r && r.od) { if (subsOverdose(s, id)) return; } return { text: 'The first one was free. They always are.', tone: 'bad' }; } },
  ],
});
EV('sb_morning', {
  ages: [18, 80], emoji: '🌫️', title: 'Another Monday you cannot account for', tags: SUB_TAGS, cooldown: 3,
  when: (s) => free(s) && subSev(s, 'alcohol') >= 40,
  text: 'It is Monday. You are not sure what you did on Sunday, and there is a text from someone saying "thanks for last night, you were hilarious" that makes your stomach turn.',
  choices: [
    ['Cut back for real', (s) => { habit(s, 'alcohol', -8); add(s, { happy: 1, karma: 1 }); return 'You poured it out. Not all of it. A start.'; }],
    ['Laugh it off', (s) => { add(s, { happy: 1, health: -1 }); return 'You laughed it off, as you always do. It was a little less convincing this time.'; }],
    ['Go to a meeting', (s) => { habit(s, 'alcohol', -10); add(s, { karma: 1 }); return 'You went, and stood outside for five minutes first. A woman held the door and did not ask anything.'; }],
  ],
});
EV('sb_clean_year', {
  ages: [18, 100], emoji: '🌅', title: 'A year', tags: SUB_TAGS, cooldown: 2,
  when: (s) => SUB_IDS.some((id) => { const a = subsOf(s)[id]; return a && a.peak >= 40 && a.clean >= 1 && subSev(s, id) < 10 && !a.marked; }),
  ctx: (s) => ({ id: SUB_IDS.find((id) => { const a = subsOf(s)[id]; return a && a.peak >= 40 && a.clean >= 1 && subSev(s, id) < 10 && !a.marked; }) }),
  auto: (s, c) => { subsOf(s)[c.id].marked = true; add(s, { happy: 8, karma: 3, health: 2 }); tally(s, 'cleanYear'); const sp = subSponsor(s); return `A full year without ${SUBSTANCES[c.id].name}. ${sp ? sp.first + ' sent a card with one word on it: "Proud."' : 'You did not tell anyone. You did not need to.'}`; },
  text: 'You woke up and realized what today is.', popup: true,
});
ACHIEVEMENTS.push(
  { id: 'a_year_clean', name: 'A Year', emoji: '🌅', desc: 'Go a full year clean after a serious habit.', check: (s) => lifeCount(s, 'cleanYear') >= 1 },
  { id: 'second_chance', name: 'Second Chance', emoji: '🏥', desc: 'Survive an overdose.', check: (s) => lifeCount(s, 'overdoses') >= 1 },
);
