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
