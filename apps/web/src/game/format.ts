const ducatsFormat = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/**
 * The thin no-break space of French typography: between the thousands and before the unit, so an
 * amount is never cut at the end of a line (« 10 » then « d »).
 */
const THIN = "\u202f";

/** "1 000,5": the thousands always grouped by a thin no-break space, whatever the browser's. */
function grouped(deniers: string | bigint): string {
  return ducatsFormat.format(Number(BigInt(deniers)) / 100).replace(/[\s\u00a0\u202f]/g, THIN);
}

/** "12,5 ducats" from a string of deniers. */
export function ducats(deniers: string | bigint | null | undefined): string {
  if (deniers === null || deniers === undefined) return "—";
  return `${grouped(deniers)}${THIN}ducats`;
}

/** Short form for tight spaces: "12,5 d". */
export function d(deniers: string | bigint | null | undefined): string {
  if (deniers === null || deniers === undefined) return "—";
  return `${grouped(deniers)}${THIN}d`;
}

/** The bare number, for the purse next to its coin: "1 000". */
export function amount(deniers: string | bigint | null | undefined): string {
  if (deniers === null || deniers === undefined) return "—";
  return grouped(deniers);
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
