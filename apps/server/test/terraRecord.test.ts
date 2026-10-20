import { describe, expect, it } from "vitest";
import { newRatings } from "../src/game/terraRecord.js";

describe("the Terraferma's rating", () => {
  it("raises the winner, lowers the last, keeps the sum, more for an upset", () => {
    const even = newRatings([
      { id: "a", rank: 1, rating: 1000 },
      { id: "b", rank: 2, rating: 1000 },
      { id: "c", rank: 3, rating: 1000 },
    ]);
    expect(even.get("a")).toBeGreaterThan(1000);
    expect(even.get("b")).toBe(1000);
    expect(even.get("c")).toBeLessThan(1000);
    const upset = newRatings([
      { id: "weak", rank: 1, rating: 800 },
      { id: "strong", rank: 2, rating: 1200 },
    ]);
    expect((upset.get("weak") ?? 0) - 800).toBeGreaterThan((even.get("a") ?? 0) - 1000);
  });
});
