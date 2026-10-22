/* =====================================================================
 * 1017-ui-currency.js — your currency on the Finances sheet: its exchange
 * rate, how strong it is right now, and any foreign savings.
 * The engine is 50-currency.js.
 * ===================================================================== */

function currencyCard() {
  const code = homeCur(G), C = CURRENCIES[code], m = M(G);
  const rows = [kvRow('Currency', `${esc(C.sym)} · ${esc(cap(C.name))}`)];
  if (code !== 'USD') rows.push(kvRow('Exchange rate', esc(rateText(G, code))));
  rows.push(kvRow('Strength', strengthWord(G, code)));
  const move = Math.round(yearMove(G, code) * 100);
  if (Math.abs(move) >= 1) rows.push(kvRow('This year', `${move > 0 ? 'Up' : 'Down'} ${Math.abs(move)}%`));
  let html = `<div class="section-title">Your money</div><div class="card">${rows.join('')}</div>`;
  const held = fxHeld(G);
  if (held.length) {
    html += `<div class="section-title">Foreign savings</div><div class="list">${held.map((k) => itemRow({
      a: free(G) ? 'act' : null, ds: { id: 'fx_trade', t: '' }, ico: '💱',
      t: `${esc(CURRENCIES[k].sym)} ${esc(cap(CURRENCIES[k].plural))}`,
      s: `${fmtIn(k, fxUnits(G, k, m.fxSave[k]))} · worth ${fmtMoney(m.fxSave[k])} · ${strengthWord(G, k).toLowerCase()}`,
    })).join('')}</div>`;
  }
  if (META.settings.currency === 'usd') html += '<div class="note">Money is shown in US dollars. Switch to local currencies in Settings.</div>';
  return html;
}
