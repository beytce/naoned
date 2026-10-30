import { describe, expect, it } from "vitest";
import { type EmpireSettingsInput, cashAccount, empireHouseAt } from "../../src/index.js";
import { testEmpire } from "../fixture.js";
import { HOUR, MIN, World, makeContext } from "../helpers.js";

// A cocca of the Arsenal (an hour's site, 5 planks, 1 000 ducats, one place of modules) and a
// burchio bought; the hold gives 10 % of capacity at its first level.
const empire: EmpireSettingsInput = {
  ...testEmpire,
  casa: testEmpire.casa.map((c) => ({ ...c, materials: {}, buildMinutes: 0, costDucats: 0 })),
  start: { capitalDucats: 100_000, workshops: [], vehicles: [] },
  research: { ...testEmpire.research, available: ["hold", "sails"] },
  regions: (testEmpire.regions ?? []).map((r) =>
    r.code === "lombardia" ? { ...r, casa: 1, demands: { ...r.demands, wheat: 400 } } : r,
  ),
  vehicles: {
    burchio: {
      casa: 1,
      capacity: 100,
      costDucats: 0,
      regions: ["veneto", "lombardia"],
      speedBps: 0,
    },
    cocca: {
      casa: 1,
      capacity: 100,
      costDucats: 1_000,
      regions: ["veneto", "lombardia"],
      speedBps: 0,
      build: { minutes: 60, materials: { planks: 5 } },
      slots: 1,
    },
  },
};

function world() {
  const w = new World(makeContext({ empire }));
  w.do({ type: "empireJoin", playerId: "a" });
  for (let i = 1; i < 3; i++) w.do({ type: "empireBuildCasa", playerId: "a" });
  w.give("a", "planks", 10);
  w.give("a", "wheat", 300);
  return w;
}
const house = (w: World) => {
  const h = empireHouseAt(w.ctx, w.state, "a", w.now);
  if (!h) throw new Error("no house");
  return h;
};
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "" : res.error);
const cash = (w: World) => w.state.accounts[cashAccount("a")] ?? 0n;
const ship = (w: World) => house(w).vehicles?.find((v) => v.type === "cocca")?.id ?? "";
const sail = (w: World, vehicleId: string, qty: number) =>
  w.try({
    type: "empireVoyage",
    playerId: "a",
    vehicleId,
    from: "veneto",
    to: "lombardia",
    good: "wheat",
    qty,
  });

describe("the private Arsenal", () => {
  it("builds a ship on a site, never sells one", () => {
    const w = world();
    expect(error(w.try({ type: "empireBuyVehicle", playerId: "a", vehicleType: "cocca" }))).toBe(
      "unknown_building_type",
    );
    const before = cash(w);
    expect(error(w.try({ type: "empireBuildShip", playerId: "a", vehicleType: "cocca" }))).toBe("");
    expect(before - cash(w)).toBe(100_000n);
    expect(w.state.inventories.a?.planks?.available).toBe(5);
    expect(house(w).vehicles ?? []).toHaveLength(0);
    w.advance(HOUR);
    expect(house(w).vehicles?.map((v) => v.type)).toEqual(["cocca"]);
    expect(error(w.try({ type: "empireBuildShip", playerId: "a", vehicleType: "burchio" }))).toBe(
      "unknown_building_type",
    );
  });

  it("fits a researched trade module on a ship's place: it counts there only", () => {
    const w = world();
    w.do({ type: "empireBuildShip", playerId: "a", vehicleType: "cocca" });
    w.advance(HOUR);
    w.do({ type: "empireBuyVehicle", playerId: "a", vehicleType: "burchio" });
    const fit = (slot: number, module: string) =>
      w.try({ type: "empireFitShip", playerId: "a", vehicleId: ship(w), slot, module });
    expect(error(fit(0, "hold"))).toBe("unknown_building_type");
    w.do({ type: "empireResearch", playerId: "a", module: "hold" });
    w.advance(30 * MIN);
    // The hold researched: the burchio, without places, has it at once; the ship not yet.
    const burchio = house(w).vehicles?.find((v) => v.type === "burchio")?.id ?? "";
    expect(error(sail(w, ship(w), 110))).toBe("invalid_quantity");
    expect(error(fit(1, "hold"))).toBe("no_room");
    expect(error(fit(0, "hold"))).toBe("");
    expect(house(w).vehicles?.find((v) => v.type === "cocca")?.fitted).toEqual(["hold"]);
    expect(error(sail(w, ship(w), 110))).toBe("");
    expect(error(sail(w, burchio, 110))).toBe("");
  });
});
