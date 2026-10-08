// Scenery on the grass: round trees, pines, rocks, bushes, flowers and a windmill on the middle hill. Placed by a
// fixed-seed stream with rules that keep the board readable: nothing near the trail, nothing tall just south of a
// space (between the camera and a token), nothing on the rim.
import {
  Color,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three';
import type { BufferGeometry, Material } from 'three';
import { groundHeight, islandRadius, pathPolyline, distanceToPath, buildSpaces } from '../core/board.ts';
import { Stream } from '../core/rng.ts';
import type { Bag } from './bag.ts';
import { WORLD } from './palette.ts';

export interface Placed {
  x: number;
  z: number;
  y: number;
  s: number;
  rot: number;
  tint: number;
}

export interface PropRules {
  /** Clearance from the trail's centre line. */
  path: number;
  /** Clearance from any space's centre. */
  space: number;
  /** Tall: also kept out of the zone just south of every space (the camera looks north). */
  tall: boolean;
  /** Clearance from other props. */
  gap: number;
}

const SPACES = buildSpaces();
const POLY = pathPolyline(480);
/** The zone south of a space where a tall prop would hide a token from the camera (CAMERA.md R13 note). */
export const SHADOW_ZONE = { south: 5.6, side: 2.3 };

export function propAllowed(x: number, z: number, rule: PropRules, taken: readonly Placed[]): boolean {
  const theta = Math.atan2(-z, x);
  const rho = Math.hypot(x, z);
  if (rho > islandRadius(theta) - 1.1) return false;
  if (rho < 3.2) return false; // the windmill's hill top
  if (distanceToPath(x, z, POLY) < rule.path) return false;
  for (const s of SPACES) {
    const dx = x - s.position[0];
    const dz = z - s.position[2];
    if (Math.hypot(dx, dz) < rule.space) return false;
    if (rule.tall && dz > 0 && dz < SHADOW_ZONE.south && Math.abs(dx) < SHADOW_ZONE.side) return false;
  }
  for (const t of taken) if (Math.hypot(x - t.x, z - t.z) < rule.gap + 0.25 * (t.s + 1)) return false;
  return true;
}

function scatter(rng: Stream, count: number, rule: PropRules, taken: Placed[], sMin: number, sMax: number): Placed[] {
  const out: Placed[] = [];
  for (let tries = 0; tries < count * 60 && out.length < count; tries++) {
    const a = rng.float() * Math.PI * 2;
    const r = Math.sqrt(rng.float()) * 23.5;
    const x = Math.cos(a) * r;
    const z = -Math.sin(a) * r;
    if (!propAllowed(x, z, rule, taken)) continue;
    const p: Placed = { x, z, y: groundHeight(x, z), s: rng.range(sMin, sMax), rot: rng.float() * Math.PI * 2, tint: rng.float() };
    out.push(p);
    taken.push(p);
  }
  return out;
}

function instanced(
  bag: Bag,
  geo: BufferGeometry,
  mat: Material,
  items: readonly Placed[],
  place: (p: Placed, m: Matrix4) => void,
  color?: (p: Placed) => Color,
  shadows = true,
): InstancedMesh {
  bag.add(geo);
  const mesh = new InstancedMesh(geo, mat, Math.max(1, items.length));
  mesh.count = items.length;
  const m = new Matrix4();
  items.forEach((p, i) => {
    place(p, m);
    mesh.setMatrixAt(i, m);
    if (color) mesh.setColorAt(i, color(p));
  });
  mesh.castShadow = shadows;
  mesh.receiveShadow = true;
  return mesh;
}

const at = (m: Matrix4, x: number, y: number, z: number, sx: number, sy: number, sz: number, rot = 0): Matrix4 =>
  m.compose(new Vector3(x, y, z), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), rot), new Vector3(sx, sy, sz));

export interface Props {
  group: Group;
  /** The windmill's sails (spun by the view). */
  sails: Group;
  placed: { trees: Placed[]; pines: Placed[]; rocks: Placed[]; bushes: Placed[]; flowers: Placed[] };
}

export function buildProps(bag: Bag): Props {
  const rng = new Stream(2026);
  const taken: Placed[] = [];
  const trees = scatter(rng, 34, { path: 2.7, space: 3.0, tall: true, gap: 1.5 }, taken, 0.85, 1.25);
  const pines = scatter(rng, 16, { path: 2.7, space: 3.0, tall: true, gap: 1.3 }, taken, 0.8, 1.2);
  const rocks = scatter(rng, 22, { path: 1.7, space: 2.2, tall: false, gap: 0.8 }, taken, 0.35, 0.8);
  const bushes = scatter(rng, 40, { path: 1.6, space: 2.0, tall: false, gap: 0.6 }, taken, 0.45, 0.75);
  const flowers = scatter(rng, 150, { path: 1.3, space: 1.6, tall: false, gap: 0.05 }, taken, 0.6, 1.1);

  const group = new Group();
  group.name = 'props';
  const leafMat = bag.add(new MeshStandardMaterial({ color: '#ffffff', roughness: 0.75 }));
  const trunkMat = bag.add(new MeshStandardMaterial({ color: WORLD.trunk, roughness: 0.9 }));
  const pineMat = bag.add(new MeshStandardMaterial({ color: WORLD.pine, roughness: 0.8, flatShading: true }));
  const rockMat = bag.add(new MeshStandardMaterial({ color: WORLD.stone, roughness: 0.9, flatShading: true }));
  const flowerMat = bag.add(new MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }));
  const leafColors = WORLD.leaf.map((c) => new Color(c));
  const leafOf = (p: Placed) => leafColors[Math.floor(p.tint * leafColors.length) % leafColors.length]!;

  // round trees: a trunk and a three-ball crown
  group.add(instanced(bag, new CylinderGeometry(0.12, 0.17, 1, 7), trunkMat, trees, (p, m) => at(m, p.x, p.y + 0.5 * p.s, p.z, p.s, p.s, p.s)));
  const crown = new SphereGeometry(1, 16, 10);
  const crownBalls: Placed[] = [];
  for (const t of trees) {
    crownBalls.push({ ...t, y: t.y + 1.45 * t.s, s: 0.78 * t.s });
    crownBalls.push({ ...t, x: t.x + 0.42 * t.s * Math.cos(t.rot), z: t.z + 0.42 * t.s * Math.sin(t.rot), y: t.y + 1.15 * t.s, s: 0.55 * t.s });
    crownBalls.push({ ...t, x: t.x - 0.38 * t.s * Math.cos(t.rot + 0.6), z: t.z - 0.38 * t.s * Math.sin(t.rot + 0.6), y: t.y + 1.95 * t.s, s: 0.48 * t.s });
  }
  group.add(instanced(bag, crown, leafMat, crownBalls, (p, m) => at(m, p.x, p.y, p.z, p.s, p.s * 0.92, p.s), leafOf));
  // pines: three cones on a stub
  group.add(instanced(bag, new CylinderGeometry(0.1, 0.14, 0.6, 6), trunkMat, pines, (p, m) => at(m, p.x, p.y + 0.3 * p.s, p.z, p.s, p.s, p.s)));
  const tiers: Placed[] = [];
  for (const t of pines) for (let k = 0; k < 3; k++) tiers.push({ ...t, y: t.y + (0.75 + k * 0.55) * t.s, s: t.s * (1 - k * 0.24) });
  group.add(instanced(bag, new ConeGeometry(0.7, 1.05, 8), pineMat, tiers, (p, m) => at(m, p.x, p.y, p.z, p.s, p.s, p.s, p.rot)));
  // rocks, bushes, flowers
  group.add(instanced(bag, new DodecahedronGeometry(0.6, 0), rockMat, rocks, (p, m) => at(m, p.x, p.y + 0.12 * p.s, p.z, p.s * 1.2, p.s * 0.7, p.s, p.rot)));
  const bushBalls: Placed[] = [];
  for (const b of bushes) {
    bushBalls.push({ ...b, y: b.y + 0.22 * b.s });
    bushBalls.push({ ...b, x: b.x + 0.4 * b.s * Math.cos(b.rot), z: b.z + 0.4 * b.s * Math.sin(b.rot), y: b.y + 0.14 * b.s, s: b.s * 0.7 });
  }
  group.add(instanced(bag, new IcosahedronGeometry(0.6, 2), leafMat, bushBalls, (p, m) => at(m, p.x, p.y, p.z, p.s, p.s * 0.8, p.s), (p) => leafOf(p).clone().offsetHSL(0, 0, -0.04)));
  const petal = ['#ffffff', '#ffd166', '#ff8fb1', '#b9a3ff', '#ffb36b'].map((c) => new Color(c));
  group.add(
    instanced(
      bag,
      new SphereGeometry(0.075, 6, 4),
      flowerMat,
      flowers,
      (p, m) => at(m, p.x, p.y + 0.07, p.z, p.s, p.s * 0.8, p.s),
      (p) => petal[Math.floor(p.tint * petal.length) % petal.length]!,
      false,
    ),
  );

  const { mill, sails } = windmill(bag);
  group.add(mill);
  return { group, sails, placed: { trees, pines, rocks, bushes, flowers } };
}

/** A small windmill on the island's middle hill: the landmark of the overview. */
function windmill(bag: Bag): { mill: Group; sails: Group } {
  const mill = new Group();
  mill.name = 'windmill';
  const y = groundHeight(0, 0);
  mill.position.set(0, y - 0.1, 0);
  const wall = bag.add(new MeshStandardMaterial({ color: WORLD.cream, roughness: 0.7 }));
  const roof = bag.add(new MeshStandardMaterial({ color: '#e8577f', roughness: 0.55 }));
  const wood = bag.add(new MeshStandardMaterial({ color: '#8a5a36', roughness: 0.8 }));
  const sail = bag.add(new MeshStandardMaterial({ color: '#fff9ee', roughness: 0.6 }));
  const tower = new Mesh(bag.add(new CylinderGeometry(0.85, 1.25, 3.1, 20)), wall);
  tower.position.y = 1.55;
  const cap = new Mesh(bag.add(new ConeGeometry(1.15, 1.2, 20)), roof);
  cap.position.y = 3.65;
  const door = new Mesh(bag.add(new CylinderGeometry(0.32, 0.32, 0.1, 16, 1, false, 0, Math.PI)), wood);
  door.rotation.x = Math.PI / 2;
  door.rotation.z = Math.PI / 2;
  door.position.set(0, 0.55, 1.18);
  const hub = new Mesh(bag.add(new SphereGeometry(0.2, 12, 8)), wood);
  const sails = new Group();
  sails.position.set(0, 2.9, 1.0);
  sails.add(hub);
  const blade = bag.add(new CylinderGeometry(0.03, 0.03, 1, 6));
  for (let k = 0; k < 4; k++) {
    const arm = new Group();
    arm.rotation.z = (k * Math.PI) / 2;
    const spar = new Mesh(blade, wood);
    spar.scale.y = 1.9;
    spar.position.y = 0.95;
    const panel = new Mesh(bag.add(new CylinderGeometry(0.28, 0.2, 1.4, 4, 1)), sail);
    panel.scale.set(1, 1, 0.12);
    panel.rotation.y = Math.PI / 4;
    panel.position.set(0.16, 1.15, 0);
    arm.add(spar, panel);
    sails.add(arm);
  }
  for (const m of [tower, cap, door, hub]) {
    m.castShadow = true;
    m.receiveShadow = true;
  }
  sails.traverse((o) => {
    if ((o as Mesh).isMesh) (o as Mesh).castShadow = true;
  });
  mill.add(tower, cap, door, sails);
  return { mill, sails };
}
