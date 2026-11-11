import {
  PASSE_EMPTY,
  type PasseMove,
  type PasseSetup,
  type PlancheSetup,
  passeInit,
  passeLegal,
  passePlay,
  passeThink,
} from "@comptoirs/engine";
import { describe, expect, it } from "vitest";
import { PlancheHub, type PlancheHubTheme } from "../src/game/planche.js";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** A small board of the test: three houses, two towns, a corsair's passage on a 3 × 3 strait. */
function theme(): PlancheHubTheme {
  const board: PlancheSetup = {
    width: 10,
    height: 6,
    sliceMs: HOUR / 6,
    goods: { verre: "Verre" },
    houses: [
      { id: "a", name: "Ca’ A", robot: true, x: 4, y: 3, makes: { verre: 12 } },
      { id: "b", name: "Ca’ B", robot: true, x: 5, y: 3, makes: { verre: 12 } },
      { id: "c", name: "Ca’ C", robot: true, x: 4, y: 4, makes: { verre: 12 } },
    ],
    cities: [
      {
        id: "near",
        name: "Près",
        x: 1,
        y: 3,
        via: [],
        wants: { verre: { price: 1_000, floorBps: 3_000, cap: 100, regenPerHour: 6 } },
      },
      {
        id: "far",
        name: "Loin",
        x: 9,
        y: 5,
        via: ["strait"],
        wants: { verre: { price: 4_000, floorBps: 5_000, cap: 100, regenPerHour: 6 } },
      },
    ],
    passages: [
      {
        id: "strait",
        name: "Détroit",
        x: 7,
        y: 4,
        holder: "corsair:Ivo",
        tollBps: 1_000,
        board: "petit",
        seals: 1,
      },
    ],
    rules: {
      bobbins: 2,
      store: 200,
      startStock: 40,
      startDucats: 0,
      threadPerHour: 10,
      patinaBpsPerDay: 500,
      patinaMaxBps: 5_000,
      tollMaxBps: 1_500,
      tollBurnBps: 3_000,
      freeAfterForceMs: DAY,
      rewindMsPerTile: 60_000,
    },
  };
  const strait: Pick<PasseSetup, "width" | "height" | "first"> & { cells: number[] } = {
    width: 3,
    height: 3,
    cells: new Array(9).fill(PASSE_EMPTY),
    first: 1,
  };
  return {
    board,
    passe: {
      rules: { fire: { thread: 0, chain: 0 }, cargo: { holds: 3, full: 3, step: 1 } },
      boards: { petit: strait },
      lieutenant: 3,
    },
    visitHours: 8,
  };
}
const T0 = Date.parse("2026-11-16T06:00:00Z");

/** The thread's pieces that beat the hub's lieutenant on the strait, found by playing against it. */
function winningLine(t: PlancheHubTheme): PasseMove[] {
  const b = t.passe.boards.petit;
  if (!b) throw new Error("no board");
  const setup: PasseSetup = { ...t.passe.rules, ...b, cells: [...b.cells] };
  // a search over the thread's pieces, the lieutenant answering as the hub's does
  const search = (s: ReturnType<typeof passeInit>, line: PasseMove[]): PasseMove[] | null => {
    if (s.winner === 1) return line;
    if (s.winner) return null;
    for (const m of passeLegal(s)) {
      const after = passePlay(s, m);
      if (after.winner === 1) return [...line, m];
      if (after.winner) continue;
      const reply = passePlay(after, passeThink(after, { depth: t.passe.lieutenant }));
      const found = search(reply, [...line, m]);
      if (found) return found;
    }
    return null;
  };
  const line = search(passeInit(setup), []);
  if (!line) throw new Error("the strait cannot be won");
  return line;
}

// The shared board on line (docs/plan-planche.md L5): the players take the houses of the computer.
describe("the board on line", () => {
  it("gives each newcomer a house of the computer, and the same one when it comes back", () => {
    const hub = new PlancheHub(theme(), T0);
    expect(hub.view("ana", "Ana", T0).me).toBe("a");
    expect(hub.view("ben", "Ben", T0).me).toBe("b");
    expect(hub.view("ana", "Ana", T0 + HOUR).me).toBe("a");
    const v = hub.view("ana", "Ana", T0 + HOUR);
    expect(v.names.a).toBe("Ana");
    expect(v.names.b).toBe("Ben");
    expect(v.names.c).toBe("Ca’ C");
    expect(v.players).toEqual(["a", "b"]);
  });

  it("lets a newcomer only watch once every house is taken", () => {
    const hub = new PlancheHub(theme(), T0);
    for (const id of ["p1", "p2", "p3"]) hub.view(id, id, T0);
    const v = hub.view("p4", "p4", T0);
    expect(v.me).toBeNull();
    expect(hub.thread("p4", "near", "verre", T0)).toBe("not_seated");
  });

  it("plays the houses nobody took, never a player's", () => {
    const hub = new PlancheHub(theme(), T0);
    hub.view("ana", "Ana", T0);
    const v = hub.view("ana", "Ana", T0 + 9 * HOUR);
    expect(v.state.houses.a?.threads).toHaveLength(0);
    expect(v.state.houses.b?.threads.length).toBeGreaterThan(0);
  });

  it("stretches and takes back a player's thread, and refuses what the board refuses", () => {
    const hub = new PlancheHub(theme(), T0);
    hub.view("ana", "Ana", T0);
    expect(hub.thread("ana", "near", "verre", T0)).toBe("ok");
    expect(hub.thread("ana", "near", "verre", T0)).toBe("planche_twice");
    expect(hub.thread("ana", "far", "verre", T0)).toBe("planche_route_shut");
    expect(hub.thread("ana", "nowhere", "verre", T0)).toBe("planche_unknown");
    const later = hub.view("ana", "Ana", T0 + 2 * HOUR);
    expect(later.state.houses.a?.delivered).toBeGreaterThan(0);
    expect(hub.unthread("ana", "near", "verre", T0 + 2 * HOUR)).toBe("ok");
    expect(hub.unthread("ana", "near", "verre", T0 + 2 * HOUR)).toBe("planche_no_thread");
  });

  it("is the same board for everyone: one's thread is seen by the other", () => {
    const hub = new PlancheHub(theme(), T0);
    hub.view("ana", "Ana", T0);
    hub.view("ben", "Ben", T0);
    hub.thread("ana", "near", "verre", T0);
    expect(hub.view("ben", "Ben", T0).state.houses.a?.threads.map((t) => t.to)).toEqual(["near"]);
  });

  it("forces a passage only with a duel the server replays and the thread wins", () => {
    const t = theme();
    const hub = new PlancheHub(t, T0);
    hub.view("ana", "Ana", T0);
    expect(hub.force("ana", "strait", [{ at: 4 }], T0)).toBe("duel_lost");
    expect(hub.force("ana", "strait", [{ at: 99 }], T0)).toBe("duel_illegal");
    expect(hub.force("ana", "nowhere", [], T0)).toBe("planche_unknown");
    const line = winningLine(t);
    expect(hub.force("ana", "strait", line, T0)).toBe("ok");
    // one seal: the tower is Ana's house, the far town open to all
    const v = hub.view("ana", "Ana", T0);
    expect(v.state.passages.strait?.holder).toBe("a");
    expect(hub.thread("ana", "far", "verre", T0)).toBe("ok");
    expect(hub.toll("ana", "strait", 500, T0)).toBe("ok");
    expect(hub.toll("ben", "strait", 500, T0)).toBe("not_seated");
  });

  it("keeps every denier accounted for, whatever the players and the computer do", () => {
    const hub = new PlancheHub(theme(), T0);
    hub.view("ana", "Ana", T0);
    hub.thread("ana", "near", "verre", T0);
    const v = hub.view("ana", "Ana", T0 + 5 * DAY);
    expect(v.ok).toBe(true);
  });
});
