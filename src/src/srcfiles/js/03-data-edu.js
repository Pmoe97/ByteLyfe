/* =====================================================================
 * 03-data-edu.js — schools, degrees, majors, trades, grad programs.
 * Costs are US-baseline dollars per year; prices scale by country econ.
 * Pure data.
 * ===================================================================== */

// Degree "rank" for job requirements. Professional degrees all rank 5.
const EDU_RANK = { none: 0, high: 1, ged: 1, trade: 2, assoc: 2, bachelor: 3, master: 4, mba: 4, jd: 5, md: 5, dds: 5, pharmd: 5, dvm: 5, phd: 5 };
const DEGREE_NAMES = {
  high: 'High school diploma', ged: 'GED', trade: 'Trade certificate', assoc: "Associate's degree", bachelor: "Bachelor's degree",
  master: "Master's degree", mba: 'MBA', jd: 'Law degree (JD)', md: 'Medical degree (MD)', dds: 'Dental degree (DDS)',
  pharmd: 'Pharmacy degree (PharmD)', dvm: 'Veterinary degree (DVM)', phd: 'PhD',
};

// Compulsory school. Ages: primary 5-10, middle 11-13, high 14-17, graduate at 18.
const SCHOOL_STAGES = {
  primary: { name: 'Primary School', years: 6, next: 'middle', emoji: '🏫', suffix: ['Elementary', 'Primary School', 'Academy'] },
  middle: { name: 'Middle School', years: 3, next: 'high', emoji: '🏫', suffix: ['Middle School', 'Junior High'] },
  high: { name: 'High School', years: 4, next: null, emoji: '🎒', suffix: ['High School', 'Secondary School', 'Senior High'] },
};

// The subjects on a report card (55-school-life.js). apt: the skill (or smarts) that makes it easy.
const SUBJECTS = {
  math: { name: 'Math', emoji: '➗', apt: 'smarts' },
  sci: { name: 'Science', emoji: '🔬', apt: 'smarts' },
  eng: { name: 'English', emoji: '📖', apt: 'writing' },
  hist: { name: 'History', emoji: '🏛️', apt: 'smarts' },
  art: { name: 'Art & Music', emoji: '🎨', apt: 'art' },
  pe: { name: 'P.E.', emoji: '🏃', apt: 'fitness' },
};
const SUBJECT_IDS = Object.keys(SUBJECTS);

// Universities you can apply to in your last year of high school (55-school-life.js).
// bar: how strong an application it takes; cost: US-baseline tuition a year.
const COLLEGE_TIERS = {
  elite: { name: 'Elite', bar: 86, cost: 60000, names: ['Ashworth University', 'Kingsford University', 'Whitlock College', 'Carrington University', 'Hollinger University', 'Stanmore University', 'Ellsworth College', 'Pemberton University', 'Covington University', 'Thornbury University'] },
  selective: { name: 'Selective', bar: 70, cost: 42000, names: ['{root} College', '{root} Institute of Technology', '{root} University'] },
  state: { name: 'Public', bar: 50, cost: 26000, names: ['University of {city}', '{city} State University'] },
  open: { name: 'Open admission', bar: 22, cost: 16000, names: ['{city} Polytechnic', '{root} University'] },
};

const COLLEGES = {
  university: { name: 'University', degree: 'bachelor', years: 4, cost: 26000, emoji: '🎓' },
  community: { name: 'Community College', degree: 'assoc', years: 2, cost: 5000, emoji: '🏛️' },
  trade: { name: 'Trade School', degree: 'trade', years: 2, cost: 9000, emoji: '🛠️' },
};

const MAJORS = {
  biology: { name: 'Biology', smarts: 45 },
  chemistry: { name: 'Chemistry', smarts: 55 },
  physics: { name: 'Physics', smarts: 65 },
  math: { name: 'Mathematics', smarts: 60 },
  cs: { name: 'Computer Science', smarts: 55, skill: 'coding' },
  engineering: { name: 'Engineering', smarts: 60 },
  nursing: { name: 'Nursing', smarts: 45 },
  business: { name: 'Business', smarts: 35, skill: 'business' },
  finance: { name: 'Finance', smarts: 45, skill: 'business' },
  accounting: { name: 'Accounting', smarts: 45 },
  economics: { name: 'Economics', smarts: 50 },
  marketing: { name: 'Marketing', smarts: 35, skill: 'business' },
  psychology: { name: 'Psychology', smarts: 40 },
  sociology: { name: 'Sociology', smarts: 35 },
  polisci: { name: 'Political Science', smarts: 40, skill: 'charisma' },
  history: { name: 'History', smarts: 35 },
  english: { name: 'English Literature', smarts: 35, skill: 'writing' },
  journalism: { name: 'Journalism', smarts: 35, skill: 'writing' },
  communications: { name: 'Communications', smarts: 30, skill: 'charisma' },
  education: { name: 'Education', smarts: 30 },
  art: { name: 'Fine Arts', smarts: 20, skill: 'art' },
  design: { name: 'Graphic Design', smarts: 30, skill: 'art' },
  music: { name: 'Music', smarts: 25, skill: 'music' },
  theater: { name: 'Theater', smarts: 20, skill: 'acting' },
  film: { name: 'Film Studies', smarts: 30, skill: 'acting' },
  architecture: { name: 'Architecture', smarts: 55, skill: 'art' },
  criminaljustice: { name: 'Criminal Justice', smarts: 30 },
  philosophy: { name: 'Philosophy', smarts: 45 },
  kinesiology: { name: 'Kinesiology', smarts: 35, skill: 'fitness' },
  agriculture: { name: 'Agriculture', smarts: 30 },
};
const MAJOR_IDS = Object.keys(MAJORS);

const TRADES = {
  electrician: { name: 'Electrician' },
  plumbing: { name: 'Plumbing' },
  automotive: { name: 'Automotive Repair' },
  culinary: { name: 'Culinary Arts', skill: 'cooking' },
  cosmetology: { name: 'Cosmetology' },
  welding: { name: 'Welding' },
  hvac: { name: 'HVAC' },
  carpentry: { name: 'Carpentry' },
  dental: { name: 'Dental Assisting' },
  paramedic: { name: 'Emergency Medicine (EMT)' },
};
const TRADE_IDS = Object.keys(TRADES);

// Classes and lessons outside school (57-lessons.js). A family names the levels you climb
// (belts, grades, ratings) and what its yearly showcase is called.
const LESSON_FAMS = {
  music: { name: 'Music', emoji: '🎼', show: 'recital', levels: ['Beginner', 'Grade 1', 'Grade 3', 'Grade 5', 'Grade 8', 'Diploma', 'Concert soloist'] },
  belt: { name: 'Martial arts', emoji: '🥋', show: 'tournament', levels: ['White belt', 'Yellow belt', 'Orange belt', 'Green belt', 'Blue belt', 'Brown belt', 'Black belt', 'Second-degree black belt'] },
  bjj: { name: 'Martial arts', emoji: '🥋', show: 'tournament', levels: ['White belt', 'Blue belt', 'Purple belt', 'Brown belt', 'Black belt'] },
  ring: { name: 'Combat sports', emoji: '🥊', show: 'bout', levels: ['Novice', 'Club fighter', 'Regional champion', 'National contender', 'National champion'] },
  dance: { name: 'Dance', emoji: '💃', show: 'showcase', levels: ['Beginner', 'Intermediate', 'Advanced', 'Pre-professional', 'Company level'] },
  ballet: { name: 'Dance', emoji: '💃', show: 'showcase', levels: ['Pre-ballet', 'Elementary', 'Intermediate', 'Advanced', 'En pointe', 'Pre-professional'] },
  sport: { name: 'Sports', emoji: '🏅', show: 'competition', levels: ['Beginner', 'Club level', 'Regional', 'Junior national', 'National level'] },
  swim: { name: 'Sports', emoji: '🏅', show: 'meet', levels: ['Learn to swim', 'Bronze', 'Silver', 'Gold', 'Junior national', 'National level'] },
  art: { name: 'Arts & crafts', emoji: '🎨', show: 'exhibition', levels: ['Beginner', 'Intermediate', 'Advanced', 'Exhibited', 'Master'] },
  lang: { name: 'Languages', emoji: '🌍', show: 'exam', levels: ['A1 beginner', 'A2 elementary', 'B1 intermediate', 'B2 upper intermediate', 'C1 advanced', 'C2 fluent'] },
  chess: { name: 'Mind games', emoji: '♟️', show: 'tournament', levels: ['Unrated', 'Rated 1000', 'Rated 1400', 'Expert', 'Master', 'Grandmaster'] },
  study: { name: 'Skills', emoji: '💡', show: 'competition', levels: ['Beginner', 'Intermediate', 'Advanced', 'Expert'] },
  stage: { name: 'Stage', emoji: '🎭', show: 'showcase', levels: ['Beginner', 'Showcase performer', 'Lead roles', 'Conservatory level'] },
  life: { name: 'Life skills', emoji: '🧰', show: null, levels: ['Beginner', 'Capable', 'Skilled', 'Expert'] },
};
// skill (or stat: smarts) is what you get better at; also a second skill. cost: a year of lessons
// (US dollars). inst: instruments (INSTRUMENTS ids) that make practice at home count for more.
// lang: the language, which nobody needs lessons in where it's spoken.
const LESSON_TYPES = {
  piano: { fam: 'music', name: 'Piano', emoji: '🎹', skill: 'music', cost: 2000, minAge: 4, inst: ['keyboard', 'piano'] },
  guitar: { fam: 'music', name: 'Guitar', emoji: '🎸', skill: 'music', cost: 1500, minAge: 6, inst: ['guitar'] },
  violin: { fam: 'music', name: 'Violin', emoji: '🎻', skill: 'music', cost: 1800, minAge: 4, inst: ['violin'] },
  cello: { fam: 'music', name: 'Cello', emoji: '🎻', skill: 'music', cost: 2000, minAge: 6, inst: ['cello'] },
  drums: { fam: 'music', name: 'Drums', emoji: '🥁', skill: 'music', cost: 1500, minAge: 7, inst: ['drums'] },
  sax: { fam: 'music', name: 'Saxophone', emoji: '🎷', skill: 'music', cost: 1600, minAge: 9, inst: ['sax'] },
  trumpet: { fam: 'music', name: 'Trumpet', emoji: '🎺', skill: 'music', cost: 1500, minAge: 8, inst: ['trumpet'] },
  flute: { fam: 'music', name: 'Flute', emoji: '🎶', skill: 'music', cost: 1400, minAge: 8 },
  ukulele: { fam: 'music', name: 'Ukulele', emoji: '🪕', skill: 'music', cost: 900, minAge: 5, inst: ['ukulele'] },
  voice: { fam: 'music', name: 'Singing', emoji: '🎤', skill: 'music', also: 'charisma', cost: 1600, minAge: 6 },
  dj: { fam: 'music', name: 'DJing & production', emoji: '🎧', skill: 'music', cost: 1800, minAge: 13, inst: ['dj'] },
  karate: { fam: 'belt', name: 'Karate', emoji: '🥋', skill: 'martial', also: 'fitness', cost: 1200, minAge: 5 },
  taekwondo: { fam: 'belt', name: 'Taekwondo', emoji: '🥋', skill: 'martial', also: 'fitness', cost: 1200, minAge: 5 },
  judo: { fam: 'belt', name: 'Judo', emoji: '🥋', skill: 'martial', also: 'fitness', cost: 1200, minAge: 6 },
  kungfu: { fam: 'belt', name: 'Kung fu', emoji: '🐉', skill: 'martial', also: 'fitness', cost: 1300, minAge: 6 },
  bjj: { fam: 'bjj', name: 'Brazilian jiu-jitsu', emoji: '🥋', skill: 'martial', also: 'fitness', cost: 1600, minAge: 8 },
  boxing: { fam: 'ring', name: 'Boxing', emoji: '🥊', skill: 'martial', also: 'fitness', cost: 1200, minAge: 10 },
  muaythai: { fam: 'ring', name: 'Muay Thai', emoji: '🥊', skill: 'martial', also: 'fitness', cost: 1400, minAge: 12 },
  wrestling: { fam: 'ring', name: 'Wrestling', emoji: '🤼', skill: 'martial', also: 'athletics', cost: 900, minAge: 8 },
  fencing: { fam: 'sport', name: 'Fencing', emoji: '🤺', skill: 'athletics', also: 'martial', cost: 2000, minAge: 9 },
  ballet: { fam: 'ballet', name: 'Ballet', emoji: '🩰', skill: 'fitness', also: 'art', cost: 2200, minAge: 4 },
  hiphop: { fam: 'dance', name: 'Hip-hop dance', emoji: '💃', skill: 'fitness', also: 'music', cost: 1200, minAge: 6 },
  tap: { fam: 'dance', name: 'Tap dance', emoji: '👞', skill: 'fitness', also: 'music', cost: 1200, minAge: 5 },
  ballroom: { fam: 'dance', name: 'Ballroom dance', emoji: '🕺', skill: 'fitness', also: 'charisma', cost: 1300, minAge: 10 },
  swimming: { fam: 'swim', name: 'Swimming', emoji: '🏊', skill: 'fitness', also: 'athletics', cost: 900, minAge: 4 },
  tennis: { fam: 'sport', name: 'Tennis', emoji: '🎾', skill: 'athletics', also: 'fitness', cost: 1800, minAge: 6 },
  gymnastics: { fam: 'sport', name: 'Gymnastics', emoji: '🤸', skill: 'athletics', also: 'fitness', cost: 2400, minAge: 4 },
  skating: { fam: 'sport', name: 'Figure skating', emoji: '⛸️', skill: 'athletics', also: 'art', cost: 3000, minAge: 5 },
  riding: { fam: 'sport', name: 'Horse riding', emoji: '🏇', skill: 'athletics', cost: 4000, minAge: 6 },
  golf: { fam: 'sport', name: 'Golf', emoji: '⛳', skill: 'athletics', cost: 2500, minAge: 8 },
  climbing: { fam: 'sport', name: 'Rock climbing', emoji: '🧗', skill: 'fitness', also: 'athletics', cost: 1200, minAge: 8 },
  painting: { fam: 'art', name: 'Painting', emoji: '🎨', skill: 'art', cost: 1000, minAge: 5 },
  pottery: { fam: 'art', name: 'Pottery', emoji: '🏺', skill: 'art', cost: 1100, minAge: 8 },
  photography: { fam: 'art', name: 'Photography', emoji: '📷', skill: 'art', cost: 1200, minAge: 10 },
  sewing: { fam: 'art', name: 'Sewing & fashion', emoji: '🧵', skill: 'art', cost: 1000, minAge: 10 },
  spanish: { fam: 'lang', name: 'Spanish', emoji: '🌍', stat: 'smarts', also: 'charisma', cost: 900, minAge: 6, lang: ['es', 'mx'] },
  french: { fam: 'lang', name: 'French', emoji: '🌍', stat: 'smarts', also: 'charisma', cost: 900, minAge: 6, lang: ['fr'] },
  german: { fam: 'lang', name: 'German', emoji: '🌍', stat: 'smarts', also: 'charisma', cost: 900, minAge: 8, lang: ['de'] },
  japanese: { fam: 'lang', name: 'Japanese', emoji: '🌏', stat: 'smarts', also: 'charisma', cost: 1100, minAge: 8, lang: ['jp'] },
  mandarin: { fam: 'lang', name: 'Mandarin', emoji: '🌏', stat: 'smarts', also: 'charisma', cost: 1100, minAge: 8, lang: [] },
  english: { fam: 'lang', name: 'English', emoji: '🌎', stat: 'smarts', also: 'charisma', cost: 900, minAge: 6, lang: ['us', 'ca', 'uk', 'ie', 'au', 'ng', 'ph', 'za', 'in'] },
  chess: { fam: 'chess', name: 'Chess', emoji: '♟️', stat: 'smarts', cost: 600, minAge: 5 },
  coding: { fam: 'study', name: 'Coding', emoji: '💻', skill: 'coding', cost: 1500, minAge: 8 },
  writing: { fam: 'study', name: 'Creative writing', emoji: '✍️', skill: 'writing', cost: 900, minAge: 9 },
  speaking: { fam: 'study', name: 'Public speaking', emoji: '🗣️', skill: 'charisma', cost: 1000, minAge: 11 },
  acting: { fam: 'stage', name: 'Acting', emoji: '🎭', skill: 'acting', cost: 1400, minAge: 6 },
  comedy: { fam: 'stage', name: 'Stand-up comedy', emoji: '🤡', skill: 'acting', also: 'charisma', cost: 900, minAge: 14 },
  magic: { fam: 'stage', name: 'Magic', emoji: '🎩', skill: 'acting', also: 'charisma', cost: 800, minAge: 7 },
  cooking: { fam: 'life', name: 'Cooking', emoji: '🍳', skill: 'cooking', cost: 900, minAge: 9 },
  business: { fam: 'life', name: 'Business', emoji: '📊', skill: 'business', cost: 1500, minAge: 15 },
  driving: { fam: 'life', name: 'Driving', emoji: '🚗', skill: 'driving', cost: 800, minAge: 15 },
  firstaid: { fam: 'life', name: 'First aid', emoji: '⛑️', stat: 'smarts', cost: 300, minAge: 12 },
};
const LESSON_IDS = Object.keys(LESSON_TYPES);

// Graduate programs. `majors` restricts which bachelor majors qualify (omitted = any).
// masters/phd are taken "in your major".
const GRAD_PROGRAMS = {
  law: { name: 'Law School', degree: 'jd', years: 3, smarts: 60, cost: 48000, emoji: '⚖️' },
  med: { name: 'Medical School', degree: 'md', years: 4, smarts: 70, cost: 55000, emoji: '🩺', majors: ['biology', 'chemistry', 'nursing', 'physics', 'kinesiology', 'psychology'] },
  dental: { name: 'Dental School', degree: 'dds', years: 4, smarts: 65, cost: 60000, emoji: '🦷', majors: ['biology', 'chemistry', 'kinesiology'] },
  pharmacy: { name: 'Pharmacy School', degree: 'pharmd', years: 4, smarts: 60, cost: 45000, emoji: '💊', majors: ['biology', 'chemistry'] },
  vet: { name: 'Veterinary School', degree: 'dvm', years: 4, smarts: 62, cost: 45000, emoji: '🐾', majors: ['biology', 'chemistry', 'agriculture'] },
  business: { name: 'Business School', degree: 'mba', years: 2, smarts: 50, cost: 60000, emoji: '📈' },
  masters: { name: "Master's Program", degree: 'master', years: 2, smarts: 50, cost: 30000, emoji: '📘' },
  phd: { name: 'PhD Program', degree: 'phd', years: 5, smarts: 72, cost: 0, stipend: 28000, emoji: '🔬' },
};
