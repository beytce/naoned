import { useState } from "react";
import { GoodsMark } from "../../art/goods.js";
import { Icon } from "../../game/map/icons.js";
import { fr } from "../../i18n.js";
import { CloseButton, Slab } from "../../ui.js";
import { regionName } from "../World.js";
import type { EmpireAction, EmpirePayload } from "../types.js";
import { placeName } from "./logic.js";

const t = fr.empire.hops;
const goodName = (p: EmpirePayload, code: string) =>
  fr.themeNames.resource[code] ?? p.goods[code] ?? code;

/**
 * The vehicle chosen (after Hades' Star's ship panel, 1 November 2026), at the foot of the map: its
 * model and hold, where it stands or goes with the seconds left, and its gestures — the cargo, to
 * move (drag it to a place, or touch one), to load at a counter; while it waits to leave, « Partir »
 * in gold and « Annuler »; the arrows go to the vehicle before or after.
 */
export function VehiclePanel({
  p,
  now,
  busy,
  act,
  vehicleId,
  aiming,
  onAim,
  onCycle,
  onClose,
}: {
  p: EmpirePayload;
  now: number;
  busy: boolean;
  act: (a: EmpireAction) => Promise<void>;
  vehicleId: string;
  /** Picking where to send it: a touch on a place sends it there. */
  aiming: boolean;
  onAim: (on: boolean) => void;
  onCycle: (step: 1 | -1) => void;
  onClose: () => void;
}) {
  const [pane, setPane] = useState<"cargo" | "load" | "modules" | null>(null);
  const view = p.view;
  const v = view?.vehicles.mine.find((x) => x.id === vehicleId);
  if (!view || !v) return null;
  const name = (place: string) => placeName(p, place, regionName);
  const carried = Object.values(v.cargo).reduce((n, c) => n + c.qty, 0);
  const leg = v.legs.find((l) => l.departAt <= now && l.arrivesAt > now);
  const waiting = !leg && v.legs[0] && v.legs[0].departAt > now ? v.legs[0] : null;
  const atPost = !v.at.startsWith("city:") && !leg && !v.legs.some((l) => l.departAt <= now);
  const store = view.stores.find((x) => x.post === v.at)?.goods ?? {};
  // The state, and its bar: the seconds before leaving, or left on the way.
  const state = leg
    ? {
        line: t.moving(name(leg.to)),
        left: leg.arrivesAt - now,
        span: leg.arrivesAt - leg.departAt,
      }
    : waiting
      ? {
          line: t.leaving(name(waiting.to)),
          left: waiting.departAt - now,
          span: view.moves.departSeconds * 1_000,
        }
      : { line: t.docked(name(v.at)), left: 0, span: 1 };
  const secs = Math.max(0, Math.ceil(state.left / 1_000));
  const more = v.legs.filter((l) => l !== leg && l !== waiting).length;
  const button = (
    key: string,
    label: string,
    icon: JSX.Element,
    onClick: () => void,
    on = false,
    tone: "plain" | "gold" = "plain",
  ) => (
    <button
      key={key}
      type="button"
      aria-label={label}
      aria-pressed={on}
      data-hop-action={key}
      disabled={busy}
      onClick={onClick}
      className={`flex h-11 w-11 items-center justify-center rounded-lg ring-1 transition active:scale-95 disabled:opacity-50 [&_svg]:h-5 [&_svg]:w-5 ${
        tone === "gold"
          ? "bg-gold text-ink ring-gold"
          : on
            ? "bg-gold/15 text-gold ring-gold"
            : "bg-night-3 text-cream ring-lagoon/60"
      }`}
    >
      {icon}
    </button>
  );
  return (
    <section
      className="pointer-events-auto w-full border-t border-lagoon/50 bg-night-2 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-xl shadow-black/50 lg:mb-4 lg:w-[30rem] lg:rounded-2xl lg:border"
      data-vehicle-panel={v.id}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-place text-sm font-bold uppercase tracking-[0.12em] text-cream">
              {fr.empire.vehicleNames[v.type] ?? v.type}
            </h3>
            <span
              className="ml-auto rounded-full bg-night-3 px-2 py-0.5 font-display text-xs font-bold tabular-nums text-cream ring-1 ring-lagoon/60"
              data-hold
            >
              {t.hold(carried, v.capacity)}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-xs text-cream-dim" data-hop-state>
              {state.line}
            </p>
            {state.left > 0 && (
              <span className="relative h-4 w-20 overflow-hidden rounded-full bg-night-3 ring-1 ring-lagoon/50">
                <span
                  className="absolute inset-y-0 left-0 bg-lagoon/60 transition-[width] duration-1000 ease-linear"
                  style={{
                    width: `${Math.min(100, (state.left / Math.max(1, state.span)) * 100)}%`,
                  }}
                />
                <span className="relative block text-center font-display text-[0.625rem] font-bold leading-4 text-cream">
                  {t.seconds(secs)}
                </span>
              </span>
            )}
          </div>
          {more > 0 && <p className="text-[0.6875rem] text-cream-dim">{t.stops(more)}</p>}
        </div>
        <CloseButton onClick={onClose} />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          aria-label={t.prev}
          onClick={() => onCycle(-1)}
          className="flex h-11 w-8 items-center justify-center text-cream-dim active:scale-95 [&_svg]:h-5 [&_svg]:w-5"
        >
          {Icon.chevronLeft()}
        </button>
        <div className="flex flex-1 items-center justify-center gap-2">
          {button(
            "cargo",
            t.inspect,
            Icon.crates(),
            () => setPane(pane === "cargo" ? null : "cargo"),
            pane === "cargo",
          )}
          {waiting ? (
            <>
              {button(
                "go",
                t.go,
                Icon.check(),
                () => void act({ type: "empireDepartNow", vehicleId: v.id }),
                false,
                "gold",
              )}
              {button(
                "cancel",
                t.cancel,
                Icon.cross(),
                () => void act({ type: "empireCancelStop", vehicleId: v.id }),
              )}
            </>
          ) : null}
          {button("move", t.move, Icon.send(), () => onAim(!aiming), aiming)}
          {button(
            "modules",
            t.modules,
            Icon.build(),
            () => setPane(pane === "modules" ? null : "modules"),
            pane === "modules",
          )}
          {atPost &&
            button(
              "load",
              t.load,
              Icon.cargo(),
              () => setPane(pane === "load" ? null : "load"),
              pane === "load",
            )}
        </div>
        <button
          type="button"
          aria-label={t.next}
          onClick={() => onCycle(1)}
          className="flex h-11 w-8 items-center justify-center text-cream-dim active:scale-95 [&_svg]:h-5 [&_svg]:w-5"
        >
          {Icon.chevronRight()}
        </button>
      </div>
      {aiming && <p className="mt-1 text-center text-xs text-gold">{t.aim}</p>}
      {pane === "modules" && <ModulesPane p={p} busy={busy} act={act} vehicleId={v.id} />}
      {pane === "cargo" && (
        <ul className="mt-2 space-y-1" data-cargo>
          {carried === 0 && <li className="text-xs text-cream-dim">{t.empty}</li>}
          {Object.entries(v.cargo).map(([good, c]) => (
            <li key={good} className="flex items-center gap-2 text-sm text-cream">
              <GoodsMark code={good} size={20} />
              <span className="flex-1">
                {goodName(p, good)} × {c.qty}
              </span>
              {atPost && (
                <Slab
                  size="sm"
                  tone="ghost"
                  busy={busy}
                  onClick={() =>
                    void act({ type: "empireUnload", vehicleId: v.id, good, qty: c.qty })
                  }
                >
                  {t.unload}
                </Slab>
              )}
            </li>
          ))}
        </ul>
      )}
      {pane === "load" && atPost && (
        <ul className="mt-2 space-y-1" data-load>
          {Object.entries(store)
            .filter(([, n]) => n > 0)
            .map(([good, n]) => {
              const qty = Math.min(n, v.capacity - carried);
              return (
                <li key={good} className="flex items-center gap-2 text-sm text-cream">
                  <GoodsMark code={good} size={20} />
                  <span className="flex-1">
                    {goodName(p, good)}
                    <span className="block text-xs text-cream-dim">{t.atCounter(n)}</span>
                  </span>
                  <Slab
                    size="sm"
                    tone="ghost"
                    busy={busy}
                    disabled={qty <= 0}
                    onClick={() => void act({ type: "empireLoad", vehicleId: v.id, good, qty })}
                  >
                    {`${t.load} ${qty}`}
                  </Slab>
                </li>
              );
            })}
        </ul>
      )}
    </section>
  );
}

/**
 * The trade modules of a vehicle (1 November 2026, after Hades' Star's ships): its places, one a
 * level of its model, up to five; each takes a trade module the house has researched, once.
 */
function ModulesPane({
  p,
  busy,
  act,
  vehicleId,
}: {
  p: EmpirePayload;
  busy: boolean;
  act: (a: EmpireAction) => Promise<void>;
  vehicleId: string;
}) {
  const view = p.view;
  const v = view?.vehicles.mine.find((x) => x.id === vehicleId);
  if (!view || !v) return null;
  const names = fr.empire.moduleNames;
  const researched = view.research.modules.filter((m) => m.kind === "trade" && m.level > 0);
  const max = 5;
  return (
    <div className="mt-2 space-y-1.5" data-vehicle-modules>
      <p className="text-[0.6875rem] text-cream-dim">{t.fittedNote}</p>
      {researched.length === 0 && <p className="text-xs text-cream-dim">{t.noModule}</p>}
      <ul className="space-y-1.5">
        {Array.from({ length: max }, (_, i) => {
          const open = i < v.slots;
          const here = v.fitted?.[i] || "";
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: a place is its index
            <li key={i} data-vehicle-slot={i} data-open={open ? "" : undefined}>
              {open ? (
                <select
                  aria-label={t.slot(i + 1)}
                  className="w-full rounded-lg border border-edge bg-night-3 px-2 py-2 text-sm text-cream disabled:opacity-50"
                  disabled={busy || researched.length === 0}
                  value={here}
                  onChange={(e) =>
                    void act({
                      type: "empireFitVehicle",
                      vehicleId,
                      slot: i,
                      module: e.target.value === "" ? null : e.target.value,
                    })
                  }
                >
                  <option value="">{t.emptySlot}</option>
                  {researched
                    .filter((m) => m.code === here || !(v.fitted ?? []).includes(m.code))
                    .map((m) => (
                      <option key={m.code} value={m.code}>
                        {`${names[m.code]?.[0] ?? m.code} ${m.level} — ${names[m.code]?.[1] ?? ""}`}
                      </option>
                    ))}
                </select>
              ) : (
                <p className="rounded-lg border border-dashed border-line px-2 py-2 text-xs text-cream-dim">
                  {t.opensAt(i + 1)}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
