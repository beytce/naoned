import { draw, pickWeighted } from "./draw.js";
import type { WorldSettings } from "./settings.js";

export type Mutator = NonNullable<WorldSettings["mutators"]>["catalog"][number];
export type MutatorOverride = Mutator["override"];

/**
 * The mutator of a month (E2-9 of the experts): none before `from`, then one of the catalog drawn
 * by its weight, the same for everyone and on every call (announced on the 24th of the month
 * before, so nothing to keep secret).
 */
export function seasonMutator(settings: WorldSettings, month: string): Mutator | null {
  const cfg = settings.mutators;
  if (!cfg || cfg.catalog.length === 0 || month < cfg.from) return null;
  const value = draw({ seed: "mutator", startAt: 0 } as Parameters<typeof draw>[0], month);
  return pickWeighted(cfg.catalog, value) ?? null;
}

const times = (n: number, bps: number) => Math.floor((n * bps) / 10_000);

/** The settings of a month under its mutator: only the keys of the white list, by their factors. */
export function applyMutator(settings: WorldSettings, override: MutatorOverride): WorldSettings {
  const out: WorldSettings = { ...settings };
  // The cities' prices and capacities through the month's factor: their sales and the road's
  // orders alike (`marketCityBps`).
  if (override.cityPriceBps || override.cityCapacityBps) {
    out.monthBps = {
      price: { ...settings.monthBps.price, ...override.cityPriceBps },
      capacity: { ...settings.monthBps.capacity, ...override.cityCapacityBps },
    };
  }
  if (
    settings.muda &&
    (override.mudaLotBps !== undefined || override.mudaPriceRiseBps !== undefined)
  ) {
    const m = settings.muda;
    out.muda = {
      ...m,
      lotPerActivePlayer:
        override.mudaLotBps === undefined
          ? m.lotPerActivePlayer
          : Object.fromEntries(
              Object.entries(m.lotPerActivePlayer).map(([r, q]) => [
                r,
                times(q, override.mudaLotBps ?? 10_000),
              ]),
            ),
      priceRiseBps:
        override.mudaPriceRiseBps === undefined
          ? m.priceRiseBps
          : times(m.priceRiseBps, override.mudaPriceRiseBps),
    };
  }
  if (settings.terraferma && override.milanTroopsBps !== undefined) {
    const t = settings.terraferma;
    out.terraferma = {
      ...t,
      milan: { ...t.milan, troops: times(t.milan.troops, override.milanTroopsBps) },
    };
  }
  return out;
}
