// The board as pure data: a closed path of exactly 40 spaces on a floating island, the island's outline and the
// height of its grass. Board space: x east, y up, z south (the camera looks north, toward -z). Angles are measured
// from +x toward north (-z), so walking the path is counter-clockwise seen from above: left to right along the front.
import { RULES } from './rules.ts';
import type { Vec3 } from './vec.ts';
import { smoothstep } from './vec.ts';

export const SPACE_COUNT = 40;
export const SPACING = RULES.spacing;
export const LOOP_LENGTH = SPACE_COUNT * SPACING;
/** Space 0 sits at the front (south), facing the camera. */
const THETA0 = -Math.PI / 2;
/** The top of a tile above the grass: a token stands here. */
export const TILE_TOP = 0.2;
export const TILE_RADIUS = 0.78;
/** The sea far below the island; the camera never goes under it. */
export const WATER_Y = -34;

export type SpaceKind = 'gain' | 'lose' | 'event' | 'star';
export interface Space {
  index: number;
  kind: SpaceKind;
  start: boolean;
  /** Centre of the tile's top face, board space. */
  position: Vec3;
  /** Unit direction of travel on the ground plane. */
  tangent: Vec3;
  theta: number;
}

// S start (a gain space), g gain, l lose, e event, * star. Designed, not random: the two stars face each other
// across the island, losses never come two in a row, an event or a star comes at least every nine spaces.
const PATTERN = 'Sgggeglggg' + '*gglgegglg' + 'eglggeglgg' + '*gglgegglg';
const KIND_OF: Record<string, SpaceKind> = { S: 'gain', g: 'gain', l: 'lose', e: 'event', '*': 'star' };

const shape = (theta: number): number =>
  1 +
  0.15 * Math.cos(2 * theta - 0.6) +
  0.07 * Math.cos(3 * theta + 1.1) +
  0.03 * Math.cos(5 * theta + 0.4);

const TABLE_N = 2048;
interface ArcTable {
  radius: number;
  thetas: Float64Array;
  lengths: Float64Array;
}

function buildTable(): ArcTable {
  const thetas = new Float64Array(TABLE_N + 1);
  const lengths = new Float64Array(TABLE_N + 1);
  let px = 0;
  let pz = 0;
  let total = 0;
  for (let k = 0; k <= TABLE_N; k++) {
    const th = THETA0 + (2 * Math.PI * k) / TABLE_N;
    const r = shape(th);
    const x = r * Math.cos(th);
    const z = -r * Math.sin(th);
    if (k > 0) total += Math.hypot(x - px, z - pz);
    thetas[k] = th;
    lengths[k] = total;
    px = x;
    pz = z;
  }
  const radius = LOOP_LENGTH / total;
  for (let k = 0; k <= TABLE_N; k++) lengths[k] = lengths[k]! * radius;
  return { radius, thetas, lengths };
}

const TABLE = buildTable();
/** The path's scale: its polar radius at angle theta is PATH_SCALE x shape(theta). */
export const PATH_SCALE = TABLE.radius;

export const pathRadius = (theta: number): number => PATH_SCALE * shape(theta);

/** Island outline: the path plus a grass margin of at least 2.95 units, wobbling so it reads as natural ground. */
export const islandRadius = (theta: number): number =>
  pathRadius(theta) +
  4.6 +
  0.9 * Math.sin(3 * theta + 0.5) +
  0.5 * Math.sin(7 * theta + 1.3) +
  0.25 * Math.sin(13 * theta + 2.0);

const thetaOf = (x: number, z: number): number => Math.atan2(-z, x);

/** The ground before the path is levelled into it: a dome, a hill in the middle and soft rolling noise. */
export function rawHeight(x: number, z: number): number {
  const rho = Math.hypot(x, z);
  const rn = rho / islandRadius(thetaOf(x, z));
  const dome = 1.1 * Math.max(0, 1 - rn * rn);
  const hill = 2.6 * Math.exp(-((rho / 6.5) ** 2));
  const noise =
    0.32 * Math.sin(0.37 * x + 1.1) * Math.sin(0.29 * z + 0.4) +
    0.18 * Math.sin(0.71 * x - 0.53 * z + 0.3) +
    0.08 * Math.sin(1.3 * x + 0.9 * z);
  return 0.25 + dome + hill + noise * (1 - smoothstep(0.85, 1, rn));
}

/** Ground height at the path point that shares this angle. */
export const pathGroundAt = (theta: number): number => {
  const r = pathRadius(theta);
  return rawHeight(r * Math.cos(theta), -r * Math.sin(theta));
};

/** Whether (x, z) is on the island's top. */
export const onIsland = (x: number, z: number): boolean =>
  Math.hypot(x, z) <= islandRadius(thetaOf(x, z));

/** Height of the grass at (x, z): levelled across the path, and dead flat on a pad under each tile so every tile
 *  sits level even where the path climbs. Off the island: -Infinity. */
export function groundHeight(x: number, z: number): number {
  const theta = thetaOf(x, z);
  const rho = Math.hypot(x, z);
  if (rho > islandRadius(theta)) return -Infinity;
  const w = smoothstep(2.6, 1.3, Math.abs(rho - pathRadius(theta)));
  const raw = rawHeight(x, z);
  let h = w > 0 ? raw + (pathGroundAt(theta) - raw) * w : raw;
  if (w > 0) {
    const pads = padCentres();
    for (let i = 0; i < pads.length; i++) {
      const p = pads[i]!;
      const d = Math.hypot(x - p[0], z - p[2]);
      if (d < PAD_OUTER) {
        const k = smoothstep(PAD_OUTER, PAD_INNER, d);
        h += (p[1] - h) * k;
      }
    }
  }
  return h;
}

/** The flat pad under a tile: flat out to PAD_INNER (past the tile's rim), blending back by PAD_OUTER. */
const PAD_INNER = 0.95;
const PAD_OUTER = 1.55;
let pads: Vec3[] | null = null;
/** Tile centres at ground level (computed once; pure data). */
function padCentres(): Vec3[] {
  if (!pads) {
    pads = [];
    for (let i = 0; i < SPACE_COUNT; i++) {
      const p = pathPoint(i);
      pads.push([p[0], p[1] - TILE_TOP, p[2]]);
    }
  }
  return pads;
}

/** Angle on the path at arc length `s` (wraps). */
function thetaAtLength(s: number): number {
  const L = LOOP_LENGTH;
  const t = ((s % L) + L) % L;
  const { lengths, thetas } = TABLE;
  let lo = 0;
  let hi = TABLE_N;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (lengths[mid]! <= t) lo = mid;
    else hi = mid;
  }
  const a = lengths[lo]!;
  const b = lengths[hi]!;
  const f = b > a ? (t - a) / (b - a) : 0;
  return thetas[lo]! + (thetas[hi]! - thetas[lo]!) * f;
}

/** Ground point of the path at `u` spaces from space 0 (u may be fractional or wrap). y = top of the tiles' level. */
export function pathPoint(u: number): Vec3 {
  const theta = thetaAtLength(u * SPACING);
  const r = pathRadius(theta);
  return [r * Math.cos(theta), pathGroundAt(theta) + TILE_TOP, -r * Math.sin(theta)];
}

/** Unit direction of travel at `u`, on the ground plane. */
export function pathTangent(u: number): Vec3 {
  const a = pathPoint(u - 0.02);
  const b = pathPoint(u + 0.02);
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  const n = Math.hypot(dx, dz) || 1;
  return [dx / n, 0, dz / n];
}

export const wrapSpace = (i: number): number => ((Math.round(i) % SPACE_COUNT) + SPACE_COUNT) % SPACE_COUNT;
export const nextSpace = (i: number): number => wrapSpace(i + 1);
export const prevSpace = (i: number): number => wrapSpace(i - 1);

export function buildSpaces(): Space[] {
  const out: Space[] = [];
  for (let i = 0; i < SPACE_COUNT; i++) {
    const ch = PATTERN[i] ?? 'g';
    out.push({
      index: i,
      kind: KIND_OF[ch] ?? 'gain',
      start: ch === 'S',
      position: pathPoint(i),
      tangent: pathTangent(i),
      theta: thetaAtLength(i * SPACING),
    });
  }
  return out;
}

/** Points that bound a tile: its centre and four rim points (what a frame must contain to show the whole tile). */
export function tileRim(p: Vec3): Vec3[] {
  const r = TILE_RADIUS;
  return [p, [p[0] + r, p[1], p[2]], [p[0] - r, p[1], p[2]], [p[0], p[1], p[2] + r], [p[0], p[1], p[2] - r]];
}

/** Dense polyline of the path for distance queries (scenery placement). */
export function pathPolyline(samples = 400): Vec3[] {
  const out: Vec3[] = [];
  for (let k = 0; k < samples; k++) out.push(pathPoint((SPACE_COUNT * k) / samples));
  return out;
}

export function distanceToPath(x: number, z: number, poly: readonly Vec3[]): number {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const abx = b[0] - a[0];
    const abz = b[2] - a[2];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * abx + (z - a[2]) * abz) / (abx * abx + abz * abz || 1)));
    const d = Math.hypot(x - (a[0] + abx * t), z - (a[2] + abz * t));
    if (d < best) best = d;
  }
  return best;
}
