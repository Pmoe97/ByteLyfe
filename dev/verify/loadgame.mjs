// Shared loader for the Node harnesses: brings the real engine up in a bare vm context.
//
// The load order comes from index.html itself (its <script src> tags), filtered to the
// engine files (number < 1000; the UI starts at 1000). There is no second list to keep in step.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export function engineFiles() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const out = [];
  const re = /<script src="(src\/src\/srcfiles\/js\/(\d+)-[^"?]+\.js)(?:\?v=\d+)?"><\/script>/g;
  let m;
  while ((m = re.exec(html))) if (Number(m[2]) < 1000) out.push(m[1]);
  return out;
}

// Returns a vm context with every engine global defined. Use ctx.run('expr') to read
// top-level let/const bindings (they are not properties of the context object).
export function loadGame(opts = {}) {
  const sandbox = {
    console: opts.quiet ? { log() {}, warn() {}, error: console.error, info() {} } : console,
    setTimeout: (fn) => 0,
    clearTimeout() {},
    Date, Math, JSON, Promise, TextEncoder, TextDecoder, btoa, atob,
  };
  const ctx = vm.createContext(sandbox);
  for (const rel of engineFiles()) {
    const file = path.join(ROOT, rel);
    vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: rel });
  }
  ctx.run = (code) => vm.runInContext(code, ctx);
  return ctx;
}
