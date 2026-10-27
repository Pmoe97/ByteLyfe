// Verification test suite for Zoo & Wildlife Sanctuary expansion.
import { loadGame } from './loadgame.mjs';
import assert from 'node:assert/strict';

const ctx = loadGame({ quiet: true });
ctx.seedRng(42);

console.log('Testing Zoo & Wildlife Sanctuary...');

// 1. Create a life and found a zoo
const s = ctx.createLife({ country: 'us' });
s.year = 2030;
s.people[s.playerId].birthYear = 2005; // 25 years old
s.dead = false;
s.pending = [];

// Give player plenty of cash and skills
s.player.money = 10000000;
s.player.skills.business = 50;

const co = ctx.foundCompany(s, 'zoo', 'Apex Wildlife Reserve', { equity: 1, debt: 0 });
assert.ok(co, 'Zoo company founded');
assert.equal(co.ind, 'zoo');
assert.equal(ctx.ownsZoo(s), true, 'ownsZoo is true');

// Clear any achievement popups triggered during founding
s.pending = [];

// Check initial zoo state
const z = ctx.zooOf(co);
assert.ok(z, 'zooOf returned zoo state');
assert.equal(z.exhibits.length, 2, 'Initial 2 exhibits');
assert.equal(z.animals.length, 3, 'Initial 3 animals');
assert.equal(z.ticketPrice, 1, 'Standard ticket price default');

// Helper to find and resolve a pending popup by handler
function answerPopup(s, handler, choiceVal) {
  const p = s.pending.find((x) => x.handler === handler);
  if (!p) throw new Error(`Popup with handler '${handler}' not found in pending: ${s.pending.map((x) => x.handler || x.title).join(', ')}`);
  const idx = typeof choiceVal === 'number' ? choiceVal : p.choices.findIndex((c) => c.value === choiceVal);
  if (idx < 0) throw new Error(`Choice '${choiceVal}' not found in popup '${handler}'`);
  const res = ctx.resolvePopup(s, p.id, idx);
  // Dismiss any lingering achievements to free the player for subsequent actions
  s.pending = [];
  return res;
}

// 2. Test ticket price changing
ctx.doAction(s, 'zoo_ticket', co.id);
answerPopup(s, 'zooTicket', 2); // Premium ($45)
assert.equal(z.ticketPrice, 2, 'Ticket price updated to Premium');

// 3. Test building an exhibit
co.cash = 5000000;
ctx.doAction(s, 'zoo_exhibit', co.id);
answerPopup(s, 'zooExhibitPick', 'arctic'); // Build Arctic Tundra
assert.equal(z.exhibits.length, 3, 'Now 3 exhibits');
const arcticEx = z.exhibits.find((e) => e.biome === 'arctic');
assert.ok(arcticEx, 'Arctic exhibit created');

// 4. Test acquiring an animal
ctx.doAction(s, 'zoo_acquire', co.id);
const acqPop = s.pending.find((p) => p.handler === 'zooAcquirePick');
assert.ok(acqPop, 'Acquire popup opened');
acqPop.ctx.candidates[0] = { sp: 'penguin', name: 'Waddles', sex: 'm', age: 3, cost: 35000 };
acqPop.choices[0].disabled = false; // the popup priced the random first candidate, not the penguin
answerPopup(s, 'zooAcquirePick', 0);
assert.equal(z.animals.length, 4, 'Animal acquired');
const penguin = z.animals.find((a) => a.name === 'Waddles');
assert.ok(penguin, 'Waddles the penguin added to collection');
assert.equal(penguin.exhibitId, arcticEx.id, 'Penguin assigned to Arctic exhibit');

// 5. Test conservation breeding
// Add a female penguin to match Waddles
z.animals.push({
  id: ctx.uid(s, 'an'),
  sp: 'penguin',
  name: 'Penny',
  sex: 'f',
  age: 3,
  health: 95,
  happiness: 95,
  exhibitId: arcticEx.id,
});

// Hire Zoologists and Keepers
ctx.hireStaff(s, co, 'rnd', 4, 'market', true);
ctx.hireStaff(s, co, 'ops', 10, 'market', true);
assert.equal(co.team.rnd.n, 4, '4 Zoologists hired');
assert.equal(co.team.ops.n, 10, '10 Keepers hired');

ctx.doAction(s, 'zoo_breed', co.id);
const breedPop = s.pending.find((p) => p.handler === 'zooBreedPick');
assert.ok(breedPop, 'Breed popup opened');
const penguinBreedIdx = breedPop.ctx.eligible.findIndex((el) => el.sp === 'penguin');
assert.ok(penguinBreedIdx >= 0, 'Penguin pair found eligible for breeding');
answerPopup(s, 'zooBreedPick', penguinBreedIdx);
assert.equal(z.breeding.length, 1, 'Active breeding program registered');

// 6. Test enrichment, vet check, and grounds inspection
ctx.doAction(s, 'zoo_enrich', co.id);
assert.equal(z.enriched, true, 'Habitat enrichment completed');
s.pending = [];

ctx.doAction(s, 'zoo_vet', co.id);
assert.equal(z.vetChecked, true, 'Vet checkup completed');
s.pending = [];

ctx.doAction(s, 'zoo_inspect', co.id);
assert.equal(z.inspected, true, 'Grounds inspection completed');
s.pending = [];

// 7. Test yearly simulation tick and breeding baby birth
const initialCount = z.animals.length;
let born = false;
for (let y = 0; y < 5; y++) {
  s.year++;
  s.player.bizIncome = [];
  ctx.marketTick(s);
  ctx.companyYear(s, co);
  if (s.pending.length > 0) {
    // If escape or other event popped up, resolve it
    for (const p of s.pending.slice()) {
      ctx.resolvePopup(s, p.id, 0);
    }
    s.pending = [];
  }
  if (z.animals.length > initialCount) {
    born = true;
  }
}
assert.ok(born, 'Breeding program yielded at least one newborn animal');
assert.ok(z.welfare > 65, 'Welfare maintained high with adequate keepers');

// 8. Test containment breach handler directly
const handlers = ctx.run('HANDLERS');
handlers.zooEscape(s, { co: co.id, animal: z.animals[0].id }, 'dart');
handlers.zooEscape(s, { co: co.id, animal: z.animals[0].id }, 'evacuate');
handlers.zooEscape(s, { co: co.id, animal: z.animals[0].id }, 'food');

// 9. Regression checks for the review fixes (fresh zoos, so the state above doesn't matter)
function freshZoo(seed) {
  ctx.seedRng(seed);
  const s2 = ctx.createLife({ country: 'us' });
  s2.year = 2030; s2.people[s2.playerId].birthYear = 2000; s2.dead = false; s2.pending = [];
  s2.player.money = 1e8; s2.player.skills.business = 60;
  const c2 = ctx.foundCompany(s2, 'zoo', 'Review Zoo', { equity: 1, debt: 0 });
  s2.pending = [];
  ctx.hireStaff(s2, c2, 'ops', 6, 'market', true);
  ctx.hireStaff(s2, c2, 'rnd', 2, 'market', true);
  return { s2, c2, z2: ctx.zooOf(c2) };
}
const animal = (id, sp, sex, age, exhibitId) => ({ id, sp, name: id, sex, age, health: 95, happiness: 95, exhibitId });
const yearOf = (s2, c2) => { s2.year++; ctx.marketTick(s2); ctx.companyYear(s2, c2); s2.pending = []; };
{
  // An emergency bill the zoo can't pay from cash goes on its loan instead of making cash negative.
  const { s2, c2 } = freshZoo(11);
  c2.cash = 1000; const debt0 = c2.debt;
  const H2 = ctx.run('HANDLERS');
  H2.zooEscape(s2, { co: c2.id }, 'evacuate');
  assert.ok(c2.cash >= 0, 'cash never goes negative from a breach');
  assert.ok(c2.debt > debt0, 'the shortfall goes on the loan');
}
{
  // Breeding: only grown animals, programs end when a parent is gone, and a full habitat sends the baby to a partner zoo.
  const { s2, c2, z2 } = freshZoo(12);
  const ex = z2.exhibits[0];
  z2.animals = [animal('m0', 'zebra', 'm', 0, ex.id), animal('f0', 'zebra', 'f', 1, ex.id)];
  ctx.doAction(s2, 'zoo_breed', c2.id);
  assert.ok(!s2.pending.find((p) => p.handler === 'zooBreedPick'), 'newborn and one-year-old zebras are too young to breed');
  s2.pending = [];
  z2.animals = [animal('m1', 'zebra', 'm', 6, ex.id), animal('f1', 'zebra', 'f', 6, ex.id)];
  z2.breeding = [{ id: 'b1', sp: 'zebra', sireId: 'm1', damId: 'f1', sireName: 'm1', damName: 'f1', progress: 0, target: 99 }];
  z2.animals = z2.animals.filter((a) => a.id !== 'm1');
  yearOf(s2, c2);
  assert.equal(z2.breeding.length, 0, 'a program ends when a parent has left the collection');
  assert.equal(z2.animals.filter((a) => a.age <= 1).length, 0, 'and no baby is born from it');
  // Full habitat: the baby is placed with a partner zoo for a fee.
  z2.animals = [];
  for (let i = 0; i < ex.cap; i++) z2.animals.push(animal('q' + i, 'zebra', i === 0 ? 'm' : 'f', 6, ex.id));
  const cap = ex.cap, savanna2 = z2.exhibits.filter((e) => e.biome === 'savanna');
  for (const e of savanna2) if (e !== ex) while (z2.animals.filter((a) => a.exhibitId === e.id).length < e.cap) z2.animals.push(animal('x' + z2.animals.length, 'zebra', 'f', 6, e.id));
  z2.breeding = [{ id: 'b2', sp: 'zebra', sireId: 'q0', damId: 'q1', sireName: 'q0', damName: 'q1', progress: 99, target: 2 }];
  yearOf(s2, c2);
  assert.ok(z2.animals.filter((a) => a.exhibitId === ex.id).length <= cap, 'a birth never overfills a habitat');
  assert.equal(z2.breeding.length, 0, 'the program finished');
}
{
  // Tickets: the best tier rises with the collection, so no tier always wins.
  const { s2, c2, z2 } = freshZoo(13);
  const species = Object.keys(ctx.run('ZOO_SPECIES'));
  const best = (n) => {
    z2.animals = species.slice(0, n).map((k, i) => animal('a' + i, k, 'm', 6, z2.exhibits[0].id));
    const p = [0, 1, 2, 3].map((t) => { z2.ticketPrice = t; return ctx.bizForecast(s2, c2).profit; });
    return p.indexOf(Math.max(...p));
  };
  const tiers = [best(1), best(3), best(6), best(12)];
  assert.ok(tiers[0] < tiers[3], 'a bigger collection supports dearer tickets: ' + tiers.join(','));
  assert.ok(new Set(tiers).size >= 3, 'different collections want different tiers: ' + tiers.join(','));
}
{
  // Wear needs repair: the action restores every enclosure, and the company pricing menu is hidden.
  const { s2, c2, z2 } = freshZoo(14);
  for (const e of z2.exhibits) { e.condition = 30; e.security = 30; }
  assert.ok(ctx.doAction(s2, 'zoo_repair', c2.id), 'repair is offered for worn enclosures');
  assert.ok(z2.exhibits.every((e) => e.condition === 100 && e.security === 100), 'repair restores every enclosure');
  assert.ok(!ctx.doAction(s2, 'zoo_repair', c2.id), 'nothing to repair afterwards');
  assert.ok(!ctx.doAction(s2, 'biz_pricing', c2.id), 'a zoo prices through its tickets, not the generic pricing menu');
  // Worn security raises the chance of a breach.
  s2.pending = [];
  for (const e of z2.exhibits) e.security = 20;
  z2.animals = [animal('t1', 'tiger', 'm', 6, z2.exhibits[0].id)];
  let breaches = 0;
  for (let y = 0; y < 40; y++) { const e0 = z2.escapes; yearOf(s2, c2); for (const e of z2.exhibits) e.security = 20; breaches += z2.escapes - e0; }
  assert.ok(breaches > 0, 'low security leads to breaches over the years');
}

console.log('✓ Zoo & Wildlife Sanctuary tests passed successfully!');
