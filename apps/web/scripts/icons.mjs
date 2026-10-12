// Renders the app icons from their source, public/icons/icon.svg, sharp at every size.
// Run: npx -y -p playwright-core@1.49.1 node apps/web/scripts/icons.mjs
// (Chromium from PLAYWRIGHT_BROWSERS_PATH or CHROMIUM_PATH.)
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");
const icons = join(dirname(fileURLToPath(import.meta.url)), "../public/icons");
const source = readFileSync(join(icons, "icon.svg"), "utf8");

function chromiumPath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH ?? "/opt/pw-browsers";
  const dir = readdirSync(base).find((d) => /^chromium-\d/.test(d));
  return join(base, dir ?? "chromium", "chrome-linux/chrome");
}

// The emblem alone (no frame), shrunk into the safe zone of a maskable icon (80 %).
const maskable = source
  .replace(/<path d="M23 13[^>]*\/>/, "")
  .replace(
    /(<rect width="120" height="120"[^>]*\/>)/,
    '$1<g transform="translate(12 12) scale(0.8)">',
  )
  .replace(/<\/svg>\s*$/, "</g></svg>");

const outputs = [
  // iOS rounds the corners itself: full square, no transparency.
  { file: "apple-touch-icon.png", size: 180, svg: source, round: false },
  { file: "apple-touch-icon-1024.png", size: 1024, svg: source, round: false },
  { file: "icon-192.png", size: 192, svg: source, round: true },
  { file: "icon-512.png", size: 512, svg: source, round: true },
  { file: "icon-maskable-512.png", size: 512, svg: maskable, round: false },
];

const browser = await chromium.launch({ executablePath: chromiumPath(), args: ["--headless=new"] });
const page = await browser.newPage();
for (const o of outputs) {
  await page.setViewportSize({ width: o.size, height: o.size });
  const img = `data:image/svg+xml;base64,${Buffer.from(o.svg).toString("base64")}`;
  const radius = o.round ? `${o.size * 0.225}px` : "0";
  await page.setContent(
    `<body style="margin:0;background:transparent"><img src="${img}" style="display:block;width:${o.size}px;height:${o.size}px;border-radius:${radius}"></body>`,
  );
  await page.waitForTimeout(100);
  await page.screenshot({ path: join(icons, o.file), omitBackground: o.round });
  console.log(o.file, o.size);
}
await browser.close();
