import { describe, expect, it } from "vitest";
import type { EmpirePayload } from "../src/empire/types.js";
import { HORIZON, fadeOf, silhouette } from "../src/porcellana/board/Horizon.js";
import { HORIZON_FAR, boardOf } from "../src/porcellana/board/scene.js";

// The horizon and the shores (docs/plan-carte-vivante.md, lot 4): what lies round the board.
const NOW = 1_000_000;
function payload(over: Record<string, unknown> = {}): EmpirePayload {
  return {
    catalog: [],
    goods: {},
    stock: {},
    view: {
      house: { casa: 1, workshops: [] },
      orders: [],
      vehicles: { mine: [] },
      stores: [],
      map: {
        grid: "square",
        tileSize: 10,
        cells: {
          "2,1": { region: "veneto", coast: true },
          "3,1": { region: "veneto", coast: false },
        },
        revealed: ["2,1", "3,1", "2,2", "3,2"],
        terrain: { "5,1": "forest", "9,1": "fields" },
        terrains: { forest: { buildings: ["lumber_camp"], bonusBps: 1_000 } },
        horizon: [{ cell: "5,1" }, { cell: "6,1", town: 4 }, { cell: "4,3" }, { cell: "30,1" }],
        posts: [],
        home: { x: 35, y: 15, level: 1, reach: 0, cell: "3,1", placed: true },
        buyable: [
          { cell: "4,1", region: "veneto", coast: false, casa: 1 },
          { cell: "3,0", region: "veneto", coast: false, casa: 1 },
          // Lombardy's, not open yet and not touching: left out of the board, on the horizon.
          { cell: "5,2", region: "lombardia", coast: false, casa: 6 },
        ],
        sectorCost: "7500",
        covered: [],
        unlocked: ["2,1", "3,1"],
        sites: [],
        cities: [],
        roads: [],
        ...over,
      },
    },
  } as unknown as EmpirePayload;
}

describe("the horizon on the board", () => {
  const scene = boardOf(payload(), NOW);
  const at = (k: string) => scene?.horizon.find((h) => `${h.i},${h.j}` === k);

  it("draws the land the engine tells beyond the house's own, by how far it lies", () => {
    expect(at("5,1")).toMatchObject({ far: 2, terrain: "forest" });
    expect(at("4,3")).toMatchObject({ far: 3 });
    expect(scene?.horizonReach).toBe(3);
  });

  it("shows a town out of reach as a silhouette", () => {
    expect(at("6,1")?.town).toBe(4);
  });

  it("takes in the plots the board leaves out, never a tile the board shows", () => {
    expect(at("5,2")).toBeDefined();
    // The plots one may buy now are on the board, with their « + ».
    expect(at("4,1")).toBeUndefined();
    expect(at("3,0")).toBeUndefined();
    expect(at("3,1")).toBeUndefined();
  });

  it("stops where the land lies too far", () => {
    expect(at("30,1")).toBeUndefined();
    for (const h of scene?.horizon ?? []) expect(h.far).toBeLessThanOrEqual(HORIZON_FAR);
  });

  it("is none where the engine tells none", () => {
    const none = boardOf(payload({ horizon: undefined, buyable: [] }), NOW);
    expect(none?.horizon).toEqual([]);
    expect(none?.horizonReach).toBe(0);
  });
});

describe("a horizon tile's silhouette", () => {
  const tile = { i: 0, j: 0, far: 2, seed: 5 };

  it("tells its land by its pieces, a town by its houses and its tower", () => {
    expect(silhouette({ ...tile, terrain: "forest" }).every((p) => p.cone)).toBe(true);
    expect(silhouette({ ...tile, terrain: "fields" }).every((p) => !p.cone)).toBe(true);
    const hamlet = silhouette({ ...tile, town: 1 });
    const city = silhouette({ ...tile, town: 5 });
    expect(city.length).toBeGreaterThan(hamlet.length);
    expect(Math.max(...city.map((p) => p.h))).toBeGreaterThan(3);
  });

  it("stays on its tile, the same at every call", () => {
    for (const terrain of ["forest", "fields", "pasture", "clay", "sand", undefined])
      for (let seed = 1; seed < 9; seed++) {
        const pieces = silhouette({ ...tile, seed, ...(terrain ? { terrain } : {}) });
        expect(pieces).toEqual(silhouette({ ...tile, seed, ...(terrain ? { terrain } : {}) }));
        for (const p of pieces) {
          expect(Math.abs(p.x) + Math.min(p.w, p.d) / 2).toBeLessThanOrEqual(3);
          expect(Math.abs(p.z) + Math.min(p.w, p.d) / 2).toBeLessThanOrEqual(3);
        }
      }
  });

  it("fades with the distance, never quite gone, never as bright as the board", () => {
    expect(fadeOf(1, 4)).toBeCloseTo(HORIZON.fadeFrom, 6);
    expect(fadeOf(4, 4)).toBeCloseTo(HORIZON.fadeTo, 6);
    expect(fadeOf(2, 4)).toBeGreaterThan(fadeOf(1, 4));
    expect(fadeOf(9, 4)).toBeCloseTo(HORIZON.fadeTo, 6);
    expect(HORIZON.fadeTo).toBeLessThan(1);
  });
});

describe("the shores", () => {
  it("tells each tile of water which of its sides touch the land", () => {
    const scene = boardOf(payload(), NOW);
    const water = (k: string) => scene?.tiles.find((t) => t.key === k);
    // Under the house's two tiles: the land to the north.
    expect(water("2,2")?.water).toBe(true);
    expect(water("2,2")?.shore).toEqual([true, false, false, false]);
    expect(water("3,2")?.shore).toEqual([true, false, false, false]);
  });
});
