import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import { Crest, defaultCrest } from "../art/crest.js";
import { type DomainPlot, DomainScene, skyPhase } from "../art/domain.js";
import { MasteryEmblem } from "../art/mastery.js";
import { haptic } from "../haptics.js";
import { fr } from "../i18n.js";
import { Label, Slab, clock } from "../ui.js";
import { affordable } from "./Comptoir.js";
import type { GameProps } from "./Game.js";
import { underPoint } from "./gestures.js";
import { readyOf, workshopState } from "./workshops.js";

/** How long the golden burst of a new building or level lasts. */
const BURST_MS = 3_000;

function parisHour(now: number): number {
  return Number(
    new Intl.DateTimeFormat("fr-FR", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "Europe/Paris",
    })
      .formatToParts(new Date(now))
      .find((p) => p.type === "hour")?.value ?? 12,
  );
}

/**
 * The merchant's domain at the head of the counter: what they have built, drawn on their land.
 * A touch on a workshop opens it; a touch on an empty plot leads to what can be built.
 */
export function Domain(props: GameProps) {
  const { view, now, catalog } = props;
  // Buildings just built or upgraded since the last view: a golden burst on their plot.
  const seen = useRef<Map<string, number> | null>(null);
  const [bursts, setBursts] = useState<Map<string, number>>(new Map());
  useEffect(() => {
    const levels = new Map(view.buildings.map((b) => [b.id, b.level]));
    const before = seen.current;
    seen.current = levels;
    if (!before) return;
    const grown = [...levels].filter(([id, level]) => (before.get(id) ?? 0) < level);
    if (grown.length === 0) return;
    const at = Date.now();
    setBursts((old) => new Map([...old, ...grown.map(([id]) => [id, at] as const)]));
  }, [view.buildings]);

  // Goods just collected, rising from their plot.
  const [gains, setGains] = useState<Map<string, NonNullable<DomainPlot["gain"]>>>(new Map());
  // A workshop just emptied: its sheet opens once the new view says it may produce again.
  const [restart, setRestart] = useState<string | null>(null);
  useEffect(() => {
    if (!restart) return;
    const b = view.buildings.find((x) => x.id === restart);
    if (!b || b.job) return;
    // Long enough to see the goods rise before the sheet covers the scene.
    const t = setTimeout(() => {
      setRestart(null);
      if (b.canStart > 0) props.setSheet(`produce:${b.id}`);
    }, 900);
    return () => clearTimeout(t);
  }, [restart, view.buildings, props.setSheet]);

  const t = fr.game.domain;
  const plots: DomainPlot[] = view.buildings.map((b) => {
    const st = workshopState(props, b);
    return {
      id: b.id,
      type: b.type,
      level: b.level,
      state: st.state,
      quantity: st.quantity,
      resource: st.resource,
      progress: st.progress,
      left: st.left !== undefined ? clock(st.left) : undefined,
      canUpgrade: b.upgradeCost !== null && affordable(view, b.upgradeCost),
      burst: (bursts.get(b.id) ?? 0) + BURST_MS > Date.now(),
      gain: gains.get(b.id),
      coach: st.state === "ready" ? `harvest-${b.id}` : `produce-${b.id}`,
    };
  });
  const describe = (p: DomainPlot) => {
    const base = `${props.names.building(p.type)}, ${fr.game.level(p.level)}`;
    const res = p.resource ? props.names.resource(p.resource) : "";
    const state =
      p.state === "ready"
        ? t.plot.ready(p.quantity ?? 0, res)
        : p.state === "running"
          ? t.plot.running(p.left ?? "")
          : p.state === "idle"
            ? t.plot.idle
            : p.state === "blocked"
              ? t.plot.blocked(res)
              : "";
    return [base, state, p.canUpgrade ? t.plot.upgrade : ""].filter(Boolean).join(", ");
  };
  // Collects go one after the other (a sweep can reach several workshops in a breath).
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const pending = useRef(new Set<string>());
  const harvest = (p: DomainPlot, opts: { sweep: boolean }) => {
    const b = view.buildings.find((x) => x.id === p.id);
    if (!b || p.state !== "ready" || pending.current.has(b.id)) return;
    pending.current.add(b.id);
    haptic("tap");
    // The goods rise at once, the counting-house confirms behind.
    if (p.resource) {
      const gain = { quantity: p.quantity ?? 0, resource: p.resource, key: Date.now() };
      setGains((old) => new Map([...old, [b.id, gain]]));
      setTimeout(
        () =>
          setGains((old) => {
            const next = new Map(old);
            if (next.get(b.id)?.key === gain.key) next.delete(b.id);
            return next;
          }),
        1_700,
      );
    }
    const emptied = b.job !== null && readyOf(b, now) >= b.job.batches;
    queue.current = queue.current.then(async () => {
      const ok = await props.act({ type: "collect", buildingId: b.id });
      pending.current.delete(b.id);
      // A tap on an emptied workshop leads on to starting it again; a sweep goes on harvesting.
      if (ok && emptied && !opts.sweep) setRestart(b.id);
    });
  };
  const touch = (p: DomainPlot) => {
    if (performance.now() < quietUntil.current) return;
    const b = view.buildings.find((x) => x.id === p.id);
    if (!b) return;
    if (p.state === "ready") return harvest(p, { sweep: false });
    if (p.state === "still" && b.upgradeCost) props.setSheet(`upgrade:${b.id}`);
    else props.setSheet(`produce:${b.id}`);
  };

  // The sweep: a finger set on a ready workshop and drawn across the domain harvests each ready
  // workshop it passes over, leaving a golden trail.
  const sweep = useRef<{ start: string; moved: boolean; x: number; y: number } | null>(null);
  const quietUntil = useRef(0);
  const area = useRef<HTMLDivElement>(null);
  const [trail, setTrail] = useState<{ x: number; y: number }[]>([]);
  const reach = (x: number, y: number) => {
    const el = underPoint(x, y, "data-plot");
    if (el?.getAttribute("data-ready") !== "1") return;
    const p = plotsRef.current.find((q) => q.id === el.getAttribute("data-plot"));
    if (p) harvest(p, { sweep: true });
  };
  const begin = (x: number, y: number) => {
    const el = underPoint(x, y, "data-plot");
    if (el?.getAttribute("data-ready") !== "1") return false;
    sweep.current = { start: el.getAttribute("data-plot") ?? "", moved: false, x, y };
    return true;
  };
  const follow = (x: number, y: number) => {
    const s = sweep.current;
    const box = area.current?.getBoundingClientRect();
    if (!s || !box) return false;
    if (!s.moved && Math.hypot(x - s.x, y - s.y) < 8) return true;
    if (!s.moved) {
      s.moved = true;
      const first = plotsRef.current.find((q) => q.id === s.start);
      if (first) harvest(first, { sweep: true });
    }
    setTrail((old) => [...old.slice(-13), { x: x - box.left, y: y - box.top }]);
    reach(x, y);
    return true;
  };
  const finish = () => {
    if (sweep.current?.moved) quietUntil.current = performance.now() + 400;
    sweep.current = null;
    setTimeout(() => setTrail([]), 220);
  };
  // The handlers of the latest render, for the touch listeners set once.
  const plotsRef = useRef(plots);
  plotsRef.current = plots;
  const hands = useRef({ begin, follow, finish });
  hands.current = { begin, follow, finish };
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    // Touch: the page keeps scrolling unless the finger set out from a ready workshop.
    const start = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t && e.touches.length === 1) hands.current.begin(t.clientX, t.clientY);
    };
    const move = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t && hands.current.follow(t.clientX, t.clientY) && e.cancelable) e.preventDefault();
    };
    const end = () => hands.current.finish();
    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchend", end);
    el.addEventListener("touchcancel", end);
    return () => {
      el.removeEventListener("touchstart", start);
      el.removeEventListener("touchmove", move);
      el.removeEventListener("touchend", end);
      el.removeEventListener("touchcancel", end);
    };
  }, []);
  // Mouse and pen: the same sweep, by pointer.
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    if (begin(e.clientX, e.clientY)) e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "touch") follow(e.clientX, e.clientY);
  };
  const onPointerEnd = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "touch") finish();
  };
  const levels = view.buildings.reduce((n, b) => n + b.level, 0);
  const stock = view.inventory.reduce((n, i) => n + i.available, 0);
  const home = (view.road?.vehicles ?? []).filter((v) => v.status === "free").map((v) => v.type);
  const crest = props.account.crest ?? defaultCrest(props.account.id);

  return (
    <section className="overflow-hidden cut border border-line bg-night-2">
      <div className="flex items-end justify-between gap-3 px-4 pb-2 pt-3">
        <div className="min-w-0">
          <Label className="text-gold">{view.standing.title.current.name}</Label>
          <h2 className="truncate font-display text-lg font-extrabold uppercase leading-tight">
            {t.house(props.account.pseudo ?? "")}
          </h2>
        </div>
        <p className="label shrink-0 text-right">
          {t.workshops(view.buildings.length)}
          <br />
          {t.levels(levels)}
        </p>
      </div>
      <div
        ref={area}
        className="relative"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <DomainScene
          region={view.player.region}
          phase={skyPhase(parisHour(now))}
          plots={plots}
          maxPlots={catalog.rules.maxBuildings}
          vehiclesHome={home}
          stock={stock}
          crest={<Crest crest={crest} size={26} />}
          emblem={
            view.mastery.chosen ? <MasteryEmblem code={view.mastery.chosen} size={20} /> : undefined
          }
          labelOf={describe}
          emptyLabel={t.build}
          title={t.title(view.buildings.length, levels)}
          onPlot={touch}
          onEmpty={() => props.setSheet("buildHere")}
        />
        {trail.length > 1 && (
          <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full">
            <polyline
              points={trail.map((q) => `${q.x},${q.y}`).join(" ")}
              fill="none"
              stroke="rgb(var(--gold-soft))"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.75"
            />
          </svg>
        )}
      </div>
      <DomainBand {...props} />
    </section>
  );
}

/**
 * Under the scene, the one thing to do now: collect everything and start again, or the next
 * batch to come, or start the idle workshops.
 */
function DomainBand(props: GameProps) {
  const { view, now } = props;
  const ready = view.buildings.reduce((n, b) => n + readyOf(b, now), 0);
  const next = view.buildings
    .filter((b) => b.job && readyOf(b, now) < b.job.batches)
    .map((b) => {
      const job = b.job;
      return { b, at: job ? job.startedAt + (readyOf(b, now) + 1) * job.batchMs : 0 };
    })
    .sort((x, y) => x.at - y.at)[0];
  const idle = view.buildings.some((b) => !b.job && b.canStart > 0);
  return (
    <div className="space-y-2 px-3 pb-3 pt-2">
      {ready > 0 ? (
        <Slab
          size="lg"
          className="w-full"
          coach="harvest-all"
          disabled={props.busy}
          onClick={() => props.act({ type: "collectAndRestart" })}
        >
          {fr.game.harvestAll(ready)}
        </Slab>
      ) : idle ? (
        <Slab
          className="w-full"
          tone="lagoon"
          disabled={props.busy}
          onClick={() => props.act({ type: "collectAndRestart" })}
        >
          {fr.game.restartAll}
        </Slab>
      ) : null}
      {next && ready === 0 && (
        <p className="label text-center text-lagoon">
          {fr.game.domain.next(props.names.building(next.b.type), clock(next.at - now))}
        </p>
      )}
      {!next && ready === 0 && !idle && (
        <p className="text-center text-sm text-cream-dim">{fr.game.idleAllHelp}</p>
      )}
      <p className="text-center text-[11px] text-muted">{fr.game.domain.hint}</p>
    </div>
  );
}
