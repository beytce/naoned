import { describe, expect, it } from "vitest";
import {
  type Command,
  type WorldSettingsInput,
  atoutOffer,
  maxVehiclesFor,
  specialtyEffects,
} from "../src/index.js";
import { DAY, HOUR, World, makeContext } from "./helpers.js";

/**
 * The Atouts (R3 of the audit of 27 October 2026, docs/plan-rupture.md): each week a merchant is
 * offered three Atouts of its pool and takes one for the season. Each gives and takes; their
 * effects add up with the mastery's.
 */

const atouts = {
  perWeek: 1,
  choices: 3,
  catalog: {
    banchiere: { starter: true, effects: { taxDiscountBps: 200, marketMakerQuotaBps: -5_000 } },
    gondoliere: { starter: true, effects: { vehicleSpeedBps: 2_500, extraVehicles: -1 } },
    vetraio: { starter: true, effects: { transformYieldBps: 1_000, rawYieldBps: -1_000 } },
    sensale: { starter: true, effects: { extraOpenOrders: 4, taxDiscountBps: -100 } },
    carrettiere: { starter: true, effects: { extraVehicles: 1, vehicleSpeedBps: -1_500 } },
    armatore: { unlock: "incanto", effects: { mudaQuotaBps: 10_000 } },
  },
};

const world = (more: Partial<WorldSettingsInput> = {}) => {
  const w = new World(makeContext({ atouts, ...more } as Partial<WorldSettingsInput>));
  w.at(9 * HOUR);
  w.do({ type: "join", playerId: "a", region: "terraferma" });
  return w;
};
const choose = (w: World, code: string) =>
  w.try({ type: "chooseAtout", playerId: "a", code } as Command);
const error = (res: ReturnType<World["try"]>) => (res.ok ? "ok" : res.error);

describe("the Atouts", () => {
  it("offers three Atouts of the pool, the same all week, the unlocked only once unlocked", () => {
    const w = world();
    const offer = atoutOffer(w.ctx, w.state, "a", w.now);
    expect(offer).toHaveLength(3);
    expect(new Set(offer).size).toBe(3);
    expect(offer).not.toContain("armatore");
    expect(atoutOffer(w.ctx, w.state, "a", w.now + 2 * DAY)).toEqual(offer);
    w.do({ type: "unlockAtout", playerId: "a", code: "armatore" } as Command);
    expect(w.state.players.a?.atoutPool).toContain("armatore");
  });

  it("takes one Atout of the offer a week, never another nor twice", () => {
    const w = world();
    const offer = atoutOffer(w.ctx, w.state, "a", w.now);
    const outside = Object.keys(atouts.catalog).find((c) => !offer.includes(c)) ?? "";
    expect(error(choose(w, outside))).toBe("atout_not_offered");
    expect(error(choose(w, offer[0] ?? ""))).toBe("ok");
    expect(error(choose(w, offer[1] ?? ""))).toBe("atout_taken");
    expect(w.state.players.a?.atouts).toEqual([offer[0]]);
    // Next week: a new offer, without the Atout already held.
    w.advance(7 * DAY);
    const next = atoutOffer(w.ctx, w.state, "a", w.now);
    expect(next).not.toContain(offer[0]);
    expect(error(choose(w, next[0] ?? ""))).toBe("ok");
    expect(w.state.players.a?.atouts).toHaveLength(2);
  });

  it("adds the Atouts' effects, signed, and never takes the last vehicle", () => {
    const w = world();
    const a = w.state.players.a;
    if (!a) throw new Error("no a");
    w.state = {
      ...w.state,
      players: { ...w.state.players, a: { ...a, atouts: ["banchiere", "gondoliere", "vetraio"] } },
    };
    const fx = specialtyEffects(w.ctx, w.state, "a");
    expect(fx.taxDiscountBps).toBe(200);
    expect(fx.marketMakerQuotaBps).toBe(-5_000);
    expect(fx.vehicleSpeedBps).toBe(2_500);
    expect(fx.transformYieldBps).toBe(1_000);
    expect(fx.rawYieldBps).toBe(-1_000);
    const base = w.ctx.settings.deliveries.maxVehicles;
    expect(maxVehiclesFor(w.ctx, w.state, "a")).toBe(Math.max(1, base - 1));
  });

  it("offers nothing without its settings", () => {
    const w = world({ atouts: undefined } as never);
    expect(atoutOffer(w.ctx, w.state, "a", w.now)).toEqual([]);
    expect(error(choose(w, "banchiere"))).toBe("atouts_off");
  });

  it("weighs the raw goods, the cities' pay and the Signoria's points by the new effects", () => {
    const more = {
      catalog: {
        ...atouts.catalog,
        contadino: { starter: true, effects: { rawYieldBps: 5_000, cityPayBps: -1_000 } },
        notaio: { starter: true, effects: { signoriaBps: 10_000 } },
      },
    };
    const w = world({ atouts: { ...atouts, ...more } } as never);
    const a = w.state.players.a;
    if (!a) throw new Error("no a");
    w.state = {
      ...w.state,
      players: { ...w.state.players, a: { ...a, atouts: ["contadino", "notaio"] } },
    };
    const fx = specialtyEffects(w.ctx, w.state, "a");
    expect(fx.rawYieldBps).toBe(5_000);
    expect(fx.cityPayBps).toBe(-1_000);
    expect(fx.signoriaBps).toBe(10_000);
    // A raw workshop makes half as much again.
    const farm = Object.values(w.state.buildings).find(
      (b) => b.playerId === "a" && b.type === "farm",
    );
    if (!farm) throw new Error("no farm");
    w.do({
      type: "startProduction",
      playerId: "a",
      buildingId: farm.id,
      recipe: "grow_wheat",
      batches: 1,
    } as Command);
    w.advance(DAY).do({ type: "collect", playerId: "a", buildingId: farm.id } as Command);
    const base = new World(makeContext({ atouts } as Partial<WorldSettingsInput>));
    base.at(9 * HOUR).do({ type: "join", playerId: "a", region: "terraferma" });
    const farm0 = Object.values(base.state.buildings).find((b) => b.type === "farm");
    if (!farm0) throw new Error("no farm");
    base.do({
      type: "startProduction",
      playerId: "a",
      buildingId: farm0.id,
      recipe: "grow_wheat",
      batches: 1,
    } as Command);
    base.advance(DAY).do({ type: "collect", playerId: "a", buildingId: farm0.id } as Command);
    expect(w.stock("a", "wheat").available).toBeGreaterThan(base.stock("a", "wheat").available);
  });
});
