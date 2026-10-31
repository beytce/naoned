import type { EmpireSettings } from "@comptoirs/engine";
import { regionCells, venice1450Empire } from "@comptoirs/engine";
import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SESSION_COOKIE, buildApp } from "../src/app.js";
import { type Database, openDatabase } from "../src/db/client.js";
import { PortaHub } from "../src/game/porta.js";
import { GameWorld } from "../src/game/world.js";
import { MemoryMailer } from "../src/mail/mailer.js";
import { testDatabase } from "./db.js";

// The Porta's live battles (docs/plan-porta.md § 7), on PGlite, the hub driven by the test.
let database: Database;
let dbUrl: string;
let dropDb: () => Promise<void>;
let app: FastifyInstance;
let mailer: MemoryMailer;
let world: GameWorld;
let hub: PortaHub;
let now: number;

const MIN = 60_000;
const porta = venice1450Empire.porta as NonNullable<typeof venice1450Empire.porta>;
const override = {
  empire: {
    start: { capitalDucats: 100_000 },
    map: { depot: { costDucats: 1, casa: 1, minutes: 1 } },
    porta: {
      building: { ...porta.building, casa: 1, costDucats: 1, minutes: 1 },
      models: { cavaliere: { ...porta.models?.cavaliere, casa: 1 } },
      components: { lances: { ...porta.components?.lances, casa: 1 } },
      tiers: (porta.tiers ?? []).map((t) => ({ ...t, breadPerVehicle: 0 })),
    },
  },
};

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
    sql`truncate accounts, login_tokens, sessions, worlds, telemetry cascade`,
  );
  mailer = new MemoryMailer();
  now = Date.parse("2026-10-26T08:00:00Z");
  world = await GameWorld.open(database.db, () => now, {
    empire: true,
    settingsOverride: override,
  });
  hub = new PortaHub(world);
  app = await buildApp({
    db: database.db,
    mailer,
    appUrl: "https://fondaco.test",
    production: false,
    world,
    porta: hub,
    now: () => new Date(now),
  });
});

afterEach(async () => {
  await app.close();
  await database.close();
});

async function login(email: string): Promise<{ cookie: string; id: string }> {
  await app.inject({ method: "POST", url: "/api/auth/request", payload: { email } });
  const token = decodeURIComponent(mailer.sent.at(-1)?.text.match(/token=([\w%-]+)/)?.[1] ?? "");
  const res = await app.inject({ method: "POST", url: "/api/auth/verify", payload: { token } });
  const c = res.cookies.find((x) => x.name === SESSION_COOKIE);
  const cookie = `${SESSION_COOKIE}=${c?.value}`;
  await app.inject({
    method: "PATCH",
    url: "/api/me",
    headers: { cookie },
    payload: { pseudo: email.split("@")[0] },
  });
  await post(cookie, "/api/empire/join");
  const id = Object.keys(world.current.empire?.houses ?? {}).find((k) => !known.has(k)) as string;
  known.add(id);
  return { cookie, id };
}
const known = new Set<string>();

const post = (cookie: string, url: string, payload: unknown = {}) =>
  app.inject({ method: "POST", url, headers: { cookie }, payload: payload as object });
const act = async (cookie: string, payload: unknown) => {
  const res = await post(cookie, "/api/empire/actions", payload);
  if (res.statusCode !== 200) throw new Error(`${JSON.stringify(payload)}: ${res.body}`);
};
const s = () => world.ctx.settings.empire as EmpireSettings;
const house = (id: string) => world.current.empire?.houses[id];

/** A merchant with the Remise and the Porta, a rider with lances and a mule docked there. */
async function armed(email: string) {
  const m = await login(email);
  const cells = regionCells(s(), "veneto");
  for (const cell of cells) {
    const res = await post(m.cookie, "/api/empire/actions", { type: "empireBuildDepot", cell });
    if (res.statusCode === 200) break;
  }
  now += 2 * MIN;
  for (const cell of cells) {
    if (cell === house(m.id)?.depot) continue;
    const res = await post(m.cookie, "/api/empire/actions", { type: "empireBuildPorta", cell });
    if (res.statusCode === 200) break;
  }
  now += 2 * MIN;
  await act(m.cookie, { type: "empireBuyArm", model: "cavaliere" });
  await act(m.cookie, { type: "empireBuyComponent", code: "lances" });
  const h = house(m.id);
  const combatId = h?.arms?.vehicles[0]?.id ?? "";
  const transportId = h?.vehicles?.[0]?.id ?? "";
  const lances = h?.arms?.components[0]?.id ?? "";
  await act(m.cookie, { type: "empireFitArm", vehicleId: combatId, slot: 0, componentId: lances });
  await act(m.cookie, { type: "empireSendToPorta", vehicleIds: [combatId, transportId] });
  now += 60 * MIN;
  return { ...m, combatId, transportId };
}

/** Real time passes, the hub beating every second of it. */
async function play(ms: number) {
  for (let t = 0; t < ms; t += 1_000) {
    now += 1_000;
    await hub.tick();
  }
}

describe("a battle alone", () => {
  it("starts at once, enters the house's vehicles, and loses them left inside at the closing", async () => {
    const a = await armed("ada@example.org");
    const res = await post(a.cookie, "/api/empire/porta/queue", {
      mode: "solo",
      tier: 1,
      combatId: a.combatId,
      transportId: a.transportId,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().battle).toMatchObject({ tier: 1, timeMs: 0 });
    expect(house(a.id)?.porta?.battle).toBeDefined();
    // Orders come by their route; a stranger's unit is refused.
    expect(
      (await post(a.cookie, "/api/empire/porta/order", { type: "stop", unitId: "nope" }))
        .statusCode,
    ).toBe(422);
    await play(11 * MIN);
    expect(house(a.id)?.porta?.battle).toBeUndefined();
    expect(house(a.id)?.arms?.vehicles).toEqual([]);
    expect(house(a.id)?.vehicles?.some((v) => v.id === a.transportId)).toBe(false);
    expect(hub.stateOf(a.id)).toEqual({ lobby: null, battle: null });
  });

  it("settles a player who leaves by the gate at once, his vehicles kept at the Porta", async () => {
    const a = await armed("ada@example.org");
    await hub.queue(a.id, { tier: 1, combatId: a.combatId, transportId: a.transportId }, "solo");
    const battle = hub.stateOf(a.id).battle;
    const mine = battle?.units.filter((u) => u.side === "player") ?? [];
    for (const u of mine)
      expect(
        (await post(a.cookie, "/api/empire/porta/order", { type: "leave", unitId: u.id }))
          .statusCode,
      ).toBe(200);
    await play(1_000);
    expect(house(a.id)?.porta?.battle).toBeUndefined();
    expect(house(a.id)?.arms?.vehicles).toHaveLength(1);
    expect(house(a.id)?.porta?.best).toBe(0);
  });

  it("refuses a tier not open, and gives nothing away", async () => {
    const a = await armed("ada@example.org");
    const res = await post(a.cookie, "/api/empire/porta/queue", {
      mode: "solo",
      tier: 2,
      combatId: a.combatId,
      transportId: a.transportId,
    });
    expect(res.statusCode).toBe(422);
    expect(res.json().error).toBe("requirement_unmet");
    expect(house(a.id)?.porta?.battle).toBeUndefined();
  });
});

describe("a battle together", () => {
  it("starts a public lobby of the tier and band after its wait, with whoever came", async () => {
    const a = await armed("ada@example.org");
    const b = await armed("bea@example.org");
    const ra = await hub.queue(
      a.id,
      { tier: 1, combatId: a.combatId, transportId: a.transportId },
      "public",
    );
    const rb = await hub.queue(
      b.id,
      { tier: 1, combatId: b.combatId, transportId: b.transportId },
      "public",
    );
    expect("lobby" in ra && "lobby" in rb && ra.lobby?.id === rb.lobby?.id).toBe(true);
    expect(hub.stateOf(a.id).lobby?.players).toBe(2);
    await play(2 * MIN);
    const battle = hub.stateOf(a.id).battle;
    expect(battle?.units.filter((u) => u.side === "player")).toHaveLength(4);
    expect(hub.stateOf(b.id).battle?.id).toBe(battle?.id);
  });

  it("lets a player of a public lobby go alone at once", async () => {
    const a = await armed("ada@example.org");
    await hub.queue(a.id, { tier: 1, combatId: a.combatId, transportId: a.transportId }, "public");
    const res = await post(a.cookie, "/api/empire/porta/launch");
    expect(res.statusCode).toBe(200);
    expect(
      res.json().battle?.units.filter((u: { side: string }) => u.side === "player"),
    ).toHaveLength(2);
  });

  it("opens a private lobby by its code, joined by a partner, launched by its owner", async () => {
    const a = await armed("ada@example.org");
    const b = await armed("bea@example.org");
    const opened = await post(a.cookie, "/api/empire/porta/queue", {
      mode: "invite",
      tier: 1,
      combatId: a.combatId,
      transportId: a.transportId,
    });
    const code = opened.json().lobby.code as string;
    expect(code).toMatch(/^\d{6}$/);
    await post(b.cookie, "/api/empire/porta/join", {
      code,
      combatId: b.combatId,
      transportId: b.transportId,
    });
    expect((await post(b.cookie, "/api/empire/porta/launch")).json().error).toBe("not_owner");
    const res = await post(a.cookie, "/api/empire/porta/launch");
    expect(
      res.json().battle?.units.filter((u: { side: string }) => u.side === "player"),
    ).toHaveLength(4);
  });
});

describe("the battle's socket", () => {
  it("pushes the player's snapshot at each beat: his relics only, Rome's minds, his components", async () => {
    const a = await armed("ada@example.org");
    const sent: string[] = [];
    hub.subscribe(a.id, { readyState: 1, send: (d) => sent.push(d), on: () => undefined });
    await hub.queue(a.id, { tier: 1, combatId: a.combatId, transportId: a.transportId }, "solo");
    await play(1_000);
    const last = JSON.parse(sent.at(-1) ?? "{}");
    expect(last.type).toBe("battle");
    expect(last.battle.timeMs).toBe(1_000);
    const rome = last.battle.units.find((u: { side: string }) => u.side === "rome");
    expect(rome).toMatchObject({ state: expect.any(String), visionCenti: expect.any(Number) });
    const mine = last.battle.units.find((u: { role?: string }) => u.role === "combat");
    expect(mine).toMatchObject({ mine: true, weapons: [{ effect: "lances" }] });
    expect(Object.keys(last.battle.cities[0].relics)).toEqual([
      "common",
      "rare",
      "precious",
      "legendary",
    ]);
  });
});

describe("a restart", () => {
  it("undoes the battles it cut short", async () => {
    const a = await armed("ada@example.org");
    await hub.queue(a.id, { tier: 1, combatId: a.combatId, transportId: a.transportId }, "solo");
    expect(house(a.id)?.porta?.battle).toBeDefined();
    await new PortaHub(world).recover();
    expect(house(a.id)?.porta?.battle).toBeUndefined();
    expect(house(a.id)?.arms?.vehicles).toHaveLength(1);
  });
});

describe("the week's ranking", () => {
  it("ranks the band's houses by the points of the relics sold", async () => {
    const a = await armed("ada@example.org");
    await hub.queue(a.id, { tier: 1, combatId: a.combatId, transportId: a.transportId }, "solo");
    const battleId = house(a.id)?.porta?.battle?.id ?? "";
    // As if the battle had brought out a rare relic.
    await world.execute({
      type: "empirePortaSettle",
      playerId: a.id,
      battleId,
      outcome: { vehicles: [], relics: ["rare"], won: true },
    });
    await act(a.cookie, { type: "empireSellRelics", rarity: "rare", qty: 1 });
    const res = await app.inject({
      method: "GET",
      url: "/api/empire/porta",
      headers: { cookie: a.cookie },
    });
    expect(res.json().ranking).toMatchObject({
      lines: [{ rank: 1, pseudo: "ada", points: 3, me: true }],
      mine: { rank: 1, points: 3 },
    });
  });
});
