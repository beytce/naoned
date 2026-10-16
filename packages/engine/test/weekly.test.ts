import { describe, expect, it } from "vitest";
import { weekIndex, weeklyStandings } from "../src/index.js";
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
    // Upkeep is no sale: only the bread sale counts.
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
