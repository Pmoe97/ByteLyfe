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
    ['Go', (s) => { const met = ensureRelatives(s); relAll(s, FAMILY_KINDS, 4); add(s, { happy: 3 }); return (met.length ? `You met ${nOf(met.length, 'relative')} you barely knew. ` : '') + pick(['Your uncle told the same story four times.', 'The potato salad was legendary.', 'There was a fierce game of touch football.']); }],
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

/* ---- more story: everyday adult life ------------------------------------------ */
EV('ad_bachelor', {
  ages: [21, 50], emoji: '🥂', ctx: (s) => someone(s, ['friend', 'bestie', 'sibling'], (p) => ageOf(s, p) >= 21),
  text: (s, c) => `${nm(s, c.pid)} is getting married, and the pre-wedding party is a weekend in a casino town.`,
  choices: [
    { label: 'Go', sub: (s) => fmtMoney(price(s, 1200)), fx: (s, c) => { const cost = price(s, 1200); if (!pay(s, cost)) return cantAfford(cost); addRel(s, c.pid, 10); add(s, { happy: 8 }); if (chance(0.25)) { const loss = price(s, randInt(200, 2000)); M(s).money -= loss; return `What happens there stays there, except the ${fmtMoney(loss)} you lost at blackjack.`; } return 'A weekend of pool parties, a show, and one very blurry photo.'; } },
    ['Send a gift instead', (s, c) => { addRel(s, c.pid, -3); return `${nm(s, c.pid)} said they understood. The group chat did not.`; }],
  ],
});
EV('ad_identity_theft', {
  ages: [18, 95], w: 0.5, emoji: '🕵️', text: 'Someone opened three credit cards in your name.',
  choices: [
    ['Spend weeks fixing it', (s) => { add(s, { happy: -5 }); return 'Forty phone calls and one fraud report later, your credit is back.'; }],
    ['Hire an identity protection service', (s) => { const c = price(s, 400); M(s).money -= c; add(s, { happy: -2 }); return `It cost ${fmtMoney(c)}. They fixed it in a week.`; }],
  ],
});
EV('ad_karaoke', {
  ages: [18, 80], emoji: '🎤', text: 'Your friends dragged you to karaoke night.',
  choices: [
    ['Belt out a power ballad', (s) => { addSkill(s, 'music', 2); add(s, { happy: 5 }); return skill(s, 'music') > 40 ? 'The whole bar went silent, then gave you a standing ovation.' : 'It was loud. It was heartfelt. It was not in tune.'; }],
    ['Duet with a stranger', (s) => { add(s, { happy: 4 }); const p = meetSomeone(s, 'friend', 50); return { text: `You and ${p.first} nailed the harmonies. You swapped numbers.`, person: p.id }; }],
    ['Only cheer from the back', () => 'Your hype work was essential.'],
  ],
});
EV('ad_gym_signup', {
  ages: [18, 70], emoji: '🏋️', text: 'A gym is running a "new year, new you" membership deal.',
  choices: [
    { label: 'Sign up for a year', sub: (s) => fmtMoney(price(s, 300)), fx: (s) => { const c = price(s, 300); if (!pay(s, c)) return cantAfford(c); if (chance(0.5)) { addSkill(s, 'fitness', 6); add(s, { health: 3 }); return 'You actually went! Three times a week, all year.'; } return 'You went twice. You paid for 365 days.'; } },
    ['Run outside for free', (s) => { addSkill(s, 'fitness', 3); return 'You and the pigeons, every morning.'; }],
  ],
});
EV('ad_book_club', {
  ages: [20, 90], emoji: '📚', text: 'A neighbor invites you to their monthly book club.',
  choices: [
    ['Join and actually read the books', (s) => { add(s, { smarts: 2 }); const p = meetSomeone(s, 'friend', 55); return { text: `You and ${p.first} are always the only two who finished the book.`, person: p.id }; }],
    ['Join for the wine and gossip', (s) => { add(s, { happy: 4 }); return 'Nobody has discussed a book in six months.'; }],
    ['Pass', () => 'You prefer your books without homework.'],
  ],
});
EV('ad_packages', {
  ages: [18, 95], emoji: '📦', when: (s) => livesAlone(s), text: "Your neighbor's packages keep getting delivered to your door.",
  choices: [
    ['Bring them over', (s) => { add(s, { karma: 2 }); return 'They gave you a plate of cookies. You are now the official package holder.'; }],
    ['Peek inside one', (s) => { add(s, { karma: -3 }); return `It was ${pick(['forty pounds of birdseed', 'a life-size cardboard cutout of a celebrity', 'very fancy socks', 'a book called "How to Spot Nosy Neighbors"'])}.`; }],
  ],
});
EV('ad_viral_review', {
  ages: [18, 90], w: 0.6, emoji: '⭐', text: 'A restaurant served you a truly terrible meal.',
  choices: [
    ['Write a scathing review', (s) => { addSkill(s, 'writing', 2); if (chance(0.2)) { add(s, { fame: 3 }); return 'Your review went viral. The restaurant changed its whole menu.'; } return 'The owner replied with three paragraphs and a lot of capital letters.'; }],
    ['Complain to the manager', (s) => { add(s, { happy: 1 }); return 'Your meal was free. Your dignity was not.'; }],
    ['Eat it and never return', () => 'The quiet, devastating review.'],
  ],
});
EV('ad_free_couch', {
  ages: [18, 60], emoji: '🛋️', text: 'Someone left a nearly new couch on the curb with a "FREE" sign.',
  choices: [
    ['Haul it home', (s) => { if (chance(0.25)) { add(s, { happy: -6, health: -2 }); return 'It had bedbugs. You lost the couch, two pillows and a month of sleep.'; } add(s, { happy: 4 }); return 'It is the most comfortable thing you own. Free!'; }],
    ['Leave it', () => 'Free couches are free for a reason.'],
  ],
});
EV('ad_power_bill', { ages: [20, 100], w: 0.6, emoji: '💡', when: livesAlone, text: 'Your electric bill this month was three times the usual.', auto: (s) => { const c = price(s, randInt(150, 600)); M(s).money -= c; add(s, { happy: -2 }); return `${fmtMoney(c)}. It turns out ${pick(['the freezer door was open for a week', 'the AC was on full blast while you were away', 'a neighbor was plugged into your outdoor outlet'])}.`; } });
EV('ad_crypto_pitch', {
  ages: [18, 70], emoji: '💰', ctx: (s) => someone(s, ['friend', 'sibling', 'coworker'], (p) => ageOf(s, p) >= 18),
  text: (s, c) => `${nm(s, c.pid)} won't stop talking about a new coin called ${pick(['MoonGoat', 'HamsterCash', 'ToTheMoon', 'BurgerCoin'])}.`,
  choices: [
    { label: 'Buy in', sub: (s) => fmtMoney(price(s, 2000)), fx: (s) => { const c = price(s, 2000); if (!pay(s, c)) return cantAfford(c); const r = rand(); if (r < 0.15) { const w = c * randInt(5, 30); add(s, { money: w, happy: 10 }); return `It went to the moon. You cashed out ${fmtMoney(w)}.`; } if (r < 0.6) return 'It went to zero in a week. The founder deleted his account.'; const back = Math.round(c * randFloat(0.3, 1.5)); add(s, { money: back }); return `It went up, then way down. You got back ${fmtMoney(back)}.`; } },
    ['Nod politely and change the subject', () => 'You heard about it every day for a month anyway.'],
  ],
});
EV('ad_garage_sale', {
  ages: [22, 95], emoji: '🏷️', when: livesAlone, text: 'Your place is overflowing with stuff you never use.',
  choices: [
    ['Hold a garage sale', (s) => { const amt = price(s, randInt(80, 900)); add(s, { money: amt, happy: 3 }); return chance(0.08) ? `A collector paid ${fmtMoney(amt)} for an old lamp. It turns out it was rare.` : `You made ${fmtMoney(amt)} and got rid of a treadmill.`; }],
    ['Donate it all', (s) => { add(s, { karma: 3, happy: 2 }); return 'Your closets have never been emptier.'; }],
    ['Keep it, just in case', () => 'You might need that broken waffle iron someday.'],
  ],
});
EV('ad_charity_run', {
  ages: [16, 75], emoji: '🏃', text: 'A charity fun run is raising money for a children’s hospital.',
  choices: [
    { label: 'Run it in a costume', sub: (s) => `${fmtMoney(price(s, 50))} entry`, fx: (s) => { const c = price(s, 50); if (!pay(s, c)) return cantAfford(c); addSkill(s, 'fitness', 2); add(s, { karma: 3, happy: 4 }); tally(s, 'donated', c); return `You ran as ${pick(['a hot dog', 'a superhero', 'a giant banana', 'a dinosaur'])}. The kids loved it.`; } },
    ['Donate and cheer from the sidelines', (s) => { const c = price(s, 30); M(s).money -= c; tally(s, 'donated', c); add(s, { karma: 2 }); return 'You handed out water cups and high fives.'; }],
  ],
});
EV('ad_kitchen_fire', {
  ages: [18, 95], w: 0.5, emoji: '🔥', when: livesAlone, text: 'You left a pan on the stove and it caught fire.',
  choices: [
    ['Throw a lid on it', (s) => { add(s, { smarts: 1 }); return 'Smothered it in one move. You felt like an action hero.'; }],
    ['Throw water on it', (s) => { add(s, { health: -4 }); const c = price(s, randInt(800, 5000)); M(s).money -= c; return `Grease fire plus water was a bad combination. Kitchen repairs: ${fmtMoney(c)}.`; }],
  ],
});
EV('ad_pottery', {
  ages: [18, 90], emoji: '🏺', text: 'A pottery studio is offering a beginner class.',
  choices: [
    { label: 'Sign up', sub: (s) => fmtMoney(price(s, 150)), fx: (s) => { const c = price(s, 150); if (!pay(s, c)) return cantAfford(c); addSkill(s, 'art', 4); add(s, { happy: 5 }); return `You made ${pick(['a lopsided mug', 'a bowl that leans to the left', 'an ashtray that was supposed to be a vase'])}. You are very proud of it.`; } },
    ['Maybe another time', () => 'Your hands stay clean.'],
  ],
});
EV('ad_escape_room', {
  ages: [14, 70], emoji: '🔐', text: 'Your friends booked an escape room.',
  choices: [
    ['Take charge', (s) => { add(s, { smarts: 1 }); if (P(s).stats.smarts + randInt(0, 50) > 70) { add(s, { happy: 6 }); return 'You escaped with four minutes to spare. New record.'; } return 'The staff had to let you out. You were very close. Sort of.'; }],
    ['Look for clues in weird places', (s) => { add(s, { happy: 4 }); return 'You found a clue inside a fake plant. Nobody else checked the plant.'; }],
  ],
});
EV('ad_wrong_number', {
  ages: [18, 55], w: 0.6, emoji: '📲', when: (s) => !hasRomance(s), text: 'A wrong-number text turned into a two-hour conversation with a stranger.',
  choices: [
    ['Ask to meet', (s) => { const p = candidatePerson(s, {}); setRel(s, p.id, 'friend', 55); return tryRomance(s, p.id, 0.1); }],
    ['Keep it a mystery', (s) => { add(s, { happy: 3 }); return 'You never learned their name. You think about it sometimes.'; }],
  ],
});
EV('ad_plants', { ages: [18, 90], emoji: '🌿', text: 'You bought a houseplant.', auto: (s) => { if (chance(0.5)) { add(s, { happy: 3 }); return 'It is thriving. You bought six more. You talk to them now.'; } return 'It died in a week. The tag said "impossible to kill."'; } });
EV('ad_movie_extra', {
  ages: [16, 80], w: 0.6, emoji: '🎬', text: 'A movie is filming downtown, and they need extras.',
  choices: [
    ['Sign up', (s) => { addSkill(s, 'acting', 2); const pay0 = price(s, 150); add(s, { money: pay0, happy: 4 }); return `You spent eleven hours walking past a coffee shop. You got ${fmtMoney(pay0)} and a sandwich.`; }],
    ['Try to get noticed by the director', (s) => { addSkill(s, 'acting', 3); if (chance(0.1)) { add(s, { fame: 3, happy: 8 }); return 'The director gave you a line! You are in the credits as "Startled Pedestrian."'; } return 'Security asked you to stop waving at the camera.'; }],
  ],
});
EV('ad_scratch_card', {
  ages: [18, 100], emoji: '🎟️', text: 'Someone handed you a scratch-off ticket as change at the corner store.',
  choices: [
    ['Scratch it', (s) => { if (chance(0.03)) { const w = price(s, randInt(5, 50) * 1000); add(s, { money: w, happy: 12 }); return `YOU WON ${fmtMoney(w)}!`; } if (chance(0.25)) { const w = price(s, randInt(2, 50)); add(s, { money: w }); return `You won ${fmtMoney(w)}. Exciting!`; } return 'Not a winner. The scratch dust got everywhere.'; }],
    ['Give it to the next person in line', (s) => { add(s, { karma: 2 }); return 'They won $2 and were thrilled.'; }],
  ],
});

/* ---- more story: work ------------------------------------------------------------------- */
EV('job_meeting', {
  ages: [18, 75], emoji: '🗓️', when: regularJob, text: 'You are stuck in a two-hour meeting that should have been an email.',
  choices: [
    ['Speak up and wrap it up', (s) => { addSkill(s, 'charisma', 2); M(s).career.perf = clamp100(M(s).career.perf + 3); return 'You summarized everything in one sentence. Your boss looked impressed.'; }],
    ['Doodle quietly', (s) => { addSkill(s, 'art', 1); return 'You drew a very detailed dragon in the margins.'; }],
    ['Fall asleep', (s) => { M(s).career.perf = clamp100(M(s).career.perf - 4); return 'You woke up when someone said your name. Twice.'; }],
  ],
});
EV('job_reply_all', {
  ages: [18, 75], w: 0.7, emoji: '📧', when: regularJob, text: 'You accidentally hit "reply all" on a message complaining about your boss.',
  choices: [
    ['Own it with an apology', (s) => { M(s).career.perf = clamp100(M(s).career.perf - 5); add(s, { karma: 1 }); return 'Your boss said they appreciated the honesty. They did not.'; }],
    ['Claim you were hacked', (s) => { if (chance(0.5)) return 'IT is investigating. Nobody believes you, but nobody can prove it.'; M(s).career.perf = clamp100(M(s).career.perf - 12); return 'IT proved you were not hacked. Awkward.'; }],
  ],
});
EV('job_promo_rival', {
  ages: [20, 70], emoji: '🥊', when: regularJob, ctx: (s) => someone(s, ['coworker']),
  text: (s, c) => `You and ${nm(s, c.pid)} are both up for the same promotion.`,
  choices: [
    ['Compete fair and square', (s) => { M(s).career.perf = clamp100(M(s).career.perf + 5); return 'You worked hard and kept it classy.'; }],
    ['Sabotage their presentation', (s, c) => { add(s, { karma: -6 }); addRel(s, c.pid, -20); if (chance(0.3)) { M(s).career.perf = clamp100(M(s).career.perf - 15); return { text: 'Someone saw you unplug their laptop. HR wants a word.', tone: 'bad' }; } M(s).career.perf = clamp100(M(s).career.perf + 8); return `${nm(s, c.pid)}'s slides mysteriously failed. You feel a little sick about it.`; }],
    ['Team up and pitch together', (s, c) => { addRel(s, c.pid, 15); M(s).career.perf = clamp100(M(s).career.perf + 3); return 'Your boss loved your joint proposal.'; }],
  ],
});
EV('job_conference', {
  ages: [22, 70], emoji: '🏨', when: regularJob, text: 'Your company is sending you to a conference in another city.',
  choices: [
    ['Network like crazy', (s) => { addSkill(s, 'charisma', 3); M(s).career.perf = clamp100(M(s).career.perf + 4); const p = meetSomeone(s, 'friend', 45); return { text: `You collected 60 business cards and one real friend: ${p.first}.`, person: p.id }; }],
    ['Skip the talks and explore the city', (s) => { add(s, { happy: 6 }); return 'You saw the best museum in town. You still have no idea what the conference was about.'; }],
  ],
});
EV('job_new_hire', {
  ages: [22, 70], emoji: '🤝', when: (s) => regularJob(s) && M(s).career.level >= 1, text: 'Your boss asks you to train the new hire.',
  choices: [
    ['Take them under your wing', (s) => { addSkill(s, 'charisma', 2); M(s).career.perf = clamp100(M(s).career.perf + 4); const p = makeAdultNear(s, { minAge: 20, maxAge: Math.max(22, A(s)) }); setRel(s, p.id, 'coworker', 60); return { text: `${p.first} learns fast. They already call you their mentor.`, person: p.id }; }],
    ['Hand them the manual and walk away', (s) => { M(s).career.perf = clamp100(M(s).career.perf - 2); return 'They figured it out. Eventually. They tell everyone you were "not helpful."'; }],
  ],
});
EV('job_remote', {
  ages: [22, 70], emoji: '🏠', when: (s) => regularJob(s) && ['office', 'tech', 'business', 'media', 'science'].includes(JOBS[M(s).career.id].cat), text: 'Your company is letting people work from home.',
  choices: [
    ['Work from home full-time', (s) => { add(s, { happy: 6 }); if (chance(0.3)) M(s).career.perf = clamp100(M(s).career.perf - 4); return 'No commute, sweatpants, and a cat on your keyboard.'; }],
    ['Stay in the office', (s) => { M(s).career.perf = clamp100(M(s).career.perf + 3); return 'Your boss notices who shows up.'; }],
  ],
});
EV('job_coffee_machine', { ages: [18, 75], w: 0.6, emoji: '☕', when: regularJob, text: 'You broke the office coffee machine.', auto: (s) => { if (chance(0.5)) return 'Nobody saw. The investigation is ongoing.'; M(s).career.perf = clamp100(M(s).career.perf - 3); return 'Everyone saw. You are now the most hated person in the building.'; } });
EV('job_collection', {
  ages: [18, 75], emoji: '🎂', when: regularJob, text: () => `Someone is collecting money for a coworker's ${pick(['birthday', 'retirement', 'new baby', 'going-away party'])}.`,
  choices: [
    ['Chip in generously', (s) => { const c = price(s, 30); M(s).money -= c; relAll(s, ['coworker'], 4); return 'You signed the card with a little doodle.'; }],
    ['Sign the card but skip the money', (s) => { relAll(s, ['coworker'], -1); return 'Nobody said anything. Everyone noticed.'; }],
  ],
});
EV('job_burnout', {
  ages: [22, 70], emoji: '🔋', when: (s) => regularJob(s) && P(s).stats.happy < 55, text: "You're completely burned out at work.",
  choices: [
    { label: 'Take a real vacation', sub: (s) => fmtMoney(price(s, 1500)), fx: (s) => { const c = price(s, 1500); if (!pay(s, c)) return cantAfford(c); tally(s, 'vacations'); add(s, { happy: 10, health: 3 }); return 'Ten days with your phone off. You came back a new person.'; } },
    ['Push through', (s) => { M(s).career.perf = clamp100(M(s).career.perf + 4); add(s, { health: -4, happy: -5 }); return 'You hit your deadlines and lost your sense of humor.'; }],
    ['Talk to your boss', (s) => { if (chance(0.6)) { add(s, { happy: 6 }); return 'Your boss lightened your workload. Who knew asking worked?'; } return 'Your boss suggested a meditation app.'; }],
  ],
});
EV('job_employee_month', { ages: [18, 75], emoji: '🏅', when: (s) => regularJob(s) && M(s).career.perf >= 70, text: 'You were named employee of the month.', auto: (s) => { add(s, { happy: 6 }); M(s).career.perf = clamp100(M(s).career.perf + 3); return 'Your photo is on the wall. You get the good parking spot for 30 days.'; } });
EV('job_strike', {
  ages: [18, 70], w: 0.6, emoji: '📢', when: (s) => regularJob(s) && ['trades', 'transport', 'public', 'health', 'education', 'service'].includes(JOBS[M(s).career.id].cat), text: 'Your coworkers voted to go on strike for better pay.',
  choices: [
    ['Join the picket line', (s) => { relAll(s, ['coworker'], 8); if (chance(0.6)) { M(s).career.salary = Math.round(M(s).career.salary * 1.06); return { text: 'Three weeks later, management caved. Everyone got a 6% raise.', tone: 'good' }; } add(s, { happy: -4 }); return 'The strike dragged on for months and ended with a small deal.'; }],
    ['Cross the line and keep working', (s) => { relAll(s, ['coworker'], -15); M(s).career.perf = clamp100(M(s).career.perf + 5); return 'Your boss was grateful. Your coworkers will not forget.'; }],
  ],
});
EV('job_typo', { ages: [18, 75], w: 0.7, emoji: '✏️', when: regularJob, text: 'You found a huge typo in your presentation, ten seconds before going on stage.', auto: (s) => { if (chance(0.5)) return 'You fixed it live, like a pro.'; M(s).career.perf = clamp100(M(s).career.perf - 3); return 'The slide said "Pubic Relations Plan." Everyone saw it.'; } });
EV('job_transfer', {
  ages: [22, 60], w: 0.6, emoji: '🏙️', when: regularJob, text: 'Your company offers you a transfer to another city, with a raise.',
  choices: [
    ['Take it', (s) => transferTo(s, pick(country(s).cities.filter((c) => c !== P(s).city)) || P(s).city)],
    ['Stay put', () => 'Your roots are here.'],
  ],
});
EV('job_lunch_thief', {
  ages: [18, 75], emoji: '🥡', when: regularJob, text: 'Someone keeps stealing your lunch from the office fridge.',
  choices: [
    ['Set a spicy trap', (s) => { add(s, { happy: 4, karma: -1 }); return 'You heard a scream from the accounting department. Mystery solved.'; }],
    ['Leave a passive-aggressive note', () => 'The note was stolen too.'],
    ['Eat lunch at your desk', () => 'Defeated, but fed.'],
  ],
});

/* ---- more story: love ---------------------------------------------------------------- */
const partnerOf = (s) => ({ pid: romanticId(s) });
EV('lv_cooks', {
  ages: [18, 90], emoji: '🍝', when: (s) => hasRomance(s) && free(s), ctx: partnerOf,
  text: (s, c) => `${nm(s, c.pid)} cooked you a surprise dinner. It is... something.`,
  choices: [
    ['Eat every bite and praise it', (s, c) => { addRel(s, c.pid, 8); add(s, { health: -1 }); return `${nm(s, c.pid)} beamed. You took an antacid later.`; }],
    ['Be honest', (s, c) => { addRel(s, c.pid, -6); return `${nm(s, c.pid)} said they'll never cook for you again. You'll see.`; }],
    ['Suggest cooking together next time', (s, c) => { addRel(s, c.pid, 5); addSkill(s, 'cooking', 2); return 'Your Sunday cooking nights are a tradition now.'; }],
  ],
});
EV('lv_snoring', {
  ages: [22, 100], emoji: '😴', when: (s) => !!spouseId(s) && free(s), ctx: (s) => ({ pid: spouseId(s) }),
  text: (s, c) => `${nm(s, c.pid)}'s snoring has reached jet-engine levels.`,
  choices: [
    ['Buy earplugs', (s) => { add(s, { happy: 2 }); return 'Silence. Beautiful silence.'; }],
    ['Sleep on the couch', (s, c) => { addRel(s, c.pid, -4); add(s, { health: -1 }); return 'Your back hates the couch. Your ears love it.'; }],
    ['Make them see a doctor', (s, c) => { addRel(s, c.pid, 4); return `${nm(s, c.pid)} grumbled, then got a fancy machine. You both sleep better.`; }],
  ],
});
EV('lv_getaway', {
  ages: [18, 90], emoji: '🏞️', when: (s) => hasRomance(s) && free(s), ctx: partnerOf,
  text: (s, c) => `${nm(s, c.pid)} suggests a romantic weekend getaway.`,
  choices: [
    { label: 'Book a cabin', sub: (s) => fmtMoney(price(s, 600)), fx: (s, c) => { const cost = price(s, 600); if (!pay(s, cost)) return cantAfford(cost); addRel(s, c.pid, 12); add(s, { happy: 7 }); return 'A fireplace, a lake, and no phone signal. Perfect.'; } },
    ['Too busy right now', (s, c) => { addRel(s, c.pid, -5); return `${nm(s, c.pid)} said "sure, another time" in that tone.`; }],
  ],
});
EV('lv_forgot_bday', {
  ages: [18, 90], w: 0.7, emoji: '🎂', when: (s) => hasRomance(s) && free(s), ctx: partnerOf,
  text: (s, c) => `You completely forgot ${nm(s, c.pid)}'s birthday.`,
  choices: [
    ['Throw together a surprise party by dinner', (s, c) => { if (chance(0.5)) { addRel(s, c.pid, 6); return 'Twelve friends, one cake, eight hours of panic. Nailed it.'; } addRel(s, c.pid, -6); return 'Half the guests could not come and the cake said "Happy Birthday Kevin."'; }],
    ['Apologize sincerely', (s, c) => { addRel(s, c.pid, -4); return `${nm(s, c.pid)} forgave you, but it will come up again.`; }],
  ],
});
EV('lv_matchmaker', {
  ages: [20, 65], emoji: '💘', when: (s) => !hasRomance(s) && free(s), ctx: (s) => someone(s, ['friend', 'bestie', 'sibling', 'parent']),
  text: (s, c) => `${nm(s, c.pid)} insists they have found "the perfect person" for you.`,
  choices: [
    ['Go on the setup', (s, c) => { const p = candidatePerson(s, {}); setRel(s, p.id, 'friend', 50); addRel(s, c.pid, 3); return tryRomance(s, p.id, 0.1); }],
    ['Politely refuse', (s, c) => { addRel(s, c.pid, -2); return `${nm(s, c.pid)} said you will regret it.`; }],
  ],
});
EV('lv_pet_together', {
  ages: [20, 70], emoji: '🐾', when: (s) => hasRomance(s) && free(s) && livesAlone(s), ctx: partnerOf,
  text: (s, c) => `${nm(s, c.pid)} wants to adopt a pet together.`,
  choices: [
    ['A dog', (s, c) => { const p = giftPet(s, 'dog'); addRel(s, c.pid, 8); return `Meet ${p.name}. You argue about who gets to walk them.`; }],
    ['A cat', (s, c) => { const p = giftPet(s, 'cat'); addRel(s, c.pid, 8); return `Meet ${p.name}. They ignore you both equally.`; }],
    ['Not yet', (s, c) => { addRel(s, c.pid, -3); return 'You promised to revisit it next year.'; }],
  ],
});
EV('lv_long_distance', {
  ages: [20, 60], w: 0.6, emoji: '✈️', when: (s) => hasRomance(s) && free(s) && !spouseId(s), ctx: partnerOf,
  text: (s, c) => `${nm(s, c.pid)} got a dream job offer in a city far away.`,
  choices: [
    ['Try long-distance', (s, c) => { if (chance(0.5)) { addRel(s, c.pid, 8); return 'Late-night calls and expensive flights. You made it work.'; } endRomance(s, c.pid, 'ex'); return `It did not survive the distance. You and ${nm(s, c.pid)} broke up.`; }],
    ['Ask them to stay', (s, c) => { if (chance(0.5)) { addRel(s, c.pid, -5); return `${nm(s, c.pid)} turned down the job. They mention it sometimes.`; } endRomance(s, c.pid, 'ex'); return `${nm(s, c.pid)} took the job. It was over.`; }],
  ],
});

/* ---- more story: family ---------------------------------------------------------- */
const kidAged = (lo, hi) => (s) => someone(s, ['child'], (p) => ageOf(s, p) >= lo && ageOf(s, p) <= hi);
EV('fam_first_steps', { ages: [18, 70], ctx: kidAged(1, 2), emoji: '👣', text: (s, c) => `${nm(s, c.pid)} took their first wobbly steps!`, auto: (s, c) => { add(s, { happy: 8 }); addRel(s, c.pid, 5); return 'Straight into the coffee table. Then up again.'; } });
EV('fam_kid_play', {
  ages: [20, 75], ctx: kidAged(5, 12), emoji: '🎭', text: (s, c) => `${nm(s, c.pid)} has a small part in the school play tonight.`,
  choices: [
    ['Sit in the front row and cheer', (s, c) => { addRel(s, c.pid, 10); add(s, { happy: 4 }); return `${nm(s, c.pid)} played a cloud. The best cloud ever.`; }],
    ['Miss it for work', (s, c) => { addRel(s, c.pid, -10); return `${nm(s, c.pid)} kept looking at your empty seat.`; }],
  ],
});
EV('fam_kid_bullied', {
  ages: [20, 75], ctx: kidAged(6, 15), emoji: '😔', text: (s, c) => `${nm(s, c.pid)} came home crying. Kids at school have been bullying them.`,
  choices: [
    ['Talk to the school', (s, c) => { addRel(s, c.pid, 6); return 'The principal stepped in. Things got better.'; }],
    ['Teach them to stand up for themselves', (s, c) => { addRel(s, c.pid, 4); s.people[c.pid].stats.happy = clamp100(s.people[c.pid].stats.happy + 5); return `${nm(s, c.pid)} stood tall the next day. The bullies backed off.`; }],
    ["Confront the bully's parents", (s, c) => { addRel(s, c.pid, 6); add(s, { karma: -1 }); return 'It got loud in the parking lot. It worked, though.'; }],
  ],
});
EV('fam_teen_tattoo', {
  ages: [30, 75], ctx: kidAged(15, 17), emoji: '🖋️', text: (s, c) => `${nm(s, c.pid)} wants a tattoo for their birthday.`,
  choices: [
    ['Absolutely not', (s, c) => { addRel(s, c.pid, -6); return `${nm(s, c.pid)} slammed the door. Classic.`; }],
    ['Only a small one', (s, c) => { addRel(s, c.pid, 6); return `${nm(s, c.pid)} got a tiny star on their ankle. You secretly love it.`; }],
    ['Wait until you are 18', (s, c) => { addRel(s, c.pid, -2); return 'They are counting down the days.'; }],
  ],
});
EV('fam_report_card', {
  ages: [22, 75], ctx: kidAged(6, 17), emoji: '📝', text: (s, c) => `${nm(s, c.pid)}'s report card came home.`,
  choices: [
    ['Celebrate the good grades', (s, c) => { addRel(s, c.pid, 6); s.people[c.pid].stats.smarts = clamp100(s.people[c.pid].stats.smarts + 1); return 'Ice cream for dinner. Just this once.'; }],
    ['Hire a tutor for the bad ones', (s, c) => { const cost = price(s, 400); M(s).money -= cost; s.people[c.pid].stats.smarts = clamp100(s.people[c.pid].stats.smarts + 4); addRel(s, c.pid, -2); return `A ${fmtMoney(cost)} tutor. ${nm(s, c.pid)} is grumbling, and improving.`; }],
  ],
});
EV('fam_parent_dating', {
  ages: [18, 70], ctx: (s) => someone(s, ['parent'], (p) => !p.partner), emoji: '💐', text: (s, c) => `${nm(s, c.pid)} has started dating again.`,
  choices: [
    ['Be happy for them', (s, c) => { addRel(s, c.pid, 8); add(s, { karma: 1 }); return `${nm(s, c.pid)} looks ten years younger.`; }],
    ['Interrogate their date', (s, c) => { addRel(s, c.pid, -4); return 'You asked about their credit score. It got weird.'; }],
  ],
});
EV('fam_teen_driving', {
  ages: [30, 75], ctx: kidAged(15, 17), emoji: '🚗', when: (s) => !!myCar(s), text: (s, c) => `${nm(s, c.pid)} wants you to teach them to drive.`,
  choices: [
    ['Stay calm in the passenger seat', (s, c) => { addRel(s, c.pid, 8); return 'You only grabbed the dashboard twice.'; }],
    ['Pay for driving school', (s, c) => { const cost = price(s, 500); M(s).money -= cost; addRel(s, c.pid, 3); return 'Worth every penny for your nerves.'; }],
  ],
});
EV('fam_empty_nest', {
  ages: [38, 80], once: true, emoji: '🏡', when: (s) => myChildren(s).length > 0 && myChildren(s).every((c) => ageOf(s, c) >= 18), text: 'The last of your kids has moved out. The house is very quiet.',
  choices: [
    ['Turn their room into a gym', (s) => { addSkill(s, 'fitness', 2); add(s, { happy: 4 }); return 'They came home for the holidays and slept next to a treadmill.'; }],
    ['Call them every day', (s) => { relAll(s, ['child'], 4); return 'They answer about half the time.'; }],
    ['Travel the world', (s) => { add(s, { happy: 6 }); tally(s, 'vacations'); return 'Finally, a trip without anyone asking "are we there yet?"'; }],
  ],
});
EV('fam_estate_fight', {
  ages: [30, 90], w: 0.6, emoji: '🪑', when: (s) => relPeople(s, ['parent'], { dead: true }).some((p) => !p.alive && s.year - p.deathYear <= 2) && relPeople(s, ['sibling']).length > 0,
  text: "You and your siblings are arguing over your late parent's belongings.",
  choices: [
    ['Let them take what they want', (s) => { relAll(s, ['sibling'], 8); add(s, { karma: 3 }); return 'You kept one thing: an old photo. It was all you wanted.'; }],
    ['Fight for the family heirlooms', (s) => { relAll(s, ['sibling'], -12); M(s).assets.push({ id: uid(s, 'a'), kind: 'jewelry', type: 'heirloom', emoji: '📿', name: 'Family heirloom necklace', value: price(s, randInt(2, 15) * 1000), paid: 0, cond: 100, since: s.year }); return 'You got the heirloom necklace. Holidays will be tense for a while.'; }],
  ],
});
EV('fam_grandparent_story', {
  ages: [8, 40], ctx: (s) => someone(s, ['grandparent'], (p) => ageOf(s, p) >= 70), emoji: '👴', text: (s, c) => `${nm(s, c.pid)} sat you down to tell a story from their youth.`,
  choices: [
    ['Listen to every word', (s, c) => { addRel(s, c.pid, 10); add(s, { smarts: 1 }); return `It was about ${pick(['a dance hall and a stolen motorcycle', 'meeting the love of their life at a bus stop', 'running a bakery during hard times', 'a summer they spent working on a ship'])}. You wrote it down.`; }],
    ['Check your phone', (s, c) => { addRel(s, c.pid, -6); return 'You missed the best part. You will never know how it ended.'; }],
  ],
});

/* ---- more story: home, cars and money ---------------------------------------------------- */
EV('home_leak', { ages: [20, 100], w: 0.7, emoji: '💧', when: (s) => !!myHouse(s), text: 'Water is dripping from the ceiling.', auto: (s) => { const c = price(s, randInt(500, 6000)); M(s).money -= c; add(s, { happy: -3 }); return `A burst pipe upstairs. The plumber charged ${fmtMoney(c)}.`; } });
EV('home_mice', {
  ages: [18, 100], emoji: '🐭', when: livesAlone, text: 'You have mice. Lots of mice.',
  choices: [
    ['Call an exterminator', (s) => { const c = price(s, 300); M(s).money -= c; return `${fmtMoney(c)} later, the mice are gone.`; }],
    ['Get a cat', (s) => { const p = giftPet(s, 'cat'); return `${p.name} solved the problem in a week and now expects praise daily.`; }],
    ['Name them and coexist', (s) => { add(s, { happy: 1, health: -2 }); return 'Gerald, Martha and the others are very happy here.'; }],
  ],
});
EV('home_renovation', {
  ages: [22, 95], emoji: '🔨', when: (s) => !!myHouse(s), text: 'Your contractor opened up a wall and found a surprise.',
  auto: (s) => { if (chance(0.3)) { const v = price(s, randInt(200, 3000)); add(s, { money: v, happy: 6 }); return `A tin box of old coins and letters from 1952. A collector paid ${fmtMoney(v)}.`; } const c = price(s, randInt(2000, 15000)); M(s).money -= c; return `Mold. The repairs cost ${fmtMoney(c)}.`; },
});
EV('home_property_tax', { ages: [20, 100], w: 0.6, emoji: '🏛️', when: (s) => !!myHouse(s), text: 'The city reassessed your home.', auto: (s) => { const h = myHouse(s); h.value = Math.round(h.value * 1.08); const c = price(s, randInt(300, 2500)); M(s).money -= c; return `It is worth more now, which is nice. Your taxes went up ${fmtMoney(c)}, which is not.`; } });
EV('car_recall', { ages: [16, 100], w: 0.6, emoji: '🚗', when: (s) => !!myCar(s), text: 'Your car was recalled for a faulty part.', auto: (s) => { add(s, { happy: -1 }); return 'The dealer fixed it for free and gave you a coffee. Not bad.'; } });
EV('car_fender', {
  ages: [16, 100], emoji: '🚙', when: (s) => !!myCar(s) && free(s), text: 'Someone backed into your car in a parking lot and drove off.',
  choices: [
    ['Pay to fix it', (s) => { const c = price(s, randInt(400, 2500)); M(s).money -= c; return `${fmtMoney(c)} at the body shop. It looks brand new.`; }],
    ['Live with the dent', (s) => { const car = myCar(s); car.value = Math.round(car.value * 0.95); car.cond = clamp100(car.cond - 8); return 'Character. That is what the dent is. Character.'; }],
  ],
});
EV('car_road_rage', {
  ages: [16, 95], emoji: '😡', when: (s) => !!myCar(s) && free(s), text: 'A driver cut you off and then flipped you off.',
  choices: [
    ['Let it go', (s) => { add(s, { karma: 1 }); return 'Deep breaths. Not worth it.'; }],
    ['Honk for a full minute', (s) => { add(s, { happy: 2 }); return 'Very satisfying. Very loud.'; }],
    ['Follow them', (s) => { add(s, { karma: -3 }); if (chance(0.2)) { add(s, { health: -8 }); return 'They got out of their car. It did not go well.'; } return 'They pulled into a police station. You kept driving.'; }],
  ],
});
EV('money_refund', { ages: [18, 100], w: 0.7, emoji: '🧾', when: (s) => hasJob(s), text: 'You got a surprisingly big tax refund.', auto: (s) => { const amt = price(s, randInt(300, 3000)); add(s, { money: amt, happy: 4 }); return `${fmtMoney(amt)}. You feel like you got away with something.`; } });
EV('money_audit', {
  ages: [22, 100], w: 0.5, emoji: '📋', when: (s) => hasJob(s) || companies(s).length > 0, text: 'The tax office is auditing you.',
  choices: [
    ['Hire an accountant', (s) => { const c = price(s, 1500); M(s).money -= c; return `${fmtMoney(c)} later, everything checked out.`; }],
    ['Handle it yourself', (s) => { if (chance(0.4)) { const c = price(s, randInt(1000, 10000)); M(s).money -= c; add(s, { happy: -4 }); return `You missed some deductions and owe ${fmtMoney(c)} in back taxes.`; } add(s, { smarts: 1 }); return 'You survived the audit armed with a shoebox of receipts.'; }],
  ],
});
EV('money_small_inheritance', { ages: [20, 90], w: 0.4, emoji: '✉️', text: 'A distant cousin you barely remember left you something in their will.', auto: (s) => { const amt = price(s, randInt(500, 25000)); add(s, { money: amt }); return `A check for ${fmtMoney(amt)} and a ceramic cat.`; } });

/* ---- more story: health ----------------------------------------------------------- */
EV('hl_back', { ages: [25, 90], w: 0.7, emoji: '📦', text: 'You lifted a heavy box with your back instead of your knees.', auto: (s) => { if (chance(0.4)) { getSick(s, 'backpain'); return 'Something went pop. Your back is not the same.'; } add(s, { health: -2 }); return 'You were sore for a week.'; } });
EV('hl_allergy', { ages: [5, 90], w: 0.5, emoji: '🥜', text: 'You had an allergic reaction at a restaurant.', auto: (s) => { add(s, { health: -4, happy: -3 }); return 'Your lips swelled up like balloons. The waiter swore there were no nuts.'; } });
EV('hl_insomnia', {
  ages: [16, 100], w: 0.6, emoji: '🌙', text: 'You have not slept properly in weeks.',
  choices: [
    ['Put the phone away at night', (s) => { add(s, { health: 2, happy: 2 }); return 'You read a real book in bed and slept like a baby.'; }],
    ['Cut out the late coffee', (s) => { add(s, { health: 2 }); return 'Your 4 p.m. espresso was the villain all along.'; }],
    ['Power through', (s) => { add(s, { health: -3 }); if (chance(0.3)) getSick(s, 'insomnia'); return 'You are running on fumes.'; }],
  ],
});
EV('hl_quit_smoking', {
  ages: [16, 100], emoji: '🚭', when: (s) => (M(s).addictions.nicotine || 0) >= 20, text: 'You are thinking about quitting smoking for good.',
  choices: [
    ['Quit cold turkey', (s) => { if (chance(0.35)) { delete M(s).addictions.nicotine; add(s, { health: 5, happy: 4 }); return { text: 'You did it. Your lungs thank you.', tone: 'good' }; } habit(s, 'nicotine', -10); add(s, { happy: -4 }); return 'You lasted nine days. You will try again.'; }],
    ['Use patches', (s) => { const c = price(s, 200); M(s).money -= c; if (chance(0.55)) { delete M(s).addictions.nicotine; add(s, { health: 5 }); return { text: 'Slowly but surely, you quit.', tone: 'good' }; } habit(s, 'nicotine', -15); return 'You cut back a lot. Not all the way.'; }],
    ['Not this year', () => 'Maybe next year.'],
  ],
});
EV('hl_flu_shot', {
  ages: [5, 100], emoji: '💉', text: 'Flu season is coming.',
  choices: [
    ['Get the flu shot', (s) => { add(s, { health: 1 }); return 'A tiny pinch, and you were fine all winter.'; }],
    ['Skip it', (s) => { if (chance(0.3)) { getSick(s, 'flu'); return 'You got the flu. Of course you did.'; } return 'You dodged it this year.'; }],
  ],
});
EV('hl_reading_glasses', { ages: [40, 60], once: true, emoji: '👓', text: 'You noticed you are holding menus at arm’s length.', auto: (s) => { add(s, { happy: -1 }); return 'You need reading glasses. You bought three pairs and lose them constantly.'; } });

/* ---- more story: travel, pets and hobbies --------------------------------------------- */
EV('tr_missed_flight', {
  ages: [16, 95], w: 0.5, emoji: '🛫', when: (s) => lifeCount(s, 'vacations') > 0, text: 'You missed your flight home by four minutes.',
  choices: [
    ['Pay for the next flight', (s) => { const c = price(s, 400); M(s).money -= c; return `${fmtMoney(c)} and six hours at the gate.`; }],
    ['Make the most of an extra day', (s) => { add(s, { happy: 4 }); return 'You found the best street food of the whole trip.'; }],
  ],
});
EV('tr_upgrade', { ages: [16, 95], w: 0.4, emoji: '💺', when: (s) => lifeCount(s, 'vacations') > 0, text: 'The gate agent upgraded you to first class for free.', auto: (s) => { add(s, { happy: 6 }); return 'Warm towels, real silverware, and legroom. You may never recover.'; } });
EV('pet_vet', {
  ages: [8, 100], emoji: '🩺', ctx: (s) => { const p = pick(myPets(s)); return p ? { pet: p.id } : null; },
  text: (s, c) => `${s.pets[c.pet].name} ate something they should not have.`,
  choices: [
    { label: 'Rush to the emergency vet', sub: (s) => (A(s) < 18 ? 'Your parents pay' : fmtMoney(price(s, 800))), fx: (s, c) => { const cost = A(s) < 18 ? 0 : price(s, 800); if (!pay(s, cost)) return cantAfford(cost); const p = s.pets[c.pet]; if (p) p.rel = clamp100(p.rel + 10); return `It was ${pick(['a sock', 'half a chocolate bar', 'a hair tie', 'a crayon'])}. ${p ? p.name : 'Your pet'} is fine.`; } },
    ['Wait and see', (s, c) => { const p = s.pets[c.pet]; if (p && chance(0.15)) { p.alive = false; p.died = s.year; add(s, { happy: -12 }); return { text: `${p.name} did not make it. You will never forgive yourself.`, tone: 'bad' }; } return 'They threw it up on the rug. Crisis over.'; }],
  ],
});
EV('pet_trick', { ages: [6, 100], emoji: '🦴', ctx: (s) => { const p = pick(myPets(s).filter((x) => ['dog', 'parrot', 'pig', 'horse'].includes(x.species))); return p ? { pet: p.id } : null; }, text: (s, c) => `${s.pets[c.pet].name} learned a new trick.`, auto: (s, c) => { add(s, { happy: 4 }); s.pets[c.pet].rel = clamp100(s.pets[c.pet].rel + 5); return pick(['They can roll over on command now.', 'They learned to high-five.', 'They can open the fridge. This is a problem.']); } });
EV('pet_escape', {
  ages: [6, 100], w: 0.6, emoji: '🏃', ctx: (s) => { const p = pick(myPets(s).filter((x) => ['dog', 'cat', 'rabbit', 'ferret', 'goat', 'pig'].includes(x.species))); return p ? { pet: p.id } : null; },
  text: (s, c) => `${s.pets[c.pet].name} escaped!`,
  choices: [
    ['Search the whole neighborhood', (s, c) => { const p = s.pets[c.pet]; if (chance(0.85)) { p.rel = clamp100(p.rel + 5); return `You found ${p.name} three streets over, ${pick(['in a stranger’s kitchen', 'chasing a squirrel', 'asleep in a flower bed', 'at the butcher shop'])}.`; } p.alive = false; p.died = s.year; add(s, { happy: -10 }); return { text: `You never found ${p.name}. You still leave the porch light on.`, tone: 'bad' }; }],
    ['Put up posters', (s, c) => { const p = s.pets[c.pet]; return `A neighbor called the next day. ${p.name} had been eating their tomatoes.`; }],
  ],
});
EV('hob_photo_contest', {
  ages: [12, 90], emoji: '📸', text: 'A local magazine is holding a photography contest.',
  choices: [
    ['Enter your best shot', (s) => { addSkill(s, 'art', 2); if (skill(s, 'art') + randInt(0, 60) > 60) { const w = price(s, 500); add(s, { money: w, happy: 6 }); return `Your photo of ${pick(['a fox in the snow', 'a thunderstorm over the city', 'your grandmother laughing'])} won ${fmtMoney(w)}!`; } return 'You did not place, but the judges called it "promising."'; }],
    ['Skip it', () => 'Your photos are for you.'],
  ],
});
EV('hob_fishing', {
  ages: [8, 95], emoji: '🎣', text: 'A friend invites you on an early-morning fishing trip.',
  choices: [
    ['Go', (s) => { add(s, { happy: 4 }); return chance(0.3) ? 'You caught a fish so big nobody believes you. You have a photo. Nobody believes the photo.' : 'Five hours, zero fish, one perfect sunrise.'; }],
    ['Sleep in', () => 'The fish are safe from you.'],
  ],
});

/* ---- more story: social life ------------------------------------------------------- */
EV('soc_block_party', {
  ages: [8, 95], emoji: '🎈', text: 'Your street is throwing a block party.',
  choices: [
    ['Bring your famous dish', (s) => { addSkill(s, 'cooking', 2); add(s, { happy: 4, karma: 1 }); return 'It was gone in ten minutes. Three neighbors asked for the recipe.'; }],
    ['Run the music', (s) => { addSkill(s, 'music', 1); add(s, { happy: 5 }); return 'You played the right songs. Even the grumpy neighbor danced.'; }],
    ['Watch from your window', () => 'The smell of the grill was torture.'],
  ],
});
EV('soc_trivia', {
  ages: [18, 85], emoji: '🧠', text: 'Your friends need one more person for pub trivia night.',
  choices: [
    ['Join the team', (s) => { add(s, { smarts: 1 }); if (P(s).stats.smarts + randInt(0, 60) > 85) { const w = price(s, 100); add(s, { money: w, happy: 5 }); return `You knew the capital of Mongolia. Your team won a ${fmtMoney(w)} bar tab.`; } return 'You came in fourth, one point behind a team called "Quiz Khalifa."'; }],
    ['Stay home', () => 'You yelled answers at a TV quiz show instead.'],
  ],
});
EV('soc_dinner_party', {
  ages: [22, 90], emoji: '🍷', when: livesAlone, text: 'You are hosting a dinner party for friends.',
  choices: [
    ['Cook something ambitious', (s) => { addSkill(s, 'cooking', 3); if (skill(s, 'cooking') + randInt(0, 60) > 55) { relAll(s, K_FRIENDS, 5); add(s, { happy: 6 }); return 'The soufflé rose. Everyone gasped. You are a legend.'; } add(s, { happy: -2 }); return 'The soufflé collapsed. You ordered pizza and called it "deconstructed."'; }],
    ['Make it a potluck', (s) => { relAll(s, K_FRIENDS, 4); return 'Six people brought chips. Nobody brought a main course. It was perfect.'; }],
  ],
});
EV('soc_wedding_crash', {
  ages: [18, 60], w: 0.5, emoji: '💒', text: 'Your friend dares you to crash a fancy wedding at the hotel next door.',
  choices: [
    ['Crash it', (s) => { add(s, { happy: 6, karma: -2 }); if (chance(0.3)) return 'Security walked you out during the cake cutting. You took a slice with you.'; return 'You gave a toast to the couple. Nobody knew who you were. Everyone loved it.'; }],
    ['Decline', () => 'You will crash a wedding someday. Not today.'],
  ],
});

/* ---- more story: love and family, part two ------------------------------------------------ */
EV('lv_meet_parents', {
  ages: [18, 60], emoji: '☕', when: (s) => hasRomance(s) && !spouseId(s) && free(s), ctx: partnerOf,
  text: (s, c) => `You are meeting ${nm(s, c.pid)}'s parents for the first time.`,
  choices: [
    ['Bring flowers and compliment everything', (s, c) => { flag(s, 'metfam_' + c.pid, true); for (const p of ensureInlaws(s, c.pid)) addRel(s, p.id, 10); addRel(s, c.pid, 6); return 'Their mother hugged you at the door. Their father shook your hand for a long time.'; }],
    ['Just be yourself', (s, c) => { flag(s, 'metfam_' + c.pid, true); const met = ensureInlaws(s, c.pid); if (chance(0.6)) { for (const p of met) addRel(s, p.id, 12); addRel(s, c.pid, 8); return 'They loved you. You are invited to every holiday now.'; } for (const p of met) addRel(s, p.id, -6); addRel(s, c.pid, -4); return 'You told the joke. They did not laugh.'; }],
    ['Talk politics at dinner', (s, c) => { flag(s, 'metfam_' + c.pid, true); for (const p of ensureInlaws(s, c.pid)) addRel(s, p.id, -12); addRel(s, c.pid, -8); return 'Dessert was eaten in total silence.'; }],
  ],
});
EV('lv_dance_lessons', {
  ages: [20, 85], emoji: '💃', when: (s) => hasRomance(s) && free(s), ctx: partnerOf,
  text: (s, c) => `${nm(s, c.pid)} signed you both up for dance lessons.`,
  choices: [
    ['Give it your all', (s, c) => { addRel(s, c.pid, 10); addSkill(s, 'fitness', 2); return 'By the last class, you could almost tango.'; }],
    ['Stomp on their feet the whole time', (s, c) => { addRel(s, c.pid, 4); add(s, { happy: 3 }); return 'You laughed so much the instructor gave up on you both.'; }],
  ],
});
EV('fam_holiday_photo', { ages: [18, 90], emoji: '📸', when: (s) => myChildren(s).some((c) => ageOf(s, c) < 15), text: 'You tried to take a nice family photo for the holiday card.', auto: (s) => { add(s, { happy: 2 }); return `Out of 140 photos, exactly zero have everyone looking at the camera. You picked the one where ${pick(['the baby is crying', 'the dog is mid-sneeze', 'someone is blinking', 'everyone is laughing'])}.`; } });
EV('fam_kid_lie', {
  ages: [22, 80], ctx: kidAged(5, 15), emoji: '🤥', text: (s, c) => `You caught ${nm(s, c.pid)} in a big lie.`,
  choices: [
    ['Ground them', (s, c) => { addRel(s, c.pid, -5); return `${nm(s, c.pid)} spent a week in their room, very dramatically.`; }],
    ['Have a calm talk about honesty', (s, c) => { addRel(s, c.pid, 4); return `${nm(s, c.pid)} admitted everything and cried. You both felt better.`; }],
  ],
});
EV('fam_parent_tech', {
  ages: [20, 70], ctx: (s) => someone(s, ['parent', 'grandparent'], (p) => ageOf(s, p) >= 60), emoji: '💻',
  text: (s, c) => `${nm(s, c.pid)} needs help with their computer. Again.`,
  choices: [
    ['Patiently walk them through it', (s, c) => { addRel(s, c.pid, 8); add(s, { karma: 1 }); return 'They wrote every step down in a notebook. They will call again tomorrow.'; }],
    ['Just fix it yourself', (s, c) => { addRel(s, c.pid, 3); return 'It took four seconds. They looked at you like you were a wizard.'; }],
    ['Tell them to turn it off and on again', (s, c) => { addRel(s, c.pid, -2); return 'It worked, which annoyed you both.'; }],
  ],
});

/* ---- more story: work, health and money, part two ------------------------------------------- */
EV('job_secret_santa', {
  ages: [18, 75], emoji: '🎅', when: regularJob, ctx: (s) => someone(s, ['coworker', 'boss']), text: (s, c) => `You drew ${nm(s, c.pid)} in the office gift exchange.`,
  choices: [
    ['Find the perfect gift', (s, c) => { addRel(s, c.pid, 10); return `${nm(s, c.pid)} was genuinely touched. How did you know?`; }],
    ['Regift something from your closet', (s, c) => { addRel(s, c.pid, -3); return 'They opened a candle that still had a card from your aunt in it.'; }],
  ],
});
EV('job_automation', {
  ages: [22, 70], w: 0.6, emoji: '🤖', when: regularJob, text: 'Your company is testing software that could do half of your job.',
  choices: [
    ['Learn to run the software', (s) => { addSkill(s, 'coding', 4); M(s).career.perf = clamp100(M(s).career.perf + 6); return 'You are now the only person who understands it. Job security!'; }],
    ['Prove a human does it better', (s) => { M(s).career.perf = clamp100(M(s).career.perf + 3); return 'The software made a very expensive mistake. Your job is safe, for now.'; }],
  ],
});
EV('job_rude_customer', {
  ages: [16, 75], emoji: '😤', when: (s) => (regularJob(s) && ['service', 'office'].includes(JOBS[M(s).career.id].cat)) || !!M(s).ptJob, text: 'A customer is screaming at you over something that is not your fault.',
  choices: [
    ['Stay calm and polite', (s) => { add(s, { karma: 2, happy: -2 }); if (M(s).career) M(s).career.perf = clamp100(M(s).career.perf + 3); return 'They left a complaint, then a second, nicer one apologizing.'; }],
    ['Give it right back', (s) => { add(s, { happy: 3 }); if (M(s).career && chance(0.3)) { M(s).career.perf = clamp100(M(s).career.perf - 10); return 'It was very satisfying. Your manager saw everything.'; } return 'The other customers applauded.'; }],
  ],
});
EV('hl_dentist_adult', { ages: [25, 90], w: 0.6, emoji: '🦷', text: 'You finally went to the dentist after a few years.', auto: (s) => { if (chance(0.4)) { const c = medPrice(s, { cost: 900 }); M(s).money -= c; add(s, { happy: -3 }); return `A root canal. ${fmtMoney(c)} and a very numb afternoon.`; } return 'No cavities. The hygienist lectured you about flossing anyway.'; } });
EV('hl_fad_diet', {
  ages: [18, 75], emoji: '🥗', text: () => `Everyone at work is doing the ${pick(['all-grapefruit', 'raw-food', 'eat-like-a-caveman', 'only-soup'])} diet.`,
  choices: [
    ['Try it', (s) => { if (chance(0.4)) { add(s, { health: 2, looks: 1 }); return 'You lost a little weight and felt great. You will not shut up about it.'; } add(s, { happy: -3 }); return 'You lasted four days and then ate an entire pizza.'; }],
    ['Stick to normal food', () => 'Moderation: the least exciting diet, and the best.'],
  ],
});
EV('hl_mental_day', {
  ages: [16, 75], emoji: '🧘', when: (s) => P(s).stats.happy < 45, text: 'Everything feels heavy lately.',
  choices: [
    ['Take a day just for you', (s) => { add(s, { happy: 6 }); return 'A long walk, a nap and your favorite movie. It helped more than you expected.'; }],
    ['Talk to a friend about it', (s) => { add(s, { happy: 5 }); relAll(s, K_FRIENDS, 4); return 'You talked for hours. You are not alone in this.'; }],
    ['Keep it bottled up', (s) => { add(s, { happy: -3 }); return 'You smiled through it. It did not go away.'; }],
  ],
});
EV('mon_bank_error', {
  ages: [18, 100], w: 0.4, emoji: '🏦', text: 'A bank error put a large deposit in your account.',
  choices: [
    ['Report it', (s) => { add(s, { karma: 4 }); return 'The bank thanked you and sent a pen. A really nice pen.'; }],
    ['Spend it quick', (s) => { const amt = price(s, randInt(500, 5000)); add(s, { money: amt, karma: -4 }); if (chance(0.6)) { M(s).money -= Math.round(amt * 1.1); return { text: 'The bank took it back, plus fees.', tone: 'bad' }; } return `They never noticed. You spent ${fmtMoney(amt)} on things you do not remember.`; }],
  ],
});
