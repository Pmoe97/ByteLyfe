/* =====================================================================
 * 66-work-decks.js — the first career decks for the cards engine
 * (65-work.js): doctor, surgeon, firefighter, bartender, chef, journalist,
 * pilot and astronaut. Police casework is 64-detective.js; the spy is
 * 60-spy.js. Add a career by defining a deck here, nothing else.
 * W(label, skill, sub, mod, cost): one way to play a decision.
 * ===================================================================== */

const W = (label, sk, sub, mod, cost) => [label, sk, sub || '', mod || 0, cost || 0];
const WORDS = (...w) => w.map((x, i) => [i * 20 + (i === 0 ? 0 : 10), x]); // five steps up the meter

/* ---- doctor and surgeon --------------------------------------------------------- */
const DOCTOR_CARDS = [
  { id: 'er_night', name: 'A night in the ER', emoji: '🚑', w: 1.4, base: 0.5, pay: 600, who: 'patient',
    intro: 'The emergency room is full, and [who] has just been wheeled in.',
    stages: [
      { text: 'Chest pain, a sweat, and no history. What do you do first?', ways: [W('Order the full workup', 'smarts', 'Thorough, and slow'), W('Treat on instinct', 'smarts', 'Fast, and risky', -0.06), W('Pull in a senior colleague', 'charisma', 'Safe, if they come', 0.04)], ok: 'The numbers lined up.', bad: 'The first read was wrong, and the minutes mattered.' },
      { text: 'Twenty minutes later, [first]’s pressure drops.', ways: [W('Stabilize and transfer', 'smarts', 'By the book'), W('Try the aggressive option', 'smarts', 'High risk, high reward', -0.08), W('Call the family in', 'charisma', 'Honest, and hard')], ok: 'It held.', bad: 'It did not hold.' },
    ],
    ok: '[who] walked out of the hospital two days later. Your name is on the chart.', meh: '[who] pulled through, but it was close, and the chart will say so.', bad: '[who] did not do well, and you will think about that night for a long time.',
    fx: { ok: { m: 6, name: 1 }, bad: { m: -9, happy: -5 } } },
  { id: 'puzzle', name: 'A case nobody can name', emoji: '🧩', base: 0.45, who: 'patient', learn: 'npc_habit',
    stages: [{ text: '[who] has had symptoms for a year, and three doctors have shrugged. What do you try?', ways: [W('Order every test there is', 'smarts', 'Expensive and exhaustive'), W('Take the history again, slowly', 'charisma', 'Listen for what they leave out', 0.05), W('Trust a hunch about a rare cause', 'smarts', 'Brilliant or embarrassing', -0.1)] }],
    ok: 'It was something small and strange, and you found it. [first] cried in your office, then told you something they had not told anyone.', meh: 'You narrowed it down, if not all the way. [first] has a plan, at least.', bad: 'Nothing fit. [first] left politely, and you suspect you were the fourth person to say "come back in six months."',
    fx: { ok: { m: 6, name: 1 } } },
  { id: 'bad_news', name: 'Breaking bad news', emoji: '💔', base: 0.5, who: 'patient',
    stages: [{ text: '[who] and the family are waiting. The scan is not good. How do you say it?', ways: [W('Plainly, with the numbers', 'smarts', 'Honest and clear'), W('Gently, with time and tissues', 'charisma', 'Soft and slow', 0.04), W('Let a nurse who knows them sit in', 'charisma', 'Shared, if awkward', 0.02)] }],
    ok: 'It was the hardest ten minutes of your week, and [first] thanked you at the end of it.', meh: 'You said it, and nobody could say whether it was well done.', bad: 'The family left angry, and said you were cold. They might be right.',
    fx: { ok: { m: 5, karma: 2 }, bad: { m: -6, happy: -4 } } },
  { id: 'attending', name: 'The attending disagrees', emoji: '🗣️', min: 0, max: 1, base: 0.5,
    stages: [{ text: 'Your attending wants to discharge a patient you think is sicker than the chart says.', ways: [W('Back down', 'charisma', 'Safe for you', 0.1), W('Make your case with the data', 'smarts', 'Respectful, and firm'), W('Go over their head', 'charisma', 'Fast, and remembered', -0.1)] }],
    ok: 'You were right, and they said so in front of the team.', meh: 'They heard you out and did half of what you asked.', bad: 'You were told to stay in your lane. You might also have been right.',
    fx: { ok: { m: 4, perf: 7 }, bad: { perf: -7 } } },
  { id: 'pharma', name: 'A very generous lunch', emoji: '💊', min: 1, base: 0.7,
    stages: [{ text: 'A pharmaceutical rep offers a paid "speaking engagement" that is mostly a lunch. They would like you to prefer their drug.', ways: [W('Decline politely', 'charisma', 'Clean'), W('Accept, and say nothing', 'streetwise', 'Easy money, and a favor owed', 0.05), W('Report the offer', 'smarts', 'Honest, and awkward')] }],
    ok: 'You turned it down, and your name stayed yours.', meh: 'Nobody noticed either way.', bad: 'Somebody noticed.',
    fx: { ok: { m: 3, name: 1 }, bad: { m: -6, scandal: 6 } },
    after: (s, out, c, st) => { if (out === 'meh') { add(s, { money: price(s, 4000), karma: -3 }); webNewSecret(s, 'crime', s.playerId, { crime: 'bribery', sev: 2, ev: 20 }); } } },
  { id: 'chart_error', name: 'A mistake in the chart', emoji: '📋', min: 1, base: 0.5, risk: 0.8,
    stages: [{ text: 'You notice, a day late, that a dose was written wrong. Nothing has happened. Yet.', ways: [W('Report it at once', 'smarts', 'Honest, and awkward'), W('Fix it quietly', 'streetwise', 'Risky if it comes out', -0.05), W('Tell the patient yourself', 'charisma', 'Brave')] }],
    ok: 'You caught it, owned it, and the hospital made a checklist out of it.', meh: 'It was fine in the end. Your heart is still going.', bad: 'The patient was harmed, and the hospital’s lawyers know your name.',
    fx: { ok: { m: 4, name: 1 }, bad: { m: -10, scandal: 10 } } },
];
const SURGEON_CARDS = DOCTOR_CARDS.concat([
  { id: 'high_risk_op', name: 'A high-risk operation', emoji: '🏥', w: 1.6, base: 0.45, pay: 2500, who: 'patient', risk: 0.5,
    intro: '[who] has one chance, and it is you.',
    stages: [
      { text: 'The incision is made, and the anatomy is not what the scans said.', ways: [W('Proceed as planned', 'smarts', 'Steady'), W('Adapt the approach', 'smarts', 'Skill over rules', -0.06), W('Stop and call for a second surgeon', 'charisma', 'Careful, and slow', 0.05)], ok: 'The change of plan held.', bad: 'It is harder than it looked.' },
      { text: 'Bleeding. More than there should be.', ways: [W('Control it, then continue', 'smarts', 'Calm hands'), W('Pack it and finish later', 'smarts', 'Safe, if you can'), W('Push through', 'fitness', 'Stamina over sense', -0.1)], ok: 'It stopped.', bad: 'It did not stop.' },
      { text: 'The last stitch. Everyone in the room is quiet.', ways: [W('Close carefully', 'smarts', 'Slow'), W('Close fast', 'fitness', 'Hands that know', -0.04), W('Talk the team through it', 'charisma', 'Steady the room', 0.03)], ok: 'Done.', bad: 'Something is not right.' },
    ],
    ok: '[who] woke up asking what time it was. The room cheered, quietly.', meh: '[who] survived, and a long recovery is ahead. The surgery was a success, mostly.', bad: '[who] did not survive. The hospital reviews every death, and so do you.',
    fx: { ok: { m: 8, name: 2, fame: 1 }, bad: { m: -12, scandal: 8, happy: -8 } } },
]);
defWork('doctor', { meter: { name: 'Patient trust', emoji: '🩺', start: 55, words: WORDS('Shaken', 'Questioned', 'Steady', 'Trusted', 'Beloved') }, cards: DOCTOR_CARDS, desk: 'Your patients', fired: 'The board reviewed your record and withdrew your privileges.' });
defWork('surgeon', { meter: { name: 'Patient trust', emoji: '🩺', start: 55, words: WORDS('Shaken', 'Questioned', 'Steady', 'Trusted', 'Beloved') }, cards: SURGEON_CARDS, desk: 'Your patients', fired: 'The board reviewed your record and withdrew your privileges.' });

/* ---- firefighter ------------------------------------------------------------------ */
defWork('firefighter', {
  meter: { name: 'Squad trust', emoji: '🚒', start: 55, words: WORDS('Alone', 'Watched', 'Part of the crew', 'Relied on', 'The one they follow') }, desk: 'The board', fired: 'The captain decided you were a risk to the rest of the crew.',
  cards: [
    { id: 'structure', name: 'A structure fire', emoji: '🔥', w: 1.6, base: 0.5, pay: 400, risk: 2, die: 'a building collapse',
      intro: 'The alarm sounds at 3 a.m. A row house is fully involved.',
      stages: [
        { text: 'You arrive first. Smoke is pouring from every window.', ways: [W('Go in with the line', 'fitness', 'Aggressive'), W('Check for people from the outside', 'smarts', 'Careful', 0.03), W('Wait for the ladder crew', 'charisma', 'Safe, and slow', 0.06)], ok: 'You are in.', bad: 'The smoke is worse than it looked.' },
        { text: 'Inside, the floor above you groans.', ways: [W('Pull back to the stairs', 'smarts', 'Retreat, regroup'), W('Push to the back room', 'fitness', 'Brave', -0.08), W('Radio the captain', 'charisma', 'Ask for eyes', 0.04)], ok: 'Good call.', bad: 'The ceiling is not going to wait.' },
        { text: 'Out on the lawn, the fire is beaten. The crew counts heads.', ways: [W('Check on your team', 'charisma', 'Look after them'), W('Report to the captain', 'smarts', 'Professional'), W('Sit down for a minute', 'fitness', 'You need it')], ok: 'All accounted for.', bad: 'Someone is hurt.' },
      ],
      ok: 'Everyone got out. Someone you will never meet will sleep in their own bed tonight.', meh: 'The house was lost, but everyone got out. The crew bought you a drink.', bad: 'It went badly. You carried someone out who should not have needed carrying.',
      fx: { ok: { m: 7, karma: 2, fame: 1 }, bad: { m: -10, happy: -6 } } },
    { id: 'rescue', name: 'A rescue', emoji: '🏢', w: 1.2, base: 0.5, who: 'survivor', risk: 1,
      stages: [
        { text: '[who] is trapped on a fourth-floor balcony, and the stairs are gone.', ways: [W('Raise the ladder', 'fitness', 'By the book'), W('Climb up from the neighbor’s roof', 'fitness', 'Fast, and risky', -0.08), W('Talk them through waiting', 'charisma', 'Calm the situation', 0.04)] },
      ],
      ok: '[who] came down into your arms and would not let go for a full minute.', meh: '[who] got down, scraped and furious, and alive.', bad: '[who] fell. You were not fast enough, and you know it.',
      fx: { ok: { m: 6, karma: 3 }, bad: { m: -9, happy: -8 } } },
    { id: 'medical', name: 'A medical call', emoji: '🚑', w: 1.4, base: 0.55, who: 'survivor',
      stages: [{ text: '[who] has stopped breathing. You are the closest unit.', ways: [W('Start CPR and keep going', 'fitness', 'Exhausting'), W('Use the defibrillator first', 'smarts', 'Follow the protocol', 0.04), W('Talk the bystander through compressions', 'charisma', 'Share the work')] }],
      ok: '[who] has a pulse. The ambulance took over, and you are still shaking.', meh: 'They got a pulse back, barely, and carried [who] away.', bad: 'You worked for twenty minutes. It was not enough.',
      fx: { ok: { m: 5, karma: 2 }, bad: { m: -4, happy: -5 } } },
    { id: 'wildfire', name: 'The wildfire', emoji: '🌲', min: 2, w: 1.1, base: 0.45, pay: 3000, risk: 2.5, die: 'a wildfire',
      stages: [
        { text: 'The wind has turned, and the fire is heading for a town.', ways: [W('Dig a line and hold it', 'fitness', 'Hard work'), W('Start a backburn', 'smarts', 'Fight fire with fire', -0.05), W('Evacuate the edge of town', 'charisma', 'Save people first', 0.04)], ok: 'It held.', bad: 'The wind does not care.' },
        { text: 'Night. The fire jumps the road.', ways: [W('Retreat to the safe zone', 'smarts', 'Obey the plan'), W('Hold a flank for the crew behind you', 'fitness', 'Brave, and exposed', -0.1), W('Call in an air drop', 'charisma', 'Needs a favor', 0.02)], ok: 'You got through it.', bad: 'It is on top of you.' },
      ],
      ok: 'The town is still there in the morning, and so are you. They give the crew a parade.', meh: 'You lost a few houses and saved the rest.', bad: 'The fire took the ridge, and more than that.',
      fx: { ok: { m: 9, karma: 3, fame: 2 }, bad: { m: -11, happy: -8 } } },
    { id: 'rookie', name: 'A rookie’s mistake', emoji: '🧯', min: 1, base: 0.55,
      stages: [{ text: 'A probationary firefighter left a hose uncoupled and nearly cost the crew. They are mortified.', ways: [W('Take them aside and teach them', 'charisma', 'Patient', 0.04), W('Report it to the captain', 'smarts', 'By the book'), W('Cover for them', 'streetwise', 'Loyal, and risky', -0.05)] }],
      ok: 'They will never forget it, and neither will you. They are going to be good.', meh: 'It is handled. The rookie keeps looking at you.', bad: 'They quit a month later, and said you were the reason.',
      fx: { ok: { m: 4 }, bad: { m: -5 } } },
    { id: 'suspect_fire', name: 'A fire that was not an accident', emoji: '🕵️', min: 1, base: 0.5,
      stages: [{ text: 'You notice what looks like an accelerant pattern at a warehouse. The owner is in the crowd, very calm.', ways: [W('Tell the arson investigator', 'smarts', 'Do the job'), W('Look for evidence yourself', 'streetwise', 'Closer, riskier', -0.05), W('Say nothing and let it go', 'charisma', 'Quiet')] }],
      ok: 'You flagged it, and the investigator ran with it. The owner is not calm any more.', meh: 'It might have been nothing. It might have been something.', bad: 'You said the wrong thing to the wrong person.',
      after: (s, out) => { if (out === 'ok') { webUneaseAdd(s, -1); add(s, { karma: 2 }); } } },
  ],
});

/* ---- bartender ----------------------------------------------------------------------- */
defWork('bartender', {
  meter: { name: 'Regulars', emoji: '🍸', start: 50, words: WORDS('Empty stools', 'A few faces', 'A decent crowd', 'A following', 'The place to be') }, desk: 'Your bar', fired: 'The owner said the place had gone quiet, and so would you.',
  cards: [
    { id: 'rowdy', name: 'A rowdy table', emoji: '🍻', w: 1.5, base: 0.55, risk: 0.8,
      stages: [{ text: 'A group at table six is getting loud, and one of them has started shoving.', ways: [W('Cut them off with a smile', 'charisma', 'Friendly and firm', 0.03), W('Call the bouncer', 'streetwise', 'Safe, and a little cold'), W('Step in yourself', 'martial', 'Risky', -0.08)] }],
      ok: 'The table paid up, tipped, and apologized. The room noticed.', meh: 'It ended without a fight, and with an empty table.', bad: 'Somebody threw something, and it was not a compliment.',
      fx: { ok: { m: 5, perf: 4 }, bad: { m: -6 } } },
    { id: 'confidant', name: 'A regular with something to say', emoji: '🥃', w: 1.4, base: 0.55, who: 'regular', learn: 'npc_debt',
      stages: [{ text: '[who] has been staring at the same drink for an hour. They look like they want to talk.', ways: [W('Pour another and listen', 'charisma', 'Be a good bartender', 0.05), W('Ask them straight out', 'charisma', 'Direct'), W('Leave them alone', 'smarts', 'Respect the space')] }],
      ok: '[who] talked until closing. You were the only one who heard it.', meh: '[first] mumbled something and left a big tip.', bad: '[first] snapped at you and did not come back for a month.',
      fx: { ok: { m: 5, karma: 1 }, bad: { m: -3 } } },
    { id: 'id_check', name: 'A very young face', emoji: '🆔', base: 0.65, risk: 0.5,
      stages: [{ text: 'Someone with a very good fake ID orders a round for the table. Something is off about the birth date.', ways: [W('Refuse and keep the ID', 'smarts', 'By the book'), W('Let it slide', 'streetwise', 'Easy, and a risk', 0.08), W('Ask for a second ID', 'charisma', 'Polite, and thorough')] }],
      ok: 'You were right, and the table went quietly.', meh: 'You let it go. Nothing happened. You did not enjoy your night.', bad: 'An inspector was in the room.',
      fx: { ok: { m: 3, name: 1 }, bad: { m: -8, scandal: 5 } } },
    { id: 'slow_night', name: 'A slow night', emoji: '🌧️', w: 1.2, base: 0.6, pay: 200,
      stages: [{ text: 'It is raining, and the bar is nearly empty.', ways: [W('Work the few you have', 'charisma', 'Make it personal'), W('Invent a drink and put it on the board', 'art', 'Creative'), W('Clean and restock', 'fitness', 'Dull and useful')] }],
      ok: 'The three people in the room stayed till last call, and told friends.', meh: 'It was a night. You made rent.', bad: 'It was an empty room and a long hour.',
      fx: { bad: { m: -2 } } },
    { id: 'big_tipper', name: 'A big spender', emoji: '💵', min: 1, base: 0.5, pay: 1200, who: 'regular',
      stages: [{ text: '[who] is celebrating something large, and wants you to make it memorable.', ways: [W('Make a show of it', 'acting', 'Theatrical'), W('Make the best drink of your life', 'cooking', 'Craft', 0.03), W('Keep it simple and warm', 'charisma', 'Personal')] }],
      ok: '[who] put a very large bill on the bar and told everyone your name.', meh: 'A good tip, and a nice night.', bad: 'The show missed the mark. A modest tip, politely.' },
    { id: 'stranger', name: 'A stranger at closing', emoji: '🌙', min: 1, base: 0.55, risk: 1, who: 'regular',
      stages: [{ text: 'A man you have never seen is waiting by the back door after last call, and he knows your name.', ways: [W('Stay inside and call the owner', 'smarts', 'Careful'), W('Go out with the bouncer', 'streetwise', 'Safe-ish', 0.03), W('Talk to him alone', 'charisma', 'Brave, and a gamble', -0.06)] }],
      ok: 'He wanted to give you a message from an old friend, and a good tip. That was all.', meh: 'He left when the bouncer showed up. You will never know what he wanted.', bad: 'It was not a friendly conversation.',
      fx: { bad: { m: -4, health: -6 } } },
    { id: 'contest', name: 'A cocktail competition', emoji: '🏆', min: 1, w: 0.9, base: 0.45, pay: 3000,
      stages: [{ text: 'The city’s bartending competition is next week. You have a house recipe nobody has tasted.', ways: [W('Enter with your own recipe', 'cooking', 'Original', -0.03), W('Perfect a classic', 'cooking', 'Technique'), W('Make the performance the thing', 'acting', 'Showmanship')] }],
      ok: 'You won. The bar put it on a chalkboard outside.', meh: 'You placed. The owner added a drink to the menu.', bad: 'You froze on stage, and the lime rolled across the floor.',
      fx: { ok: { m: 8, fame: 2 } } },
  ],
});

/* ---- chef -------------------------------------------------------------------------------- */
defWork('chef', {
  meter: { name: 'Kitchen standing', emoji: '👨‍🍳', start: 52, words: WORDS('Dismissed', 'Under review', 'Solid', 'Admired', 'Legendary') }, desk: 'The pass', fired: 'The owner said the kitchen had lost its edge, and that you had too.',
  cards: [
    { id: 'rush', name: 'The dinner rush', emoji: '🍽️', w: 1.7, base: 0.5, pay: 300,
      intro: 'It is Saturday, and the book is full.',
      stages: [
        { text: 'Forty tickets, and the grill cook has just walked out.', ways: [W('Take the grill yourself', 'cooking', 'Work harder'), W('Reshuffle the line', 'charisma', 'Delegate', 0.03), W('Simplify the menu on the fly', 'smarts', 'Cut what you can')], ok: 'The line is moving.', bad: 'The tickets are stacking up.' },
        { text: 'A table sends back a dish, loudly.', ways: [W('Remake it perfectly', 'cooking', 'Craft'), W('Go out and speak to them', 'charisma', 'Personal', 0.03), W('Ignore it and keep the line moving', 'smarts', 'Priorities', -0.05)], ok: 'They are won over.', bad: 'They are on their phones.' },
      ],
      ok: 'You sent out every plate on time, and the room clapped, which almost never happens.', meh: 'You got through it with three comped desserts and a hoarse voice.', bad: 'It was a disaster. A review is being written somewhere.',
      fx: { ok: { m: 6 }, bad: { m: -8, happy: -3 } } },
    { id: 'inspection', name: 'The health inspector', emoji: '🧼', w: 1, base: 0.55,
      stages: [{ text: 'A clipboard and a flashlight arrive in the middle of service, and the walk-in cooler is not as cold as it should be.', ways: [W('Fix it now and tell the truth', 'smarts', 'Honest'), W('Distract the inspector with a tour', 'charisma', 'Charming', -0.04), W('Quietly move the stock', 'streetwise', 'Risky', -0.08)] }],
      ok: 'A clean report, and a note about your clean walk-in.', meh: 'A warning, and a follow-up visit.', bad: 'A closure for forty-eight hours.',
      fx: { ok: { m: 4 }, bad: { m: -9, scandal: 4 } } },
    { id: 'supplier', name: 'A bad delivery', emoji: '🐟', base: 0.5, pay: 0,
      stages: [{ text: 'The fish arrives warm, and the supplier is your owner’s cousin.', ways: [W('Reject it and say so', 'smarts', 'Principled'), W('Use it, and cook it hard', 'cooking', 'Gamble', -0.08), W('Call a rival supplier', 'business', 'Resourceful', 0.02, 200)] }],
      ok: 'You turned a crisis into a special, and nobody got sick.', meh: 'You lost a night of fish and some goodwill.', bad: 'Three tables got sick. It made the news.',
      fx: { bad: { m: -8, scandal: 6 } } },
    { id: 'menu', name: 'A new menu', emoji: '📝', w: 1.1, base: 0.5, pay: 600,
      stages: [{ text: 'The owner gives you a free hand with the autumn menu.', ways: [W('Something bold and personal', 'art', 'Risky', -0.05), W('Seasonal and classic', 'cooking', 'Safe'), W('Ask the regulars what they want', 'charisma', 'Crowd-pleasing', 0.03)] }],
      ok: 'The menu sold out of three dishes in a week, and the owner asked what you wanted for Christmas.', meh: 'A decent menu. Two items were quietly dropped.', bad: 'Half the menu sat in the walk-in.' },
    { id: 'critic', name: 'The critic', emoji: '📰', min: 1, w: 0.9, base: 0.45, pay: 4000,
      stages: [{ text: 'You see him at table nine. The newspaper’s critic, with a book and a tiny smile.', ways: [W('Cook as you always do', 'cooking', 'Honest'), W('Send out something special', 'art', 'Showy', -0.04), W('Go out and greet him', 'charisma', 'Bold', -0.03)] }],
      ok: 'The review was four stars, with your name in it, and the phone rang for a week.', meh: 'Three stars, and a line about "uneven service."', bad: 'Two stars, and a line you will remember forever.',
      fx: { ok: { m: 9, fame: 2 }, bad: { m: -8 } } },
    { id: 'meltdown', name: 'Staff meltdown', emoji: '😤', min: 1, base: 0.5,
      stages: [{ text: 'Two of your cooks are screaming at each other in the walk-in over a stolen knife.', ways: [W('Separate them and listen', 'charisma', 'Fair', 0.03), W('Shout louder', 'martial', 'Old school', -0.06), W('Fire the one who started it', 'streetwise', 'Decisive')] }],
      ok: 'You settled it, and both of them respect you more.', meh: 'It stopped. It will start again.', bad: 'One walked out, and took a friend.',
      fx: { bad: { m: -5 } } },
    { id: 'celeb', name: 'A famous face', emoji: '🌟', min: 2, w: 0.8, base: 0.5, pay: 6000, who: 'client',
      stages: [{ text: '[who] is at the pass, wanting to talk to the person who cooked it.', ways: [W('Be yourself', 'charisma', 'Honest'), W('Offer a private tasting', 'cooking', 'Generous', 0.03), W('Pitch a collaboration', 'business', 'Ambitious', -0.05)] }],
      ok: '[who] posted a photo of the dish, and the reservation line crashed.', meh: '[who] was charming. Nothing came of it.', bad: 'The chat went nowhere, and the dish went cold.',
      fx: { ok: { m: 5, fame: 2 } } },
  ],
});

/* ---- journalist ----------------------------------------------------------------------------- */
defWork('journalist', {
  meter: { name: 'Credibility', emoji: '📰', start: 55, words: WORDS('Discredited', 'Doubted', 'Reliable', 'Respected', 'The byline everyone reads') }, desk: 'Your stories', fired: 'The editor said the paper could no longer stand behind your work.',
  cards: [
    { id: 'tip', name: 'A source calls', emoji: '📞', w: 1.5, base: 0.5, who: 'source', learn: 'npc_crime',
      stages: [
        { text: '[who] says there is something going on at a company, and would like to meet. Not at the office.', ways: [W('Meet them in a quiet café', 'charisma', 'Build trust', 0.04), W('Ask for documents first', 'smarts', 'Proof before talk'), W('Record the call', 'streetwise', 'Useful, and risky', -0.05)], ok: '[first] opens up.', bad: '[first] gets nervous and clams up.' },
        { text: 'The story could be big, and you have until Friday.', ways: [W('Corroborate with a second source', 'smarts', 'Slow and careful'), W('Write it now', 'writing', 'Fast and exposed', -0.06), W('Go to the company for comment', 'charisma', 'Fair, and they will know')], ok: 'It stands up.', bad: 'It is thinner than you thought.' },
      ],
      ok: 'The story ran on the front page. [who] never said a word about who talked.', meh: 'The story ran, shorter than you wanted. It did some good.', bad: 'It fell apart on a fact check, and so did your Friday.',
      fx: { ok: { m: 8, fame: 2, name: 1 }, bad: { m: -10, scandal: 3 } } },
    { id: 'deadline', name: 'A brutal deadline', emoji: '⏰', w: 1.4, base: 0.55, pay: 300,
      stages: [{ text: 'A breaking story, a half-written draft, and an editor who has stopped saying please.', ways: [W('Write it clean and fast', 'writing', 'Craft'), W('Phone it in and polish later', 'smarts', 'Tolerable, and quick', 0.03), W('Pull an all-nighter', 'fitness', 'Quality, at a cost', -0.02)] }],
      ok: 'It was filed with six minutes to spare, and it sang.', meh: 'It ran. You would not pick it for your portfolio.', bad: 'It had a mistake in the second paragraph, and everybody saw it.',
      fx: { ok: { m: 4, perf: 5 }, bad: { m: -8 } } },
    { id: 'presser', name: 'The press conference', emoji: '🎤', w: 1.2, base: 0.5,
      stages: [{ text: 'A very polished official is saying nothing at length. You get one question.', ways: [W('Ask the hard one', 'charisma', 'Brave'), W('Ask the one they cannot dodge', 'smarts', 'Clever', 0.04), W('Save your question for afterward', 'streetwise', 'Patient')] }],
      ok: 'You got a flicker on their face, and a clip that everyone shared.', meh: 'Another non-answer. You got a quote.', bad: 'They answered someone else’s question and waved you off.',
      fx: { ok: { m: 5, fame: 1 } } },
    { id: 'investigation', name: 'The long investigation', emoji: '🗂️', min: 1, w: 1.2, base: 0.42, pay: 2500, who: 'source', learn: 'npc_crime', risk: 0.6,
      intro: 'It is the story you have waited years for.',
      stages: [
        { text: 'Public records, documents, and a stranger’s promise. Where do you start?', ways: [W('Follow the money', 'business', 'Records'), W('Find the people who left', 'charisma', 'Interviews', 0.03), W('Go undercover for a week', 'acting', 'Dangerous', -0.1)], ok: 'A thread to pull.', bad: 'A dead end, and a nervous phone call.' },
        { text: 'You have enough to run, and the company’s lawyers have heard.', ways: [W('Run it on schedule', 'writing', 'Bold'), W('Hold for one more source', 'smarts', 'Careful, and slow'), W('Give them a chance to respond', 'charisma', 'Fair')], ok: 'It holds.', bad: 'They are threatening to sue.' },
        { text: 'Publication day.', ways: [W('Let the story speak', 'writing', 'Clean'), W('Do every interview', 'charisma', 'Loud'), W('Lie low', 'streetwise', 'Quiet')], ok: 'It lands.', bad: 'It goes sideways.' },
      ],
      ok: 'It was the story of the year, and the prize committee called.', meh: 'It ran, and made noise. It did not change anything.', bad: 'Libel claims, a retraction, and a very uncomfortable meeting upstairs.',
      fx: { ok: { m: 11, fame: 4, name: 2 }, bad: { m: -14, scandal: 8 } } },
    { id: 'libel', name: 'A lawyer’s letter', emoji: '⚖️', min: 1, base: 0.5,
      stages: [{ text: 'A very expensive law firm says your last piece was defamatory, and wants a retraction.', ways: [W('Stand by it with your notes', 'smarts', 'Proud'), W('Offer a clarification', 'writing', 'Diplomatic', 0.03), W('Ask the paper’s lawyers', 'business', 'Safe')] }],
      ok: 'Your notes were bulletproof. The letter stopped.', meh: 'A clarification ran on page eleven. Everyone moved on.', bad: 'The paper settled, and you were the reason.',
      fx: { bad: { m: -8, scandal: 4 } } },
    { id: 'leak', name: 'A leak on your desk', emoji: '📎', min: 2, w: 0.9, base: 0.5, risk: 0.5,
      stages: [{ text: 'An envelope arrives with no return address. It is genuine, and it names names.', ways: [W('Verify it every way you can', 'smarts', 'Slow'), W('Publish quickly before someone else does', 'writing', 'Fast', -0.08), W('Give it to a colleague with more experience', 'charisma', 'Shared glory', 0.03)] }],
      ok: 'You verified, you published, and the capital shook.', meh: 'Someone else got there a day earlier, but you had more.', bad: 'It was a plant. Somebody wanted you to print it.',
      fx: { ok: { m: 10, fame: 3 }, bad: { m: -12, scandal: 6 } } },
  ],
});
// A journalist can publish a secret they have heard (62-web.js).
defAction({
  id: 'wk_publish', cat: 'job', label: 'File the story', emoji: '🗞️', desc: 'Print something you know about someone.',
  when: (s) => free(s) && M(s).career && M(s).career.id === 'journalist' && webHeard(s).length > 0 && !count(s, 'publish'),
  sub: (s) => `${nOf(webHeard(s).length, 'secret')} you could print`,
  run: (s) => {
    const choices = webHeard(s).slice(0, 6).map((x) => ({ label: cap(webRumor(s, x)), sub: `Proof ${x.ev >= 55 ? 'strong' : x.ev >= 30 ? 'fair' : 'thin'} · ${nOf(webKnowers(s, x).length, 'person', 'people')} know`, value: x.id }));
    choices.push({ label: 'Never mind', value: null });
    popup(s, { emoji: '🗞️', title: 'File the story', text: 'You have the facts, or most of them. What goes in the paper?', handler: 'wkPublish', choices });
  },
});
onChoice('wkPublish', (s, ctx, sid) => {
  const sec = sid && webOf(s).secrets[sid], p = sec && s.people[sec.subj], st = wkState(s, 'journalist');
  if (!sec || !p || sec.out || !M(s).career || M(s).career.id !== 'journalist') return;
  bump(s, 'publish');
  const solid = sec.ev + webKnowers(s, sec).length * 8;
  if (chance(clamp(0.2 + solid / 100, 0.15, 0.9))) {
    webExpose(s, sec, 'press');
    if (relOf(s, p.id)) setRel(s, p.id, 'enemy', 4);
    st.m = clamp100(st.m + 8);
    M(s).career.perf = clamp100(M(s).career.perf + 8);
    add(s, { fame: 3, karma: -2 });
    return { text: `The story ran, and ${p.first} read it over breakfast. By lunch it was all anyone was talking about.`, tone: 'good' };
  }
  st.m = clamp100(st.m - 15);
  M(s).career.perf = clamp100(M(s).career.perf - 8);
  webRepAdd(P(s), { scandal: 8, name: -8 });
  if (relOf(s, p.id)) setRel(s, p.id, 'enemy', 2);
  return { text: `The facts were thinner than you thought. The paper ran a retraction, and ${p.first}'s lawyer ran a letter.`, tone: 'bad' };
});

/* ---- pilot -------------------------------------------------------------------------------------- */
defWork('pilot', {
  meter: { name: 'Safety record', emoji: '✈️', start: 60, words: WORDS('Grounded', 'Flagged', 'Clean', 'Exemplary', 'The one they ask for') }, desk: 'Your flights', fired: 'The airline pulled you from the schedule after a review of your record.',
  cards: [
    { id: 'weather', name: 'The weather ahead', emoji: '⛈️', w: 1.5, base: 0.55, pay: 200, risk: 1.2, die: 'a plane crash',
      intro: 'A line of storms is sitting right on your route.',
      stages: [
        { text: 'Dispatch says you can make it with a detour. Do you trust them?', ways: [W('Take the detour', 'smarts', 'By the book'), W('Ask for a different altitude', 'driving', 'Savvy', 0.02), W('Hold on the ground', 'charisma', 'Safe, and late', 0.05)], ok: 'The route is clear.', bad: 'The radar disagrees with dispatch.' },
        { text: 'Turbulence, a lot of it. The seatbelt signs are on, and the cabin is nervous.', ways: [W('Reassure the cabin', 'charisma', 'Calm voice'), W('Climb above it', 'driving', 'Skill'), W('Divert to the nearest airport', 'smarts', 'Careful')], ok: 'You came out the other side.', bad: 'It got rough.' },
      ],
      ok: 'The landing was smooth. Three passengers asked your name.', meh: 'You landed late, but everyone is alive and slightly angry.', bad: 'It was a rough landing, and the incident report is long.',
      fx: { ok: { m: 6 }, bad: { m: -10, happy: -4 } } },
    { id: 'fault', name: 'A warning light', emoji: '🚨', w: 1.1, base: 0.5, risk: 2, die: 'a plane crash',
      stages: [
        { text: 'A hydraulic warning, mid-climb.', ways: [W('Run the checklist', 'smarts', 'Calm, by the book'), W('Hand control to the first officer', 'charisma', 'Delegate'), W('Declare an emergency now', 'smarts', 'Cautious', 0.03)], ok: 'The fault is contained.', bad: 'It is getting worse.' },
        { text: 'You are cleared to land, with a damaged system and a crowd of fire trucks waiting.', ways: [W('Land on the long runway', 'driving', 'Careful'), W('Fly it down by hand', 'driving', 'Seat of the pants', -0.06), W('Burn off fuel first', 'smarts', 'Patient')], ok: 'You are on the ground.', bad: 'The touchdown is hard.' },
      ],
      ok: 'You made it look easy, which is the point. The airline put out a statement and a plaque.', meh: 'Everyone walked off the plane. The passengers did not clap, because they were on their phones.', bad: 'It was not pretty, and it was in the news.',
      fx: { ok: { m: 9, fame: 1 }, bad: { m: -14, scandal: 4, happy: -6 } } },
    { id: 'medical', name: 'A passenger collapses', emoji: '🩺', w: 1, base: 0.55, who: 'survivor',
      stages: [{ text: 'Somewhere over the ocean, [who] has collapsed in the aisle. A doctor is on board, but the decision is yours.', ways: [W('Divert at once', 'smarts', 'Safe for them, costly for you'), W('Keep going and radio ahead', 'smarts', 'Gamble', -0.06), W('Ask the doctor for a recommendation', 'charisma', 'Share the call', 0.04)] }],
      ok: '[who] was on a stretcher within minutes of landing, and sent you a card.', meh: 'It was the right call, and a very expensive one.', bad: '[who] did not make it. You made the call you could.',
      fx: { ok: { m: 5, karma: 3 }, bad: { m: -5, happy: -7 } } },
    { id: 'crosswind', name: 'The crosswind', emoji: '💨', w: 1.3, base: 0.55,
      stages: [{ text: 'The airport is gusting forty knots across the runway, and it is the only airport for two hundred miles.', ways: [W('Land it on the numbers', 'driving', 'Steady'), W('Go around and try again', 'smarts', 'Safe'), W('Ask the first officer to fly it', 'charisma', 'Trust them', 0.02)] }],
      ok: 'A little wobble, and a perfect touch. The whole cabin clapped.', meh: 'You went around, and landed the second time. No harm.', bad: 'A hard landing. The airline will inspect the gear.',
      fx: { ok: { m: 4 }, bad: { m: -6 } } },
    { id: 'fatigue', name: 'Too tired to fly', emoji: '😴', min: 1, base: 0.6,
      stages: [{ text: 'You have been up for twenty hours. The schedule says you fly, and so does your pride.', ways: [W('Call in fatigued', 'smarts', 'Responsible, and unpopular'), W('Fly it and drink coffee', 'fitness', 'Dangerous', -0.1), W('Swap with a colleague', 'charisma', 'Quiet favor', 0.03)] }],
      ok: 'You made the right call. The crew chief thanked you, privately.', meh: 'It worked out, and it cost you a favor.', bad: 'You got through it, and you will never do it again.',
      fx: { ok: { m: 4, name: 1 }, bad: { m: -8 } } },
    { id: 'near_miss', name: 'A near miss', emoji: '😰', min: 2, w: 0.9, base: 0.5, risk: 1.5, die: 'a mid-air collision',
      stages: [{ text: 'A warning from the collision system, and another aircraft closing fast.', ways: [W('Follow the system', 'smarts', 'Trust the machine'), W('Take manual control', 'driving', 'Instinct', -0.06), W('Call the tower', 'charisma', 'Shared')] }],
      ok: 'The other aircraft passed below you with a thousand feet to spare. Your hands shook for an hour.', meh: 'Close enough to remember, far enough to survive.', bad: 'Too close. The investigation lasted a year.',
      fx: { ok: { m: 5 }, bad: { m: -12, happy: -8 } } },
  ],
});

/* ---- astronaut --------------------------------------------------------------------------------------- */
const astroTrain = (id, name, emoji, text, ways, ok, bad) => ({ id, name, emoji, max: 0, w: 1.3, base: 0.5, stages: [{ text, ways }], ok, meh: 'You got through it. The instructor made a note.', bad,
  fx: { ok: { m: 7 }, bad: { m: -6 } }, after: (s, out, c, st) => { if (out !== 'bad') st.flags.cert = (st.flags.cert || 0) + 1; } });
defWork('astronaut', {
  meter: { name: 'Mission readiness', emoji: '🚀', start: 55, words: WORDS('Not ready', 'In training', 'Mission ready', 'A safe pair of hands', 'The one they call first') }, desk: 'Your schedule', fired: 'The agency decided you were not going to fly, and released you from the corps.',
  deal: (lvl) => (lvl === 0 ? 2 : 2),
  // Candidates need three training certifications; every promotion after that is earned in orbit.
  gate: (s, c, st) => (c.level === 0 ? (st.flags.cert || 0) >= 3 : (st.flags.flights || 0) >= 2 * c.level),
  cards: [
    astroTrain('centrifuge', 'The centrifuge', '🌀', 'Eight g, and an instructor asking you to read numbers off a screen.', [W('Strain and breathe', 'fitness', 'Pure grit'), W('Tense in the right places', 'smarts', 'Technique'), W('Think about something else', 'charisma', 'Mind over g', -0.04)], 'You read every number and never blacked out. They are impressed.', 'You blacked out at six g. They say it is common.'),
    astroTrain('buoyancy', 'The neutral buoyancy pool', '🤿', 'Six hours underwater in a suit, repairing a mock station module.', [W('Follow the checklist exactly', 'smarts', 'Careful'), W('Work fast and efficiently', 'fitness', 'Strong', 0.02), W('Coordinate with the diver', 'charisma', 'Teamwork')], 'You finished early, and the diver said you were the calmest candidate in the class.', 'You dropped a tool, and spent forty minutes watching it fall.'),
    astroTrain('survival', 'Survival school', '🏕️', 'Three days in a wilderness with a crew of strangers and a parachute shroud.', [W('Lead the team', 'charisma', 'Lead'), W('Find the way out', 'smarts', 'Navigate'), W('Carry everything', 'fitness', 'Brute strength')], 'Your crew built a shelter, a fire, and a friendship.', 'You got lost, and the instructor had to come and get you.'),
    astroTrain('simfail', 'The simulator fails you', '🖥️', 'The simulator puts you through six emergencies in a row, and the instructor says it is a warm-up.', [W('Follow the procedure by heart', 'smarts', 'Study'), W('Improvise', 'coding', 'Flexible', -0.04), W('Rely on your crewmate', 'charisma', 'Shared', 0.02)], 'The instructor wrote "no concerns" on your report, which has never happened.', 'The sim ended with everyone dead. It happens to everyone once.'),
    { id: 'mission', name: 'Your mission', emoji: '🚀', min: 1, w: 3, base: 0.5, pay: 15000, risk: 3, die: 'a spaceflight accident',
      when: (s, c, st) => s.year - (st.flags.lastFlight || 0) >= 2,
      intro: 'It is launch day. You have been training for this for three years.',
      stages: [
        { text: 'Countdown. The rocket is shaking, and the vibration is climbing.', ways: [W('Stay calm and monitor', 'smarts', 'Disciplined'), W('Talk to the crew', 'charisma', 'Steady the team'), W('Brace and breathe', 'fitness', 'Physical')], ok: 'You reached orbit.', bad: 'An engine anomaly. The abort window is closing.' },
        { text: 'In orbit. The station is ahead, and the docking system is not responding.', ways: [W('Dock manually', 'driving', 'Skill', -0.05), W('Work the problem with mission control', 'smarts', 'Careful'), W('Reboot and try again', 'coding', 'Technical')], ok: 'Docked.', bad: 'The approach is off, and fuel is limited.' },
        { text: 'A spacewalk to repair a damaged antenna. The tether is the only thing that matters.', ways: [W('Move slowly and double-check', 'smarts', 'Careful'), W('Work fast, you have an oxygen limit', 'fitness', 'Risky', -0.06), W('Go out with your crewmate', 'charisma', 'Safer together', 0.03)], ok: 'Repaired.', bad: 'Something went wrong out there.' },
        { text: 'Re-entry. You are dropping through the atmosphere in a ball of fire.', ways: [W('Trust the automation', 'smarts', 'Reliable'), W('Fly the manual backup', 'driving', 'Dangerous', -0.08), W('Talk to mission control', 'charisma', 'Reassurance')], ok: 'Splashdown.', bad: 'The capsule is spinning.' },
      ],
      ok: 'You came home to a parade. Your family watched the whole thing, and the first thing you did was ask for a sandwich.', meh: 'It was not the flight anyone had planned, but the whole crew came home.', bad: 'It was a hard return, and a harder inquiry. Nobody will talk about it for a year.',
      fx: { ok: { m: 10, fame: 8, name: 3, happy: 8 }, meh: { m: 3, fame: 3 }, bad: { m: -14, happy: -8 } },
      after: (s, out, c, st) => { if (out !== 'bad') { st.flags.flights = (st.flags.flights || 0) + 1; tally(s, 'spaceflights'); } st.flags.lastFlight = s.year; } },
    { id: 'anomaly', name: 'An anomaly on the station', emoji: '⚠️', min: 1, w: 1, base: 0.5, risk: 2, die: 'a spaceflight accident',
      stages: [
        { text: 'A pressure alarm sounds at 2 a.m. station time. A small leak.', ways: [W('Find it and seal it', 'smarts', 'Methodical'), W('Evacuate to the lifeboat', 'charisma', 'Careful, and costly'), W('Wake the crew and work together', 'charisma', 'Teamwork', 0.03)], ok: 'Found it.', bad: 'The pressure is still dropping.' },
        { text: 'Mission control is on the line, and they have a plan that you disagree with.', ways: [W('Follow the plan', 'smarts', 'Disciplined'), W('Propose your own', 'coding', 'Argue it', -0.06), W('Compromise', 'charisma', 'Diplomatic')], ok: 'It worked.', bad: 'It did not.' },
      ],
      ok: 'The leak was sealed, the crew was calm, and the report called it a model response.', meh: 'You lost a day, an experiment, and a lot of sleep.', bad: 'You lost an experiment, a module panel and a lot of trust.',
      fx: { ok: { m: 8, name: 2 }, bad: { m: -10 } } },
    { id: 'tour', name: 'The press tour', emoji: '🎙️', min: 1, w: 1, base: 0.55, pay: 4000,
      stages: [{ text: 'The agency sends you on a tour of schools and talk shows. A child asks if you were scared.', ways: [W('Tell the truth', 'charisma', 'Honest'), W('Tell a good story', 'acting', 'Entertaining'), W('Say nothing is scary when you are prepared', 'smarts', 'Polished')] }],
      ok: 'A video of your answer went around the world. Teachers wrote to you for a year.', meh: 'The tour was a success, and a blur.', bad: 'You said something on live TV that you still wince at.',
      fx: { ok: { m: 4, fame: 4, name: 2 } } },
    { id: 'crew', name: 'Crew conflict', emoji: '👨‍🚀', min: 1, w: 0.9, base: 0.5,
      stages: [{ text: 'Four months in a tube, and two of the crew have stopped speaking to each other. They are both your friends.', ways: [W('Talk to each of them alone', 'charisma', 'Patient'), W('Call a crew meeting', 'smarts', 'Direct'), W('Let it run its course', 'fitness', 'Wait it out', -0.05)] }],
      ok: 'By the end of the flight they were sharing jokes, and one of them was crying at the departure.', meh: 'They stayed civil. That was enough.', bad: 'They never made up. Neither will talk to you, now.',
      fx: { ok: { m: 5, karma: 2 }, bad: { m: -6 } } },
    { id: 'command', name: 'A command decision', emoji: '🎖️', min: 2, w: 1.4, base: 0.45, risk: 2, die: 'a spaceflight accident',
      stages: [
        { text: 'A crewmate is ill, and the return window is closing. Mission control wants a decision from you, now.', ways: [W('Abort and come home', 'smarts', 'Safe, and expensive'), W('Continue the mission', 'charisma', 'Brave, or foolish', -0.06), W('Treat them on board', 'smarts', 'Risky, and personal')], ok: 'It was the right call.', bad: 'It was the wrong one.' },
      ],
      ok: 'Your crew came home. The review said you did the right thing at the right time.', meh: 'It worked out, mostly. There were costs.', bad: 'It went badly. You will carry it for the rest of your life.',
      fx: { ok: { m: 10, fame: 4, name: 3 }, bad: { m: -14, happy: -10, scandal: 6 } } },
  ],
});

wkRegister();
