// The four tokens, original characters made from simple solids: Pip (a pink gumdrop with a leaf sprout), Nova (a
// gold teardrop with an orbit ring), Moss (a round green ball with ears) and Echo (a blue capsule with an
// antenna). Each is root > yaw > lean > squash, so the stage's pose maps one-to-one onto the nodes.
import {
  AdditiveBlending,
  CapsuleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RingGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector2,
} from 'three';
import type { Material, Texture } from 'three';
import type { TokenState } from '../core/stage.ts';
import type { Bag } from './bag.ts';

export interface TokenView {
  player: number;
  root: Group;
  yaw: Group;
  lean: Group;
  squash: Group;
  shadow: Mesh;
  /** Nova's ring spins; other tokens have nothing here. */
  spinner: Group | null;
  baseColor: Color;
}

const lathe = (bag: Bag, pts: [number, number][]) =>
  bag.add(new LatheGeometry(pts.map(([r, y]) => new Vector2(r, y)), 40));

function mat(bag: Bag, color: string | Color, rough = 0.38): MeshStandardMaterial {
  return bag.add(new MeshStandardMaterial({ color, roughness: rough, metalness: 0 }));
}

function shaded(m: Mesh): Mesh {
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Eyes, smile and cheeks on the front (+z) at height y, for a body of radius r there. */
function face(bag: Bag, y: number, r: number, cheek: string): Group {
  const g = new Group();
  const white = mat(bag, '#ffffff', 0.25);
  const ink = mat(bag, '#1b1d3a', 0.3);
  const eye = bag.add(new SphereGeometry(1, 18, 14));
  const z = r * 0.92;
  for (const side of [-1, 1]) {
    const e = new Mesh(eye, white);
    e.scale.set(0.11, 0.14, 0.06);
    e.position.set(side * 0.15, y, z);
    const p = new Mesh(eye, ink);
    p.scale.set(0.068, 0.092, 0.04);
    p.position.set(side * 0.15 + side * 0.01, y - 0.012, z + 0.035);
    const shine = new Mesh(eye, white);
    shine.scale.set(0.022, 0.026, 0.012);
    shine.position.set(side * 0.15 - 0.025, y + 0.035, z + 0.07);
    const c = new Mesh(eye, mat(bag, cheek, 0.6));
    c.scale.set(0.07, 0.04, 0.02);
    c.position.set(side * 0.27, y - 0.13, z * 0.93);
    g.add(e, p, shine, c);
  }
  const smile = new Mesh(bag.add(new TorusGeometry(0.075, 0.019, 8, 16, Math.PI)), ink);
  smile.rotation.z = Math.PI;
  smile.position.set(0, y - 0.13, z + 0.01);
  g.add(smile);
  return g;
}

function feet(bag: Bag, color: Color): Group {
  const g = new Group();
  const geo = bag.add(new SphereGeometry(1, 16, 10));
  const m = mat(bag, color.clone().offsetHSL(0, 0.02, -0.12), 0.45);
  for (const side of [-1, 1]) {
    const f = shaded(new Mesh(geo, m));
    f.scale.set(0.15, 0.085, 0.19);
    f.position.set(side * 0.19, 0.085, 0.06);
    g.add(f);
  }
  return g;
}

type Body = { parts: Group; spinner: Group | null };

function pip(bag: Bag, c: Color): Body {
  const parts = new Group();
  const body = shaded(
    new Mesh(lathe(bag, [[0, 0.1], [0.4, 0.1], [0.5, 0.18], [0.53, 0.36], [0.5, 0.62], [0.42, 0.84], [0.29, 1.0], [0.13, 1.08], [0, 1.1]]), mat(bag, c)),
  );
  const stem = shaded(new Mesh(bag.add(new CylinderGeometry(0.025, 0.035, 0.16, 8)), mat(bag, '#3f8f3a', 0.5)));
  stem.position.y = 1.16;
  const leafGeo = bag.add(new SphereGeometry(1, 14, 10));
  const leafMat = mat(bag, '#5cc356', 0.4);
  for (const side of [-1, 1]) {
    const leaf = shaded(new Mesh(leafGeo, leafMat));
    leaf.scale.set(0.15, 0.04, 0.08);
    leaf.position.set(side * 0.13, 1.25, 0);
    leaf.rotation.z = side * 0.45;
    parts.add(leaf);
  }
  parts.add(body, stem, face(bag, 0.66, 0.5, '#ff9ab8'));
  return { parts, spinner: null };
}

function nova(bag: Bag, c: Color): Body {
  const parts = new Group();
  const body = shaded(
    new Mesh(lathe(bag, [[0, 0.1], [0.3, 0.11], [0.44, 0.24], [0.49, 0.44], [0.44, 0.68], [0.31, 0.9], [0.15, 1.1], [0.05, 1.24], [0, 1.28]]), mat(bag, c, 0.3)),
  );
  const spinner = new Group();
  spinner.position.y = 0.6;
  spinner.rotation.x = 0.42;
  spinner.rotation.z = -0.2;
  const ring = shaded(new Mesh(bag.add(new TorusGeometry(0.56, 0.032, 10, 64)), mat(bag, '#fff3c4', 0.25)));
  ring.rotation.x = Math.PI / 2;
  const bead = shaded(new Mesh(bag.add(new SphereGeometry(0.075, 12, 10)), mat(bag, '#ff8fb1', 0.3)));
  bead.position.set(0.56, 0, 0);
  spinner.add(ring, bead);
  parts.add(body, spinner, face(bag, 0.58, 0.49, '#ffb37a'));
  return { parts, spinner };
}

function moss(bag: Bag, c: Color): Body {
  const parts = new Group();
  const ball = shaded(new Mesh(bag.add(new SphereGeometry(0.52, 36, 24)), mat(bag, c)));
  ball.position.y = 0.62;
  ball.scale.set(1, 0.94, 1);
  const earGeo = bag.add(new SphereGeometry(0.17, 18, 12));
  const inner = mat(bag, c.clone().offsetHSL(0, -0.1, 0.12), 0.5);
  for (const side of [-1, 1]) {
    const ear = shaded(new Mesh(earGeo, mat(bag, c)));
    ear.position.set(side * 0.31, 1.07, -0.02);
    const pad = new Mesh(earGeo, inner);
    pad.scale.set(0.55, 0.55, 0.3);
    pad.position.set(side * 0.31, 1.07, 0.11);
    parts.add(ear, pad);
  }
  const belly = new Mesh(bag.add(new SphereGeometry(0.3, 24, 16)), inner);
  belly.scale.set(1, 0.85, 0.35);
  belly.position.set(0, 0.42, 0.4);
  parts.add(ball, belly, face(bag, 0.72, 0.5, '#ffd3a1'));
  return { parts, spinner: null };
}

function echo(bag: Bag, c: Color): Body {
  const parts = new Group();
  const body = shaded(new Mesh(bag.add(new CapsuleGeometry(0.4, 0.42, 10, 32)), mat(bag, c, 0.32)));
  body.position.y = 0.1 + 0.4 + 0.21;
  const visor = new Mesh(bag.add(new CapsuleGeometry(0.26, 0.2, 8, 24)), mat(bag, '#1d2a52', 0.15));
  visor.rotation.z = Math.PI / 2;
  visor.scale.set(0.75, 1, 0.5);
  visor.position.set(0, 0.8, 0.27);
  const stem = shaded(new Mesh(bag.add(new CylinderGeometry(0.022, 0.022, 0.2, 8)), mat(bag, '#dfe7ff', 0.4)));
  stem.position.y = 1.2;
  const tip = shaded(new Mesh(bag.add(new SphereGeometry(0.075, 14, 10)), mat(bag, '#ffd166', 0.3)));
  tip.position.y = 1.32;
  parts.add(body, stem, tip, face(bag, 0.74, 0.42, '#9fd8ff'));
  // Echo's eyes glow softly on the dark visor
  parts.add(visor);
  return { parts, spinner: null };
}

const BUILDERS = [pip, nova, moss, echo];

export function buildToken(bag: Bag, t: TokenState, blob: Texture): TokenView {
  const baseColor = new Color(t.color);
  const root = new Group();
  root.name = `token-${t.player}`;
  const yaw = new Group();
  const lean = new Group();
  const squash = new Group();
  const { parts, spinner } = BUILDERS[t.player % BUILDERS.length]!(bag, baseColor);
  squash.add(parts, feet(bag, baseColor));
  lean.add(squash);
  yaw.add(lean);
  root.add(yaw);
  const shadow = new Mesh(
    bag.add(new PlaneGeometry(1.25, 1.25)),
    bag.add(new MeshBasicMaterial({ map: blob, transparent: true, depthWrite: false, opacity: 0.42, polygonOffset: true, polygonOffsetFactor: -4 })),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.renderOrder = 2;
  return { player: t.player, root, yaw, lean, squash, shadow, spinner, baseColor };
}

/** The pulsing ring under the token whose turn it is. */
export function buildActiveRing(bag: Bag): Mesh {
  const m = new Mesh(
    bag.add(new RingGeometry(0.6, 0.74, 48)),
    bag.add(
      new MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, depthWrite: false, side: DoubleSide, blending: AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -6 }),
    ),
  );
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 3;
  m.name = 'active-ring';
  return m;
}

/** Copy a token's stage pose onto its nodes. `t` is the stage clock (seconds), for idle breathing. */
export function poseToken(v: TokenView, s: TokenState, t: number, reduced: boolean, moving: boolean): void {
  v.root.position.set(s.ground[0], s.ground[1] + s.lift, s.ground[2]);
  v.yaw.rotation.y = s.yaw + s.spin;
  v.lean.rotation.x = (s.lean * Math.PI) / 180;
  let sy = s.sy;
  let sxz = s.sxz;
  if (!reduced && !moving && sy === 1) {
    const b = 1 + 0.018 * Math.sin(t * 2.3 + s.player * 1.7);
    sy = b;
    sxz = 1 / Math.sqrt(b);
  }
  v.squash.scale.set(sxz, sy, sxz);
  if (v.spinner) v.spinner.rotation.y = reduced ? 0.6 : t * 1.6;
  v.shadow.position.set(s.ground[0], s.ground[1] + 0.012, s.ground[2]);
  const k = Math.max(0.45, 1 - s.lift * 0.42);
  v.shadow.scale.set(k * sxz, k * sxz, 1);
  (v.shadow.material as Material & { opacity: number }).opacity = 0.42 * k;
}
