import { describe, expect, it } from "vitest";
import {
  cashAccount,
  empireHouseAt,
  empireView,
  houseEffect,
  parseEmpireSettings,
} from "../../src/index.js";
import type { EmpireHouse, WorldState } from "../../src/state.js";
import { World, makeContext } from "../helpers.js";
import { ordersEmpire } from "./ordersFixture.js";

// The trade modules fitted on the vehicles (decision of the owner, 1 November 2026, after Hades'
// Star's ships): researched at the Scuola, a trade module counts only where it is fitted; a vehicle
// has a place a level of its model; a vehicle never fitted receives what the house researched.
const empire = {
  ...ordersEmpire,
  start: { capitalDucats: 1_000_000, workshops: [], vehicles: ["cart", "cart"] },
  vehicleLevels: { max: 5, stepBps: 1_000, costTimes: 1, minCostDucats: 0 },
  // A hold of ten places: the Agrandissement's tenth is a place.
  vehicles: {
    cart: { casa: 1, capacity: 30, places: 10, costDucats: 100, regions: ["veneto"], speedBps: 0 },
  },
  map: { ...ordersEmpire.map, depot: { costDucats: 200, casa: 1, minutes: 60 } },
};
const s = parseEmpireSettings(empire);

/** A house that researched modules (as its state would be kept), its vehicles never fitted. */
function world(modules: Record<string, number>, level = 1) {
  const w = new World(makeContext({ empire }));
  w.do({ type: "empireJoin", playerId: "a" });
  const state = structuredClone(w.state) as WorldState;
  const h = state.empire?.houses.a as EmpireHouse;
  h.modules = modules;
  h.vehicleLevels = { cart: level };
  for (const v of h.vehicles ?? []) v.fitted = undefined;
  w.state = state;
  w.do({ type: "empireRelaunchAll", playerId: "a" });
  return w;
}
const house = (w: World) => empireHouseAt(w.ctx, w.state, "a", w.now) as EmpireHouse;
const carts = (w: World) => house(w).vehicles ?? [];
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "" : res.error);
const fit = (w: World, vehicleId: string, slot: number, module: string | null) =>
  w.try({ type: "empireFitVehicle", playerId: "a", vehicleId, slot, module });

describe("a vehicle's places", () => {
  it("are one a level of its model, and receive once what the house researched", () => {
    const w = world({ hold: 2, convoy: 1, tools: 3 }, 2);
    // Two places at the level 2: the trade modules, the highest first; never a workshop's.
    for (const v of carts(w)) expect(v.fitted).toEqual(["hold", "convoy"]);
    expect(empireView(w.ctx, w.state, "a", w.now)?.vehicles.mine[0]?.slots).toBe(2);
  });

  it("fit a researched trade module once, nowhere beyond the places", () => {
    const w = world({ hold: 1, convoy: 1 });
    const id = carts(w)[0]?.id ?? "";
    expect(error(fit(w, id, 1, "convoy"))).toBe("no_room");
    expect(error(fit(w, id, 0, "tools"))).toBe("unknown_building_type");
    expect(error(fit(w, id, 0, "ledger"))).toBe("unknown_building_type");
    expect(error(fit(w, id, 0, "convoy"))).toBe("");
    expect(carts(w)[0]?.fitted).toEqual(["convoy"]);
    expect(error(fit(w, id, 0, null))).toBe("");
    expect(carts(w)[0]?.fitted).toEqual([""]);
  });
});

describe("a trade module", () => {
  it("counts only on the vehicle it is fitted on", () => {
    const w = world({ hold: 1, convoy: 1 });
    const [a, b] = carts(w);
    // Both received the convoy (the highest first, by name at a tie); the first gets the hold.
    expect(b?.fitted).toEqual(["convoy"]);
    fit(w, a?.id ?? "", 0, "hold");
    const h = house(w);
    expect(houseEffect(h, "capacity", s, { vehicleId: a?.id })).toBe(1_000);
    expect(houseEffect(h, "capacity", s, { vehicleId: b?.id })).toBe(0);
    expect(houseEffect(h, "capacity", s)).toBe(0);
    expect(houseEffect(h, "orderBonus", s, { vehicleId: b?.id })).toBe(500);
  });

  it("raises a vehicle's hold as the view shows it", () => {
    const w = world({ hold: 1 });
    const mine = empireView(w.ctx, w.state, "a", w.now)?.vehicles.mine ?? [];
    expect(mine[0]?.capacity).toBe(11);
  });
});
