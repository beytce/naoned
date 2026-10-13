import { describe, expect, it } from "vitest";
import {
  type WorldSettingsInput,
  actAt,
  deliveryOrdersFor,
  orderUnitPrice,
  seasonActs,
} from "../src/index.js";
import { campaignSettings, deliverySettings } from "./fixture.js";
import { DAY, HOUR, T0, World, makeContext } from "./helpers.js";

const WEEK = 7 * DAY;

const acts: WorldSettingsInput["acts"] = [
  { code: "installation", week: 0, variants: [] },
  {
    code: "crisis",
    week: 1,
    variants: [
      {
        code: "famine",
        weight: 1,
        city: "verona",
        cityPriceBps: { bread: 14_000 },
        cityCapacityBps: { bread: 20_000 },
        yieldBps: { wheat: 2_000 },
      },
    ],
  },
  { code: "lombardy", week: 2, variants: [], milanBps: 15_000 },
  {
    code: "fair",
    week: 3,
    variants: [
      {
        code: "sensa",
        weight: 1,
        cityPriceBps: { bread: 11_500 },
        cityCapacityBps: { bread: 15_000 },
        yieldBps: {},
      },
    ],
  },
];

// No weekly city projects.
const projects = { intervalDays: 7, durationDays: 7, needsPerPlayer: {}, premiumBps: 0 };

const ctx = (more: Partial<WorldSettingsInput> = {}) =>
  makeContext({ ...deliverySettings, ...campaignSettings, acts, projects, ...more });

function world(more: Partial<WorldSettingsInput> = {}) {
  const w = new World(ctx(more));
  w.at(9 * HOUR);
  for (const id of ["a", "b"]) {
    w.do({ type: "join", playerId: id, region: "terraferma" });
    w.give(id, "bricks", 500).give(id, "bread", 200);
  }
  return w;
}

describe("the season in acts", () => {
  it("follows the weeks, the last act running to the end of the season", () => {
    const c = ctx();
    expect(actAt(c, c.startAt + HOUR)?.code).toBe("installation");
    expect(actAt(c, c.startAt + WEEK + HOUR)?.code).toBe("crisis");
    const fair = actAt(c, c.startAt + 5 * WEEK);
    expect(fair?.code).toBe("fair");
    expect(fair?.startsAt).toBe(c.startAt + 3 * WEEK);
    expect(fair?.endsAt).toBe(c.startAt + 42 * DAY);
    expect(seasonActs(c).map((a) => [a.code, a.index])).toEqual([
      ["installation", 0],
      ["crisis", 1],
      ["lombardy", 2],
      ["fair", 3],
    ]);
    expect(actAt(c, c.startAt + WEEK)?.variant?.code).toBe("famine");
  });

  it("keeps every act in a short season (a world opened late), each one shortened", () => {
    const c = { ...ctx(), endAt: T0 + 20 * DAY };
    expect(seasonActs(c).map((a) => (a.startsAt - c.startAt) / DAY)).toEqual([0, 5, 10, 15]);
    expect(seasonActs(c).at(-1)?.endsAt).toBe(T0 + 20 * DAY);
  });

  it("the crisis pays its prices on the board, on top of the day's event", () => {
    const w = world({
      events: {
        everyDays: 1,
        durationHours: 24,
        catalog: [
          {
            code: "storm",
            weight: 1,
            cityPriceBps: { bread: 11_000 },
            cityCapacityBps: {},
            yieldBps: {},
          },
        ],
      },
    });
    const day = 8;
    const orders = deliveryOrdersFor(w.ctx, w.state, "a", day).filter(
      (o) => o.kind === "city" && o.resource === "bread",
    );
    expect(orders.length).toBeGreaterThan(0);
    for (const o of orders) {
      const base = orderUnitPrice(w.ctx, "terraferma", o.city, "bread");
      // Event and act multiply into one rate, rounded down once.
      const bps = o.city === "verona" ? Math.floor((11_000 * 14_000) / 10_000) : 11_000;
      expect(o.unitPrice).toBe((base * BigInt(bps)) / 10_000n);
    }
  });

  it("makes Milan stronger in the campaign during its act", () => {
    const w = world();
    w.do({ type: "tick" });
    // Fortress: 6 lances and 2 per active merchant.
    expect(w.state.campaign?.lands.rocca?.npc).toBe(10);
    // The third week opens the map again (one merchant still active), Milan half as strong again.
    w.at(2 * WEEK - DAY);
    w.do({ type: "collect", playerId: "a", buildingId: w.buildingsOf("a")[0]?.id ?? "" });
    w.at(2 * WEEK + HOUR).do({ type: "tick" });
    expect(w.state.campaign?.lands.rocca?.npc).toBe(12);
  });
});
