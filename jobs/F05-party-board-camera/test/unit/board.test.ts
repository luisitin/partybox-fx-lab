// The board: exactly 40 spaces in one closed loop, level tiles, all on the island.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  LOOP_LENGTH,
  SPACE_COUNT,
  SPACING,
  TILE_RADIUS,
  TILE_TOP,
  buildSpaces,
  groundHeight,
  islandRadius,
  nextSpace,
  pathPoint,
  pathRadius,
  prevSpace,
  tileRim,
} from '../../src/core/board.ts';

const spaces = buildSpaces();
const flat = (a: number[], b: number[]): number => Math.hypot(a[0]! - b[0]!, a[2]! - b[2]!);

test('exactly 40 spaces, numbered 0..39, start on 0', () => {
  assert.equal(SPACE_COUNT, 40);
  assert.equal(spaces.length, 40);
  spaces.forEach((s, i) => assert.equal(s.index, i));
  assert.deepEqual(spaces.filter((s) => s.start).map((s) => s.index), [0]);
  assert.equal(LOOP_LENGTH, 40 * SPACING);
});

test('the spaces form one closed loop: each one\'s two nearest neighbours are i-1 and i+1', () => {
  for (const s of spaces) {
    const near = spaces
      .filter((o) => o.index !== s.index)
      .map((o) => ({ i: o.index, d: flat(o.position, s.position) }))
      .sort((a, b) => a.d - b.d);
    assert.deepEqual(
      new Set([near[0]!.i, near[1]!.i]),
      new Set([prevSpace(s.index), nextSpace(s.index)]),
      `space ${s.index}`,
    );
    // and the third nearest is clearly farther than a step
    assert.ok(near[2]!.d > 1.8 * SPACING, `space ${s.index}: third neighbour ${near[2]!.d}`);
  }
  // walking next() 40 times visits every space once and returns to the start
  const seen = new Set<number>();
  let at = 0;
  for (let k = 0; k < 40; k++) {
    seen.add(at);
    at = nextSpace(at);
  }
  assert.equal(at, 0);
  assert.equal(seen.size, 40);
});

test('consecutive spaces are one spacing apart (arc 2.4, chord within 1 %)', () => {
  for (let i = 0; i < 40; i++) {
    const d = flat(spaces[i]!.position, spaces[(i + 1) % 40]!.position);
    assert.ok(Math.abs(d - SPACING) < 0.024, `${i}->${i + 1}: ${d}`);
  }
});

test('the path never crosses itself', () => {
  const n = 400;
  const pts = Array.from({ length: n }, (_, k) => pathPoint((40 * k) / n));
  const cross = (a: number[], b: number[], c: number[], d: number[]): boolean => {
    const o = (p: number[], q: number[], r: number[]) => (q[0]! - p[0]!) * (r[2]! - p[2]!) - (q[2]! - p[2]!) * (r[0]! - p[0]!);
    return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
  };
  for (let i = 0; i < n; i++)
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      assert.ok(!cross(pts[i]!, pts[(i + 1) % n]!, pts[j]!, pts[(j + 1) % n]!), `segments ${i} and ${j}`);
    }
});

test('designed kinds: 26 gain (start included), 7 lose, 5 event, 2 star; no two losses in a row', () => {
  const count = (k: string) => spaces.filter((s) => s.kind === k).length;
  assert.deepEqual([count('gain'), count('lose'), count('event'), count('star')], [26, 7, 5, 2]);
  for (let i = 0; i < 40; i++) assert.ok(!(spaces[i]!.kind === 'lose' && spaces[(i + 1) % 40]!.kind === 'lose'));
});

test('every tile sits level on the grass and well inside the island', () => {
  for (const s of spaces) {
    for (const p of tileRim(s.position)) {
      const g = groundHeight(p[0], p[2]);
      assert.ok(Number.isFinite(g), `space ${s.index} rim on the island`);
      assert.ok(Math.abs(p[1] - TILE_TOP - g) < 0.06, `space ${s.index}: tile base ${p[1] - TILE_TOP} vs ground ${g}`);
    }
    const margin = islandRadius(s.theta) - pathRadius(s.theta);
    assert.ok(margin - TILE_RADIUS > 2.5, `space ${s.index}: ${margin}`);
  }
});
