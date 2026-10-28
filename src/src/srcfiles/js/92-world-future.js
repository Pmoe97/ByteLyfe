/* =====================================================================
 * 92-world-future.js — the years after the table (2026 to HIST_END), made up for each family line.
 *
 * s.world.seed (88-world.js worldOf) names a future: the same seed always gives the same list of events, so a saved life comes
 * back to the same world. worldAt (88-world.js) asks worldFutureUse(s) for the ids of the generated rows when the year is past
 * the table. They are ordinary history rows (see 09-data-history.js), put in HIST but not in HIST_IDS, so only a life with that
 * seed ever sees them. What is generated:
 *   - a recession about every 8 to 12 years, one to three years long, with a rebound, sometimes followed by a boom;
 *   - a pandemic about once in 60 years (never closer than 25), with its own illness, milder than 1918;
 *   - one or two disasters a year somewhere in the world, by the traits of the city (a coast floods and storms, a snowy place
 *     gets blizzards, the rest heat, fire or a quake).
 * The names are made up ("the Slump of 2041", "the 2058 flu"), never a real event. Random wars stay as they were
 * (59-military.js), and a year this file owns has no random stock-market crash of its own (37-market.js).
 * ===================================================================== */

let FUT = null; // { seed, ids }: the future of the family line that is playing now
const FUT_MADE = {}; // seed -> ids, so switching lives does not make the same future twice

function futureRng(seed) {
  let a = (seed >>> 0) || 1;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// The future of this family line, made the first time it is asked for.
function worldFutureUse(s) {
  const w = worldOf(s);
  if (!w.seed) w.seed = 1 + Math.floor(rand() * 2147483000);
  if (!FUT || FUT.seed !== w.seed) FUT = { seed: w.seed, ids: FUT_MADE[w.seed] || (FUT_MADE[w.seed] = futureGenerate(w.seed)) };
  return FUT;
}

const FUT_RECESSION_NAMES = ['the Slump of {y}', 'the {y} Downturn', 'the Contraction of {y}', 'the {y} Credit Crunch', 'the Bust of {y}'];
const FUT_BOOM_NAMES = ['the Boom of {y}', 'the {y} Expansion', 'the Good Years from {y}'];
const FUT_PANDEMIC_WORDS = ['flu', 'fever', 'outbreak', 'sickness'];
const FUT_FURLOUGH = ['uk', 'ie', 'ca', 'au', 'de', 'fr', 'it', 'es', 'se', 'jp', 'kr'];

// What a kind of disaster is, and what the city is like to get it.
const FUT_DISASTERS = {
  flood: { name: 'flood', emoji: '🌊', cause: 'the flood', blast: { home: 0.3, hurt: 0.04, dead: 0.003, npc: 0.006 }, dip: 0.08, mood: 1.5,
    text: 'After days of rain, the water has come up into the streets of {c}. Ground floors and cellars are flooded, and people are being taken out of their homes by boat.', kid: 'It rained for days, and now the water is in our street.', head: 'Floods in {c}', body: 'Thousands of homes are under water. Neighbors are helping each other, and the clean-up will take months.' },
  storm: { name: 'storm', emoji: '🌀', cause: 'the storm', blast: { home: 0.4, hurt: 0.06, dead: 0.004, npc: 0.008 }, dip: 0.1, mood: 2,
    text: 'A storm has come ashore at {c}, with winds that have taken roofs and trees and a good part of the waterfront. The power is out and the roads are blocked.', kid: 'The wind was very loud all night, and in the morning there were trees on the road.', head: 'Storm hits {c}', body: 'Roofs are gone and the power is out. Crews are working to clear the roads.' },
  heat: { name: 'heat wave', emoji: '🥵', cause: 'the heat wave', blast: { hurt: 0.05, dead: 0.002, npc: 0.012 }, dip: 0, mood: 1,
    text: 'The temperature in {c} has been far above anything recorded, for days. Hospitals are full, and the old and the ill are at risk. People are sleeping on balconies and in cool basements.', kid: 'It is so hot that we sit in the shade all day and nobody can sleep.', head: 'Record heat in {c}', body: 'Hospitals are full and cooling centers are open all night. Neighbors are being asked to look in on the elderly.' },
  fire: { name: 'wildfire', emoji: '🔥', cause: 'the wildfire', blast: { home: 0.25, hurt: 0.04, dead: 0.002, npc: 0.005 }, dip: 0.06, mood: 1.5,
    text: 'A wildfire has swept out of the hills toward {c}. The sky is orange, ash is falling like snow, and whole neighborhoods have been told to leave.', kid: 'The sky is orange, and we had to leave the house in the night.', head: 'Wildfire reaches {c}', body: 'Thousands have been evacuated. Smoke covers the city, and firefighters are holding the line.' },
  quake: { name: 'earthquake', emoji: '🏚️', cause: 'the earthquake', blast: { home: 0.3, hurt: 0.1, dead: 0.006, npc: 0.015 }, dip: 0.1, mood: 2.5,
    text: 'The ground under {c} shook for a long minute. Buildings have fallen, the roads are cracked, and people are sleeping outside because they are afraid of the aftershocks.', kid: 'The ground shook, and now we sleep outside.', head: 'Earthquake in {c}', body: 'Rescue crews are digging through rubble. The full count of the damage is still not known.' },
  blizzard: { name: 'blizzard', emoji: '❄️', cause: 'the blizzard', blast: { home: 0.04, hurt: 0.04, dead: 0.002, npc: 0.004 }, dip: 0.02, mood: 1.2,
    text: 'A blizzard has buried {c} under more snow than anyone can remember. The power is out in places, the roads are shut, and people are digging each other out.', kid: 'There is so much snow that the school is closed, and the cars are buried.', head: 'Blizzard buries {c}', body: 'Roads and rails are closed. Crews are working around the clock to clear them.' },
};

function futureGenerate(seed) {
  const R = futureRng(seed), ids = [];
  const pickR = (a) => a[Math.floor(R() * a.length)];
  const fill = (t, y, c) => t.replace(/\{y\}/g, y).replace(/\{c\}/g, c || '');
  const reg = (id, row) => { row.id = id; row.future = true; HIST[id] = row; ids.push(id); return row; };
  const r2 = (x) => Math.round(x * 100) / 100;
  const pre = 'f' + seed + '_';

  // Recessions, and sometimes a boom after one.
  for (let y = HIST_TO + 1 + Math.floor(R() * 8); y < HIST_END - 4; y += 8 + Math.floor(R() * 5)) {
    const n = 1 + Math.floor(R() * 3), sev = 0.5 + R() * 0.7, span = n + 1; // the downturn, then a year of rebound
    const down = (a) => Array.from({ length: span }, (_, i) => (i < n ? a * Math.pow(0.75, i) : 0));
    const rebound = (a) => Array.from({ length: span }, (_, i) => (i === n ? a : 0));
    const sum = (a, b) => a.map((x, i) => r2(x + b[i]));
    const sevs = {}; for (const cc of COUNTRY_IDS) sevs[cc] = r2(0.6 + R() * 0.6);
    const crash = -(0.15 + R() * 0.25);
    const market = { [y]: r2(crash) };
    if (n >= 2) market[y + 1] = r2(-0.05 + R() * 0.12);
    market[y + n] = r2(0.15 + R() * 0.12);
    reg(pre + y + '_slump', {
      name: fill(pickR(FUT_RECESSION_NAMES), y), chip: 'Recession', emoji: '📉', kind: 'econ', years: [y, y + n], where: 'all', sev: Object.assign({ _: 1 }, sevs),
      fx: { jobs: sum(down(-0.3), rebound(0.07)), layoff: sum(down(0.07), rebound(0)), cut: down(0.03), pay: sum(down(-0.015), rebound(0.01)), housing: sum(down(-0.07), rebound(0.03)), rates: sum(down(-0.01), rebound(0)), mood: sum(down(-1.5), rebound(0.5)) },
      cats: { layoff: { _: 1, public: 0.3, health: 0.3, education: 0.4 }, jobs: { _: 1, public: 0.3, health: 0.2, education: 0.4 } },
      market, crypto: { [y]: -0.55, [y + n]: 0.9 },
      open: { title: fill('The {y} downturn', y), text: pickR(['The economy has turned. Orders are falling, hiring has stopped, and the news is full of the word "recession." People are keeping their money close and their jobs closer.', 'A wave of defaults has hit the banks, and credit has dried up. Businesses are cutting staff, house prices are slipping, and everyone knows someone who has been let go.', 'Orders have dried up, and one company after another is announcing layoffs. It is the worst downturn in years.']), kid: 'The grown-ups are tense about money, and there are fewer treats than there used to be.' },
      yearly: ['Nobody you know is hiring, and a few people you know are looking.', 'Everyone is talking about prices, jobs, or both.', 'The shop on the corner has a sign in the window: "Closing soon. Thank you."'],
      close: 'The worst is over. The recovery is slow, and people are still careful with money.',
      news: [['Layoffs spread', 'Companies across many industries announced job cuts this week. Economists expect the trend to continue.'], ['Markets fall', 'Share prices dropped sharply. Analysts said it is too early to say when they will recover.'], ['Signs of recovery', 'Hiring has ticked up for the first time in months. Economists are cautious about calling the bottom.']],
      blurb: 'A recession: fewer jobs, falling home prices, and a crash in the markets.',
    });
    if (R() < 0.3) {
      const by = y + n + 1, bn = Math.min(3 + Math.floor(R() * 3), HIST_END - by + 1), bm = {};
      for (let i = 0; i < bn; i++) bm[by + i] = r2(0.1 + R() * 0.15);
      reg(pre + by + '_boom', {
        name: fill(pickR(FUT_BOOM_NAMES), by), chip: 'Boom', emoji: '📈', kind: 'econ', tone: 'good', years: [by, by + bn - 1], where: 'all',
        fx: { jobs: 0.12, pay: 0.015, housing: 0.04, mood: 0.5 }, market: bm,
        open: { title: fill('The good years', by), text: 'The economy is growing, and it shows. Employers are hiring, wages are rising, and people feel like they can plan.', kid: 'The grown-ups are in a good mood about money.' },
        yearly: ['Everyone you know seems to be getting a raise, or a better job, or both.'],
        close: 'The boom has slowed down. It was good while it lasted.',
        news: [['Hiring at a record', 'Employers are struggling to fill jobs. Many are offering more to get people to apply.']],
        blurb: 'A boom: plenty of jobs, rising pay, and growing home prices.',
      });
    }
  }

  // Pandemics: about one in sixty years, never within twenty-five of the last.
  let lastPan = -99;
  for (let y = HIST_TO + 3; y < HIST_END - 3; y++) {
    if (R() >= 1 / 60 || y - lastPan < 25) continue;
    lastPan = y;
    const word = pickR(FUT_PANDEMIC_WORDS), did = 'pan' + seed + '_' + y;
    DISEASES[did] = { art: 'the', name: `${y} ${word}`, emoji: '😷', ages: [0, 120], w: 0, sev: 5, happy: -4, dur: 1, cure: 0.9, fatal: 0.001, cause: `the ${y} ${word}`, vax: 0.3, ageMult: [[0, 39, 0.2], [40, 59, 1.5], [60, 69, 5], [70, 79, 12], [80, 120, 25]] };
    const support = {}; for (const cc of ['us', 'jp', 'br', 'za', 'ph', 'in', 'mx', 'ng']) support[cc] = [cc === 'us' ? 800 : 60, 0, 0];
    reg(pre + y + '_pandemic', {
      name: `the ${y} ${word}`, chip: 'Pandemic', emoji: '😷', kind: 'pandemic', years: [y, y + 2], where: 'all', pandemic: true,
      curve: [1, 0.6, 0.3],
      fx: { jobs: [-0.18, 0.04, 0.06], layoff: [0.06, 0.02, 0.01], pay: [0, 0.005, 0.01], housing: [0, 0.05, 0.03], mood: [-2.5, -1.5, -0.4] },
      cats: { layoff: { service: 2, fame: 2, sports: 2, transport: 1.4, tech: 0.2, office: 0.4, business: 0.5, education: 0.4, public: 0.2, health: 0.2 }, jobs: { service: 1.4, fame: 1.6, sports: 1.6, transport: 1.2, tech: -0.2, office: 0.3, business: 0.5, health: -0.4 } },
      market: { [y]: r2(-0.1 - R() * 0.15), [y + 1]: r2(0.15 + R() * 0.1) },
      disease: { id: did, odds: [0.12, 0.22, 0.12], guards: [{ flag: 'vaxd', mult: 0.5 }], npc: [[0, 39, 0.0003], [40, 59, 0.002], [60, 69, 0.006], [70, 79, 0.015], [80, 120, 0.035]] },
      closed: ['travel', 'nightlife', 'gym', 'gambling'], furlough: FUT_FURLOUGH, support,
      open: { title: `The ${y} ${word}`, text: 'A new illness is spreading across the world. Borders close, shops and schools shut, and people are told to stay home until the doctors understand what they are dealing with.', kid: 'School is closed and everyone has to stay at home. The grown-ups are worried.' },
      yearly: ['The shops have rules, and so does the street.', 'Everyone has stories about the first weeks, and nobody wants to tell them again.'],
      close: `The ${word} has faded. The masks are in a drawer, and the memory is still fresh.`,
      news: [['Borders close as the illness spreads', 'Airlines have grounded most of their flights. Officials said the next few weeks will be difficult.'], ['A vaccine is on the way', 'The first doses will go to the oldest and the people who care for them.'], ['Restrictions are lifted', 'Shops and theaters have opened again, with care. Many people said they will wait and see.']],
      blurb: 'A new illness: lockdowns, closed shops and schools, layoffs in service work, and a danger that is greatest for the old.',
    });
  }

  // Disasters: one or two a year, somewhere.
  const cities = [];
  for (const cc of COUNTRY_IDS) for (const name in CITY_INFO[cc]) cities.push([cc, name, CITY_INFO[cc][name]]);
  for (let y = HIST_TO + 1; y < HIST_END - 2; y++) {
    const n = R() < 0.55 ? 1 : R() < 0.7 ? 2 : 0;
    for (let k = 0; k < n; k++) {
      const [cc, name, info] = pickR(cities), tr = info.traits || [];
      const type = tr.includes('coast') || tr.includes('beach') ? pickR(['flood', 'storm', 'flood', 'storm', 'heat']) : tr.includes('snow') ? pickR(['blizzard', 'blizzard', 'flood', 'heat']) : pickR(['heat', 'fire', 'quake', 'flood', 'fire']);
      const D = FUT_DISASTERS[type], id = pre + y + '_' + type + '_' + (k + 1);
      if (HIST[id]) continue;
      const row = histDisasterRow({
        name: `the ${y} ${name} ${D.name}`, chip: cap(D.name), emoji: D.emoji, year: y, places: { [cc + ':' + name]: 1 }, blast: D.blast, cause: D.cause, dip: D.dip, mood: D.mood,
        text: fill(D.text, y, name), kid: D.kid, head: fill(D.head, y, name), body: D.body, blurb: `A ${D.name} strikes ${name}.`,
      });
      reg(id, row);
    }
  }
  return ids;
}
