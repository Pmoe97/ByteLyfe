/* =====================================================================
 * 09-data-history-5.js — country events, part three (the format is at the top of 09-data-history.js): Japan,
 * South Korea, India, Nigeria, the Philippines and South Africa. The Second World War, Korea, Vietnam and the
 * Cold War are in the headline files; these belong to one country. City disasters are in 09-data-history-6.js.
 * India's partition is mentioned and nothing more; South Africa's story here is the 1994 election and the
 * lights going out, not apartheid: the game has no mechanics for it. Pure data.
 * ===================================================================== */

/* ---- Japan ----------------------------------------------------------------------------------------------------- */
H('jp_bombing', {
  name: 'the bombing of the cities', chip: 'The bombing', emoji: '🚨', kind: 'war', popup: true,
  years: [1944, 1945], cities: ['jp:Tokyo', 'jp:Osaka', 'jp:Nagoya', 'jp:Kobe', 'jp:Yokohama', 'jp:Fukuoka'],
  citySev: { 'jp:Tokyo': 1, 'jp:Osaka': 1, 'jp:Nagoya': 0.9, 'jp:Kobe': 0.8, 'jp:Yokohama': 0.8, 'jp:Fukuoka': 0.6 },
  curve: [0.6, 1], blast: { home: 0.35, hurt: 0.12, dead: 0.02, npc: 0.035 }, cause: 'an air raid', fx: { mood: -2 },
  open: { title: 'Fire from the sky', text: 'The bombers are over the cities by night. Whole districts of wooden houses burn at once, and people are fleeing to the countryside with whatever they can carry.', kid: 'The sirens, the shelter, the red sky at night. The children have been sent away to the country.' },
  yearly: ['The sky is orange at night, and it is not the sunset.'],
  close: 'The bombing is over. The city is a plain of ash with a few chimneys.',
  news: [['Evacuation of children widened', 'Schoolchildren were sent to temple towns in the mountains. Parents saw them off at the station.'], ['Another district burned', 'Thousands are homeless. The authorities are distributing rice and blankets from temple halls.']],
  blurb: 'Fire raids on the wooden cities.',
});
H('jp_occupation', {
  name: 'the Occupation', chip: 'The Occupation', emoji: '🕊️', kind: 'econ', popup: true,
  years: [1945, 1952], where: ['jp'], fx: { jobs: [-0.3, -0.25, -0.2, -0.1, -0.05, 0, 0.05, 0.1], living: [0.25, 0.25, 0.15, 0.1, 0.05, 0, 0, 0], mood: [-3, -2, -1, -0.5, 0, 0.5, 0.5, 1] },
  open: { title: 'After the surrender', text: 'The war is over, and foreign troops are in the country. The cities are in ruins, there is little food, and the old order is being taken down piece by piece. People are building houses out of whatever they can find.', kid: 'There is never enough to eat, and the older children are working in the fields. Foreign soldiers hand out chocolate.' },
  yearly: ['You grow vegetables in what used to be the garden of a house.', 'The black market in the station is more than a market. It is the city.'],
  close: 'The Occupation has ended, and the country is its own again. The economy is starting to move.',
  news: [['Land reform announced', 'Farmland will be bought from landlords and sold to the people who work it. Many tenants wept when they were told.'], ['A new constitution takes effect', 'It renounces war. Children recited it in school the next morning.'], ['Occupation ends', 'The last foreign troops stood down. Flags were raised, and many people stayed home.']],
  blurb: 'Ruins, hunger and a new order. The economy starts from zero.',
});
H('jp_growth', {
  name: 'the high-growth era', chip: 'Growth era', emoji: '🚄', kind: 'econ', tone: 'good',
  years: [1955, 1973], where: ['jp'], fx: { jobs: 0.3, pay: 0.04, housing: 0.05, mood: 1 },
  open: { title: 'Growth', text: 'The economy is growing at a pace nobody thought possible. Factories hire every graduate, wages double in a few years, and people are buying the "three treasures": a refrigerator, a washing machine and a television.', kid: 'There is a television in the house now, and the grown-ups are in a better mood than you can remember.' },
  yearly: ['Your company announced bonuses again this year.', 'There is a new apartment block where the paddy field was.'],
  close: 'The high-growth era is over. Nobody says so, and everybody feels it.',
  news: [['The bullet train opens', 'It ran from Tokyo to Osaka in four hours on its first day. Crowds waved at the stations.'], ['Wages rise again', 'Unions won a double-digit raise for the tenth year in a row. Company executives said it was sustainable.'], ['Another record year for exports', 'The trade surplus is the highest in history. Foreign newspapers are worried.']],
  blurb: 'Rapid growth, lifelong jobs, and the first TVs, washing machines and refrigerators.',
});
H('jp_bubble', {
  name: 'the bubble', chip: 'The bubble', emoji: '💴', kind: 'econ', tone: 'good',
  years: [1986, 1989], where: ['jp'], fx: { jobs: 0.2, pay: 0.03, housing: [0.12, 0.15, 0.18, 0.12], mood: 1.5 }, marketCc: { jp: { 1986: 0.43, 1987: 0.15, 1988: 0.4, 1989: 0.29 } },
  open: { title: 'The bubble', text: 'Land prices and stock prices are going up as if they never will stop. The grounds of the Imperial Palace are said to be worth more than California. People are taking taxis in the rain and eating out every night, and banks are lending to anyone who asks.', kid: 'The grown-ups are always out, and they bring home expensive presents.' },
  yearly: ['The company dinner this year was at a restaurant you had never heard of, and it cost a month of your father’s wages.'],
  news: [['Land prices triple in five years', 'A small plot in the city now costs as much as a skyscraper in another. Borrowers say prices will never fall.'], ['Stock index at an all-time high', 'Brokerage offices are crowded with first-time investors. Taxi drivers are giving tips.']],
  blurb: 'Land and stocks soar. Everyone is borrowing and spending.',
});
H('jp_lost_decade', {
  name: 'the lost decade', chip: 'Lost decade', emoji: '📉', kind: 'econ',
  years: [1990, 2003], where: ['jp'], fx: { jobs: -0.1, pay: -0.005, housing: -0.05, mood: -0.5 },
  marketCc: { jp: { 1990: -0.39, 1991: -0.04, 1992: -0.26, 1997: -0.21, 1998: -0.09, 1999: 0.37, 2000: -0.27, 2001: -0.24, 2002: -0.19, 2003: 0.25 } },
  open: { title: 'The bubble bursts', text: 'The stock market has fallen by a third, land prices are collapsing, and the banks are stuck with loans nobody can repay. Companies are freezing hiring. People who borrowed against the future are discovering what that means.', kid: 'The grown-ups are quiet, and the bonuses stopped.' },
  yearly: ['Another year, and your pay has not changed.', 'Graduates are applying to hundreds of companies, and some will not find a job at all.'],
  close: 'The long slump is easing. People call the years just past "the lost decade," and some wonder if there was a second one.',
  news: [['Banks seek rescue', 'The government is putting public money into the banks. Taxpayers are not pleased.'], ['Graduate hiring at a low', 'Students are being called "the ice age generation." Many are taking part-time work.']],
  blurb: 'Stocks and land collapse. Banks are stuck, hiring freezes, and pay stops growing.',
});

/* ---- South Korea ----------------------------------------------------------------------------------------------------- */
H('kr_liberation', {
  name: 'liberation', chip: 'Liberation', emoji: '🇰🇷', kind: 'moment', tone: 'good', popup: true,
  years: [1945, 1945], where: ['kr'], fx: { mood: [6] },
  open: { title: 'Liberation', text: 'The war is over, and so is the long rule by another country. People are in the streets with flags they were not allowed to carry, and old songs they were not allowed to sing. The future is very uncertain, and today nobody cares.', kid: 'The grown-ups danced in the street, and sang songs you had never heard before.' },
  news: [['Flags in every window', 'The streets were crowded with singing people from morning to night. Some wept, and some did not stop laughing.']],
  blurb: 'The end of foreign rule.',
});
H('han_miracle', {
  name: 'the Miracle on the Han', chip: 'The miracle', emoji: '🏭', kind: 'econ', tone: 'good',
  years: [1962, 1996], where: ['kr'], fx: { jobs: 0.3, pay: 0.05, housing: 0.05, mood: 1 },
  open: { title: 'The Miracle on the Han', text: 'The country is working harder than it ever has. Factories are running day and night, exports are doubling every few years, and families are sending their children to school as fast as they can.', kid: 'Everyone in the family is working very hard, and there is a big push for you to study.' },
  yearly: ['Your parents are at the factory until late, and your family has a refrigerator now.', 'Another apartment block has gone up in the old market district.'],
  close: 'The long boom is over. The country is rich, and not certain it can stay that way.',
  news: [['Exports pass a new record', 'Textiles, steel and electronics are all up. Planners promise another five-year plan.'], ['Seoul builds another bridge', 'It is the fifth over the river in a decade. Housing is going up at the edges of the city.']],
  blurb: 'Rapid industrialization: factories, exports, long hours and rising pay.',
});
H('kr_imf_crisis', {
  name: 'the IMF crisis', chip: 'IMF crisis', emoji: '💸', kind: 'econ',
  years: [1997, 1998], where: ['kr'], fxShock: { KRW: [-0.4, -0.1] }, marketCc: { kr: { 1997: -0.42, 1998: 0.49 } },
  fx: { jobs: [-0.2, -0.4], layoff: [0.05, 0.12], rates: [0.06, 0.1], pay: [-0.01, -0.04], mood: [-1.5, -3] },
  open: { title: 'The IMF crisis', text: 'The currency has collapsed and the country has gone to the International Monetary Fund for a rescue. Banks and big companies are failing, interest rates have doubled, and hundreds of thousands are being laid off. A man who was set for life last year is selling insurance.', kid: 'Fathers are at home in the daytime, and the grown-ups are all very quiet.' },
  yearly: ['Your neighbor went out one morning in a suit and did not tell anyone he had no job to go to.'],
  close: 'The crisis is over, and the country is back on its feet, leaner and a little harder.',
  news: [['The won in free fall', 'The currency has lost nearly half its value. Importers are suspending orders, and travel abroad is out of reach.'], ['Rescue agreed', 'The country will receive a record loan. In return, it has promised to restructure its banks and industries.'], ['Gold collection drive', 'Citizens lined up with rings and necklaces to donate to the national effort. "It is the least I can do," a woman said.']],
  blurb: 'The currency collapses, a rescue loan comes with conditions, and layoffs sweep through.',
});

/* ---- India ----------------------------------------------------------------------------------------------------------------- */
H('in_independence', {
  name: 'independence', chip: 'Independence', emoji: '🇮🇳', kind: 'moment', popup: true,
  years: [1947, 1948], where: ['in'], fx: { mood: [1, -1] },
  open: { title: 'Independence', text: 'The country is independent, after a long struggle. At midnight, flags went up across the land. The day is also the day on which the country was divided, and millions of people left their homes in both directions. For a great many, it is a day of both joy and grief.', kid: 'There are flags everywhere, and the grown-ups are crying and laughing at once.' },
  news: [['A nation is born', 'Crowds gathered at midnight to hear the speech. Many wept, and many more listened in silence.'], ['Families in motion', 'Trains and roads are crowded with people making journeys they did not choose. Relief camps have been set up.']],
  blurb: 'Independence, and the division of the land. A day of joy and loss.',
});
H('in_war_1947', {
  name: 'the war of 1947', chip: 'War of 1947', emoji: '🎖️', kind: 'war', popup: false,
  years: [1947, 1948], where: ['in'],
  war: { in: { name: 'the war of 1947', foe: 'the neighboring state', foeAdj: 'opposing', theater: 'Kashmir', years: [1947, 1948], intensity: 2, result: 'ceasefire', end: 'A ceasefire was agreed in January. The line it drew is still disputed.' } },
  open: { title: 'A war in Kashmir', text: 'Fighting has broken out in the mountains in the north. It is a new country’s first war, and it is a long way from most people’s homes.', kid: 'Soldiers are going north on trains, and the grown-ups listen to the radio every evening.' },
  news: [['Fighting in Kashmir', 'Troops were flown to the north in the first days of the war. Newspapers carry the names of the dead.']],
  blurb: 'A short war in the northern mountains.',
});
H('in_war_1962', {
  name: 'the war of 1962', chip: 'War of 1962', emoji: '🎖️', kind: 'war', popup: false,
  years: [1962, 1962], where: ['in'],
  war: { in: { name: 'the war of 1962', foe: 'the northern neighbor', foeAdj: 'opposing', theater: 'the Himalayas', years: [1962, 1962], intensity: 2, result: 'defeat', end: 'A unilateral ceasefire ended the fighting after a month. It had been a bitter surprise, and a lot of people asked questions afterward.' } },
  open: { title: 'War in the Himalayas', text: 'A border dispute has become a war, in the highest mountains in the world. People are donating gold and blood, and the news is bad.', kid: 'The grown-ups give things to the army, and talk a lot about the mountains.' },
  news: [['War in the Himalayas', 'Fighting has been fierce at high altitude. Families are donating blood, gold and blankets for the troops.']],
  blurb: 'A month-long border war in the mountains.',
});
H('in_war_1965', {
  name: 'the war of 1965', chip: 'War of 1965', emoji: '🎖️', kind: 'war', popup: false,
  years: [1965, 1965], where: ['in'],
  war: { in: { name: 'the war of 1965', foe: 'the neighboring state', foeAdj: 'opposing', theater: 'the western border', years: [1965, 1965], intensity: 2, result: 'ceasefire', end: 'A ceasefire was signed after three weeks. Both sides claimed victory, and both counted the cost.' } },
  open: { title: 'War on the border', text: 'War has broken out along the western border. There are blackouts at night, and everyone is glued to the radio.', kid: 'The windows are covered at night, and the whole street listens to the radio.' },
  news: [['Blackouts at night', 'Cities have been darkened as a precaution. Radio sets have been selling out, and everyone listens at the same hour.']],
  blurb: 'Three weeks of war on the western border.',
});
H('in_war_1971', {
  name: 'the war of 1971', chip: 'War of 1971', emoji: '🎖️', kind: 'war', popup: false,
  years: [1971, 1971], where: ['in'],
  war: { in: { name: 'the war of 1971', foe: 'the neighboring state', foeAdj: 'opposing', theater: 'the eastern and western borders', years: [1971, 1971], intensity: 2, result: 'victory', end: 'The war lasted less than two weeks, and ended in victory, and a new country on the map. Millions of refugees were going home.' } },
  open: { title: 'War, and refugees', text: 'Millions of refugees have crossed the eastern border, and now there is a war. It is short, and very sharp.', kid: 'The radio is on all day, and families you do not know are living in the school.' },
  news: [['War on two fronts', 'The fighting lasted less than two weeks. Crowds filled the streets when the ceasefire was announced.']],
  blurb: 'A short, sharp war that followed a refugee crisis.',
});
H('in_kargil', {
  name: 'the Kargil War', chip: 'Kargil', emoji: '🎖️', kind: 'war', popup: false,
  years: [1999, 1999], where: ['in'],
  war: { in: { name: 'the Kargil War', foe: 'the neighboring state', foeAdj: 'opposing', theater: 'the mountains of Kargil', years: [1999, 1999], intensity: 1, result: 'victory', end: 'The heights were retaken after two months of hard fighting at altitude. There were a great many funerals in a great many villages.' } },
  open: { title: 'Fighting in Kargil', text: 'There is a fight for the high ridges in the north, and it is on television every night. Many families are following it closely.', kid: 'There is a war on television, and the whole family watches it at dinner.' },
  news: [['The fight for the ridges', 'Soldiers climbed under fire in thin air. Their names and faces are on the evening news every night.']],
  blurb: 'A short mountain war, followed on television.',
});
H('in_liberalization', {
  name: 'the opening of the economy', chip: 'Liberalization', emoji: '🏢', kind: 'econ', tone: 'good',
  years: [1991, 2010], where: ['in'], fx: { jobs: 0.2, pay: 0.03, mood: 0.5 }, cats: { jobs: { _: 0.3, tech: 2.5, office: 1.5, business: 1.5 }, pay: { _: 0.4, tech: 2, office: 1.5, business: 1.5 } },
  open: { title: 'The economy opens', text: 'After decades of tight control, the government has opened the economy to the world. Foreign companies are arriving, licences are no longer needed, and the first generation to find jobs in computers and call centers is graduating.', kid: 'There are new shops and new brands, and the grown-ups talk about "the reforms."' },
  yearly: ['A new office tower has gone up in the old part of the city, and your cousin works in it.', 'Everyone has a mobile phone now, or soon will.'],
  close: 'The reforms are old news now, and the country is a different place.',
  news: [['Foreign firms arrive', 'A car plant and a call center both opened this month. Thousands queued for the interviews.'], ['Software exports at a record', 'Graduates from the engineering colleges are in heavy demand. Salaries have doubled in five years.']],
  blurb: 'The economy opens: foreign firms arrive, and tech, office and business jobs boom.',
});
H('in_demonetisation', {
  name: 'demonetisation', chip: 'Demonetisation', emoji: '💵', kind: 'moment', popup: true,
  years: [2016, 2016], where: ['in'], fx: { mood: [-1] },
  open: { title: 'The notes', text: 'At eight in the evening, the government announced that most of the cash in the country, the notes of the two largest denominations, would stop being valid at midnight. People rushed out to spend them, and lines formed at the banks, which lasted for weeks.', kid: 'The grown-ups were rushing around in the evening, and the next morning everyone queued at the bank.' },
  news: [['Queues at banks and cash machines', 'People waited for hours to deposit or exchange notes. Some small traders have had to close.'], ['The new notes arrive', 'They are pink, and many cash machines can not yet dispense them. People are making do with transfers.']],
  blurb: 'Most of the cash in the country is declared invalid overnight.',
});

/* ---- Nigeria ---------------------------------------------------------------------------------------------------------------------- */
H('ng_independence', {
  name: 'independence', chip: 'Independence', emoji: '🇳🇬', kind: 'moment', tone: 'good', popup: true,
  years: [1960, 1960], where: ['ng'], fx: { mood: [4] },
  open: { title: 'Independence', text: 'At midnight, the old flag came down and the new one went up. The country is independent, and everyone is in the street. There is a great deal to do, and tonight there is nothing to do but dance.', kid: 'There is music in the street all night, and the grown-ups let you stay up.' },
  news: [['A nation is born', 'The celebrations went on for three days. Drums could be heard from every corner of the city.']],
  blurb: 'The country becomes independent.',
});
H('ng_civil_war', {
  name: 'the Civil War', chip: 'Civil War', emoji: '🎖️', kind: 'war', popup: true,
  years: [1967, 1970], where: ['ng'],
  war: { ng: { name: 'the Nigerian Civil War', foe: 'the other side', foeAdj: 'opposing', theater: 'the south-east', years: [1967, 1970], intensity: 3, civil: true, result: 'ceasefire', end: 'The fighting ended in January. Hunger had done as much harm as the guns, and the country was told to get on, and to forget.' } },
  fx: { mood: -1, living: 0.1 },
  open: { title: 'War', text: 'A part of the country has declared itself independent, and the rest has gone to war to stop it. The fighting is in the east, and its effects are everywhere: prices, shortages, and funerals.', kid: 'There is a war in the east, and a great many people are going hungry.' },
  yearly: ['Food has become hard to find, even where the guns are not.'],
  close: 'The war is over. The country is trying to rebuild, and some of it will never be rebuilt.',
  news: [['Fighting continues in the east', 'Towns have changed hands. The roads are full of people with everything they own.'], ['Ceasefire announced', 'The war is over after thirty months. Relief agencies said hundreds of thousands are in need.']],
  blurb: 'A civil war in the south-east. Hunger and shortages reach far beyond the fighting.',
});
H('ng_oil_boom', {
  name: 'the oil boom', chip: 'Oil boom', emoji: '🛢️', kind: 'econ', tone: 'good',
  years: [1971, 1980], where: ['ng'], fx: { jobs: 0.25, pay: 0.04, living: 0.1, mood: 1 }, biz: { construction: 0.3 },
  open: { title: 'The oil boom', text: 'Oil has made the government rich. There are new roads, new universities, and new buildings, and a great deal of cash. Everything costs more, but there is more of it.', kid: 'There are new cars and new buildings, and the grown-ups say the country is rich now.' },
  news: [['Oil revenues soar', 'The government announced a series of new projects. Contractors are queuing at the ministries.']],
  blurb: 'Oil money: new roads, new buildings, and rising prices.',
});
H('ng_adjustment', {
  name: 'the oil bust and adjustment', chip: 'The bust', emoji: '📉', kind: 'econ',
  years: [1982, 1986], where: ['ng'], fxShock: { NGN: [0, 0, 0, -0.1, -0.6] }, fx: { jobs: [-0.1, -0.15, -0.2, -0.2, -0.2], living: [0.1, 0.15, 0.2, 0.2, 0.3], layoff: [0.03, 0.05, 0.05, 0.04, 0.04], mood: [-1, -1.5, -2, -2, -2] },
  open: { title: 'The oil price falls', text: 'The price of oil has collapsed, and so has the government’s income. Imports are cut, jobs are being lost, and prices are climbing. The naira is losing its value.', kid: 'The grown-ups are tense, and the shops are emptier than before.' },
  news: [['Imports cut', 'Many familiar goods have disappeared from the shelves. Traders say they can not get the foreign exchange to pay for them.'], ['The naira falls again', 'The official rate was cut in half. In the market, the price of rice has risen by the day.']],
  blurb: 'Oil prices fall. Jobs go, prices rise, and the currency drops.',
});
H('ng_recession_2016', {
  name: 'the 2016 recession', chip: 'Recession', emoji: '📉', kind: 'econ',
  years: [2016, 2017], where: ['ng'], fxShock: { NGN: [-0.35, -0.05] }, fx: { jobs: [-0.2, -0.1], layoff: [0.05, 0.03], living: [0.15, 0.1], mood: [-1.5, -1] },
  open: { title: 'Recession', text: 'The price of oil is down again, the currency has been allowed to fall, and the economy has shrunk. Fuel is hard to find, and the price of everything is rising.', kid: 'There are long queues for petrol and everything seems to cost more.' },
  news: [['Naira floated', 'The currency fell by a third in a week. Importers say they can not pay.'], ['Petrol queues', 'Cars waited overnight at some stations. Prices at the pump rose by half.']],
  blurb: 'Oil prices fall, the naira drops and fuel is short.',
});
H('ng_float_2023', {
  name: 'the naira float', chip: 'Naira float', emoji: '💸', kind: 'econ',
  years: [2023, 2023], where: ['ng'], fxShock: { NGN: [-0.45] }, fx: { living: [0.15], mood: [-1] },
  open: { title: 'The naira is floated', text: 'The government has let the currency find its own level, and it has fallen sharply. Fuel subsidies have ended too, and the price of petrol, transport and food has leaped.', kid: 'Everything in the shop costs more than it did last month.' },
  news: [['Pump prices triple', 'Transport fares have followed. People are walking to work.'], ['The naira at a record low', 'Importers said they are passing the cost on. Economists said the pain would be followed by gain, eventually.']],
  blurb: 'The naira falls sharply and fuel prices leap.',
});

/* ---- The Philippines ---------------------------------------------------------------------------------------------------------------- */
H('ph_occupation', {
  name: 'the Occupation', chip: 'The Occupation', emoji: '🥖', kind: 'unrest', popup: true,
  years: [1942, 1945], where: ['ph'], fx: { jobs: -0.3, living: 0.4, mood: -4 },
  open: { title: 'Under occupation', text: 'The country is occupied. There are soldiers on every corner, a new currency of paper that loses its value every month, and a great deal of fear. People hide what they have, and trust few.', kid: 'There are soldiers everywhere, and the grown-ups tell you to keep your head down.' },
  yearly: ['The money you got paid in last month buys half as much today.', 'Rice is more valuable than gold.'],
  close: 'The Occupation is over. The country is free, and wrecked.',
  news: [['New currency introduced', 'The old pesos are no longer accepted. The new notes were printed in a hurry, and prices have jumped.'], ['Food shortages', 'People are scavenging in the markets. Rice is selling on the black market at a hundred times its price.']],
  blurb: 'Occupation, hunger, and money that loses its value every month.',
});
H('ph_manila_1945', {
  name: 'the Battle of Manila', chip: 'Battle of Manila', emoji: '🚨', kind: 'war', popup: true,
  years: [1945, 1945], cities: ['ph:Manila', 'ph:Quezon City', 'ph:Makati'], citySev: { 'ph:Manila': 1, 'ph:Quezon City': 0.5, 'ph:Makati': 0.5 },
  blast: { home: 0.6, hurt: 0.2, dead: 0.04, npc: 0.08 }, cause: 'the fighting', fx: { mood: -4 },
  open: { title: 'The battle for the city', text: 'The war has come to the capital in the worst possible way. For a month, there is fighting house to house. The city is on fire, and its people are trapped inside it.', kid: 'There is shooting and fire everywhere, and your family is hiding in a cellar.' },
  news: [['Fighting in the streets', 'The old city is in flames. Civilians are streaming out of the burning districts.']],
  blurb: 'A month of street fighting in a city full of civilians.',
});
H('ph_independence', {
  name: 'independence', chip: 'Independence', emoji: '🇵🇭', kind: 'moment', tone: 'good', popup: true,
  years: [1946, 1946], where: ['ph'], fx: { mood: [3] },
  open: { title: 'Independence', text: 'The flag has gone up over a country that is its own. It is a country in ruins, and today nobody is thinking about that.', kid: 'There are flags and fireworks, and the grown-ups are smiling for the first time in years.' },
  news: [['A republic is born', 'Crowds filled the square. Speeches were short, and the cheering was long.']],
  blurb: 'The republic is born.',
});
H('ph_people_power', {
  name: 'People Power', chip: 'People Power', emoji: '✊', kind: 'moment', tone: 'good', popup: true,
  years: [1986, 1986], where: ['ph'], fx: { mood: [4] },
  open: { title: 'People Power', text: 'After days of crowds on the main avenue, and soldiers who would not fire on them, the long rule is over. People are hugging soldiers and handing them flowers. Nobody can quite believe it.', kid: 'The whole city went out into the street, and nobody got hurt.' },
  news: [['Crowds fill the avenue', 'Hundreds of thousands stood in front of the tanks, with rosaries and flowers and sandwiches.'], ['A new government', 'The new leaders were sworn in on the same day. The old ones left by helicopter.']],
  blurb: 'A peaceful uprising ends a long rule.',
});
H('ph_crisis_1997', {
  name: 'the 1997 crisis', chip: '1997 crisis', emoji: '💸', kind: 'econ',
  years: [1997, 1998], where: ['ph'], fxShock: { PHP: [-0.3, -0.1] }, fx: { jobs: [-0.1, -0.15], layoff: [0.03, 0.05], rates: [0.04, 0.03], mood: [-1, -1] },
  open: { title: 'The Asian crisis', text: 'A currency collapse that began elsewhere in the region has reached the peso. It has lost a third of its value, interest rates have shot up, and businesses are cutting back.', kid: 'The grown-ups are worried about money, and they say it is because of something far away.' },
  news: [['Peso falls to a record low', 'Importers raised their prices on the same afternoon. Remittances from overseas workers are keeping many afloat.']],
  blurb: 'The peso falls by a third, and rates jump.',
});

/* ---- South Africa ------------------------------------------------------------------------------------------------------------------------- */
H('za_1994', {
  name: 'the first all-race election', chip: 'The election', emoji: '🗳️', kind: 'moment', tone: 'good', popup: true,
  years: [1994, 1994], where: ['za'], fx: { mood: [5] },
  open: { title: 'Everyone votes', text: 'For the first time, every adult in the country can vote, and they have turned out in their millions. The lines at the polling stations are miles long, and there is a feeling in the air that has not been felt before. A new era begins.', kid: 'You stood in line with your family for hours, and nobody minded.' },
  news: [['Millions queue to vote', 'Some waited all day. Elderly voters were carried to the polls. "I never thought I would see it," many said.'], ['A new president is sworn in', 'The ceremony was held in front of crowds that stretched to the horizon.']],
  blurb: 'The first election in which everybody can vote.',
});
H('za_rand_2001', {
  name: 'the rand crash of 2001', chip: 'Rand crash', emoji: '💸', kind: 'moment', popup: false,
  years: [2001, 2001], where: ['za'], fxShock: { ZAR: [-0.35] }, fx: { living: [0.05], mood: [-0.5] },
  open: { title: 'The rand falls', text: 'The rand has lost a third of its value in a few months. Imports cost a lot more, and the price of fuel and food is rising.', kid: 'The grown-ups complain that everything costs more.' },
  news: [['Rand hits a record low', 'A holiday abroad is now out of reach for most. Petrol is up for the third time this year.']],
  blurb: 'The rand falls sharply.',
});
H('za_rand_2015', {
  name: 'the rand slide', chip: 'Rand slide', emoji: '💸', kind: 'moment', popup: false,
  years: [2015, 2015], where: ['za'], fxShock: { ZAR: [-0.25] }, fx: { living: [0.04], mood: [-0.5] },
  open: { title: 'The rand slides', text: 'The rand is falling again, after a change of finance minister that frightened everyone. Prices are rising, and so are interest rates.', kid: 'The grown-ups are tense about money.' },
  news: [['Rand slides', 'A change in the finance ministry was followed by a fall in the currency within hours.']],
  blurb: 'The rand falls again.',
});
H('za_loadshedding', {
  name: 'load-shedding', chip: 'Load-shedding', emoji: '🕯️', kind: 'econ', popup: true,
  years: [2008, 2023], where: ['za'], fx: { mood: -0.7, living: 0.01, layoff: 0.005 }, biz: { restaurant: -0.05, cafe: -0.05, bakery: -0.05, salon: -0.05 },
  open: { title: 'The lights go out', text: 'The electricity supply has failed, and the lights are going out on a schedule. For hours every day, the power is off in turn across the country. Shops, factories and homes all plan their days around it.', kid: 'You do your homework by candlelight, and the fridge is warm.' },
  yearly: ['You have a phone app that tells you when the lights go out.', 'The traffic lights are off again, and so is half the neighborhood.'],
  close: 'The lights are mostly on again, and everyone is still checking the app.',
  news: [['Power cuts extended', 'The utility announced longer outages. Businesses said it is costing billions.'], ['Generators sell out', 'Hardware stores are out of stock. Waiting lists for solar panels are months long.']],
  blurb: 'Scheduled power cuts. Planning your day around the lights.',
});
