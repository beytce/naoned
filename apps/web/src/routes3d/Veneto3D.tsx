import { type ReactNode, useEffect, useRef, useState } from "react";
import type { SkyPhase } from "../art/domain.js";
import { FamilyCrest } from "../art/familyCrest.js";
import type { VenetoHit, VenetoState, VenetoWorld } from "./world.js";

export interface CityMark {
  code: string;
  name: string;
  reached: boolean;
  /** Open orders waiting there (the badge). */
  open: number;
  /** One of them is the Doge's. */
  star: boolean;
  /** Greyed: nothing for the merchant there (or not for the chosen vehicle). */
  dim: boolean;
  /** Lit: the chosen vehicle can serve it. */
  lit: boolean;
  /** An urgent order's clock, if any. */
  urgent: string | null;
  /** The time on its road, and whether bandits lie in wait on it. */
  time: string | null;
  watched: boolean;
  /** The family holding its land in the week's campaign (its toll may follow). */
  holder: string | null;
}

export interface VehicleMark {
  id: string;
  label: string;
  ambushed: boolean;
}

export interface Veneto3DProps {
  region: string;
  phase: SkyPhase;
  still: boolean;
  clockOffset: number;
  cities: CityMark[];
  routes: VenetoState["routes"];
  deliveries: VenetoState["deliveries"];
  camps: VenetoState["camps"];
  vehicles: VehicleMark[];
  /** What a city just paid: shown rising above it. */
  gains: { id: string; city: string; label: string }[];
  title: string;
  className?: string;
  onCity: (code: string) => void;
  onDelivery: (id: string) => void;
  /** Laid over the scene (the hud, the stock). */
  children?: ReactNode;
}

/**
 * The roads of the Veneto in real time 3D, with the map's marks laid over it: each town's open
 * orders and name, the time of each road, the vehicles' clocks, what a city paid.
 */
export default function Veneto3D(props: Veneto3DProps) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const world = useRef<VenetoWorld | null>(null);
  const marks = useRef(new Map<string, HTMLElement>());
  const [ready, setReady] = useState(false);
  const latest = useRef(props);
  latest.current = props;

  useEffect(() => {
    let alive = true;
    let raf = 0;
    let visible = true;
    let observer: IntersectionObserver | null = null;
    let resize: ResizeObserver | null = null;
    void import("./world.js").then(({ VenetoWorld }) => {
      if (!alive || !canvas.current || !host.current) return;
      const w = new VenetoWorld(canvas.current);
      world.current = w;
      const fit = () => {
        const box = host.current?.getBoundingClientRect();
        if (box) w.setSize(box.width, box.height);
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
      setReady(true);
    });
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      observer?.disconnect();
      resize?.disconnect();
      world.current?.dispose();
      world.current = null;
    };
  }, []);

  useEffect(() => {
    world.current?.update(stateOf(props));
  });

  const mark = (key: string) => (el: HTMLElement | null) => {
    if (el) marks.current.set(key, el);
    else marks.current.delete(key);
  };

  const down = useRef<{ x: number; y: number; t: number } | null>(null);
  const tap = (hit: VenetoHit | null) => {
    const p = latest.current;
    if (hit?.kind === "city") {
      if (p.cities.find((c) => c.code === hit.code)?.reached) p.onCity(hit.code);
    } else if (hit?.kind === "delivery") p.onDelivery(hit.id);
  };

  return (
    <div ref={host} className={`relative w-full overflow-hidden ${props.className ?? ""}`}>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: the keyboard has the buttons laid over the scene. */}
      <canvas
        ref={canvas}
        role="img"
        aria-label={props.title}
        className={`block h-full w-full transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`}
        onPointerDown={(e) => {
          down.current = { x: e.clientX, y: e.clientY, t: performance.now() };
        }}
        // On the click, not the release: a sheet opened on the release would take the click that
        // follows on its backdrop, and close at once.
        onClick={(e) => {
          const d = down.current;
          down.current = null;
          if (!d) return;
          if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10 || performance.now() - d.t > 600)
            return;
          const r = e.currentTarget.getBoundingClientRect();
          tap(world.current?.pick(e.clientX - r.left, e.clientY - r.top) ?? null);
        }}
      />
      {!ready && <div className="absolute inset-0 animate-pulse bg-night-3" />}

      <div className="pointer-events-none absolute inset-0">
        {/* Names under the badges: a badge stays readable over a neighbour's name. */}
        {props.cities.map((c) => (
          <div key={c.code}>
            <div ref={mark(`name:${c.code}`)} className="absolute left-0 top-0">
              <div
                className={`-ml-14 w-28 text-center ${c.dim ? "opacity-60" : ""} [text-shadow:0_1px_2px_rgb(15_27_30),0_0_6px_rgb(15_27_30)]`}
              >
                <p className="font-display text-[11px] font-extrabold uppercase leading-tight tracking-wide text-cream">
                  {c.name}
                </p>
                {c.holder && (
                  <span className="mt-0.5 flex justify-center">
                    <FamilyCrest family={c.holder} size={16} />
                  </span>
                )}
                {c.time && (
                  <p
                    className={`mx-auto mt-0.5 w-fit rounded-full px-1.5 font-mono text-[9px] leading-[14px] [text-shadow:none] ${c.watched ? "bg-vermilion text-cream" : "bg-night/70 text-cream-dim"}`}
                  >
                    {c.watched ? "⚔ " : ""}
                    {c.time}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
        {props.cities.map((c) => (
          <div key={c.code}>
            <div ref={mark(`city:${c.code}`)} className="absolute left-0 top-0">
              <button
                type="button"
                aria-label={c.name}
                data-city={c.code}
                disabled={!c.reached}
                onClick={() => c.reached && props.onCity(c.code)}
                className={`pointer-events-auto absolute -left-6 -top-10 flex h-10 w-12 items-end justify-center transition-opacity ${c.dim ? "opacity-50" : ""}`}
              >
                {c.open > 0 && (
                  <span
                    className={`relative flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 font-display text-sm font-extrabold text-night shadow-lg ring-2 ring-night ${c.star ? "bg-gold" : "bg-lagoon"} ${c.lit ? "scale-110 ring-gold" : ""}`}
                  >
                    {c.open}
                    {c.star && (
                      <span className="absolute -left-2 -top-2 text-xs text-gold [text-shadow:0_1px_2px_rgb(15_27_30)]">
                        ✦
                      </span>
                    )}
                    <span className="absolute -bottom-1.5 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[5px] border-t-[6px] border-x-transparent border-t-night" />
                  </span>
                )}
                {c.urgent && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-vermilion px-1.5 font-mono text-[9px] leading-[14px] text-cream shadow">
                    ⏱ {c.urgent}
                  </span>
                )}
              </button>
              {props.gains
                .filter((g) => g.city === c.code)
                .map((g) => (
                  <div
                    key={g.id}
                    className="domain-gain absolute -left-10 -top-16 w-20 text-center font-display text-lg font-extrabold text-gold-soft [text-shadow:0_2px_0_rgb(15_27_30),0_0_6px_rgb(15_27_30)]"
                  >
                    {g.label}
                  </div>
                ))}
            </div>
          </div>
        ))}
        {props.vehicles.map((v) => (
          <div key={v.id} ref={mark(`delivery:${v.id}`)} className="absolute left-0 top-0">
            <button
              type="button"
              aria-label={v.label}
              data-delivery={v.id}
              onClick={() => props.onDelivery(v.id)}
              className={`pointer-events-auto -ml-8 -mt-4 block w-16 rounded-full py-0.5 text-center font-mono text-[9px] ring-1 ${v.ambushed ? "animate-pulse bg-vermilion text-cream ring-vermilion" : "bg-night/85 text-gold ring-gold/70"}`}
            >
              {v.label}
            </button>
          </div>
        ))}
      </div>
      {props.children}
    </div>
  );
}

function stateOf(p: Veneto3DProps): VenetoState {
  return {
    region: p.region,
    phase: p.phase,
    cities: p.cities.map((c) => ({ code: c.code, reached: c.reached })),
    routes: p.routes,
    deliveries: p.deliveries,
    camps: p.camps,
    clockOffset: p.clockOffset,
    still: p.still,
  };
}
