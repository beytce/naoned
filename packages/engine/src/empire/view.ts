import { DENIERS_PER_DUCAT, type Deniers, applyBpsFloor } from "../money.js";
import {
  type CarnetObjective,
  DAY_MS,
  type EmpireHouse,
  type EmpireLeg,
  type EmpireOrder,
  type EmpireStaff,
  type EmpireVoyage,
  HOUR_MS,
  type PlayerId,
  type WorldContext,
  type WorldState,
} from "../state.js";
import { carnetPreview, carnetWeek } from "./carnet.js";
import { catchupCut } from "./catchup.js";
import {
  buildMinutesOf,
  casaLevelOf,
  casaRequirementMet,
  levelCost,
  lotYieldBps,
} from "./curves.js";
import { houseEffect } from "./effects.js";
import {
  capacityOf,
  depotLevelOf,
  fleetCapOf,
  holdPlacesOf,
  nextDepotLevel,
  upgradeCost,
  vehicleLevelOf,
} from "./fleet.js";
import {
  counterCostOf,
  empireHouseAt,
  isAsleep,
  regionOfWorkshop,
  workshopPlaces,
  workshopTop,
} from "./house.js";
import type { InteriorSettings } from "./interior/settings.js";
import { type InteriorView, interiorRulesOf, interiorsOf } from "./interior/view.js";
import { knowledgeCost, knowledgeMinutes, learningSlots } from "./knowledge.js";
import {
  buyableOf,
  cellCentreOf,
  cellsWithin,
  citiesCovered,
  citiesFound,
  citiesToLink,
  citySpot,
  ensureMap,
  hasMap,
  homeLevelOf,
  homePost,
  postCost,
  reachOf,
  revealedOf,
  sectorCost,
  squareGrid,
  standingPosts,
  unlockedOf,
  walkableOf,
} from "./map.js";
import { researchCost, researchMinutesOf } from "./modules.js";
import { holdOf, placePoint } from "./moves.js";
import { type CityOrders, ordersOf } from "./orders.js";
import { type PortaView, portaViewOf } from "./porta/view.js";
import { bandOf } from "./power.js";
import { regionOf } from "./prices.js";
import { salaryBps } from "./salaries.js";
import type { EmpireSettings } from "./settings.js";
import { roadBetween } from "./slots.js";
import { staffHireCost, staffSlots } from "./staff.js";
import { storesOf, workshopPost } from "./stores.js";
import { isContesaWeek, terraWeekStart } from "./terra.js";
import { counterLevel, incomePerDay, powerOfHouse } from "./trade.js";
import { vehicleSlotsOf } from "./vehicleModules.js";
import { lotsThatFit, moduleSlotsOf, neighbourBonus, workshopYieldBps } from "./workshops.js";

export interface EmpireSite {
  level: number;
  /** Ducats it costs now, in deniers, the catch-up taken off. */
  cost: Deniers;
  minutes: number;
  /** The catch-up's cut, in bps, when the knowledge has gone round. */
  cutBps: number;
}

export interface EmpireView {
  house: EmpireHouse;
  /** The welcome of a new house (docs/plan-premiers-pas.md lot 2): the workshop to build first. */
  welcome?: { workshop: { type: string; recipe: string } };
  /** The Porta and its arms (docs/plan-porta.md). */
  porta: PortaView;
  /** The fleet capped by the Remise's level (null without the fleet's levels). */
  fleet: {
    level: number;
    vehicles: number;
    cap: number;
    next: { level: number; vehicles: number; casa: number; cost: Deniers; minutes: number } | null;
  } | null;
  power: number;
  band: number;
  /** The share of each receipt the hands take as wages, in bps (said on the screen, P1-15). */
  wagesBps: number;
  /** How long a workshop's queue runs once launched, then it waits for its harvest (rule 3). */
  queueHours: number;
  /** The Favour a site's haste costs now; null when none is left today, or no haste. */
  hasteFavour: number | null;
  /** Receipts a day (the last full days), in deniers. */
  incomePerDay: Deniers;
  asleep: boolean;
  /** The next Casa: absent at the top. */
  nextCasa:
    | (EmpireSite & {
        materials: Record<string, number>;
        requirementMet: boolean;
        requires: { workshops: number; level: number };
        opens: string[];
        /** What a fondaco will hold of each good (the first steps, lot 3). */
        storeCap?: number;
        /** The first fondaco's reach then, and the towns it will add. */
        reach?: number;
        newCities?: string[];
      })
    | null;
  /** What a fondaco holds of each good at this Casa; null without a cap. */
  storeCap: number | null;
  /** The workshops whose ready lots wait for room under the cap (the first steps, lot 3). */
  full: string[];
  /**
   * Each workshop's next level: null at the Casa's, or at the top. With its lot before and after,
   * in basis points of the recipe's base lot (lotYieldBps): what the raise brings, shown first.
   */
  upgrades: Record<string, (EmpireSite & { yieldBps: number; nextYieldBps: number }) | null>;
  /** A new workshop in Venetia: null without a free place. */
  newWorkshop: EmpireSite | null;
  /** A new workshop's site anywhere (its region's places aside). */
  workshopSite: EmpireSite;
  buildSlots: number;
  workshopSlots: number;
  /** Back after half a day or more: what the queues made and the sites that ended meanwhile. */
  away: { since: number; ready: Record<string, number>; sitesDone: number } | null;
  /** The Carnet of the week, as the house would find it now (a new week drawn already). */
  carnet: {
    week: number;
    objectives: CarnetObjective[];
    carried: CarnetObjective[];
    windUntil: number | null;
  };
  /** The regions (CADRAGE-v3 § 3.4): Venetia, then the others with their charter and counter. */
  regions: EmpireRegionView[];
  map: EmpireMapView;
  /** Each counter's stock, Venice's first (the map that grows). */
  stores: { post: string; region: string; goods: Record<string, number> }[];
  /** The orders of the cities its counters serve (after Hades' Star's shipments). */
  orders: CityOrders[];
  /** The last deliveries brought (the board plays them again on the player's return). */
  delivered: { city: string; pay: string; at: number }[];
  /** The vehicles' hops: seconds before leaving, speed in units a second, stops at most. */
  moves: {
    departSeconds: number;
    unitsPerSecond: number;
    /** The long voyages: seconds a unit of the chart, when set (it rules then). */
    secondsPerUnit?: number;
    maxStops: number;
    /** A vehicle comes back alone once at a city; called back this long after it left (s). */
    returnHome?: boolean;
    recallSeconds?: number;
  };
  /** The vehicles one may buy, those of the house, and its voyages under way. */
  vehicles: {
    shop: {
      type: string;
      casa: number;
      cost: Deniers;
      capacity: number;
      regions: string[];
      speedBps: number;
      /** The house's level of the model, and the price of its next (null at the last). */
      level: number;
      upgrade: Deniers | null;
    }[];
    mine: {
      id: string;
      type: string;
      busyUntil: number;
      capacity: number;
      fitted?: string[];
      /** Where it stands: a counter's id, or `city:<code>`. */
      at: string;
      /** The orders aboard (each a place of its hold), and its stops to come (hop by hop). */
      loads: (EmpireOrder & { from: string })[];
      /** Each with the road it walks (the small tiles), the very one its time was reckoned on. */
      legs: (EmpireLeg & { road?: [number, number][] })[];
      /** Its places for trade modules (a level of its model), and what is fitted there. */
      slots: number;
    }[];
    haulPerDay: number;
  };
  /** The Scuola: its places, what runs, each module open in the world and its next level. */
  research: {
    slots: number;
    running: { code: string; level: number; startedAt: number; endsAt: number }[];
    modules: {
      code: string;
      kind: string;
      effect: string;
      level: number;
      next: EmpireSite | null;
    }[];
  };
  /** The workshops' places for modules, and their neighbourhood's bonus (bps). */
  workshopPlaces: Record<string, { slots: number; neighbourBps: number }>;
  /** The workshops' insides, by workshop (docs/plan-ateliers.md § 5.6); none without them. */
  interiors: Record<string, InteriorView>;
  /** Their rules, for the screen to reckon a rate while a machine is dragged; null without them. */
  interiorRules: InteriorSettings | null;
  /** What the court of Venice still takes today. */
  courtLeft: number;
  identity: EmpireIdentity;
  /** The Terraferma (CADRAGE-v3 § 8): the week, the house's theatre, the Contesa's roster. */
  terra: {
    week: number;
    contesa: boolean;
    entry: Record<string, number>;
    /** Until when a house may enter (or place on its map); null without the Terraferma. */
    placementUntil: number | null;
    theatre: {
      id: string;
      band: number;
      kind: string;
      members: number;
      companies: string[];
    } | null;
    /** The company's roster for the next Contesa, and until when it may be set. */
    roster: { week: number; members: string[] } | null;
    rosterUntil: number | null;
    nextContesa: boolean;
    honours: { trophies: number; lustre: number; blazon: string[] } | null;
    seals: number;
    best: string | null;
  };
  /** The entraide (CADRAGE-v3 § 7): its company's open requests, its Merit, its rhythm. */
  aid: {
    requests: {
      id: string;
      house: string;
      good: string;
      qty: number;
      at: number;
      value: Deniers;
    }[];
    merit: number;
    nextAskAt: number | null;
    lotMax: number;
    /** What it may still supply today, in deniers, and from when it may ask and supply. */
    supplyLeft: Deniers;
    seniorFrom: number | null;
  };
}

export interface EmpireIdentity {
  arte: {
    current: string | null;
    minor: string | null;
    options: { code: string; buildings: string[]; effects: Record<string, number> }[];
    fromCasa: number;
    minorFromCasa: number;
  };
  knowledge: {
    slots: number;
    learning: { code: string; startedAt: number; endsAt: number }[];
    branches: { code: string; nodes: KnowledgeNodeView[]; capstones: KnowledgeNodeView[] }[];
  };
  staff: {
    slots: number;
    hireCost: Deniers;
    members: (EmpireStaff & { tiersOpen: number })[];
    roles: { role: string; place: string; paths: Record<string, number>[] }[];
  };
  family: {
    generation: number;
    heritage: number;
    lineage: string[];
    traits: { code: string; effects: Record<string, number> }[];
  };
}

export interface KnowledgeNodeView {
  code: string;
  depth: number;
  effects: Record<string, number>;
  state: "learnt" | "learning" | "open" | "locked";
  cost: Deniers;
  minutes: number;
}

export interface EmpireRegionView {
  code: string;
  casa: number;
  hoursFromVenice: number;
  workshopSlots: number;
  /** The goods it makes cheaply (a workshop makes no other raw good there) and those it asks. */
  produces: string[];
  demands: string[];
  /** Its counter's level (Venetia: one, the Casa's), 0 without. */
  counter: number;
  /** A counter's site under way there (its opening voyage, or its next level): its end. */
  buildingUntil: number | null;
  /** The next level of its counter: null without one, or when none may be built now. */
  next: EmpireSite | null;
  /** A counter put down there next, once its Casa is reached: its ducats. */
  postCost: Deniers | null;
  /** Its cities the house has found, and all of them (none: a region without cities). */
  cities: { found: number; all: number };
}

/** The map as the house sees it (the map at the centre, step 2): never what it has not seen. */
export interface EmpireMapView {
  /** The land cells seen, each with its region and whether the sea touches it. */
  cells: Record<string, { region: string; coast: boolean }>;
  /** Every cell seen, land or sea. */
  revealed: string[];
  /** The counters put down: their name, their point, their level and their reach. */
  posts: {
    id: string;
    cell: string;
    region: string;
    x: number;
    y: number;
    level: number;
    reach: number;
  }[];
  /** Venice's own counter, likewise. */
  /** The first fondaco: `placed` once the player put it down. */
  home: { x: number; y: number; level: number; reach: number; cell: string; placed: boolean };
  /** The hexes' size, the reach at each level (none: no reach), the spacing of the counters. */
  hexSize: number;
  /** The grid (docs/plan-porcellana.md § 2 bis): « hex », or « square » tiles of `tileSize`. */
  grid: "hex" | "square";
  tileSize: number;
  reach: { base: number; perLevel: number } | null;
  postSpacing: number;
  /** No fondaco closer than this to a town. */
  cityClearance: number;
  /** The small tiles: a fondaco is put down on a tile's middle (slots.ts). */
  tiles: boolean;
  /** The small tiles of lagoon (`<cell>#<k>`). */
  water: string[];
  /** A land vehicle between two counters: so many units an hour. */
  transferUnitsPerHour: number;
  /** The cities the house's counters serve. */
  covered: string[];
  /** The sectors the house owns: its vehicles go anywhere there (the hops). */
  unlocked: string[];
  /**
   * On square tiles bought one by one (7 November 2026): the cities in reach the house's own tiles
   * do not link yet to a counter, each with the fewest tiles to buy to link it. Absent elsewhere.
   */
  toLink?: Record<string, string[]>;
  /** The sectors it may buy next (the sectors bought one by one), with the price of the next. */
  buyable: { cell: string; region: string; coast: boolean; casa: number }[];
  sectorCost: Deniers;
  /** The counters and the Arsenal under way, on their cell. */
  sites: { kind: "post" | "arsenal" | "camp" | "depot"; cell: string; endsAt: number }[];
  arsenal: string | null;
  /** The Campo's cell, the door of the Terraferma. */
  camp: string | null;
  /**
   * The towns out of the first fondaco's zone that a higher Casa will reach, with that Casa (the
   * first steps, lot 4: the lock on a town says the level); empty without `reach.byCasa`.
   */
  zoneCasa: Record<string, number>;
  /** The cities found, on their cell, at their point (on square tiles, those of the regions reached). */
  cities: { code: string; cell: string; region: string; x: number; y: number; size: number }[];
  /**
   * On square tiles (docs/plan-porcellana.md § 1, « the roads make the map »): the road from each
   * workshop to its fondaco, and from the Remise to the first fondaco, tile by tile; empty else.
   */
  roads: { from: string; to: string; pts: [number, number][] }[];
  /** How far a counter reveals. */
  radius: number;
  /** The Campo to build, likewise. */
  campSite: { cost: Deniers; minutes: number; casa: number } | null;
  /** The Remise's cell: the land vehicles bought and raised there. */
  depot: string | null;
  /** The Remise to build, likewise. */
  depotSite: { cost: Deniers; minutes: number; casa: number } | null;
}

/** What a house finds after an absence of `away.afterMinutes` or more (half a day by default). */
function awayOf(
  ctx: WorldContext,
  before: EmpireHouse | undefined,
  house: EmpireHouse,
  now: number,
  s: EmpireSettings,
): EmpireView["away"] {
  if (!before || now - before.lastActionAt < s.away.afterMinutes * 60_000) return null;
  const ready: Record<string, number> = {};
  for (const ws of house.workshops) {
    const job = ws.job;
    const recipe = ctx.theme.recipes.find((r) => r.code === ws.recipe && r.building === ws.type);
    if (!job || !recipe) continue;
    const done = Math.min(job.batches, Math.floor((now - job.startedAt) / job.batchMs));
    for (const [good, qty = 0] of Object.entries(recipe.outputs))
      ready[good] =
        (ready[good] ?? 0) + Math.floor((qty * done * lotYieldBps(ws.level, s)) / 10_000);
  }
  return {
    since: before.lastActionAt,
    ready,
    sitesDone: before.builds.filter((b) => b.endsAt <= now).length,
  };
}

function sharesOf(ctx: WorldContext, state: WorldState, now: number, s: EmpireSettings) {
  const houses = Object.keys(state.empire?.houses ?? {})
    .map((id) => empireHouseAt(ctx, state, id, now))
    .filter((h): h is EmpireHouse => h !== null && !isAsleep(h, now, s));
  const share = (owns: (h: EmpireHouse) => boolean) =>
    houses.length === 0 ? 0 : Math.floor((houses.filter(owns).length * 10_000) / houses.length);
  return share;
}

function site(
  cost: Deniers,
  minutes: number,
  level: number,
  shareBps: number,
  s: EmpireSettings,
): EmpireSite {
  const cut = catchupCut(shareBps, s);
  return {
    level,
    cost: applyBpsFloor(cost, 10_000 - cut.costCutBps),
    minutes: Math.round((minutes * (10_000 - cut.timeCutBps)) / 10_000),
    cutBps: cut.costCutBps,
  };
}

/** What a house reads of itself (the server's view, the simulator's bots): pure, the state untouched. */
export function empireView(
  ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId,
  now: number,
): EmpireView | null {
  const s = ctx.settings.empire;
  const house = empireHouseAt(ctx, state, playerId, now);
  if (!s || !house) return null;
  ensureMap(house, s);
  const share = sharesOf(ctx, state, now, s);
  const power = powerOfHouse(house, s);
  const line = casaLevelOf(house.casa, s);
  const level = house.casa + 1;
  const nextLine = level <= s.casa.length ? casaLevelOf(level, s) : null;
  const upgrades: EmpireView["upgrades"] = {};
  for (const ws of house.workshops) {
    const l = ws.level + 1;
    upgrades[ws.id] =
      l > workshopTop(house, ws.type, s)
        ? null
        : {
            ...site(
              levelCost(l, s),
              buildMinutesOf(l, s),
              l,
              share((h) => h.workshops.some((w) => w.level >= l)),
              s,
            ),
            yieldBps: lotYieldBps(ws.level, s),
            nextYieldBps: lotYieldBps(l, s),
          };
  }
  // Venetia's places, the Casa's: the regions' are their counters'.
  const pending = house.builds.filter((b) => b.kind === "newWorkshop" && !b.region).length;
  const inVenetia = house.workshops.filter((w) => regionOfWorkshop(w) === "veneto").length;
  const workshopSite = site(
    levelCost(1, s),
    buildMinutesOf(1, s),
    1,
    share((h) => h.workshops.length > 0),
    s,
  );
  const stores = storesOf(state.inventories[playerId], house, s);
  return {
    house,
    ...(house.welcome && s.welcome ? { welcome: { workshop: s.welcome.workshop } } : {}),
    power,
    band: bandOf(power, s),
    wagesBps: salaryBps(power, s),
    queueHours: s.queueHours,
    hasteFavour: s.haste
      ? (s.haste.favour[house.haste?.day === Math.floor(now / DAY_MS) ? house.haste.used : 0] ??
        null)
      : null,
    incomePerDay: incomePerDay(house, now),
    asleep: isAsleep(house, now, s),
    nextCasa: nextLine
      ? {
          ...site(
            nextLine.costDucats,
            nextLine.buildMinutes,
            level,
            share((h) => h.casa >= level),
            s,
          ),
          materials: nextLine.materials,
          requirementMet: casaRequirementMet(
            level,
            house.workshops.map((w) => w.level),
            s,
          ),
          requires: nextLine.requires,
          opens: nextLine.opens,
          // What the next level brings to the Fondaco (the first steps, lot 3): its stock, its zone
          // and the towns it adds.
          ...(nextLine.storeCap !== undefined ? { storeCap: nextLine.storeCap } : {}),
          ...(s.map.reach
            ? {
                reach: reachOf(homeLevelOf({ ...house, casa: level }, s), s),
                newCities: [...citiesCovered({ ...house, casa: level }, s)].filter(
                  (c) => !citiesCovered(house, s).has(c),
                ),
              }
            : {}),
        }
      : null,
    storeCap: line.storeCap ?? null,
    upgrades,
    newWorkshop: inVenetia + pending < line.workshopSlots ? workshopSite : null,
    workshopSite,
    buildSlots: line.buildSlots,
    workshopSlots: line.workshopSlots,
    carnet: carnetPreview(ctx, playerId, house, now, s),
    away: awayOf(ctx, state.empire?.houses[playerId], house, now, s),
    regions: regionsOf(house, s),
    map: mapOf(house, s),
    porta: portaViewOf(house, s, now),
    fleet: s.fleet
      ? {
          level: depotLevelOf(house),
          vehicles: (house.vehicles ?? []).length,
          cap: fleetCapOf(house, s),
          next: nextDepotLevel(house, s),
        }
      : null,
    stores,
    full: fullWorkshops(ctx, house, s, stores, line.storeCap, now),
    orders: ordersOf(ctx, house, playerId, s, now),
    delivered: (house.delivered ?? []).map((d) => ({ ...d, pay: d.pay.toString() })),
    moves: s.moves,
    vehicles: vehiclesOf(state, playerId, house, s),
    research: researchOf(house, s),
    interiors: interiorsOf(house, s, now),
    interiorRules: interiorRulesOf(s),
    workshopPlaces: Object.fromEntries(
      house.workshops.map((w) => [
        w.id,
        { slots: moduleSlotsOf(w.level, s, house), neighbourBps: neighbourBonus(ctx, house, w, s) },
      ]),
    ),
    courtLeft:
      house.court?.day === Math.floor(now / DAY_MS)
        ? house.court.left
        : s.qualities.courtPerCasa * house.casa,
    identity: identityOf(house, s),
    aid: aidOf(state, house, now, s),
    terra: terraOf(ctx, state, playerId, house, now, s),
  };
}

function terraOf(
  ctx: WorldContext,
  state: WorldState,
  playerId: string,
  house: EmpireHouse,
  now: number,
  s: EmpireSettings,
): EmpireView["terra"] {
  const cfg = ctx.settings.terraferma;
  const week = carnetWeek(now);
  const t = state.empire?.terra?.week === week ? state.empire.terra : undefined;
  const th = t?.theatres.find((x) => x.members.includes(playerId));
  const start = terraWeekStart(week);
  const roster = (state.empire?.terra?.rosters ?? []).find(
    (r) => r.week === week + 1 && r.company === house.company,
  );
  const hon = house.company ? state.empire?.terra?.honours?.[house.company] : undefined;
  return {
    week,
    contesa: isContesaWeek(week),
    entry: s.terra.entry,
    placementUntil:
      cfg?.live && cfg.start.placementHours > 0 ? start + cfg.start.placementHours * HOUR_MS : null,
    theatre: th
      ? {
          id: th.id,
          band: th.band,
          kind: th.kind,
          members: th.members.length,
          companies: th.companies ?? [],
        }
      : null,
    roster: roster ? { week: roster.week, members: roster.members } : null,
    rosterUntil: isContesaWeek(week + 1)
      ? start + (s.terra.contesa.deadlineDay + 1) * DAY_MS
      : null,
    nextContesa: isContesaWeek(week + 1),
    honours: hon
      ? {
          trophies: hon.trophies,
          lustre: hon.lustre,
          blazon: hon.blazon && hon.blazon.week >= week - 2 ? hon.blazon.cities : [],
        }
      : null,
    seals: house.terraSeals?.week === week ? house.terraSeals.seals : 0,
    best: house.terraBest ?? null,
  };
}

function aidOf(state: WorldState, house: EmpireHouse, now: number, s: EmpireSettings) {
  const r = regionOf("veneto", s);
  const day = Math.floor(now / DAY_MS);
  const cap = BigInt(s.aid.dailyDucatsPerCasa * house.casa) * DENIERS_PER_DUCAT;
  return {
    requests: (state.empire?.aid ?? [])
      .filter((x) => house.company && x.company === house.company)
      .filter((x) => now - x.at < s.aid.expireHours * HOUR_MS)
      .map((x) => ({
        ...x,
        value: (r.demands[x.good] ?? r.produces[x.good] ?? 0n) * BigInt(x.qty),
      })),
    merit: house.merit ?? 0,
    nextAskAt:
      house.askedAt !== undefined && now - house.askedAt < s.aid.everyHours * HOUR_MS
        ? house.askedAt + s.aid.everyHours * HOUR_MS
        : null,
    lotMax: s.aid.lotPerCasa * house.casa,
    supplyLeft: cap - (house.supplied?.day === day ? house.supplied.value : 0n),
    seniorFrom:
      house.companySince === undefined ? null : house.companySince + s.aid.minDays * DAY_MS,
  };
}

function identityOf(house: EmpireHouse, s: EmpireSettings): EmpireIdentity {
  const learnt = house.knowledge ?? [];
  const learning = house.learning ?? [];
  const nodeView = (
    code: string,
    effects: Record<string, number>,
    depth: number,
    open: boolean,
  ): KnowledgeNodeView => ({
    code,
    depth,
    effects,
    state: learnt.includes(code)
      ? "learnt"
      : learning.some((l) => l.code === code)
        ? "learning"
        : open
          ? "open"
          : "locked",
    cost: knowledgeCost(depth, s),
    minutes: knowledgeMinutes(depth, s),
  });
  return {
    arte: {
      current: house.arte ?? null,
      minor: house.minorArte ?? null,
      options: s.arte.artes.map((a) => ({
        code: a.code,
        buildings: a.buildings,
        effects: a.effects,
      })),
      fromCasa: s.arte.fromCasa,
      minorFromCasa: s.arte.minorFromCasa,
    },
    knowledge: {
      slots: learningSlots(house, s),
      learning,
      branches: s.knowledge.branches.map((b) => {
        const all = b.nodes.every((n) => learnt.includes(n.code));
        const chosen = b.capstones.some(
          (c) => learnt.includes(c.code) || learning.some((l) => l.code === c.code),
        );
        return {
          code: b.code,
          nodes: b.nodes.map((n, i) =>
            nodeView(
              n.code,
              n.effects,
              i + 1,
              b.nodes.slice(0, i).every((x) => learnt.includes(x.code)),
            ),
          ),
          capstones: b.capstones.map((c) =>
            nodeView(c.code, c.effects, b.nodes.length + 1, all && !chosen),
          ),
        };
      }),
    },
    staff: {
      slots: staffSlots(house, s),
      hireCost: staffHireCost(house, s),
      members: (house.staff ?? []).map((m) => ({
        ...m,
        tiersOpen: Math.max(0, Math.floor(m.level / s.staff.tierEvery) - m.skills.length),
      })),
      roles: Object.entries(s.staff.roles)
        // No more master for a workshop where the insides are: its hands are hired at its door.
        .filter(([, r]) => !(s.interior && r.place === "workshop"))
        .map(([role, r]) => ({
          role,
          place: r.place,
          paths: r.paths,
        })),
    },
    family: {
      generation: house.generation?.number ?? 1,
      heritage: house.heritage ?? 0,
      lineage: house.lineage ?? [],
      traits: s.family.traits,
    },
  };
}

function regionsOf(house: EmpireHouse, s: EmpireSettings): EmpireRegionView[] {
  return s.regions.map((r) => {
    const counter = counterLevel(house, r.code);
    const site = house.builds.find(
      (b) => (b.kind === "counter" || b.kind === "post") && b.region === r.code,
    );
    const far = r.hoursFromVenice > 0;
    const next: EmpireRegionView["next"] =
      far && !site && counter > 0 && counter < s.counters.maxLevel
        ? plainSite(
            counterCostOf(house, levelCost(counter + 1, s) * BigInt(s.counters.costTimes), s),
            buildMinutesOf(counter + 2, s),
            counter + 1,
          )
        : null;
    const { found, all } = citiesFound(house, r.code, s);
    return {
      code: r.code,
      casa: r.casa,
      hoursFromVenice: r.hoursFromVenice,
      workshopSlots: workshopPlaces(house, r.code, s) || r.workshopSlots,
      produces: Object.keys(r.produces),
      demands: Object.keys(r.demands),
      counter,
      buildingUntil: site?.endsAt ?? null,
      next,
      postCost: hasMap(s) && house.casa >= r.casa ? postCost(house, r.code, s) : null,
      cities: { found: found.length, all },
    };
  });
}

/** The cells of sea next to the coast cells seen. */
function seaAlong(seen: Set<string>, s: EmpireSettings): string[] {
  const out: string[] = [];
  for (const k of seen)
    if (s.map.cells[k]?.coast)
      for (const n of cellsWithin(k, 1, s)) if (!(n in s.map.cells) && !seen.has(n)) out.push(n);
  return out;
}

/** On square tiles, the roads of the house: each workshop to its fondaco, the Remise to the first. */
function roadsOf(house: EmpireHouse, s: EmpireSettings): EmpireMapView["roads"] {
  const posts = standingPosts(house, s);
  const round = (pts: [number, number][]) =>
    pts.map(([x, y]): [number, number] => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
  const out: EmpireMapView["roads"] = [];
  const owned = walkableOf(house, s);
  for (const w of house.workshops) {
    if (!w.tile) continue;
    const region = w.region ?? "veneto";
    const post = posts.find((p) => p.id === w.post) ?? posts.find((p) => p.region === region);
    if (!post) continue;
    const at = cellCentreOf(w.tile, s);
    out.push({ from: w.id, to: post.id, pts: round(roadBetween(at, [post.x, post.y], s, owned)) });
  }
  const home = posts[0];
  if (house.depot && home) {
    const at = cellCentreOf(house.depot, s);
    out.push({
      from: "depot",
      to: home.id,
      pts: round(roadBetween(at, [home.x, home.y], s, owned)),
    });
  }
  return out;
}

/** The map as the house sees it: its cells, its counters, its Arsenal, the cities it found. */
function mapOf(house: EmpireHouse, s: EmpireSettings): EmpireMapView {
  const seen = revealedOf(house, s);
  return {
    cells: Object.fromEntries(
      Object.entries(s.map.cells)
        .filter(([k]) => seen.has(k))
        .map(([k, c]) => [k, { region: c.region, coast: c.coast }]),
    ),
    // The sea along the coasts seen, seen too (decision of the owner, 3 November 2026: Venice on
    // its lagoon from the first screen); nothing to buy there, only the board's dressing.
    revealed: [...new Set([...seen, ...seaAlong(seen, s)])].sort(),
    posts: standingPosts(house, s)
      .slice(1)
      .map((p) => ({ ...p, reach: reachOf(p.level, s) })),
    home: (() => {
      const h = homePost(house, s);
      return {
        x: h.x,
        y: h.y,
        level: h.level,
        reach: reachOf(h.level, s),
        cell: h.cell,
        placed: house.home !== undefined,
      };
    })(),
    hexSize: s.map.hexSize,
    grid: s.map.grid,
    tileSize: s.map.tileSize,
    reach: s.map.reach,
    postSpacing: s.map.postSpacing,
    cityClearance: s.map.cityClearance,
    tiles: s.map.tiles,
    water: s.map.water,
    transferUnitsPerHour: s.map.transferUnitsPerHour,
    covered: s.map.reach ? [...citiesCovered(house, s)].sort() : [],
    zoneCasa: zoneCasaOf(house, s),
    unlocked: unlockedOf(house, s),
    ...(walkableOf(house, s) ? { toLink: citiesToLink(house, s) } : {}),
    buyable: buyableOf(house, s).map((cell) => {
      const c = s.map.cells[cell];
      return {
        cell,
        region: c?.region ?? "",
        coast: c?.coast ?? false,
        casa: s.regions.find((r) => r.code === c?.region)?.casa ?? 1,
      };
    }),
    sectorCost: sectorCost(house, s),
    sites: house.builds
      .filter(
        (b) =>
          (b.kind === "post" || b.kind === "arsenal" || b.kind === "camp" || b.kind === "depot") &&
          b.cell,
      )
      .map((b) => ({
        kind: b.kind as "post" | "arsenal" | "camp" | "depot",
        cell: b.cell ?? "",
        endsAt: b.endsAt,
      })),
    arsenal: house.arsenal ?? null,
    camp: house.camp ?? null,
    cities: s.map.cities
      .filter(
        (c) =>
          seen.has(c.cell) ||
          (squareGrid(s) && (s.regions.find((r) => r.code === c.region)?.casa ?? 99) <= house.casa),
      )
      .map((c) => {
        const [x, y] = citySpot(c, s);
        return { code: c.code, cell: c.cell, region: c.region, x, y, size: c.size };
      }),
    roads: squareGrid(s) ? roadsOf(house, s) : [],
    radius: s.map.revealRadius,
    campSite:
      s.map.camp && !house.camp && !house.builds.some((b) => b.kind === "camp")
        ? {
            cost: BigInt(s.map.camp.costDucats) * DENIERS_PER_DUCAT,
            minutes: s.map.camp.minutes,
            casa: s.map.camp.casa,
          }
        : null,
    depot: house.depot ?? null,
    depotSite:
      s.map.depot && !house.depot && !house.builds.some((b) => b.kind === "depot")
        ? {
            cost: BigInt(s.map.depot.costDucats) * DENIERS_PER_DUCAT,
            minutes: s.map.depot.minutes,
            casa: s.map.depot.casa,
          }
        : null,
  };
}

const plainSite = (cost: Deniers, minutes: number, level: number): EmpireSite => ({
  level,
  cost,
  minutes,
  cutBps: 0,
});

/**
 * A hop's road on the small tiles, reckoned on the whole map as `hopMs` times it (the house's view
 * holds only what it sees: a road reckoned there would be another), to a tenth of a unit.
 */
function legRoad(h: EmpireHouse, s: EmpireSettings, l: EmpireLeg): [number, number][] | undefined {
  if (!s.map.tiles) return undefined;
  const a = placePoint(h, s, l.from);
  const b = placePoint(h, s, l.to);
  if (!a || !b) return undefined;
  return roadBetween(a, b, s, walkableOf(h, s)).map(([x, y]) => [
    Math.round(x * 10) / 10,
    Math.round(y * 10) / 10,
  ]);
}

function vehiclesOf(state: WorldState, playerId: PlayerId, house: EmpireHouse, s: EmpireSettings) {
  const hold = houseEffect(house, "capacity", s);
  // A model's places of hold, the house's effect counted (as a vehicle's, holdOf).
  const capacity = (c: number) => c + Math.floor((c * hold) / 10_000);
  const mine = (house.vehicles ?? []).map((v) => {
    const { cargo: _, ...rest } = v;
    return {
      ...rest,
      at: v.at ?? "home",
      // The orders aboard, each a place of its hold (after Hades' Star's shipments).
      loads: v.loads ?? [],
      legs: (v.legs ?? []).map((l) => ({ ...l, road: legRoad(house, s, l) })),
      // Its places for trade modules, one a level of its model, and what is fitted there.
      slots: vehicleSlotsOf(house, v.type),
      fitted: v.fitted ?? [],
      capacity: holdOf(house, v, s),
    };
  });
  return {
    shop: Object.entries(s.vehicles).map(([type, v]) => ({
      type,
      casa: v.casa,
      cost: BigInt(v.costDucats) * DENIERS_PER_DUCAT,
      capacity: capacity(holdPlacesOf(house, type, s)),
      regions: v.regions,
      speedBps: v.speedBps,
      level: vehicleLevelOf(house, type),
      upgrade: upgradeCost(house, type, s),
    })),
    mine,
    haulPerDay:
      mine
        .filter((v) => s.vehicles[v.type]?.regions.length === 1)
        .reduce((n, v) => n + v.capacity, 0) * s.localTripsPerDay,
  };
}

function researchOf(house: EmpireHouse, s: EmpireSettings): EmpireView["research"] {
  const open = s.modules.filter(
    (m) =>
      (s.research.available.length === 0 || s.research.available.includes(m.code)) &&
      // The insides replace the workshop modules (docs/plan-ateliers.md lot A7).
      !(s.interior && m.kind === "workshop"),
  );
  return {
    slots: casaLevelOf(house.casa, s).researchSlots,
    running: house.research ?? [],
    modules: open.map((m) => {
      const level = house.modules?.[m.code] ?? 0;
      const nextLevel = level + 1;
      return {
        code: m.code,
        kind: m.kind,
        effect: m.effect,
        level,
        next:
          nextLevel > s.research.minutes.length
            ? null
            : plainSite(researchCost(nextLevel, s), researchMinutesOf(nextLevel, s), nextLevel),
      };
    }),
  };
}

/** The workshops with lots ready that the Fondaco's cap keeps waiting (the first steps, lot 3). */
function fullWorkshops(
  ctx: WorldContext,
  house: EmpireHouse,
  s: EmpireSettings,
  stores: { post: string; goods: Record<string, number> }[],
  cap: number | undefined,
  now: number,
): string[] {
  if (cap === undefined) return [];
  return house.workshops
    .filter((ws) => {
      const job = ws.job;
      if (!job || Math.floor((now - job.startedAt) / job.batchMs) <= 0) return false;
      const recipe = ctx.theme.recipes.find((r) => r.code === ws.recipe && r.building === ws.type);
      if (!recipe) return false;
      const goods = stores.find((x) => x.post === workshopPost(house, s, ws))?.goods ?? {};
      return (
        lotsThatFit(
          recipe.outputs,
          workshopYieldBps(ctx, house, ws, s),
          cap,
          (g) => goods[g] ?? 0,
        ) === 0
      );
    })
    .map((ws) => ws.id);
}

/** For each town out of the zone, the lowest Casa whose zone reaches it (the first steps, lot 4). */
function zoneCasaOf(house: EmpireHouse, s: EmpireSettings): Record<string, number> {
  if (!s.map.reach?.byCasa) return {};
  const now = citiesCovered(house, s);
  const out: Record<string, number> = {};
  const top = Math.min(s.casa.length, Math.max(house.casa, s.counters.maxLevel));
  for (let casa = house.casa + 1; casa <= top; casa++)
    for (const c of citiesCovered({ ...house, casa }, s))
      if (!now.has(c) && out[c] === undefined) out[c] = casa;
  return out;
}
