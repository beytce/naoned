import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { openDatabase } from "./db/client.js";
import { BotRunner } from "./game/bots.js";
import { GameWorld } from "./game/world.js";
import { ConsoleMailer, ResendMailer } from "./mail/mailer.js";
import { Alerts } from "./monitor.js";
import { Notifier } from "./notify/notifier.js";
import { NoPusher, WebPusher } from "./notify/push.js";

const config = loadConfig();
const production = config.NODE_ENV === "production";
const database = openDatabase(config.DATABASE_URL);
await database.migrate();

const mailer = config.RESEND_API_KEY
  ? new ResendMailer(config.RESEND_API_KEY, config.MAIL_FROM)
  : new ConsoleMailer();
// Resend's test sender only delivers to the address of the Resend account itself: anyone else
// asking for a sign-in link gets "mail_unavailable".
if (config.RESEND_API_KEY && config.MAIL_FROM.includes("@resend.dev")) {
  console.warn(
    "[mail] MAIL_FROM uses resend.dev: links reach only the Resend account's own address. Verify a domain in Resend and set MAIL_FROM (docs/deploiement.md).",
  );
}
const alerts = new Alerts(config.ALERT_WEBHOOK_URL);
process.on("unhandledRejection", (reason) => {
  console.error(reason);
  void alerts.alert("Erreur non gérée", String((reason as Error)?.stack ?? reason));
});
const world = await GameWorld.open(database.db, Date.now, {
  settingsFromTheme: config.WORLD_SETTINGS_FROM_THEME,
  ...(config.WORLD_SETTINGS_OVERRIDE ? { settingsOverride: config.WORLD_SETTINGS_OVERRIDE } : {}),
});
world.startTicking();
const bots = new BotRunner(database.db, world);
await bots.load();
world.onSeasonOpened((closed) => void bots.newSeason(closed).catch(console.error));
bots.start(60_000, (err) => console.error(err));
const pusher =
  config.VAPID_PUBLIC_KEY && config.VAPID_PRIVATE_KEY
    ? new WebPusher(config.VAPID_PUBLIC_KEY, config.VAPID_PRIVATE_KEY, config.VAPID_SUBJECT)
    : new NoPusher();
const notifier = new Notifier(database.db, world, pusher);
notifier.start(60_000, (err) => console.error(err));
world.onEffects((fx, now) => void notifier.fromEffects(fx, now).catch(console.error));
world.onSeasonOpened((closed) => void notifier.seasonOpened(closed).catch(console.error));
const here = dirname(fileURLToPath(import.meta.url));
const app = await buildApp({
  db: database.db,
  mailer,
  appUrl: config.APP_URL.replace(/\/$/, ""),
  production,
  world,
  notifier,
  adminEmails: config.ADMIN_EMAILS.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  ...(config.COMMUNITY_URL ? { communityUrl: config.COMMUNITY_URL } : {}),
  webDist: config.WEB_DIST ?? (production ? join(here, "..", "..", "web", "dist") : undefined),
  logger: true,
  alerts,
});

const shutdown = async () => {
  world.stopTicking();
  bots.stop();
  notifier.stop();
  await app.close();
  // The next start replays nothing (a lost world writes nothing).
  await world.snapshot().catch(console.error);
  await database.close();
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
// A deploy: the new instance has taken the world over. This one stops (exit code 0, so that the
// restart policy does not bring it back).
world.onLostOwnership(() => {
  app.log.warn("another instance took the world over: stopping");
  void alerts.alert(
    "Relève de déploiement",
    "L'ancienne instance s'arrête : la nouvelle a repris le monde.",
  );
  void shutdown();
});

await app.listen({ port: config.PORT, host: config.HOST });

// Six invariants against the journals in the database: at startup, then every hour.
const audit = async () => {
  const violations = await world.checkInvariants();
  if (violations.length > 0) {
    app.log.error({ violations }, "invariant violations");
    void alerts.alert("Écart du grand livre", JSON.stringify(violations));
  } else app.log.info("invariants ok");
};
await audit();
setInterval(() => audit().catch((err) => app.log.error(err)), 3_600_000).unref();
