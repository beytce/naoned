import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import { Color } from "three";
import { Coin } from "../../art/icons.js";
import { C } from "../../art/plateau/props.js";
import { d } from "../../game/format.js";
import { CloseButton, Slab } from "../../ui.js";
import { affordable } from "../logic.js";
import { Guard3D } from "../map3d/Guard.js";
import { AnchorLayer, type Anchors } from "../map3d/anchors.js";
import { Figure } from "../map3d/figure.js";
import { Instanced, clay as clayShared, claySolid, hexSlab, useKit } from "../map3d/kit.js";
import { preloadMinis } from "../map3d/minis.js";
import { roleOf } from "../map3d/roster.js";
import type { EmpireAction, EmpirePayload } from "../types.js";
import { pt } from "./texts.js";
import type { ComponentKind, PortaView } from "./types.js";

preloadMinis();

const live = () => !(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
/** Each kind of place by its colour (the sockets round a vehicle). */
const KIND_HEX: Record<ComponentKind, string> = {
  weapon: "#E06A4A",
  defense: "#6EC8F5",
  support: "#6EE0B8",
};
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
  const [socket, setSocket] = useState<{ vehicleId: string; slot: number } | null>(null);
  const [tab, setTab] = useState<"models" | "components">("models");
  const labels = useRef<HTMLDivElement>(null);
  if (!open || !v) return null;
  const nameOf = (id: string | null) => {
    const c = id ? v.inventory.find((x) => x.id === id) : undefined;
    return c ? `${pt.component[c.code] ?? c.code} ${c.level}` : null;
  };
  const kindOfComponent = (id: string) =>
    v.components.find((c) => c.code === v.inventory.find((y) => y.id === id)?.code)?.kind;
  const chosen = socket ? v.vehicles.find((x) => x.id === socket.vehicleId) : undefined;
  const chosenKind = chosen
    ? (v.models.find((m) => m.code === chosen.model)?.places?.[socket?.slot ?? 0] ?? null)
    : null;
  return (
    <div className="porta-in fixed inset-0 z-40 overflow-hidden bg-[#16263E]" data-arms-scene>
      <div className="absolute inset-0">
        <Guard3D>
          <Canvas
            orthographic
            dpr={[1, 1.5]}
            camera={{ position: [0, 40, 44], zoom: 1 }}
            gl={{ antialias: true }}
            onCreated={({ scene }) => {
              scene.background = new Color("#16263E");
            }}
          >
            <Fit n={Math.max(1, v.vehicles.length)} />
            <hemisphereLight args={["#CFE0F5", "#B89A62", 1.15]} />
            <directionalLight position={[-50, 100, 40]} intensity={2.2} color="#FFF3DD" />
            <Suspense fallback={null}>
              <Workshop v={v} socket={socket} />
              <AnchorLayer root={labels} anchors={ANCHOR} />
            </Suspense>
          </Canvas>
        </Guard3D>
        <div ref={labels} className="pointer-events-none absolute inset-0">
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
                        onClick={() => setSocket(on ? null : { vehicleId: x.id, slot: k })}
                        data-place-kind={kind ?? undefined}
                        className={`pointer-events-auto flex min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full px-2 text-xs font-bold shadow-lg shadow-black/50 disabled:opacity-50 ${on ? "ring-2 ring-gold" : ""}`}
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

      <header className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="rounded-2xl bg-night/80 px-3 py-1.5 shadow-lg shadow-black/40">
          <p className="font-place text-sm font-bold uppercase tracking-[0.12em] text-cream">
            {pt.arms}
          </p>
          <p className="text-xs text-cream-dim">{pt.armsSub}</p>
        </div>
        <CloseButton onClick={onClose} />
      </header>

      <footer className="absolute inset-x-0 bottom-0 max-h-[52%] overflow-y-auto bg-gradient-to-t from-night via-night/95 to-night/70 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        {socket && chosen ? (
          <section data-arms-fit>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-cream">
                {pt.model[chosen.model] ?? chosen.model} ·{" "}
                {chosenKind ? pt.kind[chosenKind] : pt.fit} {socket.slot + 1}
              </p>
              <button
                type="button"
                className="min-h-11 px-2 text-xs text-cream-dim"
                onClick={() => setSocket(null)}
              >
                {pt.backOk}
              </button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {chosen.slots[socket.slot] && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void act({
                      type: "empireFitArm",
                      vehicleId: chosen.id,
                      slot: socket.slot,
                      componentId: null,
                    }).then(() => setSocket(null))
                  }
                  className="min-h-14 rounded-xl border border-line bg-night-2 p-2 text-left text-xs text-cream-dim"
                >
                  {pt.empty}
                </button>
              )}
              {v.inventory
                .filter((c) => c.on === null || c.on === chosen.id || ownerAtRemise(v, c.on))
                .filter((c) => chosenKind === null || kindOfComponent(c.id) === chosenKind)
                .map((c) => {
                  const def = v.components.find((x) => x.code === c.code);
                  const here = chosen.slots[socket.slot] === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={busy || here}
                      onClick={() =>
                        void act({
                          type: "empireFitArm",
                          vehicleId: chosen.id,
                          slot: socket.slot,
                          componentId: c.id,
                        }).then(() => setSocket(null))
                      }
                      data-fit-component={c.id}
                      className={`min-h-14 rounded-xl border p-2 text-left ${here ? "border-gold bg-gold/10" : "border-line bg-night-2"}`}
                    >
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-cream">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ background: def ? KIND_HEX[def.kind] : CREAM }}
                        />
                        {nameOf(c.id)}
                      </span>
                      <span className="mt-0.5 block text-xs text-cream-dim">
                        {def ? pt.componentText[def.effect] : ""}
                      </span>
                    </button>
                  );
                })}
            </div>
          </section>
        ) : (
          <>
            <div className="mb-2 flex gap-2">
              {(["models", "components"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={tab === k}
                  onClick={() => setTab(k)}
                  className={`min-h-11 flex-1 rounded-full text-sm font-semibold ${tab === k ? "bg-night-3 text-cream ring-1 ring-gold/60" : "text-cream-dim"}`}
                >
                  {k === "models" ? pt.combat : pt.componentsTab}
                </button>
              ))}
            </div>
            {tab === "models" ? (
              <div className="grid grid-cols-1 gap-2" data-arms-models>
                {v.models.map((m) => {
                  const owned = v.vehicles.filter((x) => x.model === m.code).length;
                  const locked = casa < m.casa;
                  return (
                    <div
                      key={m.code}
                      className={`rounded-xl border border-line bg-night-2 p-2.5 ${locked ? "opacity-60" : ""}`}
                      data-arm-model={m.code}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-place text-sm font-bold uppercase tracking-[0.1em] text-cream">
                          {pt.model[m.code] ?? m.code}
                        </p>
                        <span className="text-xs text-cream-dim">
                          {locked ? pt.opensAt(m.casa) : `${pt.level(m.level)} · ×${owned}`}
                        </span>
                      </div>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-cream-dim">
                        {pt.hp(m.hp)} ·
                        {m.places.map((k, i) => (
                          <span
                            // biome-ignore lint/suspicious/noArrayIndexKey: a place is its index
                            key={i}
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ background: k ? KIND_HEX[k] : CREAM }}
                          />
                        ))}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Slab
                          size="sm"
                          tone="ghost"
                          disabled={busy || locked || !affordable(p.cash, m.cost)}
                          onClick={() => void act({ type: "empireBuyArm", model: m.code })}
                        >
                          {pt.buy} · <Price cost={m.cost} />
                        </Slab>
                        {m.upgradeCost && owned > 0 && (
                          <Slab
                            size="sm"
                            tone="ghost"
                            disabled={busy || !affordable(p.cash, m.upgradeCost)}
                            onClick={() => void act({ type: "empireUpgradeArm", model: m.code })}
                          >
                            {pt.raiseModel} · <Price cost={m.upgradeCost} />
                          </Slab>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2" data-arms-components>
                {v.components.map((c) => {
                  const locked = casa < c.casa;
                  const mine = v.inventory.filter((x) => x.code === c.code);
                  return (
                    <div
                      key={c.code}
                      className={`rounded-xl border border-line bg-night-2 p-2.5 ${locked ? "opacity-60" : ""}`}
                      data-component={c.code}
                    >
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-cream">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ background: KIND_HEX[c.kind] }}
                        />
                        {pt.component[c.code] ?? c.code}
                      </p>
                      <p className="mt-0.5 text-xs text-cream-dim">
                        {locked ? pt.opensAt(c.casa) : pt.componentText[c.effect]}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <Slab
                          size="sm"
                          tone="ghost"
                          disabled={busy || locked || !affordable(p.cash, c.cost)}
                          onClick={() => void act({ type: "empireBuyComponent", code: c.code })}
                        >
                          <Price cost={c.cost} />
                        </Slab>
                        {mine.map((x) => {
                          const on = x.on ? v.vehicles.find((y) => y.id === x.on) : undefined;
                          const plans = x.upgradePlans;
                          return x.upgradeCost ? (
                            <Slab
                              key={x.id}
                              size="sm"
                              tone="ghost"
                              disabled={
                                busy ||
                                (on && on.place !== "remise") ||
                                !affordable(p.cash, x.upgradeCost) ||
                                (plans !== null && v.plans[plans.kind] < plans.n)
                              }
                              onClick={() =>
                                void act({ type: "empireUpgradeComponent", componentId: x.id })
                              }
                            >
                              {pt.raiseComponent} {x.level + 1}
                            </Slab>
                          ) : null;
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </footer>
    </div>
  );
}

const ownerAtRemise = (v: PortaView, vehicleId: string) =>
  v.vehicles.find((x) => x.id === vehicleId)?.place === "remise";

function Fit({ n }: { n: number }) {
  const { camera, size } = useThree();
  useEffect(() => {
    const across = Math.max(30, n * 13 + 10);
    camera.zoom = Math.max(2, Math.min(size.width / across, (size.height * 0.45) / 22));
    camera.position.set(0, 40, 44);
    camera.lookAt(0, 0, -6);
    camera.updateProjectionMatrix();
  }, [camera, size, n]);
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
  const kit = useKit();
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
      <mesh geometry={kit("market").geo} material={clayShared} scale={8} position={[0, 0, -22]} />
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
