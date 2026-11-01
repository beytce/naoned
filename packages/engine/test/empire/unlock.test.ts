import { describe, expect, it } from "vitest";
import {
  type EmpireSettingsInput,
  empireHouseAt,
  empireView,
  ensureMap,
  parseEmpireSettings,
} from "../../src/index.js";
import type { EmpireHouse } from "../../src/state.js";
import { testEmpire } from "../fixture.js";
import { World, makeContext } from "../helpers.js";

// The sectors bought one by one, next to those already one's own (decision of the owner,
// 1 November 2026): a coast of one's own makes the coasts a short sea away its neighbours. Here the
// fixture's map with « 2,0 » of Lombardy between Venetia and the rest of it, and the Levant
// opened from the Casa 1.
const empire: EmpireSettingsInput = {
  ...testEmpire,
  casa: testEmpire.casa.map((c) => ({ ...c, materials: {}, buildMinutes: 0, costDucats: 0 })),
  start: { capitalDucats: 1_000_000, workshops: [] },
  regions: (testEmpire.regions ?? []).map((r) => (r.code === "levante" ? { ...r, casa: 1 } : r)),
  map: {
    ...testEmpire.map,
    cells: { ...testEmpire.map?.cells, "2,0": { region: "lombardia" } },
    unlock: { costDucats: 100, stepBps: 5_000, seaHops: 9 },
  },
};
const s = parseEmpireSettings(empire);

function world(casa = 1) {
  const w = new World(makeContext({ empire }));
  w.do({ type: "empireJoin", playerId: "a" });
  for (let i = 1; i < casa; i++) w.do({ type: "empireBuildCasa", playerId: "a" });
  return w;
}
const house = (w: World) => empireHouseAt(w.ctx, w.state, "a", w.now) as EmpireHouse;
const map = (w: World) => empireView(w.ctx, w.state, "a", w.now)?.map;
const cash = (w: World) => w.state.accounts["cash:a"] ?? 0n;
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "" : res.error);
const unlock = (w: World, cell: string) => w.try({ type: "empireUnlockCell", playerId: "a", cell });

describe("the sectors bought next to one's own", () => {
  it("starts with Venice's sector, its neighbours to buy", () => {
    const w = world();
    expect(house(w).unlocked).toEqual(["0,0"]);
    expect(Object.keys(map(w)?.cells ?? {})).toEqual(["0,0"]);
    expect(map(w)?.buyable.map((b) => b.cell)).toEqual(["0,1", "1,0", "9,0"]);
  });

  it("sells a neighbour, dearer for each sector already owned", () => {
    const w = world();
    const before = cash(w);
    expect(error(unlock(w, "1,0"))).toBe("");
    expect(before - cash(w)).toBe(100n * 100n);
    expect(house(w).unlocked).toEqual(["0,0", "1,0"]);
    const next = cash(w);
    expect(error(unlock(w, "1,1"))).toBe("");
    expect(next - cash(w)).toBe(150n * 100n);
  });

  it("refuses a sector not next to one's own, or of a region the Casa has not reached", () => {
    const w = world();
    expect(error(unlock(w, "1,1"))).toBe("not_adjacent");
    expect(error(unlock(w, "5,5"))).toBe("unknown_cell");
    w.do({ type: "empireUnlockCell", playerId: "a", cell: "1,0" });
    // Lombardy asks the Casa 4.
    expect(error(unlock(w, "2,0"))).toBe("requirement_unmet");
    expect(error(unlock(w, "1,0"))).toBe("built");
  });

  it("crosses the sea from a coast of one's own to a coast within reach", () => {
    const w = world();
    expect(error(unlock(w, "9,0"))).toBe("");
    // Not « 10,0 » in the same go: it is no coast, and next only to « 9,0 ».
    expect(error(unlock(w, "10,0"))).toBe("");
  });

  it("puts a counter down only on a sector of one's own, and it reveals nothing more", () => {
    const w = world();
    expect(
      error(w.try({ type: "empirePlaceCounter", playerId: "a", cell: "1,0", x: 41, y: 0 })),
    ).toBe("locked_cell");
    w.do({ type: "empireUnlockCell", playerId: "a", cell: "1,0" });
    expect(
      error(w.try({ type: "empirePlaceCounter", playerId: "a", cell: "1,0", x: 41, y: 0 })),
    ).toBe("");
  });
});

describe("a house of before", () => {
  it("owns Venice's sector and those of its counters, its Arsenal become its Remise", () => {
    const sd = parseEmpireSettings({
      ...empire,
      map: { ...empire.map, arsenal: null, depot: { costDucats: 200, casa: 2, minutes: 60 } },
    });
    const h = {
      casa: 4,
      workshops: [],
      builds: [],
      revealed: ["0,0", "1,0", "0,1"],
      mapVersion: sd.map.version,
      posts: [{ id: "p1", cell: "1,0", region: "veneto", x: 41, y: 0, level: 1 }],
      arsenal: "0,0",
    } as unknown as EmpireHouse;
    ensureMap(h, sd);
    expect(h.unlocked).toEqual(["0,0", "1,0"]);
    expect(h.depot).toBe("0,0");
  });
});
