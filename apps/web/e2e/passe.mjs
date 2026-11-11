// The walk-through of the Passe's laboratory (docs/plan-passe.md P5), on a phone of 390 × 844:
// a whole duel against the novice, the special piece, a problem solved by its key, a problem missed.
// Needs the web's dev or preview server: BASE=http://localhost:5173 node e2e/passe.mjs
// Env: CHROMIUM (a Chromium or headless shell), SHOT (where the last picture goes).
import { chromium } from "playwright-core";

const BASE = process.env.BASE ?? "http://localhost:5173";
const fail = (m) => {
  console.error(`✗ ${m}`);
  process.exitCode = 1;
};
const ok = (m) => console.log(`✓ ${m}`);

const browser = await chromium.launch({
  ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}),
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

await page.goto(`${BASE}/?lab=passe&simple`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-passe-lab]", { timeout: 60_000 });

const cell = (i) => page.evaluate((i) => document.querySelector(`[data-cell="${i}"]`).click(), i);
const free = () =>
  page.evaluate(() =>
    [...document.querySelectorAll("[data-cell]")]
      .filter((b) => !b.disabled && b.textContent.includes("libre"))
      .map((b) => Number(b.dataset.cell)),
  );
const myTurn = () =>
  page.waitForFunction(
    () =>
      document.querySelector("[data-passe-end]") ||
      document.querySelector("[data-passe-turn]")?.textContent === "À toi",
    null,
    { timeout: 30_000 },
  );
const pick = async (name) => {
  await page.click('button[aria-expanded]:has-text("Réglages")');
  await page.click(`.pc-passe-sheet button:has-text("${name}")`);
  if (await page.$(".pc-passe-x")) await page.click(".pc-passe-x");
};

// 1. Every button a thumb can reach is 44 px high at least.
for (const b of await page.$$(".pc-passe-foot button")) {
  const box = await b.boundingBox();
  if (box && box.height < 44) fail(`a button of the dock is ${box.height} px high`);
}
ok("the dock's buttons are 44 px high at least");

// 2. A whole duel against the novice on the Lido: straight up the middle column while it is free.
await pick("Novice");
await pick("Bouche du Lido");
let played = 0;
for (let n = 0; n < 30; n++) {
  await myTurn();
  if (await page.$("[data-passe-end]")) break;
  const cells = await free();
  const want =
    [22, 17, 7, 2, 13, 8, 3, 21, 16, 11, 6, 1].find((i) => cells.includes(i)) ?? cells[0];
  await cell(want);
  played++;
}
const verdict = await page.textContent("[data-passe-end] p");
if (!verdict) fail("the duel never ended");
else ok(`a duel played to its end in ${played} pieces: « ${verdict} »`);
const lacks = await page.textContent("[data-passe-thread]");
const chain = await page.textContent("[data-passe-chain]");
if (lacks !== "0" && chain !== "0") fail(`nobody is through: thread ${lacks}, chain ${chain}`);

// 3. A problem: missed by a piece laid anywhere, then its key shown and played.
await page.click('button[aria-expanded]:has-text("Réglages")');
await page.click(".pc-passe-probs button:first-child");
await myTurn();
const title = await page.textContent(".pc-passe-title b");
if (!title?.startsWith("Le fil passe en 2 coups")) fail(`the problem's title reads « ${title} »`);
for (let n = 0; n < 4; n++) {
  await myTurn();
  if (await page.$("[data-passe-end]")) break;
  await cell((await free())[0]);
}
const end = await page.textContent("[data-passe-end] p").catch(() => null);
if (!end) fail("the problem never ended");
else ok(`a problem played at random ends: « ${end} »`);
if (await page.$('button:has-text("Voir la clef")')) {
  await page.click('button:has-text("Voir la clef")');
  const key = await page.$("[data-cell][data-hint]");
  if (!key) fail("the key is not shown");
  else {
    await key.evaluate((b) => b.click());
    await myTurn();
    ok("the key is shown, and played");
  }
}

if (errors.length) fail(`page errors: ${errors.join(" | ")}`);
else ok("no page error");
await page.screenshot({ path: process.env.SHOT ?? "e2e/passe.png" });
await browser.close();
