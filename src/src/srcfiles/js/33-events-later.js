/* =====================================================================
 * 33-events-later.js — event content for seniors, any age, and prison.
 * ===================================================================== */

/* ---- seniors (60+) ------------------------------------------------- */
EV('sr_scam_call', {
  ages: [60, 115], emoji: '☎️', text: 'A frantic caller says your grandkid is in jail and needs bail money wired immediately.',
  choices: [
    ['Wire the money', (s) => { const loss = Math.min(Math.max(0, M(s).money), price(s, randInt(2000, 9000))); M(s).money -= loss; add(s, { happy: -8 }); return `It was a scam. You lost ${fmtMoney(loss)}.`; }],
    ['Hang up', () => 'You hung up. Nice try, scammer.'],
    ['Call your grandkid directly', (s) => { add(s, { smarts: 1 }); return 'Your grandkid was at home playing video games. It was a scam.'; }],
  ],
});
EV('sr_fall', {
  ages: [65, 115], w: 1.3, emoji: '🤕', text: 'You took a nasty fall at home.',
  auto: (s) => { if (chance(0.3)) { getSick(s, chance(0.5) ? 'broken_leg' : 'broken_arm'); return 'You broke a bone.'; } add(s, { health: -randInt(3, 8) }); return 'You are bruised but okay.'; },
});
EV('sr_tech', {
  ages: [60, 100], when: (s) => !M(s).socials, emoji: '📲', text: 'Your family offers to teach you how to use social media.',
  choices: [
    ['Sure, why not!', (s) => { M(s).socials = { followers: randInt(5, 60), posts: 0, verified: false, handle: '@' + P(s).first.toLowerCase().replace(/[^a-z]/g, '') + randInt(10, 99) }; add(s, { happy: 3 }); return 'You posted 47 photos of your garden on day one.'; }],
    ['Absolutely not', () => 'Back in your day, you had letters.'],
  ],
});
EV('sr_bingo', {
  ages: [60, 115], emoji: '🔢', text: 'The community center is hosting bingo night.',
  choices: [
    ['Play', (s) => { add(s, { happy: 3 }); if (chance(0.15 + (trait(s, 'lucky') ? 0.1 : 0))) { const w = price(s, randInt(20, 400)); add(s, { money: w }); return `BINGO! You won ${fmtMoney(w)}.`; } return 'You were one number away. Every single time.'; }],
    ['Stay home', () => 'You stayed in with a good book.'],
  ],
});
EV('sr_memoir', {
  ages: [55, 100], emoji: '📖', text: "You're thinking of writing a memoir about your life.",
  choices: [
    ['Write it', (s) => { addSkill(s, 'writing', 6); add(s, { happy: 4 }); if (chance(0.1 + skill(s, 'writing') / 200 + M(s).fame / 200)) { const w = price(s, randInt(5000, 250000)); add(s, { money: w, fame: 4 }); return `A publisher bought it! You earned ${fmtMoney(w)}.`; } return 'You printed a few copies for the family.'; }],
    ['Nobody would read it', () => 'You are probably wrong about that.'],
  ],
});
EV('sr_cruise', {
  ages: [60, 100], emoji: '🛳️', text: 'A travel agent pitches you a two-week senior cruise.',
  choices: [
    { label: 'Book it', sub: (s) => fmtMoney(price(s, 5000)), fx: (s) => { const cost = price(s, 5000); if (!pay(s, cost)) return cantAfford(cost); add(s, { happy: 10 }); tally(s, 'vacations'); return 'You won the shuffleboard tournament. Twice.'; } },
    ['Pass', () => 'Maybe next year.'],
  ],
});
EV('sr_surprise_party', { ages: [70, 115], cooldown: 10, when: (s) => relPeople(s, ['child', 'grandchild']).length > 0, emoji: '🎉', text: 'Your family threw you a surprise birthday party.', auto: (s) => { add(s, { happy: 8 }); relAll(s, ['child', 'grandchild'], 5); return 'You pretended to be surprised. You were actually surprised.'; } });
EV('sr_garden_club', {
  ages: [55, 110], emoji: '🌷', text: 'The neighborhood garden club invites you to join.',
  choices: [
    ['Join', (s) => { add(s, { happy: 4 }); const p = meetSomeone(s, 'friend', randInt(45, 65)); return { text: `You joined the garden club and became friends with ${p.first}.`, person: p.id }; }],
    ['No thanks', () => 'Your garden, your rules.'],
  ],
});

/* ---- any age ------------------------------------------------------- */
EV('any_dream', { ages: [5, 115], w: 0.7, emoji: '💭', text: () => `You had a strange dream about ${pick(['flying over your hometown', 'your teeth falling out', 'being chased by a giant chicken', 'showing up to school in pajamas', 'a talking cat who knew your secrets', 'winning the lottery'])}.`, auto: () => '' });
EV('any_clover', { ages: [5, 95], w: 0.5, emoji: '🍀', text: 'You found a four-leaf clover.', auto: (s) => { add(s, { happy: 2, karma: 1 }); return 'Feeling lucky.'; } });
EV('any_witness', {
  ages: [10, 90], emoji: '👀', text: () => `You saw someone ${pick(['snatch a purse', 'steal a bike', 'shoplift from a corner store'])} right in front of you.`,
  choices: [
    ['Chase the thief', (s) => { if (skill(s, 'fitness') + randInt(0, 60) > 50) { add(s, { karma: 5, happy: 4, fame: 1 }); return 'You tackled the thief! The victim hugged you.'; } add(s, { health: -3 }); return 'The thief got away. You pulled a muscle.'; }],
    ['Call the police', (s) => { add(s, { karma: 2 }); return 'You gave the police a description.'; }],
    ['Do nothing', (s) => { add(s, { karma: -2 }); return 'Not your problem.'; }],
  ],
});
EV('any_celebrity', { ages: [8, 95], w: 0.6, emoji: '🤩', text: () => `You spotted a famous ${pick(['actor', 'singer', 'athlete', 'chef', 'influencer'])} at ${pick(['the airport', 'a coffee shop', 'the grocery store', 'the gym'])}.`, auto: (s) => { add(s, { happy: 2 }); return pick(['You played it cool.', 'You asked for a selfie. They said yes!', 'You stared. They noticed.']); } });
EV('any_blackout', { ages: [4, 115], w: 0.5, emoji: '🌩️', text: 'A big storm knocked out the power for two days.', auto: (s) => { add(s, { happy: -2 }); return 'You played board games by candlelight.'; } });
EV('any_hotdog', {
  ages: [12, 75], emoji: '🌭', text: 'A hot dog eating contest is happening downtown.',
  choices: [
    ['Enter', (s) => { add(s, { health: -3 }); if (chance(0.15)) { const w = price(s, 500); add(s, { money: w, happy: 6, fame: 1 }); return `You ate 27 hot dogs and won ${fmtMoney(w)}!`; } return 'You tapped out after nine. Respectable.'; }],
    ['Just watch', () => 'It was disgusting. You could not look away.'],
  ],
});
EV('any_fortune', {
  ages: [10, 95], emoji: '🔮', text: 'A fortune teller beckons you into her tent.',
  choices: [
    { label: 'Get a reading', sub: (s) => fmtMoney(price(s, 20)), fx: (s) => { const c = price(s, 20); if (!pay(s, c)) return cantAfford(c); add(s, { happy: randInt(-2, 4) }); return `"${pick(['You will find great fortune... eventually.', 'Beware of anyone named Steve.', 'A big change is coming.', 'Love is closer than you think.', 'You will live a long life. Or a short one. The cards are unclear.'])}"`; } },
    ['Walk past', () => 'You do not need a crystal ball to know you are hungry.'],
  ],
});
EV('any_raffle', {
  ages: [8, 95], emoji: '🎟️', text: 'A local fundraiser is selling raffle tickets.',
  choices: [
    { label: 'Buy a ticket', sub: (s) => fmtMoney(price(s, 10)), fx: (s) => { const c = price(s, 10); if (!pay(s, c)) return cantAfford(c); add(s, { karma: 1 }); if (chance(0.06 * (trait(s, 'lucky') ? 2 : 1))) { const prize = pick(['a cruise', 'a big-screen TV', 'a year of free pizza', 'a used car']); add(s, { happy: 8 }); return `You won ${prize}!`; } return 'You did not win, but it was for a good cause.'; } },
    ['Pass', () => 'You passed.'],
  ],
});
EV('any_lost_phone', { ages: [10, 95], w: 0.7, emoji: '📵', text: 'You lost your phone.', auto: (s) => { if (A(s) >= 18) { const c = price(s, randInt(200, 900)); M(s).money -= c; return `A new one cost ${fmtMoney(c)}.`; } relAll(s, ['parent'], -3); return 'Your parents were not happy about buying another.'; } });
EV('any_news', {
  ages: [12, 95], emoji: '📺', text: () => `A local news crew asks your opinion on ${pick(['the new stadium', 'the pigeon problem', 'the weather', 'a giant pothole', 'pineapple on pizza'])}.`,
  choices: [
    ['Give a thoughtful answer', (s) => { add(s, { smarts: 1 }); return 'You sounded very smart on the evening news.'; }],
    ['Say something ridiculous', (s) => { if (chance(0.3)) { add(s, { fame: 3, happy: 4 }); if (M(s).socials) M(s).socials.followers += randInt(1000, 50000); return 'Your clip went viral. People are making memes of you.'; } return 'They did not use your clip.'; }],
    ['Run away', () => 'You ducked out of frame.'],
  ],
});
EV('any_goose', {
  ages: [5, 90], w: 0.5, emoji: '🦢', text: 'An angry goose is chasing you across the park.',
  choices: [
    ['Stand your ground', (s) => (chance(0.4) ? (add(s, { happy: 4 }), 'You puffed up your chest. The goose backed down. Respect.') : (add(s, { health: -2 }), 'The goose won. Geese always win.'))],
    ['Run!', (s) => { addSkill(s, 'fitness', 1); return 'You ran faster than you have ever run.'; }],
  ],
});
EV('any_karma_reward', { ages: [12, 100], w: 0.5, when: (s) => M(s).karma >= 80, emoji: '🌟', text: 'A stranger you once helped tracked you down to say thank you.', auto: (s) => { add(s, { happy: 6 }); return 'It made your whole year.'; } });
EV('any_karma_bite', { ages: [12, 100], w: 0.5, when: (s) => M(s).karma <= 20, emoji: '🌀', text: 'Bad luck seems to follow you around lately.', auto: (s) => { add(s, { happy: -4, health: -2 }); return pick(['A bird pooped on you. Twice.', 'You stubbed your toe every day this week.', 'Your umbrella broke in a downpour.']); } });
EV('any_volunteer_call', {
  ages: [12, 90], emoji: '🧤', text: 'Your neighborhood is organizing a cleanup day.',
  choices: [
    ['Volunteer', (s) => { add(s, { karma: 3, happy: 2 }); tally(s, 'volunteering'); return 'You picked up a mountain of trash. The park looks great.'; }],
    ['Sleep in', () => 'You slept in.'],
  ],
});
EV('any_free_concert', { ages: [10, 90], w: 0.5, emoji: '🎶', text: 'There was a free concert in the park.', auto: (s) => { add(s, { happy: 3 }); return 'You danced with strangers under the stars.'; } });
EV('any_enemy_strikes', {
  ages: [10, 95], w: 0.8, emoji: '😈', ctx: (s) => someone(s, ['enemy']), text: (s, c) => `Your enemy ${nm(s, c.pid)} ${pick(['spread a nasty rumor about you', 'keyed your car', 'egged your house', 'trash-talked you to everyone'])}.`,
  choices: [
    ['Get revenge', (s, c) => { addRel(s, c.pid, -5); add(s, { karma: -2, happy: 3 }); return 'You got even. For now.'; }],
    ['Rise above it', (s) => { add(s, { karma: 2 }); return 'You did not take the bait.'; }],
    ['Try to make peace', (s, c) => { if (chance(0.35)) { setRel(s, c.pid, 'friend', 35); return `You and ${nm(s, c.pid)} called a truce.`; } return `${nm(s, c.pid)} laughed in your face.`; }],
  ],
});
EV('any_heatwave', { ages: [0, 115], w: 0.4, emoji: '🥵', text: 'A brutal heatwave hit the city.', auto: (s) => { if (A(s) >= 75) { add(s, { health: -4 }); return 'It was hard on your body.'; } add(s, { happy: -1 }); return 'You spent the week in front of a fan.'; } });

/* ---- prison -------------------------------------------------------- */
EV('pr_shove', {
  ages: [10, 120], prison: true, w: 2, emoji: '🥊', text: 'An inmate shoved you in the lunch line.',
  choices: [
    ['Fight back', (s) => { const pr = M(s).prison; pr.behavior = clamp100(pr.behavior - 10); if (skill(s, 'martial') + skill(s, 'fitness') / 2 + randInt(0, 50) + (hasStash(s, 'shiv') ? 20 : 0) > 50 || pr.gang) { add(s, { happy: 4 }); return hasStash(s, 'shiv') ? 'You flashed your shiv. The fight was over before it started.' : 'You won the fight. Nobody messes with you now.'; } add(s, { health: -randInt(6, 15) }); return 'You lost the fight and spent a week in the infirmary.'; }],
    ['Walk away', (s) => { M(s).prison.behavior = clamp100(M(s).prison.behavior + 4); add(s, { happy: -2 }); return 'You walked away. The guards noticed your restraint.'; }],
    ['Tell a guard', (s) => { M(s).prison.behavior = clamp100(M(s).prison.behavior + 3); if (chance(0.4)) { add(s, { health: -8 }); return 'Word got around that you snitched. You paid for it later.'; } return 'The guard moved the other inmate to a different block.'; }],
  ],
});
EV('pr_gang_recruit', {
  ages: [16, 120], prison: true, when: (s) => !M(s).prison.gang && !M(s).prison.juvie, emoji: '🐍', text: () => `A member of ${pick(GANGS)} says you should join them. "For your protection."`,
  choices: [
    ['Join', (s) => { M(s).prison.gang = pick(GANGS); M(s).prison.behavior = clamp100(M(s).prison.behavior - 10); addSkill(s, 'streetwise', 4); return `You joined ${M(s).prison.gang}.`; }],
    ['Decline', (s) => (chance(0.35) ? (add(s, { health: -8 }), 'They did not take no for an answer. You got jumped in the showers.') : 'They shrugged and walked away.')],
  ],
});
EV('pr_contraband', {
  ages: [10, 120], prison: true, emoji: '🍫', ctx: (s) => someone(s, ['cellmate']), text: (s, c) => `Your cellmate ${nm(s, c.pid)} offers to sell you contraband snacks.`,
  choices: [
    ['Buy some', (s, c) => { const cost = price(s, 30); if (!pay(s, cost)) return cantAfford(cost); addRel(s, c.pid, 6); add(s, { happy: 4 }); stash(s).candy = (stash(s).candy || 0) + 2; return 'Smuggled candy has never tasted so good. You saved two bars for your stash.'; }],
    ['Report them', (s, c) => { addRel(s, c.pid, -25); M(s).prison.behavior = clamp100(M(s).prison.behavior + 6); return `You reported ${nm(s, c.pid)}. Your cell is very quiet now.`; }],
    ['No thanks', () => 'You passed.'],
  ],
});
EV('pr_escape_plan', {
  ages: [14, 120], prison: true, emoji: '🗺️', ctx: (s) => someone(s, ['cellmate']), text: (s, c) => `${nm(s, c.pid)} has a detailed escape plan and wants you in on it.`,
  choices: [
    ['Join the escape', (s, c) => {
      const pr = M(s).prison;
      if (chance(0.3 + skill(s, 'streetwise') / 300)) { M(s).wanted = Math.max(1, pr.total >= 99 ? 30 : pr.yearsLeft); M(s).prison = null; tally(s, 'escapes'); if (M(s).housing.type !== 'own') M(s).housing = { type: 'homeless', assetId: null, rent: 0, name: '' }; add(s, { happy: 12 }); return { text: `You and ${nm(s, c.pid)} escaped through the laundry chute! You are now a fugitive.`, tone: 'good' }; }
      if (pr.total < 99) pr.yearsLeft += randInt(2, 4);
      pr.behavior = clamp100(pr.behavior - 25);
      return { text: 'The plan failed. Years were added to your sentence.', tone: 'bad' };
    }],
    ['Refuse', () => 'You want no part of it.'],
    ['Snitch to the warden', (s, c) => { const pr = M(s).prison; addRel(s, c.pid, -40); pr.behavior = clamp100(pr.behavior + 12); if (pr.total < 99 && chance(0.5)) { pr.yearsLeft = Math.max(1, pr.yearsLeft - 1); return 'The warden knocked a year off your sentence for the tip.'; } return 'The warden thanked you. Your cellmate glares at you every night.'; }],
  ],
});
EV('pr_visit', { ages: [10, 120], prison: true, emoji: '🪑', ctx: (s) => someone(s, ['parent', 'spouse', 'partner', 'bestie', 'child', 'sibling'], (p) => ageOf(s, p) >= 12), text: (s, c) => `${nm(s, c.pid)} came to visit you in prison.`, auto: (s, c) => { addRel(s, c.pid, 6); add(s, { happy: 5 }); return pick(['They brought photos from home.', 'You both cried a little.', 'They told you everyone misses you.']); } });
EV('pr_letter', { ages: [10, 120], prison: true, w: 0.7, emoji: '✉️', text: 'You received a letter from a pen pal.', auto: (s) => { add(s, { happy: 3 }); addSkill(s, 'writing', 1); return 'You wrote back four pages.'; } });
EV('pr_work_release', {
  ages: [18, 120], prison: true, when: (s) => M(s).prison.behavior >= 60, emoji: '🧹', text: 'The warden offers you a spot in the work-release program.',
  choices: [
    ['Join it', (s) => { M(s).prison.behavior = clamp100(M(s).prison.behavior + 10); add(s, { money: price(s, randInt(300, 1200)) }); return 'You spent the year working outside the walls. It felt like freedom.'; }],
    ['Pass', () => 'You stayed inside.'],
  ],
});
EV('pr_lockdown', {
  ages: [10, 120], prison: true, w: 0.6, emoji: '🔒', text: 'The prison went on lockdown for three weeks.',
  auto: (s) => { add(s, { happy: -4 }); spikeContraband(s, 1.8); return stashCount(s) ? 'Nothing got in or out. On the bright side, your stash is worth a lot more now.' : 'You stared at the ceiling a lot. Contraband prices went through the roof.'; },
});

/* ---- prison economy & romance -------------------------------------- */
EV('pr_shakedown', {
  ages: [10, 120], prison: true, w: 1.5, when: (s) => stashCount(s) > 0, emoji: '🔦',
  text: (s) => `Guards are tossing every cell on your block, and your stash (${stashLine(s)}) is not well hidden.`,
  choices: [
    ['Hide it better', (s) => {
      if (chance(clamp(0.45 + skill(s, 'streetwise') / 300 + (trait(s, 'cunning') ? 0.1 : 0), 0.1, 0.85))) return 'The guards walked right past your hiding spot.';
      return { text: `They found everything.${bustStash(s, CONTRABAND_IDS)}`, tone: 'bad' };
    }],
    ['Flush it before they get here', (s) => {
      const phone = hasStash(s, 'phone');
      for (const id of CONTRABAND_IDS) takeStash(s, id, Infinity);
      return phone ? 'The phone would not flush, so you smashed it first. The rest went down without a fight.' : 'You flushed it all with seconds to spare.';
    }],
    { label: "Plant it in your cellmate's bunk", when: (s) => !!pickRel(s, ['cellmate']), fx: (s) => {
      const cm = pickRel(s, ['cellmate']);
      if (!cm) return 'The moment passed.';
      add(s, { karma: -6 });
      if (chance(0.5)) { const r = addRel(s, cm, -35); if (r.rel < 20) setRel(s, cm, 'enemy', r.rel); for (const id of CONTRABAND_IDS) takeStash(s, id, Infinity); return `The guards found it all in ${nm(s, cm)}'s bunk. ${nm(s, cm)} got solitary. Your record is still clean.`; }
      addRel(s, cm, -20);
      return { text: `${nm(s, cm)} caught you planting it and told the guards everything.${bustStash(s, CONTRABAND_IDS)}`, tone: 'bad' };
    } },
  ],
});
EV('pr_crooked_guard', {
  ages: [16, 120], prison: true, w: 0.7, when: (s) => !M(s).prison.juvie && !hasStash(s, 'phone'), emoji: '💂',
  text: 'A guard leans in close. For the right price, they can bring in anything you want.',
  choices: [
    { label: 'Order a phone', sub: (s) => fmtMoney(price(s, 700)), fx: (s) => { const cost = price(s, 700); if (!pay(s, cost)) return cantAfford(cost); stash(s).phone = (stash(s).phone || 0) + 1; return 'Two days later, a phone was waiting under your pillow.'; } },
    ['Report them to the warden', (s) => { M(s).prison.behavior = clamp100(M(s).prison.behavior + 8); if (chance(0.3)) { add(s, { health: -6, happy: -4 }); return 'The warden thanked you. The guard made the rest of your year miserable.'; } return 'The guard was quietly transferred. The warden owes you one.'; }],
    ['Not interested', () => 'They shrugged and walked off.'],
  ],
});
EV('pr_penpal_love', {
  ages: [18, 120], prison: true, w: 0.6, when: (s) => !romanticId(s), emoji: '💌',
  text: "Your pen pal's letters have started ending with little hearts.",
  choices: [
    ['Draw hearts back', (s) => {
      const p = candidatePerson(s);
      setRel(s, p.id, 'friend', 60);
      startRomance(s, p.id);
      return { text: `You and ${p.first} are officially a couple, by mail. 💕`, tone: 'good', person: p.id };
    }],
    ['Keep it friendly', (s) => { const p = candidatePerson(s); setRel(s, p.id, 'friend', 55); add(s, { happy: 2 }); return { text: `You and ${p.first} are just pen pals. It's nice having a friend on the outside.`, person: p.id }; }],
    ['Stop writing', (s) => { add(s, { happy: -1 }); return 'You never wrote back.'; }],
  ],
});
EV('pr_chapel_wedding', {
  ages: [18, 120], prison: true, w: 0.8, emoji: '💒',
  ctx: (s) => { const id = romanticId(s); return id && isKind(s, id, ['partner', 'fiance']) ? { pid: id } : null; },
  text: (s, c) => `${nm(s, c.pid)} wants to get married in the prison chapel. The guards would be your witnesses.`,
  choices: [
    ['Say "I do"', (s, c) => { if (!isKind(s, c.pid, ['partner', 'fiance'])) return 'The moment passed.'; marry(s, c.pid); add(s, { happy: 12 }); return { text: `You married ${nm(s, c.pid)} in the prison chapel. The cake was a stack of honey buns. It was perfect.`, tone: 'good', person: c.pid }; }],
    ['Wait until you get out', (s, c) => { addRel(s, c.pid, -4); return `${nm(s, c.pid)} said they'd wait for you.`; }],
  ],
});
