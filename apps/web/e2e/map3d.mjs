// The 3D map prototype (?map=3d), on a phone, against a server on an empty database in memory
// that opens the empire's world (WORLD_KIND=empire):
//   pnpm --filter @comptoirs/web build && pnpm --filter @comptoirs/web e2e:map3d
// Shots and the video in OUT (docs/direction-artistique-2026-11/carte-3d by default); PERF=1 also
// measures the frames with the CPU slowed four times (perf.json); DUMP=<file> writes the map seen.
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(
  process.env.OUT ??
    join(here, "..", "..", "..", "docs", "direction-artistique-2026-11", "carte-3d"),
);
const [W, H] = (process.env.SIZE ?? "390x844").split("x").map(Number);
const log = join(tmpdir(), `map3d-server-${process.pid}.log`);

async function startServer() {
  const serverDir = join(here, "..", "..", "server");
  const tsx = createRequire(join(serverDir, "package.json")).resolve("tsx/cli");
  const port = 3100 + Math.floor(Math.random() * 800);
  const url = `http://127.0.0.1:${port}`;
  mkdirSync(OUT, { recursive: true });
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

/** A house founded, its first fondaco put down (as in e2e/empire.mjs). */
async function found(page, url) {
  const email = `map3d_${Date.now()}@example.org`;
  await page.goto(url);
  await page.fill("input[type=email]", email);
  await page.keyboard.press("Enter");
  await page.goto(`${url}/connexion?token=${await magicLink(email)}`);
  await page.waitForSelector("input[autocomplete=nickname]");
  await page.fill("input", "Casa_3D");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: /fonder la maison/i }).click({ timeout: 15_000 });
  await page.waitForSelector("[data-intro]");
  for (let i = 0; i < 3; i++)
    await page
      .locator("[data-intro]")
      .getByRole("button", { name: /suivant|commencer/i })
      .click();
  await page.locator("[data-placing-bar=home]").waitFor();
  const cell = page.locator("[data-cell]").first();
  const box = await cell.boundingBox();
  if (box) await cell.click({ position: { x: box.width * 0.78, y: box.height * 0.55 } });
  await page.getByRole("button", { name: /poser ici · gratuit/i }).click();
  await page.locator("[data-placing-bar=home]").waitFor({ state: "hidden" });
}

const server = await startServer();
const browser = await chromium.launch({
  ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}),
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const faults = [];
try {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, locale: "fr-FR" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => faults.push(e.message));
  page.on(
    "console",
    (m) =>
      m.type() === "error" &&
      !/401 \(Unauthorized\)/.test(m.text()) &&
      faults.push(`console: ${m.text()}`),
  );
  let mapSeen = null;
  page.on("response", async (r) => {
    if (!r.url().includes("/api/empire") || r.request().method() !== "GET") return;
    const body = await r.json().catch(() => null);
    if (body?.view?.map) mapSeen = body.view.map;
  });
  await found(page, server.url);
  const open3d = async (extra = "", pg = page) => {
    await pg.goto(`${server.url}/?map=3d${extra}`);
    await pg.waitForSelector("[data-map=empire] canvas", { timeout: 20_000 });
    await pg
      .waitForSelector("[data-map=empire] [data-city]", { timeout: 30_000 })
      .catch(async (e) => {
        await pg.screenshot({ path: join(OUT, "stuck.png") });
        throw new Error(`${e.message}\n${faults.join("\n")}`);
      });
    // The models in, the shadows drawn.
    await pg.waitForTimeout(3000);
  };
  const shot = (name) => page.screenshot({ path: join(OUT, `${name}.png`) });
  if (process.env.PEEK) {
    if (process.env.REDUCED) await page.emulateMedia({ reducedMotion: "reduce" });
    await open3d(process.env.PEEK === "1" ? "" : `&${process.env.PEEK}`);
    await shot("peek");
    if (process.env.DRAG) {
      if (process.env.THROTTLE)
        await (await ctx.newCDPSession(page)).send("Emulation.setCPUThrottlingRate", { rate: 4 });
      console.log("frames", await page.evaluate(() => window.__m3d?.at.length));
      await page.waitForTimeout(Number(process.env.DRAG_WAIT ?? 0));
      console.log("frames", await page.evaluate(() => window.__m3d?.at.length));
      await page.mouse.move(W * 0.5, H * 0.63);
      await page.mouse.down();
      for (let i = 0; i < 60; i++) {
        await page.mouse.move(
          W * (0.5 + 0.3 * Math.sin(i / 10)),
          H * (0.63 + 0.08 * Math.sin(i / 7)),
        );
        await page.waitForTimeout(50);
      }
      await page.mouse.up();
      await page.waitForTimeout(500);
      await shot("peek-drag");
      console.log("frames", await page.evaluate(() => window.__m3d?.at.length));
    }
  } else {
    // 1. The start: the house's sector across the screen, as the game opens it.
    await open3d();
    if ((await page.locator("[data-map=empire]").count()) !== 0)
      faults.push("the SVG map drawn under the 3D one");
    for (const code of ["venezia", "padova"])
      if ((await page.locator(`[data-map=empire3d] [data-city=${code}]`).count()) !== 1)
        faults.push(`${code} without its name on the 3D map`);
    await shot("1-depart");
    // A town touched (its name): lit, and its panel at the foot, as on the SVG map.
    await page.locator("[data-map=empire3d] [data-city=padova]").click();
    await page
      .locator("[data-bottom-slot='panel:city']")
      .waitFor({ timeout: 5_000 })
      .catch(() => {
        faults.push("Padua touched: no city panel");
      });
    await page
      .locator("[data-city=padova][data-picked]")
      .waitFor({ timeout: 3_000 })
      .catch(() => faults.push("Padua touched: not lit"));
    await shot("1b-padoue");
    // A touch on the night: nothing chosen, the round buttons back.
    await page.mouse.click(20, H * 0.3);
    await page
      .locator("[data-bottom-slot='idle']")
      .waitFor({ timeout: 5_000 })
      .catch(() => {
        faults.push("a touch on the night: the panel stays");
      });
    // 2. Up close on the fondaco (Recentrer); a touch on it, at the middle of the screen, reaches it
    // through the 3D scene (raycast).
    await page.getByRole("button", { name: /recentrer/i }).click();
    await page.waitForTimeout(1500);
    await shot("2-fondaco");
    await page.mouse.click(W / 2, H / 2);
    await page
      .locator("[data-bottom-slot='panel:casa']")
      .waitFor({ timeout: 5_000 })
      .catch(() => {
        faults.push("the fondaco touched: no panel of the Casa");
      });
    await page.waitForTimeout(600);
    await shot("2b-fondaco-touche");
    // 3. The mule walking, the camera after it.
    await open3d("&suivre=mule");
    await page.keyboard.press("+");
    await page.keyboard.press("+");
    await page.waitForTimeout(2500);
    await shot("3-mule");
    // 4. Out: the Veneto seen wider (the game's own map around the house), all of it on screen.
    await open3d("&scene=veneto");
    await shot("4b-venetie");
    for (let i = 0; i < 4; i++) await page.keyboard.press("-");
    await page.waitForTimeout(1200);
    await shot("4-dezoom");

    // The video: 13 s of the mule on its round.
    const rec = await browser.newContext({
      viewport: { width: W, height: H },
      locale: "fr-FR",
      storageState: await ctx.storageState(),
      recordVideo: { dir: join(OUT, "video-tmp"), size: { width: W, height: H } },
    });
    const vp = await rec.newPage();
    await open3d("&suivre=mule", vp);
    await vp.keyboard.press("+");
    await vp.keyboard.press("+");
    await vp.waitForTimeout(13_000);
    const video = vp.video();
    await rec.close();
    if (video) {
      renameSync(await video.path(), join(OUT, "mule.webm"));
      rmSync(join(OUT, "video-tmp"), { recursive: true, force: true });
    }

    // The frames, the CPU slowed four times (PERF=1): at rest, alive, and during a pan.
    if (process.env.PERF) {
      const perf = {};
      const cdp = await ctx.newCDPSession(page);
      const measure = async (label, during) => {
        await page.evaluate(() => {
          const r = window.__m3d;
          r.at.length = 0;
          r.work.length = 0;
        });
        const t0 = Date.now();
        await during();
        const secs = (Date.now() - t0) / 1000;
        const r = await page.evaluate(() => window.__m3d);
        const gaps = r.at.slice(1).map((t, i) => t - r.at[i]);
        const q = (a, p) => [...a].sort((x, y) => x - y)[Math.floor((a.length - 1) * p)] ?? 0;
        perf[label] = {
          seconds: Number(secs.toFixed(1)),
          frames: r.at.length,
          fps: Number((r.at.length / secs).toFixed(1)),
          frameGapMs: {
            median: Number(q(gaps, 0.5).toFixed(1)),
            p95: Number(q(gaps, 0.95).toFixed(1)),
          },
          workMs: {
            median: Number(q(r.work, 0.5).toFixed(1)),
            p95: Number(q(r.work, 0.95).toFixed(1)),
          },
          drawCalls: r.calls,
          triangles: r.triangles,
        };
      };
      const pan = async () => {
        // From a bare spot of the tile (a name keeps the finger), to and fro.
        await page.mouse.move(W * 0.5, H * 0.63);
        await page.mouse.down();
        for (let i = 0; i < 60; i++) {
          await page.mouse.move(
            W * (0.5 + 0.3 * Math.sin(i / 10)),
            H * (0.63 + 0.08 * Math.sin(i / 7)),
          );
          await page.waitForTimeout(50);
        }
        await page.mouse.up();
      };
      for (const fx of ["", "&fx=0"])
        for (const reduced of [true, false]) {
          await page.emulateMedia({ reducedMotion: reduced ? "reduce" : "no-preference" });
          await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
          await open3d(`&perf=1${fx}`);
          await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
          const k = `${reduced ? "immobile" : "vivante"}${fx ? "-sans-effets" : ""}`;
          await measure(`${k}-repos`, () => page.waitForTimeout(5000));
          await measure(`${k}-pan`, pan);
          if (process.env.PERF_SHOTS) await shot(`perf-${k}`);
        }
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
      writeFileSync(join(OUT, "perf.json"), `${JSON.stringify(perf, null, 2)}\n`);
      console.log(JSON.stringify(perf, null, 2));
    }
  }
  if (process.env.DUMP) {
    await page.reload();
    await page.waitForSelector("[data-map=empire]");
    await page.waitForTimeout(800);
    writeFileSync(process.env.DUMP, JSON.stringify(mapSeen, null, 2));
  }
} finally {
  await browser.close();
  server.stop();
}
if (faults.length) {
  console.error(faults.join("\n"));
  process.exit(1);
}
console.log("map3d: done");
