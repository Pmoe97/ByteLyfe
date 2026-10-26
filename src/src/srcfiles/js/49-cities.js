/* =====================================================================
 * 49-cities.js — Cities: every city has its own cost of living, pay, job
 * market and character; four neighborhoods each; moving within a country;
 * landlords who raise the rent, skip repairs and evict; and the other side,
 * being a landlord with named tenants. City and landlord events are at the
 * bottom.
 *
 * CITY_INFO[cc][city] = { size, col, wage, hubs, traits }   (pure data)
 *   col    cost of living vs. the country average (rent, homes, living costs)
 *   wage   pay vs. the country average            hubs  JOB_CATS that hire a lot
 * s.cityMarket['cc:city'] = { idx, g, tiers }   the local market, created when
 *   first touched and shared by the family line: idx is the rent and price
 *   level (mean-reverting around 1), g this year's change, tiers the current
 *   tier of each of the four neighborhoods (they can gentrify).
 * P(s).hood   the neighborhood (0-3) the player lives in now.
 * M(s).places the cities lived in this life ('cc:city').
 * M(s).housing (renting) also holds city, hood, rtype, since, deposit, and
 *   ll = { name, first, last, corp, style, mood, stars }   the landlord
 *   issue = { id, since }, withheld, owed, notice = { why, year }, inspected
 * A house asset can hold city, cc, hood, units, rentLvl, mgr (a property
 *   manager) and tenants = [{ id, first, last, g, born, kind, job, rent,
 *   since, mood, owed, evict, plan, withhold, pet }].
 * financeTick collects rent through rentRoll and charges rent through
 * rentToPay; cityTick runs right after assetTick.
 * ===================================================================== */

/* ---- city data ------------------------------------------------------------ */
// name | size | cost of living | pay | job hubs | traits
const CITY_ROWS = {
  us: ['New York|metro|2.0|1.3|business media fame law|coast tourist party', 'Los Angeles|metro|1.75|1.2|fame media tech|coast beach party', 'Chicago|metro|1.15|1.1|business transport office law|snow historic', 'Houston|big|0.9|1.05|science health trades transport|coast industrial', 'Phoenix|big|0.95|0.95|service trades office|', 'Seattle|big|1.6|1.3|tech science|coast', 'Atlanta|big|1.0|1.0|transport media business|', 'Denver|mid|1.25|1.1|tech office|snow', 'Miami|big|1.45|1.0|service transport media|coast beach party tourist', 'Boston|big|1.7|1.25|education science health tech|coast college snow historic', 'Nashville|mid|1.05|0.97|fame health service|party', 'Portland|mid|1.25|1.05|tech trades media|', 'Silver Mesa|mid|1.1|1.0|service fame|casino tourist party'],
  ca: ['Toronto|metro|1.6|1.2|business media tech law|snow', 'Montreal|big|1.05|1.0|media education tech fame|snow historic party college', 'Vancouver|big|1.75|1.1|tech media fame|coast', 'Calgary|mid|1.05|1.15|trades science business|snow', 'Ottawa|mid|1.05|1.1|public politics tech|snow capital', 'Halifax|small|0.9|0.9|military education transport|coast snow', 'Winnipeg|mid|0.8|0.95|transport trades public|snow', 'Quebec City|mid|0.8|0.92|public education service|snow historic tourist', 'Edmonton|mid|0.85|1.05|trades public|snow industrial'],
  uk: ['London|metro|2.0|1.35|business law media fame tech|capital tourist historic party', 'Manchester|big|1.0|1.0|media sports tech|party college', 'Birmingham|big|0.95|0.98|transport trades office|industrial', 'Liverpool|mid|0.8|0.92|transport sports fame|coast party', 'Leeds|mid|0.85|0.97|business office health|college', 'Bristol|mid|1.15|1.02|tech science media|college', 'Glasgow|big|0.85|0.95|service media education|industrial party', 'Edinburgh|mid|1.2|1.05|business education public|capital historic tourist', 'Cardiff|mid|0.85|0.93|public media|capital coast', 'Belfast|mid|0.75|0.9|public trades|capital historic'],
  ie: ['Dublin|metro|1.6|1.25|tech business law|capital party tourist', 'Cork|mid|1.0|1.0|science health tech|coast', 'Galway|small|0.95|0.92|education service|coast college tourist party', 'Limerick|small|0.8|0.92|education trades|college', 'Waterford|small|0.75|0.88|trades health|coast', 'Kilkenny|small|0.8|0.85|service|historic tourist', 'Sligo|small|0.7|0.85|service health|coast'],
  au: ['Sydney|metro|1.7|1.2|business media fame tech|coast beach tourist', 'Melbourne|metro|1.4|1.12|media education sports fame|party college', 'Brisbane|big|1.1|1.02|trades public|coast', 'Perth|big|1.05|1.1|trades science|coast beach', 'Adelaide|mid|0.9|0.95|science education|coast', 'Hobart|small|0.85|0.9|public science service|coast historic', 'Darwin|small|0.95|1.05|military trades|coast', 'Canberra|mid|1.05|1.15|public politics|capital', 'Gold Coast|mid|1.1|0.92|service fame|coast beach party tourist'],
  mx: ['Mexico City|metro|1.6|1.3|business politics media fame|capital historic party', 'Guadalajara|big|1.1|1.05|tech media|', 'Monterrey|big|1.2|1.2|business trades|industrial', 'Puebla|mid|0.85|0.92|trades education|historic college', 'Tijuana|big|0.95|1.0|transport trades|coast industrial', 'Cancún|mid|1.15|0.95|service|coast beach tourist party', 'Mérida|mid|0.85|0.9|service education|historic', 'Oaxaca|small|0.75|0.8|service|historic tourist', 'León|mid|0.8|0.95|trades|industrial'],
  br: ['São Paulo|metro|1.6|1.3|business media tech law|party', 'Rio de Janeiro|metro|1.5|1.15|media fame sports service|coast beach tourist party', 'Brasília|big|1.3|1.3|public politics|capital', 'Salvador|big|0.85|0.85|service fame|coast beach historic tourist party', 'Fortaleza|big|0.8|0.85|service trades|coast beach', 'Belo Horizonte|big|1.0|1.0|trades business|', 'Recife|big|0.85|0.9|tech health|coast', 'Porto Alegre|big|1.0|1.0|education office|', 'Curitiba|big|1.05|1.05|tech trades|'],
  fr: ['Paris|metro|2.0|1.3|business fame media law politics|capital tourist historic party', 'Marseille|big|1.0|0.95|transport service|coast beach', 'Lyon|big|1.15|1.05|business science health|historic', 'Toulouse|big|1.0|1.05|tech science|college', 'Nice|mid|1.35|0.95|service fame|coast beach tourist', 'Nantes|mid|1.0|0.98|tech office|', 'Bordeaux|mid|1.1|0.98|service business|historic tourist', 'Lille|mid|0.9|0.97|education office|college', 'Strasbourg|mid|0.95|1.0|politics public|historic', 'Montpellier|mid|1.0|0.93|health education|coast college'],
  de: ['Berlin|metro|1.4|1.1|tech media fame politics|capital party historic', 'Hamburg|big|1.4|1.15|transport media business|coast', 'Munich|big|1.8|1.25|business tech science|snow', 'Cologne|big|1.2|1.05|media fame|party', 'Frankfurt|big|1.5|1.25|business law transport|', 'Stuttgart|big|1.4|1.2|tech trades|industrial', 'Düsseldorf|big|1.3|1.12|business media|', 'Leipzig|mid|0.85|0.92|media education|college', 'Dresden|mid|0.85|0.92|science tech|historic', 'Bremen|mid|0.95|0.98|transport trades|coast'],
  it: ['Rome|metro|1.4|1.1|politics public fame|capital historic tourist', 'Milan|metro|1.6|1.3|business media fame tech|party', 'Naples|big|0.85|0.85|service transport|coast historic', 'Turin|big|1.0|1.05|trades tech|industrial snow', 'Palermo|big|0.75|0.8|service|coast historic', 'Florence|mid|1.35|1.0|service education|historic tourist', 'Bologna|mid|1.15|1.05|education health|college', 'Venice|small|1.4|0.95|service|historic tourist coast', 'Genoa|mid|0.9|0.95|transport|coast', 'Bari|mid|0.8|0.85|service|coast'],
  es: ['Madrid|metro|1.5|1.25|business politics media fame|capital party', 'Barcelona|metro|1.6|1.15|tech media service|coast beach tourist party', 'Valencia|big|1.0|0.95|service trades|coast beach', 'Seville|big|0.95|0.9|service public|historic tourist', 'Zaragoza|mid|0.85|0.95|transport trades|', 'Málaga|mid|1.1|0.9|tech service|coast beach tourist', 'Bilbao|mid|1.05|1.05|business trades|coast industrial', 'Granada|small|0.85|0.85|education service|historic college tourist', 'Palma|mid|1.3|0.92|service|coast beach tourist party'],
  se: ['Stockholm|metro|1.6|1.2|tech business media|capital coast snow', 'Gothenburg|big|1.15|1.05|transport trades|coast', 'Malmö|big|1.05|1.0|media tech|coast', 'Uppsala|mid|1.0|1.0|education science|college snow', 'Västerås|mid|0.85|0.98|trades|industrial snow', 'Örebro|mid|0.8|0.95|health|snow', 'Linköping|mid|0.85|1.0|tech military|snow college'],
  jp: ['Tokyo|metro|1.7|1.3|business media fame tech politics|capital party', 'Osaka|metro|1.2|1.1|business trades service|party', 'Yokohama|big|1.4|1.15|transport tech|coast', 'Nagoya|big|1.0|1.08|trades tech|industrial', 'Sapporo|big|0.85|0.92|service|snow', 'Fukuoka|big|0.9|0.95|tech service|coast', 'Kyoto|mid|1.1|0.97|education service|historic tourist college', 'Kobe|big|1.0|1.0|transport health|coast', 'Sendai|mid|0.85|0.92|education|snow'],
  kr: ['Seoul|metro|1.8|1.3|business tech media fame|capital party', 'Busan|big|1.0|0.98|transport service|coast beach', 'Incheon|big|1.05|1.0|transport trades|coast industrial', 'Daegu|big|0.85|0.92|health trades|', 'Daejeon|big|0.85|1.0|science tech|college', 'Gwangju|mid|0.8|0.92|trades|', 'Ulsan|mid|0.9|1.15|trades|industrial coast', 'Suwon|big|1.1|1.1|tech|'],
  in: ['Mumbai|metro|2.2|1.4|business fame media law|coast party', 'Delhi|metro|1.6|1.25|politics public business|capital historic', 'Bengaluru|metro|1.5|1.35|tech science|college', 'Hyderabad|metro|1.2|1.2|tech health|historic', 'Chennai|metro|1.15|1.1|trades health fame|coast', 'Kolkata|metro|0.95|0.95|education media|historic', 'Pune|big|1.15|1.15|tech education|college', 'Jaipur|big|0.85|0.85|service|historic tourist', 'Ahmedabad|big|0.9|0.95|business trades|industrial', 'Kochi|mid|0.85|0.9|transport health|coast'],
  ng: ['Lagos|metro|1.6|1.35|business media fame tech|coast party', 'Abuja|big|1.5|1.3|politics public|capital', 'Kano|big|0.7|0.8|trades service|historic', 'Ibadan|big|0.75|0.85|education|college', 'Port Harcourt|big|1.1|1.15|science trades|coast industrial', 'Benin City|mid|0.75|0.85|service|historic', 'Enugu|mid|0.8|0.88|trades education|', 'Kaduna|mid|0.7|0.85|military trades|'],
  ph: ['Manila|metro|1.4|1.2|business politics|capital coast party', 'Quezon City|metro|1.2|1.15|media education public|college', 'Cebu City|big|1.0|1.0|office service|coast tourist', 'Davao|big|0.8|0.9|trades|', 'Makati|big|1.7|1.35|business office|party', 'Baguio|small|0.8|0.85|education service|college tourist', 'Iloilo|mid|0.75|0.85|office|coast'],
  za: ['Johannesburg|metro|1.25|1.25|business media|party', 'Cape Town|metro|1.4|1.1|tech media fame|coast beach tourist', 'Durban|big|0.95|0.95|transport|coast beach', 'Pretoria|big|1.0|1.1|public politics|capital', 'Gqeberha|mid|0.8|0.9|trades|coast industrial', 'Bloemfontein|mid|0.7|0.85|public education|', 'Polokwane|small|0.65|0.8|trades service|'],
};
const CITY_INFO = {};
for (const cc in CITY_ROWS) {
  CITY_INFO[cc] = {};
  for (const row of CITY_ROWS[cc]) {
    const [name, size, col, wage, hubs, traits] = row.split('|');
    CITY_INFO[cc][name] = { name, size, col: +col, wage: +wage, hubs: hubs ? hubs.split(' ') : [], traits: traits ? traits.split(' ') : [] };
  }
}
const CITY_DEFAULT = { name: '', size: 'mid', col: 1, wage: 1, hubs: [], traits: [] };
const CITY_SIZES = {
  metro: { name: 'Major city', jobs: 1.08, drift: 0.012, yield: 0.05 },
  big: { name: 'Big city', jobs: 1, drift: 0.008, yield: 0.055 },
  mid: { name: 'Mid-sized city', jobs: 0.92, drift: 0.005, yield: 0.06 },
  small: { name: 'Small city', jobs: 0.8, drift: 0.002, yield: 0.068 },
};
const CITY_TRAITS = { casino: 'Casino capital', capital: 'Capital city', coast: 'On the coast', beach: 'Beaches', tourist: 'Tourist hotspot', historic: 'Historic', college: 'College town', party: 'Famous nightlife', snow: 'Snowy winters', industrial: 'Industrial' };
// Careers that mostly live in big cities: small cities rarely hire for them.
const BIG_CITY_CATS = ['tech', 'science', 'business', 'law', 'media', 'fame'];
// How hard it is to evict someone or raise their rent. Strong laws cap raises at 3%.
const TENANT_LAW = { de: 'strong', fr: 'strong', se: 'strong', ca: 'medium', uk: 'medium', ie: 'medium', au: 'medium', es: 'medium', it: 'medium', jp: 'medium', kr: 'medium' };
function tenantLaw(cc) { return TENANT_LAW[cc] || 'weak'; }

/* ---- neighborhoods -------------------------------------------------------- */
const HOOD_TIERS = [
  { id: 'rough', name: 'Rough', emoji: '🏚️', rent: 0.7, price: 0.62, crime: 0.12, happy: -2 },
  { id: 'working', name: 'Working-class', emoji: '🏘️', rent: 0.88, price: 0.85, crime: 0.05, happy: 0 },
  { id: 'trendy', name: 'Up-and-coming', emoji: '🎨', rent: 1.12, price: 1.1, crime: 0.035, happy: 2 },
  { id: 'upscale', name: 'Upscale', emoji: '🌳', rent: 1.55, price: 1.6, crime: 0.015, happy: 3 },
];
// Neighborhood names by language, one list per starting tier. Every city gets one from each.
const HOOD_NAMES = {
  en: [['the Flats', 'Rail Yards', 'Eastside', 'Mill End', 'Canal Row', 'Ironworks'], ['Riverside', 'Northgate', 'Elm Park', 'Southfield', 'Brickton', 'Westbrook'], ['the Arts District', 'Old Town', 'the Warehouse Quarter', 'Little Harbor', 'Market Square', 'Foundry Row'], ['the Heights', 'Hillcrest', 'Lakeshore', 'Kingsbridge', 'Oak Hollow', 'Willow Park']],
  es: [['Barrio Bajo', 'La Estación', 'Las Vías', 'San Lázaro', 'El Puerto Viejo', 'La Fundición'], ['Colonia Obrera', 'Santa Rosa', 'El Carmen', 'La Esperanza', 'San Miguel', 'Los Pinos'], ['Barrio de las Artes', 'Centro Histórico', 'La Fábrica', 'El Mercado', 'Las Flores', 'La Alameda'], ['Lomas Altas', 'Jardines del Lago', 'Las Colinas', 'El Mirador', 'Bosque Real', 'Villa Serena']],
  pt: [['Vila Esperança', 'Morro do Trem', 'Baixada', 'Porto Velho', 'Vila Operária', 'Beco das Linhas'], ['Jardim São José', 'Vila Nova', 'Santa Cruz', 'Bairro do Carmo', 'Campo Verde', 'Vila Rica'], ['Vila das Artes', 'Centro Antigo', 'Bairro da Fábrica', 'Largo do Mercado', 'Vila Boêmia', 'Cais Novo'], ['Jardins do Lago', 'Alto da Colina', 'Morada do Sol', 'Bela Vista Alta', 'Recanto Nobre', 'Mirante']],
  fr: [['les Docks', 'la Cité des Rails', 'Quartier de la Gare', 'les Tours Nord', 'la Zone Est', 'les Forges'], ['Saint-Martin', 'les Tilleuls', 'Bellevue', 'la Croix-Rouge', 'les Lilas', 'le Faubourg'], ['le Vieux Quartier', 'les Ateliers', 'le Quartier des Arts', 'la Halle', 'le Canal', 'la Manufacture'], ['les Hauts-de-Parc', 'le Bois Joli', 'les Coteaux', 'le Quai Royal', 'Mont-Fleuri', 'les Jardins']],
  de: [['Bahnhofsviertel Ost', 'Hafenkante', 'Industriegebiet Süd', 'Am Schlachthof', 'Neubausiedlung Nord', 'Gleisdreieck'], ['Lindenau', 'Ostend', 'Kirchfeld', 'Neustadt', 'Am Bach', 'Birkenhof'], ['Altstadt', 'Kreativquartier', 'Am Kanal', 'Speicherviertel', 'Marktviertel', 'Alte Brauerei'], ['Villenviertel', 'Sonnenhang', 'Am Schlosspark', 'Seeufer', 'Rosenhöhe', 'Waldblick']],
  it: [['la Periferia Est', 'Borgo Ferrovia', 'il Porto Vecchio', 'Quartiere Fornaci', 'Case Popolari', 'le Officine'], ['San Rocco', 'Borgo Nuovo', 'Santa Lucia', 'la Pineta', 'San Giuseppe', 'Montebello'], ['il Centro Storico', 'Quartiere degli Artisti', 'la Darsena', 'il Mercato', 'Borgo Antico', 'la Filanda'], ['Collina Alta', 'Parco dei Principi', 'Villa Serena', 'il Lungolago', 'Belvedere', 'Poggio Fiorito']],
  sv: [['Norra Industriområdet', 'Hamnen Öst', 'Betongparken', 'Spårområdet', 'Södra Höghusen', 'Gjuteriet'], ['Björkhagen', 'Lindgården', 'Ängby', 'Kvarnbacken', 'Tallhöjden', 'Rönnvik'], ['Gamla Staden', 'Konstkvarteren', 'Saluhallen', 'Kanalgatan', 'Fabriken', 'Bryggeriet'], ['Strandvillorna', 'Ekbacken', 'Sjöudden', 'Slottsparken', 'Solhöjden', 'Lindängen']],
  ja: [['Ekiura', 'Kōjō-machi', 'Minato-Higashi', 'Senro-shita', 'Kita-Danchi', 'Sōko-chō'], ['Sakuragaoka', 'Midori-chō', 'Higashi-machi', 'Kawabata', 'Shin-machi', 'Nishikawa'], ['Furumachi', 'Geijutsu-dōri', 'Ichiba-machi', 'Kurazukuri', 'Shitamachi', 'Renga-dōri'], ['Yamanote-dai', 'Shiroyama', 'Kohan', 'Oka-no-ue', 'Matsubara', 'Hikari-ga-oka']],
  ko: [['Yeokjeon-dong', 'Hangu-dong', 'Gongdan-ro', 'Daldongne', 'Cheolgil-ro', 'Changgo-maeul'], ['Sinchon-dong', 'Hwagok-dong', 'Dongmun-dong', 'Bomun-dong', 'Jangan-dong', 'Songjeong-dong'], ['Yetgol', 'Yesul-gil', 'Sijang-gil', 'Golmok-gil', 'Gongbang-gil', 'Byeoldol-gil'], ['Sopung-dong', 'Hosu Park', 'Dongsan Hills', 'Sanmaeul', 'Cheongun-dong', 'Gangbyeon Heights']],
  hi: [['Railway Colony', 'Mill Area', 'Old Godown Road', 'Basti Nagar', 'Station Road', 'Loha Mandi'], ['Shastri Nagar', 'Gandhi Colony', 'Ram Nagar', 'Laxmi Nagar', 'Nehru Colony', 'Tilak Nagar'], ['Old City Bazaar', "Artists' Lane", 'Mill Compound', 'Heritage Quarter', 'Cantonment Market', 'Clock Tower Road'], ['Civil Lines', 'Hill View Enclave', 'Golf Links', 'Lake Gardens', 'Green Park Extension', 'Palm Grove']],
};
const HOOD_LANG = { mx: 'es', es: 'es', br: 'pt', fr: 'fr', de: 'de', it: 'it', se: 'sv', jp: 'ja', kr: 'ko', in: 'hi' };
const HOOD_LANG_CITY = { Montreal: 'fr', 'Quebec City': 'fr' };
function strHash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
// The same city always has the same four neighborhoods, so nothing needs saving.
function hoodNames(cc, city) {
  const lang = HOOD_LANG_CITY[city] || HOOD_LANG[cc] || 'en', h = strHash(cc + ':' + city);
  return HOOD_NAMES[lang].map((list, i) => list[(h >>> (i * 5)) % list.length]);
}

/* ---- the player's city ---------------------------------------------------- */
function cityInfo(cc, city) { const t = CITY_INFO[cc]; return (t && t[city]) || CITY_DEFAULT; }
function hereInfo(s) { const p = P(s); return cityInfo(p.country, p.city); }
function cityKey(cc, city) { return cc + ':' + city; }
function cityState(s, cc, city) {
  const all = s.cityMarket || (s.cityMarket = {});
  const k = cityKey(cc, city);
  return all[k] || (all[k] = { idx: 1, g: 0, tiers: [0, 1, 2, 3] });
}
function hereState(s) { return cityState(s, P(s).country, P(s).city); }
function hoodTier(s, cc, city, i) { return HOOD_TIERS[cityState(s, cc, city).tiers[i] ?? i] || HOOD_TIERS[1]; }
function hoodName(cc, city, i) { return hoodNames(cc, city)[i] || 'downtown'; }
// Where you live now. A family home is placed by how well-off the family is.
function myHood(s) {
  const p = P(s);
  if (p.hood === undefined || p.hood === null) {
    const t = M(s).wealthTier;
    p.hood = t === 'rich' ? 3 : t === 'comfortable' ? randInt(2, 3) : t === 'middle' ? randInt(1, 2) : t === 'poor' ? (chance(0.7) ? 0 : 1) : randInt(0, 2);
  }
  return p.hood;
}
function myHoodTier(s) { return hoodTier(s, P(s).country, P(s).city, myHood(s)); }
function myHoodName(s) { return hoodName(P(s).country, P(s).city, myHood(s)); }
// What things cost here, relative to the country's prices.
function rentMult(s, cc, city, hood) { const info = cityInfo(cc, city); return info.col * cityState(s, cc, city).idx * hoodTier(s, cc, city, hood).rent; }
function houseMult(s, cc, city, hood) { const info = cityInfo(cc, city); return Math.pow(info.col, 1.15) * cityState(s, cc, city).idx * hoodTier(s, cc, city, hood).price; }
function colLiving(s) { return 0.7 + 0.3 * hereInfo(s).col; }
function livingCost(s, usd) { return nicePrice(usd * econ(s) * colLiving(s)); }
function wageOf(s) { return hereInfo(s).wage; }
function colWord(col) { return col >= 1.6 ? 'Very expensive' : col >= 1.2 ? 'Expensive' : col >= 0.92 ? 'Average' : col >= 0.78 ? 'Affordable' : 'Cheap'; }
function pctVs(x) { const p = Math.round((x - 1) * 100); return p === 0 ? 'about average' : `${Math.abs(p)}% ${p > 0 ? 'above' : 'below'} average`; }
function hubNames(info) { return info.hubs.filter((h) => JOB_CATS[h]).map((h) => JOB_CATS[h]); }
function cityHas(s, trait) { return hereInfo(s).traits.includes(trait); }
function citySize(s) { return hereInfo(s).size; }
function places(s) { const m = M(s); if (!m.places) m.places = [cityKey(P(s).country, P(s).city)]; return m.places; }
function notePlace(s) { const k = cityKey(P(s).country, P(s).city), l = places(s); if (!l.includes(k)) l.push(k); }
// One-bedroom rent in a city, for comparing places to live.
function typicalRent(s, cc, city) { return nicePrice(18000 * COUNTRIES[cc].econ * cityInfo(cc, city).col * cityState(s, cc, city).idx * 0.95); }

// The job board: which careers are hiring here this year.
function jobOpenOdds(s, id) {
  const j = JOBS[id], info = hereInfo(s);
  let p = 0.78 * CITY_SIZES[info.size].jobs;
  if (info.hubs.includes(j.cat)) p += 0.18;
  else if (info.size === 'small' && BIG_CITY_CATS.includes(j.cat)) p -= 0.3;
  else if (info.size === 'mid' && BIG_CITY_CATS.includes(j.cat)) p -= 0.08;
  return clamp(p, 0.15, 0.97);
}

// The local market moves every year: booms and slumps that drift back toward normal.
function cityMarketYear(s, cc, city) {
  const st = cityState(s, cc, city), info = cityInfo(cc, city);
  if (st.yr === s.year) return st;
  st.yr = s.year;
  st.g = clamp(0.22 * (1 - st.idx) + CITY_SIZES[info.size].drift + gauss(0, 0.035), -0.12, 0.14);
  st.idx = clamp(Math.round(st.idx * (1 + st.g) * 1000) / 1000, 0.7, 1.45);
  return st;
}
// A home's yearly change in value: the national trend, its city's market, and luck.
function houseGrowth(s, a) {
  const st = cityMarketYear(s, assetCC(s, a), assetCity(s, a));
  return gauss(0.03, 0.05) + st.g * 0.8;
}

/* ---- landlords ------------------------------------------------------------ */
const LANDLORD_STYLES = {
  kind: { name: 'Easygoing', emoji: '🙂', raise: [0, 0.03], fix: 0.85, evict: 0.025, stars: [4.2, 5], desc: 'Answers the phone and fixes things.' },
  absent: { name: 'Hard to reach', emoji: '📵', raise: [0, 0.04], fix: 0.35, evict: 0.025, stars: [2.6, 4.2], desc: 'Lives somewhere else. Possibly another planet.' },
  greedy: { name: 'Penny-pinching', emoji: '🤑', raise: [0.05, 0.13], fix: 0.45, evict: 0.06, stars: [1.5, 3.6], desc: 'Every repair is a negotiation.' },
  corporate: { name: 'Property company', emoji: '🏢', raise: [0.03, 0.07], fix: 0.6, evict: 0.04, stars: [2.0, 3.6], desc: 'An online portal, late fees, and no faces.' },
  family: { name: 'Small-time owner', emoji: '👵', raise: [0, 0.05], fix: 0.65, evict: 0.07, stars: [3.4, 4.8], desc: 'Lives nearby. Has opinions.' },
};
const LL_COMPANY = ['Property Group', 'Residential', 'Living', 'Homes', 'Realty', 'Apartments'];
function makeLandlord(s, rtype) {
  const big = rtype === 'luxury' ? 0.8 : rtype === 'apt2' ? 0.4 : rtype === 'apt1' || rtype === 'studio' ? 0.3 : 0.05;
  const style = chance(big) ? 'corporate' : weighted([['kind', 3], ['absent', 2], ['greedy', 2.2], ['family', 3]], (x) => x[1])[0];
  const L = LANDLORD_STYLES[style], stars = Math.round(randFloat(L.stars[0], L.stars[1]) * 10) / 10;
  if (style === 'corporate') return { style, corp: true, name: `${pick(EMPLOYER_ROOTS)} ${pick(LL_COMPANY)}`, mood: 55, stars };
  const g = chance(0.5) ? 'm' : 'f', cc = P(s).country, first = randomFirst(cc, g), last = randomLast(cc);
  return { style, first, last, g, name: `${first} ${last}`, mood: randInt(45, 65), stars };
}
function llShort(ll) { return ll.corp ? ll.name : ll.first; }
function stars(n) { return `${n.toFixed(1)}★`; }
// The landlord, made on the spot for leases from before Cities.
function landlordOf(s) {
  const h = M(s).housing;
  if (h.type !== 'rent') return null;
  if (!h.ll) {
    h.ll = makeLandlord(s, h.rtype || 'apt1');
    if (h.since === undefined) h.since = s.year;
    if (h.deposit === undefined) h.deposit = Math.round(h.rent / 6);
  }
  if (!h.city) { h.city = P(s).city; h.hood = myHood(s); }
  return h.ll;
}
function llKnown(s) { const h = M(s).housing; return h.type === 'rent' && h.since < s.year; }

const RENTAL_ISSUES = {
  heat: { name: 'heating', emoji: '🥶', text: 'The heat went out', hurt: { happy: -3, health: -2 }, cost: 900 },
  leak: { name: 'leak', emoji: '💧', text: 'Water is coming through the ceiling', hurt: { happy: -3 }, cost: 700 },
  mold: { name: 'mold', emoji: '🦠', text: 'Black mold is spreading across the bathroom wall', hurt: { happy: -2, health: -3 }, cost: 1200 },
  pests: { name: 'pest problem', emoji: '🐜', text: 'Something is living in the walls. Lots of somethings', hurt: { happy: -3 }, cost: 500 },
  fridge: { name: 'broken fridge', emoji: '🥫', text: 'The fridge died and took your groceries with it', hurt: { happy: -2 }, cost: 800 },
  lock: { name: 'broken front-door lock', emoji: '🔒', text: 'The front door lock is broken', hurt: { happy: -2 }, cost: 300 },
  water: { name: 'hot water', emoji: '🚿', text: 'There has been no hot water for a week', hurt: { happy: -3 }, cost: 650 },
};

// This year's rentals here, each with a neighborhood and a landlord.
function rentalListing(s) {
  const me = P(s), cc = me.country, city = me.city, out = [];
  for (const t of RENTAL_TYPES) {
    for (let k = 0; k < 2; k++) {
      if (chance(k ? 0.75 : 0.3)) continue;
      const hood = t.id === 'luxury' ? randInt(2, 3) : t.id === 'room' ? randInt(0, 2) : randInt(0, 3);
      out.push({ id: uid(s, 'r'), type: t.id, emoji: t.emoji, name: pick(HOUSE_ADJ) + ' ' + t.name, city, hood, rent: price(s, t.rent * randFloat(0.85, 1.2) * rentMult(s, cc, city, hood)), ll: makeLandlord(s, t.id) });
    }
  }
  if (out.length < 3) {
    const t = RENTAL_TYPES[2], hood = randInt(0, 3);
    out.push({ id: uid(s, 'r'), type: t.id, emoji: t.emoji, name: pick(HOUSE_ADJ) + ' ' + t.name, city, hood, rent: price(s, t.rent * rentMult(s, cc, city, hood)), ll: makeLandlord(s, t.id) });
  }
  return out;
}
function rentalChoice(s, r) {
  const tier = hoodTier(s, P(s).country, r.city || P(s).city, r.hood);
  const who = r.ll.corp ? `Managed by ${r.ll.name}` : `Landlord: ${r.ll.name}`;
  return { label: r.emoji + ' ' + r.name, value: r.id, sub: `${fmtMoney(r.rent)}/yr · ${hoodName(P(s).country, P(s).city, r.hood)} (${tier.name.toLowerCase()}) · ${who} · reviews ${stars(r.ll.stars)}` };
}
// Signing a lease from the rentals listing ('rent' in 17-assets.js calls this).
function signLease(s, r) {
  const deposit = Math.round(r.rent / 6);
  const first = M(s).housing.type === 'parents';
  const out = leaveRental(s, 'moved');
  M(s).housing = { type: 'rent', assetId: null, rent: r.rent, name: r.name, rtype: r.type, city: P(s).city, hood: r.hood, ll: r.ll, since: s.year, deposit };
  P(s).hood = r.hood;
  tally(s, 'moves');
  add(s, { happy: first ? 8 : 3 });
  return { text: `${out ? out + ' ' : ''}You${first ? ' moved out of your parents’ place and' : ''} signed a lease on a ${r.name.toLowerCase()} in ${hoodName(P(s).country, P(s).city, r.hood)}. Deposit: ${fmtMoney(deposit)}.`, emoji: '🔑', tone: 'good' };
}
// Moving out of a rental: the deposit comes back, or some of it does.
function leaveRental(s, why) {
  const h = M(s).housing;
  if (h.type !== 'rent' || !h.deposit) return '';
  const ll = landlordOf(s), dep = h.deposit;
  h.deposit = 0;
  if (why === 'evicted') return `${llShort(ll)} kept your ${fmtMoney(dep)} deposit.`;
  let keep = 0;
  if (ll.style === 'greedy' && chance(0.7)) keep = Math.round(dep * randFloat(0.4, 1));
  else if (ll.style === 'corporate' && chance(0.6)) keep = Math.round(dep * randFloat(0.15, 0.4));
  else if (chance(0.12)) keep = Math.round(dep * randFloat(0.1, 0.3));
  add(s, { money: dep - keep });
  if (!keep) return `You got your ${fmtMoney(dep)} deposit back.`;
  tally(s, 'depositsLost');
  flag(s, 'lostDeposit', { name: ll.name, last: ll.corp ? ll.name : ll.last, amt: keep, year: s.year });
  return keep >= dep ? `${llShort(ll)} kept your whole ${fmtMoney(dep)} deposit for "${pick(['cleaning', 'wear and tear', 'repainting', 'a scratch on the floor'])}."` : `${llShort(ll)} kept ${fmtMoney(keep)} of your deposit for "${pick(['cleaning', 'carpet damage', 'nail holes', 'a stained grout line'])}."`;
}
// What financeTick charges for rent this year. Withheld rent is owed, not paid.
function rentToPay(s) {
  const h = M(s).housing;
  if (h.type !== 'rent' || inPrison(s)) return 0;
  if (h.withheld) { h.owed = (h.owed || 0) + h.rent; return 0; }
  return h.rent;
}
function openRentals(s, text, extra) {
  const items = listing(s, 'rentals');
  popup(s, {
    emoji: '🏢', title: `Rentals in ${P(s).city}`, text: text || 'Rent is paid yearly. You will also pay living costs.', handler: 'rent',
    choices: (extra || []).concat(items.map((r) => rentalChoice(s, r))).concat([{ label: 'Never mind', value: null }]),
  });
}
// Out on the street: back to your parents if they'll have you, else homeless.
function evictMe(s, why) {
  const out = leaveRental(s, why === 'arrears' ? 'evicted' : 'moved');
  const par = relPeople(s, ['parent']);
  const best = par.length ? Math.max(...par.map((p) => relOf(s, p.id).rel)) : 0;
  const home = par.length && A(s) < 35 && chance(best / 100);
  M(s).housing = home ? { type: 'parents', assetId: null, rent: 0, name: '' } : { type: 'homeless', assetId: null, rent: 0, name: '' };
  tally(s, 'evicted');
  add(s, { happy: -10 });
  return `${out} ${home ? 'You moved back in with your parents.' : "You're homeless until you find a new place."}`;
}

/* ---- renting: the landlord's year ------------------------------------------- */
const NOTICE = {
  sale: (s, ll) => `${llShort(ll)} sold the building. The new owners want everyone out by next year.`,
  family: (s, ll) => `${llShort(ll)} wants the place back for ${ll.g === 'f' ? 'her' : ll.g === 'm' ? 'his' : 'their'} ${pick(['nephew', 'daughter', 'son', 'mother', 'new spouse'])}. You have a year to move out.`,
  reno: (s, ll) => `${llShort(ll)} is "renovating," and plans to rent your place out again for twice as much. You have a year to move out.`,
  str: (s, ll) => `${llShort(ll)} is turning the building into vacation rentals for tourists. You have a year to move out.`,
  arrears: (s, ll) => `You're ${fmtMoney(M(s).housing.owed || M(s).housing.rent)} behind on rent, and ${llShort(ll)} filed for eviction.`,
  revenge: (s, ll) => `${llShort(ll)} served you an eviction notice two weeks after the housing inspector's visit. Funny timing.`,
};
function renterYear(s, budget) {
  const h = M(s).housing;
  if (h.type !== 'rent' || !free(s)) return;
  const ll = landlordOf(s), L = LANDLORD_STYLES[ll.style], law = tenantLaw(P(s).country);
  if (h.since >= s.year) return;
  // Moving day: a notice from last year has run out.
  if (h.notice && h.notice.year < s.year) { announce(s, { emoji: '📦', title: 'Moving day', tone: 'bad', text: `Your notice ran out and you had to leave your ${h.name.toLowerCase()}. ${evictMe(s, h.notice.why)}` }); return; }
  ll.mood = clamp100(ll.mood + (h.withheld ? -12 : 2) + randInt(-3, 3));
  // Withheld rent forces the landlord's hand, one way or the other.
  if (h.withheld && h.issue) {
    const r = rand();
    if (r < 0.45) { const back = Math.round((h.owed || 0) / 2), I = RENTAL_ISSUES[h.issue.id]; M(s).money -= back; h.withheld = false; h.owed = 0; h.issue = null; log(s, `🔧 ${llShort(ll)} finally fixed the ${I ? I.name : 'problem'}. You paid back ${fmtMoney(back)} of the rent you held.`, 'good'); tally(s, 'withholdWon'); }
    else if (r < 0.75 && !h.notice) { h.notice = { why: 'arrears', year: s.year }; noticePopup(s, 'arrears'); return; }
  }
  // An old problem nobody fixed keeps wearing you down.
  if (h.issue) {
    const I = RENTAL_ISSUES[h.issue.id];
    if (I && chance(L.fix * 0.35)) { log(s, `🔧 ${llShort(ll)} finally fixed the ${I.name}.`, 'good'); h.issue = null; h.withheld = false; }
    else if (I) { add(s, I.hurt); log(s, `${I.emoji} The ${I.name} still isn't fixed.`, 'bad'); }
  } else if (chance(0.15 + (myHoodTier(s).id === 'rough' ? 0.07 : 0) + (ll.style === 'absent' ? 0.04 : 0))) {
    const id = pick(Object.keys(RENTAL_ISSUES)), I = RENTAL_ISSUES[id];
    if (chance(L.fix)) log(s, `${I.emoji} ${I.text}. ${llShort(ll)} had it fixed ${pick(['within a week', 'the next day', 'after only three reminders'])}.`);
    else if (budget.n-- > 0) {
      h.issue = { id, since: s.year };
      popup(s, {
        emoji: I.emoji, title: 'Something broke', handler: 'llIssue', tone: 'bad',
        text: `${I.text}, and ${llShort(ll)} ${pick(['hasn’t answered your calls', 'said they would "look into it"', 'told you to "be patient"', 'left you on read'])}.`,
        choices: [
          { label: 'Fix it yourself', value: 'self', sub: fmtMoney(price(s, I.cost)) },
          { label: 'Call the housing inspector', value: 'inspector' },
          { label: 'Withhold rent until it’s fixed', value: 'withhold', tone: 'bad' },
          { label: 'Live with it for now', value: 'wait' },
        ],
      });
    } else h.issue = { id, since: s.year };
  }
  // Lease renewal: the yearly rent raise.
  const st = hereState(s);
  let raise = randFloat(L.raise[0], L.raise[1]) + Math.max(-0.03, st.g * 0.8) + (h.bump || 0);
  h.bump = 0;
  if (law === 'strong') raise = Math.min(raise, 0.03);
  else if (law === 'medium') raise = Math.min(raise, 0.08);
  raise = Math.round(raise * 100) / 100;
  if (raise >= 0.07 && budget.n-- > 0) {
    const to = Math.round(h.rent * (1 + raise));
    popup(s, {
      emoji: '🏢', title: 'Rent increase', handler: 'llRaise', ctx: { to, pct: raise },
      text: `${ll.corp ? ll.name + ' sent a form letter' : llShort(ll) + ' says'}: your rent goes up ${Math.round(raise * 100)}% to ${fmtMoney(to)} a year.`,
      choices: [{ label: 'Pay it', value: 'pay' }, { label: 'Negotiate', value: 'talk' }, { label: 'Start looking for a new place', value: 'look' }],
    });
  } else if (raise >= 0.01) {
    h.rent = Math.round(h.rent * (1 + raise));
    log(s, `🏢 ${llShort(ll)} raised your rent ${Math.round(raise * 100)}% to ${fmtMoney(h.rent)} a year.`);
  } else if (raise <= -0.02) {
    h.rent = Math.round(h.rent * (1 + raise));
    log(s, `🏢 Rents in ${P(s).city} fell, and ${llShort(ll)} lowered yours to ${fmtMoney(h.rent)}.`, 'good');
  }
  // Eviction notices.
  if (h.notice) return;
  const info = hereInfo(s), lawCut = law === 'strong' ? 0.4 : law === 'medium' ? 0.7 : 1;
  const revenge = h.inspected && s.year - h.inspected <= 1 && ll.style !== 'kind';
  const odds = (L.evict + (ll.mood < 25 ? 0.08 : 0) + (info.traits.includes('tourist') ? 0.015 : 0) + (st.g > 0.05 ? 0.02 : 0)) * lawCut + (revenge ? 0.25 : 0);
  if (!chance(odds) || budget.n-- <= 0) return;
  const why = revenge ? 'revenge' : weighted([['sale', 3], ['family', ll.corp ? 0 : 2], ['reno', st.g > 0.03 ? 3 : 1], ['str', info.traits.includes('tourist') ? 3 : 0]], (x) => x[1])[0];
  h.notice = { why, year: s.year };
  noticePopup(s, why);
}
function noticePopup(s, why) {
  const ll = landlordOf(s), h = M(s).housing;
  const choices = [{ label: 'Start looking for a new place', value: 'look' }, { label: 'Fight it', value: 'fight', sub: `Legal costs ${fmtMoney(price(s, 1500))}` }];
  if (['sale', 'reno', 'str'].includes(why)) choices.push({ label: 'Ask them to pay you to leave', value: 'cash' });
  if (['reno', 'str'].includes(why)) choices.push({ label: 'Offer to pay more rent', value: 'more', sub: `${fmtMoney(Math.round(h.rent * 1.25))}/yr` });
  if (why === 'arrears') choices.push({ label: 'Pay what you owe', value: 'payup', sub: fmtMoney(h.owed || h.rent), disabled: M(s).money < (h.owed || h.rent) });
  popup(s, { emoji: '📜', title: 'Eviction notice', tone: 'bad', handler: 'llNotice', ctx: { why }, text: NOTICE[why](s, ll), choices });
}
onChoice('llIssue', (s, ctx, v) => {
  const h = M(s).housing;
  if (h.type !== 'rent' || !h.issue) return;
  if (v === 'self') return fixItMyself(s);
  if (v === 'inspector') return callInspector(s);
  if (v === 'withhold') return withholdRent(s);
  return { text: `You bought a ${pick(['space heater', 'bucket', 'dehumidifier', 'very large candle'])} and decided to wait it out.`, quiet: true };
});
onChoice('llRaise', (s, ctx, v) => {
  const h = M(s).housing;
  if (h.type !== 'rent') return;
  if (v === 'look') { openRentals(s, `Your rent is going up to ${fmtMoney(ctx.to)}. Here's what else is out there.`); h.rent = ctx.to; return; }
  if (v === 'talk') {
    addSkill(s, 'charisma', 1);
    const ll = landlordOf(s), odds = 0.3 + skill(s, 'charisma') / 250 + (ll.style === 'kind' || ll.style === 'family' ? 0.25 : 0) + (ll.mood - 50) / 200;
    if (chance(clamp(odds, 0.05, 0.9))) { h.rent = Math.round(h.rent * (1 + Math.max(0.02, ctx.pct / 3))); return `You talked ${llShort(ll)} down. Your rent is ${fmtMoney(h.rent)} now.`; }
    h.rent = ctx.to;
    ll.mood = clamp100(ll.mood - 4);
    return `${llShort(ll)} didn't budge. Your rent is ${fmtMoney(h.rent)} now.`;
  }
  h.rent = ctx.to;
  add(s, { happy: -2 });
  return { text: `Your rent is ${fmtMoney(h.rent)} a year now.`, quiet: true };
});
onChoice('llNotice', (s, ctx, v) => {
  const h = M(s).housing;
  if (h.type !== 'rent' || !h.notice) return;
  const ll = landlordOf(s), law = tenantLaw(P(s).country);
  if (v === 'look') { openRentals(s, 'You have until next year to find a new place.'); return; }
  if (v === 'payup') {
    const owed = h.owed || h.rent;
    if (!pay(s, owed)) return cantAfford(owed);
    h.owed = 0; h.withheld = false; h.notice = null;
    ll.mood = clamp100(ll.mood + 10);
    return { text: `You paid the ${fmtMoney(owed)} you owed. ${llShort(ll)} dropped the eviction.`, tone: 'good' };
  }
  if (v === 'more') {
    if (!chance(ll.style === 'greedy' || ll.corp ? 0.65 : 0.4)) return { text: `${llShort(ll)} said the new tenants will pay more than that.`, tone: 'bad' };
    h.rent = Math.round(h.rent * 1.25); h.notice = null;
    return `${llShort(ll)} took the deal. You're staying, at ${fmtMoney(h.rent)} a year.`;
  }
  if (v === 'cash') {
    if (!chance(clamp(0.35 + skill(s, 'charisma') / 250 + (ll.corp ? 0.15 : 0) + (law !== 'weak' ? 0.15 : 0), 0.1, 0.9))) return `${llShort(ll)} laughed and said the notice stands.`;
    const amt = Math.round(h.rent * randFloat(0.25, 0.75));
    add(s, { money: amt });
    tally(s, 'cashForKeys');
    return { text: `${llShort(ll)} agreed to pay you ${fmtMoney(amt)} to go quietly. You still have to move out by next year.`, tone: 'good' };
  }
  // Fight it in housing court.
  const fee = price(s, 1500);
  if (!pay(s, fee)) return cantAfford(fee);
  const mine = h.issue ? 0.15 + Math.min(0.2, (s.year - h.issue.since) * 0.07) : 0;
  const base = { sale: 0.25, family: 0.3, reno: 0.45, str: 0.45, arrears: h.withheld && h.issue ? 0.35 + mine : 0.12, revenge: 0.75 }[ctx.why] || 0.3;
  const odds = clamp(base + (law === 'strong' ? 0.25 : law === 'medium' ? 0.1 : 0) + (hasDegree(s, 'jd') ? 0.1 : 0) + skill(s, 'charisma') / 500, 0.05, 0.92);
  if (chance(odds)) {
    h.notice = null;
    if (ctx.why === 'arrears' && h.issue) { h.owed = Math.round((h.owed || 0) / 2); }
    ll.mood = clamp100(ll.mood - 20);
    tally(s, 'evictionsBeaten');
    return { text: `The housing court sided with you. You're staying, and ${llShort(ll)} is furious.`, tone: 'good', emoji: '⚖️' };
  }
  return { text: `The judge sided with ${llShort(ll)}. ${evictMe(s, ctx.why)}`, tone: 'bad', emoji: '⚖️' };
});
function fixItMyself(s) {
  const h = M(s).housing, I = RENTAL_ISSUES[h.issue.id], cost = price(s, I.cost);
  if (!pay(s, cost)) return cantAfford(cost);
  h.issue = null; h.withheld = false;
  return `You paid ${fmtMoney(cost)} and fixed the ${I.name} yourself. ${pick(['You did not get reimbursed.', 'You kept the receipt, out of spite.', 'It took a whole weekend and three videos.'])}`;
}
function callInspector(s) {
  const h = M(s).housing, I = RENTAL_ISSUES[h.issue.id], ll = landlordOf(s);
  h.inspected = s.year;
  if (chance(tenantLaw(P(s).country) === 'weak' ? 0.65 : 0.82)) {
    h.issue = null; h.withheld = false;
    ll.mood = clamp100(ll.mood - 30);
    tally(s, 'inspectorCalls');
    return { text: `The inspector cited ${llShort(ll)} for the ${I.name}. It was fixed within the week. ${llShort(ll)} now glares at you in the hallway.`, tone: 'good' };
  }
  ll.mood = clamp100(ll.mood - 15);
  return { text: 'The inspector came, poked around for ten minutes, and found "no violation." Your landlord found out who called.', tone: 'bad' };
}
function withholdRent(s) {
  const h = M(s).housing, ll = landlordOf(s);
  h.withheld = true;
  ll.mood = clamp100(ll.mood - 10);
  return { text: `You told ${llShort(ll)} you won't pay another cent of rent until the ${RENTAL_ISSUES[h.issue.id].name} is fixed. This could go either way.`, tone: 'bad' };
}

const renting = (s) => free(s) && M(s).housing.type === 'rent';
const hasIssue = (s) => renting(s) && !!M(s).housing.issue && !!RENTAL_ISSUES[M(s).housing.issue.id];
const issueName = (s) => RENTAL_ISSUES[M(s).housing.issue.id].name;
defAction({
  id: 'll_repair', cat: 'home', label: (s) => `Ask your landlord to fix the ${issueName(s)}`, emoji: '🔧',
  when: (s) => hasIssue(s) && !count(s, 'll_repair'),
  sub: (s) => `Broken since ${M(s).housing.issue.since}`,
  run: (s) => {
    bump(s, 'll_repair');
    const h = M(s).housing, ll = landlordOf(s);
    if (chance(clamp(LANDLORD_STYLES[ll.style].fix * 0.6 + (ll.mood - 50) / 250, 0.05, 0.9))) { const n = issueName(s); h.issue = null; h.withheld = false; return { text: `${llShort(ll)} sent someone over. The ${n} is fixed.`, tone: 'good' }; }
    ll.mood = clamp100(ll.mood - 3);
    return `${pick(['No reply.', 'You got an automated email.', `${llShort(ll)} said it's "on the list."`, 'Your call went to voicemail. Again.'])}`;
  },
});
defAction({
  id: 'll_fixself', cat: 'home', label: (s) => `Fix the ${issueName(s)} yourself`, emoji: '🛠️',
  when: hasIssue, sub: (s) => fmtMoney(price(s, RENTAL_ISSUES[M(s).housing.issue.id].cost)),
  run: (s) => fixItMyself(s),
});
defAction({
  id: 'll_inspector', cat: 'home', label: 'Call the housing inspector', emoji: '📋',
  when: (s) => hasIssue(s) && M(s).housing.inspected !== s.year,
  run: (s) => callInspector(s),
});
defAction({
  id: 'll_withhold', cat: 'home', label: 'Withhold rent until it’s fixed', emoji: '✋',
  when: (s) => hasIssue(s) && !M(s).housing.withheld,
  sub: () => 'Risky: you could be evicted',
  run: (s) => withholdRent(s),
});
defAction({
  id: 'll_sue', cat: 'home', label: 'Sue your landlord', emoji: '⚖️',
  when: (s) => hasIssue(s) && s.year - M(s).housing.issue.since >= 1 && !count(s, 'sue'),
  run: (s) => {
    const h = M(s).housing, ll = landlordOf(s), yrs = s.year - h.issue.since;
    chooseCounsel(s, draftCase(s, 'plaintiff', 'tenancy', { vs: ll.name, cap: ll.corp ? ll.name : ll.last, their: ll.corp ? randInt(10, 16) : randInt(4, 10), merit: clamp(randInt(35, 60) + yrs * 8 + (h.inspected ? 12 : 0), 5, 95), why: `over the ${issueName(s)} they never fixed` }));
  },
});
defAction({
  id: 'll_sue_deposit', cat: 'home', label: 'Sue for your old deposit', emoji: '🧾',
  when: (s) => free(s) && A(s) >= 18 && !!flag(s, 'lostDeposit') && s.year - flag(s, 'lostDeposit').year <= 2 && !count(s, 'sue'),
  sub: (s) => `${flag(s, 'lostDeposit').name} kept ${fmtMoney(flag(s, 'lostDeposit').amt)}`,
  run: (s) => {
    const d = flag(s, 'lostDeposit');
    flag(s, 'lostDeposit', null);
    chooseCounsel(s, draftCase(s, 'plaintiff', 'deposit', { vs: d.name, cap: d.last, claim: Math.max(d.amt, price(s, 300)), their: randInt(3, 9) }));
  },
});
defAction({
  id: 'll_gift', cat: 'home', label: 'Get on your landlord’s good side', emoji: '🎁',
  when: (s) => renting(s) && !count(s, 'll_gift'),
  sub: (s) => `A gift basket · ${fmtMoney(price(s, 60))}`,
  run: (s) => {
    bump(s, 'll_gift');
    const ll = landlordOf(s), cost = price(s, 60);
    if (!pay(s, cost)) return cantAfford(cost);
    ll.mood = clamp100(ll.mood + (ll.corp ? 2 : randInt(8, 15)));
    return ll.corp ? `You mailed a gift basket to ${ll.name}'s head office. Someone in accounting enjoyed it.` : `${llShort(ll)} loved the gift basket. ${pick(['They waved at you twice this week.', 'They called you "one of the good ones."', 'They promised to look at the drafty window.'])}`;
  },
});
// Court cases for landlord fights (42-courts.js loads first).
CASE_TYPES.tenancy = { name: 'Landlord dispute', emoji: '🏢', claim: [2000, 40000], m: [30, 75], p: 'over repairs they never made', d: 'over repairs you never made' };
CASE_TYPES.deposit = { name: 'Security deposit', emoji: '🧾', claim: [300, 6000], m: [45, 85], p: 'for the deposit they kept' };

/* ---- moving cities ---------------------------------------------------------- */
function transferOdds(s) {
  const c = M(s).career;
  if (!c) return null;
  const j = JOBS[c.id];
  if (['fame', 'sports', 'military', 'coach'].includes(j.special)) return 1;
  if (j.special === 'politics' || j.appointed) return 0;
  const base = { tech: 0.65, office: 0.55, business: 0.55, media: 0.6, health: 0.5, education: 0.4, public: 0.3, law: 0.45, science: 0.45, service: 0.5, transport: 0.5, trades: 0.4 }[j.cat] ?? 0.4;
  return clamp(base + (c.perf - 55) / 250, 0.05, 0.9);
}
function oddsWord(p) { return p >= 1 ? 'you can keep it' : p <= 0 ? "you'll have to give it up" : p >= 0.6 ? 'a transfer is likely' : p >= 0.35 ? 'a transfer is possible' : 'a transfer is unlikely'; }
defAction({
  id: 'city_move', cat: 'home', label: 'Move to another city', emoji: '🚚',
  desc: 'A fresh start, without leaving the country.',
  when: (s) => free(s) && A(s) >= 18 && !inSchool(s) && country(s).cities.length > 1 && !count(s, 'cityMove'),
  run: (s) => {
    const C = country(s), cc = P(s).country;
    popup(s, {
      emoji: '🚚', title: `Move within ${theCountry(cc)}`, text: `You live in ${P(s).city}. Where to?`, handler: 'cityPick',
      choices: C.cities.filter((c) => c !== P(s).city).map((c) => {
        const info = cityInfo(cc, c), hubs = hubNames(info).slice(0, 2);
        return { label: c, value: c, sub: `${CITY_SIZES[info.size].name} · rent ~${fmtMoneyShort(typicalRent(s, cc, c))}/yr · pay ${pctVs(info.wage)}${hubs.length ? ' · ' + hubs.join(', ') : ''}` };
      }).concat([{ label: 'Stay put', value: null }]),
    });
  },
});
onChoice('cityPick', (s, ctx, city) => { if (city) cityConfirm(s, P(s).country, city); });
function moveCost(s, cc, city) { return price(s, 2500 * (0.7 + 0.3 * cityInfo(cc, city).col) + (M(s).assets.length ? 1500 : 0)); }
function cityConfirm(s, cc, city, home) {
  const info = cityInfo(cc, city), here = hereInfo(s), lines = [];
  lines.push(`${city} is ${aAn(CITY_SIZES[info.size].name.toLowerCase())}. Rents run about ${fmtMoney(typicalRent(s, cc, city))} a year for a one-bedroom, and pay is ${pctVs(info.wage / here.wage).replace('average', 'what you get here')}.`);
  const t = transferOdds(s);
  if (t !== null) lines.push(`Your job: ${oddsWord(t)}.`);
  const sp = romanticId(s);
  if (sp && relKind(s, sp) === 'spouse') lines.push(`${nm(s, sp)} is coming with you.`);
  if (dependents(s).length) lines.push(`So are the kids.`);
  if (relPeople(s, K_FRIENDS).length) lines.push('Your friends will miss you.');
  popup(s, {
    emoji: '🚚', title: `Move to ${city}?`, text: lines.join(' '), handler: 'cityGo', ctx: { cc, city, home: home || null },
    choices: [{ label: 'Pack the truck', value: true, sub: fmtMoney(moveCost(s, cc, city)) }, { label: 'Never mind', value: false }],
  });
}
onChoice('cityGo', (s, ctx, yes) => {
  if (!yes || !free(s)) return;
  const cost = moveCost(s, ctx.cc, ctx.city);
  if (!pay(s, cost)) return cantAfford(cost);
  bump(s, 'cityMove');
  const from = P(s).city, fromSize = citySize(s), lines = [];
  // Work: transfer, keep it, or leave it behind.
  const c = M(s).career;
  if (c) {
    const t = transferOdds(s), oldWage = wageOf(s);
    if (t >= 1) lines.push(`You kept your job as ${aAn(careerTitle(s).toLowerCase())}.`);
    else if (t > 0 && chance(t)) { c.salary = Math.round(c.salary * cityInfo(ctx.cc, ctx.city).wage / oldWage); lines.push(`${c.employer || 'Your employer'} transferred you to ${ctx.city}. Your salary is ${fmtMoney(c.salary)} now.`); }
    else { lines.push(`${c.employer || 'Your employer'} couldn't transfer you, so you left your job.`); leaveJob(s, 'moved'); }
  }
  if (M(s).ptJob) M(s).ptJob = null;
  const h = M(s).housing;
  const dep = h.type === 'rent' ? leaveRental(s, 'moved') : '';
  if (dep) lines.push(dep);
  const oldHomeId = h.type === 'own' ? h.assetId : null;
  M(s).housing = { type: 'homeless', assetId: null, rent: 0, name: '' };
  const comes = relocate(s, ctx.cc, ctx.city);
  if (comes) lines.push(comes);
  if (fromSize === 'small' && citySize(s) === 'metro') tally(s, 'smallToMetro');
  add(s, { happy: 3 });
  if (oldHomeId) {
    const oldH = myAsset(s, oldHomeId);
    if (oldH) {
      oldH.rentedOut = true;
      if (oldH.mgr && freeUnits(s, oldH) > 0) {
        const mgrPlaced = managerFill(s, oldH);
        if (mgrPlaced.length) lines.push(`Your property manager in ${from} leased your vacated unit: ${listJoin(mgrPlaced)}.`);
      } else {
        lines.push(`Your vacated unit at ${oldH.name} in ${from} is now available to rent out.`);
      }
    }
  }
  // A place to live in the new city.
  if (ctx.home && myAsset(s, ctx.home)) { const r = moveInto(s, ctx.home); lines.push(r ? r.text : ''); }
  else {
    const owned = M(s).assets.filter((a) => a.kind === 'house' && assetCity(s, a) === ctx.city && assetCC(s, a) === ctx.cc && freeUnits(s, a) > 0);
    const left = M(s).assets.filter((a) => a.kind === 'house' && assetCity(s, a) === from);
    openRentals(s, `Welcome to ${ctx.city}! Find a place to live.${left.length && !left.some((a) => a.rentedOut) ? ` Your ${left[0].name} back in ${from} is empty now. You could rent it out.` : ''}`, owned.map((a) => ({ label: `🔑 Move into your ${a.name}`, value: 'own:' + a.id })));
  }
  return { text: `You moved from ${from} to ${ctx.city}. ${lines.filter(Boolean).join(' ')}`, title: `Welcome to ${ctx.city}`, emoji: '🚚', tone: 'good' };
});
// Everyone who moves with you, and the bookkeeping for a new city. Also used by
// emigration and job transfers. Returns a line about who came along.
function relocate(s, cc, city) {
  const me = P(s), out = [];
  me.country = cc; me.city = city; me.hood = null;
  const sp = romanticId(s);
  if (sp && s.people[sp] && s.people[sp].alive) {
    const p = s.people[sp], kind = relKind(s, sp);
    if (kind === 'spouse' || (kind === 'partner' && relOf(s, sp).rel >= 60 && chance(0.6))) { p.country = cc; p.city = city; if (kind === 'partner') out.push(`${p.first} came with you.`); }
    else if (K_ROMANCE.includes(kind)) { addRel(s, sp, -10); out.push(`You and ${p.first} are long-distance now.`); }
  }
  for (const k of dependents(s)) { k.country = cc; k.city = city; }
  relAll(s, K_FRIENDS, -8);
  for (const k of ['rentals', 'houses', 'jobs']) delete s.listings[k];
  notePlace(s);
  tally(s, 'cityMoves');
  return out.join(' ');
}
// Emigration and witness protection move you without the moving flow.
function cityArrive(s) { P(s).hood = null; for (const k of ['rentals', 'houses', 'jobs']) delete s.listings[k]; notePlace(s); }
// A job transfer to another city (the job_transfer event): a raise, and the move.
function transferTo(s, city) {
  const c = M(s).career, from = P(s).city, oldWage = wageOf(s);
  const dep = leaveRental(s, 'moved');
  M(s).housing = { type: 'homeless', assetId: null, rent: 0, name: '' };
  const comes = relocate(s, P(s).country, city);
  if (c) c.salary = Math.round(c.salary * 1.12 * wageOf(s) / oldWage);
  add(s, { happy: 3 });
  openRentals(s, `Welcome to ${city}! Find a place to live.`);
  return `You moved from ${from} to ${city} with a raise${c ? `: ${fmtMoney(c.salary)} a year` : ''}. You miss your friends. ${dep} ${comes}`.trim();
}

/* ---- owning: tenants -------------------------------------------------------- */
const TENANT_KINDS = {
  model: { name: 'Model tenant', pay: 1, damage: 0, stay: 0.9, w: 4 },
  family: { name: 'Settled family', pay: 0.97, damage: 0.03, stay: 0.94, w: 3 },
  late: { name: 'Pays late', pay: 0.7, damage: 0.03, stay: 0.8, w: 2.2 },
  messy: { name: 'Hard on the place', pay: 0.96, damage: 0.14, stay: 0.82, w: 2 },
  party: { name: 'Loud', pay: 0.9, damage: 0.09, stay: 0.74, w: 1.5 },
  pro: { name: 'Professional non-payer', pay: 0, damage: 0.05, stay: 1, w: 0.6 },
};
const TENANT_HINTS = {
  model: ['Glowing references from two landlords', 'Steady job and a great credit score', 'Quiet, tidy and very polite'],
  family: ['Young family who wants to stay for years', 'Two kids and a very old cat', 'Looking for somewhere to put down roots'],
  late: ['Credit score: shaky', '“Between jobs,” but something is lined up', 'Asks if rent can be due “around” the first'],
  messy: ['Has two very large dogs', 'Art student. Owns a lot of paint.', 'Their car is full of fast-food bags'],
  party: ['DJ who works nights', 'Asked how thick the walls are', 'Wants to know if the roof is “party-rated”'],
  pro: ['Perfect references. A little too perfect.', 'Offers three months up front, in cash', 'Asks detailed questions about eviction law'],
};
const TENANT_JOBS = {
  model: ['nurse', 'accountant', 'software developer', 'pharmacist', 'paralegal', 'librarian'],
  family: ['teacher', 'electrician', 'bus driver', 'dental hygienist', 'police officer', 'chef'],
  late: ['barista', 'freelancer', 'delivery driver', 'sales rep', 'gig worker', 'actor'],
  messy: ['art student', 'dog walker', 'mechanic', 'line cook', 'grad student', 'landscaper'],
  party: ['bartender', 'DJ', 'club promoter', 'musician', 'college student', 'event planner'],
  pro: ['consultant', '“entrepreneur”', 'investor', 'life coach', 'crypto trader', 'film producer'],
};
const TENANT_CHECK = { model: 'Background check: spotless.', family: 'Background check: clean, long tenancies.', late: 'Background check: two late-payment judgments.', messy: 'Background check: a landlord kept their whole deposit for damage.', party: 'Background check: three noise complaints at their last place.', pro: 'Background check: four evictions in four years, under two different names.' };
const RENT_LEVELS = { low: { name: 'Below market', mult: 0.85, mood: 10 }, market: { name: 'Market rate', mult: 1, mood: 0 }, high: { name: 'Above market', mult: 1.2, mood: -10 } };
const PROPERTY_REPAIRS = [
  { name: 'The water heater died', emoji: '🚿', cost: 1500 },
  { name: 'The roof is leaking', emoji: '💧', cost: 6000 },
  { name: 'The furnace stopped working', emoji: '🥶', cost: 3500 },
  { name: 'There are mice in the kitchen', emoji: '🐭', cost: 400 },
  { name: 'A pipe burst under the sink', emoji: '🔧', cost: 900 },
  { name: 'The dishwasher flooded the kitchen', emoji: '🍽️', cost: 1200 },
  { name: 'The front steps are crumbling', emoji: '🧱', cost: 2200 },
  { name: 'The air conditioning gave out in a heat wave', emoji: '🥵', cost: 2800 },
];

function assetCity(s, a) { return a.city || (a.city = P(s).city); }
function assetCC(s, a) { return a.cc || (a.cc = P(s).country); }
function assetHood(s, a) { if (a.hood === undefined || a.hood === null) a.hood = assetCity(s, a) === P(s).city ? myHood(s) : randInt(0, 3); return a.hood; }
function unitsOf(a) { if (!a.units) { const t = HOUSE_TYPES.find((x) => x.id === a.type); a.units = (t && t.units) || 1; } return a.units; }
function livesIn(s, a) { return M(s).housing.type === 'own' && M(s).housing.assetId === a.id; }
// Tenants on a property. Rentals from before Cities get one tenant on the spot.
function tenantsOf(s, a) {
  if (!a.tenants) {
    a.tenants = [];
    if (a.rentedOut && a.rentIncome) { const t = makeTenant(s, a, false); t.rent = a.rentIncome; t.since = s.year - 1; a.tenants.push(t); }
  }
  return a.tenants;
}
// A home built to order, here and now (the simulator and the tests use it).
function makeHouse(s, typeId, o) {
  const t = HOUSE_TYPES.find((x) => x.id === typeId) || HOUSE_TYPES[0], cc = P(s).country, city = P(s).city;
  const hood = o && o.hood !== undefined ? o.hood : randInt(0, 3), value = price(s, t.base * houseMult(s, cc, city, hood));
  return Object.assign({ id: uid(s, 'a'), kind: 'house', type: t.id, emoji: t.emoji, name: pick(HOUSE_ADJ) + ' ' + t.name, cond: 80, since: s.year, beds: t.beds[0], units: t.units || 1, cc, city, hood, value, paid: value }, o || {});
}
function freeUnits(s, a) { return Math.max(0, unitsOf(a) - (livesIn(s, a) ? 1 : 0) - tenantsOf(s, a).length); }
function isRemote(s, a) { return assetCity(s, a) !== P(s).city || assetCC(s, a) !== P(s).country; }
// Fair yearly rent for one unit: a share of the home's value, more in small cities.
function marketRent(s, a) {
  const info = cityInfo(assetCC(s, a), assetCity(s, a));
  // Shared additions lift every unit's rent; an interior only lifts its own unit, so one unit's share of the building.
  const rBoost = sum(a.renovations || [], (r) => (typeof RENOVATION_PROJECTS !== 'undefined' && RENOVATION_PROJECTS[r.id] ? RENOVATION_PROJECTS[r.id].rentBoost * (RENOVATION_PROJECTS[r.id].shared ? 1 : 1 / unitsOf(a)) : 0));
  return nicePrice(a.value * CITY_SIZES[info.size].yield * (0.7 + a.cond / 333) / unitsOf(a) * (unitsOf(a) > 1 ? 1.1 : 1) * (1 + rBoost));
}
function askingRent(s, a) {
  if (a.customRent && a.customRent > 0) return a.customRent;
  return nicePrice(marketRent(s, a) * (RENT_LEVELS[a.rentLvl || 'market'] ? RENT_LEVELS[a.rentLvl || 'market'].mult : 1));
}
function makeTenant(s, a, managed) {
  const rBoost = (a.renovations || []).length * 0.15;
  const w = (k) => TENANT_KINDS[k].w * ((managed || rBoost > 0) && ['late', 'pro', 'party'].includes(k) ? 0.45 : 1) * (rBoost > 0 && ['model', 'family'].includes(k) ? 1.4 : 1);
  const kind = weighted(Object.keys(TENANT_KINDS), w);
  const g = chance(0.5) ? 'm' : 'f', cc = assetCC(s, a);
  const mRent = marketRent(s, a), ask = askingRent(s, a);
  const ratio = ask / Math.max(1, mRent);
  const moodDelta = Math.round(clamp((1 - ratio) * 50, -30, 20));
  return { id: uid(s, 't'), first: randomFirst(cc, g), last: randomLast(cc), g, born: s.year - (kind === 'family' ? randInt(28, 45) : randInt(21, 62)), kind, job: pick(TENANT_JOBS[kind]), rent: askingRent(s, a), since: s.year, mood: clamp100(60 + moodDelta), owed: 0 };
}
function tenantHint(t, honest) { return pick(TENANT_HINTS[honest ? t.kind : pick(['model', 'family'])]); }
function tenantAge(s, t) { return s.year - t.born; }
function tenantName(t) { return `${t.first} ${t.last}`; }
function findTenant(s, aid, tid) { const a = myAsset(s, aid); return a && a.tenants ? { a, t: a.tenants.find((x) => x.id === tid) } : null; }
function dropTenant(s, a, t) { a.tenants = tenantsOf(s, a).filter((x) => x !== t); if (!a.tenants.length && !a.mgr) a.rentedOut = false; a.rentIncome = sum(a.tenants, (x) => x.rent); }
function allTenants(s) { return sum(M(s).assets.filter((a) => a.kind === 'house'), (a) => (a.tenants || []).length); }

// Screening: three applicants. A background check shows who they really are.
function screenTenants(s, a, checked, prev) {
  const apps = prev || [0, 1, 2].map(() => { const t = makeTenant(s, a, false); t.hint = tenantHint(t, chance(0.7)); return t; });
  if (checked) for (const t of apps) t.hint = TENANT_CHECK[t.kind];
  popup(s, {
    emoji: '🗝️', title: `Applicants for your ${a.name}`, handler: 'tnPick', ctx: { aid: a.id, apps },
    text: `Asking rent: ${fmtMoney(askingRent(s, a))} a year${unitsOf(a) > 1 ? ' per unit' : ''}. ${freeUnits(s, a) > 1 ? `${freeUnits(s, a)} units are empty.` : ''}`.trim(),
    choices: apps.map((t, i) => ({ label: `${tenantName(t)}, ${tenantAge(s, t)} · ${t.job}`, value: i, sub: t.hint }))
      .concat(checked ? [] : [{ label: '🔎 Run background checks first', value: 'check', sub: fmtMoney(price(s, 120)) }])
      .concat([{ label: 'None of them', value: null }]),
  });
}
onChoice('tnPick', (s, ctx, v) => {
  const a = myAsset(s, ctx.aid);
  if (v === null || v === undefined || !a || a.kind !== 'house' || freeUnits(s, a) < 1) return;
  if (v === 'check') {
    const cost = price(s, 120);
    if (!pay(s, cost)) return cantAfford(cost);
    return screenTenants(s, a, true, ctx.apps);
  }
  const t = ctx.apps[v];
  if (!t) return;
  delete t.hint;
  t.since = s.year;
  a.tenants.push(t);
  a.rentedOut = true;
  a.rentIncome = sum(a.tenants, (x) => x.rent);
  tally(s, 'tenantsSigned');
  return { text: `${tenantName(t)} signed a lease on your ${a.name} at ${fmtMoney(t.rent)} a year.`, emoji: '🔑', tone: 'good' };
});
// A property manager fills empty units on their own, with better tenants.
function managerFill(s, a) {
  const names = [];
  while (freeUnits(s, a) > 0) { const t = makeTenant(s, a, true); a.tenants.push(t); names.push(t.first); tally(s, 'tenantsSigned'); }
  a.rentIncome = sum(a.tenants, (x) => x.rent);
  return names;
}
// financeTick collects the year's rent through this: [label, amount] or null.
function rentRoll(s, a) {
  const ts = tenantsOf(s, a);
  if (!ts.length) return null;
  let got = 0;
  for (const t of ts) {
    let paid = t.rent;
    if (t.kind === 'pro') paid = s.year - t.since <= 1 ? t.rent : 0;
    else if (t.withhold) paid = 0;
    else if (t.kind === 'late') paid = Math.round(t.rent * randFloat(0.55, 1));
    else if (chance(1 - TENANT_KINDS[t.kind].pay)) paid = Math.round(t.rent * randFloat(0.5, 0.9));
    t.owed = (t.owed || 0) + t.rent - paid;
    if (t.plan && t.owed > 0 && t.kind !== 'pro') { const back = Math.min(t.owed, Math.round(t.rent / 3)); t.owed -= back; paid += back; }
    got += paid;
  }
  if (a.mgr) got = Math.round(got * 0.92);
  a.rentIncome = sum(ts, (t) => t.rent);
  tally(s, 'rentCollected', got);
  return got > 0 ? [`Rent from ${a.name}${a.mgr ? ' (after the manager’s 8%)' : ''}`, got] : null;
}

/* ---- owning: the landlord's year --------------------------------------------- */
function propertyYear(s, a, budget) {
  const ts = tenantsOf(s, a), remote = isRemote(s, a), law = tenantLaw(assetCC(s, a));
  const ask = askingRent(s, a), market = marketRent(s, a);
  for (const t of ts.slice()) {
    const K = TENANT_KINDS[t.kind];
    // An eviction filed last year gets its day in court.
    if (t.evict && t.evict.year < s.year) {
      const odds = t.evict.why === 'arrears' ? (t.kind === 'pro' ? 0.6 : 0.88) : law === 'strong' ? 0.2 : law === 'medium' ? 0.55 : 0.88;
      if (chance(odds)) {
        const back = Math.round((t.owed || 0) * (t.kind === 'pro' ? 0.1 : 0.5));
        if (back) add(s, { money: back });
        dropTenant(s, a, t);
        tally(s, 'tenantsEvicted');
        log(s, `⚖️ The court approved your eviction of ${tenantName(t)} from the ${a.name}.${back ? ` You recovered ${fmtMoney(back)} of what they owed.` : ''}`);
      } else {
        t.evict = null; t.mood = clamp100(t.mood - 25);
        log(s, `⚖️ The housing court sided with ${tenantName(t)}. They're staying in your ${a.name}.`, 'bad');
      }
      continue;
    }
    if (t.evict) continue;
    const ratio = t.rent / Math.max(1, market);
    t.mood = clamp100(t.mood + (ratio < 0.92 ? 3 : ratio > 1.12 ? -5 : 0) + (a.cond < 40 ? -4 : 0) + (remote && !a.mgr ? -2 : 0) + (a.mgr ? 1 : 0) + randInt(-3, 3));
    if (chance(K.damage + (t.pet ? 0.04 : 0))) {
      const d = randInt(4, 15);
      a.cond = clamp(a.cond - d, 0, 100);
      if (d >= 10) log(s, `🏚️ ${tenantName(t)} ${pick(['did some serious damage to', 'trashed the kitchen at', 'left a hole in the wall at'])} your ${a.name}.`, 'bad');
    }
    // Moving out at the end of the lease.
    const leave = t.kind === 'pro' ? 0 : 1 - K.stay + (t.mood < 50 ? (50 - t.mood) / 150 : 0) + (ratio > 1.15 ? 0.12 : 0);
    if (s.year > t.since && chance(leave)) {
      dropTenant(s, a, t);
      const dep = Math.round(t.rent / 6), owed = t.owed || 0;
      log(s, `📦 ${tenantName(t)} moved out of your ${a.name}${owed > dep ? `, still owing you ${fmtMoney(owed - dep)}` : ''}.`);
      continue;
    }
    // The lease renews at the asking rent, as far as the law allows.
    if (s.year > t.since) {
      const cap = law === 'strong' ? 0.03 : law === 'medium' ? 0.08 : 0.25;
      t.rent = ask > t.rent ? Math.min(ask, Math.round(t.rent * (1 + cap))) : ask;
    }
    if (t.owed >= t.rent * 0.5 && !t.plan && budget.n > 0 && !a.mgr) { budget.n--; latePopup(s, a, t); }
    else if (a.mgr && t.owed >= t.rent && law !== 'strong' && !t.evict) { t.evict = { year: s.year, why: 'arrears' }; M(s).money -= price(s, 1500); log(s, `📜 Your property manager filed to evict ${tenantName(t)}, who owes ${fmtMoney(t.owed)}.`); }
  }
  // Something breaks.
  const live = tenantsOf(s, a);
  if (live.length && chance(0.12 + (100 - a.cond) / 450 + 0.025 * (live.length - 1) + (a.patch ? 0.3 : 0))) {
    a.patch = false;
    const R = pick(PROPERTY_REPAIRS), cost = price(s, R.cost * (unitsOf(a) > 2 ? 1.5 : 1) * (remote && !a.mgr ? 1.3 : 1)), t = pick(live);
    if (a.mgr || budget.n <= 0) { M(s).money -= cost; t.mood = clamp100(t.mood + 4); t.withhold = false; log(s, `${R.emoji} ${R.name} at your ${a.name}. ${a.mgr ? 'Your property manager' : 'You'} had it fixed for ${fmtMoney(cost)}.`); }
    else {
      budget.n--;
      popup(s, {
        emoji: R.emoji, title: `Repair request: ${a.name}`, handler: 'tnRepair', ctx: { aid: a.id, tid: t.id, cost, what: R.name },
        text: `${R.name}. ${tenantName(t)} needs it fixed${remote ? `, and you're in ${P(s).city}` : ''}.`,
        choices: [{ label: 'Fix it properly', value: 'fix', sub: fmtMoney(cost) }, { label: 'Cheap patch job', value: 'patch', sub: fmtMoney(Math.round(cost * 0.4)) }, { label: 'Ignore it', value: 'ignore', tone: 'bad' }],
      });
    }
  }
  if (a.rentedOut && a.mgr && freeUnits(s, a) > 0) {
    const names = managerFill(s, a);
    if (names.length) log(s, `🗝️ Your property manager found ${nOf(names.length, 'new tenant')} for the ${a.name}: ${listJoin(names)}.`);
  }
}
function latePopup(s, a, t) {
  popup(s, {
    emoji: '🧾', title: 'Late rent', handler: 'tnLate', ctx: { aid: a.id, tid: t.id },
    text: `${tenantName(t)} owes you ${fmtMoney(t.owed)} in back rent on your ${a.name}.`,
    choices: [{ label: 'Give them more time', value: 'time' }, { label: 'Set up a payment plan', value: 'plan' }, { label: 'Start an eviction', value: 'evict', tone: 'bad', sub: fmtMoney(evictFee(s, a)) }, { label: 'Forgive the debt', value: 'forgive' }],
  });
}
onChoice('tnLate', (s, ctx, v) => {
  const f = findTenant(s, ctx.aid, ctx.tid);
  if (!f || !f.t) return;
  const { a, t } = f;
  if (v === 'time') {
    t.mood = clamp100(t.mood + 8);
    if (t.kind !== 'pro' && chance(t.kind === 'late' ? 0.5 : 0.65)) { const amt = t.owed; t.owed = 0; add(s, { money: amt }); return { text: `${t.first} caught up a few months later and paid all ${fmtMoney(amt)}.`, tone: 'good' }; }
    return `${t.first} thanked you. You're still waiting on the money.`;
  }
  if (v === 'plan') { t.plan = true; t.mood = clamp100(t.mood + 5); return `${t.first} agreed to pay off what they owe a little at a time.`; }
  if (v === 'forgive') { t.owed = 0; t.mood = clamp100(t.mood + 20); add(s, { karma: 3 }); return `You wiped ${t.first}'s debt. They cried a little on the phone.`; }
  return startEviction(s, a, t);
});
onChoice('tnRepair', (s, ctx, v) => {
  const f = findTenant(s, ctx.aid, ctx.tid);
  if (!f || !f.t) return;
  const { a, t } = f;
  if (v === 'fix') { M(s).money -= ctx.cost; t.mood = clamp100(t.mood + 6); t.withhold = false; a.cond = clamp(a.cond + 3, 0, 100); return `Fixed. ${t.first} sent a thumbs-up.`; }
  if (v === 'patch') { M(s).money -= Math.round(ctx.cost * 0.4); a.patch = chance(0.5); t.mood = clamp100(t.mood - 2); return `Your handyman cousin patched it with ${pick(['duct tape', 'a lot of caulk', 'optimism', 'zip ties'])}. ${a.patch ? 'It will not last.' : 'Somehow, it held.'}`; }
  t.mood = clamp100(t.mood - 20);
  tally(s, 'ignoredRepairs');
  const r = rand();
  if (r < 0.3) { t.withhold = true; return { text: `${t.first} stopped paying rent until it's fixed.`, tone: 'bad' }; }
  if (r < 0.45) { const fine = price(s, 2000); M(s).money -= fine + ctx.cost; t.withhold = false; return { text: `${t.first} called the housing inspector. You paid a ${fmtMoney(fine)} fine and fixed it anyway.`, tone: 'bad' }; }
  if (r < 0.53 && !count(s, 'tnSued')) { bump(s, 'tnSued'); getSued(s, 'tenancy', { vs: tenantName(t), cap: t.last, their: randInt(4, 10) }, { why: `over ${ctx.what.toLowerCase().replace(/^the /, 'the ')} you never fixed` }); return { text: `${t.first} is taking you to court.`, quiet: true }; }
  return { text: `${t.first} is not happy about it.`, tone: 'bad' };
});
function evictFee(s, a) { const law = tenantLaw(assetCC(s, a)); return price(s, law === 'strong' ? 2500 : law === 'medium' ? 1800 : 1200); }
function startEviction(s, a, t) {
  const fee = evictFee(s, a);
  if (!pay(s, fee)) return cantAfford(fee);
  const why = (t.owed || 0) > 0 ? 'arrears' : 'nocause';
  t.evict = { year: s.year, why };
  if (why === 'nocause') add(s, { karma: t.kind === 'family' ? -8 : t.kind === 'model' ? -5 : -2 });
  else add(s, { karma: -1 });
  return `You filed to evict ${tenantName(t)}. The case will be heard next year.`;
}

const ownedHouse = (s, id) => free(s) && !!myAsset(s, id) && myAsset(s, id).kind === 'house';
defAction({
  id: 'll_find', cat: 'asset', target: 'asset', label: 'Find a tenant', emoji: '🗝️',
  when: (s, id) => ownedHouse(s, id) && myAsset(s, id).rentedOut && freeUnits(s, myAsset(s, id)) > 0 && count(s, 'llFind_' + id) < 3,
  sub: (s, id) => `${nOf(freeUnits(s, myAsset(s, id)), 'empty unit')} · asking ${fmtMoney(askingRent(s, myAsset(s, id)))}/yr`,
  run: (s, id) => { bump(s, 'llFind_' + id); screenTenants(s, myAsset(s, id), false); },
});
defAction({
  id: 'll_mgr_fill', cat: 'asset', target: 'asset', label: 'Have manager fill vacancies', emoji: '📋',
  when: (s, id) => ownedHouse(s, id) && myAsset(s, id).rentedOut && myAsset(s, id).mgr && freeUnits(s, myAsset(s, id)) > 0,
  sub: (s, id) => `${nOf(freeUnits(s, myAsset(s, id)), 'empty unit')} available`,
  run: (s, id) => {
    const a = myAsset(s, id);
    const names = managerFill(s, a);
    return { text: names.length ? `Your property manager leased ${nOf(names.length, 'vacant unit')} in your ${a.name}: ${listJoin(names)}.` : 'Your manager is screening applicants; check back soon.', emoji: '🗝️', tone: 'good' };
  },
});
defAction({
  id: 'll_rentlvl', cat: 'asset', target: 'asset', label: 'Set the rent', emoji: '🏷️',
  when: (s, id) => ownedHouse(s, id) && myAsset(s, id).rentedOut,
  sub: (s, id) => {
    const a = myAsset(s, id);
    const label = a.customRent ? 'Custom' : (RENT_LEVELS[a.rentLvl || 'market'] ? RENT_LEVELS[a.rentLvl || 'market'].name : 'Market');
    return `${label} · ${fmtMoney(askingRent(s, a))}/yr (~${fmtMoney(Math.round(askingRent(s, a) / 12))}/mo)${unitsOf(a) > 1 ? ' a unit' : ''}`;
  },
  run: (s, id) => {
    const a = myAsset(s, id), m = marketRent(s, a);
    const choices = [
      { label: 'Enter custom rent amount...', value: 'custom', sub: 'Specify any exact yearly or monthly dollar amount' },
      { label: `Market rate (${fmtMoney(m)}/yr ~${fmtMoney(Math.round(m / 12))}/mo)`, value: 'market', sub: 'The standard going rate in this neighborhood' },
      { label: `Below market (${fmtMoney(nicePrice(m * 0.85))}/yr ~${fmtMoney(Math.round(m * 0.85 / 12))}/mo)`, value: 'low', sub: 'Happy, loyal tenants who stay long-term' },
      { label: `Above market (${fmtMoney(nicePrice(m * 1.2))}/yr ~${fmtMoney(Math.round(m * 1.2 / 12))}/mo)`, value: 'high', sub: 'Higher profit; more vacancies and tenant complaints' },
      { label: `Luxury premium (${fmtMoney(nicePrice(m * 1.35))}/yr ~${fmtMoney(Math.round(m * 1.35 / 12))}/mo)`, value: 'luxury', sub: 'Best for renovated homes with high-end amenities' },
    ];
    popup(s, {
      emoji: '🏷️', title: 'Set the rent', handler: 'llRentLvl', ctx: { id },
      text: `Current rent: ${fmtMoney(askingRent(s, a))}/yr (~${fmtMoney(Math.round(askingRent(s, a) / 12))}/mo). Neighborhood market rate: ~${fmtMoney(m)}/yr.`,
      choices,
    });
  },
});
onChoice('llRentLvl', (s, ctx, k) => {
  const a = myAsset(s, ctx.id), m = marketRent(s, a);
  if (!a || !k) return;
  if (k === 'custom') {
    popup(s, {
      emoji: '🏷️', title: `Rent for ${a.name}`,
      text: `Market rate is ${fmtMoney(m)}/yr (~${fmtMoney(Math.round(m / 12))}/month). Enter the exact rent you wish to charge (yearly or monthly):`,
      handler: 'llCustomRentInput', ctx: { id: ctx.id },
      input: { label: 'e.g. 1500/mo or 18000', value: String(askingRent(s, a)), max: 20 },
      choices: [{ label: 'Set Rent' }, { label: 'Cancel', value: null }],
    });
    return;
  }
  a.customRent = null;
  if (k === 'luxury') { a.customRent = nicePrice(m * 1.35); a.rentLvl = 'high'; }
  else if (RENT_LEVELS[k]) a.rentLvl = k;
  return { text: `The asking rent for your ${a.name} is now ${fmtMoney(askingRent(s, a))} a year (~${fmtMoney(Math.round(askingRent(s, a) / 12))}/mo).`, quiet: true };
});
onChoice('llCustomRentInput', (s, ctx, v, input) => {
  const a = myAsset(s, ctx.id);
  if (!a || !input) return;
  const isMonthly = /mo|month/i.test(input);
  const num = parseFloat(input.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(num) || num <= 0) return { text: 'Enter a valid rent amount.', nolog: true };
  const yearly = isMonthly || num < 7000 ? Math.round(num * 12) : Math.round(num);
  a.customRent = Math.max(100, yearly);
  a.rentLvl = 'market';
  return { text: `The asking rent for your ${a.name} is set to ${fmtMoney(a.customRent)} a year (~${fmtMoney(Math.round(a.customRent / 12))}/month).`, quiet: true };
});
defAction({
  id: 'll_mgr', cat: 'asset', target: 'asset', emoji: '📋',
  label: (s, id) => (myAsset(s, id).mgr ? 'Fire your property manager' : 'Hire a property manager'),
  sub: (s, id) => (myAsset(s, id).mgr ? 'They take 8% of the rent' : 'They take 8% and handle everything'),
  when: (s, id) => ownedHouse(s, id) && myAsset(s, id).rentedOut,
  run: (s, id) => {
    const a = myAsset(s, id);
    if (a.mgr) { a.mgr = false; return `You fired your property manager. The ${a.name} is all yours again, leaky faucets and all.`; }
    a.mgr = true;
    const names = managerFill(s, a);
    return `You hired ${pick(EMPLOYER_ROOTS)} Property Management to run your ${a.name}.${names.length ? ` They already found ${nOf(names.length, 'tenant')}: ${listJoin(names)}.` : ''}`;
  },
});
defAction({
  id: 'll_evict', cat: 'asset', target: 'asset', label: 'Evict a tenant', emoji: '📜',
  when: (s, id) => ownedHouse(s, id) && tenantsOf(s, myAsset(s, id)).some((t) => !t.evict),
  run: (s, id) => {
    const a = myAsset(s, id);
    popup(s, {
      emoji: '📜', title: 'Evict who?', handler: 'tnEvictPick', ctx: { aid: id },
      choices: a.tenants.filter((t) => !t.evict).map((t) => ({ label: tenantName(t), value: t.id, sub: t.owed > 0 ? `Owes ${fmtMoney(t.owed)}` : 'Paid up' })).concat([{ label: 'Never mind', value: null }]),
    });
  },
});
onChoice('tnEvictPick', (s, ctx, tid) => {
  const f = tid && findTenant(s, ctx.aid, tid);
  if (!f || !f.t) return;
  const { a, t } = f, law = tenantLaw(assetCC(s, a)), keys = Math.round(t.rent * randFloat(0.3, 0.6) * (law === 'strong' ? 1.5 : 1));
  popup(s, {
    emoji: '📜', title: `Evicting ${t.first}`, handler: 'tnEvict', ctx: { aid: a.id, tid, keys },
    text: t.owed > 0 ? `${t.first} owes you ${fmtMoney(t.owed)}. The court will probably side with you.` : `${t.first} is paid up. ${law === 'strong' ? `Courts in ${COUNTRIES[assetCC(s, a)].name} almost never evict a tenant who pays.` : 'Evicting someone who pays needs a good reason, and a sympathetic judge.'}`,
    choices: [{ label: 'File for eviction', value: 'court', sub: fmtMoney(evictFee(s, a)) }, { label: 'Pay them to leave', value: 'keys', sub: fmtMoney(keys) }, { label: 'Never mind', value: null }],
  });
});
onChoice('tnEvict', (s, ctx, v) => {
  const f = v && findTenant(s, ctx.aid, ctx.tid);
  if (!f || !f.t) return;
  const { a, t } = f;
  if (v === 'court') return startEviction(s, a, t);
  if (!pay(s, ctx.keys)) return cantAfford(ctx.keys);
  if (!chance(t.kind === 'pro' ? 0.5 : 0.88)) return { text: `${t.first} took your ${fmtMoney(ctx.keys)}, thanked you, and stayed.`, tone: 'bad' };
  dropTenant(s, a, t);
  return `${t.first} took the ${fmtMoney(ctx.keys)} and moved out of your ${a.name}.`;
});

/* ---- the year --------------------------------------------------------------- */
function cityTick(s) {
  notePlace(s);
  const me = P(s), budget = { n: 2 };
  cityMarketYear(s, me.country, me.city);
  for (const a of M(s).assets) if (a.kind === 'house') cityMarketYear(s, assetCC(s, a), assetCity(s, a));
  renterYear(s, budget);
  for (const a of M(s).assets.slice()) if (a.kind === 'house' && (a.rentedOut || (a.tenants && a.tenants.length))) propertyYear(s, a, budget);
  // Where you live colors your days.
  if (A(s) >= 5 && free(s) && M(s).housing.type !== 'homeless') {
    const tier = myHoodTier(s);
    if (tier.happy && chance(0.5)) add(s, { happy: Math.sign(tier.happy) });
  }
}

/* ---- events: the city -------------------------------------------------------- */
const big = (s) => ['metro', 'big'].includes(citySize(s));
const settled = (s) => A(s) >= 18 && free(s) && ['rent', 'own'].includes(M(s).housing.type);
EV('cty_commute', {
  ages: [20, 65], emoji: '🚇', when: (s) => big(s) && !!M(s).career && free(s), text: (s) => `Your commute across ${P(s).city} takes {an hour|ninety minutes|an hour and a half} each way.`,
  choices: [
    ['Use it to listen to audiobooks', (s) => { add(s, { smarts: 1 }); return 'You finished eleven books this year. Your commute is now your favorite part of the day. Almost.'; }],
    ['Start biking to work', (s) => { addSkill(s, 'fitness', 3); if (chance(0.06)) { getSick(s, 'broken_arm'); return 'A delivery van opened its door right in front of you.'; } return 'Your legs are made of steel now. Your shirts are made of sweat.'; }],
    ['Complain about it to everyone', (s) => { add(s, { happy: -2 }); return 'Everyone has heard about the commute. Twice.'; }],
  ],
});
EV('cty_subway', {
  ages: [12, 85], emoji: '🚇', when: (s) => citySize(s) === 'metro' && free(s), text: 'Your train got stuck in a tunnel for an hour.',
  choices: [
    ['Talk to the stranger next to you', (s) => { if (A(s) >= 16 && chance(0.5)) { const p = meetSomeone(s, 'friend', randInt(45, 65)); return { text: `You and ${p.first} bonded over how awful this is. You're friends now.`, person: p.id }; } return 'They put their headphones back in.'; }],
    ['Lead the car in a sing-along', (s) => { addSkill(s, 'charisma', 2); add(s, { happy: 3 }); return 'Forty strangers sang together in the dark. Someone filmed it.'; }],
    ['Stare at your phone with no signal', () => 'You read the same three cached messages until the lights came back.'],
  ],
});
EV('cty_star_sighting', {
  ages: [10, 90], emoji: '🤩', when: (s) => hereInfo(s).hubs.includes('fame') && free(s), text: (s) => `You spotted a famous actor buying coffee in ${P(s).city}.`,
  choices: [
    ['Ask for a selfie', (s) => (chance(0.6) ? { text: 'They said yes and even smiled. Best day of your life.', tone: 'good' } : 'Their bodyguard said no with his eyes.')],
    ['Play it cool', (s) => { add(s, { happy: 1 }); return 'You nodded. They nodded. Two cool people, nodding.'; }],
    ['Pitch them your screenplay', (s) => { if (skill(s, 'writing') >= 40 && chance(0.2)) { M(s).fame = clamp100(M(s).fame + 4); return { text: 'They actually read the first page and passed it to their agent!', tone: 'good' }; } return 'They took it, very politely, and dropped it in the trash outside.'; }],
  ],
});
EV('cty_gossip', {
  ages: [14, 95], emoji: '🗣️', when: (s) => citySize(s) === 'small' && free(s), text: (s) => `Everyone in ${P(s).city} already knows about your {new haircut|last breakup|parking ticket|new job} before you've told a soul.`,
  auto: () => 'Small-town life: nothing is a secret for more than a day.',
});
EV('cty_fair', {
  ages: [6, 90], emoji: '🎡', when: (s) => ['small', 'mid'].includes(citySize(s)) && free(s), text: (s) => `The ${P(s).city} summer fair is in town.`,
  choices: [
    ['Enter the pie contest', (s) => { if (chance(0.25)) { add(s, { happy: 6 }); return { text: 'Your pie won a blue ribbon. The other bakers will never forgive you.', tone: 'good' }; } return 'Your pie came fourth, behind a pie made of what we think was rhubarb.'; }],
    ['Ride everything twice', (s) => { add(s, { happy: 4 }); if (chance(0.15)) { add(s, { health: -2 }); return 'You rode the Spinner after a corn dog. A mistake.'; } return 'Funnel cake, a Ferris wheel and a sunburn. Perfect.'; }],
    ['Try to win a giant stuffed bear', (s) => { const c = price(s, 40); M(s).money -= c; return chance(0.3) ? 'You won the bear. It now takes up an entire chair.' : `You spent ${fmtMoney(c)} and won a keychain.`; }],
  ],
});
EV('cty_one_store', {
  ages: [18, 80], emoji: '🛒', when: (s) => citySize(s) === 'small' && free(s), ctx: (s) => someone(s, ['ex']), text: (s, c) => `You ran into your ex, ${nm(s, c.pid)}, at the only grocery store in town. Again.`,
  choices: [
    ['Make small talk', (s, c) => { addRel(s, c.pid, 4); return 'You talked about the weather and the price of eggs. It was fine.'; }],
    ['Hide behind the cereal', (s) => { add(s, { happy: -1 }); return 'They saw you. Everyone saw you.'; }],
    ['Start shopping one town over', (s) => { M(s).money -= price(s, 200); return 'The forty-minute drive is worth it. You tell yourself.'; }],
  ],
});
EV('cty_flood', {
  ages: [18, 100], emoji: '🌊', w: 0.5, when: (s) => cityHas(s, 'coast') && settled(s), text: (s) => `A storm surge flooded the streets of ${P(s).city}.`,
  auto: (s) => {
    if (M(s).housing.type === 'rent') { const ll = landlordOf(s); return chance(LANDLORD_STYLES[ll.style].fix) ? `Your place took on water, and ${llShort(ll)} had the floors redone.` : `Your place took on water. ${llShort(ll)} sent a bucket emoji.`; }
    const h = residence(s);
    if (!h) return 'Your street was a river for two days.';
    if (myHoodTier(s).id === 'upscale' || chance(0.4)) return `Your ${h.name} stayed dry. Your neighbors were less lucky.`;
    const c = Math.round(h.value * 0.02); M(s).money -= c; h.cond = clamp(h.cond - 8, 0, 100); return `Your ${h.name} flooded. Repairs cost ${fmtMoney(c)}.`;
  },
});
EV('cty_beach_cleanup', {
  ages: [10, 85], emoji: '🏖️', when: (s) => cityHas(s, 'beach') && free(s), text: (s) => `A group is cleaning up the beaches of ${P(s).city} this weekend.`,
  choices: [
    ['Join them', (s) => { add(s, { karma: 3, happy: 2 }); return pick(['You picked up 300 bottle caps and a shopping cart.', 'You found a message in a bottle. It said "hi."', 'You made friends with a crab. Briefly.']); }],
    ['Go surfing instead', (s) => { addSkill(s, 'fitness', 2); add(s, { happy: 2 }); return 'You caught three waves and swallowed half the ocean.'; }],
  ],
});
EV('cty_protest', {
  ages: [14, 90], emoji: '📣', when: (s) => cityHas(s, 'capital') && free(s), text: (s) => `A huge march is passing through ${P(s).city} on its way to the parliament.`,
  choices: [
    ['Join the march', (s) => { add(s, { karma: 2, happy: 2 }); if (chance(0.1)) { M(s).fame = clamp100(M(s).fame + 2); return 'Your homemade sign made the evening news.'; } return 'You marched for hours and lost your voice chanting.'; }],
    ['Watch from a café', () => 'You had an excellent croissant and a front-row view of history.'],
    ['Get stuck in the traffic it caused', (s) => { add(s, { happy: -2 }); return 'Three hours to go two kilometers.'; }],
  ],
});
EV('cty_motorcade', { ages: [10, 95], emoji: '🚔', when: (s) => cityHas(s, 'capital') && free(s), text: (s) => `A government motorcade shut down your whole street in ${P(s).city}.`, auto: () => 'Twelve black cars, forty minutes of waiting, and one wave from a tinted window.' });
EV('cty_tourists', {
  ages: [12, 90], emoji: '🗺️', when: (s) => cityHas(s, 'tourist') && free(s), text: 'A group of lost tourists asked you for directions.',
  choices: [
    ['Walk them there yourself', (s) => { add(s, { karma: 3 }); return 'They insisted on a photo with you. You are in an album somewhere now.'; }],
    ['Offer a tour, for a fee', (s) => { const amt = price(s, randInt(40, 150)); add(s, { money: amt }); addSkill(s, 'charisma', 1); return `You gave a very creative history tour and made ${fmtMoney(amt)}.`; }],
    ['Pretend you don’t speak the language', (s) => { add(s, { karma: -1 }); return 'It worked, until they switched languages.'; }],
  ],
});
EV('cty_short_term', {
  ages: [21, 80], emoji: '🧳', when: (s) => cityHas(s, 'tourist') && free(s) && !!residence(s) && freeUnits(s, residence(s)) === 0 && !residence(s).tenants.length, text: (s) => `Vacation rentals are booming in ${P(s).city}. Your neighbor makes a fortune renting out their spare room.`,
  choices: [
    ['Rent out your spare room to tourists', (s) => { const amt = price(s, randInt(3000, 9000) * hereInfo(s).col); add(s, { money: amt, happy: -1 }); if (chance(0.2)) { residence(s).cond = clamp(residence(s).cond - 6, 0, 100); return `You made ${fmtMoney(amt)}. One group threw a party and broke a window.`; } return `You made ${fmtMoney(amt)} and learned more about strangers than you wanted to.`; }],
    ['No strangers in my home', () => 'You like your spare room full of boxes, thank you.'],
  ],
});
EV('cty_startup', {
  ages: [21, 60], emoji: '🚀', when: (s) => hereInfo(s).hubs.includes('tech') && free(s) && (skill(s, 'coding') >= 30 || (!!M(s).career && ['tech', 'business'].includes(JOBS[M(s).career.id].cat))), text: (s) => `A startup recruiter cornered you at a party in ${P(s).city}.`,
  choices: [
    ['Hear them out', (s) => {
      const c = M(s).career;
      if (c && JOBS[c.id].cat === 'tech' && chance(0.5)) { c.salary = Math.round(c.salary * 1.15); return { text: `You used their offer to get a 15% raise at work. Your salary is ${fmtMoney(c.salary)} now.`, tone: 'good' }; }
      if (chance(0.3)) { add(s, { money: price(s, 5000) }); return 'You did a little consulting for them on the side and made some money.'; }
      return 'Their app is "like a dating app, but for sandwiches." You said you would think about it.';
    }],
    ['Not interested', () => 'You escaped to the snack table.'],
  ],
});
EV('cty_students', {
  ages: [22, 85], emoji: '🎓', when: (s) => cityHas(s, 'college') && settled(s) && !inSchool(s), text: 'College students moved in next door and threw a party on their first night.',
  choices: [
    ['Ask them to keep it down', (s) => (chance(0.6) ? 'They apologized and invited you next time.' : 'They turned it up and played a song about you.')],
    ['Join the party', (s) => { add(s, { happy: 3, health: -1 }); return A(s) > 35 ? 'You were the oldest person there by fifteen years. It was great.' : 'You played a drinking game you did not understand and won.'; }],
    ['Buy earplugs', (s) => { M(s).money -= price(s, 20); return 'The earplugs did not help. Nothing could have helped.'; }],
  ],
});
EV('cty_finals', {
  ages: [8, 90], emoji: '🏟️', when: (s) => hereInfo(s).hubs.includes('sports') && free(s), text: (s) => `The whole city has gone wild: ${P(s).city}'s team made the finals.`,
  choices: [
    { label: 'Buy tickets', sub: (s) => fmtMoney(price(s, 400)), fx: (s) => { const c = price(s, 400); if (!pay(s, c)) return cantAfford(c); add(s, { happy: chance(0.5) ? 8 : -2 }); return chance(0.5) ? 'They won! You hugged at least nine strangers.' : 'They lost in overtime. The ride home was silent.'; } },
    ['Watch with friends at a bar', (s) => { relAll(s, K_FRIENDS, 3); add(s, { happy: 3 }); return 'You screamed until you lost your voice.'; }],
    ['Ignore it completely', () => 'You had the best night of your life at an empty grocery store.'],
  ],
});
EV('cty_factory', {
  ages: [18, 90], emoji: '🏭', w: 0.6, when: (s) => cityHas(s, 'industrial') && free(s), text: (s) => `The biggest factory in ${P(s).city} announced it's closing.`,
  auto: (s) => {
    hereState(s).idx = Math.max(0.7, hereState(s).idx * 0.95);
    const h = residence(s);
    if (h) { h.value = Math.round(h.value * 0.95); return `Home prices dipped. Your ${h.name} lost a little value.`; }
    return 'Half your neighbors are job hunting now.';
  },
});
EV('cty_gentrify', {
  ages: [18, 90], emoji: '☕', when: (s) => big(s) && settled(s) && myHood(s) !== null && myHoodTier(s).id !== 'upscale' && myHoodTier(s).id !== 'trendy', text: (s) => `A third fancy coffee shop just opened on your block in ${myHoodName(s)}.`,
  auto: (s) => {
    const st = hereState(s), i = myHood(s);
    st.tiers[i] = Math.min(3, (st.tiers[i] ?? i) + 1);
    const h = residence(s);
    if (h) { h.value = Math.round(h.value * 1.12); return `${myHoodName(s)} is "up and coming" now. Your ${h.name} is worth 12% more.`; }
    if (M(s).housing.type === 'rent') { M(s).housing.bump = 0.08; return `${myHoodName(s)} is "up and coming" now. Your landlord noticed too.`; }
    return `${myHoodName(s)} is "up and coming" now.`;
  },
});
EV('cty_transit', {
  ages: [18, 95], emoji: '🚇', w: 0.6, when: (s) => big(s) && settled(s), text: (s) => `${P(s).city} is building a new train line with a stop right by ${myHoodName(s)}.`,
  auto: (s) => {
    const h = residence(s);
    if (h) { h.value = Math.round(h.value * 1.06); return `Your ${h.name} gained value overnight.`; }
    if (M(s).housing.type === 'rent') { M(s).housing.bump = (M(s).housing.bump || 0) + 0.04; return 'Your commute will be shorter. Your rent will be longer.'; }
    return 'Construction starts next year. And never ends.';
  },
});
EV('cty_crime', {
  ages: [16, 90], emoji: '🚨', when: settled, w: (s) => myHoodTier(s).crime * 10, text: (s) => `Someone {broke into your car|stole three packages off your doorstep|smashed your window|swiped your bike} in ${myHoodName(s)}.`,
  choices: [
    ['Report it to the police', (s) => { M(s).money -= price(s, randInt(100, 600)); return chance(0.1) ? 'They caught the guy! He had forty bikes.' : 'The officer gave you a case number and a shrug.'; }],
    ['Start a neighborhood watch', (s) => { add(s, { karma: 2 }); if (chance(0.4)) { const p = meetSomeone(s, 'friend', randInt(45, 65)); return { text: `Your neighbor ${p.first} joined, and now you patrol together in matching vests.`, person: p.id }; } return 'Three people came to the first meeting. Two were there for the snacks.'; }],
    ['Install a camera doorbell', (s) => { M(s).money -= price(s, 200); return 'You now spend your evenings watching raccoons on your phone.'; }],
  ],
});
EV('cty_welcome', {
  ages: [18, 90], emoji: '🍰', when: (s) => settled(s) && (M(s).housing.since >= s.year - 1 || (residence(s) && residence(s).since >= s.year - 1)), text: (s) => `Your new neighbor in ${myHoodName(s)} came by with {banana bread|a casserole|a small cactus|homemade cookies}.`,
  choices: [
    ['Invite them in', (s) => { const p = meetSomeone(s, 'friend', randInt(50, 70)); return { text: `${p.first} stayed for two hours and told you everything about everyone on the street.`, person: p.id }; }],
    ['Thank them at the door', () => 'You waved from the doorway. They waved back. Neighbors.'],
  ],
});
EV('cty_nightlife', {
  ages: [18, 45], emoji: '🕺', when: (s) => cityHas(s, 'party') && free(s), text: (s) => `${P(s).city}'s nightlife lives up to the hype.`,
  choices: [
    ['Stay out until sunrise', (s) => { add(s, { happy: 5, health: -2 }); M(s).money -= price(s, 150); if (chance(0.25) && !hasRomance(s)) { const p = meetSomeone(s, 'friend', randInt(50, 70)); return { text: `You danced until 6 a.m. and left with a new friend, ${p.first}.`, person: p.id }; } return 'You saw the sun come up from a rooftop and regretted nothing.'; }],
    ['Early night', () => 'You were in bed by ten. The city partied without you.'],
  ],
});
EV('cty_hometown', {
  ages: [30, 70], emoji: '🏡', once: true, when: (s) => free(s) && places(s).length === 1, text: (s) => `You've lived in ${P(s).city} your whole life. A friend asks if you ever think about leaving.`,
  choices: [
    ['Daydream about the big city', (s) => { add(s, { happy: -1 }); return 'You spent the evening looking at apartment listings in places you have never been.'; }],
    ['This is home', (s) => { add(s, { happy: 3 }); return 'You know every street and every face. That is worth something.'; }],
  ],
});
EV('cty_council', {
  ages: [21, 95], emoji: '🏛️', when: (s) => free(s) && !!residence(s), text: (s) => `The ${P(s).city} city council wants to build {a stadium|a shopping mall|a big apartment complex|a highway ramp} right next to ${myHoodName(s)}.`,
  choices: [
    ['Fight it at the town meeting', (s) => { addSkill(s, 'charisma', 2); if (chance(0.35 + skill(s, 'charisma') / 250)) { add(s, { happy: 4 }); return { text: 'Your speech turned the room. The plan was scrapped.', tone: 'good' }; } const h = residence(s); h.value = Math.round(h.value * 0.96); return 'The council voted it through anyway. Construction starts in spring.'; }],
    ['Support it', (s) => { const h = residence(s); h.value = Math.round(h.value * 1.04); return 'It brought new shops and higher prices. Your home is worth a bit more.'; }],
    ['Stay out of it', () => 'You let the neighbors yell at each other without you.'],
  ],
});

/* ---- events: your landlord ----------------------------------------------------- */
const withLL = (s) => renting(s) && llKnown(s) && !!landlordOf(s);
EV('ll_walkin', {
  ages: [18, 90], emoji: '🚪', when: (s) => withLL(s) && !landlordOf(s).corp, text: (s) => `${llShort(landlordOf(s))} let themselves into your place without warning "to check the smoke detector."`,
  choices: [
    ['Tell them that’s not okay', (s) => { const ll = landlordOf(s); ll.mood = clamp100(ll.mood - 6); return chance(0.6) ? 'They apologized and promised to text first. They did, once.' : 'They said "it’s my property" and left.'; }],
    ['Change the locks', (s) => { const ll = landlordOf(s); M(s).money -= price(s, 150); ll.mood = clamp100(ll.mood - 15); return 'New locks. Your landlord found out within a day and was not pleased.'; }],
    ['Let it go', (s) => { add(s, { happy: -2 }); return 'You now check for footprints every time you come home.'; }],
  ],
});
EV('ll_cookies', { ages: [18, 90], emoji: '🍪', when: (s) => withLL(s) && ['kind', 'family'].includes(landlordOf(s).style), text: (s) => `${llShort(landlordOf(s))} left a plate of cookies and a note: "Thanks for being a great tenant!"`, auto: (s) => { landlordOf(s).mood = clamp100(landlordOf(s).mood + 5); add(s, { happy: 2 }); return 'They were oatmeal raisin. You ate them anyway.'; } });
EV('ll_strike', {
  ages: [18, 85], emoji: '✊', when: (s) => withLL(s) && landlordOf(s).corp && !M(s).housing.withheld, text: (s) => `Your neighbors are organizing a rent strike against ${landlordOf(s).name}.`,
  choices: [
    ['Join the strike', (s) => {
      const h = M(s).housing, ll = landlordOf(s);
      add(s, { karma: 2 });
      if (chance(0.5)) { h.rent = Math.round(h.rent * 0.95); ll.mood = clamp100(ll.mood - 10); tally(s, 'rentStrikes'); return { text: `${ll.name} caved. Everyone's rent went down 5%.`, tone: 'good' }; }
      if (chance(0.4) && !h.notice) { h.notice = { why: 'revenge', year: s.year }; return { text: `${ll.name} answered with eviction notices for the strike leaders. You're on the list.`, tone: 'bad' }; }
      return 'The strike fizzled out after two months. Nothing changed.';
    }],
    ['Stay out of it', (s) => { add(s, { karma: -1 }); return 'Your neighbors stopped saying hi in the elevator.'; }],
  ],
});
EV('ll_gone', { ages: [18, 90], emoji: '📭', when: (s) => withLL(s) && landlordOf(s).style === 'absent', text: (s) => `Mail for ${llShort(landlordOf(s))} keeps piling up in your hallway.`, auto: () => `Turns out they moved to ${pick(['Portugal', 'a boat', 'a ranch three time zones away', 'a monastery'])} two years ago.` });

/* ---- events: your tenants ------------------------------------------------------ */
// A tenant on one of your properties, as event context: { aid, tid }.
function aTenant(filter) {
  return (s) => {
    const opts = [];
    for (const a of M(s).assets) if (a.kind === 'house' && a.tenants) for (const t of a.tenants) if (!t.evict && s.year > t.since && (!filter || filter(s, a, t))) opts.push({ aid: a.id, tid: t.id });
    return opts.length ? pick(opts) : null;
  };
}
// Event choices act on the tenant only if they still live there.
const withT = (fn) => (s, c) => { const f = findTenant(s, c.aid, c.tid); return f && f.t ? fn(s, f.a, f.t) : { text: 'The moment passed.', quiet: true, nolog: true }; };
const tLabel = (s, c) => { const f = findTenant(s, c.aid, c.tid); return f && f.t ? { t: f.t.first, a: f.a.name } : { t: 'Your tenant', a: 'your place' }; };
EV('tn_thanks', { ages: [18, 100], emoji: '💌', ctx: aTenant((s, a, t) => t.mood >= 70), text: (s, c) => `${tLabel(s, c).t} at your ${tLabel(s, c).a} sent a thank-you card and a potted plant.`, auto: (s) => { add(s, { happy: 2 }); return 'The card said you are "the only landlord who ever answers the phone."'; } });
EV('tn_pet', {
  ages: [18, 100], emoji: '🐕', ctx: aTenant((s, a, t) => !t.pet), text: (s, c) => `${tLabel(s, c).t} wants to get a dog.`,
  choices: [
    ['Sure', withT((s, a, t) => { t.pet = true; t.mood = clamp100(t.mood + 10); return `${t.first} adopted a ${pick(['three-legged beagle', 'very large mutt', 'tiny terrier with opinions', 'golden retriever'])}.`; })],
    ['Yes, for a little extra rent', withT((s, a, t) => { t.pet = true; t.rent = Math.round(t.rent * 1.05); t.mood = clamp100(t.mood - 2); return `Pet rent: ${fmtMoney(t.rent)} a year now.`; })],
    ['No pets', withT((s, a, t) => { t.mood = clamp100(t.mood - 8); return `${t.first} was crushed. You suspect a cat is living there anyway.`; })],
  ],
});
EV('tn_buy', {
  ages: [25, 100], emoji: '🤝', w: 0.5, ctx: aTenant((s, a, t) => unitsOf(a) === 1 && !t.owed && ['model', 'family'].includes(t.kind)), text: (s, c) => `${tLabel(s, c).t} wants to buy your ${tLabel(s, c).a}.`,
  choices: [
    { label: 'Sell it to them', sub: (s, c) => { const f = findTenant(s, c.aid, c.tid); return f && f.a ? 'About ' + fmtMoney(f.a.value) : ''; }, fx: withT((s, a, t) => { const loan = a.loanId ? M(s).loans.find((l) => l.id === a.loanId) : null, gross = Math.round(a.value * randFloat(0.97, 1.06)), owed = loan ? loan.balance : 0; removeAsset(s, a.id); add(s, { money: gross - owed, karma: 2 }); tally(s, 'sales'); return { text: `You sold the ${a.name} to ${t.first} for ${fmtMoney(gross)}. They cried at the closing.`, tone: 'good' }; }) },
    ['It’s not for sale', withT((s, a, t) => { t.mood = clamp100(t.mood - 4); return `${t.first} understood. Mostly.`; })],
  ],
});
EV('tn_noise', {
  ages: [18, 100], emoji: '🔊', ctx: aTenant((s, a, t) => t.kind === 'party'), text: (s, c) => `The neighbors keep calling you about ${tLabel(s, c).t}'s parties.`,
  choices: [
    ['Give them a warning', withT((s, a, t) => (chance(0.5) ? `${t.first} promised to keep it down. They did, for a week.` : `${t.first} invited you to the next one.`))],
    ['Start an eviction', withT((s, a, t) => startEviction(s, a, t))],
    ['Not my problem', (s) => { add(s, { karma: -1 }); M(s).money -= price(s, 300); return 'The city fined you for the noise.'; }],
  ],
});
EV('tn_sublet', {
  ages: [18, 100], emoji: '🧳', ctx: aTenant(), w: (s) => (cityHas(s, 'tourist') ? 1 : 0.4), text: (s, c) => `You found ${tLabel(s, c).a} listed on a vacation-rental site. ${tLabel(s, c).t} has been subletting it to tourists.`,
  choices: [
    ['Demand a cut', withT((s, a, t) => { const amt = Math.round(t.rent * randFloat(0.1, 0.3)); add(s, { money: amt }); t.mood = clamp100(t.mood - 5); return `${t.first} paid you ${fmtMoney(amt)} to keep quiet.`; })],
    ['Tell them to stop', withT((s, a, t) => { t.mood = clamp100(t.mood - 8); return `${t.first} took the listing down. You think.`; })],
    ['Start an eviction', withT((s, a, t) => startEviction(s, a, t))],
  ],
});
EV('tn_handy', {
  ages: [18, 100], emoji: '🔧', ctx: aTenant((s, a, t) => ['model', 'family'].includes(t.kind)), text: (s, c) => `${tLabel(s, c).t} fixed a leaky faucet at your ${tLabel(s, c).a} and sent you the receipt.`,
  choices: [
    ['Pay them back, plus a thank-you', withT((s, a, t) => { M(s).money -= price(s, 120); t.mood = clamp100(t.mood + 8); a.cond = clamp(a.cond + 2, 0, 100); return `${t.first} said you're the best landlord they've ever had.`; })],
    ['Refuse: they didn’t ask first', withT((s, a, t) => { t.mood = clamp100(t.mood - 12); return `${t.first} will not be fixing anything again.`; })],
  ],
});
EV('tn_ghost', {
  ages: [18, 100], emoji: '🌙', ctx: aTenant((s, a, t) => ['late', 'pro'].includes(t.kind) && t.owed > 0), text: (s, c) => `${tLabel(s, c).t} vanished from your ${tLabel(s, c).a} in the middle of the night.`,
  auto: (s, c) => { const f = findTenant(s, c.aid, c.tid); if (!f || !f.t) return ''; const owed = f.t.owed; f.a.cond = clamp(f.a.cond - randInt(3, 10), 0, 100); dropTenant(s, f.a, f.t); return `They left ${fmtMoney(owed)} in unpaid rent and a couch nobody can lift.`; },
});

/* ---- achievements, goals, legacy ---------------------------------------------- */
ACHIEVEMENTS.push(
  { id: 'city_hopper', name: 'City Hopper', emoji: '🚚', desc: 'Live in four different cities in one life.', check: (s) => places(s).length >= 4 },
  { id: 'big_city_dreams', name: 'Big City Dreams', emoji: '🌆', desc: 'Move from a small city to a major one.', check: (s) => LC(s, 'smallToMetro') >= 1 },
  { id: 'landlord', name: 'Landlord', emoji: '🗝️', desc: 'Have five tenants at once.', check: (s) => allTenants(s) >= 5 },
  { id: 'house_hacker', name: 'House Hacker', emoji: '🏘️', desc: 'Live in one unit of a building and rent out the rest.', check: (s) => { const h = residence(s); return !!h && unitsOf(h) > 1 && (h.tenants || []).length === unitsOf(h) - 1; } },
  { id: 'tenant_power', name: 'Tenant Power', emoji: '✊', desc: 'Beat an eviction in housing court.', check: (s) => LC(s, 'evictionsBeaten') >= 1 },
  { id: 'slumlord', name: 'Slumlord', emoji: '🏚️', desc: 'Ignore five repair requests in one life.', check: (s) => LC(s, 'ignoredRepairs') >= 5 },
);
GOALS.push(
  { id: 'g_cities', text: 'Live in three different cities', emoji: '🚚', check: (s) => places(s).length >= 3 },
  { id: 'g_landlord', text: 'Collect rent from three tenants', emoji: '🗝️', check: (s) => allTenants(s) >= 3 },
);
LEGACY_TITLES.splice(LEGACY_TITLES.findIndex((t) => t.id === 'millionaire'), 0, { id: 'baron', name: 'Real Estate Baron', emoji: '🏘️', check: (s) => allTenants(s) >= 10 });
