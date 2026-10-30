// The persistent empire's first session (CADRAGE-v3, the socle), on a phone, against a server on
// an empty database in memory that opens the empire's world (WORLD_KIND=empire):
//   pnpm --filter @comptoirs/web build && pnpm --filter @comptoirs/web e2e:empire
// Shots in e2e-shots/empire by default (SHOTS), sizes 390x844 and 320x568 (SIZES).
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { assertNoOverflow, assertSheetHead } from "./assert.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const SHOTS = resolve(process.env.SHOTS ?? join(here, "..", "e2e-shots", "empire"));
const SIZES = (process.env.SIZES ?? "390x844,320x568")
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
});
const faults = [];
try {
  for (const [width, height] of SIZES) {
    const label = `${width}x${height}`;
    const page = await browser.newPage({ viewport: { width, height }, locale: "fr-FR" });
    page.on("pageerror", (e) => faults.push(`${label}: ${e.message}`));
    const shot = async (name) => {
      await page.waitForTimeout(400);
      await assertNoOverflow(page).catch((e) => faults.push(`${label} ${name}: ${e.message}`));
      await page.screenshot({ path: join(SHOTS, `${label}-${name}.png`) });
    };
    const email = `empire_${width}@example.org`;
    await page.goto(server.url);
    await page.fill("input[type=email]", email);
    await page.keyboard.press("Enter");
    await page.goto(`${server.url}/connexion?token=${await magicLink(email)}`);
    await page.waitForSelector("input[autocomplete=nickname]");
    await page.fill("input", `Casa_${width}`);
    await page.keyboard.press("Enter");

    // The door: found the House.
    const found = page.getByRole("button", { name: /fonder la maison/i });
    await found.waitFor({ timeout: 15_000 }).catch(async (e) => {
      await page.screenshot({ path: join(SHOTS, `${label}-stuck.png`) });
      throw e;
    });
    await shot("1-fonder");
    await found.click();

    // The house up close: the Casa, three workshops in orbit, the one gold action.
    await page.getByRole("button", { name: /tout relancer/i }).waitFor();
    if ((await page.locator("[data-workshop]").count()) !== 3)
      faults.push(`${label}: not three workshops`);
    await shot("2-maison");
    await page.getByRole("button", { name: /tout relancer/i }).click();
    await page.waitForTimeout(600);
    await shot("3-relance");

    // Each tab's sheet.
    for (const [tab, name] of [
      ["workshops", "4-ateliers"],
      ["venice", "5-casa"],
      ["ranking", "6-carnet"],
      ["conquest", "6b-famille"],
    ]) {
      await page.locator(`[data-tab=${tab}]`).click();
      await page.waitForSelector('[aria-modal="true"]');
      await assertSheetHead(page).catch((e) => faults.push(`${label} ${name}: ${e.message}`));
      await shot(name);
      await page.locator("[data-tab=map]").click();
      await page.waitForTimeout(400);
    }

    // A workshop up close: its place on the ring, to move it (CADRAGE-v3 § 13, step 5).
    await page.locator("[data-workshop]").first().click();
    await page.waitForSelector('[aria-modal="true"]');
    if ((await page.getByRole("button", { name: /déplacer/i }).count()) === 0)
      faults.push(`${label}: no move on the workshop`);
    await shot("6c-atelier");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    // The Casa's sheet holds the knowledge's tree, closed until the Casa 4.
    await page.locator("[data-tab=venice]").click();
    if (
      !(await page
        .getByText(/savoirs s'ouvrent/i)
        .first()
        .isVisible())
    )
      faults.push(`${label}: no knowledge in the Casa`);
    await page.locator("[data-tab=map]").click();
    await page.waitForTimeout(400);

    // The map zoomed out: Venice and the regions, Lombardy fogged until the Casa 6.
    await page.locator("[data-tab=map]").click();
    await page.waitForSelector("[data-map=empire]");
    if ((await page.locator("[data-region]").count()) < 4) faults.push(`${label}: regions missing`);
    await shot("9-carte");
    await page.locator("[data-region=lombardia]").click();
    await page.getByRole("heading", { name: /lombardie/i }).waitFor();
    await shot("10-lombardie");
    await page.locator("[data-tab=map]").click();
    await page.locator("[data-region=veneto]").click();
    await page.locator("[data-workshop]").first().waitFor();

    // A new workshop on the free place: the brickworks of the Casa 2.
    await page
      .getByRole("button", { name: /nouvel atelier/i })
      .first()
      .click();
    await page.waitForSelector('[aria-modal="true"]');
    await shot("7-nouvel-atelier");
    await page
      .getByRole("listitem")
      .filter({ hasText: /briqueterie/i })
      .getByRole("button")
      .click();
    await page.waitForTimeout(800);
    await shot("8-chantier");
    if (
      !(await page
        .getByText(/chantiers?/i)
        .first()
        .isVisible())
    )
      faults.push(`${label}: no site shown`);
    await page.close();
  }
} finally {
  await browser.close();
  server.stop();
}
if (faults.length > 0) {
  console.error(faults.join("\n"));
  process.exit(1);
}
console.log(`empire e2e: ${SIZES.length} sizes, shots in ${SHOTS}`);
