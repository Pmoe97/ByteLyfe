/* =====================================================================
 * 1016-ui-cities.js — cities on screen: the City sheet (cost of living,
 * pay, industries, neighborhoods, other cities), your landlord on the
 * Assets sheet, and the tenants on a property's sheet.
 * The engine is 49-cities.js.
 * ===================================================================== */

SHEETS.city = () => {
  const me = P(G), cc = me.country, C = country(G), info = hereInfo(G), st = hereState(G);
  const mine = M(G).housing.type === 'homeless' ? null : myHood(G);
  const hubs = hubNames(info), rent = typicalRent(G, cc, me.city);
  const chips = info.traits.map((t) => `<span class="chip">${esc(CITY_TRAITS[t] || t)}</span>`).join('');
  const market = st.g >= 0.01 ? `Up ${Math.round(st.g * 100)}% this year` : st.g <= -0.01 ? `Down ${Math.round(-st.g * 100)}% this year` : 'Flat this year';
  let html = `<div class="card">
      <div class="row"><div class="ico">${emo('📍', 28)}</div><div class="grow"><b>${esc(me.city)}</b><div class="muted">${esc(CITY_SIZES[info.size].name)} · ${C.flag} ${esc(C.name)}</div></div></div>
      ${kvRow('Cost of living', `${colWord(info.col)} · ${pctVs(info.col)}`)}
      ${kvRow('Pay', cap(pctVs(info.wage)))}
      ${kvRow('One-bedroom rent', `about ${fmtMoney(rent)}/yr`)}
      ${kvRow('Housing market', market)}
      ${hubs.length ? kvRow('Big industries', esc(hubs.join(', '))) : ''}
      ${tenantLaw(cc) !== 'weak' ? kvRow('Tenant protections', tenantLaw(cc) === 'strong' ? 'Strong' : 'Moderate') : ''}
      ${chips ? `<div class="chips" style="margin-top:8px">${chips}</div>` : ''}
    </div>
    <div class="section-title">Neighborhoods</div>
    ${listOf(hoodNames(cc, me.city).map((n, i) => {
      const t = hoodTier(G, cc, me.city, i);
      return itemRow({ ico: t.emoji, t: esc(cap(n)) + (i === mine ? ' <span class="faint">· you live here</span>' : ''), s: `${t.name} · rent about ${fmtMoneyShort(nicePrice(rent * t.rent))}/yr` });
    }).join(''))}`;
  const move = actionRows('home', undefined, (a) => a.id === 'city_move');
  if (move) html += `<div class="list" style="margin-top:12px">${move}</div>`;
  const others = C.cities.filter((c) => c !== me.city).map((c) => {
    const o = cityInfo(cc, c), oh = hubNames(o).slice(0, 2);
    return itemRow({ ico: '📍', t: esc(c), s: `${CITY_SIZES[o.size].name} · ${colWord(o.col).toLowerCase()} · pay ${pctVs(o.wage)}${oh.length ? ' · ' + esc(oh.join(', ')) : ''}` });
  }).join('');
  if (others) html += `<div class="section-title">Elsewhere in ${esc(theCountry(cc))}</div>${listOf(others)}`;
  const been = places(G).filter((k) => k !== cityKey(cc, me.city)).map((k) => { const [pc, city] = k.split(':'); return `${COUNTRIES[pc] ? COUNTRIES[pc].flag + ' ' : ''}${esc(city)}`; });
  if (been.length) html += `<div class="note">You've also lived in ${listJoin(been)}.</div>`;
  return { title: me.city, html };
};

// The city row on the Assets sheet, above the home actions.
function cityRow() {
  const info = hereInfo(G), h = M(G).housing;
  const where = A(G) >= 5 && h.type !== 'homeless' ? cap(myHoodName(G)) + ' · ' : '';
  return itemRow({ a: 'sheet', ds: { k: 'city' }, ico: '📍', t: esc(P(G).city), s: `${esc(where)}${colWord(info.col)} · pay ${pctVs(info.wage)}`, chev: true });
}

// Under your home on the Assets sheet: the neighborhood, and your landlord if you rent.
function homeFacts() {
  const h = M(G).housing, rows = [];
  if (h.type === 'rent') {
    const ll = landlordOf(G), L = LANDLORD_STYLES[ll.style];
    rows.push(kvRow('Neighborhood', `${esc(cap(myHoodName(G)))} · ${myHoodTier(G).name.toLowerCase()}`));
    rows.push(kvRow(ll.corp ? 'Managed by' : 'Landlord', `${esc(ll.name)} · ${llKnown(G) ? emo(L.emoji, 16) + ' ' + L.name : 'reviews ' + stars(ll.stars)}`));
    if (llKnown(G) && !ll.corp) rows.push(kvRow('Gets along with you', ll.mood >= 70 ? 'Very well' : ll.mood >= 45 ? 'Fine' : ll.mood >= 25 ? 'Not really' : 'Badly'));
    rows.push(kvRow('Renting since', h.since || G.year));
    if (h.deposit) rows.push(kvRow('Deposit', fmtMoney(h.deposit)));
    let notes = '';
    if (h.issue && RENTAL_ISSUES[h.issue.id]) notes += `<div class="note bad">${emo(RENTAL_ISSUES[h.issue.id].emoji, 16)} The ${esc(RENTAL_ISSUES[h.issue.id].name)} has been broken since ${h.issue.since}.</div>`;
    if (h.withheld) notes += `<div class="note bad">✋ You're withholding rent (${fmtMoney(h.owed || 0)} so far).</div>`;
    if (h.notice) notes += `<div class="note bad">📜 Eviction notice: you have to be out by ${h.notice.year + 1}.</div>`;
    return rows.join('') + notes;
  }
  if (h.type === 'own') {
    const a = residence(G);
    if (a) rows.push(kvRow('Neighborhood', `${esc(cap(myHoodName(G)))} · ${myHoodTier(G).name.toLowerCase()}`));
    if (a && unitsOf(a) > 1) rows.push(kvRow('Your building', `${nOf(unitsOf(a), 'unit')} · ${nOf(tenantsOf(G, a).length, 'tenant')}`));
  }
  if (h.type === 'parents' && A(G) >= 5) rows.push(kvRow('Neighborhood', `${esc(cap(myHoodName(G)))} · ${myHoodTier(G).name.toLowerCase()}`));
  return rows.join('');
}

// The end of a home's row in the Assets list.
function houseRowNote(a) {
  const n = (a.tenants || []).length;
  let t = n ? ` · ${nOf(n, 'tenant')}` : a.rentedOut ? ' · looking for tenants' : '';
  if (isRemote(G, a)) t += ` · in ${esc(assetCity(G, a))}`;
  return t;
}

// A property's tenants, on its sheet.
function tenantSection(a) {
  if (a.kind !== 'house') return '';
  const ts = tenantsOf(G, a), units = unitsOf(a);
  const facts = [kvRow('Location', `${esc(cap(hoodName(assetCC(G, a), assetCity(G, a), assetHood(G, a))))}, ${esc(assetCity(G, a))}`)];
  if (units > 1) facts.push(kvRow('Units', `${units}${livesIn(G, a) ? ' · you live in one' : ''}`));
  if (a.rentedOut || ts.length) {
    facts.push(kvRow('Market rent', `${fmtMoney(marketRent(G, a))}/yr${units > 1 ? ' a unit' : ''}`));
    facts.push(kvRow('Asking', RENT_LEVELS[a.rentLvl || 'market'].name));
    facts.push(kvRow('Property manager', a.mgr ? 'Yes · 8% of the rent' : 'No'));
  }
  let html = `<div class="section-title">The property</div><div class="card">${facts.join('')}</div>`;
  if (!ts.length) return html + (a.rentedOut ? '<div class="note">No tenants yet. Find one below.</div>' : '');
  const rows = ts.map((t) => {
    const known = G.year > t.since, K = TENANT_KINDS[t.kind];
    const bits = [`${tenantAge(G, t)}`, esc(t.job), `${fmtMoney(t.rent)}/yr`, `since ${t.since}`];
    if (known) bits.push(esc(K.name.toLowerCase()));
    if (t.owed > 0) bits.push(`<span class="bad">owes ${fmtMoney(t.owed)}</span>`);
    if (t.evict) bits.push('<span class="bad">eviction filed</span>');
    if (t.pet) bits.push('has a dog');
    return itemRow({ ico: '👥', t: esc(tenantName(t)), s: bits.join(' · '), extra: `<div class="muted" style="margin-top:4px">Happiness</div>${bar(t.mood)}` });
  }).join('');
  return html + `<div class="section-title">Tenants (${ts.length} of ${units - (livesIn(G, a) ? 1 : 0)})</div><div class="list">${rows}</div>`;
}
