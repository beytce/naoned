import { describe, expect, it } from "vitest";
import { type EmpireSettingsInput, empireView } from "../../src/index.js";
import { HOUR, MIN, World, makeContext } from "../helpers.js";
import { ordersEmpire } from "./ordersFixture.js";

// The two first hours (docs/plan-publication.md, lot 2): a town never burns its turn while the
// house makes nothing it could ask for, and a new house is asked often while it learns.
const view = (w: World) => empireView(w.ctx, w.state, "a", w.now);
const count = (w: World, code: string) =>
  view(w)?.orders.find((x) => x.city === code)?.orders.length ?? 0;
const settle = (w: World) => w.do({ type: "empireSettle", playerId: "a" });

function world(over: Partial<EmpireSettingsInput> = {}) {
  const w = new World(makeContext({ empire: { ...ordersEmpire, ...over } }));
  w.do({ type: "empireJoin", playerId: "a" });
  return w;
}

describe("a town's turn while the house makes nothing", () => {
  it("is not burnt: the first order comes as soon as there is a good to ask for", () => {
    const w = world({ start: { ...ordersEmpire.start, workshops: [] } });
    expect(count(w, "venezia")).toBe(0);
    // Hours without a workshop, read and settled now and then.
    for (let i = 0; i < 6; i++) {
      w.advance(30 * MIN);
      settle(w);
    }
    expect(count(w, "venezia")).toBe(0);
    w.do({
      type: "empireBuildWorkshop",
      playerId: "a",
      workshopType: "farm",
      recipe: "grow_wheat",
    });
    w.advance(10 * MIN);
    settle(w);
    // Not an interval later (an hour in Venice): at once.
    expect(count(w, "venezia")).toBeGreaterThanOrEqual(1);
  });
});

describe("the orders of a house that learns", () => {
  const learning = { ...ordersEmpire.orders, learning: { hours: 2, everyMinutes: 15 } };

  it("come every quarter of an hour for its first two hours, up to the cap", () => {
    const w = world({ orders: learning as EmpireSettingsInput["orders"] });
    const first = count(w, "venezia");
    w.advance(16 * MIN);
    expect(count(w, "venezia")).toBe(Math.min(4, first + 1));
    w.advance(15 * MIN);
    expect(count(w, "venezia")).toBe(Math.min(4, first + 2));
  });

  it("take the town's own pace after the two hours", () => {
    const w = world({ orders: learning as EmpireSettingsInput["orders"] });
    w.advance(48 * HOUR);
    // Delivered or not, a full town stays full; empty it and watch the pace.
    const h = w.state.empire?.houses.a;
    if (!h?.orders?.venezia) throw new Error("no orders");
    const before = count(w, "venezia");
    expect(before).toBe(4);
    const kept = h.orders.venezia;
    w.state = {
      ...w.state,
      empire: {
        ...(w.state.empire as NonNullable<typeof w.state.empire>),
        houses: {
          ...w.state.empire?.houses,
          a: { ...h, orders: { ...h.orders, venezia: { ...kept, list: [], next: w.now } } },
        },
      },
    };
    expect(count(w, "venezia")).toBe(1);
    w.advance(20 * MIN);
    // An hour in Venice on the fixture: no second order a quarter of an hour later.
    expect(count(w, "venezia")).toBe(1);
  });
});
