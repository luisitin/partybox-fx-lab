// The 40 spaces: one instanced mesh per kind, each kind its own shape (circle, hexagon, rounded diamond, 8-point
// burst) and glyph (plus, minus, sparkle, star), so kinds never differ by colour alone. A start sign by space 0,
// and a floating star prize over each star space that hides while a token stands there.
import {
  AdditiveBlending,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  Shape,
  Sprite,
  SpriteMaterial,
  Vector3,
} from 'three';
import type { Space, SpaceKind } from '../core/board.ts';
import { TILE_TOP } from '../core/board.ts';
import type { Bag } from './bag.ts';
import { KIND_STYLE, WORLD } from './palette.ts';
import { bannerTexture, glowTexture } from './textures.ts';

const R = 0.74;
const DEPTH = 0.16;
const BEVEL = 0.05;

function polygon(points: [number, number][]): Shape {
  const s = new Shape();
  s.moveTo(points[0]![0], points[0]![1]);
  for (const p of points.slice(1)) s.lineTo(p[0], p[1]);
  s.closePath();
  return s;
}

function star(n: number, outer: number, inner: number, turn = 0): Shape {
  const pts: [number, number][] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = turn + Math.PI / 2 + (i * Math.PI) / n;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return polygon(pts);
}

/** A square with rounded corners turned 45 degrees (a soft diamond). */
function diamond(r: number, round: number): Shape {
  const s = new Shape();
  const k = round;
  const pts: [number, number][] = [
    [0, r],
    [r, 0],
    [0, -r],
    [-r, 0],
  ];
  for (let i = 0; i < 4; i++) {
    const p = pts[i]!;
    const prev = pts[(i + 3) % 4]!;
    const next = pts[(i + 1) % 4]!;
    const a: [number, number] = [p[0] + (prev[0] - p[0]) * k, p[1] + (prev[1] - p[1]) * k];
    const b: [number, number] = [p[0] + (next[0] - p[0]) * k, p[1] + (next[1] - p[1]) * k];
    if (i === 0) s.moveTo(a[0], a[1]);
    else s.lineTo(a[0], a[1]);
    s.quadraticCurveTo(p[0], p[1], b[0], b[1]);
  }
  s.closePath();
  return s;
}

const SHAPES: Record<SpaceKind, () => Shape> = {
  gain: () => {
    const s = new Shape();
    s.absarc(0, 0, R, 0, Math.PI * 2, false);
    return s;
  },
  lose: () => polygon(Array.from({ length: 6 }, (_, i) => [Math.cos((i * Math.PI) / 3) * R * 1.02, Math.sin((i * Math.PI) / 3) * R * 1.02])),
  event: () => diamond(R * 1.12, 0.22),
  star: () => star(8, R * 1.05, R * 0.82, Math.PI / 8),
};

const bar = (w: number, h: number): Shape =>
  polygon([
    [-w / 2, -h / 2],
    [w / 2, -h / 2],
    [w / 2, h / 2],
    [-w / 2, h / 2],
  ]);

const GLYPHS: Record<SpaceKind, () => Shape[]> = {
  gain: () => [bar(0.46, 0.13), bar(0.13, 0.46)],
  lose: () => [bar(0.46, 0.13)],
  event: () => [star(4, 0.3, 0.09)],
  star: () => [star(5, 0.36, 0.16)],
};

/** Tile geometry lying flat: the top face at y = 0 (the instance places it at the space's tile top). */
function tileGeometry(bag: Bag, kind: SpaceKind): ExtrudeGeometry {
  const g = bag.add(
    new ExtrudeGeometry(SHAPES[kind](), {
      depth: DEPTH,
      bevelEnabled: true,
      bevelThickness: BEVEL,
      bevelSize: BEVEL,
      bevelSegments: 3,
      curveSegments: 40,
    }),
  );
  g.rotateX(-Math.PI / 2);
  g.translate(0, -(DEPTH + BEVEL), 0);
  return g;
}

function glyphGeometry(bag: Bag, kind: SpaceKind): ExtrudeGeometry {
  const g = bag.add(new ExtrudeGeometry(GLYPHS[kind](), { depth: 0.035, bevelEnabled: false, curveSegments: 12 }));
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0.002, 0);
  return g;
}

export interface Tiles {
  group: Group;
  /** The floating star prizes, by space index. */
  prizes: Map<number, Group>;
  /** Per-space index into its kind's instanced mesh. */
  meshes: Record<SpaceKind, InstancedMesh>;
}

export function buildTiles(bag: Bag, spaces: readonly Space[]): Tiles {
  const group = new Group();
  group.name = 'tiles';
  const meshes = {} as Record<SpaceKind, InstancedMesh>;
  const m = new Matrix4();
  const q = new Quaternion();
  const up = new Vector3(0, 1, 0);
  for (const kind of ['gain', 'lose', 'event', 'star'] as SpaceKind[]) {
    const list = spaces.filter((s) => s.kind === kind);
    const st = KIND_STYLE[kind];
    const top = bag.add(new MeshStandardMaterial({ color: st.top, roughness: 0.32, metalness: 0.05 }));
    const side = bag.add(new MeshStandardMaterial({ color: st.side, roughness: 0.5 }));
    const mesh = new InstancedMesh(tileGeometry(bag, kind), [top, side], list.length);
    const glyphMat = bag.add(new MeshStandardMaterial({ color: st.glyph, roughness: 0.4, emissive: new Color(st.glyph), emissiveIntensity: 0.12 }));
    const glyphs = new InstancedMesh(glyphGeometry(bag, kind), glyphMat, list.length);
    list.forEach((s, i) => {
      const heading = Math.atan2(s.tangent[0], s.tangent[2]);
      q.setFromAxisAngle(up, heading + (kind === 'lose' ? Math.PI / 6 : 0));
      const scale = s.start ? 1.12 : 1;
      m.compose(new Vector3(...s.position), q, new Vector3(scale, 1, scale));
      mesh.setMatrixAt(i, m);
      // glyphs read upright from the camera (which always looks north)
      q.setFromAxisAngle(up, 0);
      m.compose(new Vector3(...s.position), q, new Vector3(scale, 1, scale));
      glyphs.setMatrixAt(i, m);
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    glyphs.receiveShadow = true;
    mesh.name = `tiles-${kind}`;
    group.add(mesh, glyphs);
    meshes[kind] = mesh;
  }
  // a gold ring round the start space
  const start = spaces.find((s) => s.start);
  if (start) group.add(startSign(bag, start));
  const prizes = new Map<number, Group>();
  const glow = glowTexture(bag);
  const prizeGeo = bag.add(
    new ExtrudeGeometry(star(5, 0.62, 0.3), { depth: 0.2, bevelEnabled: true, bevelThickness: 0.09, bevelSize: 0.07, bevelSegments: 3 }),
  );
  prizeGeo.center();
  const prizeMat = bag.add(
    new MeshStandardMaterial({ color: '#ffd23f', roughness: 0.25, metalness: 0.35, emissive: new Color('#ff9d00'), emissiveIntensity: 0.35 }),
  );
  for (const s of spaces.filter((sp) => sp.kind === 'star')) {
    const g = new Group();
    g.name = `prize-${s.index}`;
    const mesh = new Mesh(prizeGeo, prizeMat);
    // tipped back so its face looks up at the camera (which is always above and to the south)
    mesh.rotation.x = -0.72;
    mesh.castShadow = true;
    const halo = new Sprite(bag.add(new SpriteMaterial({ map: glow, color: '#ffd76a', blending: AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.95 })));
    halo.scale.setScalar(2.6);
    g.add(halo, mesh);
    g.position.set(s.position[0], s.position[1] + 1.75, s.position[2]);
    g.userData.base = g.position.y;
    group.add(g);
    prizes.set(s.index, g);
  }
  return { group, prizes, meshes };
}

function startSign(bag: Bag, s: Space): Group {
  const g = new Group();
  g.name = 'start';
  const ring = new Mesh(
    bag.add(new CylinderGeometry(1.06, 1.06, 0.06, 48, 1, true)),
    bag.add(new MeshStandardMaterial({ color: '#ffd166', roughness: 0.3, metalness: 0.4, emissive: new Color('#ffb000'), emissiveIntensity: 0.25 })),
  );
  ring.position.set(s.position[0], s.position[1] - TILE_TOP + 0.03, s.position[2]);
  g.add(ring);
  // a banner on two poles just behind and to the left of the start, facing the camera
  const poleMat = bag.add(new MeshStandardMaterial({ color: WORLD.cream, roughness: 0.5 }));
  const pole = bag.add(new CylinderGeometry(0.06, 0.07, 2.3, 10));
  const knob = bag.add(new CylinderGeometry(0.11, 0.11, 0.12, 12));
  const bx = s.position[0] - 3.1;
  const bz = s.position[2] - 1.5;
  const by = s.position[1] - TILE_TOP;
  for (const dx of [-0.95, 0.95]) {
    const p = new Mesh(pole, poleMat);
    p.position.set(bx + dx, by + 1.15, bz);
    p.castShadow = true;
    const k = new Mesh(knob, poleMat);
    k.position.set(bx + dx, by + 2.33, bz);
    g.add(p, k);
  }
  const banner = new Mesh(
    bag.add(new PlaneGeometry(2.0, 0.5)),
    bag.add(new MeshBasicMaterial({ map: bannerTexture(bag, 'START'), transparent: true, toneMapped: false })),
  );
  banner.position.set(bx, by + 1.92, bz + 0.02);
  banner.rotation.x = -0.12;
  g.add(banner);
  return g;
}
