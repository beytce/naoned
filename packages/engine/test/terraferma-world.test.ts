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
  gabelleOn,
  hexDistance,
  hexNeighbors,
  tollOn,
  urgentReservedUntil,
} from "../src/index.js";
import { deliverySettings, testTerraferma } from "./fixture.js";
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
