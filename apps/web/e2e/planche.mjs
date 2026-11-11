// The walk-through of the shared board's laboratory (docs/plan-planche.md L4), on a computer and a
// phone: two threads stretched, time run fast, a shut route, a passage forced by the Passe.
// Needs the web's dev server: BASE=http://localhost:5173 node e2e/planche.mjs
// Env: CHROMIUM (a Chromium or headless shell), SHOTS (a folder for the pictures).
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const BASE = process.env.BASE ?? "http://localhost:5173";
const D = process.env.SHOTS ?? "e2e-shots/planche";
mkdirSync(D, { recursive: true });
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
    await pg.goto(`${BASE}/?lab=planche&simple`, { waitUntil: "domcontentloaded" });
    await pg.waitForSelector("[data-planche-lab]", { timeout: 60000 });
    await pg.waitForTimeout(3000);
    await pg.screenshot({ path: `${D}/pl-${name}-0.png` });
    // tie two threads: Padoue (glass) and Trévise (planks)
    for (const [city, good] of [
      ["padoue", "verre"],
      ["trevise", "planches"],
    ]) {
      await pg.evaluate((c) => document.querySelector(`[data-city="${c}"]`).click(), city);
      await pg.waitForSelector("[data-planche-card]");
      await pg.evaluate((g) => document.querySelector(`[data-tie="${g}"]`).click(), good);
      await pg.waitForTimeout(300);
    }
    await pg.mouse.click(5, h / 2);
    // fast time for a while
    await pg.evaluate(() =>
      [...document.querySelectorAll(".pc-planche-speed button")]
        .find((b) => b.textContent === "×6")
        .click(),
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
