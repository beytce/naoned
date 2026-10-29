import { type ReactNode, useEffect, useRef } from "react";
import { BaleArt } from "../../art/bale.js";
import { Crest, type CrestData } from "../../art/crest.js";
import { Coin } from "../../art/icons.js";
import { ResourceIcon } from "../../art/resources.js";
import { Lorenzo } from "../../art/scenes.js";
import { fr } from "../../i18n.js";
import { Odometer } from "../../ui.js";
import { leagueOf } from "../Sfida.js";
import { amount } from "../format.js";
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
  level,
  tier,
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
  layer,
  right,
  actions,
  timeline,
  onProfile,
  onNotices,
  onBales,
  onBuyCart,
  onResumeGuide,
  onHelp,
  onBand,
  daily,
  onDaily,
}: {
  pseudo: string;
  crest: CrestData;
  title: string;
  /** Permanent level (honorary), once known. */
  level: number | null;
  /** The Lustre's tier (R6), shown in the level's place once it is on. */
  tier?: string | null;
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
  onBuyCart: () => void;
  onResumeGuide: () => void;
  /** The Terraferma's guide: a round beside the bell there (on the trade, the help is in the profile). */
  onHelp?: () => void;
  /**
   * Where the HUD's band across the top ends (its identity, the rounds on the
   * left and the right column), in px from the top of the screen: the map frames itself under it.
   */
  onBand?: (bottom: number) => void;
  /** The tasks of the day (the trade's header, refonte UX): done of all, a chest waiting. */
  daily?: { done: number; total: number; ready: boolean } | null;
  onDaily?: () => void;
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
        {layer === "trade" ? (
          // The trade's header (refonte UX, maquette `Main`): the purse (the profile behind it),
          // the tasks of the day and the bell; under the bell, the vehicles.
          <>
            <button
              type="button"
              data-hud="purse"
              data-fx="purse"
              aria-label={m.purse(amount(BigInt(cash)))}
              onClick={onProfile}
              className="hud-orb pointer-events-auto flex min-h-11 items-center gap-2.5 justify-self-start rounded-full py-1.5 pl-1.5 pr-3.5 transition active:scale-95"
            >
              <Coin size={30} />
              <span className="font-display text-xl font-extrabold tabular-nums text-gold [font-stretch:100%] min-[360px]:[font-stretch:125%]">
                <Odometer text={amount(BigInt(cash))} />
              </span>
            </button>
            <div className="flex items-center gap-2">
              {daily && onDaily && (
                <DailyRing
                  done={daily.done}
                  total={daily.total}
                  ready={daily.ready}
                  onClick={onDaily}
                />
              )}
              <Orb label={m.notices} onClick={onNotices} badge={notices} coach="hud-notices">
                {Icon.bell()}
              </Orb>
            </div>
            <div className="flex items-start gap-2">
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
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {(carts > 0 || canBuyCart) && (
                <span className="relative flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setTip(null);
                      if (carts > 0) onFleet();
                      else onBuyCart();
                    }}
                    aria-label={carts > 0 ? m.fleet.open : m.buyCart}
                    aria-expanded={carts > 0 ? fleetOpen : undefined}
                    data-hud="carts"
                    className="pointer-events-auto flex h-11 min-w-11 items-center justify-center rounded-full transition active:scale-95"
                  >
                    <span
                      className={`hud-orb flex h-11 min-w-11 items-center justify-center gap-1 rounded-full px-2 text-lagoon ${fleetOpen ? "ring-2 ring-lagoon/80" : ""}`}
                    >
                      <span className="scale-90">{Icon.cart()}</span>
                      {carts > 0 && (
                        <span className="font-display text-sm font-extrabold tabular-nums">
                          {freeCarts}/{carts}
                        </span>
                      )}
                    </span>
                  </button>
                  {fleet}
                </span>
              )}
              {/* The bread only when it runs short: its steady use is no news. */}
              {bread && bread.state !== "ok" && (
                <HudCounter
                  label={fr.game.rations.hud(bread.stock, bread.perDay)}
                  value={bread.stock}
                  valueClass={`text-lg ${bread.state === "hungry" ? "text-vermilion" : "text-gold"}`}
                  icon={<ResourceIcon code="bread" size={24} />}
                  alert={bread.state === "hungry" ? "vermilion" : "gold"}
                  open={tip === "bread"}
                  onToggle={() => toggle("bread")}
                  tip={shownTip === "bread" ? (tips.bread ?? null) : null}
                  leaving={tipLeaving}
                />
              )}
            </div>
          </>
        ) : (
          <>
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
                      <span className="whitespace-nowrap">
                        · {fr.game.merchantLevel.short(level)}
                      </span>
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
            {/*
          One row of rounds, never further down the map: the bell and the Rialto, then the bales
          and Lorenzo when the guide is paused. The map starts right under it.
        */}
            <div className="flex items-start gap-2">
              <span className="flex items-center gap-2">
                <Orb label={m.notices} onClick={onNotices} badge={notices} coach="hud-notices">
                  {Icon.bell()}
                </Orb>
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
                    <Orb
                      label={m.bales(bales)}
                      onClick={onBales}
                      badge={bales}
                      size={34}
                      tone="gold"
                    >
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
                    bread.state === "hungry"
                      ? "vermilion"
                      : bread.state === "low"
                        ? "gold"
                        : undefined
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
          </>
        )}
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

/**
 * The tasks of the day as a round of 44 px (refonte UX): a chest in a ring whose arc is the tasks
 * done; it glows lagoon while a reward waits to be taken.
 */
function DailyRing({
  done,
  total,
  ready,
  onClick,
}: { done: number; total: number; ready: boolean; onClick: () => void }) {
  const c = 2 * Math.PI * 20;
  const share = total > 0 ? done / total : 0;
  return (
    <button
      type="button"
      aria-label={fr.game.map.dailyRing(done, total)}
      data-hud="daily"
      data-coach="hud-daily"
      onClick={onClick}
      className="pointer-events-auto relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-cream transition active:scale-90"
    >
      <span
        className={`hud-orb absolute inset-0 rounded-full ${ready ? "hud-alert" : ""}`}
        data-tone={ready ? "lagoon" : undefined}
      />
      <svg viewBox="0 0 44 44" className="absolute inset-0 h-11 w-11 -rotate-90" aria-hidden="true">
        <circle cx="22" cy="22" r="20" fill="none" stroke="rgb(var(--line))" strokeWidth="3" />
        <circle
          cx="22"
          cy="22"
          r="20"
          fill="none"
          stroke={ready ? "rgb(var(--lagoon))" : "rgb(var(--info))"}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${(c * Math.max(0.02, share)).toFixed(1)} ${c.toFixed(1)}`}
        />
      </svg>
      <svg width="20" height="18" viewBox="0 0 20 18" aria-hidden="true" className="relative">
        <rect
          x="1"
          y="6"
          width="18"
          height="11"
          rx="2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M1 9 H19 M3 6 C 3 1, 17 1, 17 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
    </button>
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
    // A block that comes or goes (the bales, the bread): watched too.
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
