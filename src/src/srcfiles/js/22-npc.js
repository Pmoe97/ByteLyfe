/* =====================================================================
 * 22-npc.js — the people around you live their own lives each year:
 * they age, drift, break up, propose, cheat, have kids, and die.
 * ===================================================================== */

// Turn a cause into a phrase that follows "died": "of old age", "in a car crash".
// Causes that already start with a preposition ("while...", "after...") are used as is.
function deathPhrase(cause) {
  if (/^(killed|murdered|while|after|during|in)\b/.test(cause)) return cause;
  if (/suspicious/.test(cause)) return 'under ' + cause;
  if (/(crash|accident|shootout|escape|fire|fall|drown|storm|tragic)/.test(cause)) return 'in ' + cause;
  return 'of ' + cause;
}
function npcCause(age) {
  if (age < 40) return pick(['a car accident', 'a sudden illness', 'an accident at work', 'a rare heart condition']);
  if (age < 70) return pick(['a heart attack', 'cancer', 'a stroke', 'a car accident', 'complications from surgery']);
  return pick(['old age', 'old age', 'heart failure', 'pneumonia', 'a stroke', 'natural causes']);
}

const REL_DECAY = { parent: 2, stepparent: 3, sibling: 3, halfsibling: 3, child: 2, grandparent: 3, grandchild: 3, partner: 5, fiance: 4, spouse: 4, lover: 6, friend: 6, bestie: 4, enemy: 0, classmate: 4, coworker: 4, boss: 3, ex: 3, exspouse: 2, cellmate: 4, inlaw: 3 };

function npcTick(s) {
  const m = M(s);
  for (const pid of Object.keys(m.rels)) {
    const r = m.rels[pid];
    const p = s.people[pid];
    if (!r) continue;
    if (!p) { delete m.rels[pid]; continue; }
    if (!p.alive) continue;
    const age = ageOf(s, p);

    p.stats.health = clamp100(p.stats.health + (healthTarget(age, 20, hasTrait(p, 'athletic')) - p.stats.health) * 0.2 + randInt(-4, 3));
    if (chance(mortality(age, p.stats.health) * (age < 18 ? 0.4 : 1))) { npcDies(s, p, npcCause(age)); continue; }

    if (r.kind === 'enemy') r.rel = clamp100(r.rel + randInt(0, 3));
    else r.rel = clamp100(r.rel - randInt(0, REL_DECAY[r.kind] ?? 4));

    // Their own life moves on.
    if (age === 18 || (age === 22 && p.job && p.job.student)) { p.job = null; assignNpcLife(s, p, { keepMoney: true }); }
    if (age >= 18 && p.job && p.job.id && chance(0.1)) p.job.level = Math.min(p.job.level + 1, JOBS[p.job.id].ladder.length - 1);
    if (age >= 67 && p.job && p.job.id && chance(0.3)) { p.retired = true; p.job = null; }
    if (p.job && p.job.id) p.money += Math.round(npcSalary(s, p) * randFloat(0.03, 0.12));
    if (p.body) npcBodyTick(s, p);

    switch (r.kind) {
      case 'friend':
        if (r.rel < 8 && chance(0.5)) { delete m.rels[pid]; log(s, `👋 You and ${p.first} drifted apart.`); }
        break;
      case 'bestie':
        if (r.rel < 40) { r.kind = 'friend'; log(s, `💔 You and ${p.first} aren't as close as you used to be.`); }
        break;
      case 'partner':
      case 'fiance':
        if (r.rel < 18 && chance(0.45)) {
          endRomance(s, pid, 'ex');
          add(s, { happy: -8 });
          announce(s, { emoji: '💔', title: 'Dumped', text: `${p.first} broke up with you${r.kind === 'fiance' ? ' and called off the engagement' : ''}.`, tone: 'bad', person: pid });
        } else if (r.kind === 'partner' && r.rel >= 75 && s.year - r.since >= 2 && age >= 18 && A(s) >= 18 && chance(0.18)) {
          popup(s, { emoji: '💍', title: 'A proposal!', text: `${p.first} got down on one knee and asked you to marry them!`, handler: 'theyPropose', ctx: { pid }, person: pid, choices: [{ label: 'Say yes!', value: true }, { label: 'Say no', value: false }] });
        } else if (r.rel < 35 && chance(0.06)) {
          popup(s, { emoji: '😱', title: 'Caught cheating', text: `You found out ${p.first} has been cheating on you.`, handler: 'cheated', ctx: { pid }, person: pid, tone: 'bad', choices: [{ label: 'Forgive them', value: 'forgive' }, { label: 'Break up', value: 'leave' }] });
        }
        break;
      case 'spouse':
        if (r.rel < 12 && chance(0.3)) {
          const res = divorce(s, pid, false);
          announce(s, { emoji: '📝', title: 'Divorce', text: `${p.first} filed for divorce. ${res.text}`, tone: 'bad', log: `📝 ${p.first} divorced you.` });
        } else if (r.rel < 30 && chance(0.05)) {
          popup(s, { emoji: '😱', title: 'Caught cheating', text: `You discovered your ${kinLabel('spouse', p).toLowerCase()} ${p.first} has been having an affair.`, handler: 'cheated', ctx: { pid }, person: pid, tone: 'bad', choices: [{ label: 'Forgive them', value: 'forgive' }, { label: 'File for divorce', value: 'leave' }] });
        }
        break;
      case 'lover': {
        const rom = romanticId(s);
        if (rom && rom !== pid && chance(0.22)) {
          addRel(s, rom, -40);
          const rp = s.people[rom];
          if (relKind(s, rom) === 'spouse' && relOf(s, rom).rel < 30) {
            divorce(s, rom, false);
            announce(s, { emoji: '💥', title: 'Busted', text: `${rp.first} found out about your affair with ${p.first} and divorced you.`, tone: 'bad' });
          } else if (relOf(s, rom).rel < 30) {
            endRomance(s, rom, 'ex');
            announce(s, { emoji: '💥', title: 'Busted', text: `${rp.first} found out about your affair with ${p.first} and dumped you.`, tone: 'bad' });
          } else {
            announce(s, { emoji: '💥', title: 'Busted', text: `${rp.first} found out about your affair with ${p.first}. Things are very tense at home.`, tone: 'bad' });
          }
        }
        break;
      }
      case 'child':
        if (age >= 22 && age <= 42 && chance(0.07) && p.children.length < 4) {
          const g = chance(0.5) ? 'm' : 'f';
          const gc = makePerson(s, { gender: g, age: 0, country: p.country, city: p.city, last: p.last, parents: [p.id] });
          p.children.push(gc.id);
          setRel(s, gc.id, 'grandchild', 60);
          tally(s, 'grandkids');
          announce(s, { emoji: '👶', title: 'Grandbaby!', text: `Your ${kinLabel('child', p).toLowerCase()} ${p.first} had a baby ${g === 'm' ? 'boy' : 'girl'} named ${gc.first}!`, tone: 'good', person: gc.id });
        }
        if (age >= 23 && !p.partner && chance(0.06)) {
          const sp = makePerson(s, { gender: chance(0.9) ? (p.gender === 'm' ? 'f' : 'm') : p.gender, age: clamp(age + randInt(-4, 4), 18, 99), country: p.country, city: p.city });
          assignNpcLife(s, sp);
          p.partner = sp.id;
          sp.partner = p.id;
          p.married = sp.married = true;
          setRel(s, sp.id, 'inlaw', randInt(35, 70));
          log(s, `💒 Your ${kinLabel('child', p).toLowerCase()} ${p.first} married ${sp.first}.`, 'good');
        }
        break;
      default:
        break;
    }
  }
  // Exes and old cellmates fade from your life eventually.
  for (const pid of Object.keys(m.rels)) {
    const r = m.rels[pid];
    if (['ex', 'classmate', 'coworker', 'cellmate'].includes(r.kind) && r.rel < 5 && chance(0.3)) delete m.rels[pid];
  }
}

onChoice('theyPropose', (s, ctx, yes) => {
  const p = s.people[ctx.pid];
  if (!p || !p.alive) return;
  if (yes) { setRel(s, ctx.pid, 'fiance'); addRel(s, ctx.pid, 10); add(s, { happy: 10 }); return { text: `You said yes! You and ${p.first} are engaged. 💍`, tone: 'good' }; }
  addRel(s, ctx.pid, -20);
  if (chance(0.4)) { endRomance(s, ctx.pid, 'ex'); return { text: `You turned ${p.first} down. They broke up with you.`, tone: 'bad' }; }
  return `You turned ${p.first} down. It's been awkward since.`;
});
onChoice('cheated', (s, ctx, v) => {
  const p = s.people[ctx.pid];
  if (!p || !p.alive || !relOf(s, ctx.pid)) return;
  if (v === 'forgive') { addRel(s, ctx.pid, 5); add(s, { happy: -6, karma: 2 }); return `You forgave ${p.first}. Trust will take time.`; }
  add(s, { happy: -8 });
  if (relKind(s, ctx.pid) === 'spouse') return divorce(s, ctx.pid, true);
  endRomance(s, ctx.pid, 'ex');
  return `You ended things with ${p.first}.`;
});

function npcDies(s, p, cause, opts) {
  if (!p.alive) return;
  p.alive = false;
  p.deathYear = s.year;
  p.cause = cause;
  const age = ageOf(s, p);
  const partner = p.partner ? s.people[p.partner] : null;
  if (partner && partner.partner === p.id && partner.id !== s.playerId) { partner.partner = null; partner.married = false; }
  const r = relOf(s, p.id);
  if (!r) return;
  const kind = r.kind;
  if (['spouse', 'partner', 'fiance'].includes(kind)) {
    P(s).partner = null;
    P(s).married = false;
    if (kind === 'spouse') tally(s, 'widowed');
  }
  if (opts && opts.murdered) { log(s, `🕊️ ${p.first} died ${deathPhrase(cause)}.`, 'bad'); return; }
  const close = isFamilyKind(kind) || ['bestie', 'partner', 'lover'].includes(kind) || (kind === 'friend' && r.rel >= 50);
  add(s, { happy: close ? -randInt(8, 16) : -randInt(0, 3) });

  // Inheritance from family.
  let share = 0;
  if (kind === 'parent' || kind === 'stepparent') {
    const heirs = p.children.filter((id) => s.people[id] && s.people[id].alive && !flag(s, 'disowned_' + id));
    const widow = partner && partner.alive && p.married;
    const pot = Math.max(0, widow ? p.money * 0.5 : p.money);
    share = heirs.length ? pot / heirs.length : 0;
  } else if (kind === 'grandparent' && chance(0.5)) {
    share = Math.max(0, p.money) * randFloat(0.05, 0.2);
  } else if (kind === 'spouse') {
    share = Math.max(0, p.money);
  }
  const label = kinLabel(kind, p).toLowerCase();
  if (share >= 1) { p.money -= Math.round(share); inherit(s, share, `your ${label} ${p.first}`); }

  if (close) {
    popup(s, {
      emoji: '🕊️', title: 'Rest in peace', tone: 'bad', person: p.id,
      text: `Your ${label} ${p.first} died ${deathPhrase(cause)} at age ${age}.`,
      handler: 'funeral', ctx: { pid: p.id },
      choices: [{ label: 'Attend the funeral', value: 'attend' }, { label: 'Skip the funeral', value: 'skip' }],
    });
    log(s, `🕊️ Your ${label} ${p.first} died ${deathPhrase(cause)} at age ${age}.`, 'bad');
  } else {
    log(s, `🕊️ Your ${label} ${p.first} died ${deathPhrase(cause)}.`);
  }
}
onChoice('funeral', (s, ctx, v) => {
  const p = s.people[ctx.pid];
  if (!p) return;
  if (v === 'attend') {
    add(s, { happy: 2, karma: 1 });
    for (const q of relPeople(s, FAMILY_KINDS)) if (chance(0.5)) addRel(s, q.id, 2);
    return pick([`You gave a moving eulogy for ${p.first}.`, `You said goodbye to ${p.first}. Everyone shared stories and laughed through tears.`, `The funeral was beautiful. ${p.first} would have loved it.`]);
  }
  add(s, { karma: -2 });
  for (const q of relPeople(s, FAMILY_KINDS)) if (chance(0.3)) addRel(s, q.id, -4);
  return `You skipped ${p.first}'s funeral. Some relatives noticed.`;
});
