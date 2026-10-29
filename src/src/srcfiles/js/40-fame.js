/* =====================================================================
 * 40-fame.js — show business: named works (albums, books, comedy specials,
 * films you direct, records you produce, film roles, modeling campaigns)
 * with critics, charts and box office; genres and yearly trends; agents;
 * record deals, publishers, networks and studios, or your own record label
 * or film studio from the business engine; award seasons; back-catalog
 * royalties; talk shows; and the press. Fame events are at the bottom.
 *
 * M(s).sb (created on first use) = { works: [Work], agent (tier 0-3), agency,
 *   deal: { kind: 'major'|'indie', name, left, type } | null, mastery: { genre: n }, awards, shows: [] }
 * Work = { id, kind, title, year, genre, q, score (critics), c (commercial pull),
 *          peak (chart position), rev (gross), share (your cut of it), awards, via }
 * s.trends = { year, music|book|film: { genre: multiplier } }   rolled once a year.
 * showbizTick runs after financeTick: royalties go straight to this year's finances.
 * ===================================================================== */

const GENRES = {
  music: ['Pop', 'Rock', 'Hip-hop', 'Country', 'Electronic', 'R&B', 'Indie', 'Jazz', 'Metal', 'Latin'],
  book: ['Thriller', 'Romance', 'Fantasy', 'Sci-fi', 'Literary', 'Mystery', 'Horror', 'Memoir', 'Self-help', "Children's"],
  film: ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-fi', 'Romance', 'Animated', 'Documentary', 'Thriller'],
};
// job: the career that makes it. base: US-baseline gross for an average release.
// budgets: what a shoestring / solid / big-budget production costs (none = you're paid a fee).
const WORK_KINDS = {
  album: { job: 'musician', noun: 'album', emoji: '💿', base: 400000, genres: 'music', deal: 'music', budgets: [5000, 40000, 250000], award: ['the Golden Record Awards', 'Album of the Year'] },
  book: { job: 'author', noun: 'book', emoji: '📖', base: 160000, genres: 'book', deal: 'book', budgets: [1000, 10000, 60000], award: ['the Laurel Prize', 'Book of the Year'] },
  special: { job: 'comedian', noun: 'comedy special', emoji: '🎙️', base: 260000, genres: null, deal: 'comedy', budgets: [5000, 50000, 300000], award: ['the Laughter Awards', 'Best Comedy Special'] },
  film: { job: 'director', noun: 'film', emoji: '🎥', base: 900000, genres: 'film', deal: 'film', budgets: [50000, 1000000, 20000000], award: ['the Silver Reel Awards', 'Best Director'] },
  role: { job: 'actor', noun: 'role', emoji: '🎬', base: 300000, genres: 'film', award: ['the Silver Reel Awards', 'Best Performance'] },
  record: { job: 'producer', noun: 'record', emoji: '🎚️', base: 200000, genres: 'music', award: ['the Golden Record Awards', 'Producer of the Year'] },
  campaign: { job: 'model', noun: 'campaign', emoji: '📸', base: 150000, genres: null, award: ['the Style Awards', 'Campaign of the Year'] },
};
const KIND_OF_JOB = { musician: 'album', author: 'book', comedian: 'special', director: 'film', actor: 'role', producer: 'record', model: 'campaign' };
const BUDGET_NAMES = ['Shoestring', 'Solid', 'Big-budget'];
const DEAL_NAMES = {
  music: { major: ['Crown Records', 'Echo Peak Music', 'Silverline Records'], indie: ['Basement Tapes', 'Lantern Recordings', 'Low Tide Records'], noun: 'record deal', who: 'label' },
  book: { major: ['Harbor & Finch', 'Bellwether Books', 'Quill House'], indie: ['Small Hours Press', 'Paper Lantern Press'], noun: 'book deal', who: 'publisher' },
  comedy: { major: ['StreamBox', 'Nightcap Network', 'LaughTrack+'], indie: ['Open Mic Media', 'Corner Booth Comedy'], noun: 'streaming deal', who: 'network' },
  film: { major: ['Polaris Pictures', 'Meridian Studios', 'Red Kite Films'], indie: ['Lone Pine Pictures', 'Basement Films'], noun: 'studio deal', who: 'studio' },
};
// reach: how many people hear about it. share: your royalty. q: production polish.
const DEAL_TERMS = { major: { reach: 1.6, share: 0.15, q: 4, advance: 60000 }, indie: { reach: 1.05, share: 0.45, q: 1, advance: 12000 }, self: { reach: 0.6, share: 0.85, q: 0, advance: 0 } };
const AGENTS = [null, { name: 'A hungry young agent', cut: 0.1, reach: 1.15, odds: 0.05, fame: 0 }, { name: 'An established agency', cut: 0.15, reach: 1.35, odds: 0.1, fame: 25 }, { name: 'A powerhouse agency', cut: 0.2, reach: 1.7, odds: 0.15, fame: 50 }];
const AGENCY_NAMES = ['Bright Lights Talent', 'Apex Artists', 'North Star Management', 'Velvet Rope Agency', 'Summit Talent Group'];
const TITLE_WORDS = {
  album: [['Neon', 'Paper', 'Golden', 'Midnight', 'Velvet', 'Broken', 'Electric', 'Quiet', 'Wild', 'Satellite'], ['Hearts', 'Skies', 'Highway', 'Summer', 'Echoes', 'Gravity', 'Daydreams', 'Rooms', 'Static', 'Fireworks']],
  book: [['The Salt', 'A House of', 'The Last', 'The Glass', 'Every', 'The Winter', 'The Silent', 'All the', 'The Lost', 'The Paper'], ['Orchard', 'Rain', 'Lighthouse', 'Garden', 'Promise', 'Kingdom', 'Hours', 'Daughters', 'Letters', 'Shore']],
  special: [['Unfiltered', 'Not My Best', 'Live and', 'Totally', 'Barely', 'Still', 'Mostly', 'Honestly'], ['Self', 'Awkward', 'Unhinged', 'Fine', 'Employed', 'Here', 'Harmless', 'Sorry']],
  film: [['Midnight', 'The Last', 'Silent', 'Iron', 'Crimson', 'Endless', 'Paper', 'Northern'], ['Protocol', 'Lighthouse', 'Witness', 'Harbor', 'Frontier', 'Summer', 'Signal', 'Kingdom']],
};
const BRANDS = ['Lumière', 'Vantage', 'Maison Arlo', 'Kestrel', 'Odette', 'Northwind', 'Saffron & Sage', 'Atelier Nine'];
const ARTISTS = ['Juniper Vale', 'DJ Halcyon', 'The Paper Moons', 'Nova Reyes', 'Lil Satellite', 'Marlowe Grey', 'The Night Owls', 'Kai Sterling', 'Rosa Montclair', 'Echo & the Static'];
const STARS = ['Vivian Holt', 'Dex Calloway', 'Mira Santos', 'Jonah Pierce', 'Leila Hart', 'Tobias Wren', 'Sasha Quinn', 'Rafael Moreau'];
const HOSTS = ['Late Night with Danny Reyes', 'The Morning Couch', 'Tonight with Priya Shah', 'The Midnight Hour', 'Weekend Live with Bo Carter'];

/* ---- state ------------------------------------------------------------- */
function sb(s) { return M(s).sb || (M(s).sb = { works: [], agent: 0, agency: '', deal: null, mastery: {}, awards: 0, shows: [] }); }
function fameJob(s) { const c = M(s).career; return c && KIND_OF_JOB[c.id] ? c : null; }
function workKind(s) { const c = fameJob(s); return c ? KIND_OF_JOB[c.id] : null; }
function workTitle(kind) { const w = TITLE_WORDS[kind] || TITLE_WORDS.album; return pick(w[0]) + ' ' + pick(w[1]); }
function cleanTitle(v) { return String(v || '').replace(/[<>{}\[\]"]/g, '').trim().slice(0, 40); }
// Genre popularity drifts every year.
function trendsFor(s) {
  if (!s.trends || s.trends.year !== s.year) {
    const old = s.trends, t = { year: s.year };
    for (const g in GENRES) {
      t[g] = {};
      for (const x of GENRES[g]) { const prev = old && old[g] && old[g][x]; t[g][x] = Math.round((prev ? prev * 0.6 + randFloat(0.6, 1.5) * 0.4 : randFloat(0.7, 1.4)) * 100) / 100; }
    }
    s.trends = t;
  }
  return s.trends;
}
function trendWord(m) { return m >= 1.25 ? '🔥 hot right now' : m <= 0.8 ? 'cooling off' : 'steady'; }
// A record label you own can release music; a film studio you own can release films.
function ownOutlet(s, kind) {
  const ind = ['album', 'record'].includes(kind) ? 'label' : kind === 'film' ? 'film' : null;
  return ind ? companies(s).find((c) => !c.closed && c.ind === ind && c.ceo === 'you') || null : null;
}

/* ---- making things ---------------------------------------------------------- */
const MAKE_LABELS = { album: 'Record an album', book: 'Write a book', special: 'Film a comedy special', film: 'Direct a film', role: 'Audition for a role', record: 'Produce a record', campaign: 'Book a campaign' };
defAction({
  id: 'sb_make', cat: 'job', emoji: '🌟',
  label: (s) => MAKE_LABELS[workKind(s)],
  sub: (s) => { const w = M(s).sb && M(s).sb.works.filter((x) => x.kind === workKind(s)).slice(-1)[0]; return w ? `Latest: “${w.title}” · ${w.score}/100` : 'Make your name with your first one.'; },
  when: (s) => hasCareer(s) && !!fameJob(s) && free(s),
  run: (s) => {
    if (bump(s, 'bigbreak') > 2) return { text: "You've put out all you can this year. Try again next year.", nolog: true };
    const k = workKind(s), K = WORK_KINDS[k];
    if (k === 'role') { fameOffersPopup(s, k, 'sbRole', 'Casting calls', 'Your agent sent over two scripts.', [0, 1].map(() => ({ title: workTitle('film'), genre: pick(GENRES.film), series: chance(0.35), prestige: Math.round(randFloat(0.8, 1.6) * 100) / 100 }))); return; }
    if (k === 'campaign') { fameOffersPopup(s, k, 'sbCampaign', 'Bookings', 'Two brands want you.', BRANDS.slice().sort(() => rand() - 0.5).slice(0, 2).map((b) => ({ title: `${b} ${pick(['Spring', 'Fall', 'Holiday', 'Resort'])} campaign`, genre: '', prestige: Math.round(randFloat(0.8, 1.6) * 100) / 100 }))); return; }
    if (k === 'record') { fameOffersPopup(s, k, 'sbRecord', 'Studio sessions', 'Two artists want you behind the board.', ARTISTS.slice().sort(() => rand() - 0.5).slice(0, 2).map((a) => ({ title: `${workTitle('album')} by ${a}`, genre: pick(GENRES.music), prestige: Math.round(randFloat(0.8, 1.6) * 100) / 100 }))); return; }
    if (!K.genres) { budgetPopup(s, { k, genre: '' }); return; }
    const tr = trendsFor(s)[K.genres], st = sb(s);
    popup(s, {
      emoji: K.emoji, title: cap(K.noun), text: `What kind of ${K.noun}? Trends change every year, and sticking with a genre makes you better at it.`, handler: 'sbGenre', ctx: { k },
      choices: GENRES[K.genres].map((g) => ({ label: g, value: g, sub: `${trendWord(tr[g])}${st.mastery[g] ? ` · you've made ${nOf(st.mastery[g], 'of these', 'of these')}` : ''}` })).concat([{ label: 'Never mind', value: null }]),
    });
  },
});
function fameOffersPopup(s, k, handler, title, text, offers) {
  popup(s, { emoji: WORK_KINDS[k].emoji, title, text, handler, ctx: { offers }, choices: offers.map((o, i) => ({ label: `“${o.title}”`, value: i, sub: `${o.genre ? o.genre + ' · ' : ''}${o.series ? 'TV series · ' : ''}${o.prestige >= 1.3 ? 'prestige project' : o.prestige <= 0.95 ? 'small project' : 'solid project'}` })).concat([{ label: 'Pass', value: -1 }]) });
}
onChoice('sbGenre', (s, ctx, g) => { if (g && fameJob(s)) budgetPopup(s, { k: ctx.k, genre: g }); });
function budgetPopup(s, o) {
  const K = WORK_KINDS[o.k], st = sb(s), co = ownOutlet(s, o.k);
  const deal = st.deal && st.deal.type === K.deal ? st.deal : null;
  const payer = deal ? deal.name : 'you';
  const choices = BUDGET_NAMES.map((n, i) => { const cost = price(s, K.budgets[i]); return { label: `${n} production`, value: `${i}:${deal ? 'deal' : 'self'}`, sub: `${fmtMoney(cost)} · paid by ${payer}`, disabled: !deal && M(s).money < cost }; });
  if (co) for (let i = 0; i < 3; i++) { const cost = price(s, K.budgets[i]); choices.push({ label: `${BUDGET_NAMES[i]}, released by ${co.name}`, value: `${i}:own`, sub: `${fmtMoney(cost)} from company cash · the money goes to your company`, disabled: co.cash < cost }); }
  popup(s, { emoji: K.emoji, title: 'Budget', text: deal ? `${deal.name} is paying for it. ${nOf(deal.left, 'release')} left on your ${DEAL_NAMES[K.deal].noun}.` : `You're independent, so you pay for it and keep most of the money.`, handler: 'sbBudget', ctx: o, choices: choices.concat([{ label: 'Never mind', value: null }]) });
}
onChoice('sbBudget', (s, ctx, v) => {
  if (!v || !fameJob(s)) return;
  const [b, via] = v.split(':');
  const K = WORK_KINDS[ctx.k];
  popup(s, { emoji: K.emoji, title: 'Name it', text: `What's your new ${K.noun} called?`, handler: 'sbRelease', ctx: Object.assign({}, ctx, { b: Number(b), via }), input: { label: 'Title', value: workTitle(ctx.k), max: 40 }, choices: [{ label: 'Release it!' }] });
});
onChoice('sbRelease', (s, ctx, v, input) => (fameJob(s) ? releaseWork(s, Object.assign({}, ctx, { title: cleanTitle(input) || workTitle(ctx.k) })) : undefined));
function auditionFor(s, o, what) {
  const c = fameJob(s), j = JOBS[c.id], st = sb(s), A_ = AGENTS[st.agent];
  const sk = j.looksDriven ? P(s).stats.looks : skill(s, j.skill);
  const odds = clamp(0.35 + (sk - 15 - c.level * 12) / 60 + M(s).fame / 300 + (A_ ? A_.odds : 0) - (o.prestige - 1) * 0.3, 0.05, 0.92);
  addSkill(s, j.skill, randFloat(1, 2));
  return chance(odds) ? null : { text: vary(`{They went with someone else|You didn't get the part|The ${what} went another direction}. Keep at it.`), tone: 'bad', emoji: WORK_KINDS[workKind(s)].emoji };
}
onChoice('sbRole', (s, ctx, i) => { const o = ctx.offers && ctx.offers[i]; if (!o || !fameJob(s)) return; return auditionFor(s, o, 'casting director') || releaseWork(s, { k: 'role', genre: o.genre, title: o.title, prestige: o.prestige, series: o.series }); });
onChoice('sbCampaign', (s, ctx, i) => { const o = ctx.offers && ctx.offers[i]; if (!o || !fameJob(s)) return; return auditionFor(s, o, 'brand') || releaseWork(s, { k: 'campaign', genre: '', title: o.title, prestige: o.prestige }); });
onChoice('sbRecord', (s, ctx, i) => { const o = ctx.offers && ctx.offers[i]; if (!o || !fameJob(s)) return; return releaseWork(s, { k: 'record', genre: o.genre, title: o.title, prestige: o.prestige }); });

// Critics, charts and money for one release.
function releaseWork(s, o) {
  const K = WORK_KINDS[o.k], c = fameJob(s), j = JOBS[c.id], st = sb(s);
  const deal = o.via === 'deal' && st.deal && st.deal.type === K.deal ? st.deal : null;
  const co = o.via === 'own' ? ownOutlet(s, o.k) : null;
  const terms = deal ? DEAL_TERMS[deal.kind] : DEAL_TERMS.self;
  const agent = AGENTS[st.agent];
  if (K.budgets) {
    const cost = price(s, K.budgets[o.b || 0]);
    if (co) { if (co.cash < cost) return { text: `${co.name} can't afford that budget.`, nolog: true }; co.cash -= cost; }
    else if (!deal && !pay(s, cost)) return cantAfford(cost);
  }
  const sk = j.looksDriven ? P(s).stats.looks : skill(s, j.skill);
  addSkill(s, j.skill, randFloat(1, 3));
  const mastery = o.genre ? Math.min(8, (st.mastery[o.genre] || 0) * 2) : 0;
  const q = Math.round(clamp(gauss(26 + sk * 0.5 + [0, 5, 10][o.b || 0] + terms.q + mastery + (agent ? 2 : 0) + (trait(s, 'creative') ? 4 : 0) + (st.boost ? 5 : 0), 10), 1, 100));
  st.boost = 0;
  const reach = (co ? 0.7 + co.rep / 100 : K.budgets ? terms.reach : 1) * (agent ? agent.reach : 1) * (o.prestige || 1) * (o.k === 'film' ? [0.5, 1, 2.2][o.b || 0] : 1);
  const trend = o.genre && K.genres ? trendsFor(s)[K.genres][o.genre] || 1 : 1;
  const cm = Math.pow(Math.max(0.05, q / 55), 2) * (0.35 + M(s).fame / 60) * reach * trend * Math.exp(gauss(0, 0.45));
  const score = Math.round(clamp(q + gauss(0, 8), 1, 100));
  const rev = Math.round(price(s, K.base) * cm * (1 + c.level * 0.5));
  const peak = ['campaign'].includes(o.k) ? 0 : clamp(Math.round(60 / (cm * 2 + 0.3)), 1, 200);
  // Fees (roles, records, campaigns) are all yours; releases pay a royalty on the gross.
  const share = co ? 0 : (K.budgets ? terms.share : 0.35) * (1 - (agent ? agent.cut : 0));
  const mine = Math.round(rev * share);
  if (mine) add(s, { money: mine });
  if (co) { co.cash += Math.round(rev * 0.85); co.rep = clamp100(co.rep + (score - 50) / 10); tally(s, 'ownReleases'); }
  const w = { id: uid(s, 'w'), kind: o.k, title: o.title, year: s.year, genre: o.genre || '', q, score, c: Math.round(cm * 100) / 100, peak, rev, share: Math.round(share * 1000) / 1000, awards: 0, via: co ? co.name : deal ? deal.name : '' };
  st.works.push(w);
  while (st.works.length > 60) st.works.shift();
  if (o.genre) st.mastery[o.genre] = (st.mastery[o.genre] || 0) + 1;
  tally(s, 'works');
  add(s, { fame: clamp(Math.round((cm - 1) * 4), -4, 10), happy: cm >= 1 ? 4 : -2 });
  if (peak === 1 && ['album', 'record'].includes(o.k)) tally(s, 'numberOnes');
  if (peak === 1 && o.k === 'book') tally(s, 'bestsellers');
  if (['film', 'role'].includes(o.k) && rev * 6 >= price(s, 100000000)) tally(s, 'blockbusters');
  const lines = [`${releaseVerb(o)} Critics gave it ${score}/100.`, chartLine(s, w)];
  if (mine) lines.push(`You earned ${fmtMoney(mine)}${agent ? ' after your agent’s cut' : ''}.`);
  if (co) lines.push(`${co.name} took in ${fmtMoney(Math.round(rev * 0.85))}.`);
  if (deal) {
    deal.left--;
    if (deal.left <= 0) { st.deal = null; lines.push(`That was the last release on your ${DEAL_NAMES[K.deal].noun} with ${deal.name}.`); }
    else if (deal.kind === 'major' && cm < 0.3 && chance(0.4)) { st.deal = null; lines.push(`${deal.name} dropped you.`); }
  }
  if (c.level < j.ladder.length - 1 && cm >= 1 + c.level * 0.7 && chance(0.6)) promote(s, `“${o.title}” was a hit.`);
  return { text: lines.join(' '), tone: cm >= 1 ? 'good' : cm < 0.4 ? 'bad' : '', emoji: K.emoji, title: `“${o.title}”` };
}
function releaseVerb(o) {
  const t = `“${o.title}”`;
  return { album: `${t} is out.`, book: `${t} hit the shelves.`, special: `${t} premiered.`, film: `Your film ${t} opened in theaters.`, role: `You got the part! ${o.series ? 'The series' : 'The film'} ${t} came out this year.`, record: `You produced ${t}.`, campaign: `You fronted the ${o.title}.` }[o.k];
}
function chartLine(s, w) {
  if (w.kind === 'campaign') return `It ran in ${randInt(5, 40)} countries.`;
  if (w.kind === 'film' || w.kind === 'role') return `It grossed ${fmtMoneyShort(w.rev * 6)} at the box office${w.peak <= 3 ? `, opening at #${w.peak}` : ''}.`;
  const where = { album: 'the album chart', record: 'the album chart', book: 'the bestseller list', special: 'the streaming charts' }[w.kind];
  return w.peak === 1 ? `It went straight to #1 on ${where}!` : `It peaked at #${w.peak} on ${where}.`;
}

/* ---- agents and deals ----------------------------------------------------------- */
defAction({
  id: 'sb_agent', cat: 'job', emoji: '🤝',
  label: (s) => (M(s).sb && M(s).sb.agent ? 'Your agent' : 'Hire an agent'),
  sub: (s) => { const st = M(s).sb; return st && st.agent ? `${st.agency} · ${Math.round(AGENTS[st.agent].cut * 100)}% cut` : 'Better roles, bigger audiences, for a cut.'; },
  when: (s) => hasCareer(s) && !!fameJob(s) && free(s),
  run: (s) => {
    const st = sb(s);
    const choices = [1, 2, 3].map((t) => ({ label: AGENTS[t].name, value: t, sub: M(s).fame < AGENTS[t].fame ? `Needs ${AGENTS[t].fame} fame` : `${Math.round(AGENTS[t].cut * 100)}% of your earnings${st.agent === t ? ' (current)' : ''}`, disabled: M(s).fame < AGENTS[t].fame || st.agent === t }));
    if (st.agent) choices.push({ label: 'Fire your agent', value: 0, tone: 'bad' });
    popup(s, { emoji: '🤝', title: 'Representation', text: 'An agent takes a cut of what you earn from your work, but gets you better parts, more press and bigger audiences.', handler: 'sbAgent', choices: choices.concat([{ label: 'Never mind', value: -1 }]) });
  },
});
onChoice('sbAgent', (s, ctx, t) => {
  if (t < 0 || !fameJob(s)) return;
  const st = sb(s);
  if (t === 0) { st.agent = 0; return { text: `You fired ${st.agency}. You're on your own.`, quiet: true }; }
  st.agent = t;
  st.agency = pick(AGENCY_NAMES);
  return { text: `You signed with ${st.agency}.`, tone: 'good', emoji: '🤝' };
});
defAction({
  id: 'sb_deal', cat: 'job', emoji: '✍️',
  label: (s) => { const st = M(s).sb, K = WORK_KINDS[workKind(s)]; return st && st.deal && st.deal.type === K.deal ? `Your ${DEAL_NAMES[K.deal].noun}` : `Shop for a ${DEAL_NAMES[K.deal].noun}`; },
  sub: (s) => { const st = M(s).sb, K = WORK_KINDS[workKind(s)]; return st && st.deal && st.deal.type === K.deal ? `${st.deal.name} · ${nOf(st.deal.left, 'release')} left` : `Or stay independent and keep more of the money.`; },
  when: (s) => hasCareer(s) && !!fameJob(s) && free(s) && !!WORK_KINDS[workKind(s)].deal,
  run: (s) => {
    const st = sb(s), k = workKind(s), K = WORK_KINDS[k], D = DEAL_NAMES[K.deal], c = fameJob(s);
    if (st.deal && st.deal.type === K.deal) {
      const cost = price(s, DEAL_TERMS[st.deal.kind].advance);
      popup(s, { emoji: '✍️', title: st.deal.name, text: `You owe ${st.deal.name} ${nOf(st.deal.left, 'more release')}. Buying yourself out costs ${fmtMoney(cost)}.`, handler: 'sbBuyout', choices: [{ label: 'Buy out your contract', value: true, sub: fmtMoney(cost), disabled: M(s).money < cost }, { label: 'Keep it', value: false }] });
      return;
    }
    if (bump(s, 'sb_deal') > 1) return { text: `Nobody else is taking meetings until next year.`, nolog: true };
    const best = Math.max(0, ...st.works.filter((w) => w.kind === k).map((w) => w.score));
    const offers = [];
    if (M(s).fame >= 35 || best >= 75) offers.push({ kind: 'major', name: pick(D.major), left: 3, advance: price(s, DEAL_TERMS.major.advance * (1 + c.level)) });
    if (M(s).fame >= 10 || best >= 55 || chance(0.4)) offers.push({ kind: 'indie', name: pick(D.indie), left: 2, advance: price(s, DEAL_TERMS.indie.advance * (1 + c.level)) });
    if (!offers.length) return { text: `No ${D.who} would take a meeting. Put out some work and build your name first.`, emoji: '✍️' };
    popup(s, {
      emoji: '✍️', title: cap(D.noun), handler: 'sbDeal', ctx: { offers, type: K.deal },
      text: `A big ${D.who} gets you in front of far more people but keeps most of the money. An indie keeps less. On your own, you keep the most, if anyone finds you.`,
      choices: offers.map((o, i) => ({ label: `${o.name} (${o.kind === 'major' ? 'major' : 'indie'})`, value: i, sub: `${fmtMoney(o.advance)} advance · ${Math.round(DEAL_TERMS[o.kind].share * 100)}% royalty · ${o.left} releases` })).concat([{ label: 'Stay independent', value: -1 }]),
    });
  },
});
onChoice('sbDeal', (s, ctx, i) => {
  const o = ctx.offers && ctx.offers[i];
  if (!o || !fameJob(s)) return;
  sb(s).deal = { kind: o.kind, name: o.name, left: o.left, type: ctx.type };
  add(s, { money: o.advance, happy: 6 });
  tally(s, 'deals');
  return { text: `You signed with ${o.name} and got a ${fmtMoney(o.advance)} advance.`, tone: 'good', emoji: '✍️' };
});
onChoice('sbBuyout', (s, ctx, yes) => {
  const st = sb(s);
  if (!yes || !st.deal) return;
  const cost = price(s, DEAL_TERMS[st.deal.kind].advance);
  if (!pay(s, cost)) return cantAfford(cost);
  const name = st.deal.name;
  st.deal = null;
  return { text: `You bought your way out of your contract with ${name}. You're independent again.`, emoji: '✍️' };
});

/* ---- talk shows ------------------------------------------------------------------- */
defAction({
  id: 'sb_talkshow', cat: 'fame', label: 'Go on a talk show', emoji: '🛋️', desc: 'Charm the couch. Or set it on fire.',
  when: (s) => free(s) && A(s) >= 16 && M(s).fame >= 25,
  run: (s) => {
    if (bump(s, 'sb_talk') > 1) return { text: 'Your publicist says one talk show a year is plenty.', nolog: true };
    const latest = M(s).sb && M(s).sb.works.slice(-1)[0];
    const host = pick(HOSTS);
    popup(s, {
      emoji: '🛋️', title: host, text: 'The band is playing you on. How do you play it?', handler: 'sbTalk', ctx: { host },
      choices: [{ label: 'Be charming', value: 'charm' }, { label: 'Be outrageous', value: 'wild' }].concat(latest ? [{ label: `Plug “${latest.title}”`, value: 'plug' }] : []),
    });
  },
});
onChoice('sbTalk', (s, ctx, v) => {
  addSkill(s, 'charisma', 2);
  if (v === 'charm') {
    if (chance(0.55 + skill(s, 'charisma') / 200)) { add(s, { fame: 3, happy: 4 }); return { text: `You had the audience on ${ctx.host} eating out of your hand.`, tone: 'good', emoji: '🛋️' }; }
    add(s, { fame: 1 });
    return { text: 'You were a little stiff. The host carried the interview.', emoji: '🛋️' };
  }
  if (v === 'wild') {
    add(s, { fame: 6, karma: -2 });
    if (chance(0.35)) { add(s, { happy: -5 }); return { text: 'Your stunt went viral for all the wrong reasons. Your publicist is not sleeping.', tone: 'bad', emoji: '🛋️' }; }
    return { text: 'You jumped on the couch and the clip got forty million views.', tone: 'good', emoji: '🛋️' };
  }
  const w = M(s).sb && M(s).sb.works.slice(-1)[0];
  if (!w) return;
  const bump2 = Math.round(w.rev * Math.max(0.05, w.share) * 0.1);
  add(s, { money: bump2, fame: 2 });
  return { text: `Sales of “${w.title}” jumped after the show. That was worth ${fmtMoney(bump2)}.`, emoji: '🛋️' };
});

/* ---- the showbiz year -------------------------------------------------------------- */
function showbizTick(s) {
  const st = M(s).sb;
  if (!st || s.dead) return;
  trendsFor(s);
  const m = M(s), fin = m.lastFinance && m.lastFinance.year === s.year ? m.lastFinance : null;
  // Royalties from the back catalog; classics keep selling for decades.
  let roy = 0;
  for (const w of st.works) {
    const age = s.year - w.year;
    if (age < 1 || age > 25 || !w.share || !w.rev) continue;
    roy += w.rev * w.share * 0.12 * Math.pow(w.score >= 85 || w.peak === 1 ? 0.9 : 0.72, age - 1);
  }
  if (roy >= 1) { roy = Math.round(roy); m.money += roy; if (fin) fin.inc.push(['Royalties', roy]); }
  // Award season for last year's work.
  const lines = [];
  for (const w of st.works.filter((x) => x.year === s.year - 1 && x.score >= 72)) {
    if (!chance(clamp((w.score - 68) / 35, 0, 0.9))) continue;
    const [show, cat] = WORK_KINDS[w.kind].award;
    tally(s, 'nominations');
    if (chance(clamp(0.3 + (w.score - 80) / 50 + (st.agent ? 0.05 : 0), 0.1, 0.85))) {
      w.awards++;
      st.awards++;
      if (!st.shows.includes(show)) st.shows.push(show);
      tally(s, 'awards');
      add(s, { fame: 5, happy: 10 });
      lines.push(`🏆 You won ${cat} at ${show} for “${w.title}”!`);
    } else lines.push(`You were nominated for ${cat} at ${show} for “${w.title}”, but lost.`);
  }
  if (lines.length) announce(s, { emoji: '🏆', title: 'Award season', text: lines.join(' '), tone: lines.some((l) => l.startsWith('🏆')) ? 'good' : '' });
}

/* ---- fame events -------------------------------------------------------------------- */
const famous = (n) => (s) => M(s).fame >= n;
EV('sb_paparazzi', {
  ages: [14, 120], when: famous(40), emoji: '📸', text: 'Paparazzi have been camped outside your home all week.',
  choices: [
    ['Smile and wave', (s) => { add(s, { fame: 1 }); return 'The photos were boring. They left on Friday.'; }],
    ['Smash a camera', (s) => { add(s, { fame: 3, karma: -4 }); if (chance(0.3)) return arrest(s, 'vandalism'); return 'The video of you smashing it made the evening news.'; }],
    { label: 'Sue for invasion of privacy', sub: (s) => fmtMoney(price(s, 25000)), fx: (s) => { const c = price(s, 25000); if (!pay(s, c)) return cantAfford(c); if (chance(0.5)) { add(s, { money: price(s, 80000) }); return 'You won, and the agency paid damages.'; } return 'You lost. The photographers are back.'; } },
  ],
});
EV('sb_feud', {
  era: 'social',
  ages: [16, 120], when: famous(35), emoji: '🥊', text: () => `${pick(STARS)} took a shot at you in an interview.`,
  choices: [
    ['Clap back', (s) => { add(s, { fame: 5, karma: -2 }); if (chance(0.3)) { add(s, { fame: -4 }); return 'Your reply aged badly. The internet sided with them.'; } return 'Your reply was perfect. You won the week.'; }],
    ['Take the high road', (s) => { add(s, { karma: 2 }); return 'You said you wished them well. It made them look petty.'; }],
    { label: 'Turn it into material', when: (s) => !!fameJob(s), fx: (s) => { sb(s).boost = 1; add(s, { happy: 3 }); return 'You poured it all into your next project. It will be better for it.'; } },
  ],
});
EV('sb_romance_rumor', {
  era: 'social',
  ages: [18, 120], when: famous(45), emoji: '💋', text: () => `The tabloids say you're secretly dating ${pick(STARS)}.`,
  choices: [
    ['Deny it', (s) => { add(s, { fame: 1 }); return 'Nobody believed the denial, which only helped.'; }],
    ['Say nothing', (s) => { add(s, { fame: 3 }); return 'Silence only made people more curious.'; }],
    ['Lean into it', (s) => { add(s, { fame: 6 }); const r = romanticId(s); if (r) { addRel(s, r, -12); return `The headlines were great. ${nm(s, r)} was not amused.`; } return 'You posted a cryptic photo. The internet lost its mind.'; }],
  ],
});
EV('sb_leak', {
  era: 'web',
  ages: [16, 120], when: (s) => famous(30)(s) && ['album', 'film', 'record', 'book'].includes(workKind(s)), emoji: '💾', text: 'Your next project leaked online months early.',
  choices: [
    ['Embrace it', (s) => { add(s, { fame: 3 }); sb(s).boost = 1; return 'You called it a gift to the fans. The buzz has never been bigger.'; }],
    ['Hunt down the leaker', (s) => { add(s, { happy: -3 }); return 'It was a studio intern. Firing them felt less satisfying than you hoped.'; }],
    ['Scrap it and start over', (s) => { add(s, { happy: -6 }); addSkill(s, JOBS[M(s).career.id].skill, 3); return 'Back to the drawing board. The new version is better.'; }],
  ],
});
EV('sb_presenter', {
  ages: [18, 120], w: 0.6, when: famous(50), emoji: '🎤', text: "You've been asked to present an award on live television.",
  choices: [
    ['Present it', (s) => { if (chance(0.15)) { add(s, { fame: 6 }); return 'You read the wrong winner. It was the most talked-about moment of the night.'; } add(s, { fame: 3 }); return 'You nailed your lines and the dress was a hit.'; }],
    ['Decline', () => 'You watched from your couch instead.'],
  ],
});
EV('sb_host_offer', {
  ages: [21, 120], w: 0.4, when: famous(70), emoji: '📺', text: 'A network wants you to host your own talk show for a season.',
  choices: [
    ['Take the job', (s) => { const pay = price(s, 2000000 * (M(s).fame / 100)); add(s, { money: pay, fame: 5, happy: -3 }); tally(s, 'hostedShow'); return `You hosted a season of your own show and earned ${fmtMoney(pay)}. The ratings were ${pick(['huge', 'solid', 'respectable'])}.`; }],
    ['Pass', () => 'You told them you were too busy. You were.'],
  ],
});
EV('sb_superfan', {
  ages: [16, 120], w: 0.5, when: famous(55), emoji: '💌', text: 'A superfan got your face tattooed on their forearm and sent you a photo.',
  choices: [
    ['Post it with a heart', (s) => { add(s, { fame: 2, happy: 3 }); return 'The fan cried for a week. Happy tears.'; }],
    ['Pretend you never saw it', () => 'Some things are better left unseen.'],
  ],
});
