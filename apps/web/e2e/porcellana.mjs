// The empire's journey on the Carte (docs/plan-porcellana.md lots 3 to 8): a house founded on the
// square tiles, its board drawn with the kit; the Fondaco and a plot touched, their cards; a plot
// bought and a workshop built on it; the Fondaco's tab; the keys; the board flat without WebGL.
//   pnpm --filter @comptoirs/web build && pnpm --filter @comptoirs/web e2e:empire
// Shots in e2e-shots/porcellana by default (SHOTS), sizes 1280x800 and 390x844 (SIZES).
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { assertNoOverflow } from "./assert.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const SHOTS = resolve(process.env.SHOTS ?? join(here, "..", "e2e-shots", "porcellana"));
const SIZES = (process.env.SIZES ?? "1280x800,390x844")
  .split(",")
  .map((s) => s.split("x").map(Number));
const log = join(SHOTS, "server.log");

async function startServer() {
  const serverDir = join(here, "..", "..", "server");
  const tsx = createRequire(join(serverDir, "package.json")).resolve("tsx/cli");
  const port = 3100 + Math.floor(Math.random() * 800);
  const url = `http://127.0.0.1:${port}`;
  mkdirSync(SHOTS, { recursive: true });
  writeFileSync(log, "");
  const child = spawn(process.execPath, [tsx, "src/server.ts"], {
    cwd: serverDir,
    env: {
      ...process.env,
      LANG: "C.UTF-8",
      NODE_ENV: "test",
      DATABASE_URL: "pglite:memory",
      HOST: "127.0.0.1",
      PORT: String(port),
      APP_URL: url,
      WEB_DIST: join(here, "..", "dist"),
      WORLD_KIND: "empire",
      EMPIRE_GRID: "square",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let out = "";
  const keep = (chunk) => {
    out += chunk;
    writeFileSync(log, out);
  };
  child.stdout.on("data", keep);
  child.stderr.on("data", keep);
  for (let i = 0; i < 240 && !/Server listening/.test(out); i++) {
    if (child.exitCode !== null) throw new Error(`the server stopped:\n${out.slice(-2000)}`);
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!/Server listening/.test(out)) throw new Error("the server did not start in 60 s");
  return { url, stop: () => child.kill("SIGTERM") };
}

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

const server = await startServer();
const browser = await chromium.launch({
  ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}),
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const faults = [];
try {
  for (const [width, height] of SIZES) {
    const label = `${width}x${height}`;
    const page = await browser.newPage({ viewport: { width, height }, locale: "fr-FR" });
    await page.emulateMedia({ reducedMotion: "reduce" });
    page.on("pageerror", (e) => faults.push(`${label}: ${e.message}`));
    const shot = async (name, wait = 12_000) => {
      await page.waitForTimeout(wait);
      await assertNoOverflow(page).catch((e) => faults.push(`${label} ${name}: ${e.message}`));
      await page.screenshot({ path: join(SHOTS, `${label}-${name}.png`), timeout: 120_000 });
    };
    const email = `porcellana_${width}@example.org`;
    await page.goto(`${server.url}/ancien`);
    await page.fill("input[type=email]", email);
    await page.keyboard.press("Enter");
    await page.goto(`${server.url}/connexion?token=${await magicLink(email)}&ancien`);
    await page.waitForSelector("input[autocomplete=nickname]");
    await page.fill("input", `Casa_${width}`);
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: /fonder la maison/i }).click({ timeout: 15_000 });
    await page.waitForSelector("[data-intro]");
    for (let i = 0; i < 3; i++)
      await page
        .locator("[data-intro]")
        .getByRole("button", { name: /suivant|commencer/i })
        .click();
    // This journey walks the board freely: the tutorials passed, as « Passer les tutoriels » does
    // (the guided start has its own journey, e2e/tutorial.mjs).
    await page.evaluate(() =>
      localStorage.setItem("fondaco:tutor", JSON.stringify({ all: "skip" })),
    );
    await page.waitForSelector("[data-porcellana-map]", { timeout: 30_000 });
    await shot("1-carte", 20_000);
    // The Fondaco touched by its pin: its card beside it.
    await page.locator("[data-place^='fondaco:']").click();
    await page.locator(".pc-card").waitFor();
    await shot("2-fondaco");
    // A « + » plot open to buy: its card, its price; its round button opens the purchase, bought.
    const plot = page.locator("[data-place^='plot:'][aria-label='Parcelle libre']").first();
    if ((await plot.count()) === 0) faults.push(`${label}: no plot to buy round the house`);
    else {
      const cell = (await plot.getAttribute("data-place"))?.slice(5) ?? "";
      await plot.evaluate((el) => el.click());
      await page.locator(".pc-card").waitFor();
      await shot("3-parcelle");
      await page.locator(".pc-go").click();
      await page.locator("[data-action-panel=sector]").waitFor();
      await shot("4-achat", 4_000);
      await page
        .locator("[data-action-panel=sector]")
        .getByRole("button", { name: /acheter la case/i })
        .click();
      // Bought: the plot is a free tile of the house's; touched, its card offers to build.
      const free = page.locator(`[data-place='free:${cell}']`);
      await free.waitFor({ state: "attached", timeout: 15_000 });
      await shot("4b-achetee", 8_000);
      await free.evaluate((el) => el.click());
      await page.locator(".pc-card").waitFor();
      await page.locator(".pc-go").click();
      const build = page.getByRole("button", { name: /bâtir ·/i }).first();
      await build.waitFor();
      await shot("4c-batir", 2_000);
      await build.click();
      await shot("4d-chantier", 10_000);
    }
    // The Fondaco's tab: up close on it, its bar at the foot.
    await page.keyboard.press("Escape");
    await page
      .locator(
        "[data-top-bar] [data-place-tab=fondaco], [data-bottom-slot] > .slot-in [data-place-tab=fondaco]",
      )
      .first()
      .click();
    await shot("4e-fondaco", 8_000);
    await page
      .locator(
        "[data-top-bar] [data-place-tab=map], [data-bottom-slot] > .slot-in [data-place-tab=map]",
      )
      .first()
      .click();
    // The keys of a computer: the map moves, then zooms.
    await page.keyboard.press("Escape");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("+");
    await shot("5-clavier", 6_000);
    // The other places under the bar: the Company, then the profile behind the medal.
    await page
      .locator(
        "[data-top-bar] [data-place-tab=company], [data-bottom-slot] > .slot-in [data-place-tab=company]",
      )
      .first()
      .click();
    await shot("5b-compagnie", 2_000);
    await page.keyboard.press("Escape");
    await page.locator("[data-house-header]").first().click();
    await shot("5c-maison", 1_500);
    await page.keyboard.press("Escape");
    // Without WebGL: the same board, flat, its pins and its card.
    await page.goto(`${server.url}/ancien?map=svg`);
    await page.waitForSelector("[data-flat-board]", { timeout: 30_000 });
    await page.locator("[data-place^='fondaco:']").click();
    await page.locator(".pc-card").waitFor();
    await shot("6-plat", 2_000);
    await page.close();
  }
} finally {
  await browser.close();
  server.stop();
}
if (faults.length) {
  console.error(faults.join("\n"));
  process.exit(1);
}
console.log(`porcellana: shots in ${SHOTS}`);
