import { type Command, freeBatches, hasPass } from "@comptoirs/engine";
import { and, eq, inArray, isNotNull, isNull, lt, or } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { AuthService, PublicAccount } from "../auth/service.js";
import type { Db } from "../db/client.js";
import { accounts, players, pushSubscriptions, telemetry } from "../db/schema.js";
import { NOTIFICATION_KINDS, type Notifier } from "../notify/notifier.js";
import { retention, suspiciousPairs } from "./admin.js";
import { PASS_PRICES, grantPass, passUntil, syncPass, upcomingPass } from "./pass.js";
import { priceHistory, profile } from "./profile.js";
import { markCeremonySeen, palmares, pendingCeremony, previousDoge } from "./season.js";
import { toJson } from "./serialize.js";
import { catalog, playerView, ranking } from "./view.js";
import { weeklyTable } from "./weekly.js";
import { WELCOME_AFTER_MS, welcomeBack } from "./welcome.js";
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
  z.object({ type: z.literal("collectAndRestart") }),
  z.object({ type: z.literal("claimMission"), missionId: z.string() }),
  z.object({ type: z.literal("claimDaily"), taskId: z.string() }),
  z.object({ type: z.literal("openBale") }),
  z.object({ type: z.literal("rerollContract"), contractId: z.string() }),
  z.object({
    type: z.literal("sellToCriee"),
    quantity: z.number().int().positive().max(10_000),
  }),
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
  z.object({ type: z.literal("joinFamily"), family: z.string() }),
  z.object({ type: z.literal("fulfillFamilyOrder"), orderId: z.string() }),
  z.object({ type: z.literal("patronize"), points: z.number().int().positive().max(10_000) }),
  z.object({
    type: z.literal("launchExpedition"),
    destination: z.string(),
    cargo: z.record(z.number().int().positive().max(100_000)),
    escort: z.boolean(),
    ships: z.array(z.string()).max(4).optional(),
  }),
  z.object({
    type: z.literal("limitOrder"),
    resource: z.string(),
    side: z.enum(["buy", "sell"]),
    price: z.string().regex(/^\d{1,12}$/),
    quantity: z.number().int().positive().max(100_000),
  }),
  z.object({ type: z.literal("cancelOrder"), orderId: z.string() }),
  z.object({ type: z.literal("buildShip"), shipType: z.string() }),
  z.object({ type: z.literal("repairShip"), shipId: z.string() }),
  z.object({
    type: z.literal("commissionPrivateers"),
    route: z.string(),
    ships: z.array(z.string()).min(1).max(4),
  }),
  z.object({ type: z.literal("collectRaid"), raidId: z.string() }),
  z.object({ type: z.literal("collectExpedition"), expeditionId: z.string() }),
  z.object({ type: z.literal("buyVehicle"), vehicleType: z.string() }),
  z.object({
    type: z.literal("dispatchDelivery"),
    orderId: z.string(),
    vehicleId: z.string(),
    escort: z.string(),
  }),
  z.object({ type: z.literal("reactToAmbush"), deliveryId: z.string() }),
  z.object({
    type: z.literal("postBand"),
    route: z.string(),
    hours: z.number().int().positive().max(48),
  }),
  z.object({ type: z.literal("collectBooty"), bandId: z.string() }),
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
  adminEmails: string[];
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

  /** Pseudos of the merchants met at sea (corsairs, victims, gazette). */
  async function namesFor(v: NonNullable<ReturnType<typeof playerView>>) {
    const ids = new Set<string>();
    for (const e of v.expeditions) if (e.boarding) ids.add(e.boarding.raider);
    for (const r of v.raids) for (const h of r.hits) ids.add(h.victimId);
    for (const n of v.seaNews) {
      ids.add(n.raider);
      ids.add(n.victim);
    }
    if (v.families) {
      for (const m of v.families.members) ids.add(m.playerId);
      for (const f of v.families.standings) if (f.champion) ids.add(f.champion);
    }
    for (const b of Object.values(v.book)) {
      for (const l of [...b.asks, ...b.bids]) if (l.by !== "market_maker") ids.add(l.by);
    }
    if (ids.size === 0) return { names: {}, bots: [] };
    const rows = await db
      .select({ id: accounts.id, pseudo: accounts.pseudo, bot: accounts.isBot })
      .from(accounts)
      .where(inArray(accounts.id, [...ids]));
    return {
      names: Object.fromEntries(rows.map((r) => [r.id, r.pseudo])),
      bots: rows.filter((r) => r.bot).map((r) => r.id),
    };
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
    return toJson({
      serverTime: now,
      view: v,
      upcomingPass: await upcomingPass(db, account.id, now),
      passPrices: PASS_PRICES,
      ...(v ? await namesFor(v) : { names: {}, bots: [] }),
      unread: v ? await notifier.unread(account.id) : 0,
    });
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

  app.get("/api/game/catalog", async () =>
    toJson({ ...catalog(world.ctx, world), previousDoge: await previousDoge(db, world.id) }),
  );

  app.get("/api/game", async (req, reply) => {
    const account = await requireAccount(req, reply);
    if (!account) return;
    let welcome = null;
    if (world.current.players[account.id]) {
      const [row] = await db
        .select({ lastSeenAt: players.lastSeenAt })
        .from(players)
        .where(and(eq(players.worldId, world.id), eq(players.accountId, account.id)));
      const now = world.now();
      if (row?.lastSeenAt && now - row.lastSeenAt.getTime() >= WELCOME_AFTER_MS) {
        welcome = await welcomeBack(
          db,
          world.id,
          world.ctx,
          world.current,
          account.id,
          row.lastSeenAt,
          now,
        );
      }
      await touch(account, req);
      await syncPass(db, world, account.id);
    }
    const body = (await view(account)) as Record<string, unknown>;
    const ceremony = await pendingCeremony(db, account.id);
    return {
      ...body,
      ...(welcome ? { welcome: toJson(welcome) } : {}),
      ...(ceremony ? { ceremony: toJson(ceremony) } : {}),
    };
  });

  /** The closing ceremony has been watched: it is not shown again. */
  app.post("/api/game/ceremony/seen", async (req, reply) => {
    const account = await requireAccount(req, reply);
    if (!account) return;
    const { worldId } = z.object({ worldId: z.string().uuid() }).parse(req.body);
    await markCeremonySeen(db, account.id, worldId, new Date(world.now()));
    return { ok: true };
  });

  /** Anyone's palmarès (pseudo, crest, renown, seasons, weeks): open to every player. */
  app.get("/api/game/palmares/:accountId", async (req, reply) => {
    const account = await requireAccount(req, reply);
    if (!account) return;
    const { accountId } = z.object({ accountId: z.string().uuid() }).parse(req.params);
    const [who] = await db
      .select({ pseudo: accounts.pseudo, crest: accounts.crest, bot: accounts.isBot })
      .from(accounts)
      .where(eq(accounts.id, accountId));
    if (!who) return reply.code(404).send({ error: "unknown_player" });
    return toJson({ ...who, palmares: await palmares(db, accountId) });
  });

  app.post("/api/game/join", async (req, reply) => {
    const account = await requireAccount(req, reply);
    if (!account) return;
    const { region } = z.object({ region: z.string() }).parse(req.body);
    const res = await world.execute({ type: "join", playerId: account.id, region });
    if (!res.ok) return reply.code(409).send({ error: res.error });
    await syncPass(db, world, account.id);
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
    if (a.type === "collectAndRestart") {
      await collectAndRestart(world, account.id);
      return view(account);
    }
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
    return toJson({
      account: { pseudo: account.pseudo, crest: account.crest },
      profile: p,
      palmares: await palmares(db, account.id),
    });
  });

  app.get("/api/game/prices", async (req, reply) => {
    const account = await requireAccount(req, reply);
    if (!account) return;
    // Pass Négociant: seven days of prices instead of two.
    const hours = hasPass(world.current, account.id, world.now()) ? 168 : 48;
    return { series: await priceHistory(db, world.id, world.now(), hours) };
  });

  app.get("/api/admin/retention", async (req, reply) => {
    const account = await requireAccount(req, reply);
    if (!account) return;
    if (!deps.adminEmails.includes(account.email.toLowerCase())) {
      return reply.code(403).send({ error: "forbidden" });
    }
    return retention(db, world.id, world.now());
  });

  /** Admin: pairs of people trading a lot with each other away from the reference price. */
  app.get("/api/admin/suspicious", async (req, reply) => {
    const account = await requireAccount(req, reply);
    if (!account) return;
    if (!deps.adminEmails.includes(account.email.toLowerCase())) {
      return reply.code(403).send({ error: "forbidden" });
    }
    return { pairs: await suspiciousPairs(db, world.id, world.ctx.settings.referencePrices) };
  });

  /** Admin: moves the end of the current season (to rehearse the closing on a test world). */
  app.post("/api/admin/season-end", async (req, reply) => {
    const account = await requireAccount(req, reply);
    if (!account) return;
    if (!deps.adminEmails.includes(account.email.toLowerCase())) {
      return reply.code(403).send({ error: "forbidden" });
    }
    const { endsAt } = z.object({ endsAt: z.string().datetime() }).parse(req.body);
    const at = Date.parse(endsAt);
    if (at <= world.now()) return reply.code(422).send({ error: "end_in_past" });
    await world.reschedule(at);
    return { ok: true, world: world.name, endsAt: at };
  });

  /** Admin: grants the Pass to an account for some days (tests, gifts, support). */
  app.post("/api/admin/pass", async (req, reply) => {
    const account = await requireAccount(req, reply);
    if (!account) return;
    if (!deps.adminEmails.includes(account.email.toLowerCase())) {
      return reply.code(403).send({ error: "forbidden" });
    }
    const body = z
      .object({ email: z.string().email(), days: z.number().int().positive().max(366) })
      .parse(req.body);
    const [target] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.email, body.email.toLowerCase()));
    if (!target) return reply.code(404).send({ error: "unknown_account" });
    const now = world.now();
    const from = Math.max(now, await passUntil(db, target.id, now));
    await grantPass(db, target.id, "admin", from, from + body.days * 86_400_000, account.email);
    await syncPass(db, world, target.id);
    return { ok: true, until: await passUntil(db, target.id, now) };
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
      id: playerId,
      me: playerId === account.id,
      pass: hasPass(world.current, playerId, world.now()),
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
      rows: table.slice(0, 50).map(({ playerId, ...rest }) => ({
        ...rest,
        id: playerId,
        me: playerId === account.id,
        pass: hasPass(world.current, playerId, world.now()),
      })),
      me: table.find((r) => r.playerId === account.id)?.rank ?? null,
      total: table.length,
    });
  });
}

/**
 * One tap for a short session: collect every workshop, then fill every queue with what the
 * stock allows (raw producers first). Saved as one transaction.
 */
async function collectAndRestart(world: GameWorld, playerId: string): Promise<void> {
  const { ctx } = world;
  const raw = (type: string) =>
    Object.keys(ctx.theme.recipes.find((r) => r.building === type)?.inputs ?? {}).length === 0;
  await world.batch(({ act, state, now }) => {
    const mine = () => Object.values(state().buildings).filter((b) => b.playerId === playerId);
    for (const b of mine()) if (b.job) act({ type: "collect", playerId, buildingId: b.id });
    const order = mine().sort((a, b) => Number(raw(b.type)) - Number(raw(a.type)));
    for (const { id } of order) {
      const b = state().buildings[id];
      const player = state().players[playerId];
      const recipe = b ? ctx.theme.recipes.find((r) => r.building === b.type) : undefined;
      if (!b || !player || !recipe) continue;
      let batches = freeBatches(ctx, b, recipe.code, now, player);
      const stock = state().inventories[playerId] ?? {};
      for (const [res, perBatch] of Object.entries(recipe.inputs)) {
        const need = (perBatch ?? 0) * b.level;
        if (need > 0) batches = Math.min(batches, Math.floor((stock[res]?.available ?? 0) / need));
      }
      if (batches > 0) {
        act({ type: "startProduction", playerId, buildingId: id, recipe: recipe.code, batches });
      }
    }
  }, playerId);
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
    case "claimMission":
      return [{ type: "claimMission", playerId, missionId: a.missionId }];
    case "claimDaily":
      return [{ type: "claimDaily", playerId, taskId: a.taskId }];
    case "openBale":
      return [{ type: "openBale", playerId }];
    case "sellToCriee":
      return [{ type: "sellToCriee", playerId, quantity: a.quantity }];
    case "rerollContract":
      return [{ type: "rerollContract", playerId, contractId: a.contractId }];
    case "collectAndRestart":
      return [];
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
    case "joinFamily":
      return [{ type: "joinFamily", playerId, family: a.family }];
    case "fulfillFamilyOrder":
      return [{ type: "fulfillFamilyOrder", playerId, orderId: a.orderId }];
    case "patronize":
      return [{ type: "patronize", playerId, points: a.points }];
    case "launchExpedition":
      return [
        {
          type: "launchExpedition",
          playerId,
          destination: a.destination,
          cargo: a.cargo,
          escort: a.escort,
          ships: a.ships,
        },
      ];
    case "limitOrder":
      return [
        {
          type: "placeOrder",
          playerId,
          resource: a.resource,
          side: a.side,
          kind: "limit",
          price: BigInt(a.price),
          quantity: a.quantity,
        },
      ];
    case "cancelOrder":
      return [{ type: "cancelOrder", playerId, orderId: a.orderId }];
    case "buildShip":
      return [{ type: "buildShip", playerId, shipType: a.shipType }];
    case "repairShip":
      return [{ type: "repairShip", playerId, shipId: a.shipId }];
    case "commissionPrivateers":
      return [{ type: "commissionPrivateers", playerId, route: a.route, ships: a.ships }];
    case "collectRaid":
      return [{ type: "collectRaid", playerId, raidId: a.raidId }];
    case "collectExpedition":
      return [{ type: "collectExpedition", playerId, expeditionId: a.expeditionId }];
    case "buyVehicle":
      return [{ type: "buyVehicle", playerId, vehicleType: a.vehicleType }];
    case "dispatchDelivery":
      return [
        {
          type: "dispatchDelivery",
          playerId,
          orderId: a.orderId,
          vehicleId: a.vehicleId,
          escort: a.escort,
        },
      ];
    case "reactToAmbush":
      return [{ type: "reactToAmbush", playerId, deliveryId: a.deliveryId }];
    case "postBand":
      return [{ type: "postBand", playerId, route: a.route, hours: a.hours }];
    case "collectBooty":
      return [{ type: "collectBooty", playerId, bandId: a.bandId }];
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
