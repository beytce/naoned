import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SkyPhase } from "../art/domain.js";
import { WorkGlyph } from "../art/workIcon.js";
import { CarrierDrag, type DropSpot } from "../game/Cargo.js";
import { Glide, wheelFactor } from "../game/pacing.js";
import { type SceneLoop, markRefs, runScene } from "../game/sceneLoop.js";
import type { CampaignLand, CampaignMarch, CampaignWorld } from "./world.js";

type Pt = { x: number; y: number };

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

  const loop = useRef<SceneLoop | null>(null);
  const mark = useMemo(() => markRefs(marks.current, () => loop.current?.poke()), []);
  // Fingers on the map: one pans it, two pinch it; a drag is never a tap. Let go, it glides on.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const dragged = useRef(false);
  const glide = useRef(new Glide());

  useEffect(() => {
    let alive = true;
    let last = 0;
    const wheel = (e: WheelEvent) => {
      const w = world.current;
      const r = canvas.current?.getBoundingClientRect();
      if (!w || !r) return;
      // The map takes the wheel: the page does not scroll under it.
      e.preventDefault();
      glide.current.stop();
      w.zoomAt(
        wheelFactor(e.deltaY, e.deltaMode, e.ctrlKey),
        e.clientX - r.left,
        e.clientY - r.top,
      );
      loop.current?.poke();
    };
    const box = host.current;
    box?.addEventListener("wheel", wheel, { passive: false });
    void import("./world.js").then(({ CampaignWorld }) => {
      if (!alive || !canvas.current || !host.current) return;
      const w = new CampaignWorld(canvas.current);
      world.current = w;
      w.update(stateOf(latest.current));
      loop.current = runScene(host.current, w, {
        marks: marks.current,
        anchorsAt: anchorsAt.current,
        busy: () => (dragged.current && pointers.current.size > 0) || glide.current.active,
        tick: (t) => {
          const dt = last ? Math.min(50, t - last) : 16;
          last = t;
          const move = glide.current.step(dt);
          if (move) w.panBy(move.dx, move.dy);
        },
      });
      setReady(true);
    });
    return () => {
      alive = false;
      box?.removeEventListener("wheel", wheel);
      loop.current?.stop();
      loop.current = null;
      world.current?.dispose();
      world.current = null;
    };
  }, []);

  useEffect(() => {
    world.current?.update(stateOf(props));
    loop.current?.poke();
  });

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
  /** On the map and on the marks over it: a drag may start on a land's badge. */
  const drag = {
    onPointerDown: (e: React.PointerEvent) => {
      if (pointers.current.size === 0) {
        down.current = { x: e.clientX, y: e.clientY, t: performance.now() };
        dragged.current = false;
      }
      glide.current.stop();
      glide.current.track(e.clientX, e.clientY, e.timeStamp);
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    },
    onPointerMove: (e: React.PointerEvent) => {
      const prev = pointers.current.get(e.pointerId);
      const w = world.current;
      if (!prev || !w) return;
      if (pointers.current.size >= 2) {
        const [a, b] = [...pointers.current.values()] as [Pt, Pt];
        const before = {
          d: Math.hypot(a.x - b.x, a.y - b.y),
          x: (a.x + b.x) / 2,
          y: (a.y + b.y) / 2,
        };
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const [c, d] = [...pointers.current.values()] as [Pt, Pt];
        const after = {
          d: Math.hypot(c.x - d.x, c.y - d.y),
          x: (c.x + d.x) / 2,
          y: (c.y + d.y) / 2,
        };
        const r = canvas.current?.getBoundingClientRect();
        if (r && before.d > 0 && after.d > 0)
          w.zoomNow(before.d / after.d, after.x - r.left, after.y - r.top);
        w.panBy(after.x - before.x, after.y - before.y);
        capture(e.pointerId);
        dragged.current = true;
        return;
      }
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const start = down.current;
      if (!dragged.current && start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) {
        dragged.current = true;
        capture(e.pointerId);
      }
      if (dragged.current) {
        w.panBy(e.clientX - prev.x, e.clientY - prev.y);
        glide.current.track(e.clientX, e.clientY, e.timeStamp);
      }
    },
    onPointerUp: (e: React.PointerEvent) => {
      pointers.current.delete(e.pointerId);
      // The last finger lifted after a drag: the map glides on; after a pinch, it stays.
      if (pointers.current.size === 0 && dragged.current) glide.current.release(e.timeStamp);
      else glide.current.stop();
    },
    onPointerCancel: (e: React.PointerEvent) => {
      pointers.current.delete(e.pointerId);
      glide.current.stop();
    },
  };
  // Once a drag starts, the map keeps the pointer (a badge under it is not clicked).
  const capture = (id: number) => {
    try {
      canvas.current?.setPointerCapture(id);
    } catch {
      // The pointer is gone already.
    }
  };

  return (
    <div ref={host} className={`relative w-full overflow-hidden ${props.className ?? ""}`}>
      <canvas
        ref={canvas}
        role="img"
        aria-label={props.title}
        className={`block h-full w-full touch-none transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`}
        {...drag}
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
      <div className="pointer-events-none absolute inset-0" {...drag}>
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
                className="pointer-events-auto absolute -left-5 -top-8 flex h-8 w-10 touch-none items-end justify-center"
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
