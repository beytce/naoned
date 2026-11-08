import { describe, expect, it } from "vitest";
import { freeTileOf } from "../src/empire/NewWorkshop.js";
import type { EmpirePayload } from "../src/empire/types.js";
import { boardOf } from "../src/porcellana/board/scene.js";

// The Carte on square tiles (docs/plan-porcellana.md lot 3): what stands on each tile.
const NOW = 1_000_000;
function payload(over: Record<string, unknown> = {}): EmpirePayload {
  const map = {
    grid: "square",
    tileSize: 10,
    hexSize: 24,
    cells: {
      "1,1": { region: "veneto", coast: true },
      "2,1": { region: "veneto", coast: false },
      "3,1": { region: "veneto", coast: false },
      "2,2": { region: "veneto", coast: true },
    },
    revealed: ["1,1", "2,1", "3,1", "2,2", "1,2", "2,3"],
    posts: [],
    home: { x: 35, y: 15, level: 1, reach: 0, cell: "3,1", placed: true },
    reach: null,
    postSpacing: 0,
    transferUnitsPerHour: 20,
    buyable: [
      { cell: "4,1", region: "veneto", coast: false, casa: 1 },
      { cell: "3,0", region: "lombardia", coast: false, casa: 4 },
      { cell: "9,9", region: "levante", coast: true, casa: 4 },
    ],
    sectorCost: "7500",
    covered: [],
    unlocked: ["2,1", "3,1", "2,2"],
    sites: [],
    arsenal: null,
    camp: null,
    cities: [
      { code: "venezia", cell: "1,1", region: "veneto", x: 15, y: 15, size: 5 },
      { code: "padova", cell: "5,3", region: "veneto", x: 55, y: 35, size: 3 },
    ],
    roads: [
      {
        from: "w1",
        to: "home",
        pts: [
          [25, 15],
          [35, 15],
        ],
      },
    ],
    radius: 1,
    campSite: null,
    depot: null,
    depotSite: null,
    ...over,
  };
  return {
    catalog: [],
    goods: {},
    stock: { flour: 5 },
    view: {
      house: {
        casa: 1,
        workshops: [
          {
            id: "w1",
            type: "mill",
            recipe: "mill_flour",
            level: 2,
            tile: "2,1",
            job: { startedAt: NOW - 500, batchMs: 1_000, batches: 3 },
          },
        ],
      },
      orders: [
        {
          city: "padova",
          cap: 3,
          orders: [
            { id: "o1", good: "flour", qty: 2, pay: "100" },
            { id: "o2", good: "wheat", qty: 50, pay: "100" },
          ],
        },
      ],
      vehicles: { mine: [] },
      stores: [{ post: "home", goods: { flour: 5 } }],
      map,
    },
  } as unknown as EmpirePayload;
}

describe("the board of the house", () => {
  it("is drawn only on a map of square tiles", () => {
    expect(boardOf(payload({ grid: "hex" }), NOW)).toBeNull();
  });

  it("puts the fondaco, the workshops, the towns, the plots and the sea on their tiles", () => {
    const b = boardOf(payload(), NOW);
    const at = (k: string) => b?.tiles.find((x) => x.key === k);
    expect(b?.home).toBe("3,1");
    expect(at("3,1")?.model).toBe("fondaco");
    expect(at("2,1")?.model).toBe("mill");
    expect(at("2,1")?.running).toBe(true);
    expect(at("2,2")?.model).toBe("lane");
    expect(at("1,1")?.model).toBe("market"); // Venice is San Marco
    expect(at("5,3")?.model).toBe("town");
    expect(at("4,1")?.model).toBe("plot");
    expect(at("3,0")?.model).toBe("locked");
    expect(at("9,9")).toBeUndefined(); // across the sea, of a region closed: not drawn
    expect(at("1,2")?.water).toBe(true);
    expect(b?.roads).toHaveLength(1);
  });

  it("gives each place its card and the game's target behind its round button", () => {
    const b = boardOf(payload(), NOW);
    const place = (k: string) => b?.tiles.find((x) => x.key === k)?.place;
    expect(place("2,1")?.target).toEqual({ kind: "workshop", id: "w1" });
    expect(place("3,1")?.target).toEqual({ kind: "casa" });
    expect(place("1,1")?.target).toEqual({ kind: "city", code: "venezia" });
    expect(place("1,1")?.name).toBe("San Marco");
    expect(place("5,3")?.pin).toBe("2");
    expect(place("5,3")?.ready).toBe(true);
    // Its crates on the quay: the flour the house has, the wheat it lacks.
    expect(b?.tiles.find((x) => x.key === "5,3")?.crates).toEqual([true, false]);
    expect(place("4,1")?.target).toEqual({ kind: "sector", cell: "4,1" });
    expect(place("4,1")?.sub).toContain("75");
  });

  it("shows a workshop's lots ready on its pin", () => {
    const b = boardOf(payload(), NOW + 5_000);
    const mill = b?.tiles.find((x) => x.key === "2,1");
    expect(mill?.running).toBe(false);
    expect(mill?.place?.pin).toBe("3");
  });
});

describe("the free tile to build on", () => {
  it("is the house's own, of the region, free, nearest the fondaco", () => {
    // 2,1 holds the mill, 3,1 the fondaco: 2,2 is the free one.
    expect(freeTileOf(payload(), "veneto")).toBe("2,2");
    expect(freeTileOf(payload({ unlocked: ["2,1", "3,1"] }), "veneto")).toBeNull();
    expect(freeTileOf(payload({ grid: "hex" }), "veneto")).toBeNull();
  });

  it("shows its « + » always, its card offering to build (P0-12 of the players' audit)", () => {
    const b = boardOf(payload(), NOW);
    const free = b?.tiles.find((x) => x.key === "2,2")?.place;
    expect(free?.target).toEqual({ kind: "free", tile: "2,2" });
    expect(free?.quiet).toBeFalsy();
    expect(free?.pin).toBe("+");
    expect(free?.plus).toBe(true);
  });
});

describe("a workshop under way", () => {
  it("stands as a site on its tile", () => {
    const p = payload();
    (p.view as unknown as { house: { builds: unknown[] } }).house.builds = [
      { kind: "newWorkshop", cell: "2,2", level: 1 },
    ];
    expect(boardOf(p, NOW)?.tiles.find((x) => x.key === "2,2")?.model).toBe("site");
  });
});
