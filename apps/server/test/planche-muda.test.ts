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
// A Monday, 6 h (UTC).
const T0 = Date.parse("2026-11-16T06:00:00Z");
const WED = T0 + 2 * DAY;
const SAT = T0 + 5 * DAY;

/** A small board: three houses, a town, the Muda's pier, a black strait; every duel on a 3 × 3. */
function theme(): PlancheHubTheme {
  const board: PlancheSetup = {
    width: 10,
    height: 8,
    sliceMs: HOUR,
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
        id: "mole",
        name: "Le môle",
        x: 5,
        y: 6,
        via: [],
        ring: "muda",
        wants: { verre: { price: 800, floorBps: 10_000, cap: 1, regenPerHour: 0 } },
      },
    ],
    passages: [],
    noir: {
      minLevel: 1,
      straits: [
        {
          id: "turc",
          name: "Le détroit du Turc",
          power: "turc",
          captain: "Le Kapudan",
          style: "meute",
          x: 8,
          y: 7,
          board: "petit",
          port: "Constantinople",
        },
      ],
      depth: 3,
      phases: [0],
      triesPerDay: 2,
      cargo: [{ level: 1, n: 20 }],
      priceBps: 15_000,
      relicsPerPlan: 3,
      plans: {},
    },
    muda: {
      pier: "mole",
      loadDays: [2, 3, 4],
      sailDay: 5,
      sailHours: [8, 20],
      returnDay: 6,
      returnHour: 8,
      holdPerHouse: 40,
      dailyCap: 20,
      robotDaily: 5,
      straits: [{ id: "zara", name: "Zara", board: "petit", x: 5, y: 7 }],
      depth: 3,
      stepBps: 5_000,
      prestige: { contributor: 30, minUnits: 10, volunteer: 5, winner: 20 },
    },
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
  const petit: Pick<PasseSetup, "width" | "height" | "first"> & { cells: number[] } = {
    width: 3,
    height: 3,
    cells: new Array(9).fill(PASSE_EMPTY),
    first: 1,
  };
  return {
    board,
    passe: {
      rules: { fire: { thread: 0, chain: 0 }, cargo: { holds: 3, full: 3, step: 1 } },
      boards: { petit },
      lieutenant: 3,
    },
    visitHours: 8,
    idleHours: 0,
  };
}

/** The thread's pieces that beat a mind on the small board, found by playing against it. */
function winningLine(
  t: PlancheHubTheme,
  mind: { depth: number; style?: "mur" | "rives" | "meute" },
): PasseMove[] {
  const b = t.passe.boards.petit;
  if (!b) throw new Error("no board");
  const setup: PasseSetup = { ...t.passe.rules, ...b, cells: [...b.cells], first: 1 };
  const search = (s: ReturnType<typeof passeInit>, line: PasseMove[]): PasseMove[] | null => {
    if (s.winner === 1) return line;
    if (s.winner) return null;
    for (const m of passeLegal(s)) {
      const after = passePlay(s, m);
      if (after.winner === 1) return [...line, m];
      if (after.winner) continue;
      const found = search(passePlay(after, passeThink(after, mind)), [...line, m]);
      if (found) return found;
    }
    return null;
  };
  const line = search(passeInit(setup), []);
  if (!line) throw new Error("the board cannot be won");
  return line;
}

// The black straits on the server (docs/plan-muda.md N4): the duel replayed, the cargo risked.
describe("the black straits on line", () => {
  it("sells a cargo forced at the far port and gives a relic; a duel lost sinks it", async () => {
    const t = theme();
    const hub = new PlancheHub(t, T0);
    const me = (await hub.view("ana", "Ana", T0)).me ?? "";
    await hub.view("ben", "Ben", T0);
    const line = winningLine(t, { depth: 3, style: "meute" });
    expect(await hub.noir("ana", "nowhere", { good: "verre", n: 5 }, line, T0)).toBe(
      "planche_unknown",
    );
    expect(await hub.noir("ana", "turc", { good: "verre", n: 99 }, line, T0)).toBe(
      "planche_noir_cargo",
    );
    const v0 = await hub.view("ana", "Ana", T0);
    const stock = v0.state.houses[me]?.stock.verre ?? 0;
    const ducats = v0.state.houses[me]?.ducats ?? 0n;
    expect(await hub.noir("ana", "turc", { good: "verre", n: 10 }, line, T0)).toBe("ok");
    const v = await hub.view("ana", "Ana", T0);
    expect(v.state.houses[me]?.stock.verre).toBe(stock - 10);
    expect((v.state.houses[me]?.ducats ?? 0n) - ducats).toBe(15_000n);
    expect(v.state.houses[me]?.relics).toEqual({ turc: 1 });
    // Lost (no piece laid): the cargo sinks, the second try of the day is spent.
    expect(await hub.noir("ana", "turc", { good: "verre", n: 10 }, [], T0)).toBe("duel_lost");
    const w = await hub.view("ana", "Ana", T0);
    expect(w.state.houses[me]?.stock.verre).toBe(stock - 20);
    expect(w.state.houses[me]?.relics).toEqual({ turc: 1 });
    expect(await hub.noir("ana", "turc", { good: "verre", n: 1 }, line, T0)).toBe(
      "planche_noir_tried",
    );
    expect(w.ok).toBe(true);
  });
});

// The Muda on the server (docs/plan-muda.md N4).
describe("the Muda on line", () => {
  it("loads by a thread to the pier, plays its strait on Saturday, pays on Sunday", async () => {
    const t = theme();
    const hub = new PlancheHub(t, T0);
    const me = (await hub.view("ana", "Ana", T0)).me ?? "";
    await hub.view("ben", "Ben", T0);
    expect(await hub.thread("ana", "mole", "verre", WED)).toBe("ok");
    await hub.view("ana", "Ana", WED + 5 * HOUR);
    expect(await hub.unthread("ana", "mole", "verre", WED + 5 * HOUR)).toBe("ok");
    const loaded = await hub.view("ana", "Ana", WED + 6 * HOUR);
    expect(loaded.state.muda?.units[me]).toBe(20);
    // The house of the computer loaded its part.
    expect(loaded.state.muda?.units.c).toBe(5);
    const line = winningLine(t, { depth: 3 });
    expect(await hub.muda("ana", "zara", line, WED + 7 * HOUR)).toBe("planche_muda_closed");
    expect(await hub.muda("ben", "zara", [], SAT + 9 * HOUR)).toBe("duel_lost");
    expect(await hub.muda("ana", "zara", line, SAT + 9 * HOUR)).toBe("ok");
    const sat = await hub.view("ana", "Ana", SAT + 9 * HOUR);
    expect(sat.state.muda?.straits.zara?.by).toBe(me);
    const before = sat.state.houses[me]?.ducats ?? 0n;
    const sun = await hub.view("ana", "Ana", SAT + DAY + 9 * HOUR);
    // Twenty of glass at 800, one strait passed: × 1.5. And what its threads sold meanwhile.
    expect(sun.state.muda?.paid?.[me]).toBe(24_000n);
    expect((sun.state.houses[me]?.ducats ?? 0n) - before).toBeGreaterThanOrEqual(24_000n);
    expect(sun.ok).toBe(true);
  });
});
