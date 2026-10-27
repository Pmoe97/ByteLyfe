// Substances and nightlife verification:  node dev/verify/subs.mjs
//
// Covers 69-substances.js and 70-nightlife.js:
//   1. gating     — with Mature or Substances off the game is as it was: the old night out, the old overdose, nothing new
//   2. adults     — nothing here runs for anyone under 18
//   3. the ladder — offers climb a rung at a time, use builds tolerance and a habit, a relapse is counted
//   4. the year   — a hooked person who stops goes through withdrawal and cravings, and every choice runs
//   5. recovery   — meetings, a sponsor, rehab, a year clean
//   6. overdose   — a friend nearby makes a difference, the scare has a way out, and sometimes it ends badly
//   7. dealers    — a number in your phone, a buy that can go wrong
//   8. a night    — every path through a night out runs, after-hours is invite only, the drive home is dangerous
//   9. fallout    — every event and choice: peers, the screening at work, the kitchen table, a friend in trouble
//  10. long runs  — thirty years with everything on stay sane
import { loadGame } from './loadgame.mjs';

const ctx = loadGame({ quiet: true });
const g = (name) => ctx.run(name);
ctx.seedRng(6905);
ctx.console.error = () => {};
let failures = 0, checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) { failures++; console.log('  ✖ ' + msg); } };
const META = g('META'), ACTIONS = g('ACTIONS'), EVENTS = g('EVENTS'), SUBSTANCES = g('SUBSTANCES'), ADDICTIONS = g('ADDICTIONS');
const MY = ['sb_peer', 'sb_drug_test', 'sb_intervention', 'sb_friend_od', 'sb_dealer_call', 'sb_morning', 'sb_clean_year', 'nt_invite'];
const clone = (s) => JSON.parse(JSON.stringify(s));
const P = (s) => s.people[s.playerId];
const pop = (s, h) => s.pending.find((p) => p.handler === h);
const BAD = /undefined|NaN|\[object|\{~|\{[^}]*\|[^}]*\}/;
const setSubs = (on) => { META.settings.mature = on; META.settings.mature_substances = on; META.settings.mature_intimacy = false; META.settings.language = 'clean'; };
const adult = (age) => {
  const s = ctx.createLife({ country: 'us', year: 2000 });
  s.year = 2000 + age; s.pending = [];
  s.player.edu.current = null; s.player.money = 500000;
  return s;
};
const person = (s, kind, rel) => { const p = ctx.makeAdultNear(s, { minAge: 25, maxAge: 45 }); ctx.setRel(s, p.id, kind, rel ?? 60); return p; };
const drain = (s, pickFn, limit) => {
  for (let k = 0; k < (limit || 60) && s.pending.length; k++) {
    const p = s.pending[0];
    ok(!BAD.test(p.text) && !BAD.test(p.title) && p.choices.every((c) => !BAD.test(String(c.label) + ' ' + String(c.sub || ''))), `clean popup text "${p.title}: ${p.text}"`);
    const open = p.choices.map((c, i) => [c, i]).filter(([c]) => !c.disabled);
    const [, i] = pickFn ? pickFn(p, open) : open[ctx.randInt(0, open.length - 1)];
    ctx.resolvePopup(s, p.id, i);
  }
};
const choose = (value) => (p, open) => open.find(([c]) => c.value === value) || open[0];

/* 1. gating ------------------------------------------------------------------------------ */
{
  setSubs(false);
  const s = adult(25);
  const acts = ['sub_meeting', 'sub_buy'];
  ok(acts.every((id) => ACTIONS[id].tags.includes('mature_substances') && ACTIONS[id].tags.includes('mature')), 'the actions are tagged Mature + Substances');
  const evs = MY;
  ok(evs.length >= 8 && evs.every((id) => EVENTS[id].tags.includes('mature_substances') && EVENTS[id].tags.includes('mature')), `the events are tagged too (${evs.length})`);
  ok(evs.every((id) => !ctx.eventEligible(s, EVENTS[id])), 'none are eligible with the switches off');
  s.pending = [];
  ctx.doAction(s, 'nightlife');
  ok(!pop(s, 'nightGo'), 'the old night out is unchanged with the switches off');
  META.settings.mature = true;
  ok(!g('subsOn')(), 'Mature alone is not enough');
  setSubs(true);
  ok(g('subsOn')(), 'both unlock it');
  setSubs(false);
  // Withdrawal and cravings only exist with the switch on.
  const w = adult(30); ctx.habit(w, 'cocaine', 80);
  const h0 = P(w).stats.happy;
  w.year += 2; ctx.subsYear(w);
  ok(!pop(w, 'subCraving') && P(w).stats.happy === h0, 'no withdrawal or cravings with the switch off');
  // The old overdose is the old overdose.
  let died = 0, wake = 0;
  for (let i = 0; i < 400; i++) { const t = adult(30); ctx.habit(t, 'pills', 90); t.pending = []; ctx.seedRng(100 + i); ctx.bodyTick(t); if (t.dead) died++; if (pop(t, 'subWake')) wake++; }
  ok(died > 3 && wake === 0, `with the switch off an overdose is as it always was (${died} deaths, ${wake} close calls)`);
}

/* 2. adults only ----------------------------------------------------------------------------- */
{
  setSubs(true);
  const kid = adult(16);
  ctx.nightMenu(kid);
  ok(true, 'nightMenu does not throw for a teen');
  kid.pending = [];
  ctx.resolvePopup(kid, (ctx.nightMenu(kid), kid.pending[0]).id, 1);
  ok(!kid.pending.some((p) => p.handler === 'nightStep'), 'a teenager cannot start a night out');
  ok(!ACTIONS.nightlife.when(kid), 'the night out is 18+');
  ok(!ACTIONS.sub_meeting.when(kid), 'meetings are 16+ and only with a habit');
  const t = adult(16); ctx.habit(t, 'weed', 80);
  ctx.year = 0; t.year += 2; ctx.subsYear(t);
  ok(!pop(t, 'subCraving'), 'a teenager gets no cravings from this system');
  for (const id of MY) {
    ok(EVENTS[id].ages[0] >= 18 && !ctx.eventEligible(kid, EVENTS[id]), `${id} starts at 18`);
  }
  const dealer = person(adult(25), 'dealer', 30);
  ok(!ACTIONS.sub_buy.when(kid, dealer.id), 'a teenager cannot buy');
}

/* 3. the ladder ----------------------------------------------------------------------------------- */
{
  setSubs(true);
  const s = adult(26);
  ok(g('subMaxTier')(s) === 1, 'at first only the first rung is on offer');
  ctx.subsUse(s, 'weed', { free: true }); ctx.subsUse(s, 'weed', { free: true });
  ok(g('subMaxTier')(s) === 2, 'regular use opens the next rung');
  ctx.subsUse(s, 'partydrugs', { free: true }); ctx.subsUse(s, 'pills', { free: true });
  ok(g('subMaxTier')(s) === 3, 'then the next');
  ctx.subsUse(s, 'cocaine', { free: true }); ctx.subsUse(s, 'cocaine', { free: true });
  ok(g('subMaxTier')(s) === 4, 'and, after the hard ones, the last');
  // Tolerance dulls the high and sharpens the hook.
  const t = adult(26);
  const first = ctx.subsUse(t, 'cocaine', { free: true });
  const sev1 = t.player.addictions.cocaine;
  for (let i = 0; i < 12; i++) ctx.subsUse(t, 'cocaine', { free: true });
  const st = g('subState')(t, 'cocaine');
  ok(st.tol > 60 && st.uses === 13 && st.last === t.year, 'tolerance builds with use');
  const late = ctx.subsUse(t, 'cocaine', { free: true });
  ok(late.high < first.high || late.high <= 5, `it takes more for less (${first.high} then ${late.high})`);
  ok(t.player.addictions.cocaine > sev1 + 30, 'and the habit grows');
  ok(t.player.used.cocaine === t.year, 'the use is recorded for the withdrawal check');
  // It costs money, and you cannot use what you cannot pay for.
  const poor = adult(26); poor.player.money = 0;
  ok(ctx.subsUse(poor, 'cocaine') === null, 'no money, no use');
  // A bad night is likelier on a high tolerance, and worse mixed.
  const odRate = (opts, tol) => { let n = 0; for (let i = 0; i < 4000; i++) { const u = adult(26); g('subState')(u, 'opioids').tol = tol; if (ctx.subsUse(u, 'opioids', Object.assign({ free: true }, opts)).od) n++; } return n; };
  const lowTol = odRate({}, 0), highTol = odRate({}, 90), mixed = odRate({ mixed: true }, 0);
  ok(highTol > lowTol && mixed > lowTol * 1.5, `tolerance and mixing make it riskier (${lowTol}, ${highTol}, ${mixed})`);
  // Relapse: using again after a bad habit has been put down.
  const r = adult(30);
  ctx.habit(r, 'cocaine', 60); ctx.subsYear(r);
  r.player.addictions = {}; g('subState')(r, 'cocaine').clean = 2;
  const used = ctx.subsUse(r, 'cocaine', { free: true });
  ok(used.relapse && g('subState')(r, 'cocaine').relapses === 1, 'using again after a serious habit is a relapse');
  // The ladder habits exist.
  ok(['weed', 'cocaine', 'opioids'].every((k) => !!ADDICTIONS[k]), 'the new rungs are real habits');
}

/* 4. the year --------------------------------------------------------------------------------------- */
{
  setSubs(true);
  const s = adult(30);
  ctx.habit(s, 'cocaine', 80); s.year++; ctx.subsYear(s); // a year of use is recorded first
  s.year++; s.player.used.cocaine = s.year - 3;
  const h0 = P(s).stats.happy, hp0 = P(s).stats.health;
  ctx.subsYear(s);
  ok(P(s).stats.happy < h0 && P(s).stats.health < hp0, 'a hooked person who stops goes through withdrawal');
  let craved = false;
  for (let i = 0; i < 30 && !craved; i++) { const t = clone(s); t.pending = []; t.player.used.cocaine = 0; ctx.seedRng(800 + i); ctx.subsYear(t); if (pop(t, 'subCraving')) { craved = true; Object.assign(s, { __t: t }); } }
  ok(craved, 'and gets cravings');
  const base = adult(30); ctx.habit(base, 'opioids', 70);
  base.player.counters = {};
  for (const v of ['hold', 'call', 'use']) {
    const t = clone(base); t.pending = [];
    ctx.subsCraving(t, 'opioids');
    const pp = pop(t, 'subCraving');
    const idx = pp.choices.findIndex((c) => c.value === v);
    if (idx < 0) { ok(v === 'call', `craving offers ${v}`); continue; }
    let threw = null; try { ctx.resolvePopup(t, pp.id, idx); drain(t); } catch (e) { threw = e; }
    ok(!threw, `craving: ${v} ran`);
  }
  // A sponsor helps you hold on.
  const hold = (sponsor) => { let n = 0; for (let i = 0; i < 400; i++) { const t = adult(30); ctx.habit(t, 'cocaine', 60); if (sponsor) ctx.setRel(t, person(t, 'sponsor', 60).id, 'sponsor', 60); t.pending = []; ctx.subsCraving(t, 'cocaine'); const pp = pop(t, 'subCraving'); const idx = pp.choices.findIndex((c) => c.value === (sponsor ? 'call' : 'hold')); const before = t.player.addictions.cocaine; ctx.resolvePopup(t, pp.id, idx); drain(t, choose(null)); if ((t.player.addictions.cocaine || 0) < before) n++; } return n; };
  const alone = hold(false), helped = hold(true);
  ok(helped > alone + 40, `calling a sponsor works far better (${helped} vs ${alone} of 400)`);
  // Tolerance fades.
  const f = adult(30);
  ctx.subsUse(f, 'weed', { free: true }); g('subState')(f, 'weed').tol = 80;
  for (let i = 0; i < 6; i++) { f.year++; ctx.subsYear(f); }
  ok(g('subState')(f, 'weed').tol < 10, 'tolerance fades while you are off it');
}

/* 5. recovery ------------------------------------------------------------------------------------------- */
{
  setSubs(true);
  const s = adult(34);
  ctx.habit(s, 'cocaine', 70);
  ok(ACTIONS.sub_meeting.when(s), 'a meeting is there when you need one');
  const sev0 = s.player.addictions.cocaine;
  s.pending = [];
  ctx.doAction(s, 'sub_meeting');
  ok(s.player.addictions.cocaine < sev0, 'a meeting helps');
  ok(!ctx.relPeople(s, ['sponsor']).length, 'one meeting is not a sponsor');
  for (let y = 0; y < 3; y++) { s.player.counters = {}; s.pending = []; ctx.doAction(s, 'sub_meeting'); ctx.habit(s, 'cocaine', 20); }
  ok(ctx.relPeople(s, ['sponsor']).length === 1, 'by the third meeting someone gives you their number');
  ok(ctx.kinTitle(s, ctx.relPeople(s, ['sponsor'])[0].id) === 'Sponsor', 'a sponsor is called a sponsor');
  const q = adult(30); ctx.habit(q, 'weed', 5);
  ok(!ACTIONS.sub_meeting.when(q), 'no meetings without a real habit');
  // Rehab resets things.
  const r = adult(30);
  ctx.habit(r, 'opioids', 80); g('subState')(r, 'opioids').tol = 70;
  ctx.subsRehab(r, 'opioids');
  ok(g('subState')(r, 'opioids').tol === 0 && g('subState')(r, 'opioids').rehab === r.year, 'rehab resets tolerance and is remembered');
  // The long road, and a year clean.
  const c = adult(30);
  ctx.habit(c, 'opioids', 70); ctx.subsYear(c);
  c.player.addictions = {}; c.year += 2; ctx.subsYear(c);
  ok(EVENTS.sb_clean_year.when(c), 'a year clean after a serious habit is noticed');
  c.pending = [];
  ctx.fireEvent(c, EVENTS.sb_clean_year);
  ok(g('subState')(c, 'opioids').marked && !EVENTS.sb_clean_year.when(c), 'once');
  ok(c.player.life.cleanYear === 1, 'and counted');
  const ach = g('ACHIEVEMENTS').find((a) => a.id === 'a_year_clean');
  ok(ach && ach.check(c), 'it earns an achievement');
}

/* 6. overdose ----------------------------------------------------------------------------------------------- */
{
  setSubs(true);
  const rate = (helper) => { let died = 0, wake = 0; for (let i = 0; i < 600; i++) { const s = adult(30); if (helper) person(s, 'friend', 70); s.pending = []; ctx.seedRng(2000 + i); if (ctx.subsOverdose(s, 'opioids')) died++; else if (pop(s, 'subWake')) wake++; } return { died, wake }; };
  const alone = rate(false), helped = rate(true);
  ok(helped.died < alone.died * 0.6, `someone nearby makes a real difference (${helped.died} vs ${alone.died} deaths of 600)`);
  ok(alone.died > 150 && helped.wake > 350, 'and it can end badly, or give a second chance');
  const s = adult(30); person(s, 'friend', 70); ctx.habit(s, 'opioids', 60);
  s.pending = []; ctx.seedRng(3); let guard = 0;
  while (!pop(s, 'subWake') && guard++ < 50) { s.dead = false; s.pending = []; ctx.subsOverdose(s, 'opioids'); }
  const pp = pop(s, 'subWake');
  for (const v of ['rehab', 'swear', 'shrug']) {
    const t = clone(s); let threw = null; try { ctx.resolvePopup(t, pop(t, 'subWake').id, pp.choices.findIndex((c) => c.value === v)); drain(t); } catch (e) { threw = e; }
    ok(!threw, `a second chance: ${v} ran`);
  }
  // Through the body year with the switch on: close calls, not only deaths.
  let wakes = 0, deaths = 0;
  for (let i = 0; i < 500; i++) { const t = adult(30); person(t, 'friend', 70); ctx.habit(t, 'pills', 90); t.pending = []; ctx.seedRng(5000 + i); ctx.bodyTick(t); if (t.dead) deaths++; if (pop(t, 'subWake')) wakes++; }
  ok(wakes > 0, `with the switch on, a habit year can bring a close call (${wakes}, ${deaths} deaths)`);
}

/* 7. dealers ------------------------------------------------------------------------------------------------- */
{
  setSubs(true);
  const s = adult(26);
  const d = person(s, 'dealer', 30);
  ok(ctx.kinTitle(s, d.id) === 'Dealer', 'a dealer is a dealer');
  ok(ACTIONS.sub_buy.when(s, d.id), 'you can call them');
  s.pending = [];
  ctx.doAction(s, 'sub_buy', d.id);
  const pp = pop(s, 'subBuy');
  ok(pp && pp.choices.some((c) => c.value === 'weed') && !pp.choices.some((c) => c.value === 'cocaine'), 'you start with the first rung');
  let bought = 0, arrested = 0, robbed = 0;
  for (let i = 0; i < 500; i++) {
    const t = adult(26); const dd = person(t, 'dealer', 30); t.pending = [];
    ctx.seedRng(7000 + i);
    ctx.doAction(t, 'sub_buy', dd.id);
    const q = pop(t, 'subBuy');
    ctx.resolvePopup(t, q.id, q.choices.findIndex((c) => c.value === 'weed'));
    if (pop(t, 'trial')) arrested++; else if (!((g('subsOf')(t).weed || {}).uses > 0)) robbed++; else bought++;
    drain(t, choose(null), 10);
  }
  ok(bought > 350 && arrested > 0 && robbed > 10, `a buy usually works and sometimes does not (${bought} bought, ${arrested} arrested, ${robbed} ripped off)`);
  ok(ctx.CRIMES ? true : !!g('CRIMES').possession, 'possession is a crime');
}

/* 8. a night ------------------------------------------------------------------------------------------------------- */
{
  setSubs(true);
  const s = adult(27); s.player.license = true;
  const venues = ctx.nightVenues(s);
  ok(venues.length === 3 && venues.map((v) => v.kind).join() === 'bar,club,after', 'a city has a bar, a club and an after-hours spot');
  ok(ctx.nightVenues(s) === venues, 'and they stay the same');
  s.pending = []; ctx.doAction(s, 'nightlife');
  const menu = pop(s, 'nightGo');
  ok(!!menu && menu.choices.find((c) => c.value === 'after').disabled, 'after-hours is invite only at first');
  ctx.nightMe(s).scene = 30;
  s.pending = []; ctx.doAction(s, 'nightlife');
  ok(!pop(s, 'nightGo').choices.find((c) => c.value === 'after').disabled, 'and opens once you are known');
  let nights = 0, dui = 0, drove = 0, hard = 0, intim = 0, deaths = 0, regulars = 0;
  for (let i = 0; i < 400; i++) {
    const t = adult(27); t.player.license = true; t.player.assets.push({ id: 'ac', kind: 'car', name: 'Car', value: 8000, cond: 70 });
    ctx.nightMe(t).scene = i % 3 === 0 ? 40 : 0;
    for (const id of ['weed', 'pills', 'partydrugs', 'cocaine']) if (i % 4 === 0) ctx.subsUse(t, id, { free: true });
    ctx.seedRng(9000 + i);
    t.pending = [];
    ctx.nightMenu(t);
    const m = pop(t, 'nightGo'); const open = m.choices.map((c, k) => [c, k]).filter(([c, k]) => !c.disabled && c.value);
    ctx.resolvePopup(t, m.id, open[i % open.length][1]);
    let steps = 0;
    while (pop(t, 'nightStep') && steps++ < 12) {
      const pp = pop(t, 'nightStep');
      ok(!BAD.test(pp.text), `night text is clean: ${pp.text}`);
      const o = pp.choices.map((c, k) => [c, k]).filter(([c]) => !c.disabled);
      const pickDrive = pp.ctx.k === 'home' && i % 5 === 0 ? o.find(([c]) => c.value === 'drive') : null;
      if (pickDrive) drove++;
      const [, k] = pickDrive || (pp.ctx.k === 'home' && i % 7 === 0 ? o.find(([c]) => c.value === 'home') : null) || o[ctx.randInt(0, o.length - 1)];
      if (pp.ctx.k === 'home' && pp.choices[k].value === 'home') intim++;
      ctx.resolvePopup(t, pp.id, k);
      if (t.dead) { deaths++; break; }
    }
    drain(t, choose(null), 20);
    if (ctx.nightMe(t).n > 0) nights++;
    if (pop(t, 'trial') || t.player.record.some((r) => r.crime === 'dui')) dui++;
    if (Object.keys(t.player.used || {}).some((k) => SUBSTANCES[k].tier >= 2)) hard++;
    if (ctx.relPeople(t, ['regular']).length) regulars++;
    ok(Number.isFinite(t.player.money) && P(t).stats.happy >= 0 && P(t).stats.happy <= 100, 'a night leaves stats in range');
  }
  ok(nights > 300, `nights run to the end (${nights} of 400)`);
  ok(dui > 0 && drove > 0, `drinking and driving gets people in trouble (${dui} arrests of ${drove} drives)`);
  ok(hard > 20, `hard offers come once you have used (${hard})`);
  ok(regulars > 120, `you meet people (${regulars})`);
  ok(deaths < 12, `and it almost never kills you outright (${deaths})`);
  // With Intimacy on, you can go home with someone.
  META.settings.mature_intimacy = true;
  ok(g('intimOn')(), 'intimacy can join in');
  setSubs(true);
}

/* 9. fallout ---------------------------------------------------------------------------------------------------------- */
{
  setSubs(true);
  const fix = (id) => {
    const s = adult(32); s.player.money = 100000; s.player.license = true;
    person(s, 'friend', 70); person(s, 'partner', 70); s.people[ctx.relPeople(s, ['partner'])[0].id].partner = s.playerId; P(s).partner = ctx.relPeople(s, ['partner'])[0].id;
    ctx.hire(s, 'bank', 1);
    ctx.habit(s, 'alcohol', 60); ctx.habit(s, 'cocaine', 70);
    ctx.subsUse(s, 'cocaine', { free: true }); ctx.subsUse(s, 'weed', { free: true });
    person(s, 'dealer', 30);
    if (id === 'sb_clean_year') { const st = g('subState')(s, 'opioids'); st.peak = 60; st.clean = 2; s.player.addictions.opioids = 0; }
    ctx.nightMe(s).scene = 20;
    return s;
  };
  for (const id of MY) {
    const ev = EVENTS[id];
    let fired = false;
    for (let tries = 0; tries < 10 && !fired; tries++) {
      const s = fix(id);
      if (!ctx.eventEligible(s, ev)) continue;
      s.pending = [];
      if (!ctx.fireEvent(s, ev)) continue;
      fired = true;
      const pp = s.pending[0];
      if (!pp) break;
      for (let i = 0; i < pp.choices.length; i++) {
        if (pp.choices[i].disabled) continue;
        for (let r = 0; r < 4; r++) {
          const t = clone(s); ctx.seedRng(50 + r * 7 + i);
          let threw = null;
          try { ctx.resolvePopup(t, t.pending[0].id, i); drain(t, null, 30); } catch (e) { threw = e; }
          ok(!threw, `${id} choice "${pp.choices[i].label}" ran (${threw && threw.stack.split('\n').slice(0, 3).join(' | ')})`);
        }
      }
    }
    ok(fired, `${id} can fire`);
  }
  // The screening fires people who use, and not people who do not.
  const dirty = fix('sb_drug_test'); const clean = adult(32); ctx.hire(clean, 'bank', 1);
  const run = (s0) => { let fired = 0; for (let i = 0; i < 100; i++) { const t = clone(s0); t.pending = []; ctx.seedRng(300 + i); ctx.fireEvent(t, EVENTS.sb_drug_test); ctx.resolvePopup(t, t.pending[0].id, 0); if (!t.player.career) fired++; } return fired; };
  ok(run(dirty) > 50 && run(clean) === 0, `a screening catches use (${run(dirty)} of 100 vs ${run(clean)})`);
  // A friend who overdoses can die, and you can save them.
  const f = fix('sb_friend_od');
  let saved = 0, lost = 0;
  for (let i = 0; i < 100; i++) { const t = clone(f); t.pending = []; ctx.seedRng(600 + i); ctx.fireEvent(t, EVENTS.sb_friend_od); const pid = t.pending[0].ctx.c.pid; ctx.resolvePopup(t, t.pending[0].id, 0); if (t.people[pid] && !t.people[pid].alive) lost++; else saved++; }
  ok(saved > 70 && lost > 0, `calling for help usually works (${saved} saved, ${lost} lost)`);
}

/* 10. long runs ----------------------------------------------------------------------------------------------------------- */
{
  setSubs(true); META.settings.mature_intimacy = true; META.settings.language = 'salty';
  for (let life = 0; life < 6; life++) {
    const s = adult(20); s.player.license = true; s.player.money = 2e6;
    for (let y = 0; y < 40 && !s.dead; y++) {
      s.player.counters = {}; s.year++;
      if (s.player.prison) s.player.prison = null;
      ctx.bodyTick(s); ctx.subsYear(s); ctx.intimTick(s);
      drain(s, null, 40);
      for (let k = 0; k < 3 && !s.dead; k++) {
        const av = ctx.actionList(s, 'social').concat(ctx.actionList(s, 'health')).filter((a) => a.id === 'nightlife' || a.id === 'sub_meeting' || a.id === 'rehab');
        if (av.length) { ctx.doAction(s, av[ctx.randInt(0, av.length - 1)].id); drain(s, null, 60); }
      }
      for (const id in s.player.addictions) ok(s.player.addictions[id] >= 0 && s.player.addictions[id] <= 100, `habit ${id} in range`);
      for (const id in s.player.subs || {}) { const st = s.player.subs[id]; ok(st.tol >= 0 && st.tol <= 100 && st.uses >= 0 && st.relapses >= 0, `substance state ${id} in range`); }
      ok(Number.isFinite(s.player.money) && P(s).stats.health >= 0 && P(s).stats.health <= 100, 'a life stays sane');
    }
    const copy = clone(s);
    ok(JSON.stringify(copy.player.subs) === JSON.stringify(s.player.subs) && JSON.stringify(copy.nightlife) === JSON.stringify(s.nightlife), 'it saves whole');
  }
  setSubs(false);
}

console.log(failures ? `\n❌ ${failures} substance and nightlife checks failed.` : `✅ Substance and nightlife checks passed (${checks} checks).`);
process.exit(failures ? 1 : 0);
