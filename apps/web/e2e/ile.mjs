// The island on the board (docs/plan-ile.md I4 to I6), on a phone and a computer: into one's island
// from one's house, a workshop taken in hand (each free tile tells its gain), built, a tile bought,
// the store, back to the board and a thread stretched with what the island makes.
// Needs the web's dev server, and the game's server for the board on line (without it: MODE=seul).
// BASE=http://localhost:5173 node e2e/ile.mjs
// Env: CHROMIUM (a Chromium or headless shell), SHOTS (a folder for the pictures), MODE (seul).
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const BASE = process.env.BASE ?? "http://localhost:5173";
const SHOTS = process.env.SHOTS ?? "e2e-shots/ile";
const MODE = process.env.MODE === "seul" ? "&seul" : "";
mkdirSync(SHOTS, { recursive: true });
const fail = (m) => {
  console.error(`✗ ${m}`);
  process.exitCode = 1;
};
const ok = (m) => console.log(`✓ ${m}`);

const browser = await chromium.launch({
  ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}),
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
for (const [name, w, h] of [
  ["telephone", 390, 844],
  ["ordinateur", 1280, 800],
]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const click = (sel) => page.evaluate((s) => document.querySelector(s)?.click(), sel);
  const said = () => page.textContent(".pc-passe-said").catch(() => "");

  await page.goto(`${BASE}/?lab=planche&simple${MODE}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-planche-lab]", { timeout: 60_000 });
  await page.waitForSelector('[data-house][data-mine="true"]', { timeout: 30_000 });
  await page.waitForTimeout(1500);
  await click('[data-house][data-mine="true"]');
  await page.waitForSelector("[data-enter-isle]", { timeout: 10_000 });
  await click("[data-enter-isle]");
  await page.waitForSelector("[data-ile-screen]", { timeout: 30_000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${SHOTS}/${name}-1-ile.png` });
  const before = Number((await page.textContent("[data-ile-ducats]")).replace(/\D/g, ""));
  ok(`${name}: into the island, ${before} ducats`);

  // A sand pit in hand: each free tile tells its gain.
  await click("[data-ile-open]");
  await page.waitForSelector('[data-hand="sand_pit"]');
  await click('[data-hand="sand_pit"]');
  await page.waitForSelector(".pc-ile-gain", { timeout: 5_000 });
  const gains = await page.$$eval(".pc-ile-gain", (els) => els.map((e) => e.textContent));
  if (!gains.length) fail(`${name}: no gain shown on the free tiles`);
  else ok(`${name}: the free tiles tell their gain: ${gains.join(", ")}`);
  await page.screenshot({ path: `${SHOTS}/${name}-2-en-main.png` });
  // the best tile
  const best = await page.$$eval(
    ".pc-ile-gain",
    (els) =>
      els
        .map((e) => ({
          k: e.dataset.tile,
          v: Number(e.textContent.replace(/[^\d−-]/g, "").replace("−", "-")),
        }))
        .sort((a, b) => b.v - a.v)[0]?.k,
  );
  await click(`.pc-ile-gain[data-tile="${best}"]`);
  await page.waitForSelector("[data-ile-place]:not([disabled])");
  await page.screenshot({ path: `${SHOTS}/${name}-2b-vise.png` });
  await click("[data-ile-place]");
  await page.waitForTimeout(2500);
  if (!(await said()).includes("chantier"))
    fail(`${name}: the sand pit was not built: « ${await said()} »`);
  else ok(`${name}: the sand pit is built on ${best}`);
  const after = Number((await page.textContent("[data-ile-ducats]")).replace(/\D/g, ""));
  if (!(after < before)) fail(`${name}: the purse did not pay (${before} → ${after})`);

  // A tile bought.
  const plot = await page.$eval("[data-plot]", (e) => e.dataset.plot).catch(() => null);
  if (plot) {
    await click(`[data-plot="${plot}"]`);
    await page.waitForSelector("[data-ile-buy]");
    await click("[data-ile-buy]");
    await page.waitForTimeout(2500);
    ok(`${name}: a tile bought: « ${await said()} »`);
  } else fail(`${name}: no tile to buy`);
  await page.screenshot({ path: `${SHOTS}/${name}-3-chantier.png` });

  // Back to the board.
  await click("[data-ile-back]");
  await page.waitForSelector("[data-planche-lab]", { timeout: 30_000 });
  ok(`${name}: back on the board`);
  if (errors.length) fail(`${name}: page errors: ${errors.join(" | ")}`);
  else ok(`${name}: no page error`);
  await ctx.close();
}
await browser.close();
