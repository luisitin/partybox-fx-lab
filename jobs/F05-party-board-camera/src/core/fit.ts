// Camera maths without three: the lens (R2), the view basis for a heading and pitch, projection to the screen,
// and the frame fit of CAMERA.md section 4 in two independent implementations (closed form and bisection).
import { DEG, RULES } from './rules.ts';
import type { Margins } from './rules.ts';
import type { Vec3 } from './vec.ts';
import { add, dot, scale, sub } from './vec.ts';

export interface Lens {
  aspect: number;
  /** Vertical and horizontal field of view, radians. */
  vFov: number;
  hFov: number;
}

/** R2: one vertical field of view; a narrow window widens it so the horizontal view never drops below 30 deg. */
export function lensFor(aspect: number): Lens {
  const a = Number.isFinite(aspect) && aspect > 0 ? aspect : 16 / 9;
  let vFov = RULES.lens.vFovDeg * DEG;
  const minH = RULES.lens.minHFovDeg * DEG;
  if (2 * Math.atan(Math.tan(vFov / 2) * a) < minH) vFov = 2 * Math.atan(Math.tan(minH / 2) / a);
  return { aspect: a, vFov, hFov: 2 * Math.atan(Math.tan(vFov / 2) * a) };
}

export interface Basis {
  forward: Vec3;
  right: Vec3;
  up: Vec3;
}

/** View axes for a heading (0 = looking north, -z) and a pitch below the horizon, degrees. */
export function viewBasis(yawDeg: number, pitchDeg: number): Basis {
  const y = yawDeg * DEG;
  const p = pitchDeg * DEG;
  const cp = Math.cos(p);
  const sp = Math.sin(p);
  const forward: Vec3 = [-Math.sin(y) * cp, -sp, -Math.cos(y) * cp];
  const right: Vec3 = [Math.cos(y), 0, -Math.sin(y)];
  const up: Vec3 = [-Math.sin(y) * sp, cp, -Math.cos(y) * sp];
  return { forward, right, up };
}

/** Screen position of `point` (0..1 from the left and from the top) and its depth, for a camera at `eye` looking
 *  at `target` with world up +y (the same convention as three's lookAt). */
export function project(point: Vec3, eye: Vec3, target: Vec3, lens: Lens): [number, number, number] {
  const f = sub(target, eye);
  const fl = Math.hypot(f[0], f[1], f[2]) || 1;
  const fw: Vec3 = [f[0] / fl, f[1] / fl, f[2] / fl];
  // right = forward x worldUp, up = right x forward
  let r: Vec3 = [-fw[2], 0, fw[0]];
  const rl = Math.hypot(r[0], r[2]) || 1;
  r = [r[0] / rl, 0, r[2] / rl];
  const u: Vec3 = [
    r[1] * fw[2] - r[2] * fw[1],
    r[2] * fw[0] - r[0] * fw[2],
    r[0] * fw[1] - r[1] * fw[0],
  ];
  const rel = sub(point, eye);
  const z = dot(rel, fw);
  const x = dot(rel, r) / (z * Math.tan(lens.hFov / 2));
  const y = dot(rel, u) / (z * Math.tan(lens.vFov / 2));
  return [0.5 + 0.5 * x, 0.5 - 0.5 * y, z];
}

export interface Fit {
  /** Where the camera aims (on its view axis) and how far back it stands. */
  aim: Vec3;
  distance: number;
  eye: Vec3;
  /** Which limit set the distance: the frame's width, its height, the minimum distance, or the lens's near side. */
  binding?: 'x' | 'y' | 'min' | 'near';
}

/** CAMERA.md section 4, closed form: the nearest camera at this heading and pitch that keeps every point inside
 *  the margins (screen fractions), never nearer than `minDistance`. */
export function fitPoints(
  points: readonly Vec3[],
  yawDeg: number,
  pitchDeg: number,
  margins: Margins,
  lens: Lens,
  minDistance = 0,
): Fit {
  const { forward, right, up } = viewBasis(yawDeg, pitchDeg);
  const n = points.length;
  let cx = 0;
  let cy = 0;
  let cz = 0;
  for (const p of points) {
    cx += p[0];
    cy += p[1];
    cz += p[2];
  }
  const a0: Vec3 = n > 0 ? [cx / n, cy / n, cz / n] : [0, 0, 0];
  const tx = Math.tan(lens.hFov / 2);
  const ty = Math.tan(lens.vFov / 2);
  const px = (1 - 2 * margins.right) * tx;
  const qx = (1 - 2 * margins.left) * tx;
  const py = (1 - 2 * margins.top) * ty;
  const qy = (1 - 2 * margins.bottom) * ty;
  let hiX = -Infinity;
  let loX = Infinity;
  let hiY = -Infinity;
  let loY = Infinity;
  let nearest = Infinity;
  const xs: number[] = [];
  const ys: number[] = [];
  const zs: number[] = [];
  for (const p of points) {
    const rel = sub(p, a0);
    const x = dot(rel, right);
    const y = dot(rel, up);
    const z = dot(rel, forward);
    xs.push(x);
    ys.push(y);
    zs.push(z);
    hiX = Math.max(hiX, x - px * z);
    loX = Math.min(loX, x + qx * z);
    hiY = Math.max(hiY, y - py * z);
    loY = Math.min(loY, y + qy * z);
    nearest = Math.min(nearest, z);
  }
  if (n === 0) return { aim: a0, distance: minDistance, eye: sub(a0, scale(forward, minDistance)) };
  const dx = (hiX - loX) / (px + qx);
  const dy = (hiY - loY) / (py + qy);
  // every point stays at least 1 unit in front of the lens
  const d = Math.max(dx, dy, minDistance, 1 - nearest);
  const binding = d === dx ? 'x' : d === dy ? 'y' : d === minDistance ? 'min' : 'near';
  let sxLo = -Infinity;
  let sxHi = Infinity;
  let syLo = -Infinity;
  let syHi = Infinity;
  for (let i = 0; i < n; i++) {
    const z = zs[i]! + d;
    sxLo = Math.max(sxLo, xs[i]! - px * z);
    sxHi = Math.min(sxHi, xs[i]! + qx * z);
    syLo = Math.max(syLo, ys[i]! - py * z);
    syHi = Math.min(syHi, ys[i]! + qy * z);
  }
  const sx = (sxLo + sxHi) / 2;
  const sy = (syLo + syHi) / 2;
  const aim = add(add(a0, scale(right, sx)), scale(up, sy));
  return { aim, distance: d, eye: sub(aim, scale(forward, d)), binding };
}

/** The same fit found the slow way, for the test oracle: bisection on the distance, and for each distance a
 *  bisection on the sideways and vertical aim shifts, checking real projections (a lookAt camera built from the
 *  eye and the aim, as three builds it). Shares no formula with fitPoints. */
export function fitPointsBisect(
  points: readonly Vec3[],
  yawDeg: number,
  pitchDeg: number,
  margins: Margins,
  lens: Lens,
  minDistance = 0,
): Fit {
  const { forward, right, up } = viewBasis(yawDeg, pitchDeg);
  const n = points.length;
  const a0: Vec3 = [0, 0, 0];
  let spread = 1;
  for (const p of points) {
    a0[0] += p[0] / n;
    a0[1] += p[1] / n;
    a0[2] += p[2] / n;
  }
  for (const p of points) spread = Math.max(spread, Math.abs(p[0] - a0[0]), Math.abs(p[1] - a0[1]), Math.abs(p[2] - a0[2]));
  const hiX = 1 - 2 * margins.right;
  const loX = -1 + 2 * margins.left;
  const hiY = 1 - 2 * margins.top;
  const loY = -1 + 2 * margins.bottom;
  const tx = Math.tan(lens.hFov / 2);
  const ty = Math.tan(lens.vFov / 2);
  // Screen extents (normalised device coordinates) of all points for a camera aiming at `aim` from distance d.
  const extents = (aim: Vec3, d: number): [number, number, number, number, number] => {
    const ex = aim[0] - forward[0] * d;
    const ey = aim[1] - forward[1] * d;
    const ez = aim[2] - forward[2] * d;
    let fx = aim[0] - ex;
    let fy = aim[1] - ey;
    let fz = aim[2] - ez;
    const fl = Math.hypot(fx, fy, fz);
    fx /= fl;
    fy /= fl;
    fz /= fl;
    let rx = -fz;
    let rz = fx;
    const rl = Math.hypot(rx, rz);
    rx /= rl;
    rz /= rl;
    const ux = -rz * fy;
    const uy = rz * fx - rx * fz;
    const uz = rx * fy;
    let xMax = -Infinity;
    let xMin = Infinity;
    let yMax = -Infinity;
    let yMin = Infinity;
    let zMin = Infinity;
    for (const p of points) {
      const qx = p[0] - ex;
      const qy = p[1] - ey;
      const qz = p[2] - ez;
      const z = qx * fx + qy * fy + qz * fz;
      const x = (qx * rx + qz * rz) / (z * tx);
      const y = (qx * ux + qy * uy + qz * uz) / (z * ty);
      if (x > xMax) xMax = x;
      if (x < xMin) xMin = x;
      if (y > yMax) yMax = y;
      if (y < yMin) yMin = y;
      if (z < zMin) zMin = z;
    }
    return [xMin, xMax, yMin, yMax, zMin];
  };
  const shifted = (sx: number, sy: number): Vec3 => add(add(a0, scale(right, sx)), scale(up, sy));
  // One axis at distance d: the shift where the overflow past the high edge equals the overflow past the low edge
  // (one falls and the other rises as the aim slides), and whether that shift fits.
  const solveAxis = (d: number, axis: 0 | 1, other: number): [number, boolean] => {
    const reach = 4 * spread + 2 * d + 10;
    const at = (s: number): [number, number] => {
      const e = axis === 0 ? extents(shifted(s, other), d) : extents(shifted(other, s), d);
      return axis === 0 ? [e[1] - hiX, loX - e[0]] : [e[3] - hiY, loY - e[2]];
    };
    let a = -reach;
    let b = reach;
    for (let k = 0; k < 64; k++) {
      const m = (a + b) / 2;
      const [over, under] = at(m);
      if (over > under) a = m;
      else b = m;
    }
    const s = (a + b) / 2;
    const [over, under] = at(s);
    return [s, Math.max(over, under) <= 1e-9];
  };
  const fits = (d: number): [boolean, number, number] => {
    if (extents(a0, d)[4] < 1 - 1e-9) return [false, 0, 0];
    // the vertical shift does not change any point's depth, so the axes solve one after the other
    const [sx, okX] = solveAxis(d, 0, 0);
    const [sy, okY] = solveAxis(d, 1, sx);
    return [okX && okY, sx, sy];
  };
  const done = (d: number): Fit => {
    const [, sx, sy] = fits(d);
    const aim = shifted(sx, sy);
    return { aim, distance: d, eye: sub(aim, scale(forward, d)) };
  };
  let dLo = Math.max(minDistance, 1e-6);
  if (fits(dLo)[0]) return done(dLo);
  let dHi = Math.max(1, dLo * 2);
  while (!fits(dHi)[0]) dHi *= 2;
  for (let k = 0; k < 64; k++) {
    const m = (dLo + dHi) / 2;
    if (fits(m)[0]) dHi = m;
    else dLo = m;
  }
  return done(dHi);
}
