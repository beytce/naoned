import { describe, expect, it } from "vitest";
import {
  applyBonusToQuantity,
  applyBpsCeil,
  applyBpsFloor,
  ceilDiv,
  ducats,
  floorDiv,
} from "../src/index.js";

describe("money", () => {
  it("converts ducats to deniers", () => {
    expect(ducats(1_000)).toBe(100_000n);
  });

  it("floors and ceils integer division, negatives included", () => {
    expect(floorDiv(7n, 2n)).toBe(3n);
    expect(floorDiv(-7n, 2n)).toBe(-4n);
    expect(ceilDiv(7n, 2n)).toBe(4n);
    expect(ceilDiv(-7n, 2n)).toBe(-3n);
    expect(ceilDiv(6n, 2n)).toBe(3n);
  });

  it("applies basis points with explicit rounding", () => {
    expect(applyBpsCeil(101n, 300)).toBe(4n); // 3.03 → 4: the tax leans towards the sink
    expect(applyBpsFloor(101n, 300)).toBe(3n);
    expect(applyBpsFloor(100n, 13_000)).toBe(130n);
  });

  it("never creates a fraction of a unit with a yield bonus", () => {
    expect(applyBonusToQuantity(20, 3_000)).toBe(26);
    expect(applyBonusToQuantity(7, 3_000)).toBe(9);
  });
});
