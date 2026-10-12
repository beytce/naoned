import { describe, expect, it } from "vitest";
import {
  Bot,
  MarketView,
  PROFILES,
  Rng,
  type WorldSettingsInput,
  balesFor,
  createWorldState,
  drawBale,
  expectedBaleValue,
} from "../src/index.js";
import { DAY, HOUR, MIN, T0, World, makeContext } from "./helpers.js";

/** Faraj's bales for the tests: frozen here, never the settings of Venice. */
const bales: Partial<WorldSettingsInput> = {
  bales: {
    intervalHours: 6,
    maxStored: 2,
    onJoin: 1,
    cardsPerBale: 3,
    ownRegionWeightBps: 5_000,
    rarities: [
      {
        code: "common",
        weight: 7_000,
        resources: ["wheat", "clay", "wood"],
        quantityWeights: [55, 25, 10, 6, 4],
      },
      {
        code: "uncommon",
        weight: 2_200,
        resources: ["flour", "bread", "bricks", "planks"],
        quantityWeights: [65, 20, 9, 4, 2],
      },
      { code: "rare", weight: 600, resources: ["bread"], quantityWeights: [75, 15, 6, 3, 1] },
      { code: "epic", weight: 175, resources: ["bricks"], quantityWeights: [85, 10, 3, 1, 1] },
      {
        code: "legendary",
        weight: 25,
        resources: ["planks"],
        quantityWeights: [90, 7, 2, 1, 0],
      },
    ],
  },
};

function joined(overrides: Partial<WorldSettingsInput> = bales) {
  const w = new World(makeContext(overrides));
  w.do({ type: "join", playerId: "a", region: "terraferma" });
  return w;
}

function totalStock(w: World, playerId: string): number {
  return Object.values(w.state.inventories[playerId] ?? {}).reduce((n, l) => n + l.available, 0);
}

describe("Faraj's bales", () => {
  it("are off unless the world sets them", () => {
    const w = joined({});
    expect(balesFor(w.ctx, w.state, "a", w.now)).toBeNull();
    expect(w.try({ type: "openBale", playerId: "a" })).toMatchObject({
      ok: false,
      error: "bales_off",
    });
  });

  it("start with the welcome bale, then one every six hours, two at most", () => {
    const w = joined();
    expect(balesFor(w.ctx, w.state, "a", w.now)).toMatchObject({
      available: 1,
      max: 2,
      nextAt: T0 + 6 * HOUR,
    });
    w.at(6 * HOUR - MIN);
    expect(balesFor(w.ctx, w.state, "a", w.now)?.available).toBe(1);
    w.at(6 * HOUR);
    expect(balesFor(w.ctx, w.state, "a", w.now)).toMatchObject({ available: 2, nextAt: null });
    // A night away: the third and fourth bales are not kept.
    w.at(30 * HOUR);
    expect(balesFor(w.ctx, w.state, "a", w.now)?.available).toBe(2);
  });

  it("puts three cards of one to five units in the warehouse, through the stock journal", () => {
    const w = joined();
    const before = totalStock(w, "a");
    const res = w.do({ type: "openBale", playerId: "a" });
    const cards = balesFor(w.ctx, w.state, "a", w.now)?.last?.cards ?? [];
    expect(cards).toHaveLength(3);
    for (const c of cards) {
      expect(c.quantity).toBeGreaterThanOrEqual(1);
      expect(c.quantity).toBeLessThanOrEqual(5);
    }
    const gifts = res.effects.stock.filter((m) => m.reason === "bale_gift");
    expect(gifts).toHaveLength(3);
    expect(gifts.every((m) => m.ref === "bale:0")).toBe(true);
    const units = cards.reduce((n, c) => n + c.quantity, 0);
    expect(totalStock(w, "a") - before).toBe(units);
    expect(res.effects.ledger).toEqual([]);
    expect(res.effects.events.find((e) => e.type === "bale_opened")?.data).toMatchObject({
      seq: 0,
    });
  });

  it("refuse a bale that has not come yet", () => {
    const w = joined();
    w.do({ type: "openBale", playerId: "a" });
    expect(w.try({ type: "openBale", playerId: "a" })).toMatchObject({
      ok: false,
      error: "no_bale",
    });
  });

  it("keep the time already waited when a bale is opened, and restart it when they were full", () => {
    const w = joined();
    w.at(2 * HOUR);
    w.do({ type: "openBale", playerId: "a" });
    // The next one still comes six hours after joining.
    expect(balesFor(w.ctx, w.state, "a", w.now)).toMatchObject({
      available: 0,
      nextAt: T0 + 6 * HOUR,
    });
    // Full at 12 h; opened at 20 h: the clock starts again then, not at 12 h.
    w.at(20 * HOUR);
    w.do({ type: "openBale", playerId: "a" });
    expect(balesFor(w.ctx, w.state, "a", w.now)).toMatchObject({
      available: 1,
      nextAt: T0 + 26 * HOUR,
    });
  });

  it("are drawn in advance from the world's secret: reloading never changes a bale", () => {
    const open = () => {
      const w = joined();
      w.do({ type: "openBale", playerId: "a" });
      return balesFor(w.ctx, w.state, "a", w.now)?.last?.cards;
    };
    expect(open()).toEqual(open());
    const ctx = makeContext(bales);
    const other = { ...ctx, seed: "another world" };
    const first = drawBale(ctx, "a", "terraferma", 0);
    expect(first).toEqual(drawBale(ctx, "a", "terraferma", 0));
    const differ = [0, 1, 2, 3, 4].some(
      (seq) =>
        JSON.stringify(drawBale(ctx, "a", "terraferma", seq)) !==
        JSON.stringify(drawBale(other, "a", "terraferma", seq)),
    );
    expect(differ).toBe(true);
  });

  it("follow the odds of the settings: commons often, legendaries very rarely", () => {
    const ctx = makeContext(bales);
    const counts: Record<string, number> = {};
    const qty: Record<string, number> = {};
    const n = 20_000;
    for (let seq = 0; seq < n; seq++) {
      for (const c of drawBale(ctx, `p${seq % 50}`, "lagoon", seq)) {
        counts[c.rarity] = (counts[c.rarity] ?? 0) + 1;
        qty[`${c.rarity}:${c.quantity}`] = (qty[`${c.rarity}:${c.quantity}`] ?? 0) + 1;
      }
    }
    const cards = 3 * n;
    const share = (r: string) => (counts[r] ?? 0) / cards;
    expect(share("common")).toBeCloseTo(0.7, 1);
    expect(share("uncommon")).toBeCloseTo(0.22, 1);
    expect(share("rare")).toBeGreaterThan(0.045);
    expect(share("rare")).toBeLessThan(0.075);
    expect(share("legendary")).toBeGreaterThan(0.0012);
    expect(share("legendary")).toBeLessThan(0.0045);
    // A legendary card of five never comes (weight 0).
    expect(qty["legendary:5"]).toBeUndefined();
    // Commons of one unit are the most frequent.
    expect((qty["common:1"] ?? 0) / (counts.common ?? 1)).toBeCloseTo(0.55, 1);
  });

  it("send fewer of the merchant's own raw good, which they already produce", () => {
    const ctx = makeContext(bales);
    const by: Record<string, number> = {};
    for (let seq = 0; seq < 6_000; seq++) {
      for (const c of drawBale(ctx, "a", "terraferma", seq)) {
        if (c.rarity === "common") by[c.resource] = (by[c.resource] ?? 0) + 1;
      }
    }
    // Wheat weighs half as much as clay or wood for a merchant of Terraferma.
    const wheat = by.wheat ?? 0;
    expect(wheat / (by.clay ?? 1)).toBeGreaterThan(0.4);
    expect(wheat / (by.clay ?? 1)).toBeLessThan(0.6);
    expect(wheat / (by.wood ?? 1)).toBeLessThan(0.6);
  });

  it("are worth what the settings promise, on average", () => {
    const ctx = makeContext(bales);
    let value = 0n;
    const n = 20_000;
    for (let seq = 0; seq < n; seq++) {
      for (const c of drawBale(ctx, "x", "dolomites", seq)) {
        value += (ctx.settings.referencePrices[c.resource] ?? 0n) * BigInt(c.quantity);
      }
    }
    const measured = Number(value) / n;
    const expected = Number(expectedBaleValue(ctx, "dolomites"));
    expect(Math.abs(measured - expected) / expected).toBeLessThan(0.03);
  });

  it("give the same to a holder of the Pass Négociant", () => {
    const w = joined();
    w.do({ type: "join", playerId: "b", region: "terraferma" });
    w.do({ type: "grantPass", playerId: "b", until: T0 + 30 * DAY });
    w.at(40 * HOUR);
    const a = balesFor(w.ctx, w.state, "a", w.now);
    const b = balesFor(w.ctx, w.state, "b", w.now);
    expect(b?.available).toBe(a?.available);
    expect(b?.max).toBe(a?.max);
  });

  it("stop with the season", () => {
    const w = joined();
    const end = T0 + 42 * DAY;
    w.now = end;
    expect(w.try({ type: "openBale", playerId: "a" })).toMatchObject({
      ok: false,
      error: "season_over",
    });
  });

  it("announce no bale that would come after the season", () => {
    const w = joined();
    const end = T0 + 42 * DAY;
    w.now = end - 2 * HOUR;
    w.do({ type: "openBale", playerId: "a" });
    // Full until now: the next one would come four hours after the end.
    expect(balesFor(w.ctx, w.state, "a", w.now)).toMatchObject({ available: 1, nextAt: null });
    expect(balesFor(w.ctx, w.state, "a", end + DAY)?.available).toBe(1);
  });

  it("wait for merchants of a world saved before the bales", () => {
    const ctx = makeContext(bales);
    const w = new World(ctx);
    w.do({ type: "join", playerId: "a", region: "lagoon" });
    // As if the player had joined before the bales existed: no bale state saved.
    const { bales: _, ...rest } = w.state;
    w.state = { ...createWorldState(ctx), ...rest };
    w.at(7 * HOUR);
    expect(balesFor(w.ctx, w.state, "a", w.now)?.available).toBe(2);
    w.do({ type: "openBale", playerId: "a" });
    expect(balesFor(w.ctx, w.state, "a", w.now)?.available).toBe(1);
  });

  it("are opened by the merchant houses at each session, like a player", () => {
    const w = new World(makeContext(bales));
    const bot = new Bot("b1", PROFILES.producer, "terraferma", w.now);
    w.do({ type: "join", playerId: bot.id, region: bot.region });
    const session = {
      ctx: w.ctx,
      state: () => w.state,
      get now() {
        return w.now;
      },
      market: new MarketView(
        w.ctx,
        () => w.state,
        () => w.now,
      ),
      rng: new Rng(3),
      act: (cmd: Parameters<World["try"]>[0]) => w.try(cmd).ok,
    };
    // Sessions every eight hours for two days: the welcome bale, one a session, two at 24 h.
    for (let i = 0; i < 6; i++) {
      w.do({ type: "tick" });
      bot.play(session);
      w.advance(8 * HOUR);
    }
    expect(w.state.bales?.[bot.id]?.opened).toBe(7);
    expect(balesFor(w.ctx, w.state, bot.id, w.now)?.available).toBe(2);
  });
});
