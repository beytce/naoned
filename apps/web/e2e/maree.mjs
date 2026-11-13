// A whole tide on the board (docs/plan-maree.md T8), on a phone or a computer (ONLY), the server
// started again on the same base at chosen hours of the tide (CLOCK_START), its lagoon living in
// between:
//  - the first Monday: a house founded; the tide's sheet (week 1, the ink far out);
//  - the third Saturday: the ink nearer; the page's board moved so that the house holds a strait
//    and a captain's sortie is told against it: the corsair's ship, the tower « menacée », the
//    sortie met before its hour (the try answered as lost);
//  - the Monday after the sixth week: the tide is closed: its moment (the laurels, the league the
//    house went up to, the Doge's decree to choose, the page moved so that the house is the Doge),
//    and the ladder of the leagues.
// Needs the web built (pnpm --filter @comptoirs/web build): node e2e/maree.mjs
// Env: CHROMIUM, SHOTS, ONLY (p or d; the script runs each alone, one lagoon each).
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const here = dirname(fileURLToPath(import.meta.url));
const SHOTS = resolve(process.env.SHOTS ?? join(here, "..", "e2e-shots", "maree"));
const log = join(SHOTS, "server.log");
const BASE_DIR = join(SHOTS, "base");
rmSync(BASE_DIR, { recursive: true, force: true });
const port = 3100 + Math.floor(Math.random() * 800);
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const fail = (why) => {
  console.error(`maree: ${why}`);
  process.exitCode = 1;
};
const DAYS = {
  debut: "2026-11-16T10:00:00Z",
  samedi: "2026-12-05T10:00:00Z",
  fin: "2026-12-28T10:00:00Z",
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
const [name, w, h] = [
  ["p", 390, 844],
  ["d", 1280, 800],
].find(([n]) => n === (process.env.ONLY ?? "p"));
let server = await startServer(DAYS.debut);
try {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: "fr-FR" });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  const tap = (q) => page.evaluate((s) => document.querySelector(s)?.click(), q);
  const shot = async (file) => {
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(SHOTS, `maree-${name}-${file}.png`), timeout: 150_000 });
  };
  // The board the page reads may be moved: a strait held and a sortie told; the house the Doge.
  const moves = { strait: null, doge: false };
  await page.route("**/api/planche", async (route) => {
    const res = await route.fetch().catch(() => null);
    if (!res) return route.abort().catch(() => {});
    const json = await res.json();
    const st = json?.planche?.state;
    const me = json?.planche?.me;
    if (st && me && moves.strait) {
      st.passages[moves.strait] = { holder: me, tollBps: 1000, seals: 3 };
      const monday = Math.floor((st.now + 3 * DAY) / (7 * DAY)) * 7 * DAY - 3 * DAY;
      st.sorties = {
        monday,
        list: [
          {
            id: "e2e:1",
            captain: "Barberousse",
            from: "detroit-dorsoduro",
            target: moves.strait,
            at: st.now + 6 * HOUR,
            style: "mur",
          },
        ],
        done: {},
      };
    }
    // A lagoon opened for the league has no decree of its own yet: one is offered, the house Doge.
    if (st && me && moves.doge)
      st.decret = {
        tide: st.rank.tide,
        doge: me,
        until: st.now + 2 * DAY,
        offered: [
          { kind: "peage", bps: 500 },
          { kind: "encre", less: 50 },
          { kind: "noir", less: 1 },
        ],
      };
    await route.fulfill({ response: res, json });
  });
  let sortieSent = null;
  await page.route("**/api/planche/sortie", async (route) => {
    sortieSent = route.request().postDataJSON();
    // The real house holds no strait: the answer a sortie lost gets is given.
    await route.fulfill({ status: 409, json: { error: "duel_lost" } });
  });
  let decretSent = null;
  await page.route("**/api/planche/decret", async (route) => {
    decretSent = route.request().postDataJSON();
    const res = await route.fetch({
      method: "GET",
      url: `${server.url}/api/planche`,
      postData: undefined,
    });
    await route.fulfill({ response: res });
  });

  // The first Monday: a house founded, the tide's sheet.
  await page.goto(server.url);
  await page.waitForSelector("[data-planche-entree]", { state: "attached", timeout: 60_000 });
  const email = `maree_${name}@example.org`;
  await page.fill("[data-entree-mail]", email, { force: true });
  await page.waitForSelector("[data-entree-ask]:not([disabled])", { state: "attached" });
  await tap("[data-entree-ask]");
  await page.waitForSelector("[data-entree-code]", { state: "attached", timeout: 60_000 });
  await page.goto(`${server.url}/connexion?token=${await magicLink(email)}`);
  await page.waitForSelector("[data-planche-fonder]", { state: "attached", timeout: 30_000 });
  await page.fill("[data-fonder-name]", name === "p" ? "Marea" : "Encre", { force: true });
  await page.waitForSelector("[data-fonder-go]:not([disabled])", { state: "attached" });
  await tap("[data-fonder-go]");
  if (!(await until(page, has, "[data-maree-open]"))) fail("no tide on the board");
  await tap("[data-maree-open]");
  if (!(await until(page, has, "[data-encre-line]"))) fail("no ink in the tide's sheet");
  const first = Number(await page.getAttribute("[data-encre-line]", "data-encre-line"));
  const week = await page.getAttribute("[data-maree-week]", "data-maree-week");
  if (week !== "1") fail(`the tide's week is ${week}, not 1`);
  if (!(await until(page, has, "[data-ligue]"))) fail("no league in the tide's sheet");
  await shot("1-semaine1");
  // The house's levels seen on this device: their moment does not cover the tide's (it has its own e2e).
  const levelsSeen = () =>
    page.evaluate(() => {
      for (const k of Object.keys(localStorage))
        if (k.startsWith("fondaco.maison.level.")) localStorage.setItem(k, "99");
    });
  await levelsSeen();

  // The third Saturday: the ink nearer, a strait held, a sortie told.
  await server.stop();
  server = await startServer(DAYS.samedi);
  moves.strait = "detroit-cannaregio";
  await page.goto(server.url);
  if (!(await until(page, has, "[data-maree-open]"))) fail("no board on the third Saturday");
  await page.evaluate(() =>
    [...document.querySelectorAll(".pc-pl-scale button")]
      .find((b) => b.textContent === "lagune")
      ?.click(),
  );
  if (!(await until(page, has, '[data-sortie-pin="e2e:1"]'))) fail("the sortie is not told");
  await page.waitForTimeout(3000);
  await shot("2-samedi-planche");
  await tap("[data-maree-open]");
  if (!(await until(page, has, "[data-encre-line]"))) fail("no ink on the third Saturday");
  const third = Number(await page.getAttribute("[data-encre-line]", "data-encre-line"));
  if (!(third < first)) fail(`the ink has not risen: ${first} then ${third}`);
  if (!(await until(page, has, '[data-sortie-go="e2e:1"]'))) fail("no way to meet the sortie");
  await shot("3-samedi-maree");
  await tap('[data-sortie-go="e2e:1"]');
  if (!(await until(page, has, "[data-passe-stake]"))) fail("no duel for the sortie");
  await page.waitForTimeout(2000);
  await shot("4-samedi-audevant");
  for (let i = 0; i < 81; i++) {
    if (await page.$("[data-passe-end]")) break;
    if ((await page.textContent("[data-passe-turn]"))?.includes("réfléchit")) {
      await page.waitForTimeout(700);
      i--;
      continue;
    }
    await page.evaluate((k) => document.querySelector(`[data-cell="${k}"]`)?.click(), i);
    await page.waitForTimeout(250);
  }
  if (!(await until(page, has, "[data-passe-end]", 60_000))) fail("no end to the sortie");
  await tap("[data-passe-back]");
  for (let i = 0; i < 40 && !sortieSent; i++) await page.waitForTimeout(250);
  if (sortieSent?.id !== "e2e:1" || !Array.isArray(sortieSent.moves))
    fail(`the sortie sent is ${JSON.stringify(sortieSent)}`);
  moves.strait = null;

  // The Monday after the sixth week: the tide closed, its moment.
  await server.stop();
  server = await startServer(DAYS.fin);
  moves.doge = true;
  await page.goto(server.url);
  if (!(await until(page, has, "[data-maree-fin]", 120_000))) fail("no moment of the tide's end");
  if (!(await until(page, has, "[data-ligue-move]"))) fail("the league is not told");
  const move = await page.getAttribute("[data-ligue-move]", "data-ligue-move");
  if (move !== "up") fail(`the house did not go up a league (${move})`);
  if (!(await until(page, has, '[data-decret-choice="0"]'))) fail("no decree to choose");
  await shot("5-fin-de-maree");
  await tap('[data-decret-choice="1"]');
  for (let i = 0; i < 40 && !decretSent; i++) await page.waitForTimeout(250);
  if (decretSent?.choice !== 1) fail(`the decree sent is ${JSON.stringify(decretSent)}`);
  moves.doge = false;
  await tap("[data-maree-fin-close]");
  await tap("[data-maree-open]");
  if (!(await until(page, has, '[data-ligue="2"]'))) fail("the house is not in the second league");
  await page.evaluate(() => document.querySelector("[data-ligue]")?.scrollIntoView());
  await shot("6-ligues");
  if (errs.length) fail(`page errors: ${errs.join(" | ")}`);
} catch (e) {
  fail(e.stack ?? String(e));
  for (const ctx of browser.contexts())
    for (const pg of ctx.pages())
      await pg.screenshot({ path: join(SHOTS, `maree-echec-${name}.png`) }).catch(() => {});
} finally {
  await browser.close();
  await server.stop();
}
