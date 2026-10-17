import { describe, expect, it } from "vitest";
import { missionsFor } from "../src/index.js";
import { DAY, HOUR, World, makeContext } from "./helpers.js";

describe("a dormant counting house", () => {
  const ctx = () =>
    makeContext({
      dormancy: { afterHours: 24 },
      rations: { resource: "bread", perLevelPerDay: 2, slowdownBps: 5_000 },
    });

  it("keeps its workers from starving while the player is away", () => {
    const w = new World(ctx());
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    w.give("a", "bread", 4);
    w.do({ type: "tick" });
    // Day 1: the player was here less than 24 h ago, the workers eat (farm + mill = 4 loaves).
    w.at(DAY + 60_000).do({ type: "tick" });
    expect(w.stock("a", "bread").available).toBe(0);
    expect(w.state.players.a?.hungryUntil ?? 0).toBeLessThan(w.now);
    // Days 2 and 3: away for more than 24 h, no bread eaten, no hunger.
    w.at(3 * DAY + 60_000).do({ type: "tick" });
    expect(w.state.players.a?.hungryUntil ?? 0).toBeLessThan(w.now);
  });

  it("wakes up with the next action", () => {
    const w = new World(ctx());
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    // Bread for day 1 only, before the player is gone for 24 h.
    w.give("a", "bread", 4);
    w.at(3 * DAY + HOUR).do({ type: "tick" });
    expect(w.state.players.a?.hungryUntil ?? 0).toBeLessThan(w.now);
    w.do({ type: "collect", playerId: "a", buildingId: w.buildingsOf("a")[0]?.id ?? "" });
    w.at(4 * DAY + 60_000).do({ type: "tick" });
    expect(w.state.players.a?.hungryUntil ?? 0).toBeGreaterThan(w.now);
  });
});

describe("the merchant's ledger of missions", () => {
  const ctx = () =>
    makeContext({
      missions: [
        { id: "first_sale", day: 0, event: "city_sale", count: 1, reward: { goods: { bread: 5 } } },
        {
          id: "first_offer",
          day: 1,
          event: "order_placed",
          filter: { kind: "limit" },
          count: 1,
          reward: { goods: {}, ducats: 5_000 },
        },
      ],
    });

  it("counts what the player does and pays the reward once, through the journals", () => {
    const w = new World(ctx());
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    w.give("a", "bread", 10);
    const early = w.try({ type: "claimMission", playerId: "a", missionId: "first_sale" });
    expect(early.ok).toBe(false);
    if (!early.ok) expect(early.error).toBe("mission_not_done");
    w.do({ type: "sellToCity", playerId: "a", city: "venezia", resource: "bread", quantity: 10 });
    expect(missionsFor(w.ctx, w.state, "a", w.now)[0]).toMatchObject({
      id: "first_sale",
      progress: 1,
      done: true,
      claimed: false,
    });
    w.do({ type: "claimMission", playerId: "a", missionId: "first_sale" });
    expect(w.stock("a", "bread").available).toBe(5);
    const twice = w.try({ type: "claimMission", playerId: "a", missionId: "first_sale" });
    expect(twice.ok).toBe(false);
  });

  it("opens missions day after day, but counts deeds done before", () => {
    const w = new World(ctx());
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    w.give("a", "wheat", 10);
    w.do({
      type: "placeOrder",
      playerId: "a",
      resource: "wheat",
      side: "sell",
      kind: "limit",
      price: 500n,
      quantity: 10,
    });
    const offer = missionsFor(w.ctx, w.state, "a", w.now).find((m) => m.id === "first_offer");
    expect(offer).toMatchObject({ unlocked: false, progress: 1 });
    expect(w.try({ type: "claimMission", playerId: "a", missionId: "first_offer" }).ok).toBe(false);
    w.advance(DAY);
    const cash = w.cash("a");
    w.do({ type: "claimMission", playerId: "a", missionId: "first_offer" });
    expect(w.cash("a") - cash).toBe(5_000n);
  });

  it("starts afresh for a player who restarts", () => {
    const w = new World(ctx());
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    w.give("a", "bread", 10);
    w.do({ type: "sellToCity", playerId: "a", city: "venezia", resource: "bread", quantity: 10 });
    w.do({ type: "resetPlayer", playerId: "a" });
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    expect(missionsFor(w.ctx, w.state, "a", w.now)[0]?.progress).toBe(0);
  });
});

describe("a mission on a kind of building", () => {
  it("counts only the building it names", () => {
    const w = new World(
      makeContext({
        missions: [
          {
            id: "first_bakery",
            day: 0,
            event: "build",
            filter: { type: "bakery" },
            count: 1,
            reward: { goods: {}, ducats: 1_000 },
          },
        ],
      }),
    );
    w.do({ type: "join", playerId: "a", region: "lagoon" });
    w.give("a", "bricks", 200).give("a", "planks", 200);
    w.do({ type: "build", playerId: "a", buildingType: "mill" });
    expect(missionsFor(w.ctx, w.state, "a", w.now)[0]?.progress).toBe(0);
    w.do({ type: "build", playerId: "a", buildingType: "bakery" });
    expect(missionsFor(w.ctx, w.state, "a", w.now)[0]?.done).toBe(true);
  });
});
