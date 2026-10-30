import type { SimModel } from "./model.js";

const VENETO = ["veneto"];
const RIVERS = ["veneto", "lombardia", "romagna"];
const ROADS = ["veneto", "lombardia", "friuli", "germania"];
const ADRIATIC = ["veneto", "romagna", "friuli", "dalmazia"];
const SEA = [...ADRIATIC, "grecia"];
const GALLEY = [...SEA, "levante", "costantinopoli"];

/** The model's first guesses (CADRAGE-v3 § 3.3 for the vehicles), to calibrate. */
export const DEFAULT_MODEL: SimModel = {
  startCapitalDucats: 500,
  startWorkshops: [
    { region: "veneto", good: "wheat" },
    { region: "veneto", good: "bread" },
  ],
  startVehicles: ["mule", "mule"],
  rawPerHour: 10,
  craftedPerHour: 5,
  recipes: {
    bread: { wheat: 2 },
    bricks: { clay: 2 },
    planks: { wood: 2 },
    glass: { salt: 1, wood: 1 },
    cloth: { wool: 2 },
  },
  queueHours: 12,
  boardPerActive: 5,
  smallShareBps: 3_000,
  smallCasa: 10,
  orderPremiumBps: 1_000,
  favourPer100Ducats: 1,
  depthBase: 20,
  depthPerActive: 3,
  foreignDepth: 400,
  bootyPerTierDucats: 250,
  minerTeams: 3,
  marketTaxBps: 300,
  vehicles: {
    mule: { casa: 1, capacity: 25, costDucats: 60, regions: VENETO, speedBps: 0 },
    cart: { casa: 3, capacity: 40, costDucats: 120, regions: VENETO, speedBps: 0 },
    burchio: { casa: 5, capacity: 90, costDucats: 400, regions: RIVERS, speedBps: 0 },
    chariot: { casa: 6, capacity: 70, costDucats: 500, regions: ROADS, speedBps: 0 },
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
  localTripsPerDay: 4,
  counterCostTimes: 4,
  galleyCostDucats: 1_200,
  galleyStrength: 10,
  youngCasa: 8,
  planPriceDucats: 80,
  plansPerRelic: 2,
  victualsPerTierDucats: 40,
  terra: {
    playBps: { assidu: 8_000, median: 5_000, occasional: 2_000, absent: 3_000 },
    rationDucats: 60,
    favour: [5, 40],
    seals: [0, 3],
    favourValueDucats: 10,
    sealValueDucats: 40,
  },
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
  paybackDays: 5,
  incomeDays: 30,
};
