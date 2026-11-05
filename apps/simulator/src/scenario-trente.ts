// Some thirty towns and sessions of a few minutes (docs/audit-gameplay-2026-11-05.md, P2b and P3,
// decisions of the owner of 5 November 2026): writes the scenario of the 24 months' simulator from
// the game's own settings.
//   F, scenarios/trente-villes.json: 31 towns kept of 66 (3 a region, 4 in Venetia), each town
//      left out merged into its kept neighbour (its weight in the region's book added, the kept
//      town a size larger for one merged, two for three or more); the orders twice as frequent,
//      the caps of the middle towns a place larger; a vehicle making two rounds a session (the near
//      hops of one to three minutes instead of five to twenty).
//   npx tsx src/scenario-trente.ts
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  VENICE_TOWNS_MERGED,
  mergeCities,
  parseEmpireSettings,
  venice1450Empire,
} from "@comptoirs/engine";

const here = dirname(fileURLToPath(import.meta.url));
const s = parseEmpireSettings(venice1450Empire);
const map = venice1450Empire.map as NonNullable<typeof venice1450Empire.map>;
const cities = mergeCities(map.cities ?? [], VENICE_TOWNS_MERGED);
const orders = s.orders as NonNullable<typeof s.orders>;
const settings = {
  map: { ...map, cities },
  orders: {
    ...orders,
    cap: [1, 2, 2, 3, 4],
    everyMinutes: orders.everyMinutes.map((m) => Math.round(m / 2)),
  },
};
const model = { roundsPerSession: 2 };
writeFileSync(
  join(here, "..", "scenarios", "trente-villes.json"),
  `${JSON.stringify({ settings, model }, null, 2)}\n`,
);
console.log(`${cities.length} towns kept of ${(map.cities ?? []).length}`);
