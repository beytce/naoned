import { PASSE_EMPTY, type PasseSetup, type PlancheSetup } from "@comptoirs/engine";
import { eq, sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { type Database, openDatabase } from "../src/db/client.js";
import {
  accounts,
  ledgerEntries,
  plancheAccountLeagues,
  plancheSeats,
  plancheTides,
} from "../src/db/schema.js";
import { PlancheHub, type PlancheHubTheme } from "../src/game/planche.js";
import { PlancheLagoons } from "../src/game/plancheLagoons.js";
import { testDatabase } from "./db.js";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
// A Monday, 6 h (UTC).
const T0 = Date.parse("2026-11-16T06:00:00Z");

/** A small board: two houses, a town, two towers; a tide of a week; two leagues. */
function theme(): PlancheHubTheme {
  const board: PlancheSetup = {
    width: 8,
    height: 8,
    sliceMs: HOUR,
    goods: { verre: "Verre" },
    houses: [
      { id: "a", name: "Ca’ A", robot: true, x: 2, y: 2, makes: { verre: 12 } },
      { id: "b", name: "Ca’ B", robot: true, x: 5, y: 2, makes: { verre: 12 } },
    ],
    cities: [
      {
        id: "pres",
        name: "Près",
        x: 1,
        y: 4,
        via: [],
        wants: { verre: { price: 1_000, floorBps: 3_000, cap: 100, regenPerHour: 6 } },
      },
    ],
    passages: [
      {
        id: "pont",
        name: "Le pont",
        x: 2,
        y: 6,
        holder: "corsair:Ivo",
        tollBps: 1_000,
        board: "petit",
        seals: 2,
      },
      {
        id: "bouche",
        name: "La bouche",
        x: 3,
        y: 5,
        holder: "corsair:Dragut",
        tollBps: 1_000,
        board: "petit",
        seals: 2,
      },
    ],
    rank: {
      tideWeeks: 2,
      weekMs: WEEK,
      negoceMinMs: DAY,
      coteStart: 1_200,
      coteK: 32,
      repelledHours: 12,
    },
    sorties: { hour: 18, announceMs: DAY, depth: 3, guardDepth: 2 },
    decrets: { priceBps: 1_000, tollBps: 500, inkLess: 50, noirLess: 1, chooseMs: 3 * DAY },
    ligues: { count: 2, shareBps: 1_667 },
    rules: {
      bobbins: 2,
      store: 200,
      startStock: 40,
      startDucats: 1_000,
      threadPerHour: 10,
      patinaBpsPerDay: 0,
      patinaMaxBps: 0,
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

// The sorties and the decree on the server (docs/plan-maree.md T5).
describe("the tide on line", () => {
  it("plays the sorties at their hour, or as the holder meets one before it", async () => {
    const t = theme();
    const hub = new PlancheHub(t, T0);
    const me = (await hub.view("ana", "Ana", T0)).me ?? "";
    const doc = hub.current().doc;
    doc.state.passages.bouche = { holder: me, tollBps: 1_000, seals: 2 };
    const monday = await hub.view("ana", "Ana", T0 + WEEK);
    const list = monday.state.sorties?.list ?? [];
    expect(list.length).toBe(2);
    const [first, second] = [...list].sort((a, b) => a.at - b.at);
    if (!first || !second) throw new Error("no sorties");
    // Met before its hour, the chain laying nothing: the captain passes, a seal is lost.
    expect(await hub.sortie("ben", first.id, [], first.at - HOUR)).toBe("not_seated");
    expect(await hub.sortie("ana", first.id, [], first.at - HOUR)).toBe("duel_lost");
    const after = await hub.view("ana", "Ana", first.at - HOUR);
    expect(after.state.sorties?.done[first.id]).toMatchObject({ won: true, by: "tenant" });
    expect(after.state.passages.bouche?.seals).toBe(1);
    expect(await hub.sortie("ana", first.id, [], first.at - HOUR)).toBe("planche_sortie_done");
    // The other is played at its hour against the guard, without the holder: by the timer that
    // settles the sorties, never by a read (docs/plan-socle.md A3).
    const still = await hub.view("ana", "Ana", second.at + HOUR);
    expect(still.state.sorties?.done[second.id]).toBeUndefined();
    expect(await hub.settleSorties(second.at + HOUR)).toBe(1);
    const later = await hub.view("ana", "Ana", second.at + HOUR);
    expect(later.state.sorties?.done[second.id]?.by).toBe("garde");
    expect(later.ok).toBe(true);
  });

  it("lets the Doge proclaimed choose the next tide's decree", async () => {
    const t = theme();
    const hub = new PlancheHub(t, T0);
    await hub.view("ana", "Ana", T0);
    const end = await hub.view("ana", "Ana", T0 + 2 * WEEK);
    const d = end.state.decret;
    // A board without the ink nor black straits: the decrees about a price and the tolls.
    expect(d?.offered.map((x) => x.kind).sort()).toEqual(["peage", "prix"]);
    const doge = Object.entries(hub.current().doc.seats).find(([, s]) => s.house === d?.doge)?.[0];
    if (doge !== "ana") {
      expect(await hub.decret("ana", 0, T0 + 2 * WEEK)).toBe("planche_not_doge");
      return;
    }
    expect(await hub.decret("ana", 1, T0 + 2 * WEEK)).toBe("ok");
    expect(hub.current().doc.state.decret?.chosen).toBe(1);
  });
});

let dbUrl: string;
let dropDb: () => Promise<void>;
let database: Database;

beforeAll(async () => {
  ({ url: dbUrl, drop: dropDb } = await testDatabase());
});
afterAll(async () => {
  await dropDb();
});
beforeEach(async () => {
  database = openDatabase(dbUrl);
  await database.migrate();
  await database.db.execute(sql`truncate worlds, accounts cascade`);
});
afterEach(async () => {
  await database.close();
});

// The leagues (docs/plan-maree.md T5): the top of a lagoon goes up, its house whole.
describe("the leagues", () => {
  it("moves the best player of a lagoon to the next league, its house whole, its purse in the ledger", async () => {
    const [ana] = await database.db
      .insert(accounts)
      .values({ email: "ana@example.org", emailCanonical: "ana@example.org", pseudo: "Ana" })
      .returning();
    if (!ana) throw new Error("no account");
    const lagoons = await PlancheLagoons.open(database.db, theme(), T0);
    const { store } = await lagoons.seatOf(ana.id, "Ca’ Ana", T0);
    expect(lagoons.leagueOf(store)).toBe(1);
    // The tide ends: Ana, the only player, is the top sixth.
    await store.hub.view(ana.id, "Ca’ Ana", T0 + 2 * WEEK + HOUR);
    const before = store.hub.current().doc;
    const house = before.seats[ana.id]?.house ?? "";
    const purse = before.state.houses[house]?.ducats ?? 0n;
    await lagoons.turnLeagues(T0 + 2 * WEEK + HOUR);
    const up = lagoons.all().find((s) => s !== store);
    if (!up) throw new Error("no lagoon of the second league");
    expect(lagoons.leagueOf(up)).toBe(2);
    expect(up.name).toBe("La Sérénissime");
    expect(store.hub.houseOf(ana.id)).toBeNull();
    const there = up.hub.houseOf(ana.id) ?? "";
    expect(up.hub.current().doc.state.houses[there]?.ducats).toBe(purse);
    expect(up.hub.current().doc.state.rank.humans).toContain(there);
    const [seat] = await database.db
      .select()
      .from(plancheSeats)
      .where(eq(plancheSeats.accountId, ana.id));
    expect(seat?.worldId).toBe(up.worldId);
    const [best] = await database.db.select().from(plancheAccountLeagues);
    expect(best).toEqual({ accountId: ana.id, best: 2 });
    const tides = await database.db.select().from(plancheTides);
    expect(tides.find((x) => x.worldId === store.worldId)?.moves).toMatchObject({
      up: [ana.id],
      down: [],
      lagoon: store.name,
    });
    // Once a tide: settled again, nothing moves.
    await lagoons.turnLeagues(T0 + 2 * WEEK + 2 * HOUR);
    expect(up.hub.houseOf(ana.id)).toBe(there);
    // The purse went through the ledger: out of one lagoon, into the other.
    await store.snapshot();
    await up.snapshot();
    const rows = await database.db
      .select()
      .from(ledgerEntries)
      .where(eq(ledgerEntries.reason, "planche_ligue"));
    const outOf = rows.find((r) => r.worldId === store.worldId && r.toAccount === "planche:ligue");
    const into = rows.find(
      (r) =>
        r.worldId === up.worldId &&
        r.fromAccount === "planche:ligue" &&
        r.toAccount === `house:${there}`,
    );
    expect(outOf?.amount).toBe(purse);
    expect(into?.amount).toBe(purse);
    // The newcomer begins in the first league.
    const [ben] = await database.db
      .insert(accounts)
      .values({ email: "ben@example.org", emailCanonical: "ben@example.org", pseudo: "Ben" })
      .returning();
    if (!ben) throw new Error("no account");
    const seated = await lagoons.seatOf(ben.id, "Ca’ Ben", T0 + 2 * WEEK + 3 * HOUR);
    expect(lagoons.leagueOf(seated.store)).toBe(1);
  });
});
