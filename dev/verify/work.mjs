// Career-cards verification:  node dev/verify/work.mjs
//
// Covers 65-work.js and 66-work-decks.js:
//   1. the decks   — every deck is on a real job, every card is complete and every way uses a real skill
//   2. the deal    — a year's turn deals a hand, offers the first card, and leaves the rest on your desk
//   3. playing     — every card, every way, many seeds: no errors, the meter stays in range, no stray tokens in the text
//   4. outcomes    — all wins, a split and all losses come out as good, so-so and bad, and move the meter
//   5. autopilot   — what you leave is handled for you, and logged
//   6. people      — a card's person becomes someone you know, the cast is capped, and a confidence is a web secret
//   7. the career  — the meter feeds performance, a bad record gets you fired, an astronaut cannot skip training
//   8. extras      — journalists can publish, a doctor who spreads a patient's secret pays for it, leaving clears the desk
//   9. long runs   — thirty years in every career stay in range and save whole
import { loadGame } from './loadgame.mjs';

const ctx = loadGame({ quiet: true });
const g = (name) => ctx.run(name);
ctx.seedRng(6503);
ctx.console.error = () => {};
let failures = 0, checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) { failures++; console.log('  ✖ ' + msg); } };
const WORKDECK = g('WORKDECK'), SKILLS = g('SKILLS'), JOBS = g('JOBS'), META = g('META'), ACTIONS = g('ACTIONS');
const clone = (s) => JSON.parse(JSON.stringify(s));
const P = (s) => s.people[s.playerId];
const pop = (s, handler) => s.pending.find((p) => p.handler === handler);
const BAD_TEXT = /undefined|NaN|\[who\]|\[first\]|\[amt\]|\[object/;
const drain = (s, pickFn) => {
  for (let k = 0; k < 80 && s.pending.length; k++) {
    const p = s.pending[0];
    ok(!BAD_TEXT.test(p.text) && !BAD_TEXT.test(p.title) && p.choices.every((c) => !BAD_TEXT.test(String(c.label) + ' ' + String(c.sub || ''))), `clean popup text "${p.title}: ${p.text}"`);
    const open = p.choices.map((c, i) => [c, i]).filter(([c]) => !c.disabled);
    const [, i] = pickFn ? pickFn(p, open) : open[0];
    ctx.resolvePopup(s, p.id, i, p.input ? 'X' : undefined);
  }
};
const adult = (age) => {
  const s = ctx.createLife({ country: 'us', year: 2000 });
  s.year = 2000 + age; s.pending = [];
  s.player.edu.current = null;
  s.player.money = 500000;
  for (const k of Object.keys(SKILLS)) s.player.skills[k] = 50;
  P(s).stats.smarts = 70;
  return s;
};
const inRange = (s, where) => {
  for (const id in s.player.work || {}) {
    const st = s.player.work[id];
    ok(st.m >= 0 && st.m <= 100, `meter ${id}=${st.m} in range ${where}`);
    ok(st.hand.length <= 6, `hand ${st.hand.length} ${where}`);
    for (const h of st.hand) ok(!!ctx.wkCard(id, h.cid), `card ${h.cid} exists ${where}`);
  }
};
const job = (id, level) => { const s = adult(30); ctx.hire(s, id, level ?? 0); return s; };

/* 1. the decks -------------------------------------------------------------------- */
{
  ok(Object.keys(WORKDECK).length >= 8, `at least eight careers have decks (${Object.keys(WORKDECK).length})`);
  for (const id of Object.keys(WORKDECK)) {
    const d = WORKDECK[id];
    ok(!!JOBS[id], `${id} is a real job`);
    ok(d.meter && d.meter.name && d.meter.words.length >= 4 && d.meter.start >= 0 && d.meter.start <= 100, `${id} has a meter`);
    const ids = new Set();
    for (const k of d.cards) {
      ok(!ids.has(k.id), `${id}/${k.id} is unique`); ids.add(k.id);
      ok(k.name && k.emoji && k.ok && k.meh !== undefined && k.bad !== undefined || (k.name && k.emoji && k.ok && k.bad), `${id}/${k.id} has a name, an emoji and its endings`);
      ok(Array.isArray(k.stages) && k.stages.length >= 1, `${id}/${k.id} has stages`);
      for (const st of k.stages) {
        ok(st.text && st.ways.length >= 2, `${id}/${k.id} has a decision with choices`);
        for (const w of st.ways) ok(w[0] && (SKILLS[w[1]] || ['smarts', 'looks', 'health'].includes(w[1])), `${id}/${k.id} way "${w[0]}" uses a real skill (${w[1]})`);
      }
      const fill = { who: 'Ann Lee', first: 'Ann', amt: 700 };
      for (const text of [k.ok, k.meh, k.bad, k.intro, ...k.stages.map((x) => x.text), ...k.stages.map((x) => x.ok), ...k.stages.map((x) => x.bad)]) ok(!BAD_TEXT.test(ctx.wkFmt(text, fill)), `${id}/${k.id} text is clean once filled in`);
    }
  }
  ok(!!ACTIONS.wk_work && !!ACTIONS.wk_publish, 'the desk and publish actions exist');
}

/* 2. the deal ------------------------------------------------------------------------ */
{
  for (const id of Object.keys(WORKDECK)) {
    const s = job(id, 1);
    s.pending = [];
    s.year++;
    ctx.careerTick(s);
    const st = s.player.work[id];
    ok(st && st.hand.length >= 2, `${id} deals a hand (${st && st.hand.length})`);
    ok(pop(s, 'wkStage') && pop(s, 'wkStage').choices.some((c) => c.value === 'later'), `${id} offers the first card, and you can put it off`);
    drain(s);
    ok(s.player.work[id].hand.length >= 1, `${id}: putting it off leaves it on the desk`);
  }
  const s = job('doctor', 0);
  s.year++; ctx.careerTick(s); s.pending = [];
  ok(ACTIONS.wk_work.when(s), 'the desk action is available with cards waiting');
  ctx.doAction(s, 'wk_work');
  ok(!!pop(s, 'wkPick'), 'it lists what is on your desk');
  ok(!ACTIONS.wk_work.when(adult(30)), 'and is hidden with no deck');
}

/* 3. playing every card ------------------------------------------------------------------ */
{
  let played = 0;
  for (const id of Object.keys(WORKDECK)) {
    for (const k of WORKDECK[id].cards) {
      for (let seed = 0; seed < 6; seed++) {
        const s = job(id, Math.min(k.min || 0, JOBS[id].ladder.length - 1));
        ctx.seedRng(100 * seed + k.id.length);
        const st = ctx.wkState(s, id);
        st.hand.push({ hid: 'ht', cid: k.id, c: ctx.wkCtx(s, k) });
        s.pending = [];
        let threw = null;
        try {
          ctx.wkStart(s, 'ht');
          let guard = 0;
          while (pop(s, 'wkStage') && guard++ < 8) {
            const pp = pop(s, 'wkStage');
            const open = pp.choices.map((c, i) => [c, i]).filter(([c]) => !c.disabled && c.value !== 'later');
            ctx.resolvePopup(s, pp.id, open[(seed + guard) % open.length][1]);
          }
          drain(s);
        } catch (e) { threw = e; }
        ok(!threw, `${id}/${k.id} seed ${seed} ran (${threw && threw.stack.split('\n').slice(0, 3).join(' | ')})`);
        if (!threw) { inRange(s, `${id}/${k.id}`); played++; }
        if (s.dead) continue;
        ok(st.ok + st.meh + st.bad === 1 || s.dead, `${id}/${k.id} counts once (${st.ok + st.meh + st.bad})`);
      }
    }
  }
  ok(played > 250, `lots of cards were played (${played})`);
}

/* 4. outcomes ------------------------------------------------------------------------------- */
{
  const k = WORKDECK.doctor.cards.find((x) => x.id === 'er_night');
  const run = (res) => {
    const s = job('doctor', 1);
    const st = ctx.wkState(s, 'doctor'); const m0 = st.m;
    const r = ctx.wkConclude(s, 'doctor', k, { who: 'Ann Lee', first: 'Ann', amt: 700 }, res, false);
    return { r, st, d: st.m - m0, s };
  };
  const a = run([1, 1]), b = run([1, 0]), c = run([0, 0]);
  ok(a.st.ok === 1 && a.d > 0 && a.r.tone === 'good', 'all wins is a good result that raises the meter');
  ok(b.st.meh === 1 && Math.abs(b.d) < Math.abs(a.d), 'a split is so-so');
  ok(c.st.bad === 1 && c.d < 0 && c.r.tone === 'bad', 'all losses is bad and lowers the meter');
  ok(/earned/.test(a.r.text) && !/earned/.test(c.r.text), 'a good result pays the bonus; a bad one does not');
  const three = run([1, 0, 0]);
  ok(three.st.bad === 1, 'one win in three is still bad');
  ok(run([1]).st.ok === 1 && run([0]).st.bad === 1, 'a single decision is good or bad');
}

/* 5. autopilot -------------------------------------------------------------------------------- */
{
  const s = job('bartender', 1);
  s.year++; s.pending = [];
  ctx.careerTick(s); s.pending = [];
  const before = s.player.work.bartender.hand.length;
  s.year++;
  ctx.careerTick(s);
  const last = s.log[s.log.length - 1];
  ok(before >= 2 && last.lines.some((l) => /autopilot/.test(l.t)), 'what you leave on the desk is handled and logged');
  const st = s.player.work.bartender;
  ok(st.ok + st.meh + st.bad >= before, 'autopilot jobs count in your record');
  // Doing it yourself with the best way beats autopilot over many tries.
  let hands = 0, auto = 0;
  const k = WORKDECK.bartender.cards.find((x) => x.id === 'rowdy');
  for (let i = 0; i < 200; i++) {
    const t = job('bartender', 1);
    const S = ctx.wkState(t, 'bartender');
    const best = Math.max(...k.stages[0].ways.map((w) => ctx.wkOdds(t, k, w, S)));
    const worse = Math.max(...k.stages[0].ways.map((w) => ctx.wkOdds(t, k, w, S, 0.08)));
    if (best > worse) hands++;
    auto++;
  }
  ok(hands === auto, 'autopilot is always a little worse than playing it yourself');
}

/* 6. people ----------------------------------------------------------------------------------- */
{
  const s = job('doctor', 0);
  const k = WORKDECK.doctor.cards.find((x) => x.id === 'er_night');
  const c = ctx.wkCtx(s, k);
  ok(c.pid && ctx.relKind(s, c.pid) === 'patient' && c.who === ctx.fullName(s.people[c.pid]), 'a card’s person becomes a patient you know');
  ok(ctx.kinTitle(s, c.pid) === 'Patient', 'and shows up with the right label');
  ok(typeof ctx.webTies(s, s.people[c.pid]).has === 'function', 'patients tie into the web');
  ok(Object.values(ctx.WK_ROLES || g('WK_ROLES')).includes('patient'), 'patient is a role');
  for (let i = 0; i < 40; i++) ctx.wkCtx(s, k);
  ok(ctx.relPeople(s, ['patient']).length <= 8, `the cast is capped (${ctx.relPeople(s, ['patient']).length})`);
  // A regular confides.
  META.settings.mature = false;
  const t = job('bartender', 0);
  const conf = WORKDECK.bartender.cards.find((x) => x.id === 'confidant');
  let learned = 0;
  for (let i = 0; i < 20; i++) {
    const u = job('bartender', 0);
    ctx.seedRng(500 + i);
    const st = ctx.wkState(u, 'bartender');
    st.hand.push({ hid: 'ht', cid: 'confidant', c: ctx.wkCtx(u, conf) });
    ctx.wkStart(u, 'ht');
    const pp = pop(u, 'wkStage');
    ctx.resolvePopup(u, pp.id, 0);
    if (pop(u, 'webHear')) learned++;
    ok(!pop(u, 'webHear') || ctx.webHeard(u).some((x) => x.via === 'regular'), 'a confidence is a secret you know, and remember where it came from');
  }
  ok(learned > 5, `a regular sometimes confides (${learned} of 20)`);
}

/* 7. the career ---------------------------------------------------------------------------------- */
{
  const s = job('chef', 1);
  const st = ctx.wkState(s, 'chef');
  st.m = 90; s.player.career.perf = 50;
  ctx.wkYear(s, s.player.career);
  ok(s.player.career.perf > 50, 'a strong meter lifts performance');
  const t = job('chef', 1);
  const tt = ctx.wkState(t, 'chef');
  tt.m = 2;
  let fired = false;
  for (let i = 0; i < 40 && !fired; i++) { tt.m = 2; ctx.wkYear(t, t.player.career); fired = !t.player.career; t.pending = []; }
  ok(fired, 'a ruined record gets you fired');
  // An astronaut cannot skip training.
  const a = job('astronaut', 0);
  const as = ctx.wkState(a, 'astronaut');
  a.player.career.levelYears = 5;
  ctx.wkYear(a, a.player.career);
  ok(a.player.career.levelYears === 0, 'a candidate who has not trained does not move up');
  const b = job('astronaut', 0);
  ctx.wkState(b, 'astronaut').flags.cert = 3;
  b.player.career.levelYears = 5;
  ctx.wkYear(b, b.player.career);
  ok(b.player.career.levelYears === 5, 'a certified candidate can');
  const mission = WORKDECK.astronaut.cards.find((x) => x.id === 'mission');
  const f = job('astronaut', 1);
  const fs = ctx.wkState(f, 'astronaut');
  ok(mission.when(f, f.player.career, fs), 'a first mission is available');
  fs.flags.lastFlight = f.year;
  ok(!mission.when(f, f.player.career, fs), 'but not two years running');
  const c1 = job('astronaut', 1);
  ctx.wkConclude(c1, 'astronaut', mission, { amt: 1000 }, [1, 1, 1, 1], false);
  ok(ctx.wkState(c1, 'astronaut').flags.flights === 1 && ctx.wkState(c1, 'astronaut').flags.lastFlight === c1.year, 'a flown mission is counted');
  ok(WORKDECK.astronaut.cards.filter((x) => x.max === 0).length >= 4, 'candidates have a training deck');
}

/* 8. extras ----------------------------------------------------------------------------------------- */
{
  const s = job('journalist', 1);
  const subj = ctx.makeAdultNear(s, { minAge: 30, maxAge: 50 });
  ctx.setRel(s, subj.id, 'coworker', 50);
  const sec = ctx.webNewSecret(s, 'npc_crime', subj.id, { knows: [s.playerId, ctx.makeAdultNear(s, {}).id, ctx.makeAdultNear(s, {}).id], ev: 70, note: 'a bar fight' });
  ok(ACTIONS.wk_publish.when(s), 'a journalist who has heard something can publish it');
  let printed = 0, retracted = 0;
  for (let i = 0; i < 40; i++) {
    const t = clone(s);
    ctx.seedRng(800 + i);
    ctx.doAction(t, 'wk_publish');
    const pp = pop(t, 'wkPublish');
    ctx.resolvePopup(t, pp.id, 0);
    const x = ctx.webOf(t).secrets[sec.id];
    if (x.out) printed++; else retracted++;
  }
  ok(printed > 20, `strong proof gets printed (${printed} of 40)`);
  const weak = job('journalist', 1);
  const wsub = ctx.makeAdultNear(weak, { minAge: 30, maxAge: 50 });
  const wsec = ctx.webNewSecret(weak, 'npc_debt', wsub.id, { knows: [weak.playerId], ev: 5 });
  let bad = 0;
  for (let i = 0; i < 40; i++) {
    const t = clone(weak);
    ctx.seedRng(900 + i);
    ctx.doAction(t, 'wk_publish');
    const pp = pop(t, 'wkPublish');
    ctx.resolvePopup(t, pp.id, 0);
    if (ctx.webRep(P(t)).scandal > 0) bad++;
  }
  ok(bad > 15, `thin proof often ends in a retraction (${bad} of 40)`);
  // A doctor who spreads a patient's secret pays for it.
  const d = job('doctor', 1);
  const patient = ctx.makeAdultNear(d, { minAge: 30, maxAge: 60 });
  ctx.setRel(d, patient.id, 'patient', 50);
  const friendP = ctx.makeAdultNear(d, { minAge: 25, maxAge: 40 });
  ctx.setRel(d, friendP.id, 'friend', 60);
  const ds = ctx.webNewSecret(d, 'npc_habit', patient.id, { knows: [d.playerId], note: 'drinking' });
  ds.via = 'patient';
  const sc0 = ctx.webRep(P(d)).scandal;
  ctx.webHearsay(d, ds, patient.id, true);
  const hp = pop(d, 'webHear');
  ctx.resolvePopup(d, hp.id, hp.choices.findIndex((c) => c.value === 'spread'));
  ok(ctx.webRep(P(d)).scandal > sc0, 'spreading what a patient told you costs your name');
  // Leaving the job clears the desk.
  const l = job('pilot', 0);
  l.year++; ctx.careerTick(l); l.pending = [];
  ok(ctx.wkState(l, 'pilot').hand.length > 0, 'there is something on the desk');
  ctx.leaveJob(l, 'quit');
  ok(ctx.wkState(l, 'pilot').hand.length === 0, 'quitting clears it');
}

/* 9. long runs ------------------------------------------------------------------------------------------ */
{
  for (const id of Object.keys(WORKDECK)) {
    const s = job(id, 0);
    s.player.money = 5e6;
    for (let y = 0; y < 30 && !s.dead; y++) {
      s.year++; s.player.counters = {};
      if (s.player.prison) s.player.prison = null;
      if (!s.player.career) { ctx.hire(s, id, 0); }
      ctx.careerTick(s);
      drain(s, (p, open) => open[Math.floor(Math.random() * open.length)]);
      if (s.player.career && s.player.career.id === id) {
        const st = ctx.wkState(s, id);
        for (const h of st.hand.slice(0, 2)) { ctx.wkStart(s, h.hid); drain(s, (p, open) => open[Math.floor(Math.random() * open.length)]); }
      }
      inRange(s, `${id} year ${y}`);
    }
    const copy = clone(s);
    ok(JSON.stringify(copy.player.work) === JSON.stringify(s.player.work), `${id}: the desk saves and loads whole`);
  }
}

console.log(failures ? `\n❌ ${failures} career-card checks failed.` : `✅ Career-card checks passed (${checks} checks).`);
process.exit(failures ? 1 : 0);
