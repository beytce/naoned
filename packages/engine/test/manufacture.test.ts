import { describe, expect, it } from "vitest";
import { type WorldSettingsInput, qualityBps, workLevel } from "../src/index.js";
import { World, makeContext } from "./helpers.js";

const manufacture = {
  manufacture: { maxLevel: 7, qualityBpsPerLevel: 1_000, unlock: 0 },
  startingCapital: 10_000_000,
} as Partial<WorldSettingsInput>;

/** A merchant with a farm at level 5 (the fixture's last ordinary level), its ducats at hand. */
function world() {
  const w = new World(makeContext(manufacture));
  w.do({ type: "join", playerId: "a", region: "terraferma" });
  const farm = w.buildingsOf("a").find((b) => b.type === "farm");
  if (!farm) throw new Error("no farm");
  w.state = {
    ...w.state,
    buildings: { ...w.state.buildings, [farm.id]: { ...farm, level: 5 } },
  };
  w.give("a", "bricks", 2_000).give("a", "planks", 2_000);
  return { w, id: farm.id };
}
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "ok" : res.error);
const upgrade = (w: World, id: string) => w.try({ type: "upgrade", playerId: "a", buildingId: id });

describe("the manufactures, levels past the last", () => {
  it("ask to choose a path first, once, at the last ordinary level", () => {
    const { w, id } = world();
    expect(error(upgrade(w, id))).toBe("choose_path");
    w.do({ type: "choosePath", playerId: "a", buildingId: id, path: "volume" });
    expect(
      error(w.try({ type: "choosePath", playerId: "a", buildingId: id, path: "quality" })),
    ).toBe("path_chosen");
    const mill = w.buildingsOf("a").find((b) => b.type === "mill");
    expect(
      error(
        w.try({ type: "choosePath", playerId: "a", buildingId: mill?.id ?? "", path: "volume" }),
      ),
    ).toBe("not_ready");
  });

  it("grows the batches on the volume path, up to the manufacture's last level", () => {
    const { w, id } = world();
    w.do({ type: "choosePath", playerId: "a", buildingId: id, path: "volume" });
    w.do({ type: "upgrade", playerId: "a", buildingId: id });
    w.do({ type: "upgrade", playerId: "a", buildingId: id });
    const farm = w.state.buildings[id];
    expect(farm?.level).toBe(7);
    expect(workLevel(w.ctx, farm as never)).toBe(7);
    expect(error(upgrade(w, id))).toBe("max_level");
  });

  it("keeps the batches on the quality path, and the cities pay its goods more", () => {
    const { w, id } = world();
    w.do({ type: "choosePath", playerId: "a", buildingId: id, path: "quality" });
    w.do({ type: "upgrade", playerId: "a", buildingId: id });
    w.do({ type: "upgrade", playerId: "a", buildingId: id });
    const farm = w.state.buildings[id];
    expect(workLevel(w.ctx, farm as never)).toBe(5);
    // Two levels of quality on the wheat: +20 %.
    expect(qualityBps(w.ctx, w.state, "a", "wheat")).toBe(2_000);
    expect(qualityBps(w.ctx, w.state, "a", "bread")).toBe(0);
  });
});
