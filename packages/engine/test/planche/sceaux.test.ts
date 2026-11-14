import { describe, expect, it } from "vitest";
import {
  type PlancheSetup,
  plancheAdvance,
  plancheForceTry,
  plancheForced,
  plancheInit,
  plancheSealsLeft,
} from "../../src/index.js";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
// A Monday.
const T0 = Date.parse("2026-11-16T00:00:00Z");

function setup(): PlancheSetup {
  return {
    width: 10,
    height: 8,
    sliceMs: 6 * HOUR,
    goods: { sel: "Sel" },
    houses: [
      { id: "ana", name: "Ana", robot: false, x: 1, y: 1, makes: {} },
      { id: "ben", name: "Ben", robot: false, x: 4, y: 1, makes: {} },
      { id: "cid", name: "Cid", robot: false, x: 8, y: 1, makes: {} },
    ],
    cities: [],
    passages: ["a", "b", "c", "d"].map((id, k) => ({
      id,
      name: `Tour ${id}`,
      x: 1 + k * 2,
      y: 5,
      holder: `corsair:C${k}`,
      tollBps: 1_000,
      board: "petit",
      seals: 3,
    })),
    rank: {
      tideWeeks: 6,
      weekMs: WEEK,
      negoceMinMs: DAY,
      coteStart: 1_200,
      coteK: 32,
      repelledHours: 12,
    },
    sorties: { hour: 18, announceMs: DAY, depth: 3, guardDepth: 2 },
    rules: {
      bobbins: 3,
      store: 100,
      startStock: 0,
      startDucats: 0,
      threadPerHour: 10,
      patinaBpsPerDay: 0,
      patinaMaxBps: 0,
      tollMaxBps: 1_500,
      tollBurnBps: 3_000,
      freeAfterForceMs: DAY,
      rewindMsPerTile: 60_000,
    },
  };
}

// The honest duels (docs/plan-duels.md B2).
describe("the towers' seals", () => {
  it("are each house's own: the tower goes to the first that broke all of its own", () => {
    const S = setup();
    let s = plancheInit(S, T0);
    s = plancheForced(S, s, "ana", "a", T0);
    s = plancheForced(S, s, "ana", "a", T0 + DAY);
    expect(plancheSealsLeft(S, s, "a", "ana")).toBe(1);
    expect(plancheSealsLeft(S, s, "a", "ben")).toBe(3);
    // Ben's one seal does not finish Ana's work.
    s = plancheForced(S, s, "ben", "a", T0 + DAY);
    expect(s.passages.a?.holder).toBe("corsair:C0");
    s = plancheForced(S, s, "ana", "a", T0 + 2 * DAY);
    expect(s.passages.a?.holder).toBe("ana");
    // A new holder: everyone's count starts again.
    expect(plancheSealsLeft(S, s, "a", "ben")).toBe(3);
    expect(s.passages.a?.seals).toBe(3);
  });

  it("are tried once a tower and a day by each house", () => {
    const S = setup();
    let s = plancheInit(S, T0);
    s = plancheForceTry(S, s, "ana", "a", T0);
    expect(() => plancheForceTry(S, s, "ana", "a", T0 + HOUR)).toThrow("planche_force_tried");
    // Another tower, another house: free.
    s = plancheForceTry(S, s, "ana", "b", T0 + HOUR);
    s = plancheForceTry(S, s, "ben", "a", T0 + HOUR);
    // The next day, again.
    expect(() => plancheForceTry(S, s, "ana", "a", T0 + DAY)).not.toThrow();
    // One's own tower is not forced.
    s.passages.c = { holder: "cid", tollBps: 1_000, seals: 3 };
    expect(() => plancheForceTry(S, s, "cid", "c", T0)).toThrow("planche_own_passage");
  });
});

describe("the captains' sorties, spread", () => {
  it("never send more than two captains against one tower a week, the free ones first", () => {
    const S = setup();
    const s = plancheInit(S, T0);
    s.passages.a = { holder: "ana", tollBps: 1_000, seals: 3 };
    s.passages.d = { holder: "cid", tollBps: 1_000, seals: 3 };
    const t = plancheAdvance(S, s, T0 + WEEK);
    const targets = (t.sorties?.list ?? []).map((x) => x.target);
    // Four captains, two towers held: two each.
    expect(targets.filter((x) => x === "a")).toHaveLength(2);
    expect(targets.filter((x) => x === "d")).toHaveLength(2);
    // One tower only: two captains at most.
    const u = plancheInit(S, T0);
    u.passages.a = { holder: "ana", tollBps: 1_000, seals: 3 };
    expect(plancheAdvance(S, u, T0 + WEEK).sorties?.list).toHaveLength(2);
  });
});
