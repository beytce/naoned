import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../api.js";
import { fr } from "../i18n.js";
import { Badge, Big, Label, Panel, Sheet, Slab } from "../ui.js";
import type { GameProps } from "./Game.js";
import { gameApi } from "./api.js";
import type { HouseView } from "./types.js";

/**
 * The Livre de la Maison (docs/plan-progression.md): the Influence the house keeps from season
 * to season, the patents it buys with it, and the second counter of the season. Nothing shows in
 * a world without the house.
 */

const t = () => fr.game.house;

export function patentName(code: string): string {
  return t().patents[code]?.name ?? code;
}

/** The house's Influence, loaded once; `null` while loading or in a world without it. */
export function useHouse(): [Extract<HouseView, { enabled: true }> | null, () => void] {
  const [house, setHouse] = useState<HouseView | null>(null);
  const load = useCallback(() => {
    gameApi
      .house()
      .then(setHouse)
      .catch(() => setHouse(null));
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  return [house?.enabled ? house : null, load];
}

/** On the profile: the balance and the way into the book. */
export function HouseSummary(props: GameProps) {
  const [house] = useHouse();
  if (!house) return null;
  const toChoose = needsSecondCounter(props);
  return (
    <Panel glow={toChoose ? "gold" : undefined}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label>{t().title}</Label>
          <Big className="mt-1 text-gold">{t().balance(house.influence)}</Big>
          {toChoose && <p className="mt-1 text-sm text-gold">{t().second.choose}</p>}
        </div>
        <Slab size="sm" onClick={() => props.setSheet("house")}>
          {t().open}
        </Slab>
      </div>
    </Panel>
  );
}

/** The house holds the second counter but has not set it down this season. */
export function needsSecondCounter(props: GameProps): boolean {
  const p = props.view.player;
  return !!p.patents?.includes("second_counter") && !p.secondRegion;
}

export function HouseSheet(props: GameProps) {
  const open = props.sheet === "house";
  return (
    <Sheet open={open} onClose={() => props.setSheet(null)}>
      {open && <HouseBody {...props} />}
    </Sheet>
  );
}

function HouseBody(props: GameProps) {
  const [house, reload] = useHouse();
  const [message, setMessage] = useState<string | null>(null);
  const [buying, setBuying] = useState<string | null>(null);
  if (!house) return null;
  const errors = fr.game.errors as Record<string, string>;
  const buy = async (code: string) => {
    setBuying(code);
    setMessage(null);
    try {
      await gameApi.buyPatent(code);
      setMessage(t().bought(patentName(code)));
      reload();
    } catch (e) {
      const key = e instanceof ApiError ? e.code : "unknown";
      setMessage(errors[key] ?? fr.errors.unknown ?? key);
    } finally {
      setBuying(null);
    }
  };
  const player = props.view.player;
  const regions = props.catalog.regions.filter((r) => r.code !== player.region);
  return (
    <div className="space-y-6 pt-2">
      <header className="space-y-2 pr-12">
        <h1 className="font-display text-3xl font-extrabold">{t().title}</h1>
        <Big className="text-gold">{t().balance(house.influence)}</Big>
        <p className="text-sm text-cream-dim">{t().intro}</p>
        <p className="text-sm text-cream-dim">{t().earn}</p>
      </header>

      {message && <p className="text-sm text-lagoon">{message}</p>}

      {needsSecondCounter(props) && (
        <Panel glow="gold">
          <Label className="text-gold">{t().second.choose}</Label>
          <p className="mt-1 text-sm text-cream-dim">{t().second.chooseHelp}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {regions.map((r) => (
              <Slab
                key={r.code}
                size="sm"
                tone="lagoon"
                disabled={props.busy}
                onClick={() => void props.act({ type: "chooseSecondCounter", region: r.code })}
              >
                {props.names.region(r.code)}
              </Slab>
            ))}
          </div>
        </Panel>
      )}
      {player.secondRegion && (
        <p className="label text-lagoon">
          {t().second.at(props.names.region(player.secondRegion))}
        </p>
      )}

      <section className="space-y-3">
        <h2 className="font-display text-2xl font-extrabold">{t().catalog}</h2>
        {[...house.catalog]
          .sort((a, b) => Number(a.owned) - Number(b.owned) || a.cost - b.cost)
          .map((p) => {
            const missing = p.requires.filter((r) => !house.patents.includes(r));
            return (
              <Panel key={p.code}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-lg font-extrabold">{patentName(p.code)}</p>
                    <p className="text-sm text-cream-dim">{t().patents[p.code]?.text}</p>
                    {!p.owned && missing.length > 0 && (
                      <p className="label mt-1 text-vermilion">
                        {t().requires(missing.map(patentName).join(", "))}
                      </p>
                    )}
                  </div>
                  {p.owned ? (
                    <Badge tone="lagoon">{t().owned}</Badge>
                  ) : (
                    <Slab
                      size="sm"
                      disabled={buying !== null || missing.length > 0 || house.influence < p.cost}
                      onClick={() => void buy(p.code)}
                    >
                      {t().buy(p.cost)}
                    </Slab>
                  )}
                </div>
              </Panel>
            );
          })}
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-2xl font-extrabold">{t().history}</h2>
        {house.entries.length === 0 ? (
          <p className="text-sm text-cream-dim">{t().none}</p>
        ) : (
          <ul className="space-y-1">
            {house.entries.map((e, i) => (
              <li
                key={`${e.at}-${i}`}
                className="flex items-center justify-between gap-3 border-b border-line/40 py-1.5 text-sm"
              >
                <span className="text-cream-dim">
                  {e.patent ? patentName(e.patent) : (t().sources[e.source]?.(e.week) ?? e.source)}
                </span>
                <span
                  className={`font-mono font-bold tabular-nums ${e.amount < 0 ? "text-vermilion" : "text-lagoon"}`}
                >
                  {e.amount > 0 ? `+${e.amount}` : e.amount}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
