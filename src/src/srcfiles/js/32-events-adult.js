/* =====================================================================
 * 32-events-adult.js — event content for adult life: money, home,
 * work, love and family.
 * ===================================================================== */

const hasJob = (s) => !!M(s).career;
const regularJob = (s) => !!M(s).career && !JOBS[M(s).career.id].special;

/* ---- everyday adult life ------------------------------------------- */
EV('ad_roommate', {
  ages: [18, 35], when: (s) => M(s).housing.type === 'rent', emoji: '🍕', text: 'Your roommate keeps eating your leftovers.',
  choices: [
    ['Confront them', (s) => (chance(0.6) ? 'They apologized and bought you a pizza.' : 'They denied everything with cheese on their face.')],
    ['Label everything', (s) => { add(s, { happy: 1 }); return 'Your fridge now looks like a filing cabinet.'; }],
    ['Eat their food in revenge', (s) => { add(s, { happy: 2, karma: -1 }); return 'Their fancy cheese was delicious.'; }],
  ],
});
EV('ad_lend', {
  ages: [18, 90], emoji: '🤲', ctx: (s) => someone(s, ['friend', 'bestie', 'sibling', 'halfsibling'], (p) => ageOf(s, p) >= 18),
  text: (s, c) => `${nm(s, c.pid)} asks to borrow ${fmtMoney(price(s, 1000))}.`,
  choices: [
    { label: 'Lend it', sub: (s) => fmtMoney(price(s, 1000)), fx: (s, c) => {
      const amt = price(s, 1000);
      if (!pay(s, amt)) return cantAfford(amt);
      addRel(s, c.pid, 10);
      if (chance(0.55)) { M(s).money += amt; return `${nm(s, c.pid)} paid you back in full. Faith in humanity restored.`; }
      return `${nm(s, c.pid)} has "forgotten" about the loan.`;
    } },
    ['Refuse', (s, c) => { addRel(s, c.pid, -8); return `${nm(s, c.pid)} said they understood. They did not understand.`; }],
  ],
});
EV('ad_wedding_invite', {
  ages: [20, 75], emoji: '💌', ctx: (s) => someone(s, ['friend', 'bestie', 'sibling', 'coworker'], (p) => ageOf(s, p) >= 20),
  text: (s, c) => `${nm(s, c.pid)} invited you to their wedding.`,
  choices: [
    { label: 'Go and bring a nice gift', sub: (s) => fmtMoney(price(s, 150)), fx: (s, c) => { const amt = price(s, 150); if (!pay(s, amt)) return cantAfford(amt); addRel(s, c.pid, 10); add(s, { happy: 4 }); return pick(['You cried during the vows.', 'You caught the bouquet!', 'You danced until they kicked everyone out.', 'The open bar was very open.']); } },
    ['Skip it', (s, c) => { addRel(s, c.pid, -8); return `You sent your regrets. ${nm(s, c.pid)} noticed your empty seat.`; }],
  ],
});
EV('ad_scam_email', {
  ages: [18, 95], emoji: '📧', text: 'You got an email from a "prince" who needs your help moving $10 million out of his country.',
  choices: [
    ['Send your bank details', (s) => { const loss = Math.min(Math.max(0, M(s).money), price(s, randInt(500, 5000))); M(s).money -= loss; add(s, { happy: -6 }); return `The "prince" emptied ${fmtMoney(loss)} from your account. Royalty, huh.`; }],
    ['Delete it', () => 'Delete. Obviously.'],
    ['Report it', (s) => { add(s, { karma: 1 }); return 'You reported the scam. Small victories.'; }],
  ],
});
EV('ad_pyramid', {
  ages: [18, 70], emoji: '🔺', ctx: (s) => someone(s, ['friend', 'bestie', 'sibling', 'inlaw']),
  text: (s, c) => `${nm(s, c.pid)} invited you to join an "amazing business opportunity" selling ${pick(['essential oils', 'leggings', 'energy drinks', 'miracle face cream', 'knives'])}.`,
  choices: [
    { label: 'Buy in', sub: (s) => fmtMoney(price(s, 2000)), fx: (s) => { const amt = price(s, 2000); if (!pay(s, amt)) return cantAfford(amt); if (chance(0.08)) { const w = price(s, randInt(5000, 30000)); add(s, { money: w }); addSkill(s, 'business', 3); return `Against all odds, you made ${fmtMoney(w)}. Don't tell anyone.`; } add(s, { happy: -4 }); return 'Your garage is now full of product nobody wants.'; } },
    ['Politely decline', (s, c) => { addRel(s, c.pid, -2); return 'You said you would "think about it." Forever.'; }],
    ['Explain how pyramid schemes work', (s, c) => { addRel(s, c.pid, -6); add(s, { smarts: 1 }); return `You drew a diagram. ${nm(s, c.pid)} was not amused.`; }],
  ],
});
EV('ad_tattoo', {
  ages: [18, 65], emoji: '🖋️', text: "You've been thinking about getting a tattoo.",
  choices: [
    { label: 'Get one', sub: (s) => fmtMoney(price(s, 200)), fx: (s) => { const cost = price(s, 200); if (!pay(s, cost)) return cantAfford(cost); tally(s, 'tattoos'); const what = pick(['a dragon', 'your mom’s name', 'a tiny heart', 'a quote in a language you don’t speak', 'a sleeve of flowers', 'a portrait of your pet']); if (chance(0.15)) { add(s, { looks: -2, happy: -4 }); return `You got ${what}. It's spelled wrong.`; } add(s, { looks: randInt(0, 2), happy: 5 }); return `You got ${what}. You love it.`; } },
    ['Maybe not', () => 'Your skin remains a blank canvas.'],
  ],
});
EV('ad_haircut', { ages: [10, 95], w: 0.6, emoji: '💇', text: 'Your hairdresser had a very creative day.', auto: (s) => { add(s, { looks: -2, happy: -2 }); return 'You are wearing a hat for a few weeks.'; } });
EV('ad_jury', {
  ages: [18, 80], emoji: '⚖️', text: 'You were summoned for jury duty.',
  choices: [
    ['Serve', (s) => { add(s, { karma: 2, smarts: 1 }); return pick(['The case was a dispute over a stolen lawn gnome. You found them guilty.', 'You were the holdout juror. It felt very dramatic.', 'You were dismissed after one day.']); }],
    ['Try to get out of it', (s) => (chance(0.5) ? 'You told the judge you are "very biased against everyone." Dismissed.' : 'The judge was not buying it. You served anyway.')],
  ],
});
EV('ad_tacos', {
  ages: [10, 90], emoji: '🌮', text: 'A food truck is selling suspiciously cheap tacos.',
  choices: [
    ['Eat three', (s) => { if (chance(0.3)) { getSick(s, 'food_poisoning'); return 'You regretted it for 48 hours.'; } add(s, { happy: 4 }); return 'Best tacos of your life.'; }],
    ['Pass', () => 'You walked past. Your stomach thanks you.'],
  ],
});
EV('ad_stock_tip', {
  ages: [20, 85], when: hasJob, emoji: '📈', ctx: (s) => someone(s, ['coworker', 'friend', 'boss']),
  text: (s, c) => `${nm(s, c.pid)} swears a certain stock is "about to explode."`,
  choices: [
    { label: 'Invest', sub: (s) => fmtMoney(price(s, 5000)), fx: (s) => { const amt = price(s, 5000); if (!pay(s, amt)) return cantAfford(amt); const r = rand(); if (r < 0.3) { const g = Math.round(amt * randFloat(1.5, 6)); M(s).money += g; return `It exploded! Upward! You cashed out ${fmtMoney(g)}.`; } if (r < 0.6) { M(s).money += Math.round(amt * randFloat(0.7, 1.2)); return 'It went sideways. You got most of your money back.'; } return 'It exploded. Downward. The money is gone.'; } },
    ['Pass', () => 'You decided not to gamble on a hunch.'],
  ],
});
EV('ad_neighbors', {
  ages: [18, 95], when: (s) => ['rent', 'own'].includes(M(s).housing.type), emoji: '🔊', text: 'Your neighbors throw loud parties every weekend.',
  choices: [
    ['Complain to them', (s) => (chance(0.6) ? 'They apologized and turned it down.' : 'They turned it UP.')],
    ['Join the party', (s) => { add(s, { happy: 5 }); if (chance(0.4)) { const p = meetSomeone(s, 'friend', randInt(45, 65)); return { text: `You joined the party and became friends with your neighbor, ${p.first}.`, person: p.id }; } return 'If you can’t beat them, join them.'; }],
    ['Call the police', (s) => { add(s, { karma: -1 }); return 'The police broke it up. Your neighbors now glare at you.'; }],
  ],
});
EV('ad_stranded', {
  ages: [16, 90], emoji: '🚙', text: "A stranger's car broke down on the side of the road.",
  choices: [
    ['Stop and help', (s) => { add(s, { karma: 4, happy: 2 }); if (chance(0.15)) { const r = price(s, randInt(50, 500)); add(s, { money: r }); return `You changed their tire. They insisted on giving you ${fmtMoney(r)}.`; } return 'You helped them get back on the road.'; }],
    ['Drive past', (s) => { add(s, { karma: -1 }); return 'Someone else will stop.'; }],
  ],
});
EV('ad_puppy', {
  ages: [16, 85], emoji: '🐶', text: 'A lost puppy wandered into your yard.',
  choices: [
    ['Keep it', (s) => { const p = giftPet(s, 'dog'); add(s, { happy: 6 }); return `You named the puppy ${p.name}. 🐶`; }],
    ['Find the owner', (s) => { add(s, { karma: 4 }); return 'You put up posters. A tearful family came to pick it up.'; }],
    ['Take it to a shelter', (s) => { add(s, { karma: 2 }); return 'The shelter will find it a good home.'; }],
  ],
});
EV('ad_parent_bill', {
  ages: [22, 75], emoji: '🏥', ctx: (s) => someone(s, ['parent', 'stepparent'], (p) => ageOf(s, p) >= 55),
  text: (s, c) => `Your ${kinLabel('parent', s.people[c.pid]).toLowerCase()} ${nm(s, c.pid)} needs help paying a ${fmtMoney(price(s, 6000))} medical bill.`,
  choices: [
    { label: 'Pay all of it', sub: (s) => fmtMoney(price(s, 6000)), fx: (s, c) => { const amt = price(s, 6000); if (!pay(s, amt)) return cantAfford(amt); addRel(s, c.pid, 20); add(s, { karma: 4 }); s.people[c.pid].stats.health = clamp100(s.people[c.pid].stats.health + 10); return `${nm(s, c.pid)} cried when you told them.`; } },
    { label: 'Pay half', sub: (s) => fmtMoney(price(s, 3000)), fx: (s, c) => { const amt = price(s, 3000); if (!pay(s, amt)) return cantAfford(amt); addRel(s, c.pid, 9); add(s, { karma: 2 }); return `${nm(s, c.pid)} was grateful for the help.`; } },
    ["You can't help", (s, c) => { addRel(s, c.pid, -10); return `${nm(s, c.pid)} said they understand.`; }],
  ],
});
EV('ad_sibling_crash', {
  ages: [22, 65], when: (s) => ['rent', 'own'].includes(M(s).housing.type), emoji: '🛋️', ctx: (s) => someone(s, ['sibling', 'halfsibling'], (p) => ageOf(s, p) >= 20),
  text: (s, c) => `${nm(s, c.pid)} lost their job and asks to crash on your couch for a while.`,
  choices: [
    ['Let them stay', (s, c) => { addRel(s, c.pid, 15); add(s, { happy: -2, karma: 3 }); return `${nm(s, c.pid)} stayed for four months. They did not do the dishes once.`; }],
    ['Say no', (s, c) => { addRel(s, c.pid, -12); return `${nm(s, c.pid)} is staying with a friend instead. Things are tense.`; }],
  ],
});
EV('ad_hike', {
  ages: [14, 75], emoji: '🥾', text: 'Some friends invite you on a tough mountain hike.',
  choices: [
    ['Go', (s) => { addSkill(s, 'fitness', randFloat(2, 4)); if (chance(0.04 + (trait(s, 'adventurous') ? 0.03 : 0))) { getSick(s, 'broken_leg'); return 'You slipped on a rock and broke your leg. A helicopter was involved.'; } add(s, { happy: 5, health: 2 }); return 'The view from the summit was worth every blister.'; }],
    ['Stay home', () => 'You stayed home and watched a nature documentary instead.'],
  ],
});
EV('ad_gym_crush', {
  ages: [18, 55], when: (s) => !hasRomance(s) && skill(s, 'fitness') > 10, emoji: '😊', text: 'Someone at the gym keeps smiling at you.',
  choices: [
    ['Say hi', (s) => { const p = candidatePerson(s); setRel(s, p.id, 'friend', 50); return tryRomance(s, p.id, 0.1); }],
    ['Keep lifting', () => 'You are here to work out. Focus.'],
  ],
});
EV('ad_reunion', {
  ages: [28, 70], cooldown: 10, when: hasHighSchool, emoji: '🎓', text: 'Your high school reunion is coming up.',
  choices: [
    ['Go', (s) => {
      add(s, { happy: 3 });
      if (!hasRomance(s) && chance(0.25)) { const p = candidatePerson(s); setRel(s, p.id, 'friend', 60); return { text: `You reconnected with ${p.first}, your old crush. Sparks flew.`, person: p.id }; }
      return pick(['Everyone got old. Except you, obviously.', 'The class clown is now a dentist.', 'You spent the night bragging about your life.']);
    }],
    ['Skip it', () => 'Some people are better left in the past.'],
  ],
});
EV('ad_midlife', {
  ages: [40, 55], once: true, emoji: '🌀', text: "You're having a full-blown midlife crisis.",
  choices: [
    { label: 'Buy a sports car', sub: (s) => fmtMoney(price(s, 85000)), fx: (s) => {
      const cost = price(s, 85000);
      if (!pay(s, cost)) return cantAfford(cost);
      M(s).assets.push({ id: uid(s, 'a'), kind: 'car', type: 'sports', emoji: '🏎️', name: `${s.year} ${pick(CAR_BRANDS)} Sports Car`, value: cost, paid: cost, cond: 100, since: s.year });
      add(s, { happy: 10 });
      return 'You bought a shiny red sports car. You feel twenty-five again.';
    } },
    ['Take up skydiving', (s) => { if (chance(0.01)) { die(s, 'a skydiving accident'); return 'Your parachute did not open.'; } add(s, { happy: 8 }); return 'You jumped out of a plane. You screamed the whole way down. Incredible.'; }],
    ['Learn the electric guitar', (s) => { addSkill(s, 'music', 6); add(s, { happy: 5 }); return 'You bought a guitar and an amp. The neighbors are thrilled.'; }],
    ['Ride it out', (s) => { add(s, { happy: -3 }); return 'You stared at the ceiling a lot. It passed.'; }],
  ],
});
EV('ad_canvasser', {
  ages: [18, 95], emoji: '📋', text: () => `A canvasser stops you on the street to ask for a donation to ${pick(['save the whales', 'a children’s hospital', 'clean oceans', 'a local animal shelter'])}.`,
  choices: [
    { label: 'Donate', sub: (s) => fmtMoney(price(s, 50)), fx: (s) => { const amt = price(s, 50); if (!pay(s, amt)) return cantAfford(amt); add(s, { karma: 3 }); tally(s, 'donated', amt); return 'You donated. You feel good about it.'; } },
    ['Walk faster', (s) => { add(s, { karma: -1 }); return 'You pretended to be on the phone.'; }],
  ],
});
EV('ad_mugged', {
  ages: [16, 90], w: 0.7, emoji: '🔪', text: 'A mugger stepped out of an alley and demanded your wallet.',
  choices: [
    ['Hand it over', (s) => { const loss = Math.min(Math.max(0, M(s).money), price(s, randInt(40, 300))); M(s).money -= loss; add(s, { happy: -5 }); return `You handed over your wallet. You lost ${fmtMoney(loss)}.`; }],
    ['Fight back', (s) => { if (skill(s, 'martial') + randInt(0, 60) > 55) { add(s, { happy: 6, fame: 1 }); return 'You disarmed the mugger with a move you saw in a movie. The police called you a hero.'; } add(s, { health: -randInt(8, 20), happy: -6 }); return 'You fought back and lost. You ended up in the hospital.'; }],
    ['Run!', (s) => (skill(s, 'fitness') + randInt(0, 60) > 40 ? 'You sprinted away and lost them.' : 'You tripped. They took your wallet anyway.')],
  ],
});

/* ---- home & car ---------------------------------------------------- */
EV('home_burglary', {
  ages: [18, 100], w: 0.6, when: (s) => !!myHouse(s), emoji: '🏚️', text: 'Your home was burglarized while you were away.',
  auto: (s) => { const loss = Math.min(Math.max(0, M(s).money), price(s, randInt(500, 8000))); M(s).money -= loss; add(s, { happy: -6 }); return `They took ${fmtMoney(loss)} worth of stuff.`; },
});
EV('home_tree', {
  ages: [18, 100], when: (s) => !!myHouse(s), emoji: '🌩️', text: 'A storm knocked a tree onto your house.',
  choices: [
    { label: 'Pay for repairs', sub: (s) => fmtMoney(Math.round(myHouse(s).value * 0.03)), fx: (s) => { const h = myHouse(s); const cost = Math.round(h.value * 0.03); if (!pay(s, cost)) { h.cond = clamp(h.cond - 20, 0, 100); return `You couldn't afford the repairs. Your ${h.name} is in rough shape.`; } return `You fixed your ${h.name}.`; } },
    ['Ignore it', (s) => { const h = myHouse(s); h.cond = clamp(h.cond - 20, 0, 100); h.value = Math.round(h.value * 0.92); return 'There is now a tree in your living room. It adds character.'; }],
  ],
});
EV('car_breakdown', {
  ages: [16, 100], when: (s) => !!myCar(s), emoji: '🚗', text: (s) => `Your ${myCar(s).name} broke down on the highway.`,
  choices: [
    { label: 'Get it repaired', sub: (s) => fmtMoney(price(s, 900)), fx: (s) => { const cost = price(s, 900); if (!pay(s, cost)) return cantAfford(cost); myCar(s).cond = clamp(myCar(s).cond + 25, 0, 100); return 'The mechanic fixed it. Mostly.'; } },
    ['Sell it for scrap', (s) => { const c = myCar(s); const v = Math.round(c.value * 0.3); removeAsset(s, c.id); add(s, { money: v }); return `You scrapped your car for ${fmtMoney(v)}.`; }],
    ['Kick the tire and hope', (s) => { myCar(s).cond = clamp(myCar(s).cond - 10, 0, 100); return 'Somehow, that worked. For now.'; }],
  ],
});
EV('car_ticket', { ages: [16, 100], when: (s) => !!myCar(s), emoji: '🎫', text: 'You got a parking ticket.', auto: (s) => { const f = price(s, randInt(40, 150)); M(s).money -= f; return `That's ${fmtMoney(f)} you'll never see again.`; } });

/* ---- work ---------------------------------------------------------- */
EV('job_overtime', {
  ages: [16, 75], when: regularJob, emoji: '⏱️', text: 'Your boss asks you to work weekends this month for overtime pay.',
  choices: [
    ['Accept', (s) => { const pay2 = Math.round(M(s).career.salary * 0.05); add(s, { money: pay2, happy: -3 }); M(s).career.perf = clamp100(M(s).career.perf + 5); return `You earned an extra ${fmtMoney(pay2)}. You are tired.`; }],
    ['Decline', (s) => { M(s).career.perf = clamp100(M(s).career.perf - 3); return 'You protected your weekends.'; }],
  ],
});
EV('job_layoffs', {
  ages: [18, 75], when: regularJob, emoji: '📉', text: 'Rumors of layoffs are spreading around the office.',
  choices: [
    ['Work harder than ever', (s) => { M(s).career.perf = clamp100(M(s).career.perf + 10); add(s, { happy: -2 }); return M(s).career.perf < 35 && chance(0.4) ? (fire(s, 'Despite your efforts, you were laid off.'), undefined) : 'You survived the layoffs.'; }],
    ['Update your résumé', (s) => (M(s).career.perf < 50 && chance(0.35) ? (fire(s, 'You were laid off. At least your résumé is ready.'), undefined) : 'You survived the cuts, résumé polished just in case.')],
    ['Ignore the rumors', (s) => (M(s).career.perf < 45 && chance(0.4) ? (fire(s, 'You were laid off. The rumors were true.'), undefined) : 'The rumors blew over.')],
  ],
});
EV('job_credit', {
  ages: [18, 75], when: hasJob, emoji: '😤', ctx: (s) => someone(s, ['coworker']), text: (s, c) => `${nm(s, c.pid)} took credit for your work in a big meeting.`,
  choices: [
    ['Confront them', (s, c) => { addRel(s, c.pid, -15); if (chance(0.5)) { M(s).career.perf = clamp100(M(s).career.perf + 5); return `${nm(s, c.pid)} admitted it in front of everyone.`; } return `${nm(s, c.pid)} denied it. Now you are enemies.`; }],
    ['Tell your boss', (s, c) => { addRel(s, c.pid, -10); if (chance(0.55)) { M(s).career.perf = clamp100(M(s).career.perf + 8); return 'Your boss believed you.'; } return 'Your boss told you to "focus on teamwork."'; }],
    ['Let it go', (s) => { add(s, { happy: -3 }); return 'You let it slide this time.'; }],
  ],
});
EV('job_party', {
  ages: [18, 75], when: hasJob, emoji: '🥳', text: "It's the office holiday party.",
  choices: [
    ['Have a nice time', (s) => { relAll(s, ['coworker', 'boss'], 4); add(s, { happy: 3 }); return 'You mingled, laughed and won the ugly sweater contest.'; }],
    ['Get wild', (s) => { if (A(s) >= country(s).drink) habit(s, 'alcohol', 4); if (chance(0.3)) { M(s).career.perf = clamp100(M(s).career.perf - 15); relAll(s, ['boss'], -10); return 'You did karaoke on the CEO’s desk. HR wants to talk.'; } relAll(s, ['coworker'], 6); add(s, { happy: 6 }); return 'You were the life of the party. Legend.'; }],
    ['Skip it', () => 'You went home and put on pajamas.'],
  ],
});
EV('job_romance', {
  ages: [18, 65], when: (s) => hasJob(s) && !hasRomance(s), emoji: '😏', ctx: (s) => crushable(s, ['coworker']),
  text: (s, c) => `You and your coworker ${nm(s, c.pid)} have been flirting by the coffee machine.`,
  choices: [
    ['Ask them out', (s, c) => tryRomance(s, c.pid, 0.1)],
    ['Keep it professional', () => 'You kept it professional. For now.'],
  ],
});
EV('job_yelled', {
  ages: [18, 75], when: regularJob, emoji: '🤬', ctx: (s) => someone(s, ['boss']), text: (s, c) => `Your boss ${nm(s, c.pid)} screamed at you in front of the whole team.`,
  choices: [
    ['Apologize', (s, c) => { addRel(s, c.pid, 3); add(s, { happy: -3 }); return 'You apologized, even though it wasn’t your fault.'; }],
    ['Yell back', (s, c) => { addRel(s, c.pid, -15); if (chance(0.3)) { fire(s, 'You yelled back. You were escorted out of the building.'); return; } add(s, { happy: 3 }); return 'Your coworkers applauded quietly.'; }],
    ['Quit on the spot', (s) => { const t = careerTitle(s); leaveJob(s, 'quit'); add(s, { happy: 4 }); return `You quit your job as a ${t} right then and there.`; }],
  ],
});
EV('job_injury', {
  ages: [18, 70], w: 0.6, when: (s) => hasJob(s) && ['trades', 'transport', 'public'].includes(JOBS[M(s).career.id].cat), emoji: '🩹', text: 'You were injured on the job.',
  auto: (s) => { getSick(s, pick(['broken_arm', 'broken_leg', 'concussion', 'backpain'])); add(s, { happy: -4 }); const comp = price(s, randInt(1000, 15000)); add(s, { money: comp }); return `Workers' comp paid you ${fmtMoney(comp)}.`; },
});
EV('job_bonus', { ages: [18, 75], when: (s) => regularJob(s) && M(s).career.perf >= 70, emoji: '🎉', text: 'Your boss surprised you with a bonus.', auto: (s) => { const b = Math.round(M(s).career.salary * randFloat(0.03, 0.15)); add(s, { money: b, happy: 5 }); return `It was ${fmtMoney(b)}!`; } });
EV('job_headhunter', {
  ages: [22, 65], when: (s) => regularJob(s) && M(s).career.perf >= 55, emoji: '📞', text: 'A recruiter from a rival company offers you the same job for more money.',
  choices: [
    ['Take the offer', (s) => { const c = M(s).career; c.salary = Math.round(c.salary * randFloat(1.1, 1.3)); c.perf = 55; clearKind(s, 'coworker'); return `You switched companies. You now earn ${fmtMoney(c.salary)} a year.`; }],
    ['Use it to get a raise', (s) => { const c = M(s).career; if (chance(0.6)) { c.salary = Math.round(c.salary * randFloat(1.05, 1.15)); return `Your boss matched it. New salary: ${fmtMoney(c.salary)}.`; } c.perf = clamp100(c.perf - 8); return 'Your boss called your bluff.'; }],
    ['Stay loyal', (s) => { M(s).career.perf = clamp100(M(s).career.perf + 3); return 'You turned the recruiter down.'; }],
  ],
});

/* ---- love ---------------------------------------------------------- */
EV('lv_move_in', {
  ages: [20, 70], emoji: '📦', ctx: (s) => someone(s, ['partner']), text: (s, c) => `${nm(s, c.pid)} wants to move in together.`,
  choices: [
    ['Yes!', (s, c) => { addRel(s, c.pid, 10); add(s, { happy: 4 }); return `You and ${nm(s, c.pid)} are officially living together.`; }],
    ['Not yet', (s, c) => { addRel(s, c.pid, -8); return `${nm(s, c.pid)} said they understand. They seem hurt.`; }],
  ],
});
EV('lv_baby_talk', {
  ages: [24, 44], when: (s) => !M(s).pregnancy, emoji: '🍼',
  ctx: (s) => someone(s, ['spouse', 'fiance'], (p) => canConceive(P(s), p) && ageOf(s, p) <= 45),
  text: (s, c) => `${nm(s, c.pid)} says they're ready to start a family.`,
  choices: [
    ["Let's try for a baby", (s, c) => { addRel(s, c.pid, 8); const carrier = P(s).gender === 'f' ? P(s) : s.people[c.pid]; if (chance(fertility(ageOf(s, carrier)))) { M(s).pregnancy = { partnerId: c.pid, carrier: carrier === P(s) ? 'me' : 'partner', year: s.year }; return { text: carrier === P(s) ? "You're pregnant! 🤰" : `${nm(s, c.pid)} is pregnant! 🤰`, tone: 'good' }; } return 'You started trying. No luck yet.'; }],
    ['Not yet', (s, c) => { addRel(s, c.pid, -6); return 'You asked for a little more time.'; }],
    ['I never want kids', (s, c) => { addRel(s, c.pid, -20); return `${nm(s, c.pid)} was quiet for a long time.`; }],
  ],
});
EV('lv_inlaws', {
  ages: [20, 80], emoji: '🧳', ctx: (s) => someone(s, ['spouse']), text: (s, c) => `${nm(s, c.pid)}'s parents are coming to stay for a week.`,
  choices: [
    ['Roll out the red carpet', (s, c) => { addRel(s, c.pid, 8); relAll(s, ['inlaw'], 8); add(s, { happy: -2 }); return 'Your in-laws had a wonderful time. You need a vacation.'; }],
    ['Suddenly get very busy', (s, c) => { addRel(s, c.pid, -8); relAll(s, ['inlaw'], -8); return 'You "had to work late" every night. Nobody was fooled.'; }],
  ],
});
EV('lv_anniversary', {
  ages: [20, 100], emoji: '💐', ctx: (s) => someone(s, ['spouse'], () => true), text: (s, c) => `Your anniversary with ${nm(s, c.pid)} is coming up.`,
  choices: [
    { label: 'Plan something special', sub: (s) => fmtMoney(price(s, 400)), fx: (s, c) => { const cost = price(s, 400); if (!pay(s, cost)) return cantAfford(cost); addRel(s, c.pid, 12); add(s, { happy: 4 }); return pick(['You recreated your first date. Perfect.', 'A surprise weekend getaway. They loved it.', 'Candlelit dinner on the roof.']); } },
    ['Forget about it', (s, c) => { addRel(s, c.pid, -12); return `You forgot. ${nm(s, c.pid)} did not.`; }],
  ],
});
EV('lv_ex_back', {
  ages: [16, 70], when: (s) => !hasRomance(s), emoji: '🔁', ctx: (s) => someone(s, ['ex', 'exspouse'], (p) => !p.partner && ageOk(A(s), ageOf(s, p))),
  text: (s, c) => `Your ex, ${nm(s, c.pid)}, wants to get back together.`,
  choices: [
    ['Give it another shot', (s, c) => startRomance(s, c.pid)],
    ['No way', (s, c) => { addRel(s, c.pid, -5); return 'Some doors are closed for a reason.'; }],
  ],
});
EV('lv_blind_date', {
  ages: [20, 65], when: (s) => !hasRomance(s), emoji: '🙈', ctx: (s) => someone(s, ['friend', 'bestie', 'sibling']),
  text: (s, c) => `${nm(s, c.pid)} wants to set you up on a blind date.`,
  choices: [
    ['Go on the date', (s, c) => { addRel(s, c.pid, 3); const p = candidatePerson(s); setRel(s, p.id, 'friend', 50); return tryRomance(s, p.id, 0.05); }],
    ['No thanks', () => 'You will find love on your own terms.'],
  ],
});
EV('lv_admirer', { ages: [13, 45], when: (s) => !hasRomance(s), w: 0.6, emoji: '💌', text: 'You found a note from a secret admirer.', auto: (s) => { add(s, { happy: 4 }); return 'You have no idea who it is. Thrilling.'; } });
EV('lv_jealous', {
  ages: [16, 80], emoji: '😒', ctx: (s) => someone(s, ['partner', 'spouse', 'fiance']), text: (s, c) => `${nm(s, c.pid)} got jealous after seeing you laugh with someone else.`,
  choices: [
    ['Reassure them', (s, c) => { addRel(s, c.pid, 5); return 'You reminded them they are the only one for you.'; }],
    ['Get defensive', (s, c) => { addRel(s, c.pid, -8); return 'You had a big argument about trust.'; }],
  ],
});

/* ---- family -------------------------------------------------------- */
EV('fam_kid_play', {
  ages: [22, 70], emoji: '🎭', ctx: (s) => someone(s, ['child'], (p) => ageOf(s, p) >= 5 && ageOf(s, p) <= 12), text: (s, c) => `${nm(s, c.pid)} is starring as ${pick(['a tree', 'the lead', 'a dancing carrot', 'a narrator', 'a pirate'])} in the school play tonight.`,
  choices: [
    ['Go cheer them on', (s, c) => { addRel(s, c.pid, 10); add(s, { happy: 3 }); return `${nm(s, c.pid)} waved at you from the stage.`; }],
    ['Skip it', (s, c) => { addRel(s, c.pid, -12); return `${nm(s, c.pid)} looked for you in the audience.`; }],
  ],
});
EV('fam_kid_phone', {
  ages: [25, 70], emoji: '📱', ctx: (s) => someone(s, ['child'], (p) => ageOf(s, p) >= 10 && ageOf(s, p) <= 16), text: (s, c) => `${nm(s, c.pid)} is begging for the newest phone. "Everyone has one!"`,
  choices: [
    { label: 'Buy it', sub: (s) => fmtMoney(price(s, 900)), fx: (s, c) => { const cost = price(s, 900); if (!pay(s, cost)) return cantAfford(cost); addRel(s, c.pid, 12); return `${nm(s, c.pid)} screamed with joy.`; } },
    ['Say no', (s, c) => { addRel(s, c.pid, -8); return `${nm(s, c.pid)} slammed their door.`; }],
  ],
});
EV('fam_teen_drink', {
  ages: [28, 70], emoji: '🍻', ctx: (s) => someone(s, ['child'], (p) => ageOf(s, p) >= 14 && ageOf(s, p) <= 17), text: (s, c) => `You caught ${nm(s, c.pid)} drinking with friends.`,
  choices: [
    ['Ground them', (s, c) => { addRel(s, c.pid, -8); return `${nm(s, c.pid)} is grounded for a month.`; }],
    ['Have a calm talk', (s, c) => { addRel(s, c.pid, 4); add(s, { karma: 1 }); return `You talked it through. ${nm(s, c.pid)} actually listened.`; }],
    ['Let it slide', (s, c) => { addRel(s, c.pid, 3); add(s, { karma: -1 }); return 'You remember being that age.'; }],
  ],
});
EV('fam_kid_tuition', {
  ages: [36, 75], emoji: '🎓', ctx: (s) => someone(s, ['child'], (p) => ageOf(s, p) === 18), text: (s, c) => `${nm(s, c.pid)} got into university and asks if you can help with tuition.`,
  choices: [
    { label: 'Pay for all of it', sub: (s) => fmtMoney(price(s, 80000)), fx: (s, c) => { const cost = price(s, 80000); if (!pay(s, cost)) return cantAfford(cost); addRel(s, c.pid, 20); s.people[c.pid].edu = 'bachelor'; add(s, { karma: 3 }); return `${nm(s, c.pid)} is going to college debt-free!`; } },
    { label: 'Pay half', sub: (s) => fmtMoney(price(s, 40000)), fx: (s, c) => { const cost = price(s, 40000); if (!pay(s, cost)) return cantAfford(cost); addRel(s, c.pid, 10); s.people[c.pid].edu = 'bachelor'; return `You covered half. ${nm(s, c.pid)} took loans for the rest.`; } },
    ["They're on their own", (s, c) => { addRel(s, c.pid, -10); return `${nm(s, c.pid)} will figure it out.`; }],
  ],
});
EV('fam_parent_care', {
  ages: [35, 85], emoji: '👵', ctx: (s) => someone(s, ['parent', 'stepparent'], (p) => ageOf(s, p) >= 78), text: (s, c) => `Your ${kinLabel('parent', s.people[c.pid]).toLowerCase()} ${nm(s, c.pid)} can no longer live alone.`,
  choices: [
    ['Move them in with you', (s, c) => { addRel(s, c.pid, 20); add(s, { happy: -3, karma: 5 }); return `${nm(s, c.pid)} moved into your spare room.`; }],
    { label: 'Pay for a care home', sub: (s) => fmtMoney(price(s, 30000)), fx: (s, c) => { const cost = price(s, 30000); if (!pay(s, cost)) return cantAfford(cost); addRel(s, c.pid, 5); s.people[c.pid].stats.health = clamp100(s.people[c.pid].stats.health + 10); return `${nm(s, c.pid)} moved into a nice care home.`; } },
    ['Let your siblings handle it', (s, c) => { addRel(s, c.pid, -12); relAll(s, ['sibling'], -8); add(s, { karma: -3 }); return 'Your siblings are furious with you.'; }],
  ],
});
EV('fam_grandkid_visit', { ages: [45, 110], emoji: '🧸', ctx: (s) => someone(s, ['grandchild'], (p) => ageOf(s, p) >= 2), text: (s, c) => `Your grandkid ${nm(s, c.pid)} came to visit.`, auto: (s, c) => { addRel(s, c.pid, 10); add(s, { happy: 5 }); return pick(['You baked cookies together.', 'You taught them a card game. They cheated.', 'They fell asleep on your lap.']); } });
EV('fam_reunion', {
  ages: [8, 95], cooldown: 6, emoji: '👨‍👩‍👧‍👦', text: 'Your family is having a big reunion.',
  choices: [
    ['Go', (s) => { relAll(s, FAMILY_KINDS, 4); add(s, { happy: 3 }); return pick(['Your uncle told the same story four times.', 'The potato salad was legendary.', 'There was a fierce game of touch football.']); }],
    ['Skip it', (s) => { relAll(s, ['parent', 'grandparent'], -3); return 'You skipped the reunion. Grandma noticed.'; }],
  ],
});
EV('fam_sibling_jealous', {
  ages: [18, 80], when: (s) => netWorth(s) > price(s, 200000), emoji: '😒', ctx: (s) => someone(s, ['sibling', 'halfsibling'], (p) => ageOf(s, p) >= 18), text: (s, c) => `${nm(s, c.pid)} seems jealous of your success.`,
  choices: [
    { label: 'Help them out financially', sub: (s) => fmtMoney(price(s, 10000)), fx: (s, c) => { const amt = price(s, 10000); if (!pay(s, amt)) return cantAfford(amt); s.people[c.pid].money += amt; addRel(s, c.pid, 15); add(s, { karma: 3 }); return `${nm(s, c.pid)} was surprised and grateful.`; } },
    ['Talk it out', (s, c) => { addRel(s, c.pid, chance(0.6) ? 6 : -4); return 'You had an honest conversation.'; }],
    ['Rub it in', (s, c) => { addRel(s, c.pid, -15); add(s, { karma: -2, happy: 2 }); return `You showed ${nm(s, c.pid)} your new watch. Twice.`; }],
  ],
});
