// The Battle (lot T6b, 9 November 2026): a house founded, its Compagnie's Terraferma pane, « La
// Bataille », « Jouer » : the lobby, then after its minute the live match on the Terraferma's
// board with the computer's houses; an order played. Shots along the way.
//   pnpm --filter @comptoirs/web build && pnpm --filter @comptoirs/web e2e:battle
// Shots in e2e-shots/battle by default (SHOTS), sizes 1280x800 and 390x844 (SIZES).
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const here = dirname(fileURLToPath(import.meta.url));
const SHOTS = resolve(process.env.SHOTS ?? join(here, "..", "e2e-shots", "battle"));
const SIZES = (process.env.SIZES ?? "1280x800,390x844")
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

/** Plays a first-time tutorial through, « Suivant » to « Compris »: how many steps it had. */
async function playTutor(page, id, shot) {
  const step = page.locator(`[data-tutor-step^='${id}:']`);
  await step.first().waitFor({ timeout: 30_000 });
  let n = 0;
  while ((await step.count()) > 0 && n < 10) {
    if (n === 0 && shot) await shot();
    n++;
    await page.locator("[data-tutor-next]").first().click();
    await page.waitForTimeout(400);
  }
  return n;
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
    const context = await browser.newContext({ viewport: { width, height }, locale: "fr-FR" });
    const page = await context.newPage();
    page.on("pageerror", (e) => faults.push(`${label}: ${e.message}`));
    const shot = (name) =>
      page.screenshot({ path: join(SHOTS, `${label}-${name}.png`), timeout: 120_000 });
    // The house's answers: a Campo, so that the Terraferma's pane opens.
    let campo = null;
    await page.route(/\/api\/empire(\/actions)?$/, async (route) => {
      const res = await route.fetch();
      const json = await res.json().catch(() => null);
      if (json?.kind === "empire" && json.view && campo) json.view.map.camp = campo;
      await route.fulfill({ response: res, json });
    });
    const email = `battle_${width}@example.org`;
    await page.goto(`${server.url}/ancien`);
    await page.fill("input[type=email]", email);
    await page.keyboard.press("Enter");
    await page.goto(`${server.url}/connexion?token=${await magicLink(email)}&ancien`);
    await page.waitForSelector("input[autocomplete=nickname]");
    await page.fill("input", `Battle_${width}`);
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: /fonder la maison/i }).click({ timeout: 15_000 });
    await page.waitForSelector("[data-intro]");
    for (let i = 0; i < 3; i++)
      await page
        .locator("[data-intro]")
        .getByRole("button", { name: /suivant|commencer/i })
        .click();
    await page.evaluate(() =>
      localStorage.setItem(
        "fondaco:tutor",
        JSON.stringify({
          first: "skip",
          porta: "done",
          remise: "done",
          interior: "done",
          terra: "done",
          terraBoard: "done",
        }),
      ),
    );
    await page.waitForSelector("[data-porcellana-map]", { timeout: 30_000 });
    const free = page.locator("[data-place^='free:']").first();
    await free.waitFor({ state: "attached", timeout: 30_000 });
    campo = (await free.getAttribute("data-place"))?.slice(5) ?? null;
    await page.reload();
    await page.waitForSelector("[data-porcellana-map]", { timeout: 30_000 });
    // The Compagnie, its Terraferma pane, the Battle.
    await page
      .locator("[data-place-tab=company]")
      .first()
      .evaluate((el) => el.click());
    await page
      .locator("[data-pane=terra]")
      .first()
      .evaluate((el) => el.click());
    await page
      .locator("[data-battle-entry] button")
      .first()
      .evaluate((el) => el.click());
    await page.locator("[data-battle-stage=none]").waitFor({ timeout: 30_000 });
    // Its first time: three steps under the spotlight (the others passed).
    const steps = await playTutor(page, "battle", () => shot("1-tuto"));
    if (steps !== 3) faults.push(`${label}: the Battle's tutorial played ${steps} steps`);
    await shot("1-bataille");
    // The cote (B3): the newcomer's start, and the public ranking a touch away.
    if (!/1\s?000/.test((await page.locator("[data-battle-rating]").textContent()) ?? ""))
      faults.push(`${label}: no cote`);
    await page
      .locator("[data-battle-card] button")
      .first()
      .evaluate((el) => el.click());
    await page.locator("[data-battle-stage=lobby]").waitFor({ timeout: 30_000 });
    await shot("2-salle");
    // After its minute, the match with the computer's houses.
    await page.locator("[data-battle-stage=playing]").waitFor({ timeout: 120_000 });
    await page.locator("[data-terra-play]").waitFor({ timeout: 60_000 });
    await page.waitForTimeout(8_000);
    await shot("3-partie");
    // An order: the merchant's lands, then the Battle's clock still running.
    await page
      .locator("[data-terra-chest]")
      .first()
      .evaluate((el) => el.click());
    await page.waitForTimeout(2_000);
    await shot("4-terres");
    if (!(await page.locator("[data-battle-clock]").count())) faults.push(`${label}: no clock`);
    await context.close();
  }
  // Without an account (B4): the landing's link, the guest's name, a private room launched.
  {
    const label = "invite";
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale: "fr-FR",
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => faults.push(`${label}: ${e.message}`));
    const shot = (name) =>
      page.screenshot({ path: join(SHOTS, `${label}-${name}.png`), timeout: 120_000 });
    await page.goto(`${server.url}/ancien`);
    await page.locator("[data-play-battle]").click();
    await page.locator("[data-battle-stage=none]").waitFor({ timeout: 30_000 });
    if (!(await page.locator("[data-battle-guest]").count())) faults.push(`${label}: no guest`);
    await shot("1-invite");
    await page.getByRole("button", { name: /salle privée/i }).click();
    const room = page.locator("[data-battle-room]");
    await room.waitFor({ timeout: 30_000 });
    const code = await room.getAttribute("data-battle-room");
    await shot("2-salle-privee");
    // A friend comes by the link, then the host launches.
    const friend = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale: "fr-FR",
    });
    const other = await friend.newPage();
    await other.goto(`${server.url}/bataille/${code}`);
    await other
      .getByRole("button", { name: new RegExp(`rejoindre la salle ${code}`, "i") })
      .click();
    await other.locator("[data-battle-room]").waitFor({ timeout: 30_000 });
    await page.getByRole("button", { name: /lancer la partie/i }).click();
    await page.locator("[data-battle-stage=playing]").waitFor({ timeout: 30_000 });
    await other.locator("[data-battle-stage=playing]").waitFor({ timeout: 30_000 });
    await page.locator("[data-terra-play]").waitFor({ timeout: 60_000 });
    await page.waitForTimeout(6_000);
    await shot("3-partie");
    await friend.close();
    await context.close();
  }
} catch (e) {
  faults.push(String(e?.stack ?? e));
} finally {
  await browser.close();
  server.stop();
}
if (faults.length) {
  console.error(faults.join("\n"));
  process.exit(1);
}
console.log(`the Battle: shots in ${SHOTS}`);
