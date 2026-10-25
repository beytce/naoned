const ducatsFormat = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/**
 * A no-break space between the thousands and before the unit, so an amount is never cut at the end
 * of a line (« 10 » then « d »). Not the thin one of French typography: the game's faces draw it
 * with no width (« 11000 d »).
 */
const NBSP = "\u00a0";

/** "1 000,5": the thousands always grouped by a no-break space, whatever the browser's. */
function grouped(deniers: string | bigint): string {
  return ducatsFormat.format(Number(BigInt(deniers)) / 100).replace(/[\s\u00a0\u202f]/g, NBSP);
}

/** "12,5 ducats" from a string of deniers. */
export function ducats(deniers: string | bigint | null | undefined): string {
  if (deniers === null || deniers === undefined) return "—";
  return `${grouped(deniers)}${NBSP}ducats`;
}

/** Short form for tight spaces: "12,5 d". */
export function d(deniers: string | bigint | null | undefined): string {
  if (deniers === null || deniers === undefined) return "—";
  return `${grouped(deniers)}${NBSP}d`;
}

/** Whole ducats, cut toward zero (never rounded up): 1 128,80 is 1 128, −29,72 is −29. */
function cut(deniers: string | bigint): bigint {
  return (BigInt(deniers) / 100n) * 100n;
}

/**
 * Whole ducats for the sums of a hundred and more (purse, rival, ranking, returns): « 1 128 d ».
 * The deniers stay on unit prices and in the trade sheets, which keep `d()` and the exact sum.
 */
export function whole(deniers: string | bigint | null | undefined): string {
  if (deniers === null || deniers === undefined) return "—";
  return `${grouped(cut(deniers)).replace("-", "−")}${NBSP}d`;
}

/** The bare number in whole ducats, for the purse next to its coin: "1 000". */
export function amount(deniers: string | bigint | null | undefined): string {
  if (deniers === null || deniers === undefined) return "—";
  return grouped(cut(deniers));
}

export function duration(ms: number): string {
  if (ms <= 0) return "0 s";
  const s = Math.ceil(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.ceil(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h} h` : `${h} h ${rest.toString().padStart(2, "0")}`;
}

/** "30 min", "2 h", "1 h 30". */
export function minutesLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m.toString().padStart(2, "0")}`;
}

/** The hour of an instant in Paris, the French way: « 8 h », « 21 h 40 ». */
export function hourOf(at: number): string {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
    timeZone: "Europe/Paris",
  }).formatToParts(new Date(at));
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return m === 0 ? `${h}${NBSP}h` : `${h}${NBSP}h${NBSP}${String(m).padStart(2, "0")}`;
}
