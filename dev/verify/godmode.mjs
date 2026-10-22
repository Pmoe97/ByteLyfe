// God Mode verification:  node dev/verify/godmode.mjs
//
// Covers the per-person editor in 28-sandbox.js:
//   1. ages — parents stay 14+ years older than their kids; a romantic partner stays
//      on your side of 18; aging someone below 18 removes their body
//   2. edits — names are cleaned, stats clamp, traits respect conflicts and the limit,
//      jobs need the right age, money, education, gender, orientation and home stick
//   3. kinds — friends, best friends and enemies trade places; family never changes
//   4. the God Mode setting defaults on
import { loadGame } from './loadgame.mjs';

const ctx = loadGame({ quiet: true });
const g = (name) => ctx.run(name);
ctx.seedRng(99);
let failures = 0;
const ok = (cond, msg) => { if (!cond) { failures++; console.log('  ✖ ' + msg); } };
const SB = g('Sandbox'), META = g('META');

const s = ctx.createLife({ country: 'us', year: 1990 });
s.year = 2030; // 40 years old
s.pending = [];
const me = s.people[s.playerId];
const parent = ctx.relPeople(s, ['parent'])[0];
const mate = ctx.makeAdultNear(s, {});
ctx.setRel(s, mate.id, 'spouse', 80); me.partner = mate.id; mate.partner = me.id; me.married = mate.married = true;
const kid = ctx.bornChild(s, mate.id, 'Kit', 'f'); kid.birthYear = s.year - 10;
const pal = ctx.makeAdultNear(s, {}); ctx.setRel(s, pal.id, 'friend', 60);

/* 1. ages ---------------------------------------------------------------- */
{
  const [lo, hi] = SB.npcAgeRange(s, parent.id);
  ok(lo >= 40 + 14, `a parent stays 14+ years older than you (min ${lo})`);
  SB.npcAge(s, parent.id, 10);
  ok(ctx.ageOf(s, parent) >= 54, 'asking for a 10-year-old parent clamps to the minimum');
  const [klo, khi] = SB.npcAgeRange(s, kid.id);
  ok(khi <= 40 - 14 && khi <= 26, `your child stays 14+ years younger than you (max ${khi})`);
  ok(SB.npcAgeRange(s, mate.id)[0] >= 18, 'your spouse can never be under 18');
  SB.npcAge(s, mate.id, 12);
  ok(ctx.ageOf(s, mate) >= 18, 'asking for a 12-year-old spouse clamps to 18');
  SB.npcAge(s, pal.id, 30);
  ok(!!pal.body, 'an adult friend has a body');
  SB.npcAge(s, pal.id, 15);
  ok(ctx.ageOf(s, pal) === 15 && !pal.body, 'a friend made 15 loses their body');
  SB.npcAge(s, pal.id, 33);
  ok(ctx.ageOf(s, pal) === 33 && !!pal.body, 'and gets one back at 33');
}

/* 2. edits ---------------------------------------------------------------- */
{
  SB.npcName(s, pal.id, 'first', '  Zed{x}<b>  ');
  ok(pal.first === 'Zedxb', `names are cleaned (${pal.first})`);
  SB.npcName(s, pal.id, 'last', '');
  ok(pal.last && pal.last.length > 0, 'an empty last name is ignored');
  SB.npcStat(s, pal.id, 'smarts', 250);
  ok(pal.stats.smarts === 100, 'stats clamp to 100');
  pal.traits = ['ambitious'];
  SB.npcTrait(s, pal.id, 'lazy');
  ok(!pal.traits.includes('lazy'), 'conflicting traits are refused');
  for (const t of ['kind', 'funny', 'lucky', 'green']) SB.npcTrait(s, pal.id, t);
  ok(pal.traits.length === 4, `four traits at most (${pal.traits})`);
  SB.npcTrait(s, pal.id, 'ambitious');
  ok(!pal.traits.includes('ambitious'), 'tapping a trait again removes it');
  SB.npcJob(s, pal.id, 'software', 3);
  ok(pal.job && pal.job.id === 'software' && pal.job.level === 3, 'careers are set with a rung');
  ok(ctx.npcJobTitle(pal) === g('JOBS').software.ladder[3][0], 'and show up as their title');
  SB.npcJob(s, kid.id, 'surgeon', 5);
  ok(!kid.job || !kid.job.id, 'a 10-year-old can’t become a surgeon');
  SB.npcJob(s, pal.id, 'retired');
  ok(pal.retired === false || ctx.ageOf(s, pal) >= 40, 'only people 40 and up can retire');
  SB.npcMoney(s, pal.id, 12345.6);
  ok(pal.money === 12346, 'money is set (and rounded)');
  SB.npcEdu(s, pal.id, 'bachelor', 'cs');
  ok(pal.edu === 'bachelor', 'degrees stick');
  SB.npcEdu(s, pal.id, 'nonsense', 'cs');
  ok(pal.edu === null && pal.major === null, 'unknown degrees clear it');
  SB.npcGender(s, pal.id, 'x'); SB.npcOrient(s, pal.id, 'bi');
  ok(pal.gender === 'x' && pal.orient === 'bi', 'gender and orientation stick');
  SB.npcHome(s, pal.id, 'jp', 'Kyoto');
  ok(pal.country === 'jp' && pal.city === 'Kyoto', 'moving them abroad works');
  SB.npcHome(s, pal.id, 'fr', 'Kyoto');
  ok(pal.country === 'fr' && g('COUNTRIES').fr.cities.includes(pal.city), 'a city has to be in their country');
}

/* 3. kinds ---------------------------------------------------------------- */
{
  SB.npcKind(s, pal.id, 'enemy');
  ok(ctx.relKind(s, pal.id) === 'enemy', 'a friend can become an enemy');
  SB.npcKind(s, pal.id, 'bestie');
  ok(ctx.relKind(s, pal.id) === 'bestie', 'and then a best friend');
  SB.npcKind(s, parent.id, 'enemy');
  ok(ctx.relKind(s, parent.id) === 'parent', 'family stays family');
  SB.npcKind(s, mate.id, 'friend');
  ok(ctx.relKind(s, mate.id) === 'spouse', 'a spouse stays a spouse');
}

/* 4. the setting ------------------------------------------------------------ */
ok(META.settings.godMode === true, 'God Mode buttons are on by default');

if (failures) { console.log(`\n❌ ${failures} God Mode check failures.`); process.exit(1); }
console.log('✅ God Mode checks passed.');
