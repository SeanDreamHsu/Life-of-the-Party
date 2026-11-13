// Renders a contact sheet entry (a .ts file that draws to the page) to a PNG, for reviewing art.
//   node redesign/tools/sheet.mjs src/art/sheet.ts out.png [width] [height]
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
const root = fileURLToPath(new URL('..', import.meta.url));
const repo = resolve(root, '..');
const [entry, out, w, h] = process.argv.slice(2);
const tmp = resolve(root, 'dist/.sheet');
execFileSync('node', [resolve(repo, 'node_modules/vite/bin/vite.js'), 'build', '--config', resolve(root, 'tools/vite.config.mjs')], {
  cwd: root, stdio: 'inherit', env: { ...process.env, ENTRY: resolve(root, entry), OUT: tmp, MINIFY: '0' },
});
writeFileSync(resolve(tmp, 'index.html'), '<!doctype html><meta charset=utf-8><body><script>' + readFileSync(resolve(tmp, 'bundle.js'), 'utf8') + '</script>');
const { chromium } = createRequire(import.meta.url)('playwright');
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: +w || 1600, height: +h || 1000 }, deviceScaleFactor: 1 });
p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
p.on('console', (m) => { if (m.type() === 'error') console.log('ERR', m.text()); });
await p.goto('file://' + resolve(tmp, 'index.html'));
await p.waitForFunction('window.done === true', null, { timeout: 15000 }).catch(() => console.log('timeout'));
await p.screenshot({ path: resolve(out), fullPage: true });
await b.close();
console.log('wrote', out);
