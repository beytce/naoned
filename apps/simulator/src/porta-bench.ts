import { readFileSync } from "node:fs";
import { parseEmpireSettings, venice1450Empire } from "@comptoirs/engine";
import { botStats, playBattle, relicPrice } from "./empire/porta.js";

/**
 * The Porta's calibration bench (docs/plan-porta.md, lot 6): for each tier a house can play alone,
 * each combat model and level, so many battles of the scripted bot. A JSON of partial `porta`
 * settings may be given (merged over Venice's) to try a tuning.
 *   pnpm --filter @comptoirs/simulator porta-bench [porta.json]
 */
const patch = process.argv[2] ? JSON.parse(readFileSync(process.argv[2], "utf8")) : {};
const porta = { ...venice1450Empire.porta, ...patch };
const s = parseEmpireSettings({ ...venice1450Empire, porta });
const RUNS = 12;
const models = Object.keys(s.porta.models);
console.log(
  "| Palier | Modèle | Niveau | Victoires | Combat survit | Transport survit | Ducats rapportés |",
);
console.log("| --- | --- | --- | --- | --- | --- | --- |");
s.porta.tiers.forEach((line, i) => {
  const tier = i + 1;
  if (line.minPlayers > 1) return;
  for (const model of models)
    for (const level of [1, 3, 5]) {
      const outs = Array.from({ length: RUNS }, (_, k) =>
        playBattle(7_919 * tier + 131 * k + level, tier, botStats(model, level, s), 75, s),
      );
      const share = (f: (o: (typeof outs)[number]) => boolean) =>
        `${Math.round((100 * outs.filter(f).length) / RUNS)} %`;
      const ducats =
        outs.reduce(
          (a, o) => a + o.relics.reduce((x, r) => x + Number(relicPrice(r, s) / 100n), 0),
          0,
        ) / RUNS;
      console.log(
        `| ${tier} | ${model} | ${level} | ${share((o) => o.won)} | ${share((o) => o.vehicles[0]?.outcome === "exited")} | ${share((o) => o.vehicles[1]?.outcome === "exited")} | ${Math.round(ducats)} |`,
      );
    }
});
