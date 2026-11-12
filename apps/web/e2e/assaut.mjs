// The training assault (docs/plan-guerre.md W3), on a phone and a computer: a house founded; the
// Lido of the corsairs from its card, with the fleet lent to who has none; the guided first round
// (a galley, the south canal, the fireship to the mouth, the round played and told); three rounds
// and the end; then the port's secret ruses kept, the board read as a house of level 10.
// Needs the web built (pnpm --filter @comptoirs/web build): node e2e/assaut.mjs
// Env: CHROMIUM, SHOTS, ONLY (p or d).
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const here = dirname(fileURLToPath(import.meta.url));
const SHOTS = resolve(process.env.SHOTS ?? join(here, "..", "e2e-shots", "assaut"));
const log = join(SHOTS, "server.log");
const BASE_DIR = join(SHOTS, "base");
rmSync(BASE_DIR, { recursive: true, force: true });
const port = 3100 + Math.floor(Math.random() * 800);
const fail = (why) => {
  console.error(`assaut: ${why}`);
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
    const email = `assaut_${name}@example.org`;
    await page.fill("[data-entree-mail]", email, { force: true });
    await page.waitForSelector("[data-entree-ask]:not([disabled])", { state: "attached" });
    await tap("[data-entree-ask]");
    await page.waitForSelector("[data-entree-code]", { state: "attached", timeout: 60_000 });
    await page.goto(`${server.url}/connexion?token=${await magicLink(email)}`);
    await page.waitForSelector("[data-planche-fonder]", { state: "attached", timeout: 120_000 });
    await page.fill("[data-fonder-name]", name === "p" ? "Contarini" : "Gradenigo", {
      force: true,
    });
    await page.waitForSelector("[data-fonder-go]:not([disabled])", { state: "attached" });
    await tap("[data-fonder-go]");
    await page.waitForSelector("[data-planche-fonder]", { state: "detached", timeout: 60_000 });
    await page.waitForSelector('[data-house][data-mine="true"]', {
      state: "attached",
      timeout: 60_000,
    });
    await page.waitForTimeout(2000);
    // The Lido of the corsairs, from one's house.
    await tap('[data-house][data-mine="true"]');
    await page.waitForSelector("[data-open-training-house]", {
      state: "attached",
      timeout: 30_000,
    });
    await tap("[data-open-training-house]");
    await page.waitForSelector("[data-assaut]", { state: "attached", timeout: 30_000 });
    const hint = async () => (await page.textContent("[data-assaut-hint]").catch(() => "")) ?? "";
    if (!(await hint()).includes("galère")) fail(`the guide begins with « ${await hint()} »`);
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(SHOTS, `assaut-${name}-1-lido.png`) });
    // The guided round: a galley to the south canal, the fireship to the mouth, the round.
    await tap('[data-ship="galere"]');
    await tap('[data-send="sud"]');
    await tap('[data-ship="brulot"]');
    await tap('[data-send="bouche"]');
    await page.waitForTimeout(400);
    if (!(await hint()).includes("Lance")) fail(`the guide then says « ${await hint()} »`);
    await page.screenshot({ path: join(SHOTS, `assaut-${name}-2-pose.png`) });
    await tap("[data-assaut-go]");
    await page.waitForSelector("[data-assaut-told] li", { state: "attached", timeout: 10_000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: join(SHOTS, `assaut-${name}-3-manche.png`) });
    // The other ships in, then the two rounds left.
    await tap('[data-ship="galere"]:not([disabled])');
    await tap('[data-send="bouche"]');
    await tap('[data-ship="brigantin"]:not([disabled])');
    await tap('[data-send="bouche"]');
    await tap("[data-assaut-go]");
    await page.waitForTimeout(500);
    await tap("[data-assaut-go]");
    await page.waitForSelector("[data-assaut-end]", { state: "attached", timeout: 10_000 });
    await page.waitForTimeout(1200);
    const end = await page.textContent("[data-assaut-end] h2");
    if (!/sceau/.test(end ?? "")) fail(`the end reads « ${end} »`);
    await page.screenshot({ path: join(SHOTS, `assaut-${name}-4-bilan.png`) });
    await tap("[data-assaut-back]");
    await page.waitForSelector("[data-planche-lab]", { state: "attached", timeout: 30_000 });
    // The port's ruses: one's house read as of level 10, armed.
    const moved = (json) => {
      const hs = json?.planche?.state?.houses?.[json?.planche?.me];
      if (!hs) return json;
      hs.level = 10;
      hs.caps = { bobbins: 6, tiles: 20, tier: 2, towers: 2 };
      hs.stock = { bricks: 80, hemp: 120, glass: 50 };
      hs.ile.tiles["1,0"].building = { type: "arsenal", level: 1, readyAt: 0, carry: 0 };
      hs.port = { bouche: ["tour", "chaine"], nord: ["batterie"], sud: ["tour"] };
      return json;
    };
    await page.route("**/api/planche**", async (route) => {
      const res = await route.fetch();
      const json = await res.json().catch(() => null);
      await route.fulfill({ response: res, json: json ? moved(json) : json });
    });
    let sent = null;
    await page.route("**/api/planche/port/ruses", async (route) => {
      sent = route.request().postDataJSON();
      const res = await page.request.get(`${server.url}/api/planche`);
      await route.fulfill({ json: moved(await res.json()) });
    });
    await page.reload();
    await page.waitForSelector('[data-house][data-mine="true"]', {
      state: "attached",
      timeout: 60_000,
    });
    await page.waitForTimeout(1500);
    await tap('[data-house][data-mine="true"]');
    await page.waitForSelector("[data-open-arsenal-house]", { state: "attached", timeout: 30_000 });
    await tap("[data-open-arsenal-house]");
    await page.waitForSelector("[data-open-port]", { state: "attached", timeout: 30_000 });
    await tap("[data-open-port]");
    await page.waitForSelector("[data-ruses]", { state: "attached", timeout: 30_000 });
    await tap('[data-ruse="bouche:brulot"]');
    await tap('[data-ruse="sud:renforts"]');
    await page.evaluate(() => document.querySelector("[data-port]")?.scrollTo({ top: 10_000 }));
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(SHOTS, `assaut-${name}-5-ruses.png`) });
    await tap("[data-ruses-keep]");
    for (let i = 0; i < 40 && !sent; i++) await page.waitForTimeout(250);
    if (sent?.ruses?.bouche !== "brulot" || sent?.ruses?.sud !== "renforts")
      fail(`the ruses sent are ${JSON.stringify(sent)}`);
    if (errs.length) fail(`page errors: ${errs.join(" | ")}`);
    await page.unrouteAll({ behavior: "ignoreErrors" });
    await page.close();
  }
} finally {
  await browser.close();
  await server.stop();
}
