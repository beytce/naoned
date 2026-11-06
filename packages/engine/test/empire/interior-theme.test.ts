import { describe, expect, it } from "vitest";
import {
  type EmpireWorkshop,
  hallAt,
  interiorLayoutProblem,
  interiorThroughput,
  parseEmpireSettings,
  presetInterior,
  venice1450,
  venice1450EmpireInterior,
} from "../../src/index.js";

// The shape of Venice's insides (docs/plan-ateliers.md lot A3): every workshop but the Palazzo has
// one, its default plan stands in the hall of level 1 and works. The figures are the theme's to
// calibrate; only their shape is checked here.
const s = parseEmpireSettings(venice1450EmpireInterior);
const I = s.interior;
if (!I) throw new Error("no interior");
const types = venice1450.buildings.map((b) => b.type).filter((t) => t !== "palazzo");

const workshop = (type: string, level: number): EmpireWorkshop => ({
  id: "w1",
  type,
  recipe: venice1450.recipes.find((r) => r.building === type)?.code ?? "",
  level,
  job: null,
  interior: presetInterior(type, s, 0),
});

describe("Venice's insides", () => {
  it("cover the fourteen workshops, not the Palazzo", () => {
    expect(types).toHaveLength(14);
    expect(Object.keys(I.buildings).sort()).toEqual([...types].sort());
  });

  it.each(types)(
    "%s: its default plan stands in the hall of level 1, and still at the last",
    (t) => {
      expect(interiorLayoutProblem(workshop(t, 1), s)).toBeNull();
      expect(interiorLayoutProblem(workshop(t, s.workshops.maxLevel), s)).toBeNull();
    },
  );

  it.each(types)("%s: each stage has its station, and the plan works with its hands", (t) => {
    const b = I.buildings[t];
    const kinds = new Set(b?.preset.map((p) => p.kind));
    for (const stage of b?.stages ?? [])
      expect(stage.stations.some((k) => kinds.has(k))).toBe(true);
    const r = interiorThroughput(workshop(t, 1), {}, s);
    expect(r.unitsMilliPerHour).toBeGreaterThan(0);
    for (const st of r.stages) expect(st.rateMilli).toBeGreaterThan(0);
  });

  it.each(types)("%s: its doors stand just outside the hall of level 1", (t) => {
    const b = I.buildings[t];
    const { w, h } = hallAt(s, 1);
    for (const [x, y] of [b?.doors.in, b?.doors.out] as [number, number][]) {
      const outside = x < 0 || y < 0 || x >= w || y >= h;
      const beside = x >= -1 && y >= -1 && x <= w && y <= h;
      expect(outside && beside).toBe(true);
    }
  });

  it.each(types)("%s: its bottleneck is alone, so that breaking it pays", (t) => {
    const rates = interiorThroughput(workshop(t, 1), {}, s)
      .stages.map((x) => x.rateMilli)
      .sort((a, b) => a - b);
    expect(rates[0]).toBeLessThan(rates[1] ?? Number.POSITIVE_INFINITY);
  });

  it("every station that takes hands names a trade", () => {
    for (const [code, k] of Object.entries(I.stations))
      if ((k.levels[0]?.seats ?? 0) > 0) expect(k.trades.length, code).toBeGreaterThan(0);
  });

  it("the hall grows from 4 × 3 to 9 × 6 at the last level", () => {
    expect(hallAt(s, 1)).toEqual({ w: 4, h: 3 });
    expect(hallAt(s, s.workshops.maxLevel)).toEqual({ w: 9, h: 6 });
  });

  it("names the bottlenecks the plan names: the threshing floor, the oven, the saw, the spinning wheel", () => {
    const neck = (t: string) => interiorThroughput(workshop(t, 1), {}, s).bottleneck.stage;
    expect(neck("farm")).toBe("thresh");
    expect(neck("mill")).toBe("grind");
    expect(neck("bakery")).toBe("bake");
    expect(neck("sawmill")).toBe("saw");
    expect(neck("brickworks")).toBe("fire");
    expect(neck("glassworks")).toBe("melt");
    expect(neck("loom")).toBe("spin");
  });
});
