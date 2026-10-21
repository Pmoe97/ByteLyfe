/* =====================================================================
 * 1001-ui-game.js — the main game screen (header, life log, stats, nav)
 * and the end-of-life screen.
 * ===================================================================== */

SCREENS.game = () => {
  if (!G) return SCREENS.title();
  const p = P(G), m = M(G);
  const neg = m.money < 0;
  const workLabel = inPrison(G) ? 'Prison' : inSchool(G) ? 'School' : 'Work';
  const workIcon = inPrison(G) ? 'prison' : inSchool(G) ? 'school' : 'career';
  const C = country(G);
  return `
  <header class="g-head">
    <div class="g-who">
      <button class="g-av" data-a="sheet" data-k="profile" aria-label="Your profile">${avatarOf(p, 64)}<span class="age">${A(G)}</span></button>
      <div class="grow">
        <h1 class="g-name">${esc(fullName(p))}</h1>
        <p class="g-sub">${esc(royalTitle(G, p) ? [royalTitle(G, p), jobTitle(G) === 'Unemployed' ? '' : jobTitle(G)].filter(Boolean).join(' · ') : jobTitle(G))}</p>
      </div>
      <button class="icon-btn" data-a="sheet" data-k="menu" aria-label="Menu">${icon('ui-menu', 22)}</button>
    </div>
    <div class="g-chips">
      <button class="g-chip money" data-a="sheet" data-k="finance" aria-label="Bank balance, open finances">${icon('coin', 28)}<b class="${neg ? 'neg' : ''}">${fmtMoney(m.money)}</b></button>
      <button class="g-chip" data-a="sheet" data-k="profile" aria-label="Country: ${esc(C.name)}">${icon('globe', 22)}<span>${esc(C.name)}</span></button>
      ${G.gen > 1 ? `<button class="g-chip" data-a="sheet" data-k="lineage" aria-label="Family line, generation ${G.gen}">${icon('tree', 22)}<span>Gen ${G.gen}</span></button>` : ''}
    </div>
  </header>
  <main class="g-log scroll" id="log">${renderLog()}</main>
  <section class="g-stats" data-a="sheet" data-k="profile" aria-label="Your stats">
    ${statCell('happy', p.stats.happy)}${statCell('health', p.stats.health)}
    ${statCell('smarts', p.stats.smarts)}${statCell('looks', p.stats.looks)}
    ${META.settings.showHidden ? `<div class="extra"><span>${icon('karma', 16)} Karma ${m.karma}</span><span>${icon('fame', 16)} Fame ${m.fame}</span>${m.socials ? `<span>${icon('megaphone', 16)} ${fmtNum(m.socials.followers)}</span>` : ''}</div>` : ''}
  </section>
  <nav class="g-nav" aria-label="Game">
    <button class="nav-btn" data-a="sheet" data-k="work">${icon(workIcon, 30)}<span>${workLabel}</span></button>
    <button class="nav-btn" data-a="sheet" data-k="assets">${icon('assets', 30)}<span>Assets</span></button>
    <button class="age-btn" data-a="age" aria-label="Age up one year"><span class="plus">+1</span><span class="lab">AGE</span></button>
    <button class="nav-btn" data-a="sheet" data-k="people">${icon('people', 30)}<span>People</span></button>
    <button class="nav-btn" data-a="sheet" data-k="activities">${icon('activities', 30)}<span>Activities</span></button>
  </nav>`;
};

// A leading emoji on a log line becomes the line's icon tile.
const LEAD_EMOJI = /^((?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:️|‍\p{Extended_Pictographic}|\p{Regional_Indicator})*)\s*/u;
function logLine(l) {
  let text = l.t, tile = '';
  const m = text.match(LEAD_EMOJI);
  if (m) {
    text = text.slice(m[0].length);
    tile = `<span class="lt">${emojiIcon(m[1], 20) || `<span style="font-size:17px;line-height:1">${m[1]}</span>`}</span>`;
  }
  return `<div class="ln ${l.k || ''}">${tile}<div class="lb"><p>${esc(text)}</p>${l.d && l.d.length ? `<div class="chips">${deltaChips(l.d)}</div>` : ''}</div></div>`;
}
function renderLog() {
  const entries = G.log;
  const start = UI.logAll ? 0 : Math.max(0, entries.length - 30);
  const out = [];
  if (start > 0) out.push(`<button class="btn sm log-more" data-a="logAll">Show ${start} earlier ${plural(start, 'year')}</button>`);
  for (let i = start; i < entries.length; i++) {
    const e = entries[i], cur = i === entries.length - 1;
    const lines = e.lines.map(logLine).join('');
    out.push(`<article class="yr ${cur ? 'cur' : ''}"><div class="yr-rail"><span class="yr-age">${e.age}</span>${cur ? '' : '<span class="yr-line"></span>'}</div>
      <div class="yr-card"><div class="yr-h"><span>${e.year}</span>${cur ? '<span class="now">This year</span>' : ''}</div>${lines || '<p class="faint" style="margin:0">A quiet year.</p>'}</div></article>`);
  }
  return out.join('');
}
CLICK.logAll = () => { UI.logAll = true; renderScreen(); };

CLICK.age = () => {
  if (!G || G.pending.length || G.dead) return;
  if (META.settings.confirmAge && !confirm('Age up one year?')) return;
  ageUp(G);
  UI.scrollLog = true;
  refresh();
};

/* ---- end of a life ------------------------------------------------- */
SCREENS.death = () => {
  const rec = G.lineage[G.lineage.length - 1];
  if (!rec) return SCREENS.title();
  const heirs = heirOptions(G);
  const shares = estateShares(G);
  const ach = rec.achievements.map((id) => ACHIEVEMENTS.find((a) => a.id === id)).filter(Boolean);
  const me = G.people[G.playerId];
  const fact = (ic, k, v) => `<div class="fact">${icon(ic, 30)}<span style="min-width:0"><span class="k">${k}</span><div class="v">${v}</div></span></div>`;
  return `<div class="death scroll">
    <section class="tomb">
      <span class="kick">In loving memory</span>
      <div class="portrait">${me ? personAvatar(me, 140, { frame: 'circle' }) : icon('dove', 80)}<span class="badge">${icon('dove', 28)}</span></div>
      <div class="nm">${esc(rec.name)}</div>
      <div class="yrs">${rec.born} – ${rec.died} · age ${rec.age}</div>
      <div class="muted">Died ${esc(deathPhrase(rec.cause))}</div>
      <div class="ttl">${icon('laurel', 26)}${esc(rec.title)}</div>
      <div class="epi">“${esc(rec.epitaph)}”</div>
    </section>
    <section class="facts" aria-label="Life summary">
      ${fact('piggy', 'Net worth', fmtMoneyShort(rec.worth))}
      ${fact('career', 'Career', esc(rec.job))}
      ${fact('gradcap', 'Education', esc(rec.edu))}
      ${fact('people', 'Children', rec.kids)}
      ${fact('trophy', 'Life goals', rec.goals)}
      ${fact('karma', 'Karma', rec.karma)}
    </section>
    ${ach.length ? `<div class="section-title" style="margin-bottom:0">Achievements this life</div><div class="chips">${ach.map((a) => `<span class="chip">${emo(a.emoji, 18)}${esc(a.name)}</span>`).join('')}</div>` : ''}
    <div class="section-title" style="margin-bottom:0">Continue the family line · generation ${rec.gen + 1}</div>
    ${heirs.length ? heirNote() : ''}
    ${heirs.length ? `<div class="list">${heirs.map((h) => itemRow({
      a: 'heir', ds: { id: h.id }, ico: avatarOf(h, 52), round: true, cls: 'heir-row',
      t: esc(fullName(h)), s: `${kinLabel('child', h)} · age ${ageOf(G, h)}${npcJobTitle(h) ? ' · ' + esc(npcJobTitle(h)) : ''}${heirBadge(h)}`,
      end: shares[h.id] ? `<span class="faint" style="display:block;font-size:0.8em">Inherits</span>${fmtMoneyShort(shares[h.id])}` : '', chev: true,
    })).join('')}</div>` : '<div class="note">No living children to continue as.</div>'}
    <div class="title-actions" style="margin-top:6px">
      <button class="btn primary block" data-a="newRandom">${icon('dice', 26)}Start a new life</button>
      ${rewindDepth(G) ? `<button class="btn block" data-a="rewind" data-n="1">${icon('hourglass', 26)}Time machine: back one year</button>` : ''}
      <button class="btn ghost block" data-a="toTitle">Main menu</button>
    </div>
  </div>`;
};
CLICK.heir = (el, ds) => {
  if (!continueAs(G, ds.id)) return;
  UI.screen = 'game';
  UI.logAll = false;
  closeSheets();
  UI.scrollLog = true;
  refresh();
  toast('Generation ' + G.gen);
};
CLICK.rewind = (el, ds) => {
  const back = rewindState(G, Number(ds.n) || 1);
  if (!back) return toast('Nothing to rewind.');
  // A death that never happened shouldn't stay in the Hall of Lives.
  const g0 = META.graveyard[0];
  if (G.dead && g0 && g0.lifeId === back.id && g0.died > back.year) { META.graveyard.shift(); saveMetaSoon(); }
  G = back;
  G.dead = false;
  UI.screen = 'game';
  closeSheets();
  UI.scrollLog = true;
  refresh();
  toast('⏪ Rewound to age ' + A(G));
};
CLICK.toTitle = async () => {
  await saveNow();
  await refreshSaveIndex();
  G = null;
  UI.screen = 'title';
  closeSheets();
  refresh();
};
