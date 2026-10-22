/* =====================================================================
 * 1022-ui-house.js — owning the house on screen: the Track & Book menu's
 * card (your book and your stable), a racehorse's card on its pet sheet,
 * and the casino's floor on the company sheet. The engine is 54-house.js.
 * ===================================================================== */

function houseCard() {
  const b = bookOf(G), horses = racehorses(G);
  let html = '';
  if (b) {
    const rows = [kvRow('Punters', `${b.punters} · room for about ${bookCap(G)}`), kvRow('Prices', `${BOOK_VIG[b.vig].name} · ${Math.round(bookHold(G) * 1000) / 10}% cut`)];
    rows.push(kvRow('How you run it', [b.legal ? 'Licensed' : 'Off the books', b.credit ? 'credit' : 'cash only', b.layoff ? 'balanced' : 'not laid off'].join(' · ')));
    if (b.tax) { const f = underworldOf(G).families[b.tax]; rows.push(kvRow('The family’s piece', `${esc(cap(f ? f.name : 'the family'))} · 20%`)); }
    if (inMob(G) && !myFamily(G).mine && !b.legal) rows.push(kvRow('Kicking up', `30% to ${esc(myFamily(G).name)}`));
    if (b.threat) { const f = underworldOf(G).families[b.threat.fam]; rows.push(kvRow('Trouble', `<span class="bad">${esc(cap(f ? f.name : 'the family'))} wants its piece</span>`)); }
    if (b.owed.length) rows.push(kvRow('On the slate', `<span class="bad">${fmtMoney(bookOwed(G))}</span>`));
    if (!b.legal && M(G).uw) rows.push(kvRow('Police heat', `${M(G).uw.heat}%`));
    if (b.last) rows.push(kvRow(`Last year (${b.last.year})`, `${fmtMoneyShort(b.last.handle)} bet · <span class="${b.last.net >= 0 ? 'good' : 'bad'}">${b.last.net >= 0 ? 'kept' : 'lost'} ${fmtMoneyShort(Math.abs(b.last.net))}</span>`));
    if (b.years) rows.push(kvRow('Since you started', `<span class="${b.total >= 0 ? 'good' : 'bad'}">${fmtMoney(b.total)}</span>`));
    html += `<div class="section-title">Your book</div><div class="card">${rows.join('')}</div>`;
  }
  if (horses.length) html += `<div class="section-title">Your stable</div>${listOf(horses.map(stableRow).join(''))}`;
  return html ? html + '<div class="section-title">What will you do?</div>' : '';
}
function stableRow(p) {
  const h = p.race;
  return itemRow({ a: 'sheet', ds: { k: 'pet', arg: p.id }, ico: h.state === 'racing' ? '🏇' : '🐴', t: esc(p.name), s: `${esc(stateText(h))} · age ${petAge(G, p)} · ${nOf(h.wins, 'win')} in ${h.starts}${h.earn ? ' · ' + fmtMoneyShort(h.earn) : ''}`, chev: true });
}
function potentialWord(h) { const g = genePower(h); return g >= 80 ? 'Could be a champion' : g >= 73 ? 'A stakes horse in the making' : g >= 66 ? 'A useful racehorse' : 'Will earn their oats, maybe'; }

// A racehorse's card on its pet sheet (1003-ui-people.js).
function horseCard(pet) {
  const h = pet.race, age = petAge(G, pet);
  const sex = age >= 5 ? (h.sex === 'f' ? 'mare' : 'stallion') : h.sex === 'f' ? 'filly' : 'colt';
  const status = esc(stateText(h)) + (h.banned > G.year ? ` · <span class="bad">banned until ${h.banned}</span>` : '') + (h.hurt === G.year ? ' · <span class="bad">recovering</span>' : '');
  const rows = [kvRow('Status', `${status} · ${sex}`)];
  if (h.sire) rows.push(kvRow('Pedigree', `By ${esc(h.sire)}${h.dam ? ` out of ${esc(h.dam)}` : ''}${h.bred ? ' · bred by you' : ''}`));
  rows.push(kvRow('Record', `${nOf(h.starts, 'start')} · ${nOf(h.wins, 'win')} · ${nOf(h.places, 'place')}`), kvRow('Earnings', fmtMoney(h.earn)));
  if (h.state === 'yearling' || h.state === 'racing') rows.push(kvRow('Trainer', `${esc(TRAINERS[h.trainer].name)} · “${esc(potentialWord(h))}”`));
  if (h.state === 'stud') rows.push(kvRow('Stud fee', fmtMoney(studFee(G, pet))));
  if (h.inFoal) rows.push(kvRow('In foal', `to ${esc(h.inFoal.sire)}, due ${h.inFoal.year + 1}`));
  rows.push(kvRow('Worth', `about ${fmtMoney(horseValue(G, pet))}`));
  const ability = (name, v) => `<div class="rel-bar"><div class="muted">${name} · ${v}</div>${bar(v, 'accent')}</div>`;
  let html = `<div class="section-title">On the track</div><div class="card">${ability('Speed', h.spd)}${ability('Stamina', h.sta)}${rows.join('')}</div>`;
  if (h.stakes.length) html += `<div class="section-title">Big wins</div><div class="card">${h.stakes.slice(-8).reverse().map((n) => kvRow('🏆', esc(n))).join('')}</div>`;
  return html;
}

// The casino floor on the company sheet (1006-ui-business.js).
function casinoSection(co) {
  if (co.ind !== 'casino') return '';
  const c = casinoOf(co), fam = (id) => { const f = underworldOf(G).families[id]; return esc(cap(f ? f.name : 'the family')); };
  const rows = [kvRow('House edge', CASINO_EDGE[c.edge].name), kvRow('High-limit room', c.vip ? 'Open' : 'Closed'), kvRow('Surveillance', CASINO_EYE[c.eye].name)];
  if (c.city) rows.push(kvRow('Flagship', `${esc(c.city)}`));
  if (c.skim) rows.push(kvRow('The skim', `<span class="bad">${c.skim.self ? 'Your family' : fam(c.skim.fam)} · ${Math.round(c.skim.cut * 100)}% of the take</span>`));
  if (c.threat) rows.push(kvRow('Trouble', `<span class="bad">${fam(c.threat.fam)} wants a skim</span>`));
  if (c.probation >= G.year) rows.push(kvRow('Gaming license', `<span class="bad">on probation until ${c.probation}</span>`));
  return `<div class="section-title">The floor</div><div class="card">${rows.join('')}</div>`;
}
