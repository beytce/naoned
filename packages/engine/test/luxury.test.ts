import { describe, expect, it } from "vitest";
import {
  type WorldContext,
  deliveryOrdersFor,
  isUnlocked,
  lockedGood,
  parseSettings,
} from "../src/index.js";
import { deliverySettings, testSettings, testTheme } from "./fixture.js";
import { HOUR, T0, World } from "./helpers.js";

/** The fixture with a glassworks unlocked at 1 000 ducats of net sales, ordered by the cities. */
function ctx(): WorldContext {
  const settings = { ...testSettings, ...deliverySettings };
  const cities = settings.cities as Record<string, Record<string, unknown>>;
  return {
    theme: {
      ...testTheme,
      resources: [
        ...testTheme.resources,
        { code: "mirrors", name: "Miroirs", chain: "glass", tier: "finished" },
      ],
      buildings: [...testTheme.buildings, { type: "glassworks", name: "Verrerie" }],
      recipes: [
        ...testTheme.recipes,
        {
          code: "silver_mirrors",
          building: "glassworks",
          inputs: { wood: 4 },
          outputs: { mirrors: 1 },
          durationMinutes: 60,
        },
      ],
    },
    settings: parseSettings({
      ...settings,
      unlocks: { glassworks: 100_000 },
      buildings: { ...settings.buildings, glassworks: { costDucats: 1_000, costMaterials: {} } },
      referencePrices: { ...settings.referencePrices, mirrors: 1_000 },
      cities: Object.fromEntries(
        Object.entries(cities).map(([c, d]) => [
          c,
          { ...d, mirrors: { basePrice: 1_200, dailyCapacityPerPlayer: 5, maxDropBps: 5_000 } },
        ]),
      ),
      deliveries: {
        ...(settings.deliveries as object),
        quantity: { ...(settings.deliveries as { quantity: object }).quantity, mirrors: [1, 2] },
        weights: { mirrors: 50 },
      },
    } as never),
    startAt: T0,
  };
}

describe("the luxury chains", () => {
  it("unlocks a workshop at the net sales set for it, like a merchant title", () => {
    const w = new World(ctx());
    w.at(9 * HOUR);
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    expect(isUnlocked(w.ctx, w.state, "a", "glassworks")).toBe(false);
    expect(isUnlocked(w.ctx, w.state, "a", "farm")).toBe(true);
    const res = w.try({ type: "build", playerId: "a", buildingType: "glassworks" });
    expect(res.ok ? "ok" : res.error).toBe("locked");
    w.state = { ...w.state, turnover: { a: 100_000n } };
    expect(isUnlocked(w.ctx, w.state, "a", "glassworks")).toBe(true);
    w.do({ type: "build", playerId: "a", buildingType: "glassworks" });
  });

  it("asks its goods only of the merchants who make them", () => {
    const w = new World(ctx());
    w.at(9 * HOUR);
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    w.do({ type: "join", playerId: "b", region: "terraferma" });
    expect(lockedGood(w.ctx, "mirrors")).toBe(true);
    expect(lockedGood(w.ctx, "bread")).toBe(false);
    w.state = { ...w.state, turnover: { a: 100_000n } };
    w.do({ type: "build", playerId: "a", buildingType: "glassworks" });
    w.do({ type: "tick" });
    const asked = (id: string) =>
      deliveryOrdersFor(w.ctx, w.state, id, 0).some((o) => o.resource === "mirrors");
    expect(asked("a")).toBe(true);
    expect(asked("b")).toBe(false);
  });
});
