import { describe, expect, it } from "vitest";
import {
  type EmpireSettingsInput,
  cashAccount,
  empireHouseAt,
  empireView,
} from "../../src/index.js";
import type { EmpireHouse } from "../../src/state.js";
import { HOUR, World, makeContext } from "../helpers.js";
import { ordersEmpire } from "./ordersFixture.js";

// The round drawn by finger (the gameplay audit, 5 November 2026, P1): the player picks a vehicle
// at its fondaco and the towns it serves, in order, each with its orders; the vehicle loads them
// all there, goes from town to town, and comes back alone. One command: all of it, or nothing.
const empire: EmpireSettingsInput = {
  ...ordersEmpire,
  start: {
    capitalDucats: 10_000,
    workshops: ordersEmpire.start?.workshops ?? [],
    vehicles: ["cart", "wagon"],
  },
  vehicles: {
    ...ordersEmpire.vehicles,
    wagon: { casa: 1, capacity: 60, places: 6, costDucats: 300, regions: ["veneto"], speedBps: 0 },
  },
  moves: { ...ordersEmpire.moves, returnHome: true, recallSeconds: 5 },
};

function world() {
  const w = new World(makeContext({ empire }));
  w.do({ type: "empireJoin", playerId: "a" });
  w.advance(4 * HOUR);
  return w;
}
const house = (w: World) => empireHouseAt(w.ctx, w.state, "a", w.now) as EmpireHouse;
const view = (w: World) => empireView(w.ctx, w.state, "a", w.now);
const vehicle = (w: World, type: string) => house(w).vehicles?.find((v) => v.type === type);
const cash = (w: World) => w.state.accounts[cashAccount("a")] ?? 0n;
const orders = (w: World, code: string) =>
  view(w)?.orders.find((x) => x.city === code)?.orders ?? [];
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "" : res.error);
const settle = (w: World) => w.do({ type: "empireSettle", playerId: "a" });
const stocked = (w: World, code: string) => {
  const list = orders(w, code);
  for (const o of list) w.give("a", o.good, o.qty);
  return list.map((o) => o.id);
};
const round = (w: World, vehicleId: string, stops: { city: string; orderIds: string[] }[]) =>
  w.try({ type: "empireRound", playerId: "a", vehicleId, stops });

describe("a round drawn by finger", () => {
  it("loads each town's orders, goes from town to town in that order, and leaves at once", () => {
    const w = world();
    const wagon = vehicle(w, "wagon");
    const padua = stocked(w, "padova");
    const venice = stocked(w, "venezia");
    expect(padua.length).toBeGreaterThan(0);
    expect(venice.length).toBeGreaterThan(0);
    expect(
      error(
        round(w, wagon?.id ?? "", [
          { city: "padova", orderIds: padua },
          { city: "venezia", orderIds: venice },
        ]),
      ),
    ).toBe("");
    const v = vehicle(w, "wagon");
    expect(v?.loads?.map((o) => o.id).sort()).toEqual([...padua, ...venice].sort());
    expect(v?.legs?.map((l) => l.to)).toEqual(["city:padova", "city:venezia"]);
    expect(v?.legs?.[0]?.departAt).toBe(w.now);
    expect(orders(w, "padova")).toHaveLength(0);
    expect(orders(w, "venezia")).toHaveLength(0);
  });

  it("pays each town on its arrival, then comes back alone", () => {
    const w = world();
    const wagon = vehicle(w, "wagon")?.id ?? "";
    const padua = stocked(w, "padova");
    const venice = stocked(w, "venezia");
    round(w, wagon, [
      { city: "padova", orderIds: padua },
      { city: "venezia", orderIds: venice },
    ]);
    const before = cash(w);
    const first = vehicle(w, "wagon")?.legs?.[0];
    w.advance((first?.arrivesAt ?? 0) - w.now);
    settle(w);
    const paid = cash(w);
    expect(paid).toBeGreaterThan(before);
    const second = vehicle(w, "wagon")?.legs?.[0];
    expect(second?.to).toBe("city:venezia");
    w.advance((second?.arrivesAt ?? 0) - w.now);
    settle(w);
    expect(cash(w)).toBeGreaterThan(paid);
    const back = vehicle(w, "wagon")?.legs?.[0];
    expect(back?.to).toBe("home");
    w.advance((back?.arrivesAt ?? 0) - w.now);
    settle(w);
    expect(vehicle(w, "wagon")?.at).toBe("home");
  });

  it("refuses all of it when one stop cannot be: more than its hold, an order not in stock", () => {
    const w = world();
    const cart = vehicle(w, "cart");
    const padua = stocked(w, "padova");
    const venice = orders(w, "venezia").map((o) => o.id);
    const before = structuredClone(house(w));
    // The cart's hold is smaller than every order of both towns.
    const all = [
      { city: "padova", orderIds: padua },
      { city: "venezia", orderIds: venice },
    ];
    expect(error(round(w, cart?.id ?? "", all))).not.toBe("");
    // Venice's orders not in stock, on the wagon.
    expect(error(round(w, vehicle(w, "wagon")?.id ?? "", all))).toBe("insufficient_stock");
    expect(house(w).vehicles).toEqual(before.vehicles);
    expect(orders(w, "padova").map((o) => o.id)).toEqual(padua);
  });

  it("refuses a round without a stop, or a vehicle already on its way", () => {
    const w = world();
    const wagon = vehicle(w, "wagon")?.id ?? "";
    expect(error(round(w, wagon, []))).toBe("invalid_quantity");
    const padua = stocked(w, "padova");
    round(w, wagon, [{ city: "padova", orderIds: padua }]);
    const venice = stocked(w, "venezia");
    expect(error(round(w, wagon, [{ city: "venezia", orderIds: venice }]))).not.toBe("");
  });
});
