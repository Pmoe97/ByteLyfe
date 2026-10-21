/* =====================================================================
 * 1999-boot.js — start the game: load settings and saves, show the title.
 * ===================================================================== */

async function boot() {
  try {
    await loadMeta();
  } catch (e) {
    console.warn('[ByteLyfe] could not load settings', e);
  }
  applySettings();
  try {
    await refreshSaveIndex();
  } catch (e) {
    console.warn('[ByteLyfe] could not list saves', e);
  }
  UI.screen = 'title';
  refresh();
}

document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveNow(); });
window.addEventListener('pagehide', () => { saveNow(); });
window.addEventListener('error', (e) => { if (e && e.message) console.error('[ByteLyfe]', e.message); });

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
