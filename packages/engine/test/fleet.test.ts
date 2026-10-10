import { describe, expect, it } from "vitest";
import { type Command, netWorth } from "../src/index.js";
import { testSettings } from "./fixture.js";
import { DAY, HOUR, World, makeContext } from "./helpers.js";

const ship = (
  costDucats: number,
  planks: number,
  hold: number,
  speedBps: number,
  defense: number,
) => ({
  costDucats,
  costMaterials: { planks },
  holdValue: hold,
  speedBps,
  defense,
  upkeepPerDay: 500,
  repairCost: 5_000,
  repairHours: 6,
});

const route = {
  hours: 10,
  charter: 10_000,
  escort: 5_000,
  provisions: { bread: 2 },
  riskBps: 0,
  escortRiskBps: 0,
  returns: "spices",
  gainBps: 5_000,
  maxCargoValue: 50_000,
};

const fleet = (destination: Partial<typeof route> = {}) =>
  makeContext({
    referencePrices: { ...testSettings.referencePrices, spices: 1_000 },
    expeditions: { maxActive: 2, destinations: { acre: { ...route, ...destination } } },
    ships: {
      maxPerPlayer: 3,
      portDuesBps: 2_500,
      types: {
        cog: ship(20_000, 10, 100_000, 10_000, 1),
        galley: ship(30_000, 20, 60_000, 8_000, 2),
      },
    },
  });

function setUp(w: World) {
  w.do({ type: "join", playerId: "a", region: "terraferma" });
  w.give("a", "planks", 100).give("a", "bread", 50).give("a", "wheat", 2_000);
}

const buildShip = (w: World, shipType: string) =>
  w.try({ type: "buildShip", playerId: "a", shipType });
const shipsOf = (w: World) => Object.values(w.state.ships ?? {}).filter((s) => s.playerId === "a");
const sail = (w: World, ships: string[], cargo: Record<string, number> = { wheat: 500 }) =>
  w.try({
    type: "launchExpedition",
    playerId: "a",
    destination: "acre",
    cargo,
    escort: false,
    ships,
  } as Command);

describe("the arsenal", () => {
  it("builds ships with ducats and planks; they count in net worth", () => {
    const w = new World(fleet());
    setUp(w);
    const before = netWorth(w.ctx, w.state, "a", w.now).total;
    expect(buildShip(w, "cog").ok).toBe(true);
    expect(w.cash("a")).toBe(100_000n - 20_000n);
    expect(w.stock("a", "planks").available).toBe(90);
    // Cost at reference value: worth unchanged (stock valued at reference here).
    expect(netWorth(w.ctx, w.state, "a", w.now).total).toBe(before);
    expect(shipsOf(w)).toHaveLength(1);
  });

  it("limits the fleet and refuses unknown ships", () => {
    const w = new World(fleet());
    setUp(w);
    for (let i = 0; i < 3; i++) buildShip(w, "cog");
    const fourth = buildShip(w, "cog");
    expect(fourth.ok).toBe(false);
    if (!fourth.ok) expect(fourth.error).toBe("max_ships");
    const unknown = buildShip(w, "dragon");
    expect(unknown.ok).toBe(false);
  });

  it("charges ship upkeep every day", () => {
    const w = new World(fleet());
    setUp(w);
    buildShip(w, "cog");
    w.do({ type: "tick" });
    const cash = w.cash("a");
    w.at(DAY + 60_000).do({ type: "tick" });
    // Farm + mill upkeep (1 000 + 1 500) and the cog (500).
    expect(cash - w.cash("a")).toBe(3_000n);
  });
});

describe("convoys", () => {
  it("sail on the player's own ships: port dues instead of a charter, provisions per ship", () => {
    const w = new World(fleet());
    setUp(w);
    buildShip(w, "cog");
    buildShip(w, "galley");
    const [cog, galley] = shipsOf(w).map((s) => s.id);
    const cash = w.cash("a");
    expect(sail(w, [cog ?? "", galley ?? ""]).ok).toBe(true);
    expect(cash - w.cash("a")).toBe(2_500n);
    expect(w.stock("a", "bread").available).toBe(50 - 4);
    const e = Object.values(w.state.expeditions ?? {})[0];
    expect(e?.ships).toEqual([cog, galley]);
    expect(e?.defense).toBe(3);
    // The slowest ship sets the pace.
    expect((e?.returnAt ?? 0) - (e?.departAt ?? 0)).toBe(10 * HOUR);
    // Ships at sea cannot sail again.
    const again = sail(w, [cog ?? ""], { wheat: 10 });
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.error).toBe("ship_busy");
    w.advance(10 * HOUR);
    w.do({ type: "collectExpedition", playerId: "a", expeditionId: e?.id ?? "" });
    expect(w.stock("a", "spices").available).toBe(75);
    expect(sail(w, [cog ?? ""], { wheat: 10 }).ok).toBe(true);
  });

  it("carry what the merchant ship's hold allows", () => {
    const w = new World(fleet());
    setUp(w);
    buildShip(w, "galley");
    const [galley] = shipsOf(w).map((s) => s.id);
    const full = sail(w, [galley ?? ""], { wheat: 700 });
    expect(full.ok).toBe(false);
    if (!full.ok) expect(full.error).toBe("cargo_too_valuable");
    // The galley is faster.
    expect(sail(w, [galley ?? ""], { wheat: 600 }).ok).toBe(true);
    const e = Object.values(w.state.expeditions ?? {})[0];
    expect((e?.returnAt ?? 0) - (e?.departAt ?? 0)).toBe(8 * HOUR);
  });

  it("are safer with escorts, and pirates damage the merchant ship", () => {
    const risky = fleet({ riskBps: 10_000, escortRiskBps: 0 });
    const alone = new World(risky);
    setUp(alone);
    buildShip(alone, "cog");
    const [cog] = shipsOf(alone).map((s) => s.id);
    sail(alone, [cog ?? ""]);
    alone.advance(10 * HOUR);
    const e = Object.values(alone.state.expeditions ?? {})[0];
    alone.do({ type: "collectExpedition", playerId: "a", expeditionId: e?.id ?? "" });
    expect(alone.state.expeditions?.[e?.id ?? ""]?.outcome).toBe("lost");
    expect(alone.state.ships?.[cog ?? ""]?.damaged).toBe(true);

    // A damaged ship stays in port until repaired, and the repair takes time.
    const blocked = sail(alone, [cog ?? ""], { wheat: 10 });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.error).toBe("ship_damaged");
    const cash = alone.cash("a");
    alone.do({ type: "repairShip", playerId: "a", shipId: cog ?? "" });
    expect(cash - alone.cash("a")).toBe(5_000n);
    const early = sail(alone, [cog ?? ""], { wheat: 10 });
    expect(early.ok).toBe(false);
    if (!early.ok) expect(early.error).toBe("ship_busy");
    alone.advance(6 * HOUR);
    expect(sail(alone, [cog ?? ""], { wheat: 10 }).ok).toBe(true);

    const escorted = new World(risky);
    setUp(escorted);
    buildShip(escorted, "cog");
    buildShip(escorted, "galley");
    sail(
      escorted,
      shipsOf(escorted).map((s) => s.id),
    );
    escorted.advance(10 * HOUR);
    const f = Object.values(escorted.state.expeditions ?? {})[0];
    escorted.do({ type: "collectExpedition", playerId: "a", expeditionId: f?.id ?? "" });
    expect(escorted.state.expeditions?.[f?.id ?? ""]?.outcome).toBe("returned");
  });

  it("refuse someone else's ship, the same ship twice, or too many ships", () => {
    const w = new World(fleet());
    setUp(w);
    w.do({ type: "join", playerId: "b", region: "lagoon" });
    w.give("b", "planks", 50);
    w.do({ type: "buildShip", playerId: "b", shipType: "cog" });
    const theirs = Object.values(w.state.ships ?? {}).find((s) => s.playerId === "b")?.id ?? "";
    const stolen = sail(w, [theirs]);
    expect(stolen.ok).toBe(false);
    if (!stolen.ok) expect(stolen.error).toBe("not_owner");
    buildShip(w, "cog");
    const [cog] = shipsOf(w).map((s) => s.id);
    const twice = sail(w, [cog ?? "", cog ?? ""]);
    expect(twice.ok).toBe(false);
    if (!twice.ok) expect(twice.error).toBe("invalid_fleet");
  });

  it("still allow chartering a galley without owning a ship", () => {
    const w = new World(fleet());
    setUp(w);
    const cash = w.cash("a");
    expect(sail(w, []).ok).toBe(true);
    expect(cash - w.cash("a")).toBe(10_000n);
    expect(Object.values(w.state.expeditions ?? {})[0]?.defense).toBe(1);
  });

  it("leave with the player who restarts", () => {
    const w = new World(fleet());
    setUp(w);
    buildShip(w, "cog");
    w.do({ type: "resetPlayer", playerId: "a" });
    expect(Object.keys(w.state.ships ?? {})).toEqual([]);
  });
});
