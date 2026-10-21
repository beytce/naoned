// The first session in full, on two phones (390 × 844 and 320 × 568): the sign-in, the
// merchant's name, Lorenzo's guide to its end (produce, harvest, transform, sell, deliver, the
// Rialto, the Livre de compte), the Terraferma during its truce, the notices. After every step,
// the page must not scroll sideways, no two blocks of the HUD may cover each other, and those that
// can be touched are 44 px at least (e2e/assert.mjs). The one script of the end-to-end tests:
// later steps of the first session are added here.
//
//   pnpm --filter @comptoirs/web build && pnpm --filter @comptoirs/web e2e
//
// Without BASE_URL, starts the server on an empty PGlite in memory, serving the built app, its
// clock started on a Monday morning in Paris (the Terraferma's truce on, daylight), its mules
// quick enough for a delivery to arrive while the test waits. With BASE_URL
// (the dev servers), SERVER_LOG must name the server's log, where the magic link is printed.
// Env: CHROMIUM (a Chromium or headless shell), SHOTS (a folder for a picture of every step,
// e2e-shots by default), SIZES ("390x844,320x568" by default), REPORT=1 (every fault listed
// without stopping at the first).
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { assertLayout } from "./assert.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const SHOTS = resolve(process.env.SHOTS ?? join(here, "..", "e2e-shots"));
const SIZES = (process.env.SIZES ?? "390x844,320x568")
  .split(",")
  .map((s) => s.split("x").map(Number));
const CLOCK_START = "2026-03-02T10:00:00+01:00";
// REPORT=1: every fault listed, the session played to its end all the same.
const REPORT = process.env.REPORT === "1";
const faults = [];

let base = process.env.BASE_URL;
let log = process.env.SERVER_LOG;
let server = null;
if (!base) ({ base, log, server } = await startServer());
if (!log) throw new Error("SERVER_LOG: the server's log, where the magic link is printed");

const browser = await chromium.launch({
  ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}),
});
let failed = false;
try {
  for (const [width, height] of SIZES) await session(width, height);
} catch (e) {
  failed = true;
  console.error(`✗ ${e.message}`);
} finally {
  await browser.close();
  server?.kill("SIGTERM");
}
process.exit(failed || faults.length > 0 ? 1 : 0);

/** The server on an empty database in memory, serving the built app, on a free port. */
async function startServer() {
  const serverDir = join(here, "..", "..", "server");
  const tsx = createRequire(join(serverDir, "package.json")).resolve("tsx/cli");
  const port = 3100 + Math.floor(Math.random() * 800);
  const url = `http://127.0.0.1:${port}`;
  mkdirSync(SHOTS, { recursive: true });
  const file = join(SHOTS, "server.log");
  writeFileSync(file, "");
  const child = spawn(process.execPath, [tsx, "src/server.ts"], {
    cwd: serverDir,
    env: {
      ...process.env,
      NODE_ENV: "test",
      DATABASE_URL: "pglite:memory",
      HOST: "127.0.0.1",
      PORT: String(port),
      APP_URL: url,
      WEB_DIST: join(here, "..", "dist"),
      CLOCK_START,
      // Mules a hundred times quicker: a delivery arrives within a minute or two.
      WORLD_SETTINGS_OVERRIDE: JSON.stringify({
        deliveries: { vehicles: { mule: { speedBps: 750_000 } } },
      }),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let out = "";
  const keep = (chunk) => {
    out += chunk;
    writeFileSync(file, out);
  };
  child.stdout.on("data", keep);
  child.stderr.on("data", keep);
  for (let i = 0; i < 240 && !/Server listening/.test(out); i++) {
    if (child.exitCode !== null) throw new Error(`the server stopped:\n${out.slice(-2000)}`);
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!/Server listening/.test(out)) throw new Error("the server did not start in 60 s");
  return { base: url, log: file, server: child };
}

/** One first session on a phone of this size, checked after every step. */
async function session(width, height) {
  const size = `${width}x${height}`;
  const dir = join(SHOTS, size);
  mkdirSync(dir, { recursive: true });
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    serviceWorkers: "block",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let n = 0;
  /** A step done: its picture, then the layout checked. */
  const check = async (name) => {
    await page.waitForTimeout(450);
    const file = join(dir, `${String(++n).padStart(2, "0")}-${name}.png`);
    await page.screenshot({ path: file });
    try {
      await assertLayout(page);
    } catch (e) {
      const why = `${size}, ${name} (${file}):\n  ${e.message}`;
      if (!REPORT) throw new Error(why);
      faults.push(why);
      console.error(`✗ ${why}`);
    }
    console.log(`· ${size} ${name}`);
  };

  // The sign-in by magic link, the merchant's name, the introduction, the trade.
  const email = `e2e-${width}-${Date.now()}@example.org`;
  await page.goto(base);
  await check("connexion");
  await page.fill("input[type=email]", email);
  await page.keyboard.press("Enter");
  const token = await magicLink(email);
  await page.goto(`${base}/connexion?token=${token}`);
  await page.waitForSelector("input");
  await check("nom");
  await page.fill("input", `e2e${width}${Date.now() % 10_000}`);
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: /passer/i }).waitFor();
  await check("introduction");
  await page.getByRole("button", { name: /passer/i }).click();
  await page
    .getByRole("button", { name: /choisir ce métier/i })
    .first()
    .waitFor();
  await check("metier");
  await page
    .getByRole("button", { name: /choisir ce métier/i })
    .first()
    .click();

  await guide(page, check);

  // The Terraferma during its truce: the HUD's two columns and the week's note.
  for (let i = 0; i < 3; i++) await page.keyboard.press("Escape");
  const door = page.locator("[data-coach=door-layer]");
  // Closed until the first day of trade: touched once, it says why; touched again, it opens.
  await door.click({ force: true });
  if ((await door.getAttribute("aria-disabled")) === "true") {
    await check("terraferme-fermee");
    await door.click({ force: true });
  }
  await page.waitForTimeout(1500);
  await check("terraferme");
  // Lorenzo's three cards on the Terraferma, read to the end.
  for (let i = 0; i < 4; i++) {
    const next = page.getByRole("button", { name: /^(suivant|compris)$/i });
    if ((await next.count()) === 0) break;
    await next.first().click();
    await page.waitForTimeout(300);
  }
  await check("terraferme-treve");
  await door.click();
  await page.waitForTimeout(1000);

  // The notices, the Livre de compte at their head.
  await page.getByRole("button", { name: /^avis/i }).first().click();
  await check("avis");
  await page.keyboard.press("Escape");
  await check("carte");

  if (errors.length > 0) throw new Error(`${size}: errors on the page: ${errors.join(" / ")}`);
  await context.close();
}

/** Plays Lorenzo's guide to its end, touching what it rings; a check at each of its steps. */
async function guide(page, check) {
  let last = null;
  let idle = 0;
  for (let turn = 0; turn < 400; turn++) {
    await page.waitForTimeout(700);
    const bubble = page.locator("[data-coach-bubble]");
    if ((await bubble.count()) === 0) {
      // Silent while the first delivery is on its way: the guide comes back at its arrival.
      if (++idle > 240) return;
      continue;
    }
    const text = (await bubble.innerText()).replace(/\s+/g, " ");
    // A countdown changes every second: the same step all the same.
    const step = text.replace(/\d/g, "");
    if (step !== last) {
      last = step;
      await check(`guide-${slug(text)}`);
    }
    const finish = bubble.getByRole("button", { name: /terminer|passer/i });
    const ring = page.locator(".coach-ring");
    if ((await ring.count()) === 0) {
      if (/fermez cette fenêtre/i.test(text)) await page.keyboard.press("Escape");
      else if ((await finish.count()) > 0) {
        const done = /terminer/i.test(await finish.first().innerText());
        await finish.first().click();
        if (done) return;
      } else if (++idle > 240) throw new Error(`the guide waits too long: ${text}`);
      continue;
    }
    idle = 0;
    const box = await ring.boundingBox();
    if (!box) continue;
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  }
  throw new Error("the guide never ends");
}

/** The magic link's token, from the server's log. */
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

function slug(text) {
  return text
    .replace(/^.*?objectif \d+\/\d+ /i, "")
    .normalize("NFD")
    .replace(/[^\w ]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join("-")
    .toLowerCase();
}
