import {
  type Building,
  type Deniers,
  MARKET_MAKER,
  type WorldContext,
  type WorldState,
  allowedHere,
  bestPrice,
  boardRivals,
  boardTakes,
  bookSide,
  bountyFor,
  cashAccount,
  costForLevel,
  dayIndex,
  escrowAccount,
  fastBatchNext,
  freeBatches,
  houseLevels,
  marketMakerQuotaLeft,
  marketMakerQuotes,
  marketMakerReference,
  missionsFor,
  netWorth,
  openProjects,
  portPrices,
  quoteCitySale,
  recipesFor,
  seasonActs,
  seasonEnd,
  shipStatus,
  shipUpkeep,
  shipsOf,
  specialtyUnlocked,
  stockUnitValue,
  upkeepPerDay,
  vwap,
  watchedRoutes,
} from "@comptoirs/engine";
import {
  activeEvent,
  balesFor,
  caratValue,
  contractsFor,
  crieePrice,
  crieeRoom,
  currentCriee,
  dailyFor,
  guildOf,
  guildsOpenAt,
  hasPass,
  maxOpenOrdersFor,
  nextEvent,
  rerollsOf,
  tally,
  treasury,
  votingWeights,
  weekIndex,
} from "@comptoirs/engine";
import {
  ambushChanceBps,
  deliveriesDoneToday,
  deliveriesOn,
  deliveryOrdersFor,
  escortCost,
  travelMinutesFor,
  vehicleFree,
  vehicleUpkeep,
  vehiclesOf,
  watchedRoads,
} from "@comptoirs/engine";
import { titleFor } from "./profile.js";

/** Corsairs cruising on each route, and the end of the last cruise. */
function lookout(state: WorldState, now: number) {
  const out: Record<string, { corsairs: number; until: number }> = {};
  for (const r of Object.values(state.raids ?? {})) {
    if (r.outcome !== "cruising" || r.beaten || r.startAt > now || now >= r.endAt) continue;
    const line = out[r.route] ?? { corsairs: 0, until: 0 };
    line.corsairs += 1;
    line.until = Math.max(line.until, r.endAt);
    out[r.route] = line;
  }
  return out;
}

/** The Criée under way (players only learn of one once it has started). */
function crieeView(ctx: WorldContext, state: WorldState, playerId: string, now: number) {
  const c = currentCriee(ctx, now);
  if (!c) return null;
  return { ...c, price: crieePrice(ctx, c), room: crieeRoom(ctx, state, c, playerId, now) };
}

/**
 * The guilds as one merchant sees them: their own (treasury, carats, members and their weight,
 * proposals with the votes so far) and the others they could join. Null when guilds are off.
 */
function guildsView(ctx: WorldContext, state: WorldState, playerId: string, now: number) {
  const rules = ctx.settings.guilds;
  if (rules.maxMembers <= 0) return null;
  const g = guildOf(state, playerId);
  const all = Object.values(state.guilds?.guilds ?? {});
  let mine = null;
  if (g) {
    const weights = votingWeights(ctx, g);
    const held = treasury(state, g.id);
    const proposals = Object.values(state.guilds?.proposals ?? {})
      .filter((p) => p.guildId === g.id)
      .sort((a, b) => b.openedAt - a.openedAt)
      .filter((p, i) => p.status === "open" || i < 12)
      .map((p) => ({
        id: p.id,
        kind: p.kind,
        value: p.value,
        target: p.target ?? null,
        by: p.by,
        openedAt: p.openedAt,
        closesAt: p.closesAt,
        status: p.status,
        ...tally(ctx, g, p),
        mine: p.votes[playerId] ?? null,
      }));
    mine = {
      id: g.id,
      name: g.name,
      emblem: g.emblem,
      founder: g.founder,
      open: g.open,
      tollBps: g.tollBps,
      dividendBps: g.dividendBps,
      bountyPerUnit: g.bountyPerUnit,
      treasury: held,
      caratsIssued: g.caratsIssued,
      /** What a hundred carats are worth (a single one may be under a denier). */
      valueOf100:
        g.caratsIssued > 0 ? (held * 100n) / BigInt(g.caratsIssued) : rules.caratValue * 100n,
      carats: g.members[playerId]?.carats ?? 0,
      share: caratValue(state, g.id, g.members[playerId]?.carats ?? 0),
      members: Object.entries(g.members)
        .map(([id, m]) => ({
          playerId: id,
          carats: m.carats,
          weight: weights[id] ?? 0,
          since: m.since,
          me: id === playerId,
        }))
        .sort((a, b) => b.carats - a.carats),
      proposals,
    };
  }
  return {
    opensAt: guildsOpenAt(ctx, state, playerId),
    mine,
    list: all
      .map((x) => ({
        id: x.id,
        name: x.name,
        emblem: x.emblem,
        members: Object.keys(x.members).length,
        open: x.open,
        treasury: treasury(state, x.id),
        mine: x.id === g?.id,
      }))
      .sort((a, b) => (b.treasury > a.treasury ? 1 : b.treasury < a.treasury ? -1 : 0)),
  };
}

/**
 * The road as one merchant sees it: today's board, vehicles, deliveries under way (an ambush
 * waiting for an answer included), their own bands, and the roads where bandits lie in wait.
 * Never the draws, nor other merchants' bands or who lies in wait.
 */
function roadView(ctx: WorldContext, state: WorldState, playerId: string, now: number) {
  if (!deliveriesOn(ctx)) return null;
  const player = state.players[playerId];
  if (!player) return null;
  const today = dayIndex(ctx, now);
  const done = new Set(deliveriesDoneToday(state, playerId, today));
  const contractsDone = state.contractsDone?.[playerId];
  const served = (ref?: string, kind?: string) =>
    ref !== undefined &&
    kind === "doge" &&
    contractsDone?.day === today &&
    contractsDone.ids.includes(ref);
  const types = Object.keys(ctx.settings.deliveries.vehicles);
  const rivalsOf = boardRivals(ctx, state, playerId, now);
  const orders = deliveryOrdersFor(ctx, state, playerId, today).map((o) => ({
    ...o,
    /** Other active merchants who may take this order of the world's board. */
    rivals: o.shared ? rivalsOf(o) : 0,
    status:
      done.has(o.id) || served(o.ref, o.kind)
        ? ("done" as const)
        : o.takenBy && o.takenBy !== playerId
          ? ("taken" as const)
          : now < o.opensAt
            ? ("upcoming" as const)
            : now >= o.expiresAt
              ? ("expired" as const)
              : ("open" as const),
    /** Minutes one way, per vehicle type. */
    minutes: Object.fromEntries(
      types.map((t) => [t, travelMinutesFor(ctx, state, playerId, o.city, t) ?? null]),
    ),
    escorts: Object.fromEntries(
      Object.keys(ctx.settings.deliveries.escorts).map((e) => [e, escortCost(ctx, o, e)]),
    ),
  }));
  const vehicles = vehiclesOf(state, playerId).map((v) => ({
    ...v,
    status: vehicleFree(v, now) ? ("free" as const) : ("busy" as const),
  }));
  const deliveries = Object.values(state.deliveries ?? {})
    .filter((d) => d.playerId === playerId)
    .sort((a, b) => b.departAt - a.departAt)
    .slice(0, 20)
    .map((d) => {
      const a = d.attack;
      return {
        ...d,
        attack: a
          ? {
              at: a.at,
              reactBy: a.reactBy,
              reacted: a.reacted,
              pending: a.success === undefined,
              success: a.success ?? null,
              taken: a.taken,
              // Who struck is told once the ambush is settled (a band of the computer: null).
              bandit: a.success === undefined ? null : a.banditId,
            }
          : null,
      };
    });
  const bands = Object.values(state.bands ?? {})
    .filter((b) => b.playerId === playerId)
    .sort((a, b) => b.startAt - a.startAt)
    .slice(0, 10)
    .map((b) => ({
      ...b,
      active: !b.dispersed && now < b.endAt,
      collectable:
        !b.collected &&
        (b.dispersed || now >= b.endAt) &&
        !Object.values(state.deliveries ?? {}).some(
          (d) => d.attack?.bandId === b.id && d.attack.success === undefined,
        ),
    }));
  return {
    orders,
    /** The day's biggest takes on the world's board, for the road news. */
    boardNews: boardTakes(state, 3),
    vehicles,
    deliveries,
    bands,
    watchedRoutes: watchedRoads(ctx, state, now),
    banditsOpenAt: player.joinedAt + ctx.settings.bandits.openDay * 86_400_000,
    /** The merchant's infamy (successful ambushes this season) and the bounty on their head. */
    infamy: state.infamy?.[playerId] ?? 0,
    bountyOnHead: bountyFor(ctx, state, playerId).toString(),
    /** Bounties received this season. */
    bounties: (state.bounties?.[playerId] ?? 0n).toString(),
    /** Chance of an ambush succeeding, by escort (what a merchant may know of the rules). */
    ambushChance: Object.fromEntries(
      ["none", ...Object.keys(ctx.settings.deliveries.escorts)].map((e) => [
        e,
        ambushChanceBps(ctx, e === "none" ? 0 : (ctx.settings.deliveries.escorts[e]?.defense ?? 0)),
      ]),
    ),
  };
}

/** The gazette's road news: the latest successful ambushes in the world (no names). */
function roadNews(state: WorldState) {
  return Object.values(state.deliveries ?? {})
    .filter((d) => d.attack?.success)
    .map((d) => ({
      route: d.route,
      at: d.attack?.resolvedAt ?? d.attack?.at ?? 0,
      resource: d.resource,
    }))
    .sort((a, b) => b.at - a.at)
    .slice(0, 5);
}

/** Static data of a world, for the client: names, recipes, costs. */
export function catalog(ctx: WorldContext, world: { name: string }) {
  const { theme, settings } = ctx;
  return {
    world: {
      name: world.name,
      startsAt: ctx.startAt,
      endsAt: seasonEnd(ctx),
      seasonDays: Math.round((seasonEnd(ctx) - ctx.startAt) / 86_400_000),
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
    road: deliveriesOn(ctx)
      ? {
          routes: settings.deliveries.routes,
          vehicles: Object.entries(settings.deliveries.vehicles).map(([type, v]) => ({
            type,
            ...v,
          })),
          maxVehicles: settings.deliveries.maxVehicles,
          maxDeliveryMinutes: settings.deliveries.maxDeliveryMinutes,
          escorts: settings.deliveries.escorts,
          bandits: {
            hoursOptions: settings.bandits.hoursOptions,
            feePerHour: settings.bandits.feePerHour,
            provisionsPerHour: settings.bandits.provisionsPerHour,
            maxAttacksPerBand: settings.bandits.maxAttacksPerBand,
            maxBandsPerRoute: settings.bandits.maxBandsPerRoute,
            reactionMinutes: settings.bandits.reactionMinutes,
            takeBps: settings.bandits.takeBps,
            keepBps: settings.bandits.keepBps,
            quietHours: settings.bandits.quietHours,
            openDay: settings.bandits.openDay,
          },
        }
      : null,
    guildRules: settings.guilds,
    rations: settings.rations,
    /** Masteries: the house's levels needed, and what each one changes. */
    specialties: settings.specialties,
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
  const fresh = ctx.settings.fresh;
  const job = b.job
    ? (() => {
        const ready = Math.min(b.job.batches, Math.floor((now - b.job.startedAt) / b.job.batchMs));
        // The latest batch done stays fresh for a while: collecting now earns the bonus.
        const lastDone = b.job.startedAt + ready * b.job.batchMs;
        const freshUntil =
          fresh.minutes > 0 && ready > 0 ? lastDone + fresh.minutes * 60_000 : null;
        return {
          ...b.job,
          ready,
          endsAt: b.job.startedAt + b.job.batches * b.job.batchMs,
          freshUntil: freshUntil !== null && freshUntil > now ? freshUntil : null,
        };
      })()
    : null;
  return {
    id: b.id,
    type: b.type,
    level: b.level,
    recipe: recipe?.code ?? null,
    job,
    canStart: Math.min(room, affordable),
    /** Seconds of the next single batch when it is a tutorial one, otherwise null. */
    fastSeconds:
      player && fastBatchNext(ctx, b, player, now) ? ctx.settings.tutorial.fastBatchSeconds : null,
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
  /** Player id, or "market_maker" for the Dogana. */
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
  const pass = hasPass(state, playerId, now);
  // Pass Négociant: a deeper order book.
  const depth = pass ? 10 : 5;
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
        .slice(0, depth)
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
  const rerolls = rerollsOf(state, playerId, today);
  const contracts = contractsFor(ctx, playerId, today, rerolls).map((c) => ({
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
  for (const v of vehiclesOf(state, playerId)) upkeep += vehicleUpkeep(ctx, v);

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
      seasonEndsAt: seasonEnd(ctx),
    },
    /** The season's acts (the variant of each one is told once it has begun). */
    acts: seasonActs(ctx).map((a) => ({
      code: a.code,
      index: a.index,
      startsAt: a.startsAt,
      endsAt: a.endsAt,
      variant: a.startsAt <= now ? (a.variant?.code ?? null) : null,
      worksite: a.worksite !== null,
    })),
    /** The house's mastery: chosen, or how far it is (levels of all workshops). */
    mastery: {
      chosen: player.specialty ?? null,
      levels: houseLevels(state, playerId),
      unlocked: specialtyUnlocked(ctx, state, playerId),
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
    // The worksites of the acts already won: a monument to the winning guild on the map.
    monuments: Object.values(state.projects)
      .filter((p) => p.act !== undefined && p.winner)
      .map((p) => ({ city: p.city, guild: p.winnerName ?? "", act: p.act ?? 0 })),
    contracts,
    guilds: guildsView(ctx, state, playerId, now),
    gazette: { current: describe(activeEvent(ctx, now)), next: describe(nextEvent(ctx, now)) },
    expeditions,
    ships,
    raids,
    ports,
    watchedRoutes: watchedRoutes(state, now),
    seaNews,
    road: roadView(ctx, state, playerId, now),
    roadNews: roadNews(state),
    rations: {
      resource: ctx.settings.rations.resource,
      perDay: levels * ctx.settings.rations.perLevelPerDay,
      hungryUntil: player.hungryUntil ?? 0,
      /** Workers eat at each day boundary of the world. */
      nextMealAt: ctx.startAt + (dayIndex(ctx, now) + 1) * 86_400_000,
    },
    tutorial: tutorialSteps,
    missions: missionsFor(ctx, state, playerId, now),
    pass: {
      active: pass,
      until: player.passUntil ?? 0,
      perks: ctx.settings.pass,
      maxOpenOrders: maxOpenOrdersFor(ctx, state, playerId, now),
      rerollsLeft: pass
        ? Math.max(
            0,
            ctx.settings.pass.contractRerollsPerDay -
              Object.values(rerolls).reduce((a, b) => a + b, 0),
          )
        : 0,
      // The lookout: corsairs on each route and when their cruise ends (Pass only).
      lookout: pass ? lookout(state, now) : null,
    },
    daily: ctx.settings.daily.perDay > 0 ? dailyFor(ctx, state, playerId, now) : null,
    bales: balesFor(ctx, state, playerId, now),
    fresh: ctx.settings.fresh,
    criee: crieeView(ctx, state, playerId, now),
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
      specialty: state.players[id]?.specialty ?? null,
      netWorth: netWorth(ctx, state, id, now, unitValues).total,
    }))
    .sort((a, b) => (a.netWorth > b.netWorth ? -1 : a.netWorth < b.netWorth ? 1 : 0))
    .map((row, i) => ({ rank: i + 1, ...row }));
}
