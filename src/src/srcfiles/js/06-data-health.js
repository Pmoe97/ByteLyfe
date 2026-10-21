/* =====================================================================
 * 06-data-health.js — illnesses, injuries, treatments, addictions.
 *   ages: [min, max] when it can be caught at random   w: random weight (0 = never random)
 *   sev: health lost per year while you have it          happy/looks/smarts: per-year stat hit
 *   dur: years until it clears on its own (0 = chronic, needs treatment or lasts for life)
 *   fade: yearly chance a chronic condition clears up by itself
 *   cure: base cure chance with a regular doctor          fatal: yearly death chance when untreated
 *   hidden: no symptoms at first; found by a checkup or after a year or two
 * Pure data.
 * ===================================================================== */

const DISEASES = {
  cold: { art: 'a', name: 'Common cold', emoji: '🤧', ages: [0, 120], w: 30, sev: 2, happy: -2, dur: 1, cure: 0.97 },
  flu: { art: 'the', name: 'Flu', emoji: '🤒', ages: [0, 120], w: 18, sev: 6, happy: -4, dur: 1, cure: 0.92, fatal: 0.002 },
  stomach: { art: 'a', name: 'Stomach bug', emoji: '🤢', ages: [0, 120], w: 12, sev: 4, happy: -3, dur: 1, cure: 0.96 },
  ear: { art: 'an', name: 'Ear infection', emoji: '👂', ages: [0, 12], w: 9, sev: 3, happy: -3, dur: 1, cure: 0.96 },
  lice: { name: 'Head lice', emoji: '🐜', ages: [4, 12], w: 5, sev: 0, happy: -4, dur: 1, cure: 0.99 },
  chickenpox: { name: 'Chickenpox', emoji: '🔴', ages: [1, 12], w: 4, sev: 4, happy: -4, looks: -2, dur: 1, cure: 0.92, once: true },
  strep: { name: 'Strep throat', emoji: '😷', ages: [3, 40], w: 6, sev: 5, happy: -3, dur: 1, cure: 0.96 },
  bronchitis: { name: 'Bronchitis', emoji: '😷', ages: [0, 120], w: 5, sev: 7, happy: -3, dur: 1, cure: 0.88 },
  pneumonia: { name: 'Pneumonia', emoji: '😷', ages: [0, 120], w: 2.5, sev: 15, happy: -5, dur: 1, cure: 0.78, fatal: 0.03 },
  acne: { name: 'Acne', emoji: '😖', ages: [12, 22], w: 9, sev: 0, happy: -2, looks: -4, dur: 3, cure: 0.72 },
  migraines: { name: 'Migraines', emoji: '🤕', ages: [12, 75], w: 4, sev: 1, happy: -5, dur: 0, fade: 0.12, cure: 0.5 },
  allergies: { name: 'Seasonal allergies', emoji: '🌼', ages: [3, 120], w: 5, sev: 0, happy: -2, dur: 0, fade: 0.1, cure: 0.4 },
  asthma: { name: 'Asthma', emoji: '💨', ages: [0, 40], w: 3, sev: 1, happy: -2, dur: 0, fade: 0.06, cure: 0.3 },
  insomnia: { name: 'Insomnia', emoji: '🥱', ages: [14, 120], w: 4, sev: 1, happy: -5, dur: 0, fade: 0.15, cure: 0.55 },
  depression: { name: 'Depression', emoji: '🌧️', ages: [12, 120], w: 3, sev: 1, happy: -12, dur: 0, fade: 0.08, cure: 0.45, mental: true },
  anxiety: { art: 'an', name: 'Anxiety disorder', emoji: '😟', ages: [10, 120], w: 3, sev: 0, happy: -8, dur: 0, fade: 0.08, cure: 0.5, mental: true },
  backpain: { name: 'Chronic back pain', emoji: '🦴', ages: [30, 120], w: 5, sev: 1, happy: -4, dur: 0, fade: 0.1, cure: 0.4 },
  hypertension: { name: 'High blood pressure', emoji: '🩸', ages: [35, 120], w: 5, sev: 2, dur: 0, cure: 0.5, hidden: true },
  cholesterol: { name: 'High cholesterol', emoji: '🍟', ages: [35, 120], w: 4, sev: 1, dur: 0, cure: 0.6, hidden: true },
  diabetes: { name: 'Type 2 diabetes', emoji: '🍬', ages: [35, 120], w: 3, sev: 3, happy: -2, dur: 0, cure: 0.15 },
  kidneystones: { name: 'Kidney stones', emoji: '💢', ages: [25, 90], w: 3, sev: 6, happy: -6, dur: 1, cure: 0.9 },
  gout: { name: 'Gout', emoji: '🦶', ages: [40, 120], w: 2, sev: 1, happy: -3, dur: 0, fade: 0.05, cure: 0.5 },
  arthritis: { name: 'Arthritis', emoji: '🦴', ages: [50, 120], w: 5, sev: 1, happy: -3, dur: 0, cure: 0.2 },
  heart: { name: 'Heart disease', emoji: '💔', ages: [45, 120], w: 3, sev: 6, happy: -3, dur: 0, cure: 0.3, fatal: 0.05 },
  osteoporosis: { name: 'Osteoporosis', emoji: '🦴', ages: [55, 120], w: 3, sev: 1, dur: 0, cure: 0.25 },
  cataracts: { name: 'Cataracts', emoji: '👁️', ages: [60, 120], w: 3, sev: 0, happy: -3, dur: 0, cure: 0.88 },
  hearing: { name: 'Hearing loss', emoji: '🦻', ages: [60, 120], w: 3, sev: 0, happy: -3, dur: 0, cure: 0.35 },
  dementia: { name: 'Dementia', emoji: '🧩', ages: [68, 120], w: 2, sev: 4, happy: -4, smarts: -8, dur: 0, cure: 0, fatal: 0.04 },
  skin_cancer: { name: 'Skin cancer', emoji: '🎗️', ages: [30, 120], w: 1.2, sev: 5, happy: -4, dur: 0, cure: 0.6, hidden: true, fatal: 0.05 },
  lung_cancer: { name: 'Lung cancer', emoji: '🎗️', ages: [40, 120], w: 0.8, sev: 10, happy: -6, dur: 0, cure: 0.35, hidden: true, fatal: 0.18 },
  breast_cancer: { name: 'Breast cancer', emoji: '🎗️', ages: [35, 120], w: 1, sev: 8, happy: -6, dur: 0, cure: 0.55, hidden: true, fatal: 0.1 },
  prostate_cancer: { name: 'Prostate cancer', emoji: '🎗️', ages: [50, 120], w: 1.2, sev: 6, happy: -5, dur: 0, cure: 0.6, hidden: true, fatal: 0.06, gender: 'm' },
  colon_cancer: { name: 'Colon cancer', emoji: '🎗️', ages: [45, 120], w: 0.8, sev: 8, happy: -6, dur: 0, cure: 0.45, hidden: true, fatal: 0.1 },
  leukemia: { name: 'Leukemia', emoji: '🎗️', ages: [0, 120], w: 0.3, sev: 10, happy: -6, dur: 0, cure: 0.45, hidden: true, fatal: 0.15 },
  // From events only (w: 0).
  broken_arm: { art: 'a', name: 'Broken arm', emoji: '💪', ages: [0, 120], w: 0, sev: 5, happy: -4, dur: 1, cure: 0.98 },
  broken_leg: { art: 'a', name: 'Broken leg', emoji: '🦵', ages: [0, 120], w: 0, sev: 7, happy: -6, dur: 1, cure: 0.98 },
  concussion: { art: 'a', name: 'Concussion', emoji: '😵', ages: [0, 120], w: 0, sev: 8, happy: -3, smarts: -2, dur: 1, cure: 0.92 },
  food_poisoning: { name: 'Food poisoning', emoji: '🤮', ages: [0, 120], w: 0, sev: 6, happy: -4, dur: 1, cure: 0.98 },
  sunburn: { art: 'a', name: 'Bad sunburn', emoji: '🥵', ages: [0, 120], w: 0, sev: 2, happy: -3, looks: -1, dur: 1, cure: 0.99 },
  chlamydia: { name: 'Chlamydia', emoji: '🦠', ages: [14, 120], w: 0, sev: 1, happy: -2, dur: 0, cure: 0.95, sti: true },
  gonorrhea: { name: 'Gonorrhea', emoji: '🦠', ages: [14, 120], w: 0, sev: 2, happy: -2, dur: 0, cure: 0.9, sti: true },
  herpes: { name: 'Herpes', emoji: '🦠', ages: [14, 120], w: 0, sev: 0, happy: -3, dur: 0, cure: 0, sti: true },
};
const STIS = Object.keys(DISEASES).filter((k) => DISEASES[k].sti);

// Ways to get treated. Price scales by econ; countries with freeHealth pay ~10% except experimental.
const TREATMENTS = [
  { id: 'clinic', name: 'See a doctor', emoji: '🩺', cost: 300, mult: 1.0 },
  { id: 'specialist', name: 'See a specialist', emoji: '🏥', cost: 2500, mult: 1.35 },
  { id: 'experimental', name: 'Experimental treatment', emoji: '🧪', cost: 60000, mult: 1.8, risk: 0.04, noDiscount: true },
  { id: 'healer', name: 'Alternative healer', emoji: '🌿', cost: 60, mult: 0.35 },
];

// Adults only (the action is gated at 18). `pick` asks a follow-up question;
// `death` overrides the usual 0.5% operating-table risk. What each one does to
// the face or body is in applySurgeryLook (36-looks.js).
const SURGERIES = [
  { id: 'nose', name: 'Nose job', cost: 6000, looks: [4, 10], pick: 'nose' },
  { id: 'teeth', name: 'Veneers', cost: 9000, looks: [3, 8] },
  { id: 'botox', name: 'Botox', cost: 600, looks: [1, 4], minAge: 25 },
  { id: 'eyes', name: 'Eyelid surgery', cost: 5000, looks: [3, 8] },
  { id: 'facelift', name: 'Facelift', cost: 12000, looks: [5, 14], minAge: 35 },
  { id: 'hair', name: 'Hair transplant', cost: 8000, looks: [3, 9] },
  { id: 'lipo', name: 'Liposuction', cost: 7000, looks: [4, 10] },
  { id: 'tummy', name: 'Tummy tuck', cost: 9500, looks: [3, 9] },
  { id: 'implants', name: 'Breast augmentation', cost: 8500, looks: [3, 10], pick: 'implants' },
  { id: 'reduction', name: 'Breast reduction', cost: 7500, looks: [2, 7] },
  { id: 'bbl', name: 'Brazilian butt lift', noun: 'Brazilian butt lift', cost: 11000, looks: [4, 11], death: 0.01 },
  { id: 'full', name: 'Full makeover package', cost: 45000, looks: [10, 22] },
];
const IMPLANT_SIZES = [{ label: 'Subtle', value: 15 }, { label: 'Natural-full', value: 28 }, { label: 'Dramatic', value: 42 }];

// Addictions. Severity 0-100; 50+ means hooked. Per-year effects scale with severity.
const ADDICTIONS = {
  alcohol: { name: 'Alcohol', emoji: '🍺', health: -5, happy: -3, money: 1500 },
  nicotine: { name: 'Nicotine', emoji: '🚬', health: -4, happy: -1, money: 1800 },
  gambling: { name: 'Gambling', emoji: '🎰', health: 0, happy: -5, money: 6000 },
  pills: { name: 'Painkillers', emoji: '💊', health: -7, happy: -4, money: 4000, overdose: 0.03 },
  partydrugs: { name: 'Party drugs', emoji: '🧪', health: -8, happy: -5, money: 5000, overdose: 0.04 },
  gaming: { name: 'Video games', emoji: '🎮', health: -1, happy: -2, money: 600 },
};
