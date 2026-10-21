/* =====================================================================
 * 1011-ui-sports.js — sports on the Work sheet (your team, contract, last
 * season and career numbers; fighter rankings; racing results; coaching
 * records) and the season-by-season history (sheet 'seasons').
 * The engine is 41-sports.js.
 * ===================================================================== */

function seasonLine(x) {
  if (x.sport === 'racing') return `${x.series} · ${esc(x.team)} · ${nOf(x.wins, 'win')}, ${nOf(x.pods, 'podium')} · ${ordinal(x.place)}${x.champ ? ' · 🏆' : ''}`;
  return `${esc(x.team)} · ${x.w}-${x.l} (${ordinal(x.place)})${x.champ ? ' · 🏆' : ''}${x.line && x.awards ? ' · ' + esc(x.line) : ''}${x.awards && x.awards.length ? ' · ' + esc(x.awards.join(', ')) : ''}`;
}
function sportsSection() {
  const c = M(G).career, sp = M(G).sp;
  if (!c || !sp || !['athlete', 'fighter', 'racer', 'coach', 'gm'].includes(c.id)) return '';
  const rows = [];
  if (c.id === 'fighter' && sp.fighter) {
    const f = sp.fighter;
    rows.push(kvRow('Division', esc(f.cls)), kvRow('Ranking', f.belt ? `🏆 World Champion · ${nOf(f.defenses, 'defense')}` : f.rank ? `#${f.rank}` : 'Unranked'), kvRow('Record', recordLine(f)));
  } else if (c.id === 'racer' && sp.racer) {
    const r = sp.racer;
    rows.push(kvRow('Series', RACE_SERIES[c.level]), kvRow('Team', esc(r.team)), kvRow('Career', `${nOf(r.wins, 'win')} · ${nOf(r.podiums, 'podium')} · ${nOf(r.titles, 'title')}`));
  } else if (sp.sport) {
    const S = SPORTS[sp.sport], t = teamOf(G), lg = leagueOf(G, sp.sport);
    rows.push(kvRow('League', `${S.emoji} ${esc(S.league)}`), kvRow('Team', t ? `${esc(t.name)}${t.w + t.l ? ` · ${t.w}-${t.l} last season` : ''}` : '—'));
    if (c.id === 'athlete') rows.push(kvRow('Contract', `${nOf(Math.max(0, sp.years), 'year')} left`), kvRow('Career', esc(S.career(sp.totals[sp.sport] || {}))));
    if (sp.titles || sp.mvps || sp.allstars) rows.push(kvRow('Honors', [sp.titles ? `🏆 ×${sp.titles}` : '', sp.mvps ? `MVP ×${sp.mvps}` : '', sp.allstars ? `All-Star ×${sp.allstars}` : ''].filter(Boolean).join(' · ')));
    if (lg.champ) rows.push(kvRow('Reigning champions', esc(lg.champ)));
  }
  const hist = sp.seasons.length ? itemRow({ a: 'sheet', ds: { k: 'seasons' }, ico: '📊', t: 'Season by season', s: nOf(sp.seasons.length, 'season'), chev: true }) : '';
  return rows.length ? `<div class="section-title">Your sports career</div><div class="card">${rows.join('')}</div>${hist ? `<div class="list" style="margin-top:8px">${hist}</div>` : ''}` : '';
}
SHEETS.seasons = () => {
  const sp = M(G).sp, list = sp ? sp.seasons.slice().reverse() : [];
  return { title: 'Season by season', html: listOf(list.map((x) => itemRow({ ico: x.sport === 'racing' ? '🏎️' : SPORTS[x.sport] ? SPORTS[x.sport].emoji : '🏟️', t: String(x.y), s: seasonLine(x) })).join(''), 'No seasons yet.') };
};
