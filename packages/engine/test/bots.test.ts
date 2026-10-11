import { describe, expect, it } from "vitest";
import {
  Bot,
  MARKET_MAKER,
  MarketView,
  PROFILES,
  Rng,
  botsWanted,
  parseSettings,
} from "../src/index.js";
import { testSettings } from "./fixture.js";
import { DAY, HOUR, World } from "./helpers.js";

describe("bot population", () => {
  const settings = (population: number) => parseSettings({ ...testSettings, bots: { population } });

  it("fills the world up to the target population, never beyond", () => {
    expect(botsWanted(settings(15), 3)).toBe(12);
    expect(botsWanted(settings(15), 15)).toBe(0);
    expect(botsWanted(settings(15), 40)).toBe(0);
  });

  it("has no bots unless the world asks for them", () => {
    expect(botsWanted(parseSettings(testSettings), 0)).toBe(0);
  });
});

describe("bots", () => {
  it("play by the rules: they produce, trade with each other and keep the books balanced", () => {
    const w = new World();
    const rng = new Rng(7);
    const bots = [
      new Bot("b1", PROFILES.producer, "terraferma", w.now),
      new Bot("b2", PROFILES.artisan, "terraferma", w.now),
      new Bot("b3", PROFILES.builder, "lagoon", w.now),
      new Bot("b4", PROFILES.builder, "dolomites", w.now),
      new Bot("b5", PROFILES.speculator, "lagoon", w.now),
    ];
    for (const b of bots) w.do({ type: "join", playerId: b.id, region: b.region });
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
      rng,
      // The harness checks the six invariants after every command.
      act: (cmd: Parameters<World["try"]>[0]) => w.try(cmd).ok,
    };
    const end = w.now + 4 * DAY;
    while (w.now < end) {
      w.do({ type: "tick" });
      for (const b of bots) b.play(session);
      w.advance(3 * HOUR);
    }
    const between = w.trades.filter(
      (t) => t.buyerId !== MARKET_MAKER && t.sellerId !== MARKET_MAKER,
    );
    expect(between.length).toBeGreaterThan(0);
    for (const b of bots) {
      expect(w.state.players[b.id]?.lastActionAt).toBeGreaterThan(end - 4 * HOUR);
    }
    expect(Object.keys(w.state.buildings).length).toBeGreaterThan(10);
  });
});

describe("bots in a live world", () => {
  it("never sell to the market maker: their surplus waits on the book for people", () => {
    const w = new World();
    const rng = new Rng(3);
    const live = { spareMarketMaker: true, generous: true };
    const bots = [
      new Bot("b1", PROFILES.producer, "terraferma", w.now, live),
      new Bot("b2", PROFILES.artisan, "terraferma", w.now, live),
      new Bot("b3", PROFILES.builder, "lagoon", w.now, live),
      new Bot("b4", PROFILES.builder, "dolomites", w.now, live),
    ];
    for (const b of bots) w.do({ type: "join", playerId: b.id, region: b.region });
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
      rng,
      act: (cmd: Parameters<World["try"]>[0]) => w.try(cmd).ok,
    };
    const end = w.now + 3 * DAY;
    while (w.now < end) {
      w.do({ type: "tick" });
      for (const b of bots) b.play(session);
      w.advance(3 * HOUR);
    }
    const toMarketMaker = w.trades.filter((t) => t.buyerId === MARKET_MAKER);
    expect(toMarketMaker).toEqual([]);
    const onSale = Object.values(w.state.orders).filter(
      (o) => o.side === "sell" && o.playerId !== MARKET_MAKER,
    );
    expect(onSale.length).toBeGreaterThan(0);
  });
});
