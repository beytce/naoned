import { describe, expect, it } from "vitest";
import {
  type Command,
  type WorldSettingsInput,
  mudaLotBps,
  rumourBook,
  rumourTruth,
  spyReport,
  turnoverOf,
} from "../src/index.js";
import { DAY, HOUR, World, makeContext } from "./helpers.js";

/**
 * The Broglio (R8 of the audit of 27 October 2026, docs/plan-rupture.md): each morning two
 * private rumours of what is coming — an event, the Muda's lot — from sources more or less
 * reliable; rumours sold between merchants, false ones forged against Influence and sometimes
 * unmasked, a spy at a rival's. Never a merchant named, never a free text.
 */

const events = {
  everyDays: 2,
  durationHours: 24,
  catalog: [
    { code: "famine", weight: 1, city: "venezia", cityPriceBps: { bread: 15_000 } },
    { code: "fire", weight: 1, city: "padova", cityPriceBps: { bricks: 15_000 } },
  ],
};
const muda = {
  everyDays: 3,
  hour: 9,
  lotPerActivePlayer: { spices: 10 },
  quotaPerPlayer: { spices: 5 },
  priceRiseBps: 0,
  maxStockLots: 2,
  lotSpreadBps: 2_000,
};
const broglio = (sources: { code: string; reliabilityBps: number; weight: number }[]) => ({
  perDay: 2,
  sources,
  newcomerDays: 0,
  newcomerMinBps: 8_500,
  maxOffers: 3,
  forge: { perDay: 1, recipients: 3, reliabilityBps: 5_000, unmaskBps: 10_000 },
  spy: { cost: 2_000, days: 7 },
});
const MIXED = [
  { code: "gondoliere", reliabilityBps: 4_000, weight: 1 },
  { code: "senato", reliabilityBps: 8_500, weight: 1 },
];

const world = (sources = MIXED, more: Record<string, unknown> = {}) => {
  const w = new World(
    makeContext({
      events,
      muda,
      broglio: { ...broglio(sources), ...more },
    } as unknown as Partial<WorldSettingsInput>),
  );
  w.at(9 * HOUR);
  for (const id of ["a", "b", "c", "d", "e"])
    w.do({ type: "join", playerId: id, region: "terraferma" });
  return w;
};
const error = (res: ReturnType<World["try"]>) => (res.ok ? "ok" : res.error);
const today = (w: World, id = "a") => rumourBook(w.ctx, w.state, id, w.now).today;

describe("the rumours of the morning", () => {
  it("brings two private rumours a day, the same all day, from the catalog's sources", () => {
    const w = world();
    const mine = today(w);
    expect(mine).toHaveLength(2);
    for (const r of mine) expect(["gondoliere", "senato"]).toContain(r.source);
    expect(today(w)).toEqual(mine);
    w.advance(HOUR * 5);
    expect(today(w)).toEqual(mine);
    // Someone else hears other rumours.
    expect(today(w, "b").map((r) => r.id)).not.toEqual(mine.map((r) => r.id));
  });

  it("tells the truth as often as its source is reliable", () => {
    const sure = world([{ code: "senato", reliabilityBps: 10_000, weight: 1 }]);
    const liar = world([{ code: "gondoliere", reliabilityBps: 0, weight: 1 }]);
    for (let d = 0; d < 8; d++) {
      for (const r of today(sure)) expect(rumourTruth(sure.ctx, r.subject)).toBe(true);
      for (const r of today(liar)) expect(rumourTruth(liar.ctx, r.subject)).toBe(false);
      sure.advance(DAY);
      liar.advance(DAY);
    }
  });

  it("gives the newcomer reliable sources only", () => {
    const w = world(MIXED, { newcomerDays: 3 });
    for (let d = 0; d < 3; d++) {
      for (const r of today(w)) expect(r.reliabilityBps).toBeGreaterThanOrEqual(8_500);
      w.advance(DAY);
    }
  });

  it("brings the Muda a lot of 80 to 120 %, drawn from the world's secret", () => {
    const w = world();
    const spreads = Array.from({ length: 12 }, (_, k) => mudaLotBps(w.ctx, k));
    for (const b of spreads) {
      expect(b).toBeGreaterThanOrEqual(8_000);
      expect(b).toBeLessThanOrEqual(12_000);
    }
    expect(new Set(spreads).size).toBeGreaterThan(1);
  });
});

describe("the galleys' lot for a single merchant", () => {
  it("never brings nothing where the usual lot is a unit", () => {
    for (const seed of ["a", "b", "c", "d", "e", "f", "g", "h"]) {
      const single = { ...muda, lotPerActivePlayer: { spices: 1 } };
      const ctx = {
        ...makeContext({ muda: single } as unknown as Partial<WorldSettingsInput>),
        seed,
      };
      const w = new World(ctx);
      w.at(HOUR).do({ type: "join", playerId: "a", region: "terraferma" });
      for (let k = 0; k < 4; k++) {
        w.at(9 * HOUR + 3 * k * DAY + HOUR).do({ type: "tick" });
        expect(w.state.muda?.lot.spices ?? 0).toBeGreaterThan(0);
      }
    }
  });
});

describe("rumours sold between merchants", () => {
  it("sells a copy, paid through the ledger, out of the net sales", () => {
    const w = world();
    const [r] = today(w);
    const price = 500n;
    w.do({ type: "offerRumour", playerId: "a", rumourId: r?.id ?? "", price } as Command);
    const offer = Object.values(w.state.broglio?.offers ?? {})[0];
    expect(error(w.try({ type: "buyRumour", playerId: "a", offerId: offer?.id } as Command))).toBe(
      "own_offer",
    );
    const cash = { a: w.cash("a"), b: w.cash("b") };
    w.do({ type: "buyRumour", playerId: "b", offerId: offer?.id } as Command);
    expect(w.cash("a")).toBe(cash.a + price);
    expect(w.cash("b")).toBe(cash.b - price);
    expect(turnoverOf(w.state, "a")).toBe(0n);
    expect(rumourBook(w.ctx, w.state, "b", w.now).today.map((x) => x.subject)).toContainEqual(
      r?.subject,
    );
    expect(error(w.try({ type: "buyRumour", playerId: "b", offerId: offer?.id } as Command))).toBe(
      "already_bought",
    );
  });

  it("keeps an offer to a named merchant for that merchant", () => {
    const w = world();
    const [r] = today(w);
    w.do({
      type: "offerRumour",
      playerId: "a",
      rumourId: r?.id ?? "",
      price: 100n,
      to: "c",
    } as Command);
    const offer = Object.values(w.state.broglio?.offers ?? {})[0];
    expect(error(w.try({ type: "buyRumour", playerId: "b", offerId: offer?.id } as Command))).toBe(
      "not_for_you",
    );
    expect(error(w.try({ type: "buyRumour", playerId: "c", offerId: offer?.id } as Command))).toBe(
      "ok",
    );
  });
});

describe("false rumours", () => {
  it("refuses a true subject, delivers a false one to three merchants, and unmasks it", () => {
    const sure = world([{ code: "senato", reliabilityBps: 10_000, weight: 1 }]);
    const truth = today(sure).find((r) => r.subject.kind === "event")?.subject;
    if (!truth || truth.kind !== "event") throw new Error("no event rumour");
    expect(error(sure.try({ type: "forgeRumour", playerId: "a", subject: truth } as Command))).toBe(
      "rumour_true",
    );
    const lie = { ...truth, code: truth.code === "famine" ? "fire" : "famine" };
    sure.do({ type: "forgeRumour", playerId: "a", subject: lie } as Command);
    expect(error(sure.try({ type: "forgeRumour", playerId: "a", subject: lie } as Command))).toBe(
      "forge_limit",
    );
    // The next morning, three others hear it from « a merchant of the Rialto ».
    sure.advance(DAY).do({ type: "tick" });
    const heard = ["b", "c", "d", "e"].filter((id) =>
      today(sure, id).some(
        (r) => r.forged && r.subject.kind === "event" && r.subject.code === lie.code,
      ),
    );
    expect(heard).toHaveLength(3);
    expect(today(sure).some((r) => r.forged)).toBe(false);
    // Its day passed and false: unmasked (sure here), the author's name kept from the dupes.
    sure.at(lie.day * DAY + 2 * DAY);
    const res = sure.do({ type: "tick" });
    const unmasked = res.effects.events.find((e) => e.type === "liar_unmasked");
    expect(unmasked?.playerId).toBe("a");
    const dupe = res.effects.events.find((e) => e.type === "rumour_unmasked");
    expect(dupe?.data).not.toHaveProperty("author");
  });
});

describe("the spy", () => {
  it("costs ducats, shows one of the rival's offers a day, and can be chased", () => {
    const w = world();
    w.give("b", "bread", 20);
    w.do({
      type: "placeOrder",
      playerId: "b",
      resource: "bread",
      side: "sell",
      kind: "limit",
      price: 260n,
      quantity: 10,
    } as Command);
    const cash = w.cash("a");
    w.do({ type: "hireSpy", playerId: "a", target: "b" } as Command);
    expect(w.cash("a")).toBe(cash - 2_000n);
    expect(error(w.try({ type: "hireSpy", playerId: "a", target: "c" } as Command))).toBe(
      "spy_exists",
    );
    expect(spyReport(w.ctx, w.state, "a", w.now)).toMatchObject({
      target: "b",
      offer: { resource: "bread", side: "sell", quantity: 10 },
    });
    w.do({ type: "chaseSpy", playerId: "b" } as Command);
    expect(spyReport(w.ctx, w.state, "a", w.now)).toBeNull();
  });
});

describe("the Broglio without its settings", () => {
  it("brings no rumour", () => {
    const w = new World(makeContext());
    w.at(9 * HOUR).do({ type: "join", playerId: "a", region: "terraferma" });
    expect(rumourBook(w.ctx, w.state, "a", w.now).today).toEqual([]);
    expect(error(w.try({ type: "hireSpy", playerId: "a", target: "a" } as Command))).toBe(
      "broglio_off",
    );
  });
});
