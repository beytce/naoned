/**
 * Seasons follow calendar months, in Venice's time zone: a season opens on the 1st at midnight
 * and closes on the 1st of the next month.
 */
export const SEASON_TIME_ZONE = "Europe/Paris";
const DAY_MS = 86_400_000;

/** Offset of the time zone from UTC at `at`, in ms (positive east of Greenwich). */
function offsetAt(at: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(at);
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const local = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second"));
  return local - Math.floor(at / 1000) * 1000;
}

/** Midnight on the 1st of the given month (month may overflow: 12 is January next year). */
export function monthStart(year: number, month: number, timeZone = SEASON_TIME_ZONE): number {
  const guess = Date.UTC(year, month, 1);
  const first = guess - offsetAt(guess, timeZone);
  // Across a change of time, the offset at the instant itself is the right one.
  return guess - offsetAt(first, timeZone);
}

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
