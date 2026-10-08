// Draws a confetti simulation (core/confetti.js) as two instanced meshes: matte paper and metal
// foil. Paper is two-sided: each side is lit with its own normal, and the back of a piece is a
// slightly paler, darker print of its front, the way coloured paper looks when it turns over.
// A piece that is fading (airborne at the end) shrinks to nothing instead of going transparent,
// so there is no sorting problem and the last frame is clean.

import { THREE } from './stage.js';
import { createConfetti } from '../core/confetti.js';

/**
 * @param {import('./stage.js').Stage} stage
 * @param {THREE.Object3D} parent
 * @param {import('../core/confetti.js').ConfettiConfig} cfg
 * @param {string[]} paperColors  colour slots
 * @param {string[]} [foilColors]
 */
export function addConfetti(stage, parent, cfg, paperColors, foilColors = ['#ffd27a', '#e8ecf5', '#ffb3c8']) {
  const sim = createConfetti({ ...cfg, colors: paperColors.length });
  const plane = new THREE.PlaneGeometry(1, 1);
  const paperMat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.62, metalness: 0 });
  paperMat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      '#include <color_fragment>\n  diffuseColor.rgb = gl_FrontFacing ? diffuseColor.rgb : mix(diffuseColor.rgb, vec3(1.0), 0.18) * 0.78;',
    );
  };
  const foilMat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.2, metalness: 1, envMapIntensity: 1.6 });
  let nPaper = 0;
  let nFoil = 0;
  for (const p of sim.pieces) {
    if (p.foil) nFoil++;
    else nPaper++;
  }
  const paper = new THREE.InstancedMesh(plane, paperMat, Math.max(1, nPaper));
  const foil = new THREE.InstancedMesh(plane.clone(), foilMat, Math.max(1, nFoil));
  paper.name = 'confetti-paper';
  foil.name = 'confetti-foil';
  for (const m of [paper, foil]) {
    m.castShadow = true;
    m.receiveShadow = false;
    m.frustumCulled = false;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    parent.add(m);
  }
  /** @type {number[]} */
  const slot = [];
  const col = new THREE.Color();
  let ip = 0;
  let iff = 0;
  sim.pieces.forEach((p) => {
    if (p.foil) {
      slot.push(iff);
      col.set(foilColors[p.color % foilColors.length]);
      foil.setColorAt(iff++, col);
    } else {
      slot.push(ip);
      col.set(paperColors[p.color]);
      paper.setColorAt(ip++, col);
    }
  });
  if (paper.instanceColor) paper.instanceColor.needsUpdate = true;
  if (foil.instanceColor) foil.instanceColor.needsUpdate = true;
  paper.count = nPaper;
  foil.count = nFoil;

  const m4 = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scl = new THREE.Vector3();

  return {
    sim,
    /** @param {number} t */
    update(t) {
      sim.advanceTo(t);
      for (let i = 0; i < sim.pieces.length; i++) {
        const p = sim.pieces[i];
        const pose = sim.pose(i, t);
        const k = pose.alpha;
        pos.set(pose.p[0], pose.p[1], pose.p[2]);
        quat.set(pose.q[0], pose.q[1], pose.q[2], pose.q[3]);
        scl.set(p.sw * k + 1e-5, p.sh * k + 1e-5, 1);
        m4.compose(pos, quat, scl);
        (p.foil ? foil : paper).setMatrixAt(slot[i], m4);
      }
      paper.instanceMatrix.needsUpdate = true;
      foil.instanceMatrix.needsUpdate = true;
    },
  };
}
