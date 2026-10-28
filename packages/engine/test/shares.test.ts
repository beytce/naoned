import { describe, expect, it } from "vitest";
import {
  type Command,
  type WorldSettingsInput,
  councilOf,
  houseBoard,
  seasonEnd,
  turnoverOf,
} from "../src/index.js";
import { DAY, HOUR, World, makeContext } from "./helpers.js";

/**
 * The parts of a house (R9 of the audit of 27 October 2026, docs/plan-rupture.md): from day 8, a
 * house of the people may list itself, 100 parts of which the founder always keeps 51; the others
 * trade on the house's own little book, their ducats held aside; each week the holders share 30 %
 * of what the house gained in net sales; 30 parts sit on its council; the last day of the month
 * the house buys every part back at the last price, as far as its cash goes.
 */

const shares = {
  fromDay: 8,
  minDays: 7,
  float: 49,
  dividendBps: 3_000,
  councilShares: 30,
  maxOpenOrders: 4,
};
const rules = {
  shares,
  commissions: { maxDays: 3 },
  colleganza: { maxDays: 7, maxShareBps: 7_500 },
} as unknown as Partial<WorldSettingsInput>;

function world() {
  const w = new World(makeContext(rules));
  w.at(9 * HOUR);
  for (const id of ["a", "b", "c"]) w.do({ type: "join", playerId: id, region: "terraferma" });
  return w;
}
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "ok" : res.error);
const order = (
  playerId: string,
  side: "buy" | "sell",
  quantity: number,
  price: bigint,
  house = "a",
): Command => ({ type: "placeShareOrder", playerId, house, side, price, quantity });
const listed = () => {
  const w = world();
  w.at(8 * DAY + 9 * HOUR).do({ type: "listHouse", playerId: "a" });
  return w;
};
const hold = (w: World, id: string) => w.state.accounts[`hold:${id}`] ?? 0n;
/** The house sells `n` of its parts to `buyer` at `price`. */
const issue = (w: World, buyer: string, n: number, price: bigint) => {
  w.do(order("a", "sell", n, price));
  w.do(order(buyer, "buy", n, price));
};
/** The house `a` gains net sales: a commission of `c` for `units` of bread filled by `a`. */
const gain = (w: World, units: number) => {
  w.give("a", "bread", units);
  w.do({
    type: "postCommission",
    playerId: "c",
    resource: "bread",
    quantity: units,
    unitPrice: 100n,
    days: 1,
  });
  const id = Object.keys(w.state.commissions ?? {}).at(-1) ?? "";
  w.do({ type: "fillCommission", playerId: "a", commissionId: id });
};

/** The house `a` puts `amount` aside (a colleganza on offer, held until taken). */
const spend = (w: World, amount: bigint) =>
  w.do({ type: "offerColleganza", playerId: "a", amount, days: 7, shareBps: 1_000 });

describe("listing a house", () => {
  it("waits for day 8 and a week in the world, once, never for a house of the computer", () => {
    const w = world();
    w.at(7 * DAY + 9 * HOUR);
    expect(error(w.try({ type: "listHouse", playerId: "a" }))).toBe("too_early");
    w.at(8 * DAY + 9 * HOUR).do({ type: "join", playerId: "late", region: "terraferma" });
    expect(error(w.try({ type: "listHouse", playerId: "late" }))).toBe("too_new");
    w.do({ type: "join", playerId: "npc", region: "terraferma", npc: true });
    expect(error(w.try({ type: "listHouse", playerId: "npc" }))).toBe("not_for_npc");
    w.do({ type: "listHouse", playerId: "a" });
    expect(error(w.try({ type: "listHouse", playerId: "a" }))).toBe("already_listed");
    expect(houseBoard(w.state, "a")).toMatchObject({ holders: [{ playerId: "a", shares: 100 }] });
  });

  it("stays off without its settings", () => {
    const w = new World(makeContext());
    w.at(9 * HOUR).do({ type: "join", playerId: "a", region: "terraferma" });
    w.at(20 * DAY);
    expect(error(w.try({ type: "listHouse", playerId: "a" }))).toBe("shares_off");
  });
});

describe("the book of a house's parts", () => {
  it("sells parts for ducats held aside, at the price of the order that waited", () => {
    const w = listed();
    const cash = { a: w.cash("a"), b: w.cash("b") };
    w.do(order("b", "buy", 10, 600n));
    expect(hold(w, "b")).toBe(6_000n);
    expect(w.cash("b")).toBe(cash.b - 6_000n);
    w.do(order("a", "sell", 10, 500n));
    // The buyer waited: its price, the market's tax on the seller.
    expect(w.cash("a")).toBe(cash.a + 6_000n - 180n);
    expect(hold(w, "b")).toBe(0n);
    expect(houseBoard(w.state, "a")).toMatchObject({
      lastPrice: 600n,
      holders: [
        { playerId: "a", shares: 90 },
        { playerId: "b", shares: 10 },
      ],
    });
    // Raising ducats is no sale.
    expect(turnoverOf(w.state, "a")).toBe(0n);
  });

  it("gives back what a buyer held over the price paid", () => {
    const w = listed();
    w.do(order("a", "sell", 5, 400n));
    const cash = w.cash("b");
    w.do(order("b", "buy", 5, 600n));
    expect(w.cash("b")).toBe(cash - 2_000n);
    expect(hold(w, "b")).toBe(0n);
  });

  it("never lets the founder go under 51 parts, nor anyone sell what it has not", () => {
    const w = listed();
    expect(error(w.try(order("a", "sell", 50, 100n)))).toBe("over_float");
    w.do(order("a", "sell", 40, 100n));
    expect(error(w.try(order("a", "sell", 10, 100n)))).toBe("over_float");
    expect(error(w.try(order("b", "sell", 1, 100n)))).toBe("insufficient_shares");
    expect(error(w.try(order("b", "buy", 0, 100n)))).toBe("invalid_quantity");
    expect(error(w.try(order("b", "buy", 1, 0n)))).toBe("invalid_price");
    expect(error(w.try(order("b", "buy", 1, 100n, "c")))).toBe("not_listed");
  });

  it("trades parts between holders, lets the house buy its own back, and cancels", () => {
    const w = listed();
    issue(w, "b", 20, 500n);
    w.do(order("b", "sell", 5, 700n));
    w.do(order("c", "buy", 5, 700n));
    w.do(order("b", "sell", 5, 800n));
    w.do(order("a", "buy", 5, 800n));
    expect(houseBoard(w.state, "a")?.holders).toEqual([
      { playerId: "a", shares: 85 },
      { playerId: "b", shares: 10 },
      { playerId: "c", shares: 5 },
    ]);
    w.do(order("c", "buy", 3, 300n));
    const id = Object.keys(w.state.shares?.a?.orders ?? {})[0] ?? "";
    expect(error(w.try({ type: "cancelShareOrder", playerId: "b", orderId: id }))).toBe(
      "not_owner",
    );
    w.do({ type: "cancelShareOrder", playerId: "c", orderId: id });
    expect(hold(w, "c")).toBe(0n);
  });

  it("caps the open orders, and closes the book the last day", () => {
    const w = listed();
    for (let k = 0; k < 4; k++) w.do(order("b", "buy", 1, 100n + BigInt(k)));
    expect(error(w.try(order("b", "buy", 1, 50n)))).toBe("max_open_orders");
    w.now = seasonEnd(w.ctx) - 12 * HOUR;
    expect(error(w.try(order("c", "buy", 1, 50n)))).toBe("season_over");
  });

  it("always counts 100 parts, and holds as much as the open buy orders", () => {
    const w = listed();
    issue(w, "b", 30, 500n);
    w.do(order("c", "buy", 4, 450n));
    w.do(order("b", "sell", 2, 400n));
    w.do(order("b", "buy", 1, 300n));
    const book = w.state.shares?.a;
    const total = Object.values(book?.holders ?? {}).reduce((s, n) => s + n, 0);
    expect(total).toBe(100);
    for (const id of ["b", "c"]) {
      const open = Object.values(book?.orders ?? {})
        .filter((o) => o.player === id && o.side === "buy")
        .reduce((s, o) => s + o.price * BigInt(o.quantity), 0n);
      expect(hold(w, id)).toBe(open);
    }
  });
});

describe("the dividend of the week", () => {
  it("shares 30 % of the week's net sales pro rata, out of the ranking's sums", () => {
    const w = listed();
    w.do({ type: "tick" });
    issue(w, "b", 40, 100n);
    gain(w, 100);
    const sales = turnoverOf(w.state, "a");
    const cash = w.cash("b");
    w.at(14 * DAY + HOUR).do({ type: "tick" });
    // 30 % of the gain, 40 parts in a hundred.
    const due = (sales * 3_000n * 40n) / 10_000n / 100n;
    expect(w.cash("b")).toBe(cash + due);
    expect(turnoverOf(w.state, "b")).toBe(due);
    expect(turnoverOf(w.state, "a")).toBe(sales - due);
  });

  it("is never paid beyond the house's cash", () => {
    const w = listed();
    w.do({ type: "tick" });
    issue(w, "b", 40, 100n);
    gain(w, 100);
    // The house puts aside all it has but 10.
    spend(w, w.cash("a") - 10n);
    w.at(14 * DAY + HOUR).do({ type: "tick" });
    expect(w.cash("a")).toBe(0n);
    expect(w.cash("b") >= 0n).toBe(true);
  });
});

describe("the council", () => {
  it("seats a holder of 30 parts, never the founder", () => {
    const w = listed();
    issue(w, "b", 29, 100n);
    expect(councilOf(w.ctx, w.state, "a", "b")).toBe(false);
    issue(w, "b", 1, 100n);
    expect(councilOf(w.ctx, w.state, "a", "b")).toBe(true);
    expect(councilOf(w.ctx, w.state, "a", "a")).toBe(false);
  });
});

describe("the month's settlement", () => {
  it("buys back every part at the last price before the ranking closes", () => {
    const w = listed();
    issue(w, "b", 20, 500n);
    w.do(order("c", "buy", 2, 100n));
    const cash = { b: w.cash("b"), c: w.cash("c") };
    w.now = seasonEnd(w.ctx) - 12 * HOUR;
    w.do({ type: "tick" });
    expect(w.cash("b")).toBe(cash.b + 10_000n);
    // The order still open given back.
    expect(w.cash("c")).toBe(cash.c + 200n);
    expect(houseBoard(w.state, "a")?.holders).toEqual([{ playerId: "a", shares: 100 }]);
    expect(turnoverOf(w.state, "b")).toBe(0n);
  });

  it("pays no more than the house's cash, shared pro rata", () => {
    const w = listed();
    issue(w, "b", 30, 2_000n);
    issue(w, "c", 10, 2_000n);
    // The house spends nearly all: 1_000 left for 80_000 owed.
    spend(w, w.cash("a") - 1_000n);
    const cash = { b: w.cash("b"), c: w.cash("c") };
    w.now = seasonEnd(w.ctx) - 12 * HOUR;
    w.do({ type: "tick" });
    expect(w.cash("a")).toBeGreaterThanOrEqual(0n);
    expect(w.cash("b") - cash.b).toBe(750n);
    expect(w.cash("c") - cash.c).toBe(250n);
  });
});
