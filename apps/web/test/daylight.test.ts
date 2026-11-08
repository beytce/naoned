import { describe, expect, it } from "vitest";
import { daylight } from "../src/porcellana/arrival.js";

// Day and night at the player's hour (P3-05 of the players' audit).
describe("the light of the hour", () => {
  it("is full by day, soft at night, and rises and falls in between", () => {
    expect(daylight(12)).toBe(1);
    expect(daylight(2)).toBe(0.35);
    expect(daylight(23)).toBe(0.35);
    expect(daylight(7)).toBeGreaterThan(0.35);
    expect(daylight(7)).toBeLessThan(1);
    expect(daylight(20)).toBeGreaterThan(daylight(20.9));
    expect(daylight(6)).toBe(0.35);
    expect(daylight(8)).toBe(1);
  });
});
