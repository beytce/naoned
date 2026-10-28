import { describe, expect, it } from "vitest";
import { type Command, hexDistance, hexNeighbors, inBattle, recruitPerHour } from "../src/index.js";
import { testTerraferma } from "./fixture.js";
import { HOUR, MIN, T0, World, makeContext } from "./helpers.js";

/**
 * The war eats the goods (R1 of the audit of 27 October 2026, docs/plan-rupture.md): troops eat
 * bread, buildings and the cap ask for goods, through the stock journal.
 */

const supply = {
  // A tenth of a loaf a troop a day: 30 troops eat 3 loaves a day.
  breadPerTroopDay: 1_000,
  raiseBread: 5,
  buildingMaterials: { rocca: { bricks: 4 } },
};

const live = (more = {}) =>
  new World(
    makeContext({
      terraferma: {
        ...testTerraferma,
        live: true,
        start: { ...testTerraferma.start, protectionHours: 0, minDistance: 2 },
        buildings: { rocca: { price: 4_000, defenseBps: 16_000, perCells: 1 } },
        supply,
        ...more,
      },
    }),
  );
const act = (w: World, cmd: Record<string, unknown>) => w.try(cmd as unknown as Command);
const error = (res: ReturnType<World["try"]>) => (res.ok ? "ok" : res.error);

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

function placed(w: World, id: string) {
  w.do({ type: "join", playerId: id, region: "terraferma" });
  w.do({ type: "tick" });
  w.do({ type: "terraPlace", playerId: id, cell: freeCell(w) } as Command);
  return w.state.terra?.map.players[id];
}

describe("the war eats the goods", () => {
  it("feeds the troops from the stock, through the journal", () => {
    const w = live();
    const p = placed(w, "a");
    expect(p?.troops ?? 0).toBeGreaterThan(0);
    w.give("a", "bread", 100);
    const owed = () => w.state.terra?.map.players.a?.breadOwed ?? 0;
    w.advance(24 * HOUR).do({ type: "tick" });
    const eaten = 100 - w.stock("a", "bread").available;
    // A tenth of a loaf a troop and a day: the troops eat, the fraction waits for the next meal.
    expect(eaten).toBeGreaterThanOrEqual(2);
    expect(eaten).toBeLessThan(100);
    expect(owed()).toBeLessThan(10_000);
    expect(w.state.terra?.map.players.a?.unfed).toBeUndefined();
  });

  it("stops recruiting while the bread is missing, and starts again once fed", () => {
    const w = live();
    placed(w, "a");
    w.advance(24 * HOUR).do({ type: "tick" });
    const map = w.state.terra?.map;
    if (!map) throw new Error("no map");
    expect(map.players.a?.unfed).toBe(true);
    const cfg = w.ctx.settings.terraferma;
    if (!cfg) throw new Error("no terraferma");
    expect(recruitPerHour(map, cfg, "a")).toBe(0);
    const before = map.players.a?.troops ?? 0;
    w.advance(6 * HOUR).do({ type: "tick" });
    expect(w.state.terra?.map.players.a?.troops).toBeLessThanOrEqual(before);
    w.give("a", "bread", 200);
    w.advance(HOUR).do({ type: "tick" });
    expect(w.state.terra?.map.players.a?.unfed).toBeUndefined();
  });

  it("asks bread for the cap and materials for a building, and refuses without them", () => {
    const w = live();
    placed(w, "a");
    expect(error(act(w, { type: "terraRaise", playerId: "a" }))).toBe("insufficient_stock");
    w.give("a", "bread", 5);
    expect(error(act(w, { type: "terraRaise", playerId: "a" }))).toBe("ok");
    expect(w.stock("a", "bread").available).toBe(0);
    const map = w.state.terra?.map;
    const cell = map?.owner.findIndex((o) => o === "a") ?? -1;
    const build = { type: "terraBuild", playerId: "a", cell, kind: "rocca" };
    expect(error(act(w, build))).toBe("insufficient_stock");
    w.give("a", "bricks", 4);
    expect(error(act(w, build))).toBe("ok");
    expect(w.stock("a", "bricks").available).toBe(0);
  });

  it("asks nothing more without its settings", () => {
    const w = live({ supply: undefined });
    placed(w, "a");
    w.advance(24 * HOUR).do({ type: "tick" });
    expect(w.state.terra?.map.players.a?.unfed).toBeUndefined();
    expect(error(act(w, { type: "terraRaise", playerId: "a" }))).toBe("ok");
  });
});

describe("the battle of the Sera", () => {
  it("may end at a minute: 20 h to 20 h 30 (R11)", () => {
    const cfg = makeContext({
      terraferma: {
        ...testTerraferma,
        battle: { from: 20, to: 20, toMinute: 30, stepMinutes: 3, warnMinutes: 15 },
      },
    }).settings.terraferma;
    if (!cfg) throw new Error("no terraferma");
    // T0 is midnight UTC in January: 20 h in Paris is 19 h UTC.
    const at = (h: number, m: number) => T0 + h * HOUR + m * MIN;
    expect(inBattle(cfg, at(18, 59))).toBe(false);
    expect(inBattle(cfg, at(19, 0))).toBe(true);
    expect(inBattle(cfg, at(19, 29))).toBe(true);
    expect(inBattle(cfg, at(19, 30))).toBe(false);
  });
});
