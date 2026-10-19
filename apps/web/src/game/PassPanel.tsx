import { Emblem } from "../art/logo.js";
import { fr } from "../i18n.js";
import { Badge, Label, Panel } from "../ui.js";
import type { GameProps } from "./Game.js";
import type { GameResponse } from "./types.js";

const date = (t: number) =>
  new Date(t).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
const euros = (cents: number) =>
  (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

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
          <Emblem size={44} className="shrink-0" />
          <div>
            <Label className="text-gold">{t.title}</Label>
            <p className="mt-0.5 text-sm">{t.coming}</p>
          </div>
        </div>
      </Panel>
    );
  }
  const p = pass.perks;
  const perks = [
    p.marketMakerQuotaBps > 0 && t.perks.quota(p.marketMakerQuotaBps / 100),
    p.extraOpenOrders > 0 && t.perks.orders(p.extraOpenOrders),
    p.freshBonusBps > 0 && t.perks.fresh(p.freshBonusBps / 100),
    p.contractRerollsPerDay > 0 && t.perks.reroll,
    t.perks.info,
    t.perks.alerts,
    t.perks.cosmetics,
  ].filter((x): x is string => typeof x === "string");
  return (
    <Panel glow="gold">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Emblem size={44} className="shrink-0" />
          <div>
            <Label className="text-gold">{t.title}</Label>
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
      <ul className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
        {perks.map((perk) => (
          <li key={perk} className="flex gap-2">
            <span className="text-gold">✦</span>
            {perk}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-lagoon">{t.earn}</p>
      {extra.passPrices && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 cut bg-night-2 px-3 py-2.5 ring-1 ring-inset ring-line/70">
          <span className="text-sm font-semibold">
            {t.price(euros(extra.passPrices.season), euros(extra.passPrices.week))}
          </span>
          <span className="label">{t.soon}</span>
        </div>
      )}
    </Panel>
  );
}
