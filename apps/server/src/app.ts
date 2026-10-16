import { existsSync } from "node:fs";
import { resolve } from "node:path";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import websocket from "@fastify/websocket";
import { sql } from "drizzle-orm";
import Fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
  type FastifyServerOptions,
} from "fastify";
import { ZodError, z } from "zod";
import { deleteAccount, exportAccount } from "./account.js";
import { AuthError, AuthService, SESSION_DAYS } from "./auth/service.js";
import type { Db } from "./db/client.js";
import { registerGameRoutes } from "./game/routes.js";
import type { GameWorld } from "./game/world.js";
import { MailError, type Mailer } from "./mail/mailer.js";
import type { Alerts } from "./monitor.js";
import { Notifier } from "./notify/notifier.js";
import { NoPusher } from "./notify/push.js";

export const SESSION_COOKIE = "comptoirs_session";

export interface AppOptions {
  db: Db;
  mailer: Mailer;
  appUrl: string;
  production: boolean;
  /** Running world; game routes are only registered when present. */
  world?: GameWorld;
  /** E-mails allowed to see the retention dashboard. */
  adminEmails?: string[];
  /** Notifications (bell and push); in-game only by default. */
  notifier?: Notifier;
  /** Built web app to serve (production). */
  webDist?: string;
  now?: () => Date;
  logger?: boolean;
  alerts?: Alerts;
}

/** A request's URL as logged: a sign-in link's token never reaches the logs. */
export function redactUrl(url: string): string {
  return url.replace(/([?&]token=)[^&]*/g, "$1…");
}

/**
 * The headers of every answer: the page's own scripts and styles only, never inside another
 * site's frame, HTTPS remembered in production.
 */
function securityHeaders(appUrl: string, production: boolean): Record<string, string> {
  const live = new URL(appUrl);
  live.protocol = live.protocol === "https:" ? "wss:" : "ws:";
  const headers: Record<string, string> = {
    "content-security-policy": [
      "default-src 'self'",
      "script-src 'self'",
      // React sets styles on elements (the map's markers, the panels).
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      `connect-src 'self' ${live.origin}`,
      "worker-src 'self'",
      "manifest-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
    "x-frame-options": "DENY",
    "x-content-type-options": "nosniff",
    "referrer-policy": "same-origin",
    "cross-origin-opener-policy": "same-origin",
  };
  if (production) headers["strict-transport-security"] = "max-age=31536000; includeSubDomains";
  return headers;
}

export async function buildApp(options: AppOptions): Promise<FastifyInstance> {
  const logger: FastifyServerOptions["logger"] = options.logger
    ? {
        serializers: {
          req: (req: FastifyRequest) => ({
            method: req.method,
            url: redactUrl(req.url),
            remoteAddress: req.ip,
          }),
        },
      }
    : false;
  const app = Fastify({
    logger,
    // Behind Railway's proxy: only the hop next to the server is trusted, so the client's address
    // is the last one of X-Forwarded-For; the ones before are whatever the client wrote.
    trustProxy: options.production ? (_address: string, hop: number) => hop < 1 : false,
  });
  const auth = new AuthService(options);
  const appOrigin = new URL(options.appUrl).origin;
  const headers = securityHeaders(options.appUrl, options.production);

  app.addHook("onSend", async (_req, reply) => {
    reply.headers(headers);
  });

  // A write (or the live line) opened from another site is refused: the session cookie is
  // already kept from them (SameSite), this holds even where it would not be.
  app.addHook("onRequest", async (req, reply) => {
    const origin = req.headers.origin;
    const writes = req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS";
    const live = req.url.startsWith("/api/live");
    if (origin && (writes || live) && origin !== appOrigin) {
      return reply.code(403).send({ error: "forbidden_origin" });
    }
  });

  await app.register(cookie);
  await app.register(rateLimit, { global: false });
  await app.register(websocket, { options: { maxPayload: 1_024 } });

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
    void options.alerts?.alert("Erreur serveur", String((err as Error).stack ?? err));
    return reply.code(500).send({ error: "internal" });
  });

  // For Railway and an uptime monitor: the database answers and the world keeps ticking.
  app.get("/api/health", async (_req, reply) => {
    await options.db.execute(sql`select 1`);
    if (options.world?.stalled()) {
      void options.alerts?.alert("Monde bloqué", "Aucun tick enregistré depuis plus de 5 minutes.");
      return reply.code(503).send({ ok: false, error: "world_stalled" });
    }
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
    const body = z
      .object({ pseudo: z.string().optional(), crest: z.unknown().optional() })
      .parse(req.body);
    let updated = account;
    if (body.pseudo !== undefined) updated = await auth.setPseudo(account.id, body.pseudo);
    if (body.crest !== undefined) updated = await auth.setCrest(account.id, body.crest);
    return { account: updated };
  });

  /** GDPR: everything the game keeps about the player, as a JSON file. */
  app.get("/api/me/export", async (req, reply) => {
    const account = await auth.accountForSession(req.cookies[SESSION_COOKIE]);
    if (!account) return reply.code(401).send({ error: "unauthenticated" });
    const data = await exportAccount(options.db, account.id);
    reply.header("content-disposition", 'attachment; filename="fondaco-mes-donnees.json"');
    return JSON.parse(
      JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? v.toString() : v)),
    ) as unknown;
  });

  /** GDPR: deletes the account, after typing SUPPRIMER. */
  app.delete("/api/me", async (req, reply) => {
    const account = await auth.accountForSession(req.cookies[SESSION_COOKIE]);
    if (!account) return reply.code(401).send({ error: "unauthenticated" });
    const { confirm } = z.object({ confirm: z.string() }).parse(req.body ?? {});
    if (confirm !== "SUPPRIMER") return reply.code(400).send({ error: "confirm_required" });
    await deleteAccount(options.db, account.id);
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
    return reply.code(204).send();
  });

  if (options.world) {
    registerGameRoutes(app, {
      db: options.db,
      world: options.world,
      auth,
      sessionCookie: SESSION_COOKIE,
      notifier: options.notifier ?? new Notifier(options.db, options.world, new NoPusher()),
      adminEmails: options.adminEmails ?? [],
    });
  }

  const webDist = options.webDist ? resolve(options.webDist) : undefined;
  if (webDist && existsSync(webDist)) {
    // Files are looked up on each request, so a rebuilt app is served without a restart.
    await app.register(fastifyStatic, { root: webDist });
    // Single-page app: page routes get index.html; a missing file (old cached asset) is a 404,
    // never HTML in place of a script.
    app.setNotFoundHandler((req, reply) => {
      const path = req.url.split("?")[0] ?? "";
      const isPage =
        req.method === "GET" && !path.startsWith("/api/") && !/\.[a-z0-9]+$/i.test(path);
      if (isPage) return reply.type("text/html").sendFile("index.html");
      return reply.code(404).send({ error: "not_found" });
    });
  }

  return app;
}
