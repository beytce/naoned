import { type Deniers, applyBpsFloor } from "../money.js";
import type { EmpireSettings } from "./settings.js";

/**
 * The share of a colleganza's return (profondeur.md § E): the investors (stantes) put up the
 * capital, the traveller (tractator) the voyage. With a profit, each investor has his stake back
 * and the profit is shared, the traveller's part first (a quarter, by custom); with a loss, what
 * came back is shared by the stakes and the traveller earns nothing. Every denier that came back
 * is shared, none is made: what is left over by rounding goes to the traveller with a profit, to
 * the largest stake with a loss.
 */
export function settleColleganza(
  stakes: readonly Deniers[],
  proceeds: Deniers,
  s: EmpireSettings,
): { investors: Deniers[]; traveller: Deniers } {
  const capital = stakes.reduce((a, x) => a + x, 0n);
  if (capital <= 0n) return { investors: stakes.map(() => 0n), traveller: proceeds };
  if (proceeds > capital) {
    const profit = proceeds - capital;
    const travellerPart = applyBpsFloor(profit, s.colleganza.travellerShareBps);
    const shared = profit - travellerPart;
    const investors = stakes.map((x) => x + (shared * x) / capital);
    const given = investors.reduce((a, x) => a + x, 0n);
    return { investors, traveller: proceeds - given };
  }
  const investors = stakes.map((x) => (proceeds * x) / capital);
  const rest = proceeds - investors.reduce((a, x) => a + x, 0n);
  let largest = 0;
  stakes.forEach((x, i) => {
    if (x > (stakes[largest] ?? 0n)) largest = i;
  });
  investors[largest] = (investors[largest] ?? 0n) + rest;
  return { investors, traveller: 0n };
}
