import { describe, expect, it } from "vitest";
import {
  monthStart,
  nextSeasonBounds,
  seasonBounds,
  seasonMonthName,
} from "../src/game/calendar.js";

const DAY = 86_400_000;

describe("seasons on calendar months", () => {
  it("starts a month at midnight in Venice, summer or winter", () => {
    expect(new Date(monthStart(2026, 10)).toISOString()).toBe("2026-10-31T23:00:00.000Z");
    expect(new Date(monthStart(2026, 6)).toISOString()).toBe("2026-06-30T22:00:00.000Z");
    expect(new Date(monthStart(2026, 12)).toISOString()).toBe("2026-12-31T23:00:00.000Z");
  });

  it("runs a world opened mid-month to the end of the month", () => {
    const now = Date.parse("2026-10-05T10:00:00Z");
    const b = seasonBounds(now);
    expect(b.startsAt).toBe(now);
    expect(new Date(b.endsAt).toISOString()).toBe("2026-10-31T23:00:00.000Z");
  });

  it("gives a late-opened world the next month too", () => {
    const b = seasonBounds(Date.parse("2026-10-20T10:00:00Z"));
    expect(new Date(b.endsAt).toISOString()).toBe("2026-11-30T23:00:00.000Z");
    expect(b.endsAt - b.startsAt).toBeGreaterThan(14 * DAY);
  });

  it("chains whole months after the first season", () => {
    const next = nextSeasonBounds(Date.parse("2026-10-31T23:00:00Z"));
    expect(new Date(next.endsAt).toISOString()).toBe("2026-11-30T23:00:00.000Z");
    const feb = nextSeasonBounds(monthStart(2027, 1));
    expect((feb.endsAt - feb.startsAt) / DAY).toBe(28);
  });

  it("names a season after its month", () => {
    expect(seasonMonthName(Date.parse("2026-11-30T23:00:00Z"))).toBe("novembre 2026");
  });
});
