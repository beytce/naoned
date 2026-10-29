import { type ReactNode, useEffect, useRef } from "react";
import { BaleArt } from "../../art/bale.js";
import { Crest, type CrestData } from "../../art/crest.js";
import { Coin } from "../../art/icons.js";
import { ResourceIcon } from "../../art/resources.js";
import { Lorenzo } from "../../art/scenes.js";
import { fr } from "../../i18n.js";
import { Odometer } from "../../ui.js";
import { MerchantName } from "../Name.js";
import { leagueOf } from "../Sfida.js";
import { amount } from "../format.js";
import type { RivalLine } from "../rival.js";
import { HudCounter, type TipContent, type TipKey, usePresence, useTip } from "./HudTips.js";
import { Icon } from "./icons.js";

/**
 * The map's heads-up display, floating on the night without any bar: who the merchant is (the
 * season's progress as a ring around their arms), their purse, the workers' bread and their
 * carts and the notices. The tabs at the foot are the TabBar's.
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
  // A small round keeps its look; the finger still gets 44 px around it.
  const hit = Math.max(size, 44);
  return (
    <button
      type="button"
      aria-label={label}
      data-coach={coach}
      data-hud="orb"
      onClick={onClick}
      style={{ width: hit, height: hit }}
      className={`pointer-events-auto relative flex shrink-0 items-center justify-center rounded-full transition active:scale-90 ${ink}`}
    >
      <span
        style={{ width: size, height: size }}
        className="hud-orb relative flex items-center justify-center rounded-full"
      >
        {children}
        {badge !== undefined && badge !== false && badge !== 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-vermilion px-1 font-display text-xs font-bold text-cream ring-2 ring-night">
            {badge === true ? "" : badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>
    </button>
  );
}

function SeasonRing({ progress, children }: { progress: number; children: ReactNode }) {
  const r = 25;
  const c = 2 * Math.PI * r;
  return (
    // A little smaller on the narrow phones, to leave the name its room.
    <span className="relative flex h-11 w-11 shrink-0 items-center justify-center min-[360px]:h-[50px] min-[360px]:w-[50px] min-[400px]:h-[58px] min-[400px]:w-[58px]">
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
  rival,
  level,
  tier,
  rank,
  seasonProgress,
  cash,
  rate,
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
  layer,
  right,
  actions,
  timeline,
  onProfile,
  onNotices,
  onBales,
  onRialto,
  onBuyCart,
  onResumeGuide,
  onRanking,
  onRival,
  onSera,
  sera = 0,
  onHelp,
  onBand,
}: {
  pseudo: string;
  crest: CrestData;
  title: string;
  /** The rival of the week, a line under the rank (null: none yet). */
  rival?: RivalLine | null;
  /** Permanent level (honorary), once known. */
  level: number | null;
  /** The Lustre's tier (R6), shown in the level's place once it is on. */
  tier?: string | null;
  rank: number | null;
  seasonProgress: number;
  cash: string;
  /** What the workshops earn an hour, under the purse (null: nothing runs yet). */
  rate?: string | null;
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
  /** The actions and the strip at the foot, above the tabs (hidden while a panel is up). */
  bottom: boolean;
  /** The map shown. */
  layer: "trade" | "campaign" | "terra";
  /** Under the purse on the right, in place of the bread and the carts (the families' glory on the campaign). */
  right?: ReactNode;
  /** A layer's actions at the thumb, at the bottom right above the tabs. */
  actions?: ReactNode;
  /** The strip of what comes next (the trade), above the tabs. */
  timeline?: ReactNode;
  onProfile: () => void;
  onNotices: () => void;
  onBales: () => void;
  /** The Rialto, a round under the bell (absent where there is no market). */
  onRialto?: () => void;
  onBuyCart: () => void;
  onResumeGuide: () => void;
  /** The Sera's sheet (R11), and its lots still open. */
  onSera?: () => void;
  sera?: number;
  /** The rival's line: the Sfida's sheet once the Lustre is on, else the ranking. */
  onRival?: () => void;
  onRanking: () => void;
  /** The Terraferma's guide: a round beside the bell there (on the trade, the help is in the profile). */
  onHelp?: () => void;
  /**
   * Where the HUD's band across the top ends (its identity, the rival's line, the rounds on the
   * left and the right column), in px from the top of the screen: the map frames itself under it.
   */
  onBand?: (bottom: number) => void;
}) {
  const m = fr.game.map;
  const grid = useRef<HTMLDivElement>(null);
  useBand(grid, onBand);
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
      {/*
        Two columns kept apart (who the merchant is on the left, the purse and the state of things
        on the right), each line held in its own: nothing written over the other at 320 px. The
        right one takes at most 46 %, never less than its widest figure (no min-w-0 on its cells:
        the purse is never cut); the left one takes the rest and truncates. The rival has a line
        of its own under them.
      */}
      <div
        ref={grid}
        className="pointer-events-none absolute inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10 grid grid-cols-[minmax(0,1fr)_fit-content(46%)] items-start gap-x-2 gap-y-1.5 lg:left-5 lg:right-[calc(var(--side,0px)+1.25rem)] lg:top-5 lg:grid-cols-[minmax(0,1fr)_fit-content(20rem)]"
      >
        <button
          type="button"
          data-hud="identity"
          aria-label={`${fr.game.tabs.profil} · ${pseudo}`}
          onClick={onProfile}
          className="pointer-events-auto flex min-w-0 max-w-full items-center gap-2 justify-self-start rounded-2xl text-left transition active:scale-95 min-[360px]:gap-2.5 lg:max-w-xs"
        >
          <SeasonRing progress={seasonProgress}>
            <Crest crest={crest} size={32} />
          </SeasonRing>
          <span className="min-w-0 [text-shadow:0_1px_4px_rgb(0_0_0/0.9)]">
            {/* Under 360 px, upright and a size down: ten letters of the name at least. */}
            <span
              data-hud-name
              className="block truncate font-display text-[1.0625rem] font-extrabold leading-tight text-cream [font-stretch:100%] min-[360px]:text-lg min-[360px]:[font-stretch:125%] min-[400px]:text-xl"
            >
              {pseudo}
            </span>
            {/*
              The rank first: on a narrow phone, the level then the title give way whole, each
              with its dot (a line one high, what does not fit wraps out of sight): never a dot
              left alone before an ellipsis.
            */}
            <span
              data-hud-meta
              className="flex h-4 flex-wrap gap-x-[0.6em] overflow-hidden font-mono text-xs uppercase leading-4 tracking-[0.1em] text-cream-dim"
            >
              <span className="whitespace-nowrap text-gold">#{rank ?? "—"}</span>
              {tier ? (
                <span className="whitespace-nowrap text-info">· {leagueOf(tier)}</span>
              ) : (
                level !== null && (
                  <span className="whitespace-nowrap">· {fr.game.merchantLevel.short(level)}</span>
                )
              )}
              <span className="whitespace-nowrap">· {title}</span>
            </span>
          </span>
        </button>
        <div className="flex flex-col items-end gap-1.5">
          <HudCounter
            label={tipsT.cash.title}
            fx="purse"
            value={<Odometer text={amount(BigInt(cash))} />}
            valueClass="text-lg text-gold [font-stretch:100%] min-[360px]:[font-stretch:125%] min-[400px]:text-xl"
            icon={<Coin size={24} />}
            open={tip === "cash"}
            onToggle={() => toggle("cash")}
            tip={shownTip === "cash" ? (tips.cash ?? null) : null}
            leaving={tipLeaving}
          />
          {rate && (
            <span
              data-hud="rate"
              className="-mt-1 whitespace-nowrap text-xs font-semibold text-lagoon [text-shadow:0_1px_3px_rgb(0_0_0/0.9)]"
            >
              {rate}
            </span>
          )}
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
        </div>
        {/* Its room kept while it waits for the first sale: the map is framed the same after. */}
        {!rival && layer === "trade" && (
          <span aria-hidden="true" className="col-span-2 block min-h-11" />
        )}
        {rival && layer === "trade" && (
          <button
            type="button"
            data-hud="rival"
            onClick={onRival ?? onRanking}
            className="pointer-events-auto col-span-2 flex min-h-11 min-w-0 max-w-full items-center justify-self-start text-left text-[0.8125rem] text-info [text-shadow:0_1px_4px_rgb(0_0_0/0.9)] lg:max-w-xs"
          >
            <span className="shrink-0 whitespace-pre">{`${rival.lead} `}</span>
            <MerchantName pseudo={rival.name} bot={rival.bot} />
            <span className="shrink-0 whitespace-nowrap">{rival.gap}</span>
          </button>
        )}
        {/*
          One row of rounds, never further down the map: the bell and the Rialto, then the bales
          and Lorenzo when the guide is paused. The map starts right under it.
        */}
        <div className="flex items-start gap-2">
          <span className="flex items-center gap-2">
            <Orb label={m.notices} onClick={onNotices} badge={notices} coach="hud-notices">
              {Icon.bell()}
            </Orb>
            {onRialto && (
              <Orb label={m.buttons.rialto} onClick={onRialto} coach="hud-rialto">
                {Icon.rialto()}
              </Orb>
            )}
            {/* The Sera (R11): its round while lots of the galleys wait for bids. */}
            {onSera && sera > 0 && (
              <Orb label={fr.game.sera.orb} onClick={onSera} badge={sera}>
                {Icon.anchor()}
              </Orb>
            )}
            {onHelp && (
              <Orb label={m.buttons.help} onClick={onHelp} coach="hud-help">
                {Icon.help()}
              </Orb>
            )}
          </span>
          {(bales > 0 || guidePaused) && (
            <span className="flex items-center gap-2">
              {guidePaused && (
                <Orb label={m.resumeGuide} onClick={onResumeGuide} tone="gold">
                  <Lorenzo size={30} />
                </Orb>
              )}
              {bales > 0 && (
                <Orb label={m.bales(bales)} onClick={onBales} badge={bales} size={34} tone="gold">
                  <BaleArt size={26} className="bale-float" />
                </Orb>
              )}
            </span>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {/* The bread only when it runs short: its steady use is no news. */}
          {!right && bread && bread.state !== "ok" && (
            <HudCounter
              label={fr.game.rations.hud(bread.stock, bread.perDay)}
              side={
                <span className="font-sans text-xs text-cream-dim">
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
                data-hud="carts"
                className="pointer-events-auto flex min-h-11 items-center gap-2 rounded-full transition active:scale-95"
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
      </div>
      {bottom && actions && (
        <div
          data-hud="actions"
          className="pointer-events-none absolute inset-x-3 bottom-[calc(var(--tabbar)+2rem)] z-10 flex justify-end lg:left-auto lg:right-[calc(var(--side,0px)+1.25rem)]"
        >
          {actions}
        </div>
      )}
      {bottom && timeline && (
        // Not on a short screen (a 320 × 568 phone): the map needs that room more.
        <div className="pointer-events-none absolute inset-x-0 bottom-[calc(var(--tabbar)+1.25rem)] z-10 flex justify-center px-4 lg:right-[var(--side,0px)] [@media(max-height:639px)]:hidden">
          <div className="w-full max-w-md">{timeline}</div>
        </div>
      )}
    </>
  );
}

/** Reports the bottom of the HUD's band across the top, again whenever one of its blocks moves. */
function useBand(
  grid: { current: HTMLElement | null },
  onBand: ((bottom: number) => void) | undefined,
) {
  useEffect(() => {
    const el = grid.current;
    if (!el || !onBand || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      let bottom = 0;
      for (const c of el.children) bottom = Math.max(bottom, c.getBoundingClientRect().bottom);
      onBand(Math.round(bottom));
    };
    const sizes = new ResizeObserver(measure);
    const watch = () => {
      sizes.disconnect();
      sizes.observe(el);
      for (const c of el.children) sizes.observe(c);
    };
    watch();
    // A block that comes or goes (the rival's line, the bread): watched too.
    const blocks = new MutationObserver(() => {
      watch();
      measure();
    });
    blocks.observe(el, { childList: true });
    return () => {
      sizes.disconnect();
      blocks.disconnect();
    };
  }, [grid, onBand]);
}
