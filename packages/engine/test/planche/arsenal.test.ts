import { describe, expect, it } from "vitest";
import {
  type ArsenalRules,
  type PlancheSetup,
  type PlancheState,
  plancheAdvance,
  plancheBuild,
  plancheDefense,
  plancheDefenseMove,
  plancheDefenseRemove,
  plancheInit,
  planchePower,
  plancheRobotArm,
  plancheSetLevel,
  plancheShip,
  plancheShipDamage,
  plancheShipRefit,
  plancheShipRepair,
  plancheUpgrade,
} from "../../src/index.js";

const MIN = 60_000;
const HOUR = 60 * MIN;
const T0 = Date.parse("2026-11-16T00:00:00Z");

/** The fixture's Arsenal: two kinds of ship, two defenses, a fleet of 2 then 3 places. */
const arsenal = (): ArsenalRules => ({
  workshop: "arsenal",
  minLevel: 2,
  cales: [1, 2],
  ships: {
    galere: {
      name: "Galère",
      goods: { planches: 10, cordes: 5 },
      buildMs: 2 * HOUR,
      force: 2,
      hull: 4,
      keyword: "solide",
      minLevel: 2,
    },
    galeasse: {
      name: "Galéasse",
      goods: { planches: 10, briques: 10 },
      buildMs: 4 * HOUR,
      force: 4,
      hull: 3,
      keyword: "bombarde",
      minLevel: 4,
    },
  },
  places: [
    { level: 2, n: 2 },
    { level: 3, n: 3 },
  ],
  refitBps: 3_333,
  repair: { bps: 3_333, ms: 40 * MIN },
  port: {
    passes: ["bouche", "nord", "sud"],
    slots: [
      { level: 2, n: 1 },
      { level: 4, n: 2 },
    ],
    defenses: {
      tour: { name: "Tour", goods: { briques: 10 }, hull: 6 },
      chaine: { name: "Chaîne", goods: { cordes: 6 } },
    },
  },
  power: { workshop: 10, arsenal: 20, ship: 5, defense: 15 },
});

function setup(): PlancheSetup {
  return {
    width: 8,
    height: 8,
    sliceMs: HOUR,
    goods: { planches: "Planches", cordes: "Cordages", briques: "Briques" },
    houses: [{ id: "ana", name: "Ana", robot: false, x: 2, y: 2, makes: {}, soil: { sable: 1 } }],
    cities: [],
    passages: [],
    ile: {
      startTiles: ["0,0", "1,0", "0,1", "1,1"],
      maxTiles: 36,
      tileCost: { base: 100, growthBps: 0 },
      levelYieldBps: [10_000, 15_000],
      workshops: {
        pit: {
          name: "Sablière",
          tier: 1,
          terrain: "sable",
          inputs: {},
          outputs: { planches: 1 },
          lotsPerHour: 1,
          cost: [100, 200],
          buildMs: [0, 0],
        },
        arsenal: {
          name: "Arsenal",
          tier: 1,
          terrain: "sable",
          inputs: {},
          outputs: {},
          lotsPerHour: 0,
          cost: [1_000, 2_000],
          buildMs: [0, HOUR],
        },
      },
      bonus: { terrainBps: 0, supplierBps: 0, nuisanceBps: 0 },
    },
    maison: {
      curve: 10,
      maxLevel: 6,
      titles: [{ from: 1, name: "Échoppe" }],
      unlocks: [{ level: 1, bobbins: 3, tiles: 36, tier: 1, towers: 1 }],
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
    arsenal: arsenal(),
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

/** Ana at level 2, an Arsenal on her island, her store full of what ships are made of. */
function armed(S = setup()): PlancheState {
  let s = plancheSetLevel(S, plancheInit(S, T0), "ana", 2);
  s = plancheBuild(S, s, "ana", "arsenal", "1,0", T0);
  const h = s.houses.ana;
  if (h) h.stock = { planches: 100, cordes: 50, briques: 50 };
  return s;
}

// The Arsenal and the fleet (docs/plan-arsenal.md A1).
describe("the Arsenal", () => {
  it("opens at its level, and only one stands on an island", () => {
    const S = setup();
    const s = plancheInit(S, T0);
    expect(() => plancheBuild(S, s, "ana", "arsenal", "1,0", T0)).toThrow("planche_level");
    const a = armed(S);
    expect(() => plancheBuild(S, a, "ana", "arsenal", "0,1", T0)).toThrow("planche_arsenal_one");
  });

  it("builds a ship from the store's goods, not from ducats, in a cale, and launches it when done", () => {
    const S = setup();
    let s = armed(S);
    const ducats = s.houses.ana?.ducats;
    s = plancheShip(S, s, "ana", "galere", T0);
    expect(s.houses.ana?.stock).toMatchObject({ planches: 90, cordes: 45 });
    expect(s.houses.ana?.ducats).toBe(ducats);
    expect(s.houses.ana?.fleet?.yards).toHaveLength(1);
    // One cale at the Arsenal's first level: a second ship waits.
    expect(() => plancheShip(S, s, "ana", "galere", T0)).toThrow("planche_no_cale");
    // A kind its level does not open.
    expect(() => plancheShip(S, armed(S), "ana", "galeasse", T0)).toThrow("planche_level");
    s = plancheAdvance(S, s, T0 + 2 * HOUR);
    expect(s.houses.ana?.fleet?.yards).toHaveLength(0);
    expect(s.houses.ana?.fleet?.ships).toEqual([{ id: 1, kind: "galere", level: 1 }]);
  });

  it("refuses a ship the store cannot make", () => {
    const S = setup();
    const s = armed(S);
    const h = s.houses.ana;
    if (h) h.stock = { planches: 5 };
    expect(() => plancheShip(S, s, "ana", "galere", T0)).toThrow("planche_short");
  });

  it("stops when the fleet is full, losing nothing, and goes on once there is room", () => {
    const S = setup();
    let s = armed(S);
    for (let k = 0; k < 2; k++) {
      s = plancheShip(S, s, "ana", "galere", s.now);
      s = plancheAdvance(S, s, s.now + 2 * HOUR);
    }
    expect(s.houses.ana?.fleet?.ships).toHaveLength(2);
    s = plancheShip(S, s, "ana", "galere", s.now);
    s = plancheAdvance(S, s, s.now + 5 * HOUR);
    // Two places at level 2: the third waits on its cale, finished.
    expect(s.houses.ana?.fleet?.ships).toHaveLength(2);
    expect(s.houses.ana?.fleet?.yards).toHaveLength(1);
    s = plancheSetLevel(S, s, "ana", 3);
    s = plancheAdvance(S, s, s.now + HOUR);
    expect(s.houses.ana?.fleet?.ships).toHaveLength(3);
  });

  it("launches its ships at its own level, and a ship refitted gives back a third of its goods", () => {
    const S = setup();
    let s = armed(S);
    s = plancheShip(S, s, "ana", "galere", T0);
    s = plancheAdvance(S, s, T0 + 2 * HOUR);
    const at = Object.entries(s.houses.ana?.ile?.tiles ?? {}).find(
      ([, t]) => t.building?.type === "arsenal",
    )?.[0];
    s = plancheUpgrade(S, s, "ana", at ?? "", s.now);
    s = plancheAdvance(S, s, s.now + HOUR);
    // Two cales now; the next ship is of level 2.
    s = plancheShip(S, s, "ana", "galere", s.now);
    s = plancheShip(S, s, "ana", "galere", s.now);
    s = plancheAdvance(S, s, s.now + 2 * HOUR);
    expect(s.houses.ana?.fleet?.ships.map((x) => x.level)).toEqual([1, 2]);
    const planches = s.houses.ana?.stock.planches ?? 0;
    s = plancheShipRefit(S, s, "ana", 1, s.now);
    expect(s.houses.ana?.fleet?.ships.map((x) => x.id)).toEqual([2]);
    expect(s.houses.ana?.stock.planches).toBe(planches + 3);
  });

  it("repairs a damaged ship with a third of its goods, in under an hour", () => {
    const S = setup();
    let s = armed(S);
    s = plancheShip(S, s, "ana", "galere", T0);
    s = plancheAdvance(S, s, T0 + 2 * HOUR);
    expect(() => plancheShipRepair(S, s, "ana", 1, s.now)).toThrow("planche_not_damaged");
    s = plancheShipDamage(S, s, "ana", 1);
    expect(s.houses.ana?.fleet?.ships[0]?.damaged).toBe(true);
    const cordes = s.houses.ana?.stock.cordes ?? 0;
    s = plancheShipRepair(S, s, "ana", 1, s.now);
    expect(s.houses.ana?.stock.cordes).toBe(cordes - 1);
    expect(s.houses.ana?.fleet?.ships[0]?.repairedAt).toBe(s.now + 40 * MIN);
    s = plancheAdvance(S, s, s.now + HOUR);
    expect(s.houses.ana?.fleet?.ships[0]).toEqual({ id: 1, kind: "galere", level: 1 });
  });
});

describe("the port", () => {
  it("lays defenses of goods on its three passes, a slot each at first, moved and taken back freely", () => {
    const S = setup();
    let s = armed(S);
    s = plancheDefense(S, s, "ana", "bouche", "tour");
    expect(s.houses.ana?.stock.briques).toBe(40);
    expect(s.houses.ana?.port).toEqual({ bouche: ["tour"], nord: [], sud: [] });
    expect(() => plancheDefense(S, s, "ana", "bouche", "chaine")).toThrow("planche_port_full");
    expect(() => plancheDefense(S, s, "ana", "large", "chaine")).toThrow("planche_unknown");
    s = plancheDefenseMove(S, s, "ana", "bouche", 0, "nord");
    expect(s.houses.ana?.port).toEqual({ bouche: [], nord: ["tour"], sud: [] });
    s = plancheDefenseRemove(S, s, "ana", "nord", 0);
    expect(s.houses.ana?.port?.nord).toEqual([]);
    expect(s.houses.ana?.stock.briques).toBe(43);
  });
});

describe("the Power", () => {
  it("counts what is built, never the purse", () => {
    const S = setup();
    let s = armed(S);
    const before = planchePower(S, s, "ana");
    // The Arsenal (20) at level 1.
    expect(before).toBe(20);
    const rich = structuredClone(s);
    if (rich.houses.ana) rich.houses.ana.ducats = 10n ** 12n;
    expect(planchePower(S, rich, "ana")).toBe(before);
    s = plancheBuild(S, s, "ana", "pit", "0,1", T0);
    s = plancheShip(S, s, "ana", "galere", T0);
    s = plancheAdvance(S, s, T0 + 2 * HOUR);
    s = plancheDefense(S, s, "ana", "sud", "tour");
    // A workshop (10), a galley of level 1 (5 × (2 + 4 + 1)), a tower (15).
    expect(planchePower(S, s, "ana")).toBe(20 + 10 + 35 + 15);
  });
});

describe("a house of the computer", () => {
  it("builds its Arsenal at its level, lays the ships its store can make, and mans its port", () => {
    const S = setup();
    let s = plancheSetLevel(S, plancheInit(S, T0), "ana", 2);
    const h = s.houses.ana;
    if (h) h.stock = { planches: 100, cordes: 50, briques: 50 };
    s = plancheRobotArm(S, s, "ana", T0);
    expect(
      Object.values(s.houses.ana?.ile?.tiles ?? {}).some((t) => t.building?.type === "arsenal"),
    ).toBe(true);
    s = plancheRobotArm(S, s, "ana", T0);
    expect(s.houses.ana?.fleet?.yards.map((y) => y.kind)).toEqual(["galere"]);
    // One place a pass at level 2: a tower where the bricks allow.
    expect(Object.values(s.houses.ana?.port ?? {}).flat()).toContain("tour");
    // Nothing more than its places and its cales.
    for (let k = 0; k < 5; k++) s = plancheRobotArm(S, s, "ana", T0);
    expect(s.houses.ana?.fleet?.yards).toHaveLength(1);
    expect(Object.values(s.houses.ana?.port ?? {}).flat().length).toBeLessThanOrEqual(3);
  });
});
