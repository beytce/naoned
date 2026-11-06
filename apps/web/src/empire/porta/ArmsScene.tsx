import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { type OrthographicCamera, Vector3 } from "three";
import { Coin } from "../../art/icons.js";
import { PlainGround } from "../../dock.js";
import { d } from "../../game/format.js";
import "../../porcellana/porcellana.css";
import { type Shared, TileBoard } from "../../porcellana/TileBoard.js";
import { CloseButton, Slab } from "../../ui.js";
import { affordable } from "../logic.js";
import { Guard3D } from "../map3d/Guard.js";
import { MAP_3D } from "../map3d/flag.js";
import { useCoverBoard } from "../map3d/pause.js";
import type { EmpireAction, EmpirePayload } from "../types.js";
import { ArmsDock, type ArmsView, KIND_HEX, componentName } from "./ArmsDock.js";
import { armsAt, armsSpec, socketAt } from "./board.js";
import { pt } from "./texts.js";
import type { ComponentKind, PortaView } from "./types.js";

const CREAM = "#F6E8CC";

const Price = ({ cost }: { cost: string }) => (
  <span className="inline-flex items-center gap-1 tabular-nums">
    <Coin size={12} />
    {d(cost)}
  </span>
);

/**
 * The Remise's workshop of arms (docs/plan-porta-3d.md, step 3; decisions of the owner of
 * 4 November 2026): the house's combat vehicles as figurines on their pedestals, their places of
 * components round each as sockets of their kind's colour (a weapon's red, a defense's blue, a
 * support's green) to touch; a socket touched, the components that fit it in cards, fitted or taken
 * off at a touch; the models and the components to buy or raise in cards at the foot, never a list
 * to pick from. A vehicle away from the Remise stands veiled.
 */
export function ArmsScene({
  p,
  open,
  busy,
  act,
  onClose,
}: {
  p: EmpirePayload;
  open: boolean;
  busy: boolean;
  act: (a: EmpireAction) => Promise<void>;
  onClose: () => void;
}) {
  const v = p.view?.porta;
  const casa = p.view?.house.casa ?? 1;
  const [focus, setFocus] = useState(0);
  const [view, setView] = useState<ArmsView>({ kind: "vehicle" });
  const labels = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const [dockH, setDockH] = useState(0);
  const [dockW, setDockW] = useState(0);
  // The map asleep under this scene (audit of 4 November, 3D B3).
  useCoverBoard(open && !!v);
  useEffect(() => {
    const el = dockRef.current;
    if (!open || !el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      const side = window.innerWidth >= 1024;
      setDockH(side ? 0 : el.offsetHeight);
      setDockW(side ? el.offsetWidth + 20 : 0);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);
  if (!open || !v) return null;
  const at = Math.min(focus, Math.max(0, v.vehicles.length - 1));
  const socket =
    view.kind === "fit" && v.vehicles[at]
      ? { vehicleId: v.vehicles[at].id, slot: view.slot }
      : null;
  const nameOf = (id: string | null) => componentName(v, id);
  return (
    <div
      className="porta-in fixed inset-0 z-40 lg:top-[var(--topbar,0px)] overflow-hidden bg-[#E9E6E0]"
      data-arms-scene
    >
      <ArmsBoard
        v={v}
        busy={busy}
        focus={view.kind === "shop" ? null : at}
        socket={socket}
        dockH={dockH}
        dockW={dockW}
        nameOf={nameOf}
        onSocket={(i, k, on) => {
          setFocus(i);
          setView(on ? { kind: "vehicle" } : { kind: "fit", slot: k });
        }}
        onVehicle={(i) => {
          setFocus(i);
          setView({ kind: "vehicle" });
        }}
      />

      <header className="absolute inset-x-0 top-0 flex items-center gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="glass flex min-h-12 min-w-0 flex-1 flex-col justify-center rounded-full px-4 py-1 lg:max-w-md">
          <p className="truncate font-place text-lg font-black leading-tight text-cream">
            {pt.arms}
          </p>
          <p className="truncate text-xs text-cream-dim">{pt.armsSub}</p>
        </div>
        <CloseButton onClick={onClose} className="glass shrink-0 lg:ml-auto" />
      </header>

      <div
        ref={dockRef}
        className="pointer-events-none absolute inset-x-0 bottom-0 lg:inset-x-auto lg:bottom-5 lg:right-5 lg:w-[28rem]"
      >
        <ArmsDock
          p={p}
          v={v}
          busy={busy}
          act={act}
          focus={at}
          onFocus={(n) => {
            setFocus(n);
            setView({ kind: "vehicle" });
          }}
          view={view}
          onView={setView}
        />
      </div>
    </div>
  );
}

const ownerAtRemise = (v: PortaView, vehicleId: string) =>
  v.vehicles.find((x) => x.id === vehicleId)?.place === "remise";

/** The workshop on Porcellana's board (P3), its names and sockets as pins. */
function ArmsBoard({
  v,
  busy,
  focus,
  socket,
  dockH,
  dockW,
  nameOf,
  onSocket,
  onVehicle,
}: {
  v: PortaView;
  busy: boolean;
  focus: number | null;
  socket: { vehicleId: string; slot: number } | null;
  dockH: number;
  dockW: number;
  nameOf: (id: string | null) => string | null;
  onSocket: (i: number, k: number, on: boolean) => void;
  onVehicle: (i: number) => void;
}) {
  const placesOf = (model: string) => v.models.find((m) => m.code === model)?.places ?? [];
  const shape = v.vehicles
    .map(
      (x) =>
        `${x.id}:${x.model}:${x.place === "remise" ? 1 : 0}:${x.slots.map((s) => (s ? 1 : 0)).join("")}`,
    )
    .join(",");
  // biome-ignore lint/correctness/useExhaustiveDependencies: rebuilt by its shape only
  const spec = useMemo(() => armsSpec(v, KIND_HEX, placesOf), [shape]);
  const sh = useRef<Shared>({
    chosen: null,
    hover: null,
    running: true,
    goTo: null,
    pins: new Map(),
    card: null,
    target: new Vector3(),
    marked: new Set(),
    extra: new Map(),
  }).current;
  const at = focus === null ? null : v.vehicles[focus];
  sh.goTo = focus === null ? null : armsAt(focus);
  sh.goZoom = 1.5;
  sh.inset = dockH;
  sh.insetRight = dockW;
  sh.marked = new Set(at ? [`arm:${at.id}`] : []);
  const extra = new Map<string, { place: string; at: [number, number, number] }>();
  for (const x of v.vehicles)
    x.slots.forEach((_, k) =>
      extra.set(`sock:${x.id}:${k}`, { place: `arm:${x.id}`, at: socketAt(k, x.slots.length) }),
    );
  sh.extra = extra;
  const pin = (id: string) => (el: HTMLButtonElement | null) => {
    if (el) sh.pins.set(id, el);
    else sh.pins.delete(id);
  };
  return (
    <div className="porcellana absolute inset-0">
      {MAP_3D ? (
        <Guard3D>
          <Canvas
            orthographic
            dpr={window.innerWidth < 640 ? [1, 1.5] : [1, 2]}
            gl={{ antialias: true, powerPreference: "high-performance" }}
            onCreated={({ camera }) => {
              (camera as OrthographicCamera & { manual?: boolean }).manual = true;
            }}
          >
            <TileBoard
              spec={spec}
              sh={sh}
              onPick={(id) => {
                const i = v.vehicles.findIndex((x) => `arm:${x.id}` === id);
                if (i >= 0) onVehicle(i);
              }}
            />
          </Canvas>
        </Guard3D>
      ) : (
        <PlainGround />
      )}
      <div className={`pc-pins ${MAP_3D ? "" : "hidden"}`}>
        {v.vehicles.map((x, i) => {
          const away = x.place !== "remise";
          const kinds = placesOf(x.model);
          return (
            <div key={x.id}>
              <button
                ref={pin(`arm:${x.id}`)}
                type="button"
                className="pc-pin pc-pin-wide"
                data-out="false"
                data-on={String(focus === i)}
                onClick={() => onVehicle(i)}
                data-arm-vehicle={x.id}
              >
                {pt.model[x.model] ?? x.model} · {pt.hp(x.stats.hp)}
                {away && ` · ${pt.place_[x.place]}`}
              </button>
              {x.slots.map((slot, k) => {
                const kind = kinds[k] ?? null;
                const on = socket?.vehicleId === x.id && socket.slot === k;
                const hex = kind ? KIND_HEX[kind] : "#C23B2E";
                return (
                  <button
                    // biome-ignore lint/suspicious/noArrayIndexKey: a place is its index
                    key={k}
                    ref={pin(`sock:${x.id}:${k}`)}
                    type="button"
                    className="pc-pin pc-pin-wide"
                    data-out="false"
                    data-on={String(on)}
                    disabled={busy || away}
                    onClick={() => onSocket(i, k, on)}
                    data-place-kind={kind ?? undefined}
                    style={
                      slot
                        ? { background: hex, borderColor: "#fff", color: "#fff" }
                        : {
                            background: "#fff",
                            borderColor: hex,
                            borderStyle: "dashed",
                            color: hex,
                          }
                    }
                    aria-label={`${kind ? pt.kind[kind] : pt.fit} ${k + 1}`}
                  >
                    {nameOf(slot) ?? "+"}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
