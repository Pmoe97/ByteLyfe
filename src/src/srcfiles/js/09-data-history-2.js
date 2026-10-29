/* =====================================================================
 * 09-data-history-2.js — the headline events (the format is at the top of 09-data-history.js):
 * the First World War and the 1918 flu, the postwar boom, the Korean and Vietnam wars, the Cold War and
 * its moments, the Moon landing, the oil shocks, Black Monday, the fall of the Wall, the dot-com boom
 * and bust, September 11 and the wars after it, the 2008 crisis and the euro crisis, the inflation
 * surge, and the years crypto was a thing. Pure data.
 * ===================================================================== */

/* ---- the First World War ---------------------------------------------------------------- */
H('ww1', {
  name: 'the First World War', chip: 'World War I', emoji: '🌍', kind: 'war',
  years: [1914, 1918], yearsBy: { it: [1915, 1918], us: [1917, 1918], br: [1917, 1918] }, where: 'all',
  sev: { uk: 1, fr: 1, de: 1, it: 0.9, ca: 0.7, au: 0.7, ie: 0.7, us: 0.5, in: 0.4, za: 0.4, se: 0.3, es: 0.3, ng: 0.25, jp: 0.2, br: 0.2, ph: 0.2, kr: 0.2, mx: 0.15 },
  curve: [0.6, 0.9, 1, 1, 0.9],
  fx: { jobs: 0.08, pay: 0.01, living: 0.1, mood: -2.5 },
  war: {
    uk: { name: 'the First World War', foe: 'the Central Powers', foeAdj: 'German', theater: 'the Western Front', years: [1914, 1918], intensity: 4, draft: [1916, 1918], draftAges: [18, 41], result: 'victory',
      end: 'The guns stopped at the eleventh hour of the eleventh day of November. Church bells rang across the country, and nearly every street had somebody who would not be coming home.' },
    fr: { name: 'the First World War', foe: 'Germany', foeAdj: 'German', theater: 'the Western Front', years: [1914, 1918], intensity: 4, draft: [1914, 1918], draftAges: [18, 45], result: 'victory',
      end: 'The guns fell silent in November. France had won, and the fields of the north were a wasteland. There was hardly a village without a list of names.' },
    de: { name: 'the First World War', foe: 'the Allies', foeAdj: 'Allied', theater: 'the Western and Eastern fronts', years: [1914, 1918], intensity: 4, draft: [1914, 1918], draftAges: [18, 45], result: 'defeat',
      end: 'The guns are silent, and Germany has lost. The winter is hungry, the country is in turmoil, and everyone is asking how it came to this.' },
    it: { name: 'the First World War', foe: 'Austria-Hungary', foeAdj: 'Austrian', theater: 'the Alpine front', years: [1915, 1918], intensity: 4, draft: [1915, 1918], draftAges: [18, 40], result: 'victory',
      end: 'The war ended in victory, and it did not feel like one. The cost had been enormous, and the peace was a disappointment to nearly everyone.' },
    us: { name: 'the First World War', foe: 'the Central Powers', foeAdj: 'German', theater: 'the Western Front', years: [1917, 1918], intensity: 3, draft: [1917, 1918], draftAges: [21, 30], result: 'victory',
      end: 'The war ended with the armistice in November. The soldiers came home to parades, and to a country that had changed its place in the world.' },
    ca: { name: 'the First World War', foe: 'the Central Powers', foeAdj: 'German', theater: 'the Western Front', years: [1914, 1918], intensity: 3, draft: [1917, 1918], draftAges: [20, 45], result: 'victory',
      end: 'The war ended in victory, and the soldiers came home to a country that had grown up fast. There was a monument in every town.' },
    au: { name: 'the First World War', foe: 'the Central Powers', foeAdj: 'German', theater: 'Gallipoli and the Western Front', years: [1914, 1918], intensity: 3, result: 'victory',
      end: 'The war ended in victory, and the volunteers came home, those who did. Every town has a long list of names carved in stone.' },
    ie: { name: 'the First World War', foe: 'the Central Powers', foeAdj: 'German', theater: 'the Western Front', years: [1914, 1918], intensity: 3, result: 'victory',
      end: 'The war ended, and the men who had gone came home to a country that did not know what to make of them.' },
    in: { name: 'the First World War', foe: 'the Central Powers', foeAdj: 'German', theater: 'the Middle East and the Western Front', years: [1914, 1918], intensity: 2, result: 'victory',
      end: 'The war ended in victory, and the soldiers came home to a country asking what all its sacrifice had been for.' },
    za: { name: 'the First World War', foe: 'the Central Powers', foeAdj: 'German', theater: 'Africa and the Western Front', years: [1914, 1918], intensity: 2, result: 'victory', end: 'The war ended in victory, and the soldiers came home.' },
    jp: { name: 'the First World War', foe: 'Germany', foeAdj: 'German', theater: 'the Pacific', years: [1914, 1918], intensity: 1, result: 'victory', end: 'The war ended in victory, and Japan came out of it richer and more powerful than it went in.' },
    br: { name: 'the First World War', foe: 'the Central Powers', foeAdj: 'German', theater: 'the Atlantic', years: [1917, 1918], intensity: 1, result: 'victory', end: 'The war ended in victory, and it had touched Brazil only at the edges.' },
  },
  openBy: {
    uk: { title: 'Britain is at war', text: 'Britain has declared war on Germany. Crowds cheered in the streets, men are queuing to enlist, and everyone says it will be over by Christmas.', kid: 'Fathers and big brothers are marching off in uniform, and everyone says they will be home by Christmas.' },
    fr: { title: 'France is at war', text: 'Germany has declared war on France. The bells are ringing and the men are leaving by train, with flowers in their rifles. Nobody believes it will last long.', kid: 'The church bell rang all afternoon, and the men left on trains with flowers.' },
    de: { title: 'Germany is at war', text: 'Germany is at war. The streets are full of flags and songs, and the young men are leaving by the thousand. The newspapers say it will be quick.', kid: 'There are flags in every window, and the older boys are leaving for the army.' },
    us: { title: 'The United States enters the war', text: 'The United States has declared war on Germany. Millions of young men will be registered for service, and everyone is being asked to give up something for the war: wheat, sugar, savings.', kid: 'There are posters everywhere, and the school is collecting money for the war.' },
    se: { title: 'At the edge of the war', text: 'A war has broken out across Europe, and Sweden is staying out of it. Food is getting short and prices are rising.', kid: 'There is less to eat, and the grown-ups talk about the war all the time.' },
    es: { title: 'At the edge of the war', text: 'Europe is at war, and Spain is neutral. The war is good for business, for those who have any, and a great many people go hungry.', kid: 'The grown-ups argue about the war, and nobody has enough to eat.' },
  },
  open: { title: 'Europe goes to war', text: 'A war has broken out across Europe. Armies are marching, young men are enlisting in their thousands, and nobody can say how long it will last. They are saying it will be over by Christmas.', kid: 'Fathers and older brothers are going away in uniform, and everyone says they will be home soon.' },
  yearly: [
    'The street is full of posters, and everybody knows someone who has gone.',
    'A telegram came to a house on your street. It was quiet for days.',
    'Women are doing jobs they were never allowed to do before, and doing them well.',
    'Food is short, prices are up, and people make do.',
  ],
  close: 'The war is over, and the world is trying to remember how to be at peace.',
  news: [
    ['Recruiting offices crowded', 'Lines of young men stretched around the block. "They said it would be a short war," one told a reporter, "and I do not want to miss it."'],
    ['Casualty lists grow longer', 'The names of the dead and wounded fill whole pages. Families gather at the newsstand before it opens.'],
    ['Women fill the factories', 'Thousands of women now work in the munitions plants, doing work that was closed to them a year ago. "Nobody asked me if I could," one said. "I just did."'],
    ['Rationing begins', 'Officials ask households to use less bread, less sugar, less everything. Prices have doubled since the war began.'],
    ['Armistice rumors in the capital', 'Crowds waited all night for news. When it came, church bells began ringing, and they were still ringing in the morning.'],
  ],
  blurb: 'A world war: young men are called up, food is short, and every family has someone to worry about.',
});

/* ---- the 1918 flu --------------------------------------------------------------------------- */
H('flu1918', {
  name: 'the 1918 flu pandemic', chip: '1918 flu', emoji: '🤒', kind: 'pandemic',
  years: [1918, 1920], where: 'all',
  sev: { in: 2, za: 1.4, ng: 1.2, ph: 1.1, br: 1.1, mx: 1, us: 1, uk: 1, fr: 1, de: 1, it: 1, es: 1, ca: 1, ie: 1, se: 1, jp: 0.8, kr: 0.8, au: 0.5 },
  curve: [1, 0.45, 0.1],
  fx: { jobs: [-0.05, 0, 0], mood: [-3, -1.5, -0.5] },
  disease: { id: 'flu1918', odds: [0.25, 0.12, 0.04], guards: [{ flag: 'fluCare', mult: 0.6 }], npc: [[0, 4, 0.025], [5, 19, 0.01], [20, 39, 0.035], [40, 64, 0.012], [65, 120, 0.03]] },
  closed: ['nightlife', 'school'],
  open: { title: 'A terrible flu', text: 'A terrible flu is spreading around the world, and unlike most flus it is killing young, healthy adults. Schools and theaters are closing, and hospitals are overwhelmed. Nobody has a cure.', kid: 'Everyone is afraid of getting sick, and school is closed. Grown-ups look at each other differently.' },
  yearly: [
    'Nearly everyone knows someone who has been buried this month.',
    'The funerals are on every day, and the coffins are hard to find.',
    'People wear gauze masks in the street, and no one is sure it helps.',
  ],
  close: 'The flu has finally passed. Nobody wants to talk about it, and it will be a long time before anyone does.',
  news: [
    ['Schools and theaters closed', 'Officials say the closures will last "as long as necessary." Public gatherings are banned, and churches are holding services outdoors.'],
    ['Hospitals overwhelmed', 'Every bed is full, and doctors are working to the point of collapse. Volunteers are being asked to help care for the sick.'],
    ['Gauze masks required in public', 'Anyone found in the street without one may be fined. Health officials say it is a small thing to ask.'],
    ['Cases begin to fall', 'Health officials say the worst may be over. They advise caution, and nobody quite believes them.'],
  ],
  blurb: 'A flu pandemic that kills the young and healthy as well as the old. Schools and theaters shut.',
});

/* ---- the long postwar boom -------------------------------------------------------------------- */
H('postwar', {
  name: 'the postwar boom', chip: 'The boom', emoji: '🚗', kind: 'econ', tone: 'good',
  years: [1946, 1973], where: ['us', 'ca', 'uk', 'au', 'fr', 'se', 'ie'], sev: { us: 1, ca: 1, au: 1, se: 1, uk: 0.7, fr: 0.9, ie: 0.5 },
  fx: { jobs: 0.2, pay: 0.02, housing: 0.03, mood: 1 },
  open: { title: 'The boom', text: 'The war is over, the soldiers are home, and the economy is growing faster than anyone has ever seen. There are jobs for nearly everybody, wages are rising, and people are buying houses, cars and refrigerators. For a lot of families, tomorrow looks better than today.', kid: 'The grown-ups are cheerful, and there is a lot more to eat and buy than there used to be.' },
  yearly: ['Everyone you know has a new car, or wants one.', 'There is a new housing development at the edge of town, and every house is sold before it is finished.', 'Your boss gave everyone a raise, and nobody was quite sure why.'],
  close: 'The long boom is over. Nobody says so out loud yet, but things are not going to be the same.',
  news: [
    ['Housing starts reach a record', 'New developments are going up on the edge of every city. "It is a good time to be young and starting out," a builder said.'],
    ['Unemployment hits a new low', 'There are more jobs than people to fill them. Employers are raising pay to keep their workers.'],
    ['Family cars outnumber families on some streets', 'Parking has become a problem. Planners say the answer is more roads.'],
    ['Appliance sales soar', 'The refrigerator, the washing machine and the television are in nearly every home that can afford them, and on credit, in many that cannot.'],
  ],
  blurb: 'A long boom: plenty of jobs, rising pay and home prices, and people buying cars, houses and appliances.',
});
H('babyboom', { name: 'the baby boom', emoji: '👶', kind: 'moment', quiet: true, years: [1946, 1964], where: ['us', 'ca', 'uk', 'au', 'fr', 'de', 'ie', 'se', 'jp', 'it'], sev: { us: 1, ca: 1, au: 1, uk: 0.7, fr: 0.8, de: 0.6, ie: 0.5, se: 0.6, jp: 0.6, it: 0.5 }, siblings: 0.35 });

/* ---- Korea ------------------------------------------------------------------------------------- */
H('korean_war', {
  name: 'the Korean War', chip: 'Korean War', emoji: '🎖️', kind: 'war',
  years: [1950, 1953], where: ['kr', 'us', 'uk', 'ca', 'au', 'ph', 'fr', 'za'], sev: { kr: 1, us: 0.5, uk: 0.3, ca: 0.3, au: 0.3, ph: 0.3, fr: 0.2, za: 0.2 },
  fx: { mood: -2, living: 0.05 },
  war: {
    kr: { name: 'the Korean War', foe: 'North Korea', foeAdj: 'Northern', theater: 'the whole peninsula', years: [1950, 1953], intensity: 4, draft: [1950, 1953], draftAges: [18, 35], result: 'ceasefire',
      end: 'An armistice was signed, and the guns stopped where the lines were. The peninsula is still divided, and families on both sides do not know who is alive.' },
    us: { name: 'the Korean War', foe: 'North Korea', foeAdj: 'Northern', theater: 'the Korean peninsula', years: [1950, 1953], intensity: 3, draft: [1950, 1953], draftAges: [18, 26], result: 'ceasefire',
      end: 'An armistice was signed in the summer. Nobody had won, and the country did not quite know how to feel about it.' },
    uk: { name: 'the Korean War', foe: 'North Korea', foeAdj: 'Northern', theater: 'the Korean peninsula', years: [1950, 1953], intensity: 2, result: 'ceasefire', end: 'An armistice was signed. The soldiers came home to a country that had hardly noticed they were gone.' },
    ca: { name: 'the Korean War', foe: 'North Korea', foeAdj: 'Northern', theater: 'the Korean peninsula', years: [1950, 1953], intensity: 2, result: 'ceasefire', end: 'An armistice was signed, and the soldiers came home.' },
    au: { name: 'the Korean War', foe: 'North Korea', foeAdj: 'Northern', theater: 'the Korean peninsula', years: [1950, 1953], intensity: 2, result: 'ceasefire', end: 'An armistice was signed, and the soldiers came home.' },
    ph: { name: 'the Korean War', foe: 'North Korea', foeAdj: 'Northern', theater: 'the Korean peninsula', years: [1950, 1953], intensity: 1, result: 'ceasefire', end: 'An armistice was signed, and the soldiers came home.' },
    fr: { name: 'the Korean War', foe: 'North Korea', foeAdj: 'Northern', theater: 'the Korean peninsula', years: [1950, 1953], intensity: 1, result: 'ceasefire', end: 'An armistice was signed, and the volunteers came home.' },
    za: { name: 'the Korean War', foe: 'North Korea', foeAdj: 'Northern', theater: 'the Korean peninsula', years: [1950, 1953], intensity: 1, result: 'ceasefire', end: 'An armistice was signed, and the airmen came home.' },
  },
  openBy: {
    kr: { title: 'War comes south', text: 'North Korean forces have crossed the border. The fighting moves up and down the peninsula, and ordinary people are caught in the middle of it. Families are fleeing with whatever they can carry.', kid: 'There was shooting in the night, and your family is leaving with only what you can carry.' },
    us: { title: 'War in Korea', text: 'The United States has sent troops to Korea, and the draft has been extended. The government calls it a police action. It looks a great deal like a war.', kid: 'The older boys are leaving for a war a long way away, and nobody quite says what it is for.' },
  },
  open: { title: 'War in Korea', text: 'War has broken out on the Korean peninsula, and your country has sent troops to join it. It is a long way away, and it is on the news every night.', kid: 'A war is happening a long way away, and some of the older boys are going.' },
  yearly: ['Letters from the front are read aloud at the kitchen table.', 'The news is about a hill with a number for a name.'],
  close: 'The Korean War is over. The lines on the map are where they were, and a great many names are on the memorials.',
  news: [
    ['Troops sail for Korea', 'The first units left on Tuesday. Families gathered at the dock, and some stayed long after the ships had gone.'],
    ['Stalemate on the front', 'Both sides are dug in. Negotiators meet, and the fighting goes on in the meantime.'],
    ['Armistice signed', 'The fighting is over. The two sides will remain where they are, and no one is calling it a victory.'],
  ],
  blurb: 'A war in Korea: your country has sent troops, and some are being drafted.',
});
H('korean_home', {
  name: 'the war at home', emoji: '🎖️', kind: 'war', quiet: true, years: [1950, 1953], where: ['kr'],
  fx: { jobs: [-0.35, -0.3, -0.25, -0.2], living: [0.3, 0.25, 0.15, 0.1], layoff: [0.1, 0.06, 0.04, 0.02], mood: [-4, -3, -2, -1] },
});

/* ---- the Cold War and its moments -------------------------------------------------------------- */
H('cold_war', {
  name: 'the Cold War', chip: 'Cold War', emoji: '🧊', kind: 'moment',
  years: [1947, 1991], where: 'all', sev: { us: 1, de: 1, uk: 0.8, fr: 0.6, ca: 0.6, kr: 0.6, au: 0.5, it: 0.5, jp: 0.4, in: 0.3, _: 0.15 },
  fx: { mood: -0.4 },
  open: { title: 'The Cold War', text: 'Two great powers face each other across the world, with enough weapons to end it. Neither will fire first, and everyone knows what happens if one does. It is going to be a long way to the end of this.', kid: 'The grown-ups say there are dangerous people far away, and that everything is fine.' },
  yearly: ['The news is about missiles, and a lot of children know the word "fallout."', 'The schools hold drills, and nobody says what they are for.', 'Everyone has an opinion about the other side, and nobody has met them.'],
  close: 'The Cold War is over. The world feels different, though nobody can agree on how.',
  news: [['Talks stall in Geneva', 'Delegates traded accusations for six hours and agreed to meet again in the spring.'], ['Arms race continues', 'Both sides have announced new weapons. Experts say it makes everyone safer. Other experts say the opposite.'], ['Spy swap on a bridge', 'Two men walked across in opposite directions at dawn. Neither side would say what it had paid.']],
  blurb: 'Two superpowers and the shadow of nuclear war, for forty-five years.',
});
H('sputnik', {
  name: 'Sputnik', emoji: '🛰️', kind: 'moment', years: [1957, 1957], where: 'all', sev: { us: 1, uk: 0.7, ca: 0.7, _: 0.4 },
  open: { title: 'A new star', text: 'A small metal sphere is circling the Earth, beeping. You can see it cross the sky at dusk. Everyone is looking up, and some people are very worried about what it means.', kid: 'You stood outside in the dark with the whole street and watched a little light go across the sky.' },
  news: [['A satellite crosses the sky', 'The beeping can be heard on amateur radios around the world. Officials said they were studying the matter.'], ['Schools to add science', 'Lawmakers want more mathematics and science in every classroom. "We are behind," one said.'], ['Space race begins', 'Both sides promise more launches. The public has noticed, and so has everyone else.']],
  blurb: 'The first satellite goes up, and the space race begins.',
});
H('berlin_wall', {
  name: 'the Berlin Wall', chip: 'The Wall', emoji: '🧱', kind: 'moment', years: [1961, 1961], where: ['de', 'us', 'uk', 'fr'], sev: { de: 1, us: 0.4, uk: 0.4, fr: 0.4 },
  fx: { mood: [-2] },
  open: { title: 'A wall in Berlin', text: 'Overnight, soldiers have strung barbed wire across Berlin, and workers are building a wall behind it. Families, friends and workplaces are cut apart by a line on the pavement.', kid: 'In the morning there was a fence where there had been a street, and some of your relatives are on the other side.' },
  news: [['Berlin divided overnight', 'Streets were closed and tram lines cut. Residents stood at the barbed wire and shouted across to relatives on the other side.'], ['A tense standoff at the border', 'Tanks faced each other for hours. Neither side moved, and in the end neither fired.']],
  blurb: 'A wall divides Berlin.',
});
H('missile_crisis', {
  name: 'the Cuban missile crisis', chip: 'Missile crisis', emoji: '☢️', kind: 'moment', popup: true, years: [1962, 1962], where: 'all', sev: { us: 1, de: 0.7, uk: 0.7, ca: 0.7, _: 0.5 },
  fx: { mood: [-4] },
  open: { title: 'Thirteen days in October', text: 'The two superpowers are facing each other over missiles in Cuba. For thirteen days the world is closer to nuclear war than it has ever been, and people listen to the radio as if their lives depended on it. They might.', kid: 'The grown-ups are glued to the radio and do not want to talk about it. Your school had a drill where everyone got under their desks.' },
  news: [['Blockade announced', 'Ships have been ordered to stop at sea. The president said the whole hemisphere is at risk.'], ['Crisis ends', 'The missiles will be removed. Nobody on the street thinks it was a victory, but everybody thinks it was a mercy.']],
  blurb: 'The world comes to the edge of nuclear war.',
});
H('chernobyl', {
  name: 'the Chernobyl accident', chip: 'Chernobyl', emoji: '☢️', kind: 'moment', years: [1986, 1986], where: ['se', 'de', 'uk', 'fr', 'it', 'ie', 'es'], sev: { se: 1, de: 0.8, it: 0.5, uk: 0.5, fr: 0.4, ie: 0.3, es: 0.2 },
  fx: { mood: [-1.5] },
  open: { title: 'A cloud over Europe', text: 'There has been an accident at a nuclear power plant in the Soviet Union, and a radioactive cloud has drifted across Europe. Officials say there is no danger. People are not sure whether to believe them.', kid: 'The grown-ups say not to play in the rain, and not to drink the milk.' },
  news: [['Radiation detected', 'Sensors picked up an increase before any announcement was made. Officials said the levels posed no health risk.'], ['What not to eat', 'Authorities advise washing vegetables, avoiding fresh milk and keeping children indoors when it rains.']],
  blurb: 'A nuclear accident sends a cloud of radiation across Europe.',
});

/* ---- Vietnam ------------------------------------------------------------------------------------ */
H('vietnam', {
  name: 'the Vietnam War', chip: 'Vietnam War', emoji: '🎖️', kind: 'war',
  years: [1962, 1973], yearsBy: { us: [1965, 1973], kr: [1964, 1973] }, where: ['us', 'au', 'kr'], sev: { us: 1, au: 0.8, kr: 0.6 },
  fx: { mood: -1, living: 0.03 },
  war: {
    us: { name: 'the Vietnam War', foe: 'North Vietnam', foeAdj: 'North Vietnamese', theater: 'Vietnam', years: [1965, 1973], intensity: 3, draft: [1965, 1972], draftAges: [18, 26], lottery: { age: 19, from: 1970, cutoff: { 1970: 195, 1971: 125, 1972: 95, _: 100 } }, result: 'ceasefire',
      end: 'A peace agreement was signed in January, and the last combat troops came home. Nobody called it a victory, and everybody had an opinion about what it had been for.' },
    au: { name: 'the Vietnam War', foe: 'North Vietnam', foeAdj: 'North Vietnamese', theater: 'Vietnam', years: [1962, 1972], intensity: 2, draft: [1965, 1972], draftAges: [20, 20], lottery: { age: 20, from: 1965, cutoff: 120 }, result: 'ceasefire',
      end: 'The last troops came home. There were no parades, and a great many people were asking what had been achieved.' },
    kr: { name: 'the Vietnam War', foe: 'North Vietnam', foeAdj: 'North Vietnamese', theater: 'Vietnam', years: [1964, 1973], intensity: 2, draft: [1964, 1973], draftAges: [20, 28], result: 'ceasefire',
      end: 'The last troops came home. The money they had sent back had helped build a lot of the country.' },
  },
  open: { title: 'War in Vietnam', text: 'Your country is sending more and more troops to fight in Vietnam, and the draft is growing to fill the ranks. People disagree about the war, loudly and in nearly every family.', kid: 'There is a war on the television every night, and a lot of arguing at home about it.' },
  yearly: ['The war is on the news every night. People in the same family argue about it.', 'A lot of young men are sweating over their draft numbers.', 'Everybody knows somebody who went, and somebody who did not come back.'],
  close: 'The Vietnam War is over. People are still arguing about it, and probably always will.',
  news: [['More troops sent to Vietnam', 'Officials said the commitment was necessary. Critics said it was the same thing they said last year.'], ['Protesters march in the capital', 'Tens of thousands marched peacefully. Some counter-demonstrators lined the route, and the two groups largely ignored each other.'], ['Draft lottery held', 'Birthdays were drawn from a drum, one by one, and young men all over the country sat by their radios.'], ['Peace agreement signed', 'The last combat troops will be home within sixty days.']],
  blurb: 'A war in Southeast Asia. Young men are being drafted, and everybody has an opinion.',
});

/* ---- the Moon -------------------------------------------------------------------------------------- */
H('moon_landing', {
  name: 'the Moon landing', chip: 'The Moon', emoji: '🚀', kind: 'moment', tone: 'good', popup: true, years: [1969, 1969], where: 'all', sev: { us: 1, uk: 0.9, ca: 0.9, au: 0.9, de: 0.9, fr: 0.8, it: 0.8, jp: 0.8, mx: 0.7, br: 0.7, _: 0.5 },
  fx: { mood: [3] },
  open: { title: 'One small step', text: 'Two men have walked on the Moon, and about half the world watched it on television. For one night, nobody argued about anything.', kid: 'You were allowed to stay up late and watch men walk on the Moon. Nobody in the room said a word.' },
  news: [['Men land on the Moon', 'Crowds gathered around television sets in shop windows, in bars, in living rooms. There was cheering in the streets.'], ['The astronauts are home', 'They were greeted with parades in three cities, and nobody could quite stop smiling.']],
  blurb: 'Humans walk on the Moon.',
});

/* ---- oil and stagflation ----------------------------------------------------------------------------- */
H('oil_shocks', {
  name: 'the oil shocks', chip: 'Oil shocks', emoji: '⛽', kind: 'econ',
  years: [1973, 1982], where: 'all', sev: { ng: 0, us: 1, uk: 1, ca: 0.8, au: 0.8, fr: 0.9, de: 0.8, it: 1, es: 0.8, ie: 0.9, se: 0.8, jp: 0.7, kr: 0.7, mx: 0.5, br: 0.6, in: 0.7, ph: 0.7, za: 0.6 },
  curve: [0.6, 1, 0.8, 0.2, 0.1, 0.2, 0.8, 1, 0.8, 0.6],
  fx: { jobs: -0.15, layoff: 0.04, pay: -0.01, living: 0.12, rates: 0.06, mood: -1.5 },
  cats: { layoff: { transport: 2 }, jobs: { transport: 1.5 } },
  biz: { airline: -0.2 },
  market: { 1973: -0.15, 1974: -0.26, 1975: 0.37 },
  open: { title: 'The oil shock', text: 'Oil prices have shot up, and the lines at the pumps are blocks long. Prices are rising, factories are laying people off, and the economy is stuck in a strange place: rising prices and rising unemployment at the same time.', kid: 'The car is parked a lot, and the grown-ups talk about the price of gas and the price of everything.' },
  yearly: ['Everything costs more than it did last month, and nobody understands why the pay does not.', 'You set the thermostat lower than you want to, and so does everybody else.', 'There is a joke going round about the line at the gas station, and nobody is laughing.'],
  close: 'The worst of the oil shocks is over. Prices are still high, and people have learned to live with them.',
  news: [['Gas lines stretch for blocks', 'Drivers wait hours at some stations. Some stations have run out, and some are limiting how much each customer can buy.'], ['Factories cut shifts', 'Management blames the cost of energy. Unions blame management.'], ['Interest rates at record levels', 'Banks are charging more for loans than at any time in living memory. Home buyers are waiting, and builders are laying people off.'], ['Prices up again', 'Economists have a name for this, and no good cure for it.']],
  blurb: 'Fuel is scarce and prices are rising, while factories lay people off. Interest rates are high.',
});

/* ---- Black Monday, and the Wall coming down ------------------------------------------------------------ */
H('black_monday', {
  name: 'Black Monday', chip: 'Black Monday', emoji: '📉', kind: 'moment', years: [1987, 1987], where: 'all', sev: { us: 1, uk: 0.9, ca: 0.9, au: 0.9, jp: 0.8, _: 0.6 },
  market: { 1987: 0.05 }, fx: { mood: [-0.5] },
  open: { title: 'Black Monday', text: 'On a Monday in October, the stock market fell by a fifth in a single day, the worst day in its history. By the end of the year it had mostly recovered, and nobody who was there will forget it.', kid: 'The grown-ups were in a strange mood after the news, and some of them were shouting at the television.' },
  news: [['Markets fall by a fifth in a day', 'Trading floors were chaos. Brokers said the phones did not stop ringing, and nobody wanted to buy.'], ['Regulators promise review', 'Officials said the market was "fundamentally sound," which people took to mean the opposite.']],
  blurb: 'The stock market has its worst day in history.',
});
H('berlin_wall_falls', {
  name: 'the fall of the Berlin Wall', chip: 'The Wall falls', emoji: '🧱', kind: 'moment', tone: 'good', popup: true,
  years: [1989, 1991], where: 'all', sev: { de: 1, uk: 0.4, fr: 0.4, us: 0.4, it: 0.3, _: 0.25 },
  fx: { mood: [3, 3, 1] },
  open: { title: 'The Wall falls', text: 'The border has opened, and people are climbing up on the Wall in Berlin and dancing. The Cold War, which has lasted all your life, is coming to an end faster than anyone thought it could.', kid: 'On the television, people were hugging each other on top of a wall, and the grown-ups were crying.' },
  news: [['The Wall is open', 'Crowds poured through the crossings through the night. Strangers hugged strangers, and some people chipped away at the concrete with hammers.'], ['Germany reunited', 'At midnight, flags went up and the fireworks began. Not everyone was celebrating, but most were.'], ['The Soviet Union dissolves', 'Its flag was lowered for the last time at the end of the year. The Cold War is over.']],
  blurb: 'The Wall comes down, and the Cold War ends.',
});
H('reunification', { name: 'the cost of German reunification', emoji: '🇩🇪', kind: 'econ', quiet: true, years: [1991, 2019], where: ['de'], fx: { tax: 0.012 } });

/* ---- the dot-com boom and bust ----------------------------------------------------------------------------- */
H('dotcom', {
  name: 'the dot-com boom and bust', chip: 'Dot-com', emoji: '💻', kind: 'econ',
  years: [1995, 2003], where: 'all', sev: { us: 1, uk: 0.8, ca: 0.7, au: 0.5, de: 0.7, fr: 0.5, jp: 0.5, kr: 0.6, in: 0.6, se: 0.9, ie: 0.7, it: 0.4, es: 0.4, _: 0.25 },
  fx: { jobs: [0.05, 0.08, 0.1, 0.1, 0.12, -0.1, -0.15, -0.1, 0], layoff: [0, 0, 0, 0, 0, 0.03, 0.06, 0.04, 0.01], pay: [0.01, 0.01, 0.015, 0.02, 0.03, 0, -0.01, -0.01, 0], mood: [1, 1, 1, 1.5, 1.5, -0.5, -1, -1, 0.5] },
  cats: { jobs: { _: 0.25, tech: 3, media: 1.5 }, layoff: { _: 0.2, tech: 3, media: 1.5 }, pay: { _: 0.25, tech: 2 } },
  biz: { tech: [0.1, 0.2, 0.3, 0.4, 0.5, -0.3, -0.5, -0.4, 0], games: [0.05, 0.1, 0.15, 0.2, 0.2, -0.1, -0.2, -0.1, 0] },
  market: { 1995: 0.38, 1996: 0.23, 1997: 0.33, 1998: 0.29, 1999: 0.21, 2000: -0.09, 2001: -0.12, 2002: -0.22, 2003: 0.29 },
  open: { title: 'The internet boom', text: 'The internet is the next big thing, and the stock market has gone wild for it. Companies with no profits are worth billions, jobs in technology are everywhere, and everyone is sure it can only go up.', kid: 'The grown-ups are talking about something called "the web," and some of them are very excited about it.' },
  yearly: ['Everyone you know is either working at a start-up or thinking about it.', 'There is a new company every week, and a new dot-com on the side of every bus.', 'The magazine covers all say the same thing: the old rules do not apply.'],
  close: 'The bubble has burst. Some of the companies are gone, some are still around, and a lot of people are pretending they never believed any of it.',
  news: [['Tech stocks soar again', 'The index has doubled in two years. Analysts say valuations are justified, and other analysts say they are not.'], ['A start-up with no revenue goes public', 'Shares doubled on the first day. The founders are, on paper, extremely rich.'], ['Tech stocks fall sharply', 'The index has lost a third of its value in a few weeks. Several companies have cut their staff in half.'], ['Dot-com layoffs continue', 'Thousands of workers have lost their jobs this year. Some are heading back to school, and some are leaving the industry for good.']],
  blurb: 'A boom in internet stocks and tech jobs, and then a bust.',
});

/* ---- September 11 and the wars after it ------------------------------------------------------------------------ */
H('sept11', {
  name: 'September 11', chip: 'September 11', emoji: '🕯️', kind: 'moment', popup: true,
  years: [2001, 2001], where: 'all', sev: { us: 1, uk: 0.6, ca: 0.45, au: 0.4, fr: 0.4, de: 0.4, es: 0.4, it: 0.35, jp: 0.3, _: 0.25 },
  fx: { mood: [-3], layoff: [0.05], jobs: [-0.08] },
  cats: { layoff: { transport: 2.5, service: 1.5, fame: 1.2 } },
  biz: { airline: [-0.4], hotel: [-0.2] },
  open: { title: 'A day the world watched', text: 'Attacks in the United States on a Tuesday morning in September were watched live around the world. In the weeks that followed, flights stopped, markets closed for days, and the world began to change in ways nobody could name yet.', kid: 'The grown-ups sat in front of the television all day and would not say what was wrong.' },
  news: [['A day of grief', 'Memorials were held across the world. Flowers and candles filled streets and squares.'], ['Flights resume, slowly', 'Airports have new rules, and passengers wait in long lines. Airlines have cut thousands of jobs.']],
  blurb: 'A day of attacks the whole world watched, and a downturn in travel and tourism after it.',
});
H('afghanistan', {
  name: 'the war in Afghanistan', chip: 'Afghanistan', emoji: '🎖️', kind: 'war',
  years: [2001, 2021], salience: 0.35, where: ['us', 'uk', 'ca', 'au', 'de', 'fr', 'es', 'se', 'it', 'kr'], sev: { us: 0.7, uk: 0.6, ca: 0.5, au: 0.4, de: 0.4, fr: 0.3, es: 0.3, se: 0.3, it: 0.3, kr: 0.2 },
  fx: { mood: -0.3 },
  war: {
    us: { name: 'the war in Afghanistan', foe: 'the insurgency', foeAdj: 'insurgent', theater: 'Afghanistan', years: [2001, 2021], intensity: 2, result: 'ceasefire', end: 'The last troops came home after twenty years. A whole generation of soldiers had fought there, and nobody agreed on what it had been for.' },
    uk: { name: 'the war in Afghanistan', foe: 'the insurgency', foeAdj: 'insurgent', theater: 'Afghanistan', years: [2001, 2014], intensity: 2, result: 'ceasefire', end: 'Combat operations ended after thirteen years. There are many names on the memorials, and a lot of questions.' },
    ca: { name: 'the war in Afghanistan', foe: 'the insurgency', foeAdj: 'insurgent', theater: 'Afghanistan', years: [2001, 2014], intensity: 1, result: 'ceasefire', end: 'Canada ended its combat mission, and the soldiers came home.' },
    au: { name: 'the war in Afghanistan', foe: 'the insurgency', foeAdj: 'insurgent', theater: 'Afghanistan', years: [2001, 2021], intensity: 1, result: 'ceasefire', end: 'The last troops came home, and a lot of people asked what it had all been for.' },
    de: { name: 'the war in Afghanistan', foe: 'the insurgency', foeAdj: 'insurgent', theater: 'Afghanistan', years: [2001, 2021], intensity: 1, result: 'ceasefire', end: 'The last troops came home, and the debate about what it had achieved went on.' },
    fr: { name: 'the war in Afghanistan', foe: 'the insurgency', foeAdj: 'insurgent', theater: 'Afghanistan', years: [2001, 2014], intensity: 1, result: 'ceasefire', end: 'France withdrew its combat troops, and the soldiers came home.' },
    es: { name: 'the war in Afghanistan', foe: 'the insurgency', foeAdj: 'insurgent', theater: 'Afghanistan', years: [2002, 2014], intensity: 1, result: 'ceasefire', end: 'The last troops came home.' },
    se: { name: 'the war in Afghanistan', foe: 'the insurgency', foeAdj: 'insurgent', theater: 'Afghanistan', years: [2002, 2021], intensity: 1, result: 'ceasefire', end: 'The last troops came home.' },
    it: { name: 'the war in Afghanistan', foe: 'the insurgency', foeAdj: 'insurgent', theater: 'Afghanistan', years: [2001, 2021], intensity: 1, result: 'ceasefire', end: 'The last troops came home.' },
    kr: { name: 'the war in Afghanistan', foe: 'the insurgency', foeAdj: 'insurgent', theater: 'Afghanistan', years: [2002, 2007], intensity: 1, result: 'ceasefire', end: 'The medical and engineering units came home.' },
  },
  open: { title: 'War in Afghanistan', text: 'Your country has sent troops to Afghanistan. There is no draft, and no end in sight. The soldiers who go are volunteers, and everyone in the army knows someone there.', kid: 'The older cousins in uniform are going far away, and the grown-ups do not talk about it much.' },
  yearly: ['Someone you know is on a tour, and calls home when the line is good.', 'A flag-draped coffin was in the news again this week.'],
  close: 'The war in Afghanistan is over, after a very long time.',
  news: [['Troops deploy', 'The first units flew out in the night. Their families were told not to expect to hear from them for a while.'], ['Another year in Afghanistan', 'The mission has been extended again. Officials say the objectives have not changed. Critics say they are not sure what the objectives were.'], ['Families wait at the airfield', 'Hundreds waited in the rain for the plane. When it landed, nobody said a word until the first soldier came down the steps.']],
  blurb: 'A long war that most people only see on the news. There is no draft.',
});
H('iraq_war', {
  name: 'the Iraq War', chip: 'Iraq War', emoji: '🎖️', kind: 'war',
  years: [2003, 2011], salience: 0.5, where: ['us', 'uk', 'au', 'es', 'it', 'kr', 'ph'], sev: { us: 0.8, uk: 0.6, au: 0.4, es: 0.3, it: 0.3, kr: 0.2, ph: 0.2 },
  fx: { mood: -0.5 },
  war: {
    us: { name: 'the Iraq War', foe: 'Iraq', foeAdj: 'Iraqi', theater: 'Iraq', years: [2003, 2011], intensity: 3, result: 'ceasefire', end: 'The last combat troops came home. The war had lasted much longer than anyone had promised, and people were still arguing about why it had begun.' },
    uk: { name: 'the Iraq War', foe: 'Iraq', foeAdj: 'Iraqi', theater: 'Iraq', years: [2003, 2009], intensity: 2, result: 'ceasefire', end: 'The last combat troops came home. People were still arguing about why it had begun.' },
    au: { name: 'the Iraq War', foe: 'Iraq', foeAdj: 'Iraqi', theater: 'Iraq', years: [2003, 2009], intensity: 1, result: 'ceasefire', end: 'The last combat troops came home.' },
    es: { name: 'the Iraq War', foe: 'Iraq', foeAdj: 'Iraqi', theater: 'Iraq', years: [2003, 2004], intensity: 1, result: 'ceasefire', end: 'Spain withdrew its troops, and the soldiers came home.' },
    it: { name: 'the Iraq War', foe: 'Iraq', foeAdj: 'Iraqi', theater: 'Iraq', years: [2003, 2006], intensity: 1, result: 'ceasefire', end: 'The soldiers came home.' },
    kr: { name: 'the Iraq War', foe: 'Iraq', foeAdj: 'Iraqi', theater: 'Iraq', years: [2004, 2008], intensity: 1, result: 'ceasefire', end: 'The soldiers came home.' },
    ph: { name: 'the Iraq War', foe: 'Iraq', foeAdj: 'Iraqi', theater: 'Iraq', years: [2003, 2004], intensity: 1, result: 'ceasefire', end: 'The troops were withdrawn after a hostage crisis.' },
  },
  open: { title: 'War in Iraq', text: 'Your country has joined the invasion of Iraq. Millions of people marched against it, and the government went ahead. There is no draft, and nobody can say how long it will last.', kid: 'There are marches on the news, and the grown-ups at home disagree.' },
  yearly: ['Everybody has an opinion about the war, and nobody has changed anybody else’s.', 'The news says the situation is improving. The news said it last year too.'],
  close: 'The Iraq War is over. The arguments about it are not.',
  news: [['Troops enter Iraq', 'The first units crossed the border overnight. Officials say the campaign will be short.'], ['Insurgency grows', 'Attacks continue despite the government’s assurances. Casualties have risen for the third month running.'], ['Troops to withdraw', 'The last combat units are coming home. Officials said "mission accomplished." The phrase has not aged well.']],
  blurb: 'A war that began with a vote and a lot of arguments. There is no draft.',
});

/* ---- 2008, and the euro crisis ------------------------------------------------------------------------------------ */
H('gfc', {
  name: 'the 2008 financial crisis', chip: '2008 crisis', emoji: '🏦', kind: 'econ',
  years: [2007, 2012], where: 'all', sev: { ie: 1.3, es: 1.2, us: 1, uk: 1, it: 0.7, jp: 0.6, mx: 0.6, fr: 0.5, kr: 0.5, se: 0.5, za: 0.5, de: 0.4, ca: 0.4, br: 0.3, au: 0.2, in: 0.2, ph: 0.2, ng: 0.2 },
  curve: [0.3, 1, 0.8, 0.5, 0.35, 0.2],
  fx: { jobs: [-0.05, -0.35, -0.3, -0.2, -0.12, -0.05], layoff: [0.02, 0.1, 0.07, 0.04, 0.03, 0.01], pay: [0, -0.01, -0.01, 0, 0, 0], housing: [-0.03, -0.1, -0.08, -0.05, -0.03, -0.01], rates: [0, 0, -0.03, -0.03, -0.03, -0.03], mood: [-0.5, -2, -1.5, -1, -0.5, 0] },
  cats: { layoff: { business: 2, trades: 2, media: 1.2 }, jobs: { business: 1.3, trades: 1.6, media: 1.2, health: 0.2, public: 0.2, education: 0.3 } },
  biz: { construction: [-0.1, -0.3, -0.3, -0.2, -0.1, 0], realestate: [-0.1, -0.3, -0.3, -0.2, -0.1, 0], hotel: [0, -0.1, -0.1, 0, 0, 0] },
  market: { 2007: 0.05, 2008: -0.37, 2009: 0.26, 2010: 0.15, 2011: 0.02, 2012: 0.16 },
  open: { title: 'The financial crisis', text: 'A string of big banks has failed or been rescued, and credit has frozen. House prices are falling, jobs are vanishing, and the markets have collapsed. Nobody can say when it will stop.', kid: 'The grown-ups are worried about money, and there is a lot of shouting about banks on the news.' },
  yearly: ['Everyone you know is out of work, or afraid of it.', 'There are "for sale" signs on half the houses on your street, and "foreclosed" on a few.', 'Every news story has the word "bailout" in it, and nobody is sure who got the money.'],
  close: 'The crisis is over, as far as the experts are concerned. Not everyone feels that way.',
  news: [['A giant bank fails', 'Staff left with their belongings in boxes. The markets fell sharply, and governments met in emergency session.'], ['Foreclosures at a record', 'One home in every few is in trouble on some streets. Neighbors are watching each other’s lights.'], ['Governments promise rescues', 'Billions are being committed. Taxpayers are asking why, and nobody has a short answer.'], ['Unemployment tops ten percent', 'Young people are hit hardest. Many are staying with their parents or going back to school.']],
  blurb: 'Banks fail, credit freezes, house prices fall and jobs vanish.',
});
H('euro_crisis', {
  name: 'the euro debt crisis', chip: 'Euro crisis', emoji: '💶', kind: 'econ',
  years: [2010, 2013], where: ['ie', 'es', 'it'], sev: { es: 1, ie: 0.8, it: 0.7 },
  fx: { jobs: [-0.2, -0.25, -0.3, -0.2], tax: 0.02, cut: [0.08, 0.04, 0, 0], pay: [-0.02, -0.02, -0.01, 0], mood: [-1, -1.5, -1.5, -1] },
  cats: { cut: { _: 0, public: 1, education: 1, health: 0.6 } },
  open: { title: 'Austerity', text: 'The government is in debt, and the lenders want it paid back. Taxes are up, public wages are cut, and the services people depend on are being squeezed. Young people are leaving for other countries to find work.', kid: 'The grown-ups are worried, and your older cousins are going abroad to look for work.' },
  yearly: ['Another friend has left for Australia, or London, or Germany.', 'A shop that has been on your street for years is boarded up.'],
  close: 'The worst of the crisis is over. The people who left have not all come back.',
  news: [['Austerity measures announced', 'Public wages will be cut and taxes raised. Unions have called a day of strikes.'], ['Youth unemployment passes forty percent', 'Graduates are leaving in their thousands. "There is nothing here for us," one said at the airport.'], ['Banks need a rescue', 'Officials said the lenders had to be supported, whatever the cost. Taxpayers are paying for it, and nearly everybody knows it.']],
  blurb: 'Debt, tax rises and cuts at home, and young people leaving to find work.',
});

/* ---- inflation, and the years crypto was a thing ------------------------------------------------------------------------ */
H('inflation_2022', {
  name: 'the inflation surge', chip: 'Inflation', emoji: '💸', kind: 'econ',
  years: [2021, 2023], where: 'all', sev: { uk: 1.1, ng: 1.3, br: 1.2, us: 1, de: 1, it: 1, es: 1, ie: 1, ca: 1, se: 1, mx: 1, fr: 0.9, au: 0.9, ph: 0.9, za: 0.9, in: 0.8, kr: 0.7, jp: 0.3 },
  fx: { living: [0.03, 0.09, 0.07], rates: [0, 0.04, 0.04], pay: [0.01, 0.01, 0.02], housing: [0, 0.02, -0.03], mood: [-0.5, -1, -1] },
  market: { 2022: -0.18, 2023: 0.26 },
  open: { title: 'Prices are rising', text: 'Prices are rising faster than they have in forty years. Rent, groceries and energy all cost much more than they did, pay has not kept up, and the central banks are raising interest rates to try to cool it down.', kid: 'The grown-ups are worried about the price of everything, and there is more talk about money than there used to be.' },
  yearly: ['Everything at the shop costs more than it did last month.', 'You compare prices more carefully than you used to.', 'Everyone has a story about the price of eggs, or gas, or rent.'],
  close: 'Inflation has come down. The prices have not.',
  news: [['Inflation hits a forty-year high', 'Shoppers are trading down, and the price of a weekly shop has risen sharply. Central banks have raised rates again.'], ['Rents rise again', 'Tenants report increases of ten percent or more. Landlords say their costs have risen too.'], ['Mortgage rates double', 'Home buyers are being priced out, and sales have slowed to a crawl.']],
  blurb: 'Prices rise faster than they have in forty years, and interest rates follow.',
});
H('crypto_era', {
  name: 'the crypto years', emoji: '💠', kind: 'moment', quiet: true, years: [2014, 2024], where: 'all',
  crypto: { 2014: -0.58, 2015: 0.35, 2016: 1.2, 2017: 13, 2018: -0.73, 2019: 0.9, 2020: 3.0, 2021: 0.6, 2022: -0.64, 2023: 1.55, 2024: 1.2 },
});
