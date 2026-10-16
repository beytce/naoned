/**
 * Load test: N merchants on one world, through the HTTP API (in process), as in the beta.
 * Each simulated minute: the tick and the bots; every 15 s, the merchants online poll their view
 * (with --push, once a minute, spread out); about once a minute, an online merchant acts. Prints latencies per request kind, throughput and
 * the size of the saved world.
 *
 *   pnpm --filter @comptoirs/server load -- --players 200 --minutes 60
 *   LOAD_DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres pnpm … load
 *
 * With LOAD_DATABASE_URL, a fresh database is created (and dropped) beside the given one.
 */
import { randomBytes } from "node:crypto";
import { parseArgs } from "node:util";
import pg from "pg";
import { SESSION_COOKIE, buildApp } from "../src/app.js";
import { AuthService } from "../src/auth/service.js";
import { openDatabase } from "../src/db/client.js";
import { BotRunner } from "../src/game/bots.js";
import { encode } from "../src/game/serialize.js";
import { GameWorld } from "../src/game/world.js";
import { MemoryMailer } from "../src/mail/mailer.js";

const { values } = parseArgs({
  options: {
    players: { type: "string", default: "200" },
    minutes: { type: "string", default: "60" },
    /** Share of merchants online at a time. */
    online: { type: "string", default: "0.3" },
    seed: { type: "string", default: "1" },
    /**
     * Games on the live line: one fetch a minute, spread over the tick's 20 s, instead of everyone
     * polling every 15 s (and a fetch after each change of theirs, which an action's answer holds).
     */
    push: { type: "boolean", default: false },
  },
});
const N = Number(values.players);
const MINUTES = Number(values.minutes);
const ONLINE = Number(values.online);
let seed = Number(values.seed);
const random = () => {
  seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
  return seed / 2_147_483_648;
};

async function database(): Promise<{ url: string; drop: () => Promise<void> }> {
  const base = process.env.LOAD_DATABASE_URL;
  if (!base) return { url: "pglite:memory", drop: async () => {} };
  const name = `load_${randomBytes(6).toString("hex")}`;
  const admin = new pg.Client({ connectionString: base });
  await admin.connect();
  await admin.query(`create database ${name}`);
  await admin.end();
  const url = new URL(base);
  url.pathname = `/${name}`;
  return {
    url: url.toString(),
    drop: async () => {
      const c = new pg.Client({ connectionString: base });
      await c.connect();
      await c.query(`drop database if exists ${name} with (force)`);
      await c.end();
    },
  };
}

const timings = new Map<string, number[]>();
async function timed<T>(kind: string, fn: () => Promise<T>): Promise<T> {
  const t = performance.now();
  try {
    return await fn();
  } finally {
    const list = timings.get(kind) ?? [];
    list.push(performance.now() - t);
    timings.set(kind, list);
  }
}
const pct = (list: number[], p: number) => {
  const sorted = [...list].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] ?? 0;
};

const db = await database();
const store = openDatabase(db.url);
await store.migrate();
let now = Date.now();
const clock = () => now;
const world = await GameWorld.open(store.db, clock);
const bots = new BotRunner(store.db, world);
await bots.load();
const mailer = new MemoryMailer();
const auth = new AuthService({ db: store.db, mailer, appUrl: "https://load.test" });
const app = await buildApp({
  db: store.db,
  mailer,
  appUrl: "https://load.test",
  production: false,
  world,
});

// Every command the world runs (actions, ticks, bots): how long it takes, save included.
const execute = world.execute.bind(world);
world.execute = (cmd) =>
  timed(`world:${cmd.type === "tick" ? "tick" : "command"}`, () => execute(cmd));

const regions = ["terraferma", "lagoon", "dolomites"];
const cookies: string[] = [];
const started = performance.now();
for (let i = 0; i < N; i++) {
  const email = `load${i}@example.org`;
  await auth.requestLink(email);
  const token = decodeURIComponent(mailer.sent.at(-1)?.text.match(/token=([\w%-]+)/)?.[1] ?? "");
  const { sessionToken } = await auth.verify(token);
  const cookie = `${SESSION_COOKIE}=${sessionToken}`;
  cookies.push(cookie);
  const res = await timed("join", () =>
    app.inject({
      method: "POST",
      url: "/api/game/join",
      headers: { cookie },
      payload: { region: regions[i % regions.length] },
    }),
  );
  if (res.statusCode !== 200) throw new Error(`join ${i}: ${res.statusCode} ${res.body}`);
}
console.log(`${N} marchands inscrits en ${((performance.now() - started) / 1000).toFixed(1)} s`);

const get = (cookie: string, url: string) =>
  timed(`GET ${url}`, () => app.inject({ method: "GET", url, headers: { cookie } }));
const act = (cookie: string, payload: object) =>
  timed(`POST action:${(payload as { type: string }).type}`, () =>
    app.inject({ method: "POST", url: "/api/game/actions", headers: { cookie }, payload }),
  );

const loop = performance.now();
let requests = 0;
let errors = 0;
for (let minute = 0; minute < MINUTES; minute++) {
  now += 60_000;
  await world.execute({ type: "tick" });
  await timed("bots", () => bots.step());
  const online = cookies.filter(() => random() < ONLINE);
  for (let poll = 0; poll < 4; poll++) {
    // Polling: everyone online at once, the worst case of the 15 s polling. Pushed: a quarter of
    // them in each quarter of the minute's spread.
    const group = values.push ? online.filter((_, i) => i % 4 === poll) : online;
    const burst = group.map(async (cookie) => {
      const res = await get(cookie, "/api/game");
      requests++;
      if (res.statusCode !== 200) errors++;
      if ((values.push || poll === 0) && random() < 0.5) {
        const r = random();
        const payload =
          r < 0.5
            ? { type: "collectAndRestart" }
            : r < 0.8
              ? { type: "instantOrder", resource: "wheat", side: "buy", quantity: 1 }
              : { type: "openBale" };
        const a = await act(cookie, payload);
        requests++;
        if (a.statusCode >= 500) errors++;
      }
    });
    await Promise.all(burst);
  }
}
const wall = (performance.now() - loop) / 1000;

const size = JSON.stringify(encode(world.current)).length;
console.log(
  `\n${MINUTES} minutes simulées en ${wall.toFixed(1)} s · ${requests} requêtes (${(requests / wall).toFixed(0)}/s) · ${errors} erreurs`,
);
console.log(
  `Instantané de l'état du monde (écrit une fois par minute) : ${(size / 1024).toFixed(0)} Ko\n`,
);
console.log("| Requête | Nombre | p50 (ms) | p95 (ms) | p99 (ms) | max (ms) |");
console.log("| --- | --- | --- | --- | --- | --- |");
for (const [kind, list] of [...timings].sort()) {
  console.log(
    `| ${kind} | ${list.length} | ${pct(list, 50).toFixed(0)} | ${pct(list, 95).toFixed(0)} | ${pct(list, 99).toFixed(0)} | ${Math.max(...list).toFixed(0)} |`,
  );
}
// Where a view's time goes (CPU only, without the database).
{
  const { playerView, ranking } = await import("../src/game/view.js");
  const id = Object.keys(world.current.players)[0] ?? "";
  const t0 = performance.now();
  for (let i = 0; i < 20; i++) ranking(world.ctx, world.current, now, new Map());
  const t1 = performance.now();
  for (let i = 0; i < 20; i++) playerView(world.ctx, world.current, id, now, []);
  const t2 = performance.now();
  for (let i = 0; i < 5; i++) JSON.stringify(encode(world.current));
  const t3 = performance.now();
  console.log(
    `\nCPU : classement ${((t1 - t0) / 20).toFixed(1)} ms · vue d'un joueur ${((t2 - t1) / 20).toFixed(1)} ms · encodage de l'état ${((t3 - t2) / 5).toFixed(1)} ms`,
  );
}
await app.close();
await store.close();
await db.drop();
