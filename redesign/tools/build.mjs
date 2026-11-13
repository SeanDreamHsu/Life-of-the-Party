// Builds the playable redesign demo into one self-contained HTML file.
//   node redesign/tools/build.mjs [output.html]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const repo = resolve(root, '..');
const out = resolve(process.argv[2] ?? resolve(root, 'dist/lotp-redesign.html'));
const tmp = resolve(root, 'dist/.bundle');
execFileSync('node', [resolve(repo, 'node_modules/vite/bin/vite.js'), 'build', '--config', resolve(root, 'tools/vite.config.mjs')], {
  cwd: root, stdio: 'inherit', env: { ...process.env, ENTRY: resolve(root, 'src/demo/main.ts'), OUT: tmp },
});
const js = readFileSync(resolve(tmp, 'bundle.js'), 'utf8').replace(/<\/script/gi, '<\\/script');
const img = 'data:image/jpeg;base64,' + readFileSync(resolve(root, 'before.jpg')).toString('base64');
const notes = readFileSync(resolve(root, 'notes.html'), 'utf8').replace('__BEFORE__', () => img);
const html = readFileSync(resolve(root, 'template.html'), 'utf8').replace('<!--NOTES-->', () => notes).replace('/*__DEMO_JS__*/', () => js);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log('built', out, (html.length / 1024).toFixed(0) + ' KB');
