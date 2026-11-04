import { type ReactNode, useEffect, useState } from "react";
import { P } from "../../art/palette.js";
import { CartWheel, DucatCoin, FavourCoin, WaxSeal } from "../../art/plateau/coins.js";
import { d } from "../../game/format.js";
import { Icon } from "../../game/map/icons.js";
import { fr } from "../../i18n.js";
import { MAP_3D } from "../map3d/flag.js";
import type { EmpirePayload } from "../types.js";
import { fleetOf, hudOf } from "./logic.js";

const t = fr.empire;

/**
 * The map's head (Direction Jour, 4 November 2026, after the owner's reference). On the left, the
 * house: the medal of its Casa, its ring filling as the ducats near the next one, its name and its
 * income in a cream pill (on a phone, the medal alone). Beside it, one cream bar of counts side by
 * side, each with its sign: the ducats, the Favour, the Seals, the vehicles at home among all (the
 * column of the night board given up by the owner); then the « + » of the Production.
 */
export function Hud({
  p,
  now,
  name,
  onHouse,
  onProduction,
}: {
  p: EmpirePayload;
  now: number;
  name: string;
  onHouse: () => void;
  onProduction: () => void;
}) {
  const view = p.view;
  if (!view) return null;
  const next = view.nextCasa;
  const share = next
    ? Math.min(1, Number((BigInt(p.cash) * 1000n) / BigInt(next.cost || "1")) / 1000)
    : 1;
  const fleet = fleetOf(p, now);
  const ring = 2 * Math.PI * 21;
  const signs: Record<string, ReactNode> = {
    ducats: <DucatCoin />,
    favour: <FavourCoin />,
    seals: <WaxSeal />,
  };
  return (
    <>
      <button
        type="button"
        onClick={onHouse}
        data-house-header
        className="pointer-events-auto absolute left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-20 flex items-center gap-2.5 text-left active:scale-95"
      >
        <span className="hud-medal relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
          <svg viewBox="0 0 48 48" className="absolute inset-0 -rotate-90" aria-hidden="true">
            <circle cx="24" cy="24" r="21" fill="none" stroke="rgb(var(--line))" strokeWidth="2" />
            <circle
              cx="24"
              cy="24"
              r="21"
              fill="none"
              stroke="rgb(var(--gold))"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={`${ring * share} ${ring}`}
            />
          </svg>
          <span className="font-display text-lg font-extrabold text-cream">{view.house.casa}</span>
        </span>
        <span className="hud-bar min-w-0 rounded-full py-1 pl-3 pr-4 max-[479px]:sr-only">
          <span className="block max-w-[9rem] truncate font-display text-base font-extrabold leading-tight text-cream">
            {name}
          </span>
          <span className="block text-xs text-cream-dim">{t.hud.income(d(view.incomePerDay))}</span>
        </span>
      </button>

      <div
        className="hud-bar pointer-events-none absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-20 flex items-center rounded-full px-1 max-[479px]:left-[4.25rem] max-[479px]:justify-between"
        data-hud-counts
      >
        {hudOf(p).map((c) => (
          <Count
            key={c.id}
            id={c.id}
            label={t.scene[c.id]}
            value={c.value}
            sign={signs[c.id]}
            gold={c.id === "ducats"}
          />
        ))}
        <Count
          id="fleet"
          label={t.scene.fleetShort}
          value={`${fleet.free} / ${fleet.total}`}
          sign={<CartWheel />}
        />
        {/* On the 3D board, the Production is in the domain (decision of the owner, 3 November). */}
        {!MAP_3D && (
          <button
            type="button"
            onClick={onProduction}
            aria-label={t.scene.production}
            data-production
            className="pointer-events-auto ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-lagoon text-on-lagoon active:scale-95 [&_svg]:h-5 [&_svg]:w-5"
          >
            {Icon.plus()}
          </button>
        )}
      </div>
    </>
  );
}

/** A count of the corner: touched, a bubble says what it is, then fades. */
function Count({
  id,
  label,
  value,
  sign,
  gold = false,
}: {
  id: string;
  label: string;
  value: string;
  sign: ReactNode;
  gold?: boolean;
}) {
  const [said, setSaid] = useState(false);
  useEffect(() => {
    if (!said) return;
    const t = setTimeout(() => setSaid(false), 2400);
    return () => clearTimeout(t);
  }, [said]);
  const help = fr.empire.terms[id];
  return (
    <button
      type="button"
      className="pointer-events-auto relative flex min-h-11 items-center gap-1 px-2 [&:not(:first-child)]:border-l [&:not(:first-child)]:border-line max-[359px]:px-1"
      data-hud={id}
      aria-label={label}
      onClick={() => setSaid(!said)}
    >
      {said && (
        <span
          role="note"
          className="absolute right-0 top-full mt-2 w-48 animate-fade rounded-xl bg-night-3 px-3 py-2 text-left text-xs text-cream shadow-lg ring-1 ring-line"
        >
          <span className="block font-semibold">{label}</span>
          {help && <span className="block text-cream-dim">{help}</span>}
        </span>
      )}
      <span
        className={`whitespace-nowrap font-display text-sm font-extrabold tabular-nums ${gold ? "text-gold" : "text-cream"}`}
        data-fx={gold ? "purse" : undefined}
      >
        <span className="sr-only">{label} : </span>
        {value}
      </span>
      <span className="flex h-7 w-7 items-center justify-center [&>svg]:h-7 [&>svg]:w-7">
        {sign}
      </span>
    </button>
  );
}
