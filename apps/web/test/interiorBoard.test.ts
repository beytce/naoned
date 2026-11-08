import {
  type EmpireHouse,
  interiorsOf,
  parseEmpireSettings,
  presetInterior,
  venice1450EmpireInterior,
} from "@comptoirs/engine";
import { describe, expect, it } from "vitest";
import { interiorBoard } from "../src/empire/interior/board.js";
import type { InteriorRules } from "../src/empire/types.js";
import { createPalette } from "../src/porcellana/materials.js";
import { familyOf, stationModel } from "../src/porcellana/models/stations.js";
import { tradeOf } from "../src/porcellana/models/trades.js";

// A workshop's inside as a board (docs/plan-ateliers.md lot A5), from the engine's own view of
// Venice's sawmill: what stands on each flagstone, the ribbons, the pins in the workshop's goods.
const s = parseEmpireSettings(venice1450EmpireInterior);
const rules = JSON.parse(
  JSON.stringify(s.interior, (_, x) => (typeof x === "bigint" ? x.toString() : x)),
) as InteriorRules;

function viewOf(type: string) {
  const house = {
    workshops: [
      { id: "w1", type, recipe: "", level: 1, job: null, interior: presetInterior(type, s, 0) },
    ],
    staff: [],
  } as unknown as EmpireHouse;
  const v = interiorsOf(house, s, 0).w1;
  if (!v) throw new Error("no inside");
  return v;
}

describe("the board of an inside", () => {
  it("lays the sawmill's hall: its stations, the canal down a column, the saw bench on two flagstones", () => {
    const b = interiorBoard(viewOf("sawmill"), rules, 12, 0);
    expect([b.w, b.h]).toEqual([4, 3]);
    expect(b.cells.map((row) => row[3]?.kind)).toEqual(["canal", "canal", "canal"]);
    expect(b.cells[0]?.[0]).toMatchObject({ kind: "station", north: true, west: true });
    expect(b.cells[0]?.[1]).toMatchObject({
      kind: "station",
      look: { kind: "saw_bench", w: 2, h: 1 },
    });
    expect(b.cells[0]?.[2]?.kind).toBe("covered");
    expect(b.cells[0]?.[0]).toMatchObject({ door: { side: "in", wall: "west" } });
  });

  it("names the bottleneck in red, its rate the workshop's goods an hour", () => {
    const b = interiorBoard(viewOf("sawmill"), rules, 12, 0);
    const hot = b.places.filter((p) => p.hot);
    expect(hot.map((p) => p.id)).toEqual(["st:s2"]);
    // Before the buffer's loss, the bottleneck's own rate: a little above the door's.
    expect(hot[0]?.label).toMatch(/^Goulot · 1\d\/h$/);
    expect(b.places.find((p) => p.id === "door:out")?.label).toBe("Sortie · 12/h");
  });

  it("draws a ribbon from the door to each station of the chain, and to the door of the goods", () => {
    const b = interiorBoard(viewOf("sawmill"), rules, 12, 0);
    expect(b.routes).toHaveLength(5);
    for (const r of b.routes) expect(r.length).toBeGreaterThanOrEqual(2);
  });

  it("lays every one of Venice's insides, each station on its flagstone", () => {
    for (const type of Object.keys(s.interior?.buildings ?? {})) {
      const v = viewOf(type);
      const b = interiorBoard(v, rules, 10, 0);
      const drawn = b.cells.flat().filter((c) => c.kind === "station").length;
      expect(drawn, type).toBe(v.stations.length);
    }
  });

  it("has a model for every station of the catalogue, by what it is", () => {
    const P = createPalette();
    expect(familyOf("bread_oven")).toBe("oven");
    expect(familyOf("millstone")).toBe("wheel");
    expect(familyOf("drying_yard")).toBe("shed");
    expect(familyOf("glass_inspection")).toBe("inspection");
    expect(familyOf("kneading")).toBe("bench");
    for (const [kind, k] of Object.entries(rules.stations)) {
      const b = stationModel(
        P,
        { seed: 1, running: true },
        {
          kind,
          w: k.size[0],
          h: k.size[1],
          rot: 0,
          crew: 1,
          neck: true,
          building: false,
        },
      );
      expect(b.group.children.length, kind).toBeGreaterThan(0);
      b.tick?.(1, 0.016);
    }
  });

  it("draws every station by its trade: none is left the bench of before", () => {
    // The sawmill's own four have their models; the others an oven, a wheel, a shed, an inspection
    // or a trade's dress (lot 6, « les intérieurs selon le métier »).
    const own = new Set(["barking", "saw_bench", "drying_shed", "planing"]);
    const plain = Object.keys(rules.stations).filter(
      (kind) => !own.has(kind) && familyOf(kind) === "bench" && tradeOf(kind) === null,
    );
    expect(plain).toEqual([]);
    expect(tradeOf("loom_frame")).toBe("loom");
    expect(tradeOf("kneading")).toBe("dough");
  });
});
