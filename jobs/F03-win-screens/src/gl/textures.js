// Every image in the win screens is drawn here with canvas 2D from a seed: card faces, pips,
// title deeds, letter tiles, doodles, the CASE CLOSED ink, felt, wood, asphalt and plaster.
// Original art, no files, no fonts beyond the PartyBox system stack.

import { createRng } from '../core/rng.js';

export const FONT = "'Nunito Variable', 'Segoe UI Variable Display', 'Segoe UI', system-ui, -apple-system, Roboto, sans-serif";
export const SERIF = "Georgia, 'Times New Roman', serif";
export const MONO = "'Cascadia Mono', Consolas, 'DejaVu Sans Mono', 'Courier New', monospace";

/**
 * @param {number} w @param {number} h
 * @returns {[HTMLCanvasElement, CanvasRenderingContext2D]}
 */
export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
  return [c, ctx];
}

/** @param {string} hex @param {number} k  -1..1 darker..lighter */
export function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  if (k < 0) {
    r *= 1 + k;
    g *= 1 + k;
    b *= 1 + k;
  } else {
    r += (255 - r) * k;
    g += (255 - g) * k;
    b += (255 - b) * k;
  }
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

/** @param {string} hex @param {number} a */
export function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x @param {number} y @param {number} w @param {number} h @param {number} r
 */
export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Tileable value noise, a few octaves, into an ImageData-ready Float32Array (0..1).
 * @param {number} w @param {number} h @param {number|string} seed @param {number} cell @param {number} octaves
 */
export function valueNoise(w, h, seed, cell = 32, octaves = 4) {
  const rng = createRng(seed).fork('noise');
  const out = new Float32Array(w * h);
  let amp = 1;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    const gw = Math.max(1, Math.round(w / cell));
    const gh = Math.max(1, Math.round(h / cell));
    const grid = new Float32Array(gw * gh);
    for (let i = 0; i < grid.length; i++) grid[i] = rng.next();
    for (let y = 0; y < h; y++) {
      const fy = (y / h) * gh;
      const y0 = Math.floor(fy) % gh;
      const y1 = (y0 + 1) % gh;
      let ty = fy - Math.floor(fy);
      ty = ty * ty * (3 - 2 * ty);
      for (let x = 0; x < w; x++) {
        const fx = (x / w) * gw;
        const x0 = Math.floor(fx) % gw;
        const x1 = (x0 + 1) % gw;
        let tx = fx - Math.floor(fx);
        tx = tx * tx * (3 - 2 * tx);
        const a = grid[y0 * gw + x0] + (grid[y0 * gw + x1] - grid[y0 * gw + x0]) * tx;
        const b = grid[y1 * gw + x0] + (grid[y1 * gw + x1] - grid[y1 * gw + x0]) * tx;
        out[y * w + x] += (a + (b - a) * ty) * amp;
      }
    }
    total += amp;
    amp *= 0.5;
    cell = Math.max(1, cell / 2);
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

/**
 * A surface from noise: base colour modulated by mottling and fine grain.
 * @param {number} size @param {string} base @param {object} o
 * @param {number|string} o.seed @param {number} [o.mottle] @param {number} [o.grain] @param {number} [o.cell]
 * @param {number} [o.speckle]
 */
export function surfaceCanvas(size, base, o) {
  const [c, ctx] = makeCanvas(size, size);
  const n = valueNoise(size, size, o.seed, o.cell ?? 64, 5);
  const rng = createRng(o.seed).fork('grain');
  const img = ctx.createImageData(size, size);
  const bn = parseInt(base.slice(1), 16);
  const br = (bn >> 16) & 255;
  const bg = (bn >> 8) & 255;
  const bb = bn & 255;
  const mottle = o.mottle ?? 0.18;
  const grain = o.grain ?? 0.06;
  const speckle = o.speckle ?? 0;
  for (let i = 0; i < size * size; i++) {
    let k = 1 + (n[i] - 0.5) * 2 * mottle + (rng.next() - 0.5) * 2 * grain;
    if (speckle && rng.next() < speckle) k *= rng.next() < 0.5 ? 0.6 : 1.45;
    img.data[i * 4] = Math.min(255, br * k);
    img.data[i * 4 + 1] = Math.min(255, bg * k);
    img.data[i * 4 + 2] = Math.min(255, bb * k);
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/**
 * Wood planks with grain lines (desks, the tile rack, the dice tray rim).
 * @param {number} w @param {number} h @param {number|string} seed @param {string} [base]
 */
export function woodCanvas(w, h, seed, base = '#6b3f22') {
  const [c, ctx] = makeCanvas(w, h);
  const rng = createRng(seed).fork('wood');
  const n = valueNoise(w, h, `${seed}w`, 96, 4);
  const img = ctx.createImageData(w, h);
  const bn = parseInt(base.slice(1), 16);
  const br = (bn >> 16) & 255;
  const bg = (bn >> 8) & 255;
  const bb = bn & 255;
  const planks = 4;
  const ph = h / planks;
  const offs = Array.from({ length: planks }, () => rng.range(0, 40));
  const tone = Array.from({ length: planks }, () => rng.range(0.86, 1.1));
  for (let y = 0; y < h; y++) {
    const p = Math.floor(y / ph);
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const warp = n[i] * 18;
      const ring = Math.sin((y + warp * 1.6 + offs[p]) * 0.55 + Math.sin(x * 0.004 + p) * 3);
      let k = tone[p] * (0.9 + 0.12 * ring + (n[i] - 0.5) * 0.35);
      const edge = (y % ph) / ph;
      if (edge < 0.012 || edge > 0.988) k *= 0.55;
      img.data[i * 4] = Math.min(255, br * k);
      img.data[i * 4 + 1] = Math.min(255, bg * k);
      img.data[i * 4 + 2] = Math.min(255, bb * k);
      img.data[i * 4 + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// ---------------------------------------------------------------- suits (drawn, not font glyphs)

/** @typedef {'S'|'H'|'D'|'C'} Suit */
export const SUIT_RED = '#c8102e';
export const SUIT_BLACK = '#16161d';

/**
 * Draws a suit symbol centred at (x, y), `s` = height.
 * @param {CanvasRenderingContext2D} ctx @param {Suit} suit @param {number} x @param {number} y @param {number} s
 */
export function drawSuit(ctx, suit, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 100, s / 100);
  ctx.fillStyle = suit === 'H' || suit === 'D' ? SUIT_RED : SUIT_BLACK;
  ctx.beginPath();
  if (suit === 'H') {
    ctx.moveTo(0, 46);
    ctx.bezierCurveTo(-30, 18, -50, 2, -50, -20);
    ctx.bezierCurveTo(-50, -40, -36, -50, -24, -50);
    ctx.bezierCurveTo(-12, -50, -3, -43, 0, -32);
    ctx.bezierCurveTo(3, -43, 12, -50, 24, -50);
    ctx.bezierCurveTo(36, -50, 50, -40, 50, -20);
    ctx.bezierCurveTo(50, 2, 30, 18, 0, 46);
    ctx.fill();
  } else if (suit === 'D') {
    ctx.moveTo(0, -50);
    ctx.quadraticCurveTo(16, -22, 38, 0);
    ctx.quadraticCurveTo(16, 22, 0, 50);
    ctx.quadraticCurveTo(-16, 22, -38, 0);
    ctx.quadraticCurveTo(-16, -22, 0, -50);
    ctx.fill();
  } else if (suit === 'S') {
    ctx.moveTo(0, -50);
    ctx.bezierCurveTo(-28, -22, -50, -6, -50, 14);
    ctx.bezierCurveTo(-50, 32, -36, 40, -24, 40);
    ctx.bezierCurveTo(-14, 40, -7, 35, -3, 28);
    ctx.quadraticCurveTo(-6, 42, -16, 50);
    ctx.lineTo(16, 50);
    ctx.quadraticCurveTo(6, 42, 3, 28);
    ctx.bezierCurveTo(7, 35, 14, 40, 24, 40);
    ctx.bezierCurveTo(36, 40, 50, 32, 50, 14);
    ctx.bezierCurveTo(50, -6, 28, -22, 0, -50);
    ctx.fill();
  } else {
    ctx.arc(0, -24, 22, 0, Math.PI * 2);
    ctx.moveTo(-14, 10);
    ctx.arc(-24, 10, 22, 0, Math.PI * 2);
    ctx.moveTo(46, 10);
    ctx.arc(24, 10, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-4, 4);
    ctx.quadraticCurveTo(-5, 38, -18, 50);
    ctx.lineTo(18, 50);
    ctx.quadraticCurveTo(5, 38, 4, 4);
    ctx.fill();
  }
  ctx.restore();
}

/** Pip positions (fractions of the inner field) for 1-10. */
const PIP_LAYOUT = /** @type {Record<number, [number, number][]>} */ ({
  1: [[0.5, 0.5]],
  2: [[0.5, 0.12], [0.5, 0.88]],
  3: [[0.5, 0.12], [0.5, 0.5], [0.5, 0.88]],
  4: [[0.22, 0.12], [0.78, 0.12], [0.22, 0.88], [0.78, 0.88]],
  5: [[0.22, 0.12], [0.78, 0.12], [0.5, 0.5], [0.22, 0.88], [0.78, 0.88]],
  6: [[0.22, 0.12], [0.78, 0.12], [0.22, 0.5], [0.78, 0.5], [0.22, 0.88], [0.78, 0.88]],
  7: [[0.22, 0.12], [0.78, 0.12], [0.5, 0.31], [0.22, 0.5], [0.78, 0.5], [0.22, 0.88], [0.78, 0.88]],
  8: [[0.22, 0.12], [0.78, 0.12], [0.5, 0.31], [0.22, 0.5], [0.78, 0.5], [0.5, 0.69], [0.22, 0.88], [0.78, 0.88]],
  9: [[0.22, 0.12], [0.78, 0.12], [0.22, 0.37], [0.78, 0.37], [0.5, 0.5], [0.22, 0.63], [0.78, 0.63], [0.22, 0.88], [0.78, 0.88]],
  10: [[0.22, 0.12], [0.78, 0.12], [0.5, 0.25], [0.22, 0.37], [0.78, 0.37], [0.22, 0.63], [0.78, 0.63], [0.5, 0.75], [0.22, 0.88], [0.78, 0.88]],
});

export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

/**
 * A playing-card face, 2.5 : 3.5, original art: indices, pips, and framed court panels.
 * @param {string} rank @param {Suit} suit @param {string} accent  the winner's colour (court frames)
 */
export function cardFaceCanvas(rank, suit, accent) {
  const W = 500;
  const H = 700;
  const [c, ctx] = makeCanvas(W, H);
  const red = suit === 'H' || suit === 'D';
  const ink = red ? SUIT_RED : SUIT_BLACK;
  ctx.fillStyle = '#fbf8f1';
  ctx.fillRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, 'rgba(255,255,255,0.6)');
  g.addColorStop(1, 'rgba(225,216,196,0.35)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 6;
  roundRect(ctx, 10, 10, W - 20, H - 20, 34);
  ctx.stroke();
  // indices
  const index = () => {
    ctx.fillStyle = ink;
    ctx.font = `800 ${rank === '10' ? 66 : 74}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(rank, 58, 96);
    drawSuit(ctx, suit, 58, 140, 50);
  };
  index();
  ctx.save();
  ctx.translate(W, H);
  ctx.rotate(Math.PI);
  index();
  ctx.restore();
  const fx = 110;
  const fy = 90;
  const fw = W - 220;
  const fh = H - 180;
  const n = Number(rank);
  if (rank === 'A') {
    ctx.strokeStyle = rgba(accent, 0.55);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 128, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 144, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(W / 2 + Math.cos(a) * 160, H / 2 + Math.sin(a) * 160, 5, 0, Math.PI * 2);
      ctx.fillStyle = rgba(accent, 0.6);
      ctx.fill();
    }
    drawSuit(ctx, suit, W / 2, H / 2, 190);
  } else if (n >= 2 && n <= 10) {
    for (const [px, py] of PIP_LAYOUT[n]) {
      const x = fx + px * fw;
      const y = fy + py * fh;
      ctx.save();
      ctx.translate(x, y);
      if (py > 0.55) ctx.rotate(Math.PI);
      drawSuit(ctx, suit, 0, 0, 82);
      ctx.restore();
    }
  } else {
    // court card: a framed panel with a big letter and the suit, in the winner's accent
    const px = 96;
    const py = 84;
    const pw = W - 192;
    const ph = H - 168;
    const pg = ctx.createLinearGradient(0, py, 0, py + ph);
    pg.addColorStop(0, shade(accent, 0.82));
    pg.addColorStop(1, shade(accent, 0.6));
    ctx.fillStyle = pg;
    roundRect(ctx, px, py, pw, ph, 18);
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.strokeStyle = rgba('#000000', 0.25);
    ctx.lineWidth = 2;
    roundRect(ctx, px + 14, py + 14, pw - 28, ph - 28, 10);
    ctx.stroke();
    // diagonal ornament
    ctx.save();
    roundRect(ctx, px + 14, py + 14, pw - 28, ph - 28, 10);
    ctx.clip();
    ctx.strokeStyle = rgba('#ffffff', 0.35);
    ctx.lineWidth = 3;
    for (let i = -10; i < 20; i++) {
      ctx.beginPath();
      ctx.moveTo(px + i * 40, py);
      ctx.lineTo(px + i * 40 + ph, py + ph);
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = ink;
    ctx.font = `900 230px ${SERIF}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(rank, W / 2, H / 2 - 30);
    drawSuit(ctx, suit, W / 2, H / 2 + 150, 80);
    // crown for the king, a jewel for the queen, a feather mark for the jack
    ctx.fillStyle = '#d4a017';
    ctx.strokeStyle = ink;
    ctx.lineWidth = 4;
    ctx.beginPath();
    if (rank === 'K') {
      const cx = W / 2;
      const cy = py + 70;
      ctx.moveTo(cx - 60, cy + 26);
      ctx.lineTo(cx - 66, cy - 20);
      ctx.lineTo(cx - 32, cy + 4);
      ctx.lineTo(cx, cy - 34);
      ctx.lineTo(cx + 32, cy + 4);
      ctx.lineTo(cx + 66, cy - 20);
      ctx.lineTo(cx + 60, cy + 26);
      ctx.closePath();
    } else if (rank === 'Q') {
      ctx.ellipse(W / 2, py + 64, 26, 34, 0, 0, Math.PI * 2);
    } else {
      ctx.moveTo(W / 2 - 46, py + 92);
      ctx.quadraticCurveTo(W / 2 + 20, py + 70, W / 2 + 50, py + 30);
      ctx.quadraticCurveTo(W / 2 + 10, py + 90, W / 2 - 46, py + 92);
    }
    ctx.fill();
    ctx.stroke();
  }
  return c;
}

/**
 * The PartyBox card back: night indigo, a fine lattice in the accent, a star medallion.
 * @param {string} accent
 */
export function cardBackCanvas(accent) {
  const W = 500;
  const H = 700;
  const [c, ctx] = makeCanvas(W, H);
  ctx.fillStyle = '#fbf8f1';
  ctx.fillRect(0, 0, W, H);
  const inset = 26;
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#2b2e5c');
  g.addColorStop(1, '#16183a');
  ctx.fillStyle = g;
  roundRect(ctx, inset, inset, W - inset * 2, H - inset * 2, 22);
  ctx.fill();
  ctx.save();
  roundRect(ctx, inset, inset, W - inset * 2, H - inset * 2, 22);
  ctx.clip();
  ctx.strokeStyle = rgba(accent, 0.45);
  ctx.lineWidth = 3;
  for (let i = -20; i < 30; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 36, 0);
    ctx.lineTo(i * 36 + H, H);
    ctx.moveTo(i * 36 + H, 0);
    ctx.lineTo(i * 36, H);
    ctx.stroke();
  }
  const rg = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, 200);
  rg.addColorStop(0, '#16183a');
  rg.addColorStop(0.7, 'rgba(22,24,58,0.85)');
  rg.addColorStop(1, 'rgba(22,24,58,0)');
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 4;
  roundRect(ctx, inset + 14, inset + 14, W - inset * 2 - 28, H - inset * 2 - 28, 14);
  ctx.stroke();
  star(ctx, W / 2, H / 2, 82, 34, 5, '#ffd166');
  star(ctx, W / 2, H / 2, 46, 19, 5, accent);
  return c;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x @param {number} y @param {number} R @param {number} r @param {number} points @param {string} fill
 */
export function star(ctx, x, y, R, r, points, fill) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const rad = i % 2 === 0 ? R : r;
    ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

// ---------------------------------------------------------------- dice

const DIE_PIPS = /** @type {Record<number, [number, number][]>} */ ({
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
});

/**
 * One die face: ivory with drilled, painted pips (soft inner shadow).
 * @param {number} n @param {string} pipColor
 */
export function dieFaceCanvas(n, pipColor = '#1b1d3a') {
  const S = 256;
  const [c, ctx] = makeCanvas(S, S);
  const g = ctx.createRadialGradient(S * 0.4, S * 0.35, 10, S / 2, S / 2, S * 0.75);
  g.addColorStop(0, '#fffdf6');
  g.addColorStop(1, '#efe6d2');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  const step = S * 0.25;
  const r = n === 1 ? S * 0.12 : S * 0.085;
  for (const [px, py] of DIE_PIPS[n]) {
    const x = S / 2 + px * step;
    const y = S / 2 + py * step;
    const pg = ctx.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.1, x, y, r);
    const col = n === 1 ? '#c8102e' : pipColor;
    pg.addColorStop(0, shade(col, -0.55));
    pg.addColorStop(0.7, col);
    pg.addColorStop(1, shade(col, 0.25));
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r + 1, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
  }
  return c;
}

// ---------------------------------------------------------------- title deeds

export const DEED_GROUPS = [
  { color: '#8a5a3c', name: 'Cinder Row' },
  { color: '#8fd3f5', name: 'Lantern Lane' },
  { color: '#d0479b', name: 'Juniper Court' },
  { color: '#f08a24', name: 'Copper Street' },
  { color: '#d62b2b', name: 'Harbor Walk' },
  { color: '#f2cf1d', name: 'Sunrise Plaza' },
  { color: '#1f9d55', name: 'Willow Park' },
  { color: '#1f4fa8', name: 'Summit Avenue' },
];

/**
 * An original title-deed card: coloured band, street name, a rent table.
 * @param {{color: string, name: string}} group @param {number} i
 */
export function deedCanvas(group, i) {
  const W = 500;
  const H = 640;
  const [c, ctx] = makeCanvas(W, H);
  ctx.fillStyle = '#fbf7ec';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#2a2a33';
  ctx.lineWidth = 5;
  ctx.strokeRect(22, 22, W - 44, H - 44);
  ctx.fillStyle = group.color;
  ctx.fillRect(34, 34, W - 68, 150);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 3;
  ctx.strokeRect(34, 34, W - 68, 150);
  const light = ['#8fd3f5', '#f2cf1d', '#f08a24'].includes(group.color);
  ctx.fillStyle = light ? '#1a1a22' : '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = `700 26px ${FONT}`;
  ctx.fillText('T I T L E   D E E D', W / 2, 82);
  ctx.font = `900 50px ${FONT}`;
  ctx.fillText(group.name.toUpperCase(), W / 2, 146, W - 100);
  ctx.fillStyle = '#2a2a33';
  ctx.font = `600 30px ${FONT}`;
  const base = 4 + i * 2;
  const rows = [
    ['Rent', base],
    ['With 1 house', base * 5],
    ['With 2 houses', base * 15],
    ['With 3 houses', base * 40],
    ['With a hotel', base * 70],
  ];
  rows.forEach(([label, v], k) => {
    const y = 250 + k * 56;
    ctx.textAlign = 'left';
    ctx.fillText(String(label), 60, y);
    ctx.textAlign = 'right';
    ctx.fillText(`$${v}`, W - 60, y);
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, y + 16);
    ctx.lineTo(W - 60, y + 16);
    ctx.stroke();
  });
  ctx.textAlign = 'center';
  ctx.font = `italic 600 24px ${FONT}`;
  ctx.fillStyle = '#55555f';
  ctx.fillText(`Price $${(base + 2) * 20}`, W / 2, H - 56);
  return c;
}

// ---------------------------------------------------------------- letter tiles

/** Original point values: vowels cheap, rare letters dear. @param {string} ch */
export function letterValue(ch) {
  const u = ch.toUpperCase();
  if ('AEIOULNRST'.includes(u)) return 1;
  if ('DGBCMPH'.includes(u)) return 3;
  if ('FKVWY'.includes(u)) return 4;
  if ('JX'.includes(u)) return 8;
  if ('QZ'.includes(u)) return 10;
  return /\p{L}/u.test(u) ? 2 : 0;
}

/**
 * A letter tile face: maple ivory, carved letter, small value.
 * @param {string} ch @param {boolean} gold  the winner's first tile gets a gold face
 */
export function tileCanvas(ch, gold = false) {
  const S = 256;
  const [c, ctx] = makeCanvas(S, S);
  const g = ctx.createLinearGradient(0, 0, S, S);
  g.addColorStop(0, gold ? '#ffe39a' : '#fbf1d9');
  g.addColorStop(1, gold ? '#e9b949' : '#ead9b5');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = 'rgba(120,80,30,0.08)';
  ctx.lineWidth = 2;
  for (let y = 8; y < S; y += 11) {
    ctx.beginPath();
    ctx.moveTo(0, y + Math.sin(y) * 2);
    ctx.bezierCurveTo(S * 0.3, y + 4, S * 0.6, y - 4, S, y + Math.cos(y) * 2);
    ctx.stroke();
  }
  const text = ch.toLocaleUpperCase();
  const big = Array.from(text).length > 1 ? 120 : 168;
  ctx.font = `900 ${big}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText(text, S / 2 + 2, S / 2 + 12, S * 0.8);
  ctx.fillStyle = '#2a1a0c';
  ctx.fillText(text, S / 2, S / 2 + 8, S * 0.8);
  const v = letterValue(ch);
  if (v) {
    ctx.font = `800 46px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(String(v), S - 22, S - 20);
  }
  return c;
}

// ---------------------------------------------------------------- doodles for the gallery

/**
 * Kid-marker doodles on paper, seeded: sun and hills, house, cat, rocket, flower, fish, and the
 * winner's trophy. Strokes wobble like a hand-held marker.
 * @param {string} kind @param {number|string} seed @param {string} accent
 */
export function doodleCanvas(kind, seed, accent) {
  const W = 640;
  const H = 480;
  const [c, ctx] = makeCanvas(W, H);
  const rng = createRng(seed).fork(`doodle-${kind}`);
  ctx.fillStyle = '#fdfaf2';
  ctx.fillRect(0, 0, W, H);
  const paper = valueNoise(160, 120, `${seed}p`, 24, 3);
  for (let y = 0; y < 120; y++) {
    for (let x = 0; x < 160; x++) {
      const k = paper[y * 160 + x];
      ctx.fillStyle = `rgba(160,140,100,${(k - 0.4) * 0.12})`;
      ctx.fillRect(x * 4, y * 4, 4, 4);
    }
  }
  /** wobbly stroke through points @param {[number, number][]} pts @param {string} col @param {number} w */
  const stroke = (pts, col, w = 10, close = false) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let pass = 0; pass < 2; pass++) {
      ctx.globalAlpha = pass === 0 ? 0.9 : 0.35;
      ctx.beginPath();
      pts.forEach(([x, y], i) => {
        const jx = x + rng.range(-3, 3);
        const jy = y + rng.range(-3, 3);
        if (i === 0) ctx.moveTo(jx, jy);
        else ctx.lineTo(jx, jy);
      });
      if (close) ctx.closePath();
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };
  /** @param {number} cx @param {number} cy @param {number} rx @param {number} ry @param {number} n */
  const ring = (cx, cy, rx, ry, n = 28) =>
    Array.from({ length: n + 1 }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      return /** @type {[number, number]} */ ([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
    });
  /** scribble fill inside a polygon-ish area @param {number} x @param {number} y @param {number} w @param {number} h @param {string} col */
  const hatch = (x, y, w, h, col) => {
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = col;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < w + h; i += 13) {
      ctx.moveTo(x + Math.max(0, i - h), y + Math.min(h, i));
      ctx.lineTo(x + Math.min(w, i), y + Math.max(0, i - w));
    }
    ctx.stroke();
    ctx.restore();
  };
  const blue = '#2f6fd6';
  const green = '#2e9e4f';
  const red = '#e0393e';
  const yellow = '#f4b822';
  const brown = '#7a4a26';
  const black = '#26222b';
  if (kind === 'sun') {
    stroke(ring(470, 120, 60, 60), yellow, 12);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      stroke([[470 + Math.cos(a) * 80, 120 + Math.sin(a) * 80], [470 + Math.cos(a) * 112, 120 + Math.sin(a) * 112]], yellow, 9);
    }
    stroke(Array.from({ length: 30 }, (_, i) => [i * 23, 370 - Math.sin(i * 0.35) * 60]), green, 12);
    hatch(0, 340, W, 140, green);
    stroke([[130, 380], [130, 300]], brown, 12);
    stroke(ring(130, 270, 46, 40), green, 11);
  } else if (kind === 'house') {
    stroke([[180, 380], [180, 230], [460, 230], [460, 380], [180, 380]], red, 12);
    stroke([[160, 240], [320, 110], [480, 240]], brown, 12);
    stroke([[290, 380], [290, 300], [350, 300], [350, 380]], brown, 10);
    stroke([[210, 260], [260, 260], [260, 300], [210, 300], [210, 260]], blue, 9);
    stroke([[380, 260], [430, 260], [430, 300], [380, 300], [380, 260]], blue, 9);
    stroke([[0, 400], [W, 396]], green, 12);
    stroke(ring(560, 90, 50, 30), '#9aa7b8', 10);
  } else if (kind === 'cat') {
    stroke(ring(320, 270, 140, 120), black, 12);
    stroke([[208, 200], [220, 100], [280, 160]], black, 12);
    stroke([[360, 160], [420, 100], [432, 200]], black, 12);
    stroke(ring(270, 250, 16, 22, 14), green, 10);
    stroke(ring(370, 250, 16, 22, 14), green, 10);
    stroke([[310, 300], [320, 312], [330, 300]], red, 9);
    stroke([[200, 300], [120, 290]], black, 7);
    stroke([[200, 320], [120, 330]], black, 7);
    stroke([[440, 300], [520, 290]], black, 7);
    stroke([[440, 320], [520, 330]], black, 7);
  } else if (kind === 'rocket') {
    stroke([[320, 60], [380, 160], [380, 340], [260, 340], [260, 160], [320, 60]], '#9b5de5', 12);
    stroke(ring(320, 200, 30, 30), blue, 10);
    stroke([[260, 280], [210, 360], [260, 340]], red, 10);
    stroke([[380, 280], [430, 360], [380, 340]], red, 10);
    stroke([[290, 350], [320, 440], [350, 350]], yellow, 12);
    for (let i = 0; i < 14; i++) stroke([[rng.range(20, 620), rng.range(20, 460)], [rng.range(20, 620), rng.range(20, 460)]].map(([x, y], k) => [x + k * 6, y + k * 6]), yellow, 6);
  } else if (kind === 'flower') {
    stroke([[320, 420], [320, 230]], green, 12);
    stroke(ring(370, 330, 40, 18), green, 10);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      stroke(ring(320 + Math.cos(a) * 62, 180 + Math.sin(a) * 62, 38, 38, 16), '#e85d9e', 10);
    }
    stroke(ring(320, 180, 30, 30), yellow, 12);
    stroke([[230, 420], [410, 420], [390, 470], [250, 470], [230, 420]], brown, 11);
  } else if (kind === 'fish') {
    stroke(ring(300, 240, 150, 90), '#f08a24', 12);
    stroke([[450, 240], [560, 160], [560, 320], [450, 240]], '#f08a24', 12);
    stroke(ring(220, 220, 14, 14, 12), black, 9);
    for (let i = 0; i < 6; i++) stroke(ring(120 - i * 10, 120 - i * 18, 10 + i * 2, 10 + i * 2, 12), blue, 6);
    stroke(Array.from({ length: 30 }, (_, i) => [i * 23, 420 + Math.sin(i * 0.8) * 14]), blue, 9);
  } else {
    // trophy for the winner, in their colour, with sparkles
    stroke([[230, 110], [410, 110], [400, 230], [320, 290], [240, 230], [230, 110]], accent, 14);
    hatch(240, 116, 160, 120, accent);
    stroke([[230, 140], [170, 140], [180, 200], [240, 215]], accent, 11);
    stroke([[410, 140], [470, 140], [460, 200], [400, 215]], accent, 11);
    stroke([[320, 290], [320, 350]], brown, 13);
    stroke([[250, 360], [390, 360], [400, 410], [240, 410], [250, 360]], brown, 12);
    for (const [x, y] of [[140, 90], [510, 80], [120, 300], [530, 300], [320, 50]]) {
      stroke([[x - 22, y], [x + 22, y]], yellow, 8);
      stroke([[x, y - 22], [x, y + 22]], yellow, 8);
    }
    ctx.fillStyle = black;
    ctx.font = `900 54px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('#1', 320, 205);
  }
  return c;
}

// ---------------------------------------------------------------- detective

/** The CASE CLOSED ink: double border, worn letters, speckled where the rubber missed. */
export function stampInkCanvas(seed) {
  const W = 1024;
  const H = 360;
  const [c, ctx] = makeCanvas(W, H);
  const ink = '#c3122f';
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = 16;
  roundRect(ctx, 20, 20, W - 40, H - 40, 30);
  ctx.stroke();
  ctx.lineWidth = 6;
  roundRect(ctx, 48, 48, W - 96, H - 96, 18);
  ctx.stroke();
  ctx.font = `900 150px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CASE CLOSED', W / 2, H / 2 + 6, W - 150);
  // wear: punch speckles and a few dry streaks out of the ink
  const rng = createRng(seed).fork('ink');
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 2600; i++) {
    const r = rng.next() ** 3 * 9 + 0.6;
    ctx.globalAlpha = rng.range(0.4, 1);
    ctx.beginPath();
    ctx.arc(rng.range(0, W), rng.range(0, H), r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 3;
  for (let i = 0; i < 26; i++) {
    const y = rng.range(30, H - 30);
    ctx.beginPath();
    ctx.moveTo(rng.range(0, W * 0.5), y);
    ctx.lineTo(rng.range(W * 0.5, W), y + rng.range(-6, 6));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  return c;
}

/** A manila case folder's front: label box, typed number, a coffee ring. */
export function folderCanvas(seed) {
  const W = 1024;
  const H = 768;
  const c = surfaceCanvas(512, '#d8b878', { seed: `${seed}folder`, mottle: 0.08, grain: 0.05, cell: 48 });
  const [out, ctx] = makeCanvas(W, H);
  ctx.drawImage(c, 0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillRect(80, 80, 420, 150);
  ctx.strokeStyle = '#3a2a1a';
  ctx.lineWidth = 3;
  ctx.strokeRect(80, 80, 420, 150);
  ctx.fillStyle = '#2a2018';
  ctx.font = `700 34px ${MONO}`;
  ctx.fillText('CASE FILE', 104, 132);
  ctx.font = `700 44px ${MONO}`;
  ctx.fillText('No. 0427', 104, 196);
  ctx.strokeStyle = 'rgba(110,70,30,0.35)';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(820, 600, 80, 0.2, Math.PI * 1.85);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(60,40,20,0.25)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(80, 330 + i * 52);
    ctx.lineTo(620, 330 + i * 52);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(40,30,20,0.75)';
  ctx.font = `600 30px ${MONO}`;
  ['SUBJECT: the last suspect', 'MOTIVE: confirmed', 'ALIBI: did not hold', 'STATUS: solved'].forEach((l, i) => ctx.fillText(l, 90, 320 + i * 52));
  return out;
}

/** A typed report sheet. */
export function reportCanvas(seed) {
  const W = 512;
  const H = 680;
  const [c, ctx] = makeCanvas(W, H);
  ctx.fillStyle = '#f7f3ea';
  ctx.fillRect(0, 0, W, H);
  const rng = createRng(seed).fork('report');
  ctx.fillStyle = 'rgba(30,30,40,0.78)';
  ctx.font = `700 26px ${MONO}`;
  ctx.fillText('INCIDENT REPORT', 40, 60);
  for (let i = 0; i < 17; i++) {
    const w = rng.range(260, 430);
    ctx.fillStyle = `rgba(40,40,52,${rng.range(0.35, 0.6)})`;
    ctx.fillRect(40, 100 + i * 32, w, 9);
  }
  return c;
}

/** A photo print: a silhouette under a lamp. */
export function photoCanvas() {
  const W = 400;
  const H = 480;
  const [c, ctx] = makeCanvas(W, H);
  ctx.fillStyle = '#f4f1ea';
  ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(200, 150, 10, 200, 190, 260);
  g.addColorStop(0, '#9aa0a8');
  g.addColorStop(1, '#2c3036');
  ctx.fillStyle = g;
  ctx.fillRect(24, 24, W - 48, H - 120);
  ctx.fillStyle = '#15171b';
  ctx.beginPath();
  ctx.arc(200, 190, 56, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(90, 360);
  ctx.quadraticCurveTo(200, 210, 310, 360);
  ctx.fill();
  ctx.fillRect(130, 118, 140, 22);
  ctx.fillRect(160, 82, 80, 44);
  ctx.fillStyle = '#2a2a33';
  ctx.font = `700 30px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.fillText('SUSPECT #3', 200, 430);
  return c;
}

// ---------------------------------------------------------------- racing

/** Chequered pattern, `n` squares across. @param {number} n @param {number} rows */
export function checkerCanvas(n, rows) {
  const s = 32;
  const [c, ctx] = makeCanvas(n * s, rows * s);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < n; x++) {
      ctx.fillStyle = (x + y) % 2 ? '#f6f6f6' : '#141418';
      ctx.fillRect(x * s, y * s, s, s);
    }
  }
  return c;
}

/** Asphalt with lane lines. @param {number|string} seed @param {number} lanes */
export function trackCanvas(seed, lanes) {
  const base = surfaceCanvas(512, '#3a3c44', { seed: `${seed}asphalt`, mottle: 0.12, grain: 0.16, cell: 32, speckle: 0.03 });
  const W = 1024;
  const H = 1024;
  const [c, ctx] = makeCanvas(W, H);
  ctx.drawImage(base, 0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i <= lanes; i++) {
    const y = 40 + (i * (H - 80)) / lanes;
    if (i === 0 || i === lanes) ctx.fillRect(0, y - 6, W, 12);
    else for (let x = 0; x < W; x += 128) ctx.fillRect(x, y - 4, 70, 8);
  }
  return c;
}

/** Soft round glow for sprites (bokeh, light pools, bulbs). @param {string} [inner] */
export function glowCanvas(inner = '#ffffff', size = 128, hardness = 0) {
  const [c, ctx] = makeCanvas(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(Math.min(0.95, 0.15 + hardness * 0.7), rgba(inner.startsWith('#') ? inner : '#ffffff', 0.55));
  g.addColorStop(1, rgba(inner.startsWith('#') ? inner : '#ffffff', 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return c;
}

/** A bokeh disc: bright rim, soft fill (what an out-of-focus light looks like). */
export function bokehCanvas(size = 128) {
  const [c, ctx] = makeCanvas(size, size);
  const r = size / 2 - 2;
  const g = ctx.createRadialGradient(size / 2, size / 2, r * 0.2, size / 2, size / 2, r);
  g.addColorStop(0, 'rgba(255,255,255,0.35)');
  g.addColorStop(0.82, 'rgba(255,255,255,0.5)');
  g.addColorStop(0.93, 'rgba(255,255,255,0.85)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, r, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

/**
 * The backdrop: a vertical night gradient with a coloured glow behind the hero and a vignette,
 * dithered so it never bands on a TV.
 * @param {{top: string, bottom: string, glow: string, glowY?: number, glowA?: number}} o
 */
export function backdropCanvas(o) {
  const W = 960;
  const H = 540;
  const [c, ctx] = makeCanvas(W, H);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, o.top);
  g.addColorStop(1, o.bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const rg = ctx.createRadialGradient(W / 2, H * (o.glowY ?? 0.42), 0, W / 2, H * (o.glowY ?? 0.42), W * 0.55);
  rg.addColorStop(0, rgba(o.glow, o.glowA ?? 0.42));
  rg.addColorStop(0.5, rgba(o.glow, (o.glowA ?? 0.42) * 0.25));
  rg.addColorStop(1, rgba(o.glow, 0));
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, W, H);
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  const img = ctx.getImageData(0, 0, W, H);
  const rng = createRng('dither').fork('bg');
  for (let i = 0; i < img.data.length; i += 4) {
    const d = (rng.next() - 0.5) * 3;
    img.data[i] += d;
    img.data[i + 1] += d;
    img.data[i + 2] += d;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Number plate for a podium front: a big numeral with an inset bevel look. @param {string} text @param {string} color */
export function numeralCanvas(text, color) {
  const S = 256;
  const [c, ctx] = makeCanvas(S, S);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 200px ${FONT}`;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillText(text, S / 2 + 4, S / 2 + 18);
  const g = ctx.createLinearGradient(0, 40, 0, 220);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, shade(color, 0.55));
  ctx.fillStyle = g;
  ctx.fillText(text, S / 2, S / 2 + 12);
  return c;
}

/** Racer number roundel. @param {string} n @param {string} color */
export function roundelCanvas(n, color) {
  const S = 128;
  const [c, ctx] = makeCanvas(S, S);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, S / 2 - 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.fillStyle = '#15151c';
  ctx.font = `900 70px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(n, S / 2, S / 2 + 4);
  return c;
}
