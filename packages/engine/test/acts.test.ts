import { describe, expect, it } from "vitest";
import {
  type WorldSettingsInput,
  actAt,
  deliveryOrdersFor,
  orderUnitPrice,
  seasonActs,
} from "../src/index.js";
import { deliverySettings } from "./fixture.js";
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
  {
    code: "worksite",
    week: 2,
    variants: [],
    worksite: {
      city: "venezia",
      needsPerPlayer: { bricks: 50 },
      premiumBps: 1_500,
      influencePerUnit: 1,
      winnerInfluence: 100,
    },
  },
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

const families: WorldSettingsInput["families"] = {
  openDay: 0,
  ordersPerDay: 1,
  powerPremiumBps: 0,
  orderInfluence: 10,
  patronageUnit: 100,
  patronageMaxPerDay: 10,
  weeklyCapPerMember: 1_000,
  minMembers: 1,
  houses: [
    { code: "contarini", quantities: { bricks: 10 } },
    { code: "morosini", quantities: { bread: 10 } },
  ],
};

// Only the act's worksite: no weekly city projects.
const projects = { intervalDays: 7, durationDays: 7, needsPerPlayer: {}, premiumBps: 0 };

const ctx = (more: Partial<WorldSettingsInput> = {}) =>
  makeContext({ ...deliverySettings, acts, families, projects, ...more });

function world(more: Partial<WorldSettingsInput> = {}) {
  const w = new World(ctx(more));
  w.at(9 * HOUR);
  for (const id of ["a", "b"]) {
    w.do({ type: "join", playerId: id, region: "terraferma" });
    w.give(id, "bricks", 500).give(id, "bread", 200);
  }
  w.do({ type: "joinFamily", playerId: "a", family: "contarini" });
  w.do({ type: "joinFamily", playerId: "b", family: "morosini" });
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
      ["worksite", 2],
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

  it("opens the great worksite in its act only, for the families to compete", () => {
    const w = world();
    w.at(WEEK + 10 * HOUR).do({ type: "tick" });
    expect(Object.keys(w.state.projects)).toHaveLength(0);
    // Both merchants play in the third week: needs follow the active players.
    w.at(2 * WEEK + 9 * HOUR);
    for (const id of ["a", "b"]) {
      w.do({ type: "collect", playerId: id, buildingId: w.buildingsOf(id)[0]?.id ?? "" });
    }
    w.at(2 * WEEK + 10 * HOUR).do({ type: "tick" });
    const [project] = Object.values(w.state.projects);
    expect(project?.city).toBe("venezia");
    expect(project?.needs.bricks).toBe(100);
    expect(project?.deadline).toBe(w.ctx.startAt + 3 * WEEK);
    const id = project?.id ?? "";
    const cash = w.cash("a");
    w.do({
      type: "deliverToProject",
      playerId: "a",
      projectId: id,
      resource: "bricks",
      quantity: 30,
    });
    w.do({
      type: "deliverToProject",
      playerId: "b",
      projectId: id,
      resource: "bricks",
      quantity: 10,
    });
    // Paid at the reference (220) plus 15 %.
    expect(w.cash("a") - cash).toBe(30n * 253n);
    expect(w.state.projects[id]?.byFamily).toEqual({ contarini: 30, morosini: 10 });
    expect(w.state.families?.seasonInfluence.a).toBe(30);
    // At the close of the act, the family that delivered most wins: influence for its members.
    w.at(3 * WEEK + HOUR).do({ type: "tick" });
    expect(w.state.projects[id]?.winner).toBe("contarini");
    expect(w.state.families?.seasonInfluence.a).toBe(130);
    expect(w.state.families?.seasonInfluence.b).toBe(10);
    // No second worksite in the next act.
    w.at(4 * WEEK).do({ type: "tick" });
    expect(Object.keys(w.state.projects)).toHaveLength(1);
  });
});
