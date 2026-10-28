/* =====================================================================
 * 81-web2.js — the web, part two. What 62-web.js started: a good name as
 * well as a bad one, more systems announcing on the fact bus and the press
 * listening, three new kinds of secret (a deserter's, an informant's, a
 * spy's double life) and places with regulars.
 *
 *   Good name   Charity, volunteering, medals and organizing something for the neighborhood raise it
 *               ("good_deed"). A good name softens a scandal (webCushion), helps at the ballot box and in
 *               a first date (webVoteEdge), and brings help when you are down. Enough deeds make you a
 *               pillar of the community.
 *   The bus     Business events and failures ("biz_event", "biz_failed"), verdicts ("court_verdict"), a
 *               burned spy and a published memoir ("spy_burned", "memoir_out") are announced where they
 *               happen; the press and your name listen here. Exposed secrets ("secret_out") make the paper.
 *   Secrets     A deserter in hiding, an informant wearing a wire and a spy who told someone are secrets in
 *               the ledger. They leak like any other, and when one gets out the system it belongs to
 *               reacts (the military police, the family, a blown cover).
 *   Places      s.web.places[key] = { key, kind: 'night' | 'gamb' | 'work', name, emoji, mood, reg: [pid],
 *               visits, last, cc, city }. A place you keep going back to has a mood and regulars who talk to
 *               each other. Trouble sours it, a bad year closes it, an uneasy city drags it down.
 *
 * s.web.deeds = [years]  good deeds, newest last, twelve at most
 * P(s).rep.pillar        true while you are a pillar of the community
 * ===================================================================== */

/* ---- the paper, a few more kinds of story ------------------------------------------------------------- */
Object.assign(NEWS_T, {
  good: [
    ['{{full}} gives back to {{city}}', '"I just did what anyone would," {{name}} told reporters, which is what people say when they have done more than anyone would. {{what}}'],
    ['Neighbors thank {{full}}', '{{what}} A volunteer said the whole block had noticed, and that {{name}} had not asked for any of it to be noticed.'],
  ],
  scandal: [
    ['{{full}}: "{{what}}" is out', 'It started as a whisper and ended on everyone\'s phone. {{name}} did not respond to requests for comment, which is also a kind of answer.'],
    ['{{city}} is talking about {{full}}', 'The story has been repeated so many times that nobody remembers who told it first. {{what}} is, as of this week, public.'],
  ],
  biz_bad: [
    ['{{co}} in the headlines', '{{co}}, owned by {{full}}, is facing questions after {{what}}. A spokesperson said the company "takes this very seriously."'],
    ['Trouble at {{co}}', '{{what}} has put {{co}} in the news, and {{full}} has been asked to explain.'],
  ],
  biz_good: [
    ['{{co}} wins {{what}}', '{{full}}, who started {{co}}, said the credit belongs to the team. The team said the credit belongs to {{full}}.'],
  ],
  biz_failed: [
    ['{{co}} closes its doors', '{{full}} announced that {{co}} is shutting down. Staff were told in a short meeting. "It is a hard day," said one.'],
    ['{{co}} collapses, owner owes creditors', 'The company founded by {{full}} could not cover its debts. Creditors are lining up.'],
  ],
  court_lost: [
    ['{{full}} loses in court', 'The jury found against {{full}} in {{what}}. Lawyers said the judgment "sends a message." The message was not for {{name}}.'],
  ],
  court_won: [
    ['Court sides with {{full}}', 'After a long fight in {{what}}, the court found for {{full}}. "Justice," {{name}} said outside, to nobody in particular.'],
  ],
  memoir: [
    ['Former spy {{full}} publishes tell-all', 'A book "the agency would rather you did not read" is on the shelves. Officials said it was "under review."'],
  ],
  expelled: [
    ['Diplomat {{full}} expelled', 'A foreign ministry named {{full}} as "unwelcome." {{city}} was surprised to learn it had a diplomat to be proud of or ashamed of.'],
  ],
  medal: [
    ['{{city}} honors {{full}}', '{{name}} was awarded a medal for service, in front of a crowd that included, a reporter noted, several people who were crying.'],
  ],
});
function webNews(s, kind, v, tone) {
  const a = newsPost(s, kind, Object.assign({ full: fullName(P(s)), name: P(s).first, what: '' }, v), true);
  if (a) log(s, '📰 ' + a.head, tone || '');
  return a;
}

/* ---- a good name ----------------------------------------------------------------------------------------- */
// What each kind of deed is worth to your name before the law of diminishing returns (a tenth shift is not a first).
const WEB_DEED_NAME = { charity: 2, volunteer: 1, organize: 4, medal: 3, hero: 5 };
function webDeedsRecent(s, years) { return (webOf(s).deeds || []).filter((y) => s.year - y < (years || 6)).length; }
function webPillar(s) { const r = webRep(P(s)); return r.name >= 70 && webDeedsRecent(s, 6) >= 3; }
function webGoodWord(s) { return webPillar(s) ? 'A pillar of the community' : webRep(P(s)).name >= 60 ? 'Well liked' : ''; }
onWebFact('good_deed', (s, d) => {
  const list = webOf(s).deeds || (webOf(s).deeds = []);
  list.push(s.year);
  if (list.length > 12) list.shift();
  const n = bump(s, 'deed_' + d.kind), base = d.name ?? WEB_DEED_NAME[d.kind] ?? 1;
  const g = Math.round(base / (1 + (n - 1) * 0.8));
  if (g > 0) webRepAdd(P(s), { name: g });
  if (d.big) webNews(s, 'good', { what: d.kind === 'charity' ? `The gift, ${fmtMoney(d.amt)}, is among the largest the city has seen.` : 'It was not a small thing.' }, 'good');
});
function webGoodYear(s) {
  const r = webRep(P(s)), was = !!r.pillar;
  r.pillar = webPillar(s);
  if (r.pillar && !was) log(s, '🏛️ People have started calling you a pillar of the community. It is not a title anyone gives you. It is a thing people say when you are not in the room.', 'good');
  if (!r.pillar && was) log(s, '🏛️ The talk of you as a pillar of the community has quietly stopped.');
}

const WEB_PROJECTS = {
  cleanup: { label: 'A neighborhood cleanup', emoji: '🧹', cost: 0, name: 3, unease: 2, line: 'You handed out gloves and bags and, by noon, forty people were picking up the same street.' },
  drive: { label: 'A food drive', emoji: '🥫', cost: 150, name: 3, unease: 1, line: 'The church basement filled up with cans, and then a truck of them arrived that nobody had ordered.' },
  block: { label: 'A block party', emoji: '🎈', cost: 600, name: 4, unease: 3, line: 'Folding tables, a borrowed grill and a kid with a speaker. People who had lived across from each other for years learned each other\'s names.' },
  fundraiser: { label: 'A charity fundraiser', emoji: '🎗️', cost: 1500, name: 5, unease: 1, line: 'A silent auction, a bad band and a very long speech. It raised more than anyone expected.' },
};
defAction({
  id: 'web_organize', cat: 'social', label: 'Organize something for the neighborhood', emoji: '🎗️', desc: 'A cleanup, a food drive, a block party. People remember who got them together.',
  when: (s) => free(s) && A(s) >= 16 && !count(s, 'organize'),
  run: (s) => {
    const choices = Object.keys(WEB_PROJECTS).map((id) => {
      const w = WEB_PROJECTS[id], cost = price(s, w.cost);
      return { label: `${w.emoji} ${w.label}`, value: id, sub: cost ? fmtMoney(cost) : 'Free', disabled: M(s).money < cost };
    });
    choices.push({ label: 'Never mind', value: null });
    popup(s, { emoji: '🎗️', title: 'What do you want to get going?', text: 'It takes a year of favors, a lot of group chats and one person who will not let it die. That person is you.', handler: 'webOrganize', choices });
  },
});
onChoice('webOrganize', (s, ctx, id) => {
  const w = WEB_PROJECTS[id];
  if (!w || !free(s)) return;
  const cost = price(s, w.cost);
  if (!pay(s, cost)) return cantAfford(cost);
  bump(s, 'organize');
  tally(s, 'organized');
  const odds = clamp(0.55 + skill(s, 'charisma') / 250 + (webRep(P(s)).name - 50) / 300 + (trait(s, 'charming') || trait(s, 'kind') ? 0.08 : 0), 0.2, 0.92);
  const crew = relPeople(s, ['friend', 'bestie', 'coworker', 'classmate', 'neighbor', 'sibling']).filter((p) => ageOf(s, p) >= 14);
  if (!chance(odds)) {
    add(s, { happy: -2 });
    return { text: `You booked the space, printed the flyers and got seven people, two of whom were lost. It was not a disaster. It was a quiet afternoon with some leftover ${id === 'drive' ? 'cans' : 'balloons'}.`, tone: 'bad' };
  }
  const guests = [];
  for (let i = 0; i < Math.min(5, crew.length); i++) { const p = pick(crew.filter((x) => !guests.includes(x))); if (p) guests.push(p); }
  for (const g of guests) {
    addRel(s, g.id, 4);
    const other = pick(guests.filter((x) => x.id !== g.id));
    if (other) webLink(s, g.id, other.id, 'friend'); // everyone who showed up met everyone else
  }
  webUneaseAdd(s, -w.unease);
  add(s, { karma: 3, happy: 3, fame: w.name >= 5 ? 1 : 0 });
  webFact(s, 'good_deed', { kind: 'organize', name: w.name, big: w.name >= 5 });
  return { text: `${w.line}${guests.length ? ` ${guests.length === 1 ? guests[0].first : listJoin(guests.slice(0, 3).map((g) => g.first))} came, and ${guests.length > 3 ? 'so did a lot of others' : 'brought people'}.` : ''}`, tone: 'good' };
});

EV('web_neighbors', {
  ages: [18, 95], emoji: '🥘', title: 'The neighborhood shows up', cooldown: 5,
  when: (s) => free(s) && webRep(P(s)).name >= 62 && (M(s).money < price(s, 2500) || P(s).stats.health < 45),
  w: (s) => 1 + (webRep(P(s)).name - 60) / 15,
  text: (s) => (P(s).stats.health < 45 ? 'Word got around that you have had a rough few months.' : 'Word got around that money is tight.') + ' There is a casserole on the porch, a card from three neighbors and an envelope with no name on it.',
  choices: [
    ['Accept it, and say thank you', (s) => { add(s, { money: price(s, randInt(400, 1500)), happy: 4 }); return { text: 'You did not know what to say, so you said thank you, a lot. The casserole was very good.', tone: 'good' }; }],
    ['Accept it, and promise to pay it forward', (s) => { add(s, { money: price(s, randInt(400, 1200)), happy: 3, karma: 3 }); webRepAdd(P(s), { name: 2 }); return { text: 'You wrote down every name. Someday, somebody else in the neighborhood will get a casserole, and it will be yours.', tone: 'good' }; }],
    ['Politely turn it down', (s) => { add(s, { happy: -1, karma: 1 }); return 'You said you were fine. They looked like they did not believe you. They left the casserole anyway.'; }],
  ],
});
EV('web_plaque', {
  ages: [25, 95], emoji: '🏛️', title: 'A civic honor', cooldown: 8, once: true,
  when: (s) => free(s) && webPillar(s),
  text: 'The town is giving you a plaque. There will be a ceremony, a folding podium and the mayor, reading from notes.',
  choices: [
    ['Accept, with a short speech', (s) => { if (chance(clamp(0.5 + skill(s, 'charisma') / 250, 0.2, 0.9))) { add(s, { happy: 8, fame: 3 }); webRepAdd(P(s), { name: 3 }); return { text: 'You said four sentences, and one of them made people laugh and another made them go quiet. It is on the wall at the library now.', tone: 'good' }; } add(s, { happy: 3 }); return 'You lost your place twice and thanked the wrong committee. Nobody minded. It is on the wall at the library now.'; }],
    ['Say it belongs to the volunteers', (s) => { add(s, { happy: 6, karma: 4 }); webRepAdd(P(s), { name: 4 }); return { text: 'You called up every name you could remember. The mayor looked uncomfortable, and then everyone applauded, and it was the best minute of the evening.', tone: 'good' }; }],
    ['Decline quietly', (s) => { add(s, { karma: 1 }); return 'You asked them to give it to somebody who needed it more. They found someone, and it was not hard.'; }],
  ],
});
EV('web_vouch', {
  ages: [20, 65], emoji: '🤝', title: 'A good word', cooldown: 6,
  when: (s) => free(s) && webRep(P(s)).name >= 60 && !!M(s).career && !JOBS[M(s).career.id].special,
  w: (s) => 0.6 + (webRep(P(s)).name - 55) / 40,
  text: 'Someone you once helped, years ago, just put in a good word for you with a person who matters. You did not ask. You did not even know.',
  choices: [
    ['Follow up on it', (s) => { M(s).career.perf = clamp100(M(s).career.perf + 6); M(s).favorRef = s.year; add(s, { happy: 3 }); return { text: 'The meeting was easy, because everyone in it had already decided to like you. It is a strange feeling, being believed in advance.', tone: 'good' }; }],
    ['Send a thank-you note', (s) => { add(s, { happy: 2, karma: 2 }); webRepAdd(P(s), { name: 1 }); return 'It was a short note. They kept it, and a year later they still talk about it.'; }],
    ['Let it be', () => 'You did not follow up. The good word is still out there, doing whatever good words do.'],
  ],
});

/* ---- the press and your name listen to the bus ------------------------------------------------------------- */
onWebFact('secret_out', (s, d) => {
  if (!d.me) return;
  const sec = webOf(s).secrets[d.sid];
  if (sec && sec.sev >= 3 && chance(0.7)) webNews(s, 'scandal', { what: cap(webLabel(s, sec)) }, 'bad');
});
const BIZ_PRESS = {
  breach: { bad: 3, what: 'a data breach' }, recall: { bad: 3, what: 'a product recall' }, expose: { bad: 3, what: 'an exposé' },
  lawsuit: { bad: 1, what: 'a lawsuit' }, audit: { bad: 1, what: 'an audit' }, embezzler: { bad: 1, what: 'an embezzlement case' },
  award: { good: 3, what: 'a local award' }, viral: { good: 1, what: 'a viral moment' }, endorsement: { good: 1, what: 'an endorsement' },
};
onWebFact('biz_event', (s, d) => {
  const b = BIZ_PRESS[d.id], co = company(s, d.co);
  if (!b || !d.you || !co) return;
  if (b.bad) {
    webRepAdd(P(s), { scandal: b.bad, name: -b.bad });
    if (b.bad >= 3 && chance(0.6)) webNews(s, 'biz_bad', { co: co.name, what: b.what }, 'bad');
  } else {
    webRepAdd(P(s), { name: b.good });
    if (b.good >= 3) webNews(s, 'biz_good', { co: co.name, what: b.what }, 'good');
  }
});
onWebFact('biz_failed', (s, d) => {
  const co = company(s, d.co);
  if (!d.you || !co) return;
  webRepAdd(P(s), { scandal: 2 + (d.owed > 0 ? 3 : 0), name: -2 });
  webNews(s, 'biz_failed', { co: co.name }, 'bad');
});
onWebFact('court_verdict', (s, d) => {
  const big = d.claim >= price(s, 100000), mid = d.claim >= price(s, 50000);
  if (!d.won && d.side === 'defendant' && !d.co && mid) {
    webRepAdd(P(s), { scandal: 3, name: -2 });
    if (big) webNews(s, 'court_lost', { what: d.name }, 'bad');
  } else if (d.won && big) {
    webRepAdd(P(s), { name: 2 });
    if (chance(0.5)) webNews(s, 'court_won', { what: d.name }, 'good');
  } else if (!d.won && d.side === 'plaintiff' && big) {
    webRepAdd(P(s), { name: -1 });
  }
});
onWebFact('spy_burned', (s, d) => {
  if (d.how !== 'expelled') return;
  webRepAdd(P(s), { scandal: 3, name: -2 });
  webNews(s, 'expelled', {}, 'bad');
});
onWebFact('memoir_out', (s, d) => {
  if (d.kind === 'tellall') { webRepAdd(P(s), { scandal: 3, name: -2 }); webNews(s, 'memoir', {}, ''); }
  else webRepAdd(P(s), { name: 1 });
});

/* ---- secrets that belong to other systems ----------------------------------------------------------------- */
// How much likelier the system gets when other people know (0.025 a head).
function webKindPressure(s, kind) {
  const sec = webLive(s, (x) => x.kind === kind && x.subj === s.playerId)[0];
  return sec ? webKnowers(s, sec).length * 0.025 : 0;
}
defSecretKind('deserter', {
  sev: 4, icon: '🚪',
  mine: () => 'that you deserted',
  rumor: (s, sec) => `${webName(s, sec.subj)} walked away from the army and is hiding`,
  expose: (s) => { if (isDeserter(s)) { deserterCaught(s); return ' The military police are on the way.'; } return ''; },
});
defSecretKind('informant', {
  sev: 5, icon: '🐀',
  mine: () => 'that you are wearing a wire for the feds',
  rumor: (s, sec) => `${webName(s, sec.subj)} is talking to the feds`,
  tipOdds: (s) => 0.01 + (M(s).uw ? M(s).uw.crew * 0.004 : 0),
  expose: (s) => { ratFound(s); return ' The family has heard.'; },
});
defSecretKind('spy_life', {
  sev: 3, icon: '🕶️',
  mine: () => 'what you really do for the agency',
  rumor: (s, sec) => `${webName(s, sec.subj)}'s job is not what ${pr(s.people[sec.subj] || P(s)).he} says it is`,
  expose: (s) => {
    const sp = M(s).spy;
    if (!sp || !sp.cover) return '';
    sp.cover.strength = Math.max(0, sp.cover.strength - 40);
    sp.heat = clamp100(sp.heat + 25);
    if (typeof checkBurn === 'function') checkBurn(s);
    return ' Your cover took the hit.';
  },
});
// Keep the ledger in step with the systems it mirrors: made when the state begins, dropped when it ends.
function webSyncSecrets(s) {
  const me = s.playerId, live = (kind) => webLive(s, (x) => x.kind === kind && x.subj === me)[0];
  const m = M(s);
  const drop = (kind) => { const x = webOf(s).secrets; for (const id in x) if (x[id].kind === kind && x[id].subj === me && !x[id].out) delete x[id]; };
  // a deserter in hiding: whoever hid them knows
  if (typeof isDeserter === 'function' && isDeserter(s)) {
    if (!live('deserter')) {
      const d = m.mil.deserter, who = relPeople(s, d.hide === 'family' ? ['parent', 'sibling', 'spouse', 'partner'] : ['bestie', 'spouse', 'partner']).slice(0, 2).map((p) => p.id);
      webNewSecret(s, 'deserter', me, { knows: who, ev: 25 });
    }
  } else drop('deserter');
  // an informant: the secret has no knowers, only a risk
  if (m.uw && m.uw.rat) { if (!live('informant')) webNewSecret(s, 'informant', me, { ev: 20 }); } else drop('informant');
  // a spy who told someone the truth
  const sp = m.spy;
  if (sp && sp.told) {
    const told = Object.keys(sp.told).filter((id) => s.people[id] && s.people[id].alive);
    let sec = live('spy_life');
    if (told.length && !sec) sec = webNewSecret(s, 'spy_life', me, { ev: 15 });
    if (sec) for (const id of told) if (!sec.knows.includes(id)) sec.knows.push(id);
  }
}
// A medal is a good deed, once.
function webSenseMedals(s) {
  if (typeof medalCount !== 'function') return;
  const w = webOf(s), n = medalCount(s);
  if (w.medals === undefined) { w.medals = n; return; }
  if (n > w.medals) {
    const d = n - w.medals;
    w.medals = n;
    webFact(s, 'good_deed', { kind: 'medal', name: Math.min(8, 3 * d) });
    if (d && chance(0.5)) webNews(s, 'medal', {}, 'good');
  }
}

/* ---- places with regulars ------------------------------------------------------------------------------------ */
const PLACE_CAP = 24;
function webPlaces(s) { const w = webOf(s); return w.places || (w.places = {}); }
function placeGet(s, key) { return webPlaces(s)[key] || null; }
function nightPlaceKey(s, v) { const p = P(s); return `night:${p.country}:${p.city}:${v.id}`; }
function placeWord(p) { return p.mood < 25 ? 'Dead' : p.mood < 45 ? 'Quiet' : p.mood < 70 ? 'Lively' : 'Buzzing'; }
function placeVibe(s, key) { const p = placeGet(s, key); return p ? Math.round((p.mood - 55) / 5) : 0; }
function placeRegulars(s, p) { return p.reg.filter((id) => s.people[id] && s.people[id].alive); }
function placeVisit(s, key, init, pids) {
  const pl = webPlaces(s);
  let p = pl[key];
  if (p && init.name && p.name !== init.name) p = null; // the place changed hands: a fresh start
  if (!p) p = pl[key] = { key, kind: init.kind, name: init.name, emoji: init.emoji || '📍', mood: 55, reg: [], visits: 0, last: s.year, cc: P(s).country, city: P(s).city };
  p.visits++;
  p.last = s.year;
  for (const id of pids || []) placeRegular(s, key, id);
  // The regulars talk to each other, and the web is what they pass along.
  const reg = placeRegulars(s, p);
  for (const id of pids || []) { const other = pick(reg.filter((x) => x !== id)); if (other) webLink(s, id, other, p.kind === 'work' ? 'work' : 'place'); } // coworkers stay coworkers
  const keys = Object.keys(pl);
  if (keys.length > PLACE_CAP) delete pl[keys.sort((a, b) => pl[a].last - pl[b].last)[0]];
  return p;
}
function placeRegular(s, key, pid) {
  const p = placeGet(s, key);
  if (!p || !s.people[pid] || pid === s.playerId) return;
  if (!p.reg.includes(pid)) { p.reg.push(pid); if (p.reg.length > 8) p.reg.shift(); }
}
function placeMoodAdd(s, key, d) { const p = placeGet(s, key); if (p) p.mood = clamp100(p.mood + d); }
// Trouble sours a place, and everyone who is there hears about it.
function placeIncident(s, key, what) {
  const p = placeGet(s, key);
  if (!p) return;
  p.mood = clamp100(p.mood - ({ fight: 8, friend: 2, bouncer: 3, raid: 20, death: 25 }[what] ?? 4));
  webFact(s, 'place_incident', { key, what });
}
onWebFact('place_incident', (s, d) => {
  const p = placeGet(s, d.key);
  if (p && ['fight', 'raid', 'death'].includes(d.what) && p.city === P(s).city) webUneaseAdd(s, d.what === 'fight' ? 0.5 : 2);
});
// The places you know and still can reach: your city's, and the ones from work.
function placesYours(s) {
  const me = P(s);
  return Object.values(webPlaces(s)).filter((p) => s.year - p.last <= 8 && (p.kind === 'work' ? !!M(s).career : p.cc === me.country && p.city === me.city)).sort((a, b) => b.visits - a.visits);
}
function webPlacesYear(s) {
  const pl = webPlaces(s), unease = webUneaseHere(s), me = P(s);
  for (const key of Object.keys(pl)) {
    const p = pl[key];
    p.reg = placeRegulars(s, p);
    if (s.year - p.last > 10) { delete pl[key]; continue; }
    // A place drifts back toward ordinary, and an uneasy city keeps it down.
    p.mood = clamp100(p.mood + Math.sign(55 - p.mood) * Math.min(3, Math.abs(55 - p.mood)) - (p.cc === me.country && p.city === me.city ? Math.round(unease * 0.8) : 0));
    if (p.kind === 'gamb') {
      const v = typeof vById === 'function' ? vById(s, key.slice(5)) : null;
      if (!v || !v.open) { delete pl[key]; continue; }
    }
    if (p.mood < 18 && p.kind === 'night') {
      const list = s.nightlife && s.nightlife[p.cc + ':' + p.city], v = list && list.find((x) => key.endsWith(':' + x.id));
      if (v) {
        const old = v.name;
        v.name = pick((v.kind === 'bar' ? NIGHT_BARS : v.kind === 'club' ? NIGHT_CLUBS : NIGHT_AFTER).filter((n) => n !== old)) || old;
        v.vibe = clamp100(v.vibe + randInt(-8, 8));
        if (p.cc === me.country && p.city === me.city && !s.dead) log(s, `🕯️ ${old} closed after a bad year. Something called ${v.name} is opening in its place.`);
      }
      delete pl[key];
    }
  }
}
EV('web_place_regular', {
  ages: [18, 95], emoji: '🍻', title: 'They know your name', cooldown: 4,
  when: (s) => free(s) && placesYours(s).some((p) => p.visits >= 3 && p.mood >= 45 && p.kind !== 'work'),
  ctx: (s) => { const l = placesYours(s).filter((p) => p.visits >= 3 && p.mood >= 45 && p.kind !== 'work'); return l.length ? { key: pick(l).key } : null; },
  text: (s, c) => { const p = placeGet(s, c.key); return `You walk into ${p.name} and the person behind the counter nods, and says your name, and does not ask what you are having. ${placeRegulars(s, p).length ? `${s.people[placeRegulars(s, p)[0]].first} is at the end of the bar, and waves you over.` : ''}`; },
  choices: [
    ['Buy a round', (s, c) => { const cost = price(s, 60); if (!pay(s, cost)) return cantAfford(cost); const p = placeGet(s, c.key); if (p) p.mood = clamp100(p.mood + 6); for (const id of (p ? placeRegulars(s, p) : []).slice(0, 3)) addRel(s, id, 3); webRepAdd(P(s), { name: 1 }); add(s, { happy: 3 }); return { text: 'You bought the room a round, which was less than it sounds, and is still remembered.', tone: 'good' }; }],
    ['Sit down and listen', (s, c) => {
      const p = placeGet(s, c.key), reg = p ? placeRegulars(s, p) : [];
      const subj = reg.find((id) => !webLive(s, (x) => x.subj === id).length && ageOf(s, s.people[id]) >= 20);
      if (subj && chance(0.5)) {
        const sec = webNewSecret(s, 'npc_debt', subj, { ev: 20, knows: [s.playerId] });
        webHearsay(s, sec, subj);
        return { text: 'You nursed a drink and let people talk. People will tell a bar a lot more than they tell each other.', quiet: false };
      }
      add(s, { happy: 2 });
      return 'You sat for an hour and learned a great deal about someone\'s divorce, and nothing else.';
    }],
    ['Just say hello', (s) => { add(s, { happy: 1 }); return 'You said hello, and meant it. It is a nice thing to be known somewhere.'; }],
  ],
});
EV('web_place_trouble', {
  ages: [18, 95], emoji: '🚨', title: 'Trouble at the usual place', cooldown: 4,
  when: (s) => free(s) && placesYours(s).some((p) => p.visits >= 2 && p.kind !== 'work'),
  ctx: (s) => { const l = placesYours(s).filter((p) => p.visits >= 2 && p.kind !== 'work'); return l.length ? { key: pick(l).key } : null; },
  w: (s) => 0.5 + Math.max(0, 55 - Math.min(...placesYours(s).map((p) => p.mood))) / 30,
  text: (s, c) => `Something is happening at ${placeGet(s, c.key).name}. There are raised voices, a lot of people standing in the street and, in the distance, a siren.`,
  choices: [
    ['Step in and calm it down', (s, c) => {
      if (chance(clamp(0.4 + skill(s, 'charisma') / 250 + skill(s, 'martial') / 400, 0.15, 0.8))) { placeMoodAdd(s, c.key, 4); webRepAdd(P(s), { name: 2 }); add(s, { karma: 3 }); return { text: 'You got between two people who were both much angrier than they were drunk, and talked until one of them laughed. Everyone went home.', tone: 'good' }; }
      add(s, { health: -4 }); placeIncident(s, c.key, 'fight');
      return { text: 'You got a fist in the shoulder for your trouble, and it did not help. By the time it was over, the place would not be the same for a while.', tone: 'bad' };
    }],
    ['Call the police', (s, c) => { placeIncident(s, c.key, 'raid'); webUneaseAdd(s, 0.5); return 'Three cars came. Nobody was happy about it, including, later, the owner. It was the right thing to do, and it will take a year for the place to feel the same.'; }],
    ['Keep out of it', (s, c) => { placeIncident(s, c.key, 'fight'); return 'You turned around and went home. It was the sensible thing, and you will be thinking about it later.'; }],
  ],
});

/* ---- the year ------------------------------------------------------------------------------------------------------ */
function web2Year(s) {
  if (A(s) < 6) return;
  webSyncSecrets(s);
  webSenseMedals(s);
  webPlacesYear(s);
  webGoodYear(s);
}
onYear('web2', web2Year);
