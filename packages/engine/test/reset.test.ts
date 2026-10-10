import { describe, expect, it } from "vitest";
import { World } from "./helpers.js";

describe("player reset", () => {
  it("removes everything the player had through the journals, then lets them start again", () => {
    const w = new World();
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    w.do({ type: "join", playerId: "b", region: "lagoon" });
    w.give("a", "wheat", 50).give("a", "bricks", 40).give("a", "planks", 40);
    const farm = w.buildingsOf("a").find((b) => b.type === "farm");
    if (!farm) throw new Error("no farm");
    w.do({
      type: "startProduction",
      playerId: "a",
      buildingId: farm.id,
      recipe: "grow_wheat",
      batches: 2,
    });
    w.do({ type: "upgrade", playerId: "a", buildingId: farm.id });
    w.do({
      type: "placeOrder",
      playerId: "a",
      resource: "wheat",
      side: "sell",
      kind: "limit",
      price: 150n,
      quantity: 20,
    });
    w.do({
      type: "placeOrder",
      playerId: "a",
      resource: "clay",
      side: "buy",
      kind: "limit",
      price: 90n,
      quantity: 10,
    });

    w.do({ type: "resetPlayer", playerId: "a" }); // the harness checks the six invariants
    expect(w.state.players.a).toBeUndefined();
    expect(w.buildingsOf("a")).toHaveLength(0);
    expect(Object.values(w.state.orders).filter((o) => o.playerId === "a")).toHaveLength(0);
    expect(w.state.inventories.a).toBeUndefined();
    expect(w.state.players.b).toBeDefined();

    w.do({ type: "join", playerId: "a", region: "dolomites" });
    expect(w.cash("a")).toBe(100_000n);
    expect(
      w
        .buildingsOf("a")
        .map((b) => b.type)
        .sort(),
    ).toEqual(["lumber_camp", "sawmill"]);
  });

  it("is allowed once per season by default", () => {
    const w = new World();
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    w.do({ type: "resetPlayer", playerId: "a" });
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    const again = w.try({ type: "resetPlayer", playerId: "a" });
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.error).toBe("reset_limit");
  });

  it("refuses an unknown player", () => {
    const w = new World();
    expect(w.try({ type: "resetPlayer", playerId: "ghost" }).ok).toBe(false);
  });
});
