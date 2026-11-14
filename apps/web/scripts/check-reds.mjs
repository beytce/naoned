// The one red (docs/plan-semaine.md D5, audit UX-2 and UX-3): the screens of the board take their
// red from the tokens (`--pc-accent` and its shades, in porcellana.css), never a red in hex.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../src/porcellana/", import.meta.url));
const dirs = ["planche", "passe", "guerre", "ile"];
const REDS = /#(c8102e|c7372f|c23b2e|a8302a|8a2a20|e0614f|ff8a7a)\b/i;
const found = [];
for (const d of dirs)
  for (const f of readdirSync(join(root, d))) {
    if (!/\.(css|tsx?)$/.test(f)) continue;
    readFileSync(join(root, d, f), "utf8")
      .split("\n")
      .forEach((line, k) => {
        if (REDS.test(line)) found.push(`${d}/${f}:${k + 1}: ${line.trim()}`);
      });
  }
if (found.length) {
  console.error(`A red in hex, where a token is wanted (var(--pc-accent…)):\n${found.join("\n")}`);
  process.exit(1);
}
console.log("reds: the screens of the board take their red from the tokens");
