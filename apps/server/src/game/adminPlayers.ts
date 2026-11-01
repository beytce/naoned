import { type AdminEdit, cashAccount, empireView } from "@comptoirs/engine";
import { and, eq, inArray } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { PublicAccount } from "../auth/service.js";
import type { Db } from "../db/client.js";
import { accounts, players } from "../db/schema.js";
import { levelsOf } from "./level.js";
import { passUntil } from "./pass.js";
import { toJson } from "./serialize.js";
import type { GameWorld } from "./world.js";

interface Deps {
  db: Db;
  world: GameWorld;
  requireAccount: (req: FastifyRequest, reply: FastifyReply) => Promise<PublicAccount | null>;
  adminEmails: string[];
}

const int = z.number().int();
const editSchema: z.ZodType<AdminEdit> = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("cash"), deniers: z.string().regex(/^\d{1,18}$/) }),
  z.object({ kind: z.literal("stock"), good: z.string().max(40), qty: int.min(0) }),
  z.object({ kind: z.literal("casa"), level: int.min(1) }),
  z.object({
    kind: z.literal("house"),
    favour: int.min(0).optional(),
    seals: int.min(0).optional(),
    heritage: int.min(0).optional(),
    merit: int.min(0).optional(),
  }),
  z.object({ kind: z.literal("workshop"), workshopId: z.string().max(32), level: int.min(1) }),
  z.object({ kind: z.literal("counter"), region: z.string().max(40), level: int.min(1) }),
  z.object({ kind: z.literal("vehicleLevel"), vehicleType: z.string().max(40), level: int.min(1) }),
  z.object({ kind: z.literal("vehicle"), vehicleType: z.string().max(40) }),
  z.object({ kind: z.literal("removeVehicle"), vehicleId: z.string().max(40) }),
  z.object({ kind: z.literal("module"), code: z.string().max(40), level: int.min(0) }),
  z.object({ kind: z.literal("knowledge"), code: z.string().max(40), learnt: z.boolean() }),
  z.object({ kind: z.literal("staffLevel"), staffId: z.string().max(32), level: int.min(1) }),
  z.object({ kind: z.literal("finish") }),
  z.object({ kind: z.literal("revealMap") }),
  z.object({ kind: z.literal("site"), site: z.enum(["camp", "depot"]) }),
]);

const accountPatch = z.object({
  pseudo: z.string().trim().min(2).max(24).optional(),
  condottaLevel: int.min(1).max(1_000).optional(),
  condottaBest: int.min(0).max(1_000).optional(),
  terraRating: int.min(0).max(10_000).optional(),
  lustre: int.min(0).max(1_000).optional(),
});

/**
 * The admin's desk on the merchants (tests, support): the list, a merchant's sheet, and the hand
 * that sets their cash, stock, Casa and house at will (the engine's `adminEdit`).
 */
export function registerAdminPlayerRoutes(app: FastifyInstance, deps: Deps): void {
  const { db, world } = deps;

  async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
    const account = await deps.requireAccount(req, reply);
    if (!account) return null;
    if (!deps.adminEmails.includes(account.email.toLowerCase())) {
      reply.code(403).send({ error: "forbidden" });
      return null;
    }
    return account;
  }

  const idOf = (req: FastifyRequest) =>
    z
      .string()
      .uuid()
      .safeParse((req.params as { id?: string }).id);

  /** The world as it runs: its kind, its clock, its people. */
  app.get("/api/admin/world", async (req, reply) => {
    const me = await requireAdmin(req, reply);
    if (!me) return;
    const state = world.current;
    const ids = Object.keys(state.players);
    const bots = ids.length
      ? await db
          .select({ id: accounts.id })
          .from(accounts)
          .where(and(inArray(accounts.id, ids), eq(accounts.isBot, true)))
      : [];
    return {
      id: world.id,
      name: world.name,
      kind: world.ctx.settings.empire ? "empire" : "season",
      now: world.now(),
      startAt: world.ctx.startAt,
      players: ids.length,
      bots: bots.length,
      me: me.email,
    };
  });

  /** Checks the ledger and the stock against the world's state (on demand: it reads the journals). */
  app.post("/api/admin/invariants", async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return;
    const violations = await world.checkInvariants();
    return toJson({ ok: violations.length === 0, violations });
  });

  /** The merchants of the world, people first, with what to recognise them by. */
  app.get("/api/admin/players", async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return;
    const q = String((req.query as { q?: string }).q ?? "")
      .trim()
      .toLowerCase();
    const state = world.current;
    const ids = Object.keys(state.players);
    if (ids.length === 0) return { players: [] };
    const rows = await db
      .select({
        id: accounts.id,
        email: accounts.email,
        pseudo: accounts.pseudo,
        isBot: accounts.isBot,
        lastSeen: players.lastSeenAt,
      })
      .from(accounts)
      .leftJoin(players, and(eq(players.accountId, accounts.id), eq(players.worldId, world.id)))
      .where(inArray(accounts.id, ids));
    const found = rows.filter(
      (r) =>
        !q ||
        r.email.toLowerCase().includes(q) ||
        (r.pseudo ?? "").toLowerCase().includes(q) ||
        r.id.startsWith(q),
    );
    const levels = world.ctx.settings.empire
      ? new Map()
      : await levelsOf(
          db,
          state,
          found.map((r) => r.id),
        );
    const now = world.now();
    const list = found.map((r) => {
      const h = state.empire?.houses[r.id];
      const view = h ? empireView(world.ctx, state, r.id, now) : null;
      return {
        id: r.id,
        email: r.isBot ? null : r.email,
        pseudo: r.pseudo,
        isBot: r.isBot,
        lastSeen: r.lastSeen?.getTime() ?? null,
        cash: state.accounts[cashAccount(r.id)] ?? 0n,
        casa: view?.house.casa ?? null,
        power: view?.power ?? null,
        band: view?.band ?? null,
        level: levels.get(r.id)?.level ?? null,
      };
    });
    list.sort(
      (a, b) =>
        Number(a.isBot) - Number(b.isBot) ||
        (b.lastSeen ?? 0) - (a.lastSeen ?? 0) ||
        (a.pseudo ?? "").localeCompare(b.pseudo ?? ""),
    );
    return toJson({ players: list.slice(0, 300), total: found.length });
  });

  /** A merchant's sheet: what the hand can set, and the bounds the world sets to it. */
  app.get("/api/admin/players/:id", async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return;
    const id = idOf(req);
    if (!id.success) return reply.code(404).send({ error: "unknown_player" });
    const state = world.current;
    if (!state.players[id.data]) return reply.code(404).send({ error: "unknown_player" });
    const [account] = await db
      .select({
        id: accounts.id,
        email: accounts.email,
        pseudo: accounts.pseudo,
        isBot: accounts.isBot,
        createdAt: accounts.createdAt,
        lastLoginAt: accounts.lastLoginAt,
        condottaLevel: accounts.condottaLevel,
        condottaBest: accounts.condottaBest,
        terraRating: accounts.terraRating,
        lustre: accounts.lustre,
      })
      .from(accounts)
      .where(eq(accounts.id, id.data));
    if (!account) return reply.code(404).send({ error: "unknown_player" });
    const now = world.now();
    const ctx = world.ctx;
    const s = ctx.settings.empire;
    const view = s ? empireView(ctx, state, id.data, now) : null;
    const inv = state.inventories[id.data] ?? {};
    const level = s ? null : (await levelsOf(db, state, [id.data])).get(id.data);
    return toJson({
      account: {
        ...account,
        createdAt: account.createdAt.getTime(),
        lastLoginAt: account.lastLoginAt?.getTime() ?? null,
      },
      passUntil: await passUntil(db, id.data, now),
      cash: state.accounts[cashAccount(id.data)] ?? 0n,
      escrow: state.accounts[`escrow:${id.data}`] ?? 0n,
      stock: Object.fromEntries(
        Object.entries(inv)
          .map(([g, l]) => {
            // In the empire, what the counters beyond Venice hold is theirs: Venice's share here.
            const away = Object.values(state.empire?.houses[id.data]?.stores ?? {}).reduce(
              (n, st) => n + (st[g] ?? 0),
              0,
            );
            return [g, { available: l.available - away, escrow: l.escrow }] as const;
          })
          .filter(([, l]) => l.available + l.escrow > 0),
      ),
      goods: ctx.theme.resources.map((r) => ({ code: r.code, name: r.name })),
      level,
      empire:
        s && view
          ? {
              house: view.house,
              power: view.power,
              band: view.band,
              incomePerDay: view.incomePerDay,
              asleep: view.asleep,
              bounds: {
                casa: s.casa.length,
                workshop: s.workshops.maxLevel,
                counter: s.counters.maxLevel,
                vehicleLevel: s.vehicleLevels.max,
                module: s.research.minutes.length,
                staff: s.staff.maxLevel,
              },
              regions: s.regions.map((r) => ({ code: r.code, casa: r.casa })),
              vehicles: Object.entries(s.vehicles).map(([type, v]) => ({
                type,
                casa: v.casa,
              })),
              modules: s.modules.map((m) => ({ code: m.code, kind: m.kind, effect: m.effect })),
              knowledge: s.knowledge.branches.map((b) => ({
                branch: b.code,
                codes: [...b.nodes, ...b.capstones].map((n) => n.code),
              })),
              sites: {
                camp: s.map.camp !== null,
                depot: s.map.depot !== null,
              },
              cells: Object.keys(s.map.cells).length,
            }
          : null,
    });
  });

  /** The hand: one edit to a merchant, through the engine (and its journals). */
  app.post("/api/admin/players/:id/edit", async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return;
    const id = idOf(req);
    if (!id.success) return reply.code(404).send({ error: "unknown_player" });
    const parsed = z.object({ edit: editSchema }).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_edit" });
    const res = await world.execute({
      type: "adminEdit",
      playerId: id.data,
      edit: parsed.data.edit,
    });
    if (!res.ok) return reply.code(422).send({ error: res.error });
    return { ok: true };
  });

  /** The account's own marks: its name, the Condotta's levels, the Terraferma's rating, the Lustre. */
  app.post("/api/admin/players/:id/account", async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return;
    const id = idOf(req);
    if (!id.success) return reply.code(404).send({ error: "unknown_player" });
    const parsed = accountPatch.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_edit" });
    const patch = parsed.data;
    if (Object.keys(patch).length === 0) return { ok: true };
    try {
      const updated = await db
        .update(accounts)
        .set(patch)
        .where(eq(accounts.id, id.data))
        .returning({ id: accounts.id });
      if (updated.length === 0) return reply.code(404).send({ error: "unknown_player" });
    } catch {
      return reply.code(409).send({ error: "pseudo_taken" });
    }
    return { ok: true };
  });
}
