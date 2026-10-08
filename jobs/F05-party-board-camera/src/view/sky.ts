// The backdrop: a sky dome (seen mostly in reflections and the environment light), the sea far below with
// glints and the island's soft shadow, a few floating islets and drifting clouds below and around the island.
import {
  BackSide,
  Color,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  ShaderMaterial,
  SphereGeometry,
  Vector2,
  Vector3,
} from 'three';
import { WATER_Y } from '../core/board.ts';
import { Stream } from '../core/rng.ts';
import type { Bag } from './bag.ts';
import { WORLD } from './palette.ts';

/** Direction toward the sun (the key light comes from here too). */
export const SUN_DIR = new Vector3(-22, 34, 18).normalize();

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize((modelMatrix * vec4(position, 0.0)).xyz);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;

const SKY_FRAG = /* glsl */ `
uniform vec3 zenith;
uniform vec3 mid;
uniform vec3 horizon;
uniform vec3 below;
uniform vec3 sunDir;
uniform vec3 sunColor;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 c = mix(horizon, mid, smoothstep(-0.02, 0.22, h));
  c = mix(c, zenith, smoothstep(0.22, 0.85, h));
  c = mix(c, below, smoothstep(0.0, -0.25, h));
  float s = max(dot(d, sunDir), 0.0);
  c += sunColor * (pow(s, 600.0) * 4.0 + pow(s, 24.0) * 0.28 + pow(s, 4.0) * 0.08);
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function skyMaterial(bag: Bag): ShaderMaterial {
  return bag.add(
    new ShaderMaterial({
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        zenith: { value: new Color(WORLD.skyZenith) },
        mid: { value: new Color(WORLD.skyMid) },
        horizon: { value: new Color(WORLD.skyHorizon) },
        below: { value: new Color(WORLD.seaNear) },
        sunDir: { value: SUN_DIR.clone() },
        sunColor: { value: new Color(WORLD.sun) },
      },
    }),
  );
}

export function buildSkyDome(bag: Bag): Mesh {
  const geo = bag.add(new SphereGeometry(900, 48, 24));
  const mesh = new Mesh(geo, skyMaterial(bag));
  mesh.name = 'sky';
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  return mesh;
}

const SEA_VERT = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const SEA_FRAG = /* glsl */ `
uniform float time;
uniform vec3 deep;
uniform vec3 near;
uniform vec3 skyTint;
uniform vec3 haze;
uniform vec3 sunDir;
uniform vec3 sunColor;
uniform vec2 shadowAt;
varying vec3 vWorld;
float wave(vec2 p, vec2 d, float f, float s, float t) { return sin(dot(p, d) * f + t * s); }
void main() {
  vec2 p = vWorld.xz;
  float t = time;
  // a few travelling waves for the normal
  float e = 0.6;
  vec2 g = vec2(0.0);
  vec2 d1 = normalize(vec2(1.0, 0.35)); vec2 d2 = normalize(vec2(-0.4, 1.0)); vec2 d3 = normalize(vec2(0.8, -0.9));
  g += d1 * cos(dot(p, d1) * 0.31 + t * 0.9) * 0.31;
  g += d2 * cos(dot(p, d2) * 0.47 + t * 1.2) * 0.22;
  g += d3 * cos(dot(p, d3) * 0.83 + t * 1.7) * 0.12;
  vec3 n = normalize(vec3(-g.x * e, 1.0, -g.y * e));
  vec3 v = normalize(vWorld - cameraPosition);
  float fres = pow(1.0 - max(dot(n, -v), 0.0), 3.0);
  float dist = length(vWorld.xz - cameraPosition.xz);
  float swell = 0.5 + 0.5 * wave(p, d1, 0.05, 0.3, t) * wave(p, d2, 0.043, 0.21, t);
  float blot = 0.5 + 0.25 * sin(p.x * 0.021 + 1.3) * sin(p.y * 0.017 - 0.4) + 0.25 * sin((p.x + p.y) * 0.011);
  vec3 c = mix(deep, near, 0.2 + 0.45 * swell * blot + 0.25 * blot);
  // sun sparkle: small round glints that twinkle, fading with distance
  vec2 cell = floor(p * 0.55);
  vec2 f = fract(p * 0.55) - 0.5;
  float h = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
  vec2 off = vec2(fract(h * 7.13), fract(h * 3.71)) - 0.5;
  float glint = smoothstep(0.16, 0.0, length(f - off * 0.6)) * step(0.93, h) * (0.5 + 0.5 * sin(t * 2.6 + h * 60.0));
  c += vec3(0.85, 0.95, 1.0) * glint * 0.55 * (1.0 - smoothstep(30.0, 140.0, dist));
  // long soft wave lines
  c += 0.035 * smoothstep(0.75, 1.0, sin(dot(p, d1) * 0.18 + t * 0.5 + 2.0 * sin(dot(p, d2) * 0.03)));
  c = mix(c, skyTint, clamp(fres * 0.85, 0.0, 0.85));
  float spec = pow(max(dot(reflect(v, n), sunDir), 0.0), 220.0);
  c += sunColor * spec * 1.6;
  // the island's soft shadow, offset away from the sun
  float sh = smoothstep(30.0, 6.0, length(p - shadowAt));
  c *= 1.0 - 0.32 * sh;
  c = mix(c, haze, smoothstep(90.0, 620.0, dist));
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export interface Sea {
  mesh: Mesh;
  material: ShaderMaterial;
}

export function buildSea(bag: Bag): Sea {
  const geo = bag.add(new PlaneGeometry(2400, 2400, 1, 1));
  geo.rotateX(-Math.PI / 2);
  const depth = 0 - WATER_Y;
  const material = bag.add(
    new ShaderMaterial({
      vertexShader: SEA_VERT,
      fragmentShader: SEA_FRAG,
      fog: false,
      uniforms: {
        time: { value: 0 },
        deep: { value: new Color(WORLD.seaDeep) },
        near: { value: new Color(WORLD.seaNear) },
        skyTint: { value: new Color(WORLD.skyMid) },
        haze: { value: new Color(WORLD.haze) },
        sunDir: { value: SUN_DIR.clone() },
        sunColor: { value: new Color(WORLD.sun) },
        shadowAt: { value: new Vector2((-SUN_DIR.x / SUN_DIR.y) * depth, (-SUN_DIR.z / SUN_DIR.y) * depth) },
      },
    }),
  );
  const mesh = new Mesh(geo, material);
  mesh.position.y = WATER_Y;
  mesh.name = 'sea';
  mesh.renderOrder = -5;
  return { mesh, material };
}

/** Clouds: soft puffs in clusters, a ring below the island and a few high ones far behind it. */
export function buildClouds(bag: Bag): Group {
  const root = new Group();
  root.name = 'clouds';
  const geo = bag.add(new IcosahedronGeometry(1, 2));
  const mat = bag.add(
    new MeshStandardMaterial({ color: '#ffffff', roughness: 1, emissive: new Color('#9fb6d8'), emissiveIntensity: 0.32 }),
  );
  const rng = new Stream(41);
  const puffs: { p: Vector3; s: Vector3 }[] = [];
  const cluster = (cx: number, cy: number, cz: number, size: number) => {
    const n = 5 + Math.floor(rng.float() * 5);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rng.range(-0.3, 0.3);
      const r = size * rng.range(0.4, 1.1);
      const s = size * rng.range(0.55, 0.95);
      puffs.push({
        p: new Vector3(cx + Math.cos(a) * r * 1.4, cy + rng.range(0, 0.35) * size, cz + Math.sin(a) * r * 0.8),
        s: new Vector3(s * 1.15, s * 0.62, s),
      });
    }
    puffs.push({ p: new Vector3(cx, cy + size * 0.35, cz), s: new Vector3(size * 1.3, size * 0.8, size * 1.1) });
  };
  // below and around (kept out of the camera's corridor in the south)
  for (let k = 0; k < 11; k++) {
    const a = Math.PI * 0.05 + (k / 11) * Math.PI * 1.9 + rng.range(-0.12, 0.12);
    const r = rng.range(34, 62);
    const x = Math.cos(a) * r;
    const z = -Math.sin(a) * r;
    if (z > 16 && Math.abs(x) < 34) continue;
    cluster(x, rng.range(-24, -9), z, rng.range(3.2, 5.6));
  }
  // high, far behind the island
  for (let k = 0; k < 5; k++) cluster(rng.range(-120, 120), rng.range(-4, 14), rng.range(-170, -110), rng.range(7, 12));
  const mesh = new InstancedMesh(geo, mat, puffs.length);
  const m = new Matrix4();
  const q = new Quaternion();
  puffs.forEach((pf, i) => {
    m.compose(pf.p, q, pf.s);
    mesh.setMatrixAt(i, m);
  });
  mesh.name = 'cloud-puffs';
  root.add(mesh);
  return root;
}

/** Small floating islets around the big one, for depth. */
export function buildIslets(bag: Bag): Group {
  const g = new Group();
  g.name = 'islets';
  const rock = bag.add(new CylinderGeometry(1, 0.05, 2.6, 9, 3));
  const cap = bag.add(new CylinderGeometry(1.08, 1, 0.32, 18));
  const rockMat = bag.add(new MeshStandardMaterial({ color: WORLD.rock[1], roughness: 0.95, flatShading: true }));
  const capMat = bag.add(new MeshStandardMaterial({ color: WORLD.grass, roughness: 0.9 }));
  const trunk = bag.add(new CylinderGeometry(0.05, 0.08, 0.5, 6));
  const crown = bag.add(new IcosahedronGeometry(0.34, 1));
  const trunkMat = bag.add(new MeshStandardMaterial({ color: WORLD.trunk, roughness: 0.9 }));
  const leafMat = bag.add(new MeshStandardMaterial({ color: WORLD.leaf[1], roughness: 0.8, flatShading: true }));
  const spots: [number, number, number, number][] = [
    [-37, -5, -24, 2.2],
    [36, -2, -30, 2.8],
    [-44, -12, 4, 1.6],
    [47, -9, -6, 1.9],
    [6, -7, -44, 1.4],
  ];
  for (const [x, y, z, s] of spots) {
    const islet = new Group();
    const r = new Mesh(rock, rockMat);
    r.position.y = -1.3;
    const c = new Mesh(cap, capMat);
    c.position.y = 0.05;
    const tr = new Mesh(trunk, trunkMat);
    tr.position.set(0.25, 0.45, -0.1);
    const cr = new Mesh(crown, leafMat);
    cr.position.set(0.25, 0.85, -0.1);
    islet.add(r, c, tr, cr);
    islet.position.set(x, y, z);
    islet.scale.setScalar(s);
    islet.rotation.y = x * 0.1;
    g.add(islet);
  }
  return g;
}
