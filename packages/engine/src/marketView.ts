import { bestPrice } from "./market.js";
import type { Deniers } from "./money.js";
import { type WorldContext, type WorldState, dayIndex } from "./state.js";

/** What any player can see of the market: best prices and recent average prices. */
export class MarketView {
  constructor(
    readonly ctx: WorldContext,
    readonly state: () => WorldState,
    readonly now: () => number,
  ) {}

  reference(resource: string): Deniers {
    return this.ctx.settings.referencePrices[resource] ?? 0n;
  }

  /** Recent volume-weighted price over `days`, or the reference price when nothing traded. */
  fair(resource: string, days = 3): Deniers {
    const state = this.state();
    const today = dayIndex(this.ctx, this.now());
    let volume = 0;
    let value = 0n;
    for (let d = today - days + 1; d <= today; d++) {
      const stat = state.priceStats[resource]?.[d];
      if (stat) {
        volume += stat.volume;
        value += stat.value;
      }
    }
    return volume > 0 ? value / BigInt(volume) : this.reference(resource);
  }

  bestBid(resource: string, excludePlayer?: string): Deniers | undefined {
    return bestPrice(this.state(), resource, "buy", { excludePlayer });
  }

  bestAsk(resource: string, excludePlayer?: string): Deniers | undefined {
    return bestPrice(this.state(), resource, "sell", { excludePlayer });
  }
}

/** price × factor, for decisions (not accounting). */
export function scale(price: Deniers, factor: number): Deniers {
  return (price * BigInt(Math.round(factor * 10_000))) / 10_000n;
}
