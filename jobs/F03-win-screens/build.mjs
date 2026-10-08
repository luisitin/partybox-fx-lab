// Builds index.html from src/: bundles src/main.js with three.js (pinned in package.json) into one
// inline script, inlines src/style.css, and writes a single self-contained page that opens from disk
// with no network. Deterministic: the same sources and versions give the same bytes.
//   node build.mjs          write index.html
//   node build.mjs --check  fail (exit 1) if index.html is not what the sources build to
import { build } from 'esbuild';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const check = process.argv.includes('--check');

const result = await build({
  entryPoints: [join(here, 'src/main.js')],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2020', 'chrome90', 'safari15', 'firefox90'],
  minify: true,
  legalComments: 'eof',
  write: false,
  logLevel: 'warning',
  charset: 'utf8',
});
let js = result.outputFiles[0].text;
// an inline <script> must never contain its own end tag or an HTML comment opener
js = js.replace(/<\/(script)/gi, '<\\/$1').replace(/<!--/g, '<\\!--');
const css = readFileSync(join(here, 'src/style.css'), 'utf8').trim();
const template = readFileSync(join(here, 'src/template.html'), 'utf8');
if (!template.includes('/*STYLE*/') || !template.includes('/*SCRIPT*/')) throw new Error('template placeholders missing');
const html = template.replace('/*STYLE*/', () => css).replace('/*SCRIPT*/', () => js.trim());
const out = join(here, 'index.html');
const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);
if (check) {
  const current = existsSync(out) ? readFileSync(out, 'utf8') : '';
  if (current !== html) {
    console.error(`index.html is stale: built ${sha(html)}, on disk ${sha(current)}. Run: node build.mjs`);
    process.exit(1);
  }
  console.log(`index.html is up to date (${(html.length / 1024).toFixed(0)} KB, sha256 ${sha(html)}…)`);
} else {
  writeFileSync(out, html);
  console.log(`wrote index.html (${(html.length / 1024).toFixed(0)} KB, sha256 ${sha(html)}…)`);
}
