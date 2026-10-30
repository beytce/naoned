import { DENIERS_PER_DUCAT, type Deniers, applyBpsCeil } from "../money.js";
import {
  DAY_MS,
  type EmpireHouse,
  type EmpireStaff,
  type PlayerId,
  SINK_ACCOUNT,
  cashAccount,
} from "../state.js";
import { type Tx, fail, nextId, transfer } from "../tx.js";
import type { EffectPlace } from "./effects.js";
import { empireSettings, ownHouse } from "./house.js";
import type { EmpireSettings } from "./settings.js";
import { relaunchWorkshop } from "./workshops.js";

/** The places for staff: so many, one more every so many levels of the Casa. */
export function staffSlots(h: EmpireHouse, s: EmpireSettings): number {
  return s.staff.slotsBase + Math.floor(h.casa / s.staff.casaPerSlot);
}

/** The next hire's price: dearer with each one hired. */
export function staffHireCost(h: EmpireHouse, s: EmpireSettings): Deniers {
  let cost = BigInt(s.staff.hireCostDucats) * DENIERS_PER_DUCAT;
  for (let n = 0; n < (h.hired ?? 0); n++) cost = applyBpsCeil(cost, s.staff.hireGrowthBps);
  return cost;
}

/** Joins a member to the staff (hired, of the family, of a relic). */
export function addStaff(
  tx: Tx,
  h: EmpireHouse,
  role: string,
  rarity: string,
  family?: string,
): EmpireStaff {
  const member: EmpireStaff = {
    id: nextId(tx, "p"),
    role,
    rarity,
    level: 1,
    xp: 0,
    skills: [],
    ...(family ? { family } : {}),
  };
  h.staff = [...(h.staff ?? []), member];
  return member;
}

/** Hires a common member of a role, within the places; never sold, only paid for in ducats. */
export function hireStaff(tx: Tx, playerId: PlayerId, role: string): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  if (!s.staff.roles[role]) fail("unknown_choice");
  if ((h.staff ?? []).length >= staffSlots(h, s)) fail("no_room");
  transfer(
    tx,
    cashAccount(playerId),
    SINK_ACCOUNT,
    staffHireCost(h, s),
    "empire_build",
    `hire:${role}`,
  );
  h.hired = (h.hired ?? 0) + 1;
  addStaff(tx, h, role, "common");
}

/** Places a member where its role works: a workshop, a region with a counter, a vehicle. */
export function placeStaff(tx: Tx, playerId: PlayerId, staffId: string, at: string): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  const m = h.staff?.find((x) => x.id === staffId);
  if (!m) fail("unknown_building");
  const place = s.staff.roles[m.role]?.place;
  const exists =
    place === "workshop"
      ? h.workshops.some((w) => w.id === at)
      : place === "vehicle"
        ? (h.vehicles ?? []).some((v) => v.id === at)
        : at === "veneto" || (h.counters?.[at] ?? 0) > 0;
  if (!exists) fail("unknown_target");
  // One of a role a place: the one there steps aside.
  for (const o of h.staff ?? [])
    if (o !== m && o.role === m.role && o.placedAt === at) o.placedAt = undefined;
  m.placedAt = at;
  m.placedSince = tx.now;
}

/** Experience for a member's work; it levels up by itself, up to the last level. */
export function gainXp(m: EmpireStaff, xp: number, s: EmpireSettings): void {
  if (xp <= 0) return;
  m.xp += xp;
  m.level = Math.min(s.staff.maxLevel, 1 + Math.floor(m.xp / s.staff.xpPerLevel));
}

/** Chooses a member's path at its next tier, for good. */
export function chooseSkill(tx: Tx, playerId: PlayerId, staffId: string, path: number): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  const m = h.staff?.find((x) => x.id === staffId);
  if (!m) fail("unknown_building");
  const role = s.staff.roles[m.role];
  if (!role || !Number.isInteger(path) || path < 0 || path >= role.paths.length)
    fail("unknown_choice");
  if (m.skills.length >= Math.floor(m.level / s.staff.tierEvery)) fail("too_early");
  m.skills = [...m.skills, path];
}

/** Whether a member placed at `at` works at this place. */
function worksAt(
  m: EmpireStaff,
  place: EffectPlace | undefined,
  kind: string | undefined,
): boolean {
  if (!m.placedAt || !place) return false;
  if (kind === "workshop") return place.workshopId === m.placedAt;
  if (kind === "vehicle") return place.vehicleId === m.placedAt;
  return place.region === m.placedAt;
}

/** What the staff placed at a place gives to an effect: by level, then its paths, its rarity over all. */
export function staffEffect(
  h: EmpireHouse,
  effect: string,
  s: EmpireSettings,
  place?: EffectPlace,
): number {
  let total = 0;
  for (const m of h.staff ?? []) {
    const role = s.staff.roles[m.role];
    if (!role || !worksAt(m, place, role.place)) continue;
    let own = (role.perLevel[effect] ?? 0) * m.level;
    for (const path of m.skills) own += role.paths[path]?.[effect] ?? 0;
    total += Math.floor((own * (s.staff.rarityBps[m.rarity] ?? 10_000)) / 10_000);
  }
  return total;
}

/** Experience a factor earns a day at work. */
const FACTOR_XP_A_DAY = 10;

/**
 * The factors at work since the last read (profondeur.md § F): each relaunches the queues of its
 * region as they ran dry, at the instant they did, with what the store held; and grows a day at a
 * time. Lazy, as the production: settled at the house's next command.
 */
export function runFactors(tx: Tx, playerId: PlayerId): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  for (const m of h.staff ?? []) {
    if (s.staff.roles[m.role]?.place !== "region" || !m.placedAt || m.placedSince === undefined)
      continue;
    const region = m.placedAt;
    for (const ws of h.workshops) {
      if ((ws.region ?? "veneto") !== region) continue;
      // At most a fortnight of queues: no house sleeps longer without a word.
      for (let k = 0; k < 28 && ws.job; k++) {
        const end = ws.job.startedAt + ws.job.batches * ws.job.batchMs;
        if (end > tx.now || end < m.placedSince) break;
        relaunchWorkshop({ ...tx, now: end }, playerId, ws.id);
      }
    }
    const days = Math.floor((tx.now - m.placedSince) / DAY_MS);
    if (days > 0) {
      gainXp(m, days * FACTOR_XP_A_DAY, s);
      m.placedSince += days * DAY_MS;
    }
  }
}
