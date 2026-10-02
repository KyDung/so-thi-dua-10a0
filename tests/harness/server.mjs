// Máy chủ tĩnh nhỏ để thử web với Firebase giả:
//   node tests/harness/server.mjs   ->   http://localhost:8099/
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const goc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const loai = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json' };
const SDK = ['app', 'auth', 'firestore'].map(n => 'https://www.gstatic.com/firebasejs/10.14.1/firebase-' + n + '.js');
const importMap = {
  imports: Object.fromEntries(
    SDK.map(u => [u, '/tests/harness/fake-firebase.js']).concat([['/assets/js/config.js', '/tests/harness/fake-config.js']])
  )
};

http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/' || p === '/index.html') {
    let h = fs.readFileSync(path.join(goc, 'docs', 'index.html'), 'utf8');
    h = h.replace('<head>', '<head>\n<script type="importmap">' + JSON.stringify(importMap) + '</script>');
    res.writeHead(200, { 'Content-Type': loai['.html'] });
    res.end(h);
    return;
  }
  let f = path.join(goc, 'docs', p);
  if (!fs.existsSync(f)) f = path.join(goc, p);
  if (!f.startsWith(goc) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('404'); return; }
  res.writeHead(200, { 'Content-Type': loai[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(f).pipe(res);
}).listen(8099, () => console.log('Thử web với Firebase giả: http://localhost:8099/'));
