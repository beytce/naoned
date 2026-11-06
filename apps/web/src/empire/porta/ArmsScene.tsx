import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import { Color } from "three";
import { Coin } from "../../art/icons.js";
import { C } from "../../art/plateau/props.js";
import { PlainGround } from "../../dock.js";
import { d } from "../../game/format.js";
import { Pawn as Figure } from "../../porcellana/Pawn.js";
import { createPalette } from "../../porcellana/materials.js";
import { post } from "../../porcellana/models/places.js";
import { CloseButton, Slab } from "../../ui.js";
import { affordable } from "../logic.js";
import { Guard3D } from "../map3d/Guard.js";
import { AnchorLayer, type Anchors } from "../map3d/anchors.js";
import { MAP_3D } from "../map3d/flag.js";
import { Instanced, clay as clayShared, claySolid, hexSlab } from "../map3d/kit.js";
import { Pace } from "../map3d/pace.js";
import { useCoverBoard } from "../map3d/pause.js";
import { roleOf } from "../map3d/roster.js";
import type { EmpireAction, EmpirePayload } from "../types.js";
import { ArmsDock, type ArmsView, KIND_HEX, componentName } from "./ArmsDock.js";
import { ROME_DUSK } from "./colours.js";

/** The Remise's stall, behind the arms: Porcellana's shop (D6). */
const ARMS_STALL = (() => {
  const g = post(createPalette()).group;
  g.scale.setScalar(1.7);
  return g;
})();
import { pt } from "./texts.js";
import type { ComponentKind, PortaView } from "./types.js";

const live = () => !(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
/** A vehicle's pedestal in the workshop, in a row, and its places round it. */
const PEDESTAL = (i: number, n: number): [number, number, number] => [(i - (n - 1) / 2) * 13, 0, 0];
const SOCKET = (base: [number, number, number], k: number, n: number): [number, number, number] => {
  const a = Math.PI * (0.15 + (0.7 * (k + 0.5)) / Math.max(1, n));
  return [base[0] - Math.cos(a) * 5.2, 1.6, base[2] + Math.sin(a) * 4.2];
};
const ANCHOR: Anchors = new Map();
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
  // The map asleep under this scene (audit of 4 November, 3D B3).
  useCoverBoard(open && !!v);
  useEffect(() => {
    const el = dockRef.current;
    if (!open || !el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setDockH(el.offsetHeight));
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
    <div className="porta-in fixed inset-0 z-40 overflow-hidden bg-[#16263E]" data-arms-scene>
      <div className="absolute inset-0">
        {MAP_3D ? (
          <Guard3D>
            <Canvas
              orthographic
              frameloop="demand"
              dpr={[1, 1.5]}
              camera={{ position: [0, 40, 44], zoom: 1 }}
              gl={{ antialias: true }}
              onCreated={({ scene }) => {
                scene.background = new Color(ROME_DUSK.sky);
              }}
            >
              <Fit
                n={Math.max(1, v.vehicles.length)}
                focus={view.kind === "shop" ? null : at}
                dockH={dockH}
              />
              <Pace fps={live() ? 30 : 0} />
              <hemisphereLight args={[ROME_DUSK.hemiSky, ROME_DUSK.hemiGround, 1.25]} />
              <directionalLight position={[-50, 100, 40]} intensity={2.5} color={ROME_DUSK.sun} />
              <Suspense fallback={null}>
                <Workshop v={v} socket={socket} />
                <AnchorLayer root={labels} anchors={ANCHOR} />
              </Suspense>
            </Canvas>
          </Guard3D>
        ) : (
          <PlainGround />
        )}
        <div
          ref={labels}
          className={`pointer-events-none absolute inset-0 ${MAP_3D ? "" : "hidden"}`}
        >
          {v.vehicles.map((x, i) => {
            const away = x.place !== "remise";
            const places = v.models.find((m) => m.code === x.model)?.places ?? [];
            return (
              <div key={x.id}>
                <div data-anchor={`name:${i}`} className="absolute left-0 top-0">
                  <span
                    className="block -translate-x-1/2 translate-y-3 whitespace-nowrap rounded-full bg-night/85 px-2.5 py-0.5 text-xs font-semibold text-cream shadow-lg"
                    data-arm-vehicle={x.id}
                  >
                    {pt.model[x.model] ?? x.model} · {pt.hp(x.stats.hp)}
                    {away && ` · ${pt.place_[x.place]}`}
                  </span>
                </div>
                {x.slots.map((slot, k) => {
                  const kind = places[k] ?? null;
                  const on = socket?.vehicleId === x.id && socket.slot === k;
                  return (
                    <div
                      // biome-ignore lint/suspicious/noArrayIndexKey: a place is its index
                      key={k}
                      data-anchor={`socket:${i}:${k}`}
                      className="absolute left-0 top-0"
                    >
                      <button
                        type="button"
                        disabled={busy || away}
                        onClick={() => {
                          setFocus(i);
                          setView(on ? { kind: "vehicle" } : { kind: "fit", slot: k });
                        }}
                        data-place-kind={kind ?? undefined}
                        className={`pointer-events-auto flex min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full px-2 text-xs font-bold shadow-lg shadow-black/50 disabled:opacity-50 ${on ? "ring-2 ring-info" : ""}`}
                        style={{
                          background: slot
                            ? kind
                              ? KIND_HEX[kind]
                              : C.gold
                            : "rgb(14 26 43 / 0.85)",
                          color: slot ? "#0E1A2B" : kind ? KIND_HEX[kind] : CREAM,
                          border: slot ? "none" : `2px dashed ${kind ? KIND_HEX[kind] : CREAM}`,
                        }}
                        aria-label={`${kind ? pt.kind[kind] : pt.fit} ${k + 1}`}
                      >
                        {nameOf(slot) ?? "+"}
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <header className="absolute inset-x-0 top-0 flex items-center gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="glass flex min-h-12 min-w-0 flex-1 flex-col justify-center rounded-full px-4 py-1">
          <p className="truncate font-place text-lg font-black leading-tight text-cream">
            {pt.arms}
          </p>
          <p className="truncate text-xs text-cream-dim">{pt.armsSub}</p>
        </div>
        <CloseButton onClick={onClose} className="glass shrink-0" />
      </header>

      <div ref={dockRef} className="pointer-events-none absolute inset-x-0 bottom-0">
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

/**
 * The camera on the workshop above the dock: all the pedestals, or the one in the middle of the
 * carousel, closer (docs/plan-dock.md); it glides there, at once for less motion.
 */
function Fit({ n, focus, dockH }: { n: number; focus: number | null; dockH: number }) {
  const { camera, size, invalidate } = useThree();
  const goal = useRef({ x: 0, z: -6, zoom: 2 });
  const look = useRef({ x: 0, z: -6 });
  useEffect(() => {
    const room = Math.max(160, size.height - dockH - 64);
    const across = focus === null ? Math.max(30, n * 13 + 10) : 26;
    const zoom = Math.max(2, Math.min(size.width / across, room / 22));
    const x = focus === null ? 0 : PEDESTAL(focus, n)[0];
    // The pedestal in the middle of the room above the dock.
    const z = -2 + (dockH - 64) / 2 / zoom / 0.72;
    goal.current = { x, z, zoom };
    if (!live()) {
      look.current = { x, z };
      camera.zoom = zoom;
    }
    invalidate();
  }, [camera, size, n, focus, dockH, invalidate]);
  useFrame((_, dt) => {
    const g = goal.current;
    const k = live() ? 1 - Math.exp(-dt * 6) : 1;
    const l = look.current;
    if (Math.abs(l.x - g.x) + Math.abs(l.z - g.z) + Math.abs(camera.zoom - g.zoom) < 0.001) return;
    l.x += (g.x - l.x) * k;
    l.z += (g.z - l.z) * k;
    camera.zoom += (g.zoom - camera.zoom) * k;
    camera.position.set(l.x, 40, l.z + 50);
    camera.lookAt(l.x, 0, l.z);
    camera.updateProjectionMatrix();
    invalidate();
  });
  return null;
}

const floor = hexSlab(4.9, 2, 0.5);

/** The workshop: a floor of tiles, a pedestal for each combat vehicle, its sockets round it. */
function Workshop({
  v,
  socket,
}: {
  v: PortaView;
  socket: { vehicleId: string; slot: number } | null;
}) {
  const n = v.vehicles.length;
  const tiles = [];
  for (let r = -2; r <= 2; r++)
    for (let q = -6; q <= 6; q++)
      tiles.push({ x: (q + r / 2) * 8.5, y: 0, z: r * 7.4 + 3, s: 1, rot: Math.PI / 6 });
  const places = (model: string) => v.models.find((m) => m.code === model)?.places ?? [];
  return (
    <group>
      <Instanced geo={floor} items={tiles} material={claySolid(C.land)} />
      {/* The Remise's hall behind, its crates. */}
      <primitive object={ARMS_STALL} position={[0, 0, -22]} />
      {v.vehicles.map((x, i) => {
        const base = PEDESTAL(i, n);
        ANCHOR.set(`name:${i}`, [base[0], 0, base[2] + 3]);
        x.slots.forEach((_, k) => ANCHOR.set(`socket:${i}:${k}`, SOCKET(base, k, x.slots.length)));
        const away = x.place !== "remise";
        return (
          <group key={x.id} position={base}>
            <mesh material={claySolid(away ? C.mistSoil : C.rock2)} position-y={0.4}>
              <cylinderGeometry args={[3.4, 3.8, 0.8, 6]} />
            </mesh>
            <group position-y={0.8} scale={1.8} visible={!away}>
              <Figure role={roleOf({ side: "player", model: x.model })} live={live()} />
            </group>
            {/* The sockets' light on the ground, of their kind's colour. */}
            {x.slots.map((slot, k) => {
              const at = SOCKET(base, k, x.slots.length);
              const kind = places(x.model)[k];
              const lit = socket?.vehicleId === x.id && socket.slot === k;
              return (
                <mesh
                  key={`${x.id}#${places(x.model).length}#${String(k)}`}
                  position={[at[0] - base[0], 0.06, at[2] - base[2]]}
                  rotation-x={-Math.PI / 2}
                >
                  <circleGeometry args={[lit ? 1.5 : 1.1, 20]} />
                  <meshBasicMaterial
                    color={kind ? KIND_HEX[kind] : C.gold}
                    transparent
                    opacity={slot ? 0.9 : 0.35}
                  />
                </mesh>
              );
            })}
          </group>
        );
      })}
    </group>
  );
}
