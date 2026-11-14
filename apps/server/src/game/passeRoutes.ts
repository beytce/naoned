import { randomBytes } from "node:crypto";
import { venice1450Passe } from "@comptoirs/engine";
import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { Db } from "../db/client.js";
import { accounts } from "../db/schema.js";
import { guestId, guestName, isGuest } from "./battle.js";
import { type PasseAnswer, PasseHub } from "./passe.js";
import { toJson } from "./serialize.js";

export interface PasseRouteDeps {
  db: Db;
  now: () => number;
  /** The session's account, or null without one: a guest plays by its cookie. */
  accountIfAny?: (req: FastifyRequest) => Promise<{ id: string } | null>;
  perMerchant: (max: number) => object;
  secureCookies?: boolean;
  hub?: PasseHub;
}

const GUEST = "fondaco_guest";
const code = z.object({ code: z.string().regex(/^[A-Za-z2-9]{6}$/) });
const STATUS: Partial<Record<PasseAnswer, number>> = {
  no_room: 404,
  room_full: 409,
  not_started: 409,
  not_your_turn: 409,
  illegal: 422,
  over: 409,
  not_over: 409,
  not_seated: 403,
};

/**
 * The duels on line of the Passe (docs/plan-passe.md P6): open a room, share its code, play. Open
 * to a guest as the Battle is (the same cookie), so that a friend sent the link plays at once.
 */
export function registerPasseRoutes(app: FastifyInstance, deps: PasseRouteDeps): PasseHub {
  const hub = deps.hub ?? new PasseHub(venice1450Passe);
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
  const show = (reply: FastifyReply, id: string, room: string, res: PasseAnswer = "ok") => {
    if (res !== "ok") return reply.code(STATUS[res] ?? 409).send({ error: res });
    const view = hub.view(id, room.toUpperCase(), deps.now());
    if (!view) return reply.code(404).send({ error: "no_room" });
    return toJson({ room: view });
  };

  app.post("/api/passe/room", deps.perMerchant(20), async (req, reply) => {
    const body = z.object({ board: z.string().max(40) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "invalid_input" });
    const id = await player(req, reply);
    const res = hub.open(id, await nameOf(id), body.data.board, deps.now());
    if ("error" in res) return reply.code(404).send(res);
    return show(reply, id, res.code);
  });

  app.get("/api/passe/room/:code", deps.perMerchant(240), async (req, reply) => {
    const p = code.safeParse(req.params);
    if (!p.success) return reply.code(400).send({ error: "invalid_input" });
    return show(reply, await player(req, reply), p.data.code);
  });

  app.post("/api/passe/room/:code/join", deps.perMerchant(30), async (req, reply) => {
    const p = code.safeParse(req.params);
    if (!p.success) return reply.code(400).send({ error: "invalid_input" });
    const id = await player(req, reply);
    const room = p.data.code.toUpperCase();
    return show(reply, id, room, hub.join(id, await nameOf(id), room, deps.now()));
  });

  app.post("/api/passe/room/:code/play", deps.perMerchant(120), async (req, reply) => {
    const p = code.safeParse(req.params);
    const body = z
      .object({ at: z.number().int().min(0).max(400), fire: z.boolean().optional() })
      .safeParse(req.body);
    if (!p.success || !body.success) return reply.code(400).send({ error: "invalid_input" });
    const id = await player(req, reply);
    const room = p.data.code.toUpperCase();
    const move = body.data.fire ? { at: body.data.at, fire: true as const } : { at: body.data.at };
    return show(reply, id, room, hub.play(id, room, move, deps.now()));
  });

  // The screen is ready: the clock starts once both are (docs/plan-duels.md B4).
  app.post("/api/passe/room/:code/ready", deps.perMerchant(30), async (req, reply) => {
    const p = code.safeParse(req.params);
    if (!p.success) return reply.code(400).send({ error: "invalid_input" });
    const id = await player(req, reply);
    const room = p.data.code.toUpperCase();
    return show(reply, id, room, hub.ready(id, room, deps.now()));
  });

  app.post("/api/passe/room/:code/again", deps.perMerchant(30), async (req, reply) => {
    const p = code.safeParse(req.params);
    if (!p.success) return reply.code(400).send({ error: "invalid_input" });
    const id = await player(req, reply);
    const room = p.data.code.toUpperCase();
    return show(reply, id, room, hub.again(id, room, deps.now()));
  });

  return hub;
}
