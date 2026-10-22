import { describe, expect, it } from "vitest";
import { monthStart, seasonDays } from "../src/clock.js";

const at = (iso: string) => Date.parse(iso);

/** A season of whole calendar months: from the 1st of `month` to the 1st of the next. */
function month(year: number, m: number) {
  return { startsAt: monthStart(year, m), endsAt: monthStart(year, m + 1) };
}

describe("seasonDays: the season's days on Paris's calendar", () => {
  it("counts a calendar month's days, 31, 30, 28 or 29", () => {
    for (const [y, m, n] of [
      [2026, 11, 31],
      [2026, 10, 30],
      [2027, 1, 28],
      [2028, 1, 29],
    ] as const) {
      const s = month(y, m);
      expect(seasonDays(s.startsAt, s.endsAt, s.startsAt)).toEqual({ day: 1, total: n, left: n });
      expect(seasonDays(s.startsAt, s.endsAt, s.endsAt - 60_000)).toEqual({
        day: n,
        total: n,
        left: 1,
      });
    }
  });

  it("counts the first season opened on 20 October to the end of November: 42 days", () => {
    const startsAt = at("2026-10-20T10:00:00Z");
    const endsAt = monthStart(2026, 11);
    expect(seasonDays(startsAt, endsAt, startsAt)).toEqual({ day: 1, total: 42, left: 42 });
    // 00:30 in Paris on the 21st, still the 20th in London: day 2.
    expect(seasonDays(startsAt, endsAt, at("2026-10-20T22:30:00Z")).day).toBe(2);
  });

  it("turns the day at midnight in Paris across the change to winter time (25 October)", () => {
    const startsAt = at("2026-10-20T10:00:00Z");
    const endsAt = monthStart(2026, 11);
    // 23:30 on the 25th, winter time (UTC+1): still day 6.
    expect(seasonDays(startsAt, endsAt, at("2026-10-25T22:30:00Z")).day).toBe(6);
    // 00:30 on the 26th: day 7.
    expect(seasonDays(startsAt, endsAt, at("2026-10-25T23:30:00Z")).day).toBe(7);
  });

  it("ends on its last day at 23:59", () => {
    const startsAt = at("2026-10-20T10:00:00Z");
    const endsAt = monthStart(2026, 11);
    expect(seasonDays(startsAt, endsAt, at("2026-11-30T22:59:00Z"))).toEqual({
      day: 42,
      total: 42,
      left: 1,
    });
  });

  it("stays within its bounds, before its start and after its end", () => {
    const s = month(2026, 10);
    expect(seasonDays(s.startsAt, s.endsAt, s.startsAt - 5 * 86_400_000).day).toBe(1);
    expect(seasonDays(s.startsAt, s.endsAt, s.endsAt + 5 * 86_400_000)).toEqual({
      day: 30,
      total: 30,
      left: 1,
    });
  });

  it("keeps day + left - 1 = total every hour of a season", () => {
    const startsAt = at("2026-10-20T10:00:00Z");
    const endsAt = monthStart(2026, 11);
    for (let t = startsAt; t < endsAt; t += 3_600_000) {
      const { day, total, left } = seasonDays(startsAt, endsAt, t);
      expect(day + left - 1).toBe(total);
      expect(day).toBeGreaterThanOrEqual(1);
      expect(day).toBeLessThanOrEqual(total);
    }
  });
});
