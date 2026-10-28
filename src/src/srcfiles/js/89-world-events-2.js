/* =====================================================================
 * 89-world-events-2.js — personal events for the headline events of 09-data-history-2.js (see 89-world-events.js
 * for the rules): the First World War, the 1918 flu, the postwar boom, Korea, the Cold War, Vietnam, the Moon,
 * the oil shocks, Black Monday, the Wall, the dot-com boom, September 11, 2008, the euro crisis and inflation.
 * ===================================================================== */

const wdWar = (s, id) => !!(HIST[id] && HIST[id].war && HIST[id].war[P(s).country]);
const wdSoldier = (s) => (p) => p.alive && p.gender !== 'f' && ageOf(s, p) >= 18 && ageOf(s, p) <= 45;
// A move you did not choose: out of the home, out of the job, to a city, with whoever depends on you.
function wdResettle(s, cc, city, welcome) {
  const m = M(s);
  if (m.career) leaveJob(s, 'moved');
  const dep = leaveRental(s, 'moved');
  if (m.housing.type !== 'parents') m.housing = { type: 'homeless', assetId: null, rent: 0, name: '' };
  relocate(s, cc, city);
  if (m.housing.type === 'homeless') openRentals(s, welcome);
  return dep || '';
}

/* ---- the First World War ------------------------------------------------------------------ */
EV('wd_ww1_letter', {
  ages: [8, 90], cooldown: 3, emoji: '✉️',
  when: (s) => worldHas(s, 'ww1') && wdWar(s, 'ww1') && relPeople(s, ['sibling', 'parent', 'spouse', 'partner', 'fiance', 'cousin', 'aunt', 'friend']).some(wdSoldier(s)),
  ctx: (s) => someone(s, ['sibling', 'parent', 'spouse', 'partner', 'fiance', 'cousin', 'aunt', 'friend'], wdSoldier(s)),
  text: (s, c) => `A letter has come from ${nm(s, c.pid)}, at the front. The paper is creased, and the handwriting is not as steady as you remember.`,
  choices: [
    ['Write back at once', (s, c) => { addRel(s, c.pid, 8); add(s, { happy: 1 }); return `You wrote four pages about nothing at all, because nothing at all was what ${genderWord(s.people[c.pid], 'he', 'she', 'they')} wanted to hear about.`; }],
    ['Read it aloud to the family', (s, c) => { addRel(s, c.pid, 4); for (const p of relPeople(s, ['parent', 'sibling'])) if (p.id !== c.pid) addRel(s, p.id, 2); return 'The whole kitchen listened without a word. Your mother kept the page in the Bible.'; }],
    ['Put it away unanswered', (s, c) => { addRel(s, c.pid, -6); add(s, { happy: -2, karma: -1 }); return 'You could not find the words, and the days went by. You told yourself there was plenty of time.'; }],
  ],
});
EV('wd_armistice', {
  ages: [4, 95], once: true, emoji: '🔔', text: 'The war is over.',
  when: (s) => s.year === 1918 && worldHas(s, 'ww1') && wdWar(s, 'ww1'),
  auto: (s) => {
    if (P(s).country === 'de') { add(s, { happy: -1 }); return 'The fighting stopped, and there was no cheering. The winter was cold, the shelves were bare, and the men who came back looked at the floor.'; }
    add(s, { happy: 5 });
    return 'The guns stopped at eleven o’clock, and for an hour nobody in the street could think of anything to say. Then the bells began, and strangers hugged each other.';
  },
});

/* ---- the 1918 flu --------------------------------------------------------------------------- */
EV('wd_flu_mask', {
  ages: [5, 95], once: true, emoji: '😷',
  when: (s) => s.year <= 1919 && worldHas(s, 'flu1918'),
  text: 'The flu is everywhere. The papers say a gauze mask helps, and the doctors are not sure.',
  choices: [
    ['Wear a gauze mask in public', (s) => { M(s).flags.fluCare = true; add(s, { happy: -1 }); return 'You tied a square of gauze over your face. People stared, and then everybody was wearing one.'; }],
    ['Stay home as much as you can', (s) => { M(s).flags.fluCare = true; add(s, { happy: -2 }); return 'You kept to the house for weeks. It was dull, and everyone in it was well.'; }],
    ['Carry on as usual', () => 'You said it was only the flu, and carried on. Whether that was brave or foolish depended on who you asked, later.'],
  ],
});
EV('wd_flu_nurse', {
  ages: [10, 90], once: true, emoji: '🤒',
  when: (s) => s.year <= 1919 && worldHas(s, 'flu1918') && relPeople(s, ['parent', 'sibling', 'spouse', 'child', 'grandparent']).length > 0,
  ctx: (s) => someone(s, ['parent', 'sibling', 'spouse', 'child', 'grandparent']),
  text: (s, c) => `${nm(s, c.pid)} has the flu. Everyone in the house is afraid, and the doctor is too busy to come.`,
  choices: [
    ['Nurse them yourself', (s, c) => {
      addRel(s, c.pid, 10); add(s, { karma: 2, happy: -2 });
      if (chance(0.35)) getSick(s, 'flu1918');
      if (chance(0.1)) { npcDies(s, s.people[c.pid], 'the 1918 flu'); return { text: `You sat up every night for a week. ${nm(s, c.pid)} did not get better. You were there, and that was something.`, tone: 'bad' }; }
      return { text: `You sat up every night for a week with cold cloths and broth. ${nm(s, c.pid)} pulled through, and does not forget it.`, tone: 'good' };
    }],
    ['Keep your distance', (s, c) => {
      addRel(s, c.pid, -6); add(s, { happy: -2, karma: -1 });
      if (chance(0.18)) { npcDies(s, s.people[c.pid], 'the 1918 flu'); return { text: `You left a tray outside the door. ${nm(s, c.pid)} did not recover, and you will think about that tray for years.`, tone: 'bad' }; }
      return 'You left a tray outside the door and kept the windows open. They recovered. Neither of you mentions it.';
    }],
    { label: 'Send for any doctor you can find', sub: (s) => fmtMoney(price(s, 200)), fx: (s, c) => {
      const cost = price(s, 200);
      if (!pay(s, cost)) return cantAfford(cost);
      addRel(s, c.pid, 4);
      if (chance(0.2)) { npcDies(s, s.people[c.pid], 'the 1918 flu'); return { text: `The doctor came on the third day. It was too late, and ${nm(s, c.pid)} died that night.`, tone: 'bad' }; }
      return { text: `The doctor charged ${fmtMoney(cost)} for ten minutes and a bottle of something. ${nm(s, c.pid)} recovered.`, tone: 'good' };
    } },
  ],
});

/* ---- the boom ------------------------------------------------------------------------------------ */
EV('wd_family_car', {
  ages: [22, 55], once: true, emoji: '🚗',
  when: (s) => s.year >= 1948 && worldHas(s, 'postwar') && M(s).money >= price(s, 1500),
  text: 'Everyone on your street has a car, or is about to. The dealer says it is the best year there has ever been to buy one.',
  choices: [
    { label: 'Buy the car', sub: (s) => fmtMoney(price(s, 1200)), fx: (s) => { const cost = price(s, 1200); if (!pay(s, cost)) return cantAfford(cost); addSkill(s, 'driving', 8); add(s, { happy: 4 }); return `You drove it off the lot with the whole family in the back seat, and took the long way home. It cost ${fmtMoney(cost)}.`; } },
    ['Keep taking the bus', (s) => { const v = price(s, 60); add(s, { money: v }); return `You kept the money, and the bus ran on time. You saved ${fmtMoney(v)} this year, and your neighbors never stopped asking about it.`; }],
  ],
});

/* ---- Korea ------------------------------------------------------------------------------------------ */
EV('wd_korea_flee', {
  ages: [18, 70], once: true, emoji: '🧳',
  when: (s) => P(s).country === 'kr' && s.year <= 1951 && worldHas(s, 'korean_war') && free(s),
  text: 'The front is moving south, and the fighting is getting closer to your town. People are leaving, with whatever they can carry.',
  choices: [
    ['Flee south with the family', (s) => { const dep = wdResettle(s, 'kr', 'Busan', 'You arrived in Busan with what you could carry. Find a place to live.'); add(s, { happy: -6 }); for (const p of relPeople(s, ['parent', 'spouse', 'child', 'sibling'])) { p.city = 'Busan'; } return `You walked for days and rode on the roof of a train. Busan was crowded with people from every part of the country, and there was work for anyone who could carry things. ${dep}`.trim(); }],
    ['Stay where you are', (s) => { add(s, { health: -8, happy: -8 }); if (chance(0.05)) { die(s, 'in the fighting'); return; } return { text: 'The front passed over you twice. When it was over, the town was in ruins and you were alive.', tone: 'bad' }; }],
  ],
});
EV('wd_korea_kid', {
  ages: [5, 17], once: true, emoji: '🧳', text: 'The war has come to your town.',
  when: (s) => P(s).country === 'kr' && s.year <= 1951 && worldHas(s, 'korean_war') && relPeople(s, ['parent']).length > 0,
  auto: (s) => { relocate(s, 'kr', 'Busan'); for (const p of relPeople(s, ['parent', 'sibling'])) p.city = 'Busan'; add(s, { happy: -6, health: -2 }); return 'Your family packed what it could carry and walked south for days, and then a train, and then a boat. You ended up in a crowded city by the sea, with a lot of strangers who also had nowhere else to go.'; },
});

/* ---- the Cold War ------------------------------------------------------------------------------------- */
EV('wd_sputnik', {
  ages: [6, 17], once: true, emoji: '🛰️', text: 'A small silver sphere is going across the sky.',
  when: (s) => s.year === 1957 && worldHas(s, 'sputnik'),
  auto: (s) => { add(s, { smarts: 1 }); return 'Your school added science classes after that, and everyone was suddenly supposed to be good at mathematics. You stood outside at dusk with half the street and watched a moving star.'; },
});
EV('wd_missile_crisis', {
  ages: [8, 95], once: true, emoji: '☢️',
  when: (s) => s.year === 1962 && worldHas(s, 'missile_crisis'),
  text: 'Everyone is listening to the radio. The grown-ups are talking in low voices, and nobody is quite sure what they should be doing.',
  choices: [
    { label: 'Build a fallout shelter', sub: (s) => fmtMoney(price(s, 800)), fx: (s) => { const cost = price(s, 800); if (!pay(s, cost)) return cantAfford(cost); add(s, { happy: 1 }); return `You dug a shelter and stocked it with tins and a radio. It cost ${fmtMoney(cost)}, and you hope it was wasted.`; } },
    { label: 'Stock the pantry', sub: (s) => fmtMoney(price(s, 120)), fx: (s) => { const cost = price(s, 120); if (!pay(s, cost)) return cantAfford(cost); add(s, { happy: 1 }); return 'You bought a lot of tins and candles, and felt a little better. It was something to do.'; } },
    ['Carry on as normal', (s) => { add(s, { happy: -2 }); return 'You went to work like it was an ordinary week. It was not, and everyone could tell.'; }],
  ],
});
EV('wd_chernobyl', {
  ages: [6, 95], once: true, emoji: '☢️',
  when: (s) => s.year === 1986 && worldHas(s, 'chernobyl'),
  text: 'It rained this week, and the radio says the rain was not like other rain. Nobody is certain what is safe to eat.',
  choices: [
    ['Keep the children in, and skip the milk', (s) => { add(s, { happy: -2 }); return 'You washed everything twice and kept the windows shut. Nothing happened that you could see.'; }],
    ['Carry on as normal', (s) => { add(s, { health: -1, happy: -1 }); return 'You did not change a thing. Nothing happened that you could tell, and you will wonder, now and then, for the rest of your life.'; }],
  ],
});

/* ---- Vietnam ------------------------------------------------------------------------------------------------ */
EV('wd_draft_protest', {
  ages: [18, 35], cooldown: 3, emoji: '📣',
  when: (s) => s.year >= 1967 && s.year <= 1972 && ['us', 'au'].includes(P(s).country) && worldHas(s, 'vietnam') && free(s),
  text: 'Everybody has an opinion about the war, and there is a rally in your town this weekend. You are expected to turn up, one way or the other.',
  choices: [
    ['March against the war', (s) => { add(s, { karma: 1, fame: 1, happy: 1 }); if (chance(0.08)) { add(s, { happy: -3 }); return 'A night in a cell for blocking the road, a fine, and no charge. You came out with a sore voice and a lot of new friends.'; } return 'You marched with ten thousand people. It was loud and peaceful, and the news barely mentioned it.'; }],
    ['Rally in support of the troops', (s) => { add(s, { karma: 1, happy: 1 }); return 'You stood on the other side of the street with a flag, next to people whose sons were over there. Nobody insulted you, and nobody listened.'; }],
    ['Write to your representative', (s) => { add(s, { karma: 1 }); return 'You wrote four careful pages and got back a form letter. At least it was signed.'; }],
    ['Stay out of it', () => 'You kept your head down and your opinions to yourself, as much as anyone could.'],
  ],
});

/* ---- the Moon --------------------------------------------------------------------------------------------------- */
EV('wd_moon', {
  ages: [5, 95], once: true, emoji: '🚀',
  when: (s) => s.year === 1969 && worldHas(s, 'moon_landing'),
  text: 'Men are about to walk on the Moon, and it is on television. It is very late.',
  choices: [
    ['Watch it with the family', (s) => { relAll(s, ['parent', 'sibling', 'spouse', 'child'], 4); add(s, { happy: 3 }); if (A(s) <= 15) add(s, { smarts: 1 }); return 'The whole family crowded around the set in the dark, and when the grainy figure stepped down, nobody in the room said a word. Then everybody did.'; }],
    ['Go to a neighbor’s with a bigger set', (s) => { relAll(s, K_FRIENDS, 3); add(s, { happy: 3 }); return 'Twenty people squeezed into a living room and cheered at a small black-and-white screen. Somebody brought a cake, and somebody cried.'; }],
    ['Sleep through it', (s) => { add(s, { happy: -1 }); return 'You woke up and were told you had missed it. You have never heard the end of it.'; }],
  ],
});

/* ---- the oil shocks ---------------------------------------------------------------------------------------------------- */
EV('wd_gas_lines', {
  ages: [18, 90], cooldown: 2, emoji: '⛽',
  when: (s) => worldHas(s, 'oil_shocks') && !!M(s).license,
  text: 'The gas station at the end of the street has a line around the block, and a sign that says "limit 10." The tank is nearly empty.',
  choices: [
    ['Wait in line', (s) => { add(s, { happy: -2 }); const v = price(s, 40); M(s).money -= v; return `You waited two hours and paid ${fmtMoney(v)} for a half tank. Everyone in the line had the same story.`; }],
    ['Leave the car at home', (s) => { add(s, { health: 1, happy: -1 }); addSkill(s, 'fitness', 2); return 'You took the bus, or rode a bike. It took a lot longer, and you were fitter for it.'; }],
    { label: 'Swap for a smaller car', sub: (s) => fmtMoney(price(s, 2500)), fx: (s) => { const cost = price(s, 2500); if (!pay(s, cost)) return cantAfford(cost); add(s, { happy: 2 }); return 'You traded in the big old car for a small one that sipped fuel. The neighbors laughed, until the next time the price went up.'; } },
  ],
});

/* ---- Black Monday ------------------------------------------------------------------------------------------------------- */
EV('wd_black_monday', {
  ages: [18, 100], once: true, emoji: '📉',
  when: (s) => s.year === 1987 && worldHas(s, 'black_monday') && wdMine(s) >= price(s, 2500),
  text: 'The market fell by a fifth today, the biggest drop in its history. Your broker is on the line, and the phones are going off all over the office.',
  choices: [
    ['Sell everything', (s) => { const m = M(s), v = Math.round(wdMine(s) * 0.78); m.invest.index = 0; m.invest.stocks = 0; m.money += v; add(s, { happy: -3 }); return { text: `You sold at the bottom and kept ${fmtMoney(v)}. By December the market had recovered nearly all of it.`, tone: 'bad' }; }],
    ['Hold on', (s) => { add(s, { happy: 1 }); return { text: 'You did not do a thing, which was harder than it sounds. By December it had come back, and then some.', tone: 'good' }; }],
  ],
});

/* ---- the Wall ------------------------------------------------------------------------------------------------------------- */
EV('wd_wall_piece', {
  ages: [10, 95], once: true, emoji: '🧱',
  when: (s) => P(s).country === 'de' && s.year >= 1989 && s.year <= 1990 && worldHas(s, 'berlin_wall_falls'),
  text: 'The Wall is open. All over the city, people are crossing, hugging, and chipping at the concrete with hammers.',
  choices: [
    ['Cross to see relatives you have never met', (s) => { relAll(s, FAMILY_KINDS, 3); add(s, { happy: 4 }); return 'You stood in a stranger’s kitchen, in a city you had never been allowed to visit, and it was full of people with your grandmother’s face.'; }],
    ['Chip off a piece and keep it', (s) => { add(s, { happy: 2 }); M(s).flags.wallPiece = true; return 'You walked away with a piece of the Wall the size of your fist, spray paint still on it. You keep it on a shelf.'; }],
    ['Sell pieces to tourists', (s) => { const v = price(s, 150); add(s, { money: v }); return `You sold small pieces of the Wall from a blanket on the pavement, and made ${fmtMoney(v)}. Most of it was not from the Wall.`; }],
  ],
});

/* ---- the dot-com boom --------------------------------------------------------------------------------------------------------- */
EV('wd_stock_options', {
  ages: [22, 60], once: true, emoji: '📈',
  when: (s) => s.year >= 1998 && s.year <= 2001 && worldHas(s, 'dotcom') && !!M(s).career && JOBS[M(s).career.id].cat === 'tech',
  text: 'Your company gave you stock options, and the stock has gone up tenfold. On paper, you are rich.',
  choices: [
    ['Cash out now', (s) => { const v = price(s, { 1998: 50000, 1999: 120000, 2000: 150000, 2001: 20000 }[s.year]); add(s, { money: v, happy: 4 }); return { text: `You sold everything. It came to ${fmtMoney(v)}, and your colleagues said you were mad.`, tone: 'good' }; }],
    ['Hold on for more', (s) => {
      const v = price(s, { 1998: 50000, 1999: 120000, 2000: 150000, 2001: 20000 }[s.year]);
      if (s.year <= 2000 && chance(0.3)) { add(s, { money: v * 3, happy: 8 }); return { text: `You held on, and it tripled. You got out with ${fmtMoney(v * 3)} just before the bubble burst.`, tone: 'good' }; }
      const left = Math.round(v * 0.06);
      add(s, { money: left, happy: -6 }); return { text: `You held on, and then the bubble burst. The options were worth ${fmtMoney(left)} by the time anyone could sell.`, tone: 'bad' };
    }],
  ],
});
EV('wd_startup', {
  ages: [20, 45], once: true, emoji: '💡',
  when: (s) => s.year >= 1996 && s.year <= 1999 && worldHas(s, 'dotcom') && free(s) && !inSchool(s),
  text: 'A friend has an idea for a company on the internet, and wants you in. Nobody has any revenue, and everybody has funding.',
  choices: [
    ['Quit your job and join them', (s) => {
      if (M(s).career) leaveJob(s, 'switched');
      const r = rand();
      if (r < 0.2) { const v = price(s, 250000); add(s, { money: v, happy: 10, fame: 2 }); return { text: `It worked. The company was sold for a great deal, and your share came to ${fmtMoney(v)}.`, tone: 'good' }; }
      if (r < 0.55) { const v = price(s, 30000); add(s, { money: v, happy: 3 }); return { text: `It did not make anyone rich, but it paid ${fmtMoney(v)} and taught you a lot.`, tone: 'good' }; }
      add(s, { happy: -6, money: -price(s, 3000) });
      return { text: 'It folded before the second round of funding. The office furniture was auctioned, and you did not get your last paycheck.', tone: 'bad' };
    }],
    ['Stay where you are', (s) => { add(s, { happy: -1 }); return 'You stayed, and kept the paycheck. You will think about it again in a few years, when you read about what the company became.'; }],
  ],
});

/* ---- September 11, and the wars after it ------------------------------------------------------------------------------------ */
EV('wd_enlist_2001', {
  ages: [18, 30], once: true, emoji: '🎖️',
  when: (s) => s.year >= 2001 && s.year <= 2003 && ['us', 'uk', 'au', 'ca'].includes(P(s).country) && free(s) && !inService(s) && !M(s).career,
  text: 'Everyone is talking about what happened, and about what the country is going to do. A recruiter’s office on your street has a line at the door.',
  choices: [
    ['Walk in and sign up', (s) => applyJob(s, 'military')],
    ['Carry on with your life', () => 'You thought about it for a long time, and decided it was not for you. Some of your friends went. Some did not come back.'],
  ],
});
EV('wd_flying_again', {
  ages: [14, 95], once: true, emoji: '✈️',
  when: (s) => s.year >= 2001 && s.year <= 2002 && (M(s).worldLived || []).includes('sept11'),
  text: 'You have a trip booked. The airlines say flying is safe, and everyone is a little nervous.',
  choices: [
    { label: 'Fly anyway', sub: (s) => fmtMoney(price(s, 300)), fx: (s) => { const cost = price(s, 300); if (!pay(s, cost)) return cantAfford(cost); add(s, { happy: 1 }); return 'There were long lines and a lot of quiet. Everyone at the gate looked at everyone else, and nobody said a thing. Then the plane landed, and everyone applauded.'; } },
    ['Cancel the trip', (s) => { add(s, { happy: -1 }); return 'You told yourself you would go next year. You took the train instead, and it was fine.'; }],
  ],
});

/* ---- 2008, and the euro crisis ---------------------------------------------------------------------------------------------------- */
const wdMortgage = (s) => { const m = M(s), l = m.loans.find((x) => x.kind === 'house'), a = l && m.assets.find((q) => q.id === l.assetId); return a ? { l, a } : null; };
EV('wd_underwater', {
  ages: [22, 90], once: true, emoji: '🏚️',
  when: (s) => s.year >= 2008 && s.year <= 2012 && worldHas(s, 'gfc') && !!wdMortgage(s) && wdMortgage(s).l.balance > wdMortgage(s).a.value * 0.9,
  text: (s) => `You owe ${fmtMoney(wdMortgage(s).l.balance)} on a house that is now worth ${fmtMoney(wdMortgage(s).a.value)}. You are not the only one on your street.`,
  choices: [
    ['Keep paying', (s) => { add(s, { happy: -2, karma: 1 }); return 'You kept paying every month and did not look at the number. It took years for the house to be worth what you owed.'; }],
    ['Sell at a loss', (s) => {
      const { l, a } = wdMortgage(s), net = Math.round(a.value * 0.94) - l.balance;
      removeAsset(s, a.id); M(s).loans = M(s).loans.filter((x) => x !== l); M(s).money += net; add(s, { happy: -6 });
      return { text: net < 0 ? `You sold it for ${fmtMoney(Math.round(a.value * 0.94))}, which was ${fmtMoney(-net)} less than you owed. The difference is now a debt.` : `You sold it and came out with ${fmtMoney(net)}. It could have been much worse.`, tone: 'bad' };
    }],
    ['Walk away from it', (s) => {
      const { l, a } = wdMortgage(s);
      removeAsset(s, a.id); M(s).loans = M(s).loans.filter((x) => x !== l);
      flag(s, 'bankruptYear', s.year); tally(s, 'bankruptcies'); add(s, { happy: -10, karma: -2 });
      return { text: 'You mailed the keys to the bank. The debt was written off, and so was your credit for seven years.', tone: 'bad' };
    }],
  ],
});
EV('wd_bank_failed', {
  ages: [20, 95], once: true, emoji: '🏦',
  when: (s) => s.year >= 2008 && s.year <= 2009 && worldHas(s, 'gfc') && M(s).money >= price(s, 8000),
  text: 'A bank has failed, and the news says that others are not far behind. Yours has a branch on every corner, and says it is perfectly safe.',
  choices: [
    ['Move your money somewhere safer', (s) => { add(s, { happy: 1 }); return 'You spent a day in line at two different banks. Your money has moved, and so has your sleep.'; }],
    ['Leave it where it is', (s) => {
      const m = M(s), cover = price(s, 20000);
      if (m.money > cover && chance(0.15)) { const lost = Math.round((m.money - cover) * 0.4); m.money -= lost; add(s, { happy: -6 }); return { text: `The bank was rescued, but not everyone was made whole. Of what you had above the guarantee, ${fmtMoney(lost)} did not come back.`, tone: 'bad' }; }
      add(s, { happy: 0 }); return 'The bank was fine, as it turned out. You never told anyone how nervous you were.';
    }],
  ],
});
EV('wd_emigrate_crisis', {
  ages: [20, 42], once: true, emoji: '🛫',
  when: (s) => s.year >= 2010 && s.year <= 2013 && ['ie', 'es', 'it'].includes(P(s).country) && worldHas(s, 'euro_crisis') && free(s),
  text: 'There is no work, and there is not going to be any soon. Half the people you went to school with have gone, and the other half are thinking about it.',
  choices: [
    ['Leave for Australia', (s) => HANDLERS.emigrate(s, {}, 'au')],
    ['Leave for Canada', (s) => HANDLERS.emigrate(s, {}, 'ca')],
    ['Stay and wait it out', (s) => { add(s, { happy: -3 }); return 'You stayed. The months got longer, and your friends’ photos from abroad got sunnier.'; }],
  ],
});

/* ---- the inflation surge ------------------------------------------------------------------------------------------------------------- */
EV('wd_rent_hike', {
  ages: [18, 90], once: true, emoji: '🏠',
  when: (s) => s.year >= 2022 && s.year <= 2023 && worldHas(s, 'inflation_2022') && M(s).housing.type === 'rent',
  text: (s) => `Your landlord has written: the rent is going up by 15 percent. It is already ${fmtMoney(M(s).housing.rent)} a year.`,
  choices: [
    ['Pay it', (s) => { M(s).housing.rent = Math.round(M(s).housing.rent * 1.15); add(s, { happy: -2 }); return 'You paid, and put another thing off. Everyone you know has the same letter.'; }],
    ['Negotiate', (s) => { if (chance(0.5)) { M(s).housing.rent = Math.round(M(s).housing.rent * 1.05); add(s, { happy: 1 }); return { text: 'You offered to sign a longer lease, and the landlord settled for five percent. Not bad.', tone: 'good' }; } M(s).housing.rent = Math.round(M(s).housing.rent * 1.15); add(s, { happy: -3 }); return { text: 'The landlord said there was a long list of people who would pay more. You paid.', tone: 'bad' }; }],
    ['Look for somewhere cheaper', (s) => { openRentals(s, 'You are looking for something cheaper, along with everyone else.'); }],
  ],
});
EV('wd_energy_bill', {
  ages: [18, 95], once: true, emoji: '🔌',
  when: (s) => s.year === 2022 && ['uk', 'de', 'fr', 'it', 'es', 'ie', 'se'].includes(P(s).country) && worldHas(s, 'inflation_2022'),
  text: 'The energy bill has come, and it is three times what it was last winter. There is a long article in the paper about how to stay warm.',
  choices: [
    { label: 'Pay it', sub: (s) => fmtMoney(price(s, 1200)), fx: (s) => { const cost = price(s, 1200); if (!pay(s, cost)) return cantAfford(cost); add(s, { happy: -2 }); return `You paid ${fmtMoney(cost)} and wore a jumper indoors anyway, to be safe.`; } },
    ['Turn the heating down', (s) => { add(s, { health: -1, happy: -2 }); const v = price(s, 500); add(s, { money: v }); return `You lived in two layers and a hat, and saved ${fmtMoney(v)}. The cat did not approve.`; }],
  ],
});

/* ---- living through it ---------------------------------------------------------------------------------------------------------------- */
ACHIEVEMENTS.push(
  { id: 'wd_great_war', name: 'The Great War', emoji: '🌍', desc: 'Live through the First World War.', check: (s) => (M(s).worldLived || []).includes('ww1') },
  { id: 'wd_flu_1918', name: 'The Flu Year', emoji: '🤒', desc: 'Live through the 1918 flu pandemic.', check: (s) => (M(s).worldLived || []).includes('flu1918') },
  { id: 'wd_boom_years', name: 'Boom Years', emoji: '🚗', desc: 'Live through the postwar boom.', check: (s) => (M(s).worldLived || []).includes('postwar') },
  { id: 'wd_cold_war', name: 'Forty Years Cold', emoji: '🧊', desc: 'Live through most of the Cold War.', check: (s) => (M(s).worldLived || []).includes('cold_war') && A(s) >= 30 },
  { id: 'wd_crash_2008', name: 'The Crash', emoji: '🏦', desc: 'Live through the 2008 financial crisis.', check: (s) => (M(s).worldLived || []).includes('gfc') },
  { id: 'wd_witness', name: 'Witness to History', emoji: '📜', desc: 'Live through ten big events in history.', check: (s) => (M(s).worldLived || []).length >= 10 },
);
