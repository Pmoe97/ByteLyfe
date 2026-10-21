/* =====================================================================
 * 41-sports.js — sports depth: six team sports with fictional leagues,
 * seasons, standings, playoffs, stat lines, awards and championships;
 * contracts, free agency and trades; fighter rankings, training camps and
 * title belts; a racing career from karting to the top series; coaching
 * and front-office careers; and championship seasons for a franchise you
 * own (the 'sportsteam' business industry). Sports events are at the bottom.
 *
 * s.leagues = { sport: { teams: [{ name, rating, w, l, titles }], champ, year } }
 *   One league per sport, shared by the whole family line.
 * M(s).sp (created when a sports career starts) = { sport, team, years (left on the
 *   contract), seasons: [Season], totals: { sport: { stat: n } }, titles, mvps, allstars,
 *   moves, fighter: { cls, rank (0 = unranked), w, l, ko, belt, defenses, camp },
 *   racer: { team, wins, podiums, titles } }
 * sportsTick runs after financeTick (sponsor money goes straight to this year's finances).
 * ===================================================================== */

const nz = () => randFloat(0.75, 1.25);
const round1 = (x) => Math.round(x * 10) / 10;
const n0 = (x) => Math.round(x || 0).toLocaleString('en-US');
// season(r, m): a season's stat line for a player rated r (0-100) who plays share m of the minutes.
const SPORTS = {
  soccer: {
    name: 'Soccer', emoji: '⚽', league: 'Continental Soccer League', games: 38,
    season: (r, m) => { const goals = Math.round(38 * m * Math.pow(r / 100, 2) * 0.75 * nz()); const assists = Math.round(goals * randFloat(0.4, 1)); return { line: `${goals} goals and ${assists} assists`, add: { goals, assists } }; },
    career: (t) => `${n0(t.goals)} goals, ${n0(t.assists)} assists`,
  },
  basketball: {
    name: 'Basketball', emoji: '🏀', league: 'Pro Basketball Association', games: 82,
    season: (r, m) => { const gp = Math.round(82 * clamp(m + 0.1, 0.2, 1)); const ppg = round1(m * (6 + r * 0.24) * nz()), rpg = round1(m * (2 + r * 0.06) * nz()), apg = round1(m * (1 + r * 0.05) * nz()); return { line: `${ppg} points, ${rpg} rebounds and ${apg} assists a game`, add: { points: Math.round(ppg * gp), games: gp } }; },
    career: (t) => `${n0(t.points)} points in ${n0(t.games)} games`,
  },
  football: {
    name: 'American Football', emoji: '🏈', league: 'National Gridiron League', games: 17,
    season: (r, m) => { const yards = Math.round(17 * m * (20 + r * 1.1) * nz()); const tds = Math.round(yards / randFloat(90, 140)); return { line: `${n0(yards)} yards and ${tds} touchdowns`, add: { yards, touchdowns: tds } }; },
    career: (t) => `${n0(t.yards)} yards, ${n0(t.touchdowns)} touchdowns`,
  },
  baseball: {
    name: 'Baseball', emoji: '⚾', league: 'Diamond Baseball League', games: 162,
    season: (r, m) => { const avg = clamp(0.18 + r * 0.0016 + gauss(0, 0.02), 0.15, 0.38); const hr = Math.round(162 * m * Math.pow(r / 100, 2.5) * 0.25 * nz()); return { line: `a ${avg.toFixed(3).replace(/^0/, '')} batting average and ${hr} home runs`, add: { homeRuns: hr } }; },
    career: (t) => `${n0(t.homeRuns)} home runs`,
  },
  hockey: {
    name: 'Hockey', emoji: '🏒', league: 'North Ice Hockey League', games: 82,
    season: (r, m) => { const goals = Math.round(82 * m * Math.pow(r / 100, 2) * 0.45 * nz()); const assists = Math.round(goals * randFloat(0.8, 1.6)); return { line: `${goals} goals and ${assists} assists`, add: { goals, assists } }; },
    career: (t) => `${n0(t.goals)} goals, ${n0(t.assists)} assists`,
  },
  cricket: {
    name: 'Cricket', emoji: '🏏', league: 'Super Cricket League', games: 14,
    season: (r, m) => { const runs = Math.round(14 * m * (10 + r * 0.45) * nz()); const wickets = Math.round(14 * m * (r / 100) * 1.3 * nz()); return { line: `${runs} runs and ${wickets} wickets`, add: { runs, wickets } }; },
    career: (t) => `${n0(t.runs)} runs, ${n0(t.wickets)} wickets`,
  },
};
const SPORT_IDS = Object.keys(SPORTS);
const MASCOTS = ['Comets', 'Titans', 'Wolves', 'Royals', 'Storm', 'Rangers', 'Falcons', 'Pirates', 'Bulls', 'Dragons', 'Hornets', 'Blaze', 'Kings', 'Sharks', 'Phantoms', 'Monarchs'];
const EXTRA_CITIES = ['Northfield', 'Bay City', 'Riverside', 'Lakeside', 'Westport', 'Eastvale', 'Kingsbridge', 'Pine Hollow', 'Stonegate', 'Clearwater', 'Ridgeview', 'Port Ellis'];
const MINUTES = [0.15, 0.4, 0.8, 0.95, 1]; // share of playing time by athlete level
const WEIGHT_CLASSES = ['Flyweight', 'Bantamweight', 'Featherweight', 'Lightweight', 'Welterweight', 'Middleweight', 'Light Heavyweight', 'Heavyweight'];
const NICKNAMES = ['The Hammer', 'Iceman', 'Bulldozer', 'The Ghost', 'Lightning', 'Mad Dog', 'The Professor', 'Viper', 'Rocket', 'The Butcher', 'Smooth', 'Tank'];
const RACE_SERIES = ['Karting Championship', 'Junior Formula', 'Formula Two', 'Grand Prix World Series', 'Grand Prix World Series'];
const RACE_TEAMS = [{ name: 'Vortex Racing', car: 92 }, { name: 'Apex GP', car: 87 }, { name: 'Kestrel Motorsport', car: 81 }, { name: 'Halcyon Racing', car: 75 }, { name: 'Redline Works', car: 69 }, { name: 'Novak Racing', car: 63 }, { name: 'Blue Comet GP', car: 57 }, { name: 'Iron Horse Racing', car: 51 }];
const POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
const SPONSORS = ['Volt Energy', 'Stride Footwear', 'Peak Hydration', 'Nimbus Watches', 'Torque Motor Oil', 'Fresh Fuel Bars'];

/* ---- state -------------------------------------------------------------- */
function spState(s) { return M(s).sp || (M(s).sp = { sport: '', team: '', years: 0, seasons: [], totals: {}, titles: 0, mvps: 0, allstars: 0, moves: 0, fighter: null, racer: null }); }
function leagueOf(s, sport) {
  const L = s.leagues || (s.leagues = {});
  if (!L[sport]) {
    const cities = [...new Set(country(s).cities.concat(EXTRA_CITIES))].slice(0, 12);
    const mascots = MASCOTS.slice().sort(() => rand() - 0.5);
    L[sport] = { teams: cities.map((c, i) => ({ name: `${c} ${mascots[i]}`, rating: randInt(35, 75), w: 0, l: 0, titles: 0 })), champ: '', year: 0 };
  }
  return L[sport];
}
function teamOf(s) { const sp = M(s).sp; return sp && sp.sport ? leagueOf(s, sp.sport).teams.find((t) => t.name === sp.team) || null : null; }
function playerRating(s) {
  const c = M(s).career, j = JOBS[c.id];
  return clamp(skill(s, j.skill) * 0.6 + skill(s, 'fitness') * 0.25 + c.perf * 0.2 + P(s).stats.health / 20 - 5 - Math.max(0, A(s) - 30) * 2 + gauss(0, 6), 0, 100);
}
function setLevel(s, lvl) { const c = M(s).career; c.level = lvl; c.levelYears = 0; c.salary = salaryFor(s, c.id, lvl); }

// Called right after a sports job starts (15-career.js specialApply).
function startSportsCareer(s, id) {
  const sp = spState(s);
  if (id === 'fighter') { if (!sp.fighter) sp.fighter = { cls: pick(WEIGHT_CLASSES), rank: 0, w: 0, l: 0, ko: 0, belt: false, defenses: 0, camp: 0 }; return; }
  if (id === 'racer') { if (!sp.racer) sp.racer = { team: pick(RACE_TEAMS.slice(4)).name, wins: 0, podiums: 0, titles: 0 }; return; }
  if (!['athlete', 'coach', 'gm'].includes(id)) return;
  popup(s, {
    emoji: '🏟️', title: id === 'athlete' ? 'Pick your sport' : 'Which sport?', handler: 'spSport', ctx: { id },
    choices: SPORT_IDS.map((k) => ({ label: `${SPORTS[k].emoji} ${SPORTS[k].name}`, value: k, sub: SPORTS[k].league })),
  });
}
onChoice('spSport', (s, ctx, k) => (SPORTS[k] && M(s).career ? joinTeam(s, k, ctx.id) : undefined));
// New careers start with one of the league's weaker teams.
function joinTeam(s, k, id) {
  const sp = spState(s), lg = leagueOf(s, k);
  const team = pick(lg.teams.slice().sort((a, b) => a.rating - b.rating).slice(0, 6));
  Object.assign(sp, { sport: k, team: team.name, years: randInt(2, 4), moves: 0 });
  return { text: `${id === 'athlete' ? 'You signed with' : 'You joined the staff of'} the ${team.name} of the ${SPORTS[k].league}.`, emoji: SPORTS[k].emoji, tone: 'good' };
}

/* ---- a season in the league ------------------------------------------------ */
function playSeason(s, sport, mine, boost) {
  const lg = leagueOf(s, sport), G = SPORTS[sport].games;
  const eff = (t) => t.rating + (t.name === mine ? boost : 0);
  for (const t of lg.teams) {
    t.rating = Math.round(clamp(t.rating + gauss(0, 4) + (50 - t.rating) * 0.08, 20, 90));
    const pct = clamp(1 / (1 + Math.exp(-(eff(t) - 52) / 9)) + gauss(0, 0.06), 0.05, 0.95);
    t.w = Math.round(G * pct);
    t.l = G - t.w;
  }
  const table = lg.teams.slice().sort((a, b) => b.w - a.w);
  const champ = weighted(table.slice(0, 4), (t) => Math.pow(Math.max(5, eff(t)), 4));
  champ.titles++;
  lg.champ = champ.name;
  lg.year = s.year;
  return { table, champ, me: lg.teams.find((t) => t.name === mine) || null };
}

function athleteSeason(s) {
  const c = M(s).career, sp = spState(s);
  if (!sp.sport || !teamOf(s)) joinTeam(s, pick(SPORT_IDS), 'athlete');
  const S = SPORTS[sp.sport], r = playerRating(s), m = MINUTES[c.level] || 1;
  const st = S.season(r, m);
  const res = playSeason(s, sp.sport, sp.team, (r - 50) * m * 0.22);
  const t = res.me, place = res.table.indexOf(t) + 1;
  const tot = sp.totals[sp.sport] || (sp.totals[sp.sport] = {});
  for (const k in st.add) tot[k] = (tot[k] || 0) + st.add[k];
  const awards = [];
  if (!sp.seasons.length && r >= 55) awards.push('Rookie of the Year');
  if (r >= 70 && m >= 0.8) { awards.push('All-Star'); sp.allstars++; tally(s, 'allStars'); }
  if (r >= 82 && c.level >= 3 && chance(0.35)) { awards.push('MVP'); sp.mvps++; tally(s, 'mvps'); add(s, { fame: 6 }); }
  const champ = res.champ === t;
  if (champ) { sp.titles++; tally(s, 'championships'); add(s, { fame: 8, happy: 15 }); }
  c.perf = clamp100(c.perf + (r - 60) / 4);
  sp.seasons.push({ y: s.year, sport: sp.sport, team: sp.team, w: t.w, l: t.l, place, line: st.line, champ, awards });
  while (sp.seasons.length > 30) sp.seasons.shift();
  log(s, `${S.emoji} The ${sp.team} went ${t.w}-${t.l}, ${ordinal(place)} in the ${S.league}. You had ${st.line}.${awards.length ? ' ' + listJoin(awards) + '!' : ''}`, champ ? 'good' : '');
  if (champ) announce(s, { emoji: '🏆', title: 'Champions!', text: `The ${sp.team} won the ${S.league} championship${awards.includes('MVP') ? ', and you were named MVP' : ''}!`, tone: 'good', log: '🏆 League champions!' });
  else if (awards.includes('MVP')) announce(s, { emoji: '🏅', title: 'MVP', text: `You were named the ${S.league}'s Most Valuable Player.`, tone: 'good', log: '🏅 Named league MVP.' });
  sp.years--;
  if (sp.years <= 0) freeAgency(s);
}
function freeAgency(s) {
  const c = M(s).career, sp = spState(s), lg = leagueOf(s, sp.sport), r = playerRating(s);
  const base = salaryFor(s, c.id, c.level);
  const teams = [teamOf(s)].concat(lg.teams.filter((t) => t.name !== sp.team).sort(() => rand() - 0.5).slice(0, 2)).filter(Boolean);
  const offers = teams.map((t) => ({ team: t.name, salary: nicePrice(base * randFloat(0.8, 1.4) * (0.6 + r / 100)), years: randInt(2, 5), contender: t.rating >= 62 }));
  popup(s, {
    emoji: '✍️', title: 'Free agency', text: 'Your contract is up. Where will you play next?', handler: 'spFA', ctx: { offers },
    choices: offers.map((o, i) => ({ label: i === 0 ? `Re-sign with the ${o.team}` : `Sign with the ${o.team}`, value: i, sub: `${fmtMoney(o.salary)}/yr for ${o.years} years${o.contender ? ' · a contender' : ''}` })),
  });
}
onChoice('spFA', (s, ctx, i) => {
  const o = ctx.offers && ctx.offers[i], c = M(s).career;
  if (!o || !c || c.id !== 'athlete') return;
  const sp = spState(s), moved = sp.team !== o.team;
  Object.assign(sp, { team: o.team, years: o.years });
  c.salary = o.salary;
  return { text: `${moved ? `You signed with the ${o.team}` : `You re-signed with the ${o.team}`}: ${fmtMoney(o.salary)} a year for ${o.years} years.`, emoji: '✍️', tone: 'good' };
});
defAction({
  id: 'sp_trade', cat: 'job', label: 'Request a trade', emoji: '🔁', desc: 'Ask to play somewhere else.',
  when: (s) => hasCareer(s) && M(s).career.id === 'athlete' && !!teamOf(s),
  run: (s) => {
    if (bump(s, 'sp_trade') > 1) return { text: 'The front office already heard you this year.', nolog: true };
    const sp = spState(s);
    if (!chance(0.5)) { M(s).career.perf = clamp100(M(s).career.perf - 5); return { text: `The ${sp.team} refused. The locker room is awkward now.`, tone: 'bad', emoji: '🔁' }; }
    const to = pick(leagueOf(s, sp.sport).teams.filter((t) => t.name !== sp.team));
    sp.team = to.name;
    sp.years = randInt(1, 3);
    return { text: `You got your wish. You were traded to the ${to.name}.`, emoji: '🔁' };
  },
});

/* ---- fighting ---------------------------------------------------------------- */
function fighter(s) { const sp = spState(s); return sp.fighter || (sp.fighter = { cls: pick(WEIGHT_CLASSES), rank: 0, w: 0, l: 0, ko: 0, belt: false, defenses: 0, camp: 0 }); }
function fighterName(s) { const cc = pick(COUNTRY_IDS), g = P(s).gender === 'x' ? (chance(0.5) ? 'm' : 'f') : P(s).gender; return `${randomFirst(cc, g)} "${pick(NICKNAMES)}" ${randomLast(cc)}`; }
function recordLine(f) { return `${f.w}-${f.l} (${f.ko} KOs)`; }
defAction({
  id: 'sp_camp', cat: 'job', label: 'Go to a training camp', emoji: '⛺',
  sub: (s) => { const f = fighter(s); return f.camp ? `Camp sharpness +${f.camp}` : 'Get sharp before your next fight.'; },
  when: (s) => hasCareer(s) && M(s).career.id === 'fighter',
  run: (s) => {
    if (bump(s, 'sp_camp') > 2) return { text: 'Your body needs a break from camp.', nolog: true };
    const alt = price(s, 15000), tech = price(s, 25000);
    popup(s, { emoji: '⛺', title: 'Training camp', text: 'Camp sharpness carries into your next fight.', handler: 'spCamp', choices: [{ label: 'Altitude camp in the mountains', value: 'alt', sub: `${fmtMoney(alt)} · cardio`, disabled: M(s).money < alt }, { label: 'Elite technique camp', value: 'tech', sub: `${fmtMoney(tech)} · skills`, disabled: M(s).money < tech }, { label: 'Train at your home gym', value: 'home', sub: 'Free' }, { label: 'Skip it', value: null }] });
  },
});
onChoice('spCamp', (s, ctx, v) => {
  if (!v || !M(s).career || M(s).career.id !== 'fighter') return;
  const f = fighter(s);
  if (v === 'alt') { const c = price(s, 15000); if (!pay(s, c)) return cantAfford(c); addSkill(s, 'fitness', 3); f.camp = Math.min(2, f.camp + 1); return 'Two months at altitude. You can run for days now.'; }
  if (v === 'tech') { const c = price(s, 25000); if (!pay(s, c)) return cantAfford(c); addSkill(s, 'martial', 3); f.camp = Math.min(2, f.camp + 1); return 'You sharpened your striking and your ground game with world-class coaches.'; }
  f.camp = Math.min(2, f.camp + 0.5);
  addSkill(s, 'martial', 1);
  return 'Same gym, same coach, same grind. It helps.';
});
defAction({
  id: 'sp_fight', cat: 'job', emoji: '🥊',
  label: (s) => { const f = fighter(s); return f.belt ? 'Defend your title' : f.rank === 1 ? 'Fight for the title' : 'Take a fight'; },
  sub: (s) => { const f = fighter(s); return `${f.belt ? '🏆 Champion' : f.rank ? `Ranked #${f.rank}` : 'Unranked'} ${f.cls} · ${recordLine(f)}`; },
  when: (s) => hasCareer(s) && M(s).career.id === 'fighter',
  run: (s) => {
    if (bump(s, 'fight') > 3) return { text: 'Your manager says you need to rest.', nolog: true };
    const c = M(s).career, f = fighter(s), opp = fighterName(s);
    const title = f.belt || f.rank === 1;
    const oppRank = f.belt ? randInt(1, 3) : f.rank === 1 ? 0 : f.rank ? clamp(f.rank - randInt(-1, 3), 1, 15) : 99;
    // The champion and the top contenders are far tougher than anyone on the way up.
    const them = oppRank === 0 ? 144 + randInt(0, 18) : oppRank === 99 ? randInt(60, 95) : 92 + (16 - oppRank) * 2.5 + (f.belt ? 5 : 0);
    const me = skill(s, 'martial') + skill(s, 'fitness') / 2 + P(s).stats.health / 4 + f.camp * 6 - Math.max(0, A(s) - 30) * 3 + gauss(0, 15);
    const purse = price(s, (title ? 1500000 : f.rank ? 30000 + (16 - f.rank) * 25000 : 8000) * randFloat(0.8, 1.2));
    f.camp = 0;
    tally(s, 'fights');
    const vs = oppRank === 0 ? `the champion, ${opp}` : oppRank === 99 ? opp : `#${oppRank} ${opp}`;
    if (me > them) {
      f.w++;
      const ko = chance(0.45);
      if (ko) f.ko++;
      tally(s, 'fightWins');
      add(s, { money: purse, fame: randInt(2, 6) + (title ? 6 : 0), happy: 6, health: -randInt(1, 6) });
      const how = ko ? pick(['knockout', 'TKO']) : pick(['decision', 'submission']);
      if (f.belt) { f.defenses++; return { text: `You beat ${vs} by ${how} and kept your belt. Defense #${f.defenses}. Purse: ${fmtMoney(purse)}.`, tone: 'good', emoji: '🏆' }; }
      if (title) {
        f.belt = true; f.rank = 0;
        tally(s, 'beltWon');
        if (c.level < 3) setLevel(s, 3);
        announce(s, { emoji: '🏆', title: 'World Champion', text: `You beat ${vs} by ${how}. You are the ${f.cls} champion of the world! Purse: ${fmtMoney(purse)}.`, tone: 'good' });
        return;
      }
      f.rank = f.rank ? Math.max(1, Math.min(f.rank, oppRank) - randInt(1, 3)) : f.w >= 4 ? randInt(12, 15) : 0;
      if (c.level === 0 && f.w >= 3) promote(s, 'Three wins in, you turned pro.');
      if (f.rank && c.level === 1) promote(s, 'You broke into the rankings.');
      return { text: `You beat ${vs} by ${how}! Purse: ${fmtMoney(purse)}.${f.rank ? ` You're now ranked #${f.rank}.` : ''}`, tone: 'good', emoji: '🥊' };
    }
    f.l++;
    add(s, { money: Math.round(purse * 0.4), happy: -6, health: -randInt(4, 12) });
    if (chance(0.15)) getSick(s, 'concussion');
    if (f.belt) { f.belt = false; f.rank = randInt(2, 5); setLevel(s, 2); return { text: `${opp} took your belt. You're ranked #${f.rank} now.`, tone: 'bad', emoji: '🥊' }; }
    if (f.rank) { f.rank += randInt(2, 5); if (f.rank > 15) { f.rank = 0; if (c.level === 2) setLevel(s, 1); return { text: `You lost to ${vs} and dropped out of the rankings.`, tone: 'bad', emoji: '🥊' }; } }
    return { text: `You lost to ${vs}.${f.rank ? ` You slipped to #${f.rank}.` : ''}`, tone: 'bad', emoji: '🥊' };
  },
});

/* ---- racing --------------------------------------------------------------------- */
function racer(s) { const sp = spState(s); return sp.racer || (sp.racer = { team: pick(RACE_TEAMS.slice(4)).name, wins: 0, podiums: 0, titles: 0 }); }
function racerSeason(s) {
  const c = M(s).career, sp = spState(s), rc = racer(s), lvl = Math.min(c.level, 3);
  const team = RACE_TEAMS.find((t) => t.name === rc.team) || RACE_TEAMS[7];
  const me = playerRating(s), races = [10, 12, 14, 20, 20][c.level] || 20;
  const rivals = Array.from({ length: 19 }, () => ({ sk: gauss(58 + lvl * 6, 9), car: randInt(45, 92), pts: 0 }));
  let pts = 0, wins = 0, pods = 0, crash = false;
  for (let i = 0; i < races; i++) {
    let mine = me * 0.6 + team.car * 0.4 + gauss(0, 10);
    if (chance(0.05)) { mine = -999; if (chance(0.25)) crash = true; }
    const grid = rivals.map((x) => ({ x, sc: x.sk * 0.6 + x.car * 0.4 + gauss(0, 10) })).concat([{ x: null, sc: mine }]).sort((a, b) => b.sc - a.sc);
    grid.forEach((g, pos) => {
      const p = POINTS[pos] || 0;
      if (g.x) g.x.pts += p;
      else if (mine > -999) { pts += p; if (pos === 0) wins++; if (pos < 3) pods++; }
    });
  }
  const standing = 1 + rivals.filter((x) => x.pts > pts).length;
  rc.wins += wins; rc.podiums += pods;
  if (wins) tally(s, 'raceWins', wins);
  const series = RACE_SERIES[c.level];
  sp.seasons.push({ y: s.year, sport: 'racing', team: rc.team, series, wins, pods, place: standing, champ: standing === 1 });
  while (sp.seasons.length > 30) sp.seasons.shift();
  log(s, `🏎️ ${series} with ${rc.team}: ${nOf(wins, 'win')}, ${nOf(pods, 'podium')}, ${ordinal(standing)} in the championship.`, standing === 1 ? 'good' : '');
  c.perf = clamp100(c.perf + (8 - standing));
  if (crash) { add(s, { health: -randInt(8, 20) }); if (chance(0.3)) getSick(s, 'broken_leg'); log(s, '💥 You had a huge crash this season, but walked away.', 'bad'); }
  const fin = M(s).lastFinance && M(s).lastFinance.year === s.year ? M(s).lastFinance : null;
  if (pods) { const amt = price(s, 15000 * (c.level + 1) * pods); M(s).money += amt; if (fin) fin.inc.push(['Sponsor bonuses', amt]); }
  if (standing === 1) {
    rc.titles++;
    tally(s, 'raceTitles');
    if (c.level === 3) { tally(s, 'worldTitles'); promote(s, `You won the ${series}.`); }
    else if (c.level === 4) { tally(s, 'worldTitles'); announce(s, { emoji: '🏆', title: 'World Champion again', text: `You won the ${series} again!`, tone: 'good' }); }
    else promote(s, `You won the ${series} and moved up to ${RACE_SERIES[c.level + 1]}.`);
  } else if (standing <= 3 && c.level < 3 && chance(0.6)) promote(s, `A top-3 finish earned you a seat in ${RACE_SERIES[c.level + 1]}.`);
  // Fast drivers get poached by faster teams.
  const better = RACE_TEAMS.filter((t) => t.car > team.car);
  if (standing <= 3 && better.length && chance(0.4)) { rc.team = better[better.length - 1].name; log(s, `🏎️ ${rc.team} signed you for next season.`, 'good'); }
}

/* ---- coaching and the front office ------------------------------------------------- */
function staffSeason(s) {
  const c = M(s).career, sp = spState(s), j = JOBS[c.id];
  if (!sp.sport || !teamOf(s)) joinTeam(s, pick(SPORT_IDS), c.id);
  const S = SPORTS[sp.sport];
  const res = playSeason(s, sp.sport, sp.team, skill(s, j.skill) / 12 + c.level * 2 + sp.moves - 4);
  sp.moves = 0;
  const t = res.me, place = res.table.indexOf(t) + 1, pct = t.w / Math.max(1, t.w + t.l), champ = res.champ === t;
  sp.seasons.push({ y: s.year, sport: sp.sport, team: sp.team, w: t.w, l: t.l, place, champ, awards: [], line: j.ladder[c.level][0] });
  while (sp.seasons.length > 30) sp.seasons.shift();
  log(s, `${S.emoji} As ${aAn(careerTitle(s).toLowerCase())}, the ${sp.team} went ${t.w}-${t.l} (${ordinal(place)}).`, champ ? 'good' : '');
  c.perf = clamp100(c.perf + (pct - 0.5) * 30);
  if (champ) { sp.titles++; tally(s, 'coachTitles'); add(s, { fame: 6, happy: 12 }); announce(s, { emoji: '🏆', title: 'Champions!', text: `The ${sp.team} won the ${S.league} championship with you running the show.`, tone: 'good' }); }
  if (c.level < j.ladder.length - 1 && (champ || pct >= 0.6) && chance(0.5)) promote(s, `The ${sp.team}'s success got noticed.`);
  else if (pct < 0.35 && chance(0.4)) fire(s, `After a ${t.w}-${t.l} season, the ${sp.team} let you go.`);
}
defAction({
  id: 'sp_move', cat: 'job', label: 'Make a roster move', emoji: '📋', desc: 'Trades, drafts and game plans.',
  when: (s) => hasCareer(s) && ['coach', 'gm'].includes(M(s).career.id) && !!teamOf(s),
  run: (s) => {
    if (bump(s, 'sp_move') > 1) return { text: 'The roster is set for this year.', nolog: true };
    popup(s, { emoji: '📋', title: 'Roster move', text: `What will the ${spState(s).team} do this year?`, handler: 'spMove', choices: [{ label: 'Trade for a star', value: 'star', sub: 'Big boost, or a big mistake' }, { label: 'Draft and develop young talent', value: 'draft', sub: 'Slow, but it lasts' }, { label: 'Install a new system', value: 'system', sub: 'Could go either way' }, { label: 'Stand pat', value: null }] });
  },
});
onChoice('spMove', (s, ctx, v) => {
  const sp = spState(s), t = teamOf(s);
  if (!v || !t) return;
  if (v === 'star') { if (chance(0.65)) { sp.moves += randInt(6, 12); return 'The new star fit right in.'; } sp.moves -= 5; return { text: 'The star clashed with everyone. It might be a long season.', tone: 'bad' }; }
  if (v === 'draft') { t.rating = Math.min(90, t.rating + 3); sp.moves += 1; return 'Your draft class looks like the real thing. It will pay off for years.'; }
  sp.moves += randInt(-4, 10);
  return 'The new system is installed. The players are still learning it.';
});

/* ---- franchise seasons ------------------------------------------------------------------ */
function franchiseSeason(s, co) {
  const odds = clamp((effQuality(s, co) + co.rep - 90) / 150, 0.02, 0.35);
  if (!chance(odds)) return;
  co.rep = clamp100(co.rep + 10);
  tally(s, 'ownerTitles');
  add(s, { happy: 10, fame: 3 });
  announce(s, { emoji: '🏆', title: co.name, text: `Your team, the ${co.name}, won the championship! Season tickets just sold out for next year.`, tone: 'good' });
}

function sportsTick(s) {
  if (s.dead) return;
  for (const co of companies(s)) if (!co.closed && co.ind === 'sportsteam') franchiseSeason(s, co);
  const c = M(s).career;
  if (!c || inPrison(s)) return;
  if (c.id === 'athlete') athleteSeason(s);
  else if (c.id === 'racer') racerSeason(s);
  else if (c.id === 'coach' || c.id === 'gm') staffSeason(s);
}

/* ---- sports events --------------------------------------------------------------------- */
const athleteNow = (s) => !!M(s).career && JOBS[M(s).career.id].special === 'sports';
EV('sp_endorsement', {
  ages: [16, 45], when: (s) => athleteNow(s) && M(s).career.level >= 2, emoji: '👟', text: () => `${pick(SPONSORS)} wants you as the face of their next campaign.`,
  choices: [
    ['Sign the deal', (s) => { const pay = price(s, randInt(50000, 400000) * (M(s).career.level)); add(s, { money: pay, fame: 3 }); return `You signed for ${fmtMoney(pay)}. Your face is on every bus stop.`; }],
    ['Pass', () => 'You said you only endorse things you actually use.'],
  ],
});
EV('sp_doping', {
  ages: [18, 40], w: 0.5, when: athleteNow, emoji: '💉', text: 'A shady trainer offers you something that "doesn’t show up on tests."',
  choices: [
    ['Take it', (s) => { add(s, { karma: -5 }); if (chance(0.3)) { M(s).career.perf = clamp100(M(s).career.perf - 40); add(s, { fame: -10, happy: -12 }); tally(s, 'doping'); return { text: 'It showed up on the test. You were suspended for a season, and the headlines were brutal.', tone: 'bad' }; } M(s).career.perf = clamp100(M(s).career.perf + 15); return 'You had the best year of your life. You try not to think about why.'; }],
    ['Refuse', (s) => { add(s, { karma: 2 }); return 'You told him where he could put it.'; }],
  ],
});
EV('sp_trash_talk', {
  ages: [18, 40], when: (s) => !!M(s).career && M(s).career.id === 'fighter', emoji: '🎙️', text: (s) => `${fighterName(s)} called you out at a press conference.`,
  choices: [
    ['Fire back', (s) => { add(s, { fame: 4 }); fighter(s).camp = Math.min(2, fighter(s).camp + 0.5); return 'Your comeback went viral. You are fired up for camp.'; }],
    ['Stay quiet', (s) => { add(s, { karma: 1 }); return 'You said you would do your talking in the cage.'; }],
  ],
});
EV('sp_young_fan', {
  ages: [18, 60], w: 0.6, when: (s) => athleteNow(s) && M(s).fame >= 30, emoji: '✍️', text: 'A kid in a homemade jersey waited three hours outside the stadium for you.',
  choices: [
    ['Sign everything and take a photo', (s) => { add(s, { karma: 3, happy: 4 }); return 'The kid cried. You may have, too.'; }],
    ['Wave from the car', (s) => { add(s, { karma: -1 }); return 'Somebody filmed it. It did not look great.'; }],
  ],
});
EV('sp_traded', {
  ages: [18, 40], w: 0.5, when: (s) => !!M(s).career && M(s).career.id === 'athlete' && !!teamOf(s) && spState(s).years >= 2, emoji: '🔁',
  text: (s) => `The ${spState(s).team} traded you in a blockbuster deal.`,
  auto: (s) => { const sp = spState(s); const to = pick(leagueOf(s, sp.sport).teams.filter((t) => t.name !== sp.team)); sp.team = to.name; add(s, { happy: -4 }); return `You're a member of the ${to.name} now.`; },
});
EV('sp_coach_offer', {
  ages: [30, 65], w: 0.8, emoji: '📋',
  when: (s) => !M(s).career && !inPrison(s) && M(s).jobHistory.some((h) => ['athlete', 'fighter', 'racer'].includes(h.id)),
  text: 'A team called. They want a former pro on their coaching staff.',
  choices: [
    ['Take the job', (s) => { if (M(s).retired) M(s).retired = null; hire(s, 'coach', 0); const k = (M(s).sp && SPORTS[M(s).sp.sport]) ? M(s).sp.sport : pick(SPORT_IDS); const r = joinTeam(s, k, 'coach'); return r.text; }],
    ['Stay retired', () => 'You said your coaching days would be in the backyard.'],
  ],
});
EV('sp_hall_of_fame', {
  ages: [38, 120], once: true, emoji: '🏛️',
  when: (s) => !!M(s).sp && !athleteNow(s) && (M(s).sp.titles >= 2 || M(s).sp.mvps >= 1 || M(s).sp.allstars >= 4 || (M(s).sp.fighter && M(s).sp.fighter.defenses >= 2) || (M(s).sp.racer && M(s).sp.racer.titles >= 2)),
  text: 'You were inducted into the Hall of Fame.',
  auto: (s) => { add(s, { fame: 8, happy: 15 }); tally(s, 'hallOfFame'); return 'Your old teammates flew in for the ceremony. There was not a dry eye in the house.'; },
});
