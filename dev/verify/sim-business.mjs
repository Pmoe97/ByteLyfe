// Business balance report. For every industry, founds companies with an adult founder and
// runs them for 20 years under two owners:
//   manager  - autopilot hiring, moderate marketing, light R&D, a new product every few years,
//              opens a location when cash allows, takes a modest salary, franchises at the
//              standard royalty once it can, and buys its smallest rival when it has 3x the price
//   hands-off - founds it and never touches it again (no hires, defaults)
// Prints survival, profit and size by year so the economy can be tuned.
//   node dev/verify/sim-business.mjs [runsPerIndustry=40] [seed=1] [industry]  (one industry only)
import { loadGame } from './loadgame.mjs';

const RUNS = Number(process.argv[2]) || 40;
const SEED = Number(process.argv[3]) || 1;
const ctx = loadGame({ quiet: true });
ctx.seedRng(SEED);
const IDS = ctx.run('INDUSTRY_IDS').filter((id) => !process.argv[4] || id === process.argv[4]);
const INDUSTRIES = ctx.run('INDUSTRIES');

function founder(indId) {
  const s = ctx.createLife({ country: 'us' });
  s.year += 25;
  s.people[s.playerId].birthYear = s.year - 25;
  s.pending = [];
  const m = s.player;
  const I = INDUSTRIES[indId];
  m.money = ctx.price(s, I.start) * 1.2;
  for (const k of ['business', 'charisma', 'cooking', 'coding', 'art', 'music', 'acting', 'fitness']) m.skills[k] = 35;
  for (const d of ['md', 'dds', 'jd', 'phd']) m.edu.degrees.push({ type: d, year: s.year, gpa: 70 });
  s.dead = false;
  return s;
}

function runOne(indId, policy) {
  const s = founder(indId);
  const co = ctx.foundCompany(s, indId, 'Test Co', { equity: 1, debt: 0 });
  const I = INDUSTRIES[indId];
  if (policy === 'manager') co.auto = true;
  const marks = {};
  for (let y = 1; y <= 20; y++) {
    if (policy === 'manager') {
      // A sensible owner: budgets sized to revenue, pay yourself once it's profitable,
      // refresh products when affordable, expand when there's cash to spare.
      co.mkt = Math.max(1, ctx.affordableTier(s, co, ctx.run('MKT_SPEND'), 0.08));
      co.rnd = ctx.affordableTier(s, co, ctx.run('RND_SPEND'), 0.05);
      co.draw = co.last && co.last.profit > 0 && y > 2 ? Math.round(co.last.profit * 0.25) : 0;
      if (y % 3 === 1 && co.cash > ctx.bizCost(s, co, 50000) * 3) { co.cash -= ctx.bizCost(s, co, 50000); co.products.push(ctx.makeProduct(s, co, 1)); if (co.products.length > 6) co.products.shift(); }
      if (co.cash > ctx.price(s, I.locBuild) * 2 && co.lossYears === 0 && co.locations < 30) { co.cash -= ctx.price(s, I.locBuild); co.locations++; }
      const setup = ctx.nicePrice(ctx.price(s, I.start) * 0.5);
      if (!co.franchise && ctx.franchiseReady(s, co) && co.cash > setup * 2) { co.cash -= setup; ctx.startFranchise(s, co, 0.06); marks.franchised = y; }
      const target = ctx.industryRivals(s, indId).sort((a, b) => a.rev - b.rev)[0];
      if (target && !marks.acquired && co.cash > ctx.takeoverPrice(s, target) * 3) { co.cash -= ctx.takeoverPrice(s, target); ctx.mergeFirm(s, co, target); ctx.removeFirm(s, ctx.ensureMarket(s), target); marks.acquired = y; }
    }
    s.year++;
    s.player.bizIncome = [];
    ctx.marketTick(s);
    ctx.companyYear(s, co);
    s.pending = [];
    if (co.closed) { marks.dead = y; break; }
    if ([1, 5, 10, 20].includes(y)) marks[y] = { rev: co.last.revenue, profit: co.last.profit, val: co.public ? co.price * co.shares : co.val, staff: ctx.headcount(co), locs: co.locations, rep: Math.round(co.rep), outlets: co.franchise ? co.franchise.outlets : null, fees: co.last.fees || null };
    if (!marks.ipo && ctx.ipoReady(s, co)) marks.ipo = y;
  }
  return marks;
}

const fmt = (n) => String(n == null ? '-' : Math.abs(n) >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : Math.abs(n) >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : Math.abs(n) >= 1e3 ? Math.round(n / 1e3) + 'K' : Math.round(n));
const med = (a) => { const b = a.filter((x) => x != null).sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : null; };
for (const policy of ['manager', 'hands-off']) {
  console.log(`\n=== ${policy} (${RUNS} runs each; medians among survivors) ===`);
  console.log('industry       alive@5 alive@20 ipoReady | y1 profit | y5 rev/profit/staff | y10 rev/profit | y20 rev/profit/val/locs/staff | franchised acquired | y20 outlets/fees');
  for (const id of IDS) {
    const runs = Array.from({ length: RUNS }, () => runOne(id, policy));
    const alive = (y) => Math.round((runs.filter((r) => !r.dead || r.dead > y).length / RUNS) * 100);
    const at = (y, k) => med(runs.map((r) => r[y] && r[y][k]));
    const ipo = Math.round((runs.filter((r) => r.ipo).length / RUNS) * 100);
    const share = (k) => Math.round((runs.filter((r) => r[k]).length / RUNS) * 100) + '%';
    console.log(`${id.padEnd(14)} ${String(alive(5)).padStart(5)}% ${String(alive(20)).padStart(6)}% ${String(ipo).padStart(6)}% | ${fmt(at(1, 'profit')).padStart(7)} | ${fmt(at(5, 'rev'))}/${fmt(at(5, 'profit'))}/${at(5, 'staff') ?? '-'} | ${fmt(at(10, 'rev'))}/${fmt(at(10, 'profit'))} | ${fmt(at(20, 'rev'))}/${fmt(at(20, 'profit'))}/${fmt(at(20, 'val'))}/${at(20, 'locs') ?? '-'}/${at(20, 'staff') ?? '-'} | ${share('franchised').padStart(5)} ${share('acquired').padStart(5)} | ${at(20, 'outlets') ?? '-'}/${fmt(at(20, 'fees'))}`);
  }
}
