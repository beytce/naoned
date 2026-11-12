// The challenge by the thread (docs/plan-hex-commerce.md H5), with two browsers: Ana and Ben found
// their houses on the same lagoon; Ana challenges Ben from his house's card; Ben is told and
// accepts; both are in the room of the Passe; two Passes are played (the pieces sent to the room
// as the screen would), each the thread once; back on the board, their cotes have moved.
// Needs the web built (pnpm --filter @comptoirs/web build): node e2e/defi.mjs
// Env: CHROMIUM (a Chromium or headless shell), SHOTS (a folder for the pictures).
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const here = dirname(fileURLToPath(import.meta.url));
const SHOTS = resolve(process.env.SHOTS ?? join(here, "..", "e2e-shots", "defi"));
const log = join(SHOTS, "server.log");
const BASE_DIR = join(SHOTS, "base");
rmSync(BASE_DIR, { recursive: true, force: true });
const port = 3100 + Math.floor(Math.random() * 800);
const fail = (why) => {
  console.error(`defi: ${why}`);
  process.exitCode = 1;
};

async function startServer() {
  const serverDir = join(here, "..", "..", "server");
  const url = `http://127.0.0.1:${port}`;
  mkdirSync(SHOTS, { recursive: true });
  writeFileSync(log, "");
  // The server is this process's own child (no runner in between): a signal stops it for real.
  // `--import tsx` is resolved from the server's folder, where tsx is installed.
  const child = spawn(process.execPath, ["--import", "tsx", "src/server.ts"], {
    cwd: serverDir,
    env: {
      ...process.env,
      LANG: "C.UTF-8",
      NODE_ENV: "test",
      DATABASE_URL: `pglite:${BASE_DIR}`,
      HOST: "127.0.0.1",
      PORT: String(port),
      APP_URL: url,
      WEB_DIST: join(here, "..", "dist"),
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
  return {
    url,
    stop: (signal = "SIGTERM") =>
      new Promise((done) => {
        if (child.exitCode !== null) return done();
        child.once("exit", () => done());
        child.kill(signal);
      }),
  };
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

/** A player signed in and its house founded, on the board. */
async function enter(browser, name, viewport) {
  const page = await browser.newPage({ viewport, locale: "fr-FR" });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  const tap = (q) => page.evaluate((s) => document.querySelector(s)?.click(), q);
  await page.goto(server.url);
  await page.waitForSelector("[data-planche-entree]", { state: "attached", timeout: 60_000 });
  const email = `${name.toLowerCase()}@example.org`;
  await page.fill("[data-entree-mail]", email, { force: true });
  await page.waitForSelector("[data-entree-ask]:not([disabled])", { state: "attached" });
  await tap("[data-entree-ask]");
  await page.waitForSelector("[data-entree-code]", { state: "attached", timeout: 60_000 });
  await page.goto(`${server.url}/connexion?token=${await magicLink(email)}`);
  await page
    .waitForSelector("[data-planche-fonder]", { state: "attached", timeout: 120_000 })
    .catch(async (e) => {
      await page.screenshot({ path: join(SHOTS, `defi-echec-${name}.png`) });
      writeFileSync(join(SHOTS, `defi-echec-${name}.html`), await page.content());
      throw e;
    });
  await page.fill("[data-fonder-name]", name, { force: true });
  await page.waitForSelector("[data-fonder-go]:not([disabled])", { state: "attached" });
  await tap("[data-fonder-go]");
  await page.waitForSelector("[data-planche-fonder]", { state: "detached", timeout: 60_000 });
  await page.waitForSelector('[data-house][data-mine="true"]', {
    state: "attached",
    timeout: 60_000,
  });
  return { page, errs, tap };
}

/** A picture of a player's screen, brought to the front first (a page behind is not drawn). */
async function shot(p, path) {
  await p.page.bringToFront();
  await p.page.waitForTimeout(1200);
  await p.page.screenshot({ path, timeout: 90_000 });
}

const board = (page) =>
  page.evaluate(async () => (await (await fetch("/api/planche")).json()).planche);

/** Plays one Passe of the room to its end, each side laying its first legal piece in turn. */
async function playRound(players, code) {
  for (let k = 0; k < 120; k++) {
    let moved = false;
    for (const p of players) {
      const r = await p.page.evaluate(async (c) => {
        const room = (await (await fetch(`/api/passe/room/${c}`)).json()).room;
        if (!room?.state || room.state.winner) return { over: !!room?.state?.winner };
        if (room.state.turn !== room.you) return { over: false };
        for (let at = 0; at < room.state.cells.length; at++) {
          if (room.state.cells[at] !== 0) continue;
          const res = await fetch(`/api/passe/room/${c}/play`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ at }),
          });
          if (res.ok) return { over: false, played: at };
        }
        return { over: false };
      }, code);
      if (r.over) return;
      if (r.played !== undefined) moved = true;
    }
    if (!moved) await players[0].page.waitForTimeout(300);
  }
  throw new Error("the Passe never ended");
}

const server = await startServer();
const browser = await chromium.launch({
  ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}),
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
try {
  const ana = await enter(browser, "Ana", { width: 1280, height: 800 });
  const ben = await enter(browser, "Ben", { width: 390, height: 844 });
  const anaBoard = await board(ana.page);
  const benBoard = await board(ben.page);
  if (anaBoard.lagoon !== benBoard.lagoon) fail("Ana and Ben are not on the same lagoon");
  const benHouse = benBoard.me;
  // Ana reads the board again (Ben is now a player of it), and opens Ben's house.
  await ana.page.reload();
  await ana.page.waitForSelector(`[data-house="${benHouse}"]`, {
    state: "attached",
    timeout: 60_000,
  });
  await ana.tap(`[data-house="${benHouse}"]`);
  await ana.page.waitForSelector(`[data-defi="${benHouse}"]`, {
    state: "attached",
    timeout: 30_000,
  });
  await ana.page.waitForTimeout(1500);
  await shot(ana, join(SHOTS, "defi-1-maison.png"));
  await ana.tap(`[data-defi="${benHouse}"]`);
  // Ben is told (by the live push, or his next read).
  await ben.page.waitForSelector("[data-defi-incoming]", { state: "attached", timeout: 60_000 });
  await ben.page.waitForTimeout(1500);
  await shot(ben, join(SHOTS, "defi-2-recu.png"));
  await ben.tap("[data-defi-accept]");
  for (const p of [ana, ben])
    await p.page.waitForSelector("[data-passe-lab]", { state: "attached", timeout: 60_000 });
  const code = (await board(ana.page)).defi?.room;
  if (!code) fail("no room for the challenge");
  await ana.page.waitForTimeout(2500);
  await shot(ana, join(SHOTS, "defi-3-passe-ana.png"));
  await shot(ben, join(SHOTS, "defi-3-passe-ben.png"));
  await playRound([ana, ben], code);
  for (const p of [ana, ben])
    await p.page.waitForSelector("[data-passe-end]", { state: "attached", timeout: 30_000 });
  await ben.page.waitForTimeout(1000);
  await shot(ben, join(SHOTS, "defi-4-premiere.png"));
  // The second Passe, the sides swapped.
  for (const p of [ana, ben]) await p.tap("[data-passe-end] .pc-passe-go");
  for (let i = 0; i < 40; i++) {
    const r = await ana.page.evaluate(
      async (c) => (await (await fetch(`/api/passe/room/${c}`)).json()).room?.round,
      code,
    );
    if (r === 2) break;
    await ana.page.waitForTimeout(500);
  }
  await playRound([ana, ben], code);
  // A page behind reads its room once a minute: Ana's is brought to the front.
  await ana.page.bringToFront();
  await ana.page.waitForSelector("[data-passe-end] [data-defi-back].pc-passe-go", {
    state: "attached",
    timeout: 120_000,
  });
  await ana.page.waitForTimeout(1000);
  await shot(ana, join(SHOTS, "defi-5-seconde.png"));
  for (const p of [ana, ben]) {
    await p.page.bringToFront();
    await p.tap("[data-defi-back]");
  }
  for (const p of [ana, ben])
    await p.page.waitForSelector("[data-planche-lab]", { state: "attached", timeout: 60_000 });
  await ana.page.waitForTimeout(1500);
  const after = await board(ana.page);
  const cotes = [after.me, benHouse].map((h) => after.state.houses[h].rank.cote);
  if (cotes[0] + cotes[1] !== 2400 || cotes[0] === 1200)
    fail(`the cotes after the challenge are ${cotes.join(" and ")}`);
  await shot(ana, join(SHOTS, "defi-6-retour.png"));
  for (const p of [ana, ben]) if (p.errs.length) fail(`page errors: ${p.errs.join(" | ")}`);
} finally {
  await browser.close();
  await server.stop();
}
