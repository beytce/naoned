import { fr } from "../i18n.js";
import { locale } from "../lang.js";
import { Badge, Panel } from "../ui.js";
import type { GameProps } from "./Game.js";
import type { GameResponse } from "./types.js";

const date = (t: number) =>
  new Date(t).toLocaleDateString(locale, { day: "numeric", month: "long" });
const euros = (cents: number) =>
  (cents / 100).toLocaleString(locale, { style: "currency", currency: "EUR" });

/** The Pass's seal (Lagune): a gold star in its own dotted ring. */
function Seal({ size = 52 }: { size?: number }) {
  return (
    <svg
      viewBox="-75 -75 150 150"
      width={size}
      height={size}
      className="shrink-0"
      aria-hidden="true"
    >
      <circle r="70" fill="rgb(var(--gold))" fillOpacity="0.1" />
      <circle r="58" fill="none" stroke="rgb(var(--gold))" strokeWidth="3" strokeDasharray="1 6" />
      <circle r="46" fill="rgb(var(--gold))" />
      <circle r="38" fill="none" stroke="#8A6216" strokeWidth="3" />
      <path d="M0-22 L6-6 L22-6 L9 4 L14 20 L0 10 L-14 20 L-9 4 L-22-6 L-6-6 Z" fill="#8A6216" />
    </svg>
  );
}

/** Profile: the Pass Négociant, what it gives, how to win it, and its price (payment later). */
export function PassPanel({
  props,
  extra,
}: {
  props: GameProps;
  extra: Pick<GameResponse, "upcomingPass" | "passPrices">;
}) {
  const t = fr.game.pass;
  const pass = props.view.pass;
  // Off until it comes back: only its announcement.
  if (!pass.enabled) {
    return (
      <Panel glow="gold">
        <div className="flex items-center gap-3">
          <Seal />
          <div>
            <h3 className="font-place text-base font-bold uppercase tracking-[0.15em] text-gold">
              {t.title}
            </h3>
            <p className="mt-0.5 text-sm">{t.coming}</p>
          </div>
        </div>
      </Panel>
    );
  }
  // Only the perks the settings give: information to read and cosmetics.
  const p = pass.perks;
  const perks = [p.cosmetics && t.perks.cosmetics].filter(
    (x): x is string => typeof x === "string",
  );
  return (
    <Panel glow="gold">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Seal />
          <div>
            <h3 className="font-place text-base font-bold uppercase tracking-[0.15em] text-gold">
              {t.title}
            </h3>
            <p className="mt-0.5 text-sm">
              {pass.active
                ? t.active(date(pass.until))
                : extra.upcomingPass
                  ? t.upcoming(date(extra.upcomingPass.startsAt))
                  : t.inactive}
            </p>
          </div>
        </div>
        {pass.active && <Badge tone="gold">✓</Badge>}
      </div>
      <p className="mt-3 text-xs text-cream-dim">{t.pitch}</p>
      <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        {perks.map((perk) => (
          <li key={perk} className="flex min-h-12 items-center gap-3 rounded-2xl bg-night-2 px-3.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-gold" aria-hidden="true" />
            {perk}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-cream-dim">{t.trust}</p>
      {/* Won at the ranking: the way a free merchant gets it, in a dashed gold frame. */}
      <p className="mt-3 rounded-2xl border border-dashed border-gold/70 px-3.5 py-3 text-sm">
        {t.earn}
      </p>
      {extra.passPrices && (
        <div className="mt-4 flex min-h-12 flex-wrap items-center justify-between gap-2 rounded-full px-4 py-2 ring-1 ring-inset ring-line">
          <span className="text-sm font-semibold">
            {t.price(euros(extra.passPrices.season), euros(extra.passPrices.week))}
          </span>
          <span className="label">{t.soon}</span>
        </div>
      )}
    </Panel>
  );
}
