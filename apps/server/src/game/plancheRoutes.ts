import { randomBytes } from "node:crypto";
import { venice1450Passe, venice1450Planche } from "@comptoirs/engine";
import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { Db } from "../db/client.js";
import { accounts } from "../db/schema.js";
import { guestId, guestName, isGuest } from "./battle.js";
import { type PlancheAnswer, PlancheHub } from "./planche.js";
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
  hub?: PlancheHub;
}

const GUEST = "fondaco_guest";
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
 * The shared board on line (docs/plan-planche.md L5): read the board, stretch and take back one's
 * threads, set one's toll, force a passage by a duel the server replays. Open to a guest as the
 * Battle and the Passe are (the same cookie).
 */
export function registerPlancheRoutes(app: FastifyInstance, deps: PlancheRouteDeps): PlancheHub {
  const pace = Math.max(1, deps.pace ?? 1);
  const t0 = deps.now();
  const now = () => t0 + (deps.now() - t0) * pace;
  const hub =
    deps.hub ??
    new PlancheHub(
      {
        board: venice1450Planche,
        passe: { rules: venice1450Passe.rules, boards: venice1450Passe.boards, lieutenant: 3 },
        visitHours: 8,
        idleHours: 7 * 24,
      },
      now(),
    );
  const player = async (req: FastifyRequest, reply: FastifyReply) => {
    const account = (await deps.accountIfAny?.(req)) ?? null;
    if (account) return account.id;
    const token = req.cookies[GUEST];
    if (token && /^[A-Za-z0-9_-]{20,64}$/.test(token)) return guestId(token);
    const fresh = randomBytes(24).toString("base64url");
    reply.setCookie(GUEST, fresh, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: deps.secureCookies ?? false,
      maxAge: 30 * 86_400,
    });
    return guestId(fresh);
  };
  const nameOf = async (id: string) => {
    if (isGuest(id)) return guestName(id);
    const [row] = await deps.db
      .select({ pseudo: accounts.pseudo })
      .from(accounts)
      .where(eq(accounts.id, id));
    return row?.pseudo ?? "Un marchand";
  };
  const show = async (reply: FastifyReply, id: string, res: PlancheAnswer = "ok") => {
    if (res !== "ok") return reply.code(STATUS[res] ?? SAID_STATUS).send({ error: res });
    return toJson({ planche: hub.view(id, await nameOf(id), now()) });
  };
  /** The player, given a house if he has none yet (a first gesture may come before a first read). */
  const seated = async (req: FastifyRequest, reply: FastifyReply) => {
    const id = await player(req, reply);
    hub.view(id, await nameOf(id), now());
    return id;
  };
  const key = z.string().min(1).max(40);

  app.get("/api/planche", deps.perMerchant(240), async (req, reply) =>
    show(reply, await player(req, reply)),
  );
  app.post("/api/planche/thread", deps.perMerchant(60), async (req, reply) => {
    const b = z.object({ city: key, good: key }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    const id = await seated(req, reply);
    return show(reply, id, hub.thread(id, b.data.city, b.data.good, now()));
  });
  app.post("/api/planche/unthread", deps.perMerchant(60), async (req, reply) => {
    const b = z.object({ city: key, good: key }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    const id = await seated(req, reply);
    return show(reply, id, hub.unthread(id, b.data.city, b.data.good, now()));
  });
  app.post("/api/planche/toll", deps.perMerchant(30), async (req, reply) => {
    const b = z
      .object({ passage: key, tollBps: z.number().int().min(0).max(10_000) })
      .safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    const id = await seated(req, reply);
    return show(reply, id, hub.toll(id, b.data.passage, b.data.tollBps, now()));
  });
  // The island (docs/plan-ile.md I6): its tiles are « x,y » from the Fondaco.
  const tile = z.string().regex(/^-?\d{1,2},-?\d{1,2}$/);
  app.post("/api/planche/ile/buy", deps.perMerchant(60), async (req, reply) => {
    const b = z.object({ at: tile }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    const id = await seated(req, reply);
    return show(reply, id, hub.buyTile(id, b.data.at, now()));
  });
  app.post("/api/planche/ile/build", deps.perMerchant(60), async (req, reply) => {
    const b = z.object({ type: key, at: tile }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    const id = await seated(req, reply);
    return show(reply, id, hub.build(id, b.data.type, b.data.at, now()));
  });
  app.post("/api/planche/ile/upgrade", deps.perMerchant(60), async (req, reply) => {
    const b = z.object({ at: tile }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    const id = await seated(req, reply);
    return show(reply, id, hub.upgrade(id, b.data.at, now()));
  });
  app.post("/api/planche/ile/move", deps.perMerchant(60), async (req, reply) => {
    const b = z.object({ from: tile, to: tile }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    const id = await seated(req, reply);
    return show(reply, id, hub.move(id, b.data.from, b.data.to, now()));
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
    const id = await seated(req, reply);
    const moves = b.data.moves.map((m) =>
      m.fire ? { at: m.at, fire: true as const } : { at: m.at },
    );
    return show(reply, id, hub.force(id, b.data.passage, moves, now()));
  });
  return hub;
}
