// The rig's spring: PartyBox smooth.ts maths, its CAMERA.md table, at any frame rate.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spring, springProgress, stepSpring } from '../../src/core/spring.ts';

const run = (settle: number, fps: number, seconds: number) => {
  const s = spring(0);
  const out: number[] = [];
  for (let k = 0; k < Math.round(seconds * fps); k++) {
    stepSpring(s, 1, settle, 1 / fps);
    out.push(s.value);
  }
  return out;
};

test('95 % of a step at t = settle; the same curve at 60, 30 and 24 fps (exact for a fixed goal)', () => {
  for (const settle of [0.5, 0.7, 1.1]) {
    assert.ok(Math.abs(springProgress(settle, settle) - 0.95) < 0.001);
    for (const fps of [60, 30, 24]) {
      const v = run(settle, fps, 2);
      v.forEach((x, k) => assert.ok(Math.abs(x - springProgress((k + 1) / fps, settle)) < 1e-9));
    }
  }
});

test('never overshoots a fixed goal from rest and starts at zero speed', () => {
  const v = run(0.6, 60, 3);
  for (let i = 1; i < v.length; i++) {
    assert.ok(v[i]! <= 1 + 1e-12);
    assert.ok(v[i]! >= v[i - 1]! - 1e-12);
  }
  assert.ok(v[0]! < 0.02, 'first frame moves less than 2 %');
});

test('settle 0 cuts; a long frame counts as 0.1 s', () => {
  const s = spring(3);
  stepSpring(s, 7, 0, 1 / 60);
  assert.equal(s.value, 7);
  const a = spring(0);
  stepSpring(a, 1, 0.5, 5);
  const b = spring(0);
  stepSpring(b, 1, 0.5, 0.1);
  assert.equal(a.value, b.value);
});

test('velocity carries across a goal change (no snap)', () => {
  const s = spring(0);
  for (let k = 0; k < 20; k++) stepSpring(s, 10, 0.7, 1 / 60);
  const v0 = s.velocity;
  const x0 = s.value;
  stepSpring(s, -10, 0.7, 1 / 60);
  assert.ok(s.value > x0, 'still moving forward the frame the goal flips');
  assert.ok(Math.abs(s.velocity) < Math.abs(v0) + 1e-9);
});
