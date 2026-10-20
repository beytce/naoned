import { describe, expect, it } from "vitest";
import { type WorldSettingsInput, openTenders } from "../src/index.js";
import { HOUR, World, makeContext } from "./helpers.js";

const tenders = {
  tenders: {
    everyDays: 2,
    bidHours: 24,
    deliverHours: 48,
    quantity: { bread: [20, 20] },
    ceilingBps: 15_000,
    cautionBps: 2_000,
  },
} as Partial<WorldSettingsInput>;

function world() {
  const w = new World(makeContext(tenders));
  for (const id of ["a", "b", "c"]) {
    w.do({ type: "join", playerId: id, region: "terraferma" });
    w.give(id, "bread", 40);
  }
  w.do({ type: "tick" });
  return w;
}

const tenderOf = (w: World) => {
  const t = openTenders(w.state, w.now)[0];
  if (!t) throw new Error("no tender");
  return t;
};
const bid = (w: World, playerId: string, price: bigint, quantity: number) =>
  w.try({ type: "tenderBid", playerId, tenderId: tenderOf(w).id, price, quantity });
const error = (res: ReturnType<World["try"]>) => (res.ok ? "ok" : res.error);

describe("the Doge's tenders", () => {
  it("opens one on the tick, a good, a quantity and a ceiling over its reference", () => {
    const w = world();
    const t = tenderOf(w);
    expect(t.resource).toBe("bread");
    expect(t.quantity).toBe(20);
    // Bread at 180, ceiling 150 %.
    expect(t.ceiling).toBe(270n);
    expect(t.closeAt).toBe(t.openedAt + 24 * HOUR);
    expect(t.deadline).toBe(t.closeAt + 48 * HOUR);
  });

  it("takes sealed bids under the ceiling, the caution locked, a new bid replacing the old", () => {
    const w = world();
    const before = w.cash("a");
    expect(error(bid(w, "a", 300n, 10))).toBe("over_ceiling");
    expect(error(bid(w, "a", 200n, 30))).toBe("invalid_quantity");
    expect(error(bid(w, "a", 200n, 10))).toBe("ok");
    // 20 % of 10 × 200.
    expect(w.cash("a")).toBe(before - 400n);
    expect(error(bid(w, "a", 150n, 20))).toBe("ok");
    expect(w.cash("a")).toBe(before - 600n);
    // Sealed: the tender shows no price to the others.
    expect(Object.keys(tenderOf(w).bids)).toEqual(["a"]);
  });

  it("awards the cheapest at the close, the next for what is left, refunds the others", () => {
    const w = world();
    const t = tenderOf(w);
    const cash = { a: w.cash("a"), b: w.cash("b"), c: w.cash("c") };
    bid(w, "a", 200n, 15);
    bid(w, "b", 180n, 10);
    bid(w, "c", 250n, 10);
    w.at(t.closeAt - w.ctx.startAt + 60_000);
    const res = w.do({ type: "tick" });
    const won = w.state.tenders?.[t.id]?.awarded ?? {};
    expect(won).toEqual({
      b: { quantity: 10, price: 180n, caution: 360n, delivered: false },
      a: { quantity: 10, price: 200n, caution: 400n, delivered: false },
    });
    // a bid 15, won 10: the caution of the 5 others comes back; c is refunded whole.
    expect(w.cash("a")).toBe(cash.a - 400n);
    expect(w.cash("c")).toBe(cash.c);
    expect(res.effects.events.some((e) => e.type === "tender_awarded")).toBe(true);
    expect(
      error(w.try({ type: "tenderBid", playerId: "c", tenderId: t.id, price: 100n, quantity: 5 })),
    ).toBe("tender_closed");
  });

  it("pays the winner its price on delivery and gives the caution back", () => {
    const w = world();
    const t = tenderOf(w);
    const cash = w.cash("b");
    bid(w, "b", 180n, 10);
    w.at(t.closeAt - w.ctx.startAt + 60_000).do({ type: "tick" });
    expect(error(w.try({ type: "tenderDeliver", playerId: "a", tenderId: t.id }))).toBe(
      "not_awarded",
    );
    w.do({ type: "tenderDeliver", playerId: "b", tenderId: t.id });
    expect(w.stock("b", "bread").available).toBe(30);
    expect(w.cash("b")).toBe(cash + 1_800n);
    expect(error(w.try({ type: "tenderDeliver", playerId: "b", tenderId: t.id }))).toBe(
      "already_delivered",
    );
  });

  it("keeps the caution of a winner who did not deliver in time: it leaves the game", () => {
    const w = world();
    const t = tenderOf(w);
    const cash = w.cash("b");
    bid(w, "b", 180n, 10);
    w.at(t.closeAt - w.ctx.startAt + 60_000).do({ type: "tick" });
    w.at(t.deadline - w.ctx.startAt + 60_000);
    const res = w.do({ type: "tick" });
    expect(w.cash("b")).toBe(cash - 360n);
    expect(res.effects.ledger.some((e) => e.reason === "tender_forfeit")).toBe(true);
    expect(error(w.try({ type: "tenderDeliver", playerId: "b", tenderId: t.id }))).toBe(
      "tender_closed",
    );
  });
});
