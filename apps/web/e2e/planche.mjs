// The walk-through of the shared board's laboratory (docs/plan-planche.md L4), on a computer and a
// phone: a sand pit built on one's island, a thread of sand stretched to the Rialto, time run fast,
// a shut route, a passage forced by the Passe.
// Needs the web's dev server (and the game's server, or MODE=seul): BASE=http://localhost:5173 node e2e/planche.mjs
// Env: CHROMIUM (a Chromium or headless shell), SHOTS (a folder for the pictures), MODE (seul).
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const BASE = process.env.BASE ?? "http://localhost:5173";
const D = process.env.SHOTS ?? "e2e-shots/planche";
const MODE = process.env.MODE === "seul" ? "&seul" : "";
mkdirSync(D, { recursive: true });
/** A sand pit built on one's island, the best tile, then back on the board (docs/plan-ile.md). */
async function sandPit(page) {
  const tap = (s) => page.evaluate((q) => document.querySelector(q)?.click(), s);
  await tap('[data-house][data-mine="true"]');
  await page.waitForSelector("[data-enter-isle]", { timeout: 10_000 });
  await tap("[data-enter-isle]");
  await page.waitForSelector("[data-ile-screen]", { timeout: 30_000 });
  await page.waitForTimeout(1500);
  await tap("[data-ile-open]");
  await page.waitForSelector('[data-hand="sand_pit"]');
  await tap('[data-hand="sand_pit"]');
  await page.waitForSelector(".pc-ile-gain", { timeout: 5_000 });
  await tap('.pc-ile-gain[data-best="true"], .pc-ile-gain');
  await page.waitForSelector("[data-ile-place]:not([disabled])", { timeout: 5_000 });
  await tap("[data-ile-place]");
  await page.waitForTimeout(1500);
  await tap("[data-ile-back]");
  await page.waitForSelector("[data-planche-lab]", { timeout: 30_000 });
}

{
  const b = await chromium.launch({
    ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}),
    args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  for (const [name, w, h] of [
    ["d", 1280, 800],
    ["p", 390, 844],
  ]) {
    const pg = await b.newPage({ viewport: { width: w, height: h } });
    const errs = [];
    pg.on("pageerror", (e) => errs.push(e.message));
    pg.on("console", (m) => {
      if (m.type() === "error") errs.push(m.text().slice(0, 200));
    });
    await pg.goto(`${BASE}/?lab=planche&simple${MODE}`, { waitUntil: "domcontentloaded" });
    await pg.waitForSelector("[data-planche-lab]", { timeout: 60000 });
    await pg.waitForTimeout(3000);
    await pg.screenshot({ path: `${D}/pl-${name}-0.png` });
    // the island makes sand first; then a thread of sand to the Rialto, which buys what is raw
    await sandPit(pg);
    await pg.waitForTimeout(2000);
    await pg.evaluate(() => document.querySelector('[data-city="rialto"]').click());
    await pg.waitForSelector('[data-tie="sand"]', { timeout: 30_000 });
    await pg.evaluate(() => document.querySelector('[data-tie="sand"]').click());
    await pg.waitForTimeout(800);
    const tied = await pg.textContent(".pc-passe-said").catch(() => "");
    if (!tied.includes("Fil tendu")) {
      console.error(`✗ ${name}: no thread of sand: « ${tied} »`);
      process.exitCode = 1;
    }
    await pg.mouse.click(5, h / 2);
    // fast time for a while
    await pg.evaluate(() =>
      [...document.querySelectorAll(".pc-planche-speed button")]
        .find((b) => b.textContent === "×6")
        ?.click(),
    );
    await pg.waitForTimeout(6000);
    await pg.screenshot({ path: `${D}/pl-${name}-1.png` });
    const ducats = await pg.textContent("[data-planche-ducats]");
    const rank = await pg.textContent("[data-planche-rank]");
    // Raguse is shut: open its card, then force Segna
    await pg.evaluate(() => document.querySelector('[data-city="raguse"]').click());
    await pg.waitForTimeout(400);
    const shut = await pg.textContent("[data-planche-card] p");
    await pg.evaluate(() => document.querySelector('[data-passage="segna"]').click());
    await pg.waitForTimeout(400);
    await pg.screenshot({ path: `${D}/pl-${name}-2.png` });
    await pg.evaluate(() => document.querySelector("[data-force]").click());
    await pg.waitForSelector("[data-passe-lab]", { timeout: 30000 });
    await pg.waitForTimeout(1500);
    const title = await pg.textContent(".pc-passe-title b");
    await pg.screenshot({ path: `${D}/pl-${name}-3.png` });
    if (errs.length) {
      console.error(`✗ ${name}: page errors`, errs.slice(0, 3));
      process.exitCode = 1;
    }
    if (!shut.startsWith("Route fermée")) {
      console.error(`✗ ${name}: Raguse should be shut`);
      process.exitCode = 1;
    }
    console.log(`✓ ${name}: ${ducats} ducats, rang ${rank}, duel « ${title} »`);
    await pg.close();
  }
  await b.close();
}
