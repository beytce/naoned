import { describe, expect, it } from "vitest";
import {
  PASSE_EMPTY,
  type PasseSetup,
  type PlancheSetup,
  type PlancheState,
  plancheAdvance,
  plancheInit,
  plancheSortieDuel,
  plancheSortieEnd,
  plancheSortieMeet,
  plancheSortieRefusal,
  plancheSortieTold,
  plancheSortiesAhead,
  plancheSortiesDue,
  plancheSortiesSettle,
} from "../../src/index.js";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
// A Monday.
const T0 = Date.parse("2026-11-16T00:00:00Z");

const board: PasseSetup = {
  width: 3,
  height: 3,
  cells: new Array(9).fill(PASSE_EMPTY),
  first: 1,
  fire: { thread: 0, chain: 0 },
  cargo: { holds: 3, full: 3, step: 1 },
};

function setup(): PlancheSetup {
  return {
    width: 8,
    height: 8,
    sliceMs: 6 * HOUR,
    goods: { sel: "Sel" },
    houses: [
      { id: "ana", name: "Ana", robot: false, x: 2, y: 2, makes: {} },
      { id: "ben", name: "Ben", robot: false, x: 5, y: 2, makes: {} },
    ],
    cities: [],
    passages: [
      {
        id: "pont",
        name: "Le pont",
        x: 1,
        y: 6,
        holder: "corsair:Ivo",
        tollBps: 1_000,
        board: "petit",
        seals: 2,
      },
      {
        id: "bouche",
        name: "La bouche",
        x: 2,
        y: 5,
        holder: "corsair:Dragut",
        tollBps: 1_000,
        board: "petit",
        seals: 2,
      },
      {
        id: "canal",
        name: "Le canal",
        x: 7,
        y: 5,
        holder: "corsair:Dragut",
        tollBps: 1_000,
        board: "petit",
        seals: 2,
      },
    ],
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
      store: 1_000,
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

/** Ana holds the mouth when the week turns: the sorties are drawn. */
function drawn(S: PlancheSetup): PlancheState {
  const s = plancheInit(S, T0);
  s.passages.bouche = { holder: "ana", tollBps: 1_000, seals: 2 };
  return plancheAdvance(S, s, T0 + WEEK);
}

// The captains' sorties (docs/plan-maree.md T2).
describe("the captains' sorties", () => {
  it("are drawn on Monday, a captain each against the nearest tower a person holds", () => {
    const S = setup();
    const s = drawn(S);
    const list = s.sorties?.list ?? [];
    // Ivo from the bridge; Dragut once, though he holds the canal too.
    expect(list.map((x) => [x.captain, x.target])).toEqual([
      ["Ivo", "bouche"],
      ["Dragut", "bouche"],
    ]);
    for (const x of list) {
      const day = Math.floor((x.at - (T0 + WEEK)) / DAY);
      expect(day).toBeGreaterThanOrEqual(1);
      expect(day).toBeLessThanOrEqual(5);
      expect((x.at - (T0 + WEEK)) % DAY).toBe(18 * HOUR);
      expect(plancheSortieTold(S, x, x.at - 2 * HOUR)).toBe(true);
      expect(plancheSortieTold(S, x, x.at - 2 * DAY)).toBe(false);
    }
    expect(plancheSortiesAhead(s, T0 + WEEK)).toHaveLength(2);
    // No tower held by a person: no sortie.
    expect(plancheAdvance(S, plancheInit(S, T0), T0 + WEEK).sorties?.list).toEqual([]);
  });

  it("is played at its hour against the tower's guard, the same way everywhere", () => {
    const S = setup();
    let s = drawn(S);
    const [x] = [...(s.sorties?.list ?? [])].sort((a, b) => a.at - b.at);
    if (!x) throw new Error("no sortie");
    expect(plancheSortiesDue(s, x.at - 1)).toHaveLength(0);
    s = plancheAdvance(S, s, x.at);
    const won = plancheSortieDuel(S, x, board);
    s = plancheSortiesSettle(S, s, x.at, () => board);
    expect(s.sorties?.done[x.id]).toEqual({ won, by: "garde", at: x.at });
    if (won) expect(s.passages.bouche?.seals).toBe(1);
    else expect(s.houses.ana?.rank.repelled).toBe(1);
    expect(s.houses.ana?.maison).toBeUndefined();
  });

  it("takes a seal when the captain passes, the tower with its last; a sortie held is repelled", () => {
    const S = setup();
    let s = drawn(S);
    const [a, b] = s.sorties?.list ?? [];
    if (!a || !b) throw new Error("no sorties");
    s = plancheSortieEnd(S, s, a.id, true, "garde", a.at);
    expect(s.passages.bouche).toMatchObject({ holder: "ana", seals: 1 });
    expect(() => plancheSortieEnd(S, s, a.id, true, "garde", a.at)).toThrow("planche_sortie_done");
    s = plancheSortieEnd(S, s, b.id, true, "garde", b.at);
    expect(s.passages.bouche).toEqual({ holder: "corsair:Dragut", tollBps: 1_000, seals: 2 });
    let t = drawn(S);
    t = plancheSortieEnd(S, t, a.id, false, "tenant", a.at - HOUR);
    expect(t.houses.ana?.rank.repelled).toBe(1);
  });

  it("may be met before its hour by the tower's holder alone", () => {
    const S = setup();
    const s = drawn(S);
    const [x] = s.sorties?.list ?? [];
    if (!x) throw new Error("no sortie");
    expect(plancheSortieRefusal(s, "ben", x.id, x.at - HOUR)).toBe("planche_not_holder");
    expect(plancheSortieRefusal(s, "ana", x.id, x.at)).toBe("planche_sortie_past");
    expect(plancheSortieRefusal(s, "ana", x.id, x.at - HOUR)).toBeUndefined();
    // An illegal piece; a chain that lays nothing lets the captain through.
    expect(plancheSortieMeet(S, x, board, [{ at: 99 }])).toBeNull();
    expect(plancheSortieMeet(S, x, board, [])).toBe(true);
  });
});
