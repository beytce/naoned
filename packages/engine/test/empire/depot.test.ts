import { describe, expect, it } from "vitest";
import {
  type EmpireSettingsInput,
  empireHouseAt,
  empireView,
  ensureMap,
  parseEmpireSettings,
  powerOfHouse,
} from "../../src/index.js";
import type { EmpireHouse } from "../../src/state.js";
import { testEmpire } from "../fixture.js";
import { HOUR, World, makeContext } from "../helpers.js";

// The Remise buys and raises the land vehicles, the Arsenal the ships (decision of the owner,
// 31 October 2026, evening): a model's level, 1 to 5, +10 % hold a level for every vehicle of it.
const empire: EmpireSettingsInput = {
  ...testEmpire,
  casa: testEmpire.casa.map((c) => ({ ...c, materials: {}, buildMinutes: 0, costDucats: 0 })),
  start: { capitalDucats: 100_000, workshops: [], vehicles: ["cart"] },
  map: { ...testEmpire.map, depot: { costDucats: 200, casa: 2, minutes: 60 } },
  vehicleLevels: { max: 5, stepBps: 1_000, costTimes: 1 },
  vehicles: {
    cart: { casa: 1, capacity: 30, costDucats: 100, regions: ["veneto"], speedBps: 0 },
    cocca: {
      casa: 1,
      capacity: 100,
      costDucats: 1_000,
      regions: ["veneto", "lombardia"],
      speedBps: 0,
      build: { minutes: 60, materials: {} },
    },
  },
};

function world(casa = 2) {
  const w = new World(makeContext({ empire }));
  w.do({ type: "empireJoin", playerId: "a" });
  for (let i = 1; i < casa; i++) w.do({ type: "empireBuildCasa", playerId: "a" });
  return w;
}
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "" : res.error);
const house = (w: World) => empireHouseAt(w.ctx, w.state, "a", w.now) as EmpireHouse;
const cash = (w: World) => w.state.accounts["cash:a"] ?? 0n;

function withDepot(casa = 2) {
  const w = world(casa);
  w.do({ type: "empireBuildDepot", playerId: "a", cell: "1,0" });
  w.advance(HOUR);
  return w;
}

describe("the Remise, where the land vehicles are bought and raised", () => {
  it("asks its Casa and a land cell the house sees, and stands an hour later", () => {
    expect(error(world(1).try({ type: "empireBuildDepot", playerId: "a", cell: "1,0" }))).toBe(
      "requirement_unmet",
    );
    const w = world();
    expect(error(w.try({ type: "empireBuildDepot", playerId: "a", cell: "2,0" }))).toBe(
      "unknown_cell",
    );
    expect(error(w.try({ type: "empireBuildDepot", playerId: "a", cell: "3,1" }))).toBe(
      "hidden_cell",
    );
    const before = cash(w);
    w.do({ type: "empireBuildDepot", playerId: "a", cell: "1,0" });
    expect(before - cash(w)).toBe(200n * 100n);
    expect(empireView(w.ctx, w.state, "a", w.now)?.map.sites).toEqual([
      expect.objectContaining({ kind: "depot", cell: "1,0" }),
    ]);
    w.advance(HOUR);
    expect(house(w).depot).toBe("1,0");
    expect(empireView(w.ctx, w.state, "a", w.now)?.map.depotSite).toBeNull();
    expect(error(w.try({ type: "empireBuildDepot", playerId: "a", cell: "0,1" }))).toBe("built");
  });

  it("is asked to buy a land vehicle; the vehicles of the start stay given", () => {
    const w = world();
    expect(house(w).vehicles?.map((v) => v.type)).toEqual(["cart"]);
    expect(error(w.try({ type: "empireBuyVehicle", playerId: "a", vehicleType: "cart" }))).toBe(
      "no_depot",
    );
    const d = withDepot();
    d.do({ type: "empireBuyVehicle", playerId: "a", vehicleType: "cart" });
    expect(house(d).vehicles).toHaveLength(2);
  });

  it("is given at Venice to a house of before that already bought a land vehicle", () => {
    const s = parseEmpireSettings(empire);
    const h = {
      casa: 3,
      workshops: [],
      builds: [],
      vehicles: [
        { id: "v1", type: "cart", busyUntil: 0 },
        { id: "v2", type: "cart", busyUntil: 0 },
      ],
    } as unknown as EmpireHouse;
    ensureMap(h, s);
    expect(h.depot).toBe("0,0");
    const fresh = { casa: 3, workshops: [], builds: [], vehicles: [h.vehicles?.[0]] };
    ensureMap(fresh as unknown as EmpireHouse, s);
    expect((fresh as unknown as EmpireHouse).depot).toBeUndefined();
  });
});

describe("a model's level", () => {
  it("asks the Remise for a land model, and costs its price doubled at each level", () => {
    const w = world();
    expect(error(w.try({ type: "empireUpgradeVehicle", playerId: "a", vehicleType: "cart" }))).toBe(
      "no_depot",
    );
    const d = withDepot();
    const spec = parseEmpireSettings(empire).vehicles.cart;
    const price = BigInt(spec?.costDucats ?? 0) * 100n;
    const before = cash(d);
    d.do({ type: "empireUpgradeVehicle", playerId: "a", vehicleType: "cart" });
    expect(before - cash(d)).toBe(price * 2n);
    expect(house(d).vehicleLevels).toEqual({ cart: 2 });
    const again = cash(d);
    d.do({ type: "empireUpgradeVehicle", playerId: "a", vehicleType: "cart" });
    expect(again - cash(d)).toBe(price * 4n);
  });

  it("raises the hold of every vehicle of the model by a tenth a level, up to the fifth", () => {
    const d = withDepot();
    const hold = () => empireView(d.ctx, d.state, "a", d.now)?.vehicles.mine[0]?.capacity ?? 0;
    const base = hold();
    for (let i = 0; i < 4; i++)
      d.do({ type: "empireUpgradeVehicle", playerId: "a", vehicleType: "cart" });
    expect(hold()).toBe(Math.floor((base * 14_000) / 10_000));
    const view = empireView(d.ctx, d.state, "a", d.now)?.vehicles.shop.find(
      (v) => v.type === "cart",
    );
    expect(view).toEqual(expect.objectContaining({ level: 5, upgrade: null }));
    expect(error(d.try({ type: "empireUpgradeVehicle", playerId: "a", vehicleType: "cart" }))).toBe(
      "max_level",
    );
  });

  it("asks the Arsenal for a ship's model", () => {
    const d = withDepot();
    expect(
      error(d.try({ type: "empireUpgradeVehicle", playerId: "a", vehicleType: "cocca" })),
    ).toBe("no_arsenal");
  });

  it("counts in the Power as a module's level, its first level free", () => {
    const d = withDepot();
    const s = parseEmpireSettings(empire);
    const before = powerOfHouse(house(d), s);
    d.do({ type: "empireUpgradeVehicle", playerId: "a", vehicleType: "cart" });
    expect(powerOfHouse(house(d), s) - before).toBe(s.power.moduleLevel);
  });
});
