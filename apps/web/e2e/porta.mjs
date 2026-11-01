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
import { assertNoOverflow } from "./assert.mjs";

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
      models: { cavaliere: { casa: 1, costDucats: 1500, hp: 1200, speedCenti: 600, slots: 1 } },
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
const browser = await chromium.launch({
  ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}),
});
const faults = [];
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: "fr-FR" });
  page.on("pageerror", (e) => faults.push(e.message));
  const shot = async (name) => {
    await page.waitForTimeout(500);
    await assertNoOverflow(page).catch((e) => faults.push(`${name}: ${e.message}`));
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
  await page.waitForSelector("[data-map=empire]");

  // The Remise and the Porta on the first cell seen, their sites of a minute each.
  const first = await page.evaluate(async () => (await fetch("/api/empire")).json());
  const cell = first.view?.house?.revealed?.[0];
  if (!cell) throw new Error("no cell seen");
  let r = await act({ type: "empireBuildDepot", cell });
  if (!r.ok) faults.push(`depot: ${r.error}`);
  await page.waitForTimeout(MIN + 2_000);
  r = await act({ type: "empireBuildPorta", cell });
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
  await page.waitForSelector("[data-map=empire]");

  // The Remise's arms.
  await page.locator("[data-depot-mark]").click();
  await page.locator("[data-map-action=arms]").click();
  await page.waitForSelector("[data-arms-models]");
  await shot("1-armes");
  await page.keyboard.press("Escape");

  await page.waitForTimeout(MIN + 2_000);
  await page.reload();
  await page.waitForSelector("[data-porta-mark]");
  await shot("2-carte");
  await page.locator("[data-porta-mark]").click();
  await shot("3-panneau");
  await page.locator("[data-map-action=porta]").click();
  await page.waitForSelector("[data-porta-battle]");
  await shot("4-porta");

  // A battle alone, tier 1.
  await page.getByRole("button", { name: /partir seul/i }).click();
  await page.waitForSelector("[data-battle-timer]", { timeout: 15_000 });
  await page.waitForTimeout(1_500);
  await shot("5-bataille");
  // The rider to the nearest city, then the transport.
  const city = page.locator("[data-battle-city]").first();
  await city.click();
  await page.locator("[data-battle-unit]").nth(1).click();
  await city.click();
  await page.waitForTimeout(8_000);
  await shot("6-bataille-en-route");
} finally {
  await browser.close();
  server.stop();
}
if (faults.length > 0) {
  console.error(faults.join("\n"));
  process.exit(1);
}
console.log(`The Porta's shots in ${SHOTS}`);
