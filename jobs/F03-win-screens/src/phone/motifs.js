// Small animated SVG emblems for the phone's winner card, one per ending. Each returns its <svg>
// and an update(t) that poses its parts; every motion ends inside the phone's 3.2 s.

import { outCubic, outQuart, smoothstep, span, spring, wobble } from '../core/ease.js';
import { graphemes } from '../core/params.js';

const NS = 'http://www.w3.org/2000/svg';

/**
 * @param {string} tag @param {Record<string, string|number>} attrs @param {Element} [parent]
 * @returns {SVGElement}
 */
function s(tag, attrs, parent) {
  const e = /** @type {SVGElement} */ (document.createElementNS(NS, tag));
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  parent?.appendChild(e);
  return e;
}

/** @param {SVGElement} e @param {string} tr */
const pose = (e, tr) => e.setAttribute('transform', tr);

const HEART = 'M0 14 C-9 6 -15 1 -15 -6 C-15 -12 -11 -15 -7 -15 C-4 -15 -1 -13 0 -10 C1 -13 4 -15 7 -15 C11 -15 15 -12 15 -6 C15 1 9 6 0 14Z';
const SPADE = 'M0 -15 C-8 -7 -15 -2 -15 4 C-15 10 -11 12 -7 12 C-4 12 -2 10 -1 8 C-2 12 -4 14 -6 15 L6 15 C4 14 2 12 1 8 C2 10 4 12 7 12 C11 12 15 10 15 4 C15 -2 8 -7 0 -15Z';

/**
 * @param {string} ending @param {import('../core/params.js').WinOptions} o
 * @returns {{svg: SVGElement, update: (t: number) => void}}
 */
export function motif(ending, o) {
  const svg = s('svg', { viewBox: '-160 -90 320 180', class: 'pbw-motif', 'aria-hidden': 'true' });
  const defs = s('defs', {}, svg);
  const goldG = s('linearGradient', { id: 'pbw-gold', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  s('stop', { offset: 0, 'stop-color': '#fff1b8' }, goldG);
  s('stop', { offset: 0.5, 'stop-color': '#ffc94a' }, goldG);
  s('stop', { offset: 1, 'stop-color': '#c98a12' }, goldG);
  const win = o.winner.color;

  // shared: a burst of rays behind every emblem
  const raysG = s('g', { opacity: 0 }, svg);
  for (let i = 0; i < 12; i++) {
    s('path', { d: 'M-6 0 L6 0 L22 -120 L-22 -120Z', fill: i % 2 ? '#ffffff' : win, opacity: 0.16, transform: `rotate(${i * 30})` }, raysG);
  }
  const updRays = (/** @type {number} */ t) => {
    raysG.setAttribute('opacity', smoothstep(span(t, 0.45, 1.1)).toFixed(3));
    pose(raysG, `rotate(${(outCubic(span(t, 0.4, 3.0)) * 40).toFixed(2)})`);
  };

  if (ending === 'cards') {
    const cards = [-1, 0, 1].map((k) => {
      const g = s('g', {}, svg);
      s('rect', { x: -34, y: -50, width: 68, height: 96, rx: 8, fill: '#fbf8f1', stroke: '#d9d2c2', 'stroke-width': 1.5 }, g);
      s('text', { x: -26, y: -30, 'font-size': 18, 'font-weight': 900, fill: k === 0 ? '#c8102e' : '#16161d', 'font-family': 'inherit' }, g).textContent = 'A';
      s('path', { d: k === 0 ? HEART : SPADE, fill: k === 0 ? '#c8102e' : '#16161d', transform: 'translate(0 2) scale(1.5)' }, g);
      return { g, k };
    });
    return {
      svg,
      update(t) {
        updRays(t);
        for (const c of cards) {
          const u = spring(span(t, 0.55 + Math.abs(c.k) * 0.05, 1.25), 0.68);
          pose(c.g, `translate(${(c.k * 38 * u).toFixed(2)} ${(18 - 18 * u + Math.abs(c.k) * 8 * u).toFixed(2)}) rotate(${(c.k * 16 * u).toFixed(2)} 0 60)`);
        }
      },
    };
  }
  if (ending === 'dice') {
    const pips = /** @type {Record<number, number[][]>} */ ({ 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] });
    const dice = [-1, 1].map((k, i) => {
      const g = s('g', {}, svg);
      s('rect', { x: -32, y: -32, width: 64, height: 64, rx: 13, fill: '#fffaf0', stroke: '#d8ccb2', 'stroke-width': 2 }, g);
      for (const [x, y] of pips[6]) s('circle', { cx: x * 15, cy: y * 18, r: 6.2, fill: '#1b1d3a' }, g);
      return { g, k, i };
    });
    return {
      svg,
      update(t) {
        updRays(t);
        for (const d of dice) {
          const u = span(t, 0.45 + d.i * 0.12, 1.35 + d.i * 0.12);
          const x = -220 + (d.k * 40 + 220) * outQuart(u);
          const hop = Math.abs(Math.sin(u * Math.PI * 2.5)) * 40 * (1 - u) ** 1.5;
          const rot = (1 - outCubic(u)) * 540 + wobble(t, 1.35 + d.i * 0.12, 0.4, 1.5) * 6;
          pose(d.g, `translate(${x.toFixed(2)} ${(6 - hop).toFixed(2)}) rotate(${rot.toFixed(2)})`);
        }
      },
    };
  }
  if (ending === 'board') {
    const deeds = ['#d62b2b', '#f2cf1d', '#1f9d55'].map((c, i) => {
      const g = s('g', {}, svg);
      s('rect', { x: -36, y: -48, width: 72, height: 92, rx: 4, fill: '#fbf7ec', stroke: '#2a2a33', 'stroke-width': 2 }, g);
      s('rect', { x: -30, y: -42, width: 60, height: 22, fill: c }, g);
      for (let r = 0; r < 4; r++) s('rect', { x: -26, y: -10 + r * 12, width: 52, height: 3, fill: '#c9c4b6' }, g);
      return { g, i };
    });
    return {
      svg,
      update(t) {
        updRays(t);
        for (const d of deeds) {
          const u = spring(span(t, 0.55 + d.i * 0.06, 1.3 + d.i * 0.06), 0.7);
          pose(d.g, `rotate(${((d.i - 1) * 22 * u).toFixed(2)} 0 70) translate(0 ${(30 * (1 - u)).toFixed(2)})`);
        }
      },
    };
  }
  if (ending === 'trivia') {
    const base = s('g', {}, svg);
    s('rect', { x: -56, y: 22, width: 112, height: 30, rx: 8, fill: '#272a52' }, base);
    const dome = s('ellipse', { cx: 0, cy: 22, rx: 44, ry: 30, fill: '#ef476f' }, base);
    s('ellipse', { cx: -14, cy: 8, rx: 14, ry: 7, fill: '#ffffff', opacity: 0.45 }, base);
    const flash = s('circle', { cx: 0, cy: 0, r: 120, fill: '#ffffff', opacity: 0 }, svg);
    return {
      svg,
      update(t) {
        updRays(t);
        const press = span(t, 0.85, 0.95) - span(t, 0.95, 1.25);
        dome.setAttribute('ry', (30 - 12 * Math.max(0, press)).toFixed(2));
        dome.setAttribute('cy', (22 + 6 * Math.max(0, press)).toFixed(2));
        const f = span(t, 0.92, 1.5);
        flash.setAttribute('opacity', (f > 0 && f < 1 ? 0.7 * (1 - f) ** 2 : 0).toFixed(3));
      },
    };
  }
  if (ending === 'drawing') {
    const g = s('g', {}, svg);
    s('rect', { x: -66, y: -54, width: 132, height: 104, rx: 3, fill: 'url(#pbw-gold)' }, g);
    s('rect', { x: -56, y: -44, width: 112, height: 84, fill: '#fdfaf2' }, g);
    s('path', { d: 'M-24 -24 L24 -24 L20 4 L0 16 L-20 4Z M-24 -18 L-36 -18 L-32 -4 L-20 0 M24 -18 L36 -18 L32 -4 L20 0 M0 16 L0 26 M-14 30 L14 30', fill: 'none', stroke: win, 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
    return {
      svg,
      update(t) {
        updRays(t);
        const u = spring(span(t, 0.5, 1.2), 0.7);
        const swing = wobble(t, 1.0, 1.2, 2) * 7;
        pose(g, `translate(0 ${(-60 * (1 - u)).toFixed(2)}) rotate(${swing.toFixed(2)} 0 -70)`);
      },
    };
  }
  if (ending === 'detective') {
    const g = s('g', {}, svg);
    s('rect', { x: -112, y: -34, width: 224, height: 68, rx: 10, fill: 'none', stroke: '#c3122f', 'stroke-width': 6 }, g);
    const tx = s('text', { x: 0, y: 12, 'text-anchor': 'middle', 'font-size': 34, 'font-weight': 900, fill: '#c3122f', 'letter-spacing': 2 }, g);
    tx.textContent = 'CASE CLOSED';
    return {
      svg,
      update(t) {
        updRays(t);
        const u = span(t, 0.75, 0.95);
        const sc = u < 1 ? 2.4 - 1.4 * outCubic(u) : 1 + wobble(t, 0.95, 0.35, 1.5) * 0.04;
        g.setAttribute('opacity', smoothstep(span(t, 0.7, 0.8)).toFixed(3));
        pose(g, `rotate(-8) scale(${sc.toFixed(4)})`);
      },
    };
  }
  if (ending === 'racing') {
    const g = s('g', {}, svg);
    s('rect', { x: -78, y: -50, width: 6, height: 120, fill: '#cfd3de' }, g);
    const flag = s('g', {}, g);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 6; x++) s('rect', { x: -72 + x * 22, y: -50 + y * 18, width: 22, height: 18, fill: (x + y) % 2 ? '#f6f6f6' : '#141418' }, flag);
    return {
      svg,
      update(t) {
        updRays(t);
        const u = spring(span(t, 0.45, 1.1), 0.7);
        const wave = wobble(t, 0.6, 2.2, 3) * 0.18;
        pose(g, `translate(${(-140 * (1 - u)).toFixed(2)} 0) rotate(${(-10 * (1 - u)).toFixed(2)})`);
        pose(flag, `skewY(${(wave * 40).toFixed(2)}) scale(1 ${(1 - Math.abs(wave) * 0.2).toFixed(3)})`);
      },
    };
  }
  if (ending === 'words') {
    const letters = graphemes(o.winner.name.toLocaleUpperCase()).filter((c) => c.trim()).slice(0, 6);
    const n = letters.length;
    const size = Math.min(44, 280 / Math.max(1, n) - 4);
    const tiles = letters.map((ch, i) => {
      const g = s('g', {}, svg);
      s('rect', { x: -size / 2, y: -size / 2, width: size, height: size, rx: size * 0.14, fill: '#f6e6c4', stroke: '#c9a46a', 'stroke-width': 1.5 }, g);
      const tx = s('text', { x: 0, y: size * 0.18, 'text-anchor': 'middle', 'font-size': size * 0.58, 'font-weight': 900, fill: '#2a1a0c' }, g);
      tx.textContent = ch;
      return { g, i, x: (i - (n - 1) / 2) * (size + 6) };
    });
    return {
      svg,
      update(t) {
        updRays(t);
        for (const tl of tiles) {
          const u = spring(span(t, 0.5 + tl.i * 0.08, 1.15 + tl.i * 0.08), 0.68);
          const sx = (tl.i % 2 ? 1 : -1) * 170;
          pose(tl.g, `translate(${(sx + (tl.x - sx) * u).toFixed(2)} ${(-90 * (1 - u) + 10).toFixed(2)}) rotate(${((1 - u) * (tl.i % 2 ? 160 : -160)).toFixed(2)})`);
        }
      },
    };
  }
  // default: a gold trophy
  const g = s('g', {}, svg);
  s('path', { d: 'M-34 -56 L34 -56 L30 -10 C26 8 12 18 0 20 C-12 18 -26 8 -30 -10Z', fill: 'url(#pbw-gold)' }, g);
  s('path', { d: 'M-32 -46 C-56 -46 -58 -14 -26 -6 M32 -46 C56 -46 58 -14 26 -6', fill: 'none', stroke: '#e9b23a', 'stroke-width': 7 }, g);
  s('rect', { x: -6, y: 18, width: 12, height: 20, fill: '#d79b20' }, g);
  s('rect', { x: -30, y: 36, width: 60, height: 16, rx: 4, fill: '#272a52' }, g);
  s('path', { d: 'M-14 -50 L-20 -16', stroke: '#fffbe6', 'stroke-width': 5, 'stroke-linecap': 'round', opacity: 0.7 }, g);
  return {
    svg,
    update(t) {
      updRays(t);
      const u = spring(span(t, 0.5, 1.15), 0.62);
      pose(g, `translate(0 ${(40 * (1 - u)).toFixed(2)}) scale(${(0.4 + 0.6 * u).toFixed(4)})`);
    },
  };
}
