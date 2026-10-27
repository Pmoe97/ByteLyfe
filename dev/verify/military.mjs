// Military depth verification:  node dev/verify/military.mjs
//
// Covers 59-military.js:
//   1. gating — nothing military shows for a civilian in peacetime; a war opens the menu
//   2. wars — they start and end, are kept per country, announce themselves, bring the draft,
//      and the record survives a save round trip
//   3. enlisting — branch and specialty popups, basic training, a term, the term-end popup
//   4. deployments — danger follows posture and intensity, every defining moment resolves,
//      wounds and medals are counted, a prisoner of war comes home
//   5. the draft — every answer works: report, defer, objector, flee, bribe
//   6. desertion — AWOL costs rank, desertion is hunted, courts-martial end in a dishonorable
//      discharge, an amnesty and turning yourself in are possible
//   7. veterans — discharge decides benefits: care, home loan, schooling, disability pay
//   8. pensions, officer and special forces paths, objectors, God Mode careers
//   9. relatives at war
import { loadGame } from './loadgame.mjs';

const ctx = loadGame({ quiet: true });
const g = (name) => ctx.run(name);
ctx.seedRng(5150);
let failures = 0;
const ok = (cond, msg) => { if (!cond) { failures++; console.log('  ✖ ' + msg); } };
const META = g('META'), ACTIONS = g('ACTIONS'), EVENTS = g('EVENTS');
// Answers popups with their first enabled choice.
const drain = (s) => { for (let k = 0; k < 50 && s.pending.length; k++) { const p = s.pending[0]; ctx.resolvePopup(s, p.id, Math.max(0, p.choices.findIndex((c) => !c.disabled)), p.input ? 'X' : undefined); } };
const act = (s, id, t) => { s.pending = []; return ctx.doAction(s, id, t); };
const answer = (s, value) => { const pp = s.pending.find((p) => p.handler); if (!pp) return false; const i = pp.choices.findIndex((c) => c.value === value); return ctx.resolvePopup(s, pp.id, i < 0 ? 0 : i); };
const adult = (age, o) => { const s = ctx.createLife(Object.assign({ country: 'us', year: 2000 }, o)); s.year = 2000 + age; s.pending = []; s.player.edu.current = null; s.player.edu.degrees.push({ type: 'high' }); s.player.skills.fitness = 40; return s; };
const clone = (s) => JSON.parse(JSON.stringify(s));
const startWar = (s, intensity, extra) => {
  const cc = s.people[s.playerId].country;
  const w = ctx.makeWar(s, cc);
  Object.assign(w, { intensity, start: s.year - 1 }, extra || {});
  const slot = ctx.warSlot(s, cc);
  slot.war = w;
  return w;
};
// Recruiters turn down one applicant in ten, so try again.
const enlist = (s, id) => { s.player.skills.fitness = 60; let r; for (let i = 0; i < 40 && !(s.player.career && s.player.career.id === (id || 'military')); i++) { s.pending = []; s.player.counters = {}; r = ctx.applyJob(s, id || 'military'); } drain(s); return r; };

/* 1. gating ------------------------------------------------------------------- */
{
  const s = adult(30);
  ok(ctx.actionList(s, 'mil').length === 0, 'a civilian in peacetime sees no Military menu');
  startWar(s, 3);
  ok(ctx.actionList(s, 'mil').length > 0, 'a war opens the menu to civilians (protest, bonds, volunteering)');
  ok(ctx.actionList(s, 'mil').every((a) => ['war_protest', 'war_bonds', 'war_volunteer'].includes(a.id)), 'a civilian sees only home-front actions');
  const t = adult(30);
  ok(!t.player.mil, 'no service record until you serve');
  const before = JSON.stringify(t.player);
  ctx.militaryTick(t);
  ok(JSON.stringify(t.player).replace(/"flags":\{[^}]*\}/, '') === before.replace(/"flags":\{[^}]*\}/, '') || !t.player.mil, 'the tick does not give a civilian a service record');
}

/* 2. wars ---------------------------------------------------------------------- */
{
  let started = 0, ended = 0, drafts = 0, longest = 0, bonds = 0;
  for (let lives = 0; lives < 40; lives++) {
    const s = adult(20);
    for (let y = 0; y < 80; y++) {
      s.year++;
      const w0 = ctx.activeWar(s);
      ctx.warYear(s);
      const w1 = ctx.activeWar(s);
      if (!w0 && w1) started++;
      if (w0 && !w1) ended++;
      if (w1) { longest = Math.max(longest, s.year - w1.start); if (w1.draft) drafts++; }
      s.pending = [];
    }
    ok(s.wars.log.every((l) => l.result === 'victory' || l.result === 'defeat' || l.result === 'ceasefire'), 'every finished war has a result');
  }
  ok(started > 20 && started < 200, `wars start at a sane rate (${started} in 40 lives of 80 years)`);
  ok(Math.abs(started - ended) <= 40, `wars end (${started} started, ${ended} ended)`);
  ok(longest <= 11, `no war lasts past a decade (${longest})`);
  ok(drafts > 0, 'some wars bring the draft');
  const s = adult(20);
  const w = startWar(s, 4);
  ok(ctx.activeWar(s) && ctx.activeWar(s).id === w.id, 'activeWar reads the war back');
  s.player.warBonds = 4000;
  const m = s.player.money;
  ctx.endWar(s, ctx.warSlot(s, 'us'), Object.assign(w, { momentum: 3 }));
  ok(s.wars.log.length === 1 && s.wars.log[0].result === 'victory', 'a winning war is logged as a victory');
  ok(s.player.money > m + 4000, 'war bonds pay out more after a victory');
  const back = JSON.parse(JSON.stringify(s));
  ok(JSON.stringify(back.wars) === JSON.stringify(s.wars), 'the war book survives a save round trip');
  const t = adult(25, { country: 'jp' });
  startWar(t, 2);
  ok(!ctx.activeWar(t, 'us'), 'a war in one country is not a war in another');
}

/* 3. enlisting ------------------------------------------------------------------- */
{
  const s = adult(20);
  s.player.skills.fitness = 60;
  for (let i = 0; i < 40 && !s.player.career; i++) { s.pending = []; s.player.counters = {}; ctx.applyJob(s, 'military'); } // recruiters turn down one in ten
  ok(s.player.career && s.player.career.id === 'military', 'enlisting starts the career');
  ok(s.pending.length === 1 && s.pending[0].handler === 'milBranch', 'the first popup picks a branch');
  answer(s, 'navy');
  ok(s.pending[0] && s.pending[0].handler === 'milSpec', 'then a specialty');
  ok(!s.pending[0].choices.some((c) => c.value === 'pilot'), 'enlisted recruits can not pick the aviator specialty');
  answer(s, 'medic');
  const m = s.player.mil;
  ok(m.branch === 'navy' && m.spec === 'medic' && m.termEnd === s.year + 4 && !m.trained, 'the choices are saved on the record');
  s.pending = [];
  ctx.ageUp(s); drain(s);
  ok(s.player.mil.trained && s.player.mil.served === 1, 'the first year is basic training');
  ok(!s.player.mil.tours.length, 'there are no deployments in basic training');
  // The term end.
  s.player.mil.termEnd = s.year + 1;
  for (let k = 0; k < 6 && !s.dead; k++) { s.pending = []; ctx.ageUp(s); if (s.pending.some((p) => p.handler === 'milTerm')) break; }
  const term = s.pending.find((p) => p.handler === 'milTerm');
  ok(!!term, 'the end of a term asks whether you will stay');
  if (term) {
    const money = s.player.money;
    answer(s, 'stay');
    ok(s.player.mil.termEnd >= s.year + 3 && s.player.money > money, 're-enlisting pays a bonus and starts another term');
    s.pending = [];
    s.player.mil.termEnd = s.year;
    s.pending = [];
    let t = null;
    for (let k = 0; k < 4 && !t; k++) { s.pending = []; s.player.mil.termEnd = s.year + 1; ctx.ageUp(s); t = s.pending.find((p) => p.handler === 'milTerm'); if (s.dead) break; }
    if (t) { answer(s, 'leave'); }
    ok(!s.player.career && s.player.mil.vet && s.player.mil.discharge === 'honorable', 'leaving at the end of a term is an honorable discharge and makes you a veteran');
  }
  const x = adult(20);
  x.player.record.push({ crime: 'burglary', year: 2010, years: 2 });
  const rr = ctx.applyJob(x, 'military');
  ok(!x.player.career, 'a felony keeps you out of the service');
}

/* 4. deployments ------------------------------------------------------------------- */
{
  const trial = (post, I, n) => {
    let dead = 0, wounded = 0, medals = 0, captured = 0, popups = 0;
    for (let i = 0; i < n; i++) {
      const s = adult(22);
      enlist(s, 'military');
      const m = s.player.mil; m.branch = 'army'; m.spec = 'combat'; m.trained = true;
      const w = startWar(s, I);
      s.pending = [];
      ctx.runTour(s, post, w);
      if (s.dead) dead++;
      if (m.wounds.length) wounded++;
      if (m.medals.valor) medals++;
      if (s.pending.some((p) => p.handler === 'milPOW')) captured++;
      if (s.pending.some((p) => p.handler === 'milMoment')) popups++;
    }
    return { dead: dead / n, wounded: wounded / n, medals: medals / n, captured: captured / n, moments: popups / n };
  };
  const rear = trial('rear', 3, 300), serve = trial('serve', 3, 300), front = trial('front', 3, 300), total = trial('front', 4, 300), mild = trial('serve', 1, 300);
  ok(rear.dead <= serve.dead + 0.01 && serve.dead <= front.dead + 0.02, `danger follows posture (rear ${rear.dead.toFixed(3)}, serve ${serve.dead.toFixed(3)}, front ${front.dead.toFixed(3)})`);
  ok(total.dead >= mild.dead, `danger follows intensity (total ${total.dead.toFixed(3)} vs limited ${mild.dead.toFixed(3)})`);
  ok(front.dead < 0.15 && total.dead < 0.2, `a tour is dangerous, not hopeless (front line ${front.dead.toFixed(3)})`);
  ok(front.wounded > rear.wounded, `the front line gets more wounded (${front.wounded.toFixed(2)} vs ${rear.wounded.toFixed(2)})`);
  ok(front.medals > rear.medals, `the front line earns more valor medals (${front.medals.toFixed(2)} vs ${rear.medals.toFixed(2)})`);
  ok(front.moments > 0.15 && rear.moments === 0, 'defining moments happen at the front, not in the rear');
  console.log(`  deployments: rear ${JSON.stringify(rear)} · serve ${JSON.stringify(serve)} · front ${JSON.stringify(front)}`);
  // Every defining moment, every choice.
  const MOMENTS = g('MOMENTS');
  let total_ = 0;
  for (const mid of MOMENTS) {
    for (let i = 0; i < mid.choices.length; i++) {
      for (let k = 0; k < 12; k++) {
        const s = adult(22);
        enlist(s, 'military');
        s.player.mil.trained = true;
        const w = startWar(s, 4);
        s.pending = [];
        try {
          const text = mid.text(s, w);
          ok(typeof text === 'string' && text.length > 10, `${mid.id}: text`);
          ctx.resolvePopup; // keep the lint quiet
          const pp = ctx.popup(s, { handler: 'milMoment', ctx: { id: mid.id, wid: w.id }, choices: mid.choices.map((c, j) => ({ label: c[0], value: j })) });
          ctx.resolvePopup(s, pp.id, i);
          total_++;
        } catch (e) { ok(false, `${mid.id} choice ${i} threw: ${e.message}`); }
      }
    }
  }
  ok(total_ > 100, 'every moment choice resolved');
  // A prisoner of war comes home (or doesn't die).
  for (const v of ['escape', 'wait', 'talk']) {
    const s = adult(22); enlist(s, 'military'); s.player.mil.trained = true;
    s.pending = [];
    const pp = ctx.popup(s, { handler: 'milPOW', ctx: {}, choices: [{ label: 'x', value: v }] });
    ctx.resolvePopup(s, pp.id, 0);
    ok(!s.dead && s.player.mil.ptsd >= 15, `prisoner of war (${v}): you survive with scars`);
  }
  // Peacetime deployments are safe.
  const calm = trial('serve', 0.4, 200);
  ok(calm.dead < 0.01, `peacetime postings are nearly safe (${calm.dead.toFixed(3)})`);
}

/* 5. the draft ----------------------------------------------------------------------------- */
{
  for (const v of ['report', 'defer', 'co', 'flee', 'bribe']) {
    for (let k = 0; k < 6; k++) {
      const s = adult(21);
      s.player.money = 100000;
      const w = startWar(s, 4, { draft: true });
      s.pending = [];
      ctx.draftYear(s, w);
      let pp = s.pending.find((p) => p.handler === 'milDraft');
      if (!pp) { s.player.flags = {}; for (let t = 0; t < 12 && !pp; t++) { ctx.draftYear(s, w); pp = s.pending.find((p) => p.handler === 'milDraft'); delete s.player.flags['draft_' + w.id]; } }
      ok(!!pp, 'a draft-age adult gets a notice in a draft war');
      if (!pp) continue;
      s.player.flags['draft_' + w.id] = s.year;
      try { ctx.resolvePopup(s, pp.id, pp.choices.findIndex((c) => c.value === v)); drain(s); } catch (e) { ok(false, `draft answer ${v} threw: ${e.stack.split('\n').slice(0, 2).join(' | ')}`); }
      if (v === 'report') ok(s.player.career && s.player.mil.drafted && s.player.mil.termEnd === s.year + 2, 'reporting for duty makes you a draftee on a two-year term');
      if (v === 'flee') ok(s.player.mil && s.player.mil.dodger && ctx.lifeCount(s, 'dodgers') === 1, 'fleeing is recorded');
      if (v === 'co' && s.player.mil && s.player.mil.co) ok(!s.player.career, 'an approved objector does not serve');
    }
  }
  const old = adult(45), w = startWar(old, 4, { draft: true });
  old.pending = []; ctx.draftYear(old, w);
  ok(!old.pending.length, 'a 45-year-old is not drafted');
  const stu = adult(19);
  stu.player.edu.current = { kind: 'college', cost: 1000 };
  ok(ctx.deferEligible(stu), 'students can claim a deferment');
}

/* 6. desertion ---------------------------------------------------------------------------------- */
{
  const s = adult(22);
  enlist(s, 'military');
  s.player.mil.trained = true;
  const c = s.player.career; c.level = 2; c.salary = ctx.salaryFor(s, 'military', 2);
  act(s, 'mil_awol');
  answer(s, 'awol');
  ok(s.player.career && s.player.career.level <= 2, 'going AWOL and coming back keeps you in the service');
  ok(s.player.career.perf < 50, 'going AWOL hurts your record');
  act(s, 'mil_awol');
  answer(s, 'city');
  ok(!s.player.career && g('isDeserter')(s), 'deserting ends the career and marks you wanted');
  ok(ctx.actionList(s, 'mil').some((a) => a.id === 'mil_turnin'), 'a deserter can turn themselves in');
  s.player.money = 100000;
  let caught = false;
  for (let y = 0; y < 60 && !caught; y++) { s.year++; s.pending = []; ctx.deserterYear(s); caught = s.pending.some((p) => p.handler === 'milCourt'); }
  ok(caught, 'a deserter is eventually caught');
  s.player.money = 100000;
  const rec = s.player.record.length;
  answer(s, 'lawyer');
  ok(s.player.mil.discharge === 'dishonorable' || (s.player.mil.discharge === 'oth' && !s.player.prison), 'a court-martial ends in a dishonorable discharge (or an acquittal)');
  if (s.player.mil.discharge === 'dishonorable') {
    ok(!ctx.vetHas(s, 'care') && !ctx.vetHas(s, 'loan') && !ctx.vetHas(s, 'edu'), 'a dishonorable discharge loses every benefit');
    ok(ctx.hasFelony(s), 'desertion is a felony');
    ok(s.player.record.length > rec, 'the conviction goes on the record');
  }
  // Heading for the border is harder to catch than staying home.
  const catchRate = (hide) => { let n = 0; for (let i = 0; i < 400; i++) { const t = adult(22); enlist(t, 'military'); t.player.mil.trained = true; act(t, 'mil_awol'); answer(t, hide); t.pending = []; ctx.deserterYear(t); if (t.pending.some((p) => p.handler === 'milCourt')) n++; } return n / 400; };
  const fam = catchRate('family'), bor = catchRate('border');
  ok(fam > bor, `hiding at home is riskier than crossing the border (${fam.toFixed(2)} vs ${bor.toFixed(2)})`);
  // Amnesty and turning yourself in.
  const a = adult(22); enlist(a, 'military'); a.player.mil.trained = true; act(a, 'mil_awol'); answer(a, 'family');
  const w = startWar(a, 2); ctx.endWar(a, ctx.warSlot(a, 'us'), w);
  a.year += 1;
  ok(EVENTS.mil_amnesty.when(a), 'an amnesty is offered after a war ends');
  const b = adult(22); enlist(b, 'military'); b.player.mil.trained = true; act(b, 'mil_awol'); answer(b, 'family');
  act(b, 'mil_turnin');
  ok(b.pending.some((p) => p.handler === 'milCourt'), 'turning yourself in goes to court');
  // Can't just walk back in.
  const d = adult(22); enlist(d, 'military'); d.player.mil.trained = true; act(d, 'mil_awol'); answer(d, 'family'); d.pending = [];
  const rr = ctx.applyJob(d, 'military');
  ok(!d.player.career, 'a deserter can not re-enlist');
}

/* 7. veterans ------------------------------------------------------------------------------------- */
{
  const mk = (type) => { const s = adult(30); enlist(s, 'military'); const m = s.player.mil; m.trained = true; m.served = 6; m.ptsd = 50; m.wounds.push({ y: 2020, sev: 20 }); m.next = type; ctx.leaveJob(s, 'discharged'); return s; };
  const h = mk('honorable');
  ok(h.player.mil.vet && ctx.vetHas(h, 'care') && ctx.vetHas(h, 'loan') && ctx.vetHas(h, 'edu'), 'an honorable discharge keeps every benefit');
  const o = mk('oth');
  ok(!ctx.vetHas(o, 'edu') && !ctx.vetHas(o, 'loan') && ctx.vetHas(o, 'care'), 'other than honorable keeps only mental health care');
  const gen = mk('general');
  ok(!ctx.vetHas(gen, 'edu') && ctx.vetHas(gen, 'loan') && ctx.vetHas(gen, 'care'), 'general: no schooling aid, but a home loan and care');
  const dis = mk('dishonorable');
  ok(!ctx.vetHas(dis, 'care') && !ctx.vetHas(dis, 'loan'), 'dishonorable: nothing');
  // Care.
  const full = ctx.medPrice(adult(30), { cost: 1000 });
  ok(ctx.medPrice(h, { cost: 1000 }) < full, 'a veteran pays less for care');
  // Home loan.
  const house = { kind: 'house', value: 300000 };
  const fin = ctx.financeTerms(house, h), plain = ctx.financeTerms(house, adult(30));
  ok(fin.down === 0 && fin.rate < plain.rate && fin.name === 'Veterans mortgage', 'a veterans mortgage needs nothing down and costs less');
  ok(!ctx.financeTerms({ kind: 'car', value: 20000 }, h).vet, 'the loan only covers homes');
  h.player.mil.loanUsed = true;
  ok(!ctx.financeTerms(house, h).vet, 'the veterans loan is a one-time benefit');
  // Disability.
  const before = ctx.vetIncome(h).length;
  act(h, 'vet_claim');
  const m = h.player.mil;
  ok(m.claim && m.claim.approved && m.rating >= 10, `a claim with wounds and stress is rated (${m.rating}%)`);
  ok(ctx.vetIncome(h).some((r) => /disability/i.test(r[0])), 'disability pay shows up in income');
  m.rating = 60;
  ok(ctx.vetCareMult(h) === 0, 'a 50%+ rating means free care');
  const civ = adult(30); act(civ, 'vet_claim');
  ok(!civ.player.mil, 'a civilian can not file a claim');
  // Schooling aid.
  h.player.edu.current = { kind: 'college', cost: 30000 };
  ok(ctx.vetIncome(h).some((r) => /education/i.test(r[0])), 'schooling aid pays while enrolled');
  const left = h.player.mil.edLeft;
  h.pending = []; ctx.veteranYear(h);
  ok(h.player.mil.edLeft === left - 1, 'each year of study uses a year of aid');
  // Counseling.
  const k = mk('honorable'); const ptsd0 = k.player.mil.ptsd; k.player.money = 5000;
  act(k, 'vet_counsel');
  ok(k.player.mil.ptsd < ptsd0, 'counseling eases combat stress');
  // Discharge upgrades.
  const u = mk('oth'); u.player.money = 50000;
  let up = false; for (let i = 0; i < 20 && !up; i++) { u.player.counters = {}; act(u, 'vet_upgrade'); up = u.player.mil.discharge === 'general'; }
  ok(up, 'a discharge can be upgraded on appeal');
  // Hiring and the ballot.
  ok(ctx.vetHireEdge(h, g('JOBS').police || { cat: 'public' }) > 0 && ctx.vetHireEdge(dis, { cat: 'public' }) < 0, 'veterans get a hiring edge, dishonorable ones a penalty');
  ok(ctx.vetElectionEdge(h) > 0 && ctx.vetElectionEdge(adult(30)) === 0, 'veterans do better at the ballot box');
}

/* 8. pensions, officers, special forces, objectors, God Mode -------------------------------------------------- */
{
  const s = adult(30);
  enlist(s, 'military');
  const m = s.player.mil; m.trained = true; m.served = 19;
  ok(!ctx.actionList(s, 'mil').some((a) => a.id === 'mil_retire'), 'no retirement before twenty years');
  m.served = 20;
  ok(ctx.actionList(s, 'mil').some((a) => a.id === 'mil_retire'), 'retirement opens at twenty years');
  ok(!ctx.actionList(s, 'job').some((a) => a.id === 'quit_job'), 'a soldier can not simply quit');
  ok(!ctx.actionList(s, 'job').some((a) => a.id === 'retire'), 'the civilian retire action is hidden for soldiers');
  s.player.career.salary = 60000;
  ok(ctx.militaryPension(s, s.player.career) === 30000, 'twenty years pays half of final pay');
  act(s, 'mil_retire');
  ok(s.player.retired && s.player.retired.pension === 30000 && s.player.mil.discharge === 'retired', 'retiring starts the pension and records the discharge');
  // Officers.
  const o = adult(26);
  o.player.edu.degrees.push({ type: 'bachelor', major: 'business' });
  enlist(o, 'military'); o.player.mil.trained = true; o.player.career.level = 2; o.player.mil.served = 3;
  o.player.skills.charisma = 70; o.player.skills.fitness = 70; o.people[o.playerId].stats.smarts = 90; o.player.career.perf = 80;
  let commissioned = false;
  for (let i = 0; i < 25 && !commissioned; i++) { o.player.counters = {}; act(o, 'mil_ocs'); commissioned = o.player.career && o.player.career.id === 'officer'; }
  ok(commissioned, 'a graduate can win a commission');
  ok(commissioned && o.player.mil.served === 3 && !o.player.mil.vet, 'a commission keeps your years of service and does not discharge you');
  // Special forces.
  const f = adult(26); enlist(f, 'military'); const fm = f.player.mil; fm.trained = true; fm.served = 3; fm.spec = 'combat';
  f.player.skills.fitness = 95; f.player.skills.martial = 70; f.people[f.playerId].stats.health = 95;
  let elite = false; for (let i = 0; i < 40 && !elite; i++) { f.player.counters = {}; act(f, 'mil_sf'); elite = fm.elite; }
  ok(elite, 'a fit soldier can pass selection');
  // Objectors.
  let freed = 0;
  for (let i = 0; i < 60; i++) { const c = adult(24); enlist(c, 'military'); c.player.mil.trained = true; act(c, 'mil_co'); if (!c.player.career) freed++; }
  ok(freed > 5 && freed < 55, `objectors sometimes win (${freed} of 60)`);
  // God Mode: a career with no record.
  const gm = adult(30);
  gm.player.career = { id: 'officer', level: 3, perf: 60, years: 2, levelYears: 1, salary: 80000, term: 0, employer: 'x' };
  gm.pending = [];
  try { ctx.ageUp(gm); drain(gm); ok(gm.player.mil && gm.player.mil.served >= 1, 'a career added from God Mode gets a record'); } catch (e) { ok(false, 'God Mode officer threw: ' + e.stack.split('\n').slice(0, 2).join(' | ')); }
  // Early separation.
  const e = adult(24); enlist(e, 'military'); e.player.mil.trained = true; e.player.mil.served = 1; e.player.mil.drafted = true; act(e, 'mil_leave');
  ok(!e.player.career && e.player.mil.vet, 'a draftee can request to leave');
}

/* 9. relatives at war -------------------------------------------------------------------------------------- */
{
  let enlisted = 0, killed = 0, vets = 0;
  for (let i = 0; i < 40; i++) {
    const s = adult(40);
    const kids = [];
    for (let k = 0; k < 3; k++) { const c = ctx.makeAdultNear(s, { minAge: 19, maxAge: 24 }); ctx.setRel(s, c.id, 'sibling', 60); kids.push(c); }
    const w = startWar(s, 4);
    for (let y = 0; y < 6; y++) { s.year++; s.pending = []; ctx.familyWar(s, w); }
    enlisted += kids.filter((c) => c.mil).length;
    killed += kids.filter((c) => !c.alive).length;
    ctx.endWar(s, ctx.warSlot(s, 'us'), w);
    vets += kids.filter((c) => c.mil && c.mil.vet).length;
  }
  ok(enlisted > 5, `siblings enlist in a war (${enlisted} of 120)`);
  ok(killed > 0 && killed < enlisted, `some are killed, most are not (${killed} of ${enlisted})`);
  ok(vets > 0, 'relatives become veterans when the war ends');
}

/* Full years: a soldier through a war, many lives, no throws --------------------------------------------------------- */
{
  let deaths = 0, tours = 0, popups = 0;
  for (let i = 0; i < 60; i++) {
    const s = adult(20);
    startWar(s, 3);
    enlist(s, i % 3 === 0 ? 'officer' : 'military');
    if (!s.player.career) { s.player.edu.degrees.push({ type: 'bachelor', major: 'business' }); enlist(s, 'military'); }
    try {
      for (let y = 0; y < 30 && !s.dead; y++) {
        s.pending = []; ctx.ageUp(s);
        for (let k = 0; k < 50 && s.pending.length; k++) { const p = s.pending[0]; popups++; ctx.resolvePopup(s, p.id, Math.max(0, p.choices.findIndex((c) => !c.disabled)), p.input ? 'X' : undefined); }
      }
    } catch (e) { ok(false, 'a soldier’s years threw: ' + e.stack.split('\n').slice(0, 3).join(' | ')); }
    if (s.dead) deaths++;
    tours += (s.player.mil ? s.player.mil.tours.length : 0);
    const back = JSON.parse(JSON.stringify(s));
    ok(back.player.mil === undefined || typeof back.player.mil.ptsd === 'number', 'the service record survives a save round trip');
  }
  ok(tours > 20, `soldiers deploy in a war (${tours} tours across 60 lives)`);
  console.log(`  60 soldier lives: ${deaths} died, ${tours} tours, ${popups} popups answered`);
}

console.log(failures ? `\n❌ ${failures} military check(s) failed.` : '✅ Military checks passed.');
process.exit(failures ? 1 : 0);
