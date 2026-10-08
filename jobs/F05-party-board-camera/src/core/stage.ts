// The board's whole show as one deterministic machine: the demo's turn loop (intro, turn, die, roll, walk, the space
// acting, the round overview), host-driven moves (PartyBoard.hop), the director and the rig. Time only moves when
// `update(dt)` is called, so a test can step it frame by frame. No three.js here: the view reads this state.
import {
  SPACE_COUNT,
  TILE_RADIUS,
  buildSpaces,
  groundHeight,
  pathPoint,
  tileRim,
  wrapSpace,
} from './board.ts';
import type { Space, SpaceKind } from './board.ts';
import { Director, lookAheadSpaces } from './director.ts';
import type { CameraWorld, Intent, ShotKind } from './director.ts';
import { lensFor } from './fit.ts';
import type { Lens } from './fit.ts';
import { cheerPose, contactTime, hopPose, moveDuration, rollPose } from './hop.ts';
import { Rig } from './rig.ts';
import { RULES } from './rules.ts';
import { nextInt, seedRng } from './rng.ts';
import type { RngState } from './rng.ts';
import type { Vec3 } from './vec.ts';
import { add, lerp3 } from './vec.ts';

export const PLAYER_NAMES = ['Pip', 'Nova', 'Moss', 'Echo'] as const;
export const PLAYER_COLORS = ['#ff5d8f', '#ffd166', '#06d6a0', '#4cc9f0'] as const;

export interface StageOptions {
  players: number;
  seed: number;
  /** The demo plays every turn by itself. */
  auto: boolean;
  /** No demo loop at all: the board waits for PartyBoard.hop/focus/overview. */
  host: boolean;
  reduced: boolean;
  aspect: number;
}

export interface TokenState {
  player: number;
  name: string;
  color: string;
  space: number;
  /** Feet on the ground (board space), without the hop's height. */
  ground: Vec3;
  lift: number;
  sy: number;
  sxz: number;
  lean: number;
  /** Facing, radians (0 faces the camera, +z). */
  yaw: number;
  spin: number;
  airborne: boolean;
  coins: number;
  stars: number;
}

export type FlowPhase = 'intro' | 'turnStart' | 'prompt' | 'roll' | 'move' | 'act' | 'turnEnd' | 'round' | 'host';

interface MoveRun {
  id: number;
  player: number;
  from: number;
  steps: number;
  route: number[];
  t0: number;
  kind: 'dice' | 'api' | 'gust';
  start: Vec3;
  end: Vec3;
  emitted: { hops: number; lands: number };
  done?: () => void;
}

interface HostMove {
  player: number;
  steps: number;
  done: (result: { player: number; from: number; to: number }) => void;
}

interface Waiter {
  at: number;
  fn: () => void;
  /** Part of the demo loop (dropped when the host takes over), or an API promise (always kept). */
  flow: boolean;
}

export type Emit = (name: string, detail: Record<string, unknown>) => void;

const SLOTS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [
    [-0.5, 0],
    [0.5, 0],
  ],
  3: [
    [-0.5, 0.26],
    [0.5, 0.26],
    [0, -0.42],
  ],
  4: [
    [-0.48, 0.34],
    [0.48, 0.34],
    [-0.48, -0.34],
    [0.48, -0.34],
  ],
};

const wrapAngle = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

export class Stage {
  readonly spaces: Space[] = buildSpaces();
  readonly tokens: TokenState[] = [];
  readonly director: Director;
  readonly rig = new Rig();
  readonly opts: StageOptions;
  lens: Lens;
  now = 0;
  phase: FlowPhase = 'intro';
  phaseAt = 0;
  active = 0;
  round = 1;
  rng: RngState;
  move: MoveRun | null = null;
  /** The die over the active token: shown from `since`, `value` after the bonk. */
  die = { shown: false, since: 0, value: 0, bonkAt: -1, hideAt: -1 };
  /** Steps left, over the walking token. */
  counter = { shown: false, value: 0, changedAt: 0 };
  lastRoll = 0;
  rollAt = -1;
  cheerAt = -1;
  shot: ShotKind = 'intro';
  private hostQueue: HostMove[] = [];
  private hostBusy = false;
  private waiters: Waiter[] = [];
  private moveSeq = 0;
  private emitFn: Emit;
  private pendingGust = 0;
  private lastMoveKind: MoveRun['kind'] = 'dice';
  private actUntil = 0;
  private overviewPhase: string | null = null;
  private world: CameraWorld;

  constructor(opts: StageOptions, emit: Emit) {
    this.opts = { ...opts, players: Math.max(1, Math.min(4, Math.round(opts.players))) };
    this.emitFn = emit;
    this.rng = seedRng(opts.seed);
    this.lens = lensFor(opts.aspect);
    this.director = new Director(opts.reduced);
    for (let p = 0; p < this.opts.players; p++) {
      this.tokens.push({
        player: p,
        name: PLAYER_NAMES[p]!,
        color: PLAYER_COLORS[p]!,
        space: 0,
        ground: [0, 0, 0],
        lift: 0,
        sy: 1,
        sxz: 1,
        lean: 0,
        yaw: 0,
        spin: 0,
        airborne: false,
        coins: 10,
        stars: 0,
      });
    }
    for (const t of this.tokens) t.ground = this.restPoint(t.player);
    this.world = this.makeWorld();
    if (opts.host) {
      this.phase = 'host';
      this.director.want({ kind: 'hold', subject: 0 }, 0, this.world, this.lens, [0, 0, 0]);
    } else this.director.want({ kind: 'intro', subject: -1 }, 0, this.world, this.lens, [0, 0, 0]);
    this.shot = this.director.intent.kind;
    this.rig.cut(this.director.goal(0, this.world, this.lens), groundHeight);
    this.director.cutPending = false;
  }

  // ---------- world queries for the director ----------
  private makeWorld(): CameraWorld {
    const heads = this.spaces.flatMap((s) => [...tileRim(s.position), add(s.position, [0, RULES.tokenHeight + 0.3, 0])]);
    return {
      feet: (p) => this.tokens[p]?.ground ?? [0, 0, 0],
      look: (p) => {
        const m = this.move;
        if (!m || m.player !== p) return this.tokens[p]?.ground ?? [0, 0, 0];
        const u = this.movePose(m).u;
        return pathPoint(m.from + u + lookAheadSpaces(m.steps - u));
      },
      tokenPoints: (p) => {
        const g = this.tokens[p]?.ground ?? [0, 0, 0];
        return [g, add(g, [0, RULES.tokenHeight, 0])];
      },
      boardPoints: () => heads,
      surface: groundHeight,
    };
  }

  get cameraWorld(): CameraWorld {
    return this.world;
  }

  /** Where token p stands at rest, sharing its space with others in fixed slots. */
  restPoint(p: number, space = this.tokens[p]?.space ?? 0, extra: number | null = null): Vec3 {
    const here = this.tokens
      .filter((t) => t.space === space && (!this.move || this.move.player !== t.player || t.player === extra))
      .map((t) => t.player);
    if (extra !== null && !here.includes(extra)) here.push(extra);
    here.sort((a, b) => a - b);
    const slots = SLOTS[Math.max(1, Math.min(4, here.length))]!;
    const k = Math.max(0, here.indexOf(p));
    const off = slots[k] ?? [0, 0];
    const c = this.spaces[space]!.position;
    return [c[0] + off[0], c[1], c[2] + off[1]];
  }

  private emit(name: string, detail: Record<string, unknown>): void {
    this.emitFn(name, detail);
  }

  private want(intent: Intent): void {
    this.director.want(intent, this.now, this.world, this.lens, this.rig.pose.target);
    this.shot = intent.kind;
    this.emit('camera', {
      kind: intent.kind,
      subject: intent.subject,
      mode: this.director.lastChange.mode,
      travel: this.director.lastChange.travel,
    });
  }

  private wait(at: number, fn: () => void, flow = true): void {
    this.waiters.push({ at, fn, flow });
  }

  private setPhase(p: FlowPhase): void {
    this.phase = p;
    this.phaseAt = this.now;
  }

  // ---------- the demo turn loop ----------
  private startTurn(p: number): void {
    this.active = p;
    this.setPhase('turnStart');
    this.die = { shown: false, since: 0, value: 0, bonkAt: -1, hideAt: -1 };
    this.counter.shown = false;
    this.want({ kind: 'dice', subject: p });
    this.emit('turn', { player: p, name: this.tokens[p]!.name, round: this.round });
  }

  /** Roll the die for the player whose turn it is (the prompt must be up). */
  roll(): boolean {
    if (this.phase !== 'prompt') return false;
    const [value, next] = nextInt(this.rng, 1, 6);
    this.rng = next;
    this.lastRoll = value;
    this.rollAt = this.now;
    this.die.value = value;
    this.die.bonkAt = this.now + RULES.turn.bonkMs / 1000;
    this.setPhase('roll');
    this.wait(this.die.bonkAt, () => {
      this.counter = { shown: true, value, changedAt: this.now };
      this.emit('roll', { player: this.active, value });
    });
    this.wait(this.now + RULES.turn.moveAfterRollMs / 1000, () => {
      this.die.hideAt = this.now;
      this.beginMove(this.active, value, 'dice');
    });
    return true;
  }

  private beginMove(player: number, steps: number, kind: MoveRun['kind'], done?: () => void): void {
    const t = this.tokens[player]!;
    const from = t.space;
    const route = Array.from({ length: steps + 1 }, (_, i) => wrapSpace(from + i));
    const to = route[route.length - 1]!;
    const run: MoveRun = {
      id: ++this.moveSeq,
      player,
      from,
      steps,
      route,
      t0: this.now,
      kind,
      start: [...t.ground] as Vec3,
      end: [0, 0, 0],
      emitted: { hops: 0, lands: 0 },
      ...(done ? { done } : {}),
    };
    this.move = run;
    run.end = this.restPoint(player, to, player);
    if (this.phase !== 'host') this.setPhase('move');
    this.lastMoveKind = kind;
    this.counter = { shown: true, value: steps, changedAt: this.now };
    if (this.opts.reduced) {
      const pts = route.flatMap((i) => tileRim(this.spaces[i]!.position));
      pts.push(add(run.end, [0, RULES.tokenHeight, 0]), add(run.start, [0, RULES.tokenHeight, 0]));
      this.want({ kind: 'frame', subject: player, points: pts });
    } else this.want({ kind: 'follow', subject: player });
  }

  private movePose(m: MoveRun) {
    return hopPose((this.now - m.t0) * 1000, m.steps, this.opts.reduced);
  }

  private finishMove(m: MoveRun): void {
    const t = this.tokens[m.player]!;
    t.space = m.route[m.route.length - 1]!;
    t.ground = [...m.end] as Vec3;
    t.lift = 0;
    t.sy = 1;
    t.sxz = 1;
    t.lean = 0;
    t.airborne = false;
    this.move = null;
    this.counter.shown = false;
    const space = this.spaces[t.space]!;
    this.emit('arrive', { player: m.player, space: t.space, kind: space.kind, from: m.from, steps: m.steps });
    m.done?.();
    if (m.kind === 'api' || this.phase === 'host') return;
    this.act(m.player, space.kind);
  }

  private nearestOther(p: number): number {
    const me = this.tokens[p]!;
    let best = -1;
    let bestD = 2;
    for (const t of this.tokens) {
      if (t.player === p) continue;
      const d = Math.min(wrapSpace(t.space - me.space), wrapSpace(me.space - t.space));
      if (d <= 1 && d < bestD) {
        bestD = d;
        best = t.player;
      }
    }
    return best;
  }

  private act(p: number, kind: SpaceKind): void {
    this.setPhase('act');
    const t = this.tokens[p]!;
    const before = { coins: t.coins, stars: t.stars };
    let hold = RULES.turn.actMs / 1000;
    if (kind === 'gain') t.coins += 3;
    if (kind === 'lose') t.coins = Math.max(0, t.coins - 3);
    if (kind === 'star') {
      t.stars += 1;
      this.cheerAt = this.now;
      if (!this.opts.reduced) {
        this.want({ kind: 'celebrate', subject: p });
        hold = Math.max(hold, RULES.celebrate.holdSec);
      }
    }
    if (kind === 'event' && this.lastMoveKind !== 'gust') this.pendingGust = 2;
    const other = this.nearestOther(p);
    if (other >= 0 && kind !== 'star') {
      this.want({ kind: 'pair', subject: p, other });
      hold = Math.max(hold, RULES.pair.holdSec);
    }
    this.actUntil = this.now + hold;
    this.emit('effect', {
      player: p,
      kind,
      coins: t.coins - before.coins,
      stars: t.stars - before.stars,
      total: { coins: t.coins, stars: t.stars },
      gust: this.pendingGust,
      pairWith: other,
    });
  }

  private endAct(): void {
    const p = this.active;
    if (this.pendingGust > 0) {
      const steps = this.pendingGust;
      this.pendingGust = 0;
      if (this.shot !== 'hold' && !this.opts.reduced) this.want({ kind: 'hold', subject: p });
      this.beginMove(p, steps, 'gust');
      return;
    }
    if (this.shot !== 'hold' && !this.opts.reduced) this.want({ kind: 'hold', subject: p });
    this.setPhase('turnEnd');
  }

  private nextTurn(): void {
    const next = (this.active + 1) % this.tokens.length;
    if (next === 0) {
      this.round += 1;
      if (this.opts.auto) {
        this.setPhase('round');
        this.startOverviewInternal(RULES.overview.holdSec);
        return;
      }
    }
    this.startTurn(next);
  }

  private startOverviewInternal(hold: number): void {
    this.director.startOverview(this.now, hold);
    this.overviewPhase = null;
  }

  // ---------- host API ----------
  /** Move `player` forward `steps` spaces (queued behind any move in flight). Stops the demo loop. */
  hop(player: number, steps: number, done: (r: { player: number; from: number; to: number }) => void): void {
    const p = Math.max(0, Math.min(this.tokens.length - 1, Math.round(player)));
    const n = Math.max(0, Math.min(SPACE_COUNT, Math.round(steps)));
    if (this.phase !== 'host') {
      this.waiters = this.waiters.filter((w) => !w.flow);
      this.die = { shown: false, since: 0, value: 0, bonkAt: -1, hideAt: -1 };
      this.pendingGust = 0;
      if (!this.move) this.counter.shown = false;
      this.phase = 'host';
      this.phaseAt = this.now;
    }
    this.hostQueue.push({ player: p, steps: n, done });
  }

  private pumpHost(): void {
    if (this.hostBusy || this.move || this.hostQueue.length === 0) return;
    const job = this.hostQueue.shift()!;
    const from = this.tokens[job.player]!.space;
    if (job.steps === 0) {
      job.done({ player: job.player, from, to: from });
      return;
    }
    this.hostBusy = true;
    this.active = job.player;
    const go = (): void => {
      this.beginMove(job.player, job.steps, 'api', () => {
        // resolved once the token has settled on its space
        this.hostBusy = false;
        job.done({ player: job.player, from, to: this.tokens[job.player]!.space });
      });
    };
    if (this.director.intent.subject !== job.player) {
      this.want({ kind: 'hold', subject: job.player });
      this.emit('focus', { player: job.player });
      this.wait(Math.max(this.now, this.director.readyAt), go, false);
    } else go();
  }

  /** Glide to `player` (a hold shot); `done` once the camera has covered 95 %. */
  focus(player: number, done: () => void): void {
    const p = Math.max(0, Math.min(this.tokens.length - 1, Math.round(player)));
    this.want({ kind: 'hold', subject: p });
    this.emit('focus', { player: p });
    this.wait(Math.max(this.now, this.director.lastChange.settledAt), done, false);
  }

  /** Fly out to the whole board, hold, fly back; `done` when back. */
  overview(hold: number, done: () => void): void {
    this.startOverviewInternal(hold);
    const back = this.opts.reduced ? 0 : RULES.overview.settleBack;
    if (Number.isFinite(hold)) this.wait(this.now + RULES.overview.settleOut + hold + back, done, false);
    else this.overviewDone = done;
  }

  private overviewDone: (() => void) | null = null;

  endOverview(): void {
    this.director.endOverview(this.now);
    const done = this.overviewDone;
    this.overviewDone = null;
    if (done) this.wait(this.now + (this.opts.reduced ? 0 : RULES.overview.settleBack), done, false);
  }

  setAspect(aspect: number): void {
    this.lens = lensFor(aspect);
  }

  setReduced(reduced: boolean): void {
    this.opts.reduced = reduced;
    this.director.reduced = reduced;
    this.director.cutPending = true;
  }

  /** The tab came back after being hidden (R14): cut to the current goal. */
  resync(): void {
    this.director.cutPending = true;
  }

  // ---------- the frame ----------
  /** Advance `dt` seconds, splitting the step at every landing and take-off so events see exact poses. */
  update(dt: number): void {
    let left = Math.max(0, Math.min(dt, RULES.spring.maxDt));
    for (let guard = 0; guard < 64 && left > 1e-9; guard++) {
      const next = this.nextEventIn();
      const step = next !== null && next > 1e-9 && next < left ? next : left;
      this.advance(step);
      left -= step;
    }
  }

  private nextEventIn(): number | null {
    const m = this.move;
    let best: number | null = null;
    const consider = (t: number): void => {
      const d = t - this.now;
      if (d > 1e-9 && (best === null || d < best)) best = d;
    };
    if (m) {
      const reduced = this.opts.reduced;
      if (m.emitted.lands < m.steps) consider(m.t0 + contactTime(m.emitted.lands, reduced) / 1000);
      if (!reduced && m.emitted.hops < m.steps)
        consider(m.t0 + (RULES.hop.windUpMs + m.emitted.hops * RULES.hop.stepMs) / 1000);
      consider(m.t0 + moveDuration(m.steps, reduced) / 1000);
    }
    for (const w of this.waiters) consider(w.at);
    return best;
  }

  private advance(dt: number): void {
    this.now += dt;
    this.runFlow();
    this.runWaiters();
    this.runMove();
    this.pumpHost();
    this.runTokens(dt);
    this.runOverviewEvents();
    const goal = this.director.goal(this.now, this.world, this.lens);
    if (this.director.cutPending) {
      this.rig.cut(goal, groundHeight);
      this.director.cutPending = false;
    } else this.rig.step(goal, dt, groundHeight);
  }

  private runWaiters(): void {
    for (let guard = 0; guard < 16; guard++) {
      const due = this.waiters.filter((w) => w.at <= this.now + 1e-9);
      if (due.length === 0) return;
      this.waiters = this.waiters.filter((w) => w.at > this.now + 1e-9);
      due.sort((a, b) => a.at - b.at);
      for (const w of due) w.fn();
    }
  }

  private runFlow(): void {
    const since = this.now - this.phaseAt;
    const T = RULES.turn;
    switch (this.phase) {
      case 'intro':
        if (since >= RULES.intro.settle + RULES.intro.holdSec) this.startTurn(0);
        break;
      case 'turnStart':
        if (since >= T.dieInAtMs / 1000 && this.now >= this.director.readyAt) {
          this.setPhase('prompt');
          this.die = { shown: true, since: this.now, value: 0, bonkAt: -1, hideAt: -1 };
          this.emit('prompt', { player: this.active, auto: this.opts.auto });
        }
        break;
      case 'prompt':
        if (this.opts.auto && since >= T.autoRollMs / 1000) this.roll();
        break;
      case 'act':
        if (this.now >= this.actUntil) this.endAct();
        break;
      case 'turnEnd':
        if (since >= T.nextTurnMs / 1000) this.nextTurn();
        break;
      case 'round': {
        const ph = this.director.overviewPhase(this.now);
        if (ph === 'back' || ph === 'done' || ph === null) this.startTurn(0);
        break;
      }
      default:
        break;
    }
  }

  private runOverviewEvents(): void {
    const ph = this.director.overviewPhase(this.now);
    if (ph !== this.overviewPhase) {
      if (ph) this.emit('overview', { phase: ph });
      this.overviewPhase = ph;
      if (ph === 'done') {
        this.director.overview = null;
        this.overviewPhase = null;
      }
    }
  }

  private runMove(): void {
    const m = this.move;
    if (!m) return;
    const ms = (this.now - m.t0) * 1000;
    const reduced = this.opts.reduced;
    const pose = hopPose(ms, m.steps, reduced);
    const t = this.tokens[m.player]!;
    const k = Math.min(m.steps - 1, Math.floor(pose.u));
    const f = pose.u - k;
    const a = k === 0 ? m.start : this.spaces[m.route[k]!]!.position;
    const b = k + 1 === m.steps ? m.end : this.spaces[m.route[k + 1]!]!.position;
    t.ground = pose.u >= m.steps ? ([...m.end] as Vec3) : lerp3(a, b, f);
    t.lift = pose.lift;
    t.sy = pose.sy;
    t.sxz = pose.sxz;
    t.lean = pose.lean;
    t.airborne = pose.airborne;
    t.space = m.route[Math.min(m.steps, pose.landed)]!;
    // take-offs
    while (!reduced && m.emitted.hops < m.steps && ms + 1e-6 >= RULES.hop.windUpMs + m.emitted.hops * RULES.hop.stepMs) {
      const i = m.emitted.hops;
      m.emitted.hops += 1;
      this.emit('hop', { player: m.player, from: m.route[i], to: m.route[i + 1], step: i + 1, of: m.steps });
    }
    // landings
    while (m.emitted.lands < m.steps && ms + 1e-6 >= contactTime(m.emitted.lands, reduced)) {
      const i = m.emitted.lands;
      m.emitted.lands += 1;
      const space = m.route[i + 1]!;
      const final = i + 1 === m.steps;
      if (final) t.ground = [...m.end] as Vec3;
      else t.ground = [...this.spaces[space]!.position] as Vec3;
      t.space = space;
      this.counter = { shown: !final, value: m.steps - (i + 1), changedAt: this.now };
      this.emit('land', { player: m.player, space, step: i + 1, of: m.steps, final, ground: [...t.ground] });
      if (final && !reduced) this.want({ kind: 'hold', subject: m.player });
    }
    if (pose.done) this.finishMove(m);
  }

  private runTokens(dt: number): void {
    const reduced = this.opts.reduced;
    const glide = reduced ? 1 : 1 - Math.exp(-12 * dt);
    const turn = reduced ? 1 : 1 - Math.exp(-14 * dt);
    for (const t of this.tokens) {
      const moving = this.move?.player === t.player;
      let face = 0;
      if (moving) {
        const m = this.move!;
        const k = Math.min(m.steps - 1, Math.floor(this.movePose(m).u));
        const a = this.spaces[m.route[k]!]!.position;
        const b = this.spaces[m.route[k + 1]!]!.position;
        face = Math.atan2(b[0] - a[0], b[2] - a[2]);
        if (this.movePose(m).landed >= m.steps) face = 0;
      } else {
        const rest = this.restPoint(t.player);
        t.ground = lerp3(t.ground, rest, glide);
        t.lift = 0;
        t.sy = 1;
        t.sxz = 1;
        t.lean = 0;
        t.airborne = false;
        if (t.player === this.active && this.rollAt >= 0 && this.phase === 'roll') {
          const r = rollPose((this.now - this.rollAt) * 1000, reduced);
          t.lift = r.lift;
          t.sy = r.sy;
          t.sxz = r.sxz;
        }
        if (t.player === this.active && this.cheerAt >= 0) {
          const c = cheerPose((this.now - this.cheerAt) * 1000, reduced);
          t.lift = Math.max(t.lift, c.lift);
          t.spin = c.spin;
          if (c.sy !== 1) {
            t.sy = c.sy;
            t.sxz = c.sxz;
          }
        } else t.spin = 0;
      }
      t.yaw = wrapAngle(t.yaw + wrapAngle(face - t.yaw) * turn);
    }
  }

  // ---------- read-outs for the view, HUD and tests ----------
  get overviewActive(): boolean {
    const ph = this.director.overviewPhase(this.now);
    return ph === 'out' || ph === 'hold';
  }

  /** Steps left to the next star space from token p. */
  stepsToStar(p: number): number {
    const at = this.tokens[p]?.space ?? 0;
    for (let d = 1; d <= SPACE_COUNT; d++) if (this.spaces[wrapSpace(at + d)]!.kind === 'star') return d;
    return 0;
  }

  /** The die's centre (board space). */
  diePoint(): Vec3 {
    const g = this.tokens[this.active]?.ground ?? [0, 0, 0];
    return [g[0], g[1] + 2.75, g[2]];
  }

  get tileRadius(): number {
    return TILE_RADIUS;
  }
}
