// The duel on line of the Passe (docs/plan-passe.md P6): two browsers, one room. The host opens it,
// the friend follows the link, they play in turn to the end, then the return game with the sides swapped.
// Needs the game's server and the web's dev server: BASE=http://localhost:5173 node e2e/passe-duel.mjs
// Env: CHROMIUM (a Chromium or headless shell), SHOTS (a folder for the pictures).
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const BASE = process.env.BASE ?? "http://localhost:5173";
const SHOTS = process.env.SHOTS ?? "e2e-shots/passe";
mkdirSync(SHOTS, { recursive: true });
{
  const b = await chromium.launch({
    ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}),
    args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  const errs = [];
  const open = async () => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    const pg = await ctx.newPage();
    pg.on("pageerror", (e) => errs.push(e.message));
    return pg;
  };
  const a = await open();
  await a.goto(`${BASE}/?lab=passe&simple`, { waitUntil: "domcontentloaded" });
  await a.waitForSelector("[data-passe-lab]", { timeout: 60000 });
  await a.click('button[aria-expanded]:has-text("Réglages")');
  await a.click('.pc-passe-sheet button:has-text("Bouche du Lido")');
  await a.click("[data-passe-open]");
  await a.waitForSelector("[data-passe-code]", { timeout: 15000 });
  const code = await a.textContent("[data-passe-code]");
  const link = await a.inputValue("#passe-link");
  await a.waitForTimeout(1500);
  await a.screenshot({ path: `${SHOTS}/attente.png` });
  const f = await open();
  await f.goto(`${link}&simple`, { waitUntil: "domcontentloaded" });
  await f.waitForSelector("[data-passe-lab]", { timeout: 60000 });
  const turnOf = (pg) => pg.textContent("[data-passe-turn]");
  await a.waitForFunction(
    () => document.querySelector("[data-passe-turn]").textContent.startsWith("À toi"),
    null,
    { timeout: 15000 },
  );
  console.log("code", code, "| host:", await turnOf(a), "| friend:", await turnOf(f));
  const tap = (pg, i) =>
    pg.evaluate((i) => document.querySelector(`[data-cell="${i}"]`).click(), i);
  const mine = (pg) =>
    pg.waitForFunction(
      () =>
        document.querySelector("[data-passe-end]") ||
        document.querySelector("[data-passe-turn]").textContent.startsWith("À toi"),
      null,
      { timeout: 15000 },
    );
  // the host (the thread) runs up the middle column; the friend (the chain) lays along the top row, too late
  const hostMoves = [22, 17, 12, 7, 2];
  const friendMoves = [20, 21, 23, 24];
  for (let k = 0; k < 5; k++) {
    await mine(a);
    await tap(a, hostMoves[k]);
    if (k === 2) {
      await a.waitForTimeout(1200);
      await a.screenshot({ path: `${SHOTS}/milieu.png` });
    }
    if (k < 4) {
      await mine(f);
      await tap(f, friendMoves[k]);
    }
  }
  await a.waitForSelector("[data-passe-end]", { timeout: 15000 });
  await f.waitForSelector("[data-passe-end]", { timeout: 15000 });
  console.log(
    "host:",
    await a.textContent("[data-passe-end] p"),
    "| friend:",
    await f.textContent("[data-passe-end] p"),
  );
  await a.click('button:has-text("Revanche")');
  await f.waitForSelector('button:has-text("veut sa revanche")', { timeout: 15000 });
  await f.click('button:has-text("veut sa revanche")');
  await f.waitForFunction(
    () => document.querySelector("[data-passe-turn]").textContent.startsWith("À toi"),
    null,
    { timeout: 15000 },
  );
  console.log("return game — friend:", await turnOf(f), "| host:", await turnOf(a));
  await f.screenshot({ path: `${SHOTS}/revanche.png` });
  if (errs.length) {
    console.error("✗ page errors", errs);
    process.exitCode = 1;
  } else console.log("✓ no page error");
  await b.close();
}
