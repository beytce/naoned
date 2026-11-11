// Renders the app icons from the logo (docs/audit-visuel-2026-11-11): brand/fondaco.svg, the red
// arch on its porcelain tile, and brand/fondaco-16.svg, the white arch on red for the browser's tab.
// Run: npx -y -p playwright-core@1.49.1 node apps/web/scripts/icons.mjs
// (Chromium from PLAYWRIGHT_BROWSERS_PATH or CHROMIUM_PATH.)
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");
const web = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = (f) => readFileSync(join(web, "brand", f)).toString("base64");
const TILE = svg("fondaco.svg");
const SMALL = svg("fondaco-16.svg");
/** The notification badge: a silhouette, white on nothing (Android keeps its alpha only). */
const BADGE = svg("fondaco-badge.svg");

/** The ground around the mark: the porcelain of the board. */
const GROUND = "#EEEBE5";

function chromiumPath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH ?? "/opt/pw-browsers";
  const dir = readdirSync(base).find((d) => /^chromium-\d/.test(d));
  return join(base, dir ?? "chromium", "chrome-linux/chrome");
}

const outputs = [
  // iOS rounds the corners itself: full square, no transparency.
  { file: "public/icons/apple-touch-icon.png", size: 180, scale: 0.78 },
  { file: "public/icons/apple-touch-icon-1024.png", size: 1024, scale: 0.78 },
  // Android and the browsers: the tile alone, transparent outside.
  { file: "public/icons/icon-192.png", size: 192, scale: 1, clear: true },
  { file: "public/icons/icon-512.png", size: 512, scale: 1, clear: true },
  // Maskable: the mark within the safe zone (80 %) on the porcelain.
  { file: "public/icons/icon-maskable-512.png", size: 512, scale: 0.62 },
  // The browser's tab: the white arch on red, readable at 16 px.
  { file: "public/favicon.png", size: 64, scale: 1, clear: true, small: true },
  { file: "public/icons/badge-96.png", size: 96, scale: 1, clear: true, badge: true },
  // The logo shown in the game where an image is needed (sharing, e-mails).
  { file: "public/icons/logo-256.webp", size: 256, scale: 1, clear: true, type: "image/webp" },
];

const browser = await chromium.launch({ executablePath: chromiumPath(), args: ["--headless=new"] });
const page = await browser.newPage();
await page.setContent("<body></body>");
for (const o of outputs) {
  const data = await page.evaluate(
    async ({ src, o, ground }) => {
      const img = new Image();
      img.src = `data:image/svg+xml;base64,${src}`;
      await img.decode();
      const s = o.size;
      const c = document.createElement("canvas");
      c.width = s;
      c.height = s;
      const g = c.getContext("2d");
      g.imageSmoothingQuality = "high";
      if (!o.clear) {
        g.fillStyle = ground;
        g.fillRect(0, 0, s, s);
      }
      const w = s * o.scale;
      g.drawImage(img, (s - w) / 2, (s - w) / 2, w, w);
      return c.toDataURL(o.type ?? "image/png", 0.92);
    },
    { src: o.badge ? BADGE : o.small ? SMALL : TILE, o, ground: GROUND },
  );
  writeFileSync(join(web, o.file), Buffer.from(data.split(",")[1], "base64"));
  console.log(o.file, o.size);
}
await browser.close();
