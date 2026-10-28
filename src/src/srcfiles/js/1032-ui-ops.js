/* =====================================================================
 * 1032-ui-ops.js — what you run, on screen: the investment scheme, the
 * long con, the files, the operation and the vigilante. The engines are
 * 82-schemes.js, 83-operation.js and 84-street-justice.js. A card on the
 * profile opens the sheet; the actions are in the Schemes & Rackets,
 * Underworld and Street Justice menus.
 * ===================================================================== */

const OP_HEAT_WORD = (h) => (h >= 70 ? 'Burning' : h >= 45 ? 'Hot' : h >= 20 ? 'Warm' : 'Quiet');
const LOYAL_WORD = (v) => (v >= 75 ? 'Devoted' : v >= 50 ? 'Loyal' : v >= 25 ? 'Wavering' : 'About to talk');
function opsAny() {
  const m = M(G);
  return !!(m.scheme && (m.scheme.ponzi || m.scheme.con || m.scheme.ring || m.scheme.done.length)) || !!m.op || !!m.vig;
}
// The profile's entry, only when there is something to show.
function opsCard() {
  if (!opsAny()) return '';
  const m = M(G), bits = [];
  if (m.op) bits.push(m.op.name);
  if (m.scheme && m.scheme.ponzi) bits.push(m.scheme.ponzi.name);
  if (m.scheme && m.scheme.con) bits.push('A long game');
  if (m.scheme && m.scheme.ring) bits.push('Files');
  if (m.vig) bits.push(m.vig.alias);
  return `<div class="section-title">What you run</div><div class="list">${itemRow({ a: 'sheet', ds: { k: 'ops' }, ico: '📦', t: 'Ventures & rackets', s: esc(bits.join(' · ') || 'Where it ended'), chev: true })}</div>`;
}
function opsHeatCard(label, v) { return `<div class="muted" style="margin-top:8px">${esc(label)} · ${OP_HEAT_WORD(v)} (${Math.round(v)}%)</div>${bar(v, v >= 60 ? 'low' : v >= 30 ? 'mid' : 'accent')}`; }
SHEETS.ops = () => {
  const m = M(G), d = m.scheme || { ponzi: null, con: null, ring: null, done: [] };
  let html = '';
  const z = d.ponzi;
  if (z) {
    const st = PZ_STYLES[z.style];
    html += `<div class="section-title">${st.emoji} ${esc(z.name)}</div><div class="card">
      ${kvRow('Investors', String(z.investors))}${kvRow('Owed to them', fmtMoney(z.owed))}${kvRow('Cash on hand', fmtMoney(z.pot))}${kvRow('You have taken', fmtMoney(z.skim))}${kvRow('It promises', Math.round(st.rate * 100) + '% a year')}
      ${opsHeatCard('Suspicion', z.heat)}
    </div>`;
    const marks = z.marks.filter((x) => G.people[x.pid] && G.people[x.pid].alive);
    if (marks.length) html += `<div class="section-title">People you know who are in it</div>${listOf(marks.map((x) => personRow(G.people[x.pid])).join(''))}`;
    html += '<div class="note">It asks for a decision every year. Every way out of it except winding it down honestly ends with a case file.</div>';
  }
  const c = d.con;
  if (c) {
    const K = CON_STYLES[c.style], mk = c.mark && G.people[c.mark];
    html += `<div class="section-title">${K.emoji} ${esc(K.label)}</div><div class="card">
      ${kvRow('Since', String(c.since))}${kvRow('Taken so far', fmtMoney(c.take))}
      <div class="muted" style="margin-top:8px">Trust · ${Math.round(c.trust)}%</div>${bar(c.trust, 'accent')}
      <div class="muted" style="margin-top:8px">Suspicion · ${Math.round(c.susp)}%</div>${bar(c.susp, c.susp >= 60 ? 'low' : c.susp >= 30 ? 'mid' : 'accent')}
    </div>${mk ? `<div class="list">${personRow(mk)}</div>` : ''}`;
  }
  const r = d.ring;
  if (r) {
    html += `<div class="section-title">✉️ Files</div><div class="card">
      ${kvRow('Files you hold', String(ringFiles(G, r).length))}${kvRow('Crew', String(r.crew))}${kvRow('Taken so far', fmtMoney(r.take))}
      ${opsHeatCard('Heat', r.heat)}
    </div><div class="note">Work them from the Schemes & Rackets menu. Every squeeze is a chance someone goes to the police.</div>`;
  }
  const o = m.op;
  if (o) {
    const st = opStage(o), prod = OP_PRODUCTS[o.product], crew = opCrewOf(G);
    html += `<div class="section-title">📦 ${esc(o.name)}</div><div class="card">
      ${kvRow('Standing', esc(OP_STAGES[st]))}${kvRow('Moving', esc(prod.name))}${kvRow('Blocks', `${o.turf} of ${OP_CAP[st]}`)}
      ${kvRow('Supply', opMakes(o) ? `Made at ${esc(o.site.name)}` : 'Bought')}${kvRow('Last year', `${fmtMoney(o.last.gross)} in · ${o.last.net >= 0 ? '' : '-'}${fmtMoney(Math.abs(o.last.net))} ${o.last.net >= 0 ? 'clear' : 'lost'}`)}
      ${kvRow('Yearly payroll', fmtMoney(opPayroll(G, o)))}${kvRow('Taken so far', fmtMoney(o.take))}${o.deaths ? kvRow('Dead of what you sold', `<span class="bad">${o.deaths}</span>`) : ''}
      ${o.rival ? kvRow('Rival', esc(cap(o.rival.name))) : ''}
      <div class="muted" style="margin-top:8px">Street rep · ${Math.round(o.rep)}%</div>${bar(o.rep, 'accent')}
      ${opsHeatCard('Heat', o.heat)}
    </div>`;
    if (crew.length) html += `<div class="section-title">Crew</div>${listOf(crew.map((x) => { const p = G.people[x.pid]; return itemRow({ a: 'sheet', ds: { k: 'person', arg: p.id }, round: true, ico: avatarOf(p, 44), t: esc(fullName(p)), s: esc(`${OP_ROLES[x.role].name} · ${LOYAL_WORD(x.loyalty)}`), chev: true }); }).join(''))}`;
    html += '<div class="note">Build it from the Underworld menu: bring people in, change the supply or the product, or get out.</div>';
  }
  const v = m.vig;
  if (v) {
    html += `<div class="section-title">🏮 ${esc(v.alias)}</div><div class="card">
      ${kvRow('Since', String(v.since))}${kvRow('Leads that worked out', String(v.wins))}${v.wrong ? kvRow('The wrong person', `<span class="bad">${v.wrong}</span>`) : ''}
      <div class="muted" style="margin-top:8px">Street rep · ${Math.round(v.rep)}%</div>${bar(v.rep, 'accent')}
      ${opsHeatCard('Heat', v.heat)}
    </div><div class="note">Go out from the Street Justice menu. It is a crime whichever way it goes.</div>`;
  }
  if (d.done.length) html += `<div class="section-title">How it ended before</div>${listOf(d.done.slice().reverse().map((x) => itemRow({ ico: { ponzi: '📉', con: '💌', ring: '✉️', operation: '📦' }[x.kind] || '🗂️', t: esc({ ponzi: 'An investment scheme', con: 'A long con', ring: 'Files', operation: 'An operation' }[x.kind] || x.kind), s: esc(`${x.year} · ${x.how}${x.amt ? ' · ' + fmtMoney(x.amt) : ''}`) })).join(''))}`;
  return { title: 'Ventures & rackets', html: html || '<div class="empty">Nothing running.</div>' };
};
