import { describe, expect, it } from "vitest";
import {
  type DeliveryOrder,
  type WorldSettingsInput,
  deliveryOrdersFor,
  marketMakerQuotaLeft,
  maxOpenOrdersFor,
  maxVehiclesFor,
  orderVisible,
  specialtyUnlocked,
  travelMinutesFor,
} from "../src/index.js";
import { deliverySettings } from "./fixture.js";
import { World, makeContext } from "./helpers.js";

const specialties = {
  unlockLevels: 3,
  options: {
    master: { transformYieldBps: 1_500 },
    carter: { vehicleSpeedBps: 2_500, extraVehicles: 1 },
    trader: { marketMakerQuotaBps: 5_000, taxDiscountBps: 100, extraOpenOrders: 2 },
  },
};
/** E1-6 of the experts: the Dogana's floor for the trader, the urgent orders seen sooner. */
const sharper = {
  ...specialties,
  options: {
    ...specialties.options,
    carter: { ...specialties.options.carter, urgentPreviewMinutes: 20 },
    trader: { ...specialties.options.trader, marketMakerFloorBps: 8_500 },
  },
};

const ctx = (more: Partial<WorldSettingsInput> = {}) =>
  makeContext({ ...deliverySettings, specialties, ...more });

/** A merchant of the Terraferma with three levels of workshops: the choice is open. */
function world(more: Partial<WorldSettingsInput> = {}) {
  const w = new World(ctx(more));
  w.do({ type: "join", playerId: "a", region: "terraferma" });
  w.do({ type: "join", playerId: "b", region: "terraferma" });
  w.give("a", "bricks", 200).give("a", "planks", 200).give("a", "wheat", 200);
  const farm = w.buildingsOf("a").find((b) => b.type === "farm");
  w.do({ type: "upgrade", playerId: "a", buildingId: farm?.id ?? "" });
  return w;
}

const choose = (w: World, specialty: string, playerId = "a") =>
  w.try({ type: "chooseSpecialty", playerId, specialty });
const error = (res: ReturnType<World["try"]>) => (res.ok ? "ok" : res.error);

describe("masteries", () => {
  it("open once the house has enough levels, once for the season", () => {
    const w = world();
    expect(specialtyUnlocked(w.ctx, w.state, "b")).toBe(false);
    expect(error(choose(w, "master", "b"))).toBe("specialty_locked");
    expect(specialtyUnlocked(w.ctx, w.state, "a")).toBe(true);
    expect(error(choose(w, "admiral"))).toBe("unknown_specialty");
    expect(error(choose(w, "master"))).toBe("ok");
    expect(w.state.players.a?.specialty).toBe("master");
    expect(error(choose(w, "trader"))).toBe("specialty_chosen");
  });

  it("master: transformation yields more, raw goods do not", () => {
    const yieldOf = (specialty: string | null) => {
      const w = world();
      if (specialty) choose(w, specialty);
      const mill = w.buildingsOf("a").find((b) => b.type === "mill");
      w.do({
        type: "startProduction",
        playerId: "a",
        buildingId: mill?.id ?? "",
        recipe: "mill_flour",
        batches: 1,
      });
      w.advance(3 * 3_600_000);
      w.do({ type: "collect", playerId: "a", buildingId: mill?.id ?? "" });
      return w.stock("a", "flour").available;
    };
    const plain = yieldOf(null);
    expect(yieldOf("master")).toBe(Math.floor((plain * 11_500) / 10_000));
    expect(yieldOf("trader")).toBe(plain);
  });

  it("carter: faster vehicles and one more allowed", () => {
    const w = world();
    const before = travelMinutesFor(w.ctx, w.state, "a", "verona", "cart");
    const vehicles = maxVehiclesFor(w.ctx, w.state, "a");
    choose(w, "carter");
    expect(travelMinutesFor(w.ctx, w.state, "a", "verona", "cart")).toBe(
      Math.ceil(((before ?? 0) * 10_000) / 12_500),
    );
    expect(maxVehiclesFor(w.ctx, w.state, "a")).toBe(vehicles + 1);
  });

  it("trader: more of the Dogana, more offers, a lighter tax on sales", () => {
    const quota = {
      marketMaker: {
        spreadStartBps: 400,
        spreadEndBps: 2_000,
        spreadRampDays: 14,
        referenceFloorBps: 5_000,
        dailyDepthPerPlayer: { wheat: 50 },
        playerDailyQuota: { wheat: 10 },
        playerDailySellQuota: { wheat: 10 },
      },
    };
    const w = world(quota);
    w.do({ type: "tick" });
    const offers = maxOpenOrdersFor(w.ctx, w.state, "a", w.now);
    choose(w, "trader");
    expect(marketMakerQuotaLeft(w.ctx, w.state, "a", "wheat", w.now).buy).toBe(15);
    expect(marketMakerQuotaLeft(w.ctx, w.state, "b", "wheat", w.now).buy).toBe(10);
    expect(maxOpenOrdersFor(w.ctx, w.state, "a", w.now)).toBe(offers + 2);

    // Selling 100 wheat at 1 ducat to another merchant: 2 % tax instead of 3 %.
    w.give("b", "wheat", 0);
    w.do({
      type: "placeOrder",
      playerId: "a",
      resource: "wheat",
      side: "sell",
      kind: "limit",
      price: 100n,
      quantity: 100,
    });
    const cash = w.cash("a");
    w.do({
      type: "placeOrder",
      playerId: "b",
      resource: "wheat",
      side: "buy",
      kind: "limit",
      price: 100n,
      quantity: 100,
    });
    expect(w.cash("a") - cash).toBe(10_000n - 200n);
  });

  it("trader: the Dogana buys at no less than its floor of the reference", () => {
    const dogana = {
      specialties: sharper,
      marketMaker: {
        // A spread of 60 %: the Dogana bids 70 % of the reference (100 for wheat).
        spreadStartBps: 6_000,
        spreadEndBps: 6_000,
        spreadRampDays: 14,
        referenceFloorBps: 5_000,
        dailyDepthPerPlayer: { wheat: 50 },
      },
    } as Partial<WorldSettingsInput>;
    const sell = (w: World, playerId: string) => {
      const cash = w.cash(playerId);
      w.do({
        type: "placeOrder",
        playerId,
        resource: "wheat",
        side: "sell",
        kind: "limit",
        price: 70n,
        quantity: 10,
      });
      return w.cash(playerId) - cash;
    };
    const w = world(dogana);
    w.give("b", "wheat", 10);
    w.do({ type: "tick" });
    choose(w, "trader");
    // The others at the Dogana's bid; the trader at 85 % of the reference.
    expect(sell(w, "b")).toBe(700n);
    expect(sell(w, "a")).toBe(850n);
  });

  it("carter: an urgent order seen 20 minutes before it opens, taken at its hour like any", () => {
    const w = world({ specialties: sharper } as Partial<WorldSettingsInput>);
    const urgent = deliveryOrdersFor(w.ctx, w.state, "a", 0).find(
      (o) => o.kind === "urgent",
    ) as DeliveryOrder;
    expect(urgent).toBeDefined();
    const at = (ms: number, playerId: string) =>
      orderVisible(w.ctx, w.state, playerId, urgent, urgent.opensAt - ms);
    choose(w, "carter");
    expect(at(21 * 60_000, "a")).toBe(false);
    expect(at(20 * 60_000, "a")).toBe(true);
    expect(at(20 * 60_000, "b")).toBe(false);
    expect(at(0, "b")).toBe(true);
    // A city order of a later wave stays hidden to all until it opens.
    expect(
      orderVisible(w.ctx, w.state, "a", { ...urgent, kind: "city" }, urgent.opensAt - 60_000),
    ).toBe(false);
  });
});
