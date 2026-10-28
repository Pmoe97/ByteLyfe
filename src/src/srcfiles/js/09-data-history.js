/* =====================================================================
 * 09-data-history.js — the real world, as data: the events of 1900 to 2025 that the
 * game lives through (88-world.js reads them). Pure data, no logic at load beyond
 * registering rows and two diseases.
 *
 * H(id, {
 *   name, emoji, chip (short name for the header), kind: 'econ' | 'war' | 'pandemic' | 'disaster' | 'moment' | 'unrest',
 *   years: [from, to],             the years it is going on
 *   yearsBy: { cc: [from, to] },   a country where it starts or ends at another time
 *   where: 'all' | ['us', ...],    who lives through it
 *   cities: ['us:Miami', ...],     a local event: only there (cityKey form); where is then ignored
 *   sev: { cc: n, _: n },          how hard it hits each country (1 = full; _ is everyone not named)
 *   curve: [n, ...],               how strong it is in each year from years[0] (default all 1)
 *   fx: { jobs, layoff, cut, pay, housing, living, rates, tax, mood },
 *                                  numbers a year of this event adds to the game. A number is multiplied by the curve
 *                                  and by sev; an array is one value per year (times sev) and ignores the curve.
 *       jobs     job-board odds, as a share (-0.45: nearly half the openings vanish)
 *       layoff   yearly chance a job is lost       cut  a one-time pay cut, as a share of salary
 *       pay      added to the yearly raise (negative: pay falls)
 *       housing  added to a city's yearly change in rents and home prices
 *       living   living costs, as a share     rates  added to savings and bond yields, and to new loans
 *       tax      added to the income tax rate     mood  happiness, each year
 *   cats: { knob: { jobCat: multiplier } }   how much of a knob each kind of job gets (04-data-careers.js JOB_CATS)
 *   market: { year: return }, marketCc: { cc: { year: return } }   the stock market's return, by year
 *   crypto: { year: return }       and crypto's
 *   fxShock: { CUR: share }        a currency's strength that year (a number or an array, like fx)
 *   biz: { industry: share }       demand for a business industry (08-data-business.js)
 *   disease: { id, odds, ages, npc: [[lo, hi, odds], ...] }   an illness: your chance of catching it, and each year's
 *                                  chance that someone you know of that age dies of it
 *   blast: { home, hurt, dead, npc }, cause   a local disaster's yearly odds: your home damaged, you hurt, you killed,
 *                                  somebody you know in that place killed
 *   closed: ['travel', 'nightlife', 'gambling', 'gym', 'school']   what shuts down while the strength is 0.5 or more
 *   furlough: ['uk', ...]          where a layoff is a pay cut to 80% instead
 *   support: { cc: usd | [usd, ...] }   a payment to every adult
 *   cash: { year: share }          a share of cash and savings lost that year
 *   war: { cc: { name, foe, foeAdj, theater, years, intensity, draft: [from, to], draftAges, draftWomen: [from, to],
 *               civil, result: 'victory' | 'defeat' | 'ceasefire', end, open } }   the war a country fights (59-military.js)
 *   open / openBy: { cc: ... }: { title, text, kid }   what you are told the first time you live through it
 *   yearly: [...]  a line for the log in later years   close: the line the year after it ends
 *   news: [[head, body], ...]      the paper   blurb: one sentence for the World sheet
 * })
 * Real events, wars and places are named; real people never are (say "the president"). Nothing in
 * here makes light of a tragedy or takes a side in a civil war, and nothing is keyed on race,
 * ethnicity or religion.
 * ===================================================================== */

const HIST_FROM = 1900, HIST_TO = 2025;
const HIST = {};
const HIST_IDS = [];
function H(id, def) {
  def.id = id;
  HIST[id] = def;
  if (!HIST_IDS.includes(id)) HIST_IDS.push(id);
  return def;
}

// The two illnesses of the history table: never caught at random, only in their years (88-world.js).
// ageMult is read by bodyTick (19-health.js): a yearly chance of death scaled by age.
DISEASES.flu1918 = { art: 'the', name: '1918 flu', emoji: '🤒', ages: [0, 120], w: 0, sev: 12, happy: -6, dur: 1, cure: 0.8, fatal: 0.03, cause: 'the 1918 flu', ageMult: [[0, 4, 1.5], [5, 19, 0.6], [20, 39, 2.2], [40, 64, 1], [65, 120, 1.5]] };
DISEASES.covid = { art: '', name: 'COVID-19', noun: 'COVID-19', emoji: '😷', ages: [0, 120], w: 0, sev: 5, happy: -4, dur: 1, cure: 0.93, fatal: 0.002, cause: 'COVID-19', vax: 0.25, ageMult: [[0, 39, 0.1], [40, 59, 2], [60, 69, 8], [70, 79, 20], [80, 120, 50]] };

/* ---- the Great Depression ------------------------------------------------------------- */
H('depression', {
  name: 'the Great Depression', chip: 'Depression', emoji: '🏚️', kind: 'econ',
  years: [1929, 1939], where: 'all',
  sev: { us: 1, de: 1, ca: 0.95, au: 0.9, br: 0.7, uk: 0.65, mx: 0.6, ie: 0.6, fr: 0.6, it: 0.6, jp: 0.5, es: 0.5, se: 0.5, _: 0.4 },
  curve: [0.3, 0.7, 1, 1, 0.9, 0.7, 0.6, 0.5, 0.6, 0.5, 0.3],
  fx: { jobs: -0.45, layoff: 0.12, cut: 0.1, pay: -0.03, housing: -0.06, living: -0.08, mood: -2 },
  cats: { layoff: { public: 0.3, education: 0.4, health: 0.5 }, jobs: { public: 0.4, education: 0.5, health: 0.5 } },
  market: { 1929: -0.10, 1930: -0.25, 1931: -0.43, 1932: -0.08, 1933: 0.54, 1934: -0.01, 1935: 0.48, 1936: 0.34, 1937: -0.35, 1938: 0.31, 1939: -0.01 },
  open: { title: 'The crash', text: 'In October the stock market collapsed, and the banks, factories and farms followed. Prices are falling, wages are falling, and jobs are scarce. Hold on to the one you have.', kid: 'The grown-ups talk about money in low voices now. There is less of everything at home.' },
  yearly: [
    'Lines for a bowl of soup wind around the block, and the people in them were bankers last year.',
    'Another bank has closed its doors. People line up outside to learn whether their savings are still there.',
    'Nothing is thrown away. Everything is mended, and then mended again.',
    'Everyone knows a family that lost the house. Nobody says it out loud.',
    '{Men|Whole families} wait at the factory gate before dawn, in case someone does not turn up.',
  ],
  close: 'The Depression is over at last, driven out by the war economy. Nobody quite trusts good times any more.',
  news: [
    ['Banks close their doors as customers demand their savings', 'Hundreds of depositors lined up before dawn. Officials say the banks are sound. The depositors are not convinced.'],
    ['Factory announces another round of layoffs', 'Management blamed "conditions." Workers blamed management. Both pointed at the empty order book.'],
    ['Soup kitchens report record crowds', 'Volunteers say they are feeding twice as many people as last winter, and running out of everything but pots.'],
    ['Farm prices fall below the cost of growing', 'Some farmers are leaving crops in the field. "It costs more to bring it in than it will sell for," one said.'],
    ['Government unveils a program of public works', 'Roads, dams and bridges will give work to thousands of men. Nobody expects it to be enough, and everybody is glad to have it.'],
  ],
  blurb: 'A long economic collapse: jobs are scarce, pay is falling, and the banks are not safe.',
});

/* ---- the Second World War ------------------------------------------------------------- */
H('ww2', {
  name: 'the Second World War', chip: 'World War II', emoji: '🌍', kind: 'war',
  years: [1939, 1945], yearsBy: { jp: [1937, 1945], us: [1941, 1945], ph: [1941, 1945], it: [1940, 1945] }, where: 'all',
  sev: { uk: 1, de: 1, fr: 1, jp: 1, ph: 1, kr: 0.8, us: 0.9, it: 0.9, ca: 0.7, au: 0.7, in: 0.5, za: 0.5, se: 0.35, ie: 0.35, ng: 0.3, mx: 0.3, br: 0.3, es: 0.3 },
  curve: [0.6, 0.9, 1, 1, 1, 1, 0.7],
  fx: { jobs: 0.12, pay: 0.015, living: 0.12, mood: -2.5 },
  market: { 1939: -0.01, 1940: -0.10, 1941: -0.12, 1942: 0.20, 1943: 0.26, 1944: 0.20, 1945: 0.36 },
  war: {
    uk: { name: 'the Second World War', foe: 'the Axis powers', foeAdj: 'Axis', theater: 'Europe and North Africa', years: [1939, 1945], intensity: 4, draft: [1939, 1945], draftAges: [18, 41], draftWomen: [1942, 1945], result: 'victory',
      end: 'The war in Europe ended in May, and in the Pacific in August. There were street parties on every street in the country, and nearly every family had somebody who did not come home.' },
    us: { name: 'the Second World War', foe: 'the Axis powers', foeAdj: 'Axis', theater: 'Europe and the Pacific', years: [1941, 1945], intensity: 4, draft: [1941, 1945], draftAges: [18, 37], result: 'victory',
      end: 'The war ended in victory, over a long summer. Soldiers came home to parades, and to a country that was suddenly very rich and very tired.' },
    de: { name: 'the Second World War', foe: 'the Allies', foeAdj: 'Allied', theater: 'Europe', years: [1939, 1945], intensity: 4, draft: [1939, 1945], draftAges: [18, 45], result: 'defeat',
      end: 'The war is over, and Germany has lost it. The cities are rubble and the country is occupied. Nobody has a plan for tomorrow beyond finding something to eat.' },
  },
  openBy: {
    uk: { title: 'Britain is at war', text: 'On the third of September the prime minister announced it on the radio: Britain is at war with Germany. Gas masks have been handed out, the blackout begins tonight, and every household is asked to do its part.', kid: 'The adults listened to the radio in silence. Then your school was told it would be moved to the countryside.' },
    us: { title: 'War', text: 'Japan has attacked Pearl Harbor, and the United States is at war. Factories turn to tanks and aircraft, the draft widens, and nearly everyone will be touched by it.', kid: 'The whole country listened to the radio, and nobody turned it off. Your family keeps a map on the wall now.' },
    de: { title: 'War', text: 'Germany is at war. The newspapers say it will be quick. Ration cards are issued, young men are called up, and nobody is certain what the end of it will be.', kid: 'Fathers and older brothers are leaving in uniform. Your mother holds your hand a little tighter than she used to.' },
  },
  open: { title: 'The world is at war', text: 'War has spread across the world. Armies are on the move, and the effects reach far beyond the fighting: rationing, shortages, young men gone, and a constant fear about the news.', kid: 'The grown-ups talk about the war all the time, and about the people who are far away.' },
  yearly: [
    'Ration books are as good as money. Nothing goes to waste.',
    'Another telegram came to your street this week.',
    'Everyone knows someone who is away. The first thing anyone asks is whether there is news.',
    'You learned to make a meal out of almost nothing.',
    'The radio is on from morning until night.',
  ],
  close: 'The war is over, and the world is trying to remember what normal was. The shortages go on a good while longer.',
  news: [
    ['Rationing extended as shortages bite', 'Officials ask households to make do. "Waste is a gift to the enemy," a poster says.'],
    ['Factories turn out record numbers for the war effort', 'Production has doubled in a year, and there are jobs for nearly anyone who wants one.'],
    ['Casualty lists published', 'The names run to several columns. Families gather at the newsstand before it opens.'],
    ['Scrap drive collects tons of metal', 'Children went door to door for pots, pans and railings. "Every little bit helps," said an organizer.'],
    ['Peace talks begin', 'Delegates arrived on Monday. Nobody would say how long they expected to stay.'],
  ],
  blurb: 'A world war: young men are called up, goods are rationed, and every family has someone to worry about.',
});

/* ---- COVID-19 --------------------------------------------------------------------------- */
H('covid', {
  name: 'the COVID-19 pandemic', chip: 'COVID-19', emoji: '😷', kind: 'pandemic',
  years: [2020, 2022], where: 'all',
  sev: { us: 1, uk: 1, it: 1, es: 1, fr: 1, br: 1.1, mx: 1.1, in: 1, de: 0.9, ca: 0.9, ie: 0.9, se: 0.9, za: 0.9, ph: 0.9, au: 0.7, jp: 0.7, kr: 0.7, ng: 0.7 },
  curve: [1, 0.7, 0.35],
  fx: { jobs: [-0.3, 0.05, 0.1], layoff: [0.1, 0.04, 0.01], pay: [-0.005, 0.005, 0.015], housing: [0, 0.08, 0.04], mood: [-3, -2, -0.5] },
  cats: {
    layoff: { service: 2, fame: 2.5, sports: 2.5, transport: 1.5, tech: 0.1, office: 0.3, business: 0.4, education: 0.3, public: 0.2, health: 0.2 },
    jobs: { service: 1.5, fame: 1.8, sports: 1.8, transport: 1.2, tech: -0.2, office: 0.3, business: 0.5, health: -0.5 },
  },
  market: { 2020: 0.18, 2021: 0.29 },
  disease: { id: 'covid', odds: [0.14, 0.30, 0.55], npc: [[0, 39, 0.0006], [40, 59, 0.004], [60, 69, 0.012], [70, 79, 0.03], [80, 120, 0.07]] },
  closed: ['travel', 'nightlife', 'gambling', 'gym', 'school'],
  furlough: ['uk', 'ie', 'ca', 'au', 'de', 'fr', 'it', 'es', 'se', 'jp', 'kr'],
  support: { us: [1200, 2000, 0], jp: [900, 0, 0], br: [120, 80, 0], za: [60, 0, 0], ph: [100, 0, 0], in: [30, 0, 0], mx: [40, 0, 0], ng: [30, 0, 0] },
  open: { title: 'The world stops', text: 'A new virus is spreading around the world, and countries are shutting down. Travel stops, shops and schools close, and everyone is told to stay home. Nobody knows how long it will last.', kid: 'School is cancelled and nobody can go out. Everyone at home is worried, and trying not to show it.' },
  yearly: [
    'Masks, hand sanitizer, and a great many video calls.',
    'Everyone has an opinion about the rules, and most of them are strong.',
    'You have stopped being surprised by the word "unprecedented."',
    'You know the names of all your neighbors now, from waving across the street.',
  ],
  close: 'The worst of the pandemic is over. The masks are in a drawer, and nobody is quite sure how they feel about the last three years.',
  news: [
    ['Cities go quiet as restrictions begin', 'Streets that were packed a week ago are nearly empty. Shops are closed, and offices are working from kitchen tables.'],
    ['Shelves empty as shoppers stock up', 'Pasta, flour and toilet paper went first. Stores have put a limit on each customer.'],
    ['Hospitals strained as cases rise', 'Staff are working double shifts. "We are asking everyone to stay home," a doctor said, "so that we can look after the ones who cannot."'],
    ['First vaccines approved', 'Officials called it "a turning point." The first doses will go to the oldest and to the people who care for them.'],
    ['Restrictions ease, cautiously', 'Restaurants and theaters are opening at half capacity. Many people said they will wait and see.'],
  ],
  blurb: 'A pandemic: lockdowns, closed shops and schools, layoffs in service work, and a dangerous illness that is hardest on the old.',
});
