import { describe, expect, it } from "vitest";
import {
  type Command,
  type WorldSettingsInput,
  hourIn,
  incantoLots,
  incantoPrice,
} from "../src/index.js";
import { testSettings } from "./fixture.js";
import { HOUR, MIN, World, makeContext } from "./helpers.js";

/**
 * The incanto (R11 of the audit of 27 October 2026, docs/plan-rupture.md): at the Sera of the day
 * the galleys come, a share of their lot is auctioned in a few lots. Bids are maxima left ahead:
 * the price is the second maximum and a step; the leader's maximum waits on hold, its rest given
 * back at the close; the price paid leaves the game. A bid in the last minutes extends the lot.
 */

const muda = {
  everyDays: 3,
  hour: 9,
  lotPerActivePlayer: { spices: 4, salt: 10 },
  quotaPerPlayer: { spices: 3, salt: 8 },
  priceRiseBps: 0,
  maxStockLots: 2,
};
const incanto = {
  shareBps: 5_000,
  lots: 3,
  hour: 20,
  firstMinute: 10,
  everyMinutes: 10,
  extendMinutes: 2,
  startBps: 6_000,
  stepBps: 500,
  perPlayer: 1,
};
const settings = (more: Partial<WorldSettingsInput> = {}) =>
  ({
    referencePrices: { ...testSettings.referencePrices, spices: 1_500, salt: 300 },
    muda,
    incanto,
    ...more,
  }) as Partial<WorldSettingsInput>;

function world(more: Partial<WorldSettingsInput> = {}) {
  const w = new World(makeContext(settings(more)));
  for (const id of ["a", "b", "c"]) w.do({ type: "join", playerId: id, region: "terraferma" });
  // The galleys come at 9 h.
  w.at(9 * HOUR + MIN).do({ type: "tick" });
  return w;
}

const bid = (w: World, playerId: string, lotId: string, max: bigint) =>
  w.try({ type: "incantoBid", playerId, lotId, max } as Command);
const error = (res: ReturnType<World["try"]>) => (res.ok ? "ok" : res.error);
const hold = (w: World, id: string) => w.state.accounts[`hold:${id}`] ?? 0n;
const sink = (w: World) => w.state.accounts["system:sink"] ?? 0n;

describe("the incanto of the galleys", () => {
  it("auctions a share of the lot in lots closing at the Sera, the rest on the quay", () => {
    const w = world();
    // Three merchants: 12 spices and 30 salt; half to the incanto.
    expect(w.state.muda?.stock).toEqual({ spices: 6, salt: 15 });
    const lots = incantoLots(w.state);
    expect(lots).toHaveLength(3);
    expect(lots.map((l) => l.goods)).toEqual([
      { spices: 2, salt: 5 },
      { spices: 2, salt: 5 },
      { spices: 2, salt: 5 },
    ]);
    const [first, second, third] = lots;
    expect(hourIn(first?.closesAt ?? 0)).toBe(20);
    expect((second?.closesAt ?? 0) - (first?.closesAt ?? 0)).toBe(10 * MIN);
    expect((third?.closesAt ?? 0) - (first?.closesAt ?? 0)).toBe(20 * MIN);
    // Opens at 60 % of what its goods are worth at the reference.
    if (!first) throw new Error("no lot");
    expect(incantoPrice(w.ctx, first)).toBe(((2n * 1_500n + 5n * 300n) * 6n) / 10n);
  });

  it("holds the leader's maximum, prices at the second maximum and a step, gives back the passed", () => {
    const w = world();
    const lot = incantoLots(w.state)[0];
    if (!lot) throw new Error("no lot");
    const start = incantoPrice(w.ctx, lot);
    const cash = w.cash("a");
    expect(error(bid(w, "a", lot.id, 4_000n))).toBe("ok");
    expect(hold(w, "a")).toBe(4_000n);
    expect(w.cash("a")).toBe(cash - 4_000n);
    expect(incantoPrice(w.ctx, incantoLots(w.state)[0] ?? lot)).toBe(start);
    // B bids under A's maximum: A leads, the price climbs to B's maximum and a step.
    expect(error(bid(w, "b", lot.id, 3_500n))).toBe("ok");
    expect(incantoLots(w.state)[0]?.leader).toBe("a");
    expect(incantoPrice(w.ctx, incantoLots(w.state)[0] ?? lot)).toBe(3_500n + 175n);
    expect(hold(w, "b")).toBe(0n);
    // C bids over: C leads, A's maximum comes back.
    expect(error(bid(w, "c", lot.id, 6_000n))).toBe("ok");
    expect(incantoLots(w.state)[0]?.leader).toBe("c");
    expect(hold(w, "a")).toBe(0n);
    expect(w.cash("a")).toBe(cash);
    expect(incantoPrice(w.ctx, incantoLots(w.state)[0] ?? lot)).toBe(4_000n + 200n);
    expect(error(bid(w, "b", lot.id, 100n))).toBe("bid_too_low");
  });

  it("gives the lot to its leader at the close, the price out of the game, the rest back", () => {
    const w = world();
    const lot = incantoLots(w.state)[0];
    if (!lot) throw new Error("no lot");
    bid(w, "a", lot.id, 6_000n);
    bid(w, "b", lot.id, 4_000n);
    const cash = w.cash("a");
    const burnt = sink(w);
    w.at(lot.closesAt - w.ctx.startAt + MIN).do({ type: "tick" });
    expect(w.stock("a", "spices").available).toBe(2);
    expect(w.stock("a", "salt").available).toBe(5);
    expect(hold(w, "a")).toBe(0n);
    expect(w.cash("a")).toBe(cash + 6_000n - 4_200n);
    expect(sink(w) - burnt).toBe(4_200n);
    expect(error(bid(w, "c", lot.id, 9_000n))).toBe("lot_closed");
    // An unsold lot goes back to the quay.
    const quay = w.state.muda?.stock.spices ?? 0;
    const last = incantoLots(w.state)[2];
    w.at((last?.closesAt ?? 0) - w.ctx.startAt + MIN).do({ type: "tick" });
    expect(w.state.muda?.stock.spices).toBe(quay + 4);
  });

  it("extends a lot bid on in its last minutes", () => {
    const w = world();
    const lot = incantoLots(w.state)[0];
    if (!lot) throw new Error("no lot");
    w.at(lot.closesAt - w.ctx.startAt - MIN);
    expect(error(bid(w, "a", lot.id, 5_000n))).toBe("ok");
    expect(incantoLots(w.state)[0]?.closesAt).toBe(w.now + 2 * MIN);
  });

  it("lets a merchant lead one lot of a Sera at most", () => {
    const w = world();
    const [first, second] = incantoLots(w.state);
    if (!first || !second) throw new Error("no lots");
    expect(error(bid(w, "a", first.id, 5_000n))).toBe("ok");
    expect(error(bid(w, "a", second.id, 5_000n))).toBe("one_lot");
    // Raising its own maximum on its lot is fine.
    expect(error(bid(w, "a", first.id, 7_000n))).toBe("ok");
    expect(hold(w, "a")).toBe(7_000n);
  });

  it("leaves the whole lot on the quay without its settings", () => {
    const w = world({ incanto: undefined } as never);
    expect(w.state.muda?.stock).toEqual({ spices: 12, salt: 30 });
    expect(incantoLots(w.state)).toEqual([]);
  });
});
