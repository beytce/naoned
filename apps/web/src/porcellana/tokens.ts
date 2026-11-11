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
  wall: "#EFE6D9",
  wall2: "#E5D9C8",
  roof: "#D8C8B2",
  leaf: "#EADFCF",
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
    mapPhone: 1024,
  },
  catcher: { y: -1.9, opacity: 0.11 },
  ao: { radius: 0.7, distanceExponent: 1.4, thickness: 2, scale: 1.2, blend: 0.85 },
  exposure: 1,
} as const;

/** The camera: orthographic, three quarters, turning all the way round (7 November 2026). */
export const CAMERA = {
  azimuth: Math.PI / 4,
  elevation: 0.64,
  distance: 160,
  minZoom: 0.35,
  maxZoom: 4,
  minPolar: 0.62,
  maxPolar: 1.12,
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

/**
 * The way into the Terraferma (the owner's decision of 8 November 2026): from the Campo, every tile
 * of the map turns over, the Terraferma's land beneath, while the camera draws far back; then the
 * Terraferma's own board takes over and settles on the merchant's lands. Seconds.
 */
export const FLIP = {
  /** The wave: a tile turns this long after the Campo's, per tile of distance, at most `spread`. */
  step: 0.05,
  spread: 0.9,
  /** One tile's turn, with a slight overshoot as it lands on its back. */
  turn: 0.62,
  overshoot: 0.7,
  /** How high a tile rises at mid-turn, in world units. */
  lift: 2.4,
  /** The camera's draw back: from `zoomFrom`, for `zoomFor`, down to `zoomTo` of its zoom. */
  zoomFrom: 0.35,
  zoomFor: 1.6,
  zoomTo: 0.3,
  /** The Terraferma's board fades in from `handoff` for `fade`; the whole way in lasts `total`. */
  handoff: 1.45,
  fade: 0.6,
  total: 2.3,
  /**
   * The board of the Terraferma: it follows the map's draw-back on the camp (the tiles' backs are
   * its cells there, the fade unseen), then out to the whole map for `reveal`, then down to the
   * merchant's lands for `settle`.
   */
  reveal: 0.8,
  settle: 1.3,
  /** The way back runs this much faster. */
  back: 1.35,
  /** Without motion (prefers-reduced-motion, no WebGL): a plain fade. */
  plainFade: 0.3,
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
  /** How much paler a road with nothing on it is: the accent toward white. */
  still: 0.55,
} as const;

/**
 * The thread on the shared board (docs/audit-visuel-2026-11-11, « le fil est le plus bel objet »):
 * a wide ribbon of accent on its dark-red shadow, its chevrons further apart, a light sheen that
 * widens with the patina; the others' threads in dashed ink.
 */
export const THREAD = {
  width: 1.7,
  period: 2.2,
  shadow: "#8A2A20",
  /** Where the shadow lies: toward the camera, under the ribbon. */
  shadowOffset: 0.3,
  sheen: "#F6C7BF",
  sheenMin: 0.1,
  sheenMax: 0.42,
  other: 0.7,
  otherDash: 1.6,
  boat: 1.6,
} as const;

/** The water of the shared board, in one piece: from the lagoon's white to the ink of the open sea. */
export const SEA = {
  lagoon: "#CFD8DA",
  mid: "#8B9497",
  deep: "#2B2E32",
  /** The land, biscuit, darker toward the open sea; the islands of the houses, porcelain. */
  land: "#E9DFD0",
  isle: "#F7F5F1",
  /** How much a spot of the wash varies. */
  stain: 0.06,
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
  display: 'Nunito, "Segoe UI", system-ui, sans-serif',
  ui: 'Manrope, "Segoe UI", system-ui, -apple-system, sans-serif',
} as const;
