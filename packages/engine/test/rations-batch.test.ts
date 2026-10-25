import { describe, expect, it } from "vitest";
import { type WorldSettingsInput, rationsPerDay } from "../src/index.js";
import { MIN, World, makeContext } from "./helpers.js";

/** E1-4 of the experts: the workers eat when they work, a quarter of a loaf at a time. */
const rations = {
  resource: "bread",
  perLevelPerDay: 0,
  slowdownBps: 5_000,
  graceHours: 0,
  perBatchQuarters: { transform: 2, raw: 1 },
};

function world(more: Partial<WorldSettingsInput> = {}) {
  const w = new World(makeContext({ rations, ...more }));
  w.do({ type: "join", playerId: "a", region: "terraferma" });
  return w;
}
const building = (w: World, type: string) => {
  const b = w.buildingsOf("a").find((x) => x.type === type);
  if (!b) throw new Error(`no ${type}`);
  return b;
};

describe("rations by the batch", () => {
  it("takes half a loaf a batch and a level in a workshop that transforms, the rest kept", () => {
    const w = world();
    w.give("a", "wheat", 100).give("a", "bread", 10);
    const mill = building(w, "mill");
    const moves: { resource: string; quantity: number; reason: string }[] = [];
    const run = (batches: number) => {
      const res = w.do({
        type: "startProduction",
        playerId: "a",
        buildingId: mill.id,
        recipe: "mill_flour",
        batches,
      });
      if (res.ok) moves.push(...res.effects.stock);
    };
    run(3);
    // 3 batches × level 1 × 2 quarters = 6 quarters: 1 loaf eaten, 2 quarters kept.
    expect(w.stock("a", "bread").available).toBe(9);
    expect(w.state.buildings[mill.id]?.rationDebt).toBe(2);
    run(1);
    // 2 + 2 = 4 quarters: one more loaf, nothing kept.
    expect(w.stock("a", "bread").available).toBe(8);
    expect(w.state.buildings[mill.id]?.rationDebt).toBe(0);
    // Each loaf eaten has its line in the journal of stock.
    const eaten = moves.filter((m) => m.reason === "rations" && m.resource === "bread");
    expect(eaten.reduce((n, m) => n + m.quantity, 0)).toBe(-2);
  });

  it("takes a quarter of a loaf a batch and a level for a raw material", () => {
    const w = world();
    w.give("a", "bread", 10);
    const farm = building(w, "farm");
    w.do({
      type: "startProduction",
      playerId: "a",
      buildingId: farm.id,
      recipe: "grow_wheat",
      batches: 1,
    });
    expect(w.stock("a", "bread").available).toBe(10);
    expect(w.state.buildings[farm.id]?.rationDebt).toBe(1);
  });

  it("never blocks: without bread, a new queue starts slowed by half, nothing owed", () => {
    const w = world();
    w.give("a", "wheat", 100);
    const mill = building(w, "mill");
    w.do({
      type: "startProduction",
      playerId: "a",
      buildingId: mill.id,
      recipe: "mill_flour",
      batches: 2,
    });
    const job = w.state.buildings[mill.id]?.job;
    expect(job?.batchMs).toBe(45 * MIN);
    // Only the rounding's rest is kept: the loaf missing is not owed.
    expect(w.state.buildings[mill.id]?.rationDebt).toBe(0);
    // More batches on the same queue go in at its pace.
    w.do({
      type: "startProduction",
      playerId: "a",
      buildingId: mill.id,
      recipe: "mill_flour",
      batches: 1,
    });
    expect(w.state.buildings[mill.id]?.job?.batches).toBe(3);
  });

  it("costs nothing for the tutorial's quick batch", () => {
    const w = world({
      tutorial: {
        minutes: 30,
        fastBatchSeconds: 30,
        fastBatchesPerBuilding: 1,
        welcomeTripSeconds: 0,
      },
    });
    w.give("a", "wheat", 100).give("a", "bread", 10);
    const mill = building(w, "mill");
    w.do({
      type: "startProduction",
      playerId: "a",
      buildingId: mill.id,
      recipe: "mill_flour",
      batches: 1,
    });
    expect(w.state.buildings[mill.id]?.job?.batchMs).toBe(30_000);
    expect(w.stock("a", "bread").available).toBe(10);
    expect(w.state.buildings[mill.id]?.rationDebt ?? 0).toBe(0);
  });

  it("estimates a day's bread for the merchants who keep some back", () => {
    const ctx = makeContext({ rations });
    const b = (type: string, level: number) =>
      ({
        id: type,
        playerId: "a",
        type,
        level,
        job: null,
        investedValue: 0n,
        fastBatchesLeft: 0,
      }) as const;
    // Twelve batches a day: a mill of level 2 eats 12 × 2 × 2 / 4 = 12 loaves, a farm 3.
    expect(rationsPerDay(ctx, [b("mill", 2), b("farm", 1)], "a")).toBe(15);
  });
});
