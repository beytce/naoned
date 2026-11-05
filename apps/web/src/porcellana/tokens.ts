/**
 * Porcellana's grammar (docs/plan-porcellana.md § 1, validated by the owner on 5 November 2026):
 * the values of the prototype (docs/direction-artistique-2026-11/porcellana/prototype.html), not
 * an impression of it. Every scene takes them from here; test/porcellana.test.ts keeps them from
 * drifting.
 */

/** The porcelain world, near monochrome: values, not hues, tell the volumes apart. */
export const COL = {
  ground: "#EEEBE5",
  wall: "#F6F4F0",
  wall2: "#ECE7DF",
  roof: "#E0D8CB",
  trim: "#FCFBF9",
  open: "#AFA699",
  soil: "#E6E0D6",
  crop: "#F2EEE6",
  wood: "#DED5C7",
  metal: "#D3D0CB",
  water: "#C9D3D6",
  ink: "#2A2725",
  leaf: "#F1EEE8",
  bg: "#E9E6E0",
} as const;
export type Tone = keyof typeof COL;

/** The lands of Rome (D5): the same porcelain, unglazed — « biscuit ». */
export const BISCUIT: Partial<Record<Tone, string>> = {
  ground: "#E7DCCD",
  wall: "#EFE6D9",
  wall2: "#E5D9C8",
  roof: "#D8C8B2",
  leaf: "#EADFCF",
  bg: "#E3D9CB",
};

/** The one strong colour (D2, D3): red of Venice by default, the others a matter of taste. */
export const ACCENTS = { rosso: "#C23B2E", oro: "#D49A16", laguna: "#16897A" } as const;
export type AccentName = keyof typeof ACCENTS;

/** Roughness of the glaze: matt, the water a little satin. */
export const ROUGH = { matt: 0.86, water: 0.38, accent: 0.62, ink: 0.5 } as const;

/** The board: thick tiles, rounded edges, thin joints; the water lower, in one piece. */
export const BOARD = {
  tile: 6,
  gap: 0.32,
  thick: 1.25,
  radius: 0.16,
  waterY: -0.24,
  bevel: 0.05,
} as const;

/** The light: a white sky over a warm ground, a sun from the front left, a cool fill. */
export const LIGHT = {
  hemi: { sky: "#FFFFFF", ground: "#D6CDBF", intensity: 1.25 },
  sun: { colour: "#FFFAF1", intensity: 2.5, offset: [-16, 34, 22] as [number, number, number] },
  fill: { colour: "#EEF2F6", intensity: 0.55, position: [26, 12, 2] as [number, number, number] },
  shadow: {
    radius: 2.2,
    bias: -0.0004,
    normalBias: 0.03,
    extent: 36,
    mapDesk: 4096,
    mapPhone: 2048,
  },
  catcher: { y: -1.9, opacity: 0.11 },
  ao: { radius: 0.7, distanceExponent: 1.4, thickness: 2, scale: 1.2, blend: 0.85 },
  exposure: 1,
} as const;

/** The camera: orthographic, three quarters, a little turn allowed. */
export const CAMERA = {
  azimuth: Math.PI / 4,
  elevation: 0.64,
  distance: 160,
  minZoom: 0.8,
  maxZoom: 4,
  minPolar: 0.62,
  maxPolar: 1.12,
  turn: 0.55,
  damping: 0.09,
} as const;

/** The arrival: the tiles drop into place, the roads draw themselves, then life comes. */
export const ARRIVAL = {
  drop: -9,
  duration: 0.75,
  overshoot: 1.25,
  step: 0.055,
  waterLag: 0.12,
  routesFrom: 1.0,
  routesFor: 1.2,
  lifeFrom: 1.2,
  pinsAfter: 1.4,
} as const;

/** The selection: the tile lifts, a ring of accent, a blush of accent on what stands there. */
export const SELECT = {
  lift: 0.35,
  liftEase: 0.12,
  ring: [2.55, 2.75] as [number, number],
  ringOpacity: 0.9,
  blush: 0.17,
  glow: 0.05,
  tintEase: 0.1,
  fly: 0.9,
  zoomDesk: 1.75,
  zoomPhone: 2.1,
} as const;

/** The roads: a ribbon of accent, chevrons running toward where the goods go. */
export const RIBBON = {
  width: 0.78,
  period: 1.25,
  speed: 0.55,
  chevronAlpha: 0.62,
  corner: 1.6,
  lift: 0.03,
  seaDash: 0.75,
} as const;

/** The paper of the interface (cards, pins, pills). */
export const PAPER = {
  paper: "#FBFAF7",
  ink: "#24211E",
  inkSoft: "#7A736A",
  hair: "#DDD7CD",
  pill: "rgba(251,250,247,.82)",
  blur: 10,
} as const;

/** The type (D4): a Venetian roman for names, a plain grotesque for the rest. */
export const FONTS = {
  display: '"Cormorant Garamond", "Iowan Old Style", "Palatino Linotype", Georgia, serif',
  ui: '"Work Sans", "Segoe UI", system-ui, -apple-system, sans-serif',
} as const;
