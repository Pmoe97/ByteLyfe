/* =====================================================================
 * 1021-ui-gambling.js — gambling on screen: the Gambling menu's card (the
 * places to play in reach, your standing, debts and bets) and the race
 * screen, where the horses run the race the engine already decided and
 * the bet pays out at the finish line (settleRace). The engine is
 * 53-gambling.js.
 * ===================================================================== */

function gambleCard() {
  if (!canGamble(G)) return A(G) >= 18 && free(G) ? `<div class="note">The casinos here won’t let you in until ${gambleAge(G)}.</div>` : '';
  const g = gamb(G), rows = [], habitLvl = M(G).addictions.gambling || 0;
  if (habitLvl >= 10) rows.push(kvRow('The habit', habitLvl >= 60 ? '<span class="bad">It owns you</span>' : habitLvl >= 30 ? '<span class="bad">Getting worse</span>' : 'A little too often'));
  if (g.debts.length) rows.push(kvRow('You owe', `<span class="bad">${fmtMoney(gambDebt(G))}</span>`));
  if (excluded(G)) rows.push(kvRow('Self-excluded', `until ${g.excluded}`));
  if (tripKey(G)) rows.push(kvRow('Trip', `${tripKey(G).split(':')[1]}, all year`));
  let html = rows.length ? `<div class="card" style="margin-bottom:12px">${rows.join('')}</div>` : '';
  const vs = venuesReach(G);
  html += `<div class="section-title">Places to play</div><div class="list">${vs.map((v) => {
    const st = vStand(G, v.id), owed = owedTo(G, v), K = VENUE_KINDS[v.kind];
    const bits = [K.name, ownerText(G, v)];
    if (v.city && v.city !== P(G).city) bits.unshift(v.city);
    if (['casino', 'resort', 'track'].includes(v.kind) && st.wagered) bits.push(TIERS[st.tier][0]);
    if (st.banned > G.year) bits.push(`<span class="bad">banned until ${st.banned}</span>`);
    if (owed) bits.push(`<span class="bad">you owe ${fmtMoney(owed)}</span>`);
    return itemRow({ a: free(G) ? 'act' : null, ds: { id: 'venue_visit', t: v.id }, ico: K.emoji, t: esc(venueLabel(G, v)), s: bits.join(' · '), chev: true });
  }).join('')}</div>`;
  if (g.bets.length) html += `<div class="section-title">Riding on this season</div><div class="card">${g.bets.map((b) => kvRow(`${emo(SPORTS[b.sport].emoji, 16)} ${esc(b.team)}`, `${fmtMoney(b.amt)} at ${oddsText(b.dec)}`)).join('')}</div>`;
  return html + '<div class="section-title">What will you do?</div>';
}

/* ---- the race screen ------------------------------------------------------------------ */
const RACE_MS = 9000;
const COATS = ['#6B4226', '#3B2A1E', '#8A5A3B', '#A9A6A4', '#2B2B2B', '#9C6B3F', '#5A3A22', '#C2A878'];
// Opens the race screen once, right after a bet on a race (refresh in 1000-ui-kit.js calls this).
function raceHook() {
  const r = G && G.player && G.player.gamb && G.player.gamb.race;
  if (!r || r.shown || UI.screen !== 'game') return;
  r.shown = true;
  UI.raceAnim = { t0: 0, done: false };
  UI.sheets.push({ kind: 'race', scroll: 0 });
  UI.sheetAnim = 'open';
}
function horseGlyph(i, color, pose) {
  const coat = COATS[i % COATS.length];
  const legs = pose
    ? 'M-6 2 L-10 9 M-3 2 L-1 9 M5 2 L9 9 M7 2 L4 9'
    : 'M-6 2 L-4 9 M-3 2 L-7 9 M5 2 L3 9 M7 2 L11 9';
  return `<path d="${legs}" stroke="${coat}" stroke-width="1.8" stroke-linecap="round"/>
    <ellipse cx="0" cy="0" rx="9" ry="4.4" fill="${coat}"/>
    <path d="M7 -2 L12 -7 L15 -6 L12 -2 Z" fill="${coat}"/>
    <path d="M-9 -1 Q-14 0 -13 5" stroke="${coat}" stroke-width="2" fill="none"/>
    <circle cx="1" cy="-6" r="3.4" fill="${color}" stroke="#fff" stroke-width="0.8"/>`;
}
function horseAt(i, v) { return `translate(${22 + (v / 100) * 300} ${16 + i * 24 + 12})`; }
// The top four right now, and the call at the line.
function boardHtml(r, pos) { return pos.map((v, i) => [v, i]).sort((x, y) => y[0] - x[0] || r.order.indexOf(x[1]) - r.order.indexOf(y[1])).slice(0, 4).map(([, i], k) => `<div class="kv"><span class="muted">${ordinal(k + 1)}</span><b><span style="color:${r.field[i].color}">●</span> ${esc(r.field[i].name)}${i === r.mine ? ' · yours' : ''}</b></div>`).join(''); }
function finishCall(r) { return `${r.field[r.order[0]].name} wins it${r.margin < 0.25 ? ' by a nose in a photo finish' : ''}!`; }
function racePositions(r, p) {
  const F = r.frames.length, x = p * (F - 1), a = Math.floor(x), b = Math.min(F - 1, a + 1), k = x - a;
  return r.frames[a].map((v, i) => v + (r.frames[b][i] - v) * k);
}
// The race caller's lines, worked out from the frames: who leads, who's flying, the finish.
function raceCalls(r) {
  const calls = [[0, 'And they’re off!']], F = r.frames.length;
  let leader = -1;
  for (let f = 3; f < F; f++) {
    const fr = r.frames[f], lead = fr.indexOf(Math.max(...fr));
    if (lead !== leader && fr[lead] < 97) { calls.push([f / (F - 1), `${r.field[lead].name} ${leader < 0 ? 'breaks out in front' : 'takes the lead'}!`]); leader = lead; }
    if (f % 9 === 0 && f > 9) {
      const before = r.frames[f - 9], rank = (arr, i) => arr.filter((v) => v > arr[i]).length;
      const mover = fr.map((v, i) => rank(before, i) - rank(fr, i)).reduce((best, d, i, arr) => (d > arr[best] ? i : best), 0);
      if (rank(before, mover) - rank(fr, mover) >= 3) calls.push([f / (F - 1), `${r.field[mover].name} is flying on the outside!`]);
    }
  }
  calls.push([0.72, 'Down the stretch they come!']);
  calls.sort((a, b) => a[0] - b[0]);
  return calls;
}
SHEETS.race = () => {
  const r = G.player.gamb && G.player.gamb.race;
  if (!r) return null;
  const a = UI.raceAnim || (UI.raceAnim = { t0: 0, done: false });
  const lanes = r.field.length, H = 22 + lanes * 24;
  const lane = (i) => 16 + i * 24 + 12;
  const track = `<rect x="0" y="0" width="360" height="${H}" rx="14" fill="#7A5230"/>
    <rect x="0" y="0" width="360" height="10" fill="#3E7A3A"/><rect x="0" y="${H - 10}" width="360" height="10" fill="#3E7A3A"/>
    ${Array.from({ length: lanes + 1 }, (_, i) => `<line x1="8" x2="352" y1="${16 + i * 24}" y2="${16 + i * 24}" stroke="#F4E3C3" stroke-opacity="0.25" stroke-dasharray="4 6"/>`).join('')}
    ${[0.25, 0.5, 0.75].map((f) => `<line x1="${22 + f * 300}" x2="${22 + f * 300}" y1="12" y2="${H - 12}" stroke="#fff" stroke-opacity="0.18"/>`).join('')}
    ${Array.from({ length: Math.ceil((H - 24) / 6) }, (_, i) => `<rect x="${i % 2 ? 325 : 328}" y="${12 + i * 6}" width="3" height="6" fill="${i % 2 ? '#fff' : '#111'}"/>`).join('')}
    ${r.field.map((f, i) => `<text x="6" y="${lane(i) + 3}" font-size="8" font-weight="800" fill="#F4E3C3">${f.no}</text>`).join('')}`;
  // Drawn where they are right now: at the gate, or past the line once it's over.
  const pos = racePositions(r, a.done ? 1 : 0);
  const horses = r.field.map((f, i) => `<g id="rh-${i}" transform="${horseAt(i, pos[i])}">${horseGlyph(i, f.color, 0)}</g>`).join('');
  const mine = r.field[r.mine];
  let html = `<div class="race-wrap"><svg id="race-svg" viewBox="0 0 360 ${H}" role="img" aria-label="The race at ${esc(r.track)}">${track}${horses}</svg></div>
    <div class="race-call" id="race-call" aria-live="polite">${a.done ? finishCall(r) : 'The horses are at the gate…'}</div>
    <div class="card race-board" id="race-board">${a.done ? boardHtml(r, pos) : ''}</div>
    <div class="note">${r.own ? `Your horse: <b style="color:${mine.color}">#${mine.no} ${esc(mine.name)}</b>, running for a ${fmtMoneyShort(r.own.purse)} purse${r.amt ? `, with ${fmtMoney(r.amt)} on to win` : ''}.` : `Your bet: ${fmtMoney(r.amt)} on <b style="color:${mine.color}">#${mine.no} ${esc(mine.name)}</b> to ${r.type}.`}</div>`;
  if (a.done) {
    const place = r.order.indexOf(r.mine);
    html += `<div class="section-title">Result</div><div class="card">${r.order.slice(0, 3).map((i, k) => kvRow(`${['🥇', '🥈', '🥉'][k]} <span style="color:${r.field[i].color}">●</span> ${esc(r.field[i].name)}`, esc(r.field[i].odds))).join('')}
      ${place > 2 ? kvRow(`Your horse`, `${ordinal(place + 1)}`) : ''}</div>
      <button class="btn primary block" style="margin-top:12px" data-a="raceDone">${r.payout + (r.own ? r.own.won : 0) > 0 ? `Collect ${fmtMoney(r.payout + (r.own ? r.own.won : 0))}` : r.own ? 'Back to the barn' : 'Tear up the ticket'}</button>`;
  } else html += `<button class="btn block" style="margin-top:12px" data-a="raceSkip">Skip to the finish</button>`;
  setTimeout(raceLoop, 30);
  return { title: r.track, html };
};
function raceLoop() {
  const top = UI.sheets[UI.sheets.length - 1], r = G && G.player.gamb && G.player.gamb.race, a = UI.raceAnim;
  if (!top || top.kind !== 'race' || !r || !a || a.done || a.running) return;
  a.running = true;
  if (!a.t0) a.t0 = performance.now();
  const calls = raceCalls(r);
  const step = (now) => {
    const t2 = UI.sheets[UI.sheets.length - 1];
    if (!t2 || t2.kind !== 'race' || !G.player.gamb.race) { a.running = false; return; }
    const p = Math.min(1, (now - a.t0) / RACE_MS), pos = racePositions(r, p);
    pos.forEach((v, i) => {
      const el = document.getElementById('rh-' + i);
      if (el) { el.setAttribute('transform', horseAt(i, v)); el.innerHTML = horseGlyph(i, r.field[i].color, Math.floor(v / 2.5) % 2); }
    });
    const board = document.getElementById('race-board');
    if (board) board.innerHTML = boardHtml(r, pos);
    const call = document.getElementById('race-call');
    const line = calls.filter((c) => c[0] <= p).pop();
    if (call && line) call.textContent = p >= 1 ? finishCall(r) : line[1];
    if (p < 1) requestAnimationFrame(step);
    else { a.running = false; a.done = true; renderSheet(); }
  };
  requestAnimationFrame(step);
}
CLICK.raceSkip = () => { if (UI.raceAnim) UI.raceAnim.t0 = performance.now() - RACE_MS; };
CLICK.raceDone = () => {
  const top = UI.sheets[UI.sheets.length - 1];
  if (top && top.kind === 'race') UI.sheets.pop();
  UI.raceAnim = null;
  uiRun(() => settleRace(G), { emoji: '🏇', title: 'The race' });
};
