import { describe, expect, it } from "vitest";
import { cityStanding, outOfEight } from "../src/game/politics.js";

describe("politics in figures", () => {
  it("says a source's reliability out of eight", () => {
    expect(outOfEight(8_500)).toBe(7);
    expect(outOfEight(4_000)).toBe(3);
    expect(outOfEight(10_000)).toBe(8);
    expect(outOfEight(0)).toBe(0);
  });

  it("gives the merchant's share of a city's gauge, the leader's and their rank", () => {
    const line = {
      mine: 22,
      total: 100,
      top: [
        { me: false, points: 40 },
        { me: true, points: 22 },
      ],
    };
    expect(cityStanding(line)).toEqual({ mine: 22, lead: 40, rank: 2 });
    expect(cityStanding({ mine: 0, total: 0, top: [] })).toEqual({ mine: 0, lead: 0, rank: null });
  });
});
