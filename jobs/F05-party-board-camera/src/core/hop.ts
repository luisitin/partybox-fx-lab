// A token's walk as a pure function of time: wind-up, one hop per space (air then ground), and a settle after the
// last landing. Squash and stretch keep the volume (width = 1 / sqrt(height)). CAMERA.md section 5 has the numbers.
import { RULES } from './rules.ts';
import { clamp } from './vec.ts';

export interface HopPose {
  /** Progress along the route in spaces, 0 to n. */
  u: number;
  /** Height above the ground (hop arc). */
  lift: number;
  /** Height scale (squash < 1 < stretch) and width scale. */
  sy: number;
  sxz: number;
  /** Forward lean, degrees. */
  lean: number;
  airborne: boolean;
  /** Landings so far (0 to n). */
  landed: number;
  done: boolean;
}

const H = RULES.hop;
const easeOutQuad = (t: number): number => 1 - (1 - t) * (1 - t);
const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;

/** Walk length in ms: wind-up + n steps + settle; reduced motion: a slide per space. */
export function moveDuration(n: number, reduced: boolean): number {
  if (n <= 0) return 0;
  return reduced ? n * H.reducedStepMs : H.windUpMs + n * H.stepMs + H.settleMs;
}

/** When landing k (0-based) touches down, ms from the start of the walk. */
export function contactTime(k: number, reduced: boolean): number {
  return reduced ? (k + 1) * H.reducedStepMs : H.windUpMs + k * H.stepMs + H.airMs;
}

/** The settle after the last landing: 0.80, 1.07, 0.98, 1.00 at 0, 100, 200, 300 ms. */
export const settleCurve = (ms: number): number => {
  const t = Math.max(0, ms) / 1000;
  return 1 - (1 - H.contact) * Math.exp(-t / 0.09) * Math.cos((2 * Math.PI * t) / 0.2);
};

/** Height scale through the air, f = 0..1 of the air time (after the 50 ms launch ramp). */
function airStretch(f: number): number {
  const f0 = H.launchMs / H.airMs;
  if (f <= 0.5) {
    const k = clamp((0.5 - f) / (0.5 - f0), 0, 1);
    return 1 + (H.stretchLaunch - 1) * k * k;
  }
  const k = (f - 0.5) / 0.5;
  return 1 + (H.stretchFall - 1) * k * k;
}

const rest = (u: number, landed: number, done: boolean): HopPose => ({
  u,
  lift: 0,
  sy: 1,
  sxz: 1,
  lean: 0,
  airborne: false,
  landed,
  done,
});

const withWidth = (p: Omit<HopPose, 'sxz'>): HopPose => ({ ...p, sxz: 1 / Math.sqrt(p.sy) });

/** The token's pose `ms` into a walk of `n` spaces. */
export function hopPose(ms: number, n: number, reduced: boolean): HopPose {
  if (n <= 0) return rest(0, 0, true);
  if (ms <= 0) return rest(0, 0, false);
  if (reduced) {
    const k = Math.min(n - 1, Math.floor(ms / H.reducedStepMs));
    const f = clamp((ms - k * H.reducedStepMs) / H.reducedStepMs, 0, 1);
    if (ms >= n * H.reducedStepMs) return rest(n, n, true);
    const s = f * f * (3 - 2 * f);
    return rest(k + s, f >= 1 ? k + 1 : k, false);
  }
  const total = moveDuration(n, false);
  if (ms >= total) return rest(n, n, true);
  if (ms < H.windUpMs) {
    const sy = 1 + (H.windUpCrouch - 1) * easeOutCubic(ms / H.windUpMs);
    return withWidth({ u: 0, lift: 0, sy, lean: 0, airborne: false, landed: 0, done: false });
  }
  const t = ms - H.windUpMs;
  const k = Math.min(n - 1, Math.floor(t / H.stepMs));
  const tau = t - k * H.stepMs;
  if (tau < H.airMs) {
    const f = tau / H.airMs;
    let sy: number;
    if (tau < H.launchMs) {
      const from = k === 0 ? H.windUpCrouch : H.crouch;
      sy = from + (H.stretchLaunch - from) * easeOutQuad(tau / H.launchMs);
    } else sy = airStretch(f);
    return withWidth({
      u: k + f,
      lift: 4 * H.height * f * (1 - f),
      sy,
      lean: H.leanDeg * Math.sin(Math.PI * f),
      airborne: true,
      landed: k,
      done: false,
    });
  }
  const since = tau - H.airMs;
  const last = k === n - 1;
  if (last) {
    // the last landing: impact then the damped settle, all on the ground
    const settle = settleCurve(since);
    const ramp = easeOutQuad(clamp(since / 40, 0, 1));
    const sy = H.stretchFall + (settle - H.stretchFall) * ramp;
    return withWidth({ u: n, lift: 0, sy, lean: 0, airborne: false, landed: n, done: false });
  }
  const ramp = easeOutQuad(clamp(since / 40, 0, 1));
  const sy = H.stretchFall + (H.contact - H.stretchFall) * ramp;
  return withWidth({ u: k + 1, lift: 0, sy, lean: 0, airborne: false, landed: k + 1, done: false });
}

/** The roll beat (ms after the roll): crouch, jump up to hit the die (the bonk at `turn.bonkMs`), fall, land. */
export function rollPose(ms: number, reduced: boolean): { lift: number; sy: number; sxz: number } {
  const one = { lift: 0, sy: 1, sxz: 1 };
  if (reduced || ms <= 0) return one;
  const peak = 0.95;
  let lift = 0;
  let sy = 1;
  if (ms < 90) sy = 1 + (0.78 - 1) * easeOutCubic(ms / 90);
  else if (ms < 320) {
    const f = (ms - 90) / 230;
    lift = peak * easeOutQuad(f);
    sy = f < 0.2 ? 0.78 + (1.15 - 0.78) * easeOutQuad(f / 0.2) : 1.15 - 0.15 * ((f - 0.2) / 0.8);
  } else if (ms < 560) {
    const f = (ms - 320) / 240;
    lift = peak * (1 - f * f);
    sy = 1 + 0.06 * f;
  } else if (ms < 1100) {
    const settle = settleCurve(ms - 560);
    sy = 1.06 + (settle - 1.06) * easeOutQuad(clamp((ms - 560) / 40, 0, 1));
  }
  return { lift, sy, sxz: 1 / Math.sqrt(sy) };
}

/** A star: a happy jump with a full turn, 520 ms. */
export function cheerPose(ms: number, reduced: boolean): { lift: number; spin: number; sy: number; sxz: number } {
  if (reduced || ms <= 0 || ms >= 520) return { lift: 0, spin: 0, sy: 1, sxz: 1 };
  const f = ms / 520;
  const sy = f < 0.1 ? 1 - 0.2 * (f / 0.1) : f > 0.9 ? 0.8 + 0.2 * ((f - 0.9) / 0.1) : 1.08;
  return { lift: 4 * 0.6 * f * (1 - f), spin: 2 * Math.PI * easeOutQuad(f), sy, sxz: 1 / Math.sqrt(sy) };
}
