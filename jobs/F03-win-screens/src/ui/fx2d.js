// The light-and-spark layer over the 3D stage (a 2D canvas, additive). Everything is declared up
// front from a seed and drawn as a pure function of t: sparks are closed-form ballistic paths with
// air drag, drawn as streaks from where they were a few ms ago (the motion-blur feel); flashes,
// light sweeps, glints, rings and speed lines are envelopes over time. Every effect ends before its
// ending's last frame, so the settled frame has nothing on this layer.

import { createRng } from '../core/rng.js';
import { clamp, outCubic, smoothstep, span } from '../core/ease.js';

/**
 * @typedef {object} Spark
 * @property {number} t0 @property {number} life
 * @property {number} x @property {number} y   stage px
 * @property {number} vx @property {number} vy px/s
 * @property {number} k   drag 1/s
 * @property {number} g   gravity px/s²
 * @property {number} w   line width
 * @property {string} color
 */

/**
 * Closed-form position under linear drag k and gravity g after time s.
 * @param {Spark} sp @param {number} s
 */
export function sparkAt(sp, s) {
  const e = Math.exp(-sp.k * s);
  const f = (1 - e) / sp.k;
  return {
    x: sp.x + sp.vx * f,
    y: sp.y + (sp.vy - sp.g / sp.k) * f + (sp.g / sp.k) * s,
  };
}

export function createFx(seed) {
  const rng = createRng(seed).fork('fx');
  /** @type {Spark[]} */
  const sparks = [];
  /** @type {{t0: number, dur: number, color: string, peak: number}[]} */
  const flashes = [];
  /** @type {{t0: number, dur: number, angle: number, width: number, alpha: number, color: string}[]} */
  const sweeps = [];
  /** @type {{t0: number, dur: number, x: number, y: number, size: number, color: string}[]} */
  const glints = [];
  /** @type {{t0: number, dur: number, x: number, y: number, r0: number, r1: number, color: string, width: number, squash: number}[]} */
  const rings = [];
  /** @type {{t0: number, t1: number, count: number, color: string, dir: number}[]} */
  const speedLines = [];
  /** @type {{t0: number, dur: number, x: number, y: number, r: number, color: string, alpha: number}[]} */
  const blooms = [];
  let end = 0;
  let first = Infinity;

  const fx = {
    rng,
    /**
     * A burst of sparks from (x, y).
     * @param {{t: number, x: number, y: number, count: number, speed: [number, number], angle?: number, spread?: number,
     *   colors: string[], life?: [number, number], g?: number, k?: number, w?: [number, number], jitter?: number}} o
     */
    burst(o) {
      for (let i = 0; i < o.count; i++) {
        const a = (o.angle ?? -Math.PI / 2) + (rng.next() * 2 - 1) * (o.spread ?? Math.PI);
        const sp = rng.range(o.speed[0], o.speed[1]);
        const life = rng.range(...(o.life ?? [0.5, 1.1]));
        const t0 = o.t + rng.next() * (o.jitter ?? 0.04);
        sparks.push({
          t0,
          life,
          x: o.x,
          y: o.y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          k: o.k ?? 2.6,
          g: o.g ?? 900,
          w: rng.range(...(o.w ?? [2, 4.5])),
          color: rng.pick(o.colors),
        });
        end = Math.max(end, t0 + life);
        first = Math.min(first, t0);
      }
    },
    /** @param {number} t0 @param {number} dur @param {string} [color] @param {number} [peak] */
    flash(t0, dur, color = '#ffffff', peak = 0.85) {
      flashes.push({ t0, dur, color, peak });
      end = Math.max(end, t0 + dur);
      first = Math.min(first, t0);
    },
    /**
     * A diagonal band of light crossing the stage.
     * @param {number} t0 @param {number} dur @param {{angle?: number, width?: number, alpha?: number, color?: string}} [o]
     */
    sweep(t0, dur, o = {}) {
      sweeps.push({ t0, dur, angle: o.angle ?? -0.35, width: o.width ?? 260, alpha: o.alpha ?? 0.22, color: o.color ?? '#ffffff' });
      end = Math.max(end, t0 + dur);
      first = Math.min(first, t0);
    },
    /** A four-point star glint. @param {number} t0 @param {number} x @param {number} y @param {number} [size] @param {string} [color] */
    glint(t0, x, y, size = 60, color = '#ffffff', dur = 0.5) {
      glints.push({ t0, dur, x, y, size, color });
      end = Math.max(end, t0 + dur);
      first = Math.min(first, t0);
    },
    /** An expanding shock ring (impacts, landings). */
    ring(/** @type {{t: number, x: number, y: number, r0?: number, r1: number, dur?: number, color?: string, width?: number, squash?: number}} */ o) {
      rings.push({ t0: o.t, dur: o.dur ?? 0.45, x: o.x, y: o.y, r0: o.r0 ?? 10, r1: o.r1, color: o.color ?? '#ffffff', width: o.width ?? 6, squash: o.squash ?? 0.35 });
      end = Math.max(end, o.t + (o.dur ?? 0.45));
      first = Math.min(first, o.t);
    },
    /** A soft additive light bloom (a lamp switching on, a flash on an object). */
    bloom(/** @type {{t: number, dur: number, x: number, y: number, r: number, color?: string, alpha?: number}} */ o) {
      blooms.push({ t0: o.t, dur: o.dur, x: o.x, y: o.y, r: o.r, color: o.color ?? '#ffffff', alpha: o.alpha ?? 0.5 });
      end = Math.max(end, o.t + o.dur);
      first = Math.min(first, o.t);
    },
    /** Horizontal speed streaks (racing). */
    speed(/** @type {{t0: number, t1: number, count: number, color?: string, dir?: number}} */ o) {
      speedLines.push({ t0: o.t0, t1: o.t1, count: o.count, color: o.color ?? '#ffffff', dir: o.dir ?? 1 });
      end = Math.max(end, o.t1);
      first = Math.min(first, o.t0);
    },
    /** When the last effect is gone (must be before the ending's final frame). */
    get end() {
      return end;
    },
    /**
     * @param {CanvasRenderingContext2D} ctx  already scaled to stage px
     * @param {number} t @param {number} W @param {number} H
     */
    draw(ctx, t, W, H) {
      // An empty frame hides the canvas instead of only clearing it: a clear-only frame can show a
      // recycled older buffer on some compositors (seen in headless Chromium), and hiding is free.
      const canvas = ctx.canvas;
      ctx.clearRect(0, 0, W, H);
      const active = t < end && t >= first;
      if (canvas.style) canvas.style.visibility = active ? 'visible' : 'hidden';
      if (!active) return;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      // light sweeps
      for (const s of sweeps) {
        const u = span(t, s.t0, s.t0 + s.dur);
        if (u <= 0 || u >= 1) continue;
        const travel = W + H + s.width * 2;
        const cx = -H * 0.5 - s.width + travel * outCubic(u);
        const a = s.alpha * Math.sin(Math.PI * u);
        ctx.save();
        ctx.translate(cx, H / 2);
        ctx.rotate(s.angle);
        const g = ctx.createLinearGradient(-s.width / 2, 0, s.width / 2, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(0.5, hexA(s.color, a));
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(-s.width / 2, -H * 1.5, s.width, H * 3);
        ctx.restore();
      }
      // soft blooms
      for (const b of blooms) {
        const u = span(t, b.t0, b.t0 + b.dur);
        if (u <= 0 || u >= 1) continue;
        const a = b.alpha * Math.sin(Math.PI * Math.min(1, u * 1.6)) * (1 - smoothstep((u - 0.6) / 0.4));
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        g.addColorStop(0, hexA(b.color, a));
        g.addColorStop(1, hexA(b.color, 0));
        ctx.fillStyle = g;
        ctx.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
      }
      // speed lines
      for (const s of speedLines) {
        if (t <= s.t0 || t >= s.t1) continue;
        const env = Math.sin(Math.PI * span(t, s.t0, s.t1));
        const lr = createRng(`speed${s.t0}`).fork('l');
        ctx.lineCap = 'round';
        for (let i = 0; i < s.count; i++) {
          const y = lr.range(0.05, 0.95) * H;
          const len = lr.range(160, 520);
          const v = lr.range(2600, 4200);
          const x0 = lr.range(0, W + len);
          const x = ((x0 + v * (t - s.t0)) % (W + len * 2)) - len;
          const xx = s.dir > 0 ? x : W - x;
          const g = ctx.createLinearGradient(xx - len * s.dir, y, xx, y);
          g.addColorStop(0, hexA(s.color, 0));
          g.addColorStop(1, hexA(s.color, 0.28 * env));
          ctx.strokeStyle = g;
          ctx.lineWidth = lr.range(1.5, 4);
          ctx.beginPath();
          ctx.moveTo(xx - len * s.dir, y);
          ctx.lineTo(xx, y);
          ctx.stroke();
        }
      }
      // sparks as streaks
      ctx.lineCap = 'round';
      for (const sp of sparks) {
        const s = t - sp.t0;
        if (s <= 0 || s >= sp.life) continue;
        const a = 1 - smoothstep(s / sp.life);
        const p = sparkAt(sp, s);
        const q = sparkAt(sp, Math.max(0, s - 0.028));
        ctx.strokeStyle = hexA(sp.color, a);
        ctx.lineWidth = sp.w * (0.6 + 0.4 * a);
        ctx.beginPath();
        ctx.moveTo(q.x, q.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        ctx.fillStyle = hexA('#ffffff', a * 0.9);
        ctx.beginPath();
        ctx.arc(p.x, p.y, sp.w * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
      // rings
      for (const r of rings) {
        const u = span(t, r.t0, r.t0 + r.dur);
        if (u <= 0 || u >= 1) continue;
        const rad = r.r0 + (r.r1 - r.r0) * outCubic(u);
        ctx.strokeStyle = hexA(r.color, 0.55 * (1 - u));
        ctx.lineWidth = r.width * (1 - u * 0.7);
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, rad, rad * r.squash, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      // glints
      for (const gl of glints) {
        const u = span(t, gl.t0, gl.t0 + gl.dur);
        if (u <= 0 || u >= 1) continue;
        const k = Math.sin(Math.PI * u);
        drawGlint(ctx, gl.x, gl.y, gl.size * (0.4 + 0.6 * k), gl.color, k, u * 0.8);
      }
      ctx.restore();
      // flashes last, normal blend so they whiten everything
      for (const f of flashes) {
        const u = span(t, f.t0, f.t0 + f.dur);
        if (u <= 0 || u >= 1) continue;
        const a = f.peak * (u < 0.08 ? u / 0.08 : (1 - clamp((u - 0.08) / 0.92)) ** 2);
        ctx.fillStyle = hexA(f.color, a);
        ctx.fillRect(0, 0, W, H);
      }
    },
  };
  return fx;
}

/** @param {string} hex @param {number} a */
export function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${clamp(a).toFixed(3)})`;
}

/**
 * @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} s
 * @param {string} color @param {number} a @param {number} rot
 */
function drawGlint(ctx, x, y, s, color, a, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.5);
  g.addColorStop(0, hexA('#ffffff', a));
  g.addColorStop(0.3, hexA(color, a * 0.5));
  g.addColorStop(1, hexA(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(-s, -s, s * 2, s * 2);
  ctx.fillStyle = hexA('#ffffff', a * 0.9);
  for (let i = 0; i < 2; i++) {
    ctx.beginPath();
    ctx.moveTo(-s, 0);
    ctx.quadraticCurveTo(0, -s * 0.05, s, 0);
    ctx.quadraticCurveTo(0, s * 0.05, -s, 0);
    ctx.fill();
    ctx.rotate(Math.PI / 2);
  }
  ctx.restore();
}
