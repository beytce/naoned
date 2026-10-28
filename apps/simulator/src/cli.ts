import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { venice1450Settings } from "@comptoirs/engine";
import { allBlockingPass, checksTable, evaluate, houseGaps, houseVerdict } from "./report.js";
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
    /** A mutator of the month played all season (E2-9), by its code. */
    mutator: { type: "string" },
    /** A decree of the Doge held all season (R7): `code` or `code:target`, e.g. faveur:venezia. */
    decree: { type: "string" },
    /**
     * Share of bots whose house holds patents (0 to 1), compared with the same season without
     * them (the house's settings of Venice).
     */
    patents: { type: "string", default: "0" },
    /** Bots as in the live world (next to people). */
    live: { type: "boolean", default: false },
    /** The Terraferma played in the world (docs/plan-terraferme.md), as at its opening. */
    terra: { type: "boolean", default: false },
    out: { type: "string", default: join(here, "..", "out") },
  },
});

const base = values.scenario
  ? { ...venice1450Settings, ...JSON.parse(readFileSync(resolve(values.scenario), "utf8")) }
  : venice1450Settings;
// The Pass is off in Venice until it comes back; --pass measures it as it would be, switched on.
const withPass =
  Number(values.pass) > 0 ? { ...base, pass: { ...base.pass, enabled: true } } : base;
const withTerra =
  values.terra && withPass.terraferma
    ? { ...withPass, terraferma: { ...withPass.terraferma, live: true } }
    : withPass;
// The Doge's decree of the month (R7), as the server writes it into a month's settings.
const [decreeCode, decreeTarget] = (values.decree ?? "").split(":");
const settings =
  decreeCode && withTerra.doge
    ? {
        ...withTerra,
        doge: {
          ...withTerra.doge,
          decree: decreeTarget ? { code: decreeCode, target: decreeTarget } : { code: decreeCode },
        },
      }
    : withTerra;
const players = values.players ? Number(values.players) : undefined;
const mix = players ? scaleMix(DEFAULT_MIX, players) : DEFAULT_MIX;
const seeds = (values.seeds ?? "1").split(",").map(Number);
const outDir = resolve(values.out ?? "out");
mkdirSync(outDir, { recursive: true });

const CREATED = [
  "starting_capital",
  "city_sale",
  "criee_sale",
  "daily_reward",
  "daily_chest",
  "letter_reward",
  "project_delivery",
  "project_bonus",
  "market_maker_buy",
  "contract_reward",
  "family_order_reward",
  "mission_reward",
  "delivery",
  "decree_favour",
  "supplier_bonus",
  "tender_delivery",
  "quality_premium",
  "loan",
  "terraferma_route",
];
const DESTROYED = [
  "market_tax",
  "construction",
  "market_maker_sell",
  "campaign_hire",
  "campaign_work",
  "vehicle",
  "terraferma",
  "tender_forfeit",
  "warehouse_rent",
  "fondaco_build",
  "incanto",
  "letter_cost",
  "loan_repay",
  "loan_interest",
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
const gaps: { lead: number; others: number }[] = [];
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
    mutator: values.mutator,
    patentShare: Number(values.patents),
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
  // With patents, the same season again with none: what they bring, merchant by merchant.
  const houseTwin =
    options.patentShare > 0 ? runSimulation({ ...options, patentShare: 0 }) : undefined;
  const checks = evaluate(result, twin, houseTwin);
  const gap = houseTwin ? houseGaps(result, houseTwin) : undefined;
  if (gap && !Number.isNaN(gap.lead) && !Number.isNaN(gap.others)) gaps.push(gap);
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

// Patents: judged on the median over the seeds (one seed's replay is too noisy alone).
const verdict = houseVerdict(gaps);
if (verdict.length > 0) {
  const pass = allBlockingPass(verdict);
  allPass &&= pass;
  sections.push(
    [
      `## Maison : synthèse des graines — ${pass ? "conforme" : "non conforme"}`,
      checksTable(verdict),
    ].join("\n\n"),
  );
  console.log(`\nhouse: ${pass ? "PASS" : "FAIL"}`);
  for (const c of verdict) console.log(`  ${c.pass ? "ok  " : "FAIL"} ${c.name}: ${c.value}`);
}

const report = `# Rapport de simulation\n\n${allPass ? "Toutes les graines respectent les cibles." : "Au moins une graine ne respecte pas les cibles."}\n\n${sections.join("\n\n")}\n`;
writeFileSync(join(outDir, "report.md"), report);
console.log(`\nRapport : ${join(outDir, "report.md")}`);
process.exitCode = allPass ? 0 : 1;
