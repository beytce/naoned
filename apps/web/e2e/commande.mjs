// The sealed orders (docs/plan-hex-commerce.md H2), on a phone and a computer: a house founded,
// the board read at an hour when its sestiere has an order open and its warehouse full (the board
// the server sends is moved there, the rest is real); the red seal on the town, the order on its
// card, the Passe opened on its position, played and lost, and the try sent to the server.
// Needs the web built (pnpm --filter @comptoirs/web build): node e2e/commande.mjs
// Env: CHROMIUM (a Chromium or headless shell), SHOTS (a folder for the pictures), ONLY (p or d).
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const here = dirname(fileURLToPath(import.meta.url));
const SHOTS = resolve(process.env.SHOTS ?? join(here, "..", "e2e-shots", "commande"));
const log = join(SHOTS, "server.log");
const BASE_DIR = join(SHOTS, "base");
rmSync(BASE_DIR, { recursive: true, force: true });
const port = 3100 + Math.floor(Math.random() * 800);
const DAY = 86_400_000;
const fail = (why) => {
  console.error(`commande: ${why}`);
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
    const token = at >= 0 ? text.slice(at).match(/token=([\w-]+)/)?.[1] : undefined;
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
    const email = `sceau_${name}@example.org`;
    await page.fill("[data-entree-mail]", email, { force: true });
    await page.waitForSelector("[data-entree-ask]:not([disabled])", { state: "attached" });
    await tap("[data-entree-ask]");
    await page.waitForSelector("[data-entree-code]", { state: "attached", timeout: 60_000 });
    await page.goto(`${server.url}/connexion?token=${await magicLink(email)}`);
    await page.waitForSelector("[data-planche-fonder]", { state: "attached", timeout: 30_000 });
    await page.fill("[data-fonder-name]", name === "p" ? "Sceau" : "Cire", { force: true });
    await page.waitForSelector("[data-fonder-go]:not([disabled])", { state: "attached" });
    // From now on, the board the server sends is read at 10 h, the house's warehouse full.
    let tried = null;
    let tower = false;
    const moved = (json) => {
      const st = json?.planche?.state;
      const me = json?.planche?.me;
      if (!st || !me) return json;
      st.now = Math.floor(st.now / DAY) * DAY + 10 * 3_600_000;
      const h = st.houses[me];
      for (const g of [
        "sand",
        "wood",
        "clay",
        "salt",
        "hemp",
        "wheat",
        "glass",
        "bricks",
        "planks",
        "rope",
        "flour",
      ])
        h.stock[g] = 200;
      if (tower) st.passages["canal-1"].holder = me;
      if (tried) st.orders = { ...(st.orders ?? {}), [tried]: { tried: [me] } };
      return json;
    };
    await page.route("**/api/planche", async (route) => {
      const res = await route.fetch();
      await route.fulfill({ response: res, json: moved(await res.json()) });
    });
    let sent = null;
    await page.route("**/api/planche/order", async (route) => {
      sent = route.request().postDataJSON();
      tried = sent?.order ?? null;
      // The real server answers « closed » (its clock is not at 10 h): the one a lost try gets is given.
      await route.fulfill({ status: 409, json: { error: "duel_lost" } });
    });
    await tap("[data-fonder-go]");
    await page.waitForSelector("[data-planche-fonder]", { state: "detached", timeout: 60_000 });
    await page.waitForSelector('[data-city][data-sealed="true"]', {
      state: "attached",
      timeout: 60_000,
    });
    await page.waitForTimeout(2500);
    const sealedCount = await page.locator('[data-city][data-sealed="true"]').count();
    if (sealedCount < 1 || sealedCount > 2) fail(`${sealedCount} towns sealed, not one or two`);
    // The order is told on the thread of news; a touch leads to its town.
    const news = await page.textContent(".pc-planche-news");
    if (!news?.includes("Commande scellée")) fail(`the news reads « ${news} »`);
    await page.screenshot({ path: join(SHOTS, `commande-${name}-1-sceau.png`) });
    await tap(".pc-planche-news button");
    await page.waitForSelector("[data-play-order]:not([disabled])", {
      state: "attached",
      timeout: 30_000,
    });
    await page.waitForTimeout(1500);
    const card = await page.textContent("[data-order]");
    if (!card?.includes("double du prix")) fail(`the order reads « ${card} »`);
    await page.screenshot({ path: join(SHOTS, `commande-${name}-2-fiche.png`) });
    await tap("[data-play-order]");
    await page.waitForSelector("[data-passe-lab]", { state: "attached", timeout: 60_000 });
    await page.waitForTimeout(2000);
    const title = await page.textContent(".pc-passe-title");
    if (!title?.includes("Le fil passe en")) fail(`the Passe reads « ${title} »`);
    await page.screenshot({ path: join(SHOTS, `commande-${name}-3-position.png`) });
    // Two pieces off the key: the position is lost.
    for (let i = 0; i < 49; i++) {
      if (await page.$("[data-passe-end]")) break;
      if ((await page.textContent("[data-passe-turn]"))?.includes("réfléchit")) {
        await page.waitForTimeout(700);
        i--;
        continue;
      }
      await page.evaluate((k) => document.querySelector(`[data-cell="${k}"]`)?.click(), i);
      await page.waitForTimeout(250);
    }
    await page.waitForSelector("[data-passe-end]", { state: "attached", timeout: 30_000 });
    await page.screenshot({ path: join(SHOTS, `commande-${name}-4-perdu.png`) });
    await tap("[data-passe-back]");
    await page
      .waitForSelector("[data-planche-card]", { state: "attached", timeout: 60_000 })
      .catch(() => {});
    for (let i = 0; i < 40 && !sent; i++) await page.waitForTimeout(250);
    if (!sent?.order || !Array.isArray(sent.moves) || !sent.moves.length)
      fail(`the try sent is ${JSON.stringify(sent)}`);
    // The board read again: the try is spent, the order says so.
    await tap('[data-city][data-sealed="true"]');
    for (let i = 0; i < 120 && !(await page.$("[data-play-order][disabled]")); i++)
      await page.waitForTimeout(250);
    if (!(await page.$("[data-play-order][disabled]"))) fail("the spent try is not said");
    await page.waitForTimeout(1200);
    await page.screenshot({ path: join(SHOTS, `commande-${name}-5-essai.png`) });
    // The problem of the day (H3), played on the real server: one try, lost, and said so.
    await tap("[data-planche-card] .pc-pl-x");
    await page.waitForSelector('[data-daily][data-done="no"]', {
      state: "attached",
      timeout: 30_000,
    });
    await tap("[data-daily]");
    await page.waitForSelector("[data-play-daily]", { state: "attached", timeout: 30_000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: join(SHOTS, `commande-${name}-6-jour.png`) });
    await tap("[data-play-daily]");
    await page.waitForSelector("[data-passe-lab]", { state: "attached", timeout: 60_000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: join(SHOTS, `commande-${name}-7-jour-position.png`) });
    for (let i = 0; i < 49; i++) {
      if (await page.$("[data-passe-end]")) break;
      if ((await page.textContent("[data-passe-turn]"))?.includes("réfléchit")) {
        await page.waitForTimeout(700);
        i--;
        continue;
      }
      await page.evaluate((k) => document.querySelector(`[data-cell="${k}"]`)?.click(), i);
      await page.waitForTimeout(250);
    }
    await page.waitForSelector("[data-passe-end]", { state: "attached", timeout: 30_000 });
    await tap("[data-passe-back]");
    for (let i = 0; i < 120 && !(await page.$('[data-daily][data-done="lost"]')); i++)
      await page.waitForTimeout(250);
    if (!(await page.$('[data-daily][data-done="lost"]')))
      fail("the problem of the day is not said played");
    await page.waitForTimeout(1000);
    await page.screenshot({ path: join(SHOTS, `commande-${name}-8-jour-joue.png`) });
    // The prepared guard (H4): one's tower's card, two links laid on its board.
    tower = true;
    for (let i = 0; i < 60 && !(await page.$('[data-passage="canal-1"][data-mine="true"]')); i++)
      await page.waitForTimeout(250);
    await tap('[data-passage="canal-1"]');
    await page.waitForSelector("[data-garde]", { state: "attached", timeout: 30_000 });
    await tap('[data-garde-cell="7"]');
    await tap('[data-garde-cell="17"]');
    await page.waitForTimeout(800);
    const laid = await page.locator('[data-garde-cell][aria-pressed="true"]').count();
    if (laid !== 2) fail(`${laid} links laid, not two`);
    await page.screenshot({ path: join(SHOTS, `commande-${name}-9-garde.png`) });
    if (errs.length) fail(`page errors: ${errs.join(" | ")}`);
    await page.unrouteAll({ behavior: "ignoreErrors" });
    await page.close();
  }
} finally {
  await browser.close();
  await server.stop();
}
