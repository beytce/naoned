import { describe, expect, it } from "vitest";
import {
  type WorldSettingsInput,
  marketMakerQuotaLeft,
  maxOpenOrdersFor,
  maxVehiclesFor,
  portDuesFor,
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
    shipowner: { portDuesDiscountBps: 5_000, holdBps: 2_500 },
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

  it("shipowner: half the port dues", () => {
    const w = world();
    expect(portDuesFor(w.ctx, w.state, "a", 10_000n)).toBe(
      (10_000n * BigInt(w.ctx.settings.ships.portDuesBps)) / 10_000n,
    );
    choose(w, "shipowner");
    expect(portDuesFor(w.ctx, w.state, "a", 10_000n)).toBe(
      (10_000n * BigInt(w.ctx.settings.ships.portDuesBps)) / 20_000n,
    );
  });
});
