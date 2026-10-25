import { type ReactNode, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CityIcon } from "../../art/cities.js";
import { Crest, MiniCrest, defaultCrest } from "../../art/crest.js";
import { MAP_TEXT, P } from "../../art/palette.js";
import { Lorenzo } from "../../art/scenes.js";
import { haptic } from "../../haptics.js";
import { fr } from "../../i18n.js";
import { locale } from "../../lang.js";
import { HudChip, LorenzoCard, Segmented, Sheet, Slab, clock } from "../../ui.js";
import type { GameProps } from "../Game.js";
import { MerchantName, merchantLabel } from "../Name.js";
import { gameApi } from "../api.js";
import { d, duration, hourOf } from "../format.js";
import { store } from "../store.js";
import {
  FOCUS_ORDER,
  type Focus,
  type HexMap,
  cellAt,
  cellsByHolder,
  enemiesOf,
  focusOf,
  hexCenter,
  hexCorners,
  hexNeighbors,
  labelCell,
  neighbours,
  outline,
  replayFits,
  replayed,
  territoryLook,
  tones,
} from "../terraShapes.js";
import type { SkirmishStatus, TerraAction, TerraView } from "../types.js";
import { HudTip, usePresence, useTip } from "./HudTips.js";
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
  // The same week as before keeps its object: nothing on the map is drawn again.
  const last = useRef("");
  const refresh = useCallback(() => {
    gameApi
      .terra()
      .then((r) => {
        const text = JSON.stringify(r.terra);
        if (text === last.current) return;
        last.current = text;
        setTerra(r.terra);
      })
      .catch(() => undefined);
  }, []);
  const battle = !!terra?.battle?.on;
  useEffect(() => {
    refresh();
    // Shown: the fronts move every few minutes (every few seconds in the battle hour); hidden:
    // only to know the door is there.
    const id = setInterval(refresh, shown ? (battle ? 3_000 : 10_000) : 300_000);
    return () => clearInterval(id);
  }, [shown, battle, refresh]);
  return { terra, refresh };
}

/** Hours a merchant setting down now is safe from the others: the truce, or his own hours. */
function safeHours(v: TerraView, now: number): number {
  const until = Math.max(v.truceEndsAt ?? 0, now + v.rules.protectionHours * 3_600_000);
  return Math.max(0, Math.ceil((until - now) / 3_600_000));
}

/** A glyph a quick signal. */
const SIGNAL_GLYPH: Record<string, string> = { help: "🆘", attack: "⚔", thanks: "🙏", peace: "🕊" };

/** A glyph a building, drawn small on its cell. */
const BUILDING_GLYPH: Record<string, string> = {
  rocca: "♜",
  borgo: "⌂",
  porto: "⚓",
  bombarda: "✹",
  mura: "▦",
};

/** Whether a cell lies by the water (where a port may stand). */
function coastalCell(v: TerraView, cell: number): boolean {
  const { width, height, terrain } = v.map;
  return hexNeighbors({ width, height }, cell).some((n) => terrain[n] === "w");
}

/** A skirmish: its state, fetched each second while it is shown. */
export function useSkirmish(shown: boolean): {
  status: SkirmishStatus | null;
  refresh: () => void;
} {
  const [status, setStatus] = useState<SkirmishStatus | null>(null);
  const refresh = useCallback(() => {
    gameApi
      .skirmish()
      .then(setStatus)
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    if (!shown) return;
    refresh();
    const id = setInterval(refresh, 1_000);
    return () => clearInterval(id);
  }, [shown, refresh]);
  return { status, refresh };
}

/** Whether the merchant's match is ranked (it brings glory) or friendly and why, in a line. */
function skirmishStake(status: SkirmishStatus): { text: string; ranked: boolean } | null {
  const k = fr.game.skirmish;
  if (status.phase === "off" || status.phase === "night") return null;
  // In the lobby or the match, only the merchants who play it; before, whoever may launch one.
  if (status.phase === "lobby" && !status.joined && status.why !== "off_map") return null;
  if ((status.phase === "playing" || status.phase === "done") && !status.playing) return null;
  if (status.ranked)
    return status.phase === "none"
      ? { text: k.rankedToday(status.rankedLeft, status.minHumans), ranked: true }
      : { text: k.ranked, ranked: true };
  const text =
    status.why === "off_map"
      ? k.friendlyOffMap
      : status.why === "quota"
        ? k.friendlyDone
        : status.why === "late"
          ? k.friendlyLate(status.closesAtHour)
          : status.phase === "none" || status.phase === "lobby"
            ? k.friendlyFew(status.minHumans)
            : k.friendlyAlone(status.minHumans, status.rankedLater);
  return { text, ranked: false };
}

/** The skirmish's bar: the lobby to join, the time left, the result; and the way back. */
export function SkirmishBar({
  status,
  now,
  onJoin,
  onLeave,
}: {
  status: SkirmishStatus | null;
  now: number;
  onJoin: () => void;
  onLeave: () => void;
}) {
  const k = fr.game.skirmish;
  const stake = status ? skirmishStake(status) : null;
  return (
    <div className="pointer-events-auto absolute inset-x-3 top-[calc(max(0.75rem,env(safe-area-inset-top))+11rem)] z-20 mx-auto max-w-sm space-y-2 cut border border-vermilion/60 bg-night p-3 text-sm shadow-lg lg:top-24">
      <div className="flex items-center justify-between gap-3">
        <span className="shrink-0 font-display font-extrabold uppercase text-vermilion">
          ⚔ {k.title}
        </span>
        <button
          type="button"
          className="label whitespace-nowrap text-right text-cream-dim"
          onClick={onLeave}
        >
          {k.leave}
        </button>
      </div>
      {status && status.phase !== "off" && status.interrupted && (
        <p className="cut border border-gold/50 bg-gold/10 px-2 py-1.5 text-xs text-gold">
          {k.interrupted}
        </p>
      )}
      {stake && (
        <p className={`text-xs font-semibold ${stake.ranked ? "text-gold" : "text-cream-dim"}`}>
          {stake.ranked ? "★ " : ""}
          {stake.text}
        </p>
      )}
      {!status || status.phase === "off" ? (
        <p className="meta">{k.off}</p>
      ) : status.phase === "night" ? (
        <p className="meta text-lagoon">{k.night(status.opensAtHour, status.closesAtHour)}</p>
      ) : status.phase === "none" ? (
        <>
          <p className="meta">{k.pitch(status.minutes)}</p>
          {status.nextCall && (
            <p className="meta text-gold">{k.nextCall(hourOf(status.nextCall))}</p>
          )}
          <Slab size="sm" className="w-full" onClick={onJoin}>
            {k.open}
          </Slab>
        </>
      ) : status.phase === "lobby" ? (
        <>
          {status.call && <p className="meta text-gold">{k.call(status.call)}</p>}
          <p className="meta">
            {k.lobby(status.humans, status.bots, clock(Math.max(0, status.opensAt - now)))}
          </p>
          {!status.joined && (
            <Slab size="sm" className="w-full" onClick={onJoin}>
              {k.join}
            </Slab>
          )}
        </>
      ) : status.phase === "playing" ? (
        <p className="meta">
          {status.playing ? k.playing(clock(Math.max(0, status.endsAt - now))) : k.watching}
        </p>
      ) : (
        <ol className="space-y-0.5">
          {(status.result ?? []).slice(0, 8).map((r, i) => (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: the ranks of a finished match
              key={i}
              className={`flex min-w-0 items-center gap-1 ${r.me ? "text-gold" : "text-cream-dim"}`}
            >
              <span className="shrink-0">{i + 1}.</span>
              <MerchantName pseudo={r.pseudo} bot={r.bot} fallback={k.someone} />
              <span className="shrink-0 whitespace-nowrap">
                · {k.cells(r.cells)}
                {r.glory > 0 && ` · +${r.glory} ${k.glory}`}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
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

/**
 * The week replayed from its start in about ten seconds, at the merchant's asking: the map as it
 * opened, then each cell taken, in their order.
 */
export function useWeekReplay(v: TerraView | null | undefined): {
  view: TerraView | null | undefined;
  start: () => void;
  /** Back to the map as it stands now. */
  stop: () => void;
  playing: boolean;
} {
  const [frame, setFrame] = useState<number[] | null>(null);
  const live = useRef(v);
  live.current = v;
  const timers = useRef<{
    tick?: ReturnType<typeof setInterval>;
    end?: ReturnType<typeof setTimeout>;
  }>({});
  const stop = useCallback(() => {
    clearInterval(timers.current.tick);
    clearTimeout(timers.current.end);
    setFrame(null);
  }, []);
  useEffect(() => stop, [stop]);
  const start = useCallback(() => {
    void gameApi
      .terraReplay()
      .then(({ replay }) => {
        const current = live.current;
        if (!replay || !current || replay.steps.length === 0) return;
        if (!replayFits(replay.initial, current.owner)) return;
        // The replay's holders, as the view numbers them.
        const at = replay.holders.map((h) =>
          current.holders.findIndex((x) => (h.id ? x.id === h.id : x.nation === h.nation)),
        );
        const holderOf = (k: number) => (k < 0 ? -1 : (at[k] ?? -1));
        const owner = replay.initial.map(holderOf);
        const steps = replay.steps;
        const frames = reducedMotion() ? 1 : 60;
        let i = 0;
        let f = 0;
        setFrame([...owner]);
        const id = setInterval(() => {
          f++;
          const until = Math.ceil((steps.length * f) / frames);
          for (; i < until; i++) {
            const [cell, holder] = steps[i] ?? [0, -1];
            owner[cell] = holderOf(holder);
          }
          setFrame([...owner]);
          if (f >= frames) {
            clearInterval(id);
            timers.current.end = setTimeout(() => setFrame(null), 1_500);
          }
        }, 160);
        timers.current.tick = id;
      })
      .catch(() => undefined);
  }, []);
  return { view: v && frame ? { ...v, owner: frame } : v, start, stop, playing: !!frame };
}

export interface TerraShapes {
  map: HexMap;
  land: boolean[];
  /** Each holder's outline, tone and place in the focus. */
  holders: {
    i: number;
    d: string;
    tone: string;
    focus: Focus;
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
  const me = v ? v.holders.findIndex((h) => h.me) : -1;
  // Who is at war with the merchant: their outline turns vermilion as soon as a front starts.
  const foes = v ? [...enemiesOf(v.fronts, me)].sort((a, b) => a - b).join(",") : "";
  // biome-ignore lint/correctness/useExhaustiveDependencies: `owners`, `ids` and `foes` are the map's identity.
  return useMemo(() => {
    if (!v) return null;
    const map: HexMap = v.map;
    const land = [...v.map.terrain].map((c) => c !== "w");
    const by = cellsByHolder(v.owner);
    const touching = neighbours(map, v.owner);
    const names = v.holders.map((h, i) => h.id ?? (h.milan ? (h.nation ?? "milan") : String(i)));
    const tone = tones(
      names,
      v.holders.map((_, i) => by.get(i)?.length ?? 0),
      touching,
    );
    const around = touching.get(me) ?? new Set<number>();
    const enemies = new Set(foes ? foes.split(",").map(Number) : []);
    const holders = [...by.entries()].map(([i, cells]) => {
      const h = v.holders[i] ?? { me: false, ally: false, milan: false };
      const focus = focusOf(h, i, cells.length, around, enemies);
      return { i, d: outline(map, cells), tone: tone[i] ?? P.cream, focus };
    });
    // Milan under everyone, the merchant over all.
    holders.sort((a, b) => FOCUS_ORDER[a.focus] - FOCUS_ORDER[b.focus]);
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
  }, [owners, ids, foes]);
}

/** "14:20", Paris time: when a front will reach a cell. */
const hour = (at: number) =>
  new Date(at).toLocaleTimeString(locale, {
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
  if (h.milan) return t().nations[h.nation ?? "milan"] ?? t().milan;
  return friendLabel(merchantLabel(h.pseudo, h.bot, t().someone), h.friend);
}

/** A fellow of the merchant's company is marked by a sign, not a colour (E2-8, E3-11). */
const friendLabel = (name: string, friend?: boolean) => (friend ? `${name} ✦` : name);

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
/** Drawn again only when the map, its shapes or the selected cell change (not each second). */
export const TerraOverlay = memo(function TerraOverlay({
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
  // The land's edges fade into the night (6 % of its width): no frame left on a wide screen.
  const xs = s.edges.map((e) => e.x);
  const ys = s.edges.map((e) => e.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const feather = (x1 - x0) * 0.06;
  return (
    <g mask="url(#terra-fade)">
      <defs>
        <filter id="terra-feather" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={feather / 2} />
        </filter>
        <mask id="terra-fade" maskUnits="userSpaceOnUse">
          <rect
            x={x0 - s.map.size + feather}
            y={y0 - s.map.size + feather}
            width={x1 - x0 + 2 * s.map.size - 2 * feather}
            height={y1 - y0 + 2 * s.map.size - 2 * feather}
            fill="white"
            filter="url(#terra-feather)"
          />
        </mask>
        <pattern
          id="terra-hatch"
          width="4"
          height="4"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="4" height="4" fill="#4A1E16" fillOpacity="0.3" />
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
        <g key={h.i}>
          {/* The merchant's own land: a dark halo outside its gold rim, read over any tone. */}
          {h.focus === "me" && (
            <path
              d={h.d}
              fill="none"
              stroke="#0B1626"
              strokeOpacity="0.85"
              strokeWidth="6"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
          <path
            d={h.d}
            fillRule="evenodd"
            strokeLinejoin="round"
            {...territoryLook(h, h.i === selectedHolder(v, cell))}
          />
        </g>
      ))}
      {/* Cells just taken flash and tint in, over a second. */}
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
        strokeOpacity={aiming ? 0.2 : 0.08}
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
      {cell !== null && (
        <path
          d={`M${hexCorners(s.map, cell)
            .map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`)
            .join("L")}Z`}
          fill={P.info}
          fillOpacity="0.2"
          stroke={P.info}
          strokeWidth="2"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {v.fronts.map((f) => {
        const from = frontFrom(v, s.map, f.owner, f.aim);
        if (!from) return null;
        const [x, y] = hexCenter(s.map, f.aim);
        const milan = v.holders[f.owner]?.milan;
        const color = f.mine ? P.gold : f.threat || milan ? P.vermilion : P.cream;
        const strong = f.mine || f.threat;
        return (
          <line
            key={f.id}
            x1={from[0]}
            y1={from[1]}
            x2={x}
            y2={y}
            stroke={color}
            strokeOpacity={strong ? 0.9 : milan ? 0.75 : 0.6}
            strokeWidth={strong ? 1.6 : 1.2}
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
});

function selectedHolder(v: TerraView, cell: number | null): number {
  return cell === null ? -2 : holderAt(v, cell);
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
    const id = setTimeout(() => setFresh([]), 1_400);
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

/**
 * Where the Terraferma opens: the merchant's own cells and four cells around them, so his
 * neighbours are in sight (none without a camp).
 */
export function terraFocus(v: TerraView, s: TerraShapes): { x: number; y: number }[] | null {
  const mine = v.owner.flatMap((o, cell) => (o === s.me && s.me >= 0 ? [cell] : []));
  if (mine.length === 0) return null;
  const pad = s.map.size * 4 * Math.sqrt(3);
  return mine.flatMap((cell) => {
    const [x, y] = hexCenter(s.map, cell);
    return [
      { x: x - pad, y: y - pad },
      { x: x + pad, y: y + pad },
    ];
  });
}

/** Which labels give way first on a crowded map (declutter.ts): the merchant's own never. */
const RANK: Record<Focus | "front" | "city" | "building", number> = {
  me: 0,
  front: 1,
  city: 2,
  ally: 3,
  enemy: 4,
  neighbour: 5,
  milan: 6,
  other: 7,
  faint: 8,
  building: 9,
};
/** From which zoom a land's label shows: the merchant's world first, the others closer. */
const TIER: Record<Focus, 0 | 1 | 2> = {
  me: 0,
  ally: 0,
  enemy: 0,
  neighbour: 0,
  milan: 0,
  other: 1,
  faint: 2,
};

/** How many cells a holder has. */
function cellsOf(v: TerraView, i: number): number {
  let n = 0;
  for (const o of v.owner) if (o === i) n++;
  return n;
}

/** A land's name and troops on the map, at a fixed size (MAP_TEXT), on the map's ink. */
function TerraLabel({
  name,
  troops,
  strong,
  big,
}: { name: string; troops: number; strong: boolean; big: boolean }) {
  return (
    <span
      data-map-label
      className={`pointer-events-none flex -translate-x-1/2 -translate-y-1/2 flex-col items-center leading-tight [text-shadow:0_1px_3px_rgb(0_0_0/0.95)] ${strong ? "" : "opacity-70"}`}
    >
      <span
        className="whitespace-nowrap font-display font-bold text-cream"
        style={{ fontSize: big ? MAP_TEXT.mine : MAP_TEXT.merchant }}
      >
        {name}
      </span>
      <span
        className="mt-0.5 rounded-full px-1.5 font-display font-extrabold tabular-nums text-cream"
        style={{ fontSize: MAP_TEXT.troops, background: `${MAP_TEXT.halo}CC` }}
      >
        {troops}
      </span>
    </span>
  );
}

export function terraMarkers(
  props: GameProps,
  v: TerraView,
  s: TerraShapes,
  select: (sel: Selection) => void,
): MapMarker[] {
  const cities = new Set(v.map.cities.map((c) => c.cell));
  const focusOfHolder = (i: number) => s.holders.find((x) => x.i === i)?.focus ?? "faint";
  const out: MapMarker[] = v.map.cities.map((c) => {
    const holder = holderAt(v, c.cell);
    const h = v.holders[holder];
    // A nation whose capital is this city: its house under the city's name, no label of its own.
    const house = h?.milan && h.capital === c.cell ? t().nationHouses[h.nation ?? ""] : undefined;
    return {
      key: `terra:${c.cell}`,
      priority: RANK.city,
      tier: 0,
      node: (
        <TerraCity
          code={c.code}
          name={props.names.city(c.code)}
          house={house}
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
    const focus = focusOfHolder(i);
    out.push({
      key: `terra:${cell}`,
      at: { x, y },
      priority: h.me ? 0 : RANK[focus] + 0.5,
      tier: h.me ? 0 : TIER[focus],
      node: (
        <WarCounter
          name={friendLabel(merchantLabel(h.pseudo, h.bot, t().someone), h.friend)}
          crest={h.crest ?? defaultCrest(h.id ?? String(i))}
          mine={h.me}
          tone={s.tone[i] ?? P.cream}
          share={h.me && v.me ? v.me.troops / Math.max(1, v.me.cap) : null}
          troops={h.me || !s.labels.some((l) => l.i === i) ? h.troops : null}
          threatened={h.me && threatened}
          small={
            !h.me &&
            !h.ally &&
            !["neighbour", "enemy"].includes(s.holders.find((x) => x.i === i)?.focus ?? "")
          }
          onTap={() => select({ kind: "terra", cell })}
        />
      ),
    });
  });
  // Each land's name and troops, at a fixed size (MAP_TEXT): never bigger than a city's name. The
  // merchant's own are on his camp; a nation's whose capital is a city, under the city's name.
  for (const l of s.labels) {
    const h = v.holders[l.i];
    if (!h || h.me) continue;
    if (h.milan && h.capital !== null && cities.has(h.capital)) continue;
    const focus = focusOfHolder(l.i);
    const big = cellsOf(v, l.i) >= 40;
    out.push({
      key: `label:${l.i}`,
      at: { x: l.x, y: l.y },
      priority: RANK[focus],
      tier: focus === "milan" && !big ? 1 : TIER[focus],
      node: (
        <TerraLabel
          name={holderName(v, l.i)}
          troops={h.troops}
          strong={focus !== "other" && focus !== "faint"}
          big={big}
        />
      ),
    });
  }
  // Quick signals: a bubble over the sender's camp, a target on its cell.
  v.signals.forEach((x, k) => {
    const cell = x.kind === "attack" ? x.cell : (v.holders[x.from]?.capital ?? null);
    if (cell === null) return;
    const [cx, cy] = hexCenter(s.map, cell);
    out.push({
      key: `signal:${k}:${x.at}`,
      at: { x: cx, y: cy },
      priority: RANK.front,
      node: (
        <span className="pointer-events-none -translate-x-1/2 -translate-y-[160%] animate-pop whitespace-nowrap rounded-full bg-night/90 px-2 py-0.5 text-xs text-cream ring-1 ring-info">
          {SIGNAL_GLYPH[x.kind]} {t().diplomacy.signals[x.kind]}
        </span>
      ),
    });
  });
  // The buildings: a small glyph on their cell, in their holder's tone.
  for (const b of v.buildings) {
    const [x, y] = hexCenter(s.map, b.cell);
    out.push({
      key: `building:${b.cell}`,
      at: { x, y },
      priority: RANK.building,
      tier: 1,
      node: (
        <button
          type="button"
          aria-label={t().buildings[b.kind] ?? b.kind}
          onClick={() => select({ kind: "terra", cell: b.cell })}
          className="marker-hit -translate-x-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-night/85 text-[0.6875rem] leading-none ring-1"
          style={{ color: s.tone[b.owner] ?? P.cream, borderColor: s.tone[b.owner] ?? P.cream }}
        >
          {BUILDING_GLYPH[b.kind] ?? "•"}
        </button>
      ),
    });
  }
  // Each front's strength and the time to its next cell, at the middle of its line and set off to
  // its side: never on the camp it leaves.
  for (const f of v.fronts) {
    if (!f.mine && !f.threat) continue;
    const next = f.takes[0];
    const from = frontFrom(v, s.map, f.owner, f.aim);
    const [ax, ay] = hexCenter(s.map, next?.cell ?? f.aim);
    let at = { x: ax, y: ay };
    if (from) {
      const dx = ax - from[0];
      const dy = ay - from[1];
      const len = Math.hypot(dx, dy) || 1;
      const side = s.map.size * 0.9;
      at = { x: (from[0] + ax) / 2 - (dy / len) * side, y: (from[1] + ay) / 2 + (dx / len) * side };
    }
    out.push({
      key: `front:${f.id}`,
      at,
      priority: RANK.front,
      tier: 0,
      node: (
        <div className="-mt-3 -translate-x-1/2">
          <button
            type="button"
            data-map-label
            onClick={() => select({ kind: "terra", cell: next?.cell ?? f.aim })}
            className={`marker-hit relative flex h-6 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-full px-2 font-display text-xs font-bold shadow-md shadow-black/40 ${f.mine ? "bg-gold text-ink" : "bg-vermilion text-cream"}`}
          >
            ⚔ {f.troops}
            {next && <span className="font-normal opacity-80">· {wait(next.at, props.now)}</span>}
            {next && (
              // How far toward its next cell, aimed ten seconds ahead and slid there.
              <span
                className="terra-progress absolute bottom-0 left-0 h-[3px] bg-night/45"
                style={{ width: `${frontProgress(v, f.against, next.at, props.now + 10_000)}%` }}
              />
            )}
          </button>
        </div>
      ),
    });
  }
  return out;
}

/** How far a front has gone toward its next cell (0 to 100) at `at`. */
function frontProgress(v: TerraView, against: number, nextAt: number, at: number): number {
  const minutes = against < 0 ? v.rules.neutralMinutes : v.rules.cellMinutes;
  const left = (nextAt - at) / (minutes * 60_000);
  return Math.round(Math.min(1, Math.max(0, 1 - left)) * 100);
}

function TerraCity({
  code,
  name,
  house,
  ring,
  onTap,
}: {
  code: string;
  name: string;
  /** The nation holding it from its capital: « MANTOUE · Gonzague ». */
  house?: string;
  ring: string | null;
  onTap: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={name}
      onClick={onTap}
      className="marker-hit relative -ml-6 -mt-6 flex h-12 w-12 items-center justify-center"
    >
      <span
        data-map-label
        className="marker-orb relative flex h-8 w-8 items-center justify-center rounded-full shadow-[0_4px_12px_rgb(0_0_0/0.55),inset_-3px_-4px_8px_rgb(0_0_0/0.3)]"
        style={{ ...orbStyle(code), boxShadow: ring ? `0 0 0 2px ${ring}` : undefined }}
      >
        <CityIcon code={code} className="h-6 w-6" />
      </span>
      <span
        data-map-label
        className="pointer-events-none absolute left-1/2 top-[calc(100%-8px)] -translate-x-1/2 whitespace-nowrap font-place text-xs font-bold uppercase tracking-wide text-cream/85 [text-shadow:0_1px_3px_rgb(0_0_0/0.95)]"
      >
        {name}
        {house && (
          <span className="font-semibold normal-case tracking-normal text-vermilion">
            {" "}
            · {house}
          </span>
        )}
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
        data-map-label
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
        {/* The others' crests as small discs: their charge read at 14 to 18 px. */}
        {mine ? (
          <Crest crest={crest} size={26} />
        ) : (
          <MiniCrest crest={crest} size={small ? 14 : 22} />
        )}
      </span>
      {mine ? (
        <span
          data-map-label
          className="pointer-events-none absolute left-1/2 top-[calc(100%-2px)] -translate-x-1/2 whitespace-nowrap font-display text-xs font-extrabold uppercase tracking-wider text-gold [text-shadow:0_1px_3px_rgb(0_0_0/0.9)]"
        >
          {name}
          {troops !== null && <span className="tabular-nums text-cream"> · {troops}</span>}
        </span>
      ) : (
        troops !== null && (
          <span
            data-map-label
            className="pointer-events-none absolute left-1/2 top-[calc(100%-3px)] -translate-x-1/2 whitespace-nowrap font-display text-xs font-extrabold tabular-nums text-cream [text-shadow:0_1px_3px_rgb(0_0_0/0.95)]"
          >
            {troops}
          </span>
        )
      )}
    </button>
  );
}

/** A time kept on one line when its sentence wraps (« 23 h 56 », never « 23 / h 56 »). */
const unbroken = (time: string) => time.replace(/ /g, "\u00a0");

/**
 * Under the purse on the right, two blocks at most (the owner's word of 24 October 2026: the top
 * right was unreadable): the troops, which open a card with the glory and the rank, and a plaque of
 * two lines, what presses and when the week ends. The skirmishes, the week's replay and the way
 * back onto the merchant's land are actions, at the thumb (TerraActions); the guide is the Help
 * door's.
 */
export function TerraHud({
  v,
  now,
  regions,
  folded = false,
}: {
  v: TerraView;
  now: number;
  /** The regions' names (the teams of a week in teams). */
  regions: { code: string; name: string }[];
  /** Under the skirmish's bar: the troops only, the week's plaque folded. */
  folded?: boolean;
}) {
  const me = v.me;
  const regionName = (code: string) =>
    fr.themeNames.region[code] ?? regions.find((r) => r.code === code)?.name ?? code;
  const [tip, setTip] = useTip();
  const { shown, leaving } = usePresence(tip, 120);
  return (
    // In the HUD's right column, under the purse and no wider: the name keeps its ten letters.
    <div className="flex min-w-0 max-w-full flex-col items-end gap-1 self-stretch">
      {me && (
        <span className="relative">
          <button
            type="button"
            data-hud="troops"
            aria-label={t().troopsTip.title}
            aria-expanded={tip === "troops"}
            onClick={() => setTip((k) => (k === "troops" ? null : "troops"))}
            className="pointer-events-auto flex min-h-11 items-center"
          >
            <span className="hud-orb relative flex h-9 items-center gap-1 overflow-hidden rounded-full pl-2 pr-2.5 text-cream">
              <span className="flex h-5 w-5 shrink-0 [&>svg]:h-5 [&>svg]:w-5">
                <Icon.troops />
              </span>
              <span className="whitespace-nowrap font-display text-sm font-extrabold tabular-nums">
                {t().troopsLine(me.troops, me.cap)}
              </span>
              {/* How full the troops are: a thread of light at the foot of the pill. */}
              <span
                className="absolute bottom-0 left-0 h-[3px] bg-lagoon transition-[width] duration-700"
                style={{ width: `${Math.min(100, (me.troops / Math.max(1, me.cap)) * 100)}%` }}
              />
            </span>
          </button>
          {shown === "troops" && (
            <HudTip
              leaving={leaving}
              onClose={() => setTip(null)}
              content={{
                title: t().troopsTip.title,
                tone: "lagoon",
                text: t().troopsTip.text,
                lines: [
                  { label: t().troopsTip.troops, value: t().troopsLine(me.troops, me.cap) },
                  {
                    label: t().troopsTip.recruit,
                    value: v.open
                      ? t().perHour(me.recruit.perHour)
                      : t().perHourAt(me.recruit.perHour, v.openHours.from),
                  },
                  { label: t().troopsTip.glory, value: me.glory, tone: "gold" },
                  { label: t().troopsTip.rank, value: t().troopsTip.rankOf(me.rank, v.players) },
                ],
              }}
            />
          )}
        </span>
      )}
      {!folded && <NotePlaque v={v} now={now} regionName={regionName} />}
    </div>
  );
}

/**
 * What presses on the Terraferma, on one line: the merchant out of the week, Milan riding against
 * him, the battle under way, the placing or the truce, the night, the battle to come. Null when
 * nothing does.
 */
function pressing(v: TerraView, now: number): { text: string; tone: string } | null {
  const me = v.me;
  if (v.closed) return null;
  if (me?.eliminatedAt != null) return { text: t().eliminated, tone: "text-vermilion" };
  const ride = v.fronts.find((f) => f.threat && v.holders[f.owner]?.milan);
  if (ride) return { text: t().milanOnMeShort(holderName(v, ride.owner)), tone: "text-vermilion" };
  if (v.battle?.on) return { text: t().battle.onShort(v.battle.to), tone: "text-vermilion" };
  if (v.placementEndsAt !== null && now < v.placementEndsAt)
    return { text: t().placingShort(unbroken(clock(v.placementEndsAt - now))), tone: "text-gold" };
  if (v.truceEndsAt !== null && now < v.truceEndsAt)
    return { text: t().truceShort(unbroken(clock(v.truceEndsAt - now))), tone: "text-gold" };
  if (!v.open) return { text: `☾ ${t().nightShort}`, tone: "text-lagoon" };
  if (v.battle) return { text: t().battle.atShort(v.battle.from), tone: "text-cream" };
  return null;
}

/**
 * The week on a dark plaque, two lines at most, legible over any land: what presses, then in
 * smaller writing the team (a week in teams) and when the week ends, giving way item by item.
 */
function NotePlaque({
  v,
  now,
  regionName,
}: {
  v: TerraView;
  now: number;
  regionName: (code: string) => string;
}) {
  const won = v.closed?.teams?.[0];
  const head = won
    ? { text: t().teamWonShort(regionName(won.team)), tone: "text-gold" }
    : pressing(v, now);
  const after = [
    v.rules.team ? t().teamShort(regionName(v.rules.team)) : null,
    v.closed ? t().closed : t().closesIn(unbroken(clock(v.closesAt - now))),
  ].filter((x): x is string => x !== null);
  return (
    <span
      data-hud="terra-note"
      // As wide as the column, never widening it: the purse sets it, the name keeps its letters.
      className="flex w-0 min-w-full flex-col items-end rounded-lg bg-night/85 px-2 py-1 text-right leading-snug ring-1 ring-line/70"
    >
      {head && <span className={`text-[0.8125rem] font-semibold ${head.tone}`}>{head.text}</span>}
      {/* One line high: what does not fit wraps out of sight, item by item. */}
      <span
        data-hud-meta
        className="flex h-[18px] flex-wrap justify-end gap-x-1.5 overflow-hidden text-[0.8125rem] leading-[18px] text-cream-dim tabular-nums"
      >
        {after.map((x, i) => (
          <span key={x} className="whitespace-nowrap">
            {i > 0 ? "· " : ""}
            {x}
          </span>
        ))}
      </span>
    </span>
  );
}

/**
 * The Terraferma's actions at the thumb, at the bottom right above the doors: the skirmishes and
 * the week's replay, each a sign and a word, hidden as the doors are while a panel is up.
 */
export function TerraActions({
  v,
  onSkirmish,
  onReplay,
  extra,
}: {
  v: TerraView;
  onSkirmish?: () => void;
  onReplay?: () => void;
  /** A round of the map's own (« Me centrer »). */
  extra?: ReactNode;
}) {
  return (
    // On a phone the round at the left, the chips at the right; on a computer side by side.
    <span className="flex w-full items-center justify-between gap-2 lg:w-auto lg:justify-end">
      <span className="flex">{extra}</span>
      {/* A larger text (the Profil's size) puts the second chip under the first, never off screen. */}
      <span className="flex min-w-0 flex-wrap items-center justify-end gap-2">
        {onSkirmish && (
          <HudChip
            hud="terra-skirmish"
            icon={<Icon.skirmish />}
            tone={v.open ? "vermilion" : "plain"}
            label={v.open ? fr.game.skirmish.title : fr.game.skirmish.nightShort(v.openHours.from)}
            onClick={onSkirmish}
          >
            {fr.game.skirmish.title}
          </HudChip>
        )}
        {onReplay && (
          <HudChip
            hud="terra-replay"
            icon={<Icon.week />}
            label={fr.game.terraRecord.replay}
            onClick={onReplay}
          >
            {/* Under 360 px its sign alone: the three hold on the narrowest phone. */}
            <span className="max-[359px]:sr-only">{fr.game.terraRecord.weekShort}</span>
          </HudChip>
        )}
      </span>
    </span>
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
          <span className="rounded-full bg-night/90 px-4 py-2 font-display text-[0.8125rem] font-extrabold uppercase tracking-wide text-cream ring-1 ring-line shadow-[0_6px_20px_rgb(0_0_0/0.45)]">
            {me ? t().out.eliminated : t().out.late}
          </span>
          <span className="font-mono text-xs uppercase tracking-[0.1em] text-cream-dim [text-shadow:0_1px_3px_rgb(0_0_0/0.9)]">
            {t().out.next(clock(v.closesAt - now))}
          </span>
        </div>
      );
    }
    if (me) return <Returns v={v} />;
    // A skirmish sets everyone down itself: a spectator only watches.
    if (v.skirmish) return null;
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-[calc(max(1rem,env(safe-area-inset-bottom))+5.25rem)] z-10 flex flex-col items-center gap-1 lg:bottom-28">
        <span className="slab whitespace-nowrap bg-gold px-4 py-2 font-display text-[0.8125rem] font-extrabold uppercase tracking-wide text-ink shadow-[0_6px_20px_rgb(0_0_0/0.45)]">
          {t().place.invite}
        </span>
        <span className="meta [text-shadow:0_1px_3px_rgb(0_0_0/0.9)]">
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
            ? t().place.line(terrain, v.placementEndsAt !== null ? null : safeHours(v, now))
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
        chip={<span className="meta">{t().glory(me.glory, me.rank)}</span>}
        status={t().mine.line(me.cells, me.troops, me.cap)}
        progress={me.troops / Math.max(1, me.cap)}
        tone={v.fronts.some((f) => f.threat) ? "vermilion" : "gold"}
        onClose={close}
        actions={
          v.skirmish ? undefined : (
            <>
              <ActionButton
                icon={Icon.upgrade()}
                label={t().mine.raise(v.rules.capRaise)}
                tone="gold"
                badge={me.raisesLeft > 0 ? d(v.rules.prices.cap) : undefined}
                disabled={me.raisesLeft === 0 || !!v.closed}
                onClick={() => act({ type: "terraRaise" })}
              />
              {v.rules.prices.porto !== null && coastalCell(v, cell) && (
                <ActionButton
                  icon={Icon.build()}
                  label={t().mine.porto}
                  badge={built ? undefined : d(v.rules.prices.porto)}
                  disabled={!!built || !!v.closed}
                  onClick={() => act({ type: "terraBuild", cell, kind: "porto" })}
                />
              )}
              {(["bombarda", "mura"] as const).map((kind) =>
                v.rules.prices[kind] !== null ? (
                  <ActionButton
                    key={kind}
                    icon={Icon.build()}
                    label={t().buildings[kind] ?? kind}
                    badge={built ? undefined : d(v.rules.prices[kind])}
                    disabled={!!built || !!v.closed}
                    onClick={() => act({ type: "terraBuild", cell, kind })}
                  />
                ) : null,
              )}
              <ActionButton
                icon={Icon.build()}
                label={t().mine.rocca}
                badge={built ? undefined : d(v.rules.prices.rocca)}
                disabled={!!built || !!v.closed}
                onClick={() => act({ type: "terraBuild", cell, kind: "rocca" })}
              />
              <ActionButton
                icon={Icon.decree()}
                label={t().mine.decree}
                tone={me.programme ? "plain" : "gold"}
                onClick={() => props.setSheet("terra:decree")}
              />
            </>
          )
        }
        extra={
          <div className="space-y-1.5 text-[0.75rem] text-cream-dim">
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
            {v.rules.peasants && <PeasantsSlider v={v} props={props} act={act} />}
            {v.rules.diplomacy && (
              <p className="flex flex-wrap gap-1.5">
                {(["help", "thanks", "peace"] as const).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    className="label inline-flex min-h-11 items-center rounded-full px-3 text-cream ring-1 ring-inset ring-line"
                    onClick={() => act({ type: "terraSignal", kind })}
                  >
                    {SIGNAL_GLYPH[kind]} {t().diplomacy.signals[kind]}
                  </button>
                ))}
              </p>
            )}
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
                  className="hit label shrink-0 rounded-full px-2.5 py-1 text-cream ring-1 ring-inset ring-line"
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
  // A shore beyond the water, reached by boat from one of the merchant's ports.
  const sea = v.costs[String(cell)] === undefined ? me.sea[String(cell)] : undefined;
  const cost = v.costs[String(cell)] ?? sea?.cost;
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

  const allyButton = merchant && !ally && !v.skirmish && (
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
      chip={
        ally ? (
          <span className="label text-lagoon">{t().holder.allyChip}</span>
        ) : merchant?.friend ? (
          <span className="label text-gold">{t().holder.friendChip}</span>
        ) : (
          chip
        )
      }
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
              label={sea ? t().target.sail(sea.minutes) : t().target.attack}
              tone="gold"
              disabled={cells === 0}
              onClick={async () => {
                haptic("tap");
                await act(
                  sea
                    ? { type: "terraSail", aim: cell, shareBps }
                    : { type: "terraFront", aim: cell, shareBps },
                );
              }}
            />
          )}
          {me.bombard.cells.includes(cell) && (
            <ActionButton
              icon={Icon.bandits()}
              label={t().target.fire(me.bombard.shots)}
              tone="plain"
              onClick={async () => {
                haptic("tap");
                await act({ type: "terraFire", cell });
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
          {merchant && !ally && v.rules.diplomacy && me.holdsCity && (
            <ActionButton
              icon={Icon.cross()}
              label={me.embargo === holder ? t().diplomacy.lift : t().diplomacy.embargo}
              tone="plain"
              disabled={!!v.closed}
              onClick={() =>
                act({
                  type: "terraEmbargo",
                  target: me.embargo === holder ? null : (merchant.id as string),
                })
              }
            />
          )}
          {v.rules.diplomacy && me.allies.length > 0 && !ally && holder !== -2 && (
            <ActionButton
              icon={Icon.bandits()}
              label={t().diplomacy.target}
              tone="plain"
              disabled={!!v.closed}
              onClick={() => act({ type: "terraSignal", kind: "attack", cell })}
            />
          )}
          {merchant && ally && (
            <>
              <ActionButton
                icon={Icon.send()}
                label={t().holder.send}
                tone="plain"
                disabled={gift <= 0 || !!v.closed}
                onClick={() => act({ type: "terraSend", to: merchant.id as string, count: gift })}
              />
              {v.rules.diplomacy && BigInt(me.ducatsLeft) >= 1_000n && (
                <ActionButton
                  icon={Icon.send()}
                  label={t().diplomacy.give(d(1_000n))}
                  tone="plain"
                  disabled={!!v.closed}
                  onClick={() =>
                    act({ type: "terraGift", to: merchant.id as string, amount: "1000" })
                  }
                />
              )}
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
              className={`text-center font-sans text-xs ${cells === 0 ? "text-vermilion" : "text-cream"}`}
            >
              {cells === 0
                ? me.troops >= (cost ?? 0)
                  ? t().target.tooWeak(cost ?? 0)
                  : t().target.notEnough(cost ?? 0, me.troops)
                : t().target.plan(troops, cells, cells * (cost ?? 0), troops - cells * (cost ?? 0))}
            </p>
            {cells > 0 && (
              <p className="text-center font-sans text-xs text-cream-dim">
                {t().target.pace(
                  Math.ceil(
                    (cells * (holder < 0 ? v.rules.neutralMinutes : v.rules.cellMinutes)) / 60,
                  ),
                  !v.open,
                )}
              </p>
            )}
            {/* The first attack on a merchant gives up the capital's safety. */}
            {merchant && v.rules.peacefulSafe && !me.aggressor && (
              <p className="text-center font-sans text-xs text-vermilion">
                {t().target.losesSafety}
              </p>
            )}
            {/* Against a merchant only, and when it changes something: what stays home. */}
            {cells > 0 && merchant && density(me.troops - troops) < density(me.troops) && (
              <p className="text-center font-sans text-xs text-cream-dim">
                {t().target.defense(density(me.troops - troops), density(me.troops))}
              </p>
            )}
          </div>
        ) : merchant && ally ? (
          <p className="text-center font-sans text-xs text-cream-dim">
            {t().holder.sendLine(gift, me.giftsLeft)}
          </p>
        ) : undefined
      }
    />
  );
}

/**
 * The merchant's fronts come home since the last look: what each took, spent and brought back,
 * one line each, in a short card above the doors. Left unread, it folds after a few seconds into
 * a pill (« ↩ 2 ») that opens it again; « Compris » puts it away.
 */
function Returns({ v }: { v: TerraView }) {
  const key = `terraReturnsSeen:${v.week}`;
  const [seen, setSeen] = useState(() => Number(store.get(key) ?? 0));
  const [folded, setFolded] = useState(false);
  const fresh = (v.me?.returns ?? []).filter((r) => r.at > seen).slice(-2);
  const last = fresh.at(-1)?.at ?? 0;
  useEffect(() => {
    if (last === 0 || folded) return;
    const id = setTimeout(() => setFolded(true), 8_000);
    return () => clearTimeout(id);
  }, [last, folded]);
  if (fresh.length === 0) return null;
  // Above the doors and the actions at the thumb.
  const place =
    "absolute bottom-[calc(max(1rem,env(safe-area-inset-bottom))+9.5rem)] z-10 lg:bottom-28";
  if (folded)
    return (
      <button
        type="button"
        data-hud-overlay="terra-returns"
        aria-label={t().returns.title}
        onClick={() => setFolded(false)}
        className={`${place} left-3 flex min-h-11 items-center gap-1.5 rounded-full bg-night-2/95 px-4 font-display text-sm font-extrabold text-gold ring-1 ring-line`}
      >
        ↩ {fresh.length}
      </button>
    );
  return (
    <div
      // Over the map, a moment: it may cover a name there, never the HUD.
      data-hud-overlay="terra-returns"
      className={`${place} inset-x-3 mx-auto max-w-sm cut bg-night-2/95 px-3 py-2 shadow-[0_6px_20px_rgb(0_0_0/0.45)] ring-1 ring-line`}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="label text-gold">{t().returns.title}</p>
          {fresh.map((r) => (
            <p key={r.front} className="text-[0.8125rem] leading-snug text-cream">
              {t().returns.line(holderName(v, r.against), r.cells, r.spent, r.back)}
            </p>
          ))}
        </div>
        <button
          type="button"
          className="label min-h-11 shrink-0 rounded-full px-3 text-cream ring-1 ring-inset ring-line"
          onClick={() => {
            store.set(key, String(last));
            setSeen(last);
          }}
        >
          {t().returns.ok}
        </button>
      </div>
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
      ? props.catalog.resources.map((r) => ({ value: r.code, label: props.names.resource(r.code) }))
      : kind === "city"
        ? props.catalog.cities.map((c) => ({ value: c.code, label: props.names.city(c.code) }))
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
            {v.decree.mine && <p className="text-[0.75rem] text-gold">{t().decree.yours}</p>}
          </div>
        )}
        <div>
          <h2 className="font-display text-lg font-extrabold uppercase tracking-wide">
            {t().decree.title}
          </h2>
          <p className="mt-1 text-[0.8125rem] text-cream-dim">{t().decree.hint}</p>
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
                <span className="font-display text-[0.875rem] font-extrabold">
                  {t().decree.names[c] ?? c}
                </span>
                {picked?.code === c && <span className="label text-gold">{t().decree.chosen}</span>}
              </span>
              <span className="mt-0.5 block text-[0.75rem] text-cream-dim">
                {t().decree.texts[c]}
              </span>
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

/**
 * Soldiers or peasants: the merchant's people under arms recruit, those on the land grow its
 * goods for the counter and keep the city routes; a slider, sent when let go.
 */
function PeasantsSlider({
  v,
  props,
  act,
}: {
  v: TerraView;
  props: GameProps;
  act: (a: TerraAction) => Promise<boolean>;
}) {
  const me = v.me;
  const [bps, setBps] = useState(me?.peasantsBps ?? 5_000);
  useEffect(() => setBps(me?.peasantsBps ?? 5_000), [me?.peasantsBps]);
  if (!me) return null;
  const goods = Object.entries(me.yields.goods)
    .filter(([, n]) => n > 0)
    .map(
      ([r, n]) =>
        `${(n / 100).toLocaleString(locale, { maximumFractionDigits: 1 })} ${props.names.resource(r).toLowerCase()}`,
    )
    .join(", ");
  const send = () => {
    if (bps !== me.peasantsBps) void act({ type: "terraPeasants", shareBps: bps });
  };
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between font-sans text-xs">
        <span className="text-vermilion">
          ⚔ {t().peasants.soldiers(100 - Math.round(bps / 100))}
        </span>
        <span className="text-lagoon">{t().peasants.peasants(Math.round(bps / 100))} ✿</span>
      </div>
      <input
        type="range"
        min={0}
        max={10_000}
        step={1_000}
        value={bps}
        onChange={(e) => setBps(Number(e.target.value))}
        onPointerUp={send}
        onKeyUp={send}
        onBlur={send}
        aria-label={t().peasants.label}
        className="w-full accent-lagoon"
      />
      <p>
        {t().peasants.yield(
          goods || t().peasants.nothing,
          BigInt(me.yields.route) > 0n ? d(me.yields.route) : null,
        )}
      </p>
    </div>
  );
}

/**
 * The first visit to the Terraferma: Lorenzo says, in three bubbles, how to set down, launch a
 * front and come back; the guide is a touch away. Once on this device.
 */
export function TerraIntro({ onGuide, top }: { onGuide: () => void; top: number }) {
  const k = fr.game.terraIntro;
  const [step, setStep] = useState(() => {
    try {
      return store.get("terraIntroSeen") === "1" ? -1 : 0;
    } catch {
      return 0;
    }
  });
  if (step < 0) return null;
  const done = () => {
    store.set("terraIntroSeen", "1");
    setStep(-1);
  };
  const last = step >= k.steps.length - 1;
  return (
    // Under the HUD's band, the land where the camp is set down left free below.
    <div
      data-panel
      style={{ top: top + 8 }}
      className="pointer-events-auto absolute inset-x-3 z-30 mx-auto max-w-sm animate-pop"
    >
      <LorenzoCard
        portrait={<Lorenzo size={40} />}
        name={k.who}
        aside={`${step + 1}/${k.steps.length}`}
        foot={
          <div className="mt-2 flex items-center justify-between gap-2">
            <Slab
              tone="text"
              size="sm"
              className="-ml-2"
              onClick={() => {
                done();
                onGuide();
              }}
            >
              {k.guide}
            </Slab>
            <Slab size="sm" tone="ghost" onClick={() => (last ? done() : setStep(step + 1))}>
              {last ? k.done : k.next}
            </Slab>
          </div>
        }
      >
        <p className="mt-1 text-sm leading-snug">{k.steps[step]}</p>
      </LorenzoCard>
    </div>
  );
}
