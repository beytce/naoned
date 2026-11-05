import {
  VENICE_SQUARE_TILES,
  VENICE_SQUARE_TOWNS,
  VENICE_TILE_SIZE,
  tileAt,
  tilesTouch,
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
