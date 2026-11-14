import { describe, expect, it } from "vitest";
import {
  type NoirRules,
  PASSE_CHAIN,
  PASSE_EMPTY,
  type PlancheSetup,
  type PlancheState,
  plancheAssemble,
  plancheBuild,
  plancheInit,
  plancheInvariant,
  plancheMonday,
  plancheNoirBoard,
  plancheNoirMind,
  plancheNoirPhase,
  plancheNoirPrice,
  plancheNoirTry,
  plancheNoirWin,
  plancheSetLevel,
  plancheShip,
  plancheUpgrade,
} from "../../src/index.js";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
// A Monday.
const T0 = Date.parse("2026-11-16T10:00:00Z");

const noir = (): NoirRules => ({
  minLevel: 3,
  straits: [
    {
      id: "turc",
      name: "Le détroit du Turc",
      power: "turc",
      captain: "Le Kapudan",
      style: "meute",
      x: 4,
      y: 7,
      board: "grand",
      port: "Alexandrie",
    },
    {
      id: "genes",
      name: "Le détroit de Gênes",
      power: "genes",
      captain: "Le Doria",
      style: "mur",
      x: 6,
      y: 7,
      board: "grand",
      port: "Gênes",
    },
  ],
  depth: 4,
  phases: [1, 2, 3],
  triesPerDay: 2,
  cargo: [
    { level: 3, n: 20 },
    { level: 5, n: 40 },
  ],
  priceBps: 30_000,
  relicsPerPlan: 3,
  plans: { arsenalLevel: 2, ships: ["escorte"], tier: 3 },
});

function setup(): PlancheSetup {
  return {
    width: 8,
    height: 8,
    sliceMs: HOUR,
    goods: { sel: "Sel", verre: "Verre" },
    houses: [
      { id: "ana", name: "Ana", robot: false, x: 2, y: 2, makes: {}, soil: { sable: 1 } },
      { id: "ben", name: "Ben", robot: false, x: 5, y: 2, makes: {}, soil: { sable: 1 } },
    ],
    cities: [
      {
        id: "padoue",
        name: "Padoue",
        x: 1,
        y: 0,
        via: [],
        wants: {
          sel: { price: 100, floorBps: 5_000, cap: 100, regenPerHour: 10 },
          verre: { price: 300, floorBps: 5_000, cap: 100, regenPerHour: 10 },
        },
      },
      {
        id: "trevise",
        name: "Trévise",
        x: 6,
        y: 0,
        via: [],
        wants: { sel: { price: 140, floorBps: 5_000, cap: 100, regenPerHour: 10 } },
      },
    ],
    passages: [],
    ile: {
      startTiles: ["0,0", "1,0", "0,1", "1,1"],
      maxTiles: 36,
      tileCost: { base: 100, growthBps: 0 },
      levelYieldBps: [10_000, 15_000, 20_000],
      workshops: {
        pit: {
          name: "Sablière",
          tier: 1,
          terrain: "sable",
          inputs: {},
          outputs: { sel: 1 },
          lotsPerHour: 1,
          cost: [100, 200],
          buildMs: [0, 0],
        },
        orfevre: {
          name: "Orfèvrerie",
          tier: 3,
          terrain: "sable",
          inputs: {},
          outputs: { verre: 1 },
          lotsPerHour: 1,
          cost: [100],
          buildMs: [0],
        },
        arsenal: {
          name: "Arsenal",
          tier: 1,
          terrain: "sable",
          inputs: {},
          outputs: {},
          lotsPerHour: 0,
          cost: [1_000, 2_000],
          buildMs: [0, 0],
        },
      },
      bonus: { terrainBps: 0, supplierBps: 0, nuisanceBps: 0 },
    },
    maison: {
      curve: 10,
      maxLevel: 6,
      titles: [{ from: 1, name: "Échoppe" }],
      unlocks: [{ level: 1, bobbins: 3, tiles: 36, tier: 3, towers: 1 }],
      weeklyCap: 100,
      catchUpBps: 5_000,
      commerce: { perDucats: 100, dailyCap: 10 },
      gains: {
        rival: 0,
        placeTop: 0,
        placeStep: 0,
        seal: 0,
        guardHours: 1,
        guardCap: 0,
        laurel: 0,
        doge: 0,
      },
    },
    arsenal: {
      workshop: "arsenal",
      minLevel: 1,
      cales: [2, 2],
      ships: {
        galere: {
          name: "Galère",
          goods: { sel: 5 },
          buildMs: HOUR,
          force: 2,
          hull: 4,
          keyword: "solide",
          minLevel: 1,
        },
        escorte: {
          name: "Nef d'escorte",
          goods: { verre: 5 },
          buildMs: HOUR,
          force: 0,
          hull: 3,
          keyword: "repare",
          minLevel: 1,
        },
      },
      places: [{ level: 1, n: 4 }],
      refitBps: 3_333,
      repair: { bps: 3_333, ms: HOUR },
      port: { passes: ["bouche"], slots: [{ level: 1, n: 1 }], defenses: {} },
      power: { workshop: 10, arsenal: 20, ship: 5, defense: 15 },
    },
    noir: noir(),
    rules: {
      bobbins: 3,
      store: 200,
      startStock: 0,
      startDucats: 100_000,
      threadPerHour: 10,
      patinaBpsPerDay: 0,
      patinaMaxBps: 0,
      tollMaxBps: 1_500,
      tollBurnBps: 3_000,
      freeAfterForceMs: 24 * HOUR,
      rewindMsPerTile: 60_000,
    },
  };
}

/** Ana at a level, her store full of salt and glass. */
function stocked(S: PlancheSetup, level = 3): PlancheState {
  const s = plancheSetLevel(S, plancheInit(S, T0), "ana", level);
  const h = s.houses.ana;
  if (h) h.stock = { sel: 100, verre: 100 };
  return s;
}

const BOARD = Array.from({ length: 81 }, () => PASSE_EMPTY);

// The black straits (docs/plan-muda.md N1).
describe("the black straits", () => {
  it("open at their level, two tries a day, a cargo within the level's cap and the store", () => {
    const S = setup();
    const low = stocked(S, 2);
    expect(() => plancheNoirTry(S, low, "ana", "turc", { good: "sel", n: 10 }, true, T0)).toThrow(
      "planche_level",
    );
    const s = stocked(S);
    expect(() => plancheNoirTry(S, s, "ana", "turc", { good: "sel", n: 21 }, true, T0)).toThrow(
      "planche_noir_cargo",
    );
    expect(() => plancheNoirTry(S, s, "ana", "turc", { good: "sel", n: 0 }, true, T0)).toThrow(
      "planche_noir_cargo",
    );
    let t = plancheNoirTry(S, s, "ana", "turc", { good: "sel", n: 10 }, false, T0);
    t = plancheNoirTry(S, t, "ana", "genes", { good: "sel", n: 10 }, false, T0);
    expect(() => plancheNoirTry(S, t, "ana", "turc", { good: "sel", n: 10 }, true, T0)).toThrow(
      "planche_noir_tried",
    );
    // A new day, two tries again.
    expect(() =>
      plancheNoirTry(S, t, "ana", "turc", { good: "sel", n: 10 }, true, T0 + DAY),
    ).not.toThrow();
    // A higher level carries more.
    const high = stocked(S, 5);
    expect(() =>
      plancheNoirTry(S, high, "ana", "turc", { good: "sel", n: 40 }, true, T0),
    ).not.toThrow();
  });

  it("sells a cargo forced at the far port, thrice the board's best price, and a relic falls", () => {
    const S = setup();
    expect(plancheNoirPrice(S, "sel")).toBe(420);
    const s0 = stocked(S);
    const before = s0.houses.ana?.ducats ?? 0n;
    const s = plancheNoirTry(S, s0, "ana", "turc", { good: "sel", n: 10 }, true, T0);
    expect(s.houses.ana?.stock.sel).toBe(90);
    expect(s.houses.ana?.ducats).toBe(before + 4_200n);
    expect(s.houses.ana?.book.sold).toBe(4_200n);
    expect(s.houses.ana?.relics).toEqual({ turc: 1 });
    expect(s.houses.ana?.maison?.noir).toBe(1);
    expect(s.houses.ana?.maison?.log.at(-1)).toMatchObject({ kind: "relic", data: "turc" });
    expect(s.noir?.feats).toEqual([{ house: "ana", strait: "turc", at: T0 }]);
    expect(plancheInvariant(s)).toBe(true);
  });

  it("sinks the cargo of a duel lost, and nothing else", () => {
    const S = setup();
    const s0 = stocked(S);
    const s = plancheNoirTry(S, s0, "ana", "turc", { good: "verre", n: 20 }, false, T0);
    expect(s.houses.ana?.stock.verre).toBe(80);
    expect(s.houses.ana?.ducats).toBe(s0.houses.ana?.ducats);
    expect(s.houses.ana?.relics).toBeUndefined();
    expect(s.noir?.feats).toEqual([]);
    expect(plancheInvariant(s)).toBe(true);
  });

  it("hardens its guard each time it is forced in the week, back to the first phase on Monday", () => {
    const S = setup();
    let s = stocked(S);
    expect(plancheNoirPhase(S, s, "turc", T0)).toEqual({ phase: 0, links: 1 });
    s = plancheNoirTry(S, s, "ana", "turc", { good: "sel", n: 5 }, true, T0);
    expect(plancheNoirPhase(S, s, "turc", T0)).toEqual({ phase: 1, links: 2 });
    // Another strait is not hardened.
    expect(plancheNoirPhase(S, s, "genes", T0)).toEqual({ phase: 0, links: 1 });
    s = plancheNoirTry(S, s, "ana", "turc", { good: "sel", n: 5 }, true, T0 + HOUR);
    s = plancheNoirTry(S, s, "ana", "turc", { good: "sel", n: 5 }, true, T0 + DAY);
    // The last phase stays.
    expect(plancheNoirPhase(S, s, "turc", T0 + DAY)).toEqual({ phase: 2, links: 3 });
    const monday = plancheMonday(T0) + 7 * DAY;
    expect(plancheNoirPhase(S, s, "turc", monday)).toEqual({ phase: 0, links: 1 });
    expect(s.noir?.total.turc).toBe(3);
  });

  it("lays its captain's links where the day says: the same on every server, another each day", () => {
    const S = setup();
    const s = stocked(S);
    const a = plancheNoirBoard(S, s, "turc", T0, BOARD);
    expect(a.filter((c) => c === PASSE_CHAIN)).toHaveLength(1);
    expect(plancheNoirBoard(S, s, "turc", T0 + HOUR, BOARD)).toEqual(a);
    const days = new Set(
      [0, 1, 2, 3, 4].map((d) =>
        plancheNoirBoard(S, s, "turc", T0 + d * DAY, BOARD).indexOf(PASSE_CHAIN),
      ),
    );
    expect(days.size).toBeGreaterThan(1);
    expect(plancheNoirMind(S, "genes")).toEqual({ depth: 4, style: "mur" });
  });
});

describe("the relics and the plans", () => {
  /** Ana with relics of the Turk. */
  function relics(S: PlancheSetup, n: number): PlancheState {
    let s = stocked(S);
    for (let k = 0; k < n; k++)
      s = plancheNoirTry(S, s, "ana", "turc", { good: "sel", n: 1 }, true, T0 + k * DAY);
    return s;
  }

  it("makes a plan of three relics of one power", () => {
    const S = setup();
    expect(() => plancheAssemble(S, relics(S, 2), "ana", "turc", T0)).toThrow("planche_few_relics");
    const s = plancheAssemble(S, relics(S, 4), "ana", "turc", T0 + 5 * DAY);
    expect(s.houses.ana?.relics).toEqual({ turc: 1 });
    expect(s.houses.ana?.plans).toBe(1);
    expect(s.houses.ana?.maison?.log.at(-1)).toMatchObject({ kind: "plan", data: "turc" });
  });

  it("asks a plan of the high works, and spends it", () => {
    const S = setup();
    // A workshop of the high tier.
    expect(() => plancheBuild(S, stocked(S), "ana", "orfevre", "1,1", T0)).toThrow(
      "planche_no_plan",
    );
    let s = plancheAssemble(S, relics(S, 3), "ana", "turc", T0 + 3 * DAY);
    s = plancheBuild(S, s, "ana", "orfevre", "1,1", T0 + 3 * DAY);
    expect(s.houses.ana?.plans).toBe(0);
    // The Arsenal raised to its level 2.
    s = plancheBuild(S, s, "ana", "arsenal", "0,1", T0 + 3 * DAY);
    expect(() => plancheUpgrade(S, s, "ana", "0,1", T0 + 3 * DAY)).toThrow("planche_no_plan");
    // A ship that asks one; another that does not.
    expect(() => plancheShip(S, s, "ana", "escorte", T0 + 3 * DAY)).toThrow("planche_no_plan");
    expect(() => plancheShip(S, s, "ana", "galere", T0 + 3 * DAY)).not.toThrow();
    const h = s.houses.ana;
    if (h) h.plans = 2;
    s = plancheUpgrade(S, s, "ana", "0,1", T0 + 3 * DAY);
    s = plancheShip(S, s, "ana", "escorte", T0 + 3 * DAY);
    expect(s.houses.ana?.plans).toBe(0);
  });
});

// The duel played by the server (docs/plan-duels.md B1): its try written lost at the start, then won.
describe("a black strait begun, then won", () => {
  it("ends as a strait won at once", () => {
    const S = setup();
    const s0 = stocked(S);
    const begun = plancheNoirTry(S, s0, "ana", "turc", { good: "sel", n: 10 }, false, T0);
    const won = plancheNoirWin(S, begun, "ana", "turc", { good: "sel", n: 10 }, T0);
    const once = plancheNoirTry(S, s0, "ana", "turc", { good: "sel", n: 10 }, true, T0);
    expect(won.houses.ana?.ducats).toBe(once.houses.ana?.ducats);
    expect(won.houses.ana?.stock).toEqual(once.houses.ana?.stock);
    expect(won.houses.ana?.relics).toEqual({ turc: 1 });
    expect(won.noir?.tries).toEqual(once.noir?.tries);
    expect(plancheInvariant(won)).toBe(true);
  });
});
