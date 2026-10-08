// Seeded randomness: PartyBox's counter-based generator (packages/shared/src/rng.ts, ADR-019), the same mix,
// so a port keeps the same dice for the same seed. Pure: state is { seed, step }.

export interface RngState {
  seed: number;
  step: number;
}

const TWO_POW_32 = 4294967296;

function mix(seed: number, step: number): number {
  let h = (seed ^ Math.imul(step + 0x632be5ab, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39) >>> 0;
  return (h ^ (h >>> 15)) >>> 0;
}

export function seedRng(seed: number): RngState {
  return { seed: seed >>> 0, step: 0 };
}

/** Uniform float in [0, 1). */
export function nextFloat(rng: RngState): [number, RngState] {
  return [mix(rng.seed, rng.step) / TWO_POW_32, { seed: rng.seed, step: rng.step + 1 }];
}

/** Uniform integer in [min, max] (inclusive). */
export function nextInt(rng: RngState, min: number, max: number): [number, RngState] {
  const [f, next] = nextFloat(rng);
  const span = Math.max(0, Math.floor(max) - Math.ceil(min) + 1);
  return [Math.ceil(min) + Math.floor(f * span), next];
}

/** A mutable stream over the pure generator, for scenery placement (never stored in game state). */
export class Stream {
  private state: RngState;
  constructor(seed: number) {
    this.state = seedRng(seed);
  }
  float(): number {
    const [v, next] = nextFloat(this.state);
    this.state = next;
    return v;
  }
  range(min: number, max: number): number {
    return min + (max - min) * this.float();
  }
  int(min: number, max: number): number {
    const [v, next] = nextInt(this.state, min, max);
    this.state = next;
    return v;
  }
}
