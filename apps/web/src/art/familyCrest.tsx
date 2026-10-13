import { Crest } from "./crest.js";
import { P } from "./palette.js";

/**
 * The four families and Milan on the campaign's map: a colour each (never gold, kept for money
 * and the Pass) and a symbol on their banner.
 */
export const FAMILY_LOOK: Record<string, { color: string; symbol: string; hex: string }> = {
  contarini: { color: "lagoon", symbol: "tower", hex: P.lagoon },
  morosini: { color: "emerald", symbol: "wheat", hex: P.emerald },
  mocenigo: { color: "vermilion", symbol: "anchor", hex: P.vermilion },
  dandolo: { color: "violet", symbol: "lion", hex: P.violet },
  milan: { color: "ink", symbol: "crown", hex: "#5B6E73" },
};

/** The militia's lands: neither a family nor Milan. */
export const MILITIA_HEX = "#3A4F50";

export function familyHex(holder: string | null): string {
  return holder ? (FAMILY_LOOK[holder]?.hex ?? MILITIA_HEX) : MILITIA_HEX;
}

/** A family's banner (or Milan's). */
export function FamilyCrest({ family, size = 48 }: { family: string; size?: number }) {
  const look = FAMILY_LOOK[family] ?? { color: "ink", symbol: "star" };
  return <Crest crest={{ shape: "banner", color: look.color, symbol: look.symbol }} size={size} />;
}
