import { describe, expect, it } from "vitest";
import {
  type Command,
  type DeliveryOrder,
  type WorldSettingsInput,
  checkInvariants,
  contractsFor,
  deliveryOrdersFor,
  hourIn,
  netWorth,
  orderUnitPrice,
  travelMinutes,
} from "../src/index.js";
import { deliverySettings, testDeliveries, testSettings } from "./fixture.js";
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

  it("may be won with a mission, counted at cost, within the limit", () => {
    const missions = [
      {
        id: "first_trip",
        day: 0,
        event: "delivery_dispatched",
        count: 1,
        reward: { goods: {}, ducats: 0, vehicles: ["mule"] },
      },
    ];
    const w = world({ missions });
    expect(error(dispatch(w, pick(w).id))).toBe("ok");
    const before = netWorth(w.ctx, w.state, "a", w.now).buildings;
    w.do({ type: "claimMission", playerId: "a", missionId: "first_trip" });
    const won = vehiclesOf(w, "a").filter((v) => v.type === "mule");
    expect(won).toHaveLength(1);
    expect(netWorth(w.ctx, w.state, "a", w.now).buildings).toBe(
      before + (won[0]?.investedValue ?? 0n),
    );
    expect(checkInvariants(w.state, w.totals)).toEqual([]);

    // At the limit, the mission is still paid, without the vehicle.
    const full = world({ missions });
    full.do({ type: "buyVehicle", playerId: "a", vehicleType: "cart" });
    full.do({ type: "buyVehicle", playerId: "a", vehicleType: "cart" });
    expect(error(dispatch(full, pick(full).id))).toBe("ok");
    full.do({ type: "claimMission", playerId: "a", missionId: "first_trip" });
    expect(vehiclesOf(full, "a")).toHaveLength(3);
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

  it("leans to the merchant's own chain when asked", () => {
    const w = world({
      cities: {
        ...deliverySettings.cities,
        padova: {
          bread: { basePrice: 210, dailyCapacityPerPlayer: 45, maxDropBps: 5_000 },
          wheat: { basePrice: 110, dailyCapacityPerPlayer: 45, maxDropBps: 5_000 },
          flour: { basePrice: 170, dailyCapacityPerPlayer: 45, maxDropBps: 5_000 },
        },
      } as never,
      deliveries: {
        ...deliverySettings.deliveries,
        homeShareBps: 10_000,
        quantity: { bread: [10, 20], bricks: [5, 10], wheat: [5, 10], flour: [5, 10] },
      } as never,
    });
    // The Terraferma of the fixture starts with a farm and a mill: wheat and flour.
    for (let day = 0; day < 5; day++) {
      const city = deliveryOrdersFor(w.ctx, w.state, "a", day).filter((o) => o.kind === "city");
      expect(city.length).toBeGreaterThan(0);
      for (const o of city) expect(["wheat", "flour"]).toContain(o.resource);
    }
  });

  it("opens with a welcome order the starting stock covers, on the day of joining only", () => {
    const w = world({
      deliveries: {
        ...deliverySettings.deliveries,
        welcome: { terraferma: { resource: "bread", quantity: 12 } },
      } as never,
    });
    const [first] = deliveryOrdersFor(w.ctx, w.state, "a", 0);
    // The nearest city buying bread from the Terraferma: Padua, 30 minutes.
    expect(first).toMatchObject({ kind: "city", resource: "bread", quantity: 12, city: "padova" });
    const later = deliveryOrdersFor(w.ctx, w.state, "a", 1)[0];
    expect(later?.kind).toBe("doge");
  });

  it("orders raw goods only from the merchants who produce them, never goods from overseas", () => {
    const w = world({
      cities: {
        ...deliverySettings.cities,
        padova: {
          bread: { basePrice: 210, dailyCapacityPerPlayer: 45, maxDropBps: 5_000 },
          wheat: { basePrice: 110, dailyCapacityPerPlayer: 45, maxDropBps: 5_000 },
          clay: { basePrice: 110, dailyCapacityPerPlayer: 45, maxDropBps: 5_000 },
          salt: { basePrice: 340, dailyCapacityPerPlayer: 45, maxDropBps: 5_000 },
        },
      } as never,
      referencePrices: { ...testSettings.referencePrices, salt: 300 },
      deliveries: {
        ...deliverySettings.deliveries,
        quantity: { bread: [5, 10], wheat: [5, 10], clay: [5, 10], salt: [1, 2] },
      } as never,
    });
    w.do({ type: "join", playerId: "potter", region: "lagoon" });
    const seen = (playerId: string) => {
      const out = new Set<string>();
      for (let day = 0; day < 8; day++) {
        for (const o of deliveryOrdersFor(w.ctx, w.state, playerId, day)) out.add(o.resource);
      }
      return out;
    };
    // The Terraferma grows wheat, the Lagoon digs clay: each is asked only its own raw goods.
    const farmer = seen("a");
    expect(farmer.has("wheat")).toBe(true);
    expect(farmer.has("clay")).toBe(false);
    const potter = seen("potter");
    expect(potter.has("clay")).toBe(true);
    expect(potter.has("wheat")).toBe(false);
    expect(farmer.has("salt") || potter.has("salt")).toBe(false);
  });

  it("puts the Doge's orders of goods from overseas on the road", () => {
    const w = world({
      contracts: {
        perDay: 2,
        premiumBps: 2_000,
        quantities: { bread: 20 },
        luxury: { chanceBps: 10_000, quantities: { salt: 2 } },
      } as never,
      referencePrices: { ...testSettings.referencePrices, salt: 300 },
    });
    const doge = deliveryOrdersFor(w.ctx, w.state, "a", 0).filter((o) => o.kind === "doge");
    expect(doge.map((o) => o.resource)).toEqual(["salt", "salt"]);
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

describe("market events on the board", () => {
  // From day 1, every day: Verona pays bread 50 % more and asks for twice as much.
  const fire = {
    everyDays: 1,
    durationHours: 24,
    catalog: [
      {
        code: "famine",
        weight: 1,
        city: "verona",
        cityPriceBps: { bread: 15_000 },
        cityCapacityBps: { bread: 20_000 },
        yieldBps: {},
      },
    ],
  };
  const withEvents = (events: WorldSettingsInput["events"], eventOrdersPerDay = 2) =>
    world({ events, deliveries: { ...testDeliveries, eventOrdersPerDay } });

  it("pays the event's price in the city it touches, on its day only", () => {
    const w = withEvents(fire);
    for (const day of [0, 1, 2]) {
      for (const o of deliveryOrdersFor(w.ctx, w.state, "a", day)) {
        if (o.kind !== "city" && o.kind !== "urgent") continue;
        const base = orderUnitPrice(
          w.ctx,
          "terraferma",
          o.city,
          o.resource,
          o.kind === "urgent" ? 1_500 : 0,
        );
        const touched = day > 0 && o.city === "verona" && o.resource === "bread";
        expect(o.unitPrice).toBe(touched ? (base * 15_000n) / 10_000n : base);
      }
    }
  });

  it("sends the first city orders of the day where the event asks for more, same total", () => {
    const quiet = world();
    const w = withEvents(fire);
    for (const day of [1, 2, 3]) {
      const board = deliveryOrdersFor(w.ctx, w.state, "a", day);
      const asked = board.filter(
        (o) => o.kind === "city" && o.city === "verona" && o.resource === "bread",
      );
      expect(asked.length).toBeGreaterThanOrEqual(2);
      expect(board.length).toBe(deliveryOrdersFor(quiet.ctx, quiet.state, "a", day).length);
    }
    // No event on day 0: no event order.
    const none = withEvents(fire, 0);
    expect(deliveryOrdersFor(none.ctx, none.state, "a", 1)).toEqual(
      deliveryOrdersFor(quiet.ctx, quiet.state, "a", 1).map((o) => ({
        ...o,
        unitPrice:
          o.city === "verona" && o.resource === "bread"
            ? (o.unitPrice * 15_000n) / 10_000n
            : o.unitPrice,
      })),
    );
  });

  it("touches the Doge's orders too, when the event covers every city", () => {
    const storm = {
      ...fire,
      catalog: [
        {
          code: "storm",
          weight: 1,
          cityPriceBps: { bread: 13_000, bricks: 13_000 },
          cityCapacityBps: {},
          yieldBps: {},
        },
      ],
    };
    const w = withEvents(storm);
    const quiet = world();
    const doge = (x: World) =>
      deliveryOrdersFor(x.ctx, x.state, "a", 1).filter((o) => o.kind === "doge");
    const before = doge(quiet);
    const after = doge(w);
    expect(after.map((o) => o.resource)).toEqual(before.map((o) => o.resource));
    after.forEach((o, i) => {
      const was = before[i]?.unitPrice ?? 0n;
      expect(o.unitPrice).toBe((was * 13_000n) / 10_000n);
    });
  });

  it("pays on arrival the price shown on the board", () => {
    const w = withEvents(fire);
    // Upkeep of the new day first, so that only the payment moves the purse.
    w.at(DAY + 10 * HOUR).do({ type: "tick" });
    w.give("a", "bread", 100);
    const o = board(w).find(
      (x) => x.kind === "city" && x.city === "verona" && x.resource === "bread",
    ) as DeliveryOrder;
    const before = w.cash("a");
    expect(error(dispatch(w, o.id))).toBe("ok");
    const [d] = deliveriesOf(w);
    w.at((d?.arriveAt ?? 0) - w.ctx.startAt).do({ type: "tick" });
    expect(w.cash("a")).toBe(before + o.unitPrice * BigInt(o.quantity));
  });
});

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

  it("is forgotten a few days after the vehicle is back", () => {
    const w = world();
    dispatch(w, pick(w).id);
    const [d] = deliveriesOf(w);
    w.at((d?.backAt ?? 0) - w.ctx.startAt + 3 * DAY - MIN).do({ type: "tick" });
    expect(deliveriesOf(w)).toHaveLength(1);
    w.advance(2 * MIN).do({ type: "tick" });
    expect(deliveriesOf(w)).toHaveLength(0);
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

describe("the instant sale to cities, closed by deliveries", () => {
  it("refuses selling to a city, to a Criée and swapping a Doge's order", () => {
    const w = world();
    const sale = w.try({
      type: "sellToCity",
      playerId: "a",
      city: "venezia",
      resource: "bread",
      quantity: 10,
    });
    expect(error(sale)).toBe("city_sales_closed");
    expect(error(w.try({ type: "sellToCriee", playerId: "a", quantity: 1 }))).toBe(
      "city_sales_closed",
    );
    w.do({ type: "grantPass", playerId: "a", until: w.now + DAY });
    const c = contractsFor(w.ctx, "a", 0)[0];
    expect(error(w.try({ type: "rerollContract", playerId: "a", contractId: c?.id ?? "" }))).toBe(
      "city_sales_closed",
    );
  });

  it("serves the Doge's and the family's orders by road only, goods from overseas included", () => {
    const luxury = { chanceBps: 10_000, quantities: { salt: 2 } };
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
    const home = world({ families });
    home.do({ type: "joinFamily", playerId: "a", family: "contarini" });
    const c = contractsFor(home.ctx, "a", 0)[0];
    expect(
      error(home.try({ type: "fulfillContract", playerId: "a", contractId: c?.id ?? "" })),
    ).toBe("city_sales_closed");
    expect(error(home.try({ type: "fulfillFamilyOrder", playerId: "a", orderId: "0:f0" }))).toBe(
      "city_sales_closed",
    );

    const overseas = world({
      contracts: { ...deliverySettings.contracts, luxury } as never,
      referencePrices: { ...testSettings.referencePrices, salt: 300 },
    });
    overseas.give("a", "salt", 10);
    const lux = contractsFor(overseas.ctx, "a", 0)[0];
    expect(lux?.resource).toBe("salt");
    expect(
      error(overseas.try({ type: "fulfillContract", playerId: "a", contractId: lux?.id ?? "" })),
    ).toBe("city_sales_closed");
    expect(board(overseas).some((o) => o.kind === "doge" && o.resource === "salt")).toBe(true);
  });

  it("keeps goods on the road accounted for (invariant 7)", () => {
    const w = world();
    const o = pick(w);
    dispatch(w, o.id);
    const [d] = deliveriesOf(w);
    expect(checkInvariants(w.state, w.totals)).toEqual([]);
    const broken = structuredClone(w.state);
    const bad = broken.deliveries?.[d?.id ?? ""];
    if (bad) bad.cargo[bad.resource] = bad.loaded + 1;
    expect(checkInvariants(broken, w.totals).map((v) => v.invariant)).toEqual([7]);
  });
});
