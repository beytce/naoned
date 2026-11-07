/**
 * The insides' bench (docs/plan-ateliers.md § 9, lot A8): each of Venice's workshops, at a few
 * levels, tended 60 days by each way (hasty, average, careful), three sessions a day, money no
 * object; the mean pace of each way, and their ratios to the hasty's. Quick, to calibrate the
 * insides before the 24-month simulator checks the economy around them.
 *   npx tsx src/interior-bench.ts
 */
import { parseEmpireSettings, venice1450Empire, venice1450Interior } from "@comptoirs/engine";
import { TENDINGS, type Tending, settleInsides, tendInsides } from "./empire/interior.js";
import type { House, World } from "./empire/model.js";

const s = parseEmpireSettings({ ...venice1450Empire, interior: venice1450Interior });
const goods: Record<string, string> = {
  farm: "wheat",
  clay_pit: "clay",
  lumber_camp: "wood",
  sand_pit: "sand",
  sheepfold: "wool",
  mill: "flour",
  bakery: "bread",
  sawmill: "planks",
  brickworks: "bricks",
  glassworks: "glass",
  loom: "drape",
  tailor: "garments",
  mirrorworks: "mirrors",
  spicery: "prepared_spices",
};
const DAYS = Number(process.argv[2] ?? 60);
const levels = [1, 5, 12];
const knowledge = process.argv[3] === "craft" ? ["mestiere", "bottega"] : [];

const results: Record<Tending, number[]> = { hasty: [], average: [], careful: [] };
const spent: Record<Tending, bigint> = { hasty: 0n, average: 0n, careful: 0n };
const gestures: Record<Tending, number> = { hasty: 0, average: 0, careful: 0 };
for (const [i, how] of TENDINGS.entries())
  for (const level of levels)
    for (const good of Object.values(goods)) {
      const h = {
        id: i,
        cash: 10n ** 15n,
        spent: 0n,
        sessions: 0,
        relaunchedAt: 0,
        workshops: [{ region: "veneto", good, level }],
        ident: { knowledge },
      } as unknown as House;
      const w = {
        s,
        m: { queueHours: 12 },
        now: 0,
        destroyed: 0n,
        destroyedBy: {},
      } as unknown as World;
      let sum = 0;
      let n = 0;
      for (let hour = 0; hour < DAYS * 24; hour += 8) {
        w.now = hour;
        settleInsides(w, h);
        h.relaunchedAt = hour;
        tendInsides(w, h, () => h.cash);
        settleInsides(w, h);
        h.sessions++;
        if (hour >= 10 * 24) {
          sum += h.workshops[0]?.pace ?? 10_000;
          n++;
        }
      }
      results[how].push(sum / n / 10_000);
      spent[how] += h.interiorSpent ?? 0n;
      gestures[how] += (h.interiorGestures ?? 0) / Math.max(1, h.sessions);
    }

const mean = (xs: number[]) => xs.reduce((a, x) => a + x, 0) / xs.length;
const hasty = mean(results.hasty);
for (const how of TENDINGS)
  console.log(
    `${how.padEnd(8)} cadence ${mean(results[how]).toFixed(2)}  / pressé ${(mean(results[how]) / hasty).toFixed(2)}  dépense ${(Number(spent[how]) / 100 / results[how].length).toFixed(0)} d/atelier  gestes/séance ${(gestures[how] / results[how].length).toFixed(2)}`,
  );
