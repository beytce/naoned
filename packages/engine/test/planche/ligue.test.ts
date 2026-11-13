import { describe, expect, it } from "vitest";
import {
  type PlancheSetup,
  plancheAdvance,
  plancheClaim,
  plancheHouseArrive,
  plancheHouseLeave,
  plancheInit,
  plancheInvariant,
  plancheThread,
} from "../../src/index.js";

const HOUR = 3_600_000;
const T0 = Date.parse("2026-11-16T00:00:00Z");

function setup(): PlancheSetup {
  return {
    width: 6,
    height: 6,
    sliceMs: HOUR,
    goods: { sel: "Sel" },
    houses: [
      { id: "a", name: "A", robot: false, x: 1, y: 1, makes: { sel: 10 } },
      { id: "b", name: "B", robot: true, x: 4, y: 1, makes: { sel: 10 } },
    ],
    cities: [
      {
        id: "padoue",
        name: "Padoue",
        x: 2,
        y: 4,
        via: [],
        wants: { sel: { price: 100, floorBps: 5_000, cap: 1_000, regenPerHour: 50 } },
      },
    ],
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
      freeAfterForceMs: HOUR,
      rewindMsPerTile: 60_000,
    },
  };
}

// The leagues' moves (docs/plan-maree.md T5).
describe("a house moving to another lagoon", () => {
  it("leaves whole, a new house of the computer in its place, every denier accounted for", () => {
    const S = setup();
    let s = plancheThread(S, plancheInit(S, T0), "a", "padoue", "sel", T0);
    s.passages.pont = { holder: "a", tollBps: 1_000, seals: 2 };
    s = plancheAdvance(S, s, T0 + 10 * HOUR);
    const was = s.houses.a;
    if (!was) throw new Error("no house");
    expect(was.ducats).toBeGreaterThan(1_000n);
    const { state, gone } = plancheHouseLeave(S, s, "a", s.now);
    expect(gone.ducats).toBe(was.ducats);
    expect(gone.threads).toHaveLength(1);
    expect(state.houses.a?.ducats).toBe(1_000n);
    expect(state.houses.a?.threads).toEqual([]);
    expect(state.houses.a?.book).toMatchObject({
      sold: was.book.sold,
      out: was.ducats,
      in: 1_000n,
    });
    expect(state.rank.humans).not.toContain("a");
    expect(state.passages.pont?.holder).toBe("corsair:Ivo");
    expect(plancheInvariant(state)).toBe(true);
  });

  it("comes in the place of a house of the computer, its threads wound in", () => {
    const S = setup();
    let from = plancheThread(S, plancheInit(S, T0), "a", "padoue", "sel", T0);
    from = plancheAdvance(S, from, T0 + 10 * HOUR);
    const { gone } = plancheHouseLeave(S, from, "a", from.now);
    let to = plancheAdvance(S, plancheInit(S, T0), T0 + 10 * HOUR);
    expect(() => plancheHouseArrive(S, to, "a", gone)).toThrow("planche_taken");
    to = plancheHouseArrive(S, to, "b", gone);
    to = plancheClaim(S, to, "b");
    const h = to.houses.b;
    expect(h?.ducats).toBe(gone.ducats);
    expect(h?.stock).toEqual(gone.stock);
    expect(h?.threads).toEqual([]);
    expect(h?.book.in).toBe(gone.ducats);
    expect(h?.book.out).toBe(1_000n);
    expect(to.rank.humans).toContain("b");
    expect(plancheInvariant(to)).toBe(true);
    // And it goes on: its island makes, its purse grows.
    to = plancheThread(S, to, "b", "padoue", "sel", to.now);
    to = plancheAdvance(S, to, to.now + 5 * HOUR);
    expect(plancheInvariant(to)).toBe(true);
  });
});
