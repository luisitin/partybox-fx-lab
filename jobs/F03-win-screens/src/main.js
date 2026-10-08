// PartyBox win screens: the player. One page, nine endings, two views (TV, phone).
// Time is the only input that moves anything: render(t) draws the ending at t seconds, so a skip
// is render(duration), reduced motion is render(duration) with a fade, and a test can step time
// by hand (window.__winStep). PartyBox drives it through window.PartyBoxWin.

import { ENDINGS, normalizeOptions, queryInput } from './core/params.js';
import { createRng } from './core/rng.js';
import { smoothstep } from './core/ease.js';
import { createFx } from './ui/fx2d.js';
import { createLockup } from './ui/lockup.js';
import { SCENES } from './scenes/index.js';
import { createPhone, PHONE_DURATION } from './phone/phone.js';
import { createStage, placeCamera } from './gl/stage.js';

const TV = { w: 1920, h: 1080 };
const PHONE = { w: 390, h: 844 };
const REDUCED_FADE = 0.6;
const SKIP_VEIL = 0.28;

/** Upper bounds from the job: the default under 4 s, every themed ending under 6 s. */
export const BOUNDS = { default: 4, themed: 6 };

/**
 * @typedef {object} Run
 * @property {number} id
 * @property {import('./core/params.js').WinOptions} opts
 * @property {number} duration
 * @property {number} startVt
 * @property {number} lastT
 * @property {boolean} reduced
 * @property {number|null} skipVt
 * @property {boolean} done
 * @property {string} reason
 * @property {{t: number, name: string}[]} beats
 * @property {(t: number) => void} draw
 * @property {() => object} pose
 * @property {() => void} teardown
 * @property {(r: {reason: string, ending: string}) => void} resolve
 * @property {number} frames
 * @property {number} jsMs  time spent in draw() (performance.now), summed
 */

function boot() {
  const doc = document;
  const root = doc.createElement('div');
  root.id = 'pbw';
  root.className = 'pbw';
  doc.body.appendChild(root);
  const stageBox = doc.createElement('div');
  stageBox.className = 'pbw-stage';
  root.appendChild(stageBox);
  const live = doc.createElement('div');
  live.className = 'pbw-sr';
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  root.appendChild(live);

  const urlInput = queryInput(location.search);
  const media = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;

  /** @type {null | ReturnType<typeof createStage>} */
  let gl = null;
  /** @type {HTMLCanvasElement|null} */
  let glCanvas = null;
  /** @type {Run|null} */
  let run = null;
  let runSeq = 0;
  /** virtual clock, ms (integers when stepped by hand, so 700 + 2900 is exactly 3600) */
  let vt = 0;
  let lastNow = -1;
  let rafId = 0;
  let manual = urlInput.clock === 'manual';
  let disposed = false;
  let scale = 1;
  /** @type {{w: number, h: number}} */
  let size = TV;
  const autoQ = { samples: /** @type {number[]} */ ([]), stepped: 0 };

  const fxCanvas = doc.createElement('canvas');
  fxCanvas.className = 'pbw-fx';
  const ui = doc.createElement('div');
  ui.className = 'pbw-ui';
  const veil = doc.createElement('div');
  veil.className = 'pbw-veil';

  function layout() {
    const W = root.clientWidth || innerWidth;
    const H = root.clientHeight || innerHeight;
    scale = Math.min(W / size.w, H / size.h);
    stageBox.style.width = `${size.w}px`;
    stageBox.style.height = `${size.h}px`;
    stageBox.style.transform = `translate(-50%, -50%) scale(${scale})`;
    const pr = Math.min(2, scale * (devicePixelRatio || 1));
    const fxPr = Math.min(1.5, pr);
    fxCanvas.width = Math.round(size.w * fxPr);
    fxCanvas.height = Math.round(size.h * fxPr);
    fxCanvas.dataset.pr = String(fxPr);
    if (gl && size === TV) gl.resize(size.w, size.h, pr);
  }

  function ensureGl() {
    if (gl) return gl;
    glCanvas = doc.createElement('canvas');
    glCanvas.className = 'pbw-gl';
    gl = createStage(glCanvas);
    return gl;
  }

  function fxCtx() {
    const ctx = /** @type {CanvasRenderingContext2D} */ (fxCanvas.getContext('2d'));
    const pr = Number(fxCanvas.dataset.pr || 1);
    ctx.setTransform(pr, 0, 0, pr, 0, 0);
    return ctx;
  }

  function prefersReduced(/** @type {import('./core/params.js').WinOptions} */ o) {
    if (o.motion === 'reduce') return true;
    if (o.motion === 'full') return false;
    return Boolean(media?.matches);
  }

  /** @param {Run} r @param {string} reason */
  function finish(r, reason) {
    if (r.done) return;
    r.done = true;
    r.reason = reason;
    const detail = { reason, ending: r.opts.ending, view: r.opts.view, duration: r.duration };
    r.resolve(detail);
    window.dispatchEvent(new CustomEvent('partybox-win-done', { detail }));
  }

  function frame(/** @type {number} */ now) {
    rafId = 0;
    if (disposed || !run) return;
    if (!manual) {
      if (lastNow >= 0) vt += Math.max(0, now - lastNow);
      lastNow = now;
    }
    tick();
    if (!manual && run && needsFrames(run)) rafId = requestAnimationFrame(frame);
  }

  /** @param {Run} r */
  function needsFrames(r) {
    const local = (vt - r.startVt) / 1000;
    if (r.reduced) return local < REDUCED_FADE + 0.05;
    if (r.skipVt !== null) return (vt - r.skipVt) / 1000 < SKIP_VEIL + 0.05;
    return !r.done || local < r.duration + 0.05;
  }

  function tick() {
    const r = run;
    if (!r) return;
    const local = (vt - r.startVt) / 1000;
    const settled = r.reduced || r.skipVt !== null;
    const t = settled || local >= r.duration - 1e-6 ? r.duration : Math.max(local, 0);
    const t0 = performance.now();
    r.draw(t);
    const ms = performance.now() - t0;
    r.jsMs += ms;
    r.frames += 1;
    if (!settled) {
      for (const b of r.beats) {
        if (b.t > r.lastT && b.t <= t) window.dispatchEvent(new CustomEvent('partybox-win-beat', { detail: { name: b.name, t: b.t, ending: r.opts.ending } }));
      }
    }
    r.lastT = t;
    if (r.reduced) {
      const a = smoothstep(local / REDUCED_FADE);
      stageBox.style.opacity = a.toFixed(3);
      if (local >= REDUCED_FADE) {
        stageBox.style.opacity = '1';
        finish(r, 'reduced');
      }
    } else {
      stageBox.style.opacity = '1';
    }
    if (r.skipVt !== null) {
      const v = 1 - smoothstep((vt - r.skipVt) / 1000 / SKIP_VEIL);
      veil.style.opacity = (0.55 * v).toFixed(3);
    } else veil.style.opacity = '0';
    if (!settled && t >= r.duration) finish(r, 'complete');
    // auto quality: step down when real frames run long (never in manual clock mode)
    if (!manual && gl && r.opts.quality === 'auto' && r.opts.view === 'tv' && !settled) {
      autoQ.samples.push(ms);
      if (autoQ.samples.length >= 24) {
        const sorted = [...autoQ.samples].sort((a, b) => a - b);
        const median = sorted[12];
        autoQ.samples.length = 0;
        if (median > 22 && autoQ.stepped < 2) {
          autoQ.stepped += 1;
          gl.setQuality(autoQ.stepped === 1 ? 'medium' : 'low');
          layout();
        }
      }
    }
  }

  function kick() {
    if (manual || disposed || rafId) return;
    lastNow = -1;
    rafId = requestAnimationFrame(frame);
  }

  /** @param {Record<string, unknown>} input */
  function play(input = {}) {
    if (disposed) return Promise.resolve({ reason: 'disposed', ending: String(input.ending ?? '') });
    const merged = { ...urlInput, ...input };
    const opts = normalizeOptions(merged, { portrait: innerWidth < innerHeight && innerWidth < 700 });
    if (input.clock === 'manual') manual = true;
    const id = ++runSeq;
    if (run) {
      const prev = run;
      prev.teardown();
      finish(prev, 'superseded');
      run = null;
    }
    root.classList.toggle('pbw-phone', opts.view === 'phone');
    root.classList.toggle('pbw-tv', opts.view === 'tv');
    root.classList.toggle('pbw-kiosk', opts.kiosk);
    size = opts.view === 'phone' ? PHONE : TV;
    stageBox.replaceChildren();
    ui.replaceChildren();
    const rng = createRng(opts.seed);
    const fx = createFx(opts.seed);
    /** @type {Pick<Run, 'duration'|'beats'|'draw'|'pose'|'teardown'>} */
    let view;
    if (opts.view === 'tv') {
      const stage = ensureGl();
      stageBox.append(/** @type {HTMLCanvasElement} */ (glCanvas), fxCanvas, ui, veil);
      layout();
      const mod = SCENES[opts.ending];
      const scene = stage.begin(mod.backdrop(opts));
      const built = mod.build({ stage, THREE: stage.THREE, scene, opts, rng, fx, W: TV.w, H: TV.h, ui });
      const lockup = createLockup(ui, opts, built.lockup);
      live.textContent = lockup.summary();
      const phases = Array.from({ length: 6 }, () => rng.range(0, Math.PI * 2));
      if (fx.end >= mod.duration) throw new Error(`fx outlive ${opts.ending}`);
      view = {
        duration: mod.duration,
        beats: built.beats ?? [],
        draw(t) {
          built.update(t);
          placeCamera(stage.camera, built.camera(t), t, built.settle ?? mod.duration, built.shakes ?? [], phases, built.drift ?? 0.025);
          built.afterCamera?.(t);
          lockup.update(t);
          fx.draw(fxCtx(), t, TV.w, TV.h);
          stage.render();
        },
        pose() {
          return { ending: opts.ending, objects: built.pose ? built.pose() : stagePose(stage.scene), lockup: lockupPose(ui), camera: [...stage.camera.position.toArray(), ...stage.camera.quaternion.toArray()].map(round) };
        },
        teardown() {
          built.dispose?.();
          stage.end();
        },
      };
    } else {
      stageBox.append(ui, fxCanvas, veil);
      layout();
      const phone = createPhone(ui, opts, rng, fx);
      live.textContent = phone.summary();
      view = {
        duration: PHONE_DURATION,
        beats: phone.beats,
        draw(t) {
          phone.update(t, fxCtx());
        },
        pose() {
          return { ending: opts.ending, objects: phone.pose(), lockup: lockupPose(ui) };
        },
        teardown() {
          phone.dispose();
        },
      };
    }
    /** @type {(r: {reason: string, ending: string}) => void} */
    let resolve = () => {};
    const promise = new Promise((res) => {
      resolve = res;
    });
    run = {
      id,
      opts,
      duration: view.duration,
      startVt: vt,
      lastT: -1,
      reduced: prefersReduced(opts),
      skipVt: null,
      done: false,
      reason: '',
      beats: view.beats,
      draw: view.draw,
      pose: view.pose,
      teardown: view.teardown,
      resolve,
      frames: 0,
      jsMs: 0,
    };
    root.dataset.ending = opts.ending;
    root.dataset.state = 'playing';
    promise.then((d) => {
      if (run && run.id === id) root.dataset.state = /** @type {any} */ (d).reason;
    });
    tick();
    kick();
    return promise;
  }

  function skip() {
    const r = run;
    if (!r || r.done || r.reduced || r.skipVt !== null) return false;
    r.skipVt = vt;
    tick();
    finish(r, 'skip');
    kick();
    return true;
  }

  function dispose() {
    if (disposed) return;
    if (run) {
      run.teardown();
      finish(run, 'disposed');
      run = null;
    }
    disposed = true;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    removeEventListener('keydown', onKey, true);
    removeEventListener('resize', onResize);
    stageBox.removeEventListener('pointerdown', onPointer);
    media?.removeEventListener?.('change', onMotion);
    gl?.dispose();
    gl = null;
    root.remove();
  }

  /** @param {KeyboardEvent} e */
  function onKey(e) {
    if (e.key === ' ' || e.key === 'Escape' || e.key === 'Enter' || e.code === 'Space') {
      if (skip()) e.preventDefault();
    }
  }
  /** @param {PointerEvent} e */
  function onPointer(e) {
    if (e.button === 0 || e.pointerType !== 'mouse') skip();
  }
  function onResize() {
    layout();
    if (run && (run.done || manual)) tick();
  }
  function onMotion() {
    if (media?.matches && run && !run.done) skip();
  }

  addEventListener('keydown', onKey, true);
  addEventListener('resize', onResize);
  stageBox.addEventListener('pointerdown', onPointer);
  media?.addEventListener?.('change', onMotion);

  // demo bar (hidden in kiosk mode and when PartyBox drives the page)
  if (!urlInput.kiosk) buildDemoBar(root, (ending) => play({ ending }), () => play({}), (v) => play({ view: v }));

  const api = {
    play,
    skip,
    dispose,
    /** The endings this page can play and their lengths (seconds). */
    endings: () => ENDINGS.map((e) => ({ id: e, duration: SCENES[e].duration, phoneDuration: PHONE_DURATION, bound: e === 'default' ? BOUNDS.default : BOUNDS.themed })),
  };
  Object.defineProperty(window, 'PartyBoxWin', { value: Object.freeze(api), configurable: true });

  // test hooks: a deterministic clock and the state of the run
  Object.assign(window, {
    /** Advance time by ms and draw once (switches the page to the manual clock). @param {number} ms */
    __winStep(ms) {
      manual = true;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      vt += Math.max(0, Math.round(Number(ms) || 0));
      tick();
      return window.__winState();
    },
    __winState() {
      const r = run;
      return r
        ? { ending: r.opts.ending, view: r.opts.view, t: Math.min((vt - r.startVt) / 1000, r.duration), local: (vt - r.startVt) / 1000, duration: r.duration, done: r.done, reason: r.reason, reduced: r.reduced, skipped: r.skipVt !== null, frames: r.frames, jsMs: r.jsMs, raf: rafId !== 0, manual, quality: gl?.quality ?? null, info: gl && r.opts.view === 'tv' ? gl.info() : null }
        : { ending: null, done: true, raf: rafId !== 0, disposed };
    },
    __winPose() {
      return run ? run.pose() : null;
    },
  });

  try {
    play({});
  } catch (err) {
    console.error(err);
  }
}

/** @param {number} v */
const round = (v) => Math.round(v * 1e4) / 1e4;

/** @param {any} scene */
function stagePose(scene) {
  /** @type {any[]} */
  const out = [];
  scene.traverse((/** @type {any} */ o) => {
    if (!o.isMesh && !o.isLight) return;
    out.push([o.name || o.type, o.visible, ...o.position.toArray(), ...o.quaternion.toArray(), ...o.scale.toArray()].map((v) => (typeof v === 'number' ? round(v) : v)));
    if (o.isInstancedMesh) {
      let sum = 0;
      for (let i = 0; i < o.count * 16; i++) sum += o.instanceMatrix.array[i] * ((i % 7) + 1);
      out.push(['instances', o.count, round(sum)]);
    }
  });
  return out;
}

/** @param {HTMLElement} ui */
function lockupPose(ui) {
  return Array.from(ui.querySelectorAll('*'), (e) => {
    const s = /** @type {HTMLElement} */ (e).style;
    return [e.className, s.opacity, s.transform, e.childElementCount ? '' : e.textContent];
  });
}

/**
 * @param {HTMLElement} root @param {(e: string) => void} pick @param {() => void} replay @param {(v: 'tv'|'phone') => void} view
 */
function buildDemoBar(root, pick, replay, view) {
  const bar = document.createElement('nav');
  bar.className = 'pbw-bar';
  bar.setAttribute('aria-label', 'Choose an ending');
  const stop = (/** @type {Event} */ e) => e.stopPropagation();
  bar.addEventListener('pointerdown', stop);
  bar.addEventListener('keydown', stop);
  const labels = { default: 'Default', cards: 'Cards', dice: 'Dice', board: 'Board', trivia: 'Trivia', drawing: 'Drawing', detective: 'Detective', racing: 'Racing', words: 'Words' };
  for (const e of ENDINGS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = labels[e];
    b.dataset.ending = e;
    b.addEventListener('click', () => pick(e));
    bar.appendChild(b);
  }
  const sep = document.createElement('span');
  sep.className = 'pbw-bar-sep';
  bar.appendChild(sep);
  const again = document.createElement('button');
  again.type = 'button';
  again.className = 'pbw-bar-primary';
  again.textContent = 'Replay';
  again.addEventListener('click', () => replay());
  bar.appendChild(again);
  for (const v of /** @type {const} */ (['tv', 'phone'])) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = v === 'tv' ? 'TV' : 'Phone';
    b.addEventListener('click', () => view(v));
    bar.appendChild(b);
  }
  root.appendChild(bar);
  const sync = () => {
    for (const b of bar.querySelectorAll('button[data-ending]')) b.classList.toggle('on', /** @type {HTMLElement} */ (b).dataset.ending === root.dataset.ending);
  };
  new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['data-ending'] });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
