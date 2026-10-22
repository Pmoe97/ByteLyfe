/* =====================================================================
 * 1020-ui-challenges.js — the Challenges sheet (daily challenge and streak,
 * "surprise me", the hand-made list), a challenge's preview, and the
 * progress card shown in Goals and on the death screen.
 * The engine is 52-challenges.js.
 * ===================================================================== */

function chGoalRows(goals, live) {
  return goals.map((g) => {
    const k = Array.isArray(g) ? g[0] : g.k, n = Array.isArray(g) ? g[1] : g.n, done = !Array.isArray(g) && g.done;
    return itemRow({ ico: live ? (done ? icon('ui-check', 22) : '🎯') : '🎯', t: esc(chGoalText({ k, n })), cls: done ? 'good' : '' });
  }).join('');
}
function starsText(n) { return n ? '★'.repeat(n) + '☆'.repeat(5 - n) : ''; }

SHEETS.challenges = () => {
  const c = meta(), today = dailyChallenge(), doneToday = c.daily.last === today.daily;
  const streak = streakAlive() ? c.daily.streak : 0, st = startOf(today);
  let html = `<div class="card">
      <div class="row"><div class="ico">${emo('📅', 28)}</div><div class="grow"><b>${esc(today.name)}</b><div class="muted">${emo(st.emoji, 16)} ${esc(st.name)} · the same for everyone today</div></div></div>
      ${kvRow('Streak', `${streak ? '🔥 ' + nOf(streak, 'day') : 'None yet'}${c.daily.best ? ` · best ${c.daily.best}` : ''}`)}
    </div>
    <div class="list" style="margin-top:8px">${chGoalRows(today.goals)}</div>
    ${doneToday ? '<div class="note good">✓ Done today. Come back tomorrow for a new one.</div>' : `<button class="btn primary block" style="margin-top:10px" data-a="chStart" data-id="daily">${icon('flame', 26)}Play today’s challenge</button>`}
    <div class="list" style="margin-top:12px">${itemRow({ a: 'chRandom', ico: '🎲', t: 'Surprise me', s: 'A random start with two random goals', chev: true })}</div>`;
  for (let n = 1; n <= 5; n++) {
    const rows = availableChallenges().filter((x) => x.stars === n).map((x) => itemRow({ a: 'sheet', ds: { k: 'challenge', arg: x.id }, ico: x.emoji, t: `${esc(x.name)}${c.done[x.id] ? ' <span class="faint">· done ✓</span>' : ''}`, s: `${esc(startOf(x).name)} · ${esc(x.goals.map(([k, v]) => chGoalText({ k, n: v })).join(', '))}`, chev: true })).join('');
    if (rows) html += `<div class="section-title">${starsText(n)} ${['', 'Easy', 'Fair', 'Hard', 'Very hard', 'Brutal'][n]}</div><div class="list">${rows}</div>`;
  }
  if (c.history.length) html += `<div class="section-title">Recent</div><div class="card">${c.history.slice(0, 6).map((h) => kvRow(esc(h.name), h.done ? '<span class="good">Done</span>' : '<span class="bad">Failed</span>')).join('')}</div>`;
  html += '<div class="note">Every challenge is free and stays available. A challenge counts for the character who starts it.</div>';
  return { title: 'Challenges', html };
};
SHEETS.challenge = (id) => {
  const def = id === 'random' ? UI.chPreview : CHALLENGES.find((x) => x.id === id);
  if (!def) return null;
  const st = startOf(def);
  return {
    title: def.name,
    html: `<div class="card p-card"><div class="avatar">${emo(def.emoji, 56)}</div><div class="p-name">${esc(def.name)}</div>${def.stars ? `<div class="p-meta">${starsText(def.stars)}</div>` : ''}</div>
      <div class="section-title">Your start</div><div class="list">${itemRow({ ico: st.emoji, t: esc(st.name), s: esc(st.desc) })}</div>
      <div class="section-title">Goals</div><div class="list">${chGoalRows(def.goals)}</div>
      ${def.chaos ? '<div class="note">Needs Chaos mode (it’s on).</div>' : ''}
      <button class="btn primary block" style="margin-top:12px" data-a="chStart" data-id="${esc(def.id)}">${icon('flame', 26)}Start this life</button>
      ${id === 'random' ? `<button class="btn block" style="margin-top:8px" data-a="chRandom" data-again="1">${icon('dice', 26)}Roll another</button>` : ''}`,
  };
};
CLICK.chRandom = (el, ds) => { UI.chPreview = randomChallenge(); if (ds.again) replaceSheet('challenge', 'random'); else openSheet('challenge', 'random'); };
CLICK.chStart = async (el, ds) => {
  const def = ds.id === 'daily' ? dailyChallenge() : ds.id === 'random' ? UI.chPreview : CHALLENGES.find((x) => x.id === ds.id);
  if (!def) return;
  await saveNow();
  startLife(startChallenge(def));
};

// The challenge this life is playing, for the Goals sheet and the death screen.
function challengeCard(s) {
  const ch = s && s.challenge;
  if (!ch) return '';
  const mine = ch.pid === s.playerId;
  const status = ch.done ? '<span class="good">Complete</span>' : ch.failed || !mine ? '<span class="bad">Failed</span>' : 'In progress';
  return `<div class="section-title">Challenge</div><div class="card"><div class="row"><div class="ico">${emo(ch.emoji || '🎯', 28)}</div><div class="grow"><b>${esc(ch.name)}</b><div class="muted">${status}</div></div></div></div>
    <div class="list" style="margin-top:8px">${chGoalRows(ch.goals, true)}</div>`;
}
