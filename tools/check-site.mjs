// בדיקות סטטיות: קישורים פנימיים, עוגנים, קבצים להורדה, סדר כותרות, alt לתמונות, lang/dir, וניגודיות צבעים.
// הרצה: node tools/check-site.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs');
const pages = fs.readdirSync(root).filter(f => f.endsWith('.html'));
let problems = 0;
const fail = (p, m) => { problems++; console.log('✗', p, '–', m); };
const ids = {};
for (const p of pages) {
  const html = fs.readFileSync(path.join(root, p), 'utf8');
  ids[p] = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
}
for (const p of pages) {
  const html = fs.readFileSync(path.join(root, p), 'utf8');
  if (!/<html lang="he" dir="rtl">/.test(html)) fail(p, 'חסר lang="he" dir="rtl"');
  if (!html.includes('class="skip-link" href="#main"')) fail(p, 'חסר קישור דילוג');
  if ((html.match(/<h1[\s>]/g) || []).length !== 1) fail(p, 'צריך בדיוק h1 אחד');
  let prev = 0;
  for (const m of html.matchAll(/<h([1-6])[\s>]/g)) { const l = +m[1]; if (prev && l > prev + 1) fail(p, `קפיצת כותרת h${prev}→h${l}`); prev = l; }
  for (const m of html.matchAll(/<img\b[^>]*>/g)) if (!/\salt="/.test(m[0])) fail(p, 'תמונה בלי alt');
  for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const u = m[1];
    if (/^(https?:|mailto:|tel:)/.test(u)) continue;
    if (u.startsWith('/')) { fail(p, `נתיב מוחלט לא יעבוד בנתיב משנה: ${u}`); continue; }
    const [file, hash] = u.split('#');
    const target = file || p;
    if (file && !fs.existsSync(path.join(root, file))) { fail(p, `קובץ חסר: ${file}`); continue; }
    if (hash && target.endsWith('.html') && !ids[target]?.has(hash)) fail(p, `עוגן חסר: ${u}`);
  }
}
// ניגודיות
const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const pairs = [
  ['טקסט רגיל', '#1B2430', '#F5F8FB'], ['טקסט משני', '#4A5868', '#FFFFFF'], ['קישור', '#0A4A7A', '#FFFFFF'],
  ['קישור על רקע הערה', '#0A4A7A', '#EAF4FB'], ['כותרת', '#003652', '#F5F8FB'], ['טקסט לבן בכותרת עליונה', '#FFFFFF', '#003652'],
  ['ניווט לבן', '#FFFFFF', '#0A4A7A'], ['כפתור תמיכה', '#003652', '#D4AFB9'], ['תגית אדומה', '#840032', '#F4E9EC'],
  ['שגיאה', '#840032', '#FFF7F9'], ['מספר בפעולה', '#003652', '#50B8EE'], ['פתיח על כחול בינוני', '#FFFFFF', '#2371B4'],
  ['מסגרת שדה מול רקע', '#8295A8', '#FFFFFF'],
];
for (const [name, fg, bg] of pairs) {
  const r = ratio(fg, bg); const need = name.startsWith('מסגרת') ? 3 : 4.5;
  console.log(`${r >= need ? '✓' : '✗'} ניגודיות ${name}: ${r.toFixed(2)} (נדרש ${need})`);
  if (r < need) problems++;
}
console.log(problems ? `\nנמצאו ${problems} בעיות` : `\nכל הבדיקות עברו (${pages.length} עמודים)`);
process.exit(problems ? 1 : 0);
