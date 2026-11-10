import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import {
  type EmpireSettingsInput,
  venice1450Empire,
  venice1450EmpireSquare,
  venice1450Interior,
} from "@comptoirs/engine";
import { evaluate, reportMarkdown } from "./empire/report.js";
import { DEFAULT_EMPIRE_OPTIONS, type EmpireResult, runEmpire } from "./empire/run.js";
import { power } from "./empire/world.js";

const here = dirname(fileURLToPath(import.meta.url));
const { values } = parseArgs({
  options: {
    seeds: { type: "string", default: "1,2,3" },
    months: { type: "string", default: "24" },
    cohort: { type: "string", default: "200" },
    /** A JSON of { settings?: partial empire settings, model?: partial SimModel }. */
    scenario: { type: "string" },
    out: { type: "string", default: join(here, "..", "out") },
    /** The workshops' insides switched on (docs/plan-ateliers.md lot A8). */
    interior: { type: "boolean", default: false },
    /** The game's own map in square tiles (venice1450.square.ts), as the world in service. */
    square: { type: "boolean", default: false },
    /** Without the terroirs, without the towns' loyalty: the measure of before (the living map). */
    "no-terroirs": { type: "boolean", default: false },
    "no-loyalty": { type: "boolean", default: false },
  },
});

/** The settings measured: the game's, less what the flags switch off. */
function baseSettings(): EmpireSettingsInput {
  const base = values.square ? venice1450EmpireSquare : venice1450Empire;
  const map = { ...base.map };
  if (values["no-terroirs"]) map.terrain = undefined;
  const orders = base.orders ? { ...base.orders } : undefined;
  if (orders && values["no-loyalty"]) (orders as { loyalty?: unknown }).loyalty = undefined;
  return { ...base, map, ...(orders ? { orders } : {}) };
}

const scenario = values.scenario ? JSON.parse(readFileSync(resolve(values.scenario), "utf8")) : {};
const results: EmpireResult[] = [];
for (const seed of values.seeds.split(",").map(Number)) {
  const r = runEmpire({
    ...DEFAULT_EMPIRE_OPTIONS,
    seed,
    months: Number(values.months),
    cohortSize: Number(values.cohort),
    settings: {
      ...baseSettings(),
      ...(values.interior ? { interior: venice1450Interior } : {}),
      ...scenario.settings,
    },
    model: scenario.model,
  });
  results.push(r);
  const checks = evaluate(r);
  console.log(
    `graine ${seed} : ${checks.filter((c) => c.pass).length}/${checks.length} cibles, ${(r.durationMs / 1000).toFixed(0)} s`,
  );
  for (const c of checks)
    console.log(`  ${c.pass ? "✓" : "✗"} ${c.label} : ${c.value} (${c.target})`);
}

mkdirSync(values.out, { recursive: true });
writeFileSync(join(values.out, "empire.md"), reportMarkdown(results));
const r = results[0];
if (r) {
  const cohorts = r.options.cohortMonths;
  writeFileSync(
    join(values.out, "empire-daily.csv"),
    [
      [
        "day",
        "priceIndex",
        "spread",
        "money",
        "worldPower",
        ...cohorts.flatMap((c) => [`casa${c}`, `power${c}`, `income${c}`]),
      ].join(","),
      ...r.daily.map((d) =>
        [
          d.day,
          d.priceIndex,
          d.spread,
          d.money,
          d.worldPower,
          ...cohorts.flatMap((c) => [
            d.cohorts[c]?.casa ?? "",
            d.cohorts[c]?.power ?? "",
            Math.round(d.cohorts[c]?.income ?? 0),
          ]),
        ].join(","),
      ),
    ].join("\n"),
  );
  const w = r.world;
  writeFileSync(
    join(values.out, "empire-houses.csv"),
    [
      "id,cohort,activity,bent,casa,power,cash,earned,spent,orders,market,voyages,extraction,expeditions,terraValue,workshops,counters,vehicles,galleys",
      ...w.houses.map((h) =>
        [
          h.id,
          h.cohort,
          h.activity,
          h.bent,
          h.casa,
          power(w, h),
          h.cash,
          h.earned,
          h.spent,
          h.income.orders,
          h.income.market,
          h.income.voyages,
          h.income.extraction,
          h.income.expeditions,
          h.terraValue,
          h.workshops.length,
          h.counters.size,
          h.vehicles.length,
          h.galleys,
        ].join(","),
      ),
    ].join("\n"),
  );
  writeFileSync(
    join(values.out, "empire-prices.csv"),
    [
      "market,day,price",
      ...[...w.history].flatMap(([key, row]) => row.map((p, day) => `${key},${day},${p}`)),
    ].join("\n"),
  );
}
console.log(`Rapport : ${join(values.out, "empire.md")}`);
