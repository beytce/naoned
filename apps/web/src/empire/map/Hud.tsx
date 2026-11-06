import { type ReactNode, useEffect, useState } from "react";
import { P } from "../../art/palette.js";
import { DucatCoin, FavourCoin, WaxSeal } from "../../art/plateau/coins.js";
import { d, whole } from "../../game/format.js";
import { fr } from "../../i18n.js";
import type { EmpirePayload } from "../types.js";
import { hudOf } from "./logic.js";

const t = fr.empire;

/**
 * The map's head (the playful Porcellana, proposal D, 6 November 2026). On the left, the house: the
 * red medal of its Casa, its white ring filling as the ducats near the next one, its name and its
 * income in a white pill (on a phone, the medal alone). On the right, a white pill per count, its
 * money drawn first (a ducat, a pennant, a seal), its figure after: the ducats, the Favour, the Seals (the refonte claire, 5 November 2026:
 * the vehicles' count and the Production's « + » gone; the vehicles are on the map, the Production
 * in the Fondaco).
 */
export function Hud({
  p,
  name,
  onHouse,
}: {
  p: EmpirePayload;
  name: string;
  /** The Casa's medal opens the profile (the family, the Dogana, the advice, the settings). */
  onHouse: () => void;
}) {
  const view = p.view;
  if (!view) return null;
  const next = view.nextCasa;
  const share = next
    ? Math.min(1, Number((BigInt(p.cash) * 1000n) / BigInt(next.cost || "1")) / 1000)
    : 1;
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
            <circle
              cx="24"
              cy="24"
              r="21"
              fill="none"
              stroke="rgb(255 255 255 / 0.35)"
              strokeWidth="3"
            />
            <circle
              cx="24"
              cy="24"
              r="21"
              fill="none"
              stroke="rgb(255 255 255)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${ring * share} ${ring}`}
            />
          </svg>
          <span className="font-display text-lg font-black text-white">{view.house.casa}</span>
        </span>
        <span className="hud-bar min-w-0 rounded-full py-1 pl-3 pr-4 max-[479px]:sr-only">
          <span className="block max-w-[9rem] truncate font-display text-base font-extrabold leading-tight text-cream">
            {name}
          </span>
          <span className="block text-xs text-cream-dim">
            {t.hud.income(whole(view.incomePerDay))}
          </span>
        </span>
      </button>

      <div
        className="pointer-events-none absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-20 flex items-center gap-1.5 max-[479px]:left-[4.25rem] max-[479px]:justify-end"
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
      className="hud-bar pointer-events-auto relative flex min-h-11 items-center gap-1 rounded-full py-1 pl-1 pr-3 active:translate-y-0.5 max-[359px]:pr-2"
      data-hud={id}
      // Its name and its value both read (audit of 4 November, UX M8: the label alone hid the sum).
      aria-label={`${label} : ${value}`}
      onClick={() => setSaid(!said)}
    >
      {/* A change of the purse told to a screen reader, as the coins fly to it on the screen. */}
      {gold && (
        <span className="sr-only" aria-live="polite">
          {`${label} : ${value}`}
        </span>
      )}
      {said && (
        <span
          role="note"
          className="absolute right-0 top-full mt-2 w-48 animate-fade rounded-xl bg-night-3 px-3 py-2 text-left text-xs text-cream shadow-lg ring-1 ring-line"
        >
          <span className="block font-semibold">{label}</span>
          {help && <span className="block text-cream-dim">{help}</span>}
        </span>
      )}
      <span className="flex h-9 w-9 items-center justify-center [&>svg]:h-9 [&>svg]:w-9 max-[359px]:h-7 max-[359px]:w-7 max-[359px]:[&>svg]:h-7 max-[359px]:[&>svg]:w-7">
        {sign}
      </span>
      <span
        className="whitespace-nowrap font-display text-base font-black tabular-nums text-cream"
        data-fx={gold ? "purse" : undefined}
      >
        {value}
      </span>
    </button>
  );
}
