import type { ReactNode } from "react";
import { Icon } from "../../game/map/icons.js";
import { fr } from "../../i18n.js";
import { MAP_3D } from "../map3d/flag.js";

const t = fr.empire;

/**
 * The round buttons floating at the foot of the map (the map at the centre, step 1), in place of
 * the tab bar: on the left, back to the house up close or out to the map; on the right, the
 * Market (where the goods collected fly), the Company and the Family, each with its red dot when
 * something waits behind it.
 */
export function RoundButtons({
  onRecenter,
  onHelp,
  onMarket,
  onCompany,
  onFamily,
  dots,
}: {
  onRecenter: () => void;
  /** Lorenzo's advice, past the tutorial: words only, never a gesture made for the player. */
  onHelp?: () => void;
  onMarket: () => void;
  onCompany: () => void;
  onFamily: () => void;
  dots: { market?: boolean; company?: boolean; family?: boolean };
}) {
  return (
    <nav
      aria-label={t.scene.owner}
      className="pointer-events-none flex w-full justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      data-round-buttons
    >
      {/* One cream tray of round medals at the foot, in the middle (Direction Jour). */}
      <div className="hud-tray pointer-events-auto flex items-end gap-1 rounded-[1.75rem] px-2 pb-1.5 pt-2 max-[359px]:gap-0">
        {/* On the 3D board, « Maison »: back to the fondaco, its domain at a second touch. */}
        <Round label={MAP_3D ? t.nav.home : t.scene.recenter} onClick={onRecenter} id="recenter">
          {MAP_3D ? Icon.home() : Icon.locate()}
        </Round>
        {onHelp && (
          <Round label={t.scene.help} onClick={onHelp} id="help">
            {Icon.help()}
          </Round>
        )}
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
      className="pointer-events-auto flex w-[4.25rem] flex-col items-center gap-0.5 active:scale-95 max-[359px]:w-14"
    >
      <span
        data-goods-to={store ? "store" : undefined}
        className="hud-medal relative flex h-12 w-12 items-center justify-center rounded-full text-cream [&_svg]:h-[22px] [&_svg]:w-[22px]"
      >
        {children}
        {dot && (
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-vermilion ring-2 ring-night" />
        )}
      </span>
      <span className="max-w-full truncate text-xs font-semibold text-cream-dim">{label}</span>
    </button>
  );
}
