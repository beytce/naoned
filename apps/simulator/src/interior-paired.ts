/**
 * What tending the insides pays (docs/plan-ateliers.md § 9, lot A8): two runs of the 24-month
 * simulator with the same seed and cohorts — without the insides, then with — read house by house
 * (`empire-houses.csv`); each way of tending's earnings against the same houses without the
 * insides, and against the hasty's. Pairing the houses takes out what their other traits weigh.
 *   npx tsx src/interior-paired.ts out-without/empire-houses.csv out-with/empire-houses.csv
 */
import { readFileSync } from "node:fs";
import { TENDINGS } from "./empire/interior.js";

function load(path: string): Map<string, number> {
  const [head = "", ...rows] = readFileSync(path, "utf8").trim().split("\n");
  const cols = head.split(",");
  const id = cols.indexOf("id");
  const earned = cols.indexOf("earned");
  return new Map(rows.map((r) => r.split(",")).map((c) => [c[id] ?? "", Number(c[earned])]));
}

const [withoutPath, withPath] = process.argv.slice(2);
if (!withoutPath || !withPath) throw new Error("two empire-houses.csv: without, then with");
const without = load(withoutPath);
const withIt = load(withPath);
const gains = TENDINGS.map(() => [] as number[]);
for (const [id, earned] of withIt) {
  const before = without.get(id);
  if (!before || before <= 0) continue;
  gains[Number(id) % 3]?.push(earned / before);
}
const mean = (xs: number[]) => xs.reduce((a, x) => a + x, 0) / Math.max(1, xs.length);
const hasty = mean(gains[0] ?? []);
TENDINGS.forEach((how, k) => {
  const g = mean(gains[k] ?? []);
  console.log(
    `${how.padEnd(8)} gagne ${g.toFixed(3)} × le témoin ; ${(g / hasty).toFixed(3)} × le pressé (${gains[k]?.length ?? 0} Maisons)`,
  );
});
