import { useEffect, useState } from "react";
import { fr } from "../../i18n.js";
import { TABS, type TabId } from "./actions.js";
import { Icon } from "./icons.js";

/**
 * The five tabs at the foot of the screen (refonte UX, 28 October 2026): one bar, the same on the
 * map, the workshops, Venice, the ranking and the conquest. The tab shown is in gold; a tab still
 * closed in the first session says what opens it when touched. Its height is --tabbar (index.css):
 * what sits at the foot of the map, and the tabs' own sheets, stop above it.
 */

/** The workshops' own sheets: the list, a workshop, its upgrade, building, the store. */
const WORKSHOP_SHEETS = new Set(["workshops", "produce", "upgrade", "buildHere", "build", "store"]);

/** Venice's own sheets: its four moons and what they open (refonte UX, lot 5). */
const VENICE_SHEETS = new Set([
  "rialto",
  "trade",
  "offers",
  "deals",
  "shares",
  "sera",
  "broglio",
  "politics",
  "maneuvers",
  "cities",
  "senate",
  "canal",
]);

/** The tab a screen belongs to: its sheet first, then a place up close, then the layer. */
export function activeTab({
  sheet,
  layer,
  home = false,
  venice = false,
}: {
  sheet: string | null;
  layer: "trade" | "campaign" | "terra";
  /** « Mes ateliers » open up close (the Ateliers tab's screen, refonte UX). */
  home?: boolean;
  /** Venice open up close (the Venise tab's screen). */
  venice?: boolean;
}): TabId {
  const kind = (sheet ?? "").split(":")[0] ?? "";
  if (WORKSHOP_SHEETS.has(kind)) return "workshops";
  if (VENICE_SHEETS.has(kind)) return "venice";
  if (sheet === "ranking" || sheet === "sfida") return "ranking";
  if (layer !== "trade") return "conquest";
  if (home) return "workshops";
  if (venice) return "venice";
  return "map";
}

export type TabItem = {
  id: TabId;
  onClick: () => void;
  /** Something waits behind it. */
  dot?: boolean;
  /** Still closed: what opens it, said for a moment when it is touched. */
  locked?: string;
  /** A closed tab that may be opened early: touched again while it says why. */
  onForce?: () => void;
  coach?: string;
};

export function TabBar({ active, items }: { active: TabId; items: TabItem[] }) {
  return (
    <nav
      aria-label={fr.game.map.nav.label}
      data-hud="tabbar"
      className="absolute inset-x-0 bottom-0 z-30 h-[var(--tabbar)] border-t border-line bg-night/95 pb-[max(0.25rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:right-[var(--side,0px)]"
    >
      <div
        className="mx-auto grid h-full max-w-md"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => (
          <Tab key={item.id} item={item} on={item.id === active} />
        ))}
      </div>
    </nav>
  );
}

function Tab({ item, on }: { item: TabItem; on: boolean }) {
  const [why, setWhy] = useState(false);
  useEffect(() => {
    if (!why) return;
    const t = setTimeout(() => setWhy(false), 2600);
    return () => clearTimeout(t);
  }, [why]);
  const tab = TABS.find((t) => t.id === item.id);
  if (!tab) return null;
  const { locked, onForce } = item;
  return (
    <button
      type="button"
      onClick={() => {
        if (!locked) item.onClick();
        else if (why && onForce) onForce();
        else setWhy(true);
      }}
      data-coach={item.coach}
      data-tab={item.id}
      aria-current={on ? "page" : undefined}
      aria-label={locked ? `${tab.label} : ${locked}` : undefined}
      aria-disabled={locked ? true : undefined}
      className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-semibold transition active:scale-95 ${on ? "text-gold" : locked ? "text-muted" : "text-cream-dim hover:text-cream"}`}
    >
      {why && locked && (
        <span className="absolute bottom-full mb-2 w-44 animate-fade bg-night-4 px-3 py-2 text-center text-xs leading-snug text-cream shadow-lg shadow-black/40 slab">
          {locked}
          {onForce && <span className="mt-1 block text-gold">{fr.game.unlocks.force}</span>}
        </span>
      )}
      <span
        // The harvest made on the map flies here (fx.tsx, flyGoods).
        data-goods-to={item.id === "workshops" ? "workshops" : undefined}
        className={`relative ${locked ? "opacity-60" : ""}`}
      >
        {tab.icon()}
        {item.dot && !locked && (
          <span className="absolute -right-1 -top-0.5 h-2.5 w-2.5 rounded-full bg-vermilion ring-2 ring-night" />
        )}
        {locked && (
          <span className="absolute -bottom-1 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-night-4 text-cream-dim ring-2 ring-night [&_svg]:h-3 [&_svg]:w-3">
            {Icon.lock()}
          </span>
        )}
      </span>
      <span className="whitespace-nowrap">{tab.label}</span>
    </button>
  );
}
