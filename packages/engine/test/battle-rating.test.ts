import { describe, expect, it } from "vitest";
import { battleBand, battleRatings } from "../src/index.js";

// The Battle's cote (lot T6b, B3): an Elo of many, each player against each other by their ranks
// at the end; the computer's houses at a fixed cote, never moved.
const rating = { start: 1_000, k: 32, band: 300, botRating: 1_000 };

describe("the Battle's cote", () => {
  it("gives to those ranked above their expectation, takes from those below", () => {
    const after = battleRatings(
      [
        { id: "a", rating: 1_000 },
        { id: "b", rating: 1_000 },
        { id: "c", rating: 1_000 },
      ],
      rating,
    );
    expect(after.a).toBeGreaterThan(1_000);
    expect(after.c).toBeLessThan(1_000);
    expect(after.b).toBe(1_000);
  });

  it("moves little a strong player who wins, much a weak one who wins", () => {
    const strong = battleRatings(
      [
        { id: "s", rating: 1_400 },
        { id: "w", rating: 1_000 },
      ],
      rating,
    );
    const upset = battleRatings(
      [
        { id: "w", rating: 1_000 },
        { id: "s", rating: 1_400 },
      ],
      rating,
    );
    expect((strong.s ?? 0) - 1_400).toBeLessThan((upset.w ?? 0) - 1_000);
  });

  it("never moves the computer's houses, whose cote is fixed", () => {
    const after = battleRatings(
      [
        { id: "a", rating: 1_000 },
        { id: "bot:1", rating: 1_000 },
      ],
      rating,
    );
    expect(after["bot:1"]).toBeUndefined();
    expect(after.a).toBe(1_016);
  });

  it("gives whole numbers, the room's total kept between people", () => {
    const after = battleRatings(
      [
        { id: "a", rating: 1_100 },
        { id: "b", rating: 990 },
        { id: "c", rating: 1_234 },
        { id: "d", rating: 870 },
      ],
      rating,
    );
    for (const v of Object.values(after)) expect(Number.isInteger(v)).toBe(true);
    const sum = Object.values(after).reduce((s, v) => s + v, 0);
    expect(Math.abs(sum - (1_100 + 990 + 1_234 + 870))).toBeLessThanOrEqual(2);
  });

  it("sorts players into bands of cote, for the lobbies", () => {
    expect(battleBand(rating, 1_000)).toBe(3);
    expect(battleBand(rating, 1_299)).toBe(4);
    expect(battleBand(rating, 0)).toBe(0);
  });
});
