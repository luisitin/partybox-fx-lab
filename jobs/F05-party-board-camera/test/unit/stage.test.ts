// The whole show headless: determinism, landings, camera rules held on every frame, across seeds.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { WATER_Y, buildSpaces, groundHeight, wrapSpace } from '../../src/core/board.ts';
import { project } from '../../src/core/fit.ts';
import { RULES } from '../../src/core/rules.ts';
import { Stage } from '../../src/core/stage.ts';
import type { StageOptions } from '../../src/core/stage.ts';
import { seedRng, nextInt } from '../../src/core/rng.ts';
import type { Vec3 } from '../../src/core/vec.ts';

const spaces = buildSpaces();
const opts = (o: Partial<StageOptions> = {}): StageOptions => ({ players: 4, seed: 1, auto: true, host: false, reduced: false, aspect: 16 / 9, ...o });

function run(o: Partial<StageOptions>, seconds: number, fps = 60, each?: (s: Stage, log: string[]) => void) {
  const log: string[] = [];
  const s = new Stage(opts(o), (n, d) => log.push(`${s.now.toFixed(4)} ${n} ${JSON.stringify(d)}`));
  for (let f = 0; f < seconds * fps; f++) {
    s.update(1 / fps);
    each?.(s, log);
  }
  return { s, log };
}

/** Per-frame camera invariants: R1 heading, R3 pitch range, R13 clearance, no NaN, no safety lift needed. */
function checkCamera(s: Stage): void {
  const { position: p, target: t } = s.rig.pose;
  for (const v of [...p, ...t]) assert.ok(Number.isFinite(v));
  assert.ok(Math.abs(p[0] - t[0]) < 1e-9, 'R1: the camera never turns away from north');
  const pitch = (Math.atan2(p[1] - t[1], Math.abs(p[2] - t[2])) * 180) / Math.PI;
  assert.ok(pitch >= RULES.pitchLimitsDeg[0] - 0.5 && pitch <= RULES.pitchLimitsDeg[1] + 0.5, `R3 pitch ${pitch}`);
  const g = groundHeight(p[0], p[2]);
  if (Number.isFinite(g)) assert.ok(p[1] >= g + RULES.safety.islandClearance - 1e-9, `R13 island clearance at t=${s.now}`);
  assert.ok(p[1] >= WATER_Y + RULES.safety.waterClearance);
  assert.equal(s.rig.lifted, 0, `the goal itself was unsafe at t=${s.now}`);
}

test('same seed, same show: two runs give byte-identical event logs and camera', () => {
  const a = run({ seed: 7 }, 40);
  const b = run({ seed: 7 }, 40);
  assert.deepEqual(a.log, b.log);
  assert.deepEqual(a.s.rig.pose, b.s.rig.pose);
  const c = run({ seed: 8 }, 40);
  assert.notDeepEqual(a.log.filter((l) => l.includes(' roll ')), c.log.filter((l) => l.includes(' roll ')));
});

test('R5 the walking token stays inside the lead box; R6 it arrives centred; R4 the dice shot frames feet on the third', () => {
  let followFrames = 0;
  let holdChecks = 0;
  let diceChecks = 0;
  run({ seed: 2 }, 120, 60, (s) => {
    checkCamera(s);
    const t = s.tokens[s.active]!;
    const { position, target } = s.rig.pose;
    const mid: Vec3 = [t.ground[0], t.ground[1] + 0.65, t.ground[2]];
    const since = s.now - s.director.lastChange.at;
    if (s.shot === 'follow' && s.move && !s.overviewActive && s.director.overviewPhase(s.now) === null) {
      const [x, y] = project(mid, position, target, s.lens);
      const [lo, hi] = RULES.follow.leadBox;
      assert.ok(x >= lo && x <= hi && y >= lo && y <= hi, `lead box at t=${s.now}: ${x}, ${y}`);
      followFrames++;
    }
    if (s.shot === 'hold' && !s.move && since > 1.5 * RULES.hold.settle && s.director.overviewPhase(s.now) === null) {
      const [x, y] = project(mid, position, target, s.lens);
      assert.ok(Math.abs(x - 0.5) <= RULES.hold.centreTolerance && Math.abs(y - 0.5) <= RULES.hold.centreTolerance, `hold centre ${x}, ${y}`);
      holdChecks++;
    }
    if (s.phase === 'prompt' && s.now - s.director.lastChange.settledAt > 0.5 && s.director.overviewPhase(s.now) === null) {
      const [, y] = project(t.ground, position, target, s.lens);
      assert.ok(Math.abs(y - 2 / 3) < 0.01, `dice feet ${y}`);
      diceChecks++;
    }
  });
  assert.ok(followFrames > 300 && holdChecks > 30 && diceChecks > 10, `${followFrames} ${holdChecks} ${diceChecks}`);
});

test('host hops land on exactly the right spaces, in order, with take-offs before landings', () => {
  const lands: { player: number; space: number; ground: Vec3 }[] = [];
  const s = new Stage(opts({ host: true, auto: false }), (n, d) => {
    if (n === 'land') lands.push({ player: d.player as number, space: d.space as number, ground: d.ground as Vec3 });
  });
  const plan = [
    [0, 3],
    [1, 5],
    [0, 6],
    [2, 1],
    [3, 12],
    [1, 40],
  ] as const;
  const results: { player: number; from: number; to: number }[] = [];
  for (const [p, n] of plan) s.hop(p, n, (r) => results.push(r));
  for (let f = 0; f < 60 * 60 && results.length < plan.length; f++) {
    s.update(1 / 60);
    checkCamera(s);
  }
  assert.equal(results.length, plan.length);
  const at = [0, 0, 0, 0];
  let k = 0;
  plan.forEach(([p, n], j) => {
    assert.deepEqual(results[j], { player: p, from: at[p], to: wrapSpace(at[p]! + n) });
    for (let i = 1; i <= n; i++) {
      const want = wrapSpace(at[p]! + i);
      const got = lands[k++]!;
      assert.equal(got.player, p);
      assert.equal(got.space, want);
      const c = spaces[want]!.position;
      assert.ok(Math.hypot(got.ground[0] - c[0], got.ground[2] - c[2]) <= 0.61, `landed off space ${want}`);
      assert.ok(Math.abs(got.ground[1] - c[1]) < 1e-9);
    }
    at[p] = wrapSpace(at[p]! + n);
  });
  assert.equal(k, lands.length);
  assert.deepEqual(s.tokens.map((t) => t.space), at);
});

test('R10 overview timing: out, hold after 1.1 s, back after 3.3 s, done after 4.25 s', () => {
  const marks: [string, number][] = [];
  const s = new Stage(opts({ host: true, auto: false }), (n, d) => {
    if (n === 'overview') marks.push([d.phase as string, s.now]);
  });
  let resolved = -1;
  s.overview(RULES.overview.holdSec, () => (resolved = s.now));
  for (let f = 0; f < 6 * 120; f++) s.update(1 / 120);
  const want = [
    ['out', 0],
    ['hold', 1.1],
    ['back', 3.3],
    ['done', 4.25],
  ];
  assert.deepEqual(marks.map((m) => m[0]), want.map((w) => w[0]));
  marks.forEach((m, i) => assert.ok(Math.abs(m[1] - (want[i]![1] as number)) < 1 / 120 + 1e-9, `${m[0]} at ${m[1]}`));
  assert.ok(Math.abs(resolved - 4.25) < 1 / 120 + 1e-9);
});

test('R15 reduced motion: every frame is a cut (camera on its goal), no squash, no hop height', () => {
  run({ seed: 3, reduced: true }, 60, 60, (s) => {
    checkCamera(s);
    const g = s.director.goal(s.now, s.cameraWorld, s.lens);
    const p = s.rig.pose.position;
    assert.ok(Math.hypot(p[0] - g.position[0], p[1] - g.position[1], p[2] - g.position[2]) < 1e-9, `not a cut at ${s.now}`);
    for (const t of s.tokens) {
      assert.equal(t.sy, 1);
      assert.equal(t.sxz, 1);
      assert.equal(t.lift, 0);
    }
  });
});

test('property: seeds 1, 2, 3 and 1,000 more, 1 to 4 players, every frame keeps the camera and board rules', () => {
  let r = seedRng(424242);
  const seeds = [1, 2, 3];
  for (let i = 0; i < 1000; i++) {
    const [v, n] = nextInt(r, 1, 2 ** 31 - 1);
    r = n;
    seeds.push(v);
  }
  for (const seed of seeds) {
    const players = 1 + (seed % 4);
    run({ seed, players, reduced: seed % 10 === 0 }, 24, 20, (s) => {
      checkCamera(s);
      for (const t of s.tokens) {
        assert.ok(Number.isInteger(t.space) && t.space >= 0 && t.space < 40);
        assert.ok(t.coins >= 0 && t.stars >= 0);
        assert.ok(t.sy >= 0.75 && t.sy <= 1.17);
      }
    });
  }
});
