import { describe, expect, it } from "vitest";
import {
  type EmpireSettingsInput,
  cashAccount,
  empireHouseAt,
  empireQuotes,
} from "../../src/index.js";
import { testEmpire } from "../fixture.js";
import { DAY, HOUR, World, makeContext, openLombardy } from "../helpers.js";

// Lombardy here makes flour (at 500) and asks bread (at 1 500), 30 units of private book a level.
const empire: EmpireSettingsInput = {
  ...testEmpire,
  casa: testEmpire.casa.map((c) => ({ ...c, materials: {}, buildMinutes: 0, costDucats: 0 })),
  start: { capitalDucats: 100_000, workshops: [{ type: "farm", recipe: "grow_wheat" }] },
  counters: { maxLevel: 10, bookStepBps: 5_000, costTimes: 4 },
  regions: (testEmpire.regions ?? []).map((r) =>
    r.code === "lombardia"
      ? { ...r, produces: { flour: 500 }, demands: { bread: 1_500 }, localOrdersPerCounter: 30 }
      : r,
  ),
  markets: {
    depthBase: 10,
    depthPerHouse: 5,
    boardPerHouse: 0,
    smallShareBps: 0,
    smallCasa: 20,
    orderPremiumBps: 0,
    taxBps: 0,
  },
};

function world() {
  const w = new World(makeContext({ empire }));
  for (const id of ["a", "b"]) {
    w.do({ type: "empireJoin", playerId: id, favour: 50 });
    for (let i = 1; i < 4; i++) w.do({ type: "empireBuildCasa", playerId: id });
  }
  openLombardy(w);
  w.do({
    type: "empireBuildWorkshop",
    playerId: "a",
    workshopType: "mill",
    recipe: "mill_flour",
    region: "lombardia",
  });
  w.advance(HOUR);
  return w;
}

const cash = (w: World) => w.state.accounts[cashAccount("a")] ?? 0n;
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "" : res.error);

describe("a market for each region", () => {
  it("sells a good where the house makes it, and in Venice", () => {
    const w = world();
    w.giveIn("a", "lombardia", "flour", 5);
    const before = cash(w);
    w.do({ type: "empireSell", playerId: "a", good: "flour", qty: 5, region: "lombardia" });
    expect(cash(w) > before).toBe(true);
  });

  it("refuses a good the house does not make there: a voyage carries it", () => {
    const w = world();
    w.give("a", "bread", 5);
    expect(
      error(
        w.try({ type: "empireDeliver", playerId: "a", good: "bread", qty: 5, region: "lombardia" }),
      ),
    ).toBe("not_here");
  });

  it("refuses a region where the house has no counter", () => {
    const w = world();
    w.give("b", "flour", 5);
    expect(
      error(
        w.try({ type: "empireSell", playerId: "b", good: "flour", qty: 5, region: "lombardia" }),
      ),
    ).toBe("unknown_region");
  });

  it("sizes a region's Dogana on the houses present there", () => {
    const w = world();
    w.giveIn("a", "lombardia", "flour", 40);
    // One house in Lombardy: 10 + 5.
    w.do({ type: "empireSell", playerId: "a", good: "flour", qty: 40, region: "lombardia" });
    expect(w.state.inventories.a?.flour?.available).toBe(25);
    const q = empireQuotes(w.ctx, w.state, w.now, "a").find(
      (x) => x.region === "lombardia" && x.good === "flour",
    );
    expect(q?.depthLeft).toBe(0);
  });

  it("opens a private book for each counter, at its level", () => {
    const w = world();
    w.give("a", "bread", 100);
    // Bread is made in Venice by no workshop of a; its book in Venetia is the Casa's.
    expect(error(w.try({ type: "empireDeliver", playerId: "a", good: "bread", qty: 100 }))).toBe(
      "",
    );
    expect(empireHouseAt(w.ctx, w.state, "a", w.now)?.books?.veneto?.left).toBe(0);
    w.advance(DAY);
  });
});

describe("the news travels at the speed of ships", () => {
  const quote = (w: World, id: string) =>
    empireQuotes(w.ctx, w.state, w.now, id).find(
      (q) => q.region === "lombardia" && q.good === "flour",
    );

  it("shows a region's price live where the house has a counter, dated elsewhere", () => {
    const w = world();
    const before = quote(w, "a")?.price ?? 0n;
    w.giveIn("a", "lombardia", "flour", 15);
    w.do({ type: "empireSell", playerId: "a", good: "flour", qty: 15, region: "lombardia" });
    // a sees the price it made fall, at once.
    expect((quote(w, "a")?.price ?? 0n) < before).toBe(true);
    expect(quote(w, "a")?.asOf).toBe(w.now);
    // b, without a counter there, learns it six hours later (Lombardy's distance from Venice).
    w.advance(HOUR);
    expect(quote(w, "b")?.price).toBe(before);
    expect(quote(w, "b")?.asOf).toBe(w.now - 6 * HOUR);
    w.advance(6 * HOUR);
    expect((quote(w, "b")?.price ?? 0n) < before).toBe(true);
  });
});
