import {
  VENICE_SQUARE_TILES,
  VENICE_SQUARE_TOWNS,
  VENICE_TILE_SIZE,
  cellAtPoint,
  parseEmpireSettings,
  tileAt,
  tileFault,
  tilesTouch,
  venice1450Empire,
  venice1450EmpireSquare,
} from "@comptoirs/engine";
import { describe, expect, it } from "vitest";

// The square map of Venice (docs/plan-porcellana.md M2), as scripts/squaremap.ts wrote it.
describe("the square map of Venice", () => {
  it("puts every town kept on a land tile of its own region, at the tile's middle", () => {
    for (const t of VENICE_SQUARE_TOWNS) {
      expect(VENICE_SQUARE_TILES[t.tile]?.region).toBe(t.region);
      expect(tileAt(t.x, t.y, VENICE_TILE_SIZE)).toBe(t.tile);
    }
    expect(VENICE_SQUARE_TOWNS).toHaveLength(31);
  });

  it("never puts two towns on tiles side by side", () => {
    for (const a of VENICE_SQUARE_TOWNS)
      for (const b of VENICE_SQUARE_TOWNS)
        if (a !== b) expect(tilesTouch(a.tile, b.tile) || a.tile === b.tile).toBe(false);
  });

  it("sets Venice on a coast, its lagoon water", () => {
    const v = VENICE_SQUARE_TOWNS.find((t) => t.code === "venezia");
    expect(v && VENICE_SQUARE_TILES[v.tile]?.coast).toBe(true);
  });
});

describe("Venice's empire on square tiles (the theme's variant)", () => {
  const s = parseEmpireSettings(venice1450EmpireSquare);

  it("reads as settings: the square grid, a new drawing, the towns of now", () => {
    expect(s.map.grid).toBe("square");
    expect(s.map.cities).toHaveLength(31);
    const hex = parseEmpireSettings(venice1450Empire);
    for (const c of hex.map.cities) {
      const t = s.map.cities.find((x) => x.code === c.code);
      expect([t?.weight, t?.size]).toEqual([c.weight, c.size]);
    }
  });

  it("sets the first fondaco on a free tile of Venetia, clear of the towns", () => {
    const home = s.map.home as { x: number; y: number };
    const tile = cellAtPoint(home.x, home.y, s);
    expect(s.map.cells[tile]?.region).toBe("veneto");
    const towns = s.map.cities.map((c): [number, number] => [c.x ?? 0, c.y ?? 0]);
    expect(tileFault(s, tile, [home.x, home.y], towns, [])).toBeNull();
  });
});
