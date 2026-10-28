import { P } from "./palette.js";

export interface CrestData {
  shape: string;
  color: string;
  symbol: string;
}

export const CREST_SHAPES = ["heater", "round", "banner"] as const;
export const CREST_COLORS = ["gold", "lagoon", "vermilion", "ink", "emerald", "violet"] as const;
export const CREST_SYMBOLS = [
  "lion",
  "ship",
  "key",
  "tower",
  "star",
  "wheat",
  "anchor",
  "crown",
] as const;

const FIELD: Record<string, [string, string]> = {
  gold: [P.gold, P.goldDeep],
  lagoon: [P.lagoon, P.lagoonDeep],
  vermilion: [P.vermilion, P.vermilionDeep],
  ink: [P.night3, P.line],
  emerald: [P.emerald, "#26704A"],
  violet: [P.violet, "#5E44A0"],
};

/** A crest colour's field and edge (the portraits wear them, R4). */
export function crestColours(color: string): [string, string] {
  return FIELD[color] ?? FIELD.gold ?? [P.gold, P.goldDeep];
}

/** A stable default crest from any id, so every player has one. */
export function defaultCrest(id: string): CrestData {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return {
    shape: CREST_SHAPES[h % CREST_SHAPES.length] ?? "heater",
    color: CREST_COLORS[(h >> 3) % CREST_COLORS.length] ?? "gold",
    symbol: CREST_SYMBOLS[(h >> 7) % CREST_SYMBOLS.length] ?? "lion",
  };
}

const SHAPES: Record<string, string> = {
  heater: "M10 8 H90 V48 Q90 82 50 96 Q10 82 10 48 Z",
  round: "M50 6 A44 44 0 1 1 49.9 6 Z",
  banner: "M14 6 H86 V92 L50 76 L14 92 Z",
};

const SYMBOLS: Record<string, JSX.Element> = {
  lion: (
    <g>
      <path d="M50.0 18.0 L54.3 26.4 L61.5 20.3 L62.2 29.7 L71.2 26.8 L68.3 35.8 L77.7 36.5 L71.6 43.7 L80.0 48.0 L71.6 52.3 L77.7 59.5 L68.3 60.2 L71.2 69.2 L62.2 66.3 L61.5 75.7 L54.3 69.6 L50.0 78.0 L45.7 69.6 L38.5 75.7 L37.8 66.3 L28.8 69.2 L31.7 60.2 L22.3 59.5 L28.4 52.3 L20.0 48.0 L28.4 43.7 L22.3 36.5 L31.7 35.8 L28.8 26.8 L37.8 29.7 L38.5 20.3 L45.7 26.4 Z" />
      <g fill="var(--crest-field)" stroke="none">
        <circle cx="50" cy="48" r="16" />
      </g>
      <circle cx="44" cy="45" r="2.6" />
      <circle cx="56" cy="45" r="2.6" />
      <path d="M45 52 Q50 57 55 52 L50 60 Z" />
      <path d="M38 34 L42 40 M62 34 L58 40" strokeWidth="3" />
    </g>
  ),
  ship: (
    <g>
      <path d="M24 62 H76 L68 76 H32 Z" />
      <path d="M50 24 V60 M50 26 L72 56 H50 Z M48 32 L32 56 H48 Z" />
    </g>
  ),
  key: (
    <g>
      <circle cx="50" cy="30" r="12" />
      <rect x="46" y="40" width="8" height="38" />
      <rect x="54" y="62" width="10" height="6" />
      <rect x="54" y="72" width="8" height="6" />
    </g>
  ),
  tower: (
    <g>
      <rect x="36" y="34" width="28" height="44" />
      <path d="M32 34 V24 H40 V30 H46 V24 H54 V30 H60 V24 H68 V34 Z" />
    </g>
  ),
  star: <path d="M50 18 L58 42 H82 L62 56 L70 80 L50 66 L30 80 L38 56 L18 42 H42 Z" />,
  wheat: (
    <g>
      <rect x="48" y="30" width="4" height="50" />
      {[30, 40, 50, 60].map((y) => (
        <g key={y}>
          <ellipse cx="42" cy={y} rx="5" ry="8" transform={`rotate(-30 42 ${y})`} />
          <ellipse cx="58" cy={y} rx="5" ry="8" transform={`rotate(30 58 ${y})`} />
        </g>
      ))}
      <ellipse cx="50" cy="22" rx="5" ry="8" />
    </g>
  ),
  anchor: (
    <g>
      <circle cx="50" cy="26" r="7" />
      <rect x="47" y="32" width="6" height="44" />
      <rect x="36" y="40" width="28" height="5" />
      <path d="M26 58 Q30 80 50 80 Q70 80 74 58 L66 62 Q62 72 50 72 Q38 72 34 62 Z" />
    </g>
  ),
  crown: <path d="M24 70 L20 34 L36 48 L50 26 L64 48 L80 34 L76 70 Z M24 74 H76 V82 H24 Z" />,
};

export function Crest({ crest, size = 64 }: { crest: CrestData; size?: number }) {
  const [fill, edge] = FIELD[crest.color] ?? FIELD.gold ?? [P.gold, P.goldDeep];
  const ink = crest.color === "gold" ? P.night : P.cream;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <path d={SHAPES[crest.shape] ?? SHAPES.heater} fill={fill} stroke={edge} strokeWidth="5" />
      <path
        d={SHAPES[crest.shape] ?? SHAPES.heater}
        fill="none"
        stroke={P.cream}
        strokeOpacity="0.25"
        strokeWidth="1.5"
        transform="translate(5 5) scale(0.9)"
      />
      <g
        fill={ink}
        stroke={ink}
        strokeWidth="0"
        opacity="0.95"
        style={{ ["--crest-field" as string]: fill }}
      >
        {SYMBOLS[crest.symbol] ?? SYMBOLS.star}
      </g>
    </svg>
  );
}

/**
 * The crest where it is small (a holder's mark on the Terraferma, 14 to 18 px): a disc of its field
 * with its charge in silhouette, read where the shield's outline and filet would blur.
 */
export function MiniCrest({ crest, size = 16 }: { crest: CrestData; size?: number }) {
  const [fill, edge] = FIELD[crest.color] ?? FIELD.gold ?? [P.gold, P.goldDeep];
  const ink = crest.color === "gold" ? P.night : P.cream;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <circle cx="50" cy="50" r="46" fill={fill} stroke={edge} strokeWidth="8" />
      <g
        fill={ink}
        stroke={ink}
        strokeWidth="0"
        transform="translate(50 50) scale(1.1) translate(-50 -50)"
        style={{ ["--crest-field" as string]: fill }}
      >
        {SYMBOLS[crest.symbol] ?? SYMBOLS.star}
      </g>
    </svg>
  );
}
