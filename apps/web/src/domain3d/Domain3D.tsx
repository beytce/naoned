import { useEffect, useRef, useState } from "react";
import {
  Bubble,
  type DomainPlot,
  type DomainVehicle,
  type DomainWorker,
  Icon,
  type SkyPhase,
} from "../art/domain.js";
import { P } from "../art/palette.js";
import type { DomainWorld, Hit } from "./world.js";

const ROMAN = ["", "I", "II", "III", "IV", "V"];

/** Whether this device draws WebGL (the drawn scene stands in otherwise). */
export function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

export interface Domain3DProps {
  region: string;
  phase: SkyPhase;
  plots: DomainPlot[];
  maxPlots: number;
  vehicles: DomainVehicle[];
  workers: DomainWorker[];
  stock: number;
  ratio: number;
  still: boolean;
  labelOf: (plot: DomainPlot) => string;
  vehicleLabel: (v: DomainVehicle) => string;
  workerLabel: string;
  storeLabel: string;
  emptyLabel: string;
  title: string;
  alert: boolean;
  onPlot: (plot: DomainPlot) => void;
  onEmpty: () => void;
  onVehicle: (v: DomainVehicle) => void;
  onWorker: () => void;
  onStore: () => void;
  /** Hands over how to find the workshop under a point of the screen (for the sweep). */
  onPicker: (pick: ((clientX: number, clientY: number) => string | null) | null) => void;
  /** A tap that ends a sweep is not a tap. */
  quiet: () => boolean;
}

/**
 * The domain in real time 3D (three.js, loaded on demand), with the interface laid over it: the
 * bubbles, plaques and gains of the drawn scene, each at the screen position of its object.
 */
export default function Domain3D(props: Domain3DProps) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const world = useRef<DomainWorld | null>(null);
  const marks = useRef(new Map<string, HTMLElement>());
  const [ready, setReady] = useState(false);
  const latest = useRef(props);
  latest.current = props;

  // The world: created once (three.js comes with it), its loop paused off screen.
  useEffect(() => {
    let alive = true;
    let raf = 0;
    let visible = true;
    let observer: IntersectionObserver | null = null;
    let resize: ResizeObserver | null = null;
    void import("./world.js").then(({ DomainWorld }) => {
      if (!alive || !canvas.current || !host.current) return;
      const w = new DomainWorld(canvas.current);
      world.current = w;
      const fit = () => {
        const box = host.current?.getBoundingClientRect();
        if (box) w.setSize(box.width, box.width * latest.current.ratio, latest.current.ratio);
      };
      fit();
      resize = new ResizeObserver(fit);
      resize.observe(host.current);
      observer = new IntersectionObserver(([e]) => {
        visible = !!e?.isIntersecting;
      });
      observer.observe(host.current);
      w.update(stateOf(latest.current));
      const loop = (t: number) => {
        raf = requestAnimationFrame(loop);
        if (!visible || document.hidden) return;
        w.frame(t);
        for (const a of w.anchors()) {
          const el = marks.current.get(a.key);
          if (el) el.style.transform = `translate3d(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px, 0)`;
        }
      };
      raf = requestAnimationFrame(loop);
      latest.current.onPicker((cx, cy) => {
        const r = canvas.current?.getBoundingClientRect();
        if (!r) return null;
        const hit = w.pick(cx - r.left, cy - r.top);
        return hit?.kind === "plot" ? hit.id : null;
      });
      setReady(true);
    });
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      observer?.disconnect();
      resize?.disconnect();
      latest.current.onPicker(null);
      world.current?.dispose();
      world.current = null;
    };
  }, []);

  // Each new view of the domain goes to the world.
  useEffect(() => {
    world.current?.update(stateOf(props));
  });

  const mark = (key: string) => (el: HTMLElement | null) => {
    if (el) marks.current.set(key, el);
    else marks.current.delete(key);
  };

  // A tap on the scene: what lies under it.
  const down = useRef<{ x: number; y: number; t: number } | null>(null);
  const tap = (hit: Hit | null) => {
    const p = latest.current;
    if (!hit) return;
    if (hit.kind === "plot") {
      const plot = p.plots.find((x) => x.id === hit.id);
      if (plot) p.onPlot(plot);
    } else if (hit.kind === "empty") p.onEmpty();
    else if (hit.kind === "vehicle") {
      const v = p.vehicles.find((x) => x.id === hit.id);
      if (v) p.onVehicle(v);
    } else if (hit.kind === "worker") p.onWorker();
    else if (hit.kind === "store") p.onStore();
  };

  const homeVehicles = props.vehicles;
  return (
    <div
      ref={host}
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: `1 / ${props.ratio}` }}
    >
      <canvas
        ref={canvas}
        role="img"
        aria-label={props.title}
        className={`block h-full w-full transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`}
        onPointerDown={(e) => {
          down.current = { x: e.clientX, y: e.clientY, t: performance.now() };
        }}
        onPointerUp={(e) => {
          const d = down.current;
          down.current = null;
          if (!d || props.quiet()) return;
          if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10 || performance.now() - d.t > 600)
            return;
          const r = e.currentTarget.getBoundingClientRect();
          tap(world.current?.pick(e.clientX - r.left, e.clientY - r.top) ?? null);
        }}
      />
      {!ready && <div className="absolute inset-0 animate-pulse bg-night-3" />}

      {/* The interface over the scene: each mark follows its object. */}
      <div className="pointer-events-none absolute inset-0">
        {props.plots.map((plot) => (
          <div key={plot.id}>
            <div ref={mark(`plot:${plot.id}`)} className="absolute left-0 top-0">
              <button
                type="button"
                aria-label={props.labelOf(plot)}
                data-coach={plot.coach}
                data-plot={plot.id}
                data-ready={plot.state === "ready" ? "1" : undefined}
                onClick={() => !props.quiet() && props.onPlot(plot)}
                className="pointer-events-auto absolute -left-7 -top-11 flex h-11 w-14 items-center justify-center"
              >
                <svg
                  viewBox="-28 -22 56 40"
                  width="56"
                  height="40"
                  aria-hidden="true"
                  className="overflow-visible"
                >
                  <Bubble plot={plot} />
                </svg>
              </button>
              {plot.gain && (
                <div key={plot.gain.key} className="absolute -left-6 -top-16">
                  <div className="domain-gain flex items-center gap-1 font-display text-lg font-extrabold text-gold-soft [text-shadow:0_2px_0_rgb(15_27_30),0_0_6px_rgb(15_27_30)]">
                    +{plot.gain.quantity}
                    <svg viewBox="-12 -12 24 24" width="22" height="22" aria-hidden="true">
                      <Icon code={plot.gain.resource} x={0} y={0} size={22} />
                    </svg>
                  </div>
                </div>
              )}
            </div>
            <div
              ref={mark(`plate:${plot.id}`)}
              className="absolute left-0 top-0 -ml-3 -mt-2 flex items-center gap-1"
            >
              <span className="rounded bg-night/80 px-1 font-display text-[9px] font-extrabold leading-[14px] text-gold">
                {ROMAN[Math.min(5, plot.level)] ?? plot.level}
              </span>
              {plot.canUpgrade && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[10px] font-black text-ink">
                  ↑
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={mark("empty:0")} className="absolute left-0 top-0">
          <button
            type="button"
            aria-label={props.emptyLabel}
            onClick={props.onEmpty}
            className="pointer-events-auto -ml-12 mt-2 flex h-8 w-24 items-center justify-center font-mono text-[10px] tracking-[0.2em] text-cream [text-shadow:0_1px_2px_rgb(15_27_30)]"
          >
            + {props.emptyLabel.toUpperCase()}
          </button>
        </div>
        {homeVehicles.map((v) => (
          <div key={v.id} ref={mark(`vehicle:${v.id}`)} className="absolute left-0 top-0">
            <button
              type="button"
              aria-label={props.vehicleLabel(v)}
              data-vehicle={v.id}
              onClick={() => props.onVehicle(v)}
              className="pointer-events-auto -ml-5 -mt-9 flex h-10 w-10 items-center justify-center"
            >
              {(v.ready || v.stopped) && (
                <svg viewBox="-14 -14 28 32" width="28" height="32" aria-hidden="true">
                  {v.stopped ? (
                    <g>
                      <path d="M-4 9 L0 15 L4 9 Z" fill={P.vermilion} />
                      <circle r="11" fill={P.vermilion} />
                      <text textAnchor="middle" y="4.5" fontSize="12" fill={P.cream}>
                        ⚔
                      </text>
                    </g>
                  ) : (
                    <Bubble
                      plot={{ id: v.id, type: v.type, level: 1, state: "idle", burst: false }}
                    />
                  )}
                </svg>
              )}
            </button>
          </div>
        ))}
        {props.workers.map((w) => (
          <div key={w.id} ref={mark(`worker:${w.id}`)} className="absolute left-0 top-0">
            <button
              type="button"
              aria-label={props.workerLabel}
              data-worker={w.id}
              onClick={props.onWorker}
              className="pointer-events-auto -ml-4 -mt-8 flex h-8 w-8 items-center justify-center"
            >
              {w.bubble && w.need !== "ok" && (
                <svg viewBox="-13 -13 26 30" width="22" height="26" aria-hidden="true">
                  <path d="M-4 9 L0 15 L4 9 Z" fill={w.need === "hungry" ? P.vermilion : P.cream} />
                  <circle
                    r="11"
                    fill={w.need === "hungry" ? P.vermilion : P.cream}
                    stroke={P.night}
                    strokeWidth="1"
                  />
                  <Icon code="bread" x={0} y={0} size={15} />
                </svg>
              )}
            </button>
          </div>
        ))}
        <div ref={mark("store")} className="absolute left-0 top-0">
          <button
            type="button"
            aria-label={props.storeLabel}
            data-coach="store"
            onClick={props.onStore}
            className="pointer-events-auto -ml-6 -mt-6 h-12 w-12"
          />
        </div>
        {props.alert && (
          <div ref={mark("gate")} className="absolute left-0 top-0">
            <svg
              viewBox="-14 -14 28 32"
              width="30"
              height="34"
              className="-ml-[15px] -mt-[34px] animate-bounce"
              aria-hidden="true"
            >
              <path d="M-4 9 L0 15 L4 9 Z" fill={P.vermilion} />
              <circle r="11" fill={P.vermilion} />
              <text textAnchor="middle" y="4.5" fontSize="12" fill={P.cream}>
                ⚔
              </text>
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

function stateOf(p: Domain3DProps) {
  return {
    region: p.region,
    phase: p.phase,
    plots: p.plots,
    maxPlots: p.maxPlots,
    vehicles: p.vehicles,
    workers: p.workers,
    stock: p.stock,
    still: p.still,
  };
}
