import { describe, expect, it } from "vitest";
import { seasonCount, seasonText } from "../src/game/seasonCount.js";

// The first season: opened on 20 October 2026 at noon in Paris, to midnight on 1 December.
const world = {
  startsAt: Date.parse("2026-10-20T10:00:00Z"),
  endsAt: Date.parse("2026-11-30T23:00:00Z"),
};

describe("the season's day in the notices", () => {
  it("says one count of days, the day and those left agreeing", () => {
    expect(seasonCount(world, world.startsAt)).toEqual({ label: "Jour 1 sur 42", left: 42 });
    // The 22nd at 9:00 in Paris: day 3, 40 days left counting today.
    expect(seasonCount(world, Date.parse("2026-10-22T07:00:00Z"))).toEqual({
      label: "Jour 3 sur 42",
      left: 40,
    });
  });

  it("ends on its last day, then has none left", () => {
    expect(seasonCount(world, Date.parse("2026-11-30T22:00:00Z"))).toEqual({
      label: "Jour 42 sur 42",
      left: 1,
    });
    expect(seasonCount(world, world.endsAt).left).toBe(0);
  });
});

describe("the introduction's season", () => {
  it("says « un mois » for a season within its calendar month", () => {
    const november = { startsAt: Date.parse("2026-10-31T23:00:00Z"), endsAt: world.endsAt };
    expect(seasonText(november)).toMatch(/^Vos ateliers produisent/);
    expect(seasonText(november)).toMatch(/Chaque mois, tout le monde repart à zéro/);
  });

  it("says until when for a first season running past its month", () => {
    expect(seasonText(world)).toMatch(/^Cette saison dure jusqu.au 30 novembre,/);
  });
});
