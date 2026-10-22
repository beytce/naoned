/**
 * Seasons follow calendar months, in Venice's time zone: a season opens on the 1st at midnight
 * and closes on the 1st of the next month.
 */
import { monthStart, offsetAt } from "@comptoirs/engine";

export { monthStart };
export const SEASON_TIME_ZONE = "Europe/Paris";
const DAY_MS = 86_400_000;

/** The month that contains `at`, in the season's time zone. */
function monthOf(at: number, timeZone: string): { year: number; month: number } {
  const local = new Date(at + offsetAt(at, timeZone));
  return { year: local.getUTCFullYear(), month: local.getUTCMonth() };
}

/**
 * Bounds of a season opened at `now`. A world opened mid-month runs to the end of the month; with
 * fewer than `minDays` left, it runs to the end of the next one so that merchants have time to grow.
 */
export function seasonBounds(
  now: number,
  minDays = 14,
  timeZone = SEASON_TIME_ZONE,
): { startsAt: number; endsAt: number } {
  const { year, month } = monthOf(now, timeZone);
  let endsAt = monthStart(year, month + 1, timeZone);
  if (endsAt - now < minDays * DAY_MS) endsAt = monthStart(year, month + 2, timeZone);
  return { startsAt: now, endsAt };
}

/** The calendar month that follows a season ending at `endsAt`. */
export function nextSeasonBounds(
  endsAt: number,
  timeZone = SEASON_TIME_ZONE,
): { startsAt: number; endsAt: number } {
  const { year, month } = monthOf(endsAt, timeZone);
  return { startsAt: endsAt, endsAt: monthStart(year, month + 1, timeZone) };
}

const MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

/** "novembre 2026": the month a season is named after (the month it mostly covers). */
export function seasonMonthName(endsAt: number, timeZone = SEASON_TIME_ZONE): string {
  const { year, month } = monthOf(endsAt - DAY_MS, timeZone);
  return `${MONTHS[month]} ${year}`;
}
