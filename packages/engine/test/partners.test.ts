import { describe, expect, it } from "vitest";
import { type WorldSettingsInput, seasonEnd, turnoverOf } from "../src/index.js";
import { DAY, HOUR, World, makeContext } from "./helpers.js";

const rules = {
  commissions: { maxDays: 3 },
  colleganza: { maxDays: 7, maxShareBps: 7_500 },
} as Partial<WorldSettingsInput>;

function world() {
  const w = new World(makeContext(rules));
  for (const id of ["a", "b", "c"]) w.do({ type: "join", playerId: id, region: "terraferma" });
  w.give("b", "bread", 50);
  return w;
}
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "ok" : res.error);
const lastId = (w: World, kind: "commissions" | "colleganze") =>
  Object.keys(w.state[kind] ?? {}).at(-1) ?? "";

describe("a commission between merchants", () => {
  it("locks the buyer's ducats, pays the seller on delivery, the market's tax taken", () => {
    const w = world();
    const cash = { a: w.cash("a"), b: w.cash("b") };
    w.do({
      type: "postCommission",
      playerId: "a",
      resource: "bread",
      quantity: 20,
      unitPrice: 200n,
      days: 2,
    });
    const id = lastId(w, "commissions");
    expect(w.cash("a")).toBe(cash.a - 4_000n);
    expect(error(w.try({ type: "fillCommission", playerId: "a", commissionId: id }))).toBe(
      "own_commission",
    );
    expect(error(w.try({ type: "fillCommission", playerId: "c", commissionId: id }))).toBe(
      "insufficient_stock",
    );
    w.do({ type: "fillCommission", playerId: "b", commissionId: id });
    expect(w.stock("a", "bread").available).toBe(20);
    expect(w.stock("b", "bread").available).toBe(30);
    // 3 % of the market's tax, as at the Rialto.
    expect(w.cash("b")).toBe(cash.b + 4_000n - 120n);
    // As a sale on the Rialto: the seller's net sales up, the buyer's down.
    expect(turnoverOf(w.state, "b")).toBe(3_880n);
    expect(turnoverOf(w.state, "a")).toBe(-4_000n);
    expect(error(w.try({ type: "fillCommission", playerId: "b", commissionId: id }))).toBe(
      "commission_closed",
    );
  });

  it("may name its seller, and gives the ducats back when cancelled or expired", () => {
    const w = world();
    const cash = w.cash("a");
    w.do({
      type: "postCommission",
      playerId: "a",
      resource: "bread",
      quantity: 5,
      unitPrice: 200n,
      days: 1,
      to: "c",
    });
    const id = lastId(w, "commissions");
    expect(error(w.try({ type: "fillCommission", playerId: "b", commissionId: id }))).toBe(
      "not_for_you",
    );
    w.do({ type: "cancelCommission", playerId: "a", commissionId: id });
    expect(w.cash("a")).toBe(cash);
    w.do({
      type: "postCommission",
      playerId: "a",
      resource: "bread",
      quantity: 5,
      unitPrice: 200n,
      days: 1,
    });
    w.advance(DAY + HOUR).do({ type: "tick" });
    expect(w.cash("a")).toBe(cash);
    expect(
      error(
        w.try({
          type: "postCommission",
          playerId: "a",
          resource: "bread",
          quantity: 5,
          unitPrice: 200n,
          days: 9,
        }),
      ),
    ).toBe("invalid_quantity");
  });
});

describe("the colleganza", () => {
  it("lends an investor's ducats to a merchant, paid back with a share of its gains at term", () => {
    const w = world();
    const cash = { a: w.cash("a"), b: w.cash("b") };
    w.do({
      type: "offerColleganza",
      playerId: "a",
      amount: 10_000n,
      days: 2,
      shareBps: 5_000,
    });
    const id = lastId(w, "colleganze");
    expect(w.cash("a")).toBe(cash.a - 10_000n);
    expect(error(w.try({ type: "acceptColleganza", playerId: "a", colleganzaId: id }))).toBe(
      "own_colleganza",
    );
    w.do({ type: "acceptColleganza", playerId: "b", colleganzaId: id });
    expect(w.cash("b")).toBe(cash.b + 10_000n);
    // b sells for 4 000 net meanwhile.
    w.do({
      type: "postCommission",
      playerId: "c",
      resource: "bread",
      quantity: 20,
      unitPrice: 206n,
      days: 2,
    });
    w.do({ type: "fillCommission", playerId: "b", commissionId: lastId(w, "commissions") });
    const gain = turnoverOf(w.state, "b");
    w.advance(2 * DAY + HOUR).do({ type: "tick" });
    // The capital back, and half the gain, counted in a's net sales and out of b's.
    expect(w.cash("a")).toBe(cash.a + gain / 2n);
    expect(turnoverOf(w.state, "a")).toBe(gain / 2n);
    expect(turnoverOf(w.state, "b")).toBe(gain - gain / 2n);
    expect(w.state.colleganze?.[id]?.settled).toBe(true);
  });

  it("is refused past the share or the term allowed, and given back while no one took it", () => {
    const w = world();
    const cash = w.cash("a");
    const offer = (shareBps: number, days: number) =>
      w.try({ type: "offerColleganza", playerId: "a", amount: 5_000n, days, shareBps });
    expect(error(offer(9_000, 2))).toBe("invalid_quantity");
    expect(error(offer(5_000, 30))).toBe("invalid_quantity");
    expect(error(offer(5_000, 2))).toBe("ok");
    w.do({ type: "cancelColleganza", playerId: "a", colleganzaId: lastId(w, "colleganze") });
    expect(w.cash("a")).toBe(cash);
  });
});

describe("a colleganza taken late in the season", () => {
  it("comes to term by the season's end at the latest, and is settled then", () => {
    const w = world();
    const end = seasonEnd(w.ctx);
    w.at(end - DAY - w.ctx.startAt);
    w.do({ type: "offerColleganza", playerId: "a", amount: 10_000n, days: 3, shareBps: 5_000 });
    const id = lastId(w, "colleganze");
    w.do({ type: "acceptColleganza", playerId: "b", colleganzaId: id });
    expect(w.state.colleganze?.[id]?.endsAt).toBe(end);
    w.at(end - w.ctx.startAt).do({ type: "tick" });
    expect(w.state.colleganze?.[id]?.settled).toBe(true);
  });

  it("pays its share before the final ranking is frozen", () => {
    const w = world();
    const end = seasonEnd(w.ctx);
    w.at(end - DAY - w.ctx.startAt);
    w.do({ type: "offerColleganza", playerId: "a", amount: 10_000n, days: 3, shareBps: 5_000 });
    const id = lastId(w, "colleganze");
    w.do({ type: "acceptColleganza", playerId: "b", colleganzaId: id });
    w.do({
      type: "postCommission",
      playerId: "c",
      resource: "bread",
      quantity: 20,
      unitPrice: 206n,
      days: 1,
    });
    w.do({ type: "fillCommission", playerId: "b", commissionId: lastId(w, "commissions") });
    const res = w.at(end - w.ctx.startAt).do({ type: "tick" });
    const closed = res.effects.events.find((e) => e.type === "season_closed");
    const standings = (closed?.data?.standings ?? []) as { playerId: string; turnover: string }[];
    // The investor's share is in the ranking, taken from the merchant's.
    expect(BigInt(standings.find((s) => s.playerId === "a")?.turnover ?? "0")).toBeGreaterThan(0n);
  });

  it("keeps its full term when the season lasts longer", () => {
    const w = world();
    w.do({ type: "offerColleganza", playerId: "a", amount: 10_000n, days: 3, shareBps: 5_000 });
    const id = lastId(w, "colleganze");
    w.do({ type: "acceptColleganza", playerId: "b", colleganzaId: id });
    expect(w.state.colleganze?.[id]?.endsAt).toBe(w.now + 3 * DAY);
  });
});
