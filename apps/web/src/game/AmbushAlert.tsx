import { useState } from "react";
import { createPortal } from "react-dom";
import { haptic } from "../haptics.js";
import { fr } from "../i18n.js";
import { Slab, clock, useOverlay } from "../ui.js";
import type { GameProps } from "./Game.js";

/**
 * Bandits stopped a delivery: a full-screen alert with the time left and one big button to fight
 * back. "Let it be" hides it; the delivery card keeps the button until the time runs out.
 */
export function AmbushAlert(props: GameProps) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const ambush = props.view.road?.deliveries.find(
    (dv) =>
      dv.attack?.pending &&
      props.now <= dv.attack.reactBy &&
      !dismissed.includes(dv.id) &&
      !dv.attack.reacted,
  );
  const close = () => ambush && setDismissed((x) => [...x, ambush.id]);
  useOverlay(!!ambush, close);
  if (!ambush || !ambush.attack) return null;
  const t = fr.game.alert;
  const left = ambush.attack.reactBy - props.now;
  const total = props.catalog.road ? props.catalog.road.bandits.reactionMinutes * 60_000 : left;
  const city = props.names.city(ambush.route.split(":")[1] ?? "");
  return createPortal(
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="ambush-title"
      className="fixed inset-0 z-50 flex animate-fade flex-col items-center justify-center bg-vermilion-deep/95 px-6 text-center text-cream"
    >
      <p aria-hidden="true" className="text-6xl">
        ⚔
      </p>
      <h2 id="ambush-title" className="mt-4 font-display text-3xl font-extrabold uppercase">
        {t.title}
      </h2>
      <p className="mt-3 max-w-sm text-base">{t.body(city)}</p>
      <p className="label mt-8 text-cream">{t.left}</p>
      <p className="mt-1 font-display text-5xl font-extrabold tabular-nums">{clock(left)}</p>
      <div className="mt-4 h-2 w-64 overflow-hidden rounded-full bg-black/30">
        <div
          className="h-full rounded-full bg-cream transition-all"
          style={{ width: `${Math.max(0, Math.min(1, left / Math.max(1, total))) * 100}%` }}
        />
      </div>
      <Slab
        size="lg"
        className="mt-10 w-full max-w-xs"
        disabled={props.busy}
        onClick={async () => {
          haptic("success");
          if (await props.act({ type: "reactToAmbush", deliveryId: ambush.id })) close();
        }}
      >
        {t.react}
      </Slab>
      <button type="button" className="label mt-6 text-cream/80 underline" onClick={close}>
        {t.later}
      </button>
    </div>,
    document.body,
  );
}
