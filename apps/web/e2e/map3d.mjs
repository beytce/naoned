// The 3D map prototype (?map=3d), on a phone, against a server on an empty database in memory
// that opens the empire's world (WORLD_KIND=empire):
//   pnpm --filter @comptoirs/web build && pnpm --filter @comptoirs/web e2e:map3d
// Shots and the video in OUT (docs/direction-artistique-2026-11/carte-3d by default); PERF=1 also
// measures the frames with the CPU slowed four times (perf.json); DUMP=<file> writes the map seen.
import { spawn, spawnSync } from "node:child_process";
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
      // The long voyages (five minutes and more) quickened for the journey: a second a unit, a
      // hop to Padua in some thirty seconds (development only, refused in production).
      // More ducats at the start: the orders of two towns bought at the market, to deliver them.
      WORLD_SETTINGS_OVERRIDE: JSON.stringify({
        empire: { moves: { secondsPerUnit: 1 }, start: { capitalDucats: 5_000 } },
      }),
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

const poseFaults = [];

/** A house founded, its first fondaco put down (as in e2e/empire.mjs), on the 3D board. */
async function found(page, url) {
  const email = `map3d_${Date.now()}@example.org`;
  await page.goto(url);
  await page.fill("input[type=email]", email);
  await page.keyboard.press("Enter");
  // On the 3D board from the first page (the flag is read when the game loads).
  await page.goto(`${url}/connexion?token=${await magicLink(email)}&map=3d`);
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
  await page.waitForSelector("[data-map=empire] canvas", { timeout: 20_000 });
  // A touch anywhere in the sector: the point comes from the camera's ray to the 3D ground, then
  // to the free small tile nearest it (3 November, the small tiles), the one where the first
  // fondaco waits (its mark's point).
  const cell = page.locator("[data-cell]").first();
  const box = await cell.boundingBox();
  const at = box ? { x: box.x + box.width * 0.5, y: box.y + box.height * 0.8 } : null;
  const waits = (await page.locator("[data-home]").getAttribute("data-at"))?.split(",").map(Number);
  let sent = null;
  page.on("request", (r) => {
    if (r.method() !== "POST" || !r.url().includes("/api/empire")) return;
    const body = r.postDataJSON?.();
    if (body?.type === "empirePlaceHome") sent = body;
  });
  if (at) await page.mouse.click(at.x, at.y);
  await page.getByRole("button", { name: /poser ici · gratuit/i }).click();
  await page.waitForTimeout(500);
  if (!sent || !waits || sent.x !== waits[0] || sent.y !== waits[1])
    poseFaults.push(
      `the fondaco put down at ${JSON.stringify(sent)}, not on its free tile ${waits}`,
    );
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
  if (process.env.DEBUG) page.on("console", (m) => console.log(`[${m.type()}] ${m.text()}`));
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
  /** A touch at a mark's middle: on the 3D board, it reaches the place through the scene. */
  const tapOn = async (sel) => {
    const b = await page.locator(`[data-map=empire] ${sel}`).first().boundingBox();
    if (!b) throw new Error(`no ${sel} on the map`);
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  };
  faults.push(...poseFaults);
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
    // 1. The start: the house's sector across the screen, as the game opens it, on the 3D board.
    await open3d();
    if ((await page.locator("[data-map=empire] [data-plateau]").count()) !== 0)
      faults.push("the SVG board drawn under the 3D one");
    for (const code of ["venezia", "padova"])
      if ((await page.locator(`[data-map=empire] [data-city=${code}]`).count()) !== 1)
        faults.push(`${code} without its mark on the 3D map`);
    await shot("1-depart");
    // A town touched on the board (its hexagon, by a ray): its panel at the foot.
    await tapOn("[data-city=padova]");
    await page
      .locator("[data-bottom-slot='panel:city']")
      .waitFor({ timeout: 5_000 })
      .catch(() => {
        faults.push("Padua touched through the 3D board: no city panel");
      });
    await shot("1b-padoue");
    // Closed: nothing chosen, the round buttons back.
    await page.keyboard.press("Escape");
    await page
      .locator("[data-bottom-slot='idle']")
      .waitFor({ timeout: 5_000 })
      .catch(() => {
        faults.push("the city panel closed: the round buttons not back");
      });
    // 2. The fondaco touched on the board: the camera plunges into its domain, its workshops on
    // the tiles around it; its Casa touched, the Casa's panel.
    await tapOn("[data-home]");
    await page
      .locator("[data-domain-layer] [data-workshop]")
      .first()
      .waitFor({ timeout: 5_000 })
      .catch(() => faults.push("the fondaco touched through the 3D board: no workshops"));
    await page.waitForTimeout(1500);
    await shot("2-fondaco");
    await page.locator("[data-domain-casa]").click();
    await page
      .locator("[data-bottom-slot='panel:casa']")
      .waitFor({ timeout: 5_000 })
      .catch(() => {
        faults.push("the fondaco touched again: no panel of the Casa");
      });
    await shot("2b-fondaco-touche");
    await page.keyboard.press("Escape");
    // Out of the domain (Échap again): the map's marks back.
    await page.keyboard.press("Escape");
    await page
      .locator("[data-map=empire]:not([data-domain])")
      .waitFor({ timeout: 5_000 })
      .catch(() => faults.push("Échap does not leave the domain"));
    /**
     * « Livrer » from a town (decision of the owner, 3 November): its orders bought at the market,
     * the town touched, its gold button; the vehicle's token touched, the camera after it. Returns
     * the vehicle's id.
     */
    const send = async (pg, code) => {
      const wants = await pg.evaluate(async (c) => {
        const v = await (await fetch("/api/empire", { credentials: "same-origin" })).json();
        return (v.view?.orders.find((o) => o.city === c)?.orders ?? []).map((o) => ({
          good: o.good,
          qty: o.qty,
        }));
      }, code);
      if (wants.length === 0) throw new Error(`no order at ${code}`);
      for (const w of wants)
        await pg.evaluate(
          (a) =>
            fetch("/api/empire/actions", {
              method: "POST",
              credentials: "same-origin",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ type: "empireBuy", good: a.good, qty: a.qty }),
            }),
          w,
        );
      // The view brought up to date (the page again, its 3D board in), then the town touched.
      await pg.reload();
      await pg.locator("[data-map=empire][data-three]").waitFor({ timeout: 60_000 });
      await pg.waitForTimeout(1_200);
      const town = await pg.locator(`[data-map=empire] [data-city=${code}]`).first().boundingBox();
      if (!town) throw new Error(`no ${code} on the map`);
      await pg.mouse.click(town.x + town.width / 2, town.y + town.height / 2);
      const button = pg.locator(`[data-orders-panel=${code}] [data-deliver] button`);
      await button.waitFor({ timeout: 10_000 });
      await button.click();
      const token = pg.locator("[data-trip]").first();
      await token.waitFor({ timeout: 5_000 });
      await token.click();
      return token.getAttribute("data-trip");
    };
    // 3. A mule sent to Padua: it walks there on the board, no medal above it. The workshops
    // folded first (Recentrer), the camera a little nearer.
    await page.getByRole("button", { name: /recentrer/i }).click();
    await page.waitForTimeout(900);
    await page.waitForTimeout(800);
    await send(page, "padova");
    // Up close (as near as a small tile across the screen), the camera after the mule chosen.
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press("+");
      await page.waitForTimeout(400);
    }
    await page.waitForTimeout(2500);
    await shot("3-mule");
    if ((await page.locator("[data-map=empire] canvas").count()) !== 1)
      faults.push("the 3D board lost while a mule walks");
    await page.keyboard.press("Escape");
    // 4. A sector bought next to Venice's (the first of Veneto's the Casa 1 may buy): seven tiles
    // more on the board, the glass of the unknown giving way.
    let bought = false;
    for (const cell of ["2,3", "1,4", "1,5", "3,4", "3,3"]) {
      const edge = page.locator(`[data-buyable="${cell}"]`);
      if ((await edge.count()) === 0) continue;
      await edge.dispatchEvent("click");
      await page
        .locator("[data-action-panel=sector]")
        .waitFor({ timeout: 3_000 })
        .catch(() => {});
      const buy = page.locator("[data-map-action=unlock]:not([disabled])");
      if ((await buy.count()) > 0) {
        await buy.first().click();
        bought = true;
        break;
      }
      await page.keyboard.press("Escape");
    }
    if (!bought) faults.push("no sector of Veneto to buy next to Venice's");
    await page.waitForTimeout(3000);
    await page.keyboard.press("Escape");
    // Recentrer: the camera leaves the mule it followed, out over the house's sectors.
    await page.getByRole("button", { name: /recentrer/i }).click();
    await page.waitForTimeout(1800);
    await shot("4b-secteur");
    // Out, as far as the map goes: the whole house's map on the board.
    for (let i = 0; i < 6; i++) await page.keyboard.press("-");
    await page.waitForTimeout(1500);
    await shot("4-dezoom");

    // Every vehicle at rest before the video (the mule sent to Padua arrives).
    if ((await page.locator("[data-vehicle]").count()) > 0)
      faults.push("a vehicle's medal on the 3D board");
    await page
      .locator("[data-trip]")
      .first()
      .waitFor({ state: "detached", timeout: 150_000 })
      .catch(() => faults.push("a vehicle still under way (there and back) after 150 s"));
    // The video: a mule sent to Venice, 13 s from its leaving (the recording cut by ffmpeg).
    const rec = await browser.newContext({
      viewport: { width: W, height: H },
      locale: "fr-FR",
      storageState: await ctx.storageState(),
      recordVideo: { dir: join(OUT, "video-tmp"), size: { width: W, height: H } },
    });
    const t0 = Date.now();
    const vp = await rec.newPage();
    await open3d("", vp);
    await vp.waitForTimeout(800);

    // A hop of some thirty seconds (a second a unit in the journey): the mule walks all along,
    // the film from its leaving (the wait before it, if any, cut).
    await send(vp, "venezia");
    for (let i = 0; i < 4; i++) {
      await vp.keyboard.press("+");
      await vp.waitForTimeout(400);
    }
    const tGo = Date.now();
    await vp.waitForTimeout(13_000);
    const video = vp.video();
    await rec.close();
    if (video) {
      const raw = await video.path();
      const from = Math.max(0, (tGo - t0) / 1000 - 0.3);
      const cut = spawnSync("ffmpeg", [
        "-y",
        "-loglevel",
        "error",
        "-ss",
        from.toFixed(2),
        "-i",
        raw,
        "-t",
        "13",
        "-c:v",
        "libvpx",
        "-b:v",
        "1500k",
        "-an",
        join(OUT, "mule.webm"),
      ]);
      if (cut.status !== 0) renameSync(raw, join(OUT, "mule.webm"));
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
