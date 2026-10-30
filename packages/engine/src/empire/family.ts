import { GAME_TIME_ZONE, offsetAt } from "../clock.js";
import type { EmpireHouse, PlayerId } from "../state.js";
import { type Tx, fail } from "../tx.js";
import { empireSettings, ownHouse } from "./house.js";
import type { EmpireSettings } from "./settings.js";
import { addStaff } from "./staff.js";

/** The calendar quarter of an instant, in Venice's time: a number that grows by one a quarter. */
export function quarterOf(now: number): number {
  const local = new Date(now + offsetAt(now, GAME_TIME_ZONE));
  return local.getUTCFullYear() * 4 + Math.floor(local.getUTCMonth() / 3);
}

/**
 * The generations passed since the last read: at each new quarter the heir takes the house, a
 * member of the family joins the staff, the house earns a point of Heritage. At most a year of
 * them at once: no house sleeps that long without a word.
 */
export function passGenerations(tx: Tx, playerId: PlayerId): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  const now = quarterOf(tx.now);
  if (!h.generation) {
    h.generation = { quarter: now, number: 1 };
    return;
  }
  for (let k = 0; k < 4 && h.generation.quarter < now; k++) {
    h.generation = { quarter: h.generation.quarter + 1, number: h.generation.number + 1 };
    h.heritage = (h.heritage ?? 0) + 1;
    const roles = s.family.roles;
    const role = roles[(h.generation.number - 2) % Math.max(1, roles.length)];
    if (role && s.staff.roles[role])
      addStaff(tx, h, role, s.family.rarity, `generation ${h.generation.number}`);
  }
  if (h.generation.quarter < now) h.generation = { ...h.generation, quarter: now };
}

/** Opens a lineage trait with a point of Heritage: each once, for good. */
export function chooseLineage(tx: Tx, playerId: PlayerId, code: string): void {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  if (!s.family.traits.some((t) => t.code === code)) fail("unknown_choice");
  if ((h.lineage ?? []).includes(code)) fail("built");
  if ((h.heritage ?? 0) <= (h.lineage ?? []).length) fail("too_early");
  h.lineage = [...(h.lineage ?? []), code];
}

/** What the lineage's traits give to an effect. */
export function lineageEffect(h: EmpireHouse, effect: string, s: EmpireSettings): number {
  let total = 0;
  for (const code of h.lineage ?? [])
    total += s.family.traits.find((t) => t.code === code)?.effects[effect] ?? 0;
  return total;
}
