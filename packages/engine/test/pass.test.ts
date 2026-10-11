import { describe, expect, it } from "vitest";
import {
  type WorldSettingsInput,
  contractsFor,
  dayIndex,
  hasPass,
  marketMakerQuotaLeft,
  rerollsOf,
} from "../src/index.js";
import { DAY, HOUR, MIN, World, makeContext } from "./helpers.js";

const pass: Partial<WorldSettingsInput> = {
  pass: {
    marketMakerQuotaBps: 2_000,
    extraOpenOrders: 2,
    freshBonusBps: 2_000,
    contractRerollsPerDay: 1,
  },
  fresh: { minutes: 30, bonusBps: 500 },
  marketMaker: {
    spreadStartBps: 400,
    spreadEndBps: 2_000,
    spreadRampDays: 14,
    referenceFloorBps: 5_000,
    dailyDepthPerPlayer: { wheat: 5 },
    playerDailyQuota: { wheat: 10 },
    playerDailySellQuota: { wheat: 10 },
  },
  contracts: { perDay: 3, premiumBps: 2_000, quantities: { wheat: 20, clay: 15, wood: 15 } },
};

function world() {
  const w = new World(makeContext(pass));
  w.do({ type: "join", playerId: "paid", region: "terraferma" });
  w.do({ type: "join", playerId: "free", region: "terraferma" });
  w.do({ type: "grantPass", playerId: "paid", until: w.now + 7 * DAY });
  w.do({ type: "tick" });
  return w;
}

describe("the Pass Négociant", () => {
  it("is held until a date, granted by the server (bought or won)", () => {
    const w = world();
    expect(hasPass(w.state, "paid", w.now)).toBe(true);
    expect(hasPass(w.state, "free", w.now)).toBe(false);
    expect(hasPass(w.state, "paid", w.now + 7 * DAY)).toBe(false);
    // A later grant extends it, an earlier one never shortens it.
    w.do({ type: "grantPass", playerId: "paid", until: w.now + DAY });
    expect(hasPass(w.state, "paid", w.now + 6 * DAY)).toBe(true);
  });

  it("raises the daily quota at the Dogana by a fifth", () => {
    const w = world();
    expect(marketMakerQuotaLeft(w.ctx, w.state, "paid", "wheat", w.now).buy).toBe(12);
    expect(marketMakerQuotaLeft(w.ctx, w.state, "free", "wheat", w.now).buy).toBe(10);
  });

  it("allows two more open offers", () => {
    const w = world();
    const offer = (playerId: string) =>
      w.try({
        type: "placeOrder",
        playerId,
        resource: "wheat",
        side: "buy",
        kind: "limit",
        price: 10n,
        quantity: 1,
      });
    for (let i = 0; i < 10; i++) {
      expect(offer("free").ok).toBe(true);
      expect(offer("paid").ok).toBe(true);
    }
    expect(offer("free").ok).toBe(false);
    expect(offer("paid").ok).toBe(true);
    expect(offer("paid").ok).toBe(true);
    expect(offer("paid").ok).toBe(false);
  });

  it("makes fresh produce a little fresher", () => {
    const w = world();
    const harvest = (playerId: string) => {
      const farm = w.buildingsOf(playerId).find((b) => b.type === "farm");
      if (!farm) throw new Error("no farm");
      w.do({
        type: "startProduction",
        playerId,
        buildingId: farm.id,
        recipe: "grow_wheat",
        batches: 1,
      });
      return farm.id;
    };
    const a = harvest("paid");
    const b = harvest("free");
    w.advance(HOUR + 5 * MIN);
    w.do({ type: "collect", playerId: "paid", buildingId: a });
    w.do({ type: "collect", playerId: "free", buildingId: b });
    // 20 × (1 + 30 % region + 20 % fresh with the Pass) = 30; without: 20 × 1.35 = 27.
    expect(w.stock("paid", "wheat").available).toBe(30);
    expect(w.stock("free", "wheat").available).toBe(27);
  });

  it("swaps one of the Doge's orders a day", () => {
    const w = world();
    const day = dayIndex(w.ctx, w.now);
    const before = contractsFor(w.ctx, "paid", day, rerollsOf(w.state, "paid", day));
    const first = before[0];
    if (!first) throw new Error("no contract");
    w.do({ type: "rerollContract", playerId: "paid", contractId: first.id });
    const after = contractsFor(w.ctx, "paid", day, rerollsOf(w.state, "paid", day));
    expect(after[0]?.id).not.toBe(first.id);
    expect(after.slice(1)).toEqual(before.slice(1));
    const again = w.try({
      type: "rerollContract",
      playerId: "paid",
      contractId: after[1]?.id ?? "",
    });
    expect(again.ok ? "" : again.error).toBe("no_reroll_left");
    const free = contractsFor(w.ctx, "free", day)[0];
    const refused = w.try({ type: "rerollContract", playerId: "free", contractId: free?.id ?? "" });
    expect(refused.ok ? "" : refused.error).toBe("pass_required");
    // The new order can be fulfilled.
    const swapped = after[0];
    if (!swapped) throw new Error("no contract");
    w.give("paid", swapped.resource, swapped.quantity);
    expect(w.try({ type: "fulfillContract", playerId: "paid", contractId: swapped.id }).ok).toBe(
      true,
    );
  });
});
