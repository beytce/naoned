import { type ReactNode, useEffect, useState } from "react";
import { CityIcon } from "../../art/cities.js";
import { Coin } from "../../art/icons.js";
import { Portrait } from "../../art/portrait.js";
import { fr } from "../../i18n.js";
import { useCanal } from "../Canal.js";
import { decreeText } from "../Doge.js";
import type { GameProps } from "../Game.js";
import { series } from "../Marche.js";
import { merchantLabel } from "../Name.js";
import { openSeraLots } from "../Sera.js";
import { gameApi } from "../api.js";
import { amount, clockHour } from "../format.js";
import { topMove } from "../market.js";
import type { ElectionView } from "../types.js";
import { orbStyle } from "./Markers.js";
import { Icon } from "./icons.js";

/**
 * Venice, the Venise tab's screen (refonte UX, maquette `Venise`): the lion in the middle and its
 * four moons around it, each with its state in a line (Politics, the Market, the auctions, the
 * forty palaces), then the Doge of the month in one card. The city's own orders are its port.
 */
export function VeniceOrbit({
  props,
  ports,
  onPort,
}: {
  props: GameProps;
  /** Open orders of the city of Venice (its port): a way to them when there are any. */
  ports: number;
  onPort: () => void;
}) {
  const { view } = props;
  const t = fr.game.map.venice;
  const canal = useCanal();
  // The decree said by its effect needs the election's figures, fetched once.
  const [effects, setEffects] = useState<ElectionView["effects"] | null>(null);
  useEffect(() => {
    gameApi
      .election()
      .then((e) => setEffects(e?.effects ?? null))
      .catch(() => setEffects(null));
  }, []);
  const rumours = view.broglio?.today ?? 0;
  const move = topMove(
    Object.fromEntries(view.market.map((l) => [l.resource, series(props, l.resource)])),
  );
  const lots = openSeraLots(view);
  const offers = view.openOrders.length;
  const doge = canal?.doge ?? null;
  const moons: {
    key: string;
    name: string;
    state: string;
    icon: ReactNode;
    tone: string;
    badge?: number;
    call?: boolean;
    open: () => void;
  }[] = [
    {
      key: "politics",
      name: t.politics,
      state: rumours > 0 ? t.rumours(rumours) : t.politicsCalm,
      icon: Icon.decree(),
      tone: "text-rumour ring-rumour/70",
      call: rumours > 0,
      open: () => props.setSheet("broglio"),
    },
    {
      key: "market",
      name: t.market,
      state: move
        ? t.move(
            props.names.resource(move.resource).toLowerCase(),
            move.change > 0,
            Math.round(Math.abs(move.change)),
          )
        : t.marketCalm,
      icon: Icon.rialto(),
      tone: "text-info ring-info/70",
      badge: offers,
      open: () => props.setSheet("rialto"),
    },
    {
      key: "auctions",
      name: t.auctions,
      state:
        lots > 0
          ? t.lots(lots)
          : t.tonight(clockHour(view.sera?.hour ?? 20, view.sera?.minutes ?? 0)),
      icon: Icon.anchor(),
      tone: "text-gold ring-gold/70",
      call: lots > 0,
      open: () => props.setSheet("sera"),
    },
    {
      key: "palaces",
      name: t.palaces,
      state: view.standing.rank ? t.rank(view.standing.rank) : t.palacesCalm,
      icon: Icon.home(),
      tone: "text-lagoon ring-lagoon/70",
      open: () => props.setSheet("canal"),
    },
  ];
  // Top, right, bottom, left: the four moons on their orbit (in % of the square).
  const at = [
    { x: 50, y: 14 },
    { x: 86, y: 50 },
    { x: 50, y: 86 },
    { x: 14, y: 50 },
  ];
  const election = view.election?.open ?? false;
  return (
    <section
      data-orbit
      data-place
      data-panel
      aria-label={t.title}
      className="orbit-in absolute inset-x-0 top-0 bottom-[var(--tabbar)] z-[25] flex flex-col overflow-hidden bg-[radial-gradient(ellipse_at_50%_32%,rgb(var(--night-3))_0%,rgb(var(--night))_62%)] lg:right-[var(--side,0px)]"
    >
      <header className="relative z-10 flex min-h-11 items-center justify-between gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h2 className="font-place text-base font-bold uppercase tracking-[0.2em] text-cream">
          {t.title}
        </h2>
        <span className="flex shrink-0 items-center gap-1.5 font-display text-lg font-extrabold text-gold">
          {amount(BigInt(view.cash))}
          <Coin size={20} />
        </span>
      </header>

      <div className="flex min-h-0 flex-1 items-center justify-center px-2">
        <div className="relative aspect-square h-full max-h-[26rem] max-w-full">
          <svg
            viewBox="0 0 100 100"
            className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
            aria-hidden="true"
          >
            <circle
              cx="50"
              cy="50"
              r="36"
              fill="none"
              stroke="rgb(var(--line))"
              strokeWidth="0.3"
              strokeDasharray="0.8 1.6"
            />
          </svg>
          <span
            className="absolute left-1/2 top-1/2 flex h-[24%] w-[24%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-[0_8px_28px_rgb(0_0_0/0.5)] ring-2 ring-[#BFE3FF]/45"
            style={orbStyle("venezia")}
          >
            <CityIcon
              code="venezia"
              className="h-3/5 w-3/5 drop-shadow-[0_1px_2px_rgb(0_0_0/0.6)]"
            />
          </span>
          {moons.map((moon, i) => {
            const p = at[i] ?? { x: 50, y: 50 };
            return (
              <button
                key={moon.key}
                type="button"
                data-coach={`venice-${moon.key}`}
                onClick={moon.open}
                className="absolute flex w-28 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 text-center transition active:scale-95"
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
              >
                <span
                  className={`relative flex h-14 w-14 items-center justify-center rounded-full bg-night-2 ring-2 ${moon.tone} ${moon.call ? "shadow-[0_0_18px_currentColor]" : ""}`}
                >
                  {moon.icon}
                  {!!moon.badge && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-info px-1 font-display text-xs font-bold text-ink ring-2 ring-night">
                      {moon.badge}
                    </span>
                  )}
                </span>
                <span className="font-place text-xs font-bold uppercase tracking-[0.12em] text-cream">
                  {moon.name}
                </span>
                <span className="text-xs leading-tight text-cream-dim">{moon.state}</span>
              </button>
            );
          })}
        </div>
      </div>

      <section className="space-y-2 rounded-t-3xl border-t border-line bg-night-2 px-4 pb-4 pt-3">
        {doge && (
          // The Doge of the month: who, and the decree by its effect; the Senate while it votes.
          <DogeCard
            open={election ? () => props.setSheet("senate") : undefined}
            name={merchantLabel(doge.pseudo, false)}
            crest={doge.crest}
            decree={decreeText(doge.decree, effects, props.names)}
          />
        )}
        {ports > 0 && (
          <button
            type="button"
            data-coach="venice-port"
            onClick={onPort}
            className="flex h-11 w-full items-center justify-center rounded-full text-sm font-semibold text-cream ring-1 ring-inset ring-edge transition active:scale-[0.97]"
          >
            {t.port(ports)}
          </button>
        )}
      </section>
    </section>
  );
}

function DogeCard({
  name,
  crest,
  decree,
  open,
}: {
  name: string;
  crest: Parameters<typeof Portrait>[0]["crest"];
  decree: string;
  open?: () => void;
}) {
  const t = fr.game.map.venice;
  const body = (
    <>
      <Portrait given={name} crest={crest} size={40} doge />
      <span className="min-w-0 flex-1 text-left">
        <b className="block text-sm">{t.doge(name)}</b>
        <span className="block text-xs text-cream-dim">{t.decree(decree)}</span>
      </span>
      {open && (
        <span className="text-xl text-cream-dim" aria-hidden="true">
          ›
        </span>
      )}
    </>
  );
  return open ? (
    <button
      type="button"
      onClick={open}
      className="flex w-full items-center gap-3 rounded-2xl bg-night-3 px-3 py-2.5 ring-1 ring-inset ring-edge transition active:scale-[0.98]"
    >
      {body}
    </button>
  ) : (
    <div className="flex items-center gap-3 rounded-2xl bg-night-3 px-3 py-2.5">{body}</div>
  );
}
