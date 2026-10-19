import { type ReactNode, useEffect, useState } from "react";
import { BaleArt } from "../../art/bale.js";
import { Crest, type CrestData } from "../../art/crest.js";
import { Coin } from "../../art/icons.js";
import { ResourceIcon } from "../../art/resources.js";
import { Lorenzo } from "../../art/scenes.js";
import { fr } from "../../i18n.js";
import { CountUp } from "../../ui.js";
import { amount } from "../format.js";
import { HudCounter, type TipContent, type TipKey, usePresence, useTip } from "./HudTips.js";
import { Icon } from "./icons.js";

/**
 * The map's heads-up display, floating on the night without any bar: who the merchant is (the
 * season's progress as a ring around their arms), their purse, the workers' bread and their
 * carts, the notices, and three round doors at the foot while nothing is selected.
 */

function Orb({
  children,
  label,
  onClick,
  badge,
  size = 44,
  tone,
  coach,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  badge?: number | boolean;
  size?: number;
  tone?: "lagoon" | "gold";
  coach?: string;
}) {
  const ink = tone === "lagoon" ? "text-lagoon" : tone === "gold" ? "text-gold" : "text-cream";
  return (
    <button
      type="button"
      aria-label={label}
      data-coach={coach}
      onClick={onClick}
      style={{ width: size, height: size }}
      className={`hud-orb pointer-events-auto relative flex shrink-0 items-center justify-center rounded-full transition active:scale-90 ${ink}`}
    >
      {children}
      {badge !== undefined && badge !== false && badge !== 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-vermilion px-1 font-mono text-xs font-bold text-cream ring-2 ring-night">
          {badge === true ? "" : badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

function SeasonRing({ progress, children }: { progress: number; children: ReactNode }) {
  const r = 25;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative flex h-[58px] w-[58px] shrink-0 items-center justify-center">
      <svg viewBox="0 0 58 58" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle
          cx="29"
          cy="29"
          r={r}
          fill="rgb(var(--night) / 0.7)"
          stroke="rgb(var(--cream) / 0.12)"
          strokeWidth="3"
        />
        <circle
          cx="29"
          cy="29"
          r={r}
          fill="none"
          stroke="rgb(var(--gold))"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${(c * Math.min(1, Math.max(0.01, progress))).toFixed(1)} ${c.toFixed(1)}`}
        />
      </svg>
      <span className="relative">{children}</span>
    </span>
  );
}

export function MapHud({
  pseudo,
  crest,
  title,
  level,
  rank,
  seasonProgress,
  cash,
  influence,
  tips,
  bread,
  freeCarts,
  carts,
  canBuyCart,
  fleet,
  fleetOpen,
  onFleet,
  notices,
  bales,
  guidePaused,
  bottom,
  hasFamily,
  layer,
  doorLabel,
  familyCalls,
  workshopsReady,
  locks = {},
  right,
  onProfile,
  onNotices,
  onBales,
  onRialto,
  onBuyCart,
  onResumeGuide,
  onRanking,
  onFamily,
  onWorkshops,
  onHelp,
}: {
  pseudo: string;
  crest: CrestData;
  title: string;
  /** Permanent level (honorary), once known. */
  level: number | null;
  rank: number | null;
  seasonProgress: number;
  cash: string;
  /** The house's Influence, under the ducats (null: no house in this world). */
  influence: number | null;
  /** The cards unfolded by the counters (absent: the counter has none). */
  tips: Partial<Record<TipKey, TipContent>>;
  /**
   * The workers' bread: the reserve and what they eat a day, quiet while it lasts, gold under a
   * day's worth, vermilion while they go hungry (null: workers who eat nothing).
   */
  bread: { stock: number; perDay: number; state: "ok" | "low" | "hungry" } | null;
  freeCarts: number;
  carts: number;
  canBuyCart: boolean;
  /** The drawer of all the vehicles, under their counter. */
  fleet: ReactNode;
  fleetOpen: boolean;
  onFleet: () => void;
  notices: number | boolean;
  /** Bales of Faraj waiting to be opened: a small round under the bell while there are any. */
  bales: number;
  guidePaused: boolean;
  /** The round doors at the foot (hidden while a panel is up). */
  bottom: boolean;
  hasFamily: boolean;
  /** The map shown: the family door switches between the two. */
  layer: "trade" | "campaign" | "terra";
  /** The other layer's door, when it is not the families' (the Terraferma). */
  doorLabel?: string;
  /** Something waits at the family (a levy, a threat, a message, an invitation). */
  familyCalls: boolean;
  /** Batches waiting at the workshops (a dot on their door). */
  workshopsReady: boolean;
  /** Doors still closed in the first session, with what opens them. */
  locks?: { ranking?: string; layer?: string };
  /** Under the purse on the right, in place of the bread and the carts (the families' glory on the campaign). */
  right?: ReactNode;
  onProfile: () => void;
  onNotices: () => void;
  onBales: () => void;
  /** The Rialto, a round under the bell (absent where there is no market). */
  onRialto?: () => void;
  onBuyCart: () => void;
  onResumeGuide: () => void;
  onRanking: () => void;
  onFamily: () => void;
  onWorkshops: () => void;
  onHelp: () => void;
}) {
  const m = fr.game.map;
  const tipsT = m.tips;
  const [tip, setTip] = useTip();
  const { shown: shownTip, leaving: tipLeaving } = usePresence(tip, 120);
  const toggle = (key: TipKey) => setTip((t) => (t === key ? null : key));
  return (
    <>
      {tip && (
        // The map touched closes the card first.
        <button
          type="button"
          aria-label={m.close}
          onClick={() => setTip(null)}
          className="absolute inset-0 z-[9] cursor-default"
        />
      )}
      <div className="pointer-events-none absolute left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10 flex flex-col items-start gap-2 lg:left-5 lg:top-5">
        <div className="pointer-events-auto flex items-center gap-2.5">
          <button
            type="button"
            aria-label={fr.game.tabs.profil}
            onClick={onProfile}
            className="shrink-0 transition active:scale-95"
          >
            <SeasonRing progress={seasonProgress}>
              <Crest crest={crest} size={32} />
            </SeasonRing>
          </button>
          <span className="min-w-0 [text-shadow:0_1px_4px_rgb(0_0_0/0.9)]">
            <button
              type="button"
              onClick={onProfile}
              className="block max-w-[46vw] truncate text-left font-display text-xl font-extrabold leading-tight text-cream lg:max-w-xs"
            >
              {pseudo}
            </button>
            <button
              type="button"
              aria-label={fr.game.tabs.top}
              onClick={onRanking}
              className="block text-left font-mono text-xs uppercase tracking-[0.1em] text-cream-dim"
            >
              {level !== null && <>{fr.game.merchantLevel.short(level)} · </>}
              {title} · <span className="text-gold">#{rank ?? "—"}</span>
            </button>
          </span>
        </div>
        <div className="flex gap-2 pl-[7px]">
          <span className="flex flex-col items-center gap-1.5">
            <Orb label={m.notices} onClick={onNotices} badge={notices} coach="hud-notices">
              {Icon.bell()}
            </Orb>
            {onRialto && (
              <Orb label={m.buttons.rialto} onClick={onRialto} coach="hud-rialto">
                {Icon.rialto()}
              </Orb>
            )}
            {bales > 0 && (
              <Orb label={m.bales(bales)} onClick={onBales} badge={bales} size={34} tone="gold">
                <BaleArt size={26} className="bale-float" />
              </Orb>
            )}
          </span>
          {guidePaused && (
            <Orb label={m.resumeGuide} onClick={onResumeGuide} tone="gold">
              <Lorenzo size={30} />
            </Orb>
          )}
        </div>
      </div>

      <div className="pointer-events-none absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10 flex flex-col items-end gap-1.5 lg:right-5 lg:top-5">
        <HudCounter
          label={tipsT.cash.title}
          value={<CountUp value={Number(cash)} format={(v) => amount(BigInt(Math.round(v)))} />}
          valueClass="text-xl text-gold"
          icon={<Coin size={24} />}
          open={tip === "cash"}
          onToggle={() => toggle("cash")}
          tip={shownTip === "cash" ? (tips.cash ?? null) : null}
          leaving={tipLeaving}
        />
        {influence !== null && (
          <HudCounter
            label={tipsT.influence.title}
            value={influence}
            valueClass="text-lg text-gold-soft"
            icon={<span className="font-display text-sm font-extrabold">✦</span>}
            iconClass="text-gold-soft"
            open={tip === "influence"}
            onToggle={() => toggle("influence")}
            tip={shownTip === "influence" ? (tips.influence ?? null) : null}
            leaving={tipLeaving}
          />
        )}
        {!right && bread && (
          <HudCounter
            label={fr.game.rations.hud(bread.stock, bread.perDay)}
            side={
              <span className="font-mono text-xs text-cream-dim">
                {fr.game.rations.perDay(bread.perDay)}
              </span>
            }
            value={bread.stock}
            valueClass={`text-lg ${
              bread.state === "hungry"
                ? "text-vermilion"
                : bread.state === "low"
                  ? "text-gold"
                  : "text-cream"
            }`}
            icon={<ResourceIcon code="bread" size={24} />}
            alert={
              bread.state === "hungry" ? "vermilion" : bread.state === "low" ? "gold" : undefined
            }
            open={tip === "bread"}
            onToggle={() => toggle("bread")}
            tip={shownTip === "bread" ? (tips.bread ?? null) : null}
            leaving={tipLeaving}
          />
        )}
        {!right && carts > 0 && (
          <span className="relative flex justify-end">
            <button
              type="button"
              onClick={() => {
                setTip(null);
                onFleet();
              }}
              aria-label={fr.game.map.fleet.open}
              aria-expanded={fleetOpen}
              className="pointer-events-auto flex items-center gap-2 transition active:scale-95"
            >
              <span className="font-display text-lg font-extrabold tabular-nums text-lagoon [text-shadow:0_1px_4px_rgb(0_0_0/0.9)]">
                {freeCarts} / {carts}
              </span>
              <span
                className={`hud-orb flex h-9 w-9 items-center justify-center rounded-full text-lagoon ${
                  fleetOpen ? "ring-2 ring-lagoon/80" : ""
                }`}
              >
                {Icon.cart()}
              </span>
            </button>
            {fleet}
          </span>
        )}
        {!right && canBuyCart && !fleetOpen && (
          <Orb label={m.buyCart} onClick={onBuyCart} size={36} tone="lagoon">
            {Icon.plus()}
          </Orb>
        )}
        {right}
      </div>
      {bottom && (
        <nav className="pointer-events-none absolute inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-10 flex justify-center gap-4 lg:bottom-6">
          {/* The same four doors at the same places on every layer. */}
          <Door
            label={m.buttons.workshops}
            onClick={onWorkshops}
            dot={workshopsReady}
            coach="door-workshops"
          >
            {Icon.workshops()}
          </Door>
          <Door label={m.buttons.ranking} onClick={onRanking} locked={locks.ranking}>
            {Icon.trophy()}
          </Door>
          {(hasFamily || layer !== "trade") && (
            <Door
              label={layer !== "trade" ? m.campaign.toTrade : (doorLabel ?? m.campaign.toCampaign)}
              onClick={onFamily}
              dot={layer === "trade" && familyCalls && !locks.layer}
              active={layer !== "trade"}
              locked={layer === "trade" ? locks.layer : undefined}
              coach="door-layer"
            >
              {layer !== "trade" ? Icon.home() : Icon.family()}
            </Door>
          )}
          <Door label={m.buttons.help} onClick={onHelp}>
            {Icon.help()}
          </Door>
        </nav>
      )}
    </>
  );
}

function Door({
  children,
  label,
  onClick,
  dot,
  active,
  locked,
  coach,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  /** Something waits behind it. */
  dot?: boolean;
  /** The door leads back (its layer is the one shown). */
  active?: boolean;
  /** Still closed: what opens it, said for a moment when it is touched. */
  locked?: string;
  coach?: string;
}) {
  const [why, setWhy] = useState(false);
  useEffect(() => {
    if (!why) return;
    const t = setTimeout(() => setWhy(false), 2600);
    return () => clearTimeout(t);
  }, [why]);
  return (
    <button
      type="button"
      onClick={() => (locked ? setWhy(true) : onClick())}
      data-coach={coach}
      aria-label={locked ? `${label} : ${locked}` : label}
      aria-disabled={locked ? true : undefined}
      className={`pointer-events-auto relative flex w-16 flex-col items-center gap-1 transition active:scale-90 ${active ? "text-gold" : locked ? "text-muted" : "text-cream-dim"}`}
    >
      {why && locked && (
        <span className="absolute bottom-full mb-2 w-44 animate-fade bg-night-4 px-3 py-2 text-center text-xs leading-snug text-cream shadow-lg shadow-black/40 slab">
          {locked}
        </span>
      )}
      <span
        className={`hud-orb relative flex h-12 w-12 items-center justify-center rounded-full ${active ? "ring-2 ring-gold/70" : ""} ${locked ? "opacity-60" : ""}`}
      >
        {children}
        {dot && (
          <span className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full bg-vermilion ring-2 ring-night" />
        )}
        {locked && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-night-4 text-cream-dim ring-2 ring-night">
            {Icon.lock()}
          </span>
        )}
      </span>
      <span className="whitespace-nowrap text-xs font-semibold [text-shadow:0_1px_3px_rgb(0_0_0/0.9)]">
        {label}
      </span>
    </button>
  );
}
