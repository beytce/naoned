import { describe, expect, it } from "vitest";
import {
  type Command,
  type DeliveryOrder,
  type WorldSettingsInput,
  boardRivals,
  boardTakes,
  checkInvariants,
  contractsFor,
  deliveryOrdersFor,
  hourIn,
  netWorth,
  orderUnitPrice,
  travelMinutes,
} from "../src/index.js";
import { deliverySettings, testDeliveries, testSettings } from "./fixture.js";
import { DAY, HOUR, MIN, T0, World, makeContext } from "./helpers.js";

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

describe("upgrading vehicles", () => {
  // Bought, a vehicle is always a mule; three upgrades for ducats make it bigger and faster.
  const ladderAt = (muleUpgrade: number) =>
    ({
      deliveries: {
        ...deliverySettings.deliveries,
        vehicles: {
          mule: {
            ...testDeliveries.vehicles.mule,
            upgrade: { to: "cart", costDucats: muleUpgrade },
          },
          cart: { ...testDeliveries.vehicles.cart, upgrade: { to: "wagon", costDucats: 8_000 } },
          wagon: {
            costDucats: 0,
            capacity: 90,
            speedBps: 13_000,
            upkeepPerDay: 400,
            upgrade: { to: "great_wagon", costDucats: 16_000 },
          },
          great_wagon: { costDucats: 0, capacity: 150, speedBps: 16_000, upkeepPerDay: 800 },
        },
        forSale: ["mule"],
        startingVehicles: ["mule", "mule"],
      },
    }) as never;
  const ladder = ladderAt(4_000);
  const upgrade = (w: World, vehicleId: string, playerId = "a") =>
    w.try({ type: "upgradeVehicle", playerId, vehicleId });

  it("buys only what is for sale: a mule", () => {
    const w = world(ladder);
    expect(vehiclesOf(w, "a").map((v) => v.type)).toEqual(["mule", "mule"]);
    expect(error(w.try({ type: "buyVehicle", playerId: "a", vehicleType: "cart" }))).toBe(
      "vehicle_not_for_sale",
    );
    expect(error(w.try({ type: "buyVehicle", playerId: "a", vehicleType: "mule" }))).toBe("ok");
  });

  it("climbs mule, cart, wagon, great wagon for ducats, which leave the game", () => {
    const w = world(ladder);
    const [mule] = vehiclesOf(w, "a");
    const id = mule?.id ?? "";
    const invested = mule?.investedValue ?? 0n;
    const cash = w.cash("a");
    const sink = w.state.accounts["system:sink"] ?? 0n;
    const first = upgrade(w, id);
    expect(first.ok && first.effects.events.map((e) => e.type)).toContain("vehicle_upgraded");
    expect(w.state.vehicles?.[id]?.type).toBe("cart");
    expect(w.cash("a")).toBe(cash - 4_000n);
    expect(w.state.accounts["system:sink"]).toBe(sink + 4_000n);
    // Counted in net worth at what it cost.
    expect(w.state.vehicles?.[id]?.investedValue).toBe(invested + 4_000n);
    expect(error(upgrade(w, id))).toBe("ok");
    expect(error(upgrade(w, id))).toBe("ok");
    expect(w.state.vehicles?.[id]?.type).toBe("great_wagon");
    expect(w.cash("a")).toBe(cash - 28_000n);
    expect(error(upgrade(w, id))).toBe("vehicle_max_level");
    expect(checkInvariants(w.state, w.totals)).toEqual([]);
  });

  it("goes faster once upgraded", () => {
    const w = world(ladder);
    const before = travelMinutes(w.ctx, "terraferma", "padova", "mule");
    const after = travelMinutes(w.ctx, "terraferma", "padova", "great_wagon");
    expect(after ?? 0).toBeLessThan(before ?? 0);
  });

  it("only at home, by its owner, with the ducats", () => {
    const w = world(ladder);
    const [mule] = vehiclesOf(w, "a");
    const id = mule?.id ?? "";
    expect(error(upgrade(w, id, "b"))).toBe("not_owner");
    expect(error(upgrade(w, "v999"))).toBe("unknown_vehicle");
    expect(error(dispatch(w, pick(w).id, "a", id))).toBe("ok");
    expect(error(upgrade(w, id))).toBe("vehicle_busy");

    const poor = world(ladderAt(1_000_000_000));
    const [other] = vehiclesOf(poor, "a");
    expect(error(upgrade(poor, other?.id ?? ""))).toBe("insufficient_funds");
  });
});

describe("the board of orders", () => {
  it("is drawn the same way every time, with the Doge's and urgent orders first", () => {
    const w = world();
    const board = deliveryOrdersFor(w.ctx, w.state, "a", 0);
    expect(deliveryOrdersFor(w.ctx, w.state, "a", 0)).toEqual(board);
    expect(board.length).toBeGreaterThanOrEqual(10);
    expect(board.length).toBeLessThanOrEqual(12);
    expect(board.map((o) => o.kind).slice(0, 3)).toEqual(["doge", "doge", "urgent"]);
    expect(board.slice(3).every((o) => o.kind === "city")).toBe(true);
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

  it("pays the Doge's premium, unchanged", () => {
    const w = world();
    const board = deliveryOrdersFor(w.ctx, w.state, "a", 0);
    for (const o of board.filter((x) => x.kind === "doge")) {
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

const dispatch = (w: World, orderId: string, playerId = "a", vehicleId?: string) =>
  w.try({
    type: "dispatchDelivery",
    playerId,
    orderId,
    vehicleId: vehicleId ?? cartOf(w, playerId),
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

describe("a board shared by the world", () => {
  const shared = (more: Partial<WorldSettingsInput> = {}) => {
    const w = new World(
      ctx({
        cities: {
          ...deliverySettings.cities,
          padova: {
            bread: { basePrice: 210, dailyCapacityPerPlayer: 45, maxDropBps: 5_000 },
            wheat: { basePrice: 110, dailyCapacityPerPlayer: 20, maxDropBps: 5_000 },
          },
        },
        deliveries: {
          ...testDeliveries,
          quantity: { ...testDeliveries.quantity, wheat: [10, 20] },
          sharedOrdersPerActivePlayer: 6,
        },
        ...more,
      }),
    );
    w.at(9 * HOUR);
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    w.do({ type: "join", playerId: "b", region: "terraferma" });
    w.do({ type: "join", playerId: "c", region: "lagoon" });
    for (const id of ["a", "b", "c"]) {
      w.give(id, "bread", 300).give(id, "bricks", 200).give(id, "wheat", 200);
    }
    w.do({ type: "tick" });
    return w;
  };
  const common = (w: World, playerId: string, day = 0) =>
    deliveryOrdersFor(w.ctx, w.state, playerId, day).filter((o) => o.shared);

  it("comes in waves through the day when set, each order open for a while", () => {
    const waves = {
      ...testDeliveries,
      quantity: { ...testDeliveries.quantity, wheat: [10, 20] },
      sharedOrdersPerActivePlayer: 6,
      waves: { everyHours: 4, openHours: 8 },
    };
    const w = shared({ deliveries: waves } as never);
    const city = w.state.board?.orders.filter((o) => o.kind === "city") ?? [];
    // As many orders a day as without waves, spread over six waves.
    expect(city).toHaveLength(18);
    const opens = [...new Set(city.map((o) => (o.opensAt - T0) / HOUR))].sort((a, b) => a - b);
    expect(opens).toEqual([0, 4, 8, 12, 16, 20]);
    for (const o of city) {
      expect(city.filter((x) => x.opensAt === o.opensAt)).toHaveLength(3);
      // Eight hours, cut at midnight when the next board is drawn.
      expect(o.expiresAt).toBe(Math.min(o.opensAt + 8 * HOUR, T0 + DAY));
    }
    // At 9 h, the waves of 0 h (closed at 8 h), 12 h and later are not open.
    const open = common(w, "a").filter(
      (o) => o.kind === "city" && o.opensAt <= w.now && w.now < o.expiresAt,
    );
    expect(open.map((o) => (o.opensAt - T0) / HOUR).sort()).toEqual([4, 4, 4, 8, 8, 8]);
    const later = common(w, "a").find((o) => o.kind === "city" && o.opensAt > w.now);
    expect(error(dispatch(w, later?.id ?? ""))).toBe("order_not_open");
  });

  it("is drawn once a day for the whole world, in proportion to the active merchants", () => {
    const w = shared();
    expect(w.state.board?.day).toBe(0);
    expect(w.state.board?.orders.filter((o) => o.kind === "city")).toHaveLength(18);
    // Two merchants of the same region see the same orders; the board holds through the day.
    const a = common(w, "a").map((o) => o.id);
    expect(common(w, "b").map((o) => o.id)).toEqual(a);
    w.at(15 * HOUR).do({ type: "tick" });
    expect(common(w, "a").map((o) => o.id)).toEqual(a);
    // A merchant arriving during the day grows the board; what was there stays, taken or not.
    const first = w.state.board?.orders.find((o) => o.kind === "city")?.id ?? "";
    expect(error(dispatch(w, first, "a"))).toBe("ok");
    w.do({ type: "join", playerId: "d", region: "terraferma" });
    expect(w.state.board?.orders.filter((o) => o.kind === "city")).toHaveLength(24);
    expect(common(w, "b").map((o) => o.id)).toEqual(expect.arrayContaining(a));
    expect(w.state.board?.takenBy[first]).toBe("a");
    // A new day, a new board.
    w.at(DAY + 9 * HOUR).do({ type: "tick" });
    expect(w.state.board?.day).toBe(1);
    // Personal orders stay personal: the Doge's.
    expect(deliveryOrdersFor(w.ctx, w.state, "a", 1).some((o) => o.kind === "doge")).toBe(true);
  });

  it("pays by the road from each merchant's region, and raw goods only to their producers", () => {
    const w = shared();
    const fromLagoon = new Map(common(w, "c").map((o) => [o.id, o]));
    expect([...fromLagoon.values()].some((o) => o.resource === "wheat")).toBe(false);
    const wheat = common(w, "a").filter((o) => o.resource === "wheat");
    expect(wheat.length).toBeGreaterThan(0);
    for (const o of common(w, "a").filter((x) => x.kind === "city")) {
      expect(o.unitPrice).toBe(orderUnitPrice(w.ctx, "terraferma", o.city, o.resource));
      const there = fromLagoon.get(o.id);
      if (there) expect(there.unitPrice).toBe(orderUnitPrice(w.ctx, "lagoon", o.city, o.resource));
    }
  });

  it("goes to the first who sends a vehicle", () => {
    const w = shared();
    const o = common(w, "a").find((x) => x.kind === "city" && x.quantity <= 40) as DeliveryOrder;
    expect(error(dispatch(w, o.id, "a"))).toBe("ok");
    expect(w.state.board?.takenBy[o.id]).toBe("a");
    expect(common(w, "b").find((x) => x.id === o.id)?.takenBy).toBe("a");
    expect(error(dispatch(w, o.id, "b"))).toBe("order_taken");
    expect(checkInvariants(w.state, w.totals)).toEqual([]);
  });

  it("counts the other active merchants who may take each order", () => {
    const w = shared();
    const rivals = boardRivals(w.ctx, w.state, "a", w.now);
    const seen = (p: string, id: string) => common(w, p).some((x) => x.id === id);
    const orders = common(w, "a");
    expect(orders.some((o) => o.resource === "wheat")).toBe(true);
    for (const o of orders) {
      // Raw wheat is for its producers only: the lagoon merchant is no rival there.
      const expected = ["b", "c"].filter((p) => seen(p, o.id)).length;
      expect(rivals(o)).toBe(expected);
    }
    // A merchant gone quiet is no rival any more.
    w.at(4 * DAY);
    w.do({ type: "join", playerId: "d", region: "lagoon" });
    expect(boardRivals(w.ctx, w.state, "d", w.now)(orders[0] as DeliveryOrder)).toBe(0);
  });

  it("tells the day's biggest takes, with who took them", () => {
    const w = shared();
    const orders = common(w, "a").filter((x) => x.kind === "city" && x.quantity <= 40);
    const value = (x: DeliveryOrder) => x.unitPrice * BigInt(x.quantity);
    const sorted = [...orders].sort((x, y) => (value(x) < value(y) ? -1 : 1));
    const small = sorted[0] as DeliveryOrder;
    const big = sorted.at(-1) as DeliveryOrder;
    expect(value(big)).toBeGreaterThan(value(small));
    expect(error(dispatch(w, small.id, "a"))).toBe("ok");
    expect(boardTakes(w.state, 3)).toEqual([
      {
        playerId: "a",
        city: small.city,
        resource: small.resource,
        quantity: small.quantity,
        payment: small.unitPrice * BigInt(small.quantity),
      },
    ]);
    expect(error(dispatch(w, big.id, "b"))).toBe("ok");
    expect(boardTakes(w.state, 3).map((t) => t.playerId)).toEqual(["b", "a"]);
    expect(boardTakes(w.state, 1)).toHaveLength(1);
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
    expect(error(dispatch(w, o.id, "a", first?.id))).toBe("ok");
    expect(error(dispatch(w, o.id, "a", second?.id))).toBe("order_done");
    expect(error(dispatch(w, "0:99", "a", second?.id))).toBe("unknown_delivery_order");

    const urgent = pick(w, "urgent");
    w.at(urgent.opensAt - w.ctx.startAt - MIN);
    expect(error(dispatch(w, urgent.id, "a", second?.id))).toBe("order_not_open");
    w.at(urgent.expiresAt - w.ctx.startAt);
    expect(error(dispatch(w, urgent.id, "a", second?.id))).toBe("order_expired");

    // Yesterday's orders are gone.
    const late = board(w).find((x) => x.kind === "city" && x.id !== o.id) as DeliveryOrder;
    w.at(DAY + 9 * HOUR);
    expect(error(dispatch(w, late.id, "a", second?.id))).toBe("order_expired");
  });

  it("refuses a load over capacity, short stock or someone else's vehicle", () => {
    const w = world({
      deliveries: { ...deliverySettings.deliveries, startingVehicles: ["mule"] } as never,
    });
    const big = board(w).find((x) => x.kind === "city" && x.quantity > 15) as DeliveryOrder;
    expect(error(dispatch(w, big.id))).toBe("over_capacity");
    const small = board(w).find((x) => x.kind === "city" && x.quantity <= 15) as DeliveryOrder;
    expect(error(dispatch(w, small.id, "a", cartOf(w, "b")))).toBe("not_owner");
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

const total = (o: DeliveryOrder) => o.unitPrice * BigInt(o.quantity);

describe("loading several orders on one vehicle", () => {
  const loads = (more = 3) =>
    world({ deliveries: { ...deliverySettings.deliveries, maxOrdersPerLoad: more } as never });
  /** Two city orders of the same city that fit together in a cart. */
  function pair(w: World): [DeliveryOrder, DeliveryOrder] {
    const city = board(w).filter((x) => x.kind === "city");
    for (const a of city) {
      const b = city.find(
        (x) => x.id !== a.id && x.city === a.city && a.quantity + x.quantity <= 40,
      );
      if (b) return [a, b];
    }
    throw new Error("no pair");
  }
  const load = (w: World, orderIds: string[]) =>
    w.try({
      type: "dispatchDelivery",
      playerId: "a",
      orderId: orderIds[0] ?? "",
      orderIds,
      vehicleId: cartOf(w),
    } as Command);

  it("carries orders for the same city together and pays them all on arrival", () => {
    const w = loads();
    const [o1, o2] = pair(w);
    const cash = w.cash("a");
    const stock = (r: string) => w.stock("a", r).available;
    const before = { [o1.resource]: stock(o1.resource), [o2.resource]: stock(o2.resource) };
    expect(error(load(w, [o1.id, o2.id]))).toBe("ok");
    const [d] = deliveriesOf(w);
    expect(d?.orders?.map((o) => o.id)).toEqual([o1.id, o2.id]);
    expect(d?.loaded).toBe(o1.quantity + o2.quantity);
    if (o1.resource === o2.resource) {
      expect(stock(o1.resource)).toBe((before[o1.resource] ?? 0) - o1.quantity - o2.quantity);
    }
    expect(w.state.deliveriesDone?.a?.ids).toEqual([o1.id, o2.id]);
    w.at((d?.arriveAt ?? 0) - w.ctx.startAt).do({ type: "tick" });
    const paid = o1.unitPrice * BigInt(o1.quantity) + o2.unitPrice * BigInt(o2.quantity);
    expect(w.cash("a")).toBe(cash + paid);
    expect(error(load(w, [o1.id]))).toBe("order_done");
  });

  it("refuses orders for different cities, beyond the capacity or the number allowed", () => {
    const w = loads(2);
    const city = board(w).filter((x) => x.kind === "city");
    const a = city[0] as DeliveryOrder;
    const other = city.find((x) => x.city !== a.city) as DeliveryOrder;
    expect(error(load(w, [a.id, other.id]))).toBe("several_cities");
    expect(error(load(w, [a.id, a.id]))).toBe("invalid_quantity");
    const same = city.filter((x) => x.city === a.city);
    const heavy = same.find((x) => x.id !== a.id && a.quantity + x.quantity > 40);
    if (heavy) expect(error(load(w, [a.id, heavy.id]))).toBe("over_capacity");
    const three = same.slice(0, 3).map((x) => x.id);
    if (three.length === 3) expect(error(load(w, three))).toBe("too_many_orders");
    expect(
      error(
        load(
          loads(1),
          pair(w).map((x) => x.id),
        ),
      ),
    ).toBe("too_many_orders");
  });

  it("carries several goods for the same city, each order paid for its own", () => {
    const w = loads();
    // The urgent order of bread for Venice, with an order of bricks for Venice.
    const o1 = pick(w, "urgent");
    const o2 = board(w).find(
      (x) => x.kind === "city" && x.city === o1.city && x.resource !== o1.resource,
    ) as DeliveryOrder;
    w.at(o1.opensAt - w.ctx.startAt);

    const cash = w.cash("a");
    expect(error(load(w, [o1.id, o2.id]))).toBe("ok");
    const [d] = deliveriesOf(w);
    expect(d?.cargo).toEqual({ [o1.resource]: o1.quantity, [o2.resource]: o2.quantity });
    w.at((d?.arriveAt ?? 0) - w.ctx.startAt).do({ type: "tick" });
    expect(w.cash("a")).toBe(cash + total(o1) + total(o2));
  });

  it("fulfils a Doge's order carried with others", () => {
    const w = loads();
    const doge = pick(w, "doge");
    const other = board(w).find(
      (x) => x.kind === "city" && x.city === doge.city && x.quantity + doge.quantity <= 40,
    );
    if (!other) return;
    expect(error(load(w, [doge.id, other.id]))).toBe("ok");
    expect(w.state.contractsDone?.a?.ids).toContain(doge.ref);
    const [d] = deliveriesOf(w);
    const res = w.at((d?.arriveAt ?? 0) - w.ctx.startAt).do({ type: "tick" });
    expect(res.effects.events.filter((e) => e.type === "contract_fulfilled")).toHaveLength(1);
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

  it("serves the Doge's orders by road only, goods from overseas included", () => {
    const luxury = { chanceBps: 10_000, quantities: { salt: 2 } };
    const home = world();
    const c = contractsFor(home.ctx, "a", 0)[0];
    expect(
      error(home.try({ type: "fulfillContract", playerId: "a", contractId: c?.id ?? "" })),
    ).toBe("city_sales_closed");

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

describe("city prices and the Rialto", () => {
  const market = { weightBps: 5_000, floorBps: 8_000, capBps: 15_000 };
  const indexed = () => world({ deliveries: { ...testDeliveries, marketIndex: market } as never });
  /** Bread traded at `price` on `day`, in volume. */
  const traded = (w: World, price: number, day: number, volume = 300) => {
    w.state = {
      ...w.state,
      priceStats: {
        ...w.state.priceStats,
        bread: { [day]: { volume, value: BigInt(volume * price) } },
      },
    };
  };
  /** A city order of bread on day 1, and its price without the market. */
  const bread = (w: World) => {
    const o = deliveryOrdersFor(w.ctx, w.state, "a", 1).find(
      (x) => x.kind === "city" && x.resource === "bread",
    );
    if (!o) throw new Error("no bread order");
    return { price: o.unitPrice, plain: orderUnitPrice(w.ctx, "terraferma", o.city, "bread") };
  };

  /** Equal but for the rounding of the road's bonus. */
  const near = (a: bigint, b: bigint) => expect(a > b ? a - b : b - a).toBeLessThanOrEqual(1n);

  it("follow yesterday's price at the Rialto, half and half with the reference", () => {
    const w = indexed();
    traded(w, 240, 0);
    const { price, plain } = bread(w);
    // (180 + 240) / 2 = 210.
    near(price, (plain * 210n) / 180n);
  });

  it("stay within their bounds whatever the Rialto does", () => {
    const w = indexed();
    traded(w, 900, 0);
    const high = bread(w);
    near(high.price, (high.plain * 270n) / 180n);
    traded(w, 10, 0);
    const low = bread(w);
    near(low.price, (low.plain * 144n) / 180n);
  });

  it("ignore a thin market, and are off without the setting", () => {
    const w = indexed();
    traded(w, 240, 0, 10);
    const thin = bread(w);
    expect(thin.price).toBe(thin.plain);
    const off = world();
    traded(off, 240, 0);
    const o = bread(off);
    expect(o.price).toBe(o.plain);
  });
});
