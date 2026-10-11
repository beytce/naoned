import { describe, expect, it } from "vitest";
import {
  type Command,
  type DeliveryOrder,
  type WorldSettingsInput,
  deliveryOrdersFor,
  hourIn,
  netWorth,
  orderUnitPrice,
  travelMinutes,
} from "../src/index.js";
import { deliverySettings } from "./fixture.js";
import { DAY, HOUR, MIN, World, makeContext } from "./helpers.js";

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

const board = (w: World, playerId = "a") =>
  deliveryOrdersFor(w.ctx, w.state, playerId, Math.floor((w.now - w.ctx.startAt) / DAY));

const pick = (w: World, kind: DeliveryOrder["kind"] = "city", playerId = "a") => {
  const o = board(w, playerId).find((x) => x.kind === kind && x.quantity <= 40);
  if (!o) throw new Error(`no ${kind} order`);
  return o;
};

const cartOf = (w: World, playerId = "a") => vehiclesOf(w, playerId)[0]?.id ?? "";

const dispatch = (w: World, orderId: string, escort = "none", playerId = "a", vehicleId?: string) =>
  w.try({
    type: "dispatchDelivery",
    playerId,
    orderId,
    vehicleId: vehicleId ?? cartOf(w, playerId),
    escort,
  } as Command);

const error = (res: ReturnType<World["try"]>) => (res.ok ? "ok" : res.error);

const deliveriesOf = (w: World, playerId = "a") =>
  Object.values(w.state.deliveries ?? {}).filter((d) => d.playerId === playerId);

describe("dispatching a delivery", () => {
  it("loads the goods, keeps the vehicle busy there and back, and pays on arrival", () => {
    const w = world();
    const o = pick(w);
    const before = { cash: w.cash("a"), stock: w.stock("a", o.resource).available };
    w.do({
      type: "dispatchDelivery",
      playerId: "a",
      orderId: o.id,
      vehicleId: cartOf(w),
      escort: "none",
    });
    expect(w.stock("a", o.resource).available).toBe(before.stock - o.quantity);
    expect(w.cash("a")).toBe(before.cash);
    const [d] = deliveriesOf(w);
    const minutes = travelMinutes(w.ctx, "terraferma", o.city, "cart") ?? 0;
    expect(d?.arriveAt).toBe(w.now + minutes * MIN);
    expect(d?.backAt).toBe(w.now + 2 * minutes * MIN);
    expect(vehiclesOf(w, "a")[0]?.busyUntil).toBe(d?.backAt);

    // The vehicle is busy: no second delivery.
    const other = board(w).find((x) => x.id !== o.id && x.kind === "city") as DeliveryOrder;
    expect(error(dispatch(w, other.id))).toBe("vehicle_busy");

    w.at((d?.arriveAt ?? 0) - w.ctx.startAt - MIN).do({ type: "tick" });
    expect(w.cash("a")).toBe(before.cash);
    w.at((d?.arriveAt ?? 0) - w.ctx.startAt).do({ type: "tick" });
    expect(w.cash("a")).toBe(before.cash + o.unitPrice * BigInt(o.quantity));
    expect(deliveriesOf(w)[0]?.outcome).toBe("delivered");
    expect(error(dispatch(w, other.id))).toBe("vehicle_busy");
    w.at((d?.backAt ?? 0) - w.ctx.startAt);
    expect(error(dispatch(w, other.id))).toBe("ok");
  });

  it("refuses an order already dispatched, expired or not open yet", () => {
    const w = world();
    w.do({ type: "buyVehicle", playerId: "a", vehicleType: "cart" });
    const [first, second] = vehiclesOf(w, "a");
    const o = pick(w);
    expect(error(dispatch(w, o.id, "none", "a", first?.id))).toBe("ok");
    expect(error(dispatch(w, o.id, "none", "a", second?.id))).toBe("order_done");
    expect(error(dispatch(w, "0:99", "none", "a", second?.id))).toBe("unknown_delivery_order");

    const urgent = pick(w, "urgent");
    w.at(urgent.opensAt - w.ctx.startAt - MIN);
    expect(error(dispatch(w, urgent.id, "none", "a", second?.id))).toBe("order_not_open");
    w.at(urgent.expiresAt - w.ctx.startAt);
    expect(error(dispatch(w, urgent.id, "none", "a", second?.id))).toBe("order_expired");

    // Yesterday's orders are gone.
    const late = board(w).find((x) => x.kind === "city" && x.id !== o.id) as DeliveryOrder;
    w.at(DAY + 9 * HOUR);
    expect(error(dispatch(w, late.id, "none", "a", second?.id))).toBe("order_expired");
  });

  it("refuses a load over capacity, short stock, someone else's vehicle or an unknown escort", () => {
    const w = world({
      deliveries: { ...deliverySettings.deliveries, startingVehicles: ["mule"] } as never,
    });
    const big = board(w).find((x) => x.kind === "city" && x.quantity > 15) as DeliveryOrder;
    expect(error(dispatch(w, big.id))).toBe("over_capacity");
    const small = board(w).find((x) => x.kind === "city" && x.quantity <= 15) as DeliveryOrder;
    expect(error(dispatch(w, small.id, "none", "a", cartOf(w, "b")))).toBe("not_owner");
    expect(error(dispatch(w, small.id, "dragoons"))).toBe("unknown_escort");
    w.do({
      type: "placeOrder",
      playerId: "a",
      resource: small.resource,
      side: "sell",
      kind: "limit",
      price: 1_000n,
      quantity: w.stock("a", small.resource).available - small.quantity + 1,
    });
    expect(error(dispatch(w, small.id))).toBe("insufficient_stock");
  });

  it("pays the escort into the sink, a share of the load at the order's price", () => {
    const w = world();
    const o = pick(w);
    const cash = w.cash("a");
    expect(error(dispatch(w, o.id, "guards"))).toBe("ok");
    const fee = (o.unitPrice * BigInt(o.quantity) * 400n) / 10_000n;
    expect(w.cash("a")).toBe(cash - fee);
    expect(w.state.accounts["system:sink"]).toBe(fee);
  });

  it("counts a Doge's order as fulfilled once it arrives", () => {
    const w = world();
    const o = pick(w, "doge");
    expect(error(dispatch(w, o.id))).toBe("ok");
    expect(w.state.contractsDone?.a?.ids).toContain(o.ref);
    const d = deliveriesOf(w)[0];
    w.at((d?.arriveAt ?? 0) - w.ctx.startAt);
    const res = w.do({ type: "tick" });
    expect(res.effects.events.map((e) => e.type)).toContain("contract_fulfilled");
    expect(res.effects.events.map((e) => e.type)).toContain("delivery_arrived");
  });
});
