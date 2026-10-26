import { describe, expect, it } from "vitest";
import {
  type Command,
  type WorldSettingsInput,
  applyBpsFloor,
  checkInvariants,
  deliveryOrdersFor,
  netWorth,
  orderUnitPrice,
} from "../src/index.js";
import { deliverySettings } from "./fixture.js";
import { HOUR, World, makeContext } from "./helpers.js";

/** E1-3 of the experts: a counter in a city, a personal order of it a day for each level. */
const fondaci = {
  maxCities: 3,
  maxLevels: 6,
  ordersPerLevel: 1,
  priceBps: 9_500,
  levels: [
    { ducats: 1_000, materials: { bricks: 10, planks: 10 } },
    { ducats: 2_500, materials: { bricks: 20, planks: 20 } },
    { ducats: 6_000, materials: { bricks: 40, planks: 40 } },
  ],
};

function world(more: Partial<WorldSettingsInput> = {}) {
  const w = new World(makeContext({ ...deliverySettings, fondaci, ...more }));
  w.at(9 * HOUR);
  w.do({ type: "join", playerId: "a", region: "terraferma" });
  w.give("a", "bricks", 500).give("a", "planks", 500).give("a", "bread", 200);
  return w;
}
const build = (w: World, city: string) =>
  w.try({ type: "buildFondaco", playerId: "a", city } as Command);
const error = (res: ReturnType<World["try"]>) => (res.ok ? "ok" : res.error);
const own = (w: World) =>
  deliveryOrdersFor(w.ctx, w.state, "a", 0).filter((o) => o.fondaco === true);

describe("the fondaci", () => {
  it("costs its ducats (destroyed) and materials, both written down, and counts at cost", () => {
    const w = world();
    const cash = w.cash("a");
    const before = netWorth(w.ctx, w.state, "a", w.now).buildings;
    const res = build(w, "padova");
    if (!res.ok) throw new Error(res.error);
    expect(w.cash("a")).toBe(cash - 1_000n);
    expect(w.stock("a", "bricks").available).toBe(490);
    expect(w.stock("a", "planks").available).toBe(490);
    expect(res.effects.ledger.some((l) => l.reason === "fondaco_build")).toBe(true);
    expect(
      res.effects.stock.filter((m) => m.reason === "fondaco_build").map((m) => m.quantity),
    ).toEqual([-10, -10]);
    expect(netWorth(w.ctx, w.state, "a", w.now).buildings).toBeGreaterThan(before);
    expect(w.state.fondaci?.a?.padova?.level).toBe(1);
    expect(checkInvariants(w.state, w.totals)).toEqual([]);
  });

  it("goes up to level 3 in a city, 6 levels in all, 3 cities at most", () => {
    const w = world();
    for (let i = 0; i < 3; i++) expect(error(build(w, "padova"))).toBe("ok");
    expect(error(build(w, "padova"))).toBe("fondaco_top_level");
    for (let i = 0; i < 3; i++) expect(error(build(w, "verona"))).toBe("ok");
    expect(error(build(w, "venezia"))).toBe("fondaci_full");
    expect(error(build(w, "milano"))).toBe("unknown_city");
    // Three cities at most, whatever the levels.
    const few = world({ fondaci: { ...fondaci, maxCities: 2 } });
    build(few, "padova");
    build(few, "verona");
    expect(error(build(few, "venezia"))).toBe("fondaci_full");
  });

  it("refuses without the ducats or the materials", () => {
    const w = world();
    w.give("a", "bricks", -495);
    expect(error(build(w, "padova"))).toBe("insufficient_stock");
  });

  it("gives a personal order a day per level, of goods the city buys, at 95 % of the board", () => {
    const w = world();
    build(w, "venezia");
    build(w, "venezia");
    build(w, "padova");
    const orders = own(w);
    expect(orders).toHaveLength(3);
    expect(orders.filter((o) => o.city === "venezia")).toHaveLength(2);
    for (const o of orders) {
      expect(o.kind).toBe("city");
      // Padova buys bread only: never bricks there.
      expect(Object.keys(w.ctx.settings.cities[o.city] ?? {})).toContain(o.resource);
      // The average of the quantity range.
      expect(o.quantity).toBe(o.resource === "bread" ? 15 : 7);
      const board = orderUnitPrice(w.ctx, "terraferma", o.city, o.resource, 0, {
        state: w.state,
        day: 0,
      });
      expect(o.unitPrice).toBe(applyBpsFloor(board, 9_500));
    }
    // The same on every request, and the next day's are new.
    expect(own(w)).toEqual(orders);
    expect(deliveryOrdersFor(w.ctx, w.state, "a", 1).filter((o) => o.fondaco)).toHaveLength(3);
  });

  it("is delivered once, like any order of the day", () => {
    const w = world();
    build(w, "padova");
    const [order] = own(w);
    if (!order) throw new Error("no order");
    const cart = Object.values(w.state.vehicles ?? {}).find((v) => v.playerId === "a");
    const send = () =>
      w.try({
        type: "dispatchDelivery",
        playerId: "a",
        orderId: order.id,
        vehicleId: cart?.id ?? "",
      });
    expect(error(send())).toBe("ok");
    w.advance(3 * HOUR);
    expect(error(send())).not.toBe("ok");
  });

  it("keeps its orders when the cities' demand is one board for the world", () => {
    const w = world({
      deliveries: { ...deliverySettings.deliveries, sharedOrdersPerActivePlayer: 2 },
    } as Partial<WorldSettingsInput>);
    build(w, "padova");
    w.do({ type: "tick" });
    expect(own(w)).toHaveLength(1);
  });

  it("is off without its settings", () => {
    const w = new World(makeContext(deliverySettings));
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    expect(error(build(w, "padova"))).toBe("fondaci_off");
  });
});
