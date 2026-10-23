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

console.log('✓ Zoo & Wildlife Sanctuary tests passed successfully!');
