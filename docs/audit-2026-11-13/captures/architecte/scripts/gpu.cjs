const { chromium } = require("/home/user/naoned/apps/web/node_modules/playwright-core");
const http = require("http"); const fs = require("fs"); const W = process.env.W; const C = JSON.parse(fs.readFileSync(W + "/cookies.json"));
const post = (p, path, body) => new Promise((res) => { const d = JSON.stringify(body); const r = http.request({ host: "127.0.0.1", port: 3699, path, method: "POST", localAddress: p.ip, headers: { "content-type": "application/json", cookie: p.cookie } }, (s) => { s.resume(); s.on("end", () => res(s.statusCode)); }); r.on("error", () => res(0)); r.write(d); r.end(); });
(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR", serviceWorkers: "block" });
  await ctx.addInitScript(() => {
    window.__gl = { buf: 0, del: 0, tex: 0, deltex: 0, draws: 0 };
    for (const P of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
      const de = P.drawElements, da = P.drawArrays; P.drawElements = function (...a) { window.__gl.draws++; return de.apply(this, a); }; P.drawArrays = function (...a) { window.__gl.draws++; return da.apply(this, a); };
      const cb = P.createBuffer, db = P.deleteBuffer, ct = P.createTexture, dt = P.deleteTexture;
      P.createBuffer = function () { window.__gl.buf++; return cb.call(this); };
      P.deleteBuffer = function (b) { window.__gl.del++; return db.call(this, b); };
      P.createTexture = function () { window.__gl.tex++; return ct.call(this); };
      P.deleteTexture = function (b) { window.__gl.deltex++; return dt.call(this, b); };
    }
  });
  const [k, v] = C[2].cookie.split("="); await ctx.addCookies([{ name: k, value: v, url: "http://127.0.0.1:3699" }]);
  const page = await ctx.newPage();
  await page.goto("http://127.0.0.1:3699/", { timeout: 120000 });
  for (let i = 0; i < 120; i++) { if (await page.$("[data-fonder-go]")) { await page.click("[data-fonder-go]", { timeout: 3000 }).catch(() => {}); } if (await page.$("[data-gate=in] canvas")) break; await page.waitForTimeout(500); }
  await page.waitForTimeout(8000);
  const f0 = await page.evaluate(() => new Promise((r) => { const d0 = window.__gl.draws; let n = 0; const f = () => { if (++n === 4) r((window.__gl.draws - d0) / 3); else requestAnimationFrame(f); }; requestAnimationFrame(() => { requestAnimationFrame(f); }); }));
  console.log('draw calls per frame ~', f0);
  const live = await page.evaluate(() => document.querySelector("[data-planche-lab]")?.getAttribute("data-live"));
  const a = await page.evaluate(() => ({ ...window.__gl }));
  // 20 gestures by other players of the lagoon (thread/unthread at the Rialto)
  for (let i = 0; i < 10; i++) { const p = C[10 + i]; await post(p, "/api/planche/thread", { city: "rialto", good: "sand" }); await page.waitForTimeout(1500); }
  await page.waitForTimeout(6000);
  const b = await page.evaluate(() => ({ ...window.__gl }));
  console.log("live", live, "before", JSON.stringify(a), "after 10 threads by others", JSON.stringify(b), "live buffers +", (b.buf - b.del) - (a.buf - a.del), "live textures +", (b.tex - b.deltex) - (a.tex - a.deltex));
  await browser.close();
})();
