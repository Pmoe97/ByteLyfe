/* =====================================================================
 * 09-data-history-4.js — country events, part two (the format is at the top of 09-data-history.js): France,
 * Germany, Italy, Spain and Sweden. The two world wars, the Cold War and the 2008 and euro crises are in the
 * headline files; these belong to one country. City disasters are in 09-data-history-6.js. Pure data.
 * ===================================================================== */

/* ---- France ------------------------------------------------------------------------------------------------- */
H('fr_occupation', {
  name: 'the Occupation', chip: 'The Occupation', emoji: '🥖', kind: 'unrest', popup: true,
  years: [1940, 1944], where: ['fr'], fx: { jobs: -0.2, living: 0.25, mood: -3 }, curve: [1, 1, 1, 1, 0.8],
  open: { title: 'The Occupation', text: 'German troops have marched into Paris, and most of the country is under their rule. There are curfews, ration cards, requisitions, and soldiers in the café. People choose, every day, what to say and to whom.', kid: 'There are soldiers in the street, and the grown-ups lower their voices when they talk.' },
  yearly: ['There are not enough potatoes. There is not enough of anything.', 'Everyone has become careful about what they say, and to whom.'],
  close: 'The Occupation is over. There are flags in every window and a great many people looking at each other, and wondering.',
  news: [['New regulations announced', 'Curfew now begins at nine. Notices were posted on every wall.'], ['Ration cards reduced again', 'The bread ration has been cut. Queues began forming before dawn.'], ['The city is liberated', 'Crowds filled the streets. People climbed on the tanks, and some cried, and some did both.']],
  blurb: 'Foreign troops in the streets, curfews and ration cards. Everyone chooses what to say, and to whom.',
});
H('indochina', {
  name: 'the war in Indochina', chip: 'Indochina', emoji: '🎖️', kind: 'war', popup: false,
  years: [1946, 1954], where: ['fr'], fx: { mood: -0.5 },
  war: { fr: { name: 'the war in Indochina', foe: 'the independence forces', foeAdj: 'opposing', theater: 'Indochina', years: [1946, 1954], intensity: 2, result: 'defeat', end: 'A great defeat in the mountains ended the war. France left Indochina, and the soldiers, and the families who had gone, came home to a country that did not much want to talk about it.' } },
  open: { title: 'A war far away', text: 'France is fighting a war in Indochina, with a professional army. It is a long way away, and it goes on for years, and most people at home hardly notice. Those who have a son there notice very much.', kid: 'Uncle is away in a war, and there are letters, and the grown-ups do not say much.' },
  news: [['Reinforcements sent', 'Another ship sailed from the south coast. The war is in its fifth year.'], ['A great battle lost', 'The garrison fell after a long siege. The government said it will negotiate.']],
  blurb: 'A long war overseas fought by professional soldiers.',
});
H('algeria', {
  name: 'the Algerian War', chip: 'Algeria', emoji: '🎖️', kind: 'war', popup: true,
  years: [1954, 1962], where: ['fr'], fx: { mood: -1 },
  war: { fr: { name: 'the Algerian War', foe: 'the independence forces', foeAdj: 'opposing', theater: 'Algeria', years: [1954, 1962], intensity: 3, draft: [1956, 1962], draftAges: [20, 27], result: 'defeat', end: 'Algeria became independent in the summer. Hundreds of thousands of people crossed the sea in a few months, and the conscripts came home to a country that wanted to forget.' } },
  open: { title: 'The war in Algeria', text: 'France is at war in Algeria, and from now on that means conscripts: young men called up and sent across the sea. It is not called a war. Everyone calls it one.', kid: 'Older boys in the village are called up and sent across the sea, and the grown-ups call it "the events."' },
  yearly: ['A conscript came home on leave, and did not say a word about it.', 'The newspapers use a different word every year for what is happening.'],
  close: 'The war is over, and so is the French Algeria. People are not talking about it.',
  news: [['Call-up extended', 'Conscripts will serve longer. Parents have written to their deputies.'], ['Demonstrators in the capital', 'Thousands marched in protest, and police charged the crowd.'], ['Ceasefire announced', 'The government said the fighting would stop at noon. Nobody was quite sure what would come next.']],
  blurb: 'A war overseas that is not called a war. Young men are conscripted for it.',
});
H('may_68', {
  name: 'May 1968', chip: 'May 1968', emoji: '✊', kind: 'unrest', popup: true,
  years: [1968, 1968], where: ['fr'], closed: ['school'], fx: { pay: [0.1], mood: [0.5] }, cats: { pay: { _: 0.6, service: 1.5 } },
  open: { title: 'May 1968', text: 'Students have taken to the streets, and then the workers joined them. The universities and the schools are shut, the factories are on strike, and for a few weeks nothing is running. When it ends, wages are a third higher.', kid: 'School is cancelled, and there are barricades in the streets of the big cities.' },
  news: [['Paris in the streets', 'Barricades were built in the Latin Quarter. Police cleared them, and the students built more.'], ['Wage agreement signed', 'The minimum wage will rise by a third. Strikers voted to go back to work.']],
  blurb: 'Students and workers shut the country down. Wages jump.',
});

/* ---- Germany --------------------------------------------------------------------------------------------------- */
H('de_hyperinflation', {
  name: 'hyperinflation', chip: 'Hyperinflation', emoji: '💸', kind: 'econ',
  years: [1922, 1923], where: ['de'], cash: { 1922: 0.5, 1923: 0.99 }, fx: { living: [0.3, 1], mood: [-2, -5], jobs: [-0.05, -0.25] },
  open: { title: 'Money melts', text: 'Prices are rising by the hour. Wages are paid twice a day so that the money can be spent before it loses its value, and people carry it in wheelbarrows. Savings built over a lifetime will buy a loaf of bread. Property and goods are the only things that last.', kid: 'The grown-ups rush to the shops the minute they are paid, and bring the money home in bags.' },
  yearly: ['A loaf of bread costs a basket of money.', 'People burn banknotes in the stove because it is cheaper than coal.'],
  close: 'The new currency has arrived, and prices have stopped. Those who lost their savings are not going to forget it.',
  news: [['The dollar reaches a million marks', 'Shopkeepers stopped accepting cash. Workers were paid twice a day, and a rush to the shops began each time.'], ['A new currency announced', 'One new mark is worth a trillion of the old. People are waiting to see if it holds.']],
  blurb: 'The money loses its value every hour. Cash and savings are wiped out; goods and property survive.',
});
H('de_bombing', {
  name: 'the bombing of the cities', chip: 'The bombing', emoji: '🚨', kind: 'war', popup: true,
  years: [1942, 1945], cities: ['de:Hamburg', 'de:Cologne', 'de:Berlin', 'de:Dresden', 'de:Frankfurt', 'de:Munich', 'de:Stuttgart', 'de:Düsseldorf', 'de:Bremen', 'de:Leipzig'],
  citySev: { 'de:Hamburg': 1, 'de:Cologne': 1, 'de:Berlin': 1, 'de:Dresden': 0.9, 'de:Frankfurt': 0.8, 'de:Munich': 0.7, 'de:Stuttgart': 0.7, 'de:Düsseldorf': 0.8, 'de:Bremen': 0.8, 'de:Leipzig': 0.6 },
  curve: [0.3, 0.8, 1, 0.9], blast: { home: 0.3, hurt: 0.12, dead: 0.015, npc: 0.03 }, cause: 'an air raid', fx: { mood: -2 },
  open: { title: 'The air war', text: 'Every night now the bombers come. The sirens, the cellar, the sound of the planes, and in the morning another street is gone. People are moving out to the countryside, or to anywhere with a roof.', kid: 'You spend the nights in the cellar with the neighbors, listening to the sky.' },
  yearly: ['The cellar is where your family lives, more or less.', 'Another street at the end of the road is rubble, and the people have gone.'],
  close: 'The raids have stopped. The city is a field of ruins, and people are sorting bricks.',
  news: [['Another night of raids', 'The fires could be seen from the next town. Rescue workers searched through the morning.'], ['Evacuation extended', 'Children and mothers are being sent to the country. Trains were full before they left the station.']],
  blurb: 'Bombers every night. The cities are being destroyed.',
});
H('de_hard_years', {
  name: 'the hard years', chip: 'The hard years', emoji: '🥔', kind: 'econ', popup: true,
  years: [1946, 1948], where: ['de'], fx: { jobs: [-0.3, -0.3, -0.2], living: [0.25, 0.25, 0.15], mood: [-4, -3, -2] },
  open: { title: 'The hard years', text: 'The war is over, and there is no food, no coal and not much of a country. People travel to the farms to trade whatever they have for potatoes. The black market is the real market, and the cigarette is the real money.', kid: 'You are always hungry, and the grown-ups spend their days looking for something to trade.' },
  yearly: ['The winter was cold, and the coal ran out in January.', 'Everyone you know has traded something precious for something to eat.'],
  close: 'The worst is over. There is a new currency, and the shops are filling up.',
  news: [['The coldest winter in memory', 'Thousands are without heat. Officials are asking people to share rooms.'], ['Black market flourishes', 'Prices of goods outside the ration are ten times those inside. Police said there is little they can do.']],
  blurb: 'Ruins, hunger and a black market. Goods and cigarettes are worth more than money.',
});
H('de_currency_reform', {
  name: 'the currency reform', chip: 'New money', emoji: '💶', kind: 'moment', popup: true,
  years: [1948, 1948], where: ['de'], cash: { 1948: 0.9 }, fx: { mood: [1.5] },
  open: { title: 'New money', text: 'On a Sunday in June the old money was replaced with a new currency. Savings were wiped out, almost, and on Monday the shop windows were full of goods that nobody had been able to find for years.', kid: 'On Monday, the shop windows were suddenly full, and you all stared.' },
  news: [['The new mark is introduced', 'Every adult was given forty marks. Old money can be exchanged at a fraction of its worth.'], ['Shops fill overnight', 'Goods that had been hoarded appeared on the shelves. "It is a miracle," a shopkeeper said. Others said it was just a reform.']],
  blurb: 'A new currency: old savings are nearly worthless, and the shops fill overnight.',
});
H('wirtschaftswunder', {
  name: 'the economic miracle', chip: 'The miracle', emoji: '🏭', kind: 'econ', tone: 'good',
  years: [1950, 1966], where: ['de'], fx: { jobs: 0.3, pay: 0.03, housing: 0.04, mood: 1 },
  open: { title: 'The economic miracle', text: 'The factories are humming, the cities are being rebuilt, and everyone who wants a job has one. Pay is rising every year. People are buying their first washing machines and their first cars, and wondering how it happened so fast.', kid: 'The grown-ups are cheerful, and there is a lot of building going on everywhere.' },
  yearly: ['A crane is on every street, and a new apartment block is rising behind it.', 'You bought something this year that your parents could not have imagined buying.'],
  close: 'The miracle is over. There is a recession, and people are surprised, because they thought it would last.',
  news: [['Unemployment almost gone', 'Employers are recruiting workers abroad. The first guest workers arrived by train on Tuesday.'], ['Volkswagens on every street', 'The factory can not build them quickly enough. There is a waiting list of a year.']],
  blurb: 'Rebuilding, full employment, rising pay and the first cars.',
});

/* ---- Italy ---------------------------------------------------------------------------------------------------------- */
H('it_miracle', {
  name: 'the economic miracle', chip: 'The miracle', emoji: '🛵', kind: 'econ', tone: 'good', popup: false,
  years: [1958, 1963], where: ['it'], fx: { jobs: 0.3, pay: 0.04, housing: 0.05, mood: 1.5 },
  open: { title: 'The economic miracle', text: 'The factories of the north are hiring by the thousand, and people from the south are on the trains going up to find work. There are scooters, televisions and refrigerators in homes that had none, and everyone is on the move.', kid: 'The grown-ups are cheerful, and there is a television in the café.' },
  news: [['The north calls for workers', 'Trains are crowded with families from the south. The factories say they can take more.'], ['A scooter in every household', 'Sales have tripled. Parents are worried, and the young are delighted.']],
  blurb: 'Rapid growth: factories hiring, scooters, televisions, and migration north.',
});
H('it_lira_1992', {
  name: 'the 1992 lira crisis', chip: 'Lira crisis', emoji: '📉', kind: 'econ', popup: false,
  years: [1992, 1993], where: ['it'], fx: { rates: [0.05, 0.03], jobs: [-0.1, -0.1], mood: [-1, -0.5] },
  open: { title: 'The lira crisis', text: 'The lira has been thrown out of the exchange-rate system, interest rates have jumped, and the government has announced an emergency package. Taxes are going up, and so is the cost of a loan.', kid: 'The grown-ups are worried about the lira.' },
  news: [['Emergency budget announced', 'A one-time tax on bank accounts caught many by surprise. Savers lined up to complain.']],
  blurb: 'The lira falls, rates jump, and an emergency tax is announced.',
});

/* ---- Spain ----------------------------------------------------------------------------------------------------------- */
H('es_civil_war', {
  name: 'the Spanish Civil War', chip: 'Civil War', emoji: '🎖️', kind: 'war', popup: true,
  years: [1936, 1939], where: ['es'],
  war: { es: { name: 'the Spanish Civil War', foe: 'the other side', foeAdj: 'opposing', theater: 'the whole country', years: [1936, 1939], intensity: 4, civil: true, draft: [1936, 1939], draftAges: [18, 35], result: 'ceasefire',
    end: 'The war ended in the spring. One side had won, and the country was exhausted and quiet. Every family had lost somebody, and many were not going to say so aloud.' } },
  fx: { mood: -3, jobs: -0.3, living: 0.25 },
  open: { title: 'The Civil War', text: 'The country has split in two, and the armies are on the roads. Whichever side holds your town calls you up. People are denouncing their neighbors, and nobody knows whom to trust.', kid: 'There is shooting at night, and the grown-ups whisper, and your family has moved twice.' },
  yearly: ['A rumor went round, and half the street left.', 'You say as little as possible, to everyone.'],
  close: 'The war is over. The country is quiet, and hungry.',
  news: [['The front moves again', 'Villages changed hands for the third time this year. Refugees are camped on the roads.'], ['The war ends', 'Church bells and silence. Nobody was sure which to expect.']],
  blurb: 'A civil war that divides families and neighbors. Whichever side holds your town calls you up.',
});
H('es_bombing', {
  name: 'bombed cities', chip: 'The bombing', emoji: '🚨', kind: 'war', popup: false,
  years: [1936, 1938], cities: ['es:Madrid', 'es:Barcelona', 'es:Bilbao', 'es:Valencia'], citySev: { 'es:Madrid': 1, 'es:Barcelona': 1, 'es:Bilbao': 0.7, 'es:Valencia': 0.6 },
  blast: { home: 0.15, hurt: 0.06, dead: 0.01, npc: 0.015 }, cause: 'an air raid', fx: { mood: -1 },
  open: { title: 'Bombs on the city', text: 'The city is being bombed from the air, in the daytime. People are digging shelters in the streets and sleeping in the metro.', kid: 'The sirens go at any time of day, and everyone runs for the cellar.' },
  news: [['Raids on the city', 'Bombers came in the afternoon, without warning. Shelters were full, and thousands slept in the underground.']],
  blurb: 'The cities are bombed from the air.',
});
H('es_hunger', {
  name: 'the hunger years', chip: 'Hunger years', emoji: '🥖', kind: 'econ', popup: true,
  years: [1940, 1952], where: ['es'], fx: { jobs: -0.15, living: 0.15, mood: -1.5 },
  open: { title: 'The hunger years', text: 'The war is over, but there is nothing to eat. Ration books are valid for less than they promise, the black market flourishes, and people queue for whatever is on offer. Families who had enough before do not have enough now.', kid: 'You are hungry most of the time, and you learn not to complain.' },
  yearly: ['The ration for the week was two slices of bread and a piece of fruit.', 'A neighbor gave you a potato, and you told no one.'],
  close: 'The ration books are gone, and so is the worst of the hunger. Nobody has forgotten.',
  news: [['Rations cut again', 'Bread, oil and sugar are all in short supply. The official line is that the shortages are temporary.']],
  blurb: 'Postwar poverty and rationing. There is not enough to eat.',
});
H('es_miracle', {
  name: 'the Spanish miracle', chip: 'The miracle', emoji: '🏖️', kind: 'econ', tone: 'good', popup: false,
  years: [1959, 1973], where: ['es'], fx: { jobs: 0.3, pay: 0.04, housing: 0.05, mood: 1.5 }, biz: { hotel: 0.3, restaurant: 0.2 },
  open: { title: 'The miracle', text: 'Tourists are arriving by the million, emigrants are sending money home, and factories are springing up. For the first time in memory, people are buying cars, appliances and apartments.', kid: 'There are tourists everywhere, and new apartment blocks all along the coast.' },
  news: [['Tourists by the million', 'The coast is full of hotels. Locals who never saw a foreigner now serve them every day.']],
  blurb: 'Tourism, remittances and industry. The first real prosperity in generations.',
});
H('es_transition', {
  name: 'the transition', chip: 'The transition', emoji: '🗳️', kind: 'moment', tone: 'good', popup: true,
  years: [1975, 1978], where: ['es'], fx: { mood: [2, 2, 2, 1] },
  open: { title: 'A new Spain', text: 'The old order has ended, and nobody is sure what comes next. There is a new constitution, a first election in forty years, and a lot of arguing in the open for the first time in a generation.', kid: 'Everyone is arguing about politics at the dinner table, and they seem to be enjoying it.' },
  news: [['First free election', 'Long lines at the polls, and a lot of nervous laughter. The result was close, and calm.'], ['A constitution is approved', 'Most voters said yes. The bars were open all night.']],
  blurb: 'The end of an old order, and the first free election in generations.',
});

/* ---- Sweden ------------------------------------------------------------------------------------------------------------ */
H('se_banking_crisis', {
  name: 'the banking crisis', chip: 'Banking crisis', emoji: '🏦', kind: 'econ',
  years: [1990, 1994], where: ['se'], fxShock: { SEK: [0, 0, -0.2, -0.05, 0] },
  fx: { jobs: [-0.1, -0.25, -0.3, -0.2, -0.1], layoff: [0.02, 0.06, 0.07, 0.04, 0.02], housing: [-0.04, -0.12, -0.12, -0.05, 0], rates: [0.03, 0.03, 0.2, 0.05, 0.02], mood: [-0.5, -2, -2, -1, -0.5] },
  open: { title: 'The banking crisis', text: 'The property boom has collapsed, and so have the banks that lent for it. House prices are falling, unemployment has tripled, and the government has spent a fortune to rescue the banks.', kid: 'There are a lot of grown-ups at home who used to go out to work.' },
  news: [['Banks seek rescue', 'The government has promised to guarantee all deposits. Finance experts said they had not seen anything like it.'], ['Rates raised to hold the krona', 'The central bank has pushed an overnight rate to 500 percent. Few people have seen a number like it.'], ['Unemployment at a record', 'Hundreds of thousands are out of work. Retraining courses are full.']],
  blurb: 'A property and banking crash. House prices fall, and unemployment triples.',
});
