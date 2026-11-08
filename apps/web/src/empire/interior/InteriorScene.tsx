import { Canvas } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import { Group, type OrthographicCamera, Vector3 } from "three";
import { PlainGround } from "../../dock.js";
import { fr } from "../../i18n.js";
import { PlaceCard } from "../../porcellana/PlaceCard.js";
import "../../porcellana/porcellana.css";
import {
  type Cell,
  type Shared,
  type Spec,
  TileBoard,
  palette,
} from "../../porcellana/TileBoard.js";
import { crateMover, floor, pillar, walls } from "../../porcellana/models/interior.js";
import type { Built, ModelOpts } from "../../porcellana/models/model.js";
import { doorPile, stationModel } from "../../porcellana/models/stations.js";
import { BOARD } from "../../porcellana/tokens.js";
import { CloseButton } from "../../ui.js";
import { clock } from "../../ui.js";
import { buildingName, recipeOf, workshopStatus } from "../logic.js";
import { perHour } from "../map/WorkshopDock.js";
import { Guard3D } from "../map3d/Guard.js";
import { MAP_3D } from "../map3d/flag.js";
import { useCoverBoard } from "../map3d/pause.js";
import type { EmpireAction, EmpirePayload } from "../types.js";
import { StationPanel } from "./StationPanel.js";
import { type Cellish, interiorBoard } from "./board.js";
import { advise, moveSpots, placeSpots, settingsOf, unitsOf, workshopOf } from "./reckon.js";

const t = () => fr.empire.interior;
const S = BOARD.tile + BOARD.gap;

/**
 * The inside of a workshop (docs/plan-ateliers.md § 7, lots A5 and A6): its hall of porcelain
 * flagstones walled on the far sides, its stations each on its footprint with its hands, the red
 * ribbons and the crates going along them from the door of the inputs to the door of the goods,
 * the bottleneck ringed in red, each station's rate on its pin. A scene of its own over the map,
 * as the Porta's. The gestures: a station touched opens its panel (upgrade, mend, move, turn, care,
 * hands); to move it, or to put a new one from the drawer, each flagstone where it could stand
 * shows what the workshop would make with it there, reckoned on the screen with the engine's own
 * function; Lorenzo's « Plan conseillé » makes the one move that betters it most.
 */
export function InteriorScene({
  p,
  workshopId,
  now,
  busy,
  act,
  onClose,
}: {
  p: EmpirePayload;
  workshopId: string;
  now: number;
  busy: boolean;
  act: (a: EmpireAction) => Promise<unknown>;
  onClose: () => void;
}) {
  const v = p.view;
  const ws = v?.house.workshops.find((w) => w.id === workshopId);
  const inside = v?.interiors?.[workshopId];
  useCoverBoard(!!inside);
  const [chosen, setChosen] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>(null);
  const [drawer, setDrawer] = useState(false);
  const sh = useRef<Shared>({
    chosen: null,
    hover: null,
    running: true,
    goTo: null,
    pins: new Map(),
    card: null,
    target: new Vector3(),
    points: new Map(),
  }).current;
  sh.chosen = mode ? null : chosen;

  // The workshop's goods an hour, at its inside's pace: the figure the pins speak in.
  const r = ws ? recipeOf(p, ws) : undefined;
  const [good, qty] = Object.entries(r?.outputs ?? {})[0] ?? ["", 0];
  const yieldBps = (ws && v?.upgrades[ws.id]?.yieldBps) || 10_000;
  const pace = inside?.paceBps ?? 10_000;
  const goodsPerHour = r ? (perHour(qty, yieldBps, r.minutes) * pace) / 10_000 : 0;
  const minute = Math.floor(now / 60_000);
  // biome-ignore lint/correctness/useExhaustiveDependencies: read again each minute at most.
  const board = useMemo(
    () => (inside ? interiorBoard(inside, v?.interiorRules, goodsPerHour, now) : null),
    [inside, v?.interiorRules, goodsPerHour, minute],
  );
  const running = !!ws?.job;
  sh.running = running;
  const spec = useMemo(() => (board ? specOf(board, running) : null), [board, running]);

  // The screen's own reckoning: where a station may stand, and what the workshop would make then.
  const rules = v?.interiorRules;
  const engine = useMemo(() => (rules ? settingsOf(rules) : null), [rules]);
  const model = useMemo(
    () => (ws && inside ? workshopOf(ws.id, ws.type, ws.level, inside) : null),
    [ws, inside],
  );
  const base = model && engine ? unitsOf(model, engine, now) : 0;
  // biome-ignore lint/correctness/useExhaustiveDependencies: reckoned again with the mode and the inside.
  const spots = useMemo(() => {
    if (!mode || !model || !engine || !inside) return [];
    return mode.kind === "move"
      ? moveSpots(model, engine, mode.id, inside.hall, now)
      : placeSpots(model, engine, mode.id, inside.hall, now);
  }, [mode, model, engine, inside, minute]);
  // Lorenzo's advice, reckoned again when the inside changes (a few thousand rates at most).
  // biome-ignore lint/correctness/useExhaustiveDependencies: again each minute at most.
  const advice = useMemo(
    () => (model && engine && inside ? advise(model, engine, inside.hall, now) : null),
    [model, engine, inside, minute],
  );
  const perUnit = base > 0 ? goodsPerHour / (base / 1000) : 0;
  const spotLabel = (units: number) => {
    const d = ((units - base) / 1000) * perUnit;
    if (Math.abs(d) < 0.05) return t().same;
    return t().delta((Math.round(Math.abs(d) * 10) / 10).toLocaleString("fr-FR"), d > 0);
  };
  sh.points = new Map(spots.map((x) => [`spot:${x.x},${x.y}`, [x.x, x.y] as [number, number]]));

  if (!v || !ws || !inside || !board || !spec) return null;
  const places = board.places;
  const current = places.find((x) => x.id === chosen);
  const station = chosen?.startsWith("st:") ? chosen.slice(3) : null;
  const gain = Math.round((pace - 10_000) / 100);
  const quality = Math.min(3, Math.round(inside.rate.qualityBps / 3_334));
  const kinds = [...new Set(inside.kinds.map((k) => k.kind))];
  const status = workshopStatus(p, ws, now);
  const up = v.upgrades[ws.id] ?? null;
  const enlarging = v.house.builds.find((b) => b.workshopId === ws.id && b.kind === "upgrade") as
    | { endsAt: number }
    | undefined;
  const pick = async (x: number, y: number) => {
    if (!mode) return;
    const m = mode;
    setMode(null);
    if (m.kind === "move") {
      const st = inside.stations.find((s2) => s2.id === m.id);
      if (st)
        await act({ type: "empireInteriorMove", workshopId, stationId: st.id, x, y, rot: st.rot });
    } else await act({ type: "empireInteriorPlace", workshopId, kind: m.id, x, y, rot: 0 });
  };
  return (
    <div
      className="porcellana fixed inset-x-0 top-0 bottom-[var(--places)] z-40 overflow-hidden bg-[#E9E6E0] lg:top-[var(--topbar,0px)]"
      data-interior-scene={workshopId}
    >
      {MAP_3D ? (
        <Guard3D>
          <Canvas
            orthographic
            dpr={window.innerWidth < 640 ? [1, 1.5] : [1, 2]}
            gl={{ antialias: true, powerPreference: "high-performance" }}
            onCreated={({ camera }) => {
              (camera as OrthographicCamera & { manual?: boolean }).manual = true;
            }}
            onPointerMissed={() => setChosen(null)}
          >
            <TileBoard spec={spec} sh={sh} onPick={(id) => !mode && setChosen(id)} />
          </Canvas>
        </Guard3D>
      ) : (
        <PlainGround />
      )}
      <div className={`pc-pins ${MAP_3D ? "" : "hidden"}`}>
        {(mode ? [] : places).map((x) => (
          <button
            key={x.id}
            type="button"
            className="pc-pin"
            data-out="false"
            data-on={String(x.id === chosen)}
            data-tag="true"
            data-hot={x.hot ? "true" : undefined}
            data-interior-pin={x.id}
            aria-label={`${x.info.name} · ${x.label}`}
            ref={(el) => {
              if (el) sh.pins.set(x.id, el);
              else sh.pins.delete(x.id);
            }}
            onClick={() => setChosen(x.id)}
          >
            {x.label}
          </button>
        ))}
        {spots.map((x) => {
          const key = `spot:${x.x},${x.y}`;
          const better = x.units > base;
          return (
            <button
              key={key}
              type="button"
              className="pc-pin"
              data-out="false"
              data-tag="true"
              data-hot={better ? "true" : undefined}
              data-interior-spot={`${x.x},${x.y}`}
              data-better={String(better)}
              disabled={busy}
              ref={(el) => {
                if (el) sh.pins.set(key, el);
                else sh.pins.delete(key);
              }}
              onClick={() => void pick(x.x, x.y)}
            >
              {spotLabel(x.units)}
            </button>
          );
        })}
      </div>
      <div className="pointer-events-none absolute left-4 top-4 max-w-[calc(100vw-6rem)] rounded-[1.75rem] bg-white px-5 py-4 shadow-[0_4px_0_rgb(23_21_15/0.07),0_14px_40px_rgb(23_21_15/0.1)]">
        <p className="text-xs font-bold text-[#625D55]" data-interior-head>
          {buildingName(p, ws.type)} · {t().level(ws.level)}
        </p>
        <p className="mt-0.5 font-display text-4xl font-black leading-none text-[#17150F]">
          <span data-interior-rate>
            {(Math.round(goodsPerHour * 10) / 10).toLocaleString("fr-FR")}
          </span>
          <span className="ml-1 text-base font-bold text-[#625D55]">
            {t().goodsPerHour(p.goods[good] ?? good)}
          </span>
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-3">
          <span className="flex gap-1" role="img" aria-label={t().quality(quality)}>
            {[0, 1, 2].map((k) => (
              <span
                key={k}
                className="h-3 w-3 rotate-45 rounded-[2px]"
                style={{
                  background: k < quality ? "#C23B2E" : "transparent",
                  boxShadow: k < quality ? "none" : "inset 0 0 0 2px #DDD7CD",
                }}
              />
            ))}
          </span>
          <span
            className="rounded-full bg-[#EDE8E0] px-2.5 py-1 text-[0.6875rem] font-bold text-[#625D55]"
            data-interior-gain={gain}
          >
            {t().gain(gain)}
          </span>
          {inside.inputsSaveBps > 0 && Object.keys(r?.inputs ?? {}).length > 0 ? (
            <span
              className="rounded-full bg-[#EDE8E0] px-2.5 py-1 text-[0.6875rem] font-bold text-[#625D55]"
              data-interior-saves
            >
              {t().saves(Math.round(inside.inputsSaveBps / 100))}
            </span>
          ) : null}
          {inside.legacyBps > 0 ? (
            <span
              className="rounded-full bg-[#EDE8E0] px-2.5 py-1 text-[0.6875rem] font-bold text-[#625D55]"
              data-interior-acquis
            >
              {t().acquis(Math.round(inside.legacyBps / 100))}
            </span>
          ) : null}
        </div>
        {/* The hall grows with the workshop's level: its site from here. */}
        {enlarging ? (
          <p className="mt-2 text-[0.6875rem] font-bold text-[#625D55]" data-interior-enlarging>
            {t().enlarging(clock(enlarging.endsAt - now))}
          </p>
        ) : up ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void act({ type: "empireUpgrade", workshopId })}
            className="pointer-events-auto mt-2 min-h-11 rounded-full bg-[#EDE8E0] px-4 text-xs font-extrabold text-[#17150F] disabled:opacity-40"
            data-interior-enlarge
          >
            {t().enlarge(up.level, String(Math.round(Number(up.cost) / 100)))}
          </button>
        ) : null}
      </div>
      <CloseButton onClick={onClose} className="absolute right-4 top-4 !bg-white !text-[#17150F]" />
      {mode ? (
        <div className="absolute inset-x-3 bottom-3 flex items-center gap-3 rounded-full bg-[#17150F] py-2 pl-5 pr-2 text-sm text-white lg:inset-x-auto lg:left-1/2 lg:-translate-x-1/2">
          <span className="min-w-0 flex-1">{t().pick}</span>
          <button
            type="button"
            onClick={() => setMode(null)}
            className="min-h-11 shrink-0 rounded-full bg-white/10 px-4 font-display font-extrabold"
            data-interior-cancel
          >
            {t().cancel}
          </button>
        </div>
      ) : station ? (
        <StationPanel
          workshopId={workshopId}
          stationId={station}
          v={inside}
          rules={rules}
          busy={busy}
          now={now}
          act={act}
          onMove={() => {
            setMode({ kind: "move", id: station });
            setChosen(null);
          }}
          onClose={() => setChosen(null)}
        />
      ) : current ? (
        <PlaceCard
          ref={(h) => {
            sh.card = h;
          }}
          info={current.info}
          onGo={() => setChosen(null)}
          onClose={() => setChosen(null)}
        />
      ) : drawer ? (
        <div
          className="absolute inset-x-3 bottom-3 rounded-[1.75rem] bg-white p-3 shadow-[0_4px_0_rgb(23_21_15/0.07),0_14px_40px_rgb(23_21_15/0.12)] lg:inset-x-auto lg:left-1/2 lg:w-[40rem] lg:-translate-x-1/2"
          data-interior-drawer
        >
          <div className="flex items-center justify-between px-2 pb-2">
            <p className="font-display text-sm font-extrabold text-[#17150F]">{t().drawer}</p>
            <button
              type="button"
              onClick={() => setDrawer(false)}
              aria-label={t().drawerClose}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EDE8E0] text-[#17150F]"
            >
              ×
            </button>
          </div>
          <ul className="flex gap-2 overflow-x-auto pb-1">
            {kinds.map((k) => {
              const def = rules?.stations[k];
              return (
                <li key={k} className="shrink-0">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setDrawer(false);
                      setMode({ kind: "place", id: k });
                    }}
                    data-interior-kind={k}
                    className="flex w-28 flex-col items-center gap-1 rounded-[1.25rem] bg-[#F6F4F0] px-2 py-3 text-center disabled:opacity-40"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white font-display text-xs font-black text-[#C23B2E] shadow-[0_2px_0_rgb(23_21_15/0.08)]">
                      {def ? t().size(def.size[0], def.size[1]) : ""}
                    </span>
                    <span className="text-xs font-bold leading-tight text-[#17150F]">
                      {t().stations[k] ?? k}
                    </span>
                    <span className="text-[0.6875rem] text-[#625D55]">
                      {def?.levels[0]?.costDucats ?? "?"} d
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="absolute inset-x-3 bottom-3 flex flex-wrap justify-center gap-2 lg:inset-x-auto lg:left-1/2 lg:-translate-x-1/2">
          {status.state === "ready" || status.state === "idle" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void act({ type: "empireRelaunch", workshopId })}
              className="min-h-11 w-full rounded-full bg-[#C23B2E] px-5 font-display text-sm font-extrabold text-white shadow-[0_3px_0_#8f2820] disabled:opacity-40 sm:w-auto"
              data-interior-relaunch={status.state}
            >
              {status.state === "ready"
                ? fr.empire.dock.collect(status.quantity, p.goods[status.good] ?? status.good)
                : fr.empire.dock.relaunch}
            </button>
          ) : status.state === "running" ? (
            <span
              className="flex min-h-11 w-full items-center justify-center rounded-full bg-white/80 px-5 text-xs font-bold text-[#625D55] sm:w-auto"
              data-interior-running
            >
              {fr.empire.dock.running(clock(status.left))}
            </span>
          ) : (
            <span
              className="flex min-h-11 w-full items-center justify-center rounded-full bg-white/80 px-5 text-xs font-bold text-[#625D55] sm:w-auto"
              data-interior-blocked
            >
              {status.state === "full"
                ? fr.empire.orbit.full(p.goods[status.good] ?? status.good)
                : fr.empire.dock.waits(p.goods[status.resource] ?? status.resource)}
            </span>
          )}
          <button
            type="button"
            onClick={() => setDrawer(true)}
            className="min-h-11 rounded-full bg-white px-5 font-display text-sm font-extrabold text-[#17150F] shadow-[0_3px_0_rgb(23_21_15/0.12)]"
            data-interior-open-drawer
          >
            {t().drawer}
          </button>
          <button
            type="button"
            disabled={busy || !advice}
            onClick={() =>
              advice &&
              void act({
                type: "empireInteriorMove",
                workshopId,
                stationId: advice.stationId,
                x: advice.x,
                y: advice.y,
                rot: advice.rot,
              })
            }
            className="min-h-11 rounded-full bg-[#C23B2E] px-5 font-display text-sm font-extrabold text-white shadow-[0_3px_0_#8f2820] disabled:bg-[#B5AEA5] disabled:shadow-none"
            data-interior-advice
          >
            {advice ? t().advice : t().adviceNone}
          </button>
        </div>
      )}
    </div>
  );
}

/** What the screen is choosing a flagstone for: a station to move, or a kind to put. */
type Mode = { kind: "move" | "place"; id: string } | null;

/** The board's spec for the tiles: each flagstone with its walls, its station or its dressing. */
function specOf(board: ReturnType<typeof interiorBoard>, running: boolean): Spec {
  const P = palette(false);
  const byTile = new Map(board.places.map((x) => [`${x.at[0]},${x.at[1]}`, x]));
  const span = (board.w + board.h) * S * 0.71;
  return {
    rows: board.cells.map((row, j) => row.map((_, i) => `${i},${j}`)),
    routes: board.routes,
    mover: crateMover,
    noCarts: !running,
    viewH: (a) => (a >= 1 ? Math.max(0.78 * span, (1.25 * span) / a) : (1.05 * span) / a),
    cell(_key, i, j): Cell | null {
      const c = board.cells[j]?.[i];
      if (!c) return null;
      const place = byTile.get(`${i},${j}`);
      if (c.kind === "canal") return { water: true, ...(place ? { place } : {}) };
      return { make: (o) => tileOf(P, o, c), ...(place ? { place } : {}) };
    },
  };
}

function tileOf(
  P: ReturnType<typeof palette>,
  o: ModelOpts,
  c: Exclude<Cellish, { kind: "canal" }>,
): Built {
  const edge = { north: c.north, west: c.west };
  if (c.kind === "pillar") return pillar(P, edge);
  const door = "door" in c ? c.door : undefined;
  if (c.kind === "floor" && !door) return floor(P, o, edge);
  const g = new Group();
  walls(P, g, c.north, c.west, door?.wall ?? undefined);
  if (door && c.kind !== "station") {
    const pile = doorPile(P, door.side);
    pile.position.set(door.wall === "west" ? -1.6 : 1.4, 0, door.wall === "north" ? -1.6 : 1.2);
    g.add(pile);
  }
  if (c.kind === "station") {
    const b = stationModel(P, o, c.look);
    g.add(b.group);
    return { group: g, pin: b.pin, ...(b.tick ? { tick: b.tick } : {}) };
  }
  return { group: g, pin: [0, 2, 0] };
}
