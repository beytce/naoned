// The shared board on line (docs/plan-planche.md L5): two browsers, two guests, one board. Each is
// given a house; the first stretches a thread to Padoue, the second sees it and stretches his own
// there; then the first forces the Strait of Segna by the Passe, the server replaying the duel.
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

const ana = await player();
const ben = await player();
await ana.waitForTimeout(2500);
const status = await ana.textContent("[data-planche-online]");
if (!/En ligne · [2-8] joueurs/.test(status)) fail(`two players should be seen: « ${status} »`);
else ok(`two guests on one board: « ${status.trim()} »`);

// Ana stretches a thread to Padoue.
await click(ana, '[data-city="padoue"]');
await ana.waitForSelector("[data-planche-card]");
await click(ana, '[data-tie="verre"]');
await ana.waitForTimeout(1500);
const said = await ana.textContent(".pc-passe-said").catch(() => "");
if (!said.includes("Fil tendu")) fail(`Ana's thread: « ${said} »`);
else ok("Ana stretches a thread to Padoue");

// Ben sees it on Padoue's card, after the next read.
await ben.waitForTimeout(2500);
await click(ben, '[data-city="padoue"]');
await ben.waitForSelector("[data-planche-card]");
const card = await ben.textContent("[data-planche-card]");
// The glass row only: « Verre … · <the houses that sell it> ».
const glass = (card.split("Verre")[1] ?? "").split("Drap")[0] ?? "";
if (/personne d'autre/.test(glass)) fail(`Ben does not see Ana's thread at Padoue: « ${glass} »`);
else ok("Ben sees another house selling glass at Padoue");
await ben.screenshot({ path: `${SHOTS}/ben-padoue.png` });

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
