import {
  type Deniers,
  type Effects,
  MARKET_MAKER,
  SINK_ACCOUNT,
  SOURCE_ACCOUNT,
  type WorldContext,
  type WorldState,
  activePlayerCount,
  bestPrice,
  cashAccount,
  escrowAccount,
  isActive,
  netWorth,
  stockUnitValue,
} from "@comptoirs/engine";

export interface DayFlows {
  created: Map<string, Deniers>;
  destroyed: Map<string, Deniers>;
  /** Per resource: volume and value between players, and with the market maker. */
  playerVolume: Map<string, number>;
  playerValue: Map<string, Deniers>;
  mmVolume: Map<string, number>;
  mmValue: Map<string, Deniers>;
  trades: number;
  playerTrades: number;
  citySaleUnits: number;
  projectUnits: number;
}

export function emptyFlows(): DayFlows {
  return {
    created: new Map(),
    destroyed: new Map(),
    playerVolume: new Map(),
    playerValue: new Map(),
    mmVolume: new Map(),
    mmValue: new Map(),
    trades: 0,
    playerTrades: 0,
    citySaleUnits: 0,
    projectUnits: 0,
  };
}

function add<K>(map: Map<K, bigint>, key: K, v: bigint) {
  map.set(key, (map.get(key) ?? 0n) + v);
}
function addN<K>(map: Map<K, number>, key: K, v: number) {
  map.set(key, (map.get(key) ?? 0) + v);
}

export function recordFlows(flows: DayFlows, fx: Effects): void {
  for (const e of fx.ledger) {
    if (e.from === SOURCE_ACCOUNT) add(flows.created, e.reason, e.amount);
    if (e.to === SINK_ACCOUNT) add(flows.destroyed, e.reason, e.amount);
  }
  for (const t of fx.trades) {
    flows.trades++;
    const value = t.price * BigInt(t.quantity);
    if (t.buyerId === MARKET_MAKER || t.sellerId === MARKET_MAKER) {
      addN(flows.mmVolume, t.resource, t.quantity);
      add(flows.mmValue, t.resource, value);
    } else {
      flows.playerTrades++;
      addN(flows.playerVolume, t.resource, t.quantity);
      add(flows.playerValue, t.resource, value);
    }
  }
  for (const m of fx.stock) {
    if (m.reason === "city_sale") flows.citySaleUnits -= m.quantity;
    if (m.reason === "project_delivery") flows.projectUnits -= m.quantity;
  }
}

export interface DailyMetrics {
  day: number;
  registered: number;
  active: number;
  moneySupply: Deniers;
  /** Money held by active players, per active player (dormant accounts excluded). */
  moneyPerActive: Deniers;
  created: Deniers;
  destroyed: Deniers;
  createdBy: Record<string, Deniers>;
  destroyedBy: Record<string, Deniers>;
  priceIndex: number;
  gini: number;
  trades: number;
  playerTrades: number;
  playerShareOfValue: number;
  citySaleUnits: number;
  projectUnits: number;
}

export interface PriceRow {
  day: number;
  resource: string;
  vwap: Deniers | undefined;
  bestBidPlayers: Deniers | undefined;
  bestAskPlayers: Deniers | undefined;
  playerVolume: number;
  mmVolume: number;
}

export interface PlayerRow {
  day: number;
  playerId: string;
  profile: string;
  region: string;
  active: boolean;
  cash: Deniers;
  netWorth: Deniers;
}

export function gini(values: number[]): number {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  const n = v.length;
  const sum = v.reduce((a, b) => a + b, 0);
  if (n === 0 || sum <= 0) return 0;
  let weighted = 0;
  v.forEach((x, i) => {
    weighted += (i + 1) * x;
  });
  return (2 * weighted) / (n * sum) - (n + 1) / n;
}

/** Fixed basket: one unit of each resource, valued at the day's average trade price. */
export class PriceIndex {
  private base: number | undefined;
  private last = new Map<string, Deniers>();

  constructor(private readonly ctx: WorldContext) {}

  update(flows: DayFlows): number {
    let value = 0;
    for (const [res, reference] of Object.entries(this.ctx.settings.referencePrices)) {
      const vol = (flows.playerVolume.get(res) ?? 0) + (flows.mmVolume.get(res) ?? 0);
      const val = (flows.playerValue.get(res) ?? 0n) + (flows.mmValue.get(res) ?? 0n);
      if (vol > 0) this.last.set(res, val / BigInt(vol));
      value += Number(this.last.get(res) ?? reference);
    }
    if (this.base === undefined) this.base = value;
    return (100 * value) / this.base;
  }
}

export function snapshot(
  ctx: WorldContext,
  state: WorldState,
  now: number,
  day: number,
  flows: DayFlows,
  index: PriceIndex,
  bots: { id: string; profile: string; region: string }[],
): { daily: DailyMetrics; prices: PriceRow[]; players: PlayerRow[] } {
  const active = activePlayerCount(ctx, state, now);
  let money = 0n;
  let activeMoney = 0n;
  for (const p of Object.values(state.players)) {
    const held =
      (state.accounts[cashAccount(p.id)] ?? 0n) + (state.accounts[escrowAccount(p.id)] ?? 0n);
    money += held;
    if (isActive(ctx, p, now)) activeMoney += held;
  }
  const unitValues: Record<string, Deniers> = {};
  for (const r of ctx.theme.resources) unitValues[r.code] = stockUnitValue(ctx, state, r.code, now);

  const players: PlayerRow[] = [];
  const worths: number[] = [];
  for (const bot of bots) {
    const p = state.players[bot.id];
    if (!p) continue;
    const nw = netWorth(ctx, state, bot.id, now, unitValues).total;
    worths.push(Number(nw));
    players.push({
      day,
      playerId: bot.id,
      profile: bot.profile,
      region: bot.region,
      active: now - p.lastActionAt <= ctx.settings.activeWindowHours * 3_600_000,
      cash: state.accounts[cashAccount(bot.id)] ?? 0n,
      netWorth: nw,
    });
  }

  let playerValue = 0n;
  let mmValue = 0n;
  const prices: PriceRow[] = [];
  for (const r of ctx.theme.resources) {
    const pv = flows.playerValue.get(r.code) ?? 0n;
    const mv = flows.mmValue.get(r.code) ?? 0n;
    playerValue += pv;
    mmValue += mv;
    const vol = (flows.playerVolume.get(r.code) ?? 0) + (flows.mmVolume.get(r.code) ?? 0);
    prices.push({
      day,
      resource: r.code,
      vwap: vol > 0 ? (pv + mv) / BigInt(vol) : undefined,
      bestBidPlayers: bestPrice(state, r.code, "buy", { playersOnly: true }),
      bestAskPlayers: bestPrice(state, r.code, "sell", { playersOnly: true }),
      playerVolume: flows.playerVolume.get(r.code) ?? 0,
      mmVolume: flows.mmVolume.get(r.code) ?? 0,
    });
  }

  const sum = (m: Map<string, Deniers>) => [...m.values()].reduce((a, b) => a + b, 0n);
  const daily: DailyMetrics = {
    day,
    registered: Object.keys(state.players).length,
    active,
    moneySupply: money,
    moneyPerActive: active > 0 ? activeMoney / BigInt(active) : 0n,
    created: sum(flows.created),
    destroyed: sum(flows.destroyed),
    createdBy: Object.fromEntries(flows.created),
    destroyedBy: Object.fromEntries(flows.destroyed),
    priceIndex: index.update(flows),
    gini: gini(worths),
    trades: flows.trades,
    playerTrades: flows.playerTrades,
    playerShareOfValue:
      playerValue + mmValue > 0n
        ? Number((playerValue * 10_000n) / (playerValue + mmValue)) / 10_000
        : 0,
    citySaleUnits: flows.citySaleUnits,
    projectUnits: flows.projectUnits,
  };
  return { daily, prices, players };
}
