// Language dial and intimacy verification:  node dev/verify/intim.mjs
//
// Covers 67-language.js and 68-intimacy.js:
//   1. the dial       — {~clean|salty|unfiltered} picks by the setting, gated events and choices appear only at their level
//   2. gating         — with Mature or Intimacy off the game is exactly as before: the old hookup, no new actions or events
//   3. adults only    — nothing here runs for anyone under 18, on either side
//   4. a night        — every path through a scene runs, you can always stop, and a cheating night becomes a secret
//   5. consequences   — skipping protection raises the risk, a test lowers it, contraception helps, infections are silent until found
//   6. spark          — tending a relationship raises it, neglect lowers it, and what you can do depends on it
//   7. friends with benefits — asking, nights, feelings, ending and dating, and only when you are free to
//   8. health         — testing, the conversation that follows, and what hiding a diagnosis costs
//   9. every event, every choice, at every setting of the dial
import { loadGame } from './loadgame.mjs';

const ctx = loadGame({ quiet: true });
const g = (name) => ctx.run(name);
ctx.seedRng(6804);
ctx.console.error = () => {};
let failures = 0, checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) { failures++; console.log('  ✖ ' + msg); } };
const META = g('META'), ACTIONS = g('ACTIONS'), EVENTS = g('EVENTS'), DISEASES = g('DISEASES');
const clone = (s) => JSON.parse(JSON.stringify(s));
const P = (s) => s.people[s.playerId];
const pop = (s, h) => s.pending.find((p) => p.handler === h);
const BAD = /undefined|NaN|\[object|\{~|\{[^}]*\|[^}]*\}/;
const setLang = (l) => { META.settings.language = l; };
const setInt = (on) => { META.settings.mature = on; META.settings.mature_intimacy = on; };
const adult = (age, o) => {
  const s = ctx.createLife(Object.assign({ country: 'us', year: 2000 }, o || {}));
  s.year = 2000 + age; s.pending = [];
  s.player.edu.current = null; s.player.money = 500000;
  return s;
};
const person = (s, kind, rel, o) => { const p = ctx.makeAdultNear(s, Object.assign({ minAge: 25, maxAge: 40 }, o || {})); ctx.setRel(s, p.id, kind, rel ?? 60); return p; };
const drain = (s, pickFn, limit) => {
  for (let k = 0; k < (limit || 40) && s.pending.length; k++) {
    const p = s.pending[0];
    ok(!BAD.test(p.text) && !BAD.test(p.title) && p.choices.every((c) => !BAD.test(String(c.label) + ' ' + String(c.sub || ''))), `clean popup text "${p.title}: ${p.text}"`);
    const open = p.choices.map((c, i) => [c, i]).filter(([c]) => !c.disabled);
    const [, i] = pickFn ? pickFn(p, open) : open[0];
    ctx.resolvePopup(s, p.id, i);
  }
};
const choose = (value) => (p, open) => open.find(([c]) => c.value === value) || open[0];

/* 1. the dial ------------------------------------------------------------------------ */
{
  const t = '{~clean|salty|unfiltered}';
  setLang('clean'); ok(ctx.vary(t) === 'clean', 'clean picks the first');
  setLang('salty'); ok(ctx.vary(t) === 'salty', 'salty picks the second');
  setLang('unfiltered'); ok(ctx.vary(t) === 'unfiltered', 'unfiltered picks the third');
  ok(ctx.vary('{~a|b}') === 'b', 'it falls back to the last one given');
  setLang('clean');
  const seen = new Set(); for (let i = 0; i < 60; i++) seen.add(ctx.vary('{x|y|z}'));
  ok(seen.size === 3, 'plain braces still pick at random');
  ok(ctx.vary('A {~one|two} B {x|x}') === 'A one B x', 'the two kinds mix in one string');
  ok(META.settings.language === 'clean', 'the dial starts on clean');

  setLang('clean');
  let n0 = 0; for (let i = 0; i < 300; i++) if (ctx.langFlavor({ tone: 'bad' })) n0++;
  ok(n0 === 0, 'clean adds nothing');
  setLang('salty');
  let n1 = 0, strong = 0; for (let i = 0; i < 400; i++) { const f = ctx.langFlavor({ tone: 'bad' }); if (f) n1++; if (/fuck|shit/i.test(f)) strong++; }
  ok(n1 > 60 && n1 < 250, `salty sometimes adds a word (${n1} of 400)`);
  ok(strong === 0, 'salty keeps the strongest words out');
  setLang('unfiltered');
  let n2 = 0, s2 = 0; for (let i = 0; i < 400; i++) { const f = ctx.langFlavor({ tone: 'bad' }); if (f) n2++; if (/fuck|shit/i.test(f)) s2++; }
  ok(n2 > 60 && s2 > 20, `unfiltered adds stronger ones (${s2} of ${n2})`);
  ok(ctx.langFlavor({ tone: '' }) === '' && ctx.langFlavor({}) === '', 'a result with no tone gets no flavor');

  // Events and choices that only exist at a level.
  const s = adult(30); ctx.hire(s, 'bank', 0); s.player.license = true;
  const lang = Object.keys(EVENTS).filter((id) => EVENTS[id].lang);
  ok(lang.length >= 6, `there are events behind the dial (${lang.length})`);
  setLang('clean');
  ok(lang.every((id) => !ctx.eventEligible(s, EVENTS[id])), 'none of them show on clean');
  setLang('salty');
  ok(lang.some((id) => ctx.eventEligible(s, EVENTS[id])), 'they show on salty');
  const road = EVENTS.ln_road_rage;
  const labels = (lvl) => { setLang(lvl); s.pending = []; ctx.fireEvent(s, road); return s.pending[0].choices.map((c) => c.label); };
  ok(labels('salty').length === 3 && labels('unfiltered').length === 4 && labels('clean').length === 2, 'choices appear at their own level');
  // And answering a choice after the dial moved does nothing.
  setLang('unfiltered'); s.pending = []; ctx.fireEvent(s, road);
  setLang('clean');
  const lines = () => JSON.stringify(s.log.flatMap((e) => e.lines).filter((l) => !/Achievement unlocked/.test(l.t)));
  const before = lines();
  ctx.resolvePopup(s, s.pending[0].id, 3);
  ok(lines() === before, 'answering a choice after turning the dial down does nothing');
  setLang('clean');
}

/* 2. gating --------------------------------------------------------------------------- */
{
  setInt(false);
  const s = adult(28);
  const inn = Object.keys(ACTIONS).filter((id) => id.startsWith('in_'));
  ok(inn.length >= 8, `the intimacy actions exist (${inn.length})`);
  ok(inn.every((id) => ACTIONS[id].tags && ACTIONS[id].tags.includes('mature_intimacy')), 'every one is tagged Mature + Intimacy');
  ok(ctx.actionList(s, 'health').every((a) => !a.id.startsWith('in_')), 'no intimacy actions with the switches off');
  const evs = Object.keys(EVENTS).filter((id) => id.startsWith('in_'));
  ok(evs.length >= 8 && evs.every((id) => EVENTS[id].tags.includes('mature_intimacy') && EVENTS[id].tags.includes('mature')), `the events are tagged too (${evs.length})`);
  ok(evs.every((id) => !ctx.eventEligible(s, EVENTS[id])), 'none are eligible with the switches off');
  const old = person(s, 'friend', 60);
  s.pending = [];
  const r = ctx.doAction(s, 'hookup');
  ok(!pop(s, 'inScene') && !s.pending.some((p) => p.handler === 'inProtect'), 'the old hookup is unchanged with the switches off');
  META.settings.mature = true;
  ok(!g("intimOn")(), 'Mature alone is not enough');
  META.settings.mature = false; META.settings.mature_intimacy = true;
  ok(!g("intimOn")(), 'Intimacy alone is not enough');
  setInt(true);
  ok(g("intimOn")(), 'both together unlock it');
  const t = adult(28); const partner = person(t, 'partner', 70); partner.partner = t.playerId; P(t).partner = partner.id;
  const spark0 = ctx.relOf(t, partner.id).spark;
  setInt(false);
  for (let i = 0; i < 4; i++) { t.year++; ctx.intimTick(t); }
  ok(ctx.relOf(t, partner.id).spark === spark0, 'sparks do not move with the switches off');
}

/* 3. adults only ------------------------------------------------------------------------ */
{
  setInt(true);
  const kid = adult(16);
  ok(ctx.intimStart(kid, { c: { first: 'X', age: 20, looks: 50, gender: 'f' } }).nolog, 'a 16-year-old cannot start a scene');
  const adultS = adult(25);
  ok(ctx.intimStart(adultS, { c: { first: 'Y', age: 16, looks: 50, gender: 'f' } }).nolog, 'nor can anyone be 16 on the other side');
  const minor = ctx.makePerson(adultS, { age: 16 });
  ctx.setRel(adultS, minor.id, 'friend', 60);
  ok(ctx.intimStart(adultS, { pid: minor.id }).nolog, 'nor an existing teen');
  for (const id of Object.keys(ACTIONS).filter((x) => x.startsWith('in_'))) {
    const A = ACTIONS[id];
    ok(!A.when(kid, minor.id) && (A.target !== 'person' || !A.when(adultS, minor.id)), `${id} is closed for a teenager`);
  }
  ok(Object.keys(EVENTS).filter((id) => id.startsWith('in_')).every((id) => EVENTS[id].ages[0] >= 18), 'every intimacy event starts at 18');
  for (const id of Object.keys(EVENTS).filter((id) => id.startsWith('in_'))) ok(!ctx.eventEligible(kid, EVENTS[id]), `${id} does not fire for a teenager`);
  // A teen's pending hookup action is not offered either.
  ok(!ACTIONS.hookup.when(kid), 'the hookup action itself is 18+');
}

/* 4. a night ------------------------------------------------------------------------------ */
{
  setInt(true);
  let declined = 0, nights = 0, mornings = 0, stopped = 0;
  for (let i = 0; i < 120; i++) {
    const s = adult(27);
    ctx.seedRng(7000 + i);
    ctx.doAction(s, 'hookup');
    ok(!!pop(s, 'inScene'), 'a hookup is a scene now');
    const first = ['talk', 'direct', 'flow', 'no'][i % 4];
    ctx.resolvePopup(s, pop(s, 'inScene').id, pop(s, 'inScene').choices.findIndex((c) => c.value === first));
    if (pop(s, 'inProtect')) {
      const mode = ['protect', 'test', 'skip', 'stop'][i % 4];
      const pp = pop(s, 'inProtect');
      const idx = pp.choices.findIndex((c) => c.value === mode);
      ctx.resolvePopup(s, pp.id, idx >= 0 ? idx : 0);
      if (mode === 'stop') stopped++;
    } else declined++;
    if (pop(s, 'inMorning')) { mornings++; drain(s, choose(['stay', 'again', 'once', 'slip'][i % 4])); }
    drain(s);
    if (ctx.intimOf(s).n) nights++;
  }
  ok(nights > 20, `scenes lead to nights (${nights} of 120)`);
  ok(mornings === nights, 'every night has a morning after');
  ok(declined > 5 || stopped > 5, `people can say no, and so can you (${declined} declined, ${stopped} stopped)`);
  // "Not tonight" and "I changed my mind" leave nothing behind.
  const s = adult(27);
  ctx.doAction(s, 'hookup');
  ctx.resolvePopup(s, pop(s, 'inScene').id, pop(s, 'inScene').choices.findIndex((c) => c.value === 'no'));
  ok(ctx.intimOf(s).n === 0 && !ctx.relPeople(s, ['fling']).length, 'not tonight leaves nothing behind');
  // Cheating is a choice, and a secret.
  const c = adult(30); const mate = person(c, 'partner', 70); mate.partner = c.playerId; P(c).partner = mate.id;
  const cand = ctx.makeDateCandidate(c);
  ctx.intimStart(c, { c: cand });
  ok(/at home/.test(pop(c, 'inScene').text), 'the scene reminds you who is at home');
  ctx.intimNight(c, { c: cand, pid: null, first: cand.first, chem: 70, cheating: true, rom: mate.id, clarity: 1 }, 'protect');
  ok(ctx.webMine(c).some((x) => x.kind === 'cheated'), 'a night behind a partner’s back is a secret');
  const o = adult(30); const open = person(o, 'partner', 70); open.partner = o.playerId; P(o).partner = open.id; o.player.open = { pid: open.id, since: o.year, by: 'you', jealous: 10 };
  ctx.intimStart(o, { c: ctx.makeDateCandidate(o) });
  ok(!/at home/.test(pop(o, 'inScene').text), 'an open relationship is not cheating');
}

/* 5. consequences --------------------------------------------------------------------------- */
{
  setInt(true);
  const trial = (mode, bc, n) => {
    let sti = 0, preg = 0, silent = 0;
    for (let i = 0; i < n; i++) {
      const s = adult(25);
      P(s).gender = 'f'; s.player.diseases = []; s.player.pregnancy = null; ctx.intimOf(s).bc = !!bc;
      const cand = Object.assign(ctx.makeDateCandidate(s), { gender: 'm', age: 26 });
      s.pending = [];
      ctx.intimNight(s, { c: cand, pid: null, first: cand.first, chem: 60, cheating: false, rom: null, clarity: 1 }, mode);
      const d = s.player.diseases.filter((x) => DISEASES[x.id].sti);
      if (d.length) { sti++; if (d.every((x) => x.known === false)) silent++; }
      if (s.player.pregnancy) preg++;
    }
    return { sti, preg, silent };
  };
  const skip = trial('skip', false, 800), protect = trial('protect', false, 800), test = trial('test', false, 800), bc = trial('skip', true, 800);
  ok(skip.sti > protect.sti * 3, `skipping protection is far riskier for infection (${skip.sti} vs ${protect.sti})`);
  ok(test.sti <= protect.sti, `a test lowers it further (${test.sti} vs ${protect.sti})`);
  ok(skip.preg > protect.preg * 2, `and for pregnancy (${skip.preg} vs ${protect.preg})`);
  ok(bc.preg < skip.preg * 0.6, `contraception helps (${bc.preg} vs ${skip.preg})`);
  ok(skip.sti > 40 && skip.silent === skip.sti, `infections are silent (${skip.silent} of ${skip.sti})`);
  // Silent until found.
  const s = adult(28);
  ctx.getSick(s, 'chlamydia'); s.player.diseases[0].known = false;
  ok(ACTIONS.in_test.when(s), 'you can get tested');
  ctx.doAction(s, 'in_test');
  ok(s.player.diseases[0].known, 'a test finds it');
  ok(ctx.intimOf(s).tested === s.year, 'and remembers when');
  ok(!ACTIONS.in_test.when(s), 'once a year');
  const t = adult(28);
  ctx.getSick(t, 'gonorrhea'); t.player.diseases[0].known = false;
  let surfaced = false;
  for (let i = 0; i < 40 && !surfaced; i++) { t.year++; ctx.intimTick(t); surfaced = t.player.diseases[0].known; }
  ok(surfaced, 'left alone, it surfaces as symptoms');
  // Contraception costs a little and can lapse.
  const b = adult(28);
  ctx.doAction(b, 'in_bc_on');
  ok(ctx.intimOf(b).bc && !ACTIONS.in_bc_on.when(b) && ACTIONS.in_bc_off.when(b), 'contraception toggles');
  const m0 = b.player.money; b.year++; ctx.intimTick(b);
  ok(b.player.money < m0, 'it costs something each year');
  b.player.money = 0; b.year++; ctx.intimTick(b);
  ok(!ctx.intimOf(b).bc, 'and lapses when you cannot pay');
  // A reputation.
  const r = adult(28);
  for (let i = 0; i < 5; i++) ctx.intimOf(r).yrs.push(r.year);
  ok(ctx.intimRep(r) === 'Known around town' && ctx.intimDateEdge(r) < 0, 'five nights in three years is a reputation, with a cost');
  setInt(false);
  ok(ctx.intimDateEdge(r) === 0, 'which does nothing with the switches off');
  setInt(true);
  for (let i = 0; i < 4; i++) { r.year++; ctx.intimTick(r); }
  ok(ctx.intimRep(r) === '', 'and fades with time');
}

/* 6. spark ------------------------------------------------------------------------------------ */
{
  setInt(true);
  const s = adult(30);
  const mate = person(s, 'partner', 70); mate.partner = s.playerId; P(s).partner = mate.id;
  ctx.relOf(s, mate.id).spark = 40;
  for (const id of ['in_night_in', 'in_getaway', 'in_talk_wants', 'in_try_new', 'in_counsel']) {
    ok(ACTIONS[id].when(s, mate.id), `${id} is available for a partner`);
    const t = clone(s);
    const sp0 = ctx.relOf(t, mate.id).spark;
    ctx.seedRng(1);
    ctx.doAction(t, id, mate.id);
    ok(ctx.relOf(t, mate.id).spark >= sp0, `${id} does not hurt the spark`);
    ok(!ACTIONS[id].when(t, mate.id), `${id} once a year`);
  }
  ok(!ACTIONS.in_counsel.when((() => { const u = clone(s); ctx.relOf(u, mate.id).spark = 90; ctx.relOf(u, mate.id).rel = 90; return u; })(), mate.id), 'counseling is for when it has gone quiet');
  ok(!ACTIONS.in_night_in.when(s, person(s, 'friend', 50).id), 'and only for a partner');
  const poor = clone(s); poor.player.money = 0;
  ctx.doAction(poor, 'in_getaway', mate.id);
  ok(!ctx.relOf(poor, mate.id).spark || ctx.relOf(poor, mate.id).spark === 40, 'a getaway you cannot afford does nothing');
  // Neglect.
  const n = adult(30);
  const mate2 = person(n, 'partner', 40); mate2.partner = n.playerId; P(n).partner = mate2.id;
  ctx.relOf(n, mate2.id).spark = 20;
  const rel0 = ctx.relOf(n, mate2.id).rel;
  n.year++; ctx.intimTick(n);
  ok(ctx.relOf(n, mate2.id).spark < 20 && ctx.relOf(n, mate2.id).rel < rel0, 'a cold spark cools the relationship');
  ok(EVENTS.in_dry_spell.when(n), 'and brings a talk about it');
  const h = adult(30);
  const mate3 = person(h, 'partner', 80); mate3.partner = h.playerId; P(h).partner = mate3.id;
  ctx.relOf(h, mate3.id).spark = 90;
  const r3 = ctx.relOf(h, mate3.id).rel;
  h.year++; ctx.intimTick(h);
  ok(ctx.relOf(h, mate3.id).rel > r3, 'a hot spark warms it');
  ok(EVENTS.in_anniversary.when((() => { const u = clone(h); ctx.relOf(u, mate3.id).since = u.year - 5; return u; })()), 'and the anniversaries are good');
}

/* 7. friends with benefits ------------------------------------------------------------------------ */
{
  setInt(true);
  const s = adult(28);
  const pal = person(s, 'friend', 70); pal.gender = P(s).gender === 'm' ? 'f' : 'm'; P(s).orient = 'bi'; pal.orient = 'bi';
  ok(ACTIONS.in_fwb_ask.when(s, pal.id), 'you can suggest it to a friend when you are single');
  let yes = 0;
  for (let i = 0; i < 80; i++) { const t = clone(s); ctx.seedRng(9000 + i); ctx.doAction(t, 'in_fwb_ask', pal.id); if (ctx.relKind(t, pal.id) === 'fwb') yes++; }
  ok(yes > 8 && yes < 70, `sometimes they say yes (${yes} of 80)`);
  // Partnered: closed.
  const taken = clone(s); const mate = person(taken, 'partner', 70); mate.partner = taken.playerId; P(taken).partner = mate.id;
  ok(!ACTIONS.in_fwb_ask.when(taken, pal.id), 'not while you are with someone');
  // The arrangement.
  const f = clone(s); ctx.setRel(f, pal.id, 'fwb', 70); Object.assign(ctx.relOf(f, pal.id), { feel: 10, spark: 60 });
  ok(ACTIONS.in_fwb_night.when(f, pal.id), 'a night together');
  f.pending = [];
  ctx.doAction(f, 'in_fwb_night', pal.id);
  ok(!!pop(f, 'inProtect'), 'it skips straight to the part about protection');
  drain(f, choose('protect'));
  ok(ctx.intimOf(f).n === 1, 'and counts');
  // Feelings.
  const e = clone(s); ctx.setRel(e, pal.id, 'fwb', 70); Object.assign(ctx.relOf(e, pal.id), { feel: 54, spark: 60 });
  let got = false;
  for (let i = 0; i < 60 && !got; i++) { e.year++; e.pending = []; ctx.relOf(e, pal.id).feel = Math.max(ctx.relOf(e, pal.id).feel, 54); ctx.fwbYear(e); got = !!pop(e, 'inFeelings'); }
  ok(got, 'one of you catches feelings');
  const pp = pop(e, 'inFeelings');
  for (const v of ['date', 'honest', 'pull']) {
    const t = clone(e); let threw = null;
    try { ctx.resolvePopup(t, pop(t, 'inFeelings').id, pp.choices.findIndex((c) => c.value === v)); } catch (x) { threw = x; }
    ok(!threw, `feelings: ${v} ran`);
    ok(ctx.relKind(t, pal.id) !== 'fwb' || v === 'date', `feelings: ${v} ends the arrangement`);
  }
  // Define it.
  const d = clone(s); ctx.setRel(d, pal.id, 'fwb', 70); Object.assign(ctx.relOf(d, pal.id), { feel: 80, spark: 60 });
  d.pending = []; ctx.doAction(d, 'in_fwb_define', pal.id);
  ok(!!pop(d, 'inDefine'), 'you can say what this is');
  let dated = 0, ended = 0;
  for (let i = 0; i < 40; i++) { const t = clone(d); ctx.seedRng(500 + i); const q = pop(t, 'inDefine'); ctx.resolvePopup(t, q.id, q.choices.findIndex((c) => c.value === 'date')); if (['partner'].includes(ctx.relKind(t, pal.id))) dated++; else ended++; }
  ok(dated > 15 && ended > 0, `asking can work or not (${dated} of 40)`);
  // Getting serious with someone else ends it.
  const x = clone(f); const mate2 = person(x, 'partner', 70); mate2.partner = x.playerId; P(x).partner = mate2.id;
  x.year++; x.pending = []; ctx.fwbYear(x);
  ok(ctx.relKind(x, pal.id) === 'friend', 'it ends when you get serious with someone else');
}

/* 8. health ------------------------------------------------------------------------------------------- */
{
  setInt(true);
  const s = adult(30);
  const mate = person(s, 'partner', 70); mate.partner = s.playerId; P(s).partner = mate.id;
  ctx.getSick(s, 'herpes'); s.player.diseases[0].known = true;
  ok(EVENTS.in_sti_tell.when(s), 'a known diagnosis brings the conversation');
  s.pending = [];
  ctx.fireEvent(s, EVENTS.in_sti_tell);
  const pp = s.pending[0];
  for (let i = 0; i < pp.choices.length; i++) {
    const t = clone(s); let threw = null;
    try { ctx.resolvePopup(t, t.pending[0].id, i); drain(t); } catch (e) { threw = e; }
    ok(!threw, `diagnosis choice "${pp.choices[i].label}" ran`);
    ok(!EVENTS.in_sti_tell.when(t), 'and it is only asked once');
  }
  const hide = clone(s); ctx.resolvePopup(hide, hide.pending[0].id, hide.pending[0].choices.findIndex((c) => c.value === undefined && /nothing/i.test(c.label)) >= 0 ? hide.pending[0].choices.findIndex((c) => /nothing/i.test(c.label)) : 2);
  const sec = ctx.webMine(hide).find((x) => x.kind === 'sti');
  ok(!!sec && sec.rom === mate.id, 'hiding it is a secret from your partner');
  ok(ctx.webLabel(hide, sec).includes('diagnosis'), 'which reads as a diagnosis');
  const rel0 = ctx.relOf(hide, mate.id).rel;
  ctx.webLearn(hide, sec, mate.id, hide.playerId);
  ok(sec.out && ctx.relOf(hide, mate.id)?.rel < rel0 || !ctx.relOf(hide, mate.id), 'and finding out costs you');
}

/* 9. every event, every choice, at every setting ---------------------------------------------------------- */
{
  setInt(true);
  for (const lvl of ['clean', 'salty', 'unfiltered']) {
    setLang(lvl);
    for (const id of Object.keys(EVENTS).filter((x) => x.startsWith('in_') || x.startsWith('ln_'))) {
      const ev = EVENTS[id];
      let fired = false;
      for (let tries = 0; tries < 25 && !fired; tries++) {
        const s = adult(32); s.player.money = 100000; s.player.license = true;
        const mate = person(s, 'partner', 70); mate.partner = s.playerId; P(s).partner = mate.id;
        if (['in_ex_text', 'in_app_match', 'in_photo', 'in_coworker_spark'].includes(id)) { s.player.rels[mate.id].kind = 'friend'; mate.partner = null; P(s).partner = null; }
        ctx.setRel(s, person(s, 'ex', 50).id, 'ex', 50);
        ctx.hire(s, 'bank', 1); person(s, 'coworker', 50); person(s, 'friend', 60);
        for (let k = 0; k < 4; k++) ctx.intimOf(s).yrs.push(s.year);
        const r = ctx.romanticId(s); if (r) { ctx.relOf(s, r).spark = id === 'in_dry_spell' ? 20 : 60; ctx.relOf(s, r).since = s.year - 5; }
        ctx.getSick(s, 'chlamydia'); s.player.diseases[0].known = true;
        ctx.setRel(s, ctx.makePerson(s, { age: 5, parents: [s.playerId] }).id, 'child', 70);
        if (!ctx.eventEligible(s, ev)) continue;
        s.pending = [];
        if (!ctx.fireEvent(s, ev)) continue;
        fired = true;
        const pp = s.pending[0];
        if (!pp) break; // an event that just happens
        for (let i = 0; i < pp.choices.length; i++) {
          if (pp.choices[i].disabled) continue;
          for (let r2 = 0; r2 < 3; r2++) {
            const t = clone(s); ctx.seedRng(40 + r2 * 13 + i);
            let threw = null;
            try { ctx.resolvePopup(t, t.pending[0].id, i); drain(t, null, 40); } catch (e) { threw = e; }
            ok(!threw, `${id} @${lvl} choice "${pp.choices[i].label}" ran (${threw && threw.stack.split('\n').slice(0, 3).join(' | ')})`);
          }
        }
      }
      if (!(ev.lang && ev.lang > ['clean', 'salty', 'unfiltered'].indexOf(lvl))) ok(fired || id === 'in_sti_tell' && false, `${id} could fire @${lvl}`);
    }
  }
  setLang('clean');
  // A whole life with everything on.
  setInt(true); setLang('unfiltered');
  const s = adult(20);
  for (let y = 0; y < 40 && !s.dead; y++) {
    s.player.counters = {}; s.year++;
    if (s.player.prison) s.player.prison = null;
    ctx.intimTick(s);
    for (let k = 0; k < 2; k++) {
      const av = ctx.actionList(s, 'love').concat(ctx.actionList(s, 'health')).filter((a) => a.id === 'hookup' || a.id.startsWith('in_') && !a.target);
      if (av.length) { ctx.doAction(s, av[Math.floor(Math.random() * av.length)].id); drain(s, (p, open) => open[Math.floor(Math.random() * open.length)]); }
    }
    for (const a of ctx.actionList(s, 'person')) void a;
    const im = ctx.intimOf(s);
    ok(im.n >= 0 && Number.isFinite(s.player.money) && Number.isFinite(P(s).stats.happy), `a life stays sane (${y})`);
  }
  const copy = clone(s);
  ok(JSON.stringify(copy.player.intim) === JSON.stringify(s.player.intim), 'and saves whole');
  setInt(false); setLang('clean');
}

console.log(failures ? `\n❌ ${failures} language and intimacy checks failed.` : `✅ Language and intimacy checks passed (${checks} checks).`);
process.exit(failures ? 1 : 0);
