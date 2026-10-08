// Canvas-drawn textures: soft blobs and glows, the die's faces, number badges and the start banner. All original.
import { CanvasTexture, LinearFilter, SRGBColorSpace } from 'three';
import type { Bag } from './bag.ts';

const FONT = "'Nunito Variable', 'Segoe UI Variable Display', 'Segoe UI', system-ui, -apple-system, Roboto, sans-serif";

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  if (!g) throw new Error('2D canvas unavailable');
  return [c, g];
}

function texture(bag: Bag, c: HTMLCanvasElement, srgb = true): CanvasTexture {
  const t = bag.add(new CanvasTexture(c));
  if (srgb) t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** A soft round shadow: dark centre fading to nothing. */
export function blobTexture(bag: Bag): CanvasTexture {
  const [c, g] = canvas(128, 128);
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(10,14,30,0.85)');
  r.addColorStop(0.45, 'rgba(10,14,30,0.5)');
  r.addColorStop(1, 'rgba(10,14,30,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  return texture(bag, c, false);
}

/** A white glow for additive sprites. */
export function glowTexture(bag: Bag): CanvasTexture {
  const [c, g] = canvas(128, 128);
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  r.addColorStop(0.6, 'rgba(255,255,255,0.12)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  return texture(bag, c, false);
}

/** One die face: ivory, rounded, dark pips in the classic layout. */
export function dieFaceTexture(bag: Bag, value: number): CanvasTexture {
  const S = 256;
  const [c, g] = canvas(S, S);
  const grad = g.createLinearGradient(0, 0, S, S);
  grad.addColorStop(0, '#fffdf6');
  grad.addColorStop(1, '#f1e7d2');
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
  const pip = (x: number, y: number) => {
    const px = x * S;
    const py = y * S;
    const r = S * 0.085;
    const rg = g.createRadialGradient(px - r * 0.3, py - r * 0.3, r * 0.1, px, py, r);
    rg.addColorStop(0, '#3a3f78');
    rg.addColorStop(1, '#14162e');
    g.fillStyle = rg;
    g.beginPath();
    g.arc(px, py, r, 0, Math.PI * 2);
    g.fill();
  };
  const L = 0.27;
  const M = 0.5;
  const H = 0.73;
  const layouts: Record<number, [number, number][]> = {
    1: [[M, M]],
    2: [
      [L, L],
      [H, H],
    ],
    3: [
      [L, L],
      [M, M],
      [H, H],
    ],
    4: [
      [L, L],
      [H, L],
      [L, H],
      [H, H],
    ],
    5: [
      [L, L],
      [H, L],
      [M, M],
      [L, H],
      [H, H],
    ],
    6: [
      [L, L],
      [H, L],
      [L, M],
      [H, M],
      [L, H],
      [H, H],
    ],
  };
  if (value === 1) {
    // the one pip is larger and warm, as on many dice
    const px = S / 2;
    const r = S * 0.13;
    const rg = g.createRadialGradient(px - r * 0.3, px - r * 0.3, r * 0.1, px, px, r);
    rg.addColorStop(0, '#ff7da4');
    rg.addColorStop(1, '#d6305f');
    g.fillStyle = rg;
    g.beginPath();
    g.arc(px, px, r, 0, Math.PI * 2);
    g.fill();
  } else for (const [x, y] of layouts[value] ?? []) pip(x, y);
  return texture(bag, c);
}

/** A round badge with a number, for the steps-left counter: white disc, player-colour ring and digits. */
export class BadgeCanvas {
  readonly canvas: HTMLCanvasElement;
  readonly texture: CanvasTexture;
  private g: CanvasRenderingContext2D;
  constructor(bag: Bag) {
    const [c, g] = canvas(256, 256);
    this.canvas = c;
    this.g = g;
    this.texture = texture(bag, c);
    this.texture.minFilter = LinearFilter;
  }
  draw(value: number, color: string): void {
    const g = this.g;
    g.clearRect(0, 0, 256, 256);
    g.save();
    g.shadowColor = 'rgba(8,10,30,0.45)';
    g.shadowBlur = 18;
    g.shadowOffsetY = 8;
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(128, 122, 96, 0, Math.PI * 2);
    g.fill();
    g.restore();
    g.lineWidth = 16;
    g.strokeStyle = color;
    g.beginPath();
    g.arc(128, 122, 88, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = '#1c1e3a';
    g.font = `900 132px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(value), 128, 130);
    this.texture.needsUpdate = true;
  }
}

/** The arch's banner over the start space. */
export function bannerTexture(bag: Bag, text: string): CanvasTexture {
  const [c, g] = canvas(512, 128);
  const grad = g.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, '#ff7aa3');
  grad.addColorStop(1, '#e8457a');
  g.fillStyle = grad;
  const r = 40;
  g.beginPath();
  g.moveTo(r, 8);
  g.arcTo(504, 8, 504, 120, r);
  g.arcTo(504, 120, 8, 120, r);
  g.arcTo(8, 120, 8, 8, r);
  g.arcTo(8, 8, 504, 8, r);
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.9)';
  g.lineWidth = 6;
  g.stroke();
  g.fillStyle = '#ffffff';
  g.font = `900 78px ${FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, 70);
  return texture(bag, c);
}
