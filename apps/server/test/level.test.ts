import { describe, expect, it } from "vitest";
import { LEVEL_STEP, levelFor } from "../src/game/level.js";

describe("the permanent level", () => {
  it("starts at 1 and takes a step more for each level", () => {
    expect(levelFor(0)).toMatchObject({ level: 1, from: 0, to: LEVEL_STEP, progress: 0 });
    expect(levelFor(LEVEL_STEP - 1).level).toBe(1);
    expect(levelFor(LEVEL_STEP).level).toBe(2);
    // Level 3 at 1 + 2 steps, level 4 at 1 + 2 + 3 steps.
    expect(levelFor(3 * LEVEL_STEP).level).toBe(3);
    expect(levelFor(6 * LEVEL_STEP)).toMatchObject({ level: 4, from: 6 * LEVEL_STEP });
    expect(levelFor(4 * LEVEL_STEP).progress).toBeCloseTo(1 / 3);
  });
});
