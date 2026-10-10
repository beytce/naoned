import { describe, expect, it } from "vitest";
import { mergeDefaults } from "../src/game/world.js";

describe("world settings merge", () => {
  it("keeps stored values and adds missing ones, deeply", () => {
    const merged = mergeDefaults(
      { a: 1, b: { x: 1, y: 2 }, list: [1, 2], fresh: { z: 3 } },
      { a: 9, b: { x: 7 }, list: [5] },
    );
    expect(merged).toEqual({ a: 9, b: { x: 7, y: 2 }, list: [5], fresh: { z: 3 } });
  });
});
