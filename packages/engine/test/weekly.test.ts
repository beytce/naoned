import { describe, expect, it } from "vitest";
import {
  type WorldContext,
  campaignWeekEnd,
  campaignWeekStart,
  parseSettings,
  seasonWeeks,
  weekIndex,
  weeklyStandings,
} from "../src/index.js";
import { testSettings, testTheme } from "./fixture.js";
import { DAY, HOUR, World } from "./helpers.js";

const WEEK = 7 * DAY;

describe("weekly ranking", () => {
  it("counts weeks from the start of the season", () => {
    const w = new World();
    expect(weekIndex(w.ctx, w.now)).toBe(0);
    expect(weekIndex(w.ctx, w.now + WEEK - 1)).toBe(0);
    expect(weekIndex(w.ctx, w.now + WEEK)).toBe(1);
  });

  it("starts a newcomer at a gain of zero", () => {
    const w = new World().at(2 * DAY);
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    expect(weeklyStandings(w.ctx, w.state, w.now)).toEqual([{ playerId: "a", gain: 0n }]);
  });

  it("measures the net sales in deniers since the start of the week", () => {
    const w = new World();
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    w.do({ type: "join", playerId: "b", region: "lagoon" });
    const cash = w.cash("a");
    w.advance(HOUR).give("a", "bread", 20);
    w.do({ type: "sellToCity", playerId: "a", city: "venezia", resource: "bread", quantity: 20 });
    const standings = weeklyStandings(w.ctx, w.state, w.now);
    expect(standings[0]?.playerId).toBe("a");
    expect(standings[0]?.gain).toBe(w.cash("a") - cash);
    expect(standings[0]?.gain).toBeGreaterThan(0n);
  });

  it("closes the week on the first tick after the boundary and starts afresh", () => {
    const w = new World();
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    w.do({ type: "join", playerId: "b", region: "lagoon" });
    w.do({ type: "tick" });
    w.advance(HOUR).give("b", "bread", 20);
    w.do({ type: "sellToCity", playerId: "b", city: "venezia", resource: "bread", quantity: 20 });
    w.at(WEEK + 60_000);
    const res = w.do({ type: "tick" });
    const closed = res.effects.events.find((e) => e.type === "week_closed");
    expect(closed?.data?.week).toBe(0);
    const standings = closed?.data?.standings as { playerId: string; gain: string }[];
    expect(standings.map((s) => s.playerId)).toEqual(["b", "a"]);
    // Only the bread sale counts.
    expect(BigInt(standings[0]?.gain ?? "0")).toBeGreaterThan(BigInt(standings[1]?.gain ?? "0"));
    expect(w.state.weekly?.week).toBe(1);
    expect(weeklyStandings(w.ctx, w.state, w.now).every((s) => s.gain === 0n)).toBe(true);
    // Only once per boundary.
    expect(w.do({ type: "tick" }).effects.events.some((e) => e.type === "week_closed")).toBe(false);
  });

  it("closes skipped weeks without inventing standings", () => {
    const w = new World();
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    w.do({ type: "tick" });
    w.at(3 * WEEK + HOUR);
    const closed = w.do({ type: "tick" }).effects.events.filter((e) => e.type === "week_closed");
    expect(closed.map((e) => e.data?.week)).toEqual([0]);
    expect(w.state.weekly?.week).toBe(3);
  });

  it("starts the week again for a player who restarts", () => {
    const w = new World();
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    w.advance(HOUR).give("a", "bread", 20);
    w.do({ type: "sellToCity", playerId: "a", city: "venezia", resource: "bread", quantity: 20 });
    w.do({ type: "resetPlayer", playerId: "a" });
    w.do({ type: "join", playerId: "a", region: "lagoon" });
    expect(weeklyStandings(w.ctx, w.state, w.now)).toEqual([{ playerId: "a", gain: 0n }]);
  });

  it("adopts states saved before the weekly ranking existed", () => {
    const w = new World();
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    const { weekly: _, ...old } = w.state;
    w.state = old;
    const res = w.do({ type: "tick" });
    expect(res.effects.events.some((e) => e.type === "week_closed")).toBe(false);
    expect(weeklyStandings(w.ctx, w.state, w.now)).toEqual([{ playerId: "a", gain: 0n }]);
  });
});

describe("weeks from Monday to Sunday (Paris)", () => {
  /** A calendar season, as the worlds have: from `start` to `end`, weeks on Mondays. */
  const season = (start: number, end: number): WorldContext => ({
    theme: testTheme,
    settings: parseSettings({ ...testSettings, weekStart: "monday" }),
    startAt: start,
    endAt: end,
  });
  // Midnight in Paris (UTC+2 in summer, UTC+1 in winter).
  const paris = (y: number, m: number, d: number, offset: number) =>
    Date.UTC(y, m - 1, d) - offset * HOUR;

  it("cut the month on Mondays at midnight, a short first piece joined to the next week", () => {
    // Thursday 1 October 2026 to Sunday 1 November: Mondays 5, 12, 19, 26 October.
    const ctx = season(paris(2026, 10, 1, 2), paris(2026, 11, 1, 1));
    // 1–4 October is four days: a week of its own.
    expect(seasonWeeks(ctx)).toBe(5);
    expect(campaignWeekStart(ctx, 1)).toBe(paris(2026, 10, 5, 2));
    expect(campaignWeekStart(ctx, 4)).toBe(paris(2026, 10, 26, 1));
    expect(campaignWeekEnd(ctx, 4)).toBe(paris(2026, 11, 1, 1));
    expect(weekIndex(ctx, paris(2026, 10, 5, 2) - 1)).toBe(0);
    expect(weekIndex(ctx, paris(2026, 10, 5, 2))).toBe(1);
    // Sunday 1 to Monday 30 November: the lone Sunday joins the first week.
    const nov = season(paris(2026, 11, 1, 1), paris(2026, 12, 1, 1));
    expect(campaignWeekStart(nov, 0)).toBe(paris(2026, 11, 1, 1));
    expect(campaignWeekEnd(nov, 0)).toBe(paris(2026, 11, 9, 1));
    // And the lone Monday 30 November joins the last week.
    const last = seasonWeeks(nov) - 1;
    expect(campaignWeekStart(nov, last)).toBe(paris(2026, 11, 23, 1));
    expect(campaignWeekEnd(nov, last)).toBe(paris(2026, 12, 1, 1));
  });
});
