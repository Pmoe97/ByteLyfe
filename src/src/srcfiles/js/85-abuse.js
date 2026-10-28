/* =====================================================================
 * 85-abuse.js — toxic and abusive relationships, handled seriously.
 * Behind the Mature and Dark themes switches (off by default), adults
 * only. Told from both sides, because both sides are real: the person it
 * is happening to, and the person doing it, who can stop.
 *
 * Rules, as in 72-violence.js and 74-dark.js: nothing graphic, nothing
 * sexual, nobody under 18, no how-to. Violence is implied (a raised
 * voice, a closed door, a long night in a hospital) and never described
 * in detail. There is ALWAYS a way out, and every stage offers it. What
 * happens to a victim is never their fault, and never played for anything
 * but its weight. Nobody dies in this system.
 *
 * M(s).abuse = null | { pid, role: 'victim' | 'abuser', level, control, since, cycle, told, plan, order,
 *                       helped, change, quiet }
 *   level    0-100, how bad it is: 0 tension, 20 controlling, 45 frightening, 70 dangerous
 *   control  0-100, how much of your life it has taken over (friends, money, where you go)
 *   cycle    calm | tension | blowup | sorry, the shape these things take
 *   told     somebody you trust knows; plan: you have a safety plan; order: a protective order is in force
 *   change   the abuser's side, 0-100: how far you have come. 70 is a person who has changed
 * M(s).scar = 0-100   what it leaves after the relationship ends; costs happiness, fades, and talking helps
 * ===================================================================== */

const AB_TAGS = ['mature', 'mature_themes'];
function abOn(s) { return tagsOn(AB_TAGS) && A(s) >= 18; }
function abOf(s) { return M(s).abuse || null; }
CRIMES.domestic = { name: 'Domestic assault', emoji: '🚔', minAge: 18, sentence: [0, 5], conviction: 0.75, karma: -20, felony: true, verb: 'domestic assault' }; // not a Crime-menu crime
INV_PROFILE.domestic = [10, 55, 12, 'violent'];
const AB_WORDS = [[0, 'Tension'], [20, 'Controlling'], [45, 'Frightening'], [70, 'Dangerous']];
function abWord(v) { let w = AB_WORDS[0][1]; for (const [min, word] of AB_WORDS) if (v >= min) w = word; return w; }
const AB_PARTNER = ['partner', 'spouse', 'fiance'];
defSecretKind('abuse', {
  sev: 3, icon: '🕯️',
  victim: (s) => !!abOf(s) && abOf(s).role === 'victim', // a victim's secret getting out is not a scandal
  mine: (s) => (abOf(s) && abOf(s).role === 'abuser' ? 'what you do at home' : 'what happens at home'),
  rumor: (s, sec) => `things are not good at ${webName(s, sec.subj)}'s house`,
  expose: (s) => {
    const a = abOf(s);
    if (!a) return '';
    a.told = true;
    if (a.role === 'victim') { a.level = clamp100(a.level + 6); return ' People know now, and most of them are on your side. The person it is about knows people know.'; }
    return ' People know now, and some of them are not going to forgive it.';
  },
});
function abPartner(s) { const a = abOf(s); return a && s.people[a.pid] && s.people[a.pid].alive ? s.people[a.pid] : null; }
function abSecret(s) { return webLive(s, (x) => x.kind === 'abuse' && x.subj === s.playerId)[0]; }
function abStart(s, pid, role, level) {
  M(s).abuse = { pid, role, level: level || 8, control: role === 'victim' ? 5 : 0, since: s.year, cycle: 'tension', told: false, plan: false, order: false, helped: 0, change: 0 };
  if (!abSecret(s)) webNewSecret(s, 'abuse', s.playerId, { other: pid, ev: 12, sev: 3 });
  tally(s, role === 'victim' ? 'abuseSurvived' : 'abuseDone');
  return M(s).abuse;
}
function abEnd(s, how) {
  const a = abOf(s);
  if (!a) return;
  const sec = abSecret(s);
  if (sec) delete webOf(s).secrets[sec.id];
  M(s).abuse = null;
  M(s).abuseQuiet = s.year;
  if (a.role === 'victim') M(s).scar = clamp100((M(s).scar || 0) + 15 + Math.round(a.level / 3));
  const d = schemeOf(s); // the record of what ended (82-schemes.js)
  d.done.push({ kind: 'abuse', year: s.year, how, amt: 0 });
  if (d.done.length > 12) d.done.shift();
}

/* ---- how it starts -------------------------------------------------------------------------------------- */
function abPartnerOdds(s, p) {
  let o = 0.012;
  if (hasTrait(p, 'hotheaded')) o += 0.015;
  if (hasTrait(p, 'cunning')) o += 0.008;
  const r = relOf(s, p.id);
  if (r && r.rel >= 40) o += 0.005; // it starts when things are good
  return o;
}
function abYear(s) {
  if (!abOn(s) || s.dead) return;
  // The scar from a past relationship.
  const sc = M(s).scar || 0;
  if (sc > 0) { add(s, { happy: -Math.round(sc / 22) }); M(s).scar = Math.max(0, sc - 3); }
  const a = abOf(s);
  if (!a) {
    if (!free(s) || s.year - (M(s).abuseQuiet || -99) < 4) return;
    const id = romanticId(s), p = id && s.people[id];
    if (!p || !p.alive || !AB_PARTNER.includes(relKind(s, id)) || ageOf(s, p) < 18) return;
    if (chance(abPartnerOdds(s, p)) && !s.pending.some((x) => x.handler === 'abBegin')) abBegin(s, p);
    return;
  }
  const p = abPartner(s);
  if (!p || !AB_PARTNER.includes(relKind(s, a.pid) || '')) { abEnd(s, 'it ended'); return; } // the relationship ended some other way
  if (!free(s)) { return; } // prison: a pause
  if (s.pending.some((x) => /^ab[A-Z]/.test(x.handler || ''))) return;
  if (a.role === 'victim') abVictimYear(s, a, p); else abAbuserYear(s, a, p);
}

/* ---- the person it is happening to --------------------------------------------------------------------- */
function abBegin(s, p) {
  popup(s, {
    emoji: '🕯️', title: 'It starts small', person: p.id, handler: 'abBegin', ctx: { pid: p.id },
    text: `${p.first} wants to know where you were. Not in a worried way: in a way that is a test. It is the third time this month. You told yourself it was because ${pr(p).he} cares. Part of that is true.`,
    choices: [
      { label: 'Talk about it, calmly', value: 'talk', sub: 'Say it out loud, early' },
      { label: 'Tell a friend what is happening', value: 'friend' },
      { label: 'Let it go this once', value: 'ignore' },
    ],
  });
}
onChoice('abBegin', (s, ctx, v) => {
  const p = s.people[ctx.pid];
  if (!p || !p.alive || !abOn(s)) return;
  if (v === 'talk' && chance(clamp(0.5 - (hasTrait(p, 'hotheaded') ? 0.15 : 0) + (relOf(s, p.id) ? relOf(s, p.id).rel / 400 : 0), 0.2, 0.75))) {
    addRel(s, p.id, 4);
    return { text: `${p.first} was quiet, then embarrassed, then said ${pr(p).he} did not realize how it sounded. It was a good conversation. It is worth paying attention to whether it lasts.`, tone: 'good' };
  }
  const a = abStart(s, p.id, 'victim', v === 'talk' ? 14 : v === 'friend' ? 10 : 12);
  if (v === 'friend') { a.told = true; const f = pickRel(s, ['friend', 'bestie', 'sibling', 'parent']); if (f) { addRel(s, f, 3); const sec = abSecret(s); if (sec && !sec.knows.includes(f)) sec.knows.push(f); } return 'You told someone who loves you. They did not say you were overreacting. They said: "I am glad you told me."'; }
  return { text: v === 'talk' ? `${p.first} said you were being dramatic. That is not nothing, and you noticed.` : 'You let it go. It is not a mistake you are supposed to know yet.', tone: '' };
});
function abVictimYear(s, a, p) {
  // What staying costs.
  add(s, { happy: -Math.round(1 + a.level / 12), health: a.level >= 45 ? -1 : 0 });
  if (a.control >= 25) for (const f of relPeople(s, ['friend', 'bestie', 'coworker'])) if (chance(0.3)) addRel(s, f.id, -3);
  if (a.control >= 45 && chance(0.4)) { const take = Math.min(Math.max(0, M(s).money), price(s, 800)); M(s).money -= take; }
  // The shape of it: it gets worse unless something changes, and it gets better for a while after every apology.
  a.cycle = a.cycle === 'blowup' ? 'sorry' : a.cycle === 'sorry' ? 'calm' : a.cycle === 'calm' ? 'tension' : 'blowup';
  if (a.cycle === 'sorry') a.level = Math.max(0, a.level - 6);
  else a.level = clamp100(a.level + 6 + Math.round(a.control / 15) - (a.told ? 3 : 0) - (a.order ? 8 : 0));
  a.control = clamp100(a.control + (a.told ? 3 : 8) - (a.order ? 8 : 0));
  const sec = abSecret(s);
  if (sec) sec.ev = clamp100(sec.ev + 5);
  if (a.level >= 60 && chance(0.4)) { abNight(s, a, p); return; }
  abStage(s, a, p);
}
function abStage(s, a, p) {
  const word = abWord(a.level), plan = a.plan, cost = price(s, 150);
  const haveTrust = relPeople(s, ['friend', 'bestie', 'sibling', 'parent']).length > 0;
  const text = {
    Tension: `${p.first} has a way of making every small thing your fault. You find yourself explaining before you are asked.`,
    Controlling: `${p.first} knows where you are, who you talk to and what you spent. You have not seen some of your friends in months, and you have stopped saying why.`,
    Frightening: `You are careful now, in your own house. You have learned the sounds, and the weather of ${pr(p).his} moods. People who love you are asking, and you have started lying to them.`,
    Dangerous: `You do not feel safe. You know it, and part of you has known it for a while. Everything you do now is arranged around ${p.first}.`,
  }[word];
  popup(s, {
    emoji: '🕯️', title: word, person: p.id, handler: 'abStage', ctx: { cost },
    text: `${text} It is not your fault. There is always a way out, and every one of them starts with somebody knowing.`,
    choices: [
      { label: 'Tell someone you trust', value: 'tell', sub: haveTrust ? 'A friend, a sibling, a parent' : 'You have no one close right now', disabled: !haveTrust },
      { label: 'Call a helpline or see a counselor', value: 'help', sub: `${fmtMoney(cost)} · a safety plan, in private`, disabled: M(s).money < cost },
      { label: 'Document it, and report it', value: 'report', sub: `${Math.round(abReportOdds(s, a) * 100)}%` },
      { label: 'Say it has to change', value: 'boundary', sub: `${Math.round(abBoundaryOdds(s, a, p) * 100)}% · it may make things worse` },
      { label: plan ? 'Leave, with your plan' : 'Leave', value: 'leave', sub: plan ? 'The safest it can be' : a.level >= 55 ? 'The most dangerous time is leaving. A plan helps.' : 'Take what you need and go' },
      { label: 'Stay, for now', value: 'stay' },
    ],
  });
}
function abReportOdds(s, a) { return clamp(0.4 + (a.told ? 0.15 : 0) + (a.helped ? 0.1 : 0) + (webRep(P(s)).name - 50) / 300, 0.15, 0.85); }
function abBoundaryOdds(s, a, p) { return clamp(0.55 - a.level / 160 + (a.told ? 0.08 : 0) + skill(s, 'charisma') / 600 - (hasTrait(p, 'hotheaded') ? 0.12 : 0), 0.08, 0.7); }
onChoice('abStage', (s, ctx, v) => {
  const a = abOf(s), p = abPartner(s);
  if (!a || !p || a.role !== 'victim') return { text: 'It had already changed.', quiet: true, nolog: true };
  if (v === 'tell') {
    const f = pickRel(s, ['friend', 'bestie', 'sibling', 'parent']);
    if (!f) return 'There was no one to tell.';
    a.told = true;
    a.control = Math.max(0, a.control - 12);
    a.level = Math.max(0, a.level - 6);
    addRel(s, f, 6);
    const sec = abSecret(s);
    if (sec && !sec.knows.includes(f)) sec.knows.push(f);
    return { text: `You told ${nm(s, f)}, all of it, in the wrong order. ${cap(pr(s.people[f]).he)} did not interrupt. "${pick(['You are not crazy.', 'None of this is yours.', 'Stay here tonight.'])}" Somebody walks you to your car, now.`, tone: 'good' };
  }
  if (v === 'help') {
    if (!pay(s, ctx.cost)) return cantAfford(ctx.cost);
    a.plan = true; a.helped++;
    a.level = Math.max(0, a.level - 4);
    add(s, { happy: 2 });
    return { text: 'A voice on a line, then an appointment, and then a folder you hide in a place nobody looks: documents, a bag, a number to call. It is a plan. It is also, you realize, the first thing in a long time that was only yours.', tone: 'good' };
  }
  if (v === 'report') {
    if (chance(abReportOdds(s, a))) {
      a.order = true; a.level = Math.max(0, a.level - 25); a.control = Math.max(0, a.control - 20);
      add(s, { happy: 2 });
      if (chance(0.3 + a.level / 300)) {
        const r = abCharge(s, p, a);
        return { text: `They took you seriously. A judge signed an order, and ${p.first} was arrested that night. ${r}`, tone: 'good' };
      }
      return { text: `They wrote everything down, and a judge signed a protective order. ${p.first} has been told, in writing, what happens if it is broken. It is a piece of paper. It is also a lot.`, tone: 'good' };
    }
    a.level = clamp100(a.level + 5);
    return { text: 'They took a statement and said there was not enough yet. Keep everything, they said. Write down dates. It is a long wait for a system to catch up with something you already know.', tone: '' };
  }
  if (v === 'boundary') {
    if (chance(abBoundaryOdds(s, a, p))) { a.level = Math.max(0, a.level - 18); a.control = Math.max(0, a.control - 12); addRel(s, p.id, -2); return { text: `${p.first} went still. Then, to your surprise, ${pr(p).he} said ${pr(p).he} knew. It may last. Watch what it does, not what it says.`, tone: 'good' }; }
    a.level = clamp100(a.level + 14); a.cycle = 'blowup';
    add(s, { health: -randInt(0, 4), happy: -3 });
    return { text: `${p.first} did not take it well. It was a bad week. You do not have to prove anything to anyone: that conversation told you what you needed to know.`, tone: 'bad' };
  }
  if (v === 'leave') return abLeave(s, a, p);
  a.control = clamp100(a.control + 4);
  return 'You stayed. It is a decision you are allowed to make, and a decision you are allowed to make again.';
});
// A night when it is not a feeling any more.
function abNight(s, a, p) {
  popup(s, {
    emoji: '🏥', title: 'A night you will remember', person: p.id, handler: 'abNight', ctx: {},
    text: `You are sitting on the edge of a bed, or a curb, or a bathtub, and you know you need to go somewhere. ${p.first} is apologizing. It is the kind of apology that has an end date. You are not safe here tonight.`,
    choices: [
      { label: 'Go to a hospital, and tell the truth', value: 'hospital', sub: 'They will believe you' },
      { label: 'Go to a friend or family member', value: 'friend' },
      { label: 'Call the police', value: 'police' },
      { label: 'Say it was an accident', value: 'accident', tone: 'bad', sub: 'It will be worse next time' },
    ],
  });
}
onChoice('abNight', (s, ctx, v) => {
  const a = abOf(s), p = abPartner(s);
  if (!a || !p) return;
  add(s, { health: -randInt(6, 16), happy: -5 });
  if (v === 'hospital') {
    a.told = true; a.plan = true; a.helped++; a.level = Math.max(0, a.level - 12);
    const sec = abSecret(s); if (sec) sec.ev = clamp100(sec.ev + 10);
    return { text: 'A nurse looked at you for a long time, and asked a few quiet questions, and sat with you while you answered. They gave you a folder and a number and a room to wait in. You are not the first they have seen. That is not a comfort, but it is a fact, and it helps.', tone: 'good' };
  }
  if (v === 'friend') { const f = pickRel(s, ['friend', 'bestie', 'sibling', 'parent']); a.told = true; a.level = Math.max(0, a.level - 8); if (f) { addRel(s, f, 10); const sec = abSecret(s); if (sec && !sec.knows.includes(f)) sec.knows.push(f); } return { text: `${f ? nm(s, f) : 'A friend'} opened the door before you knocked twice, and did not ask a single question that night. You slept in a room that was not yours, and for the first time in a long time you slept.`, tone: 'good' }; }
  if (v === 'police') {
    a.order = true; a.level = Math.max(0, a.level - 20);
    const r = abCharge(s, p, a);
    return { text: `They came fast, this time. ${p.first} was arrested, and an order was issued by morning. ${r}`, tone: 'good' };
  }
  a.level = clamp100(a.level + 10);
  return { text: 'You said it was an accident, and they believed you, because you said it well. You have been saying it well for a while. It is not a sign of anything except that you are tired.', tone: 'bad' };
});
// The partner is charged. What follows is the relationship ending, and whatever comes after.
function abCharge(s, p, a) {
  const note = ['', ' The charge is on their record now.', ' They will not be allowed near the house.'][randInt(0, 2)];
  endRomance(s, p.id, 'ex');
  if (relOf(s, p.id)) setRel(s, p.id, 'enemy', 0);
  abEnd(s, 'reported');
  if (chance(0.3)) { const d = darkOf(s); if (!d.stalk && darkOn()) d.stalk = { by: p.id, kind: 'ex', since: s.year, level: 18, order: true, told: true, scared: false }; }
  return note.trim();
}
function abLeave(s, a, p) {
  const plan = a.plan, level = a.level;
  const danger = clamp((level - 40) / 120 - (plan ? 0.25 : 0) - (a.told ? 0.08 : 0) - (a.order ? 0.12 : 0), 0.02, 0.5);
  endRomance(s, p.id, 'ex');
  abEnd(s, plan ? 'left, with a plan' : 'left');
  add(s, { happy: 3, karma: 2 });
  if (chance(danger)) {
    add(s, { health: -randInt(4, 12), happy: -4 });
    const d = darkOf(s);
    if (darkOn() && !d.stalk) d.stalk = { by: p.id, kind: 'ex', since: s.year, level: 30, order: false, told: false, scared: false };
    return { text: `You got out. ${p.first} did not take it well, and it was a hard few weeks: the calls, the car outside, the people ${pr(p).he} sent to talk to you. You are safe, and you are not entirely done with it. Keep everything, and keep your phone on.`, tone: 'bad' };
  }
  return { text: plan ? `You left on a quiet Tuesday with a bag you had packed in advance, and went to a place only two people knew about. ${p.first} did not find you. It is a long road from here, and it is yours.` : `You took what you could carry and went. It is the bravest thing you have done, and you do not feel brave. That is normal.`, tone: 'good' };
}
defAction({
  id: 'ab_reach_out', cat: 'love', label: 'Reach out for help', emoji: '🕯️', desc: 'A helpline, a counselor, a friend. Whatever is happening at home, it does not have to be yours alone.', tags: AB_TAGS,
  when: (s) => abOn(s) && !!abOf(s) && abOf(s).role === 'victim' && !abOf(s).plan,
  run: (s) => {
    const a = abOf(s), cost = price(s, 150);
    if (!pay(s, cost)) return cantAfford(cost);
    a.plan = true; a.helped++; a.level = Math.max(0, a.level - 5);
    add(s, { happy: 2 });
    return { text: 'You made the call from a parked car. A person answered, and said she was glad you did. By the end of it, you had a plan, a folder and a number. It was the first step, and you are allowed to take as long as you need over the rest.', tone: 'good' };
  },
});
defAction({
  id: 'ab_heal', cat: 'health', label: 'Talk to someone who understands', emoji: '🛋️', desc: 'What a bad relationship leaves behind gets smaller when you say it out loud.', tags: AB_TAGS,
  when: (s) => abOn(s) && free(s) && (M(s).scar || 0) >= 10,
  sub: (s) => fmtMoney(price(s, 150)),
  run: (s) => {
    const cost = price(s, 150);
    if (bump(s, 'abheal') > 2) return { text: 'You have done enough for one year. Let it settle.', nolog: true };
    if (!pay(s, cost)) return cantAfford(cost);
    M(s).scar = Math.max(0, (M(s).scar || 0) - 18);
    add(s, { happy: 3 });
    return 'She did not tell you what to feel. She asked what it was like, and then she waited. It does not go away, but it is getting a little smaller.';
  },
});

/* ---- the person who is doing it -------------------------------------------------------------------------- */
function abAbuserYear(s, a, p) {
  add(s, { happy: -1, karma: -2 });
  if (relOf(s, p.id)) addRel(s, p.id, a.change >= 40 ? 1 : -6);
  a.level = clamp100(a.level + (a.change >= 40 ? -4 : 5) + Math.round(a.control / 25));
  a.cycle = a.cycle === 'blowup' ? 'sorry' : a.cycle === 'sorry' ? 'calm' : a.cycle === 'calm' ? 'tension' : 'blowup';
  const sec = abSecret(s); if (sec) sec.ev = clamp100(sec.ev + 6);
  // The people around you see it.
  if (a.level >= 40 && chance(0.3)) { const f = pickRel(s, ['friend', 'bestie', 'sibling', 'parent']); if (f) addRel(s, f, -5); }
  // It reaches a point: they leave, and report.
  if (a.level >= 70 && a.change < 40 && chance(0.4)) { abPartnerLeaves(s, a, p); return; }
  if (a.change >= 70) { abChanged(s, a, p); return; }
  abSelfPopup(s, a, p);
}
function abSelfPopup(s, a, p) {
  const cost = price(s, 400);
  popup(s, {
    emoji: '💭', title: 'What you are doing', person: p.id, handler: 'abSelf', ctx: { cost },
    text: `${p.first} flinches when you walk in, now. You watched ${pr(p).him} do it today, and something went cold in you. You are not the person you thought you were being. ${a.change >= 40 ? 'You have been working on it. It is working, slowly.' : 'Nobody has said it to you yet. You know what it is.'}`,
    choices: [
      { label: 'Get real help: counseling, a program', value: 'help', sub: `${fmtMoney(cost)} · it takes years, and it works if you do`, disabled: M(s).money < cost },
      { label: 'Let them go, and stay away', value: 'release', sub: 'The only thing that protects them for sure' },
      { label: 'Apologize, and promise', value: 'promise', sub: 'It has worked before' },
      { label: 'Blame them', value: 'blame', tone: 'bad' },
    ],
  });
}
onChoice('abSelf', (s, ctx, v) => {
  const a = abOf(s), p = abPartner(s);
  if (!a || !p || a.role !== 'abuser') return { text: 'It had already changed.', quiet: true, nolog: true };
  if (v === 'help') {
    if (!pay(s, ctx.cost)) return cantAfford(ctx.cost);
    a.change = clamp100(a.change + 22); a.level = Math.max(0, a.level - 15); a.control = Math.max(0, a.control - 15); a.helped++;
    add(s, { karma: 4, happy: 1 });
    if (relOf(s, p.id)) addRel(s, p.id, 4);
    return { text: 'A room with folding chairs, and a group of men or women who had said the same sentence you were about to say. The hardest part was the first ten minutes. It gets easier to be honest, and harder to be proud of anything you did.', tone: 'good' };
  }
  if (v === 'release') {
    endRomance(s, p.id, 'ex');
    abEnd(s, 'let them go');
    add(s, { karma: 8, happy: -3 });
    return { text: `You told ${p.first} it was over, and that it was you, and that ${pr(p).he} should not have to wait for you to be better. You did not argue. It is the first honest thing you have done in a long time.`, tone: 'good' };
  }
  if (v === 'promise') { a.level = Math.max(0, a.level - 4); a.change = clamp100(a.change + 2); return { text: `${p.first} wanted to believe you, and did. It is not a plan. It is a promise, which is how it started.`, tone: '' }; }
  a.level = clamp100(a.level + 15); a.control = clamp100(a.control + 10);
  if (relOf(s, p.id)) addRel(s, p.id, -15);
  add(s, { karma: -4 });
  return { text: 'You said it was their fault, and for an afternoon it felt true. It was the worst thing you could have chosen, and you will know it by morning.', tone: 'bad' };
});
function abPartnerLeaves(s, a, p) {
  endRomance(s, p.id, 'ex');
  if (relOf(s, p.id)) setRel(s, p.id, 'enemy', 0);
  webFact(s, 'victim', { pid: p.id, harm: 'fear', by: s.playerId });
  abEnd(s, 'reported');
  webRepAdd(P(s), { scandal: 14, name: -10 });
  const rec = invOpen(s, 'domestic', { messy: true, ev: { wit: 30 } });
  rec.prog = 55;
  add(s, { happy: -6, karma: -6 });
  log(s, `🚔 ${p.first} left, and reported it. There is a protective order with your name on it, and a detective who has read everything. Everyone who loved you knows what it says.`, 'bad');
}
function abChanged(s, a, p) {
  const stays = relOf(s, p.id) && relOf(s, p.id).rel >= 50;
  const keep = AB_PARTNER.includes(relKind(s, p.id) || '') && stays;
  abEnd(s, 'changed');
  add(s, { karma: 10, happy: 4 });
  log(s, keep ? `🕊️ It has been years of work. ${p.first} says ${pr(p).he} feels safe, and means it. You do not take that for granted.` : `🕊️ You have done the work, for years. ${p.first} does not owe you a second chance, and ${pr(p).he} is not giving one. You are not the same person, and you have to live with the one you were.`, 'good');
}
EV('ab_you_lose_it', {
  ages: [20, 80], emoji: '💭', title: 'The way you spoke', tags: AB_TAGS, cooldown: 6, w: (s) => 0.6 + (trait(s, 'hotheaded') ? 1.2 : 0),
  when: (s) => free(s) && !abOf(s) && s.year - (M(s).abuseQuiet || -99) >= 4 && !!romanticId(s) && AB_PARTNER.includes(relKind(s, romanticId(s))) && (trait(s, 'hotheaded') || trait(s, 'addictive') || P(s).stats.happy < 35),
  ctx: (s) => ({ pid: romanticId(s) }),
  text: (s, c) => `It was a small thing, and you said something to ${nm(s, c.pid)} that you would not say to a stranger. You watched ${pr(s.people[c.pid]).him} take it, without a word, the way ${pr(s.people[c.pid]).he} has been taking things. You heard yourself.`,
  choices: [
    ['Stop. Say it plainly, and say sorry', (s, c) => { addRel(s, c.pid, 3); add(s, { karma: 3 }); return { text: 'You said what you had done, without the "but." It was a short sentence and a long silence. It matters that you heard it. It matters more what you do next time.', tone: 'good' }; }],
    ['Get help, before it becomes a pattern', (s) => { const cost = price(s, 150); if (!pay(s, cost)) return cantAfford(cost); add(s, { karma: 4, happy: 1 }); return { text: 'You booked something with a name like "anger management," and you went, and you stayed through the first session. It is not a cure. It is the right door.', tone: 'good' }; }],
    ['It was their fault', (s, c) => { abStart(s, c.pid, 'abuser', 12); addRel(s, c.pid, -8); add(s, { karma: -3 }); return { text: 'You said it was their fault, and it felt true for the length of one conversation. It was the beginning of something that you will have to answer for.', tone: 'bad' }; }],
  ],
});
EV('ab_toxic_friend', {
  ages: [16, 80], emoji: '🌧️', title: 'A friend who drains you', tags: AB_TAGS, cooldown: 5,
  when: (s) => free(s) && !!pickRel(s, ['friend', 'bestie']),
  ctx: (s) => ({ pid: pickRel(s, ['friend', 'bestie']) }),
  text: (s, c) => `Every time you see ${nm(s, c.pid)}, you leave feeling smaller. Jokes that land on you, favors that go one way, plans that change at the last minute and are somehow your fault. You have started dreading the phone.`,
  choices: [
    ['Set a boundary, kindly', (s, c) => { if (chance(0.5)) { addRel(s, c.pid, 4); add(s, { happy: 3, karma: 2 }); return { text: `${nm(s, c.pid)} was hurt, and then listened. It is a different friendship now, a better one.`, tone: 'good' }; } addRel(s, c.pid, -15); add(s, { happy: 1 }); return 'It did not land. They said you had changed. You had.'; }],
    ['Fade out', (s, c) => { addRel(s, c.pid, -25); add(s, { happy: 2 }); return 'You answered later, and then later still. It took six months, and it was easier than you feared.'; }],
    ['Keep trying', (s) => { add(s, { happy: -3 }); return 'You kept trying. You are not sure what you are keeping.'; }],
  ],
});
EV('ab_toxic_parent', {
  ages: [22, 70], emoji: '🧊', title: 'A parent who keeps score', tags: AB_TAGS, cooldown: 6,
  when: (s) => free(s) && !!pickRel(s, ['parent']),
  ctx: (s) => ({ pid: pickRel(s, ['parent']) }),
  text: (s, c) => `${nm(s, c.pid)} has a way of reminding you of every mistake you have made, in front of other people, with a smile. You noticed that you are an adult, and that you are still shrinking at the sound of the phone.`,
  choices: [
    ['Set limits, and hold them', (s, c) => { if (chance(0.45)) { addRel(s, c.pid, 3); add(s, { happy: 3 }); return { text: `${nm(s, c.pid)} grumbled, and then, to your surprise, respected it. The calls got shorter and warmer.`, tone: 'good' }; } addRel(s, c.pid, -15); add(s, { happy: 1 }); return 'You held the line. It cost you a few uncomfortable holidays, and you are still holding it.'; }],
    ['Go to therapy about it', (s) => { const cost = price(s, 150); if (!pay(s, cost)) return cantAfford(cost); add(s, { happy: 3 }); return 'She said it was not your fault that it affected you. It was the kind of thing you needed to hear from someone who did not need anything from you.'; }],
    ['Say nothing, as always', (s) => { add(s, { happy: -2 }); return 'You said nothing, as always. It sat in your chest all weekend.'; }],
  ],
});
onYear('abuse', abYear);
