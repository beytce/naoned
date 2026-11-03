import { type ReactNode, useEffect, useState } from "react";
import { P } from "../../art/palette.js";
import { CartWheel, DucatCoin, FavourCoin, WaxSeal } from "../../art/plateau/coins.js";
import { d } from "../../game/format.js";
import { Icon } from "../../game/map/icons.js";
import { fr } from "../../i18n.js";
import type { EmpirePayload } from "../types.js";
import { fleetOf, hudOf } from "./logic.js";

const t = fr.empire;

/**
 * The map's two upper corners (the map at the centre, step 1). On the left, the house: the ring
 * of its Casa, filling as the ducats near the next one, its name and its income. On the right, a
 * column of counts, each with its round sign: the ducats, the Favour, the Seals, the vehicles at
 * home among all; under them the « + » of the Production.
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
        <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-night/80 shadow-lg shadow-black/40">
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
        <span className="min-w-0 [text-shadow:0_1px_4px_rgb(0_0_0/0.8)]">
          <span className="block max-w-[9rem] truncate font-display text-lg font-extrabold leading-tight text-cream">
            {name}
          </span>
          <span className="block text-xs text-cream-dim">{t.hud.income(d(view.incomePerDay))}</span>
        </span>
      </button>

      <div
        className="pointer-events-none absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-20 flex flex-col items-end gap-1.5"
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
        <button
          type="button"
          onClick={onProduction}
          aria-label={t.scene.production}
          data-production
          className="pointer-events-auto mt-1 flex h-11 w-11 items-center justify-center rounded-full bg-lagoon/90 text-night shadow-lg shadow-black/40 active:scale-95 [&_svg]:h-5 [&_svg]:w-5"
        >
          {Icon.plus()}
        </button>
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
      className="purse pointer-events-auto relative flex min-h-9 items-center gap-2 rounded-full py-0.5 pl-3 pr-0.5"
      data-hud={id}
      aria-label={label}
      onClick={() => setSaid(!said)}
    >
      {said && (
        <span
          role="note"
          className="absolute right-full top-1/2 mr-2 w-48 -translate-y-1/2 animate-fade rounded-lg bg-night-4 px-3 py-2 text-left text-xs text-cream shadow-lg"
        >
          <span className="block font-semibold">{label}</span>
          {help && <span className="block text-cream-dim">{help}</span>}
        </span>
      )}
      <span
        className={`font-display text-base font-extrabold tabular-nums [text-shadow:0_1px_4px_rgb(0_0_0/0.8)] ${gold ? "text-gold" : "text-cream"}`}
        data-fx={gold ? "purse" : undefined}
      >
        <span className="sr-only">{label} : </span>
        {value}
      </span>
      <span className="flex h-8 w-8 items-center justify-center">{sign}</span>
    </button>
  );
}
