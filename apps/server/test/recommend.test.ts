import { describe, expect, it } from "vitest";
import { recommendedRegion } from "../src/game/recommend.js";

describe("the trade recommended this month", () => {
  it("is the least peopled region, past 20 % behind the most, with ten people at least", () => {
    expect(recommendedRegion({ terraferma: 6, lagoon: 5, dolomites: 3 })).toBe("dolomites");
    // Under ten people: none, the world is too small to read.
    expect(recommendedRegion({ terraferma: 5, lagoon: 3, dolomites: 1 })).toBeNull();
  });

  it("is none within 20 %", () => {
    // 5 against 4: 20 % exactly, not past it.
    expect(recommendedRegion({ terraferma: 5, lagoon: 4, dolomites: 5 })).toBeNull();
    expect(recommendedRegion({ terraferma: 5, lagoon: 3, dolomites: 5 })).toBe("lagoon");
  });
});
