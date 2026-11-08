import { describe, expect, it } from "vitest";
import {
  EngineError,
  type TerraState,
  type WorldSettingsInput,
  advanceTerra,
  buyTroops,
  capOf,
  cellCenter,
  cellsOf,
  launchFront,
  newTerra,
  placeOnTerra,
  terraDistance,
  terraNeighbors,
} from "../src/index.js";
import { testTerraferma } from "./fixture.js";
import { HOUR, MIN, makeContext } from "./helpers.js";

const START = Date.UTC(2026, 9, 5, 0, 0); // a Monday
const config = (more: Partial<NonNullable<WorldSettingsInput["terraferma"]>> = {}) => {
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
const freeCell = (s: TerraState, away = 3) => {
  for (let i = s.owner.length - 1; i >= 0; i--) {
    if (s.owner[i] !== null || terraNeighbors(s.map, i).length < 4) continue;
    if (s.owner.every((o, j) => o === null || terraDistance(s.map, i, j) >= away)) return i;
  }
  throw new Error("no free cell");
};

describe("the square grid of the Terraferma (Porcellana, lot 9)", () => {
  it("keeps the hexagons unless the settings ask for squares", () => {
    const s = newTerra(config(), "seed", 6, START);
    expect(s.map.grid ?? "hex").toBe("hex");
    const inner = s.owner.findIndex((_, i) => terraNeighbors(s.map, i).length === 6);
    expect(inner).toBeGreaterThanOrEqual(0);
  });

  it("gives a cell four neighbours, side by side, and counts steps as on a chessboard rook", () => {
    const s = newTerra(config({ grid: "square" }), "seed", 6, START);
    const { width, height } = s.map;
    expect(s.map.grid).toBe("square");
    const c = 2 * width + 3;
    expect(terraNeighbors(s.map, c)).toEqual([c - width, c - 1, c + 1, c + width]);
    expect(terraNeighbors(s.map, 0)).toEqual([1, width]);
    expect(terraNeighbors(s.map, width * height - 1)).toEqual([
      width * height - 1 - width,
      width * height - 2,
    ]);
    expect(terraDistance(s.map, 0, 2 * width + 3)).toBe(5);
    expect(terraDistance(s.map, c, c)).toBe(0);
  });

  it("lays the squares edge to edge, the same for the same seed, about as many as asked", () => {
    const cfg = config({ grid: "square" });
    const s = newTerra(cfg, "seed", 10, START);
    expect(s.map.width * s.map.height).toBeGreaterThanOrEqual(100);
    expect(newTerra(cfg, "seed", 10, START).map).toEqual(s.map);
    const [x0, y0] = cellCenter(s.map, 0);
    const [x1, y1] = cellCenter(s.map, 1);
    const [x2, y2] = cellCenter(s.map, s.map.width);
    expect(x1 - x0).toBeCloseTo(s.map.size);
    expect(y1).toBe(y0);
    expect(y2 - y0).toBeCloseTo(s.map.size);
    expect(x2).toBe(x0);
    expect(s.map.city.filter(Boolean)).toHaveLength(2);
  });

  it("places a camp with its four neighbours and runs a front side by side", () => {
    const cfg = config({ grid: "square" });
    const s = newTerra(cfg, "seed", 6, START);
    const at = START + HOUR;
    const camp = freeCell(s);
    placeOnTerra(s, cfg, "a", camp, at);
    expect(new Set(cellsOf(s, "a"))).toEqual(new Set([camp, ...terraNeighbors(s.map, camp)]));
    const aim = s.owner.findIndex(
      (o, i) =>
        o === null && s.map.land[i] && terraNeighbors(s.map, i).some((n) => s.owner[n] === "a"),
    );
    (s.players.a as { troops: number }).troops = 200;
    launchFront(s, cfg, "a", aim, 5_000, at);
    advanceTerra(s, cfg, at + 60 * MIN);
    for (const i of cellsOf(s, "a")) {
      // every cell of the merchant touches another by a side: no corner-only links
      if (cellsOf(s, "a").length > 1)
        expect(terraNeighbors(s.map, i).some((n) => s.owner[n] === "a")).toBe(true);
    }
    expect(cellsOf(s, "a").length).toBeGreaterThan(5);
  });
});

describe("troops bought with ducats (decision of the owner, 7 November 2026)", () => {
  const buy = { amount: 10, price: 15_000, perDay: 2 };

  it("is closed unless the settings open it", () => {
    const cfg = config();
    const s = newTerra(cfg, "seed", 6, START);
    placeOnTerra(s, cfg, "a", freeCell(s), START + HOUR);
    expect(code(() => buyTroops(s, cfg, "a", START + HOUR))).toBe("no_troop_buy");
  });

  it("adds troops up to the cap, a few times a day, and returns the price", () => {
    const cfg = config({ troopBuy: buy });
    const s = newTerra(cfg, "seed", 6, START);
    const at = START + HOUR;
    placeOnTerra(s, cfg, "a", freeCell(s), at);
    const p = s.players.a as { troops: number };
    p.troops = 10;
    expect(buyTroops(s, cfg, "a", at)).toBe(15_000n);
    expect(p.troops).toBe(20);
    expect(buyTroops(s, cfg, "a", at)).toBe(15_000n);
    expect(p.troops).toBe(30);
    expect(code(() => buyTroops(s, cfg, "a", at))).toBe("buy_limit");
    // the next day, the counter starts again
    expect(code(() => buyTroops(s, cfg, "a", at + 24 * HOUR))).toBe("ok");
  });

  it("never goes past the cap: nothing piles up without end (golden rule 3)", () => {
    const cfg = config({ troopBuy: buy });
    const s = newTerra(cfg, "seed", 6, START);
    const at = START + HOUR;
    placeOnTerra(s, cfg, "a", freeCell(s), at);
    const p = s.players.a as { troops: number };
    const cap = capOf(s, cfg, "a");
    p.troops = cap - 5;
    buyTroops(s, cfg, "a", at);
    expect(p.troops).toBe(cap);
    expect(code(() => buyTroops(s, cfg, "a", at))).toBe("troops_full");
  });
});
