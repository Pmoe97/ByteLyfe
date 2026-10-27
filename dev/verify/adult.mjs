// Adult-careers verification:  node dev/verify/adult.mjs
//
// Covers 71-adult-work.js (and the engine hooks it uses in 65-work.js):
//   1. gating      — off by default; Mature alone is not enough; the board, applying and the actions need both switches
//   2. adults only — nobody under 18 can be hired, and a deck deals nothing to a minor or with its switches off
//   3. the decks   — complete, real skills, clean text; every card that puts a person in front of you has a way to walk away
//   4. walking out — it always works, costs nothing, and is what autopilot does with such a card
//   5. boundaries  — Careful never sees the riskier offers, and pay follows the setting
//   6. who knows   — keeping it private makes a secret, telling people reactions, being open leaves nothing to leak,
//                    and leaks, the partner finding out and being exposed all play out
//   7. the law     — a companion's year follows the local law, and a citation is a record but never a felony
//   8. shortcuts   — a dirty way is never picked on autopilot, and its price is paid even when it works
//   9. play        — every way of every card, many seeds, no errors, no stray tokens in the text
//  10. long runs   — thirty years in each career at each setting stay in range and save whole
import { loadGame } from './loadgame.mjs';

const ctx = loadGame({ quiet: true });
const g = (name) => ctx.run(name);
ctx.seedRng(7101);
ctx.console.error = () => {};
let failures = 0, checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) { failures++; console.log('  ✖ ' + msg); } };
const WORKDECK = g('WORKDECK'), SKILLS = g('SKILLS'), JOBS = g('JOBS'), META = g('META'), ACTIONS = g('ACTIONS'), JOB_IDS = g('JOB_IDS'), CRIMES = g('CRIMES');
const IDS = g('ADULT_JOB_IDS');
const clone = (s) => JSON.parse(JSON.stringify(s));
const P = (s) => s.people[s.playerId];
const pop = (s, handler) => s.pending.find((p) => p.handler === handler);
const BAD_TEXT = /undefined|NaN|\[who\]|\[first\]|\[amt\]|\[object|\{~/;
const setOn = (mature, adultwork) => { META.settings.mature = mature; META.settings.mature_adultwork = adultwork; };
const adultLife = (age, o) => {
  const s = ctx.createLife(Object.assign({ country: 'us', year: 2000 }, o || {}));
  s.year = 2000 + age; s.pending = [];
  s.player.edu.current = null; s.player.money = 500000;
  for (const k of Object.keys(SKILLS)) s.player.skills[k] = 50;
  P(s).stats.smarts = 70; P(s).stats.looks = 70;
  return s;
};
const drain = (s, pickFn) => {
  for (let k = 0; k < 80 && s.pending.length; k++) {
    const p = s.pending[0];
    ok(!BAD_TEXT.test(p.text) && !BAD_TEXT.test(p.title) && p.choices.every((c) => !BAD_TEXT.test(String(c.label) + ' ' + String(c.sub || ''))), `clean popup text "${p.title}: ${p.text}"`);
    const open = p.choices.map((c, i) => [c, i]).filter(([c]) => !c.disabled);
    const [, i] = pickFn ? pickFn(p, open) : open[0];
    ctx.resolvePopup(s, p.id, i, p.input ? 'X' : undefined);
  }
};
const hireAs = (id, level, how) => {
  const s = adultLife(30);
  ctx.hire(s, id, level ?? 0);
  const p = pop(s, 'adultOpen');
  if (p) ctx.resolvePopup(s, p.id, p.choices.findIndex((c) => c.value === (how || 'private')));
  s.pending = [];
  return s;
};
const newYear = (s) => { s.year++; s.player.counters = {}; ctx.careerTick(s); };
const hasWalk = (k) => k.stages.some((st) => st.ways.some((w) => w[5] === 'walk'));

/* 1. gating ------------------------------------------------------------------------------ */
{
  ok(META.settings.mature_adultwork === false && META.settings.mature === false, 'both switches are off by default');
  ok(!!g('CONTENT_TAGS').mature_adultwork, 'the sub-switch is a known tag');
  const s = adultLife(30);
  for (const [m, a] of [[false, false], [true, false], [false, true]]) {
    setOn(m, a);
    const board = ctx.jobBoard(s).map((b) => b.id);
    ok(IDS.every((id) => !board.includes(id)), `no adult careers on the board with mature=${m} adultwork=${a}`);
    const r = ctx.applyJob(s, 'creator');
    ok(!P(s).career && (!r || /not on the board/.test(r.text)), `applying is refused with mature=${m} adultwork=${a}`);
    ok(!ACTIONS.adult_bounds || !ctx.actionAvailable(ACTIONS.adult_bounds, hireAs('creator', 0), null), `the boundaries action is hidden with mature=${m} adultwork=${a}`);
  }
  setOn(true, true);
  const board = ctx.jobBoard(s);
  ok(IDS.every((id) => board.some((b) => b.id === id)), 'all four are on the board with both switches on');
  ok(IDS.every((id) => board.find((b) => b.id === id).open), 'and they are always hiring');
  ok(IDS.every((id) => !JOB_IDS.includes(id)), 'they are never in the ordinary job list, so no NPC gets one');
  for (let i = 0; i < 40; i++) { const p = ctx.makeAdultNear(s, { minAge: 20, maxAge: 60 }); ok(!p.job || !IDS.includes(p.job.id), 'an NPC never lands one of these jobs'); }
  setOn(false, false);
}

/* 2. adults only -------------------------------------------------------------------------- */
{
  setOn(true, true);
  const s = ctx.createLife({ country: 'us', year: 2000 });
  s.year = 2017; s.pending = []; // 17
  for (const id of IDS) ok(ctx.missingReqs(s, JOBS[id].req).some((m) => /Age/.test(m)), `${id} needs an age`);
  ok(IDS.every((id) => JOBS[id].req.age >= 18), 'every adult career needs age 18 or more');
  ok(JOBS.club_owner.req.age >= 21, 'running a club needs 21');
  ok(!ctx.wkLive(s, WORKDECK.creator), 'a minor gets no deck');
  const a = adultLife(30);
  ok(ctx.wkLive(a, WORKDECK.creator), 'an adult does with the switches on');
  setOn(true, false);
  ok(!ctx.wkLive(a, WORKDECK.creator), 'and not with the sub-switch off');
  setOn(false, true);
  ok(!ctx.wkLive(a, WORKDECK.creator), 'nor with Mature off');
  setOn(false, false);
}

/* 3. the decks ------------------------------------------------------------------------------ */
{
  for (const id of IDS) {
    const d = WORKDECK[id];
    ok(!!JOBS[id] && JOBS[id].adult && JOBS[id].cat === 'night', `${id} is a real, flagged job`);
    ok(d.tags && d.tags.includes('mature') && d.tags.includes('mature_adultwork'), `${id}'s deck is behind both switches`);
    ok(d.meter && d.meter.words.length >= 4 && d.cards.length >= 9, `${id} has a meter and a real deck (${d.cards.length} cards)`);
    ok(Array.isArray(JOBS[id].interview) && JOBS[id].interview.every((q) => q.a.length === 3 && q.a[0][1] > q.a[2][1]), `${id} has an audition where the careful answer scores best`);
    const ids = new Set();
    for (const k of d.cards) {
      ok(!ids.has(k.id), `${id}/${k.id} is unique`); ids.add(k.id);
      ok(k.name && k.emoji && k.ok && k.meh !== undefined && k.bad, `${id}/${k.id} has a name, an emoji and its endings`);
      for (const st of k.stages) {
        ok(st.text && st.ways.length >= 2, `${id}/${k.id} has a decision with choices`);
        for (const w of st.ways) ok(w[0] && (SKILLS[w[1]] || ['smarts', 'looks', 'health'].includes(w[1])), `${id}/${k.id} way "${w[0]}" uses a real skill`);
      }
      const fill = { who: 'Ann Lee', first: 'Ann', amt: 700 };
      for (const text of [k.ok, k.meh, k.bad, k.intro, k.walk, ...k.stages.map((x) => x.text), ...k.stages.map((x) => x.ok), ...k.stages.map((x) => x.bad), ...k.stages.flatMap((x) => x.ways.map((w) => w[0]))]) ok(!BAD_TEXT.test(ctx.wkFmt(text, fill)), `${id}/${k.id} text is clean once filled in`);
      // Anything that puts a person in front of you, or a risk, has a way out.
      if (['club_dancer', 'companion'].includes(id) && (k.who || k.risk)) ok(hasWalk(k), `${id}/${k.id} puts someone in front of you, so it has a way to walk away`);
      if (hasWalk(k)) ok(typeof k.walk === 'string' && k.walk.length > 10, `${id}/${k.id} says how walking away ended`);
    }
  }
  ok(WORKDECK.club_dancer.cards.some((k) => k.id === 'private_booking' && hasWalk(k)), 'a private booking can be declined');
  ok(WORKDECK.club_owner.cards.some((k) => k.id === 'id_night' && hasWalk(k)), 'a fake-ID group is turned away, every way');
  // No coercion path: no way, anywhere, is about forcing, pressing or trapping a worker.
  const words = /traffick|coerce|\bforce them|\bforced\b|\btrap\b|captive|underage worker/i;
  for (const id of IDS) for (const k of WORKDECK[id].cards) for (const st of k.stages) for (const w of st.ways) ok(!words.test(w[0] + ' ' + w[2]), `${id}/${k.id}: no coercive way ("${w[0]}")`);
}

/* 4. walking out ------------------------------------------------------------------------------- */
{
  setOn(true, true);
  const s = hireAs('companion', 1);
  newYear(s);
  const st = ctx.wkState(s, 'companion');
  // Put a pressure card on the desk and walk.
  st.hand.length = 0;
  st.hand.push({ hid: 'hw', cid: 'inquiry', c: ctx.wkCtx(s, ctx.wkCard('companion', 'inquiry')) });
  s.pending = [];
  const m0 = st.m, money0 = s.player.money;
  ctx.wkStart(s, 'hw');
  const p = pop(s, 'wkStage');
  const walkIdx = p.choices.findIndex((c) => /Decline/.test(c.label));
  ok(walkIdx >= 0 && /100%/.test(p.choices[walkIdx].sub), 'the walk-away way shows 100%');
  ctx.resolvePopup(s, p.id, walkIdx);
  ok(!pop(s, 'wkStage'), 'walking ends the card');
  ok(!st.hand.some((h) => h.hid === 'hw'), 'and it leaves the desk');
  ok(st.m === m0 && s.player.money === money0, 'at no cost to your meter or money');
  ok(st.walked === 1, 'and is counted');
  // Autopilot walks.
  st.hand.length = 0;
  st.hand.push({ hid: 'ha', cid: 'inquiry', c: ctx.wkCtx(s, ctx.wkCard('companion', 'inquiry')) });
  const o = ctx.wkAuto(s, 'companion', st.hand[0]);
  ok(o === 'walk', 'autopilot walks from a card that has a way out, rather than playing it for you');
  ok(st.ok + st.meh + st.bad === 0, 'and it counts as neither good nor bad');
}

/* 5. boundaries ---------------------------------------------------------------------------------- */
{
  setOn(true, true);
  const dealt = (bound, id, n) => {
    const seen = {};
    for (let i = 0; i < n; i++) {
      const s = hireAs(id, 2);
      ctx.wkState(s, id).flags.bound = bound;
      s.pending = [];
      newYear(s);
      for (const h of ctx.wkState(s, id).hand) seen[h.cid] = (seen[h.cid] || 0) + 1;
    }
    return seen;
  };
  for (const id of ['club_dancer', 'companion']) {
    const careful = dealt(0, id, 120), bold = dealt(2, id, 120);
    for (const cid of ['private_booking', 'trip']) if (WORKDECK[id].cards.some((k) => k.id === cid)) {
      ok(!careful[cid], `${id}: Careful never sees ${cid}`);
      ok((bold[cid] || 0) > 0, `${id}: Bold sees ${cid}`);
    }
  }
  const lo = hireAs('creator', 1), hi = hireAs('creator', 1);
  ctx.wkState(lo, 'creator').flags.bound = 0; ctx.wkState(hi, 'creator').flags.bound = 2;
  const k = ctx.wkCard('creator', 'week');
  ok(ctx.wkCtx(hi, k).amt > ctx.wkCtx(lo, k).amt, 'Bold pays more than Careful');
  const s = hireAs('creator', 0);
  ok(ctx.actionAvailable(ACTIONS.adult_bounds, s, null), 'the boundaries action is there');
  ctx.doAction(s, 'adult_bounds');
  const bp = pop(s, 'adultBounds');
  ok(!!bp && bp.choices.length === 4 && bp.choices.some((c) => c.value === null), 'it offers three levels and a way out');
  ctx.resolvePopup(s, bp.id, 2);
  ok(ctx.wkState(s, 'creator').flags.bound === 2, 'and sets it');
  ok(!ctx.actionAvailable(ACTIONS.adult_bounds, hireAs('club_owner', 0), null), 'a club manager has no such setting');
}

/* 6. who knows ----------------------------------------------------------------------------------- */
{
  setOn(true, true);
  const priv = hireAs('club_dancer', 0, 'private');
  const sec = ctx.adultSecret(priv, 'club_dancer');
  ok(!!sec && sec.kind === 'adult_work' && sec.note === 'club_dancer' && sec.subj === priv.playerId, 'keeping it private makes a secret');
  ok(/club floor/.test(ctx.webLabel(priv, sec)), 'it reads sensibly in the ledger');
  ok(ctx.wkState(priv, 'club_dancer').flags.vis === 'private', 'and the deck remembers');

  const open = hireAs('creator', 0, 'open');
  ok(!ctx.adultSecret(open, 'creator'), 'being open leaves no secret to leak');
  ok(ctx.wkState(open, 'creator').flags.vis === 'open', 'and the deck remembers that too');
  ok(!WORKDECK.creator.cards.find((k) => k.id === 'family_found').when(open, open.player.career, ctx.wkState(open, 'creator')), 'so the "a relative finds your page" card never comes');

  const owner = hireAs('club_owner', 0);
  ok(!pop(owner, 'adultOpen') && !ctx.adultSecret(owner, 'club_owner'), 'running a club is no secret');

  // Telling the family
  const fam = adultLife(30);
  const mom = ctx.makeAdultNear(fam, { minAge: 50, maxAge: 60 }); ctx.setRel(fam, mom.id, 'parent', 80);
  const mate = ctx.makeAdultNear(fam, { minAge: 28, maxAge: 34 }); ctx.setRel(fam, mate.id, 'partner', 70);
  ctx.hire(fam, 'companion', 0);
  const op = pop(fam, 'adultOpen');
  ctx.resolvePopup(fam, op.id, op.choices.findIndex((c) => c.value === 'family'));
  const fs = ctx.adultSecret(fam, 'companion');
  ok(!!fs && fs.knows.includes(mom.id) && fs.knows.includes(mate.id), 'telling the family puts them in on it');
  ok(ctx.wkState(fam, 'companion').flags.vis === 'family', 'and the deck remembers');

  // Telling later, on your terms
  ok(ctx.actionAvailable(ACTIONS.adult_tell, priv, null), 'you can come clean later');
  ctx.doAction(priv, 'adult_tell');
  const tp = pop(priv, 'adultTell');
  ctx.resolvePopup(priv, tp.id, tp.choices.findIndex((c) => c.value === 'open'));
  ok(!ctx.adultSecret(priv, 'club_dancer') && ctx.wkState(priv, 'club_dancer').flags.vis === 'open', 'coming clean closes the secret');

  // It leaks, over the years, and being exposed has a price.
  let exposed = 0, partnerHits = 0;
  for (let n = 0; n < 60; n++) {
    const s = adultLife(30);
    const friends = [];
    for (let i = 0; i < 6; i++) friends.push(ctx.makeAdultNear(s, { minAge: 25, maxAge: 40 }));
    friends.forEach((f, i) => ctx.setRel(s, f.id, i % 2 ? 'friend' : 'coworker', 40));
    const rom = ctx.makeAdultNear(s, { minAge: 28, maxAge: 34 }); ctx.setRel(s, rom.id, 'partner', 60);
    ctx.hire(s, 'creator', 0);
    const op2 = pop(s, 'adultOpen'); ctx.resolvePopup(s, op2.id, 0);
    s.pending = [];
    const sc = ctx.adultSecret(s, 'creator');
    sc.knows.push(...friends.slice(0, 3).map((f) => f.id));
    const scandal0 = ctx.webRep(P(s)).scandal;
    for (let y = 0; y < 12 && !sc.out; y++) { s.year++; ctx.webTick(s); }
    if (sc.out) {
      exposed++;
      ok(ctx.webRep(P(s)).scandal > scandal0 || ctx.webRep(P(s)).name < 50, 'being exposed costs your name');
      ok(ctx.wkState(s, 'creator').flags.vis === 'open', 'and the deck knows it is out');
    }
    if (sc.knows.includes(rom.id)) partnerHits++;
    drain(s);
  }
  ok(exposed > 5, `over the years, a secret known by three people gets out (${exposed}/60)`);
  ok(partnerHits > 3, `and the partner sometimes hears (${partnerHits}/60)`);
  // A partner who finds out is told, and may leave.
  const pf = adultLife(30);
  const pm = ctx.makeAdultNear(pf, { minAge: 28, maxAge: 34 }); ctx.setRel(pf, pm.id, 'partner', 20);
  ctx.hire(pf, 'creator', 0); const o3 = pop(pf, 'adultOpen'); ctx.resolvePopup(pf, o3.id, 0); pf.pending = [];
  const ps = ctx.adultSecret(pf, 'creator');
  const before = ctx.relOf(pf, pm.id).rel;
  ctx.webLearn(pf, ps, pm.id, null);
  ok(!!pop(pf, 'adultOpen') === false && pf.pending.some((p) => /found out/i.test(p.title)), 'a partner who learns it from somebody else gets a moment');
  ok(!ctx.relOf(pf, pm.id) || ctx.relOf(pf, pm.id).rel <= before + 4, 'and does not like it more for hearing it that way');
  setOn(false, false);
}

/* 7. the law ------------------------------------------------------------------------------------------- */
{
  setOn(true, true);
  ok(ctx.adultLaw(adultLife(30, { country: 'de' })) === 'legal' && ctx.adultLaw(adultLife(30, { country: 'us' })) === 'illegal' && ctx.adultLaw(adultLife(30, { country: 'uk' })) === 'gray', 'the law follows the country');
  ok(CRIMES.solicitation && !CRIMES.solicitation.felony && CRIMES.solicitation.sentence[1] === 0, 'a citation is never a felony');
  const dealtLaw = (cc) => {
    const seen = new Set();
    for (let i = 0; i < 80; i++) {
      const s = adultLife(30, { country: cc }); ctx.hire(s, 'companion', 0); s.pending = []; newYear(s);
      for (const h of ctx.wkState(s, 'companion').hand) if (/^law_/.test(h.cid)) seen.add(h.cid);
    }
    return [...seen].join(',');
  };
  ok(dealtLaw('de') === 'law_legal', `Germany deals only the licensing card (${dealtLaw('de')})`);
  ok(dealtLaw('us') === 'law_illegal', `the US deals only the sting card`);
  ok(dealtLaw('uk') === 'law_gray', 'the UK deals only the gray-area card');
  const s = adultLife(30, { country: 'us' });
  ctx.hire(s, 'companion', 1); s.pending = [];
  const st = ctx.wkState(s, 'companion');
  const k = ctx.wkCard('companion', 'law_illegal');
  const rec = s.player.record.length;
  ctx.wkConclude(s, 'companion', k, {}, [0], false);
  ok(s.player.record.length === rec + 1 && s.player.record[rec].crime === 'solicitation', 'a failed sting gets you cited');
  ok(!ctx.hasFelony(s), 'and the citation is not a felony');
  setOn(false, false);
}

/* 8. shortcuts ------------------------------------------------------------------------------------------- */
{
  setOn(true, true);
  const dirtyOf = (k) => k.stages.flatMap((st) => st.ways.filter((w) => w[6] && w[6].dirty));
  const withDirty = [];
  for (const id of IDS) for (const k of WORKDECK[id].cards) if (dirtyOf(k).length) withDirty.push([id, k]);
  ok(withDirty.length >= 6, `there are shortcuts on offer (${withDirty.length} cards)`);
  for (const [id, k] of withDirty) {
    for (const w of dirtyOf(k)) ok(w[6].karma < 0 || w[6].m < 0 || w[3] <= -0.1, `${id}/${k.id}: "${w[0]}" costs you something`);
    // Autopilot never takes the shortcut: karma is unchanged by any number of runs.
    let drift = 0;
    for (let i = 0; i < 12; i++) {
      const s = hireAs(id, 2);
      const st = ctx.wkState(s, id);
      st.hand.length = 0;
      st.hand.push({ hid: 'hd', cid: k.id, c: ctx.wkCtx(s, k) });
      const karma0 = s.player.karma;
      ctx.wkAuto(s, id, st.hand[0]);
      if (!hasWalk(k) && s.player.karma < karma0 - 1.5) drift++;
    }
    ok(drift === 0, `${id}/${k.id}: autopilot never takes the shortcut`);
  }
  // Choosing a shortcut pays its price even when it works.
  const s = hireAs('club_owner', 2);
  const k = ctx.wkCard('club_owner', 'share');
  const st = ctx.wkState(s, 'club_owner');
  st.hand.push({ hid: 'hs', cid: 'share', c: ctx.wkCtx(s, k) });
  const karma0 = s.player.karma, m0 = st.m;
  ctx.wkStart(s, 'hs');
  const p = pop(s, 'wkStage');
  const cut = p.choices.findIndex((c) => /Cut the share/.test(c.label));
  ctx.resolvePopup(s, p.id, cut);
  ok(s.player.karma < karma0 && st.m < m0 + 5, 'cutting the performers’ share costs karma and trust, whatever the dice say');
  const honest = hireAs('club_owner', 2);
  const hs = ctx.wkState(honest, 'club_owner');
  hs.hand.push({ hid: 'hs', cid: 'share', c: ctx.wkCtx(honest, k) });
  const hk0 = honest.player.karma;
  ctx.wkStart(honest, 'hs');
  const hp = pop(honest, 'wkStage');
  ctx.resolvePopup(honest, hp.id, hp.choices.findIndex((c) => /Refuse/.test(c.label)));
  ok(honest.player.karma > hk0, 'and the fair split earns it');
  setOn(false, false);
}

/* 9. play ------------------------------------------------------------------------------------------------- */
{
  setOn(true, true);
  let played = 0;
  for (const id of IDS) {
    for (const k of WORKDECK[id].cards) {
      for (let seed = 0; seed < 6; seed++) {
        const s = hireAs(id, Math.min(seed % 4, 3));
        s.player.money = 5e6;
        const st = ctx.wkState(s, id);
        st.hand.length = 0;
        ctx.seedRng(7200 + seed);
        st.hand.push({ hid: 'hp', cid: k.id, c: ctx.wkCtx(s, k) });
        let threw = null;
        try {
          ctx.wkStart(s, 'hp');
          let guard = 0;
          while (pop(s, 'wkStage') && guard++ < 8) {
            const pp = pop(s, 'wkStage');
            const open = pp.choices.map((c, i) => [c, i]).filter(([c]) => !c.disabled && c.value !== 'later');
            ctx.resolvePopup(s, pp.id, open[(seed + guard) % open.length][1]);
          }
          drain(s);
        } catch (e) { threw = e; }
        ok(!threw, `${id}/${k.id} seed ${seed} ran (${threw && threw.stack.split('\n').slice(0, 3).join(' | ')})`);
        if (threw) continue;
        played++;
        if (!s.dead) ok(st.ok + st.meh + st.bad + (st.walked || 0) === 1, `${id}/${k.id} counts once (${st.ok + st.meh + st.bad + (st.walked || 0)})`);
        ok(st.m >= 0 && st.m <= 100, `${id}/${k.id} meter in range`);
      }
    }
  }
  ok(played > 250, `played every card (${played} runs)`);
  setOn(false, false);
}

/* 10. switching off, and long runs -------------------------------------------------------------------------- */
{
  setOn(true, true);
  const s = hireAs('creator', 1);
  newYear(s);
  ok(ctx.wkState(s, 'creator').hand.length > 0, 'a creator has things on the desk');
  setOn(true, false);
  ok(g('wkHand')(s).length === 0, 'turning the switch off hides the desk');
  newYear(s);
  ok(ctx.wkState(s, 'creator').hand.length === 0 && !!s.player.career, 'the job carries on, and the deck does not deal');
  setOn(false, false);

  setOn(true, true);
  for (const id of IDS) for (const bound of [0, 1, 2]) {
    const l = hireAs(id, 0);
    l.player.money = 5e6;
    ctx.wkState(l, id).flags.bound = bound;
    for (let y = 0; y < 30 && !l.dead; y++) {
      l.year++; l.player.counters = {};
      if (l.player.prison) l.player.prison = null;
      if (!l.player.career) { ctx.hire(l, id, 0); const op = pop(l, 'adultOpen'); if (op) ctx.resolvePopup(l, op.id, 0); }
      ctx.careerTick(l);
      ctx.webTick(l);
      drain(l, (p, open) => open[Math.floor(Math.random() * open.length)]);
      if (l.player.career && l.player.career.id === id) {
        const st = ctx.wkState(l, id);
        for (const h of st.hand.slice(0, 2)) { ctx.wkStart(l, h.hid); drain(l, (p, open) => open[Math.floor(Math.random() * open.length)]); }
        ok(st.m >= 0 && st.m <= 100 && st.hand.length <= 6, `${id} bound ${bound} year ${y} in range`);
      }
    }
    ok(JSON.stringify(clone(l).player.work) === JSON.stringify(l.player.work), `${id}: the desk saves and loads whole`);
    ok(JSON.stringify(clone(l).web) === JSON.stringify(l.web), `${id}: the web saves and loads whole`);
  }
  setOn(false, false);
}

console.log(failures ? `\n❌ ${failures} adult-career checks failed.` : `✅ Adult-career checks passed (${checks} checks).`);
process.exit(failures ? 1 : 0);
