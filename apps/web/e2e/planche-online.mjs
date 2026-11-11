// The shared board on line (docs/plan-planche.md L5): two browsers, two guests, one board. Each is
// given a house; the first builds a sand pit and stretches a thread of sand to the Rialto, the second
// sees its share there; then the first forces the Strait of Segna by the Passe, the server replaying
// the duel.
// Needs the game's server (PLANCHE_PACE=60 to see the hours go by) and the web's dev server:
// BASE=http://localhost:5173 node e2e/planche-online.mjs
// Env: CHROMIUM (a Chromium or headless shell), SHOTS (a folder for the pictures).
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const BASE = process.env.BASE ?? "http://localhost:5173";
const SHOTS = process.env.SHOTS ?? "e2e-shots/planche-online";
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
const errors = [];
async function player() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${BASE}/?lab=planche&simple`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-planche-online]", { timeout: 60_000 });
  await page.waitForFunction(
    () =>
      /En ligne · [1-9]/.test(document.querySelector("[data-planche-online]")?.textContent ?? ""),
    null,
    { timeout: 30_000 },
  );
  return page;
}
const click = (page, sel) => page.evaluate((s) => document.querySelector(s)?.click(), sel);
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

const ana = await player();
const ben = await player();
await ana.waitForTimeout(2500);
const status = await ana.textContent("[data-planche-online]");
if (!/En ligne · [2-8] joueurs/.test(status)) fail(`two players should be seen: « ${status} »`);
else ok(`two guests on one board: « ${status.trim()} »`);

// Ana builds a sand pit, then stretches a thread of sand to the Rialto once the site is done.
await sandPit(ana);
await click(ana, '[data-city="rialto"]');
await ana.waitForSelector('[data-tie="sand"]', { timeout: 60_000 });
await click(ana, '[data-tie="sand"]');
await ana.waitForTimeout(1500);
const said = await ana.textContent(".pc-passe-said").catch(() => "");
if (!said.includes("Fil tendu")) fail(`Ana's thread: « ${said} »`);
else ok("Ana stretches a thread of sand to the Rialto");

// Ben sees Ana's share of the sand on the Rialto's card, after a few reads.
await ben.waitForTimeout(8000);
await click(ben, '[data-city="rialto"]');
await ben.waitForSelector('[data-planche-card] [data-good="sand"]', { timeout: 30_000 });
const sand = await ben.textContent('[data-planche-card] [data-good="sand"]');
if (/Personne ne la sert/.test(sand))
  fail(`Ben does not see Ana's share at the Rialto: « ${sand} »`);
else ok(`Ben sees another house serving sand at the Rialto: « ${sand.trim()} »`);
await ben.screenshot({ path: `${SHOTS}/ben-rialto.png` });

// Ana forces Segna by the Passe; won or lost, the server replays the duel.
await click(ana, '[data-passage="segna"]');
await ana.waitForSelector("[data-force]");
await click(ana, "[data-force]");
await ana.waitForSelector("[data-passe-lab]", { timeout: 30_000 });
for (let n = 0; n < 40; n++) {
  await ana.waitForFunction(
    () =>
      document.querySelector("[data-passe-end]") ||
      document.querySelector("[data-passe-turn]")?.textContent === "À toi",
    null,
    { timeout: 30_000 },
  );
  if (await ana.$("[data-passe-end]")) break;
  const free = await ana.evaluate(() =>
    [...document.querySelectorAll("[data-cell]")]
      .filter((b) => !b.disabled && b.textContent.includes("libre"))
      .map((b) => Number(b.dataset.cell)),
  );
  // Straight up the middle column, then anywhere.
  const pick = [45, 38, 31, 24, 17, 10, 3].find((i) => free.includes(i)) ?? free[0];
  await click(ana, `[data-cell="${pick}"]`);
}
const verdict = await ana.textContent("[data-passe-end] p");
ok(`the duel ends: « ${verdict} »`);
await click(ana, "[data-passe-back]");
await ana.waitForSelector("[data-planche-online]", { timeout: 30_000 });
await ana.waitForTimeout(2500);
const after = await ana.textContent(".pc-passe-said").catch(() => "");
ok(`back on the board: « ${after} »`);
await ana.screenshot({ path: `${SHOTS}/ana-retour.png` });

if (errors.length) fail(`page errors: ${errors.join(" | ")}`);
else ok("no page error");
await browser.close();
