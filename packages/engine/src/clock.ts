/** Seasons, quiet hours and opening hours follow Venice's time zone. */
export const GAME_TIME_ZONE = "Europe/Paris";

const formatters = new Map<string, Intl.DateTimeFormat>();

/** Hour of the day (0–23) at `at` in a time zone. Deterministic: depends only on the instant. */
export function hourIn(at: number, timeZone = GAME_TIME_ZONE): number {
  // The game's zones are offset by whole hours: the answer holds for the whole UTC hour.
  const key = `${timeZone}:${Math.floor(at / 3_600_000)}`;
  const known = hours.get(key);
  if (known !== undefined) return known;
  if (hours.size > 2_000) hours.clear();
  const hour = formatHour(at, timeZone);
  hours.set(key, hour);
  return hour;
}

const hours = new Map<string, number>();

function formatHour(at: number, timeZone: string): number {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "numeric", hourCycle: "h23" });
    formatters.set(timeZone, f);
  }
  return Number(f.formatToParts(at).find((p) => p.type === "hour")?.value ?? 12);
}

/** Whether `hour` falls in [from, to), the span wrapping past midnight when from > to. */
export function hourWithin(hour: number, span: { from: number; to: number }): boolean {
  return span.from > span.to
    ? hour >= span.from || hour < span.to
    : hour >= span.from && hour < span.to;
}

const dayFormatters = new Map<string, Intl.DateTimeFormat>();

/** Midnight (in a time zone) of the day `at` falls on, and that day's weekday (0: Sunday). */
export function dayStartIn(
  at: number,
  timeZone = GAME_TIME_ZONE,
): { start: number; weekday: number } {
  let f = dayFormatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23",
    });
    dayFormatters.set(timeZone, f);
  }
  const parts = (t: number) => {
    const p = Object.fromEntries(f.formatToParts(t).map((x) => [x.type, x.value]));
    return {
      y: Number(p.year),
      m: Number(p.month),
      d: Number(p.day),
      h: Number(p.hour),
      min: Number(p.minute),
    };
  };
  const { y, m, d } = parts(at);
  const midnightUtc = Date.UTC(y, m - 1, d);
  // The zone's offset at that midnight (changes of time happen at night, never at midnight).
  const q = parts(midnightUtc);
  const offset = Date.UTC(q.y, q.m - 1, q.d, q.h, q.min) - midnightUtc;
  return { start: midnightUtc - offset, weekday: new Date(midnightUtc).getUTCDay() };
}

const DAY_MS = 86_400_000;

/** Offset of the time zone from UTC at `at`, in ms (positive east of Greenwich). */
export function offsetAt(at: number, timeZone = GAME_TIME_ZONE): number {
  // The offset holds for a whole hour of UTC (the changes of time fall on the hour), so it is
  // computed once an hour and a zone: a formatter is dear, and the clock is read everywhere.
  const hour = Math.floor(at / HOUR_MS);
  const key = `${timeZone}:${hour}`;
  const known = OFFSETS.get(key);
  if (known !== undefined) return known;
  const start = hour * HOUR_MS;
  const parts = formatterOf(timeZone).formatToParts(start);
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const local = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second"));
  const offset = local - start;
  if (OFFSETS.size > 50_000) OFFSETS.clear();
  OFFSETS.set(key, offset);
  return offset;
}

const HOUR_MS = 3_600_000;
const OFFSETS = new Map<string, number>();
const FORMATTERS = new Map<string, Intl.DateTimeFormat>();
function formatterOf(timeZone: string): Intl.DateTimeFormat {
  let f = FORMATTERS.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    FORMATTERS.set(timeZone, f);
  }
  return f;
}

/** Midnight on the 1st of the given month (month may overflow: 12 is January next year). */
export function monthStart(year: number, month: number, timeZone = GAME_TIME_ZONE): number {
  const guess = Date.UTC(year, month, 1);
  const first = guess - offsetAt(guess, timeZone);
  // Across a change of time, the offset at the instant itself is the right one.
  return guess - offsetAt(first, timeZone);
}

/** The calendar day `at` falls on in a time zone, as a count of days since 1 January 1970. */
function civilDay(at: number, timeZone: string): number {
  return Math.floor((at + offsetAt(at, timeZone)) / DAY_MS);
}

/**
 * The season's days on the calendar of its time zone: `day` (1 on the day it opened) of `total`
 * (every calendar day it touches, its last one ending at `endsAt`), `left` counting today, so
 * that day + left - 1 = total. Before its start it is day 1, after its end its last day.
 */
export function seasonDays(
  startsAt: number,
  endsAt: number,
  now: number,
  timeZone = GAME_TIME_ZONE,
): { day: number; total: number; left: number } {
  const first = civilDay(startsAt, timeZone);
  const total = Math.max(1, civilDay(endsAt - 1, timeZone) - first + 1);
  const day = Math.min(total, Math.max(1, civilDay(now, timeZone) - first + 1));
  return { day, total, left: total - day + 1 };
}
