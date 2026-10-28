/* =====================================================================
 * 35-events-business.js — things that happen to your companies.
 *
 * BEV(id, { w, when(s, co), tags, emoji, text(s, co), auto: fx(s, co),
 *           choices: [[label, fx(s, co)], { label, when(s, co), fx(s, co) }] })
 * The first choice is what a hired CEO picks, so it must always be available.
 * About half of your companies' years bring one of these. They work like
 * life events (23-events.js) but each is about one company.
 * ===================================================================== */

const BIZ_EVENTS = {};
const BIZ_EVENT_IDS = [];
function BEV(id, def) { def.id = id; BIZ_EVENTS[id] = def; BIZ_EVENT_IDS.push(id); }

const FOOD_INDS = ['foodtruck', 'cafe', 'bakery', 'restaurant', 'brewery'];
const DIGITAL_INDS = ['tech', 'games', 'agency', 'consulting', 'pharma', 'label'];
const B2B_INDS = ['consulting', 'agency', 'construction', 'lawfirm', 'realestate'];
const isInd = (list) => (s, co) => list.includes(co.ind);
const youRun = (s, co) => co.ceo === 'you' && free(s);

function rollBizEvent(s, co) {
  const playerRuns = co.ceo === 'you' && free(s);
  const pool = BIZ_EVENT_IDS.map((id) => BIZ_EVENTS[id]).filter((ev) => {
    if (ev.youOnly && !playerRuns) return false;
    if (!tagsOn(ev.tags)) return false;
    try { return !ev.when || ev.when(s, co); } catch (e) { console.error('[ByteLyfe] biz event when() failed', ev.id, e); return false; }
  });
  const ev = weighted(pool, (e) => e.w ?? 1);
  if (!ev) return;
  webFact(s, 'biz_event', { id: ev.id, co: co.id, you: co.ceo === 'you' }); // the press and your name listen (81-web2.js)
  const text = vary(typeof ev.text === 'function' ? ev.text(s, co) : ev.text);
  if (ev.auto) {
    const r = ev.auto(s, co);
    log(s, `${ev.emoji} ${co.name}: ${text}${r ? ' ' + r : ''}`, '');
    return;
  }
  // The player decides only when they're the one running the company.
  if (!playerRuns) {
    const r = bizChoice(ev, 0).fx(s, co);
    log(s, `${ev.emoji} ${co.name}: ${text} ${co.ceoName || 'Management'} handled it. ${typeof r === 'string' ? vary(r) : r && r.text ? vary(r.text) : ''}`.trim());
    return;
  }
  const choices = [];
  ev.choices.forEach((c0, i) => {
    const c = bizChoice(ev, i);
    if (c.when && !c.when(s, co)) return;
    choices.push({ label: typeof c.label === 'function' ? c.label(s, co) : c.label, value: i });
  });
  popup(s, { emoji: ev.emoji, title: co.name, text, handler: 'bizEvent', ctx: { ev: ev.id, co: co.id }, choices });
}
function bizChoice(ev, i) { const c = ev.choices[i]; return Array.isArray(c) ? { label: c[0], fx: c[1] } : c; }
onChoice('bizEvent', (s, ctx, i) => {
  const ev = BIZ_EVENTS[ctx.ev], co = company(s, ctx.co);
  if (!ev || !co || co.closed) return { text: 'The moment passed.', quiet: true, nolog: true };
  const r = bizChoice(ev, i).fx(s, co);
  if (typeof r === 'string') return { text: vary(r), title: co.name, emoji: ev.emoji };
  if (r && r.text) { r.text = vary(r.text); r.title = r.title || co.name; r.emoji = r.emoji || ev.emoji; }
  return r;
});
const evCost = (s, co, usd) => bizCost(s, co, usd);
const spendCo = (co, amt) => { co.cash -= Math.round(amt); };
const staffGroups = (co) => BIZ_ROLE_IDS.filter((r) => co.team[r].n);
const bumpMorale = (co, d) => { for (const r of BIZ_ROLE_IDS) if (co.team[r].n) co.team[r].morale = clamp(co.team[r].morale + d, 0, 100); };

BEV('inspection', {
  w: 2, when: isInd(FOOD_INDS), emoji: '🔍', text: 'A health inspector showed up unannounced.',
  choices: [
    ['Let them inspect', (s, co) => {
      if (chance(0.45 + co.rep / 200 + co.team.manager.n * 0.05)) { co.rep = clamp100(co.rep + 2); return 'You passed with flying colors.'; }
      const fine = evCost(s, co, 8000); spendCo(co, fine); co.rep = clamp100(co.rep - 8);
      return { text: `They found a few violations. ${fmtMoney(fine)} fine, and a bad grade on the door.`, tone: 'bad' };
    }],
    ['Offer a "donation"', (s, co) => {
      add(s, { karma: -4 });
      if (chance(0.25)) { const fine = evCost(s, co, 40000); spendCo(co, fine); co.rep = clamp100(co.rep - 15); return { text: `The inspector reported the bribe. ${fmtMoney(fine)} fine and a local news story.`, tone: 'bad' }; }
      spendCo(co, evCost(s, co, 2000));
      return 'The inspector pocketed the cash and gave you a perfect score.';
    }],
    ['Ask them to come back later', (s, co) => { co.rep = clamp100(co.rep - 3); return 'They came back with a colleague. It went fine, but word got around.'; }],
  ],
});
BEV('breach', {
  w: 1.5, when: isInd(DIGITAL_INDS), emoji: '🔓', text: 'Hackers broke into your systems and stole customer data.',
  choices: [
    ['Disclose it publicly', (s, co) => { co.rep = clamp100(co.rep - 6); spendCo(co, evCost(s, co, 60000)); add(s, { karma: 2 }); return 'You came clean and fixed it. Customers grumbled but stuck around.'; }],
    ['Quietly patch it', (s, co) => {
      add(s, { karma: -5 });
      if (chance(0.45)) { co.rep = clamp100(co.rep - 22); spendCo(co, evCost(s, co, 250000)); return { text: 'A journalist found out about the cover-up. Fines, lawsuits and a PR nightmare.', tone: 'bad' }; }
      return 'Nobody ever found out.';
    }],
  ],
});
BEV('poached', {
  when: (s, co) => headcount(co) >= 5, emoji: '🎣',
  text: (s, co) => { const r = co.team.rnd.n ? 'rnd' : 'ops', f = rivalOf(s, co); return `${f ? f.name : 'A rival'} is trying to poach your best ${roleTitle(co, r, 1).toLowerCase()}, ${randomFirst(P(s).country, chance(0.5) ? 'm' : 'f')}.`; },
  choices: [
    ['Make a counter-offer', (s, co) => { const r = co.team.rnd.n ? 'rnd' : 'ops'; spendCo(co, co.team[r].pay * 0.4); co.team[r].morale = clamp(co.team[r].morale + 4, 0, 100); return 'They stayed. Your team noticed you fight for your people.'; }],
    ['Let them go', (s, co) => { const r = co.team.rnd.n ? 'rnd' : 'ops'; const g = co.team[r]; if (g.n) { g.skill = clamp(g.skill - 6 / Math.max(1, g.n / 3), 5, 95); g.n -= 1; } return 'They left for the competition.'; }],
  ],
});
BEV('viral', { emoji: '🚀', text: () => `A customer's ${pick(['video', 'post', 'review', 'thread'])} about you went viral.`, auto: (s, co) => { co.rep = clamp100(co.rep + randInt(6, 12)); return 'Business boomed for weeks.'; } });
BEV('bad_review', {
  emoji: '😡', text: () => `A brutal ${pick(['review', 'video', 'blog post'])} about you is going around online.`,
  choices: [
    ['Apologize publicly', (s, co) => { co.rep = clamp100(co.rep + 1); return 'Your apology was gracious. Most people moved on.'; }],
    ['Fire back', (s, co) => { if (chance(0.35)) { co.rep = clamp100(co.rep + 4); return 'Your response was so witty it went viral in a good way.'; } co.rep = clamp100(co.rep - 8); return { text: 'Arguing with customers online went about as well as you would expect.', tone: 'bad' }; }],
    ['Ignore it', (s, co) => { co.rep = clamp100(co.rep - 3); return 'It faded. Mostly.'; }],
  ],
});
BEV('lawsuit', {
  emoji: '⚖️', text: (s, co) => `A customer is suing ${co.name} for ${fmtMoney(evCost(s, co, 120000))}.`,
  choices: [
    ['Settle out of court', (s, co) => { spendCo(co, evCost(s, co, 50000)); return `You settled for ${fmtMoney(evCost(s, co, 50000))}.`; }],
    // A real court case (42-courts.js): the company pays the lawyers and any judgment.
    ['Fight it in court', (s, co) => { getSued(s, 'slipfall', randomParty(s), { co: co.id, claim: evCost(s, co, 120000) }); }],
  ],
});
BEV('supply', {
  when: (s, co) => !DIGITAL_INDS.includes(co.ind), emoji: '📦', text: 'Your supply costs suddenly spiked.',
  choices: [
    ['Eat the costs', (s, co) => { const c = Math.round((co.last ? co.last.revenue : evCost(s, co, 100000)) * 0.05); spendCo(co, c); return `It cost you about ${fmtMoney(c)}.`; }],
    ['Switch to cheaper suppliers', (s, co) => { for (const p of co.products) p.q = clamp100(p.q - randInt(3, 8)); return 'Quality slipped a little. Regulars noticed.'; }],
    ['Raise prices', (s, co) => { co.rep = clamp100(co.rep - 4); co.cash += Math.round((co.last ? co.last.revenue : 0) * 0.02); return 'Customers grumbled, but most stayed.'; }],
  ],
});
BEV('union', {
  when: (s, co) => headcount(co) >= 15, emoji: '✊', text: 'Your employees want to form a union.',
  choices: [
    ['Recognize the union', (s, co) => { for (const r of staffGroups(co)) { co.team[r].pay = Math.round(co.team[r].pay * 1.08); } bumpMorale(co, 15); add(s, { karma: 4 }); return 'Pay went up 8%, and so did morale.'; }],
    ['Fight it', (s, co) => {
      bumpMorale(co, -15); add(s, { karma: -6 });
      if (chance(0.3)) { const loss = Math.round((co.last ? co.last.revenue : 0) * 0.15); spendCo(co, loss); return { text: `Your staff went on strike. It cost about ${fmtMoney(loss)}.`, tone: 'bad' }; }
      return 'The union vote failed. Nobody is happy about it.';
    }],
  ],
});
BEV('buyout', {
  w: 0.8, youOnly: true, when: (s, co) => co.val >= price(s, 1e6) && (co.equity >= 0.5 || co.public), emoji: '🤑', text: (s, co) => `A big company is circling ${co.name}.`,
  choices: [
    ['Hear them out', (s, co) => { sellOffer(s, co, co.public ? marketCap(co) * randFloat(1.2, 1.6) : co.val * randFloat(0.9, 1.6)); }],
    ['Not for sale', () => 'You told them to keep circling.'],
  ],
});
BEV('competitor', { emoji: '🏪', text: (s, co) => { const f = rivalOf(s, co); return f ? `${f.name} opened a ${indOf(co).place} right next door to yours.` : `A big ${pick(['chain', 'competitor', 'well-funded rival'])} opened up right next door.`; }, auto: (s, co) => { co.rep = clamp100(co.rep - randInt(3, 7)); return 'Some customers drifted away.'; } });

/* ---- named rivals (37-market.js) -------------------------------------
 * rivalOf picks a rival when the text is written and remembers it on the
 * company (co.evRival), so a choice answered later still knows who it was. */
function rivalOf(s, co) { const list = industryRivals(s, co.ind); const f = list.length ? pick(list) : null; co.evRival = f ? f.id : null; return f; }
function evRival(s, co) { return firmById(s, co.evRival); }
const hasRivals = (s, co) => industryRivals(s, co.ind).length > 0;
BEV('rival_hit', {
  w: 0.7, when: hasRivals, emoji: '📢',
  text: (s, co) => { const f = rivalOf(s, co); return `${f.name} launched a new ${indOf(co).product} that everyone is talking about.`; },
  auto: (s, co) => { const f = evRival(s, co); co.rep = clamp100(co.rep - randInt(3, 6)); if (f) { f.rep = clamp100(f.rep + 4); f.q = clamp100(f.q + 5); } return 'Some of your customers went to try it.'; },
});
BEV('rival_scandal', {
  w: 0.6, when: hasRivals, emoji: '📰',
  text: (s, co) => { const f = rivalOf(s, co); return `${f.name} is in the news for ${pick(['a health-code disaster', 'cooking the books', 'a leaked memo about customers', 'treating staff terribly', 'a product recall'])}.`; },
  auto: (s, co) => {
    const f = evRival(s, co);
    co.rep = clamp100(co.rep + randInt(3, 7));
    if (!f) return 'Customers are switching to you.';
    f.rep = clamp100(f.rep - 10);
    if (f.ticker) { f.price = Math.max(0.05, Math.round(f.price * 0.8 * 100) / 100); f.val = Math.round(f.price * f.sh); }
    return `Customers are switching to you.${f.ticker ? ` ${f.ticker} stock fell 20%.` : ''}`;
  },
});
BEV('rival_pricewar', {
  w: 0.6, youOnly: true, when: (s, co) => hasRivals(s, co) && !!co.last, emoji: '🏷️',
  text: (s, co) => { const f = rivalOf(s, co); return `${f.name} slashed their prices to steal your customers.`; },
  choices: [
    ['Match their prices', (s, co) => { spendCo(co, (co.last ? co.last.revenue : 0) * 0.05); return 'You matched them. It cost you, but your customers stayed.'; }],
    ['Hold your prices', (s, co) => { co.rep = clamp100(co.rep - 4); return 'Bargain hunters left. Your regulars stayed.'; }],
    { label: 'Move upmarket instead', when: (s, co) => ['budget', 'standard'].includes(co.tier) && effQuality(s, co) >= 50, fx: (s, co) => { co.tier = 'premium'; co.rep = clamp100(co.rep + 1); return `${co.name} switched to premium pricing and left the bargain bin to ${evRival(s, co) ? evRival(s, co).name : 'them'}.`; } },
  ],
});
BEV('franchise_mess', {
  w: 0.8, youOnly: true, when: (s, co) => !!co.franchise && co.franchise.outlets >= 5, emoji: '🧯',
  text: (s, co) => `A ${co.name} franchisee got ${pick(['shut down by health inspectors', 'caught overcharging customers', 'filmed being rude to a customer', 'sued by its own staff'])}. It's all over the local news.`,
  choices: [
    ['Pull their franchise', (s, co) => { co.franchise.outlets = Math.max(0, co.franchise.outlets - 1); co.rep = clamp100(co.rep + 1); return 'You revoked their license. The brand looks serious about standards.'; }],
    ['Let it blow over', (s, co) => { co.rep = clamp100(co.rep - 4); return 'It blew over, mostly. People still bring it up.'; }],
  ],
});
BEV('franchise_star', {
  w: 0.6, when: (s, co) => !!co.franchise && co.franchise.outlets >= 3 && co.rep >= 55, emoji: '🌟',
  text: (s, co) => `Your best franchisee wants to open more ${pluralize(indOf(co).place)} under the ${co.name} name.`,
  auto: (s, co) => { const n = randInt(2, 5); co.franchise.outlets += n; return `${nOf(n, 'new outlet')} opened this year.`; },
});
BEV('endorsement', {
  when: (s, co) => co.rep >= 35, emoji: '🌟', text: (s, co) => `A celebrity offers to endorse ${co.name} for ${fmtMoney(evCost(s, co, 150000))}.`,
  choices: [
    ['Sign the deal', (s, co) => { const c = evCost(s, co, 150000); if (co.cash < c) return { text: "The company can't afford it right now.", tone: 'bad' }; spendCo(co, c); co.rep = clamp100(co.rep + randInt(8, 15)); return 'Sales jumped the week the ads came out.'; }],
    ['Pass', () => 'You passed on the celebrity deal.'],
  ],
});
BEV('audit', {
  when: (s, co) => co.cash > evCost(s, co, 50000), emoji: '🧾', text: 'The tax authority is auditing your books.',
  choices: [
    ['Hire good accountants', (s, co) => { spendCo(co, evCost(s, co, 20000)); return chance(0.85) ? 'The audit came back clean.' : `They found a small error. ${fmtMoney(evCost(s, co, 10000))} fine.`; }],
    ['Wing it', (s, co) => { if (chance(0.5)) return 'Somehow, the audit came back clean.'; const fine = Math.round(Math.max(evCost(s, co, 30000), co.cash * 0.1)); spendCo(co, fine); return { text: `The auditors were not impressed. ${fmtMoney(fine)} in back taxes and penalties.`, tone: 'bad' }; }],
  ],
});
BEV('investor_call', {
  when: (s, co) => !co.public && co.growth > 0.15 && youRun(s, co), emoji: '📞', text: (s, co) => `Investors keep calling to ask about ${co.name}.`,
  choices: [
    ['Take the meeting', (s, co) => {
      const amount = nicePrice(Math.max(price(s, 50000), co.val * randFloat(0.15, 0.3)));
      const stake = Math.round(clamp((amount / (co.val + amount)) * randFloat(0.85, 1.15), 0.03, 0.5) * 1000) / 1000;
      popup(s, { emoji: '🤝', title: 'Term sheet', text: `${pick(INVESTOR_NAMES)} offers ${fmtMoney(amount)} for ${pctStr(stake)} of ${co.name}.`, handler: 'bizRaise', ctx: { co: co.id, offers: [{ name: pick(INVESTOR_NAMES), amount, stake }] }, choices: [{ label: 'Take the money', value: 0 }, { label: 'Walk away', value: -1 }] });
    }],
    ['Not interested', () => 'You like owning your company.'],
  ],
});
BEV('embezzler', {
  when: (s, co) => headcount(co) >= 8, emoji: '🕵️', text: 'An employee was caught stealing from the company.',
  choices: [
    ['Fire them and press charges', (s, co) => { co.cash += evCost(s, co, 5000); return 'They were arrested. Some of the money came back.'; }],
    ['Quietly let them go', (s, co) => { spendCo(co, evCost(s, co, 10000)); return 'They left without a fuss. The money did not come back.'; }],
  ],
});
BEV('recall', {
  when: (s, co) => co.products.length > 0 && !['consulting', 'lawfirm', 'realestate', 'agency'].includes(co.ind), emoji: '⚠️',
  text: (s, co) => `A serious problem was found with “${co.products[co.products.length - 1].name}.”`,
  choices: [
    ['Recall it and make it right', (s, co) => { spendCo(co, evCost(s, co, 120000)); co.rep = clamp100(co.rep - 2); add(s, { karma: 2 }); const p = co.products[co.products.length - 1]; if (p) p.q = clamp100(p.q - 5); return 'Expensive, but customers trusted you more for it.'; }],
    ['Deny everything', (s, co) => { add(s, { karma: -6 }); if (chance(0.4)) { co.rep = clamp100(co.rep - 22); spendCo(co, evCost(s, co, 300000)); return { text: 'Leaked emails proved you knew. Lawsuits followed.', tone: 'bad' }; } return 'The story died down.'; }],
  ],
});
BEV('award', { when: (s, co) => co.rep >= 60, emoji: '🏆', text: (s, co) => `${co.name} won “Best ${indOf(co).name} in ${P(s).city}.”`, auto: (s, co) => { co.rep = clamp100(co.rep + 5); bumpMorale(co, 5); tally(s, 'bizAwards'); return 'The trophy is in the window.'; } });
BEV('retreat', {
  when: (s, co) => headcount(co) >= 5, emoji: '🏕️', text: 'Your team is asking for a company retreat.',
  choices: [
    ['Throw a great one', (s, co) => { spendCo(co, price(s, 1200) * headcount(co)); bumpMorale(co, 12); return 'Three days of team-building, karaoke and a questionable trust fall. Everyone loved it.'; }],
    ['Pizza party instead', (s, co) => { spendCo(co, price(s, 30) * headcount(co)); bumpMorale(co, 3); return 'Pizza is pizza.'; }],
    ['No', (s, co) => { bumpMorale(co, -5); return 'Your staff are grumbling.'; }],
  ],
});
BEV('remote', {
  when: (s, co) => DIGITAL_INDS.includes(co.ind) && headcount(co) >= 3, emoji: '🏠', text: 'Your team asks to work from home.',
  choices: [
    ['Allow it', (s, co) => { bumpMorale(co, 10); return 'Productivity held up and morale soared.'; }],
    ['Back to the office', (s, co) => { bumpMorale(co, -7); return 'There was a lot of sighing at the coffee machine.'; }],
  ],
});
BEV('prime_spot', {
  when: (s, co) => !DIGITAL_INDS.includes(co.ind) && youRun(s, co), emoji: '📍', text: (s, co) => `A landlord offers you a prime spot for a new ${indOf(co).place} at 40% off.`,
  choices: [
    ['Grab it', (s, co) => { const c = Math.round(price(s, indOf(co).locBuild) * 0.6); if (co.cash < c) return { text: "The company didn't have the cash.", tone: 'bad' }; spendCo(co, c); co.locations++; tally(s, 'locationsOpened'); return { text: `You opened a new ${indOf(co).place} for ${fmtMoney(c)}. Hire staff to fill it.`, tone: 'good' }; }],
    ['Pass', () => 'You passed on the location.'],
  ],
});
BEV('activist', {
  when: (s, co) => co.public, emoji: '📢', text: (s, co) => `An activist investor bought a big stake in ${co.ticker} and is demanding changes.`,
  choices: [
    ['Cut costs', (s, co) => { for (const r of ['ops', 'sales', 'marketing', 'rnd']) layOff(s, co, r, Math.floor(co.team[r].n * 0.08)); co.sent = clamp(co.sent * 1.08, 0.3, 3); return 'Wall Street cheered the layoffs. Your staff did not.'; }],
    ['Buy back shares', (s, co) => { const amt = Math.round(Math.max(0, co.cash) * 0.3); spendCo(co, amt); co.sent = clamp(co.sent * 1.06, 0.3, 3); return `The company spent ${fmtMoney(amt)} buying back its own stock.`; }],
    ['Fight them', (s, co) => { if (chance(0.4 + co.equity)) return { text: 'Shareholders voted with you. The activist sold out.', tone: 'good' }; co.sent = clamp(co.sent * 0.9, 0.3, 3); return { text: 'The fight was ugly and public. The stock slid.', tone: 'bad' }; }],
  ],
});
BEV('expose', {
  w: 0.7, when: (s, co) => M(s).karma < 35 && co.ceo === 'you', emoji: '📰', text: (s, co) => `A newspaper published an exposé about how you run ${co.name}.`,
  choices: [
    ['Apologize and promise change', (s, co) => { co.rep = clamp100(co.rep - 4); add(s, { karma: 3 }); return 'The apology tour was humbling.'; }],
    ['Deny everything', (s, co) => { co.rep = clamp100(co.rep - 10); if (co.public) co.sent = clamp(co.sent * 0.88, 0.3, 3); return { text: 'Nobody believed you.', tone: 'bad' }; }],
    ['Sue the newspaper', (s, co) => { spendCo(co, evCost(s, co, 80000)); if (chance(0.3)) return { text: 'They printed a retraction.', tone: 'good' }; co.rep = clamp100(co.rep - 8); return { text: 'You lost, and the lawsuit made it a bigger story.', tone: 'bad' }; }],
  ],
});
BEV('big_client', {
  when: isInd(B2B_INDS), emoji: '🤝', text: 'A huge client wants to sign a long-term contract.',
  choices: [
    ['Sign it', (s, co) => { const v = Math.round(Math.max(evCost(s, co, 80000), (co.last ? co.last.revenue : 0) * 0.2)); co.cash += v; bumpMorale(co, -4); co.rep = clamp100(co.rep + 3); return { text: `The contract brought in ${fmtMoney(v)}. Your team is stretched thin.`, tone: 'good' }; }],
    ['Negotiate harder', (s, co) => { if (chance(0.5 + skill(s, 'business') / 300)) { const v = Math.round(Math.max(evCost(s, co, 120000), (co.last ? co.last.revenue : 0) * 0.3)); co.cash += v; return { text: `You negotiated a better rate. ${fmtMoney(v)}.`, tone: 'good' }; } return { text: 'They walked away.', tone: 'bad' }; }],
    ['Decline', () => 'Not every client is worth it.'],
  ],
});
BEV('hit', {
  w: 0.8, when: (s, co) => co.products.some((p) => p.q >= 75 && s.year - p.year <= 2), emoji: '🔥',
  text: (s, co) => `“${co.products.filter((p) => p.q >= 75).slice(-1)[0].name}” is flying off the shelves.`,
  auto: (s, co) => { co.rep = clamp100(co.rep + 5); const v = Math.round((co.last ? co.last.revenue : evCost(s, co, 50000)) * 0.1); co.cash += v; return `An extra ${fmtMoney(v)} in sales.`; },
});
BEV('quiet_year', { w: 1.5, emoji: '📈', text: 'A steady, uneventful year.', auto: () => '' });
