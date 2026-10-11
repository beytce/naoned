import { describe, expect, it } from "vitest";
import {
  type WorldSettingsInput,
  deliveryOrdersFor,
  hourIn,
  netWorth,
  orderUnitPrice,
  travelMinutes,
} from "../src/index.js";
import { deliverySettings } from "./fixture.js";
import { DAY, HOUR, World, makeContext } from "./helpers.js";

const ctx = (more: Partial<WorldSettingsInput> = {}) =>
  makeContext({ ...deliverySettings, ...more });

function world(more: Partial<WorldSettingsInput> = {}) {
  const w = new World(ctx(more));
  // 10 h in Paris: open hours.
  w.at(9 * HOUR);
  for (const id of ["a", "b"]) {
    w.do({ type: "join", playerId: id, region: "terraferma" });
    w.give(id, "bread", 200).give(id, "bricks", 100).give(id, "planks", 100);
  }
  return w;
}

const vehiclesOf = (w: World, playerId: string) =>
  Object.values(w.state.vehicles ?? {}).filter((v) => v.playerId === playerId);

describe("vehicles", () => {
  it("are given on joining and counted in net worth at cost", () => {
    const w = world();
    const [cart] = vehiclesOf(w, "a");
    expect(cart?.type).toBe("cart");
    // 100 ducats and 10 planks at 220.
    expect(cart?.investedValue).toBe(10_000n + 2_200n);
    expect(cart?.busyUntil).toBe(0);
    const worth = netWorth(w.ctx, w.state, "a", w.now);
    const buildings = Object.values(w.state.buildings)
      .filter((b) => b.playerId === "a")
      .reduce((n, b) => n + b.investedValue, 0n);
    expect(worth.buildings).toBe(buildings + 12_200n);
  });

  it("are bought with ducats and materials, which leave the game, up to the limit", () => {
    const w = world();
    const cash = w.cash("a");
    w.do({ type: "buyVehicle", playerId: "a", vehicleType: "cart" });
    expect(w.cash("a")).toBe(cash - 10_000n);
    expect(w.stock("a", "planks").available).toBe(90);
    expect(w.state.accounts["system:sink"]).toBe(10_000n);
    w.do({ type: "buyVehicle", playerId: "a", vehicleType: "mule" });
    expect(vehiclesOf(w, "a")).toHaveLength(3);
    const more = w.try({ type: "buyVehicle", playerId: "a", vehicleType: "mule" });
    expect(more.ok ? "ok" : more.error).toBe("max_vehicles");
    const unknown = w.try({ type: "buyVehicle", playerId: "b", vehicleType: "galley" });
    expect(unknown.ok ? "ok" : unknown.error).toBe("unknown_vehicle_type");
  });

  it("cost their upkeep every day", () => {
    const withVehicles = world();
    withVehicles.do({ type: "buyVehicle", playerId: "a", vehicleType: "mule" });
    const without = world({
      deliveries: { ...deliverySettings.deliveries, startingVehicles: [] } as never,
    });
    const before = [withVehicles.cash("a"), without.cash("a")];
    for (const w of [withVehicles, without]) {
      w.at(DAY + 9 * HOUR);
      w.do({ type: "tick" });
    }
    const paid = (w: World, i: number) => (before[i] ?? 0n) - w.cash("a");
    // Cart 2 ducats and mule 1 ducat a day.
    expect(paid(withVehicles, 0) - paid(without, 1)).toBe(300n);
  });
});

describe("the board of orders", () => {
  const families = {
    openDay: 0,
    ordersPerDay: 1,
    powerPremiumBps: 0,
    orderInfluence: 10,
    patronageUnit: 100,
    patronageMaxPerDay: 10,
    weeklyCapPerMember: 100,
    minMembers: 1,
    houses: [{ code: "contarini", quantities: { bricks: 10 } }],
  };

  it("is drawn the same way every time, with the Doge's, the family's and urgent orders first", () => {
    const w = world({ families });
    w.do({ type: "joinFamily", playerId: "a", family: "contarini" });
    const board = deliveryOrdersFor(w.ctx, w.state, "a", 0);
    expect(deliveryOrdersFor(w.ctx, w.state, "a", 0)).toEqual(board);
    expect(board.length).toBeGreaterThanOrEqual(10);
    expect(board.length).toBeLessThanOrEqual(12);
    expect(board.map((o) => o.kind).slice(0, 4)).toEqual(["doge", "doge", "family", "urgent"]);
    expect(board.slice(4).every((o) => o.kind === "city")).toBe(true);
    expect(board.map((o) => o.id)).toEqual(board.map((_, i) => `0:${i}`));
    // Another merchant, another day: another board.
    expect(deliveryOrdersFor(w.ctx, w.state, "b", 0)).not.toEqual(board);
    expect(deliveryOrdersFor(w.ctx, w.state, "a", 1)).not.toEqual(board);
  });

  it("only sends goods to cities that buy them, in the quantities set", () => {
    const w = world();
    for (let day = 0; day < 10; day++) {
      for (const o of deliveryOrdersFor(w.ctx, w.state, "a", day)) {
        if (o.kind === "doge") continue;
        expect(w.ctx.settings.cities[o.city]?.[o.resource]).toBeDefined();
        const [lo, hi] = w.ctx.settings.deliveries.quantity[o.resource] ?? [0, 0];
        expect(o.quantity).toBeGreaterThanOrEqual(lo);
        expect(o.quantity).toBeLessThanOrEqual(hi);
        if (o.kind === "city") {
          expect(o.opensAt).toBe(w.ctx.startAt + day * DAY);
          expect(o.expiresAt).toBe(w.ctx.startAt + (day + 1) * DAY);
        }
      }
    }
  });

  it("pays the Doge's and the family's premium, unchanged", () => {
    const w = world({ families });
    w.do({ type: "joinFamily", playerId: "a", family: "contarini" });
    const board = deliveryOrdersFor(w.ctx, w.state, "a", 0);
    for (const o of board.filter((x) => x.kind === "doge" || x.kind === "family")) {
      const ref = w.ctx.settings.referencePrices[o.resource] ?? 0n;
      expect(o.unitPrice).toBe((ref * 12_000n) / 10_000n);
    }
  });

  it("opens urgent orders for an hour, in the daytime in Paris, at a premium", () => {
    const w = world();
    for (let day = 0; day < 10; day++) {
      const urgent = deliveryOrdersFor(w.ctx, w.state, "a", day).filter((o) => o.kind === "urgent");
      expect(urgent).toHaveLength(1);
      for (const o of urgent) {
        const hour = hourIn(o.opensAt);
        expect(hour).toBeGreaterThanOrEqual(8);
        expect(hour).toBeLessThan(21);
        expect(o.expiresAt - o.opensAt).toBe(HOUR);
        const minutes = w.ctx.settings.deliveries.routes.terraferma?.[o.city] ?? 0;
        const ref = w.ctx.settings.referencePrices[o.resource] ?? 0n;
        const bps = 10_000 + 1_500 + Math.floor((1_000 * minutes) / 60);
        expect(o.unitPrice).toBe((ref * BigInt(bps)) / 10_000n);
      }
    }
  });

  it("pays more for a longer road, rounded down", () => {
    const c = ctx();
    // Bread at 180: Padua 30 min (+5 %), Verona 45 min (+7.5 %), Venice 60 min (+10 %).
    expect(orderUnitPrice(c, "terraferma", "padova", "bread")).toBe(189n);
    expect(orderUnitPrice(c, "terraferma", "verona", "bread")).toBe(193n);
    expect(orderUnitPrice(c, "terraferma", "venezia", "bread")).toBe(198n);
  });

  it("times the road by the vehicle's speed, two hours at most", () => {
    const c = ctx();
    expect(travelMinutes(c, "terraferma", "padova", "cart")).toBe(30);
    expect(travelMinutes(c, "terraferma", "padova", "mule")).toBe(60);
    expect(travelMinutes(c, "lagoon", "verona", "mule")).toBe(120);
    expect(travelMinutes(c, "lagoon", "nowhere", "cart")).toBeUndefined();
  });

  it("is empty when deliveries are off", () => {
    const w = new World(makeContext());
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    expect(deliveryOrdersFor(w.ctx, w.state, "a", 0)).toEqual([]);
  });
});
