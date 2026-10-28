/* =====================================================================
 * 09-data-history-3.js — country events, part one (the format is at the top of 09-data-history.js): the
 * United States, Canada, the United Kingdom, Ireland, Australia, Mexico and Brazil. The big events of
 * 09-data-history-2.js already reach these countries; these are the ones that belong to one of them.
 * City disasters are in 09-data-history-6.js. Pure data.
 * ===================================================================== */

/* ---- United States ----------------------------------------------------------------------------- */
H('prohibition', {
  name: 'Prohibition', chip: 'Prohibition', emoji: '🥃', kind: 'unrest',
  years: [1920, 1933], where: ['us'], jobBan: ['bartender'], biz: { brewery: -0.8, restaurant: -0.05 },
  fx: { mood: -0.3 },
  open: { title: 'Prohibition', text: 'From today, making, selling or carrying alcohol is against the law across the United States. Bars close, breweries shut, and people who want a drink are finding out exactly where to go for one.', kid: 'The grown-ups say there will be no more drinking, and then whisper about where to get it.' },
  yearly: ['Everyone knows a back door with a password.', 'The price of a bottle is ten times what it was, and so is the number of people who say they never touch it.'],
  close: 'Prohibition has ended. Bars have reopened, and the people who ran the back rooms are looking for something else to do.',
  news: [['Speakeasies thrive', 'Police say there are more illegal bars in the city than there were legal ones before. Raids are frequent and largely ceremonial.'], ['Smugglers caught at the border', 'Officials seized a shipment hidden under a load of hay. They said it was the third this week.'], ['Repeal approved', 'After thirteen years, the amendment is gone. The first legal beer was poured at midnight, and the line went around the block.']],
  blurb: 'Alcohol is illegal. Bartending is not a job, breweries are closed, and everybody knows a back door.',
});
H('volcker', {
  name: 'the early-1980s recession', chip: 'Recession', emoji: '📉', kind: 'econ',
  years: [1980, 1982], where: ['us'], fx: { rates: [0.03, 0.04, 0.035], jobs: [-0.05, -0.15, -0.2], layoff: [0.01, 0.04, 0.05], mood: [-0.5, -1, -1] },
  cats: { layoff: { trades: 2, transport: 1.5 }, jobs: { trades: 1.5 } },
  open: { title: 'The squeeze', text: 'The central bank has pushed interest rates to levels nobody alive has seen, to break inflation. Mortgages cost almost twenty percent, factories are laying people off, and farmers are driving tractors to the capital in protest.', kid: 'The grown-ups are tense about money, and there is a lot of talk about interest.' },
  yearly: ['A "for sale" sign has been in front of the house across the road since spring, and nobody is looking.', 'Everyone you know is waiting for rates to come down.'],
  close: 'Inflation has broken, and so have a lot of businesses. The economy is starting to grow again.',
  news: [['Mortgage rates top 18 percent', 'Home sales have fallen to their lowest in decades. Builders are idling crews, and real estate agents are taking second jobs.'], ['Factories cut shifts', 'Steel and auto plants announced thousands of layoffs this week. "It is the worst I have seen," a union man said.'], ['Inflation falls at last', 'Prices rose less this year than at any time since the seventies. The cost was high, and not everyone paid it equally.']],
  blurb: 'Interest rates hit record highs to fight inflation. Loans are very costly, and factories lay people off.',
});

/* ---- Canada -------------------------------------------------------------------------------------------- */
H('ca_conscription', {
  name: 'the conscription crisis', chip: 'Conscription', emoji: '📜', kind: 'unrest', popup: false,
  years: [1917, 1918], where: ['ca'], fx: { mood: [-1.5, -1] },
  open: { title: 'The conscription crisis', text: 'The government has made military service compulsory, and the country is divided about it. There were riots in some cities, and in others people simply did not show up. Families argue about it at the table.', kid: 'The grown-ups are shouting about the war and about whose sons should go.' },
  news: [['Conscription law passes', 'Debate in the House was bitter. Several members walked out, and crowds gathered outside.'], ['Exemption tribunals overwhelmed', 'Thousands of men have filed appeals. The boards are sitting seven days a week.'], ['Disturbances in the city', 'Police were called when a crowd gathered outside the recruiting office. No serious injuries were reported.']],
  blurb: 'Military service is compulsory, and the country is split over it.',
});
H('ca_oil_bust', {
  name: 'the oil bust', chip: 'Oil bust', emoji: '🛢️', kind: 'econ',
  years: [2015, 2016], cities: ['ca:Calgary', 'ca:Edmonton'], fx: { jobs: [-0.3, -0.25], layoff: [0.07, 0.05], housing: [-0.05, -0.05], mood: [-1.5, -1] },
  open: { title: 'The oil bust', text: 'The price of oil has collapsed, and the whole city runs on it. Offices are emptying, homes are going up for sale, and everyone knows someone who has been let go.', kid: 'A lot of the grown-ups are out of work, and nobody wants to talk about it at dinner.' },
  yearly: ['The empty offices downtown have more "for lease" signs than lights.', 'The truck outside your neighbor’s house has had a "for sale" sign for a year.'],
  close: 'Oil has recovered a little, and so has the city. The people who left have not all come back.',
  news: [['Oil patch layoffs continue', 'Thousands more jobs have gone. Food banks report record use, and people who donated last year are lining up this year.'], ['Downtown vacancy at a record', 'One office tower in five stands empty. Landlords are offering free rent for a year.']],
  blurb: 'The price of oil collapses. Jobs vanish and homes go on sale.',
});

/* ---- United Kingdom ---------------------------------------------------------------------------------------- */
H('blitz', {
  name: 'the Blitz', chip: 'The Blitz', emoji: '🚨', kind: 'war', popup: true,
  years: [1940, 1941], cities: ['uk:London', 'uk:Liverpool', 'uk:Birmingham', 'uk:Manchester', 'uk:Glasgow', 'uk:Belfast', 'uk:Cardiff', 'uk:Bristol'],
  citySev: { 'uk:London': 1, 'uk:Liverpool': 0.8, 'uk:Birmingham': 0.7, 'uk:Manchester': 0.6, 'uk:Glasgow': 0.5, 'uk:Belfast': 0.5, 'uk:Cardiff': 0.4, 'uk:Bristol': 0.6 },
  curve: [1, 0.8], blast: { home: 0.2, hurt: 0.1, dead: 0.012, npc: 0.02 }, cause: 'an air raid', fx: { mood: -2 },
  open: { title: 'The Blitz', text: 'German bombers are over the city almost every night. The sirens go at dusk, people sleep in shelters and in the Underground, and in the morning there are streets that are not there any more.', kid: 'Every night there are sirens, and every morning the street looks a little different.' },
  yearly: ['You have learned to tell the sirens from the all-clear without waking up.', 'The shop at the corner is a hole in the ground, and the owner serves from a trestle table.'],
  close: 'The raids have thinned out. The city is full of gaps where houses used to be.',
  news: [['Another night of raids', 'Fires burned until dawn. Rescue workers were still digging at noon. "We are all right," a woman said. "We are all right."'], ['Shelters crowded', 'Thousands bedded down in the Underground last night. Officials said conditions are under control.']],
  blurb: 'Bombing raids on the cities, night after night.',
});
H('uk_rationing', {
  name: 'postwar rationing', chip: 'Rationing', emoji: '🥫', kind: 'econ', popup: false,
  years: [1946, 1954], where: ['uk'], fx: { living: 0.1, mood: -0.8 },
  open: { title: 'Peace, and no sugar', text: 'The war is over, but the shortages are not. Bread, meat, butter, sweets and clothes are still rationed, and in some cases it is worse than it was in wartime.', kid: 'The war is over, but there are still ration books, and sweets are still a treat.' },
  close: 'The last ration has ended. People bought a great deal of sugar that day.',
  news: [['Rationing continues', 'The government said the shortages will last until supplies recover. Housewives wrote in to say they know.'], ['Sweets off the ration', 'Children queued outside the shops. Some sold out within the hour.']],
  blurb: 'The war is over, but rationing goes on.',
});
H('national_service', {
  name: 'National Service', chip: 'National Service', emoji: '📜', kind: 'war', popup: false,
  years: [1949, 1960], where: ['uk'], fx: { mood: -0.2 },
  war: { uk: { name: 'National Service', foe: 'the threat of the day', foeAdj: 'enemy', theater: 'bases at home and overseas', years: [1949, 1960], intensity: 1, peace: true, draft: [1949, 1960], draftAges: [18, 20], result: 'ceasefire',
    end: 'The last call-up has gone out. National Service is over, and nobody under twenty-one will ever have to do it again.' } },
  open: { title: 'National Service', text: 'Every healthy man of eighteen is liable for two years in the forces, in peacetime. The brown envelope arrives, and then there are bases, boots and a great deal of shouting.', kid: 'The older boys are getting brown envelopes, and then they go away and come back with different haircuts.' },
  news: [['The brown envelope', 'Boys born this year will be called up at eighteen. Barracks are being extended, and the tailors are fitting them for uniforms.'], ['National Service to end', 'The last intake will report soon. Nobody born after this year will be asked.']],
  blurb: 'Peacetime call-up: young men owe the forces two years.',
});
H('uk_discontent', {
  name: 'the Winter of Discontent', chip: 'Winter of Discontent', emoji: '📣', kind: 'unrest',
  years: [1978, 1979], where: ['uk'], fx: { mood: [-1, -2], living: [0.04, 0.03], jobs: [-0.05, -0.1] }, cats: { jobs: { public: 2 } },
  open: { title: 'The Winter of Discontent', text: 'There are strikes everywhere: refuse collectors, gravediggers, hospital porters, lorry drivers. The rubbish piles up in the streets, and the winter is the coldest anyone can remember.', kid: 'There is rubbish in the street, and the grown-ups say there is a strike on, again.' },
  yearly: ['There is a pile of rubbish at the end of the road that has been there since January.'],
  close: 'The strikes are over, and the mood has turned. A lot of people are saying that something has to change.',
  news: [['Rubbish piles up', 'Council workers say they will stay out until their claim is met. Residents say they will stay in until the smell goes away.'], ['Gravediggers join the strike', 'Bodies are being stored while negotiations continue. The unions said they regret the distress, and are not going back.']],
  blurb: 'Strikes, rubbish in the streets, and a very cold winter.',
});
H('falklands', {
  name: 'the Falklands War', chip: 'Falklands', emoji: '⚓', kind: 'war', popup: true,
  years: [1982, 1982], where: ['uk'],
  war: { uk: { name: 'the Falklands War', foe: 'Argentina', foeAdj: 'Argentine', theater: 'the South Atlantic', years: [1982, 1982], intensity: 1, result: 'victory', end: 'The islands were retaken after ten weeks. The ships came home to cheering crowds, and a great many families had somebody missing.' } },
  open: { title: 'War in the South Atlantic', text: 'A fleet has sailed to retake a small group of islands eight thousand miles away. The nation is watching it nightly on television, and it is not at all sure how it will end.', kid: 'There are ships on the news, and the grown-ups say it is a long way away and very serious.' },
  news: [['Task force sails', 'Crowds waved the ships off at the dock. A band played, and some of the families cried.'], ['Islands recaptured', 'Bells rang in the capital. A great many people said they were proud, and a great many said they were relieved.']],
  blurb: 'A short war far away, watched every night on television.',
});
H('black_wednesday', {
  name: 'Black Wednesday', chip: 'Black Wednesday', emoji: '📉', kind: 'moment', years: [1992, 1992], where: ['uk'],
  fxShock: { GBP: [-0.15] }, fx: { rates: [0.03], mood: [-0.5], housing: [-0.03] },
  open: { title: 'Black Wednesday', text: 'The pound has been forced out of the exchange-rate system after a day of frantic buying, and interest rates went up twice in one morning. Mortgages are suddenly very expensive, and the pound is worth much less.', kid: 'The grown-ups were very upset at dinner about something called "the pound."' },
  news: [['Pound crashes out', 'The government spent billions in a day to prop it up. The traders won, and everyone else is paying for it.'], ['Mortgage rates jump', 'Homeowners are being warned to expect repossessions. Housing has been in decline for two years.']],
  blurb: 'The pound crashes and interest rates leap.',
});
H('troubles', {
  name: 'the Troubles', chip: 'The Troubles', emoji: '🕊️', kind: 'unrest',
  years: [1969, 1998], cities: ['uk:Belfast'], fx: { mood: -1, jobs: -0.05 },
  open: { title: 'The Troubles', text: 'Violence has broken out in the city, and the army is on the streets. Neighborhoods have been walled apart, and everybody knows somebody who has been hurt. It is going to go on for a very long time.', kid: 'There are soldiers on the street, and the grown-ups tell you which roads you must not walk down.' },
  yearly: ['There is a checkpoint on the way to work, and you have stopped noticing it.', 'Another funeral, and a lot of black cars.'],
  close: 'An agreement was signed, and the shooting has mostly stopped. The walls are still up, and so is the memory.',
  news: [['Another night of violence', 'Roads were closed in the north of the city. The army said the situation was "under control," and residents said it was not.'], ['Talks begin', 'Delegates arrived under heavy security. Observers said it was the first time everyone had been in the same room in decades.'], ['Agreement reached', 'The deal was signed on Good Friday. People outside the building were cheering, and people inside were exhausted.']],
  blurb: 'Violence and checkpoints. Almost everyone knows somebody who has been hurt.',
});
H('brexit', {
  name: 'the Brexit vote', chip: 'Brexit', emoji: '🗳️', kind: 'moment', popup: true, years: [2016, 2016], where: ['uk'],
  fxShock: { GBP: [-0.12] }, fx: { mood: [-0.5] },
  open: { title: 'The vote', text: 'The country has voted, narrowly, to leave the European Union. The pound dropped overnight, the prime minister resigned, and there is a lot of argument at kitchen tables, in pubs and on the internet. Nobody knows what happens next.', kid: 'The grown-ups argued about a vote, and some of them were upset and some were very pleased.' },
  news: [['Britain votes to leave', 'The result was 52 to 48. The pound fell, and so did the prime minister.'], ['A divided country', 'Families, friends and workplaces are split, on both sides. Everyone agrees it will be a long process.']],
  blurb: 'A close, bitter vote to leave the European Union.',
});

/* ---- Ireland -------------------------------------------------------------------------------------------------- */
H('ie_independence', {
  name: 'the War of Independence', chip: 'War of Independence', emoji: '☘️', kind: 'war',
  years: [1919, 1921], where: ['ie'],
  war: { ie: { name: 'the War of Independence', foe: 'the British forces', foeAdj: 'British', theater: 'the whole island', years: [1919, 1921], intensity: 2, result: 'victory', end: 'A truce was signed in July, and a treaty at the end of the year. It was not everything people had wanted, and they were not all going to agree about it.' } },
  fx: { mood: -1.5, jobs: -0.05 },
  open: { title: 'War in Ireland', text: 'The country is at war with the British government, in ambushes and burnings and curfews. Most people are not fighting, and all of them are living in it.', kid: 'There are soldiers on the road, and the grown-ups have stopped going out after dark.' },
  yearly: ['There is a curfew, and nobody is quite sure whom it is meant to stop.'],
  news: [['Curfew imposed', 'Nobody may be on the streets after dark. Several people were fined on the first night, and one was shot.'], ['A truce is announced', 'The fighting will stop on Monday. Crowds gathered at the town hall to hear it read out.']],
  blurb: 'A guerrilla war for independence.',
});
H('ie_civil_war', {
  name: 'the Irish Civil War', chip: 'Civil War', emoji: '☘️', kind: 'war',
  years: [1922, 1923], where: ['ie'],
  war: { ie: { name: 'the Irish Civil War', foe: 'the other side', foeAdj: 'opposing', theater: 'towns and roads across the country', years: [1922, 1923], intensity: 2, civil: true, result: 'ceasefire', end: 'The fighting stopped in the spring. The people who had fought together a year earlier were not speaking, and would not for a very long time.' } },
  fx: { mood: -2, jobs: -0.1 },
  open: { title: 'Brother against brother', text: 'The Treaty has split the country. The people who fought side by side last year are fighting each other, in the towns and on the roads. It is a war in which everybody knows everybody.', kid: 'Families are arguing, and some uncles are not speaking to some cousins.' },
  news: [['Fighting in the south', 'Roads were blocked and bridges blown. Local people said they are not sure who is who.'], ['A ceasefire is ordered', 'The fighting has been called off. Many will not forgive.']],
  blurb: 'A civil war over the Treaty. Neighbors on opposite sides.',
});
H('ie_emigration_50s', {
  name: 'the emigration years', chip: 'Emigration', emoji: '🚢', kind: 'econ', popup: false,
  years: [1950, 1959], where: ['ie'], fx: { jobs: -0.15, mood: -1 },
  open: { title: 'The boat', text: 'There is no work, and the young are leaving, on the boat to England and on the ships to America. Every family has someone abroad, and every town has fewer people than it did.', kid: 'Your cousins went on the boat, and the house is quieter every year.' },
  news: [['Another year of emigration', 'Thousands more left last year than the one before. The government said it is a matter of concern.']],
  blurb: 'No work at home. The young are leaving.',
});
H('ie_emigration_80s', {
  name: 'the eighties slump', chip: 'The slump', emoji: '🚢', kind: 'econ', popup: false,
  years: [1980, 1989], where: ['ie'], fx: { jobs: -0.2, mood: -1, rates: 0.03 },
  open: { title: 'The slump', text: 'Unemployment is above fifteen percent, taxes are high, and the young are on the plane to London, Boston or Sydney. Another decade of leaving.', kid: 'Everybody who finishes school seems to leave on a plane.' },
  news: [['Unemployment still rising', 'More than one in six is out of work. The government says it is a matter of confidence, and everybody else says it is a matter of jobs.']],
  blurb: 'High unemployment and high taxes. The young are leaving again.',
});
H('celtic_tiger', {
  name: 'the Celtic Tiger', chip: 'Celtic Tiger', emoji: '🐯', kind: 'econ', tone: 'good',
  years: [1995, 2007], where: ['ie'], fx: { jobs: 0.3, pay: 0.03, housing: 0.1, mood: 1 }, biz: { construction: 0.3, realestate: 0.3 },
  open: { title: 'The Celtic Tiger', text: 'The economy is growing faster than anybody has seen. There are jobs for everybody, wages are rising, and the people who emigrated are coming home. House prices are going up like rockets.', kid: 'There is a lot more money about, and the grown-ups talk about house prices a lot.' },
  yearly: ['Cranes are on every skyline, and there is a new apartment block where there was a field.', 'Everybody you know has a second car, or a holiday home, or is thinking about it.'],
  close: 'The boom is over. The cranes are still up, and nobody is working on them.',
  news: [['Unemployment at a record low', 'Employers can not find enough workers. Many are advertising in other countries.'], ['House prices double again', 'A semi-detached in the suburbs now costs more than the average person will earn in ten years. Banks are happy to lend.']],
  blurb: 'A booming economy: plenty of jobs, rising pay, and house prices that keep climbing.',
});

/* ---- Australia ---------------------------------------------------------------------------------------------------- */
H('darwin_1942', {
  name: 'the bombing of Darwin', chip: 'Bombing of Darwin', emoji: '🚨', kind: 'war', popup: true,
  years: [1942, 1943], cities: ['au:Darwin'], curve: [1, 0.5], blast: { home: 0.3, hurt: 0.08, dead: 0.015, npc: 0.03 }, cause: 'an air raid', fx: { mood: -2 },
  open: { title: 'The war comes home', text: 'Enemy aircraft have bombed the city, in the first of many raids. Most of the town has been told to leave. For the first time, the war is not far away.', kid: 'There were planes, and the whole town was sent south in a hurry.' },
  news: [['Darwin bombed', 'The raid lasted less than an hour. Ships in the harbor were hit, and fires burned through the night.']],
  blurb: 'Air raids on a northern city.',
});
H('au_recession_91', {
  name: 'the 1991 recession', chip: 'Recession', emoji: '📉', kind: 'econ',
  years: [1990, 1992], where: ['au'], fx: { jobs: [-0.1, -0.25, -0.2], layoff: [0.02, 0.05, 0.04], housing: [-0.02, -0.04, -0.02], rates: [0.02, 0.01, -0.02], mood: [-0.5, -1.5, -1] },
  open: { title: 'The recession we had to have', text: 'Interest rates have been very high and now the economy has dropped away. Unemployment is above ten percent, businesses are failing, and people are being told that this is for the best.', kid: 'Lots of grown-ups are out of work, and nobody says it is good.' },
  close: 'The recession is over, and the growth that follows is going to last a very long time.',
  news: [['Unemployment passes 10 percent', 'The highest in sixty years. The treasurer said it was a necessary medicine. A lot of people said they would like to stop taking it.']],
  blurb: 'High unemployment and failing businesses after years of high interest rates.',
});
H('mining_boom', {
  name: 'the mining boom', chip: 'Mining boom', emoji: '⛏️', kind: 'econ', tone: 'good', popup: false,
  years: [2003, 2012], where: ['au'], fx: { jobs: 0.1, pay: 0.015, housing: 0.04, mood: 0.5 },
  open: { title: 'The mining boom', text: 'China is buying everything Australia can dig up, and the economy is booming on the back of it. The mines are paying tradespeople more than doctors, and people are moving west for the work.', kid: 'The grown-ups talk about iron ore, and everyone seems to be buying a house.' },
  news: [['Workers flood west', 'Flights to the mining towns are full, and the hotels are booked years ahead. Truck drivers can earn six figures.']],
  blurb: 'Mining money lifts the whole economy.',
});
H('perth_boom', {
  name: 'the Perth boom', emoji: '⛏️', kind: 'econ', quiet: true,
  years: [2003, 2012], cities: ['au:Perth'], fx: { jobs: 0.15, pay: 0.015, housing: 0.06 },
});

/* ---- Mexico ----------------------------------------------------------------------------------------------------------- */
H('mx_revolution', {
  name: 'the Mexican Revolution', chip: 'The Revolution', emoji: '🌵', kind: 'war',
  years: [1910, 1920], where: ['mx'], sev: { mx: 1 }, fx: { mood: -2, jobs: -0.15, living: 0.15 },
  war: { mx: { name: 'the Mexican Revolution', foe: 'the other side', foeAdj: 'opposing', theater: 'the whole country', years: [1910, 1920], intensity: 3, civil: true, draft: [1913, 1916], draftAges: [18, 40], result: 'ceasefire',
    end: 'The fighting wound down at last. A million people had died, the country was exhausted, and a new constitution was waiting to be put into practice.' } },
  open: { title: 'The Revolution', text: 'The country is in revolt, and in armed camps. Armies march through the towns, take what they need and move on. Nobody is sure who is in charge, and everybody has to choose how to get by.', kid: 'Soldiers came through the village and took the horses. The grown-ups said not to go out.' },
  yearly: ['A column of soldiers passed through, and nobody was sure which side they were on.', 'The money in your pocket was valid last week.'],
  close: 'The Revolution is over. The country is quiet, and a great many people are missing.',
  news: [['Fighting in the north', 'The railway is cut. Supplies in the capital have been rationed for a month.'], ['Money worthless again', 'The new notes were declared invalid on Tuesday. Merchants are accepting only silver.']],
  blurb: 'A long civil war. Armies pass through, and nobody knows whose money is good.',
});
H('mx_debt_crisis', {
  name: 'the 1982 debt crisis', chip: 'Debt crisis', emoji: '💸', kind: 'econ',
  years: [1982, 1983], where: ['mx'], fxShock: { MXN: [-0.4, -0.1] }, fx: { living: [0.3, 0.3], rates: [0.1, 0.08], jobs: [-0.15, -0.15], layoff: [0.04, 0.03], mood: [-2, -1.5] },
  open: { title: 'The peso collapses', text: 'The government has said it cannot pay its debts. The peso has lost half its value, prices are leaping, and the banks have been nationalized. Savings buy less every week.', kid: 'The grown-ups complain that everything costs more every day.' },
  news: [['Peso devalued again', 'The currency has lost half its value since the spring. Shops are changing their prices twice a day.'], ['Banks nationalized', 'The president announced it on television. Crowds gathered at the banks, and some people tried to withdraw everything.']],
  blurb: 'The peso collapses, prices leap, and the banks are taken over.',
});
H('mx_tequila', {
  name: 'the Tequila crisis', chip: 'Tequila crisis', emoji: '💸', kind: 'econ',
  years: [1994, 1996], where: ['mx'], fxShock: { MXN: [-0.1, -0.45, 0] }, fx: { rates: [0.05, 0.15, 0.08], jobs: [-0.05, -0.25, -0.1], layoff: [0.01, 0.07, 0.03], living: [0.04, 0.2, 0.1], mood: [-0.5, -2, -1] },
  open: { title: 'The December mistake', text: 'The peso has crashed overnight. Interest rates have tripled, your mortgage payment doubled, and a lot of businesses are failing. People who borrowed in dollars are in particular trouble.', kid: 'The grown-ups are very upset and are always on the phone with the bank.' },
  news: [['Peso in free fall', 'The central bank has floated the currency, and it dropped by a third in a week. Importers are closing.'], ['Debtors protest', 'Thousands have marched against the banks. Some said they will stop paying altogether.']],
  blurb: 'The peso collapses. Interest rates triple, and so do mortgage payments.',
});

/* ---- Brazil ------------------------------------------------------------------------------------------------------------ */
H('br_hyperinflation', {
  name: 'hyperinflation', chip: 'Hyperinflation', emoji: '💸', kind: 'econ',
  years: [1986, 1994], where: ['br'], cash: { 1989: 0.4, 1990: 0.25, 1991: 0.3, 1992: 0.4, 1993: 0.45 }, cashBuffer: 2000, cashKeep: true,
  fx: { living: 0.2, mood: -1, jobs: -0.05 },
  open: { title: 'Prices that change by the day', text: 'Prices are rising by double digits every month. Shops change their labels twice a day, wages are paid and spent the same afternoon, and nobody saves in cash. Plans have been tried, and they have failed, and the next one is on the way.', kid: 'The grown-ups rush to the supermarket on payday, before the prices change.' },
  yearly: ['People spend their pay the day they get it. Savings are in anything but money.', 'A new currency has been announced, again. Nobody is sure what it is worth.'],
  close: 'The prices have finally stopped running away. People have forgotten what a calm shop is like.',
  news: [['Inflation hits 80 percent in a month', 'Workers are demanding their wages be paid daily. Several supermarkets have staff who do nothing but relabel prices.'], ['New plan announced', 'The finance minister said this plan will work. The last one was also announced as the plan that would work.']],
  blurb: 'Prices rise by the day. Cash in your pocket melts, and savings need to be indexed.',
});
H('plano_real', {
  name: 'the Real Plan', chip: 'Real Plan', emoji: '💰', kind: 'moment', tone: 'good', popup: true, years: [1994, 1995], where: ['br'], fx: { mood: [3, 1.5], living: [-0.05, 0] },
  open: { title: 'A currency that holds still', text: 'A new currency has arrived, and for the first time in years, prices are stopping. People are checking their receipts to make sure it is true. It is.', kid: 'The grown-ups are happy about something called the Real, and the prices are not changing any more.' },
  news: [['Prices stable for the first time in a decade', 'Shoppers say it feels strange not to rush. Some said they had forgotten what a normal price tag looks like.']],
  blurb: 'A new currency ends years of runaway prices.',
});
H('br_recession', {
  name: 'the 2015 recession', chip: 'Recession', emoji: '📉', kind: 'econ',
  years: [2014, 2016], where: ['br'], fxShock: { BRL: [-0.1, -0.3, -0.03] }, fx: { jobs: [-0.1, -0.3, -0.25], layoff: [0.02, 0.07, 0.07], pay: [0, -0.02, -0.02], living: [0.03, 0.08, 0.06], mood: [-0.5, -2, -2] },
  open: { title: 'The deepest recession', text: 'The economy is in the deepest recession in the country’s history. Unemployment has doubled, the real has lost a third of its value, and people have been in the streets about the government.', kid: 'The grown-ups are tense, and there are a lot of marches on the news.' },
  news: [['Unemployment at a record', 'More than twelve million are out of work. Many have taken to selling snacks and driving for apps.'], ['The real hits a record low', 'Travel abroad is out of reach for most. Prices of imported goods are leaping.']],
  blurb: 'The deepest recession in history. Jobs vanish, and the currency falls.',
});
