import { describe, expect, it } from "vitest";
import {
  type Command,
  TERRA_FAMILY,
  calmiereCap,
  cellsOf,
  dayIndex,
  decreeQuotaBps,
  decreeTaxBps,
  deliveryOrdersFor,
  dogeFavourBps,
  embargoCutBps,
  familiesOn,
  gabelleOn,
  hexDistance,
  hexNeighbors,
  skirmishRanked,
  skirmishRankedLeft,
  terraEmbargoCutBps,
  tollOn,
  urgentReservedUntil,
  weeklyStandings,
} from "../src/index.js";
import { campaignSettings, deliverySettings, testTerraferma } from "./fixture.js";
import { DAY, HOUR, MIN, World, makeContext } from "./helpers.js";

const WEEK = 7 * DAY;
const error = (res: ReturnType<World["try"]>) => (res.ok ? "ok" : res.error);
const live = (more = {}, top = {}) =>
  new World(
    makeContext({
      ...top,
      terraferma: {
        ...testTerraferma,
        live: true,
        start: { ...testTerraferma.start, protectionHours: 0, minDistance: 2 },
        ...more,
      },
    }),
  );
const act = (w: World, cmd: Record<string, unknown>) => w.try(cmd as unknown as Command);

/** An inner neutral cell far enough from everyone. */
function freeCell(w: World): number {
  const map = w.state.terra?.map;
  if (!map) throw new Error("no map");
  const i = map.owner.findIndex(
    (o, k) =>
      o === null &&
      hexNeighbors(map.map, k).length === 6 &&
      map.owner.every((p, j) => p === null || hexDistance(map.map, k, j) >= 2),
  );
  if (i < 0) throw new Error("no free cell");
  return i;
}

function joined(w: World, ...ids: string[]) {
  for (const id of ids) w.do({ type: "join", playerId: id, region: "terraferma" });
  w.do({ type: "tick" });
  for (const id of ids) w.do({ type: "terraPlace", playerId: id, cell: freeCell(w) } as Command);
}

describe("the Terraferma in the world", () => {
  it("is off until the settings switch it on", () => {
    const w = new World(makeContext({ terraferma: testTerraferma }));
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    w.do({ type: "tick" });
    expect(w.state.terra).toBeUndefined();
    expect(error(act(w, { type: "terraPlace", playerId: "a", cell: 0 }))).toBe("terra_off");
  });

  it("replaces the families once live", () => {
    expect(familiesOn(makeContext({ ...campaignSettings, terraferma: testTerraferma }))).toBe(true);
    expect(familiesOn(live({}, campaignSettings).ctx)).toBe(false);
  });

  it("makes the week's map at the first tick and plays it at each command", () => {
    const w = live();
    joined(w, "a");
    expect(w.state.terra?.week).toBe(0);
    const map = w.state.terra?.map;
    expect(map && cellsOf(map, "a").length).toBeGreaterThan(1);
  });

  it("takes the ducats of buildings and of the cap, destroyed, and refuses without them", () => {
    const w = live();
    joined(w, "a");
    const before = w.cash("a");
    const sink = w.state.accounts["system:sink"] ?? 0n;
    expect(error(act(w, { type: "terraRaise", playerId: "a" }))).toBe("ok");
    expect(w.cash("a")).toBe(before - 10_000n);
    expect(w.state.accounts["system:sink"]).toBe(sink + 10_000n);
    const poor = live({ capRaise: { amount: 10, price: 10_000_000, perDay: 2 } });
    joined(poor, "b");
    expect(error(act(poor, { type: "terraRaise", playerId: "b" }))).toBe("insufficient_funds");
    expect(poor.state.terra?.map.players.b?.boughtCap).toBeUndefined();
  });

  it("closes the week: Influence by tier, and the Signore's decree for the next one", () => {
    const w = live();
    joined(w, "a", "b");
    act(w, { type: "terraDecree", playerId: "a", code: "dime" });
    act(w, { type: "terraDecree", playerId: "b", code: "embargo", target: "verona" });
    // a grows: more glory.
    const terra = w.state.terra;
    if (!terra) throw new Error("no map");
    let more = 10;
    const owner = terra.map.owner.map((o) => (o === null && more-- > 0 ? "a" : o));
    w.state = { ...w.state, terra: { ...terra, map: { ...terra.map, owner } } };
    const res = w.at(WEEK + MIN).do({ type: "tick" });
    const influence = res.effects.events.filter(
      (e) => e.type === "influence_earned" && e.data?.source === "terraferma",
    );
    expect(influence.map((e) => [e.playerId, e.data?.amount])).toEqual([
      ["a", 20],
      ["b", 12],
    ]);
    expect(res.effects.events.some((e) => e.type === "terra_closed")).toBe(true);
    expect(w.state.terra?.week).toBe(1);
    expect(w.state.terraDecree).toEqual({ week: 1, code: "dime", members: ["a"] });
  });
});

describe("the Signore's strong decrees", () => {
  const withDecree = (code: string, target?: string) => {
    const w = live({}, deliverySettings);
    joined(w, "a", "b");
    w.state = {
      ...w.state,
      terraDecree: { week: 0, code, ...(target ? { target } : {}), members: ["a"] },
    };
    return w;
  };

  it("franchise of the Rialto: no market tax and twice the Dogana for its members", () => {
    const w = withDecree("franchise_rialto");
    expect(decreeTaxBps(w.ctx, w.state, "a", 300, w.now)).toBe(0);
    expect(decreeTaxBps(w.ctx, w.state, "b", 300, w.now)).toBe(300);
    expect(decreeQuotaBps(w.ctx, w.state, "a", w.now)).toBe(10_000);
  });

  it("monopoly: the others pay 15 points more on the good, for the members", () => {
    const w = withDecree("monopole", "bread");
    expect(gabelleOn(w.ctx, w.state, "b", "bread", w.now)).toEqual({
      family: TERRA_FAMILY,
      bps: 1_500,
    });
    expect(gabelleOn(w.ctx, w.state, "a", "bread", w.now)).toBeNull();
    expect(gabelleOn(w.ctx, w.state, "b", "wheat", w.now)).toBeNull();
  });

  it("dime: a share of every delivery of the others, wherever it goes", () => {
    const w = withDecree("dime");
    expect(tollOn(w.ctx, w.state, "b", "verona", w.now)).toEqual({
      family: TERRA_FAMILY,
      bps: 300,
    });
    expect(tollOn(w.ctx, w.state, "a", "verona", w.now)).toBeNull();
  });

  it("embargo: the city pays the others a quarter less, its urgent orders the members' first", () => {
    const w = withDecree("embargo", "verona");
    expect(embargoCutBps(w.ctx, w.state, "b", "verona", w.now)).toBe(2_500);
    expect(embargoCutBps(w.ctx, w.state, "a", "verona", w.now)).toBe(0);
    expect(embargoCutBps(w.ctx, w.state, "b", "padova", w.now)).toBe(0);
    expect(urgentReservedUntil(w.ctx, w.state, "b", "verona", w.now, w.now)).toBe(w.now + HOUR);
  });

  it("favour of the Doge, and the calmiere at 105 %", () => {
    expect(
      dogeFavourBps(withDecree("faveur_doge").ctx, withDecree("faveur_doge").state, "a", 0),
    ).toBe(0);
    const w = withDecree("faveur_doge");
    expect(dogeFavourBps(w.ctx, w.state, "a", w.now)).toBe(4_000);
    expect(dogeFavourBps(w.ctx, w.state, "b", w.now)).toBe(0);
    const c = withDecree("calmiere", "bread");
    const ref = c.ctx.settings.referencePrices.bread ?? 0n;
    expect(calmiereCap(c.ctx, c.state, "bread", c.now)).toBe((ref * 10_500n) / 10_000n);
  });

  it("favour of the Doge: one more contract of the Doge a day for its members", () => {
    const w = withDecree("faveur_doge");
    const doge = (p: string) =>
      deliveryOrdersFor(w.ctx, w.state, p, dayIndex(w.ctx, w.now)).filter((o) => o.kind === "doge")
        .length;
    const usual = w.ctx.settings.deliveries.dogeOrdersPerDay;
    expect(doge("b")).toBe(usual);
    expect(doge("a")).toBe(usual + 1);
  });

  it("shares what it collected among its members at the week's close", () => {
    const w = withDecree("dime");
    // What the dime collected: moved from the source through the journal.
    const total = (k: string) => w.totals.accounts.get(k) ?? 0n;
    w.state = {
      ...w.state,
      accounts: {
        ...w.state.accounts,
        "family:terra": 900n,
        "system:source": (w.state.accounts["system:source"] ?? 0n) - 900n,
      },
    };
    w.totals.accounts.set("family:terra", total("family:terra") + 900n);
    w.totals.accounts.set("system:source", total("system:source") - 900n);
    const a = w.cash("a");
    w.at(WEEK + MIN).do({ type: "tick" });
    expect(w.cash("a")).toBe(a + 900n);
  });
});

describe("the weekly ranking, once the Terraferma is live", () => {
  it("still ranks the week's net sales: the glory stays on the Terraferma", () => {
    const w = live();
    joined(w, "a", "b");
    // The state is frozen between commands: glory set on a copy.
    w.state = structuredClone(w.state);
    const map = w.state.terra?.map;
    if (!map) throw new Error("no map");
    (map.players.a as { glory: number }).glory = 5;
    (map.players.b as { glory: number }).glory = 100_000;
    expect(weeklyStandings(w.ctx, w.state, w.now).every((r) => r.gain === 0n)).toBe(true);
    w.at(WEEK + MIN);
    const closed = w.do({ type: "tick" }).effects.events.find((e) => e.type === "week_closed");
    const standings = (closed?.data as { standings: { playerId: string; gain: string }[] })
      .standings;
    expect(standings.map((s) => s.gain)).toEqual(["0", "0"]);
  });
});

describe("the battle hour in the world", () => {
  it("warns the merchants on the map a quarter of an hour before, once", () => {
    const w = live({ battle: { from: 20, to: 21, stepMinutes: 3, warnMinutes: 15 } });
    joined(w, "a");
    w.do({ type: "join", playerId: "b", region: "terraferma" });
    // 19 h 50 in Paris on the first day (UTC+1 in January): 18 h 50 UTC.
    const day = Math.floor(w.now / DAY) * DAY;
    w.now = day + 18 * HOUR + 50 * MIN;
    const res = w.do({ type: "tick" });
    const warned = res.effects.events.filter((e) => e.type === "terra_battle_soon");
    expect(warned.map((e) => e.playerId)).toEqual(["a"]);
    w.now += 2 * MIN;
    const again = w.do({ type: "tick" });
    expect(again.effects.events.some((e) => e.type === "terra_battle_soon")).toBe(false);
  });
});

describe("the land's yield in the world", () => {
  it("brings the harvest into the stock and the routes' ducats into the purse, through the books", () => {
    const w = live({
      peasants: { yields: { plain: { resource: "wheat", perCells: 1 } }, routeDucats: 0 },
    });
    joined(w, "a");
    const before = w.state.inventories.a?.wheat?.available ?? 0;
    expect(act(w, { type: "terraPeasants", playerId: "a", shareBps: 10_000 }).ok).toBe(true);
    w.advance(3 * HOUR).do({ type: "tick" });
    const after = w.state.inventories.a?.wheat?.available ?? 0;
    expect(after).toBeGreaterThan(before);
    expect(act(w, { type: "terraPeasants", playerId: "a", shareBps: 10_001 }).ok).toBe(false);
  });
});

describe("diplomacy on the Terraferma", () => {
  const diplomacy = { ducatGiftPerDay: 5_000, embargoBps: 2_000, signalMinutes: 5 };

  it("shows a signal to all, a target to the allies only, at most one each few minutes", () => {
    const w = live({ diplomacy });
    joined(w, "a", "b");
    expect(act(w, { type: "terraSignal", playerId: "a", kind: "help" }).ok).toBe(true);
    expect(act(w, { type: "terraSignal", playerId: "a", kind: "thanks" }).ok).toBe(false);
    w.advance(6 * MIN);
    const map = w.state.terra?.map;
    const cell = map?.owner.findIndex((o) => o === "b") ?? 0;
    expect(act(w, { type: "terraSignal", playerId: "a", kind: "attack", cell }).ok).toBe(true);
    const signals = w.state.terra?.map.signals ?? [];
    expect(signals.map((s) => s.kind)).toEqual(["help", "attack"]);
  });

  it("lets allies give each other ducats, through the books, within a day's limit", () => {
    const w = live({ diplomacy });
    joined(w, "a", "b");
    act(w, { type: "terraAlly", playerId: "a", other: "b" });
    act(w, { type: "terraAccept", playerId: "b", from: "a" });
    const a = w.cash("a");
    const b = w.cash("b");
    expect(act(w, { type: "terraGift", playerId: "a", to: "b", amount: "4000" }).ok).toBe(true);
    expect(w.cash("a")).toBe(a - 4_000n);
    expect(w.cash("b")).toBe(b + 4_000n);
    expect(act(w, { type: "terraGift", playerId: "a", to: "b", amount: "2000" }).ok).toBe(false);
  });

  it("an embargo from a held city cuts what it pays the rival", () => {
    const w = live({ diplomacy });
    joined(w, "a", "b");
    const map = w.state.terra?.map;
    if (!map) throw new Error("no map");
    expect(act(w, { type: "terraEmbargo", playerId: "a", target: "b" }).ok).toBe(true);
    expect(w.state.terra?.map.players.a?.embargo).toBe("b");
    expect(act(w, { type: "terraEmbargo", playerId: "a", target: "a" }).ok).toBe(false);
    // a holds Venice on the Terraferma: Venice pays b less, a as usual.
    const state = structuredClone(w.state);
    const t = state.terra?.map;
    if (!t) throw new Error("no map");
    const cell = t.owner.findIndex((o) => o === "a");
    t.map.cityCode[cell] = "venezia";
    expect(terraEmbargoCutBps(w.ctx, state, "b", "venezia")).toBe(2_000);
    expect(terraEmbargoCutBps(w.ctx, state, "a", "venezia")).toBe(0);
    expect(terraEmbargoCutBps(w.ctx, state, "b", "padova")).toBe(0);
  });
});

describe("a skirmish's payment", () => {
  const skirmish = {
    minutes: 15,
    speed: 60,
    stepMinutes: 5,
    players: 6,
    cellsPerPlayer: 30,
    lobbySeconds: 30,
    troops: 60,
    recruit: { base: 60, perCell: 6, perCity: 12 },
    glory: [60, 40, 25, 10],
    rankedPerDay: 1,
    minHumans: 2,
  };
  let matches = 0;
  const pay = (ranks: [string, number][], matchId = `m${++matches}`) => ({
    type: "terraSkirmishPay",
    matchId,
    ranks: ranks.map(([playerId, glory]) => ({ playerId, glory })),
  });
  const glory = (w: World, id: string) => w.state.terra?.map.players[id]?.glory ?? 0;

  it("credits every merchant of the match set down on the week's map, in one command", () => {
    const w = live({ skirmish });
    joined(w, "a", "b");
    w.do({ type: "join", playerId: "c", region: "terraferma" });
    const before = { a: glory(w, "a"), b: glory(w, "b") };
    const res = act(
      w,
      pay(
        [
          ["a", 40],
          ["b", 25],
          ["c", 60],
        ],
        "m-one",
      ),
    );
    if (!res.ok) throw new Error(res.error);
    expect(glory(w, "a")).toBe(before.a + 40);
    expect(glory(w, "b")).toBe(before.b + 25);
    // c is not on the week's map: nothing, and nothing counted.
    expect(w.state.terra?.map.players.c).toBeUndefined();
    expect(w.state.terra?.map.skirmishPaid?.["m-one"]).toEqual({ a: 40, b: 25 });
    const paid = res.effects.events.filter((e) => e.type === "terra_skirmish");
    expect(paid.map((e) => [e.playerId, e.data?.matchId])).toEqual([
      ["a", "m-one"],
      ["b", "m-one"],
    ]);
  });

  it("is paid once: the same match again is refused, nothing credited twice", () => {
    const w = live({ skirmish });
    joined(w, "a", "b");
    expect(
      act(
        w,
        pay(
          [
            ["a", 0],
            ["b", 0],
          ],
          "m-twice",
        ),
      ).ok,
    ).toBe(true);
    w.advance(DAY);
    const before = glory(w, "a");
    expect(
      error(
        act(
          w,
          pay(
            [
              ["a", 60],
              ["b", 40],
            ],
            "m-twice",
          ),
        ),
      ),
    ).toBe("already_paid");
    expect(glory(w, "a")).toBe(before);
    expect(skirmishRankedLeft(w.ctx, w.state, "a", w.now)).toBe(1);
  });

  it("spends the day's ranked match only when paid: the next ones go unpaid", () => {
    const w = live({ skirmish });
    joined(w, "a", "b");
    expect(skirmishRankedLeft(w.ctx, w.state, "a", w.now)).toBe(1);
    act(
      w,
      pay([
        ["a", 0],
        ["b", 10],
      ]),
    );
    expect(skirmishRankedLeft(w.ctx, w.state, "a", w.now)).toBe(0);
    // Both played their ranked match of the day: the next match is settled, paying no one.
    const before = glory(w, "a");
    expect(
      act(
        w,
        pay(
          [
            ["a", 60],
            ["b", 40],
          ],
          "m-next",
        ),
      ).ok,
    ).toBe(true);
    expect(glory(w, "a")).toBe(before);
    expect(w.state.terra?.map.skirmishPaid?.["m-next"]).toEqual({});
    w.advance(DAY);
    expect(skirmishRankedLeft(w.ctx, w.state, "a", w.now)).toBe(1);
    act(
      w,
      pay([
        ["a", 60],
        ["b", 40],
      ]),
    );
    expect(glory(w, "a")).toBeGreaterThanOrEqual(before + 60);
  });

  it("pays the others when one merchant has already played its ranked match of the day", () => {
    const w = live({ skirmish });
    joined(w, "a", "b");
    // a plays its ranked match of the day with c, a merchant off the week's map.
    w.do({ type: "join", playerId: "c", region: "terraferma" });
    act(
      w,
      pay([
        ["a", 10],
        ["c", 0],
      ]),
    );
    expect(skirmishRankedLeft(w.ctx, w.state, "a", w.now)).toBe(0);
    expect(skirmishRankedLeft(w.ctx, w.state, "b", w.now)).toBe(1);
    const before = { a: glory(w, "a"), b: glory(w, "b") };
    const res = act(
      w,
      pay(
        [
          ["a", 60],
          ["b", 40],
        ],
        "m-mixed",
      ),
    );
    if (!res.ok) throw new Error(res.error);
    // a's ranked match was spent: nothing for it; b is paid its rank and spends its own.
    expect(glory(w, "a")).toBe(before.a);
    expect(glory(w, "b")).toBe(before.b + 40);
    expect(w.state.terra?.map.skirmishPaid?.["m-mixed"]).toEqual({ b: 40 });
    expect(skirmishRankedLeft(w.ctx, w.state, "b", w.now)).toBe(0);
    expect(
      res.effects.events.filter((e) => e.type === "terra_skirmish").map((e) => e.playerId),
    ).toEqual(["b"]);
  });

  it("is never paid at night", () => {
    const w = live({ skirmish, openHours: { from: 8, to: 22 } });
    // T0 is 1 h in Paris: 9 h, then 23 h.
    w.advance(8 * HOUR);
    joined(w, "a", "b");
    expect(skirmishRanked(w.ctx.settings.terraferma, 2, w.now)).toBe(true);
    w.advance(14 * HOUR);
    expect(skirmishRanked(w.ctx.settings.terraferma, 2, w.now)).toBe(false);
    expect(
      error(
        act(
          w,
          pay([
            ["a", 60],
            ["b", 40],
          ]),
        ),
      ),
    ).toBe("night");
    expect(skirmishRankedLeft(w.ctx, w.state, "a", w.now)).toBe(1);
  });

  it("is not ranked when it would end after the closing hour", () => {
    const w = live({ skirmish, openHours: { from: 8, to: 22 } });
    // 21 h 50 in Paris: a quarter of an hour would end past 22 h.
    w.advance(20 * HOUR + 50 * MIN);
    expect(skirmishRanked(w.ctx.settings.terraferma, 2, w.now)).toBe(false);
    w.advance(-20 * MIN);
    expect(skirmishRanked(w.ctx.settings.terraferma, 2, w.now)).toBe(true);
  });

  it("needs two merchants, each once, within the scale: else no one is paid", () => {
    const w = live({ skirmish });
    joined(w, "a", "b");
    expect(skirmishRanked(w.ctx.settings.terraferma, 1, w.now)).toBe(false);
    expect(error(act(w, pay([["a", 60]])))).toBe("too_few_humans");
    expect(
      error(
        act(
          w,
          pay([
            ["a", 60],
            ["a", 40],
          ]),
        ),
      ),
    ).toBe("invalid_quantity");
    expect(
      error(
        act(
          w,
          pay([
            ["a", 61],
            ["b", 40],
          ]),
        ),
      ),
    ).toBe("invalid_quantity");
    expect(
      error(
        act(
          w,
          pay(
            [
              ["a", 60],
              ["b", 40],
            ],
            "",
          ),
        ),
      ),
    ).toBe("invalid_quantity");
    expect(skirmishRankedLeft(w.ctx, w.state, "a", w.now)).toBe(1);
    expect(skirmishRankedLeft(w.ctx, w.state, "b", w.now)).toBe(1);
  });
});

describe("a week's map from before the nations", () => {
  it("is drawn again at the next tick, with its nations and its history, everyone to set down anew", () => {
    const w = live({
      nations: [
        {
          id: "mantova",
          atBps: { x: 6_000, y: 5_000 },
          radius: 1,
          troops: 100,
          troopsPerActive: 0,
          regenBps: 500,
          everyHours: 2,
          shareBps: 2_000,
          behavior: "slow",
        },
      ],
    });
    joined(w, "a");
    // As a map made by the version before: no history, no nation.
    const old = structuredClone(w.state);
    const map = old.terra?.map;
    if (!map) throw new Error("no map");
    map.initial = undefined;
    map.history = undefined;
    for (let i = 0; i < map.owner.length; i++)
      if (map.owner[i] === "nation:mantova") map.owner[i] = null;
    const { "nation:mantova": _gone, ...players } = map.players;
    map.players = players;
    w.state = old;
    w.do({ type: "tick" });
    const fresh = w.state.terra?.map;
    expect(fresh?.history).toBeDefined();
    expect(fresh?.players["nation:mantova"]).toBeDefined();
    expect(fresh?.players.a).toBeUndefined();
    expect(act(w, { type: "terraPlace", playerId: "a", cell: freeCell(w) }).ok).toBe(true);
  });
});
