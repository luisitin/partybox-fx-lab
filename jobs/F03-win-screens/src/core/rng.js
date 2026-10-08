// Seeded randomness for the win screens. Nothing here reads the clock or Math.random:
// the same seed always gives the same confetti, the same dice faces and the same doodles.

/**
 * Hashes any seed (number or string) to a 32-bit unsigned integer (FNV-1a over the text form).
 * @param {number|string} seed
 * @returns {number}
 */
export function hashSeed(seed) {
  const text = String(seed);
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * @typedef {object} Rng
 * @property {() => number} next      uniform in [0, 1)
 * @property {(a: number, b: number) => number} range  uniform in [a, b)
 * @property {(a: number, b: number) => number} int    integer in [a, b] inclusive
 * @property {<T>(list: readonly T[]) => T} pick
 * @property {() => number} sign      -1 or 1
 * @property {(label: string) => Rng} fork  an independent stream (adding draws to one stream never shifts another)
 */

/**
 * mulberry32: small, fast, good enough for visuals, identical on every JS engine.
 * @param {number|string} seed
 * @returns {Rng}
 */
export function createRng(seed) {
  const base = hashSeed(seed);
  let a = base || 0x9e3779b9;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  /** @type {Rng} */
  const rng = {
    next,
    range: (lo, hi) => lo + (hi - lo) * next(),
    int: (lo, hi) => lo + Math.floor((hi - lo + 1) * next()),
    pick: (list) => list[Math.floor(next() * list.length) % list.length],
    sign: () => (next() < 0.5 ? -1 : 1),
    fork: (label) => createRng(`${base}:${label}`),
  };
  return rng;
}
