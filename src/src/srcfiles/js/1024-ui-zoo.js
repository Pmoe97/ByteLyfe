/* =====================================================================
 * 1024-ui-zoo.js — Zoo & Wildlife Sanctuary UI on the company sheet.
 * The engine is 58-zoo.js.
 * ===================================================================== */

function zooSection(co) {
  if (co.ind !== 'zoo') return '';
  const z = zooOf(co);
  const T = ZOO_TICKET_PRICES[z.ticketPrice] || ZOO_TICKET_PRICES[1];

  const spSet = new Set(z.animals.map((a) => a.sp));
  const keepers = co.team.ops.n;
  const needKeepers = Math.max(1, Math.ceil(z.animals.length / 3.5));
  const keeperStatus = keepers >= needKeepers
    ? `<span class="good">${keepers} keepers (well staffed)</span>`
    : `<span class="bad">${keepers}/${needKeepers} keepers (understaffed!)</span>`;

  let html = `<div class="section-title">Wildlife Sanctuary</div><div class="card">
    ${kvRow('Animals', `${z.animals.length} animals across ${spSet.size} species`)}
    ${kvRow('Admission', esc(zooTicketLabel(G, T)))}
    ${kvRow('Visitors expect to pay', fmtMoney(price(G, zooAppeal(z).fair)))}
    ${kvRow('Keeper staffing', keeperStatus)}
    <div class="rel-bar"><div class="muted">Animal Welfare · ${Math.round(z.welfare)}%</div>${bar(z.welfare, z.welfare >= 70 ? 'good' : z.welfare >= 45 ? 'accent' : 'bad')}</div>
    <div class="rel-bar"><div class="muted">Visitor Satisfaction · ${Math.round(z.visitorSat)}%</div>${bar(z.visitorSat, z.visitorSat >= 70 ? 'good' : 'accent')}</div>
  </div>`;

  // Breeding programs:
  if (z.breeding.length) {
    html += `<div class="section-title">Conservation Breeding</div><div class="card">`;
    for (const b of z.breeding) {
      const def = ZOO_SPECIES[b.sp];
      const pct = Math.min(100, Math.round((b.progress / b.target) * 100));
      html += `<div class="rel-bar">
        <div class="muted">${def ? def.emoji : '🧬'} ${def ? def.name : b.sp}: ${esc(b.sireName)} ♂ & ${esc(b.damName)} ♀ · ${pct}%</div>
        ${bar(pct, 'accent')}
      </div>`;
    }
    html += `</div>`;
  }

  // Exhibits:
  html += `<div class="section-title">Enclosure Habitats (${z.exhibits.length})</div>`;
  const exRows = z.exhibits.map((e) => {
    const b = ZOO_BIOMES[e.biome] || {};
    const count = z.animals.filter((a) => a.exhibitId === e.id).length;
    return itemRow({
      ico: b.emoji || '🏡',
      t: `${esc(e.name)} <span class="faint">(${count}/${e.cap} capacity)</span>`,
      s: `Condition ${Math.round(e.condition)}% · Security ${Math.round(e.security)}% · ${esc(b.name || e.biome)}`,
    });
  }).join('');
  html += listOf(exRows);

  // Animals in the collection:
  html += `<div class="section-title">Animal Collection (${z.animals.length})</div>`;
  const anRows = z.animals.map((a) => {
    const def = ZOO_SPECIES[a.sp] || { name: a.sp, emoji: '🐾' };
    const ex = z.exhibits.find((e) => e.id === a.exhibitId);
    const sexIco = a.sex === 'm' ? '♂' : '♀';
    return itemRow({
      ico: def.emoji,
      t: `${esc(a.name)} ${sexIco} <span class="faint">· ${esc(def.name)}</span>`,
      s: `Age ${a.age} · Health ${Math.round(a.health)}% · Happiness ${Math.round(a.happiness)}% · ${esc(ex ? ex.name : 'Quarantine')}`,
    });
  }).join('');
  html += listOf(anRows, 'No animals in sanctuary.');

  return html;
}
