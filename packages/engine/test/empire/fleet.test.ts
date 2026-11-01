import { describe, expect, it } from "vitest";
import {
  type EmpireSettingsInput,
  empireHouseAt,
  empireView,
  fleetCapOf,
} from "../../src/index.js";
import type { EmpireHouse } from "../../src/state.js";
import { testEmpire } from "../fixture.js";
import { HOUR, MIN, World, makeContext } from "../helpers.js";

// The Remise's level caps the transport vehicles a house may hold (decision of the owner,
// 1 November 2026, after Hades' Star's shipyard, whose level caps the fleet).
const empire: EmpireSettingsInput = {
  ...testEmpire,
  casa: testEmpire.casa.map((c) => ({ ...c, materials: {}, buildMinutes: 0, costDucats: 0 })),
  start: { capitalDucats: 100_000, workshops: [], vehicles: ["cart"] },
  map: { ...testEmpire.map, depot: { costDucats: 200, casa: 2, minutes: 60 } },
  vehicles: {
    cart: { casa: 1, capacity: 30, costDucats: 100, regions: ["veneto"], speedBps: 0 },
  },
  fleet: {
    levels: [
      { vehicles: 2, costDucats: 0, casa: 1, minutes: 0 },
      { vehicles: 3, costDucats: 500, casa: 3, minutes: 30 },
      { vehicles: 5, costDucats: 1_000, casa: 4, minutes: 60 },
    ],
  },
};

function world(casa = 2) {
  const w = new World(makeContext({ empire }));
  w.do({ type: "empireJoin", playerId: "a" });
  for (let i = 1; i < casa; i++) w.do({ type: "empireBuildCasa", playerId: "a" });
  w.do({ type: "empireBuildDepot", playerId: "a", cell: "1,0" });
  w.advance(HOUR);
  return w;
}
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "" : res.error);
const house = (w: World) => empireHouseAt(w.ctx, w.state, "a", w.now) as EmpireHouse;
const cash = (w: World) => w.state.accounts["cash:a"] ?? 0n;
const buy = (w: World) => w.try({ type: "empireBuyVehicle", playerId: "a", vehicleType: "cart" });
const raise = (w: World) => w.try({ type: "empireUpgradeDepot", playerId: "a" });

describe("the fleet capped by the Remise's level", () => {
  it("buys up to the cap of the Remise's level, then refuses", () => {
    const w = world();
    expect(fleetCapOf(house(w), w.ctx.settings.empire as never)).toBe(2);
    expect(buy(w).ok).toBe(true);
    expect(house(w).vehicles).toHaveLength(2);
    expect(error(buy(w))).toBe("fleet_full");
  });

  it("raises the Remise by a site, at its Casa and price, for a greater fleet", () => {
    const w = world(2);
    expect(error(raise(w))).toBe("requirement_unmet");
    w.do({ type: "empireBuildCasa", playerId: "a" });
    const before = cash(w);
    expect(raise(w).ok).toBe(true);
    expect(before - cash(w)).toBe(500n * 100n);
    expect(error(raise(w))).toBe("building_busy");
    w.advance(30 * MIN);
    expect(house(w).depotLevel).toBe(2);
    expect(buy(w).ok).toBe(true);
    expect(buy(w).ok).toBe(true);
    expect(error(buy(w))).toBe("fleet_full");
    expect(house(w).vehicles).toHaveLength(3);
    const view = empireView(w.ctx, w.state, "a", w.now);
    expect(view?.fleet).toEqual(
      expect.objectContaining({ level: 2, vehicles: 3, cap: 3, next: expect.anything() }),
    );
  });

  it("stops at its last level", () => {
    const w = world(4);
    raise(w);
    w.advance(30 * MIN);
    raise(w);
    w.advance(HOUR);
    expect(house(w).depotLevel).toBe(3);
    expect(error(raise(w))).toBe("max_level");
    expect(empireView(w.ctx, w.state, "a", w.now)?.fleet?.next).toBeNull();
  });

  it("takes away nothing from a house already beyond its cap", () => {
    const w = world();
    w.do({
      type: "adminEdit",
      playerId: "a",
      edit: { kind: "vehicle", vehicleType: "cart" },
    });
    w.do({
      type: "adminEdit",
      playerId: "a",
      edit: { kind: "vehicle", vehicleType: "cart" },
    });
    expect(house(w).vehicles).toHaveLength(3);
    expect(error(buy(w))).toBe("fleet_full");
  });

  it("caps nothing in a world without the fleet's levels", () => {
    const w = new World(makeContext({ empire: { ...empire, fleet: null } }));
    w.do({ type: "empireJoin", playerId: "a" });
    w.do({ type: "empireBuildCasa", playerId: "a" });
    w.do({ type: "empireBuildDepot", playerId: "a", cell: "1,0" });
    w.advance(HOUR);
    for (let i = 0; i < 4; i++) expect(buy(w).ok).toBe(true);
    expect(empireView(w.ctx, w.state, "a", w.now)?.fleet).toBeNull();
  });
});
