import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { Db } from "../db/client.js";
import { accounts } from "../db/schema.js";
import { type PlancheAnswer, type PlancheHub, plancheTheme } from "./planche.js";
import { PlancheLagoons } from "./plancheLagoons.js";
import { toJson } from "./serialize.js";

export interface PlancheRouteDeps {
  db: Db;
  now: () => number;
  accountIfAny?: (req: FastifyRequest) => Promise<{ id: string } | null>;
  perMerchant: (max: number) => object;
  secureCookies?: boolean;
  /**
   * Game time against real time: 1 in the game, more to watch a tide go by in a test
   * (`PLANCHE_PACE=60`: an hour of the board a minute).
   */
  pace?: number;
  /** The boards kept in the base; opened here, without their timers, when not given (tests). */
  lagoons?: PlancheLagoons;
}

const STATUS: Record<string, number> = {
  not_seated: 403,
  ile_unknown: 404,
  ile_not_owned: 404,
  planche_unknown: 404,
  planche_no_thread: 404,
  duel_lost: 409,
  duel_illegal: 422,
};
const SAID_STATUS = 409;

/**
 * The shared board on line (docs/plan-planche.md L5, docs/plan-compte.md C3): read one's board,
 * stretch and take back one's threads, set one's toll, build one's island, force a passage by a
 * duel the server replays. With an account only: a house is kept for good.
 */
export function registerPlancheRoutes(app: FastifyInstance, deps: PlancheRouteDeps): void {
  const pace = Math.max(1, deps.pace ?? 1);
  let opened: Promise<{ lagoons: PlancheLagoons; now: () => number }> | undefined;
  /**
   * The boards, and the game's clock: the real one, or faster in a test; it never runs behind
   * what the boards have reached (boards loaded from the base resume where they stopped).
   */
  const boards = () => {
    opened ??= (async () => {
      const lagoons =
        deps.lagoons ?? (await PlancheLagoons.open(deps.db, plancheTheme(), deps.now()));
      const real0 = deps.now();
      const game0 = Math.max(real0, lagoons.reached());
      return { lagoons, now: () => game0 + (deps.now() - real0) * pace };
    })();
    return opened;
  };
  /** A house is named after its player: Ca' and the account's name. */
  const nameOf = async (id: string) => {
    const [row] = await deps.db
      .select({ pseudo: accounts.pseudo })
      .from(accounts)
      .where(eq(accounts.id, id));
    return `Ca\u2019 ${row?.pseudo ?? "Bembo"}`;
  };
  type Player = { id: string; name: string; hub: PlancheHub; lagoon: string; now: () => number };
  /** The player, with his board and his house (given one if he has none); none without an account. */
  const who = async (req: FastifyRequest, reply: FastifyReply): Promise<Player | null> => {
    const account = (await deps.accountIfAny?.(req)) ?? null;
    if (!account) {
      void reply.code(401).send({ error: "not_signed_in" });
      return null;
    }
    const { lagoons, now } = await boards();
    const name = await nameOf(account.id);
    const { store } = await lagoons.seatOf(account.id, name, now());
    return { id: account.id, name, hub: store.hub, lagoon: store.name, now };
  };
  const show = async (reply: FastifyReply, p: Player, res: PlancheAnswer = "ok") => {
    if (res !== "ok") return reply.code(STATUS[res] ?? SAID_STATUS).send({ error: res });
    const view = await p.hub.view(p.id, p.name, p.now());
    return toJson({ planche: { ...view, lagoon: p.lagoon } });
  };
  const key = z.string().min(1).max(40);

  app.get("/api/planche", deps.perMerchant(240), async (req, reply) => {
    const p = await who(req, reply);
    return p ? show(reply, p) : reply;
  });
  app.post("/api/planche/thread", deps.perMerchant(60), async (req, reply) => {
    const b = z.object({ city: key, good: key }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    const p = await who(req, reply);
    if (!p) return reply;
    return show(reply, p, await p.hub.thread(p.id, b.data.city, b.data.good, p.now()));
  });
  app.post("/api/planche/unthread", deps.perMerchant(60), async (req, reply) => {
    const b = z.object({ city: key, good: key }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    const p = await who(req, reply);
    if (!p) return reply;
    return show(reply, p, await p.hub.unthread(p.id, b.data.city, b.data.good, p.now()));
  });
  app.post("/api/planche/toll", deps.perMerchant(30), async (req, reply) => {
    const b = z
      .object({ passage: key, tollBps: z.number().int().min(0).max(10_000) })
      .safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    const p = await who(req, reply);
    if (!p) return reply;
    return show(reply, p, await p.hub.toll(p.id, b.data.passage, b.data.tollBps, p.now()));
  });
  // The island (docs/plan-ile.md I6): its tiles are « x,y » from the Fondaco.
  const tile = z.string().regex(/^-?\d{1,2},-?\d{1,2}$/);
  app.post("/api/planche/ile/buy", deps.perMerchant(60), async (req, reply) => {
    const b = z.object({ at: tile }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    const p = await who(req, reply);
    if (!p) return reply;
    return show(reply, p, await p.hub.buyTile(p.id, b.data.at, p.now()));
  });
  app.post("/api/planche/ile/build", deps.perMerchant(60), async (req, reply) => {
    const b = z.object({ type: key, at: tile }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    const p = await who(req, reply);
    if (!p) return reply;
    return show(reply, p, await p.hub.build(p.id, b.data.type, b.data.at, p.now()));
  });
  app.post("/api/planche/ile/upgrade", deps.perMerchant(60), async (req, reply) => {
    const b = z.object({ at: tile }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    const p = await who(req, reply);
    if (!p) return reply;
    return show(reply, p, await p.hub.upgrade(p.id, b.data.at, p.now()));
  });
  app.post("/api/planche/ile/move", deps.perMerchant(60), async (req, reply) => {
    const b = z.object({ from: tile, to: tile }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    const p = await who(req, reply);
    if (!p) return reply;
    return show(reply, p, await p.hub.move(p.id, b.data.from, b.data.to, p.now()));
  });
  app.post("/api/planche/force", deps.perMerchant(20), async (req, reply) => {
    const b = z
      .object({
        passage: key,
        moves: z
          .array(z.object({ at: z.number().int().min(0).max(400), fire: z.boolean().optional() }))
          .max(200),
      })
      .safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    const p = await who(req, reply);
    if (!p) return reply;
    const moves = b.data.moves.map((m) =>
      m.fire ? { at: m.at, fire: true as const } : { at: m.at },
    );
    return show(reply, p, await p.hub.force(p.id, b.data.passage, moves, p.now()));
  });
}
