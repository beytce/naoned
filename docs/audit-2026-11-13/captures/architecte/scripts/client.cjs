const { chromium } = require("/home/user/naoned/apps/web/node_modules/playwright-core");
const fs = require("fs");
const W = process.env.W; const C = JSON.parse(fs.readFileSync(W + "/cookies.json"));
const OUT = "/home/user/naoned/docs/audit-2026-11-13/captures/architecte";
const until = async (page, f, ms = 120000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await page.evaluate(f).catch(() => false)) return Date.now() - t; await page.waitForTimeout(250); } return -1; };
(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-precise-memory-info"] });
  for (const [label, vp] of [["phone", { width: 390, height: 844 }], ["desktop", { width: 1280, height: 800 }]]) {
    const ctx = await browser.newContext({ viewport: vp, locale: "fr-FR", deviceScaleFactor: 1, serviceWorkers: "block" });
    const [k, v] = C[0].cookie.split("=");
    await ctx.addCookies([{ name: k, value: v, url: "http://127.0.0.1:3699" }]);
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Performance.enable");
    let bytes = 0, reqs = 0; const api = {};
    page.on("response", async (r) => { reqs++; try { const h = await r.headerValue("content-length"); const b = h ? +h : (await r.body()).length; bytes += b; const u = new URL(r.url()).pathname; if (u.startsWith("/api/")) api[u] = (api[u] ?? 0) + 1; } catch {} });
    const t0 = Date.now();
    await page.goto("http://127.0.0.1:3699/", { waitUntil: "load", timeout: 120000 });
    const tLoad = Date.now() - t0;
    const tCanvas = await until(page, () => !!document.querySelector("canvas"));
    if (await page.$("[data-fonder-go]")) { await page.click("[data-fonder-go]"); }
    const tIn = await until(page, () => !document.querySelector("[data-fonder-go]") && !!document.querySelector("canvas"));
    await page.waitForTimeout(8000);
    await page.waitForTimeout(3000);
    const loadBytes = bytes, loadReqs = reqs;
    // long tasks and frames over 20 s idle on the board
    await page.evaluate(() => { window.__lt = []; new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push(e.duration))).observe({ type: "longtask", buffered: false }); window.__fr = 0; const f = () => { window.__fr++; requestAnimationFrame(f); }; requestAnimationFrame(f); });
    const m0 = await cdp.send("Performance.getMetrics");
    for (const key of Object.keys(api)) delete api[key];
    await page.waitForTimeout(20000);
    const m1 = await cdp.send("Performance.getMetrics");
    const g = (m, n) => m.metrics.find((x) => x.name === n)?.value ?? 0;
    const res = await page.evaluate(() => ({ frames: window.__fr, longTasks: window.__lt.length, longMs: Math.round(window.__lt.reduce((a, b) => a + b, 0)), heapMB: +(performance.memory.usedJSHeapSize / 1e6).toFixed(1), domNodes: document.getElementsByTagName("*").length, canvases: document.querySelectorAll("canvas").length }));
    console.log(label, JSON.stringify({ tLoad, tCanvas, tIn, loadMB: +(loadBytes / 1e6).toFixed(2), loadReqs, idle20s: { ...res, fps: +(res.frames / 20).toFixed(1), scriptS: +(g(m1, "ScriptDuration") - g(m0, "ScriptDuration")).toFixed(2), layoutS: +(g(m1, "LayoutDuration") - g(m0, "LayoutDuration")).toFixed(2), taskS: +(g(m1, "TaskDuration") - g(m0, "TaskDuration")).toFixed(2), apiCalls: api } }));
    await page.screenshot({ path: `${OUT}/01-planche-${label}.png`, timeout: 120000 });
    await ctx.close();
  }
  await browser.close();
})();
