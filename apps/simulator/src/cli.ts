import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { venice1450Settings } from "@comptoirs/engine";
import { allBlockingPass, checksTable, evaluate } from "./report.js";
import { DEFAULT_MIX, type SimulationResult, runSimulation, scaleMix } from "./sim.js";

const here = dirname(fileURLToPath(import.meta.url));
const { values } = parseArgs({
  options: {
    seeds: { type: "string", default: "1,2,3,4,5" },
    /** Length of the season; by default the nominal month of the settings. */
    days: { type: "string" },
    step: { type: "string", default: "15" },
    scenario: { type: "string" },
    /** Small world: this many merchants from the start, no late joiners (beta with bots). */
    players: { type: "string" },
    /** Share of bots holding the Pass Négociant (0 to 1). */
    pass: { type: "string", default: "0" },
    /** Bots as in the live world (next to people). */
    live: { type: "boolean", default: false },
    out: { type: "string", default: join(here, "..", "out") },
  },
});

const settings = values.scenario
  ? { ...venice1450Settings, ...JSON.parse(readFileSync(resolve(values.scenario), "utf8")) }
  : venice1450Settings;
const players = values.players ? Number(values.players) : undefined;
const mix = players ? scaleMix(DEFAULT_MIX, players) : DEFAULT_MIX;
const seeds = (values.seeds ?? "1").split(",").map(Number);
const outDir = resolve(values.out ?? "out");
mkdirSync(outDir, { recursive: true });

const CREATED = [
  "starting_capital",
  "bounty",
  "city_sale",
  "criee_sale",
  "daily_reward",
  "daily_chest",
  "project_delivery",
  "market_maker_buy",
  "contract_reward",
  "family_order_reward",
  "mission_reward",
  "delivery",
  "decree_favour",
];
const DESTROYED = [
  "market_tax",
  "upkeep",
  "construction",
  "market_maker_sell",
  "expedition_charter",
  "ship_repair",
  "privateer_letter",
  "campaign_hire",
  "campaign_work",
  "vehicle",
  "vehicle_upkeep",
  "escort",
  "bandits",
];

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
  const options = {
    settings,
    seed,
    days: Number(values.days ?? settings.seasonDays),
    stepMinutes: Number(values.step),
    mix,
    lateJoiners: players ? 0 : 10,
    live: values.live,
    passShare: Number(values.pass),
  };
  const result: SimulationResult = runSimulation(options);
  // With Pass holders, the same season again with the Pass's perks off: its effect, merchant by
  // merchant.
  const twin =
    options.passShare > 0
      ? runSimulation({
          ...options,
          settings: {
            ...settings,
            pass: {
              marketMakerQuotaBps: 0,
              extraOpenOrders: 0,
              freshBonusBps: 0,
              contractRerollsPerDay: 0,
            },
          },
        })
      : undefined;
  const checks = evaluate(result, twin);
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
