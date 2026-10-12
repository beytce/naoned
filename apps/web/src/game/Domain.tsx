import {
  type PointerEvent as ReactPointerEvent,
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
} from "react";
import { Crest, defaultCrest } from "../art/crest.js";
import {
  type DomainPlot,
  DomainScene,
  type DomainVehicle,
  type DomainWorker,
  type SkyPhase,
  skyPhase,
} from "../art/domain.js";
import { MasteryEmblem } from "../art/mastery.js";
import { ResourceIcon } from "../art/resources.js";
import { GOODS_COLOUR } from "../art/veneto.js";
import { haptic } from "../haptics.js";
import { fr } from "../i18n.js";
import { Big, Label, Sheet, Slab, clock } from "../ui.js";
import { Rations, StockStrip, affordable } from "./Comptoir.js";
import type { GameProps } from "./Game.js";
import { d } from "./format.js";
import { underPoint } from "./gestures.js";
import { OrderFacts, OrderPanel, canServe, total, vehicleName } from "./roadKit.js";
import { store as prefs } from "./store.js";
import type { DeliveryOrderView } from "./types.js";
import { useWide } from "./useWide.js";
import { have, readyOf, workshopState } from "./workshops.js";

/** The domain in real time 3D, loaded with three.js when the counter first shows. */
const Domain3D = lazy(() => import("../domain3d/Domain3D.js"));

/** WebGL on this device, unless the player asked for the drawn domain (`domain2d`). */
const use3d = (() => {
  try {
    if (prefs.get("domain2d") === "1") return false;
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
})();

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
  const wide = useWide();
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
  // The workshop under a point: its bubble or its drawing, or (in 3D) the scene's own picking.
  const picker = useRef<((x: number, y: number) => string | null) | null>(null);
  const readyAt = (x: number, y: number): DomainPlot | null => {
    const id = underPoint(x, y, "data-plot")?.getAttribute("data-plot") ?? picker.current?.(x, y);
    const p = id ? plotsRef.current.find((q) => q.id === id) : undefined;
    return p?.state === "ready" ? p : null;
  };
  const reach = (x: number, y: number) => {
    const p = readyAt(x, y);
    if (p) harvest(p, { sweep: true });
  };
  const begin = (x: number, y: number) => {
    const p = readyAt(x, y);
    if (!p) return false;
    sweep.current = { start: p.id, moved: false, x, y };
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
  const crest = props.account.crest ?? defaultCrest(props.account.id);

  // The vehicles: at the depot (inviting to load when the stock covers an order), or on the road.
  const road = view.road;
  const vehicles: DomainVehicle[] = (road?.vehicles ?? []).map((v) => {
    const dv = road?.deliveries.find((x) => x.vehicleId === v.id && now < x.backAt);
    if (!dv || v.status === "free") {
      return {
        id: v.id,
        type: v.type,
        where: "home",
        progress: 0,
        load: null,
        ready: bestOrders(props, v.id).length > 0,
        stopped: false,
      };
    }
    const out = now < dv.arriveAt;
    const progress = out
      ? (now - dv.departAt) / Math.max(1, dv.arriveAt - dv.departAt)
      : (now - dv.arriveAt) / Math.max(1, dv.backAt - dv.arriveAt);
    return {
      id: v.id,
      type: v.type,
      where: out ? "out" : "back",
      progress: Math.max(0, Math.min(1, progress)),
      load: out ? (GOODS_COLOUR[dv.resource] ?? null) : null,
      ready: false,
      stopped: dv.attack?.pending === true && now <= (dv.attack?.reactBy ?? 0),
    };
  });
  // The workers: one per level of workshop (eight at most), on the rounds of the workshops.
  const rations = view.rations;
  const need: DomainWorker["need"] =
    rations.perDay === 0
      ? "ok"
      : rations.hungryUntil > now
        ? "hungry"
        : have(view, rations.resource) < rations.perDay
          ? "low"
          : "ok";
  const crafts = view.buildings.filter((b) => b.type !== "palazzo");
  const stillMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  const workers: DomainWorker[] = [];
  for (let round = 0; workers.length < Math.min(8, levels) && round < 5; round++) {
    for (const b of crafts) {
      if (workers.length >= 8 || b.level <= round) continue;
      const st = workshopState(props, b);
      workers.push({
        id: `${b.id}-${round}`,
        plot: b.id,
        // Those who ask for less motion see the workers wait at their doors.
        walking: !stillMotion && (st.state === "running" || st.state === "ready"),
        need,
        bubble: workers.length < (need === "hungry" ? 3 : 2),
      });
    }
  }

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
        {use3d ? (
          <Suspense fallback={<div className="aspect-[1/0.82] w-full animate-pulse bg-night-3" />}>
            <Domain3D
              region={view.player.region}
              phase={(prefs.get("domainPhase") as SkyPhase | null) ?? skyPhase(parisHour(now))}
              plots={plots}
              maxPlots={catalog.rules.maxBuildings}
              vehicles={vehicles}
              vehicleLabel={(v) =>
                `${vehicleName(v.type)}, ${v.where === "home" ? fr.game.roadMap.stable.atDepot : v.where === "out" ? t.road.out : t.road.back}`
              }
              onVehicle={(v) => {
                if (v.where === "home") props.setSheet(`load:${v.id}`);
                else props.goTo("routes");
              }}
              workers={workers}
              workerLabel={t.workersLabel}
              onWorker={() => props.setSheet("rations")}
              storeLabel={t.store.label}
              onStore={() => props.setSheet("store")}
              alert={vehicles.some((v) => v.stopped)}
              stock={stock}
              labelOf={describe}
              ratio={wide ? 0.6 : 0.82}
              emptyLabel={t.build}
              title={t.title(view.buildings.length, levels)}
              onPlot={touch}
              onEmpty={() => props.setSheet("buildHere")}
              still={stillMotion}
              onPicker={(f) => {
                picker.current = f;
              }}
              quiet={() => performance.now() < quietUntil.current}
            />
          </Suspense>
        ) : (
          <DomainScene
            region={view.player.region}
            phase={(prefs.get("domainPhase") as SkyPhase | null) ?? skyPhase(parisHour(now))}
            plots={plots}
            maxPlots={catalog.rules.maxBuildings}
            vehicles={vehicles}
            vehicleLabel={(v) =>
              `${vehicleName(v.type)}, ${v.where === "home" ? fr.game.roadMap.stable.atDepot : v.where === "out" ? t.road.out : t.road.back}`
            }
            onVehicle={(v) => {
              if (v.where === "home") props.setSheet(`load:${v.id}`);
              else props.goTo("routes");
            }}
            workers={workers}
            workerLabel={t.workersLabel}
            onWorker={() => props.setSheet("rations")}
            storeLabel={t.store.label}
            onStore={() => props.setSheet("store")}
            alert={vehicles.some((v) => v.stopped)}
            stock={stock}
            labelOf={describe}
            ratio={wide ? 0.6 : 0.82}
            emptyLabel={t.build}
            title={t.title(view.buildings.length, levels)}
            onPlot={touch}
            onEmpty={() => props.setSheet("buildHere")}
            crest={<Crest crest={crest} size={26} />}
            emblem={
              view.mastery.chosen ? (
                <MasteryEmblem code={view.mastery.chosen} size={20} />
              ) : undefined
            }
          />
        )}
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
      <DomainSheets {...props} />
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
  // Orders the stock covers, for a free vehicle: the cart to load first is the one with the best.
  const free = (view.road?.vehicles ?? []).filter((v) => v.status === "free");
  const freeCount = free.length;
  const loadable = [...new Set(free.flatMap((v) => bestOrders(props, v.id).map((o) => o.id)))];
  const best = free
    .map((v) => ({ id: v.id, top: bestOrders(props, v.id)[0] }))
    .filter((x) => x.top)
    .sort((a, b) => (a.top && b.top && total(a.top) > total(b.top) ? -1 : 1))[0]?.id;
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
      {loadable.length > 0 && best && (
        <button
          type="button"
          onClick={() => props.setSheet(`load:${best}`)}
          className="cut flex w-full items-center justify-between gap-3 border border-gold/60 bg-gold/10 px-4 py-2.5 text-left text-sm text-gold transition active:scale-[0.99]"
        >
          <span className="font-semibold">
            {fr.game.domain.loadable(loadable.length, freeCount)}
          </span>
          <span aria-hidden="true">→</span>
        </button>
      )}
      <p className="text-center text-[11px] text-muted">{fr.game.domain.hint}</p>
    </div>
  );
}

/** The open orders a free vehicle can take with the stock, the best paid first. */
function bestOrders(props: GameProps, vehicleId: string): DeliveryOrderView[] {
  const road = props.view.road;
  const v = road?.vehicles.find((x) => x.id === vehicleId);
  const capacity = props.catalog.road?.vehicles.find((x) => x.type === v?.type)?.capacity ?? 0;
  if (!road || !v || v.status !== "free") return [];
  return road.orders
    .filter((o) => props.now >= o.opensAt && canServe(props, o, capacity))
    .sort((a, b) => (total(a) === total(b) ? 0 : total(a) > total(b) ? -1 : 1));
}

/** The sheets the domain opens: loading a vehicle, the store, the workers' rations. */
function DomainSheets(props: GameProps) {
  const [kind, id] = (props.sheet ?? "").split(":");
  const close = () => props.setSheet(null);
  return (
    <>
      <Sheet open={kind === "load" && !!id} onClose={close}>
        {kind === "load" && id && <LoadSheet key={id} vehicleId={id} props={props} />}
      </Sheet>
      <Sheet open={props.sheet === "store"} onClose={close}>
        <div className="space-y-4 pt-6">
          <h3 className="font-display text-xl font-extrabold uppercase">
            {fr.game.domain.store.title}
          </h3>
          <StockStrip {...props} />
          <div className="flex gap-2">
            <Slab
              tone="ghost"
              className="flex-1"
              onClick={() => {
                close();
                props.goTo("marche");
              }}
            >
              {fr.game.domain.store.sell}
            </Slab>
            <Slab
              className="flex-1"
              onClick={() => {
                close();
                props.goTo("routes");
              }}
            >
              {fr.game.domain.store.deliver}
            </Slab>
          </div>
        </div>
      </Sheet>
      <Sheet open={props.sheet === "rations"} onClose={close}>
        <RationsSheet {...props} />
      </Sheet>
    </>
  );
}

/** A free vehicle at the depot: the best orders its load can fill from the stock, then the departure. */
function LoadSheet({ vehicleId, props }: { vehicleId: string; props: GameProps }) {
  const orders = bestOrders(props, vehicleId).slice(0, 3);
  const [chosen, setChosen] = useState<string | null>(null);
  const v = props.view.road?.vehicles.find((x) => x.id === vehicleId);
  const order = props.view.road?.orders.find((o) => o.id === chosen);
  const t = fr.game.domain.load;
  if (order) {
    return (
      <div className="space-y-3">
        <button type="button" className="label text-gold" onClick={() => setChosen(null)}>
          ← {t.back}
        </button>
        <OrderPanel
          o={order}
          props={props}
          vehicleId={vehicleId}
          onDone={() => props.setSheet(null)}
        />
      </div>
    );
  }
  return (
    <div className="space-y-4 pt-2">
      <div>
        <p className="label text-lagoon">{v ? vehicleName(v.type) : ""}</p>
        <h3 className="mt-1 font-display text-2xl font-extrabold uppercase">{t.title}</h3>
      </div>
      {orders.length === 0 ? (
        <p className="text-sm text-cream-dim">{t.none}</p>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setChosen(o.id)}
              className="cut flex w-full items-center gap-3 border border-line bg-night-3 p-3 text-left transition active:scale-[0.99]"
            >
              <ResourceIcon code={o.resource} size={30} />
              <span className="min-w-0 flex-1">
                <span className="block font-display text-sm font-extrabold uppercase">
                  {o.quantity} → {props.names.city(o.city)}
                </span>
                <OrderFacts o={o} props={props} />
              </span>
              <Big className="text-lg text-gold">{d(total(o))}</Big>
            </button>
          ))}
        </div>
      )}
      <Slab
        tone="ghost"
        className="w-full"
        onClick={() => {
          props.setSheet(null);
          props.goTo("routes");
        }}
      >
        {t.all}
      </Slab>
    </div>
  );
}

/** The workers' bread: the rations, and where to get bread. */
function RationsSheet(props: GameProps) {
  const bakery = props.view.buildings.find((b) => b.type === "bakery");
  const t = fr.game.domain.workers;
  return (
    <div className="space-y-4 pt-6">
      <h3 className="font-display text-xl font-extrabold uppercase">{t.title}</h3>
      <Rations {...props} />
      <div className="flex gap-2">
        {bakery && (
          <Slab className="flex-1" onClick={() => props.setSheet(`produce:${bakery.id}`)}>
            {t.bake}
          </Slab>
        )}
        <Slab
          tone="ghost"
          className="flex-1"
          onClick={() => {
            props.setSheet(null);
            props.goTo("marche");
          }}
        >
          {t.buy}
        </Slab>
      </div>
    </div>
  );
}
