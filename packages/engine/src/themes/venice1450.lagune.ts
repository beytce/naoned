import type { PasseStyle } from "../passe/mind.js";
/**
 * Venice's lagoon of 48 houses (docs/plan-lagunes.md, its map docs/plan-lagune-ronde.md): the
 * Rialto in the middle, four sestieri of twelve round it, each with its three towns on its shore
 * and its town of the open sea in its corner; Murano to the north and Chioggia to the south, the
 * Muda's way out to the east. The same map for every lagoon (the owner's choice, 12 November 2026). Its
 * islands, its time, its rules and its rank are those of Venice's board; its orders of magnitude
 * are measured at the bench (docs/calibration.md, § Les lagunes).
 */
import type { LagoonParams, LagoonTown } from "../planche/lagune.js";
import { plancheLagoon } from "../planche/lagune.js";
import type { NoirStrait } from "../planche/noir.js";
import type { PlancheCity, PlancheSetup, PlancheWant } from "../planche/planche.js";
import { venice1450PasseJour } from "./venice1450.passe.jour.js";
import { venice1450PasseProblems } from "./venice1450.passe.problems.js";
import { venice1450Planche } from "./venice1450.planche.js";

/**
 * A town's demand in a lagoon of 48: half as much again as on the board of 8, so that a town grows
 * back more than one thread takes from it (12 an hour against 10): a thread held pays, chasing the
 * full gauges pays less (docs/calibration.md, § Les lagunes).
 */
const DEMAND = 1.5;
const want = (price: number, cap: number, regenPerHour: number, floorBps = 3_000): PlancheWant => ({
  price,
  floorBps,
  cap: Math.round(cap * DEMAND),
  regenPerHour: Math.round(regenPerHour * DEMAND),
});
const town = (name: string, wants: Record<string, PlancheWant>): LagoonTown => ({ name, wants });

/** Venice's families: the houses' names, Ca’ and the family. */
const FAMILIES = [
  "Bembo",
  "Zane",
  "Venier",
  "Loredan",
  "Morosini",
  "Dandolo",
  "Foscari",
  "Grimani",
  "Mocenigo",
  "Contarini",
  "Corner",
  "Pisani",
  "Gritti",
  "Tron",
  "Zorzi",
  "Barbarigo",
  "Badoer",
  "Balbi",
  "Barbaro",
  "Bragadin",
  "Cappello",
  "Dolfin",
  "Donà",
  "Emo",
  "Erizzo",
  "Falier",
  "Gradenigo",
  "Giustinian",
  "Lando",
  "Malipiero",
  "Marcello",
  "Michiel",
  "Molin",
  "Nani",
  "Orio",
  "Pesaro",
  "Priuli",
  "Querini",
  "Sagredo",
  "Soranzo",
  "Steno",
  "Tiepolo",
  "Trevisan",
  "Vendramin",
  "Zen",
  "Memmo",
  "Valier",
  "Zeno",
];

const base = venice1450Planche;

const HOUR = 3_600_000;
/** A ship of the Arsenal: its goods, its hours on the cale, its force and hull, its word, its level. */
const ship = (
  name: string,
  goods: Record<string, number>,
  hours: number,
  force: number,
  hull: number,
  keyword: string,
  minLevel: number,
) => ({ name, goods, buildMs: hours * HOUR, force, hull, keyword, minLevel });

/** Tiles from the Rialto to the board's edge: 41 tiles a side. */
const HALF = 20;

/** A black strait on one of the open sea's axes, given from the Rialto. */
const noirStrait = (
  id: string,
  name: string,
  power: string,
  captain: string,
  style: PasseStyle,
  [x, y]: [number, number],
  board: string,
  port: string,
): NoirStrait => ({ id, name, power, captain, style, x: HALF + x, y: HALF + y, board, port });

export const venice1450LaguneParams: LagoonParams = {
  sestieri: [
    { id: "cannaregio", name: "Cannaregio" },
    { id: "castello", name: "Castello" },
    { id: "dorsoduro", name: "Dorsoduro" },
    { id: "sanpolo", name: "San Polo" },
  ],
  housesPerSestiere: 12,
  half: HALF,
  // Cannaregio's quarter, to the north-west; Castello, Dorsoduro and San Polo are it turned. Three
  // arcs of islands (3, 4, 5) from the Rialto to the shore, the diagonal left to the mouth.
  quarter: {
    houses: [
      [-6, -2],
      [-4, -4],
      [-2, -6],
      [-9, -3],
      [-8, -6],
      [-6, -8],
      [-3, -9],
      [-12, -3],
      [-11, -6],
      [-9, -9],
      [-6, -11],
      [-3, -12],
    ],
    towns: [
      [-14, -6],
      [-12, -9],
      [-6, -14],
    ],
    mouth: [-12, -12],
    strait: [-15, -15],
    far: [-17, -17],
  },
  // Murano to the north and Chioggia to the south, each behind its canal; the Rialto in the middle.
  axes: [{ at: [0, -14], canal: [0, -11] }, { at: [0, 0] }, { at: [0, 14], canal: [0, 11] }],
  houseNames: FAMILIES.map((f) => `Ca’ ${f}`),
  plans: base.houses.map((h) => h.plan ?? []).filter((p) => p.length),
  soils: base.houses.map((h) => h.soil ?? { pre: 1 }),
  makes: {},
  sestiereTowns: 3,
  towns: {
    // Each sestiere's own: near, free, a little of everything worked.
    sestiere: [
      town("Padoue", {
        glass: want(1_300, 140, 9),
        rope: want(900, 120, 8),
        flour: want(500, 140, 9),
      }),
      town("Trévise", {
        bricks: want(650, 140, 9),
        planks: want(700, 140, 9),
        salt: want(500, 120, 8),
      }),
      town("Vicence", {
        glass: want(1_400, 120, 8),
        flour: want(550, 130, 8),
        rope: want(950, 120, 8),
      }),
      town("Vérone", {
        bricks: want(750, 140, 8),
        planks: want(800, 140, 8),
        glass: want(1_500, 120, 7),
      }),
      town("Bassano", {
        planks: want(720, 140, 9),
        rope: want(920, 120, 8),
        salt: want(520, 120, 8),
      }),
      town("Mestre", {
        flour: want(520, 140, 9),
        bricks: want(680, 140, 9),
        glass: want(1_350, 120, 8),
      }),
      town("Rovigo", {
        salt: want(540, 120, 8),
        flour: want(560, 130, 8),
        planks: want(760, 140, 8),
      }),
      town("Ferrare", {
        glass: want(1_450, 120, 8),
        rope: want(960, 120, 8),
        bricks: want(720, 140, 8),
      }),
      town("Mantoue", {
        salt: want(530, 120, 8),
        glass: want(1_420, 120, 8),
        rope: want(940, 120, 8),
      }),
      town("Brescia", {
        bricks: want(700, 140, 8),
        flour: want(540, 130, 8),
        planks: want(740, 140, 8),
      }),
      town("Bergame", {
        rope: want(930, 120, 8),
        salt: want(510, 120, 8),
        glass: want(1_380, 120, 8),
      }),
      town("Udine", {
        planks: want(780, 140, 8),
        bricks: want(710, 140, 8),
        flour: want(530, 130, 8),
      }),
    ],
    // The lagoon's, on its axes: Murano and Chioggia behind a canal, the Rialto free.
    lagoon: [
      town("Murano", {
        sand: want(240, 300, 20, 4_000),
        wood: want(260, 300, 20, 4_000),
        glass: want(1_800, 200, 10),
      }),
      town("Rialto", {
        wheat: want(150, 400, 26, 4_000),
        clay: want(180, 400, 26, 4_000),
        wood: want(200, 400, 26, 4_000),
        sand: want(160, 400, 26, 4_000),
        salt: want(400, 320, 20, 4_000),
        hemp: want(220, 400, 26, 4_000),
      }),
      town("Chioggia", {
        salt: want(700, 200, 10),
        rope: want(1_500, 180, 9),
        flour: want(900, 180, 9),
        bricks: want(1_100, 180, 9),
      }),
    ],
    // The open sea's, beyond a mouth and a strait: the richest, but no longer by far (docs/plan-economie.md
    // C1: prices × 0.6, floor 30 %, measured in docs/calibration.md).
    large: [
      town("Raguse", {
        glass: want(2_280, 200, 9, 3_000),
        rope: want(2_040, 200, 9, 3_000),
        bricks: want(1_800, 180, 8, 3_000),
        planks: want(1_920, 180, 8, 3_000),
      }),
      town("Alexandrie", {
        glass: want(3_900, 220, 8, 3_000),
        planks: want(3_300, 220, 8, 3_000),
        rope: want(3_600, 220, 8, 3_000),
        flour: want(2_700, 220, 8, 3_000),
      }),
      town("Constantinople", {
        glass: want(3_480, 220, 8, 3_000),
        bricks: want(2_520, 200, 8, 3_000),
        salt: want(1_800, 200, 8, 3_000),
        flour: want(2_400, 220, 8, 3_000),
      }),
      town("Candie", {
        rope: want(2_520, 200, 8, 3_000),
        planks: want(2_640, 200, 8, 3_000),
        salt: want(1_680, 200, 8, 3_000),
        glass: want(2_880, 200, 8, 3_000),
      }),
    ],
  },
  passages: {
    tollBps: 1_000,
    seals: 3,
    bouche: "chioggia",
    canal: "lido",
    // The straits on the largest board (9 × 9), the mouths 7 × 7, the canals 5 × 5.
    strait: "otrante",
    // The prepared guard (docs/plan-hex-commerce.md H4): two links, three on a strait.
    guard: { links: 2, strait: 3 },
    corsairs: ["Ivo le Borgne", "Dragut", "Uluç Ali", "Kemal Reis", "Barberousse", "Turgut"],
  },
  detourBps: 6_000,
  // The open sea by the detour: a fifth of the way by the passages (docs/plan-economie.md C1).
  largeDetourBps: 2_000,
  base: {
    sliceMs: base.sliceMs,
    goods: base.goods,
    // A bobbin takes longer to come home, and a thread held gains faster (docs/calibration.md).
    rules: { ...base.rules, rewindMsPerTile: 20 * 60_000, patinaBpsPerDay: 1_000 },
    // The island's workshops, and the Arsenal (docs/plan-arsenal.md): one an island, from level 6.
    ...(base.ile
      ? {
          ile: {
            ...base.ile,
            workshops: {
              ...base.ile.workshops,
              arsenal: {
                name: "Arsenal",
                tier: 1,
                terrain: "rive",
                inputs: {},
                outputs: {},
                lotsPerHour: 0,
                cost: [600_000, 2_500_000, 6_000_000],
                buildMs: [HOUR, 6 * HOUR, 24 * HOUR],
              },
              // The works of prestige (docs/plan-economie.md C3): the ducats' sink. They make
              // nothing, are seen by all, and each one makes the next a quarter dearer. The
              // common ones at the Casa; the grand ones (the third tier) at level 15, with a plan.
              ...Object.fromEntries(
                (
                  [
                    ["fontaine", "Fontaine", 1, 6, 1_500_000, 2 * HOUR],
                    ["loggia", "Loggia", 1, 6, 2_500_000, 4 * HOUR],
                    ["campanile", "Campanile", 1, 6, 4_000_000, 8 * HOUR],
                    ["scuola", "Scuola Grande", 3, 15, 12_000_000, 24 * HOUR],
                    ["basilique", "Basilique", 3, 15, 25_000_000, 48 * HOUR],
                  ] as const
                ).map(([id, name, tier, level, cost, ms]) => [
                  id,
                  {
                    name,
                    tier,
                    level,
                    terrain: "pre" as const,
                    inputs: {},
                    outputs: {},
                    lotsPerHour: 0,
                    cost: [cost],
                    buildMs: [ms],
                    ouvrage: { growthBps: 2_500 },
                  },
                ]),
              ),
            },
          },
        }
      : {}),
    ...(base.rank ? { rank: base.rank } : {}),
    // The growth of the houses (docs/plan-progression-maison.md): 3 bobbins at first, 12 at the
    // top; the worked goods at level 3; a second tower at 6. Titles of the Republic's houses.
    maison: {
      // The thirtieth level near the 47th week (docs/plan-economie.md C2).
      curve: 28,
      // Twelve systems, three the first day, the others opened by level and told the day they
      // open (docs/plan-semaine.md D1).
      places: {
        jour: 2,
        commandes: 3,
        rival: 3,
        compagnie: 3,
        duel: 4,
        muda: 5,
        rang: 5,
        maree: 5,
        port: 6,
        ouvrages: 6,
        noirs: 11,
      },
      maxLevel: 30,
      titles: [
        { from: 1, name: "Bottega" },
        { from: 6, name: "Casa" },
        { from: 11, name: "Ca\u2019" },
        { from: 16, name: "Palazzo" },
        { from: 21, name: "Procuratie" },
      ],
      unlocks: [
        { level: 1, bobbins: 3, tiles: 12, tier: 1, towers: 1 },
        { level: 2, bobbins: 4 },
        { level: 3, tier: 2 },
        { level: 4, bobbins: 5, tiles: 16 },
        // The Casa reaches the open sea by the detour (docs/plan-economie.md C1).
        { level: 6, towers: 2, detour: true },
        { level: 8, bobbins: 6, tiles: 20 },
        { level: 11, tiles: 28 },
        { level: 12, bobbins: 7 },
        { level: 15, tier: 3 },
        { level: 16, bobbins: 8, towers: 3, tiles: 32 },
        { level: 18, bobbins: 9 },
        { level: 21, bobbins: 10, tiles: 36 },
        { level: 25, bobbins: 11 },
        { level: 30, bobbins: 12 },
      ],
      weeklyCap: 500,
      catchUpBps: 5_000,
      commerce: { perDucats: 15, dailyCap: 55 },
      gains: {
        rival: 60,
        placeTop: 100,
        placeStep: 8,
        seal: 15,
        guardHours: 2,
        guardCap: 70,
        laurel: 100,
        doge: 200,
        // A black strait forced: as a seal of the War and a little more (docs/plan-muda.md).
        noir: 25,
      },
    },
    // The sealed orders (docs/plan-hex-commerce.md H2): two a day in each sestiere, at 9 and 17
    // (UTC), four hours each, twice the price, two hours of thread (20 units: measured at the
    // bench, docs/calibration.md § La Passe dans le commerce; the owner's choice, 12 November 2026).
    orders: {
      perSestiere: 2,
      hours: [9, 17],
      durationMs: 4 * 3_600_000,
      priceBps: 20_000,
      units: 20,
      problems: venice1450PasseProblems.map((p) => p.id),
    },
    // The Arsenal, the fleet and the port (docs/plan-arsenal.md): goods become ships, never ducats.
    arsenal: {
      workshop: "arsenal",
      minLevel: 6,
      cales: [2, 3, 4],
      ships: {
        // Each from what an island of the lagoon makes on its own (docs/plan-arsenal.md § 3.2):
        // the wood islands arm galleys, the hemp ones brigantines, the salt ones fireships.
        galere: ship("Galère", { wood: 80 }, 3, 2, 4, "solide", 6),
        // A hull of 3, not 2: at 2 the battery and the tower left it nothing (docs/calibration.md).
        brigantin: ship("Brigantin", { hemp: 60 }, 2, 2, 3, "rapide", 6),
        brulot: ship("Brûlot", { salt: 40 }, 1, 0, 1, "brule", 6),
        galeasse: ship("Galéasse", { wood: 40, bricks: 50 }, 5, 4, 3, "bombarde", 11),
        escorte: ship("Nef d'escorte", { glass: 40, wood: 20 }, 4, 0, 3, "repare", 16),
      },
      places: [
        { level: 6, n: 3 },
        { level: 10, n: 5 },
        { level: 16, n: 8 },
        { level: 21, n: 10 },
        { level: 30, n: 12 },
      ],
      refitBps: 3_333,
      repair: { bps: 3_333, ms: 40 * 60_000 },
      port: {
        passes: ["bouche", "nord", "sud"],
        slots: [
          { level: 6, n: 2 },
          { level: 16, n: 3 },
        ],
        defenses: {
          tour: { name: "Tour", goods: { bricks: 60 }, hull: 6 },
          // Of hemp: the islands of the mill and of the rope both have it.
          chaine: { name: "Chaîne", goods: { hemp: 60 } },
          batterie: { name: "Batterie", goods: { glass: 40 } },
        },
        // The company's beacon (docs/plan-compagnie.md K4): a place more a pass at 2, two at 4.
        beaconSlots: [
          { level: 2, n: 1 },
          { level: 4, n: 2 },
        ],
      },
      power: { workshop: 10, arsenal: 20, ship: 5, defense: 15 },
    },
    // The company's beacon (docs/plan-compagnie.md K4): six members giving every day reach
    // level 5 in about four weeks; at 5, the beacon shows one ruse of each assault.
    compagnie: {
      beacon: { thresholds: [0, 2_400, 7_200, 15_000, 27_000], dailyCap: 60, scoutLevel: 5 },
    },
    // The War of the week (docs/plan-guerre.md): the assault of 01-audit-guerre.md § 4.3, and the
    // Prestige the owner chose (12 November 2026), within the week's cap.
    guerre: {
      assaut: {
        manches: 3,
        tower: { fire: 3 },
        battery: { fire: 1 },
        hulls: { tour: 6, batterie: 4, chaine: 3 },
        chainBreakers: 2,
        // The ruses softened at the bench (docs/calibration.md § L'assaut): the hidden fireship
        // hurts the first ship in by 2, the reinforcements are two boats of 1 · 2; a fireship
        // with nothing else to burn does 4 to a tower.
        reinforcements: { n: 2, force: 1, hull: 2 },
        ruseManche: { chaine: 2, renforts: 3 },
        hiddenFire: 2,
        fireshipTower: 4,
      },
      prestige: { seal: 20, damage: 7, repelled: 10, repelledCap: 40, victory: 60 },
      // The training port, without stake, at any hour (01-audit-guerre.md § 4.6).
      training: {
        name: "Le Lido des corsaires",
        port: {
          passes: {
            bouche: { defenses: ["tour", "chaine"] },
            nord: { defenses: ["tour"], ruse: "brulot" },
            sud: { defenses: ["batterie"], ruse: "renforts" },
          },
        },
        fleet: ["galere", "galere", "brigantin", "brulot"],
      },
    },
    // The black straits (docs/plan-muda.md N1): three powers on the open sea's axes (south, west,
    // north; the east is the Muda's), where the ink is darkest; level 11, two tries a day, a cargo by level, half again
    // the board's best price for it (docs/calibration.md § Les détroits noirs).
    noir: {
      minLevel: 11,
      straits: [
        noirStrait(
          "turc",
          "Le détroit du Turc",
          "turc",
          "Le Kapudan Pacha",
          "meute",
          [0, 19],
          "dardanelles",
          "Constantinople",
        ),
        noirStrait(
          "genes",
          "Le détroit de Gênes",
          "genes",
          "L'amiral Doria",
          "mur",
          [-19, 0],
          "portofino",
          "Gênes",
        ),
        noirStrait(
          "milan",
          "Le détroit de Milan",
          "milan",
          "Le capitaine Sforza",
          "rives",
          [0, -19],
          "po",
          "Pavie",
        ),
      ],
      depth: 4,
      phases: [2, 3, 4],
      triesPerDay: 1,
      cargo: [
        { level: 11, n: 30 },
        { level: 16, n: 45 },
        { level: 21, n: 60 },
      ],
      priceBps: 15_000,
      relicsPerPlan: 5,
      plans: { arsenalLevel: 3, ships: ["escorte"], tier: 3 },
    },
    // The ink tide (docs/plan-maree.md T1): from the far edge, a row a week toward the lagoon,
    // never past the houses' waters; ten towers held slow it to a fifth of a row a week, a few black
    // straits forced hold it (docs/calibration.md § La marée d'encre).
    encre: {
      start: 25,
      limit: 15,
      rise: 100,
      push: { tower: 8, noir: 10, beacon: 5 },
      priceBps: 1_500,
      lossBps: 2_500,
    },
    // The captains' sorties (docs/plan-maree.md T2): at 18 h (UTC), told a day before. The
    // captain sees three pieces ahead, the lieutenant alone two: a tower left to itself falls six
    // times in ten; its guard laid in advance, or its holder meeting the sortie, hold it.
    sorties: { hour: 18, announceMs: 24 * HOUR, depth: 3, guardDepth: 2 },
    // The leagues (docs/plan-maree.md T5) are frozen for the beta (decision D2 of the audit of
    // 13 November 2026): one league, no house moves; `ligues` comes back with full lagoons.
    // The Doge's decrees (docs/plan-maree.md T3) are withdrawn for the beta (D2) as well.
    // The Muda (docs/plan-muda.md N2): loaded Wednesday to Friday from the pier of San Marco,
    // sailing on Saturday from 8 to 20 (UTC) past three straits, back on Sunday at 8; × 1, then
    // half again a strait passed (docs/calibration.md § La Muda).
    muda: {
      pier: "mole-de-san-marco",
      loadDays: [2, 3, 4],
      sailDay: 5,
      sailHours: [8, 20],
      returnDay: 6,
      returnHour: 8,
      holdPerHouse: 60,
      dailyCap: 20,
      robotDaily: 10,
      straits: [
        { id: "zara", name: "Le large de Zara", board: "zara", x: HALF + 8, y: HALF },
        { id: "curzola", name: "Le canal de Curzola", board: "curzola", x: HALF + 13, y: HALF },
        {
          id: "otrante",
          name: "Le canal d\u2019Otrante",
          board: "otrante",
          x: HALF + 17,
          y: HALF,
        },
      ],
      depth: 3,
      stepBps: 5_000,
      prestige: { contributor: 30, minUnits: 20, volunteer: 5, winner: 25 },
    },
    // The problem of the day (docs/plan-hex-commerce.md H3): the same twenty, 20 of Prestige.
    daily: { problems: venice1450PasseJour.map((p) => p.id), prestige: 20 },
  },
};

/** The Muda's pier, at San Marco: what it takes, at Venice's price (its gauge is never spent). */
const MUDA_PIER: PlancheCity = {
  id: "mole-de-san-marco",
  name: "Le môle de San Marco",
  x: HALF,
  y: HALF + 3,
  via: [],
  ring: "muda",
  wants: Object.fromEntries(
    // Raw goods too, at a little less: a new house's island makes little else.
    Object.entries({
      wheat: 260,
      clay: 260,
      sand: 240,
      wood: 300,
      hemp: 300,
      salt: 500,
      flour: 520,
      planks: 720,
      bricks: 690,
      rope: 920,
      glass: 1_380,
    }).map(([g, price]) => [g, { price, floorBps: 10_000, cap: 1, regenPerHour: 0 }]),
  ),
};

const lagoon = plancheLagoon(venice1450LaguneParams);
export const venice1450Lagune: PlancheSetup = { ...lagoon, cities: [...lagoon.cities, MUDA_PIER] };
