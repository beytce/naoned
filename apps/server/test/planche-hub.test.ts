import {
  PASSE_CHAIN,
  PASSE_EMPTY,
  type PasseMove,
  type PasseSetup,
  type PlancheSetup,
  passeForcedWin,
  passeInit,
  passeLegal,
  passePlay,
  passeThink,
  plancheOrders,
  venice1450Passe,
} from "@comptoirs/engine";
import { describe, expect, it } from "vitest";
import { PlancheHub, type PlancheHubTheme, mondayOf } from "../src/game/planche.js";
import { duelOut } from "./duelOut.js";

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
    rank: {
      tideWeeks: 6,
      weekMs: 7 * DAY,
      negoceMinMs: DAY,
      coteStart: 1_200,
      coteK: 32,
      repelledHours: 12,
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
    idleHours: 48,
  };
}
const T0 = Date.parse("2026-11-16T06:00:00Z");

/** The thread's pieces that beat the hub's lieutenant on the strait, found by playing against it. */
function winningLine(t: PlancheHubTheme, guard: number[] = []): PasseMove[] {
  const b = t.passe.boards.petit;
  if (!b) throw new Error("no board");
  const cells = [...b.cells];
  for (const i of guard) cells[i] = PASSE_CHAIN;
  const setup: PasseSetup = { ...t.passe.rules, ...b, cells };
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
  it("gives each newcomer a house of the computer, and the same one when it comes back", async () => {
    const hub = new PlancheHub(theme(), T0);
    expect((await hub.view("ana", "Ana", T0)).me).toBe("a");
    expect((await hub.view("ben", "Ben", T0)).me).toBe("b");
    expect((await hub.view("ana", "Ana", T0 + HOUR)).me).toBe("a");
    const v = await hub.view("ana", "Ana", T0 + HOUR);
    expect(v.names.a).toBe("Ana");
    expect(v.names.b).toBe("Ben");
    expect(v.names.c).toBe("Ca’ C");
    expect(v.players).toEqual(["a", "b"]);
  });

  it("lets a newcomer only watch once every house is taken", async () => {
    const hub = new PlancheHub(theme(), T0);
    for (const id of ["p1", "p2", "p3"]) await hub.view(id, id, T0);
    const v = await hub.view("p4", "p4", T0);
    expect(v.me).toBeNull();
    expect(await hub.thread("p4", "near", "verre", T0)).toBe("not_seated");
  });

  it("gives back to the computer a house left too long, for a newcomer to take", async () => {
    const hub = new PlancheHub(theme(), T0);
    for (const id of ["p1", "p2", "p3"]) await hub.view(id, id, T0);
    await hub.view("p2", "p2", T0 + 40 * HOUR);
    await hub.view("p3", "p3", T0 + 40 * HOUR);
    // p1 has not come back for 49 hours: its house is the newcomer's
    const v = await hub.view("p4", "p4", T0 + 49 * HOUR);
    expect(v.me).toBe("a");
    expect(v.names.a).toBe("p4");
    // p1, coming back, finds every house taken
    expect((await hub.view("p1", "p1", T0 + 50 * HOUR)).me).toBeNull();
  });

  it("plays the houses nobody took, never a player's", async () => {
    const hub = new PlancheHub(theme(), T0);
    await hub.view("ana", "Ana", T0);
    const v = await hub.view("ana", "Ana", T0 + 9 * HOUR);
    expect(v.state.houses.a?.threads).toHaveLength(0);
    expect(v.state.houses.b?.threads.length).toBeGreaterThan(0);
  });

  it("stretches and takes back a player's thread, and refuses what the board refuses", async () => {
    const hub = new PlancheHub(theme(), T0);
    await hub.view("ana", "Ana", T0);
    expect(await hub.thread("ana", "near", "verre", T0)).toBe("ok");
    expect(await hub.thread("ana", "near", "verre", T0)).toBe("planche_twice");
    expect(await hub.thread("ana", "far", "verre", T0)).toBe("planche_route_shut");
    expect(await hub.thread("ana", "nowhere", "verre", T0)).toBe("planche_unknown");
    const later = await hub.view("ana", "Ana", T0 + 2 * HOUR);
    expect(later.state.houses.a?.delivered).toBeGreaterThan(0);
    expect(await hub.unthread("ana", "near", "verre", T0 + 2 * HOUR)).toBe("ok");
    expect(await hub.unthread("ana", "near", "verre", T0 + 2 * HOUR)).toBe("planche_no_thread");
  });

  it("is the same board for everyone: one's thread is seen by the other", async () => {
    const hub = new PlancheHub(theme(), T0);
    await hub.view("ana", "Ana", T0);
    await hub.view("ben", "Ben", T0);
    await hub.thread("ana", "near", "verre", T0);
    expect((await hub.view("ben", "Ben", T0)).state.houses.a?.threads.map((t) => t.to)).toEqual([
      "near",
    ]);
  });

  it("forces a passage only with a duel the server plays and the thread wins, once a day", async () => {
    const t = theme();
    const hub = new PlancheHub(t, T0);
    await hub.view("ana", "Ana", T0);
    const force = { kind: "force", passage: "strait" } as const;
    expect(await duelOut(hub, "ana", force, [{ at: 4 }], T0 - 2 * DAY)).toBe("duel_lost");
    // The try is spent when the duel begins.
    expect(await duelOut(hub, "ana", force, winningLine(t), T0 - 2 * DAY)).toBe(
      "planche_force_tried",
    );
    expect(await duelOut(hub, "ana", force, [{ at: 99 }], T0 - DAY)).toBe("duel_illegal");
    expect(await duelOut(hub, "ana", { kind: "force", passage: "nowhere" }, [], T0)).toBe(
      "planche_unknown",
    );
    const line = winningLine(t);
    expect(await duelOut(hub, "ana", force, line, T0)).toBe("ok");
    // one seal: the tower is Ana's house, the far town open to all
    const v = await hub.view("ana", "Ana", T0);
    expect(v.state.passages.strait?.holder).toBe("a");
    expect(await hub.thread("ana", "far", "verre", T0)).toBe("ok");
    expect(await hub.toll("ana", "strait", 500, T0)).toBe("ok");
    expect(await hub.toll("ben", "strait", 500, T0)).toBe("not_seated");
  });

  it("lets the holder lay its guard, and replays the next duel from it", async () => {
    const base = theme();
    const t: PlancheHubTheme = {
      ...base,
      board: { ...base.board, passages: base.board.passages.map((p) => ({ ...p, guard: 1 })) },
    };
    const hub = new PlancheHub(t, T0);
    await hub.view("ana", "Ana", T0);
    await hub.view("ben", "Ben", T0);
    expect(await hub.guard("ana", "strait", [0], T0)).toBe("planche_not_holder");
    expect(
      await duelOut(hub, "ana", { kind: "force", passage: "strait" }, winningLine(t), T0),
    ).toBe("ok");
    expect(await hub.guard("ana", "strait", [0, 1], T0)).toBe("planche_guard_many");
    expect(await hub.guard("ana", "strait", [0], T0)).toBe("ok");
    expect(await hub.guard("ana", "strait", [2], T0 + HOUR)).toBe("planche_guard_today");
    expect((await hub.view("ana", "Ana", T0)).state.passages.strait?.guard).toEqual([0]);
    // Ben's duel begins on the link Ana laid: a line found on that board wins it.
    expect(
      await duelOut(
        hub,
        "ben",
        { kind: "force", passage: "strait" },
        winningLine(t, [0]),
        T0 + HOUR,
      ),
    ).toBe("ok");
    expect((await hub.view("ben", "Ben", T0 + HOUR)).state.passages.strait?.guard).toBeUndefined();
  });

  it("keeps every denier accounted for, whatever the players and the computer do", async () => {
    const hub = new PlancheHub(theme(), T0);
    await hub.view("ana", "Ana", T0);
    await hub.thread("ana", "near", "verre", T0);
    const v = await hub.view("ana", "Ana", T0 + 5 * DAY);
    expect(v.ok).toBe(true);
  });
});

// The rank on line (docs/plan-classement.md R4).
describe("the rank on line", () => {
  it("starts the tide on the Monday at midnight before the board", async () => {
    expect(new Date(mondayOf(T0)).toISOString()).toBe("2026-11-16T00:00:00.000Z");
    expect(new Date(mondayOf(T0 + 3 * DAY)).toISOString()).toBe("2026-11-16T00:00:00.000Z");
    expect(new Date(mondayOf(T0 + 7 * DAY)).toISOString()).toBe("2026-11-23T00:00:00.000Z");
    const hub = new PlancheHub(theme(), T0);
    expect((await hub.view("ana", "Ana", T0)).state.rank.tideStart).toBe(mondayOf(T0));
  });

  it("makes a newcomer's house a person's, with its rival at once: a person first", async () => {
    const t = theme();
    // A house the theme gives to a person is no one's on line until it is taken.
    t.board.houses[2] = { ...(t.board.houses[2] as (typeof t.board.houses)[number]), robot: false };
    const hub = new PlancheHub(t, T0);
    const a = await hub.view("ana", "Ana", T0);
    expect(a.state.rank.humans).toEqual(["a"]);
    expect(a.state.rank.rivals.a).toBeDefined();
    const b = await hub.view("ben", "Ben", T0 + HOUR);
    expect(b.state.rank.humans).toEqual(["a", "b"]);
    expect(b.state.rank.rivals.b).toBe("a");
  });

  it("turns the week on Monday at midnight, and names new rivals", async () => {
    const hub = new PlancheHub(theme(), T0);
    await hub.view("ana", "Ana", T0);
    await hub.view("ben", "Ben", T0);
    const before = (await hub.view("ana", "Ana", mondayOf(T0) + 7 * DAY - HOUR)).state.rank;
    expect(before.week).toBe(0);
    const after = (await hub.view("ana", "Ana", mondayOf(T0) + 7 * DAY + HOUR)).state.rank;
    expect(after.week).toBe(1);
    expect(after.lastRivals.a).toBe(before.rivals.a);
    expect(after.rivals.a).not.toBe(before.rivals.a);
  });
});

// The board in real time (docs/plan-compte.md C5): its players are told after each gesture.
describe("the board told in real time", () => {
  it("tells every player of the board after a gesture, and no one after a refusal", async () => {
    const hub = new PlancheHub(theme(), T0);
    const told: string[][] = [];
    hub.onChange((players) => told.push([...players].sort()));
    await hub.view("ana", "Ana", T0);
    await hub.view("ben", "Ben", T0);
    told.length = 0;
    expect(await hub.thread("ana", "near", "verre", T0)).toBe("ok");
    expect(told).toEqual([["ana", "ben"]]);
    expect(await hub.thread("ana", "near", "verre", T0)).toBe("planche_twice");
    expect(told).toHaveLength(1);
  });
});

// The lagoons of 48 (docs/plan-lagunes.md G4): a newcomer goes where there are fewest people.
describe("the newcomer's sestiere", () => {
  it("seats each newcomer in the sestiere with the fewest players", async () => {
    const t = theme();
    const extra = (id: string, x: number) => ({
      ...(t.board.houses[0] as (typeof t.board.houses)[number]),
      id,
      name: id,
      x,
    });
    t.board.houses = [
      { ...extra("a1", 2), sestiere: "nord" },
      { ...extra("a2", 3), sestiere: "nord" },
      { ...extra("b1", 6), sestiere: "sud" },
      { ...extra("b2", 7), sestiere: "sud" },
    ];
    const hub = new PlancheHub(t, T0);
    expect((await hub.view("ana", "Ana", T0)).me).toBe("a1");
    expect((await hub.view("ben", "Ben", T0)).me).toBe("b1");
    expect((await hub.view("cid", "Cid", T0)).me).toBe("a2");
    expect((await hub.view("dan", "Dan", T0)).me).toBe("b2");
  });
});

// The sealed orders (docs/plan-hex-commerce.md H2): a position the hub replays, once per house.
describe("the sealed orders on line", () => {
  const ordered = (): PlancheHubTheme => {
    const t = theme();
    return {
      ...t,
      board: {
        ...t.board,
        houses: t.board.houses.map((h) => ({ ...h, sestiere: "s" })),
        orders: {
          perSestiere: 1,
          hours: [6],
          durationMs: 4 * HOUR,
          priceBps: 20_000,
          units: 30,
          problems: ["deux-01"],
        },
        daily: { problems: ["deux-01"], prestige: 20 },
      },
      passe: { ...t.passe, problems: venice1450Passe.problems },
    };
  };
  /** The thread's pieces that solve the problem against the hub's chain. */
  const solution = (): PasseMove[] => {
    const pb = venice1450Passe.problems.find((p) => p.id === "deux-01");
    if (!pb) throw new Error("no problem");
    let s = passeInit({
      ...venice1450Passe.rules,
      fire: { thread: 0, chain: 0 },
      width: pb.width,
      height: pb.height,
      cells: [...pb.cells],
      first: 1,
    });
    const line: PasseMove[] = [];
    while (!s.winner) {
      if (s.turn === 1) {
        const m = passeForcedWin(s, pb.moves - s.laid[0]);
        if (!m) throw new Error("no win");
        line.push(m);
        s = passePlay(s, m);
      } else s = passePlay(s, passeThink(s, { depth: 3 }));
    }
    return line;
  };

  it("delivers the order of the house that solves its position, twice the price", async () => {
    const t = ordered();
    const [o] = plancheOrders(t.board, Math.floor(T0 / DAY));
    if (!o) throw new Error("no order");
    const hub = new PlancheHub(t, T0);
    const me = (await hub.view("ana", "Ana", T0)).me ?? "";
    await hub.view("ben", "Ben", T0);
    const order = (p: string, id: string, moves: PasseMove[]) =>
      duelOut(hub, p, { kind: "order", order: id }, moves, T0);
    expect(await order("ana", "nowhere", [])).toBe("planche_unknown");
    // A wrong first piece: the try is spent.
    const wrong = solution()[0]?.at === 0 ? 1 : 0;
    expect(await order("ben", o.id, [{ at: wrong }])).toBe("duel_lost");
    expect(await order("ben", o.id, solution())).toBe("planche_order_tried");
    const before = (await hub.view("ana", "Ana", T0)).state.houses[me]?.ducats ?? 0n;
    expect(await order("ana", o.id, solution())).toBe("ok");
    const v = await hub.view("ana", "Ana", T0);
    expect(v.state.orders?.[o.id]?.by).toBe(me);
    expect((v.state.houses[me]?.ducats ?? 0n) - before).toBe(BigInt(o.units * o.price));
    expect(o.price).toBe(8_000);
    expect(v.ok).toBe(true);
    expect(await order("ben", o.id, solution())).toBe("planche_order_taken");
  });

  it("replays the problem of the day: one try a house, and the lagoon's count", async () => {
    const hub = new PlancheHub(ordered(), T0);
    const me = (await hub.view("ana", "Ana", T0)).me ?? "";
    const ben = (await hub.view("ben", "Ben", T0)).me ?? "";
    const daily = (p: string, moves: PasseMove[]) => duelOut(hub, p, { kind: "daily" }, moves, T0);
    expect(await daily("ana", solution())).toBe("ok");
    expect(await daily("ana", solution())).toBe("planche_daily_tried");
    const wrong = solution()[0]?.at === 0 ? 1 : 0;
    expect(await daily("ben", [{ at: wrong }])).toBe("duel_lost");
    const v = await hub.view("ana", "Ana", T0);
    const day = Math.floor(T0 / DAY);
    expect(v.state.daily?.[day]?.[me]).toEqual({ won: true, moves: 2 });
    expect(v.state.daily?.[day]?.[ben]?.won).toBe(false);
    expect(v.state.houses[me]?.maison?.knots).toBeUndefined();
  });
});

// The duels against the computer, played by the server piece by piece (docs/plan-duels.md B1).
describe("the duel rooms", () => {
  it("write the try at the start, lose a duel left or idle, and keep one duel a player", async () => {
    const t = theme();
    const hub = new PlancheHub(t, T0);
    hub.useSeeds(() => 7);
    await hub.view("ana", "Ana", T0);
    const v = await hub.duelStart("ana", { kind: "force", passage: "strait" }, T0);
    if (typeof v === "string") throw new Error(v);
    expect(v).toMatchObject({ side: 1, over: false, won: null, last: -1 });
    // Asked again (a screen reloaded), the same duel goes on; another is refused.
    expect(await hub.duelStart("ana", { kind: "force", passage: "strait" }, T0)).toEqual(v);
    expect(await hub.duelStart("ana", { kind: "daily" }, T0)).toBe("duel_running");
    expect(await hub.duelPlay("ben", { at: 0 }, T0)).toBe("duel_none");
    expect(await hub.duelPlay("ana", { at: 99 }, T0)).toBe("duel_illegal");
    // A piece of the player's, and the computer's answer, at once.
    const after = await hub.duelPlay("ana", { at: 0 }, T0);
    if (typeof after === "string") throw new Error(after);
    if (!after.over) {
      expect(after.state.turn).toBe(1);
      expect(after.last).not.toBe(0);
    }
    // Ten minutes without a piece: lost, and the room is closed.
    await hub.sweepDuels(T0 + 11 * 60_000);
    expect(hub.duelOf("ana")).toBeNull();
    expect(await hub.duelStart("ana", { kind: "force", passage: "strait" }, T0 + HOUR)).toBe(
      "planche_force_tried",
    );
    expect((await hub.view("ana", "Ana", T0 + HOUR)).state.passages.strait?.holder).toBe(
      "corsair:Ivo",
    );
  });
});
