// Work life and tuning verification:  node dev/verify/lifework.mjs
//
// Covers 75-work-life.js, the decks in 76/77, and the engine's per-way effects (65-work.js):
//   1. coverage     — every ordinary job has a deck, with real cards, in the right shape
//   2. shortcuts    — a way marked dirty never beats the best honest way, always costs something, and ends in its own words
//   3. rebalanced   — the drug-rep lunch, the quiet fix, the slid fake ID: the honest road wins on the numbers and in karma
//   4. endings      — a way's own ending (say) replaces the card's, including its meter effects
//   5. favors       — doing one, asking for one, calling one in, owing one, and what happens when you owe
//   6. favor ways   — a card way that spends a favor: greyed out without one, +25 points with one, never on autopilot
//   7. venues       — the break room: meeting people, hearing things, buying a round, and the party
//   8. the table    — the odds across every deck stay in a sane band for a novice and an expert
import { loadGame } from './loadgame.mjs';

const ctx = loadGame({ quiet: true });
const g = (name) => ctx.run(name);
ctx.seedRng(7501);
ctx.console.error = () => {};
let failures = 0, checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) { failures++; console.log('  ✖ ' + msg); } };
const WORKDECK = g('WORKDECK'), SKILLS = g('SKILLS'), JOBS = g('JOBS'), ACTIONS = g('ACTIONS'), EVENTS = g('EVENTS');
const clone = (s) => JSON.parse(JSON.stringify(s));
const P = (s) => s.people[s.playerId];
const pop = (s, handler) => s.pending.find((p) => p.handler === handler);
const BAD_TEXT = /undefined|NaN|\[who\]|\[first\]|\[amt\]|\[object|\{\{|\{~/;
const adultLife = (age, o) => {
  const s = ctx.createLife(Object.assign({ country: 'us', year: 2000 }, o || {}));
  s.year = 2000 + age; s.pending = [];
  s.player.edu.current = null; s.player.money = 500000;
  for (const k of Object.keys(SKILLS)) s.player.skills[k] = 35;
  P(s).stats.smarts = 55;
  return s;
};
const person = (s, kind, rel, o) => { const p = ctx.makeAdultNear(s, Object.assign({ minAge: 25, maxAge: 40 }, o || {})); ctx.setRel(s, p.id, kind, rel ?? 60); return p; };
const drain = (s, pickFn) => {
  for (let k = 0; k < 80 && s.pending.length; k++) {
    const p = s.pending[0];
    ok(!BAD_TEXT.test(p.text) && !BAD_TEXT.test(p.title) && p.choices.every((c) => !BAD_TEXT.test(String(c.label) + ' ' + String(c.sub || ''))), `clean popup text "${p.title}: ${p.text}"`);
    const open = p.choices.map((c, i) => [c, i]).filter(([c]) => !c.disabled);
    const [, i] = pickFn ? pickFn(p, open) : open[0];
    ctx.resolvePopup(s, p.id, i, p.input ? 'X' : undefined);
  }
};
const choose = (s, handler, value) => { const p = pop(s, handler); if (!p) return null; ctx.resolvePopup(s, p.id, p.choices.findIndex((c) => c.value === value)); return p; };
const job = (id, level) => { const s = adultLife(30); ctx.hire(s, id, level ?? 1); s.pending = []; return s; };
const isDirty = (w) => !!(w[6] && w[6].dirty);

/* 1. coverage -------------------------------------------------------------------------------- */
{
  const plain = Object.keys(JOBS).filter((id) => !JOBS[id].special && id !== 'police');
  const missing = plain.filter((id) => !WORKDECK[id]);
  ok(missing.length === 0, `every ordinary job has a deck (missing: ${missing.join(', ')})`);
  ok(Object.keys(WORKDECK).length >= 70, `at least seventy careers have decks (${Object.keys(WORKDECK).length})`);
  for (const id of ['actor', 'musician', 'model', 'author', 'director', 'producer', 'comedian']) ok(!!WORKDECK[id], `${id} (an entertainment career) has a deck too`);
  for (const id of Object.keys(WORKDECK)) {
    const d = WORKDECK[id];
    if (!d.cards.some((k) => /^u_/.test(k.id)) && !JOBS[id].adult && d.cards.length > 8) continue;
    ok(d.cards.length >= 6, `${id} has a real deck (${d.cards.length} cards)`);
    ok(d.cards.every((k) => !/\{\{/.test(JSON.stringify(k))), `${id}: no template left unfilled`);
    ok(d.cards.filter((k) => !k.max).length >= 4, `${id} deals something at every rung`);
    ok(d.meter.words.length === 5 && d.meter.name, `${id} has a meter with five words`);
  }
  ok(Object.keys(WORKDECK).every((id) => WORKDECK[id].cards.every((k) => k.stages.every((st) => st.ways.length >= 2))), 'every decision has at least two ways');
}

/* 2. shortcuts ------------------------------------------------------------------------------ */
{
  const s = job('retail', 1), st = ctx.wkState(s, 'retail');
  let dirty = 0, withSay = 0, withFx = 0;
  for (const id of Object.keys(WORKDECK)) {
    if (!JOBS[id]) continue;
    const t = job(id, 1), ts = ctx.wkState(t, id);
    for (const k of WORKDECK[id].cards) for (const stg of k.stages) {
      const honest = stg.ways.filter((w) => !isDirty(w) && w[5] !== 'favor' && w[5] !== 'walk');
      const best = Math.max(...honest.map((w) => ctx.wkOdds(t, k, w, ts)));
      for (const w of stg.ways.filter(isDirty)) {
        dirty++;
        ok(ctx.wkOdds(t, k, w, ts) <= best + 0.0001, `${id}/${k.id}: the shortcut "${w[0]}" does not beat the honest way`);
        const e = w[6];
        ok(e.karma < 0 || w[3] <= -0.04 || e.say, `${id}/${k.id}: "${w[0]}" costs karma, odds or ends in its own words`);
        if (e.say) { ok(e.say.ok && e.say.meh !== undefined && e.say.bad, `${id}/${k.id}: "${w[0]}" has all three endings of its own`); withSay++; }
        if (e.say && e.say.fx) { withFx++; ok(e.say.fx.ok && e.say.fx.bad, `${id}/${k.id}: its own effects cover good and bad`); }
        for (const key of Object.keys(e)) ok(['dirty', 'money', 'karma', 'happy', 'health', 'fame', 'name', 'scandal', 'm', 'perf', 'secret', 'say'].includes(key), `${id}/${k.id}: effect key "${key}" is known`);
        if (e.secret) ok(!!g('CRIMES')[e.secret], `${id}/${k.id}: the secret's crime "${e.secret}" exists`);
      }
    }
  }
  ok(dirty >= 40, `there are plenty of shortcuts on offer (${dirty})`);
  ok(withSay >= dirty * 0.6, `and most have endings of their own, the rest the default (${withSay}/${dirty})`);
  // A dirty way with no words of its own ends in the default: the meter never rises, and sometimes falls.
  { let found = null; for (const id of Object.keys(WORKDECK)) { if (!JOBS[id] || JOBS[id].adult) continue; for (const kk of WORKDECK[id].cards) { if (kk.stages.length !== 1) continue; const wi = kk.stages[0].ways.findIndex((w) => isDirty(w) && !w[6].say); if (wi >= 0 && !found) found = [id, kk, wi]; } }
    ok(!!found, 'there is a shortcut with no words of its own to test');
    if (found) { const [id, kk, wi] = found; let up = 0, down = 0; for (let i = 0; i < 60; i++) { const l = job(id, 1); const L = ctx.wkState(l, id); L.hand.push({ hid: 'h1', cid: kk.id, c: {} }); const m0 = L.m; ctx.wkStart(l, 'h1'); const p = pop(l, 'wkStage'); ctx.resolvePopup(l, p.id, wi); drain(l); if (L.m > m0) up++; if (L.m < m0) down++; }
      ok(up === 0 && down > 0, `${id}/${kk.id}: a shortcut's default ending never lifts the meter (${up} up, ${down} down)`); } }
  void st;
}

/* 3. rebalanced ------------------------------------------------------------------------------------ */
{
  const way = (id, cid, re) => { const k = WORKDECK[id].cards.find((x) => x.id === cid); return [k, k.stages[0].ways.find((w) => re.test(w[0]))]; };
  const cases = [['doctor', 'pharma', /Accept/, /Decline|Report/], ['doctor', 'chart_error', /quietly/, /Report it|Tell the patient/], ['bartender', 'id_check', /slide/, /Refuse|second ID/], ['chef', 'supplier', /cook it hard/, /Reject|rival/], ['firefighter', 'suspect_fire', /Say nothing/, /Tell the arson/], ['chef', 'inspection', /Quietly move/, /Fix it now/]];
  for (const [id, cid, bad, good] of cases) {
    const s = job(id, 1), st = ctx.wkState(s, id);
    const [k, wb] = way(id, cid, bad), [, wg] = way(id, cid, good);
    ok(ctx.wkOdds(s, k, wg, st) >= ctx.wkOdds(s, k, wb, st), `${id}/${cid}: the honest way is at least as likely to work`);
    ok(wg[6] && wg[6].karma > 0, `${id}/${cid}: and it earns karma`);
    ok(isDirty(wb) && wb[6].karma < 0, `${id}/${cid}: the shortcut costs karma`);
    // Play both, many times: the honest road is better for the meter, the karma, or both.
    const run = (w) => { let m = 0, karma = 0, n = 60; for (let i = 0; i < n; i++) { const l = job(id, 1); const S = ctx.wkState(l, id); const m0 = S.m, k0 = l.player.karma; S.hand.push({ hid: 'h1', cid, c: {} }); ctx.wkStart(l, 'h1'); const p = pop(l, 'wkStage'); const idx = k.stages[0].ways.indexOf(w); ctx.resolvePopup(l, p.id, idx); drain(l); m += S.m - m0; karma += l.player.karma - k0; } return { m: m / n, karma: karma / n }; };
    const rb = run(wb), rg = run(wg);
    ok(rg.karma > rb.karma, `${id}/${cid}: the honest road earns more karma (${rg.karma.toFixed(1)} vs ${rb.karma.toFixed(1)})`);
    ok(rg.m >= rb.m - 0.5, `${id}/${cid}: and is no worse for the meter (${rg.m.toFixed(1)} vs ${rb.m.toFixed(1)})`);
  }
  // The lunch pays the money, whatever the dice say, and is a secret.
  { const s = job('doctor', 1); const S = ctx.wkState(s, 'doctor'); S.hand.push({ hid: 'h1', cid: 'pharma', c: {} }); const m0 = s.player.money; ctx.wkStart(s, 'h1'); const p = pop(s, 'wkStage'); ctx.resolvePopup(s, p.id, p.choices.findIndex((c) => /Accept/.test(c.label))); drain(s);
    ok(s.player.money > m0 + 3000, 'taking the lunch pays, whatever the dice say');
    ok(Object.values((s.web && s.web.secrets) || {}).some((x) => x.kind === 'crime' && x.crime === 'bribery'), 'and it is a secret in the web'); }
  // Autopilot never takes the shortcut or spends a favor.
  { let karmaDrift = 0; for (let i = 0; i < 30; i++) { const s = job('doctor', 1); const S = ctx.wkState(s, 'doctor'); S.hand.push({ hid: 'h1', cid: 'pharma', c: {} }); const k0 = s.player.karma; ctx.wkAuto(s, 'doctor', S.hand[0]); if (s.player.karma < k0) karmaDrift++; } ok(karmaDrift === 0, 'autopilot never takes the lunch'); }
}

/* 4. endings ------------------------------------------------------------------------------------------ */
{
  const s = job('bartender', 1), S = ctx.wkState(s, 'bartender');
  const k = WORKDECK.bartender.cards.find((x) => x.id === 'id_check');
  const say = { ok: 'THE SPECIAL ENDING.', fx: { ok: { m: 0, perf: 0 } } };
  const m0 = S.m;
  const r = ctx.wkConclude(s, 'bartender', k, {}, [1], false, say);
  ok(/THE SPECIAL ENDING/.test(r.text), 'a way’s own ending replaces the card’s');
  ok(S.m === m0, 'and so do its meter effects (none, here)');
  const r2 = ctx.wkConclude(s, 'bartender', k, {}, [1], false, null);
  ok(!/THE SPECIAL/.test(r2.text) && S.m > m0, 'without one, the card’s own ending and effects apply');
}

/* 5. favors -------------------------------------------------------------------------------------------- */
{
  const s = adultLife(30);
  const f = person(s, 'friend', 60), b = person(s, 'coworker', 50);
  ok(ctx.actionAvailable(ACTIONS.favor_do, s, f.id), 'you can do a friend a favor');
  ok(!ctx.actionAvailable(ACTIONS.favor_do, adultLife(30), null), 'but not for nobody');
  ctx.doAction(s, 'favor_do', f.id);
  const p = pop(s, 'favorDo');
  ok(p.choices.map((c) => c.value).join() === 'cover,hand,money,', 'cover, help, lend, or never mind');
  const r0 = ctx.relOf(s, f.id).rel;
  choose(s, 'favorDo', 'money');
  ok(ctx.favorN(s, f.id) === 2 && ctx.relOf(s, f.id).rel > r0, 'lending money earns two favors and warms the relationship');
  ok(!ctx.actionAvailable(ACTIONS.favor_do, s, f.id), 'one favor a person a year');
  ok(ctx.favorTop(s).id === f.id && ctx.favorsOwed(s).length === 1, 'they are on the list of people who owe you');
  // asking when they owe you is free and certain
  ok(ctx.actionAvailable(ACTIONS.favor_ask, s, f.id), 'you can ask them for one');
  for (const how of ['ref', 'loan', 'word']) {
    const l = adultLife(30); const x = person(l, 'friend', 60); ctx.favorAdd(l, x.id, 1);
    ctx.doAction(l, 'favor_ask', x.id); const money = l.player.money; choose(l, 'favorAsk', how); drain(l);
    ok(ctx.favorN(l, x.id) === 0, `${how}: asking someone who owes you spends it`);
    if (how === 'ref') ok(l.player.favorRef === l.year && ctx.favorRefEdge(l) > 0, 'a reference helps with interviews this year');
    if (how === 'loan') ok(l.player.money > money, 'a loan is money');
    if (how === 'word') ok((l.player.rep || { scandal: 0 }).scandal === 0, 'a word on your behalf');
  }
  // asking when they do not owe you can fail, and makes you owe them
  let yes = 0, no = 0;
  for (let i = 0; i < 80; i++) { const l = adultLife(30); const x = person(l, 'friend', 45); ctx.doAction(l, 'favor_ask', x.id); choose(l, 'favorAsk', 'ref'); drain(l); if (ctx.favorN(l, x.id) < 0) yes++; else no++; }
  ok(yes > 5 && no > 5, `a stranger-ish friend may say yes or no (${yes}/${no})`);
  { const l = adultLife(30); const x = person(l, 'friend', 20); ok(!ctx.actionAvailable(ACTIONS.favor_ask, l, x.id), 'you cannot ask somebody who barely knows you'); }
  // the case: only when the police are looking
  { const l = adultLife(30); const x = person(l, 'friend', 80); ctx.favorAdd(l, x.id, 1); ctx.doAction(l, 'favor_ask', x.id); ok(!pop(l, 'favorAsk').choices.some((c) => c.value === 'cover'), 'nobody vouches for you when nobody is asking');
    const c = ctx.invOpen(l, 'burglary', { who: l.playerId }); const l2 = adultLife(30); void c; }
  { const l = adultLife(30); const x = person(l, 'friend', 80); ctx.favorAdd(l, x.id, 1); const c = ctx.invOpen(l, 'burglary', { who: l.playerId }); c.prog = 50; l.pending = []; ctx.doAction(l, 'favor_ask', x.id); ok(pop(l, 'favorAsk').choices.some((cc) => cc.value === 'cover'), 'but when they are, someone can vouch'); choose(l, 'favorAsk', 'cover'); ok(c.prog < 50 && c.alibi === x.id, 'and it moves the case'); drain(l); }
  // owing
  { let called = 0; for (let i = 0; i < 60; i++) { const l = adultLife(30); const x = person(l, 'friend', 60); ctx.favorAdd(l, x.id, -1); l.pending = []; ctx.favorYear(l); if (pop(l, 'favorDue')) called++; drain(l); } ok(called > 5, `what you owe gets called in (${called}/60)`); }
  for (const how of ['pay', 'later', 'no']) { const l = adultLife(30); const x = person(l, 'friend', 60); ctx.favorAdd(l, x.id, -1); const r = ctx.relOf(l, x.id).rel; ctx.favorYear(l); for (let i = 0; i < 40 && !pop(l, 'favorDue'); i++) ctx.favorYear(l); if (!pop(l, 'favorDue')) continue; choose(l, 'favorDue', how); drain(l); if (how === 'pay') ok(ctx.favorN(l, x.id) === 0 && ctx.relOf(l, x.id).rel > r, 'paying it back squares you and warms them'); if (how === 'no') ok(ctx.relOf(l, x.id).rel < r - 10, 'refusing costs the friendship'); }
  // they die, and the ledger forgets
  { const l = adultLife(30); const x = person(l, 'friend', 60); ctx.favorAdd(l, x.id, 2); x.alive = false; ctx.favorYear(l); ok(ctx.favorN(l, x.id) === 0, 'the dead owe nothing'); }
  // bounds
  { const l = adultLife(30); const x = person(l, 'friend', 60); for (let i = 0; i < 20; i++) ctx.favorAdd(l, x.id, 1); ok(ctx.favorN(l, x.id) <= 5, 'a person can owe you at most five'); for (let i = 0; i < 20; i++) ctx.favorAdd(l, x.id, -1); ok(ctx.favorN(l, x.id) >= -3, 'and you can owe at most three'); }
  // the web: a favor owed buys silence
  { const l = adultLife(30); const x = person(l, 'friend', 60); const sec = ctx.webNewSecret(l, 'crime', l.playerId, { crime: 'shoplift', sev: 2 }); sec.knows.push(x.id); ctx.favorAdd(l, x.id, 1);
    ctx.doAction(l, 'web_silence', x.id); const p2 = pop(l, 'webSilence'); ok(p2.choices.some((c) => c.value === 'owed'), 'a favor owed is an option for keeping them quiet'); choose(l, 'webSilence', 'owed'); ok(sec.hush && sec.hush[x.id] > l.year && ctx.favorN(l, x.id) === 0, 'it works, and spends the favor'); drain(l); }
  void b;
}

/* 6. favor ways ------------------------------------------------------------------------------------------ */
{
  const k = WORKDECK.doctor.cards.find((x) => x.id === 'attending');
  const stage = (s) => { const S = ctx.wkState(s, 'doctor'); S.hand.length = 0; S.hand.push({ hid: 'h1', cid: 'attending', c: {} }); s.pending = []; ctx.wkStart(s, 'h1'); return pop(s, 'wkStage'); };
  { const s = job('doctor', 0); const p = stage(s); const fi = p.choices.findIndex((c) => /friendly attending/.test(c.label)); ok(fi >= 0 && p.choices[fi].disabled && /Nobody owes you/.test(p.choices[fi].sub), 'a favor way is greyed out when nobody owes you one'); }
  { const s = job('doctor', 0); const f = person(s, 'friend', 60); ctx.favorAdd(s, f.id, 1); const p = stage(s); const fi = p.choices.findIndex((c) => /friendly attending/.test(c.label)); ok(!p.choices[fi].disabled && p.choices[fi].sub.includes(f.first), 'and offered, by name, when someone does');
    const way = k.stages[0].ways.find((w) => /friendly attending/.test(w[0])), plain = { ...way, 5: '' };
    const st = ctx.wkState(s, 'doctor'); ok(Math.abs(ctx.wkOdds(s, k, way, st) - ctx.wkOdds(s, k, plain, st) - 0.25) < 0.0001 || ctx.wkOdds(s, k, way, st) >= 0.9, 'a favor is worth twenty-five points');
    ctx.resolvePopup(s, p.id, fi); drain(s); ok(ctx.favorN(s, f.id) === 0, 'and playing it spends it'); }
  { const s = job('doctor', 0); const f = person(s, 'friend', 60); ctx.favorAdd(s, f.id, 2); const S = ctx.wkState(s, 'doctor'); S.hand.length = 0; S.hand.push({ hid: 'h1', cid: 'attending', c: {} }); for (let i = 0; i < 20; i++) ctx.wkAuto(s, 'doctor', { hid: 'h1', cid: 'attending', c: {} }); ok(ctx.favorN(s, f.id) === 2, 'autopilot never spends a favor'); }
}

/* 7. venues ------------------------------------------------------------------------------------------------- */
{
  const s = job('retail', 1);
  ok(!ctx.actionAvailable(ACTIONS.wv_hang, adultLife(30), null), 'nowhere to hang out without a job');
  for (let i = 0; i < 3; i++) person(s, 'coworker', 40);
  ok(ctx.actionAvailable(ACTIONS.wv_hang, s, null), 'a job with coworkers has a break room');
  ok(typeof ctx.venuesFor(s)[0] === 'string' && ctx.venuesFor(s).length === 2, 'two places to talk');
  for (const id of Object.keys(JOBS)) { const c = JOBS[id].cat; ok(!!g('WORK_VENUES')[c], `${id}'s category (${c}) has venues`); }
  for (const how of ['join', 'round', 'side', 'alone']) {
    for (let i = 0; i < 25; i++) { const l = job('office' in JOBS ? 'callcenter' : 'retail', 1); for (let k = 0; k < 3; k++) person(l, 'coworker', 40); ctx.doAction(l, 'wv_hang'); ok(!!pop(l, 'venueGo'), 'a venue is a decision'); choose(l, 'venueGo', how); drain(l); }
  }
  // joining: meet people, tie them together, hear things
  let heard = 0, tied = 0;
  for (let i = 0; i < 80; i++) {
    const l = job('retail', 1); for (let k = 0; k < 4; k++) person(l, 'coworker', 40);
    ctx.doAction(l, 'wv_hang'); choose(l, 'venueGo', 'join');
    if (pop(l, 'webHear')) heard++;
    if (Object.values(l.people).some((p) => (p.ties || []).some((t) => t.k === 'work'))) tied++;
    drain(l);
  }
  ok(heard > 5, `you hear things (${heard}/80)`);
  ok(tied > 20, `coworkers who share a venue talk to each other (${tied}/80)`);
  // a round earns a favor
  { const l = job('retail', 1); const c = person(l, 'coworker', 40); ctx.doAction(l, 'wv_hang'); const m = l.player.money; choose(l, 'venueGo', 'round'); ok(l.player.money < m && ctx.favorsOwed(l).length === 1, 'a round costs a little and earns a favor'); drain(l); }
  // limit
  { const l = job('retail', 1); person(l, 'coworker', 40); ctx.doAction(l, 'wv_hang'); l.pending = []; ctx.doAction(l, 'wv_hang'); l.pending = []; ok(!ctx.actionAvailable(ACTIONS.wv_hang, l, null), 'twice a year is enough'); }
  // the party
  { const l = job('retail', 1); person(l, 'coworker', 40); person(l, 'boss', 50); ok(ctx.eventEligible(l, EVENTS.wv_party), 'the work party comes round'); for (let ci = 0; ci < 3; ci++) for (let i = 0; i < 20; i++) { const x = job('retail', 1); person(x, 'coworker', 40); person(x, 'boss', 50); ctx.runWithResult(x, () => EVENTS.wv_party.choices[ci][1](x, {}), { emoji: '', title: '' }); drain(x); } }
}

/* 8. the table ------------------------------------------------------------------------------------------------ */
{
  const rows = [];
  for (const skillv of [25, 75]) {
    const s = adultLife(30); for (const k of Object.keys(SKILLS)) s.player.skills[k] = skillv;
    const out = [];
    for (const id of Object.keys(WORKDECK)) {
      if (!JOBS[id]) continue;
      const t = ctx.createLife({ country: 'us', year: 2000 }); t.year = 2030; t.pending = []; for (const k of Object.keys(SKILLS)) t.player.skills[k] = skillv; P(t).stats.smarts = 55; ctx.hire(t, id, 1); t.pending = [];
      const st = ctx.wkState(t, id);
      for (const k of WORKDECK[id].cards) { let p = 1; for (const stg of k.stages) p *= Math.max(...stg.ways.filter((w) => !isDirty(w) && w[5] !== 'favor' && w[5] !== 'walk' || w[5] === 'walk' && stg.ways.length === 1).map((w) => ctx.wkOdds(t, k, w, st))); out.push(p); }
    }
    rows.push(out);
    const mean = out.reduce((a, b) => a + b, 0) / out.length;
    ok(mean > (skillv < 50 ? 0.4 : 0.55) && mean < (skillv < 50 ? 0.7 : 0.88), `at skill ${skillv} the average card is a fair fight (${mean.toFixed(2)})`);
    ok(out.filter((p) => p < 0.1).length === 0, `at skill ${skillv} no card is hopeless`);
  }
  const lo = rows[0].reduce((a, b) => a + b, 0) / rows[0].length, hi = rows[1].reduce((a, b) => a + b, 0) / rows[1].length;
  ok(hi > lo + 0.1, `skill matters: ${lo.toFixed(2)} for a novice, ${hi.toFixed(2)} for an expert`);
}

/* 9. long runs --------------------------------------------------------------------------------------------------- */
{
  const ids = Object.keys(WORKDECK).filter((id) => JOBS[id] && !JOBS[id].adult && !JOBS[id].special);
  for (const id of ids) {
    const s = job(id, 0); s.player.money = 5e6; for (let k = 0; k < 3; k++) person(s, 'coworker', 40);
    for (let y = 0; y < 15 && !s.dead; y++) {
      s.year++; s.player.counters = {};
      if (s.player.prison) s.player.prison = null;
      if (!s.player.career) { ctx.hire(s, id, 0); }
      ctx.careerTick(s); ctx.webTick(s); ctx.favorYear(s);
      drain(s, (p, open) => open[Math.floor(Math.random() * open.length)]);
      if (s.player.career && s.player.career.id === id) {
        const st = ctx.wkState(s, id);
        for (const h of st.hand.slice(0, 2)) { ctx.wkStart(s, h.hid); drain(s, (p, open) => open[Math.floor(Math.random() * open.length)]); }
        ok(st.m >= 0 && st.m <= 100 && st.hand.length <= 6, `${id} year ${y} in range`);
      }
    }
    ok(JSON.stringify(clone(s).player.work) === JSON.stringify(s.player.work) && JSON.stringify(clone(s).player.favors || {}) === JSON.stringify(s.player.favors || {}), `${id}: the desk and the ledger save whole`);
  }
}

console.log(failures ? `\n❌ ${failures} work-life checks failed.` : `✅ Work-life checks passed (${checks} checks).`);
process.exit(failures ? 1 : 0);
