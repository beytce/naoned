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
import { assertNoOverflow, assertOneGold, assertSheetHead } from "./assert.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const SHOTS = resolve(process.env.SHOTS ?? join(here, "..", "e2e-shots", "empire"));
const SIZES = (process.env.SIZES ?? "390x844,320x568")
  .split(",")
  .map((s) => s.split("x").map(Number));
const log = join(SHOTS, "server.log");

/**
 * The refonte claire (5 November 2026): the Company is a place at the foot, the Market (the Dogana)
 * and the Family behind the Casa's medal, the map « Carte » at the foot.
 */
async function openRound(page, round) {
  // The foot in place, never one sliding away (`data-slot-out`).
  const tab = (id) => page.locator(`[data-bottom-slot] > .slot-in [data-place-tab=${id}]`);
  if (round === "company") return tab("company").click();
  if (round === "recenter") return tab("map").click();
  await page.locator("[data-house-header]").click();
  await page.locator(`[data-profile-door=${round}]`).click();
}

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
      // The long voyages (five minutes and more) quickened for the journey: a second a unit, a
      // hop to Padua in some thirty seconds (development only, refused in production).
      WORLD_SETTINGS_OVERRIDE: JSON.stringify({ empire: { moves: { secondsPerUnit: 1 } } }),
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

// The journey on the 3D board, the game's map by default (3 November 2026): WebGL in software in a
// container without a GPU; a place is touched through the scene (a ray), so its mark is pressed at
// its middle with the mouse rather than clicked. MAP3D=0: on the SVG board, the fallback (?map=svg).
const MAP3D = process.env.MAP3D !== "0";
// The fondaco's workshops: on the 3D board in its domain (decision of the owner, 3 November 2026),
// on the SVG board in orbit around it.
const WS = MAP3D ? "[data-domain-layer] [data-workshop]" : "[data-orbit-open=home] [data-workshop]";
const OPEN = MAP3D ? "[data-domain-layer]" : "[data-orbit-open]";

const server = await startServer();
const browser = await chromium.launch({
  ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}),
  ...(MAP3D
    ? { args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] }
    : {}),
});
const faults = [];
try {
  for (const [width, height] of SIZES) {
    const label = `${width}x${height}`;
    const page = await browser.newPage({ viewport: { width, height }, locale: "fr-FR" });
    page.on("pageerror", (e) => faults.push(`${label}: ${e.message}`));
    /** A place of the map touched: its mark clicked, or on the 3D board, the scene at its middle. */
    const press = async (sel) => {
      const mark = page.locator(sel).first();
      if (!MAP3D) return mark.click();
      await mark.waitFor();
      const b = await mark.boundingBox();
      if (b) await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    };
    const shot = async (name) => {
      await page.waitForTimeout(400);
      await assertNoOverflow(page).catch((e) => faults.push(`${label} ${name}: ${e.message}`));
      await assertOneGold(page).catch((e) => faults.push(`${label} ${name}: ${e.message}`));
      await page.screenshot({ path: join(SHOTS, `${label}-${name}.png`) });
    };
    const email = `empire_${width}@example.org`;
    await page.goto(server.url);
    await page.fill("input[type=email]", email);
    await page.keyboard.press("Enter");
    await page.goto(
      `${server.url}/connexion?token=${await magicLink(email)}${MAP3D ? "" : "&map=svg"}`,
    );
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
    // The map that grows: Venice's sector alone, Venice and Padua towns with their orders, the
    // house's fondaco apart (1 November 2026), its reach hidden until it is touched.
    if ((await page.locator("[data-city]:not([data-city=venezia])").count()) !== 1)
      faults.push(`${label}: Venice's sector without Padua, or with more`);
    if ((await page.locator("[data-city=venezia]").count()) !== 1)
      faults.push(`${label}: Venice not drawn as a town`);
    if ((await page.locator("[data-reach-of]").count()) !== 0)
      faults.push(`${label}: a reach drawn before a fondaco is touched`);
    // The first fondaco put down: the house is asked once, at a point apart from the towns.
    await page.locator("[data-placing-bar=home]").waitFor();
    await shot("1c-fondaco");
    const cellLit = page.locator("[data-cell]").first();
    const box = await cellLit.boundingBox();
    if (box) await cellLit.click({ position: { x: box.width * 0.5, y: box.height * 0.8 } });
    await page.locator("[data-picked-reach]").waitFor();
    await page.getByRole("button", { name: /poser ici · gratuit/i }).click();
    await page.locator("[data-placing-bar=home]").waitFor({ state: "hidden" });
    // Put down, the fondaco bursts with gold (chantier 4 of Hades' Star).
    await page
      .locator("[data-post-raised]")
      .first()
      .waitFor({ state: "attached", timeout: 3_000 })
      .catch(() => faults.push(`${label}: no burst on the fondaco put down`));
    if ((await page.locator(OPEN).count()) > 0)
      faults.push(`${label}: the workshops shown before Venice is touched`);
    await shot("1c-secteur");
    // The information layer (chantier 4): a finger held on the map, then Alt; every name shows.
    const mapBox = await page.locator("[data-map=empire]").boundingBox();
    const seaX = (mapBox?.x ?? 0) + (mapBox?.width ?? width) * 0.12;
    const seaY = (mapBox?.y ?? 0) + (mapBox?.height ?? height) * 0.62;
    const isInfo = () =>
      page.locator("[data-map=empire]").evaluate((el) => el.dataset.info === "1");
    await page.mouse.move(seaX, seaY);
    await page.mouse.down();
    await page.waitForTimeout(700);
    if (!(await isInfo())) faults.push(`${label}: no information layer on a long press`);
    await shot("1d-calque");
    await page.mouse.up();
    if (await isInfo()) faults.push(`${label}: the information layer stays after the press`);
    await page.keyboard.down("Alt");
    if (!(await isInfo())) faults.push(`${label}: no information layer with Alt`);
    await page.keyboard.up("Alt");
    if (await isInfo()) faults.push(`${label}: the information layer stays after Alt`);
    // The keys of a computer: an arrow moves the map, « + » zooms it, « - » back.
    const layer = () =>
      page
        .locator("[data-map=empire] .map-layer")
        .first()
        .evaluate((el) => el.style.transform);
    const before = await layer();
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(350);
    if ((await layer()) === before) faults.push(`${label}: an arrow does not move the map`);
    const moved = await layer();
    await page.keyboard.press("+");
    await page.waitForTimeout(350);
    if ((await layer()) === moved) faults.push(`${label}: « + » does not zoom the map`);
    await page.keyboard.press("-");
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(350);
    // The fondaco touched: its workshops deploy around it, and its reach shows.
    await press("[data-region=veneto]");
    await page.locator(WS).first().waitFor();
    if (MAP3D) {
      // The domain: the Casa on the fondaco's tile, the map's marks put away.
      if ((await page.locator("[data-domain-casa]").count()) !== 1)
        faults.push(`${label}: no Casa on the domain's fondaco`);
      await page
        .locator("[data-domain-bar=veneto]")
        .waitFor({ timeout: 5_000 })
        .catch(() => faults.push(`${label}: no bar at the domain's foot`));
      if (await page.locator("[data-city=padova]").first().isVisible())
        faults.push(`${label}: Padua's mark shown in the domain`);
    } else {
      if ((await page.locator("[data-reach-of=home]").count()) !== 1)
        faults.push(`${label}: no reach drawn around the fondaco touched`);
      // The bubble stays itself in the middle of its workshops: no second sun.
      if (
        (await page.locator("[data-home]").count()) !== 1 ||
        (await page.locator("[data-casa-sun]").count()) > 0
      )
        faults.push(`${label}: Venice's bubble replaced when its workshops deploy`);
    }
    // The corners: the ducats alone (the refonte claire: no fleet count), and the four places.
    await page.locator("[data-hud=ducats]").waitFor();
    if ((await page.locator("[data-hud=fleet]").count()) > 0)
      faults.push(`${label}: a fleet count still in the corner`);
    // (A foot leaving slides away for a moment: its tabs are not counted.)
    await page.waitForTimeout(400);
    const tabs = await page.locator("[data-place-tab]").count();
    if (tabs !== 4) faults.push(`${label}: ${tabs} places at the foot, not four`);
    // The new player's road: the next step says what to do, its gold button does it.
    await page.locator('[data-next-step="relaunch"]').first().waitFor();
    if ((await page.locator("[data-workshop]").count()) !== 3)
      faults.push(`${label}: not three workshops`);
    // Named by their text on the orbit, by their label in the domain (its tiles show the rest).
    const names = await page
      .locator("[data-workshop]")
      .evaluateAll((els) => els.map((e) => `${e.textContent} ${e.getAttribute("aria-label")}`));
    for (const name of [/carrière d'argile/i, /camp de bûcherons/i, /scierie/i])
      if (names.filter((x) => name.test(x)).length !== 1)
        faults.push(`${label}: a workshop unnamed on the orbit`);
    if (
      MAP3D
        ? (await page.locator("[data-domain-free]").count()) !== 1
        : (await page
            .locator("[data-orbit-empire]")
            .getByText(/^bâtir$/i)
            .count()) !== 1
    )
      faults.push(`${label}: no « Bâtir » on the free place`);
    await shot("2-maison");
    await page.waitForTimeout(500);
    await page
      .getByRole("button", { name: /tout relancer/i })
      .first()
      .click();
    // The Casa 2 asks bricks, made nowhere: the next step names the brickworks.
    await page.locator('[data-next-step="build"]').first().waitFor();
    await shot("3-relance");

    // A workshop touched: its dock (docs/plan-dock.md), its doors, then its raise before → after.
    await page.locator("[data-workshop]").first().click();
    await page.locator("[data-workshop-dock]").waitFor();
    // The dock in the middle of a wide screen (its animation no longer moves it aside).
    if (width >= 1024) {
      const box = await page.locator("[data-workshop-dock]").boundingBox();
      if (box && Math.abs(box.x + box.width / 2 - width / 2) > 4)
        faults.push(`${label}: the dock not centred`);
    }
    if ((await page.locator("[data-workshop-dock] [data-map-action=upgrade]").count()) !== 1)
      faults.push(`${label}: no raise in the workshop's dock`);
    if (
      (await page
        .locator("[data-workshop-dock]")
        .getByRole("button", { name: /déplacer/i })
        .count()) === 0
    )
      faults.push(`${label}: no move on the workshop`);
    await shot("4-panneau");
    await page.locator("[data-workshop-dock] [data-map-action=upgrade]").click();
    await page
      .locator(
        "[data-workshop-dock] [data-compare], [data-workshop-dock] [data-dock-maxed], [data-workshop-dock] [data-dock-site]",
      )
      .first()
      .waitFor();
    await shot("4b-atelier");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);

    // The Production, behind the « + » (on the 3D board, in the domain's bar, the workshop's panel
    // closed first): the buildings, then the vehicles and the fleet.
    if (MAP3D && (await page.locator("[data-domain-bar]").count()) === 0) {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
    }
    await page.locator("[data-production]").click();
    await page.waitForSelector('[aria-modal="true"]');
    await page.waitForTimeout(450);
    await assertSheetHead(page).catch((e) => faults.push(`${label} 5-production: ${e.message}`));
    await page.locator("[data-production-pane=vehicles]").click();
    await page.locator("[data-fleet]").waitFor();
    await shot("5-production");
    // The vehicles are bought at the Remise only (1 November): the pane points to it.
    await page.locator("[data-to-remise]").waitFor();
    if ((await page.locator("[data-model], [data-arsenal]").count()) > 0)
      faults.push(`${label}: vehicles sold outside the Remise`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);

    // The round buttons: the Market, the Company, the Family (on the 3D board, out of the domain).
    if (MAP3D) {
      await page.locator("[data-domain-back]").click();
      await page.locator("[data-place-tab=map]").waitFor();
    }
    for (const [round, name, ready] of [
      ["market", "6-marche", "[data-market]"],
      ["company", "7-compagnie", "[data-carnet]"],
      ["family", "8-famille", '[aria-modal="true"]'],
    ]) {
      await openRound(page, round);
      await page.waitForSelector(ready);
      // The sheet still rising: its head checked once it has come to rest.
      await page.waitForTimeout(450);
      await assertSheetHead(page).catch((e) => faults.push(`${label} ${name}: ${e.message}`));
      await shot(name);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
    }
    // A sheet covers the screen to its foot: no place's tab left to touch under it.
    await openRound(page, "market");
    await page.waitForSelector("[data-market]");
    await page.waitForTimeout(450);
    const under = await page.evaluate(() => {
      const at = document.elementFromPoint(window.innerWidth - 30, window.innerHeight - 20);
      return at?.closest("[data-place-tab]") ? "round" : "";
    });
    if (under) faults.push(`${label}: a round button still under the open sheet`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    // The corner's counts say what they are when touched; the Favour and the Seals are away while
    // the house has none (audit of 4 November, UX M7).
    await page.locator("[data-hud=ducats]").click();
    await page.locator("[data-hud=ducats] [role=note]").waitFor();
    if ((await page.locator("[data-hud=favour], [data-hud=seals]").count()) > 0)
      faults.push(`${label}: a Favour or Seals count at zero in the corner`);
    // Off the network, it is said; back on it, the word goes (audit of 4 November, UX M10).
    await page.context().setOffline(true);
    await page
      .locator("[data-offline]")
      .waitFor({ timeout: 3_000 })
      .catch(() => faults.push(`${label}: nothing said off the network`));
    await page.context().setOffline(false);
    await page
      .locator("[data-offline]")
      .waitFor({ state: "detached", timeout: 5_000 })
      .catch(() => faults.push(`${label}: still « offline » once back on the network`));

    // The Market: a good touched opens its sheet, to sell or deliver.
    await openRound(page, "market");
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
    await openRound(page, "company");
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
    await openRound(page, "family");
    await page
      .getByText(/traits de lignée/i)
      .first()
      .waitFor();
    if ((await page.getByText(/savoirs s'ouvrent/i).count()) > 0)
      faults.push(`${label}: the knowledge shown at the Casa 1`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);

    // Out to the map (step 3): Venice's sector seen, the six around it in silhouette, Lombardy
    // still in the dark. (On the 3D board, out of the domain already: over the fondaco.)
    if (!MAP3D) await openRound(page, "recenter");
    await page.locator("[data-map=empire]:not([data-orbit])").waitFor();
    await page.waitForTimeout(300);
    if (MAP3D) {
      if ((await page.locator("[data-map=empire] canvas").count()) !== 1)
        faults.push(`${label}: no 3D board under the map`);
    } else if ((await page.locator("[data-plateau] .plateau-fog").count()) < 6)
      faults.push(`${label}: no silhouettes around Venice's sector`);
    if ((await page.locator("[data-city=milano], [data-region=lombardia]").count()) > 0)
      faults.push(`${label}: Lombardy seen through the dark at the Casa 1`);
    await shot("9-carte");
    // A counter put down from the Production: the cells light up, one is picked, it is put. On
    // the 3D board, the Production is in the domain.
    if (MAP3D) await press("[data-region=veneto]");
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
    if ((await page.locator(OPEN).count()) > 0)
      faults.push(`${label}: the workshops deployed by a zoom`);
    await press("[data-region=veneto]");
    await page.locator(WS).first().waitFor();

    // The next step opens the Production on the brickworks of the Casa 2.
    await page.waitForTimeout(500);
    await page
      .locator("[data-next-step=build]")
      .first()
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
    await page.locator('[data-next-step="wait"]').first().waitFor();
    await shot("12-attente");
    // Buying at the market goes into a counter's stock: ten units of a good, into Venice's.
    if (MAP3D) await page.locator("[data-domain-back]").click();
    await openRound(page, "market");
    await page.waitForSelector("[data-market]");
    if ((await page.locator("[data-market-buy] button:enabled").count()) === 0)
      faults.push(`${label}: nothing to buy at the market`);
    else {
      const row = page
        .locator("[data-market-buy]")
        .filter({ has: page.locator("button:enabled") })
        .first();
      const good = await row.getAttribute("data-market-buy");
      await row.locator("button").click();
      // A weighty purchase asks a second touch (audit of 4 November, UX B1).
      if ((await row.getAttribute("data-confirm")) !== null) await row.locator("button").click();
      await page
        .locator(`[data-market-good=${good}]`)
        .getByText(/en stock/)
        .waitFor();
    }
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    // The market sells no vehicle (1 November).
    if ((await page.locator("[data-market] ~ * [data-model]").count()) > 0)
      faults.push(`${label}: vehicles at the market`);
    // The cities' orders (after Hades' Star): Padua's ring, its orders touched; a cart chosen
    // lights the towns within its reach.
    await page.waitForTimeout(800);
    await press("[data-city=padova]");
    await page
      .locator("[data-orders-panel=padova] [data-order]")
      .first()
      .waitFor({ timeout: 8_000 })
      .catch(async (e) => {
        await shot("13x-padoue");
        throw e;
      });
    // On the SVG board, its ring of orders; on the 3D board, its crates in the scene.
    if (!MAP3D && (await page.locator("[data-city=padova] [data-fill-ring]").count()) === 0)
      faults.push(`${label}: no ring of orders around Padua`);
    await shot("14-commandes");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    if (!MAP3D) {
      // On the SVG board (the fallback), a cart touched at its counter by its medal: « Charger »
      // lists the orders of the cities the counter serves, sorted; a touch loads one.
      const tapBox = await page.locator("[data-vehicle]").first().boundingBox();
      const tap = {
        clientX: (tapBox?.x ?? 0) + (tapBox?.width ?? 0) / 2,
        clientY: (tapBox?.y ?? 0) + (tapBox?.height ?? 0) / 2,
        pointerId: 1,
        isPrimary: true,
        button: 0,
      };
      await page.locator("[data-vehicle]").first().dispatchEvent("pointerdown", tap);
      await page.evaluate((t) => window.dispatchEvent(new PointerEvent("pointerup", t)), tap);
      await page.locator("[data-vehicle-panel] [data-hop-action=load]").click();
      await page.locator("[data-vehicle-panel] [data-load-pane]").waitFor();
      if ((await page.locator("[data-load-pane] [data-order]").count()) === 0)
        faults.push(`${label}: no order to load at Venice's counter`);
      await shot("14b-charger");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    } else if ((await page.locator("[data-vehicle]").count()) > 0)
      // On the 3D board, no medal over the animals (decision of the owner, 3 November).
      faults.push(`${label}: a vehicle's medal on the 3D board`);
    // « Livrer » from Padua (decision of the owner, 3 November): its orders bought at the market,
    // one gold button loads them on a free vehicle, which leaves at once; its token under the
    // house's name tells where and how long, offers to call it back a few seconds, and it comes
    // back alone.
    const wants = await page.evaluate(async () => {
      const v = await (await fetch("/api/empire", { credentials: "same-origin" })).json();
      return (v.view?.orders.find((o) => o.city === "padova")?.orders ?? []).map((o) => ({
        good: o.good,
        qty: o.qty,
      }));
    });
    for (const w of wants)
      await page.evaluate(
        (a) =>
          fetch("/api/empire/actions", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "empireBuy", good: a.good, qty: a.qty }),
          }),
        w,
      );
    await page.reload();
    await page
      .locator(MAP3D ? "[data-map=empire][data-three]" : "[data-map=empire]")
      .waitFor({ timeout: 60_000 });
    await page.waitForTimeout(1_500);
    await press("[data-city=padova]");
    await page.locator("[data-orders-panel=padova] [data-order]").first().waitFor();
    // Chosen by its stock (when the purse could buy it: the button shows then).
    if (
      (await page.locator("[data-orders-panel=padova] [data-deliver]").count()) > 0 &&
      (await page.locator("[data-orders-panel=padova] [data-picked]").count()) === 0
    )
      faults.push(`${label}: no order of Padua chosen by its stock`);
    await shot("15-livrer");
    const deliver = page.locator("[data-orders-panel=padova] [data-deliver] button");
    if ((await deliver.count()) === 0) {
      // The purse too short for the lot at the market (the whole delivery is map3d.mjs's): the
      // sheet says why instead.
      if ((await page.locator("[data-orders-panel=padova] [data-why]").count()) === 0)
        faults.push(`${label}: neither « Livrer » nor why for Padua`);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
    } else {
      await deliver.click();
      await page.locator("[data-trip]").first().waitFor({ timeout: 5_000 });
      if ((await page.locator("[data-recall]").count()) === 0)
        faults.push(`${label}: no « Rappeler » just after leaving`);
      await shot("16-en-route");
      await page.waitForTimeout(6_000);
      if ((await page.locator("[data-recall]").count()) > 0)
        faults.push(`${label}: « Rappeler » still offered after five seconds`);
      // There and back, alone (a second a unit in this journey).
      await page
        .locator("[data-trip]")
        .getByText(/Retour/)
        .first()
        .waitFor({ timeout: 90_000 });
      await shot("17-retour");
      await page.locator("[data-trip]").first().waitFor({ state: "detached", timeout: 90_000 });
      await shot("18-rentree");
    }
    // Far out, the zoom stops at the house's whole map, the page alive (1 November: it crashed).
    await page.mouse.move(width / 2, height / 2);
    for (let i = 0; i < 10; i++) await page.mouse.wheel(0, 2_000);
    await page.waitForTimeout(500);
    const farthest =
      (await page.locator("button[data-city=padova]").first().boundingBox())?.width ?? 0;
    if (!(farthest > 4)) faults.push(`${label}: Padua lost far out (${farthest})`);
    await shot("19b-au-plus-loin");
    for (let i = 0; i < 10; i++) await page.mouse.wheel(0, -2_000);
    await page.waitForTimeout(400);
    // Far, the towns shrink with the map (after Hades' Star: a planet is small when far).
    const near = (await page.locator("button[data-city=padova]").first().boundingBox())?.width ?? 0;
    await page.mouse.move(width / 2, height / 2);
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(600);
    const far = (await page.locator("button[data-city=padova]").first().boundingBox())?.width ?? 0;
    if (!(far < near))
      faults.push(`${label}: Padua does not shrink when zooming out (${near} → ${far})`);
    await shot("19-dezoom");
    await page.mouse.wheel(0, -900);
    await page.waitForTimeout(400);
    // A sector next to Venice's to buy (1 November): its edge touched, its panel.
    await openRound(page, "recenter");
    await page.waitForTimeout(500);
    const sector = page.locator("[data-buyable]").first();
    if ((await page.locator("[data-buyable]").count()) === 0)
      faults.push(`${label}: no sector to buy next to Venice's`);
    else {
      const cell = await sector.getAttribute("data-buyable");
      await sector.dispatchEvent("click");
      await page.locator("[data-action-panel=sector]").waitFor();
      await shot("13-case");
      // Its action: to buy it, or the Casa its region waits for.
      if ((await page.locator("[data-map-action=unlock], [data-map-action=closed]").count()) === 0)
        faults.push(`${label}: no action on the sector ${cell}`);
    }
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
