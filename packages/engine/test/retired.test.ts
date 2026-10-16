import { describe, expect, it } from "vitest";
import { World } from "./helpers.js";

/** Saves of the time of the sea and the bandits are settled at the next tick, then forgotten. */
describe("the sea and the bandits, removed", () => {
  function legacyWorld() {
    const w = new World();
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    w.do({ type: "join", playerId: "b", region: "lagoon" });
    w.state = {
      ...w.state,
      ships: { s1: { playerId: "a", investedValue: 5_000n } },
      expeditions: {
        e1: { playerId: "a", cargo: { wheat: 10 }, outcome: "pending" },
        e2: { playerId: "a", cargo: { wheat: 99 }, outcome: "returned" },
      },
      raids: { r1: { playerId: "b", booty: { silk: 2 }, outcome: "cruising" } },
      bands: {
        b1: { playerId: "b", booty: { bread: 4 }, collected: false },
        b2: { playerId: null, booty: { bread: 7 }, collected: false },
      },
      infamy: { b: 2 },
    };
    return w;
  }

  it("pays ships back at cost and gives back the goods at sea or in a booty", () => {
    const w = legacyWorld();
    const cash = w.cash("a");
    const wheat = w.stock("a", "wheat").available;
    const bread = w.stock("b", "bread").available;
    const res = w.do({ type: "tick" });
    expect(w.cash("a")).toBe(cash + 5_000n);
    expect(res.effects.ledger.filter((e) => e.reason === "sea_closed")).toHaveLength(1);
    // The convoy under way comes home; the one already back had been unloaded.
    expect(w.stock("a", "wheat").available).toBe(wheat + 10);
    expect(w.stock("b", "silk").available).toBe(2);
    // The band of a merchant gives its booty to its bandit; the computer's is lost.
    expect(w.stock("b", "bread").available).toBe(bread + 4);
    expect(
      res.effects.events.filter((e) => e.type === "sea_closed").map((e) => e.playerId),
    ).toEqual(["a", "b"]);
  });

  it("forgets them afterwards", () => {
    const w = legacyWorld();
    w.do({ type: "tick" });
    for (const key of ["ships", "expeditions", "raids", "bands", "infamy"] as const) {
      expect(w.state[key]).toBeUndefined();
    }
    const again = w.do({ type: "tick" });
    expect(again.effects.events.some((e) => e.type === "sea_closed")).toBe(false);
  });
});
