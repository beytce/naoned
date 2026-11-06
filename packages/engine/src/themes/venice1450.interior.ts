import type { EmpireSettingsInput } from "../empire/settings.js";
import { venice1450EmpireSquare } from "./venice1450.square.js";

/**
 * The insides of Venice's fourteen workshops (docs/plan-ateliers.md § 4, lot A3): each its stages
 * and its stations, its walls, its doors and its default plan, which fits the hall of level 1
 * (4 × 3 flagstones). Starting values, to calibrate at the 24-month simulator (lot A8): the pace
 * of a queue is the inside's rate over its default plan's, so these figures weigh the stations of
 * a workshop against one another, never a workshop against another.
 *
 * Not switched on in the worlds of Venice: `venice1450EmpireInterior` carries them, for the
 * simulator and the tests, until the owner decides the switch (an announced change of the trade).
 */

type Interior = NonNullable<EmpireSettingsInput["interior"]>;
type Size = [number, number];
type Rot = 0 | 1 | 2 | 3;
/** A flagstone, « x, y ». */
const t = (x: number, y: number): [number, number] => [x, y];

/** A station's five levels: quicker, then a seat more, then a unit more a cycle; dearer each. */
function station(
  trades: string[],
  cycleS: number,
  capacity: number,
  seats: number,
  o: { size?: Size; wear?: number; quality?: number; cost?: number } = {},
) {
  const cost = o.cost ?? 60;
  const quicker = [10_000, 8_500, 7_200, 6_200, 5_400];
  const minutes = [5, 30, 120, 360, 720];
  return {
    size: o.size ?? ([1, 1] as Size),
    trades,
    wearPerUnitBps: o.wear ?? (seats > 0 ? 8 : 3),
    qualityBps: o.quality ?? 0,
    levels: quicker.map((q, k) => ({
      cycleS: Math.max(1, Math.round((cycleS * q) / 10_000)),
      capacity: capacity + (k >= 4 ? 1 : 0),
      seats: seats > 0 ? seats + (k >= 2 ? 1 : 0) : 0,
      costDucats: cost * 2 ** k,
      buildMinutes: minutes[k] ?? 720,
    })),
  };
}

const at = (kind: string, x: number, y: number, rot: Rot = 0) => ({ kind, x, y, rot });

const STATIONS = {
  // The farm: to sow, to reap, to thresh — the threshing floor holds the rest back.
  furrow: station(["farmer"], 40, 1, 1),
  sickle: station(["farmer"], 45, 1, 1),
  threshing_floor: station(["farmer"], 140, 2, 1, { size: [2, 2] }),
  // The clay pit: to dig, to wash in the tub.
  clay_pick: station(["digger"], 35, 1, 1),
  wash_tub: station(["digger"], 50, 1, 1, { size: [2, 1] }),
  // The lumber camp: to fell, to limb, to stack.
  felling: station(["woodcutter"], 50, 1, 1),
  limbing: station(["woodcutter"], 35, 1, 1),
  stacking: station(["labourer"], 50, 2, 1),
  // The sand pit: to dredge, to sieve (the sieve's levels, the sand's quality).
  dredge: station(["digger"], 45, 1, 1, { size: [2, 1] }),
  sieve: station(["digger"], 40, 1, 1),
  // The sheepfold: to shear, to sort the wool (the sorting makes the quality).
  shearing: station(["shepherd"], 50, 1, 1),
  wool_sorting: station(["weaver"], 35, 1, 1),
  // The mill: to sort the wheat, to grind at the great millstone, to bolt.
  grain_sorting: station(["miller"], 30, 1, 1),
  millstone: station(["miller"], 120, 3, 1, { size: [2, 2], cost: 90 }),
  bolting: station(["miller"], 30, 1, 1),
  // The bakery: to knead, to shape, to bake (the oven, the bottleneck), to cool.
  kneading: station(["baker"], 40, 1, 1),
  shaping: station(["baker"], 30, 1, 1),
  bread_oven: station(["baker"], 150, 3, 1, { size: [2, 1], cost: 90 }),
  cooling_rack: station([], 40, 2, 0),
  // The sawmill: to bark, to saw, to dry, to plane.
  barking: station(["labourer"], 35, 1, 1),
  saw_bench: station(["sawyer"], 110, 2, 1, { size: [2, 1], cost: 90 }),
  drying_shed: station([], 50, 2, 0),
  planing: station(["carpenter"], 28, 1, 1),
  // The brickworks: to mix, to mould, to dry, to fire.
  clay_mixer: station(["brickmaker"], 30, 1, 1),
  brick_mould: station(["brickmaker"], 40, 1, 1),
  drying_yard: station([], 130, 4, 0, { size: [2, 2] }),
  brick_kiln: station(["brickmaker"], 200, 4, 1, { size: [2, 2], cost: 120 }),
  // The glassworks of Murano: to sort the sand, to melt, to blow, to anneal; an inspection.
  sand_sorting: station(["labourer"], 25, 1, 1),
  glass_furnace: station(["glassblower"], 150, 3, 1, { size: [2, 2], cost: 150 }),
  blowing: station(["glassblower"], 40, 1, 1, { wear: 4 }),
  annealing_arch: station([], 50, 2, 0, { size: [2, 1] }),
  glass_inspection: station(["glassblower"], 1, 1, 1, { quality: 1_200, cost: 120 }),
  // The loom: to card, to spin (the natural bottleneck), to weave, to full.
  carding: station(["weaver"], 30, 1, 1),
  spinning_wheel: station(["weaver"], 65, 1, 1),
  loom_frame: station(["weaver"], 90, 2, 1, { size: [2, 1], cost: 90 }),
  fulling: station(["labourer"], 70, 2, 1),
  // The tailor: to cut, to sew (three seats), to embroider (the exquisite), to press.
  cutting_table: station(["tailor"], 40, 1, 1),
  sewing_bench: station(["tailor"], 150, 2, 3, { size: [2, 1] }),
  embroidery: station(["tailor"], 90, 1, 1, { wear: 3 }),
  pressing: station(["tailor"], 30, 1, 1),
  cloth_inspection: station(["tailor"], 1, 1, 1, { quality: 1_200, cost: 120 }),
  // The mirrorworks: to cut the glass, to polish, to silver, to frame; an inspection.
  glass_cutting: station(["mirrorer"], 40, 1, 1),
  polishing: station(["mirrorer"], 70, 1, 1),
  silvering: station(["mirrorer"], 90, 1, 1, { cost: 120 }),
  framing: station(["carpenter"], 50, 1, 1),
  mirror_inspection: station(["mirrorer"], 1, 1, 1, { quality: 1_500, cost: 150 }),
  // The spicery: to sort, to grind, to dose, to pack — slow cycles, quality first.
  spice_sorting: station(["spicer"], 40, 1, 1),
  mortar: station(["spicer"], 75, 1, 1),
  dosing: station(["spicer"], 50, 1, 1),
  packing: station(["labourer"], 30, 1, 1),
  spice_inspection: station(["spicer"], 1, 1, 1, { quality: 1_500, cost: 120 }),
};

type Kind = keyof typeof STATIONS;
const chain = (...stages: [string, Kind[]][]) =>
  stages.map(([code, stations]) => ({ code, stations }));

const BUILDINGS: Interior["buildings"] = {
  farm: {
    doors: { in: t(-1, 0), out: t(4, 1) },
    stages: chain(["sow", ["furrow"]], ["reap", ["sickle"]], ["thresh", ["threshing_floor"]]),
    unitsPerLot: 8,
    preset: [at("furrow", 0, 0), at("sickle", 1, 0), at("threshing_floor", 2, 1)],
  },
  clay_pit: {
    doors: { in: t(-1, 1), out: t(4, 1) },
    // The well.
    walls: [t(3, 0)],
    stages: chain(["dig", ["clay_pick"]], ["wash", ["wash_tub"]]),
    unitsPerLot: 8,
    preset: [at("clay_pick", 0, 1), at("wash_tub", 1, 1)],
  },
  lumber_camp: {
    doors: { in: t(-1, 0), out: t(4, 2) },
    stages: chain(["fell", ["felling"]], ["limb", ["limbing"]], ["stack", ["stacking"]]),
    unitsPerLot: 11,
    preset: [at("felling", 0, 0), at("limbing", 1, 1), at("stacking", 2, 2)],
  },
  sand_pit: {
    doors: { in: t(-1, 1), out: t(4, 1) },
    stages: chain(["dredge", ["dredge"]], ["sieve", ["sieve"]]),
    unitsPerLot: 8,
    preset: [at("dredge", 0, 1), at("sieve", 2, 1)],
  },
  sheepfold: {
    doors: { in: t(-1, 0), out: t(4, 1) },
    stages: chain(["shear", ["shearing"]], ["sort", ["wool_sorting"]]),
    unitsPerLot: 8,
    preset: [at("shearing", 0, 0), at("wool_sorting", 2, 1)],
  },
  mill: {
    doors: { in: t(-1, 1), out: t(4, 1) },
    stages: chain(["sort", ["grain_sorting"]], ["grind", ["millstone"]], ["bolt", ["bolting"]]),
    unitsPerLot: 8,
    preset: [at("grain_sorting", 0, 1), at("millstone", 1, 0), at("bolting", 3, 2)],
  },
  bakery: {
    doors: { in: t(-1, 0), out: t(4, 1) },
    stages: chain(
      ["knead", ["kneading"]],
      ["shape", ["shaping"]],
      ["bake", ["bread_oven"]],
      ["cool", ["cooling_rack"]],
    ),
    unitsPerLot: 10,
    preset: [
      at("kneading", 0, 0),
      at("shaping", 1, 0),
      at("bread_oven", 0, 2),
      at("cooling_rack", 3, 1),
    ],
  },
  sawmill: {
    doors: { in: t(-1, 0), out: t(4, 2) },
    // The canal that crosses the hall, down its fourth column.
    walls: [0, 1, 2, 3, 4, 5].map((y) => t(3, y)),
    stages: chain(
      ["bark", ["barking"]],
      ["saw", ["saw_bench"]],
      ["dry", ["drying_shed"]],
      ["plane", ["planing"]],
    ),
    unitsPerLot: 6,
    preset: [
      at("barking", 0, 0),
      at("saw_bench", 1, 0),
      at("drying_shed", 2, 1),
      at("planing", 1, 2),
    ],
  },
  brickworks: {
    doors: { in: t(-1, 0), out: t(4, 1) },
    stages: chain(
      ["mix", ["clay_mixer"]],
      ["mould", ["brick_mould"]],
      ["dry", ["drying_yard"]],
      ["fire", ["brick_kiln"]],
    ),
    unitsPerLot: 6,
    preset: [
      at("clay_mixer", 0, 0),
      at("brick_mould", 1, 0),
      at("drying_yard", 0, 1),
      at("brick_kiln", 2, 1),
    ],
  },
  glassworks: {
    doors: { in: t(-1, 0), out: t(4, 2) },
    stages: chain(
      ["sort", ["sand_sorting"]],
      ["melt", ["glass_furnace"]],
      ["blow", ["blowing"]],
      ["anneal", ["annealing_arch"]],
    ),
    common: ["glass_inspection"],
    unitsPerLot: 5,
    preset: [
      at("sand_sorting", 0, 0),
      at("glass_furnace", 1, 0),
      at("blowing", 3, 0),
      at("annealing_arch", 2, 2),
    ],
  },
  loom: {
    doors: { in: t(-1, 0), out: t(4, 2) },
    stages: chain(
      ["card", ["carding"]],
      ["spin", ["spinning_wheel"]],
      ["weave", ["loom_frame"]],
      ["full", ["fulling"]],
    ),
    unitsPerLot: 4,
    preset: [
      at("carding", 0, 0),
      at("spinning_wheel", 1, 0),
      at("loom_frame", 0, 1),
      at("fulling", 3, 2),
    ],
  },
  tailor: {
    doors: { in: t(-1, 0), out: t(4, 2) },
    stages: chain(
      ["cut", ["cutting_table"]],
      ["sew", ["sewing_bench"]],
      ["embroider", ["embroidery"]],
      ["press", ["pressing"]],
    ),
    common: ["cloth_inspection"],
    unitsPerLot: 2,
    preset: [
      at("cutting_table", 0, 0),
      at("sewing_bench", 1, 0),
      at("embroidery", 0, 2),
      at("pressing", 3, 2),
    ],
  },
  mirrorworks: {
    doors: { in: t(-1, 0), out: t(4, 1) },
    stages: chain(
      ["cut", ["glass_cutting"]],
      ["polish", ["polishing"]],
      ["silver", ["silvering"]],
      ["frame", ["framing"]],
    ),
    common: ["mirror_inspection"],
    unitsPerLot: 2,
    preset: [
      at("glass_cutting", 0, 0),
      at("polishing", 1, 0),
      at("silvering", 2, 0),
      at("framing", 3, 1),
    ],
  },
  spicery: {
    doors: { in: t(-1, 1), out: t(4, 1) },
    stages: chain(
      ["sort", ["spice_sorting"]],
      ["grind", ["mortar"]],
      ["dose", ["dosing"]],
      ["pack", ["packing"]],
    ),
    common: ["spice_inspection"],
    unitsPerLot: 2,
    preset: [
      at("spice_sorting", 0, 1),
      at("mortar", 1, 1),
      at("dosing", 2, 1),
      at("packing", 3, 1),
    ],
  },
};

export const venice1450Interior: Interior = {
  floorAt: [
    [1, 4, 3],
    [3, 5, 3],
    [5, 5, 4],
    [8, 6, 4],
    [11, 7, 5],
    [15, 8, 5],
    [20, 9, 6],
  ] as [number, number, number][],
  handlingSPerTile: 4,
  conveyorHandlingS: 1,
  buffer: { max: 8, lossBps: 800, fullAt: 4 },
  wear: { slowdownBps: 4_000, floorBps: 9_000, careCostDucats: 20 },
  fatigue: { perHourBps: 400, restPerHourBps: 800, floorBps: 8_500 },
  // A pace of 10 000 is the default plan worn and tired (lot A8): a house that never mends nor
  // rests its workshops makes no less than before the insides; one that tends them makes more.
  reference: "worn",
  // A full hall makes twice its default plan worn (lot A8): its level grows it beyond.
  maxPaceBps: 20_000,
  tradeFit: { same: 10_000, labourer: 7_000, other: 5_000 },
  skillPerLevelBps: 150,
  care: { slowdownBps: 4_000, qualityBps: 5_000 },
  hands: { hireCostDucats: 40, perSeat: 2 },
  conveyorCostDucats: 15,
  refundBps: 5_000,
  // The knowledge of the craft opens the higher stations (decided 6 November 2026): level 4 with
  // the mestiere, level 5 with the bottega.
  unlocks: { baseLevel: 3, byKnowledge: { mestiere: 4, bottega: 5 } },
  stations: STATIONS,
  buildings: BUILDINGS,
};

/** The worlds of Venice on square tiles, with the workshops' insides (not switched on). */
export const venice1450EmpireInterior: EmpireSettingsInput = {
  ...venice1450EmpireSquare,
  interior: venice1450Interior,
};
