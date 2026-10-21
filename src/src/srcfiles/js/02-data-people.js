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
  { id: 'other', name: 'Others', kinds: ['ex', 'exspouse', 'enemy', 'cellmate'] },
];

const CLIQUES = {
  jocks: { name: 'Jocks', emoji: '🏈', skill: 'athletics' },
  brains: { name: 'Brainiacs', emoji: '🤓', stat: 'smarts' },
  populars: { name: 'Popular Crowd', emoji: '💅', stat: 'looks' },
  artsy: { name: 'Art Kids', emoji: '🎨', skill: 'art' },
  rebels: { name: 'Rebels', emoji: '🤘', skill: 'streetwise' },
  gamers: { name: 'Gamers', emoji: '🎮', skill: 'coding' },
  drama: { name: 'Theater Kids', emoji: '🎭', skill: 'acting' },
  band: { name: 'Band Geeks', emoji: '🎺', skill: 'music' },
  skaters: { name: 'Skaters', emoji: '🛹', skill: 'fitness' },
  floaters: { name: 'Floaters', emoji: '🎈', stat: 'happy' },
};

const SCHOOL_CLUBS = {
  sports: { name: 'Sports Team', emoji: '⚽', skill: 'athletics', also: 'fitness' },
  drama: { name: 'Drama Club', emoji: '🎭', skill: 'acting' },
  band: { name: 'School Band', emoji: '🎷', skill: 'music' },
  debate: { name: 'Debate Team', emoji: '🗣️', skill: 'charisma' },
  robotics: { name: 'Robotics Club', emoji: '🤖', skill: 'coding' },
  art: { name: 'Art Club', emoji: '🖌️', skill: 'art' },
  paper: { name: 'School Newspaper', emoji: '📰', skill: 'writing' },
  chess: { name: 'Chess Club', emoji: '♟️', stat: 'smarts' },
  cooking: { name: 'Cooking Club', emoji: '🧁', skill: 'cooking' },
  martial: { name: 'Martial Arts Club', emoji: '🥋', skill: 'martial' },
  business: { name: 'Young Entrepreneurs', emoji: '📊', skill: 'business' },
  track: { name: 'Track & Field', emoji: '🏃', skill: 'fitness', also: 'athletics' },
};

const ORIENTATIONS = {
  straight: { name: 'Straight' },
  gay: { name: 'Gay / Lesbian' },
  bi: { name: 'Bisexual' },
  ace: { name: 'Asexual' },
};
