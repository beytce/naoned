import { describe, expect, it } from "vitest";
import { costForLevel, upkeepPerDay } from "../src/index.js";
import { World, makeContext } from "./helpers.js";

describe("buildings", () => {
  it("charges upkeep growing faster than the level", () => {
    const ctx = makeContext({ upkeepLevelGrowthBps: 2_000 });
    const farm = {
      id: "b1",
      playerId: "a",
      type: "farm",
      level: 3,
      job: null,
      investedValue: 0n,
      fastBatchesLeft: 0,
    };
    expect(upkeepPerDay(ctx, farm)).toBe((1_000n * 3n * 14n) / 10n); // × (1 + 2 × 20 %)
  });

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

  it("may ask fewer materials for a level, never fewer ducats", () => {
    const ctx = makeContext({ upgradeMaterialsBps: { "2": 5_000 } });
    // Farm: 300 ducats, 20 bricks and 20 planks; level 2 = 2 × base, materials halved.
    expect(costForLevel(ctx, "farm", 2)).toEqual({
      ducats: 60_000n,
      materials: { bricks: 20, planks: 20 },
    });
    // Level 3 is untouched: 3 × base.
    expect(costForLevel(ctx, "farm", 3)).toEqual({
      ducats: 90_000n,
      materials: { bricks: 60, planks: 60 },
    });
    // Without the setting, as before.
    expect(costForLevel(makeContext(), "farm", 2).materials).toEqual({ bricks: 40, planks: 40 });
  });
});
