import {
  type Building,
  type Deniers,
  MARKET_MAKER,
  type WorldContext,
  type WorldState,
  allowedHere,
  bestPrice,
  bookSide,
  cashAccount,
  costForLevel,
  dayIndex,
  escrowAccount,
  freeBatches,
  marketMakerQuotaLeft,
  marketMakerQuotes,
  marketMakerReference,
  netWorth,
  openProjects,
  portPrices,
  quoteCitySale,
  recipesFor,
  shipStatus,
  shipUpkeep,
  shipsOf,
  stockUnitValue,
  upkeepPerDay,
  vwap,
  watchedRoutes,
} from "@comptoirs/engine";
import { activeEvent, contractsFor, nextEvent } from "@comptoirs/engine";
import { titleFor } from "./profile.js";

/** Static data of a world, for the client: names, recipes, costs. */
export function catalog(ctx: WorldContext, world: { name: string }) {
  const { theme, settings } = ctx;
  return {
    world: {
      name: world.name,
      startsAt: ctx.startAt,
      seasonDays: settings.seasonDays,
      registrationClosesDay: settings.registrationClosesDay,
    },
    resources: theme.resources,
    regions: theme.regions.map((r) => ({
      ...r,
      startingBuildings: settings.startingBuildings[r.code] ?? [],
    })),
    cities: theme.cities.map((c) => ({
      ...c,
      buys: Object.keys(settings.cities[c.code] ?? {}),
    })),
    buildings: theme.buildings.map((b) => ({
      ...b,
      recipe: recipesFor(theme, b.type)[0] ?? null,
      cost: costForLevel(ctx, b.type, 1),
      /** Regions where it may be built (null: anywhere). */
      regions: settings.buildingRegions[b.type] ?? null,
      upkeepPerDay: settings.buildings[b.type]?.upkeepPerDay ?? 0n,
    })),
    ports: theme.ports ?? [],
    destinations: settings.expeditions.destinations,
    maxGalleys: settings.expeditions.maxActive,
    ships: (theme.ships ?? []).flatMap((t) => {
      const def = settings.ships.types[t.type];
      return def ? [{ ...t, ...def }] : [];
    }),
    fleet: { maxPerPlayer: settings.ships.maxPerPlayer, portDuesBps: settings.ships.portDuesBps },
    privateers: settings.privateers,
    rations: settings.rations,
    referencePrices: settings.referencePrices,
    rules: {
      maxBuildings: settings.maxBuildings,
      maxBuildingLevel: settings.maxBuildingLevel,
      productionQueueMaxHours: settings.productionQueueMaxHours,
      marketTaxBps: settings.marketTaxBps,
      instantOrderSlippageBps: settings.instantOrderSlippageBps,
      regionBonusBps: settings.regionBonusBps,
      levelYieldBonusBps: settings.levelYieldBonusBps,
    },
  };
}

function buildingView(ctx: WorldContext, state: WorldState, b: Building, now: number) {
  const recipe = recipesFor(ctx.theme, b.type)[0];
  const inv = state.inventories[b.playerId] ?? {};
  let affordable = Number.POSITIVE_INFINITY;
  for (const [res, perBatch] of Object.entries(recipe?.inputs ?? {})) {
    const need = (perBatch ?? 0) * b.level;
    if (need > 0) affordable = Math.min(affordable, Math.floor((inv[res]?.available ?? 0) / need));
  }
  const player = state.players[b.playerId];
  const room = recipe ? freeBatches(ctx, b, recipe.code, now, player) : 0;
  const local = allowedHere(ctx, player?.region ?? "", b.type);
  const job = b.job
    ? {
        ...b.job,
        ready: Math.min(b.job.batches, Math.floor((now - b.job.startedAt) / b.job.batchMs)),
        endsAt: b.job.startedAt + b.job.batches * b.job.batchMs,
      }
    : null;
  return {
    id: b.id,
    type: b.type,
    level: b.level,
    recipe: recipe?.code ?? null,
    job,
    canStart: Math.min(room, affordable),
    upgradeCost:
      local && b.level < ctx.settings.maxBuildingLevel
        ? costForLevel(ctx, b.type, b.level + 1)
        : null,
    /** Built before raw materials became local: still producing, no more upgrades. */
    outOfRegion: !local,
    upkeepPerDay: upkeepPerDay(ctx, b),
  };
}

interface BookLine {
  price: Deniers;
  quantity: number;
  /** Player id, or "market_maker" for the Fondaco. */
  by: string;
  mine: boolean;
}

/** Everything one player sees, computed from the engine state. Amounts in deniers. */
export function playerView(
  ctx: WorldContext,
  state: WorldState,
  playerId: string,
  now: number,
  tutorialSteps: string[],
  /** Players left out of the rankings (retired bots). */
  hidden: Set<string> = new Set(),
) {
  const player = state.players[playerId];
  if (!player) return null;
  const buildings = Object.values(state.buildings)
    .filter((b) => b.playerId === playerId)
    .sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)));

  const market = ctx.theme.resources.map((r) => {
    const reference = ctx.settings.referencePrices[r.code] ?? 0n;
    const mm = marketMakerQuotes(ctx, marketMakerReference(ctx, state, r.code, now), now);
    return {
      resource: r.code,
      reference,
      recentPrice: vwap(ctx, state, r.code, now, 3) ?? null,
      bestBid: bestPrice(state, r.code, "buy", { excludePlayer: playerId }) ?? null,
      bestAsk: bestPrice(state, r.code, "sell", { excludePlayer: playerId }) ?? null,
      marketMaker: mm,
      unitValue: stockUnitValue(ctx, state, r.code, now),
    };
  });

  const cityQuotes: { city: string; resource: string; unitPrice: Deniers }[] = [];
  for (const [city, demands] of Object.entries(ctx.settings.cities)) {
    for (const resource of Object.keys(demands)) {
      const unitPrice = quoteCitySale(ctx, state, city, resource, 1, now);
      if (unitPrice !== undefined) cityQuotes.push({ city, resource, unitPrice });
    }
  }

  // The order book of each resource: best five offers on each side, with who makes them.
  const book: Record<
    string,
    { asks: BookLine[]; bids: BookLine[]; quota: { buy: number | null; sell: number | null } }
  > = {};
  for (const r of ctx.theme.resources) {
    const side = (s: "buy" | "sell") =>
      bookSide(state, r.code, s)
        .slice(0, 5)
        .map((o) => ({
          price: o.price,
          quantity: o.remaining,
          by: o.playerId,
          mine: o.playerId === playerId,
        }));
    book[r.code] = {
      asks: side("sell"),
      bids: side("buy"),
      quota: marketMakerQuotaLeft(ctx, state, playerId, r.code, now),
    };
  }

  // Where the player stands in the season: the goal, always in sight.
  const table = ranking(ctx, state, now, new Map(), hidden);
  const mine = table.find((r) => r.playerId === playerId);
  const worth = netWorth(ctx, state, playerId, now);

  const today = dayIndex(ctx, now);
  const done = state.contractsDone?.[playerId];
  const doneIds = done && done.day === today ? done.ids : [];
  const contracts = contractsFor(ctx, playerId, today).map((c) => ({
    ...c,
    done: doneIds.includes(c.id),
  }));
  const levels = buildings.filter((b) => b.type !== "palazzo").reduce((n, b) => n + b.level, 0);
  const describe = (e: ReturnType<typeof activeEvent>) =>
    e && { code: e.code, city: e.city ?? null, startsAt: e.startsAt, endsAt: e.endsAt };
  // Boardings that touched this player, as victim or corsair.
  const hitsOn = new Map<
    string,
    { raider: string; success: boolean; taken: Record<string, number> }
  >();
  for (const r of Object.values(state.raids ?? {})) {
    for (const h of r.hits) {
      if (h.victimId === playerId)
        hitsOn.set(h.expeditionId, { raider: r.playerId, success: h.success, taken: h.taken });
    }
  }
  const expeditions = Object.values(state.expeditions ?? {})
    .filter((e) => e.playerId === playerId)
    .sort((a, b) => b.departAt - a.departAt)
    .slice(0, 10)
    .map((e) => ({ ...e, boarding: hitsOn.get(e.id) ?? null }));
  const ships = shipsOf(state, playerId).map((s) => ({
    ...s,
    status: shipStatus(state, s, now),
  }));
  const raids = Object.values(state.raids ?? {})
    .filter((r) => r.playerId === playerId)
    .sort((a, b) => b.startAt - a.startAt)
    .slice(0, 10);
  const ports = Object.fromEntries(
    Object.keys(ctx.settings.expeditions.destinations).map((p) => [p, portPrices(ctx, p, now)]),
  );
  // The gazette's sea news: the latest successful boardings in the world.
  const seaNews = Object.values(state.raids ?? {})
    .flatMap((r) =>
      r.hits
        .filter((h) => h.success)
        .map((h) => ({
          raider: r.playerId,
          victim: h.victimId,
          route: r.route,
          at: h.at,
          taken: h.taken,
        })),
    )
    .sort((a, b) => b.at - a.at)
    .slice(0, 5);

  let upkeep = 0n;
  for (const b of buildings) upkeep += upkeepPerDay(ctx, b);
  for (const s of shipsOf(state, playerId)) upkeep += shipUpkeep(ctx, s);

  return {
    serverTime: now,
    day: dayIndex(ctx, now) + 1,
    player: {
      id: player.id,
      region: player.region,
      joinedAt: player.joinedAt,
      upkeepDefaultUntil: player.upkeepDefaultUntil,
    },
    cash: state.accounts[cashAccount(playerId)] ?? 0n,
    escrow: state.accounts[escrowAccount(playerId)] ?? 0n,
    upkeepPerDay: upkeep,
    netWorth: worth,
    standing: {
      rank: mine?.rank ?? null,
      players: table.length,
      title: titleFor(worth.total),
      seasonEndsAt: ctx.startAt + ctx.settings.seasonDays * 86_400_000,
    },
    inventory: ctx.theme.resources.map((r) => ({
      resource: r.code,
      available: state.inventories[playerId]?.[r.code]?.available ?? 0,
      escrow: state.inventories[playerId]?.[r.code]?.escrow ?? 0,
    })),
    buildings: buildings.map((b) => buildingView(ctx, state, b, now)),
    market,
    book,
    cityQuotes,
    projects: openProjects(state.projects, now),
    contracts,
    gazette: { current: describe(activeEvent(ctx, now)), next: describe(nextEvent(ctx, now)) },
    expeditions,
    ships,
    raids,
    ports,
    watchedRoutes: watchedRoutes(state, now),
    seaNews,
    rations: {
      resource: ctx.settings.rations.resource,
      perDay: levels * ctx.settings.rations.perLevelPerDay,
      hungryUntil: player.hungryUntil ?? 0,
    },
    tutorial: tutorialSteps,
    openOrders: Object.values(state.orders).filter((o) => o.playerId === playerId),
  };
}

export function ranking(
  ctx: WorldContext,
  state: WorldState,
  now: number,
  pseudos: Map<string, string | null>,
  hidden: Set<string> = new Set(),
) {
  const unitValues: Record<string, Deniers> = {};
  for (const r of ctx.theme.resources) unitValues[r.code] = stockUnitValue(ctx, state, r.code, now);
  return Object.keys(state.players)
    .filter((id) => id !== MARKET_MAKER && !hidden.has(id))
    .map((id) => ({
      playerId: id,
      pseudo: pseudos.get(id) ?? null,
      region: state.players[id]?.region ?? "",
      netWorth: netWorth(ctx, state, id, now, unitValues).total,
    }))
    .sort((a, b) => (a.netWorth > b.netWorth ? -1 : a.netWorth < b.netWorth ? 1 : 0))
    .map((row, i) => ({ rank: i + 1, ...row }));
}
