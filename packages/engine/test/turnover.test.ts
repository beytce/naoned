import { describe, expect, it } from "vitest";
import {
  type LedgerEntry,
  adoptTurnover,
  seasonStandings,
  turnoverOf,
  weeklyStandings,
} from "../src/index.js";
import { DAY, HOUR, World } from "./helpers.js";

/** The ranking counts what a merchant sells, less what they buy: stock and buildings do not. */

const order = (playerId: string, side: "buy" | "sell", price: number, quantity: number) =>
  ({
    type: "placeOrder",
    playerId,
    resource: "wheat",
    side,
    kind: "limit",
    price: BigInt(price),
    quantity,
  }) as const;

function world() {
  const w = new World();
  w.do({ type: "join", playerId: "a", region: "terraferma" });
  w.do({ type: "join", playerId: "b", region: "lagoon" });
  return w;
}

describe("net sales (sales less purchases)", () => {
  it("start at zero, and stock piled up adds nothing", () => {
    const w = world();
    w.give("a", "bread", 500);
    w.advance(DAY);
    w.do({ type: "tick" });
    expect(turnoverOf(w.state, "a")).toBe(0n);
  });

  it("count a sale to a city", () => {
    const w = world();
    w.advance(HOUR).give("a", "bread", 20);
    const cash = w.cash("a");
    w.do({ type: "sellToCity", playerId: "a", city: "venezia", resource: "bread", quantity: 20 });
    expect(turnoverOf(w.state, "a")).toBe(w.cash("a") - cash);
    expect(turnoverOf(w.state, "a")).toBeGreaterThan(0n);
  });

  it("count a sale between merchants for the seller, net of tax, and the purchase against the buyer", () => {
    const w = world();
    w.give("a", "wheat", 100);
    w.do(order("b", "buy", 100, 30));
    const res = w.do(order("a", "sell", 100, 30));
    const tax = res.effects.ledger
      .filter((e) => e.reason === "market_tax")
      .reduce((n, e) => n + e.amount, 0n);
    expect(turnoverOf(w.state, "a")).toBe(3_000n - tax);
    expect(turnoverOf(w.state, "b")).toBe(-3_000n);
  });

  it("cannot be pumped by buying back and reselling", () => {
    const w = world();
    w.give("a", "wheat", 100);
    for (let i = 0; i < 3; i++) {
      w.do(order("b", "buy", 100, 30));
      w.do(order("a", "sell", 100, 30));
      w.do(order("a", "buy", 100, 30));
      w.do(order("b", "sell", 100, 30));
    }
    // Every round trip loses the taxes: nobody climbs by churning.
    expect(turnoverOf(w.state, "a")).toBeLessThanOrEqual(0n);
    expect(turnoverOf(w.state, "b")).toBeLessThanOrEqual(0n);
  });

  it("rank the season, best first, whatever the stock", () => {
    const w = world();
    w.give("b", "bread", 5_000);
    w.advance(HOUR).give("a", "bread", 20);
    w.do({ type: "sellToCity", playerId: "a", city: "venezia", resource: "bread", quantity: 20 });
    const standings = seasonStandings(w.ctx, w.state, w.now);
    expect(standings.map((s) => s.playerId)).toEqual(["a", "b"]);
    expect(standings[0]?.turnover).toBe(turnoverOf(w.state, "a"));
    // Net worth is still reported beside it.
    expect(standings[1]?.worth).toBeGreaterThan(standings[0]?.worth ?? 0n);
  });

  it("rank the week by the net sales made since it started", () => {
    const w = world();
    w.do({ type: "tick" });
    w.advance(HOUR).give("a", "bread", 20);
    w.do({ type: "sellToCity", playerId: "a", city: "venezia", resource: "bread", quantity: 20 });
    const [first, second] = weeklyStandings(w.ctx, w.state, w.now);
    expect(first).toEqual({ playerId: "a", gain: turnoverOf(w.state, "a") });
    expect(second).toEqual({ playerId: "b", gain: 0n });
  });

  it("start again from zero for a merchant who restarts", () => {
    const w = world();
    w.advance(HOUR).give("a", "bread", 20);
    w.do({ type: "sellToCity", playerId: "a", city: "venezia", resource: "bread", quantity: 20 });
    w.do({ type: "resetPlayer", playerId: "a" });
    w.do({ type: "join", playerId: "a", region: "lagoon" });
    expect(turnoverOf(w.state, "a")).toBe(0n);
  });

  it("are rebuilt from the ledger for a save made before them, the week included", () => {
    const w = world();
    w.do({ type: "tick" });
    const ledger: LedgerEntry[] = [];
    w.give("a", "wheat", 100);
    w.do(order("b", "buy", 100, 30));
    ledger.push(...w.do(order("a", "sell", 100, 30)).effects.ledger);
    const afterTrade = turnoverOf(w.state, "a");
    const weekStart = w.now + HOUR;
    w.advance(2 * HOUR).give("a", "bread", 20);
    const sale = { type: "sellToCity", playerId: "a", city: "venezia", resource: "bread" } as const;
    ledger.push(...w.do({ ...sale, quantity: 20 }).effects.ledger);
    const { turnover, ...old } = w.state;
    const adopted = adoptTurnover(old, ledger, weekStart);
    expect(adopted.turnover).toEqual(turnover);
    // The week started after the sale between merchants, before the sale to the city.
    expect(adopted.weekly?.start.a).toBe(afterTrade);
    expect(adopted.weekly?.start.b).toBe(-3_000n);
    expect(adoptTurnover(w.state, [], 0)).toBe(w.state);
  });
});
