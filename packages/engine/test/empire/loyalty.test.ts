import { describe, expect, it } from "vitest";
import {
  type EmpireSettingsInput,
  empireHouseAt,
  empireView,
  loyaltyBps,
  loyaltyTier,
  parseEmpireSettings,
} from "../../src/index.js";
import type { EmpireHouse } from "../../src/state.js";
import { HOUR, World, makeContext } from "../helpers.js";
import { ordersEmpire } from "./ordersFixture.js";

// The towns' loyalty (docs/plan-carte-vivante.md, lot 5; decision of the owner, 9 November 2026):
// a town knows the house the more it is served; from a number of deliveries, its orders pay a
// premium. The deliveries were counted already (the banners of 3, 10 and 25): they now count.
const loyalty = { at: [2, 4], premiumBps: [500, 1_000] };
const plain: EmpireSettingsInput = {
  ...ordersEmpire,
  moves: { ...ordersEmpire.moves, returnHome: true },
};
const empire: EmpireSettingsInput = {
  ...plain,
  orders: { ...(ordersEmpire.orders ?? {}), loyalty },
};
const s = parseEmpireSettings(empire);

function world(settings: EmpireSettingsInput = empire) {
  const w = new World(makeContext({ empire: settings }));
  w.do({ type: "empireJoin", playerId: "a" });
  return w;
}
const house = (w: World) => empireHouseAt(w.ctx, w.state, "a", w.now) as EmpireHouse;
const view = (w: World) => empireView(w.ctx, w.state, "a", w.now);
const town = (w: World, code: string) => view(w)?.orders.find((x) => x.city === code);
/** A delivery to a town: its orders loaded, brought, paid; the vehicle home again. */
function serve(w: World, code: string): void {
  const list = town(w, code)?.orders ?? [];
  if (list.length === 0) throw new Error(`no order at ${code}`);
  for (const o of list) w.give("a", o.good, o.qty);
  const res = w.try({ type: "empireDeliverCity", playerId: "a", city: code });
  if (!res.ok) throw new Error(`not delivered: ${res.error}`);
  w.advance(3 * HOUR);
  w.do({ type: "empireSettle", playerId: "a" });
}

describe("a town's loyalty", () => {
  it("rises by tiers with the deliveries it received", () => {
    expect([0, 1, 2, 3, 4, 50].map((n) => loyaltyTier(s, n))).toEqual([0, 0, 1, 1, 2, 2]);
    expect([0, 1, 2, 3, 4, 50].map((n) => loyaltyBps(s, n))).toEqual([0, 0, 500, 500, 1_000, 1_000]);
  });

  it("is nothing without its settings", () => {
    const none = parseEmpireSettings(plain);
    expect(loyaltyTier(none, 99)).toBe(0);
    expect(loyaltyBps(none, 99)).toBe(0);
  });

  it("asks as many premiums as tiers", () => {
    expect(() =>
      parseEmpireSettings({
        ...empire,
        orders: { ...(ordersEmpire.orders ?? {}), loyalty: { at: [2, 4], premiumBps: [500] } },
      }),
    ).toThrow();
  });
});

describe("the orders of a town that knows the house", () => {
  it("counts each delivery brought to the town", () => {
    const w = world();
    expect(house(w).served?.padova ?? 0).toBe(0);
    serve(w, "padova");
    expect(house(w).served?.padova).toBe(1);
    serve(w, "padova");
    expect(house(w).served?.padova).toBe(2);
  });

  it("pay its tier's premium, the same order a share dearer", () => {
    // The same house, the same deliveries, with and without the loyalty: the orders drawn are the
    // same (their good, their lot), only their pay differs once the town knows the house.
    const a = world();
    const b = world(plain);
    for (const w of [a, b]) {
      serve(w, "padova");
      serve(w, "padova");
      w.advance(6 * HOUR);
    }
    const withIt = town(a, "padova")?.orders ?? [];
    const without = town(b, "padova")?.orders ?? [];
    expect(withIt.length).toBeGreaterThan(0);
    expect(withIt.map((o) => [o.id, o.good, o.qty])).toEqual(
      without.map((o) => [o.id, o.good, o.qty]),
    );
    for (let i = 0; i < withIt.length; i++) {
      // 20 % of premium before (the fixture's), 25 % at the first tier.
      const base = (BigInt(without[i]?.pay ?? 0) * 10_000n) / 12_000n;
      expect(BigInt(withIt[i]?.pay ?? 0)).toBe((base * 12_500n) / 10_000n);
    }
  });

  it("keep the price shown: an order drawn before the tier is paid as drawn", () => {
    const w = world();
    w.advance(6 * HOUR);
    // Padua is full (two orders), drawn before any delivery: no premium on them.
    const before = town(w, "padova")?.orders ?? [];
    expect(before).toHaveLength(2);
    const b = world(plain);
    b.advance(6 * HOUR);
    expect(before.map((o) => o.pay)).toEqual((town(b, "padova")?.orders ?? []).map((o) => o.pay));
  });

  it("leave the other towns as they are", () => {
    const a = world();
    const b = world(plain);
    for (const w of [a, b]) {
      serve(w, "padova");
      serve(w, "padova");
      w.advance(6 * HOUR);
    }
    expect((town(a, "venezia")?.orders ?? []).map((o) => o.pay)).toEqual(
      (town(b, "venezia")?.orders ?? []).map((o) => o.pay),
    );
  });

  it("are told in the view: the town's tier, its deliveries, what the next asks", () => {
    const w = world();
    expect(town(w, "padova")?.loyalty).toEqual({
      tier: 0,
      served: 0,
      premiumBps: 0,
      next: { at: 2, premiumBps: 500 },
    });
    serve(w, "padova");
    serve(w, "padova");
    expect(town(w, "padova")?.loyalty).toEqual({
      tier: 1,
      served: 2,
      premiumBps: 500,
      next: { at: 4, premiumBps: 1_000 },
    });
    serve(w, "padova");
    serve(w, "padova");
    expect(town(w, "padova")?.loyalty).toEqual({
      tier: 2,
      served: 4,
      premiumBps: 1_000,
      next: null,
    });
    // Without the loyalty, nothing of it.
    expect(town(world(plain), "padova")?.loyalty).toBeUndefined();
  });
});
