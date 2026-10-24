/** Colours of the illustrations: the "Lagune & Ducat" palette (the default) of the identity guide. */
export const P = {
  night: "#16263E",
  night3: "#243A5C",
  line: "#42628C",
  cream: "#F6E8CC",
  gold: "#E8B24C",
  goldDeep: "#BA8830",
  goldSoft: "#F3D492",
  lagoon: "#7DB596",
  lagoonDeep: "#4C8366",
  vermilion: "#E36A4A",
  vermilionDeep: "#AA472F",
  wood: "#9A6234",
  woodLight: "#C98E52",
  clay: "#C8693F",
  emerald: "#3FA36B",
  violet: "#8E6BD8",
  /** Lapis: the selection, what a finger touched. */
  info: "#6EC8F5",
};

/**
 * The map's writing, the same at every zoom (in CSS px): a name is never bigger than a city's, a
 * figure never bigger than a name. Each sits on its halo, the map's ink.
 */
export const MAP_TEXT = {
  /** A city, in capitals. */
  city: 12,
  /** A merchant's land. */
  merchant: 11,
  /** The merchant's own, and a land of many cells. */
  mine: 12,
  /** The troops, in a pill. */
  troops: 11,
  /** Behind each word: the map's ink. */
  halo: "#0B1626",
  ink: P.cream,
} as const;
