import { describe, expect, it } from "vitest";
import {
  type Command,
  SINK_ACCOUNT,
  type WorldSettingsInput,
  type WorldState,
  accumulate,
  levyFactorBps,
  levyWaiting,
  liveGlory,
  meritPoints,
  reserveOf,
  seasonEnd,
  upgradeLegacyState,
} from "../src/index.js";
import { campaignSettings, testCampaign, testFamilies } from "./fixture.js";
import { DAY, HOUR, MIN, World, makeContext } from "./helpers.js";

// T0 is 1 h in Paris (winter): Paris opens at 8 h, i.e. 7 h after T0, and closes 14 h later.
const WEEK = 7 * DAY;
const noMilan = {
  campaign: { ...testCampaign, milan: { ...testCampaign.milan, base: 0, perActive: 0 } },
};

/** Two merchants: a of the Rossi (seat in the north), b of the Verdi (seat in the south). */
function world(more: Partial<WorldSettingsInput> = {}, extra: string[] = []) {
  const w = new World(makeContext({ ...campaignSettings, ...more }));
  w.at(0);
  for (const id of ["a", "b", ...extra]) w.do({ type: "join", playerId: id, region: "terraferma" });
  w.do({ type: "joinFamily", playerId: "a", family: "rossi" });
  w.do({ type: "joinFamily", playerId: "b", family: "verdi" });
  for (const id of extra) w.do({ type: "joinFamily", playerId: id, family: "rossi" });
  w.do({ type: "tick" });
  return w;
}

const error = (res: ReturnType<World["try"]>) => (res.ok ? "ok" : res.error);
const land = (w: World, code: string) => w.state.campaign?.lands[code];
const tickAt = (w: World, offset: number) => w.at(offset).do({ type: "tick" });
const march = (w: World, playerId: string, landCode: string, lances: number) =>
  w.try({ type: "sendMarch", playerId, land: landCode, lances } as Command);
/** a takes the village next to its seat at 10 h (UTC), arriving at 10 h 20. */
function takeBorgo(w: World) {
  w.at(10 * HOUR);
  w.do({ type: "hireLances", playerId: "a", count: 5 });
  w.do({ type: "sendMarch", playerId: "a", land: "borgo", lances: 5 });
  tickAt(w, 10 * HOUR + 20 * MIN);
}

describe("a state saved before the four families", () => {
  // The first families (influence and family orders, before the guilds) kept their week's
  // tallies in `families`: a world opened then still carries them.
  const legacy = {
    week: 1,
    members: { a: "dandolo" },
    weekInfluence: { a: 40 },
    seasonInfluence: { a: 90 },
    ordersDone: {},
    patronage: {},
    inPower: "dandolo",
  };

  it("drops the old families' tallies on load", () => {
    const w = new World(makeContext(campaignSettings));
    w.at(0);
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    const state = { ...w.state, families: legacy } as unknown as WorldState;
    expect(upgradeLegacyState(state).families).toBeUndefined();
    const fresh = { ...w.state, families: { memberOf: { a: "rossi" }, since: { a: 0 } } };
    expect(upgradeLegacyState(fresh).families?.memberOf.a).toBe("rossi");
  });

  it("lets the merchants choose a family on the next tick", () => {
    const w = new World(makeContext(campaignSettings));
    w.at(0);
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    w.state = { ...w.state, families: legacy } as unknown as WorldState;
    w.at(DAY + HOUR).do({ type: "tick" });
    expect(w.state.families).toBeUndefined();
    w.do({ type: "joinFamily", playerId: "a", family: "rossi" });
    expect(w.state.families?.memberOf.a).toBe("rossi");
  });
});

describe("the families", () => {
  it("are chosen once, after the opening day", () => {
    const w = new World(
      makeContext({ ...campaignSettings, families: { ...testFamilies, openDay: 1 } }),
    );
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    const join = (family: string) => w.try({ type: "joinFamily", playerId: "a", family });
    expect(error(join("rossi"))).toBe("family_locked");
    w.at(DAY);
    expect(error(join("gialli"))).toBe("unknown_family");
    expect(error(join("rossi"))).toBe("ok");
    expect(error(join("verdi"))).toBe("family_chosen");
    expect(w.state.families?.memberOf.a).toBe("rossi");
  });

  it("are off without a campaign", () => {
    const w = new World();
    w.do({ type: "join", playerId: "a", region: "terraferma" });
    expect(error(w.try({ type: "joinFamily", playerId: "a", family: "rossi" }))).toBe(
      "families_off",
    );
  });

  it("a small family levies more, a large one less", () => {
    const w = world({}, ["c"]);
    expect(levyFactorBps(w.ctx, w.state, "rossi", w.now)).toBe(7_500);
    expect(levyFactorBps(w.ctx, w.state, "verdi", w.now)).toBe(15_000);
  });
});

describe("lances", () => {
  it("are levied in open hours only, up to a cap", () => {
    const w = world();
    // From 8 h to 11 h in Paris: 3 open hours, 2 lances an hour.
    w.at(10 * HOUR);
    expect(levyWaiting(w.ctx, w.state, "a", w.now)).toBe(6);
    w.do({ type: "collectLevy", playerId: "a" });
    expect(reserveOf(w.state, "a", w.now)).toBe(6);
    expect(error(w.try({ type: "collectLevy", playerId: "a" }))).toBe("nothing_to_levy");
    w.at(12 * HOUR);
    expect(levyWaiting(w.ctx, w.state, "a", w.now)).toBe(4);
    // Until midnight in Paris: 9 open hours, but 10 waiting at most.
    w.at(23 * HOUR);
    expect(levyWaiting(w.ctx, w.state, "a", w.now)).toBe(10);
  });

  it("a small family's levy is larger", () => {
    const w = world({}, ["c"]);
    w.at(10 * HOUR);
    w.do({ type: "collectLevy", playerId: "a" });
    w.do({ type: "collectLevy", playerId: "b" });
    expect(reserveOf(w.state, "a", w.now)).toBe(4);
    expect(reserveOf(w.state, "b", w.now)).toBe(9);
  });

  it("are engaged for ducats destroyed, dearer past the first, a limit a day", () => {
    const w = world();
    w.at(10 * HOUR);
    const cash = w.cash("a");
    const sink = w.state.accounts[SINK_ACCOUNT] ?? 0n;
    w.do({ type: "hireLances", playerId: "a", count: 7 });
    expect(w.cash("a")).toBe(cash - 900n);
    expect((w.state.accounts[SINK_ACCOUNT] ?? 0n) - sink).toBe(900n);
    expect(error(w.try({ type: "hireLances", playerId: "a", count: 4 }))).toBe("hire_limit");
    w.do({ type: "hireLances", playerId: "a", count: 3 });
    expect(reserveOf(w.state, "a", w.now)).toBe(10);
    w.at(DAY + 10 * HOUR);
    expect(error(w.try({ type: "hireLances", playerId: "a", count: 5 }))).toBe("ok");
  });

  it("leave 48 hours after being raised", () => {
    const w = world();
    w.at(10 * HOUR);
    w.do({ type: "hireLances", playerId: "a", count: 5 });
    expect(reserveOf(w.state, "a", w.ctx.startAt + 58 * HOUR - 1)).toBe(5);
    expect(reserveOf(w.state, "a", w.ctx.startAt + 58 * HOUR)).toBe(0);
  });
});

describe("marches", () => {
  it("go to the family's lands or next to them, never to a seat", () => {
    const w = world(noMilan);
    w.at(10 * HOUR);
    w.do({ type: "hireLances", playerId: "a", count: 5 });
    expect(error(march(w, "a", "padova", 1))).toBe("not_adjacent");
    expect(error(march(w, "a", "sud", 1))).toBe("seat_untouchable");
    expect(error(march(w, "a", "nord", 1))).toBe("seat_untouchable");
    expect(error(march(w, "a", "atlantide", 1))).toBe("unknown_land");
    expect(error(march(w, "a", "borgo", 6))).toBe("not_enough_lances");
    expect(error(march(w, "b", "borgo", 1))).toBe("not_adjacent");
    expect(error(march(w, "a", "borgo", 5))).toBe("ok");
  });

  it("take a land when they outnumber its garrison, the survivors holding it", () => {
    const w = world(noMilan);
    takeBorgo(w);
    // A village of the militia: 2 lances, and 1 per active merchant.
    expect(land(w, "borgo")?.holder).toBe("rossi");
    expect(land(w, "borgo")?.stacks.map((s) => [s.playerId, s.count])).toEqual([["a", 1]]);
    expect(meritPoints(w.ctx, w.state, "a")).toBe(5);
  });

  it("fail against a stronger garrison, which loses as many lances", () => {
    const w = world(noMilan);
    w.at(10 * HOUR);
    w.do({ type: "hireLances", playerId: "a", count: 3 });
    w.do({ type: "sendMarch", playerId: "a", land: "campo", lances: 3 });
    tickAt(w, 11 * HOUR);
    expect(land(w, "campo")?.holder).toBeNull();
    expect(land(w, "campo")?.npc).toBe(1);
    expect(reserveOf(w.state, "a", w.now)).toBe(0);
  });

  it("count the garrison times the land's defense", () => {
    const w = world(noMilan);
    w.at(10 * HOUR);
    w.do({ type: "hireLances", playerId: "b", count: 10 });
    // A city: 4 lances, 1 per active merchant, each worth one and a half.
    w.do({ type: "sendMarch", playerId: "b", land: "padova", lances: 9 });
    tickAt(w, 11 * HOUR);
    expect(land(w, "padova")?.holder).toBeNull();
    expect(land(w, "padova")?.npc).toBe(0);
    w.do({ type: "sendMarch", playerId: "b", land: "padova", lances: 1 });
    tickAt(w, 12 * HOUR);
    expect(land(w, "padova")?.holder).toBe("verdi");
  });

  it("take longer far from the seat, and arrive in the morning after the night's truce", () => {
    const w = world(noMilan);
    takeBorgo(w);
    w.do({ type: "hireLances", playerId: "a", count: 5 });
    w.do({ type: "sendMarch", playerId: "a", land: "colle", lances: 1 });
    const far = Object.values(w.state.campaign?.marches ?? {})[0];
    expect((far?.arriveAt ?? 0) - w.now).toBe(30 * MIN);
    // 21 h 50 in Paris: 20 minutes later it is night; the march arrives at 8 h.
    w.at(20 * HOUR + 50 * MIN);
    w.do({ type: "sendMarch", playerId: "a", land: "borgo", lances: 1 });
    const late = Object.values(w.state.campaign?.marches ?? {}).find((m) => m.id !== far?.id);
    expect(late?.arriveAt).toBe(w.ctx.startAt + DAY + 7 * HOUR);
  });

  it("join an assault of the family, sharing the survivors", () => {
    const w = world(noMilan, ["c"]);
    w.at(10 * HOUR);
    w.do({ type: "hireLances", playerId: "a", count: 3 });
    w.do({ type: "hireLances", playerId: "c", count: 3 });
    w.do({ type: "sendMarch", playerId: "a", land: "campo", lances: 3 });
    const id = Object.keys(w.state.campaign?.marches ?? {})[0] ?? "";
    expect(error(w.try({ type: "joinMarch", playerId: "b", marchId: id, lances: 1 }))).toBe(
      "unknown_march",
    );
    w.do({ type: "joinMarch", playerId: "c", marchId: id, lances: 3 });
    tickAt(w, 11 * HOUR);
    // Militia of 5 (the campaign opened with three active merchants): 6 take it, 1 is left.
    expect(land(w, "campo")?.holder).toBe("rossi");
    expect(land(w, "campo")?.stacks.map((s) => [s.playerId, s.count])).toEqual([["a", 1]]);
    expect(meritPoints(w.ctx, w.state, "c")).toBe(3);
  });

  it("reinforce a land of the family", () => {
    const w = world(noMilan);
    takeBorgo(w);
    w.do({ type: "hireLances", playerId: "a", count: 2 });
    w.do({ type: "sendMarch", playerId: "a", land: "borgo", lances: 2 });
    tickAt(w, 11 * HOUR);
    expect(land(w, "borgo")?.stacks.reduce((n, s) => n + s.count, 0)).toBe(3);
  });
});

describe("glory", () => {
  it("counts each open hour a land is held", () => {
    const w = world(noMilan);
    takeBorgo(w);
    expect(liveGlory(w.ctx, w.state, w.ctx.startAt + 12 * HOUR + 20 * MIN)).toEqual({
      rossi: 2,
      verdi: 0,
    });
    // Held to the close at 22 h in Paris: 10 h 40.
    tickAt(w, 23 * HOUR);
    expect(liveGlory(w.ctx, w.state, w.now)).toEqual({ rossi: 10, verdi: 0 });
  });

  it("a garrison thins as its lances leave, the land staying with the family", () => {
    const w = world(noMilan);
    takeBorgo(w);
    tickAt(w, 58 * HOUR);
    expect(land(w, "borgo")?.stacks).toEqual([]);
    expect(land(w, "borgo")?.holder).toBe("rossi");
  });
});

describe("Milan", () => {
  it("rides against the family ahead, on its border", () => {
    const w = world();
    takeBorgo(w);
    // Every 4 open hours from the opening: at 8 h nobody led; at 12 h the Rossi do.
    tickAt(w, 11 * HOUR);
    const ride = Object.values(w.state.campaign?.marches ?? {}).find((m) => m.family === "milan");
    // 4 + 1 per active merchant, doubled by a lead of 100 %.
    expect(ride?.target).toBe("borgo");
    expect(ride?.npc).toBe(12);
    expect(ride?.arriveAt).toBe(w.ctx.startAt + 11 * HOUR + 30 * MIN);
    tickAt(w, 11 * HOUR + 30 * MIN);
    expect(land(w, "borgo")?.holder).toBe("milan");
    expect(land(w, "borgo")?.npc).toBe(11);
  });

  it("mans its fortresses again each day", () => {
    const w = world(noMilan);
    const c = w.state.campaign;
    if (!c) throw new Error("no campaign");
    const rocca = c.lands.rocca;
    if (!rocca) throw new Error("no fortress");
    expect(rocca.holder).toBe("milan");
    // Two active merchants: 6 + 2 × 2.
    expect(rocca.npc).toBe(10);
    w.state = {
      ...w.state,
      campaign: { ...c, lands: { ...c.lands, rocca: { ...rocca, npc: 1 } } },
    };
    tickAt(w, DAY + HOUR);
    expect(land(w, "rocca")?.npc).toBe(10);
  });
});

describe("the week", () => {
  it("closes on the family with the most glory, imposes its programme, opens the map again", () => {
    const w = world(noMilan);
    w.at(10 * HOUR);
    w.do({
      type: "voteProgramme",
      playerId: "a",
      picks: [
        { code: "gabelle", target: "bread" },
        { code: "faveur", target: "padova" },
      ],
    });
    takeBorgo(w);
    // On the last day, two more lances in garrison: they will come back to a's reserve.
    w.at(6 * DAY + 10 * HOUR);
    w.do({ type: "hireLances", playerId: "a", count: 2 });
    w.do({ type: "sendMarch", playerId: "a", land: "borgo", lances: 2 });
    tickAt(w, WEEK + MIN);
    const c = w.state.campaign;
    expect(c?.week).toBe(1);
    // 10 h 40 the first day, then 14 open hours a day for six days.
    expect(c?.history[0]).toMatchObject({
      week: 0,
      winner: "rossi",
      glory: { rossi: 94, verdi: 0 },
      decrees: [
        { code: "gabelle", target: "bread" },
        { code: "faveur", target: "padova" },
      ],
      captains: { rossi: "a" },
      final: false,
    });
    expect(c?.decrees).toMatchObject({ week: 1, family: "rossi", cities: [] });
    expect(c?.decrees?.shares.a).toBeGreaterThan(0);
    // The map opens again: the seats to their families, the rest to the militia and Milan.
    expect(land(w, "borgo")?.holder).toBeNull();
    expect(land(w, "nord")?.holder).toBe("rossi");
    expect(land(w, "rocca")?.holder).toBe("milan");
    expect(reserveOf(w.state, "a", w.now)).toBe(2);
    expect(c?.glory).toEqual({});
    expect(c?.ballots).toEqual({});
  });

  it("the last week closes the campaign, without decrees", () => {
    const w = world(noMilan);
    takeBorgo(w);
    w.at(seasonEnd(w.ctx) - w.ctx.startAt + MIN).do({ type: "tick" });
    const c = w.state.campaign;
    expect(c?.closed).toBe(true);
    expect(c?.history).toHaveLength(6);
    expect(c?.history.at(-1)?.final).toBe(true);
    expect(c?.history.at(-1)?.decrees).toEqual([]);
    expect(c?.decrees).toBeUndefined();
  });
});

describe("the guilds of an older world", () => {
  it("pay their treasuries back by carats, then are gone", () => {
    const w = world();
    // A guild of the time before the families, with 10 d in its treasury.
    const fx = {
      ledger: [
        { from: "cash:a", to: "guild:g1", amount: 600n, reason: "guild_stake" as const, at: 0 },
        { from: "cash:b", to: "guild:g1", amount: 400n, reason: "guild_stake" as const, at: 0 },
      ],
      stock: [],
      trades: [],
      events: [],
    };
    accumulate(w.totals, fx);
    w.state = {
      ...w.state,
      accounts: {
        ...w.state.accounts,
        "cash:a": w.cash("a") - 600n,
        "cash:b": w.cash("b") - 400n,
        "guild:g1": 1_000n,
      },
      guilds: {
        guilds: { g1: { members: { a: { carats: 3 }, b: { carats: 1 } }, caratsIssued: 4 } },
      },
      concessions: {},
      wars: {},
    };
    const a = w.cash("a");
    const b = w.cash("b");
    tickAt(w, HOUR);
    expect(w.cash("a") - a).toBe(750n);
    expect(w.cash("b") - b).toBe(250n);
    expect(w.state.accounts["guild:g1"]).toBe(0n);
    expect(w.state.guilds).toBeUndefined();
    expect(w.state.wars).toBeUndefined();
  });
});
