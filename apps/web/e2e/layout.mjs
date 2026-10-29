// The first session in full, on two phones (390 × 844 and 320 × 568): the sign-in, the
// merchant's name, Lorenzo's guide played to its last card (« Bravo », objective 7/7, the Livre
// de compte's reward cashed: produce, harvest, deliver to a city, buy at the Rialto, the reward),
// then a transformation in the workshops, the Terraferma during its truce, then a week in teams
// with Milan riding against the merchant and its close (the week's view rewritten on its way:
// the plaque's every line), the notices (their head kept in sight to their foot). After
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
// Env: LANG=en (the session in English), CHROMIUM (a Chromium or headless shell), SHOTS (a folder for a picture of every step,
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
import { assertLayout, assertName, assertSheetHead } from "./assert.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const SHOTS = resolve(process.env.SHOTS ?? join(here, "..", "e2e-shots"));
const SIZES = (process.env.SIZES ?? "390x844,320x568")
  .split(",")
  .map((s) => s.split("x").map(Number));
const CLOCK_START = "2026-03-02T10:00:00+01:00";
// REPORT=1: every fault listed, the session played to its end all the same.
const REPORT = process.env.REPORT === "1";
const TEXT_SIZE = process.env.TEXT_SIZE ?? "";
const REPEAT = Math.max(1, Number(process.env.REPEAT ?? 1));
// The merchant's name keeps this many letters on the map, at 320 px too.
// The budgets in pixels are set for the text at 100 %; at a larger text (TEXT_SIZE), the name's
// letters and the band's height follow it: what is checked then is that nothing overlaps, spills
// or shrinks under 44 px.
const SCALE = Number(process.env.TEXT_SIZE || 100) / 100;
const NAME_LETTERS = Math.floor(10 / SCALE ** 2);
const faults = [];

// LANG=en plays the session in English (E3-8 of the experts): the words the script reads, in
// each language (apps/web/src/i18n.ts and i18n.en.ts).
const LANG = process.env.LANG === "en" || process.env.E2E_LANG === "en" ? "en" : "fr";
/** Twelve palaces held on the Grand Canal, and a Doge (R5, R7). */
const CANAL = {
  plots: Array.from({ length: 12 }, (_, i) => ({
    plot: i + 1,
    pseudo:
      ["Casa Foscari", "Casa Grimani", "Casa Contarini", "Casa Dandolo"][i % 4] +
      (i > 3 ? ` ${i}` : ""),
    crest: {
      shape: "heater",
      color: ["vermilion", "lagoon", "gold", "violet", "emerald"][i % 5],
      symbol: "lion",
    },
    generations: (i % 4) + 1,
    atouts: i % 6,
    cities: i % 3,
    doge: i === 0,
  })),
  doge: {
    pseudo: "Casa Foscari",
    crest: { shape: "heater", color: "vermilion", symbol: "lion" },
    decree: { code: "faveur", target: "venezia" },
    mutator: "grand_gel",
  },
};

const WORDS = {
  fr: {
    covered: /fermez cette fenêtre/i,
    ledger: /voici vos objectifs/i,
    ledgerLater: /sous la cloche des messages, vos objectifs/i,
    investLater: /il vous faut encore des briques et des planches/i,
    bravo: /bravo, vous connaissez la boucle/i,
    goal: (n) => new RegExp(`objectif ${n}\\/7`, "i"),
    goalPrefix: /^.*?objectif \d+\/\d+ /i,
    code: /code à 6 chiffres/i,
    mailCode: /connexion à Fondaco : (\d{3}) (\d{3})/,
    skip: /passer/i,
    skipExact: /^passer$/i,
    settle: /choisir ce métier/i,
    nextOrGot: /^(suivant|compris)$/i,
    truce: /trêve/i,
    notices: /^messages/i,
    store: /^magasin$/i,
    atouts: /atout de la semaine/i,
    letter: /lettre du jour/i,
    senate: /l'élection/i,
    canal: /^les 40 palais( ›)?$/i,
    broglio: /les rumeurs/i,
    build: /^bâtir$/i,
    ranking: /^classement$/i,
    bale: /colis/i,
    help: /^aide$/i,
    howToPlay: /^comment jouer$/i,
    odds: /^probabilités$/i,
    firstSteps: "Premiers pas",
    finish: /terminer/i,
    produce: /^produire$/i,
    quantity: "Quantité",
    team: /équipe · vénétie/i,
    onYou: /sur vous/i,
    battleAt: /bataille à 20 h/i,
    teamWon: /vénétie l'emporte/i,
    npc: "(ordinateur)",
    sharesTab: /^actions$/i,
    playersTab: /^entre joueurs$/i,
    citiesTab: /^villes$/i,
    duelTab: /^duel$/i,
    alone: /^jouer seul$/i,
  },
  en: {
    covered: /close this window/i,
    ledger: /here are your goals/i,
    ledgerLater: /under the bell of the messages, your goals/i,
    investLater: /you still need bricks and planks/i,
    bravo: /well done, you know the loop/i,
    goal: (n) => new RegExp(`goal ${n}\\/7`, "i"),
    goalPrefix: /^.*?goal \d+\/\d+ /i,
    code: /6-digit code/i,
    mailCode: /Fondaco sign-in code: (\d{3}) (\d{3})/,
    skip: /skip/i,
    skipExact: /^skip$/i,
    settle: /choose this trade/i,
    nextOrGot: /^(next|got it)$/i,
    truce: /truce/i,
    notices: /^messages/i,
    store: /^store$/i,
    atouts: /atout of the week/i,
    letter: /letter of the day/i,
    senate: /the election/i,
    canal: /^the 40 palaces( ›)?$/i,
    broglio: /the rumours/i,
    build: /^build$/i,
    ranking: /^ranking$/i,
    bale: /parcel/i,
    help: /^help$/i,
    howToPlay: /^how to play$/i,
    odds: /^odds$/i,
    firstSteps: "First steps",
    finish: /finish/i,
    produce: /^produce$/i,
    quantity: "Quantity",
    team: /team · veneto/i,
    onYou: /on you/i,
    battleAt: /battle 20:00/i,
    teamWon: /veneto wins/i,
    npc: "(computer)",
    sharesTab: /^shares$/i,
    playersTab: /^between players$/i,
    citiesTab: /^cities$/i,
    duelTab: /^duel$/i,
    alone: /^play alone$/i,
  },
}[LANG === "en" ? "en" : "fr"];
const COVERED = WORDS.covered;
const LEDGER = WORDS.ledger;
const LEDGER_LATER = WORDS.ledgerLater;
const INVEST_LATER = WORDS.investLater;
const BRAVO = WORDS.bravo;
// A Thursday of 40 merchants on the Terraferma (e2e/fixtures/make-terra-midweek.ts).
const MIDWEEK = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "fixtures", "terra-midweek.json"),
    "utf8",
  ),
);

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
  // Never 3659: Chromium refuses it (net::ERR_UNSAFE_PORT).
  let port = 3659;
  while (port === 3659) port = 3100 + Math.floor(Math.random() * 800);
  const url = `http://127.0.0.1:${port}`;
  mkdirSync(SHOTS, { recursive: true });
  const file = join(SHOTS, "server.log");
  writeFileSync(file, "");
  const child = spawn(process.execPath, [tsx, "src/server.ts"], {
    cwd: serverDir,
    env: {
      ...process.env,
      // LANG=en names the interface's language here, not a locale: the database would choke on it.
      LANG: "C.UTF-8",
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
    // TEXT_SIZE=130: the whole session with the text at 130 % (E3-11 of the experts).
    if (TEXT_SIZE)
      await context.addInitScript((size) => {
        try {
          localStorage.setItem("comptoirs:textSize", size);
        } catch {}
      }, TEXT_SIZE);
    const page = await context.newPage();
    // The Grand Canal (R5) and the Doge of the month (R7): a new world has neither, the
    // public answer is filled for the whole run (sign-in screen, ranking).
    await page.route("**/api/canal", (route) => route.fulfill({ json: CANAL }));
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    let n = 0;
    // From the name to the first batch launched: 90 s at most (E3-5 of the experts), pictures and
    // checks included.
    let named = 0;
    /** A step done: its picture, then the layout checked. */
    const check = async (name) => {
      if (name === "nom") named = Date.now();
      if (named && name.startsWith("guide-vos-ouvriers")) {
        const seconds = Math.round((Date.now() - named) / 1000);
        named = 0;
        console.log(`· ${size} premier lot lancé ${seconds} s après le nom`);
        if (seconds > 90) throw new Error(`${label}: the first batch ${seconds} s after the name`);
      }
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

    // The sign-in (by the mail's code or its link), the merchant's name, the introduction, the
    // trade.
    const email = `e2e-${width}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.org`;
    await page.goto(LANG === "en" ? `${base}/?lang=en` : base);
    await check("connexion");
    // On the short phone (an iPhone SE), the address field and its button above the fold; a tall
    // one shows Venice's sky first.
    const fold = await page.evaluate(() => {
      const field = document.querySelector("input[type=email]")?.getBoundingClientRect();
      const send = document.querySelector("form button[type=submit]")?.getBoundingClientRect();
      return field && send ? Math.max(field.bottom, send.bottom) - innerHeight : 1;
    });
    if (height < 700 && fold > 0)
      throw new Error(`${label}: the sign-in's button ${Math.round(fold)} px under the fold`);
    await page.fill("input[type=email]", email);
    await page.keyboard.press("Enter");
    // The narrow phone signs in with the mail's code, typed in the page (an installed app on an
    // iPhone); the other one with its link.
    if (width < 360) {
      const code = await mailCode(email);
      const field = page.getByLabel(WORDS.code);
      await field.waitFor();
      await check("code");
      await field.fill(code);
    } else {
      const token = await magicLink(email);
      await page.goto(`${base}/connexion?token=${token}`);
    }
    await page.waitForSelector("input[autocomplete=nickname]");
    await check("nom");
    // Longer than ten letters: its cut is measured on the map.
    const pseudo = `e2e_${width}_${Math.floor(Math.random() * 1e6)}`;
    await page.fill("input", pseudo);
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: WORDS.skip }).waitFor();
    await check("introduction");
    await page.getByRole("button", { name: WORDS.skip }).click();
    await page.getByRole("button", { name: WORDS.settle }).first().waitFor();
    await check("metier");
    await page.getByRole("button", { name: WORDS.settle }).first().click();

    await guide(page, check);
    await transform(page, check);

    // The Terraferma during its truce: the HUD's two columns and the week's note.
    await closeAll(page);
    const door = page.locator("[data-coach=tab-layer]");
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
      const next = page.getByRole("button", { name: WORDS.nextOrGot });
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
    if (!WORDS.truce.test(said))
      throw new Error(`${label}: the Terraferma's note says « ${said} », not its truce`);
    await check("terraferme-treve");
    await teamWeek(page, door, check);
    await midWeek(page, door, check, pseudo);
    // Back to the trade: the map's tab.
    await page.locator("[data-coach=tab-map]").click();
    await page.waitForTimeout(1000);

    // The notices: the day, the gazette, the day's book; the first steps all done (their list
    // gone).
    await page.getByRole("button", { name: WORDS.notices }).first().click();
    await page.waitForTimeout(600);
    await check("avis");
    // Scrolled to its foot, the notices keep their title and their cross.
    await assertSheetHead(page);
    if ((await page.getByText(WORDS.firstSteps, { exact: true }).count()) > 0)
      throw new Error(`${label}: the notices still list first steps to take`);
    await page.keyboard.press("Escape");
    await check("carte");
    // A city up close, its gauge of the Signoria around its monument (R2), then its sheet.
    // A cart back on its road may lie over the city on a small screen: the tap goes to the city.
    // First its card (refonte UX): one sentence, then the ghost that leads inside.
    await page.locator('[data-coach="city-vicenza"]').first().dispatchEvent("click");
    await page.waitForTimeout(700);
    await check("fiche-ville");
    await page.locator('[data-coach="place-open"]').click();
    await page.waitForTimeout(700);
    await check("ville");
    // An order touched into the mule, the gold « Livrer » then lit (lot 8).
    const order = page.locator('[data-coach^="city-order-"]:not([disabled])');
    if ((await order.count()) > 0) {
      await order.first().click();
      await page.waitForTimeout(400);
      await check("ville-mule");
    }
    // Who holds the city, its pill under the orbit, opens its Signoria.
    const signoria = page.locator('[data-place] [data-coach="city-control"]');
    if ((await signoria.count()) > 0) {
      await signoria.first().click();
      await page.waitForTimeout(600);
      await check("signoria");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
    }
    await closeAll(page);
    // The Sfida of the week (R6): the ranking's « Duel » tab once the Lustre is on (lot 7).
    await page.locator('[data-tab="ranking"]').click();
    await page.waitForTimeout(600);
    const duel = page.getByRole("tab", { name: WORDS.duelTab });
    if ((await duel.count()) === 0) await closeAll(page);
    else {
      await duel.first().click();
      await page.waitForTimeout(700);
      await check("sfida");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
      await closeAll(page);
    }
    // The counter up close (Lagune), its store by chain, then the catalogue of its free plot.
    await page.locator('[data-coach="home"]').first().click();
    await page.waitForTimeout(600);
    await check("fiche-ateliers");
    await page.locator('[data-coach="place-open"]').click();
    await page.waitForTimeout(600);
    await check("comptoir");
    await page.locator("[data-place]").getByRole("button", { name: WORDS.store }).click();
    await page.waitForTimeout(600);
    await check("magasin");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    const plot = page.locator("[data-place]").getByRole("button", { name: WORDS.build });
    if ((await plot.count()) > 0) {
      await plot.first().click();
      await page.waitForTimeout(600);
      await check("batir");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
    }
    await closeAll(page);
    // Venice up close (refonte UX, lot 5): its four moons and the Doge, from its tab.
    await page.locator('[data-tab="venice"]').click();
    await page.waitForTimeout(700);
    await check("venise");
    // Its Market in three tabs: the goods, then the deals between players.
    await page.locator("[data-coach=venice-market]").click();
    await page.waitForTimeout(700);
    await check("marche");
    const players = page.getByRole("tab", { name: WORDS.playersTab });
    if ((await players.count()) > 0) {
      await players.first().click();
      await page.waitForTimeout(500);
      await check("marche-joueurs");
    }
    await closeAll(page);
    // The merchant's crest opens their profile (Lagune: titles as a constellation), and the
    // ranking's door its podium once it is open.
    await page.locator('[data-hud="identity"], [data-hud="purse"]').first().click();
    await page.waitForTimeout(600);
    await check("profil");
    // Its settings, a line of their own (refonte UX, lot 7).
    await page.locator('[data-profile="settings"]').click();
    await page.waitForTimeout(500);
    await check("profil-reglages");
    await closeAll(page);
    await company(page, check);
    const ranking = page.getByRole("button", { name: WORDS.ranking });
    if ((await ranking.count()) > 0 && (await ranking.first().isEnabled())) {
      await ranking.first().click();
      await page.waitForTimeout(600);
      await check("classement");
      // A player's sheet over the ranking (refonte UX, lot 7): a house of the computer's line.
      const other = page.locator("[aria-modal=true] button", { hasText: WORDS.npc });
      if ((await other.count()) > 1) {
        await other.nth(1).click();
        await page.waitForTimeout(900);
        await check("fiche");
        await page.keyboard.press("Escape");
        await page.waitForTimeout(500);
      }
      const canal = page.getByRole("button", { name: WORDS.canal });
      if ((await canal.count()) > 0) {
        await canal.first().click();
        await page.waitForTimeout(600);
        await check("canal");
      }
      await closeAll(page);
    }
    // The help, its loop as an orbit and the goods' code: from the profile (the map has no door
    // for it since the five tabs).
    await page.locator('[data-hud="identity"], [data-hud="purse"]').first().click();
    await page.waitForTimeout(600);
    await page.getByRole("button", { name: WORDS.howToPlay }).first().click();
    await page.waitForTimeout(600);
    await check("aide");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    await closeAll(page);
    await npcRival(page, check);
    await seraEvening(page, check);
    await atoutsWeek(page, check);
    await letterOfTheDay(page, check);
    await senate(page, check);
    await broglio(page, check);
    await parts(page, check);
    await welcomeBack(page, check);
    await baleWaiting(page, check);
    await seasonClosed(page, check);

    if (errors.length > 0) throw new Error(`${label}: errors on the page: ${errors.join(" / ")}`);
  } catch (e) {
    throw new Error(e.message.startsWith(label) ? e.message : `${label}: ${e.message}`);
  } finally {
    await context.close();
  }
}

/**
 * Plays Lorenzo's guide to its last card, touching what it rings; a check at each of its steps.
 * Fails unless it ends on « Bravo » at objective 7/7, the Livre de compte's reward cashed on the
 * way: waiting is allowed (a batch, a delivery on the road), stopping short is not.
 */
async function guide(page, check) {
  const bubble = page.locator("[data-coach-bubble]");
  const ring = page.locator(".coach-ring");
  const deadline = Date.now() + 9 * 60_000;
  let last = null;
  let since = Date.now();
  let cashed = false;
  let invested = true;
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
      // Seven objectives, six when the first upgrade had to wait.
      const goal = invested ? WORDS.goal("7") : WORDS.goal("[67]");
      if (!goal.test(text)) throw new Error(`the guide ends short: « ${text} »`);
      if (!cashed) throw new Error("the guide ends without the Livre de compte's reward cashed");
      await bubble.getByRole("button", { name: WORDS.finish }).click();
      return;
    }
    // The first upgrade waits when the Rialto has nothing to sell (a new world, the Dogana's
    // stock spent): the guide lets it go, as it should for a newcomer. Any other skip is a fault.
    if (INVEST_LATER.test(text)) {
      await bubble.getByRole("button", { name: WORDS.skipExact }).click();
      invested = false;
      continue;
    }
    if ((await bubble.getByRole("button", { name: WORDS.skipExact }).count()) > 0)
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
  const idle = mill.find((r) => r.recipe === "transform" && WORDS.produce.test(r.text));
  if (!idle) {
    await closeAll(page);
    // The Market, from Venice (its tab, then the Rialto of the place up close).
    await page.locator('[data-tab="venice"]').click();
    await page.locator("[data-coach=venice-market]").click();
    await page.locator("[data-coach=row-wheat]").click();
    await page.locator("[data-coach=sheet-buy]").waitFor();
    await page.fill(`input[aria-label=${WORDS.quantity}]`, "10");
    await check("rialto-ble");
    await page.locator("[data-coach=sheet-buy]").click();
    await page.waitForTimeout(1200);
  }
  await closeAll(page);
  const rows = await workshopRows(page);
  const mill2 = rows.find((r) => r.recipe === "transform" && WORDS.produce.test(r.text));
  if (!mill2)
    throw new Error(`no workshop to transform with: ${rows.map((r) => r.text).join(", ")}`);
  await page.locator(`[data-coach='${mill2.coach}']`).first().click();
  const go = page.locator("[data-coach=sheet-produce]");
  await go.waitFor();
  await check("transformation");
  await go.click();
  await page.waitForTimeout(1200);
  const after = await workshopRows(page);
  if (after.some((r) => r.coach === mill2.coach && WORDS.produce.test(r.text)))
    throw new Error("the transformation did not start");
  await check("transformation-lancee");
}

/**
 * A week in teams, the plaque's short lines on a phone: the team, Milan riding against the
 * merchant and the battle's hour, then the team that won at the close. No world waits a week in
 * teams: the week's view is rewritten on its way to the page, the layer opened again on it.
 */
async function teamWeek(page, door, check) {
  const TEAM = "terraferma";
  const show = async (edit) => {
    // Out to the trade by the map's tab, then in again by the conquest's.
    await page.locator("[data-coach=tab-map]").click();
    await page.waitForTimeout(500);
    await page.unroute("**/api/game/terra");
    await page.route("**/api/game/terra", async (route) => {
      const response = await route.fetch();
      const json = await response.json();
      if (json.terra) edit(json.terra);
      await route.fulfill({ response, json });
    });
    await door.click();
    await page.waitForTimeout(1500);
    return page.evaluate(() => {
      const shown = [...document.querySelectorAll("[data-hud=terra-note]")].find(
        (el) => el.getClientRects().length > 0,
      );
      return shown ? (shown.textContent ?? "").replace(/\s+/g, " ") : "";
    });
  };
  const expect = (said, what, pattern) => {
    if (!pattern.test(said)) throw new Error(`the Terraferma's note says « ${said} », not ${what}`);
  };

  const riding = await show((v) => {
    const milan = v.holders.findIndex((h) => h.milan);
    if (milan < 0) throw new Error("no Milan on the Terraferma");
    const aim = v.owner.findIndex((o, i) => o < 0 && v.map.terrain[i] !== "w");
    Object.assign(v, {
      placementEndsAt: null,
      truceEndsAt: null,
      open: true,
      battle: { from: 20, to: 21, on: false },
    });
    v.rules.team = TEAM;
    v.fronts.push({
      id: "e2e-milan",
      owner: milan,
      against: v.holders.findIndex((h) => h.me),
      aim,
      troops: 120,
      mine: false,
      threat: true,
      takes: [],
      endsAt: null,
    });
  });
  // Two lines: what presses most (Milan on the merchant), then the team.
  expect(riding, "the team", WORDS.team);
  expect(riding, "Milan riding against the merchant", WORDS.onYou);
  await check("terraferme-equipes");

  const calm = await show((v) => {
    Object.assign(v, {
      placementEndsAt: null,
      truceEndsAt: null,
      open: true,
      battle: { from: 20, to: 21, on: false },
    });
    v.fronts = v.fronts.filter((f) => !f.threat);
  });
  expect(calm, "the battle's hour", WORDS.battleAt);

  const won = await show((v) => {
    v.rules.team = TEAM;
    v.closed = { signore: -1, conquest: false, teams: [{ team: TEAM, glory: 40, cells: 12 }] };
  });
  expect(won, "the team that won", WORDS.teamWon);
  await check("terraferme-equipes-close");
  await page.unroute("**/api/game/terra");
}

/** PERF=1: how heavy the Terraferma is on a phone (CPU × 4): long tasks and frames, opened and moved. */
async function perf(page, open, terra) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const watch = () =>
    page.evaluate(() => {
      window.__perf = { long: [], frames: [] };
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) window.__perf.long.push(Math.round(e.duration));
      }).observe({ type: "longtask", buffered: false });
      let last = performance.now();
      const tick = (t) => {
        window.__perf.frames.push(t - last);
        last = t;
        if (window.__perf.on !== false) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  const read = (what) =>
    page.evaluate((what) => {
      const p = window.__perf;
      p.on = false;
      const f = p.frames.slice(1).sort((a, b) => a - b);
      const q = (x) => Math.round(f[Math.floor((f.length - 1) * x)] ?? 0);
      return `${what}: long tasks ${p.long.length} (total ${p.long.reduce((a, b) => a + b, 0)} ms, max ${Math.max(0, ...p.long)} ms); frames ${f.length}, median ${q(0.5)} ms, p95 ${q(0.95)} ms, max ${q(1)} ms`;
    }, what);
  const profile = async (what, run) => {
    await cdp.send("Profiler.enable");
    await cdp.send("Profiler.setSamplingInterval", { interval: 200 });
    await cdp.send("Profiler.start");
    await run();
    const { profile: prof } = await cdp.send("Profiler.stop");
    const self = new Map();
    const dt = prof.timeDeltas ?? [];
    const byId = new Map(prof.nodes.map((n) => [n.id, n]));
    prof.samples.forEach((id, i) => {
      const n = byId.get(id);
      const f = n.callFrame;
      const key = `${f.functionName || "(anon)"} ${f.url.split("/").pop()}:${f.lineNumber}`;
      self.set(key, (self.get(key) ?? 0) + (dt[i] ?? 0) / 1000);
    });
    const top = [...self.entries()]
      .filter(([k]) => !k.startsWith("(idle)") && !k.startsWith("(program)"))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 14)
      .map(([k, v]) => `    ${Math.round(v)} ms ${k}`);
    console.log(`PERF profile ${what}:\n${top.join("\n")}`);
  };
  // PERF_TRACE=1: the browser's own work, from a trace (the main thread's, and the tiles rasterized off it),
  // and what made it draw again (the invalidations), for each phase.
  const trace = async (what, run) => {
    const browser = page.context().browser();
    await browser.startTracing(page, {
      categories: [
        "devtools.timeline",
        "disabled-by-default-devtools.timeline",
        "disabled-by-default-devtools.timeline.invalidationTracking",
      ],
    });
    await run();
    const events = JSON.parse((await browser.stopTracing()).toString()).traceEvents ?? [];
    const main = events.find((e) => e.name === "thread_name" && e.args?.name === "CrRendererMain");
    let mainMs = 0;
    let rasterMs = 0;
    const steps = new Map();
    const redrawn = new Map();
    for (const e of events) {
      if (/InvalidationTracking/.test(e.name)) {
        const k = `${e.args?.data?.nodeName ?? ""} (${e.args?.data?.reason ?? e.name})`.slice(
          0,
          100,
        );
        redrawn.set(k, (redrawn.get(k) ?? 0) + 1);
      }
      if (e.ph !== "X" || !e.dur) continue;
      if (e.tid === main?.tid && e.name === "RunTask") mainMs += e.dur / 1000;
      if (e.tid !== main?.tid && e.name === "RasterTask") rasterMs += e.dur / 1000;
      if (e.tid === main?.tid) steps.set(e.name, (steps.get(e.name) ?? 0) + e.dur / 1000);
    }
    const top = (m, n, f) =>
      [...m.entries()]
        .sort((x, y) => y[1] - x[1])
        .slice(0, n)
        .map(([k, v]) => `    ${f(v)} ${k}`)
        .join("\n");
    console.log(
      `PERF trace ${what}: main thread ${Math.round(mainMs)} ms, raster ${Math.round(rasterMs)} ms\n${top(
        steps,
        8,
        (v) => `${Math.round(v)} ms`,
      )}\n  drawn again:\n${top(redrawn, 6, (v) => `${v}×`)}`,
    );
  };
  if (process.env.PERF_TRACE === "1") {
    const b = page.viewportSize();
    await trace("open", open);
    await page.waitForTimeout(2000);
    await trace("pan", async () => {
      for (let k = 0; k < 3; k++) {
        await page.mouse.move(b.width / 2, b.height / 2);
        await page.mouse.down();
        for (let i = 1; i <= 20; i++)
          await page.mouse.move(b.width / 2 - i * 6, b.height / 2 - i * 4);
        await page.mouse.up();
      }
    });
    await trace("zoom", async () => {
      for (let i = 0; i < 10; i++) {
        await page.mouse.wheel(0, i < 5 ? -120 : 120);
        await page.waitForTimeout(60);
      }
    });
    await trace("idle 5 s", () => page.waitForTimeout(5000));
  }
  if (process.env.PERF_PROFILE === "1") {
    await profile("open", open);
    const box0 = page.viewportSize();
    await profile("pan", async () => {
      await page.mouse.move(box0.width / 2, box0.height / 2);
      await page.mouse.down();
      for (let i = 1; i <= 20; i++)
        await page.mouse.move(box0.width / 2 - i * 6, box0.height / 2 - i * 4);
      await page.mouse.up();
    });
  }
  await watch();
  const t0 = Date.now();
  await open();
  console.log(`PERF open (${Date.now() - t0} ms with waits)`, await read("open"));
  await watch();
  const box = page.viewportSize();
  const cx = box.width / 2;
  const cy = box.height / 2;
  for (let k = 0; k < 3; k++) {
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    for (let i = 1; i <= 20; i++) await page.mouse.move(cx - i * 6, cy - i * 4);
    await page.mouse.up();
  }
  console.log("PERF", await read("pan"));
  {
    await cdp.send("Performance.enable");
    const m0 = Object.fromEntries(
      (await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]),
    );
    for (let k = 0; k < 3; k++) {
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      for (let i = 1; i <= 20; i++) await page.mouse.move(cx - i * 6, cy - i * 4);
      await page.mouse.up();
    }
    const m1 = Object.fromEntries(
      (await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]),
    );
    const d = (k) => `${k} ${Math.round(((m1[k] ?? 0) - (m0[k] ?? 0)) * 1000)}`;
    console.log(
      "PERF pan metrics (ms):",
      ["TaskDuration", "ScriptDuration", "RecalcStyleDuration", "LayoutDuration"].map(d).join(", "),
      `layouts ${m1.LayoutCount - m0.LayoutCount}, styles ${m1.RecalcStyleCount - m0.RecalcStyleCount}, nodes ${m1.Nodes}`,
    );
  }
  await watch();
  for (let i = 0; i < 10; i++) {
    await page.mouse.wheel(0, i < 5 ? -120 : 120);
    await page.waitForTimeout(60);
  }
  console.log("PERF", await read("zoom"));
  // A refresh as the week gives it: troops moved, a cell changed hands.
  let k = 0;
  await page.unroute("**/api/game/terra");
  await page.route("**/api/game/terra", (route) => {
    k++;
    const v = structuredClone(terra);
    for (const h of v.holders) h.troops += k;
    const cell = v.owner.findIndex((o, i) => o >= 0 && v.map.terrain[i] !== "w" && i % 7 === k % 7);
    if (cell >= 0) v.owner[cell] = (v.owner[cell] + 1) % v.holders.length;
    return route.fulfill({ json: { terra: v } });
  });
  await watch();
  await page.waitForTimeout(12_000);
  console.log("PERF", await read("idle 12 s (a refresh, troops and a cell changed)"));
  await page.unroute("**/api/game/terra");
  await page.route("**/api/game/terra", (route) => route.fulfill({ json: { terra } }));
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  // PERF_ONLY=1: the session stops once the Terraferma is measured (about three minutes).
  if (process.env.PERF_ONLY === "1") throw new Error("PERF_ONLY: stopped after the measures");
}

/**
 * The Condotta (E2-5 of the experts): opened from the camp's sheet (« Lancer un front », lot 8),
 * played alone at once, its match 8 minutes at most, its bar and the match's map laid out like
 * the rest; back to the week.
 */
async function condotta(page, check) {
  const launch = page.locator('[data-coach="terra-launch"]');
  if ((await launch.count()) === 0) throw new Error("no « Lancer un front » on the Terraferma");
  await launch.first().click();
  await page.waitForTimeout(800);
  const chip = page.locator("[data-hud=camp-condotta]");
  if ((await chip.count()) === 0) throw new Error("no Condotta in the camp's sheet");
  await chip.first().click();
  const bar = page.locator("[data-panel=condotta-bar]");
  await bar.waitFor();
  await page.waitForTimeout(800);
  await check("condotta");
  await bar.getByRole("button", { name: WORDS.alone }).click();
  await page.waitForTimeout(2000);
  await check("condotta-partie");
  const minutes = await page.evaluate(() =>
    Promise.all([
      fetch("/api/game/condotta").then((r) => r.json()),
      fetch("/api/game").then((r) => r.json()),
    ]).then(([c, g]) => (c.phase === "playing" ? (c.endsAt - g.serverTime) / 60_000 : -1)),
  );
  if (minutes < 0 || minutes > 8) throw new Error(`the Condotta's match lasts ${minutes} minutes`);
  await bar.locator("button").first().click();
  await page.waitForTimeout(800);
}

/**
 * The « Bon retour » report of a long absence, at its fullest (sales, the week closed, the
 * Terraferma won and lost): no fresh world has one, so the game's response is rewritten.
 */
async function welcomeBack(page, check) {
  await page.route("**/api/game", async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    if (json.view)
      json.welcome = {
        since: Date.now() - 9 * 3600_000,
        income: { city_sale: "184000", trade: "52000", contract_reward: "30000" },
        readyBatches: 3,
        notices: {},
        slept: false,
        road: { arrived: 2 },
        week: { week: 1, rank: 2, gain: "90000", award: null },
        terra: {
          gained: 3,
          lost: 1,
          fronts: 2,
          spent: 18,
          cells: 7,
          troops: 40,
          cap: 60,
          perHour: 13,
          glory: 120,
          rank: 3,
          eliminated: false,
        },
      };
    await route.fulfill({ response, json });
  });
  await page.reload();
  await page.waitForTimeout(1200);
  await check("bon-retour");
  await page.unroute("**/api/game");
  await closeAll(page);
}

/**
 * A company of four (one away, two seats free) and its thread, in the profile: its
 * constellation and its bubbles. No fresh merchant has one: the answers are written here.
 */
async function company(page, check) {
  const now = Date.now();
  await page.route("**/api/company", (route) =>
    route.fulfill({
      json: {
        company: {
          name: "Compagnie du Lion",
          code: "e2e",
          max: 6,
          members: [
            { pseudo: "Vous", me: true, region: "terraferma", lastSeenAt: now },
            { pseudo: "Ilaria", me: false, region: "dolomites", lastSeenAt: now - 3600_000 },
            { pseudo: "Marco", me: false, region: "lagoon", lastSeenAt: now - 2 * 3600_000 },
            { pseudo: "Lucia", me: false, region: null, lastSeenAt: null },
          ],
          missingRegion: null,
          nextCall: now + 3 * 3600_000,
          call: null,
          record: [],
        },
        mayJoinAt: null,
      },
    }),
  );
  await page.route("**/api/company/messages", (route) =>
    route.fulfill({
      json: {
        messages: [
          {
            id: "1",
            pseudo: "Ilaria",
            body: "J'ai 30 planches en trop si quelqu'un livre à Trévise.",
            at: now - 600_000,
            mine: false,
          },
          {
            id: "2",
            pseudo: null,
            body: "Je prends, je t'envoie une offre au Rialto.",
            at: now - 300_000,
            mine: true,
          },
        ],
      },
    }),
  );
  await page.locator('[data-hud="identity"], [data-hud="purse"]').first().click();
  await page.waitForTimeout(800);
  // The guild, a line of the profile (refonte UX, lot 7).
  await page.locator('[data-profile="guild"]').click();
  await page.waitForTimeout(600);
  await page.getByText("Compagnie du Lion", { exact: true }).scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await check("compagnie");
  await page.unroute("**/api/company");
  await page.unroute("**/api/company/messages");
  await closeAll(page);
}

/** The game's response rewritten on its way to the page, then the page reloaded. */
async function rewrite(page, patch) {
  await page.route("**/api/game", async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    if (json.view) patch(json);
    await route.fulfill({ response, json });
  });
  await page.reload();
  await page.waitForTimeout(1200);
}

/** A bale of Faraj waiting: its round under the bell opens the quay, its odds unfolded. */
async function baleWaiting(page, check) {
  await rewrite(page, (json) => {
    if (!json.view.tutorial.includes("mission")) json.view.tutorial.push("mission");
    json.view.bales = {
      available: 1,
      max: 3,
      nextAt: Date.now() + 5 * 3600_000,
      intervalHours: 8,
      cardsPerBale: 3,
      opened: 0,
      last: null,
      odds: [
        {
          rarity: "common",
          chanceBps: 7000,
          goods: [{ resource: "wheat", chanceBps: 10000 }],
          quantities: [{ quantity: 4, chanceBps: 10000 }],
        },
        {
          rarity: "legendary",
          chanceBps: 3000,
          goods: [{ resource: "silk", chanceBps: 10000 }],
          quantities: [{ quantity: 1, chanceBps: 10000 }],
        },
      ],
    };
  });
  await page.getByRole("button", { name: WORDS.bale }).first().click();
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: WORDS.odds }).click();
  await page.waitForTimeout(300);
  await check("ballots");
  await page.unroute("**/api/game");
  await page.reload();
  await page.waitForTimeout(1200);
  await closeAll(page);
}

/** The season closed while away: the ceremony, at its fullest (top ten, podium, rewards). */
async function seasonClosed(page, check) {
  // The heir to name (R4): two traits earned in the month.
  await page.route("**/api/game/dynasty", (route) =>
    route.fulfill({
      json: {
        generations: [],
        current: null,
        heir: { earned: ["rialto", "nato_quai"], chosen: null },
        names: ["Marco", "Isabetta", "Zuane"],
      },
    }),
  );
  await rewrite(page, (json) => {
    json.ceremony = {
      worldId: "e2e",
      season: "Octobre 1450",
      rank: 4,
      players: 52,
      worth: "4812000",
      turnover: "4812000",
      tier: "top10",
      award: "Pass 7 jours",
      titles: ["Seigneur de Vicence"],
      milestone: { name: "Marchand", renown: 80 },
      renown: 120,
      totalRenown: { points: 120, current: { from: 100, name: "Marchand" }, next: null },
      podium: [1, 2, 3].map((rank) => ({
        rank,
        pseudo: `Casa ${["Foscari", "Grimani", "Contarini"][rank - 1]}`,
        crest: null,
        worth: "9000000",
        turnover: "9000000",
      })),
    };
  });
  await check("fin-de-saison");
  // Down to the heir and the one gold button.
  await page.mouse.wheel(0, 2000);
  await page.waitForTimeout(500);
  await check("heritier");
  await page.unroute("**/api/game/dynasty");
  await page.unroute("**/api/game");
  await page.reload();
  await page.waitForTimeout(1200);
  await closeAll(page);
}

/**
 * The Sera (R11): three lots of the galleys at the incanto, one led by the merchant, one passed,
 * one closed and won. No world has lots at its start: the game's response is rewritten.
 */
async function seraEvening(page, check) {
  await page.route("**/api/game", async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    const at = Date.now();
    if (json.view)
      json.view.sera = {
        hour: 20,
        minutes: 30,
        lots: [
          {
            id: "9:0",
            goods: { spices: 2, silk: 2, salt: 7 },
            value: "9100",
            closesAt: at + 25 * 60_000,
            price: "6300",
            minimum: "6615",
            bidders: 3,
            mine: "7000",
            leading: true,
            done: null,
          },
          {
            id: "9:1",
            goods: { furs: 2, cloth: 2, wine: 4 },
            value: "8400",
            closesAt: at + 35 * 60_000,
            price: "5900",
            minimum: "6195",
            bidders: 2,
            mine: "5600",
            leading: false,
            done: null,
          },
          {
            id: "9:2",
            goods: { spices: 1, salt: 6 },
            value: "3300",
            closesAt: at - 5 * 60_000,
            price: "2400",
            minimum: "2400",
            bidders: 1,
            mine: "2600",
            leading: false,
            done: { won: true, sold: true },
          },
        ],
      };
    await route.fulfill({ response, json });
  });
  await page.reload();
  await page.waitForTimeout(1000);
  await closeAll(page);
  // Venice's card on the map leads to its auctions while lots are open (refonte UX).
  await page.locator('[data-coach="city-venezia"]').first().dispatchEvent("click");
  await page.waitForTimeout(700);
  await page.locator('[data-coach="place-open"]').click();
  await page.waitForTimeout(700);
  await check("sera");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  await page.unroute("**/api/game");
}

/**
 * The Atouts of the week (R3): three cards offered, one already held, the unlockable still
 * locked. The offer depends on the week's draw: the game's response is rewritten.
 */
async function atoutsWeek(page, check) {
  await page.route("**/api/game", async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    if (json.view)
      json.view.atouts = {
        held: ["contadino"],
        open: true,
        offer: ["banchiere", "gondoliere", "vetraio"],
        effects: {
          contadino: { rawYieldBps: 1000, cityPayBps: -500 },
          banchiere: { taxDiscountBps: 200, marketMakerQuotaBps: -5000 },
          gondoliere: { vehicleSpeedBps: 2500, extraVehicles: -1 },
          vetraio: { transformYieldBps: 1000, rawYieldBps: -1000 },
        },
        locked: [
          { code: "amico_podesta", unlock: "podesta" },
          { code: "armatore", unlock: "incanto" },
        ],
      };
    await route.fulfill({ response, json });
  });
  await page.reload();
  await page.waitForTimeout(1000);
  await closeAll(page);
  await page.getByRole("button", { name: WORDS.notices }).first().click();
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: WORDS.atouts }).first().click();
  await page.waitForTimeout(700);
  await check("atouts");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  await page.unroute("**/api/game");
}

/**
 * The letter of the day (R10): under the bell, Lorenzo's line opens the letter on its paper, two
 * answers below; the first one that can be paid is taken, and what came of it shows.
 */
async function letterOfTheDay(page, check) {
  await closeAll(page);
  await page.getByRole("button", { name: WORDS.notices }).first().click();
  await page.waitForTimeout(600);
  const line = page.getByRole("button", { name: WORDS.letter });
  if ((await line.count()) === 0) {
    await closeAll(page);
    return;
  }
  await line.first().click();
  await page.waitForTimeout(700);
  await check("lettre");
  const buttons = page.locator("dialog[open] section button:not([disabled])");
  if ((await buttons.count()) > 0) {
    await buttons.first().click();
    await page.waitForTimeout(900);
    await check("lettre-reponse");
  }
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
}

/**
 * The Senate (R7): the month's last week, three candidates, two with a programme; the merchant
 * a candidate without one yet. No world has an election at its start: the answers are rewritten.
 */
async function senate(page, check) {
  // The world's own clock: the election closes with its month.
  const catalog = await page.evaluate(() => fetch("/api/game/catalog").then((r) => r.json()));
  const closesAt = Number(catalog.world.endsAt);
  await page.route("**/api/game/election", (route) =>
    route.fulfill({
      json: {
        open: true,
        opensAt: closesAt - 7 * 86_400_000,
        closesAt,
        candidates: [
          {
            id: "c1",
            rank: 1,
            pseudo: "Casa Foscari",
            crest: { shape: "heater", color: "vermilion", symbol: "lion" },
            programme: { mutator: "grand_gel", decree: { code: "faveur", target: "venezia" } },
            votes: 7,
          },
          {
            id: "c2",
            rank: 2,
            pseudo: "Casa Grimani dalle Due Torri",
            crest: { shape: "round", color: "lagoon", symbol: "ship" },
            programme: { mutator: "guerra_milano", decree: { code: "franchigia" } },
            votes: 4,
          },
          { id: "c3", rank: 3, pseudo: "Casa Contarini", crest: null, programme: null, votes: 0 },
        ],
        candidate: true,
        mine: null,
        weight: 2,
        maxBoost: 3,
        influencePerVoice: 10,
        mutators: ["embargo_ottomano", "grand_gel", "guerra_milano"],
        decrees: ["faveur", "franchigia", "levante", "calmiere"],
        effects: {
          faveur: { premiumBps: 1000 },
          franchigia: { taxCutBps: 100 },
          levante: { quotaBps: 2500 },
          calmiere: { capBps: 11000 },
        },
        ruling: null,
      },
    }),
  );
  await page.route("**/api/game", async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    if (json.view) json.view.election = { open: true, candidate: true, stood: false, voted: false };
    await route.fulfill({ response, json });
  });
  await page.reload();
  await page.waitForTimeout(1000);
  await closeAll(page);
  await page.getByRole("button", { name: WORDS.notices }).first().click();
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: WORDS.senate }).first().click();
  await page.waitForTimeout(800);
  await check("senat");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  await page.unroute("**/api/game");
  await page.unroute("**/api/game/election");
}

/**
 * The Broglio (R8): the morning's rumours as they are, with what a new world has not yet — two
 * offers at the Rialto, a spy's report, the past days' rumours, a spy at the door.
 */
async function broglio(page, check) {
  await page.route("**/api/game/broglio", async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    if (json) {
      const day = json.today[0]?.day ?? 1;
      json.offers = [
        {
          id: "b1",
          price: "500",
          source: "senato",
          reliabilityBps: 8500,
          kind: "event",
          subject: null,
          mine: false,
          bought: false,
          forMe: false,
          buyers: null,
        },
        {
          id: "b2",
          price: "800",
          source: "gondoliere",
          reliabilityBps: 4000,
          kind: "muda",
          subject: null,
          mine: false,
          bought: false,
          forMe: true,
          buyers: null,
        },
      ];
      json.spy = {
        target: "x",
        pseudo: "Casa Grimani",
        until: Date.now() + 3 * 86_400_000,
        offer: { resource: "bricks", side: "sell", price: "320", quantity: 14 },
      };
      json.spied = true;
      json.past = [
        {
          id: "p1",
          subject: { kind: "event", code: "famine_verona", city: "verona", day: day - 1 },
          source: "dogana",
          reliabilityBps: 7500,
          day: day - 1,
          forged: false,
          truth: true,
          unmasked: false,
        },
        {
          id: "p2",
          subject: { kind: "muda", arrival: 1, big: true },
          source: "rialto",
          reliabilityBps: 5000,
          day: day - 2,
          forged: true,
          truth: false,
          unmasked: true,
        },
      ];
    }
    await route.fulfill({ response, json });
  });
  await closeAll(page);
  await page.getByRole("button", { name: WORDS.notices }).first().click();
  await page.waitForTimeout(600);
  const line = page.getByRole("button", { name: WORDS.broglio });
  if ((await line.count()) === 0) {
    await closeAll(page);
    await page.unroute("**/api/game/broglio");
    return;
  }
  await line.first().click();
  await page.waitForTimeout(900);
  await check("broglio");
  // The maneuvers in their own sheet, then the cities' tab of Politics (refonte UX, lot 6).
  await page.locator('[data-coach="politics-maneuvers"]').click();
  await page.waitForTimeout(700);
  await check("manoeuvres");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  const cities = page.getByRole("tab", { name: WORDS.citiesTab });
  if ((await cities.count()) > 0) {
    await cities.first().click();
    await page.waitForTimeout(700);
    await check("politique-villes");
  }
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  await page.unroute("**/api/game/broglio");
}

/**
 * The parts of a house (R9): a house listed with holders in its register, an order open, parts
 * held elsewhere. No world has them at its start: the response is rewritten on its way.
 */
async function parts(page, check) {
  await page.route("**/api/game/shares", async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    if (json) {
      json.mine.listed = true;
      json.mine.refusal = null;
      json.mine.lastPrice = "1250";
      json.mine.float = 34;
      json.mine.holders = [
        { id: json.mine.house, pseudo: "", crest: null, bot: false, shares: 66 },
        { id: "h1", pseudo: "Bartolomeo Contarini-Mocenigo", crest: null, bot: false, shares: 30 },
        { id: "h2", pseudo: "Zuan", crest: null, bot: false, shares: 4 },
      ];
      json.mine.asks = [{ id: "p9", price: "1400", quantity: 10, mine: true }];
      json.mine.mine = { shares: 66, free: 5, dividends: "0" };
      json.mine.paid = "4210";
      json.held = [
        {
          house: "h3",
          pseudo: "Casa Grimani",
          crest: null,
          bot: false,
          shares: 12,
          lastPrice: "900",
          dividends: "1830",
          council: false,
        },
      ];
    }
    await route.fulfill({ response, json });
  });
  await closeAll(page);
  await page.goto(new URL("/?open=shares", page.url()).toString());
  await page.waitForTimeout(1200);
  // The Market at its « Actions » tab (refonte UX, lot 5).
  const tab = page.getByRole("tab", { name: WORDS.sharesTab });
  if ((await tab.count()) === 0) {
    await closeAll(page);
    await page.unroute("**/api/game/shares");
    return;
  }
  await page.waitForTimeout(900);
  await check("parts");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  await page.unroute("**/api/game/shares");
}

/**
 * The rival of the week ahead, a house of the computer: its line left the map's header (refonte
 * UX), a dot on the Classement tab says it. No world has such a rival at its start: the game's
 * response is rewritten on its way to the page.
 */
async function npcRival(page, check) {
  await page.route("**/api/game", async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    json.rival = {
      pseudo: "Commerciante884",
      bot: true,
      character: "speculator",
      gain: "1200000",
      mine: "100000",
      ahead: true,
    };
    await route.fulfill({ response, json });
  });
  await page.reload();
  await page.locator('[data-tab="ranking"]').waitFor();
  await page.waitForTimeout(800);
  const dot = await page.evaluate(
    () => !!document.querySelector('[data-tab="ranking"] .bg-vermilion'),
  );
  if (!dot) throw new Error("the rival ahead puts no dot on the Classement tab");
  await check("rival-pnj");
  await page.unroute("**/api/game");
}

/**
 * The Terraferma on a Thursday of 40 merchants, the merchant third by land: the map and the HUD
 * where they are the most loaded, on the phone and on a PC. The frozen week (its view and its
 * replay) is served in place of the server's, its times moved once onto the server's clock and its
 * merchant named after the account.
 */
async function midWeek(page, door, check, pseudo) {
  const serverNow = await page.evaluate(() =>
    fetch("/api/game")
      .then((r) => r.json())
      .then((j) => j.serverTime),
  );
  const delta = serverNow - MIDWEEK.now;
  const moved = (v) => {
    if (Array.isArray(v)) return v.map(moved);
    if (v && typeof v === "object")
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, moved(x)]));
    // Instants only: the week's are between 2001 and 2033.
    return typeof v === "number" && v > 1e12 && v < 2e12 ? v + delta : v;
  };
  const named = (v) => {
    for (const h of v.holders) if (h.me) h.pseudo = pseudo;
    return v;
  };
  const terra = named(moved(MIDWEEK.terra));
  const replay = named(moved(MIDWEEK.replay));
  await page.unroute("**/api/game/terra");
  await page.route("**/api/game/terra", (route) => route.fulfill({ json: { terra } }));
  await page.route("**/api/game/terra/replay", (route) => route.fulfill({ json: { replay } }));
  const open = async () => {
    await closeAll(page);
    await page.locator("[data-coach=tab-map]").click();
    await page.waitForTimeout(500);
    await door.click();
    await page.waitForTimeout(1500);
  };
  if (process.env.PERF === "1") await perf(page, open, terra);
  await open();
  await check("terraferme-jeudi");
  await lightHud(page, "terraferme-jeudi");
  await uncluttered(page, "terraferme-jeudi", 30);
  // The camp's sheet: its advice and the one gold that launches a front (lot 8).
  await page.locator('[data-coach="terra-launch"]').first().click();
  await page.waitForTimeout(700);
  await check("terraferme-camp");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  // The same on a PC, then back to the phone.
  const phone = page.viewportSize();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(1200);
  await check("terraferme-jeudi-pc");
  await lightHud(page, "terraferme-jeudi-pc");
  await uncluttered(page, "terraferme-jeudi-pc", 80);
  // A card of the HUD closes on Escape, as a window does.
  const purse = page.locator("[data-hud] button[aria-label]").filter({ hasText: /\d/ }).first();
  if ((await purse.count()) > 0) {
    await purse.click();
    await page.waitForTimeout(400);
    if ((await page.locator(".hud-tip").count()) === 0)
      throw new Error("terraferme-jeudi-pc: no card opened from the HUD");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    if ((await page.locator(".hud-tip").count()) > 0)
      throw new Error("terraferme-jeudi-pc: Escape left the HUD's card open");
  }
  if (phone) await page.setViewportSize(phone);
  await page.waitForTimeout(800);
  // The Condotta from the camp's sheet, while the week has the merchant's camp (lot 8).
  await condotta(page, check);
  await page.unroute("**/api/game/terra");
  await page.unroute("**/api/game/terra/replay");
}

/**
 * The Terraferma's HUD kept light (the owner's word of 24 October 2026): its band ends high, two
 * blocks at most under the purse, its actions at the thumb at the bottom right, no link
 * underlined.
 */
async function lightHud(page, label) {
  const seen = await page.evaluate(() => {
    const visible = (el) => el.getClientRects().length > 0;
    const right = ["troops", "terra-note"].filter((k) =>
      [...document.querySelectorAll(`[data-hud="${k}"]`)].some(visible),
    );
    const top = [...document.querySelectorAll("[data-hud]")]
      .filter((el) => visible(el) && !el.closest("[data-hud=actions]"))
      .filter((el) => el.getBoundingClientRect().top < innerHeight / 2)
      .map((el) => el.getBoundingClientRect().bottom);
    const actions = document.querySelector("[data-hud=actions]");
    return {
      band: Math.max(0, ...top),
      right,
      underlined: [...document.querySelectorAll("[data-hud] *")].filter(
        (el) => visible(el) && getComputedStyle(el).textDecorationLine.includes("underline"),
      ).length,
      actions: actions ? actions.getBoundingClientRect().top / innerHeight : null,
      cut: [...(actions?.querySelectorAll("button") ?? [])].filter(
        (b) => b.getBoundingClientRect().right > innerWidth + 0.5,
      ).length,
      width: innerWidth,
    };
  });
  // The purse, the troops and a plaque of two lines: from 235 px before (24 October 2026). On a
  // PC the right column holds three lines of text at most.
  const most = Math.round((seen.width >= 1024 ? 200 : 160) * SCALE);
  if (seen.band > most)
    throw new Error(
      `${label}: the HUD's band ends at ${Math.round(seen.band)} px, ${most} at most`,
    );
  if (seen.underlined > 0) throw new Error(`${label}: ${seen.underlined} link(s) underlined`);
  if (seen.cut > 0) throw new Error(`${label}: ${seen.cut} action(s) past the screen's edge`);
  if (seen.actions === null || seen.actions < 0.5)
    throw new Error(`${label}: « Lancer un front » not at the thumb`);
}

/**
 * The Terraferma's map legible with 40 merchants: no two labels shown over each other (by more than
 * 2 px; the words of one marker aside), and no more of them than a screen can read.
 */
async function uncluttered(page, label, most) {
  const seen = await page.evaluate(() => {
    const boxes = [...document.querySelectorAll(".map-marker")]
      .filter((m) => getComputedStyle(m).visibility !== "hidden" && m.getClientRects().length > 0)
      .flatMap((m) =>
        [...m.querySelectorAll("[data-map-label]")]
          .map((el) => ({ m, el, r: el.getBoundingClientRect() }))
          .filter(({ r }) => r.width > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0),
      );
    const over = [];
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        if (a.m === b.m) continue;
        const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
        const h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
        if (w > 2 && h > 2)
          over.push(`« ${a.el.textContent?.trim()} » over « ${b.el.textContent?.trim()} »`);
      }
    return { over, count: new Set(boxes.map((b) => b.m)).size };
  });
  if (seen.over.length > 0)
    throw new Error(`${label}: labels over each other: ${seen.over.join(", ")}`);
  if (seen.count > most)
    throw new Error(`${label}: ${seen.count} labels on the map, ${most} at most`);
}

/** The workshops' window opened: each workshop's button, its recipe raw or transforming. */
async function workshopRows(page) {
  if ((await page.locator("[data-coach^='produce-'], [data-coach^='harvest-']").count()) === 0) {
    await closeAll(page);
    // The Ateliers tab opens « Mes ateliers » (refonte UX, lot 4); its list, from there.
    await page.locator("[data-coach=tab-workshops]").click();
    await page.locator("[data-coach=panel-workshops]").click();
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

/** Every window closed and the place's panel too: back on the map, its tabs at the foot. */
async function closeAll(page) {
  for (let i = 0; i < 4; i++) {
    const open = await page.evaluate(
      () =>
        !!document.querySelector('[aria-modal="true"]') || !!document.querySelector("[data-panel]"),
    );
    if (!open) return;
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  }
}

/** The mail's six-digit code, from the server's log. */
async function mailCode(email) {
  for (let i = 0; i < 50; i++) {
    await new Promise((r) => setTimeout(r, 200));
    const text = readFileSync(log, "utf8");
    const at = text.lastIndexOf(email);
    const code = at >= 0 ? text.slice(at).match(WORDS.mailCode) : null;
    if (code) return `${code[1]}${code[2]}`;
  }
  throw new Error("no code in the server's log");
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
    .replace(WORDS.goalPrefix, "")
    .normalize("NFD")
    .replace(/[^\w ]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join("-")
    .toLowerCase();
}
