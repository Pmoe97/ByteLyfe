/* =====================================================================
 * 89-world-events.js — personal events tied to the real world (09-data-history.js, 88-world.js): the
 * moments of a big event that happen to you. Ids start wd_. Each is gated on worldHas(s, id) so it can
 * only come while that event is going on where you live, and each choice costs or earns something real.
 * Plus the achievements for living through them.
 * ===================================================================== */

const wdFarm = (s) => (M(s).career && M(s).career.id === 'farm') || relPeople(s, ['parent', 'stepparent']).some((p) => p.job && p.job.id === 'farm');
const wdMine = (s) => { const m = M(s); return Math.max(0, (m.invest.index || 0) + (m.invest.stocks || 0)); };

/* ---- the Great Depression --------------------------------------------------------------- */
EV('wd_bankrun', {
  ages: [18, 90], once: true, emoji: '🏦',
  when: (s) => worldHas(s, 'depression') && M(s).money >= price(s, 800),
  text: 'The word is going round that your bank is in trouble. There is a line outside already, around the corner and down the block.',
  choices: [
    ['Take your money out now', (s) => { add(s, { happy: -1 }); return 'You stood in line for four hours and left with all of it in an envelope. Where it is now is nobody’s business.'; }],
    ['Trust the bank', (s) => {
      if (!chance(P(s).country === 'us' && s.year <= 1934 ? 0.22 : 0.1)) { add(s, { happy: 2, karma: 1 }); return 'The bank held. A week later the line was gone, and your balance was still there.'; }
      const m = M(s), lost = Math.round(Math.max(0, m.money) * 0.6 + (m.invest.savings || 0));
      m.money = Math.round(Math.max(0, m.money) * 0.4); m.invest.savings = 0;
      add(s, { happy: -10 });
      return { text: `The bank failed on Thursday. When it was sorted out, ${fmtMoney(lost)} of your savings were gone.`, tone: 'bad' };
    }],
  ],
});
EV('wd_breadline', {
  ages: [18, 60], cooldown: 4, emoji: '🥣',
  when: (s) => worldHas(s, 'depression') && free(s) && !M(s).career && !M(s).ptJob && !inSchool(s),
  text: 'You have no work, and work is not coming. The savings are thin.',
  choices: [
    ['Stand in the line for soup', (s) => { add(s, { happy: -3, health: 1 }); return 'It was hot and it was free. The man beside you had a good coat and did not say a word.'; }],
    { label: 'Ride the rails looking for work', when: (s) => A(s) <= 38, fx: (s) => {
      if (chance(0.5)) { const v = price(s, 600); add(s, { money: v, happy: 2 }); return `Two weeks on a freight car, and then a farmer who needed hands for the harvest. You came home with ${fmtMoney(v)}.`; }
      add(s, { happy: -5, health: -4 });
      if (chance(0.15)) { getSick(s, 'broken_leg'); return { text: 'You slipped getting off a moving train and broke your leg. Nobody was there to see it.', tone: 'bad' }; }
      return { text: 'Three weeks, a lot of dust, and nothing. You walked the last miles home.', tone: 'bad' };
    } },
    ['Sell what you can', (s) => { const v = price(s, randInt(100, 600)); add(s, { money: v, happy: -3 }); return `The radio, the good chairs, a coat. It came to ${fmtMoney(v)}, and the house looks emptier.`; }],
  ],
});
EV('wd_kid_hard_times', {
  ages: [5, 17], cooldown: 4, emoji: '🧦',
  when: (s) => worldHas(s, 'depression') && !!relPeople(s, ['parent', 'stepparent']).length,
  text: 'Money is tight at home. The shoes have holes, and there is a lot of talk at dinner about what things cost.',
  choices: [
    ['Go without, and say nothing', (s) => { add(s, { happy: -2, karma: 1 }); return 'You stuffed newspaper in your shoes and said they were fine. Your mother looked at you for a long time.'; }],
    { label: 'Find odd jobs to help', when: (s) => A(s) >= 10, fx: (s) => { const v = price(s, 60); add(s, { money: v, happy: 1 }); return `You ran errands and shoveled and carried groceries. It came to ${fmtMoney(v)}, and it all went into the jar on the shelf.`; } },
    ['Complain about it', (s) => { const p = relPeople(s, ['parent', 'stepparent'])[0]; if (p) addRel(s, p.id, -5); add(s, { happy: -1 }); return 'You said it was not fair. It was not, and that did not help anybody.'; }],
  ],
});
EV('wd_dustbowl', {
  ages: [16, 75], once: true, emoji: '🌪️',
  when: (s) => P(s).country === 'us' && s.year >= 1931 && s.year <= 1939 && worldHas(s, 'depression') && wdFarm(s) && free(s),
  text: 'The rain has not come in years, and the topsoil is going up in black clouds that turn noon into night. The crop is gone again.',
  choices: [
    ['Pack up and head west', (s) => {
      const m = M(s), cost = price(s, 400);
      if (m.career) leaveJob(s, 'switched');
      const dep = leaveRental(s, 'moved');
      m.housing = { type: 'homeless', assetId: null, rent: 0, name: '' };
      relocate(s, 'us', 'Los Angeles');
      m.money = Math.max(-cost, m.money - cost);
      add(s, { happy: -4 });
      openRentals(s, 'You arrived in Los Angeles with what fit on the truck. Find a place to live.');
      return `You loaded what you could onto the truck, along with everyone you were responsible for, and drove west. ${dep || ''}`.trim();
    }],
    ['Stay and fight the dust', (s) => { add(s, { health: -6, happy: -4, karma: 1 }); const c = M(s).career; if (c) c.salary = Math.round(c.salary * 0.8); else M(s).money -= price(s, 500); return { text: 'You kept wet cloths on the windows and dust in your lungs, and held on. Some of your neighbors did not.', tone: 'bad' }; }],
  ],
});

/* ---- the Second World War --------------------------------------------------------------- */
EV('wd_evacuee', {
  ages: [4, 15], once: true, emoji: '🧳',
  when: (s) => P(s).country === 'uk' && s.year >= 1939 && s.year <= 1941 && worldHas(s, 'ww2'),
  text: 'The government is sending children out of the cities, away from the bombing. Your school is going, with name tags tied to coats and a gas mask in a box around every neck.',
  choices: [
    ['Go with your class', (s) => { for (const p of relPeople(s, ['parent'])) addRel(s, p.id, -4); add(s, { happy: -4, smarts: 1 }); return 'You rode a train for hours and ended up on a farm with strangers. They were kind, mostly. You learned to milk a cow, and to write home without crying.'; }],
    ['Stay with your parents', (s) => { add(s, { happy: 1 }); for (const p of relPeople(s, ['parent'])) addRel(s, p.id, 3); return 'Your parents could not bear to send you. Every night you slept with your shoes by the bed.'; }],
  ],
});
EV('wd_airraid', {
  ages: [5, 85], cooldown: 2, emoji: '🚨',
  when: (s) => P(s).country === 'uk' && s.year >= 1940 && s.year <= 1945 && worldHas(s, 'ww2'),
  text: 'The siren goes in the middle of the night. Somewhere far above, there is a sound like a train.',
  choices: [
    ['Run for the shelter', (s) => { add(s, { happy: -2 }); return 'You sat in the damp with your neighbors until the all-clear, sharing tea out of a flask. Someone sang. In the morning the street at the end was gone.'; }],
    ['Stay in bed and hope', (s) => { if (chance(0.06)) { add(s, { health: -15, happy: -6 }); return { text: 'A window came in, and the ceiling after it. You were lucky, and you were hurt.', tone: 'bad' }; } add(s, { happy: -1 }); return 'You pulled the blanket over your head. Nothing fell on you. You do not recommend it.'; }],
    ['Help the wardens', (s) => { add(s, { karma: 3, happy: -1 }); if (chance(0.05)) { add(s, { health: -12 }); return { text: 'You pulled a neighbor out of a cellar. You were hurt doing it, and you would do it again.', tone: 'good' }; } return 'You carried buckets and held a lamp for the wardens until morning. Nobody thanked you, and you did not need them to.'; }],
  ],
});
EV('wd_victory_garden', {
  ages: [10, 80], once: true, emoji: '🥕',
  when: (s) => ['uk', 'us', 'ca', 'au', 'de'].includes(P(s).country) && s.year >= 1941 && s.year <= 1945 && worldHas(s, 'ww2'),
  text: 'The government is asking everyone to grow their own food. There are posters on every wall: "Dig for victory."',
  choices: [
    ['Dig up the lawn', (s) => { addSkill(s, 'cooking', 3); const v = price(s, 40); add(s, { happy: 1, money: v }); return `Potatoes, beans and one very proud cabbage. It saved ${fmtMoney(v)} and fed the street.`; }],
    ['Leave the lawn alone', () => 'You kept the lawn. It is a lawn.'],
  ],
});
EV('wd_enlist_pearl', {
  ages: [18, 38], once: true, emoji: '🇺🇸',
  when: (s) => P(s).country === 'us' && s.year >= 1941 && s.year <= 1942 && worldHas(s, 'ww2') && free(s) && !inService(s),
  text: 'The recruiting office has a line around the block, and the posters on the wall are very clear about what the country needs.',
  choices: [
    ['Enlist today', (s) => applyJob(s, 'military')],
    ['Wait for your number', () => 'You carried on. The draft board would find you soon enough, if it was going to.'],
  ],
});
EV('wd_end_of_war', {
  ages: [3, 95], sure: true, once: true, emoji: '🎉',
  when: (s) => s.year === 1945 && ['uk', 'us', 'ca', 'au'].includes(P(s).country) && worldHas(s, 'ww2'),
  auto: (s) => {
    add(s, { happy: 5 });
    return P(s).country === 'uk' ? 'The bells rang and the pubs ran dry. The whole street was out, someone dragged a piano onto the pavement, and nobody went to bed until it was light.'
      : 'The whole country went into the streets. Strangers hugged strangers. Church bells rang for hours, and nobody could stop smiling.';
  },
  text: 'The war is over.',
});

/* ---- COVID-19 -------------------------------------------------------------------------------- */
EV('wd_lockdown', {
  ages: [7, 95], sure: true, once: true, emoji: '🏠',
  when: (s) => s.year === 2020 && worldHas(s, 'covid'),
  text: (s) => (A(s) < 13 ? 'School is closed and nobody can go out. You are home all day, every day, with nothing to do.' : 'The streets are empty and everything is shut. You are home, and it looks like you will be for a long time.'),
  choices: [
    ['Learn something new', (s) => { const k = pick(['cooking', 'coding', 'art', 'writing', 'music']); addSkill(s, k, 5); add(s, { happy: 1 }); return `You taught yourself ${SKILLS[k].name.toLowerCase()} from videos and a lot of stubbornness. You are not bad at it.`; }],
    ['Bake bread and binge TV', (s) => { add(s, { happy: 2, health: -1, looks: -1 }); return 'You baked a great deal of bread. You watched every series ever made. You regret nothing, mostly.'; }],
    ['Check on your neighbors', (s) => { add(s, { karma: 3, happy: 1 }); return 'You left groceries on doorsteps and waved across the street. You know the names of everyone on your block now.'; }],
    ['Doomscroll', (s) => { add(s, { happy: -4 }); return { text: 'You read every headline, every hour. It did not help, and it did not stop.', tone: 'bad' }; }],
  ],
});
EV('wd_covid_wedding', {
  ages: [20, 70], once: true, emoji: '💒',
  when: (s) => s.year >= 2020 && s.year <= 2021 && worldHas(s, 'covid') && relPeople(s, ['fiance']).length > 0,
  ctx: (s) => someone(s, ['fiance']),
  text: (s, c) => `Your wedding to ${nm(s, c.pid)} was set for this year. Nobody is allowed to gather, and the venue has called.`,
  choices: [
    ['Postpone it', (s, c) => { add(s, { happy: -3 }); addRel(s, c.pid, 2); return 'You moved it to next year, then the year after. The cake was frozen. It was fine, and it was not the same.'; }],
    { label: 'Do it small anyway', sub: (s) => fmtMoney(price(s, 300)), fx: (s, c) => {
      const cost = price(s, 300);
      if (!pay(s, cost)) return cantAfford(cost);
      const p = marry(s, c.pid);
      addRel(s, c.pid, 10); add(s, { happy: 6 });
      return { text: `Eight guests on the lawn, the rest on a video call. You married ${p.first} in the garden, and the dog ate part of the flowers.`, tone: 'good', person: p.id };
    } },
  ],
});
EV('wd_window_visit', {
  ages: [8, 95], sure: true, once: true, emoji: '👵',
  when: (s) => s.year === 2020 && worldHas(s, 'covid') && relPeople(s, ['parent', 'grandparent']).some((p) => p.alive && ageOf(s, p) >= 65),
  ctx: (s) => someone(s, ['parent', 'grandparent'], (p) => ageOf(s, p) >= 65),
  text: (s, c) => `${nm(s, c.pid)} is in a home, or living alone, and nobody is allowed in. You can see ${genderWord(s.people[c.pid], 'him', 'her', 'them')} through a window.`,
  choices: [
    ['Visit through the window', (s, c) => { addRel(s, c.pid, 8); add(s, { happy: 2 }); return 'You held up a sign, then a phone, then your hand against the glass. They cried and then you did.'; }],
    ['Stay away and call', (s, c) => { addRel(s, c.pid, 2); add(s, { happy: -2 }); return 'You called every night. It was the right thing, and it was very quiet.'; }],
  ],
});
EV('wd_covid_vaccine', {
  ages: [12, 100], sure: true, once: true, emoji: '💉',
  when: (s) => s.year === 2021 && worldHas(s, 'covid'),
  text: 'A vaccine is available, and people are lining up for it. It is your decision.',
  choices: [
    ['Get it as soon as you can', (s) => { M(s).flags.vaxd = true; add(s, { happy: 1 }); return 'Two doses, a sore arm, and a day in bed. You got a small card with the date on it.'; }],
    ['Wait and see', () => 'You decided to wait and watch how it went for other people.'],
    ['Skip it', () => 'You decided it was not for you. You carried on as before.'],
  ],
});
EV('wd_covid_crash', {
  ages: [18, 100], sure: true, once: true, emoji: '📉',
  when: (s) => s.year === 2020 && worldHas(s, 'covid') && wdMine(s) >= price(s, 3000),
  text: 'In a few weeks the markets have fallen by a third. Your investments have too, and the news says it will be worse.',
  choices: [
    ['Sell everything', (s) => { const m = M(s), v = Math.round(wdMine(s) * 0.7); m.invest.index = 0; m.invest.stocks = 0; m.money += v; add(s, { happy: -2 }); return { text: `You sold at the bottom and kept ${fmtMoney(v)}. By the end of the year, the market was higher than before it fell.`, tone: 'bad' }; }],
    ['Hold on', (s) => { add(s, { happy: 1 }); return { text: 'You did not look at the account for a month. By the end of the year it had all come back, and more.', tone: 'good' }; }],
  ],
});

/* ---- living through it ----------------------------------------------------------------------- */
ACHIEVEMENTS.push(
  { id: 'wd_hard_times', name: 'Hard Times', emoji: '🏚️', desc: 'Live through the Great Depression.', check: (s) => (M(s).worldLived || []).includes('depression') },
  { id: 'wd_war_years', name: 'The War Years', emoji: '🌍', desc: 'Live through the Second World War.', check: (s) => (M(s).worldLived || []).includes('ww2') },
  { id: 'wd_stayed_home', name: 'Stayed Home', emoji: '😷', desc: 'Live through the COVID-19 pandemic.', check: (s) => (M(s).worldLived || []).includes('covid') },
);
