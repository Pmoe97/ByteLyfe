/* =====================================================================
 * 1018-ui-godmode.js — God Mode for anyone in your life (sheet 'npcEdit'):
 * name, gender, orientation, age, stats, relationship, personality,
 * money, work, education, hometown and appearance. Changes apply at once.
 * The rules live in Sandbox (28-sandbox.js). Settings → "God Mode buttons"
 * hides every God Mode entry point (godOn).
 * ===================================================================== */

function godOn() { return META.settings.godMode !== false; }

// The God Mode row on a person's page.
function godRow(p) {
  if (!godOn() || !p.alive) return '';
  return `<div class="section-title">God Mode</div><div class="list">${itemRow({ a: 'sheet', ds: { k: 'npcEdit', arg: p.id }, ico: icon('crown', 28), t: `Edit ${esc(p.first)}`, s: 'Name, age, personality, money, work, looks and more', chev: true })}</div>`;
}

SHEETS.npcEdit = (pid) => {
  const p = G.people[pid], r = relOf(G, pid);
  if (!p || !p.alive) return null;
  const age = ageOf(G, p), [lo, hi] = Sandbox.npcAgeRange(G, pid), rate = MONEY_FMT ? MONEY_FMT.rate : 1;
  const seg = (k, opts, cur) => `<div class="seg">${opts.map(([v, l]) => `<button class="${cur === v ? 'on' : ''}" data-a="npcSet" data-id="${pid}" data-k="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const slider = (k, v, name, ico) => `<div class="slider-row"><span>${ico} ${name}</span><input type="range" min="0" max="100" value="${Math.round(v)}" data-in="npcStat" data-id="${pid}" data-k="${k}"><b id="npc-${k}">${Math.round(v)}</b></div>`;
  const opt = (v, l, cur) => `<option value="${esc(v)}"${cur === v ? ' selected' : ''}>${esc(l)}</option>`;
  const jobNow = p.retired ? 'retired' : !p.job ? 'none' : p.job.student ? 'student' : p.job.pt ? 'pt:' + p.job.pt : p.job.id;
  const jobOpts = [opt('none', 'No job', jobNow), opt('student', 'Student', jobNow), age >= 40 ? opt('retired', 'Retired', jobNow) : '']
    .concat(age >= 14 ? Object.keys(PT_JOBS).map((k) => opt('pt:' + k, `${PT_JOBS[k].name} (part-time)`, jobNow)) : [])
    .concat(age >= 16 ? JOB_IDS.map((id) => opt(id, `${JOBS[id].emoji} ${JOBS[id].name}`, jobNow)) : []).join('');
  const lad = p.job && p.job.id && JOBS[p.job.id] ? JOBS[p.job.id].ladder : null;
  const levelOpts = lad ? lad.map((rung, i) => opt(String(i), rung[0], String(Math.min(p.job.level, lad.length - 1)))).join('') : '';
  const degOpts = [opt('', 'No degree', p.edu || '')].concat(Object.keys(DEGREE_NAMES).map((d) => opt(d, DEGREE_NAMES[d], p.edu || ''))).join('');
  const majorOpts = [opt('', '(no major)', p.major || '')].concat(MAJOR_IDS.map((k) => opt(k, MAJORS[k].name, p.major || ''))).join('');
  const html = `<div class="card p-card">${avatarOf(p, 88)}<div class="p-name">${esc(fullName(p))}</div><div class="p-meta">${esc(kinTitle(G, pid))} · ${age} years old</div><div class="note" style="margin-top:6px">God Mode · changes apply right away</div></div>
    <div class="section-title">Name</div><div class="card"><div class="field-row">
      <input type="text" maxlength="24" value="${esc(p.first)}" data-in="npcName" data-id="${pid}" data-k="first" aria-label="First name">
      <input type="text" maxlength="24" value="${esc(p.last)}" data-in="npcName" data-id="${pid}" data-k="last" aria-label="Last name">
    </div></div>
    <div class="section-title">Identity</div><div class="card">
      <div class="field"><label>Gender</label>${seg('gender', [['f', 'Woman'], ['m', 'Man'], ['x', 'Nonbinary']], p.gender)}</div>
      <div class="field"><label>Orientation</label><select data-in="npcSel" data-id="${pid}" data-k="orient">${Object.keys(ORIENTATIONS).map((o) => opt(o, ORIENTATIONS[o].name, p.orient)).join('')}</select></div>
      <div class="slider-row"><span>🎂 Age</span><input type="range" min="${lo}" max="${hi}" value="${age}" data-in="npcAge" data-id="${pid}"${lo === hi ? ' disabled' : ''}><b id="npc-age">${age}</b></div>
      ${lo === hi ? '<div class="note">Their age is locked by family ties.</div>' : lo >= ADULT_AGE && hi >= lo ? '<div class="note">Stays 18 or older: they have a partner, a romance with you, or kids.</div>' : ''}
    </div>
    <div class="section-title">Stats</div><div class="card">
      ${['happy', 'health', 'smarts', 'looks'].map((k) => slider(k, p.stats[k], STAT_INFO[k].name, icon(STAT_ICONS[k], 18))).join('')}
      <div class="slider-row"><span>${icon('love', 18)} Relationship</span><input type="range" min="0" max="100" value="${Math.round(r.rel)}" data-in="sbRel" data-id="${pid}"><b id="sbRelV">${Math.round(r.rel)}</b></div>
      ${Sandbox.npcKindEditable(G, pid) ? `<div class="field" style="margin-top:8px"><label>They are your</label>${seg('kind', [['friend', 'Friend'], ['bestie', 'Best friend'], ['enemy', 'Enemy']], r.kind)}</div>` : ''}
    </div>
    <div class="section-title">Personality (up to 4)</div><div class="chips">${TRAIT_IDS.map((t) => `<button class="chip ${(p.traits || []).includes(t) ? 'on' : ''}" data-a="npcTrait" data-id="${pid}" data-t="${t}">${emo(TRAITS[t].emoji, 18)}${esc(TRAITS[t].name)}</button>`).join('')}</div>
    <div class="section-title">Money</div><div class="card"><div class="field-row"><input type="number" id="npc-money" value="${Math.round((p.money || 0) * rate)}" aria-label="Money"><button class="btn primary" data-a="npcMoney" data-id="${pid}">Set</button></div>
      <div class="chips" style="margin-top:10px">${[1000, 100000, 1000000].map((v) => `<button class="chip" data-a="npcAddMoney" data-id="${pid}" data-v="${v}">+${fmtMoneyShort(v)}</button>`).join('')}</div>
      <div class="note">${esc(p.first)} has ${fmtMoney(p.money || 0)}.</div></div>
    <div class="section-title">Work</div><div class="card">
      <div class="field"><select data-in="npcSel" data-id="${pid}" data-k="job">${jobOpts}</select></div>
      ${lad ? `<div class="field"><label>Rung</label><select data-in="npcSel" data-id="${pid}" data-k="level">${levelOpts}</select></div>` : ''}
      ${age < 16 ? '<div class="note">Part-time work opens at 14 and careers at 16.</div>' : ''}
    </div>
    <div class="section-title">Education</div><div class="card">
      <div class="field"><select data-in="npcSel" data-id="${pid}" data-k="edu">${degOpts}</select></div>
      ${p.edu && EDU_RANK[p.edu] >= 2 ? `<div class="field"><select data-in="npcSel" data-id="${pid}" data-k="major">${majorOpts}</select></div>` : ''}
    </div>
    <div class="section-title">Home</div><div class="card">
      <div class="field"><select data-in="npcSel" data-id="${pid}" data-k="country">${COUNTRY_IDS.map((c) => opt(c, `${COUNTRIES[c].flag} ${COUNTRIES[c].name}`, p.country)).join('')}</select></div>
      <div class="field"><select data-in="npcSel" data-id="${pid}" data-k="city">${COUNTRIES[p.country].cities.map((c) => opt(c, c, p.city)).join('')}</select></div>
    </div>
    <div class="section-title">Appearance</div><div class="list">${itemRow({ a: 'sheet', ds: { k: 'look', arg: 'god:' + pid }, ico: avatarOf(p, 44), t: `Edit ${esc(p.first)}'s appearance`, s: age >= ADULT_AGE ? 'Every feature, body included' : 'Every feature', chev: true })}</div>`;
  return { title: `Edit ${p.first}`, html };
};

// Edits that change other parts of the sheet re-render it; sliders only update their label.
const npcDone = (redraw) => { scheduleSave(); if (redraw) refresh(); };
CLICK.npcSet = (el, ds) => {
  if (ds.k === 'gender') Sandbox.npcGender(G, ds.id, ds.v);
  else if (ds.k === 'kind') Sandbox.npcKind(G, ds.id, ds.v);
  npcDone(true);
};
CLICK.npcTrait = (el, ds) => { Sandbox.npcTrait(G, ds.id, ds.t); npcDone(true); };
CLICK.npcMoney = (el, ds) => { Sandbox.npcMoney(G, ds.id, Number($('#npc-money').value) / (MONEY_FMT ? MONEY_FMT.rate : 1)); npcDone(true); toast('Money set.'); };
CLICK.npcAddMoney = (el, ds) => { const p = G.people[ds.id]; if (p) Sandbox.npcMoney(G, ds.id, (p.money || 0) + Number(ds.v)); npcDone(true); toast('+' + fmtMoneyShort(Number(ds.v))); };
INPUT.npcName = (el, ds) => { Sandbox.npcName(G, ds.id, ds.k, el.value); scheduleSave(); };
INPUT.npcStat = (el, ds) => { Sandbox.npcStat(G, ds.id, ds.k, Number(el.value)); const v = $('#npc-' + ds.k); if (v) v.textContent = el.value; scheduleSave(); };
INPUT.npcAge = (el, ds) => { Sandbox.npcAge(G, ds.id, Number(el.value)); const v = $('#npc-age'); if (v) v.textContent = el.value; scheduleSave(); };
INPUT.npcSel = (el, ds) => {
  const p = G.people[ds.id];
  if (!p) return;
  if (ds.k === 'orient') Sandbox.npcOrient(G, ds.id, el.value);
  else if (ds.k === 'job') Sandbox.npcJob(G, ds.id, el.value, 0);
  else if (ds.k === 'level') Sandbox.npcJob(G, ds.id, p.job.id, Number(el.value));
  else if (ds.k === 'edu') Sandbox.npcEdu(G, ds.id, el.value, p.major);
  else if (ds.k === 'major') Sandbox.npcEdu(G, ds.id, p.edu, el.value);
  else if (ds.k === 'country') Sandbox.npcHome(G, ds.id, el.value, null);
  else if (ds.k === 'city') Sandbox.npcHome(G, ds.id, p.country, el.value);
  npcDone(true);
};
