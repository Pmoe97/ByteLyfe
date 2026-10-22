// Challenges verification:  node dev/verify/challenges.mjs
//
// Covers 52-challenges.js:
//   1. data — every challenge's start and goals exist, generated goals all have values
//   2. daily — the same date always gives the same challenge, a different date a different one
//   3. starts — born broke is poor, born royal is royal, an orphan's parents are gone,
//      a sickly start is frail, a prodigy is brilliant
//   4. playing — goals complete when met, the whole challenge completes (once) and is
//      recorded; dying without it fails it; "die broke" only counts at death
//   5. streaks — consecutive days build a streak, a gap resets it, replaying a day doesn't count
//   6. Chaos — the Chaos challenge only shows while Chaos is on
import { loadGame } from './loadgame.mjs';

const ctx = loadGame({ quiet: true });
const g = (name) => ctx.run(name);
ctx.seedRng(31);
let failures = 0;
const ok = (cond, msg) => { if (!cond) { failures++; console.log('  ✖ ' + msg); } };
const CHALLENGES = g('CHALLENGES'), CH_STARTS = g('CH_STARTS'), CH_GOALS = g('CH_GOALS'), META = g('META');
const byId = (id) => CHALLENGES.find((c) => c.id === id);

/* 1. data ------------------------------------------------------------------ */
for (const c of CHALLENGES) {
  ok(!!CH_STARTS[c.start], `${c.id}: unknown start ${c.start}`);
  for (const [k] of c.goals) ok(!!CH_GOALS[k], `${c.id}: unknown goal ${k}`);
  ok(c.stars >= 1 && c.stars <= 5, `${c.id}: stars ${c.stars}`);
}
for (const k of g('CH_GEN_GOALS')) ok(CH_GOALS[k] && CH_GOALS[k].gen && CH_GOALS[k].gen.length, `generated goal ${k} has no values`);

/* 2. daily ------------------------------------------------------------------- */
{
  const a = ctx.dailyChallenge('2026-10-21'), b = ctx.dailyChallenge('2026-10-21'), c = ctx.dailyChallenge('2026-10-22');
  ok(JSON.stringify(a) === JSON.stringify(b), 'the same date gives the same daily challenge');
  ok(JSON.stringify(a.goals) !== JSON.stringify(c.goals) || a.start !== c.start, 'another date gives another challenge');
  ok(a.goals.length === 2 && a.goals[0][0] !== a.goals[1][0], 'a daily has two different goals');
  ok(ctx.dayBefore('2026-03-01') === '2026-02-28' && ctx.dayBefore('2026-01-01') === '2025-12-31', 'dayBefore crosses months and years');
}

/* 3. starts ------------------------------------------------------------------- */
{
  const broke = ctx.startChallenge(byId('broke_retire_rich'));
  ok(broke.player.wealthTier === 'poor', `born broke is poor (${broke.player.wealthTier})`);
  const royal = ctx.startChallenge(byId('heir_apparent'));
  ok(!!royal.crown, 'born royal is royal');
  const orphan = ctx.startChallenge(byId('full_house'));
  ok(ctx.relPeople(orphan, ['parent']).length === 0, 'an orphan has no living parents');
  const sick = ctx.startChallenge(byId('against_odds'));
  const sp = sick.people[sick.playerId];
  ok(sp.stats.health <= 30 && sp.traits.includes('sickly'), `a sickly start is frail (${sp.stats.health})`);
  const pro = ctx.startChallenge(byId('prodigy'));
  ok(pro.people[pro.playerId].stats.smarts >= 95, 'a prodigy is brilliant');
  ok(pro.challenge && pro.challenge.goals.length === 2 && pro.challenge.pid === pro.playerId, 'the life knows its challenge');
}

/* 4. playing ----------------------------------------------------------------------- */
{
  META.challenges = { done: {}, daily: { last: null, streak: 0, best: 0 }, history: [] };
  const s = ctx.startChallenge(byId('rags_riches'));
  s.pending = [];
  ctx.checkChallenge(s);
  ok(!s.challenge.done, 'not done at birth');
  s.player.money = 2e8;
  ctx.afterChange(s);
  ok(s.challenge.done && META.challenges.done.rags_riches === 1, 'reaching the goal completes and records the challenge');
  ok(s.pending.some((p) => p.title === 'Challenge complete!'), 'a popup says so');
  ctx.afterChange(s);
  ok(META.challenges.done.rags_riches === 1, 'it only counts once');
  ok(s.player.achievements.includes('challenge_accepted'), 'Challenge Accepted unlocks');

  const d = ctx.startChallenge(byId('against_odds'));
  ctx.die(d, 'a cold');
  ctx.afterChange(d);
  ok(d.challenge.failed && !d.challenge.done, 'dying without it fails the challenge');
  ok(META.challenges.history[0].done === false, 'the failure is in the history');

  const bs = ctx.startChallenge(byId('black_sheep'));
  bs.player.life.prisonYears = 12;
  bs.player.money = -5e6;
  ctx.afterChange(bs);
  ok(!bs.challenge.done && bs.challenge.goals[0].done && !bs.challenge.goals[1].done, '"die broke" waits for the death');
  ctx.die(bs, 'despair');
  ctx.afterChange(bs);
  ok(bs.challenge.done, 'and counts at death');
}

/* 5. streaks -------------------------------------------------------------------------- */
{
  META.challenges = { done: {}, daily: { last: null, streak: 0, best: 0 }, history: [] };
  const finish = (key) => { const s = ctx.startChallenge(ctx.dailyChallenge(key)); s.challenge.goals.forEach((x) => { x.done = true; }); ctx.checkChallenge(s); return META.challenges.daily.streak; };
  ok(finish('2026-05-01') === 1, 'the first daily starts a streak');
  ok(finish('2026-05-02') === 2 && finish('2026-05-03') === 3, 'consecutive days build it');
  ok(finish('2026-05-03') === 3, 'replaying the same day doesn’t count');
  ok(finish('2026-05-06') === 1 && META.challenges.daily.best === 3, 'a gap resets it and keeps the best');
}

/* 6. Chaos ------------------------------------------------------------------------------ */
META.settings.chaos = false;
ok(!ctx.availableChallenges().some((c) => c.chaos), 'the Chaos challenge hides while Chaos is off');
META.settings.chaos = true;
ok(ctx.availableChallenges().some((c) => c.chaos), 'and shows while it’s on');

if (failures) { console.log(`\n❌ ${failures} challenge check failures.`); process.exit(1); }
console.log(`✅ Challenge checks passed (${CHALLENGES.length} challenges).`);
