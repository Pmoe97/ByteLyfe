// Runs every headless check:  npm run verify
//   1. syntax-check every shipped JS file
//   2. the emoji audit (nothing newer than Emoji 12)
//   3. content tags (known tags only, filters hide tagged content)
//   4. taboo gate/inbreeding/event checks (48-taboo.js)
//   5. cities: city data, prices, moving, landlords and tenants (49-cities.js)
//   6. currencies: formats, exchange when emigrating, foreign savings (50-currency.js)
//   7. God Mode: the per-person editor's rules (28-sandbox.js)
//   8. Chaos mode: gating, powers, capes, vampires, ascension (51-chaos.js)
//   9. challenges: starts, goals, the daily challenge and streaks (52-challenges.js)
//  10. the life simulator (300 lives) with its invariant checks
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const JS = path.join(ROOT, 'src', 'src', 'srcfiles', 'js');
let failed = false;
const run = (label, args) => {
  process.stdout.write(`\n▶ ${label}\n`);
  const r = spawnSync(process.execPath, args, { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) { failed = true; console.log(`✖ ${label} failed`); }
};

for (const f of fs.readdirSync(JS).filter((x) => x.endsWith('.js'))) {
  const r = spawnSync(process.execPath, ['--check', path.join(JS, f)], { encoding: 'utf8' });
  if (r.status !== 0) { failed = true; console.log(`✖ syntax: ${f}\n${r.stderr}`); }
}
console.log('✓ syntax check done');
run('emoji audit', ['dev/verify/emoji-audit.mjs']);
run('content tags', ['dev/verify/tags.mjs']);
run('taboo checks', ['dev/verify/taboo.mjs']);
run('cities checks', ['dev/verify/cities.mjs']);
run('currency checks', ['dev/verify/currency.mjs']);
run('God Mode checks', ['dev/verify/godmode.mjs']);
run('Chaos checks', ['dev/verify/chaos.mjs']);
run('challenge checks', ['dev/verify/challenges.mjs']);
run('life simulator', ['dev/verify/sim-lives.mjs', '300', String(Date.now() % 100000)]);
console.log(failed ? '\n❌ Some checks failed.' : '\n✅ All checks passed.');
process.exit(failed ? 1 : 0);
