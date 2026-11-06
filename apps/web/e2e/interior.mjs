// The workshops' insides (docs/plan-ateliers.md lot A5): a house founded, its sawmill touched on
// the Carte, its dock's « Entrer dans l'atelier », the inside in 3D (its stations, the ribbons,
// the bottleneck in red), the bottleneck touched and its card; no overflow.
//   pnpm --filter @comptoirs/web build && node apps/web/e2e/interior.mjs
// Shots in e2e-shots/interior by default (SHOTS), sizes 1440x900 and 390x844 (SIZES).
// (Built on the empire's journey on the Carte (docs/plan-porcellana.md lots 3 to 8): a house founded on the
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
const SHOTS = resolve(process.env.SHOTS ?? join(here, "..", "e2e-shots", "interior"));
const SIZES = (process.env.SIZES ?? "1440x900,390x844")
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
      EMPIRE_INTERIOR: "on",
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
      await page.screenshot({ path: join(SHOTS, `${label}-${name}.png`), timeout: 180_000 });
    };
    const email = `interior_${width}@example.org`;
    await page.goto(server.url);
    await page.fill("input[type=email]", email);
    await page.keyboard.press("Enter");
    await page.goto(`${server.url}/connexion?token=${await magicLink(email)}`);
    await page.waitForSelector("input[autocomplete=nickname]");
    await page.fill("input", `Atelier_${width}`);
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: /fonder la maison/i }).click({ timeout: 15_000 });
    await page.waitForSelector("[data-intro]");
    for (let i = 0; i < 3; i++)
      await page
        .locator("[data-intro]")
        .getByRole("button", { name: /suivant|commencer/i })
        .click();
    await page.waitForSelector("[data-porcellana-map]", { timeout: 30_000 });
    // The sawmill on the Carte: its card, then its dock.
    const saw = page.locator("[data-place^='workshop:'][aria-label='Scierie']").first();
    await saw.waitFor({ state: "attached", timeout: 30_000 });
    await saw.evaluate((el) => el.click());
    await page.locator(".pc-card").waitFor();
    await page.locator(".pc-go").click();
    await page.locator("[data-enter-interior]").waitFor();
    await shot("1-dock", 4_000);
    // Inside.
    await page.locator("[data-enter-interior]").click();
    await page.locator("[data-interior-scene]").waitFor({ timeout: 30_000 });
    await shot("2-interieur", 25_000);
    const neck = page.locator("[data-interior-pin][data-hot=true]");
    if ((await neck.count()) !== 1) faults.push(`${label}: ${await neck.count()} bottlenecks`);
    else {
      await neck.evaluate((el) => el.click());
      await page.locator(".pc-card").waitFor();
      await shot("3-goulot", 6_000);
    }
    // Out again: the map.
    await page.locator("[data-interior-scene] > button[aria-label=Fermer]").click();
    await page.locator("[data-interior-scene]").waitFor({ state: "detached" });
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
console.log(`interior: shots in ${SHOTS}`);
