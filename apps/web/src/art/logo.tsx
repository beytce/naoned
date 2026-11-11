/**
 * Fondaco's logo (docs/audit-visuel-2026-11-11, validated by the owner on 11 November 2026): a
 * Venetian ogee arch, the fondaco's, drawn in one red stroke, the thread of the game; a dot of ink
 * on its threshold, the quay where every thread starts; on a bevelled porcelain tile. Source:
 * brand/fondaco.svg (and fondaco-16.svg, the browser tab's); scripts/icons.mjs renders the app
 * icons from them.
 */
const RED = "#C23B2E";
const INK = "#2A2725";
/** The arch, in the 64-unit box of the sources. */
export const ARCH =
  "M19 49 V31 C19 23 26 21 29.5 16.5 C31 14.5 32 12.5 32 9.5 C32 12.5 33 14.5 34.5 16.5 C38 21 45 23 45 31 V49";
/** The arch drawn smaller, inside a round badge. */
const ARCH_ROUND =
  "M21 48 V32 C21 25 27 23 30 19 C31.2 17.4 32 15.6 32 13.5 C32 15.6 32.8 17.4 34 19 C37 23 43 25 43 32 V48";

/**
 * The badge: the white arch on a round of red, as in the game's header (it opens the profile).
 * Small, the stroke grows so that the arch still reads.
 */
export function Emblem({ size = 64, className = "" }: { size?: number; className?: string }) {
  const stroke = size <= 20 ? 7 : size <= 36 ? 5.5 : 5;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={`inline-block shrink-0 ${className}`}
    >
      <circle cx="32" cy="32" r="30" fill={RED} />
      <path
        d={ARCH_ROUND}
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The mark on its porcelain tile and foot (the app's icon). */
export function Mark({ size = 64, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={`inline-block shrink-0 ${className}`}
    >
      <rect x="3" y="5" width="58" height="57" rx="15" fill="#D9D2C6" />
      <rect x="3" y="2" width="58" height="57" rx="15" fill="#FBFAF7" />
      <path
        d={ARCH}
        fill="none"
        stroke={RED}
        strokeWidth={size <= 36 ? 6.5 : 5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="49" r={size <= 36 ? 4.6 : 3.6} fill={INK} />
    </svg>
  );
}

/** The badge and the name, side by side: « fondaco » in lower case, Nunito 900. */
export function Logotype({ size = 26, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Emblem size={size * 1.25} />
      <span
        className="leading-none"
        style={{
          fontSize: size * 0.9,
          fontFamily: "Nunito, system-ui, sans-serif",
          fontWeight: 900,
        }}
      >
        fondaco
      </span>
    </span>
  );
}
