import { chromium } from "playwright";
const [, , name, device = "desk", ...steps] = process.argv;
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell",
});
const opts =
  device === "mob"
    ? {
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      }
    : {
        viewport: { width: +(process.env.W ?? 1280), height: +(process.env.H ?? 800) },
        deviceScaleFactor: 2,
      };
const ctx = await b.newContext({ ...opts, storageState: "state.json" });
const p = await ctx.newPage();
if (process.env.MOCK) await (await import("./mock.mjs")).install(p);
p.on("pageerror", (e) => console.log("PAGEERR", e.message));
await p.goto("http://localhost:5173/");
await p.waitForTimeout(2500);
for (const s of steps) {
  try {
    if (s.startsWith("sel=")) await p.locator(s.slice(4)).first().click({ timeout: 3000 });
    else if (s.startsWith("wait=")) await p.waitForTimeout(+s.slice(5));
    else if (s.startsWith("aria="))
      await p.getByLabel(s.slice(5), { exact: true }).first().click({ timeout: 3000 });
    else if (s.startsWith("~")) await p.getByText(s.slice(1)).first().click({ timeout: 3000 });
    else await p.getByText(s, { exact: true }).first().click({ timeout: 3000 });
  } catch (e) {
    console.log("miss", s);
  }
  await p.waitForTimeout(900);
}
await p.screenshot({ path: `shots/${name}.png` });
if (process.env.TEXT) console.log((await p.innerText("body")).slice(0, 1200));
await p.unrouteAll({ behavior: "ignoreErrors" });
await b.close();
