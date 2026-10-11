import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { openDatabase } from "./db/client.js";
import { BotRunner } from "./game/bots.js";
import { GameWorld } from "./game/world.js";
import { ConsoleMailer, ResendMailer } from "./mail/mailer.js";
import { Notifier } from "./notify/notifier.js";
import { NoPusher, WebPusher } from "./notify/push.js";

const config = loadConfig();
const production = config.NODE_ENV === "production";
const database = openDatabase(config.DATABASE_URL);
await database.migrate();

const mailer = config.RESEND_API_KEY
  ? new ResendMailer(config.RESEND_API_KEY, config.MAIL_FROM)
  : new ConsoleMailer();
const world = await GameWorld.open(database.db, Date.now, {
  settingsFromTheme: config.WORLD_SETTINGS_FROM_THEME,
});
world.startTicking();
const bots = new BotRunner(database.db, world);
await bots.load();
bots.start(60_000, (err) => console.error(err));
const pusher =
  config.VAPID_PUBLIC_KEY && config.VAPID_PRIVATE_KEY
    ? new WebPusher(config.VAPID_PUBLIC_KEY, config.VAPID_PRIVATE_KEY, config.VAPID_SUBJECT)
    : new NoPusher();
const notifier = new Notifier(database.db, world, pusher);
notifier.start(60_000, (err) => console.error(err));
world.onEffects((fx, now) => void notifier.fromEffects(fx, now).catch(console.error));
const here = dirname(fileURLToPath(import.meta.url));
const app = await buildApp({
  db: database.db,
  mailer,
  appUrl: config.APP_URL.replace(/\/$/, ""),
  production,
  world,
  notifier,
  webDist: config.WEB_DIST ?? (production ? join(here, "..", "..", "web", "dist") : undefined),
  logger: true,
});

const shutdown = async () => {
  world.stopTicking();
  bots.stop();
  notifier.stop();
  await app.close();
  await database.close();
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

await app.listen({ port: config.PORT, host: config.HOST });

// Six invariants against the journals in the database: at startup, then every hour.
const audit = async () => {
  const violations = await world.checkInvariants();
  if (violations.length > 0) app.log.error({ violations }, "invariant violations");
  else app.log.info("invariants ok");
};
await audit();
setInterval(() => audit().catch((err) => app.log.error(err)), 3_600_000).unref();
