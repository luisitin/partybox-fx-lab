// The three.js side: renderer, lights, the scene graph and one render per frame from the stage's state. The stage
// owns every number that matters (poses, camera, timing); this file only draws them. Board space is world space
// except for the island's gentle bob, which moves the board group and never the camera.
import {
  Color,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  NeutralToneMapping,
  PCFShadowMap,
  PMREMGenerator,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { Texture } from 'three';
import { RULES } from '../core/rules.ts';
import { fitPoints } from '../core/fit.ts';
import type { Fit } from '../core/fit.ts';
import { lensFor } from '../core/fit.ts';
import type { Stage } from '../core/stage.ts';
import type { Vec3 } from '../core/vec.ts';
import { Bag } from './bag.ts';
import { Fx } from './fx.ts';
import { buildIsland } from './island.ts';
import { WORLD } from './palette.ts';
import { buildProps } from './props.ts';
import type { Props } from './props.ts';
import { SUN_DIR, buildClouds, buildIslets, buildSea, buildSkyDome, skyMaterial } from './sky.ts';
import type { Sea } from './sky.ts';
import { buildTiles } from './tiles.ts';
import type { Tiles } from './tiles.ts';
import { blobTexture } from './textures.ts';
import { buildActiveRing, buildToken, poseToken } from './tokens.ts';
import type { TokenView } from './tokens.ts';

export type ViewKind = 'tv' | 'phone';

export interface WorldOptions {
  view: ViewKind;
  /** Pixel ratio cap. */
  dpr: number;
  /** Phone: which token is "you" (0-based). */
  you: number;
  shadows: boolean;
}

/** The phone's map camera: steeper than any TV shot, fitted to every space. */
export const MAP_PITCH = 72;
export const MAP_MARGINS = { left: 0.05, right: 0.05, top: 0.07, bottom: 0.05 };

export class World {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera: PerspectiveCamera;
  readonly board = new Group();
  readonly bag = new Bag();
  readonly fx: Fx;
  readonly tokens: TokenView[] = [];
  private tiles: Tiles;
  private props: Props;
  private sea: Sea;
  private clouds: Group;
  private islets: Group;
  private activeRing: Mesh;
  private prizeScale = new Map<number, number>();
  private fog: Fog;
  private width = 1;
  private height = 1;
  private mapFit: Fit | null = null;
  bob = 0;

  constructor(
    readonly canvas: HTMLCanvasElement,
    readonly stage: Stage,
    readonly opts: WorldOptions,
  ) {
    const bag = this.bag;
    this.renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.02;
    this.renderer.shadowMap.enabled = opts.shadows;
    this.renderer.shadowMap.type = PCFShadowMap;
    this.camera = new PerspectiveCamera(34, 16 / 9, 0.3, 2600);
    this.scene.background = new Color(WORLD.haze);
    this.fog = new Fog(WORLD.haze, 60, 220);
    this.scene.fog = this.fog;

    // light: warm key from the south-west (shadows), sky fill, cool rim from behind
    const hemi = new HemisphereLight('#cfe6ff', '#5a6b3a', 1.35);
    const key = new DirectionalLight('#fff0d6', 2.6);
    key.position.copy(SUN_DIR).multiplyScalar(60);
    key.castShadow = opts.shadows;
    key.shadow.mapSize.set(2048, 2048);
    const sc = key.shadow.camera;
    sc.left = -27;
    sc.right = 27;
    sc.top = 27;
    sc.bottom = -27;
    sc.near = 20;
    sc.far = 110;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.03;
    key.shadow.radius = 2.5;
    const rim = new DirectionalLight('#a9d4ff', 0.9);
    rim.position.set(6, 14, -30);
    this.scene.add(hemi, key, key.target, rim);

    this.scene.add(buildSkyDome(bag));
    this.sea = buildSea(bag);
    this.clouds = buildClouds(bag);
    this.islets = buildIslets(bag);
    this.scene.add(this.sea.mesh, this.clouds, this.islets);

    this.board.name = 'board';
    this.board.add(buildIsland(bag));
    this.tiles = buildTiles(bag, stage.spaces);
    this.props = buildProps(bag);
    this.board.add(this.tiles.group, this.props.group);
    const blob: Texture = blobTexture(bag);
    for (const t of stage.tokens) {
      const v = buildToken(bag, t, blob);
      this.tokens.push(v);
      this.board.add(v.root, v.shadow);
    }
    this.activeRing = buildActiveRing(bag);
    this.board.add(this.activeRing);
    this.fx = new Fx(bag);
    this.board.add(this.fx.group);
    this.scene.add(this.board);

    // image-based light from the same sky
    const pmrem = new PMREMGenerator(this.renderer);
    const envScene = new Scene();
    envScene.add(new Mesh(bag.add(new SphereGeometry(100, 32, 16)), skyMaterial(bag)));
    const env = pmrem.fromScene(envScene, 0.02);
    this.scene.environment = bag.add(env.texture);
    this.scene.environmentIntensity = 0.55;
    pmrem.dispose();
  }

  resize(width: number, height: number, dpr: number): void {
    this.width = Math.max(1, Math.round(width));
    this.height = Math.max(1, Math.round(height));
    this.renderer.setPixelRatio(Math.min(dpr, this.opts.dpr));
    this.renderer.setSize(this.width, this.height, false);
    const aspect = this.width / this.height;
    this.camera.aspect = aspect;
    if (this.opts.view === 'tv') this.stage.setAspect(aspect);
    this.mapFit = null;
  }

  get aspect(): number {
    return this.width / this.height;
  }

  /** The phone map's fixed camera: every tile and token, from steeply above. */
  mapCamera(): Fit {
    if (!this.mapFit) {
      this.mapFit = fitPoints(this.stage.cameraWorld.boardPoints(), RULES.yawDeg, MAP_PITCH, MAP_MARGINS, lensFor(this.aspect), 0);
    }
    return this.mapFit;
  }

  /** Where the camera is and looks, in world space (the bob never moves it). */
  cameraPose(): { position: Vec3; target: Vec3; vFovDeg: number } {
    if (this.opts.view === 'phone') {
      const f = this.mapCamera();
      return { position: f.eye, target: f.aim, vFovDeg: (lensFor(this.aspect).vFov * 180) / Math.PI };
    }
    const p = this.stage.rig.pose;
    return { position: p.position, target: p.target, vFovDeg: (this.stage.lens.vFov * 180) / Math.PI };
  }

  /** A board-space point on screen, in CSS pixels (and whether it is in front of the camera). */
  project(p: Vec3): { x: number; y: number; visible: boolean } {
    const v = new Vector3(p[0], p[1] + this.bob, p[2]).project(this.camera);
    return { x: (v.x * 0.5 + 0.5) * this.width, y: (-v.y * 0.5 + 0.5) * this.height, visible: v.z < 1 && v.z > -1 };
  }

  render(reduced: boolean): void {
    const s = this.stage;
    const t = s.now;
    // the island floats
    this.bob = reduced ? 0 : 0.13 * Math.sin(t * 0.62);
    this.board.position.y = this.bob;
    this.board.rotation.z = reduced ? 0 : 0.0035 * Math.sin(t * 0.41 + 1);
    this.board.rotation.x = reduced ? 0 : 0.0025 * Math.sin(t * 0.37);
    this.clouds.rotation.y = reduced ? 0 : t * 0.006;
    this.islets.children.forEach((g, i) => {
      g.rotation.y = reduced ? i : i + t * 0.05;
    });
    this.props.sails.rotation.z = reduced ? 0.3 : -t * 0.9;
    this.sea.material.uniforms.time!.value = reduced ? 0 : t;

    // tokens
    for (const v of this.tokens) {
      const st = s.tokens[v.player]!;
      poseToken(v, st, t, reduced, s.move?.player === v.player);
    }
    const act = s.tokens[s.active];
    this.activeRing.visible = !!act && s.phase !== 'intro';
    if (act) {
      this.activeRing.position.set(act.ground[0], act.ground[1] + 0.015, act.ground[2]);
      const pulse = reduced ? 1 : 1 + 0.07 * Math.sin(t * 4.2);
      this.activeRing.scale.setScalar(pulse);
      (this.activeRing.material as MeshBasicMaterial).color.set(act.color);
    }
    // star prizes: hidden while someone stands on the space
    for (const [index, g] of this.tiles.prizes) {
      const occupied = s.tokens.some((tk) => tk.space === index && s.move?.player !== tk.player);
      const goal = occupied ? 0 : 1;
      const cur = this.prizeScale.get(index) ?? 1;
      const next = reduced ? goal : cur + (goal - cur) * Math.min(1, 0.18);
      this.prizeScale.set(index, next);
      g.scale.setScalar(Math.max(0.001, next));
      g.visible = next > 0.01;
      g.rotation.y = reduced ? 0 : 0.55 * Math.sin(t * 1.4 + index);
      g.position.y = (g.userData.base as number) + (reduced ? 0 : 0.12 * Math.sin(t * 2 + index));
    }
    // camera
    const pose = this.cameraPose();
    this.camera.fov = pose.vFovDeg;
    this.camera.position.set(...pose.position);
    this.camera.lookAt(new Vector3(...pose.target));
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
    const dist = this.camera.position.distanceTo(new Vector3(...pose.target));
    this.fog.near = dist + 26;
    this.fog.far = dist + 170;
    this.fx.update(s, this.camera, reduced);
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.scene.traverse((o) => {
      const m = o as Mesh;
      if (m.isMesh) {
        m.geometry?.dispose();
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        for (const mm of mats) mm?.dispose();
      }
    });
    this.bag.dispose();
    this.renderer.renderLists.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.scene.clear();
  }
}
