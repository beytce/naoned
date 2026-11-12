// The way in (docs/plan-compte.md C4), on a phone and a computer: the site opens on the board,
// veiled; an address; the link of the mail; the house founded (name and flag); a sand pit built on
// its island. The game's server is started here, on a base in memory, serving the built web.
// Needs the web built (pnpm --filter @comptoirs/web build): node e2e/compte.mjs
// Env: CHROMIUM (a Chromium or headless shell), SHOTS (a folder for the pictures).
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const here = dirname(fileURLToPath(import.meta.url));
const SHOTS = resolve(process.env.SHOTS ?? join(here, "..", "e2e-shots", "compte"));
const log = join(SHOTS, "server.log");
// A base on disk: the server is stopped and started again on it (docs/plan-compte.md C6).
const BASE_DIR = join(SHOTS, "base");
rmSync(BASE_DIR, { recursive: true, force: true });
const port = 3100 + Math.floor(Math.random() * 800);
const fail = (why) => {
  console.error(`compte: ${why}`);
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

let server = await startServer();
/** Each player's cookies, for the walk in real time. */
const cookies = {};
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
    // The site opens on the board, veiled, and asks for an address.
    await page.goto(server.url);
    await page.waitForSelector("[data-planche-entree]", { state: "attached", timeout: 60_000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: join(SHOTS, `compte-${name}-1-entree.png`) });
    const email = `bembo_${name}@example.org`;
    await page.fill("[data-entree-mail]", email, { force: true });
    await page.waitForSelector("[data-entree-ask]:not([disabled])", { state: "attached" });
    await tap("[data-entree-ask]");
    await page
      .waitForSelector("[data-entree-code]", { state: "attached", timeout: 60_000 })
      .catch(async (e) => {
        await page.screenshot({ path: join(SHOTS, `compte-${name}-echec.png`) });
        throw e;
      });
    await page.screenshot({ path: join(SHOTS, `compte-${name}-2-envoye.png`) });
    // The link of the mail: back on the board, signed in; the first time, the house is founded.
    await page.goto(`${server.url}/connexion?token=${await magicLink(email)}`);
    await page.waitForSelector("[data-planche-fonder]", { state: "attached", timeout: 30_000 });
    if (new URL(page.url()).pathname !== "/") fail(`the link leaves the address at ${page.url()}`);
    await page.fill("[data-fonder-name]", name === "p" ? "Bembo" : "Zane", { force: true });
    await tap('.pc-in-colors button[aria-label="Vert de mer"]');
    await tap(".pc-in-charges button:nth-child(2)");
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(SHOTS, `compte-${name}-3-fonder.png`) });
    await page.waitForSelector("[data-fonder-go]:not([disabled])", { state: "attached" });
    await tap("[data-fonder-go]");
    await page.waitForSelector("[data-planche-fonder]", { state: "detached", timeout: 60_000 });
    await page.waitForSelector('[data-house][data-mine="true"]', {
      state: "attached",
      timeout: 30_000,
    });
    await page.waitForTimeout(2500);
    const label = await page.textContent("[data-planche-medallion] b");
    if (!label?.includes(name === "p" ? "Bembo" : "Zane"))
      fail(`the medallion reads « ${label} », not the house's name`);
    await page.screenshot({ path: join(SHOTS, `compte-${name}-4-planche.png`) });
    // The island: a sand pit on the best tile, paid from the purse.
    await tap('[data-house][data-mine="true"]');
    await page.waitForSelector("[data-enter-isle]", { state: "attached", timeout: 60_000 });
    await tap("[data-enter-isle]");
    await page.waitForSelector("[data-ile-screen]", { state: "attached", timeout: 30_000 });
    await page.waitForTimeout(1500);
    await tap("[data-ile-open]");
    await page.waitForSelector('[data-hand="sand_pit"]', { state: "attached", timeout: 60_000 });
    await tap('[data-hand="sand_pit"]');
    await page.waitForSelector(".pc-ile-gain", { state: "attached", timeout: 30_000 });
    await tap('.pc-ile-gain[data-best="true"], .pc-ile-gain');
    await page.waitForSelector("[data-ile-place]:not([disabled])", {
      state: "attached",
      timeout: 60_000,
    });
    await tap("[data-ile-place]");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: join(SHOTS, `compte-${name}-5-sabliere.png`) });
    // The profile, behind the medallion: the way out.
    await tap("[data-ile-back]");
    await page.waitForSelector("[data-planche-lab]", { state: "attached", timeout: 30_000 });
    // The medallion: the house's sheet (its level, the week's Prestige, the path), its façade and
    // its Livre, then the profile (docs/plan-progression-maison.md M4).
    await page.waitForSelector("[data-maison-level]", { state: "attached", timeout: 60_000 });
    await tap("[data-planche-medallion]");
    await page.waitForSelector("[data-maison-sheet]", { state: "attached", timeout: 30_000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(SHOTS, `compte-${name}-6a-maison.png`) });
    await tap("[data-maison-facade]");
    await page.waitForSelector("[data-maison-livre]", { state: "attached", timeout: 30_000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(SHOTS, `compte-${name}-6b-facade.png`) });
    await tap("[data-planche-medallion]");
    await page.waitForSelector("[data-maison-sheet]", { state: "attached", timeout: 30_000 });
    await page.evaluate(() =>
      [...document.querySelectorAll("[data-maison-sheet] button")]
        .find((b) => b.textContent?.includes("Ton profil"))
        ?.click(),
    );
    await page.waitForSelector("[data-planche-profil]", { state: "attached", timeout: 30_000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(SHOTS, `compte-${name}-6-profil.png`) });
    // Signed in again on a new page: the same house, its sand pit still there.
    const again = await browser.newPage({ viewport: { width: w, height: h } });
    await again.context().addCookies(await page.context().cookies());
    await again.goto(server.url);
    await again.waitForSelector('[data-house][data-mine="true"]', {
      state: "attached",
      timeout: 60_000,
    });
    if (await again.$("[data-planche-entree]"))
      fail("signed in, the sheet of the way in shows again");
    if (errs.length) fail(errs.join(" | "));
    console.log(`compte ${name}: ok`);
    cookies[name] = await page.context().cookies();
    await again.close();
    await page.close();
  }
  // In real time (docs/plan-compte.md C5): what one player does shows on the other's board at once.
  if (cookies.p && cookies.d) {
    /** When the other's browser received the line's last message (seen from the network). */
    let frameAt = 0;
    const open = async (who) => {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      await ctx.addCookies(cookies[who]);
      const pg = await ctx.newPage();
      pg.on("websocket", (ws) =>
        ws.on("framereceived", (f) => {
          if (String(f.payload).includes("planche")) frameAt = Date.now();
        }),
      );
      await pg.goto(server.url);
      await pg.waitForSelector('[data-planche-lab][data-live="true"]', {
        state: "attached",
        timeout: 60_000,
      });
      return pg;
    };
    const two = await open("d");
    await two.waitForTimeout(2000);
    const count = () => two.getAttribute("[data-planche-lab]", "data-threads").then(Number);
    const before = await count();
    // The other's page hears the change and reads its board again: that answer is the measure.
    const heard = two.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/planche" && r.request().method() === "GET",
      { timeout: 10_000 },
    );
    const at = Date.now();
    // The gesture is sent from here, with the first player's session: the other page alone is timed.
    const session = cookies.p.map((c) => `${c.name}=${c.value}`).join("; ");
    const tied = await fetch(`${server.url}/api/planche/thread`, {
      method: "POST",
      headers: { cookie: session, "content-type": "application/json" },
      body: JSON.stringify({ city: "rialto", good: "sand" }),
    }).then((r) => r.status);
    if (tied !== 200) fail(`the thread was refused (${tied})`);
    await heard;
    const read = Date.now() - at;
    const took = frameAt ? frameAt - at : read;
    while ((await count()) <= before && Date.now() - at < 15_000) await two.waitForTimeout(25);
    console.log(
      `temps réel : le message chez l'autre en ${took} ms, sa planche relue en ${read} ms, le fil dessiné en ${Date.now() - at} ms (rendu logiciel du test)`,
    );
    if ((await count()) <= before) fail("the other's board never showed the thread");
    if (took > 1000) fail(`the other heard of the thread after ${took} ms`);
  }
  // The test of a deploy (docs/plan-compte.md C6): the server stopped dead, then normally; each
  // time, the house, its island, its thread and its purse are found again, to the denier.
  if (cookies.p) {
    const session = cookies.p.map((c) => `${c.name}=${c.value}`).join("; ");
    const mine = async () => {
      const v = (
        await fetch(`${server.url}/api/planche`, { headers: { cookie: session } }).then((r) =>
          r.json(),
        )
      ).planche;
      const h = v.state.houses[v.me];
      const built = Object.entries(h.ile.tiles)
        .filter(([, t]) => t.building && t.building.type !== "fondaco")
        .map(([k, t]) => `${k}:${t.building.type}`);
      return {
        me: v.me,
        built,
        threads: h.threads.map((t) => `${t.to}|${t.good}`),
        spent: h.book.isle,
        ok: v.ok,
      };
    };
    const before = await mine();
    for (const signal of ["SIGKILL", "SIGTERM"]) {
      await server.stop(signal);
      server = await startServer();
      const after = await mine();
      const same = JSON.stringify(after) === JSON.stringify(before);
      console.log(
        `redéploiement (${signal}) : ${same ? "tout est là" : "DIFFÉRENT"} — ${JSON.stringify(after)}`,
      );
      if (!same)
        fail(`after ${signal}: ${JSON.stringify(after)} instead of ${JSON.stringify(before)}`);
    }
    if (!before.built.length || !before.threads.length)
      fail("nothing was built or stretched before");
  }
} finally {
  await browser.close();
  await server.stop();
}
