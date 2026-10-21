import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../api.js";
import { fr } from "../i18n.js";
import { Badge, Big, Label, Panel, Sheet, Slab, clock } from "../ui.js";
import type { GameProps } from "./Game.js";
import { gameApi } from "./api.js";
import type { HouseView } from "./types.js";

/**
 * The Livre de la Maison (docs/plan-progression.md): the Influence the house keeps from season
 * to season and the privileges (`patents`) it buys with it. Nothing shows in a world without the
 * house.
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
  return (
    <Panel>
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label>{t().title}</Label>
          <Big className="mt-1 text-gold">{t().balance(house.influence)}</Big>
        </div>
        <Slab size="sm" onClick={() => props.setSheet("house")}>
          {t().open}
        </Slab>
      </div>
    </Panel>
  );
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
  const balance = props.influence ?? house.influence;
  const spend = props.view.houseSpend;
  return (
    <div className="space-y-6 pt-2">
      <header className="space-y-2 pr-12">
        <h1 className="font-display text-3xl font-extrabold">{t().title}</h1>
        <Big className="text-gold">{t().balance(balance)}</Big>
        <p className="text-sm text-cream-dim">{t().intro}</p>
        <p className="text-sm text-cream-dim">{t().earn}</p>
      </header>

      {message && <p className="text-sm text-lagoon">{message}</p>}

      <Missions {...props} onClaimed={reload} />

      {props.view.mastery.chosen && spend && (
        <Panel>
          <Label>
            {t().spend.respecTitle(
              fr.game.mastery.names[props.view.mastery.chosen] ?? props.view.mastery.chosen,
            )}
          </Label>
          <p className="mt-1 text-sm text-cream-dim">{t().spend.respecHelp}</p>
          <Slab
            size="sm"
            className="mt-3"
            disabled={props.busy || balance < spend.respec}
            onClick={async () => {
              if (await props.spend({ use: "respec" })) {
                reload();
                props.setSheet("mastery");
              }
            }}
          >
            {t().spend.respec(spend.respec)}
          </Slab>
        </Panel>
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
                      <p className="meta mt-1 text-vermilion">
                        {t().requires(missing.map(patentName).join(", "))}
                      </p>
                    )}
                  </div>
                  {p.owned ? (
                    <Badge tone="lagoon">{t().owned}</Badge>
                  ) : (
                    <Slab
                      size="sm"
                      disabled={buying !== null || missing.length > 0 || balance < p.cost}
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

/** The board of the house's missions: ten every three and a half days, paid in Influence. */
function Missions(props: GameProps & { onClaimed: () => void }) {
  const board = props.view.houseMissions;
  if (!board || board.missions.length === 0) return null;
  const m = t().missions;
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl font-extrabold">{m.title}</h2>
        <span className="note">{m.renews(clock(board.endsAt - props.now))}</span>
      </div>
      <ul className="space-y-2">
        {board.missions.map((mission) => (
          <li
            key={mission.id}
            className="flex items-center gap-3 cut bg-night-2 px-3 py-2.5 ring-1 ring-inset ring-line/70"
          >
            <span
              className={`flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full px-1.5 font-mono text-xs font-bold ${mission.claimed ? "bg-lagoon text-on-lagoon" : mission.done ? "bg-gold text-ink" : "bg-night-4 text-cream-dim ring-1 ring-inset ring-line"}`}
            >
              {mission.claimed ? "✓" : `${mission.progress}/${mission.count}`}
            </span>
            <p
              className={`min-w-0 flex-1 text-sm ${mission.claimed ? "text-cream-dim line-through" : ""}`}
            >
              {m.names[mission.id]?.(mission.count) ?? mission.id}
            </p>
            {mission.done && !mission.claimed ? (
              <Slab
                size="sm"
                disabled={props.busy}
                onClick={async () => {
                  if (await props.act({ type: "claimHouseMission", missionId: mission.id }))
                    props.onClaimed();
                }}
              >
                {m.claim(mission.influence)}
              </Slab>
            ) : (
              <span className="meta shrink-0 text-gold">
                {mission.claimed ? m.claimed : m.reward(mission.influence)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
