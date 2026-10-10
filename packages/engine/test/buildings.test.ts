import { describe, expect, it } from "vitest";
import { World } from "./helpers.js";

describe("buildings", () => {
  it("builds with ducats and materials", () => {
    const w = new World();
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    w.give("a", "bricks", 40).give("a", "planks", 40);
    w.do({ type: "build", playerId: "a", buildingType: "bakery" });
    expect(w.cash("a")).toBe(100_000n - 60_000n);
    expect(w.stock("a", "bricks").available).toBe(0);
    expect(w.state.accounts["system:sink"]).toBe(60_000n);
  });

  it("refuses to build without materials and changes nothing", () => {
    const w = new World();
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    const res = w.try({ type: "build", playerId: "a", buildingType: "bakery" });
    expect(res.ok).toBe(false);
    expect(w.cash("a")).toBe(100_000n);
    expect(w.buildingsOf("a")).toHaveLength(2);
  });

  it("upgrades at a growing cost and raises output", () => {
    const w = new World();
    w.do({ type: "join", playerId: "a", region: "lagoon" });
    const pit = w.buildingsOf("a").find((b) => b.type === "clay_pit");
    if (!pit) throw new Error("no pit");
    w.give("a", "bricks", 40).give("a", "planks", 40);
    w.do({ type: "upgrade", playerId: "a", buildingId: pit.id });
    expect(w.cash("a")).toBe(100_000n - 60_000n); // level 2 = 2 × base
    expect(w.state.buildings[pit.id]?.level).toBe(2);
  });
});
