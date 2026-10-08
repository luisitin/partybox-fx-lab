// A critically damped spring: PartyBox packages/game-sdk/src/table3d/smooth.ts, the same maths and constants,
// so the camera here moves exactly as Table3d's `rig` will after the port.
import type { Vec3 } from './vec.ts';
import { RULES } from './rules.ts';

export type Spring = { value: number; velocity: number };
export type Spring3 = [Spring, Spring, Spring];

const SETTLE_95 = RULES.spring.settle95;
const MAX_DT = RULES.spring.maxDt;

export const spring = (value: number): Spring => ({ value, velocity: 0 });
export const spring3 = (p: Vec3): Spring3 => [spring(p[0]), spring(p[1]), spring(p[2])];
export const readSpring3 = (s: Spring3): Vec3 => [s[0].value, s[1].value, s[2].value];

/** Moves `s` toward `goal` by `dt` seconds (exact for a fixed goal). `settle <= 0` jumps. */
export function stepSpring(s: Spring, goal: number, settle: number, dt: number): void {
  if (settle <= 0) {
    s.value = goal;
    s.velocity = 0;
    return;
  }
  const step = Math.min(Math.max(dt, 0), MAX_DT);
  const omega = SETTLE_95 / settle;
  const decay = Math.exp(-omega * step);
  const delta = s.value - goal;
  const push = s.velocity + omega * delta;
  s.value = goal + (delta + push * step) * decay;
  s.velocity = (s.velocity - omega * push * step) * decay;
}

export function stepSpring3(s: Spring3, goal: Vec3, settle: number, dt: number): void {
  stepSpring(s[0], goal[0], settle, dt);
  stepSpring(s[1], goal[1], settle, dt);
  stepSpring(s[2], goal[2], settle, dt);
}

/** Share of a step covered from rest after `t` seconds: 1 - (1 + wt) e^(-wt). */
export function springProgress(t: number, settle: number): number {
  if (settle <= 0) return 1;
  const w = (SETTLE_95 / settle) * Math.max(0, t);
  return 1 - (1 + w) * Math.exp(-w);
}
