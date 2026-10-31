// Turns the generated illustrations dropped in apps/web/art-src/<family>/<name>.<ext> into what
// the game serves (docs/commandes-images.md): each raster image in webp at 1× and 2× in
// public/art/<family>/, each SVG copied, and src/art/raster.ts listing them, so the game asks
// only for an image that exists and keeps its drawing for the others.
// Run: node apps/web/scripts/art.mjs (or npx -y -p playwright-core@1.49.1 node …)
// (Chromium from PLAYWRIGHT_BROWSERS_PATH or CHROMIUM_PATH.)
import { execSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const web = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(web, "art-src");
const out = join(web, "public/art");

/** The width shown at 1× (CSS px) of each family; the 2× file doubles it. */
const WIDTH = { buildings: 240, ships: 320, regions: 640, casa: 320, people: 160, world: 1280 };
const RASTER = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const MIME = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

function chromiumPath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH ?? "/opt/pw-browsers";
  const dir = existsSync(base) ? readdirSync(base).find((d) => /^chromium-\d/.test(d)) : undefined;
  const found = ["chrome-linux64/chrome", "chrome-linux/chrome"]
    .map((bin) => join(base, dir ?? "chromium", bin))
    .find(existsSync);
  // Else Playwright's own browser.
  return found;
}

function playwright() {
  for (const name of ["playwright-core", "playwright"]) {
    try {
      return require(name);
    } catch {}
  }
  throw new Error("playwright-core missing: npx -y -p playwright-core@1.49.1 node scripts/art.mjs");
}

/** family → name → "webp" | "svg", from what art-src holds. */
const found = {};
for (const family of existsSync(src) ? readdirSync(src) : []) {
  if (!(family in WIDTH)) continue;
  for (const file of readdirSync(join(src, family))) {
    const ext = extname(file).toLowerCase();
    const name = file.slice(0, -ext.length);
    if (!/^[a-z0-9_-]+$/.test(name)) continue;
    if (!RASTER.has(ext) && ext !== ".svg") continue;
    found[family] = { ...found[family], [name]: { file, ext } };
  }
}

rmSync(out, { recursive: true, force: true });
const raster = Object.values(found).some((f) => Object.values(f).some((x) => x.ext !== ".svg"));
const browser = raster
  ? await playwright().chromium.launch({
      executablePath: chromiumPath(),
      args: ["--headless=new"],
    })
  : null;
const page = browser ? await browser.newPage() : null;
await page?.setContent("<body></body>");

const listed = {};
for (const [family, names] of Object.entries(found)) {
  mkdirSync(join(out, family), { recursive: true });
  for (const [name, { file, ext }] of Object.entries(names)) {
    const from = join(src, family, file);
    if (ext === ".svg") {
      copyFileSync(from, join(out, family, `${name}.svg`));
      listed[family] = { ...listed[family], [name]: "svg" };
      console.log(`${family}/${name}.svg`);
      continue;
    }
    const data = readFileSync(from).toString("base64");
    for (const [scale, suffix] of [
      [1, ""],
      [2, "@2x"],
    ]) {
      const url = await page.evaluate(
        async ({ data, mime, width }) => {
          const img = new Image();
          img.src = `data:${mime};base64,${data}`;
          await img.decode();
          const w = Math.min(width, img.naturalWidth);
          const h = Math.round((img.naturalHeight * w) / img.naturalWidth);
          const c = document.createElement("canvas");
          c.width = w;
          c.height = h;
          const g = c.getContext("2d");
          g.imageSmoothingQuality = "high";
          g.drawImage(img, 0, 0, w, h);
          return c.toDataURL("image/webp", 0.86);
        },
        { data, mime: MIME[ext], width: WIDTH[family] * scale },
      );
      writeFileSync(
        join(out, family, `${name}${suffix}.webp`),
        Buffer.from(url.split(",")[1], "base64"),
      );
    }
    listed[family] = { ...listed[family], [name]: "webp" };
    console.log(`${family}/${name}.webp`);
  }
}
await browser?.close();

const sorted = Object.fromEntries(
  Object.keys(listed)
    .sort()
    .map((f) => [
      f,
      Object.fromEntries(
        Object.keys(listed[f])
          .sort()
          .map((n) => [n, listed[f][n]]),
      ),
    ]),
);
writeFileSync(
  join(web, "src/art/raster.ts"),
  `// Written by scripts/art.mjs from art-src/ (docs/commandes-images.md): do not edit by hand.

/** The generated illustrations served from public/art/, by family then name. */
export const RASTER: Record<string, Record<string, "webp" | "svg">> = ${JSON.stringify(sorted, null, 2)};
`,
);
// In the repository's own format, so that the lint passes as is.
try {
  execSync("pnpm exec biome format --write src/art/raster.ts", { cwd: web, stdio: "ignore" });
} catch {}
console.log(
  `src/art/raster.ts: ${Object.values(sorted).reduce((n, f) => n + Object.keys(f).length, 0)} images`,
);
