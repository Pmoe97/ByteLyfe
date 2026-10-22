/* =====================================================================
 * 1023-ui-youth.js — growing up on screen: school life under the School card
 * on the Work sheet (report card, popularity, teacher and principal, the school
 * record, clubs and teams, college prep), the Home & Parents card, and the
 * Classes & Lessons card. The engine is 55-school-life.js, 56-growing-up.js
 * and 57-lessons.js.
 * ===================================================================== */

function personLink(pid, sub) {
  const p = G.people[pid];
  if (!p || !p.alive || !relOf(G, pid)) return '';
  return itemRow({ a: 'sheet', ds: { k: 'person', arg: pid }, round: true, ico: avatarOf(p, 40), t: esc(fullName(p)), s: esc(sub), chev: true, extra: relMeter(relOf(G, pid).rel) });
}
function gradeChip(g) { const l = letterGrade(g); return `<span class="chip ${l.startsWith('A') ? 'good' : l === 'F' || l.startsWith('D') ? 'bad' : ''}">${l}</span>`; }

// Everything about school life, below the School card.
function schoolLifeHtml(cur) {
  let html = '';
  if (cur.kind === 'school' && cur.subj) {
    const t = personIf(G, cur.teacher, 'teacher'), pr = personIf(G, cur.principal, 'principal'), b = personIf(G, cur.bully, 'bully');
    html += `<div class="section-title">This year so far</div><div class="card">
      ${SUBJECT_IDS.map((k) => kvRow(`${emo(SUBJECTS[k].emoji, 16)} ${esc(SUBJECTS[k].name)}`, gradeChip(subjectGrade(cur, k)))).join('')}
      ${cur.card ? `<div class="note">Last report card (${cur.card.year}): ${SUBJECT_IDS.map((k) => `${esc(SUBJECTS[k].name)} ${letterGrade(cur.card.g[k])}`).join(' · ')}</div>` : ''}
      <div class="rel-bar"><div class="muted">Popularity · ${esc(popWord(cur.pop))}</div>${bar(cur.pop)}</div>
    </div>`;
    const people = [t ? personLink(t.id, `Your ${SUBJECTS[t.teaches].name} teacher this year`) : '', pr ? personLink(pr.id, 'Principal') : '', b ? personLink(b.id, 'Bullying you. Tap to deal with it.') : ''].join('');
    if (people) html += `<div class="section-title">People at school</div>${listOf(people)}`;
    const det = conductCount(G, 'detention'), sus = conductCount(G, 'suspension'), exp = conductCount(G, 'expulsion');
    html += `<div class="section-title">Your record</div><div class="card">${det + sus + exp ? [det ? kvRow('Detentions', det) : '', sus ? kvRow('Suspensions', `<span class="bad">${sus}</span>`) : '', exp ? kvRow('Expulsions', `<span class="bad">${exp}</span>`) : ''].join('') : kvRow('School record', 'Spotless')}</div>`;
  }
  if ((cur.clubs || []).length) {
    html += `<div class="section-title">Clubs & teams</div>${listOf(cur.clubs.map((id) => {
      const c = SCHOOL_CLUBS[id], d = clubRec(cur, id), next = d.r < 3 ? [15, 40, 70][d.r] : null;
      return itemRow({ ico: c.emoji, t: `${esc(c.name)} <span class="faint">· ${esc(c.ranks[d.r])}</span>`, s: esc(d.last ? `Last season: ${d.last}` : 'Your first season is this year'), extra: next ? `<div class="meter next">${bar(clamp((d.pts / next) * 100, 0, 100), 'accent')}<b>${esc(c.ranks[d.r + 1])}</b></div>` : '' });
    }).join(''))}`;
  }
  if (cur.kind === 'school' && cur.stage === 'high') {
    const e = eduRec(G), ex = e.exam;
    const rows = [kvRow('Entrance exam', ex && ex.best ? `${ordinal(ex.best)} percentile` : 'Not taken yet')];
    if (e.apps) rows.push(kvRow('Applications', `${e.apps.list.length} sent · decisions at graduation`));
    rows.push(kvRow('Activities on your record', e.resume.length ? nOf(e.resume.length, 'highlight') : 'None yet'));
    html += `<div class="section-title">Getting into college</div><div class="card">${rows.join('')}${e.resume.length ? `<div class="note">${e.resume.slice(-6).map((r) => esc(r.text)).join(' · ')}</div>` : ''}</div>`;
  }
  return html;
}

// The Home & Parents menu opens with the house rules.
function homeCard() {
  if (!atHome(G)) return A(G) >= 18 ? '<div class="note">You’re an adult now. House rules are your own.</div>' : '';
  const h = homeRec(G), rows = [kvRow('Your parents', strictWord(h.strict)), kvRow('Curfew', curfewText(h.curfew)), kvRow('Allowance', h.allow ? `${fmtMoney(Math.round(h.allow / 52))} a week` : 'None')];
  if (h.phone) rows.push(kvRow('Phone', 'Yes'));
  if (h.collection) rows.push(kvRow('Collection', esc(cap(h.collection))));
  let html = `<div class="card" style="margin-bottom:12px">${rows.join('')}</div>`;
  if (grounded(G)) html = `<div class="note bad">🔒 You're grounded until the end of ${h.grounded}. No outings, parties or dates (unless you sneak out).</div>` + html;
  return html + '<div class="section-title">What will you do?</div>';
}

// Classes & Lessons opens with your lessons and how close the next level is.
function lessonsCard() {
  const all = lessonsOf(G), on = activeLessons(G), off = Object.keys(all).filter((id) => !all[id].on && LESSON_TYPES[id]);
  if (!on.length && !off.length) return '<div class="note">Instruments, martial arts, dance, sports, languages and more. Up to three at a time.</div>';
  let html = '';
  if (on.length) html += `<div class="section-title">Your classes</div>${listOf(on.map((id) => {
    const L = LESSON_TYPES[id], r = all[id], top = r.lvl >= lessonTop(id), t = r.pid && G.people[r.pid];
    const sub = [lessonLevel(id, r.lvl), t ? `${cap(teacherWord(id))} ${t.first} ${t.last}` : '', r.medals ? nOf(r.medals, 'medal') : '', `${fmtMoney(lessonFee(G, id))}/yr`].filter(Boolean).join(' · ');
    return itemRow({ a: t ? 'sheet' : null, ds: t ? { k: 'person', arg: t.id } : {}, ico: L.emoji, t: esc(L.name), s: esc(sub), chev: !!t, extra: top ? '' : `<div class="meter next">${bar(clamp((r.xp / lessonNeed(r.lvl)) * 100, 0, 100), 'accent')}<b>${esc(lessonLevel(id, r.lvl + 1))}</b></div>` });
  }).join(''))}`;
  if (off.length) html += `<div class="note">Stopped: ${off.map((id) => `${esc(LESSON_TYPES[id].name)} (${esc(lessonLevel(id, all[id].lvl))})`).join(', ')}</div>`;
  return html + '<div class="section-title">What will you do?</div>';
}
