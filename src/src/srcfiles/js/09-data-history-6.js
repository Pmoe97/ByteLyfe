/* =====================================================================
 * 09-data-history-6.js — local moments (see 09-data-history.js for the row format): the Olympic Games coming to a
 * city, disasters that hit one place, and the years the radio, the television, the home computer, the phone, the
 * web and social media reached each country. Two small builders keep the rows short; they only register rows.
 *   histGames(id, { city: 'uk:London', year, winter, empty, note })   the two years of building and the year of the Games
 *   histDisaster(id, { name, chip, emoji, year | years, places | where + sev, blast, cause, dip, mood, text, kid, head, body, blurb })
 *                                  one bad year, then the rebuilding (housing dips and comes back, the building trades hire)
 * ===================================================================== */

/* ---- the Olympic Games ------------------------------------------------------------------------------------------------------ */
function histGames(id, o) {
  const [cc, city] = o.city.split(':'), y = o.year, season = o.winter ? 'Winter' : 'Summer', f = o.empty ? 0.4 : 1;
  H(id, {
    name: `the ${city} ${y} Games`, chip: `${city} ${y}`, emoji: o.winter ? '⛷️' : '🏅', kind: 'moment', tone: 'good', popup: false, salience: 0.8,
    years: [y - 2, y], cities: [o.city], games: y, empty: !!o.empty,
    fx: { jobs: [0.04 * f, 0.08 * f, 0.1 * f], housing: [0.01 * f, 0.03 * f, 0.04 * f], mood: [0.2, 0.3, o.empty ? 0.3 : 1] },
    open: { title: 'The Games are coming', text: `${city} will host the ${y} ${season} Games. ${o.note}`, kid: `There are building sites everywhere in ${city}, and everyone is talking about the Games.` },
    news: [[`${city} gets ready for the Games`, o.note], [`The ${y} Games open`, o.empty ? 'The stadium was nearly empty, and the whole world watched on television instead.' : 'Crowds filled the streets for the opening, and the city looked its best.']],
    blurb: `${city} hosts the ${y} ${season} Games. Building, visitors and a little extra work.`,
  });
}
histGames('games_london_1908', { city: 'uk:London', year: 1908, note: 'A stadium is going up at White City in less than a year, with a running track and a swimming pool in the middle.' });
histGames('games_stockholm_1912', { city: 'se:Stockholm', year: 1912, note: 'There will be electric timing and a photo finish for the first time, and a stadium built of red brick.' });
histGames('games_paris_1924', { city: 'fr:Paris', year: 1924, note: 'Athletes will be housed in huts beside the stadium, a village of their own.' });
histGames('games_los_angeles_1932', { city: 'us:Los Angeles', year: 1932, note: 'In the middle of the Depression, the city is building a stadium and a village in the hills, and hiring.' });
histGames('games_london_1948', { city: 'uk:London', year: 1948, note: 'The first Games since the war. There is rationing, so athletes are asked to bring their own towels, and the stadium is a little scuffed.' });
histGames('games_melbourne_1956', { city: 'au:Melbourne', year: 1956, note: 'The first Games in the southern hemisphere. The whole city is being painted.' });
histGames('games_rome_1960', { city: 'it:Rome', year: 1960, note: 'The ruins are venues, and the marathon will finish under an ancient arch.' });
histGames('games_tokyo_1964', { city: 'jp:Tokyo', year: 1964, note: 'The city is being rebuilt for the Games, with new motorways, a monorail, and a bullet train to Osaka.' });
histGames('games_mexico_city_1968', { city: 'mx:Mexico City', year: 1968, note: 'The first Games in Latin America, and the first at this altitude. New stadiums and a metro are being built.' });
histGames('games_munich_1972', { city: 'de:Munich', year: 1972, note: 'A tent-roofed stadium and an underground rail line are being built for the Games.' });
histGames('games_montreal_1976', { city: 'ca:Montreal', year: 1976, note: 'A huge stadium with a leaning tower is going up, and people say the bill will take decades to pay.' });
histGames('games_los_angeles_1984', { city: 'us:Los Angeles', year: 1984, note: 'The Games are being paid for by sponsors, not taxes, and there is a lot of talk of what that means.' });
histGames('games_seoul_1988', { city: 'kr:Seoul', year: 1988, note: 'The whole world will see the new Korea. The river is being cleaned and the roads widened.' });
histGames('games_barcelona_1992', { city: 'es:Barcelona', year: 1992, note: 'The city has turned its waterfront and its old quarters inside out for the Games.' });
histGames('games_atlanta_1996', { city: 'us:Atlanta', year: 1996, note: 'A new stadium and a park downtown are being built. Hotels are booking a year ahead.' });
histGames('games_sydney_2000', { city: 'au:Sydney', year: 2000, note: 'A stadium is rising in Homebush Bay, and the harbor is being prepared for a firework display.' });
histGames('games_london_2012', { city: 'uk:London', year: 2012, note: 'A whole new park is being built in the east of the city, on the site of old factories.' });
histGames('games_rio_2016', { city: 'br:Rio de Janeiro', year: 2016, note: 'The first Games in South America. New train lines and arenas are being built, in the middle of a recession.' });
histGames('games_tokyo_2021', { city: 'jp:Tokyo', year: 2021, empty: true, note: 'The Games were put off a year by the pandemic, and will be held with no spectators in the stands.' });
histGames('games_paris_2024', { city: 'fr:Paris', year: 2024, note: 'Events will be held along the river and in front of famous monuments, and the city is being rebuilt around them.' });
histGames('winter_sapporo_1972', { city: 'jp:Sapporo', year: 1972, winter: true, note: 'The first Winter Games in Asia. Ski jumps and a new subway are being built.' });
histGames('winter_calgary_1988', { city: 'ca:Calgary', year: 1988, winter: true, note: 'A ski-jump tower and a speed-skating oval are being built, and the whole city is wearing white hats.' });
histGames('winter_turin_2006', { city: 'it:Turin', year: 2006, winter: true, note: 'The old industrial city is cleaning itself up for the Winter Games.' });
histGames('winter_vancouver_2010', { city: 'ca:Vancouver', year: 2010, winter: true, note: 'A new line to the airport and a village on the waterfront are being built.' });

/* ---- disasters in one place --------------------------------------------------------------------------------------------------- */
function histDisaster(id, o) {
  const y0 = o.years ? o.years[0] : o.year, y1 = o.years ? o.years[1] : o.year + 2, span = y1 - y0 + 1;
  const dip = o.dip === undefined ? 0.08 : o.dip, mood = o.mood === undefined ? 1.5 : o.mood;
  const tail = (a, b, c) => Array.from({ length: span }, (_, i) => (i === 0 ? a : i === 1 ? b : i === 2 ? c : 0));
  const row = {
    name: o.name, chip: o.chip, emoji: o.emoji, kind: 'disaster', years: [y0, y1],
    curve: o.curve || Array.from({ length: span }, (_, i) => (i === 0 ? 1 : 0)),
    fx: { housing: tail(-dip, dip / 2, dip / 2), jobs: tail(0, 0.07, 0.04), mood: tail(-mood, -mood / 2, 0) }, cats: { jobs: { _: 1, trades: 2.5 } },
    open: { title: o.title || o.chip, text: o.text, kid: o.kid }, news: [[o.head, o.body]], blurb: o.blurb,
  };
  if (o.blast) { row.blast = o.blast; row.cause = o.cause; }
  if (o.places) { row.cities = Object.keys(o.places); row.citySev = o.places; } else { row.where = o.where; row.sev = o.sev; }
  if (o.popup !== undefined) row.popup = o.popup;
  H(id, row);
}
histDisaster('paris_flood_1910', { name: 'the Paris flood', chip: 'Flood', emoji: '🌊', year: 1910, places: { 'fr:Paris': 1 }, blast: { home: 0.08, hurt: 0.01, dead: 0, npc: 0.002 }, cause: 'the flood', dip: 0.04, mood: 1,
  text: 'The river has risen over its banks and into the streets, the metro tunnels and the cellars. People are crossing the city by boat and walking on planks, and the water will not go down for weeks.',
  kid: 'The river is in the street, and people are going about in boats.', head: 'The river floods Paris', body: 'Boats now ply streets in the middle of the city. Officials said the water would take weeks to go down.', blurb: 'The river floods the streets of the city.' });
histDisaster('halifax_1917', { name: 'the Halifax explosion', chip: 'Explosion', emoji: '💥', year: 1917, places: { 'ca:Halifax': 1 }, blast: { home: 0.5, hurt: 0.3, dead: 0.02, npc: 0.04 }, cause: 'the explosion', dip: 0.15, mood: 3,
  text: 'Two ships collided in the harbor, and one of them was carrying explosives. The blast flattened the north end of the city and broke windows for miles. A blizzard is coming, and the survivors are trying to find shelter.',
  kid: 'There was a huge bang in the harbor, and then the windows broke. Everyone is looking for their families.', head: 'The harbor explodes', body: 'Thousands are without homes. Relief trains are on their way, and a blizzard has made the work harder.', blurb: 'A harbor explosion levels part of the city.' });
histDisaster('kanto_1923', { name: 'the Great Kantō earthquake', chip: 'Earthquake', emoji: '🏚️', year: 1923, places: { 'jp:Tokyo': 1, 'jp:Yokohama': 1 }, blast: { home: 0.55, hurt: 0.25, dead: 0.02, npc: 0.05 }, cause: 'the Great Kantō earthquake', dip: 0.2, mood: 4,
  text: 'At midday the ground shook, and then the fires began. Whole districts of the city have burned, the water mains have broken, and thousands are sleeping in the open.',
  kid: 'The ground shook, and then there was fire. Everyone is sleeping outside.', head: 'The earthquake and the fires', body: 'Much of the city has been destroyed. Families are searching for each other, and rebuilding will take years.', blurb: 'A massive earthquake and the fires that follow it.' });
histDisaster('miami_1926', { name: 'the Miami hurricane', chip: 'Hurricane', emoji: '🌀', years: [1926, 1928], places: { 'us:Miami': 1 }, blast: { home: 0.45, hurt: 0.1, dead: 0.01, npc: 0.02 }, cause: 'the hurricane', dip: 0.15, mood: 2,
  text: 'A hurricane has come ashore at night and passed over the city. Roofs are gone, boats are in the streets, and the land boom has stopped overnight.',
  kid: 'The wind was loud all night, and in the morning there were boats on the road.', head: 'The hurricane levels Miami', body: 'Thousands of buildings were destroyed. Investors who bought land by the lot are leaving town.', blurb: 'A hurricane destroys much of the city and ends its land boom.' });
histDisaster('smog_1952', { name: 'the Great Smog', chip: 'Smog', emoji: '🌫️', year: 1952, places: { 'uk:London': 1 }, blast: { hurt: 0.15, dead: 0.004, npc: 0.015 }, cause: 'the smog', dip: 0, mood: 1.5,
  text: 'A thick, yellow fog has settled over the city and will not lift. You can not see your hands, buses are crawling behind men with torches, and people are coughing everywhere. The old and the young are hit hardest.',
  kid: 'The fog is so thick that you can not see across the road, and it tastes of coal.', head: 'The fog that would not lift', body: 'Hospitals are full of people with breathing trouble. Doctors say the coal smoke is to blame.', blurb: 'A deadly fog of coal smoke settles over the city.' });
histDisaster('hamburg_1962', { name: 'the Hamburg flood', chip: 'Flood', emoji: '🌊', year: 1962, places: { 'de:Hamburg': 1, 'de:Bremen': 0.2 }, blast: { home: 0.3, hurt: 0.05, dead: 0.005, npc: 0.01 }, cause: 'the storm flood', dip: 0.08, mood: 2,
  text: 'A winter storm drove the sea up the river in the night, and the dikes broke. Whole districts are under water, and people are on rooftops waiting for the boats.',
  kid: 'The water came in the night, and now we are living upstairs.', head: 'The dikes break', body: 'Whole districts are flooded. Rescue workers are using helicopters and boats to reach the stranded.', blurb: 'A storm flood breaks the dikes and covers districts of the port.' });
histDisaster('florence_1966', { name: 'the Florence flood', chip: 'Flood', emoji: '🌊', year: 1966, places: { 'it:Florence': 1, 'it:Venice': 0.6 }, blast: { home: 0.3, hurt: 0.03, dead: 0.003, npc: 0.005 }, cause: 'the flood', dip: 0.08, mood: 1.5,
  text: 'The river burst its banks in the night and swept through the old city. Shops and cellars are full of mud and oil, and volunteers from around the world are arriving to save the books and paintings.',
  kid: 'The river came into the city, and now everything is covered in mud.', head: 'The river floods the old city', body: 'Mud-covered volunteers are carrying books out of the libraries by hand.', blurb: 'The river floods the old city and its treasures.' });
histDisaster('tracy_1974', { name: 'Cyclone Tracy', chip: 'Cyclone', emoji: '🌪️', year: 1974, places: { 'au:Darwin': 1 }, blast: { home: 0.85, hurt: 0.2, dead: 0.008, npc: 0.02 }, cause: 'Cyclone Tracy', dip: 0.25, mood: 3,
  text: 'On Christmas Eve a cyclone passed over the city, and by morning most of the houses were gone. Almost everyone is homeless, and planes are taking people south.',
  kid: 'The wind took the roof off at Christmas, and now we are going to stay somewhere else.', head: 'The city is flattened', body: 'Most homes are destroyed. Evacuation flights are taking out the children and the elderly first.', blurb: 'A cyclone destroys most of the city on Christmas Eve.' });
histDisaster('brisbane_1974', { name: 'the Brisbane flood', chip: 'Flood', emoji: '🌊', year: 1974, places: { 'au:Brisbane': 0.7 }, blast: { home: 0.3, hurt: 0.03, dead: 0.002, npc: 0.004 }, cause: 'the flood', dip: 0.07, mood: 1.2,
  text: 'The river has risen and covered whole streets. People are paddling down their own roads, and the army is out with boats.',
  kid: 'The river is in our street, and we are paddling in boats.', head: 'The river rises', body: 'Thousands of homes are flooded. People are taking refuge in schools and church halls.', blurb: 'The river floods thousands of homes.' });
histDisaster('blackout_1977', { name: 'the 1977 blackout', chip: 'Blackout', emoji: '🔌', year: 1977, places: { 'us:New York': 1 }, blast: null, dip: 0, mood: 1, popup: false,
  text: 'The lights went out in the middle of a hot night, and they stayed out. In some blocks people shared candles and stories on the steps. In others, stores were broken into and looted.',
  kid: 'The lights went out all over the city, and the grown-ups sat on the stoop all night.', head: 'The city goes dark', body: 'Power failed across the city for a whole day and night. Order was kept in some places and lost in others.', blurb: 'The power fails across the city for a night.' });
histDisaster('irpinia_1980', { name: 'the Irpinia earthquake', chip: 'Earthquake', emoji: '🏚️', year: 1980, places: { 'it:Naples': 0.5 }, blast: { home: 0.2, hurt: 0.04, dead: 0.003, npc: 0.006 }, cause: 'the earthquake', dip: 0.08, mood: 2,
  text: 'An earthquake in the hills inland shook the city at dusk. Buildings have collapsed, and many people are sleeping in cars and in tents.',
  kid: 'The ground shook, and now we sleep in the car.', head: 'The earthquake shakes the south', body: 'Rescuers are still digging in the hill towns. In the city, people are afraid to go back inside.', blurb: 'An earthquake brings down buildings across the south.' });
histDisaster('mexico_1985', { name: 'the Mexico City earthquake', chip: 'Earthquake', emoji: '🏚️', year: 1985, places: { 'mx:Mexico City': 1, 'mx:Puebla': 0.2 }, blast: { home: 0.35, hurt: 0.1, dead: 0.01, npc: 0.025 }, cause: 'the earthquake', dip: 0.12, mood: 3,
  text: 'The ground shook for minutes in the early morning. Whole buildings in the center have fallen, and ordinary people are digging in the rubble with their hands, because they can not wait.',
  kid: 'The ground shook for a long time, and the neighbors are all digging.', head: 'The city shakes', body: 'Hundreds of buildings have collapsed. Volunteers are forming chains to pass rubble, and they are not stopping at night.', blurb: 'A huge earthquake brings down buildings across the center.' });
histDisaster('storm_1987', { name: 'the Great Storm', chip: 'Storm', emoji: '🌪️', year: 1987, places: { 'uk:London': 0.6 }, blast: { home: 0.1, hurt: 0.03, dead: 0.002 }, cause: 'the storm', dip: 0.03, mood: 1,
  text: 'You went to bed after a forecaster said there would be no hurricane, and woke to a street full of fallen trees. There are no trains, no power, and roofs on the road.',
  kid: 'In the night the wind knocked down the big tree in the road, and it is across the street.', head: 'The night of the great wind', body: 'Millions of trees have come down. Trains are stopped and power is out, and people are taking the day off.', blurb: 'A storm in the night brings down millions of trees.' });
histDisaster('luzon_1990', { name: 'the Luzon earthquake', chip: 'Earthquake', emoji: '🏚️', year: 1990, places: { 'ph:Baguio': 1, 'ph:Manila': 0.15, 'ph:Quezon City': 0.15 }, blast: { home: 0.4, hurt: 0.12, dead: 0.012, npc: 0.025 }, cause: 'the earthquake', dip: 0.1, mood: 2,
  text: 'An earthquake struck in the afternoon. In the mountains, hotels and schools have collapsed and roads are cut by landslides. In the capital, tall buildings are cracked.',
  kid: 'The ground shook in the afternoon, and now there is a big crack in the school.', head: 'Earthquake in the north', body: 'The mountain city is cut off, and rescue crews have not yet reached the worst-hit areas.', blurb: 'A strong earthquake wrecks the mountain city.' });
histDisaster('andrew_1992', { name: 'Hurricane Andrew', chip: 'Hurricane', emoji: '🌀', year: 1992, places: { 'us:Miami': 1 }, blast: { home: 0.5, hurt: 0.08, dead: 0.004, npc: 0.008 }, cause: 'Hurricane Andrew', dip: 0.12, mood: 2,
  text: 'The hurricane came ashore south of the city before dawn, and tens of thousands of homes are gone. The roads are blocked with debris, and the clean-up will take years.',
  kid: 'The wind was scary all night, and in the morning our neighbor’s house was gone.', head: 'Hurricane levels the south', body: 'Whole neighborhoods are flattened. Insurance companies are bracing for the largest bill in their history.', blurb: 'A hurricane flattens whole neighborhoods in the south.' });
histDisaster('northridge_1994', { name: 'the Northridge earthquake', chip: 'Earthquake', emoji: '🏚️', year: 1994, places: { 'us:Los Angeles': 0.8 }, blast: { home: 0.2, hurt: 0.05, dead: 0.003, npc: 0.006 }, cause: 'the earthquake', dip: 0.07, mood: 1.5,
  text: 'At 4:30 in the morning the ground shook, and the city went dark. Freeways have collapsed, apartment buildings have fallen, and people are sleeping in their cars and in the parks.',
  kid: 'The ground shook in the middle of the night, and we all slept in the car.', head: 'The city shakes at dawn', body: 'A motorway has fallen. Thousands are homeless, and aftershocks keep coming.', blurb: 'A pre-dawn earthquake brings down buildings and freeways.' });
histDisaster('kobe_1995', { name: 'the Kobe earthquake', chip: 'Earthquake', emoji: '🏚️', year: 1995, places: { 'jp:Kobe': 1, 'jp:Osaka': 0.3, 'jp:Kyoto': 0.1 }, blast: { home: 0.5, hurt: 0.18, dead: 0.008, npc: 0.02 }, cause: 'the Kobe earthquake', dip: 0.15, mood: 3,
  text: 'Just before dawn, the ground shook, and parts of the city fell. A raised highway lies on its side, the port is wrecked, and fires are burning in the old streets.',
  kid: 'The ground shook before dawn, and the road outside has fallen over.', head: 'The city collapses at dawn', body: 'Thousands of buildings are down. Volunteers from across the country are arriving with food and water.', blurb: 'A dawn earthquake wrecks the port city.' });
histDisaster('chicago_heat_1995', { name: 'the Chicago heat wave', chip: 'Heat wave', emoji: '🥵', year: 1995, places: { 'us:Chicago': 1 }, blast: { hurt: 0.06, dead: 0.002, npc: 0.012 }, cause: 'the heat wave', dip: 0, mood: 1,
  text: 'It has not gone below ninety degrees for days, even at night. Hydrants are open on every block, hospitals are full, and the old and the people living alone are in real danger.',
  kid: 'It is so hot that nobody can sleep, and the fire hydrants are open on every street.', head: 'Heat wave grips the city', body: 'Hospitals are full. Neighbors are being asked to check on each other, especially the elderly.', blurb: 'A week of extreme heat that hits the old and isolated hardest.' });
histDisaster('ice_storm_1998', { name: 'the ice storm', chip: 'Ice storm', emoji: '❄️', year: 1998, places: { 'ca:Montreal': 1, 'ca:Ottawa': 0.8, 'ca:Quebec City': 0.5 }, blast: { home: 0.03, hurt: 0.05, npc: 0.002 }, cause: 'the ice storm', dip: 0.03, mood: 2,
  text: 'Freezing rain fell for days. Trees, wires and pylons are coated in ice and have collapsed, and a million homes are without power, in the cold, for weeks. People are crowding into shelters and sleeping by fires.',
  kid: 'Everything is covered with ice, and we have been without power for days.', head: 'Ice brings down the grid', body: 'Hundreds of pylons have collapsed. Soldiers have been brought in to help.', blurb: 'Freezing rain knocks out the power for weeks in midwinter.' });
histDisaster('elbe_2002', { name: 'the Elbe flood', chip: 'Flood', emoji: '🌊', year: 2002, places: { 'de:Dresden': 1, 'de:Leipzig': 0.2 }, blast: { home: 0.3, hurt: 0.02, dead: 0.002, npc: 0.004 }, cause: 'the flood', dip: 0.07, mood: 1.5,
  text: 'After days of heavy rain, the river has risen to levels no one alive has seen. The old town is under water, and thousands are filling sandbags in the streets.',
  kid: 'It has rained for days, and the river is in the middle of the town.', head: 'Century flood on the Elbe', body: 'The old town is flooded. Volunteers by the thousand have arrived to help with the sandbags.', blurb: 'The river rises to a record and floods the old town.' });
histDisaster('canberra_2003', { name: 'the Canberra bushfires', chip: 'Bushfires', emoji: '🔥', year: 2003, places: { 'au:Canberra': 1 }, blast: { home: 0.2, hurt: 0.05, dead: 0.003, npc: 0.006 }, cause: 'the bushfires', dip: 0.07, mood: 1.5,
  text: 'The fires that have burned in the hills for weeks have swept into the suburbs. The sky went black in the afternoon, and hundreds of houses are gone.',
  kid: 'The sky went black in the afternoon, and some of the houses on the hill burned down.', head: 'Fire reaches the suburbs', body: 'Hundreds of homes are lost. The city is wrapped in smoke, and people are still searching for their pets.', blurb: 'Bushfires sweep into the suburbs of the capital.' });
histDisaster('ne_blackout_2003', { name: 'the 2003 blackout', chip: 'Blackout', emoji: '🔌', year: 2003, places: { 'us:New York': 0.7, 'ca:Toronto': 0.7 }, blast: null, dip: 0, mood: 0.7, popup: false,
  text: 'In the afternoon, the power went out across a huge area of two countries. Traffic lights were off, subways stopped, and thousands walked home across the bridges in the heat. In the evening there were street parties.',
  kid: 'The lights went out everywhere, and we ate all the ice cream before it melted.', head: 'The lights go out', body: 'Power was restored after a day for most. Officials blamed a fault on a line in the middle of the country.', blurb: 'The power fails across two countries for a day.' });
histDisaster('heat_2003', { name: 'the 2003 heat wave', chip: 'Heat wave', emoji: '🥵', year: 2003, where: ['fr', 'it', 'es', 'de', 'uk'], sev: { fr: 1, it: 0.7, es: 0.6, de: 0.5, uk: 0.2 }, blast: { hurt: 0.03, npc: 0.01 }, cause: 'the heat wave', dip: 0, mood: 1,
  text: 'The heat has not let up for weeks. Rivers are low, harvests are drying, and hospitals and care homes are full. The old and the sick are most at risk, and many families are away on holiday.',
  kid: 'It is so hot that we sit in the cellar, and the grown-ups keep checking on grandma.', head: 'A summer like no other', body: 'Thousands of elderly people have died in the heat. The government is promising a review.', blurb: 'A summer of record heat that hits the old hardest.' });
histDisaster('maemi_2003', { name: 'Typhoon Maemi', chip: 'Typhoon', emoji: '🌀', year: 2003, places: { 'kr:Busan': 1, 'kr:Ulsan': 0.4 }, blast: { home: 0.25, hurt: 0.04, dead: 0.003, npc: 0.006 }, cause: 'Typhoon Maemi', dip: 0.07, mood: 1.5,
  text: 'The strongest typhoon in decades came ashore at the port, with a storm surge that flooded the waterfront. Container cranes toppled, and low-lying districts are under water.',
  kid: 'The typhoon blew all night, and the sea came up the road.', head: 'Typhoon hits the port', body: 'Cranes collapsed at the harbor. The government declared a disaster zone.', blurb: 'A powerful typhoon floods the port city.' });
histDisaster('tsunami_2004', { name: 'the 2004 tsunami', chip: 'Tsunami', emoji: '🌊', year: 2004, places: { 'in:Chennai': 1, 'in:Kochi': 0.3 }, blast: { home: 0.3, hurt: 0.05, dead: 0.004, npc: 0.012 }, cause: 'the tsunami', dip: 0.1, mood: 3,
  text: 'The morning after a great earthquake across the ocean, the sea drew back from the beach and then came back as a wall of water. Whole fishing villages and the coast road are gone, and the city is mourning.',
  kid: 'The sea came up the beach and into the town, and now the whole city is quiet.', head: 'The sea comes in', body: 'Relief camps are being set up along the coast. The scale of the loss is only now becoming clear.', blurb: 'A tsunami strikes the coast without warning.' });
histDisaster('mumbai_2005', { name: 'the Mumbai flood', chip: 'Flood', emoji: '🌊', year: 2005, places: { 'in:Mumbai': 1 }, blast: { home: 0.3, hurt: 0.05, dead: 0.004, npc: 0.008 }, cause: 'the flood', dip: 0.08, mood: 1.5,
  text: 'More rain fell in a day than in a normal year. Roads and railway lines are under water, people are walking home through chest-high flood, and the whole city has stopped.',
  kid: 'It rained all day, and the road turned into a river. We are staying at school tonight.', head: 'The city is under water', body: 'Trains have stopped and thousands are stranded. Strangers are offering food and shelter along the way.', blurb: 'A day of extreme rain floods the whole city.' });
histDisaster('black_saturday_2009', { name: 'Black Saturday', chip: 'Bushfires', emoji: '🔥', year: 2009, places: { 'au:Melbourne': 0.4 }, blast: { home: 0.08, hurt: 0.02, dead: 0.002, npc: 0.004 }, cause: 'the bushfires', dip: 0.04, mood: 1.5,
  text: 'After a record heat wave, fires have swept through the hills north of the city. Towns have burned in a matter of hours, and the smoke has covered the city. The whole state is in mourning.',
  kid: 'There was smoke over the whole city, and some of the towns in the hills burned down.', head: 'Black Saturday', body: 'The worst fires in the state’s history. Relief funds have been opened, and donations are pouring in.', blurb: 'A day of record heat and fires in the hills near the city.' });
histDisaster('ondoy_2009', { name: 'Typhoon Ondoy', chip: 'Typhoon', emoji: '🌀', year: 2009, places: { 'ph:Manila': 1, 'ph:Quezon City': 1, 'ph:Makati': 0.8 }, blast: { home: 0.35, hurt: 0.05, dead: 0.004, npc: 0.01 }, cause: 'Typhoon Ondoy', dip: 0.1, mood: 2,
  text: 'A month’s worth of rain fell in a few hours. Rivers burst their banks, and people are on their roofs waiting for boats. Cars are stacked on each other in the streets.',
  kid: 'The water came up so high that we sat on the roof and waited.', head: 'The city under water', body: 'Flood waters rose fast. Neighbors with boats are rescuing stranded families.', blurb: 'A few hours of rain flood most of the city.' });
histDisaster('nashville_2010', { name: 'the Nashville flood', chip: 'Flood', emoji: '🌊', year: 2010, places: { 'us:Nashville': 1 }, blast: { home: 0.25, hurt: 0.02, dead: 0.001, npc: 0.003 }, cause: 'the flood', dip: 0.07, mood: 1.2,
  text: 'Two days of rain have flooded the river. The music venues, the downtown and a lot of neighborhoods are underwater. Neighbors are pulling each other out of attics.',
  kid: 'It rained for two days, and now the river is in the road.', head: 'The river takes the city', body: 'Thousands are displaced. Volunteers are hauling soaked furniture to the curb.', blurb: 'Heavy rain floods downtown and the neighborhoods around it.' });
histDisaster('brisbane_2011', { name: 'the Brisbane floods', chip: 'Floods', emoji: '🌊', year: 2011, places: { 'au:Brisbane': 1 }, blast: { home: 0.3, hurt: 0.03, dead: 0.002, npc: 0.004 }, cause: 'the floods', dip: 0.08, mood: 1.5,
  text: 'The river has broken its banks and flooded the central city and many suburbs. Homes and businesses are under water, and thousands of volunteers in rubber boots are shoveling mud.',
  kid: 'The river came into the city, and now everyone is cleaning up.', head: 'The river floods the city', body: 'Thousands of homes are inundated. A mud army of volunteers is cleaning up.', blurb: 'The river floods the center and the suburbs.' });
histDisaster('tohoku_2011', { name: 'the Tōhoku earthquake and tsunami', chip: 'Earthquake', emoji: '🌊', year: 2011, places: { 'jp:Sendai': 1, 'jp:Tokyo': 0.2, 'jp:Yokohama': 0.2 }, blast: { home: 0.55, hurt: 0.15, dead: 0.008, npc: 0.025 }, cause: 'the earthquake and tsunami', dip: 0.15, mood: 3,
  text: 'The strongest earthquake the country has ever recorded was followed by a tsunami that swept over the coast. Whole towns are gone, and the power plants on the shore are in trouble. In the capital, trains have stopped and shelves are bare.',
  kid: 'The ground shook for so long, and then the wave came. The grown-ups are very quiet.', head: 'The wave', body: 'The coast has been devastated. The whole country is donating, and many are volunteering.', blurb: 'The strongest earthquake on record, and a tsunami on the coast.' });
H('fukushima_2011', {
  name: 'the nuclear accident', chip: 'Nuclear accident', emoji: '☢️', kind: 'disaster', popup: false, years: [2011, 2013], where: ['jp'],
  fx: { mood: [-1.5, -0.7, -0.3], living: [0.01, 0.01, 0] },
  open: { title: 'The reactors', text: 'The power plant on the coast was damaged, and nobody can say for certain how much radiation has been released. Tens of thousands have been evacuated, the other plants are being shut down, and the whole country is saving electricity.', kid: 'There is a power plant on the coast that is broken, and we turn off lights so there will be enough.' },
  news: [['Power saving across the country', 'Offices have turned off their air conditioning and trains are running less often. Companies have asked staff to dress lightly.']],
  blurb: 'A nuclear plant is damaged, and the country saves electricity.',
});
histDisaster('sandy_2012', { name: 'Hurricane Sandy', chip: 'Hurricane', emoji: '🌀', year: 2012, places: { 'us:New York': 0.9 }, blast: { home: 0.2, hurt: 0.03, dead: 0.003, npc: 0.006 }, cause: 'Hurricane Sandy', dip: 0.07, mood: 1.5,
  text: 'The storm drove the sea into the streets. The subway tunnels are flooded, a quarter of the city is without power, and whole beach neighborhoods are under water and sand.',
  kid: 'The storm pushed the sea into the streets, and the lights went out.', head: 'Storm surge floods the city', body: 'The subway is shut. Tens of thousands are in shelters, and generators are running out of fuel.', blurb: 'A storm drives the sea into the streets and subways.' });
histDisaster('calgary_2013', { name: 'the Calgary flood', chip: 'Flood', emoji: '🌊', year: 2013, places: { 'ca:Calgary': 1 }, blast: { home: 0.25, hurt: 0.01, dead: 0.001, npc: 0.002 }, cause: 'the flood', dip: 0.06, mood: 1,
  text: 'Heavy rain on top of melting snow has sent two rivers over their banks. The downtown has been evacuated and the stadium is under water, and thousands of neighbors are helping each other.',
  kid: 'We had to leave our house because the river came up, and we are staying at a friend’s.', head: 'The rivers rise', body: 'The downtown is closed and many homes are flooded. Volunteers are lining up to help.', blurb: 'Two rivers flood the downtown and the neighborhoods.' });
histDisaster('harvey_2017', { name: 'Hurricane Harvey', chip: 'Hurricane', emoji: '🌀', year: 2017, places: { 'us:Houston': 1 }, blast: { home: 0.45, hurt: 0.05, dead: 0.004, npc: 0.008 }, cause: 'Hurricane Harvey', dip: 0.1, mood: 2,
  text: 'The storm stalled over the city and dropped several feet of rain. Whole neighborhoods are under water, and people with boats are going door to door to take their neighbors out.',
  kid: 'It rained for days, and the water came up to our porch. A man with a boat took us to the shelter.', head: 'A storm that would not leave', body: 'Record rainfall has flooded neighborhoods across the city. Boat owners are volunteering as rescuers.', blurb: 'A stalled hurricane drops record rain and floods the city.' });
histDisaster('mexico_2017', { name: 'the 2017 earthquake', chip: 'Earthquake', emoji: '🏚️', year: 2017, places: { 'mx:Mexico City': 0.8, 'mx:Puebla': 0.8 }, blast: { home: 0.2, hurt: 0.05, dead: 0.005, npc: 0.01 }, cause: 'the earthquake', dip: 0.07, mood: 1.5,
  text: 'On the anniversary of the great earthquake, and just after a drill, the ground shook again. Buildings have collapsed, and volunteers are once more digging in the rubble.',
  kid: 'The ground shook again, and the grown-ups said it was the same day as the other one, long ago.', head: 'The earthquake again', body: 'Volunteers formed chains in the rubble once again. The city has been through it before.', blurb: 'An earthquake brings down buildings on the anniversary of an older one.' });
histDisaster('kerala_2018', { name: 'the Kerala floods', chip: 'Floods', emoji: '🌊', year: 2018, places: { 'in:Kochi': 1 }, blast: { home: 0.35, hurt: 0.03, dead: 0.003, npc: 0.006 }, cause: 'the floods', dip: 0.08, mood: 2,
  text: 'The heaviest monsoon in a century has flooded the state. The airport is closed, and rivers have taken villages. Fishing crews are using their boats to rescue neighbors.',
  kid: 'The monsoon is so heavy that the river is in our house, and the fishermen are bringing boats.', head: 'The monsoon floods the state', body: 'Fishermen are rescuing the stranded in their own boats. The airport is under water.', blurb: 'The heaviest monsoon in a century floods the state.' });
histDisaster('black_summer', { name: 'the Black Summer', chip: 'Bushfires', emoji: '🔥', years: [2019, 2021], curve: [0.5, 1, 0], places: { 'au:Sydney': 0.5, 'au:Canberra': 0.6, 'au:Melbourne': 0.3 }, blast: { home: 0.03, hurt: 0.05, dead: 0.0005, npc: 0.001 }, cause: 'the bushfires', dip: 0.03, mood: 1.5,
  text: 'The fires started in the spring and have burned for months. The sky is orange, the air is full of smoke, and ash is falling on the city. Schools and offices are closing on the worst days.',
  kid: 'The sky is orange and the air smells of smoke. Some days we can not go outside.', head: 'A summer of smoke', body: 'Air quality has fallen to hazardous levels. Fires continue to burn across the state.', blurb: 'Months of bushfires blanket the city in smoke.' });
histDisaster('texas_2021', { name: 'the Texas winter storm', chip: 'Winter storm', emoji: '❄️', year: 2021, places: { 'us:Houston': 0.8 }, blast: { home: 0.2, hurt: 0.04, dead: 0.003, npc: 0.006 }, cause: 'the winter storm', dip: 0.04, mood: 1.5,
  text: 'A deep freeze has hit a place that has never prepared for one. The power grid failed, the water pipes burst, and millions are without heat or running water in the middle of winter.',
  kid: 'It was freezing, the lights went out, and we slept in coats under every blanket we could find.', head: 'The grid fails in the freeze', body: 'Millions are without power. Pipes have burst across the city, and plumbers are booked for weeks.', blurb: 'A deep freeze takes down the power and bursts the pipes.' });
histDisaster('heat_dome_2021', { name: 'the heat dome', chip: 'Heat dome', emoji: '🥵', year: 2021, places: { 'us:Seattle': 0.7, 'us:Portland': 0.8, 'ca:Vancouver': 0.8 }, blast: { hurt: 0.04, dead: 0.0015, npc: 0.008 }, cause: 'the heat dome', dip: 0, mood: 1,
  text: 'The temperature has passed anything ever recorded here, for days, in a place where few homes have air conditioning. Cooling centers are packed, and the old and the ill are in danger.',
  kid: 'It is so hot that we sleep on the floor with the fan and a wet towel.', head: 'Record heat in the northwest', body: 'Many homes have no air conditioning. Fans and ice are sold out, and cooling centers are open all night.', blurb: 'Record-breaking heat in a place that is not built for it.' });
histDisaster('durban_2022', { name: 'the Durban floods', chip: 'Floods', emoji: '🌊', year: 2022, places: { 'za:Durban': 1 }, blast: { home: 0.35, hurt: 0.04, dead: 0.004, npc: 0.008 }, cause: 'the floods', dip: 0.09, mood: 2,
  text: 'Days of rain have swept away roads, bridges and houses in the hillside neighborhoods. The port is closed and thousands are without water.',
  kid: 'It rained so hard that the road washed away, and we have no water at home.', head: 'The rains devastate the city', body: 'The port, the main roads and many homes have been damaged. Relief supplies are being sent.', blurb: 'Days of rain wash away roads, bridges and homes.' });
histDisaster('porto_alegre_2024', { name: 'the Porto Alegre floods', chip: 'Floods', emoji: '🌊', years: [2024, 2025], places: { 'br:Porto Alegre': 1 }, blast: { home: 0.5, hurt: 0.04, dead: 0.003, npc: 0.006 }, cause: 'the floods', dip: 0.1, mood: 2,
  text: 'The rivers rose beyond all records and covered much of the city, including the airport. People are on rooftops, and boats and jet skis are taking them out. Volunteers across the country are sending help.',
  kid: 'The water came into the whole city, and people are using little boats in the street.', head: 'The city under water', body: 'The airport is closed. Donations of food, water and blankets are being collected across the country.', blurb: 'The rivers flood much of the city and its airport.' });
histDisaster('la_fires_2025', { name: 'the Los Angeles wildfires', chip: 'Wildfires', emoji: '🔥', year: 2025, years: [2025, 2025], places: { 'us:Los Angeles': 0.6 }, blast: { home: 0.15, hurt: 0.02, dead: 0.001, npc: 0.003 }, cause: 'the wildfires', dip: 0.05, mood: 1.5,
  text: 'Winds have driven fires through whole neighborhoods in the hills and along the coast. Tens of thousands have been evacuated, and thousands of homes are gone.',
  kid: 'The wind blew the fire into the houses, and some families had to leave in the night.', head: 'Wildfires in the hills', body: 'Neighborhoods have burned. Evacuees are staying in shelters and with friends, and the smoke covers the city.', blurb: 'Wind-driven fires burn neighborhoods across the city.' });

/* ---- firsts: when each reached the country ---------------------------------------------------------------------------------------- */
function histFirst(id, o) {
  H(id, {
    name: o.name, chip: o.chip, emoji: o.emoji, kind: 'moment', tone: 'good', popup: false, salience: 0.3, first: true,
    years: [o.year, o.year], yearsBy: o.by, where: 'all', fx: { mood: [1] },
    open: { title: o.chip, text: o.text, kid: o.kid }, news: [[o.head, o.body]], blurb: o.blurb,
  });
}
histFirst('first_radio', { name: 'the radio', chip: 'Radio', emoji: '📻', year: 1925,
  by: { us: [1920, 1920], ca: [1922, 1922], uk: [1922, 1922], fr: [1922, 1922], ph: [1922, 1922], au: [1923, 1923], de: [1923, 1923], br: [1923, 1923], mx: [1921, 1921], it: [1924, 1924], es: [1924, 1924], za: [1924, 1924], jp: [1925, 1925], se: [1925, 1925], ie: [1926, 1926], kr: [1927, 1927], in: [1927, 1927], ng: [1932, 1932] },
  text: 'A radio set has come to the neighborhood. In the evening people crowd around it to hear music, news and voices from far away.', kid: 'A box in the living room talks and sings, and the whole family sits around it in the evening.',
  head: 'Wireless sets in the shops', body: 'Shops report that they can not keep sets on the shelves. Evening programs now draw more listeners than any theater.', blurb: 'Radio arrives in the home.' });
histFirst('first_tv', { name: 'television', chip: 'Television', emoji: '📺', year: 1953,
  by: { us: [1948, 1948], mx: [1950, 1950], br: [1950, 1950], ca: [1952, 1952], fr: [1952, 1952], de: [1952, 1952], uk: [1953, 1953], jp: [1953, 1953], ph: [1953, 1953], it: [1954, 1954], au: [1956, 1956], se: [1956, 1956], es: [1956, 1956], kr: [1956, 1956], ng: [1959, 1959], ie: [1961, 1961], in: [1975, 1975], za: [1976, 1976] },
  text: 'Television has come to your street. The first set in the neighborhood draws a crowd every evening, and nobody can quite believe the little picture.', kid: 'A neighbor got a television, and the whole street goes to watch it in the evening.',
  head: 'Television comes to town', body: 'The first sets are in the shop windows, and crowds gather on the pavement to watch the picture.', blurb: 'Television arrives in the home.' });
histFirst('first_color_tv', { name: 'color television', chip: 'Color TV', emoji: '🌈', year: 1968,
  by: { jp: [1964, 1964], us: [1966, 1966], ca: [1966, 1966], de: [1967, 1967], fr: [1967, 1967], mx: [1968, 1968], uk: [1969, 1969], se: [1970, 1970], ph: [1970, 1970], ie: [1971, 1971], es: [1972, 1972], br: [1972, 1972], au: [1975, 1975], ng: [1975, 1975], it: [1977, 1977], za: [1976, 1976], kr: [1980, 1980], in: [1982, 1982] },
  text: 'The pictures are in color now. The old set has gone to the attic, and the first thing you noticed was the grass.', kid: 'The television has colors now, and it is much better than the old one.',
  head: 'Color arrives', body: 'Broadcasters report that sales of color sets are far ahead of expectation. The old black-and-white ones are cheap.', blurb: 'Color television arrives.' });
histFirst('first_home_computer', { name: 'the home computer', chip: 'Home computer', emoji: '💾', year: 1984,
  by: { us: [1980, 1980], uk: [1981, 1981], ca: [1981, 1981], au: [1982, 1982], de: [1982, 1982], fr: [1982, 1982], jp: [1982, 1982], se: [1982, 1982], ie: [1983, 1983], it: [1983, 1983], es: [1983, 1983], mx: [1985, 1985], br: [1985, 1985], kr: [1985, 1985], za: [1985, 1985], in: [1992, 1992], ph: [1992, 1992], ng: [1998, 1998] },
  text: 'Computers are in the shops, small enough for a desk. They cost as much as a used car, and the children somehow understand them better than the grown-ups.', kid: 'A computer came to school, and everybody wants a turn at it.',
  head: 'The computer comes home', body: 'Shops say sales are growing fast. Parents are buying them for the children, and then using them themselves.', blurb: 'The personal computer arrives in homes.' });
histFirst('first_mobile', { name: 'the mobile phone', chip: 'Mobile phones', emoji: '📱', year: 1996,
  by: { se: [1992, 1992], uk: [1993, 1993], de: [1993, 1993], it: [1993, 1993], au: [1993, 1993], us: [1994, 1994], jp: [1994, 1994], fr: [1994, 1994], es: [1994, 1994], ie: [1994, 1994], za: [1994, 1994], ca: [1995, 1995], kr: [1995, 1995], mx: [1996, 1996], br: [1996, 1996], ph: [1996, 1996], in: [1997, 1997], ng: [2001, 2001] },
  text: 'People are walking down the street talking into their hands. The phones are big and expensive, and everyone swears they will never want one.', kid: 'A man on the bus was talking on a phone with no wire.',
  head: 'Phones without wires', body: 'The number of subscribers has doubled again this year. Operators are building masts as fast as they can.', blurb: 'The mobile phone arrives.' });
histFirst('first_web', { name: 'the internet', chip: 'The web', emoji: '🌐', year: 1996,
  by: { se: [1994, 1994], us: [1994, 1994], uk: [1995, 1995], ca: [1995, 1995], de: [1995, 1995], fr: [1995, 1995], au: [1995, 1995], jp: [1996, 1996], it: [1996, 1996], es: [1996, 1996], ie: [1996, 1996], kr: [1996, 1996], za: [1996, 1996], mx: [1997, 1997], br: [1997, 1997], ph: [1998, 1998], in: [1998, 1998], ng: [2000, 2000] },
  text: 'Everyone is talking about the internet. You can send a letter across the world in a minute, and there are pages for everything, most of them badly drawn.', kid: 'The computer at school can talk to computers in other countries.',
  head: 'Everyone is getting online', body: 'Cafés now offer connections by the hour. Businesses are scrambling to put up pages of their own.', blurb: 'The web arrives.' });
histFirst('first_smartphone', { name: 'the smartphone', chip: 'Smartphones', emoji: '🤳', year: 2008,
  by: { us: [2007, 2007], uk: [2007, 2007], ca: [2008, 2008], de: [2008, 2008], fr: [2008, 2008], jp: [2008, 2008], au: [2008, 2008], se: [2008, 2008], it: [2008, 2008], es: [2008, 2008], ie: [2008, 2008], kr: [2009, 2009], mx: [2009, 2009], br: [2010, 2010], za: [2010, 2010], ph: [2011, 2011], in: [2011, 2011], ng: [2012, 2012] },
  text: 'The phone in your pocket is a computer now. It has a screen instead of buttons, and everyone is staring at theirs.', kid: 'Mom’s phone is like a little television, and she lets you play on it.',
  head: 'The phone becomes a computer', body: 'Lines formed at shops for the new models. Analysts say it will change what a phone is for.', blurb: 'The smartphone arrives.' });
histFirst('first_social', { name: 'social media', chip: 'Social media', emoji: '👥', year: 2007,
  by: { kr: [2004, 2004], us: [2005, 2005], uk: [2005, 2005], ca: [2005, 2005], br: [2005, 2005], au: [2006, 2006], se: [2006, 2006], ph: [2006, 2006], de: [2007, 2007], fr: [2007, 2007], es: [2007, 2007], ie: [2007, 2007], mx: [2007, 2007], in: [2007, 2007], it: [2008, 2008], jp: [2008, 2008], za: [2008, 2008], ng: [2010, 2010] },
  text: 'Everyone you know is on the same website, posting photos of lunch and writing about their weekends. It is hard to say when it started to feel normal.', kid: 'The grown-ups are all looking at their phones to see what their friends had for lunch.',
  head: 'The friend-list generation', body: 'Millions have signed up. Teachers, employers and parents are all asking what it means for privacy.', blurb: 'Social media arrives.' });
