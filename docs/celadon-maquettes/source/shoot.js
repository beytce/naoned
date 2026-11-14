const { chromium } = require("playwright");
(async () => {
  const jobs = process.argv.slice(2).map((a) => { const [name, qs, size = "1280x800"] = a.split("@"); const [w, h] = size.split("x").map(Number); return { name, qs, w, h }; });
  const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  for (const j of jobs) {
    const p = await b.newPage({ viewport: { width: j.w, height: j.h }, deviceScaleFactor: 2 });
    p.on("pageerror", (e) => console.log("ERR", j.name, e.message)); p.on("console", (m) => { if (m.type() === "error") console.log("console", m.text()); });
    await p.goto(`http://localhost:8765/index.html?${j.qs}`);
    await p.waitForFunction(() => document.body.dataset.ready === "1", null, { timeout: 120000 }).catch((e) => console.log("timeout", j.name));
    await p.waitForTimeout(400);
    await p.screenshot({ path: `out/${j.name}.png` });
    await p.close(); console.log("ok", j.name);
  }
  await b.close();
})();
