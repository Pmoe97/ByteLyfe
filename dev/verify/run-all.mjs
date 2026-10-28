// Runs every headless check, in parallel:  npm run verify
//   - syntax-check every shipped JS file (here, in one process)
//   - the emoji audit (nothing newer than Emoji 12)
//   - content tags (known tags only, filters hide tagged content)
//   - taboo gate/inbreeding/event checks (48-taboo.js)
//   - cities: city data, prices, moving, landlords and tenants (49-cities.js)
//   - currencies: formats, exchange when emigrating, foreign savings (50-currency.js)
//   - God Mode: the per-person editor's rules (28-sandbox.js)
//   - Chaos mode: gating, powers, capes, vampires, ascension (51-chaos.js)
//   - challenges: starts, goals, the daily challenge and streaks (52-challenges.js)
//   - gambling: venues, credit, races, season bets, debts, limits (53-gambling.js)
//   - the house: the book, racehorses and breeding, the big races, casinos (54-house.js)
//   - growing up: school life, clubs, college, home and lessons (55-57)
//   - military: wars, deployments, the draft, desertion, veterans' benefits (59-military.js)
//   - spy: recruitment, missions, assets, double agents, getting burned (60-spy.js)
//   - web: secrets that leak, ties, hearsay, reputation, neighborhood unease (62-web.js)
//   - web part two: a good name, the press and the bus, deserters' and informants' secrets, places with regulars (81-web2.js)
//   - investigations: case files, detectives, series, arrests, police casework (63-cases.js, 64-detective.js)
//   - career cards: the decks, dealing, playing every card, outcomes, autopilot, people (65-work.js, 66-work-decks.js)
//   - language dial and intimacy: the dial, gating, adults only, nights, consequences, spark, friends with benefits (67-language.js, 68-intimacy.js)
//   - substances and nightlife: the ladder, tolerance, cravings, recovery, overdoses, dealers, a night out (69-substances.js, 70-nightlife.js)
//   - adult careers: dancer, companion, creator and club manager as decks; gating, adults only, boundaries, walking away, who knows, the law (71-adult-work.js)
//   - violence and the serial arc: fights, self-defense, guilt, witnesses, gangs, the urge, the series, the way out (72-violence.js, 73-serial.js)
//   - dark themes: betrayal and revenge, stalking, moral injury (74-dark.js)
//   - work life and tuning: every career has a deck, shortcuts cost what they cost, favors, workplace venues, the odds table (75-77)
//   - abduction, captivity, the paper and the ransom note: spaces, taking, care, escape, death, news, hoaxes (78-80)
//   - the life simulator (300 lives), split into shards across the cores, then merged
// Each check is its own process; at most one per core runs at a time, longest first.
// Output is held until a check finishes, so checks never interleave.
//   VERIFY_JOBS=4 npm run verify     use at most 4 processes
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const JS = path.join(ROOT, 'src', 'src', 'srcfiles', 'js');
const CORES = Math.max(2, Number(process.env.VERIFY_JOBS) || (os.availableParallelism ? os.availableParallelism() : os.cpus().length));
// Personas come every 10th and 20th life, so the shard count shares no factor with 10:
// otherwise the long-lived ones (vampires!) pile up in a couple of shards.
const coprime = (n) => { while (n > 1 && (n % 2 === 0 || n % 5 === 0)) n--; return n; };
const SIM_LIVES = 300, SHARDS = coprime(Math.min(11, Math.max(3, CORES - 1))), SEED = String(Date.now() % 100000);
const shardSecs = [];
const t0 = Date.now();
let failed = false;

// Syntax: compile every file as the classic script the browser loads.
for (const f of fs.readdirSync(JS).filter((x) => x.endsWith('.js'))) {
  try { new vm.Script(fs.readFileSync(path.join(JS, f), 'utf8'), { filename: f }); } catch (e) { failed = true; console.log(`✖ syntax: ${f}\n${e.message}`); }
}
console.log('✓ syntax check done');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bytelyfe-sim-'));
const shardFile = (k) => path.join(tmp, `shard${k}.json`);
const tasks = [
  ...Array.from({ length: SHARDS }, (_, k) => ({ label: `life simulator, shard ${k + 1} of ${SHARDS}`, args: ['dev/verify/sim-lives.mjs', String(SIM_LIVES), SEED, '--shard', `${k}/${SHARDS}`, '--json', shardFile(k)], shard: true })),
  { label: 'emoji audit', args: ['dev/verify/emoji-audit.mjs'] },
  { label: 'content tags', args: ['dev/verify/tags.mjs'] },
  { label: 'taboo checks', args: ['dev/verify/taboo.mjs'] },
  { label: 'cities checks', args: ['dev/verify/cities.mjs'] },
  { label: 'currency checks', args: ['dev/verify/currency.mjs'] },
  { label: 'God Mode checks', args: ['dev/verify/godmode.mjs'] },
  { label: 'Chaos checks', args: ['dev/verify/chaos.mjs'] },
  { label: 'challenge checks', args: ['dev/verify/challenges.mjs'] },
  { label: 'gambling checks', args: ['dev/verify/gambling.mjs'] },
  { label: 'house checks', args: ['dev/verify/house.mjs'] },
  { label: 'zoo checks', args: ['dev/verify/zoo.mjs'] },
  { label: 'youth checks', args: ['dev/verify/youth.mjs'] },
  { label: 'military checks', args: ['dev/verify/military.mjs'] },
  { label: 'spy checks', args: ['dev/verify/spy.mjs'] },
  { label: 'web checks', args: ['dev/verify/web.mjs'] },
  { label: 'web part two checks', args: ['dev/verify/web2.mjs'] },
  { label: 'investigation checks', args: ['dev/verify/inv.mjs'] },
  { label: 'career-card checks', args: ['dev/verify/work.mjs'] },
  { label: 'language and intimacy checks', args: ['dev/verify/intim.mjs'] },
  { label: 'substance and nightlife checks', args: ['dev/verify/subs.mjs'] },
  { label: 'adult-career checks', args: ['dev/verify/adult.mjs'] },
  { label: 'violence and serial checks', args: ['dev/verify/violence.mjs'] },
  { label: 'dark-theme checks', args: ['dev/verify/dark.mjs'] },
  { label: 'work-life checks', args: ['dev/verify/lifework.mjs'] },
  { label: 'kidnapping and ransom checks', args: ['dev/verify/kidnap.mjs'] },
];
function run(task) {
  return new Promise((resolve) => {
    const start = Date.now(), p = spawn(process.execPath, task.args, { cwd: ROOT });
    let out = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { out += d; });
    p.on('close', (code) => resolve(Object.assign({}, task, { code, out, secs: (Date.now() - start) / 1000 })));
  });
}
function report(r) {
  if (r.code !== 0) failed = true;
  if (r.shard) { shardSecs.push(r.secs); if (r.code !== 0) console.log(`\n✖ ${r.label} crashed (${r.secs.toFixed(1)}s)\n${r.out}`); return; }
  console.log(`\n▶ ${r.label} (${r.secs.toFixed(1)}s)\n${r.out.trimEnd()}`);
  if (r.code !== 0) console.log(`✖ ${r.label} failed`);
}
// A simple pool: start the next task whenever one finishes.
async function pool(list, limit) {
  const queue = list.slice();
  const worker = async () => { while (queue.length) report(await run(queue.shift())); };
  await Promise.all(Array.from({ length: Math.min(limit, list.length) }, worker));
}
await pool(tasks, CORES);

// Add the shards up into one simulator summary.
const done = Array.from({ length: SHARDS }, (_, k) => shardFile(k)).filter((f) => fs.existsSync(f));
if (done.length === SHARDS) report(await run({ label: `life simulator (${SIM_LIVES} lives)`, args: ['dev/verify/sim-lives.mjs', '--merge', ...done] }));
else failed = true;
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${failed ? '❌ Some checks failed.' : '✅ All checks passed.'} (${((Date.now() - t0) / 1000).toFixed(1)}s, ${CORES} processes, simulator in ${SHARDS} shards of ${Math.min(...shardSecs).toFixed(0)}–${Math.max(...shardSecs).toFixed(0)}s)`);
process.exit(failed ? 1 : 0);
