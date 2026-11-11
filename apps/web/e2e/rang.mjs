// The rank on the board (docs/plan-classement.md R3), on a computer and a phone: one's place and
// its trend in the purse, the rival marked on the board, the Doge's palace with the three laurels.
// Needs the web's dev server (and the game's server, or MODE=seul): BASE=http://localhost:5173 node e2e/rang.mjs
// Env: CHROMIUM (a Chromium or headless shell), SHOTS (a folder for the pictures), MODE (seul).
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const BASE = process.env.BASE ?? "http://localhost:5173";
const D = process.env.SHOTS ?? "e2e-shots/rang";
const MODE = process.env.MODE === "seul" ? "&seul" : "";
mkdirSync(D, { recursive: true });
const fail = (why) => {
  console.error(`rang: ${why}`);
  process.exit(1);
};

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
  await pg.goto(`${BASE}/?lab=planche&simple${MODE}`, { waitUntil: "domcontentloaded" });
  await pg.waitForSelector("[data-planche-lab]", { timeout: 60_000 });
  await pg.waitForSelector("[data-planche-rank]", { timeout: 60_000 });
  await pg.waitForTimeout(2500);
  // The place is said, whole, in the purse; the rival carries its mark on the board.
  const place = await pg.textContent("[data-planche-rank]");
  if (!/^\d+e$/.test(place?.trim() ?? "")) fail(`the place reads « ${place} »`);
  const rival = await pg.getAttribute('[data-house][data-rival="true"]', "data-house");
  if (!rival) fail("no rival marked on the board");
  const box = await pg.locator(".pc-pl-purse").boundingBox();
  if (!box || box.x + box.width > w + 1) fail("the purse runs off the screen");
  await pg.screenshot({ path: `${D}/rang-${name}-0.png` });
  // The palace: one's place, the rival face to face, three laurels.
  await pg.click("[data-planche-rank-open]");
  await pg.waitForSelector("[data-planche-palace]", { timeout: 5_000 });
  if ((await pg.getAttribute("[data-palace-rival]", "data-palace-rival")) !== rival)
    fail("the palace names another rival than the board");
  if ((await pg.locator("[data-laurel]").count()) !== 3) fail("the palace has not three laurels");
  await pg.waitForTimeout(500);
  await pg.screenshot({ path: `${D}/rang-${name}-1.png` });
  // Its one red key shows the rival on the board.
  await pg.evaluate(() => document.querySelector("[data-palace-see-rival]")?.click());
  await pg.waitForSelector("[data-planche-card]", { timeout: 5_000 });
  await pg.waitForTimeout(500);
  await pg.screenshot({ path: `${D}/rang-${name}-2.png` });
  if (errs.length) fail(errs.join(" | "));
  console.log(`rang ${name}: place ${place?.trim()}, rival ${rival}`);
  await pg.close();
}
await b.close();
