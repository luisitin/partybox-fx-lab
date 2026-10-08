// The director turns what the game is doing (an intent: whose turn, which shot) into the camera rig's goal,
// following CAMERA.md. It is pure apart from its own small state, and time is always passed in (seconds).
// The goal has PartyBox CameraRig semantics: { position, target, focus, settle }.
import { WATER_Y } from './board.ts';
import { fitPoints, viewBasis } from './fit.ts';
import type { Lens } from './fit.ts';
import { RULES } from './rules.ts';
import type { CloseShotRule, Margins } from './rules.ts';
import type { Vec3 } from './vec.ts';
import { add, clamp, groundDistance, lerp3, scale, sub } from './vec.ts';

export interface RigGoal {
  position: Vec3;
  target: Vec3;
  focus: Vec3;
  settle: number;
}

export type ShotKind =
  | 'intro'
  | 'dice'
  | 'follow'
  | 'hold'
  | 'celebrate'
  | 'pair'
  | 'choice'
  | 'frame'
  | 'overview'
  | 'crane';

export interface Intent {
  kind: Exclude<ShotKind, 'overview' | 'crane'>;
  /** The player the shot is about (0-based); -1 for none. */
  subject: number;
  /** pair: the second player. */
  other?: number;
  /** choice / frame: the points to keep in view. */
  points?: Vec3[];
}

/** What the director needs to know about the board this frame (board space). */
export interface CameraWorld {
  /** A token's ground point: where it stands or the ground under it mid-hop (never its hop height). */
  feet(player: number): Vec3;
  /** The follow shot's ground point: the path point the look-ahead (R5) reaches. */
  look(player: number): Vec3;
  /** A token's feet and head. */
  tokenPoints(player: number): Vec3[];
  /** Every tile's rim and every token: what the overview must show. */
  boardPoints(): Vec3[];
  /** Height of the island's surface at (x, z), -Infinity off the island. */
  surface(x: number, z: number): number;
}

const INTRO = RULES.intro;
const REDUCED_MOVE = RULES.reducedMove;

/** Where a camera at this heading/pitch stands to look at `aim` from `distance`. */
export function orbit(aim: Vec3, pitchDeg: number, distance: number): Vec3 {
  return sub(aim, scale(viewBasis(RULES.yawDeg, pitchDeg).forward, distance));
}

export function closeShot(feet: Vec3, rule: CloseShotRule, focus = feet): RigGoal {
  const target: Vec3 = [feet[0], feet[1] + rule.aimUp, feet[2]];
  return { position: orbit(target, rule.pitchDeg, rule.distance), target, focus, settle: rule.settle };
}

/** R5: how far ahead along the path the follow shot looks, in spaces. */
export const lookAheadSpaces = (stepsLeft: number): number =>
  RULES.follow.lookAheadPerStep * clamp(stepsLeft, 0, RULES.follow.lookAheadMaxSteps);

export function followShot(look: Vec3, feet: Vec3): RigGoal {
  const f = RULES.follow;
  const target: Vec3 = [look[0], look[1] + f.aimUp, look[2]];
  return { position: orbit(target, f.pitchDeg, f.distance), target, focus: feet, settle: f.settle };
}

export function fitShot(
  points: readonly Vec3[],
  pitchDeg: number,
  margins: Margins,
  lens: Lens,
  minDistance: number,
  settle: number,
  focus?: Vec3,
): RigGoal {
  const fit = fitPoints(points, RULES.yawDeg, pitchDeg, margins, lens, minDistance);
  return { position: fit.eye, target: fit.aim, focus: focus ?? fit.aim, settle };
}

export const overviewShot = (world: CameraWorld, lens: Lens, settle: number = RULES.overview.settleOut): RigGoal =>
  fitShot(world.boardPoints(), RULES.overview.pitchDeg, RULES.overview.margins, lens, 0, settle);

/** R8: the follow frame's ground width at its aim, W. */
export const followWidth = (lens: Lens): number => 2 * RULES.follow.distance * Math.tan(lens.hFov / 2);

/** How the camera got to the current shot: a cut, a turn change (R8/R9), or a new shot on the same subject. */
export type ChangeMode = 'cut' | 'nudge' | 'pan' | 'crane' | 'shot' | 'return';

/** R8: how a change of subject travels, from the camera's current target to the new aim. */
export function changeMode(from: Vec3, to: Vec3, lens: Lens): { mode: ChangeMode; travel: number; settle: number } {
  const travel = groundDistance(from, to);
  const w = followWidth(lens);
  const t = RULES.turnChange;
  if (travel < t.nudgeBelow * w) return { mode: 'nudge', travel, settle: t.nudgeSettle };
  if (travel <= t.craneAbove * w) return { mode: 'pan', travel, settle: t.panSettle };
  return { mode: 'crane', travel, settle: RULES.crane.finalSettle };
}

/** R9: the crane's high middle pose between two aims. */
export function craneShot(from: Vec3, to: Vec3, lens: Lens): RigGoal {
  const c = RULES.crane;
  const ratio = groundDistance(from, to) / followWidth(lens);
  const distance = RULES.dice.distance * clamp(ratio, c.distanceScale[0], c.distanceScale[1]);
  const target = lerp3(from, to, 0.5);
  return { position: orbit(target, c.pitchDeg, distance), target, focus: to, settle: c.settle };
}

/** R13: lift a camera position clear of the island's surface and of the sea. */
export function safePosition(p: Vec3, surface: (x: number, z: number) => number): Vec3 {
  const floor = Math.max(surface(p[0], p[2]) + RULES.safety.islandClearance, WATER_Y + RULES.safety.waterClearance);
  return p[1] < floor ? [p[0], floor, p[2]] : p;
}

interface Phase {
  /** Seconds the phase starts and stops applying. */
  from: number;
  until: number;
  settle: number;
  /** A fixed goal (the crane's middle pose); otherwise the intent's live goal. */
  goal?: RigGoal;
  kind?: ShotKind;
}

export interface OverviewState {
  since: number;
  hold: number;
  /** When the camera starts back (set by `endOverview` for an open-ended hold). */
  backAt: number;
}

/** The intent's goal at its own settle (no transition applied). */
export function intentGoal(intent: Intent, world: CameraWorld, lens: Lens): RigGoal {
  const s = intent.subject;
  switch (intent.kind) {
    case 'dice':
      return closeShot(world.feet(s), RULES.dice);
    case 'hold':
      return closeShot(world.feet(s), RULES.hold);
    case 'celebrate':
      return closeShot(world.feet(s), RULES.celebrate);
    case 'follow':
      return followShot(world.look(s), world.feet(s));
    case 'pair': {
      const pts = [...world.tokenPoints(s), ...world.tokenPoints(intent.other ?? s)];
      const p = RULES.pair;
      return fitShot(pts, p.pitchDeg, p.margins, lens, p.minDistance, p.settle, world.feet(s));
    }
    case 'choice': {
      const o = RULES.overview;
      const pts = intent.points ?? world.tokenPoints(s);
      return fitShot(pts, RULES.choice.pitchDeg, o.margins, lens, 0, RULES.choice.settle, world.feet(Math.max(0, s)));
    }
    case 'frame': {
      const m = REDUCED_MOVE.margin;
      const pts = intent.points ?? world.tokenPoints(s);
      const margins = { left: m, right: m, top: m, bottom: m };
      return fitShot(pts, REDUCED_MOVE.pitchDeg, margins, lens, REDUCED_MOVE.minDistance, 0, world.feet(Math.max(0, s)));
    }
    case 'intro': {
      const o = overviewShot(world, lens, INTRO.settle);
      const back = sub(o.position, o.target);
      return { ...o, position: add(o.target, scale(back, INTRO.distanceScale)) };
    }
  }
}

/** Own settle of a shot kind, when nothing is travelling. */
const OWN_SETTLE: Record<Intent['kind'], number> = {
  intro: INTRO.settle,
  dice: RULES.dice.settle,
  follow: RULES.follow.settle,
  hold: RULES.hold.settle,
  celebrate: RULES.celebrate.settle,
  pair: RULES.pair.settle,
  choice: RULES.choice.settle,
  frame: 0,
};

export class Director {
  reduced: boolean;
  intent: Intent = { kind: 'intro', subject: -1 };
  /** Transition phases for the current intent, in order (crane middle pose, then the arrival). */
  private phases: Phase[] = [];
  overview: OverviewState | null = null;
  /** When the current transition is far enough along for the action to start (R16). */
  readyAt = 0;
  lastChange: { mode: ChangeMode; travel: number; at: number; settle: number; settledAt: number } = {
    mode: 'cut',
    travel: 0,
    at: 0,
    settle: 0,
    settledAt: 0,
  };
  /** A cut is pending: the rig should jump to the next goal. */
  cutPending = true;

  constructor(reduced: boolean) {
    this.reduced = reduced;
  }

  /** Ask for a new shot at time `now`. `cameraTarget` is where the rig is looking now. */
  want(intent: Intent, now: number, world: CameraWorld, lens: Lens, cameraTarget: Vec3): void {
    const before = this.intent;
    this.intent = intent;
    this.phases = [];
    if (this.reduced) {
      this.cutPending = true;
      this.readyAt = now;
      this.lastChange = { mode: 'cut', travel: 0, at: now, settle: 0, settledAt: now };
      return;
    }
    const goal = intentGoal(intent, world, lens);
    const own = OWN_SETTLE[intent.kind];
    const subjectChanged = before.subject !== intent.subject && intent.subject >= 0;
    if (before.kind === 'intro' && intent.kind !== 'intro') {
      // leaving the opening overview: the overview's fly-back
      this.push(now, RULES.overview.settleBack);
      this.mark('return', groundDistance(cameraTarget, goal.target), now, RULES.overview.settleBack);
      return;
    }
    if (subjectChanged && intent.kind !== 'pair' && intent.kind !== 'choice') {
      const change = changeMode(cameraTarget, goal.target, lens);
      if (change.mode === 'crane') {
        const c = RULES.crane;
        const middle = craneShot(cameraTarget, goal.target, lens);
        this.phases.push({ from: now, until: now + c.holdSec, settle: c.settle, goal: middle, kind: 'crane' });
        this.push(now + c.holdSec, c.finalSettle);
        this.mark('crane', change.travel, now, c.finalSettle, c.holdSec);
        return;
      }
      this.push(now, change.settle);
      this.mark(change.mode, change.travel, now, change.settle);
      return;
    }
    if (before.kind === 'choice' && intent.kind === 'follow') {
      this.push(now, RULES.choice.exitSettle);
      this.mark('shot', 0, now, RULES.choice.exitSettle);
      return;
    }
    this.push(now, own);
    this.mark('shot', groundDistance(cameraTarget, goal.target), now, own);
  }

  private push(from: number, settle: number): void {
    this.phases.push({ from, until: from + settle, settle });
  }

  private mark(mode: ChangeMode, travel: number, now: number, settle: number, lead = 0): void {
    this.lastChange = { mode, travel, at: now, settle, settledAt: now + lead + settle };
    // R16: the action starts once the camera has covered 87 % of its glide (0.75 of the settle)
    this.readyAt = now + lead + RULES.actionWaits * settle;
    // an overview in flight: the action also waits for the fly-back
    const o = this.overview;
    if (o && now < o.backAt + RULES.overview.settleBack) {
      const back = Math.max(now, o.backAt);
      this.readyAt = Math.max(this.readyAt, back + RULES.actionWaits * RULES.overview.settleBack);
      this.lastChange.settledAt = Math.max(this.lastChange.settledAt, back + RULES.overview.settleBack);
    }
  }

  /** R10: fly out to the overview now; hold `hold` seconds (Infinity: until endOverview). */
  startOverview(now: number, hold: number = RULES.overview.holdSec): void {
    if (this.reduced) this.cutPending = true;
    this.overview = { since: now, hold, backAt: now + RULES.overview.settleOut + hold };
  }

  endOverview(now: number): void {
    const o = this.overview;
    if (!o) return;
    if (now < o.backAt) o.backAt = now;
    if (this.reduced) this.cutPending = true;
  }

  overviewPhase(now: number): 'out' | 'hold' | 'back' | 'done' | null {
    const o = this.overview;
    if (!o) return null;
    if (now < o.backAt) return now < o.since + RULES.overview.settleOut ? 'out' : 'hold';
    return now < o.backAt + RULES.overview.settleBack ? 'back' : 'done';
  }

  /** The rig's goal this frame. */
  goal(now: number, world: CameraWorld, lens: Lens): RigGoal & { kind: ShotKind } {
    const phase = this.overviewPhase(now);
    if (phase === 'done') this.overview = null;
    if (phase === 'out' || phase === 'hold') {
      const g = overviewShot(world, lens, RULES.overview.settleOut);
      return { ...g, settle: this.reduced ? 0 : g.settle, kind: 'overview' };
    }
    const base = intentGoal(this.intent, world, lens);
    if (phase === 'back') return { ...base, settle: this.reduced ? 0 : RULES.overview.settleBack, kind: this.intent.kind };
    let settle = OWN_SETTLE[this.intent.kind];
    for (const p of this.phases) {
      if (now >= p.from && now < p.until) {
        if (p.goal) return { ...p.goal, settle: this.reduced ? 0 : p.settle, kind: p.kind ?? 'crane' };
        settle = p.settle;
        break;
      }
    }
    return { ...base, settle: this.reduced ? 0 : settle, kind: this.intent.kind };
  }
}
