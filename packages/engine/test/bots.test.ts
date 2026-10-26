import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  Bot,
  MARKET_MAKER,
  MarketView,
  PROFILES,
  Rng,
  botsWanted,
  cellsOf,
  hexDistance,
  hexNeighbors,
  parseSettings,
} from "../src/index.js";
import { deliverySettings, testSettings, testTerraferma } from "./fixture.js";
import { DAY, HOUR, MIN, World, makeContext } from "./helpers.js";

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

describe("bots at the Arsenal (E2-6)", () => {
  it("deliver their share up to the Bronze, never past it: Silver and Gold are for people", () => {
    const projects = {
      intervalDays: 7,
      durationDays: 7,
      needsPerPlayer: { bricks: 5, planks: 5 },
      premiumBps: 1_000,
      tiersBps: [10_000, 12_500, 15_000],
      premiumAboveBps: 500,
    };
    const w = new World(makeContext({ projects }));
    const rng = new Rng(5);
    const bots = [
      new Bot("b1", PROFILES.builder, "lagoon", w.now),
      new Bot("b2", PROFILES.builder, "dolomites", w.now),
    ];
    for (const b of bots) w.do({ type: "join", playerId: b.id, region: b.region });
    w.do({ type: "join", playerId: "h", region: "terraferma" });
    w.do({ type: "tick" });
    const project = Object.values(w.state.projects)[0];
    if (!project) throw new Error("no project");
    // A person fills the Bronze alone.
    w.give("h", "bricks", 15).give("h", "planks", 15);
    for (const resource of ["bricks", "planks"])
      w.do({
        type: "deliverToProject",
        playerId: "h",
        projectId: project.id,
        resource,
        quantity: 15,
      });
    for (const b of bots) w.give(b.id, "bricks", 50).give(b.id, "planks", 50);
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
    for (let i = 0; i < 4; i++) {
      for (const b of bots) b.play(session);
      w.advance(3 * HOUR);
    }
    expect(w.state.projects[project.id]?.units).toEqual({ h: 30 });
  });
});

describe("bots on the road", () => {
  it("deliver their board and buy vehicles", () => {
    const w = new World(makeContext({ ...deliverySettings }));
    const rng = new Rng(5);
    // Finished deliveries leave the state after a few days: count them from the events.
    const events: string[] = [];
    const bots = [
      new Bot("b1", PROFILES.producer, "terraferma", w.now),
      new Bot("b2", PROFILES.artisan, "terraferma", w.now),
      new Bot("b3", PROFILES.builder, "lagoon", w.now),
      new Bot("b4", PROFILES.builder, "dolomites", w.now),
      new Bot("b5", PROFILES.speculator, "lagoon", w.now),
      new Bot("b6", PROFILES.casual, "terraferma", w.now),
    ];
    for (const b of bots) {
      w.do({ type: "join", playerId: b.id, region: b.region });
      w.give(b.id, "bread", 200).give(b.id, "bricks", 80).give(b.id, "planks", 80);
    }
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
      act: (cmd: Parameters<World["try"]>[0]) => {
        const res = w.try(cmd);
        if (res.ok) events.push(...res.effects.events.map((e) => e.type));
        return res.ok;
      },
    };
    const end = w.now + 7 * DAY;
    let step = 0;
    while (w.now < end) {
      events.push(...w.do({ type: "tick" }).effects.events.map((e) => e.type));
      for (const b of bots) {
        // Play every 2 h in the daytime (UTC 7 h to 21 h).
        const hour = Math.floor((w.now % DAY) / HOUR);
        if (step % 8 === 0 && hour >= 7 && hour <= 21) b.play(session);
      }
      w.advance(15 * MIN);
      step++;
    }
    const count = (type: string) => events.filter((e) => e === type).length;
    expect(count("delivery_arrived")).toBeGreaterThan(20);
    expect(Object.values(w.state.vehicles ?? {}).length).toBeGreaterThan(bots.length);
  });
});

describe("bots on the Terraferma", () => {
  it("set down and march on the free land in the same session, several fronts at once", () => {
    const w = new World(
      makeContext({
        terraferma: {
          ...testTerraferma,
          live: true,
          // Troops enough for more than one front from the start.
          start: { ...testTerraferma.start, troops: 60, protectionHours: 0, placementHours: 24 },
        },
      }),
    );
    const bot = new Bot("b1", PROFILES.producer, "terraferma", w.now);
    w.do({ type: "join", playerId: bot.id, region: bot.region });
    w.do({ type: "tick" });
    bot.play({
      ctx: w.ctx,
      state: () => w.state,
      now: w.now,
      market: new MarketView(
        w.ctx,
        () => w.state,
        () => w.now,
      ),
      rng: new Rng(1),
      act: (cmd) => w.try(cmd).ok,
    });
    const map = w.state.terra?.map;
    expect(map?.players[bot.id]).toBeDefined();
    const fronts = map?.fronts.filter((f) => f.owner === bot.id) ?? [];
    expect(fronts.length).toBeGreaterThan(1);
    expect(fronts.every((f) => f.against === null)).toBe(true);
    // Each at a cell of its own.
    expect(new Set(fronts.map((f) => f.aim)).size).toBe(fronts.length);
    // Troops kept at home.
    expect(map?.players[bot.id]?.troops).toBeGreaterThan(0);
    expect(map && cellsOf(map, bot.id).length).toBeGreaterThan(1);
  });

  it("march on a rival as soon as one front holds the free land, without waiting for it to run out", () => {
    const w = new World(
      makeContext({
        terraferma: {
          ...testTerraferma,
          live: true,
          start: { ...testTerraferma.start, troops: 90, protectionHours: 0, placementHours: 0 },
        },
      }),
    );
    const bot = new Bot("b1", PROFILES.producer, "terraferma", w.now);
    w.do({ type: "join", playerId: bot.id, region: bot.region });
    w.do({ type: "join", playerId: "rival", region: "terraferma" });
    w.do({ type: "tick" });
    const first = w.state.terra?.map;
    if (!first) throw new Error("no map");
    const home = first.owner.findIndex(
      (o, i) =>
        o === null &&
        hexNeighbors(first.map, i).filter((n) => first.map.land[n]).length === 6 &&
        first.owner.every((h, j) => h === null || hexDistance(first.map, i, j) >= 3),
    );
    w.do({ type: "terraPlace", playerId: bot.id, cell: home });
    const after = w.state.terra?.map;
    if (!after) throw new Error("no map");
    const away = after.owner.findIndex(
      (o, i) =>
        o === null &&
        after.map.land[i] &&
        after.owner.every((h, j) => h === null || hexDistance(after.map, i, j) >= 3),
    );
    w.do({ type: "terraPlace", playerId: "rival", cell: away });
    // The rival's land reaches the bot's border (a cell it took on its way).
    const map = w.state.terra?.map;
    if (!map) throw new Error("no map");
    const edge = hexNeighbors(map.map, home).flatMap((n) =>
      hexNeighbors(map.map, n).filter((m) => map.map.land[m] && map.owner[m] === null),
    )[0];
    if (edge === undefined) throw new Error("no edge");
    const state = structuredClone(w.state);
    if (state.terra) state.terra.map.owner[edge] = "rival";
    w.state = state;
    bot.play({
      ctx: w.ctx,
      state: () => w.state,
      now: w.now,
      market: new MarketView(
        w.ctx,
        () => w.state,
        () => w.now,
      ),
      rng: new Rng(1),
      act: (cmd) => w.try(cmd).ok,
    });
    const fronts = w.state.terra?.map.fronts.filter((f) => f.owner === bot.id) ?? [];
    expect(fronts.some((f) => f.against === null)).toBe(true);
    expect(fronts.some((f) => f.against === "rival")).toBe(true);
  });
});

describe("the computer's houses as allies (E2-4 of the experts)", () => {
  /** A house of the computer set down, with a merchant and another house on its border. */
  function neighbours() {
    const w = new World(
      makeContext({
        terraferma: {
          ...testTerraferma,
          live: true,
          start: {
            ...testTerraferma.start,
            troops: 90,
            protectionHours: 0,
            placementHours: 0,
            minDistance: 2,
          },
          cellsPerActive: 40,
        },
      }),
    );
    const bot = new Bot("b1", PROFILES.producer, "terraferma", w.now);
    w.do({ type: "join", playerId: "b1", region: "terraferma", npc: true } as never);
    w.do({ type: "join", playerId: "b2", region: "terraferma", npc: true } as never);
    w.do({ type: "join", playerId: "ada", region: "terraferma" });
    w.do({ type: "join", playerId: "rival", region: "terraferma" });
    w.do({ type: "tick" });
    const first = w.state.terra?.map;
    if (!first) throw new Error("no map");
    // Each on the first free inner cell the rules accept.
    for (const id of ["b1", "b2", "ada", "rival"]) {
      const now = w.state.terra?.map ?? first;
      const cells = now.owner
        .map((o, i) => (o === null && hexNeighbors(now.map, i).length === 6 ? i : -1))
        .filter((i) => i >= 0);
      if (!cells.some((cell) => w.try({ type: "terraPlace", playerId: id, cell } as never).ok))
        throw new Error(`nowhere for ${id}`);
    }
    const state = structuredClone(w.state);
    const map = state.terra?.map;
    if (!map) throw new Error("no map");
    const home = map.players.b1?.capital ?? 0;
    // Two cells of the border given to Ada and to the other house; one to the rival.
    const ring = hexNeighbors(map.map, home).filter((n) => map.map.land[n]);
    const [toAda, toB2, toRival] = ring;
    if (toAda === undefined || toB2 === undefined || toRival === undefined) throw new Error("ring");
    map.owner[toAda] = "ada";
    map.owner[toB2] = "b2";
    map.owner[toRival] = "rival";
    w.state = state;
    const play = () =>
      bot.play({
        ctx: w.ctx,
        state: () => w.state,
        now: w.now,
        market: new MarketView(
          w.ctx,
          () => w.state,
          () => w.now,
        ),
        rng: new Rng(1),
        act: (cmd) => w.try(cmd).ok,
      });
    return { w, play, toAda, toRival };
  }

  it("ask a merchant to ally before a house of the computer", () => {
    const { w, play } = neighbours();
    play();
    const map = w.state.terra?.map;
    expect(map?.requests?.some((r) => r.from === "b1" && r.to === "ada")).toBe(true);
  });

  it("refuse a merchant who already has a house of the computer for ally", () => {
    const { w, play } = neighbours();
    // Ada allied with the other house, then asking b1 too.
    w.do({ type: "terraAlly", playerId: "ada", other: "b2" } as never);
    w.do({ type: "terraAccept", playerId: "b2", from: "ada" } as never);
    w.do({ type: "terraAlly", playerId: "ada", other: "b1" } as never);
    play();
    const allies = (w.state.terra?.map.alliances ?? []).filter(
      (a) => (a.a === "b1" || a.b === "b1") && (a.a === "ada" || a.b === "ada"),
    );
    expect(allies).toHaveLength(0);
  });

  it("send troops to an ally who calls for help under attack, and strike its aggressor back", () => {
    const { w, play, toAda } = neighbours();
    w.do({ type: "terraAlly", playerId: "ada", other: "b1" } as never);
    play();
    const state = structuredClone(w.state);
    const map = state.terra?.map;
    if (!map) throw new Error("no map");
    expect(map.alliances?.some((a) => a.a === "ada" || a.b === "ada")).toBe(true);
    map.signals = [...(map.signals ?? []), { from: "ada", kind: "help", at: w.now }];
    map.fronts = [
      ...map.fronts,
      { id: "f-test", owner: "rival", against: "ada", aim: toAda, troops: 20, launchedAt: w.now },
    ];
    w.state = state;
    const given = w.state.terra?.map.players.b1?.today?.gifts ?? 0;
    play();
    const after = w.state.terra?.map;
    expect(after?.players.b1?.today?.gifts ?? 0).toBeGreaterThan(given);
    expect(after?.fronts.some((f) => f.owner === "b1" && f.against === "rival")).toBe(true);
  });

  it("never give ducats: no gift of money in their play", () => {
    const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
    expect(readFileSync(join(dir, "bots.ts"), "utf8")).not.toMatch(/terraGift/);
  });
});
