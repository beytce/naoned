import { describe, expect, it } from "vitest";
import { type Command, Rng, accumulate, checkInvariants, emptyTotals } from "../src/index.js";
import { MIN, World } from "./helpers.js";

const RESOURCES = ["wheat", "flour", "bread", "clay", "bricks", "wood", "planks"];
const TYPES = ["farm", "clay_pit", "lumber_camp", "mill", "bakery", "brickworks", "sawmill"];

function randomCommand(rng: Rng, w: World, players: string[]): Command {
  const playerId = rng.pick(players);
  const own = w.buildingsOf(playerId);
  const building = own.length > 0 ? rng.pick(own) : undefined;
  const roll = rng.int(0, 11);
  const resource = rng.pick(RESOURCES);
  switch (roll) {
    case 0:
      return { type: "tick" };
    case 1:
    case 2:
      return {
        type: "startProduction",
        playerId,
        buildingId: building?.id ?? "none",
        recipe: rng.pick([
          "grow_wheat",
          "dig_clay",
          "cut_wood",
          "mill_flour",
          "bake_bread",
          "fire_bricks",
          "saw_planks",
        ]),
        batches: rng.int(1, 4),
      };
    case 3:
      return { type: "collect", playerId, buildingId: building?.id ?? "none" };
    case 4:
      return rng.chance(0.5)
        ? { type: "build", playerId, buildingType: rng.pick(TYPES) }
        : { type: "upgrade", playerId, buildingId: building?.id ?? "none" };
    case 5:
    case 6:
    case 7:
      return {
        type: "placeOrder",
        playerId,
        resource,
        side: rng.chance(0.5) ? "buy" : "sell",
        kind: rng.chance(0.3) ? "instant" : "limit",
        price: BigInt(rng.int(50, 300)),
        quantity: rng.int(1, 60),
        expiresInHours: rng.int(1, 72),
      };
    case 8: {
      const mine = Object.values(w.state.orders).filter((o) => o.playerId === playerId);
      return {
        type: "cancelOrder",
        playerId,
        orderId: mine.length > 0 ? rng.pick(mine).id : "none",
      };
    }
    case 9:
      return {
        type: "sellToCity",
        playerId,
        city: rng.pick(["venezia", "padova", "verona"]),
        resource,
        quantity: rng.int(1, 40),
      };
    case 10: {
      const projects = Object.keys(w.state.projects);
      return {
        type: "deliverToProject",
        playerId,
        projectId: projects.length > 0 ? rng.pick(projects) : "none",
        resource,
        quantity: rng.int(1, 30),
      };
    }
    default:
      return { type: "tick" };
  }
}

describe("invariants", () => {
  it("hold after each of 10 000 random operations", () => {
    const rng = new Rng(42);
    const w = new World();
    const players = ["p1", "p2", "p3", "p4", "p5", "p6"];
    players.forEach((p, i) =>
      w.do({
        type: "join",
        playerId: p,
        region: ["terraferma", "lagoon", "dolomites"][i % 3] ?? "",
      }),
    );
    for (const p of players) for (const r of RESOURCES) w.give(p, r, 200);

    let accepted = 0;
    for (let i = 0; i < 10_000; i++) {
      w.advance(rng.int(0, 20) * MIN);
      const res = w.try(randomCommand(rng, w, players)); // checks the 6 invariants
      if (res.ok) accepted++;
    }
    expect(accepted).toBeGreaterThan(3_000);
    expect(w.trades.length).toBeGreaterThan(100);
  });

  it("detect a balance changed without a ledger entry", () => {
    const w = new World();
    w.do({ type: "join", playerId: "a", region: "lagoon" });
    const tampered = { ...w.state, accounts: { ...w.state.accounts, "cash:a": 999_999n } };
    const found = checkInvariants(tampered, w.totals).map((v) => v.invariant);
    expect(found).toContain(2);
    expect(found).toContain(3);
  });

  it("detect stock changed without a movement", () => {
    const w = new World();
    w.do({ type: "join", playerId: "a", region: "lagoon" });
    const totals = emptyTotals();
    accumulate(totals, { ledger: [], stock: [], trades: [], events: [] });
    const tampered = { ...w.state, inventories: { a: { clay: { available: 5, escrow: 0 } } } };
    expect(checkInvariants(tampered, w.totals).map((v) => v.invariant)).toContain(4);
  });
});
