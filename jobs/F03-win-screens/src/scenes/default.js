// The default winner moment (any game), 3.6 s: a stage light clicks on, confetti cannons fire,
// the podium rises out of the stage (1st, then 2nd and 3rd) on springs, a gold trophy rises out of
// the winner's block with a spin, rays turn behind it, the camera pulls back and up into the hero framing,
// the name lands letter by letter and the score counts up. Confetti lands on the floor and the
// podium tops and stays there; nothing still moves at 3.6 s.

import { THREE, cameraPath, roundedBox } from '../gl/stage.js';
import { addConfetti } from '../gl/confetti-mesh.js';
import { numeralCanvas, shade } from '../gl/textures.js';
import { inOutCubic, outCubic, outQuart, smoothstep, span, spring, springAt } from '../core/ease.js';
import { beam, bokeh, confettiColors, fill, floor, glow, lacquer, metal, projector, rays, spot } from './common.js';

const DURATION = 3.6;

/** @type {import('./common.js').SceneModule} */
export const defaultScene = {
  id: 'default',
  duration: DURATION,
  backdrop: (o) => ({ top: '#0b0c1c', bottom: '#1c1e3a', glow: o.winner.color, glowY: 0.62, glowA: 0.38, env: 0.5 }),
  build(ctx) {
    const { scene, opts } = ctx;
    scene.fog = new THREE.Fog('#10112a', 16, 36);

    // the stage: a dark lacquered disc on a dark floor, a thin light ring in the winner's colour
    floor(ctx, '#0a0b19', { roughness: 0.22, env: 0.25, size: 36, fade: 0.3 });
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.75, 0.16, 96), new THREE.MeshPhysicalMaterial({ color: '#0f1026', roughness: 0.34, metalness: 0.1, clearcoat: 0.45, clearcoatRoughness: 0.22, envMapIntensity: 0.18 }));
    disc.position.y = 0.08 - 0.16;
    disc.receiveShadow = true;
    disc.name = 'disc';
    scene.add(disc);
    const ringMat = new THREE.MeshBasicMaterial({ color: opts.winner.color, toneMapped: false });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(4.68, 0.025, 8, 160), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.005;
    ring.name = 'ring';
    scene.add(ring);

    // podium blocks
    const blocks = [
      { place: 1, x: 0, h: 1.25, color: opts.winner.color, cap: metal('#ffcf5a', 0.2), at: 0.2, p: opts.winner },
      opts.second && { place: 2, x: -1.78, h: 0.84, color: opts.second.color, cap: metal('#dfe3ee', 0.18), at: 0.38, p: opts.second },
      opts.third && { place: 3, x: 1.78, h: 0.58, color: opts.third.color, cap: metal('#d8925a', 0.26), at: 0.5, p: opts.third },
    ].filter(Boolean);
    const W = 1.62;
    const D = 1.3;
    const built = blocks.map((b) => {
      const g = new THREE.Group();
      g.name = `podium-${b.place}`;
      const body = new THREE.Mesh(roundedBox(W, b.h, D, 0.07, 4), lacquer(shade(b.color, -0.18)));
      body.position.y = b.h / 2;
      body.castShadow = true;
      body.receiveShadow = true;
      const cap = new THREE.Mesh(roundedBox(W + 0.06, 0.07, D + 0.06, 0.03, 3), b.cap);
      cap.position.y = b.h + 0.02;
      cap.castShadow = true;
      cap.receiveShadow = true;
      const num = new THREE.Mesh(
        new THREE.PlaneGeometry(Math.min(0.78, b.h * 0.86), Math.min(0.78, b.h * 0.86)),
        new THREE.MeshStandardMaterial({ map: ctx.stage.tex(numeralCanvas(String(b.place), b.color)), transparent: true, roughness: 0.55, metalness: 0.05, envMapIntensity: 0.4 }),
      );
      num.position.set(0, b.h * 0.48, D / 2 + 0.004);
      g.add(body, cap, num);
      scene.add(g);
      return { ...b, g };
    });

    // trophy on the winner's block: a lathe cup with handles on a plinth
    const trophy = new THREE.Group();
    trophy.name = 'trophy';
    const gold = metal('#ffc94a', 0.16);
    const cupProfile = [
      [0.0, 0.0], [0.17, 0.0], [0.17, 0.05], [0.07, 0.08], [0.045, 0.14], [0.04, 0.26], [0.07, 0.3], [0.17, 0.36], [0.22, 0.48], [0.23, 0.62], [0.215, 0.63], [0.2, 0.5], [0.15, 0.4], [0.0, 0.38],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const cup = new THREE.Mesh(new THREE.LatheGeometry(cupProfile, 48), gold);
    cup.castShadow = true;
    const handleGeo = new THREE.TorusGeometry(0.09, 0.018, 10, 24, Math.PI * 1.25);
    for (const s of [-1, 1]) {
      const h = new THREE.Mesh(handleGeo, gold);
      h.position.set(s * 0.235, 0.5, 0);
      h.rotation.z = s > 0 ? -Math.PI * 0.62 : Math.PI * 0.38 + Math.PI;
      h.castShadow = true;
      trophy.add(h);
    }
    const plinth = new THREE.Mesh(roundedBox(0.36, 0.1, 0.36, 0.02, 2), new THREE.MeshPhysicalMaterial({ color: '#1b1c2e', roughness: 0.25, clearcoat: 1 }));
    plinth.position.y = -0.05;
    plinth.castShadow = true;
    trophy.add(cup, plinth);
    trophy.scale.setScalar(1.25);
    const topY = 1.25 + 0.055 + 0.1 * 1.25;
    scene.add(trophy);

    // light: a key spot that clicks on, two coloured rims, a soft fill
    const key = spot(ctx, { pos: [1.5, 7.5, 6.5], target: [0, 0.6, 0], intensity: 0, angle: 0.42, penumbra: 0.75 });
    const rimL = spot(ctx, { pos: [-6, 4.5, -4], target: [0, 1, 0], color: opts.winner.color, intensity: 0, angle: 0.5, shadow: false });
    const rimR = spot(ctx, { pos: [6, 4.5, -4], target: [0, 1, 0], color: '#ffd166', intensity: 0, angle: 0.5, shadow: false });
    const hemi = fill(ctx, '#8a8fd6', '#120f1e', 0.35);
    const back = glow(ctx, opts.winner.color, 9, [0, 2.0, -3.5], 0);
    const godRays = rays(ctx, [0, 1.2, -2.2], { count: 18, length: 10, opacity: 0.06 });
    const drift = bokeh(ctx, { count: 20, z: [-20, -10], y: [0.5, 6.5], spreadX: 16 });
    const shaft = beam(ctx, { color: '#fff0d2', radius: 1.55, opacity: 0.16 });
    shaft.aim([1.5, 7.5, 6.5], [0, 0.2, 0]);

    // confetti: two cannons at the front corners and a shower from above
    const boxes = built.map((b) => ({ min: /** @type {[number, number, number]} */ ([b.x - W / 2 - 0.03, 0, -D / 2 - 0.03]), max: /** @type {[number, number, number]} */ ([b.x + W / 2 + 0.03, b.h + 0.055, D / 2 + 0.03]) }));
    const confetti = addConfetti(
      ctx.stage,
      scene,
      {
        seed: opts.seed,
        emitters: [
          { at: 0.16, spread: 0.12, count: 120, pos: [-3.9, 0.2, 1.6], jitter: [0.12, 0.08, 0.12], dir: [0.42, 1, -0.22], cone: 0.3, speed: [9, 14] },
          { at: 0.22, spread: 0.12, count: 120, pos: [3.9, 0.2, 1.6], jitter: [0.12, 0.08, 0.12], dir: [-0.42, 1, -0.22], cone: 0.3, speed: [9, 14] },
          { at: 0.3, spread: 0.5, count: 110, pos: [0, 4.4, 0.4], jitter: [4.2, 0.6, 1.6], dir: [0, -1, 0], cone: 0.6, speed: [0.5, 2] },
        ],
        floorY: 0,
        boxes,
        boundsX: 9,
        fadeStart: 3.05,
        fadeEnd: 3.5,
        size: [0.11, 0.06],
      },
      confettiColors(opts.winner.color),
    );

    // camera: tight and low on the winner's block, then back and up into the hero frame
    const path = cameraPath([
      { t: 0, pos: [0.9, 1.05, 5.0], look: [0, 1.35, 0], fov: 36 },
      { t: 1.2, pos: [0.3, 1.75, 8.2], look: [0, 1.75, 0], fov: 32, ease: outQuart },
      { t: 2.7, pos: [0, 2.3, 10.4], look: [0, 2.0, 0], fov: 30, ease: inOutCubic },
    ]);
    const project = projector(ctx, path);

    // 2D light: sparks out of the cannons, dust rings where blocks break the floor, sweep and glints
    const fx = ctx.fx;
    // the cannons sit just outside the opening shot: their sparks enter from the bottom corners
    const muzzleL = { x: -20, y: 1000 };
    const muzzleR = { x: 1940, y: 1000 };
    fx.burst({ t: 0.16, x: muzzleL.x, y: muzzleL.y, count: 26, speed: [700, 1500], angle: -1.1, spread: 0.45, colors: ['#ffd166', '#ffffff', opts.winner.color], life: [0.35, 0.8], g: 1400 });
    fx.burst({ t: 0.22, x: muzzleR.x, y: muzzleR.y, count: 26, speed: [700, 1500], angle: -2.04, spread: 0.45, colors: ['#ffd166', '#ffffff', opts.winner.color], life: [0.35, 0.8], g: 1400 });
    fx.bloom({ t: 0.14, dur: 0.4, x: muzzleL.x, y: muzzleL.y, r: 260, color: '#ffe2a8', alpha: 0.55 });
    fx.bloom({ t: 0.2, dur: 0.4, x: muzzleR.x, y: muzzleR.y, r: 260, color: '#ffe2a8', alpha: 0.55 });
    for (const b of built) {
      const p = project([b.x, 0.02, D / 2], b.at + 0.12);
      fx.ring({ t: b.at + 0.08, x: p.x, y: p.y, r1: 260, dur: 0.6, color: b.color, width: 5, squash: 0.18 });
    }
    const trophyLand = 1.12;
    const tp = project([0, topY, 0], trophyLand);
    fx.ring({ t: trophyLand, x: tp.x, y: tp.y, r1: 140, dur: 0.45, color: '#ffe08a', width: 4, squash: 0.25 });
    fx.sweep(1.45, 0.9, { angle: -0.42, width: 320, alpha: 0.16 });
    const gp = project([0.2, topY + 0.72, 0.2], 2.0);
    fx.glint(1.95, gp.x, gp.y, 120, '#fff2c4', 0.55);
    const gp2 = project([-W / 2, 1.3, D / 2], 1.7);
    fx.glint(1.66, gp2.x, gp2.y, 70, '#ffffff', 0.45);

    // podium labels for 2nd and 3rd (DOM, crisp), anchored above their blocks
    const labelLayer = document.createElement('div');
    labelLayer.className = 'pbw-plabels';
    /** @type {{el: HTMLElement, b: any}[]} */
    const labels = [];
    for (const b of built) {
      if (b.place === 1) continue;
      const el = document.createElement('div');
      el.className = `pbw-plabel pbw-place-${b.place}`;
      el.style.setProperty('--pc', b.color);
      const medal = document.createElement('span');
      medal.className = 'pbw-medal';
      medal.textContent = b.place === 2 ? '2nd' : '3rd';
      const nm = document.createElement('span');
      nm.className = 'pbw-chip-name';
      nm.textContent = b.p.name;
      el.append(medal, nm);
      if (b.p.score) {
        const sc = document.createElement('span');
        sc.className = 'pbw-chip-score';
        sc.textContent = b.p.score.text;
        el.append(sc);
      }
      labelLayer.appendChild(el);
      labels.push({ el, b });
    }
    ctx.ui.appendChild(labelLayer);

    return {
      lockup: { kicker: 'WINNER', y: 92, nameSize: 176, maxWidth: 1500, kickerAt: 0.28, nameAt: 0.42, scoreAt: 0.9, scoreDur: 1.05, shineAt: 1.4 },
      beats: [
        { t: 0.12, name: 'light' },
        { t: 0.16, name: 'pop' },
        { t: 0.2, name: 'rise' },
        { t: 0.42, name: 'name' },
        { t: trophyLand, name: 'land' },
        { t: 1.95, name: 'score' },
      ],
      settle: 2.7,
      drift: 0.035,
      camera: path,
      update(t) {
        for (const b of built) {
          const s = springAt(t, b.at, 0.78, 0.68);
          b.g.position.set(b.x, -(b.h + 0.2) * (1 - s), 0);
          b.g.visible = t >= b.at - 0.01;
        }
        // trophy: rises out of the winner's block like a stage lift, spinning, and settles facing us
        const first = built[0];
        const blockY = first.g.position.y;
        const tu = span(t, 0.66, 0.66 + 0.7);
        const ts = spring(tu, 0.58);
        trophy.position.set(0, blockY + topY - 1.05 * (1 - ts), 0.02);
        trophy.rotation.y = -Math.PI * 2.2 * (1 - outCubic(span(t, 0.66, 1.75)));
        trophy.visible = t >= 0.66;
        // light
        const on = smoothstep(span(t, 0.08, 0.2));
        key.intensity = 70 * on;
        shaft.set(on * (1 - 0.55 * smoothstep(span(t, 1.2, 2.6))));
        rimL.intensity = 45 * smoothstep(span(t, 0.25, 0.9));
        rimR.intensity = 35 * smoothstep(span(t, 0.35, 1.0));
        hemi.intensity = 0.2 + 0.25 * on;
        /** @type {THREE.SpriteMaterial} */ (back.material).opacity = 0.42 * smoothstep(span(t, 0.3, 1.3));
        godRays.set(t, smoothstep(span(t, 0.35, 1.4)), 0.35 + 0.16 * outCubic(span(t, 0, DURATION)));
        ringMat.color.set(opts.winner.color).multiplyScalar(0.4 + 1.6 * smoothstep(span(t, 0.1, 0.5)));
        drift(t);
        confetti.update(t);
      },
      afterCamera(t) {
        for (const { el, b } of labels) {
          const s = springAt(t, b.at + 0.55, 0.6, 0.72);
          const p = projectLive(ctx, [b.x, b.h + 0.3, D / 2 - 0.2]);
          el.style.transform = `translate(${p.x.toFixed(1)}px, ${(p.y - 18 + (1 - s) * 40).toFixed(1)}px) translate(-50%, -100%)`;
          el.style.opacity = smoothstep(span(t, b.at + 0.55, b.at + 0.85)).toFixed(3);
        }
      },
      dispose() {
        labelLayer.remove();
      },
    };
  },
};

/** Projects with the live camera (after drift and shake), so labels stick to their blocks. */
function projectLive(/** @type {import('./common.js').SceneCtx} */ ctx, /** @type {[number, number, number]} */ p) {
  const v = new THREE.Vector3(...p).project(ctx.stage.camera);
  return { x: (v.x * 0.5 + 0.5) * ctx.W, y: (-v.y * 0.5 + 0.5) * ctx.H };
}
