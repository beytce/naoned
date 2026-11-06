// After `vite build` (audit of 4 November, 3D B1 and M10): the start of the game carries no
// three.js (the 3D of Porcellana loads apart), and no file nears the service worker's precache limit (3 MB), past
// which Workbox would leave it out without a word and the game would no longer start offline.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const LIMIT = 2.5 * 1024 * 1024;
const faults = [];
const html = readFileSync(join(dist, "index.html"), "utf8");
const entry = html.match(/assets\/index-[\w-]+\.js/)?.[0];
if (!entry) faults.push("no entry chunk in dist/index.html");
else {
  const code = readFileSync(join(dist, entry), "utf8");
  if (code.includes("WebGLRenderer")) faults.push(`${entry} carries three.js's renderer`);
}
const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
for (const f of walk(dist))
  if (/\.(js|css|glb|html)$/.test(f) && statSync(f).size > LIMIT)
    faults.push(`${f.slice(dist.length + 1)} is ${(statSync(f).size / 1048576).toFixed(2)} MB`);
if (faults.length) {
  console.error(`bundle check:\n- ${faults.join("\n- ")}`);
  process.exit(1);
}
console.log("bundle check: the start carries no 3D, every file under 2.5 MB");
