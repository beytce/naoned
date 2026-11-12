import { describe, expect, it } from "vitest";
import { type PlancheSetup, plancheDaily, plancheDailyTry, plancheInit } from "../../src/index.js";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const T0 = Date.parse("2026-11-16T00:00:00Z");
const TODAY = Math.floor(T0 / DAY);

/** The fixture's board: two houses with their growth, the day's problems among three. */
function setup(): PlancheSetup {
  const house = (id: string) => ({ id, name: id, robot: false, x: 2, y: 2, makes: {} });
  return {
    width: 8,
    height: 8,
    sliceMs: HOUR,
    goods: { verre: "Verre" },
    houses: [house("ana"), house("ben")],
    cities: [],
    passages: [],
    daily: { problems: ["q1", "q2", "q3"], prestige: 20 },
    maison: {
      curve: 10,
      maxLevel: 6,
      titles: [{ from: 1, name: "Échoppe" }],
      unlocks: [{ level: 1, bobbins: 3, tiles: 5, tier: 1, towers: 1 }],
      weeklyCap: 100,
      catchUpBps: 5_000,
      commerce: { perDucats: 100, dailyCap: 10 },
      gains: {
        rival: 20,
        placeTop: 30,
        placeStep: 5,
        seal: 4,
        guardHours: 10,
        guardCap: 8,
        laurel: 50,
        doge: 80,
      },
    },
    rules: {
      bobbins: 3,
      store: 100,
      startStock: 0,
      startDucats: 0,
      threadPerHour: 10,
      patinaBpsPerDay: 0,
      patinaMaxBps: 0,
      tollMaxBps: 1_500,
      tollBurnBps: 3_000,
      freeAfterForceMs: DAY,
      rewindMsPerTile: 60_000,
    },
  };
}

// The problem of the day (docs/plan-hex-commerce.md H3): one position for the whole lagoon, one try.
describe("the problem of the day", () => {
  it("is drawn from the date, the same for all, and every problem comes before one comes back", () => {
    const S = setup();
    expect(plancheDaily(S, TODAY)).toBe(plancheDaily(S, TODAY));
    const three = [0, 1, 2].map((k) => plancheDaily(S, TODAY + k));
    expect(new Set(three).size).toBe(3);
    expect(plancheDaily(S, TODAY + 3)).toBe(plancheDaily(S, TODAY));
  });

  it("gives its Prestige and a knot to the house that solves it, once a day", () => {
    const S = setup();
    let s = plancheInit(S, T0);
    s = plancheDailyTry(S, s, "ana", T0 + HOUR, true, 2);
    expect(s.houses.ana?.maison?.week).toBe(20);
    expect(s.houses.ana?.maison?.knots).toBe(1);
    expect(s.daily?.[TODAY]?.ana).toEqual({ won: true, moves: 2 });
    expect(() => plancheDailyTry(S, s, "ana", T0 + 2 * HOUR, true, 2)).toThrow(
      "planche_daily_tried",
    );
    // Lost: nothing but the try.
    s = plancheDailyTry(S, s, "ben", T0 + 2 * HOUR, false, 3);
    expect(s.houses.ben?.maison?.week).toBe(0);
    expect(s.daily?.[TODAY]?.ben).toEqual({ won: false, moves: 3 });
    // The next day, a new try; the day before is kept for its results, older ones forgotten.
    s = plancheDailyTry(S, s, "ana", T0 + DAY + HOUR, true, 2);
    s = plancheDailyTry(S, s, "ana", T0 + 2 * DAY + HOUR, false, 2);
    expect(
      Object.keys(s.daily ?? {})
        .map(Number)
        .sort(),
    ).toEqual([TODAY + 1, TODAY + 2]);
    expect(s.houses.ana?.maison?.knots).toBe(2);
  });

  it("is not there on a board without it", () => {
    const { daily: _none, ...S } = setup();
    expect(plancheDaily(S, TODAY)).toBeUndefined();
    expect(() => plancheDailyTry(S, plancheInit(S, T0), "ana", T0, true, 2)).toThrow(
      "planche_unknown",
    );
  });
});
