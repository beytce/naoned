// The Porta (docs/plan-porta.md), on a phone, against a server on an empty database in memory:
// the Porta opened from the Casa 1 and its sites shortened by WORLD_SETTINGS_OVERRIDE, the arms
// bought at the Remise, a battle alone of tier 1 played a moment.
//   pnpm --filter @comptoirs/web build && node apps/web/e2e/porta.mjs
// Shots in e2e-shots/porta by default (SHOTS). It waits on real minutes: the sites of a minute.
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { assertNoOverflow, assertOneGold } from "./assert.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const SHOTS = resolve(process.env.SHOTS ?? join(here, "..", "e2e-shots", "porta"));
const log = join(SHOTS, "server.log");
const MIN = 60_000;

const override = {
  empire: {
    start: { capitalDucats: 100000 },
    map: { depot: { costDucats: 1, casa: 1, minutes: 1 } },
    porta: {
      building: {
        casa: 1,
        costDucats: 1,
        minutes: 1,
        levelCostDucats: 100,
        levelMinutes: 1,
        travelMinutesPerCell: 1,
      },
      // One tier, without victuals: a new house has no bread yet.
      tiers: [
        {
          radius: 8,
          cities: 4,
          garrison: { crossbowman: 1 },
          roamers: { light_horse: 1 },
          strengthBps: 10000,
          relicsPerCity: { min: 1, max: 2 },
          rarityWeights: { common: 70, rare: 25, precious: 5, legendary: 0 },
          breadPerVehicle: 0,
        },
      ],
      // A battle of two minutes, its vehicles quick: the fight, the loading and the closing are seen.
      battle: { minutes: 2, transport: { speedCenti: 3000 } },
      models: { cavaliere: { casa: 1, costDucats: 1500, hp: 1200, speedCenti: 3600, slots: 1 } },
      components: {
        lances: {
          kind: "weapon",
          effect: "lances",
          casa: 1,
          costDucats: 800,
          power: 40,
          perLevelBps: 2000,
          rangeCenti: 150,
          rampBps: 1500,
          rampEveryS: 2,
          rampMaxBps: 15000,
        },
      },
    },
  },
};

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
      WORLD_SETTINGS_OVERRIDE: JSON.stringify(override),
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
/**
 * A place of the map touched at its mark's middle: on the 3D board (the game's map), the touch goes
 * through the mark to the scene, which finds the place by a ray.
 */
async function press(page, sel) {
  const mark = page.locator(sel).first();
  await mark.waitFor();
  const b = await mark.boundingBox();
  if (b) await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
}

const browser = await chromium.launch({
  // WebGL in software, for the 3D board, in a container without a GPU.
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}),
});
const faults = [];
try {
  const [vw, vh] = (process.env.SIZE ?? "390x844").split("x").map(Number);
  const page = await browser.newPage({ viewport: { width: vw, height: vh }, locale: "fr-FR" });
  page.on("pageerror", (e) => faults.push(e.message));
  if (process.env.DEBUG) page.on("console", (m) => console.log(`[${m.type()}] ${m.text()}`));
  const shot = async (name) => {
    await page.waitForTimeout(500);
    await assertNoOverflow(page).catch((e) => faults.push(`${name}: ${e.message}`));
    await assertOneGold(page).catch((e) => faults.push(`${name}: ${e.message}`));
    await page.screenshot({ path: join(SHOTS, `${name}.png`) });
  };
  const act = (a) =>
    page.evaluate(async (body) => {
      const res = await fetch("/api/empire/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      return { ok: res.ok, error: data.error, view: data.view };
    }, a);

  const email = "porta@example.org";
  await page.goto(server.url);
  await page.fill("input[type=email]", email);
  await page.keyboard.press("Enter");
  await page.goto(`${server.url}/connexion?token=${await magicLink(email)}`);
  await page.waitForSelector("input[autocomplete=nickname]");
  await page.fill("input", "Porta");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: /fonder la maison/i }).click();
  await page.waitForSelector("[data-intro]");
  for (let i = 0; i < 3; i++)
    await page
      .locator("[data-intro]")
      .getByRole("button", { name: /suivant|commencer/i })
      .click();
  await page.waitForSelector("[data-porcellana-map]");
  // The guided start and the places' first times passed (docs/plan-tutoriels.md): the Porta's play here.
  await page.evaluate(() => localStorage.setItem("fondaco:tutor", JSON.stringify({ all: "skip" })));
  await page.reload();
  await page.waitForSelector("[data-porcellana-map]");

  // The Remise and the Porta on two tiles bought next to the house's (the square tiles: a place a
  // tile), their sites of a minute each.
  const first = await page.evaluate(async () => (await fetch("/api/empire")).json());
  const towns = new Set((first.view?.map?.cities ?? []).map((c) => c.cell));
  const free = (v) =>
    (v?.map?.buyable ?? []).filter((x) => x.casa <= v.house.casa && !towns.has(x.cell));
  const a = free(first.view)[0]?.cell;
  if (!a) throw new Error("no tile to buy");
  let u = await act({ type: "empireUnlockCell", cell: a });
  if (!u.ok) faults.push(`tile ${a}: ${u.error}`);
  // The Porta next to the Remise: its way of a minute.
  const [ai, aj] = a.split(",").map(Number);
  const b = free(u.view).find((x) => {
    const [i, j] = x.cell.split(",").map(Number);
    return Math.abs(i - ai) + Math.abs(j - aj) === 1;
  })?.cell;
  if (!b) throw new Error("no tile next to the Remise's");
  u = await act({ type: "empireUnlockCell", cell: b });
  if (!u.ok) faults.push(`tile ${b}: ${u.error}`);
  let r = await act({ type: "empireBuildDepot", cell: a });
  if (!r.ok) faults.push(`depot: ${r.error}`);
  await page.waitForTimeout(MIN + 2_000);
  r = await act({ type: "empireBuildPorta", cell: b });
  if (!r.ok) faults.push(`porta: ${r.error}`);
  await page.waitForTimeout(MIN + 2_000);
  await act({ type: "empireBuyArm", model: "cavaliere" });
  r = await act({ type: "empireBuyComponent", code: "lances" });
  const porta = r.view?.porta;
  const rider = porta?.vehicles?.[0]?.id;
  const lances = porta?.inventory?.[0]?.id;
  const mule = porta?.transports?.[0]?.id;
  await act({ type: "empireFitArm", vehicleId: rider, slot: 0, componentId: lances });
  r = await act({ type: "empireSendToPorta", vehicleIds: [rider, mule] });
  if (!r.ok) faults.push(`send: ${r.error}`);
  await page.reload();
  await page.waitForSelector("[data-porcellana-map]");

  // The Remise's arms.
  await page.locator("[data-place^='depot:']").evaluate((el) => el.click());
  await page.locator(".pc-go").evaluate((el) => el.click());
  await page.locator("[data-map-action=arms]").click();
  // The vehicle in the middle (docs/plan-dock.md), a place touched, then the shop.
  await page.waitForSelector("[data-arms-dock=vehicle]");
  await page.waitForTimeout(800);
  await shot("1-armes");
  // Its places, when it stands at the Remise (here it may already be on its way to the Porta).
  const socket = page.locator("[data-dock-socket]:not([disabled])").first();
  if ((await socket.count()) > 0) {
    await socket.click();
    await page.waitForSelector("[data-arms-fit]");
    await page.waitForTimeout(600);
    await shot("1b-equiper");
    await page.locator("[data-dock-back]").click();
  }
  await page.locator("[data-arms-shop]").click();
  await page.waitForSelector("[data-arms-models]");
  await page.waitForTimeout(600);
  await shot("1c-acheter");
  await page.keyboard.press("Escape");

  await page.waitForTimeout(MIN + 2_000);
  await page.reload();
  await page.waitForSelector("[data-place^='porta:']", { state: "attached" });
  await shot("2-carte");
  await page.locator("[data-place^='porta:']").evaluate((el) => el.click());
  await page.locator(".pc-go").evaluate((el) => el.click());
  await shot("3-panneau");
  await page.locator("[data-map-action=porta]").click();
  await page.waitForSelector("[data-porta-battle]");
  await shot("4-porta");
  // The dock in three steps (docs/plan-dock.md): the crew, the tier, how to go.
  await page.locator("[data-porta-next]").click();
  await page.waitForSelector("[data-porta-tiers]");
  await page.waitForTimeout(600);
  await shot("4b-palier");
  await page.locator("[data-porta-next]").click();
  await page.waitForSelector("[data-porta-mode=solo]");
  await page.waitForTimeout(600);
  await shot("4c-partir");
  // The antiquarian, behind its round button, and back.
  await page.locator("[data-porta-round=stall]").click();
  await page.waitForSelector("[data-porta-antiquarian]");
  await page.waitForTimeout(600);
  await shot("4d-antiquaire");
  await page.locator("[data-porta-round=stall]").click();
  await page.waitForSelector("[data-porta-mode=solo]");

  // A battle alone, tier 1.
  await page.locator("[data-porta-go]").click();
  await page.waitForSelector("[data-battle-timer]", { timeout: 15_000 });
  // The island opens (its tiles drop from the gate), the convoy is made: the transport follows.
  await page.waitForTimeout(3_500);
  await shot("5-bataille");
  await page.waitForSelector("[data-battle-convoy=joined]", { timeout: 5_000 });
  // One touch on the nearest town: « Charger ici », the fighter goes, the transport behind it.
  // The town may lie beyond the first framing: touched as a finger would after a drag.
  const city = page.locator("[data-battle-city]").first();
  await city.evaluate((el) => el.click());
  await page.waitForTimeout(450);
  await page.screenshot({ path: join(SHOTS, "5b-ordre.png") });
  await page.waitForSelector("[data-battle-mood=moving]", { timeout: 5_000 });
  await page.waitForSelector("[data-battle-mood=follow]", { timeout: 5_000 });
  await page.waitForTimeout(2_500);
  await shot("6-bataille-en-route");
  // The fight at the town, the camera on the convoy; then the relic loaded.
  await page.waitForTimeout(7_000);
  await shot("7-combat");
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(SHOTS, "7b-combat.png") });
  await page.waitForSelector("[data-battle-mood=loading]", { timeout: 40_000 }).catch(() => {
    faults.push("battle: the transport never loaded at the town");
  });
  await page.waitForTimeout(1_500);
  await shot("7c-charge");
  // Up close on the vehicles (a wheel over the screen's middle): the pieces.
  await page.mouse.move(vw / 2, vh / 2 - 60);
  for (let i = 0; i < 4; i++) await page.mouse.wheel(0, -240);
  await page.waitForTimeout(1_500);
  await shot("8-bataille-pres");
  // The whole island (its button), the vehicles small but never lost; Rome closes its lands: the
  // far tiles turn on their back.
  await page.locator("[data-battle-view=whole]").click();
  for (let i = 0; i < 220; i++) {
    const [m, s] = ((await page.locator("[data-battle-timer]").textContent()) ?? "9:59")
      .split(":")
      .map(Number);
    if (m * 60 + s <= 35) break;
    await page.waitForTimeout(500);
  }
  await shot("9-fermeture");
  // Home by one order: both go to the gate and out of it.
  await page.locator("[data-battle-gate]").evaluate((el) => el.click());
  await page.waitForSelector("[data-battle-mood=exiting]", { timeout: 5_000 });
  await page.waitForTimeout(1_200);
  await shot("10-retour");
  await page.waitForSelector("[data-battle-over]", { timeout: 40_000 });
  await shot("11-sortis");
} finally {
  await browser.close();
  server.stop();
}
if (faults.length > 0) {
  console.error(faults.join("\n"));
  process.exit(1);
}
console.log(`The Porta's shots in ${SHOTS}`);
