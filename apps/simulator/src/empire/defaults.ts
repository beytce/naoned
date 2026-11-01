import { venice1450, venice1450Empire } from "@comptoirs/engine";
import type { SimModel } from "./model.js";

/**
 * Venetia's chains as the socle plays them (the theme's recipes, CADRAGE-v3 § 13 step 3): each
 * good of Venetia made by a recipe gets its rate an hour at level 1 and its inputs a unit.
 */
function venetiaChains(): {
  rates: Record<string, number>;
  recipes: Record<string, Record<string, number>>;
} {
  const veneto = venice1450Empire.regions?.find((r) => r.code === "veneto");
  const goods = new Set([
    ...Object.keys(veneto?.produces ?? {}),
    ...Object.keys(veneto?.demands ?? {}),
  ]);
  // One step up the chains: the flour of the bread.
  for (const r of venice1450.recipes)
    if (Object.keys(r.outputs).some((g) => goods.has(g)))
      for (const g of Object.keys(r.inputs)) goods.add(g);
  const rates: Record<string, number> = {};
  const recipes: Record<string, Record<string, number>> = {};
  for (const r of venice1450.recipes) {
    const [good, out] = Object.entries(r.outputs)[0] ?? [];
    if (!good || !out || !goods.has(good)) continue;
    rates[good] = (out * 60) / r.durationMinutes;
    if (Object.keys(r.inputs).length > 0)
      recipes[good] = Object.fromEntries(
        Object.entries(r.inputs).map(([g, n = 0]) => [g, n / out]),
      );
  }
  return { rates, recipes };
}

const VENETIA = venetiaChains();

const ADRIATIC = ["veneto", "romagna", "friuli", "dalmazia"];
const SEA = [...ADRIATIC, "grecia"];
const GALLEY = [...SEA, "levante", "costantinopoli"];

/** The model's first guesses (CADRAGE-v3 § 3.3 for the vehicles), to calibrate. */
export const DEFAULT_MODEL: SimModel = {
  startCapitalDucats: 500,
  // The socle's start (venice1450.empire.ts): the clay, the wood and the planks of the Casa 2.
  startWorkshops: [
    { region: "veneto", good: "clay" },
    { region: "veneto", good: "wood" },
    { region: "veneto", good: "planks" },
  ],
  startVehicles: ["mule", "mule"],
  rawPerHour: 10,
  craftedPerHour: 5,
  rates: VENETIA.rates,
  // Venetia's chains from the theme; the others, the model's guesses until their step.
  recipes: {
    glass: { salt: 1, wood: 1 },
    cloth: { wool: 2 },
    ...VENETIA.recipes,
  },
  queueHours: 12,
  boardPerActive: 5,
  smallShareBps: 5_000,
  smallCasa: 10,
  orderPremiumBps: 1_000,
  favourPer100Ducats: 1,
  depthBase: 20,
  depthPerActive: 3,
  foreignDepth: 200,
  foreignDepthPerActive: 1.5,
  bootyPerTierDucats: 250,
  minerTeams: 3,
  marketTaxBps: 300,
  // The ships, until their step: the land and river vehicles are the game's (empire.vehicles).
  vehicles: {
    marciliana: { casa: 9, capacity: 150, costDucats: 1_500, regions: ADRIATIC, speedBps: 2_000 },
    cocca: { casa: 11, capacity: 300, costDucats: 3_500, regions: SEA, speedBps: 2_000 },
    galea: { casa: 14, capacity: 500, costDucats: 9_000, regions: GALLEY, speedBps: 3_000 },
    fiandra: {
      casa: 18,
      capacity: 800,
      costDucats: 25_000,
      regions: [...GALLEY, "fiandra"],
      speedBps: 3_000,
    },
  },
  galleyCostDucats: 1_200,
  galleyStrength: 10,
  youngCasa: 8,
  planPriceDucats: 80,
  plansPerRelic: 2,
  victualsPerTierDucats: 40,
  terra: {
    playBps: { assidu: 8_000, median: 5_000, occasional: 2_000, absent: 3_000 },
    favourValueDucats: 10,
    sealValueDucats: 40,
  },
  roundsPerSession: 3,
  sessionsPerDay: {
    assidu: [8, 12, 18, 22],
    median: [8, 20],
    occasional: [20],
    absent: [8, 20],
  },
  leaveBpsPerWeek: 3_000,
  researchOrder: {
    trader: ["hold", "sails", "portolan", "convoy", "floating", "tools"],
    miner: ["yield", "campaign", "tools", "hold", "sustain"],
    armourer: ["crossbow", "pavise", "bombard", "surgeon", "hold", "mantlet"],
    mixed: ["hold", "tools", "yield", "crossbow", "sails", "pavise"],
  },
  casaFirst: true,
  saveDays: 10,
  worksDays: 30,
  voyageDepthShare: 0.5,
  insureFromBps: 500,
  mudaBidBps: 7_000,
  paybackDays: 5,
  incomeDays: 30,
};
