import { describe, expect, it } from "vitest";
import {
  type BattleOutcome,
  type EmpireSettingsInput,
  createBattle,
  empireHouseAt,
  parseEmpireSettings,
  portaEntrant,
  portaTravelMinutes,
  portaUpgradeCost,
  tierOpen,
  weekPoints,
} from "../../src/index.js";
import type { EmpireHouse } from "../../src/state.js";
import { testEmpire } from "../fixture.js";
import { HOUR, MIN, World, makeContext } from "../helpers.js";

// The Porta (docs/plan-porta.md §§ 3, 7–9), on the frozen fixture.
const empire: EmpireSettingsInput = {
  ...testEmpire,
  casa: testEmpire.casa.map((c) => ({ ...c, materials: {}, buildMinutes: 0, costDucats: 0 })),
  start: { capitalDucats: 100_000, workshops: [], vehicles: ["cart"] },
  map: { ...testEmpire.map, depot: { costDucats: 200, casa: 2, minutes: 60 } },
  vehicles: {
    cart: { casa: 1, capacity: 50, costDucats: 100, regions: ["veneto"], speedBps: 0 },
  },
};
const s = parseEmpireSettings(empire);
const D = 100n;

const error = (res: { ok: boolean; error?: string }) => (res.ok ? "" : res.error);
const house = (w: World) => empireHouseAt(w.ctx, w.state, "a", w.now) as EmpireHouse;

function world() {
  const w = new World(makeContext({ empire }));
  w.do({ type: "empireJoin", playerId: "a" });
  w.do({ type: "empireBuildCasa", playerId: "a" });
  w.do({ type: "empireBuildDepot", playerId: "a", cell: "1,0" });
  w.advance(HOUR);
  return w;
}
function withPorta() {
  const w = world();
  w.do({ type: "empireBuildPorta", playerId: "a", cell: "1,1" });
  w.advance(HOUR);
  return w;
}
/** A rider with lances and the cart, docked at the Porta. */
function docked() {
  const w = withPorta();
  w.do({ type: "empireBuyArm", playerId: "a", model: "rider" });
  w.do({ type: "empireBuyComponent", playerId: "a", code: "lances" });
  const h = house(w);
  const rider = h.arms?.vehicles[0]?.id ?? "";
  const cart = h.vehicles?.[0]?.id ?? "";
  const lances = h.arms?.components[0]?.id ?? "";
  w.do({ type: "empireFitArm", playerId: "a", vehicleId: rider, slot: 0, componentId: lances });
  w.do({ type: "empireSendToPorta", playerId: "a", vehicleIds: [rider, cart] });
  w.advance(10 * MIN);
  w.give("a", "bread", 100);
  return { w, rider, cart, lances };
}
const enter = (w: World, rider: string, cart: string, tier = 1, battleId = "b1") =>
  w.try({
    type: "empirePortaEnter",
    playerId: "a",
    battleId,
    tier,
    combatId: rider,
    transportId: cart,
  });

describe("the Porta", () => {
  it("is put down on a free land cell the house sees, from its Casa, and stands after its site", () => {
    const w = world();
    expect(error(w.try({ type: "empireBuildPorta", playerId: "a", cell: "1,0" }))).toBe("built");
    expect(error(w.try({ type: "empireBuildPorta", playerId: "a", cell: "3,1" }))).toBe(
      "hidden_cell",
    );
    const before = w.cash("a");
    w.do({ type: "empireBuildPorta", playerId: "a", cell: "1,1" });
    expect(before - w.cash("a")).toBe(1_000n * D);
    expect(house(w).porta).toBeUndefined();
    w.advance(HOUR);
    expect(house(w).porta).toMatchObject({ cell: "1,1", level: 1, best: 0 });
    expect(error(w.try({ type: "empireBuildPorta", playerId: "a", cell: "0,1" }))).toBe("built");
  });

  it("rises a level at a time up to the last tier, its price doubled", () => {
    const w = withPorta();
    expect(portaUpgradeCost(house(w), s)).toBe(2_000n * D);
    w.do({ type: "empireUpgradePorta", playerId: "a" });
    expect(error(w.try({ type: "empireUpgradePorta", playerId: "a" }))).toBe("building_busy");
    w.advance(HOUR);
    expect(house(w).porta?.level).toBe(2);
    w.do({ type: "empireUpgradePorta", playerId: "a" });
    w.advance(2 * HOUR);
    // The fixture has three tiers.
    expect(portaUpgradeCost(house(w), s)).toBeNull();
  });
});

describe("the way to the Porta", () => {
  it("takes the vehicles from the Remise and holds them there, out of the deliveries", () => {
    const w = withPorta();
    w.do({ type: "empireBuyArm", playerId: "a", model: "rider" });
    const rider = house(w).arms?.vehicles[0]?.id ?? "";
    const cart = house(w).vehicles?.[0]?.id ?? "";
    expect(portaTravelMinutes(house(w), s)).toBe(10);
    w.do({ type: "empireSendToPorta", playerId: "a", vehicleIds: [rider, cart] });
    expect(house(w).vehicles?.[0]?.busyUntil).toBeGreaterThan(w.now + 365 * 24 * HOUR);
    expect(error(w.try({ type: "empireSendToPorta", playerId: "a", vehicleIds: [cart] }))).toBe(
      "vehicle_busy",
    );
    // Not there yet: neither called back nor fitted.
    expect(
      error(w.try({ type: "empireRecallFromPorta", playerId: "a", vehicleIds: [rider] })),
    ).toBe("vehicle_busy");
    w.advance(10 * MIN);
    w.do({ type: "empireRecallFromPorta", playerId: "a", vehicleIds: [rider, cart] });
    expect(house(w).vehicles?.[0]?.busyUntil).toBe(w.now + 10 * MIN);
    expect(house(w).arms?.vehicles[0]?.backAt).toBe(w.now + 10 * MIN);
  });
});

describe("a battle entered and settled", () => {
  it("asks an open tier, two docked vehicles and the victuals", () => {
    const { w, rider, cart } = docked();
    expect(error(enter(w, rider, cart, 2))).toBe("requirement_unmet");
    expect(error(enter(w, cart, rider))).toBe("unknown_vehicle");
    expect(error(enter(w, rider, cart))).toBe("");
    expect(w.stock("a", "bread").available).toBe(80);
    expect(error(enter(w, rider, cart, 1, "b2"))).toBe("vehicle_busy");
    // In a battle, nothing is called back.
    expect(error(w.try({ type: "empireRecallFromPorta", playerId: "a", vehicleIds: [cart] }))).toBe(
      "vehicle_busy",
    );
  });

  it("brings in the combat vehicle at its strength and the transport's hold", () => {
    const { w, rider, cart } = docked();
    enter(w, rider, cart);
    const entrant = portaEntrant(house(w), "a", s);
    expect(entrant.combat.stats.weapons).toHaveLength(1);
    expect(entrant.transport).toEqual({ vehicleId: cart, hold: 50 });
    const b = createBattle({ seed: 1, tier: 1, players: [entrant] }, s);
    expect(b.units.filter((u) => u.side === "player")).toHaveLength(2);
  });

  it("keeps what came out, destroys the fallen with its components, and opens the next tier", () => {
    const { w, rider, cart } = docked();
    enter(w, rider, cart);
    const outcome: BattleOutcome = {
      vehicles: [
        { vehicleId: rider, role: "combat", outcome: "dead" },
        { vehicleId: cart, role: "transport", outcome: "exited" },
      ],
      relics: ["rare", "common", "common"],
      won: true,
    };
    expect(
      error(w.try({ type: "empirePortaSettle", playerId: "a", battleId: "nope", outcome })),
    ).toBe("not_here");
    w.do({ type: "empirePortaSettle", playerId: "a", battleId: "b1", outcome });
    const h = house(w);
    expect(h.arms?.vehicles).toEqual([]);
    expect(h.arms?.components).toEqual([]);
    expect(h.vehicles?.[0]?.porta).toEqual({ arrivesAt: expect.any(Number) });
    expect(h.porta?.relics).toEqual({ rare: 1, common: 2 });
    expect(h.porta?.best).toBe(1);
    expect(h.porta?.battle).toBeUndefined();
    expect(tierOpen(h, 2)).toBe(false);
  });

  it("loses the transport left inside, and wins nothing without a relic", () => {
    const { w, rider, cart } = docked();
    enter(w, rider, cart);
    w.do({
      type: "empirePortaSettle",
      playerId: "a",
      battleId: "b1",
      outcome: {
        vehicles: [
          { vehicleId: rider, role: "combat", outcome: "exited" },
          { vehicleId: cart, role: "transport", outcome: "lost" },
        ],
        relics: [],
        won: false,
      },
    });
    expect(house(w).vehicles).toEqual([]);
    expect(house(w).arms?.vehicles).toHaveLength(1);
    expect(house(w).porta?.best).toBe(0);
  });

  it("is undone on a restart: the vehicles freed, the victuals given back", () => {
    const { w, rider, cart } = docked();
    enter(w, rider, cart);
    w.do({ type: "empirePortaCancel", playerId: "a", battleId: "b1" });
    expect(w.stock("a", "bread").available).toBe(100);
    expect(house(w).porta?.battle).toBeUndefined();
    expect(error(enter(w, rider, cart, 1, "b2"))).toBe("");
  });
});

describe("the antiquarian", () => {
  it("buys the relics by rarity, at the ledger, and counts their points to the week", () => {
    const { w, rider, cart } = docked();
    enter(w, rider, cart);
    w.do({
      type: "empirePortaSettle",
      playerId: "a",
      battleId: "b1",
      outcome: { vehicles: [], relics: ["rare", "common"], won: true },
    });
    const sell = (rarity: "common" | "rare", qty: number) =>
      w.try({ type: "empireSellRelics", playerId: "a", rarity, qty });
    expect(error(sell("rare", 2))).toBe("insufficient_stock");
    expect(error(sell("rare", 0))).toBe("invalid_quantity");
    const before = w.cash("a");
    sell("rare", 1);
    // 500 ducats, less the wages taken on every receipt.
    const got = w.cash("a") - before;
    expect(got).toBeGreaterThan(0n);
    expect(got).toBeLessThanOrEqual(500n * D);
    sell("common", 1);
    expect(weekPoints(house(w), w.now)).toBe(4);
    expect(house(w).porta?.relics).toEqual({ rare: 0, common: 0 });
    // A new week starts again from zero.
    w.advance(7 * 24 * HOUR);
    expect(weekPoints(house(w), w.now)).toBe(0);
  });
});
