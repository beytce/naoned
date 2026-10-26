import { describe, expect, it } from "vitest";
import { applyMutator, marketCityBps, parseSettings, seasonMutator } from "../src/index.js";
import { testSettings, testTerraferma } from "./fixture.js";
import { makeContext } from "./helpers.js";

/** E2-9 of the experts: a mutator a month, drawn the same for everyone, within a white list. */
const mutators = {
  from: "2026-12",
  catalog: [
    {
      code: "embargo",
      weight: 1,
      override: { mudaLotBps: 5_000, mudaPriceRiseBps: 20_000 },
    },
    {
      code: "gel",
      weight: 1,
      override: { cityPriceBps: { bread: 12_000 }, cityCapacityBps: { bread: 13_000 } },
    },
    { code: "milan", weight: 1, override: { milanTroopsBps: 15_000 } },
  ],
};
const muda = {
  everyDays: 3,
  hour: 9,
  lotPerActivePlayer: { spices: 10 },
  quotaPerPlayer: { spices: 5 },
  priceRiseBps: 2_000,
  maxStockLots: 2,
};
const settings = (more: Record<string, unknown> = {}) =>
  parseSettings({ ...testSettings, mutators, terraferma: testTerraferma, ...more });

describe("the mutator of the month", () => {
  it("plays no mutator before its first month, then one drawn the same for the month", () => {
    const s = settings();
    expect(seasonMutator(s, "2026-11")).toBeNull();
    const december = seasonMutator(s, "2026-12");
    expect(december).not.toBeNull();
    expect(seasonMutator(s, "2026-12")?.code).toBe(december?.code);
    // Over a year, more than one of the catalog.
    const codes = new Set(
      ["2027-01", "2027-02", "2027-03", "2027-04", "2027-05", "2027-06", "2027-07"].map(
        (m) => seasonMutator(s, m)?.code,
      ),
    );
    expect(codes.size).toBeGreaterThan(1);
  });

  it("changes only its keys, by its factors", () => {
    const s = settings({ muda });
    const embargo = applyMutator(s, mutators.catalog[0]?.override ?? {});
    expect(embargo.muda?.lotPerActivePlayer.spices).toBe(5);
    expect(embargo.muda?.priceRiseBps).toBe(4_000);
    const gel = applyMutator(s, mutators.catalog[1]?.override ?? {});
    // The cities' prices and capacities, all month: their sales and the road's orders alike.
    const ctx = { ...makeContext(), settings: gel };
    expect(marketCityBps(ctx, ctx.startAt, "venezia", "bread", "price")).toBe(12_000);
    expect(marketCityBps(ctx, ctx.startAt, "padova", "bread", "capacity")).toBe(13_000);
    expect(marketCityBps(ctx, ctx.startAt, "padova", "bricks", "price")).toBe(10_000);
    const milan = applyMutator(s, mutators.catalog[2]?.override ?? {});
    expect(milan.terraferma?.milan.troops).toBe(
      Math.floor(((s.terraferma?.milan.troops ?? 0) * 15_000) / 10_000),
    );
    // Nothing else moves.
    expect({ ...gel, monthBps: s.monthBps }).toEqual(s);
  });

  it("refuses any key off its white list: the Pass, the Dogana, the hours", () => {
    for (const override of [
      { pass: { perks: {} } },
      { marketMaker: { playerDailyQuota: { wheat: 100 } } },
      { openHours: { from: 0, to: 24 } },
    ]) {
      expect(() =>
        settings({ mutators: { ...mutators, catalog: [{ code: "bad", weight: 1, override }] } }),
      ).toThrow();
    }
  });
});
