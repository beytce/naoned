import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CityIcon } from "../../art/cities.js";
import { Crest, defaultCrest } from "../../art/crest.js";
import { P } from "../../art/palette.js";
import { haptic } from "../../haptics.js";
import { fr } from "../../i18n.js";
import { Segmented, Sheet, Slab, clock } from "../../ui.js";
import type { GameProps } from "../Game.js";
import { gameApi } from "../api.js";
import { d } from "../format.js";
import {
  type HexMap,
  cellAt,
  cellsByHolder,
  hexCenter,
  hexCorners,
  neighbours,
  outline,
  tones,
} from "../terraShapes.js";
import type { TerraAction, TerraView } from "../types.js";
import { orbStyle } from "./Markers.js";
import { ActionButton, ContextPanel } from "./Panel.js";
import type { MapMarker, Selection } from "./WorldMap.js";
import { Icon } from "./icons.js";

/**
 * The Terraferma as a layer of the world map (docs/plan-terraferme.md, "Direction artistique"):
 * the same Veneto by night, each merchant's ground one translucent outline with rounded borders,
 * the map focused on the merchant (their land dense and ringed in gold, their neighbours in
 * their tones, the others faint cream lines, Milan hatched), the fronts dotted arrows marching
 * to their aim. A touch on the land opens its panel at the foot: where to set down, a front to
 * launch, a neighbour to ally with, one's own land to build on.
 */

const t = () => fr.game.terra;

/** The week's map: fetched when the layer opens, then while it is shown, and after each act. */
export function useTerra(shown: boolean): {
  terra: TerraView | null | undefined;
  refresh: () => void;
} {
  const [terra, setTerra] = useState<TerraView | null | undefined>(undefined);
  const refresh = useCallback(() => {
    gameApi
      .terra()
      .then((r) => setTerra(r.terra))
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    refresh();
    // Shown: the fronts move every few minutes; hidden: only to know the door is there.
    const id = setInterval(refresh, shown ? 20_000 : 300_000);
    return () => clearInterval(id);
  }, [shown, refresh]);
  return { terra, refresh };
}

/** Whether the Terraferma calls: no war counter yet, a front marching on the merchant, an ally asking. */
export function terraCalls(v: TerraView): boolean {
  if (v.closed) return false;
  if (!v.me) return true;
  return v.fronts.some((f) => f.threat) || v.me.requestsIn.length > 0;
}

export interface TerraShapes {
  map: HexMap;
  land: boolean[];
  /** Each holder's outline, tone and place in the focus. */
  holders: {
    i: number;
    d: string;
    tone: string;
    focus: "me" | "neighbour" | "ally" | "milan" | "other" | "faint";
  }[];
  tone: string[];
  me: number;
  /** Every land cell's edge, drawn only while aiming. */
  grid: string;
  /** The land's corners, for the camera. */
  edges: { x: number; y: number }[];
}

/** The drawing of the week's map: one outline a holder, recomputed only when a cell changes hands. */
export function useTerraShapes(v: TerraView | null | undefined): TerraShapes | null {
  const owners = v ? v.owner.join(",") : "";
  const ids = v ? v.holders.map((h) => `${h.id}:${h.ally ? 1 : 0}`).join(",") : "";
  // biome-ignore lint/correctness/useExhaustiveDependencies: `owners` and `ids` are the map's identity.
  return useMemo(() => {
    if (!v) return null;
    const map: HexMap = v.map;
    const land = [...v.map.terrain].map((c) => c !== "w");
    const by = cellsByHolder(v.owner);
    const touching = neighbours(map, v.owner);
    const names = v.holders.map((h, i) => h.id ?? (h.milan ? "milan" : String(i)));
    const tone = tones(
      names,
      v.holders.map((_, i) => by.get(i)?.length ?? 0),
      touching,
    );
    const me = v.holders.findIndex((h) => h.me);
    const around = touching.get(me) ?? new Set<number>();
    const holders = [...by.entries()].map(([i, cells]) => {
      const h = v.holders[i];
      const focus: TerraShapes["holders"][number]["focus"] = h?.milan
        ? "milan"
        : i === me
          ? "me"
          : h?.ally
            ? "ally"
            : around.has(i)
              ? "neighbour"
              : cells.length <= 3
                ? "faint"
                : "other";
      return { i, d: outline(map, cells), tone: tone[i] ?? P.cream, focus };
    });
    // Milan under everyone, the merchant above.
    const order = { milan: 0, faint: 1, other: 2, neighbour: 3, ally: 4, me: 5 };
    holders.sort((a, b) => order[a.focus] - order[b.focus]);
    let grid = "";
    let x0 = Number.POSITIVE_INFINITY;
    let x1 = Number.NEGATIVE_INFINITY;
    let y0 = Number.POSITIVE_INFINITY;
    let y1 = Number.NEGATIVE_INFINITY;
    land.forEach((l, i) => {
      if (!l) return;
      const c = hexCorners(map, i, 0.96);
      grid += `M${c.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}Z`;
      const [x, y] = hexCenter(map, i);
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    });
    const edges = [
      { x: x0, y: y0 },
      { x: x1, y: y0 },
      { x: x0, y: y1 },
      { x: x1, y: y1 },
    ];
    return { map, land, holders, tone, me, grid, edges };
  }, [owners, ids]);
}

/** The holder of a cell (-1: neutral land). */
const holderAt = (v: TerraView, cell: number) => v.owner[cell] ?? -1;

function holderName(v: TerraView, i: number): string {
  if (i < 0) return t().neutral;
  const h = v.holders[i];
  if (!h) return t().neutral;
  if (h.milan) return t().milan;
  return h.pseudo ?? t().someone;
}

/** Where a front starts from: its owner's cell nearest its aim. */
function frontFrom(v: TerraView, map: HexMap, owner: number, aim: number): [number, number] | null {
  const [ax, ay] = hexCenter(map, aim);
  let best: [number, number] | null = null;
  let bestD = Number.POSITIVE_INFINITY;
  v.owner.forEach((o, i) => {
    if (o !== owner) return;
    const [x, y] = hexCenter(map, i);
    const dd = (x - ax) ** 2 + (y - ay) ** 2;
    if (dd < bestD) {
      bestD = dd;
      best = [x, y];
    }
  });
  return best;
}

/**
 * A tap on the map: the land cell under the finger, or, when it is not one a front can take,
 * the nearest that is within reach of the finger (cells are small before zooming in).
 */
export function terraTap(v: TerraView, s: TerraShapes, x: number, y: number): number | null {
  const under = cellAt(s.map, s.land, x, y);
  if (under !== null && (under in v.costs || holderAt(v, under) === s.me)) return under;
  const reach = s.map.size * 1.8;
  let best: number | null = null;
  let bestD = reach;
  for (const k of Object.keys(v.costs)) {
    const [cx, cy] = hexCenter(s.map, Number(k));
    const dd = Math.hypot(cx - x, cy - y);
    if (dd < bestD) {
      bestD = dd;
      best = Number(k);
    }
  }
  return best ?? under;
}

/** Under the markers: the territories, the night's veil, the grid while aiming, the fronts. */
export function TerraOverlay({
  v,
  s,
  cell,
}: {
  v: TerraView;
  s: TerraShapes;
  /** The cell selected (a front aimed there shows the grid). */
  cell: number | null;
}) {
  const fresh = useFresh(v);
  const aiming = cell !== null && cell in v.costs;
  return (
    <g>
      <defs>
        <pattern
          id="terra-hatch"
          width="4"
          height="4"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="4" height="4" fill="#4A1E16" fillOpacity="0.45" />
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="4"
            stroke={P.vermilionDeep}
            strokeOpacity="0.5"
            strokeWidth="1.3"
          />
        </pattern>
      </defs>
      {s.holders.map((h) => (
        <path
          key={h.i}
          d={h.d}
          fillRule="evenodd"
          strokeLinejoin="round"
          {...look(h, h.i === selectedHolder(v, cell))}
        />
      ))}
      {/* Cells just taken tint in, over 400 ms. */}
      {fresh.map((f) => (
        <path
          key={`fresh-${f.cell}-${f.at}`}
          d={`M${hexCorners(s.map, f.cell, 1.02)
            .map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`)
            .join("L")}Z`}
          fill={s.tone[f.holder] ?? P.cream}
          className="terra-take"
        />
      ))}
      {aiming && (
        <path
          d={s.grid}
          fill="none"
          stroke={P.cream}
          strokeOpacity="0.14"
          strokeWidth="0.35"
          className="animate-fade"
        />
      )}
      {cell !== null && (
        <path
          d={`M${hexCorners(s.map, cell)
            .map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`)
            .join("L")}Z`}
          fill={P.gold}
          fillOpacity="0.18"
          stroke={P.gold}
          strokeWidth="0.9"
          strokeLinejoin="round"
        />
      )}
      {v.fronts.map((f) => {
        const from = frontFrom(v, s.map, f.owner, f.aim);
        if (!from) return null;
        const [x, y] = hexCenter(s.map, f.aim);
        const color = f.mine ? P.gold : f.threat ? P.vermilion : P.cream;
        return (
          <line
            key={f.id}
            x1={from[0]}
            y1={from[1]}
            x2={x}
            y2={y}
            stroke={color}
            strokeOpacity={f.mine || f.threat ? 0.9 : 0.35}
            strokeWidth={f.mine || f.threat ? 1.6 : 0.9}
            strokeDasharray="1.5 3.5"
            strokeLinecap="round"
            className={v.open ? "route-march" : undefined}
          />
        );
      })}
      {!v.open && (
        <rect
          x={Math.min(...s.edges.map((e) => e.x)) - 40}
          y={Math.min(...s.edges.map((e) => e.y)) - 40}
          width={Math.max(...s.edges.map((e) => e.x)) - Math.min(...s.edges.map((e) => e.x)) + 80}
          height={Math.max(...s.edges.map((e) => e.y)) - Math.min(...s.edges.map((e) => e.y)) + 80}
          fill="#14243A"
          fillOpacity="0.28"
        />
      )}
    </g>
  );
}

function selectedHolder(v: TerraView, cell: number | null): number {
  return cell === null ? -2 : holderAt(v, cell);
}

/** How a territory is drawn, by its place in the focus. */
function look(h: TerraShapes["holders"][number], touched: boolean) {
  if (h.focus === "milan")
    return {
      fill: "url(#terra-hatch)",
      stroke: P.vermilionDeep,
      strokeOpacity: 0.7,
      strokeWidth: 0.8,
    };
  if (h.focus === "me")
    return {
      fill: h.tone,
      fillOpacity: 0.42,
      stroke: P.gold,
      strokeOpacity: 0.95,
      strokeWidth: 1.3,
    };
  if (h.focus === "ally")
    return {
      fill: h.tone,
      fillOpacity: 0.2,
      stroke: P.lagoon,
      strokeOpacity: 0.95,
      strokeWidth: 1,
    };
  if (h.focus === "neighbour" || touched)
    return {
      fill: h.tone,
      fillOpacity: 0.24,
      stroke: h.tone,
      strokeOpacity: 0.9,
      strokeWidth: 0.9,
    };
  return {
    fill: "none",
    stroke: P.cream,
    strokeOpacity: h.focus === "faint" ? 0.07 : 0.16,
    strokeWidth: 0.6,
  };
}

/** The cells that changed hands since the last fetch, for 450 ms. */
function useFresh(v: TerraView): { cell: number; holder: number; at: number }[] {
  const last = useRef<{ week: number; owner: number[] } | null>(null);
  const [fresh, setFresh] = useState<{ cell: number; holder: number; at: number }[]>([]);
  const owners = v.owner.join(",");
  // biome-ignore lint/correctness/useExhaustiveDependencies: `owners` is the map's identity.
  useEffect(() => {
    const before = last.current;
    last.current = { week: v.week, owner: v.owner };
    if (!before || before.week !== v.week) return;
    const at = Date.now();
    const taken = v.owner.flatMap((o, cell) =>
      o >= 0 && before.owner[cell] !== o ? [{ cell, holder: o, at }] : [],
    );
    if (taken.length === 0 || taken.length > 200) return;
    setFresh(taken);
    const id = setTimeout(() => setFresh([]), 450);
    return () => clearTimeout(id);
  }, [owners]);
  return fresh;
}

/** The places the camera frames: the land's corners and its cities. */
export function terraSpots(v: TerraView, s: TerraShapes) {
  return [
    ...s.edges.map((p, k) => ({ key: `terra:edge:${k}`, x: p.x, y: p.y })),
    ...v.map.cities.map((c) => {
      const [x, y] = hexCenter(s.map, c.cell);
      return { key: `terra:${c.cell}`, x, y };
    }),
  ];
}

/** The cities, the merchants' war counters, the fronts' strength. */
export function terraMarkers(
  props: GameProps,
  v: TerraView,
  s: TerraShapes,
  select: (sel: Selection) => void,
): MapMarker[] {
  const cities = new Set(v.map.cities.map((c) => c.cell));
  const out: MapMarker[] = v.map.cities.map((c) => {
    const holder = holderAt(v, c.cell);
    return {
      key: `terra:${c.cell}`,
      node: (
        <TerraCity
          code={c.code}
          name={props.names.city(c.code)}
          ring={
            holder >= 0
              ? v.holders[holder]?.milan
                ? P.vermilionDeep
                : (s.tone[holder] ?? null)
              : null
          }
          onTap={() => select({ kind: "terra", cell: c.cell })}
        />
      ),
    };
  });
  const threatened = v.fronts.some((f) => f.threat);
  v.holders.forEach((h, i) => {
    if (h.capital === null || h.milan || cities.has(h.capital)) return;
    const [x, y] = hexCenter(s.map, h.capital);
    const cell = h.capital;
    out.push({
      key: `terra:${cell}`,
      at: { x, y },
      node: (
        <WarCounter
          name={h.pseudo ?? t().someone}
          crest={h.crest ?? defaultCrest(h.id ?? String(i))}
          mine={h.me}
          tone={s.tone[i] ?? P.cream}
          share={h.me && v.me ? v.me.troops / Math.max(1, v.me.cap) : null}
          threatened={h.me && threatened}
          small={!h.me && !h.ally && s.holders.find((x) => x.i === i)?.focus !== "neighbour"}
          onTap={() => select({ kind: "terra", cell })}
        />
      ),
    });
  });
  for (const f of v.fronts) {
    if (!f.mine && !f.threat) continue;
    const from = frontFrom(v, s.map, f.owner, f.aim);
    if (!from) continue;
    const [x, y] = hexCenter(s.map, f.aim);
    out.push({
      key: `front:${f.id}`,
      at: { x: (from[0] + x) / 2, y: (from[1] + y) / 2 },
      node: (
        <button
          type="button"
          onClick={() => select({ kind: "terra", cell: f.aim })}
          className={`marker-hit -ml-4 -mt-3 flex h-6 min-w-8 items-center justify-center rounded-full px-1.5 font-mono text-[11px] font-bold shadow-md shadow-black/40 ${f.mine ? "bg-gold text-ink" : "bg-vermilion text-cream"}`}
        >
          ⚔ {f.troops}
        </button>
      ),
    });
  }
  return out;
}

function TerraCity({
  code,
  name,
  ring,
  onTap,
}: { code: string; name: string; ring: string | null; onTap: () => void }) {
  return (
    <button
      type="button"
      aria-label={name}
      onClick={onTap}
      className="marker-hit relative -ml-6 -mt-6 flex h-12 w-12 items-center justify-center"
    >
      <span
        className="marker-orb relative flex h-8 w-8 items-center justify-center rounded-full shadow-[0_4px_12px_rgb(0_0_0/0.55),inset_-3px_-4px_8px_rgb(0_0_0/0.3)]"
        style={{ ...orbStyle(code), boxShadow: ring ? `0 0 0 2px ${ring}` : undefined }}
      >
        <CityIcon code={code} className="h-6 w-6" />
      </span>
      <span className="pointer-events-none absolute left-1/2 top-[calc(100%-8px)] -translate-x-1/2 whitespace-nowrap font-display text-[10px] font-extrabold uppercase tracking-wider text-cream/85 [text-shadow:0_1px_3px_rgb(0_0_0/0.95)]">
        {name}
      </span>
    </button>
  );
}

/** A merchant's war counter: their crest; the merchant's own larger, ringed with their troops. */
function WarCounter({
  name,
  crest,
  mine,
  tone,
  share,
  threatened,
  small,
  onTap,
}: {
  name: string;
  crest: NonNullable<TerraView["holders"][number]["crest"]>;
  mine: boolean;
  tone: string;
  share: number | null;
  threatened: boolean;
  small: boolean;
  onTap: () => void;
}) {
  const box = mine ? 56 : small ? 22 : 34;
  const r = box / 2 - 2;
  const c = 2 * Math.PI * r;
  return (
    <button
      type="button"
      aria-label={name}
      onClick={onTap}
      className="marker-hit relative flex items-center justify-center"
      style={{ width: box, height: box, marginLeft: -box / 2, marginTop: -box / 2 }}
    >
      {threatened && (
        <span className="marker-halo marker-halo-vermilion absolute -inset-1 rounded-full" />
      )}
      {share !== null && (
        <svg
          viewBox={`0 0 ${box} ${box}`}
          className="absolute inset-0 -rotate-90"
          aria-hidden="true"
        >
          <circle
            cx={box / 2}
            cy={box / 2}
            r={r}
            fill="none"
            stroke={P.night}
            strokeOpacity="0.6"
            strokeWidth="3"
          />
          <circle
            cx={box / 2}
            cy={box / 2}
            r={r}
            fill="none"
            stroke={P.lagoon}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${(c * Math.min(1, Math.max(0.02, share))).toFixed(1)} ${c.toFixed(1)}`}
          />
        </svg>
      )}
      <span
        className="relative flex items-center justify-center rounded-full shadow-[0_4px_12px_rgb(0_0_0/0.55)]"
        style={{
          width: mine ? 42 : box - 4,
          height: mine ? 42 : box - 4,
          background: mine
            ? "radial-gradient(circle at 34% 30%, rgb(var(--gold-soft)) 0%, rgb(var(--gold)) 45%, rgb(var(--gold-deep)) 80%, #5A3D12 100%)"
            : "rgb(var(--night) / 0.9)",
          boxShadow: mine ? undefined : `0 0 0 1.5px ${tone}`,
        }}
      >
        <Crest crest={crest} size={mine ? 26 : small ? 12 : 20} />
      </span>
      {mine && (
        <span className="pointer-events-none absolute left-1/2 top-[calc(100%-2px)] -translate-x-1/2 whitespace-nowrap font-display text-[10px] font-extrabold uppercase tracking-wider text-gold [text-shadow:0_1px_3px_rgb(0_0_0/0.9)]">
          {name}
        </span>
      )}
    </button>
  );
}

/** Under the purse on the right: the troops, the glory and rank, the week's clock. */
export function TerraHud({ v, now }: { v: TerraView; now: number }) {
  const me = v.me;
  return (
    <div className="flex flex-col items-end gap-1">
      {me && (
        <>
          <span
            title={t().troops}
            className="hud-orb flex h-9 items-center gap-1.5 rounded-full pl-2 pr-2.5"
          >
            <span className="text-[15px] leading-none">⚔</span>
            <span className="font-display text-sm font-extrabold tabular-nums text-cream">
              {t().troopsLine(me.troops, me.cap)}
            </span>
          </span>
          <span className="hud-orb flex h-8 items-center rounded-full px-2.5 font-display text-[12px] font-extrabold tabular-nums text-gold">
            {t().glory(me.glory, me.rank)}
          </span>
        </>
      )}
      <span className="flex flex-col items-end font-mono text-[10px] uppercase tracking-[0.1em] text-cream-dim [text-shadow:0_1px_3px_rgb(0_0_0/0.9)]">
        <span>{v.closed ? t().closed : t().closesIn(clock(v.closesAt - now))}</span>
        {!v.open && !v.closed && <span className="text-lagoon">☾ {t().night}</span>}
      </span>
    </div>
  );
}

/**
 * The panel at the foot: where to set down (no counter yet), a front to launch on a cell along
 * the border, a merchant to ally with or to help, the merchant's own land to build on.
 */
export function TerraPanel({
  props,
  v,
  s,
  cell,
  select,
  act,
}: {
  props: GameProps;
  v: TerraView;
  s: TerraShapes;
  cell: number | null;
  select: (sel: Selection | null) => void;
  act: (a: TerraAction) => Promise<boolean>;
}) {
  const [shareBps, setShare] = useState(5_000);
  const now = props.now;
  const me = v.me;
  const close = () => select(null);

  if (cell === null) {
    if (me || !!v.closed) return null;
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-[calc(max(1rem,env(safe-area-inset-bottom))+5.25rem)] z-10 flex flex-col items-center gap-1 lg:bottom-28">
        <span className="whitespace-nowrap rounded-full bg-gold px-4 py-2 font-display text-[13px] font-extrabold uppercase tracking-wide text-ink shadow-[0_6px_20px_rgb(0_0_0/0.45)]">
          {t().place.invite}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-cream-dim [text-shadow:0_1px_3px_rgb(0_0_0/0.9)]">
          {t().place.hint}
        </span>
      </div>
    );
  }

  const holder = holderAt(v, cell);
  const h = holder >= 0 ? v.holders[holder] : undefined;
  const terrain = t().terrains[v.map.terrain[cell] ?? "p"] ?? "";
  const city = v.map.cities.find((c) => c.cell === cell);
  const title = city ? props.names.city(city.code) : holderName(v, holder);
  const chip = <span className="label">{city ? holderName(v, holder) : terrain}</span>;

  // Not set down yet: a neutral cell to settle on.
  if (!me) {
    const free = holder < 0 && !v.closed;
    return (
      <ContextPanel
        title={title}
        chip={chip}
        status={free ? t().place.line(terrain) : h ? t().holder.line(h.cells, h.troops) : terrain}
        tone="gold"
        onClose={close}
        actions={
          free ? (
            <ActionButton
              icon={Icon.build()}
              label={t().place.here}
              tone="gold"
              onClick={async () => {
                if (await act({ type: "terraPlace", cell })) close();
              }}
            />
          ) : null
        }
      />
    );
  }

  // The merchant's own land.
  if (h?.me) {
    const built = v.buildings.find((b) => b.cell === cell);
    const mine = v.fronts.filter((f) => f.mine);
    const traitor = me.traitorUntil > now;
    return (
      <ContextPanel
        title={t().mine.title}
        chip={<span className="label">{t().glory(me.glory, me.rank)}</span>}
        status={t().mine.line(me.cells, me.troops, me.cap)}
        progress={me.troops / Math.max(1, me.cap)}
        tone={v.fronts.some((f) => f.threat) ? "vermilion" : "gold"}
        onClose={close}
        actions={
          <>
            <ActionButton
              icon={Icon.build()}
              label={t().mine.rocca}
              disabled={!!built || !!v.closed}
              onClick={() => act({ type: "terraBuild", cell, kind: "rocca" })}
            />
            <ActionButton
              icon={Icon.harvest()}
              label={t().mine.borgo}
              disabled={!!built || !!v.closed}
              onClick={() => act({ type: "terraBuild", cell, kind: "borgo" })}
            />
            <ActionButton
              icon={Icon.upgrade()}
              label={t().mine.raise}
              badge={me.raisesLeft > 0 ? `+${v.rules.capRaise}` : undefined}
              disabled={me.raisesLeft === 0 || !!v.closed}
              onClick={() => act({ type: "terraRaise" })}
            />
            <ActionButton
              icon={Icon.trophy()}
              label={t().mine.decree}
              tone={me.programme ? "plain" : "gold"}
              onClick={() => props.setSheet("terra:decree")}
            />
          </>
        }
        extra={
          <div className="space-y-1.5 text-[12px] text-cream-dim">
            {built ? (
              <p>{t().mine.built[built.kind]}</p>
            ) : (
              <p>
                {t().mine.buildHint(
                  d(v.rules.prices.rocca),
                  d(v.rules.prices.borgo),
                  d(v.rules.prices.cap),
                  v.rules.capRaise,
                )}
              </p>
            )}
            {traitor && (
              <p className="text-vermilion">{t().mine.traitor(clock(me.traitorUntil - now))}</p>
            )}
            {mine.map((f) => (
              <p key={f.id} className="flex items-center justify-between gap-2">
                <span className="text-gold">
                  {t().mine.frontLine(f.troops, holderName(v, f.against))}
                </span>
                <button
                  type="button"
                  className="label rounded-full px-2.5 py-1 text-cream ring-1 ring-inset ring-line"
                  onClick={() => act({ type: "terraRecall", frontId: f.id })}
                >
                  {t().mine.recall}
                </button>
              </p>
            ))}
          </div>
        }
      />
    );
  }

  const merchant = h && !h.milan && h.id ? h : null;
  const ally = !!merchant?.ally;
  const asked = merchant ? me.requestsIn.includes(holder) : false;
  const offered = merchant ? me.requestsOut.includes(holder) : false;
  const cost = v.costs[String(cell)];
  const attackable = cost !== undefined && !ally && !v.closed;
  const aimed = v.fronts.find((f) => f.mine && f.aim === cell);
  const troops = Math.floor((me.troops * shareBps) / 10_000);
  const cells = cost ? Math.max(0, Math.floor(troops / cost)) : 0;
  const gift = Math.min(me.giftsLeft, Math.floor(me.troops / 4));

  const allyButton = merchant && !ally && (
    <ActionButton
      icon={Icon.family()}
      label={asked ? t().holder.accept : offered ? t().holder.asked : t().holder.ally}
      tone={asked ? "lagoon" : "plain"}
      disabled={offered || !!v.closed}
      onClick={() =>
        act(
          asked
            ? { type: "terraAccept", from: merchant.id as string }
            : { type: "terraAlly", other: merchant.id as string },
        )
      }
    />
  );

  return (
    <ContextPanel
      title={title}
      chip={ally ? <span className="label text-lagoon">{t().holder.allyChip}</span> : chip}
      status={
        attackable
          ? t().target.cost(cost)
          : ally
            ? t().target.allied
            : h
              ? t().holder.line(h.cells, h.troops)
              : t().target.far
      }
      tone={attackable ? "gold" : "lagoon"}
      onClose={close}
      actions={
        <>
          {attackable && (
            <ActionButton
              icon={Icon.bandits()}
              label={t().target.attack}
              tone="gold"
              disabled={troops <= 0}
              onClick={async () => {
                haptic("tap");
                await act({ type: "terraFront", aim: cell, shareBps });
              }}
            />
          )}
          {aimed && (
            <ActionButton
              icon={Icon.cross()}
              label={t().mine.recall}
              onClick={() => act({ type: "terraRecall", frontId: aimed.id })}
            />
          )}
          {allyButton}
          {merchant && ally && (
            <>
              <ActionButton
                icon={Icon.send()}
                label={t().holder.send}
                tone="lagoon"
                disabled={gift <= 0 || !!v.closed}
                onClick={() => act({ type: "terraSend", to: merchant.id as string, count: gift })}
              />
              <ActionButton
                icon={Icon.cross()}
                label={t().holder.broken}
                tone="vermilion"
                disabled={!!v.closed}
                onClick={() => act({ type: "terraBreak", other: merchant.id as string })}
              />
            </>
          )}
        </>
      }
      extra={
        attackable ? (
          <div className="space-y-1">
            <input
              type="range"
              min={Math.max(1_000, v.rules.minShareBps)}
              max={10_000}
              step={500}
              value={shareBps}
              onChange={(e) => setShare(Number(e.target.value))}
              aria-label={t().target.attack}
              className="terra-share w-full accent-gold"
            />
            <p
              className={`text-center font-mono text-[11px] ${cells === 0 ? "text-vermilion" : "text-cream-dim"}`}
            >
              {t().target.share(Math.round(shareBps / 100), troops, cells)}
              {!v.open && ` · ${t().target.night}`}
            </p>
          </div>
        ) : merchant && ally ? (
          <p className="text-center font-mono text-[11px] text-cream-dim">
            {t().holder.sendLine(gift, me.giftsLeft)}
          </p>
        ) : undefined
      }
    />
  );
}

/** The decree the merchant would impose as Signore, and the one in force. */
export function TerraSheets({
  props,
  v,
  act,
}: { props: GameProps; v: TerraView; act: (a: TerraAction) => Promise<boolean> }) {
  const open = props.sheet === "terra:decree";
  const close = () => props.setSheet(null);
  const picked = v.me?.programme ?? null;
  const [code, setCode] = useState<string>(picked?.code ?? v.rules.decrees[0] ?? "");
  const kind = t().decree.targets[code];
  const options =
    kind === "resource"
      ? props.catalog.resources.map((r) => ({ value: r.code, label: r.name }))
      : kind === "city"
        ? props.catalog.cities.map((c) => ({ value: c.code, label: c.name }))
        : [];
  const [target, setTarget] = useState<string>(picked?.target ?? "");
  const aim = options.some((o) => o.value === target) ? target : (options[0]?.value ?? "");
  const repeat = v.decree?.code === code;
  return (
    <Sheet open={open} onClose={close}>
      <div className="space-y-4">
        {v.decree && (
          <div className="rounded-xl bg-night-3 p-3 ring-1 ring-line">
            <p className="label text-lagoon">{t().decree.inForce}</p>
            <p className="font-display text-base font-extrabold">
              {t().decree.names[v.decree.code] ?? v.decree.code}
              {v.decree.target
                ? ` · ${props.names.resource(v.decree.target) || props.names.city(v.decree.target)}`
                : ""}
            </p>
            {v.decree.mine && <p className="text-[12px] text-gold">{t().decree.yours}</p>}
          </div>
        )}
        <div>
          <h2 className="font-display text-lg font-extrabold uppercase tracking-wide">
            {t().decree.title}
          </h2>
          <p className="mt-1 text-[13px] text-cream-dim">{t().decree.hint}</p>
        </div>
        <div className="space-y-2">
          {v.rules.decrees.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCode(c)}
              aria-pressed={code === c}
              className={`block w-full rounded-xl p-3 text-left ring-1 ring-inset transition ${code === c ? "bg-gold/10 ring-gold/70" : "bg-night-3 ring-line"} ${v.decree?.code === c ? "opacity-50" : ""}`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-display text-[14px] font-extrabold">
                  {t().decree.names[c] ?? c}
                </span>
                {picked?.code === c && <span className="label text-gold">{t().decree.chosen}</span>}
              </span>
              <span className="mt-0.5 block text-[12px] text-cream-dim">{t().decree.texts[c]}</span>
            </button>
          ))}
        </div>
        {options.length > 0 && (
          <div className="space-y-1.5">
            <p className="label">{t().decree.target}</p>
            <Segmented value={aim} options={options} onChange={setTarget} />
          </div>
        )}
        <Slab
          className="w-full"
          disabled={!v.me || repeat || !!v.closed}
          onClick={async () => {
            const ok = await act(
              options.length > 0
                ? { type: "terraDecree", code, target: aim }
                : { type: "terraDecree", code },
            );
            if (ok) close();
          }}
        >
          {t().decree.choose}
        </Slab>
      </div>
    </Sheet>
  );
}
