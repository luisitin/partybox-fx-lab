// CAMERA.md section 4: the closed-form fit and an independent bisection agree on 10,000 random point sets.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fitPoints, fitPointsBisect, lensFor, project } from '../../src/core/fit.ts';
import { seedRng, nextFloat } from '../../src/core/rng.ts';
import type { RngState } from '../../src/core/rng.ts';
import type { Vec3 } from '../../src/core/vec.ts';

function stream(seed: number) {
  let s: RngState = seedRng(seed);
  return (lo: number, hi: number) => {
    const [v, n] = nextFloat(s);
    s = n;
    return lo + (hi - lo) * v;
  };
}

const CASES = Number(process.env.FIT_CASES ?? 10000);

test(`closed form vs bisection on ${CASES} random cases`, () => {
  const r = stream(20261008);
  let worst = 0;
  for (let c = 0; c < CASES; c++) {
    const n = Math.floor(r(1, 9));
    const spread = r(0.5, 40);
    const pts: Vec3[] = Array.from({ length: n }, () => [r(-spread, spread), r(-2, 6), r(-spread, spread)]);
    const pitch = r(35, 70);
    const yaw = r(-30, 30);
    const lens = lensFor(r(0.4, 2.6));
    const m = () => r(0, 0.32);
    const margins = { left: m(), right: m(), top: m(), bottom: m() };
    const minD = r(0, 1) < 0.3 ? r(1, 30) : 0;
    const a = fitPoints(pts, yaw, pitch, margins, lens, minD);
    const b = fitPointsBisect(pts, yaw, pitch, margins, lens, minD);
    const rel = Math.abs(a.distance - b.distance) / Math.max(1, a.distance);
    worst = Math.max(worst, rel);
    assert.ok(rel < 1e-6, `case ${c}: ${a.distance} vs ${b.distance}`);
    // the closed-form camera really keeps every point inside the margins...
    let tight = Infinity;
    for (const p of pts) {
      const [sx, sy] = project(p, a.eye, a.aim, lens);
      const slack = Math.min(sx - margins.left, 1 - margins.right - sx, sy - margins.top, 1 - margins.bottom - sy);
      assert.ok(slack > -1e-7, `case ${c}: a point is ${-slack} outside`);
      tight = Math.min(tight, slack);
    }
    // ...and is not farther than it needs to be: when the frame binds, some point touches a margin
    if (a.binding === 'x' || a.binding === 'y') assert.ok(tight < 1e-6, `case ${c}: loose fit ${tight}`);
  }
  assert.ok(worst < 1e-6);
});

test('lens: 34 deg vertical; a portrait window keeps 30 deg horizontal', () => {
  const tv = lensFor(1920 / 1080);
  assert.ok(Math.abs((tv.vFov * 180) / Math.PI - 34) < 1e-9);
  assert.ok(Math.abs((tv.hFov * 180) / Math.PI - 57.05) < 0.01);
  const phone = lensFor(390 / 844);
  assert.ok(Math.abs((phone.hFov * 180) / Math.PI - 30) < 1e-9);
});
