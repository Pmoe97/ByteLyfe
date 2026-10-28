/* =====================================================================
 * 83-operation.js — the drug business, as a business, and what it does to
 * the people in it. Behind the Mature and Substances switches (off by
 * default, 18+); the violent options also need Violence. Everything here is
 * odds, money and consequences. Nothing says how anything is made or done,
 * and nothing makes it look like a good idea.
 *
 *   The operation   You start with a few corners (the underworld's dealer ladder, 39-underworld.js) and
 *                   build a business: a product, turf, a supply (buy it, or make it at a site of your own),
 *                   a crew of real people with a role each, and a rival who wants the same blocks. Each year
 *                   the books come in, the heat goes up, and something happens. It climbs from a corner crew
 *                   to a cartel.
 *   The people      Crew are people in your life (relationship 'crew'). They are paid, they get loyal or
 *                   resentful, they get arrested, and one of them may talk. What they know is a case.
 *   The harm        Somebody dies of what you sold, sooner or later. The city notices. You carry it.
 *   Behind bars     (Violence) A prison gang has ranks, orders and wars, and a way out that is not easy.
 *
 * M(s).op = { name, since, product, supply: 'buy' | 'make', site: null | { kind, name }, turf, crew: [{ pid, role,
 *            loyalty, since }], rep, heat, take, last: { gross, net }, rival: null | { name, str }, sec,
 *            deaths, busts, cartel? }
 *   rep    0-100, street standing: 15 a crew, 40 a network, 65 a distribution empire, 85 a cartel
 * M(s).prison.rank (0-3) when you are in a gang: Associate, Soldier, Enforcer, Shot caller
 * ===================================================================== */

const OP_TAGS = ['mature', 'mature_substances'];
const OP_VIO = ['mature', 'mature_violence'];
function opOn() { return tagsOn(OP_TAGS); }
function opViolent() { return tagsOn(OP_VIO); }
function opOf(s) { return M(s).op || null; }
CRIMES.manufacturing = { name: 'Drug manufacturing', minAge: 16, sentence: [8, 30], conviction: 0.85, karma: -16, felony: true, verb: 'drug manufacturing' }; // not a Crime-menu crime
INV_PROFILE.trafficking = [12, 40, 45, 'drugs'];
INV_PROFILE.manufacturing = [30, 25, 30, 'drugs'];
Object.assign(KIN_LABELS, { crew: ['Crew', 'Crew', 'Crew'] });
REL_GROUPS.find((g) => g.id === 'other').kinds.push('crew');
Object.assign(REL_DECAY, { crew: 0 });

const OP_STAGES = ['A few corners', 'A crew', 'A network', 'A distribution empire', 'A cartel'];
const OP_STAGE_AT = [0, 15, 40, 65, 85];
const OP_CAP = [2, 4, 6, 8, 10]; // turf blocks and crew, by stage
const OP_PRODUCTS = {
  weed: { name: 'cannabis', stage: 0, yield: 12000, buy: 0.55, heat: 1.0, harm: 0.15, site: 'grow' },
  pills: { name: 'pills', stage: 1, yield: 30000, buy: 0.6, heat: 1.4, harm: 0.8, site: 'lab' },
  partydrugs: { name: 'party drugs', stage: 1, yield: 35000, buy: 0.55, heat: 1.4, harm: 0.7, site: 'lab' },
  cocaine: { name: 'cocaine', stage: 2, yield: 80000, buy: 0.65, heat: 2.0, harm: 1.0, site: 'superlab' },
  opioids: { name: 'opioids', stage: 3, yield: 70000, buy: 0.6, heat: 2.4, harm: 1.5, site: 'superlab' },
};
const OP_SITES = {
  grow: { name: 'A grow room', emoji: '🌱', cost: 8000, cap: 3, risk: 0.04, upkeep: 2000, stage: 0, places: ['a spare unit above a shop', 'a rented house at the edge of town', 'a quiet industrial unit'] },
  lab: { name: 'A back-room lab', emoji: '⚗️', cost: 40000, cap: 5, risk: 0.08, upkeep: 8000, stage: 1, places: ['an old barn', 'a rented workshop', 'a farmhouse off a gravel road'] },
  superlab: { name: 'A hidden production site', emoji: '🏭', cost: 250000, cap: 9, risk: 0.1, upkeep: 40000, stage: 2, places: ['a warehouse unit with the windows painted over', 'a disused plant', 'a compound with a very tall fence'] },
};
const OP_ROLES = {
  runner: { name: 'Runner', emoji: '🏃', pay: 12000, blurb: 'Moves product and takes money. More blocks served.' },
  producer: { name: 'Producer', emoji: '🧪', pay: 30000, blurb: 'Makes what you make. Better quality, if you have a site.' },
  muscle: { name: 'Muscle', emoji: '💪', pay: 20000, blurb: 'Holds the blocks. Counts in a fight with a rival.' },
  bookkeeper: { name: 'Bookkeeper', emoji: '📒', pay: 35000, blurb: 'Keeps the numbers clean. The heat comes down.' },
  lookout: { name: 'Lookout', emoji: '👀', pay: 8000, blurb: 'Sees it coming. A raid is less likely to catch you.' },
};
const OP_NAME_A = ['Eastside', 'Harbor', 'Northgate', 'Old Town', 'Ironbridge', 'Southline', 'Riverside', 'The Quarter'];
const OP_NAME_B = ['Outfit', 'Crew', 'Syndicate', 'Brothers', 'Collective', 'Firm'];
const OP_RIVALS = ['the Pale Hand', 'the Cinder Boys', 'Los Halcones', 'the Dock Street Firm', 'the Marlowe Brothers', 'the Night Market', 'the Blue Door Crew'];
defSecretKind('operation', {
  sev: 5, icon: '📦',
  mine: () => 'what you really do for a living',
  rumor: (s, sec) => `${webName(s, sec.subj)} is running something, and it is not a business`,
  tipOdds: (s) => { const o = opOf(s); return o ? 0.01 + o.heat / 800 : 0; },
  expose: (s) => { if (opOf(s)) { opRaid(s, 'tip'); return ' The police have a warrant.'; } return ''; },
});

function opStage(o) { let st = 0; for (let i = 0; i < OP_STAGE_AT.length; i++) if (o.rep >= OP_STAGE_AT[i]) st = i; return st; }
function opCrewOf(s, role) { return opOf(s).crew.filter((c) => (!role || c.role === role) && s.people[c.pid] && s.people[c.pid].alive); }
function opSite(o) { return o.site ? OP_SITES[o.site.kind] : null; }
function opMakes(o) { const site = opSite(o); return !!site && o.supply === 'make' && OP_PRODUCTS[o.product].site === o.site.kind; }
function opPayroll(s, o) { return opCrewOf(s).reduce((a, c) => a + price(s, OP_ROLES[c.role].pay), 0); }
function hasFelonyRecord(s) { return M(s).record.some((r) => CRIMES[r.crime] && CRIMES[r.crime].felony); }
function opCanStart(s) { return free(s) && A(s) >= 18 && opOn() && !opOf(s) && (!!(M(s).uw && M(s).uw.dealer) || skill(s, 'streetwise') >= 30 || hasFelonyRecord(s)); }

/* ---- starting ----------------------------------------------------------------------------------------------- */
defAction({
  id: 'op_start', cat: 'mob', label: 'Build an operation', emoji: '📦', desc: 'A crew, some blocks and a supply. It pays well, and it ends badly more often than not.', tags: OP_TAGS,
  when: (s) => opCanStart(s),
  sub: (s) => `Start-up ${fmtMoney(price(s, 5000))}`,
  run: (s) => {
    const cost = price(s, 5000);
    popup(s, {
      emoji: '📦', title: 'What do you move?', text: 'Every one of these has customers, and every customer is a person. Think about what you are putting in front of them.', handler: 'opStart', ctx: {},
      choices: ['weed'].map((id) => ({ label: `Start with ${OP_PRODUCTS[id].name}`, value: id, sub: fmtMoney(cost), disabled: M(s).money < cost })).concat([{ label: 'Never mind', value: null }]),
    });
  },
});
onChoice('opStart', (s, ctx, id) => {
  if (!id || !opCanStart(s)) return;
  const cost = price(s, 5000);
  if (!pay(s, cost)) return cantAfford(cost);
  const name = `${pick(OP_NAME_A)} ${pick(OP_NAME_B)}`;
  const o = M(s).op = { name, since: s.year, product: id, supply: 'buy', site: null, turf: 1, crew: [], rep: 5, heat: 6, take: 0, last: { gross: 0, net: 0 }, rival: null, sec: null, deaths: 0, busts: 0 };
  o.sec = webNewSecret(s, 'operation', s.playerId, { ev: 14, sev: 5 }).id;
  const u = uw(s);
  if (!u.dealer) u.dealer = { rank: 0, rep: 0, cartel: '' };
  tally(s, 'opStarted');
  return { text: `${name} is open for business, which is to say it is one person, one product and a phone you do not use for anything else. It will ask you for a decision every year.`, emoji: '📦' };
});

/* ---- actions: crew, turf, supply, products -------------------------------------------------------------------- */
const opAct = (s) => free(s) && !!opOf(s) && opOn();
defAction({
  id: 'op_hire', cat: 'mob', label: 'Bring someone in', emoji: '🤝', desc: 'A runner, a producer, muscle, a bookkeeper or a lookout.', tags: OP_TAGS,
  when: (s) => opAct(s) && opCrewOf(s).length < OP_CAP[opStage(opOf(s))] && !count(s, 'op_hire'),
  sub: (s) => `${opCrewOf(s).length} of ${OP_CAP[opStage(opOf(s))]} · payroll ${fmtMoney(opPayroll(s, opOf(s)))} a year`,
  run: (s) => {
    popup(s, {
      emoji: '🤝', title: 'Who do you need?', handler: 'opHire', ctx: {}, text: 'Everyone you bring in knows something about you, and wants something from you. Both of those get bigger.',
      choices: Object.keys(OP_ROLES).filter((r) => r !== 'producer' || opMakes(opOf(s))).map((r) => ({ label: `${OP_ROLES[r].emoji} ${OP_ROLES[r].name}`, value: r, sub: `${OP_ROLES[r].blurb} ${fmtMoney(price(s, OP_ROLES[r].pay))} a year.` })).concat([{ label: 'Never mind', value: null }]),
    });
  },
});
onChoice('opHire', (s, ctx, role) => {
  const o = opOf(s);
  if (!role || !o || !OP_ROLES[role] || opCrewOf(s).length >= OP_CAP[opStage(o)]) return;
  bump(s, 'op_hire');
  // Somebody you already know, or somebody who knows somebody.
  const known = relPeople(s, ['friend', 'bestie', 'cellmate', 'classmate', 'dealer']).filter((p) => ageOf(s, p) >= 19 && ageOf(s, p) <= 55 && !o.crew.some((c) => c.pid === p.id));
  const p = known.length && chance(0.4) ? pick(known) : makeAdultNear(s, { minAge: 19, maxAge: 50 });
  const was = relKind(s, p.id);
  setRel(s, p.id, 'crew', relOf(s, p.id) ? Math.max(relOf(s, p.id).rel, 50) : 52);
  o.crew.push({ pid: p.id, role, loyalty: clamp100(50 + (was ? 12 : 0) + (relOf(s, p.id).rel - 50) / 3), since: s.year });
  addSkill(s, 'streetwise', 1);
  return { text: `${fullName(p)} is in, as ${aAn(OP_ROLES[role].name.toLowerCase())}. ${was ? `You have known ${pr(p).him} a while, which is a help and also a risk.` : `${cap(pr(p).he)} came recommended by somebody you trust less than you should.`}`, emoji: OP_ROLES[role].emoji };
});
defAction({
  id: 'op_supply', cat: 'mob', label: 'Change the supply', emoji: '🚚', desc: 'Buy what you sell, or make it at a site of your own. Making it pays better and is a different kind of crime.', tags: OP_TAGS,
  when: (s) => opAct(s) && !count(s, 'op_supply'),
  sub: (s) => { const o = opOf(s); return o.site ? `${OP_SITES[o.site.kind].name} · ${opMakes(o) ? 'making it' : 'buying'}` : 'Buying'; },
  run: (s) => {
    const o = opOf(s), st = opStage(o), prod = OP_PRODUCTS[o.product], need = prod.site, site = OP_SITES[need];
    const choices = [];
    if (!o.site || o.site.kind !== need) choices.push({ label: `${site.emoji} Set up ${site.name.toLowerCase()}`, value: 'build', sub: `${fmtMoney(price(s, site.cost))} · ${prod.name}`, disabled: M(s).money < price(s, site.cost) || st < site.stage });
    if (o.site && o.site.kind === need) choices.push({ label: opMakes(o) ? 'Go back to buying it' : `Make it at ${o.site.name}`, value: 'toggle' });
    if (o.site) choices.push({ label: 'Shut the site', value: 'close', tone: 'bad' });
    choices.push({ label: 'Leave it', value: null });
    popup(s, { emoji: '🚚', title: 'Where does it come from?', text: `${o.supply === 'make' && o.site ? 'You make it yourself, at ' + o.site.name + '.' : 'You buy it from someone you do not control.'} Buying means a supplier who can raise the price or disappear. Making it means a site that can be found, and a bigger charge when it is.`, handler: 'opSupply', ctx: {}, choices });
  },
});
onChoice('opSupply', (s, ctx, v) => {
  const o = opOf(s);
  if (!o || !v) return;
  bump(s, 'op_supply');
  const prod = OP_PRODUCTS[o.product], site = OP_SITES[prod.site];
  if (v === 'build') {
    const cost = price(s, site.cost);
    if (opStage(o) < site.stage) return 'You are not big enough to run one of those yet.';
    if (!pay(s, cost)) return cantAfford(cost);
    o.site = { kind: prod.site, name: pick(site.places) };
    o.supply = 'make';
    return { text: `You took ${o.site.name}. It looks like nothing from the road, which is the point. It is going to be a lot of work to keep looking like nothing.`, tone: '' };
  }
  if (v === 'toggle') { o.supply = o.supply === 'make' ? 'buy' : 'make'; return o.supply === 'make' ? 'You started making it yourself. The margins are better. So is the risk.' : 'You went back to buying. A little safer and a lot more expensive.'; }
  if (v === 'close') { o.site = null; o.supply = 'buy'; return 'You shut the site and walked away from it. Somebody else will find it before long.'; }
});
defAction({
  id: 'op_product', cat: 'mob', label: 'Change what you move', emoji: '💊', desc: 'The harder the product, the more it pays, the hotter it gets, and the more it costs other people.', tags: OP_TAGS,
  when: (s) => opAct(s) && !count(s, 'op_product'),
  sub: (s) => `Now: ${OP_PRODUCTS[opOf(s).product].name}`,
  run: (s) => {
    const o = opOf(s), st = opStage(o);
    popup(s, {
      emoji: '💊', title: 'What do you move?', text: 'You can only move what you are big enough for. The customers do not get a vote, and they are the ones who will pay for it.', handler: 'opProduct', ctx: {},
      choices: Object.keys(OP_PRODUCTS).map((id) => ({ label: `${OP_PRODUCTS[id].name[0].toUpperCase()}${OP_PRODUCTS[id].name.slice(1)}${o.product === id ? ' (now)' : ''}`, value: id, sub: `${fmtMoney(price(s, OP_PRODUCTS[id].yield))} a block · heat x${OP_PRODUCTS[id].heat}`, disabled: OP_PRODUCTS[id].stage > st || o.product === id })).concat([{ label: 'Stay as you are', value: null }]),
    });
  },
});
onChoice('opProduct', (s, ctx, id) => {
  const o = opOf(s);
  if (!o || !id || !OP_PRODUCTS[id] || OP_PRODUCTS[id].stage > opStage(o)) return;
  bump(s, 'op_product');
  o.product = id;
  if (o.site && OP_PRODUCTS[id].site !== o.site.kind) o.supply = 'buy'; // the site makes something else
  return `${o.name} moves ${OP_PRODUCTS[id].name} now. ${OP_PRODUCTS[id].harm >= 1 ? 'It pays more. People are going to be hurt by it, and you know it.' : 'It is a different crowd, and a different kind of trouble.'}`;
});
defAction({
  id: 'op_out', cat: 'mob', label: 'Get out', emoji: '🚪', desc: 'Close it down. Some people do not let you.', tags: OP_TAGS,
  when: (s) => opAct(s),
  run: (s) => {
    popup(s, { emoji: '🚪', title: 'Close it down?', text: 'The crew will want to know what happens to them. Your rival will want to know what happens to the blocks.', handler: 'opOut', ctx: {}, choices: [{ label: 'Close it, and pay everyone off', value: 'pay', sub: `${fmtMoney(opPayroll(s, opOf(s)))}`, disabled: M(s).money < opPayroll(s, opOf(s)) }, { label: 'Walk away', value: 'walk' }, { label: 'Never mind', value: null }] });
  },
});
onChoice('opOut', (s, ctx, v) => {
  const o = opOf(s);
  if (!o || !v) return;
  if (v === 'pay') { const c = opPayroll(s, o); if (!pay(s, c)) return cantAfford(c); for (const m of o.crew) if (relOf(s, m.pid)) setRel(s, m.pid, 'friend', 55); add(s, { karma: 2, happy: 4 }); opEnd(s, 'closed'); return { text: 'You paid everyone what they were owed, and told them to find something else. Most of them did. It was the cleanest ending anyone in this business gets.', tone: 'good' }; }
  // Walking away leaves loose ends.
  for (const m of o.crew) if (chance(0.4) && s.people[m.pid]) { addRel(s, m.pid, -25); m.loyalty = 5; }
  add(s, { happy: 2 });
  const sec = webOf(s).secrets[o.sec];
  if (sec) sec.ev = clamp100(sec.ev + 15);
  const tip = o.crew.length && chance(0.3);
  opEnd(s, 'walked away');
  return { text: `You stopped answering the phone. The blocks went to someone else within a week.${tip ? ' Somebody who used to work for you is already talking to a detective.' : ''}`, tone: tip ? 'bad' : '' };
});
function opEnd(s, how) {
  const o = opOf(s);
  if (!o) return;
  const sec = webOf(s).secrets[o.sec];
  if (sec && !sec.out) delete webOf(s).secrets[o.sec];
  for (const m of o.crew) if (s.people[m.pid] && relKind(s, m.pid) === 'crew') setRel(s, m.pid, 'friend', 40);
  const d = schemeOf(s);
  d.done.push({ kind: 'operation', year: s.year, how, amt: o.take });
  if (d.done.length > 12) d.done.shift();
  M(s).op = null;
}

/* ---- the year ---------------------------------------------------------------------------------------------------- */
function opBooks(s, o) {
  const prod = OP_PRODUCTS[o.product], site = opSite(o), making = opMakes(o);
  const runners = opCrewOf(s, 'runner').length, producers = opCrewOf(s, 'producer').length;
  const blocks = making ? Math.min(o.turf, site.cap) : o.turf;
  let quality = 50 + producers * 12 + skill(s, 'streetwise') / 5 + (making ? 8 : 0);
  quality = clamp100(quality + (o.quality || 0));
  const gross = Math.round(blocks * price(s, prod.yield) * (0.5 + 0.15 * Math.min(runners, 4)) * (0.6 + quality / 150) * randFloat(0.8, 1.25) * (o.rival && o.war ? 0.7 : 1));
  const cost = Math.round(gross * (making ? 0.22 : prod.buy) + (making ? price(s, site.upkeep) : 0));
  const pay0 = opPayroll(s, o);
  return { gross, cost, pay: pay0, net: gross - cost - pay0, blocks, quality };
}
function opYear(s) {
  const o = opOf(s);
  if (!o) return;
  if (!opOn() || A(s) < 18) return; // a switch was turned off: the business waits
  if (inPrison(s)) { opEnd(s, 'jailed'); return; }
  if (s.pending.some((p) => /^op[A-Z]/.test(p.handler || ''))) return;
  const prod = OP_PRODUCTS[o.product];
  const b = opBooks(s, o);
  o.last = { gross: b.gross, net: b.net };
  add(s, { money: b.net, karma: -2 });
  o.take += Math.max(0, b.net);
  o.rep = clamp100(o.rep + (b.net > 0 ? Math.min(6, 2 + Math.round(b.net / price(s, 120000))) : -4));
  // Heat: money that moves is noticed, and the harder the product the more it is.
  const bk = opCrewOf(s, 'bookkeeper').length, look = opCrewOf(s, 'lookout').length;
  // Size is what gets noticed: a corner fades, a pill operation holds, a cocaine network only runs hotter.
  o.heat = clamp100(o.heat + Math.round(prod.heat * (2 + 2.2 * Math.sqrt(b.gross / price(s, 80000)))) - 7 - bk * 5 - look * 2);
  const sec = webOf(s).secrets[o.sec];
  if (sec) sec.ev = clamp100(sec.ev + Math.round(o.heat / 10));
  opCrewYear(s, o);
  if (s.dead) return;
  // The year's trouble, one thing at a time.
  const st = opStage(o);
  if (st >= 1 && !o.rival && chance(0.25 + st * 0.03)) o.rival = { name: pick(OP_RIVALS), str: randInt(30, 70) };
  if (opSite(o) && opMakes(o) && chance(opSite(o).risk * (1 + o.heat / 100))) { opSiteTrouble(s, o); return; }
  const raid = (o.heat / 190) * (1 - look * 0.12);
  if (chance(clamp(raid, 0, 0.5))) { opRaid(s, 'police'); return; }
  if (o.rival && chance(0.55)) { opRivalMove(s, o); return; }
  if (chance(clamp(0.035 * prod.harm * o.turf / 2 + (o.quality < -5 ? 0.03 : 0), 0, 0.2))) { opDeath(s, o); return; }
  if (st >= 4 && chance(0.3)) { opCartelTrouble(s, o); return; }
  if (!opCrewOf(s).length && o.crew.length) o.crew = [];
  opTurn(s, o, b);
}
// The year's decision: grow, hold or get out.
function opTurn(s, o, b) {
  const st = opStage(o), cap = OP_CAP[st];
  const expand = o.turf < cap, hot = o.heat >= 55;
  popup(s, {
    emoji: '📦', title: o.name, handler: 'opTurn', ctx: {},
    text: `${OP_STAGES[st]}. ${fmtMoney(b.gross)} came in, ${fmtMoney(b.cost + b.pay)} went out: ${b.net >= 0 ? 'you cleared' : 'you lost'} ${fmtMoney(Math.abs(b.net))}. ${hot ? 'Heat is high, and people are starting to talk.' : o.heat >= 30 ? 'There is some heat.' : 'Quiet, for now.'}${o.rival ? ` ${cap(o.rival.name)} is leaning on the edges.` : ''}`,
    choices: [
      { label: 'Take more blocks', value: 'expand', sub: expand ? `${o.turf} of ${cap} · more money, more heat` : 'You are as big as you are going to get', disabled: !expand },
      { label: 'Hold steady and keep quiet', value: 'hold', sub: 'Heat comes down' },
      { label: 'Pay for friends', value: 'bribe', sub: `${fmtMoney(price(s, 25000))} · heat down a lot, and now someone has something on you` , disabled: M(s).money < price(s, 25000), tone: 'bad' },
      { label: 'Raise quality', value: 'quality', sub: `${fmtMoney(price(s, 15000))} · better product, better rep`, disabled: M(s).money < price(s, 15000) },
    ],
  });
}
onChoice('opTurn', (s, ctx, v) => {
  const o = opOf(s);
  if (!o) return;
  if (v === 'expand') {
    if (o.turf >= OP_CAP[opStage(o)]) return;
    o.turf++; o.heat = clamp100(o.heat + 6); o.rep = clamp100(o.rep + 3);
    return `You took another block. It is a few more people who owe you, and a few more who would like you to stop.`;
  }
  if (v === 'bribe') {
    const c = price(s, 25000);
    if (!pay(s, c)) return cantAfford(c);
    o.heat = clamp100(o.heat - 28);
    const sec = webOf(s).secrets[o.sec];
    if (sec) sec.ev = clamp100(sec.ev + 6);
    webNewSecret(s, 'crime', s.playerId, { crime: 'bribery', sev: 3, ev: 28 });
    return { text: `An envelope went somewhere, and the phone got quiet. Somebody now owns a little of you, and it will go up.`, tone: 'bad' };
  }
  if (v === 'quality') {
    const c = price(s, 15000);
    if (!pay(s, c)) return cantAfford(c);
    o.quality = Math.min(25, (o.quality || 0) + 8); o.rep = clamp100(o.rep + 3);
    return 'You paid for better, and the street noticed. Fewer problems, and a few more regulars.';
  }
  o.heat = clamp100(o.heat - 12);
  return 'You kept your head down, and your phone off, and your people away from the corners for a few weeks. It cost you some money, and it was worth it.';
});

/* ---- the crew ----------------------------------------------------------------------------------------------------- */
function opCrewYear(s, o) {
  o.crew = o.crew.filter((m) => s.people[m.pid] && s.people[m.pid].alive);
  for (const m of o.crew.slice()) {
    const p = s.people[m.pid];
    m.loyalty = clamp100(m.loyalty + randInt(-4, 3) + (b2(o) ? 1 : -3));
    if (relOf(s, p.id)) relOf(s, p.id).rel = clamp100(relOf(s, p.id).rel + (m.loyalty >= 60 ? 1 : -2));
    // Somebody gets picked up, and the question is what they say.
    if (chance(0.03 + o.heat / 1500)) { opCrewBusted(s, o, m); continue; }
    if (m.loyalty <= 12 && chance(0.4)) {
      o.crew = o.crew.filter((x) => x !== m);
      if (relOf(s, p.id)) setRel(s, p.id, 'enemy', 4);
      o.heat = clamp100(o.heat + 20);
      const c = invOpen(s, 'trafficking', { messy: true, ev: { wit: 30 } });
      c.prog = clamp(c.prog + 25, 0, 90);
      log(s, `🗂️ ${p.first} stopped answering, and then ${pr(p).he} started talking, to a detective. ${cap(pr(p).he)} knew a lot.`, 'bad');
      webFact(s, 'betrayed', { pid: p.id });
    }
  }
}
const b2 = (o) => o.last && o.last.net > 0;
function opCrewBusted(s, o, m) {
  const p = s.people[m.pid];
  o.crew = o.crew.filter((x) => x !== m);
  if (chance(0.7 - m.loyalty / 160)) {
    o.heat = clamp100(o.heat + 18);
    const c = invOpen(s, 'trafficking', { messy: true, ev: { wit: 28 } });
    c.prog = clamp(c.prog + 20, 0, 90);
    if (relOf(s, p.id)) setRel(s, p.id, 'enemy', 4);
    log(s, `🚔 ${p.first} was picked up with product, and gave the police your name to make it go away.`, 'bad');
  } else {
    if (relOf(s, p.id)) setRel(s, p.id, 'friend', 50);
    log(s, `🚔 ${p.first} was picked up with product, and said nothing at all. ${cap(pr(p).he)} is doing ${randInt(2, 6)} years, and owes you nothing. You owe ${pr(p).him} a lot.`, 'bad');
    add(s, { happy: -2 });
  }
}

/* ---- the trouble -------------------------------------------------------------------------------------------------- */
function opRaid(s, how) {
  const o = opOf(s);
  if (!o || s.pending.some((p) => p.handler === 'opRaid')) return;
  const cost = price(s, 40000), look = opCrewOf(s, 'lookout').length;
  popup(s, {
    emoji: '🚨', title: how === 'tip' ? 'A warrant' : 'A raid', handler: 'opRaid', ctx: { how, cost },
    text: how === 'tip' ? 'Somebody talked, and a judge signed. They are at the door.' : look ? 'Your lookout called a minute before the cars arrived. A minute is not much.' : 'They came before dawn, through the front and the back, all at once.',
    choices: [
      { label: 'Let it happen', value: 'open', sub: 'You lose the stash, and some of the crew' },
      { label: 'Call a lawyer, and say nothing', value: 'lawyer', sub: fmtMoney(cost), disabled: M(s).money < cost },
      { label: 'Get rid of what you can', value: 'hide', sub: 'A lot can go wrong' },
      { label: 'Run', value: 'run', tone: 'bad', sub: 'The operation is over either way' },
    ],
  });
}
onChoice('opRaid', (s, ctx, v) => {
  const o = opOf(s);
  if (!o) return;
  o.busts++;
  tally(s, 'opBusts');
  let caught = 0.35 + o.heat / 250 - skill(s, 'streetwise') / 500 - (trait(s, 'cunning') ? 0.08 : 0);
  let text = 'They took boxes, phones and a very long list of names.';
  if (v === 'lawyer') { if (!pay(s, ctx.cost)) return cantAfford(ctx.cost); caught -= 0.15; text = 'Your lawyer made them wait in the hallway, and photographed everything that left.'; }
  if (v === 'hide') { if (chance(clamp(0.35 + skill(s, 'streetwise') / 250, 0.1, 0.75))) { caught -= 0.2; text = 'By the time they got to the second room there was less to find.'; } else { caught += 0.15; text = 'They caught you with your hands full, and added a charge.'; } }
  const crew = opCrewOf(s).length ? opCrewOf(s) : [];
  for (const m of crew) if (chance(0.35)) opCrewBusted(s, o, m);
  o.heat = clamp100(o.heat - 30);
  o.rep = clamp100(o.rep - 12);
  o.turf = Math.max(1, o.turf - 1);
  const sec = webOf(s).secrets[o.sec];
  if (sec) { sec.out = true; sec.outYear = s.year; }
  webRepAdd(P(s), { scandal: 10, name: -8 });
  newsPost(s, 'arrest', { who: fullName(P(s)), verb: 'drug trafficking', det: 'the lead detective' });
  if (v === 'run' || chance(clamp(caught, 0.05, 0.9))) {
    const making = opMakes(o);
    opEnd(s, v === 'run' ? 'ran' : 'raided');
    if (v === 'run') { add(s, { happy: -6 }); if (typeof pzFlee === 'function') pzFlee(s); return { text: 'You left everything on the table and everyone you knew, and drove until the gas ran out. They will find you eventually, or they will not.', tone: 'bad' }; }
    const r = arrest(s, making ? 'manufacturing' : 'trafficking');
    return { text: `${text} ${r && r.text ? r.text : ''}`.trim(), tone: 'bad' };
  }
  return { text: `${text} You were not there for the worst of it, and nobody put you at the scene. For now.`, tone: 'bad' };
});
function opSiteTrouble(s, o) {
  const site = opSite(o);
  popup(s, {
    emoji: site.emoji, title: o.site.name, handler: 'opSite', ctx: {},
    text: pick([`A smell, a neighbor and a phone call. Somebody has been asking about ${o.site.name}.`, `Something went wrong at ${o.site.name} overnight. Nobody died, which is the only good thing anyone is saying about it.`, `A man from the utilities company has been walking around ${o.site.name} with a very unusual interest in the meter.`]),
    choices: [{ label: 'Move everything, at once', value: 'move', sub: fmtMoney(price(s, site.cost / 2)), disabled: M(s).money < price(s, site.cost / 2) }, { label: 'Shut it and lay low', value: 'close' }, { label: 'Keep going', value: 'go', tone: 'bad' }],
  });
}
onChoice('opSite', (s, ctx, v) => {
  const o = opOf(s);
  if (!o || !o.site) return;
  const site = opSite(o);
  if (v === 'move') { const c = price(s, site.cost / 2); if (!pay(s, c)) return cantAfford(c); o.site.name = pick(site.places); o.heat = clamp100(o.heat - 10); return 'You moved it all in a night, to somewhere that looks like nothing. For a while, nobody asked about the old place.'; }
  if (v === 'close') { o.site = null; o.supply = 'buy'; o.heat = clamp100(o.heat - 15); return 'You shut it down and cleaned it out. You are buying again, at someone else\'s price.'; }
  if (chance(0.5)) { add(s, { health: -randInt(6, 18), happy: -3 }); o.heat = clamp100(o.heat + 20); return { text: 'There was a fire in the night. It was small, and it was in the wrong building, and now there are fire engines and a report.', tone: 'bad' }; }
  o.heat = clamp100(o.heat + 10);
  return { text: 'You kept going. Nothing happened, which you are starting to find more worrying than if it had.', tone: 'bad' };
});
function opRivalMove(s, o) {
  const r = o.rival || (o.rival = { name: pick(OP_RIVALS), str: randInt(30, 70) }), muscle = opCrewOf(s, 'muscle').length;
  const choices = [
    { label: 'Pay them off', value: 'pay', sub: fmtMoney(price(s, 30000)), disabled: M(s).money < price(s, 30000) },
    { label: 'Sit down and negotiate', value: 'talk', sub: `${Math.round(clamp(0.4 + skill(s, 'charisma') / 250 + (trait(s, 'charming') ? 0.08 : 0), 0.1, 0.8) * 100)}%` },
  ];
  if (opViolent()) choices.push({ label: 'Fight for the blocks', value: 'fight', tone: 'bad', sub: `${muscle} muscle, ${r.str} against` });
  choices.push({ label: 'Give up a block', value: 'cede' });
  popup(s, { emoji: '⚔️', title: cap(r.name), handler: 'opRival', ctx: {}, text: `${cap(r.name)} want your blocks, and they have started to say so. A window, a message and, last night, a very polite visit to someone on your crew.`, choices });
}
onChoice('opRival', (s, ctx, v) => {
  const o = opOf(s);
  if (!o || !o.rival) return;
  const r = o.rival;
  if (v === 'pay') { const c = price(s, 30000); if (!pay(s, c)) return cantAfford(c); o.war = false; r.str = Math.max(20, r.str - 5); return 'You paid for quiet, and got it. It is a price that goes up every time you pay it.'; }
  if (v === 'talk') {
    if (chance(clamp(0.4 + skill(s, 'charisma') / 250 + (trait(s, 'charming') ? 0.08 : 0), 0.1, 0.8))) { o.rival = null; o.war = false; o.rep = clamp100(o.rep + 4); return { text: `You and ${r.name} split the city on a napkin. It is a truce, which is not the same as peace.`, tone: 'good' }; }
    o.turf = Math.max(1, o.turf - 1);
    return { text: `${cap(r.name)} did not like what they heard, and a block moved the next week.`, tone: 'bad' };
  }
  if (v === 'cede') { o.turf = Math.max(1, o.turf - 1); o.rep = clamp100(o.rep - 5); o.heat = clamp100(o.heat - 5); return 'You gave up a block, and a few people started to say your name in a different voice.'; }
  // fight: odds, losses, and no detail
  const muscle = opCrewOf(s, 'muscle').length;
  const win = chance(clamp(0.4 + muscle * 0.1 + skill(s, 'martial') / 400 + skill(s, 'streetwise') / 400 - (r.str - 50) / 200, 0.1, 0.85));
  add(s, { karma: -8 });
  o.war = true;
  o.heat = clamp100(o.heat + 20);
  webUneaseAdd(s, 3);
  webFact(s, 'assault', {});
  if (typeof vioHaunt === 'function') vioHaunt(s, 6);
  const m = opCrewOf(s).filter((x) => x.role === 'muscle' || x.role === 'runner');
  if (win) { o.rival = null; o.war = false; o.turf = Math.min(OP_CAP[opStage(o)], o.turf + 1); o.rep = clamp100(o.rep + 8); invOpen(s, 'assault', { who: s.playerId, ev: { wit: 25 } }); return { text: `It was loud for a week, and then ${r.name} were not on the corners any more. Someone on your crew is in the hospital. You do not ask about theirs.`, tone: 'bad' }; }
  add(s, { health: -randInt(8, 20), happy: -5 });
  o.turf = Math.max(1, o.turf - 1);
  if (m.length && chance(0.5)) { const dead = pick(m); o.crew = o.crew.filter((x) => x !== dead); if (chance(0.3) && s.people[dead.pid]) npcDies(s, s.people[dead.pid], 'killed in a turf fight', { murdered: true }); }
  return { text: `It did not go your way. You lost a block, and someone from the crew, and a piece of whatever you had told yourself about how this works.`, tone: 'bad' };
});
function opDeath(s, o) {
  const prod = OP_PRODUCTS[o.product];
  o.deaths++;
  tally(s, 'opDeaths');
  webUneaseAdd(s, 1.5);
  webFact(s, 'victim', { pid: null, harm: 'death' });
  webRepAdd(P(s), { scandal: 3 });
  popup(s, {
    emoji: '🕯️', title: 'Somebody died', handler: 'opDeath', ctx: {},
    text: `A young person died in ${P(s).city} last week, with ${prod.name} in their system. You do not know if it came from you. You know it could have. Everyone on your crew is looking at their shoes.`,
    choices: [
      { label: 'Change something: better supply, smaller blocks', value: 'fix', sub: 'Less money, a bit less of a problem' },
      { label: 'Go to the funeral', value: 'funeral' },
      { label: 'Say nothing, and carry on', value: 'on', tone: 'bad' },
      { label: 'Get out', value: 'out' },
    ],
  });
}
onChoice('opDeath', (s, ctx, v) => {
  const o = opOf(s);
  if (!o) return;
  const haunt = (n) => { if (typeof vioHaunt === 'function' && opViolent()) vioHaunt(s, n); };
  if (v === 'out') { add(s, { karma: 4, happy: -3 }); haunt(8); opEnd(s, 'quit after a death'); return { text: 'You closed it that week. It did not undo anything. It stopped the next one, though, and that is the only credit you get.', tone: 'good' }; }
  if (v === 'fix') { o.turf = Math.max(1, o.turf - 1); o.quality = Math.min(25, (o.quality || 0) + 10); add(s, { karma: 3, happy: -3 }); haunt(6); return 'You cut back and cleaned up the supply. It will cost you. It might have made the difference, next time.'; }
  if (v === 'funeral') { add(s, { karma: 2, happy: -6 }); haunt(10); const sec = webLive(s, (x) => x.kind === 'operation' && x.subj === s.playerId)[0]; if (sec) sec.ev = clamp100(sec.ev + 5); return { text: 'You stood at the back. The mother was holding a photograph, and she did not know who you were. It is the longest hour you have spent in this business.', tone: 'bad' }; }
  add(s, { karma: -8, happy: -4 });
  haunt(6);
  o.heat = clamp100(o.heat + 8);
  return { text: 'You carried on, because stopping would have meant looking at it. It is in the books now, and it is in you.', tone: 'bad' };
});
function opCartelTrouble(s, o) {
  const events = [
    ['A government crackdown', 'The ministry announced a "new offensive" against the cartels, with television crews and a map with your region shaded red.', 'lie', 'Every route in the country got hotter overnight.'],
    ['An extradition request', 'A foreign court has asked for you by name. Your lawyers say you are probably safe where you are. "Probably."', 'lawyer', 'It is a very expensive word.'],
    ['A rival cartel', 'A bigger name from the next country over wants your routes, and has sent a message with a very good lawyer attached.', 'deal', 'A truce was brokered, on terms.'],
  ];
  const [title, text, , outcome] = pick(events);
  popup(s, {
    emoji: '🌐', title, handler: 'opCartel', ctx: { outcome },
    text,
    choices: [{ label: 'Hire the best lawyers', value: 'lawyer', sub: fmtMoney(price(s, 150000)), disabled: M(s).money < price(s, 150000) }, { label: 'Go quiet for a year', value: 'quiet' }, { label: 'Pay everyone who needs paying', value: 'pay', sub: fmtMoney(price(s, 400000)), tone: 'bad', disabled: M(s).money < price(s, 400000) }],
  });
}
onChoice('opCartel', (s, ctx, v) => {
  const o = opOf(s);
  if (!o) return;
  if (v === 'lawyer') { const c = price(s, 150000); if (!pay(s, c)) return cantAfford(c); o.heat = clamp100(o.heat - 20); return `${ctx.outcome} The lawyers cost what lawyers cost.`; }
  if (v === 'pay') { const c = price(s, 400000); if (!pay(s, c)) return cantAfford(c); o.heat = clamp100(o.heat - 40); add(s, { karma: -4 }); webNewSecret(s, 'crime', s.playerId, { crime: 'bribery', sev: 3, ev: 35 }); return { text: 'A very large amount of money went to a very large number of people. The heat went somewhere else.', tone: 'bad' }; }
  o.turf = Math.max(1, o.turf - 2); o.heat = clamp100(o.heat - 25); o.rep = clamp100(o.rep - 6);
  return 'You went quiet. It cost you two blocks, and, in a business like this one, a little bit of your name.';
});
// A conviction takes what the operation made, and the paper reports it.
onWebFact('arrested', (s, d) => {
  if (!['trafficking', 'manufacturing'].includes(d.crime)) return;
  const back = Math.round(Math.max(0, M(s).money) * 0.35);
  M(s).money -= back;
  if (back > 0) log(s, `⚖️ The court seized ${fmtMoney(back)} as the proceeds of the business.`, 'bad');
});

/* ---- behind bars: a gang has ranks (Violence) ------------------------------------------------------------------------ */
const GANG_RANKS = ['Associate', 'Soldier', 'Enforcer', 'Shot caller'];
function gangRank(s) { const pr0 = M(s).prison; return pr0 && pr0.gang ? (pr0.rank || 0) : -1; }
const gangOk = (s) => inPrison(s) && !M(s).prison.juvie && !!M(s).prison.gang && A(s) >= 18 && opViolent();
EV('op_gang_order', {
  ages: [18, 120], prison: true, emoji: '📜', title: 'An order', tags: OP_VIO, cooldown: 2, w: 1.5,
  when: (s) => gangOk(s),
  text: (s) => `${cap(M(s).prison.gang)} have a job for you. It comes from a man who has not raised his voice in twenty years, and has not needed to.`,
  choices: [
    ['Do it', (s) => {
      const pr0 = M(s).prison;
      pr0.behavior = clamp100(pr0.behavior - 14); add(s, { karma: -6 }); pr0.rank = Math.min(3, (pr0.rank || 0) + (chance(0.4) ? 1 : 0));
      if (typeof vioHaunt === 'function') vioHaunt(s, 5);
      if (chance(0.3)) { pr0.yearsLeft += randInt(1, 3); pr0.total += 1; return { text: 'It was done, and somebody saw. A hearing, a charge, and more years on the end of what you already had.', tone: 'bad' }; }
      return { text: 'It was done, and nobody saw, and a stranger across the yard will not walk the same way. You are moving up. That is the thing that you feel worst about.', tone: 'bad' };
    }],
    ['Smuggle something in for them', (s) => { const pr0 = M(s).prison; pr0.behavior = clamp100(pr0.behavior - 5); pr0.rank = Math.min(3, (pr0.rank || 0) + (chance(0.3) ? 1 : 0)); if (chance(0.2)) { pr0.yearsLeft += 1; return { text: 'A guard found it. It cost you a year, and you did not give them a name.', tone: 'bad' }; } add(s, { money: price(s, 200) }); return 'It went through without a hitch, and you were paid in a currency that could be spent on the inside.'; }],
    ['Refuse', (s) => { const pr0 = M(s).prison; add(s, { health: -randInt(4, 14), karma: 2 }); pr0.rank = Math.max(0, (pr0.rank || 0) - 1); if (chance(0.3)) { pr0.gang = null; pr0.rank = 0; return { text: 'You said no, and they put it in a way that made it clear what it would cost. You are out, and on your own.', tone: 'bad' }; } return { text: 'You said no. You were hurt for it, and nobody said you were wrong.', tone: '' }; }],
    ['Tell a guard', (s) => { const pr0 = M(s).prison; pr0.behavior = clamp100(pr0.behavior + 8); pr0.gang = null; pr0.rank = 0; add(s, { health: -randInt(0, 10) }); return { text: 'You asked for protective custody, and got it. The gang does not forget, and you are in a small room for a long time.', tone: '' }; }],
  ],
});
EV('op_gang_war', {
  ages: [18, 120], prison: true, emoji: '⚔️', title: 'The yard goes to war', tags: OP_VIO, cooldown: 4, w: 1,
  when: (s) => gangOk(s),
  text: (s) => `${cap(M(s).prison.gang)} and ${pick(GANGS.filter((g) => g !== M(s).prison.gang))} have been circling each other for a week. Today, something gives. Everyone can feel it.`,
  choices: [
    ['Stay in your cell', (s) => { M(s).prison.behavior = clamp100(M(s).prison.behavior + 3); const pr0 = M(s).prison; pr0.rank = Math.max(0, (pr0.rank || 0) - (chance(0.4) ? 1 : 0)); return 'The block was locked down for nine days. You stayed where you were, and nobody forgot who was not in the yard.'; }],
    ['Stand with them', (s) => { const pr0 = M(s).prison; add(s, { health: -randInt(8, 25), karma: -5 }); pr0.behavior = clamp100(pr0.behavior - 15); pr0.rank = Math.min(3, (pr0.rank || 0) + 1); if (typeof vioHaunt === 'function') vioHaunt(s, 5); if (chance(0.35)) pr0.yearsLeft += randInt(1, 4); return { text: 'It was loud, and then it was quiet, and you were on the right side of both. They know your name now, on both sides.', tone: 'bad' }; }],
    ['Ask for a transfer', (s) => { const pr0 = M(s).prison; pr0.behavior = clamp100(pr0.behavior + 2); pr0.gang = null; pr0.rank = 0; pr0.name = pick(PRISON_NAMES.filter((n) => n !== pr0.name)); return 'You asked, and, after a month, they moved you. A new block, a new set of faces, and no friends at all. It is a lot quieter.'; }],
  ],
});
EV('op_gang_jumped', {
  ages: [18, 120], prison: true, emoji: '🧱', title: 'Jumped in the yard', tags: OP_VIO, cooldown: 4, w: 0.8,
  when: (s) => inPrison(s) && !M(s).prison.juvie && A(s) >= 18 && opViolent(),
  text: (s) => `${M(s).prison.gang ? pick(GANGS.filter((g) => g !== M(s).prison.gang)) : 'Three men you do not know'} decided you were a problem. You find out in the middle of the yard, with your back against a fence.`,
  choices: [
    ['Fight back', (s) => { const win = skill(s, 'martial') + skill(s, 'fitness') / 2 + randInt(0, 45) + (M(s).prison.gang ? 15 : 0) > 60; M(s).prison.behavior = clamp100(M(s).prison.behavior - 10); add(s, { health: win ? -randInt(2, 8) : -randInt(12, 26), karma: -2 }); return win ? { text: 'You held your ground, and a guard arrived late, as they do. You are in the hole for a week. Nobody has jumped you since.', tone: '' } : { text: 'It was not a fair fight, and it did not go your way. The infirmary is warm, and quiet.', tone: 'bad' }; }],
    ['Cover up and wait for the guards', (s) => { add(s, { health: -randInt(6, 16) }); M(s).prison.behavior = clamp100(M(s).prison.behavior + 4); return 'You curled up and took it. It ended before it got worse. You did not do anything you will have to carry.'; }],
    ['Ask for protective custody', (s) => { const pr0 = M(s).prison; pr0.behavior = clamp100(pr0.behavior + 6); add(s, { happy: -3 }); return 'You asked, and they moved you. The protective block is smaller and a lot quieter. You will be safe there, and very bored.'; }],
  ],
});
EV('op_gang_out', {
  ages: [18, 120], prison: true, emoji: '🚪', title: 'Getting out', tags: OP_VIO, cooldown: 5, w: 0.8,
  when: (s) => gangOk(s) && gangRank(s) >= 1,
  text: (s) => `You have been thinking about leaving ${M(s).prison.gang}. It is not an easy thing. You know people who tried.`,
  choices: [
    ['Ask to leave, quietly', (s) => { const pr0 = M(s).prison; if (chance(0.55)) { pr0.gang = null; pr0.rank = 0; add(s, { happy: 4, karma: 2 }); return { text: 'They let you go, on the understanding that you would never speak of it. You will have to be careful, still, for a long time.', tone: 'good' }; } add(s, { health: -randInt(8, 20) }); return { text: 'The answer was no, and it was explained to you. You are still in.', tone: 'bad' }; }],
    ['Go to a chaplain or a counselor', (s) => { const pr0 = M(s).prison; pr0.behavior = clamp100(pr0.behavior + 8); add(s, { happy: 3 }); if (chance(0.4)) { pr0.gang = null; pr0.rank = 0; return { text: 'Somebody on the inside has seen this before. It took months, and a lot of paperwork, and you are out.', tone: 'good' }; } return 'Somebody listened. It did not fix anything yet, but it is the first time in a long time you were not alone in this.'; }],
    ['Stay in', (s) => { add(s, { happy: -2 }); return 'You stayed, because staying is easier than the alternative. That is how it keeps going.'; }],
  ],
});
// The rank earns respect on the inside, and the yard remembers.
function gangYear(s) {
  if (!gangOk(s)) return;
  const pr0 = M(s).prison;
  if (pr0.rank === undefined) pr0.rank = 0;
  if (chance(0.15) && pr0.rank < 3 && pr0.behavior < 60) { pr0.rank++; log(s, `🐍 You are ${aAn(GANG_RANKS[pr0.rank].toLowerCase())} in ${pr0.gang} now.`, ''); }
}

/* ---- the year -------------------------------------------------------------------------------------------------------- */
function operationYear(s) {
  if (A(s) < 16) return;
  opYear(s);
  if (!s.dead) gangYear(s);
}
onYear('operation', operationYear);
