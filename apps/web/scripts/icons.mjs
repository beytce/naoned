// Renders the app icons and the logo used in the game from the official logo, brand/logo.webp
// (1024 px, square: the gold medal of the winged lion on its dark ground, edge to edge).
// Run: npx -y -p playwright-core@1.49.1 node apps/web/scripts/icons.mjs
// (Chromium from PLAYWRIGHT_BROWSERS_PATH or CHROMIUM_PATH.)
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");
const web = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(join(web, "brand/logo.webp")).toString("base64");

/** The logo's ground, around a shrunk logo: the source's own dark olive. */
const BROWN = "#16140C";
/** The source is a full square: no corners of its own to cut away. */
const SOURCE_RADIUS = 0;
const SOURCE_INSET = 0;

function chromiumPath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH ?? "/opt/pw-browsers";
  const dir = readdirSync(base).find((d) => /^chromium-\d/.test(d));
  return join(base, dir ?? "chromium", "chrome-linux/chrome");
}

const outputs = [
  // iOS rounds the corners itself: full square, no transparency.
  { file: "public/icons/apple-touch-icon.png", size: 180 },
  { file: "public/icons/apple-touch-icon-1024.png", size: 1024 },
  // Android and the browsers: rounded, transparent outside.
  { file: "public/icons/icon-192.png", size: 192, round: 0.225 },
  { file: "public/icons/icon-512.png", size: 512, round: 0.225 },
  // Maskable: the logo within the safe zone (80 %) on its brown.
  { file: "public/icons/icon-maskable-512.png", size: 512, scale: 0.8 },
  { file: "public/favicon.png", size: 64, round: 0.18 },
  // The logo shown in the game (sign-in, side bar, loading).
  { file: "public/icons/logo-256.webp", size: 256, round: 0.225, type: "image/webp" },
];

const browser = await chromium.launch({ executablePath: chromiumPath(), args: ["--headless=new"] });
const page = await browser.newPage();
await page.setContent("<body></body>");
for (const o of outputs) {
  const data = await page.evaluate(
    async ({ src, o, brown, radius, inset }) => {
      const img = new Image();
      img.src = `data:image/webp;base64,${src}`;
      await img.decode();
      const s = o.size;
      const c = document.createElement("canvas");
      c.width = s;
      c.height = s;
      const g = c.getContext("2d");
      g.imageSmoothingQuality = "high";
      if (o.round) {
        g.beginPath();
        g.roundRect(0, 0, s, s, s * o.round);
        g.clip();
      }
      g.fillStyle = brown;
      g.fillRect(0, 0, s, s);
      const k = o.scale ?? 1;
      const w = s * k;
      const at = (s - w) / 2;
      // The source inside its own rounded corners: its white corners are left out.
      g.save();
      g.beginPath();
      const i = w * inset;
      g.roundRect(at + i, at + i, w - 2 * i, w - 2 * i, w * radius);
      g.clip();
      g.drawImage(img, at, at, w, w);
      g.restore();
      return c.toDataURL(o.type ?? "image/png", 0.9);
    },
    { src: source, o, brown: BROWN, radius: SOURCE_RADIUS, inset: SOURCE_INSET },
  );
  writeFileSync(join(web, o.file), Buffer.from(data.split(",")[1], "base64"));
  console.log(o.file, o.size);
}
await browser.close();
