// The long voyages (docs/calibration.md, 3 November 2026, decision of the owner): writes the two
// scenarios of the 24 months' simulator, from the game's own settings.
//   B, scenarios/voyages-longs.json: the towns on the small tiles (placeCities), the first fondaco
//      on Venetia's free tile, a hop of about five minutes from it to the nearest town; a vehicle
//      makes one round a session (a hop is no longer a few seconds), nothing else changed.
//   C, scenarios/voyages-longs-commandes.json: B, and the orders five times fewer, five times
//      larger and five times slower to come (the same worth an hour, the same worth a full town).
//   npx tsx src/scenario-voyages.ts
// Historical (3 November 2026): it reads the game's settings, which carry the decision since; run
// it on the settings of before (`git checkout 9a7d9c5`) to write the scenarios again.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseEmpireSettings,
  placeCities,
  slotPoint,
  slotsTouch,
  townClashes,
  venice1450Empire,
} from "@comptoirs/engine";

const here = dirname(fileURLToPath(import.meta.url));
const START = "2,4";
const s = parseEmpireSettings(venice1450Empire);
const map = venice1450Empire.map as NonNullable<typeof venice1450Empire.map>;
const cities = placeCities(map.cities ?? [], s, [START]);
const free = [1, 2, 3, 4, 5, 6]
  .map((k) => slotPoint(START, k, s))
  .find((q) => cities.every((c) => !slotsTouch(q, [c.x, c.y], s)));
if (!free) throw new Error("no free tile for the first fondaco");
const home = { x: Math.round(free[0]), y: Math.round(free[1]) };
const nearest = Math.min(...cities.map((c) => Math.hypot(c.x - home.x, c.y - home.y)));
// About five minutes from the first fondaco to the nearest town: a whole number of seconds a
// unit of the chart (the speed a setting to come, `moves.secondsPerUnit`: the engine counts in
// integers; the simulator does not reckon the hops' time, only the rounds a session makes).
const secondsPerUnit = Math.round(300 / nearest);
const orders = s.orders as NonNullable<typeof s.orders>;
const K = 5;
const settingsB = { map: { ...map, cities, home } };
const settingsC = {
  ...settingsB,
  orders: {
    ...orders,
    cap: orders.cap.map((c) => Math.max(1, Math.round(c / K))),
    everyMinutes: orders.everyMinutes.map((m) => m * K),
    lotDucats: orders.lotDucats * K,
  },
};
const model = { roundsPerSession: 1 };
const dir = join(here, "..", "scenarios");
writeFileSync(
  join(dir, "voyages-longs.json"),
  `${JSON.stringify({ settings: settingsB, model }, null, 2)}\n`,
);
writeFileSync(
  join(dir, "voyages-longs-commandes.json"),
  `${JSON.stringify({ settings: settingsC, model }, null, 2)}\n`,
);
console.log(
  `home ${home.x},${home.y}; nearest town ${nearest.toFixed(1)}; ${secondsPerUnit} s a unit ` +
    `(${Math.round(nearest * secondsPerUnit)} s to it); ` +
    `${townClashes(cities, s).length} towns side by side`,
);
