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
import { buildingName, recipeOf } from "../logic.js";
import { perHour } from "../map/WorkshopDock.js";
import { Guard3D } from "../map3d/Guard.js";
import { MAP_3D } from "../map3d/flag.js";
import { useCoverBoard } from "../map3d/pause.js";
import type { EmpirePayload } from "../types.js";
import { type Cellish, interiorBoard } from "./board.js";

const t = () => fr.empire.interior;
const S = BOARD.tile + BOARD.gap;

/**
 * The inside of a workshop (docs/plan-ateliers.md § 7, lot A5), read only: its hall of porcelain
 * flagstones walled on the far sides, its stations each on its footprint with its hands, the red
 * ribbons and the crates going along them from the door of the inputs to the door of the goods,
 * the bottleneck ringed in red, each station's rate on its pin. A scene of its own over the map,
 * as the Porta's; touched, a station tells its level, its hands and its wear.
 */
export function InteriorScene({
  p,
  workshopId,
  now,
  onClose,
}: {
  p: EmpirePayload;
  workshopId: string;
  now: number;
  onClose: () => void;
}) {
  const v = p.view;
  const ws = v?.house.workshops.find((w) => w.id === workshopId);
  const inside = v?.interiors?.[workshopId];
  useCoverBoard(!!inside);
  const [chosen, setChosen] = useState<string | null>(null);
  const sh = useRef<Shared>({
    chosen: null,
    hover: null,
    running: true,
    goTo: null,
    pins: new Map(),
    card: null,
    target: new Vector3(),
  }).current;
  sh.chosen = chosen;

  // The workshop's goods an hour, at its inside's pace: the figure the pins speak in.
  const r = ws ? recipeOf(p, ws) : undefined;
  const [good, qty] = Object.entries(r?.outputs ?? {})[0] ?? ["", 0];
  const yieldBps = (ws && v?.upgrades[ws.id]?.yieldBps) || 10_000;
  const pace = inside?.paceBps ?? 10_000;
  const goodsPerHour = r ? (perHour(qty, yieldBps, r.minutes) * pace) / 10_000 : 0;
  const second = Math.floor(now / 60_000);
  // biome-ignore lint/correctness/useExhaustiveDependencies: read again each minute at most.
  const board = useMemo(
    () => (inside ? interiorBoard(inside, v?.interiorRules, goodsPerHour, now) : null),
    [inside, v?.interiorRules, goodsPerHour, second],
  );
  const running = !!ws?.job;
  sh.running = running;
  const spec = useMemo(() => (board ? specOf(board, running) : null), [board, running]);
  if (!v || !ws || !inside || !board || !spec) return null;
  const places = board.places;
  const current = places.find((x) => x.id === chosen);
  const gain = Math.round((pace - 10_000) / 100);
  const quality = Math.min(3, Math.round(inside.rate.qualityBps / 3_334));
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
            <TileBoard spec={spec} sh={sh} onPick={setChosen} />
          </Canvas>
        </Guard3D>
      ) : (
        <PlainGround />
      )}
      <div className={`pc-pins ${MAP_3D ? "" : "hidden"}`}>
        {places.map((x) => (
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
      </div>
      <div className="pointer-events-none absolute left-4 top-4 max-w-[calc(100vw-6rem)] rounded-[1.75rem] bg-white px-5 py-4 shadow-[0_4px_0_rgb(23_21_15/0.07),0_14px_40px_rgb(23_21_15/0.1)]">
        <p className="text-xs font-bold text-[#625D55]" data-interior-head>
          {buildingName(p, ws.type)} · {t().level(ws.level)}
        </p>
        <p className="mt-0.5 font-display text-4xl font-black leading-none text-[#17150F]">
          {(Math.round(goodsPerHour * 10) / 10).toLocaleString("fr-FR")}
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
          <span className="rounded-full bg-[#EDE8E0] px-2.5 py-1 text-[0.6875rem] font-bold text-[#625D55]">
            {t().gain(gain)}
          </span>
        </div>
      </div>
      <CloseButton onClick={onClose} className="absolute right-4 top-4 !bg-white !text-[#17150F]" />
      {current ? (
        <PlaceCard
          ref={(h) => {
            sh.card = h;
          }}
          info={current.info}
          onGo={() => setChosen(null)}
          onClose={() => setChosen(null)}
        />
      ) : null}
    </div>
  );
}

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
