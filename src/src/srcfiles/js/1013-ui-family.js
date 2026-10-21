/* =====================================================================
 * 1013-ui-family.js — the family tree (sheet 'tree'): yours, or the tree of
 * anyone you know. Opening it makes any relatives nobody has met yet
 * (ensureTreeFor in 45-family.js). The tree is nested lists; the branches
 * are drawn in CSS (.ftree in 03-screens.css).
 * ===================================================================== */

// What p is to the person in the middle of the tree, as a relationship kind ('' if unsure).
function relationTo(focus, p, deep) {
  const S = G.people, share = (a, b) => a.parents.some((x) => b.parents.includes(x));
  const parents = focus.parents.map((id) => S[id]).filter(Boolean);
  if (p.id === focus.id) return '';
  if (focus.parents.includes(p.id)) return 'parent';
  if (p.parents.includes(focus.id)) return 'child';
  if (focus.partner === p.id) return focus.married ? 'spouse' : 'partner';
  if (share(focus, p)) return focus.parents.every((x) => p.parents.includes(x)) ? 'sibling' : 'halfsibling';
  if (parents.some((x) => x.parents.includes(p.id))) return 'grandparent';
  if (p.parents.some((x) => S[x] && S[x].parents.includes(focus.id))) return 'grandchild';
  if (parents.some((x) => share(x, p))) return 'aunt';
  if (p.parents.some((x) => S[x] && parents.some((y) => share(S[x], y)))) return 'cousin';
  if (p.parents.some((x) => S[x] && share(S[x], focus))) return 'nibling';
  if (!deep && p.partner && S[p.partner]) {
    const k = relationTo(focus, S[p.partner], true);
    if (k === 'aunt') return 'aunt';
    if (['sibling', 'halfsibling', 'child'].includes(k)) return 'inlaw';
  }
  return '';
}
function treeLabel(focus, p) {
  if (p.id === G.playerId) return 'You';
  if (focus.id === G.playerId && relOf(G, p.id)) return kinTitle(G, p.id);
  if (p.id === focus.id) return relOf(G, p.id) ? kinTitle(G, p.id) : '';
  const k = relationTo(focus, p);
  return k ? kinLabel(k, p) : '';
}
function treeNode(focus, p) {
  const me = p.id === G.playerId, known = !me && relOf(G, p.id);
  const go = me ? ' data-a="sheet" data-k="profile"' : known ? ` data-a="sheet" data-k="person" data-arg="${esc(p.id)}"` : '';
  const tag = go ? 'button' : 'div';
  return `<${tag} class="tnode${p.alive ? '' : ' gone'}"${go}>${avatarOf(p, 46)}<b>${esc(p.first)}</b><span>${esc(treeLabel(focus, p))}</span><i>${p.alive ? 'age ' + ageOf(G, p) : '† ' + (p.deathYear || '')}</i></${tag}>`;
}
// Someone's partner on the tree: their partner now, or (after a death) the other parent of their kids.
function treeMate(p) {
  const S = G.people;
  if (p.partner && S[p.partner]) return S[p.partner];
  for (const k of p.children) { const kid = S[k]; const other = kid && kid.parents.find((x) => x !== p.id && S[x]); if (other) return S[other]; }
  return null;
}
function treeKids(a, b) {
  const ids = new Set([...a.children, ...(b ? b.children : [])]);
  return [...ids].map((id) => G.people[id]).filter(Boolean).sort((x, y) => x.birthYear - y.birthYear);
}
// One couple and, below them, their children's branches (depth generations deep).
function treeBranch(focus, p, depth, seen, mate) {
  if (seen.has(p.id)) return '';
  seen.add(p.id);
  const sp = mate !== undefined ? mate : treeMate(p);
  if (sp) seen.add(sp.id);
  const kids = depth > 0 ? treeKids(p, sp).filter((k) => !seen.has(k.id)) : [];
  const unit = `<div class="tunit${p.id === focus.id || (sp && sp.id === focus.id) ? ' focus' : ''}">${treeNode(focus, p)}${sp ? `<span class="tring">${p.married ? '💍' : '♥'}</span>${treeNode(focus, sp)}` : ''}</div>`;
  return `<li>${unit}${kids.length ? `<ul>${kids.map((k) => treeBranch(focus, k, depth - 1, seen)).join('')}</ul>` : ''}</li>`;
}
// A side of the family: the grandparents at the top, or the parents if nobody older is known.
function treeSide(focus, par, other, seen, stub) {
  const S = G.people, gps = par.parents.map((id) => S[id]).filter(Boolean);
  if (!gps.length) return stub ? '' : `<ul>${treeBranch(focus, par, 3, seen, other)}</ul>`;
  const [g1, g2] = gps;
  seen.add(g1.id);
  if (g2) seen.add(g2.id);
  const kids = treeKids(g1, g2 || treeMate(g1)).map((k) => {
    if (k.id !== par.id) return treeBranch(focus, k, 3, seen);
    if (stub) return `<li><div class="tunit">${treeNode(focus, par)}</div></li>`;
    return treeBranch(focus, par, 3, seen, other);
  }).join('');
  const top = `<div class="tunit">${treeNode(focus, g1)}${g2 || treeMate(g1) ? `<span class="tring">${g1.married ? '💍' : '♥'}</span>${treeNode(focus, g2 || treeMate(g1))}` : ''}</div>`;
  return `<ul><li>${top}${kids ? `<ul>${kids}</ul>` : ''}</li></ul>`;
}
SHEETS.tree = (pid) => {
  const focus = G.people[pid || G.playerId];
  if (!focus) return null;
  const before = Object.keys(G.people).length;
  ensureTreeFor(G, focus.id);
  if (Object.keys(G.people).length !== before) scheduleSave();
  const me = focus.id === G.playerId, S = G.people;
  const pars = focus.parents.map((id) => S[id]).filter(Boolean);
  const whose = (par) => (par.parents.some((id) => S[id]) ? `${me ? 'Your' : `${esc(focus.first)}'s`} ${esc(kinLabel('parent', par).toLowerCase())}'s family` : me ? 'Your family' : `${esc(focus.first)}'s family`);
  const seen = new Set();
  let html = `<p class="note" style="margin-top:-6px">Tap anyone you know to open their page. Scroll sideways to see the whole tree.</p>`;
  if (!pars.length) html += `<div class="ftree">${`<ul>${treeBranch(focus, focus, 2, seen)}</ul>`}</div>`;
  else {
    const [a, b] = pars;
    html += `<div class="ftree-side">${whose(a)}</div><div class="ftree">${treeSide(focus, a, b || treeMate(a), seen, false)}</div>`;
    const sideB = b ? treeSide(focus, b, a, seen, true) : '';
    if (sideB) html += `<div class="ftree-side">${whose(b)}</div><div class="ftree">${sideB}</div>`;
  }
  const links = [];
  const mate = me ? romanticId(G) : null;
  if (mate) links.push(itemRow({ a: 'sheet', ds: { k: 'tree', arg: mate }, ico: '🌳', t: `${esc(S[mate].first)}'s family`, s: 'Your partner’s side of the family', chev: true }));
  if (!me) links.push(itemRow({ a: 'sheet', ds: { k: 'tree' }, ico: '🌳', t: 'Your family tree', chev: true }));
  if (links.length) html += `<div class="list" style="margin-top:4px">${links.join('')}</div>`;
  return { title: me ? 'Your family tree' : `${focus.first}'s family tree`, html };
};
// The tree link at the top of the People sheet.
function treeRow() {
  return itemRow({ a: 'sheet', ds: { k: 'tree' }, ico: '🌳', t: 'Family tree', s: flag(G, 'kin') ? 'Grandparents, aunts and uncles, cousins and everyone since' : 'Meet your aunts, uncles and cousins', chev: true });
}
