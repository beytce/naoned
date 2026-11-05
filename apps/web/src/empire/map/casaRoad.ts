import type { EmpireBuild, EmpirePayload } from "../types.js";

/** One thing the next Casa asks: the ducats, a material, the workshops at a level. */
export interface CasaStep {
  id: string;
  /** A good's code for a material, else null. */
  good: string | null;
  have: number;
  need: number;
}

/**
 * The road to the next Casa (the refonte claire, lot 3, 5 November 2026), what the Fondaco shows
 * at its foot (pure, tested): each thing it asks, what the house has of it, the share of the whole
 * (the mean of each step's, each at most full), and its site when it is being built.
 */
export function casaRoad(p: EmpirePayload): {
  level: number;
  opens: string[];
  steps: CasaStep[];
  share: number;
  building: EmpireBuild | null;
} | null {
  const view = p.view;
  const next = view?.nextCasa;
  if (!view || !next) return null;
  const cost = BigInt(next.cost || "0");
  const cash = BigInt(p.cash);
  const steps: CasaStep[] = [];
  if (cost > 0n)
    steps.push({
      id: "ducats",
      good: null,
      // In ducats (the deniers are a hundredth): the chip reads « 452 / 1 200 ».
      have: Number((cash < cost ? cash : cost) / 100n),
      need: Number(cost / 100n),
    });
  for (const [good, n] of Object.entries(next.materials))
    steps.push({ id: good, good, have: Math.min(p.stock[good] ?? 0, n), need: n });
  if (next.requires.workshops > 0)
    steps.push({
      id: "workshops",
      good: null,
      have: Math.min(
        next.requires.workshops,
        view.house.workshops.filter((w) => w.level >= next.requires.level).length,
      ),
      need: next.requires.workshops,
    });
  const share =
    steps.length === 0
      ? 1
      : steps.reduce((n, s) => n + Math.min(1, s.have / Math.max(1, s.need)), 0) / steps.length;
  return {
    level: view.house.casa + 1,
    opens: next.opens,
    steps,
    share,
    building: view.house.builds.find((b) => b.kind === "casa") ?? null,
  };
}
