// Easing, springs and timeline helpers. Every function is pure: a value from a time, nothing kept.
// Times are seconds from the start of the ending. Each helper reaches its end value EXACTLY at the
// end of its window, so the final frame of an ending is a fixed pose (skip, reduced motion and the
// natural end all show the same picture).

/** @param {number} x @param {number} lo @param {number} hi */
export const clamp = (x, lo = 0, hi = 1) => (x < lo ? lo : x > hi ? hi : x);
/** @param {number} a @param {number} b @param {number} u */
export const lerp = (a, b, u) => a + (b - a) * u;
/** 0..1 progress of t through [t0, t1], clamped. @param {number} t @param {number} t0 @param {number} t1 */
export const span = (t, t0, t1) => (t1 <= t0 ? (t >= t1 ? 1 : 0) : clamp((t - t0) / (t1 - t0)));
/** @param {number} u */
export const smoothstep = (u) => {
  const x = clamp(u);
  return x * x * (3 - 2 * x);
};
/** @param {number} u */
export const smootherstep = (u) => {
  const x = clamp(u);
  return x * x * x * (x * (x * 6 - 15) + 10);
};

/** @param {number} u */ export const outCubic = (u) => 1 - (1 - clamp(u)) ** 3;
/** @param {number} u */ export const outQuart = (u) => 1 - (1 - clamp(u)) ** 4;
/** @param {number} u */ export const outQuint = (u) => 1 - (1 - clamp(u)) ** 5;
/** @param {number} u */ export const inCubic = (u) => clamp(u) ** 3;
/** @param {number} u */ export const inQuad = (u) => clamp(u) ** 2;
/** @param {number} u */
export const inOutCubic = (u) => {
  const x = clamp(u);
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
};
/** @param {number} u */
export const inOutSine = (u) => -(Math.cos(Math.PI * clamp(u)) - 1) / 2;
/** @param {number} u */
export const outExpo = (u) => {
  const x = clamp(u);
  return x >= 1 ? 1 : 1 - 2 ** (-10 * x);
};
/**
 * Anticipation: dips below 0 before travelling (a wind-up). `s` 1.2 dips about 7 %.
 * @param {number} u @param {number} [s]
 */
export const inBack = (u, s = 1.2) => {
  const x = clamp(u);
  return (s + 1) * x * x * x - s * x * x;
};

/**
 * CSS-style cubic-bezier(x1, y1, x2, y2) as a function of u in [0, 1] (Newton + bisection).
 * PartyBox's house ease is cubic-bezier(0.2, 0.8, 0.2, 1).
 * @param {number} x1 @param {number} y1 @param {number} x2 @param {number} y2
 * @returns {(u: number) => number}
 */
export function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  /** @param {number} s */ const sx = (s) => ((ax * s + bx) * s + cx) * s;
  /** @param {number} s */ const sy = (s) => ((ay * s + by) * s + cy) * s;
  /** @param {number} s */ const dx = (s) => (3 * ax * s + 2 * bx) * s + cx;
  return (u) => {
    const x = clamp(u);
    if (x === 0 || x === 1) return x;
    let s = x;
    for (let i = 0; i < 8; i++) {
      const err = sx(s) - x;
      const d = dx(s);
      if (Math.abs(err) < 1e-7) return sy(s);
      if (Math.abs(d) < 1e-6) break;
      s -= err / d;
    }
    let lo = 0;
    let hi = 1;
    s = x;
    for (let i = 0; i < 40; i++) {
      const v = sx(s);
      if (Math.abs(v - x) < 1e-7) break;
      if (v < x) lo = s;
      else hi = s;
      s = (lo + hi) / 2;
    }
    return sy(s);
  };
}

/** PartyBox motion token: cubic-bezier(0.2, 0.8, 0.2, 1). */
export const pbEase = cubicBezier(0.2, 0.8, 0.2, 1);

/**
 * Peak overshoot of an under-damped spring step response with damping ratio `zeta`.
 * @param {number} zeta
 */
export const springOvershoot = (zeta) =>
  zeta >= 1 ? 0 : Math.exp((-zeta * Math.PI) / Math.sqrt(1 - zeta * zeta));

/**
 * A spring settle over a normalized window: 0 at u=0, 1 at u>=1, overshooting on the way like a
 * damped spring released from rest. The natural frequency is chosen so the residual is 0.1 % at
 * u=1, and the last 15 % blends onto 1 exactly (no visible jump, a fixed final pose).
 * zeta 0.7 overshoots 4.6 % (STYLE.md: at most 6 %).
 * @param {number} u @param {number} [zeta]
 */
export function spring(u, zeta = 0.7) {
  const x = clamp(u);
  if (x >= 1) return 1;
  if (x <= 0) return 0;
  const z = Math.min(Math.max(zeta, 0.05), 0.999);
  const w = 6.9 / z; // e^{-zeta*w*1} = 0.001
  const wd = w * Math.sqrt(1 - z * z);
  const e = Math.exp(-z * w * x);
  const v = 1 - e * (Math.cos(wd * x) + ((z * w) / wd) * Math.sin(wd * x));
  const blend = smoothstep((x - 0.85) / 0.15);
  return v + (1 - v) * blend;
}

/**
 * Spring progress of t through [t0, t0 + dur].
 * @param {number} t @param {number} t0 @param {number} dur @param {number} [zeta]
 */
export const springAt = (t, t0, dur, zeta = 0.7) => spring((t - t0) / dur, zeta);

/**
 * A damped wobble that starts at 0, swings, and is exactly 0 again at the end of its window.
 * Used for paper shake, a rosette swinging on its pin, a die rocking on an edge.
 * @param {number} t @param {number} t0 @param {number} dur @param {number} cycles
 */
export function wobble(t, t0, dur, cycles = 3) {
  const u = (t - t0) / dur;
  if (u <= 0 || u >= 1) return 0;
  return Math.sin(u * Math.PI * 2 * cycles) * (1 - u) ** 2.2;
}

/**
 * Deterministic smooth noise in [-1, 1] from a sum of sines with seeded phases (camera drift,
 * hand-held shake). Same t and phases give the same value on every machine.
 * @param {number} t @param {readonly number[]} phases at least 3 numbers
 */
export function sineNoise(t, phases) {
  return (
    0.55 * Math.sin(t * 1.7 + phases[0]) +
    0.3 * Math.sin(t * 3.13 + phases[1]) +
    0.15 * Math.sin(t * 7.37 + phases[2])
  );
}

/**
 * Integer count-up that lands exactly on `to` (numbers tick instead of jumping).
 * @param {number} t @param {number} t0 @param {number} dur @param {number} to @param {number} [from]
 */
export function countUp(t, t0, dur, to, from = 0) {
  const u = outQuart(span(t, t0, t0 + dur));
  const v = from + (to - from) * u;
  if (u >= 1) return to;
  const decimals = Number.isInteger(to) && Number.isInteger(from) ? 0 : 1;
  const k = 10 ** decimals;
  return Math.round(v * k) / k;
}
