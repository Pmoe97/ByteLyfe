// Lists emoji in the shipped source that are newer than Emoji 12 (2019). Windows 10's
// emoji font stops around there, so these render as empty boxes for many players.
//   node dev/verify/emoji-audit.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dirs = ['src/src/srcfiles/js', 'src/src/srcfiles/css'];
const files = [path.join(ROOT, 'index.html')];
for (const d of dirs) for (const f of fs.readdirSync(path.join(ROOT, d))) files.push(path.join(ROOT, d, f));

// Emoji 12 code points inside the 1FA70-1FAFF block (everything else there is 13+).
const OK_1FA = new Set([0x1fa70, 0x1fa71, 0x1fa72, 0x1fa73, 0x1fa78, 0x1fa79, 0x1fa7a, 0x1fa80, 0x1fa81, 0x1fa82, 0x1fa90, 0x1fa91, 0x1fa92, 0x1fa93, 0x1fa94, 0x1fa95]);
const NEW_SINGLES = new Set([0x1f6fb, 0x1f6d6, 0x1f6d7, 0x1f6dd, 0x1f6de, 0x1f6df, 0x1f6dc, 0x1f972, 0x1f977, 0x1f978, 0x1f90c, 0x1f9cb, 0x1f6fc, 0x1f979, 0x1f97a + 1000, 0x26a7]);
function isNew(cp) {
  if (cp >= 0x1fa70 && cp <= 0x1faff) return !OK_1FA.has(cp);
  return NEW_SINGLES.has(cp);
}
let total = 0;
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    const hits = [];
    for (const ch of line) {
      const cp = ch.codePointAt(0);
      if (isNew(cp)) hits.push(ch + ' U+' + cp.toString(16).toUpperCase());
    }
    // ZWJ sequences that are 12.1+/13.1+: gender-neutral 🧑‍X professions, face exhaling, etc.
    if (/\u{1F9D1}‍/u.test(line)) hits.push('🧑‍(ZWJ profession)');
    if (/\u{1F62E}‍\u{1F4A8}/u.test(line)) hits.push('😮‍💨');
    if (hits.length) { total += hits.length; console.log(`${path.relative(ROOT, f)}:${i + 1}  ${hits.join('  ')}`); }
  });
}
console.log(total ? `\n${total} newer emoji found.` : 'No emoji newer than Emoji 12.');
process.exit(total ? 1 : 0);
