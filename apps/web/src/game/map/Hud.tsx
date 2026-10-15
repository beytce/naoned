import type { ReactNode } from "react";
import { Crest, type CrestData } from "../../art/crest.js";
import { Coin } from "../../art/icons.js";
import { Lorenzo } from "../../art/scenes.js";
import { fr } from "../../i18n.js";
import { CountUp } from "../../ui.js";
import { amount } from "../format.js";
import { Icon } from "./icons.js";

/**
 * The map's heads-up display, floating on the night without any bar: who the merchant is (the
 * season's progress as a ring around their arms), their purse and their carts, the notices, and
 * three round doors at the foot while nothing is selected.
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
        <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-vermilion px-1 font-mono text-[10px] font-bold text-cream ring-2 ring-night">
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
  rank,
  seasonProgress,
  cash,
  freeCarts,
  carts,
  canBuyCart,
  notices,
  guidePaused,
  bottom,
  hasFamily,
  layer,
  familyCalls,
  right,
  onProfile,
  onNotices,
  onBuyCart,
  onResumeGuide,
  onRanking,
  onFamily,
  onHelp,
}: {
  pseudo: string;
  crest: CrestData;
  title: string;
  rank: number | null;
  seasonProgress: number;
  cash: string;
  freeCarts: number;
  carts: number;
  canBuyCart: boolean;
  notices: number | boolean;
  guidePaused: boolean;
  /** The round doors at the foot (hidden while a panel is up). */
  bottom: boolean;
  hasFamily: boolean;
  /** The map shown: the family door switches between the two. */
  layer: "trade" | "campaign";
  /** Something waits at the family (a levy, a threat, a message, an invitation). */
  familyCalls: boolean;
  /** Replaces the purse's column on the right (the families' glory on the campaign). */
  right?: ReactNode;
  onProfile: () => void;
  onNotices: () => void;
  onBuyCart: () => void;
  onResumeGuide: () => void;
  onRanking: () => void;
  onFamily: () => void;
  onHelp: () => void;
}) {
  const m = fr.game.map;
  return (
    <>
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
              className="block text-left font-mono text-[10.5px] uppercase tracking-[0.1em] text-cream-dim"
            >
              {title} · <span className="text-gold">#{rank ?? "—"}</span>
            </button>
          </span>
        </div>
        <div className="flex gap-2 pl-[7px]">
          <Orb label={m.notices} onClick={onNotices} badge={notices} coach="hud-notices">
            {Icon.bell()}
          </Orb>
          {guidePaused && (
            <Orb label={m.resumeGuide} onClick={onResumeGuide} tone="gold">
              <Lorenzo size={30} />
            </Orb>
          )}
        </div>
      </div>

      <div className="pointer-events-none absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10 flex flex-col items-end gap-1.5 lg:right-5 lg:top-5">
        <span className="flex items-center gap-2">
          <span className="font-display text-xl font-extrabold tabular-nums text-gold [text-shadow:0_1px_4px_rgb(0_0_0/0.9)]">
            <CountUp value={Number(cash)} format={(v) => amount(BigInt(Math.round(v)))} />
          </span>
          <span className="hud-orb flex h-9 w-9 items-center justify-center rounded-full">
            <Coin size={24} />
          </span>
        </span>
        {!right && carts > 0 && (
          <span className="flex items-center gap-2" aria-label={m.carts}>
            <span className="font-display text-lg font-extrabold tabular-nums text-lagoon [text-shadow:0_1px_4px_rgb(0_0_0/0.9)]">
              {freeCarts} / {carts}
            </span>
            <span className="hud-orb flex h-9 w-9 items-center justify-center rounded-full text-lagoon">
              {Icon.cart()}
            </span>
          </span>
        )}
        {!right && canBuyCart && (
          <Orb label={m.buyCart} onClick={onBuyCart} size={36} tone="lagoon">
            {Icon.plus()}
          </Orb>
        )}
      </div>

      {right}
      {bottom && (
        <nav className="pointer-events-none absolute inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-10 flex justify-center gap-7 lg:bottom-6">
          <Door label={m.buttons.ranking} onClick={onRanking}>
            {Icon.trophy()}
          </Door>
          {hasFamily && (
            <Door
              label={layer === "campaign" ? m.campaign.toTrade : m.campaign.toCampaign}
              onClick={onFamily}
              dot={layer === "trade" && familyCalls}
              active={layer === "campaign"}
              coach="door-layer"
            >
              {layer === "campaign" ? Icon.rialto() : Icon.family()}
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
  coach,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  /** Something waits behind it. */
  dot?: boolean;
  /** The door leads back (its layer is the one shown). */
  active?: boolean;
  coach?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-coach={coach}
      className={`pointer-events-auto flex flex-col items-center gap-1 transition active:scale-90 ${active ? "text-gold" : "text-cream-dim"}`}
    >
      <span
        className={`hud-orb relative flex h-12 w-12 items-center justify-center rounded-full ${active ? "ring-2 ring-gold/70" : ""}`}
      >
        {children}
        {dot && (
          <span className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full bg-vermilion ring-2 ring-night" />
        )}
      </span>
      <span className="font-mono text-[9px] uppercase tracking-[0.1em] [text-shadow:0_1px_3px_rgb(0_0_0/0.9)]">
        {label}
      </span>
    </button>
  );
}
