// Moment-to-moment effects, all driven by the stage clock so a manual clock replays them exactly: the die over
// the active token (tumble, bonk, reveal), the steps-left badge, landing rings, tile flashes, coins and sparkles.
// Particles take their spread from a hash of their index, never from Math.random.
import {
  AdditiveBlending,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OctahedronGeometry,
  PlaneGeometry,
  Quaternion,
  RingGeometry,
  Sprite,
  SpriteMaterial,
  Vector3,
} from 'three';
import type { Camera } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { SpaceKind } from '../core/board.ts';
import { RULES } from '../core/rules.ts';
import type { Stage } from '../core/stage.ts';
import type { Vec3 } from '../core/vec.ts';
import type { Bag } from './bag.ts';
import { hash } from './island.ts';
import { KIND_STYLE } from './palette.ts';
import { BadgeCanvas, dieFaceTexture, glowTexture } from './textures.ts';

/** Material order of a box: +x, -x, +y, -y, +z, -z. Opposite faces sum to 7. */
const FACE_VALUES = [3, 4, 2, 5, 1, 6];
const FACE_NORMALS: Vec3[] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

/** Ease out with a small overshoot (3.0 %, under the 6 % limit of STYLE.md). */
export function popEase(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  const c = 0.9;
  return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2;
}

interface Burst {
  kind: 'coin' | 'loss' | 'spark' | 'gust' | 'land';
  t0: number;
  origin: Vec3;
  count: number;
  seed: number;
  color: Color;
}

const SPARK_LIFE = 0.9;
const COIN_LIFE = 1.0;

export class Fx {
  readonly group = new Group();
  private die: Mesh;
  private dieQ = new Quaternion();
  private badge: BadgeCanvas;
  private badgeSprite: Sprite;
  private badgeShown = { value: -1, color: '', at: -1 };
  private rings: Mesh[] = [];
  private flashes: Mesh[] = [];
  private coins: InstancedMesh;
  private sparks: InstancedMesh;
  private bursts: Burst[] = [];
  private seq = 0;
  private m = new Matrix4();

  constructor(bag: Bag) {
    this.group.name = 'fx';
    const faces = [1, 2, 3, 4, 5, 6].map((v) => dieFaceTexture(bag, v));
    const mats = FACE_VALUES.map((v) => bag.add(new MeshStandardMaterial({ map: faces[v - 1]!, roughness: 0.3 })));
    this.die = new Mesh(bag.add(new RoundedBoxGeometry(0.95, 0.95, 0.95, 4, 0.16)), mats);
    this.die.castShadow = true;
    this.die.visible = false;
    this.die.name = 'die';
    this.badge = new BadgeCanvas(bag);
    this.badgeSprite = new Sprite(bag.add(new SpriteMaterial({ map: this.badge.texture, depthTest: false, transparent: true })));
    this.badgeSprite.renderOrder = 20;
    this.badgeSprite.visible = false;
    this.badgeSprite.name = 'steps-badge';
    const ringGeo = bag.add(new RingGeometry(0.82, 1.0, 48));
    const flashGeo = bag.add(new PlaneGeometry(2.6, 2.6));
    const glow = glowTexture(bag);
    for (let i = 0; i < 6; i++) {
      const r = new Mesh(
        ringGeo,
        bag.add(new MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false, side: DoubleSide, blending: AdditiveBlending })),
      );
      r.rotation.x = -Math.PI / 2;
      r.visible = false;
      r.renderOrder = 4;
      const f = new Mesh(
        flashGeo,
        bag.add(new MeshBasicMaterial({ map: glow, color: '#ffffff', transparent: true, depthWrite: false, blending: AdditiveBlending })),
      );
      f.rotation.x = -Math.PI / 2;
      f.visible = false;
      f.renderOrder = 4;
      this.rings.push(r);
      this.flashes.push(f);
      this.group.add(r, f);
    }
    const coinGeo = bag.add(new CylinderGeometry(0.17, 0.17, 0.05, 20));
    coinGeo.rotateX(Math.PI / 2);
    this.coins = new InstancedMesh(
      coinGeo,
      bag.add(new MeshStandardMaterial({ color: '#ffffff', roughness: 0.25, metalness: 0.6, emissive: new Color('#6b4300'), emissiveIntensity: 0.4 })),
      24,
    );
    this.coins.count = 0;
    this.coins.frustumCulled = false;
    this.sparks = new InstancedMesh(
      bag.add(new OctahedronGeometry(0.09, 0)),
      bag.add(new MeshBasicMaterial({ color: '#ffffff', transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false })),
      96,
    );
    this.sparks.count = 0;
    this.sparks.frustumCulled = false;
    // create the colour buffers now, so the first burst does not compile a new shader mid-show
    this.coins.setColorAt(0, new Color('#ffffff'));
    this.sparks.setColorAt(0, new Color('#ffffff'));
    this.group.add(this.die, this.badgeSprite, this.coins, this.sparks);
  }

  // ---------- triggers (from stage events) ----------
  land(space: Vec3, kind: SpaceKind, now: number, final: boolean): void {
    const i = this.seq++ % this.rings.length;
    const color = new Color(KIND_STYLE[kind].top);
    this.rings[i]!.userData = { t0: now, at: space, color, big: final };
    this.flashes[i]!.userData = { t0: now, at: space, color };
    this.bursts.push({ kind: 'land', t0: now, origin: space, count: final ? 10 : 6, seed: this.seq * 31, color: color.clone().lerp(new Color('#ffffff'), 0.5) });
  }

  effect(kind: SpaceKind, head: Vec3, now: number, gust: boolean): void {
    const seed = ++this.seq * 17;
    if (kind === 'gain') this.bursts.push({ kind: 'coin', t0: now, origin: head, count: 3, seed, color: new Color('#ffd23f') });
    if (kind === 'lose') this.bursts.push({ kind: 'loss', t0: now, origin: head, count: 3, seed, color: new Color('#ffd23f') });
    if (kind === 'star') this.bursts.push({ kind: 'spark', t0: now, origin: head, count: 36, seed, color: new Color('#ffe27a') });
    if (kind === 'event' && gust) this.bursts.push({ kind: 'gust', t0: now, origin: head, count: 18, seed, color: new Color('#c9b3ff') });
  }

  /** Frame update. `reduced`: no tumbling, no particles in flight (effects appear and fade in place). */
  update(stage: Stage, camera: Camera, reduced: boolean): void {
    const now = stage.now;
    this.updateDie(stage, camera, reduced);
    this.updateBadge(stage, reduced);
    for (let i = 0; i < this.rings.length; i++) {
      const r = this.rings[i]!;
      const f = this.flashes[i]!;
      const d = r.userData as { t0?: number; at?: Vec3; color?: Color; big?: boolean };
      if (d.t0 === undefined || !d.at || !d.color) continue;
      const age = now - d.t0;
      const life = 0.55;
      r.visible = age >= 0 && age < life;
      f.visible = age >= 0 && age < life;
      if (!r.visible) continue;
      const k = age / life;
      const s = reduced ? 1 : 0.7 + (d.big ? 0.9 : 0.6) * (1 - (1 - k) ** 3);
      r.position.set(d.at[0], d.at[1] + 0.03, d.at[2]);
      r.scale.setScalar(s);
      const rm = r.material as MeshBasicMaterial;
      rm.color.copy(d.color);
      rm.opacity = (1 - k) * 0.9;
      f.position.set(d.at[0], d.at[1] + 0.02, d.at[2]);
      const fm = f.material as MeshBasicMaterial;
      fm.color.copy(d.color);
      fm.opacity = (1 - k) ** 2 * 0.9;
    }
    this.updateBursts(now, reduced);
  }

  private updateDie(stage: Stage, camera: Camera, reduced: boolean): void {
    const d = stage.die;
    const now = stage.now;
    const hideFor = 0.22;
    const visible = d.shown && (d.hideAt < 0 || now < d.hideAt + hideFor);
    this.die.visible = visible;
    if (!visible) return;
    const p = stage.diePoint();
    const inT = (now - d.since) / (RULES.turn.dieInMs / 1000);
    let s = reduced ? 1 : popEase(inT);
    const revealed = d.bonkAt >= 0 && now >= d.bonkAt;
    let bob = reduced ? 0 : 0.08 * Math.sin(now * 3.1);
    if (revealed) {
      const k = (now - d.bonkAt) / 0.18;
      // the bonk: a quick pop up and a squash
      if (!reduced && k < 1) {
        bob += 0.35 * Math.sin(Math.PI * k);
        s *= 1 + 0.12 * Math.sin(Math.PI * k);
      }
      const toCam = new Vector3().subVectors(camera.position, new Vector3(p[0], p[1], p[2])).normalize();
      const n = FACE_NORMALS[FACE_VALUES.indexOf(d.value)]!;
      const goal = new Quaternion().setFromUnitVectors(new Vector3(...n), toCam);
      if (reduced) this.dieQ.copy(goal);
      else this.dieQ.slerp(goal, Math.min(1, k * 0.9 + 0.25));
      this.die.quaternion.copy(this.dieQ);
    } else if (!reduced) {
      // tumbling while it waits for the hit
      const t = now - d.since;
      this.die.rotation.set(t * 5.1, t * 3.7 + 0.6, t * 2.3);
      this.dieQ.copy(this.die.quaternion);
    } else {
      this.die.rotation.set(0.4, 0.6, 0);
      this.dieQ.copy(this.die.quaternion);
    }
    if (d.hideAt >= 0 && now >= d.hideAt) s *= reduced ? 0 : Math.max(0, 1 - (now - d.hideAt) / hideFor);
    this.die.scale.setScalar(Math.max(0.001, s));
    this.die.position.set(p[0], p[1] + bob, p[2]);
  }

  private updateBadge(stage: Stage, reduced: boolean): void {
    const c = stage.counter;
    const tok = stage.tokens[stage.active];
    // the die shows the roll until it leaves, then the badge counts down over the walker
    const dieUp = stage.die.shown && stage.die.hideAt < 0;
    const show = c.shown && !!tok && !dieUp && c.value > 0;
    this.badgeSprite.visible = show;
    if (!show || !tok) return;
    const walker = stage.move ? stage.tokens[stage.move.player]! : tok;
    if (this.badgeShown.value !== c.value || this.badgeShown.color !== walker.color) {
      this.badge.draw(c.value, walker.color);
      this.badgeShown = { value: c.value, color: walker.color, at: c.changedAt };
    }
    const k = (stage.now - c.changedAt) / 0.2;
    const pop = reduced ? 1 : 1 + 0.18 * Math.max(0, 1 - k) * Math.sin(Math.min(1, k) * Math.PI);
    const g = walker.ground;
    this.badgeSprite.position.set(g[0], g[1] + walker.lift + RULES.tokenHeight + 0.75, g[2]);
    this.badgeSprite.scale.setScalar(0.95 * pop);
  }

  private updateBursts(now: number, reduced: boolean): void {
    this.bursts = this.bursts.filter((b) => now - b.t0 < Math.max(SPARK_LIFE, COIN_LIFE) + 0.1);
    let nc = 0;
    let ns = 0;
    const q = new Quaternion();
    const up = new Vector3(0, 1, 0);
    for (const b of this.bursts) {
      const age = now - b.t0;
      if (age < 0) continue;
      for (let i = 0; i < b.count; i++) {
        const h1 = hash(b.seed, i);
        const h2 = hash(b.seed + 1, i);
        const h3 = hash(b.seed + 2, i);
        const a = (i / b.count) * Math.PI * 2 + h1 * 0.6;
        if (b.kind === 'coin' || b.kind === 'loss') {
          if (nc >= 24 || age > COIN_LIFE) continue;
          const k = age / COIN_LIFE;
          let x = b.origin[0];
          let y = b.origin[1];
          let z = b.origin[2];
          if (reduced) y += 0.35 + i * 0.3;
          else if (b.kind === 'coin') {
            // coins pop out of the head and fall in
            x += Math.cos(a) * 0.5 * k;
            z += Math.sin(a) * 0.3 * k;
            y += 0.2 + 3.2 * age - 5.5 * age * age + i * 0.05;
          } else {
            x += Math.cos(a) * (0.4 + 1.4 * k);
            z += Math.sin(a) * 0.5 * k + 0.4 * k;
            y += 0.4 + 2.2 * age - 6.0 * age * age;
          }
          const fade = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
          q.setFromAxisAngle(up, reduced ? 0 : age * 9 + i);
          this.m.compose(new Vector3(x, y, z), q, new Vector3(fade, fade, fade));
          this.coins.setMatrixAt(nc, this.m);
          this.coins.setColorAt(nc, b.kind === 'loss' ? new Color('#d9a020').multiplyScalar(0.8) : b.color);
          nc++;
        } else {
          if (ns >= 96 || age > SPARK_LIFE) continue;
          const k = age / SPARK_LIFE;
          let x = b.origin[0];
          let y = b.origin[1];
          let z = b.origin[2];
          if (reduced) {
            x += Math.cos(a) * 0.7;
            z += Math.sin(a) * 0.35;
            y += 0.3 + h2 * 0.6;
          } else if (b.kind === 'gust') {
            const r = 0.6 + 0.5 * k;
            const turn = a + age * 7;
            x += Math.cos(turn) * r;
            z += Math.sin(turn) * r;
            y += -0.6 + h2 * 0.5 + 1.4 * k;
          } else {
            const sp = (b.kind === 'land' ? 1.6 : 3.4) * (0.6 + 0.6 * h2);
            const out = 1 - Math.exp(-age * 4);
            x += Math.cos(a) * sp * out * 0.6;
            z += Math.sin(a) * sp * out * 0.4;
            y += (b.kind === 'land' ? 0.15 : 0) + (b.kind === 'land' ? 1.4 : 3) * h3 * out - 1.2 * age * age;
          }
          const s = (b.kind === 'land' ? 0.7 : 1.1) * (1 - k) * (0.6 + 0.6 * h3);
          q.setFromAxisAngle(up, age * 6 + i);
          this.m.compose(new Vector3(x, y, z), q, new Vector3(s, s * 1.6, s));
          this.sparks.setMatrixAt(ns, this.m);
          this.sparks.setColorAt(ns, b.color);
          ns++;
        }
      }
    }
    this.coins.count = nc;
    this.sparks.count = ns;
    this.coins.instanceMatrix.needsUpdate = true;
    this.sparks.instanceMatrix.needsUpdate = true;
    if (this.coins.instanceColor) this.coins.instanceColor.needsUpdate = true;
    if (this.sparks.instanceColor) this.sparks.instanceColor.needsUpdate = true;
  }
}
