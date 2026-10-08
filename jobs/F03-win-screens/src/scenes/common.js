// Pieces several endings share: lights, glow sprites, out-of-focus bokeh, light rays, a floor,
// and projecting a world point to stage pixels along the camera path (to aim 2D sparks at 3D hits).

import { THREE } from '../gl/stage.js';
import { bokehCanvas, glowCanvas } from '../gl/textures.js';
import { sineNoise } from '../core/ease.js';

/**
 * @typedef {object} SceneCtx
 * @property {import('../gl/stage.js').Stage} stage
 * @property {typeof THREE} THREE
 * @property {THREE.Scene} scene
 * @property {import('../core/params.js').WinOptions} opts
 * @property {import('../core/rng.js').Rng} rng
 * @property {ReturnType<typeof import('../ui/fx2d.js').createFx>} fx
 * @property {number} W @property {number} H
 * @property {HTMLElement} ui  the DOM layer over the stage (labels go here)
 */

/**
 * @typedef {object} Built
 * @property {(t: number) => void} update
 * @property {(t: number) => {pos: number[], look: number[], fov: number}} camera
 * @property {import('../ui/lockup.js').LockupConfig} lockup
 * @property {{t: number, name: string}[]} [beats]
 * @property {{t: number, amp: number, dur: number}[]} [shakes]
 * @property {number} [drift]
 * @property {number} [settle]
 * @property {(t: number) => void} [afterCamera]
 * @property {() => void} [dispose]
 */

/**
 * @typedef {object} SceneModule
 * @property {string} id
 * @property {number} duration
 * @property {(o: import('../core/params.js').WinOptions) => {top: string, bottom: string, glow: string, glowY?: number, glowA?: number, env?: number, exposure?: number}} backdrop
 * @property {(ctx: SceneCtx) => Built} build
 */

/**
 * A shadow-casting spot light aimed at `target`.
 * @param {SceneCtx} ctx
 * @param {{pos: [number, number, number], target: [number, number, number], color?: string, intensity?: number, angle?: number, penumbra?: number, shadow?: boolean, distance?: number}} o
 */
export function spot(ctx, o) {
  const l = new THREE.SpotLight(o.color ?? '#fff4e0', o.intensity ?? 60, o.distance ?? 0, o.angle ?? 0.5, o.penumbra ?? 0.6, 1.6);
  l.position.set(...o.pos);
  l.target.position.set(...o.target);
  if (o.shadow !== false) {
    l.castShadow = true;
    const s = ctx.stage.shadowSize();
    l.shadow.mapSize.set(s, s);
    l.shadow.bias = -0.0004;
    l.shadow.normalBias = 0.02;
    l.shadow.radius = 4;
    l.shadow.camera.near = 0.5;
    l.shadow.camera.far = 40;
  }
  ctx.scene.add(l, l.target);
  return l;
}

/**
 * An additive glow sprite. @param {SceneCtx} ctx @param {string} color @param {number} size
 * @param {[number, number, number]} pos @param {number} [opacity]
 */
export function glow(ctx, color, size, pos, opacity = 0.6) {
  const mat = new THREE.SpriteMaterial({ map: ctx.stage.tex(glowCanvas('#ffffff', 128)), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
  const s = new THREE.Sprite(mat);
  s.scale.set(size, size, 1);
  s.position.set(...pos);
  s.name = 'glow';
  ctx.scene.add(s);
  return s;
}

/**
 * Out-of-focus lights far behind the action (the depth-of-field feel): soft discs that drift a
 * little and come into view. Returns an update(t).
 * @param {SceneCtx} ctx @param {{count?: number, z?: [number, number], spreadX?: number, y?: [number, number], colors?: string[], opacity?: number, size?: [number, number]}} [o]
 */
export function bokeh(ctx, o = {}) {
  const rng = ctx.rng.fork('bokeh');
  const map = ctx.stage.tex(bokehCanvas(128));
  const colors = o.colors ?? [ctx.opts.winner.color, '#ffd166', '#4cc9f0', '#b388ff', '#ffffff'];
  const group = new THREE.Group();
  group.name = 'bokeh';
  const items = [];
  for (let i = 0; i < (o.count ?? 26); i++) {
    const mat = new THREE.SpriteMaterial({ map, color: rng.pick(colors), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const s = new THREE.Sprite(mat);
    const z = rng.range(...(o.z ?? [-16, -9]));
    const size = rng.range(...(o.size ?? [0.35, 1.05])) * (-z / 10);
    s.scale.set(size, size, 1);
    const base = [rng.range(-1, 1) * (o.spreadX ?? 14), rng.range(...(o.y ?? [0.5, 8])), z];
    s.position.set(base[0], base[1], base[2]);
    group.add(s);
    items.push({ s, base, a: rng.range(0.25, 1) * (o.opacity ?? 0.13), ph: [rng.range(0, 6.3), rng.range(0, 6.3), rng.range(0, 6.3)], delay: rng.range(0, 0.6) });
  }
  ctx.scene.add(group);
  return (/** @type {number} */ t) => {
    for (const it of items) {
      it.s.position.x = it.base[0] + sineNoise(t * 0.35, it.ph) * 0.25;
      it.s.position.y = it.base[1] + sineNoise(t * 0.3 + 4, it.ph) * 0.2;
      /** @type {THREE.SpriteMaterial} */ (it.s.material).opacity = it.a * Math.min(1, Math.max(0, (t - it.delay) / 0.8));
    }
  };
}

/**
 * God rays: thin additive wedges fanned around a point, turning slowly.
 * @param {SceneCtx} ctx @param {[number, number, number]} at @param {{count?: number, length?: number, colors?: string[], opacity?: number}} [o]
 */
export function rays(ctx, at, o = {}) {
  const [c, g2] = (() => {
    const cv = document.createElement('canvas');
    cv.width = 64;
    cv.height = 256;
    return [cv, /** @type {CanvasRenderingContext2D} */ (cv.getContext('2d'))];
  })();
  const grad = g2.createLinearGradient(0, 256, 0, 0);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g2.fillStyle = grad;
  g2.beginPath();
  g2.moveTo(30, 256);
  g2.lineTo(34, 256);
  g2.lineTo(64, 0);
  g2.lineTo(0, 0);
  g2.closePath();
  g2.fill();
  const map = ctx.stage.tex(c);
  const group = new THREE.Group();
  group.name = 'rays';
  group.position.set(...at);
  const rng = ctx.rng.fork('rays');
  const colors = o.colors ?? [ctx.opts.winner.color, '#ffd166', '#ffffff'];
  const mats = [];
  const n = o.count ?? 16;
  for (let i = 0; i < n; i++) {
    const len = (o.length ?? 9) * rng.range(0.7, 1.1);
    const geo = new THREE.PlaneGeometry(len * rng.range(0.12, 0.22), len);
    geo.translate(0, len / 2, 0);
    const mat = new THREE.MeshBasicMaterial({ map, color: colors[i % colors.length], transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.z = (i / n) * Math.PI * 2 + rng.range(-0.08, 0.08);
    group.add(m);
    mats.push({ mat, k: rng.range(0.5, 1) });
  }
  ctx.scene.add(group);
  return {
    group,
    /** @param {number} t @param {number} amount 0..1 @param {number} angle */
    set(t, amount, angle) {
      group.rotation.z = angle;
      for (const m of mats) m.mat.opacity = (o.opacity ?? 0.1) * amount * m.k;
    },
  };
}

/**
 * A big dark floor that melts into the backdrop: a radial alpha fade, so there is no horizon line.
 * @param {SceneCtx} ctx @param {string} color
 * @param {{roughness?: number, metalness?: number, size?: number, env?: number, fade?: number}} [o]
 */
export function floor(ctx, color, o = {}) {
  const size = o.size ?? 40;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const g = /** @type {CanvasRenderingContext2D} */ (cv.getContext('2d'));
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  const fade = o.fade ?? 0.32;
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(fade, '#ffffff');
  grad.addColorStop(Math.min(0.98, fade + 0.38), '#3a3a3a');
  grad.addColorStop(1, '#000000');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const alphaMap = ctx.stage.tex(cv, { srgb: false });
  const mat = new THREE.MeshStandardMaterial({ color, roughness: o.roughness ?? 0.34, metalness: o.metalness ?? 0.1, envMapIntensity: o.env ?? 0.35, alphaMap, transparent: true });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  m.renderOrder = -1;
  m.name = 'floor';
  ctx.scene.add(m);
  return m;
}

/**
 * A visible beam of stage light: an open cone, brightest at the lamp and toward its axis,
 * additive, no depth write. Aim it with `aim(from, to)`; `set(amount)` fades it.
 * @param {SceneCtx} ctx @param {{color?: string, radius?: number, opacity?: number}} [o]
 */
export function beam(ctx, o = {}) {
  const geo = new THREE.CylinderGeometry(0.06, o.radius ?? 1.4, 1, 48, 1, true);
  geo.translate(0, -0.5, 0);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(o.color ?? '#fff1d6') }, uOpacity: { value: 0 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying float vY;
      void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vY = -position.y; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying vec3 vN; varying vec3 vV; varying float vY;
      void main() { float f = abs(dot(normalize(vN), normalize(vV))); float a = pow(f, 2.2) * (1.0 - smoothstep(0.55, 1.0, vY)) * mix(1.0, 0.45, vY) * smoothstep(0.0, 0.04, vY);
        gl_FragColor = vec4(uColor * a * uOpacity, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const m = new THREE.Mesh(geo, mat);
  m.name = 'beam';
  m.renderOrder = 2;
  ctx.scene.add(m);
  const up = new THREE.Vector3(0, -1, 0);
  return {
    mesh: m,
    /** @param {[number, number, number]} from @param {[number, number, number]} to */
    aim(from, to) {
      const a = new THREE.Vector3(...from);
      const d = new THREE.Vector3(...to).sub(a);
      const len = d.length();
      m.position.copy(a);
      m.quaternion.setFromUnitVectors(up, d.normalize());
      m.scale.set(1, len, 1);
    },
    /** @param {number} k */
    set(k) {
      mat.uniforms.uOpacity.value = (o.opacity ?? 0.22) * k;
      m.visible = k > 0.001;
    },
  };
}

/**
 * Ambient + hemisphere fill so shadows are never black holes.
 * @param {SceneCtx} ctx @param {string} sky @param {string} ground @param {number} [k]
 */
export function fill(ctx, sky, ground, k = 0.6) {
  const h = new THREE.HemisphereLight(sky, ground, k);
  ctx.scene.add(h);
  return h;
}

/**
 * World point → stage px at time t along a camera path (no drift: the path itself).
 * @param {SceneCtx} ctx @param {(t: number) => {pos: number[], look: number[], fov: number}} path
 */
export function projector(ctx, path) {
  const cam = new THREE.PerspectiveCamera(32, ctx.W / ctx.H, 0.05, 200);
  return (/** @type {[number, number, number]} */ p, /** @type {number} */ t) => {
    const at = path(t);
    cam.position.set(at.pos[0], at.pos[1], at.pos[2]);
    cam.lookAt(at.look[0], at.look[1], at.look[2]);
    cam.fov = at.fov;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    const v = new THREE.Vector3(...p).project(cam);
    return { x: (v.x * 0.5 + 0.5) * ctx.W, y: (-v.y * 0.5 + 0.5) * ctx.H };
  };
}

export { confettiPalette as confettiColors } from '../core/palette.js';

/**
 * Physical, clear-coated lacquer (podiums, racers, buttons).
 * @param {string} color @param {object} [o]
 */
export function lacquer(color, o = {}) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.32, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.12, ...o });
}

/** Polished metal (gold, silver, chrome). @param {string} color @param {number} [roughness] */
export function metal(color, roughness = 0.22) {
  return new THREE.MeshStandardMaterial({ color, metalness: 1, roughness, envMapIntensity: 1.4 });
}
