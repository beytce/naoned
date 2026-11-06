import { describe, expect, it } from "vitest";
import {
  type EmpireWorkshop,
  adviseInterior,
  interiorPaceBps,
  interiorThroughput,
  parseEmpireSettings,
  presetInterior,
} from "../../src/index.js";
import { testEmpire, testInterior } from "../fixture.js";

// Lorenzo's advice in the engine (docs/plan-ateliers.md lots A6 and A8): the screen and the
// simulator's careful bots use the same; and the pace's reference, fresh or worn (a setting).
const s = parseEmpireSettings({ ...testEmpire, interior: testInterior });
const shop = (): EmpireWorkshop => ({
  id: "w1",
  type: "test_works",
  recipe: "",
  level: 1,
  job: null,
  interior: presetInterior("test_works", s, 0),
});

describe("Lorenzo's advice", () => {
  it("is the one move that betters the rate most, and plays out", () => {
    const ws = shop();
    const a = adviseInterior(ws, {}, s, 0);
    expect(a).not.toBeNull();
    const before = interiorThroughput(ws, {}, s).unitsMilliPerHour;
    expect(a?.units ?? 0).toBeGreaterThan(before);
  });

  it("has nothing to say once nothing betters it", () => {
    const ws = shop();
    for (let k = 0; k < 20; k++) {
      const a = adviseInterior(ws, {}, s, 0);
      if (!a) break;
      const st = ws.interior?.stations.find((x) => x.id === a.stationId);
      if (st) Object.assign(st, { x: a.x, y: a.y, rot: a.rot });
      if (ws.interior) ws.interior.links = [];
    }
    expect(adviseInterior(ws, {}, s, 0)).toBeNull();
  });
});

describe("the pace's reference", () => {
  it("fresh by default: the default plan new is 10 000", () => {
    expect(interiorPaceBps(shop(), {} as never, s, 0)).toBe(10_000);
  });

  it("worn when the world says so: the default plan new runs quicker than its reference", () => {
    const worn = parseEmpireSettings({
      ...testEmpire,
      interior: { ...testInterior, reference: "worn" },
    });
    expect(interiorPaceBps(shop(), {} as never, worn, 0)).toBeGreaterThan(10_000);
  });

  it("never passes the hall's ceiling, however many stations are added", () => {
    const capped = parseEmpireSettings({
      ...testEmpire,
      interior: { ...testInterior, maxPaceBps: 11_000 },
    });
    const ws = shop();
    const inside = ws.interior;
    if (!inside) throw new Error("no inside");
    inside.stations.push({
      id: "s9",
      kind: "kiln",
      x: 3,
      y: 0,
      rot: 0,
      level: 1,
      wear: 0,
      care: 0,
    });
    inside.buffers = { "cut>press": 4, "press>bake": 4 };
    const free = interiorPaceBps(ws, { staff: [] } as never, s, 0);
    expect(free).toBeGreaterThan(11_000);
    expect(interiorPaceBps(ws, { staff: [] } as never, capped, 0)).toBe(11_000);
  });
});
