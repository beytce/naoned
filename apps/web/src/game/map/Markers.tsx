import type { ReactNode } from "react";
import { CityIcon } from "../../art/cities.js";
import { Crest, type CrestData } from "../../art/crest.js";
import { ResourceIcon } from "../../art/resources.js";
import { VehicleGlyph } from "../../art/veneto.js";
import { WorkGlyph } from "../../art/workIcon.js";
import { fr } from "../../i18n.js";

/**
 * What stands on the map: the cities as plaques of the portolan, each with its monument drawn
 * and a touch of its own hue, the merchant's counter in gold with their coat of arms, and the
 * carts as small tokens. Each one is a button centred on its place; the map moves them.
 */

/** Each city's stone, from its light side to its shadow. */
const HUES: Record<string, [string, string, string]> = {
  venezia: ["#A9CFF2", "#3F72B0", "#122640"],
  padova: ["#9ED9C4", "#3F8C80", "#123536"],
  verona: ["#F4C2B8", "#B86E6A", "#3B1C1E"],
  vicenza: ["#F3DA9A", "#B88C3A", "#3A2A0E"],
  treviso: ["#C9E2A6", "#6E9A4E", "#1F2E14"],
  mantova: ["#B9CDEB", "#5A78A8", "#18233A"],
  ferrara: ["#EFA08A", "#A8483A", "#38130E"],
};
const DEFAULT_HUE: [string, string, string] = ["#D6E8FA", "#6E8EB4", "#1A2A42"];

export function orbStyle(code: string): { background: string } {
  const [light, mid, dark] = HUES[code] ?? DEFAULT_HUE;
  return {
    background: `radial-gradient(circle at 34% 30%, ${light} 0%, ${mid} 48%, ${dark} 100%)`,
  };
}

/** A city's plaque on the chart: dark parchment warmed by the city's hue, an ink edge. */
function plaqueStyle(code: string): { background: string } {
  const [, mid] = HUES[code] ?? DEFAULT_HUE;
  return { background: `linear-gradient(160deg, ${mid}66 0%, #1D3150 62%, #16263E 100%)` };
}

function Pill({ children, tone }: { children: ReactNode; tone: "gold" | "lagoon" | "vermilion" }) {
  const cls =
    tone === "gold"
      ? "bg-gold text-ink"
      : tone === "lagoon"
        ? "bg-lagoon text-on-lagoon"
        : "bg-vermilion text-cream";
  return (
    <span
      className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 font-display text-xs font-bold leading-none shadow-md shadow-black/40 ${cls}`}
    >
      {children}
    </span>
  );
}

export function CityMarker({
  code,
  name,
  orders,
  deliverable,
  criee,
  supplier,
  dim,
  lit,
  onTap,
}: {
  code: string;
  name: string;
  /** Orders of the city open today. */
  orders: number;
  /** Among them, those the stock covers now. */
  deliverable: number;
  /** A Criée under way there. */
  criee: boolean;
  /** The merchant's crest, where it is an official supplier this week. */
  supplier?: CrestData | null;
  dim: boolean;
  lit: boolean;
  onTap: () => void;
}) {
  return (
    <button
      type="button"
      data-coach={`city-${code}`}
      aria-label={fr.game.map.cityLabel(name, orders, deliverable, criee)}
      onClick={onTap}
      className={`marker-hit group relative -ml-9 -mt-9 flex h-[72px] w-[72px] items-center justify-center transition-opacity duration-300 ${dim ? "opacity-40" : ""}`}
    >
      <span className="marker-ring absolute inset-1 rounded-xl ring-1 ring-cream/10" />
      {(lit || deliverable > 0) && !dim && (
        <span className="marker-halo absolute inset-1 rounded-full" />
      )}
      <span
        data-map-label
        className={`marker-orb relative flex items-center justify-center rounded-lg shadow-[0_6px_16px_rgb(0_0_0/0.5)] ring-1 ring-[#BFE3FF]/55 ${code === "venezia" ? "h-14 w-14" : "h-12 w-12"}`}
        style={plaqueStyle(code)}
      >
        <CityIcon
          code={code}
          className={`drop-shadow-[0_1px_1px_rgb(0_0_0/0.5)] ${code === "venezia" ? "h-11 w-11" : "h-9 w-9"}`}
        />
      </span>
      {(orders > 0 || criee) && (
        <span data-map-label className="absolute -right-0.5 top-0.5 flex gap-0.5">
          {criee && <Pill tone="vermilion">!</Pill>}
          {orders > 0 && <Pill tone={deliverable > 0 ? "gold" : "lagoon"}>{orders}</Pill>}
        </span>
      )}
      {supplier && (
        <span className="pointer-events-none absolute -left-0.5 top-0.5 drop-shadow-[0_1px_2px_rgb(0_0_0/0.8)]">
          <Crest crest={supplier} size={22} />
        </span>
      )}
    </button>
  );
}

/**
 * A city's name under its tile, a marker of its own drawn over the carts (a cart on its road never
 * hides it), while the tile stays under them so a parked cart can be touched.
 */
export function CityName({ code, name, dim }: { code: string; name: string; dim: boolean }) {
  return (
    <span
      data-map-label
      data-coach-with={`city-${code}`}
      className={`pointer-events-none absolute left-0 top-[32px] -translate-x-1/2 whitespace-nowrap bg-[#16263E]/80 px-1.5 font-place text-xs font-bold uppercase tracking-wide text-cream/95 transition-opacity duration-300 [text-shadow:0_1px_3px_rgb(0_0_0/0.9)] ${dim ? "opacity-40" : ""}`}
    >
      {name}
    </span>
  );
}

export function HomeMarker({
  name,
  crest,
  ready,
  progress,
  onTap,
}: {
  name: string;
  crest: CrestData;
  /** Batches waiting to be collected. */
  ready: number;
  /** Share of the next batch done, 0 to 1 (null: nothing running). */
  progress: number | null;
  onTap: () => void;
}) {
  const r = 38;
  const c = 2 * Math.PI * r;
  return (
    <button
      type="button"
      data-coach="home"
      aria-label={name}
      onClick={onTap}
      className="marker-hit relative -ml-[46px] -mt-[46px] flex h-[92px] w-[92px] items-center justify-center"
    >
      <span className="absolute inset-0 rounded-full ring-1 ring-gold/20" />
      <span className="absolute -inset-5 rounded-full ring-1 ring-gold/[0.08]" />
      {ready > 0 && <span className="marker-halo marker-halo-gold absolute inset-1 rounded-full" />}
      {progress !== null && (
        <svg viewBox="0 0 92 92" className="absolute inset-0 -rotate-90" aria-hidden="true">
          <circle
            cx="46"
            cy="46"
            r={r}
            fill="none"
            stroke="rgb(var(--lagoon))"
            strokeOpacity="0.85"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${(c * Math.min(1, Math.max(0.02, progress))).toFixed(1)} ${c.toFixed(1)}`}
          />
        </svg>
      )}
      <span
        className="marker-orb relative flex h-[60px] w-[60px] items-center justify-center rounded-full shadow-[0_0_28px_rgb(var(--gold)/0.45),inset_-5px_-7px_12px_rgb(0_0_0/0.35)]"
        style={{
          background:
            "radial-gradient(circle at 34% 30%, rgb(var(--gold-soft)) 0%, rgb(var(--gold)) 45%, rgb(var(--gold-deep)) 80%, #5A3D12 100%)",
        }}
      >
        <Crest crest={crest} size={34} />
      </span>
      {ready > 0 && (
        <span className="absolute right-0 top-1">
          <Pill tone="gold">{ready}</Pill>
        </span>
      )}
      <span
        data-coach-with="home"
        className="pointer-events-none absolute left-1/2 top-[calc(100%-4px)] -translate-x-1/2 whitespace-nowrap font-display text-xs font-extrabold uppercase tracking-wider text-gold [text-shadow:0_1px_3px_rgb(0_0_0/0.9)]"
      >
        {name}
      </span>
    </button>
  );
}

export function CartMarker({
  id,
  type,
  label,
  load,
  state,
  onTap,
}: {
  id: string;
  type: string;
  label: string;
  /** Colour of the goods aboard, none when empty. */
  load: string | null;
  state: "parked" | "road";
  onTap: () => void;
}) {
  const ring = state === "road" ? "ring-lagoon/80" : "ring-cream/30";
  return (
    <button
      type="button"
      data-coach={`cart-${id}`}
      aria-label={label}
      onClick={onTap}
      className="marker-hit cart-token relative -ml-[22px] -mt-[22px] flex h-11 w-11 items-center justify-center"
    >
      <span
        className={`cart-face flex h-8 w-9 items-center justify-center rounded-[10px] bg-night-2/95 ring-[1.5px] ${ring}`}
      >
        <svg viewBox="-19 -15 38 26" className="cart-glyph h-6 w-8" aria-hidden="true">
          <VehicleGlyph type={type} load={load} />
        </svg>
      </span>
    </button>
  );
}

/**
 * A land of the campaign: a disc in its holder's colour with its garrison (⚑ for a family's seat),
 * a dotted gold ring when the merchant's lances can reach it, a beating red one when an enemy
 * marches on it, a gold edge when the merchant's own lances hold it, its work in the corner.
 */
export function LandMarker({
  code,
  name,
  color,
  label,
  seat,
  city,
  reach,
  threatened,
  mine,
  work,
  dim,
  named,
  onTap,
}: {
  code: string;
  name: string;
  /** Its name written under it (the seats, cities and fortresses; the others once chosen). */
  named: boolean;
  color: string;
  /** The garrison, or ⚑ for a seat. */
  label: string;
  seat: boolean;
  city: boolean;
  reach: boolean;
  threatened: boolean;
  mine: boolean;
  work: { kind: string; color: string; ready: boolean } | null;
  dim: boolean;
  onTap: () => void;
}) {
  const size = seat ? 40 : city ? 36 : 30;
  return (
    <button
      type="button"
      data-coach={`land-${code}`}
      aria-label={name}
      onClick={onTap}
      className={`marker-hit relative -ml-6 -mt-6 flex h-12 w-12 items-center justify-center transition-opacity duration-300 ${dim ? "opacity-45" : ""}`}
    >
      <span className="marker-ring absolute inset-0 rounded-full" />
      {threatened && (
        <span className="absolute inset-0.5 animate-ping rounded-full ring-2 ring-vermilion" />
      )}
      {reach && !threatened && (
        <span className="absolute inset-0.5 rounded-full border-2 border-dashed border-gold/80" />
      )}
      <span
        className={`marker-orb relative flex items-center justify-center rounded-full font-display text-[0.8125rem] font-extrabold text-cream shadow-[0_4px_12px_rgb(0_0_0/0.55),inset_-3px_-4px_8px_rgb(0_0_0/0.3)] [text-shadow:0_1px_2px_rgb(0_0_0/0.8)] ${mine ? "ring-2 ring-gold" : "ring-1 ring-black/50"}`}
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle at 34% 30%, color-mix(in srgb, ${color} 55%, white) 0%, ${color} 55%, color-mix(in srgb, ${color} 55%, black) 100%)`,
        }}
      >
        {label}
      </span>
      {work && (
        <span className="absolute -right-1 -top-1 rounded-full bg-night/85 p-0.5">
          <WorkGlyph kind={work.kind} color={work.color} ready={work.ready} size={14} />
        </span>
      )}
      <span
        className={`land-name pointer-events-none absolute left-1/2 top-[calc(100%-6px)] -translate-x-1/2 whitespace-nowrap font-display text-xs font-extrabold uppercase tracking-wider [text-shadow:0_1px_3px_rgb(0_0_0/0.95)] ${named ? "" : "hidden"} ${city ? "text-gold-soft" : seat ? "text-cream" : "text-cream/80"}`}
      >
        {name}
      </span>
    </button>
  );
}
