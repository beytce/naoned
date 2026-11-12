// The Arsenal and the port (docs/plan-arsenal.md A4), on a phone and a computer: a house founded,
// the board it reads moved to a house of level 6 with an Arsenal, a hull on its cale, two ships (one
// damaged) and a tower in its port; the Power and the fleet in its card, the Arsenal's sheet (the
// first visit told), a ship laid, the port, the Arsenal in the island, the fleet at anchor.
// Needs the web built (pnpm --filter @comptoirs/web build): node e2e/arsenal.mjs
// Env: CHROMIUM, SHOTS, ONLY (p or d).
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const here = dirname(fileURLToPath(import.meta.url));
const SHOTS = resolve(process.env.SHOTS ?? join(here, "..", "e2e-shots", "arsenal"));
const log = join(SHOTS, "server.log");
const BASE_DIR = join(SHOTS, "base");
rmSync(BASE_DIR, { recursive: true, force: true });
const port = 3100 + Math.floor(Math.random() * 800);
const HOUR = 3_600_000;
const fail = (why) => {
  console.error(`arsenal: ${why}`);
  process.exitCode = 1;
};

async function startServer() {
  const serverDir = join(here, "..", "..", "server");
  const url = `http://127.0.0.1:${port}`;
  mkdirSync(SHOTS, { recursive: true });
  writeFileSync(log, "");
  // The server is this process's own child (no runner in between): a signal stops it for real.
  // `--import tsx` is resolved from the server's folder, where tsx is installed.
  const child = spawn(process.execPath, ["--import", "tsx", "src/server.ts"], {
    cwd: serverDir,
    env: {
      ...process.env,
      LANG: "C.UTF-8",
      NODE_ENV: "test",
      DATABASE_URL: `pglite:${BASE_DIR}`,
      HOST: "127.0.0.1",
      PORT: String(port),
      APP_URL: url,
      WEB_DIST: join(here, "..", "dist"),
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
  return {
    url,
    stop: (signal = "SIGTERM") =>
      new Promise((done) => {
        if (child.exitCode !== null) return done();
        child.once("exit", () => done());
        child.kill(signal);
      }),
  };
}

async function magicLink(email) {
  for (let i = 0; i < 50; i++) {
    await new Promise((r) => setTimeout(r, 200));
    const text = readFileSync(log, "utf8");
    const at = text.lastIndexOf(email);
    // The whole token (43 characters): the log may be read while the line is still being written.
    const token = at >= 0 ? text.slice(at).match(/token=([\w-]{43})/)?.[1] : undefined;
    if (token) return token;
  }
  throw new Error("no magic link in the server's log");
}

const server = await startServer();
const browser = await chromium.launch({
  ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}),
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
try {
  for (const [name, w, h] of [
    ["p", 390, 844],
    ["d", 1280, 800],
  ].filter(([n]) => !process.env.ONLY || process.env.ONLY === n)) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, locale: "fr-FR" });
    const errs = [];
    page.on("pageerror", (e) => errs.push(e.message));
    const tap = (q) => page.evaluate((s) => document.querySelector(s)?.click(), q);
    await page.goto(server.url);
    await page.waitForSelector("[data-planche-entree]", { state: "attached", timeout: 60_000 });
    const email = `arsenal_${name}@example.org`;
    await page.fill("[data-entree-mail]", email, { force: true });
    await page.waitForSelector("[data-entree-ask]:not([disabled])", { state: "attached" });
    await tap("[data-entree-ask]");
    await page.waitForSelector("[data-entree-code]", { state: "attached", timeout: 60_000 });
    await page.goto(`${server.url}/connexion?token=${await magicLink(email)}`);
    await page
      .waitForSelector("[data-planche-fonder]", { state: "attached", timeout: 120_000 })
      .catch(async (e) => {
        await page.screenshot({ path: join(SHOTS, `arsenal-${name}-echec.png`) });
        throw e;
      });
    await page.fill("[data-fonder-name]", name === "p" ? "Loredan" : "Morosini", { force: true });
    await page.waitForSelector("[data-fonder-go]:not([disabled])", { state: "attached" });
    // From now on, one's house is of level 10, armed (the rest of the board is the server's).
    const moved = (json) => {
      const st = json?.planche?.state;
      const me = json?.planche?.me;
      const hs = st?.houses?.[me];
      if (!hs) return json;
      hs.level = 10;
      hs.caps = { bobbins: 6, tiles: 20, tier: 2, towers: 2 };
      hs.stock = { wood: 200, hemp: 120, salt: 30, bricks: 80, glass: 50, sand: 40 };
      hs.ile.tiles["1,0"].building = { type: "arsenal", level: 1, readyAt: 0, carry: 0 };
      hs.fleet = {
        ships: [
          { id: 1, kind: "galere", level: 1 },
          { id: 2, kind: "brigantin", level: 1, damaged: true },
        ],
        yards: [{ kind: "galere", level: 1, readyAt: st.now + 2 * HOUR }],
        next: 3,
      };
      hs.port = { bouche: ["tour"], nord: [], sud: [] };
      return json;
    };
    // Every answer that carries the board (the founding's too), not only its reading.
    await page.route("**/api/planche**", async (route) => {
      const res = await route.fetch();
      const json = await res.json().catch(() => null);
      await route.fulfill({ response: res, json: json ? moved(json) : json });
    });
    const sent = [];
    await page.route("**/api/planche/{arsenal,port}/**", async (route) => {
      sent.push({
        url: new URL(route.request().url()).pathname,
        body: route.request().postDataJSON(),
      });
      const res = await page.request.get(`${server.url}/api/planche`);
      await route.fulfill({ json: moved(await res.json()) });
    });
    await tap("[data-fonder-go]");
    await page.waitForSelector("[data-planche-fonder]", { state: "detached", timeout: 60_000 });
    await page.waitForSelector('[data-house][data-mine="true"]', {
      state: "attached",
      timeout: 60_000,
    });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: join(SHOTS, `arsenal-${name}-1-planche.png`) });
    // One's house: its Power and its fleet; the way to the Arsenal.
    await tap('[data-house][data-mine="true"]');
    await page.waitForSelector("[data-house-power]", { state: "attached", timeout: 30_000 });
    const power = await page.textContent("[data-house-power] b");
    if (!/Puissance \d+/.test(power ?? "")) fail(`the house's card reads « ${power} »`);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: join(SHOTS, `arsenal-${name}-2-maison.png`) });
    await tap("[data-open-arsenal-house]");
    await page.waitForSelector("[data-arsenal]", { state: "attached", timeout: 30_000 });
    if (!(await page.$("[data-arsenal-first]"))) fail("the first visit is not told");
    await page.waitForTimeout(1200);
    await page.screenshot({ path: join(SHOTS, `arsenal-${name}-3-arsenal.png`) });
    // A brigantine laid on the free cale.
    await page.waitForSelector('[data-lay-ship="brigantin"]:not([disabled])', {
      state: "attached",
    });
    await tap('[data-lay-ship="brigantin"]');
    for (let i = 0; i < 40 && !sent.length; i++) await page.waitForTimeout(250);
    if (sent[0]?.url !== "/api/planche/arsenal/ship" || sent[0]?.body?.kind !== "brigantin")
      fail(`the ship sent is ${JSON.stringify(sent[0])}`);
    await page.evaluate(() => document.querySelector("[data-arsenal]")?.scrollTo({ top: 10_000 }));
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(SHOTS, `arsenal-${name}-4-chantier.png`) });
    // The port: three passes, a tower on the mouth, a chain laid on the north canal.
    await tap("[data-open-port]");
    await page.waitForSelector("[data-port]", { state: "attached", timeout: 30_000 });
    await tap('[data-defense-hand="chaine"]');
    await page.waitForTimeout(300);
    await tap('[data-build-defense="nord:chaine"]');
    for (let i = 0; i < 40 && sent.length < 2; i++) await page.waitForTimeout(250);
    if (sent[1]?.url !== "/api/planche/port/build")
      fail(`the defense sent is ${JSON.stringify(sent[1])}`);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: join(SHOTS, `arsenal-${name}-5-port.png`) });
    // The island: the Arsenal on its tile, and its card opens the Arsenal.
    await tap("[data-planche-card] .pc-pl-x");
    await tap('[data-house][data-mine="true"]');
    await page.waitForSelector("[data-enter-isle]", { state: "attached", timeout: 30_000 });
    await tap("[data-enter-isle]");
    await page.waitForSelector("[data-ile-screen]", { state: "attached", timeout: 60_000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: join(SHOTS, `arsenal-${name}-6-ile.png`) });
    if (errs.length) fail(`page errors: ${errs.join(" | ")}`);
    await page.unrouteAll({ behavior: "ignoreErrors" });
    await page.close();
  }
} finally {
  await browser.close();
  await server.stop();
}
