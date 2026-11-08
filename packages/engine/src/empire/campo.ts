import type { EmpireHouse, EmpireOrder, PlayerId } from "../state.js";
import { DAY_MS } from "../state.js";
import {
  type TerraBuilding,
  type TerraConfig,
  type TerraState,
  breadPerDay,
  cellsOf,
  terraBuildingsOf,
} from "../terraferma.js";
import { type Tx, fail } from "../tx.js";
import { CAMPO } from "./map.js";
import type { EmpireSettings } from "./settings.js";
import { HOME_POST, storeOf, takeAt } from "./stores.js";

/**
 * The supply by road (docs/plan-terraferme-porcellana.md § 4 sexies, the owner's decisions of 8
 * November 2026). Each morning of a week the house plays, its Campo asks what the war will eat
 * that day beyond the Republic's ration: the bread, and the materials of one building to come;
 * orders paid nothing, brought by the vehicles like a city's, into the Campo's store. The war takes
 * the ration first (empire/terra.ts), then the store, then Venice's stock at `venetianBps` (half
 * again: the Signoria's carriage). Whoever brings nothing still plays; whoever brings saves goods.
 */

const venetian = (s: EmpireSettings) => s.terra.supply?.venetianBps ?? 10_000;
/** What `n` taken straight from Venice costs there, rounded up. */
const atVenice = (s: EmpireSettings, n: number) => Math.ceil((n * venetian(s)) / 10_000);

/** The building the Campo asks materials for: the first the merchant has room for. */
const NEXT: TerraBuilding[] = ["rocca", "porto", "mura", "bombarda", "borgo"];

/** The day's need of the merchant's war beyond the ration and the store, by good. */
export function campoNeed(
  map: TerraState,
  cfg: TerraConfig,
  id: PlayerId,
  rationLoaves: number,
  store: Record<string, number>,
): Record<string, number> {
  const need: Record<string, number> = {};
  const loaves = Math.ceil(breadPerDay(map, cfg, id) / 10_000) - rationLoaves;
  if (loaves > 0) need.bread = loaves;
  const cells = cellsOf(map, id).length;
  for (const kind of NEXT) {
    const def = cfg.buildings[kind];
    const goods = cfg.supply?.buildingMaterials[kind];
    if (!def || !goods || Object.keys(goods).length === 0) continue;
    if (terraBuildingsOf(map, id, kind).length >= Math.floor(cells / def.perCells)) continue;
    for (const [good, qty] of Object.entries(goods)) need[good] = (need[good] ?? 0) + qty;
    break;
  }
  for (const good of Object.keys(need)) {
    const left = (need[good] ?? 0) - (store[good] ?? 0);
    if (left > 0) need[good] = left;
    else delete need[good];
  }
  return need;
}

/**
 * Each morning (from the week's Monday) of a house in a theatre with its Campo: the day's orders,
 * in place of the day before's (an order is a wish, not goods: nothing is lost).
 */
export function askCampo(
  h: EmpireHouse,
  map: TerraState,
  cfg: TerraConfig,
  s: EmpireSettings,
  id: PlayerId,
  week: number,
  weekStart: number,
  now: number,
): void {
  if (!h.camp || !s.terra.supply || !map.players[id]) return;
  const day = Math.max(0, Math.floor((now - weekStart) / DAY_MS));
  if (h.campo?.week === week && h.campo.day === day) return;
  const store = h.campo?.stock ?? {};
  const need = campoNeed(map, cfg, id, s.terra.rationBread, store);
  const list: EmpireOrder[] = Object.entries(need).map(([good, qty]) => ({
    id: `${CAMPO}#w${week}d${day}:${good}`,
    city: CAMPO,
    good,
    qty,
    pay: 0n,
  }));
  h.orders = { ...(h.orders ?? {}), [CAMPO]: { next: now, seq: day + 1, list } };
  h.campo = { stock: store, day, week };
}

/** Takes the war's goods: the Campo's store first, the rest from Venice at half again. */
export function takeForWar(
  tx: Tx,
  h: EmpireHouse,
  playerId: PlayerId,
  s: EmpireSettings,
  goods: Record<string, number>,
  ref: string,
): void {
  const store = { ...(h.campo?.stock ?? {}) };
  const plan = Object.entries(goods).map(([good, qty]) => {
    const fromStore = Math.min(qty, store[good] ?? 0);
    return { good, fromStore, venice: atVenice(s, qty - fromStore) };
  });
  for (const p of plan)
    if (storeOf(tx, h, playerId, HOME_POST, p.good) < p.venice) fail("insufficient_stock");
  for (const p of plan) {
    if (p.fromStore > 0) store[p.good] = (store[p.good] ?? 0) - p.fromStore;
    takeAt(tx, h, playerId, HOME_POST, p.good, p.venice, "terraferma", ref);
  }
  if (h.campo || plan.some((p) => p.fromStore > 0))
    h.campo = { day: h.campo?.day ?? -1, week: h.campo?.week ?? -1, stock: store };
}

/** The troops' loaves beyond the ration: the store first, then Venice at half again; how many. */
export function breadForWar(
  tx: Tx,
  h: EmpireHouse,
  playerId: PlayerId,
  s: EmpireSettings,
  loaves: number,
  ref: string,
): number {
  const stock = h.campo?.stock.bread ?? 0;
  const fromStore = Math.min(loaves, stock);
  if (fromStore > 0 && h.campo)
    h.campo = { ...h.campo, stock: { ...h.campo.stock, bread: stock - fromStore } };
  const rest = loaves - fromStore;
  const have = storeOf(tx, h, playerId, HOME_POST, "bread");
  const fromVenice = Math.min(rest, Math.floor((have * 10_000) / venetian(s)));
  takeAt(tx, h, playerId, HOME_POST, "bread", atVenice(s, fromVenice), "terraferma_rations", ref);
  return fromStore + fromVenice;
}
