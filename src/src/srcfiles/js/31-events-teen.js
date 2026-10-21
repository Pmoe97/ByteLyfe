/* =====================================================================
 * 31-events-teen.js — event content for teenagers (13-17).
 * ===================================================================== */

EV('teen_drink', {
  ages: [13, 17], emoji: '🍺', text: 'At a party, an older kid handed you a drink.',
  choices: [
    ['Drink it', (s) => { habit(s, 'alcohol', randInt(4, 10)); add(s, { happy: 3, health: -1 }); if (chance(0.3)) { relAll(s, ['parent'], -8); return 'You came home stumbling. Your parents were waiting up.'; } return 'You felt very grown up for about an hour.'; }],
    ['Ask for a soda instead', (s) => { add(s, { karma: 1 }); return 'Someone called you lame. You had a great time anyway.'; }],
    ['Leave the party', (s) => { add(s, { happy: -1 }); return 'You called your parents for a ride home.'; }],
  ],
});
EV('teen_vape', {
  ages: [13, 17], emoji: '💨', ctx: (s) => someone(s, ['friend', 'bestie', 'classmate']),
  text: (s, c) => `${nm(s, c.pid)} offered you a hit of their vape.`,
  choices: [
    ['Try it', (s) => { habit(s, 'nicotine', randInt(8, 18)); add(s, { health: -2 }); return 'You coughed for a solid minute. Then you tried again.'; }],
    ['Say no', (s, c) => { addRel(s, c.pid, -2); add(s, { health: 1 }); return 'Your lungs thank you.'; }],
  ],
});
EV('teen_crush', {
  ages: [13, 17], w: 2, when: (s) => !hasRomance(s), emoji: '💓', ctx: (s) => crushable(s, ['classmate', 'friend']),
  text: (s, c) => `You can't stop thinking about ${nm(s, c.pid)}.`,
  choices: [
    ['Ask them out', (s, c) => tryRomance(s, c.pid)],
    ['Leave an anonymous note', (s, c) => { if (chance(0.35)) return tryRomance(s, c.pid, 0.1); return `${nm(s, c.pid)} read your note and showed it to everyone. Nobody knows it was you. Phew.`; }],
    ['Keep it to yourself', () => 'Your secret is safe in your diary.'],
  ],
});
EV('teen_dance', {
  ages: [13, 17], when: isStudent, emoji: '🕺', text: 'The school dance is this weekend.',
  choices: [
    ['Go with friends', (s) => { add(s, { happy: 5 }); relAll(s, ['friend', 'bestie'], 3); return 'You danced like nobody was watching. Everybody was watching.'; }],
    { label: 'Go with your date', when: (s) => hasRomance(s), fx: (s) => { const r = romanticId(s); addRel(s, r, 8); add(s, { happy: 6 }); return `You and ${nm(s, r)} slow-danced to the last song.`; } },
    { label: 'Ask someone to go with you', when: (s) => !hasRomance(s) && !!crushable(s, ['classmate', 'friend']), fx: (s) => { const c = crushable(s, ['classmate', 'friend']); return c ? tryRomance(s, c.pid) : 'By the time you worked up the nerve, everyone already had a date.'; } },
    ['Stay home', () => 'You stayed home and watched a movie.'],
  ],
});
EV('teen_prom', {
  ages: [17, 18], once: true, when: (s) => isStudent(s) && eduCur(s).stage === 'high', emoji: '👑', text: 'Prom night is here!',
  choices: [
    { label: 'Go with your date', when: (s) => hasRomance(s), fx: (s) => { const r = romanticId(s); addRel(s, r, 10); return promNight(s, `You and ${nm(s, r)} were the cutest couple there.`); } },
    ['Go with friends', (s) => { relAll(s, ['friend', 'bestie'], 4); return promNight(s, 'You and your friends rented a limo and danced all night.'); }],
    ['Skip prom', (s) => { add(s, { happy: -2 }); return 'You skipped prom. You will hear about it for years.'; }],
  ],
});
function promNight(s, line) {
  add(s, { happy: 7 });
  if (chance(P(s).stats.looks / 400 + (eduCur(s) && eduCur(s).clique === 'populars' ? 0.15 : 0))) { add(s, { happy: 6 }); tally(s, 'promRoyalty'); return line + ` You were crowned prom ${genderWord(P(s), 'king', 'queen', 'royalty')}! 👑`; }
  return line;
}
EV('teen_sneak', {
  ages: [13, 17], emoji: '🌙', text: 'Your friends are going to a party tonight, but you have a curfew.',
  choices: [
    ['Sneak out', (s) => { add(s, { happy: 5 }); if (chance(0.35)) { relAll(s, ['parent'], -10); return 'You climbed back in through the window. Your mom was sitting on your bed. You are grounded.'; } return 'You snuck out, partied, and made it home undetected.'; }],
    ['Ask permission', (s) => { if (parentsAgree(s)) { add(s, { happy: 4 }); return 'Your parents said yes, but you had to be home by midnight.'; } return 'They said no.'; }],
    ['Stay in', () => 'You stayed home.'],
  ],
});
EV('teen_exam', {
  ages: [13, 25], when: (s) => inSchool(s), emoji: '📄', text: 'You have a huge exam tomorrow. A classmate is selling the answers.',
  choices: [
    ['Buy the answers', (s) => { const cost = price(s, 40); add(s, { money: -cost, karma: -3 }); if (chance(0.25)) { eduCur(s).grades = clamp100(eduCur(s).grades - 15); return 'The teacher caught on. You got a zero and detention.'; } eduCur(s).grades = clamp100(eduCur(s).grades + 8); return 'You aced it. You feel a little gross about it.'; }],
    ['Pull an all-nighter', (s) => { eduCur(s).grades = clamp100(eduCur(s).grades + randInt(2, 7)); add(s, { health: -1, smarts: 1 }); return 'You studied until sunrise. Exhausting, but it paid off.'; }],
    ['Wing it', (s) => { if (chance(P(s).stats.smarts / 120)) return 'You winged it and somehow passed.'; eduCur(s).grades = clamp100(eduCur(s).grades - 6); return 'You winged it. It did not go well.'; }],
  ],
});
EV('teen_photo', {
  ages: [13, 20], emoji: '📸', text: 'Someone posted an embarrassing photo of you online.',
  choices: [
    ['Clap back', (s) => { if (chance(0.5 + (trait(s, 'funny') ? 0.2 : 0))) { add(s, { happy: 4 }); return 'Your reply was so savage it got more likes than the photo.'; } add(s, { happy: -5 }); return 'Your clapback made it worse. So much worse.'; }],
    ['Ignore it', (s) => { add(s, { happy: -2 }); return 'It blew over in a few days.'; }],
    ['Report it', (s) => { add(s, { happy: -1 }); return 'The photo was taken down.'; }],
  ],
});
EV('teen_shoplift_peer', {
  ages: [12, 17], emoji: '🧢', ctx: (s) => someone(s, ['friend', 'bestie', 'classmate']),
  text: (s, c) => `${nm(s, c.pid)} wants you to help them shoplift from the mall.`,
  choices: [
    ['Join in', (s, c) => { addRel(s, c.pid, 5); return commitCrime(s, 'shoplift'); }],
    ['Refuse', (s, c) => { addRel(s, c.pid, -4); add(s, { karma: 1 }); return 'You refused. They called you a coward.'; }],
    ['Talk them out of it', (s, c) => { if (chance(0.5)) { add(s, { karma: 2 }); return `You talked ${nm(s, c.pid)} down. They thanked you later.`; } addRel(s, c.pid, -5); return `${nm(s, c.pid)} rolled their eyes and did it anyway.`; }],
  ],
});
EV('teen_tryouts', {
  ages: [13, 17], when: isStudent, emoji: '🏈', text: 'Tryouts for the varsity team are this week.',
  choices: [
    ['Try out', (s) => {
      if (chance(clamp(0.15 + skill(s, 'athletics') / 80 + skill(s, 'fitness') / 200, 0.05, 0.95))) {
        const cur = eduCur(s);
        if (!cur.clubs.includes('sports') && cur.clubs.length < 2) cur.clubs.push('sports');
        addSkill(s, 'athletics', 4);
        add(s, { happy: 6 });
        return "You made varsity! Practice starts Monday.";
      }
      add(s, { happy: -4 }); return "You didn't make the cut this year.";
    }],
    ['Skip it', () => 'Sports are not your thing.'],
  ],
});
EV('teen_band', {
  ages: [13, 20], emoji: '🎸', text: () => `Some kids are starting a band and need a ${pick(['singer', 'drummer', 'guitarist', 'bassist', 'keyboard player'])}.`,
  choices: [
    ['Join the band', (s) => { addSkill(s, 'music', randFloat(4, 7)); add(s, { happy: 5 }); const p = meetSomeone(s, 'friend', randInt(45, 65)); return { text: `You joined the band with ${p.first}. You play a gig at a birthday party next week.`, person: p.id }; }],
    ['Pass', () => 'Your music career can wait.'],
  ],
});
EV('teen_summer_job', {
  ages: [13, 17], emoji: '☀️', text: () => `A neighbor offers to pay you to ${pick(['mow their lawn', 'watch their kids', 'walk their dog', 'paint their fence', 'water their plants'])} all summer.`,
  choices: [
    ['Take the job', (s) => { const amt = price(s, randInt(200, 900)); add(s, { money: amt, karma: 1 }); addSkill(s, 'business', 1); return `You earned ${fmtMoney(amt)} over the summer.`; }],
    ['Enjoy your summer instead', (s) => { add(s, { happy: 3 }); return 'You spent the summer at the pool.'; }],
  ],
});
EV('teen_sibling_clothes', {
  ages: [10, 20], emoji: '👕', ctx: (s) => someone(s, ['sibling', 'halfsibling'], (p) => ageOf(s, p) >= 8),
  text: (s, c) => `${nm(s, c.pid)} borrowed your favorite shirt without asking and spilled spaghetti on it.`,
  choices: [
    ['Yell at them', (s, c) => { addRel(s, c.pid, -8); add(s, { happy: 1 }); return 'You screamed. They screamed back. The whole house heard.'; }],
    ['Let it slide', (s, c) => { addRel(s, c.pid, 4); add(s, { karma: 2 }); return 'It is just a shirt. Probably.'; }],
    ['Take something of theirs', (s, c) => { addRel(s, c.pid, -4); add(s, { karma: -1, happy: 2 }); return `You "borrowed" ${nm(s, c.pid)}'s headphones. Fair is fair.`; }],
  ],
});
EV('teen_viral', { ages: [13, 25], w: 0.3, emoji: '📱', text: () => `A video of you ${pick(['tripping into a fountain', 'singing in the shower', 'dancing at a wedding', 'getting chased by a goose', 'nailing a backflip'])} went viral.`, auto: (s) => { add(s, { fame: 2, happy: chance(0.5) ? 4 : -4 }); if (M(s).socials) M(s).socials.followers += randInt(500, 20000); return 'Everyone at school has seen it.'; } });
EV('teen_graffiti', {
  ages: [13, 17], emoji: '🎨', text: 'Your friends dare you to spray-paint your name on the water tower.',
  choices: [['Do it', (s) => commitCrime(s, 'vandalism')], ['Refuse', () => 'You value your clean record. And your life.']],
});
EV('teen_curfew', {
  ages: [13, 17], emoji: '⏰', text: 'Your parents set a strict 9 p.m. curfew.',
  choices: [
    ['Accept it', (s) => { relAll(s, ['parent'], 3); return 'You grumbled, but you accepted it.'; }],
    ['Argue about it', (s) => { if (chance(0.3 + skill(s, 'charisma') / 100)) { addSkill(s, 'charisma', 2); return 'You argued your case like a lawyer. Curfew extended to 11!'; } relAll(s, ['parent'], -5); return 'You lost the argument. Curfew is now 8 p.m.'; }],
  ],
});
EV('teen_diary', {
  ages: [12, 17], emoji: '📔', ctx: (s) => someone(s, ['parent']), text: (s, c) => `You caught ${nm(s, c.pid)} reading your diary.`,
  choices: [
    ['Confront them', (s, c) => { addRel(s, c.pid, chance(0.5) ? 4 : -6); return `You told ${nm(s, c.pid)} that was a violation of your privacy. They apologized... eventually.`; }],
    ['Start a new, secret diary', (s) => { addSkill(s, 'writing', 2); return 'Your new diary is hidden inside a hollowed-out dictionary.'; }],
    ['Write fake entries to mess with them', (s, c) => { add(s, { happy: 4 }); return `You wrote that you joined a circus. ${nm(s, c.pid)} has questions.`; }],
  ],
});
EV('teen_learn_drive', {
  ages: [15, 17], when: (s) => !M(s).license, emoji: '🚗', ctx: (s) => someone(s, ['parent']),
  text: (s, c) => `${nm(s, c.pid)} offers to teach you how to drive.`,
  choices: [
    ['Sure!', (s, c) => { addSkill(s, 'driving', randFloat(5, 10)); addRel(s, c.pid, 6); return chance(0.2) ? `You backed into the mailbox. ${nm(s, c.pid)} took a deep breath.` : 'You did great. Only one curb was harmed.'; }],
    ['No thanks', () => 'Maybe next year.'],
  ],
});
EV('teen_first_kiss', { ages: [13, 17], once: true, when: (s) => hasRomance(s), emoji: '💋', ctx: (s) => ({ pid: romanticId(s) }), text: (s, c) => `You had your first kiss with ${nm(s, c.pid)}.`, auto: (s, c) => { add(s, { happy: 6 }); addRel(s, c.pid, 6); return pick(['Fireworks.', 'It was awkward and perfect.', 'You bumped noses. Still counts.']); } });
EV('teen_college_visit', {
  ages: [16, 17], when: (s) => isStudent(s) && eduCur(s).stage === 'high', emoji: '🏫', text: 'Your school is running visits to college campuses.',
  choices: [
    ['Go', (s) => { add(s, { smarts: 1, happy: 2 }); eduCur(s).grades = clamp100(eduCur(s).grades + 2); return 'Seeing the campus made you want to study harder.'; }],
    ['Skip it', () => 'You will figure out college later.'],
  ],
});
EV('teen_identity', {
  ages: [13, 17], once: true, w: 0.6, when: (s) => P(s).orient !== 'straight', emoji: '🌈', text: "You've been doing some thinking about who you're attracted to.",
  choices: [
    ['Come out to your family', (s) => { const ok = chance(0.8); relAll(s, ['parent'], ok ? 4 : -8); add(s, { happy: ok ? 8 : -2 }); return ok ? 'Your family hugged you and said they love you, no matter what.' : 'Your family needs some time. It hurts, but you know who you are.'; }],
    ['Tell your best friend first', (s) => { const b = pickRel(s, ['bestie', 'friend']); if (b) addRel(s, b, 8); add(s, { happy: 5 }); return b ? `${nm(s, b)} said "I know. I love you." 💕` : 'You wrote it in your diary first.'; }],
    ['Keep it private for now', () => 'You will share it when you are ready.'],
  ],
});
EV('teen_bad_grades_warn', {
  ages: [13, 17], when: (s) => isStudent(s) && eduCur(s).grades < 35, emoji: '📉', text: 'Your teacher pulled you aside. "Your grades are slipping. Badly."',
  choices: [
    ['Get a tutor', (s) => { const cost = price(s, 200); if (A(s) < 18 || pay(s, cost)) { eduCur(s).grades = clamp100(eduCur(s).grades + randInt(6, 14)); return 'The tutor helped a lot.'; } return cantAfford(cost); }],
    ['Promise to try harder', (s) => { eduCur(s).grades = clamp100(eduCur(s).grades + randInt(0, 6)); return 'You meant it this time. Mostly.'; }],
    ['Shrug', (s) => { add(s, { karma: -1 }); return 'Your teacher sighed the sigh of a person who has seen it all.'; }],
  ],
});
EV('teen_hackathon', {
  ages: [13, 22], when: (s) => skill(s, 'coding') >= 15, emoji: '💻', text: 'A local hackathon is offering a prize for the best app.',
  choices: [
    ['Enter', (s) => { addSkill(s, 'coding', randFloat(3, 6)); if (chance(skill(s, 'coding') / 120)) { const amt = price(s, randInt(500, 5000)); add(s, { money: amt, happy: 6 }); return `Your app won! You took home ${fmtMoney(amt)}.`; } return 'You built something cool but did not place.'; }],
    ['Skip it', () => 'Maybe next year.'],
  ],
});
