/* =====================================================================
 * 07-data-crime.js — crimes, sentences, prisons.
 *   success: base odds the crime works        loot: [lo, hi] US-baseline dollars
 *   caught:  odds of arrest when it fails     escapeOdds: odds of arrest even when it works
 *   sentence: [min, max] years if convicted (0 = fine / probation)
 *   conviction: base odds a trial convicts    felony: shows on your record for jobs
 * Pure data.
 * ===================================================================== */

const CRIMES = {
  shoplift: { name: 'Shoplift', emoji: '🧢', minAge: 8, success: 0.7, loot: [15, 600], caught: 0.55, later: 0.03, sentence: [0, 1], conviction: 0.7, karma: -3, skill: 2, felony: false, verb: 'shoplifting' },
  pickpocket: { name: 'Pickpocket', emoji: '👛', minAge: 10, success: 0.6, loot: [10, 1200], caught: 0.55, later: 0.03, sentence: [0, 1], conviction: 0.7, karma: -4, skill: 3, felony: false, verb: 'pickpocketing' },
  vandalism: { name: 'Vandalize something', emoji: '🖌️', minAge: 10, success: 0.75, loot: [0, 0], caught: 0.4, later: 0.02, sentence: [0, 0], conviction: 0.75, karma: -3, skill: 1, felony: false, verb: 'vandalism' },
  burglary: { name: 'Burgle a house', emoji: '🏚️', minAge: 14, success: 0.5, loot: [200, 25000], caught: 0.6, later: 0.06, sentence: [1, 5], conviction: 0.75, karma: -8, skill: 5, felony: true, verb: 'burglary' },
  car_theft: { name: 'Steal a car', emoji: '🚗', minAge: 15, success: 0.42, loot: [1500, 30000], caught: 0.65, later: 0.07, sentence: [1, 6], conviction: 0.75, karma: -8, skill: 5, felony: true, verb: 'grand theft auto' },
  drugs: { name: 'Sell drugs', emoji: '💊', minAge: 15, success: 0.6, loot: [500, 20000], caught: 0.5, later: 0.08, sentence: [2, 8], conviction: 0.8, karma: -10, skill: 5, felony: true, verb: 'drug dealing' },
  hacking: { name: 'Hack a company', emoji: '💻', minAge: 14, sk: { coding: 40 }, skillKey: 'coding', success: 0.35, loot: [5000, 400000], caught: 0.5, later: 0.08, sentence: [2, 10], conviction: 0.75, karma: -6, skill: 3, felony: true, verb: 'computer fraud' },
  scam: { name: 'Run a phone scam', emoji: '📞', minAge: 16, sk: { charisma: 20 }, skillKey: 'charisma', success: 0.45, loot: [800, 60000], caught: 0.55, later: 0.08, sentence: [1, 7], conviction: 0.75, karma: -12, skill: 4, felony: true, verb: 'fraud' },
  bank: { name: 'Rob a bank', emoji: '🏦', minAge: 18, success: 0.15, loot: [20000, 2500000], caught: 0.85, later: 0.12, sentence: [8, 25], conviction: 0.85, karma: -15, skill: 8, felony: true, deadly: 0.04, verb: 'armed robbery' },
  heist: { name: 'Plan a jewel heist', emoji: '💎', minAge: 21, sk: { streetwise: 50 }, skillKey: 'streetwise', success: 0.22, loot: [250000, 12000000], caught: 0.8, later: 0.15, sentence: [10, 30], conviction: 0.85, karma: -15, skill: 10, felony: true, deadly: 0.02, verb: 'grand larceny' },
  embezzle: { name: 'Embezzle from work', emoji: '💼', minAge: 18, needsJob: true, success: 0.55, loot: [0, 0], caught: 0.7, later: 0.1, sentence: [2, 10], conviction: 0.8, karma: -10, skill: 3, felony: true, verb: 'embezzlement' },
  // Targeted at a person (from their sheet), or created by the engine.
  assault: { name: 'Assault', minAge: 8, sentence: [0, 4], conviction: 0.75, karma: -10, felony: true, verb: 'assault' },
  murder: { name: 'Murder', minAge: 14, sentence: [18, 99], conviction: 0.8, karma: -40, felony: true, verb: 'murder' },
  attempted_murder: { name: 'Attempted murder', minAge: 14, sentence: [6, 20], conviction: 0.8, karma: -25, felony: true, verb: 'attempted murder' },
  escape: { name: 'Prison escape', minAge: 10, sentence: [2, 6], conviction: 0.95, karma: -5, felony: true, verb: 'escaping custody' },
  dui: { name: 'Drunk driving', minAge: 14, sentence: [0, 2], conviction: 0.85, karma: -6, felony: false, verb: 'driving under the influence' },
  // Organized crime (39-underworld.js).
  racketeering: { name: 'Racketeering', minAge: 16, sentence: [3, 15], conviction: 0.75, karma: -10, felony: true, verb: 'racketeering' },
  extortion: { name: 'Extortion', minAge: 16, sentence: [2, 8], conviction: 0.75, karma: -8, felony: true, verb: 'extortion' },
  kidnapping: { name: 'Kidnapping', minAge: 18, sentence: [10, 30], conviction: 0.85, karma: -20, felony: true, verb: 'kidnapping' },
  trafficking: { name: 'Drug trafficking', minAge: 16, sentence: [5, 20], conviction: 0.8, karma: -12, felony: true, verb: 'drug trafficking' },
  loansharking: { name: 'Loansharking', minAge: 18, sentence: [1, 6], conviction: 0.7, karma: -6, felony: true, verb: 'loansharking' },
  fencing: { name: 'Receiving stolen goods', minAge: 16, sentence: [1, 5], conviction: 0.75, karma: -4, felony: true, verb: 'receiving stolen goods' },
  street_racing: { name: 'Street racing', minAge: 14, sentence: [0, 0], conviction: 0.9, karma: -2, felony: false, verb: 'street racing' },
  nolicense: { name: 'Driving without a license', minAge: 10, sentence: [0, 0], conviction: 0.9, karma: -1, felony: false, verb: 'driving without a license' },
};
const SOLO_CRIMES = ['shoplift', 'pickpocket', 'vandalism', 'burglary', 'car_theft', 'drugs', 'hacking', 'scam', 'bank', 'heist', 'embezzle'];

const PRISON_NAMES = ['Ironwood Correctional', 'Blackwater State Prison', 'Granite Ridge Penitentiary', 'Coldbrook Detention Center', 'Saltmarsh Correctional Facility', 'Redstone Federal Prison', 'Hollow Pines Penitentiary'];
const JUVIE_NAMES = ['Maple Grove Youth Center', 'Bright Futures Juvenile Hall', 'Cedar Hill Youth Facility'];
const GANGS = ['the Iron Saints', 'the Brick Kings', 'the Pale Wolves', 'the Red Ravens', 'the Dust Vipers'];

// The prison economy. cost: US-baseline dollars for one lot from the yard dealer.
// lot: units per purchase (lotName says it in words). risk: odds a guard catches you
// dealing it (grows with how much you move). serious: getting caught with it can add
// time. juvie: sold in juvie too.
const CONTRABAND = {
  noodles: { name: 'Instant noodles', emoji: '🍜', lot: 10, lotName: '10 packs of instant noodles', cost: 25, risk: 0.03, juvie: true },
  candy: { name: 'Candy bars', emoji: '🍫', lot: 5, lotName: '5 candy bars', cost: 30, risk: 0.04, juvie: true },
  hooch: { name: 'Hooch', emoji: '🍶', lot: 1, lotName: 'a bag of hooch', cost: 40, risk: 0.08 },
  shiv: { name: 'Shiv', emoji: '🔪', lot: 1, lotName: 'a shiv', cost: 120, risk: 0.12, serious: true },
  phone: { name: 'Smuggled phone', emoji: '📱', lot: 1, lotName: 'a smuggled phone', cost: 900, risk: 0.15, serious: true },
};
const CONTRABAND_IDS = Object.keys(CONTRABAND);

const LAWYERS = [
  { id: 'public', name: 'Public defender', emoji: '👔', cost: 0, bonus: 0 },
  { id: 'cheap', name: 'Budget attorney', emoji: '👔', cost: 4000, bonus: 0.08 },
  { id: 'good', name: 'Experienced attorney', emoji: '💼', cost: 25000, bonus: 0.18 },
  { id: 'elite', name: 'Elite defense team', emoji: '🦈', cost: 150000, bonus: 0.32 },
];
