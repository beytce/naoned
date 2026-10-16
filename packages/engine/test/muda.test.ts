import { describe, expect, it } from "vitest";
import {
  type WorldSettingsInput,
  type WorldState,
  mudaPrice,
  mudaQuota,
  mudaView,
  nextMudaAt,
  weekIndex,
} from "../src/index.js";
import { testDecrees, testSettings } from "./fixture.js";
import { DAY, HOUR, T0, World, makeContext } from "./helpers.js";

/**
 * The galleys of the Muda bring the goods from overseas to Venice every few days: the Dogana sells
 * them, dearer as the lot runs out, a few units per merchant and per arrival.
 */
const muda = {
  everyDays: 3,
  hour: 9,
  lotPerActivePlayer: { spices: 4, salt: 10 },
  quotaPerPlayer: { spices: 3, salt: 8 },
  priceRiseBps: 6_000,
  maxStockLots: 2,
};
const settings = (more: Partial<WorldSettingsInput> = {}) => ({
  referencePrices: { ...testSettings.referencePrices, spices: 1_500, salt: 300 },
  muda,
  ...more,
});

function world(more: Partial<WorldSettingsInput> = {}) {
  const w = new World(makeContext(settings(more)));
  w.do({ type: "join", playerId: "a", region: "terraferma" });
  w.do({ type: "join", playerId: "b", region: "lagoon" });
  return w;
}

const buy = (w: World, playerId: string, resource: string, quantity: number) =>
  w.try({ type: "placeOrder", playerId, resource, side: "buy", kind: "instant", quantity });
const bought = (res: ReturnType<World["try"]>) =>
  res.ok ? res.effects.trades.reduce((n, t) => n + t.quantity, 0) : 0;

describe("the galleys of the Muda", () => {
  it("arrive every few days at the set hour, with a lot in proportion to active merchants", () => {
    const w = world();
    expect(nextMudaAt(w.ctx, T0)).toBe(T0 + 9 * HOUR);
    w.at(8 * HOUR).do({ type: "tick" });
    expect(w.state.muda?.stock ?? {}).toEqual({});
    const res = w.at(9 * HOUR).do({ type: "tick" });
    expect(res.effects.events.some((e) => e.type === "muda_arrived")).toBe(true);
    expect(w.state.muda?.stock).toEqual({ spices: 8, salt: 20 });
    expect(nextMudaAt(w.ctx, w.now)).toBe(T0 + 3 * DAY + 9 * HOUR);
    // Once only per arrival.
    expect(
      w
        .at(10 * HOUR)
        .do({ type: "tick" })
        .effects.events.some((e) => e.type === "muda_arrived"),
    ).toBe(false);
  });

  it("are sold by the Dogana, dearer as the lot runs out", () => {
    const w = world();
    w.at(9 * HOUR).do({ type: "tick" });
    const first = mudaPrice(w.ctx, w.state, "spices");
    expect(first).toBe(1_500n);
    const res = buy(w, "a", "spices", 3);
    expect(bought(res)).toBe(3);
    expect(res.ok && res.effects.trades[0]?.price).toBe(1_500n);
    expect(w.state.muda?.stock.spices).toBe(5);
    w.advance(HOUR).do({ type: "tick" });
    // 3 of 8 gone: 3/8 of the rise.
    expect(mudaPrice(w.ctx, w.state, "spices")).toBe(1_500n + (1_500n * 6_000n * 3n) / 80_000n);
  });

  it("give each merchant a few units per arrival", () => {
    const w = world();
    w.at(9 * HOUR).do({ type: "tick" });
    expect(bought(buy(w, "a", "spices", 5))).toBe(3);
    expect(bought(buy(w, "a", "spices", 1))).toBe(0);
    // A new day is no new arrival.
    w.at(DAY + 10 * HOUR).do({ type: "tick" });
    expect(bought(buy(w, "a", "spices", 1))).toBe(0);
    expect(mudaView(w.ctx, w.state, "a", w.now).left.spices).toBe(0);
    // The next galleys: a new quota.
    w.at(3 * DAY + 9 * HOUR).do({ type: "tick" });
    expect(bought(buy(w, "a", "spices", 1))).toBe(1);
  });

  it("add to what is left, up to a few lots", () => {
    // Merchants still counted as active a week on.
    const w = world({ activeWindowHours: 240 });
    w.at(9 * HOUR).do({ type: "tick" });
    w.at(3 * DAY + 9 * HOUR).do({ type: "tick" });
    expect(w.state.muda?.stock.spices).toBe(16);
    w.at(6 * DAY + 9 * HOUR).do({ type: "tick" });
    expect(w.state.muda?.stock.spices).toBe(16);
  });

  it("are off without lots", () => {
    const w = world({ muda: undefined });
    w.at(9 * HOUR).do({ type: "tick" });
    expect(w.state.muda).toBeUndefined();
    expect(bought(buy(w, "a", "spices", 1))).toBe(0);
  });

  it("open a larger quota to the Levant's merchants, and to the families of its charter", () => {
    const w = world({
      specialties: { unlockLevels: 5, options: { levant: { mudaQuotaBps: 10_000 } } },
      decrees: {
        ...testDecrees,
        levant: { memberQuotaBps: 5_000, othersCutBps: 5_000 },
      },
    });
    const quota = (state: WorldState, id: string) => mudaQuota(w.ctx, state, id, "spices", w.now);
    expect(quota(w.state, "a")).toBe(3);
    const merchant = { ...w.state, players: { ...w.state.players } };
    merchant.players.a = {
      ...(merchant.players.a as NonNullable<WorldState["players"]["a"]>),
      specialty: "levant",
    };
    expect(quota(merchant, "a")).toBe(6);
    // The Levant decreed by the Rossi: a member gets half as much again, the others half less.
    const charter: WorldState = {
      ...w.state,
      families: {
        ...(w.state.families ?? { memberOf: {} }),
        memberOf: { a: "rossi", b: "verdi" },
      } as WorldState["families"],
      campaign: {
        ...(w.state.campaign as NonNullable<WorldState["campaign"]>),
        closed: false,
        decrees: {
          week: weekIndex(w.ctx, w.now),
          family: "rossi",
          items: [{ code: "levant" }],
          shares: {},
          cities: [],
        },
      },
    };
    expect(quota(charter, "a")).toBe(4);
    expect(quota(charter, "b")).toBe(1);
  });
});
