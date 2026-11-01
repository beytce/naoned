import { describe, expect, it } from "vitest";
import { empireView, lotOf, ordersOf, parseEmpireSettings } from "../../src/index.js";
import type { EmpireHouse, WorldState } from "../../src/state.js";
import { HOUR, MIN as MINUTE, World, makeContext } from "../helpers.js";
import { ordersEmpire } from "./ordersFixture.js";

// The cities' orders (decision of the owner, 1 November 2026, after Hades' Star's shipments): a
// city a counter serves fills with orders, one every interval of its size up to a cap of its size;
// each a fixed lot of a good the house's workshops make. On the fixture: Venice (size 3, an order
// an hour, four at most) and Padua (size 1, one every two hours, two at most).
const empire = ordersEmpire;
const s = parseEmpireSettings(empire);

function world() {
  const w = new World(makeContext({ empire }));
  w.do({ type: "empireJoin", playerId: "a" });
  return w;
}
const view = (w: World) => empireView(w.ctx, w.state, "a", w.now);
const city = (w: World, code: string) => view(w)?.orders.find((x) => x.city === code);
const settle = (w: World) => w.do({ type: "empireSettle", playerId: "a" });

describe("the orders of a city", () => {
  it("are lots of the goods the house's workshops make, the first at once", () => {
    const w = world();
    const venice = city(w, "venezia");
    expect(venice?.size).toBe(3);
    expect(venice?.cap).toBe(4);
    expect(venice?.orders).toHaveLength(1);
    for (const o of view(w)?.orders.flatMap((c) => c.orders) ?? []) {
      expect(["bread", "wheat"]).toContain(o.good);
      // A lot of some forty ducats, paid its reference and 20 %.
      expect(o.qty).toBe(o.good === "wheat" ? 10 : 3);
      const ref = o.good === "wheat" ? 400n : 1_200n;
      expect(o.pay).toBe((ref * BigInt(o.qty) * 12_000n) / 10_000n);
    }
  });

  it("fill one an interval up to the cap, and no more however long the absence", () => {
    const w = world();
    w.advance(HOUR);
    expect(city(w, "venezia")?.orders).toHaveLength(2);
    expect(city(w, "padova")?.orders).toHaveLength(1);
    w.advance(48 * HOUR);
    expect(city(w, "venezia")?.orders).toHaveLength(4);
    expect(city(w, "venezia")?.fillBps).toBe(10_000);
    expect(city(w, "venezia")?.nextAt).toBeNull();
    expect(city(w, "padova")?.orders).toHaveLength(2);
  });

  it("stay as they were drawn once kept, whatever the house builds after", () => {
    const w = world();
    w.advance(3 * HOUR);
    settle(w);
    const before = city(w, "venezia")?.orders;
    const state = structuredClone(w.state) as WorldState;
    (state.empire?.houses.a as EmpireHouse).workshops = [];
    w.state = state;
    expect(city(w, "venezia")?.orders).toEqual(before);
    // No workshop: nothing new comes.
    w.advance(10 * HOUR);
    expect(city(w, "venezia")?.orders).toEqual(before);
  });

  it("ask nothing of a city no counter of the house serves", () => {
    const h = {
      casa: 1,
      workshops: [{ id: "w", type: "farm", recipe: "grow_wheat", level: 1, job: null }],
      builds: [],
      homeLevel: 1,
    } as unknown as EmpireHouse;
    const far = parseEmpireSettings({
      ...empire,
      map: { ...empire.map, reach: { base: 10, perLevel: 0 } },
    });
    expect(ordersOf(makeContext({ empire }), h, "a", far, 0).map((x) => x.city)).toEqual([
      "venezia",
    ]);
  });
});

describe("a lot", () => {
  it("is as set for its good, else what forty ducats buy at its reference", () => {
    expect(lotOf(s, "wheat", 400n)).toBe(10);
    expect(lotOf(s, "spices", 6_000n)).toBe(1);
    const set = parseEmpireSettings({
      ...empire,
      orders: { ...empire.orders, lots: { wheat: 7 } },
    });
    expect(lotOf(set, "wheat", 400n)).toBe(7);
  });
});

describe("a lot of a higher tier", () => {
  it("is worth more (a greater planet's shipments, at Hades' Star)", () => {
    const tiers = parseEmpireSettings({
      ...empire,
      orders: { ...empire.orders, tierTimes: { finished: 3 } },
    });
    expect(lotOf(tiers, "wheat", 400n, "raw")).toBe(10);
    // Bread is finished: three times forty ducats, at 12 ducats.
    expect(lotOf(tiers, "bread", 1_200n, "finished")).toBe(10);
  });
});

describe("a full city", () => {
  it("asks its next order an interval after a place is freed", () => {
    const w = world();
    w.advance(48 * HOUR);
    const o = city(w, "padova")?.orders[0];
    w.give("a", o?.good ?? "", o?.qty ?? 0);
    const vehicleId = view(w)?.vehicles.mine[0]?.id ?? "";
    w.do({
      type: "empireLoadOrder",
      playerId: "a",
      vehicleId,
      city: "padova",
      orderId: o?.id ?? "",
    });
    expect(city(w, "padova")?.orders).toHaveLength(1);
    expect(city(w, "padova")?.nextAt).toBe(w.now + 120 * MINUTE);
    w.advance(119 * MINUTE);
    expect(city(w, "padova")?.orders).toHaveLength(1);
    w.advance(MINUTE);
    expect(city(w, "padova")?.orders).toHaveLength(2);
  });
});
