// Confetti as paper, integrated with a fixed step from a seed (no renderer in here).
//
// Model (from knowledge, unverified; see SOURCES.md): each piece is a thin rectangle with a normal n
// and a long axis L. Air pushes hard on the face and barely on the edge, so drag is split into a
// normal part (k_n |v_n| v_n) and an edge part (k_t |v_t| v_t): a tilted piece is pushed sideways,
// which is the glide that makes falling paper flutter. A torque turns the face across the flow
// (a falling plate settles broadside), and an autorotation spin about the long axis (strips spin
// faster the faster they fall) keeps knocking it off that balance, which is the tumble.
// A cannon's air jet carries the cloud at first: drag ramps from `jetDrag` to full over `jetTime`.
// Pieces land on the floor or on box tops, lie flat (face up or down, as they fell) and stay.
// Airborne pieces fade out over [fadeStart, fadeEnd], so nothing moves after the ending's last frame.
// The step is fixed (1/120 s): the state at time t is the same however the frames were paced.

import { createRng } from './rng.js';
import { smoothstep } from './ease.js';

export const STEP = 1 / 120;

/** @typedef {[number, number, number]} V3 */
/** @typedef {[number, number, number, number]} Q4  x, y, z, w */

/**
 * @typedef {object} Emitter
 * @property {number} at        launch time (s)
 * @property {number} [spread]  pieces leave over this many seconds after `at`
 * @property {number} count
 * @property {V3} pos           nozzle position
 * @property {V3} [jitter]      random offset half-extents around pos
 * @property {V3} dir           launch direction (normalized here)
 * @property {number} cone      half-angle of the launch cone (radians)
 * @property {[number, number]} speed
 */

/**
 * @typedef {object} Box
 * @property {V3} min
 * @property {V3} max
 */

/**
 * @typedef {object} ConfettiConfig
 * @property {number|string} seed
 * @property {Emitter[]} emitters
 * @property {number} [colors]      how many colour slots pieces pick from (the renderer maps them)
 * @property {number} [foil]        fraction of metallic foil pieces
 * @property {[number, number]} [size]   width, height of a piece (scene units)
 * @property {number} [floorY]
 * @property {Box[]} [boxes]
 * @property {number} [boundsX]     |x| past this: culled
 * @property {number} [gravity]
 * @property {number} [kN] @property {number} [kT] @property {number} [kLin]
 * @property {number} [jetDrag] @property {number} [jetTime]
 * @property {number} [fadeStart] @property {number} [fadeEnd]
 */

/**
 * @typedef {object} Piece
 * @property {number} born
 * @property {boolean} alive    launched and still simulated or resting
 * @property {boolean} landed
 * @property {boolean} culled
 * @property {number} landT
 * @property {V3} p @property {V3} v @property {V3} w
 * @property {Q4} q @property {Q4} landQ @property {Q4} flatQ
 * @property {number} spin   autorotation direction and strength
 * @property {number} color  colour slot
 * @property {boolean} foil
 * @property {number} sw @property {number} sh  size
 * @property {V3} p0 @property {V3} v0 @property {Q4} q0 @property {V3} w0  launch state
 */

/** @param {Q4} a @param {Q4} b @returns {Q4} */
export function qmul(a, b) {
  return [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ];
}

/** @param {Q4} q @param {V3} v @returns {V3} rotate v by q */
export function qrot(q, v) {
  const [x, y, z, w] = q;
  const ix = w * v[0] + y * v[2] - z * v[1];
  const iy = w * v[1] + z * v[0] - x * v[2];
  const iz = w * v[2] + x * v[1] - y * v[0];
  const iw = -x * v[0] - y * v[1] - z * v[2];
  return [
    ix * w + iw * -x + iy * -z - iz * -y,
    iy * w + iw * -y + iz * -x - ix * -z,
    iz * w + iw * -z + ix * -y - iy * -x,
  ];
}

/** @param {Q4} q @returns {Q4} */
function qnorm(q) {
  const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
}

/** @param {V3} axis unit @param {number} angle @returns {Q4} */
export function qaxis(axis, angle) {
  const s = Math.sin(angle / 2);
  return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(angle / 2)];
}

/** Spherical interpolation (shortest arc). @param {Q4} a @param {Q4} b @param {number} u @returns {Q4} */
export function qslerp(a, b, u) {
  let [bx, by, bz, bw] = b;
  let cos = a[0] * bx + a[1] * by + a[2] * bz + a[3] * bw;
  if (cos < 0) {
    cos = -cos;
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
  }
  if (cos > 0.9995) {
    return qnorm([a[0] + (bx - a[0]) * u, a[1] + (by - a[1]) * u, a[2] + (bz - a[2]) * u, a[3] + (bw - a[3]) * u]);
  }
  const th = Math.acos(cos);
  const s = Math.sin(th);
  const ka = Math.sin((1 - u) * th) / s;
  const kb = Math.sin(u * th) / s;
  return [a[0] * ka + bx * kb, a[1] * ka + by * kb, a[2] * ka + bz * kb, a[3] * ka + bw * kb];
}

/** @param {V3} a @param {V3} b */
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/** @param {V3} a @param {V3} b @returns {V3} */
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/**
 * Uniform random rotation (Shoemake).
 * @param {() => number} r @returns {Q4}
 */
function randomQuat(r) {
  const u1 = r();
  const u2 = r() * Math.PI * 2;
  const u3 = r() * Math.PI * 2;
  const a = Math.sqrt(1 - u1);
  const b = Math.sqrt(u1);
  return [a * Math.sin(u2), a * Math.cos(u2), b * Math.sin(u3), b * Math.cos(u3)];
}

/**
 * A direction inside a cone of half-angle `cone` around unit `dir`.
 * @param {V3} dir @param {number} cone @param {() => number} r @returns {V3}
 */
function inCone(dir, cone, r) {
  const th = cone * Math.sqrt(r());
  const ph = r() * Math.PI * 2;
  const helper = Math.abs(dir[1]) < 0.9 ? /** @type {V3} */ ([0, 1, 0]) : /** @type {V3} */ ([1, 0, 0]);
  const a = cross(dir, helper);
  const la = Math.hypot(...a);
  const e1 = /** @type {V3} */ ([a[0] / la, a[1] / la, a[2] / la]);
  const e2 = cross(dir, e1);
  const s = Math.sin(th);
  const c = Math.cos(th);
  return [
    dir[0] * c + (e1[0] * Math.cos(ph) + e2[0] * Math.sin(ph)) * s,
    dir[1] * c + (e1[1] * Math.cos(ph) + e2[1] * Math.sin(ph)) * s,
    dir[2] * c + (e1[2] * Math.cos(ph) + e2[2] * Math.sin(ph)) * s,
  ];
}

/**
 * @param {ConfettiConfig} cfg
 */
export function createConfetti(cfg) {
  const rng = createRng(cfg.seed).fork('confetti');
  const r = rng.next;
  const colors = cfg.colors ?? 6;
  const foilShare = cfg.foil ?? 0.15;
  const [baseW, baseH] = cfg.size ?? [0.1, 0.055];
  const floorY = cfg.floorY ?? 0;
  const boxes = cfg.boxes ?? [];
  const boundsX = cfg.boundsX ?? 40;
  const g = cfg.gravity ?? 9.8;
  const kN = cfg.kN ?? 3.0;
  const kT = cfg.kT ?? 0.15;
  const kLin = cfg.kLin ?? 0.5;
  const jetDrag = cfg.jetDrag ?? 0.12;
  const jetTime = cfg.jetTime ?? 0.55;
  const fadeStart = cfg.fadeStart ?? Infinity;
  const fadeEnd = cfg.fadeEnd ?? Infinity;

  /** @type {Piece[]} */
  const pieces = [];
  for (const em of cfg.emitters) {
    const dl = Math.hypot(...em.dir) || 1;
    /** @type {V3} */
    const dir = [em.dir[0] / dl, em.dir[1] / dl, em.dir[2] / dl];
    const j = em.jitter ?? [0, 0, 0];
    for (let i = 0; i < em.count; i++) {
      const born = em.at + (em.spread ?? 0) * r();
      const d = inCone(dir, em.cone, r);
      const speed = em.speed[0] + (em.speed[1] - em.speed[0]) * r();
      /** @type {V3} */
      const p0 = [em.pos[0] + (r() * 2 - 1) * j[0], em.pos[1] + (r() * 2 - 1) * j[1], em.pos[2] + (r() * 2 - 1) * j[2]];
      /** @type {V3} */
      const v0 = [d[0] * speed, d[1] * speed, d[2] * speed];
      const q0 = randomQuat(r);
      /** @type {V3} */
      const w0 = [(r() * 2 - 1) * 18, (r() * 2 - 1) * 18, (r() * 2 - 1) * 18];
      const sizeK = 0.75 + 0.5 * r();
      const square = r() < 0.22;
      pieces.push({
        born,
        alive: false,
        landed: false,
        culled: false,
        landT: 0,
        p: [...p0],
        v: [...v0],
        w: [...w0],
        q: [...q0],
        landQ: [0, 0, 0, 1],
        flatQ: [0, 0, 0, 1],
        spin: (r() < 0.5 ? -1 : 1) * (0.6 + 0.8 * r()),
        color: Math.floor(r() * colors) % colors,
        foil: r() < foilShare,
        sw: baseW * sizeK * (square ? 0.62 : 1),
        sh: baseH * sizeK * (square ? 1.13 : 1),
        p0,
        v0,
        q0,
        w0,
      });
    }
  }

  let simT = 0;

  /** @param {Piece} pc @param {number} t */
  function land(pc, t, y) {
    pc.landed = true;
    pc.landT = t;
    pc.p[1] = y;
    pc.v = [0, 0, 0];
    pc.w = [0, 0, 0];
    pc.landQ = [...pc.q];
    const L = qrot(pc.q, [1, 0, 0]);
    const n = qrot(pc.q, [0, 0, 1]);
    const yaw = Math.atan2(-L[2], L[0]);
    // lie flat: the plane's +z normal turned to +y (face up) or -y (face down), keeping its heading
    const flat = qmul(qaxis([0, 1, 0], yaw), qaxis([1, 0, 0], n[1] >= 0 ? -Math.PI / 2 : Math.PI / 2));
    pc.flatQ = flat;
  }

  /** @param {Piece} pc @param {number} t */
  function stepPiece(pc, t, idx) {
    const dt = STEP;
    const age = t - pc.born;
    const dragK = jetDrag + (1 - jetDrag) * smoothstep(age / jetTime);
    const n = qrot(pc.q, [0, 0, 1]);
    const L = qrot(pc.q, [1, 0, 0]);
    const v = pc.v;
    const vn = dot(v, n);
    const vt = /** @type {V3} */ ([v[0] - vn * n[0], v[1] - vn * n[1], v[2] - vn * n[2]]);
    const vtl = Math.hypot(...vt);
    const speed = Math.hypot(...v);
    const an = kN * Math.abs(vn) * vn * dragK;
    const at = kT * vtl * dragK;
    const ax = -an * n[0] - at * vt[0] - kLin * dragK * v[0];
    const ay = -g - an * n[1] - at * vt[1] - kLin * dragK * v[1];
    const az = -an * n[2] - at * vt[2] - kLin * dragK * v[2];
    const prevY = pc.p[1];
    v[0] += ax * dt;
    v[1] += ay * dt;
    v[2] += az * dt;
    pc.p[0] += v[0] * dt;
    pc.p[1] += v[1] * dt;
    pc.p[2] += v[2] * dt;

    // rotation: autorotation about the long axis, a broadside-seeking torque, angular damping
    const w = pc.w;
    const wl = dot(w, L);
    const target = pc.spin * 2.4 * speed;
    const relax = (target - wl) * 2.2 * dt * dragK;
    w[0] += L[0] * relax;
    w[1] += L[1] * relax;
    w[2] += L[2] * relax;
    if (speed > 1e-4) {
      const vh = /** @type {V3} */ ([v[0] / speed, v[1] / speed, v[2] / speed]);
      const c = cross(n, vh);
      const k = 3.2 * dot(n, vh) * speed * dragK * dt;
      w[0] += c[0] * k;
      w[1] += c[1] * k;
      w[2] += c[2] * k;
    }
    const damp = Math.exp(-0.9 * dt);
    w[0] *= damp;
    w[1] *= damp;
    w[2] *= damp;
    const dq = qmul([w[0] * 0.5 * dt, w[1] * 0.5 * dt, w[2] * 0.5 * dt, 0], pc.q);
    pc.q = qnorm([pc.q[0] + dq[0], pc.q[1] + dq[1], pc.q[2] + dq[2], pc.q[3] + dq[3]]);

    // ground and box tops
    const rest = 0.002 + (idx % 7) * 0.0007;
    for (const b of boxes) {
      const inside = pc.p[0] > b.min[0] && pc.p[0] < b.max[0] && pc.p[2] > b.min[2] && pc.p[2] < b.max[2];
      if (!inside) continue;
      if (prevY >= b.max[1] && pc.p[1] < b.max[1]) {
        land(pc, t, b.max[1] + rest);
        return;
      }
      if (pc.p[1] < b.max[1] && pc.p[1] > b.min[1]) {
        // hit a side: slide out to the nearest side face and lose horizontal speed
        const dxl = pc.p[0] - b.min[0];
        const dxr = b.max[0] - pc.p[0];
        const dzb = pc.p[2] - b.min[2];
        const dzf = b.max[2] - pc.p[2];
        const m = Math.min(dxl, dxr, dzb, dzf);
        if (m === dxl) pc.p[0] = b.min[0] - 0.001;
        else if (m === dxr) pc.p[0] = b.max[0] + 0.001;
        else if (m === dzb) pc.p[2] = b.min[2] - 0.001;
        else pc.p[2] = b.max[2] + 0.001;
        v[0] *= 0.2;
        v[2] *= 0.2;
      }
    }
    if (pc.p[1] < floorY + rest) {
      land(pc, t, floorY + rest);
      return;
    }
    if (Math.abs(pc.p[0]) > boundsX || pc.p[1] < floorY - 1) pc.culled = true;
  }

  function stepAll() {
    const t = simT + STEP;
    for (let i = 0; i < pieces.length; i++) {
      const pc = pieces[i];
      if (pc.culled || pc.landed) continue;
      if (!pc.alive) {
        if (pc.born > t) continue;
        pc.alive = true;
      }
      stepPiece(pc, t, i);
    }
    simT = t;
  }

  return {
    pieces,
    count: pieces.length,
    get time() {
      return simT;
    },
    /** Back to the launch state (same seed, same result). */
    reset() {
      simT = 0;
      for (const pc of pieces) {
        pc.alive = false;
        pc.landed = false;
        pc.culled = false;
        pc.p = [...pc.p0];
        pc.v = [...pc.v0];
        pc.q = [...pc.q0];
        pc.w = [...pc.w0];
      }
    },
    /** Integrates forward to time t (never backwards: call reset() first). @param {number} t */
    advanceTo(t) {
      if (t < simT - 1e-9) this.reset();
      while (simT + STEP <= t + 1e-9) stepAll();
    },
    /**
     * What to draw for piece i at time t: position, rotation and opacity (0 = not drawn).
     * @param {number} i @param {number} t
     * @returns {{ p: V3, q: Q4, alpha: number }}
     */
    pose(i, t) {
      const pc = pieces[i];
      if (!pc.alive || pc.culled) return { p: pc.p, q: pc.q, alpha: 0 };
      if (pc.landed) {
        const u = smoothstep((t - pc.landT) / 0.14);
        return { p: pc.p, q: u >= 1 ? pc.flatQ : qslerp(pc.landQ, pc.flatQ, u), alpha: 1 };
      }
      const fade = t >= fadeEnd ? 0 : 1 - smoothstep((t - fadeStart) / Math.max(1e-6, fadeEnd - fadeStart));
      return { p: pc.p, q: pc.q, alpha: fade };
    },
    /** True once every piece has landed, left, or faded (nothing will move again). @param {number} t */
    settled(t) {
      return pieces.every((pc) => pc.culled || pc.landed || (pc.alive && t >= fadeEnd) || (!pc.alive && t >= fadeEnd));
    },
  };
}
