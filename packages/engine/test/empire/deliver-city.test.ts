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

// « Livrer » from a city (decision of the owner, 3 November 2026, after the map's audit): one touch
// loads every order of the city the stock covers, the best paid first, on the smallest free vehicle
// that takes them all, which leaves at once and comes back alone to its fondaco once they are
// brought; a few seconds after it left, it may be called back.
const SECOND = 1_000;
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
  return w;
}
const house = (w: World) => empireHouseAt(w.ctx, w.state, "a", w.now) as EmpireHouse;
const view = (w: World) => empireView(w.ctx, w.state, "a", w.now);
const vehicle = (w: World, type: string) => house(w).vehicles?.find((v) => v.type === type);
const cash = (w: World) => w.state.accounts[cashAccount("a")] ?? 0n;
const stock = (w: World, good: string) => w.state.inventories.a?.[good]?.available ?? 0;
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "" : res.error);
const orders = (w: World, code: string) =>
  view(w)?.orders.find((x) => x.city === code)?.orders ?? [];
const deliver = (w: World, city: string, orderIds?: string[]) =>
  w.try({ type: "empireDeliverCity", playerId: "a", city, ...(orderIds ? { orderIds } : {}) });
const settle = (w: World) => w.do({ type: "empireSettle", playerId: "a" });

describe("« Livrer » from a city", () => {
  it("loads every order the stock covers on one vehicle, which leaves at once", () => {
    const w = world();
    const list = orders(w, "padova");
    expect(list.length).toBeGreaterThan(0);
    for (const o of list) w.give("a", o.good, o.qty);
    expect(error(deliver(w, "padova"))).toBe("");
    const v = vehicle(w, "cart");
    expect(v?.loads?.map((x) => x.id).sort()).toEqual(list.map((o) => o.id).sort());
    expect(v?.legs?.[0]?.departAt).toBe(w.now);
    expect(v?.legs?.[0]?.to).toBe("city:padova");
    expect(orders(w, "padova")).toHaveLength(0);
  });

  it("takes the smallest free vehicle that carries them all, the larger when it must", () => {
    const w = world();
    w.advance(48 * HOUR);
    const venice = orders(w, "venezia");
    expect(venice.length).toBeGreaterThan(3);
    // One order: the cart (three places) is enough.
    const [first] = venice;
    if (!first) throw new Error("no order");
    w.give("a", first.good, first.qty);
    expect(error(deliver(w, "venezia", [first.id]))).toBe("");
    expect(vehicle(w, "cart")?.loads).toHaveLength(1);
    expect(vehicle(w, "wagon")?.loads).toBeUndefined();
  });

  it("takes the larger vehicle for more orders than the smaller carries", () => {
    const w = world();
    w.advance(48 * HOUR);
    const venice = orders(w, "venezia");
    for (const o of venice) w.give("a", o.good, o.qty);
    expect(error(deliver(w, "venezia"))).toBe("");
    expect(vehicle(w, "wagon")?.loads?.length).toBe(Math.min(6, venice.length));
    expect(vehicle(w, "cart")?.loads).toBeUndefined();
  });

  it("takes the best paid first when the stock covers only some", () => {
    const w = world();
    w.advance(48 * HOUR);
    const venice = orders(w, "venezia");
    const wheat = venice.filter((o) => o.good === "wheat");
    const bread = venice.filter((o) => o.good === "bread");
    expect(wheat.length && bread.length).toBeTruthy();
    // Enough of each good for one lot only.
    w.give("a", "wheat", wheat[0]?.qty ?? 0);
    w.give("a", "bread", bread[0]?.qty ?? 0);
    expect(error(deliver(w, "venezia"))).toBe("");
    const loads = [...(vehicle(w, "cart")?.loads ?? []), ...(vehicle(w, "wagon")?.loads ?? [])];
    expect(loads.map((x) => x.good).sort()).toEqual(["bread", "wheat"]);
    expect(stock(w, "wheat")).toBe(0);
    expect(stock(w, "bread")).toBe(0);
  });

  it("says why it cannot: nothing in stock, or no vehicle free", () => {
    const w = world();
    w.advance(48 * HOUR);
    expect(error(deliver(w, "venezia"))).toBe("insufficient_stock");
    const venice = orders(w, "venezia");
    for (const o of venice) w.give("a", o.good, o.qty);
    expect(error(deliver(w, "venezia", [venice[0]?.id ?? ""]))).toBe("");
    expect(error(deliver(w, "venezia", [venice[1]?.id ?? ""]))).toBe("");
    // The two vehicles on their way: none free.
    expect(error(deliver(w, "venezia", [venice[2]?.id ?? ""]))).toBe("vehicle_busy");
  });
});

describe("the way back", () => {
  it("brings the orders, paid, then comes back alone to its fondaco", () => {
    const w = world();
    const list = orders(w, "padova");
    for (const o of list) w.give("a", o.good, o.qty);
    const before = cash(w);
    deliver(w, "padova");
    const out = vehicle(w, "cart")?.legs?.[0];
    w.advance((out?.arrivesAt ?? 0) - w.now);
    settle(w);
    expect(cash(w)).toBeGreaterThan(before);
    const back = vehicle(w, "cart")?.legs?.[0];
    expect(back?.from).toBe("city:padova");
    expect(back?.to).toBe("home");
    expect(back?.departAt).toBe(out?.arrivesAt);
    w.advance((back?.arrivesAt ?? 0) - w.now);
    settle(w);
    expect(vehicle(w, "cart")?.at).toBe("home");
    expect(vehicle(w, "cart")?.legs).toBeUndefined();
  });

  it("sends home a vehicle left standing at a city", () => {
    const w = world();
    // The state of before the ways back: the cart standing at Padua.
    const state = structuredClone(w.state);
    const v = state.empire?.houses.a?.vehicles?.find((x) => x.type === "cart");
    if (!v) throw new Error("no cart");
    v.at = "city:padova";
    w.state = state;
    settle(w);
    expect(vehicle(w, "cart")?.legs?.[0]?.to).toBe("home");
  });
});

describe("calling back", () => {
  it("takes the vehicle home a few seconds after it left, the orders back in their city", () => {
    const w = world();
    const list = orders(w, "padova");
    for (const o of list) w.give("a", o.good, o.qty);
    deliver(w, "padova");
    w.advance(3 * SECOND);
    const v = vehicle(w, "cart");
    expect(error(w.try({ type: "empireRecall", playerId: "a", vehicleId: v?.id ?? "" }))).toBe("");
    expect(vehicle(w, "cart")?.legs).toBeUndefined();
    expect(vehicle(w, "cart")?.loads).toBeUndefined();
    expect(vehicle(w, "cart")?.at).toBe("home");
    expect(
      orders(w, "padova")
        .map((o) => o.id)
        .sort(),
    ).toEqual(list.map((o) => o.id).sort());
    for (const o of list) expect(stock(w, o.good)).toBeGreaterThanOrEqual(o.qty);
  });

  it("is too late once the few seconds are past", () => {
    const w = world();
    const list = orders(w, "padova");
    for (const o of list) w.give("a", o.good, o.qty);
    deliver(w, "padova");
    w.advance(6 * SECOND);
    const v = vehicle(w, "cart");
    expect(error(w.try({ type: "empireRecall", playerId: "a", vehicleId: v?.id ?? "" }))).toBe(
      "building_busy",
    );
  });
});

describe("the deliveries made while away", () => {
  it("are kept, the last twelve, for the house's return (city, pay, time)", () => {
    const w = world();
    const list = orders(w, "padova");
    for (const o of list) w.give("a", o.good, o.qty);
    deliver(w, "padova");
    const out = vehicle(w, "cart")?.legs?.[0];
    w.advance((out?.arrivesAt ?? 0) - w.now + 1);
    settle(w);
    const done = view(w)?.delivered ?? [];
    expect(done).toHaveLength(1);
    expect(done[0]?.city).toBe("padova");
    expect(done[0]?.at).toBe(out?.arrivesAt);
    expect(BigInt(done[0]?.pay ?? "0")).toBeGreaterThan(0n);
    // Each town counts the deliveries it received, for good (P3-07: the towns react).
    expect(view(w)?.served).toEqual({ padova: 1 });
  });
});
