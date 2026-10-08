// The camera rules of CAMERA.md as data. test/unit/camera-md.test.ts deep-compares this object with the
// `camera-rules` JSON block in CAMERA.md, so the document and the page cannot drift apart.

export interface Margins {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface CloseShotRule {
  pitchDeg: number;
  distance: number;
  aimUp: number;
  settle: number;
}

export const RULES = {
  spacing: 2.4,
  tokenHeight: 1.3,
  lens: { vFovDeg: 34, minHFovDeg: 30 },
  yawDeg: 0,
  pitchLimitsDeg: [35, 70] as [number, number],
  spring: { settle95: 4.74, maxDt: 0.1 },
  dice: { pitchDeg: 40, distance: 11, aimUp: 1.6, settle: 0.7 },
  follow: {
    pitchDeg: 48,
    distance: 14,
    aimUp: 0.6,
    settle: 0.5,
    lookAheadPerStep: 0.5,
    lookAheadMaxSteps: 3,
    leadBox: [0.25, 0.75] as [number, number],
  },
  hold: { pitchDeg: 46, distance: 12.5, aimUp: 0.65, settle: 0.6, centreTolerance: 0.03 },
  celebrate: { pitchDeg: 38, distance: 9, aimUp: 1, settle: 0.6, holdSec: 1.2 },
  turnChange: { nudgeBelow: 0.35, craneAbove: 1, nudgeSettle: 0.6, panSettle: 0.85 },
  crane: {
    pitchDeg: 58,
    distanceScale: [1.4, 2.4] as [number, number],
    settle: 0.7,
    holdSec: 0.4,
    finalSettle: 0.9,
  },
  overview: {
    pitchDeg: 58,
    margins: { left: 0.06, right: 0.06, top: 0.11, bottom: 0.17 } as Margins,
    settleOut: 1.1,
    holdSec: 2.2,
    settleBack: 0.95,
  },
  pair: {
    pitchDeg: 50,
    margins: { left: 0.3, right: 0.3, top: 0.28, bottom: 0.3 } as Margins,
    minDistance: 12.5,
    settle: 0.7,
    holdSec: 1.4,
  },
  choice: { pitchDeg: 62, spacesPerBranch: 3, settle: 0.7, exitSettle: 0.5 },
  intro: { distanceScale: 1.4, settle: 1.6, holdSec: 0.6 },
  reducedMove: { pitchDeg: 48, margin: 0.2, minDistance: 14 },
  actionWaits: 0.75,
  safety: { islandClearance: 2.5, waterClearance: 2 },
  hop: {
    windUpMs: 120,
    stepMs: 400,
    airMs: 280,
    launchMs: 50,
    settleMs: 300,
    height: 0.85,
    crouch: 0.8,
    windUpCrouch: 0.76,
    stretchLaunch: 1.16,
    stretchFall: 1.06,
    contact: 0.8,
    leanDeg: 7,
    reducedStepMs: 260,
  },
  turn: {
    bannerMs: 300,
    dieInAtMs: 450,
    dieInMs: 300,
    autoRollMs: 1100,
    bonkMs: 320,
    moveAfterRollMs: 1100,
    actMs: 700,
    nextTurnMs: 400,
  },
} as const;

export type Rules = typeof RULES;
export const DEG = Math.PI / 180;
