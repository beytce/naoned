import { describe, expect, it } from "vitest";
import { type EmpireSettingsInput, cashAccount, empireHouseAt } from "../../src/index.js";
import { testEmpire } from "../fixture.js";
import { HOUR, World, makeContext } from "../helpers.js";

// Lombardy asks bread at 1 500; a burchio goes there in 6 hours (Lombardy's distance).
const empire: EmpireSettingsInput = {
  ...testEmpire,
  casa: testEmpire.casa.map((c) => ({ ...c, materials: {}, buildMinutes: 0, costDucats: 0 })),
  start: { capitalDucats: 10_000, workshops: [], vehicles: ["mule", "mule"] },
  counters: { maxLevel: 10, bookStepBps: 5_000, costTimes: 1 },
  regions: (testEmpire.regions ?? []).map((r) =>
    r.code === "lombardia"
      ? { ...r, produces: { flour: 500 }, demands: { bread: 1_500 }, localOrdersPerCounter: 30 }
      : r.code === "veneto"
        ? { ...r, localOrdersPerCounter: 80 }
        : r,
  ),
  markets: {
    depthBase: 100,
    depthPerHouse: 0,
    boardPerHouse: 0,
    smallShareBps: 0,
    smallCasa: 20,
    orderPremiumBps: 0,
    taxBps: 0,
  },
  vehicles: {
    mule: { casa: 1, capacity: 25, costDucats: 60, regions: ["veneto"], speedBps: 0 },
    burchio: {
      casa: 3,
      capacity: 90,
      costDucats: 400,
      regions: ["veneto", "lombardia"],
      speedBps: 0,
    },
  },
  localTripsPerDay: 1,
};

function world(casa = 4) {
  const w = new World(makeContext({ empire }));
  w.do({ type: "empireJoin", playerId: "a", favour: 50 });
  for (let i = 1; i < casa; i++) w.do({ type: "empireBuildCasa", playerId: "a" });
  return w;
}
const house = (w: World) => {
  const h = empireHouseAt(w.ctx, w.state, "a", w.now);
  if (!h) throw new Error("no house");
  return h;
};
const cash = (w: World) => w.state.accounts[cashAccount("a")] ?? 0n;
const stock = (w: World, good: string) => w.state.inventories.a?.[good]?.available ?? 0;
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "" : res.error);

describe("the vehicles", () => {
  it("start with two mules, and are bought at their Casa", () => {
    const w = world(2);
    expect(house(w).vehicles?.map((v) => v.type)).toEqual(["mule", "mule"]);
    expect(error(w.try({ type: "empireBuyVehicle", playerId: "a", vehicleType: "burchio" }))).toBe(
      "requirement_unmet",
    );
    w.do({ type: "empireBuildCasa", playerId: "a" });
    w.do({ type: "empireBuyVehicle", playerId: "a", vehicleType: "burchio" });
    expect(cash(w)).toBe(1_000_000n - 40_000n);
    expect(house(w).vehicles).toHaveLength(3);
  });

  it("carry the deliveries of a day: no more than the land vehicles hold", () => {
    const w = world();
    w.give("a", "bread", 100);
    // Two mules of 25, one trip a day: 50 units of the private book's 80.
    w.do({ type: "empireDeliver", playerId: "a", good: "bread", qty: 100 });
    expect(stock(w, "bread")).toBe(50);
    expect(error(w.try({ type: "empireDeliver", playerId: "a", good: "bread", qty: 10 }))).toBe(
      "no_liquidity",
    );
  });
});

describe("a voyage", () => {
  function sailing() {
    const w = world();
    w.do({ type: "empireBuyVehicle", playerId: "a", vehicleType: "burchio" });
    return { w, burchio: house(w).vehicles?.at(-1)?.id ?? "" };
  }

  it("goes only where its vehicle goes, from where the house is", () => {
    const { w, burchio } = sailing();
    const mule = house(w).vehicles?.[0]?.id ?? "";
    w.give("a", "bread", 10);
    const go = (vehicleId: string, from: string, to: string) =>
      error(
        w.try({ type: "empireVoyage", playerId: "a", vehicleId, from, to, good: "bread", qty: 10 }),
      );
    expect(go(mule, "veneto", "lombardia")).toBe("unknown_region");
    expect(go(burchio, "lombardia", "veneto")).toBe("unknown_region");
    expect(go(burchio, "veneto", "veneto")).toBe("unknown_region");
  });

  it("carries its own goods first, buys the rest at the port, and sells at its arrival", () => {
    const { w, burchio } = sailing();
    w.give("a", "bread", 30);
    const before = cash(w);
    w.do({
      type: "empireVoyage",
      playerId: "a",
      vehicleId: burchio,
      from: "veneto",
      to: "lombardia",
      good: "bread",
      qty: 90,
    });
    expect(stock(w, "bread")).toBe(0);
    // 60 loaves bought in Venice at its price (1 200 a loaf in the fixture, the price rising).
    expect(before - cash(w) >= 60n * 1_200n).toBe(true);
    expect(house(w).vehicles?.at(-1)?.busyUntil).toBe(w.now + 12 * HOUR);
    const paid = cash(w);
    w.advance(6 * HOUR);
    w.do({ type: "empireRelaunchAll", playerId: "a" });
    // Sold at Lombardy's Dogana, at 1 500 a loaf (lowered as it buys).
    expect(cash(w) > paid + 90n * 1_000n).toBe(true);
    expect(w.state.empire?.voyages ?? []).toHaveLength(0);
  });

  it("is refused a full hold or a busy vehicle", () => {
    const { w, burchio } = sailing();
    w.give("a", "bread", 200);
    const go = (qty: number) =>
      error(
        w.try({
          type: "empireVoyage",
          playerId: "a",
          vehicleId: burchio,
          from: "veneto",
          to: "lombardia",
          good: "bread",
          qty,
        }),
      );
    expect(go(91)).toBe("invalid_quantity");
    expect(go(90)).toBe("");
    expect(go(10)).toBe("building_busy");
  });
});
