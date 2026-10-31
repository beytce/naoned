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

    // Lorenzo's three cards at the founding (lot A of the UX audit), then the house.
    await page.waitForSelector("[data-intro]");
    await shot("1b-intro");
    for (let i = 0; i < 3; i++)
      await page
        .locator("[data-intro]")
        .getByRole("button", { name: /suivant|commencer/i })
        .click();
    // The new player's road: the next step says what to do, its gold button does it.
    await page.locator('[data-next-step="relaunch"]').waitFor();
    await page.getByRole("button", { name: /tout relancer/i }).waitFor();
    if ((await page.locator("[data-workshop]").count()) !== 3)
      faults.push(`${label}: not three workshops`);
    // Lot B: each workshop named on its star, the free place reads « Bâtir ».
    for (const name of [/carrière d'argile/i, /camp de bûcherons/i, /scierie/i])
      if ((await page.locator("[data-workshop]").filter({ hasText: name }).count()) !== 1)
        faults.push(`${label}: a workshop unnamed on the orbit`);
    if (
      (await page
        .locator("[data-orbit-empire]")
        .getByText(/^bâtir$/i)
        .count()) !== 1
    )
      faults.push(`${label}: no « Bâtir » on the free place`);
    await shot("2-maison");
    await page.getByRole("button", { name: /tout relancer/i }).click();
    // The Casa 2 asks bricks, made nowhere: the next step names the brickworks.
    await page.locator('[data-next-step="build"]').waitFor();
    await shot("3-relance");

    // Each tab's sheet.
    for (const [tab, name] of [
      ["workshops", "4-ateliers"],
      ["venice", "5-casa"],
      ["ranking", "6-carnet"],
      ["conquest", "6b-terraferme"],
    ]) {
      await page.locator(`[data-tab=${tab}]`).click();
      await page.waitForSelector('[aria-modal="true"]');
      // The Carnet's company comes from its own request: its section in place before the check.
      if (tab === "ranking") await page.waitForSelector("[data-company]");
      await assertSheetHead(page).catch((e) => faults.push(`${label} ${name}: ${e.message}`));
      await shot(name);
      await page.locator("[data-tab=map]").click();
      await page.waitForTimeout(400);
    }

    // The company, in the Carnet's sheet: founded, then the entraide's form (CADRAGE-v3 § 7).
    await page.locator("[data-tab=ranking]").click();
    await page.waitForSelector("[data-company] input");
    await page.locator("[data-company] input").fill(`Ca ${width}`);
    await page.locator("[data-company] input").press("Enter");
    await page.getByRole("button", { name: /demander à la compagnie/i }).waitFor();
    await shot("6d-compagnie");
    await page.locator("[data-tab=map]").click();
    await page.waitForTimeout(400);

    // A workshop up close: its place on the ring, to move it (CADRAGE-v3 § 13, step 5).
    await page.locator("[data-workshop]").first().click();
    await page.waitForSelector('[aria-modal="true"]');
    if ((await page.getByRole("button", { name: /déplacer/i }).count()) === 0)
      faults.push(`${label}: no move on the workshop`);
    await shot("6c-atelier");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    // At the Casa 1, the closed systems stay out of sight (lot A of the UX audit).
    await page.locator("[data-tab=workshops]").click();
    await page.waitForSelector('[aria-modal="true"]');
    if ((await page.locator("[data-arsenal], [data-colleganze]").count()) > 0)
      faults.push(`${label}: the sea shown at the Casa 1`);
    await page.locator("[data-tab=map]").click();
    await page.waitForTimeout(400);
    // The Terraferma's tab: the week's theatre, its entry or the Contesa (CADRAGE-v3 § 8).
    await page.locator("[data-tab=conquest]").click();
    await page.waitForSelector("[data-terra]");
    await page.locator("[data-tab=map]").click();
    await page.waitForTimeout(400);
    // The family, from the Casa's sheet.
    await page.locator("[data-tab=venice]").click();
    await page.getByRole("button", { name: /la famille/i }).click();
    await page
      .getByText(/traits de lignée/i)
      .first()
      .waitFor();
    await shot("6e-famille");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    // The Casa's sheet: the knowledge and the Scuola wait out of sight until the Casa 3.
    await page.locator("[data-tab=venice]").click();
    await page.waitForSelector('[aria-modal="true"]');
    if ((await page.getByText(/savoirs s'ouvrent/i).count()) > 0)
      faults.push(`${label}: the knowledge shown at the Casa 1`);
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

    // The next step opens the new workshop's sheet on the brickworks of the Casa 2.
    await page
      .locator("[data-next-step=build]")
      .getByRole("button", { name: /briqueterie/i })
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
    // Then the next step waits for the site; the resource bar says the stock is still empty (the
    // first lots take half an hour of real time here).
    await page.keyboard.press("Escape");
    await page.locator('[data-next-step="wait"]').waitFor();
    await page.locator("[data-resources]").waitFor();
    await shot("8b-attente");
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
