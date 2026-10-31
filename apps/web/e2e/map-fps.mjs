// The empire map's smoothness (the map at the centre, step 3): a pan and a zoom on a phone, the CPU slowed
// four times, the frames counted. Prints the share of frames over 32 ms and the 95th percentile.
//   pnpm --filter @comptoirs/web build && node apps/web/e2e/map-fps.mjs
// Was: the persistent empire's first session (CADRAGE-v3, the socle), on a phone, against a server on
// an empty database in memory that opens the empire's world (WORLD_KIND=empire):
//   pnpm --filter @comptoirs/web build && pnpm --filter @comptoirs/web e2e:empire
// Shots in e2e-shots/empire by default (SHOTS), sizes 390x844 and 320x568 (SIZES).
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { assertNoOverflow, assertSheetHead } from "./assert.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const SHOTS = resolve(process.env.SHOTS ?? join(here, "..", "e2e-shots", "empire"));
const SIZES = (process.env.SIZES ?? "390x844,320x568")
  .split(",")
  .map((s) => s.split("x").map(Number));
const log = join(SHOTS, "server.log");

async function startServer() {
  const serverDir = join(here, "..", "..", "server");
  const tsx = createRequire(join(serverDir, "package.json")).resolve("tsx/cli");
  const port = 3100 + Math.floor(Math.random() * 800);
  const url = `http://127.0.0.1:${port}`;
  mkdirSync(SHOTS, { recursive: true });
  writeFileSync(log, "");
  const child = spawn(process.execPath, [tsx, "src/server.ts"], {
    cwd: serverDir,
    env: {
      ...process.env,
      LANG: "C.UTF-8",
      NODE_ENV: "test",
      DATABASE_URL: "pglite:memory",
      HOST: "127.0.0.1",
      PORT: String(port),
      APP_URL: url,
      WEB_DIST: join(here, "..", "dist"),
      WORLD_KIND: "empire",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let out = "";
  const keep = (chunk) => {
    out += chunk;
    writeFileSync(log, out);
  };
  child.stdout.on("data", keep);
  child.stderr.on("data", keep);
  for (let i = 0; i < 240 && !/Server listening/.test(out); i++) {
    if (child.exitCode !== null) throw new Error(`the server stopped:\n${out.slice(-2000)}`);
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!/Server listening/.test(out)) throw new Error("the server did not start in 60 s");
  return { url, stop: () => child.kill("SIGTERM") };
}

async function magicLink(email) {
  for (let i = 0; i < 50; i++) {
    await new Promise((r) => setTimeout(r, 200));
    const text = readFileSync(log, "utf8");
    const at = text.lastIndexOf(email);
    const token = at >= 0 ? text.slice(at).match(/token=([\w-]+)/)?.[1] : undefined;
    if (token) return token;
  }
  throw new Error("no magic link in the server's log");
}

const server = await startServer();
const browser = await chromium.launch({
  ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}),
});
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: "fr-FR" });
  const email = "fps@example.org";
  await page.goto(server.url);
  await page.fill("input[type=email]", email);
  await page.keyboard.press("Enter");
  await page.goto(`${server.url}/connexion?token=${await magicLink(email)}`);
  await page.waitForSelector("input[autocomplete=nickname]");
  await page.fill("input", "Fps");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: /fonder la maison/i }).click();
  await page.waitForSelector("[data-intro]");
  for (let i = 0; i < 3; i++)
    await page.locator("[data-intro]").getByRole("button", { name: /suivant|commencer/i }).click();
  await page.waitForSelector("[data-map=empire]");
  await page.waitForTimeout(800);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.evaluate(() => {
    const w = window;
    w.__frames = [];
    let last = performance.now();
    const tick = (t) => {
      w.__frames.push(t - last);
      last = t;
      if (!w.__stop) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  // A pan across the map, then a zoom out and in with the wheel, then a pan back.
  await page.mouse.move(200, 400);
  await page.mouse.down();
  for (let i = 0; i < 40; i++) await page.mouse.move(200 - i * 4, 400 + i * 3);
  await page.mouse.up();
  for (let i = 0; i < 10; i++) await page.mouse.wheel(0, 120);
  for (let i = 0; i < 10; i++) await page.mouse.wheel(0, -120);
  await page.mouse.down();
  for (let i = 0; i < 40; i++) await page.mouse.move(40 + i * 4, 520 - i * 3);
  await page.mouse.up();
  await page.waitForTimeout(500);
  const frames = await page.evaluate(() => {
    window.__stop = true;
    return window.__frames.slice(1);
  });
  const sorted = [...frames].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
  const slow = frames.filter((f) => f > 32).length;
  console.log(
    `map frames: ${frames.length}, over 32 ms: ${slow} (${((slow * 100) / Math.max(1, frames.length)).toFixed(1)} %), p95 ${p95.toFixed(1)} ms`,
  );
} finally {
  await browser.close();
  server.stop();
}
