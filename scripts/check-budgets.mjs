// Bundle budgets from docs/DESIGN.md §7, checked against the production build.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const dir = 'apps/web/dist/assets';
const KB = 1024;
const budgets = [
  { name: 'shell entry (gzip)', test: (f) => /^main-.*\.js$/.test(f) || /^house-.*\.js$/.test(f), max: 140 * KB },
  { name: 'imprint chunk (gzip)', test: (f) => /^(AmazeenApp|RouteenApp|CasheenApp|ChaptersView|AlmanacView)-.*\.js$/.test(f), max: 90 * KB },
  { name: '3D chunk (gzip)', test: (f) => /scene|three/i.test(f) && f.endsWith('.js'), max: 220 * KB },
];
let failed = false;
const files = readdirSync(dir);
for (const b of budgets) {
  for (const f of files.filter(b.test)) {
    const size = gzipSync(readFileSync(join(dir, f))).length;
    const ok = size <= b.max;
    if (!ok) failed = true;
    console.log(`${ok ? 'ok  ' : 'OVER'} ${b.name.padEnd(22)} ${f.padEnd(40)} ${(size / KB).toFixed(1)} KB / ${b.max / KB} KB`);
  }
}
const woff = files.filter((f) => f.endsWith('.woff2')).reduce((s, f) => s + statSync(join(dir, f)).size, 0);
console.log(`info fonts total (all imprints)    ${(woff / KB).toFixed(0)} KB`);
if (failed) {
  console.error('Bundle budget exceeded.');
  process.exit(1);
}
