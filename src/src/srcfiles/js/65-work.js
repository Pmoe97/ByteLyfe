/* =====================================================================
 * 65-work.js — the career-cards engine. A job stops being a number that
 * drifts and becomes a year of things you decide. Every year a career
 * deals a hand of work cards from its deck; each card is one to four
 * decisions with odds you can read, and the way you play them moves a
 * meter that belongs to that career. The decks are in 66-work-decks.js.
 * The spy's missions (60-spy.js) and the detective's desk (64-detective.js)
 * are the same idea built by hand.
 *
 * WORKDECK[jobId] = { meter: { name, emoji, start, words }, cards: [Card], gate?, fired?, deal?,
 *                      tags?, payMul?(s, st) }
 *   tags     content tags (CONTENT_TAGS): the deck deals nothing while any is off, and never to anyone under 18
 *            (the adult careers in 71-adult-work.js); payMul scales what a card pays
 *   Card = { id, name, emoji, min?, max?, w?, when?(s, c, st), base, pay?, risk?, who?, learn?,
 *            intro?, stages: [{ text, ways: [[label, skill, sub, mod?, cost?]], ok?, bad? }],
 *            ok, meh, bad, fx?: { ok|meh|bad: { m, perf, karma, happy, health, fame, name, scandal } },
 *            die?, after?(s, out, c, st) }
 *   skill   a skill id, or 'smarts' | 'looks' | 'health'
 *   walk    a way whose sixth slot is 'walk' ends the card at once, at no cost to your meter, and always works
 *           (the adult careers use it: you can always say no). It is also what autopilot does with such a card:
 *           nothing happens on your behalf that you did not choose. The card's `walk` line says how it ended.
 *   who     'patient' | 'client' | 'regular' | 'source' | 'survivor': a real person you meet,
 *           and meet again; text uses [who], [first] and [amt]
 *   learn   a web secret kind ('npc_debt', 'npc_habit', 'npc_crime'): the person confides it
 *   risk    scales injuries and, with `die`, the chance the job kills you
 *
 * M(s).work[jobId] = { m, ok, meh, bad, hand: [{ hid, cid, c }], seq, flags }
 *   m      the career's meter, 0-100 (patient trust, squad trust, credibility...)
 *   hand   what is on your desk this year; whatever you leave is handled on autopilot
 *          at the next year's turn, at worse odds
 * wkYear runs once a year through onCareerYear (15-career.js): it settles the leftovers,
 * lets the meter feed performance (so promotions and firings still run on the ordinary
 * rules), and deals a new hand.
 * ===================================================================== */

const WORKDECK = {};
// The people a job puts in your life, as relationship kinds.
const WK_ROLES = { patient: 'patient', client: 'client', regular: 'regular', source: 'source', survivor: 'survivor' };
Object.assign(KIN_LABELS, { patient: ['Patient', 'Patient', 'Patient'], client: ['Client', 'Client', 'Client'], regular: ['Regular', 'Regular', 'Regular'], source: ['Source', 'Source', 'Source'], survivor: ['Survivor', 'Survivor', 'Survivor'] });
REL_GROUPS.find((g) => g.id === 'work').kinds.push('patient', 'client', 'regular', 'source', 'survivor');
Object.assign(REL_DECAY, { patient: 3, client: 3, regular: 3, source: 3, survivor: 3 });
Object.assign(WEB_TIE_KIND, { patient: 'work', client: 'work', regular: 'work', source: 'work', survivor: 'work' });
// What each outcome does unless a card says otherwise.
const WK_FX = { ok: { m: 5, perf: 5, happy: 1 }, meh: { m: 1, perf: 1 }, bad: { m: -6, perf: -6, happy: -2 } };

function defWork(ids, def) {
  for (const id of [].concat(ids)) WORKDECK[id] = def;
  return def;
}
function wkState(s, id) {
  const m = M(s), all = m.work || (m.work = {});
  return all[id] || (all[id] = { m: WORKDECK[id].meter.start, ok: 0, meh: 0, bad: 0, hand: [], seq: 0, flags: {} });
}
function wkDef(s) { const c = M(s).career; return c && WORKDECK[c.id] ? WORKDECK[c.id] : null; }
function wkCard(id, cid) { const d = WORKDECK[id]; return d ? d.cards.find((k) => k.id === cid) : null; }
function wkWord(def, m) { let w = def.meter.words[0][1]; for (const [min, word] of def.meter.words) if (m >= min) w = word; return w; }
function wkSkill(s, key) { return key === 'smarts' || key === 'looks' || key === 'health' ? P(s).stats[key] : skill(s, key); }
// The chance a way works: the skill it leans on, how your career is going, and how sharp you are.
function wkOdds(s, k, way, st, penalty) {
  if (way[5] === 'walk') return 1;
  const o = (k.base ?? 0.5) + (wkSkill(s, way[1]) - 40) / 160 + (P(s).stats.smarts - 50) / 500 + (st.m - 50) / 400 + (M(s).career.perf - 50) / 500 + (way[3] || 0) - (penalty || 0);
  return clamp(o, 0.08, 0.9);
}
function wkFmt(str, c) {
  c = c || {};
  return vary(String(str ?? '').replace(/\[who\]/g, c.who || 'someone').replace(/\[first\]/g, c.first || 'they').replace(/\[amt\]/g, c.amt ? fmtMoney(c.amt) : 'a little'));
}

/* ---- the people it puts in your life ---------------------------------------- */
function wkPerson(s, role) {
  const kind = WK_ROLES[role];
  const have = relPeople(s, [kind]);
  if (have.length >= 3 && chance(0.55)) return pick(have);
  const p = makeAdultNear(s, { minAge: 20, maxAge: 78 });
  setRel(s, p.id, kind, randInt(30, 55));
  const all = relPeople(s, [kind]).filter((x) => x.id !== p.id).sort((a, b) => relOf(s, a.id).rel - relOf(s, b.id).rel); // never drop who you just met
  while (all.length > 7) dropRel(s, all.shift().id);
  return p;
}
function wkCtx(s, k) {
  const c = {};
  if (k.who) { const p = wkPerson(s, k.who); c.pid = p.id; c.who = fullName(p); c.first = p.first; }
  if (k.pay) {
    const def = WORKDECK[M(s).career.id];
    c.amt = price(s, Math.round(k.pay * (1 + M(s).career.level * 0.3) * (def && def.payMul ? def.payMul(s, wkState(s, M(s).career.id)) : 1)));
  }
  return c;
}

/* ---- the year ------------------------------------------------------------------ */
function wkYear(s, c) {
  const def = WORKDECK[c.id];
  if (!def) return;
  const st = wkState(s, c.id);
  if (!wkLive(s, def)) { st.hand.length = 0; return; } // a switch was turned off: the job carries on, the deck does not
  // Whatever is still on the desk gets handled without you.
  const left = st.hand.splice(0);
  if (left.length) {
    const outs = left.map((h) => wkAuto(s, c.id, h));
    if (M(s).career) log(s, `📋 You left ${nOf(left.length, 'job')} on the desk and handled ${left.length === 1 ? 'it' : 'them'} on autopilot: ${outs.filter((o) => o === 'ok').length} fine, ${outs.filter((o) => o === 'bad').length} not.`);
  }
  if (s.dead || !M(s).career) return;
  st.m = clamp100(st.m + (50 - st.m) * 0.08);
  c.perf = clamp100(c.perf + (st.m - 50) * 0.1);
  if (def.gate && !def.gate(s, c, st)) c.levelYears = 0; // not ready for the next rung
  if (st.m <= 8 && chance(0.4)) { fire(s, def.fired || 'Your record stopped speaking for itself, and so did your employer.'); return; }
  wkDeal(s, c, def, st);
}
// A deck behind content tags deals only while they are on, and only to adults.
function wkLive(s, def) { return !def.tags || (tagsOn(def.tags) && A(s) >= 18); }
function wkDeal(s, c, def, st) {
  const lvl = c.level;
  let pool = def.cards.filter((k) => (k.min || 0) <= lvl && (k.max === undefined || lvl <= k.max) && (!k.when || k.when(s, c, st)));
  const n = def.deal ? def.deal(lvl) : 2 + (lvl >= 2 ? 1 : 0);
  for (let i = 0; i < n && pool.length; i++) {
    const k = weighted(pool, (x) => (typeof x.w === 'function' ? x.w(s, c, st) : x.w ?? 1));
    if (!k) break;
    pool = pool.filter((x) => x !== k);
    st.hand.push({ hid: 'h' + (++st.seq).toString(36), cid: k.id, c: wkCtx(s, k) });
  }
  if (st.hand.length) {
    log(s, `📋 ${nOf(st.hand.length, 'thing')} on your desk this year (Work → ${def.desk || 'Your desk'}).`);
    if (s.pending.length < 2 && free(s)) wkStagePopup(s, c.id, wkCard(c.id, st.hand[0].cid), st.hand[0], 0, [], true);
  }
}

/* ---- playing a card -------------------------------------------------------------- */
function wkStagePopup(s, id, k, h, step, res, first) {
  const stg = k.stages[step], S = wkState(s, id);
  const choices = stg.ways.map((w, i) => {
    const cost = w[4] ? price(s, w[4]) : 0;
    return { label: wkFmt(w[0], h.c), value: i, sub: `${w[2] ? w[2] + ' · ' : ''}${Math.round(wkOdds(s, k, w, S) * 100)}%${cost ? ' · ' + fmtMoney(cost) : ''}`, disabled: cost > M(s).money };
  });
  if (first) choices.push({ label: 'Not now', value: 'later', sub: 'It stays on your desk' });
  const text = (step === 0 && k.intro ? wkFmt(k.intro, h.c) + ' ' : '') + wkFmt(stg.text, h.c);
  popup(s, { emoji: k.emoji, title: k.name + (k.stages.length > 1 ? ` (${step + 1}/${k.stages.length})` : ''), text, handler: 'wkStage', ctx: { job: id, cid: k.id, hid: h.hid, c: h.c, step, res }, choices, person: h.c.pid || null });
}
// Open a card from your desk.
function wkStart(s, hid) {
  const c = M(s).career, def = wkDef(s);
  if (!c || !def || !free(s)) return;
  const h = wkState(s, c.id).hand.find((x) => x.hid === hid);
  if (!h) return;
  wkStagePopup(s, c.id, wkCard(c.id, h.cid), h, 0, [], false);
}
onChoice('wkStage', (s, ctx, v) => {
  const k = wkCard(ctx.job, ctx.cid), cr = M(s).career;
  if (!k || !cr || cr.id !== ctx.job) return { text: 'By the time you got to it, it was somebody else’s problem.', quiet: true, nolog: true };
  if (v === 'later') return { text: 'You pushed it to later.', quiet: true, nolog: true };
  const S = wkState(s, ctx.job), stg = k.stages[ctx.step], w = stg && stg.ways[v];
  if (!w) return;
  const cost = w[4] ? price(s, w[4]) : 0;
  if (cost && !pay(s, cost)) return cantAfford(cost);
  if (ctx.step === 0) {
    const i = S.hand.findIndex((h) => h.hid === ctx.hid);
    if (i < 0) return { text: 'That one was already handled.', quiet: true, nolog: true };
    S.hand.splice(i, 1);
  }
  if (w[6]) wkEff(s, ctx.job, w[6]);
  if (w[5] === 'walk') return wkWalk(s, ctx.job, k, ctx.c);
  const ok = chance(wkOdds(s, k, w, S));
  if (!['smarts', 'looks', 'health'].includes(w[1])) addSkill(s, w[1], randFloat(0.5, 2));
  const res = ctx.res.concat([ok ? 1 : 0]);
  if (ctx.step + 1 < k.stages.length) {
    wkStagePopup(s, ctx.job, k, { hid: ctx.hid, c: ctx.c }, ctx.step + 1, res, false);
    return { text: wkFmt(ok ? stg.ok || 'That went your way.' : stg.bad || 'That did not go to plan.', ctx.c), title: k.name, emoji: k.emoji, nolog: true, tone: ok ? 'good' : 'bad' };
  }
  return wkConclude(s, ctx.job, k, ctx.c, res, false);
});

// What a way does just by being chosen (see W in 66-work-decks.js).
function wkEff(s, id, e) {
  const S = wkState(s, id);
  if (e.money) add(s, { money: Math.round(e.money * econ(s)) });
  add(s, { karma: e.karma || 0, happy: e.happy || 0, health: e.health || 0, fame: e.fame || 0 });
  if (e.m) S.m = clamp100(S.m + e.m);
  if (e.perf && M(s).career) M(s).career.perf = clamp100(M(s).career.perf + e.perf);
  if (e.name || e.scandal) webRepAdd(P(s), { name: e.name || 0, scandal: e.scandal || 0 });
  if (e.secret) webNewSecret(s, 'crime', s.playerId, { crime: e.secret, sev: 2, ev: 20 });
}
// You said no, and that is the end of it: nothing is lost but what the card would have paid.
function wkWalk(s, id, k, c, auto) {
  const S = wkState(s, id);
  S.walked = (S.walked || 0) + 1;
  if (k.walkFx) { add(s, { happy: k.walkFx.happy || 0 }); S.m = clamp100(S.m + (k.walkFx.m || 0)); }
  tally(s, 'workWalks');
  const text = wkFmt(k.walk || 'You said no, and left it there. Nobody argued.', c);
  if (auto) { log(s, `📋 ${k.name}: ${text}`); return 'walk'; }
  return { text, title: k.name, emoji: k.emoji, tone: '' };
}
// All the stages are in: what it came to.
function wkConclude(s, id, k, c, res, auto) {
  const S = wkState(s, id), cr = M(s).career, n = res.length, wins = res.reduce((a, b) => a + b, 0);
  const out = wins === n ? 'ok' : wins === 0 ? 'bad' : wins * 2 >= n ? 'meh' : 'bad';
  S[out]++;
  const fx = Object.assign({}, WK_FX[out], (k.fx && k.fx[out]) || {});
  S.m = clamp100(S.m + (fx.m || 0));
  cr.perf = clamp100(cr.perf + (fx.perf || 0));
  add(s, { karma: fx.karma || 0, happy: fx.happy || 0, health: fx.health || 0, fame: fx.fame || 0 });
  if (fx.name) webRepAdd(P(s), { name: fx.name });
  if (fx.scandal) webRepAdd(P(s), { scandal: fx.scandal, name: -Math.round(fx.scandal / 2) });
  let money = 0;
  if (c.amt && out !== 'bad') { money = out === 'ok' ? c.amt : Math.round(c.amt / 2); add(s, { money }); }
  const person = c.pid && s.people[c.pid];
  if (person && relOf(s, person.id)) addRel(s, person.id, out === 'ok' ? 8 : out === 'meh' ? 2 : -6);
  if (out === 'bad' && k.risk) {
    if (chance(0.22 * k.risk)) { getSick(s, pick(['broken_arm', 'broken_leg', 'concussion'])); add(s, { health: -8 }); }
    if (k.die && chance(0.025 * k.risk) && !s.dead) die(s, k.die);
  }
  if (k.after && !s.dead) k.after(s, out, c, S);
  tally(s, 'workCards');
  if (out === 'ok') tally(s, 'workWins');
  webFact(s, 'work_done', { job: id, card: k.id, out });
  if (!auto && k.learn && out !== 'bad' && person && !s.dead) wkLearn(s, k, person);
  const text = wkFmt(k[out], c) + (money ? ` You earned ${fmtMoney(money)}.` : '');
  if (auto) { log(s, `📋 ${k.name}: ${text}`, out === 'bad' ? 'bad' : ''); return out; }
  return { text, title: k.name, emoji: k.emoji, tone: out === 'ok' ? 'good' : out === 'bad' ? 'bad' : '' };
}
// A contact confides something. What you do with it is the web's business (62-web.js).
function wkLearn(s, k, person) {
  const o = { ev: 20, knows: [s.playerId] };
  if (k.learn === 'npc_crime') o.note = pick(NPC_CRIME_NOTES);
  if (k.learn === 'npc_habit') o.note = pick(NPC_HABIT_NOTES);
  if (k.learn === 'npc_affair') {
    const other = pick(relPeople(s, ['friend', 'coworker', 'regular', 'client']).filter((x) => x.id !== person.id && attractedTo(person, x)));
    if (!other || !person.partner) return;
    o.other = other.id; o.knows.push(other.id);
  }
  if (webLive(s, (x) => x.subj === person.id).length) return;
  const sec = webNewSecret(s, k.learn, person.id, o);
  sec.via = k.who;
  webHearsay(s, sec, person.id, true);
}

// The same card on autopilot: the best way at each stage, at worse odds.
function wkAuto(s, id, h) {
  const k = wkCard(id, h.cid), S = wkState(s, id);
  if (!k) return 'meh';
  if (k.stages.some((stg) => stg.ways.some((w) => w[5] === 'walk'))) return wkWalk(s, id, k, h.c, true); // nothing happens on your behalf that you did not choose
  // Autopilot never takes a shortcut: ways marked dirty are left to you.
  const res = k.stages.map((stg) => { const ways = stg.ways.filter((w) => !(w[6] && w[6].dirty)), best = (ways.length ? ways : stg.ways).reduce((a, w) => (wkOdds(s, k, w, S) > wkOdds(s, k, a, S) ? w : a)); return chance(wkOdds(s, k, best, S, 0.08)) ? 1 : 0; });
  return wkConclude(s, id, k, h.c, res, true);
}
function wkLeft(s, c) { const st = M(s).work && M(s).work[c.id]; if (st) st.hand = []; }

/* ---- actions --------------------------------------------------------------------- */
const wkHand = (s) => { const c = M(s).career; return c && WORKDECK[c.id] && wkLive(s, WORKDECK[c.id]) && free(s) ? wkState(s, c.id).hand : []; };
defAction({
  id: 'wk_work', cat: 'job', label: 'Work your desk', emoji: '📋', desc: 'Pick something that needs doing, and decide how.',
  when: (s) => wkHand(s).length > 0,
  sub: (s) => `${nOf(wkHand(s).length, 'thing')} waiting`,
  run: (s) => {
    const c = M(s).career, hand = wkHand(s);
    const choices = hand.map((h) => { const k = wkCard(c.id, h.cid); return { label: `${k.emoji} ${k.name}`, sub: wkFmt(k.stages.length > 1 ? `${k.stages.length} decisions` : 'One decision', h.c) + (h.c.who ? ' · ' + h.c.who : ''), value: h.hid }; });
    choices.push({ label: 'Never mind', value: null });
    popup(s, { emoji: '📋', title: WORKDECK[c.id].desk || 'Your desk', text: 'What do you pick up?', handler: 'wkPick', choices });
  },
});
onChoice('wkPick', (s, ctx, hid) => { if (hid) wkStart(s, hid); });

// Called once the decks are defined (the end of 66-work-decks.js): every job with a deck plays its year.
function wkRegister() {
  for (const id of Object.keys(WORKDECK)) {
    if (id === 'police') continue; // the detective's desk (64-detective.js) plays its own year
    onCareerYear(id, (s, c) => wkYear(s, c));
  }
}
