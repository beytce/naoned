import { describe, expect, it } from "vitest";
import { change, topMove } from "../src/game/market.js";

describe("the market's moves", () => {
  it("says the change over the visible history, in percent", () => {
    expect(change([100, 104])).toBeCloseTo(4);
    expect(change([100])).toBe(0);
    expect(change([])).toBe(0);
  });

  it("finds the good that moved the most, up or down", () => {
    const move = topMove({ wheat: [100, 104], bricks: [100, 91], wood: [50, 50] });
    expect(move).toEqual({ resource: "bricks", change: -9 });
    expect(topMove({ wood: [50, 50] })).toBeNull();
  });
});
