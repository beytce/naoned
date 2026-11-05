import type { ReactNode } from "react";
import { Icon } from "../../game/map/icons.js";
import { fr } from "../../i18n.js";

const t = fr.empire.places;

export type PlaceId = "map" | "fondaco" | "porta" | "company";

/**
 * The four places at the foot (the refonte claire, docs/plan-refonte-claire.md, 5 November 2026):
 * the Map, the Fondaco, the Porta and the Company, nothing else with an entry of its own. The place
 * one is in is marked in lapis; a dot says something waits behind another; the Porta not open yet
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
      <div className="hud-tray pointer-events-auto grid w-full max-w-md grid-cols-4 rounded-[1.75rem] px-1.5 py-1.5">
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
      className={`relative flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 rounded-[1.25rem] active:scale-95 ${
        on ? "text-info" : locked ? "text-cream-dim/70" : "text-cream-dim"
      }`}
    >
      <span
        className={`flex h-8 w-12 items-center justify-center rounded-full [&_svg]:h-[22px] [&_svg]:w-[22px] ${
          on ? "bg-info/15" : ""
        }`}
      >
        {children}
      </span>
      <span className={`max-w-full truncate text-xs ${on ? "font-bold" : "font-semibold"}`}>
        {label}
      </span>
      {typeof dot === "number" && dot > 0 ? (
        <span className="absolute right-[18%] top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-lagoon px-1 text-[0.6875rem] font-bold text-on-lagoon">
          {dot}
        </span>
      ) : dot === true ? (
        <span className="absolute right-[26%] top-1.5 h-2.5 w-2.5 rounded-full bg-vermilion ring-2 ring-night-3" />
      ) : null}
    </button>
  );
}
