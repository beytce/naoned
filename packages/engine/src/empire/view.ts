import { DENIERS_PER_DUCAT, type Deniers, applyBpsFloor } from "../money.js";
import {
  type CarnetObjective,
  DAY_MS,
  type EmpireHouse,
  type EmpireStaff,
  type EmpireTransfer,
  type EmpireVoyage,
  HOUR_MS,
  type PlayerId,
  type WorldContext,
  type WorldState,
} from "../state.js";
import { carnetPreview, carnetWeek } from "./carnet.js";
import { catchupCut } from "./catchup.js";
import { corsairRiskBps } from "./corsairs.js";
import {
  buildMinutesOf,
  casaLevelOf,
  casaRequirementMet,
  levelCost,
  lotYieldBps,
} from "./curves.js";
import { houseEffect } from "./effects.js";
import { extractionTeams as teamsOf } from "./extraction.js";
import { capacityOf, upgradeCost, vehicleLevelOf } from "./fleet.js";
import {
  counterCostOf,
  empireHouseAt,
  isAsleep,
  regionOfWorkshop,
  workshopPlaces,
  workshopTop,
} from "./house.js";
import { knowledgeCost, knowledgeMinutes, learningSlots } from "./knowledge.js";
import {
  arsenalCost,
  citiesCovered,
  citiesFound,
  citySpot,
  ensureMap,
  hasMap,
  homePost,
  postCost,
  reachOf,
  revealedOf,
  standingPosts,
} from "./map.js";
import { plansFor, researchCost, researchMinutesOf } from "./modules.js";
import { mudaDepartureAfter } from "./mudaSail.js";
import { bandOf } from "./power.js";
import { regionOf } from "./prices.js";
import type { EmpireSettings } from "./settings.js";
import { staffHireCost, staffSlots } from "./staff.js";
import { storesOf } from "./stores.js";
import { isContesaWeek, terraWeekStart } from "./terra.js";
import { counterLevel, incomePerDay, powerOfHouse } from "./trade.js";
import { moduleSlotsOf, neighbourBonus } from "./workshops.js";

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
  power: number;
  band: number;
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
      })
    | null;
  /** Each workshop's next level: null at the Casa's, or at the top. */
  upgrades: Record<string, EmpireSite | null>;
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
  /** The goods on the road between two counters. */
  transfers: EmpireTransfer[];
  /** The vehicles one may buy, those of the house, and its voyages under way. */
  vehicles: {
    shop: {
      type: string;
      casa: number;
      cost: Deniers;
      capacity: number;
      regions: string[];
      speedBps: number;
      /** A ship of the Arsenal: its site's minutes and materials, its places of modules. */
      build: { minutes: number; materials: Record<string, number> } | null;
      slots: number;
      muda: boolean;
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
      /** The counter it stands at, or is bound for. */
      at: string;
    }[];
    voyages: EmpireVoyage[];
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
      plans: number;
    }[];
  };
  /** The deposits the house sees (its regions, everywhere with the remote concession), its teams. */
  deposits: {
    id: string;
    region: string;
    good: string;
    stock: number;
    teams: number;
    mine: boolean;
  }[];
  teams: { max: number; used: number };
  /** The workshops' places for modules, and their neighbourhood's bonus (bps). */
  workshopPlaces: Record<string, { slots: number; neighbourBps: number }>;
  /** What the court of Venice still takes today. */
  courtLeft: number;
  identity: EmpireIdentity;
  /** The Muda (CADRAGE-v3 § 3.3): its next departure, the house's bids and places won. */
  muda: {
    next: number | null;
    bids: { vehicleId: string; amount: Deniers }[];
    passes: { vehicleId: string; departure: number; until: number }[];
    last: { departure: number; places: number; reserve: Deniers; prices: Deniers[] } | null;
  };
  /** The colleganze: the voyages open to stakes, the house's own, its record as a traveller. */
  colleganze: {
    open: {
      id: string;
      traveller: string;
      mine: boolean;
      vehicleType: string;
      from: string;
      to: string;
      good: string;
      qty: number;
      target: Deniers;
      staked: Deniers;
      myStake: Deniers;
      status: string;
      record: { voyages: number; returnBps: number } | null;
    }[];
    record: { voyages: number; returnBps: number } | null;
  };
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
  /** The corsairs' risk on the way there (bps), shown before any departure. */
  corsairRiskBps: number;
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
  home: { x: number; y: number; level: number; reach: number };
  /** The hexes' size, the reach at each level (none: no reach), the spacing of the counters. */
  hexSize: number;
  reach: { base: number; perLevel: number } | null;
  postSpacing: number;
  /** A land vehicle between two counters: so many units an hour. */
  transferUnitsPerHour: number;
  /** The cities the house's counters serve. */
  covered: string[];
  /** The counters and the Arsenal under way, on their cell. */
  sites: { kind: "post" | "arsenal" | "camp" | "depot"; cell: string; endsAt: number }[];
  arsenal: string | null;
  /** The Campo's cell, the door of the Terraferma. */
  camp: string | null;
  /** The cities found, on their cell, at their point. */
  cities: { code: string; cell: string; region: string; x: number; y: number }[];
  /** How far a counter reveals. */
  radius: number;
  /** The Arsenal to build: its ducats, its minutes, its Casa; null once it stands or without one. */
  arsenalSite: { cost: Deniers; minutes: number; casa: number } | null;
  /** The Campo to build, likewise. */
  campSite: { cost: Deniers; minutes: number; casa: number } | null;
  /** The Remise's cell: the land vehicles bought and raised there. */
  depot: string | null;
  /** The Remise to build, likewise. */
  depotSite: { cost: Deniers; minutes: number; casa: number } | null;
}

/** What a house finds after an absence of half a day or more. */
function awayOf(
  ctx: WorldContext,
  before: EmpireHouse | undefined,
  house: EmpireHouse,
  now: number,
  s: EmpireSettings,
): EmpireView["away"] {
  if (!before || now - before.lastActionAt < 12 * HOUR_MS) return null;
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
        : site(
            levelCost(l, s),
            buildMinutesOf(l, s),
            l,
            share((h) => h.workshops.some((w) => w.level >= l)),
            s,
          );
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
  return {
    house,
    power,
    band: bandOf(power, s),
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
        }
      : null,
    upgrades,
    newWorkshop: inVenetia + pending < line.workshopSlots ? workshopSite : null,
    workshopSite,
    buildSlots: line.buildSlots,
    workshopSlots: line.workshopSlots,
    carnet: carnetPreview(ctx, playerId, house, now, s),
    away: awayOf(ctx, state.empire?.houses[playerId], house, now, s),
    regions: regionsOf(house, s),
    map: mapOf(house, s),
    stores: storesOf(state.inventories[playerId], house, s),
    transfers: house.transfers ?? [],
    vehicles: vehiclesOf(state, playerId, house, s),
    research: researchOf(house, s),
    deposits: (state.empire?.deposits ?? [])
      .filter((d) => counterLevel(house, d.region) > 0 || houseEffect(house, "range", s) > 0)
      .map((d) => ({
        id: d.id,
        region: d.region,
        good: d.good,
        stock: d.stock,
        teams: d.teams.length,
        mine: d.teams.includes(playerId),
      })),
    teams: { max: teamsOf(house, s), used: (house.teams ?? []).length },
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
    muda: {
      next: s.muda.vehicles.length > 0 ? mudaDepartureAfter(now, s) : null,
      bids: (state.empire?.muda?.bids ?? [])
        .filter((b) => b.house === playerId)
        .map((b) => ({ vehicleId: b.vehicleId, amount: b.amount })),
      passes: (house.mudaPasses ?? []).filter((p) => p.until > now),
      last: state.empire?.muda?.lastResult ?? null,
    },
    colleganze: {
      open: (state.empire?.colleganze ?? [])
        .filter(
          (c) =>
            c.status === "open" ||
            c.traveller === playerId ||
            c.stakes.some((x) => x.house === playerId),
        )
        .map((c) => {
          const traveller = state.empire?.houses[c.traveller];
          return {
            id: c.id,
            traveller: c.traveller,
            mine: c.traveller === playerId,
            vehicleType: traveller?.vehicles?.find((v) => v.id === c.vehicleId)?.type ?? "",
            from: c.from,
            to: c.to,
            good: c.good,
            qty: c.qty,
            target: c.target,
            staked: c.stakes.reduce((a, x) => a + x.amount, 0n),
            myStake: c.stakes.find((x) => x.house === playerId)?.amount ?? 0n,
            status: c.status,
            record: traveller?.colleganzaRecord ?? null,
          };
        }),
      record: house.colleganzaRecord ?? null,
    },
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
      roles: Object.entries(s.staff.roles).map(([role, r]) => ({
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
      corsairRiskBps: corsairRiskBps(r.code, 0, s),
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

/** The map as the house sees it: its cells, its counters, its Arsenal, the cities it found. */
function mapOf(house: EmpireHouse, s: EmpireSettings): EmpireMapView {
  const seen = revealedOf(house, s);
  const a = s.map.arsenal;
  const building = house.builds.some((b) => b.kind === "arsenal");
  return {
    cells: Object.fromEntries(
      Object.entries(s.map.cells)
        .filter(([k]) => seen.has(k))
        .map(([k, c]) => [k, { region: c.region, coast: c.coast }]),
    ),
    revealed: [...seen].sort(),
    posts: standingPosts(house, s)
      .slice(1)
      .map((p) => ({ ...p, reach: reachOf(p.level, s) })),
    home: (() => {
      const h = homePost(house, s);
      return { x: h.x, y: h.y, level: h.level, reach: reachOf(h.level, s) };
    })(),
    hexSize: s.map.hexSize,
    reach: s.map.reach,
    postSpacing: s.map.postSpacing,
    transferUnitsPerHour: s.map.transferUnitsPerHour,
    covered: s.map.reach ? [...citiesCovered(house, s)].sort() : [],
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
      .filter((c) => seen.has(c.cell))
      .map((c) => {
        const [x, y] = citySpot(c, s);
        return { code: c.code, cell: c.cell, region: c.region, x, y };
      }),
    radius: s.map.revealRadius,
    arsenalSite:
      a && !house.arsenal && !building
        ? { cost: arsenalCost(s), minutes: a.minutes, casa: a.casa }
        : null,
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

function vehiclesOf(state: WorldState, playerId: PlayerId, house: EmpireHouse, s: EmpireSettings) {
  const hold = houseEffect(house, "capacity", s);
  const capacity = (c: number) => Number(applyBpsFloor(BigInt(c), 10_000 + hold));
  // A ship's hold counts its own fitted modules only.
  const mine = (house.vehicles ?? []).map((v) => ({
    ...v,
    at: v.at ?? "home",
    capacity: Number(
      applyBpsFloor(
        BigInt(capacityOf(house, v.type, s)),
        10_000 + houseEffect(house, "capacity", s, { vehicleId: v.id }),
      ),
    ),
  }));
  return {
    shop: Object.entries(s.vehicles).map(([type, v]) => ({
      type,
      casa: v.casa,
      cost: BigInt(v.costDucats) * DENIERS_PER_DUCAT,
      capacity: capacity(capacityOf(house, type, s)),
      regions: v.regions,
      speedBps: v.speedBps,
      build: v.build ?? null,
      slots: v.slots,
      muda: s.muda.vehicles.includes(type),
      level: vehicleLevelOf(house, type),
      upgrade: upgradeCost(house, type, s),
    })),
    mine,
    voyages: (state.empire?.voyages ?? []).filter((v) => v.house === playerId),
    haulPerDay:
      mine
        .filter((v) => s.vehicles[v.type]?.regions.length === 1)
        .reduce((n, v) => n + v.capacity, 0) * s.localTripsPerDay,
  };
}

function researchOf(house: EmpireHouse, s: EmpireSettings): EmpireView["research"] {
  const open = s.modules.filter(
    (m) => s.research.available.length === 0 || s.research.available.includes(m.code),
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
        plans: plansFor(nextLevel, s),
      };
    }),
  };
}
