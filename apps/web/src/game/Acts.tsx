import { useEffect } from "react";
import { fr } from "../i18n.js";
import { Label, Sheet, Slab, clock } from "../ui.js";
import type { GameProps } from "./Game.js";
import { store } from "./store.js";
import type { PlayerView } from "./types.js";

const t = () => fr.game.acts;
const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

type Act = PlayerView["acts"][number];

/** Title and story of an act (its variant once it has begun). */
export function actText(act: Act): { title: string; text: string } {
  const named = act.variant ? t().variants[act.variant] : undefined;
  const base = t().acts[act.code];
  return {
    title: named?.[0] ?? base?.[0] ?? act.code,
    text: named?.[1] ?? base?.[1] ?? "",
  };
}

export function currentAct(view: PlayerView, now: number): Act | null {
  return view.acts.find((a) => now >= a.startsAt && now < a.endsAt) ?? null;
}

/** The card of the act under way: opened by the frieze, and by itself on the act's first visit. */
export function ActCard(props: GameProps) {
  const { view, now } = props;
  const act = currentAct(view, now);
  const key = act ? `actSeen:${act.startsAt}` : "";
  useEffect(() => {
    // Not over the first steps: the guide speaks first.
    if (!act || !view.tutorial.includes("sell_city") || store.get(key) === "1") return;
    store.set(key, "1");
    props.setSheet("act");
  }, [act, key, view.tutorial, props.setSheet]);
  if (!act) return null;
  const { title, text } = actText(act);
  const next = view.acts[act.index + 1];
  return (
    <Sheet open={props.sheet === "act"} onClose={() => props.setSheet(null)}>
      <div className="space-y-4 text-center">
        <Label className="text-gold">{t().kicker(ROMAN[act.index] ?? String(act.index + 1))}</Label>
        <h3 className="font-display text-3xl font-extrabold uppercase leading-tight">{title}</h3>
        <p className="text-sm leading-relaxed text-cream-dim">{text}</p>
        <div className="flex justify-center gap-1.5">
          {view.acts.map((a) => (
            <span
              key={a.index}
              className={`label rounded-md px-2 py-1 ${a.index === act.index ? "bg-gold text-ink" : a.index < act.index ? "bg-lagoon/30" : "bg-night-4"}`}
            >
              {ROMAN[a.index] ?? a.index + 1}
            </span>
          ))}
        </div>
        <p className="label">
          {next ? t().nextIn(clock(act.endsAt - now)) : t().endIn(clock(act.endsAt - now))}
        </p>
        {act.milanBps > 10_000 && view.families && (
          <Slab
            className="w-full"
            onClick={() => {
              props.setSheet(null);
              props.goTo("famille");
            }}
          >
            {t().toCampaign}
          </Slab>
        )}
      </div>
    </Sheet>
  );
}
