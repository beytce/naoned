import { describe, expect, it } from "vitest";
import {
  type EmpireSettingsInput,
  armStats,
  armUpgradeCost,
  componentUpgradeCost,
  empireHouseAt,
  parseEmpireSettings,
  powerOfHouse,
} from "../../src/index.js";
import type { EmpireHouse } from "../../src/state.js";
import { testEmpire } from "../fixture.js";
import { HOUR, World, makeContext } from "../helpers.js";

// The arms of the Porta (docs/plan-porta.md §§ 4–5): combat vehicles bought and raised at the
// Remise, components bought one by one, fitted on their places, raised from 1 to 5.
const empire: EmpireSettingsInput = {
  ...testEmpire,
  casa: testEmpire.casa.map((c) => ({ ...c, materials: {}, buildMinutes: 0, costDucats: 0 })),
  start: { capitalDucats: 100_000, workshops: [], vehicles: [] },
  map: { ...testEmpire.map, depot: { costDucats: 200, casa: 2, minutes: 60 } },
};
const s = parseEmpireSettings(empire);

function world(casa = 2, depot = true) {
  const w = new World(makeContext({ empire }));
  w.do({ type: "empireJoin", playerId: "a" });
  for (let i = 1; i < casa; i++) w.do({ type: "empireBuildCasa", playerId: "a" });
  if (depot) {
    w.do({ type: "empireBuildDepot", playerId: "a", cell: "1,0" });
    w.advance(HOUR);
  }
  return w;
}
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "" : res.error);
const house = (w: World) => empireHouseAt(w.ctx, w.state, "a", w.now) as EmpireHouse;
const cash = (w: World) => w.state.accounts["cash:a"] ?? 0n;
const D = 100n;

describe("a combat vehicle", () => {
  it("is bought at the Remise, from its model's Casa, its price destroyed", () => {
    expect(
      error(world(2, false).try({ type: "empireBuyArm", playerId: "a", model: "rider" })),
    ).toBe("no_depot");
    const w = world();
    expect(error(w.try({ type: "empireBuyArm", playerId: "a", model: "ghost" }))).toBe(
      "unknown_vehicle_type",
    );
    expect(error(w.try({ type: "empireBuyArm", playerId: "a", model: "wagon" }))).toBe(
      "requirement_unmet",
    );
    const before = cash(w);
    w.do({ type: "empireBuyArm", playerId: "a", model: "rider" });
    expect(before - cash(w)).toBe(1_000n * D);
    expect(house(w).arms?.vehicles).toEqual([
      { id: expect.any(String), model: "rider", slots: [null] },
    ]);
    // A combat vehicle carries nothing: it is not one of the land vehicles of the deliveries.
    expect(house(w).vehicles ?? []).toHaveLength(0);
  });

  it("raises its model a level for every vehicle of it, the price doubled each level, up to 5", () => {
    const w = world();
    w.do({ type: "empireBuyArm", playerId: "a", model: "rider" });
    const h = house(w);
    expect(armUpgradeCost(h, "rider", s)).toBe(2_000n * D);
    const before = cash(w);
    w.do({ type: "empireUpgradeArm", playerId: "a", model: "rider" });
    expect(before - cash(w)).toBe(2_000n * D);
    expect(house(w).arms?.levels).toEqual({ rider: 2 });
    for (let i = 0; i < 3; i++) w.do({ type: "empireUpgradeArm", playerId: "a", model: "rider" });
    expect(armUpgradeCost(house(w), "rider", s)).toBeNull();
    expect(error(w.try({ type: "empireUpgradeArm", playerId: "a", model: "rider" }))).toBe(
      "max_level",
    );
  });
});

describe("a component", () => {
  it("is bought one by one at the Remise, from its Casa", () => {
    const w = world();
    expect(error(w.try({ type: "empireBuyComponent", playerId: "a", code: "culverin" }))).toBe(
      "requirement_unmet",
    );
    expect(error(w.try({ type: "empireBuyComponent", playerId: "a", code: "nope" }))).toBe(
      "unknown_arm",
    );
    const before = cash(w);
    w.do({ type: "empireBuyComponent", playerId: "a", code: "lances" });
    w.do({ type: "empireBuyComponent", playerId: "a", code: "lances" });
    expect(before - cash(w)).toBe(1_000n * D);
    expect(house(w).arms?.components.map((c) => [c.code, c.level])).toEqual([
      ["lances", 1],
      ["lances", 1],
    ]);
  });

  it("rises from 1 to 5, its price doubled each level", () => {
    const w = world();
    w.do({ type: "empireBuyComponent", playerId: "a", code: "lances" });
    const id = house(w).arms?.components[0]?.id ?? "";
    expect(componentUpgradeCost(house(w), id, s)).toBe(1_000n * D);
    for (let i = 0; i < 4; i++)
      w.do({ type: "empireUpgradeComponent", playerId: "a", componentId: id });
    expect(house(w).arms?.components[0]?.level).toBe(5);
    expect(error(w.try({ type: "empireUpgradeComponent", playerId: "a", componentId: id }))).toBe(
      "max_level",
    );
    expect(error(w.try({ type: "empireUpgradeComponent", playerId: "a", componentId: "x" }))).toBe(
      "unknown_arm",
    );
  });

  it("is fitted on a free place, moved from another vehicle, taken off", () => {
    const w = world(4);
    w.do({ type: "empireBuyArm", playerId: "a", model: "rider" });
    w.do({ type: "empireBuyArm", playerId: "a", model: "wagon" });
    w.do({ type: "empireBuyComponent", playerId: "a", code: "lances" });
    const [rider, wagon] = house(w).arms?.vehicles ?? [];
    const lances = house(w).arms?.components[0]?.id ?? "";
    const fit = (vehicleId: string, slot: number, componentId: string | null) =>
      w.try({ type: "empireFitArm", playerId: "a", vehicleId, slot, componentId });
    expect(error(fit(rider?.id ?? "", 1, lances))).toBe("no_room");
    expect(error(fit("nope", 0, lances))).toBe("unknown_vehicle");
    expect(error(fit(rider?.id ?? "", 0, "nope"))).toBe("unknown_arm");
    fit(rider?.id ?? "", 0, lances);
    expect(house(w).arms?.vehicles[0]?.slots).toEqual([lances]);
    // Fitted elsewhere, it leaves its first place.
    fit(wagon?.id ?? "", 1, lances);
    expect(house(w).arms?.vehicles.map((v) => v.slots)).toEqual([[null], [null, lances]]);
    fit(wagon?.id ?? "", 1, null);
    expect(house(w).arms?.vehicles[1]?.slots).toEqual([null, null]);
  });

  it("is neither fitted nor raised on a vehicle away from the Remise", () => {
    const w = world();
    w.do({ type: "empireBuyArm", playerId: "a", model: "rider" });
    w.do({ type: "empireBuyComponent", playerId: "a", code: "lances" });
    const h = house(w);
    const v = h.arms?.vehicles[0];
    const c = h.arms?.components[0]?.id ?? "";
    w.do({ type: "empireFitArm", playerId: "a", vehicleId: v?.id ?? "", slot: 0, componentId: c });
    // Lot 3 sends it to the Porta; here it is set away by hand, on a thawed copy of the state.
    w.state = structuredClone(w.state);
    const stored = w.state.empire?.houses.a?.arms?.vehicles[0];
    if (stored) stored.busy = "battle";
    expect(
      error(
        w.try({
          type: "empireFitArm",
          playerId: "a",
          vehicleId: v?.id ?? "",
          slot: 0,
          componentId: null,
        }),
      ),
    ).toBe("vehicle_busy");
    expect(error(w.try({ type: "empireUpgradeComponent", playerId: "a", componentId: c }))).toBe(
      "vehicle_busy",
    );
  });
});

describe("a combat vehicle's strength", () => {
  it("adds its model's level and its components", () => {
    const w = world();
    w.do({ type: "empireBuyArm", playerId: "a", model: "rider" });
    w.do({ type: "empireBuyComponent", playerId: "a", code: "lances" });
    const v = house(w).arms?.vehicles[0]?.id ?? "";
    const c = house(w).arms?.components[0]?.id ?? "";
    expect(armStats(house(w), v, s)).toMatchObject({ hp: 1_000, speedCenti: 600, weapons: [] });
    w.do({ type: "empireFitArm", playerId: "a", vehicleId: v, slot: 0, componentId: c });
    w.do({ type: "empireUpgradeComponent", playerId: "a", componentId: c });
    w.do({ type: "empireUpgradeArm", playerId: "a", model: "rider" });
    // Level 2 of the model: +10 % hp and damage; level 2 of the lances: +20 %.
    expect(armStats(house(w), v, s)).toMatchObject({
      hp: 1_100,
      weapons: [{ effect: "lances", power: 52, rangeCenti: 150 }],
    });
  });

  it("reads the cuirass as a damage cut and an active component's duration by its level", () => {
    const w = world();
    w.do({ type: "empireBuyArm", playerId: "a", model: "rider" });
    w.do({ type: "empireBuyComponent", playerId: "a", code: "smoke" });
    const v = house(w).arms?.vehicles[0]?.id ?? "";
    const c = house(w).arms?.components[0]?.id ?? "";
    w.do({ type: "empireFitArm", playerId: "a", vehicleId: v, slot: 0, componentId: c });
    w.do({ type: "empireUpgradeComponent", playerId: "a", componentId: c });
    expect(armStats(house(w), v, s).actives).toEqual([
      expect.objectContaining({ componentId: c, effect: "smoke", durationS: 10, cooldownS: 60 }),
    ]);
    expect(armStats(house(w), v, s).damageCutBps).toBe(0);
  });

  it("counts in the Power, as what is built", () => {
    const w = world();
    const before = powerOfHouse(house(w), s);
    w.do({ type: "empireBuyArm", playerId: "a", model: "rider" });
    w.do({ type: "empireBuyComponent", playerId: "a", code: "lances" });
    // A vehicle, and a component of level 1 as a module level.
    expect(powerOfHouse(house(w), s) - before).toBe(s.power.vehicle + s.power.moduleLevel);
  });
});
