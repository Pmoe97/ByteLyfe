// Runs the browser smoke test (ui-smoke.js) in headless Chromium against the dev server:
//   node dev/verify/ui-smoke-run.mjs [years] [runs] [--mature] [--past]   (--mature turns on every content switch first; --past makes every life
//   born in a random year since 1920, so it lives through real history)
// Needs Playwright (pre-installed in the cloud environment; locally: npm i -D playwright). Not part of npm run verify.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const args = process.argv.slice(2).filter((a) => !a.startsWith('--')), mature = process.argv.includes('--mature'), past = process.argv.includes('--past');
const years = Number(args[0]) || 60, runs = Number(args[1]) || 1, PORT = 8760 + Math.floor(Math.random() * 100);
const server = spawn('node', ['local-dev/server.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
const smoke = fs.readFileSync(path.join(ROOT, 'dev/verify/ui-smoke.js'), 'utf8');
let failed = 0;
try {
  await new Promise((r) => setTimeout(r, 800));
  const browser = await chromium.launch();
  for (let i = 0; i < runs; i++) {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push('pageerror: ' + e.message));
    await page.goto(`http://localhost:${PORT}/`);
    await page.waitForFunction('typeof CLICK !== "undefined"', { timeout: 20000 });
    if (past) await page.evaluate(() => { META.settings.randomBirth = 'past'; });
    if (mature) await page.evaluate(() => { for (const k of ['chaos', 'mature', 'mature_substances', 'mature_adultwork', 'mature_violence', 'mature_themes', 'mature_intimacy']) META.settings[k] = true; });
    const res = await page.evaluate(`(${smoke.trim().replace(/;$/, '')})`.replace('(async function uiSmoke(years = 60, seed = 0)', `(async function uiSmoke(years = ${years}, seed = 0)`));
    console.log(`run ${i + 1}: age ${res.age}, generation ${res.gen}, ${res.count} error(s)`);
    for (const e of res.errors.concat(pageErrors)) console.log('  ✖ ' + e);
    if (res.count || pageErrors.length) failed++;
    await page.close();
  }
  await browser.close();
} finally { server.kill(); }
process.exit(failed ? 1 : 0);
