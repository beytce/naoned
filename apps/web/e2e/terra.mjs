// The way into the Terraferma (the owner's decision of 8 November 2026): a house founded, its Campo
// on the map and a week under way (the server's answers completed with them: a Campo asks the
// Fondaco at level 5); the Campo touched, « Entrer »: the tiles turn over, the camera draws back,
// the Terraferma's board takes over; « ‹ Carte »: the way back. Shots along the way.
//   pnpm --filter @comptoirs/web build && pnpm --filter @comptoirs/web e2e:terra
// Shots in e2e-shots/terra by default (SHOTS), sizes 1280x800 and 390x844 (SIZES).
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const here = dirname(fileURLToPath(import.meta.url));
const SHOTS = resolve(process.env.SHOTS ?? join(here, "..", "e2e-shots", "terra"));
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

const WEEK = JSON.parse(readFileSync(join(here, "fixtures", "terra-square.json"), "utf8"));
const THEATRE = { id: "e2e", band: 0, kind: "open", companies: [], members: 24 };

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
    // The way in and out filmed frame by frame (Chrome's screencast: a shot is slow on a software
    // renderer, the screencast's frames are not), one in `every` kept.
    const film = async (name, until, every = 2) => {
      const cdp = await context.newCDPSession(page);
      let n = 0;
      let kept = 0;
      cdp.on("Page.screencastFrame", (f) => {
        void cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
        if (n++ % every === 0)
          writeFileSync(
            join(SHOTS, `${label}-${name}-${String(kept++).padStart(3, "0")}.jpg`),
            Buffer.from(f.data, "base64"),
          );
      });
      await cdp.send("Page.startScreencast", { format: "jpeg", quality: 70 });
      await until();
      await cdp.send("Page.stopScreencast").catch(() => {});
      await cdp.detach().catch(() => {});
      return kept;
    };
    page.on("pageerror", (e) => faults.push(`${label}: ${e.message}`));
    const shot = (name) =>
      page.screenshot({ path: join(SHOTS, `${label}-${name}.png`), timeout: 120_000 });
    // The house's answers: its Campo on a free tile of its own, a week of the Terraferma joined.
    let campo = null;
    const complete = (json) => {
      if (json?.kind === "empire" && json.view && campo) {
        json.view.map.camp = campo;
        json.view.terra.theatre = THEATRE;
        // The supply by road: the Campo's orders of the day, and its store.
        json.view.campo = {
          orders: [
            { id: "campo#e2e:bricks", good: "bricks", qty: 10 },
            { id: "campo#e2e:bread", good: "bread", qty: 6 },
          ],
          posts: ["home"],
          store: { bread: 12, planks: 8 },
          point: null,
        };
      }
      return json;
    };
    await page.route(/\/api\/empire(\/actions)?$/, async (route) => {
      const res = await route.fetch();
      const json = complete(await res.json().catch(() => null));
      await route.fulfill({ response: res, json });
    });
    await page.route(/\/api\/empire\/terra$/, (route) =>
      route.fulfill({ json: { terra: campo ? { theatre: THEATRE, view: WEEK.view } : null } }),
    );
    const email = `terra_${width}@example.org`;
    await page.goto(`${server.url}/ancien`);
    await page.fill("input[type=email]", email);
    await page.keyboard.press("Enter");
    await page.goto(`${server.url}/connexion?token=${await magicLink(email)}&ancien`);
    await page.waitForSelector("input[autocomplete=nickname]");
    await page.fill("input", `Terra_${width}`);
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: /fonder la maison/i }).click({ timeout: 15_000 });
    await page.waitForSelector("[data-intro]");
    for (let i = 0; i < 3; i++)
      await page
        .locator("[data-intro]")
        .getByRole("button", { name: /suivant|commencer/i })
        .click();
    // The guided start and the other places' first times passed: the Terraferma's play here.
    await page.evaluate(() =>
      localStorage.setItem(
        "fondaco:tutor",
        JSON.stringify({
          first: "skip",
          porta: "done",
          remise: "done",
          interior: "done",
          battle: "done",
        }),
      ),
    );
    await page.waitForSelector("[data-porcellana-map]", { timeout: 30_000 });
    // A free tile of the house's takes the Campo.
    const free = page.locator("[data-place^='free:']").first();
    await free.waitFor({ state: "attached", timeout: 30_000 });
    campo = (await free.getAttribute("data-place"))?.slice(5) ?? null;
    // SLOW=20: the way twenty times slower (?lenteur), its frames seen on a slow renderer.
    if (process.env.SLOW) await page.goto(`${server.url}/ancien?lenteur=${process.env.SLOW}`);
    else await page.reload();
    await page.waitForSelector("[data-porcellana-map]", { timeout: 30_000 });
    const pin = page.locator(`[data-place='campo:${campo}']`);
    await pin.waitFor({ state: "attached", timeout: 30_000 });
    await page.waitForTimeout(8_000);
    await pin.evaluate((el) => el.click());
    await page.locator(".pc-card").waitFor();
    await shot("1-campo");
    // « Entrer »: the way in, shot as it goes (the software renderer is slow: its frames are
    // fewer, the way longer in wall time than on a device).
    const started = Date.now();
    const frames = await film(
      "2-entree",
      async () => {
        await page.locator(".pc-go").evaluate((el) => el.click());
        await page.locator("[data-terra-stage='open']").waitFor({ timeout: 60_000 });
        await page.waitForTimeout(3_000);
      },
      1,
    );
    console.log(`${label}: the way in, ${Date.now() - started} ms, ${frames} frames kept`);
    await page.locator("[data-terra-stage='open']").waitFor({ timeout: 60_000 });
    await page.locator("[data-terra-play]").waitFor({ timeout: 60_000 });
    // Its first times: the overview, then the board's pieces, under the spotlight.
    const overview = await playTutor(page, "terra", () => shot("3-tuto-terraferme"));
    const pieces = await playTutor(page, "terraBoard", () => shot("3-tuto-plateau"));
    if (overview !== 3 || pieces !== 5)
      throw new Error(
        `${label}: the Terraferma's tutorials played ${overview} and ${pieces} steps`,
      );
    await page.waitForTimeout(6_000);
    await shot("3-terraferme");
    // Its lands: the war chest, the Campo's store and « Livrer au Campo ».
    await page
      .locator("[data-terra-chest]")
      .first()
      .evaluate((el) => el.click());
    await page.locator("[data-terra-campo]").waitFor({ timeout: 30_000 });
    await shot("3-terres");
    await page.keyboard.press("Escape");
    // « ‹ Carte »: the way back.
    await film("4-retour", async () => {
      await page
        .locator("[data-terra-back]")
        .first()
        .evaluate((el) => el.click());
      await page.locator("[data-terra-stage]").waitFor({ state: "detached", timeout: 60_000 });
      await page.waitForTimeout(4_000);
    });
    await shot("5-carte");
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
console.log(`the way into the Terraferma: shots in ${SHOTS}`);
