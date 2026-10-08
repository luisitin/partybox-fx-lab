// Colours: PartyBox night-theme tokens for the chrome and players, plus the island's own stage palette.
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
  onAccent: '#1a0b12',
} as const;

export const WORLD = {
  skyZenith: '#2a5fc4',
  skyMid: '#6aa6ea',
  skyHorizon: '#ffd9ae',
  sun: '#fff1d2',
  seaDeep: '#14537f',
  seaNear: '#2e8fb8',
  haze: '#cfe3f2',
  grass: '#5fb64b',
  grassLight: '#93d468',
  grassDark: '#3c8a3a',
  lip: '#357a31',
  trail: '#ecd7a0',
  trailEdge: '#d5b97c',
  rock: ['#6a4430', '#a8744a', '#d0a272', '#7b5139', '#e0bb86', '#5a3b2a', '#b98257'],
  trunk: '#7a5232',
  leaf: ['#3f9a4a', '#58b356', '#2f8a45', '#6cbf55'],
  pine: '#2e7a4c',
  stone: '#b4ab9b',
  cream: '#fff6e2',
} as const;

/** Tile colours per kind: top, side, glyph. Shapes differ too (never colour alone). */
export const KIND_STYLE = {
  gain: { top: '#3f8cff', side: '#2659b8', glyph: '#fff6e2', label: 'Blue: +3 coins' },
  lose: { top: '#ef476f', side: '#a8223f', glyph: '#fff6e2', label: 'Red: -3 coins' },
  event: { top: '#9b6bff', side: '#6440c0', glyph: '#fff6e2', label: 'Event: tailwind' },
  star: { top: '#ffc93c', side: '#c98a12', glyph: '#fff9e8', label: 'Star' },
} as const;
