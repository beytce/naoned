import { type CrestData, crestColours } from "./crest.js";
import { P } from "./palette.js";

/** A small hash of a name: the same portrait for the same member of the house, always. */
function hash(text: string): number {
  let h = 0;
  for (const c of text) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/** Headwear of Venice: the beretta, the soft cap, the veil, the corno of the Doge. */
const HATS = [
  // Beretta
  "M30 34 Q50 18 70 34 L68 40 Q50 32 32 40 Z",
  // Soft cap, a fold over the ear
  "M29 38 Q34 20 54 21 Q72 23 72 38 Q62 31 48 32 Q36 33 29 38 Z",
  // Veil, for the women of the house
  "M28 44 Q30 18 50 18 Q70 18 72 44 L76 70 Q66 52 64 40 Q50 30 36 40 Q34 52 24 70 Z",
  // Bare head, short hair
  "M33 38 Q36 22 50 22 Q64 22 67 38 Q60 30 50 30 Q40 30 33 38 Z",
];
const CORNO = "M30 38 Q34 16 58 14 Q74 16 70 38 Q50 30 30 38 Z";

/**
 * A member of the house as a medallion (R4): the field of its crest, a bust in the night's ink,
 * its headwear drawn from its name (the corno for a Doge). A woman's name wears the veil.
 */
export function Portrait({
  given,
  crest,
  size = 64,
  doge = false,
  faded = false,
}: {
  given: string;
  crest: CrestData | null;
  size?: number;
  doge?: boolean;
  /** A generation of the past: a little dimmer. */
  faded?: boolean;
}) {
  const [field, edge] = crestColours(crest?.color ?? "gold");
  const h = hash(given);
  const woman = /a$/.test(given) && given !== "Andrea" && given !== "Nicola";
  const hat = doge ? CORNO : woman ? HATS[2] : HATS[h % 2 === 0 ? 0 : h % 3 === 0 ? 3 : 1];
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={given}
      style={faded ? { opacity: 0.8 } : undefined}
    >
      <circle cx="50" cy="50" r="47" fill={field} stroke={edge} strokeWidth="4" />
      <circle cx="50" cy="50" r="40" fill="none" stroke={P.cream} strokeOpacity="0.25" />
      {/* The bust, in profile: shoulders, neck, head. */}
      <path d="M18 92 Q22 66 50 64 Q78 66 82 92 Z" fill={P.night} />
      <rect x="44" y="52" width="12" height="14" rx="4" fill={P.night} />
      <ellipse cx="50" cy="42" rx="15" ry="17" fill={P.night} />
      <path d={hat} fill={doge ? P.gold : P.night3} stroke={P.night} strokeWidth="1.5" />
      {/* A collar of the crest's colour. */}
      <path d="M34 70 Q50 80 66 70" fill="none" stroke={edge} strokeWidth="3" />
    </svg>
  );
}
