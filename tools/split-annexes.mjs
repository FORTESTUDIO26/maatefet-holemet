// Splits the official instruction 80-36 PDF into separate annex PDFs, page-for-page (no re-typesetting).
// Usage: node tools/split-annexes.mjs <path-to-80-36.pdf>
// Requires: npm i pdf-lib (dev only). Update PAGES if a new edition changes page numbers.
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
const PAGES = { // 1-based page numbers in the 29/04/2025 edition
  'nispach-a': [6], 'nispach-b': [7, 8], 'nispach-c': [9],
  'nispach-d': [10], 'nispach-e': [11], 'nispach-f': [12],
};
const src = await PDFDocument.load(fs.readFileSync(process.argv[2] || 'sources-cache/80-36.pdf'));
for (const [name, pages] of Object.entries(PAGES)) {
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, pages.map(p => p - 1));
  copied.forEach(p => out.addPage(p));
  out.setTitle(`הוראה 80-36 – ${name}`); out.setProducer('split-annexes.mjs (page copy from official PDF)');
  fs.writeFileSync(`docs/forms/80-36-${name}.pdf`, await out.save());
  console.log(name, pages);
}
