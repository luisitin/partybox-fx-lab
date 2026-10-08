// The camera rig: PartyBox Table3d `rig` semantics. Three critically damped springs (position, target, focus)
// chase the director's goal; `settle = 0` cuts. After the springs, R13 lifts the camera clear of island and sea.
import type { RigGoal } from './director.ts';
import { safePosition } from './director.ts';
import { readSpring3, spring3, stepSpring3 } from './spring.ts';
import type { Spring3 } from './spring.ts';
import type { Vec3 } from './vec.ts';

export interface RigPose {
  position: Vec3;
  target: Vec3;
  focus: Vec3;
}

export class Rig {
  private springs: { position: Spring3; target: Spring3; focus: Spring3 } | null = null;
  /** The pose after the safety lift: what the camera shows. */
  pose: RigPose = { position: [0, 30, 30], target: [0, 0, 0], focus: [0, 0, 0] };
  /** How far the safety lift moved the camera this frame (0 when the goal was already safe). */
  lifted = 0;

  cut(goal: RigGoal, surface: (x: number, z: number) => number): void {
    this.springs = { position: spring3(goal.position), target: spring3(goal.target), focus: spring3(goal.focus) };
    this.read(surface);
  }

  step(goal: RigGoal, dt: number, surface: (x: number, z: number) => number): void {
    if (!this.springs) {
      this.cut(goal, surface);
      return;
    }
    stepSpring3(this.springs.position, goal.position, goal.settle, dt);
    stepSpring3(this.springs.target, goal.target, goal.settle, dt);
    stepSpring3(this.springs.focus, goal.focus, goal.settle, dt);
    this.read(surface);
  }

  get velocity(): number {
    if (!this.springs) return 0;
    const p = this.springs.position;
    return Math.hypot(p[0].velocity, p[1].velocity, p[2].velocity);
  }

  private read(surface: (x: number, z: number) => number): void {
    const s = this.springs!;
    const raw = readSpring3(s.position);
    const safe = safePosition(raw, surface);
    this.lifted = safe[1] - raw[1];
    this.pose = { position: safe, target: readSpring3(s.target), focus: readSpring3(s.focus) };
  }
}
