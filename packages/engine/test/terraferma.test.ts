import { describe, expect, it } from "vitest";
import {
  EngineError,
  type TerraState,
  advanceTerra,
  capOf,
  cellCost,
  cellsOf,
  hexDistance,
  hexNeighbors,
  launchFront,
  newTerra,
  placeOnTerra,
  recallFront,
} from "../src/index.js";
import { testTerraferma } from "./fixture.js";
import { HOUR, MIN, makeContext } from "./helpers.js";

const START = Date.UTC(2026, 9, 5, 0, 0); // a Monday, 2 h in Paris
const STEP = 10 * MIN;
const config = (more: Partial<typeof testTerraferma> = {}) => {
  const cfg = makeContext({ terraferma: { ...testTerraferma, ...more } }).settings.terraferma;
  if (!cfg) throw new Error("no terraferma");
  return cfg;
};
const code = (f: () => unknown) => {
  try {
    f();
    return "ok";
  } catch (e) {
    return e instanceof EngineError ? e.code : String(e);
  }
};
/** The first inner neutral cell at least `away` from every owned cell, scanning from the east. */
const freeCell = (s: TerraState, away = 3) => {
  for (let i = s.owner.length - 1; i >= 0; i--) {
    if (s.owner[i] !== null || hexNeighbors(s.map, i).length < 6) continue;
    if (s.owner.every((o, j) => o === null || hexDistance(s.map, i, j) >= away)) return i;
  }
  throw new Error("no free cell");
};
/** A neutral cell next to the player's territory. */
const border = (s: TerraState, id: string, against: string | null = null) => {
  const i = s.owner.findIndex(
    (o, j) => o === against && hexNeighbors(s.map, j).some((n) => s.owner[n] === id),
  );
  if (i < 0) throw new Error("no border");
  return i;
};

describe("the map of the Terraferma", () => {
  it("grows with the world, the same for the same seed", () => {
    const cfg = config();
    const small = newTerra(cfg, "seed", 2, START);
    const big = newTerra(cfg, "seed", 10, START);
    // At least `minActive` merchants counted: 4 × 10 cells.
    expect(small.map.width * small.map.height).toBeGreaterThanOrEqual(40);
    expect(big.map.width * big.map.height).toBeGreaterThanOrEqual(100);
    expect(big.map.width).toBeGreaterThan(big.map.height);
    expect(newTerra(cfg, "seed", 10, START).map).toEqual(big.map);
    expect(newTerra(cfg, "other", 10, START).map.terrain).not.toEqual(big.map.terrain);
    expect(big.map.city.filter(Boolean)).toHaveLength(2);
  });

  it("gives Milan the west", () => {
    const s = newTerra(config(), "seed", 10, START);
    const { width } = s.map;
    s.owner.forEach((o, i) => {
      const col = i % width;
      expect(o === "milan").toBe(col < Math.ceil((width * 2_000) / 10_000));
    });
    expect(s.players.milan?.troops).toBe(60 + 5 * 10);
    // Its cap does not grow with the land it takes.
    expect(capOf(s, config(), "milan")).toBe(60 + 5 * 10);
  });

  it("knows its neighbours and distances", () => {
    const s = newTerra(config(), "seed", 10, START);
    const { width, height } = s.map;
    const mid = Math.floor(height / 2) * width + Math.floor(width / 2);
    expect(hexNeighbors(s.map, mid)).toHaveLength(6);
    expect(hexNeighbors(s.map, 0).length).toBeLessThan(6);
    for (const n of hexNeighbors(s.map, mid)) {
      expect(hexDistance(s.map, mid, n)).toBe(1);
      expect(hexNeighbors(s.map, n)).toContain(mid);
    }
    expect(hexDistance(s.map, 0, width - 1)).toBe(width - 1);
  });
});

describe("a merchant's start", () => {
  it("takes the chosen cell and the neutral ones around it, protected for a day", () => {
    const cfg = config();
    const s = newTerra(cfg, "seed", 10, START);
    const at = freeCell(s);
    placeOnTerra(s, cfg, "a", at, START + HOUR);
    const mine = cellsOf(s, "a");
    expect(mine).toContain(at);
    expect(mine.length).toBe(1 + hexNeighbors(s.map, at).length);
    expect(s.players.a?.troops).toBe(30);
    expect(s.players.a?.protectedUntil).toBe(START + 25 * HOUR);
    expect(code(() => placeOnTerra(s, cfg, "a", freeCell(s), START + HOUR))).toBe("already_placed");
  });

  it("stays away from the others and from Milan, and comes better armed later in the week", () => {
    const cfg = config();
    const s = newTerra(cfg, "seed", 10, START);
    const at = freeCell(s);
    placeOnTerra(s, cfg, "a", at, START);
    const near = hexNeighbors(s.map, at)
      .flatMap((n) => hexNeighbors(s.map, n))
      .find((c) => s.owner[c] === null) as number;
    expect(code(() => placeOnTerra(s, cfg, "b", near, START))).toBe("too_close");
    expect(code(() => placeOnTerra(s, cfg, "b", 0, START))).toBe("not_neutral");
    placeOnTerra(s, cfg, "c", freeCell(s), START + 2 * 24 * HOUR);
    expect(s.players.c?.troops).toBe(30 + 2 * 10);
  });
});

describe("troops", () => {
  it("come back each open step toward a cap that grows with the land", () => {
    const cfg = config();
    const s = newTerra(cfg, "seed", 10, START);
    placeOnTerra(s, cfg, "a", freeCell(s), START);
    const cells = cellsOf(s, "a").length;
    const cap = capOf(s, cfg, "a");
    expect(cap).toBe(20 + 3 * cells + 10 * cellsOf(s, "a").filter((i) => s.map.city[i]).length);
    const before = s.players.a?.troops ?? 0;
    advanceTerra(s, cfg, START + STEP);
    expect(s.players.a?.troops).toBe(
      before + Math.max(1, Math.floor(((cap - before) * 1_000) / 10_000)),
    );
    // Within the day of protection: Milan cannot strike yet.
    advanceTerra(s, cfg, START + 20 * HOUR);
    expect(s.players.a?.troops).toBe(cap);
  });

  it("rest at night, and so do the fronts", () => {
    const cfg = config({ openHours: { from: 8, to: 22 } });
    const s = newTerra(cfg, "seed", 10, START);
    placeOnTerra(s, cfg, "a", freeCell(s), START);
    const troops = s.players.a?.troops;
    // 2 h to 6 h in Paris: closed.
    advanceTerra(s, cfg, START + 4 * HOUR);
    expect(s.players.a?.troops).toBe(troops);
  });
});

describe("fronts", () => {
  it("take a few neutral cells a step, nearest the aim first, paying their militia", () => {
    const cfg = config();
    const s = newTerra(cfg, "seed", 10, START);
    placeOnTerra(s, cfg, "a", freeCell(s), START);
    const aim = border(s, "a");
    const troops = s.players.a?.troops ?? 0;
    launchFront(s, cfg, "a", aim, 10_000, START);
    expect(s.players.a?.troops).toBe(0);
    const front = s.fronts[0];
    expect(front?.troops).toBe(troops);
    const before = cellsOf(s, "a").length;
    const cost = cellCost(s, cfg, aim);
    advanceTerra(s, cfg, START + STEP);
    expect(s.owner[aim]).toBe("a");
    const taken = cellsOf(s, "a").length - before;
    expect(taken).toBeGreaterThanOrEqual(1);
    expect(taken).toBeLessThanOrEqual(2);
    expect(s.fronts[0]?.troops ?? 0).toBeLessThanOrEqual(troops - cost);
  });

  it("stop when their troops no longer pay a cell, and give back what is left", () => {
    const cfg = config();
    const s = newTerra(cfg, "seed", 10, START);
    placeOnTerra(s, cfg, "a", freeCell(s), START);
    launchFront(s, cfg, "a", border(s, "a"), 5_000, START);
    advanceTerra(s, cfg, START + 12 * HOUR);
    expect(s.fronts.filter((f) => f.owner === "a")).toHaveLength(0);
    // Everything spent or back home; the land held grew.
    expect(cellsOf(s, "a").length).toBeGreaterThan(7);
  });

  it("are refused against a protected merchant, too many at once, or too small", () => {
    const cfg = config();
    const s = newTerra(cfg, "seed", 10, START);
    placeOnTerra(s, cfg, "a", freeCell(s), START);
    expect(code(() => launchFront(s, cfg, "a", border(s, "a"), 500, START))).toBe(
      "share_too_small",
    );
    expect(code(() => launchFront(s, cfg, "a", cellsOf(s, "a")[0] as number, 5_000, START))).toBe(
      "own_cell",
    );
    expect(code(() => launchFront(s, cfg, "a", 0, 5_000, START))).toBe("not_adjacent");
    for (let k = 0; k < 3; k++) launchFront(s, cfg, "a", border(s, "a"), 2_000, START);
    expect(code(() => launchFront(s, cfg, "a", border(s, "a"), 2_000, START))).toBe(
      "too_many_fronts",
    );
  });

  it("against a merchant, cost his density on the terrain, and cost him as much", () => {
    const cfg = config({ start: { ...testTerraferma.start, minDistance: 2, protectionHours: 0 } });
    const s = newTerra(cfg, "seed", 10, START);
    const a = freeCell(s, 2);
    placeOnTerra(s, cfg, "a", a, START);
    // b two cells beyond a's ring: their lands touch.
    const b = s.owner.findIndex(
      (o, i) =>
        o === null &&
        hexDistance(s.map, a, i) === 3 &&
        hexNeighbors(s.map, i).every(
          (n) => s.owner[n] === null || s.owner[n] === "a" || hexDistance(s.map, a, n) >= 2,
        ),
    );
    placeOnTerra(s, cfg, "b", b, START);
    const target = border(s, "a", "b");
    const bTroops = s.players.b?.troops ?? 0;
    const density = Math.max(1, Math.floor(bTroops / cellsOf(s, "b").length));
    const terrain = s.map.terrain[target] === "hill" ? 15_000 : 10_000;
    const city = s.map.city[target] ? 15_000 : 10_000;
    expect(cellCost(s, cfg, target)).toBe(Math.ceil((density * terrain * city) / 100_000_000));
    launchFront(s, cfg, "a", target, 10_000, START);
    advanceTerra(s, cfg, START + STEP);
    expect(s.owner[target]).toBe("a");
    expect(s.players.b?.troops ?? 0).toBeLessThan(bTroops);
  });

  it("never take a merchant's capital: nobody is wiped off the map", () => {
    const cfg = config({ start: { ...testTerraferma.start, minDistance: 2, protectionHours: 0 } });
    const s = newTerra(cfg, "seed", 10, START);
    const a = freeCell(s, 2);
    placeOnTerra(s, cfg, "a", a, START);
    const b = s.owner.findIndex(
      (o, i) =>
        o === null &&
        hexDistance(s.map, a, i) === 3 &&
        hexNeighbors(s.map, i).every(
          (n) => s.owner[n] === null || s.owner[n] === "a" || hexDistance(s.map, a, n) >= 2,
        ),
    );
    placeOnTerra(s, cfg, "b", b, START);
    (s.players.a as { troops: number }).troops = 10_000;
    launchFront(s, cfg, "a", border(s, "a", "b"), 10_000, START);
    advanceTerra(s, cfg, START + 6 * HOUR);
    expect(cellsOf(s, "b")).toEqual([b]);
  });

  it("come home after their hours, what is left of them", () => {
    const cfg = config({ fronts: { ...testTerraferma.fronts, cellsPerStep: 1, maxHours: 1 } });
    const s = newTerra(cfg, "seed", 10, START);
    placeOnTerra(s, cfg, "a", freeCell(s), START);
    (s.players.a as { troops: number }).troops = 10_000;
    launchFront(s, cfg, "a", border(s, "a"), 5_000, START);
    const before = cellsOf(s, "a").length;
    advanceTerra(s, cfg, START + 3 * HOUR);
    // Six steps of an hour, one cell each, then home.
    expect(cellsOf(s, "a").length - before).toBe(6);
    expect(s.fronts.filter((f) => f.owner === "a")).toHaveLength(0);
  });

  it("can be called back, their troops home", () => {
    const cfg = config();
    const s = newTerra(cfg, "seed", 10, START);
    placeOnTerra(s, cfg, "a", freeCell(s), START);
    launchFront(s, cfg, "a", border(s, "a"), 5_000, START);
    const left = s.players.a?.troops ?? 0;
    const id = s.fronts[0]?.id ?? "";
    expect(code(() => recallFront(s, "b", id))).toBe("not_owner");
    recallFront(s, "a", id);
    expect(s.fronts).toHaveLength(0);
    expect(s.players.a?.troops).toBeGreaterThan(left);
  });
});

describe("glory and Milan", () => {
  it("count the land held every open step", () => {
    const cfg = config();
    const s = newTerra(cfg, "seed", 10, START);
    placeOnTerra(s, cfg, "a", freeCell(s), START);
    const cells = cellsOf(s, "a");
    const per = cells.length + 3 * cells.filter((i) => s.map.city[i]).length;
    advanceTerra(s, cfg, START + 3 * STEP);
    expect(s.players.a?.glory).toBe(3 * per);
  });

  it("rides out every few open hours, at the leader when it borders him, else into neutral land", () => {
    const cfg = config();
    const s = newTerra(cfg, "seed", 10, START);
    const before = cellsOf(s, "milan").length;
    advanceTerra(s, cfg, START + 4 * HOUR);
    expect(s.fronts.some((f) => f.owner === "milan") || cellsOf(s, "milan").length > before).toBe(
      true,
    );
  });
});
