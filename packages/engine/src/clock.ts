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
