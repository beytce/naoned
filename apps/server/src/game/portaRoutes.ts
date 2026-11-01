import { inArray } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { AuthService } from "../auth/service.js";
import type { Db } from "../db/client.js";
import { accounts } from "../db/schema.js";
import type { PortaHub } from "./porta.js";
import type { GameWorld } from "./world.js";

export interface PortaRouteDeps {
  db: Db;
  world: GameWorld;
  auth: AuthService;
  sessionCookie: string;
  requireAccount: (req: FastifyRequest, reply: FastifyReply) => Promise<{ id: string } | null>;
  perMerchant: (max: number) => object;
  porta: PortaHub;
}

const id = z.string().max(32);
const entry = z.object({
  tier: z.number().int().min(1).max(12),
  combatId: id,
  transportId: id,
});
const order = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("move"),
    unitId: id,
    x: z.number().finite().min(-100).max(100),
    y: z.number().finite().min(-100).max(100),
  }),
  z.object({ type: z.literal("stop"), unitId: id }),
  z.object({ type: z.literal("activate"), unitId: id, componentId: id }),
  z.object({ type: z.literal("leave"), unitId: id }),
]);

/** The week's ranking shown: the band's first, and the player's own line. */
const RANKING_SHOWN = 20;

/**
 * The Porta's routes (docs/plan-porta.md § 7): the lobby (alone, public, by invitation), the
 * orders of a battle, the battle's socket (a snapshot a step), the week's ranking of the band.
 */
export function registerPortaRoutes(app: FastifyInstance, deps: PortaRouteDeps): void {
  const { porta } = deps;
  const answer = (reply: FastifyReply, accountId: string, res: object) =>
    "error" in res && res.error
      ? reply.code(422).send({ error: res.error, ...porta.stateOf(accountId) })
      : porta.stateOf(accountId);

  app.get("/api/empire/porta", async (req, reply) => {
    const account = await deps.requireAccount(req, reply);
    if (!account) return;
    const band = porta.bandOfPlayer(account.id);
    const all = porta.ranking(band);
    const shown = all.slice(0, RANKING_SHOWN);
    const ids = [...new Set([...shown.map((r) => r.playerId), account.id])];
    const rows = await deps.db
      .select({ id: accounts.id, pseudo: accounts.pseudo })
      .from(accounts)
      .where(inArray(accounts.id, ids));
    const names = new Map(rows.map((r) => [r.id, r.pseudo]));
    const rank = all.findIndex((r) => r.playerId === account.id);
    return {
      ...porta.stateOf(account.id),
      ranking: {
        band,
        lines: shown.map((r, i) => ({
          rank: i + 1,
          pseudo: names.get(r.playerId) ?? "",
          points: r.points,
          me: r.playerId === account.id,
        })),
        mine: rank >= 0 ? { rank: rank + 1, points: all[rank]?.points ?? 0 } : null,
      },
    };
  });

  app.post("/api/empire/porta/queue", deps.perMerchant(30), async (req, reply) => {
    const account = await deps.requireAccount(req, reply);
    if (!account) return;
    const parsed = entry.extend({ mode: z.enum(["solo", "public", "invite"]) }).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid" });
    const { mode, ...e } = parsed.data;
    return answer(reply, account.id, await porta.queue(account.id, e, mode));
  });

  app.post("/api/empire/porta/join", deps.perMerchant(30), async (req, reply) => {
    const account = await deps.requireAccount(req, reply);
    if (!account) return;
    const parsed = z
      .object({ code: z.string().regex(/^\d{6}$/), combatId: id, transportId: id })
      .safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid" });
    const { code, ...vehicles } = parsed.data;
    return answer(reply, account.id, await porta.join(account.id, code, vehicles));
  });

  app.post("/api/empire/porta/launch", deps.perMerchant(30), async (req, reply) => {
    const account = await deps.requireAccount(req, reply);
    if (!account) return;
    return answer(reply, account.id, await porta.launch(account.id));
  });

  app.post("/api/empire/porta/leave", deps.perMerchant(30), async (req, reply) => {
    const account = await deps.requireAccount(req, reply);
    if (!account) return;
    const refused = porta.leave(account.id);
    return answer(reply, account.id, refused ? { error: refused } : {});
  });

  // Orders come often in a battle: a generous rate.
  app.post("/api/empire/porta/order", deps.perMerchant(1_200), async (req, reply) => {
    const account = await deps.requireAccount(req, reply);
    if (!account) return;
    const parsed = order.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid" });
    const refused = porta.order(account.id, parsed.data);
    if (refused) return reply.code(422).send({ error: refused });
    return { ok: true };
  });

  app.get("/api/empire/porta/live", { websocket: true }, async (socket, req) => {
    const account = await deps.auth.accountForSession(req.cookies[deps.sessionCookie]);
    if (!account) {
      socket.close(4401, "unauthenticated");
      return;
    }
    porta.subscribe(account.id, socket);
    // The orders go by their route: the socket only listens.
    socket.on("message", () => undefined);
  });
}
