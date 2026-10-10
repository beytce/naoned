const ducatsFormat = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** "12,5 ducats" from a string of deniers. */
export function ducats(deniers: string | bigint | null | undefined): string {
  if (deniers === null || deniers === undefined) return "—";
  return `${ducatsFormat.format(Number(BigInt(deniers)) / 100)} ducats`;
}

/** Short form for tight spaces: "12,5 d". */
export function d(deniers: string | bigint | null | undefined): string {
  if (deniers === null || deniers === undefined) return "—";
  return `${ducatsFormat.format(Number(BigInt(deniers)) / 100)} d`;
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

export function minutesLabel(minutes: number): string {
  return minutes % 60 === 0 ? `${minutes / 60} h` : `${minutes} min`;
}
