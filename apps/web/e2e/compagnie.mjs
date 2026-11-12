// The company (docs/plan-compagnie.md K5), with two browsers: Ana founds « La Tana » (a name, a
// flag) and writes in its thread; Ben comes by the link of the invitation, signs in, founds his
// house and is a member at once, seated in Ana's lagoon; he answers; he greets Ana, who is told;
// Ana lays a sign on a tower. The company's flag shows on both houses.
// Needs the web built (pnpm --filter @comptoirs/web build): node e2e/compagnie.mjs
// Env: CHROMIUM (a Chromium or headless shell), SHOTS (a folder for the pictures).
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const here = dirname(fileURLToPath(import.meta.url));
const SHOTS = resolve(process.env.SHOTS ?? join(here, "..", "e2e-shots", "compagnie"));
const log = join(SHOTS, "server.log");
const BASE_DIR = join(SHOTS, "base");
rmSync(BASE_DIR, { recursive: true, force: true });
const port = 3100 + Math.floor(Math.random() * 800);
const fail = (why) => {
  console.error(`compagnie: ${why}`);
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
    const token = at >= 0 ? text.slice(at).match(/token=([\w-]{43})/)?.[1] : undefined;
    if (token) return token;
  }
  throw new Error("no magic link in the server's log");
}

/** A player signed in and its house founded, on the board (from `path`: an invitation's link). */
async function enter(browser, name, viewport, path = "/") {
  const page = await browser.newPage({ viewport, locale: "fr-FR" });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  const tap = (q) => page.evaluate((s) => document.querySelector(s)?.click(), q);
  /** Waits by asking the page (Playwright's wait stalls while WebGL draws slowly). */
  const until = async (q, ms = 60_000) => {
    for (let i = 0; i < ms / 250; i++) {
      if (await page.$(q)) return;
      await page.waitForTimeout(250);
    }
    await page.screenshot({ path: join(SHOTS, `compagnie-${name}-echec.png`) });
    throw new Error(`${name}: no ${q} after ${ms} ms`);
  };
  await page.goto(`${server.url}${path}`);
  await until("[data-planche-entree]");
  const email = `${name.toLowerCase()}@example.org`;
  await page.fill("[data-entree-mail]", email, { force: true });
  await until("[data-entree-ask]:not([disabled])");
  await tap("[data-entree-ask]");
  await until("[data-entree-code]");
  await page.goto(`${server.url}/connexion?token=${await magicLink(email)}`);
  await until("[data-planche-fonder]", 120_000);
  await page.fill("[data-fonder-name]", name, { force: true });
  await until("[data-fonder-go]:not([disabled])");
  await tap("[data-fonder-go]");
  await until('[data-house][data-mine="true"]');
  return { page, errs, tap, until, name };
}

async function shot(p, path) {
  await p.page.bringToFront();
  await p.page.waitForTimeout(1200);
  await p.page.screenshot({ path, timeout: 90_000 });
}
const api = (p, path, body) =>
  p.page.evaluate(
    async ([u, b]) =>
      (
        await fetch(
          u,
          b === undefined
            ? {}
            : {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(b),
              },
        )
      ).json(),
    [path, body],
  );

const server = await startServer();
const browser = await chromium.launch({
  ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}),
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
try {
  const ana = await enter(browser, "Ana", { width: 390, height: 844 });
  // Ana founds the company: a name, a colour, a charge.
  await ana.tap("[data-compagnie-open]");
  await ana.until("[data-compagnie-found]");
  await ana.page.fill("[data-compagnie-name]", "La Tana", { force: true });
  await ana.tap('.pc-co-found .pc-in-colors button[aria-label="Ocre"]');
  await ana.tap('.pc-co-charges button[aria-label="Ancre"]');
  await ana.page.waitForTimeout(400);
  await shot(ana, join(SHOTS, "compagnie-1-fonder.png"));
  await ana.until("[data-compagnie-go]:not([disabled])");
  await ana.tap("[data-compagnie-go]");
  await ana.until("[data-compagnie-thread]");
  await ana.page.fill("[data-compagnie-input]", "Bienvenue à la Tana !", { force: true });
  await ana.until("[data-compagnie-send]:not([disabled])");
  await ana.tap("[data-compagnie-send]");
  await ana.until('[data-compagnie-thread] li[data-mine="true"]');
  const code = (await api(ana, "/api/planche/compagnie")).compagnie.code;
  await shot(ana, join(SHOTS, "compagnie-2-fondee.png"));
  // Ben, by the link: a member as soon as his house is founded, in Ana's lagoon.
  const ben = await enter(browser, "Ben", { width: 1280, height: 800 }, `/?co=${code}`);
  const bc = (await api(ben, "/api/planche/compagnie")).compagnie;
  if (bc?.name !== "La Tana") fail(`Ben's company is ${JSON.stringify(bc?.name)}`);
  if (bc && bc.members[0]?.world !== bc.members[1]?.world) fail("Ben is not in Ana's lagoon");
  await ben.tap("[data-compagnie-open]");
  await ben.until("[data-compagnie-thread] li");
  await ben.page.fill("[data-compagnie-input]", "Merci, je prends la bouche demain.", {
    force: true,
  });
  await ben.until("[data-compagnie-send]:not([disabled])");
  await ben.tap("[data-compagnie-send]");
  await ben.until('[data-compagnie-thread] li[data-mine="true"]');
  await shot(ben, join(SHOTS, "compagnie-3-discussion.png"));
  // Ben greets Ana from her house's card.
  const anaHouse = bc?.members.find((m) => !m.me)?.house;
  await ben.tap("[data-planche-card] .pc-pl-x");
  await ben.page.reload();
  await ben.until(`[data-house="${anaHouse}"]`);
  await ben.tap(`[data-house="${anaHouse}"]`);
  await ben.until("[data-greet-salut]");
  if (!(await ben.page.$(`[data-house="${anaHouse}"] [data-house-compagnie]`)))
    fail("no company flag on Ana's house");
  await shot(ben, join(SHOTS, "compagnie-4-maison.png"));
  await ben.tap("[data-greet-salut]");
  // Ana is told; she lays a sign on a tower.
  await ana.page.reload();
  await ana.until('[data-house][data-mine="true"]');
  for (let i = 0; i < 40; i++) {
    const news = (await ana.page.textContent(".pc-planche-news").catch(() => "")) ?? "";
    if (news.includes("salue")) break;
    await ana.page.waitForTimeout(500);
  }
  if (!((await ana.page.textContent(".pc-planche-news")) ?? "").includes("salue"))
    fail("Ana is not told of the greeting");
  await shot(ana, join(SHOTS, "compagnie-5-salut.png"));
  await ana.tap('[data-passage="canal-1"]');
  await ana.until("[data-sign-tour]");
  await ana.tap("[data-sign-tour]");
  await ana.until(".pc-co-said");
  await shot(ana, join(SHOTS, "compagnie-6-signe.png"));
  for (const p of [ana, ben])
    if (p.errs.length) fail(`page errors (${p.name}): ${p.errs.join(" | ")}`);
} finally {
  await browser.close();
  await server.stop();
}
