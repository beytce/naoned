import { describe, expect, it } from "vitest";
import {
  type EmpireHouse,
  type EmpireSettingsInput,
  type EmpireWorkshop,
  interiorPaceBps,
  parseEmpireSettings,
} from "../../src/index.js";
import { testEmpire, testInterior } from "../fixture.js";
import { DAY, HOUR, World, makeContext } from "../helpers.js";

// The systems the insides absorb (docs/plan-ateliers.md lot A7, decisions of 6 November 2026):
// the workshop modules (tools, apprentices, master), the master on a workshop and the knowledge of
// the craft stop counting on a workshop that has its inside; what they gave is turned into the
// inside — station levels and stations — so that no house makes less. The furnace keeps its
// saving of inputs. The knowledge opens station levels instead.
const modules = [
  {
    code: "tools",
    kind: "workshop",
    effect: "workshopYield",
    firstLevelBps: 1_000,
    perLevelBps: 500,
  },
  {
    code: "apprentices",
    kind: "workshop",
    effect: "workshopSpeed",
    firstLevelBps: 1_000,
    perLevelBps: 500,
  },
  { code: "master", kind: "workshop", effect: "quality", firstLevelBps: 1_000, perLevelBps: 500 },
  { code: "furnace", kind: "workshop", effect: "inputs", firstLevelBps: 500, perLevelBps: 300 },
] as const;
const base: EmpireSettingsInput = {
  ...testEmpire,
  casa: testEmpire.casa.map((c) => ({ ...c, buildMinutes: 0, materials: {} })),
  start: { capitalDucats: 100_000, workshops: [{ type: "farm", recipe: "grow_wheat" }] },
  queueHours: 12,
  modules: [...(testEmpire.modules ?? []), ...modules],
  knowledge: {
    baseCostDucats: 0,
    costGrowthBps: 10_000,
    minutes: [0],
    slotsAt: [1],
    branches: [
      {
        code: "arti",
        nodes: [{ code: "mestiere", effects: { workshopYield: 500 } }],
        capstones: [{ code: "bottega", effects: { moduleSlotsExtra: 1 } }],
      },
    ],
  },
  staff: {
    hireCostDucats: 100,
    hireGrowthBps: 10_000,
    slotsBase: 3,
    casaPerSlot: 4,
    xpPerLevel: 10,
    maxLevel: 30,
    tierEvery: 5,
    rarityBps: { common: 10_000, rare: 15_000, illustrious: 20_000 },
    roles: {
      master: { place: "workshop", perLevel: { workshopYield: 100, quality: 50 }, paths: [] },
    },
  },
};
const interior = {
  ...testInterior,
  unlocks: { baseLevel: 1, byKnowledge: { mestiere: 2 } },
  buildings: { farm: testInterior.buildings.test_works as never },
};
const withInterior: EmpireSettingsInput = { ...base, interior };
const s = parseEmpireSettings(withInterior);

/** A house of before: tools 2, apprentices 1, master 1 and furnace 1 fitted, a master placed, the craft known. */
function before() {
  const w = new World(makeContext({ empire: base }));
  w.do({ type: "empireJoin", playerId: "a" });
  w.state = structuredClone(w.state);
  const h = w.state.empire?.houses.a as EmpireHouse;
  const ws = h.workshops[0] as EmpireWorkshop;
  h.modules = { tools: 2, apprentices: 1, master: 1, furnace: 1 };
  ws.fitted = ["tools", "apprentices", "master", "furnace"];
  h.knowledge = ["mestiere"];
  h.staff = [
    { id: "m1", role: "master", rarity: "rare", level: 5, xp: 40, skills: [], placedAt: ws.id },
  ];
  return w;
}

/** The same world, its settings now with the insides (the switch). */
function switched(w: World) {
  const next = new World(makeContext({ empire: withInterior }));
  next.state = w.state;
  next.now = w.now;
  next.totals = w.totals;
  return next;
}

const house = (w: World) => w.state.empire?.houses.a as EmpireHouse;
const farm = (w: World) => house(w).workshops[0] as EmpireWorkshop;
const wheat = (w: World) => w.state.inventories.a?.wheat?.available ?? 0;
const relaunch = (w: World) =>
  w.do({ type: "empireRelaunch", playerId: "a", workshopId: farm(w).id });

/** Wheat made over twelve hours, from a fresh queue. */
function twelveHours(w: World): number {
  relaunch(w);
  const from = wheat(w);
  w.advance(12 * HOUR);
  relaunch(w);
  return wheat(w) - from;
}

describe("the systems the insides absorb", () => {
  it("no house makes less after the switch: what the modules, the master and the craft gave is in its inside", () => {
    const old = twelveHours(before());
    const w = switched(before());
    const now = twelveHours(w);
    expect(now).toBeGreaterThanOrEqual(old);
    // Turned into stations and levels the player sees.
    const inside = farm(w).interior;
    expect(inside?.v).toBe(2);
    const levels = inside?.stations.reduce((n, x) => n + x.level, 0) ?? 0;
    expect(levels + (inside?.stations.length ?? 0)).toBeGreaterThan(6);
    // Right after the switch, before any wear: quicker than its default plan.
    const fresh = switched(before());
    relaunch(fresh);
    expect(interiorPaceBps(farm(fresh), house(fresh), s, fresh.now)).toBeGreaterThan(10_000);
  });

  it("what the hall cannot hold yet stays as « acquis », never lost", () => {
    const old0 = before();
    const h0 = old0.state.empire?.houses.a as EmpireHouse;
    h0.modules = { ...h0.modules, tools: 30, apprentices: 30 };
    const old = twelveHours(old0);
    const big = before();
    const h1 = big.state.empire?.houses.a as EmpireHouse;
    h1.modules = { ...h1.modules, tools: 30, apprentices: 30 };
    const w = switched(big);
    expect(twelveHours(w)).toBeGreaterThanOrEqual(old);
    expect(farm(w).interior?.legacyBps ?? 0).toBeGreaterThan(0);
  });

  it("the master becomes a hand of the workshop, at work at a station", () => {
    const w = switched(before());
    relaunch(w);
    const m = house(w).staff?.[0];
    expect(m?.placedAt).toBeUndefined();
    expect(m?.station?.workshopId).toBe(farm(w).id);
    expect(m?.trade).toBeDefined();
  });

  it("the quality of the master and its module is kept as care", () => {
    const w = switched(before());
    relaunch(w);
    expect(farm(w).interior?.stations.some((x) => x.care > 0)).toBe(true);
  });

  it("the furnace still saves inputs; the other workshop modules no longer count", () => {
    const w = switched(before());
    relaunch(w);
    const fitted = farm(w).fitted ?? [];
    expect(fitted).toEqual(["furnace"]);
  });

  it("refuses to research, fit or hire what the insides replaced", () => {
    const w = switched(before());
    expect(w.try({ type: "empireResearch", playerId: "a", module: "tools" }).ok).toBe(false);
    expect(
      w.try({ type: "empireFit", playerId: "a", workshopId: farm(w).id, slot: 0, module: "tools" })
        .ok,
    ).toBe(false);
    expect(w.try({ type: "empireHire", playerId: "a", role: "master" }).ok).toBe(false);
  });

  it("the knowledge of the craft opens the stations' higher levels", () => {
    const w = switched(before());
    relaunch(w);
    // With the craft known, level 2 (the fixture's last) is open; without it, level 1 only.
    const s1 = farm(w).interior?.stations.find((x) => x.kind === "kiln" && x.level === 1);
    void s1;
    const fresh = new World(makeContext({ empire: withInterior }));
    fresh.do({ type: "empireJoin", playerId: "a" });
    const r = fresh.try({
      type: "empireInteriorUpgrade",
      playerId: "a",
      workshopId: farm(fresh).id,
      stationId: "s1",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("locked");
    fresh.state = structuredClone(fresh.state);
    const h = fresh.state.empire?.houses.a as EmpireHouse;
    h.knowledge = ["mestiere"];
    expect(
      fresh.try({
        type: "empireInteriorUpgrade",
        playerId: "a",
        workshopId: farm(fresh).id,
        stationId: "s1",
      }).ok,
    ).toBe(true);
  });

  it("a house of after (no module, no master) is left as its default plan", () => {
    const w = new World(makeContext({ empire: withInterior }));
    w.do({ type: "empireJoin", playerId: "a" });
    w.advance(DAY);
    relaunch(w);
    expect(interiorPaceBps(farm(w), house(w), s, w.now)).toBe(10_000);
    expect(farm(w).interior?.stations).toHaveLength(3);
  });
});
