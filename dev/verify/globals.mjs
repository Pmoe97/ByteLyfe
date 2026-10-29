// Duplicate globals:  node dev/verify/globals.mjs
//
// Every game file is a classic script in one shared scope, so a function or constant declared at the top level of two files
// does not fail: the later one quietly replaces the earlier, and whatever called the first now calls the second. This lists
// every top-level function, const, let, var and class name that is declared in more than one file (or twice in one).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const JS = path.join(ROOT, 'src', 'src', 'srcfiles', 'js');
const seen = new Map();
for (const f of fs.readdirSync(JS).filter((x) => x.endsWith('.js')).sort()) {
  const lines = fs.readFileSync(path.join(JS, f), 'utf8').split('\n');
  lines.forEach((line, i) => {
    // Top level only: the declaration starts in column 0.
    const m = line.match(/^(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(/) || line.match(/^(?:const|let|var|class)\s+([A-Za-z_$][\w$]*)\b/);
    if (m) { const k = m[1]; (seen.get(k) || seen.set(k, []).get(k)).push(`${f}:${i + 1}`); }
    // const { a, b } = ... and const [a, b] = ...
    const d = line.match(/^(?:const|let|var)\s+[\[{]([^\]}=]+)[\]}]\s*=/);
    if (d) for (const part of d[1].split(',')) { const k = part.split(':').pop().trim().replace(/=.*/, '').trim(); if (/^[A-Za-z_$][\w$]*$/.test(k)) (seen.get(k) || seen.set(k, []).get(k)).push(`${f}:${i + 1}`); }
  });
}
const dups = [...seen].filter(([, v]) => v.length > 1);
if (dups.length) {
  console.log(`❌ ${dups.length} name(s) declared more than once at the top level:`);
  for (const [k, v] of dups) console.log(`  - ${k}: ${v.join(', ')}`);
  process.exit(1);
}
console.log(`✅ Global names are unique (${seen.size} top-level names).`);
