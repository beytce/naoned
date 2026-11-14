import { describe, expect, it } from "vitest";
import { type PlancheSetup, plancheInit, plancheVue } from "../../src/index.js";

const T0 = Date.parse("2026-11-16T00:00:00Z");

function setup(): PlancheSetup {
  return {
    width: 6,
    height: 6,
    sliceMs: 3_600_000,
    goods: { sel: "Sel" },
    houses: [
      { id: "ana", name: "Ana", robot: false, x: 1, y: 1, makes: { sel: 10 } },
      { id: "ben", name: "Ben", robot: false, x: 4, y: 1, makes: { sel: 10 } },
    ],
    cities: [],
    passages: [
      {
        id: "pont",
        name: "Le pont",
        x: 3,
        y: 3,
        holder: "corsair:Ivo",
        tollBps: 1_000,
        board: "petit",
        seals: 2,
      },
    ],
    rules: {
      bobbins: 3,
      store: 500,
      startStock: 20,
      startDucats: 1_000,
      threadPerHour: 10,
      patinaBpsPerDay: 0,
      patinaMaxBps: 0,
      tollMaxBps: 1_500,
      tollBurnBps: 3_000,
      freeAfterForceMs: 3_600_000,
      rewindMsPerTile: 60_000,
    },
  };
}

// What a player sees (docs/plan-socle.md A1).
describe("the board a player sees", () => {
  it("keeps its own house whole, and hides the others' secrets", () => {
    const S = setup();
    const s = plancheInit(S, T0);
    const ben = s.houses.ben;
    if (!ben) throw new Error("no house");
    ben.ruses = { bouche: "brulot" };
    ben.rusesDay = 3;
    ben.relics = { turc: 2 };
    ben.plans = 1;
    ben.fleet = { ships: [{ id: 1, kind: "galere", level: 1 }], yards: [], next: 2 };
    s.passages.pont = { holder: "ben", tollBps: 1_000, seals: 2, guard: [4], guardDay: 3 };
    const v = plancheVue(s, "ana");
    expect(v.houses.ana).toEqual(s.houses.ana);
    const seen = v.houses.ben;
    expect(seen?.ruses).toBeUndefined();
    expect(seen?.relics).toBeUndefined();
    expect(seen?.plans).toBeUndefined();
    expect(seen?.maison).toBeUndefined();
    expect(seen?.stock).toEqual({});
    expect(seen?.ducats).toBe(0n);
    expect(seen?.book.sold).toBe(0n);
    // What shows on the board stays: its fleet at anchor, its island, its threads.
    expect(seen?.fleet?.ships).toHaveLength(1);
    expect(seen?.ile).toEqual(ben.ile);
    expect(v.passages.pont).toEqual({ holder: "ben", tollBps: 1_000, seals: 2 });
    // Its holder sees its own guard.
    expect(plancheVue(s, "ben").passages.pont?.guard).toEqual([4]);
    // The raw board is left as it was.
    expect(s.houses.ben?.ruses).toEqual({ bouche: "brulot" });
  });

  it("shows the Muda's worth and pay of one's own house only", () => {
    const S = setup();
    const s = plancheInit(S, T0);
    s.muda = {
      monday: T0,
      units: { ana: 10, ben: 20 },
      worth: { ana: 1_000n, ben: 2_000n },
      day: 0,
      today: {},
      robotDays: [],
      straits: {},
      paid: { ana: 1_500n, ben: 3_000n },
    };
    const v = plancheVue(s, "ana");
    expect(v.muda?.units).toEqual({ ana: 10, ben: 20 });
    expect(v.muda?.worth).toEqual({ ana: 1_000n });
    expect(v.muda?.paid).toEqual({ ana: 1_500n });
  });
});
