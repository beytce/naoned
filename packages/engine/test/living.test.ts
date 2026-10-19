import { describe, expect, it } from "vitest";
import { activeEvent, contractsFor, dayIndex, quoteCitySale } from "../src/index.js";
import { testSettings } from "./fixture.js";
import { DAY, HOUR, MIN, World, makeContext } from "./helpers.js";

const famine = {
  code: "famine",
  weight: 1,
  cityPriceBps: { bread: 15_000 },
  cityCapacityBps: { bread: 20_000 },
  yieldBps: { wheat: -5_000 },
};

const living = (overrides: Record<string, unknown> = {}) =>
  makeContext({
    startingStock: { terraferma: { bread: 10, wood: 4 } },
    rations: { resource: "bread", perLevelPerDay: 2, slowdownBps: 5_000 },
    contracts: { perDay: 3, premiumBps: 2_000, quantities: { wheat: 20, clay: 15, wood: 15 } },
    events: { everyDays: 2, durationHours: 24, catalog: [famine] },
    referencePrices: { ...testSettings.referencePrices, spices: 1_500 },
    ...overrides,
  });

describe("starting stock", () => {
  it("gives the regional goods through the stock journal", () => {
    const w = new World(living());
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    expect(w.stock("a", "bread").available).toBe(10);
    expect(w.stock("a", "wood").available).toBe(4);
  });
});

describe("rations", () => {
  it("feeds workers every day from the bread stock", () => {
    const w = new World(living());
    w.do({ type: "join", playerId: "a", region: "terraferma" }); // farm + mill = 2 levels
    w.at(DAY + MIN).do({ type: "tick" });
    expect(w.stock("a", "bread").available).toBe(10 - 4);
    expect(w.state.players.a?.hungryUntil ?? 0).toBeLessThanOrEqual(w.now);
  });

  it("spares a newcomer's bread during the grace after joining", () => {
    const w = new World(
      living({
        rations: { resource: "bread", perLevelPerDay: 2, slowdownBps: 5_000, graceHours: 36 },
      }),
    );
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    w.at(DAY + MIN).do({ type: "tick" });
    expect(w.stock("a", "bread").available).toBe(10);
    w.at(2 * DAY + MIN).do({ type: "tick" });
    expect(w.stock("a", "bread").available).toBe(10 - 4);
  });

  it("slows production down when there is not enough bread", () => {
    const w = new World(living({ startingStock: {} }));
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    w.at(DAY + MIN).do({ type: "tick" });
    expect(w.state.players.a?.hungryUntil ?? 0).toBeGreaterThan(w.now);
    const farm = w.buildingsOf("a").find((b) => b.type === "farm");
    if (!farm) throw new Error("no farm");
    w.do({
      type: "startProduction",
      playerId: "a",
      buildingId: farm.id,
      recipe: "grow_wheat",
      batches: 1,
    });
    expect(w.state.buildings[farm.id]?.job?.batchMs).toBe(90 * MIN); // 60 min × 1.5
  });
});

describe("market events", () => {
  it("are drawn from the catalogue, every two days for 24 hours", () => {
    const ctx = living();
    expect(activeEvent(ctx, ctx.startAt + 12 * HOUR)).toBeNull();
    expect(activeEvent(ctx, ctx.startAt + DAY + HOUR)?.code).toBe("famine");
    expect(activeEvent(ctx, ctx.startAt + 2 * DAY + HOUR)).toBeNull();
    expect(activeEvent(ctx, ctx.startAt + 3 * DAY + HOUR)?.code).toBe("famine");
  });

  it("raise city prices and change yields while they last", () => {
    const w = new World(living());
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    const calm = quoteCitySale(w.ctx, w.state, "venezia", "bread", 1, w.now) ?? 0n;
    const during =
      quoteCitySale(w.ctx, w.state, "venezia", "bread", 1, w.ctx.startAt + DAY + HOUR) ?? 0n;
    expect(during).toBe((calm * 3n) / 2n);

    const farm = w.buildingsOf("a").find((b) => b.type === "farm");
    if (!farm) throw new Error("no farm");
    w.at(DAY + MIN);
    w.do({
      type: "startProduction",
      playerId: "a",
      buildingId: farm.id,
      recipe: "grow_wheat",
      batches: 1,
    });
    w.advance(HOUR);
    w.do({ type: "collect", playerId: "a", buildingId: farm.id });
    expect(w.stock("a", "wheat").available).toBe(16); // 20 × (1 + 30 % region − 50 % famine)
  });
});

describe("contracts of the Doge", () => {
  it("are the same for a player and a day, and change the next day", () => {
    const ctx = living();
    const a = contractsFor(ctx, "a", 0);
    expect(a).toHaveLength(3);
    expect(contractsFor(ctx, "a", 0)).toEqual(a);
    expect(contractsFor(ctx, "a", 1)).not.toEqual(a);
    for (const c of a) expect(["wheat", "clay", "wood"]).toContain(c.resource);
  });

  it("pay the reference price plus the premium, once", () => {
    const w = new World(living());
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    const c = contractsFor(w.ctx, "a", dayIndex(w.ctx, w.now))[0];
    if (!c) throw new Error("no contract");
    w.give("a", c.resource, c.quantity);
    w.do({ type: "fulfillContract", playerId: "a", contractId: c.id });
    expect(w.cash("a")).toBe(100_000n + c.unitPrice * BigInt(c.quantity));
    expect(c.unitPrice).toBe(120n); // reference 100 + 20 %
    w.give("a", c.resource, c.quantity);
    const again = w.try({ type: "fulfillContract", playerId: "a", contractId: c.id });
    expect(again.ok).toBe(false);
  });

  it("expire at the end of the day", () => {
    const w = new World(living());
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    const c = contractsFor(w.ctx, "a", 0)[0];
    if (!c) throw new Error("no contract");
    w.give("a", c.resource, c.quantity);
    w.at(DAY + MIN);
    const late = w.try({ type: "fulfillContract", playerId: "a", contractId: c.id });
    expect(late.ok).toBe(false);
    if (!late.ok) expect(late.error).toBe("contract_expired");
  });
});

describe("luxury contracts", () => {
  const ctx = (chanceBps: number) =>
    living({
      contracts: {
        perDay: 3,
        premiumBps: 2_000,
        quantities: { wheat: 20 },
        luxury: { chanceBps, quantities: { salt: 5, wine: 4 } },
      },
    });

  it("sometimes ask for goods from overseas", () => {
    const all = contractsFor(ctx(10_000), "a", 1);
    expect(all.every((c) => c.resource === "salt" || c.resource === "wine")).toBe(true);
    expect(all.every((c) => c.quantity === 5 || c.quantity === 4)).toBe(true);
    expect(contractsFor(ctx(0), "a", 1).every((c) => c.resource === "wheat")).toBe(true);
  });
});
