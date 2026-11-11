// The switch to square tiles, rehearsed end to end (docs/plan-porcellana.md M4): a house founded
// and grown on the hexagonal map, the same server started again on square tiles over the same
// database, the house signed in again: its board on square tiles, its land, its workshops.
//   pnpm --filter @comptoirs/web build && node e2e/switch.mjs
// Shots in e2e-shots/bascule by default (SHOTS).
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const here = dirname(fileURLToPath(import.meta.url));
const SHOTS = resolve(process.env.SHOTS ?? join(here, "..", "e2e-shots", "bascule"));
const SIZES = (process.env.SIZES ?? "1280x800,390x844")
  .split(",")
  .map((s) => s.split("x").map(Number));
const log = join(SHOTS, "server.log");

async function startServer(grid, db) {
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
      DATABASE_URL: db,
      HOST: "127.0.0.1",
      PORT: String(port),
      APP_URL: url,
      WEB_DIST: join(here, "..", "dist"),
      WORLD_KIND: "empire",
      EMPIRE_GRID: grid,
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

const db = `pglite:${join(SHOTS, "db")}`;
mkdirSync(SHOTS, { recursive: true });
rmSync(join(SHOTS, "db"), { recursive: true, force: true });
const browser = await chromium.launch({
  ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}),
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const faults = [];
const email = "bascule@example.org";
try {
  // Before: the hexagonal map, a house founded, its fondaco put down by the server's default.
  let server = await startServer("hex", db);
  let page = await browser.newPage({ viewport: { width: 1280, height: 800 }, locale: "fr-FR" });
  page.on("pageerror", (e) => faults.push(`hex: ${e.message}`));
  await page.goto(`${server.url}/ancien`);
  await page.fill("input[type=email]", email);
  await page.keyboard.press("Enter");
  await page.goto(`${server.url}/connexion?token=${await magicLink(email)}`);
  await page.waitForSelector("input[autocomplete=nickname]");
  await page.fill("input", "Casa_bascule");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: /fonder la maison/i }).click({ timeout: 15_000 });
  await page.waitForSelector("[data-intro]");
  for (let i = 0; i < 3; i++)
    await page
      .locator("[data-intro]")
      .getByRole("button", { name: /suivant|commencer/i })
      .click();
  // The web draws only the square board since the lot 8: the house is founded, its map not drawn.
  await page.waitForTimeout(3_000);
  await page.close();
  server.stop();
  await new Promise((r) => setTimeout(r, 2_000));
  // After: the same database, the server on square tiles; the house signs in again.
  server = await startServer("square", db);
  page = await browser.newPage({ viewport: { width: 1280, height: 800 }, locale: "fr-FR" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  page.on("pageerror", (e) => faults.push(`square: ${e.message}`));
  await page.goto(`${server.url}/ancien`);
  await page.fill("input[type=email]", email);
  await page.keyboard.press("Enter");
  await page.goto(`${server.url}/connexion?token=${await magicLink(email)}&map=3d`);
  await page.waitForSelector("[data-porcellana-map]", { timeout: 30_000 });
  await page.waitForTimeout(15_000);
  await page.screenshot({ path: join(SHOTS, "2-apres-cases.png"), timeout: 120_000 });
  if ((await page.locator("[data-place^='fondaco:']").count()) !== 1)
    faults.push("square: the fondaco not on the board");
  if ((await page.locator("[data-place^='workshop:']").count()) < 1)
    faults.push("square: no workshop on its tile");
  await page.close();
  server.stop();
} finally {
  await browser.close();
}
if (faults.length) {
  console.error(faults.join("\n"));
  process.exit(1);
}
console.log(`switch rehearsed: shots in ${SHOTS}`);
