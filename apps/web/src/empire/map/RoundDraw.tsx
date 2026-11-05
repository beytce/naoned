import { useState } from "react";
import { TILT } from "../../art/plateau/geom.js";
import { haptic } from "../../haptics.js";
import { fr } from "../../i18n.js";
import { sound } from "../../sound.js";
import type { EmpirePayload } from "../types.js";
import { CHART, fleetSpots, placePoint } from "./logic.js";
import { docked, planRound } from "./round.js";

/** A round being drawn: the vehicle taken, the towns touched in order. */
export interface RoundDraft {
  vehicleId: string;
  cities: string[];
  /** The finger still down (the line follows it), or lifted on a town (the round waits). */
  drawing: boolean;
}

/**
 * The round drawn by finger (the gameplay audit, 5 November 2026, P1, after Hades' Star): each
 * vehicle standing at a fondaco has a handle at its feet; taken, the towns it may serve light up in
 * gold; a gold line follows the finger from the vehicle through the towns passed over, each joining
 * the round (its crates loaded) as the finger reaches it. Lifted in the open, the vehicle leaves;
 * lifted on a town, the round waits (its dock says « Partir »), and the handle taken again goes on
 * from the last town. A touch without drawing chooses the vehicle, as before.
 */
export function RoundDraw({
  p,
  now,
  base,
  toChart,
  unitsPerPx,
  round,
  onRound,
  onGo,
  onTap,
}: {
  p: EmpirePayload;
  now: number;
  base: number;
  toChart: (cx: number, cy: number) => [number, number];
  unitsPerPx: () => number;
  round: RoundDraft | null;
  onRound: (r: RoundDraft | null) => void;
  onGo: (r: RoundDraft) => void;
  onTap: (vehicleId: string) => void;
}) {
  const [finger, setFinger] = useState<[number, number] | null>(null);
  const view = p.view;
  if (!view) return null;
  const spots = fleetSpots(p, now, true).filter((s) => docked(p, s.v));
  const plan = round ? planRound(p, round.vehicleId, round.cities) : null;
  const open = new Set(plan?.open ?? []);
  const cityAt = (code: string) => placePoint(p, `city:${code}`);

  const start = (vehicleId: string) => (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.preventDefault();
    e.stopPropagation();
    // Taken again: the round goes on from its last town.
    const cities = round?.vehicleId === vehicleId ? round.cities : [];
    let current: RoundDraft = { vehicleId, cities, drawing: true };
    onRound(current);
    const x0 = e.clientX;
    const y0 = e.clientY;
    let moved = false;
    let lastOn: string | null = null;
    const move = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 8) return;
      moved = true;
      const at = toChart(ev.clientX, ev.clientY);
      setFinger(at);
      const reach = 30 * unitsPerPx();
      const can = planRound(p, vehicleId, current.cities).open;
      lastOn = null;
      for (const code of can) {
        const c = cityAt(code);
        if (c && Math.hypot(c[0] - at[0], c[1] - at[1]) <= reach) {
          lastOn = code;
          current = { ...current, cities: [...current.cities, code] };
          onRound(current);
          haptic("tap");
          sound("stamp");
          break;
        }
      }
      // Over a town already in the round: lifted there, the round waits.
      if (!lastOn)
        for (const code of current.cities) {
          const c = cityAt(code);
          if (c && Math.hypot(c[0] - at[0], c[1] - at[1]) <= reach) lastOn = code;
        }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      setFinger(null);
      if (!moved) {
        // A touch: the vehicle chosen (its panel), the round kept if it was its own.
        if (current.cities.length === 0) onRound(null);
        else onRound({ ...current, drawing: false });
        onTap(vehicleId);
        return;
      }
      // The click that ends a drag is not a touch on the town under the finger.
      const swallow = (ev: Event) => {
        ev.stopPropagation();
        ev.preventDefault();
      };
      window.addEventListener("click", swallow, { capture: true, once: true });
      // It comes in the same breath as the lift: the next touch is the player's.
      window.setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 0);
      if (current.cities.length === 0) onRound(null);
      else if (lastOn) onRound({ ...current, drawing: false });
      else onGo(current);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  // The gold line: from the vehicle, through the towns, to the finger.
  const from = round ? spots.find((s) => s.v.id === round.vehicleId) : undefined;
  const line: [number, number][] = [];
  if (from && round) {
    line.push([from.x, from.y]);
    for (const code of round.cities) {
      const c = cityAt(code);
      if (c) line.push(c);
    }
    if (round.drawing && finger) line.push(finger);
  }

  return (
    <>
      <svg
        className="pointer-events-none absolute left-0 top-0 overflow-visible"
        width={CHART.w * base}
        height={CHART.h * TILT * base}
        viewBox={`0 0 ${CHART.w} ${CHART.h * TILT}`}
        aria-hidden="true"
        data-round-line={round ? round.cities.join(",") : undefined}
      >
        <g transform={`scale(1 ${TILT})`}>
          {/* The towns the finger may still reach: a gold halo that breathes. */}
          {round &&
            [...open].map((code) => {
              const c = cityAt(code);
              return c ? (
                <circle
                  key={code}
                  cx={c[0]}
                  cy={c[1]}
                  r={7}
                  fill="rgb(var(--face, var(--gold)) / 0.18)"
                  stroke="rgb(var(--gold))"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                  className="city-wanted"
                  data-round-open={code}
                />
              ) : null;
            })}
          {line.length > 1 && (
            <>
              <polyline
                points={line.map(([x, y]) => `${x},${y}`).join(" ")}
                fill="none"
                stroke="rgb(var(--gold))"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                opacity="0.9"
              />
              <polyline
                points={line.map(([x, y]) => `${x},${y}`).join(" ")}
                fill="none"
                stroke="#FFF4C8"
                strokeWidth="2"
                strokeDasharray="2 8"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </>
          )}
          {/* Each town of the round, numbered in its order. */}
          {round?.cities.map((code, i) => {
            const c = cityAt(code);
            return c ? (
              <g key={code} transform={`translate(${c[0]} ${c[1]})`} data-round-stop={code}>
                <circle r={4.5} fill="rgb(var(--gold))" />
                <text
                  y={1.6}
                  textAnchor="middle"
                  fontSize={4.6}
                  fontWeight={800}
                  fill="rgb(var(--face-ink, var(--ink)))"
                >
                  {i + 1}
                </text>
              </g>
            ) : null;
          })}
        </g>
      </svg>

      {/* The handles: each vehicle at its fondaco, with its hold. */}
      {spots.map(({ v, x, y }) => {
        const mine = round?.vehicleId === v.id;
        const loaded = mine && plan ? v.capacity - plan.room : v.loads.length;
        return (
          <div
            key={v.id}
            // Placed as a place's mark (its size kept on the screen), but not one: on the 3D board,
            // a mark's button lets the touch through to the scene; the handle keeps it.
            className="pointer-events-none absolute z-20 [transform:translate(-50%,-50%)_scale(var(--chartk,1))]"
            style={{ left: x * base, top: y * TILT * base }}
          >
            <button
              type="button"
              onPointerDown={start(v.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onTap(v.id);
              }}
              aria-label={fr.empire.round.handle(
                fr.empire.vehicleNames[v.type] ?? v.type,
                v.capacity - v.loads.length,
              )}
              // Below the fondaco, on its quay: never over its mark, which a touch must still reach.
              className="absolute left-1/2 top-0 -translate-x-1/2 translate-y-9 pointer-events-auto touch-none"
              data-round-handle={v.id}
              // The camera leaves it be: the finger draws the round, it does not move the map.
              data-drag-handle
            >
              <span
                className={`flex min-h-11 min-w-11 items-center justify-center gap-0.5 rounded-full px-1.5 py-1 shadow-lg ${
                  mine ? "gold-face ring-2 ring-gold" : "glass text-cream"
                }`}
              >
                {Array.from({ length: Math.min(6, v.capacity) }, (_, i) => (
                  <span
                    // biome-ignore lint/suspicious/noArrayIndexKey: places of a hold alike
                    key={i}
                    className={`h-2.5 w-2.5 rounded-[2px] ${
                      i < loaded ? "bg-gold" : "border-[1.5px] border-current opacity-60"
                    }`}
                  />
                ))}
              </span>
            </button>
          </div>
        );
      })}
    </>
  );
}
