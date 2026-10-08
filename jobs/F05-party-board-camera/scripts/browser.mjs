// Shared browser setup for the tests and tools: Playwright's Chromium with SwiftShader (software WebGL), the page
// opened from file:// with a manual clock, and a guard that records console errors and any network request.
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const PAGE = pathToFileURL(join(ROOT, 'index.html')).href;

/** Chromium: $PW_CHROMIUM, else the sandbox's pinned build if present, else Playwright's own download. */
function executablePath() {
  if (process.env.PW_CHROMIUM) return process.env.PW_CHROMIUM;
  const local = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  return existsSync(local) ? local : undefined;
}

export async function launch() {
  const exe = executablePath();
  return chromium.launch({
    ...(exe ? { executablePath: exe } : {}),
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
}

/** Open the page; returns { page, errors, requests }. `query` is the URL's search string without '?'. */
export async function open(browser, query, viewport = { width: 1920, height: 1080 }, extra = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, ...extra });
  const page = await context.newPage();
  const errors = [];
  const requests = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await context.route('**/*', (route) => {
    const url = route.request().url();
    if (!url.startsWith('file:')) {
      requests.push(url);
      return route.abort();
    }
    return route.continue();
  });
  page.on('request', (r) => {
    const url = r.url();
    if (!url.startsWith('file:') && !url.startsWith('data:') && !url.startsWith('blob:') && !requests.includes(url)) requests.push(url);
  });
  await page.goto(`${PAGE}?${query}`);
  await page.waitForFunction(() => !!window.PartyBoard, null, { timeout: 60000 });
  return { page, context, errors, requests };
}

/** Advance the manual clock by `ms` (in one call, 60 steps a second) and render. */
export const advance = (page, ms, fps = 60) => page.evaluate(([m, f]) => window.PartyBoard.debug.advance(m, f), [ms, fps]);
