import { type Deniers, applyBpsFloor } from "../money.js";
import type { EmpireSettings, RegionSettings } from "./settings.js";

const HOUR_MS = 3_600_000;

/** A region of the map, by its code. */
export function regionOf(code: string, s: EmpireSettings): RegionSettings {
  const region = s.regions.find((r) => r.code === code);
  if (!region) throw new RangeError(`no region ${code}`);
  return region;
}

/**
 * Hours of a route between two regions, passing by Venice, the trade's hub; a speed bonus (bps)
 * shortens it, never below an hour (CADRAGE-v3 § 3.3).
 */
export function routeHours(from: string, to: string, speedBps: number, s: EmpireSettings): number {
  if (from === to) return 0;
  const base = regionOf(from, s).hoursFromVenice + regionOf(to, s).hoursFromVenice;
  return Math.max(1, Math.round((base * 10_000) / (10_000 + Math.max(0, speedBps))));
}

/** A good's local reference price in a region, made or wanted there; null when it is not traded. */
export function refPriceOf(region: string, good: string, s: EmpireSettings): Deniers | null {
  const r = regionOf(region, s);
  return r.produces[good] ?? r.demands[good] ?? null;
}

/** A region's price of a good: its reference times its pressure, between the floor and ceiling. */
export function priceAt(ref: Deniers, pressureBps: number, s: EmpireSettings): Deniers {
  const p = Math.min(s.prices.ceilBps, Math.max(s.prices.floorBps, pressureBps));
  return applyBpsFloor(ref, p);
}

/**
 * The pressure after a trade of `qty` on a market `depth` units deep a day: buying raises it,
 * selling lowers it, by `impactBps` for a whole day's depth.
 */
export function pressureAfterTrade(
  pressureBps: number,
  qty: number,
  depth: number,
  side: "buy" | "sell",
  s: EmpireSettings,
): number {
  if (qty <= 0 || depth <= 0) return pressureBps;
  const move = Math.round((s.prices.impactBps * qty) / depth);
  return Math.max(0, pressureBps + (side === "buy" ? move : -move));
}

/** The pressure after some hours: back halfway toward the reference each half-life. */
export function pressureAfterHours(pressureBps: number, hours: number, s: EmpireSettings): number {
  const left = 0.5 ** (Math.max(0, hours) / s.prices.halfLifeHours);
  return Math.round(10_000 + (pressureBps - 10_000) * left);
}

/**
 * How late a house learns a region's prices (profondeur.md § D): live where it has a counter and
 * in Venetia; elsewhere as late as a ship from there, less late with its intelligence (the
 * portolan, the company's courier), in bps.
 */
export function newsDelayMs(
  region: string,
  hasCounter: boolean,
  intelBps: number,
  s: EmpireSettings,
): number {
  if (hasCounter) return 0;
  const hours = regionOf(region, s).hoursFromVenice;
  if (hours === 0) return 0;
  return Math.round((hours * HOUR_MS * 10_000) / (10_000 + Math.max(0, intelBps)));
}
