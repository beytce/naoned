import { describe, expect, it } from "vitest";
import {
  type EmpireSettingsInput,
  SINK_ACCOUNT,
  cashAccount,
  empireHouseAt,
  empireView,
  parseEmpireSettings,
  powerOfHouse,
  wagesOn,
} from "../../src/index.js";
import { testEmpire } from "../fixture.js";
import { DAY, HOUR, World, makeContext } from "../helpers.js";

// Venetia in the fixture: wheat made at 400 deniers, bread asked at 1 200, 40 units of private book.
const empire: EmpireSettingsInput = {
  ...testEmpire,
  start: { capitalDucats: 0, workshops: [{ type: "farm", recipe: "grow_wheat" }] },
  markets: {
    depthBase: 5,
    depthPerHouse: 0,
    boardPerHouse: 10,
    smallShareBps: 5_000,
    smallCasa: 3,
    orderPremiumBps: 1_000,
    taxBps: 300,
  },
};
const s = parseEmpireSettings(empire);

function world(over: Partial<EmpireSettingsInput> = {}) {
  const w = new World(makeContext({ empire: { ...empire, ...over } }));
  w.do({ type: "empireJoin", playerId: "a" });
  return w;
}

const cash = (w: World) => w.state.accounts[cashAccount("a")] ?? 0n;
const stock = (w: World, good: string) => w.state.inventories.a?.[good]?.available ?? 0;
const wagesOf = (w: World, gross: bigint) => {
  const h = empireHouseAt(w.ctx, w.state, "a", w.now);
  if (!h) throw new Error("no house");
  return wagesOn(gross, powerOfHouse(h, s), s);
};

describe("the Dogana", () => {
  it("buys at the market's price, less the wages and the tax", () => {
    const w = world();
    w.give("a", "wheat", 5);
    w.do({ type: "empireSell", playerId: "a", good: "wheat", qty: 5 });
    const gross = 2_000n;
    expect(cash(w)).toBe(gross - wagesOf(w, gross) - 60n);
    expect(stock(w, "wheat")).toBe(0);
    const wages = w.totals.accounts.get(SINK_ACCOUNT) ?? 0n;
    expect(wages).toBe(wagesOf(w, gross) + 60n);
  });

  it("takes no more a day than its depth, and the price sinks as it buys", () => {
    const w = world();
    w.give("a", "wheat", 10);
    w.do({ type: "empireSell", playerId: "a", good: "wheat", qty: 10 });
    expect(stock(w, "wheat")).toBe(5);
    const res = w.try({ type: "empireSell", playerId: "a", good: "wheat", qty: 5 });
    expect(res.ok ? "" : res.error).toBe("no_liquidity");
    w.advance(DAY);
    const before = cash(w);
    w.do({ type: "empireSell", playerId: "a", good: "wheat", qty: 5 });
    // A day later the price is back near its reference, not quite.
    const got = cash(w) - before;
    expect(got > 0n).toBe(true);
    expect(got < 2_000n).toBe(true);
  });

  it("refuses a good Venetia neither makes nor asks", () => {
    const w = world();
    w.give("a", "iron", 5);
    const res = w.try({ type: "empireSell", playerId: "a", good: "iron", qty: 5 });
    expect(res.ok ? "" : res.error).toBe("unknown_resource");
  });
});

describe("the cities' orders", () => {
  it("fill the private book first at the reference, then the common board", () => {
    const w = world();
    w.give("a", "bread", 60);
    w.do({ type: "empireDeliver", playerId: "a", good: "bread", qty: 60 });
    // 40 to the book at 1 200, then 10 of the board (10 a house, a small house reaches it all).
    expect(stock(w, "bread")).toBe(10);
    const gross = ((40n + 10n) * 1_200n * 11_000n) / 10_000n;
    expect(cash(w)).toBe(gross - wagesOf(w, gross));
  });

  it("open a new book each day", () => {
    const w = world();
    w.give("a", "bread", 100);
    w.do({ type: "empireDeliver", playerId: "a", good: "bread", qty: 100 });
    expect(w.try({ type: "empireDeliver", playerId: "a", good: "bread", qty: 1 }).ok).toBe(false);
    w.advance(DAY);
    w.do({ type: "empireDeliver", playerId: "a", good: "bread", qty: 40 });
    expect(stock(w, "bread")).toBe(10);
  });
});

describe("the wages", () => {
  it("are taken on the receipts only, never on the treasury", () => {
    const w = world({ start: { capitalDucats: 1_000, workshops: [] } });
    w.advance(30 * DAY);
    w.do({ type: "empireRelaunchAll", playerId: "a" });
    expect(cash(w)).toBe(100_000n);
  });
});

describe("the high recipes", () => {
  it("eat Venetia's raw goods from the level they start", () => {
    const w = world({
      casa: testEmpire.casa.map((c) => ({ ...c, buildMinutes: 0, materials: {}, costDucats: 0 })),
      workshops: { ...testEmpire.workshops, baseCostDucats: 0, buildMinutes: [0] },
      highRecipes: { fromLevel: 2, rawPerLevelBps: 5_000, goods: ["clay"] },
    });
    const id = empireHouseAt(w.ctx, w.state, "a", w.now)?.workshops[0]?.id ?? "";
    w.do({ type: "empireBuildCasa", playerId: "a" });
    w.do({ type: "empireUpgrade", playerId: "a", workshopId: id });
    w.give("a", "clay", 3);
    w.do({ type: "empireRelaunch", playerId: "a", workshopId: id });
    // Half a unit of clay a lot: three clays for six lots.
    expect(empireHouseAt(w.ctx, w.state, "a", w.now)?.workshops[0]?.job?.batches).toBe(6);
    expect(stock(w, "clay")).toBe(0);
    w.advance(HOUR);
  });
});

describe("the income a day", () => {
  it("reads today's receipts on the first day, then the mean of the full days", () => {
    const w = world();
    w.give("a", "bread", 40);
    w.do({ type: "empireDeliver", playerId: "a", good: "bread", qty: 40 });
    const first = empireView(w.ctx, w.state, "a", w.now)?.incomePerDay ?? 0n;
    expect(first).toBe((40n * 1_200n * 11_000n) / 10_000n);
    w.advance(2 * DAY);
    // Two full days since: one with the sale, one without.
    expect(empireView(w.ctx, w.state, "a", w.now)?.incomePerDay).toBe(first / 2n);
  });
});
