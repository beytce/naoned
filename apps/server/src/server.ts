import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { openDatabase } from "./db/client.js";
import { GameWorld } from "./game/world.js";
import { ConsoleMailer, ResendMailer } from "./mail/mailer.js";

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
const here = dirname(fileURLToPath(import.meta.url));
const app = await buildApp({
  db: database.db,
  mailer,
  appUrl: config.APP_URL.replace(/\/$/, ""),
  production,
  world,
  webDist: config.WEB_DIST ?? (production ? join(here, "..", "..", "web", "dist") : undefined),
  logger: true,
});

const shutdown = async () => {
  world.stopTicking();
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
