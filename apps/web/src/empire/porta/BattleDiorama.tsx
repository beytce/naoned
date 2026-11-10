import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TILT } from "../../art/plateau/geom.js";
import type { Camera, Viewport } from "../../game/map/geometry.js";
import { haptic } from "../../haptics.js";
import { sound } from "../../sound.js";
import { CloseButton, Slab } from "../../ui.js";
import { useCamera } from "../map/useCamera.js";
import { Guard3D } from "../map3d/Guard.js";
import { groundAt } from "../map3d/camera.js";
import { useCoverBoard } from "../map3d/pause.js";
import type { Battle3DHandle, Impact } from "./Battle3D.js";
import { type BattlePing, PING_MS, useBattleLink } from "./api.js";
import { extentOf, fromChart, toChart } from "./chart.js";
import { RARITY_HEX } from "./colours.js";
import { battleGoal } from "./goal.js";
import {
  HURRY_S,
  type Told,
  type Touched,
  convoyOf,
  isMine,
  marginS,
  moodOf,
  movedWith,
  returnS,
  tell,
  thin,
  wayOf,
  wayS,
} from "./orders.js";
import { errorText, pt } from "./texts.js";
import type { BattleOrder, BattleSnapshot, PlayerUnitView, Rarity } from "./types.js";

const Battle3D = lazy(() => import("./Battle3D.js"));

type Point = { x: number; y: number };

const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1_000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
const live = () => !(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);

/** The header's and the foot's heights the island keeps clear of (px). */
const TOP = 76;
const FOOT = 190;

/** The whole island across the screen, its header above, its bar below. */
const fit = (b: { radius: number; gate: Point }) => (v: Viewport) => {
  const e = extentOf(b);
  const s = Math.min((v.w * 1.25) / e.w, Math.max(80, v.h - TOP - FOOT + 40) / (e.h * TILT));
  const [gx] = toChart(b, b.gate.x, b.gate.y);
  const centred = (v.w - e.w * s) / 2;
  const tx = Math.min(Math.max(centred, 40 - gx * s), v.w - 40 - gx * s);
  return { s, tx, ty: (v.h - 40 - e.h * TILT * s) / 2 + 10 };
};

/** Where a point of the chart falls in the band between the header and the foot. */
const centredOn = (v: Viewport, s: number, X: number, Y: number) => ({
  s,
  tx: v.w / 2 - X * s,
  ty: TOP + (v.h - TOP - FOOT) / 2 - Y * TILT * s,
});

/**
 * The battle's first framing (docs/plan-porta-jeu.md, A7): on one's own vehicles, near enough to
 * see them, far enough for the nearest town with relics to be in sight around them.
 */
const first = (b: BattleSnapshot) => (v: Viewport) => {
  const whole = fit(b)(v);
  const mine = b.units.filter(isMine);
  const pts = mine.length ? mine : [b.gate];
  const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
  const cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
  const [X, Y] = toChart(b, cx, cy);
  const town = b.cities
    .filter((c) => Object.values(c.relics).some((n) => n > 0))
    .sort((p, q) => Math.hypot(p.x - cx, p.y - cy) - Math.hypot(q.x - cx, q.y - cy))[0];
  let s = whole.s * 2;
  if (town) {
    const [TX, TY] = toChart(b, town.x, town.y);
    const need = Math.min(
      (v.w / 2 - 44) / Math.max(1, Math.abs(TX - X)),
      ((v.h - TOP - FOOT) / 2 - 56) / Math.max(1, Math.abs(TY - Y) * TILT),
    );
    s = Math.min(whole.s * 2.4, Math.max(whole.s * 0.95, need));
  }
  return centredOn(v, s, X, Y);
};

/**
 * The battle in the lands of Rome as a diorama (docs/plan-porta-jeu.md, lots A and B): the island
 * and its pieces in 3D under the map's camera, which follows the convoy until the player moves it;
 * a touch says what it orders (a town: « Charger ici », a unit of Rome: « Attaquer », the gate:
 * « Rentrer », the ground: go there), a finger dragged from a vehicle draws its way by steps; the
 * foot tells each vehicle's life, what it does and how long it needs to get back to the gate.
 */
export function BattleDiorama({
  onClose,
  onFail,
}: {
  onClose: () => void;
  /** The 3D failed: the battle goes on in 2D. */
  onFail: () => void;
}) {
  const { battle, order, pings, ping } = useBattleLink(true);
  useCoverBoard(true);
  if (!battle)
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-night" data-battle>
        <span className="h-10 w-10 animate-spin rounded-full border-2 border-info/30 border-t-info" />
      </div>
    );
  return (
    <>
      <BattleFeel battle={battle} />
      <Field
        battle={battle}
        order={order}
        pings={pings}
        ping={ping}
        onClose={onClose}
        onFail={onFail}
      />
    </>
  );
}

/**
 * What the battle sounds and feels like (audit of 4 November, motion M4; docs/plan-porta-jeu.md,
 * B8): a relic taken rings like a coin, a vehicle of mine lost shakes the phone, one out through
 * the gate rolls its cart, the last minute and the battle's end strike the bell, a vehicle that
 * must turn back now buzzes once.
 */
function BattleFeel({ battle }: { battle: BattleSnapshot }) {
  const before = useRef<BattleSnapshot | null>(null);
  const hurried = useRef(new Set<string>());
  useEffect(() => {
    const was = before.current;
    before.current = battle;
    if (!was || was.id !== battle.id) {
      hurried.current.clear();
      return;
    }
    const mineNow = battle.units.filter(isMine);
    const mineWas = new Map(was.units.filter(isMine).map((u) => [u.id, u]));
    for (const u of mineNow) {
      const w = mineWas.get(u.id);
      if (!w) continue;
      if (u.cargo.length > w.cargo.length) {
        sound("coin");
        haptic(u.cargo.at(-1) === "legendary" ? "alarm" : "success");
      }
      if (w.outcome === "in" && (u.outcome === "dead" || u.outcome === "lost")) haptic("alarm");
      if (w.outcome === "in" && u.outcome === "exited") sound("cart");
      if (
        u.outcome === "in" &&
        !u.exiting &&
        marginS(battle, u) < HURRY_S &&
        !hurried.current.has(u.id)
      ) {
        hurried.current.add(u.id);
        haptic("warn");
      }
    }
    const left = battle.endsAtMs - battle.timeMs;
    if (left < 60_000 && was.endsAtMs - was.timeMs >= 60_000) sound("campanile");
    if (!was.over && battle.over) {
      sound("bell");
      haptic("success");
    }
  }, [battle]);
  return null;
}

function Field({
  battle,
  order,
  pings,
  ping,
  onClose,
  onFail,
}: {
  battle: BattleSnapshot;
  order: (o: BattleOrder) => Promise<string | null>;
  pings: BattlePing[];
  ping: (x: number, y: number, kind: BattlePing["kind"]) => void;
  onClose: () => void;
  onFail: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const foot = useRef<HTMLElement>(null);
  const board = useRef<Battle3DHandle | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [marker, setMarker] = useState<{ x: number; y: number; n: number } | null>(null);
  const [word, setWord] = useState<{ x: number; y: number; text: string; n: number } | null>(null);
  const [ghost, setGhost] = useState<Point[] | null>(null);
  const [rangeCenti, setRangeCenti] = useState<number | null>(null);
  const [following, setFollowing] = useState(true);
  const follow = useRef(true);
  const latest = useRef(battle);
  latest.current = battle;
  const moving = live();

  const me = battle.units.filter(isMine);
  const inside = me.filter((u) => u.outcome === "in");
  const convoy = convoyOf(battle);
  // The fighter chosen at the start (its orders move the convoy), and again if the chosen one leaves.
  useEffect(() => {
    if (selected && inside.some((u) => u.id === selected)) return;
    setSelected((inside.find((u) => u.role === "combat") ?? inside[0])?.id ?? null);
  }, [inside, selected]);
  const selRef = useRef(selected);
  selRef.current = selected;
  const sel = inside.find((u) => u.id === selected);
  const moved = useMemo(
    () => (selected ? movedWith(battle, selected).map((u) => u.id) : []),
    [battle, selected],
  );

  const send = useCallback(
    async (o: BattleOrder) => {
      const refused = await order(o);
      setError(refused ? errorText(refused) : null);
    },
    [order],
  );

  // The convoy by default (A1): once a battle, the transport is told to follow its fighter.
  const joinedFor = useRef("");
  useEffect(() => {
    if (joinedFor.current === battle.id) return;
    const { combat, transport } = convoyOf(battle);
    if (!combat || !transport) return;
    joinedFor.current = battle.id;
    const key = `fondaco:convoy:${battle.id}`;
    let done = false;
    try {
      done = sessionStorage.getItem(key) === "1";
      sessionStorage.setItem(key, "1");
    } catch {
      // No storage: told again, harmless.
    }
    if (!done && !transport.follow && !transport.goal)
      void send({ type: "follow", unitId: transport.id, leaderId: combat.id });
  }, [battle, send]);

  const n = useRef(0);
  /** An order told: its ring falls, its word shows, it goes to the server. */
  const issue = useCallback(
    (told: Told | null) => {
      if (!told) return;
      n.current++;
      setWord({ x: told.at.x, y: told.at.y, text: told.word, n: n.current });
      if (told.refused) {
        haptic("warn");
        return;
      }
      setMarker({ x: told.at.x, y: told.at.y, n: n.current });
      haptic("tap");
      for (const o of told.orders) void send(o);
    },
    [send],
  );

  const paint = useCallback((cam: Camera, v: Viewport) => {
    board.current?.view(cam, v);
    const l = layer.current;
    if (l) {
      l.style.setProperty("--s", String(cam.s));
      l.style.setProperty("--tx", `${cam.tx}px`);
      l.style.setProperty("--ty", `${cam.ty}px`);
    }
  }, []);
  /** What lies under a point of the ground (the battle's cases). */
  const pickGround = (b: BattleSnapshot, x: number, y: number): Touched => {
    if (Math.hypot(b.gate.x - x, b.gate.y - y) * 100 <= b.gateRadiusCenti + 20)
      return { kind: "gate" };
    const town = b.cities.find((c) => Math.hypot(c.x - x, c.y - y) * 100 <= b.cityRadiusCenti);
    return town ? { kind: "city", id: town.id } : { kind: "ground", x, y };
  };
  const groundOf = (at: Point): Point => {
    const [X, Y] = groundAt(camera.cam(), camera.view(), at.x, at.y);
    const [x, y] = fromChart(latest.current, X, Y);
    return { x, y };
  };
  const camera = useCamera({
    root,
    initial: first(battle),
    onPaint: paint,
    extent: extentOf(battle),
    bounds: (v) => {
      const s = fit(latest.current)(v).s;
      return { min: s * 0.7, max: s * 5 };
    },
    // A finger held still: a sign for the group where it rests (A9), « danger » on Rome's units.
    onHold: (on) => {
      const at = heldAt.current;
      if (!on || !at) return;
      const b = latest.current;
      const g = groundOf(at);
      const foe = b.units.some(
        (u) => u.side === "rome" && !u.dead && Math.hypot(u.x - g.x, u.y - g.y) < 1.2,
      );
      ping(g.x, g.y, foe ? "danger" : "here");
      haptic("tap");
    },
    onTap: (at) => {
      const b = latest.current;
      // A piece under the finger: one of mine is chosen, one of Rome's attacked.
      const piece = board.current?.pick(at.x, at.y) ?? null;
      if (piece?.kind === "mine") {
        setSelected(piece.id);
        haptic("tap");
        return;
      }
      const chosen = selRef.current;
      if (!chosen) return;
      if (piece?.kind === "rome") {
        issue(tell(b, chosen, { kind: "rome", id: piece.id }));
        return;
      }
      const g = groundOf(at);
      issue(tell(b, chosen, pickGround(b, g.x, g.y)));
    },
  });
  const heldAt = useRef<Point | null>(null);
  const camRef = useRef(camera);
  camRef.current = camera;
  const onBoard = useCallback((h: Battle3DHandle | null) => {
    board.current = h;
    if (h) camRef.current.repaint();
  }, []);

  // The camera follows the chosen vehicle and those that go with it, until the player moves it
  // (A7); and the arrows at the screen's edge point to my vehicles out of sight.
  const edges = useRef(new Map<string, HTMLButtonElement>());
  const handles = useRef(new Map<string, HTMLDivElement>());
  const movedRef = useRef(moved);
  movedRef.current = moved;
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let down: Point | null = null;
    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement | null)?.closest?.("[data-drag-handle]")) return;
      down = { x: e.clientX, y: e.clientY };
      const r = el.getBoundingClientRect();
      heldAt.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onMove = (e: PointerEvent) => {
      if (!down || !follow.current) return;
      if (Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y) < 12) return;
      follow.current = false;
      setFollowing(false);
    };
    const onUp = () => {
      down = null;
    };
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    let id = 0;
    const tick = () => {
      id = requestAnimationFrame(tick);
      const b = latest.current;
      const h = board.current;
      const cam = camRef.current;
      if (!h) return;
      const c = cam.cam();
      const v = cam.view();
      const footH = foot.current?.offsetHeight ?? FOOT - 20;
      // My vehicles' places on the screen: their handles over them, their arrows at the edge.
      for (const u of b.units) {
        if (!isMine(u)) continue;
        const p = h.placeOf(u.id);
        const handle = handles.current.get(u.id);
        const edge = edges.current.get(u.id);
        const on = u.outcome === "in" && !!p;
        if (handle) handle.style.display = on ? "" : "none";
        if (!on || !p) {
          if (edge) edge.style.display = "none";
          continue;
        }
        const sx = c.tx + p[0] * c.s;
        const sy = c.ty + p[1] * TILT * c.s;
        if (handle) handle.style.transform = `translate(${sx - 26}px, ${sy - 40}px)`;
        if (!edge) continue;
        const pad = 30;
        const lo = TOP + 8;
        const hi = v.h - footH - 34;
        const ex = Math.min(v.w - pad, Math.max(pad, sx));
        const ey = Math.min(hi, Math.max(lo, sy - 14));
        const out = sx < 0 || sx > v.w || sy < lo - 20 || sy > hi + 40;
        edge.style.display = out ? "" : "none";
        if (out) {
          const turn = Math.atan2(sy - ey, sx - ex);
          edge.style.transform = `translate(${ex - 22}px, ${ey - 22}px)`;
          edge.style.setProperty("--turn", `${turn}rad`);
        }
      }
      if (!follow.current || down || cam.animating()) return;
      const ids = movedRef.current;
      const pts = ids.map((i) => h.placeOf(i)).filter((p): p is [number, number] => !!p);
      if (pts.length === 0) return;
      const X = pts.reduce((a, p) => a + p[0], 0) / pts.length;
      const Y = pts.reduce((a, p) => a + p[1], 0) / pts.length;
      const want = centredOn({ ...v, h: v.h - (footH - (FOOT - 20)) }, c.s, X, Y);
      const dx = want.tx - c.tx;
      const dy = want.ty - c.ty;
      if (Math.abs(dx) + Math.abs(dy) < 0.6) return;
      const k = moving ? 0.07 : 1;
      cam.jumpTo({ ...c, tx: c.tx + dx * k, ty: c.ty + dy * k });
    };
    id = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(id);
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [moving]);

  // A way drawn with the finger from a vehicle (A3, A4): its ghost while the finger is down, the
  // eyes of Rome it crosses lit; lifted, the vehicle is told its way by steps.
  const draw = useRef<{ id: string; from: Point; at: Point; path: Point[]; drawn: boolean } | null>(
    null,
  );
  const onHandleDown = (u: PlayerUnitView) => (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    draw.current = {
      id: u.id,
      from: { x: u.x, y: u.y },
      at: { x: e.clientX, y: e.clientY },
      path: [],
      drawn: false,
    };
  };
  const onHandleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = draw.current;
    const el = root.current;
    if (!d || !el) return;
    if (!d.drawn && Math.abs(e.clientX - d.at.x) + Math.abs(e.clientY - d.at.y) < 12) return;
    if (!d.drawn) {
      d.drawn = true;
      setSelected(d.id);
    }
    const r = el.getBoundingClientRect();
    const g = groundOf({ x: e.clientX - r.left, y: e.clientY - r.top });
    const lastPoint = d.path.at(-1) ?? d.from;
    if (Math.hypot(g.x - lastPoint.x, g.y - lastPoint.y) < 0.25) return;
    d.path.push(g);
    setGhost([d.from, ...thin(d.path, 6)]);
  };
  const onHandleUp = () => {
    const d = draw.current;
    draw.current = null;
    setGhost(null);
    if (!d) return;
    if (!d.drawn) {
      setSelected(d.id);
      haptic("tap");
      return;
    }
    const way = thin(d.path, 6);
    const end = way.at(-1);
    if (!end) return;
    const b = latest.current;
    // Its end on a town or the gate says the same as a touch there; its steps before it.
    const told = tell(b, d.id, pickGround(b, end.x, end.y));
    const head = told?.orders[0];
    if (told && head?.type === "move" && way.length > 1) {
      const steps = [...way.slice(0, -1), { x: head.x, y: head.y }];
      const step = steps[0] as Point;
      const rest = steps.slice(1);
      issue({ ...told, orders: [{ type: "move", unitId: d.id, x: step.x, y: step.y, via: rest }] });
    } else issue(told);
  };

  // A relic taken (B6): once it has leapt on the mule, its gem flies to the goal at the top.
  const holds = useRef(new Map<string, number>());
  useEffect(() => {
    for (const u of battle.units) {
      if (!isMine(u)) continue;
      const was = holds.current.get(u.id);
      holds.current.set(u.id, u.cargo.length);
      if (was === undefined || u.cargo.length <= was || !moving) continue;
      const p = board.current?.placeOf(u.id);
      const to = document.querySelector("[data-battle-gems]")?.getBoundingClientRect();
      if (!p || !to) continue;
      const c = camRef.current.cam();
      const x0 = c.tx + p[0] * c.s - 7;
      const y0 = c.ty + p[1] * TILT * c.s - 46;
      const x1 = to.left + 2;
      const y1 = to.top;
      const el = document.createElement("span");
      el.setAttribute("aria-hidden", "true");
      el.style.cssText = `position:fixed;left:0;top:0;z-index:60;width:14px;height:14px;border-radius:3px;pointer-events:none;background:${RARITY_HEX[u.cargo.at(-1) as Rarity]};box-shadow:0 0 0 2px #fff`;
      document.body.append(el);
      const flight = el.animate(
        [
          { transform: `translate(${x0}px,${y0}px) rotate(45deg) scale(0.4)`, opacity: 0 },
          {
            transform: `translate(${x0}px,${y0 - 18}px) rotate(45deg) scale(1.9)`,
            opacity: 1,
            offset: 0.18,
          },
          {
            transform: `translate(${(x0 + x1) / 2}px,${Math.min(y0, y1) + Math.abs(y0 - y1) * 0.35}px) rotate(225deg) scale(1.6)`,
            opacity: 1,
            offset: 0.6,
          },
          { transform: `translate(${x1}px,${y1}px) rotate(405deg) scale(0.9)`, opacity: 1 },
        ],
        { duration: 900, delay: 620, easing: "cubic-bezier(0.4, 0, 0.2, 1)", fill: "backwards" },
      );
      flight.onfinish = () => el.remove();
      flight.oncancel = () => el.remove();
    }
  }, [battle, moving]);

  // A heavy blow, a piece broken: the island shakes a little, the phone with it.
  const onImpact = useCallback(
    (kind: Impact) => {
      if (kind === "mine") haptic("alarm");
      const el = stage.current;
      if (!el || !moving || kind === "rome") return;
      const k = kind === "mine" ? 7 : 4;
      el.animate(
        [
          { transform: "translate(0,0)" },
          { transform: `translate(${k}px,${-k * 0.6}px)` },
          { transform: `translate(${-k * 0.7}px,${k * 0.5}px)` },
          { transform: `translate(${k * 0.3}px,${-k * 0.2}px)` },
          { transform: "translate(0,0)" },
        ],
        { duration: 260, easing: "ease-out" },
      );
    },
    [moving],
  );

  const allOut = me.every((u) => u.outcome !== "in");
  const left = battle.endsAtMs - battle.timeMs;
  const closing = left < 60_000;
  const way = sel ? wayOf(sel) : [];
  const wayEnd = way.at(-1);
  const hurry = inside.some((u) => !u.exiting && marginS(battle, u) < HURRY_S);
  const full =
    !!convoy.transport &&
    convoy.transport.cargo.length >= convoy.transport.capacity &&
    !convoy.transport.exiting;
  const goHome = () => {
    if (sel) issue(tell(battle, sel.id, { kind: "gate" }));
  };
  const recentre = () => {
    follow.current = true;
    setFollowing(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#E9E6E0]" data-battle={battle.id}>
      <div ref={root} className="absolute inset-0 touch-none select-none">
        <div ref={stage} className="absolute inset-0">
          <Guard3D onFail={onFail}>
            <Suspense fallback={null}>
              <Battle3D
                ref={onBoard}
                battle={battle}
                selected={sel?.id ?? null}
                moved={moved}
                ghost={ghost}
                marker={marker}
                rangeCenti={rangeCenti}
                live={moving}
                onImpact={onImpact}
              />
            </Suspense>
          </Guard3D>
          {/* Over the ground, to the pixel: the towns' relics, the orders' words, the blows. */}
          <div ref={layer} className="pointer-events-none absolute inset-0" data-battle-layer>
            {battle.cities.map((c) => (
              <CityPin
                key={c.id}
                battle={battle}
                city={c}
                onPress={() => sel && issue(tell(battle, sel.id, { kind: "city", id: c.id }))}
              />
            ))}
            <Pinned battle={battle} x={battle.gate.x} y={battle.gate.y} lift={-70}>
              <button
                type="button"
                data-battle-gate
                onClick={(e) => {
                  e.stopPropagation();
                  goHome();
                }}
                className="pointer-events-auto min-h-11 rounded-full bg-white px-3.5 font-place text-sm font-black leading-tight text-cream shadow-[0_3px_0_rgb(23_21_15/0.18)]"
              >
                {pt.gate}
              </button>
            </Pinned>
            {/* The chosen one's way: how long it takes, at its end. */}
            {sel && wayEnd && (
              <Pinned battle={battle} x={wayEnd.x} y={wayEnd.y} lift={22}>
                <span className="rounded-full bg-face px-2 py-0.5 font-display text-xs font-extrabold tabular-nums text-white">
                  {pt.seconds(Math.ceil(wayS(sel, way)))}
                </span>
              </Pinned>
            )}
            {ghost && ghost.length > 1 && sel && (
              <Pinned
                battle={battle}
                x={(ghost.at(-1) as Point).x}
                y={(ghost.at(-1) as Point).y}
                lift={-34}
              >
                <span className="rounded-full bg-face px-2 py-0.5 font-display text-xs font-extrabold tabular-nums text-white">
                  {pt.seconds(Math.ceil(wayS(sel, ghost.slice(1))))}
                </span>
              </Pinned>
            )}
            {word && (
              <Pinned key={word.n} battle={battle} x={word.x} y={word.y} lift={-30}>
                <span className="battle-word block whitespace-nowrap rounded-full bg-[#17150F] px-3 py-1 font-display text-sm font-extrabold text-white shadow-[0_3px_0_#000]">
                  {word.text}
                </span>
              </Pinned>
            )}
            {pings
              .filter((x) => performance.now() - x.at < PING_MS)
              .map((x) => (
                <Pinned key={x.at} battle={battle} x={x.x} y={x.y}>
                  <span
                    className="battle-ping relative flex h-12 w-12 items-center justify-center"
                    data-battle-ping={x.kind}
                  >
                    <span
                      className={`absolute inset-0 rounded-full border-[3px] ${x.kind === "danger" ? "border-[#C23B2E]" : "border-[#17150F]"}`}
                    />
                    <span
                      className={`absolute -top-6 whitespace-nowrap rounded-full px-2 py-0.5 font-display text-xs font-extrabold text-white ${x.kind === "danger" ? "bg-face" : "bg-[#17150F]"}`}
                    >
                      {x.kind === "danger" ? pt.pingDanger : pt.pingHere}
                    </span>
                  </span>
                </Pinned>
              ))}
            <Signs battle={battle} />
            <Damage battle={battle} />
          </div>
          {/* My vehicles under the finger: touched to choose one, dragged to draw its way. */}
          <div className="pointer-events-none absolute inset-0">
            {inside.map((u) => (
              <div
                key={u.id}
                ref={(el) => {
                  if (el) handles.current.set(u.id, el);
                  else handles.current.delete(u.id);
                }}
                data-drag-handle
                data-battle-handle={u.role}
                onPointerDown={onHandleDown(u)}
                onPointerMove={onHandleMove}
                onPointerUp={onHandleUp}
                onPointerCancel={onHandleUp}
                className="pointer-events-auto absolute left-0 top-0 h-[52px] w-[52px] touch-none rounded-full"
              />
            ))}
          </div>
        </div>
        {/* My vehicles out of sight: an arrow at the edge, red under fire; touched, it is chosen. */}
        {inside.map((u) => (
          <button
            key={u.id}
            type="button"
            ref={(el) => {
              if (el) edges.current.set(u.id, el);
              else edges.current.delete(u.id);
            }}
            style={{ display: "none" }}
            onClick={(e) => {
              e.stopPropagation();
              setSelected(u.id);
              recentre();
            }}
            aria-label={u.role === "combat" ? pt.combat : pt.transport}
            data-battle-edge={u.id}
            className={`absolute left-0 top-0 z-10 flex h-11 w-11 items-center justify-center rounded-full shadow-[0_3px_0_rgb(23_21_15/0.25)] ${moodOf(battle, u) === "fire" ? "battle-alarm bg-face text-white" : "bg-white text-cream"}`}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              className="battle-edge"
              aria-hidden="true"
            >
              <path d="M5 3 L16 10 L5 17 Z" fill="currentColor" />
            </svg>
          </button>
        ))}
      </div>

      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <GoalPill battle={battle} />
        <div
          className={`rounded-full px-5 py-1.5 text-center text-white ${closing ? "battle-alarm bg-face shadow-[0_4px_0_rgb(var(--face-deep))]" : "bg-[#17150F] shadow-[0_4px_0_#000]"}`}
        >
          <p className="text-[0.625rem] font-bold leading-tight opacity-80">{pt.timer}</p>
          <p
            className="font-display text-xl font-black leading-none tabular-nums"
            data-battle-timer
          >
            {clock(left)}
          </p>
        </div>
        <div className="pointer-events-auto">
          <CloseButton onClick={onClose} />
        </div>
      </header>

      {/* The camera: the whole island at a touch, or given back to the convoy once it has been
        moved (a button, never a double touch: the first of two touches would be an order). */}
      {!allOut && (
        <button
          type="button"
          onClick={() => {
            if (following) {
              follow.current = false;
              setFollowing(false);
              camera.easeTo(fit(latest.current));
            } else {
              recentre();
              camera.easeTo(first(latest.current));
            }
          }}
          aria-label={following ? pt.wholeIsland : pt.recenter}
          data-battle-view={following ? "whole" : "recentre"}
          className="absolute right-3 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white text-cream shadow-[0_3px_0_rgb(23_21_15/0.18)]"
          style={{ bottom: (foot.current?.offsetHeight ?? FOOT) + 24 }}
        >
          {following ? (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
              <path
                d="M3 8V3h5M14 3h5v5M19 14v5h-5M8 19H3v-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="5.5" stroke="currentColor" strokeWidth="2" />
              <circle cx="11" cy="11" r="1.6" fill="currentColor" />
              <path
                d="M11 1v4M11 17v4M1 11h4M17 11h4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>
      )}

      <footer
        ref={foot}
        className="absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 mx-auto max-w-3xl rounded-[1.75rem] bg-white p-2.5 shadow-[0_4px_0_rgb(23_21_15/0.07),0_14px_40px_rgb(23_21_15/0.12)]"
      >
        {battle.over || allOut ? (
          <div className="flex items-center justify-between gap-3" data-battle-over>
            <p className="text-sm text-cream">{battle.over ? pt.over : pt.out}</p>
            <Slab tone="gold" size="sm" onClick={onClose}>
              {pt.backToMap}
            </Slab>
          </div>
        ) : (
          <>
            <div className="flex items-stretch gap-1.5">
              {me.map((u, i) => (
                <div key={u.id} className="contents">
                  {i === 1 && convoy.combat && convoy.transport && (
                    <button
                      type="button"
                      data-battle-convoy={convoy.joined ? "joined" : "apart"}
                      aria-label={convoy.joined ? pt.split : pt.regroup}
                      title={convoy.joined ? pt.split : pt.regroup}
                      onClick={() => {
                        const { combat, transport, joined } = convoyOf(latest.current);
                        if (!combat || !transport) return;
                        haptic("tap");
                        void send(
                          joined
                            ? { type: "stop", unitId: transport.id }
                            : { type: "follow", unitId: transport.id, leaderId: combat.id },
                        );
                      }}
                      className={`flex w-9 shrink-0 items-center justify-center self-center rounded-full py-2.5 transition active:translate-y-0.5 ${convoy.joined ? "ink-pill" : "bg-night-4 text-cream-dim"}`}
                    >
                      <Link joined={convoy.joined} />
                    </button>
                  )}
                  <UnitCard
                    battle={battle}
                    u={u}
                    chosen={u.id === sel?.id}
                    along={u.id !== sel?.id && moved.includes(u.id)}
                    onChoose={() => {
                      setSelected(u.id);
                      recentre();
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              {sel?.actives.map((a) => (
                <ActiveButton
                  key={a.componentId}
                  a={a}
                  t={battle.timeMs}
                  onHold={(on) => setRangeCenti(on && a.rangeCenti > 0 ? a.rangeCenti : null)}
                  onPress={() =>
                    void send({ type: "activate", unitId: sel.id, componentId: a.componentId })
                  }
                />
              ))}
              {(sel?.actives.length ?? 0) === 0 && (
                <p
                  className="min-w-0 flex-1 pl-2 text-xs leading-snug text-cream-dim"
                  data-battle-hint
                >
                  {sel && moved.length > 1 ? pt.convoyHint : pt.aloneHint}
                </p>
              )}
              {(sel?.actives.length ?? 0) > 0 && <span className="flex-1" />}
              {sel && !sel.exiting && (
                <Slab
                  tone={hurry || full ? "gold" : "ghost"}
                  size="md"
                  onClick={goHome}
                  coach="battle-home"
                >
                  {pt.told.exit}
                </Slab>
              )}
            </div>
            {error && (
              <p className="mt-1 text-xs font-semibold text-vermilion" role="alert">
                {error}
              </p>
            )}
          </>
        )}
      </footer>
    </div>
  );
}

/** The goal always in sight, in one pill: a gem a relic (out, aboard, in a town), and the count. */
function GoalPill({ battle }: { battle: BattleSnapshot }) {
  const g = battleGoal(battle);
  const all = g.home.length + g.aboard.length + g.left.length;
  const shown = [
    ...g.home.map((r) => ({ r, s: "home" as const })),
    ...g.aboard.map((r) => ({ r, s: "aboard" as const })),
    ...g.left.map((r) => ({ r, s: "left" as const })),
  ].slice(0, 12);
  return (
    <div
      className="pointer-events-auto flex min-w-0 max-w-[13.5rem] flex-1 flex-col gap-1 rounded-[1.4rem] bg-white px-3.5 py-2 shadow-[0_3px_0_rgb(23_21_15/0.1)]"
      data-battle-goal={`${g.home.length}/${all}`}
      aria-label={pt.relicsOut(g.home.length, all)}
    >
      <p className="flex items-baseline justify-between gap-2">
        <span className="truncate font-place text-xs font-black leading-tight text-cream-dim">
          {pt.tier(battle.tier)}
        </span>
        <span className="font-display text-sm font-extrabold tabular-nums text-cream">
          {g.home.length}/{all}
        </span>
      </p>
      <span className="flex flex-wrap gap-1" aria-hidden="true" data-battle-gems>
        {shown.map((x, i) => (
          <svg
            // biome-ignore lint/suspicious/noArrayIndexKey: gems alike
            key={i}
            viewBox="0 0 12 12"
            width="13"
            height="13"
            aria-hidden="true"
          >
            <path
              d="M6 1 L11 6 L6 11 L1 6 Z"
              fill={x.s === "left" ? "none" : RARITY_HEX[x.r]}
              fillOpacity={x.s === "aboard" ? 0.45 : 1}
              stroke={RARITY_HEX[x.r]}
              strokeWidth="1.6"
            />
          </svg>
        ))}
      </span>
    </div>
  );
}

const relicsOf = (c: BattleSnapshot["cities"][number]): Rarity[] =>
  (Object.entries(c.relics) as [Rarity, number][]).flatMap(([k, n]) =>
    Array.from({ length: n }, () => k),
  );

/** A town's pill: its relics still there; the incendiary's fire counted down over it. */
function CityPin({
  battle,
  city,
  onPress,
}: {
  battle: BattleSnapshot;
  city: BattleSnapshot["cities"][number];
  onPress: () => void;
}) {
  const relics = relicsOf(city);
  // The incendiary burning here: the seconds before its relics are lost.
  const fire = battle.units.find(
    (u) =>
      u.side === "rome" &&
      !u.dead &&
      (u.burning ?? 0) > 0 &&
      Math.hypot(u.x - city.x, u.y - city.y) < 1.5,
  );
  const burnLeft =
    fire && fire.side === "rome" && fire.burnS
      ? Math.max(0, Math.ceil(fire.burnS - (fire.burning ?? 0) / 1_000))
      : null;
  return (
    <Pinned battle={battle} x={city.x} y={city.y} lift={-104}>
      <button
        type="button"
        data-battle-city={city.id}
        onClick={(e) => {
          e.stopPropagation();
          onPress();
        }}
        className="pointer-events-auto flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-full bg-white px-2.5 shadow-[0_3px_0_rgb(23_21_15/0.18)]"
        aria-label={pt.cityRelics(relics)}
      >
        {relics.length === 0 ? (
          <span className="text-xs text-cream-dim">—</span>
        ) : (
          relics.map((k, i) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: relics of a rarity are alike
              key={i}
              className="h-3 w-3 rotate-45 rounded-[2px]"
              style={{ background: RARITY_HEX[k] }}
            />
          ))
        )}
        {burnLeft !== null && relics.length > 0 && (
          <span className="battle-alarm ml-1 rounded-full bg-face px-1.5 py-0.5 font-display text-xs font-extrabold tabular-nums text-white">
            {burnLeft} s
          </span>
        )}
      </button>
    </Pinned>
  );
}

/** An HTML element over a point of the battle's ground, `lift` px above it, following the camera. */
function Pinned({
  battle,
  x,
  y,
  lift = 0,
  children,
}: {
  battle: BattleSnapshot;
  x: number;
  y: number;
  lift?: number;
  children: React.ReactNode;
}) {
  const [X, Y] = toChart(battle, x, y);
  return (
    <div
      className="absolute left-0 top-0"
      style={{
        transform: `translate(calc(var(--tx) + ${X}px * var(--s)), calc(var(--ty) + ${Y * TILT}px * var(--s) + ${lift}px)) translate(-50%, -50%)`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Rome's signs over its units (A5): « ! » when one catches sight of a vehicle of mine, « ? » when
 * it loses it. Each a moment.
 */
function Signs({ battle }: { battle: BattleSnapshot }) {
  const [shown, setShown] = useState<{ key: string; id: string; text: string; at: number }[]>([]);
  const before = useRef(new Map<string, string | null>());
  useEffect(() => {
    const now = performance.now();
    const mine = new Set(battle.units.filter(isMine).map((u) => u.id));
    const fresh: typeof shown = [];
    for (const u of battle.units) {
      if (u.side !== "rome" || u.dead) continue;
      const was = before.current.get(u.id);
      before.current.set(u.id, u.targetId);
      if (was === undefined || was === u.targetId) continue;
      if (u.targetId && mine.has(u.targetId))
        fresh.push({ key: `${battle.timeMs}:${u.id}`, id: u.id, text: "!", at: now });
      else if (!u.targetId && was && mine.has(was))
        fresh.push({ key: `${battle.timeMs}:${u.id}`, id: u.id, text: "?", at: now });
    }
    if (fresh.length === 0) return;
    setShown((s) => [...s.filter((x) => now - x.at < 1_400), ...fresh].slice(-10));
  }, [battle]);
  const byId = new Map(battle.units.map((u) => [u.id, u]));
  const now = performance.now();
  return (
    <>
      {shown
        .filter((x) => now - x.at < 1_400)
        .map((x) => {
          const u = byId.get(x.id);
          if (!u) return null;
          return (
            <Pinned key={x.key} battle={battle} x={u.x} y={u.y} lift={-58}>
              <span
                className={`battle-sign flex h-7 w-7 items-center justify-center rounded-full font-display text-base font-black shadow-[0_3px_0_rgb(23_21_15/0.3)] ${x.text === "!" ? "bg-face text-white" : "bg-white text-cream"}`}
              >
                {x.text}
              </span>
            </Pinned>
          );
        })}
    </>
  );
}

/**
 * The damage, told once a second for each target (B4): the blows of a weapon that strikes at every
 * beat add up into one figure, rising over its target and fading.
 */
function Damage({ battle }: { battle: BattleSnapshot }) {
  const [shown, setShown] = useState<
    { key: string; x: number; y: number; n: number; mine: boolean; at: number }[]
  >([]);
  const sums = useRef(new Map<string, number>());
  useEffect(() => {
    for (const e of battle.events)
      if (e.kind === "hit") sums.current.set(e.to, (sums.current.get(e.to) ?? 0) + e.damage);
    if (battle.timeMs % 1_000 >= battle.stepMs || sums.current.size === 0) return;
    const byId = new Map(battle.units.map((u) => [u.id, u]));
    const now = performance.now();
    const fresh = [...sums.current].flatMap(([id, n]) => {
      const to = byId.get(id);
      if (!to || n < 1) return [];
      const mine = to.side === "player" && to.mine;
      return [{ key: `${battle.timeMs}:${id}`, x: to.x, y: to.y, n, mine, at: now }];
    });
    sums.current.clear();
    setShown((s) => [...s.filter((x) => now - x.at < 900), ...fresh].slice(-16));
  }, [battle]);
  return (
    <>
      {shown.map((d) => (
        <Pinned key={d.key} battle={battle} x={d.x} y={d.y} lift={-52}>
          <span
            className={`battle-damage block font-display font-black tabular-nums [text-shadow:0_1px_0_#fff,0_-1px_0_#fff,1px_0_0_#fff,-1px_0_0_#fff] ${d.mine ? "text-base text-vermilion" : "text-sm text-cream"}`}
          >
            −{Math.round(d.n)}
          </span>
        </Pinned>
      ))}
    </>
  );
}

/** The convoy's link between the two cards: closed when the transport follows, open when apart. */
function Link({ joined }: { joined: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="1.5" y="6" width="8" height="6" rx="3" stroke="currentColor" strokeWidth="2" />
      <rect
        x={joined ? 8.5 : 10.5}
        y="6"
        width="8"
        height="6"
        rx="3"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray={joined ? undefined : "3 2.5"}
        transform={joined ? undefined : "translate(-2 0)"}
      />
    </svg>
  );
}

/** A vehicle's sign on its card: the fighter's lance and shield, the transport's chest. */
function UnitSign({ role }: { role: "combat" | "transport" }) {
  return role === "combat" ? (
    <svg width="16" height="16" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M4 4h9v6.5c0 3-2 5.5-4.5 6.5C6 16 4 13.5 4 10.5Z" fill="currentColor" />
      <path d="M15 19 19 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M3 10h16v8H3Z" fill="currentColor" />
      <path d="M3 10c0-3.5 2.5-6 5-6h6c2.5 0 5 2.5 5 6" stroke="currentColor" strokeWidth="2" />
      <path d="M11 11.5 13 14l-2 2.5L9 14Z" fill="#fff" />
    </svg>
  );
}

/**
 * One of my vehicles at the foot (A6, A8): its sign, its life in a bar, what it does in a word, how
 * long it needs to get back to the gate — in the accent once it must turn back now.
 */
function UnitCard({
  battle,
  u,
  chosen,
  along,
  onChoose,
}: {
  battle: BattleSnapshot;
  u: PlayerUnitView;
  chosen: boolean;
  along: boolean;
  onChoose: () => void;
}) {
  const inside = u.outcome === "in";
  const share = Math.max(0, Math.min(1, u.hp / Math.max(1, u.maxHp)));
  const mood = moodOf(battle, u);
  const margin = marginS(battle, u);
  const late = inside && !u.exiting && margin < HURRY_S;
  const back = Math.ceil(returnS(battle, u));
  const doing =
    mood === "loading" && u.loading
      ? pt.loadingS(Math.max(0, Math.ceil((u.loading.doneAt - battle.timeMs) / 1_000)))
      : (pt.mood[mood] ?? "");
  const state = !inside
    ? pt.outcome[u.outcome]
    : late
      ? margin < 0
        ? pt.tooLate
        : pt.hurry
      : doing;
  return (
    <button
      type="button"
      onClick={onChoose}
      disabled={!inside}
      data-battle-unit={u.id}
      data-battle-mood={inside ? mood : u.outcome}
      data-battle-cargo={u.cargo.length}
      aria-pressed={chosen}
      className={`flex min-h-[4.25rem] min-w-0 flex-1 flex-col justify-center gap-1 rounded-[1.25rem] px-2.5 py-2 text-left transition active:translate-y-0.5 disabled:opacity-55 ${chosen ? "ink-pill" : along ? "bg-night-4 text-cream shadow-[inset_0_0_0_2px_rgb(var(--cream))]" : "bg-night-4 text-cream"}`}
    >
      <span className="flex items-center gap-1.5">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${inside && mood === "fire" ? "battle-alarm bg-face text-white" : chosen ? "bg-white/15" : "bg-white text-cream"}`}
        >
          <UnitSign role={u.role} />
        </span>
        <span className="min-w-0 flex-1 truncate font-display text-sm font-extrabold leading-tight">
          {u.role === "combat" ? pt.combat : pt.transport}
        </span>
        {u.role === "transport" && (
          <span
            className="flex shrink-0 items-center gap-1"
            aria-label={pt.cargo(u.cargo.length, u.capacity)}
          >
            {Array.from({ length: u.capacity }, (_, i) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: the places of the hold
                key={i}
                className="h-2.5 w-2.5 rotate-45 rounded-[2px]"
                style={{
                  background: u.cargo[i] ? RARITY_HEX[u.cargo[i] as Rarity] : "transparent",
                  boxShadow: u.cargo[i] ? "none" : "inset 0 0 0 1.5px currentColor",
                  opacity: u.cargo[i] ? 1 : 0.45,
                }}
              />
            ))}
          </span>
        )}
      </span>
      <span
        className={`block h-1.5 overflow-hidden rounded-full ${chosen ? "bg-white/25" : "bg-[#DDD7CD]"}`}
        role="meter"
        aria-valuenow={u.hp}
        aria-valuemin={0}
        aria-valuemax={u.maxHp}
        aria-label={pt.life}
      >
        <span
          className="block h-full rounded-full transition-[width] duration-300"
          style={{
            width: `${share * 100}%`,
            background: share > 0.5 ? (chosen ? "#fff" : "#17150F") : "#C23B2E",
          }}
        />
      </span>
      <span className="flex items-center justify-between gap-1 text-[0.6875rem] leading-tight">
        <span
          className={`min-w-0 truncate font-semibold ${late ? (chosen ? "text-white" : "text-vermilion") : ""}`}
          data-battle-state
        >
          {state}
        </span>
        {inside && !late && (
          <span
            className="flex shrink-0 items-center gap-0.5 tabular-nums opacity-70"
            data-battle-back={back}
            title={pt.gateIn(back)}
          >
            {/* The gate's sign: the way back, in seconds. */}
            <svg width="10" height="11" viewBox="0 0 10 11" aria-hidden="true">
              <path d="M1 11V5a4 4 0 0 1 8 0v6H7V5a2 2 0 0 0-4 0v6Z" fill="currentColor" />
            </svg>
            {pt.short(back)}
          </span>
        )}
      </span>
    </button>
  );
}

/** Each component's sign on its button. */
function ActiveSign({ effect }: { effect: string }) {
  const d: Record<string, string> = {
    pavise: "M4 3h12v7c0 4-3 6.5-6 8-3-1.5-6-4-6-8Z",
    surgeon: "M8 3h4v5h5v4h-5v5H8v-5H3V8h5Z",
    trumpet: "M3 8h6l8-4v12l-8-4H3Z",
    smoke: "M6 15a4 4 0 1 1 1-7.8A5 5 0 0 1 16.5 9 3 3 0 0 1 15 15Z",
  };
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
      <path d={d[effect] ?? "M10 3 17 10 10 17 3 10Z"} fill="currentColor" />
    </svg>
  );
}

/**
 * A component's button: its sign and its name, its recharge sweeping round it, lit while it works;
 * held, its reach shows on the ground round the vehicle.
 */
function ActiveButton({
  a,
  t,
  onPress,
  onHold,
}: {
  a: PlayerUnitView["actives"][number];
  t: number;
  onPress: () => void;
  onHold: (on: boolean) => void;
}) {
  const wait = a.readyAt - t;
  const on = a.until > t;
  const cooling = wait > 0;
  return (
    <button
      type="button"
      disabled={cooling}
      onClick={onPress}
      onPointerDown={() => onHold(true)}
      onPointerUp={() => onHold(false)}
      onPointerLeave={() => onHold(false)}
      onPointerCancel={() => onHold(false)}
      data-battle-active={a.effect}
      aria-label={pt.component[a.effect] ?? a.effect}
      className={`relative flex h-14 min-w-[4.75rem] flex-col items-center justify-center gap-0.5 overflow-hidden rounded-[1.25rem] px-2 font-display text-[0.6875rem] font-extrabold leading-tight transition active:translate-y-0.5 ${on ? "bg-face text-white shadow-[0_4px_0_rgb(var(--face-deep))]" : "bg-white text-cream shadow-[inset_0_0_0_1.5px_rgb(var(--line)),0_3px_0_rgb(23_21_15/0.08)]"}`}
    >
      {cooling && (
        <span
          className="absolute inset-0"
          style={{
            background: "conic-gradient(rgb(23 21 15 / 0.2) var(--k), transparent 0)",
            ["--k" as string]: `${Math.min(100, (wait / Math.max(1, (a.cooldownS || 45) * 1_000)) * 100)}%`,
          }}
        />
      )}
      <span className="relative">
        <ActiveSign effect={a.effect} />
      </span>
      {/* Its whole name, never cut (audit of 4 November, UI U-13); its seconds while it recharges. */}
      <span className="relative tabular-nums">
        {cooling ? `${Math.ceil(wait / 1_000)} s` : (pt.component[a.effect] ?? a.effect)}
      </span>
    </button>
  );
}
