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
  cashAccount,
  costForLevel,
  dayIndex,
  escrowAccount,
  fastBatchNext,
  freeBatches,
  houseLevels,
  isMudaGood,
  marketMakerQuotaLeft,
  marketMakerQuotes,
  marketMakerReference,
  missionsFor,
  mudaPrice,
  mudaView,
  netWorth,
  openProjects,
  quoteCitySale,
  recipesFor,
  seasonActs,
  seasonEnd,
  specialtyUnlocked,
  stockUnitValue,
  turnoverOf,
  upkeepPerDay,
  vwap,
} from "@comptoirs/engine";
import {
  activeEvent,
  activeMembers,
  balesFor,
  campaignOpen,
  campaignWeekEnd,
  contractsFor,
  crieePrice,
  crieeRoom,
  currentCriee,
  dailyFor,
  defenseBpsOf,
  defenseOf,
  familiesOn,
  familiesOpenAt,
  familyOf,
  garrisonAt,
  hasPass,
  hireCost,
  hireLimit,
  hiredToday,
  levyFactorBps,
  levyWaiting,
  liveGlory,
  marchMinutes,
  marchStart,
  maxOpenOrdersFor,
  mayTarget,
  membersOf,
  meritPoints,
  nextEvent,
  nextOpenAt,
  programmeOf,
  rerollsOf,
  reserveOf,
  seatFamily,
  stackCount,
  weekIndex,
  workServing,
  worksAllowed,
  worksOf,
} from "@comptoirs/engine";
import {
  deliveriesDoneToday,
  deliveriesOn,
  deliveryOrdersFor,
  travelMinutesFor,
  vehicleFree,
  vehicleUpkeep,
  vehiclesOf,
} from "@comptoirs/engine";
import { titleFor } from "./profile.js";

/** The Criée under way (players only learn of one once it has started). */
function crieeView(ctx: WorldContext, state: WorldState, playerId: string, now: number) {
  const c = currentCriee(ctx, now);
  if (!c) return null;
  return { ...c, price: crieePrice(ctx, c), room: crieeRoom(ctx, state, c, playerId, now) };
}

/**
 * The families and the week's campaign as one merchant sees them: the four families (members,
 * glory, levy), the map with its garrisons and the marches under way (all of them, as on a war
 * map), the merchant's lances, the programmes voted (public), the decrees in force and the past
 * weeks. Null when the families are off.
 */
function familiesView(ctx: WorldContext, state: WorldState, playerId: string, now: number) {
  if (!familiesOn(ctx)) return null;
  const rules = ctx.settings.campaign;
  const c = state.campaign;
  if (!rules) return null;
  const mine = familyOf(state, playerId);
  const glory = liveGlory(ctx, state, now);
  const week = c?.week ?? weekIndex(ctx, now);
  const families = ctx.settings.families.list.map((f) => ({
    code: f.code,
    seat: f.seat,
    members: membersOf(state, f.code).length,
    active: activeMembers(ctx, state, f.code, now).length,
    levyBps: levyFactorBps(ctx, state, f.code, now),
    glory: glory[f.code] ?? 0,
    programme: programmeOf(ctx, state, f.code),
    lands: Object.values(c?.lands ?? {}).filter((l) => l.holder === f.code).length,
    works: worksOf(state, f.code),
  }));
  const kinds = rules.kinds;
  const lands = rules.lands.map((def) => {
    const land = c?.lands[def.code];
    const kind = kinds[def.kind];
    return {
      code: def.code,
      kind: def.kind,
      city: def.city ?? null,
      x: def.x,
      y: def.y,
      neighbors: def.neighbors,
      holder: land?.holder ?? null,
      garrison: land ? garrisonAt(land, now) : 0,
      /** The merchant's own lances in its garrison. */
      mine: land
        ? stackCount(
            land.stacks.filter((x) => x.playerId === playerId),
            now,
          )
        : 0,
      /** What the garrison counts for, its work's share included once finished. */
      defenseBps: defenseBpsOf(ctx, state, def.code, now),
      /** Lances an assault must outnumber now. */
      defense: defenseOf(ctx, state, def.code, now),
      glory: kind?.glory ?? 0,
      work: land?.work
        ? {
            kind: land.work.kind,
            family: land.work.family,
            by: land.work.by,
            readyAt: land.work.readyAt,
            ready: workServing(ctx, land, now) !== undefined,
          }
        : null,
      seat: seatFamily(ctx, def.code) ?? null,
      since: land?.since ?? 0,
      /** The merchant may send lances there now. */
      open: mine ? mayTarget(ctx, state, mine, def.code) : false,
      minutes: mine ? marchMinutes(ctx, mine, def.code, state, now) : null,
      /** Where the merchant's march would leave from: the seat or a camp of the family. */
      from: mine ? marchStart(ctx, mine, def.code, state, now).from : null,
    };
  });
  const marches = Object.values(c?.marches ?? {})
    .filter((m) => m.arriveAt > now || m.arriveAt >= (c?.accruedAt ?? 0))
    .map((m) => ({
      id: m.id,
      family: m.family,
      by: m.by,
      target: m.target,
      from: m.from ?? null,
      startAt: m.startAt,
      arriveAt: m.arriveAt,
      lances: m.npc + stackCount(m.stacks, Math.min(now, m.arriveAt)),
      mine: stackCount(
        m.stacks.filter((x) => x.playerId === playerId),
        now,
      ),
    }))
    .sort((a, b) => a.arriveAt - b.arriveAt);
  const members = mine
    ? membersOf(state, mine)
        .map((id) => ({ playerId: id, merit: meritPoints(ctx, state, id), me: id === playerId }))
        .sort((a, b) => b.merit - a.merit || (a.playerId < b.playerId ? -1 : 1))
    : [];
  const hired = hiredToday(ctx, state, playerId, now);
  const d = state.campaign?.decrees;
  const inForce = d && d.week === weekIndex(ctx, now) && !c?.closed ? d : null;
  return {
    opensAt: familiesOpenAt(ctx, state, playerId),
    mine,
    families,
    members,
    week,
    weekEndsAt: campaignWeekEnd(ctx, week),
    closed: c?.closed ?? false,
    open: campaignOpen(ctx, now),
    nextOpenAt: nextOpenAt(ctx, now),
    nextMilanAt: c?.nextMilanAt ?? null,
    lands,
    marches,
    me: mine
      ? {
          reserve: reserveOf(state, playerId, now),
          /** Free lances waiting, once the family's size is applied. */
          levy: Math.floor(
            (levyWaiting(ctx, state, playerId, now) * levyFactorBps(ctx, state, mine, now)) /
              10_000,
          ),
          levyMax: rules.levy.max,
          hired,
          hireLimit: hireLimit(ctx),
          /** Price of the next lance (null: the day's limit is reached). */
          nextPrice: hireCost(ctx, hired, 1) ?? null,
          merit: meritPoints(ctx, state, playerId),
          /** Works the family has standing, and may have. */
          works: worksOf(state, mine),
          worksAllowed: worksAllowed(ctx, state, mine, now),
          ballot: c?.ballots[playerId] ?? [],
          /** When the lances in the reserve leave, the soonest first. */
          leaving: (c?.players[playerId]?.reserve ?? [])
            .filter((x) => x.expiresAt > now)
            .map((x) => ({ count: x.count, expiresAt: x.expiresAt }))
            .sort((a, b) => a.expiresAt - b.expiresAt),
        }
      : null,
    decrees: inForce
      ? { family: inForce.family, items: inForce.items, cities: inForce.cities, week: inForce.week }
      : null,
    history: (c?.history ?? []).map((h) => ({
      week: h.week,
      winner: h.winner,
      glory: h.glory,
      decrees: h.decrees,
      captains: h.captains,
      final: h.final,
    })),
  };
}

/**
 * The road as one merchant sees it: today's board, vehicles and deliveries under way. Never the
 * draws.
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
  }));
  const vehicles = vehiclesOf(state, playerId).map((v) => ({
    ...v,
    status: vehicleFree(v, now) ? ("free" as const) : ("busy" as const),
  }));
  const deliveries = Object.values(state.deliveries ?? {})
    .filter((d) => d.playerId === playerId)
    .sort((a, b) => b.departAt - a.departAt)
    .slice(0, 20);
  return {
    orders,
    /** The day's biggest takes on the world's board, for the road news. */
    boardNews: boardTakes(state, 3),
    vehicles,
    deliveries,
  };
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
    road: deliveriesOn(ctx)
      ? {
          routes: settings.deliveries.routes,
          vehicles: Object.entries(settings.deliveries.vehicles).map(([type, v]) => ({
            type,
            ...v,
          })),
          maxVehicles: settings.deliveries.maxVehicles,
          /** Types that may be bought; the others are reached by upgrading. */
          forSale: settings.deliveries.forSale ?? Object.keys(settings.deliveries.vehicles),
          maxDeliveryMinutes: settings.deliveries.maxDeliveryMinutes,
          /** Orders a vehicle may carry together, all for the same city. */
          maxOrdersPerLoad: settings.deliveries.maxOrdersPerLoad,
        }
      : null,
    families: familiesOn(ctx)
      ? {
          openDay: settings.families.openDay,
          list: settings.families.list,
          campaign: settings.campaign
            ? {
                kinds: settings.campaign.kinds,
                openHours: settings.campaign.openHours,
                levy: settings.campaign.levy,
                hire: settings.campaign.hire,
                lanceHours: settings.campaign.lanceHours,
                march: settings.campaign.march,
                milan: settings.campaign.milan,
                garrisonLancesPerPoint: settings.campaign.garrisonLancesPerPoint,
                works: settings.campaign.works ?? null,
              }
            : null,
          decrees: settings.decrees,
        }
      : null,
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
  const pass = hasPass(ctx, state, playerId, now);
  // Pass Négociant: a deeper order book.
  const depth = pass ? 10 : 5;
  const buildings = Object.values(state.buildings)
    .filter((b) => b.playerId === playerId)
    .sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)));

  const market = ctx.theme.resources.map((r) => {
    const reference = ctx.settings.referencePrices[r.code] ?? 0n;
    const quotes = marketMakerQuotes(ctx, marketMakerReference(ctx, state, r.code, now), now);
    // Goods from overseas: the Dogana sells the Muda's lot at its own price.
    const mm = isMudaGood(ctx, r.code) ? { ...quotes, ask: mudaPrice(ctx, state, r.code) } : quotes;
    return {
      resource: r.code,
      reference,
      recentPrice: vwap(ctx, state, r.code, now, 3) ?? null,
      bestBid: bestPrice(state, r.code, "buy", { excludePlayer: playerId }) ?? null,
      bestAsk: bestPrice(state, r.code, "sell", { excludePlayer: playerId }) ?? null,
      marketMaker: mm,
      /** The Dogana's price, in bps of the reference: it follows what merchants buy and sell there. */
      doganaBps: state.marketMaker.anchorBps?.[r.code] ?? 10_000,
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

  let upkeep = 0n;
  for (const b of buildings) upkeep += upkeepPerDay(ctx, b);
  for (const v of vehiclesOf(state, playerId)) upkeep += vehicleUpkeep(ctx, v);

  return {
    serverTime: now,
    day: dayIndex(ctx, now) + 1,
    player: {
      id: player.id,
      region: player.region,
      joinedAt: player.joinedAt,
      upkeepDefaultUntil: player.upkeepDefaultUntil,
      // The house's patents in this world, and its second counter once chosen.
      ...(player.patents ? { patents: player.patents } : {}),
      ...(player.secondRegion ? { secondRegion: player.secondRegion } : {}),
    },
    cash: state.accounts[cashAccount(playerId)] ?? 0n,
    escrow: state.accounts[escrowAccount(playerId)] ?? 0n,
    upkeepPerDay: upkeep,
    netWorth: worth,
    standing: {
      rank: mine?.rank ?? null,
      players: table.length,
      /** Net sales of the season (sales less purchases): what the ranking counts. */
      turnover: turnoverOf(state, playerId),
      title: titleFor(turnoverOf(state, playerId)),
      seasonEndsAt: seasonEnd(ctx),
    },
    /** The season's acts (the variant of each one is told once it has begun). */
    acts: seasonActs(ctx).map((a) => ({
      code: a.code,
      index: a.index,
      startsAt: a.startsAt,
      endsAt: a.endsAt,
      variant: a.startsAt <= now ? (a.variant?.code ?? null) : null,
      milanBps: a.milanBps,
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
    contracts,
    families: familiesView(ctx, state, playerId, now),
    gazette: { current: describe(activeEvent(ctx, now)), next: describe(nextEvent(ctx, now)) },
    road: roadView(ctx, state, playerId, now),
    /** The galleys of the Muda: what is on the quay, at what price, and the merchant's quota. */
    muda: ctx.settings.muda ? mudaView(ctx, state, playerId, now) : null,
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
      /** Off until it comes back: the profile only announces it. */
      enabled: ctx.settings.pass.enabled,
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
    },
    daily: ctx.settings.daily.perDay > 0 ? dailyFor(ctx, state, playerId, now) : null,
    bales: balesFor(ctx, state, playerId, now),
    fresh: ctx.settings.fresh,
    criee: crieeView(ctx, state, playerId, now),
    openOrders: Object.values(state.orders).filter((o) => o.playerId === playerId),
  };
}

/** The ranking's rows of a world state, kept for the minute: every view shows it. */
const RANKS = new WeakMap<
  WorldState,
  { minute: number; hidden: string; rows: Omit<RankRow, "pseudo" | "rank">[] }
>();
type RankRow = {
  rank: number;
  playerId: string;
  pseudo: string | null;
  region: string;
  specialty: string | null;
  netWorth: Deniers;
  turnover: Deniers;
};

export function ranking(
  ctx: WorldContext,
  state: WorldState,
  now: number,
  pseudos: Map<string, string | null>,
  hidden: Set<string> = new Set(),
): RankRow[] {
  const minute = Math.floor(now / 60_000);
  const hiddenKey = [...hidden].sort().join(",");
  let cached = RANKS.get(state);
  if (!cached || cached.minute !== minute || cached.hidden !== hiddenKey) {
    const unitValues: Record<string, Deniers> = {};
    for (const r of ctx.theme.resources)
      unitValues[r.code] = stockUnitValue(ctx, state, r.code, now);
    const rows = Object.keys(state.players)
      .filter((id) => id !== MARKET_MAKER && !hidden.has(id))
      .map((id) => ({
        playerId: id,
        region: state.players[id]?.region ?? "",
        specialty: state.players[id]?.specialty ?? null,
        netWorth: netWorth(ctx, state, id, now, unitValues).total,
        turnover: turnoverOf(state, id),
      }))
      // Net sales rank the season; stock and buildings do not.
      .sort((a, b) => (a.turnover > b.turnover ? -1 : a.turnover < b.turnover ? 1 : 0));
    cached = { minute, hidden: hiddenKey, rows };
    RANKS.set(state, cached);
  }
  return cached.rows.map((row, i) => ({
    rank: i + 1,
    playerId: row.playerId,
    pseudo: pseudos.get(row.playerId) ?? null,
    region: row.region,
    specialty: row.specialty,
    netWorth: row.netWorth,
    turnover: row.turnover,
  }));
}
