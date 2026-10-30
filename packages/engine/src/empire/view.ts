import { type Deniers, applyBpsFloor } from "../money.js";
import type { EmpireHouse, PlayerId, WorldContext, WorldState } from "../state.js";
import { catchupCut } from "./catchup.js";
import { buildMinutesOf, casaLevelOf, casaRequirementMet, levelCost } from "./curves.js";
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
  };
}
