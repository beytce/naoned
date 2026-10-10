import { describe, expect, it } from "vitest";
import type { Command, WorldSettingsInput } from "../src/index.js";
import { testSettings } from "./fixture.js";
import { DAY, HOUR, World, makeContext } from "./helpers.js";

const ship = (defense: number, holdValue = 100_000) => ({
  costDucats: 10_000,
  costMaterials: {},
  holdValue,
  speedBps: 10_000,
  defense,
  upkeepPerDay: 0,
  repairCost: 2_000,
  repairHours: 2,
});

const route = {
  hours: 10,
  charter: 4_000,
  escort: 2_000,
  provisions: {},
  riskBps: 0,
  escortRiskBps: 0,
  returns: "spices",
  gainBps: 0,
  maxCargoValue: 100_000,
};

const privateers = {
  maxActive: 1,
  letterFee: 5_000,
  hours: 12,
  provisions: { bread: 2 },
  shareBps: 3_000,
  minChanceBps: 10_000,
  maxChanceBps: 10_000,
  newcomerDays: 0,
  minTargetWorthBps: 5_000,
  cooldownHours: 24,
};

const sea = (p: Partial<typeof privateers> = {}, more: Partial<WorldSettingsInput> = {}) =>
  makeContext({
    referencePrices: { ...testSettings.referencePrices, spices: 100 },
    expeditions: { maxActive: 2, destinations: { acre: route, candia: route } },
    ships: {
      maxPerPlayer: 4,
      portDuesBps: 0,
      types: { cog: ship(1), galley: ship(2, 1_000) },
    },
    privateers: { ...privateers, ...p },
    ...more,
  });

function world(p: Partial<typeof privateers> = {}, more: Partial<WorldSettingsInput> = {}) {
  const w = new World(sea(p, more));
  for (const id of ["raider", "victim", "other"]) {
    w.do({ type: "join", playerId: id, region: "terraferma" });
    w.give(id, "bread", 40).give(id, "wheat", 1_000);
  }
  return w;
}

const shipOf = (w: World, playerId: string, type = "cog") => {
  w.do({ type: "buildShip", playerId, shipType: type });
  return (
    Object.values(w.state.ships ?? {})
      .filter((s) => s.playerId === playerId)
      .at(-1)?.id ?? ""
  );
};

const commission = (w: World, ships: string[], route = "acre") =>
  w.try({ type: "commissionPrivateers", playerId: "raider", route, ships } as Command);

const convoy = (w: World, playerId: string, ships: string[], destination = "acre") => {
  w.do({
    type: "launchExpedition",
    playerId,
    destination,
    cargo: { wheat: 500 },
    escort: false,
    ships,
  } as Command);
  return Object.values(w.state.expeditions ?? {}).at(-1)?.id ?? "";
};

const raidOf = (w: World) => Object.values(w.state.raids ?? {})[0];

describe("letters of marque", () => {
  it("cost a fee and provisions, and keep the ships at sea until the corsairs come back", () => {
    const w = world();
    const cog = shipOf(w, "raider");
    const cash = w.cash("raider");
    expect(commission(w, [cog]).ok).toBe(true);
    expect(cash - w.cash("raider")).toBe(5_000n);
    expect(w.stock("raider", "bread").available).toBe(38);
    const busy = w.try({
      type: "launchExpedition",
      playerId: "raider",
      destination: "acre",
      cargo: { wheat: 10 },
      escort: false,
      ships: [cog],
    } as Command);
    expect(busy.ok).toBe(false);
    const raid = raidOf(w);
    const early = w.try({ type: "collectRaid", playerId: "raider", raidId: raid?.id ?? "" });
    expect(early.ok).toBe(false);
    w.advance(12 * HOUR);
    w.do({ type: "collectRaid", playerId: "raider", raidId: raid?.id ?? "" });
    expect(w.state.raids?.[raid?.id ?? ""]?.outcome).toBe("returned");
  });

  it("need ships of one's own", () => {
    const w = world();
    const res = commission(w, []);
    expect(res.ok).toBe(false);
    const off = new World(sea({ maxActive: 0 }));
    off.do({ type: "join", playerId: "raider", region: "terraferma" });
    const cog = shipOf(off, "raider");
    expect(commission(off, [cog]).ok).toBe(false);
  });
});

describe("boarding", () => {
  it("takes 30 % of a convoy's cargo, damages its merchant ship, and brings the booty home", () => {
    const w = world();
    const corsair = shipOf(w, "raider");
    const merchant = shipOf(w, "victim");
    commission(w, [corsair]);
    const id = convoy(w, "victim", [merchant]);
    // Mid-voyage after 5 h: the next tick resolves the encounter.
    w.advance(5 * HOUR).do({ type: "tick" });
    const e = w.state.expeditions?.[id];
    expect(e?.cargo.wheat).toBe(350);
    expect(w.state.ships?.[merchant]?.damaged).toBe(true);
    const hit = raidOf(w)?.hits[0];
    expect(hit).toMatchObject({ expeditionId: id, victimId: "victim", success: true });
    expect(hit?.taken).toEqual({ wheat: 150 });

    w.advance(5 * HOUR);
    w.do({ type: "collectExpedition", playerId: "victim", expeditionId: id });
    // 350 wheat × 100 = 35 000, back as spices at 100.
    expect(w.stock("victim", "spices").available).toBe(350);
    w.advance(2 * HOUR);
    w.do({ type: "collectRaid", playerId: "raider", raidId: raidOf(w)?.id ?? "" });
    expect(w.stock("raider", "wheat").available).toBe(1_150);
  });

  it("can fail: the corsairs come back damaged and stop hunting", () => {
    const w = world({ minChanceBps: 0, maxChanceBps: 0 });
    const corsair = shipOf(w, "raider");
    commission(w, [corsair]);
    const first = convoy(w, "victim", [shipOf(w, "victim")]);
    w.advance(HOUR);
    const second = convoy(w, "other", [shipOf(w, "other")]);
    w.advance(10 * HOUR).do({ type: "tick" });
    expect(w.state.expeditions?.[first]?.cargo.wheat).toBe(500);
    expect(w.state.expeditions?.[second]?.cargo.wheat).toBe(500);
    expect(raidOf(w)?.beaten).toBe(true);
    expect(raidOf(w)?.hits).toHaveLength(1);
    expect(w.state.ships?.[corsair]?.damaged).toBe(true);
  });

  it("weighs the corsairs' strength against the escort", () => {
    const w = world({ minChanceBps: 0, maxChanceBps: 10_000 });
    const corsair = shipOf(w, "raider");
    commission(w, [corsair]);
    const merchant = shipOf(w, "victim");
    const escorts = [shipOf(w, "victim", "galley"), shipOf(w, "victim", "galley")];
    // Attack 1 against defense 5: one chance in six.
    const id = convoy(w, "victim", [merchant, ...escorts]);
    w.advance(6 * HOUR).do({ type: "tick" });
    expect(raidOf(w)?.hits[0]?.chanceBps).toBe(1_666);
    expect(w.state.expeditions?.[id]?.crossed).toBe(true);
  });

  it("carries no more booty than the corsairs' holds", () => {
    const w = world();
    const small = shipOf(w, "raider", "galley");
    commission(w, [small]);
    const id = convoy(w, "victim", [shipOf(w, "victim")]);
    w.advance(6 * HOUR).do({ type: "tick" });
    // Hold 1 000 deniers = 10 wheat.
    expect(raidOf(w)?.hits[0]?.taken).toEqual({ wheat: 10 });
    expect(w.state.expeditions?.[id]?.cargo.wheat).toBe(490);
  });
});

describe("safeguards", () => {
  it("never touch one's own convoys, other routes, or convoys that passed before", () => {
    const w = world();
    const early = convoy(w, "victim", [shipOf(w, "victim")]);
    w.advance(6 * HOUR);
    commission(w, [shipOf(w, "raider")]);
    convoy(w, "raider", [shipOf(w, "raider")]);
    const elsewhere = convoy(w, "other", [shipOf(w, "other")], "candia");
    w.advance(10 * HOUR).do({ type: "tick" });
    expect(raidOf(w)?.hits).toEqual([]);
    expect(w.state.expeditions?.[early]?.cargo.wheat).toBe(500);
    expect(w.state.expeditions?.[elsewhere]?.cargo.wheat).toBe(500);
  });

  it("spare newcomers", () => {
    const w = world({ newcomerDays: 3 });
    commission(w, [shipOf(w, "raider")]);
    const id = convoy(w, "victim", [shipOf(w, "victim")]);
    w.advance(6 * HOUR).do({ type: "tick" });
    expect(w.state.expeditions?.[id]?.cargo.wheat).toBe(500);
  });

  it("spare merchants less than half as rich as the corsair", () => {
    const w = world();
    w.give("raider", "wheat", 5_000);
    commission(w, [shipOf(w, "raider")]);
    const id = convoy(w, "victim", [shipOf(w, "victim")]);
    w.advance(6 * HOUR).do({ type: "tick" });
    expect(w.state.expeditions?.[id]?.cargo.wheat).toBe(500);
  });

  it("allow one successful boarding per merchant and per day", () => {
    const w = world({ maxActive: 2 });
    w.give("victim", "wheat", 1_000);
    commission(w, [shipOf(w, "raider")]);
    commission(w, [shipOf(w, "raider")]);
    const first = convoy(w, "victim", [shipOf(w, "victim")]);
    const second = convoy(w, "victim", [shipOf(w, "victim")]);
    w.advance(6 * HOUR).do({ type: "tick" });
    const left = [first, second].map((id) => w.state.expeditions?.[id]?.cargo.wheat);
    expect(left.sort()).toEqual([350, 500]);
    expect(w.state.raids && Object.values(w.state.raids).flatMap((r) => r.hits)).toHaveLength(1);
  });

  it("resolve the encounter when a convoy is unloaded before any tick", () => {
    const w = world();
    commission(w, [shipOf(w, "raider")]);
    const id = convoy(w, "victim", [shipOf(w, "victim")]);
    w.advance(10 * HOUR);
    w.do({ type: "collectExpedition", playerId: "victim", expeditionId: id });
    expect(w.stock("victim", "spices").available).toBe(350);
  });
});

describe("restarting", () => {
  it("is possible with a corsair at sea", () => {
    const w = world();
    commission(w, [shipOf(w, "raider")]);
    expect(w.try({ type: "resetPlayer", playerId: "raider" }).ok).toBe(true);
    expect(Object.values(w.state.raids ?? {})).toEqual([]);
    expect(DAY).toBeGreaterThan(0);
  });
});
