// Page entry: reads the URL, builds the stage (pure, deterministic), the three.js world and the HUD, runs the
// frame loop and publishes window.PartyBoard for a host page. See README.md for the parameters and the API.
import { RULES } from './core/rules.ts';
import { SPACE_COUNT } from './core/board.ts';
import { Stage } from './core/stage.ts';
import type { Vec3 } from './core/vec.ts';
import { Hud } from './view/hud.ts';
import { World } from './view/world.ts';

type Listener = (detail: Record<string, unknown>) => void;

interface Params {
  view: 'tv' | 'phone';
  players: number;
  seed: number;
  auto: boolean;
  kiosk: boolean;
  host: boolean;
  you: number;
  manual: boolean;
  motion: 'reduced' | 'full' | null;
  dpr: number;
  shadows: boolean;
}

function readParams(search: string): Params {
  const q = new URLSearchParams(search);
  const flag = (k: string): boolean => q.has(k) && !['0', 'false', 'no', 'off'].includes((q.get(k) ?? '').toLowerCase());
  const int = (k: string, d: number, lo: number, hi: number): number => {
    const v = Number.parseInt(q.get(k) ?? '', 10);
    return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d;
  };
  const kiosk = flag('kiosk');
  const players = int('players', 4, 1, 4);
  const motion = q.get('motion');
  return {
    view: q.get('view') === 'phone' ? 'phone' : 'tv',
    players,
    seed: int('seed', 7, 0, 2 ** 31 - 1),
    auto: flag('auto') || kiosk,
    kiosk,
    host: flag('host'),
    you: int('player', 1, 1, players) - 1,
    manual: q.get('clock') === 'manual',
    motion: motion === 'reduced' ? 'reduced' : motion === 'full' ? 'full' : null,
    dpr: Number.parseFloat(q.get('dpr') ?? '') > 0 ? Math.min(3, Number.parseFloat(q.get('dpr')!)) : 2,
    shadows: q.get('shadows') !== '0',
  };
}

function boot(): void {
  const params = readParams(location.search);
  const listeners = new Map<string, Set<Listener>>();
  const media = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  let reduced = params.motion ? params.motion === 'reduced' : !!media?.matches;
  let auto = params.auto;
  let disposed = false;
  let raf = 0;
  let last = -1;
  let frames = 0;
  let jsMs = 0;
  document.body.classList.add(params.view);
  document.body.classList.toggle('calm', reduced);

  let hud: Hud | null = null;
  let world: World | null = null;
  const emit = (name: string, detail: Record<string, unknown>): void => {
    if (disposed) return;
    world && onWorldEvent(name, detail);
    hud?.onEvent(name, detail);
    for (const fn of listeners.get(name) ?? []) fn(detail);
    for (const fn of listeners.get('*') ?? []) fn({ name, ...detail });
    window.dispatchEvent(new CustomEvent(`partyboard:${name}`, { detail }));
  };

  const aspect = params.view === 'tv' ? innerWidth / Math.max(1, innerHeight) : 16 / 9;
  const stage = new Stage(
    {
      players: params.players,
      seed: params.seed,
      auto,
      host: params.host,
      reduced,
      aspect,
      ...(params.view === 'phone' ? { waitFor: [params.you] } : {}),
    },
    emit,
  );

  const canvas = document.createElement('canvas');
  canvas.className = 'board';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'A floating island with a board of 40 spaces and the players’ tokens');
  try {
    world = new World(canvas, stage, { view: params.view, dpr: params.dpr, you: params.you, shadows: params.shadows });
  } catch (err) {
    const fail = document.createElement('div');
    fail.className = 'fail';
    fail.textContent = 'This browser could not start 3D drawing (WebGL), so the island cannot be shown here.';
    document.body.append(fail);
    console.warn('PartyBoard: WebGL unavailable', err);
    return;
  }
  const w = world;

  const actions = {
    roll: () => void stage.roll(),
    overview: () => void api.overview(),
    focusNext: () => void api.focus((stage.director.intent.subject + 1 + stage.tokens.length) % stage.tokens.length),
    toggleAuto: () => {
      auto = !auto;
      stage.opts.auto = auto;
    },
    toggleMotion: () => setReduced(!reduced),
  };
  hud = new Hud(document.body, stage, w, { view: params.view, kiosk: params.kiosk, you: params.you, actions });
  if (params.view === 'phone' && hud.mapHost) hud.mapHost.prepend(canvas);
  else document.body.prepend(canvas);

  function onWorldEvent(name: string, d: Record<string, unknown>): void {
    if (name === 'land') {
      const sp = stage.spaces[d.space as number]!;
      w.fx.land(sp.position, sp.kind, stage.now, d.final as boolean);
    }
    if (name === 'effect') {
      const t = stage.tokens[d.player as number]!;
      const head: Vec3 = [t.ground[0], t.ground[1] + RULES.tokenHeight + 0.2, t.ground[2]];
      w.fx.effect(d.kind as 'gain' | 'lose' | 'event' | 'star', head, stage.now, (d.gust as number) > 0);
    }
  }

  function setReduced(on: boolean): void {
    reduced = on;
    stage.setReduced(on);
    document.body.classList.toggle('calm', on);
    emit('motion', { reduced: on });
  }

  function size(): void {
    const host = params.view === 'phone' && hud?.mapHost ? hud.mapHost : null;
    const width = host ? host.clientWidth : innerWidth;
    const height = host ? host.clientHeight : innerHeight;
    w.resize(width, height, devicePixelRatio || 1);
    const u = Math.max(0.45, Math.min(2, Math.min(innerWidth / 1920, innerHeight / 1080)));
    document.documentElement.style.setProperty('--u', String(u));
    if (hud) hud.scale = u;
  }

  function draw(): void {
    const t0 = performance.now();
    w.render(reduced);
    hud?.update(reduced, auto);
    jsMs += performance.now() - t0;
    frames += 1;
  }

  function frame(ts: number): void {
    if (disposed) return;
    const dt = last < 0 ? 0 : Math.min(RULES.spring.maxDt, (ts - last) / 1000);
    last = ts;
    if (!params.manual) {
      const t0 = performance.now();
      stage.update(dt);
      jsMs += performance.now() - t0;
    }
    draw();
    raf = requestAnimationFrame(frame);
  }

  const onResize = (): void => {
    size();
    if (params.manual) draw();
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.target instanceof HTMLElement && e.target.closest('button') && (e.key === ' ' || e.key === 'Enter')) return;
    const k = e.key.toLowerCase();
    if (k === ' ') {
      e.preventDefault();
      if (params.view === 'tv' || stage.active === params.you) stage.roll();
    } else if (k === 'o') actions.overview();
    else if (k === 'f') actions.focusNext();
    else if (k === 'a') actions.toggleAuto();
    else if (k === 'm') actions.toggleMotion();
  };
  const onVisibility = (): void => {
    if (document.visibilityState === 'visible') {
      // R14: after the tab was hidden, cut to where the camera should be instead of gliding from long ago
      stage.resync();
      last = -1;
    }
  };
  const onMotion = (e: MediaQueryListEvent): void => {
    if (!params.motion) setReduced(e.matches);
  };
  addEventListener('resize', onResize);
  addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onVisibility);
  media?.addEventListener?.('change', onMotion);
  const ro = typeof ResizeObserver === 'function' && hud.mapHost ? new ResizeObserver(onResize) : null;
  if (ro && hud.mapHost) ro.observe(hud.mapHost);

  const snapshot = () => ({
    now: stage.now,
    phase: stage.phase,
    active: stage.active,
    round: stage.round,
    shot: stage.shot,
    overview: stage.director.overviewPhase(stage.now),
    reduced,
    auto,
    view: params.view,
    players: stage.tokens.length,
    tokens: stage.tokens.map((t) => ({ player: t.player, name: t.name, color: t.color, space: t.space, coins: t.coins, stars: t.stars })),
    camera: { ...stage.rig.pose },
  });

  const api = {
    version: 1,
    spaceCount: SPACE_COUNT,
    /** Move `player` (0-based) forward `steps` spaces; resolves after the token has settled. */
    hop(player: number, steps: number): Promise<{ player: number; from: number; to: number; cancelled?: boolean }> {
      if (disposed) return Promise.resolve({ player, from: -1, to: -1, cancelled: true });
      return new Promise((resolve) => {
        pending.add(resolve as (v: unknown) => void);
        stage.hop(player, steps, (r) => {
          pending.delete(resolve as (v: unknown) => void);
          resolve(r);
        });
      });
    },
    /** Fly out to the whole island, hold `holdSec`, and fly back to the active token. */
    overview(holdSec: number = RULES.overview.holdSec): Promise<void> {
      if (disposed) return Promise.resolve();
      return new Promise((resolve) => {
        const done = () => {
          pending.delete(done as (v: unknown) => void);
          resolve();
        };
        pending.add(done as (v: unknown) => void);
        stage.overview(Math.max(0, holdSec), done);
      });
    },
    /** Glide to `player` (0-based); resolves once the camera has covered 95 % of the way. */
    focus(player: number): Promise<void> {
      if (disposed) return Promise.resolve();
      return new Promise((resolve) => {
        const done = () => {
          pending.delete(done as (v: unknown) => void);
          resolve();
        };
        pending.add(done as (v: unknown) => void);
        stage.focus(player, done);
      });
    },
    /** Roll for the player whose turn it is (when the prompt is up). */
    roll: (): boolean => (disposed ? false : stage.roll()),
    on(name: string, fn: Listener): () => void {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name)!.add(fn);
      return () => listeners.get(name)?.delete(fn);
    },
    off(name: string, fn: Listener): void {
      listeners.get(name)?.delete(fn);
    },
    state: snapshot,
    setReducedMotion: (on: boolean) => setReduced(!!on),
    dispose(): void {
      if (disposed) return;
      emit('disposed', {});
      disposed = true;
      cancelAnimationFrame(raf);
      removeEventListener('resize', onResize);
      removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVisibility);
      media?.removeEventListener?.('change', onMotion);
      ro?.disconnect();
      for (const fn of pending) fn({ cancelled: true });
      pending.clear();
      listeners.clear();
      w.dispose();
      hud?.dispose();
      canvas.remove();
      hud = null;
    },
    /** For tests and tools: step a manual clock, read exact poses, and count draw work. */
    debug: {
      get disposed() {
        return disposed;
      },
      advance(ms: number, fps = 60): void {
        if (disposed) return;
        const step = 1 / fps;
        let left = Math.max(0, ms) / 1000;
        while (left > 1e-9) {
          const dt = Math.min(step, left);
          stage.update(dt);
          left -= dt;
        }
        draw();
      },
      /** Render once more at the current time (manual clock). */
      render: () => (disposed ? undefined : draw()),
      stage: () => stage,
      tokenWorld(p: number): Vec3 | null {
        const v = w.tokens[p];
        if (!v || disposed) return null;
        v.root.updateWorldMatrix(true, false);
        const e = v.root.matrixWorld.elements;
        return [e[12]!, e[13]! - w.bob, e[14]!];
      },
      cameraWorld(): { position: Vec3; target: Vec3; fov: number; aspect: number } {
        const c = w.camera;
        const pose = w.cameraPose();
        return { position: [c.position.x, c.position.y, c.position.z], target: pose.target, fov: c.fov, aspect: c.aspect };
      },
      project: (p: Vec3) => w.project(p),
      bob: () => w.bob,
      perf() {
        const info = w.renderer.info;
        return {
          frames,
          jsMsPerFrame: frames ? jsMs / frames : 0,
          calls: info.render.calls,
          triangles: info.render.triangles,
          geometries: info.memory.geometries,
          textures: info.memory.textures,
          programs: info.programs?.length ?? 0,
          bagSize: w.bag.size,
          pixelRatio: w.renderer.getPixelRatio(),
        };
      },
      resetPerf(): void {
        frames = 0;
        jsMs = 0;
      },
      context: () => w.renderer.getContext(),
    },
  };
  const pending = new Set<(v: unknown) => void>();
  (window as unknown as { PartyBoard: typeof api }).PartyBoard = api;

  size();
  draw();
  if (!params.manual) raf = requestAnimationFrame(frame);
  emit('ready', { view: params.view, players: stage.tokens.length, seed: params.seed, reduced, auto, host: params.host });
}

boot();
