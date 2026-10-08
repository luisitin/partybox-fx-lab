// The hop's squash and stretch: CAMERA.md section 5 numbers, volume kept, lands on whole spaces.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { contactTime, hopPose, moveDuration, rollPose, settleCurve } from '../../src/core/hop.ts';
import { RULES } from '../../src/core/rules.ts';

const H = RULES.hop;
const near = (a: number, b: number, eps = 0.005) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);

test('walk length: wind-up + 400 per space + settle; reduced: 260 per space', () => {
  for (const n of [1, 2, 6, 12]) {
    assert.equal(moveDuration(n, false), 120 + 400 * n + 300);
    assert.equal(moveDuration(n, true), 260 * n);
  }
});

test('extrema: wind-up 0.76, launch stretch 1.16, apex 1.00 at 0.85 high, fall 1.06, contact 0.80', () => {
  near(hopPose(H.windUpMs - 0.001, 3, false).sy, H.windUpCrouch);
  const launch = hopPose(H.windUpMs + H.launchMs, 3, false);
  near(launch.sy, H.stretchLaunch);
  const apex = hopPose(H.windUpMs + H.airMs / 2, 3, false);
  near(apex.sy, 1);
  near(apex.lift, H.height);
  near(apex.lean, H.leanDeg);
  near(hopPose(H.windUpMs + H.airMs - 0.01, 3, false).sy, H.stretchFall);
  near(hopPose(H.windUpMs + H.airMs + 40, 3, false).sy, H.contact);
  // second hop launches from the crouch
  near(hopPose(H.windUpMs + H.stepMs, 3, false).sy, H.crouch);
});

test('the last landing settles 0.80, 1.07, 0.98, 1.00', () => {
  near(settleCurve(0), 0.8);
  near(settleCurve(100), 1.066);
  near(settleCurve(200), 0.978);
  near(settleCurve(300), 1.007);
  const last = contactTime(2, false);
  near(hopPose(last + 40, 3, false).sy, settleCurve(40), 1e-9);
});

test('volume kept: sy * sxz^2 = 1 at every millisecond; u never goes back; whole spaces on the ground', () => {
  for (const n of [1, 4, 6]) {
    let lastU = 0;
    for (let ms = 0; ms <= moveDuration(n, false) + 50; ms += 1) {
      const p = hopPose(ms, n, false);
      near(p.sy * p.sxz * p.sxz, 1, 1e-9);
      assert.ok(p.u >= lastU - 1e-12);
      lastU = p.u;
      if (!p.airborne) assert.equal(p.u, Math.round(p.u));
      if (!p.airborne) assert.equal(p.lift, 0);
      assert.ok(p.sy >= 0.75 && p.sy <= 1.17);
    }
    assert.equal(hopPose(moveDuration(n, false), n, false).u, n);
  }
});

test('landing k touches down at wind-up + k x 400 + 280 and stands on space k+1', () => {
  for (let k = 0; k < 5; k++) {
    const t = contactTime(k, false);
    assert.equal(t, 120 + k * 400 + 280);
    const p = hopPose(t + 1, 5, false);
    assert.equal(p.u, k + 1);
    assert.equal(p.landed, k + 1);
  }
});

test('reduced motion: no hop, no squash, no lean', () => {
  for (let ms = 0; ms <= moveDuration(6, true); ms += 5) {
    const p = hopPose(ms, 6, true);
    assert.equal(p.lift, 0);
    assert.equal(p.sy, 1);
    assert.equal(p.sxz, 1);
    assert.equal(p.lean, 0);
  }
  for (let ms = 0; ms < 1200; ms += 10) assert.deepEqual(rollPose(ms, true), { lift: 0, sy: 1, sxz: 1 });
});
