// Director composition: the CAMERA.md targets measured with the projection, at their settled goals.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSpaces, groundHeight, WATER_Y } from '../../src/core/board.ts';
import { changeMode, closeShot, craneShot, followWidth, intentGoal, overviewShot } from '../../src/core/director.ts';
import { lensFor, project } from '../../src/core/fit.ts';
import { RULES } from '../../src/core/rules.ts';
import { Stage } from '../../src/core/stage.ts';
import type { Vec3 } from '../../src/core/vec.ts';

const TV = lensFor(1920 / 1080);
const PHONE = lensFor(390 / 844);
const spaces = buildSpaces();
const near = (a: number, b: number, eps: number, what: string) => assert.ok(Math.abs(a - b) <= eps, `${what}: ${a} vs ${b}`);
const pitchOf = (eye: Vec3, at: Vec3) => (Math.asin((eye[1] - at[1]) / Math.hypot(eye[0] - at[0], eye[1] - at[1], eye[2] - at[2])) * 180) / Math.PI;

test('R4 dice shot: feet on the lower third, die near the upper third, centred', () => {
  for (const s of spaces) {
    const g = closeShot(s.position, RULES.dice);
    const feet = project(s.position, g.position, g.target, TV);
    const die = project([s.position[0], s.position[1] + 2.75, s.position[2]], g.position, g.target, TV);
    near(feet[1], 2 / 3, 0.002, 'feet y');
    near(feet[0], 0.5, 1e-9, 'feet x');
    near(die[1], 0.36, 0.01, 'die y');
  }
});

test('R6 hold shot centres the token; R7 celebrate is closer and lower', () => {
  const p = spaces[7]!.position;
  const g = closeShot(p, RULES.hold);
  const mid = project([p[0], p[1] + 0.65, p[2]], g.position, g.target, TV);
  near(mid[0], 0.5, 1e-9, 'x');
  near(mid[1], 0.5, 1e-9, 'y');
  const c = closeShot(p, RULES.celebrate);
  assert.ok(Math.hypot(c.position[0] - c.target[0], c.position[1] - c.target[1], c.position[2] - c.target[2]) < 9.0001);
  near(pitchOf(c.position, c.target), 38, 1e-9, 'pitch');
});

test('R10 overview: every tile rim and a token height over every tile inside the HUD-safe frame, tightly, at TV and phone sizes', () => {
  for (const aspect of [1920 / 1080, 390 / 844, 4 / 3, 21 / 9, 1]) {
    const lens = lensFor(aspect);
    const stage = new Stage({ players: 4, seed: 1, auto: false, host: true, reduced: false, aspect }, () => {});
    const g = overviewShot(stage.cameraWorld, lens);
    const m = RULES.overview.margins;
    let tight = Infinity;
    for (const p of stage.cameraWorld.boardPoints()) {
      const [x, y] = project(p, g.position, g.target, lens);
      const slack = Math.min(x - m.left, 1 - m.right - x, y - m.top, 1 - m.bottom - y);
      assert.ok(slack > -1e-9, `aspect ${aspect}: point outside by ${-slack}`);
      tight = Math.min(tight, slack);
    }
    assert.ok(tight < 1e-6, `aspect ${aspect}: overview not tight (${tight})`);
    near(pitchOf(g.position, g.target), RULES.overview.pitchDeg, 1e-6, 'overview pitch');
  }
});

test('R8 thresholds and R9 crane pose', () => {
  const w = followWidth(TV);
  near(w, 15.22, 0.01, 'W');
  const a: Vec3 = [0, 1, 0];
  const at = (d: number): Vec3 => [d, 1, 0];
  assert.equal(changeMode(a, at(0.34 * w), TV).mode, 'nudge');
  assert.equal(changeMode(a, at(0.36 * w), TV).mode, 'pan');
  assert.equal(changeMode(a, at(1.0 * w), TV).mode, 'pan');
  assert.equal(changeMode(a, at(1.01 * w), TV).mode, 'crane');
  assert.equal(changeMode(a, at(0.1), TV).settle, 0.6);
  assert.equal(changeMode(a, at(0.5 * w), TV).settle, 0.85);
  const c = craneShot(a, at(1.2 * w), TV);
  near(Math.hypot(c.position[0] - c.target[0], c.position[1] - c.target[1], c.position[2] - c.target[2]), 11 * 1.4, 1e-9, 'crane min distance');
  const far = craneShot(a, at(3 * w), TV);
  near(Math.hypot(far.position[0] - far.target[0], far.position[1] - far.target[1], far.position[2] - far.target[2]), 11 * 2.4, 1e-9, 'crane max distance');
  near(c.target[0], 0.6 * w, 1e-9, 'crane aims at the midpoint');
});

test('R13 every shot goal on every space is already clear of island and sea (the safety lift is a net, not a crutch)', () => {
  const stage = new Stage({ players: 4, seed: 1, auto: false, host: true, reduced: false, aspect: 16 / 9 }, () => {});
  for (const s of spaces) {
    for (const rule of [RULES.dice, RULES.hold, RULES.celebrate]) {
      const g = closeShot(s.position, rule);
      const floor = Math.max(groundHeight(g.position[0], g.position[2]) + RULES.safety.islandClearance, WATER_Y + 2);
      assert.ok(g.position[1] >= floor, `space ${s.index}`);
    }
  }
  for (const kind of ['intro'] as const) {
    const g = intentGoal({ kind, subject: -1 }, stage.cameraWorld, TV);
    assert.ok(g.position[1] > 20);
  }
  for (const lens of [TV, PHONE]) {
    const g = overviewShot(stage.cameraWorld, lens);
    assert.ok(g.position[1] > groundHeight(g.position[0], g.position[2]) + 2.5 || !Number.isFinite(groundHeight(g.position[0], g.position[2])));
  }
});
