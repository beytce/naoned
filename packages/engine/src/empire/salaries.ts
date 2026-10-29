import { type Deniers, applyBpsFloor } from "../money.js";
import type { EmpireSettings } from "./settings.js";

/**
 * The share of receipts a house pays in wages (arbitrage A, CADRAGE-v3 § 5.2): from the smallest
 * house's share toward the largest's as its Power grows, halfway at `halfPower`. Taken on what is
 * sold, never on the treasury, never during an absence.
 */
export function salaryBps(power: number, s: EmpireSettings): number {
  const { minBps, maxBps, halfPower } = s.salaries;
  const p = Math.max(0, power);
  return minBps + Math.floor(((maxBps - minBps) * p) / (p + halfPower));
}

/** The wages on a receipt, in whole deniers, rounded down: never more than the receipt. */
export function wagesOn(receipt: Deniers, power: number, s: EmpireSettings): Deniers {
  if (receipt <= 0n) return 0n;
  return applyBpsFloor(receipt, salaryBps(power, s));
}
