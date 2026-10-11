import { describe, expect, it } from "vitest";
import { seasonEnd, seasonWeeks, weekIndex } from "../src/index.js";
import { DAY, HOUR, T0, World, makeContext } from "./helpers.js";

const WEEK = 7 * DAY;

/** A season that runs for a calendar month of 30 days. */
function month(days = 30) {
  return new World({ ...makeContext(), endAt: T0 + days * DAY });
}

describe("a season of a calendar month", () => {
  it("ends when the world says, or after the nominal number of days", () => {
    expect(seasonEnd(makeContext())).toBe(T0 + 42 * DAY);
    expect(seasonEnd({ ...makeContext(), endAt: T0 + 31 * DAY })).toBe(T0 + 31 * DAY);
  });

  it("refuses play once the month is over", () => {
    const w = month();
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    w.at(30 * DAY);
    const res = w.try({
      type: "sellToCity",
      playerId: "a",
      city: "venezia",
      resource: "bread",
      quantity: 1,
    });
    expect(res.ok ? "" : res.error).toBe("season_over");
  });

  it("counts whole weeks; the last one runs to the end of the month", () => {
    const w = month();
    expect(seasonWeeks(w.ctx)).toBe(4);
    expect(weekIndex(w.ctx, T0 + 3 * WEEK)).toBe(3);
    expect(weekIndex(w.ctx, T0 + 29 * DAY)).toBe(3);
    // A short first season (a world opened mid-month) still has one week.
    expect(seasonWeeks({ ...makeContext(), endAt: T0 + 5 * DAY })).toBe(1);
  });

  it("closes the last week when the season ends, once", () => {
    const w = month();
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    w.do({ type: "tick" });
    w.at(29 * DAY);
    w.do({ type: "tick" });
    expect(w.state.weekly?.week).toBe(3);
    w.at(30 * DAY + HOUR);
    const closed = w.do({ type: "tick" }).effects.events.filter((e) => e.type === "week_closed");
    expect(closed.map((e) => e.data?.week)).toEqual([3]);
    expect(w.do({ type: "tick" }).effects.events.some((e) => e.type === "week_closed")).toBe(false);
  });

  it("gives the last city project the end of the month instead of opening a stub", () => {
    const w = month();
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    w.at(29 * DAY);
    w.do({ type: "tick" });
    const projects = Object.values(w.state.projects).sort((a, b) => a.openedAt - b.openedAt);
    expect(projects.map((p) => (p.openedAt - T0) / DAY)).toEqual([0, 7, 14, 21]);
    expect(projects.at(-1)?.deadline).toBe(T0 + 30 * DAY);
  });
});

describe("the end of a season", () => {
  it("publishes the final ranking by net worth, once, on the first tick after the end", () => {
    const w = month();
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    w.do({ type: "join", playerId: "b", region: "lagoon" });
    w.advance(HOUR).give("b", "bread", 20);
    w.do({ type: "sellToCity", playerId: "b", city: "venezia", resource: "bread", quantity: 20 });
    w.at(29 * DAY);
    expect(w.do({ type: "tick" }).effects.events.some((e) => e.type === "season_closed")).toBe(
      false,
    );
    w.at(30 * DAY + HOUR);
    const closed = w.do({ type: "tick" }).effects.events.find((e) => e.type === "season_closed");
    const standings = closed?.data?.standings as { playerId: string; worth: string }[];
    expect(standings.map((s) => s.playerId)).toEqual(["b", "a"]);
    expect(BigInt(standings[0]?.worth ?? "0")).toBeGreaterThan(BigInt(standings[1]?.worth ?? "0"));
    expect(w.state.seasonClosed).toBe(true);
    expect(w.do({ type: "tick" }).effects.events.some((e) => e.type === "season_closed")).toBe(
      false,
    );
  });
});
