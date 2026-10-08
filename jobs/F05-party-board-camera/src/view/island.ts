// The floating island, made in code: a grass top that follows board.groundHeight exactly (so tokens and tiles
// stand on what you see), a sandy trail painted into its vertex colours, a rounded lip, and a rocky underside
// with strata that tapers to a point far above the sea. Little chevrons on the trail show the way round.
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Shape,
  ShapeGeometry,
  Vector3,
} from 'three';
import { SPACE_COUNT, groundHeight, islandRadius, pathPoint, pathRadius, pathTangent } from '../core/board.ts';
import type { Bag } from './bag.ts';
import { WORLD } from './palette.ts';

const TAU = Math.PI * 2;
/** Angular columns of the grass top; rings are laid out relative to the path so the trail's edges are crisp. */
const COLUMNS = 288;
const BAND = [-2.6, -2.05, -1.55, -1.2, -0.95, -0.78, -0.55, -0.28, 0, 0.28, 0.55, 0.78, 0.95, 1.2, 1.55, 2.05, 2.6];
const INNER = [0, 0.12, 0.25, 0.38, 0.5, 0.61, 0.71, 0.8, 0.88, 0.95];
const OUTER = [0.22, 0.45, 0.66, 0.84, 0.95, 1];
/** Trail half-width and the soft edge outside it. */
const TRAIL_HALF = 0.8;
const TRAIL_EDGE = 1.08;

export const xzAt = (theta: number, rho: number): [number, number] => [rho * Math.cos(theta), -rho * Math.sin(theta)];

/** Cheap smooth value noise from sines: deterministic, no state. */
export function wobble(x: number, z: number): number {
  return (
    0.5 * Math.sin(0.21 * x + 0.7) * Math.sin(0.17 * z - 0.4) +
    0.3 * Math.sin(0.43 * x - 0.31 * z + 1.9) +
    0.2 * Math.sin(0.97 * x + 0.61 * z + 0.2)
  );
}

/** Integer hash to [0, 1). */
export function hash(i: number, j: number): number {
  let h = (Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const mix = (a: Color, b: Color, t: number): Color => a.clone().lerp(b, Math.max(0, Math.min(1, t)));

function grassTop(bag: Bag): Mesh {
  const rhos = (theta: number): number[] => {
    const pr = pathRadius(theta);
    const ir = islandRadius(theta) * 0.99995;
    const inner = INNER.map((f) => f * (pr + BAND[0]!));
    const band = BAND.map((d) => pr + d);
    const outer = OUTER.map((f) => pr + BAND[BAND.length - 1]! + f * (ir - pr - BAND[BAND.length - 1]!));
    return [...inner, ...band.slice(1), ...outer];
  };
  const ringCount = rhos(0).length;
  const pos: number[] = [];
  const col: number[] = [];
  const g0 = new Color(WORLD.grass);
  const gL = new Color(WORLD.grassLight);
  const gD = new Color(WORLD.grassDark);
  const trail = new Color(WORLD.trail);
  const trailEdge = new Color(WORLD.trailEdge);
  const lip = new Color(WORLD.lip);
  for (let j = 0; j <= COLUMNS; j++) {
    const theta = (TAU * j) / COLUMNS;
    const pr = pathRadius(theta);
    const ir = islandRadius(theta);
    const rs = rhos(theta);
    for (let k = 0; k < ringCount; k++) {
      const rho = rs[k]!;
      const [x, z] = xzAt(theta, rho);
      const y = groundHeight(x, z);
      pos.push(x, y, z);
      // grass: patches of light and dark, darker toward the rim
      const n = wobble(x, z);
      let c = n > 0 ? mix(g0, gL, n * 1.35) : mix(g0, gD, -n * 1.1);
      const fine = hash(j, k) - 0.5;
      c.offsetHSL(0, 0, fine * 0.025);
      c = mix(c, lip, (rho / ir - 0.9) * 6);
      // the trail: sand in the middle, a darker worn edge, then grass
      const d = Math.abs(rho - pr);
      if (d <= TRAIL_EDGE) {
        const sand = mix(trail, trailEdge, (d - TRAIL_HALF * 0.55) / (TRAIL_HALF * 0.45));
        sand.offsetHSL(0, 0, fine * 0.03);
        c = d <= TRAIL_HALF ? sand : mix(trailEdge, c, (d - TRAIL_HALF) / (TRAIL_EDGE - TRAIL_HALF));
      }
      col.push(c.r, c.g, c.b);
    }
  }
  const index: number[] = [];
  for (let j = 0; j < COLUMNS; j++) {
    for (let k = 0; k < ringCount - 1; k++) {
      const a = j * ringCount + k;
      const b = (j + 1) * ringCount + k;
      index.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const geo = bag.add(new BufferGeometry());
  geo.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  geo.setAttribute('color', new BufferAttribute(new Float32Array(col), 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  const mat = bag.add(new MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 }));
  const mesh = new Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = 'grass';
  return mesh;
}

/** Edge of the grass at column angle theta: the rim point and its height. */
function rimAt(theta: number): [number, number, number] {
  const ir = islandRadius(theta) * 0.99995;
  const [x, z] = xzAt(theta, ir);
  return [x, groundHeight(x, z), z];
}

/** The rounded lip under the grass and the rock below it, flat-shaded, banded into strata. */
function underside(bag: Bag): Mesh {
  const cols = 120;
  const rings = 22;
  const depth = 19;
  const soil = new Color('#4a3424');
  const lipC = new Color(WORLD.lip);
  const strata = WORLD.rock.map((h) => new Color(h));
  const grid: [number, number, number][][] = [];
  const colors: Color[][] = [];
  for (let j = 0; j < cols; j++) {
    const theta = (TAU * j) / cols;
    const ir = islandRadius(theta);
    const [rx, ry, rz] = rimAt(theta);
    const ux = rx / ir;
    const uz = rz / ir;
    const column: [number, number, number][] = [];
    const cc: Color[] = [];
    // lip: two rings rolling over the edge
    column.push([rx + ux * 0.28, ry - 0.18, rz + uz * 0.28]);
    cc.push(lipC);
    column.push([rx + ux * 0.38, ry - 0.55, rz + uz * 0.38]);
    cc.push(soil);
    const top = ry - 0.55;
    for (let k = 1; k <= rings; k++) {
      const f = k / rings;
      const jag = (hash(j, k) - 0.5) * 0.9 * Math.sin(Math.PI * Math.min(1, f * 1.3));
      // a full belly near the top, then a long taper to the point
      const profile = f < 0.12 ? 1 + 0.06 * Math.sin((f / 0.12) * Math.PI * 0.5) : 1.06 * Math.cos(((f - 0.12) / 0.88) * Math.PI * 0.5) ** 0.85;
      const r = (ir + 0.38) * profile + jag;
      const y = top - depth * f ** 1.15 - (hash(k, j + 7) - 0.5) * 0.5;
      const [x, z] = k === rings ? [0.6, -0.8] : xzAt(theta, Math.max(0.2, r));
      column.push([x, k === rings ? -depth - 1.5 : y, z]);
      const band = Math.floor((top - y) / 1.25 + 0.35 * Math.sin(theta * 3 + k) + 2 * wobble(x * 0.5, z * 0.5));
      cc.push(strata[((band % strata.length) + strata.length) % strata.length]!);
    }
    grid.push(column);
    colors.push(cc);
  }
  const pos: number[] = [];
  const col: number[] = [];
  const tri = (a: [number, number, number], b: [number, number, number], c: [number, number, number], color: Color) => {
    pos.push(...a, ...b, ...c);
    for (let i = 0; i < 3; i++) col.push(color.r, color.g, color.b);
  };
  const n = grid[0]!.length;
  for (let j = 0; j < cols; j++) {
    const A = grid[j]!;
    const B = grid[(j + 1) % cols]!;
    const C = colors[j]!;
    // the lip's top edge joins the grass rim exactly
    const t0 = (TAU * j) / cols;
    const t1 = (TAU * (j + 1)) / cols;
    // (winding: outward faces are front faces)
    tri(rimAt(t0), A[0]!, rimAt(t1), lipC);
    tri(A[0]!, B[0]!, rimAt(t1), lipC);
    for (let k = 0; k < n - 1; k++) {
      const c = C[k + 1]!;
      tri(A[k]!, A[k + 1]!, B[k]!, c);
      if (k < n - 2) tri(A[k + 1]!, B[k + 1]!, B[k]!, c);
    }
  }
  const geo = bag.add(new BufferGeometry());
  geo.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  geo.setAttribute('color', new BufferAttribute(new Float32Array(col), 3));
  geo.computeVertexNormals();
  const mat = bag.add(new MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }));
  const mesh = new Mesh(geo, mat);
  mesh.name = 'underside';
  mesh.receiveShadow = true;
  return mesh;
}

/** Arrow chevrons painted on the trail halfway between spaces, pointing the way. */
function chevrons(bag: Bag): InstancedMesh {
  const s = new Shape();
  s.moveTo(-0.22, -0.16);
  s.lineTo(0, 0.08);
  s.lineTo(0.22, -0.16);
  s.lineTo(0.22, -0.02);
  s.lineTo(0, 0.2);
  s.lineTo(-0.22, -0.02);
  s.closePath();
  const geo = bag.add(new ShapeGeometry(s));
  // lie flat, pointing along +z before rotation
  geo.rotateX(-Math.PI / 2);
  geo.rotateY(Math.PI);
  const mat = bag.add(
    new MeshStandardMaterial({
      color: WORLD.cream,
      roughness: 0.8,
      transparent: true,
      opacity: 0.85,
      side: DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  );
  const mesh = new InstancedMesh(geo, mat, SPACE_COUNT);
  const m = new Matrix4();
  const q = new Quaternion();
  const up = new Vector3(0, 1, 0);
  for (let i = 0; i < SPACE_COUNT; i++) {
    const u = i + 0.5;
    const p = pathPoint(u);
    const t = pathTangent(u);
    q.setFromAxisAngle(up, Math.atan2(t[0], t[2]));
    m.compose(new Vector3(p[0], groundHeight(p[0], p[2]) + 0.035, p[2]), q, new Vector3(1.1, 1, 1.1));
    mesh.setMatrixAt(i, m);
  }
  mesh.name = 'chevrons';
  mesh.receiveShadow = true;
  return mesh;
}

export function buildIsland(bag: Bag): Group {
  const g = new Group();
  g.name = 'island';
  g.add(grassTop(bag), underside(bag), chevrons(bag));
  return g;
}
