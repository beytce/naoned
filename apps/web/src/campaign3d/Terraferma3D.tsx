import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import type { SkyPhase } from "../art/domain.js";
import { WorkGlyph } from "../art/workIcon.js";
import { CarrierDrag, type DropSpot } from "../game/Cargo.js";
import type { CampaignLand, CampaignMarch, CampaignWorld } from "./world.js";

export interface LandMark {
  code: string;
  name: string;
  garrison: number;
  holder: string | null;
  /** The merchant may send lances there now. */
  open: boolean;
  /** An enemy column marches on it. */
  threatened: boolean;
  /** The work standing on it (outlined while it is being built). */
  work: { kind: string; ready: boolean; family: string } | null;
}

export interface Terraferma3DProps {
  phase: SkyPhase;
  still: boolean;
  clockOffset: number;
  lands: (CampaignLand & LandMark)[];
  marches: (CampaignMarch & { label: string; hostile: boolean })[];
  colors: Record<string, string>;
  /** The land the view opens on. */
  focus?: string | null;
  title: string;
  className?: string;
  onLand: (code: string) => void;
  /** The merchant's lances at their family's seat, to be dragged to a land. */
  carrier?: {
    from: string;
    token: ReactNode;
    info: (code: string) => { ok: boolean; title: string; sub: string };
    onDrop: (code: string) => void;
    onTap: () => void;
  } | null;
  children?: ReactNode;
}

/**
 * The campaign on the model of the Veneto, with its marks laid over it: each land's garrison in
 * its holder's colour and its name, the marches' clocks; a land touched opens it; the seat's
 * lances are dragged to a land.
 */
export default function Terraferma3D(props: Terraferma3DProps) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const world = useRef<CampaignWorld | null>(null);
  const marks = useRef(new Map<string, HTMLElement>());
  const anchorsAt = useRef(new Map<string, { x: number; y: number }>());
  const [ready, setReady] = useState(false);
  const latest = useRef(props);
  latest.current = props;

  useEffect(() => {
    let alive = true;
    let raf = 0;
    let visible = true;
    let observer: IntersectionObserver | null = null;
    let resize: ResizeObserver | null = null;
    void import("./world.js").then(({ CampaignWorld }) => {
      if (!alive || !canvas.current || !host.current) return;
      const w = new CampaignWorld(canvas.current);
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
          anchorsAt.current.set(a.key, { x: a.x, y: a.y });
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
  const origin = useCallback(
    () => anchorsAt.current.get(`land:${latest.current.carrier?.from ?? ""}`) ?? null,
    [],
  );
  const spots = useCallback((): DropSpot[] => {
    const out: DropSpot[] = [];
    for (const l of latest.current.lands) {
      const at = anchorsAt.current.get(`land:${l.code}`);
      if (at) out.push({ code: l.code, x: at.x, y: at.y + 14 });
    }
    return out;
  }, []);
  const down = useRef<{ x: number; y: number; t: number } | null>(null);
  // Fingers on the map: one pans it, two pinch it; a drag is never a tap.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const dragged = useRef(false);

  return (
    <div ref={host} className={`relative w-full overflow-hidden ${props.className ?? ""}`}>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: the lands within reach are listed below the map. */}
      <canvas
        ref={canvas}
        role="img"
        aria-label={props.title}
        className={`block h-full w-full touch-none transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`}
        onPointerDown={(e) => {
          down.current = { x: e.clientX, y: e.clientY, t: performance.now() };
          dragged.current = false;
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const prev = pointers.current.get(e.pointerId);
          if (!prev) return;
          const w = world.current;
          const all = [...pointers.current.entries()];
          if (all.length >= 2 && w) {
            const [a, b] = all.map(([, p]) => p) as [
              { x: number; y: number },
              { x: number; y: number },
            ];
            const before = Math.hypot(a.x - b.x, a.y - b.y);
            pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            const [c, d] = [...pointers.current.values()] as [
              { x: number; y: number },
              { x: number; y: number },
            ];
            const after = Math.hypot(c.x - d.x, c.y - d.y);
            if (before > 0 && after > 0) w.zoomBy(before / after);
            dragged.current = true;
            return;
          }
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          const start = down.current;
          if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8)
            dragged.current = true;
          if (dragged.current) w?.panBy(e.clientX - prev.x, e.clientY - prev.y);
        }}
        onPointerUp={(e) => pointers.current.delete(e.pointerId)}
        onPointerCancel={(e) => pointers.current.delete(e.pointerId)}
        onWheel={(e) => world.current?.zoomBy(e.deltaY > 0 ? 1.12 : 1 / 1.12)}
        onClick={(e) => {
          const d = down.current;
          down.current = null;
          if (!d || dragged.current) return;
          if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10 || performance.now() - d.t > 600)
            return;
          const r = e.currentTarget.getBoundingClientRect();
          const code = world.current?.pick(e.clientX - r.left, e.clientY - r.top);
          if (code) props.onLand(code);
        }}
      />
      {!ready && <div className="absolute inset-0 animate-pulse bg-night-3" />}
      <div className="pointer-events-none absolute inset-0">
        {props.lands.map((l) => (
          <div key={l.code}>
            <div ref={mark(`name:${l.code}`)} className="absolute left-0 top-0">
              <p
                className={`-ml-14 w-28 text-center font-display text-[10px] font-extrabold uppercase leading-tight tracking-wide [text-shadow:0_1px_2px_rgb(15_27_30),0_0_6px_rgb(15_27_30)] ${l.city !== null ? "text-gold-soft" : "text-cream"}`}
              >
                {l.name}
              </p>
            </div>
            <div ref={mark(`land:${l.code}`)} className="absolute left-0 top-0">
              <button
                type="button"
                aria-label={l.name}
                data-land={l.code}
                onClick={() => props.onLand(l.code)}
                className="pointer-events-auto absolute -left-5 -top-8 flex h-8 w-10 items-end justify-center"
              >
                <span
                  className={`relative flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 font-display text-xs font-extrabold text-cream shadow-lg ring-2 ${l.threatened ? "animate-pulse ring-vermilion" : l.open ? "ring-gold" : "ring-night"}`}
                  style={{ background: props.colors[l.holder ?? ""] ?? "#3A4F50" }}
                >
                  {l.seat !== null ? "⚑" : l.garrison}
                  {l.work && (
                    <span className="absolute -right-3.5 -top-3 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-night/90 ring-1 ring-line">
                      <WorkGlyph
                        kind={l.work.kind}
                        color={props.colors[l.work.family] ?? "#F2E6CF"}
                        ready={l.work.ready}
                        size={14}
                      />
                    </span>
                  )}
                </span>
              </button>
            </div>
          </div>
        ))}
        {props.marches.map((m) => (
          <div key={m.id} ref={mark(`march:${m.id}`)} className="absolute left-0 top-0">
            <span
              className={`-ml-9 -mt-3 block w-[4.5rem] rounded-full py-0.5 text-center font-mono text-[9px] ring-1 ${m.hostile ? "bg-vermilion text-cream ring-vermilion" : "bg-night/85 text-cream ring-line"}`}
            >
              {m.label}
            </span>
          </div>
        ))}
      </div>
      {props.carrier && (
        <CarrierDrag
          origin={origin}
          spots={spots}
          info={props.carrier.info}
          onDrop={props.carrier.onDrop}
          onTap={props.carrier.onTap}
          token={props.carrier.token}
        />
      )}
      {props.children}
    </div>
  );
}

function stateOf(p: Terraferma3DProps) {
  return {
    phase: p.phase,
    still: p.still,
    clockOffset: p.clockOffset,
    lands: p.lands.map((l) => ({
      code: l.code,
      kind: l.kind,
      x: l.x,
      y: l.y,
      holder: l.holder,
      city: l.city,
      seat: l.seat,
    })),
    marches: p.marches.map((m) => ({
      id: m.id,
      family: m.family,
      from: m.from,
      target: m.target,
      startAt: m.startAt,
      arriveAt: m.arriveAt,
    })),
    colors: p.colors,
    focus: p.focus ?? null,
  };
}
