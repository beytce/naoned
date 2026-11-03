import { describe, expect, it } from "vitest";
import {
  type EmpireSettingsInput,
  empireHouseAt,
  empireView,
  hopMs,
  parseEmpireSettings,
  roadBetween,
  roadLength,
  slotPoint,
} from "../../src/index.js";
import type { EmpireHouse } from "../../src/state.js";
import { testEmpire } from "../fixture.js";
import { World, makeContext } from "../helpers.js";

// The small tiles in the game (decision of the owner, 3 November 2026): a fondaco is put down on a
// small tile of its own, never next to a town's, nor next to another fondaco's; the hops are long
// (a whole number of seconds a unit of the chart).
const base = parseEmpireSettings({ ...testEmpire, map: { ...testEmpire.map, hexSize: 24 } });
const tile = (cell: string, k: number): [number, number] => {
  const [x, y] = slotPoint(cell, k, base);
  return [Math.round(x), Math.round(y)];
};
const [vx, vy] = tile("0,0", 1);
const [px, py] = tile("0,1", 3);
const empire: EmpireSettingsInput = {
  ...testEmpire,
  casa: testEmpire.casa.map((c) => ({ ...c, materials: {}, buildMinutes: 0, costDucats: 0 })),
  start: { capitalDucats: 1_000_000, workshops: [], vehicles: ["cart"] },
  vehicles: {
    cart: { casa: 1, capacity: 30, places: 3, costDucats: 100, regions: ["veneto"], speedBps: 0 },
  },
  counters: { maxLevel: 10, bookStepBps: 0, costTimes: 4 },
  map: {
    ...testEmpire.map,
    hexSize: 24,
    tiles: true,
    reach: { base: 60, perLevel: 15 },
    home: { x: tile("0,0", 4)[0], y: tile("0,0", 4)[1] },
    cities: [
      { code: "venezia", cell: "0,0", region: "veneto", x: vx, y: vy },
      { code: "padova", cell: "0,1", region: "veneto", x: px, y: py },
      ...(testEmpire.map?.cities ?? []).filter((c) => !["venezia", "padova"].includes(c.code)),
    ],
  },
};

function world() {
  const w = new World(makeContext({ empire }));
  w.do({ type: "empireJoin", playerId: "a" });
  return w;
}
const house = (w: World) => empireHouseAt(w.ctx, w.state, "a", w.now) as EmpireHouse;
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "" : res.error);
const placeHome = (w: World, cell: string, [x, y]: [number, number]) =>
  w.try({ type: "empirePlaceHome", playerId: "a", cell, x, y });

describe("a fondaco on the small tiles", () => {
  it("is put down on a tile's middle, clear of the towns", () => {
    const w = world();
    // The tile across Venice's sector from it (every other tile of the ring: none touches it).
    expect(placeHome(w, "0,0", tile("0,0", 5)).ok).toBe(true);
    expect(house(w).home).toEqual({ cell: "0,0", x: tile("0,0", 5)[0], y: tile("0,0", 5)[1] });
  });

  it("is never put off a tile's middle, nor next to a town", () => {
    const w = world();
    const [x, y] = tile("0,0", 5);
    expect(error(placeHome(w, "0,0", [x + 3, y]))).toBe("unknown_cell");
    // Next to Venice (the tile beside its own), on Venice itself, in the sector's middle.
    expect(error(placeHome(w, "0,0", tile("0,0", 2)))).toBe("on_city");
    expect(error(placeHome(w, "0,0", tile("0,0", 1)))).toBe("on_city");
    expect(error(placeHome(w, "0,0", tile("0,0", 0)))).toBe("on_city");
  });

  it("puts a counter on a tile clear of the towns and of the house's other fondaci", () => {
    const w = world();
    expect(placeHome(w, "0,0", tile("0,0", 5)).ok).toBe(true);
    // Beside the first fondaco: too close; two tiles off it and off Venice: free.
    const [nx, ny] = tile("0,0", 4);
    expect(
      error(w.try({ type: "empirePlaceCounter", playerId: "a", cell: "0,0", x: nx, y: ny })),
    ).toBe("post_too_close");
    const [fx, fy] = tile("0,0", 3);
    expect(
      error(w.try({ type: "empirePlaceCounter", playerId: "a", cell: "0,0", x: fx, y: fy })),
    ).toBe("");
  });
});

describe("a hop's road in the house's view", () => {
  it("is the very road the engine times, on the whole map (never the part the house sees)", () => {
    const w = world();
    expect(placeHome(w, "0,0", tile("0,0", 5)).ok).toBe(true);
    const v = house(w).vehicles?.[0];
    expect(
      error(
        w.try({ type: "empireMove", playerId: "a", vehicleId: v?.id ?? "", to: "city:venezia" }),
      ),
    ).toBe("");
    const s = parseEmpireSettings(empire);
    const leg = empireView(w.ctx, w.state, "a", w.now)?.vehicles.mine[0]?.legs[0];
    const want = roadBetween(tile("0,0", 5), [vx, vy], s);
    expect(leg?.road?.[0]).toEqual(want[0]);
    expect(leg?.road?.at(-1)).toEqual(want.at(-1));
    expect(roadLength(leg?.road ?? [])).toBeCloseTo(roadLength(want), 0);
    expect(leg && leg.arrivesAt - leg.departAt).toBe(hopMs(s, tile("0,0", 5), [vx, vy]));
  });
});

describe("the long hops", () => {
  it("count a whole number of seconds a unit of the chart, when set", () => {
    const slow = parseEmpireSettings({
      ...testEmpire,
      moves: { departSeconds: 10, unitsPerSecond: 8, maxStops: 15, secondsPerUnit: 11 },
    });
    expect(hopMs(slow, [0, 0], [26.6, 0])).toBe(292_600);
    const quick = parseEmpireSettings(testEmpire);
    expect(hopMs(quick, [0, 0], [24, 0])).toBe(3_000);
  });
});
