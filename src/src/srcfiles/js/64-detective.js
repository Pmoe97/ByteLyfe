/* =====================================================================
 * 64-detective.js — the other side of the case file. Police work stops
 * being a number that drifts: from Detective up, you carry a caseload of
 * other people's crimes and decide how to work each one. The same case
 * engine (63-cases.js) runs your cases and the ones against you. Also the
 * crimes of strangers that land on people you know.
 *
 * M(s).dt = { solved, cold, wrong, load: [caseIds] }   made on first use
 *   load  the open cases assigned to you this year (case.assigned)
 *   wrong people you arrested who were not the one
 * The career is the existing `police` job; level 2 is Detective. Its year is
 * played by onCareerYear('police'), so promotion, firing and retirement are
 * still the ordinary career rules, fed by how many cases you close.
 * ===================================================================== */

const DT_CRIMES = [['burglary', 4], ['car_theft', 3], ['assault', 3], ['drugs', 2], ['scam', 2], ['shoplift', 1], ['vandalism', 1], ['hacking', 0.7], ['embezzle', 0.7], ['murder', 0.8], ['arson', 0.5], ['bank', 0.2], ['extortion', 0.4]];
// Crimes that can hit someone you know.
const DT_CIRCLE_CRIMES = ['burglary', 'car_theft', 'assault', 'vandalism', 'scam', 'pickpocket'];
const DT_WAYS = {
  witness: { label: 'Canvass the witnesses', sub: 'Charm', chance: (s, k) => 0.5 + skill(s, 'charisma') / 300 + (k.ev.wit >= 15 ? 0.12 : 0), fx: () => ({ wit: randInt(8, 18) }) },
  forensics: { label: 'Work the physical evidence', sub: 'Smarts', chance: (s, k) => 0.42 + P(s).stats.smarts / 220 + (k.ev.trace >= 15 ? 0.12 : 0), fx: () => ({ trace: randInt(8, 18) }) },
  records: { label: 'Pull the records and the footage', sub: 'Coding', chance: (s, k) => 0.4 + skill(s, 'coding') / 150 + (k.ev.dig >= 15 ? 0.12 : 0), fx: () => ({ dig: randInt(8, 18) }) },
  stakeout: { label: 'Stake out a suspect', sub: 'Streetwise', chance: (s) => 0.45 + skill(s, 'streetwise') / 200, fx: () => ({}), prog: [12, 22] },
  informant: { label: 'Lean on an informant', sub: 'Streetwise and charm', chance: (s) => 0.35 + skill(s, 'streetwise') / 250 + skill(s, 'charisma') / 400, fx: () => ({ wit: randInt(4, 10) }), prog: [18, 32] },
  profile: { label: 'Build a profile', sub: 'Smarts, for a pattern', chance: (s) => 0.4 + P(s).stats.smarts / 200, fx: () => ({}), prog: [14, 26], when: (k) => k.links.length > 0 || k.crime === 'murder' },
};

function dtOf(s) { const m = M(s); return m.dt || (m.dt = { solved: 0, cold: 0, wrong: 0, load: [] }); }
function isDetective(s) { const c = M(s).career; return !!c && c.id === 'police' && c.level >= 2; }
function dtCases(s) { const L = invOf(s).list; return dtOf(s).load.map((id) => L[id]).filter((k) => k && k.status === 'open'); }

/* ---- strangers' crimes ------------------------------------------------------ */
function invWorldCase(s, o) {
  o = o || {};
  const crime = o.crime || weighted(DT_CRIMES, (x) => x[1])[0];
  const c = invOpen(s, crime, { who: null, messy: chance(0.5), assigned: !!o.assigned, victim: o.victim || null, vname: o.vname || null });
  if (!c.vname) c.vname = `${randomFirst(P(s).country)} ${randomLast(P(s).country)}`;
  return c;
}
// Each year: strangers' crimes that land on someone you know, and the cases already open.
function invWorldYear(s) {
  const L = invOf(s).list;
  for (const c of Object.values(L)) {
    if (c.who !== null || c.assigned) continue;
    c.prog = clamp(c.prog + randInt(0, 22), 0, 100);
    const vic = c.victim && s.people[c.victim];
    if (c.status === 'open' && c.prog >= 100) {
      c.status = 'solved'; c.solved = s.year;
      if (vic && M(s).rels[vic.id]) log(s, `📰 Police arrested someone for the ${invVerb(c)} that hit ${vic.first}.`, 'good');
    } else if (c.status === 'open' && s.year - c.year >= 3) { c.status = 'cold'; c.coldYear = s.year; }
    if ((c.status === 'solved' || c.status === 'cold') && s.year - (c.solved || c.coldYear || c.year) > 4) delete L[c.id];
  }
  if (A(s) < 14 || s.dead || !chance(0.16)) return;
  const pool = relPeople(s, ['friend', 'bestie', 'coworker', 'classmate', 'sibling', 'parent']);
  if (!pool.length) return;
  const v = pick(pool), crime = pick(DT_CIRCLE_CRIMES);
  const c = invWorldCase(s, { crime, victim: v.id, vname: fullName(v) });
  v.stats.happy = clamp100(v.stats.happy - 8);
  webUneaseAdd(s, c.fam === 'violent' ? 1.5 : 0.4);
  const what = { burglary: 'broken into', car_theft: 'stolen from', assault: 'attacked', vandalism: 'vandalized', scam: 'scammed out of their savings', pickpocket: 'robbed on the street' }[crime];
  log(s, `📰 ${v.first} was ${what}.`, 'bad');
  if (chance(0.3) && s.pending.length < 2 && free(s)) {
    popup(s, {
      emoji: '🗂️', title: `${v.first} was ${what}`, person: v.id, handler: 'dtVictim', ctx: { pid: v.id, cost: price(s, 300) },
      text: `${v.first} is shaken. The police took a report, and that is about all they have done so far.`,
      choices: [{ label: 'Sit with them', value: 'sit' }, { label: 'Help them replace what was lost', sub: fmtMoney(price(s, 300)), value: 'pay', disabled: M(s).money < price(s, 300) }, { label: 'Stay out of it', value: null }],
    });
  }
}
onChoice('dtVictim', (s, ctx, v) => {
  const p = s.people[ctx.pid];
  if (!v || !p || !p.alive) return;
  if (v === 'pay') {
    if (!pay(s, ctx.cost)) return cantAfford(ctx.cost);
    if (relOf(s, p.id)) addRel(s, p.id, 12);
    p.stats.happy = clamp100(p.stats.happy + 6);
    add(s, { karma: 2 });
    return `You helped ${p.first} put things back together. They will remember who showed up.`;
  }
  if (relOf(s, p.id)) addRel(s, p.id, 8);
  add(s, { karma: 1 });
  return `You stayed with ${p.first} most of the night. Mostly you listened.`;
});

/* ---- the job -------------------------------------------------------------------- */
onCareerYear('police', (s, c) => {
  if (c.level < 2) return; // patrol has no case files
  const dt = dtOf(s), L = invOf(s).list;
  const want = 2 + c.level;
  dt.load = dt.load.filter((id) => L[id] && L[id].status === 'open');
  while (dt.load.length < want) dt.load.push(invWorldCase(s, { assigned: true }).id);
  let teamSolved = 0, cold = 0;
  for (const id of dt.load.slice()) {
    const k = L[id];
    if (k.worked === s.year) { k.prog = clamp(k.prog - 1, 0, 100); continue; } // you had it this year
    k.prog = clamp(k.prog + randInt(0, 8), 0, 100);
    k.ev.trace = clamp100(k.ev.trace - 2);
    k.ev.wit = clamp100(k.ev.wit - 3);
    if (k.prog >= 100) { k.status = 'solved'; k.solved = s.year; teamSolved++; dt.load = dt.load.filter((x) => x !== id); }
    else if (s.year - k.year >= 3 && k.prog < 60) { k.status = 'cold'; k.coldYear = s.year; dt.cold++; cold++; dt.load = dt.load.filter((x) => x !== id); }
  }
  c.perf = clamp100(c.perf - cold * 5 + teamSolved);
  if (cold) log(s, `🗂️ ${nOf(cold, 'case')} on your desk went cold this year.`, 'bad');
});
function dtSolve(s, k) {
  const dt = dtOf(s), c = M(s).career;
  k.status = 'solved'; k.solved = s.year;
  dt.solved++;
  dt.load = dt.load.filter((x) => x !== k.id);
  const big = k.crime === 'murder' || k.links.length >= 2;
  if (c) c.perf = clamp100(c.perf + (big ? 15 : 8));
  add(s, { karma: 2, fame: big ? 3 : 1, happy: 5 });
  webRepAdd(P(s), { name: big ? 4 : 2 });
  tally(s, 'casesSolved');
  const who = `${randomFirst(P(s).country)} ${randomLast(P(s).country)}, ${randInt(19, 58)}`;
  return `Case closed. You arrested ${who} for the ${invVerb(k)}${k.vname ? ' that hit ' + k.vname : ''}.`;
}

function dtWorkable(s) { return isDetective(s) && free(s) && count(s, 'detwork') < 3 + M(s).career.level && dtCases(s).length > 0; }
defAction({
  id: 'det_work', cat: 'cases', label: 'Work a case', emoji: '🔎', desc: 'Pick a file from your desk and decide how to work it.',
  when: dtWorkable,
  sub: (s) => `${nOf(dtCases(s).length, 'open case')} · ${Math.max(0, 3 + M(s).career.level - count(s, 'detwork'))} days of work left this year`,
  run: (s) => {
    const choices = dtCases(s).slice(0, 6).map((k) => ({ label: `${invEmoji(k)} ${cap(invVerb(k))}${k.vname ? ' · ' + k.vname : ''}`, sub: `${invHeat(k)} · evidence ${Math.round(invScore(k))}%`, value: k.id }));
    choices.push({ label: 'Never mind', value: null });
    popup(s, { emoji: '🔎', title: 'Your desk', text: 'Which file do you open?', handler: 'dtPick', choices });
  },
});
onChoice('dtPick', (s, ctx, id) => {
  const k = id && invOf(s).list[id];
  if (!k || k.status !== 'open' || !dtWorkable(s)) return;
  const choices = Object.keys(DT_WAYS).filter((w) => !DT_WAYS[w].when || DT_WAYS[w].when(k)).map((w) => ({ label: DT_WAYS[w].label, sub: `${DT_WAYS[w].sub} · ${Math.round(clamp(DT_WAYS[w].chance(s, k), 0.05, 0.92) * 100)}%`, value: w }));
  choices.push({ label: 'Pull in your main suspect', sub: k.prog >= 70 ? 'You have enough' : k.prog >= 40 ? 'A gamble' : 'You do not have enough', value: 'arrest', tone: k.prog < 40 ? 'bad' : '' });
  choices.push({ label: 'Close the file', value: null });
  popup(s, { emoji: '🔎', title: `${cap(invVerb(k))}${k.vname ? ' · ' + k.vname : ''}`, text: `Evidence: traces ${k.ev.trace}%, witnesses ${k.ev.wit}%, records ${k.ev.dig}%. The trail is ${invHeat(k).toLowerCase()}.`, handler: 'dtWork', ctx: { cid: k.id }, choices });
});
onChoice('dtWork', (s, ctx, how) => {
  const k = invOf(s).list[ctx.cid];
  if (!how || !k || k.status !== 'open' || !dtWorkable(s)) return;
  bump(s, 'detwork');
  k.worked = s.year;
  const dt = dtOf(s), c = M(s).career;
  if (how === 'arrest') {
    const ok = chance(k.prog >= 70 ? 0.85 : k.prog >= 40 ? 0.55 : 0.2);
    if (ok) return { text: dtSolve(s, k), tone: 'good', emoji: '🔎' };
    dt.wrong++;
    c.perf = clamp100(c.perf - 12);
    k.prog = clamp(k.prog - 20, 0, 100);
    webRepAdd(P(s), { scandal: 4, name: -3 });
    return { text: 'You arrested the wrong person. A lawyer, a camera and a front page later, you are explaining yourself to your captain.', tone: 'bad' };
  }
  const w = DT_WAYS[how];
  if (chance(clamp(w.chance(s, k), 0.05, 0.92))) {
    invEvidence(s, k, w.fx());
    k.prog = clamp(k.prog + (w.prog ? randInt(w.prog[0], w.prog[1]) : randInt(8, 16)), 0, 100);
    c.perf = clamp100(c.perf + 2);
    addSkill(s, how === 'forensics' || how === 'profile' ? 'writing' : how === 'records' ? 'coding' : 'streetwise', 1);
    if (k.prog >= 100) return { text: dtSolve(s, k), tone: 'good', emoji: '🔎' };
    return `${w.label}: it paid off. The ${invVerb(k)} case is ${invHeat(k).toLowerCase()} now.`;
  }
  if (how === 'informant') { add(s, { karma: -1 }); k.prog = clamp(k.prog - 5, 0, 100); return { text: 'Your informant sold you a story that did not hold up. Worse, now they know what you were looking for.', tone: 'bad' }; }
  c.perf = clamp100(c.perf - 1);
  return { text: `${w.label}: a dead end. A week of work, and a very good coffee.`, tone: 'bad' };
});

// A detective's most tempting crime: losing their own file.
defAction({
  id: 'det_pull_file', cat: 'cases', label: 'Pull your own file', emoji: '📁', desc: 'You know where it is kept.',
  when: (s) => isDetective(s) && free(s) && invMine(s, (c) => c.status === 'open').length > 0 && !count(s, 'pullfile'),
  run: (s) => {
    bump(s, 'pullfile');
    const k = invMine(s, (c) => c.status === 'open').sort((a, b) => b.prog - a.prog)[0];
    add(s, { karma: -6 });
    if (chance(0.25)) {
      webRepAdd(P(s), { scandal: 20, name: -15 });
      fire(s, 'Internal Affairs found the gap in the evidence log. You were fired in disgrace.');
      const r = arrest(s, 'bribery');
      return { text: `Someone noticed the file was thinner than it should be. ${r && r.text ? r.text : ''}`.trim(), tone: 'bad' };
    }
    invEvidence(s, k, { trace: -35, wit: -10 });
    k.prog = clamp(k.prog - 25, 0, 100);
    return { text: `You stayed late and carried a few things out in your coat. The ${invVerb(k)} file is a lot thinner now.`, tone: 'bad' };
  },
});
