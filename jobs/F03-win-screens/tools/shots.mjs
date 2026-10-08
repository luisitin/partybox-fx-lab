// Screenshots of endings at chosen times, on the deterministic clock (window.__winStep).
//   node tools/shots.mjs --endings default,dice --views tv,phone --times 0.5,1.5,end --out <dir> [--scale 1]
// "end" is the ending's final frame. Uses Playwright's Chromium (or $CHROMIUM_PATH) with SwiftShader.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : def;
};
const endings = arg('endings', 'default').split(',');
const views = arg('views', 'tv').split(',');
const times = arg('times', 'end').split(',');
const out = resolve(arg('out', join(here, '..', 'shots')));
const scale = Number(arg('scale', '1'));
const extra = arg('query', '');
mkdirSync(out, { recursive: true });
const page0 = pathToFileURL(join(here, '..', 'index.html')).href;
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
for (const view of views) {
  const size = view === 'phone' ? { width: 390, height: 844 } : { width: Math.round(1920 * scale), height: Math.round(1080 * scale) };
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: view === 'phone' ? 2 : 1 });
  for (const ending of endings) {
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto(`${page0}?ending=${ending}&view=${view}&seed=1&clock=manual&kiosk&winner=Ana&score=42&second=Ben:30&third=Cy:12${extra ? `&${extra}` : ''}`);
    await page.waitForFunction(() => window.__winState && window.__winState().ending);
    let now = 0;
    for (const tm of times) {
      const dur = await page.evaluate(() => window.__winState().duration);
      const target = tm === 'end' ? dur : Number(tm);
      const t0 = Date.now();
      await page.evaluate((ms) => window.__winStep(ms), Math.max(0, (target - now) * 1000));
      now = target;
      const file = join(out, `${ending}-${view}-${tm === 'end' ? 'end' : target.toFixed(2)}.png`);
      await page.screenshot({ path: file });
      console.log(file, `${Date.now() - t0} ms`, errors.length ? errors.slice(0, 3) : '');
    }
    await page.close();
  }
  await ctx.close();
}
await browser.close();
