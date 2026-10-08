// The nine endings, by id.
import { defaultScene } from './default.js';

/** @type {Record<string, import('./common.js').SceneModule>} */
export const SCENES = {
  default: defaultScene,
  cards: defaultScene,
  dice: defaultScene,
  board: defaultScene,
  trivia: defaultScene,
  drawing: defaultScene,
  detective: defaultScene,
  racing: defaultScene,
  words: defaultScene,
};
