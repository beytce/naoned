import { describe, expect, it } from "vitest";
import { type EmpireSettingsInput, empireHouseAt } from "../../src/index.js";
import { testEmpire } from "../fixture.js";
import { HOUR, World, makeContext } from "../helpers.js";

const empire: EmpireSettingsInput = {
  ...testEmpire,
  start: { capitalDucats: 1_000, workshops: [{ type: "farm", recipe: "grow_wheat" }] },
  staff: {
    hireCostDucats: 0,
    hireGrowthBps: 10_000,
    slotsBase: 1,
    casaPerSlot: 4,
    xpPerLevel: 10,
    maxLevel: 30,
    tierEvery: 5,
    rarityBps: { common: 10_000 },
    roles: { factor: { place: "region", perLevel: {}, paths: [] } },
  },
};

function world(withFactor: boolean) {
  const w = new World(makeContext({ empire }));
  w.do({ type: "empireJoin", playerId: "a" });
  if (withFactor) {
    w.do({ type: "empireHire", playerId: "a", role: "factor" });
    const id = empireHouseAt(w.ctx, w.state, "a", w.now)?.staff?.[0]?.id ?? "";
    w.do({ type: "empirePlace", playerId: "a", staffId: id, at: "veneto" });
  }
  w.do({ type: "empireRelaunchAll", playerId: "a" });
  w.advance(30 * HOUR);
  w.do({ type: "empireRelaunchAll", playerId: "a" });
  return w;
}
const wheat = (w: World) => w.state.inventories.a?.wheat?.available ?? 0;

describe("the factor", () => {
  it("relaunches its region's queues as they run dry, while the house is away", () => {
    // Without: one queue of twelve lots of 20.
    expect(wheat(world(false))).toBe(240);
    // With: relaunched at 12 h and 24 h, then collected at 30 h: 30 lots.
    expect(wheat(world(true))).toBe(600);
  });

  it("grows with the days it works", () => {
    const w = world(true);
    expect(empireHouseAt(w.ctx, w.state, "a", w.now)?.staff?.[0]?.level).toBeGreaterThan(1);
  });
});
