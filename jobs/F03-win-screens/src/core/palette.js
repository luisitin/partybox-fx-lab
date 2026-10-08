// Colours shared by the TV and the phone (PartyBox night theme tokens, packages/client/src/styles/tokens.css).
import { PLAYER_COLORS } from './params.js';

export const PB = {
  bg: '#0f1020',
  surface: '#1c1e3a',
  surface2: '#272a52',
  text: '#f5f6ff',
  muted: '#b3b7d9',
  accent: '#ff5d8f',
  accent2: '#ffd166',
  accent3: '#06d6a0',
  danger: '#ef476f',
  info: '#4cc9f0',
};

/** Confetti paper colours: the winner's twice (it should read as theirs), then the palette. @param {string} winner */
export function confettiPalette(winner) {
  return [winner, winner, '#ffd166', '#06d6a0', '#4cc9f0', '#b388ff', '#ff9f43', '#ffffff', ...PLAYER_COLORS.filter((c) => c !== winner).slice(0, 2)];
}
