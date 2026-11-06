import type { ReactNode } from "react";
import { Icon } from "../../game/map/icons.js";
import { fr } from "../../i18n.js";

const t = fr.empire.places;

export type PlaceId = "map" | "fondaco" | "porta" | "company";

/**
 * The four places at the foot (the refonte claire, docs/plan-refonte-claire.md, 5 November 2026):
 * the Map, the Fondaco, the Porta and the Company, nothing else with an entry of its own. The place
 * one is in is an ink pill on its black foot (the playful Porcellana); a red badge says something waits behind another; the Porta not open yet
 * says at which Casa it opens.
 */
export function PlaceTabs({
  active,
  onPlace,
  dots,
  portaCasa,
}: {
  active: PlaceId;
  onPlace: (id: PlaceId) => void;
  dots: Partial<Record<PlaceId, boolean | number>>;
  /** The Casa the Porta opens at, while it is still shut (null: open). */
  portaCasa: number | null;
}) {
  return (
    <nav
      aria-label={t.label}
      className="pointer-events-none flex w-full justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      data-place-tabs
    >
      <div className="hud-tray pointer-events-auto grid w-full max-w-md grid-cols-4 gap-1 rounded-[1.9rem] p-1.5">
        <Tab id="map" active={active} onPlace={onPlace} label={t.map} dot={dots.map}>
          {Icon.map()}
        </Tab>
        <Tab id="fondaco" active={active} onPlace={onPlace} label={t.fondaco} dot={dots.fondaco}>
          {Icon.home()}
        </Tab>
        <Tab
          id="porta"
          active={active}
          onPlace={onPlace}
          label={t.porta}
          dot={dots.porta}
          locked={portaCasa !== null ? t.portaLocked(portaCasa) : undefined}
        >
          {portaCasa !== null ? Icon.lock() : Icon.gate()}
        </Tab>
        <Tab id="company" active={active} onPlace={onPlace} label={t.company} dot={dots.company}>
          {Icon.banner()}
        </Tab>
      </div>
    </nav>
  );
}

function Tab({
  id,
  active,
  onPlace,
  label,
  dot,
  locked,
  children,
}: {
  id: PlaceId;
  active: PlaceId;
  onPlace: (id: PlaceId) => void;
  label: string;
  dot?: boolean | number;
  /** Why the place is shut, said instead of opening it. */
  locked?: string;
  children: ReactNode;
}) {
  const on = id === active;
  return (
    <button
      type="button"
      onClick={() => onPlace(id)}
      aria-current={on ? "page" : undefined}
      aria-label={locked ? `${label} · ${locked}` : undefined}
      data-place-tab={id}
      data-locked={locked ? "" : undefined}
      className={`relative flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 rounded-[1.4rem] font-display transition-transform active:translate-y-0.5 ${
        on ? "ink-pill" : locked ? "text-cream-dim/70" : "text-cream"
      }`}
    >
      <span className="flex h-7 w-12 items-center justify-center [&_svg]:h-[22px] [&_svg]:w-[22px]">
        {children}
      </span>
      <span className={`max-w-full truncate text-xs ${on ? "font-black" : "font-extrabold"}`}>
        {label}
      </span>
      {typeof dot === "number" && dot > 0 ? (
        <span className="absolute right-[16%] top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-face px-1 font-display text-[0.6875rem] font-black text-white ring-2 ring-white">
          {dot}
        </span>
      ) : dot === true ? (
        <span className="absolute right-[18%] top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-face font-display text-[0.6875rem] font-black text-white ring-2 ring-white">
          !
        </span>
      ) : null}
    </button>
  );
}
