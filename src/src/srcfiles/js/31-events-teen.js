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
  if (chance(P(s).stats.looks / 400 + (eduCur(s) && eduCur(s).clique === 'populars' ? 0.15 : 0) + (schoolCur(s) ? schoolCur(s).pop / 400 : 0))) { add(s, { happy: 6 }); tally(s, 'promRoyalty'); return line + ` You were crowned prom ${genderWord(P(s), 'king', 'queen', 'royalty')}! 👑`; }
  return line;
}
EV('teen_sneak', {
  ages: [13, 17], emoji: '🌙', text: 'Your friends are going to a party tonight, but you have a curfew.',
  choices: [
    ['Sneak out', (s) => { add(s, { happy: 5 }); if (chance(0.35)) { relAll(s, ['parent'], -10); groundFor(s, 'sneaking out', true); return 'You climbed back in through the window. Your mom was sitting on your bed.'; } return 'You snuck out, partied, and made it home undetected.'; }],
    ['Ask permission', (s) => { if (parentsAgree(s)) { add(s, { happy: 4 }); return 'Your parents said yes, but you had to be home by midnight.'; } return 'They said no.'; }],
    ['Stay in', () => 'You stayed home.'],
  ],
});
EV('teen_exam', {
  ages: [13, 25], when: (s) => inSchool(s), emoji: '📄', text: 'You have a huge exam tomorrow. A classmate is selling the answers.',
  choices: [
    ['Buy the answers', (s) => { const cost = price(s, 40); add(s, { money: -cost, karma: -3 }); if (chance(0.25)) { eduCur(s).grades = clamp100(eduCur(s).grades - 15); schoolTrouble(s, 'detention', 'buying test answers'); return 'The teacher caught on. You got a zero and detention.'; } eduCur(s).grades = clamp100(eduCur(s).grades + 8); return 'You aced it. You feel a little gross about it.'; }],
    ['Pull an all-nighter', (s) => { eduCur(s).grades = clamp100(eduCur(s).grades + randInt(2, 7)); add(s, { health: -1, smarts: 1 }); return 'You studied until sunrise. Exhausting, but it paid off.'; }],
    ['Wing it', (s) => { if (chance(P(s).stats.smarts / 120)) return 'You winged it and somehow passed.'; eduCur(s).grades = clamp100(eduCur(s).grades - 6); return 'You winged it. It did not go well.'; }],
  ],
});
EV('teen_photo', {
  era: 'social',
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
EV('teen_viral', { era: 'social', ages: [13, 25], w: 0.3, emoji: '📱', text: () => `A video of you ${pick(['tripping into a fountain', 'singing in the shower', 'dancing at a wedding', 'getting chased by a goose', 'nailing a backflip'])} went viral.`, auto: (s) => { add(s, { fame: 2, happy: chance(0.5) ? 4 : -4 }); if (M(s).socials) M(s).socials.followers += randInt(500, 20000); return 'Everyone at school has seen it.'; } });
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
  era: 'web',
  ages: [13, 22], when: (s) => skill(s, 'coding') >= 15, emoji: '💻', text: 'A local hackathon is offering a prize for the best app.',
  choices: [
    ['Enter', (s) => { addSkill(s, 'coding', randFloat(3, 6)); if (chance(skill(s, 'coding') / 120)) { const amt = price(s, randInt(500, 5000)); add(s, { money: amt, happy: 6 }); return `Your app won! You took home ${fmtMoney(amt)}.`; } return 'You built something cool but did not place.'; }],
    ['Skip it', () => 'Maybe next year.'],
  ],
});

/* ---- more story: teens (13-17) --------------------------------------------- */
EV('teen_debate', {
  ages: [13, 17], emoji: '🎙️', when: isStudent, text: 'The debate team needs one more member for the regional tournament.',
  choices: [
    ['Join and argue everything', (s) => { addSkill(s, 'charisma', 4); add(s, { smarts: 2 }); if (chance(0.3)) { add(s, { happy: 6 }); return 'Your team took first place. You will not stop bringing it up.'; } return 'You lost in the semifinals, but you now win every argument at dinner.'; }],
    ['No thanks', () => 'You would rather argue for free, at home.'],
  ],
});
EV('teen_yearbook', { ages: [16, 18], once: true, emoji: '📔', when: isStudent, text: 'The yearbook superlatives are out.', auto: (s) => { add(s, { happy: 3 }); const p = P(s).stats; return `You were voted "${p.looks >= 75 ? 'Best Smile' : p.smarts >= 75 ? 'Most Likely to Succeed' : skill(s, 'acting') >= 30 ? 'Most Dramatic' : M(s).karma >= 70 ? 'Nicest Person' : pick(['Most Likely to Be Late to Their Own Wedding', 'Best Laugh', 'Class Clown', 'Most Likely to Become Famous'])}."`; } });
EV('teen_volunteer', {
  ages: [14, 17], emoji: '🏥', text: 'The local hospital is looking for teen volunteers this summer.',
  choices: [
    ['Sign up', (s) => { add(s, { karma: 4, smarts: 1 }); return 'You delivered flowers, read to patients and learned where every vending machine is.'; }],
    ['Spend the summer at the pool', (s) => { add(s, { happy: 4 }); return 'You got a great tan and a mild sunburn.'; }],
  ],
});
EV('teen_skate', {
  ages: [12, 17], emoji: '🛹', text: 'Your friends are learning skateboard tricks at the skate park.',
  choices: [
    ['Try a kickflip', (s) => { addSkill(s, 'athletics', 2); if (chance(0.25)) { getSick(s, chance(0.5) ? 'broken_arm' : 'concussion'); return 'You landed on your face. Then the hospital.'; } add(s, { happy: 5 }); return 'You landed it on the forty-third try. Everyone filmed it.'; }],
    ['Film them instead', (s) => { addSkill(s, 'art', 2); return 'Your skate video got 2,000 views. You are basically a director.'; }],
  ],
});
EV('teen_hair_dye', {
  ages: [13, 17], emoji: '💇', text: () => `You really want to dye your hair ${pick(['electric blue', 'bright pink', 'platinum', 'green', 'purple'])}.`,
  choices: [
    ['Do it yourself in the bathroom', (s) => { add(s, { happy: 4 }); relAll(s, ['parent'], -3); return chance(0.4) ? 'It came out patchy. The bathtub is permanently stained.' : 'It looks amazing. Your parents need time.'; }],
    ['Ask your parents first', (s) => { if (parentsAgree(s)) { add(s, { happy: 5, looks: 1 }); return 'They said yes and paid for a salon. Who are these people?'; } return 'They said "absolutely not" before you finished the sentence.'; }],
  ],
});
EV('teen_group_project', {
  ages: [13, 22], emoji: '📊', when: inSchool, text: 'Your group project is due tomorrow. Nobody else in the group has done anything.',
  choices: [
    ['Do the whole thing yourself', (s) => { add(s, { smarts: 2, happy: -4 }); const cur = eduCur(s); if (cur) cur.grades = clamp100(cur.grades + 3); return 'You got an A. Everyone else got an A too. Life is unfair.'; }],
    ['Tell the teacher', (s) => { relAll(s, ['classmate'], -4); return 'You got your grade. Your group stopped talking to you.'; }],
    ['Do your part and hope', (s) => { const cur = eduCur(s); if (cur) cur.grades = clamp100(cur.grades - 4); return 'The presentation was mostly silence and one slide.'; }],
  ],
});
EV('teen_group_chat', {
  era: 'mobile',
  ages: [12, 19], emoji: '💬', text: 'Your friend group chat is exploding. Two of your friends are fighting, and both want you on their side.',
  choices: [
    ['Stay neutral', (s) => { add(s, { karma: 1 }); return 'You sent one sticker of a cat with sunglasses. It defused nothing.'; }],
    ['Pick a side', (s) => { const p = pickRel(s, K_FRIENDS); if (p) addRel(s, p, -10); return 'You picked a side. The other side noticed.'; }],
    ['Mute the chat', (s) => { add(s, { happy: 2 }); return 'Peace. Wonderful peace.'; }],
  ],
});
EV('teen_essay_contest', {
  ages: [15, 18], emoji: '✍️', when: isStudent, text: 'A local business is offering a scholarship for the best essay about your future.',
  choices: [
    ['Write your heart out', (s) => { addSkill(s, 'writing', 4); if (skill(s, 'writing') + P(s).stats.smarts / 2 + randInt(0, 40) > 70) { const amt = price(s, 2000); M(s).trust = (M(s).trust || 0) + amt; add(s, { happy: 8 }); return `You won a ${fmtMoney(amt)} scholarship! It is waiting for you when you turn 18.`; } return 'You got an honorable mention and a nice letter.'; }],
    ['Too much homework already', () => 'You will write your future later.'],
  ],
});
EV('teen_babysit', {
  ages: [13, 17], emoji: '🍼', text: 'A neighbor asks if you can babysit their two kids on Saturday night.',
  choices: [
    ['Take the job', (s) => { const amt = price(s, randInt(30, 80)); add(s, { money: amt }); return chance(0.3) ? `The kids put a whole roll of toilet paper in the bath. You earned every cent of ${fmtMoney(amt)}.` : `They were angels. Easy ${fmtMoney(amt)}.`; }],
    ['Say you are busy', () => 'You were not busy.'],
  ],
});
EV('teen_screen_time', {
  era: 'smartphone',
  ages: [12, 19], emoji: '📱', text: 'Your phone says you averaged nine hours of screen time a day this week.',
  choices: [
    ['Delete the worst apps', (s) => { add(s, { smarts: 1, happy: 2 }); return 'You read an actual book. Then you reinstalled everything.'; }],
    ['Turn off the screen-time report', (s) => { add(s, { happy: -1 }); return 'Problem solved, technically.'; }],
  ],
});
EV('teen_mentor', {
  ages: [14, 18], emoji: '🍎', when: isStudent, text: 'A teacher says you have real potential and offers to mentor you after school.',
  choices: [
    ['Take them up on it', (s) => { add(s, { smarts: 3, happy: 2 }); const cur = eduCur(s); if (cur) cur.grades = clamp100(cur.grades + 6); return 'Every Tuesday, extra reading and long talks. Your grades climbed.'; }],
    ['Politely decline', () => 'You have a reputation to keep.'],
  ],
});
EV('teen_run_away', {
  ages: [13, 17], w: 0.5, emoji: '🎒', when: (s) => relPeople(s, ['parent']).length > 0, text: 'After a huge fight at home, you are thinking about running away.',
  choices: [
    ["Spend the night at a friend's house", (s) => { relAll(s, ['parent'], -6); add(s, { happy: -2 }); return 'Your parents called every house in town. The talk the next morning was long.'; }],
    ['Cool off and talk it out', (s) => { relAll(s, ['parent'], 5); add(s, { karma: 1 }); return 'It was awkward. Then it was okay.'; }],
  ],
});
EV('teen_test', {
  ages: [15, 18], once: true, emoji: '📝', when: isStudent, text: 'The big college entrance exam is next month.',
  choices: [
    ['Study every night', (s) => { add(s, { smarts: 2, happy: -2 }); return takeExam(s, 6); }],
    ['Take a prep course', (s) => { examRec(s).prep = Math.min(2, examRec(s).prep + 1); add(s, { smarts: 1 }); const r = takeExam(s, 0); r.text = 'Expensive, boring, effective. ' + r.text; return r; }],
    ['Wing it', (s) => takeExam(s, -4)],
  ],
});
EV('teen_robotics', {
  ages: [13, 18], emoji: '🤖', when: isStudent, text: 'The robotics club is building a robot for the state competition.',
  choices: [
    ['Join the build team', (s) => { addSkill(s, 'coding', 4); add(s, { smarts: 2 }); return chance(0.3) ? 'Your robot won the state title by knocking the other robot off the table.' : 'Your robot drove in a circle for two minutes. Still proud.'; }],
    ['Not your thing', () => 'You will let the robots win without you.'],
  ],
});
EV('teen_thrift', { ages: [13, 25], emoji: '🧥', text: 'You found a vintage jacket at a thrift store for almost nothing.', auto: (s) => { add(s, { looks: 1, happy: 3 }); return 'People keep asking where you got it. You say "oh, this old thing."'; } });
EV('teen_class_clown', {
  ages: [12, 17], emoji: '🤡', when: isStudent, text: 'The teacher turns to write on the board. The perfect moment for a joke.',
  choices: [
    ['Crack the joke', (s) => { add(s, { happy: 4 }); relAll(s, ['classmate'], 3); if (chance(0.35)) { const cur = eduCur(s); if (cur) cur.grades = clamp100(cur.grades - 2); schoolTrouble(s, 'detention', 'clowning around in class'); addPop(s, 2); return 'The whole class laughed. You got detention. Worth it.'; } return 'The whole class laughed, even the teacher.'; }],
    ['Save it for lunch', () => 'Comedy is all about timing.'],
  ],
});
EV('teen_bestie_fight', {
  ages: [12, 19], emoji: '💔', ctx: (s) => someone(s, ['bestie']),
  text: (s, c) => `You and ${nm(s, c.pid)} got into your worst fight ever.`,
  choices: [
    ['Apologize first', (s, c) => { addRel(s, c.pid, 12); add(s, { karma: 1 }); return `${nm(s, c.pid)} apologized right back. You both cried. Friends again.`; }],
    ['Wait for them to apologize', (s, c) => { addRel(s, c.pid, -10); return 'Three weeks of silence. It is so awkward at lunch.'; }],
  ],
});
EV('teen_concert_trip', {
  ages: [14, 17], emoji: '🎤', text: 'Your favorite band is playing a city three hours away on a school night.',
  choices: [
    ['Ask your parents', (s) => { if (parentsAgree(s)) { add(s, { happy: 10 }); return 'They said yes, as long as they could drive you. Totally worth it.'; } add(s, { happy: -3 }); return 'They said no. You listened to the album very loudly in your room.'; }],
    ['Sneak out and go', (s) => { add(s, { happy: 8 }); if (chance(0.5)) { relAll(s, ['parent'], -10); return 'Best night of your life, until you got home. Grounded for a month.'; } return 'Best night of your life. Your parents never found out.'; }],
  ],
});

/* ---- more story: college (in university or grad school) --------------------------- */
const inCollege = (s) => inSchool(s) && ['college', 'grad'].includes(eduCur(s).kind);
EV('col_roommate', {
  ages: [17, 30], once: true, emoji: '🛏️', when: inCollege, text: () => `Your new roommate ${pick(['keeps a pet snake in the closet', 'wakes up at 4 a.m. to do yoga', 'only eats cereal', 'talks in their sleep about spreadsheets', 'has never done laundry'])}.`,
  choices: [
    ['Make it work', (s) => { const p = meetSomeone(s, 'friend', 55); return { text: `You and ${p.first} figured it out. You're actually friends now.`, person: p.id }; }],
    ['Request a room change', (s) => { add(s, { happy: 2 }); return 'Your new roommate is normal. Disappointingly normal.'; }],
  ],
});
EV('col_all_nighter', {
  ages: [17, 30], emoji: '☕', when: inCollege, text: 'Finals start tomorrow, and you have not opened the textbook.',
  choices: [
    ['Pull an all-nighter', (s) => { const cur = eduCur(s); add(s, { health: -2, smarts: 1 }); if (cur) cur.grades = clamp100(cur.grades + randInt(-2, 6)); return 'Six coffees and a sunrise. You remember about half of it.'; }],
    ['Sleep and hope for the best', (s) => { const cur = eduCur(s); if (cur) cur.grades = clamp100(cur.grades + randInt(-6, 2)); add(s, { health: 1 }); return 'Well rested and very confused by question four.'; }],
  ],
});
EV('col_party', {
  ages: [17, 28], emoji: '🎉', when: inCollege, text: 'A legendary campus party is happening tonight.',
  choices: [
    ['Go all out', (s) => { add(s, { happy: 6 }); if (A(s) >= country(s).drink) habit(s, 'alcohol', 4); if (chance(0.2)) { const p = meetSomeone(s, 'friend', 60); return { text: `You met ${p.first} on the dance floor. Best friends by sunrise.`, person: p.id }; } return 'You do not remember the end, but people keep thanking you for it.'; }],
    ['Stop by, then leave early', (s) => { add(s, { happy: 3 }); return 'Two hours, one slice of pizza, a good night.'; }],
    ['Stay in and study', (s) => { add(s, { smarts: 1 }); return 'The library was empty. It was glorious.'; }],
  ],
});
EV('col_abroad', {
  ages: [18, 26], once: true, emoji: '🌍', when: (s) => inCollege(s) && eduCur(s).kind === 'college', text: 'You could spend a semester studying abroad.',
  choices: [
    { label: 'Go for it', sub: (s) => fmtMoney(price(s, 6000)), fx: (s) => { const c = price(s, 6000); if (!pay(s, c)) return cantAfford(c); tally(s, 'vacations'); add(s, { happy: 10, smarts: 2 }); const cc = pick(COUNTRY_IDS.filter((x) => x !== P(s).country)); return `Four months in ${COUNTRIES[cc].name}. You came home with a new language, sort of.`; } },
    ['Stay on campus', () => 'Maybe for grad school.'],
  ],
});
EV('col_research', {
  ages: [19, 30], emoji: '🔬', when: (s) => inCollege(s) && P(s).stats.smarts >= 60, text: 'A professor invites you to be a research assistant in their lab.',
  choices: [
    ['Accept', (s) => { add(s, { smarts: 4 }); const cur = eduCur(s); if (cur) cur.grades = clamp100(cur.grades + 4); return chance(0.2) ? 'Your name ended up on a published paper. Third author, but still.' : 'You washed a lot of beakers and learned a lot of science.'; }],
    ['You need your free time', () => 'The professor said the offer stands.'],
  ],
});
EV('col_ramen', { ages: [18, 28], emoji: '🍜', when: (s) => inCollege(s) && M(s).money < price(s, 2000), text: 'You have eaten instant ramen for every meal this week.', auto: (s) => { add(s, { health: -2 }); addSkill(s, 'cooking', 1); return 'You invented a ramen omelet. It is not good.'; } });
EV('col_club', {
  ages: [17, 26], emoji: '🎪', when: inCollege, text: 'It is the student club fair.',
  choices: [
    ['Join the outdoors club', (s) => { addSkill(s, 'fitness', 3); const p = meetSomeone(s, 'friend', 55); return { text: `Weekend hikes with ${p.first} and a lot of granola.`, person: p.id }; }],
    ['Join the improv troupe', (s) => { addSkill(s, 'acting', 4); add(s, { happy: 3 }); return 'Yes, and...'; }],
    ['Join the investment club', (s) => { addSkill(s, 'business', 4); return 'You pretend-traded a pretend-fortune.'; }],
    ['Just take the free stuff', (s) => { add(s, { happy: 2 }); return 'Seven pens, four T-shirts and a stress ball shaped like a brain.'; }],
  ],
});
EV('col_spring_break', {
  ages: [18, 26], emoji: '🌴', when: inCollege, text: 'Your friends are planning a spring break trip.',
  choices: [
    { label: 'Go to the beach', sub: (s) => fmtMoney(price(s, 900)), fx: (s) => { const c = price(s, 900); if (!pay(s, c)) return cantAfford(c); tally(s, 'vacations'); add(s, { happy: 9 }); if (chance(0.3)) getSick(s, 'sunburn'); return 'A week of sun, sand and questionable decisions.'; } },
    ['Go home and see family', (s) => { relAll(s, ['parent', 'sibling'], 6); return 'Home cooking and your old bed. Underrated.'; }],
    ['Stay and catch up on work', (s) => { const cur = eduCur(s); if (cur) cur.grades = clamp100(cur.grades + 4); return 'An empty campus is very productive.'; }],
  ],
});
EV('col_internship', {
  ages: [19, 30], emoji: '💼', when: inCollege, text: 'You landed an interview for a summer internship.',
  choices: [
    ['Take the internship', (s) => { const pay0 = price(s, randInt(2, 9) * 1000); add(s, { money: pay0, smarts: 1 }); addSkill(s, 'business', 3); return chance(0.3) ? `They paid ${fmtMoney(pay0)} and offered you a job after graduation.` : `You made coffee, learned a lot and earned ${fmtMoney(pay0)}.`; }],
    ['Spend the summer traveling', (s) => { add(s, { happy: 7 }); tally(s, 'vacations'); return 'You saw five countries on a shoestring.'; }],
  ],
});
EV('col_plagiarism', {
  ages: [17, 30], emoji: '📄', when: inCollege, text: 'A friend begs to copy your essay for the same class.',
  choices: [
    ['Let them', (s) => { add(s, { karma: -2 }); if (chance(0.3)) { const cur = eduCur(s); if (cur) { cur.grades = clamp100(cur.grades - 15); cur.probation = true; } return { text: 'The plagiarism software caught you both. Academic probation.', tone: 'bad' }; } return 'Nobody noticed. You feel weird about it anyway.'; }],
    ['Help them write their own', (s) => { add(s, { karma: 2, smarts: 1 }); relAll(s, K_FRIENDS, 2); return 'It took all night. Their essay was better than yours.'; }],
    ['Say no', () => 'They were annoyed for a day.'],
  ],
});
EV('col_student_gov', {
  ages: [18, 26], emoji: '🗳️', when: inCollege, text: 'Student government elections are coming up.',
  choices: [
    ['Run for student president', (s) => { addSkill(s, 'charisma', 4); if (chance(0.3 + skill(s, 'charisma') / 200)) { add(s, { happy: 8, fame: 1 }); return 'You won! Your first act was free coffee during finals.'; } return 'You lost to a guy whose whole platform was a petting zoo.'; }],
    ['Vote and move on', () => 'Democracy in action.'],
  ],
});
EV('col_tuition_hike', { ages: [18, 30], emoji: '💸', when: (s) => inCollege(s) && eduCur(s).cost > 0, text: 'The university announced a tuition increase.', auto: (s) => { const cur = eduCur(s); cur.cost = Math.round(cur.cost * 1.08); add(s, { happy: -3 }); return `Tuition is now ${fmtMoney(cur.cost)} a year. There was a protest on the quad.`; } });
