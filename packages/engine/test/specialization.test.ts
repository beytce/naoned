import { describe, expect, it } from "vitest";
import { HOUR, World, makeContext } from "./helpers.js";

const local = {
  buildingRegions: {
    farm: ["terraferma"],
    clay_pit: ["lagoon"],
    lumber_camp: ["dolomites"],
  },
};

function rich(w: World, id: string) {
  w.give(id, "bricks", 500).give(id, "planks", 500);
}

describe("raw materials are local", () => {
  it("lets a region extract only its own raw material", () => {
    const w = new World(makeContext(local));
    w.do({ type: "join", playerId: "a", region: "lagoon" });
    rich(w, "a");
    const farm = w.try({ type: "build", playerId: "a", buildingType: "farm" });
    expect(farm.ok).toBe(false);
    if (!farm.ok) expect(farm.error).toBe("wrong_region");
    expect(w.try({ type: "build", playerId: "a", buildingType: "clay_pit" }).ok).toBe(true);
    // Workshops that transform go anywhere.
    expect(w.try({ type: "build", playerId: "a", buildingType: "mill" }).ok).toBe(true);
  });

  it("keeps an extractor built before the rule, without further upgrades", () => {
    const before = new World(makeContext());
    before.do({ type: "join", playerId: "a", region: "lagoon" });
    rich(before, "a");
    before.do({ type: "build", playerId: "a", buildingType: "farm" });
    const after = new World(makeContext(local));
    after.state = before.state;
    after.totals = before.totals;
    const farm = after.buildingsOf("a").find((b) => b.type === "farm");
    const up = after.try({ type: "upgrade", playerId: "a", buildingId: farm?.id ?? "" });
    expect(up.ok).toBe(false);
    if (!up.ok) expect(up.error).toBe("wrong_region");
    // It still produces.
    expect(
      after.try({
        type: "startProduction",
        playerId: "a",
        buildingId: farm?.id ?? "",
        recipe: "grow_wheat",
        batches: 1,
      }).ok,
    ).toBe(true);
  });
});

describe("specialisation pays", () => {
  it("adds a yield bonus for each level above the first", () => {
    const w = new World(makeContext({ levelYieldBonusBps: 2_500 }));
    w.do({ type: "join", playerId: "a", region: "lagoon" });
    rich(w, "a");
    w.do({ type: "build", playerId: "a", buildingType: "farm" });
    const farm = w.buildingsOf("a").find((b) => b.type === "farm");
    w.do({ type: "upgrade", playerId: "a", buildingId: farm?.id ?? "" });
    w.do({
      type: "startProduction",
      playerId: "a",
      buildingId: farm?.id ?? "",
      recipe: "grow_wheat",
      batches: 1,
    });
    w.advance(HOUR);
    w.do({ type: "collect", playerId: "a", buildingId: farm?.id ?? "" });
    // 20 per batch × level 2 × (1 + 25 %).
    expect(w.stock("a", "wheat").available).toBe(50);
  });
});
