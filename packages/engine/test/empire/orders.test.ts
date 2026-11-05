import { describe, expect, it } from "vitest";
import {
  distanceBonusBps,
  empireView,
  lotOf,
  ordersOf,
  parseEmpireSettings,
  weightedGoods,
} from "../../src/index.js";
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

  it("never wait beyond the cap, even a cap lowered since: the best paid stay", () => {
    const w = world();
    w.advance(48 * HOUR);
    settle(w);
    const before = city(w, "venezia")?.orders ?? [];
    expect(before).toHaveLength(4);
    // The cap of a town of size 3 lowered from four to two (a calibration, 5 November 2026).
    const lower = { ...empire, orders: { ...empire.orders, cap: [1, 2, 2, 5, 6] } };
    const l = new World(makeContext({ empire: lower }));
    l.state = w.state;
    l.now = w.now;
    l.totals = w.totals;
    const after = city(l, "venezia");
    expect(after?.cap).toBe(2);
    expect(after?.orders).toHaveLength(2);
    expect(after?.fillBps).toBe(10_000);
    const best = [...before]
      .sort((a, b) => (BigInt(b.pay) > BigInt(a.pay) ? 1 : BigInt(b.pay) < BigInt(a.pay) ? -1 : 0))
      .slice(0, 2)
      .map((o) => o.id)
      .sort();
    expect(after?.orders.map((o) => o.id).sort()).toEqual(best);
    // Kept so once settled, and nothing new while full.
    settle(l);
    l.advance(3 * HOUR);
    expect(city(l, "venezia")?.orders).toHaveLength(2);
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

// After the map's audit (decision of the owner, 3 November 2026): a first delivery possible in the
// first session (each city's first order smaller), orders drawn mostly among what the house makes
// now, and a premium for the long roads (CADRAGE-v3 § 3.4). Off unless set.
describe("a city's first order", () => {
  it("is a share of a lot when set, paid as much less", () => {
    const small = { ...empire, orders: { ...empire.orders, firstLotBps: 2_500 } };
    const w = new World(makeContext({ empire: small }));
    w.do({ type: "empireJoin", playerId: "a" });
    const first = view(w)?.orders.find((c) => c.city === "venezia")?.orders[0];
    const full = first?.good === "wheat" ? 10 : 3;
    expect(first?.qty).toBe(Math.max(1, Math.round(full / 4)));
    w.advance(HOUR);
    const second = view(w)?.orders.find((c) => c.city === "venezia")?.orders[1];
    expect(second?.qty).toBe(second?.good === "wheat" ? 10 : 3);
  });
});

describe("the goods drawn", () => {
  it("weigh what the house makes now so many times more", () => {
    expect(weightedGoods(["a", "b", "c"], new Set(["b"]), 3)).toEqual(["a", "b", "b", "b", "c"]);
    expect(weightedGoods(["a", "b"], new Set(), 3)).toEqual(["a", "b"]);
  });
});

describe("the premium of the long roads", () => {
  it("grows with the way from the fondaco, up to its cap", () => {
    const far = parseEmpireSettings({
      ...empire,
      orders: { ...empire.orders, distanceBps: 100, distanceMaxBps: 1_500 },
    });
    expect(distanceBonusBps(far, 0)).toBe(0);
    expect(distanceBonusBps(far, 42)).toBe(420);
    expect(distanceBonusBps(far, 1_000)).toBe(1_500);
    expect(distanceBonusBps(s, 42)).toBe(0);
  });

  it("pays a farther city's order more for the same good", () => {
    const far = {
      ...empire,
      orders: { ...empire.orders, distanceBps: 100, distanceMaxBps: 1_500 },
    };
    const w = new World(makeContext({ empire: far }));
    w.do({ type: "empireJoin", playerId: "a" });
    w.advance(48 * HOUR);
    const all = view(w)?.orders.flatMap((c) => c.orders) ?? [];
    const perUnit = (city: string, good: string) => {
      const o = all.find((x) => x.city === city && x.good === good);
      return o ? Number(o.pay) / o.qty : null;
    };
    for (const good of ["wheat", "bread"]) {
      const v = perUnit("venezia", good);
      const p = perUnit("padova", good);
      if (v !== null && p !== null) expect(p).toBeGreaterThan(v);
    }
  });
});
