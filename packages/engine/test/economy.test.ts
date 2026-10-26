import { describe, expect, it } from "vitest";
import {
  arsenalMudaBps,
  netWorth,
  quoteCitySale,
  stockUnitValue,
  weekStart,
} from "../src/index.js";
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

describe("company orders", () => {
  it("share a bonus pro rata among those who filled the order, once it is full", () => {
    const base = makeContext().settings.projects;
    const w = new World(makeContext({ projects: { ...base, bonusBps: 1_000 } }));
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    w.do({ type: "join", playerId: "b", region: "lagoon" });
    w.do({ type: "tick" });
    const project = Object.values(w.state.projects)[0];
    if (!project) throw new Error("no project");
    const bricks = project.needs.bricks ?? 0;
    const planks = project.needs.planks ?? 0;
    w.give("a", "bricks", bricks);
    w.give("b", "planks", planks);
    const deliver = (playerId: string, resource: string, quantity: number) =>
      w.do({ type: "deliverToProject", playerId, projectId: project.id, resource, quantity });
    deliver("a", "bricks", bricks);
    const a = w.cash("a");
    const b = w.cash("b");
    // Not full yet: no bonus.
    deliver("b", "planks", planks - 1);
    expect(w.cash("a")).toBe(a);
    deliver("b", "planks", 1);
    const done = w.state.projects[project.id];
    const value = (r: string, q: number) => (done?.unitPrice[r] ?? 0n) * BigInt(q);
    // 10 % of what each delivered, on top.
    expect(w.cash("a") - a).toBe(value("bricks", bricks) / 10n);
    expect(w.cash("b") - b).toBe(value("planks", planks) + value("planks", planks) / 10n);
    expect(done?.completedAt).toBe(w.now);
  });
});

describe("the Arsenal of the week (E2-6)", () => {
  const arsenal = {
    intervalDays: 7,
    durationDays: 7,
    weekly: true,
    needsPerPlayer: { bricks: 10, planks: 10 },
    premiumBps: 1_000,
    bonusBps: 1_000,
    tiersBps: [10_000, 12_500, 15_000],
    premiumAboveBps: 500,
    silverMudaBps: 2_500,
    goldInfluence: 3,
    goldMinShareBps: 200,
  };
  const world = () => {
    const w = new World(makeContext({ weekStart: "monday", projects: arsenal }));
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    w.do({ type: "join", playerId: "b", region: "lagoon" });
    w.do({ type: "tick" });
    w.give("a", "bricks", 100).give("a", "planks", 100);
    w.give("b", "bricks", 100).give("b", "planks", 100);
    const project = Object.values(w.state.projects)[0];
    if (!project) throw new Error("no project");
    const deliver = (playerId: string, resource: string, quantity: number) =>
      w.try({ type: "deliverToProject", playerId, projectId: project.id, resource, quantity });
    return { w, project, deliver };
  };

  it("runs from Monday to Sunday night, the ranking's week", () => {
    const { w, project } = world();
    expect(project.deadline).toBe(weekStart(w.ctx, 1));
    w.at(weekStart(w.ctx, 1) - w.ctx.startAt).do({ type: "tick" });
    const next = Object.values(w.state.projects).find((p) => p.id !== project.id);
    expect(next?.openedAt).toBe(weekStart(w.ctx, 1));
    expect(next?.deadline).toBe(weekStart(w.ctx, 2));
  });

  it("goes past the Bronze to Silver and Gold, at +5 % instead of +10 % beyond it", () => {
    const { w, project, deliver } = world();
    // Bronze: 10 a merchant, 20 of each; Silver 25, Gold 30.
    expect(project.needs).toEqual({ bricks: 20, planks: 20 });
    const cash = w.cash("a");
    deliver("a", "bricks", 22);
    // 20 at 242 (reference 220 + 10 %), 2 at 231 (+5 %).
    expect(w.cash("a") - cash).toBe(20n * 242n + 2n * 231n);
    deliver("a", "planks", 20);
    // The Bronze reached: the bonus of 10 % on what was paid, as before.
    expect(w.state.projects[project.id]?.tier).toBe(1);
    deliver("b", "bricks", 3);
    deliver("b", "planks", 5);
    expect(w.state.projects[project.id]?.tier).toBe(2);
    deliver("b", "bricks", 5);
    deliver("b", "planks", 5);
    expect(w.state.projects[project.id]?.tier).toBe(3);
    const full = deliver("b", "bricks", 1);
    expect(full.ok ? "" : full.error).toBe("project_full");
  });

  it("gives Gold's Influence to whoever delivered 2 % of it and a unit past the Bronze", () => {
    const { w, project, deliver } = world();
    deliver("a", "bricks", 20);
    deliver("a", "planks", 20);
    deliver("b", "bricks", 10);
    const last = deliver("b", "planks", 10);
    if (!last.ok) throw new Error(last.error);
    expect(w.state.projects[project.id]?.tier).toBe(3);
    const earned = last.effects.events.filter((e) => e.type === "influence_earned");
    // Ada filled the Bronze alone: nothing past it, no Influence.
    expect(earned.map((e) => [e.playerId, e.data?.amount])).toEqual([["b", 3]]);
  });

  it("brings a quarter more to the galleys of the next week once the Silver is reached", () => {
    const { w, project, deliver } = world();
    deliver("a", "bricks", 25);
    deliver("a", "planks", 25);
    expect(arsenalMudaBps(w.ctx, w.state, w.now)).toBe(0);
    expect(arsenalMudaBps(w.ctx, w.state, project.deadline)).toBe(2_500);
    expect(arsenalMudaBps(w.ctx, w.state, project.deadline + 7 * DAY)).toBe(0);
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
