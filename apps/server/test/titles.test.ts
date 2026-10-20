import { venice1450Settings } from "@comptoirs/engine";
import { describe, expect, it } from "vitest";
import { TITLES } from "../src/game/profile.js";

describe("the merchant titles", () => {
  it("open the luxury chains of Venice at their own thresholds", () => {
    const thresholds = new Set(TITLES.map((t) => BigInt(t.from) * 100n));
    const unlocks = Object.values(venice1450Settings.unlocks ?? {}).map((v) => BigInt(v));
    expect(unlocks.length).toBeGreaterThan(0);
    for (const at of unlocks) expect(thresholds.has(at)).toBe(true);
  });
});
