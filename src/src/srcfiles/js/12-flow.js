/* =====================================================================
 * 12-flow.js — the life log, popups, choice handlers and the action registry.
 *
 * Everything the player sees as a dialog is a popup in s.pending. A popup with
 * a `handler` calls HANDLERS[handler](s, ctx, value, input) when a choice is
 * picked. Handlers and actions return the outcome text (or { text, title,
 * emoji, quiet }); runWithResult logs it, measures what changed, and shows
 * it next, ahead of anything else queued. Popups are plain JSON so they save.
 * ===================================================================== */

/* ---- life log ------------------------------------------------------ */
function curEntry(s) { return s.log[s.log.length - 1]; }
function startYearLog(s) { s.log.push({ age: A(s), year: s.year, lines: [] }); }
function log(s, text, kind, deltas) {
  if (!text) return;
  if (!curEntry(s)) startYearLog(s);
  const line = { t: String(text) };
  if (kind) line.k = kind;
  if (deltas && deltas.length) line.d = deltas;
  curEntry(s).lines.push(line);
}

/* ---- popups -------------------------------------------------------- */
function makePopup(s, o) {
  return {
    id: uid(s, 'u'),
    emoji: o.emoji || '',
    title: o.title || '',
    text: o.text || '',
    choices: o.choices || [{ label: 'OK' }],
    handler: o.handler || null,
    ctx: o.ctx || null,
    input: o.input || null,
    deltas: o.deltas || null,
    tone: o.tone || '',
    person: o.person || null, // person id to show a mini card for
  };
}
function popup(s, o) { const pp = makePopup(s, o); s.pending.push(pp); return pp; }
// Log a line and show it as a popup (unless silent).
function announce(s, o) {
  log(s, o.log || o.text, o.kind, o.deltas);
  if (!o.silent) popup(s, o);
}

const HANDLERS = {};
function onChoice(name, fn) { HANDLERS[name] = fn; }

function resolvePopup(s, popupId, idx, input) {
  const pp = s.pending.find((p) => p.id === popupId);
  if (!pp) return false;
  const ch = pp.choices[idx];
  if (!ch || ch.disabled) return false;
  s.pending = s.pending.filter((p) => p !== pp);
  if (!pp.handler) { afterChange(s); return true; }
  const fn = HANDLERS[pp.handler];
  if (!fn) { console.warn('[ByteLyfe] no handler:', pp.handler); afterChange(s); return true; }
  const value = ch.value !== undefined ? ch.value : idx;
  runWithResult(s, () => fn(s, pp.ctx || {}, value, input), { emoji: pp.emoji, title: pp.title });
  return true;
}

function runWithResult(s, fn, src) {
  useCurrency(s);
  const before = snapStats(s);
  const known = new Set(s.pending.map((p) => p.id));
  const res = fn();
  const added = s.pending.filter((p) => !known.has(p.id));
  const rest = s.pending.filter((p) => known.has(p.id));
  const front = [];
  if (res) {
    const r = typeof res === 'string' ? { text: res } : res;
    if (r.text) r.text += langFlavor(r); // a muttered word or two when the dial is up (67-language.js)
    if (r.text) {
      const deltas = diffStats(before, snapStats(s));
      if (!r.nolog) log(s, r.text, r.kind || '', deltas);
      if (!r.quiet) {
        front.push(makePopup(s, {
          emoji: r.emoji || (src && src.emoji) || '',
          title: r.title || (src && src.title) || '',
          text: r.text, deltas, tone: r.tone || '', person: r.person || null,
        }));
      }
    }
  }
  s.pending = front.concat(added, rest);
  afterChange(s);
}

/* ---- content tags ---------------------------------------------------
 * Events, event choices, company events and actions can carry `tags: ['chaos']`.
 * Tagged content only shows up while every one of its tags is switched on in
 * Settings (META.settings[tag], both off by default). Untagged content always
 * shows up. The verify harness fails on any tag not listed here. */
const CONTENT_TAGS = {
  chaos: { name: 'Chaos', emoji: '🌀', desc: 'Absurd and supernatural happenings: freak accidents, superpowers, stranger things.' },
  mature: { name: 'Mature', emoji: '💀', desc: 'Harder crime, blackmail and messier affairs than the standard game. The switches under it add more.' },
  mature_intimacy: { name: 'Intimacy', emoji: '🔥', desc: 'Love lives with real texture: nights out and what comes after, protection and tests, friends with benefits, spark in long relationships. 18+ only, consensual, and always fade-to-black. Needs Mature too.' },
  taboo: { name: 'Taboo romance (master)', emoji: '🔞', desc: 'Consensual adult-only romance with family members (18+ both, never teens). Everything stays exactly as now while this is off. Turn on subtypes below for who is eligible.' },
  taboo_parent: { name: 'Taboo: parents', emoji: '👩', desc: 'Adult romance with a parent (18+ both, consensual). Requires the master switch too.' },
  taboo_step: { name: 'Taboo: step-parents', emoji: '🏠', desc: 'Adult romance with a step-parent (18+ both, consensual). Requires the master switch too.' },
  taboo_sibling: { name: 'Taboo: siblings', emoji: '👫', desc: 'Adult romance with a sibling or half-sibling (18+ both, consensual). Requires the master switch too.' },
  taboo_child: { name: 'Taboo: children', emoji: '👶', desc: 'Adult romance with an adult child (18+ both, consensual). Never teens. Requires the master switch too.' },
  taboo_grand: { name: 'Taboo: grandparents / grandchildren', emoji: '👴', desc: 'Adult romance with a grandparent or adult grandchild (18+ both). Requires the master switch too.' },
  taboo_extended: { name: 'Taboo: extended family', emoji: '👪', desc: 'Adult romance with aunts, uncles, cousins, nieces, nephews (18+ both). Requires the master switch too.' },
  taboo_inlaw: { name: 'Taboo: in-laws', emoji: '💍', desc: 'Adult romance with in-laws (18+ both). Requires the master switch too.' },
};
function tagsOn(tags) {
  if (!tags || !tags.length) return true;
  return tags.every((t) => !!META.settings[t]);
}

/* ---- action registry ----------------------------------------------
 * defAction({ id, cat, label, emoji, desc, target, tags, when(s, t), run(s, t), sub(s, t) })
 *   cat:    which menu it lives in (see ACT_CATS in 21-activities.js)
 *   target: 'person' | 'pet' | 'asset' when it acts on something; t is its id
 *   tags:   content tags (see CONTENT_TAGS); hidden unless all are switched on
 *   when:   availability; run: does it and returns the outcome
 *   sub:    optional hint line (a price, a limit)
 * The UI menus and the verify bot both read this registry. */
const ACTIONS = {};
const ACTION_ORDER = [];
function defAction(a) {
  ACTIONS[a.id] = a;
  ACTION_ORDER.push(a.id);
  return a;
}
function actionAvailable(a, s, t) {
  if (!tagsOn(a.tags)) return false;
  try { return !a.when || !!a.when(s, t); } catch (e) { console.error('[ByteLyfe] when() failed for', a.id, e); return false; }
}
function actionList(s, cat, t) {
  const out = [];
  for (const id of ACTION_ORDER) {
    const a = ACTIONS[id];
    if (a.cat !== cat) continue;
    if (!!a.target !== (t !== undefined && t !== null)) continue;
    if (actionAvailable(a, s, t)) out.push(a);
  }
  return out;
}
function actionLabel(a, s, t) { return typeof a.label === 'function' ? a.label(s, t) : a.label; }
function actionSub(a, s, t) { try { return a.sub ? a.sub(s, t) : (a.desc || ''); } catch (e) { return ''; } }
function doAction(s, id, t) {
  const a = ACTIONS[id];
  if (!a || s.dead || s.pending.length) return false;
  if (M(s).gamb && M(s).gamb.race) settleRaceQuietly(s); // a race left running (53-gambling.js)
  if (!actionAvailable(a, s, t)) return false;
  runWithResult(s, () => a.run(s, t), { emoji: a.emoji, title: actionLabel(a, s, t) });
  return true;
}

// Charge the player. Returns false (and charges nothing) when they cannot afford it.
function pay(s, amt) {
  if (amt <= 0) return true;
  if (M(s).money < amt) return false;
  M(s).money -= Math.round(amt);
  return true;
}
function cantAfford(amt) { return { text: `You can't afford that. It costs ${fmtMoney(amt)}.`, title: 'Not enough money', emoji: '💸', nolog: true }; }
