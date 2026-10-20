import { type Command, freeBatches, hasPass, isNation, rushCost } from "@comptoirs/engine";
import { and, desc, eq, inArray, isNotNull, isNull, lt, or } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { AuthService, PublicAccount } from "../auth/service.js";
import type { Db } from "../db/client.js";
import { accounts, players, pushSubscriptions, telemetry } from "../db/schema.js";
import { NOTIFICATION_KINDS, type NotificationKind, type Notifier } from "../notify/notifier.js";
import { isPushEndpoint } from "../notify/push.js";
import { retention, suspiciousPairs } from "./admin.js";
import { bankReport, ledgerCsv } from "./bank.js";
import {
  ChatError,
  familyThread,
  hideMessage,
  latestMessageAt,
  postMessage,
  reportMessage,
  reportedMessages,
} from "./familyChat.js";
import {
  HouseRefused,
  balanceOf,
  buyPatent,
  holdersOf,
  houseOf,
  patentsFor,
  refundInfluence,
  spendInfluence,
} from "./house.js";
import { journal } from "./journal.js";
import { levelsOf } from "./level.js";
import { LiveHub } from "./live.js";
import { PASS_PRICES, grantPass, passUntil, syncPass, upcomingPass } from "./pass.js";
import { priceHistory, profile } from "./profile.js";
import { markCeremonySeen, palmares, pendingCeremony, previousDoge } from "./season.js";
import { toJson } from "./serialize.js";
import { terraView } from "./terra.js";
import { catalog, playerView, ranking } from "./view.js";
import { weeklyRival, weeklyTable } from "./weekly.js";
import { WELCOME_AFTER_MS, welcomeBack } from "./welcome.js";
import type { GameWorld } from "./world.js";

/** A visit after this much inactivity counts as a new session (KPI: sessions per day). */
const SESSION_GAP_MS = 30 * 60_000;
/** Devices a person receives pushes on (phones, computers). */
const PUSH_DEVICES_MAX = 10;

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
  z.object({ type: z.literal("chooseSpecialty"), specialty: z.string() }),
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
  z.object({ type: z.literal("joinFamily"), family: z.string().max(32) }),
  z.object({ type: z.literal("collectLevy") }),
  z.object({ type: z.literal("hireLances"), count: z.number().int().positive().max(1_000) }),
  z.object({ type: z.literal("buildWork"), land: z.string().max(32), kind: z.string().max(32) }),
  z.object({
    type: z.literal("sendMarch"),
    land: z.string().max(32),
    lances: z.number().int().positive().max(100_000),
  }),
  z.object({
    type: z.literal("joinMarch"),
    marchId: z.string().max(32),
    lances: z.number().int().positive().max(100_000),
  }),
  z.object({
    type: z.literal("voteProgramme"),
    picks: z
      .array(z.object({ code: z.string().max(32), target: z.string().max(32).optional() }))
      .min(1)
      .max(4),
  }),
  z.object({
    type: z.literal("limitOrder"),
    resource: z.string(),
    side: z.enum(["buy", "sell"]),
    price: z.string().regex(/^\d{1,12}$/),
    quantity: z.number().int().positive().max(100_000),
  }),
  z.object({ type: z.literal("cancelOrder"), orderId: z.string() }),
  z.object({ type: z.literal("buyVehicle"), vehicleType: z.string() }),
  z.object({ type: z.literal("upgradeVehicle"), vehicleId: z.string() }),
  z.object({
    type: z.literal("dispatchDelivery"),
    orderId: z.string(),
    /** Several orders for the same city, carried together. */
    orderIds: z.array(z.string()).min(1).max(8).optional(),
    vehicleId: z.string(),
    /** Older clients still send an escort: there are none any more. */
    escort: z.string().optional(),
    /** Older clients may still ask for the second counter: there is none any more. */
    from: z.literal("second").optional(),
  }),
  z.object({ type: z.literal("claimHouseMission"), missionId: z.string().max(32) }),
  // The Terraferma (docs/plan-terraferme.md): live only once the world's settings switch it on.
  z.object({ type: z.literal("terraPlace"), cell: z.number().int().nonnegative() }),
  z.object({
    type: z.literal("terraFront"),
    aim: z.number().int().nonnegative(),
    shareBps: z.number().int().min(1).max(10_000),
  }),
  z.object({ type: z.literal("terraRecall"), frontId: z.string().max(32) }),
  z.object({ type: z.literal("terraAlly"), other: z.string().uuid() }),
  z.object({ type: z.literal("terraAccept"), from: z.string().uuid() }),
  z.object({ type: z.literal("terraBreak"), other: z.string().uuid() }),
  z.object({
    type: z.literal("terraSend"),
    to: z.string().uuid(),
    count: z.number().int().positive().max(100_000),
  }),
  z.object({
    type: z.literal("terraBuild"),
    cell: z.number().int().nonnegative(),
    kind: z.enum(["rocca", "borgo", "porto"]),
  }),
  z.object({ type: z.literal("terraRaise") }),
  z.object({
    type: z.literal("terraSail"),
    aim: z.number().int().nonnegative(),
    shareBps: z.number().int().min(0).max(10_000),
  }),
  z.object({
    type: z.literal("terraPeasants"),
    shareBps: z.number().int().min(0).max(10_000),
  }),
  z.object({
    type: z.literal("terraDecree"),
    code: z.string().max(32),
    target: z.string().max(32).optional(),
  }),
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
  /** The players' community (null: none). */
  communityUrl?: string | null;
}

export function registerGameRoutes(app: FastifyInstance, deps: GameRouteDeps): void {
  const { db, world, auth, notifier } = deps;
  /** A merchant's pace: far above anyone's taps, low enough that no script floods the world. */
  const perMerchant = (max: number) => ({
    config: {
      rateLimit: {
        max,
        timeWindow: "1 minute",
        keyGenerator: (req: FastifyRequest) => req.cookies[deps.sessionCookie] ?? req.ip,
      },
    },
  });

  // Push: the open games hear when to fetch their view again (polling stays as a fallback).
  const live = new LiveHub();
  live.start();
  world.onEffects((fx, _now, saved) => live.onEffects(fx, saved.version, saved.tick));
  app.addHook("onClose", async () => live.stop());
  app.get("/api/live", { websocket: true }, async (socket, req) => {
    const account = await auth.accountForSession(req.cookies[deps.sessionCookie]);
    if (!account) {
      socket.close(4401, "unauthenticated");
      return;
    }
    live.add(account.id, socket);
    // Ignored: the game only listens.
    socket.on("message", () => undefined);
  });

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

  /** Pseudos of the merchants the player meets (family, order book, the board). */
  async function namesFor(v: NonNullable<ReturnType<typeof playerView>>) {
    const ids = new Set<string>();
    // The family: its members, the captains of past weeks, who opened the marches.
    for (const m of v.families?.members ?? []) ids.add(m.playerId);
    for (const h of v.families?.history ?? [])
      for (const id of Object.values(h.captains)) ids.add(id);
    for (const m of v.families?.marches ?? []) if (m.by) ids.add(m.by);
    for (const b of Object.values(v.book)) {
      for (const l of [...b.asks, ...b.bids]) if (l.by !== "market_maker") ids.add(l.by);
    }
    // Shared demand: who took the orders of the board.
    for (const o of v.road?.orders ?? []) if (o.takenBy) ids.add(o.takenBy);
    for (const t of v.road?.boardNews ?? []) ids.add(t.playerId);
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
      /** The world's saved version the view was built from: a push older than it is stale. */
      version: world.savedVersion,
      view: v,
      // The Pass is off until it comes back: nothing to show but its announcement.
      ...(world.ctx.settings.pass.enabled
        ? { upcomingPass: await upcomingPass(db, account.id, now), passPrices: PASS_PRICES }
        : {}),
      ...(v ? await namesFor(v) : { names: {}, bots: [] }),
      unread: v ? await notifier.unread(account.id) : 0,
      level: (await levelsOf(db, world.current, [account.id])).get(account.id),
      familyLatestAt: v ? await latestMessageAt(db, world, account.id) : null,
      // The house's Influence, under the ducats (worlds with the house only).
      ...(world.ctx.settings.house
        ? { influence: (await balanceOf(db, account.id)).influence }
        : {}),
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
    toJson({
      ...catalog(world.ctx, world),
      previousDoge: await previousDoge(db, world.id),
      community: deps.communityUrl ?? null,
    }),
  );

  app.get("/api/game", perMerchant(300), async (req, reply) => {
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
    const ceremony = await pendingCeremony(db, account.id, world.ctx.settings.pass.enabled);
    const rival = world.current.players[account.id]
      ? await weeklyRival(db, world.id, world.ctx, world.current, world.now(), account.id)
      : null;
    return {
      ...body,
      rival: rival ? toJson(rival) : null,
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
    return toJson({
      ...who,
      level: (await levelsOf(db, world.current, [accountId])).get(accountId),
      palmares: await palmares(db, accountId),
    });
  });

  app.post("/api/game/join", perMerchant(30), async (req, reply) => {
    const account = await requireAccount(req, reply);
    if (!account) return;
    const { region } = z.object({ region: z.string() }).parse(req.body);
    const patents = await patentsFor(db, world.ctx.settings, account.id);
    const res = await world.execute({
      type: "join",
      playerId: account.id,
      region,
      ...(patents.length > 0 ? { patents } : {}),
    });
    if (!res.ok) return reply.code(409).send({ error: res.error });
    await syncPass(db, world, account.id);
    return view(account);
  });

  app.post("/api/game/reset", perMerchant(30), async (req, reply) => {
    const account = await requireAccount(req, reply);
    if (!account) return;
    const res = await world.execute({ type: "resetPlayer", playerId: account.id });
    if (!res.ok) return reply.code(409).send({ error: res.error });
    return view(account);
  });

  app.post("/api/game/actions", perMerchant(300), async (req, reply) => {
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
    const levels = await levelsOf(db, world.current, ids);
    const gilded = await holdersOf(db, ids, "gilded_name");
    return ranking(world.ctx, world.current, world.now(), pseudos, hidden).map((r) => ({
      ...r,
      crest: crests.get(r.playerId) ?? null,
      bot: bots.has(r.playerId),
      level: levels.get(r.playerId)?.level ?? 1,
      // A cosmetic bought with Influence.
      gilded: gilded.has(r.playerId),
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
      level: (await levelsOf(db, world.current, [account.id])).get(account.id),
      palmares: await palmares(db, account.id),
    });
  });

  /** The Rapport de la Banque: the world's money in the open, for anyone (no account). */
  app.get("/api/bank", async () =>
    toJson(await bankReport(db, world.id, world.ctx, world.current, world.now())),
  );

  /** The merchant's ledger in this world, as a CSV file (a spreadsheet's tab). */
  app.get("/api/game/ledger.csv", async (req, reply) => {
    const account = await requireAccount(req, reply);
    if (!account) return;
    reply.header("content-type", "text/csv; charset=utf-8");
    reply.header("content-disposition", 'attachment; filename="fondaco-livre-de-compte.csv"');
    return `\uFEFF${await ledgerCsv(db, world.id, account.id)}`;
  });

  /** The Journal du Rialto: the world's last day, public. */
  app.get("/api/game/journal", async (req, reply) => {
    const account = await requireAccount(req, reply);
    if (!account) return;
    return toJson(await journal(db, world.id, world.current, world.now()));
  });

  app.get("/api/game/prices", async (req, reply) => {
    const account = await requireAccount(req, reply);
    if (!account) return;
    // Seven days of prices for everyone (recommendations of 20 October 2026: a decision to make
    // at each session, read on the curve).
    return { series: await priceHistory(db, world.id, world.now(), 168) };
  });

  /** The family's thread: the call, mapped to a status and an error code when refused. */
  async function chat<T>(reply: FastifyReply, run: () => Promise<T>) {
    try {
      return await run();
    } catch (e) {
      if (e instanceof ChatError) return reply.code(e.status).send({ error: e.code });
      throw e;
    }
  }

  app.get("/api/game/family/messages", async (req, reply) => {
    const account = await requireAccount(req, reply);
    if (!account) return;
    return chat(reply, () => familyThread(db, world, account.id));
  });

  app.post("/api/game/family/messages", perMerchant(60), async (req, reply) => {
    const account = await requireAccount(req, reply);
    if (!account) return;
    const parsed = z.object({ body: z.string().max(2_000) }).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_message" });
    return chat(reply, async () => {
      await postMessage(db, world, account.id, parsed.data.body, world.now());
      return familyThread(db, world, account.id);
    });
  });

  app.post("/api/game/family/messages/:id/report", async (req, reply) => {
    const account = await requireAccount(req, reply);
    if (!account) return;
    const id = z
      .string()
      .uuid()
      .safeParse((req.params as { id?: string }).id);
    if (!id.success) return reply.code(404).send({ error: "unknown_message" });
    return chat(reply, async () => {
      await reportMessage(db, world, account.id, id.data, world.now());
      return { ok: true };
    });
  });

  /** Admin: reported messages of the families' threads. */
  app.get("/api/admin/reports", async (req, reply) => {
    const account = await requireAccount(req, reply);
    if (!account) return;
    if (!deps.adminEmails.includes(account.email.toLowerCase())) {
      return reply.code(403).send({ error: "forbidden" });
    }
    return { reports: await reportedMessages(db, world.id) };
  });

  app.post("/api/admin/messages/:id/hide", async (req, reply) => {
    const account = await requireAccount(req, reply);
    if (!account) return;
    if (!deps.adminEmails.includes(account.email.toLowerCase())) {
      return reply.code(403).send({ error: "forbidden" });
    }
    const id = z
      .string()
      .uuid()
      .safeParse((req.params as { id?: string }).id);
    if (!id.success) return reply.code(404).send({ error: "unknown_message" });
    await hideMessage(db, world.id, id.data);
    return { ok: true };
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
    if (!world.ctx.settings.pass.enabled) return reply.code(409).send({ error: "pass_disabled" });
    const now = world.now();
    const from = Math.max(now, await passUntil(db, target.id, now));
    await grantPass(db, target.id, "admin", from, from + body.days * 86_400_000, account.email);
    await syncPass(db, world, target.id);
    return { ok: true, until: await passUntil(db, target.id, now) };
  });

  /** The Livre de la Maison: Influence, its latest lines, the patents and the catalogue. */
  app.get("/api/house", async (req, reply) => {
    const account = await requireAccount(req, reply);
    if (!account) return;
    return houseOf(db, world.ctx.settings, account.id);
  });

  /** Buys a patent with Influence; held in the world at once when the merchant plays there. */
  app.post("/api/house/patents", perMerchant(30), async (req, reply) => {
    const account = await requireAccount(req, reply);
    if (!account) return;
    const { patent } = z.object({ patent: z.string().max(32) }).parse(req.body);
    try {
      const bought = await buyPatent(
        db,
        world.ctx.settings,
        account.id,
        patent,
        world.id,
        new Date(world.now()),
      );
      if (world.current.players[account.id]) {
        await world.execute({ type: "grantPatent", playerId: account.id, patent });
      }
      return bought;
    } catch (e) {
      if (e instanceof HouseRefused) return reply.code(409).send({ error: e.code });
      throw e;
    }
  });

  /**
   * Spends Influence in the world: the price set by the engine's rules, taken first, given back
   * if the world refuses. Returns the fresh view and balance.
   */
  const spendBody = z.discriminatedUnion("use", [
    z.object({ use: z.literal("rush"), deliveryId: z.string().max(32) }),
    z.object({ use: z.literal("troops"), count: z.number().int().positive().max(1_000) }),
    z.object({ use: z.literal("work"), land: z.string().max(32) }),
    z.object({ use: z.literal("respec") }),
    z.object({ use: z.literal("daily"), taskId: z.string().max(32) }),
  ]);
  app.post("/api/house/spend", perMerchant(60), async (req, reply) => {
    const account = await requireAccount(req, reply);
    if (!account) return;
    const body = spendBody.parse(req.body);
    const spend = world.ctx.settings.house?.spend;
    if (!spend) return reply.code(409).send({ error: "house_off" });
    if (!world.current.players[account.id]) return reply.code(409).send({ error: "not_joined" });
    const playerId = account.id;
    let cost: number;
    let cmd: Command;
    switch (body.use) {
      case "rush": {
        const d = world.current.deliveries?.[body.deliveryId];
        if (!d || d.playerId !== playerId) return reply.code(409).send({ error: "not_owner" });
        cost = rushCost(world.ctx, d, world.now());
        cmd = { type: "rushDelivery", playerId, deliveryId: body.deliveryId };
        break;
      }
      case "troops":
        cost = Math.ceil(body.count / spend.troopsPerPoint);
        cmd = { type: "buyTroops", playerId, count: body.count };
        break;
      case "work":
        cost = spend.rushWork;
        cmd = { type: "rushWork", playerId, land: body.land };
        break;
      case "respec":
        cost = spend.respec;
        cmd = { type: "resetSpecialty", playerId };
        break;
      case "daily":
        cost = spend.dailyReroll;
        cmd = { type: "rerollDaily", playerId, taskId: body.taskId };
        break;
    }
    const at = new Date(world.now());
    let key: string;
    try {
      key = await spendInfluence(db, playerId, body.use, cost, world.id, at);
    } catch (e) {
      if (e instanceof HouseRefused) return reply.code(409).send({ error: e.code });
      throw e;
    }
    const res = await world.execute(cmd);
    if (!res.ok) {
      await refundInfluence(db, playerId, key);
      return reply.code(422).send({ error: res.error, ...((await view(account)) as object) });
    }
    return view(account);
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
      // The Criée and good-deal alerts are the Pass's: not offered while it is off.
      kinds: world.ctx.settings.pass.enabled
        ? NOTIFICATION_KINDS
        : NOTIFICATION_KINDS.filter((k) => k !== "criee" && k !== "deal"),
      off: row?.off ?? [],
    };
  });

  app.patch("/api/notifications/push", async (req, reply) => {
    const account = await requireAccount(req, reply);
    if (!account) return;
    // Kinds of notices that no longer exist (the sea, the bandits) are dropped, not refused.
    const known = new Set<string>(NOTIFICATION_KINDS);
    const off = z
      .object({ off: z.array(z.string().max(32)).max(64) })
      .parse(req.body)
      .off.filter((k): k is NotificationKind => known.has(k));
    await db.update(accounts).set({ pushOff: off }).where(eq(accounts.id, account.id));
    return { off };
  });

  app.post("/api/notifications/push/subscribe", perMerchant(30), async (req, reply) => {
    const account = await requireAccount(req, reply);
    if (!account) return;
    const sub = z
      .object({
        endpoint: z.string().url().max(2000),
        keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }),
      })
      .parse(req.body);
    if (!isPushEndpoint(sub.endpoint)) return reply.code(400).send({ error: "invalid_endpoint" });
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
    // A few devices per person: the oldest go.
    const devices = await db
      .select({ endpoint: pushSubscriptions.endpoint })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.accountId, account.id))
      .orderBy(desc(pushSubscriptions.createdAt));
    const stale = devices.slice(PUSH_DEVICES_MAX).map((d) => d.endpoint);
    if (stale.length > 0) {
      await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.endpoint, stale));
    }
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
    const levels = await levelsOf(
      db,
      world.current,
      table.rows.map((r) => r.playerId),
    );
    const strip = ({ playerId, ...rest }: (typeof table.rows)[number]) => ({
      ...rest,
      id: playerId,
      me: playerId === account.id,
      pass: hasPass(world.ctx, world.current, playerId, world.now()),
      level: levels.get(playerId)?.level ?? 1,
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

  /** The Terraferma's map and the merchant's state on it (null while it is not live). */
  app.get("/api/game/terra", perMerchant(300), async (req, reply) => {
    const account = await requireAccount(req, reply);
    if (!account) return;
    const map = world.current.terra?.map;
    const ids = map ? Object.keys(map.players).filter((id) => !isNation(id)) : [];
    const rows =
      ids.length === 0
        ? []
        : await db
            .select({ id: accounts.id, pseudo: accounts.pseudo, crest: accounts.crest })
            .from(accounts)
            .where(inArray(accounts.id, ids));
    const names = new Map(rows.map((r) => [r.id, { pseudo: r.pseudo, crest: r.crest }]));
    return toJson({
      terra: terraView(world.ctx, world.current, account.id, world.now(), names),
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
        pass: hasPass(world.ctx, world.current, playerId, world.now()),
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
    case "chooseSpecialty":
      return [{ type: "chooseSpecialty", playerId, specialty: a.specialty }];
    case "claimHouseMission":
      return [{ type: "claimHouseMission", playerId, missionId: a.missionId }];
    case "terraPlace":
      return [{ type: "terraPlace", playerId, cell: a.cell }];
    case "terraFront":
      return [{ type: "terraFront", playerId, aim: a.aim, shareBps: a.shareBps }];
    case "terraRecall":
      return [{ type: "terraRecall", playerId, frontId: a.frontId }];
    case "terraAlly":
      return [{ type: "terraAlly", playerId, other: a.other }];
    case "terraAccept":
      return [{ type: "terraAccept", playerId, from: a.from }];
    case "terraBreak":
      return [{ type: "terraBreak", playerId, other: a.other }];
    case "terraSend":
      return [{ type: "terraSend", playerId, to: a.to, count: a.count }];
    case "terraBuild":
      return [{ type: "terraBuild", playerId, cell: a.cell, kind: a.kind }];
    case "terraRaise":
      return [{ type: "terraRaise", playerId }];
    case "terraSail":
      return [{ type: "terraSail", playerId, aim: a.aim, shareBps: a.shareBps }];
    case "terraPeasants":
      return [{ type: "terraPeasants", playerId, shareBps: a.shareBps }];
    case "terraDecree":
      return [
        {
          type: "terraDecree",
          playerId,
          code: a.code,
          ...(a.target ? { target: a.target } : {}),
        },
      ];
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
    case "collectLevy":
      return [{ type: "collectLevy", playerId }];
    case "hireLances":
      return [{ type: "hireLances", playerId, count: a.count }];
    case "buildWork":
      return [{ type: "buildWork", playerId, land: a.land, kind: a.kind }];
    case "sendMarch":
      return [{ type: "sendMarch", playerId, land: a.land, lances: a.lances }];
    case "joinMarch":
      return [{ type: "joinMarch", playerId, marchId: a.marchId, lances: a.lances }];
    case "voteProgramme":
      return [
        {
          type: "voteProgramme",
          playerId,
          picks: a.picks.map((p) =>
            p.target ? { code: p.code, target: p.target } : { code: p.code },
          ),
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
    case "buyVehicle":
      return [{ type: "buyVehicle", playerId, vehicleType: a.vehicleType }];
    case "upgradeVehicle":
      return [{ type: "upgradeVehicle", playerId, vehicleId: a.vehicleId }];
    case "dispatchDelivery":
      return [
        {
          type: "dispatchDelivery",
          playerId,
          orderId: a.orderId,
          ...(a.orderIds ? { orderIds: a.orderIds } : {}),
          vehicleId: a.vehicleId,
        },
      ];
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
