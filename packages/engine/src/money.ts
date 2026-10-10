/** Amounts of money, always in deniers (1 ducat = 100 deniers). Never a float. */
export type Deniers = bigint;

/** Rates are expressed in basis points: 10 000 bps = 100 %. */
export const BPS = 10_000n;

export const DENIERS_PER_DUCAT = 100n;

export function ducats(n: number): Deniers {
  return BigInt(n) * DENIERS_PER_DUCAT;
}

export function floorDiv(a: bigint, b: bigint): bigint {
  if (b <= 0n) throw new RangeError("divisor must be positive");
  const q = a / b;
  return a < 0n && q * b !== a ? q - 1n : q;
}

export function ceilDiv(a: bigint, b: bigint): bigint {
  return -floorDiv(-a, b);
}

/** amount × bps / 10 000, rounded down. */
export function applyBpsFloor(amount: bigint, bps: number | bigint): bigint {
  return floorDiv(amount * BigInt(bps), BPS);
}

/** amount × bps / 10 000, rounded up. */
export function applyBpsCeil(amount: bigint, bps: number | bigint): bigint {
  return ceilDiv(amount * BigInt(bps), BPS);
}

/** Integer quantity × (10 000 + bonus) / 10 000, rounded down: no fraction of a unit. */
export function applyBonusToQuantity(qty: number, bonusBps: number): number {
  return Math.floor((qty * (10_000 + bonusBps)) / 10_000);
}

export function bigMin(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

export function bigMax(a: bigint, b: bigint): bigint {
  return a > b ? a : b;
}
