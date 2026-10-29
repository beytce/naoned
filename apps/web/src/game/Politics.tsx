import { useEffect, useState } from "react";
import { fr } from "../i18n.js";
import { Sheet } from "../ui.js";
import { RumoursBody } from "./Broglio.js";
import { useCanal } from "./Canal.js";
import { SenateBody, decreeText } from "./Doge.js";
import type { GameProps } from "./Game.js";
import { MerchantName, merchantLabel } from "./Name.js";
import { gameApi } from "./api.js";
import { DogeCard } from "./map/Venice.js";
import { cityStanding } from "./politics.js";
import { useSignoria } from "./signoria.js";
import type { ElectionView } from "./types.js";

type Tab = "rumours" | "election" | "cities";

/** The keys that open Politics, and the tab each one opens on. */
const OPENS: Record<string, Tab> = {
  politics: "rumours",
  broglio: "rumours",
  senate: "election",
  cities: "cities",
};

/**
 * Politics (refonte UX lot 6, maquette `Palais`): the Rumours, the Election and the Cities in one
 * sheet, three tabs, the way in from Venice's moon. The old keys (`broglio`, `senate`) open it on
 * their tab, so the bell, the pushes and the shortcuts still lead there.
 */
export function PoliticsSheet(props: GameProps) {
  const key = props.sheet ?? "";
  const opens = OPENS[key];
  const open = opens !== undefined;
  const [tab, setTab] = useState<Tab>("rumours");
  useEffect(() => {
    if (opens) setTab(opens);
  }, [opens]);
  const t = fr.game.politics;
  const tabs: { value: Tab; label: string }[] = [
    { value: "rumours", label: t.tabs.rumours },
    ...(props.view.election !== undefined
      ? [{ value: "election" as const, label: t.tabs.election }]
      : []),
    ...(props.view.signoria ? [{ value: "cities" as const, label: t.tabs.cities }] : []),
  ];
  return (
    <Sheet open={open} onClose={() => props.setSheet(null)} title={t.title}>
      {open && (
        <div className="space-y-4">
          {tabs.length > 1 && (
            <div
              className="grid gap-1.5 rounded-full bg-night p-1"
              role="tablist"
              style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
            >
              {tabs.map((x) => (
                <button
                  key={x.value}
                  type="button"
                  role="tab"
                  aria-selected={tab === x.value}
                  onClick={() => setTab(x.value)}
                  className={`min-h-11 whitespace-nowrap rounded-full px-1 text-[0.8125rem] font-semibold transition ${tab === x.value ? "bg-info text-ink" : "text-cream-dim"}`}
                >
                  {x.label}
                </button>
              ))}
            </div>
          )}
          {tab === "election" ? (
            <>
              <DogeOfTheMonth props={props} />
              <SenateBody {...props} />
            </>
          ) : tab === "cities" ? (
            <Cities props={props} />
          ) : (
            <RumoursBody {...props} />
          )}
        </div>
      )}
    </Sheet>
  );
}

/** The Doge of the month at the head of the election: who, and the decree by its effect. */
function DogeOfTheMonth({ props }: { props: GameProps }) {
  const canal = useCanal();
  const [effects, setEffects] = useState<ElectionView["effects"] | null>(null);
  useEffect(() => {
    gameApi
      .election()
      .then((e) => setEffects(e?.effects ?? null))
      .catch(() => setEffects(null));
  }, []);
  const doge = canal?.doge;
  if (!doge) return null;
  return (
    <DogeCard
      name={merchantLabel(doge.pseudo, false)}
      crest={doge.crest}
      decree={decreeText(doge.decree, effects, props.names)}
    />
  );
}

/**
 * The cities (R2): who delivers most in a city holds it tomorrow; each city its master, the gauge
 * and the merchant's share against the leader's. A city opens its own sheet.
 */
function Cities({ props }: { props: GameProps }) {
  const data = useSignoria(props.view, true);
  const t = fr.game.politics;
  const s = fr.game.signoria;
  if (!data) return null;
  return (
    <div className="space-y-2">
      <p className="text-sm text-cream-dim">{t.citiesHelp}</p>
      {data.cities.map((line) => {
        const st = cityStanding(line);
        return (
          <button
            key={line.city}
            type="button"
            onClick={() => props.setSheet(`signoria:${line.city}`)}
            className="block w-full space-y-1.5 rounded-2xl bg-night-3 px-3 py-2.5 text-left ring-1 ring-inset ring-edge transition active:scale-[0.98]"
          >
            <span className="flex items-baseline justify-between gap-2">
              <span className="font-place text-sm font-bold uppercase tracking-[0.12em]">
                {props.names.city(line.city)}
              </span>
              <span className="flex min-w-0 text-xs text-cream-dim">
                {s.podesta} :{" "}
                {line.podesta ? (
                  line.podesta.me ? (
                    <span className="ml-1 text-info">{s.you}</span>
                  ) : (
                    <MerchantName
                      pseudo={line.podesta.pseudo}
                      bot={line.podesta.bot}
                      fallback="—"
                    />
                  )
                ) : (
                  <span className="ml-1">—</span>
                )}
              </span>
            </span>
            <span className="block h-1.5 overflow-hidden rounded-full bg-night-4">
              <span
                className="block h-full rounded-full bg-info"
                style={{ width: `${st.mine}%` }}
              />
            </span>
            <span className="block text-xs text-cream-dim">
              {t.standing(st.mine, st.rank, st.lead)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
