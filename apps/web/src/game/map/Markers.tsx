import type { ReactNode } from "react";
import { CityIcon } from "../../art/cities.js";
import { Crest, type CrestData } from "../../art/crest.js";
import { GoodsMark } from "../../art/goods.js";
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

/** A city's round on the night: deep blue warmed by the city's hue, lit from above left. */
function plaqueStyle(code: string): { background: string } {
  const [, mid] = HUES[code] ?? DEFAULT_HUE;
  return {
    background: `radial-gradient(circle at 34% 28%, ${mid}88 0%, #1D3150 58%, #12203A 100%)`,
  };
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

/** The most orders drawn in a city's orbit; the others are counted beside it. */
/** What waits at a place, as the map shows it (places.ts): a halo by meaning, or a small dot. */
export interface PlaceCall {
  mode: "halo" | "dot";
  tone: "ready" | "city" | "rumour";
}

const CALL_HALO = { ready: "", city: "marker-halo-city", rumour: "marker-halo-rumour" } as const;
const CALL_DOT = { ready: "bg-lagoon", city: "bg-info", rumour: "bg-rumour" } as const;

/** The halo of a place that calls (two on the map at most), or its dot. */
function Call({ call, inset }: { call: PlaceCall; inset: string }) {
  if (call.mode === "dot")
    return (
      <span
        className={`pointer-events-none absolute right-1 top-1 h-2 w-2 rounded-full ring-2 ring-night ${CALL_DOT[call.tone]}`}
      />
    );
  return <span className={`marker-halo ${CALL_HALO[call.tone]} absolute ${inset} rounded-full`} />;
}

const ORBIT_MAX = 6;

/**
 * A city as a star of the night: its monument in a round of its hue, its orders in orbit around
 * it, each the mark of its good (`GoodsMark`), full when the stock covers it, hollow when it
 * does not yet. The orbit says what the city wants at a glance, without a figure.
 */
export function CityMarker({
  code,
  name,
  orders,
  criee,
  supplier,
  podesta,
  dim,
  lit,
  call,
  onTap,
}: {
  code: string;
  name: string;
  /** Orders of the city open today: their good and whether the stock covers them. */
  orders: { resource: string; covered: boolean }[];
  /** A Criée under way there. */
  criee: boolean;
  /** The merchant's crest, where it is an official supplier this week. */
  supplier?: CrestData | null;
  /** The city's Podestà (R2): its crest, ringed in lapis when it is the merchant. */
  podesta?: { crest: CrestData; mine: boolean } | null;
  dim: boolean;
  lit: boolean;
  /** What waits there (null: nothing). */
  call?: PlaceCall | null;
  onTap: () => void;
}) {
  const big = code === "venezia";
  const orbit = big ? 36 : 33;
  const shown = orders.slice(0, ORBIT_MAX);
  const more = orders.length - shown.length;
  const covered = orders.filter((o) => o.covered).length;
  return (
    <button
      type="button"
      data-coach={`city-${code}`}
      aria-label={fr.game.map.cityLabel(name, orders.length, covered, criee)}
      onClick={onTap}
      className={`marker-hit group relative -ml-9 -mt-9 flex h-[72px] w-[72px] items-center justify-center transition-opacity duration-300 ${dim ? "opacity-40" : ""}`}
    >
      <span
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-info/25"
        style={{ width: orbit * 2, height: orbit * 2 }}
      />
      <span className="marker-ring absolute inset-1.5 rounded-full ring-1 ring-cream/10" />
      {/* A cart chosen lights the cities it can serve; otherwise the place's call. */}
      {lit && !dim ? (
        <span className="marker-halo absolute -inset-1 rounded-full" />
      ) : (
        call && !dim && <Call call={call} inset="-inset-1" />
      )}
      <span
        data-map-label
        className={`marker-orb relative flex items-center justify-center rounded-full shadow-[0_6px_16px_rgb(0_0_0/0.5)] ring-[1.5px] ${lit ? "ring-lagoon" : "ring-[#BFE3FF]/45"} ${big ? "h-14 w-14" : "h-12 w-12"}`}
        style={plaqueStyle(code)}
      >
        <CityIcon
          code={code}
          className={`drop-shadow-[0_1px_1px_rgb(0_0_0/0.5)] ${big ? "h-10 w-10" : "h-8 w-8"}`}
        />
      </span>
      {shown.map((o, i) => {
        // From the top, clockwise, 40° apart: the first orders face the reader.
        const a = ((-90 + i * 40) * Math.PI) / 180;
        return (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: the orbit's places are fixed.
            key={i}
            className="pointer-events-none absolute left-1/2 top-1/2 drop-shadow-[0_1px_2px_rgb(0_0_0/0.7)]"
            style={{
              transform: `translate(${(orbit * Math.cos(a) - 8).toFixed(1)}px, ${(orbit * Math.sin(a) - 8).toFixed(1)}px)`,
            }}
          >
            <GoodsMark code={o.resource} size={16} covered={o.covered} />
          </span>
        );
      })}
      {(more > 0 || criee) && (
        <span data-map-label className="absolute -right-1 top-0.5 flex gap-0.5">
          {criee && <Pill tone="vermilion">!</Pill>}
          {more > 0 && <Pill tone="lagoon">+{more}</Pill>}
        </span>
      )}
      {podesta && (
        <span
          className={`pointer-events-none absolute -right-0.5 bottom-0.5 rounded-full drop-shadow-[0_1px_2px_rgb(0_0_0/0.8)] ${podesta.mine ? "ring-2 ring-info" : "ring-1 ring-cream/40"}`}
        >
          <Crest crest={podesta.crest} size={20} />
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

/** A workshop's ring around the counter: its batch's progress, or ready (full lagoon). */
export interface WorkshopRing {
  /** Share of the batch under way, 0 to 1; null when the workshop is idle. */
  share: number | null;
  ready: boolean;
}

/** The most rings drawn around the counter; past them, the outer one stands for the rest. */
const RINGS_MAX = 5;

/**
 * The merchant's counter as the sun of their map: a gold disc with their coat of arms, and one
 * ring per workshop around it, its arc the batch under way, full and lagoon when it is ready, a
 * faint track when it is idle. What runs is read without opening the workshops.
 */
export function HomeMarker({
  name,
  crest,
  ready,
  rings,
  call,
  onTap,
}: {
  name: string;
  crest: CrestData;
  /** Batches waiting to be collected. */
  ready: number;
  rings: WorkshopRing[];
  /** Its halo while batches wait (null: nothing). */
  call?: PlaceCall | null;
  onTap: () => void;
}) {
  const shown = rings.slice(0, RINGS_MAX);
  return (
    <button
      type="button"
      data-coach="home"
      aria-label={name}
      onClick={onTap}
      className="marker-hit relative -ml-[46px] -mt-[46px] flex h-[92px] w-[92px] items-center justify-center"
    >
      {call && <Call call={call} inset="-inset-2" />}
      <svg
        viewBox="-60 -60 120 120"
        className="pointer-events-none absolute -inset-[14px] h-[120px] w-[120px] -rotate-90 overflow-visible"
        aria-hidden="true"
      >
        {shown.map((w, i) => {
          const r = 35 + i * 5;
          const c = 2 * Math.PI * r;
          const arc = w.ready ? 1 : (w.share ?? 0);
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: a ring's place is its workshop's rank.
            <g key={i}>
              <circle
                r={r}
                fill="none"
                stroke="rgb(var(--info))"
                strokeOpacity="0.28"
                strokeWidth="3"
              />
              {(w.ready || w.share !== null) && (
                <circle
                  r={r}
                  fill="none"
                  stroke={w.ready ? "rgb(var(--lagoon))" : "rgb(var(--info))"}
                  strokeOpacity={w.ready ? 0.95 : 0.85}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${(c * Math.min(1, Math.max(0.02, arc))).toFixed(1)} ${c.toFixed(1)}`}
                />
              )}
            </g>
          );
        })}
      </svg>
      <span
        data-goods-from="place"
        className="marker-orb relative flex h-[60px] w-[60px] items-center justify-center rounded-full shadow-[0_0_28px_rgb(var(--gold)/0.45),inset_-5px_-7px_12px_rgb(0_0_0/0.35)]"
        style={{
          background:
            "radial-gradient(circle at 34% 30%, rgb(var(--gold-soft)) 0%, rgb(var(--gold)) 45%, rgb(var(--gold-deep)) 80%, #5A3D12 100%)",
        }}
      >
        <Crest crest={crest} size={34} />
      </span>
      {ready > 0 && (
        <span className="absolute -right-1 -top-1">
          <Pill tone="lagoon">{ready}</Pill>
        </span>
      )}
      <span
        data-coach-with="home"
        // Cream like every place's name: the sun is gold by its fill, not its writing.
        className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] -translate-x-1/2 whitespace-nowrap bg-[#16263E]/80 px-1.5 font-place text-xs font-bold uppercase tracking-wide text-cream/95 [text-shadow:0_1px_3px_rgb(0_0_0/0.9)]"
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
