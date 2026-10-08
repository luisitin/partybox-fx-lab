// What the page was asked to show, from the URL or from PartyBoxWin.play(options).
// Pure: no DOM, no window. Every field is validated; anything odd falls back to a safe default,
// and names are only ever rendered as text (never as HTML).

export const ENDINGS = /** @type {const} */ ([
  'default',
  'cards',
  'dice',
  'board',
  'trivia',
  'drawing',
  'detective',
  'racing',
  'words',
]);

/** PartyBox player colours 1-8 (packages/client/src/styles/tokens.css). */
export const PLAYER_COLORS = /** @type {const} */ ([
  '#ff5d8f',
  '#ffd166',
  '#06d6a0',
  '#4cc9f0',
  '#b388ff',
  '#ff9f43',
  '#48dbfb',
  '#f368e0',
]);

const MAX_NAME = 24;
const MAX_SCORE_TEXT = 16;

/**
 * @typedef {object} Score
 * @property {string} text      what the settled frame shows, e.g. "42", "$13,900", "3:42"
 * @property {number|null} value numeric part to count up to, or null (shown as is)
 * @property {string} prefix
 * @property {string} suffix
 * @property {boolean} grouped  show thousands separators while counting
 * @property {number} decimals
 */

/**
 * @typedef {object} Player
 * @property {string} name
 * @property {Score|null} score
 * @property {string} color  #rrggbb
 */

/**
 * @typedef {object} WinOptions
 * @property {'tv'|'phone'} view
 * @property {typeof ENDINGS[number]} ending
 * @property {string} seed        the seed as given (hashed by createRng)
 * @property {Player} winner
 * @property {Player|null} second
 * @property {Player|null} third
 * @property {string|null} me     the phone's own player name (phone view: "you placed 2nd")
 * @property {string} scoreLabel  word under the score, e.g. "points"
 * @property {boolean} kiosk      hide the demo bar
 * @property {'raf'|'manual'} clock   manual = only window.__winStep(ms) moves time (tests)
 * @property {'auto'|'reduce'|'full'} motion
 * @property {'auto'|'high'|'medium'|'low'} quality
 * @property {number[]} dice      faces the dice ending settles on (1-6, up to 5 dice)
 */

/**
 * Splits text into user-perceived characters (an emoji with a skin tone is one).
 * @param {string} text
 * @returns {string[]}
 */
export function graphemes(text) {
  const Seg = /** @type {any} */ (Intl).Segmenter;
  if (typeof Seg === 'function') {
    return Array.from(new Seg('en', { granularity: 'grapheme' }).segment(text), (s) => /** @type {{segment: string}} */ (s).segment);
  }
  return Array.from(text);
}

/**
 * A display name: control and bidi-override characters removed, whitespace collapsed,
 * at most MAX_NAME characters (an ellipsis marks a cut).
 * @param {unknown} raw @param {string} fallback
 */
export function cleanName(raw, fallback) {
  if (typeof raw !== 'string' && typeof raw !== 'number') return fallback;
  const text = String(raw)
    .replace(/[\u0000-\u001f\u007f-\u009f​‎‏‪-‮⁦-⁩﻿]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return fallback;
  const chars = graphemes(text);
  return chars.length > MAX_NAME ? `${chars.slice(0, MAX_NAME - 1).join('').trimEnd()}…` : text;
}

/**
 * #rgb / #rrggbb / rgb / rrggbb → #rrggbb (lower case), else the fallback.
 * @param {unknown} raw @param {string} fallback
 */
export function cleanColor(raw, fallback) {
  if (typeof raw !== 'string') return fallback;
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(raw.trim());
  if (!m) return fallback;
  const hex = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  return `#${hex.toLowerCase()}`;
}

/**
 * A score as given: a number counts up; "$13,900" counts up with its $ and comma; "3:42" or
 * "DNF" is shown as is.
 * @param {unknown} raw
 * @returns {Score|null}
 */
export function parseScore(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return null;
    const decimals = Number.isInteger(raw) ? 0 : Math.min(2, (String(raw).split('.')[1] ?? '').length);
    return { text: formatNumber(raw, false, decimals), value: raw, prefix: '', suffix: '', grouped: false, decimals };
  }
  if (typeof raw !== 'string') return null;
  const text = raw.replace(/[\u0000-\u001f\u007f-\u009f]/g, '').trim().slice(0, MAX_SCORE_TEXT);
  if (!text) return null;
  const m = /^([^\d\-+]{0,3}?)([-+]?\d[\d,]*(?:\.\d{1,2})?)([^\d:]{0,6})$/.exec(text);
  if (m && !/,,/.test(m[2]) && !/,\d{0,2}$/.test(m[2].split('.')[0])) {
    const grouped = m[2].includes(',');
    const value = Number(m[2].replace(/,/g, ''));
    if (Number.isFinite(value)) {
      const decimals = (m[2].split('.')[1] ?? '').length;
      return { text, value, prefix: m[1], suffix: m[3], grouped, decimals };
    }
  }
  return { text, value: null, prefix: '', suffix: '', grouped: false, decimals: 0 };
}

/**
 * @param {number} n @param {boolean} grouped @param {number} decimals
 */
export function formatNumber(n, grouped, decimals) {
  const fixed = Math.abs(n).toFixed(decimals);
  const [int, frac] = fixed.split('.');
  const body = grouped ? int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : int;
  return `${n < 0 && Number(fixed) !== 0 ? '-' : ''}${body}${frac ? `.${frac}` : ''}`;
}

/**
 * The score text at a counted value (same prefix, suffix and separators as the final text).
 * @param {Score} score @param {number} v
 */
export function scoreText(score, v) {
  if (score.value === null) return score.text;
  if (v === score.value) return score.text;
  return `${score.prefix}${formatNumber(v, score.grouped, score.decimals)}${score.suffix}`;
}

/**
 * "Ben:30" → {name: 'Ben', score: '30'}. The first colon splits (a name cannot hold one in a URL;
 * use the JS API for that). No colon: a name with no score.
 * @param {string} raw
 */
export function splitEntry(raw) {
  const i = raw.indexOf(':');
  return i < 0 ? { name: raw, score: null } : { name: raw.slice(0, i), score: raw.slice(i + 1) };
}

/**
 * The first player colour not already taken.
 * @param {string[]} taken
 */
function freeColor(taken, preferred) {
  for (const c of [preferred, ...PLAYER_COLORS]) if (!taken.includes(c)) return c;
  return preferred;
}

/**
 * @param {unknown} raw  a string "Name:score", an object {name, score, color}, or nothing
 * @param {string} fallbackName  '' = optional (null when missing)
 * @param {string} color
 * @returns {Player|null}
 */
function toPlayer(raw, fallbackName, color) {
  if (raw === null || raw === undefined || raw === '' || raw === false) {
    return fallbackName ? { name: fallbackName, score: null, color } : null;
  }
  if (typeof raw === 'string') {
    const { name, score } = splitEntry(raw);
    const clean = cleanName(name, fallbackName);
    if (!clean) return null;
    return { name: clean, score: parseScore(score), color };
  }
  if (typeof raw === 'object') {
    const o = /** @type {Record<string, unknown>} */ (raw);
    const clean = cleanName(o.name, fallbackName);
    if (!clean) return null;
    return { name: clean, score: parseScore(o.score), color: cleanColor(o.color, color) };
  }
  return fallbackName ? { name: fallbackName, score: null, color } : null;
}

/**
 * Turns loose input (URL fields or play() options) into validated WinOptions.
 * @param {Record<string, unknown>} input
 * @param {{ portrait?: boolean, prefersReduced?: boolean }} [env]
 * @returns {WinOptions}
 */
export function normalizeOptions(input, env = {}) {
  const ending = /** @type {WinOptions['ending']} */ (
    ENDINGS.includes(/** @type {any} */ (input.ending)) ? input.ending : 'default'
  );
  const view = input.view === 'phone' || input.view === 'tv' ? input.view : env.portrait ? 'phone' : 'tv';
  const winnerColor = cleanColor(
    typeof input.winner === 'object' && input.winner ? /** @type {any} */ (input.winner).color ?? input.color : input.color,
    PLAYER_COLORS[0],
  );
  let winner = /** @type {Player} */ (toPlayer(input.winner, 'Ana', winnerColor));
  if (input.score !== undefined && (typeof input.winner !== 'object' || input.winner === null)) {
    winner = { ...winner, score: parseScore(input.score) };
  }
  const secondColor = freeColor([winner.color], cleanColor(input.secondColor, '#4cc9f0'));
  const second = toPlayer(input.second, '', secondColor);
  const thirdColor = freeColor([winner.color, second?.color ?? ''], cleanColor(input.thirdColor, '#06d6a0'));
  const third = toPlayer(input.third, '', thirdColor);
  const seed = typeof input.seed === 'number' || typeof input.seed === 'string' ? String(input.seed).slice(0, 64) || '1' : '1';
  const motion = input.motion === 'reduce' || input.motion === 'full' ? input.motion : 'auto';
  const quality = ['high', 'medium', 'low'].includes(/** @type {string} */ (input.quality)) ? /** @type {any} */ (input.quality) : 'auto';
  const label = typeof input.scoreLabel === 'string' ? cleanName(input.scoreLabel, 'points').slice(0, 16) : 'points';
  const diceRaw = Array.isArray(input.dice) ? input.dice : typeof input.dice === 'string' ? input.dice.split(',') : [];
  const dice = diceRaw.map((d) => Math.round(Number(d))).filter((d) => d >= 1 && d <= 6).slice(0, 5);
  return {
    view,
    ending,
    seed,
    winner,
    second: second && second.name ? second : null,
    third: third && third.name ? third : null,
    me: typeof input.me === 'string' && input.me.trim() ? cleanName(input.me, '') : null,
    scoreLabel: label,
    kiosk: Boolean(input.kiosk),
    clock: input.clock === 'manual' ? 'manual' : 'raf',
    motion,
    quality,
    dice: dice.length ? dice : [6, 6, 6, 6, 6],
  };
}

/**
 * URL search string → loose input for normalizeOptions.
 * @param {string} search  e.g. location.search
 * @returns {Record<string, unknown>}
 */
export function queryInput(search) {
  const q = new URLSearchParams(search);
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const key of ['view', 'ending', 'winner', 'score', 'second', 'third', 'color', 'secondColor', 'thirdColor', 'seed', 'me', 'clock', 'motion', 'quality', 'dice']) {
    const v = q.get(key);
    if (v !== null) out[key] = v;
  }
  const label = q.get('label') ?? q.get('scoreLabel');
  if (label !== null) out.scoreLabel = label;
  if (q.has('kiosk') && q.get('kiosk') !== '0' && q.get('kiosk') !== 'false') out.kiosk = true;
  // no winner given: the demo podium (Ana 42, Ben 30, Cy 12)
  if (!q.has('winner')) Object.assign(out, { winner: 'Ana', score: out.score ?? '42', second: out.second ?? 'Ben:30', third: out.third ?? 'Cy:12' });
  return out;
}

/**
 * Where the phone's own player placed: 1, 2, 3 or null.
 * @param {WinOptions} o
 */
export function myPlace(o) {
  if (!o.me) return null;
  const me = o.me.toLocaleLowerCase();
  if (o.winner.name.toLocaleLowerCase() === me) return 1;
  if (o.second && o.second.name.toLocaleLowerCase() === me) return 2;
  if (o.third && o.third.name.toLocaleLowerCase() === me) return 3;
  return null;
}
