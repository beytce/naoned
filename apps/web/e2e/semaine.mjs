// A whole week on the board (docs/plan-muda.md N8), on a phone and a computer, the server started
// again each day at a chosen hour on the same base (CLOCK_START), its lagoon living in between:
//  - Monday: a house founded; the black straits and the Muda's convoy at its pier on the board;
//    the Muda's sheet (it loads from Wednesday), a black strait shut below level 11;
//  - Wednesday: a thread to the pier of San Marco: the hold fills;
//  - Saturday: the convoy at sea; a strait of the Muda played (on the real server); a black strait
//    with a cargo (the board the page reads is moved to level 11; the try is answered as lost),
//    and the relics and the plans in the Livre;
//  - Sunday: the Gazette, written by the server from the week.
// Needs the web built (pnpm --filter @comptoirs/web build): node e2e/semaine.mjs
// Env: CHROMIUM, SHOTS, ONLY (p or d; the script runs each alone, one lagoon each).
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { stubDuel } from "./duel-stub.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const SHOTS = resolve(process.env.SHOTS ?? join(here, "..", "e2e-shots", "semaine"));
const log = join(SHOTS, "server.log");
const BASE_DIR = join(SHOTS, "base");
rmSync(BASE_DIR, { recursive: true, force: true });
const port = 3100 + Math.floor(Math.random() * 800);
const fail = (why) => {
  console.error(`semaine: ${why}`);
  process.exitCode = 1;
};
const DAYS = {
  lundi: "2026-11-16T10:00:00Z",
  mercredi: "2026-11-18T10:00:00Z",
  samedi: "2026-11-21T10:00:00Z",
  dimanche: "2026-11-22T10:00:00Z",
};

async function startServer(clock) {
  const serverDir = join(here, "..", "..", "server");
  const url = `http://127.0.0.1:${port}`;
  mkdirSync(SHOTS, { recursive: true });
  writeFileSync(log, "");
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
      CLOCK_START: clock,
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
  for (let i = 0; i < 480 && !/Server listening/.test(out); i++) {
    if (child.exitCode !== null) throw new Error(`the server stopped:\n${out.slice(-2000)}`);
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!/Server listening/.test(out)) throw new Error("the server did not start in 120 s");
  return {
    url,
    stop: () =>
      new Promise((done) => {
        if (child.exitCode !== null) return done();
        child.once("exit", () => done());
        child.kill("SIGTERM");
      }),
  };
}

async function magicLink(email) {
  for (let i = 0; i < 50; i++) {
    await new Promise((r) => setTimeout(r, 200));
    const text = readFileSync(log, "utf8");
    const at = text.lastIndexOf(email);
    const token = at >= 0 ? text.slice(at).match(/token=([\w-]{43})/)?.[1] : undefined;
    if (token) return token;
  }
  throw new Error("no magic link in the server's log");
}

/** Polls a condition in the page (a selector wait stalls while the software WebGL draws). */
async function until(page, f, arg, ms = 90_000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await page.evaluate(f, arg).catch(() => false)) return true;
    await page.waitForTimeout(400);
  }
  return false;
}
const has = (s) => !!document.querySelector(s);

const browser = await chromium.launch({
  ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}),
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const views = [
  ["p", 390, 844],
  ["d", 1280, 800],
].filter(([n]) => !process.env.ONLY || process.env.ONLY === n);
let server = await startServer(DAYS.lundi);
try {
  const pages = [];
  for (const [name, w, h] of views) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: "fr-FR" });
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push(e.message));
    const tap = (q) => page.evaluate((s) => document.querySelector(s)?.click(), q);
    const shot = async (file) => {
      await page.bringToFront();
      await page.waitForTimeout(800);
      await page.screenshot({ path: join(SHOTS, `semaine-${name}-${file}.png`) });
    };
    // The board the page reads may be moved (the black strait at level 11, relics in store).
    const moves = { level: 0, relics: null };
    await page.route("**/api/planche", async (route) => {
      // The server is started again between two days: a read then finds no one.
      const res = await route.fetch().catch(() => null);
      if (!res) return route.abort().catch(() => {});
      const json = await res.json();
      const st = json?.planche?.state;
      const me = json?.planche?.me;
      if (st && me && moves.level) {
        const hh = st.houses[me];
        hh.level = moves.level;
        hh.stock.glass = 120;
        hh.stock.salt = 120;
        if (moves.relics) {
          hh.relics = moves.relics;
          hh.plans = 1;
        }
      }
      await route.fulfill({ response: res, json });
    });
    let noirSent = null;
    // The real house is not of level 11: a duel lost is given.
    await stubDuel(page, (ask) => {
      noirSent = ask;
    });
    pages.push({ name, page, tap, shot, errs, moves, noir: () => noirSent });
  }

  /** Plays the Passe on screen until its end, laying pieces in order (the duel is lost). */
  const playOut = async (p) => {
    for (let i = 0; i < 81; i++) {
      if (await p.page.$("[data-passe-end]")) break;
      if ((await p.page.textContent("[data-passe-turn]"))?.includes("réfléchit")) {
        await p.page.waitForTimeout(700);
        i--;
        continue;
      }
      await p.page.evaluate((k) => document.querySelector(`[data-cell="${k}"]`)?.click(), i);
      await p.page.waitForTimeout(250);
    }
    if (!(await until(p.page, has, "[data-passe-end]", 60_000)))
      fail(`${p.name}: no end to the duel`);
  };

  // Monday: a house founded; the board with the black straits; the Muda's sheet.
  for (const p of pages) {
    const { page, name, tap } = p;
    await page.bringToFront();
    await page.goto(server.url);
    await page.waitForSelector("[data-planche-entree]", { state: "attached", timeout: 60_000 });
    const email = `muda_${name}@example.org`;
    await page.fill("[data-entree-mail]", email, { force: true });
    await page.waitForSelector("[data-entree-ask]:not([disabled])", { state: "attached" });
    await tap("[data-entree-ask]");
    await page.waitForSelector("[data-entree-code]", { state: "attached", timeout: 60_000 });
    await page.goto(`${server.url}/connexion?token=${await magicLink(email)}`);
    await page.waitForSelector("[data-planche-fonder]", { state: "attached", timeout: 30_000 });
    await page.fill("[data-fonder-name]", name === "p" ? "Muda" : "Convoi", { force: true });
    await page.waitForSelector("[data-fonder-go]:not([disabled])", { state: "attached" });
    await tap("[data-fonder-go]");
    if (!(await until(page, has, "[data-muda-open]")))
      fail(`${name}: no Muda on the board on Monday`);
    // A first workshop on the island (a new house starts without one), for goods to load on
    // Wednesday: the real server's build, on the first free tile that takes one.
    const built = await page.evaluate(async () => {
      const post = (path, body) =>
        fetch(`/api/planche${path}`, {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
      const v = (await (await fetch("/api/planche", { credentials: "same-origin" })).json())
        .planche;
      const tiles = Object.entries(v.state.houses[v.me]?.ile?.tiles ?? {})
        .filter(([, t]) => !t.building)
        .map(([k]) => k);
      for (const type of ["salt_pans", "farm", "lumber_camp", "sand_pit", "clay_pit", "hemp_field"])
        for (const at of tiles) if ((await post("/ile/build", { type, at })).ok) return type;
      return null;
    });
    if (!built) fail(`${name}: no workshop could be built`);
    // The whole lagoon: the black straits at the edge of the open sea, the convoy at its pier.
    await page.evaluate(() =>
      [...document.querySelectorAll(".pc-pl-scale button")]
        .find((b) => b.textContent === "lagune")
        ?.click(),
    );
    await page.waitForTimeout(3000);
    await p.shot("1-lundi-planche");
    await tap("[data-muda-open]");
    if (!(await until(page, has, '[data-muda-phase="before"]')))
      fail(`${name}: the Muda is not « before » on Monday`);
    await p.shot("2-lundi-muda");
    await tap('[data-noir-pin="turc"]');
    if (!(await until(page, has, "[data-noir-shut]")))
      fail(`${name}: the black strait is not shut below level 11`);
    await p.shot("3-lundi-noir");
  }

  // Wednesday: the hold is loaded by a thread to the pier.
  await server.stop();
  server = await startServer(DAYS.mercredi);
  for (const p of pages) {
    const { page, name, tap } = p;
    await page.bringToFront();
    await page.goto(server.url);
    if (!(await until(page, has, "[data-muda-open]"))) fail(`${name}: no board on Wednesday`);
    await tap("[data-muda-open]");
    if (!(await until(page, has, '[data-muda-phase="loading"]')))
      fail(`${name}: the Muda does not load on Wednesday`);
    if (!(await until(page, has, "[data-muda-thread]")))
      fail(`${name}: nothing offered to the convoy`);
    await tap("[data-muda-thread]");
    if (!(await until(page, has, "[data-muda-threaded]")))
      fail(`${name}: the thread to the pier is not said`);
    await p.shot("4-mercredi-fil");
  }

  // Saturday: the convoy at sea, its first strait played on the real server.
  await server.stop();
  server = await startServer(DAYS.samedi);
  for (const p of pages) {
    const { page, name, tap } = p;
    await page.bringToFront();
    await page.goto(server.url);
    if (!(await until(page, has, "[data-muda-open]"))) fail(`${name}: no board on Saturday`);
    await tap("[data-muda-open]");
    if (!(await until(page, has, '[data-muda-phase="sailing"]')))
      fail(`${name}: the Muda is not at sea on Saturday`);
    const held = await page.getAttribute("[data-muda-hold]", "data-muda-hold");
    if (!(Number(held) > 0)) fail(`${name}: the hold is empty on Saturday (${held} %)`);
    const mine = await page.textContent("[data-muda-mine]");
    if (!(Number(mine) > 0)) fail(`${name}: nothing of one's own in the hold (${mine})`);
    await p.shot("5-samedi-muda");
    await tap('[data-muda-go="zara"]');
    if (!(await until(page, has, "[data-passe-lab]"))) fail(`${name}: no duel for the Muda`);
    await page.waitForTimeout(2000);
    await p.shot("6-samedi-detroit");
    await playOut(p);
    await tap("[data-passe-back]");
    if (!(await until(page, has, '[data-muda-strait="zara"]')))
      fail(`${name}: back from the strait, no Muda`);
    const said = await until(
      page,
      () =>
        /tenté|Passé/.test(document.querySelector('[data-muda-strait="zara"]')?.textContent ?? ""),
      undefined,
      30_000,
    );
    if (!said) fail(`${name}: the strait played is not said`);
    await p.shot("7-samedi-tente");
    // The convoy on the board, before its strait.
    await tap("[data-muda] .pc-pl-x");
    await page.evaluate(() =>
      [...document.querySelectorAll(".pc-pl-scale button")]
        .find((b) => b.textContent === "lagune")
        ?.click(),
    );
    await page.waitForTimeout(2500);
    await p.shot("8-samedi-convoi");
    // A black strait, the house moved to level 11: the cargo, the duel, the cargo sunk.
    p.moves.level = 11;
    p.moves.relics = { turc: 3, genes: 1 };
    await page.goto(server.url);
    if (!(await until(page, has, '[data-noir-pin="genes"]'))) fail(`${name}: no black strait`);
    await page.waitForTimeout(2500);
    await tap('[data-noir-pin="genes"]');
    if (!(await until(page, has, "[data-noir-go]:not([disabled])")))
      fail(`${name}: the cargo cannot be risked at level 11`);
    await p.shot("9-samedi-cargaison");
    await tap("[data-noir-go]");
    if (!(await until(page, has, "[data-passe-stake]"))) fail(`${name}: no stake in the duel`);
    await page.waitForTimeout(2000);
    await p.shot("10-samedi-duel-noir");
    await playOut(p);
    await tap("[data-passe-back]");
    for (let i = 0; i < 40 && !p.noir(); i++) await page.waitForTimeout(250);
    const sent = p.noir();
    if (sent?.kind !== "noir" || !sent.strait || !sent.good || !(sent.n > 0))
      fail(`${name}: the black strait sent ${JSON.stringify(sent)}`);
    // The relics and the plans in the Livre.
    await tap("[data-planche-medallion]");
    if (!(await until(page, has, "[data-maison-facade]"))) fail(`${name}: no Maison sheet`);
    await tap("[data-maison-facade]");
    if (!(await until(page, has, '[data-assemble="turc"]')))
      fail(`${name}: three relics of the Turk make no plan`);
    await page.evaluate(() => document.querySelector("[data-reliques]")?.scrollIntoView());
    await p.shot("11-samedi-reliques");
    p.moves.level = 0;
    p.moves.relics = null;
  }

  // Sunday: the Gazette, written by the server.
  await server.stop();
  server = await startServer(DAYS.dimanche);
  for (const p of pages) {
    const { page, name, tap } = p;
    await page.bringToFront();
    await page.goto(server.url);
    if (!(await until(page, has, "[data-gazette-open]"))) fail(`${name}: no Gazette button`);
    await tap("[data-gazette-open]");
    if (!(await until(page, has, "[data-gazette-muda]")))
      fail(`${name}: the Gazette tells no Muda`);
    const une = await page.getAttribute("[data-gazette-une]", "data-gazette-une");
    if (!une) fail(`${name}: the Gazette has no headline`);
    await p.shot("12-dimanche-gazette");
    await tap("[data-muda-open]");
    if (!(await until(page, has, '[data-muda-phase="back"]')))
      fail(`${name}: the convoy is not back on Sunday`);
    const back = await page.textContent("[data-muda-back]");
    if (!back?.includes("versée")) fail(`${name}: the share is not paid (« ${back} »)`);
    await p.shot("13-dimanche-retour");
    if (p.errs.length) fail(`${name}: page errors: ${p.errs.join(" | ")}`);
  }
} catch (e) {
  fail(e.stack ?? String(e));
  for (const ctx of browser.contexts())
    for (const pg of ctx.pages())
      await pg
        .screenshot({ path: join(SHOTS, `semaine-echec-${pg.viewportSize()?.width}.png`) })
        .catch(() => {});
} finally {
  await browser.close();
  await server.stop();
}
