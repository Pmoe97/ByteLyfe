// Cities verification:  node dev/verify/cities.mjs
//
// Covers 49-cities.js:
//   1. data — every city in COUNTRIES has a profile (size, cost of living, pay, hubs,
//      traits that exist) and four distinct, stable neighborhood names
//   2. money — salaries follow the city's pay; rents and home prices its cost of living
//   3. jobs — tech hubs post more tech jobs than small cities
//   4. moving — your spouse and kids come along, the city is recorded, the job
//      transfers or ends, and the old lease's deposit comes back
//   5. renting — a lease has a landlord; strong tenant laws cap raises at 3%;
//      a notice that runs out puts you on the street
//   6. owning — a duplex holds you plus one tenant, never more; rent is collected;
//      an eviction for unpaid rent clears the unit
//   7. old saves — a home rented out before Cities gets a tenant, a lease gets a landlord
import { loadGame } from './loadgame.mjs';

const ctx = loadGame({ quiet: true });
const g = (name) => ctx.run(name);
ctx.seedRng(4242);
let failures = 0;
const ok = (cond, msg) => { if (!cond) { failures++; console.log('  ✖ ' + msg); } };

const COUNTRIES = g('COUNTRIES'), CITY_INFO = g('CITY_INFO'), JOB_CATS = g('JOB_CATS'), CITY_TRAITS = g('CITY_TRAITS'), CITY_SIZES = g('CITY_SIZES');
const adultLife = (country, city, o = {}) => {
  const s = ctx.createLife({ country, city, year: 2000 });
  s.year = 2030; // 30 years old, no ageUp needed
  s.pending = [];
  Object.assign(s.player, { money: 5e6 }, o);
  return s;
};
// Take an action with nothing queued (the engine won't act while a popup is waiting).
const act = (s, id, t) => { s.pending = []; return ctx.doAction(s, id, t); };
// Answer a popup by its choice value (or the first enabled choice).
const answer = (s, value) => {
  const pp = s.pending[0];
  if (!pp) return false;
  let idx = pp.choices.findIndex((c) => c.value === value);
  if (idx < 0) idx = pp.choices.findIndex((c) => !c.disabled);
  return ctx.resolvePopup(s, pp.id, idx);
};

/* 1. data ------------------------------------------------------------------ */
for (const cc in COUNTRIES) {
  for (const city of COUNTRIES[cc].cities) {
    const info = CITY_INFO[cc] && CITY_INFO[cc][city];
    ok(!!info, `${cc}:${city} has no city profile`);
    if (!info) continue;
    ok(!!CITY_SIZES[info.size], `${city}: unknown size ${info.size}`);
    ok(info.col > 0.4 && info.col < 2.5 && info.wage > 0.6 && info.wage < 1.6, `${city}: odd cost ${info.col} / pay ${info.wage}`);
    for (const h of info.hubs) ok(!!JOB_CATS[h], `${city}: hub "${h}" is not a job category`);
    for (const t of info.traits) ok(!!CITY_TRAITS[t], `${city}: trait "${t}" is not in CITY_TRAITS`);
    const names = ctx.hoodNames(cc, city);
    ok(names.length === 4 && new Set(names).size === 4, `${city}: neighborhoods ${names}`);
    ok(names.join() === ctx.hoodNames(cc, city).join(), `${city}: neighborhoods change between calls`);
  }
  for (const city in CITY_INFO[cc] || {}) ok(COUNTRIES[cc].cities.includes(city), `${cc}: profile for unknown city ${city}`);
}

/* 2. money ------------------------------------------------------------------ */
{
  const ny = adultLife('us', 'New York'), px = adultLife('us', 'Phoenix');
  const sNY = ctx.salaryFor(ny, 'software', 0), sPX = ctx.salaryFor(px, 'software', 0);
  ok(sNY > sPX * 1.25, `New York pay ${sNY} should beat Phoenix ${sPX} by ~37%`);
  const avg = (s, key, f) => { let t = 0; for (let i = 0; i < 30; i++) { s.listings = {}; const l = ctx.listing(s, key); t += l.reduce((n, x) => n + f(x), 0) / l.length; } return t / 30; };
  const rNY = avg(ny, 'rentals', (r) => r.rent), rPX = avg(px, 'rentals', (r) => r.rent);
  ok(rNY > rPX * 1.6, `New York rent ${Math.round(rNY)} should be about twice Phoenix ${Math.round(rPX)}`);
  const hNY = avg(ny, 'houses', (h) => h.value), hPX = avg(px, 'houses', (h) => h.value);
  ok(hNY > hPX * 1.6, `New York homes ${Math.round(hNY)} should cost far more than Phoenix ${Math.round(hPX)}`);
  ok(ctx.livingCost(ny, 22000) > ctx.livingCost(px, 22000), 'living costs follow the city');
}

/* 3. jobs ------------------------------------------------------------------- */
{
  const sea = adultLife('us', 'Seattle'), sligo = adultLife('ie', 'Sligo');
  ok(ctx.jobOpenOdds(sea, 'software') > 0.9, `Seattle should almost always hire developers (${ctx.jobOpenOdds(sea, 'software')})`);
  ok(ctx.jobOpenOdds(sligo, 'software') < 0.5, `Sligo should rarely hire developers (${ctx.jobOpenOdds(sligo, 'software')})`);
}

/* 4. moving ------------------------------------------------------------------ */
{
  const s = adultLife('us', 'Chicago');
  const me = s.people[s.playerId];
  const sp = ctx.makeAdultNear(s, {});
  ctx.setRel(s, sp.id, 'spouse', 80); me.partner = sp.id; sp.partner = me.id; me.married = sp.married = true;
  const kid = ctx.bornChild(s, sp.id, 'Kit', 'f'); kid.birthYear = s.year - 6;
  const fr = ctx.makeAdultNear(s, {}); ctx.setRel(s, fr.id, 'friend', 70);
  s.listings = {};
  act(s, 'find_rental');
  answer(s, s.pending[0].choices[0].value);
  ok(s.player.housing.type === 'rent' && !!s.player.housing.ll, 'renting a place comes with a landlord');
  ctx.hire(s, 'software', 1);
  const before = s.player.money;
  act(s, 'city_move');
  answer(s, 'Seattle');
  ok(s.pending[0] && s.pending[0].handler === 'cityGo', 'choosing a city asks for confirmation');
  answer(s, true);
  ok(me.city === 'Seattle' && sp.city === 'Seattle' && kid.city === 'Seattle', 'you, your spouse and your kid all live in Seattle now');
  ok(s.player.places.includes('us:Chicago') && s.player.places.includes('us:Seattle'), 'both cities are recorded');
  ok(s.player.rels[fr.id].rel < 70, 'friends left behind miss you');
  ok(!s.player.career || s.player.career.salary > 0, 'the job transferred or ended cleanly');
  ok(s.player.money > before - 20000, 'the old deposit came back (moving costs only a few thousand)');
  ok(s.pending.some((p) => p.handler === 'rent'), 'a new city starts with the rentals there');
}

/* 5. renting ----------------------------------------------------------------- */
{
  const s = adultLife('de', 'Berlin');
  s.listings = {};
  act(s, 'find_rental');
  answer(s, s.pending[0].choices[0].value);
  const h = s.player.housing;
  h.since = s.year - 3; h.ll.style = 'greedy';
  let maxRaise = 0;
  for (let i = 0; i < 40; i++) {
    const r0 = h.rent;
    h.notice = null; h.issue = null; s.pending = [];
    ctx.renterYear(s, { n: 5 });
    if (s.pending.some((p) => p.handler === 'llRaise')) answer(s, 'pay');
    if (h.type !== 'rent') break;
    maxRaise = Math.max(maxRaise, h.rent / r0 - 1);
  }
  ok(maxRaise <= 0.031, `German rent raises are capped at 3% (saw ${(maxRaise * 100).toFixed(1)}%)`);
  // A notice that runs out puts you out.
  h.notice = { why: 'sale', year: s.year - 1 }; s.pending = [];
  ctx.renterYear(s, { n: 2 });
  ok(['homeless', 'parents'].includes(s.player.housing.type), 'an expired notice ends the lease');
}

/* 6. owning ------------------------------------------------------------------ */
{
  const s = adultLife('us', 'Denver');
  const a = ctx.makeHouse(s, 'duplex');
  s.player.assets.push(a);
  act(s, 'asset_movein', a.id);
  ok(s.player.housing.assetId === a.id, 'you moved into your duplex');
  act(s, 'asset_rentout', a.id);
  ok(s.pending[0] && s.pending[0].handler === 'tnPick', 'renting it out opens tenant screening');
  const names = s.pending[0].choices.slice(0, 3).map((c) => c.label).join();
  answer(s, 'check');
  ok(s.pending[0] && s.pending[0].choices[0].sub.startsWith('Background check'), 'background checks show the truth');
  ok(s.pending[0].choices.slice(0, 3).map((c) => c.label).join() === names, 'background checks are on the same three applicants');
  answer(s, 0);
  ok(a.tenants.length === 1 && ctx.freeUnits(s, a) === 0, 'a duplex holds you plus one tenant');
  ok(!ctx.actionList(s, 'asset', a.id).some((x) => x.id === 'll_find'), 'no "find a tenant" while every unit is full');
  const t = a.tenants[0];
  t.kind = 'model';
  const roll = ctx.rentRoll(s, a);
  ok(roll && roll[1] === t.rent, `a model tenant pays the full rent (${roll && roll[1]} vs ${t.rent})`);
  t.kind = 'pro'; t.since = s.year - 3;
  ctx.rentRoll(s, a);
  ok(t.owed >= t.rent, 'a professional non-payer stops paying');
  ctx.startEviction(s, a, t);
  ok(t.evict && t.evict.why === 'arrears', 'unpaid rent is grounds for eviction');
  let tries = 0;
  while (a.tenants.includes(t) && tries++ < 30) { t.evict = { year: s.year - 1, why: 'arrears' }; ctx.propertyYear(s, a, { n: 0 }); }
  ok(!a.tenants.includes(t), 'the eviction eventually clears the unit');
  ok(s.player.assets.every((x) => (x.tenants || []).length <= x.units), 'never more tenants than units');
}

/* 7. old saves ----------------------------------------------------------------- */
{
  const s = adultLife('uk', 'Leeds');
  const a = ctx.makeHouse(s, 'house');
  delete a.units; delete a.city; delete a.cc; delete a.hood;
  Object.assign(a, { rentedOut: true, rentIncome: 14000 });
  s.player.assets.push(a);
  const ts = ctx.tenantsOf(s, a);
  ok(ts.length === 1 && ts[0].rent === 14000, 'a pre-Cities rental keeps its income as one tenant');
  ok(ctx.unitsOf(a) === 1 && ctx.assetCity(s, a) === 'Leeds', 'old homes get a unit count and a city');
  s.player.housing = { type: 'rent', assetId: null, rent: 12000, name: 'Flat' };
  ok(!!ctx.landlordOf(s) && s.player.housing.deposit === 2000, 'an old lease gets a landlord and a deposit');
}

/* 8. custom rent & manager fill on foreign moves ------------------------------- */
{
  const s = adultLife('mx', 'Guadalajara');
  const a = ctx.makeHouse(s, 'duplex');
  s.player.assets.push(a);
  act(s, 'asset_movein', a.id);
  act(s, 'asset_rentout', a.id);
  answer(s, 0); // lease unit 2 to first applicant
  ok(a.tenants.length === 1 && ctx.freeUnits(s, a) === 0, 'duplex has tenant in unit 2 and player in unit 1');
  
  // Hire property manager
  act(s, 'll_mgr', a.id);
  ok(a.mgr === true, 'property manager hired');

  // Test custom rent controls
  act(s, 'll_rentlvl', a.id);
  answer(s, 'custom');
  ok(s.pending[0] && s.pending[0].handler === 'llCustomRentInput', 'custom rent input prompt opened');
  ctx.resolvePopup(s, s.pending[0].id, 0, '2250/mo');
  ok(a.customRent === 2250 * 12, `custom monthly rent parsed to yearly (${a.customRent})`);
  ok(ctx.askingRent(s, a) === 27000, 'askingRent reflects custom rent');

  // Emigrate from Guadalajara, MX to Los Angeles, US
  const me = s.people[s.playerId];
  me.country = 'us'; me.city = 'Los Angeles';
  s.player.housing = { type: 'homeless', assetId: null, rent: 0, name: '' };
  ctx.cityArrive(s);
  ok(ctx.freeUnits(s, a) === 1, 'unit previously occupied by player in Guadalajara is now free');
  ok(a.rentedOut === true, 'property remains marked for rentals');

  // Property manager can immediately fill the newly vacated unit remotely!
  act(s, 'll_mgr_fill', a.id);
  ok(a.tenants.length === 2 && ctx.freeUnits(s, a) === 0, 'property manager filled both units of the duplex');
}

/* 9. contractor renovations & interactive features ----------------------------- */
{
  const s = adultLife('us', 'Seattle');
  const a = ctx.makeHouse(s, 'house');
  s.player.assets.push(a);
  act(s, 'asset_movein', a.id);
  
  const v0 = a.value;
  // Build a pool with reputable contractor
  ctx.completeRenovation(s, a, g('RENOVATION_PROJECTS').pool, null, 'flawless', 45000);
  ok(ctx.hasRenovation(a, 'pool'), 'pool renovation is recorded on the house');
  ok(a.value > v0, `flawless pool increased property value from ${v0} to ${a.value}`);

  // Test interactive pool action
  const res = act(s, 'renov_pool', a.id);
  ok(!!res, 'renov_pool action executed successfully');

  // Build solar array and verify upkeep reduction
  const up0 = ctx.assetUpkeep(s, a);
  ctx.completeRenovation(s, a, g('RENOVATION_PROJECTS').solar, null, 'great', 18000);
  ok(ctx.hasRenovation(a, 'solar'), 'solar renovation recorded');
  const up1 = ctx.assetUpkeep(s, a);
  ok(up1 < up0, `solar cut upkeep from ${up0} to ${up1}`);
}

/* 10. custom fine loan payment & family debt payoff ---------------------------- */
{
  const s = adultLife('us', 'Boston');
  const loan = ctx.addLoan(s, { kind: 'car', name: 'Car loan', amount: 15000, rate: 0.07, years: 5 });
  const b0 = loan.balance;
  s.player.money = 20000;

  // Pay exact amount with cents: $250.14
  ctx.payLoanCustom(s, loan.id, '250.14');
  ok(loan.balance === b0 - 250, `loan balance reduced from ${b0} to ${loan.balance} after paying 250.14`);

  // Create a parent with a mortgage and pay it off
  const mom = ctx.makeAdultNear(s, { gender: 'f' });
  ctx.setRel(s, mom.id, 'parent', 60);
  const d = ctx.npcDebt(s, mom);
  ok(d && d.balance > 0, `parent has debt: ${d.name} of ${d.balance}`);
  
  s.player.money = d.balance + 10000;
  act(s, 'p_pay_debt', mom.id);
  answer(s, 'full');
  ok(d.balance === 0, 'parent mortgage is fully paid off');
  ok(ctx.relOf(s, mom.id).rel === 100, 'parent relationship maxed out after paying off mortgage');
}

/* 11. renovations through the real menus ---------------------------------------- */
{
  const s = adultLife('us', 'Seattle');
  const R = g('RENOVATION_PROJECTS');
  // A single-unit home can be offered every project, interiors included.
  const home = ctx.makeHouse(s, 'house');
  s.player.assets.push(home);
  act(s, 'asset_movein', home.id);
  act(s, 'asset_project', home.id);
  let offered = s.pending.find((p) => p.handler === 'renovPickProject').choices.map((c) => c.value).filter(Boolean);
  ok(Object.keys(R).every((k) => offered.includes(k)), `a house is offered all ${Object.keys(R).length} projects (${offered.length})`);
  answer(s, 'gameroom');
  answer(s, 'luxury'); // flawless 70% of the time, never an overrun
  const built = home.renovations.find((r) => r.id === 'gameroom');
  ok(!!built && built.unit === 0, 'the game room went into the house (unit 0)');
  s.pending = [];
  ok(!!act(s, 'renov_gameroom', home.id), 'you can play in the game room of the home you live in');
  s.pending = [];
  act(s, 'asset_project', home.id);
  offered = s.pending.find((p) => p.handler === 'renovPickProject').choices.map((c) => c.value).filter(Boolean);
  ok(!offered.includes('gameroom') && offered.includes('pool'), 'a finished project leaves the menu');
  s.pending = [];

  // Another house you rent out has features you cannot use.
  const rental = ctx.makeHouse(s, 'house');
  s.player.assets.push(rental);
  ctx.completeRenovation(s, rental, R.pool, null, 'great', 45000);
  ok(!g('ACTIONS').renov_pool.when(s, rental.id), 'a pool at a house you do not live in is not yours to swim in');

  // Duplex: an interior lifts only its own unit's rent, a shared addition lifts both.
  const dup = ctx.makeHouse(s, 'duplex');
  s.player.assets.push(dup);
  const v0 = dup.value, c0 = dup.cond; // value and condition also move rent, so hold them still
  const m0 = ctx.marketRent(s, dup);
  ctx.completeRenovation(s, dup, R.chef_kitchen, 1, 'great', 38000);
  dup.value = v0; dup.cond = c0;
  const m1 = ctx.marketRent(s, dup);
  ctx.completeRenovation(s, dup, R.pool, null, 'great', 45000);
  dup.value = v0; dup.cond = c0;
  const m2 = ctx.marketRent(s, dup);
  ok(m1 > m0 * 1.05 && m1 < m0 * 1.15, `a duplex interior lifts rent by one unit's share (${m0} -> ${m1})`);
  ok(m2 > m1 * 1.1, `a shared pool lifts every unit (${m1} -> ${m2})`);
}

if (failures) { console.log(`\n❌ ${failures} cities check failures.`); process.exit(1); }
console.log(`Cities checks: pass (${Object.values(CITY_INFO).reduce((n, c) => n + Object.keys(c).length, 0)} cities)`);
console.log('✅ Cities checks passed.');
