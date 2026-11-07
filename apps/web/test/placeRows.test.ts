import { describe, expect, it } from "vitest";
import { placeRows } from "../src/empire/NewWorkshop.js";
import type { EmpirePayload } from "../src/empire/types.js";

// A free tile proposes every building of the game (the first steps, lot 5): the Remise, the Campo,
// the Porta and a fondaco, each to build, built, rising, or locked with what opens it.
function payload(over: {
  casa?: number;
  depot?: string | null;
  region?: string;
  builds?: unknown[];
}) {
  return {
    cash: "100000",
    view: {
      house: { casa: over.casa ?? 1, workshops: [], builds: over.builds ?? [] },
      regions: [
        { code: "veneto", casa: 1, postCost: null },
        { code: "lombardia", casa: 6, postCost: "120000" },
      ],
      porta: { cell: null, site: { cost: "400000", minutes: 360, casa: 10 } },
      map: {
        tileSize: 15,
        cells: { "1,1": { region: over.region ?? "veneto" } },
        depot: over.depot ?? null,
        depotSite: over.depot ? null : { cost: "20000", minutes: 120, casa: 2 },
        camp: null,
        campSite: { cost: "60000", minutes: 240, casa: 4 },
      },
    },
  } as unknown as EmpirePayload;
}
const states = (p: EmpirePayload) =>
  Object.fromEntries(placeRows(p, "1,1").map((r) => [r.id, r.state]));

describe("a free tile's buildings", () => {
  it("shows every one, the locked ones with the Fondaco's level that opens them", () => {
    const s = states(payload({ casa: 1 }));
    expect(Object.keys(s)).toEqual(["depot", "camp", "porta", "post"]);
    expect(s.depot).toEqual({ kind: "locked", why: "Fondaco niv. 2" });
    expect(s.camp).toEqual({ kind: "locked", why: "Fondaco niv. 4" });
    expect(s.porta).toEqual({ kind: "locked", why: "Fondaco niv. 10" });
    // A fondaco only on a tile of another region.
    expect(s.post).toMatchObject({ kind: "locked", why: "Hors de Vénétie" });
  });

  it("offers what the Fondaco's level opens, on this very tile", () => {
    const s = states(payload({ casa: 4 }));
    expect(s.depot).toMatchObject({
      kind: "build",
      cost: "20000",
      action: { type: "empireBuildDepot", cell: "1,1" },
    });
    expect(s.camp).toMatchObject({ kind: "build", action: { type: "empireBuildCamp" } });
  });

  it("says what is built or rising, and a fondaco beyond Venetia", () => {
    expect(states(payload({ casa: 4, depot: "0,0" })).depot).toEqual({ kind: "built" });
    expect(states(payload({ casa: 4, builds: [{ kind: "camp" }] })).camp).toEqual({
      kind: "rising",
    });
    expect(states(payload({ casa: 6, region: "lombardia" })).post).toMatchObject({
      kind: "build",
      action: { type: "empirePlaceCounter", cell: "1,1", x: 23, y: 23 },
    });
  });
});
