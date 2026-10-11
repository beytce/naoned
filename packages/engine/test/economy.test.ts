import { describe, expect, it } from "vitest";
import { netWorth, quoteCitySale, stockUnitValue } from "../src/index.js";
import { DAY, HOUR, World, makeContext } from "./helpers.js";

describe("cities", () => {
  it("pays less as more is sold in the day, then recovers", () => {
    const w = new World();
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    w.give("a", "bread", 200);
    const first = quoteCitySale(w.ctx, w.state, "venezia", "bread", 10, w.now) ?? 0n;
    // Capacity 60, max drop 50 %: each unit sold lowers the price by 220 × 0.5 / 60 ≈ 1.83.
    expect(first).toBe(220n + 218n + 216n + 214n + 212n + 210n + 209n + 207n + 205n + 203n);
    w.do({ type: "sellToCity", playerId: "a", city: "venezia", resource: "bread", quantity: 60 });
    const after = quoteCitySale(w.ctx, w.state, "venezia", "bread", 10, w.now) ?? 0n;
    expect(after).toBe(1_100n);
    w.advance(DAY);
    expect(quoteCitySale(w.ctx, w.state, "venezia", "bread", 10, w.now)).toBe(first);
  });

  it("refuses goods the city does not buy", () => {
    const w = new World();
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    w.give("a", "wheat", 10);
    expect(
      w.try({ type: "sellToCity", playerId: "a", city: "venezia", resource: "wheat", quantity: 10 })
        .ok,
    ).toBe(false);
  });
});

describe("projects", () => {
  it("opens weekly and pays deliveries at a premium", () => {
    const w = new World();
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    w.do({ type: "tick" });
    const project = Object.values(w.state.projects)[0];
    if (!project) throw new Error("no project");
    expect(project.needs).toEqual({ bricks: 60, planks: 60 });
    w.give("a", "bricks", 70);
    w.do({
      type: "deliverToProject",
      playerId: "a",
      projectId: project.id,
      resource: "bricks",
      quantity: 60,
    });
    expect(w.cash("a")).toBe(100_000n + 60n * 242n);
    expect(
      w.try({
        type: "deliverToProject",
        playerId: "a",
        projectId: project.id,
        resource: "bricks",
        quantity: 1,
      }).ok,
    ).toBe(false);
    w.advance(7 * DAY).do({ type: "tick" });
    expect(Object.keys(w.state.projects)).toHaveLength(2);
    expect(
      w.try({
        type: "deliverToProject",
        playerId: "a",
        projectId: project.id,
        resource: "planks",
        quantity: 1,
      }).ok,
    ).toBe(false);
  });
});

describe("valuation", () => {
  it("values stock at the lower of reference and recent average price", () => {
    const w = new World();
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    w.do({ type: "join", playerId: "b", region: "lagoon" });
    w.give("a", "wheat", 1_000);
    expect(stockUnitValue(w.ctx, w.state, "wheat", w.now)).toBe(100n);
    // A high price on thin volume does not count.
    w.do({
      type: "placeOrder",
      playerId: "a",
      resource: "wheat",
      side: "sell",
      kind: "limit",
      price: 500n,
      quantity: 10,
    });
    w.do({
      type: "placeOrder",
      playerId: "b",
      resource: "wheat",
      side: "buy",
      kind: "limit",
      price: 500n,
      quantity: 10,
    });
    expect(stockUnitValue(w.ctx, w.state, "wheat", w.now)).toBe(100n);
    // A low price on enough volume does.
    w.do({
      type: "placeOrder",
      playerId: "a",
      resource: "wheat",
      side: "sell",
      kind: "limit",
      price: 50n,
      quantity: 300,
    });
    w.do({
      type: "placeOrder",
      playerId: "b",
      resource: "wheat",
      side: "buy",
      kind: "limit",
      price: 50n,
      quantity: 300,
    });
    expect(stockUnitValue(w.ctx, w.state, "wheat", w.now)).toBe((10n * 500n + 300n * 50n) / 310n);
    w.advance(8 * DAY + HOUR);
    expect(stockUnitValue(w.ctx, w.state, "wheat", w.now)).toBe(100n);
  });

  it("adds cash, escrow, stock and the buildings at cost", () => {
    const w = new World();
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    const nw = netWorth(w.ctx, w.state, "a", w.now);
    // farm 30 000 + 20 × 220 × 2 ; mill 40 000 + 30 × 220 × 2
    expect(nw.buildings).toBe(38_800n + 53_200n);
    expect(nw.total).toBe(100_000n + 92_000n);
  });
});

describe("projects switched off", () => {
  it("opens no project when the settings ask for nothing", () => {
    const w = new World(
      makeContext({
        projects: { intervalDays: 7, durationDays: 7, needsPerPlayer: {}, premiumBps: 0 },
      }),
    );
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    w.at(8 * DAY).do({ type: "tick" });
    expect(Object.keys(w.state.projects)).toHaveLength(0);
  });
});
