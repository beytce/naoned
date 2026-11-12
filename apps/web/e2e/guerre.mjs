// The War of the week (docs/plan-guerre.md W4), on a phone and a computer: a house founded; the
// War's sheet with the flotillas the server really formed across its lagoons (the score, the ports
// of the other flotilla); an assault launched on one of them and played over three rounds; back to
// the War, its seals counted. The board the page reads is that of an armed house (three galleys),
// and the server's answers to the assault are states the engine played beforehand
// (e2e/fixtures/guerre-assaut.json): the server's own assault is tested in apps/server.
// Needs the web built (pnpm --filter @comptoirs/web build): node e2e/guerre.mjs
// Env: CHROMIUM, SHOTS, ONLY (p or d).
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const here = dirname(fileURLToPath(import.meta.url));
const SHOTS = resolve(process.env.SHOTS ?? join(here, "..", "e2e-shots", "guerre"));
const log = join(SHOTS, "server.log");
const BASE_DIR = join(SHOTS, "base");
rmSync(BASE_DIR, { recursive: true, force: true });
const port = 3100 + Math.floor(Math.random() * 800);
const FIX = JSON.parse(readFileSync(join(here, "fixtures", "guerre-assaut.json"), "utf8"));
const fail = (why) => {
  console.error(`guerre: ${why}`);
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
    /** Waits for an element by asking the page (Playwright's wait stalls while WebGL draws slowly). */
    const until = async (q, ms = 30_000) => {
      for (let i = 0; i < ms / 250; i++) {
        if (await page.$(q)) return;
        await page.waitForTimeout(250);
      }
      await page.screenshot({ path: join(SHOTS, `guerre-${name}-echec.png`) });
      throw new Error(`no ${q} after ${ms} ms`);
    };
    await page.goto(server.url);
    await page.waitForSelector("[data-planche-entree]", { state: "attached", timeout: 60_000 });
    const email = `guerre_${name}@example.org`;
    await page.fill("[data-entree-mail]", email, { force: true });
    await page.waitForSelector("[data-entree-ask]:not([disabled])", { state: "attached" });
    await tap("[data-entree-ask]");
    await page.waitForSelector("[data-entree-code]", { state: "attached", timeout: 60_000 });
    await page.goto(`${server.url}/connexion?token=${await magicLink(email)}`);
    await page.waitForSelector("[data-planche-fonder]", { state: "attached", timeout: 120_000 });
    await page.fill("[data-fonder-name]", name === "p" ? "Mocenigo" : "Venier", { force: true });
    await page.waitForSelector("[data-fonder-go]:not([disabled])", { state: "attached" });
    // The board read as that of an armed house: three galleys.
    await page.route("**/api/planche**", async (route) => {
      const res = await route.fetch();
      const json = await res.json().catch(() => null);
      const hs = json?.planche?.state?.houses?.[json?.planche?.me];
      if (hs) {
        hs.level = 10;
        hs.fleet = {
          ships: [1, 2, 3].map((id) => ({ id, kind: "galere", level: 1 })),
          yards: [],
          next: 4,
        };
      }
      await route.fulfill({ response: res, json });
    });
    let round = 0;
    const sent = [];
    // The War: its view is the server's; the assault's answers are the engine's, played beforehand.
    await page.route("**/api/guerre/start", async (route) => {
      sent.push(route.request().postDataJSON());
      round = 0;
      await route.fulfill({ json: { assaut: FIX.states[0] } });
    });
    await page.route("**/api/guerre/round", async (route) => {
      round += 1;
      sent.push(route.request().postDataJSON());
      await route.fulfill({
        json: { assaut: FIX.states[round], ...(round === 3 ? { result: FIX.result } : {}) },
      });
    });
    await tap("[data-fonder-go]");
    await page.waitForSelector("[data-planche-fonder]", { state: "detached", timeout: 60_000 });
    await page.waitForSelector("[data-guerre-open]", { state: "attached", timeout: 60_000 });
    await page.waitForTimeout(1500);
    await tap("[data-guerre-open]");
    await until("[data-guerre]");
    await page.waitForTimeout(1200);
    const ports = await page.locator("[data-guerre-port]").count();
    if (ports !== 6) fail(`${ports} ports in the other flotilla, not six`);
    await page.screenshot({ path: join(SHOTS, `guerre-${name}-1-carte.png`) });
    await until("[data-assaillir]:not([disabled])");
    await tap("[data-assaillir]:not([disabled])");
    await until("[data-assaut]");
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(SHOTS, `guerre-${name}-2-assaut.png`) });
    // The three galleys: one to the north canal, two to the south; three rounds.
    const send = async (id, pass) => {
      await tap(`[data-id="${id}"]`);
      await tap(`[data-send="${pass}"]`);
    };
    await send(1, "nord");
    await send(2, "sud");
    await send(3, "sud");
    await tap("[data-assaut-go]");
    await until("[data-assaut-told] li");
    await page.waitForTimeout(1200);
    await page.screenshot({ path: join(SHOTS, `guerre-${name}-3-manche.png`) });
    // Each round once the server has answered the last (the round's label has moved on).
    const next = async (n) => {
      for (let i = 0; i < 80; i++) {
        if (((await page.textContent("[data-assaut-manche]")) ?? "").includes(`Manche ${n}`)) break;
        await page.waitForTimeout(250);
      }
      await tap("[data-assaut-go]");
    };
    await next(2);
    await next(3);
    await until("[data-assaut-end]");
    await page.waitForTimeout(1000);
    await page.screenshot({ path: join(SHOTS, `guerre-${name}-4-bilan.png`) });
    const first = sent[1]?.moves ?? {};
    if (first["1"] !== "nord" || first["2"] !== "sud" || first["3"] !== "sud")
      fail(`the first round sent ${JSON.stringify(sent[1])}`);
    await tap("[data-assaut-back]");
    await until("[data-guerre]");
    await page.waitForTimeout(1000);
    await page.screenshot({ path: join(SHOTS, `guerre-${name}-5-retour.png`) });
    if (errs.length) fail(`page errors: ${errs.join(" | ")}`);
    await page.unrouteAll({ behavior: "ignoreErrors" });
    await page.close();
  }
} finally {
  await browser.close();
  await server.stop();
}
