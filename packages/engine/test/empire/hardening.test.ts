import { describe, expect, it } from "vitest";
import { type EmpireSettingsInput, cashAccount } from "../../src/index.js";
import { testEmpire } from "../fixture.js";
import { World, makeContext } from "../helpers.js";

// The publication plan, lot 0 (docs/plan-publication.md): no player's input reaches the
// prototype of an object, the market respects the Fondaco's cap, and its day's depth is each
// house's own.
const markets = {
  depthBase: 20,
  depthPerHouse: 0,
  boardPerHouse: 0,
  smallShareBps: 0,
  smallCasa: 20,
  orderPremiumBps: 0,
  taxBps: 0,
};
const empire: EmpireSettingsInput = {
  ...testEmpire,
  casa: testEmpire.casa.map((c, i) => ({ ...c, storeCap: i === 0 ? 30 : 60 })),
  start: { capitalDucats: 1_000_000, workshops: [] },
  markets,
};

function world(over: Partial<EmpireSettingsInput> = {}) {
  const w = new World(makeContext({ empire: { ...empire, ...over } }));
  w.do({ type: "empireJoin", playerId: "a" });
  return w;
}
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "" : res.error);
const stock = (w: World, good: string, p = "a") => w.state.inventories[p]?.[good]?.available ?? 0;
const cash = (w: World, p = "a") => w.state.accounts[cashAccount(p)] ?? 0n;

const RESERVED = ["__proto__", "constructor", "prototype", "toString", "valueOf", "hasOwnProperty"];

describe("the keys of a player's input", () => {
  it("refuses a good, a role or a code named after an object's own machinery", () => {
    const w = world();
    for (const key of RESERVED) {
      expect(error(w.try({ type: "empireSell", playerId: "a", good: key, qty: 1 }))).toBe(
        "bad_key",
      );
      expect(error(w.try({ type: "empireBuy", playerId: "a", good: key, qty: 1 }))).toBe("bad_key");
      expect(error(w.try({ type: "empireHire", playerId: "a", role: key }))).toBe("bad_key");
      expect(
        error(
          w.try({
            type: "empireRound",
            playerId: "a",
            vehicleId: "v",
            stops: [{ city: key, orderIds: [] }],
          }),
        ),
      ).toBe("bad_key");
    }
    // Nothing reached the prototype of every object.
    expect(({} as Record<string, unknown>).available).toBeUndefined();
    expect(({} as Record<string, unknown>).escrow).toBeUndefined();
  });

  it("refuses a quantity that is not a whole number above nothing", () => {
    const w = world();
    for (const qty of [0, -3, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(error(w.try({ type: "empireBuy", playerId: "a", good: "wheat", qty }))).toBe(
        "invalid_quantity",
      );
      expect(error(w.try({ type: "empireSell", playerId: "a", good: "wheat", qty }))).toBe(
        "invalid_quantity",
      );
    }
  });
});

describe("buying at the market (golden rule 3)", () => {
  it("buys no more than the Fondaco has room for, and says so when it is full", () => {
    const w = world();
    w.do({ type: "empireBuy", playerId: "a", good: "wheat", qty: 1_000 });
    expect(stock(w, "wheat")).toBe(20);
    w.give("a", "wheat", 5);
    // 25 held, a cap of 30: five more, whatever is asked.
    const w2 = world();
    w2.give("a", "wheat", 25);
    w2.do({ type: "empireBuy", playerId: "a", good: "wheat", qty: 1_000 });
    expect(stock(w2, "wheat")).toBe(30);
    expect(error(w2.try({ type: "empireBuy", playerId: "a", good: "wheat", qty: 1 }))).toBe(
      "store_full",
    );
  });

  it("pays more for each unit as the order lifts the price", () => {
    const w = world();
    const before = cash(w);
    w.do({ type: "empireBuy", playerId: "a", good: "wheat", qty: 1 });
    const one = before - cash(w);
    const w2 = world();
    w2.do({ type: "empireBuy", playerId: "a", good: "wheat", qty: 20 });
    expect(before - cash(w2)).toBeGreaterThan(one * 20n);
  });

  it("gives each house its fair share of the day's depth: one buyer does not empty it", () => {
    const w = world({ casa: empire.casa?.map((c) => ({ ...c, storeCap: 1_000 })) });
    w.do({ type: "empireJoin", playerId: "b" });
    // Two houses present, a depth of 20: ten each, whoever comes first.
    w.do({ type: "empireBuy", playerId: "a", good: "wheat", qty: 1_000 });
    expect(stock(w, "wheat", "a")).toBe(10);
    expect(error(w.try({ type: "empireBuy", playerId: "a", good: "wheat", qty: 1 }))).toBe(
      "no_liquidity",
    );
    w.do({ type: "empireBuy", playerId: "b", good: "wheat", qty: 1_000 });
    expect(stock(w, "wheat", "b")).toBe(10);
  });

  it("gives each house its fair share at the sale too", () => {
    const w = world({ casa: empire.casa?.map((c) => ({ ...c, storeCap: 1_000 })) });
    w.do({ type: "empireJoin", playerId: "b" });
    w.give("a", "wheat", 100);
    w.give("b", "wheat", 100);
    w.do({ type: "empireSell", playerId: "a", good: "wheat", qty: 100 });
    expect(stock(w, "wheat", "a")).toBe(90);
    w.do({ type: "empireSell", playerId: "b", good: "wheat", qty: 100 });
    expect(stock(w, "wheat", "b")).toBe(90);
  });

  it("pays no newcomers' premium on what the house bought here today and sells again (P1-20)", () => {
    const over = {
      casa: empire.casa?.map((c) => ({ ...c, storeCap: 1_000 })),
      newcomers: { rawBonusBps: 2_000, untilCasa: 20 },
    };
    const bought = world(over);
    const before = cash(bought);
    bought.do({ type: "empireBuy", playerId: "a", good: "wheat", qty: 5 });
    const paid = before - cash(bought);
    const mid = cash(bought);
    bought.do({ type: "empireSell", playerId: "a", good: "wheat", qty: 5 });
    // Sold back at the market's price, without the premium: never more than it cost.
    expect(cash(bought) - mid).toBeLessThanOrEqual(paid);
    const made = world(over);
    made.give("a", "wheat", 5);
    const m0 = cash(made);
    made.do({ type: "empireSell", playerId: "a", good: "wheat", qty: 5 });
    expect(cash(made) - m0).toBeGreaterThan(cash(bought) - mid);
  });
});
