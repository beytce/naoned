import { d } from "../../game/format.js";
import { fr } from "../../i18n.js";
import { Slab } from "../../ui.js";
import { affordable } from "../logic.js";
import type { EmpirePayload } from "../types.js";
import { type Placing, placeable, placingCost } from "./logic.js";

const t = fr.empire.placing;

/**
 * Putting a counter or the Arsenal down (the map at the centre, step 2): what to touch, then the
 * one gold action, « Poser ici » and its price, once a cell is picked; or back.
 */
export function PlacingBar({
  p,
  placing,
  picked,
  busy,
  onPlace,
  onCancel,
}: {
  p: EmpirePayload;
  placing: Placing;
  picked: string | null;
  busy: boolean;
  onPlace: () => void;
  onCancel: () => void;
}) {
  const cost = picked ? placingCost(p, placing, picked) : null;
  const none = placeable(p, placing).length === 0;
  return (
    <section
      className="pointer-events-auto w-full border-t border-info/40 bg-night-2 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-xl shadow-black/50 lg:mb-4 lg:w-[30rem] lg:rounded-2xl lg:border"
      data-placing-bar={placing.kind}
    >
      <h3 className="font-place text-sm font-bold uppercase tracking-[0.12em] text-cream">
        {placing.kind === "arsenal" ? t.arsenal : t.post}
      </h3>
      <p className="mt-1 text-xs text-cream-dim">
        {none ? t.none : placing.kind === "arsenal" ? t.hintArsenal : t.hintPost}
      </p>
      <div className="mt-3 flex gap-2">
        <Slab size="md" tone="ghost" onClick={onCancel}>
          {t.cancel}
        </Slab>
        <Slab
          size="md"
          tone="gold"
          className="flex-1"
          busy={busy}
          disabled={!picked || !cost || !affordable(p.cash, cost)}
          onClick={onPlace}
        >
          {cost ? t.here(d(cost)) : placing.kind === "arsenal" ? t.arsenal : t.post}
        </Slab>
      </div>
    </section>
  );
}
