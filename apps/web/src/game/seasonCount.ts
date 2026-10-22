import { seasonDays } from "@comptoirs/engine/src/clock.js";
import { fr } from "../i18n.js";

/**
 * The season's day as the notices show it, « Jour 3 sur 42 », and the days left counting today
 * (0 once it is over): both from the engine's calendar days in Paris, never two roundings.
 */
export function seasonCount(
  world: { startsAt: number; endsAt: number },
  now: number,
): { label: string; left: number } {
  const s = seasonDays(world.startsAt, world.endsAt, now);
  return {
    label: fr.game.map.notice.season(s.day, s.total),
    left: now < world.endsAt ? s.left : 0,
  };
}

const inParis = (at: number, options: Intl.DateTimeFormatOptions) =>
  new Date(at).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", ...options });

/**
 * The first slide's text: « un mois » for a season within its calendar month, « jusqu'au 30
 * novembre » for one running past it (a world opened late in a month, `seasonBounds`).
 */
export function seasonText(world: { startsAt: number; endsAt: number }): string {
  const last = world.endsAt - 1;
  const month = { month: "numeric", year: "numeric" } as const;
  if (inParis(world.startsAt, month) === inParis(last, month))
    return fr.intro.slides[0]?.text ?? "";
  return fr.intro.longSeason(inParis(last, { day: "numeric", month: "long" }));
}
