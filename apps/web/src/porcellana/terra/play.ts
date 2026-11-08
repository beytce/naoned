/**
 * The Terraferma's interface on Porcellana's board (docs/plan-terraferme-porcellana.md § 3, lot
 * T5), the pure part: what a touched cell offers (its card, and the dock its red key opens), what a
 * front would do before it leaves, and who stays in focus (the merchant, its allies, its direct
 * neighbours; the far ones fade).
 */
import { terraNeighbors } from "@comptoirs/engine";
import type { TerraView } from "../../game/types.js";

export type DockKind = "front" | "build" | "lands" | "holder" | "aim" | "place";

export interface CellCardData {
  kind: "water" | "place" | "capital" | "mine" | "border" | "far" | "ally" | "theirs";
  /** Its holder (-1: free land). */
  holder: number;
  /** Its terrain's letter, the city's code standing on it, the building on it. */
  terrain: string;
  city: string | null;
  building: TerraView["buildings"][number]["kind"] | null;
  /** What a front pays to take it (a cell along the border). */
  cost: number | null;
  /** Defenders a cell of its holder (a merchant's). */
  defense: number | null;
  dock: DockKind | null;
}

const mapOf = (v: TerraView) => ({
  width: v.map.width,
  height: v.map.height,
  ...(v.map.grid === "square" ? { grid: "square" as const } : {}),
});

export function cellCard(v: TerraView, cell: number, placing = false): CellCardData {
  const terrain = v.map.terrain[cell] ?? "p";
  const holder = v.owner[cell] ?? -1;
  const h = v.holders[holder];
  const base = {
    holder,
    terrain,
    city: v.map.cities.find((c) => c.cell === cell)?.code ?? null,
    building: v.buildings.find((b) => b.cell === cell)?.kind ?? null,
    cost: null,
    defense: h && !h.nation && h.cells > 0 ? Math.floor(h.troops / h.cells) : null,
  };
  if (terrain === "w") return { ...base, kind: "water", dock: null };
  if (!v.me)
    return {
      ...base,
      kind: placing && holder < 0 ? "place" : "far",
      dock: placing && holder < 0 ? "place" : null,
    };
  if (h?.me) {
    if (cell === v.me.capital || cell === h.capital)
      return { ...base, kind: "capital", dock: "lands" };
    if (base.building === "bombarda" && v.me.bombard.shots > 0)
      return { ...base, kind: "mine", dock: "aim" };
    return { ...base, kind: "mine", dock: "build" };
  }
  if (h?.ally) return { ...base, kind: "ally", dock: "holder" };
  const cost = v.costs[cell];
  if (cost !== undefined) return { ...base, kind: "border", cost, dock: "front" };
  if (h) return { ...base, kind: "theirs", dock: "holder" };
  return { ...base, kind: "far", dock: null };
}

export interface FrontPlan {
  /** The troops it takes along. */
  sent: number;
  /**
   * The cells they pay for, at most: at the first cell's price, never more than the rival holds.
   * An estimate (the price moves as the rival thins), said « environ ».
   */
  cells: number;
  /** The troops that come home once those cells are paid. */
  back: number;
  /** The march's length in hours of day (free land is taken slower). */
  hours: number;
  /** Defenders a cell at home, before and after it leaves. */
  defenseBefore: number;
  defenseAfter: number;
  /** Home left with no defender at all where it had some. */
  bare: boolean;
  /** A first attack on a merchant: the camp is no longer safe till the week's end. */
  losesSafety: boolean;
  /** It may leave: enough troops for the first cell, a front free. */
  ok: boolean;
}

export function frontPlan(v: TerraView, cell: number, shareBps: number): FrontPlan {
  const me = v.me;
  const cost = v.costs[cell] ?? Number.POSITIVE_INFINITY;
  const troops = me?.troops ?? 0;
  const mine = Math.max(1, me?.cells ?? 1);
  const sent = Math.floor((troops * shareBps) / 10_000);
  const out = v.fronts.filter((f) => f.mine).length;
  const holder = v.owner[cell] ?? -1;
  const rival = v.holders[holder];
  const paid = Number.isFinite(cost) && cost > 0 ? Math.floor(sent / cost) : 0;
  const cells = rival ? Math.min(paid, rival.cells) : paid;
  const minutes = holder < 0 ? (v.rules.neutralMinutes ?? 0) : (v.rules.cellMinutes ?? 0);
  const defenseBefore = Math.floor(troops / mine);
  const defenseAfter = Math.floor((troops - sent) / mine);
  return {
    sent,
    cells,
    back: Number.isFinite(cost) ? sent - cells * cost : sent,
    hours: Math.ceil((cells * minutes) / 60),
    defenseBefore,
    defenseAfter,
    bare: defenseBefore > 0 && defenseAfter === 0,
    losesSafety: !!rival && !rival.nation && !rival.me && !!v.rules.peacefulSafe && !me?.aggressor,
    ok: !!me && sent >= cost && shareBps >= v.rules.minShareBps && out < v.rules.frontsMax,
  };
}

/** The holders in focus: the merchant, its allies, and every holder touching its land. */
export function focusOf(v: TerraView): Set<number> {
  const me = v.holders.findIndex((h) => h.me);
  const out = new Set<number>();
  if (me < 0) return out;
  out.add(me);
  v.holders.forEach((h, i) => {
    if (h.ally) out.add(i);
  });
  const map = mapOf(v);
  v.owner.forEach((o, c) => {
    if (o !== me) return;
    for (const n of terraNeighbors(map, c)) {
      const k = v.owner[n] ?? -1;
      if (k >= 0) out.add(k);
    }
  });
  return out;
}
