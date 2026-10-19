import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CityIcon } from "../../art/cities.js";
import { Crest, defaultCrest } from "../../art/crest.js";
import { P } from "../../art/palette.js";
import { haptic } from "../../haptics.js";
import { fr } from "../../i18n.js";
import { Segmented, Sheet, Slab, clock } from "../../ui.js";
import type { GameProps } from "../Game.js";
import { gameApi } from "../api.js";
import { d, duration } from "../format.js";
import { store } from "../store.js";
import {
  type HexMap,
  cellAt,
  cellsByHolder,
  hexCenter,
  hexCorners,
  labelCell,
  neighbours,
  outline,
  replayed,
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

/** Whether merchants may still set down this week. */
export const placementOpen = (v: TerraView, now: number) =>
  v.placementEndsAt === null || now < v.placementEndsAt;

/**
 * Whether the Terraferma calls: a camp still to set down while the week lets it, a front marching
 * on the merchant, an ally asking.
 */
export function terraCalls(v: TerraView, now: number): boolean {
  if (v.closed) return false;
  if (!v.me) return placementOpen(v, now);
  if (v.me.eliminatedAt !== null) return false;
  return v.fronts.some((f) => f.threat) || v.me.requestsIn.length > 0;
}

const REPLAY_MS = 2_000;
const REPLAY_FRAME_MS = 100;
const REPLAY_HOLD_MS = 600;

function reducedMotion(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * What changed hands while the merchant was away, replayed in two seconds when the layer opens,
 * like the "welcome back" summary: the map as it stood at their last look, then the cells taken
 * since, in their order. The first look of a week, and those who ask for less motion, see the
 * map as it is.
 */
export function useAbsence(
  v: TerraView | null | undefined,
  shown: boolean,
  now: number,
): { view: TerraView | null | undefined; replaying: boolean } {
  const [frame, setFrame] = useState<{ owner: number[] } | null>(null);
  const started = useRef(false);
  const live = useRef({ v, now });
  live.current = { v, now };
  const ready = !!v;
  useEffect(() => {
    if (!shown) {
      started.current = false;
      setFrame(null);
      return;
    }
    const current = live.current.v;
    if (!ready || !current || started.current) return;
    started.current = true;
    const key = `terraSeen:${current.week}`;
    const seen = Number(store.get(key) ?? 0);
    const missed = current.changes.filter((c) => c.at > seen);
    if (seen === 0 || missed.length === 0 || reducedMotion()) return;
    // The map as it was, held while the camera glides to the layer.
    const start = Date.now() + REPLAY_HOLD_MS;
    setFrame({ owner: replayed(current.owner, missed, 0) });
    const id = setInterval(() => {
      const k = Math.max(0, Math.ceil((missed.length * (Date.now() - start)) / REPLAY_MS));
      if (k >= missed.length) {
        clearInterval(id);
        setFrame(null);
        return;
      }
      setFrame({ owner: replayed(live.current.v?.owner ?? current.owner, missed, k) });
    }, REPLAY_FRAME_MS);
    return () => clearInterval(id);
  }, [shown, ready]);
  // What the merchant has seen: the map up to now, while the layer is shown and not replaying.
  useEffect(() => {
    if (shown && v && !frame) store.set(`terraSeen:${v.week}`, String(now));
  }, [shown, v, frame, now]);
  return { view: v && frame ? { ...v, owner: frame.owner } : v, replaying: !!frame };
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
  /** Every land cell's edge: the map's grid. */
  grid: string;
  /** Where each holder's name and troops are written, and how large. */
  labels: { i: number; x: number; y: number; size: number }[];
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
    // Off the war counters and the cities, which carry their own markers.
    const kept = new Set<number>([
      ...v.map.cities.map((c) => c.cell),
      ...v.holders.flatMap((h) => (h.capital === null ? [] : [h.capital])),
    ]);
    const labels = holders.flatMap((h) => {
      const cells = by.get(h.i) ?? [];
      // A small land is covered by its war counter, which then carries the troops itself.
      if (h.focus === "faint" || (h.focus !== "milan" && cells.length < LABEL_MIN_CELLS)) return [];
      const cell = labelCell(map, cells, kept);
      if (cell === null) return [];
      const [x, y] = hexCenter(map, cell);
      const size = Math.min(2.4, Math.max(0.8, 0.42 * Math.sqrt(cells.length))) * map.size;
      return [{ i: h.i, x, y, size }];
    });
    const edges = [
      { x: x0, y: y0 },
      { x: x1, y: y0 },
      { x: x0, y: y1 },
      { x: x1, y: y1 },
    ];
    return { map, land, holders, tone, me, grid, labels, edges };
  }, [owners, ids]);
}

/** "14:20", Paris time: when a front will reach a cell. */
const hour = (at: number) =>
  new Date(at).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });

/** How long until a front takes its next cell (already due: at the next resolution). */
const wait = (at: number, now: number) => (at > now ? duration(at - now) : t().soon);

/** Below so many cells, a holder's troops are written on its war counter rather than its land. */
const LABEL_MIN_CELLS = 12;

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

const hexPath = (map: HexMap, cells: Iterable<number>, scale: number) => {
  let d = "";
  for (const i of cells)
    d += `M${hexCorners(map, i, scale)
      .map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`)
      .join("L")}Z`;
  return d;
};

/** The fronts the merchant follows (his own, those marching on him), with their next cells. */
function followed(v: TerraView) {
  return v.fronts.filter((f) => (f.mine || f.threat) && f.takes.length > 0);
}

/**
 * Under the markers: the territories, the grid, the cells along the border a front can take,
 * the cells the fronts will take next, each holder's troops, the night's veil, the fronts.
 */
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
  const costKeys = Object.keys(v.costs).join(",");
  const playing = !!v.me && !v.closed;
  // biome-ignore lint/correctness/useExhaustiveDependencies: `costKeys` is the border's identity.
  const reach = useMemo(
    () => (playing ? hexPath(s.map, Object.keys(v.costs).map(Number), 0.78) : ""),
    [costKeys, s.map, playing],
  );
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
      {/* The grid, as on OpenFront: every cell's edge, brighter while aiming. */}
      <path
        d={s.grid}
        fill="none"
        stroke={P.cream}
        strokeOpacity={aiming ? 0.2 : 0.1}
        strokeWidth="0.3"
      />
      {/* The cells a front can take, along the merchant's border. */}
      {reach && (
        <path
          d={reach}
          fill="none"
          stroke={P.gold}
          strokeOpacity="0.5"
          strokeWidth="0.35"
          strokeDasharray="1 1"
        />
      )}
      {/* Where the fronts go next, and in what order: the next cell breathes. */}
      {followed(v).map((f) => {
        const color = f.mine ? P.gold : P.vermilion;
        const [next, ...later] = f.takes;
        return (
          <g key={`path-${f.id}`}>
            {later.length > 0 && (
              <path
                d={hexPath(
                  s.map,
                  later.map((t) => t.cell),
                  0.82,
                )}
                fill={color}
                fillOpacity="0.1"
                stroke={color}
                strokeOpacity="0.55"
                strokeWidth="0.35"
                strokeDasharray="0.8 0.8"
              />
            )}
            {next && (
              <path
                d={hexPath(s.map, [next.cell], 0.86)}
                fill={color}
                stroke={color}
                strokeWidth="0.6"
                className="terra-next"
              />
            )}
          </g>
        );
      })}
      {/* Each holder's troops, written on its land as on OpenFront. */}
      {s.labels.map((l) => {
        const h = v.holders[l.i];
        const focus = s.holders.find((x) => x.i === l.i)?.focus;
        if (!h) return null;
        const strong = focus === "me" || focus === "neighbour" || focus === "ally";
        const name = h.milan ? t().milan : h.me ? null : (h.pseudo ?? t().someone);
        return (
          <g
            key={`label-${l.i}`}
            pointerEvents="none"
            textAnchor="middle"
            opacity={strong || focus === "milan" ? 1 : 0.6}
            style={{ paintOrder: "stroke" }}
            stroke="#0B1626"
            strokeOpacity="0.85"
            strokeLinejoin="round"
          >
            {name && (
              <text
                x={l.x}
                y={l.y - l.size * 0.55}
                fontSize={l.size * 0.55}
                strokeWidth={l.size * 0.14}
                fill={P.cream}
                className="font-display font-extrabold"
              >
                {name}
              </text>
            )}
            <text
              x={l.x}
              y={l.y + l.size * (name ? 0.45 : 0.35)}
              fontSize={l.size}
              strokeWidth={l.size * 0.16}
              fill={h.me ? P.gold : P.cream}
              className="font-display font-extrabold tabular-nums"
            >
              {h.troops}
            </text>
          </g>
        );
      })}
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
          troops={s.labels.some((l) => l.i === i) ? null : h.troops}
          threatened={h.me && threatened}
          small={!h.me && !h.ally && s.holders.find((x) => x.i === i)?.focus !== "neighbour"}
          onTap={() => select({ kind: "terra", cell })}
        />
      ),
    });
  });
  // Each front's strength where it stands now: on the next cell it will take, with the time left.
  for (const f of v.fronts) {
    if (!f.mine && !f.threat) continue;
    const next = f.takes[0];
    let at: { x: number; y: number };
    if (next) {
      const [x, y] = hexCenter(s.map, next.cell);
      at = { x, y };
    } else {
      const from = frontFrom(v, s.map, f.owner, f.aim);
      if (!from) continue;
      const [x, y] = hexCenter(s.map, f.aim);
      at = { x: (from[0] + x) / 2, y: (from[1] + y) / 2 };
    }
    out.push({
      key: `front:${f.id}`,
      at,
      node: (
        <div className="-mt-3 -translate-x-1/2">
          <button
            type="button"
            onClick={() => select({ kind: "terra", cell: next?.cell ?? f.aim })}
            className={`marker-hit flex h-6 items-center justify-center gap-1 whitespace-nowrap rounded-full px-2 font-mono text-xs font-bold shadow-md shadow-black/40 ${f.mine ? "bg-gold text-ink" : "bg-vermilion text-cream"}`}
          >
            ⚔ {f.troops}
            {next && <span className="font-normal opacity-80">· {wait(next.at, props.now)}</span>}
          </button>
        </div>
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
      <span className="pointer-events-none absolute left-1/2 top-[calc(100%-8px)] -translate-x-1/2 whitespace-nowrap font-display text-xs font-extrabold uppercase tracking-wider text-cream/85 [text-shadow:0_1px_3px_rgb(0_0_0/0.95)]">
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
  troops,
  onTap,
}: {
  name: string;
  crest: NonNullable<TerraView["holders"][number]["crest"]>;
  mine: boolean;
  tone: string;
  share: number | null;
  threatened: boolean;
  small: boolean;
  /** Its troops, when its land is too small to carry them. */
  troops: number | null;
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
      {mine ? (
        <span className="pointer-events-none absolute left-1/2 top-[calc(100%-2px)] -translate-x-1/2 whitespace-nowrap font-display text-xs font-extrabold uppercase tracking-wider text-gold [text-shadow:0_1px_3px_rgb(0_0_0/0.9)]">
          {name}
          {troops !== null && <span className="tabular-nums text-cream"> · ⚔ {troops}</span>}
        </span>
      ) : (
        troops !== null && (
          <span className="pointer-events-none absolute left-1/2 top-[calc(100%-3px)] -translate-x-1/2 whitespace-nowrap font-display text-xs font-extrabold tabular-nums text-cream [text-shadow:0_1px_3px_rgb(0_0_0/0.95)]">
            {troops}
          </span>
        )
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
            className="hud-orb relative flex h-9 items-center gap-1.5 overflow-hidden rounded-full pl-2 pr-2.5"
          >
            <span className="text-[15px] leading-none">⚔</span>
            <span className="font-display text-sm font-extrabold tabular-nums text-cream">
              {t().troopsLine(me.troops, me.cap)}
            </span>
            {me.troops < me.cap && me.recruit.perHour > 0 && (
              <span
                className={`font-mono text-xs font-bold ${v.open ? "text-lagoon" : "text-cream-dim"}`}
              >
                {v.open
                  ? t().perHour(me.recruit.perHour)
                  : t().perHourAt(me.recruit.perHour, v.openHours.from)}
              </span>
            )}
            {/* How full the troops are: a thread of light at the foot of the pill. */}
            <span
              className="absolute bottom-0 left-0 h-[3px] bg-lagoon transition-[width] duration-700"
              style={{ width: `${Math.min(100, (me.troops / Math.max(1, me.cap)) * 100)}%` }}
            />
          </span>
          <span className="hud-orb flex h-8 items-center rounded-full px-2.5 font-display text-[12px] font-extrabold tabular-nums text-gold">
            {t().glory(me.glory, me.rank)}
          </span>
        </>
      )}
      <span className="note flex max-w-[58vw] flex-col items-end text-right [text-shadow:0_1px_3px_rgb(0_0_0/0.9)] lg:max-w-xs">
        {me?.eliminatedAt != null && <span className="text-vermilion">{t().eliminated}</span>}
        {!v.closed && v.placementEndsAt !== null && now < v.placementEndsAt && (
          <span className="text-gold">{t().placing(clock(v.placementEndsAt - now))}</span>
        )}
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

  const open = placementOpen(v, now);
  if (cell === null) {
    if (v.closed) return null;
    // Out of the week: too late to set down, or wiped off the map.
    if ((!me && !open) || (me && me.eliminatedAt !== null)) {
      return (
        <div className="pointer-events-none absolute inset-x-0 bottom-[calc(max(1rem,env(safe-area-inset-bottom))+5.25rem)] z-10 flex flex-col items-center gap-1 px-4 text-center lg:bottom-28">
          <span className="rounded-full bg-night/90 px-4 py-2 font-display text-[13px] font-extrabold uppercase tracking-wide text-cream ring-1 ring-line shadow-[0_6px_20px_rgb(0_0_0/0.45)]">
            {me ? t().out.eliminated : t().out.late}
          </span>
          <span className="font-mono text-xs uppercase tracking-[0.1em] text-cream-dim [text-shadow:0_1px_3px_rgb(0_0_0/0.9)]">
            {t().out.next(clock(v.closesAt - now))}
          </span>
        </div>
      );
    }
    if (me) return <Returns v={v} />;
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-[calc(max(1rem,env(safe-area-inset-bottom))+5.25rem)] z-10 flex flex-col items-center gap-1 lg:bottom-28">
        <span className="slab whitespace-nowrap bg-gold px-4 py-2 font-display text-[13px] font-extrabold uppercase tracking-wide text-ink shadow-[0_6px_20px_rgb(0_0_0/0.45)]">
          {t().place.invite}
        </span>
        <span className="note [text-shadow:0_1px_3px_rgb(0_0_0/0.9)]">
          {t().place.hint}
          {v.placementEndsAt !== null && ` · ${t().place.until(clock(v.placementEndsAt - now))}`}
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
  if (!me || me.eliminatedAt !== null) {
    const free = !me && holder < 0 && !v.closed && open;
    return (
      <ContextPanel
        title={title}
        chip={chip}
        status={
          free
            ? t().place.line(terrain)
            : h
              ? t().holder.line(h.cells, h.troops)
              : !v.closed && !open
                ? t().out.late
                : terrain
        }
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
    const threat = v.fronts
      .filter((f) => f.threat)
      .flatMap((f) => f.takes.filter((x) => x.cell === cell))
      .sort((a, b) => a.at - b.at)[0];
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
              icon={Icon.upgrade()}
              label={t().mine.raise(v.rules.capRaise)}
              tone="gold"
              badge={me.raisesLeft > 0 ? d(v.rules.prices.cap) : undefined}
              disabled={me.raisesLeft === 0 || !!v.closed}
              onClick={() => act({ type: "terraRaise" })}
            />
            <ActionButton
              icon={Icon.build()}
              label={t().mine.rocca}
              badge={built ? undefined : d(v.rules.prices.rocca)}
              disabled={!!built || !!v.closed}
              onClick={() => act({ type: "terraBuild", cell, kind: "rocca" })}
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
            <p>
              {me.troops >= me.cap
                ? t().mine.full(v.rules.capRaise)
                : t().mine.recruit(
                    me.recruit.perHour,
                    me.recruit.fullAt === null ? null : wait(me.recruit.fullAt, now),
                    v.openHours.from,
                    v.openHours.to,
                  )}
            </p>
            {built && <p>{t().mine.built[built.kind]}</p>}
            {traitor && (
              <p className="text-vermilion">{t().mine.traitor(clock(me.traitorUntil - now))}</p>
            )}
            {threat && (
              <p className="text-vermilion">
                {t().mine.threatEta(hour(threat.at), wait(threat.at, now))}
              </p>
            )}
            {mine.map((f) => (
              <p key={f.id} className="flex items-center justify-between gap-2">
                <span className="text-gold">
                  {t().mine.frontLine(f.troops, holderName(v, f.against))}
                  {f.takes[0] && (
                    <span className="text-cream-dim"> · {wait(f.takes[0].at, now)}</span>
                  )}
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
  // When the merchant's fronts will reach this cell; what his land keeps to defend itself.
  const eta = v.fronts
    .filter((f) => f.mine)
    .flatMap((f) => f.takes.filter((x) => x.cell === cell))
    .sort((a, b) => a.at - b.at)[0];
  const density = (left: number) => Math.floor(left / Math.max(1, me.cells));

  const allyButton = merchant && !ally && (
    <ActionButton
      icon={Icon.family()}
      label={asked ? t().holder.accept : offered ? t().holder.asked : t().holder.ally}
      tone={asked ? "gold" : "plain"}
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
        eta
          ? t().target.eta(hour(eta.at), wait(eta.at, now))
          : attackable
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
              disabled={cells === 0}
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
                tone="plain"
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
              className={`text-center font-mono text-xs ${cells === 0 ? "text-vermilion" : "text-cream"}`}
            >
              {cells === 0
                ? me.troops >= (cost ?? 0)
                  ? t().target.tooWeak(cost ?? 0)
                  : t().target.notEnough(cost ?? 0, me.troops)
                : t().target.plan(troops, cells, cells * (cost ?? 0), troops - cells * (cost ?? 0))}
            </p>
            {cells > 0 && (
              <p className="text-center font-mono text-xs text-cream-dim">
                {t().target.pace(
                  Math.ceil(
                    (cells * (holder < 0 ? v.rules.neutralMinutes : v.rules.cellMinutes)) / 60,
                  ),
                  !v.open,
                )}
              </p>
            )}
            {/* Against a merchant only, and when it changes something: what stays home. */}
            {cells > 0 && merchant && density(me.troops - troops) < density(me.troops) && (
              <p className="text-center font-mono text-xs text-cream-dim">
                {t().target.defense(density(me.troops - troops), density(me.troops))}
              </p>
            )}
          </div>
        ) : merchant && ally ? (
          <p className="text-center font-mono text-xs text-cream-dim">
            {t().holder.sendLine(gift, me.giftsLeft)}
          </p>
        ) : undefined
      }
    />
  );
}

/**
 * The merchant's fronts come home since the last look: what each took, spent and brought back,
 * one line each, until dismissed.
 */
function Returns({ v }: { v: TerraView }) {
  const key = `terraReturnsSeen:${v.week}`;
  const [seen, setSeen] = useState(() => Number(store.get(key) ?? 0));
  const fresh = (v.me?.returns ?? []).filter((r) => r.at > seen).slice(-3);
  if (fresh.length === 0) return null;
  const last = fresh.at(-1)?.at ?? 0;
  return (
    <div className="absolute inset-x-3 bottom-[calc(max(1rem,env(safe-area-inset-bottom))+5.25rem)] z-10 mx-auto max-w-md cut bg-night-2/95 p-3 shadow-[0_6px_20px_rgb(0_0_0/0.45)] ring-1 ring-line lg:bottom-28">
      <p className="label text-gold">{t().returns.title}</p>
      {fresh.map((r) => (
        <p key={r.front} className="mt-1 text-[13px] text-cream">
          {t().returns.line(holderName(v, r.against), r.cells, r.spent, r.back)}
        </p>
      ))}
      <button
        type="button"
        className="label mt-2 rounded-full px-3 py-1 text-cream ring-1 ring-inset ring-line"
        onClick={() => {
          store.set(key, String(last));
          setSeen(last);
        }}
      >
        {t().returns.ok}
      </button>
    </div>
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
          <div className="cut bg-night-3 p-3 ring-1 ring-line">
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
              className={`block w-full cut p-3 text-left ring-1 ring-inset transition ${code === c ? "bg-gold/10 ring-gold/70" : "bg-night-3 ring-line"} ${v.decree?.code === c ? "opacity-50" : ""}`}
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
