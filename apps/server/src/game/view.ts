import {
  type Building,
  type Deniers,
  MARKET_MAKER,
  type WorldContext,
  type WorldState,
  allowedHere,
  applyBpsCeil,
  applyBpsFloor,
  bestUpgrade,
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
  houseMissionsFor,
  houseSpendFor,
  isMudaGood,
  marketMakerQuotaLeft,
  marketMakerQuotes,
  marketMakerReference,
  missionsFor,
  mudaPrice,
  mudaView,
  netWorth,
  nextActions,
  openProjects,
  playerQuota,
  quoteCitySale,
  rationsPerDay,
  recipesFor,
  seasonActs,
  seasonEnd,
  specialtyUnlocked,
  stockUnitValue,
  topLevel,
  turnoverOf,
  upgradeWorthAdvising,
  vwap,
  warehouseUnitsLeft,
  workLevel,
  workshopEconomics,
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
  vehiclesOf,
  welcomeTripMs,
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
    /** The welcome order's express trip each way, in seconds, while the tutorial lasts. */
    ...(o.welcome && welcomeTripMs(ctx, player, now) > 0
      ? { express: welcomeTripMs(ctx, player, now) / 1000 }
      : {}),
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
      /** The luxury chains: the net sales, and the title, that open it (null: open). */
      unlock:
        settings.unlocks[b.type] !== undefined
          ? {
              turnover: settings.unlocks[b.type],
              title: titleFor(settings.unlocks[b.type] ?? 0n).current.name,
            }
          : null,
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
      tenderCautionPct: (settings.tenders?.cautionBps ?? 0) / 100,
      manufacture: settings.manufacture
        ? {
            maxLevel: settings.manufacture.maxLevel,
            qualityPct: settings.manufacture.qualityBpsPerLevel / 100,
            title: titleFor(settings.manufacture.unlock).current.name,
          }
        : null,
    },
  };
}

function buildingView(ctx: WorldContext, state: WorldState, b: Building, now: number) {
  const recipe = recipesFor(ctx.theme, b.type)[0];
  const inv = state.inventories[b.playerId] ?? {};
  let affordable = Number.POSITIVE_INFINITY;
  for (const [res, perBatch] of Object.entries(recipe?.inputs ?? {})) {
    const need = (perBatch ?? 0) * workLevel(ctx, b);
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
      local && b.level < topLevel(ctx, b) ? costForLevel(ctx, b.type, b.level + 1) : null,
    /** The manufacture: its path, the level its batches work at, whether its path may be chosen. */
    path: b.path ?? null,
    workLevel: workLevel(ctx, b),
    pathChoice: (() => {
      const m = ctx.settings.manufacture;
      if (!m || b.path || b.type === "palazzo" || !local) return null;
      if (b.level < ctx.settings.maxBuildingLevel) return null;
      return turnoverOf(state, b.playerId) >= m.unlock ? ("open" as const) : ("locked" as const);
    })(),
    /**
     * In figures: margin an hour, the next level's gain and payback (null: none); its goods unsold
     * and the inputs it lacks, which keep it from the guide's advice, and what the Dogana takes of
     * its goods a day.
     */
    economics: (() => {
      const e = workshopEconomics(ctx, state, b.playerId, b, now);
      const output = Object.keys(recipe?.outputs ?? {})[0];
      return {
        unitsPerHour: e.unitsPerHour,
        marginPerHour: e.marginPerHour,
        unsold: e.unsold,
        missingInputs: e.missingInputs,
        advisable: upgradeWorthAdvising(ctx, e),
        // A queue started before an upgrade works at its old level until it ends.
        queued:
          job && job.level < workLevel(ctx, b) && job.endsAt > now && !b.path
            ? {
                level: job.level,
                marginPerHour: workshopEconomics(
                  ctx,
                  state,
                  b.playerId,
                  { ...b, level: job.level },
                  now,
                ).marginPerHour,
              }
            : null,
        doganaPerDay: output
          ? (playerQuota(ctx, state, output, "sold", now, b.playerId) ?? null)
          : null,
        next:
          e.next && local && Number.isFinite(e.next.paybackMinutes)
            ? {
                cost: e.next.cost,
                addedPerHour: e.next.addedPerHour,
                paybackMinutes: Math.round(e.next.paybackMinutes),
              }
            : null,
      };
    })(),
    /** Built before raw materials became local: still producing, no more upgrades. */
    outOfRegion: !local,
  };
}

interface BookLine {
  price: Deniers;
  quantity: number;
  /** Player id, or "market_maker" for the Dogana. */
  by: string;
  mine: boolean;
}

/**
 * The offers a merchant can trade with on one side of a good's book, best first: the Dogana's
 * held to what its quota still allows the merchant today (gone at zero), as the market does.
 */
function tradableSide(
  ctx: WorldContext,
  state: WorldState,
  playerId: string,
  resource: string,
  side: "buy" | "sell",
  now: number,
) {
  const quota = marketMakerQuotaLeft(ctx, state, playerId, resource, now);
  // The Dogana's asks are bought from it (the merchant's buy quota), its bids sold to it.
  let room = side === "sell" ? quota.buy : quota.sell;
  const out: { price: Deniers; quantity: number; by: string; capped: boolean }[] = [];
  for (const o of bookSide(state, resource, side)) {
    let quantity = o.remaining;
    if (o.playerId === MARKET_MAKER && room !== null) {
      quantity = Math.min(quantity, room);
      room -= quantity;
    }
    out.push({ price: o.price, quantity, by: o.playerId, capped: quantity < o.remaining });
  }
  return out;
}

/**
 * What an order "right away" can trade now (null: nobody on the other side): the units within the
 * price protection from the best offer (the Dogana's held to the quota, as the market does), the
 * price it reserves (buy) or accepts at worst (sell), and whether the quota held it back.
 */
export function instantDepth(
  ctx: WorldContext,
  state: WorldState,
  playerId: string,
  resource: string,
  side: "buy" | "sell",
  now: number,
): { units: number; price: Deniers; quotaCapped: boolean } | null {
  const makers = tradableSide(ctx, state, playerId, resource, side === "buy" ? "sell" : "buy", now)
    // The market never matches the merchant with its own offers.
    .filter((o) => o.by !== playerId);
  // The protection counts from the best offer, even one of the Dogana's the quota closes.
  const best = makers[0]?.price;
  if (best === undefined) return null;
  const bps = ctx.settings.instantOrderSlippageBps;
  const price =
    side === "buy" ? applyBpsFloor(best, 10_000 + bps) : applyBpsCeil(best, 10_000 - bps);
  let units = 0;
  let quotaCapped = false;
  for (const o of makers) {
    if (side === "buy" ? o.price > price : o.price < price) break;
    units += o.quantity;
    if (o.by === MARKET_MAKER && o.capped) quotaCapped = true;
  }
  return { units, price, quotaCapped };
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
  // Pass Négociant: a deeper order book when its settings give one (read-only information).
  const depth = pass && ctx.settings.pass.perks.deepBook ? 10 : 5;
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
      // The best offers the merchant can take: not its own, nor the Dogana's past its quota.
      bestBid:
        tradableSide(ctx, state, playerId, r.code, "buy", now).find(
          (o) => o.quantity > 0 && o.by !== playerId,
        )?.price ?? null,
      bestAsk:
        tradableSide(ctx, state, playerId, r.code, "sell", now).find(
          (o) => o.quantity > 0 && o.by !== playerId,
        )?.price ?? null,
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

  // The order book of each resource: best five offers on each side, with who makes them; the
  // Dogana's line shows what the merchant may still trade with it today (none at zero), so that
  // the book never looks crossed with an offer out of reach.
  type Instant = { units: number; price: Deniers } | null;
  const book: Record<
    string,
    {
      asks: BookLine[];
      bids: BookLine[];
      quota: { buy: number | null; sell: number | null };
      instant: { buy: Instant; sell: Instant };
    }
  > = {};
  for (const r of ctx.theme.resources) {
    const side = (s: "buy" | "sell") =>
      tradableSide(ctx, state, playerId, r.code, s, now)
        .filter((o) => o.quantity > 0)
        .slice(0, depth)
        .map((o) => ({
          price: o.price,
          quantity: o.quantity,
          by: o.by,
          mine: o.by === playerId,
        }));
    const instant = (s: "buy" | "sell"): Instant => {
      const at = instantDepth(ctx, state, playerId, r.code, s, now);
      return at ? { units: at.units, price: at.price } : null;
    };
    book[r.code] = {
      asks: side("sell"),
      bids: side("buy"),
      quota: marketMakerQuotaLeft(ctx, state, playerId, r.code, now),
      instant: { buy: instant("buy"), sell: instant("sell") },
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
  const describe = (e: ReturnType<typeof activeEvent>) =>
    e && { code: e.code, city: e.city ?? null, startsAt: e.startsAt, endsAt: e.endsAt };

  return {
    serverTime: now,
    day: dayIndex(ctx, now) + 1,
    player: {
      id: player.id,
      region: player.region,
      joinedAt: player.joinedAt,
      // The house's privileges in this world.
      ...(player.patents ? { patents: player.patents } : {}),
    },
    cash: state.accounts[cashAccount(playerId)] ?? 0n,
    escrow: state.accounts[escrowAccount(playerId)] ?? 0n,
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
    /** The upgrade that pays back first (null: none left). */
    bestUpgrade: bestUpgrade(ctx, state, playerId, now)?.buildingId ?? null,
    next: nextActions(ctx, state, playerId, now),
    // The Doge's tenders open to bids, and those the merchant won and has yet to deliver. Sealed:
    // only the number of bidders shows.
    tenders: Object.values(state.tenders ?? {})
      .filter(
        (t) =>
          (t.openedAt <= now && now < t.closeAt) ||
          (t.awarded?.[playerId] && !t.awarded[playerId]?.delivered && now < t.deadline),
      )
      .sort((a, b) => a.closeAt - b.closeAt)
      .map((t) => ({
        id: t.id,
        resource: t.resource,
        quantity: t.quantity,
        ceiling: t.ceiling,
        closeAt: t.closeAt,
        deadline: t.deadline,
        open: now < t.closeAt,
        bidders: Object.keys(t.bids).length,
        mine: t.bids[playerId] ?? null,
        won: t.awarded?.[playerId] ?? null,
      })),
    // Deals between merchants: the commissions open to the merchant and its own, the colleganze
    // on offer and those it is part of.
    deals: dealsView(ctx, state, playerId, now),
    // The warehouses in the cities: those the merchant holds this week, its bids for the next,
    // and for each city the bid that wins a place now (the auction is open).
    warehouses: warehousesView(ctx, state, playerId, now),
    // The goods the merchant is the official supplier of, by city, this week.
    supplies: Object.entries(state.suppliers?.holders ?? {})
      .filter(([, id]) => id === playerId)
      .map(([key]) => {
        const [city = "", resource = ""] = key.split("|");
        return { city, resource };
      }),
    market,
    book,
    cityQuotes,
    // Company orders: what this merchant delivered and how many took part, not who.
    projects: openProjects(state.projects, now).map(({ by, ...p }) => ({
      ...p,
      mine: by?.[playerId] ?? 0n,
      merchants: Object.keys(by ?? {}).length,
    })),
    contracts,
    families: familiesView(ctx, state, playerId, now),
    gazette: { current: describe(activeEvent(ctx, now)), next: describe(nextEvent(ctx, now)) },
    road: roadView(ctx, state, playerId, now),
    /** The galleys of the Muda: what is on the quay, at what price, and the merchant's quota. */
    muda: ctx.settings.muda ? mudaView(ctx, state, playerId, now) : null,
    rations: {
      resource: ctx.settings.rations.resource,
      perDay: rationsPerDay(ctx, buildings, playerId),
      /** Loaves per workshop level: the need grows with every level built. */
      perLevel: ctx.settings.rations.perLevelPerDay,
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
      /** Exactly what the Pass gives, read from the settings (the profile lists these). */
      perks: ctx.settings.pass.perks,
      maxOpenOrders: maxOpenOrdersFor(ctx, state, playerId, now),
    },
    daily: ctx.settings.daily.perDay > 0 ? dailyFor(ctx, state, playerId, now) : null,
    // The house's missions of the board, paid in Influence.
    houseMissions: ctx.settings.house?.missions
      ? houseMissionsFor(ctx, state, playerId, now)
      : null,
    // What Influence buys, and what is left of today's limits.
    houseSpend: houseSpendFor(ctx, state, playerId, now),
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

function warehousesView(ctx: WorldContext, state: WorldState, playerId: string, now: number) {
  const rules = ctx.settings.warehouses;
  if (!rules) return null;
  const w = state.warehouses;
  return {
    perCity: rules.perCity,
    minBid: rules.minBid,
    unitsPerDay: rules.unitsPerDay,
    unitsLeft: warehouseUnitsLeft({ ctx, s: state }, playerId, dayIndex(ctx, now)),
    cities: ctx.theme.cities.map(({ code }) => {
      const bids = Object.values(w?.bids[code] ?? {}).sort((a, b) => (a > b ? -1 : a < b ? 1 : 0));
      const last = bids.length >= rules.perCity ? bids[rules.perCity - 1] : undefined;
      return {
        city: code,
        held: (w?.holders[code] ?? []).includes(playerId),
        holders: (w?.holders[code] ?? []).length,
        bidders: bids.length,
        toWin: last !== undefined ? last + 1n : rules.minBid,
        mine: w?.bids[code]?.[playerId] ?? null,
      };
    }),
  };
}

function dealsView(ctx: WorldContext, state: WorldState, playerId: string, now: number) {
  if (!ctx.settings.commissions && !ctx.settings.colleganza && !ctx.settings.loans) return null;
  const commissions = Object.values(state.commissions ?? {})
    .filter((c) =>
      c.buyer === playerId
        ? c.expiresAt + 86_400_000 > now
        : !c.filledBy && !c.closed && now < c.expiresAt && (!c.to || c.to === playerId),
    )
    .sort((a, b) => b.postedAt - a.postedAt)
    .map((c) => ({
      id: c.id,
      buyer: c.buyer,
      mine: c.buyer === playerId,
      resource: c.resource,
      quantity: c.quantity,
      unitPrice: c.unitPrice,
      to: c.to ?? null,
      expiresAt: c.expiresAt,
      status: c.filledBy ? "filled" : c.closed || now >= c.expiresAt ? "closed" : "open",
    }));
  const colleganze = Object.values(state.colleganze ?? {})
    .filter((g) =>
      g.investor === playerId || g.merchant === playerId
        ? !g.settled || (g.startedAt ?? g.offeredAt) + (g.days + 1) * 86_400_000 > now
        : !g.merchant && !g.settled && (!g.to || g.to === playerId),
    )
    .sort((a, b) => b.offeredAt - a.offeredAt)
    .map((g) => ({
      id: g.id,
      investor: g.investor,
      merchant: g.merchant ?? null,
      role: g.investor === playerId ? "investor" : g.merchant === playerId ? "merchant" : "offer",
      amount: g.amount,
      days: g.days,
      shareBps: g.shareBps,
      endsAt: g.startedAt !== undefined ? (g.endsAt ?? g.startedAt + g.days * 86_400_000) : null,
      settled: !!g.settled,
      paid: g.paid ?? null,
    }));
  const rules = ctx.settings.loans;
  const loan = state.loans?.[playerId];
  const worth = netWorth(ctx, state, playerId, now).total;
  return {
    // The Bank's loan: the merchant's own, and what it may borrow now.
    bank: rules
      ? {
          loan: loan
            ? { amount: loan.amount, owed: loan.owed, dueAt: loan.dueAt, late: !!loan.late }
            : null,
          limit: (() => {
            const cap = ((worth > 0n ? worth : 0n) * BigInt(rules.maxShareBps)) / 10_000n;
            return cap < rules.maxAmount ? cap : rules.maxAmount;
          })(),
          maxShareBps: rules.maxShareBps,
          interestBpsPerDay: rules.interestBpsPerDay,
          maxDays: rules.maxDays,
          lateBps: rules.lateBps,
        }
      : null,
    commissionDays: ctx.settings.commissions?.maxDays ?? 0,
    colleganzaDays: ctx.settings.colleganza?.maxDays ?? 0,
    maxShareBps: ctx.settings.colleganza?.maxShareBps ?? 0,
    commissions,
    colleganze,
  };
}
