import { existsSync } from "node:fs";
import { resolve } from "node:path";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import { sql } from "drizzle-orm";
import Fastify, { type FastifyInstance, type FastifyReply } from "fastify";
import { ZodError, z } from "zod";
import { AuthError, AuthService, SESSION_DAYS } from "./auth/service.js";
import type { Db } from "./db/client.js";
import { registerGameRoutes } from "./game/routes.js";
import type { GameWorld } from "./game/world.js";
import { MailError, type Mailer } from "./mail/mailer.js";

export const SESSION_COOKIE = "comptoirs_session";

export interface AppOptions {
  db: Db;
  mailer: Mailer;
  appUrl: string;
  production: boolean;
  /** Running world; game routes are only registered when present. */
  world?: GameWorld;
  /** Built web app to serve (production). */
  webDist?: string;
  now?: () => Date;
  logger?: boolean;
}

export async function buildApp(options: AppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? false, trustProxy: options.production });
  const auth = new AuthService(options);

  await app.register(cookie);
  await app.register(rateLimit, { global: false });

  const setSession = (reply: FastifyReply, token: string) =>
    reply.setCookie(SESSION_COOKIE, token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: options.production,
      maxAge: SESSION_DAYS * 86_400,
    });

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ZodError) {
      return reply
        .code(400)
        .send({ error: "invalid_input", issues: err.issues.map((i) => i.message) });
    }
    if (err instanceof AuthError) {
      const status = { invalid_token: 400, pseudo_taken: 409, too_many_requests: 429 }[err.code];
      return reply.code(status).send({ error: err.code });
    }
    if (err instanceof MailError) {
      app.log.error(err);
      return reply.code(502).send({ error: "mail_unavailable" });
    }
    if ((err as { statusCode?: number }).statusCode === 429) {
      return reply.code(429).send({ error: "too_many_requests" });
    }
    app.log.error(err);
    return reply.code(500).send({ error: "internal" });
  });

  app.get("/api/health", async () => {
    await options.db.execute(sql`select 1`);
    return { ok: true };
  });

  app.post(
    "/api/auth/request",
    { config: { rateLimit: { max: 10, timeWindow: "15 minutes" } } },
    async (req, reply) => {
      const { email } = z.object({ email: z.string() }).parse(req.body);
      await auth.requestLink(email);
      return reply.code(202).send({ ok: true });
    },
  );

  app.post(
    "/api/auth/verify",
    { config: { rateLimit: { max: 20, timeWindow: "15 minutes" } } },
    async (req, reply) => {
      const { token } = z.object({ token: z.string().min(1).max(200) }).parse(req.body);
      const { sessionToken, account } = await auth.verify(token);
      setSession(reply, sessionToken);
      return { account };
    },
  );

  app.post("/api/auth/logout", async (req, reply) => {
    await auth.logout(req.cookies[SESSION_COOKIE]);
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
    return reply.code(204).send();
  });

  app.get("/api/me", async (req, reply) => {
    const account = await auth.accountForSession(req.cookies[SESSION_COOKIE]);
    if (!account) return reply.code(401).send({ error: "unauthenticated" });
    return { account };
  });

  app.patch("/api/me", async (req, reply) => {
    const account = await auth.accountForSession(req.cookies[SESSION_COOKIE]);
    if (!account) return reply.code(401).send({ error: "unauthenticated" });
    const { pseudo } = z.object({ pseudo: z.string() }).parse(req.body);
    return { account: await auth.setPseudo(account.id, pseudo) };
  });

  if (options.world) {
    registerGameRoutes(app, {
      db: options.db,
      world: options.world,
      auth,
      sessionCookie: SESSION_COOKIE,
    });
  }

  const webDist = options.webDist ? resolve(options.webDist) : undefined;
  if (webDist && existsSync(webDist)) {
    await app.register(fastifyStatic, { root: webDist, wildcard: false });
    // Single-page app: every non-API GET that is not a file gets index.html.
    app.setNotFoundHandler((req, reply) => {
      if (req.method === "GET" && !req.url.startsWith("/api/")) return reply.sendFile("index.html");
      return reply.code(404).send({ error: "not_found" });
    });
  }

  return app;
}
