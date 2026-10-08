// The typographic lockup over the 3D stage: kicker, the winner's name (each character lands on a
// spring), a light sweep across the name, the score counting up, and chips for 2nd and 3rd.
// Real DOM text: crisp at any size, selectable, read by screen readers. Driven by t like the rest.

import { countUp, outCubic, smoothstep, span, spring } from '../core/ease.js';
import { graphemes, scoreText } from '../core/params.js';

const COMPLEX_SCRIPT = /[֐-ࣿऀ-෿฀-࿿က-႟ក-៿יִ-﷿ﹰ-﻿]/;

/**
 * @typedef {object} LockupConfig
 * @property {string} kicker            e.g. "WINNER", "CASE CLOSED"
 * @property {number} y                 top of the lockup (stage px)
 * @property {number} [x]               centre x (stage px), default the middle
 * @property {number} [maxWidth]        the name shrinks to fit this
 * @property {number} [nameSize]        largest name size (px)
 * @property {number} kickerAt @property {number} nameAt @property {number} scoreAt
 * @property {number} [scoreDur] @property {number} [shineAt] @property {number} [chipsAt]
 * @property {boolean} [chips]          show 2nd/3rd chips at the bottom
 * @property {boolean} [nameHidden]     the 3D scene spells the name (words): keep it for readers only
 * @property {'center'|'left'} [align]
 * @property {number} [chipsY]
 * @property {string} [tone]            colour of the kicker
 */

/**
 * @param {HTMLElement} host  the stage's UI layer
 * @param {import('../core/params.js').WinOptions} o
 * @param {LockupConfig} cfg
 */
export function createLockup(host, o, cfg) {
  const doc = host.ownerDocument;
  const el = (/** @type {string} */ tag, /** @type {string} */ cls, /** @type {HTMLElement} */ parent) => {
    const e = doc.createElement(tag);
    e.className = cls;
    parent.appendChild(e);
    return e;
  };
  const root = el('div', `pbw-lockup${cfg.align === 'left' ? ' pbw-left' : ''}`, host);
  root.style.top = `${cfg.y}px`;
  if (cfg.x !== undefined) root.style.setProperty('--cx', `${cfg.x}px`);
  root.style.setProperty('--win', o.winner.color);
  if (cfg.tone) root.style.setProperty('--kicker', cfg.tone);

  const kicker = el('div', 'pbw-kicker', root);
  const kickerText = el('span', 'pbw-kicker-text', kicker);
  kickerText.textContent = cfg.kicker;

  const nameWrap = el('div', `pbw-name-wrap${cfg.nameHidden ? ' pbw-sr' : ''}`, root);
  const name = el('div', 'pbw-name', nameWrap);
  name.setAttribute('lang', 'und');
  const whole = COMPLEX_SCRIPT.test(o.winner.name);
  /** @type {HTMLElement[]} */
  const chars = [];
  if (whole) {
    const s = el('span', 'pbw-ch pbw-whole', name);
    s.textContent = o.winner.name;
    chars.push(s);
  } else {
    for (const g of graphemes(o.winner.name)) {
      const s = el('span', g === ' ' ? 'pbw-ch pbw-space' : 'pbw-ch', name);
      s.textContent = g === ' ' ? ' ' : g;
      chars.push(s);
    }
  }
  // the light sweep: the same characters (same layout), clipped to a moving gradient
  const shine = el('div', 'pbw-shine', nameWrap);
  shine.setAttribute('aria-hidden', 'true');
  const shineName = el('div', 'pbw-name', shine);
  for (const c of chars) {
    const s = el('span', c.className, shineName);
    s.textContent = c.textContent;
  }

  // fit: measure once at the full size, shrink to the width
  const maxW = cfg.maxWidth ?? 1640;
  let size = cfg.nameSize ?? 188;
  nameWrap.style.fontSize = `${size}px`;
  const natural = name.scrollWidth || name.getBoundingClientRect().width;
  if (natural > maxW) size = Math.max(64, Math.floor((size * maxW) / natural));
  nameWrap.style.fontSize = `${size}px`;

  const scoreRow = el('div', 'pbw-score', root);
  const scoreNum = el('span', 'pbw-score-num', scoreRow);
  const scoreLabel = el('span', 'pbw-score-label', scoreRow);
  const score = o.winner.score;
  scoreLabel.textContent = score && score.value !== null ? o.scoreLabel : '';
  if (!score) scoreRow.style.display = 'none';

  /** @type {HTMLElement[]} */
  const chipEls = [];
  if (cfg.chips) {
    const row = el('div', 'pbw-chips', host);
    if (cfg.chipsY !== undefined) row.style.top = `${cfg.chipsY}px`;
    for (const [place, p] of /** @type {const} */ ([
      [2, o.second],
      [3, o.third],
    ])) {
      if (!p) continue;
      const chip = el('div', `pbw-chip pbw-place-${place}`, row);
      chip.style.setProperty('--pc', p.color);
      const medal = el('span', 'pbw-medal', chip);
      medal.textContent = place === 2 ? '2nd' : '3rd';
      const nm = el('span', 'pbw-chip-name', chip);
      nm.textContent = p.name;
      if (p.score) {
        const sc = el('span', 'pbw-chip-score', chip);
        sc.textContent = p.score.text;
      }
      chipEls.push(chip);
    }
  }

  const shineAt = cfg.shineAt ?? cfg.nameAt + 0.9;
  const scoreDur = cfg.scoreDur ?? 1.1;
  const chipsAt = cfg.chipsAt ?? cfg.scoreAt + 0.3;
  const stagger = Math.min(0.045, 0.5 / Math.max(1, chars.length));

  return {
    root,
    /** @param {number} t */
    update(t) {
      // kicker: letters close in, lines draw out
      const ku = span(t, cfg.kickerAt, cfg.kickerAt + 0.6);
      kicker.style.opacity = String(smoothstep(ku * 1.6));
      kicker.style.setProperty('--spread', String(1 - outCubic(ku)));
      kicker.style.transform = `translateY(${(1 - outCubic(ku)) * 18}px)`;
      // name: characters rise and settle on a spring, whole word settles in scale
      const nu = span(t, cfg.nameAt, cfg.nameAt + 1.4);
      name.style.transform = `scale(${1 + 0.05 * (1 - outCubic(nu))})`;
      chars.forEach((c, i) => {
        const t0 = cfg.nameAt + i * stagger;
        const u = span(t, t0, t0 + 0.62);
        const s = spring(u, 0.62);
        const a = smoothstep(u * 2.4);
        c.style.opacity = a.toFixed(3);
        c.style.transform = u >= 1 ? 'none' : `translate3d(0, ${((1 - s) * 0.42).toFixed(4)}em, 0) rotateX(${((1 - s) * -75).toFixed(2)}deg) scale(${(0.86 + 0.14 * s).toFixed(4)})`;
      });
      const su = span(t, shineAt, shineAt + 0.85);
      shine.style.opacity = su > 0 && su < 1 ? '1' : '0';
      shine.style.backgroundPosition = `${(-60 + 220 * outCubic(su)).toFixed(1)}% 0`;
      // score
      if (score) {
        const ru = span(t, cfg.scoreAt, cfg.scoreAt + 0.4);
        scoreRow.style.opacity = smoothstep(ru * 1.5).toFixed(3);
        const pop = span(t, cfg.scoreAt + scoreDur, cfg.scoreAt + scoreDur + 0.45);
        const popK = pop > 0 && pop < 1 ? Math.sin(Math.PI * pop) * 0.09 * (1 - pop) : 0;
        scoreRow.style.transform = `translateY(${((1 - outCubic(ru)) * 26).toFixed(2)}px) scale(${(1 + popK).toFixed(4)})`;
        const v = score.value === null ? null : countUp(t, cfg.scoreAt, scoreDur, score.value);
        scoreNum.textContent = v === null ? score.text : scoreText(score, v);
      }
      chipEls.forEach((c, i) => {
        const u = span(t, chipsAt + i * 0.12, chipsAt + i * 0.12 + 0.55);
        const s = spring(u, 0.72);
        c.style.opacity = smoothstep(u * 2).toFixed(3);
        c.style.transform = `translateY(${((1 - s) * 60).toFixed(2)}px)`;
      });
    },
    /** Text a screen reader hears. */
    summary() {
      const parts = [`${o.winner.name} wins${o.winner.score ? ` with ${o.winner.score.text}${o.winner.score.value !== null ? ` ${o.scoreLabel}` : ''}` : ''}.`];
      if (o.second) parts.push(`Second: ${o.second.name}${o.second.score ? `, ${o.second.score.text}` : ''}.`);
      if (o.third) parts.push(`Third: ${o.third.name}${o.third.score ? `, ${o.third.score.text}` : ''}.`);
      return parts.join(' ');
    },
  };
}
