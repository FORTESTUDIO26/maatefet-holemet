// שרת מקומי לבדיקה: מגיש את docs/ תחת נתיב משנה, כמו GitHub Pages של ריפוזיטורי.
// הרצה: node tools/serve.mjs [port] [base]
// ברירת מחדל: http://localhost:8080/maatefet-holemet/
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs');
const port = Number(process.argv[2] || 8080);
const base = '/' + (process.argv[3] || 'maatefet-holemet').replace(/^\/|\/$/g, '') + '/';
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png', '.pdf': 'application/pdf', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml',
};

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  // רישום שיטה ונתיב בלבד (בלי query) – לבדיקה שאין שליחת נתונים
  console.log(new Date().toISOString(), req.method, url.pathname);
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  if (url.pathname === '/' || url.pathname === base.slice(0, -1)) { res.writeHead(302, { Location: base }); return res.end(); }
  if (!url.pathname.startsWith(base)) { res.writeHead(404); return res.end('Not found (site is served under ' + base + ')'); }
  let rel = decodeURIComponent(url.pathname.slice(base.length)) || 'index.html';
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(root, rel);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(port, () => console.log(`Serving docs/ at http://localhost:${port}${base}`));
