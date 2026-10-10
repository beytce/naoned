import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { venice1450Settings } from "@comptoirs/engine";
import { allBlockingPass, checksTable, evaluate } from "./report.js";
import { DEFAULT_MIX, type SimulationResult, runSimulation } from "./sim.js";

const here = dirname(fileURLToPath(import.meta.url));
const { values } = parseArgs({
  options: {
    seeds: { type: "string", default: "1,2,3,4,5" },
    days: { type: "string", default: "42" },
    step: { type: "string", default: "15" },
    scenario: { type: "string" },
    out: { type: "string", default: join(here, "..", "out") },
  },
});

const settings = values.scenario
  ? { ...venice1450Settings, ...JSON.parse(readFileSync(resolve(values.scenario), "utf8")) }
  : venice1450Settings;
const seeds = (values.seeds ?? "1").split(",").map(Number);
const outDir = resolve(values.out ?? "out");
mkdirSync(outDir, { recursive: true });

const CREATED = ["starting_capital", "city_sale", "project_delivery", "market_maker_buy"];
const DESTROYED = ["market_tax", "upkeep", "construction", "market_maker_sell"];

/** One column per money source and sink, so the CSV stays flat. */
function flatDaily(result: SimulationResult): Record<string, unknown>[] {
  return result.daily.map(({ createdBy, destroyedBy, ...rest }) => ({
    ...rest,
    ...Object.fromEntries(CREATED.map((k) => [`created_${k}`, createdBy[k] ?? 0n])),
    ...Object.fromEntries(DESTROYED.map((k) => [`destroyed_${k}`, destroyedBy[k] ?? 0n])),
  }));
}

function csv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0] ?? {});
  const cell = (v: unknown) => (v === undefined ? "" : String(v));
  return [headers.join(","), ...rows.map((r) => headers.map((h) => cell(r[h])).join(","))].join(
    "\n",
  );
}

const sections: string[] = [];
let allPass = true;
for (const seed of seeds) {
  const result: SimulationResult = runSimulation({
    settings,
    seed,
    days: Number(values.days),
    stepMinutes: Number(values.step),
    mix: DEFAULT_MIX,
    lateJoiners: 10,
  });
  const checks = evaluate(result);
  const pass = allBlockingPass(checks);
  allPass &&= pass;
  const dir = join(outDir, `seed-${seed}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "daily_metrics.csv"), csv(flatDaily(result)));
  writeFileSync(
    join(dir, "prices.csv"),
    csv(result.prices as unknown as Record<string, unknown>[]),
  );
  writeFileSync(
    join(dir, "players_daily.csv"),
    csv(result.players as unknown as Record<string, unknown>[]),
  );
  const firstViolations = result.violations
    .slice(0, 5)
    .map((v) => v.detail)
    .join(" ; ");
  const lines = [
    `## Graine ${seed} — ${pass ? "conforme" : "non conforme"}`,
    checksTable(checks),
    `Commandes acceptées : ${result.commands.accepted}, refusées : ${result.commands.rejected}. Durée : ${(result.durationMs / 1000).toFixed(1)} s.`,
  ];
  if (firstViolations) lines.push(`Premiers écarts : ${firstViolations}`);
  sections.push(lines.join("\n\n"));
  console.log(
    `seed ${seed}: ${pass ? "PASS" : "FAIL"} (${(result.durationMs / 1000).toFixed(1)} s)`,
  );
  for (const c of checks)
    console.log(`  ${c.pass ? "ok  " : c.blocking ? "FAIL" : "warn"} ${c.name}: ${c.value}`);
}

const report = `# Rapport de simulation\n\n${allPass ? "Toutes les graines respectent les cibles." : "Au moins une graine ne respecte pas les cibles."}\n\n${sections.join("\n\n")}\n`;
writeFileSync(join(outDir, "report.md"), report);
console.log(`\nRapport : ${join(outDir, "report.md")}`);
process.exitCode = allPass ? 0 : 1;
