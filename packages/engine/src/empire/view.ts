import { DENIERS_PER_DUCAT, type Deniers, applyBpsFloor } from "../money.js";
import {
  type CarnetObjective,
  DAY_MS,
  type EmpireHouse,
  type EmpireStaff,
  type EmpireVoyage,
  HOUR_MS,
  type PlayerId,
  type WorldContext,
  type WorldState,
} from "../state.js";
import { carnetPreview } from "./carnet.js";
import { catchupCut } from "./catchup.js";
import {
  buildMinutesOf,
  casaLevelOf,
  casaRequirementMet,
  levelCost,
  lotYieldBps,
} from "./curves.js";
import { houseEffect } from "./effects.js";
import { extractionTeams as teamsOf } from "./extraction.js";
import {
  charterFavourOf,
  counterCostOf,
  empireHouseAt,
  isAsleep,
  regionOfWorkshop,
  workshopPlaces,
  workshopTop,
} from "./house.js";
import { knowledgeCost, knowledgeMinutes, learningSlots } from "./knowledge.js";
import { plansFor, researchCost, researchMinutesOf } from "./modules.js";
import { bandOf } from "./power.js";
import type { EmpireSettings } from "./settings.js";
import { staffHireCost, staffSlots } from "./staff.js";
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
  /** The vehicles one may buy, those of the house, and its voyages under way. */
  vehicles: {
    shop: {
      type: string;
      casa: number;
      cost: Deniers;
      capacity: number;
      regions: string[];
      speedBps: number;
    }[];
    mine: { id: string; type: string; busyUntil: number; capacity: number }[];
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
  charterFavour: number;
  hoursFromVenice: number;
  workshopSlots: number;
  /** The goods it makes cheaply (a workshop makes no other raw good there) and those it asks. */
  produces: string[];
  demands: string[];
  /** Its counter's level (Venetia: one, the Casa's), 0 without. */
  counter: number;
  /** A counter's site under way there: its end. */
  buildingUntil: number | null;
  /** The next level of its counter, or its charter's counter: null when none may be built now. */
  next: (EmpireSite & { charter: boolean }) | null;
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
    const site = house.builds.find((b) => b.kind === "counter" && b.region === r.code);
    const far = r.hoursFromVenice > 0;
    let next: EmpireRegionView["next"] = null;
    if (far && !site && counter === 0 && house.casa >= r.casa)
      next = {
        ...plainSite(
          counterCostOf(house, levelCost(r.casa, s) * BigInt(s.counters.costTimes), s),
          r.hoursFromVenice * 60 + 60,
          1,
        ),
        charter: true,
      };
    else if (far && !site && counter > 0 && counter < s.counters.maxLevel)
      next = {
        ...plainSite(
          counterCostOf(house, levelCost(counter + 1, s) * BigInt(s.counters.costTimes), s),
          buildMinutesOf(counter + 2, s),
          counter + 1,
        ),
        charter: false,
      };
    return {
      code: r.code,
      casa: r.casa,
      charterFavour: charterFavourOf(house, r.charterFavour, s),
      hoursFromVenice: r.hoursFromVenice,
      workshopSlots: workshopPlaces(house, r.code, s) || r.workshopSlots,
      produces: Object.keys(r.produces),
      demands: Object.keys(r.demands),
      counter,
      buildingUntil: site?.endsAt ?? null,
      next,
    };
  });
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
  const mine = (house.vehicles ?? []).map((v) => ({
    ...v,
    capacity: capacity(s.vehicles[v.type]?.capacity ?? 0),
  }));
  return {
    shop: Object.entries(s.vehicles).map(([type, v]) => ({
      type,
      casa: v.casa,
      cost: BigInt(v.costDucats) * DENIERS_PER_DUCAT,
      capacity: capacity(v.capacity),
      regions: v.regions,
      speedBps: v.speedBps,
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
