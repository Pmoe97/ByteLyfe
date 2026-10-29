/* =====================================================================
 * 19-health.js — the body over a lifetime: aging, illness, addiction,
 * happiness drift, mortality; doctors, therapy, surgery, rehab.
 * ===================================================================== */

function getSick(s, id, opts) {
  const d = DISEASES[id];
  const m = M(s);
  if (!d || m.diseases.some((x) => x.id === id)) return false;
  if (d.once && m.flags['had_' + id]) return false;
  m.diseases.push({ id, since: s.year, known: !d.hidden || !!(opts && opts.known) });
  if (d.once) m.flags['had_' + id] = true;
  tally(s, 'illnesses');
  return true;
}
// 'a common cold', 'the flu', 'pneumonia'.
function diseaseNoun(id) { const D = DISEASES[id]; return D.noun || (D.art ? D.art + ' ' : '') + D.name.toLowerCase(); }
// How much deadlier an illness is at your age: an ageMult table ([[lo, hi, x], ...]) if it has one, else the old rule (worse past 70).
// A vaccine (flag vaxd, for illnesses with a vax factor: 09-data-history.js) makes the worst of it much less likely.
function diseaseAgeMult(s, D, age) {
  let x = age > 70 ? 1.5 : 1;
  if (D.ageMult) { const row = D.ageMult.find(([lo, hi]) => age >= lo && age <= hi); x = row ? row[2] : 1; }
  if (D.vax && M(s).flags.vaxd) x *= D.vax;
  return x;
}
function knownDiseases(s) { return M(s).diseases.filter((d) => d.known); }
function hasDisease(s, id) { return M(s).diseases.some((d) => d.id === id); }
function cureDisease(s, id) { M(s).diseases = M(s).diseases.filter((d) => d.id !== id); }
function habit(s, id, amt) {
  const m = M(s);
  let a = amt;
  if (trait(s, 'addictive') && amt > 0) a *= 1.6;
  m.addictions[id] = clamp((m.addictions[id] || 0) + a, 0, 100);
  if (amt > 0) (m.used || (m.used = {}))[id] = s.year; // the year you last used (69-substances.js reads it)
  if (m.addictions[id] <= 0) delete m.addictions[id];
  return m.addictions[id] || 0;
}
function addicted(s, id) { return (M(s).addictions[id] || 0) >= 50; }
function medPrice(s, t) {
  const base = Math.round(price(s, t.cost) * vetCareMult(s)); // veterans’ care (59-military.js)
  return country(s).freeHealth && !t.noDiscount ? Math.round(base * 0.1) : base;
}
// What you pay for care. Until 18, your parents (or guardians) pay, the way they pay for lessons.
function medBill(s, t) { return A(s) < 18 ? 0 : medPrice(s, t); }
function medLabel(s, t) { return A(s) < 18 ? 'Your parents pay' : fmtMoney(medPrice(s, t)); }

// Yearly odds of dying. Rises steeply with age; poor health multiplies it.
// The age a body acts and looks: a vampire's stops where they were turned (51-chaos.js).
function bodyAge(s, p) { return p.frozenAge !== undefined && p.frozenAge !== null ? Math.min(ageOf(s, p), p.frozenAge) : ageOf(s, p); }
function mortality(age, health) {
  let q = 0.00006 * Math.exp(0.088 * age);
  if (age < 1) q += 0.002;
  const mult = health >= 50 ? 1 - (health - 50) / 100 : 1 + (50 - health) / 12;
  return clamp(q * mult, 0, 0.95);
}

/* ---- the yearly body tick ----------------------------------------- */
// The health a body settles toward at a given age, before illness and habits.
function healthTarget(age, fitness, athletic) {
  let t = age < 30 ? 92 : 92 - (age - 30) * 0.7;
  if (age > 85) t -= (age - 85) * 1.2;
  return t + Math.min(12, fitness / 8) + (athletic ? 4 : 0);
}

function bodyTick(s) {
  const p = P(s), m = M(s), age = bodyAge(s, p);
  const fit = skill(s, 'fitness');
  // Health drifts toward what your age and fitness support; illness and habits pull it down.
  const target = healthTarget(age, fit, trait(s, 'athletic'));
  let hd = (target - p.stats.health) * 0.15 + randInt(-2, 2);
  // Fitness fades if you stop training.
  if (fit > 0) m.skills.fitness = Math.max(0, Math.round((fit - (age > 30 ? 3 : 2)) * 10) / 10);

  for (const d of m.diseases.slice()) {
    const D = DISEASES[d.id];
    hd -= D.sev;
    add(s, { happy: D.happy || 0, looks: D.looks || 0, smarts: D.smarts || 0 });
    const years = s.year - d.since;
    if (!d.known && years >= 1 && chance(0.6)) {
      d.known = true;
      announce(s, { emoji: '🤒', title: "You don't feel well", text: `You've been feeling off for a while. A doctor diagnosed you with ${diseaseNoun(d.id)}.`, tone: 'bad' });
    }
    if ((D.dur && years >= D.dur) || (D.fade && chance(D.fade))) { cureDisease(s, d.id); log(s, `🌤️ You recovered from ${diseaseNoun(d.id)}.`, 'good'); continue; }
    if (D.fatal && chance(D.fatal * (d.known ? 1 : 1.3) * diseaseAgeMult(s, D, age))) { p.stats.health = clamp100(p.stats.health + hd); die(s, D.cause || D.name.toLowerCase()); return; }
  }
  for (const id in m.addictions) {
    const sev = m.addictions[id], X = ADDICTIONS[id];
    hd += (X.health * sev) / 100;
    add(s, { happy: Math.round((X.happy * sev) / 100) });
    if (X.overdose && sev >= 60 && chance((X.overdose * sev) / 100)) {
      if (subsOn()) { if (subsOverdose(s, id)) return; } // a close call, with someone to find you, or not (69-substances.js)
      else { die(s, 'an overdose'); return; }
    }
    habit(s, id, sev >= 50 ? -randInt(0, 3) : -randInt(2, 7));
  }
  if (inPrison(s)) hd -= randInt(0, 2);
  if (m.housing.type === 'homeless' && age >= 18) hd -= randInt(1, 4);
  p.stats.health = clamp100(p.stats.health + hd);

  // Looks: bloom in youth, fade with age (fitness slows it).
  let ld = 0;
  if (age >= 12 && age <= 20) ld += randInt(-2, 3);
  if (age > 35) ld -= randInt(0, 1);
  if (age > 55) ld -= randInt(0, 2);
  if (age > 75) ld -= randInt(0, 2);
  if (fit >= 50 && ld < 0) ld += 1;
  add(s, { looks: ld });
  if (age > 75) add(s, { smarts: -randInt(0, 2) });
  bodyShapeTick(s);

  happyDrift(s);
  if (p.stats.happy < 15 && chance(0.3) && age >= 12) {
    if (getSick(s, 'depression', { known: true })) log(s, '🌧️ You were diagnosed with depression.', 'bad');
  }
}

function happyDrift(s) {
  const p = P(s), m = M(s), age = A(s);
  let target = 58;
  const rom = romanticId(s);
  if (rom && relOf(s, rom)) target += (relOf(s, rom).rel - 50) / 6;
  else if (age >= 20 && !trait(s, 'loner')) target -= 4;
  const friends = relPeople(s, ['friend', 'bestie']).length;
  target += Math.min(6, friends * (trait(s, 'loner') ? 1 : 2));
  if (age >= 18 && !m.career && !inSchool(s) && !m.retired && !m.ptJob && !inPrison(s) && !runsCompany(s)) target -= 7;
  if (m.career) target += (m.career.perf - 50) / 10;
  for (const co of m.companies || []) if (co.ceo === 'you' && co.last) target += co.last.profit > 0 ? 2 : -3;
  if (m.money < 0) target -= 8;
  if (netWorth(s) > price(s, 1e6)) target += 4;
  if (p.stats.health < 30) target -= 10;
  if (livesAlone(s)) target += (LIFESTYLES[m.lifestyle] || LIFESTYLES.normal).happy;
  if (m.housing.type === 'homeless' && age >= 18) target -= 20;
  if (inPrison(s)) target -= 15;
  if (age >= 26 && m.housing.type === 'parents') target -= 4;
  if (trait(s, 'anxious')) target -= 6;
  if (trait(s, 'lazy')) target += 3;
  if (trait(s, 'ambitious') && age >= 22 && (!m.career || m.career.levelYears > 4)) target -= 3;
  target += Math.min(4, myPets(s).length * 2);
  p.stats.happy = clamp100(p.stats.happy + (target - p.stats.happy) * 0.2 + randInt(-5, 5));
}

function diseaseTick(s) {
  const p = P(s), age = bodyAge(s, p); // a vampire catches what the age they look catches
  let odds = 0.28;
  if (trait(s, 'sickly')) odds *= 1.6;
  if (trait(s, 'resilient')) odds *= 0.5;
  if (age > 60) odds *= 1.3;
  if (p.stats.health < 40) odds *= 1.3;
  odds *= Math.pow(0.6, M(s).diseases.length);
  if (chance(odds)) {
    const pool = Object.keys(DISEASES).filter((id) => {
      const d = DISEASES[id];
      return d.w > 0 && age >= d.ages[0] && age <= d.ages[1] && (!d.gender || d.gender === p.gender) && !hasDisease(s, id) && !(d.once && M(s).flags['had_' + id]);
    });
    const id = weighted(pool, (k) => DISEASES[k].w);
    if (id && getSick(s, id)) {
      const D = DISEASES[id];
      if (!D.hidden) log(s, `${D.emoji} You came down with ${diseaseNoun(id)}.`, 'bad');
    }
  }
  if (addicted(s, 'nicotine') && age > 35 && chance(0.012)) getSick(s, 'lung_cancer');
}

function deathCheck(s) {
  if (s.dead) return;
  const p = P(s), age = bodyAge(s, p);
  if (p.stats.health <= 0 && chance(0.6)) { die(s, worstDisease(s) || 'failing health'); return; }
  if (chance(mortality(age, p.stats.health))) die(s, naturalCause(s, age));
}
function worstDisease(s) {
  const ds = M(s).diseases.slice().sort((a, b) => DISEASES[b.id].sev - DISEASES[a.id].sev);
  return ds.length ? DISEASES[ds[0].id].name.toLowerCase() : null;
}
function naturalCause(s, age) {
  const fatal = M(s).diseases.filter((d) => DISEASES[d.id].fatal);
  if (fatal.length && chance(0.7)) return DISEASES[pick(fatal).id].name.toLowerCase();
  if (age >= 75) return pick(['old age', 'old age', 'heart failure', 'a stroke', 'pneumonia', 'natural causes']);
  return pick(['a heart attack', 'a stroke', 'an aneurysm', 'a sudden illness', 'an accident at home']);
}

/* ---- health actions ------------------------------------------------ */
defAction({
  id: 'doctor', cat: 'health', label: 'Doctor', emoji: '🩺', desc: 'Checkups and treatment.',
  when: (s) => !s.dead && (free(s) || inPrison(s)),
  sub: (s) => { const k = knownDiseases(s); return k.length ? k.map((d) => DISEASES[d.id].name).join(', ') : 'No known conditions'; },
  run: (s) => {
    const known = knownDiseases(s);
    popup(s, {
      emoji: '🩺', title: 'Doctor', text: known.length ? 'What do you need help with?' : 'You have no known conditions.', handler: 'doctorPick',
      choices: [{ label: '🔬 Full checkup', value: 'checkup', sub: medLabel(s, { cost: 200 }) }]
        .concat(known.map((d) => ({ label: DISEASES[d.id].emoji + ' Treat ' + DISEASES[d.id].name.toLowerCase(), value: d.id })))
        .concat([{ label: 'Leave', value: null }]),
    });
  },
});
onChoice('doctorPick', (s, ctx, v) => {
  if (!v) return;
  if (v === 'checkup') {
    const cost = medBill(s, { cost: 200 });
    if (!pay(s, cost)) return cantAfford(cost);
    const hidden = M(s).diseases.filter((d) => !d.known);
    for (const d of hidden) if (chance(0.85)) d.known = true;
    const found = hidden.filter((d) => d.known);
    add(s, { health: randInt(1, 3) });
    if (found.length) return { text: `The checkup found something: ${listJoin(found.map((d) => DISEASES[d.id].name.toLowerCase()))}. Catching it early helps.`, tone: 'bad' };
    return 'The doctor gave you a clean bill of health.';
  }
  const D = DISEASES[v];
  popup(s, {
    emoji: D.emoji, title: 'Treat ' + D.name.toLowerCase(), text: D.cure > 0 ? 'Pick a treatment.' : 'There is no known cure, but treatment can ease symptoms.', handler: 'treat', ctx: { id: v },
    choices: TREATMENTS.map((t) => ({ label: t.emoji + ' ' + t.name, value: t.id, sub: medLabel(s, t), disabled: M(s).money < medBill(s, t) && medBill(s, t) > 0 })).concat([{ label: 'Never mind', value: null }]),
  });
});
onChoice('treat', (s, ctx, tid) => {
  if (!tid || !hasDisease(s, ctx.id)) return;
  const t = TREATMENTS.find((x) => x.id === tid), D = DISEASES[ctx.id];
  const cost = medBill(s, t);
  if (!pay(s, cost)) return cantAfford(cost);
  if (t.risk && chance(t.risk)) { die(s, 'complications from experimental treatment'); return 'The experimental treatment went terribly wrong.'; }
  const odds = clamp(D.cure * t.mult * eraMedicine(s) * (trait(s, 'resilient') ? 1.1 : 1), 0, 0.97);
  if (chance(odds)) {
    cureDisease(s, ctx.id);
    add(s, { health: randInt(4, 10), happy: 4 });
    if (D.hidden && D.fatal) tally(s, 'cancerBeaten');
    return { text: tid === 'healer' ? `Somehow, the healer's ${pick(['herbal tea', 'crystals', 'chanting', 'mystery paste'])} worked. Your ${D.name.toLowerCase()} is gone!` : `The treatment worked. Your ${D.name.toLowerCase()} is cured!`, tone: 'good' };
  }
  add(s, { health: tid === 'healer' ? 0 : randInt(1, 3) });
  return tid === 'healer' ? `The healer ${pick(['burned some sage at you', 'rubbed a potato on your forehead', 'told you to think positive'])}. Nothing changed.` : `The treatment didn't cure your ${D.name.toLowerCase()}, but you feel a little better.`;
});
defAction({
  id: 'therapy', cat: 'health', label: 'Therapy', emoji: '🛋️', desc: 'Talk it through with a professional.',
  when: (s) => free(s) && A(s) >= 10,
  sub: (s) => medLabel(s, { cost: 180 }),
  run: (s) => {
    const cost = medBill(s, { cost: 180 });
    if (!pay(s, cost)) return cantAfford(cost);
    const n = bump(s, 'therapy');
    add(s, { happy: Math.round(randInt(3, 8) / n) });
    for (const d of knownDiseases(s)) if (DISEASES[d.id].mental && chance(0.25)) { cureDisease(s, d.id); return { text: `Therapy has been working. Your ${DISEASES[d.id].name.toLowerCase()} is under control.`, tone: 'good' }; }
    return pick(['You talked about your childhood. A lot.', 'Your therapist gave you breathing exercises.', 'You cried a little. It helped.', 'You realized some things about yourself.']);
  },
});
defAction({
  id: 'surgery', cat: 'health', label: 'Plastic surgery', emoji: '💉', desc: 'Change your look. Some risk.',
  when: (s) => free(s) && A(s) >= 18,
  run: (s) => {
    popup(s, {
      emoji: '💉', title: 'Plastic surgery', text: 'Results not guaranteed.', handler: 'surgery',
      choices: SURGERIES.filter((x) => !x.minAge || A(s) >= x.minAge).map((x) => ({ label: x.name, value: x.id, sub: fmtMoney(price(s, x.cost)), disabled: M(s).money < price(s, x.cost) })).concat([{ label: 'Never mind', value: null }]),
    });
  },
});
onChoice('surgery', (s, ctx, id) => {
  if (!id) return;
  const x = SURGERIES.find((y) => y.id === id);
  if (x.pick === 'nose') {
    const cur = ensureLook(s, P(s)).nose;
    popup(s, { emoji: '💉', title: x.name, text: 'What should your new nose look like?', handler: 'surgeryPick', ctx: { id },
      choices: LOOK_OPTS.nose.filter((n) => n !== cur).map((n) => ({ label: cap(n), value: n })).concat([{ label: 'Never mind', value: null }]) });
    return;
  }
  if (x.pick === 'implants') {
    popup(s, { emoji: '💉', title: x.name, text: 'How big a change?', handler: 'surgeryPick', ctx: { id },
      choices: IMPLANT_SIZES.map((o) => ({ label: o.label, value: o.value })).concat([{ label: 'Never mind', value: null }]) });
    return;
  }
  return doSurgery(s, x);
});
onChoice('surgeryPick', (s, ctx, v) => {
  if (v === null || v === undefined) return;
  return doSurgery(s, SURGERIES.find((y) => y.id === ctx.id), v);
});
function doSurgery(s, x, pickVal) {
  const cost = price(s, x.cost);
  if (!pay(s, cost)) return cantAfford(cost);
  tally(s, 'surgeries');
  const noun = x.noun || x.name.toLowerCase();
  if (chance(0.09)) { add(s, { looks: -randInt(5, 15), happy: -10 }); return { text: `Your ${noun} was botched.`, tone: 'bad' }; }
  if (chance(x.death ?? 0.005)) { die(s, 'complications from surgery'); return 'Something went wrong on the operating table.'; }
  applySurgeryLook(s, x.id, pickVal);
  add(s, { looks: randInt(x.looks[0], x.looks[1]), happy: randInt(2, 6) });
  return { text: `Your ${noun} went great.`, tone: 'good' };
}
defAction({
  id: 'rehab', cat: 'health', label: 'Rehab', emoji: '🌱', desc: 'Kick a habit for good.',
  when: (s) => free(s) && A(s) >= 12 && Object.keys(M(s).addictions).some((k) => M(s).addictions[k] >= 25),
  run: (s) => {
    popup(s, {
      emoji: '🌱', title: 'Rehab', text: 'Which habit do you want to quit?', handler: 'rehab',
      choices: Object.keys(M(s).addictions).filter((k) => M(s).addictions[k] >= 25).map((k) => ({ label: ADDICTIONS[k].emoji + ' ' + ADDICTIONS[k].name, value: k, sub: medLabel(s, { cost: 8000 }) })).concat([{ label: 'Never mind', value: null }]),
    });
  },
});
onChoice('rehab', (s, ctx, k) => {
  if (!k) return;
  const cost = medBill(s, { cost: 8000 });
  if (!pay(s, cost)) return cantAfford(cost);
  if (chance(0.7 - (trait(s, 'addictive') ? 0.2 : 0))) {
    delete M(s).addictions[k];
    subsRehab(s, k); // tolerance resets, and a relapse now counts (69-substances.js)
    add(s, { health: randInt(3, 8), happy: 6 });
    tally(s, 'rehabs');
    return { text: `You completed rehab and kicked your ${ADDICTIONS[k].name.toLowerCase()} habit.`, tone: 'good' };
  }
  habit(s, k, -20);
  return `You left rehab early. Your ${ADDICTIONS[k].name.toLowerCase()} habit is weaker, but not gone.`;
});
defAction({
  id: 'salon', cat: 'health', label: 'Salon & spa', emoji: '💇', desc: 'A fresh look.',
  when: (s) => free(s) && A(s) >= 8,
  sub: (s) => fmtMoney(price(s, 120)),
  run: (s) => {
    const cost = price(s, 120);
    if (!pay(s, cost)) return cantAfford(cost);
    const n = bump(s, 'salon');
    add(s, { looks: n <= 2 ? randInt(0, 2) : 0, happy: randInt(1, 3) });
    return pick(['You got a fresh haircut.', 'You had a relaxing massage.', 'You got your nails done.', 'You tried a bold new hair color.', 'You had a facial. You glow.']);
  },
});
defAction({
  id: 'diet', cat: 'health', label: 'Go on a diet', emoji: '🥗', desc: 'Eat better (or worse).',
  when: (s) => free(s) && A(s) >= 14,
  run: (s) => {
    popup(s, {
      emoji: '🥗', title: 'Diets', handler: 'diet',
      choices: [{ label: '🥦 Eat clean', value: 'clean' }, { label: '🥩 Low-carb', value: 'keto' }, { label: '🌱 Plant-based', value: 'vegan' }, { label: '⏱️ Intermittent fasting', value: 'fast' }, { label: '🍔 Eat whatever I want', value: 'junk' }, { label: 'Never mind', value: null }],
    });
  },
});
onChoice('diet', (s, ctx, v) => {
  if (!v) return;
  if (bump(s, 'diet') > 1) return { text: "You've already changed your diet this year.", nolog: true };
  if (v === 'junk') { M(s).diet = 'junk'; add(s, { happy: 4, health: -3, looks: -1 }); return 'You ate an entire pizza for breakfast. Glorious.'; }
  const ok = chance(trait(s, 'lazy') ? 0.45 : 0.7);
  if (!ok) { M(s).diet = 'normal'; add(s, { happy: -2 }); return 'You lasted about four days before caving.'; }
  M(s).diet = v;
  bodyNudge(s, { fat: -randInt(1, 3) });
  add(s, { health: randInt(2, 5), looks: randInt(0, 3), happy: v === 'fast' ? -2 : 0 });
  return 'You stuck to your diet. You feel lighter and brighter.';
});
