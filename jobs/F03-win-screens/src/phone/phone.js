// The phone's compact winner moment (390 x 844): a winner card that flips in with the ending's
// emblem, the name and the score, "you placed 2nd" for the phone's own player, the top three,
// and confetti from the same paper integrator as the TV (projected in 2D, no WebGL needed).

import { countUp, outCubic, smoothstep, span, spring, wobble } from '../core/ease.js';
import { createConfetti, qrot } from '../core/confetti.js';
import { graphemes, myPlace, scoreText } from '../core/params.js';
import { confettiPalette } from '../core/palette.js';
import { motif } from './motifs.js';

export const PHONE_DURATION = 3.2;

const KICKERS = /** @type {Record<string, string>} */ ({
  default: 'WINNER',
  cards: 'TOP HAND',
  dice: 'BEST ROLL',
  board: 'OWNS THE BOARD',
  trivia: 'QUIZ CHAMPION',
  drawing: 'BEST IN SHOW',
  detective: 'CASE CLOSED',
  racing: 'FIRST ACROSS',
  words: 'WORD MASTER',
});

const ORD = ['', '1st', '2nd', '3rd'];

/**
 * @param {HTMLElement} ui @param {import('../core/params.js').WinOptions} o
 * @param {import('../core/rng.js').Rng} rng @param {ReturnType<typeof import('../ui/fx2d.js').createFx>} fx
 */
export function createPhone(ui, o, rng, fx) {
  const doc = ui.ownerDocument;
  const el = (/** @type {string} */ tag, /** @type {string} */ cls, /** @type {HTMLElement} */ parent, text = '') => {
    const e = doc.createElement(tag);
    e.className = cls;
    if (text) e.textContent = text;
    parent.appendChild(e);
    return e;
  };
  ui.style.setProperty('--win', o.winner.color);
  const bg = el('div', 'pbw-pbg', ui);
  const head = el('header', 'pbw-phead', ui);
  el('span', 'pbw-pmark', head, 'PartyBox');
  el('span', 'pbw-pgame', head, 'Results');

  const cardWrap = el('div', 'pbw-pcard-wrap', ui);
  const card = el('div', 'pbw-pcard', cardWrap);
  const sheen = el('div', 'pbw-psheen', card);
  const art = motif(o.ending, o);
  card.appendChild(art.svg);
  const kicker = el('div', 'pbw-pkicker', card, KICKERS[o.ending] ?? 'WINNER');
  const nameEl = el('div', 'pbw-pname', card);
  /** @type {HTMLElement[]} */
  const chars = graphemes(o.winner.name).map((g) => el('span', 'pbw-ch', nameEl, g === ' ' ? ' ' : g));
  // fit the name to the card
  let fs = 58;
  nameEl.style.fontSize = `${fs}px`;
  const w = nameEl.scrollWidth;
  if (w > 300) fs = Math.max(26, Math.floor((fs * 300) / w));
  nameEl.style.fontSize = `${fs}px`;
  const scoreRow = el('div', 'pbw-pscore', card);
  const scoreNum = el('span', 'pbw-score-num', scoreRow);
  el('span', 'pbw-score-label', scoreRow, o.winner.score && o.winner.score.value !== null ? o.scoreLabel : '');
  if (!o.winner.score) scoreRow.style.display = 'none';

  const place = myPlace(o);
  const mine = el('div', `pbw-pmine${place === 1 ? ' pbw-pmine-win' : ''}`, ui);
  if (place) {
    const me = place === 1 ? o.winner : place === 2 ? o.second : o.third;
    el('div', 'pbw-pmine-k', mine, place === 1 ? 'THAT’S YOU' : 'YOU PLACED');
    el('div', 'pbw-pmine-v', mine, place === 1 ? 'You won!' : ORD[place]);
    if (me?.score) el('div', 'pbw-pmine-s', mine, `${me.score.text}${me.score.value !== null ? ` ${o.scoreLabel}` : ''}`);
  } else mine.style.display = 'none';

  const list = el('div', 'pbw-plist', ui);
  /** @type {HTMLElement[]} */
  const rows = [];
  for (const [p, rank] of /** @type {const} */ ([
    [o.winner, 1],
    [o.second, 2],
    [o.third, 3],
  ])) {
    if (!p) continue;
    const row = el('div', `pbw-prow pbw-place-${rank}${place === rank ? ' pbw-prow-me' : ''}`, list);
    row.style.setProperty('--pc', p.color);
    el('span', 'pbw-medal', row, ORD[rank]);
    el('span', 'pbw-prow-name', row, p.name);
    el('span', 'pbw-prow-score', row, p.score ? p.score.text : '');
    rows.push(row);
  }
  if (!place) list.classList.add('pbw-plist-up');

  // confetti: the TV's paper model, in a 3.9 x 8.44 unit box (1 unit = 100 px), falling past the bottom
  const palette = confettiPalette(o.winner.color);
  const sim = createConfetti({
    seed: `${o.seed}phone`,
    colors: palette.length,
    foil: 0.18,
    emitters: [
      { at: 0.12, spread: 0.1, count: 50, pos: [-2.2, -8.2, 0], jitter: [0.1, 0.1, 0.3], dir: [0.38, 1, 0], cone: 0.26, speed: [10, 14] },
      { at: 0.18, spread: 0.1, count: 50, pos: [2.2, -8.2, 0], jitter: [0.1, 0.1, 0.3], dir: [-0.38, 1, 0], cone: 0.26, speed: [10, 14] },
      { at: 0.25, spread: 0.45, count: 50, pos: [0, 0.6, 0], jitter: [2.2, 0.4, 0.4], dir: [0, -1, 0], cone: 0.6, speed: [0.5, 1.8] },
    ],
    size: [0.13, 0.07],
    floorY: -20,
    boundsX: 3,
    fadeStart: 2.7,
    fadeEnd: 3.1,
  });
  const light = [0.35, 0.6, 0.72];

  // sparks from the corners
  fx.burst({ t: 0.12, x: 0, y: 844, count: 14, speed: [500, 1000], angle: -1.05, spread: 0.35, colors: ['#ffd166', '#ffffff', o.winner.color], life: [0.3, 0.7], g: 1200 });
  fx.burst({ t: 0.18, x: 390, y: 844, count: 14, speed: [500, 1000], angle: -2.09, spread: 0.35, colors: ['#ffd166', '#ffffff', o.winner.color], life: [0.3, 0.7], g: 1200 });
  if (o.ending === 'detective') fx.ring({ t: 0.95, x: 195, y: 210, r1: 220, dur: 0.45, color: '#ff7b8f', squash: 0.6 });
  if (o.ending === 'trivia') fx.flash(0.92, 0.35, '#ffffff', 0.35);

  const score = o.winner.score;
  const stagger = Math.min(0.04, 0.4 / Math.max(1, chars.length));

  return {
    beats: [
      { t: 0.12, name: 'pop' },
      { t: 0.2, name: 'card' },
      { t: 0.8, name: 'name' },
      { t: 2.15, name: 'score' },
    ],
    summary() {
      const you = place ? ` You placed ${ORD[place]}.` : '';
      return `${o.winner.name} wins${score ? ` with ${score.text}${score.value !== null ? ` ${o.scoreLabel}` : ''}` : ''}.${you}`;
    },
    /** @param {number} t @param {CanvasRenderingContext2D} ctx */
    update(t, ctx) {
      bg.style.opacity = smoothstep(span(t, 0, 0.35)).toFixed(3);
      head.style.opacity = smoothstep(span(t, 0.05, 0.4)).toFixed(3);
      // card flips in on a spring; a detective stamp shakes it
      const cu = span(t, 0.15, 0.95);
      const cs = spring(cu, 0.7);
      const shake = o.ending === 'detective' ? wobble(t, 0.95, 0.4, 3) * 5 : 0;
      card.style.opacity = smoothstep(cu * 3).toFixed(3);
      card.style.transform = cu >= 1 && !shake ? 'none' : `translate3d(${shake.toFixed(2)}px, ${((1 - cs) * 60).toFixed(2)}px, 0) rotateY(${((1 - cs) * -95).toFixed(2)}deg) scale(${(0.86 + 0.14 * cs).toFixed(4)})`;
      art.update(t);
      const ku = span(t, 0.6, 1.1);
      kicker.style.opacity = smoothstep(ku * 1.5).toFixed(3);
      kicker.style.letterSpacing = `${(0.32 + 0.3 * (1 - outCubic(ku))).toFixed(3)}em`;
      chars.forEach((c, i) => {
        const u = span(t, 0.78 + i * stagger, 1.33 + i * stagger);
        const s = spring(u, 0.62);
        c.style.opacity = smoothstep(u * 2.4).toFixed(3);
        c.style.transform = u >= 1 ? 'none' : `translateY(${((1 - s) * 0.45).toFixed(4)}em) scale(${(0.8 + 0.2 * s).toFixed(4)})`;
      });
      if (score) {
        const ru = span(t, 1.0, 1.35);
        scoreRow.style.opacity = smoothstep(ru * 1.5).toFixed(3);
        const v = score.value === null ? null : countUp(t, 1.05, 1.1, score.value);
        scoreNum.textContent = v === null ? score.text : scoreText(score, v);
        const pop = span(t, 2.15, 2.55);
        scoreRow.style.transform = `scale(${(1 + (pop > 0 && pop < 1 ? Math.sin(Math.PI * pop) * 0.1 * (1 - pop) : 0)).toFixed(4)})`;
      }
      const su = span(t, 1.35, 2.15);
      sheen.style.opacity = su > 0 && su < 1 ? '1' : '0';
      sheen.style.transform = `translateX(${(-120 + 260 * outCubic(su)).toFixed(1)}%) skewX(-18deg)`;
      const mu = span(t, 1.45, 2.05);
      mine.style.opacity = smoothstep(mu * 2).toFixed(3);
      mine.style.transform = `translateY(${((1 - spring(mu, 0.72)) * 40).toFixed(2)}px)`;
      rows.forEach((r, i) => {
        const u = span(t, 1.6 + i * 0.1, 2.15 + i * 0.1);
        r.style.opacity = smoothstep(u * 2).toFixed(3);
        r.style.transform = `translateY(${((1 - spring(u, 0.72)) * 30).toFixed(2)}px)`;
      });
      // confetti (behind the card: this canvas is under the UI layer)
      sim.advanceTo(t);
      fx.draw(ctx, t, 390, 844);
      ctx.save();
      let drawn = 0;
      for (let i = 0; i < sim.pieces.length; i++) {
        const p = sim.pieces[i];
        const ps = sim.pose(i, t);
        if (ps.alpha <= 0.001) continue;
        const persp = 1 / (1 - ps.p[2] * 0.12);
        const cx = 195 + ps.p[0] * 100 * persp;
        const cy = -ps.p[1] * 100 * persp;
        if (cy < -20 || cy > 864) continue;
        const L = qrot(ps.q, [p.sw * 50 * persp * ps.alpha, 0, 0]);
        const B = qrot(ps.q, [0, p.sh * 50 * persp * ps.alpha, 0]);
        const n = qrot(ps.q, [0, 0, 1]);
        const facing = n[2] >= 0;
        const lit = 0.5 + 0.5 * Math.abs(n[0] * light[0] + n[1] * light[1] + n[2] * light[2]);
        let col = palette[p.color];
        let k = lit;
        if (!facing) k *= 0.78;
        if (p.foil) {
          const spec = Math.max(0, n[2]) ** 6;
          col = ['#ffd27a', '#e8ecf5', '#ffb3c8'][p.color % 3];
          k = 0.55 + 0.45 * lit + spec * 0.8;
        }
        ctx.fillStyle = tint(col, k, !facing && !p.foil ? 0.18 : 0);
        ctx.beginPath();
        ctx.moveTo(cx + L[0] + B[0], cy - L[1] - B[1]);
        ctx.lineTo(cx - L[0] + B[0], cy + L[1] - B[1]);
        ctx.lineTo(cx - L[0] - B[0], cy + L[1] + B[1]);
        ctx.lineTo(cx + L[0] - B[0], cy - L[1] + B[1]);
        ctx.closePath();
        ctx.fill();
        drawn++;
      }
      ctx.restore();
      if (drawn) ctx.canvas.style.visibility = 'visible';
    },
    pose() {
      return sim.pieces.map((p, i) => {
        const ps = sim.pose(i, PHONE_DURATION);
        return [ps.alpha, ...ps.p.map((v) => Math.round(v * 1e4) / 1e4)];
      });
    },
    dispose() {
      ui.replaceChildren();
    },
  };
}

/** @param {string} hex @param {number} k brightness @param {number} white mix toward white */
function tint(hex, k, white) {
  const n = parseInt(hex.slice(1), 16);
  const f = (/** @type {number} */ c) => Math.max(0, Math.min(255, Math.round((c + (255 - c) * white) * k)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
