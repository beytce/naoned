// The load bench of the board (docs/plan-socle.md A7): a server of its own (a fresh PGlite base),
// N accounts seated in one lagoon, each listening to the live push as the client does (read the
// board again only when a newer version is told, at most every three seconds), reading on its own
// every 20 s, and making a gesture (a thread stretched or taken back) every G seconds; one burst
// of gestures at the end. Measures the server's processor, the reads and the gestures, its health.
//
//   node bench/charge.mjs [players=48] [gestureSeconds=60] [seconds=60]
// Env: CHARGE_PORT. Prints JSON, and fails (exit 1) beyond the targets: under 10 % of a core on
// average, reads under 200 ms at the 95th centile.
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import http from "node:http";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const serverDir = join(here, "..");
// The WebSocket client of the server's own dependency (@fastify/websocket brings it).
const fromServer = createRequire(join(serverDir, "package.json"));
const WS = createRequire(fromServer.resolve("@fastify/websocket"))("ws");
const N = Number(process.argv[2] ?? 48);
const G = Number(process.argv[3] ?? 60) * 1000;
const DUR = Number(process.argv[4] ?? 60) * 1000;
const POLL = 20_000;
const port = Number(process.env.CHARGE_PORT ?? 3900 + Math.floor(Math.random() * 90));
const work = mkdtempSync(join(tmpdir(), "charge-"));
const log = join(work, "server.log");
mkdirSync(work, { recursive: true });
writeFileSync(log, "");

const child = spawn(process.execPath, ["--import", "tsx", "src/server.ts"], {
  cwd: serverDir,
  env: {
    ...process.env,
    NODE_ENV: "test",
    ANCIEN_JEU: "off",
    DATABASE_URL: `pglite:${join(work, "base")}`,
    HOST: "127.0.0.1",
    PORT: String(port),
    APP_URL: `http://127.0.0.1:${port}`,
    CLOCK_START: "2026-11-16T10:00:00Z",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let out = "";
child.stdout.on("data", (c) => {
  out += c;
  writeFileSync(log, out);
});
child.stderr.on("data", (c) => {
  out += c;
});
for (let i = 0; i < 480 && !/Server listening/.test(out); i++)
  await new Promise((r) => setTimeout(r, 250));
if (!/Server listening/.test(out)) throw new Error("the server did not start");

const agent = new http.Agent({ keepAlive: true, maxSockets: 256 });
const req = (method, path, body, cookie, ip = "127.0.0.1") =>
  new Promise((done) => {
    const data = body ? JSON.stringify(body) : undefined;
    const t0 = performance.now();
    const r = http.request(
      {
        host: "127.0.0.1",
        port,
        path,
        method,
        agent,
        localAddress: ip,
        headers: {
          ...(data ? { "content-type": "application/json" } : {}),
          ...(cookie ? { cookie } : {}),
          "accept-encoding": "gzip",
        },
      },
      (s) => {
        const chunks = [];
        s.on("data", (c) => chunks.push(c));
        s.on("end", () =>
          done({
            status: s.statusCode,
            body: Buffer.concat(chunks).toString(),
            headers: s.headers,
            ms: performance.now() - t0,
          }),
        );
      },
    );
    r.on("error", () => done({ status: 0, body: "", headers: {}, ms: performance.now() - t0 }));
    if (data) r.write(data);
    r.end();
  });

/** An account by its magic link, from its own address (the sign-in is limited by address). */
async function account(k) {
  const ip = `127.0.${1 + Math.floor(k / 200)}.${2 + (k % 200)}`;
  const email = `charge${k}@example.org`;
  await req("POST", "/api/auth/request", { email }, undefined, ip);
  let token;
  for (let i = 0; i < 50 && !token; i++) {
    await new Promise((r) => setTimeout(r, 100));
    const text = readFileSync(log, "utf8");
    const at = text.lastIndexOf(email);
    token = at >= 0 ? text.slice(at).match(/token=([\w-]{43})/)?.[1] : undefined;
  }
  const res = await req("POST", "/api/auth/verify", { token }, undefined, ip);
  const set = [res.headers["set-cookie"] ?? []].flat().map((c) => c.split(";")[0]);
  const cookie = set.join("; ");
  await req("GET", "/api/planche", undefined, cookie, ip);
  return { cookie, ip };
}

const players = [];
for (let k = 0; k < N; k++) players.push(await account(k));

const cpu = () => {
  const f = readFileSync(`/proc/${child.pid}/stat`, "utf8").split(") ")[1].split(" ");
  return (Number(f[11]) + Number(f[12])) * 10;
};
const q = (a, p) => [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(p * a.length))];
const stats = (a) =>
  a.length
    ? {
        n: a.length,
        p50: +q(a, 0.5).toFixed(1),
        p95: +q(a, 0.95).toFixed(1),
        max: +Math.max(...a).toFixed(1),
      }
    : { n: 0 };

const readMs = [];
const gestMs = [];
const health = [];
let pushes = 0;
let stop = false;
// Each client as the board's: read again only for a newer version, at most every two seconds.
const sockets = await Promise.all(
  players.map(
    (p) =>
      new Promise((done) => {
        const s = new WS(`ws://127.0.0.1:${port}/api/live`, {
          headers: { cookie: p.cookie },
          localAddress: p.ip,
        });
        p.known = 0;
        p.last = 0;
        p.soon = null;
        s.on("open", () => done(s));
        s.on("error", () => done(s));
        s.on("message", (d) => {
          if (stop) return;
          const m = JSON.parse(String(d));
          if (m.type !== "planche" || m.version <= p.known || p.soon) return;
          pushes++;
          p.soon = setTimeout(
            async () => {
              p.soon = null;
              p.last = Date.now();
              const r = await req("GET", "/api/planche", undefined, p.cookie, p.ip);
              readMs.push(r.ms);
              p.known = Math.max(p.known, m.version);
            },
            Math.max(0, p.last + 3_000 - Date.now()) + Math.random() * 1_500,
          );
        });
      }),
  ),
);
const c0 = cpu();
const t0 = Date.now();
(async () => {
  while (!stop) {
    health.push((await req("GET", "/api/health")).ms);
    await new Promise((r) => setTimeout(r, 250));
  }
})();
await Promise.all(
  players.map(async (p) => {
    let on = false;
    let nextG = t0 + Math.random() * G;
    let nextP = t0 + Math.random() * POLL;
    while (Date.now() - t0 < DUR) {
      const now = Date.now();
      if (now >= nextG) {
        const r = await req(
          "POST",
          `/api/planche/${on ? "unthread" : "thread"}`,
          { city: "rialto", good: "salt" },
          p.cookie,
          p.ip,
        );
        on = !on;
        gestMs.push(r.ms);
        nextG += G;
      }
      if (now >= nextP) {
        readMs.push((await req("GET", "/api/planche", undefined, p.cookie, p.ip)).ms);
        nextP += POLL;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
  }),
);
const elapsed = Date.now() - t0;
const cpuPct = (100 * (cpu() - c0)) / elapsed;
// A burst: every player at once.
const burst = await Promise.all(
  players.map((p) =>
    req("POST", "/api/planche/thread", { city: "rialto", good: "flour" }, p.cookie, p.ip),
  ),
);
stop = true;
const result = {
  players: N,
  gestureEverySeconds: G / 1000,
  seconds: DUR / 1000,
  cpuPct: +cpuPct.toFixed(1),
  pushes,
  read: stats(readMs),
  gesture: stats(gestMs),
  burst: stats(burst.map((r) => r.ms)),
  health: stats(health),
};
console.log(JSON.stringify(result, null, 2));
for (const s of sockets) s.close();
child.kill("SIGTERM");
await new Promise((r) => setTimeout(r, 1000));
rmSync(work, { recursive: true, force: true });
const ok = cpuPct < 10 && (result.read.p95 ?? 0) < 200;
if (!ok) console.error("charge: beyond the targets (under 10 % of a core, reads under 200 ms p95)");
process.exit(ok ? 0 : 1);
