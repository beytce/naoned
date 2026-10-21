// The first session in full, on two phones (390 × 844 and 320 × 568): the sign-in, the
// merchant's name, Lorenzo's guide played to its last card (« Bravo », objective 6/6, the Livre
// de compte's reward cashed: produce, harvest, deliver to a city, buy at the Rialto, the reward),
// then a transformation in the workshops, the Terraferma during its truce, the notices. After
// every step, the page must not scroll sideways, no two blocks of the HUD may cover each other
// nor the map's names and medallions, those that can be touched are 44 px at least, Lorenzo's
// ring sits on what a finger touches under it, and no coin of the effects is left on screen
// (e2e/assert.mjs); on the map, the merchant's name shows ten letters at least. The one script
// of the end-to-end tests: later steps of the first session are added here.
//
//   pnpm --filter @comptoirs/web build && pnpm --filter @comptoirs/web e2e
//
// Without BASE_URL, starts the server on an empty PGlite in memory, serving the built app, its
// clock started on a Monday morning in Paris (the Terraferma's truce on, daylight), its mules
// quick enough for a delivery to arrive while the test waits. With BASE_URL
// (the dev servers), SERVER_LOG must name the server's log, where the magic link is printed.
// Env: CHROMIUM (a Chromium or headless shell), SHOTS (a folder for a picture of every step,
// e2e-shots by default), SIZES ("390x844,320x568" by default), REPORT=1 (every fault listed
// without stopping at the first), REPEAT=n (the whole session n times over, the sizes side by
// side, each run on a server of its own, to measure its stability: every run's verdict
// printed, then how many passed).
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { assertLayout, assertName } from "./assert.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const SHOTS = resolve(process.env.SHOTS ?? join(here, "..", "e2e-shots"));
const SIZES = (process.env.SIZES ?? "390x844,320x568")
  .split(",")
  .map((s) => s.split("x").map(Number));
const CLOCK_START = "2026-03-02T10:00:00+01:00";
// REPORT=1: every fault listed, the session played to its end all the same.
const REPORT = process.env.REPORT === "1";
const REPEAT = Math.max(1, Number(process.env.REPEAT ?? 1));
// The merchant's name keeps this many letters on the map, at 320 px too.
const NAME_LETTERS = 10;
const faults = [];

// Lorenzo's words the script reads (apps/web/src/i18n.ts, fr.game.coach).
const COVERED = /fermez cette fenêtre/i;
const LEDGER = /voici votre livre de compte/i;
const LEDGER_LATER = /votre livre de compte, sous la cloche/i;
const BRAVO = /bravo, vous connaissez la boucle/i;

let base = process.env.BASE_URL;
let log = process.env.SERVER_LOG;
let server = null;
let browser = null;
let failed = false;
try {
  if (base && !log)
    throw new Error("SERVER_LOG: the server's log, where the magic link is printed");
  browser = await chromium.launch({
    ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}),
  });
  let passed = 0;
  for (let run = 1; run <= REPEAT; run++) {
    const tag = REPEAT > 1 ? `run ${run}` : "";
    const started = Date.now();
    // Each run on a server of its own, as in CI: an empty world, its clock at its start, the
    // sign-in's limits per address and the Dogana's daily stock untouched by the runs before.
    if (!process.env.BASE_URL) {
      await stopServer(server);
      ({ base, log, server } = await startServer());
    }
    // Over several runs, the sizes side by side (each its own merchant), every run judged.
    const results = await (REPEAT > 1
      ? Promise.allSettled(SIZES.map(([w, h]) => session(w, h, tag)))
      : sequence(
          SIZES.map(
            ([w, h]) =>
              () =>
                session(w, h, tag),
          ),
        ));
    const wrong = results.filter((r) => r.status === "rejected").map((r) => r.reason.message);
    const seconds = Math.round((Date.now() - started) / 1000);
    if (wrong.length === 0) passed++;
    else failed = true;
    if (REPEAT > 1)
      console.log(
        `${wrong.length === 0 ? "✓" : "✗"} ${tag} (${seconds} s)${wrong.map((w) => `\n  ${w}`).join("")}`,
      );
    else for (const w of wrong) console.error(`✗ ${w}`);
  }
  if (REPEAT > 1) console.log(`${passed}/${REPEAT} runs without a fault`);
} catch (e) {
  failed = true;
  console.error(`✗ ${e.message}`);
} finally {
  await browser?.close().catch(() => {});
  await stopServer(server);
}
process.exit(failed || faults.length > 0 ? 1 : 0);

/** One after the other, stopping at the first that fails (one run: its first fault). */
async function sequence(steps) {
  const out = [];
  for (const step of steps) {
    try {
      out.push({ status: "fulfilled", value: await step() });
    } catch (reason) {
      out.push({ status: "rejected", reason });
      break;
    }
  }
  return out;
}

/** The server stopped, once it has exited (none left behind, whatever failed). */
async function stopServer(child) {
  if (!child || child.exitCode !== null) return;
  const gone = new Promise((r) => child.once("exit", r));
  child.kill("SIGTERM");
  await Promise.race([gone, new Promise((r) => setTimeout(r, 5000))]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

/** The server on an empty database in memory, serving the built app, on a free port. */
async function startServer() {
  const serverDir = join(here, "..", "..", "server");
  const tsx = createRequire(join(serverDir, "package.json")).resolve("tsx/cli");
  const port = 3100 + Math.floor(Math.random() * 800);
  const url = `http://127.0.0.1:${port}`;
  mkdirSync(SHOTS, { recursive: true });
  const file = join(SHOTS, "server.log");
  writeFileSync(file, "");
  const child = spawn(process.execPath, [tsx, "src/server.ts"], {
    cwd: serverDir,
    env: {
      ...process.env,
      NODE_ENV: "test",
      DATABASE_URL: "pglite:memory",
      HOST: "127.0.0.1",
      PORT: String(port),
      APP_URL: url,
      WEB_DIST: join(here, "..", "dist"),
      CLOCK_START,
      // Mules a hundred times quicker: a delivery arrives within a minute or two.
      WORLD_SETTINGS_OVERRIDE: JSON.stringify({
        deliveries: { vehicles: { mule: { speedBps: 750_000 } } },
      }),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let out = "";
  const keep = (chunk) => {
    out += chunk;
    writeFileSync(file, out);
  };
  child.stdout.on("data", keep);
  child.stderr.on("data", keep);
  try {
    for (let i = 0; i < 240 && !/Server listening/.test(out); i++) {
      if (child.exitCode !== null) throw new Error(`the server stopped:\n${out.slice(-2000)}`);
      await new Promise((r) => setTimeout(r, 250));
    }
    if (!/Server listening/.test(out)) throw new Error("the server did not start in 60 s");
  } catch (e) {
    child.kill("SIGTERM");
    throw e;
  }
  return { base: url, log: file, server: child };
}

/** One first session on a phone of this size, checked after every step. */
async function session(width, height, tag) {
  const size = `${width}x${height}`;
  const label = tag ? `${tag}, ${size}` : size;
  const dir = join(SHOTS, tag ? tag.replace(/\s+/g, "-") : "", size);
  // The pictures of this run only, none left from an earlier one.
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    serviceWorkers: "block",
  });
  try {
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    let n = 0;
    /** A step done: its picture, then the layout checked. */
    const check = async (name) => {
      await page.waitForTimeout(450);
      const file = join(dir, `${String(++n).padStart(2, "0")}-${name}.png`);
      try {
        await assertLayout(page);
        // On the map (not under a window), the name keeps its letters.
        const onMap = await page.evaluate(
          () =>
            !!document.querySelector("[data-hud-name]") &&
            !document.querySelector('[aria-modal="true"]'),
        );
        if (onMap) await assertName(page, NAME_LETTERS);
      } catch (e) {
        await page.screenshot({ path: file });
        const why = `${label}, ${name} (${file}):\n  ${e.message}`;
        if (!REPORT) throw new Error(why);
        faults.push(why);
        console.error(`✗ ${why}`);
        return;
      }
      await page.screenshot({ path: file });
      if (!tag) console.log(`· ${size} ${name}`);
    };

    // The sign-in by magic link, the merchant's name, the introduction, the trade.
    const email = `e2e-${width}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.org`;
    await page.goto(base);
    await check("connexion");
    await page.fill("input[type=email]", email);
    await page.keyboard.press("Enter");
    const token = await magicLink(email);
    await page.goto(`${base}/connexion?token=${token}`);
    await page.waitForSelector("input");
    await check("nom");
    // Longer than ten letters: its cut is measured on the map.
    await page.fill("input", `e2e_${width}_${Math.floor(Math.random() * 1e6)}`);
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: /passer/i }).waitFor();
    await check("introduction");
    await page.getByRole("button", { name: /passer/i }).click();
    await page
      .getByRole("button", { name: /choisir ce métier/i })
      .first()
      .waitFor();
    await check("metier");
    await page
      .getByRole("button", { name: /choisir ce métier/i })
      .first()
      .click();

    await guide(page, check);
    await transform(page, check);

    // The Terraferma during its truce: the HUD's two columns and the week's note.
    await closeAll(page);
    const door = page.locator("[data-coach=door-layer]");
    // Closed until the first day of trade: touched once, it says why; touched again, it opens.
    await door.click({ force: true });
    if ((await door.getAttribute("aria-disabled")) === "true") {
      await check("terraferme-fermee");
      await door.click({ force: true });
    }
    await page.waitForTimeout(1500);
    await check("terraferme");
    // Lorenzo's three cards on the Terraferma, read to the end.
    for (let i = 0; i < 4; i++) {
      const next = page.getByRole("button", { name: /^(suivant|compris)$/i });
      if ((await next.count()) === 0) break;
      await next.first().click();
      await page.waitForTimeout(300);
    }
    // The case of t_terra.png: the truce's note shown beside the merchant's name.
    const said = await page.evaluate(() => {
      const shown = [...document.querySelectorAll("[data-hud=terra-note]")].find(
        (el) => el.getClientRects().length > 0,
      );
      return shown ? (shown.textContent ?? "").replace(/\s+/g, " ") : null;
    });
    if (said === null) throw new Error(`${label}: no note of the week on the HUD`);
    if (!/trêve/i.test(said))
      throw new Error(`${label}: the Terraferma's note says « ${said} », not its truce`);
    await check("terraferme-treve");
    await door.click();
    await page.waitForTimeout(1000);

    // The notices: the day, the gazette, the day's book; the first steps all done (their list
    // gone).
    await page.getByRole("button", { name: /^avis/i }).first().click();
    await page.waitForTimeout(600);
    await check("avis");
    if ((await page.getByText("Premiers pas", { exact: true }).count()) > 0)
      throw new Error(`${label}: the notices still list first steps to take`);
    await page.keyboard.press("Escape");
    await check("carte");

    if (errors.length > 0) throw new Error(`${label}: errors on the page: ${errors.join(" / ")}`);
  } catch (e) {
    throw new Error(e.message.startsWith(label) ? e.message : `${label}: ${e.message}`);
  } finally {
    await context.close();
  }
}

/**
 * Plays Lorenzo's guide to its last card, touching what it rings; a check at each of its steps.
 * Fails unless it ends on « Bravo » at objective 6/6, the Livre de compte's reward cashed on the
 * way: waiting is allowed (a batch, a delivery on the road), stopping short is not.
 */
async function guide(page, check) {
  const bubble = page.locator("[data-coach-bubble]");
  const ring = page.locator(".coach-ring");
  const deadline = Date.now() + 9 * 60_000;
  let last = null;
  let since = Date.now();
  let cashed = false;
  while (Date.now() < deadline) {
    await page.waitForTimeout(700);
    if ((await bubble.count()) === 0) {
      // Silent while the first delivery is on its way: back at its arrival, within minutes.
      if (Date.now() - since > 180_000) throw new Error("the guide is gone for three minutes");
      continue;
    }
    const text = (await bubble.innerText()).replace(/\s+/g, " ");
    // A countdown changes every second: the same step all the same.
    const step = text.replace(/\d/g, "");
    if (step !== last) {
      last = step;
      since = Date.now();
      await check(`guide-${slug(text)}`);
    } else if (Date.now() - since > 180_000) {
      throw new Error(`the guide stays three minutes on « ${text} »`);
    }
    if (BRAVO.test(text)) {
      if (!/objectif 6\/6/i.test(text)) throw new Error(`the guide ends short: « ${text} »`);
      if (!cashed) throw new Error("the guide ends without the Livre de compte's reward cashed");
      await bubble.getByRole("button", { name: /terminer/i }).click();
      return;
    }
    if ((await bubble.getByRole("button", { name: /^passer$/i }).count()) > 0)
      throw new Error(`the guide skips a step: « ${text} »`);
    // The book's goals not yet met (a delivery still on the road): its reward comes, wait.
    if (LEDGER_LATER.test(text)) continue;
    if ((await ring.count()) === 0) {
      if (COVERED.test(text)) await page.keyboard.press("Escape");
      continue;
    }
    const box = await ring.boundingBox();
    if (!box) continue;
    const target = (await ring.getAttribute("data-coach-target")) ?? "";
    // The ring is checked before every touch, not only at each step's picture.
    await assertLayout(page);
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    if (LEDGER.test(text) && target.startsWith("claim-")) cashed = true;
  }
  throw new Error(`the guide never ends: « ${last} »`);
}

/**
 * A transformation in the workshops: the mill turning wheat into flour, its first batch quick.
 * The farm's wheat went to the cities and its next batch takes half an hour: the wheat is bought
 * at the Rialto first, as a newcomer would.
 */
async function transform(page, check) {
  await closeAll(page);
  const mill = await workshopRows(page);
  const idle = mill.find((r) => r.recipe === "transform" && /^produire$/i.test(r.text));
  if (!idle) {
    await closeAll(page);
    await page.locator("[data-coach=hud-rialto]").click();
    await page.locator("[data-coach=row-wheat]").click();
    await page.locator("[data-coach=sheet-buy]").waitFor();
    await page.fill("input[aria-label=Quantité]", "10");
    await check("rialto-ble");
    await page.locator("[data-coach=sheet-buy]").click();
    await page.waitForTimeout(1200);
  }
  await closeAll(page);
  const rows = await workshopRows(page);
  const mill2 = rows.find((r) => r.recipe === "transform" && /^produire$/i.test(r.text));
  if (!mill2)
    throw new Error(`no workshop to transform with: ${rows.map((r) => r.text).join(", ")}`);
  await page.locator(`[data-coach='${mill2.coach}']`).first().click();
  const go = page.locator("[data-coach=sheet-produce]");
  await go.waitFor();
  await check("transformation");
  await go.click();
  await page.waitForTimeout(1200);
  const after = await workshopRows(page);
  if (after.some((r) => r.coach === mill2.coach && /^produire$/i.test(r.text)))
    throw new Error("the transformation did not start");
  await check("transformation-lancee");
}

/** The workshops' window opened: each workshop's button, its recipe raw or transforming. */
async function workshopRows(page) {
  if ((await page.locator("[data-coach^='produce-'], [data-coach^='harvest-']").count()) === 0) {
    await closeAll(page);
    await page.locator("[data-coach=door-workshops]").click();
    await page.locator("[data-recipe]").first().waitFor();
    await page.waitForTimeout(500);
  }
  return page.evaluate(() =>
    [...document.querySelectorAll("[data-recipe]")].map((recipe) => {
      // Up to the workshop's card: the widest block holding this recipe alone.
      let at = recipe;
      while (at.parentElement && at.parentElement.querySelectorAll("[data-recipe]").length === 1)
        at = at.parentElement;
      const button = at.querySelector("[data-coach^='produce-'], [data-coach^='harvest-']");
      return {
        recipe: recipe.getAttribute("data-recipe"),
        coach: button?.getAttribute("data-coach") ?? "",
        text: (button?.textContent ?? "").trim(),
      };
    }),
  );
}

/** Every window closed and the place's panel too: back on the map, its doors at the foot. */
async function closeAll(page) {
  for (let i = 0; i < 4; i++) {
    const open = await page.evaluate(
      () =>
        !!document.querySelector('[aria-modal="true"]') ||
        !document.querySelector("[data-coach=door-workshops]"),
    );
    if (!open) return;
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  }
}

/** The magic link's token, from the server's log. */
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

function slug(text) {
  return text
    .replace(/^.*?objectif \d+\/\d+ /i, "")
    .normalize("NFD")
    .replace(/[^\w ]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join("-")
    .toLowerCase();
}
