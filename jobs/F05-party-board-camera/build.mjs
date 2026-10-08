// Builds index.html from src/: esbuild bundles src/main.ts with three.js into one inline script, and the result
// replaces <!--BUNDLE--> in src/index.html. Deterministic (pinned esbuild, no timestamps). `--check` rebuilds in
// memory and fails if index.html or THIRD-PARTY-LICENSES.txt on disk differ from what src/ produces.
import { build } from 'esbuild';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const check = process.argv.includes('--check');

const result = await build({
  entryPoints: [join(here, 'src/main.ts')],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  minify: true,
  legalComments: 'eof',
  charset: 'utf8',
  write: false,
  logLevel: 'warning',
  define: { 'process.env.NODE_ENV': '"production"' },
});
let js = result.outputFiles[0].text.trim();
js = js.replace(/<\/script/gi, '<\\/script');
for (const bad of ['<!--', '<script']) {
  if (js.toLowerCase().includes(bad)) throw new Error(`bundle contains ${bad}; it cannot be inlined safely`);
}
const pkg = JSON.parse(readFileSync(join(here, 'node_modules/three/package.json'), 'utf8'));
const template = readFileSync(join(here, 'src/index.html'), 'utf8');
if (!template.includes('<!--BUNDLE-->')) throw new Error('src/index.html has no <!--BUNDLE--> marker');
const banner = `<!-- Built from src/ by build.mjs (npm run build); do not edit by hand. Includes three.js ${pkg.version} (MIT, see THIRD-PARTY-LICENSES.txt). -->`;
const html = template.replace('<!--BUNDLE-->', () => `${banner}\n<script>${js}</script>`);
const license = readFileSync(join(here, 'node_modules/three/LICENSE'), 'utf8').trim();
const notices =
  'Third-party software inlined in index.html\n' +
  '===========================================\n\n' +
  `three.js ${pkg.version} (https://threejs.org), MIT License, including the RoundedBoxGeometry add-on:\n\n` +
  license +
  '\n';

const outputs = [
  ['index.html', html],
  ['THIRD-PARTY-LICENSES.txt', notices],
];
let stale = 0;
for (const [name, text] of outputs) {
  const path = join(here, name);
  if (check) {
    const now = existsSync(path) ? readFileSync(path, 'utf8') : '';
    if (now !== text) {
      console.error(`${name} is stale: run npm run build and commit the result`);
      stale++;
    }
  } else writeFileSync(path, text);
}
if (check) {
  if (stale) process.exit(1);
  console.log(`build check: index.html and THIRD-PARTY-LICENSES.txt match src/ (${(html.length / 1024).toFixed(0)} KiB)`);
} else console.log(`built index.html (${(html.length / 1024).toFixed(0)} KiB)`);
