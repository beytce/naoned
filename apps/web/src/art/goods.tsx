import { venice1450 } from "@comptoirs/engine/src/themes/venice1450.js";

/**
 * The goods' code, the same everywhere in the game (map, warehouse, Rialto, workshops): the colour
 * says the chain, the shape says the tier (a round for a raw good, a square for a transformed one,
 * a hexagon for a finished one, a lozenge for the goods from overseas), the pictogram engraved
 * inside from 20 px. The chain and tier are the engine's (`venice1450.resources`).
 */

/** One hue per chain, kept away from the colours of a role (gold, lagoon, vermilion, lapis, water). */
export const CHAIN_COLOUR: Record<string, string> = {
  food: "#E6D3A3",
  construction: "#C08A5A",
  carpentry: "#93B95C",
  glass: "#F09CC4",
  drapery: "#A6A3B5",
  orient: "#B48BE6",
  // The prepared spices, a chain of one good, take the overseas hue.
  spicery: "#B48BE6",
};

type Tier = "raw" | "intermediate" | "finished" | "luxury";

const DEFS = new Map(venice1450.resources.map((r) => [r.code, r]));

/** The shape of each tier, centred on 0 in a 32 × 32 box. */
export const TIER_SHAPE: Record<Tier, string> = {
  raw: "M-12 0A12 12 0 1 0 12 0A12 12 0 1 0 -12 0Z",
  intermediate: "M-11-8.5Q-11-11-8.5-11H8.5Q11-11 11-8.5V8.5Q11 11 8.5 11H-8.5Q-11 11-11 8.5Z",
  finished: "M0-13L11.3-6.5V6.5L0 13L-11.3 6.5V-6.5Z",
  luxury: "M0-14.5L13 0L0 14.5L-13 0Z",
};

/** Each good's pictogram, a line drawing in a 16 × 16 box centred on 0. */
const GLYPH: Record<string, string> = {
  wheat: "M0 8V-8M0-4l-4-3M0-4l4-3M0 0l-4-3M0 0l4-3M0 4l-4-3M0 4l4-3",
  flour: "M-6 8h12l-1-11-3-3h-4l-3 3z M-3-6h6",
  bread: "M-8 4c0-9 16-9 16 0z M-3-1l1 3 M2-1l-1 3",
  clay: "M-8 5c-1-6 3-10 8-9 6 0 9 5 8 9z",
  bricks: "M-8-5h16v10h-16z M-8 0h16 M0-5v5 M-4 0v5 M4 0v5",
  wood: "M-8-3h12a3 3 0 0 1 0 6h-12a3 3 0 0 1 0-6z M4-3a3 3 0 0 0 0 6",
  planks: "M-8-6h16v4h-16z M-8 0h16v4h-16z M-8 6h16",
  sand: "M-8 6q8-14 16 0z",
  glass: "M-5-8h10l-1 6a4 4 0 0 1-8 0z M0 2v5 M-4 7h8",
  mirrors: "M-6-1a6 7 0 1 0 12 0a6 7 0 1 0-12 0 M0 6v2 M-3 8h6",
  wool: "M-7 0a7 7 0 1 0 14 0a7 7 0 1 0-14 0 M-6-3c4 1 8 4 10 8 M-3-7c3 3 5 7 5 13",
  drape: "M-8-6h12v12h-12z M4-6a4 6 0 0 1 0 12",
  garments: "M-4-8l-5 4 2 3 2-1v10h10v-10l2 1 2-3-5-4c-1 2-7 2-8 0z",
  spices: "M-6 8c-2-6 0-10 3-12h6c3 2 5 6 3 12z M0-1v4M-2 1h4",
  silk: "M-8-4c5-4 11 4 16 0 M-8 1c5-4 11 4 16 0 M-8 6c5-4 11 4 16 0",
  salt: "M-7 6l7-12 7 12z M-3 2h6",
  wine: "M-3-8h6M-2-8v3c-5 2-5 10 2 13 7-3 7-11 2-13v-3",
  furs: "M-8 6c2-8 4-12 8-12s6 4 8 12c-3-2-5-2-8 0-3-2-5-2-8 0z",
  cloth: "M-8-6h16 M-7-6c0 6 2 10 7 13 5-3 7-7 7-13",
  prepared_spices: "M-5-8h10M-6-6h12v13h-12z M-3 0h6",
};

/** The hue of a good: its chain's. */
export function goodsColour(code: string): string {
  const def = DEFS.get(code);
  return (def && CHAIN_COLOUR[def.chain]) ?? "#9FB4CF";
}

/** The chain of a good (`food`, `construction`…); the prepared spices count with the overseas goods. */
export function goodsChain(code: string): string {
  const chain = DEFS.get(code)?.chain ?? "other";
  return chain === "spicery" ? "orient" : chain;
}

/** The chains in the order the game shows them: the three of the Terraferma, then the luxury. */
export const CHAIN_ORDER = ["food", "construction", "carpentry", "glass", "drapery", "orient"];

/** The goods of a chain, in the theme's order (raw first, then what is made of it). */
export function chainGoods(chain: string): string[] {
  return venice1450.resources.filter((r) => goodsChain(r.code) === chain).map((r) => r.code);
}

export function goodsTier(code: string): Tier {
  return DEFS.get(code)?.tier ?? "raw";
}

/** The codes with a pictogram (every good of the theme must have one: `test/goods.test.ts`). */
export const GLYPH_CODES = Object.keys(GLYPH);

/**
 * A good's mark. `covered` false draws it hollow (an order the stock does not cover yet). The
 * pictogram shows from 20 px; below, the shape and its colour say it alone.
 */
export function GoodsMark({
  code,
  size = 24,
  covered = true,
  className = "",
  title,
}: {
  code: string;
  size?: number;
  covered?: boolean;
  className?: string;
  /** Read by a screen reader; without it, the mark is decoration. */
  title?: string;
}) {
  const colour = goodsColour(code);
  const shape = TIER_SHAPE[goodsTier(code)];
  const glyph = size >= 20 && covered ? GLYPH[code] : undefined;
  return (
    <svg
      viewBox="-16 -16 32 32"
      width={size}
      height={size}
      className={`goods-mark shrink-0 ${className}`}
      data-goods={code}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {covered ? (
        <path d={shape} fill={colour} stroke="rgb(0 0 0 / 0.35)" strokeWidth="1" />
      ) : (
        <path d={shape} fill="none" stroke={colour} strokeWidth="3" />
      )}
      {glyph && (
        <path
          d={glyph}
          transform="scale(0.78)"
          fill="none"
          stroke="#0B1A2E"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
