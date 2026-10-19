// Plays Lorenzo's tutorial from the login to the first delivery on its way, in a phone-sized
// browser, touching whatever the guide points at. Fails when the guide points at nothing for too
// long, when its ring sits under its own bubble, or when the bubble hides the target.
//
// Run against the dev servers (`pnpm dev`, the server's mails printed in its log):
//   SERVER_LOG=server.log pnpm --filter @comptoirs/web e2e
// Env: BASE_URL (http://localhost:5173), SERVER_LOG (where the magic link is printed),
// CHROMIUM (a Chromium or headless shell), SHOTS (a folder to keep a picture of every step).
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:5173";
const LOG = process.env.SERVER_LOG;
const SHOTS = process.env.SHOTS;
if (!LOG) throw new Error("SERVER_LOG: the server's log, where the magic link is printed");
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch(
  process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {},
);
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: "fr-FR",
  timezoneId: "Europe/Paris",
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const fail = async (why) => {
  if (SHOTS) await page.screenshot({ path: join(SHOTS, "failure.png") });
  await browser.close();
  console.error(`✗ ${why}`);
  process.exit(1);
};

// Login by magic link, then the merchant's name, the introduction and the trade.
const email = `e2e-${Date.now()}@example.org`;
await page.goto(BASE);
await page.fill("input[type=email]", email);
await page.keyboard.press("Enter");
let token = null;
for (let i = 0; i < 50 && !token; i++) {
  await page.waitForTimeout(200);
  const log = readFileSync(LOG, "utf8");
  const at = log.lastIndexOf(email);
  token = at >= 0 ? (log.slice(at).match(/token=([\w-]+)/)?.[1] ?? null) : null;
}
if (!token) await fail("no magic link in the server's log");
await page.goto(`${BASE}/connexion?token=${token}`);
await page.fill("input", `e2e${Date.now() % 1_000_000}`);
await page.keyboard.press("Enter");
await page.getByRole("button", { name: /passer/i }).click();
await page
  .getByRole("button", { name: /choisir ce métier/i })
  .first()
  .click();

// Then the guide: touch what it rings, until the first delivery is on its way.
const seen = [];
let idle = 0;
for (let turn = 0; turn < 60; turn++) {
  await page.waitForTimeout(900);
  const bubble = page.locator("[data-coach-bubble]");
  // The guide falls silent while the first delivery is on its way (nothing to point at).
  const onTheRoad = /Vers [^·]+ · \d/.test(await page.innerText("body"));
  if (onTheRoad) {
    seen.push("en route");
    break;
  }
  if ((await bubble.count()) === 0) await fail("the guide is gone before the first delivery");
  const text = (await bubble.innerText()).replace(/\s+/g, " ");
  // A countdown changes every second: the same step all the same.
  if (seen.at(-1)?.replace(/\d/g, "") !== text.replace(/\d/g, "")) {
    seen.push(text);
    console.log(`· ${text}`);
    if (SHOTS)
      await page.screenshot({ path: join(SHOTS, `${String(seen.length).padStart(2, "0")}.png`) });
  }
  const ring = page.locator(".coach-ring");
  if ((await ring.count()) === 0) {
    // Waiting for a batch, or a window to close.
    if (/fermez cette fenêtre/i.test(text)) await page.keyboard.press("Escape");
    if (++idle > 45) await fail(`nothing to touch for too long: ${text}`);
    continue;
  }
  idle = 0;
  const box = await ring.boundingBox();
  const bubbleBox = await bubble.boundingBox();
  if (!box || !bubbleBox) continue;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const under =
    x > bubbleBox.x &&
    x < bubbleBox.x + bubbleBox.width &&
    y > bubbleBox.y &&
    y < bubbleBox.y + bubbleBox.height;
  if (under) await fail(`the bubble hides its target: ${text}`);
  await page.touchscreen.tap(x, y);
}
if (!seen.some((t) => /en route/i.test(t))) await fail("no delivery on its way");
if (errors.length > 0) await fail(`errors on the page: ${errors.join(" / ")}`);
await browser.close();
console.log(`✓ the tutorial reaches the first delivery in ${seen.length} steps`);
