import { describe, expect, it } from "vitest";
import { type EmpireSettingsInput, empireView } from "../../src/index.js";
import { testEmpire, testInterior } from "../fixture.js";
import { HOUR, World, makeContext } from "../helpers.js";

// The view of the insides (docs/plan-ateliers.md § 5.6, lot A4): each workshop's hall, its
// stations and hands settled to now, its rate and its pace; and the rules, for the screen to
// reckon while a machine is dragged.
const base: EmpireSettingsInput = {
  ...testEmpire,
  start: { capitalDucats: 10_000, workshops: [{ type: "farm", recipe: "grow_wheat" }] },
};
const withInterior: EmpireSettingsInput = {
  ...base,
  interior: { ...testInterior, buildings: { farm: testInterior.buildings.test_works as never } },
};

function world(empire: EmpireSettingsInput) {
  const w = new World(makeContext({ empire }));
  w.do({ type: "empireJoin", playerId: "a" });
  return w;
}

describe("the view of the insides", () => {
  it("is empty in a world without them", () => {
    const w = world(base);
    const v = empireView(w.ctx, w.state, "a", w.now);
    expect(v?.interiors).toEqual({});
    expect(v?.interiorRules).toBeNull();
  });

  it("shows each workshop's hall, its rate, its bottleneck and its pace", () => {
    const w = world(withInterior);
    const v = empireView(w.ctx, w.state, "a", w.now);
    const id = v?.house.workshops[0]?.id ?? "";
    const inside = v?.interiors[id];
    expect(inside?.hall).toEqual({ w: 4, h: 3 });
    expect(inside?.doors).toEqual({ in: [-1, 0], out: [4, 2] });
    expect(inside?.walls).toEqual([[2, 2]]);
    expect(inside?.stages).toEqual(["cut", "press", "bake"]);
    expect(inside?.paceBps).toBe(10_000);
    expect(inside?.rate.bottleneck).toEqual({ stage: "bake", station: "s3" });
    expect(inside?.stations).toHaveLength(3);
    expect(inside?.hands).toHaveLength(2);
    expect(v?.interiorRules?.stations.cutter?.levels[0]?.cycleS).toBe(60);
  });

  it("settles wear and fatigue to now, without touching the state", () => {
    const w = world(withInterior);
    w.do({
      type: "empireRelaunch",
      playerId: "a",
      workshopId: w.state.empire?.houses.a?.workshops[0]?.id ?? "",
    });
    w.advance(6 * HOUR);
    const v = empireView(w.ctx, w.state, "a", w.now);
    const inside = Object.values(v?.interiors ?? {})[0];
    expect(inside?.stations[0]?.wear).toBeGreaterThan(0);
    expect(inside?.hands[0]?.fatigue).toBeGreaterThan(0);
    expect(inside?.paceBps).toBeLessThan(10_000);
    expect(w.state.empire?.houses.a?.workshops[0]?.interior?.stations[0]?.wear).toBe(0);
  });
});
