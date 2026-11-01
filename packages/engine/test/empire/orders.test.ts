import { describe, expect, it } from "vitest";
import {
  type EmpireSettingsInput,
  cashAccount,
  empireHouseAt,
  empireView,
  ordersOf,
  parseEmpireSettings,
} from "../../src/index.js";
import type { EmpireHouse } from "../../src/state.js";
import { testEmpire } from "../fixture.js";
import { HOUR, World, makeContext } from "../helpers.js";

const MINUTE = HOUR / 60;

// The cities' orders (decision of the owner, 1 November 2026, after Hades' Star's shipments):
// each city a counter serves gives one order to five by its size, renewed every two hours, paid
// unit by unit as a vehicle's round brings them. On the fixture: Venice (size 3) at (0, 0), Padua
// (size 1) at (≈ 21, 36), both within the reach of Venice's counter (50).
const empire: EmpireSettingsInput = {
  ...testEmpire,
  casa: testEmpire.casa.map((c) => ({ ...c, materials: {}, buildMinutes: 0, costDucats: 0 })),
  start: { capitalDucats: 10_000, workshops: [], vehicles: ["cart"] },
  map: {
    ...testEmpire.map,
    cities: (testEmpire.map?.cities ?? []).map((c) =>
      c.code === "venezia" ? { ...c, size: 3 } : c,
    ),
    reach: { base: 50, perLevel: 10 },
  },
  vehicles: { cart: { casa: 1, capacity: 30, costDucats: 100, regions: ["veneto"], speedBps: 0 } },
  orders: {
    periodMinutes: 120,
    perSize: [1, 2, 3, 4, 5],
    qtyPerSize: 4,
    premiumBps: 2_000,
    sizeBps: 500,
    distanceBps: 1_000,
    unitsPerMinute: 20,
  },
};
const s = parseEmpireSettings(empire);

function world() {
  const w = new World(makeContext({ empire }));
  w.do({ type: "empireJoin", playerId: "a" });
  return w;
}
const house = (w: World) => empireHouseAt(w.ctx, w.state, "a", w.now) as EmpireHouse;
const view = (w: World) => empireView(w.ctx, w.state, "a", w.now);
const city = (w: World, code: string) => view(w)?.orders.find((x) => x.city === code);
const cash = (w: World) => w.state.accounts[cashAccount("a")] ?? 0n;
const cart = (w: World) => house(w).vehicles?.[0]?.id ?? "";
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "" : res.error);
const stock = (w: World, good: string) => w.state.inventories.a?.[good]?.available ?? 0;

describe("the orders of a city", () => {
  it("are as many as its size, of the goods its region asks, the same through the period", () => {
    const w = world();
    const venice = city(w, "venezia");
    expect(venice?.size).toBe(3);
    expect(venice?.orders).toHaveLength(3);
    expect(city(w, "padova")?.orders).toHaveLength(1);
    const asked = Object.keys(s.regions.find((r) => r.code === "veneto")?.demands ?? {});
    for (const o of venice?.orders ?? []) {
      expect(asked).toContain(o.good);
      expect(o.qty).toBeGreaterThan(0);
      expect(o.filled).toBe(0);
    }
    w.advance(HOUR);
    expect(city(w, "venezia")?.orders).toEqual(venice?.orders);
    expect(city(w, "venezia")?.renewsAt).toBe(venice?.renewsAt);
  });

  it("asks nothing of a city no counter of the house serves", () => {
    const h = { casa: 1, workshops: [], builds: [], homeLevel: 1 } as unknown as EmpireHouse;
    const far = parseEmpireSettings({
      ...empire,
      map: { ...empire.map, reach: { base: 10, perLevel: 0 } },
    });
    expect(ordersOf(makeContext({ empire }), h, "a", far, 0).map((x) => x.city)).toEqual([
      "venezia",
    ]);
  });
});

describe("a vehicle's round", () => {
  it("carries the counter's goods to the cities, paid at each arrival, then comes home", () => {
    const w = world();
    const order = city(w, "padova")?.orders[0];
    if (!order) throw new Error("no order");
    w.give("a", order.good, order.qty + 5);
    const before = cash(w);
    expect(
      error(
        w.try({
          type: "empireTour",
          playerId: "a",
          vehicleId: cart(w),
          stops: [{ city: "padova", order: 0, qty: order.qty }],
        }),
      ),
    ).toBe("");
    // Loaded: out of Venice's stock, on the road (about two minutes there, two back).
    expect(stock(w, order.good)).toBe(5);
    expect(view(w)?.tours).toHaveLength(1);
    w.advance(3 * MINUTE);
    w.do({ type: "empireRelaunchAll", playerId: "a" });
    expect(city(w, "padova")?.orders[0]?.filled).toBe(order.qty);
    expect(city(w, "padova")?.fillBps).toBe(10_000);
    expect(cash(w) > before).toBe(true);
    // Back home after the way back.
    w.advance(2 * MINUTE);
    w.do({ type: "empireRelaunchAll", playerId: "a" });
    expect(view(w)?.tours).toHaveLength(0);
    expect(house(w).vehicles?.[0]?.busyUntil ?? 0).toBeLessThanOrEqual(w.now);
  });

  it("pays a part of an order for a part, and holds no more than the vehicle carries", () => {
    const w = world();
    const order = city(w, "venezia")?.orders[0];
    if (!order) throw new Error("no order");
    w.give("a", order.good, 100);
    expect(
      error(
        w.try({
          type: "empireTour",
          playerId: "a",
          vehicleId: cart(w),
          stops: [{ city: "venezia", order: 0, qty: 31 }],
        }),
      ),
    ).toBe("invalid_quantity");
    w.do({
      type: "empireTour",
      playerId: "a",
      vehicleId: cart(w),
      stops: [{ city: "venezia", order: 0, qty: 1 }],
    });
    w.advance(MINUTE);
    w.do({ type: "empireRelaunchAll", playerId: "a" });
    expect(city(w, "venezia")?.orders[0]?.filled).toBe(1);
    const part = city(w, "venezia")?.fillBps ?? 0;
    expect(part > 0 && part < 10_000).toBe(true);
  });

  it("refuses a city out of the counter's reach, and a vehicle on the road", () => {
    const w = world();
    expect(
      error(
        w.try({
          type: "empireTour",
          playerId: "a",
          vehicleId: cart(w),
          stops: [{ city: "milano", order: 0, qty: 1 }],
        }),
      ),
    ).toBe("out_of_reach");
  });

  it("renews the orders at the next period: what was not brought is no longer asked", () => {
    const w = world();
    const order = city(w, "venezia")?.orders[0];
    if (!order) throw new Error("no order");
    w.give("a", order.good, 100);
    w.do({
      type: "empireTour",
      playerId: "a",
      vehicleId: cart(w),
      stops: [{ city: "venezia", order: 0, qty: 1 }],
    });
    w.advance(MINUTE);
    w.do({ type: "empireRelaunchAll", playerId: "a" });
    const renews = city(w, "venezia")?.renewsAt ?? 0;
    w.advance(renews - w.now + 1);
    expect(city(w, "venezia")?.orders.every((o) => o.filled === 0)).toBe(true);
    expect(city(w, "venezia")?.renewsAt).toBe(renews + 2 * HOUR);
  });
});
