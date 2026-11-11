/**
 * Venice's board for the prototype of the threads (docs/plan-planche.md): eight houses in the
 * lagoon, the towns of the mainland all dispute, three passages, two ports of the open sea.
 * In the game these are a world's settings (`worlds.settings`), never constants of the engine.
 * Orders of magnitude, measured at the bench (docs/calibration.md, § La planche).
 */
import type { PlancheCity, PlancheSetup, PlancheWant } from "../planche/planche.js";

const HOUR = 3_600_000;
const want = (price: number, cap: number, regenPerHour: number, floorBps = 3_000): PlancheWant => ({
  price,
  floorBps,
  cap,
  regenPerHour,
});
const city = (
  id: string,
  name: string,
  x: number,
  y: number,
  wants: Record<string, PlancheWant>,
  via: string[] = [],
): PlancheCity => ({ id, name, x, y, via, wants });

export const venice1450Planche: PlancheSetup & {
  /** The lagoon's middle and the reach of the calm water, for the board's ink. */
  lagoon: { x: number; y: number };
  /** The Rialto's tile: the market of Venice, a landmark. */
  rialto: { x: number; y: number };
} = {
  width: 28,
  height: 18,
  lagoon: { x: 13, y: 9 },
  rialto: { x: 15, y: 6 },
  sliceMs: HOUR / 6,
  goods: { verre: "Verre", drap: "Drap", planches: "Planches", sel: "Sel" },
  houses: [
    { id: "toi", name: "Ta Maison", robot: false, x: 12, y: 8, makes: { verre: 12, planches: 6 } },
    {
      id: "contarini",
      name: "Ca’ Contarini",
      robot: true,
      x: 15,
      y: 10,
      makes: { verre: 12, sel: 6 },
    },
    {
      id: "loredan",
      name: "Ca’ Loredan",
      robot: true,
      x: 10,
      y: 11,
      makes: { drap: 12, planches: 6 },
    },
    {
      id: "morosini",
      name: "Ca’ Morosini",
      robot: true,
      x: 13,
      y: 12,
      makes: { sel: 12, drap: 6 },
    },
    {
      id: "dandolo",
      name: "Ca’ Dandolo",
      robot: true,
      x: 16,
      y: 8,
      makes: { planches: 12, verre: 6 },
    },
    { id: "foscari", name: "Ca’ Foscari", robot: true, x: 11, y: 6, makes: { drap: 12, sel: 6 } },
    {
      id: "grimani",
      name: "Ca’ Grimani",
      robot: true,
      x: 14,
      y: 14,
      makes: { sel: 12, planches: 6 },
    },
    {
      id: "mocenigo",
      name: "Ca’ Mocenigo",
      robot: true,
      x: 9,
      y: 9,
      makes: { verre: 12, drap: 6 },
    },
  ],
  cities: [
    city("padoue", "Padoue", 5, 9, {
      verre: want(900, 140, 9),
      drap: want(1_000, 140, 9),
      sel: want(700, 120, 8),
    }),
    city("trevise", "Trévise", 12, 2, {
      planches: want(800, 140, 9),
      sel: want(750, 120, 8),
      drap: want(950, 120, 8),
    }),
    city("vicence", "Vicence", 3, 5, { drap: want(1_150, 130, 8), verre: want(1_050, 130, 8) }),
    city("verone", "Vérone", 1, 8, {
      verre: want(1_500, 150, 8),
      planches: want(1_200, 130, 7),
      sel: want(1_100, 120, 7),
    }),
    city(
      "ferrare",
      "Ferrare",
      4,
      15,
      { verre: want(2_200, 160, 8), drap: want(2_400, 160, 8), planches: want(1_900, 140, 7) },
      ["chioggia"],
    ),
    city(
      "raguse",
      "Raguse",
      23,
      12,
      {
        verre: want(4_200, 200, 9, 5_000),
        drap: want(4_600, 200, 9, 5_000),
        sel: want(3_400, 180, 8, 5_000),
      },
      ["segna"],
    ),
    city(
      "alexandrie",
      "Alexandrie",
      25,
      16,
      {
        verre: want(8_000, 220, 8, 5_000),
        planches: want(7_000, 220, 8, 5_000),
        drap: want(8_500, 220, 8, 5_000),
      },
      ["segna", "otrante"],
    ),
  ],
  passages: [
    {
      id: "chioggia",
      name: "Bouche de Chioggia",
      x: 12,
      y: 15,
      holder: "contarini",
      tollBps: 1_000,
      board: "chioggia",
      seals: 3,
    },
    {
      id: "segna",
      name: "Détroit de Segna",
      x: 20,
      y: 8,
      holder: "corsair:Ivo le Borgne",
      tollBps: 1_000,
      board: "segna",
      seals: 3,
    },
    {
      id: "otrante",
      name: "Canal d’Otrante",
      x: 24,
      y: 14,
      holder: "corsair:Dragut",
      tollBps: 1_000,
      board: "otrante",
      seals: 3,
    },
  ],
  rules: {
    bobbins: 5,
    store: 240,
    startStock: 40,
    startDucats: 0,
    threadPerHour: 10,
    patinaBpsPerDay: 500,
    patinaMaxBps: 5_000,
    tollMaxBps: 1_500,
    tollBurnBps: 3_000,
    freeAfterForceMs: 24 * HOUR,
    rewindMsPerTile: 5 * 60_000,
  },
};
