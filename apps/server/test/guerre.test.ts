import { maisonUnlocks } from "@comptoirs/engine";
import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { type Database, openDatabase } from "../src/db/client.js";
import { accounts, companies, companyMembers, guerreAssaults } from "../src/db/schema.js";
import { GuerreHub } from "../src/game/guerre.js";
import { plancheTheme } from "../src/game/planche.js";
import { PlancheLagoons } from "../src/game/plancheLagoons.js";
import { testDatabase } from "./db.js";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** A Monday. */
const T0 = Date.parse("2026-11-16T00:00:00Z");

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
  await database.db.execute(
    sql`truncate worlds, accounts, guerre_weeks, guerre_assaults, companies cascade`,
  );
});
afterEach(async () => {
  await database.close();
});

async function account(pseudo: string) {
  const [a] = await database.db
    .insert(accounts)
    .values({ email: `${pseudo}@example.org`, emailCanonical: `${pseudo}@example.org`, pseudo })
    .returning();
  return a?.id ?? "";
}

// The War of the week on the server (docs/plan-guerre.md W4).
describe("the War of the week", () => {
  it("forms the flotillas, plays an assault round by round, keeps its result, gives the Prestige on Sunday", async () => {
    const theme = plancheTheme();
    const lagoons = await PlancheLagoons.open(database.db, theme, T0);
    const ana = await account("ana");
    const ben = await account("ben");
    const a = await lagoons.seatOf(ana, "Ca’ ana", T0);
    await lagoons.seatOf(ben, "Ca’ ben", T0);
    // Ana armed: a level of 10, three galleys.
    const h = a.store.hub.current().doc.state.houses[a.house];
    if (!h || !theme.board.maison) throw new Error("no house");
    h.level = 10;
    h.caps = maisonUnlocks(theme.board.maison, 10);
    h.fleet = {
      ships: [1, 2, 3].map((id) => ({ id, kind: "galere", level: 1 })),
      yards: [],
      next: 4,
    };
    const g = new GuerreHub(database.db, lagoons);
    const tue = T0 + DAY + 10 * HOUR;
    const v = await g.view(ana, a.store, a.house, tue);
    expect(v.phase).toBe("assauts");
    expect(v.ours).toHaveLength(6);
    expect(v.theirs).toHaveLength(6);
    expect(v.ours.some((p) => p.key === v.me)).toBe(true);
    expect(v.companies).toEqual({ us: null, them: null });
    expect(v.reserved).toEqual({});
    const target = v.theirs[0]?.key ?? "";
    expect(await g.start(ana, a.store, a.house, v.ours[1]?.key ?? "", tue)).toEqual({
      error: "guerre_not_foe",
    });
    const started = await g.start(ana, a.store, a.house, target, tue);
    if ("error" in started) throw new Error(started.error);
    // The ruses are hidden until they play.
    for (const p of Object.values(started.state.passes)) expect(p.ruse).toBeUndefined();
    // Leaving and coming back: the day is spent.
    expect(await g.start(ana, a.store, a.house, target, tue)).toEqual({ error: "guerre_today" });
    await g.round(ana, ana, { 1: "bouche", 2: "nord", 3: "sud" }, tue);
    await g.round(ana, ana, {}, tue);
    const end = await g.round(ana, ana, {}, tue);
    if ("error" in end) throw new Error(end.error);
    expect(end.result?.seals).toBeGreaterThanOrEqual(1);
    const [row] = await database.db.select().from(guerreAssaults);
    expect(row?.done).toBe(true);
    expect(row?.seals).toBe(end.result?.seals);
    const after = await g.view(ana, a.store, a.house, tue);
    expect(after.today).toBe(true);
    expect(after.score.us).toBe(end.result?.seals);
    // The ships sunk come home damaged.
    const ships = a.store.hub.current().doc.state.houses[a.house]?.fleet?.ships ?? [];
    expect(ships.filter((x) => x.damaged).map((x) => x.id)).toEqual(end.result?.damaged ?? []);
    // Carl comes on Wednesday: he joins the War in a computer's place, untouched.
    const carl = await account("carl");
    const c = await lagoons.seatOf(carl, "Ca’ carl", tue + DAY);
    const cv = await g.view(carl, c.store, c.house, tue + DAY);
    expect(cv.phase).toBe("assauts");
    expect([...cv.ours, ...cv.theirs].some((p) => p.key === cv.me)).toBe(true);
    expect(cv.theirs.length + cv.ours.length).toBe(12);
    // Sunday: the seals and the victory in Ana's week.
    const before = a.store.hub.current().doc.state.houses[a.house]?.maison?.week ?? 0;
    await g.settle(T0 + 6 * DAY + HOUR);
    await g.settle(T0 + 6 * DAY + 2 * HOUR);
    const week = a.store.hub.current().doc.state.houses[a.house]?.maison?.week ?? 0;
    expect(week - before).toBeGreaterThanOrEqual(20 * (end.result?.seals ?? 0));
  });

  it("lets a second player come on Thursday join the war the first one formed alone", async () => {
    const lagoons = await PlancheLagoons.open(database.db, plancheTheme(), T0);
    const ana = await account("ana");
    const a = await lagoons.seatOf(ana, "Ca’ ana", T0 + 3 * DAY + 17 * HOUR);
    const g = new GuerreHub(database.db, lagoons);
    const thu = T0 + 3 * DAY + 17 * HOUR;
    expect((await g.view(ana, a.store, a.house, thu)).phase).toBe("assauts");
    const ben = await account("ben");
    const b = await lagoons.seatOf(ben, "Ca’ ben", thu + HOUR);
    const v = await g.view(ben, b.store, b.house, thu + HOUR);
    expect(v.phase).toBe("assauts");
  });

  it("sends a company to the War together, under its name, its reserved ports told", async () => {
    const lagoons = await PlancheLagoons.open(database.db, plancheTheme(), T0);
    const ids = await Promise.all(["ana", "ben", "cyd"].map(account));
    const seats = [];
    for (const [k, id] of ids.entries()) seats.push(await lagoons.seatOf(id, `Ca’ ${k}`, T0));
    const [tana] = await database.db
      .insert(companies)
      .values({ name: "La Tana", code: "tana-code", createdAt: new Date(T0) })
      .returning();
    for (const id of ids.slice(0, 2))
      await database.db
        .insert(companyMembers)
        .values({ accountId: id, companyId: tana?.id ?? "", joinedAt: new Date(T0) });
    const g = new GuerreHub(database.db, lagoons);
    const tue = T0 + DAY + 10 * HOUR;
    const [a, b, c] = seats;
    if (!a || !b || !c) throw new Error("no seats");
    const v = await g.view(ids[0] ?? "", a.store, a.house, tue);
    expect(v.companies.us).toBe("La Tana");
    expect(v.ours.map((p) => p.key)).toContain(`${b.store.worldId}:${b.house}`);
    // The player alone is not in the company's flotilla.
    expect(v.ours.map((p) => p.key)).not.toContain(`${c.store.worldId}:${c.house}`);
  });
});
