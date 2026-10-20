import { describe, expect, it } from "vitest";
import { bestUpgrade, workshopEconomics } from "../src/index.js";
import { World } from "./helpers.js";

describe("a workshop's economics", () => {
  it("says what it earns an hour, what the next level adds and when it pays back", () => {
    const w = new World();
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    const farm = Object.values(w.state.buildings).find(
      (b) => b.playerId === "a" && b.type === "farm",
    );
    if (!farm) throw new Error("no farm");
    const e = workshopEconomics(w.ctx, w.state, "a", farm, w.now);
    expect(e.marginPerHour).toBeGreaterThan(0n);
    expect(e.next?.addedPerHour).toBeGreaterThan(0n);
    expect(e.next?.paybackMinutes).toBeGreaterThan(0);
    // A level up pays back faster on a workshop that earns more an hour.
    expect(e.next?.cost).toBeGreaterThan(0n);
  });

  it("points at the upgrade that pays back first", () => {
    const w = new World();
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    const best = bestUpgrade(w.ctx, w.state, "a", w.now);
    expect(best).not.toBeNull();
    const all = Object.values(w.state.buildings)
      .filter((b) => b.playerId === "a")
      .map(
        (b) =>
          workshopEconomics(w.ctx, w.state, "a", b, w.now).next?.paybackMinutes ??
          Number.POSITIVE_INFINITY,
      );
    expect(best?.paybackMinutes).toBe(Math.min(...all));
  });
});
