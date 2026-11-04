import { describe, expect, it } from "vitest";
import { STEP, domainOf, rings } from "../src/empire/map3d/domain.js";
import type { EmpirePayload } from "../src/empire/types.js";

const d = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

describe("a fondaco's domain", () => {
  it("lays nineteen tiles round the fondaco, a step apart, never two on one point", () => {
    const flower = rings([100, 50], 2);
    expect(flower).toHaveLength(19);
    expect(flower.filter((t) => t.ring === 1)).toHaveLength(6);
    expect(flower.filter((t) => t.ring === 2)).toHaveLength(12);
    for (const t of flower.filter((x) => x.ring === 1))
      expect(d(t, { x: 100, y: 50 })).toBeCloseTo(STEP, 6);
    for (let i = 0; i < flower.length; i++)
      for (let j = i + 1; j < flower.length; j++)
        expect(d(flower[i] as never, flower[j] as never)).toBeGreaterThan(STEP - 1e-6);
  });

  it("puts the workshops on the first ring, then a site, then the place to build", () => {
    const p = {
      view: {
        house: {
          workshops: [
            { id: "w1", type: "farm" },
            { id: "w2", type: "mill" },
          ],
          builds: [{ kind: "newWorkshop", workshopType: "bakery", endsAt: 9 }],
        },
        workshopSlots: 5,
        regions: [],
      },
    } as unknown as EmpirePayload;
    const tiles = domainOf(p, "veneto", [0, 0]);
    expect(tiles.filter((t) => t.ring <= 2)).toHaveLength(19);
    expect(tiles[0]?.kind).toBe("fondaco");
    const kinds = tiles.slice(1, 5).map((t) => t.kind);
    expect(kinds).toEqual(["workshop", "workshop", "site", "free"]);
    for (const t of tiles.slice(1, 5)) expect(t.ring).toBe(1);
    expect(tiles.filter((t) => t.kind === "shore")).toHaveLength(18);
  });
});
