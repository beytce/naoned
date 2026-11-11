// The guided start (the owner's decision of 8 November 2026): a new house founded, then a player
// who touches only what is lit must reach the Fondaco's level 2 and the tutorial's last card, in
// time, without an error on the page. A shot at each step.
//   pnpm --filter @comptoirs/web build && pnpm --filter @comptoirs/web e2e:guided
// Shots in e2e-shots/guided by default (SHOTS), sizes 1280x800 and 390x844 (SIZES).
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const here = dirname(fileURLToPath(import.meta.url));
const SHOTS = resolve(process.env.SHOTS ?? join(here, "..", "e2e-shots", "guided"));
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
      EMPIRE_INTERIOR: process.env.EMPIRE_INTERIOR_OFF ? "off" : "on",
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

const server = await startServer();
const browser = await chromium.launch({
  ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}),
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const faults = [];
try {
  for (const [width, height] of SIZES) {
    const label = `${width}x${height}`;
    const phone = width < 600;
    const page = await browser.newPage({
      viewport: { width, height },
      locale: "fr-FR",
      ...(phone ? { isMobile: true, hasTouch: true } : {}),
    });
    page.on("pageerror", (e) => faults.push(`${label}: ${e.message}`));
    const email = `guided_${width}@example.org`;
    await page.goto(`${server.url}/ancien`);
    await page.fill("input[type=email]", email);
    await page.keyboard.press("Enter");
    await page.goto(`${server.url}/connexion?token=${await magicLink(email)}&ancien`);
    await page.waitForSelector("input[autocomplete=nickname]");
    await page.fill("input", `Guide_${width}`);
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: /fonder la maison/i }).click({ timeout: 15_000 });
    await page.waitForSelector("[data-intro]");
    for (let i = 0; i < 3; i++)
      await page
        .locator("[data-intro]")
        .getByRole("button", { name: /suivant|commencer/i })
        .click();
    const start = Date.now();
    const seen = [];
    let last = "";
    let ended = false;
    while (Date.now() - start < 25 * 60_000) {
      await page.waitForTimeout(1_500);
      const step = page.locator("[data-tutor-step]").first();
      if ((await step.count()) === 0) {
        if ((await page.locator("[data-tutor]").count()) > 0) continue;
        if (seen.length > 0) {
          ended = true;
          break;
        }
        continue;
      }
      const id = (await step.getAttribute("data-tutor-step")) ?? "";
      const text = (await step.innerText()).replace(/\s+/g, " ");
      if (text !== last) {
        last = text;
        seen.push(id);
        console.log(`${label} ${Math.round((Date.now() - start) / 1000)} s · ${id} · ${text}`);
        await page.screenshot({
          path: join(SHOTS, `${label}-${String(seen.length).padStart(2, "0")}-${id}.png`),
          timeout: 120_000,
        });
      }
      if (id === "rising") {
        await page.locator("[data-tutor-done]").click();
        continue;
      }
      const ring = page.locator("[data-tutor-ring]");
      if ((await ring.count()) === 0) continue;
      const box = await ring.boundingBox();
      if (!box) continue;
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      if (phone) await page.touchscreen.tap(x, y);
      else await page.mouse.click(x, y);
      await page.waitForTimeout(2_000);
    }
    if (!ended) faults.push(`${label}: the guided start never ended (last: « ${last} »)`);
    for (const id of ["build", "launch", "deliver", "sawmill", "market", "casa", "rising"])
      if (!seen.includes(id)) faults.push(`${label}: the step « ${id} » never came`);
    // A first time: the inside of a workshop, entered after the guided start, plays its tutorial.
    if (ended && !process.env.EMPIRE_INTERIOR_OFF) {
      await page.locator(".pc-pin[data-place^='workshop:']").first().click({ force: true });
      // The card follows its pin while the camera glides: touched once it has settled.
      await page.locator(".pc-card .pc-go").waitFor({ timeout: 20_000 });
      await page.waitForTimeout(8_000);
      await page.locator(".pc-card .pc-go").click({ force: true });
      const first = page.locator("[data-tutor-step^='interior:']");
      await first
        .waitFor({ timeout: 30_000 })
        .catch(() => faults.push(`${label}: no tutorial inside`));
      for (let i = 0; i < 8 && (await page.locator("[data-tutor-next]").count()) > 0; i++) {
        await page.screenshot({
          path: join(SHOTS, `${label}-interior-${i}.png`),
          timeout: 120_000,
        });
        await page.locator("[data-tutor-next]").click();
        await page.waitForTimeout(800);
      }
      if ((await page.locator("[data-tutor]").count()) > 0)
        faults.push(`${label}: the inside's tutorial did not close`);
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
console.log("the guided start: led to its end on every size");
