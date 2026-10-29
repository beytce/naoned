import { describe, expect, it } from "vitest";
import { cityStanding, outOfEight, palaceGap, playerKey } from "../src/game/politics.js";

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

  it("says the merchant's palace, or the profit that parts them from the 40th", () => {
    const rows = [
      { rank: 40, turnover: "500000" },
      { rank: 41, me: true, turnover: "376000" },
    ];
    expect(palaceGap(rows)).toEqual({ inside: false, rank: 41, gap: 124_000n });
    expect(palaceGap([{ rank: 12, me: true, turnover: "9" }])).toEqual({ inside: true, rank: 12 });
    expect(palaceGap([{ rank: 1, turnover: "9" }])).toBeNull();
  });

  it("reads a player's sheet key, its origin the ranking unless said", () => {
    expect(playerKey("player:a1:market")).toEqual({ id: "a1", origin: "market" });
    expect(playerKey("player:a1")).toEqual({ id: "a1", origin: "ranking" });
    expect(playerKey("player:a1:elsewhere")).toEqual({ id: "a1", origin: "ranking" });
    expect(playerKey("ranking")).toBeNull();
    expect(playerKey(null)).toBeNull();
  });
});
