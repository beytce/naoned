import { describe, expect, it } from "vitest";
import {
  type EmpireSettingsInput,
  citiesCovered,
  empireHouseAt,
  empireView,
  parseEmpireSettings,
} from "../../src/index.js";
import type { EmpireHouse } from "../../src/state.js";
import { HOUR, World, makeContext } from "../helpers.js";
import { ordersEmpire } from "./ordersFixture.js";

// The first steps, lot 3 (docs/plan-premiers-pas.md, the owner's feedback of 6 November 2026):
// raising the Fondaco (the Casa) is felt. Each level raises the stock a fondaco holds of each good
// (once full, the workshop's lots wait in its queue, nothing lost) and the zone its orders come
// from (the reach of the first fondaco follows the Casa, up to the counters' top level).
const caps = [100, 200, 400, 800, 1_600];
const empire: EmpireSettingsInput = {
  ...ordersEmpire,
  casa: (ordersEmpire.casa ?? []).map((c, i) => ({ ...c, storeCap: caps[i] })),
  start: {
    capitalDucats: 10_000,
    workshops: [{ type: "farm", recipe: "grow_wheat" }],
    vehicles: ["cart"],
  },
  map: { ...ordersEmpire.map, reach: { base: 30, perLevel: 20, byCasa: true } },
  counters: { maxLevel: 3, bookStepBps: 4_000 },
};
const s = parseEmpireSettings(empire);

function world(settings: EmpireSettingsInput = empire) {
  const w = new World(makeContext({ empire: settings }));
  w.do({ type: "empireJoin", playerId: "a" });
  return w;
}
const house = (w: World) => empireHouseAt(w.ctx, w.state, "a", w.now) as EmpireHouse;
const view = (w: World) => empireView(w.ctx, w.state, "a", w.now);
const wheat = (w: World) => w.state.inventories.a?.wheat?.available ?? 0;
const relaunch = (w: World) => w.do({ type: "empireRelaunchAll", playerId: "a" });
const raiseCasa = (w: World) => {
  w.do({ type: "empireBuildCasa", playerId: "a" });
  w.advance(HOUR);
  w.do({ type: "empireSettle", playerId: "a" });
};

describe("the Fondaco's zone", () => {
  it("grows with the Casa, never shrinks, up to the counters' top level", () => {
    const w = world();
    const at = (casa: number, homeLevel?: number) =>
      citiesCovered({ ...house(w), casa, ...(homeLevel ? { homeLevel } : {}) }, s);
    expect(view(w)?.map.home.reach).toBe(30);
    raiseCasa(w);
    expect(house(w).casa).toBe(2);
    expect(view(w)?.map.home.reach).toBe(50);
    // A higher Casa covers what the lower did, and more.
    for (const c of at(1)) expect(at(2).has(c)).toBe(true);
    expect(at(5).size).toBeGreaterThanOrEqual(at(1).size);
    // The top level of the counters bounds it; a home raised before keeps its level.
    expect(at(5)).toEqual(at(3));
    expect(at(1, 3)).toEqual(at(3));
  });

  it("stays the home counter's own without byCasa", () => {
    const w = world({ ...empire, map: { ...empire.map, reach: { base: 30, perLevel: 20 } } });
    raiseCasa(w);
    expect(view(w)?.map.home.reach).toBe(30);
  });

  it("shows in the next Casa what it will cover, and the stock it will hold", () => {
    const w = world();
    const next = view(w)?.nextCasa;
    expect(next?.storeCap).toBe(200);
    expect(next?.reach).toBe(50);
    expect(view(w)?.storeCap).toBe(100);
    // The towns gained: those the next level covers, not this one.
    const now = citiesCovered(house(w), s);
    for (const c of next?.newCities ?? []) expect(now.has(c)).toBe(false);
  });

  // Lot 4: a town out of the zone shows the Fondaco's level that reaches it, on its lock.
  it("tells, for each town out of the zone, the Casa that will reach it", () => {
    const w = world();
    const m = view(w)?.map;
    const zone = m?.zoneCasa ?? {};
    expect(Object.keys(zone).length).toBeGreaterThan(0);
    for (const c of m?.covered ?? []) expect(zone[c]).toBeUndefined();
    for (const [code, casa] of Object.entries(zone)) {
      expect(casa).toBeGreaterThan(1);
      expect(citiesCovered({ ...house(w), casa }, s).has(code)).toBe(true);
      expect(citiesCovered({ ...house(w), casa: casa - 1 }, s).has(code)).toBe(false);
    }
  });
});

describe("the Fondaco's stock", () => {
  it("stops a workshop's lots at the cap, waiting in its queue, nothing lost", () => {
    const w = world();
    relaunch(w);
    // Six lots of 20 wheat: five fit under 100.
    w.advance(6 * HOUR);
    relaunch(w);
    expect(wheat(w)).toBe(100);
    const job = house(w).workshops[0]?.job;
    // The sixth waits, ready, in the queue; the view names the workshop as full.
    expect(job?.startedAt).toBe(w.now - HOUR);
    expect(view(w)?.full).toEqual([house(w).workshops[0]?.id]);
    // Room made (sold), it comes in at the next collect.
    w.do({ type: "empireSell", playerId: "a", good: "wheat", qty: 40 });
    const left = wheat(w);
    expect(left).toBeLessThanOrEqual(80);
    relaunch(w);
    expect(wheat(w)).toBe(left + 20);
    expect(view(w)?.full).toEqual([]);
  });

  it("raises the cap with the Casa", () => {
    const w = world();
    raiseCasa(w);
    relaunch(w);
    w.advance(12 * HOUR);
    relaunch(w);
    expect(wheat(w)).toBe(200);
  });

  it("caps nothing without a cap set", () => {
    const w = world({ ...empire, casa: ordersEmpire.casa ?? [] });
    relaunch(w);
    w.advance(6 * HOUR);
    relaunch(w);
    expect(wheat(w)).toBe(120);
  });
});
