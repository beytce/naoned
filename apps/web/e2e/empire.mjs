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
    // The map at the centre: the whole screen, Venice's sector across it, inhabited (step 4).
    await page.waitForSelector("[data-map=empire]");
    // The map that grows: Venice's sector alone, with Padua beside Venice, and Venice's reach.
    if ((await page.locator("[data-city]").count()) !== 1)
      faults.push(`${label}: Venice's sector without Padua, or with more`);
    if ((await page.locator("[data-reach-of=home]").count()) !== 1)
      faults.push(`${label}: no reach drawn around Venice`);
    if ((await page.locator("[data-orbit-open]").count()) > 0)
      faults.push(`${label}: the workshops shown before Venice is touched`);
    await shot("1c-secteur");
    // Venice touched: its workshops deploy around it.
    await page.locator("[data-region=veneto]").click();
    await page.locator("[data-orbit-open=home] [data-workshop]").first().waitFor();
    // The bubble stays itself in the middle of its workshops: no second sun.
    if (
      (await page.locator("[data-home]").count()) !== 1 ||
      (await page.locator("[data-casa-sun]").count()) > 0
    )
      faults.push(`${label}: Venice's bubble replaced when its workshops deploy`);
    // The corners: the ducats, and the two mules at home among two.
    await page.locator("[data-hud=ducats]").waitFor();
    if (!/2\s*\/\s*2/.test(await page.locator("[data-hud=fleet]").innerText()))
      faults.push(`${label}: the fleet not « 2 / 2 » in the corner`);
    // The new player's road: the next step says what to do, its gold button does it.
    await page.locator('[data-next-step="relaunch"]').waitFor();
    if ((await page.locator("[data-workshop]").count()) !== 3)
      faults.push(`${label}: not three workshops`);
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

    // A workshop touched: its panel, then its details (its place on the ring, to move it).
    await page.locator("[data-workshop]").first().click();
    await page.locator("[data-action-panel=workshop]").waitFor();
    // The panel in the middle of a wide screen (its animation no longer moves it aside).
    if (width >= 1024) {
      const box = await page.locator("[data-action-panel]").boundingBox();
      if (box && Math.abs(box.x + box.width / 2 - width / 2) > 4)
        faults.push(`${label}: the panel not centred`);
    }
    if ((await page.locator("[data-map-action=upgrade]").count()) !== 1)
      faults.push(`${label}: no level in the workshop's panel`);
    await shot("4-panneau");
    await page.locator("[data-map-action=details]").click();
    await page.waitForSelector('[aria-modal="true"]');
    if ((await page.getByRole("button", { name: /déplacer/i }).count()) === 0)
      faults.push(`${label}: no move on the workshop`);
    await shot("4b-atelier");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);

    // The Production, behind the « + »: the buildings, then the vehicles and the fleet.
    await page.locator("[data-production]").click();
    await page.waitForSelector('[aria-modal="true"]');
    await page.waitForTimeout(450);
    await assertSheetHead(page).catch((e) => faults.push(`${label} 5-production: ${e.message}`));
    await page.locator("[data-production-pane=vehicles]").click();
    await page.locator("[data-fleet]").waitFor();
    await shot("5-production");
    // The land vehicles wait for the Remise, put on the map from the Casa 2.
    await page.locator("[data-no-depot]").waitFor();
    if (await page.locator("[data-no-depot] button").isEnabled())
      faults.push(`${label}: the Remise offered before the Casa 2`);
    // At the Casa 1, the sea stays out of sight (lot A of the UX audit).
    if ((await page.locator("[data-arsenal]").count()) > 0)
      faults.push(`${label}: the Arsenal shown at the Casa 1`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);

    // The round buttons: the Market, the Company, the Family.
    for (const [round, name, ready] of [
      ["market", "6-marche", "[data-market]"],
      ["company", "7-compagnie", "[data-carnet]"],
      ["family", "8-famille", '[aria-modal="true"]'],
    ]) {
      await page.locator(`[data-round=${round}]`).click();
      await page.waitForSelector(ready);
      // The sheet still rising: its head checked once it has come to rest.
      await page.waitForTimeout(450);
      await assertSheetHead(page).catch((e) => faults.push(`${label} ${name}: ${e.message}`));
      await shot(name);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
    }
    // A sheet covers the screen to its foot: no round button left to touch under it.
    await page.locator("[data-round=market]").click();
    await page.waitForSelector("[data-market]");
    await page.waitForTimeout(450);
    const under = await page.evaluate(() => {
      const at = document.elementFromPoint(window.innerWidth - 30, window.innerHeight - 20);
      return at?.closest("[data-round]") ? "round" : "";
    });
    if (under) faults.push(`${label}: a round button still under the open sheet`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    // The corner's counts say what they are when touched.
    await page.locator("[data-hud=favour]").click();
    await page.locator("[data-hud=favour] [role=note]").waitFor();

    // The Market: a good touched opens its sheet, to sell or deliver.
    await page.locator("[data-round=market]").click();
    await page.locator("[data-market-good]").first().click();
    await page
      .getByText(/dogana/i)
      .first()
      .waitFor();
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    // The Company's panes: the company founded, then the entraide's form (CADRAGE-v3 § 7); the
    // Terraferma's week (CADRAGE-v3 § 8).
    await page.locator("[data-round=company]").click();
    await page.locator("[data-pane=company]").click();
    await page.waitForSelector("[data-company] input");
    await page.locator("[data-company] input").fill(`Ca ${width}`);
    await page.locator("[data-company] input").press("Enter");
    await page.getByRole("button", { name: /demander à la compagnie/i }).waitFor();
    await page.locator("[data-pane=terra]").click();
    // The Terraferma waits for the Campo, put on the map from the Casa 4.
    await page.waitForSelector("[data-no-camp]");
    await shot("7b-terraferme");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    // The Family: the knowledge and the Scuola wait out of sight until the Casa 3.
    await page.locator("[data-round=family]").click();
    await page
      .getByText(/traits de lignée/i)
      .first()
      .waitFor();
    if ((await page.getByText(/savoirs s'ouvrent/i).count()) > 0)
      faults.push(`${label}: the knowledge shown at the Casa 1`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);

    // Out to the map (step 3): Venice's sector seen, the six around it in silhouette, Lombardy
    // still in the dark.
    await page.locator("[data-round=recenter]").click();
    await page.locator("[data-map=empire]:not([data-orbit])").waitFor();
    await page.waitForTimeout(300);
    if ((await page.locator("[data-frontier] path").count()) < 6)
      faults.push(`${label}: no silhouettes around Venice's sector`);
    if ((await page.locator("[data-city=milano], [data-region=lombardia]").count()) > 0)
      faults.push(`${label}: Lombardy seen through the dark at the Casa 1`);
    await shot("9-carte");
    // A counter put down from the Production: the cells light up, one is picked, it is put.
    await page.locator("[data-production]").click();
    await page.locator("[data-place=post] button").click();
    await page.locator("[data-placing-bar=post]").waitFor();
    await page.waitForTimeout(700);
    await shot("10b-poser");
    // A point of a lit cell touched: the reach the counter would have there, and what it serves.
    const lit = await page.locator("[data-cell]").first().boundingBox();
    if (lit)
      await page
        .locator("[data-cell]")
        .first()
        .dispatchEvent("click", {
          clientX: lit.x + lit.width * 0.5,
          clientY: lit.y + lit.height * 0.8,
        });
    await page.locator("[data-picked-reach]").waitFor();
    await page.locator("[data-point-check]").waitFor();
    await page.getByRole("button", { name: /poser ici/i }).waitFor();
    await shot("10c-comptoir");
    // Not now: the brickworks of the Casa 2 first (a counter here costs most of the purse).
    await page.getByRole("button", { name: /annuler/i }).click();
    await page.locator("[data-placing-bar]").waitFor({ state: "detached" });
    // A zoom never deploys the workshops; Venice touched does.
    const venice = await page.locator("[data-region=veneto]").boundingBox();
    if (venice) {
      await page.mouse.move(venice.x + venice.width / 2, venice.y + venice.height / 2);
      for (let i = 0; i < 8; i++) await page.mouse.wheel(0, -300);
    }
    await page.waitForTimeout(500);
    if ((await page.locator("[data-orbit-open]").count()) > 0)
      faults.push(`${label}: the workshops deployed by a zoom`);
    await page.locator("[data-region=veneto]").click();
    await page.locator("[data-orbit-open=home] [data-workshop]").first().waitFor();

    // The next step opens the Production on the brickworks of the Casa 2.
    await page
      .locator("[data-next-step=build]")
      .getByRole("button", { name: /briqueterie/i })
      .click();
    await page.waitForSelector('[aria-modal="true"]');
    await shot("11-nouvel-atelier");
    await page
      .getByRole("listitem")
      .filter({ hasText: /briqueterie/i })
      .getByRole("button")
      .click();
    await page.waitForTimeout(800);
    // Then the next step waits for the site.
    await page.locator('[data-next-step="wait"]').waitFor();
    await shot("12-attente");
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
