import { describe, expect, it } from "vitest";
import { hasPass, marketMakerQuotaLeft, maxOpenOrdersFor } from "../src/index.js";
import { DAY, HOUR, World, makeContext } from "./helpers.js";

function twoPlayers() {
  const w = new World();
  w.do({ type: "join", playerId: "buyer", region: "lagoon" });
  w.do({ type: "join", playerId: "seller", region: "terraferma" });
  w.give("seller", "wheat", 1_000);
  return w;
}

const sell = (playerId: string, price: number, quantity: number) =>
  ({
    type: "placeOrder",
    playerId,
    resource: "wheat",
    side: "sell",
    kind: "limit",
    price: BigInt(price),
    quantity,
  }) as const;
const buy = (playerId: string, price: number, quantity: number) =>
  ({
    type: "placeOrder",
    playerId,
    resource: "wheat",
    side: "buy",
    kind: "limit",
    price: BigInt(price),
    quantity,
  }) as const;

describe("order book", () => {
  it("escrows money and stock when an order rests", () => {
    const w = twoPlayers();
    w.do(buy("buyer", 100, 50));
    w.do(sell("seller", 120, 30));
    expect(w.escrow("buyer")).toBe(5_000n);
    expect(w.cash("buyer")).toBe(95_000n);
    expect(w.stock("seller", "wheat")).toEqual({ available: 970, escrow: 30 });
  });

  it("trades at the resting price, refunds the improvement, taxes the seller", () => {
    const w = twoPlayers();
    w.do(sell("seller", 90, 10));
    w.do(buy("buyer", 100, 10));
    expect(w.trades).toHaveLength(1);
    expect(w.trades[0]?.price).toBe(90n);
    expect(w.cash("buyer")).toBe(100_000n - 900n);
    expect(w.escrow("buyer")).toBe(0n);
    expect(w.cash("seller")).toBe(100_000n + 900n - 27n);
    expect(w.stock("buyer", "wheat").available).toBe(10);
    expect(Object.keys(w.state.orders)).toHaveLength(0);
  });

  it("rounds the tax up", () => {
    const w = twoPlayers();
    w.do(sell("seller", 101, 1));
    w.do(buy("buyer", 101, 1));
    expect(w.trades[0]?.tax).toBe(4n);
  });

  it("serves the best price first, then the oldest order", () => {
    const w = twoPlayers();
    w.do({ type: "join", playerId: "seller2", region: "terraferma" });
    w.give("seller2", "wheat", 100);
    w.do(sell("seller", 100, 10));
    w.do(sell("seller2", 100, 10));
    w.do(sell("seller2", 95, 5));
    w.do(buy("buyer", 100, 12));
    expect(w.trades.map((t) => [t.sellerId, t.price, t.quantity])).toEqual([
      ["seller2", 95n, 5],
      ["seller", 100n, 7],
    ]);
  });

  it("fills partially and keeps the rest in the book", () => {
    const w = twoPlayers();
    w.do(sell("seller", 100, 10));
    w.do(buy("buyer", 100, 25));
    const rest = Object.values(w.state.orders);
    expect(rest).toHaveLength(1);
    expect(rest[0]?.remaining).toBe(15);
    expect(w.escrow("buyer")).toBe(1_500n);
  });

  it("does not match a player against their own orders", () => {
    const w = twoPlayers();
    w.do(sell("seller", 100, 10));
    w.give("seller", "wheat", 0);
    w.do(buy("seller", 110, 5));
    expect(w.trades).toHaveLength(0);
  });

  it("releases escrow on cancellation and on expiry", () => {
    const w = twoPlayers();
    const placed = w.do(buy("buyer", 100, 50));
    const orderId = Object.keys(placed.state.orders)[0] ?? "";
    w.do({ type: "cancelOrder", playerId: "buyer", orderId });
    expect(w.escrow("buyer")).toBe(0n);
    expect(w.cash("buyer")).toBe(100_000n);

    w.do(sell("seller", 120, 30));
    w.advance(72 * HOUR).do({ type: "tick" });
    expect(Object.values(w.state.orders).filter((o) => o.playerId === "seller")).toHaveLength(0);
    expect(w.stock("seller", "wheat")).toEqual({ available: 1_000, escrow: 0 });
  });

  it("only lets the owner cancel", () => {
    const w = twoPlayers();
    const placed = w.do(sell("seller", 120, 30));
    const orderId = Object.keys(placed.state.orders)[0] ?? "";
    const res = w.try({ type: "cancelOrder", playerId: "buyer", orderId });
    expect(res.ok).toBe(false);
  });

  it("caps open orders per player", () => {
    const w = twoPlayers();
    for (let i = 0; i < 10; i++) w.do(sell("seller", 200 + i, 1));
    const res = w.try(sell("seller", 300, 1));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("max_open_orders");
  });

  it("refuses an order the player cannot cover", () => {
    const w = twoPlayers();
    expect(w.try(buy("buyer", 100_000, 2)).ok).toBe(false);
    expect(w.try(sell("buyer", 100, 1)).ok).toBe(false);
  });
});

describe("instant orders", () => {
  it("walks the book within the slippage limit and drops the rest", () => {
    const w = twoPlayers();
    w.do(sell("seller", 100, 10));
    w.do(sell("seller", 109, 10));
    w.do(sell("seller", 111, 10));
    w.do({
      type: "placeOrder",
      playerId: "buyer",
      resource: "wheat",
      side: "buy",
      kind: "instant",
      quantity: 50,
    });
    expect(w.trades.map((t) => [t.price, t.quantity])).toEqual([
      [100n, 10],
      [109n, 10],
    ]);
    expect(Object.values(w.state.orders).filter((o) => o.playerId === "buyer")).toHaveLength(0);
    expect(w.escrow("buyer")).toBe(0n);
    expect(w.cash("buyer")).toBe(100_000n - 1_000n - 1_090n);
  });

  it("refuses an instant order on an empty book", () => {
    const w = twoPlayers();
    const res = w.try({
      type: "placeOrder",
      playerId: "seller",
      resource: "wheat",
      side: "sell",
      kind: "instant",
      quantity: 5,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("no_liquidity");
  });
});

describe("market maker", () => {
  it("quotes around the reference price, widening over two weeks", () => {
    const w = twoPlayers();
    w.do({ type: "tick" });
    const mm = Object.values(w.state.orders).filter(
      (o) => o.playerId === "market_maker" && o.resource === "wheat",
    );
    expect(mm.map((o) => [o.side, o.price]).sort()).toEqual([
      ["buy", 98n],
      ["sell", 102n],
    ]);
    w.advance(20 * DAY).do({ type: "tick" });
    const later = Object.values(w.state.orders).filter(
      (o) => o.playerId === "market_maker" && o.resource === "wheat",
    );
    expect(later.map((o) => [o.side, o.price]).sort()).toEqual([
      ["buy", 90n],
      ["sell", 110n],
    ]);
  });

  it("creates money when it buys and destroys it when it sells, untaxed", () => {
    const w = twoPlayers();
    w.do({ type: "tick" });
    w.do({
      type: "placeOrder",
      playerId: "seller",
      resource: "wheat",
      side: "sell",
      kind: "instant",
      quantity: 10,
    });
    expect(w.cash("seller")).toBe(100_000n + 980n);
    expect(w.state.accounts["system:source"]).toBe(-200_980n);
    w.do({
      type: "placeOrder",
      playerId: "buyer",
      resource: "wheat",
      side: "buy",
      kind: "instant",
      quantity: 10,
    });
    expect(w.cash("buyer")).toBe(100_000n - 1_020n);
    expect(w.state.accounts["system:sink"]).toBe(1_020n);
  });

  it("caps its daily depth per active player", () => {
    const w = new World(makeContext());
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    w.give("a", "wheat", 100);
    w.do({ type: "tick" });
    w.do({
      type: "placeOrder",
      playerId: "a",
      resource: "wheat",
      side: "sell",
      kind: "limit",
      price: 98n,
      quantity: 30,
    });
    expect(w.trades.reduce((n, t) => n + t.quantity, 0)).toBe(5);
    w.do({ type: "tick" });
    expect(
      Object.values(w.state.orders).some(
        (o) => o.playerId === "market_maker" && o.side === "buy" && o.resource === "wheat",
      ),
    ).toBe(false);
  });

  it("keeps a minimum daily depth in a small world", () => {
    const w = new World(
      makeContext({
        marketMaker: {
          spreadStartBps: 400,
          spreadEndBps: 2_000,
          spreadRampDays: 14,
          referenceFloorBps: 5_000,
          dailyDepthPerPlayer: { wheat: 5 },
          minDailyDepth: { wheat: 40 },
        },
      }),
    );
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    w.do({ type: "tick" });
    const bid = Object.values(w.state.orders).find(
      (o) => o.playerId === "market_maker" && o.side === "buy" && o.resource === "wheat",
    );
    expect(bid?.remaining).toBe(40);
  });

  it("buys from resting player orders that cross its new quote", () => {
    const w = twoPlayers();
    w.do(sell("seller", 95, 5));
    w.do({ type: "tick" });
    expect(w.trades[0]?.buyerId).toBe("market_maker");
    expect(w.trades[0]?.price).toBe(95n);
  });
});

describe("market maker reference", () => {
  const mmQuotes = (w: World) =>
    Object.values(w.state.orders)
      .filter((o) => o.playerId === "market_maker" && o.resource === "wheat")
      .map((o) => [o.side, o.price])
      .sort();

  it("follows the market down, but never above the reference price", () => {
    const w = twoPlayers();
    w.do(sell("seller", 80, 300)); // enough volume to count
    w.do(buy("buyer", 80, 300));
    w.do({ type: "tick" });
    expect(mmQuotes(w)).toEqual([
      ["buy", 78n],
      ["sell", 82n],
    ]);
    w.do(sell("seller", 150, 400));
    w.do(buy("buyer", 150, 400));
    w.do({ type: "tick" });
    // Its ask was used up by the buyer today; its bid is back at the reference.
    expect(mmQuotes(w)).toEqual([["buy", 98n]]);
  });

  it("does not follow the market below its floor", () => {
    const w = twoPlayers();
    w.do(sell("seller", 30, 300));
    w.do(buy("buyer", 30, 300));
    w.do({ type: "tick" });
    expect(mmQuotes(w)).toEqual([
      ["buy", 49n],
      ["sell", 51n],
    ]);
  });
});

describe("market maker quota per player", () => {
  const quota = (wheat = 10) =>
    makeContext({
      marketMaker: {
        spreadStartBps: 400,
        spreadEndBps: 2_000,
        spreadRampDays: 14,
        referenceFloorBps: 5_000,
        dailyDepthPerPlayer: { wheat: 5 },
        playerDailyQuota: { wheat },
        playerDailySellQuota: { wheat },
      },
    });

  function world() {
    const w = new World(quota());
    for (const id of ["a", "b"]) {
      w.do({ type: "join", playerId: id, region: "lagoon" });
      w.give(id, "wheat", 100);
    }
    w.do({ type: "tick" });
    return w;
  }

  const instant = (playerId: string, side: "buy" | "sell", quantity: number) =>
    ({ type: "placeOrder", playerId, resource: "wheat", side, kind: "instant", quantity }) as const;

  it("stocks every active player's share", () => {
    const w = world();
    const ask = Object.values(w.state.orders).find(
      (o) => o.playerId === "market_maker" && o.side === "sell" && o.resource === "wheat",
    );
    expect(ask?.remaining).toBe(20);
  });

  it("lets each player buy at most their own share of the day", () => {
    const w = world();
    w.do(instant("a", "buy", 15));
    expect(w.stock("a", "wheat").available).toBe(110);
    expect(marketMakerQuotaLeft(w.ctx, w.state, "a", "wheat", w.now)).toEqual({ buy: 0, sell: 10 });
    // The quota of one player never eats into another's.
    w.do(instant("b", "buy", 10));
    expect(w.stock("b", "wheat").available).toBe(110);
  });

  it("caps sales to the market maker too, and starts afresh the next day", () => {
    const w = world();
    w.do(instant("a", "sell", 30));
    expect(w.stock("a", "wheat").available).toBe(90);
    w.at(DAY + 60_000).do({ type: "tick" });
    expect(marketMakerQuotaLeft(w.ctx, w.state, "a", "wheat", w.now)).toEqual({
      buy: 10,
      sell: 10,
    });
    w.do(instant("a", "sell", 5));
    expect(w.stock("a", "wheat").available).toBe(85);
  });

  it("applies when the market maker's new quote crosses a resting order", () => {
    const w = world();
    w.do(sell("a", 90, 30));
    w.do({ type: "tick" });
    const sold = w.trades.filter((t) => t.sellerId === "a").reduce((n, t) => n + t.quantity, 0);
    expect(sold).toBe(10);
  });

  it("still lets players trade with each other beyond it", () => {
    const w = world();
    w.do(instant("a", "buy", 10));
    w.do(sell("b", 105, 20));
    w.do(buy("a", 105, 20));
    expect(w.stock("a", "wheat").available).toBe(130);
  });

  it("is unlimited where the world sets none", () => {
    const w = twoPlayers();
    w.do({ type: "tick" });
    expect(marketMakerQuotaLeft(w.ctx, w.state, "buyer", "wheat", w.now)).toEqual({
      buy: null,
      sell: null,
    });
  });
});

describe("market maker quota in a growing world", () => {
  it("shrinks each player's quota to a share of the daily cap", () => {
    const ctx = makeContext({
      marketMaker: {
        spreadStartBps: 400,
        spreadEndBps: 2_000,
        spreadRampDays: 14,
        referenceFloorBps: 5_000,
        dailyDepthPerPlayer: { wheat: 2 },
        playerDailyQuota: { wheat: 20 },
        maxDailyDepth: { wheat: 50 },
      },
    });
    const w = new World(ctx);
    w.do({ type: "join", playerId: "a", region: "lagoon" });
    w.do({ type: "tick" });
    expect(marketMakerQuotaLeft(w.ctx, w.state, "a", "wheat", w.now).buy).toBe(20);
    for (const id of ["b", "c", "d", "e"]) w.do({ type: "join", playerId: id, region: "lagoon" });
    w.do({ type: "tick" });
    // Five merchants share 50 units: 10 each.
    expect(marketMakerQuotaLeft(w.ctx, w.state, "a", "wheat", w.now).buy).toBe(10);
    const ask = Object.values(w.state.orders).find(
      (o) => o.playerId === "market_maker" && o.side === "sell" && o.resource === "wheat",
    );
    expect(ask?.remaining).toBe(50);
  });
});

describe("the Pass Négociant on the market", () => {
  it("gives no more open offers and no more of the Dogana's quota", () => {
    const w = new World(
      makeContext({
        pass: { enabled: true },
        marketMaker: {
          spreadStartBps: 400,
          spreadEndBps: 2_000,
          spreadRampDays: 14,
          referenceFloorBps: 5_000,
          dailyDepthPerPlayer: { wheat: 5 },
          playerDailyQuota: { wheat: 10 },
          playerDailySellQuota: { wheat: 10 },
        },
      }),
    );
    w.do({ type: "join", playerId: "paid", region: "terraferma" });
    w.do({ type: "join", playerId: "free", region: "terraferma" });
    w.do({ type: "grantPass", playerId: "paid", until: w.now + 7 * DAY });
    w.do({ type: "tick" });
    expect(hasPass(w.ctx, w.state, "paid", w.now)).toBe(true);
    expect(maxOpenOrdersFor(w.ctx, w.state, "paid", w.now)).toBe(
      maxOpenOrdersFor(w.ctx, w.state, "free", w.now),
    );
    expect(marketMakerQuotaLeft(w.ctx, w.state, "paid", "wheat", w.now)).toEqual(
      marketMakerQuotaLeft(w.ctx, w.state, "free", "wheat", w.now),
    );
    const offer = (playerId: string) =>
      w.try({
        type: "placeOrder",
        playerId,
        resource: "wheat",
        side: "buy",
        kind: "limit",
        price: 10n,
        quantity: 1,
      }).ok;
    const placed = (playerId: string) => {
      let n = 0;
      while (offer(playerId) && n < 50) n++;
      return n;
    };
    expect(placed("paid")).toBe(placed("free"));
  });
});
