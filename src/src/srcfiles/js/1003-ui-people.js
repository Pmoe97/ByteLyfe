/* =====================================================================
 * 1003-ui-people.js — Relationships list, a person's sheet, pets, and
 * your own profile (including the body card for adults).
 * ===================================================================== */

function relMeter(v) { return `<div class="meter">${icon('health', 14)}${bar(v)}<b>${Math.round(v)}%</b></div>`; }
function personRow(p) {
  const r = relOf(G, p.id);
  const age = ageOf(G, p);
  const sub = `${kinLabel(r.kind, p)} · ${p.alive ? 'age ' + age : 'died ' + (p.deathYear || '')}${p.alive && npcJobTitle(p) ? ' · ' + npcJobTitle(p) : ''}`;
  return itemRow({
    a: 'sheet', ds: { k: 'person', arg: p.id }, round: true,
    ico: avatarOf(p, 52) + (p.alive ? '' : `<span class="badge">${icon('dove', 18)}</span>`),
    t: esc(fullName(p)), s: esc(sub), chev: true,
    extra: p.alive ? relMeter(r.rel) : '',
  });
}
function petRow(pet) {
  return itemRow({ a: 'sheet', ds: { k: 'pet', arg: pet.id }, ico: icon('paw', 32), cls: '', t: esc(pet.name), s: `${esc(pet.breed)} · age ${petAge(G, pet)}`, chev: true, extra: relMeter(pet.rel) });
}
SHEETS.people = () => {
  let html = '';
  const all = relPeople(G, null);
  for (const g of REL_GROUPS) {
    const list = all.filter((p) => g.kinds.includes(relOf(G, p.id).kind)).sort((a, b) => g.kinds.indexOf(relOf(G, a.id).kind) - g.kinds.indexOf(relOf(G, b.id).kind) || a.birthYear - b.birthYear);
    if (!list.length) continue;
    html += `<div class="section-title">${g.name} (${list.length})</div><div class="list">${list.map(personRow).join('')}</div>`;
  }
  const pets = myPets(G);
  if (pets.length) html += `<div class="section-title">Pets</div><div class="list">${pets.map(petRow).join('')}</div>`;
  const gone = relPeople(G, null, { dead: true }).filter((p) => !p.alive);
  if (gone.length) html += `<div class="section-title">In memory</div><div class="list">${gone.map(personRow).join('')}</div>`;
  if (!html) html = '<div class="empty">No one in your life yet.</div>';
  return { title: 'People', html };
};

// Adults only: the standing figure next to plain-language facts about the body.
function bodyCard(p, mine) {
  const age = personAge(p);
  if (!p.alive || age < ADULT_AGE) return '';
  const b = ensureBody(G, p);
  if (!b) return '';
  const fig = personFigure(p, 260);
  const diet = mine ? DIETS[M(G).diet] || DIETS.normal : null;
  return `<div class="card body-card">
    <div class="body-stage">${fig}</div>
    <div class="body-facts">
      ${kvRow('Height', heightText(b.height))}
      ${kvRow('Build', bodyWord('fat', b.fat))}
      ${kvRow('Muscle', bodyWord('muscle', b.muscle))}
      ${kvRow('Chest', bodyWord('chest', b.chest))}
      ${kvRow('Hips', bodyWord('hips', b.hips))}
      ${kvRow('Glutes', bodyWord('glutes', b.glutes))}
      ${diet ? kvRow('Diet', esc(diet.name)) : ''}
    </div>
  </div>`;
}

SHEETS.person = (pid) => {
  const p = G.people[pid];
  const r = relOf(G, pid);
  if (!p || !r) return null;
  const age = ageOf(G, p);
  const job = npcJobTitle(p);
  const c = COUNTRIES[p.country];
  const traits = (p.traits || []).map((t) => TRAITS[t] ? `<span class="chip">${emo(TRAITS[t].emoji, 18)}${esc(TRAITS[t].name)}</span>` : '').join('');
  const card = `<div class="card p-card">
    ${avatarOf(p, 104)}
    <div class="p-name">${esc(fullName(p))}</div>
    <div class="p-meta">${royalTitle(G, p) ? esc(royalName(G, p)) + ' · ' : ''}${esc(kinLabel(r.kind, p))} · ${p.alive ? `${age} years old` : `Died ${esc(deathPhrase(p.cause || 'unknown causes'))} at ${p.deathYear - p.birthYear}`}</div>
    <div class="p-meta">${p.knighted ? '⚔️ Knighted · ' : ''}${job ? esc(job) + ' · ' : ''}${c ? c.flag + ' ' + esc(p.city) : ''}</div>
    ${p.alive ? `<div class="rel-bar"><div class="muted">Relationship · ${Math.round(r.rel)}%</div>${bar(r.rel)}</div>
    <div class="mini-stats">${statCell('health', p.stats.health)}${statCell('smarts', p.stats.smarts)}${statCell('looks', p.stats.looks)}${statCell('happy', p.stats.happy)}</div>` : ''}
    ${traits ? `<div class="chips" style="justify-content:center;margin-top:10px">${traits}</div>` : ''}
  </div>`;
  const body = bodyCard(p, false);
  const sb = META.settings.sandbox && p.alive ? `<div class="section-title">Sandbox</div><div class="card"><div class="slider-row"><span>Relationship</span><input type="range" min="0" max="100" value="${r.rel}" data-in="sbRel" data-id="${pid}"><b id="sbRelV">${r.rel}</b></div></div>` : '';
  const acts = actionRows('person', pid);
  return { title: fullName(p), html: card + (body ? `<div class="section-title">Appearance</div>${body}` : '') + sb + (acts ? `<div class="section-title">Interact</div>${listOf(acts)}` : (p.alive ? '<div class="note">You can’t interact right now.</div>' : '')) };
};
INPUT.sbRel = (el, ds) => { Sandbox.setRel(G, ds.id, Number(el.value)); const v = $('#sbRelV'); if (v) v.textContent = el.value; scheduleSave(); };

SHEETS.pet = (id) => {
  const pet = G.pets[id];
  if (!pet) return null;
  const S = PET_SPECIES[pet.species];
  return {
    title: pet.name,
    html: `<div class="card p-card"><div class="avatar" style="background:color-mix(in srgb, #D99A5B 22%, var(--surface-2))">${emo(S.emoji, 56)}</div><div class="p-name">${esc(pet.name)}</div><div class="p-meta">${esc(pet.breed)} ${esc(S.name.toLowerCase())} · ${petAge(G, pet)} years old</div>
      <div class="rel-bar"><div class="muted">Bond · ${Math.round(pet.rel)}%</div>${bar(pet.rel)}</div></div>
      <div class="section-title">Interact</div>${listOf(actionRows('pet', id))}`,
  };
};

SHEETS.profile = () => {
  const p = G.people[G.playerId], m = M(G);
  const [mo, d] = p.bday;
  const skills = SKILL_IDS.filter((k) => (m.skills[k] || 0) >= 1).sort((a, b) => m.skills[b] - m.skills[a]);
  const known = knownDiseases(G);
  const habits = Object.keys(m.addictions).filter((k) => m.addictions[k] >= 10);
  const adult = A(G) >= ADULT_AGE;
  let html = `<div class="card p-card">
    ${avatarOf(p, 104)}
    <div class="p-name">${esc(fullName(p))}</div>
    <div class="p-meta">${A(G)} years old · ${genderWord(p, 'he/him', 'she/her', 'they/them')} · ${esc(ORIENTATIONS[p.orient].name)}</div>
    <div class="p-meta">${country(G).flag} ${esc(p.city)}, ${esc(country(G).name)} · born ${MONTHS[mo - 1]} ${d}, ${p.birthYear} (${zodiacOf(mo, d)})</div>
    <div class="mini-stats">${statCell('happy', p.stats.happy)}${statCell('health', p.stats.health)}${statCell('smarts', p.stats.smarts)}${statCell('looks', p.stats.looks)}${statCell('karma', m.karma, 'accent')}${statCell('fame', m.fame, 'accent')}</div>
  </div>`;
  html += `<div class="section-title">${adult ? 'Look and body' : 'Your look'}</div>${bodyCard(p, true)}<div class="list" style="${adult ? 'margin-top:8px' : ''}">${itemRow({ a: 'sheet', ds: { k: 'look' }, ico: icon('part-shirt', 24), t: M(G).freeRestyle ? 'Design your adult look' : 'Change your style', s: M(G).freeRestyle ? 'One free redesign, face and body' : adult ? 'Hair and clothes any time. Your body changes with diet, exercise and surgery.' : 'Hair, glasses and clothes', chev: true })}</div>`;
  html += `<div class="section-title">Personality</div><div class="chips">${p.traits.map((t) => `<span class="chip" title="${esc(TRAITS[t].desc)}">${emo(TRAITS[t].emoji, 18)}${esc(TRAITS[t].name)}</span>`).join('') || '<span class="muted">No notable traits.</span>'}</div>`;
  html += `<div class="note">${p.traits.map((t) => `${emo(TRAITS[t].emoji, 18)}${esc(TRAITS[t].desc)}`).join('<br>')}</div>`;
  html += `<div class="section-title">Skills</div>${skills.length ? `<div class="card">${skills.map((k) => `<div class="slider-row"><span>${emo(SKILLS[k].emoji, 18)}${esc(SKILLS[k].name)}</span>${bar(m.skills[k], 'accent')}<b>${Math.round(m.skills[k])}</b></div>`).join('')}</div>` : '<div class="note">No skills yet. Classes, clubs, jobs and practice build them.</div>'}`;
  html += `<div class="section-title">Goals</div>${goalsList()}`;
  html += `<div class="section-title">Health</div><div class="card">${known.length ? known.map((x) => kvRow(emo(DISEASES[x.id].emoji, 18) + ' ' + esc(DISEASES[x.id].name), 'since ' + x.since)).join('') : '<div class="muted">No known conditions.</div>'}${habits.map((k) => kvRow(emo(ADDICTIONS[k].emoji, 18) + ' ' + esc(ADDICTIONS[k].name) + ' habit', m.addictions[k] >= 50 ? '<span class="bad">Addicted</span>' : 'Developing')).join('')}</div>`;
  html += `<div class="section-title">Education</div><div class="card">${m.edu.degrees.length ? m.edu.degrees.map((x) => kvRow(esc(degreeLabel(x)), x.year)).join('') : '<div class="muted">No diplomas yet.</div>'}</div>`;
  html += `<div class="section-title">Record</div><div class="card">${kvRow("Driver's license", m.license ? 'Yes' : '—')}${m.socials ? kvRow('Social media', `${esc(m.socials.handle)} · ${fmtNum(m.socials.followers)} followers${m.socials.verified ? ' · verified' : ''}`) : ''}${m.record.length ? m.record.map((r) => kvRow(esc(cap(CRIMES[r.crime].verb)), r.years ? `${r.years >= 99 ? 'life' : nOf(r.years, 'yr')} · ${r.year}` : `fined · ${r.year}`)).join('') : kvRow('Criminal record', 'Clean')}${m.wanted ? kvRow('Status', '<span class="bad">Fugitive</span>') : ''}</div>`;
  return { title: 'Your profile', html };
};
function goalsList() {
  const goals = M(G).goals;
  if (!goals.length) return '<div class="note">No goals.</div>';
  return `<div class="list">${goals.map((g) => { const d = GOALS.find((x) => x.id === g.id); return itemRow({ ico: g.done ? icon('ui-check', 22) : d.emoji, t: esc(d.text), s: g.done ? 'Done in ' + g.year : 'In progress', cls: g.done ? 'good' : '' }); }).join('')}</div>`;
}
