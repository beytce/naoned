import { describe, expect, it } from "vitest";
import { type WorldSettingsInput, loanOwed, netWorth } from "../src/index.js";
import { DAY, HOUR, World, makeContext } from "./helpers.js";

const rules = {
  loans: {
    maxShareBps: 5_000,
    maxAmount: 50_000,
    interestBpsPerDay: 100,
    maxDays: 7,
    lateBps: 1_000,
  },
} as Partial<WorldSettingsInput>;

function world() {
  const w = new World(makeContext(rules));
  w.do({ type: "join", playerId: "a", region: "terraferma" });
  return w;
}
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "ok" : res.error);

describe("the Bank's loans", () => {
  it("lends up to a share of the net worth, one loan at a time, the debt off the net worth", () => {
    const w = world();
    const worth = netWorth(w.ctx, w.state, "a", w.now).total;
    const cash = w.cash("a");
    expect(error(w.try({ type: "borrow", playerId: "a", amount: 60_000n, days: 3 }))).toBe(
      "over_limit",
    );
    expect(error(w.try({ type: "borrow", playerId: "a", amount: 10_000n, days: 9 }))).toBe(
      "invalid_quantity",
    );
    w.do({ type: "borrow", playerId: "a", amount: 10_000n, days: 3 });
    expect(w.cash("a")).toBe(cash + 10_000n);
    // 1 % a day for 3 days.
    expect(loanOwed(w.state, "a")).toBe(10_300n);
    expect(netWorth(w.ctx, w.state, "a", w.now).total).toBe(worth - 300n);
    expect(error(w.try({ type: "borrow", playerId: "a", amount: 1_000n, days: 3 }))).toBe(
      "loan_open",
    );
  });

  it("is repaid early for the days it ran, the interest leaving the game", () => {
    const w = world();
    const cash = w.cash("a");
    w.do({ type: "borrow", playerId: "a", amount: 10_000n, days: 3 });
    w.advance(HOUR);
    const res = w.do({ type: "repayLoan", playerId: "a" });
    // A day begun counts: 1 %.
    expect(w.cash("a")).toBe(cash - 100n);
    expect(res.effects.ledger).toContainEqual(
      expect.objectContaining({ reason: "loan_interest", amount: 100n, to: "system:sink" }),
    );
    expect(w.state.loans?.a).toBeUndefined();
  });

  it("takes its due at term, and what is missing, with a penalty, from the cash as it comes", () => {
    const w = world();
    w.do({ type: "borrow", playerId: "a", amount: 10_000n, days: 2 });
    // The merchant spends nearly everything meanwhile: its cash goes to a commission-free sink.
    const cash = w.cash("a");
    w.state = {
      ...w.state,
      accounts: {
        ...w.state.accounts,
        "cash:a": 4_000n,
        "system:sink": (w.state.accounts["system:sink"] ?? 0n) + cash - 4_000n,
      },
    };
    w.totals.accounts.set("cash:a", 4_000n);
    w.totals.accounts.set("system:sink", w.state.accounts["system:sink"] ?? 0n);
    w.advance(2 * DAY + HOUR).do({ type: "tick" });
    expect(w.cash("a")).toBe(0n);
    // 10 200 owed, 4 000 taken: 6 200 left, 10 % more for being late.
    expect(loanOwed(w.state, "a")).toBe(6_820n);
    expect(error(w.try({ type: "borrow", playerId: "a", amount: 1_000n, days: 1 }))).toBe(
      "loan_open",
    );
  });
});
