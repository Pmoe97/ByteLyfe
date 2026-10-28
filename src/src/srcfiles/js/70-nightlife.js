/* =====================================================================
 * 70-nightlife.js — a night out, as a few decisions. Behind the Mature
 * and Substances switches (69-substances.js has the ladder), "Go out on
 * the town" stops being one die roll and becomes a night: pick a place,
 * pick how hard you go, see who you meet, get offered things, deal with
 * what happens, and decide how you get home. Adults only.
 *
 * s.nightlife['cc:city'] = [{ id, kind: 'bar' | 'club' | 'after', name, vibe }]
 *   made the first time you look, kept for the family line
 * M(s).night = { scene, n }
 *   scene  0-100, how known you are on the scene; after-hours places only open at 25
 *
 * A night is a chain of popups sharing one small context:
 *   vibe -> (offers, incidents, in a shuffled order) -> home -> the morning
 * The people you meet are regulars (65-work.js's wkPerson), a dealer may turn up
 * (69-substances.js's subsDealer), and with Intimacy on you can go home with someone
 * (68-intimacy.js).
 * ===================================================================== */

const NIGHT_BARS = ['The Rusty Anchor', 'Tin Roof', 'The Gilded Fox', 'Corner Pocket', 'The Laughing Duck', 'Old Number Seven'];
const NIGHT_CLUBS = ['Velvet', 'Neon Lotus', 'Static', 'Afterglow', 'Halcyon', 'The Understudy'];
const NIGHT_AFTER = ['The Basement', 'Room 9', 'The Warehouse', 'Nobody’s House'];
const NIGHT_COST = { bar: 40, club: 90, after: 60 };
const NIGHT_EMOJI = { bar: '🍺', club: '💃', after: '🌃' };
const NIGHT_WORD = { bar: 'A neighborhood bar', club: 'A real club', after: 'After-hours, invite only' };

function nightMe(s) { const m = M(s); return m.night || (m.night = { scene: 0, n: 0 }); }
function nightVenues(s) {
  const p = P(s), key = p.country + ':' + p.city, all = s.nightlife || (s.nightlife = {});
  if (!all[key]) all[key] = [
    { id: 'bar', kind: 'bar', name: pick(NIGHT_BARS), vibe: randInt(15, 40) },
    { id: 'club', kind: 'club', name: pick(NIGHT_CLUBS), vibe: randInt(45, 75) },
    { id: 'after', kind: 'after', name: pick(NIGHT_AFTER), vibe: randInt(70, 95) },
  ];
  return all[key];
}

// "Go out on the town" (21-activities.js) calls this when Substances is on.
function nightMenu(s) {
  const me = nightMe(s);
  const choices = nightVenues(s).map((v) => {
    const cost = price(s, NIGHT_COST[v.kind]), locked = v.kind === 'after' && me.scene < 25;
    return { label: `${NIGHT_EMOJI[v.kind]} ${v.name}`, value: v.id, disabled: locked || M(s).money < cost, sub: locked ? 'Invite only. Nobody there knows you yet.' : `${NIGHT_WORD[v.kind]} · ${fmtMoney(cost)}` };
  });
  choices.push({ label: 'Stay in', value: null });
  popup(s, { emoji: '🕺', title: 'Where to tonight?', text: 'The city is out. Where do you want to be?', handler: 'nightGo', choices });
}
onChoice('nightGo', (s, ctx, vid) => {
  if (!vid) return;
  const v = nightVenues(s).find((x) => x.id === vid);
  if (!v || A(s) < 18 || !free(s)) return;
  const cost = price(s, NIGHT_COST[v.kind]);
  if (!pay(s, cost)) return cantAfford(cost);
  bump(s, 'nightlife');
  const pk = nightPlaceKey(s, v); // the place remembers you (81-web2.js)
  placeVisit(s, pk, { kind: 'night', name: v.name, emoji: NIGHT_EMOJI[v.kind] });
  const c = { kind: v.kind, name: v.name, vibe: clamp100(v.vibe + placeVibe(s, pk)), pk, k: 'vibe', drunk: 0, hi: [], met: null, plan: [], spent: cost, gain: 0, lines: [] };
  popup(s, {
    emoji: NIGHT_EMOJI[v.kind], title: v.name, handler: 'nightStep', ctx: c,
    text: { bar: 'Low light, a jukebox, and a bartender who nods at you like they remember you. It could be a quiet night. It could not.', club: 'The bass hits your ribs before the door closes behind you. Everybody is looking at everybody else.', after: 'No sign, no name on the door, a stranger checks you off a list. Inside, it is four in the morning for a lot of people, and it will not stop.' }[v.kind],
    choices: [{ label: 'Keep to a quiet corner', value: 0 }, { label: 'Dance, mingle, enjoy it', value: 1 }, { label: 'Go all out', value: 2, tone: 'bad' }],
  });
});

/* ---- the chain ------------------------------------------------------------------------ */
const NIGHT_INCIDENTS = {
  fight: {
    text: 'A fight starts by the door, and a friend of a friend is in the middle of it.',
    choices: [
      ['Pull them out of it', (s, c) => { if (chance(clamp(0.4 + skill(s, 'martial') / 250 + skill(s, 'charisma') / 400, 0.2, 0.8))) { add(s, { karma: 2 }); return 'You got a hand on their collar and hauled them out. Nobody got hurt, which felt like a minor miracle.'; } add(s, { health: -randInt(3, 8) }); return 'You tried to step in and caught an elbow with your face.'; }],
      ['Let security handle it', () => 'You stepped back. Security had it under control in under a minute, and you bought the next round.'],
      ['Leave before it spreads', (s, c) => { c.gain -= 1; return 'You left through the side door. It was a perfectly good decision, and you were not proud of it.'; }],
    ],
  },
  friend: {
    text: 'A friend can barely stand, and keeps insisting they are fine.',
    choices: [
      ['Take care of them', (s, c) => { add(s, { karma: 3 }); const f = pickRel(s, ['friend', 'bestie']); if (f) addRel(s, f, 6); c.late = true; return 'You got them water, a seat and a ride. They will not remember it, and you will.'; }],
      ['Put them in a taxi', (s, c) => { const cost = price(s, 30); if (M(s).money >= cost) { M(s).money -= cost; c.spent += cost; return `You paid for a taxi and gave the driver the address. Responsible, and ${fmtMoney(cost)} lighter.`; } return 'You had no money for a taxi. You walked them home.'; }],
      ['Leave them to it', (s) => { add(s, { karma: -3 }); const f = pickRel(s, ['friend', 'bestie']); if (f) addRel(s, f, -10); return { text: 'You told yourself they were an adult. In the morning, the message from them was one line long.', tone: 'bad' }; }],
    ],
  },
  phone: {
    text: 'You reach for your phone and your pocket is empty.',
    choices: [
      ['Retrace your steps', (s) => { if (chance(0.5)) return 'You found it under a table, with a stranger’s drink on it. Nobody had touched it. You were very lucky.'; const cost = price(s, 200); M(s).money -= Math.min(M(s).money, cost); return { text: `It was gone. A new one cost ${fmtMoney(cost)}.`, tone: 'bad' }; }],
      ['Cancel it and move on', (s) => { const cost = price(s, 150); M(s).money -= Math.min(M(s).money, cost); return `You froze the account, called it a night's price, and bought a cheap one on the way home. It was ${fmtMoney(cost)}.`; }],
    ],
  },
  bouncer: {
    text: 'The door staff want a word. You are a little more of a presence than the room wants.',
    choices: [
      ['Apologize and settle down', (s, c) => { c.drunk = Math.max(0, c.drunk - 1); return 'You said sorry, drank some water and sat down. The bouncer nodded once.'; }],
      ['Argue your case', (s, c) => { if (chance(0.35 + skill(s, 'charisma') / 300 - c.drunk * 0.08)) return 'You talked your way back in with a smile and a better story than the truth.'; c.gain -= 2; return { text: 'The argument was shorter than you hoped. You spent the rest of the night on the pavement.', tone: 'bad' }; }],
    ],
  },
};
function nightPlan(c, s) {
  const plan = [];
  if (chance(clamp(0.45 + c.vibe / 180 + c.intensity * 0.1 + nightMe(s).scene / 400, 0.25, 0.92))) plan.push('offer');
  if (c.intensity === 2 && chance(0.5)) plan.push('offer');
  if (chance(0.45)) plan.push('incident');
  return shuffle(plan).concat(['home']);
}
function nightNext(s, c) {
  const nx = c.plan.shift();
  if (nx === 'offer') return nightOffer(s, c);
  if (nx === 'incident') return nightIncident(s, c);
  return nightHome(s, c);
}
function nightOffer(s, c) {
  const drinkOk = A(s) >= country(s).drink;
  const maxTier = Math.min(subMaxTier(s), c.kind === 'bar' ? 1 : 4);
  const pool = SUB_DRUGS.filter((id) => SUBSTANCES[id].tier <= maxTier);
  const kind = drinkOk && (!pool.length || chance(0.55)) ? 'round' : pool.length ? 'drug' : null;
  if (!kind) return nightNext(s, c);
  if (kind === 'round') {
    c.k = 'round';
    return popup(s, { emoji: '🍸', title: c.name, handler: 'nightStep', ctx: c, text: 'Someone is buying a round.', choices: [{ label: 'Stick to water', value: 0 }, { label: 'A couple of drinks', value: 1 }, { label: 'Do shots with the group', value: 2, tone: 'bad' }] });
  }
  const id = weighted(pool, (x) => 5 - SUBSTANCES[x].tier);
  c.k = 'drug'; c.offer = id;
  const who = c.met && s.people[c.met] ? s.people[c.met].first : pick(['A friendly stranger', 'Someone you half-know', 'A guy by the bar']);
  popup(s, {
    emoji: ADDICTIONS[id].emoji, title: c.name, handler: 'nightStep', ctx: c, person: c.met || null,
    text: `${who} leans in, smiling. "Want some? It is on me." ${SUBSTANCES[id].tier >= 3 ? 'It is the kind of offer that comes with a very particular look.' : 'It is passed around like it is nothing.'}`,
    choices: [{ label: 'No thanks', value: 0 }, { label: 'Take it', value: 1, tone: 'bad' }],
  });
}
function nightIncident(s, c) {
  const id = pick(Object.keys(NIGHT_INCIDENTS).filter((k) => k !== 'bouncer' || c.drunk >= 2 || c.intensity === 2));
  c.k = 'incident'; c.inc = id;
  placeIncident(s, c.pk, id); // a bad night is remembered by the place (81-web2.js)
  popup(s, { emoji: '🚨', title: c.name, handler: 'nightStep', ctx: c, text: NIGHT_INCIDENTS[id].text, choices: NIGHT_INCIDENTS[id].choices.map((x, i) => ({ label: x[0], value: i })) });
}
function nightHome(s, c) {
  c.k = 'home';
  const choices = [{ label: 'Take a taxi', value: 'taxi', sub: fmtMoney(price(s, 30)) }];
  const f = pickRel(s, ['friend', 'bestie']);
  if (f && c.late !== true) choices.push({ label: `Crash at ${nm(s, f)}’s`, value: 'friend' });
  if (c.drunk <= 2) choices.push({ label: 'Walk home', value: 'walk' });
  if (M(s).license && M(s).assets.some((a) => a.kind === 'car')) choices.push({ label: 'Drive yourself', value: 'drive', tone: c.drunk >= 1 || c.hi.length ? 'bad' : '', sub: c.drunk >= 1 || c.hi.length ? 'You are not sober' : '' });
  if (intimOn() && c.met && s.people[c.met] && ageOf(s, s.people[c.met]) >= 18) choices.push({ label: `Go home with ${nm(s, c.met)}`, value: 'home' });
  popup(s, { emoji: '🌙', title: 'The end of the night', handler: 'nightStep', ctx: c, text: `It is late, and ${c.drunk >= 2 || c.hi.length ? 'the room is a little unsteady' : 'you are in good shape'}. How do you get home?`, choices });
}
onChoice('nightStep', (s, c, v) => {
  if (A(s) < 18 || !free(s)) return;
  if (c.k === 'vibe') {
    c.intensity = v;
    const me = nightMe(s);
    me.scene = clamp100(me.scene + [1, 3, 5][v]);
    const bits = [];
    add(s, { happy: [1, 3, 5][v] + (c.vibe > 60 ? 1 : 0) });
    if (chance(clamp(0.25 + me.scene / 250 + v * 0.1, 0.2, 0.7))) {
      const p = wkPerson(s, 'regular');
      c.met = p.id;
      addRel(s, p.id, 6);
      placeRegular(s, c.pk, p.id);
      bits.push(`You ended up talking to ${p.first} for most of an hour.`);
    }
    c.plan = nightPlan(c, s);
    nightNext(s, c);
    return bits.length ? { text: bits.join(' '), quiet: false, nolog: true } : undefined;
  }
  if (c.k === 'round') {
    if (v > 0) {
      const r = subsUse(s, 'alcohol', { free: true });
      c.drunk += v === 2 ? 3 : 1;
      if (r) c.gain += v;
    }
    const text = [`You stuck to water. Somebody called you a lightweight, and you did not mind.`, 'A couple of drinks, a lot of laughing.', 'Shots. Then more shots. The night went soft around the edges.'][v];
    nightNext(s, c);
    return { text, nolog: true };
  }
  if (c.k === 'drug') {
    const id = c.offer;
    if (!v) { add(s, { karma: 1 }); nightNext(s, c); return { text: 'You said no, and smiled. Nobody pushed. You got a few looks, and you could live with them.', nolog: true }; }
    const r = subsUse(s, id, { free: true, mixed: c.drunk >= 2 });
    c.hi.push(id);
    if (chance(0.25)) { const d = subsDealer(s); c.lines.push(`${d.first} saved their number in your phone “for later”.`); }
    if (r && r.od) { if (subsOverdose(s, id)) return; c.hi = []; c.plan = ['home']; c.late = true; return { text: 'Somewhere around two, it went very wrong.', tone: 'bad' }; }
    nightNext(s, c);
    return { text: `You said yes. ${vary(r && r.relapse ? 'After everything, you said yes.' : '{~It was fine|It was good, and that is the problem|It was fucking incredible, and that is the problem}.')}`, nolog: true, tone: 'bad' };
  }
  if (c.k === 'incident') {
    const text = NIGHT_INCIDENTS[c.inc].choices[v][1](s, c);
    nightNext(s, c);
    return typeof text === 'string' ? { text, nolog: true } : Object.assign({ nolog: true }, text);
  }
  if (c.k === 'home') return nightFinish(s, c, v);
});
function nightFinish(s, c, how) {
  const me = nightMe(s), lines = [];
  me.n++;
  tally(s, 'nightsOut');
  const impaired = c.drunk + c.hi.length * 2;
  if (how === 'taxi') { const cost = price(s, 30); if (M(s).money >= cost) { M(s).money -= cost; c.spent += cost; } lines.push('You got home in a taxi, with the windows down.'); }
  else if (how === 'friend') { const f = pickRel(s, ['friend', 'bestie']); if (f) addRel(s, f, 4); lines.push('You slept on a couch that smelled like somebody else’s dog. It was the best sleep of the week.'); }
  else if (how === 'walk') { if (chance(0.04 + c.drunk * 0.02)) { const lost = Math.min(M(s).money, price(s, randInt(60, 300))); M(s).money -= lost; lines.push(`Somebody took ${fmtMoney(lost)} off you on the way home, with a smile.`); } else lines.push('You walked home under the streetlights, a little unsteady and a lot happy.'); }
  else if (how === 'drive') {
    if (impaired >= 1) {
      if (chance(0.04 + impaired * 0.06)) {
        add(s, { health: -randInt(10, 30) });
        if (chance(0.5)) getSick(s, pick(['broken_arm', 'broken_leg', 'concussion']));
        lines.push('You woke up in a hospital. The car had met a lamppost.');
        if (chance(0.03 + impaired * 0.02) && !s.dead) { die(s, 'a drunk-driving crash'); return { text: 'You did not make it home.', tone: 'bad' }; }
        const r = arrest(s, 'dui'); if (r && r.text) lines.push(r.text);
      } else if (chance(0.05 + impaired * 0.07)) { const r = arrest(s, 'dui'); lines.push(`Blue lights, a breathalyzer, and a very long night. ${r && r.text ? r.text : ''}`.trim()); }
      else lines.push('You made it home. You do not remember most of the drive, which is the thing that scares you in the morning.');
    } else lines.push('You drove home, stone sober, past a checkpoint that waved you through.');
  } else if (how === 'home' && c.met) { intimStart(s, { pid: c.met }); lines.push(`You and ${nm(s, c.met)} left together.`); }
  // The morning.
  const hang = Math.max(0, c.drunk - 1) + (c.hi.length ? 1 : 0);
  if (hang) { add(s, { happy: -2 * hang, health: -hang }); lines.push(vary(hang >= 2 ? '{~The morning was a brutal one.|The morning was brutal.|The morning was fucking brutal.}' : 'The morning was a rough one.')); }
  add(s, { happy: Math.max(0, c.gain) });
  const parts = [`You spent ${fmtMoney(c.spent)} on the night.`].concat(c.lines, lines);
  return { text: `${c.name}: ${parts.join(' ')}`, title: 'The night', emoji: '🌅', tone: impaired >= 3 ? 'bad' : '' };
}

/* ---- the scene ---------------------------------------------------------------------------- */
EV('nt_invite', {
  ages: [18, 50], emoji: '🌃', title: 'A name on a list', tags: SUB_TAGS, cooldown: 4,
  when: (s) => free(s) && nightMe(s).scene >= 15 && nightMe(s).scene < 25,
  text: 'A regular you have seen a dozen times tilts their head at you in the club. "You are fun. There is a place that opens when this one closes. Want your name on the list?"',
  choices: [
    ['Take the invite', (s) => { nightMe(s).scene = 25; add(s, { happy: 3 }); return 'Your name is on a list now. A stranger at the door nodded when you said it.'; }],
    ['Say you will think about it', () => 'You said you would think about it. They said "of course," and meant "probably not."'],
    ['Decline', (s) => { add(s, { karma: 1 }); return 'You said you had to be up early. They shrugged, and found someone else.'; }],
  ],
});
