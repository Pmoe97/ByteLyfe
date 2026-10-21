// Local dev server for ByteLyfe.
//
// Perchance serves index.html as a <body> fragment inside its own page shell, which also
// injects `root` (the kv-plugin store and friends). This server stands in for that shell:
// it wraps index.html in a minimal document and injects local-dev/perchance-shim.js ahead
// of it, so the game runs unchanged. The shim is never part of index.html.
//
//   npm run dev            -> http://localhost:8750
//   PORT=9000 npm run dev  -> another port
//
// Serves only index.html, src/ and the shim. Listens on 127.0.0.1 only.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 8750;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
};

function shell(fragment) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, interactive-widget=resizes-content">
<title>ByteLyfe (local)</title>
<script src="/local-dev/perchance-shim.js"></script>
</head>
<body>
${fragment}
</body>
</html>`;
}

function send(res, status, body, type) {
  res.writeHead(status, { 'Content-Type': type || 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  } catch {
    return send(res, 400, 'Bad request');
  }

  if (urlPath === '/' || urlPath === '/index.html') {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    return send(res, 200, shell(html), TYPES['.html']);
  }

  const allowed = urlPath.startsWith('/src/') || urlPath === '/local-dev/perchance-shim.js';
  if (!allowed) return send(res, 404, 'Not found');

  const file = path.resolve(ROOT, '.' + urlPath);
  if (!file.startsWith(ROOT + path.sep)) return send(res, 403, 'Forbidden');
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, 'Not found');
    send(res, 200, data, TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream');
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`ByteLyfe dev server: http://localhost:${PORT}`);
});
