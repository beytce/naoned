import { useEffect, useState } from "react";
import { GoodsMark } from "../../art/goods.js";
import {
  ChoiceCard,
  CompareRows,
  CostChips,
  Dock,
  DockDoor,
  PlaceHeader,
  TimeRing,
  costChips,
  minutesText,
  siblingOf,
} from "../../dock.js";
import { hourOf } from "../../game/format.js";
import { Icon } from "../../game/map/icons.js";
import { fr } from "../../i18n.js";
import { Slab, clock } from "../../ui.js";
import { memberName } from "../Identity.js";
import { regionName } from "../World.js";
import { affordable, buildingName, readyLots, recipeOf, workshopStatus } from "../logic.js";
import { tileBonusLine } from "../terroir.js";
import type { EmpireAction, EmpirePayload, EmpireWorkshop } from "../types.js";

const t = () => fr.empire.dock;
const goodName = (p: EmpirePayload, code: string) =>
  fr.themeNames.resource[code] ?? p.goods[code] ?? code;

type View = "main" | "upgrade" | "modules";

/** A lot's output at a yield, in units (the collect's rounding: down). */
export function lotOutput(qty: number, yieldBps: number): number {
  return Math.floor((qty * yieldBps) / 10_000);
}

/** Units an hour for a recipe's output, at a yield (one decimal kept for the eye). */
export function perHour(qty: number, yieldBps: number, minutes: number): number {
  if (minutes <= 0) return 0;
  return Math.round((qty * yieldBps * 60 * 10) / (10_000 * minutes)) / 10;
}

/** The workshops of the same counter, in the ring's order: the neighbours of ‹ ›. */
export function ringOf(p: EmpirePayload, ws: EmpireWorkshop): EmpireWorkshop[] {
  const region = ws.region ?? "veneto";
  return (p.view?.house.workshops ?? []).filter((w) => (w.region ?? "veneto") === region);
}

/**
 * A workshop touched on the map (docs/plan-dock.md, lot 2): the dock instead of the row of squares
 * and the sheet of details. Its recipe as a little machine, three doors (raise, modules, master),
 * one gold action (collect, relaunch, or the works); the raise shown before → after with its cost
 * in chips, the modules as cards put in their slots, the neighbours at ‹ ›. The board rings the
 * workshop chosen in lapis.
 */
export function WorkshopDock({
  p,
  now,
  busy,
  act,
  workshopId,
  onWorkshop,
  onOpen,
  onClose,
}: {
  p: EmpirePayload;
  now: number;
  busy: boolean;
  act: (a: EmpireAction) => Promise<unknown>;
  workshopId: string;
  /** Another workshop chosen (‹ ›): the dock follows it. */
  onWorkshop: (id: string) => void;
  /** A sheet to open (the family, for the master). */
  onOpen: (sheet: string) => void;
  onClose: () => void;
}) {
  const [view, setView] = useState<View>("main");
  // A new workshop, a new decision: back to its front door.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the workshop changes the dock
  useEffect(() => setView("main"), [workshopId]);
  const v = p.view;
  const ws = v?.house.workshops.find((w) => w.id === workshopId);
  if (!v || !ws) return null;
  const ring = ringOf(p, ws);
  const index = ring.findIndex((w) => w.id === ws.id);
  const go = (dir: 1 | -1) => {
    const next = siblingOf(
      ring.map((w) => w.id),
      ws.id,
      dir,
    );
    if (next && next !== ws.id) onWorkshop(next);
  };
  const name = buildingName(p, ws.type);
  const sub = `${fr.empire.workshop.level(ws.level)} · ${regionName(ws.region ?? "veneto")}`;
  return (
    <Dock onClose={onClose} label={name} attrs={{ "data-workshop-dock": ws.id }}>
      <PlaceHeader
        title={name}
        sub={view === "main" ? sub : view === "upgrade" ? t().upgrade : t().modules}
        onBack={view === "main" ? undefined : () => setView("main")}
        siblings={
          view === "main"
            ? { index, count: ring.length, onPrev: () => go(-1), onNext: () => go(1) }
            : undefined
        }
        onClose={onClose}
      />
      <div key={`${ws.id}:${view}`} className="dock-view flex flex-col gap-3">
        {view === "main" ? (
          <Front p={p} ws={ws} now={now} busy={busy} act={act} onView={setView} onOpen={onOpen} />
        ) : view === "upgrade" ? (
          <Upgrade p={p} ws={ws} now={now} busy={busy} act={act} />
        ) : (
          <Modules p={p} ws={ws} busy={busy} act={act} />
        )}
      </div>
    </Dock>
  );
}

/** The front door: the machine, its state, the three doors, its neighbourhood, one gold action. */
function Front({
  p,
  ws,
  now,
  busy,
  act,
  onView,
  onOpen,
}: {
  p: EmpirePayload;
  ws: EmpireWorkshop;
  now: number;
  busy: boolean;
  act: (a: EmpireAction) => Promise<unknown>;
  onView: (v: View) => void;
  onOpen: (sheet: string) => void;
}) {
  const v = p.view;
  if (!v) return null;
  const r = recipeOf(p, ws);
  const s = workshopStatus(p, ws, now);
  const up = v.upgrades[ws.id] ?? null;
  const site = v.house.builds.find((b) => b.workshopId === ws.id && b.kind === "upgrade");
  const places = v.workshopPlaces[ws.id];
  const researched = v.research.modules.filter((m) => m.kind === "workshop" && m.level > 0);
  const fitted = (ws.fitted ?? []).filter(Boolean).length;
  const master = v.identity.staff.members.find((m) => m.role === "master" && m.placedAt === ws.id);
  const ring = ringOf(p, ws);
  const i = ring.findIndex((w) => w.id === ws.id);
  const prev = ring[i - 1];
  const next = ring[i + 1];
  const ready = readyLots(ws, now);
  const line =
    s.state === "ready"
      ? null
      : s.state === "running"
        ? t().running(clock(s.left))
        : s.state === "blocked"
          ? t().waits(goodName(p, s.resource))
          : t().idle;
  return (
    <>
      {r && (
        <div
          className="flex items-center gap-2 glass-chip rounded-[1.25rem] px-3 py-2.5"
          data-machine
        >
          <ul className="flex min-w-0 gap-2">
            {Object.entries(r.inputs).map(([g, n]) => (
              <li key={g} className="flex w-14 flex-col items-center gap-0.5">
                <GoodsMark code={g} size={34} covered={(p.stock[g] ?? 0) >= n} />
                <span className="font-display text-xs font-bold tabular-nums">{n}</span>
                <span className="max-w-full truncate text-[0.6875rem] text-cream-dim">
                  {goodName(p, g)}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex min-w-12 flex-1 flex-col items-center gap-1">
            {s.state === "running" ? (
              <TimeRing progress={s.progress} size={34} />
            ) : (
              <svg viewBox="0 0 120 14" className="h-3.5 w-full" aria-hidden="true">
                <path
                  d="M2 7h108"
                  stroke="rgb(var(--line))"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
                <path
                  d="M106 2l8 5-8 5"
                  fill="none"
                  stroke={s.state === "ready" ? "rgb(var(--lagoon))" : "rgb(var(--line))"}
                  strokeWidth="2"
                />
              </svg>
            )}
            <span className="font-display text-xs tabular-nums text-cream-dim">
              {minutesText(r.minutes)}
            </span>
          </div>
          <ul className="flex gap-2">
            {Object.entries(r.outputs).map(([g, n]) => (
              <li key={g} className="flex w-14 flex-col items-center gap-0.5">
                <GoodsMark code={g} size={34} />
                {up && (
                  <span className="font-display text-xs font-bold tabular-nums">
                    {lotOutput(n, up.yieldBps)}
                  </span>
                )}
                <span className="max-w-full truncate text-[0.6875rem] text-cream-dim">
                  {goodName(p, g)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {line && (
        <p
          className={`text-center text-xs ${s.state === "blocked" ? "text-cream" : "text-cream-dim"}`}
        >
          {line}
        </p>
      )}
      <div className="grid grid-cols-3 gap-2.5">
        <DockDoor
          icon={
            site ? (
              <TimeRing progress={progressOf(site, now)} size={28} tone="gold" />
            ) : (
              Icon.upgrade()
            )
          }
          label={site ? t().site : t().upgrade}
          badge={site ? clock(site.endsAt - now) : up ? `→ ${up.level}` : "max"}
          badgeTone={site ? "gold" : up ? "lagoon" : "ghost"}
          onClick={() => onView("upgrade")}
          attrs={{ "data-map-action": "upgrade" }}
        />
        <DockDoor
          icon={
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          }
          label={t().modules}
          badge={places && places.slots > 0 ? `${fitted}/${places.slots}` : undefined}
          disabled={!places || places.slots === 0 || researched.length === 0}
          onClick={() => onView("modules")}
          attrs={{ "data-dock-door": "modules" }}
        />
        <DockDoor
          icon={Icon.family()}
          label={t().master}
          badge={master ? "1" : undefined}
          onClick={() => onOpen("family")}
          attrs={{ "data-dock-door": "master" }}
        />
      </div>
      {tileBonusLine(p, ws.id) && (
        // What its tile gives it, in one line: its terroir, its neighbourhood (the living map).
        <p className="flex items-center gap-2 text-xs text-cream-dim" data-tile-bonus>
          <span className="h-2 w-2 rounded-full bg-gold" aria-hidden="true" />
          {tileBonusLine(p, ws.id)}
        </p>
      )}
      {master && (
        <p className="text-xs text-cream-dim">{fr.empire.identity.master(memberName(master))}</p>
      )}
      {ring.length > 1 && (
        <div className="flex items-center justify-between gap-2 text-xs text-cream-dim">
          <span>{t().move}</span>
          <span className="flex gap-1">
            {prev && (
              <Slab
                tone="text"
                busy={busy}
                onClick={() => void act({ type: "empireSwap", a: ws.id, b: prev.id })}
              >
                {fr.empire.identity.moveLeft}
              </Slab>
            )}
            {next && (
              <Slab
                tone="text"
                busy={busy}
                onClick={() => void act({ type: "empireSwap", a: ws.id, b: next.id })}
              >
                {fr.empire.identity.moveRight}
              </Slab>
            )}
          </span>
        </div>
      )}
      {Object.keys(recipeOf(p, ws)?.inputs ?? {}).length > 0 && (
        // Who is served first with the inputs (P0-07: the sawmill starved the brickworks).
        <div className="flex flex-col gap-1.5" data-priority>
          <p className="text-xs font-semibold text-cream-dim">{t().priority}</p>
          <div className="grid grid-cols-3 gap-1.5" aria-label={t().priority}>
            {(["low", "normal", "high"] as const).map((k) => {
              const on = (ws.priority ?? "normal") === k;
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={on}
                  disabled={busy}
                  onClick={() =>
                    on
                      ? undefined
                      : void act({ type: "empireSetPriority", workshopId: ws.id, priority: k })
                  }
                  className={`min-h-11 rounded-full text-sm font-bold transition active:scale-95 ${on ? "bg-cream text-night-3" : "bg-night-4 text-cream-dim"}`}
                  data-priority-level={k}
                >
                  {t().priorities[k]}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-cream-dim">{t().priorityWhy}</p>
        </div>
      )}
      {s.state === "ready" ? (
        <Slab
          size="lg"
          className="w-full"
          busy={busy}
          shine
          onClick={() => void act({ type: "empireRelaunch", workshopId: ws.id })}
        >
          <span data-map-action="collect">
            {t().collect(s.quantity || ready, goodName(p, s.good))}
          </span>
        </Slab>
      ) : s.state === "idle" ? (
        <Slab
          size="lg"
          className="w-full"
          busy={busy}
          onClick={() => void act({ type: "empireRelaunch", workshopId: ws.id })}
        >
          <span data-map-action="relaunch">{t().relaunch}</span>
        </Slab>
      ) : null}
    </>
  );
}

const progressOf = (b: { startedAt: number; endsAt: number }, now: number) =>
  (now - b.startedAt) / Math.max(1, b.endsAt - b.startedAt);

/** The raise: what it brings (before → after), what it costs (chips), one gold « Lancer ». */
function Upgrade({
  p,
  ws,
  now,
  busy,
  act,
}: {
  p: EmpirePayload;
  ws: EmpireWorkshop;
  now: number;
  busy: boolean;
  act: (a: EmpireAction) => Promise<unknown>;
}) {
  const v = p.view;
  if (!v) return null;
  const site = v.house.builds.find((b) => b.workshopId === ws.id && b.kind === "upgrade");
  if (site)
    return (
      <div className="flex items-center gap-4 glass-chip rounded-[1.25rem] p-4" data-dock-site>
        <TimeRing progress={progressOf(site, now)} size={64} tone="gold" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{t().levelTo(site.level)}</p>
          <p className="font-display text-lg font-extrabold tabular-nums text-gold">
            {t().siteLeft(clock(site.endsAt - now))}
          </p>
          <p className="text-xs text-cream-dim">
            {t().siteEnds(hourOf(site.endsAt))} · {t().keepsMaking}
          </p>
        </div>
      </div>
    );
  const up = v.upgrades[ws.id] ?? null;
  if (!up)
    return (
      <div className="glass-chip rounded-[1.25rem] p-4 text-center" data-dock-maxed>
        <p className="text-sm font-bold">{t().maxed}</p>
        <p className="mt-1 text-xs text-cream-dim">{t().atCasa}</p>
      </div>
    );
  const r = recipeOf(p, ws);
  const [good = "", qty = 0] = Object.entries(r?.outputs ?? {})[0] ?? [];
  const sites = v.house.builds.length;
  const full = sites >= v.buildSlots;
  return (
    <>
      <div className="flex items-center justify-center gap-3" aria-hidden="true">
        <span className="flex h-12 w-12 items-center justify-center rounded-full font-display text-xl font-extrabold ring-2 ring-inset ring-edge">
          {ws.level}
        </span>
        <svg viewBox="0 0 40 16" className="h-4 w-10" aria-hidden="true">
          <path
            d="M2 8h32M28 2l6 6-6 6"
            fill="none"
            stroke="rgb(var(--lagoon))"
            strokeWidth="2.4"
          />
        </svg>
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-lagoon font-display text-2xl font-extrabold text-on-lagoon shadow-[0_0_24px_rgb(var(--lagoon)/0.35)]">
          {up.level}
        </span>
      </div>
      {r && good && (
        <CompareRows
          rows={[
            {
              label: (
                <span className="flex items-center gap-2">
                  <GoodsMark code={good} size={20} />
                  {t().lot}
                </span>
              ),
              before: lotOutput(qty, up.yieldBps),
              after: lotOutput(qty, up.nextYieldBps),
            },
            {
              label: t().perHour,
              before: perHour(qty, up.yieldBps, r.minutes),
              after: perHour(qty, up.nextYieldBps, r.minutes),
              unit: "/h",
            },
          ]}
        />
      )}
      <div className="flex flex-col gap-2">
        <p className="label text-cream-dim">{t().cost}</p>
        <CostChips
          chips={costChips({ cash: p.cash, cost: up.cost, minutes: up.minutes })}
          goodName={(c) => goodName(p, c)}
        />
        <p className="text-xs text-cream-dim">{full ? t().siteBusy : t().keepsMaking}</p>
      </div>
      <Slab
        size="lg"
        className="w-full"
        busy={busy}
        disabled={!affordable(p.cash, up.cost) || full}
        onClick={() => void act({ type: "empireUpgrade", workshopId: ws.id })}
      >
        <span data-dock-start>{t().startSite}</span>
      </Slab>
    </>
  );
}

/** The modules: the slots as cells, the researched modules as cards, one gold « Poser ». */
function Modules({
  p,
  ws,
  busy,
  act,
}: {
  p: EmpirePayload;
  ws: EmpireWorkshop;
  busy: boolean;
  act: (a: EmpireAction) => Promise<unknown>;
}) {
  const v = p.view;
  const slots = v?.workshopPlaces[ws.id]?.slots ?? 0;
  const researched = (v?.research.modules ?? []).filter(
    (m) => m.kind === "workshop" && m.level > 0,
  );
  const firstFree = Array.from({ length: slots }, (_, i) => i).find((i) => !ws.fitted?.[i]);
  const [slot, setSlot] = useState(firstFree ?? 0);
  const [pick, setPick] = useState<string | null>(null);
  if (!v) return null;
  if (slots === 0) return <p className="text-sm text-cream-dim">{t().noSlot}</p>;
  if (researched.length === 0) return <p className="text-sm text-cream-dim">{t().noModule}</p>;
  const names = fr.empire.moduleNames;
  const current = ws.fitted?.[slot] ?? "";
  const chosen = pick ?? current;
  return (
    <>
      <ul className="flex flex-wrap gap-2" data-module-slots>
        {Array.from({ length: slots }, (_, i) => {
          const code = ws.fitted?.[i] ?? "";
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: a slot is its index
            <li key={i}>
              <button
                type="button"
                aria-pressed={i === slot}
                aria-label={t().slotOf(i + 1, slots)}
                onClick={() => {
                  setSlot(i);
                  setPick(null);
                }}
                className={`flex h-16 min-w-16 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 text-xs transition active:scale-95 ${
                  i === slot
                    ? "bg-info/10 text-info ring-[2.5px] ring-inset ring-info"
                    : code
                      ? "bg-night-3 text-cream ring-1 ring-inset ring-line"
                      : "border-2 border-dashed border-edge text-info"
                }`}
                data-module-slot={i}
              >
                {code ? (
                  <span className="max-w-24 truncate font-semibold">
                    {names[code]?.[0] ?? code}
                  </span>
                ) : (
                  <span className="text-xl leading-none">+</span>
                )}
                <span className="text-[0.6875rem] text-cream-dim">
                  {fr.empire.identity.slot(i + 1)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex items-baseline justify-between">
        <p className="text-base font-bold">{t().whatHere}</p>
        <p className="text-xs text-cream-dim">{t().researched}</p>
      </div>
      <ul className="-mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-1" data-module-tray>
        {researched.map((m) => {
          const elsewhere = (ws.fitted ?? []).some((c, i) => c === m.code && i !== slot);
          return (
            <li key={m.code} className="snap-start">
              <ChoiceCard
                selected={chosen === m.code}
                disabled={elsewhere}
                onClick={() => setPick(m.code)}
                className="h-36 w-32 flex-col items-center justify-center gap-1.5 p-2.5 text-center"
                attrs={{ "data-module": m.code }}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-night-4 font-display text-sm font-extrabold">
                  {"I".repeat(Math.min(3, m.level)) || m.level}
                </span>
                <span className="text-sm font-bold">{names[m.code]?.[0] ?? m.code}</span>
                <span className="line-clamp-2 text-[0.6875rem] leading-tight text-cream-dim">
                  {elsewhere ? t().fitted : (names[m.code]?.[1] ?? m.effect)}
                </span>
              </ChoiceCard>
            </li>
          );
        })}
      </ul>
      <Slab
        size="lg"
        className="w-full"
        busy={busy}
        disabled={!chosen || chosen === current}
        onClick={() =>
          chosen &&
          void act({ type: "empireFit", workshopId: ws.id, slot, module: chosen }).then(() =>
            setPick(null),
          )
        }
      >
        {t().fit(chosen ? (names[chosen]?.[0] ?? chosen) : "")}
      </Slab>
    </>
  );
}
