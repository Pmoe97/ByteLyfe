// UI smoke test. Paste into the browser console on the running game (or run it through the
// dev tooling's JS runner). It starts a fresh life, then for each year: resolves popups by
// clicking random choices, opens every sheet (and every person/pet/asset sheet), clicks a
// few random action rows, and ages up. Errors from sheets, clicks and the console are
// collected and returned.
(async function uiSmoke(years = 60, seed = 0) {
  const errs = [];
  const origErr = console.error;
  console.error = (...a) => { errs.push('console.error: ' + a.map(String).join(' ').slice(0, 300)); origErr.apply(console, a); };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const click = (el) => { try { el.click(); } catch (e) { errs.push('click threw: ' + e.message); } };
  const pickEl = (list) => list[Math.floor(Math.random() * list.length)];
  async function drain() {
    for (let g = 0; g < 60 && G && G.pending.length; g++) {
      const btns = [...document.querySelectorAll('#modal-root .choice:not([disabled])')];
      if (!btns.length) { errs.push('popup with no enabled choices: ' + G.pending[0].title + ' / ' + G.pending[0].text); G.pending.shift(); refresh(); continue; }
      click(pickEl(btns));
      await sleep(0);
    }
  }
  function sheetCheck(kind, arg) {
    try {
      const v = SHEETS[kind](arg);
      if (v && /undefined|NaN|\[object/.test(v.html.replace(/data-[a-z]+="[^"]*"/g, ''))) errs.push(`sheet ${kind}(${arg ?? ''}) has bad text`);
    } catch (e) { errs.push(`sheet ${kind}(${arg ?? ''}) threw: ${e.message}`); }
  }
  document.querySelector('[data-a=newRandom]') ? click(document.querySelector('[data-a=newRandom]')) : CLICK.newRandom();
  await sleep(50);
  for (let y = 0; y < years && G; y++) {
    await drain();
    if (G.dead) {
      const heir = document.querySelector('[data-a=heir]');
      if (heir && Math.random() < 0.7) { click(heir); await sleep(20); continue; }
      break;
    }
    for (const k of ['activities', 'work', 'assets', 'people', 'profile', 'finance', 'menu', 'goals', 'lineage', 'timemachine', 'sandbox', 'settings', 'jobboard', 'grad', 'tree']) sheetCheck(k);
    for (const pid of Object.keys(M(G).rels).slice(0, 3)) sheetCheck('tree', pid);
    for (const c of ACT_CATS) sheetCheck('actcat', c.id);
    for (const pid in M(G).rels) sheetCheck('person', pid);
    for (const id in G.pets) sheetCheck('pet', id);
    for (const a of M(G).assets) sheetCheck('asset', a.id);
    // Open a random sheet through the real UI and click a random row in it.
    for (let k = 0; k < 3 && G && !G.dead; k++) {
      click(pickEl([...document.querySelectorAll('.g-nav [data-a=sheet]')]));
      await sleep(0);
      let rows = [...document.querySelectorAll('#sheet-root [data-a]')].filter((b) => !['sheetClose', 'sheetBack', 'toTitle', 'wipeAll', 'delLife', 'exportLife', 'doImport', 'copyExport', 'setSeg', 'setToggle', 'rewind'].includes(b.dataset.a));
      if (rows.length) { click(pickEl(rows)); await sleep(0); }
      rows = [...document.querySelectorAll('#sheet-root [data-a=act]')];
      if (rows.length && !G.pending.length) { click(pickEl(rows)); await sleep(0); }
      await drain();
      closeSheets();
    }
    if (G && !G.dead && !G.pending.length) { click(document.querySelector('[data-a=age]')); await sleep(0); }
  }
  console.error = origErr;
  return { errors: errs.slice(0, 40), count: errs.length, age: G ? A(G) : null, gen: G ? G.gen : null, dead: G ? G.dead : null };
})();
