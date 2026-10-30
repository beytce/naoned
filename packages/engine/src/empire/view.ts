import { type Deniers, applyBpsFloor } from "../money.js";
import {
  type CarnetObjective,
  type EmpireHouse,
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
import { empireHouseAt, isAsleep } from "./house.js";
import { bandOf } from "./power.js";
import type { EmpireSettings } from "./settings.js";
import { powerOfHouse } from "./trade.js";

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
  /** A new workshop: null without a free place. */
  newWorkshop: EmpireSite | null;
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
      l > house.casa || l > s.workshops.maxLevel
        ? null
        : site(
            levelCost(l, s),
            buildMinutesOf(l, s),
            l,
            share((h) => h.workshops.some((w) => w.level >= l)),
            s,
          );
  }
  const pending = house.builds.filter((b) => b.kind === "newWorkshop").length;
  return {
    house,
    power,
    band: bandOf(power, s),
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
    newWorkshop:
      house.workshops.length + pending < line.workshopSlots
        ? site(
            levelCost(1, s),
            buildMinutesOf(1, s),
            1,
            share((h) => h.workshops.length > 0),
            s,
          )
        : null,
    buildSlots: line.buildSlots,
    workshopSlots: line.workshopSlots,
    carnet: carnetPreview(ctx, playerId, house, now, s),
    away: awayOf(ctx, state.empire?.houses[playerId], house, now, s),
  };
}
