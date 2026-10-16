import { describe, expect, it } from "vitest";
import { marketMakerReference } from "../src/index.js";
import { DAY, HOUR, World, makeContext } from "./helpers.js";

/**
 * The Dogana's price follows supply and demand: what merchants bought from it more than they sold
 * it pushes its price up the next day, what they sold it more pushes it down, within bounds.
 */
type Drift = { stepBps: number; minBps: number; maxBps: number; revertBps?: number };
const ctx = (drift?: Drift) =>
  makeContext({
    marketMaker: {
      spreadStartBps: 400,
      spreadEndBps: 400,
      spreadRampDays: 1,
      referenceFloorBps: 5_000,
      dailyDepthPerPlayer: { wheat: 10 },
      ...(drift ? { drift } : {}),
    },
  });
const DRIFT = { stepBps: 1_000, minBps: 6_000, maxBps: 15_000 };

function world(drift: Drift | null = DRIFT) {
  const w = new World(ctx(drift ?? undefined));
  w.do({ type: "join", playerId: "a", region: "lagoon" });
  w.give("a", "wheat", 500).give("a", "bread", 50);
  w.at(HOUR).do({ type: "tick" });
  return w;
}
const trade = (w: World, side: "buy" | "sell", quantity: number) =>
  w.do({ type: "placeOrder", playerId: "a", resource: "wheat", side, kind: "instant", quantity });
const reference = (w: World) => marketMakerReference(w.ctx, w.state, "wheat", w.now);

describe("the Dogana's price", () => {
  it("rises after a day of more buying than selling, in proportion to its depth", () => {
    const w = world();
    expect(reference(w)).toBe(100n);
    trade(w, "buy", 5);
    w.at(DAY + HOUR).do({ type: "tick" });
    // Half the day's depth bought: half a step.
    expect(reference(w)).toBe(105n);
  });

  it("falls after a day of more selling, and stays put without trade", () => {
    const w = world();
    trade(w, "sell", 10);
    w.at(DAY + HOUR).do({ type: "tick" });
    expect(reference(w)).toBe(90n);
    w.at(2 * DAY + HOUR).do({ type: "tick" });
    expect(reference(w)).toBe(90n);
  });

  it("stays within its bounds", () => {
    const w = world();
    for (let day = 1; day <= 12; day++) {
      trade(w, "sell", 10);
      w.at(day * DAY + HOUR).do({ type: "tick" });
    }
    expect(reference(w)).toBe(60n);
  });

  it("is the reference without the setting", () => {
    const w = world(null);
    trade(w, "buy", 10);
    w.at(DAY + HOUR).do({ type: "tick" });
    expect(reference(w)).toBe(100n);
  });

  it("comes back part of the way to the reference every day", () => {
    const w = world({ ...DRIFT, revertBps: 5_000 });
    trade(w, "sell", 10);
    w.at(DAY + HOUR).do({ type: "tick" });
    expect(reference(w)).toBe(90n);
    w.at(2 * DAY + HOUR).do({ type: "tick" });
    expect(reference(w)).toBe(95n);
    // Steady selling holds it where the step and the way back balance: a step is half the gap.
    for (let day = 3; day <= 12; day++) {
      trade(w, "sell", 10);
      w.at(day * DAY + HOUR).do({ type: "tick" });
    }
    expect(reference(w)).toBe(80n);
  });
});
