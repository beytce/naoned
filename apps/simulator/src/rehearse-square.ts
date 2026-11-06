// The rehearsal of the switch to square tiles (docs/plan-porcellana.md M4): a world of Venice on
// the hexagonal map, houses that played (sectors bought, the first fondaco put down, workshops
// built and working, sites under way), then the same state read on Venice's square tiles. Every
// house is checked: no land lost, its fondaco and its workshops on tiles of their own, apart from
// the towns, no money moved, the journal's invariants held, and a tile bought at once on the new
// map. Exits 1 on the first fault.
//   npx tsx src/rehearse-square.ts [houses]
import {
  type Command,
  type EmpireHouse,
  type WorldContext,
  type WorldState,
  accumulate,
  cellAtPoint,
  cellCentreOf,
  checkInvariants,
  createWorldState,
  decide,
  empireView,
  emptyTotals,
  ensureMap,
  parseEmpireSettings,
  parseSettings,
  tileFault,
  venice1450,
  venice1450Empire,
  venice1450EmpireSquare,
  venice1450Settings,
} from "@comptoirs/engine";

const HOUSES = Number(process.argv[2] ?? 40);
const T0 = Date.UTC(2026, 10, 1);
const HOUR = 3_600_000;

const ctxOf = (empire: typeof venice1450Empire): WorldContext => ({
  theme: venice1450,
  settings: parseSettings({ ...venice1450Settings, empire }),
  startAt: T0,
});
const hexCtx = ctxOf(venice1450Empire);
const sqCtx = ctxOf(venice1450EmpireSquare);
const hexS = parseEmpireSettings(venice1450Empire);
const sqS = parseEmpireSettings(venice1450EmpireSquare);

let state: WorldState = createWorldState(hexCtx);
const totals = emptyTotals();
let now = T0;
let refused = 0;
const run = (ctx: WorldContext, cmd: Command): boolean => {
  const res = decide(ctx, state, cmd, now);
  if (!res.ok) {
    refused++;
    return false;
  }
  state = res.state;
  accumulate(totals, res.effects);
  return true;
};

// A small deterministic draw.
let seed = 7;
const rnd = () => {
  seed = (seed * 1_103_515_245 + 12_345) % 2 ** 31;
  return seed / 2 ** 31;
};

// The houses of before: each joins, puts its fondaco down, buys sectors, builds and works.
const ids = Array.from({ length: HOUSES }, (_, i) => `h${i + 1}`);
for (const id of ids) {
  run(hexCtx, { type: "empireJoin", playerId: id } as Command);
  const home = hexS.map.home;
  if (home && rnd() < 0.8)
    run(hexCtx, {
      type: "empirePlaceHome",
      playerId: id,
      cell: cellAtPoint(home.x, home.y, hexS),
      x: home.x,
      y: home.y,
    } as Command);
  const buys = Math.floor(rnd() * 4);
  for (let k = 0; k < buys; k++) {
    const v = empireView(hexCtx, state, id, now);
    const open = (v?.map?.buyable ?? []).filter((b) => b.casa <= (v?.house.casa ?? 1));
    const pick = open[Math.floor(rnd() * open.length)];
    if (pick) run(hexCtx, { type: "empireUnlockCell", playerId: id, cell: pick.cell } as Command);
  }
  const builds = Math.floor(rnd() * 3);
  for (let k = 0; k < builds; k++)
    run(hexCtx, {
      type: "empireBuildWorkshop",
      playerId: id,
      workshopType: ["farm", "lumber_camp", "clay_pit"][k] ?? "farm",
      recipe: ["grow_wheat", "cut_wood", "dig_clay"][k] ?? "grow_wheat",
    } as Command);
  now += HOUR / 4;
}
now += 6 * HOUR;

// Before: each house's land, cash, workshops.
const before = new Map(
  ids.map((id) => {
    const h = state.empire?.houses[id] as EmpireHouse;
    const copy = structuredClone(h);
    ensureMap(copy, hexS);
    return [
      id,
      {
        owned: new Set(copy.unlocked ?? []),
        cash: state.accounts[`cash:${id}`] ?? 0n,
        workshops: copy.workshops.length,
        builds: copy.builds.filter((b) => b.kind === "newWorkshop").length,
      },
    ];
  }),
);

// The switch: the same state read on the square map; each house taken up at its next command.
const faults: string[] = [];
const towns = new Set(sqS.map.cities.map((c) => c.cell));
let tilesGiven = 0;
let homes = 0;
let seatedAll = 0;
let sectorsBefore = 0;
for (const id of ids) {
  const was = before.get(id);
  if (!was) continue;
  // Its next gesture on the new map: a tile bought next to its own.
  const v = empireView(sqCtx, state, id, now);
  const next = (v?.map?.buyable ?? []).find((b) => b.casa <= (v?.house.casa ?? 1));
  if (!next) faults.push(`${id}: nothing to buy on the square map`);
  else if (!run(sqCtx, { type: "empireUnlockCell", playerId: id, cell: next.cell } as Command))
    faults.push(`${id}: a tile next to its own refused`);
  const h = state.empire?.houses[id] as EmpireHouse;
  if (h.grid !== "square") faults.push(`${id}: not taken up`);
  const owned = new Set(h.unlocked ?? []);
  tilesGiven += owned.size;
  sectorsBefore += was.owned.size;
  if (h.home) homes++;
  seatedAll += h.workshops.filter((w) => w.tile).length;
  // No land lost: every tile whose middle lay in a sector it owned is its own.
  for (const t of Object.keys(sqS.map.cells)) {
    const [x, y] = cellCentreOf(t, sqS);
    if (was.owned.has(cellAtPoint(x, y, hexS)) && !owned.has(t))
      faults.push(`${id}: tile ${t} of its sector lost`);
  }
  // Its fondaco on a tile of its own, clear of the towns.
  if (h.home) {
    const others = (h.posts ?? []).map((p): [number, number] => [p.x ?? 0, p.y ?? 0]);
    const fault = tileFault(
      sqS,
      h.home.cell,
      [h.home.x, h.home.y],
      sqS.map.cities.map((c): [number, number] => [c.x ?? 0, c.y ?? 0]),
      others,
    );
    if (fault) faults.push(`${id}: its fondaco ${fault}`);
    if (!owned.has(h.home.cell)) faults.push(`${id}: its fondaco's tile not its own`);
  }
  // Its workshops each on a tile of its own, none on a town, none sharing.
  const seated = h.workshops.map((w) => w.tile);
  if (h.workshops.length !== was.workshops + was.builds && h.workshops.length < was.workshops)
    faults.push(`${id}: workshops lost`);
  if (seated.some((t) => !t)) faults.push(`${id}: a workshop without a tile`);
  if (new Set(seated).size !== seated.length) faults.push(`${id}: two workshops on a tile`);
  for (const t of seated) {
    if (t && towns.has(t)) faults.push(`${id}: a workshop on a town`);
    if (t && !owned.has(t)) faults.push(`${id}: a workshop on a tile not its own`);
  }
  // No money moved but the tile bought.
  const cash = state.accounts[`cash:${id}`] ?? 0n;
  if (cash > was.cash) faults.push(`${id}: money given (${was.cash} → ${cash})`);
}
const broken = checkInvariants(state, totals);
for (const b of broken) faults.push(`invariant ${JSON.stringify(b)}`);

console.log(
  `${HOUSES} houses taken up on square tiles: ${sectorsBefore} sectors became ${tilesGiven} tiles, ${homes} fondaci and ${seatedAll} workshops seated, ${refused} gestures refused before the switch (a site busy, a sector of a closed region), ${faults.length} faults`,
);
if (faults.length > 0) {
  console.error(faults.slice(0, 30).join("\n"));
  process.exit(1);
}
