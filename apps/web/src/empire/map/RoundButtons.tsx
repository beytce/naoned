import type { ReactNode } from "react";
import { Icon } from "../../game/map/icons.js";
import { fr } from "../../i18n.js";

const t = fr.empire;

/**
 * The round buttons floating at the foot of the map (the map at the centre, step 1), in place of
 * the tab bar: on the left, back to the house up close or out to the map; on the right, the
 * Market (where the goods collected fly), the Company and the Family, each with its red dot when
 * something waits behind it.
 */
export function RoundButtons({
  onRecenter,
  onMarket,
  onCompany,
  onFamily,
  dots,
}: {
  onRecenter: () => void;
  onMarket: () => void;
  onCompany: () => void;
  onFamily: () => void;
  dots: { market?: boolean; company?: boolean; family?: boolean };
}) {
  return (
    <nav
      aria-label={t.scene.owner}
      className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      data-round-buttons
    >
      <Round label={t.scene.recenter} onClick={onRecenter} id="recenter">
        {Icon.locate()}
      </Round>
      <div className="flex gap-2.5">
        <Round label={t.nav.market} onClick={onMarket} dot={dots.market} id="market" store>
          {Icon.rialto()}
        </Round>
        <Round label={t.nav.company} onClick={onCompany} dot={dots.company} id="company">
          {Icon.banner()}
        </Round>
        <Round label={t.nav.family} onClick={onFamily} dot={dots.family} id="family">
          {Icon.family()}
        </Round>
      </div>
    </nav>
  );
}

function Round({
  id,
  label,
  onClick,
  dot,
  store = false,
  children,
}: {
  id: string;
  label: string;
  onClick: () => void;
  dot?: boolean;
  /** The goods collected fly here (game/fx.tsx). */
  store?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-round={id}
      className="pointer-events-auto flex flex-col items-center gap-0.5 active:scale-95"
    >
      <span
        data-goods-to={store ? "store" : undefined}
        className="relative flex h-12 w-12 items-center justify-center rounded-full bg-night/85 text-cream ring-1 ring-line shadow-lg shadow-black/50 backdrop-blur-sm [&_svg]:h-6 [&_svg]:w-6"
      >
        {children}
        {dot && (
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-vermilion ring-2 ring-night" />
        )}
      </span>
      <span className="text-[0.6875rem] font-semibold text-cream [text-shadow:0_1px_3px_rgb(0_0_0/0.9)]">
        {label}
      </span>
    </button>
  );
}
