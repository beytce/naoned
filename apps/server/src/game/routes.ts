import type { Command } from "@comptoirs/engine";
import { and, eq, inArray, isNotNull, isNull, lt, or } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { AuthService, PublicAccount } from "../auth/service.js";
import type { Db } from "../db/client.js";
import { accounts, players, pushSubscriptions, telemetry } from "../db/schema.js";
import { NOTIFICATION_KINDS, type Notifier } from "../notify/notifier.js";
import { priceHistory, profile } from "./profile.js";
import { toJson } from "./serialize.js";
import { catalog, playerView, ranking } from "./view.js";
import { weeklyTable } from "./weekly.js";
import type { GameWorld } from "./world.js";

/** A visit after this much inactivity counts as a new session (KPI: sessions per day). */
const SESSION_GAP_MS = 30 * 60_000;

const action = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("startProduction"),
    buildingId: z.string(),
    batches: z.number().int().positive().max(100),
  }),
  z.object({ type: z.literal("collect"), buildingId: z.string() }),
  z.object({ type: z.literal("collectAll") }),
  z.object({ type: z.literal("build"), buildingType: z.string() }),
  z.object({ type: z.literal("upgrade"), buildingId: z.string() }),
  z.object({
    type: z.literal("instantOrder"),
    resource: z.string(),
    side: z.enum(["buy", "sell"]),
    quantity: z.number().int().positive().max(100_000),
  }),
  z.object({
    type: z.literal("sellToCity"),
    city: z.string(),
    resource: z.string(),
    quantity: z.number().int().positive().max(10_000),
  }),
  z.object({ type: z.literal("fulfillContract"), contractId: z.string() }),
  z.object({
    type: z.literal("launchExpedition"),
    destination: z.string(),
    cargo: z.record(z.number().int().positive().max(100_000)),
    escort: z.boolean(),
  }),
  z.object({ type: z.literal("collectExpedition"), expeditionId: z.string() }),
  z.object({
    type: z.literal("deliverToProject"),
    projectId: z.string(),
    resource: z.string(),
    quantity: z.number().int().positive().max(100_000),
  }),
]);
type Action = z.infer<typeof action>;

export interface GameRouteDeps {
  db: Db;
  world: GameWorld;
  auth: AuthService;
  sessionCookie: string;
  notifier: Notifier;
}

export function registerGameRoutes(app: FastifyInstance, deps: GameRouteDeps): void {
  const { db, world, auth, notifier } = deps;

  async function requireAccount(req: FastifyRequest, reply: FastifyReply) {
    const account = await auth.accountForSession(req.cookies[deps.sessionCookie]);
    if (!account) {
      reply.code(401).send({ error: "unauthenticated" });
      return null;
    }
    return account;
  }

  async function tutorialOf(accountId: string): Promise<string[]> {
    const [row] = await db
      .select({ steps: players.tutorialSteps })
      .from(players)
      .where(and(eq(players.worldId, world.id), eq(players.accountId, accountId)));
    return row?.steps ?? [];
  }

  /** Bots that stepped aside: out of the rankings. */
  async function retiredBots(): Promise<Set<string>> {
    const rows = await db
      .select({ id: players.accountId })
      .from(players)
      .where(and(eq(players.worldId, world.id), isNotNull(players.retiredAt)));
    return new Set(rows.map((r) => r.id));
  }

  async function view(account: PublicAccount) {
    const now = world.now();
    const v = playerView(
      world.ctx,
      world.current,
      account.id,
      now,
      await tutorialOf(account.id),
      await retiredBots(),
    );
    return toJson({ serverTime: now, view: v, unread: v ? await notifier.unread(account.id) : 0 });
  }

  /** Counts a new session when the player comes back after a pause. */
  async function touch(account: PublicAccount, req: FastifyRequest) {
    const now = new Date(world.now());
    const cutoff = new Date(now.getTime() - SESSION_GAP_MS);
    const touched = await db
      .update(players)
      .set({ lastSeenAt: now })
      .where(
        and(
          eq(players.worldId, world.id),
          eq(players.accountId, account.id),
          or(isNull(players.lastSeenAt), lt(players.lastSeenAt, cutoff)),
        ),
      )
      .returning({ accountId: players.accountId });
    if (touched.length > 0) {
      const ua = req.headers["user-agent"] ?? "";
      await db.insert(telemetry).values({
        accountId: account.id,
        worldId: world.id,
        type: "session_start",
        at: now,
        props: { mobile: /Mobi|Android|iPhone|iPad/i.test(ua) },
      });
    } else {
      await db
        .update(players)
        .set({ lastSeenAt: now })
        .where(and(eq(players.worldId, world.id), eq(players.accountId, account.id)));
    }
  }

  app.get("/api/game/catalog", async () => toJson(catalog(world.ctx, world)));

  app.get("/api/game", async (req, reply) => {
    const account = await requireAccount(req, reply);
    if (!account) return;
    if (world.current.players[account.id]) await touch(account, req);
    return view(account);
  });

  app.post("/api/game/join", async (req, reply) => {
    const account = await requireAccount(req, reply);
    if (!account) return;
    const { region } = z.object({ region: z.string() }).parse(req.body);
    const res = await world.execute({ type: "join", playerId: account.id, region });
    if (!res.ok) return reply.code(409).send({ error: res.error });
    return view(account);
  });

  app.post("/api/game/reset", async (req, reply) => {
    const account = await requireAccount(req, reply);
    if (!account) return;
    const res = await world.execute({ type: "resetPlayer", playerId: account.id });
    if (!res.ok) return reply.code(409).send({ error: res.error });
    return view(account);
  });

  app.post("/api/game/actions", async (req, reply) => {
    const account = await requireAccount(req, reply);
    if (!account) return;
    if (!world.current.players[account.id]) return reply.code(409).send({ error: "not_joined" });
    const a = action.parse(req.body);
    const commands = toCommands(a, account.id, world);
    let error: string | undefined;
    for (const cmd of commands) {
      const res = await world.execute(cmd);
      if (!res.ok) {
        error = res.error;
        break;
      }
    }
    if (error) return reply.code(422).send({ error, ...((await view(account)) as object) });
    return view(account);
  });

  async function rankingTable() {
    const ids = Object.keys(world.current.players);
    const rows =
      ids.length === 0
        ? []
        : await db
            .select({
              id: accounts.id,
              pseudo: accounts.pseudo,
              crest: accounts.crest,
              bot: accounts.isBot,
            })
            .from(accounts)
            .where(inArray(accounts.id, ids));
    const pseudos = new Map(rows.map((r) => [r.id, r.pseudo]));
    const crests = new Map(rows.map((r) => [r.id, r.crest]));
    const bots = new Set(rows.filter((r) => r.bot).map((r) => r.id));
    const hidden = await retiredBots();
    return ranking(world.ctx, world.current, world.now(), pseudos, hidden).map((r) => ({
      ...r,
      crest: crests.get(r.playerId) ?? null,
      bot: bots.has(r.playerId),
    }));
  }

  app.get("/api/game/profile", async (req, reply) => {
    const account = await requireAccount(req, reply);
    if (!account) return;
    const table = await rankingTable();
    const me = table.find((r) => r.playerId === account.id);
    const p = await profile(db, world.id, world.ctx, world.current, account.id, world.now(), {
      rank: me?.rank ?? null,
      total: table.length,
    });
    if (!p) return reply.code(409).send({ error: "not_joined" });
    return toJson({ account: { pseudo: account.pseudo, crest: account.crest }, profile: p });
  });

  app.get("/api/game/prices", async (req, reply) => {
    const account = await requireAccount(req, reply);
    if (!account) return;
    return { series: await priceHistory(db, world.id, world.now()) };
  });

  app.get("/api/notifications", async (req, reply) => {
    const account = await requireAccount(req, reply);
    if (!account) return;
    return toJson(await notifier.list(account.id));
  });

  app.post("/api/notifications/read", async (req, reply) => {
    const account = await requireAccount(req, reply);
    if (!account) return;
    await notifier.markRead(account.id);
    return { ok: true };
  });

  /** Push settings: VAPID public key, whether this device is subscribed, kinds turned off. */
  app.get("/api/notifications/push", async (req, reply) => {
    const account = await requireAccount(req, reply);
    if (!account) return;
    const [row] = await db
      .select({ off: accounts.pushOff })
      .from(accounts)
      .where(eq(accounts.id, account.id));
    return {
      publicKey: notifier.publicKey,
      kinds: NOTIFICATION_KINDS,
      off: row?.off ?? [],
    };
  });

  app.patch("/api/notifications/push", async (req, reply) => {
    const account = await requireAccount(req, reply);
    if (!account) return;
    const { off } = z.object({ off: z.array(z.enum(NOTIFICATION_KINDS)) }).parse(req.body);
    await db.update(accounts).set({ pushOff: off }).where(eq(accounts.id, account.id));
    return { off };
  });

  app.post("/api/notifications/push/subscribe", async (req, reply) => {
    const account = await requireAccount(req, reply);
    if (!account) return;
    const sub = z
      .object({
        endpoint: z.string().url().max(2000),
        keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }),
      })
      .parse(req.body);
    const values = {
      endpoint: sub.endpoint,
      accountId: account.id,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      createdAt: new Date(world.now()),
    };
    await db
      .insert(pushSubscriptions)
      .values(values)
      .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: values });
    return { ok: true };
  });

  app.post("/api/notifications/push/unsubscribe", async (req, reply) => {
    const account = await requireAccount(req, reply);
    if (!account) return;
    const { endpoint } = z.object({ endpoint: z.string() }).parse(req.body);
    await db
      .delete(pushSubscriptions)
      .where(
        and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.accountId, account.id)),
      );
    return { ok: true };
  });

  app.get("/api/game/ranking/week", async (req, reply) => {
    const account = await requireAccount(req, reply);
    if (!account) return;
    const table = await weeklyTable(db, world.id, world.ctx, world.current, world.now());
    const me = table.rows.find((r) => r.playerId === account.id);
    const strip = ({ playerId, ...rest }: (typeof table.rows)[number]) => ({
      ...rest,
      me: playerId === account.id,
    });
    return toJson({
      week: table.week,
      endsAt: table.endsAt,
      rows: table.rows.slice(0, 50).map(strip),
      me: me ? strip(me) : null,
      total: table.rows.length,
      lastWeek: table.lastWeek,
    });
  });

  app.get("/api/game/ranking", async (req, reply) => {
    const account = await requireAccount(req, reply);
    if (!account) return;
    const table = await rankingTable();
    return toJson({
      rows: table
        .slice(0, 50)
        .map(({ playerId, ...rest }) => ({ ...rest, me: playerId === account.id })),
      me: table.find((r) => r.playerId === account.id)?.rank ?? null,
      total: table.length,
    });
  });
}

/** Turns a client action into engine commands, always for the logged-in player. */
function toCommands(a: Action, playerId: string, world: GameWorld): Command[] {
  switch (a.type) {
    case "startProduction": {
      const building = world.current.buildings[a.buildingId];
      const recipe = building
        ? world.ctx.theme.recipes.find((r) => r.building === building.type)
        : undefined;
      return [
        {
          type: "startProduction",
          playerId,
          buildingId: a.buildingId,
          recipe: recipe?.code ?? "",
          batches: a.batches,
        },
      ];
    }
    case "collect":
      return [{ type: "collect", playerId, buildingId: a.buildingId }];
    case "collectAll":
      return Object.values(world.current.buildings)
        .filter((b) => b.playerId === playerId && b.job)
        .map((b) => ({ type: "collect" as const, playerId, buildingId: b.id }));
    case "build":
      return [{ type: "build", playerId, buildingType: a.buildingType }];
    case "upgrade":
      return [{ type: "upgrade", playerId, buildingId: a.buildingId }];
    case "instantOrder":
      return [
        {
          type: "placeOrder",
          playerId,
          resource: a.resource,
          side: a.side,
          kind: "instant",
          quantity: a.quantity,
        },
      ];
    case "sellToCity":
      return [
        { type: "sellToCity", playerId, city: a.city, resource: a.resource, quantity: a.quantity },
      ];
    case "fulfillContract":
      return [{ type: "fulfillContract", playerId, contractId: a.contractId }];
    case "launchExpedition":
      return [
        {
          type: "launchExpedition",
          playerId,
          destination: a.destination,
          cargo: a.cargo,
          escort: a.escort,
        },
      ];
    case "collectExpedition":
      return [{ type: "collectExpedition", playerId, expeditionId: a.expeditionId }];
    case "deliverToProject":
      return [
        {
          type: "deliverToProject",
          playerId,
          projectId: a.projectId,
          resource: a.resource,
          quantity: a.quantity,
        },
      ];
  }
}
