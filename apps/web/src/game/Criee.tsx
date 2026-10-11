import { useEffect, useRef, useState } from "react";
import { ResourceIcon } from "../art/resources.js";
import { haptic } from "../haptics.js";
import { fr } from "../i18n.js";
import { Label, Qty, Slab, clock } from "../ui.js";
import type { GameProps } from "./Game.js";
import { d } from "./format.js";

/**
 * A Criée under way: a city buys one good at a premium for a few minutes. Shown on every screen,
 * with a cue when it starts while the game is open.
 */
export function Criee(props: GameProps) {
  const t = fr.game.criee;
  const c = props.view.criee;
  const seen = useRef<number | null>(null);
  const have = props.view.inventory.find((i) => i.resource === c?.resource)?.available ?? 0;
  const max = c ? Math.min(have, c.room.mine, c.room.total) : 0;
  const [qty, setQty] = useState(1);
  // biome-ignore lint/correctness/useExhaustiveDependencies: only a new Criée resets the form.
  useEffect(() => {
    if (!c) return;
    if (seen.current !== null && seen.current !== c.index) haptic("alarm");
    seen.current = c.index;
    setQty(Math.max(1, max));
  }, [c?.index]);
  if (!c) return null;
  const pct = `${Math.round(c.premiumBps / 100)} %`;
  return (
    <div className="mb-4 rounded-2xl border border-gold/70 bg-gold/10 p-4">
      <div className="flex items-start gap-3">
        <ResourceIcon code={c.resource} size={40} />
        <div className="min-w-0 flex-1">
          <Label className="text-gold">{t.kicker}</Label>
          <p className="mt-0.5 font-display text-base font-extrabold">
            {t.title(props.names.city(c.city), props.names.resource(c.resource).toLowerCase(), pct)}
          </p>
          <p className="text-xs text-cream-dim">
            {d(c.price)} · {t.endsIn(clock(c.endsAt - props.now))}
          </p>
        </div>
      </div>
      <p className="mt-2 text-xs text-cream-dim">{t.room(c.room.mine, c.room.total)}</p>
      {c.room.total === 0 ? (
        <p className="mt-2 text-sm text-vermilion">{t.soldOut}</p>
      ) : max === 0 ? (
        <p className="mt-2 text-sm text-cream-dim">{t.none}</p>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Qty value={Math.min(qty, max)} max={max} onChange={setQty} />
          <Slab
            disabled={props.busy}
            onClick={() => props.act({ type: "sellToCriee", quantity: Math.min(qty, max) })}
          >
            {t.sell(Math.min(qty, max))}
          </Slab>
        </div>
      )}
    </div>
  );
}
