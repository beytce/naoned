import type { ReactNode } from "react";
import { GoodsMark } from "../../art/goods.js";
import { Coin } from "../../art/icons.js";
import { d } from "../../game/format.js";
import { Icon } from "../../game/map/icons.js";
import { fr } from "../../i18n.js";
import { regionName } from "../World.js";
import { buildingName } from "../logic.js";
import type { EmpireAction, EmpirePayload } from "../types.js";
import { type ActionIcon, type Target, actionsOf } from "./logic.js";

const t = fr.empire;

const ICONS: Record<ActionIcon, () => ReactNode> = {
  harvest: Icon.harvest,
  restart: Icon.restart,
  upgrade: Icon.upgrade,
  build: Icon.build,
  send: Icon.send,
  banner: Icon.banner,
  anchor: Icon.anchor,
  workshops: Icon.workshops,
  lock: Icon.lock,
  details: Icon.chevronRight,
};

/** A place's name and what it is, at the head of its panel. */
function headOf(p: EmpirePayload, target: Target): { title: string; sub: string } {
  const view = p.view;
  const s = t.scene;
  switch (target.kind) {
    case "workshop": {
      const ws = view?.house.workshops.find((w) => w.id === target.id);
      return { title: buildingName(p, ws?.type ?? ""), sub: s.level(ws?.level ?? 1) };
    }
    case "casa":
      return { title: t.hud.casa(view?.house.casa ?? 1), sub: s.owner };
    case "free":
      return { title: s.free, sub: s.owner };
    case "region": {
      const r = view?.regions.find((x) => x.code === target.code);
      const reached = r ? r.counter > 0 || (view?.house.casa ?? 0) >= r.casa : false;
      return {
        title: reached ? regionName(target.code) : s.unknown,
        sub: r && r.counter > 0 ? t.world.counter(r.counter) : t.world.closed(r?.casa ?? 0),
      };
    }
    case "city": {
      const c = view?.map.cities.find((x) => x.code === target.code);
      const r = view?.regions.find((x) => x.code === c?.region);
      return {
        title: t.cityNames[target.code] ?? target.code,
        sub: `${regionName(c?.region ?? "")} · ${r && r.counter > 0 ? t.world.counter(r.counter) : t.world.toOpen}`,
      };
    }
    case "arsenal":
      return { title: s.arsenal, sub: s.owner };
  }
}

/**
 * The panel of a place touched (the map at the centre, step 1): its name, then a row of square
 * actions, each with its sign and its price; « Détails » opens the place's full sheet. The map
 * stays in sight above it.
 */
export function ActionPanel({
  p,
  target,
  now,
  busy,
  act,
  onOpen,
  onClose,
}: {
  p: EmpirePayload;
  target: Target;
  now: number;
  busy: boolean;
  act: (a: EmpireAction) => Promise<void>;
  onOpen: (sheet: string) => void;
  onClose: () => void;
}) {
  const head = headOf(p, target);
  const actions = actionsOf(p, target, now);
  return (
    <section
      className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 animate-sheet border-t border-info/40 bg-night-2/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-2xl shadow-black/60 backdrop-blur-md lg:inset-x-auto lg:bottom-4 lg:left-1/2 lg:w-[30rem] lg:-translate-x-1/2 lg:rounded-2xl lg:border"
      data-action-panel={target.kind}
      aria-label={head.title}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-place text-sm font-bold uppercase tracking-[0.12em] text-cream">
            {head.title}
          </h3>
          <p className="text-xs text-cream-dim">{head.sub}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-cream-dim ring-1 ring-line active:scale-95"
        >
          ✕
        </button>
      </div>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {actions.map((a) => (
          <button
            key={a.id}
            type="button"
            disabled={a.disabled || (busy && !!a.action)}
            data-map-action={a.id}
            onClick={() => {
              if (a.action) void act(a.action);
              else if (a.open) onOpen(a.open);
            }}
            className="flex min-w-[4.5rem] flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-cream active:scale-95 disabled:opacity-40"
          >
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-lg border [&_svg]:h-6 [&_svg]:w-6 ${a.action && !a.disabled ? "border-info text-info" : "border-line text-cream"}`}
            >
              {a.good ? <GoodsMark code={a.good} size={26} /> : ICONS[a.icon]()}
            </span>
            <span className="max-w-[5.5rem] truncate text-[0.6875rem] font-semibold">
              {(t.scene.actions[a.words.key] ?? (() => a.words.key))(a.words.n ?? 0)}
            </span>
            {a.cost && (
              <span className="flex items-center gap-1 text-[0.625rem] tabular-nums text-gold">
                <Coin size={11} />
                {d(a.cost)}
              </span>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}
