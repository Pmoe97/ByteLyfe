/* =====================================================================
 * 02-data-people.js — traits, skills, kinship labels, cliques.
 * Pure data.
 * ===================================================================== */

// Personality traits. Each character gets 1-3. Code checks them with hasTrait().
const TRAITS = {
  athletic: { name: 'Athletic', emoji: '🏃', desc: 'Builds fitness faster and stays healthier.' },
  bookworm: { name: 'Bookworm', emoji: '📚', desc: 'Learns faster. Smarts grow more easily.' },
  charming: { name: 'Charming', emoji: '😏', desc: 'People warm up fast. Better at dates and interviews.' },
  creative: { name: 'Creative', emoji: '🎨', desc: 'Art, music, writing and acting come naturally.' },
  ambitious: { name: 'Ambitious', emoji: '📈', desc: 'Promoted faster, but restless without a goal.' },
  lazy: { name: 'Laid-back', emoji: '🛋️', desc: 'Happier day to day, slower at work and school.' },
  lucky: { name: 'Lucky', emoji: '🍀', desc: 'Fortune smiles: gambling, lotteries and close calls.' },
  frugal: { name: 'Frugal', emoji: '🏷️', desc: 'Living costs are lower.' },
  kind: { name: 'Kind-hearted', emoji: '💛', desc: 'Good deeds feel better and build karma faster.' },
  hotheaded: { name: 'Hot-headed', emoji: '🔥', desc: 'Wins more fights. Starts more of them, too.' },
  cunning: { name: 'Cunning', emoji: '🦊', desc: 'Better at crime and at getting away with it.' },
  anxious: { name: 'Anxious', emoji: '😰', desc: 'Lower happiness, but careful: fewer accidents.' },
  sickly: { name: 'Sickly', emoji: '🤧', desc: 'Catches illnesses more often.' },
  resilient: { name: 'Resilient', emoji: '🛡️', desc: 'Rarely sick and recovers quickly.' },
  romantic: { name: 'Romantic', emoji: '💘', desc: 'Love comes easily, and so does heartbreak.' },
  loner: { name: 'Loner', emoji: '🌙', desc: 'Happy with fewer friends. Bonds more slowly.' },
  adventurous: { name: 'Adventurous', emoji: '🧭', desc: 'Loves travel and thrills. More accidents.' },
  addictive: { name: 'Addictive personality', emoji: '🎲', desc: 'Habits form fast, good and bad.' },
  funny: { name: 'Funny', emoji: '🤡', desc: 'Conversations go better. Pranks land.' },
  green: { name: 'Green thumb', emoji: '🌱', desc: 'Gardening, farming and pets thrive around you.' },
};
const TRAIT_IDS = Object.keys(TRAITS);
const TRAIT_CONFLICTS = [['ambitious', 'lazy'], ['sickly', 'resilient'], ['charming', 'loner'], ['anxious', 'adventurous'], ['kind', 'cunning']];

// Skills: 0-100. Grown by activities, school clubs, jobs. Unlock careers and boost odds.
const SKILLS = {
  fitness: { name: 'Fitness', emoji: '💪' },
  athletics: { name: 'Sports', emoji: '🏅' },
  martial: { name: 'Martial Arts', emoji: '🥋' },
  music: { name: 'Music', emoji: '🎸' },
  art: { name: 'Art', emoji: '🎨' },
  writing: { name: 'Writing', emoji: '✍️' },
  acting: { name: 'Acting', emoji: '🎭' },
  coding: { name: 'Coding', emoji: '💻' },
  cooking: { name: 'Cooking', emoji: '🍳' },
  charisma: { name: 'Charisma', emoji: '🗣️' },
  streetwise: { name: 'Streetwise', emoji: '🕶️' },
  business: { name: 'Business', emoji: '💼' },
  driving: { name: 'Driving', emoji: '🚗' },
  cards: { name: 'Card sense', emoji: '🃏' }, // poker and counting cards (53-gambling.js)
};
const SKILL_IDS = Object.keys(SKILLS);
const CREATIVE_SKILLS = ['music', 'art', 'writing', 'acting'];

// Relationship kinds -> label by gender [male, female, neutral].
const KIN_LABELS = {
  parent: ['Father', 'Mother', 'Parent'],
  stepparent: ['Stepfather', 'Stepmother', 'Stepparent'],
  sibling: ['Brother', 'Sister', 'Sibling'],
  halfsibling: ['Half-brother', 'Half-sister', 'Half-sibling'],
  child: ['Son', 'Daughter', 'Child'],
  grandparent: ['Grandfather', 'Grandmother', 'Grandparent'],
  grandchild: ['Grandson', 'Granddaughter', 'Grandchild'],
  partner: ['Boyfriend', 'Girlfriend', 'Partner'],
  fiance: ['Fiancé', 'Fiancée', 'Fiancé'],
  spouse: ['Husband', 'Wife', 'Spouse'],
  lover: ['Lover', 'Lover', 'Lover'],
  fling: ['Fling', 'Fling', 'Fling'], // a one-night stand (47-romance.js)
  ex: ['Ex', 'Ex', 'Ex'],
  exspouse: ['Ex-husband', 'Ex-wife', 'Ex-spouse'],
  bestie: ['Best friend', 'Best friend', 'Best friend'],
  friend: ['Friend', 'Friend', 'Friend'],
  enemy: ['Enemy', 'Enemy', 'Enemy'],
  classmate: ['Classmate', 'Classmate', 'Classmate'],
  coworker: ['Coworker', 'Coworker', 'Coworker'],
  boss: ['Boss', 'Boss', 'Boss'],
  cellmate: ['Cellmate', 'Cellmate', 'Cellmate'],
  inlaw: ['In-law', 'In-law', 'In-law'], // kinTitle (13-people.js) says which kind of in-law
  aunt: ['Uncle', 'Aunt', 'Pibling'],
  cousin: ['Cousin', 'Cousin', 'Cousin'],
  nibling: ['Nephew', 'Niece', 'Nibling'],
};
// Which kinds count as family (they never drift out of your life).
const FAMILY_KINDS = ['parent', 'stepparent', 'sibling', 'halfsibling', 'child', 'grandparent', 'grandchild', 'spouse', 'fiance', 'inlaw', 'aunt', 'cousin', 'nibling'];
// The wider family (45-family.js): close only when you are close to them.
const EXTENDED_KINDS = ['aunt', 'cousin', 'nibling', 'inlaw'];
const ROMANTIC_KINDS = ['partner', 'fiance', 'spouse', 'lover'];
// Display groups for the Relationships screen.
const REL_GROUPS = [
  { id: 'family', name: 'Family', kinds: ['parent', 'stepparent', 'spouse', 'fiance', 'partner', 'child', 'sibling', 'halfsibling', 'grandparent', 'grandchild'] },
  { id: 'extended', name: 'Extended family', kinds: ['aunt', 'cousin', 'nibling', 'inlaw'] },
  { id: 'friends', name: 'Friends', kinds: ['bestie', 'friend', 'lover'] },
  { id: 'school', name: 'School', kinds: ['classmate'] },
  { id: 'work', name: 'Work', kinds: ['boss', 'coworker'] },
  { id: 'other', name: 'Others', kinds: ['ex', 'exspouse', 'fling', 'enemy', 'cellmate'] },
];

// pop: how a clique moves your popularity at school (55-school-life.js).
const CLIQUES = {
  jocks: { name: 'Jocks', emoji: '🏈', skill: 'athletics', pop: 12 },
  brains: { name: 'Brainiacs', emoji: '🤓', stat: 'smarts', pop: -4 },
  populars: { name: 'Popular Crowd', emoji: '💅', stat: 'looks', pop: 22 },
  artsy: { name: 'Art Kids', emoji: '🎨', skill: 'art', pop: 2 },
  rebels: { name: 'Rebels', emoji: '🤘', skill: 'streetwise', pop: 6 },
  gamers: { name: 'Gamers', emoji: '🎮', skill: 'coding', pop: -3 },
  drama: { name: 'Theater Kids', emoji: '🎭', skill: 'acting', pop: 3 },
  band: { name: 'Band Geeks', emoji: '🎺', skill: 'music', pop: 0 },
  skaters: { name: 'Skaters', emoji: '🛹', skill: 'fitness', pop: 5 },
  floaters: { name: 'Floaters', emoji: '🎈', stat: 'happy', pop: 8 },
};

// School clubs and teams (55-school-life.js runs their seasons).
//   skill / stat  what being good at it means (stat: smarts, karma or happy)   also: a second skill it builds
//   kind   what colleges see: sport, arts, academic, service, leadership or fun
//   min    the first school stage that has it (primary, middle, high)        tryout: you must make the team
//   ranks  member → captain or president                                     comp: the season's big event
//   team   a team sport with a win-loss record                               pop: popularity per rank
//   moment the season's big moment: [what happens, the bold play, the team play, the safe play]
const SCHOOL_CLUBS = {
  sports: { name: 'Soccer Team', emoji: '⚽', skill: 'athletics', also: 'fitness', kind: 'sport', min: 'primary', tryout: true, team: true, pop: 3, ranks: ['Bench player', 'Starter', 'Star player', 'Captain'], comp: 'the league final', moment: ['A penalty kick in the last minute of the final, and the coach points at you.', 'Go for the top corner', 'Hand the ball to your best shooter', 'Hit it hard down the middle'] },
  basketball: { name: 'Basketball Team', emoji: '🏀', skill: 'athletics', also: 'fitness', kind: 'sport', min: 'middle', tryout: true, team: true, pop: 4, ranks: ['Bench player', 'Starter', 'Star player', 'Captain'], comp: 'the championship game', moment: ['Down by one, three seconds left, and the ball is in your hands.', 'Pull up for the three', 'Kick it to the open teammate', 'Drive for the layup'] },
  football: { name: 'Football Team', emoji: '🏈', skill: 'athletics', also: 'fitness', kind: 'sport', min: 'high', tryout: true, team: true, pop: 5, ranks: ['Practice squad', 'Starter', 'Star player', 'Captain'], comp: 'the homecoming game', moment: ['Fourth down at the goal line, and the play is yours to call.', 'Run it in yourself', 'Throw it to your best friend on the team', 'Kick the field goal'] },
  volleyball: { name: 'Volleyball Team', emoji: '🏐', skill: 'athletics', also: 'fitness', kind: 'sport', min: 'middle', tryout: true, team: true, pop: 3, ranks: ['Bench player', 'Starter', 'Star player', 'Captain'], comp: 'the conference final', moment: ['Match point in the final set, and the setter puts it up for you.', 'Spike it as hard as you can', 'Tip it to the open spot', 'Play it safe over the net'] },
  swim: { name: 'Swim Team', emoji: '🏊', skill: 'fitness', also: 'athletics', kind: 'sport', min: 'middle', tryout: true, pop: 2, ranks: ['Swimmer', 'Relay squad', 'Top seed', 'Captain'], comp: 'the championship meet', moment: ['You swim the anchor leg of the relay final, a body length behind.', 'Go all out from the dive', 'Shout your relay team on and swim smart', 'Hold your place and finish clean'] },
  track: { name: 'Track & Field', emoji: '🏃', skill: 'fitness', also: 'athletics', kind: 'sport', min: 'primary', pop: 2, ranks: ['Runner', 'Scorer', 'Record holder', 'Captain'], comp: 'the regional meet', moment: ['The 400 final, and the favorite is in the lane next to you.', 'Go out fast and dare them to catch you', 'Pace your teammate in the next lane', 'Run your own race'] },
  cheer: { name: 'Cheer Squad', emoji: '📣', skill: 'fitness', also: 'charisma', kind: 'sport', min: 'middle', tryout: true, pop: 5, ranks: ['Base', 'Back spot', 'Flyer', 'Captain'], comp: 'the cheer championship', moment: ['The routine ends with a pyramid, and you are on top.', 'Add the extra twist', 'Cover for a teammate who is shaking', 'Stick to the routine'] },
  dance: { name: 'Dance Team', emoji: '💃', skill: 'fitness', also: 'art', kind: 'arts', min: 'middle', tryout: true, pop: 3, ranks: ['Dancer', 'Featured dancer', 'Soloist', 'Captain'], comp: 'the dance competition', moment: ['The music cuts out halfway through your solo.', 'Keep dancing in silence', 'Wave the whole team on for the finale', 'Freeze and wait for the music'] },
  drama: { name: 'Drama Club', emoji: '🎭', skill: 'acting', kind: 'arts', min: 'primary', pop: 2, ranks: ['Ensemble', 'Supporting role', 'Lead', 'Club president'], comp: 'the spring play', moment: ['Opening night, and your co-star forgets their lines in the big scene.', 'Improvise a whole new scene', 'Whisper them the line', 'Wait it out in character'] },
  band: { name: 'School Band', emoji: '🎷', skill: 'music', kind: 'arts', min: 'primary', pop: 0, ranks: ['Third chair', 'Second chair', 'First chair', 'Section leader'], comp: 'the band festival', moment: ['Your solo is next, and your reed just cracked.', 'Play it anyway, with feeling', 'Let the second chair take the solo', 'Fake it softly'] },
  choir: { name: 'Choir', emoji: '🎤', skill: 'music', also: 'charisma', kind: 'arts', min: 'primary', pop: 1, ranks: ['Choir member', 'Section singer', 'Soloist', 'Choir captain'], comp: 'the choir festival', moment: ['The soloist lost their voice an hour before the concert.', 'Sing the solo yourself', 'Help the soloist through it with you', 'Stay in the back row'] },
  art: { name: 'Art Club', emoji: '🖌️', skill: 'art', kind: 'arts', min: 'primary', pop: 0, ranks: ['Member', 'Exhibitor', 'Award winner', 'Club president'], comp: 'the art show', moment: ['The art show is tomorrow, and your piece cracked in the kiln.', 'Make something new overnight', 'Help a friend finish theirs instead', 'Show it cracked and call it a statement'] },
  paper: { name: 'School Newspaper', emoji: '📰', skill: 'writing', kind: 'academic', min: 'middle', pop: 1, ranks: ['Reporter', 'Columnist', 'Section editor', 'Editor-in-chief'], comp: 'the student press awards', moment: ['You found proof the cafeteria contract went to the principal’s cousin.', 'Run the story', 'Ask the principal to comment first', 'Spike it'] },
  yearbook: { name: 'Yearbook', emoji: '📸', skill: 'art', also: 'writing', kind: 'arts', min: 'middle', pop: 2, ranks: ['Photographer', 'Page designer', 'Section editor', 'Editor'], comp: 'the yearbook awards', moment: ['The printer needs the yearbook tonight, and half the pages are blank.', 'Pull an all-nighter and redesign it all', 'Rally the whole staff to the school', 'Fill the gaps with stock photos'] },
  debate: { name: 'Debate Team', emoji: '🗣️', skill: 'charisma', also: 'writing', kind: 'academic', min: 'middle', pop: 0, ranks: ['Novice', 'Varsity debater', 'First speaker', 'Team captain'], comp: 'the state tournament', moment: ['The final round, and the judge looks bored.', 'Throw out your notes and go for broke', 'Set up your partner for the closing', 'Stick to the case you prepared'] },
  modelun: { name: 'Model UN', emoji: '🌐', skill: 'charisma', also: 'writing', kind: 'academic', min: 'high', pop: 0, ranks: ['Delegate', 'Head delegate', 'Committee chair', 'Secretary-General'], comp: 'the national conference', moment: ['Your resolution is one vote short, and the rival bloc is gloating.', 'Give a fiery speech from the floor', 'Trade a clause for their votes', 'Accept the amendment'] },
  mathletes: { name: 'Math Team', emoji: '➗', stat: 'smarts', kind: 'academic', min: 'primary', pop: -1, ranks: ['Member', 'Competitor', 'Top scorer', 'Captain'], comp: 'the math olympiad', moment: ['Tiebreak question, thirty seconds, and you see two ways to solve it.', 'Go with the elegant shortcut', 'Split the work with your teammate', 'Grind through the long way'] },
  science: { name: 'Science Olympiad', emoji: '🔬', stat: 'smarts', also: 'coding', kind: 'academic', min: 'middle', pop: -1, ranks: ['Member', 'Event specialist', 'Medalist', 'Captain'], comp: 'the science olympiad', moment: ['Your bridge model creaks five minutes before judging.', 'Rebuild the joint from scratch', 'Ask your partner to hold it while you brace it', 'Tape it and pray'] },
  robotics: { name: 'Robotics Club', emoji: '🤖', skill: 'coding', kind: 'academic', min: 'middle', pop: -1, ranks: ['Builder', 'Programmer', 'Lead engineer', 'Team captain'], comp: 'the robotics regional', moment: ['Your robot won’t drive straight, and the final starts in ten minutes.', 'Rewrite the code on the spot', 'Borrow a part from a rival team', 'Drive it by hand and hope'] },
  chess: { name: 'Chess Club', emoji: '♟️', stat: 'smarts', kind: 'academic', min: 'primary', pop: -2, ranks: ['Member', 'Rated player', 'Board one', 'Club president'], comp: 'the chess championship', moment: ['The deciding game, and you see a queen sacrifice.', 'Sacrifice the queen', 'Offer a draw to clinch it for the team', 'Play the solid move'] },
  council: { name: 'Student Council', emoji: '🏛️', skill: 'charisma', kind: 'leadership', min: 'primary', pop: 3, ranks: ['Class rep', 'Treasurer', 'Vice president', 'Student body president'], comp: 'the school year', moment: ['The principal wants to cancel the spring dance to save money.', 'Organize a walkout', 'Raise the money with the whole council', 'Accept it and plan a picnic'] },
  volunteer: { name: 'Volunteer Club', emoji: '🤝', stat: 'karma', also: 'charisma', kind: 'service', min: 'primary', pop: 1, ranks: ['Volunteer', 'Organizer', 'Coordinator', 'President'], comp: 'the service awards', moment: ['The food drive is short, and the shelter needs it by Friday.', 'Go door to door in every neighborhood', 'Get the sports teams to compete for donations', 'Send what you have'] },
  eco: { name: 'Eco Club', emoji: '🌱', stat: 'karma', kind: 'service', min: 'primary', pop: 0, ranks: ['Member', 'Garden keeper', 'Project lead', 'President'], comp: 'the green schools contest', moment: ['The school wants to pave over the garden you planted.', 'Chain yourself to the tomato plants', 'Get the whole school to sign a petition', 'Move the garden somewhere else'] },
  cooking: { name: 'Cooking Club', emoji: '🧁', skill: 'cooking', kind: 'arts', min: 'primary', pop: 1, ranks: ['Member', 'Sous chef', 'Head chef', 'President'], comp: 'the bake-off', moment: ['Your cake is sinking in the middle with ten minutes left.', 'Turn it into a trifle', 'Help your partner plate theirs', 'Serve it and smile'] },
  martial: { name: 'Martial Arts Club', emoji: '🥋', skill: 'martial', also: 'fitness', kind: 'sport', min: 'primary', pop: 2, ranks: ['Beginner', 'Sparring partner', 'Club champion', 'Captain'], comp: 'the tournament', moment: ['The tournament final, and your opponent is a head taller.', 'Go for the spinning kick', 'Fight the way your coach drilled you', 'Defend and wait for an opening'] },
  business: { name: 'Young Entrepreneurs', emoji: '📊', skill: 'business', also: 'charisma', kind: 'leadership', min: 'middle', pop: 0, ranks: ['Member', 'Treasurer', 'Vice president', 'President'], comp: 'the business plan competition', moment: ['The judges ask a question about your numbers that you can’t answer.', 'Bluff with confidence', 'Hand it to your teammate who built the spreadsheet', 'Admit you don’t know'] },
  esports: { name: 'Esports Team', emoji: '🎮', stat: 'happy', also: 'coding', kind: 'fun', min: 'middle', tryout: true, pop: 1, ranks: ['Substitute', 'Starter', 'Shot caller', 'Captain'], comp: 'the esports league final', moment: ['Last round of the final, one against three.', 'Go for the impossible clutch', 'Call out positions for your last teammate', 'Hide and play for time'] },
};

const ORIENTATIONS = {
  straight: { name: 'Straight' },
  gay: { name: 'Gay / Lesbian' },
  bi: { name: 'Bisexual' },
  ace: { name: 'Asexual' },
};
