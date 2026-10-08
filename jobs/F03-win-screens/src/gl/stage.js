// The TV's 3D stage: one WebGL renderer reused by every ending (a TV must not open a new WebGL
// context per moment), a studio environment for reflections, optional bloom, a painted backdrop,
// and a camera that follows keyframes with eased motion, a hand-held drift and impact shake.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { lerp, inOutCubic, sineNoise, span } from '../core/ease.js';
import { backdropCanvas } from './textures.js';

export { THREE };

/** Quality ladder. `auto` starts high and steps down if frames run long (real clock only). */
export const QUALITY = {
  high: { bloom: true, shadows: true, shadowSize: 2048, scale: 1 },
  medium: { bloom: false, shadows: true, shadowSize: 1024, scale: 0.85 },
  low: { bloom: false, shadows: false, shadowSize: 512, scale: 0.65 },
};

/**
 * A rounded-rectangle card with thickness: groups 0 = front (+z, UV 0..1), 1 = back, 2 = edge.
 * @param {number} w @param {number} h @param {number} r @param {number} t
 */
export function cardGeometry(w, h, r, t) {
  const shape = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  const front = new THREE.ShapeGeometry(shape, 6);
  const uv = front.attributes.uv;
  const pos = front.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
  front.translate(0, 0, t / 2);
  const back = new THREE.ShapeGeometry(shape, 6);
  const buv = back.attributes.uv;
  const bpos = back.attributes.position;
  for (let i = 0; i < buv.count; i++) buv.setXY(i, bpos.getX(i) / w + 0.5, bpos.getY(i) / h + 0.5);
  back.rotateY(Math.PI);
  back.translate(0, 0, -t / 2);
  // edge strip
  const pts = shape.getPoints(6);
  if (pts[0].distanceTo(pts[pts.length - 1]) < 1e-6) pts.pop();
  const ep = [];
  const en = [];
  const eu = [];
  const ei = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const nx = b.y - a.y;
    const ny = -(b.x - a.x);
    const nl = Math.hypot(nx, ny) || 1;
    const k = ep.length / 3;
    ep.push(a.x, a.y, t / 2, b.x, b.y, t / 2, b.x, b.y, -t / 2, a.x, a.y, -t / 2);
    for (let j = 0; j < 4; j++) en.push(nx / nl, ny / nl, 0);
    eu.push(0, 0, 1, 0, 1, 1, 0, 1);
    ei.push(k, k + 2, k + 1, k, k + 3, k + 2);
  }
  const edge = new THREE.BufferGeometry();
  edge.setAttribute('position', new THREE.Float32BufferAttribute(ep, 3));
  edge.setAttribute('normal', new THREE.Float32BufferAttribute(en, 3));
  edge.setAttribute('uv', new THREE.Float32BufferAttribute(eu, 2));
  edge.setIndex(ei);
  const merged = mergeGeometries([front, back, edge], true);
  front.dispose();
  back.dispose();
  edge.dispose();
  return merged;
}

/**
 * @param {number} w @param {number} h @param {number} d @param {number} r @param {number} [seg]
 */
export function roundedBox(w, h, d, r, seg = 4) {
  return new RoundedBoxGeometry(w, h, d, seg, r);
}

/**
 * The stage. Created once per page; `begin()` gives each ending a fresh scene graph.
 * @param {HTMLCanvasElement} canvas
 */
export function createStage(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance', stencil: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const envRT = pmrem.fromScene(room, 0.04);
  room.dispose?.();
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(32, 16 / 9, 0.05, 200);
  /** @type {THREE.Scene} */
  let scene = new THREE.Scene();
  /** @type {EffectComposer|null} */
  let composer = null;
  /** @type {UnrealBloomPass|null} */
  let bloom = null;
  let quality = /** @type {keyof typeof QUALITY} */ ('high');
  let width = 1920;
  let height = 1080;
  let pixelRatio = 1;
  /** @type {Set<{dispose: () => void}>} */
  const owned = new Set();

  function buildComposer() {
    composer?.dispose();
    composer = null;
    bloom = null;
    if (!QUALITY[quality].bloom) return;
    composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(width * pixelRatio, height * pixelRatio, { type: THREE.HalfFloatType, samples: 4 }));
    composer.setPixelRatio(pixelRatio);
    composer.setSize(width, height);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(width / 2, height / 2), 0.42, 0.45, 0.9);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }

  const stage = {
    THREE,
    renderer,
    camera,
    get scene() {
      return scene;
    },
    get quality() {
      return quality;
    },
    maxAniso,
    /**
     * Registers a GPU resource to free when the ending is torn down. Returns it.
     * @template {{dispose: () => void}} T @param {T} res @returns {T}
     */
    own(res) {
      owned.add(res);
      return res;
    },
    /**
     * A texture from a canvas (sRGB, mipmapped, anisotropic). @param {HTMLCanvasElement} c
     * @param {{repeat?: [number, number], srgb?: boolean}} [o]
     */
    tex(c, o = {}) {
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = o.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
      t.anisotropy = Math.min(8, maxAniso);
      if (o.repeat) {
        t.wrapS = THREE.RepeatWrapping;
        t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(o.repeat[0], o.repeat[1]);
      }
      return stage.own(t);
    },
    /** A fresh scene for an ending, with the backdrop and environment. */
    begin(/** @type {{top: string, bottom: string, glow: string, glowY?: number, glowA?: number, env?: number, exposure?: number}} */ bg) {
      stage.end();
      scene = new THREE.Scene();
      const bgTex = stage.tex(backdropCanvas(bg));
      scene.background = bgTex;
      scene.environment = envRT.texture;
      scene.environmentIntensity = bg.env ?? 0.55;
      renderer.toneMappingExposure = bg.exposure ?? 1;
      if (composer) {
        const rp = /** @type {RenderPass} */ (composer.passes[0]);
        rp.scene = scene;
      }
      return scene;
    },
    /** Frees everything the last ending made. */
    end() {
      scene.traverse((o) => {
        const m = /** @type {THREE.Mesh} */ (o);
        if (m.geometry) m.geometry.dispose();
        const mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
        for (const mat of mats) {
          for (const v of Object.values(mat)) if (v && /** @type {any} */ (v).isTexture) /** @type {THREE.Texture} */ (v).dispose();
          mat.dispose();
        }
        if (/** @type {any} */ (o).isInstancedMesh) /** @type {THREE.InstancedMesh} */ (o).dispose();
        if (/** @type {any} */ (o).shadow?.map) /** @type {any} */ (o).shadow.map.dispose();
      });
      for (const r of owned) r.dispose();
      owned.clear();
      scene.clear();
    },
    /**
     * @param {number} w CSS px of the stage box @param {number} h @param {number} pr device pixels per CSS px
     */
    resize(w, h, pr) {
      width = w;
      height = h;
      pixelRatio = Math.max(0.35, Math.min(2, pr * QUALITY[quality].scale));
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      buildComposer();
    },
    /** @param {keyof typeof QUALITY} q */
    setQuality(q) {
      if (q === quality) return;
      quality = q;
      renderer.shadowMap.enabled = QUALITY[q].shadows;
      scene.traverse((o) => {
        const l = /** @type {any} */ (o);
        if (l.isLight && l.shadow) {
          l.shadow.mapSize.set(QUALITY[q].shadowSize, QUALITY[q].shadowSize);
          l.shadow.map?.dispose();
          l.shadow.map = null;
        }
        const m = /** @type {any} */ (o).material;
        if (m) for (const mm of Array.isArray(m) ? m : [m]) mm.needsUpdate = true;
      });
    },
    shadowSize() {
      return QUALITY[quality].shadowSize;
    },
    render() {
      if (composer) composer.render();
      else renderer.render(scene, camera);
    },
    /** Draw calls and triangles of the last frame (for the perf log). */
    info() {
      return { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, textures: renderer.info.memory.textures, geometries: renderer.info.memory.geometries };
    },
    dispose() {
      stage.end();
      composer?.dispose();
      envRT.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
  return stage;
}

/** @typedef {ReturnType<typeof createStage>} Stage */

/**
 * @typedef {object} CamKey
 * @property {number} t
 * @property {[number, number, number]} pos
 * @property {[number, number, number]} look
 * @property {number} [fov]
 * @property {(u: number) => number} [ease]  easing INTO this key from the previous one
 */

/**
 * A camera path through keys: each leg eases from the previous key to the next.
 * Returns pos, look and fov at time t; exact at and after the last key.
 * @param {CamKey[]} keys
 */
export function cameraPath(keys) {
  return (/** @type {number} */ t) => {
    if (t <= keys[0].t) return { pos: keys[0].pos, look: keys[0].look, fov: keys[0].fov ?? 32 };
    for (let i = 1; i < keys.length; i++) {
      const b = keys[i];
      if (t <= b.t) {
        const a = keys[i - 1];
        const u = (b.ease ?? inOutCubic)(span(t, a.t, b.t));
        return {
          pos: /** @type {[number, number, number]} */ ([lerp(a.pos[0], b.pos[0], u), lerp(a.pos[1], b.pos[1], u), lerp(a.pos[2], b.pos[2], u)]),
          look: /** @type {[number, number, number]} */ ([lerp(a.look[0], b.look[0], u), lerp(a.look[1], b.look[1], u), lerp(a.look[2], b.look[2], u)]),
          fov: lerp(a.fov ?? 32, b.fov ?? 32, u),
        };
      }
    }
    const z = keys[keys.length - 1];
    return { pos: z.pos, look: z.look, fov: z.fov ?? 32 };
  };
}

/**
 * Places the camera at time t: path + hand-held drift (fades to nothing by `settle`) + impact
 * shakes (each decays to zero within its own window). The pose at t >= settle is exactly the path.
 * @param {THREE.PerspectiveCamera} camera
 * @param {{pos: number[], look: number[], fov: number}} at
 * @param {number} t @param {number} settle
 * @param {{t: number, amp: number, dur: number}[]} shakes
 * @param {number[]} phases  six seeded phases
 * @param {number} [drift]   hand-held amplitude (scene units)
 */
export function placeCamera(camera, at, t, settle, shakes, phases, drift = 0.03) {
  const fade = 1 - span(t, settle * 0.45, settle);
  let dx = sineNoise(t, phases.slice(0, 3)) * drift * fade;
  let dy = sineNoise(t + 9.1, phases.slice(3, 6)) * drift * 0.7 * fade;
  let roll = 0;
  for (const s of shakes) {
    const u = (t - s.t) / s.dur;
    if (u <= 0 || u >= 1) continue;
    const env = (1 - u) ** 2.5;
    dx += Math.sin(t * 71 + phases[0]) * s.amp * env;
    dy += Math.sin(t * 89 + phases[1]) * s.amp * env;
    roll += Math.sin(t * 53 + phases[2]) * s.amp * 0.18 * env;
  }
  camera.position.set(at.pos[0] + dx, at.pos[1] + dy, at.pos[2]);
  camera.lookAt(at.look[0] + dx * 0.6, at.look[1] + dy * 0.6, at.look[2]);
  if (roll) camera.rotateZ(roll);
  if (camera.fov !== at.fov) {
    camera.fov = at.fov;
    camera.updateProjectionMatrix();
  }
}

/**
 * Projects a world point to stage pixels (0..w, 0..h). @param {THREE.Camera} camera
 * @param {[number, number, number]|THREE.Vector3} p @param {number} w @param {number} h
 */
export function toScreen(camera, p, w, h) {
  const v = Array.isArray(p) ? new THREE.Vector3(p[0], p[1], p[2]) : p.clone();
  v.project(camera);
  return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, z: v.z };
}
